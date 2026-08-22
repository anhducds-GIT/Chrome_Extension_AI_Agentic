/* Local XLSX reader/writer for the runner. It intentionally uses browser APIs only. */
(() => {
  "use strict";

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const crcTable = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
    return table;
  })();

  function crc32(bytes) {
    let c = 0xffffffff;
    for (const byte of bytes) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function u16(view, offset) { return view.getUint16(offset, true); }
  function u32(view, offset) { return view.getUint32(offset, true); }
  function put16(view, offset, value) { view.setUint16(offset, value, true); }
  function put32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }

  async function inflateRaw(bytes) {
    if (typeof DecompressionStream !== "function") {
      throw new Error("This Chrome version cannot read compressed XLSX files. Use Chrome 114 or later.");
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
      if (u32(view, i) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error("The selected file is not a valid XLSX ZIP archive.");
    const count = u16(view, eocd + 10);
    let offset = u32(view, eocd + 16);
    const entries = new Map();
    for (let i = 0; i < count; i += 1) {
      if (u32(view, offset) !== 0x02014b50) throw new Error("Malformed XLSX central directory.");
      const method = u16(view, offset + 10);
      const compressedSize = u32(view, offset + 20);
      const nameSize = u16(view, offset + 28);
      const extraSize = u16(view, offset + 30);
      const commentSize = u16(view, offset + 32);
      const localOffset = u32(view, offset + 42);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameSize));
      if (u32(view, localOffset) !== 0x04034b50) throw new Error(`Malformed XLSX entry: ${name}`);
      const localNameSize = u16(view, localOffset + 26);
      const localExtraSize = u16(view, localOffset + 28);
      const payload = bytes.slice(localOffset + 30 + localNameSize + localExtraSize, localOffset + 30 + localNameSize + localExtraSize + compressedSize);
      entries.set(name, method === 0 ? payload : method === 8 ? await inflateRaw(payload) : (() => { throw new Error(`Unsupported XLSX compression method for ${name}.`); })());
      offset += 46 + nameSize + extraSize + commentSize;
    }
    return entries;
  }

  function zip(entries) {
    const blocks = [];
    const directory = [];
    let offset = 0;
    for (const [name, data] of entries) {
      const nameBytes = encoder.encode(name);
      const local = new Uint8Array(30 + nameBytes.length + data.length);
      const view = new DataView(local.buffer);
      put32(view, 0, 0x04034b50); put16(view, 4, 20); put16(view, 8, 0); put16(view, 10, 0);
      put32(view, 14, crc32(data)); put32(view, 18, data.length); put32(view, 22, data.length);
      put16(view, 26, nameBytes.length); put16(view, 28, 0); local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length);
      blocks.push(local);
      const central = new Uint8Array(46 + nameBytes.length);
      const cView = new DataView(central.buffer);
      put32(cView, 0, 0x02014b50); put16(cView, 4, 20); put16(cView, 6, 20); put16(cView, 10, 0); put16(cView, 12, 0);
      put32(cView, 16, crc32(data)); put32(cView, 20, data.length); put32(cView, 24, data.length);
      put16(cView, 28, nameBytes.length); put16(cView, 30, 0); put16(cView, 32, 0); put16(cView, 34, 0); put16(cView, 36, 0); put32(cView, 38, 0); put32(cView, 42, offset);
      central.set(nameBytes, 46); directory.push(central); offset += local.length;
    }
    const directorySize = directory.reduce((size, part) => size + part.length, 0);
    const end = new Uint8Array(22); const endView = new DataView(end.buffer);
    put32(endView, 0, 0x06054b50); put16(endView, 4, 0); put16(endView, 6, 0); put16(endView, 8, entries.size); put16(endView, 10, entries.size); put32(endView, 12, directorySize); put32(endView, 16, offset); put16(endView, 20, 0);
    return new Blob([...blocks, ...directory, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }

  function xml(bytes) { return new DOMParser().parseFromString(decoder.decode(bytes), "application/xml"); }
  function xmlText(node) { return node ? node.textContent || "" : ""; }
  function columnIndex(ref) {
    return ref.replace(/\d/g, "").split("").reduce((value, char) => value * 26 + char.charCodeAt(0) - 64, 0) - 1;
  }
  function columnName(index) {
    let value = index + 1; let out = "";
    while (value) { const remainder = (value - 1) % 26; out = String.fromCharCode(65 + remainder) + out; value = Math.floor((value - 1) / 26); }
    return out;
  }
  function escapeXml(value) { return String(value ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function normaliseHeader(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }

  function worksheetData(entry, sharedStrings) {
    const document = xml(entry);
    const rows = Array.from(document.getElementsByTagNameNS("*", "row"));
    return { document, rows, sharedStrings };
  }
  function cellValue(cell, sharedStrings) {
    if (!cell) return "";
    const type = cell.getAttribute("t");
    if (type === "inlineStr") return xmlText(cell.getElementsByTagNameNS("*", "t")[0]);
    const value = xmlText(cell.getElementsByTagNameNS("*", "v")[0]);
    return type === "s" ? sharedStrings[Number(value)] || "" : value;
  }
  function rowValues(row, sharedStrings) {
    const values = [];
    for (const cell of Array.from(row.getElementsByTagNameNS("*", "c"))) values[columnIndex(cell.getAttribute("r") || "A1")] = cellValue(cell, sharedStrings);
    return values;
  }
  function setCell(document, row, column, value) {
    const rowNumber = Number(row.getAttribute("r"));
    const ref = `${columnName(column)}${rowNumber}`;
    let cell = Array.from(row.getElementsByTagNameNS("*", "c")).find((item) => item.getAttribute("r") === ref);
    if (!cell) { cell = document.createElementNS(document.documentElement.namespaceURI, "c"); cell.setAttribute("r", ref); row.appendChild(cell); }
    cell.setAttribute("t", "inlineStr");
    while (cell.firstChild) cell.removeChild(cell.firstChild);
    const is = document.createElementNS(document.documentElement.namespaceURI, "is");
    const t = document.createElementNS(document.documentElement.namespaceURI, "t"); t.textContent = String(value ?? "");
    is.appendChild(t); cell.appendChild(is);
  }
  function addRow(document, sheetData, rowNumber) {
    const row = document.createElementNS(document.documentElement.namespaceURI, "row"); row.setAttribute("r", String(rowNumber)); sheetData.appendChild(row); return row;
  }

  async function open(file) {
    if (!file || !/\.xlsx$/i.test(file.name)) throw new Error("Select one .xlsx workbook.");
    const entries = await unzip(await file.arrayBuffer());
    const workbook = xml(entries.get("xl/workbook.xml"));
    const relations = xml(entries.get("xl/_rels/workbook.xml.rels"));
    const relationshipMap = new Map(Array.from(relations.getElementsByTagNameNS("*", "Relationship")).map((item) => [item.getAttribute("Id"), item.getAttribute("Target")]));
    const sheets = new Map();
    for (const sheet of Array.from(workbook.getElementsByTagNameNS("*", "sheet"))) {
      const name = sheet.getAttribute("name"); const relationId = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      const target = relationshipMap.get(relationId); if (name && target) sheets.set(name.toLowerCase(), `xl/${target.replace(/^\//, "").replace(/^xl\//, "")}`);
    }
    const shared = entries.has("xl/sharedStrings.xml") ? Array.from(xml(entries.get("xl/sharedStrings.xml")).getElementsByTagNameNS("*", "si")).map((item) => xmlText(item)) : [];
    const configPath = sheets.get("config"); const jobsPath = sheets.get("jobs");
    if (!jobsPath || !entries.has(jobsPath)) throw new Error("Workbook must contain a worksheet named jobs.");
    const jobsSheet = worksheetData(entries.get(jobsPath), shared);
    if (!jobsSheet.rows.length) throw new Error("The jobs worksheet is empty.");
    const headers = rowValues(jobsSheet.rows[0], shared).map(normaliseHeader);
    const required = ["id", "prompt"];
    const missing = required.filter((name) => !headers.includes(name));
    if (missing.length) throw new Error(`jobs is missing required column(s): ${missing.join(", ")}.`);
    const jobs = jobsSheet.rows.slice(1).map((row) => {
      const values = rowValues(row, shared); const item = { _row: row };
      headers.forEach((name, index) => { if (name) item[name] = values[index] || ""; });
      return item;
    }).filter((item) => item.id || item.prompt);
    if (!jobs.length) throw new Error("jobs has no job rows.");
    // A parsed workbook remains inspectable even if job fields are invalid.
    // Check Plan reports every malformed/duplicate row together; authoritative
    // prepare still fails closed immediately before any execution.
    const config = {};
    let configSheet = null;
    if (configPath && entries.has(configPath)) {
      configSheet = worksheetData(entries.get(configPath), shared);
      const configRows = configSheet.rows;
      for (const row of configRows.slice(1)) { const [key, value] = rowValues(row, shared); if (key) config[normaliseHeader(key)] = value; }
    }
    return { fileName: file.name, entries, sheets, shared, jobsSheet, jobsPath, headers, jobs, config, configSheet, configPath };
  }

  function updateJob(workbook, job, values) {
    const { document, rows } = workbook.jobsSheet;
    const sheetData = document.getElementsByTagNameNS("*", "sheetData")[0];
    for (const [key, value] of Object.entries(values)) {
      let index = workbook.headers.indexOf(key);
      if (index < 0) {
        index = workbook.headers.length; workbook.headers.push(key); setCell(document, rows[0], index, key);
      }
      setCell(document, job._row, index, value);
    }
    workbook.entries.set(workbook.jobsPath, encoder.encode(new XMLSerializer().serializeToString(document)));
  }

  function updateConfigSnapshot(workbook, values) {
    if (!workbook.configSheet || !workbook.configPath) return false;
    const { document, rows, sharedStrings } = workbook.configSheet;
    if (!rows.length) return false;
    const headers = rowValues(rows[0], sharedStrings).map(normaliseHeader);
    const keyColumn = headers.indexOf("key");
    const valueColumn = headers.indexOf("value");
    if (keyColumn < 0 || valueColumn < 0) return false;
    const rowByKey = new Map(rows.slice(1).map((row) => [normaliseHeader(rowValues(row, sharedStrings)[keyColumn]), row]));
    const sheetData = document.getElementsByTagNameNS("*", "sheetData")[0];
    let nextRow = rows.reduce((largest, row) => Math.max(largest, Number(row.getAttribute("r")) || 0), 0) + 1;
    for (const [key, value] of Object.entries(values)) {
      const normalisedKey = normaliseHeader(key);
      let row = rowByKey.get(normalisedKey);
      if (!row) {
        row = addRow(document, sheetData, nextRow++);
        setCell(document, row, keyColumn, normalisedKey);
        rowByKey.set(normalisedKey, row);
        // `rows` is the array captured at open() and reused by every later
        // call for both rowByKey and nextRow.  Without this push a second
        // snapshot cannot see rows added by the first, so it appends a
        // duplicate set reusing the same @r row numbers -- producing invalid
        // SpreadsheetML whose first copy keeps a stale value forever.
        rows.push(row);
      }
      setCell(document, row, valueColumn, value);
      workbook.config[normalisedKey] = String(value ?? "");
    }
    workbook.entries.set(workbook.configPath, encoder.encode(new XMLSerializer().serializeToString(document)));
    return true;
  }

  window.DacXlsx = { open, updateJob, updateConfigSnapshot, downloadBlob: (workbook) => zip(workbook.entries), normaliseHeader, escapeXml };
})();

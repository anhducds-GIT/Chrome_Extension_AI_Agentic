(() => {
  "use strict";
  const encoder = new TextEncoder(); const decoder = new TextDecoder();
  const crcTable = (() => { const table = new Uint32Array(256); for (let n = 0; n < 256; n += 1) { let c = n; for (let k = 0; k < 8; k += 1) c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1; table[n] = c >>> 0; } return table; })();
  function crc32(bytes) { let c = 0xffffffff; for (const byte of bytes) c = crcTable[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
  function u16(view, offset) { return view.getUint16(offset, true); } function u32(view, offset) { return view.getUint32(offset, true); }
  function put16(view, offset, value) { view.setUint16(offset, value, true); } function put32(view, offset, value) { view.setUint32(offset, value >>> 0, true); }
  async function inflate(bytes) { const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw")); return new Uint8Array(await new Response(stream).arrayBuffer()); }
  async function unzip(buffer) {
    const bytes = new Uint8Array(buffer); const view = new DataView(buffer); let eocd = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) if (u32(view, i) === 0x06054b50) { eocd = i; break; }
    if (eocd < 0) throw new Error("Not a valid XLSX ZIP archive.");
    const count = u16(view, eocd + 10); let offset = u32(view, eocd + 16); const entries = new Map();
    for (let i = 0; i < count; i += 1) {
      if (u32(view, offset) !== 0x02014b50) throw new Error("Malformed XLSX central directory.");
      const method = u16(view, offset + 10); const size = u32(view, offset + 20); const nameSize = u16(view, offset + 28); const extra = u16(view, offset + 30); const comment = u16(view, offset + 32); const local = u32(view, offset + 42);
      const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + nameSize)); const localName = u16(view, local + 26); const localExtra = u16(view, local + 28);
      const payload = bytes.slice(local + 30 + localName + localExtra, local + 30 + localName + localExtra + size);
      if (method !== 0 && method !== 8) throw new Error(`Unsupported compression for ${name}.`);
      entries.set(name, method === 0 ? payload : await inflate(payload)); offset += 46 + nameSize + extra + comment;
    }
    return entries;
  }
  function zip(entries) {
    const blocks = []; const directory = []; let offset = 0;
    for (const [name, data] of entries) {
      const nameBytes = encoder.encode(name); const local = new Uint8Array(30 + nameBytes.length + data.length); const view = new DataView(local.buffer);
      put32(view, 0, 0x04034b50); put16(view, 4, 20); put32(view, 14, crc32(data)); put32(view, 18, data.length); put32(view, 22, data.length); put16(view, 26, nameBytes.length); local.set(nameBytes, 30); local.set(data, 30 + nameBytes.length); blocks.push(local);
      const central = new Uint8Array(46 + nameBytes.length); const cv = new DataView(central.buffer); put32(cv, 0, 0x02014b50); put16(cv, 4, 20); put16(cv, 6, 20); put32(cv, 16, crc32(data)); put32(cv, 20, data.length); put32(cv, 24, data.length); put16(cv, 28, nameBytes.length); put32(cv, 42, offset); central.set(nameBytes, 46); directory.push(central); offset += local.length;
    }
    const size = directory.reduce((total, item) => total + item.length, 0); const end = new Uint8Array(22); const ev = new DataView(end.buffer); put32(ev, 0, 0x06054b50); put16(ev, 8, entries.size); put16(ev, 10, entries.size); put32(ev, 12, size); put32(ev, 16, offset);
    return new Blob([...blocks, ...directory, end], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  function xml(bytes) { const doc = new DOMParser().parseFromString(decoder.decode(bytes), "application/xml"); if (doc.querySelector("parsererror")) throw new Error("Invalid XLSX XML part."); return doc; }
  function text(node) { return node?.textContent || ""; }
  function colIndex(ref) { return ref.replace(/\d/g, "").split("").reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1; }
  function colName(index) { let value = index + 1; let out = ""; while (value) { const r = (value - 1) % 26; out = String.fromCharCode(65 + r) + out; value = Math.floor((value - 1) / 26); } return out; }
  function normal(value) { return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, ""); }
  function cellValue(cell, shared) { if (!cell) return ""; const type = cell.getAttribute("t"); if (type === "inlineStr") return text(cell.getElementsByTagNameNS("*", "t")[0]); const value = text(cell.getElementsByTagNameNS("*", "v")[0]); return type === "s" ? shared[Number(value)] || "" : value; }
  function rowValues(row, shared) { const values = []; for (const cell of row.getElementsByTagNameNS("*", "c")) values[colIndex(cell.getAttribute("r") || "A1")] = cellValue(cell, shared); return values; }
  function setCell(document, row, column, value) {
    const ref = `${colName(column)}${row.getAttribute("r")}`; let cell = Array.from(row.getElementsByTagNameNS("*", "c")).find((item) => item.getAttribute("r") === ref);
    if (!cell) { cell = document.createElementNS(document.documentElement.namespaceURI, "c"); cell.setAttribute("r", ref); row.appendChild(cell); }
    cell.setAttribute("t", "inlineStr"); while (cell.firstChild) cell.removeChild(cell.firstChild); const is = document.createElementNS(document.documentElement.namespaceURI, "is"); const t = document.createElementNS(document.documentElement.namespaceURI, "t"); t.textContent = String(value ?? ""); is.appendChild(t); cell.appendChild(is);
  }
  function parse(fileName, entries) {
    const workbook = xml(entries.get("xl/workbook.xml")); const rels = xml(entries.get("xl/_rels/workbook.xml.rels"));
    const relationMap = new Map(Array.from(rels.getElementsByTagNameNS("*", "Relationship")).map((item) => [item.getAttribute("Id"), item.getAttribute("Target")])); const sheets = new Map();
    for (const sheet of workbook.getElementsByTagNameNS("*", "sheet")) { const id = sheet.getAttribute("r:id") || sheet.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"); const target = relationMap.get(id); if (target) sheets.set(sheet.getAttribute("name").toLowerCase(), `xl/${target.replace(/^\/?xl\//, "")}`); }
    const shared = entries.has("xl/sharedStrings.xml") ? Array.from(xml(entries.get("xl/sharedStrings.xml")).getElementsByTagNameNS("*", "si")).map(text) : [];
    const jobsPath = sheets.get("jobs"); if (!jobsPath || !entries.has(jobsPath)) throw new Error("Workbook must contain a jobs worksheet.");
    const jobsDocument = xml(entries.get(jobsPath)); const rows = Array.from(jobsDocument.getElementsByTagNameNS("*", "row")); if (!rows.length) throw new Error("jobs worksheet is empty."); const headers = rowValues(rows[0], shared).map(normal); if (!headers.includes("id") || !headers.includes("prompt")) throw new Error("jobs requires id and prompt columns.");
    const jobs = rows.slice(1).map((row) => { const values = rowValues(row, shared); const job = { _row: row }; headers.forEach((header, index) => { if (header) job[header] = values[index] || ""; }); return job; }).filter((job) => job.id || job.prompt);
    const config = {}; const configPath = sheets.get("config"); if (configPath && entries.has(configPath)) { const configRows = Array.from(xml(entries.get(configPath)).getElementsByTagNameNS("*", "row")); for (const row of configRows.slice(1)) { const [key, value] = rowValues(row, shared); if (key) config[normal(key)] = value; } }
    return { fileName, entries, jobsPath, jobsDocument, rows, headers, jobs, config };
  }
  async function open(file) { if (!file || !/\.xlsx$/i.test(file.name)) throw new Error("Select one .xlsx workbook."); return parse(file.name, await unzip(await file.arrayBuffer())); }
  function updateJob(workbook, job, values) { for (const [key, value] of Object.entries(values)) { let index = workbook.headers.indexOf(key); if (index < 0) { index = workbook.headers.length; workbook.headers.push(key); setCell(workbook.jobsDocument, workbook.rows[0], index, key); } setCell(workbook.jobsDocument, job._row, index, value); job[key] = String(value ?? ""); } workbook.entries.set(workbook.jobsPath, encoder.encode(new XMLSerializer().serializeToString(workbook.jobsDocument))); }
  function blob(workbook) { return zip(workbook.entries); }
  globalThis.DagXlsx = Object.freeze({ open, updateJob, blob, normal });
})();

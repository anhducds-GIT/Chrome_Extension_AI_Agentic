/* Appends new PENDING job rows to an existing Result XLSX ledger.

   Purpose: exercise the resume path. A finished run has every job
   SAFE_COMPLETE and is deliberately locked forever, so "Continue Existing
   Run" has nothing to do. Adding fresh job rows to the ledger gives the
   continuation real work and produces the next checkpoint.

   This edits a verified checkpoint by hand. That is fine for a test fixture
   and only a test fixture -- in real operation a checkpoint is immutable, and
   the runner has no way to detect that someone rewrote one.

   Usage:
     node scripts/add-jobs-to-ledger.mjs <ledger.xlsx> "ID=prompt" ["ID=prompt" ...]
*/
import fs from "node:fs";
import zlib from "node:zlib";

const [target, ...specs] = process.argv.slice(2);
if (!target || !specs.length) {
  console.error('Usage: node scripts/add-jobs-to-ledger.mjs <ledger.xlsx> "ID=prompt" ...');
  process.exit(1);
}

/* ---- zip ---------------------------------------------------------------- */

function unzip(buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  if (end < 0) throw new Error("Not a ZIP archive.");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameSize = buffer.readUInt16LE(offset + 28);
    const extraSize = buffer.readUInt16LE(offset + 30);
    const commentSize = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameSize).toString();
    const start = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const payload = buffer.slice(start, start + compressedSize);
    entries.set(name, method === 0 ? payload : zlib.inflateRawSync(payload));
    offset += 46 + nameSize + extraSize + commentSize;
  }
  return entries;
}

const crc = (bytes) => { let c = -1; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; };
const u16 = (v, o, n) => v.setUint16(o, n, true), u32 = (v, o, n) => v.setUint32(o, n, true);

function zip(entries) {
  let off = 0; const parts = [], directory = [];
  for (const [name, data] of entries) {
    const n = Buffer.from(name), d = Buffer.from(data);
    const h = Buffer.alloc(30 + n.length), v = new DataView(h.buffer, h.byteOffset, h.length);
    u32(v, 0, 0x04034b50); u16(v, 4, 20); u32(v, 14, crc(d)); u32(v, 18, d.length); u32(v, 22, d.length); u16(v, 26, n.length);
    n.copy(h, 30); parts.push(h, d);
    const c = Buffer.alloc(46 + n.length), cv = new DataView(c.buffer, c.byteOffset, c.length);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u32(cv, 16, crc(d)); u32(cv, 20, d.length); u32(cv, 24, d.length); u16(cv, 28, n.length); u32(cv, 42, off);
    n.copy(c, 46); directory.push(c); off += h.length + d.length;
  }
  const size = directory.reduce((n, p) => n + p.length, 0);
  const end = Buffer.alloc(22), ev = new DataView(end.buffer, end.byteOffset, end.length);
  u32(ev, 0, 0x06054b50); u16(ev, 8, entries.size); u16(ev, 10, entries.size); u32(ev, 12, size); u32(ev, 16, off);
  return Buffer.concat([...parts, ...directory, end]);
}

/* ---- locate the jobs worksheet ------------------------------------------ */

const entries = unzip(fs.readFileSync(target));
const strip = (xml) => xml.replace(/<\/?[A-Za-z0-9]+:/g, (m) => m.replace(/[A-Za-z0-9]+:/, ""));
const workbookXml = strip(entries.get("xl/workbook.xml").toString());
const relsXml = entries.get("xl/_rels/workbook.xml.rels").toString();
const rels = new Map([...relsXml.matchAll(/<Relationship\s+([^>]*?)\/?>/g)].map((m) => [(m[1].match(/Id="([^"]+)"/) || [])[1], (m[1].match(/Target="([^"]+)"/) || [])[1]]));
const jobsRel = [...workbookXml.matchAll(/<sheet\s+([^>]*?)\/?>/g)]
  .map((m) => ({ name: (m[1].match(/name="([^"]+)"/) || [])[1], id: (m[1].match(/r:id="([^"]+)"/) || [])[1] }))
  .find((sheet) => String(sheet.name).toLowerCase() === "jobs");
if (!jobsRel) throw new Error("Workbook has no worksheet named jobs.");
const jobsPath = `xl/${String(rels.get(jobsRel.id)).replace(/^\//, "").replace(/^xl\//, "")}`;

let sheet = entries.get(jobsPath).toString();
const prefix = (sheet.match(/<(\w+:)?sheetData>/) || [, ""])[1] || "";
const tag = (name) => `${prefix}${name}`;

/* ---- read the header, then append rows ---------------------------------- */

const rows = [...sheet.matchAll(new RegExp(`<${tag("row")} r="(\\d+)"[^>]*>([\\s\\S]*?)<\\/${tag("row")}>`, "g"))];
if (!rows.length) throw new Error("jobs worksheet has no rows.");
const cellPattern = new RegExp(`<${tag("c")} r="([A-Z]+)\\d+"[^>]*>(?:<${tag("is")}><${tag("t")}>([\\s\\S]*?)<\\/${tag("t")}><\\/${tag("is")}>|<${tag("v")}>([\\s\\S]*?)<\\/${tag("v")}>)<\\/${tag("c")}>`, "g");
const header = [...rows[0][2].matchAll(cellPattern)].map((m) => ({ column: m[1], name: (m[2] ?? m[3] ?? "").trim().toLowerCase() }));
const columnFor = (name) => header.find((cell) => cell.name === name)?.column;
const idColumn = columnFor("id"), promptColumn = columnFor("prompt");
if (!idColumn || !promptColumn) throw new Error("jobs worksheet is missing an id or prompt column.");

const existingIds = new Set(rows.slice(1).map((row) => {
  const cell = [...row[2].matchAll(cellPattern)].find((m) => m[1] === idColumn);
  return (cell?.[2] ?? cell?.[3] ?? "").trim().toLowerCase();
}));

const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const cell = (column, rowNumber, value) => `<${tag("c")} r="${column}${rowNumber}" t="inlineStr"><${tag("is")}><${tag("t")}>${esc(value)}</${tag("t")}></${tag("is")}></${tag("c")}>`;

let nextRow = rows.reduce((largest, row) => Math.max(largest, Number(row[1])), 0) + 1;
const added = [];
let appended = "";
for (const spec of specs) {
  const split = spec.indexOf("=");
  if (split < 1) throw new Error(`Expected "ID=prompt", got: ${spec}`);
  const id = spec.slice(0, split).trim();
  const prompt = spec.slice(split + 1).trim();
  if (!id || !prompt) throw new Error(`Both an ID and a prompt are required: ${spec}`);
  if (existingIds.has(id.toLowerCase())) throw new Error(`Job ID '${id}' already exists in this ledger.`);
  existingIds.add(id.toLowerCase());
  // Only id and prompt are written. Every ledger column stays blank, which is
  // what the resume classifier reads as SAFE_PENDING.
  appended += `<${tag("row")} r="${nextRow}">${cell(idColumn, nextRow, id)}${cell(promptColumn, nextRow, prompt)}</${tag("row")}>`;
  added.push(`${id} (row ${nextRow})`);
  nextRow += 1;
}

const closing = `</${tag("sheetData")}>`;
if (!sheet.includes(closing)) throw new Error("Could not find the end of sheetData.");
sheet = sheet.replace(closing, `${appended}${closing}`);
entries.set(jobsPath, Buffer.from(sheet, "utf8"));
fs.writeFileSync(target, zip(entries));

console.log(`Added to ${target}:`);
for (const line of added) console.log(`  ${line}`);

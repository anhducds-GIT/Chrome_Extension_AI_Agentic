/* Dựng workbook cho Pilot-17 — nghiệm thu live B-41 ⑴ (ADR-0050 ⒝: tự chữa).

   Hai job `text_reasoning`, cố ý KHÔNG dùng ảnh: bản vá cần nghiệm thu nằm ở
   cổng sẵn sàng TRƯỚC lúc gửi, nên hạn mức tạo ảnh không liên quan gì, và job
   chữ chạy nhanh hơn nhiều.

   Chỗ quan trọng: `delay_min_sec` = `delay_max_sec` = 40. Kịch bản nghiệm thu
   là Đức bấm sang một hội thoại KHÁC trong lúc đếm ngược giữa hai job — phải
   sau khi job 1 xong, không phải giữa lúc nó đang chạy. Đổi tab giữa lúc job 1
   đang bay thì lượt đó thành "có thể đã gửi", và cửa tự chữa **cố ý** không mở
   ở đó (F5 đè lên một lượt đang chạy có thể làm prompt gửi lần hai). Nắp 40
   giây là để cửa sổ đó rộng đủ cho một người thật.

   Chạy: node workers/duc-auto-chatgpt/v0.1.0/scripts/create-pilot-17.mjs
*/
import fs from "node:fs";

const enc = new TextEncoder();
const crc = (bytes) => { let c = -1; for (const b of bytes) { c ^= b; for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0); } return (c ^ -1) >>> 0; };
const u16 = (v, o, n) => v.setUint16(o, n, true), u32 = (v, o, n) => v.setUint32(o, n, true);
const zip = (entries) => {
  let off = 0; const parts = [], directory = [];
  for (const [name, text] of entries) {
    const n = enc.encode(name), d = enc.encode(text), h = new Uint8Array(30 + n.length + d.length), v = new DataView(h.buffer);
    u32(v, 0, 0x04034b50); u16(v, 4, 20); u16(v, 8, 0); u16(v, 10, 0); u32(v, 14, crc(d)); u32(v, 18, d.length); u32(v, 22, d.length); u16(v, 26, n.length);
    h.set(n, 30); h.set(d, 30 + n.length); parts.push(h);
    const c = new Uint8Array(46 + n.length), cv = new DataView(c.buffer);
    u32(cv, 0, 0x02014b50); u16(cv, 4, 20); u16(cv, 6, 20); u32(cv, 16, crc(d)); u32(cv, 20, d.length); u32(cv, 24, d.length); u16(cv, 28, n.length); u32(cv, 42, off);
    c.set(n, 46); directory.push(c); off += h.length;
  }
  const ds = directory.reduce((n, p) => n + p.length, 0), end = new Uint8Array(22), ev = new DataView(end.buffer);
  u32(ev, 0, 0x06054b50); u16(ev, 8, entries.length); u16(ev, 10, entries.length); u32(ev, 12, ds); u32(ev, 16, off);
  return Buffer.concat([...parts, ...directory, end]);
};
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const sheet = (rows) => `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((x, c) => `<c r="${String.fromCharCode(65 + c)}${r + 1}" t="inlineStr"><is><t>${esc(x)}</t></is></c>`).join("")}</row>`).join("")}</sheetData></worksheet>`;

const FOLDER = "C:\\WORKING ZONE\\Chrome_Extension_AI_Agentic\\workers\\duc-auto-chatgpt\\v0.1.0\\Pilot-17_B41-TuChua";

const config = [
  ["key", "value"],
  ["timeout_sec", "180"],
  ["max_retries", "2"],
  ["delay_min_sec", "40"],
  ["delay_max_sec", "40"],
  ["safety_cooldown_sec", "2"],
  ["max_input_images", "0"],
  ["continue_on_error", "true"],
  ["rerun_done", "false"],
  ["output_destination_mode", "profile"],
  ["output_profile_id", "pilot-17"],
  ["output_folder_hint", FOLDER],
  ["image_filename_pattern", "{job_id}"],
  ["collision_policy", "overwrite"],
  ["save_images", "false"],
  ["save_result_xlsx", "true"],
  ["save_audit_jsonl", "true"],
  ["separate_result_destination", "false"],
  ["result_filename_pattern", "Duc-Auto-ChatGPT-Pilot-17__results__v{version}.xlsx"],
  ["audit_filename", "Duc-Auto-ChatGPT-Pilot-17__audit.jsonl"]
];

// Prompt mới hoàn toàn cho lượt chạy này (luật: mỗi lượt chạy tốn credit là một
// prompt mới). Ngắn, một câu trả lời gọn, để lượt nghiệm thu không phải chờ lâu.
const jobs = [
  ["id", "task_type", "prompt"],
  ["P17-01", "text_reasoning", "Một thùng chứa 12 lít, một thùng chứa 7 lít, không có vạch chia. Hãy nêu dãy thao tác ngắn nhất để đong đúng 6 lít. Trả lời gọn, chỉ liệt kê từng bước."],
  ["P17-02", "text_reasoning", "Một đội có 5 người, mỗi người bắt tay đúng một lần với mỗi người khác. Có bao nhiêu cái bắt tay? Nêu công thức tổng quát cho n người rồi thay số. Trả lời gọn trong ba dòng."]
];

const entries = [
  ["[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`],
  ["_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`],
  ["xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="jobs" sheetId="1" r:id="rId1"/><sheet name="config" sheetId="2" r:id="rId2"/></sheets></workbook>`],
  ["xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>`],
  ["xl/worksheets/sheet1.xml", sheet(jobs)],
  ["xl/worksheets/sheet2.xml", sheet(config)]
];

const folder = new URL("../Pilot-17_B41-TuChua/", import.meta.url);
fs.mkdirSync(folder, { recursive: true });
const target = new URL("Duc-Auto-ChatGPT-Pilot-17.xlsx", folder);
if (fs.existsSync(target)) throw new Error("Workbook Pilot-17 đã có; xoá tay một cách có chủ đích trước khi dựng lại.");
fs.writeFileSync(target, zip(entries));
console.log(`Đã ghi ${decodeURIComponent(target.pathname).replace(/^\//, "")}`);

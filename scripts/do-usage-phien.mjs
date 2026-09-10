#!/usr/bin/env node
/* THƯỚC ĐO USAGE CỦA MỘT PHIÊN CC — dựng 10/09 cho pilot "CC chỉ điều phối".
 *
 * Vì sao cần: đo 10/09 cho thấy **mỗi lượt gọi model tốn ~232.000 token đọc, bất kể lệnh to
 * hay nhỏ**. Phần tôi nghĩ và viết chỉ chiếm 0,4% khối lượng; kết quả mọi công cụ chiếm 0,06%.
 * Nghĩa là chi phí ≈ SỐ LƯỢT GỌI × một hằng số. Tối ưu bằng cách viết lệnh ngắn hơn là vô ích;
 * chỉ cắt được số lượt mới cắt được tiền. Không có thước này thì mọi câu "rẻ hơn nhiều" chỉ là
 * cảm giác — và bốn con số viết tay trong các kế hoạch trước đều đã sai.
 *
 * Dùng:
 *   node scripts/do-usage-phien.mjs                 # phiên mới nhất của dự án này
 *   node scripts/do-usage-phien.mjs --phien <id>    # một phiên cụ thể
 *   node scripts/do-usage-phien.mjs --tu <ISO>      # chỉ tính từ mốc giờ này trở đi
 *   node scripts/do-usage-phien.mjs --json          # máy đọc
 *   node scripts/do-usage-phien.mjs --tu-kiem       # tự kiểm bằng dữ liệu dựng sẵn
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";

const THU_MUC_MAC_DINH = path.join(
  os.homedir(), ".claude-team", "projects",
  "C--WORKING-ZONE-Chrome-Extension-AI-Agentic"
);

/** Gộp các lượt gọi model thành một bảng số. THUẦN — không đọc đĩa, nên ghim được. */
export function gopUsage(dongs, tuLuc = null) {
  const moc = tuLuc ? Date.parse(tuLuc) : null;
  /* GỘP THEO `message.id` — MỘT LƯỢT GỌI GHI RA NHIỀU DÒNG. Đo trên phiên thật 10/09:
     18.954 dòng mang `usage` nhưng chỉ **2.684** `message.id`, tức mỗi lượt gọi để lại ~7
     dòng (cập nhật dần trong lúc phát). Cộng thẳng cho ra 7,38 TỶ token đọc — sai gấp bảy
     lần và trông vẫn như một con số. Dòng sau của cùng một id là bản ĐẦY ĐỦ HƠN của cùng
     lượt gọi, nên GIỮ BẢN CUỐI, không cộng dồn. */
  const theoId = new Map();
  for (const d of dongs) {
    const u = d?.message?.usage;
    if (!u) continue;
    if (moc !== null && d.timestamp && Date.parse(d.timestamp) < moc) continue;
    const id = d.message.id || d.requestId || d.uuid;
    theoId.set(id, u);
  }
  const luot = [];
  for (const u of theoId.values()) {
    const doc = (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.input_tokens || 0);
    luot.push({
      doc,
      docLai: u.cache_read_input_tokens || 0,
      taoDem: u.cache_creation_input_tokens || 0,
      moi: u.input_tokens || 0,
      ra: u.output_tokens || 0,
      nghi: u.output_tokens_details?.reasoning_tokens || 0
    });
  }
  if (!luot.length) return { soLuot: 0 };
  const tong = (k) => luot.reduce((a, x) => a + x[k], 0);
  const boiCanh = luot.map((x) => x.doc).sort((a, b) => a - b);
  return {
    soLuot: luot.length,
    tongDoc: tong("doc"),
    tongDocLai: tong("docLai"),
    tongTaoDem: tong("taoDem"),
    tongRa: tong("ra"),
    tongNghi: tong("nghi"),
    docMoiLuot: Math.round(tong("doc") / luot.length),
    boiCanhNhoNhat: boiCanh[0],
    boiCanhGiua: boiCanh[Math.floor(boiCanh.length / 2)],
    boiCanhLonNhat: boiCanh[boiCanh.length - 1]
  };
}

function docCo(argv, ten, mac = null) {
  const i = argv.indexOf(`--${ten}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : mac;
}

function tuKiem() {
  const gia = [
    { message: { id: "m1", usage: { cache_read_input_tokens: 100, output_tokens: 10 } }, timestamp: "2026-01-01T00:00:00Z" },
    { message: { id: "m2", usage: { cache_read_input_tokens: 300, cache_creation_input_tokens: 50, output_tokens: 20, output_tokens_details: { reasoning_tokens: 5 } } }, timestamp: "2026-01-01T01:00:00Z" },
    { type: "user", message: { content: "không có usage" } },
    { message: { id: "m3", usage: { input_tokens: 7, output_tokens: 1 } }, timestamp: "2026-01-01T02:00:00Z" }
  ];
  const r = gopUsage(gia);
  assert.equal(r.soLuot, 3, "dòng không có usage phải bị bỏ, không được đếm là một lượt");
  assert.equal(r.tongDoc, 100 + 350 + 7);
  assert.equal(r.tongRa, 31);
  assert.equal(r.tongNghi, 5);
  assert.equal(r.docMoiLuot, Math.round(457 / 3));
  assert.equal(r.boiCanhNhoNhat, 7, "phải sắp theo SỐ, không theo chữ — 100 < 350 nhưng '100' < '7'");
  assert.equal(r.boiCanhLonNhat, 350);

  const cat = gopUsage(gia, "2026-01-01T00:30:00Z");
  assert.equal(cat.soLuot, 2, "--tu phải cắt theo mốc giờ");

  assert.deepEqual(gopUsage([]), { soLuot: 0 }, "phiên rỗng không được chia cho 0");

  /* CA QUAN TRỌNG NHẤT — một lượt gọi ghi ra nhiều dòng. Thiếu nó thì bản đầu cho ra 7,38 tỷ
     token và không có gì đỏ. Dòng sau là bản đầy đủ hơn, phải THẮNG, không được cộng vào. */
  const phatDan = [
    { message: { id: "m9", usage: { cache_read_input_tokens: 200, output_tokens: 3 } }, timestamp: "2026-01-01T00:00:00Z" },
    { message: { id: "m9", usage: { cache_read_input_tokens: 200, output_tokens: 40 } }, timestamp: "2026-01-01T00:00:01Z" },
    { message: { id: "m9", usage: { cache_read_input_tokens: 200, output_tokens: 77 } }, timestamp: "2026-01-01T00:00:02Z" }
  ];
  const g = gopUsage(phatDan);
  assert.equal(g.soLuot, 1, "ba dòng của cùng một message.id là MỘT lượt gọi");
  assert.equal(g.tongDoc, 200, "không được cộng dồn bối cảnh của cùng một lượt");
  assert.equal(g.tongRa, 77, "phải giữ bản CUỐI, không phải bản đầu");

  // Không có message.id thì lùi về requestId — vẫn phải gộp, không được đếm ba lần.
  const khongId = phatDan.map((x, i) => ({ requestId: "r1", uuid: `u${i}`, message: { usage: x.message.usage } }));
  assert.equal(gopUsage(khongId).soLuot, 1, "thiếu message.id thì gộp theo requestId");

  console.log("do-usage-phien tự kiểm: 14/14 xanh");
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--tu-kiem")) return tuKiem();

  const thuMuc = docCo(argv, "thu-muc", THU_MUC_MAC_DINH);
  let phien = docCo(argv, "phien");
  if (!phien) {
    const ds = fs.readdirSync(thuMuc).filter((x) => x.endsWith(".jsonl"))
      .map((x) => ({ x, t: fs.statSync(path.join(thuMuc, x)).mtimeMs }))
      .sort((a, b) => b.t - a.t);
    if (!ds.length) { console.error(`Không thấy phiên nào trong ${thuMuc}`); process.exit(2); }
    phien = ds[0].x.replace(/\.jsonl$/, "");
  }
  const tep = path.join(thuMuc, `${phien}.jsonl`);
  if (!fs.existsSync(tep)) { console.error(`Không thấy ${tep}`); process.exit(2); }

  const dongs = fs.readFileSync(tep, "utf8").split("\n").filter(Boolean)
    .map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
  const r = gopUsage(dongs, docCo(argv, "tu"));

  if (argv.includes("--json")) { console.log(JSON.stringify({ phien, ...r }, null, 1)); return; }
  if (!r.soLuot) { console.log(`phiên ${phien}: không có lượt gọi model nào trong khoảng đã chọn`); return; }
  const tr = (n) => n.toLocaleString("vi-VN");
  console.log(`phiên ${phien}`);
  console.log(`  lượt gọi model      ${tr(r.soLuot)}`);
  console.log(`  token ĐỌC mỗi lượt  ${tr(r.docMoiLuot)}   ← con số quyết định giá`);
  console.log(`  tổng token đọc      ${tr(r.tongDoc)}  (đọc lại đệm ${tr(r.tongDocLai)} · tạo đệm ${tr(r.tongTaoDem)})`);
  console.log(`  tổng token ra       ${tr(r.tongRa)}  (nghĩ ${tr(r.tongNghi)})`);
  console.log(`  bối cảnh            nhỏ nhất ${tr(r.boiCanhNhoNhat)} · giữa ${tr(r.boiCanhGiua)} · lớn nhất ${tr(r.boiCanhLonNhat)}`);
}

/* `new URL(...).pathname` trên Windows cho `/C:/…` — so bằng nó thì cửa này không bao giờ mở
   và script im lặng không làm gì. Dùng `fileURLToPath`, giống `chuoi-reasoning.mjs`. */
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main();
}

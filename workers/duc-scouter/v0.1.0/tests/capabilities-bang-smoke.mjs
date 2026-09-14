/* capabilities-bang-smoke.mjs — ghim bảng năng lực `docs/CAPABILITIES.md` vào SỰ THẬT (`T17`).
 *
 * VÌ SAO FILE NÀY TỒN TẠI. Lượt soát 14/09 đo được: **không một dòng mã nào trong repo đọc
 * `CAPABILITIES.md`** (`grep -rl CAPABILITIES --include=*.mjs` → rỗng). Nó gõ tay, đếm tay, và
 * tự dặn *"đếm lại tay khi sửa bảng"*. Nghĩa là một ô khai `ĐÃ CHỨNG MINH` cho một lệnh không
 * tồn tại thì **không cổng nào đỏ** — ngược đúng luật chung của repo: *bảng là thứ SINH RA,
 * không phải thứ gõ vào*.
 *
 * Đây CHƯA phải máy sinh bảng. Nó là phần rẻ nhất mà bắt được phần lớn đường trôi: bảng và
 * bảng từ vựng phải khớp nhau cả HAI CHIỀU, và các con số gõ tay phải cộng đúng.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { METHOD_REGISTRY } from "../scripts/scouter-bridge-core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const BANG = fs.readFileSync(path.join(here, "..", "docs", "CAPABILITIES.md"), "utf8");

/* Chỉ đọc các dòng BẢNG của §2 (mã năng lực ở cột đầu), không đọc văn xuôi — nếu không thì phép
 * ghim này khớp đúng văn của chính tôi, đúng cái bẫy `detectors-match-your-own-prose`. */
const DONG = BANG.split("\n").filter((d) => /^\| [A-Z]+\d+ \|/.test(d)).map((d) => d.split("|").map((o) => o.trim()));
const CAP1 = DONG.filter((o) => !/^W\d/.test(o[1]));

// ⓐ bảng phải có dòng — phép ghim chết thì phải ĐỎ, không phải xanh vì không tìm thấy gì
{
  assert.ok(CAP1.length >= 40, `đọc được ${CAP1.length} dòng cấp 1 — dưới 40 là dấu file đã đổi hình dạng, sửa phép ghim này`);
}

/* Bỏ phần GẠCH NGANG trước khi soi. `~~scout.snapshot~~` là ghi chép về một method ĐÃ BỎ
 * (08/09) — giữ dấu vết của thứ đã gỡ là luật của repo, không phải một ô trỏ vào hư không.
 * Phép ghim đầu tiên viết ra đã ĐỎ đúng ở dòng đó, và nó ĐỎ oan. */
const boGach = (chu) => String(chu || "").replace(/~~[^~]*~~/g, "");

// ⓑ CHIỀU XUÔI — mọi `scout.*` mà bảng nhắc tới (không kể phần gạch) phải CÓ THẬT trong từ vựng
{
  const nhac = new Set();
  for (const o of CAP1) for (const m of boGach(o[3]).match(/`scout\.[a-zA-Z]+`/g) || []) nhac.add(m.replaceAll("`", ""));
  const ma = new Set(Object.keys(METHOD_REGISTRY));
  const thua = [...nhac].filter((m) => !ma.has(m));
  assert.deepEqual(thua, [],
    `bảng năng lực khai lệnh KHÔNG tồn tại: ${thua.join(", ")} — một ô xanh trỏ vào hư không`);
}

// ⓒ CHIỀU NGƯỢC — mọi lệnh `scout.*` có thật phải xuất hiện đâu đó trong bảng
{
  const chu = BANG;
  const thieu = Object.keys(METHOD_REGISTRY).filter((m) => m.startsWith("scout.") && !chu.includes(`\`${m}\``));
  assert.deepEqual(thieu, [],
    `có lệnh thật mà bảng năng lực không nhắc: ${thieu.join(", ")} — Đức đọc bảng sẽ không biết nó tồn tại`);
}

// ⓓ TỪ VỰNG TRẠNG THÁI ĐÓNG — năm chữ, không ai chế thêm chữ thứ sáu
{
  const CHO_PHEP = ["CHƯA CÓ", "CHƯA ĐO", "CÓ", "MỘT PHẦN", "ĐÃ CHỨNG MINH", "ĐÃ BỎ"];
  const la = [];
  for (const o of CAP1) {
    const tt = (o[4] || "").replaceAll("*", "").replace(/\s*\d{2}\/\d{2}\s*$/, "").split("—")[0].trim();
    if (!CHO_PHEP.includes(tt)) la.push(`${o[1]}: ${tt}`);
  }
  assert.deepEqual(la, [],
    `trạng thái lạ: ${la.join(" · ")}. Trước 14/09 bảng chạy 8 cách viết cho 3 trạng thái, ` +
    "và một bảng có 8 cách nói 3 điều thì không cộng lại được");
}

// ⓔ CON SỐ GÕ TAY phải cộng đúng với chính bảng ở trên nó
{
  const dem = {};
  for (const o of CAP1) {
    const tt = (o[4] || "").replaceAll("*", "").replace(/\s*\d{2}\/\d{2}\s*$/, "").split("—")[0].trim();
    dem[tt] = (dem[tt] || 0) + 1;
  }
  const khai = BANG.match(/\*\*ĐÃ CHỨNG MINH (\d+) · MỘT PHẦN (\d+) · CÓ (\d+) · CHƯA CÓ \/ CHƯA ĐO (\d+) · ĐÃ BỎ (\d+)\.\*\* Tổng (\d+) dòng/);
  assert.ok(khai, "không đọc được dòng đếm — phép ghim này đã chết, sửa nó");
  const [, cm, mp, co, chua, bo, tong] = khai.map(Number);
  assert.equal(cm, dem["ĐÃ CHỨNG MINH"] || 0, "số ĐÃ CHỨNG MINH gõ tay lệch bảng");
  assert.equal(mp, dem["MỘT PHẦN"] || 0, "số MỘT PHẦN gõ tay lệch bảng");
  assert.equal(co, dem["CÓ"] || 0, "số CÓ gõ tay lệch bảng");
  assert.equal(chua, (dem["CHƯA CÓ"] || 0) + (dem["CHƯA ĐO"] || 0), "số CHƯA gõ tay lệch bảng");
  assert.equal(bo, dem["ĐÃ BỎ"] || 0);
  assert.equal(tong, CAP1.length, "tổng số dòng gõ tay lệch bảng");

  /* Và phân số Seed Coverage phải bằng chính con số vừa kiểm — không phải một số thứ hai. */
  const sc = BANG.match(/\*\*Seed Coverage = (\d+) \/ (\d+)\*\*/);
  assert.ok(sc, "không đọc được dòng Seed Coverage");
  assert.equal(Number(sc[1]), cm, "tử số Seed Coverage phải là số ĐÃ CHỨNG MINH, không phải một con số khác");
  assert.equal(Number(sc[2]), CAP1.length - bo, "mẫu số = tổng dòng trừ dòng ĐÃ BỎ");
}

// ⓕ mọi ô `ĐÃ CHỨNG MINH` phải có BẰNG CHỨNG — một ngày, một mã `G-`, hoặc một tên trang
{
  const rong = CAP1
    .filter((o) => (o[4] || "").includes("ĐÃ CHỨNG MINH"))
    /* Con trỏ hợp lệ: một NGÀY, một mã `G-`, một mã việc `T`/`S-`, hay tên một cuốn sổ. Ba dòng
     * `N2` `N4` `D1` bị ĐỎ ở lượt chạy đầu vì danh sách này thiếu `S-`/`T`/`HANDOFF` — mở đúng
     * bằng những thứ thật sự là con trỏ, không mở thành "có chữ nào cũng được". */
    .filter((o) => !/\d{2}\/\d{2}|`[GST]-?\d+`|TRIALS|HANDOFF|probe|Chrome riêng|mọi phiên|mọi lượt/.test(o[5] || ""))
    .map((o) => o[1]);
  assert.deepEqual(rong, [],
    `ô ĐÃ CHỨNG MINH không có bằng chứng: ${rong.join(", ")} — "đã chứng minh" mà không trỏ vào đâu ` +
    "thì chỉ là một lời khai, và cả file này sinh ra để không có lời khai nào đứng một mình");
}

console.log("  · capabilities bảng: 6 khối xanh");

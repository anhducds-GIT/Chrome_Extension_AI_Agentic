/* Nhãn `Audit:` là TRAILER, không phải KIỂU của conventional-commit.
 *
 * 10/09 cổng `safe-push` từ chối một commit tài liệu vì tiêu đề của nó bắt đầu bằng
 * `audit:` — kiểu commit, không phải lời khai người duyệt. Phép ghim dưới đây chạy CẢ hai
 * chiều: bản mới phải xanh, và logic CŨ (quét cả dòng đầu) phải ĐỎ trên đúng ca đã xảy ra.
 * Không có chiều thứ hai thì phép ghim chỉ ghim lại giả định của tôi.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditFromMessage } from "../scripts/repo-structure.mjs";

const GOC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DS = ["codex", "duc"];
let so = 0;
const ca = (ten, fn) => { fn(); so += 1; console.log(`  ok  ${ten}`); };

ca("ⓐ tiền tố kiểu `audit:` ở tiêu đề KHÔNG phải lời khai", () => {
  const r = auditFromMessage("audit: MOC 2 FAIL — thieu workers/hnx-fetch/AGENTS.md\n\nLane: x", DS);
  assert.equal(r.khai, null, "tiêu đề `audit:` bị đọc thành người duyệt");
  assert.equal(r.chuaAudit, false);
  assert.equal(r.problem, null);
});

ca("ⓑ trailer thật ở cuối vẫn nhận", () => {
  const r = auditFromMessage("fix(x): sửa gì đó\n\nLane: x\nAudit: codex", DS);
  assert.equal(r.khai, "codex");
  assert.equal(r.chuaAudit, false);
});

ca("ⓒ `Audit: chua-co` vẫn TỰ CHẶN — chiều bảo vệ không được nới", () => {
  const r = auditFromMessage("fix(x): sửa gì đó\n\nAudit: chua-co", DS);
  assert.equal(r.chuaAudit, true, "lời tự khai chưa audit phải giữ nguyên hiệu lực");
});

ca("ⓓ tên ngoài danh sách vẫn bị bắt khi đứng ở TRAILER", () => {
  const r = auditFromMessage("fix(x): sửa gì đó\n\nAudit: nguoi-la", DS);
  assert.equal(r.chuaAudit, true);
  assert.match(String(r.problem), /AUDIT_NGOAI_DANH_SACH/);
});

ca("ⓔ hai trailer khác nhau vẫn là xung đột", () => {
  const r = auditFromMessage("fix(x): a\n\nAudit: codex\nAudit: duc", DS);
  assert.equal(r.chuaAudit, true);
  assert.match(String(r.problem), /AUDIT_XUNG_DOT/);
});

/* CHIỀU NGƯỢC — dựng lại đúng logic cũ và đòi nó HỎNG trên ca ⓐ. Nếu bản cũ cũng xanh thì
   phép ghim này không đo gì cả, và phải nói ra ngay chứ không im lặng đi qua. */
ca("ⓕ logic CŨ phải đỏ trên ca ⓐ, và xanh trên ca ⓑ", () => {
  const cu = (text) => String(text ?? "").split("\n")
    .filter((line) => /^\s*audit\s*:/i.test(line))
    .map((line) => line.slice(line.indexOf(":") + 1).trim().toLowerCase());
  assert.equal(cu("audit: MOC 2 FAIL — thieu workers/hnx-fetch/AGENTS.md\n\nLane: x").length, 1,
    "logic cũ lẽ ra phải bắt nhầm tiêu đề — nếu không thì ca ⓐ không tái hiện được lỗi thật");
  assert.equal(cu("fix(x): sửa gì đó\n\nLane: x\nAudit: codex")[0], "codex",
    "logic cũ vẫn phải nhận trailer thật — nếu không thì phép so hai chiều vô nghĩa");
});

/* Nguồn phải THẬT mang lát cắt bỏ dòng đầu. Không có dòng này thì ai đó gỡ `.slice(1)`
   mà năm ca trên vẫn xanh — đúng lỗi "ghim trang trí" mà audit Codex bắt được ở B-57. */
ca("ⓖ nguồn có `.slice(1)` đúng một chỗ trong auditFromMessage", () => {
  const src = fs.readFileSync(path.join(GOC, "scripts", "repo-structure.mjs"), "utf8");
  const dau = src.indexOf("export function auditFromMessage");
  assert.ok(dau > 0, "không tìm thấy auditFromMessage — mỏ neo lệch");
  const than = src.slice(dau, src.indexOf("\nexport ", dau + 1));
  const dem = than.split('split("\\n").slice(1)').length - 1;
  assert.equal(dem, 1, `phải có đúng một \`split("\\n").slice(1)\`, đếm được ${dem}`);
});

console.log(`audit-trailer-smoke: ${so}/${so} xanh`);

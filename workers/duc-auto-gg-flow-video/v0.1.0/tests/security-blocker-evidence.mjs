// Lớp dò cảnh báo an toàn phải NÓI ĐƯỢC nó thấy chữ gì.
//
// Ngày 06/09 nó báo `SECURITY_HARD_STOP` trên giao diện Flow mới trong khi ô
// nhập và nút tạo đều bình thường — và không cách nào biết nó thấy chữ gì. Nó
// quét TOÀN BỘ chữ trên trang bằng một biểu thức rồi chỉ trả về "có".
//
// Một lớp an toàn câm để lại đúng hai lựa chọn, cả hai đều tồi: tin mù và
// không chạy được gì, hoặc gỡ lớp chặn ra. Phép kiểm này giữ cửa thứ ba.
//
// RANH GIỚI: phần thêm vào CHỈ để chẩn đoán. Lớp quyết định chặn không được
// đụng tới — sửa nó là sửa hành vi an toàn, việc phải hỏi Đức.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const content = readFileSync(new URL("../content.js", import.meta.url), "utf8");

/* --- 1. Lớp quyết định chặn KHÔNG được đổi ------------------------------- */

assert.ok(content.includes(
  'return ADAPTER.securityBlockerPattern.test(text) ? "Flow security/interstitial blocker detected." : null;'),
  "lớp quyết định chặn đã bị sửa — đó là sửa hành vi an toàn, không phải thêm chẩn đoán");

/* --- 2. Phần chẩn đoán phải có, và phải đi ra tới dom_probe -------------- */

const than = content.slice(content.indexOf("function securityBlockerMatch"), content.indexOf("function securityBlockerMatch") + 700);
assert.ok(than.includes("ADAPTER.securityBlockerPattern.exec("),
  "phần chẩn đoán phải dùng CHÍNH biểu thức của lớp chặn — dùng biểu thức khác là hai lớp trả lời khác nhau về cùng một trang");
assert.ok(content.includes("securityBlockerMatch: securityBlockerMatch()"),
  "dom_probe phải trả trường chẩn đoán, nếu không thì nó vẫn câm với người vận hành");

/* --- 3. Chỉ đoạn ngắn, không đổ cả trang -------------------------------- */

const soChar = /const SEC_CONTEXT_CHARS = (\d+);/.exec(content);
assert.ok(soChar, "thiếu hằng khai độ dài đoạn trích");
assert.ok(Number(soChar[1]) <= 200,
  `đoạn trích ${soChar[1]} ký tự là quá dài — một phép chẩn đoán không được biến thành đường rò nội dung trang của Đức`);

/* --- 4. Hành vi: chạy thật hàm vừa cắt ra ------------------------------- */

// Cắt đúng hàm ra khỏi content.js rồi chạy — chép lại logic sang đây thì đột
// biến vào code sẽ không làm phép kiểm này đỏ.
const pattern = /const securityBlockerPattern = (\/.*\/i);/.exec(
  readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"));
assert.ok(pattern, "không đọc được biểu thức dò từ adapter");

const dau = content.indexOf("  const SEC_CONTEXT_CHARS");
const cuoi = content.indexOf(String.fromCharCode(10) + "  }", content.indexOf("function securityBlockerMatch"));
assert.ok(dau >= 0 && cuoi > dau, "khong cat duoc than ham chan doan");
const than2 = content.slice(dau, cuoi + 4);
const ctx = { ADAPTER: { securityBlockerPattern: eval(pattern[1]) }, document: { body: { innerText: "" } } };
vm.createContext(ctx);
vm.runInContext(than2 + "\nglobalThis.__m = securityBlockerMatch;", ctx);
const chay = (text) => { ctx.document.body.innerText = text; return ctx.__m(); };

assert.equal(chay("trang binh thuong, khong co gi dang ngai"), null, "trang sạch thì không được bịa ra một cảnh báo");

const dai = "x".repeat(500) + " please complete the CAPTCHA to continue " + "y".repeat(500);
const kq = chay(dai);
assert.ok(kq, "trang có cảnh báo thì phải trả về bằng chứng");
assert.match(kq.matched.toLowerCase(), /captcha/, "phải nói ra ĐÚNG chữ đã khớp");
assert.ok(kq.context.includes("complete the"), "đoạn trích phải mang ngữ cảnh quanh chỗ khớp");
assert.ok(kq.context.length < 500,
  `đoạn trích dài ${kq.context.length} ký tự — phải là một đoạn ngắn, không phải cả trang`);
assert.ok(!kq.context.includes("x".repeat(200)), "đoạn trích không được kéo theo cả khối chữ quanh nó");

// Chữ tiếng Việt cũng phải ra bằng chứng, không chỉ ra "có".
const kqVi = chay("Hệ thống ghi nhận hoạt động bất thường trên tài khoản này.");
assert.ok(kqVi && kqVi.matched, "nhánh tiếng Việt cũng phải trả bằng chứng");

console.log("security-blocker-evidence: OK");

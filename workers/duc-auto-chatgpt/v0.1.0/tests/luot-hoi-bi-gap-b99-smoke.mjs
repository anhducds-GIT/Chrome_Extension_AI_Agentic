/* B-99 — ĐỒ ĐẠC CỦA TRANG LỌT VÀO CHỮ CỦA LƯỢT HỎI, VÀ NÓ LÀM MỌI LƯỢT GỬI DÀI "KHÔNG KHẲNG
 * ĐỊNH ĐƯỢC".
 *
 * ĐO LIVE 17/09, chuỗi `02`, hội thoại `6aaba9e8`, tám vòng liên tiếp:
 *     chuỗi gửi   869 ký tự
 *     trang đọc ra 879 ký tự      ← dư đúng "\nShow more"
 * `dom-probe` chỉ ra thủ phạm, có mỏ neo cấu trúc:
 *     { testid: "collapsible-user-message-toggle", txt: "Show more" }   × 2 lượt hỏi dài
 * ChatGPT GẤP GỌN một lượt hỏi dài và gắn nút "Show more" vào cuối; `innerText` của cả lượt
 * chở luôn nhãn nút ấy.
 *
 * Hậu quả đo được: `soleUserTurnIndex` so **160 ký tự ĐẦU + 160 ký tự CUỐI**. 160 đầu khớp
 * hoàn hảo, 160 cuối thì không — nên `chat.say` trả `CHAT_SAY_UNCONFIRMED` **8/8 vòng**.
 * Không chập chờn, không phải mạng, không phải tab bị che (đo được `visibility: "visible"`):
 * một lỗi PHÉP SO. Nó chỉ nổ với prompt ĐỦ DÀI ĐỂ BỊ GẤP, nên sống sót qua mọi lượt thử tay.
 *
 * File này KHÔNG grep mã: nó CẮT `assistantMessageText` đã ship ra và CHẠY nó, rồi đưa kết quả
 * sang `soleUserTurnIndex` THẬT. Hai hàm thật, một đường dây — đúng thứ đã hỏng ngoài đời.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "reconciliation-core.js")));
await import(pathToFileURL(path.join(here, "..", "provider-adapter.js")));
const { soleUserTurnIndex, MATCH_NONE } = globalThis.DacReconciliationCore;
const ADAPTER = globalThis.DacProviderAdapter;

/* Cắt hàm THẬT, cùng mỏ neo `chat-read-smoke.mjs` dùng. */
const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");
const start = content.indexOf("  function assistantMessageText(message) {");
const end = content.indexOf("  function readTurns(", start + 1);
assert.ok(start > 0 && end > start, "content.js vẫn định nghĩa assistantMessageText ngay trước readTurns");
const layChu = vm.runInNewContext(
  `(function (window) {\n${content.slice(start, end)}\nreturn assistantMessageText;\n})`
)({ DacProviderAdapter: ADAPTER });

/* Lượt hỏi giả, dựng theo đúng số đo live: chữ thật + xuống dòng + nhãn nút gấp. */
const TESTID = "collapsible-user-message-toggle";
function luotHoi(chuThat, nhanNut, testid = TESTID) {
  const innerText = nhanNut === null ? chuThat : `${chuThat}\n${nhanNut}`;
  return {
    innerText,
    textContent: innerText,
    querySelectorAll(selector) {
      if (nhanNut === null) return [];
      const muon = selector.includes(testid);
      return muon && testid === TESTID ? [{ innerText: nhanNut, textContent: nhanNut }] : [];
    }
  };
}

/* Chữ dài hơn 320 ký tự — ĐÓ LÀ ĐIỀU KIỆN để `promptKey` chuyển sang dạng đầu+đuôi, tức là
   điều kiện để con lỗi này tồn tại. Chữ ngắn không bao giờ dính. */
const GUI = "Tiếp tục VENDOR-BROWSER-ARCHITECTURE-STUDY — Vòng 3/9.\n\n"
  + Array.from({ length: 24 }, (_u, i) => `- dòng đo thứ ${i + 1} trong gói yêu cầu vòng này;`).join("\n")
  + "\n\nKhông benchmark usage.\nKhông implement.\nKhông suy đoán proprietary internals thành fact.";
assert.ok(GUI.length > 320, `chữ thử phải dài hơn 320 (đang ${GUI.length}) — ngắn hơn thì promptKey so nguyên chuỗi và con lỗi không tồn tại`);

/* ⑴ CA CỦA ĐỨC: chữ đọc ra phải bằng ĐÚNG chữ đã gửi, không dư một ký tự. */
const co = luotHoi(GUI, "Show more");
assert.equal(co.innerText.length, GUI.length + 10, "dựng đúng số đo live: dư đúng 10 ký tự");
assert.equal(layChu(co), GUI, "nhãn nút gấp phải bị bóc — chữ đọc ra bằng đúng chữ đã gửi");
assert.equal(layChu(co).length, GUI.length);

/* ⑵ VÀ ĐƯỜNG DÂY THẬT PHẢI THÔNG. Đây mới là vế chịu tải: bóc đúng mà phép so vẫn trượt thì
   Đức vẫn thấy `CHAT_SAY_UNCONFIRMED`. Chạy `soleUserTurnIndex` THẬT. */
const hang = (text) => [{ role: "user", text, truncated: false }];
assert.equal(soleUserTurnIndex(hang(layChu(co)), GUI), 0, "sau khi bóc, phép khẳng định 'đã gửi' phải TÌM RA lượt hỏi");
assert.equal(soleUserTurnIndex(hang(co.innerText), GUI), MATCH_NONE,
  "và phải CHỨNG MINH con lỗi có thật: chữ CHƯA bóc thì phép so trượt — đây là 8/8 vòng của Đức");

/* ⑶ KHÔNG PHỤ THUỘC NGÔN NGỮ. Nhãn đọc từ chính nút lúc chạy, nên "Show less" hay tiếng Việt
   đều đúng mà không phải liệt kê trước chữ nào. Mỏ neo là `data-testid`, không phải chữ. */
for (const nhan of ["Show less", "Hiện thêm", "Rút gọn"]) {
  assert.equal(layChu(luotHoi(GUI, nhan)), GUI, `nhãn "${nhan}" cũng phải bóc được — mỏ neo là cấu trúc, không phải chữ`);
}
assert.ok(ADAPTER.SELECTORS.turnChrome.every((s) => s.includes("data-testid")),
  "mỏ neo phải là data-testid: chữ trên nút đổi theo ngôn ngữ giao diện của Đức, testid thì không");

/* ⑷ KHÔNG BÓC NHẦM. Ba ca hàng xóm, mỗi ca một kiểu sai khác nhau. */
assert.equal(layChu(luotHoi(GUI, null)), GUI, "lượt không bị gấp thì không đụng tới");
const giuaChung = `Show more\n${GUI}`;
assert.equal(layChu({ innerText: giuaChung, textContent: giuaChung, querySelectorAll: () => [{ innerText: "Show more" }] }),
  giuaChung, "chỉ cắt Ở ĐUÔI — chữ trùng nhãn nằm giữa bài là nội dung thật của Đức, không được đụng");
const khongPhaiNut = { innerText: `${GUI}\nShow more`, textContent: "", querySelectorAll: () => [] };
assert.equal(layChu(khongPhaiNut), `${GUI}\nShow more`,
  "không có NÚT thì không cắt, dù chữ trông giống nhãn — bóc theo chữ là đoán, bóc theo nút là đo");

/* ⑸ Và hàm phải nằm TRONG MỘT THÂN, không tách helper: hai phép ghim khác cắt đúng lát này ra
   chạy trong `node:vm`, tách ra là chúng đỏ với `ReferenceError` (đo được ngay lượt đầu). */
assert.ok(!/\bfunction\s+\w+\s*\([^)]*\)\s*\{[\s\S]*\bfunction assistantMessageText/.test(content.slice(start, end)),
  "không được chèn một hàm khác vào trước assistantMessageText trong lát cắt này");

console.log("B-99 lượt hỏi bị gấp: bóc nhãn nút, phép khẳng định 'đã gửi' thông trở lại: PASS");

/* `chat.read` — đọc TRỌN chữ của hội thoại, và phải nói ra khi nó đọc không được.
 *
 * VÌ SAO CÓ METHOD NÀY (đo thật 2026-09-03). Một phiên Claude Code cần đọc câu trả lời của
 * GPT trên tab ChatGPT. Đường duy nhất đang có là `diagnostics.dom_probe`, và nó KHÔNG chở
 * nổi nội dung — đo trên tab thật, quét TOÀN BỘ payload thì trường chữ dài nhất là cái URL,
 * 114 ký tự:
 *
 *     content.js  txtHead: (element.innerText || "").…slice(0, 60)   <- 60 ký tự / tin nhắn
 *     content.js  messageContainers.slice(0, 4)                      <- 4 khung
 *     và mỗi lượt ChatGPT khớp HAI tầng khung (matched 8, sampled 4) <- phủ đúng 2 lượt
 *
 * Nên Đức phải dán tay câu trả lời của GPT ở mọi vòng. Đó là việc của người, cho một thứ máy
 * đọc được.
 *
 * VÀ VÌ SAO KHÔNG NỚI PROBE RA CHO ĐỦ CHỮ — đây là phần đáng đọc nhất: probe là máy soi CẤU
 * TRÚC. Payload nó có nắp 64KB và MỌI trường cố tình cắt ngắn. Nới nó ra để chở nội dung là
 * bắt một trường làm hai việc, và cái vỡ trước sẽ là chẩn đoán. Đó đúng là cách lỗi #5 sống
 * được một tuần: `articleSample: []` nằm cạnh `assistantCount: 7` trong chính hồ sơ bằng
 * chứng, mù một nửa mà tự báo khoẻ.
 *
 * File này KHÔNG grep mã nguồn, nó CHẠY mã nguồn: các khối đã ship được cắt ra từ
 * `content.js` rồi thi hành trên DOM giả dựng theo số đo live. Cùng kỹ thuật với
 * `dom-probe-message-sample-smoke.mjs`, vì cùng một bài học: chỗ nào không gọi được thì
 * không kiểm được. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

function slice(startAnchor, endAnchor, why) {
  const start = content.indexOf(startAnchor);
  const end = content.indexOf(endAnchor, start + 1);
  assert.ok(start > 0, `content.js still defines ${startAnchor.trim()} — if it moved, this test must FOLLOW it, not be deleted (${why})`);
  assert.ok(end > start, `the block after ${startAnchor.trim()} still ends at ${endAnchor.trim()} (${why})`);
  return content.slice(start, end);
}

/* ---- khối 1: hàm đọc lượt, cùng lát với hàm lấy chữ -------------------------
   Cắt CẢ HAI trong một lát là có chủ đích: `readTurns` gọi `assistantMessageText`, nên nếu
   test tự viết lại hàm lấy chữ thì nó kiểm một bản chép, không kiểm bản đã ship. */
const readBlock = slice(
  "  function assistantMessageText(message) {",
  "  function latestAssistantText() {",
  "hàm lấy chữ và hàm đọc lượt phải nằm cạnh nhau, một lát cắt"
);
assert.ok(readBlock.includes("function readTurns("), "readTurns nằm ngay sau assistantMessageText — một lát cắt lấy được cả hai định nghĩa THẬT");
// Kiến thức selector của nhà cung cấp KHÔNG được quay lại đây. `provider-adapter-static` đã
// cưỡng chế điều này cho cả file; dòng dưới ghim riêng cho hàm này, vì đây đúng là chỗ bản
// đầu đã đóng cứng một tên attribute và bị bắt.
assert.doesNotMatch(readBlock, /\[data-turn=|data-message-author-role|\[data-testid\]/,
  "readTurns không được chứa selector của ChatGPT: nó NHẬN selector đã phân giải từ adapter, và lưới dò lúc hỏng phải trung tính");
const runRead = vm.runInNewContext(`(function () {\n${readBlock}\nreturn readTurns;\n})()`);

/* ---- khối 2: cửa chặn thiếu nắp, cắt từ chính handler ----------------------
   Ca hỏng nó chặn: gọi `chat.read` mà không khai nắp thì `slice(max(0, len - undefined))`
   ra `slice(NaN)` = `slice(0)` = ĐỌC TẤT CẢ — vỡ envelope 1MB một cách im lặng. */
const capBlock = slice(
  "      const limit = Number(message.limit);",
  // Mỏ neo phải DỪNG TRƯỚC `try {`, không đi qua nó: lát cắt này được `vm` biên dịch, nên ôm
  // một `try` không có `catch` là lỗi cú pháp. Hệ quả: chú thích cho dòng `sendResponse` phải
  // nằm TRÊN `try {` trong `content.js`, không nằm trong lòng nó (B-57 đã va đúng chỗ này).
  "      try {\n        sendResponse({ ok: true, read: { url: location.href",
  "cửa chặn thiếu nắp nằm ngay trước lời gọi readTurns"
);
// Khối cắt ra mang theo `return false` của chính handler, nên PHẢI bọc trong một IIFE: không
// bọc thì nó thoát khỏi wrapper trước khi wrapper kịp trả `sent`, và mọi ca xấu sẽ trông y như
// đã qua cửa — một phép kiểm xanh mà không kiểm gì.
const runCapGuard = vm.runInNewContext(
  `(function (message) {\n let sent = null; const sendResponse = (value) => { sent = value; };
 (function () {
${capBlock}
 })();
 return sent;\n})`
);

/* ---- khối 3: phân giải selector — nền của luật "không đếm hai lần" --------- */
const selBlock = slice(
  "  function resolveSelector(candidates) {",
  "  // Trang hiện tại có phải một hội thoại thật không",
  "resolveSelector và hai hàm gọi nó"
);
const makeSelectors = vm.runInNewContext(`(function (document, SEL) {\n${selBlock}\nreturn { assistantSelector, userSelector };\n})`);

/* ---- DOM giả: đủ rộng cho đúng những gì các khối trên hỏi ------------------
   Hỗ trợ token `*` và `[attr="value"]` và `[attr]`. Trả mỗi node TỐI ĐA MỘT LẦN, y như
   `querySelectorAll` thật — nếu không thì `matched` bị thổi lên bởi một node mang hai marker,
   và luật "không đếm hai lần" sẽ xanh mà không kiểm gì. */
function makeDocument(specs) {
  const element = (spec) => {
    const attributes = Object.entries(spec.data || {}).map(([name, value]) => ({ name, value: String(value) }));
    const node = {
      tagName: (spec.tag || "div").toUpperCase(),
      attributes,
      innerText: spec.text === undefined ? "" : spec.text,
      getAttribute(name) {
        const found = attributes.find((attribute) => attribute.name === name);
        return found ? found.value : null;
      },
      matches(selector) {
        return selector.split(",").map((token) => token.trim()).filter(Boolean).some((token) => matchToken(node, token));
      },
      // B-56 ⓵ · khối copy NẰM TRONG một lượt, nên phải hỏi được từ chính node lượt đó — chứ
      // không phải quét cả trang rồi lấy cái cuối. Khác biệt ấy là cả một lỗi: quét cả trang
      // thì khối của lượt TRƯỚC vẫn khớp, và chuỗi nhiều vòng sẽ gửi lại đúng prompt cũ.
      querySelectorAll(selector) {
        const tokens = selector.split(",").map((token) => token.trim()).filter(Boolean);
        return (spec.blocks || []).map((text) => ({
          tagName: "PRE",
          attributes: [],
          innerText: text,
          getAttribute: () => null
        })).filter((child) => tokens.some((token) => matchToken(child, token)));
      }
    };
    return node;
  };
  const matchToken = (node, token) => {
    if (token === "*") return true;
    const withValue = token.match(/^\[([\w-]+)="([^"]*)"\]$/);
    if (withValue) return node.attributes.some((a) => a.name === withValue[1] && a.value === withValue[2]);
    const bare = token.match(/^\[([\w-]+)\]$/);
    if (bare) return node.attributes.some((a) => a.name === bare[1]);
    return node.tagName === token.toUpperCase();
  };
  const all = specs.map(element);
  return {
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] || null;
    },
    querySelectorAll(selector) {
      const tokens = selector.split(",").map((token) => token.trim()).filter(Boolean);
      return all.filter((node) => tokens.some((token) => matchToken(node, token)));
    }
  };
}

const A = '[data-turn="assistant"]';
const U = '[data-turn="user"]';

/* ---- ca 1: trang thật như đo được 2026-09-03 -------------------------------
   Đây là lời khẳng định mà đường 60-ký-tự KHÔNG THỂ nào đạt. */
const liveDoc = makeDocument([
  { data: { "data-testid": "create-new-chat-button" }, text: "New chat" },
  { data: { "data-turn": "user", "data-message-author-role": "user", "data-message-id": "m1" }, text: "tôi muốn tạo prompt để claude code xây dựng dashboard" },
  { data: { "data-turn": "assistant", "data-message-author-role": "assistant", "data-message-id": "m2" }, text: "[MODE: Handoff | BUDGET: 2400 w] KẾT LUẬN — Artifact chỉ là lớp hiển thị, không được biến thành SSOT mới." }
]);
const live = runRead(liveDoc, A, U, 10, 8000);
assert.equal(live.status, "OK");
assert.equal(live.matched, 2, "đúng hai lượt thật, mỗi lượt đếm MỘT lần dù mang ba marker — sidebar không được kể vào");
assert.equal(live.returned, 2);
assert.equal(live.with_text, 2);
assert.equal(live.turns[0].role, "user");
assert.equal(live.turns[1].role, "assistant");
assert.equal(
  live.turns[1].text,
  "[MODE: Handoff | BUDGET: 2400 w] KẾT LUẬN — Artifact chỉ là lớp hiển thị, không được biến thành SSOT mới.",
  "chữ về NGUYÊN VĂN, không bị cắt ở 60 ký tự — đây chính là lý do method này tồn tại"
);
assert.equal(live.turns[1].truncated, false);
assert.equal(live.turns[1].chars, live.turns[1].text.length);
assert.equal(live.turns[1].id, "m2", "id của lượt đi theo lượt, để phiên sau biết mình đã đọc tới đâu");
assert.ok(!live.turns.some((turn) => turn.text === "New chat"), "chữ ở sidebar không bao giờ được báo là một lượt hội thoại");

/* ---- ca 2: ĐUÔI, không phải ĐẦU — ca hỏng im lặng nhất --------------------
   `slice(0, limit)` cũng trả về đủ `limit` lượt và payload trông hoàn toàn bình thường; chỉ
   có điều nó là phần MỞ ĐẦU cuộc hội thoại, và câu trả lời vừa tới thì không có trong đó. */
const longDoc = makeDocument(Array.from({ length: 12 }, (_, index) => ({
  data: { "data-turn": index % 2 === 0 ? "user" : "assistant", "data-message-id": `m${index}` },
  text: `lượt số ${index}`
})));
const tail = runRead(longDoc, A, U, 3, 8000);
assert.equal(tail.matched, 12, "vẫn báo trang CÓ bao nhiêu lượt, không chỉ báo số lượt trả về");
assert.equal(tail.returned, 3);
assert.equal(tail.turns.map((turn) => turn.id).join(","), "m9,m10,m11", "ba lượt CUỐI, theo thứ tự cũ-tới-mới — lấy ba lượt đầu là bỏ mất đúng câu trả lời vừa tới");

/* ---- ca 3: cắt theo nắp thì phải TỰ KHAI là đã cắt ------------------------ */
const bigDoc = makeDocument([{ data: { "data-turn": "assistant" }, text: "x".repeat(5000) }]);
const clipped = runRead(bigDoc, A, U, 10, 1000);
assert.equal(clipped.turns[0].text.length, 1000);
assert.equal(clipped.turns[0].chars, 5000, "`chars` là độ dài THẬT trên trang, không phải độ dài sau khi cắt — thiếu nó thì phía đọc không biết mình đang thiếu bao nhiêu");
assert.equal(clipped.turns[0].truncated, true, "cắt mà không khai là đúng hình dạng lỗi #5: thiếu dữ liệu nhưng payload tự nhận đầy đủ");
assert.equal(live.turns[0].truncated, false, "và cờ đó phải PHÂN BIỆT được hai ca, chứ không phải luôn bật");

/* ---- ca 4: khung thật, trang chưa có chữ --------------------------------- */
const quiet = runRead(makeDocument([
  { data: { "data-turn": "user" }, text: "" },
  { data: { "data-turn": "assistant" }, text: "   " }
]), A, U, 10, 8000);
assert.equal(quiet.status, "MATCHED_BUT_NO_TEXT", "trang trống phải nói là trống, chứ không được trông giống selector chết");
assert.equal(quiet.matched, 2);
assert.equal(quiet.with_text, 0);

/* ---- ca 5: MỌI marker đã chết — ca từng im lặng -------------------------- */
const dead = runRead(makeDocument([
  { data: { "data-conversation-node": "assistant", "data-xyz": "1" }, text: "chữ này có thật nhưng không marker nào đã biết với tới" }
]), A, U, 10, 8000);
assert.equal(dead.status, "NO_TURNS_MATCHED", "selector chết phải được GỌI TÊN là selector chết — hai kết luận này chỉ về hai hướng ngược nhau");
assert.equal(dead.matched, 0);
assert.equal(dead.turns.length, 0);
assert.equal(dead.selector, `${A}, ${U}`, "selector đã hỏng phải ĐI THEO cái hỏng, để phiên sau không phải đoán nó là gì");
assert.ok(dead.attribute_names.includes("data-conversation-node"), "và người đọc được trao đúng thứ ĐANG CÓ trên trang, để dựng selector mới TỪ BẰNG CHỨNG (luật vàng 1)");
assert.equal(live.attribute_names.length, 0, "đường thành công GIỮ KHOÁ với mảng rỗng — hình dạng payload ổn định thì phía đọc không phải xử lý hai kiểu");

/* So mảng bằng GIÁ TRỊ, không bằng deepStrictEqual: mảng do vm trả về mang Array prototype
   của realm khác, nên so sâu-nghiêm-ngặt sẽ đỏ trên hai mảng nội dung y hệt nhau. */

/* ---- ba trạng thái phải PHÂN BIỆT được, không thì cả ba đều vô nghĩa ------ */
assert.equal(new Set([live.status, quiet.status, dead.status]).size, 3);

/* ---- cửa chặn thiếu nắp: CHẠY THẬT, không đọc chữ ------------------------ */
assert.equal(runCapGuard({ limit: 10, maxCharsPerTurn: 8000 }), null, "khai đủ hai nắp thì cửa im lặng cho đi qua");
for (const [bad, why] of [
  [{}, "không khai gì"],
  [{ limit: 10 }, "thiếu nắp chữ"],
  [{ maxCharsPerTurn: 8000 }, "thiếu nắp lượt"],
  [{ limit: 0, maxCharsPerTurn: 8000 }, "nắp lượt bằng 0"],
  [{ limit: 2.5, maxCharsPerTurn: 8000 }, "nắp lượt không phải số nguyên"]
]) {
  const answer = runCapGuard(bad);
  assert.equal(answer?.ok, false, `TỪ CHỐI khi ${why} — lùi về đọc-tất-cả là đường vòng làm vỡ envelope 1MB`);
  assert.match(answer.error, /CHAT_READ_FAILED/);
}

/* ---- nền của luật "không đếm hai lần" ----------------------------------- */
const bothMarkers = makeDocument([{ data: { "data-turn": "assistant", "data-message-author-role": "assistant" }, text: "một lượt" }]);
const selectors = makeSelectors(bothMarkers, {
  assistantMessage: ['[data-turn="assistant"]', '[data-message-author-role="assistant"]'],
  userMessage: ['[data-turn="user"]', '[data-message-author-role="user"]']
});
assert.equal(selectors.assistantSelector(), '[data-turn="assistant"]', "phân giải lấy ứng viên ĐẦU TIÊN khớp — khớp cả hai cùng lúc là đếm một lượt thành hai");
assert.equal(runRead(bothMarkers, selectors.assistantSelector(), selectors.userSelector(), 10, 8000).matched, 1);

/* ---- hai nắp nhân nhau: đo được 3-9-2026, hội thoại thật 5 lượt ở nắp tối đa
   ra envelope 15926 byte. Nhưng nắp cho phép 50 lượt x 40000 ký tự ~ 2MB, mà
   trần envelope là 1MB — nên phải chặn TỔ HỢP ngay cửa vào, không phải để frame
   vỡ trên đường về (lúc đó người gọi thấy lỗi transport và đi sửa đường mạng). --- */
const coreContext = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
coreContext.globalThis = coreContext;
vm.createContext(coreContext);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), coreContext);
const core = coreContext.DacBridgeCore;

// Mặc định phải nằm trong ngân sách, nếu không thì lời gọi trống cũng bị từ chối.
const mac_dinh = JSON.parse(JSON.stringify(core.validateParams("chat.read", {})));
assert.deepEqual(mac_dinh, { limit: 10, max_chars_per_turn: 8000 });
assert.ok(mac_dinh.limit * mac_dinh.max_chars_per_turn <= 200000);

// Mỗi nắp ở mức tối đa CỦA RIÊNG NÓ vẫn phải đi qua — đây là chỗ dễ chặn quá tay.
assert.equal(core.validateParams("chat.read", { limit: 50, max_chars_per_turn: 4000 }).limit, 50);
assert.equal(core.validateParams("chat.read", { limit: 5, max_chars_per_turn: 40000 }).max_chars_per_turn, 40000);

// Còn tổ hợp vượt ngân sách thì bị TỪ CHỐI, kèm mã máy đọc được.
for (const [params, why] of [
  [{ limit: 50, max_chars_per_turn: 40000 }, "cả hai nắp cùng tối đa"],
  [{ limit: 50, max_chars_per_turn: 4001 }, "vượt ngân sách đúng 50 ký tự"]
]) {
  assert.throws(
    () => core.validateParams("chat.read", params),
    (error) => error.code === "INVALID_PARAMS",
    `TỪ CHỐI khi ${why} — không chặn thì frame vỡ trên đường về và lỗi trông như đứt mạng`
  );
}

// Ngân sách phải được KHAI trong registry: đây là mặt tra cứu duy nhất mà một AI
// bên ngoài đọc trước khi gọi, nên nắp không khai là nắp nó sẽ đụng bằng cách hỏng.
assert.match(core.METHOD_REGISTRY["chat.read"].capability_description, /200000 characters/);

/* ==== B-56 ⓵ · KHỐI COPY cuối câu trả lời =====================================
   Cách làm việc Đức nêu 10/09: GPT tự soạn prompt cho bước sau và đặt vào một khối copy ở
   cuối câu trả lời. Mỏ neo `pre` ĐO LIVE 10/09 bằng `answerScope`: trong khung
   `[data-turn="assistant"]` cuối có đúng một `pre`, nội dung đúng là prompt lượt sau.

   Chữ đó VỐN ĐÃ nằm trong `text` của lượt. Thứ trường này thêm vào là RANH GIỚI — và ranh
   giới mới là thứ đáng ghim: khối là phần GPT CỐ Ý đóng gói, văn xuôi quanh nó là chỗ chữ lạ
   trôi vào. */
const BLOCK = "pre";
const doiThoai = (blocks, { text = "câu trả lời có khối copy ở cuối." } = {}) => makeDocument([
  { data: { "data-turn": "user", "data-message-id": "u1" }, text: "hỏi vòng 1" },
  { data: { "data-turn": "assistant", "data-turn-id": "t1" }, text: "vòng 1 xong", blocks: ["PROMPT CŨ của vòng trước"] },
  { data: { "data-turn": "user", "data-message-id": "u2" }, text: "hỏi vòng 2" },
  { data: { "data-turn": "assistant", "data-turn-id": "t2" }, text, blocks }
]);

/* ---- ⓐ đường thường: lấy đúng khối của lượt MỚI NHẤT --------------------- */
{
  const r = runRead(doiThoai(["Vòng 3: hãy nêu 3 dấu hiệu phân biệt outcome với proxy."]), A, U, 10, 8000, BLOCK);
  assert.equal(r.last_copy_block.found, true);
  assert.equal(r.last_copy_block.text, "Vòng 3: hãy nêu 3 dấu hiệu phân biệt outcome với proxy.");
  assert.equal(r.last_copy_block.turn_id, "t2", "phải quy về lượt mới nhất, để bên gọi đối chiếu được");
  assert.equal(r.last_copy_block.blocks_in_turn, 1);
  // MÉP CHỊU TẢI của cả tính năng: khối của lượt TRƯỚC không được lọt ra. Một bản thi hành
  // quét cả trang rồi lấy `pre` cuối sẽ xanh ở mọi mép khác và ĐỎ ở đây — và nếu nó lọt, chuỗi
  // nhiều vòng sẽ gửi lại đúng prompt cũ, im lặng, mãi mãi.
  assert.doesNotMatch(r.last_copy_block.text, /CŨ/, "khối của lượt TRƯỚC không được nhận nhầm thành khối lượt này");
}

/* ---- ⓑ không có khối copy → DỪNG, không phải HỎNG ------------------------ */
{
  const r = runRead(doiThoai([]), A, U, 10, 8000, BLOCK);
  assert.equal(r.last_copy_block.found, false, "GPT không soạn prompt tiếp thì không có bước tiếp — đây là điều kiện DỪNG");
  assert.equal(r.last_copy_block.text, "");
  assert.equal(r.status, "OK", "và lượt đọc vẫn OK: thiếu khối copy KHÔNG phải lỗi đọc, đừng để ai đọc thành 'bộ đọc hỏng'");
}

/* ---- ⓒ nhiều khối: lấy cái CUỐI, và NÓI RA là có mấy cái ----------------- */
{
  const r = runRead(doiThoai(["khối minh hoạ giữa bài", "PROMPT vòng sau"]), A, U, 10, 8000, BLOCK);
  assert.equal(r.last_copy_block.text, "PROMPT vòng sau");
  assert.equal(r.last_copy_block.blocks_in_turn, 2, "hai khối thì 'lấy cái cuối' là một LỰA CHỌN — bên gọi phải thấy được là mình đang tin vào lựa chọn đó");
}

/* ---- ⓓ nắp: khối dài phải cắt VÀ tự khai là đã cắt ----------------------- */
{
  const dai = "x".repeat(500);
  const r = runRead(doiThoai([dai]), A, U, 10, 100, BLOCK);
  assert.equal(r.last_copy_block.chars, 500, "`chars` là độ dài THẬT, không phải độ dài sau khi cắt");
  assert.equal(r.last_copy_block.text.length, 100);
  assert.equal(r.last_copy_block.truncated, true, "cắt mà không khai là gửi đi một prompt cụt mà không ai biết");
}

/* ---- ⓔ không truyền selector → im lặng ĐÚNG, không nổ ------------------- */
{
  // Ba đường chẩn đoán nội bộ gọi `readTurns` với năm tham số. Chúng không đọc khối copy, và
  // KHÔNG được vì thế mà hỏng.
  const r = runRead(doiThoai(["gì đó"]), A, U, 10, 8000);
  assert.equal(r.last_copy_block.found, false);
  assert.equal(r.last_copy_block.blocks_in_turn, 0);
}

/* ---- ⓕ không có lượt trả lời nào thì cũng không nổ ---------------------- */
{
  const chiHoi = makeDocument([{ data: { "data-turn": "user", "data-message-id": "u1" }, text: "mới hỏi thôi" }]);
  const r = runRead(chiHoi, A, U, 10, 8000, BLOCK);
  assert.equal(r.last_copy_block.found, false);
  assert.equal(r.last_copy_block.turn_id, null);
}

/* ---- ⓖ mỏ neo `pre` phải nằm ở ADAPTER, không đóng cứng trong runner ----- */
{
  const adapter = fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
  assert.match(adapter, /answerBlock: Object\.freeze\(\[/, "mỏ neo khối copy phải khai ở adapter — mọi kiến thức selector đi qua đó");
  assert.match(content, /SEL\.answerBlock/, "runner đọc mỏ neo QUA adapter");
  // PHẠM VI LÀ CHÍNH LÁT CẮT `readTurns`, KHÔNG PHẢI CẢ FILE. Bản đầu của mép này soi cả
  // `content.js` và đỏ ngay — vì nó khớp vào `khung.querySelectorAll("pre")` bên trong khối
  // `answerScope` của MÁY DÒ. Máy dò được miễn trừ có chủ ý: nó là thứ đi TÌM cấu trúc, nên
  // bắt nó hỏi adapter là bắt nó chỉ tìm được thứ ta đã biết. Ranh giới đó do
  // `provider-adapter-static` cưỡng chế cho cả file; mép này chỉ lo đường ĐỌC.
  assert.doesNotMatch(readBlock, /"pre"|'pre'/, "đường đọc KHÔNG được đóng cứng `pre` — nó nhận selector đã phân giải từ adapter");
}

/* ---- ⓗ `generating` — CÂU TRẢ LỜI XONG CHƯA, hỏi đúng chỗ runner hỏi -----
   Mép này sinh ra từ một lỗi THẬT của tôi, hai lần trên cùng một hội thoại (10/09): không có
   trường này thì bên gọi tự chế phép đoán "xong". Lần đầu tôi lấy `busy: false` — nó nói về
   PANEL. Lần hai tôi lấy "số ký tự đứng yên hai lượt đọc" — GPT gọi tool giữa chừng, chữ đứng
   yên hơn ba phút, tôi kết luận "chết giữa chừng" và gửi lại prompt hai lần trong khi nó vẫn
   đang trả lời bình thường. Câu trả lời thật dài 3450 ký tự và khối copy có đủ 805 ký tự. */
{
  const NGAT = String.fromCharCode(10);
  const khongChuThich = content.split(NGAT).filter((dong) => !dong.trim().startsWith("//") && !dong.trim().startsWith("*") && !dong.trim().startsWith("/*")).join(NGAT);
  // Đếm trên ĐÚNG payload của `chat.read`, không đếm cả file: `generating: Boolean(findStopButton())`
  // là một thành ngữ đã có sẵn ba chỗ khác (hai lần trong `DacChatReadiness`, một lần trong
  // `DAC_PING`). Bản đầu của mép này đếm cả file, ra 4, và báo đỏ cho một bản vá đúng.
  const lanKhai = khongChuThich.split("read: { url: location.href, generating: Boolean(findStopButton())").length - 1;
  assert.equal(lanKhai, 1, "`chat.read` phải khai `generating` ngay trong payload của nó, lấy từ chính `findStopButton()`");
  // MỘT bộ đọc nút Stop, không hai. Hai bộ đọc là hai chỗ để chúng nói khác nhau — và cái sai
  // sẽ là cái im lặng.
  const lanDocSel = khongChuThich.split("SEL.stop").length - 1;
  assert.equal(lanDocSel, 1, "`SEL.stop` chỉ được đọc trong `findStopButton()` — thêm bộ đọc thứ hai là mở đường cho hai câu trả lời khác nhau");
  // HÀNH VI: `...readTurns(...)` trải SAU `generating`, nên một ngày nào đó `readTurns` trả về
  // khoá cùng tên là nó ĐÈ mất — im lặng, và đúng vào trường quyết định dừng hay chạy tiếp.
  const r = runRead(doiThoai(["gì đó"]), A, U, 10, 8000, BLOCK);
  assert.ok(!("generating" in r), "`readTurns` KHÔNG được trả `generating` — nó sẽ đè lên trường thật lúc trải object");
}

/* ---- ⓘ CHẠY CHÍNH CỬA `DAC_CHAT_READ`, không đếm chữ trong mã nguồn ------
   Mép này sinh ra từ một lượt audit Codex 10/09 và nó đã bắt được lỗi thật của tôi. Ba khẳng
   định TĨNH của mép ⓗ đều XANH trong khi tính năng bị vô hiệu hoàn toàn: chỉ cần thêm
   `, generating: false` vào SAU dấu trải `...readTurns(...)` là mọi lượt đọc đều báo "đã xong",
   kể cả lúc trang còn đang sinh. Tôi đã chạy đúng đột biến đó — **132/132 XANH**. Một phép ghim
   đếm cách viết thì không kiểm được thứ hàm TRẢ VỀ.

   Nên mép này cắt cả nhánh `DAC_CHAT_READ` rồi CHẠY nó, với `findStopButton()` giả ở cả hai
   trạng thái, và đọc `generating` trong payload thật. */
{
  const dau = content.indexOf('    if (message.type === "DAC_CHAT_READ") {');
  const cuoi = content.indexOf('    if (message.type === "DAC_RECONCILE_TEXT_JOB") {', dau + 1);
  assert.ok(dau > 0 && cuoi > dau, "nhánh DAC_CHAT_READ còn nằm giữa hai mỏ neo này — nếu nó dời, mép này phải ĐI THEO, không được xoá");
  const nhanh = content.slice(dau, cuoi);

  const chay = (dangSinh) => {
    let traVe = null;
    const ctx = {
      message: { type: "DAC_CHAT_READ", limit: 10, maxCharsPerTurn: 8000 },
      sendResponse: (payload) => { traVe = payload; },
      surfaceAllowedNow: () => true,
      findStopButton: () => (dangSinh ? { nut: "Stop" } : null),
      readTurns: () => ({ status: "OK", turns: [], matched: 0 }),
      assistantSelector: () => "[data-turn=\"assistant\"]",
      userSelector: () => "[data-turn=\"user\"]",
      answerBlockSelector: () => "pre",
      location: { href: "https://chatgpt.com/c/abc" },
      // Nhánh truyền `document` thẳng vào `readTurns`; ở đây `readTurns` là hàng giả nên
      // `document` chỉ cần TỒN TẠI. Thiếu nó thì `try/catch` nuốt thành CHAT_READ_FAILED và
      // mép này đỏ vì lý do sai.
      document: {},
      Number
    };
    // Bọc trong một hàm: nhánh đã ship kết bằng `return false;` của listener, mà `return` trần
    // ở tầng script là lỗi cú pháp trong `vm`.
    vm.runInNewContext(`(function () {\n${nhanh}\n})()`, ctx);
    return traVe;
  };

  const dang = chay(true);
  const xong = chay(false);
  assert.equal(dang?.ok, true, "cửa phải trả lời được khi trang còn đang sinh");
  assert.equal(dang.read.generating, true, "còn nút Stop ⇒ generating PHẢI là true — đây là mép mà đột biến `, generating: false` chết");
  assert.equal(xong.read.generating, false, "hết nút Stop ⇒ generating là false");
  // Và đòi nó thật sự HỎI cái nút, không phải trả hằng số: hai trạng thái phải cho hai kết quả.
  assert.notEqual(dang.read.generating, xong.read.generating, "hai trạng thái nút Stop phải cho hai kết quả khác nhau — bằng nhau nghĩa là ai đó đóng cứng một hằng số");
}

console.log("chat read smoke tests: PASS");

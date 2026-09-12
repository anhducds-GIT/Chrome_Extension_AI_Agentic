/* B-82 · KHỐI COPY DẠNG CANVAS — bóc thân, bỏ vỏ.
 *
 * Đức chỉ ra 12/09: màn hình có nút copy rành rành, bộ chạy báo "không có khối". Đo bằng
 * `dom-probe` trên hội thoại thật:
 *
 *     answerScope: pre = 0 · nutCopy: {"aria":"Copy"} {"aria":"Open editor"}
 *     writing-block-container                          inner 815
 *     ├─ div.pointer-events-none                       inner   0
 *     ├─ div.relative.z-[1]                            inner 815
 *     │  ├─ div[writing-block-header-sticky-container] inner  34   "Refine Prompt Factory Architecture"
 *     │  └─ div.mt4SwW_editor                          inner 780   THÂN
 *     └─ div.pointer-events-none                       inner   0
 *
 * `answerBlock` neo vào đúng `["pre"]` nên mù hoàn toàn với canvas.
 *
 * File này KHÔNG grep mã nguồn, nó CHẠY mã nguồn: lát cắt thật của `content.js` thi hành trên
 * DOM giả dựng theo đúng số đo trên. Cùng kỹ thuật với `chat-read-smoke.mjs`, vì cùng bài học:
 * chỗ nào không gọi được thì không kiểm được.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

/* Cắt CẢ `thanCanvas` LẪN `readTurns` trong MỘT lát: `readTurns` gọi `thanCanvas`, nên cắt rời
   là kiểm một bản chép chứ không kiểm bản đã ship. Nếu ai đó dời `thanCanvas` ra khỏi lát này,
   test phải ĐI THEO nó — đừng xoá dòng khẳng định dưới đây. */
const start = content.indexOf("  function assistantMessageText(message) {");
const end = content.indexOf("  function latestAssistantText() {");
assert.ok(start > 0 && end > start, "content.js vẫn có assistantMessageText … latestAssistantText");
const khoi = content.slice(start, end);
assert.ok(khoi.includes("function thanCanvas("), "`thanCanvas` phải nằm CÙNG lát với `readTurns` — nó là hàm readTurns gọi");
assert.ok(khoi.includes("function readTurns("), "`readTurns` nằm trong lát");
const readTurns = vm.runInNewContext(`(function () {\n${khoi}\nreturn readTurns;\n})()`);

/* ---- DOM giả có CÂY THẬT (khác `chat-read-smoke`: ở đó con chỉ là `pre` phẳng) ---- */
function n(tag, attrs, con) {
  const attributes = Object.entries(attrs || {}).map(([name, value]) => ({ name, value: String(value) }));
  const children = Array.isArray(con) ? con : [];
  const chu = Array.isArray(con) ? null : (con === undefined ? "" : String(con));
  const node = {
    tagName: String(tag).toUpperCase(),
    attributes,
    children,
    get innerText() { return chu !== null ? chu : children.map((c) => c.innerText).filter(Boolean).join("\n"); },
    get textContent() { return node.innerText; },
    getAttribute(name) {
      const f = attributes.find((a) => a.name === name);
      return f ? f.value : null;
    },
    matches(sel) { return tach(sel).some((t) => khop(node, t)); },
    querySelectorAll(sel) {
      const tokens = tach(sel);
      const ra = [];
      const di = (el) => { for (const c of el.children) { if (tokens.some((t) => khop(c, t))) ra.push(c); di(c); } };
      di(node);
      return ra;
    },
    querySelector(sel) { return node.querySelectorAll(sel)[0] || null; }
  };
  return node;
}
const tach = (sel) => String(sel).split(",").map((s) => s.trim()).filter(Boolean);
const khop = (node, token) => {
  const batDau = token.match(/^\[([\w-]+)\^="([^"]*)"\]$/);
  if (batDau) return node.attributes.some((a) => a.name === batDau[1] && a.value.startsWith(batDau[2]));
  const bang = token.match(/^\[([\w-]+)="([^"]*)"\]$/);
  if (bang) return node.attributes.some((a) => a.name === bang[1] && a.value === bang[2]);
  const tran = token.match(/^\[([\w-]+)\]$/);
  if (tran) return node.attributes.some((a) => a.name === tran[1]);
  return node.tagName === token.toUpperCase();
};
const tai = (nodes) => ({
  querySelectorAll(sel) {
    const tokens = tach(sel);
    return nodes.filter((x) => tokens.some((t) => khop(x, t)));
  }
});

const A = '[data-turn="assistant"]';
const U = '[data-turn="user"]';
const UNG_VIEN = ["pre", '[data-testid="writing-block-container"]'];

const THAN = "Rà lại docs/ARCHITECTURE.md của Prompt-Engineering và thay cách diễn đạt A/B/C.";
const TIEU_DE = "Refine Prompt Factory Architecture";
const CHIP = "Quy định rõ tiêu chí NO MATCH";

const canvas = (than = THAN) => n("div", { "data-testid": "writing-block-container" }, [
  n("div", { class: "pointer-events-none absolute inset-0" }, ""),
  n("div", { class: "relative z-[1]" }, [
    n("div", { "data-testid": "writing-block-header-sticky-container" }, [
      n("div", { "data-testid": "writing-block-header-surface" }, TIEU_DE)
    ]),
    n("div", { class: "mt4SwW_editor" }, [n("div", { class: "outline-none" }, than)])
  ]),
  n("div", { "data-testid": "writing-block-suggested-followups" }, CHIP),
  n("div", { class: "pointer-events-none absolute inset-0" }, "")
]);

/* ---- ca 1: canvas — lấy THÂN, không lấy tiêu đề, không lấy chip ---- */
{
  const luot = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [canvas()]);
  const r = readTurns(tai([luot]), A, U, 4, 20000, UNG_VIEN);
  const b = r.last_copy_block;
  assert.equal(b.found, true, "canvas PHẢI được nhận là một khối copy — `pre = 0` không có nghĩa là không có khối");
  assert.equal(b.text, THAN, "lấy đúng THÂN");
  assert.ok(!b.text.includes(TIEU_DE), "tiêu đề canvas KHÔNG được lọt vào prompt gửi đi");
  assert.ok(!b.text.includes(CHIP), "chip gợi ý KHÔNG được lọt vào — chuỗi chuyển tiếp nguyên văn, rác vào đây là rác bay sang lượt sau");
  assert.equal(b.turn_id, "t1", "khối phải mang turn_id của lượt nó nằm trong");
  console.log("  ok  ① canvas: lấy thân, bỏ tiêu đề và chip gợi ý");
}

/* ---- ca 2: `pre` ở lượt CŨ không được thắng canvas ở lượt MỚI ----
   Đây là ca mà `resolveSelector` hỏi cả trang sẽ hỏng: nó thấy `pre` tồn tại ở đâu đó, chọn
   `"pre"`, rồi không khớp gì trong khung mới và báo "không có khối". Hội thoại pha cả hai kiểu
   là chuyện thường. */
{
  const cu = n("div", { "data-turn": "assistant", "data-turn-id": "t0" }, [n("pre", {}, "khối mã của lượt CŨ")]);
  const moi = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [canvas()]);
  const r = readTurns(tai([cu, moi]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(r.last_copy_block.found, true, "lượt mới nhất dùng canvas thì phải đọc ra canvas");
  assert.equal(r.last_copy_block.text, THAN, "KHÔNG được lấy khối mã của lượt trước — đó là gửi lại đúng prompt cũ");
  assert.equal(r.last_copy_block.turn_id, "t1");
  console.log("  ok  ② `pre` ở lượt cũ không lấn canvas ở lượt mới");
}

/* ---- ca 3: VẾ NGƯỢC — `pre` vẫn phải thắng khi nó ở CHÍNH lượt mới nhất ----
   Thiếu vế này thì một đột biến "luôn chọn canvas" sẽ thoát, và mọi khối mã thật đọc ra rỗng. */
{
  const luot = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [
    n("pre", {}, "prompt trong khối mã"), canvas()
  ]);
  const r = readTurns(tai([luot]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(r.last_copy_block.text, "prompt trong khối mã",
    "`pre` đứng trước trong danh sách nên nó là ƯU TIÊN — thứ tự danh sách là thứ tự ưu tiên");
  console.log("  ok  ③ khối mã vẫn thắng khi có mặt trong chính lượt mới nhất");
}

/* ---- ca 4: không có khối nào thì vẫn là `found: false` ----
   `found: false` là điều kiện DỪNG tự nhiên của chuỗi, không phải lỗi. Đừng để bản vá canvas
   biến nó thành "luôn luôn tìm thấy gì đó". */
{
  const luot = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [n("p", {}, "văn xuôi thuần")]);
  const r = readTurns(tai([luot]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(r.last_copy_block.found, false, "không khối thì vẫn phải là false");
  assert.equal(r.last_copy_block.text, "");
  console.log("  ok  ④ không có khối thì vẫn nói là không có");
}

/* ---- ca 5: selector mục nát không được làm hỏng cả lượt đọc ---- */
{
  const luot = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [canvas()]);
  const r = readTurns(tai([luot]), A, U, 4, 20000, ["pre", '[data-testid="writing-block-container"]']);
  assert.equal(r.last_copy_block.found, true, "danh sách vẫn chạy qua được ứng viên thứ hai");
  console.log("  ok  ⑤ danh sách ứng viên đi hết, không dừng ở cái đầu");
}

console.log("canvas-block-smoke: xanh");

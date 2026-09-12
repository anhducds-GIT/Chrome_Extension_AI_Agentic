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
    querySelector(sel) { return node.querySelectorAll(sel)[0] || null; },
    /* `contains` LÀ THẬT, không phải trang trí. Phép lọc "khối lồng khối" trong `readTurns`
       gọi đúng hàm này; DOM giả thiếu nó thì phép lọc thành vô hiệu trong test, và đột biến
       "bỏ phép lọc" sẽ XANH — đã dính đúng thế một lượt. */
    contains(el) {
      if (el === node) return true;
      const di = (x) => x.children.some((c) => c === el || di(c));
      return di(node);
    }
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

/* ---- ca 3: KHỐI CUỐI CÙNG TỪ DƯỚI LÊN THẮNG, bất kể nó thuộc loại nào — B-86 ----
 *
 * Đức 13/09: *"copy nhầm block. Chỉ được copy block cuối cùng từ dưới lên thôi."*
 * Đo cùng lúc trên lượt trả lời thật của anh: 4 khối mã + 1 canvas trong CÙNG một lượt. Bản
 * trước coi thứ tự danh sách selector là thứ tự ưu tiên, nên nó lấy khối mã thứ tư và không
 * bao giờ nhìn tới canvas — gửi đi một khối GIỮA BÀI.
 *
 * Ca này ghim CẢ HAI CHIỀU trong cùng một khối: đảo vị trí thì đáp án đảo theo. Chỉ ghim một
 * chiều thì một đột biến "luôn chọn canvas" hoặc "luôn chọn khối mã" đều thoát.
 */
{
  const boc = (con) => n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, con);

  // canvas đứng SAU ⇒ canvas thắng
  const sauLaCanvas = readTurns(tai([boc([n("pre", {}, "khối mã ở giữa bài"), canvas()])]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(sauLaCanvas.last_copy_block.text, THAN,
    "canvas nằm CUỐI thì canvas thắng — dù khối mã đứng trước trong danh sách selector");

  // khối mã đứng SAU ⇒ khối mã thắng
  const sauLaPre = readTurns(tai([boc([canvas(), n("pre", {}, "khối mã ở cuối bài")])]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(sauLaPre.last_copy_block.text, "khối mã ở cuối bài",
    "khối mã nằm CUỐI thì khối mã thắng — ưu tiên là VỊ TRÍ, không phải loại");

  // bốn khối mã + canvas cuối, đúng hình dạng lượt trả lời thật của Đức 13/09
  const nhuThat = readTurns(tai([boc([
    n("pre", {}, "mã 1"), n("pre", {}, "mã 2"), n("pre", {}, "mã 3"), n("pre", {}, "mã 4"), canvas()
  ])]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(nhuThat.last_copy_block.text, THAN,
    "4 khối mã + canvas cuối: phải lấy canvas — đây đúng ca Đức bắt được 13/09");

  /* LỒNG NHAU: một khối mã NẰM TRONG thân canvas cũng khớp, và nó đứng SAU canvas trên trang.
     Lấy nó là lấy một MẢNH của khối. Phải giữ cái ngoài cùng. */
  const long = n("div", { "data-turn": "assistant", "data-turn-id": "t1" }, [
    n("div", { "data-testid": "writing-block-container" }, [
      n("div", { "data-testid": "writing-block-header-sticky-container" }, TIEU_DE),
      n("div", { class: "mt4SwW_editor" }, [n("pre", {}, "mảnh bên trong canvas")])
    ])
  ]);
  const rLong = readTurns(tai([long]), A, U, 4, 20000, UNG_VIEN);
  assert.equal(rLong.last_copy_block.text, "mảnh bên trong canvas",
    "khối lồng khối: lấy cái NGOÀI CÙNG (canvas), và thân nó chính là mảnh bên trong — không lấy riêng mảnh");
  assert.ok(!rLong.last_copy_block.text.includes(TIEU_DE), "và vẫn bóc vỏ");

  console.log("  ok  ③ khối CUỐI CÙNG từ dưới lên thắng, bất kể loại · khối lồng khối lấy cái ngoài cùng");
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

/* ---- ca 6: DÂY NỐI TỚI ADAPTER ----
 * Năm ca trên truyền danh sách selector vào TẬN TAY `readTurns`, nên chúng kiểm CƠ CHẾ mà
 * không kiểm việc cơ chế ấy có được nối dây hay không. Đột biến kiểm bắt đúng khe đó: gỡ
 * `writing-block-container` khỏi adapter thì cả năm ca vẫn xanh, trong khi bộ chạy thật mù
 * trở lại y như trước khi sửa. Đây là hình dạng lỗi đã sống một tuần trong repo này:
 * `articleSample: []` nằm cạnh `assistantCount: 7` — mù một nửa mà tự báo khoẻ. */
{
  const adapter = fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
  const iKhoi = adapter.indexOf("answerBlock: Object.freeze([");
  assert.ok(iKhoi > 0, "adapter vẫn khai `answerBlock`");
  const danhSach = adapter.slice(iKhoi, adapter.indexOf("]),", iKhoi));
  assert.match(danhSach, /writing-block-container/,
    "adapter PHẢI khai selector canvas — không khai thì bộ đọc mù với canvas, và năm ca trên vẫn xanh vì chúng tự truyền selector");
  assert.match(danhSach, /"pre"/, "và vẫn phải giữ khối mã");
  /* THỨ TỰ TRONG DANH SÁCH KHÔNG CÒN LÀ ƯU TIÊN — B-86. Bản trước ghim ngược lại
     (*"`pre` đứng trước nên nó ưu tiên"*), và chính cái luật ấy làm chuỗi gửi đi một khối giữa
     bài: 4 khối mã + 1 canvas trong cùng lượt, nó lấy khối mã thứ tư. Ưu tiên là VỊ TRÍ TRÊN
     TRANG, và `readTurns` cưỡng chế điều đó bằng cách hỏi cả danh sách trong MỘT lượt
     `querySelectorAll` — hàm ấy trả về theo thứ tự trang, không theo thứ tự token.
     Danh sách giờ chỉ còn nghĩa: "những thứ được TÍNH là khối". */
  assert.ok(!/aria-label/.test(danhSach),
    "KHÔNG neo vào aria-label: nhãn tiếng Anh chết ngay lượt Đức đổi ngôn ngữ giao diện");

  /* Và `answerBlockSelector` phải CHUYỂN CẢ DANH SÁCH xuống, không phân giải sẵn một cái —
     phân giải sẵn là hỏi `document`, tức hỏi cả trang. */
  assert.match(content, /function answerBlockSelector\(\)\s*\{\s*return Array\.isArray\(SEL\.answerBlock\)/,
    "`answerBlockSelector` phải trả cả danh sách cho `readTurns` tự thử trong khung");
  console.log("  ok  ⑥ dây nối: adapter khai CẢ HAI loại khối, danh sách xuống tới readTurns (thứ tự KHÔNG phải ưu tiên)");
}

console.log("canvas-block-smoke: xanh");

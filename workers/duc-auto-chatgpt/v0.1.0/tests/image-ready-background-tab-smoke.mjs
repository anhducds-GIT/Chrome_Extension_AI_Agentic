/* B-47 · Ảnh sinh trên TAB NỀN phải NHẬN ĐƯỢC, không cần bitmap giải mã xong.
 *
 * ĐO LIVE 2026-09-09 trên job ảnh thật, tab `visibilityState: "hidden"`:
 *
 *     +80,7s   <img> mới hiện · complete=false · naturalWidth=0 · rect 480x360 · src https
 *     +140,7s  ChatGPT sinh XONG (nút Dừng biến mất) · vẫn complete=false / 0px
 *     +201,0s  vẫn complete=false / 0px
 *
 * Nên điều kiện cũ `ready = complete && naturalWidth > 0` là thứ Chrome CỐ Ý không cấp cho
 * tab nền. Job chết `OUTPUT_DETECTION_TIMEOUT: NO_NEW_IMAGE` trong khi ảnh nằm ngay đó.
 *
 * VÀ ĐÂY LÀ ĐIỀU QUAN TRỌNG NHẤT VỀ HÌNH DẠNG BẢN VÁ: không được chữa bằng một con số chờ
 * to hơn. Đức chốt 09/09 — *"thời gian kết xuất ra ảnh sẽ dài ngắn khác nhau, tuỳ thuộc vào
 * độ phức tạp… đừng fix sẵn một con số"*. Và số đo nói mạnh hơn thế: chờ bao lâu cũng không
 * xong, vì Chrome hoãn HẲN chứ không chậm. Cửa ra là ĐIỀU KIỆN, không phải ĐỒNG HỒ.
 *
 * Điều kiện mới: `src` là URL nội dung CUỐI (`https:` hoặc `data:image/`). Đo được là nó ổn
 * định qua cả bốn lượt trải ~2 phút, kể cả khi `alt` còn đang điền dần. `blob:` KHÔNG được
 * hưởng nhánh này — blob là hình dạng của ảnh tạm và thu hồi được, nên với blob vẫn đòi giải
 * mã xong: fail CLOSED ở đúng chỗ đáng nghi.
 *
 * File này CẮT `imageCandidates()` đã ship ra khỏi `content.js` rồi CHẠY nó.
 *
 * TRẦN TUYÊN BỐ: phần tử `<img>` giả, không phải chatgpt.com. Nó ghim LUẬT phân loại; nó
 * không chứng minh ChatGPT sẽ giữ `src` ổn định mãi. Cái đó `dom_probe` canh, và mốc nền +
 * cửa sổ "tập ảnh đứng yên" là thứ chặn nếu `src` đổi giữa chừng. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

const startAnchor = "  function imageCandidates(root = conversationRoot()";
const endAnchor = "  function referenceEvidence(referenceImages) {";
const start = content.indexOf(startAnchor);
const end = content.indexOf(endAnchor);
assert.ok(start > 0, "content.js còn định nghĩa `imageCandidates` — nếu nó dời chỗ thì phép ghim này phải đi theo, KHÔNG được xoá");
assert.ok(end > start, "`imageCandidates` còn đứng trên `referenceEvidence`");
const block = content.slice(start, end);

/* Ngưỡng 64px là KÍCH THƯỚC, không phải đồng hồ — nó vẫn đúng và vẫn ở đó. Nhưng phép phân
   loại không được nhìn THỜI GIAN: vá bằng "chờ lâu hơn" là hình dạng Đức đã bác, và số đo
   cũng bác (chờ 201 giây vẫn `complete=false`). */
assert.ok(!/setTimeout|Date\.now\(\)|performance\.now\(\)/.test(block), "phân loại ảnh không được nhìn ĐỒNG HỒ — điều kiện, không phải thời gian");

const chay = vm.runInNewContext(
  `(function (deps) {\n`
  + `const { assistantSelector, userSelector, SEL, nodeId, shortHash, isVisible } = deps;\n`
  + block
  + `\nreturn imageCandidates;\n})`
);

/* ---- <img> giả, đúng những gì hàm này hỏi ------------------------------- */
function anh({ src, complete, naturalWidth, w = 480, h = 360, vaiTro = "assistant", alt = "Generated image: X" }) {
  const node = {
    src, currentSrc: src, complete, naturalWidth, alt,
    getBoundingClientRect: () => ({ width: w, height: h }),
    getAttribute: () => null,
    closest(sel) {
      if (sel === "ASSISTANT") return vaiTro === "assistant" ? { __turn: "t1" } : null;
      if (sel === "USER") return vaiTro === "user" ? { __turn: "t0" } : null;
      if (sel === "ATTACH") return null;      // không nằm trong khung đính kèm
      return null;
    },
  };
  return node;
}
const deps = {
  assistantSelector: () => "ASSISTANT",
  userSelector: () => "USER",
  SEL: { attachmentContainer: "ATTACH" },
  nodeId: (el, loai) => (el ? `${loai}-x` : ""),
  shortHash: (s) => `h(${String(s).slice(-8)})`,
  isVisible: () => true,
};
const imageCandidates = chay(deps);
const chay1 = (im) => imageCandidates({ querySelectorAll: () => [im] }, { sources: new Set(), names: new Set() })[0];

const URL_CUOI = "https://chatgpt.com/backend-api/estuary/content?id=file_00000000466882";

/* ---- ca 1: CHÍNH CA ĐANG HỎNG — tab nền, chưa giải mã ------------------- */
const tabNen = chay1(anh({ src: URL_CUOI, complete: false, naturalWidth: 0 }));
assert.equal(tabNen.decoded, false, "phải GIỮ sự thật: bitmap chưa giải mã. Mất trường này là mất chính phép đo");
assert.equal(tabNen.visible, true, "khung 480x360 đã bố trí xong nên vẫn nhìn thấy được");
assert.equal(tabNen.input, false, "ảnh của assistant, không phải ảnh đính kèm");
assert.equal(tabNen.ready, true, "ĐÂY là phép khẳng định mã cũ KHÔNG thể vượt: tab nền, complete=false, naturalWidth=0, mà src đã là URL cuối → nhận được");

/* ---- ca 2: blob chưa giải mã — PHẢI fail CLOSED ------------------------ */
const blobChua = chay1(anh({ src: "blob:https://chatgpt.com/9f2c-tam", complete: false, naturalWidth: 0 }));
assert.equal(blobChua.ready, false, "blob chưa giải mã thì KHÔNG nhận — blob là hình dạng ảnh tạm và thu hồi được");

/* ---- ca 3: blob đã giải mã thì vẫn nhận (không siết chặt hơn trước) ---- */
const blobRoi = chay1(anh({ src: "blob:https://chatgpt.com/9f2c-tam", complete: true, naturalWidth: 1024 }));
assert.equal(blobRoi.ready, true, "blob đã giải mã vẫn nhận như cũ — bản vá NỚI, không siết");

/* ---- ca 4: data:image cũng là địa chỉ cuối ---------------------------- */
const dataUrl = chay1(anh({ src: "data:image/png;base64,iVBORw0KGgo=", complete: false, naturalWidth: 0 }));
assert.equal(dataUrl.ready, true, "data:image là bytes nằm ngay trong địa chỉ — không cần giải mã mới lấy được");

/* ---- ca 5: ảnh bé (avatar) vẫn bị loại bởi `visible` ------------------ */
const avatar = chay1(anh({ src: "https://cdn.auth0.com/avatars/an.png", complete: true, naturalWidth: 120, w: 24, h: 24 }));
assert.equal(avatar.ready, true, "avatar cũng 'lấy được'…");
assert.equal(avatar.visible, false, "…nhưng ngưỡng 64px vẫn loại nó. Bản vá KHÔNG đụng lớp chắn này");

/* ---- ca 6: ảnh của người dùng vẫn là input --------------------------- */
const cuaNguoi = chay1(anh({ src: URL_CUOI, complete: false, naturalWidth: 0, vaiTro: "user" }));
assert.equal(cuaNguoi.input, true, "ảnh trong lượt của người dùng vẫn bị đánh dấu input — lớp chắn quy thuộc còn nguyên");
assert.equal(cuaNguoi.role, "user");

/* ---- ca 7: nguồn lạ vẫn bị lọc thẳng --------------------------------- */
const la = imageCandidates({ querySelectorAll: () => [anh({ src: "ftp://a/b.png", complete: true, naturalWidth: 500 })] }, { sources: new Set(), names: new Set() });
assert.equal(la.length, 0, "chỉ https / data:image / blob mới vào danh sách ứng viên");

console.log("image ready on background tab (B-47): PASS");

// Nhận diện video trên nhà mới — và vì sao KHÔNG được nhận theo địa chỉ.
//
// Đo thật 2026-09-06 (`evidence/F31-dom-probe-sau-va-20260906.json`): nhà mới
// không còn thẻ `<video>` nào (`video => 0`). Video hiện ra bằng ảnh đại diện
// `<img>` nằm trong `<flow-video-tile>`.
//
// CHỖ SUÝT SAI: ảnh Đức TẢI LÊN dùng **cùng một dạng địa chỉ**
// (`flow.google.com/asb/<mã>`) và cũng nằm trong một tile — chỉ khác thẻ bọc là
// `<flow-image-tile>`. Nhận theo địa chỉ là ghi nhầm ảnh đầu vào thành video
// đầu ra, đúng loại lỗi quy kết mà cả lớp bằng chứng sinh ra để chặn.
//
// Phép kiểm này đọc THẲNG bằng chứng để chứng minh cái bẫy còn đó, thay vì tin
// vào một câu chú thích có thể đã cũ.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const ctx = { window: {}, URL };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"), ctx);
const ADAPTER = ctx.window.DacProviderAdapter;

/* ---- 1. Cái bẫy có thật, đọc từ bằng chứng ------------------------------- */

const probe = JSON.parse(fs.readFileSync(new URL("../evidence/F31-dom-probe-sau-va-20260906.json", import.meta.url), "utf8"));
const images = probe.result.images;
const boc = (im) => (im.chain || "").split(" > ")[1] || "";
const anhVideo = images.filter((im) => boc(im) === "flow-video-tile");
const anhNguoiDung = images.filter((im) => boc(im) === "flow-image-tile");

assert.ok(anhVideo.length > 0, "bằng chứng phải có ảnh đại diện video");
assert.ok(anhNguoiDung.length > 0, "bằng chứng phải có ảnh người dùng — nó chính là cái bẫy");
// Đây là câu quan trọng nhất của cả file: hai loại KHÔNG phân biệt được bằng địa chỉ.
const dangChung = (src) => new URL(src).origin + "/" + new URL(src).pathname.split("/")[1];
assert.equal(dangChung(anhVideo[0].srcHead), dangChung(anhNguoiDung[0].srcHead),
  "nếu hai loại ảnh đã khác dạng địa chỉ thì phép kiểm này hết lý do tồn tại — đọc lại bằng chứng trước khi nới selector");

/* ---- 2. Selector phải NEO vào thẻ bọc ----------------------------------- */

const sel = String(ADAPTER.SELECTORS.videoSelector);
assert.ok(sel.includes("flow-video-tile"), "selector phải neo vào <flow-video-tile>");
assert.ok(!/(^|,)\s*img\s*(,|$)/.test(sel), "selector không được bắt mọi <img> trên trang");
assert.ok(!sel.includes("asb"), "không được nhận theo địa chỉ: ảnh người dùng có cùng dạng địa chỉ");
assert.ok(!sel.includes("flow-image-tile"), "tuyệt đối không nhận ảnh trong <flow-image-tile>");
// alt là chữ cho người đọc nên nó bị dịch theo ngôn ngữ — đúng cái bẫy của F-32.
assert.ok(!/alt\s*[=~*^$|]/.test(sel), "không được dùng alt làm điều kiện: alt bị dịch theo ngôn ngữ");
assert.ok(sel.includes("video,") || sel.startsWith("video"), "phải giữ nhánh <video> của nhà cũ");

/* ---- 3. Lấy id: hai nhà, và từ chối mọi thứ khác ------------------------- */

const NHAN = [
  [anhVideo[0].srcHead, anhVideo[0].srcHead.split("/asb/")[1]],
  ["https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=e4084409-8678-4d37-9ee0-d3f1f3fcdc92", "e4084409-8678-4d37-9ee0-d3f1f3fcdc92"],
];
for (const [src, mong] of NHAN) {
  assert.equal(ADAPTER.videoIdFromSrc(src), mong, `phải lấy được id từ: ${src}`);
}

const TU_CHOI = [
  "https://flow.google.com/asb/",                 // thiếu mã
  "https://flow.google.com/asb/a/b",              // nhiều đoạn: thứ khác
  "https://flow.google.com/project/abc",          // không phải media
  "https://evil.com/asb/AB-nOU",                  // host lạ
  "https://flow.google.com.evil.com/asb/AB-nOU",  // host lạ đội lốt
  "https://lh3.googleusercontent.com/ogw/AF2bZy", // ảnh đại diện tài khoản
  "",
];
for (const src of TU_CHOI) {
  assert.equal(ADAPTER.videoIdFromSrc(src), null, `phải từ chối: ${JSON.stringify(src)}`);
}

// Mã của 13 ảnh đại diện phải KHÁC NHAU đôi một — trùng mã nghĩa là mã không
// dùng làm định danh được, và cả lớp quy kết sụp theo mà không báo gì.
const ids = anhVideo.map((im) => ADAPTER.videoIdFromSrc(im.srcHead));
assert.ok(ids.every(Boolean), "mọi ảnh đại diện video phải lấy được id");
assert.equal(new Set(ids).size, ids.length, "id của các video phải khác nhau đôi một");

// Và ảnh người dùng — nếu lọt qua selector thì nó CŨNG lấy được id. Đó chính là
// lý do lớp chặn phải là selector, không phải hàm này.
assert.ok(ADAPTER.videoIdFromSrc(anhNguoiDung[0].srcHead),
  "ảnh người dùng cũng lấy được id — nên thứ chặn nó phải là selector neo vào thẻ bọc, không phải hàm lấy id");

console.log(`flow-video-detection-new-home: OK (${anhVideo.length} video / ${anhNguoiDung.length} ảnh người dùng, cùng dạng địa chỉ)`);

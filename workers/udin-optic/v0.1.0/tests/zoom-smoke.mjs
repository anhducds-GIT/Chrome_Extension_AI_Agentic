/* zoom-smoke.mjs — phép ghim của HAI hàng nút phóng to (`U1` cỡ chữ, `U2` thu phóng trang).
 *
 * BA TẦNG, cố ý, vì mỗi tầng bắt một loại lỗi khác nhau:
 *   ⓐ gọi HÀM THẬT trong `scripts/zoom-core.mjs` — đo được kết quả, không chỉ đọc chữ.
 *   ⓑ ghim TĨNH trên HTML/CSS — hàng nút và mức trong mã phải khớp nhau, không lệch âm thầm.
 *   ⓒ TRÍCH đúng khối thật ra khỏi `sidepanel.js` rồi CHẠY trong `node:vm` — đột biến vào
 *     bảng bên làm file này đỏ. Mẫu lấy từ `duc-auto-gemini/v0.2.0/tests/zoom-control-smoke.mjs`,
 *     nơi bản trước đó đã chết vì tự chép lại logic vào chính file test.
 *
 * Neo trích hỏng thì phép ghim ⓒ thành vô nghĩa mà vẫn xanh — nên neo hỏng phải NỔ.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {
  MUC_ZOOM_UI, MUC_ZOOM_WEB, KHOA_ZOOM_UI, SAI_SO_ZOOM, MIEN_UDIN,
  chuanHoaZoomUi, trungMuc, xetTabDangXem
} from "../scripts/zoom-core.mjs";

const goc = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", goc), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", goc), "utf8");
const nguon = fs.readFileSync(new URL("sidepanel.js", goc), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", goc), "utf8"));

/* ═══ ⓐ LÕI THUẦN — gọi hàm thật ═══════════════════════════════════════════ */

for (const muc of MUC_ZOOM_UI) assert.equal(chuanHoaZoomUi(muc), muc, `mức ${muc} phải giữ nguyên`);
assert.equal(chuanHoaZoomUi("1.1"), 1.1, "chuỗi số từ `dataset` phải dùng được — HTML chỉ đưa ra chuỗi");
for (const xau of [0.8, 1.5, 2, 0, -1, null, undefined, NaN, "to len", "", {}, []]) {
  assert.equal(chuanHoaZoomUi(xau), 1, `giá trị lạ (${JSON.stringify(xau)}) phải rơi về 100%, không được ném`);
}
/* Cỡ chữ CHỈ đi lên, thu phóng trang CHỈ đi xuống — xem đầu `zoom-core.mjs`. Ghim luôn
 * hướng đi, vì đây là quyết định thiết kế chứ không phải một mảng số ngẫu nhiên. */
assert.ok(MUC_ZOOM_UI.every((m) => m >= 1), "cỡ chữ bảng bên không được xuống dưới 100% (nền 11.5px)");
assert.ok(MUC_ZOOM_WEB.every((m) => m <= 1), "thu phóng trang không được lên trên 100%");

assert.equal(trungMuc(1.2, 1.2), true);
assert.equal(trungMuc(1.2 - SAI_SO_ZOOM / 2, 1.2), true, "lệch trong sai số vẫn là trúng");
assert.equal(trungMuc(1.2 + SAI_SO_ZOOM * 2, 1.2), false, "lệch ngoài sai số là trượt");
assert.equal(trungMuc(NaN, 1.2), false);
assert.equal(trungMuc(1.2, NaN), false);
/* Sai số phải NHỎ HƠN khoảng cách giữa hai mức liền nhau, nếu không một mức trúng luôn cả
 * hai nút và hai nút cùng sáng. Khoảng nhỏ nhất hiện nay là 0,1. */
const khoangNhoNhat = Math.min(...[...MUC_ZOOM_UI, ...MUC_ZOOM_WEB]
  .sort((a, b) => a - b).slice(1).map((m, i) => m - [...MUC_ZOOM_UI, ...MUC_ZOOM_WEB].sort((a, b) => a - b)[i])
  .filter((d) => d > 0));
assert.ok(SAI_SO_ZOOM * 2 < khoangNhoNhat, `sai số ${SAI_SO_ZOOM} quá lớn so với khoảng cách mức ${khoangNhoNhat}`);

/* ─── Lớp an toàn của `U2` nằm ở ĐƯỜNG ĐỌC (`G-95`) ───────────────────────
 * `setZoom` KHÔNG bị `host_permissions` chặn: nó phóng to được cả tab ngoài quyền. Thứ duy
 * nhất ngăn Udin phóng nhầm là `tab.url` bị Chrome giấu. Nên nhánh "không có url" phải TỪ
 * CHỐI — nó là cái khoá, không phải một trường hợp lạ. */
assert.equal(xetTabDangXem(null).dung, false, "không có tab thì không zoom");
assert.equal(xetTabDangXem({ id: 7 }).dung, false, "KHÔNG đọc được url thì KHÔNG zoom — đây là cái khoá");
assert.match(xetTabDangXem({ id: 7 }).vi, /giấu địa chỉ/, "lý do phải nói ra vì sao, không được câm");
assert.equal(xetTabDangXem({ id: 7, url: "" }).dung, false, "url rỗng cũng là không đọc được");
assert.equal(xetTabDangXem({ id: 7, url: "khong-phai-url" }).dung, false);
assert.equal(xetTabDangXem({ id: 7, url: "https://vi.wikipedia.org/wiki/X" }).dung, false, "tên miền khác thì từ chối");
assert.equal(xetTabDangXem({ id: 7, url: `https://${MIEN_UDIN}/canvas` }).dung, true);
assert.equal(xetTabDangXem({ id: 0, url: `https://${MIEN_UDIN}/` }).dung, true, "tab số 0 là tab hợp lệ, không phải giá trị rỗng");
/* Tên miền phải khớp ĐÚNG, không phải "có chứa": `vinfast.udinbv.com.ke-gia.net` là miền của
 * người khác và `String.includes` sẽ nhận nhầm nó. */
assert.equal(xetTabDangXem({ id: 7, url: `https://${MIEN_UDIN}.ke-gia.net/` }).dung, false,
  "tên miền giả có chứa tên miền thật phải bị từ chối");
for (const t of [{ id: 7 }, { id: 7, url: "https://vi.wikipedia.org/" }, null]) {
  assert.ok(xetTabDangXem(t).vi.length > 0, "mọi lần từ chối đều phải kèm một câu đọc được");
}
assert.equal(new Set([
  xetTabDangXem(null).vi,
  xetTabDangXem({ id: 7 }).vi,
  xetTabDangXem({ id: 7, url: "khong-phai-url" }).vi,
  xetTabDangXem({ id: 7, url: "https://vi.wikipedia.org/" }).vi
]).size, 4, "bốn nguyên nhân phải ra BỐN câu khác nhau — một nút xám câm không chẩn đoán được từ xa");

/* ═══ ⓑ GHIM TĨNH — hàng nút và mức trong mã phải khớp nhau ════════════════ */

const mucTrongHtml = [...html.matchAll(/data-ui-zoom="([\d.]+)"/g)].map((m) => Number(m[1]));
assert.deepEqual(mucTrongHtml, [...MUC_ZOOM_UI],
  "mỗi mức trong `MUC_ZOOM_UI` phải có ĐÚNG một nút, đúng thứ tự — thêm mức mà quên nút thì Đức không bấm được");
for (const muc of MUC_ZOOM_UI) {
  assert.match(html, new RegExp(`data-ui-zoom="${muc}"[^>]*>${Math.round(muc * 100)}%</button>`),
    `nút ${muc} phải ghi nhãn ${Math.round(muc * 100)}%`);
}
const mucWebTrongHtml = [...html.matchAll(/data-web-zoom="([\d.]+)"/g)].map((m) => Number(m[1]));
assert.deepEqual(mucWebTrongHtml, [...MUC_ZOOM_WEB],
  "mỗi mức trong `MUC_ZOOM_WEB` phải có ĐÚNG một nút, đúng thứ tự");
/* Ba nút thu phóng trang ship ở trạng thái TẮT. Sân khấu bên dưới dựng đúng theo dòng này,
 * và đó là lý do đột biến xoá `moZoomWeb()` bị bắt: nếu chúng khởi đầu ở trạng thái BẬT
 * thì "sau khi đồng bộ thì bấm được" đúng sẵn mà không cần ai mở khoá. */
assert.equal([...html.matchAll(/<button[^>]*data-web-zoom="[\d.]+"[^>]*disabled[^>]*>/g)].length, MUC_ZOOM_WEB.length,
  "cả ba nút thu phóng trang phải ship ở trạng thái TẮT — chúng chỉ mở sau khi đọc được một tab Udin thật");
assert.match(html, /id="zoom-web-nhom"/, "cụm phải có id — đó là chỗ gắn lý do khi nút xám");

assert.match(css, /--udin-ui-zoom:\s*1;/, "biến cỡ chữ phải có giá trị gốc trên `:root`");
assert.match(css, /^main \{[^}]*zoom: var\(--udin-ui-zoom\)/m, "`main` phải thật sự dùng biến đó");
assert.doesNotMatch(css, /transform:\s*scale\(var\(--udin-ui-zoom\)/,
  "`transform: scale` chỉ phóng ảnh đã vẽ nên nó tràn ngang khung hẹp — phải là `zoom`");

/* ─── Phím phanh in trên bảng bên phải là phím THẬT của gói này ───────────
 * Bảng bên chép từ Scouter và in `Ctrl + Shift + X`, trong khi manifest gói này khai
 * `Ctrl+Shift+U`. Đó là một dòng chữ bảo Đức bấm một phím KHÔNG TỒN TẠI, ở đúng chỗ nói
 * "thấy lạ thì bấm cái này". Ghim từ manifest chứ không gõ tay, để hai đầu không lệch lại. */
const phimThat = manifest.commands?.["dung-khan"]?.suggested_key?.default;
assert.ok(phimThat, "manifest phải khai phím dừng khẩn");
const phimDep = phimThat.replace(/\+/g, " + ");
assert.ok(html.includes(phimDep) || html.includes(phimThat),
  `bảng bên phải in phím phanh thật (${phimThat}), không in phím của gói khác`);
assert.doesNotMatch(html, /Ctrl\s*\+\s*Shift\s*\+\s*X/,
  "bảng bên không được in phím phanh của Scouter — hai gói CỐ Ý khác phím");

/* ═══ ⓒ CHẠY KHỐI THẬT trong `node:vm` ═════════════════════════════════════ */

const neoDoLop = /function doLop\([\s\S]*?\n/.exec(nguon);
assert.ok(neoDoLop, "neo `doLop` hỏng — phép ghim ⓒ sẽ chạy trên một hàm giả mà vẫn xanh");
const neoKhoi = /const nutZoomUi = [\s\S]*?\nkhoiPhucZoomUi\(\);\n/.exec(nguon);
assert.ok(neoKhoi, "neo khối cỡ chữ hỏng — sửa `sidepanel.js` thì phải sửa neo này, đừng xoá khẳng định");

function nutGia(muc) {
  const nut = { dataset: { uiZoom: muc }, chon: false, nghe: null };
  nut.classList = { toggle: (lop, bat) => { if (lop === "chon") nut.chon = Boolean(bat); } };
  nut.addEventListener = (loai, fn) => { if (loai === "click") nut.nghe = fn; };
  return nut;
}

/** Dựng sân khấu rồi nạp ĐÚNG khối thật vào. `luu` là thứ kho lưu trả về. */
function sanKhau({ luu = undefined, khoHong = false } = {}) {
  const nut = MUC_ZOOM_UI.map((m) => nutGia(String(m)));
  const bien = {};
  const daGhi = [];
  const ctx = vm.createContext({
    console,
    /* Hàm THẬT từ `zoom-core.mjs`, không phải bản giả: `sidepanel.js` lấy nó bằng `import`
       nằm ngoài khối được trích, nên sân khấu phải bơm vào. Bơm bản giả ở đây là tự
       viết lại logic trong file test — đúng cái bệnh giết phiên bản trước của mẫu Gemini. */
    chuanHoaZoomUi,
    KHOA_ZOOM_UI,
    document: {
      querySelectorAll: (chon) => (chon === ".zoom-nut[data-ui-zoom]" ? nut : []),
      documentElement: { style: { setProperty: (ten, gia) => { bien[ten] = gia; } } }
    },
    chrome: {
      storage: {
        local: {
          get: async () => { if (khoHong) throw new Error("kho luu hong"); return luu === undefined ? {} : { [KHOA_ZOOM_UI]: luu }; },
          set: async (o) => { daGhi.push(o); }
        }
      }
    }
  });
  vm.runInContext(neoDoLop[0], ctx);
  vm.runInContext(neoKhoi[0], ctx);
  return { nut, bien, daGhi };
}

const cho = () => new Promise((r) => setTimeout(r, 0));

/** Kho lưu nhận đúng MỘT lượt ghi, đúng khoá, và giá trị là SỐ chứ không phải chuỗi. */
function ghiDung(daGhi, mong, chu = "ghi ĐÚNG một lần, đúng khoá, đúng SỐ") {
  assert.equal(daGhi.length, 1, chu);
  assert.deepEqual(Object.keys(daGhi[0]), [KHOA_ZOOM_UI], chu);
  assert.equal(typeof daGhi[0][KHOA_ZOOM_UI], "number", chu + " — kho lưu giữ chuỗi thì lần mở sau không khớp nút nào");
  assert.equal(daGhi[0][KHOA_ZOOM_UI], mong, chu);
}

/* ⑴ Kho lưu có mức đã chọn → bảng bên mở lại ĐÚNG mức đó. Đây chính là câu "cỡ chữ sống
 *    qua một lượt đóng/mở bảng bên": bảng bên đóng là chết, mở lại là chạy lại khối này. */
{
  const s = sanKhau({ luu: 1.2 });
  await cho();
  assert.equal(s.bien["--udin-ui-zoom"], "1.2", "mở lại bảng bên phải khôi phục mức đã lưu");
  assert.deepEqual(s.nut.map((n) => n.chon), [false, false, true], "đúng một nút sáng, và là nút đang dùng");
}

/* ⑵ Chưa lưu gì → 100%. */
{
  const s = sanKhau();
  await cho();
  assert.equal(s.bien["--udin-ui-zoom"], "1");
  assert.deepEqual(s.nut.map((n) => n.chon), [true, false, false]);
}

/* ⑶ Kho lưu HỎNG → vẫn 100%, không ném. Một tiện nghi không được làm chết cả bảng. */
{
  const s = sanKhau({ khoHong: true });
  await cho();
  assert.equal(s.bien["--udin-ui-zoom"], "1", "kho lưu hỏng thì về mặc định, không để trống");
}

/* ⑷ Kho lưu chứa RÁC (người sửa tay, hoặc phiên bản cũ) → chuẩn hoá về 100%. */
{
  const s = sanKhau({ luu: "to that to" });
  await cho();
  assert.equal(s.bien["--udin-ui-zoom"], "1");
}

/* ⑸ Bấm nút → đổi ngay VÀ ghi xuống kho lưu đúng khoá. */
{
  const s = sanKhau();
  await cho();
  s.nut[1].nghe();
  await cho();
  assert.equal(s.bien["--udin-ui-zoom"], "1.1", "bấm 110% phải đổi biến ngay");
  assert.deepEqual(s.nut.map((n) => n.chon), [false, true, false]);
  /* KHÔNG dùng `deepStrictEqual` ở đây: object này sinh BÊN TRONG vm nên prototype của nó
     thuộc realm khác, và phép so sẽ đỏ với hai giá trị in ra giống hệt nhau. */
  ghiDung(s.daGhi, 1.1);
}

/* ⑹ Nút mang giá trị rác thì kho lưu KHÔNG được nhận giá trị rác — chuẩn hoá phải xảy ra
 *    TRƯỚC khi ghi, nếu không lần mở sau đọc lên một mức không có nút nào. */
{
  const s = sanKhau();
  await cho();
  s.nut[2].dataset.uiZoom = "9";
  s.nut[2].nghe();
  await cho();
  ghiDung(s.daGhi, 1, "giá trị rác phải được chuẩn hoá TRƯỚC khi ghi xuống kho lưu");
  assert.equal(s.bien["--udin-ui-zoom"], "1");
}

/* ═══ ⓓ THU PHÓNG TRANG — chạy khối thật với Chrome giả ════════════════ */

const neoWeb = /const nutZoomWeb = [\s\S]*?\nveZoomWeb\(\);\n/.exec(nguon);
assert.ok(neoWeb, "neo khối thu phóng trang hỏng — tầng ⓓ sẽ không chạy gì mà vẫn xanh");

function nutWebGia(muc) {
  const nut = { dataset: { webZoom: muc }, chon: false, disabled: true, title: "", nghe: null };
  nut.classList = { toggle: (lop, bat) => { if (lop === "chon") nut.chon = Boolean(bat); } };
  nut.addEventListener = (loai, fn) => { if (loai === "click") nut.nghe = fn; };
  return nut;
}

/** `tabs === null` nghĩa là Chrome không có API tab. `cum.title` mang một lý do CŨ để kiểm
 *  xem đường tốt có dọn nó đi không. */
function sanKhauWeb({ tabs } = {}) {
  const nut = MUC_ZOOM_WEB.map((m) => nutWebGia(String(m)));
  const cum = { title: "Chưa dùng được — LÝ DO CŨ CHƯА ĐƯỢC DỌN" };
  const ctx = vm.createContext({
    console, URL, trungMuc, xetTabDangXem, MIEN_UDIN,
    document: {
      querySelectorAll: (chon) => (chon === ".zoom-nut[data-web-zoom]" ? nut : []),
      getElementById: (id) => (id === "zoom-web-nhom" ? cum : null),
      documentElement: { style: { setProperty() {} } }
    },
    chrome: tabs === null ? {} : { tabs }
  });
  vm.runInContext(neoDoLop[0], ctx);
  vm.runInContext(neoWeb[0], ctx);
  return { nut, cum };
}

const tabTot = { id: 101, url: `https://${MIEN_UDIN}/canvas` };

/* ⑰ Đường tốt: đọc được 90% thì mở khoá và đúng nút 90% sáng. */
{
  const s = sanKhauWeb({ tabs: { query: async () => [tabTot], getZoom: async () => 0.9, setZoom: async () => {} } });
  await cho();
  assert.ok(s.nut.every((n) => !n.disabled), "tab Udin thật thì ba nút phải mở");
  assert.deepEqual(s.nut.map((n) => n.chon), [false, true, false]);
  assert.equal(s.cum.title, "Thu phóng trang Udin", "đường tốt phải DỌN lý do cũ trên cụm");
}

/* ⑰b Mức THỰC hầu như không bao giờ đúng y con số trên nút: Đức chỉnh bằng Ctrl+cuộn thì
 * Chrome chốt theo thang riêng của nó, và ngay cả `setZoom(0.9)` cũng có thể đọc lại thành
 * 0,8999999999999999. So bằng `===` thì nút đúng KHÔNG BAO GIỜ sáng, mà cả ba nút vẫn bấm
 * được — hỏng êm. Khối này là thứ phân biệt `trungMuc` với `===`. */
{
  const s = sanKhauWeb({ tabs: { query: async () => [tabTot], getZoom: async () => 0.9 + SAI_SO_ZOOM / 2, setZoom: async () => {} } });
  await cho();
  assert.deepEqual(s.nut.map((n) => n.chon), [false, true, false],
    "mức lệch trong sai số vẫn phải làm sáng đúng nút — dùng `trungMuc`, không dùng `===`");
}
{
  const s = sanKhauWeb({ tabs: { query: async () => [tabTot], getZoom: async () => 0.75, setZoom: async () => {} } });
  await cho();
  assert.deepEqual(s.nut.map((n) => n.chon), [false, false, false],
    "mức ngoài mọi nút thì KHÔNG nút nào sáng — nút sáng phải có nghĩa");
  assert.ok(s.nut.every((n) => !n.disabled), "mức lạ vẫn phải bấm được — đó chính lúc Đức cần bấm nhất");
}

/* ⑱ Bốn cách hỏng đều phải: xám, tắt sáng, VÀ nói ra lý do — bốn lý do KHÁC nhau. */
const cachHong = [
  ["không có API tab", { tabs: null }],
  ["query ném", { tabs: { query: async () => { throw new Error("tab bi tu choi"); } } }],
  ["không có tab nào", { tabs: { query: async () => [] } }],
  ["tab ngoài quyền, Chrome giấu url", { tabs: { query: async () => [{ id: 9 }] } }],
  ["tab của trang khác", { tabs: { query: async () => [{ id: 9, url: "https://vi.wikipedia.org/" }] } }],
  ["getZoom ném", { tabs: { query: async () => [tabTot], getZoom: async () => { throw new Error("zoom bi tu choi"); } } }]
];
const lyDo = [];
for (const [ten, dung] of cachHong) {
  const s = sanKhauWeb(dung);
  await cho();
  assert.ok(s.nut.every((n) => n.disabled), `${ten}: ba nút phải xám`);
  assert.ok(s.nut.every((n) => !n.chon), `${ten}: không nút nào được sáng`);
  assert.ok(s.cum.title.startsWith("Chưa dùng được — "), `${ten}: cụm phải mang lý do`);
  assert.ok(s.nut.every((n) => n.title === s.cum.title), `${ten}: từng nút cũng phải mang lý do — nút đã xám thì không phát sự kiện chuột`);
  lyDo.push(s.cum.title);
}
assert.equal(new Set(lyDo).size, cachHong.length,
  "mỗi cách hỏng một câu riêng — sáu câu giống nhau thì đứng xa không chẩn đoán được");

/* ⑲ BẤM: đặt đúng MỘT lượt, đúng tab, đúng mức. */
{
  const dat = [];
  let muc = 1;
  const s = sanKhauWeb({ tabs: {
    query: async () => [tabTot],
    getZoom: async () => muc,
    setZoom: async (id, m) => { dat.push({ id, m }); muc = m; }
  } });
  await cho();
  s.nut[0].nghe();
  await cho(); await cho();
  assert.equal(dat.length, 1, "bấm một lần thì đặt một lần");
  assert.equal(dat[0].id, tabTot.id);
  assert.equal(dat[0].m, 0.8);
  assert.deepEqual(s.nut.map((n) => n.chon), [true, false, false], "đặt xong phải ĐỌC LẠI rồi mới tô sáng");
}

/* ⑳ KHÓA THẬT SỰ: tab không đọc được url thì **tuyệt đối không được gọi `setZoom`**.
 * Đây là khẳng định quan trọng nhất của cả `U2`: `G-95` đo ra `setZoom` không bị quyền chặn,
 * nên nếu chỗ này thủng thì Udin phóng to tab của người khác và không có gì cản. */
for (const tabXau of [{ id: 9 }, { id: 9, url: "https://vi.wikipedia.org/" }, { id: 9, url: "" }]) {
  const dat = [];
  const s = sanKhauWeb({ tabs: {
    query: async () => [tabXau],
    getZoom: async () => 1,
    setZoom: async (id, m) => { dat.push({ id, m }); }
  } });
  await cho();
  /* Nút đang xám, nhưng gọi thẳng tay nghe — đúng thứ xảy ra khi Đức đổi tab SAU lượt
     đồng bộ cuối: nút vẫn sáng trên màn, tab bên dưới đã khác. */
  s.nut[0].nghe();
  await cho(); await cho();
  assert.deepEqual(dat, [], `tab lạ (${JSON.stringify(tabXau)}) thì KHÔNG được đặt zoom — \`setZoom\` không bị quyền chặn (G-95)`);
  assert.ok(s.nut.every((n) => n.disabled), "bấm nhầm lúc tab đã đổi thì phải khoá lại kèm lý do");
}

/* ⑴ `setZoom` ném — khoá lại kèm lý do, không để nút sáng như vừa thành công. */
{
  const s = sanKhauWeb({ tabs: {
    query: async () => [tabTot],
    getZoom: async () => 1,
    setZoom: async () => { throw new Error("dat zoom that bai"); }
  } });
  await cho();
  s.nut[0].nghe();
  await cho(); await cho();
  assert.ok(s.nut.every((n) => n.disabled));
  assert.match(s.cum.title, /đặt mức thu phóng không thành/);
}

console.log("zoom-smoke: OK");

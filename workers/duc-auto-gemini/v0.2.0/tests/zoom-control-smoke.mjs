// Test ghim cho cụm nút CHAT ZOOM / UI ZOOM của gói Gemini.
//
// File này thay `chatgpt-zoom-control-smoke.mjs` — một phép kiểm ĐÃ CHẾT.
// Nửa tĩnh của nó (HTML/CSS) là thật và được giữ nguyên bên dưới. Nửa hành vi
// thì tự định nghĩa lại `isChatGPTUrl` bằng regex của ChatGPT, rồi tự viết lại
// `simulateZoomSync` / `simulateSetZoom` ngay trong file test. Nghĩa là nó kiểm
// một bản sao logic của nhánh KHÁC, nằm trong gói này: phá `sidepanel.js` kiểu
// gì nó cũng xanh. Nó khẳng định `https://chatgpt.com/` là địa chỉ hợp lệ —
// trong gói Gemini.
//
// Nay: TRÍCH ĐÚNG THÂN HÀM ra khỏi `sidepanel.js` rồi CHẠY. Đột biến vào
// `sidepanel.js` làm file này đỏ, đó là toàn bộ khác biệt.
//
// ---- Hai lỗi được ghim ở đây --------------------------------------------
//
// (1) GỐC BỆNH. Cổng của nút phóng to hỏi `isProviderUrl` — câu hỏi của
//     runner, "một run có được phép gõ vào tab này không" — nên nó đòi đúng mặt
//     `/app` hoặc `/images`. Nút phóng to chỉ gọi `chrome.tabs.setZoom`: không
//     gửi gì, không gõ gì. Hỏi nhầm câu làm nút tự xám trên MỌI trang Gemini
//     khác: trang gốc, một Gem, hội thoại chia sẻ, trang cài đặt. Nhánh
//     ChatGPT — nơi nút này chạy tốt — hỏi đúng câu origin.
//
// (2) BỆNH THỨ HAI, và là lý do không ai chẩn đoán được từ xa. Nút xám có BỐN
//     nguyên nhân khác hẳn nhau, và cả bốn đều chui qua `catch (_) {}` rồi cho
//     ra đúng một kết quả câm: nút xám, không một chữ. Nay mỗi nguyên nhân tự
//     khai vào tooltip.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");
const source = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- 1. Nửa tĩnh, giữ nguyên từ phép kiểm cũ ------------------------------ */

assert.match(html, /CHAT ZOOM/);
assert.match(html, /id="chatZoomControl"/, "cụm nút phải có id — chỗ gắn lý do khi nó xám");
for (const level of ["0\\.8", "0\\.9", "1\\.0"]) assert.match(html, new RegExp(`data-zoom="${level}"`));
for (const label of ["80%", "90%", "100%"]) {
  assert.match(html, new RegExp(`<button[^>]*class="zoom-btn"[^>]*>${label}</button>`));
}
assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*data-zoom/, "cụm nút phải là nút phân đoạn, KHÔNG phải checkbox");
// Trạng thái khởi đầu THẬT: ba nút ship ở trạng thái tắt, và `syncZoomState()`
// mới là thứ bật chúng lên. Sân khấu giả bên dưới dựng đúng theo dòng này.
assert.equal([...html.matchAll(/<button[^>]*class="zoom-btn"[^>]*disabled[^>]*>/g)].length, 3, "cả ba nút phóng to ship ở trạng thái TẮT — chúng chỉ được bật sau khi đọc được tab thật");
for (const rule of [/\.zoom-group/, /\.zoom-label/, /\.segmented/, /\.zoom-btn/, /\.zoom-btn\.active/]) assert.match(css, rule);
assert.match(source, /matchesZoomLevel/);
assert.doesNotMatch(source, /nearestZoom/, "không được trình bày theo giá trị gần nhất");

/* ---- 2. Trích thân hàm THẬT rồi chạy ------------------------------------- */

const block = /const ZOOM_LEVELS = \[[\s\S]*?(?=\n  function applyUiZoom)/.exec(source);
assert.ok(block, "trích được khối zoom ra khỏi sidepanel.js — neo hỏng thì phép kiểm này thành vô nghĩa, nên nó phải nổ");

/* `disabled: true` là TRẠNG THÁI KHỞI ĐẦU THẬT — `sidepanel.html` ship ba nút
   này kèm thuộc tính `disabled` (có khẳng định canh ngay dưới). Bản đầu của
   file này cho chúng khởi đầu ở trạng thái BẬT, và hậu quả đo được: đột biến
   xoá `unlockZoomButtons()` khỏi đường tốt vẫn XANH, vì "sau khi đồng bộ thì
   bấm được" đúng sẵn mà không cần ai bật. Sân khấu sai trạng thái đầu là một
   phép kiểm mất răng ở đúng chỗ nó phải cắn. */
function makeButton(zoom) {
  const btn = { dataset: { zoom }, disabled: true, title: "", active: false };
  btn.classList = {
    toggle: (cls, on) => { if (cls === "active") btn.active = Boolean(on); },
    remove: (cls) => { if (cls === "active") btn.active = false; },
  };
  return btn;
}

/** Dựng một sân khấu: bảng điều khiển giả + Chrome giả, rồi nạp khối thật vào. */
function stage({ tabs, adapterUrlOk = true } = {}) {
  const buttons = [makeButton("0.8"), makeButton("0.9"), makeButton("1.0")];
  // Ly do CU con dinh tren cum nut. Duong tot phai don no di; khong don thi
  // Duc thay mot cau canh bao da het han trong khi nut van bam duoc.
  const group = { title: "Chưa dùng được — LÝ DO CŨ CHƯA ĐƯỢC DỌN" };
  const context = vm.createContext({
    console,
    // `URL` là global của Node, KHÔNG phải built-in của V8, nên một context vm
    // mới KHÔNG có nó. Thiếu nó thì `new URL()` trong adapter ném, rơi vào
    // catch, và mọi địa chỉ đều thành "không hợp lệ" — phép kiểm sẽ đỏ vì sân
    // khấu dựng thiếu chứ không phải vì code sai. Đã dính đúng lượt viết file này.
    URL,
    document: {
      querySelectorAll: (sel) => (sel === ".zoom-btn" ? buttons : []),
      getElementById: (id) => (id === "chatZoomControl" ? group : null),
      documentElement: { style: { setProperty() {} } },
      body: { dataset: {} },
    },
    chrome: tabs === null ? {} : { tabs },
    window: { DacProviderAdapter: null },
  });
  // Adapter THẬT, không phải bản giả — luật địa chỉ Gemini phải là luật đang chạy.
  vm.runInContext(fs.readFileSync(new URL("provider-adapter.js", root), "utf8"), context);
  if (!adapterUrlOk) context.window.DacProviderAdapter = { isProviderOrigin: () => false };
  vm.runInContext(block[0], context);
  return { buttons, group, context };
}

/* Chrome giả phải GIỮ TRẠNG THÁI: `setZoom` đổi mức rồi `getZoom` phải trả về
   mức mới. Bản đầu cho `getZoom` đọc tham số đóng gói, nên sau khi đặt 80% nó
   vẫn trả 100% — và ca "đọc lại trạng thái sau khi bấm" đỏ vì sân khấu, không
   phải vì code. */
const okTabs = (url, zoom = 1.0) => {
  const state = {
    zoom,
    lastSet: undefined,
    query: async () => [{ id: 101, url }],
    getZoom: async () => state.zoom,
    setZoom: async (tabId, factor) => { state.lastSet = { tabId, factor }; state.zoom = factor; },
  };
  return state;
};

/* --- Ca A: tab không phải Gemini -> xám, VÀ lý do kể tên địa chỉ thật ------ */
{
  const s = stage({ tabs: okTabs("https://example.com/") });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "tab lạ thì nút xám");
  assert.match(s.group.title, /không phải trang Gemini/, "lý do nói rõ vì sao");
  assert.match(s.group.title, /example\.com/, "lý do KÈM địa chỉ thật — không có nó thì Đức vẫn không biết mình đang ở đâu");
  assert.match(s.buttons[0].title, /không phải trang Gemini/, "lý do gắn cả lên từng nút: nút disabled không phát sự kiện chuột ở mọi trình duyệt");
}

/* --- Ca B: hội thoại /app -> bấm được, đúng nút sáng ---------------------- */
{
  const s = stage({ tabs: okTabs("https://gemini.google.com/app/2f9c1e", 0.9) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), "trang hội thoại thì bấm được");
  assert.deepEqual(s.buttons.map((b) => b.active), [false, true, false], "đúng nút 90% sáng");
  assert.equal(s.group.title, "Gemini Zoom", "đường tốt phải DỌN lý do cũ đi, không để lại câu cảnh báo cũ");
}

/* --- Ca C: CHÍNH LÀ CA HỒI QUY. Bốn trang Gemini không phải /app|/images --- */
//
// Trước 06/09 cả bốn ca này đều xám. Chúng là những chỗ Đức hay đứng nhất.
for (const url of [
  "https://gemini.google.com/",
  "https://gemini.google.com/gem/coding-partner",
  "https://gemini.google.com/u/1/gem/abc",
  "https://gemini.google.com/settings",
]) {
  const s = stage({ tabs: okTabs(url) });
  await s.context.syncZoomState();
  assert.ok(
    s.buttons.every((b) => !b.disabled),
    `${url} vẫn là Gemini, phóng to nó vô hại — nút phải bấm được. Xám ở đây nghĩa là cổng đã quay về câu hỏi chặt của runner`
  );
}

/* --- Ca D: mặt /images vẫn phải chạy ------------------------------------- */
{
  const s = stage({ tabs: okTabs("https://gemini.google.com/images", 0.8) });
  await s.context.syncZoomState();
  assert.deepEqual(s.buttons.map((b) => b.active), [true, false, false]);
}

/* --- Ca E: KHÔNG phải trang Gemini thì vẫn phải xám ----------------------- */
//
// Nới cổng ra không được phép biến nó thành "bấm được ở mọi nơi": zoom sai tab
// là Đức phóng to nhầm cửa sổ rồi tưởng tiện ích hỏng.
for (const url of ["https://google.com/", "http://gemini.google.com/app", "chrome://extensions", ""]) {
  const s = stage({ tabs: okTabs(url) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), `${url || "(rỗng)"} không phải Gemini qua https, phải xám`);
}

/* --- Ca F: BỐN nguyên nhân phải cho BỐN câu khác nhau --------------------- */
//
// Đây là chốt hạ của bệnh thứ hai. Bốn lý do mà ra cùng một câu thì vẫn câm.
const lyDo = {};
{
  const s = stage({ tabs: null });
  await s.context.syncZoomState();
  lyDo.khongCoApi = s.group.title;
  assert.match(lyDo.khongCoApi, /API tab/, "chưa gọi được API tab");
}
{
  const s = stage({ tabs: { query: async () => { throw new Error("tabs bi chan"); } } });
  await s.context.syncZoomState();
  lyDo.docTabLoi = s.group.title;
  assert.match(lyDo.docTabLoi, /tabs bi chan/, "câu lỗi thật của Chrome phải đi kèm");
}
{
  const s = stage({ tabs: okTabs("https://example.com/") });
  await s.context.syncZoomState();
  lyDo.saiTrang = s.group.title;
}
{
  const s = stage({
    tabs: { query: async () => [{ id: 101, url: "https://gemini.google.com/app" }], getZoom: async () => { throw new Error("zoom bi tu choi"); } },
  });
  await s.context.syncZoomState();
  lyDo.docZoomLoi = s.group.title;
  assert.match(lyDo.docZoomLoi, /zoom bi tu choi/, "câu lỗi thật của Chrome phải đi kèm");
}
{
  const s = stage({ tabs: { query: async () => [] } });
  await s.context.syncZoomState();
  lyDo.khongCoTab = s.group.title;
}
const cauLyDo = Object.values(lyDo);
assert.equal(new Set(cauLyDo).size, cauLyDo.length, "mỗi nguyên nhân một câu KHÁC NHAU — bốn lý do ra cùng một câu thì nút vẫn câm");
for (const [ten, cau] of Object.entries(lyDo)) {
  assert.match(cau, /^Chưa dùng được — /, `lý do "${ten}" mở đầu bằng câu Đức đọc hiểu ngay`);
}

/* --- Ca G: bấm nút -------------------------------------------------------- */
{
  const tabs = okTabs("https://gemini.google.com/app", 1.0);
  const s = stage({ tabs });
  await s.context.setChatZoom(0.8);
  assert.deepEqual(tabs.lastSet, { tabId: 101, factor: 0.8 }, "bấm 80% thì đặt đúng 80% lên đúng tab");
  assert.deepEqual(s.buttons.map((b) => b.active), [true, false, false], "đặt xong thì đọc lại trạng thái, không tin cú bấm");
}
{
  const tabs = okTabs("https://example.com/");
  const s = stage({ tabs });
  await s.context.setChatZoom(0.8);
  assert.equal(tabs.lastSet, undefined, "tab lạ thì KHÔNG đặt zoom");
  assert.match(s.group.title, /không phải trang Gemini/, "và nói vì sao, thay vì im lặng không làm gì");
}
{
  const tabs = {
    query: async () => [{ id: 101, url: "https://gemini.google.com/app" }],
    getZoom: async () => 1.0,
    setZoom: async () => { throw new Error("dat zoom that bai"); },
  };
  const s = stage({ tabs });
  await s.context.setChatZoom(0.8);
  assert.match(s.group.title, /dat zoom that bai/, "đặt zoom hỏng cũng phải nói, không nuốt vào catch rỗng");
}

/* --- Ca H: không còn `catch (_) {}` nuốt lỗi trong khối zoom -------------- */
assert.doesNotMatch(
  block[0],
  /catch \(_\)\s*\{\s*\}/,
  "khối zoom không được còn một catch rỗng nào — mỗi cái là một nguyên nhân biến mất không dấu vết"
);

console.log("zoom control smoke: PASS");

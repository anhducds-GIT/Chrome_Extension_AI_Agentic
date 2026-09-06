// Phép ghim cụm nút CHAT ZOOM của gói Flow Video — bản TRÍCH THÂN HÀM THẬT.
//
// File này thay `chatgpt-zoom-control-smoke.mjs`, một phép kiểm ĐÃ CHẾT (N-14).
// File chết đó tự định nghĩa lại `isChatGPTUrl` bằng regex của **ChatGPT**, rồi
// tự viết lại `simulateZoomSync` / `simulateSetZoom` ngay trong chính nó. Nghĩa
// là nó kiểm một bản sao logic của nhánh KHÁC, nằm trong gói này: phá
// `sidepanel.js` kiểu gì nó cũng xanh. Nó khẳng định `https://chatgpt.com/` là
// địa chỉ hợp lệ — trong gói Flow Video. Đo bằng máy ở gói Gemini: 9 đột biến,
// nó xanh cả 9. File chết CHƯA XOÁ (xoá file cần Đức duyệt) — xem `BACKLOG.md`.
//
// Nay: nạp adapter THẬT rồi TRÍCH ĐÚNG THÂN HÀM ra khỏi `sidepanel.js` và CHẠY.
// Đột biến vào `sidepanel.js` hoặc `provider-adapter.js` làm file này đỏ, đó là
// toàn bộ khác biệt.
//
// ---- Lỗi được ghim ở đây (N-13) -----------------------------------------
//
// Cổng của nút phóng to hỏi `isProviderUrl` — câu hỏi của runner, "một run có
// được phép gõ vào tab này không" — nên nó đòi đúng MẶT trang công cụ Flow.
// Nút phóng to chỉ gọi `chrome.tabs.setZoom`: không gửi gì, không gõ gì. Hỏi
// nhầm câu làm nút tự xám trên mọi trang `labs.google` khác, mà miền đó còn
// chứa nhiều công cụ FX. Nay cổng hỏi `isProviderOrigin`.
//
// Ghi chú cho phiên sau: phép kiểm anh em `flow-zoom-control-reason.mjs` cũng
// trích thân hàm, NHƯNG nó tiêm một `isChatGPTUrl` GIẢ dựng lại từ regex trong
// chính file test — nên đúng cái cổng đang nói ở đây thì nó không canh được.
// File này nạp adapter thật, và đó là lý do nó tồn tại riêng.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");
const source = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const adapterSource = fs.readFileSync(new URL("provider-adapter.js", root), "utf8");

/* ---- 1. Nửa tĩnh: đánh dấu, kiểu nút, trạng thái khởi đầu ----------------- */

assert.match(html, /CHAT ZOOM/);
assert.match(html, /id="chatZoomControl"/, "cụm nút phải có id — chỗ gắn lý do khi nó xám");
for (const level of ["0\\.8", "0\\.9", "1\\.0"]) assert.match(html, new RegExp(`data-zoom="${level}"`));
for (const label of ["80%", "90%", "100%"]) {
  assert.match(html, new RegExp(`<button[^>]*class="zoom-btn"[^>]*>${label}</button>`));
}
assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*data-zoom/, "cụm nút phải là nút phân đoạn, KHÔNG phải checkbox");
// Trạng thái khởi đầu THẬT: ba nút ship ở trạng thái tắt, và `syncZoomState()`
// mới là thứ bật chúng lên. Sân khấu giả bên dưới dựng đúng theo dòng này.
assert.equal(
  [...html.matchAll(/<button[^>]*class="zoom-btn"[^>]*disabled[^>]*>/g)].length,
  3,
  "cả ba nút phóng to ship ở trạng thái TẮT — chúng chỉ được bật sau khi đọc được tab thật",
);
for (const rule of [/\.zoom-group/, /\.zoom-label/, /\.segmented/, /\.zoom-btn/, /\.zoom-btn\.active/]) assert.match(css, rule);
assert.match(source, /matchesZoomLevel/);

/* ---- 2. Trích thân hàm THẬT rồi chạy ------------------------------------- */

// ĐẾM SỐ CHỖ MỎ NEO KHỚP. Ra 0 nghĩa là mỏ neo hỏng, KHÔNG phải "không có gì
// để kiểm" — và một phép kiểm mỏ neo hỏng thì xanh vĩnh viễn mà không kiểm gì.
const anchorHead = [...source.matchAll(/const ZOOM_LEVELS = \[/g)].length;
const anchorTail = [...source.matchAll(/\n  function applyUiZoom/g)].length;
assert.equal(anchorHead, 1, `mỏ neo đầu khối phải khớp ĐÚNG 1 chỗ, đang khớp ${anchorHead}`);
assert.equal(anchorTail, 1, `mỏ neo cuối khối phải khớp ĐÚNG 1 chỗ, đang khớp ${anchorTail}`);

const block = /const ZOOM_LEVELS = \[[\s\S]*?(?=\n  function applyUiZoom)/.exec(source);
assert.ok(block, "trích được khối zoom ra khỏi sidepanel.js");
assert.match(block[0], /async function syncZoomState/, "khối trích ra phải chứa syncZoomState");
assert.match(block[0], /async function setChatZoom/, "khối trích ra phải chứa setChatZoom");

/* `disabled: true` là TRẠNG THÁI KHỞI ĐẦU THẬT — `sidepanel.html` ship ba nút
   này kèm `disabled` (có khẳng định canh ngay trên). Cho chúng khởi đầu BẬT là
   một phép kiểm mất răng ở đúng chỗ nó phải cắn: đột biến xoá lệnh bật nút vẫn
   xanh, vì "sau khi đồng bộ thì bấm được" đúng sẵn mà không cần ai bật. */
function makeButton(zoom) {
  const btn = { dataset: { zoom }, disabled: true, title: "", active: false };
  btn.classList = {
    toggle: (cls, on) => { if (cls === "active") btn.active = Boolean(on); },
    remove: (cls) => { if (cls === "active") btn.active = false; },
  };
  return btn;
}

/** Dựng một sân khấu: bảng điều khiển giả + Chrome giả, rồi nạp khối thật vào. */
function stage({ tabs } = {}) {
  const buttons = [makeButton("0.8"), makeButton("0.9"), makeButton("1.0")];
  // Lý do CŨ còn dính trên cụm nút. Đường tốt phải dọn nó đi; không dọn thì Đức
  // đọc một câu cảnh báo đã hết hạn trong khi nút vẫn bấm được.
  const group = { title: "Chưa dùng được — LÝ DO CŨ CHƯA ĐƯỢC DỌN" };
  const context = vm.createContext({
    console,
    // `URL` là global của Node, KHÔNG phải built-in của V8, nên một context vm
    // mới KHÔNG có nó. Thiếu nó thì `new URL()` trong adapter ném, rơi vào
    // catch, và mọi địa chỉ đều thành "không hợp lệ" — phép kiểm sẽ đỏ vì sân
    // khấu dựng thiếu chứ không phải vì code sai.
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
  // Adapter THẬT, không phải bản giả — luật địa chỉ Flow phải là luật đang chạy.
  vm.runInContext(adapterSource, context);
  vm.runInContext(block[0], context);
  return { buttons, group, context };
}

/* Chrome giả phải GIỮ TRẠNG THÁI: `setZoom` đổi mức rồi `getZoom` phải trả về
   mức mới, nếu không thì ca "đọc lại trạng thái sau khi bấm" đỏ vì sân khấu. */
const okTabs = (url, zoom = 1.0) => {
  const state = {
    zoom,
    url,
    lastSet: undefined,
    query: async () => [{ id: 101, url: state.url }],
    getZoom: async () => state.zoom,
    setZoom: async (tabId, factor) => { state.lastSet = { tabId, factor }; state.zoom = factor; },
  };
  return state;
};

/* --- Ca A: tab không phải Flow -> xám, VÀ lý do kể tên địa chỉ thật -------- */
{
  const s = stage({ tabs: okTabs("https://example.com/") });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "tab lạ thì nút xám");
  assert.match(s.group.title, /không phải trang Flow/, "lý do nói rõ vì sao");
  assert.match(s.group.title, /example\.com/, "lý do KÈM địa chỉ thật — không có nó thì Đức vẫn không biết mình đang ở đâu");
}

/* --- Ca B: trang công cụ Flow -> bấm được, đúng nút sáng ------------------- */
{
  const s = stage({ tabs: okTabs("https://labs.google/fx/tools/flow/project/abc", 0.9) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), "trang công cụ Flow thì bấm được");
  assert.deepEqual(s.buttons.map((b) => b.active), [false, true, false], "đúng nút 90% sáng");
  assert.equal(s.group.title, "Flow Zoom", "đường tốt phải DỌN lý do cũ đi, không để lại câu cảnh báo cũ");
}

/* --- Ca C: CHÍNH LÀ CA HỒI QUY (N-13) ------------------------------------- */
//
// Sáu địa chỉ dưới đây đều nằm trên đúng hai host Flow đã khai trong adapter,
// nhưng KHÔNG khớp `ORIGIN.urlPatterns` — tức là chúng đúng là những chỗ mà
// cổng cũ (`isProviderUrl`) làm nút xám không lý do rõ ràng. Phóng to bất kỳ
// trang nào trong số đó đều vô hại. Đổi cổng về `isProviderUrl` thì khối này ĐỎ.
const trangCungMien = [
  "https://labs.google/",
  "https://labs.google/fx",
  "https://labs.google/fx/tools/whisk",
  "https://labs.google/fx/vi/tools/image-fx",
  "https://flow.google.com/settings",
  "https://flow.google.com/about/pricing",
];
for (const url of trangCungMien) {
  const s = stage({ tabs: okTabs(url) });
  await s.context.syncZoomState();
  assert.ok(
    s.buttons.every((b) => !b.disabled),
    `${url} vẫn là một host Flow, phóng to nó vô hại — nút phải bấm được. Xám ở đây nghĩa là cổng đã quay về câu hỏi chặt của runner`,
  );
}

/* --- Ca D: nhà mới `flow.google.com` vẫn phải chạy ------------------------ */
{
  const s = stage({ tabs: okTabs("https://flow.google.com/project/abc", 0.8) });
  await s.context.syncZoomState();
  assert.deepEqual(s.buttons.map((b) => b.active), [true, false, false]);
}

/* --- Ca E: KHÔNG phải host Flow thì vẫn phải xám -------------------------- */
//
// Nới cổng ra không được phép biến nó thành "bấm được ở mọi nơi": zoom sai tab
// là Đức phóng to nhầm cửa sổ rồi tưởng tiện ích hỏng.
const phaiXam = [
  "https://google.com/",
  "https://labs.google.evil.com/fx/tools/flow",
  "https://evil.com/?next=https://labs.google/fx/tools/flow",
  "http://labs.google/fx/tools/flow",
  "http://flow.google.com/project/abc",
  "chrome://extensions",
  "",
];
for (const url of phaiXam) {
  const s = stage({ tabs: okTabs(url) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), `${url || "(rỗng)"} không phải host Flow qua https, phải xám`);
}

/* --- Ca F: BỐN nguyên nhân phải cho BỐN câu khác nhau --------------------- */
//
// Bốn lý do mà ra cùng một câu thì nút vẫn câm — đó là bệnh 06/09.
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
    tabs: {
      query: async () => [{ id: 101, url: "https://labs.google/fx/tools/flow" }],
      getZoom: async () => { throw new Error("zoom bi tu choi"); },
    },
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
  const tabs = okTabs("https://labs.google/fx/tools/flow/project/abc", 1.0);
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
  assert.match(s.group.title, /không phải trang Flow/, "và nói vì sao, thay vì im lặng không làm gì");
}
{
  const tabs = {
    query: async () => [{ id: 101, url: "https://labs.google/fx/tools/flow" }],
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
  "khối zoom không được còn một catch rỗng nào — mỗi cái là một nguyên nhân biến mất không dấu vết",
);

/* --- Ca I: cổng của runner KHÔNG được nới theo --------------------------- */
//
// Nới cổng nút phóng to là chuyện của một nút trang trí. `isProviderUrl` là
// cổng quyết định một run có được gõ vào tab hay không, và nó phải giữ nguyên
// độ chặt: gộp hai câu hỏi lại lần nữa, theo chiều ngược, là gõ prompt vào một
// trang không phải Flow.
{
  const s = stage({ tabs: okTabs("https://labs.google/fx/tools/whisk") });
  const adapter = s.context.window.DacProviderAdapter;
  assert.equal(adapter.isProviderOrigin("https://labs.google/fx/tools/whisk"), true);
  assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/whisk"), false, "cổng của runner vẫn phải TỪ CHỐI một công cụ FX khác");
  assert.equal(adapter.isProviderUrl("https://labs.google/fx/tools/flow/project/abc"), true, "và vẫn phải nhận đúng trang công cụ Flow");
}

/* --- Ca J: ĐỔI TAB — đường khoá phải TẮT được nút đang bật ---------------- */
//
// Mọi ca trên đều bắt đầu từ trạng thái nút đã TẮT (đúng như `sidepanel.html`
// ship), nên chúng khẳng định "nút xám" ở một chỗ vốn đã xám sẵn. Đo bằng đột
// biến: bỏ hẳn `btn.disabled = true` khỏi `lockZoomButtons` mà suite vẫn XANH.
// Ca này là ca duy nhất đi từ trạng thái ĐANG BẬT — Đức mở trang Flow (nút
// sáng) rồi chuyển sang tab khác, và nút phải tắt lại. Không có ca này thì
// đường khoá không hề được canh.
{
  const tabs = okTabs("https://labs.google/fx/tools/flow/project/abc", 0.9);
  const s = stage({ tabs });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), "tiền đề: đang ở trang Flow thì nút phải bật");
  assert.ok(s.buttons.some((b) => b.active), "tiền đề: phải có một nút đang sáng để còn thấy nó bị dọn");

  tabs.url = "https://example.com/";
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "đổi sang tab lạ thì nút đang bật phải TẮT lại");
  assert.ok(s.buttons.every((b) => !b.active), "và không nút nào còn sáng");
}

console.log("zoom control smoke: PASS");

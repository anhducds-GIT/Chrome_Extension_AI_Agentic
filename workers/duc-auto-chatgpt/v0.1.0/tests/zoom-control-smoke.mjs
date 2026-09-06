// Test ghim cho cụm nút CHAT ZOOM của gói ChatGPT.
//
// File này thay `chatgpt-zoom-control-smoke.mjs` — một phép kiểm ĐÃ CHẾT (N-14
// ở `BACKLOG.md` gốc repo). Nửa tĩnh của nó (HTML/CSS) là thật và được giữ
// nguyên bên dưới. Nửa hành vi thì **tự định nghĩa lại** `isChatGPTUrl`,
// `simulateZoomSync` và `simulateSetZoom` ngay trong chính file test — nghĩa là
// nó kiểm một BẢN SAO của logic, không kiểm logic đang ship. Phá `sidepanel.js`
// kiểu gì nó cũng xanh (đo ở gói Gemini: 9 đột biến, XANH cả 9).
//
// Nay: TRÍCH ĐÚNG THÂN HÀM ra khỏi `sidepanel.js` rồi CHẠY nó trong `node:vm`.
// Đột biến vào `sidepanel.js` làm file này đỏ — đó là toàn bộ khác biệt.
//
// Một cái bẫy đã trả giá ở gói Gemini và được ghi lại đây: sân khấu giả phải
// cho ba nút khởi đầu ở trạng thái **TẮT**, đúng như `sidepanel.html` ship. Cho
// chúng khởi đầu BẬT thì đột biến xoá lệnh `btn.disabled = false` ở đường tốt
// vẫn XANH — "sau khi đồng bộ thì bấm được" đúng sẵn mà không cần ai bật.

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");
const source = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- 1. Nửa tĩnh, giữ nguyên từ phép kiểm cũ ------------------------------ */

assert.match(html, /CHAT ZOOM/);
assert.match(html, /id="chatZoomControl"/);
for (const level of ["0\\.8", "0\\.9", "1\\.0"]) assert.match(html, new RegExp(`data-zoom="${level}"`));
for (const label of ["80%", "90%", "100%"]) {
  assert.match(html, new RegExp(`<button[^>]*class="zoom-btn"[^>]*>${label}</button>`));
}
assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*data-zoom/, "cụm nút phải là nút phân đoạn, KHÔNG phải checkbox");
// Trạng thái khởi đầu THẬT: ba nút ship TẮT, `syncZoomState()` mới bật chúng
// lên. Sân khấu giả bên dưới dựng đúng theo dòng khẳng định này.
assert.equal(
  [...html.matchAll(/<button[^>]*class="zoom-btn"[^>]*disabled[^>]*>/g)].length,
  3,
  "cả ba nút phóng to ship ở trạng thái TẮT — chúng chỉ được bật sau khi đọc được tab thật"
);
for (const rule of [/\.zoom-group/, /\.zoom-label/, /\.segmented/, /\.zoom-btn/, /\.zoom-btn\.active/]) assert.match(css, rule);
assert.doesNotMatch(source, /nearestZoom/, "không được trình bày theo giá trị gần nhất");

/* ---- 2. Trích thân hàm THẬT rồi chạy ------------------------------------- */

const ANCHOR = /const ZOOM_LEVELS = \[[\s\S]*?(?=\n {2}function applyUiZoom)/g;
const hits = source.match(ANCHOR) || [];
// ĐẾM mỏ neo. Ra 0 nghĩa là công cụ đo hỏng, KHÔNG phải "không có gì phải kiểm".
assert.equal(hits.length, 1, `mỏ neo khối zoom phải khớp ĐÚNG 1 chỗ trong sidepanel.js, đang khớp ${hits.length} — neo hỏng thì phép kiểm này thành vô nghĩa`);
const block = hits[0];
// Ghim luôn rằng khối trích ra thật sự CHỨA ba hàm cần kiểm — neo trượt sang
// một đoạn ngắn hơn vẫn "khớp 1 chỗ" mà chẳng còn gì để chạy.
for (const fn of ["function isChatGPTUrl", "function matchesZoomLevel", "async function getActiveChatGPTTab", "async function syncZoomState", "async function setChatZoom"]) {
  assert.ok(block.includes(fn), `khối trích ra phải chứa \`${fn}\``);
}

function makeButton(zoom) {
  const btn = { dataset: { zoom }, disabled: true, active: false };
  btn.classList = {
    toggle: (cls, on) => { if (cls === "active") btn.active = Boolean(on); },
    remove: (cls) => { if (cls === "active") btn.active = false; },
  };
  return btn;
}

/** Dựng sân khấu: ba nút giả (khởi đầu TẮT, đúng như HTML ship) + Chrome giả. */
function stage({ tabs, buttons = [makeButton("0.8"), makeButton("0.9"), makeButton("1.0")] } = {}) {
  const context = vm.createContext({
    console,
    document: { querySelectorAll: (sel) => (sel === ".zoom-btn" ? buttons : []) },
    chrome: tabs === null ? {} : { tabs },
  });
  vm.runInContext(block, context);
  return { buttons, context };
}

/* Chrome giả phải GIỮ TRẠNG THÁI: `setZoom` đổi mức rồi `getZoom` phải trả về
   mức mới, nếu không thì ca "đọc lại trạng thái sau khi bấm" đỏ vì sân khấu
   chứ không phải vì code. */
const okTabs = (url, zoom = 1.0) => {
  const state = {
    zoom,
    setZoomCalls: [],
    query: async () => [{ id: 101, url }],
    getZoom: async (tabId) => { if (tabId !== 101) throw new Error("sai tab"); return state.zoom; },
    setZoom: async (tabId, factor) => { state.setZoomCalls.push({ tabId, factor }); state.zoom = factor; },
  };
  return state;
};

const activeMap = (buttons) => buttons.map((b) => b.active);

/* --- Ca A: tab không phải ChatGPT -> xám hết, không nút nào sáng ---------- */
{
  const s = stage({ tabs: okTabs("https://example.com/") });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "tab lạ thì cả ba nút xám");
  assert.deepEqual(activeMap(s.buttons), [false, false, false], "tab lạ thì không nút nào sáng");
}
/* Ca A′: và phải xám cả khi ĐANG BẬT rồi mới rời đi. Đây mới là đường Đức đi
   thật: đứng ở tab ChatGPT (nút bật), rồi bấm sang tab khác. Nếu chỉ kiểm từ
   trạng thái khởi đầu TẮT thì đột biến "quên tắt nút" vẫn xanh, vì nút vốn đã
   tắt sẵn — đo được: đúng đột biến đó lọt lưới ở vòng thử phá đầu tiên. */
{
  const tabs = okTabs("https://chatgpt.com/", 0.9);
  const s = stage({ tabs });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), "dựng trạng thái BẬT trước đã");
  assert.deepEqual(activeMap(s.buttons), [false, true, false]);
  tabs.query = async () => [{ id: 202, url: "https://example.com/" }];
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "rời sang tab lạ thì nút đang bật phải XÁM LẠI — để nguyên là Đức bấm vào hư không");
  assert.deepEqual(activeMap(s.buttons), [false, false, false], "và mức đang sáng phải tắt — nó là mức của tab đã rời khỏi");
}

/* --- Ca B: tab ChatGPT ở đúng ba mức -> bấm được, đúng nút sáng ----------- */
for (const [level, expected] of [[0.8, [true, false, false]], [0.9, [false, true, false]], [1.0, [false, false, true]]]) {
  const s = stage({ tabs: okTabs("https://chatgpt.com/c/67890", level) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), `ở ${level * 100}% thì ba nút phải BẬT`);
  assert.deepEqual(activeMap(s.buttons), expected, `ở ${level * 100}% thì đúng một nút sáng`);
}

/* --- Ca C: mức lệch -> bấm được nhưng KHÔNG nút nào sáng ------------------ */
//
// Đây là luật "nói thật": 75% không phải 80%, và tô sáng nút gần nhất là nói
// dối Đức về mức phóng to đang thật sự áp lên trang.
for (const offTarget of [0.75, 1.1, 1.25, 0.5, 1.5]) {
  const s = stage({ tabs: okTabs("https://chatgpt.com/", offTarget) });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => !b.disabled), `ở ${offTarget * 100}% vẫn là trang ChatGPT nên nút phải bấm được`);
  assert.deepEqual(activeMap(s.buttons), [false, false, false], `${offTarget * 100}% không được tô sáng nút nào`);
}
// Mép trong của epsilon: sai số đọc zoom của Chrome vẫn phải khớp.
{
  const s = stage({ tabs: okTabs("https://chatgpt.com/", 0.805) });
  await s.context.syncZoomState();
  assert.deepEqual(activeMap(s.buttons), [true, false, false], "80.5% vẫn là 80% — epsilon phải còn đó");
}

/* --- Ca D: luật địa chỉ, đi qua chính `isChatGPTUrl` đang ship ------------ */
for (const [url, ok] of [
  ["https://chatgpt.com/", true],
  ["https://chatgpt.com/c/67890", true],
  ["https://chat.openai.com/", true],
  ["https://chat.openai.com/g/g-1234", true],
  ["http://chatgpt.com/", false],
  ["https://chatgpt.com.evil.example/", false],
  ["https://google.com/", false],
  ["chrome://extensions", false],
  ["", false],
]) {
  assert.equal(s_isUrl(url), ok, `${url || "(rỗng)"} → ${ok ? "hợp lệ" : "không hợp lệ"}`);
}
function s_isUrl(url) {
  const s = stage({ tabs: okTabs(url) });
  return s.context.isChatGPTUrl(url);
}

/* --- Ca E: BỐN cách "không đọc được tab" đều phải fail-closed ------------- */
//
// Không có API tab · query ném · không có tab nào · getZoom bị từ chối. Cả bốn
// phải cho nút XÁM, không được để nút bấm được rồi gọi vào hư không.
{
  const s = stage({ tabs: null });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "không có `chrome.tabs` thì xám");
}
{
  const s = stage({ tabs: { query: async () => { throw new Error("tabs bi chan"); } } });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "`query` ném thì xám, không vỡ");
}
{
  const s = stage({ tabs: { query: async () => [] } });
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "không có tab hoạt động thì xám");
}
{
  // Nút đang SÁNG từ lượt trước, rồi `getZoom` hỏng: phải xám VÀ tắt sáng.
  const buttons = [makeButton("0.8"), makeButton("0.9"), makeButton("1.0")];
  const s = stage({ tabs: okTabs("https://chatgpt.com/", 0.8), buttons });
  await s.context.syncZoomState();
  assert.deepEqual(activeMap(s.buttons), [true, false, false], "dựng trạng thái sáng trước đã");
  s.context.chrome.tabs.getZoom = async () => { throw new Error("zoom bi tu choi"); };
  await s.context.syncZoomState();
  assert.ok(s.buttons.every((b) => b.disabled), "`getZoom` ném thì xám");
  assert.deepEqual(activeMap(s.buttons), [false, false, false], "và phải TẮT nút đang sáng — để nguyên là Đức đọc một mức đã hết hạn");
}

/* --- Ca F: không có nút nào trên DOM thì thoát êm, không ném ------------- */
{
  const s = stage({ tabs: okTabs("https://chatgpt.com/"), buttons: [] });
  await s.context.syncZoomState();
  await s.context.setChatZoom(0.8);
}

/* --- Ca G: bấm nút ------------------------------------------------------- */
{
  const tabs = okTabs("https://chatgpt.com/", 1.0);
  const s = stage({ tabs });
  await s.context.syncZoomState();
  assert.deepEqual(activeMap(s.buttons), [false, false, true], "trước khi bấm đang ở 100%");
  await s.context.setChatZoom(0.8);
  assert.deepEqual(tabs.setZoomCalls, [{ tabId: 101, factor: 0.8 }], "bấm 80% thì đặt đúng 80% lên đúng tab, đúng MỘT lần");
  assert.deepEqual(activeMap(s.buttons), [true, false, false], "đặt xong thì ĐỌC LẠI trạng thái, không tin cú bấm");
}
{
  const tabs = okTabs("https://example.com/");
  const s = stage({ tabs });
  await s.context.setChatZoom(0.8);
  assert.deepEqual(tabs.setZoomCalls, [], "tab lạ thì KHÔNG đặt zoom — phóng to nhầm cửa sổ là Đức tưởng tiện ích hỏng");
}
{
  const tabs = okTabs("https://chatgpt.com/", 1.0);
  tabs.setZoom = async () => { throw new Error("dat zoom that bai"); };
  const s = stage({ tabs });
  await s.context.syncZoomState();
  await s.context.setChatZoom(0.8);
  assert.deepEqual(activeMap(s.buttons), [false, false, true], "đặt zoom hỏng thì trạng thái phải ở NGUYÊN mức thật (100%), không nhảy sang mức vừa bấm");
}

console.log("zoom control smoke: PASS");

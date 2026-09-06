// Nút CHAT ZOOM xám phải NÓI ĐƯỢC vì sao nó xám.
//
// Vì sao ghim: tới 06/09 bốn nguyên nhân khác hẳn nhau (chưa có API tab · đọc
// tab lỗi · tab đang xem không phải trang Flow · Chrome từ chối đọc mức phóng
// to) cùng cho ra đúng một kết quả câm — nút xám, không một chữ. Một báo lỗi
// "nút zoom hỏng" khi đó không chẩn đoán được từ code, vì không có gì để đọc.
//
// Phép kiểm này TRÍCH HÀM THẬT ra khỏi `sidepanel.js` rồi chạy, chứ không chép
// lại logic sang đây: chép lại thì đột biến vào code sẽ không làm nó đỏ, và
// một phép kiểm như thế chỉ canh chính nó.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

function cut(name, kind = "function") {
  const head = kind === "async" ? `  async function ${name}(` : `  function ${name}(`;
  const start = source.indexOf(head);
  assert.ok(start >= 0, `không tìm thấy ${name} trong sidepanel.js`);
  const end = source.indexOf("\n  }", start);
  assert.ok(end > start, `không cắt được thân ${name}`);
  return source.slice(start, end + 4);
}

const ZOOM_TITLE = /const ZOOM_GROUP_TITLE = "([^"]+)"/.exec(source);
assert.ok(ZOOM_TITLE, "thiếu hằng ZOOM_GROUP_TITLE");

const bundle = [
  `const ZOOM_GROUP_TITLE = ${JSON.stringify(ZOOM_TITLE[1])};`,
  cut("lockZoomButtons"),
  cut("getActiveChatGPTTab", "async"),
  cut("syncZoomState", "async"),
  "return { getActiveChatGPTTab, syncZoomState, lockZoomButtons };",
].join("\n");

// `isChatGPTUrl` và `matchesZoomLevel` cũng lấy từ source thật.
const isProviderSrc = /const LOCALE_SEGMENT = "([^"]+)"/.exec(
  readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8"),
);
assert.ok(isProviderSrc, "không đọc được LOCALE_SEGMENT của adapter");
const urlPattern = new RegExp(`^https://labs\.google/fx/${isProviderSrc[1]}tools/flow(?:/|[?#]|$)`, "i");

function build({ tabs, url }) {
  const buttons = [0.8, 0.9, 1.0].map((z) => ({ disabled: true, dataset: { zoom: String(z) }, classList: { remove() {}, toggle() {} } }));
  const group = { title: "" };
  const document = {
    querySelectorAll: (sel) => (sel === ".zoom-btn" ? buttons : []),
    getElementById: (id) => (id === "chatZoomControl" ? group : null),
  };
  const chrome = tabs === undefined ? undefined : { tabs };
  const make = new Function(
    "chrome", "document", "isChatGPTUrl", "matchesZoomLevel",
    bundle,
  );
  const api = make(chrome, document, (u) => Boolean(u && urlPattern.test(u)), (a, b) => Math.abs(a - b) <= 0.015);
  return { api, buttons, group, url };
}

const cases = [];

// ① Chrome chưa lộ API tab.
cases.push(["chưa có API tab", build({ tabs: undefined }), /nạp lại tiện ích/]);

// ② Đọc tab ném lỗi.
cases.push(["đọc tab lỗi", build({ tabs: { query: async () => { throw new Error("BUM"); } } }), /không đọc được tab đang xem.*BUM/]);

// ③ Cửa sổ không có tab nào.
cases.push(["không có tab", build({ tabs: { query: async () => [] } }), /không có tab nào đang mở/]);

// ④ Tab đang xem không phải trang Flow — lý do phải KỂ RA URL thật, vì đó là
// thứ duy nhất phân biệt "mở nhầm tab" với "bộ khớp URL hỏng".
cases.push(["sai trang", build({ tabs: { query: async () => [{ id: 7, url: "https://gemini.google.com/app" }] } }), /không phải trang Flow.*gemini\.google\.com/]);

// ⑤ Đúng trang nhưng Chrome từ chối đọc mức phóng to.
cases.push(["getZoom lỗi", build({
  tabs: {
    query: async () => [{ id: 7, url: "https://labs.google/fx/vi/tools/flow/project/abc" }],
    getZoom: async () => { throw new Error("KHONG_DOC_DUOC"); },
  },
}), /từ chối đọc mức phóng to.*KHONG_DOC_DUOC/]);

for (const [ten, ctx, mong] of cases) {
  await ctx.api.syncZoomState();
  assert.ok(ctx.buttons.every((b) => b.disabled === true), `${ten}: nút phải xám`);
  assert.match(ctx.group.title, mong, `${ten}: tooltip phải nói lý do, đang là "${ctx.group.title}"`);
  assert.match(ctx.group.title, /^Chưa dùng được — /, `${ten}: tooltip phải mở đầu bằng lời báo chưa dùng được`);
}

// ⑥ Đường tốt: nút phải MỞ, và tooltip phải trở lại tên bình thường — nếu lý
// do cũ dính lại thì Đức đọc một câu đã hết hạn.
const good = build({
  tabs: {
    query: async () => [{ id: 7, url: "https://labs.google/fx/tools/flow/project/abc" }],
    getZoom: async () => 0.9,
  },
});
good.group.title = "Chưa dùng được — lý do cũ";
await good.api.syncZoomState();
assert.ok(good.buttons.every((b) => b.disabled === false), "đường tốt: nút phải mở");
assert.equal(good.group.title, ZOOM_TITLE[1], "đường tốt: tooltip phải sạch lý do cũ");

console.log("flow-zoom-control-reason: OK (6 ca)");

/**
 * Ghim B-28 phần ①: bấm "Tiếp tục" phải ăn NGAY, không đợi một hẹn giờ mà Chrome đã hoãn.
 *
 * Gốc bệnh: `waitWhilePaused()` chờ bằng `await sleep(250)` trong một vòng lặp. Chrome hoãn
 * hẹn giờ của tài liệu ẩn, và một `sleep(250)` ĐÃ hoãn không được xếp lại khi panel hiện ra —
 * nên Đức bấm "Tiếp tục" xong có thể chờ tới khoảng một phút mới thấy gì xảy ra. Không mất
 * dữ liệu, nhưng nút trông như chết.
 *
 * Phép đo ở đây cố ý brutal, và đó là toàn bộ giá trị của nó: **`sleep` trong sân khấu này
 * KHÔNG BAO GIỜ giải quyết**. Nên mọi đường thoát đi qua hẹn giờ đều treo vĩnh viễn, và một
 * lượt chờ thoát được chỉ có thể thoát bằng chuông. Bản mã trước lượt vá treo mãi ở đây.
 * Một phép kiểm dùng `sleep` giả giải-ngay-lập-tức sẽ XANH với cả bản cũ lẫn bản mới, tức là
 * không ghim gì cả — đúng cái bẫy `AI-OPERATOR-GUIDE.md` lỗi #2 dặn: phép kiểm khẳng định
 * hành vi sai thì lỗi sống dai.
 *
 * Bốn mép:
 *   ⑴ chuông giải được vòng chờ khi hẹn giờ đã chết  (chính con bug)
 *   ⑵ KHÔNG rung chuông thì vòng chờ phải VẪN treo   (chống "thoát ngay vô điều kiện" cũng xanh ⑴)
 *   ⑶ Stop thoát được mà KHÔNG khai là đã tiếp tục   (stop ≠ resume, hai câu audit khác nhau)
 *   ⑷ nhiều nhất MỘT resolver treo một lúc            (chống rò rỉ 240 resolver mỗi phút)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

/** Cắt một khối theo mốc đầu + mốc cuối, và ĐỎ nếu mốc không khớp (0 lần khớp là mỏ neo
    hỏng, không phải "không có gì phải kiểm" — bài học mutation-harness-silent-skip). */
function cut(from, to, ten) {
  const a = sidepanel.indexOf(from);
  assert.ok(a >= 0, `MỎ NEO KHÔNG KHỚP: không thấy mốc đầu của ${ten}`);
  const b = sidepanel.indexOf(to, a);
  assert.ok(b > a, `MỎ NEO KHÔNG KHỚP: không thấy mốc cuối của ${ten}`);
  return sidepanel.slice(a, b);
}

const wakeSource = cut("  let controlWake = null;", "  const BRIDGE_DEV_MODE_STORAGE_KEY", "cơ chế chuông");
assert.match(wakeSource, /function wakeControlWaiters\(\)/, "khối cắt ra phải chứa wakeControlWaiters");
assert.match(wakeSource, /function controlWakePromise\(\)/, "khối cắt ra phải chứa controlWakePromise");

const waitSource = cut("  async function waitWhilePaused() {", "\n  function showScreen(", "waitWhilePaused");
assert.match(waitSource, /controlWakePromise\(\)/, "waitWhilePaused phải đua với chuông");

/** Dựng sân khấu: `sleep` KHÔNG BAO GIỜ giải quyết. */
function stage({ pauseRequested = true, stopRequested = false } = {}) {
  const audits = [];
  const state = { pauseRequested, stopRequested, paused: false };
  const ctx = {
    console, Promise, Date,
    state,
    sleep: () => new Promise(() => {}),   // hẹn giờ chết hẳn — đúng cảnh panel bị che
    setStatus: () => {},
    progress: () => {},
    log: () => {},
    audit: (name) => audits.push(name),
    renderQueue: () => {},
    controls: () => {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    `${wakeSource}\n${waitSource}\n` +
    "globalThis.__wait = waitWhilePaused;" +
    "globalThis.__wake = wakeControlWaiters;" +
    "globalThis.__promise = controlWakePromise;",
    ctx
  );
  return { state, audits, wait: ctx.__wait, wake: ctx.__wake, promiseOf: ctx.__promise };
}

/** Cho vòng lặp sự kiện thật chạy một nhịp, rồi hỏi promise đã settle chưa. */
const daXong = async (p) => {
  const moc = Symbol("chua");
  await new Promise((r) => setTimeout(r, 20));
  return (await Promise.race([p.then(() => "xong"), Promise.resolve(moc)])) !== moc
    ? true
    : (await Promise.race([p.then(() => "xong"), new Promise((r) => setTimeout(() => r(moc), 20))])) !== moc;
};

/* ⑴ Chính con bug: hẹn giờ chết, chuông phải giải được vòng chờ. */
{
  const s = stage();
  const p = s.wait();
  assert.equal(await daXong(p), false, "đang tạm dừng thì vòng chờ phải còn treo");

  s.state.pauseRequested = false;   // Đức bấm "Tiếp tục"
  s.wake();                          // chuông reo cùng cú bấm
  assert.equal(
    await daXong(p),
    true,
    "B-28: bấm Tiếp tục phải thoát vòng chờ NGAY — ở đây `sleep` không bao giờ giải quyết, " +
    "nên nếu còn treo thì đường thoát vẫn đang phụ thuộc hẹn giờ mà Chrome hoãn được"
  );
  await p;
  assert.equal(s.state.paused, false, "thoát rồi thì cờ paused phải hạ");
  assert.deepEqual(s.audits, ["RUN_PAUSED", "RUN_RESUMED"], "phải ghi đúng hai mốc: tạm dừng rồi tiếp tục");
}

/* ⑵ Mép ngược, và là mép làm ⑴ có nghĩa: KHÔNG rung chuông thì phải VẪN treo.
   Thiếu mép này, một bản "return ngay vô điều kiện" cũng làm ⑴ xanh. */
{
  const s = stage();
  const p = s.wait();
  s.state.pauseRequested = false;   // đổi cờ nhưng KHÔNG rung chuông
  assert.equal(
    await daXong(p),
    false,
    "không có chuông và không có hẹn giờ thì phải còn treo — nếu thoát được thì vòng chờ " +
    "đang không thật sự chờ, và ⑴ không chứng minh gì cả"
  );
  s.wake();
  assert.equal(await daXong(p), true);
  await p;
}

/* ⑶ Stop cũng phải thoát được — nhưng KHÔNG được khai là đã tiếp tục.
   `pauseRequested` ở đây vẫn TRUE: người bấm Stop chứ không bấm Tiếp tục. */
{
  const s = stage();
  const p = s.wait();
  s.state.stopRequested = true;
  s.wake();
  assert.equal(await daXong(p), true, "Stop phải thoát được khỏi tạm dừng mà không cần bấm Tiếp tục trước");
  await p;
  assert.deepEqual(s.audits, ["RUN_PAUSED"], "Stop KHÔNG phải Resume — không được ghi RUN_RESUMED");
}

/* ⑷ Không rò rỉ: `Promise.race` để promise thua ở lại treo, nên nếu mỗi lượt chờ cấp một
   promise mới thì một phút tạm dừng bỏ lại ~240 resolver. Một promise dùng chung, giải rồi
   mới cấp cái mới. */
{
  const s = stage();
  const a = s.promiseOf();
  assert.equal(s.promiseOf(), a, "chưa reo thì mọi lượt hỏi phải nhận CÙNG MỘT promise");
  assert.equal(s.promiseOf(), a);
  s.wake();
  const b = s.promiseOf();
  assert.notEqual(b, a, "reo rồi thì lượt sau phải nhận promise MỚI, không phải cái đã settle");
  assert.equal(s.promiseOf(), b);
}

console.log("B-28① Tiếp tục ăn ngay bằng chuông, không qua hẹn giờ (4 mép): PASS");

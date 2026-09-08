/**
 * Ghim B-28 phần ①: bấm "Tiếp tục" phải ăn NGAY, không đợi một hẹn giờ mà Chrome đã hoãn.
 *
 * Gốc bệnh: `waitWhilePaused()` chờ bằng `await sleep(250)` trong một vòng lặp. Chrome hoãn
 * hẹn giờ của tài liệu ẩn, và một `sleep(250)` ĐÃ hoãn không được xếp lại khi panel hiện ra —
 * nên Đức bấm "Tiếp tục" xong có thể chờ tới khoảng một phút mới thấy gì xảy ra. Không mất
 * dữ liệu, nhưng nút trông như chết.
 *
 * Phép đo ở mép ①–③ cố ý brutal, và đó là toàn bộ giá trị của nó: **`sleep` trong sân khấu
 * KHÔNG BAO GIỜ giải quyết**. Nên mọi đường thoát đi qua hẹn giờ đều treo vĩnh viễn, và một
 * lượt chờ thoát được chỉ có thể thoát bằng chuông. Bản mã trước lượt vá treo mãi ở đây. Một
 * phép kiểm dùng `sleep` giả giải-ngay-lập-tức sẽ XANH với cả bản cũ lẫn bản mới, tức là
 * không ghim gì cả.
 *
 * Năm mép:
 *   ⑴ chuông giải được vòng chờ khi hẹn giờ đã chết  (chính con bug)
 *   ⑵ KHÔNG rung chuông thì vòng chờ phải VẪN treo   (chống "thoát ngay vô điều kiện" cũng xanh ⑴)
 *   ⑶ Stop thoát được mà KHÔNG khai là đã tiếp tục   (stop ≠ resume, hai câu audit khác nhau)
 *   ⑷ số resolver sống bị CHẶN, và về 0 sau khi chờ xong
 *   ⑸ reo lúc không ai chờ không để lại "chuông còn reo" giải oan lượt chờ tới sau
 *
 * Mép ⑷ được viết lại sau một vòng audit độc lập 08/09. Bản đầu chỉ so **danh tính** promise
 * ("mọi lượt hỏi nhận cùng một promise") và **đã xanh trong khi vẫn rò rỉ**: dùng chung một
 * promise không dọn các reaction mà `Promise.race` đính vào nó mỗi vòng lặp — đo lại bằng tay
 * thì 10.000 reaction trên một bell, reo một lần là cả 10.000 đều chạy. Nên mép này nay đo
 * **số resolver sống**, thứ mà bản rò rỉ không chặn được.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

/** Cắt một khối theo mốc đầu + mốc cuối, ĐỎ nếu mốc không khớp (0 lần khớp là mỏ neo hỏng,
    không phải "không có gì phải kiểm"). */
function cut(from, to, ten) {
  const a = sidepanel.indexOf(from);
  assert.ok(a >= 0, `MỎ NEO KHÔNG KHỚP: không thấy mốc đầu của ${ten}`);
  const b = sidepanel.indexOf(to, a);
  assert.ok(b > a, `MỎ NEO KHÔNG KHỚP: không thấy mốc cuối của ${ten}`);
  return sidepanel.slice(a, b);
}

const wakeSource = cut("  const controlWaiters = new Set();", "  const BRIDGE_DEV_MODE_STORAGE_KEY", "cơ chế chuông");
assert.match(wakeSource, /function wakeControlWaiters\(\)/, "khối cắt ra phải chứa wakeControlWaiters");
assert.match(wakeSource, /function raceControlWake\(/, "khối cắt ra phải chứa raceControlWake");
assert.match(wakeSource, /finally \{\s*controlWaiters\.delete\(settle\);/, "phải DỌN resolver trong finally — thắng bằng chuông hay bằng lưới đỡ đều phải dọn");

const waitSource = cut("  async function waitWhilePaused() {", "\n  function showScreen(", "waitWhilePaused");
assert.match(waitSource, /raceControlWake\(250\)/, "vòng chờ phải đua chuông với lưới đỡ 250ms");

/** Dựng sân khấu. `sleep` do người gọi quyết định — mép ①–③ cho nó chết hẳn. */
function stage({ pauseRequested = true, stopRequested = false, sleep, PromiseImpl } = {}) {
  const audits = [];
  const state = { pauseRequested, stopRequested, paused: false };
  const ctx = {
    console, Promise: PromiseImpl || Promise, Date, Set, Math,
    state,
    sleep: sleep || (() => new Promise(() => {})),   // hẹn giờ chết — đúng cảnh panel bị che
    setStatus: () => {}, progress: () => {}, log: () => {},
    audit: (name) => audits.push(name),
    renderQueue: () => {}, controls: () => {}
  };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(
    `${wakeSource}\n${waitSource}\n` +
    "globalThis.__wait = waitWhilePaused;" +
    "globalThis.__wake = wakeControlWaiters;" +
    "globalThis.__race = raceControlWake;" +
    "globalThis.__waiters = controlWaiters;",
    ctx
  );
  return { state, audits, wait: ctx.__wait, wake: ctx.__wake, race: ctx.__race, waiters: ctx.__waiters };
}

/** Cho vòng lặp sự kiện thật chạy một nhịp, rồi hỏi promise đã settle chưa. */
const daXong = async (p) => {
  const moc = Symbol("chua");
  await new Promise((r) => setTimeout(r, 20));
  return (await Promise.race([p.then(() => "xong"), new Promise((r) => setTimeout(() => r(moc), 20))])) !== moc;
};

/* ⑴ Chính con bug: hẹn giờ chết, chuông phải giải được vòng chờ. */
{
  const s = stage();
  const p = s.wait();
  assert.equal(await daXong(p), false, "đang tạm dừng thì vòng chờ phải còn treo");

  s.state.pauseRequested = false;   // Đức bấm "Tiếp tục"
  s.wake();
  assert.equal(
    await daXong(p),
    true,
    "B-28: bấm Tiếp tục phải thoát vòng chờ NGAY — ở đây `sleep` không bao giờ giải quyết, " +
    "nên nếu còn treo thì đường thoát vẫn đang phụ thuộc hẹn giờ mà Chrome hoãn được"
  );
  await p;
  assert.equal(s.state.paused, false, "thoát rồi thì cờ paused phải hạ");
  assert.deepEqual(s.audits, ["RUN_PAUSED", "RUN_RESUMED"], "phải ghi đúng hai mốc: tạm dừng rồi tiếp tục");
  assert.equal(s.waiters.size, 0, "chờ xong thì không được để lại resolver nào");
}

/* ⑵ Mép ngược, và là mép làm ⑴ có nghĩa: KHÔNG rung chuông thì phải VẪN treo. */
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

/* ⑶ Stop cũng phải thoát được — nhưng KHÔNG được khai là đã tiếp tục. */
{
  const s = stage();
  const p = s.wait();
  s.state.stopRequested = true;
  s.wake();
  assert.equal(await daXong(p), true, "Stop phải thoát được khỏi tạm dừng mà không cần bấm Tiếp tục trước");
  await p;
  assert.deepEqual(s.audits, ["RUN_PAUSED"], "Stop KHÔNG phải Resume — không được ghi RUN_RESUMED");
}

/* ⑷ Số resolver sống phải bị CHẶN bởi số lượt chờ đồng thời, không bởi độ dài quãng tạm
   dừng. Ở đây `sleep` giải NGAY, nên vòng lặp quay rất nhiều lượt — đúng hình dạng một
   quãng tạm dừng dài. Bản dùng-chung-một-promise không chặn được con số này. */
{
  let ticks = 0;
  let maxSong = 0;
  const s = stage({
    sleep: () => {
      ticks += 1;
      maxSong = Math.max(maxSong, s.waiters.size);
      if (ticks >= 400) s.state.pauseRequested = false;   // "Tiếp tục" sau 400 nhịp
      return Promise.resolve();
    }
  });
  await s.wait();
  assert.ok(ticks >= 400, `vòng lặp phải quay đủ nhiều lượt để đo được (đo ${ticks})`);
  assert.ok(
    maxSong <= 1,
    `số resolver sống phải luôn ≤ 1 dù vòng lặp quay ${ticks} lượt — đo được ${maxSong}. ` +
    "Lớn hơn 1 nghĩa là mỗi lượt chờ bỏ lại một resolver, tức ~240 cái mỗi phút tạm dừng"
  );
  assert.equal(s.waiters.size, 0, "chờ xong thì tập resolver phải rỗng");
}

/* ⑸ Reo lúc không ai chờ phải là no-op, KHÔNG để lại "chuông còn reo". Nếu nó để lại, một
   lượt chờ tới sau sẽ được giải oan ngay lập tức — tức tạm dừng không giữ được gì cả. */
{
  const s = stage();
  s.wake();                                   // reo vào chỗ trống
  assert.equal(s.waiters.size, 0);
  const p = s.wait();                          // rồi mới có người chờ
  assert.equal(
    await daXong(p),
    false,
    "một cú reo cũ không được giải oan lượt chờ tới sau — nếu có, tạm dừng không giữ được job nào"
  );
  s.state.pauseRequested = false;
  s.wake();
  assert.equal(await daXong(p), true);
  await p;
}

/* ⁶ ĐO TRỮC TIẾP CÁI RÒ RỈ, không đo một dấu hiệu của nó.
   Vòng audit độc lập thứ hai 08/09 chỉ đúng một lỗ còn lại trong chính phép ghim này:
   mép ⁴ đo **số tên trong tập**, mà cái rò rỉ thật là **số reaction đính vào một promise
   chưa settle**. Hai thứ đó khác nhau: một bản vừa giữ sổ bằng `Set` đúng luật vừa dùng
   chung một bell sẽ có `size ≤ 1` **và vẫn rò rỉ**. Nên mép này đếm thẳng số lần `then`
   đính vào mỗi promise, rồi đòi con số lớn nhất bị chặn — không bò theo số vòng lặp.
   Bản rò rỉ của vòng 1 đạt ~400 ở đây; bản hiện tại đạt 1. */
{
  let maxReaction = 0;
  class TrackedPromise extends Promise {
    constructor(executor) { super(executor); this.__reactions = 0; }
    then(...args) {
      this.__reactions = (this.__reactions || 0) + 1;
      if (this.__reactions > maxReaction) maxReaction = this.__reactions;
      return super.then(...args);
    }
  }

  let ticks = 0;
  const s = stage({
    PromiseImpl: TrackedPromise,
    sleep: () => {
      ticks += 1;
      if (ticks >= 400) s.state.pauseRequested = false;
      return TrackedPromise.resolve();
    }
  });
  await s.wait();
  assert.ok(ticks >= 400, `vòng lặp phải quay đủ nhiều lượt để đo được (đo ${ticks})`);
  assert.ok(
    maxReaction <= 4,
    `một promise chỉ được mang vài reaction, không được mang một reaction cho MỖI vòng lặp — ` +
    `đo được ${maxReaction} sau ${ticks} lượt. Con số bò theo số vòng lặp nghĩa là ` +
    `đang dùng chung một promise và tích luỹ reaction trên nó — đúng con rò rỉ audit đã bắt ` +
    `ở vòng 1, và là con mà mép ⁴ (đếm tên trong tập) KHÔNG thấy được`
  );
}

console.log("B-28① Tiếp tục ăn ngay bằng chuông, không qua hẹn giờ (6 mép, mép ⑥ đo thẳng số reaction): PASS");

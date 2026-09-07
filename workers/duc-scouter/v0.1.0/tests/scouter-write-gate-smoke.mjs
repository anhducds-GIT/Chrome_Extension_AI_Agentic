/* Phép ghim cho PHANH CỦA ĐƯỜNG GHI — `scripts/scouter-seed-core.mjs` (S-05), và cho bề mặt
 * quyền trong `manifest.json` (S-02).
 *
 * Vì sao hai thứ này chung một file: cả hai trả lời đúng một câu — *Scouter được phép làm gì*.
 * Cái phanh nói "được bấm khi nào", manifest nói "được đụng tới cái gì". Tách ra hai file thì
 * lượt nào nới một bên cũng dễ quên bên kia.
 *
 * Luật ghim của repo (MULTIFLOW.md mục 5): ghim CẢ HAI CHIỀU. Một bản "luôn từ chối" phải ĐỎ
 * y như một bản "luôn cho qua" — nên ở đây có cả khối ② (mở khoá thì bấm được thật) lẫn các
 * khối từ chối. Chỉ ghim một chiều thì cách sửa rẻ nhất để test xanh là bỏ hẳn đường ghi.
 *
 * Bất biến ĐẮT NHẤT của file này, và cũng là thứ dễ mất nhất khi ai đó "dọn code":
 * mỗi lượt bị chặn phải chặn TRƯỚC `engine.runAction`. Nên gần như khối nào cũng đo
 * `engine.actionCalls` — không đo thì một bản vá "chặn sau khi bấm" vẫn xanh, mà bản đó thì
 * cái phanh chỉ còn là lời bình luận.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

const { createSeedHandlers, setWriteGate, readWriteGateState, SEED_CONSTANTS } =
  await import("../scripts/scouter-seed-core.mjs");
const { BridgeProtocolError, negotiateVersion, capabilities } =
  await import("../scripts/scouter-bridge-core.mjs");

/* Khai LẠI tại đây, cố ý không import. Import khoá lưu trữ từ module là để cái được ghim tự
 * chấm điểm cho mình: ai đổi khoá thì test đổi theo và không ai biết bản cũ đã mồ côi. */
const GATE_KEY = "scouter.write.gate.v1";
const CAP = 50;

/* ---- Đồ giả -------------------------------------------------------------- */

function makeChrome(gate, options = {}) {
  const store = Object.create(null);
  if (gate !== undefined) store[GATE_KEY] = gate;
  return {
    store,
    runtime: { id: "fake-extension-id", reload() {} },
    storage: {
      local: {
        async get(keys) {
          if (options.getThrows) throw new Error("storage unavailable");
          const out = {};
          for (const key of keys) if (key in store) out[key] = store[key];
          return out;
        },
        async set(patch) {
          if (options.setThrows) throw new Error("storage write refused");
          Object.assign(store, patch);
        }
      }
    }
  };
}

function makeEngine(options = {}) {
  const engine = {
    actionCalls: [],
    probeCalls: [],
    async scanTargets() {
      return [{ targetId: "T1", attached: false, title: "fake", url: "https://example.invalid/", type: "page" }];
    },
    async runProbe(target, name, params) {
      engine.probeCalls.push({ name, params });
      return { ok: true, data: { probed: name }, cdp: [] };
    },
    async runAction(target, name, params) {
      engine.actionCalls.push({ name, params });
      if (options.actionFails) return { ok: false, code: "SELECTOR_NO_MATCH", detail: "khong khop phan tu nao" };
      return { ok: true, data: { acted: name }, cdp: [] };
    }
  };
  return engine;
}

function makeHandlers(gate, options = {}) {
  const chromeApi = makeChrome(gate, options);
  const engine = makeEngine(options);
  const handlers = createSeedHandlers({
    engine, chromeApi, BridgeProtocolError, negotiateVersion, capabilities,
    timers: { setTimeout: () => 0 }
  });
  return { handlers, engine, chromeApi };
}

async function refusal(fn) {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof BridgeProtocolError, `mong doi BridgeProtocolError, nhan ${error?.name}: ${error?.message}`);
    return error;
  }
  assert.fail("mong doi mot loi tu choi, nhung loi goi da chay xong");
}

const CLICK = { target_id: "T1", selector: "#btn" };

/* ---- ① Chưa mở khoá thì KHÔNG bấm, và không bấm nghĩa là không hề thử ---- */
{
  const { handlers, engine } = makeHandlers(undefined);
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "WRITE_BLOCKED");
  assert.equal(error.details.write_code, "DEV_MODE_OFF");
  assert.equal(engine.actionCalls.length, 0, "bi chan roi ma van goi engine.runAction");
}

/* ---- ② Mở khoá thì bấm được THẬT, và ngân sách bị trừ -------------------- */
{
  const { handlers, engine, chromeApi } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 });
  const result = await handlers["scout.click"](CLICK);
  assert.equal(result.action, "input.click");
  assert.equal(engine.actionCalls.length, 1, "mo khoa roi ma khong bam");
  assert.deepEqual(result.write_budget, { used: 1, cap_per_unlock: CAP, remaining: CAP - 1 });
  assert.equal(chromeApi.store[GATE_KEY].used, 1, "da bam ma khong tru ngan sach");
  /* Công tắc phải GIỮ NGUYÊN trạng thái bật — trừ một lượt không được vô tình tắt nó. */
  assert.equal(chromeApi.store[GATE_KEY].enabled, true);
}

/* ---- ③ Hết ngân sách thì đóng, và đóng trước khi bấm --------------------- */
{
  const { handlers, engine } = makeHandlers({ enabled: true, enabled_at: 1, used: CAP });
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "WRITE_BLOCKED");
  assert.equal(error.details.write_code, "WRITE_CAP_REACHED");
  assert.equal(error.details.cap_per_unlock, CAP);
  assert.equal(engine.actionCalls.length, 0, "het ngan sach ma van bam");
}

/* ---- ④ HỎNG THÌ ĐÓNG: đọc kho lưu lỗi ≠ được phép bấm -------------------- */
{
  const { handlers, engine } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, { getThrows: true });
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "WRITE_BLOCKED");
  assert.equal(error.details.write_code, "DEV_MODE_UNREADABLE");
  assert.equal(engine.actionCalls.length, 0, "khong doc duoc cong tac ma van bam — phanh mo ra khi hong");
}

/* ---- ⑤ Bản ghi méo cũng là "không biết", và không biết thì đóng ---------- */
for (const used of [-1, 1.5, "3", null, undefined, NaN]) {
  const { handlers, engine } = makeHandlers({ enabled: true, enabled_at: 1, used });
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "WRITE_BLOCKED", `used=${String(used)} phai bi tu choi`);
  assert.equal(error.details.write_code, "GATE_CORRUPT", `used=${String(used)}`);
  assert.equal(engine.actionCalls.length, 0, `used=${String(used)}: ban ghi meo ma van bam`);
}

/* ---- ⑥ Trừ hụt thì KHÔNG bấm: một trần không ghi được là trần không có --- */
{
  const { handlers, engine } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, { setThrows: true });
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "WRITE_BLOCKED");
  assert.equal(error.details.write_code, "GATE_NOT_RECORDED");
  assert.equal(engine.actionCalls.length, 0, "ghi hut ngan sach ma van bam");
}

/* ---- ⑦ TRỪ TRƯỚC, BẤM SAU: lượt bấm hỏng vẫn tiêu ngân sách -------------
 * Đây là chỗ một vòng lặp hỏng bị chặn. Nếu chỉ trừ khi bấm THÀNH CÔNG thì một AI gõ sai
 * selector quay được vô hạn lần mà trần không bao giờ chạm tới. */
{
  const { handlers, engine, chromeApi } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, { actionFails: true });
  const error = await refusal(() => handlers["scout.click"](CLICK));
  assert.equal(error.code, "ACTION_FAILED", "hanh dong hong phai la ACTION_FAILED, khong phai WRITE_BLOCKED");
  assert.equal(engine.actionCalls.length, 1);
  assert.equal(chromeApi.store[GATE_KEY].used, 1, "luot bam hong ma khong tru ngan sach");
}

/* ---- ⑧ CẢ BA lệnh ghi đều bị chặn, không phải mỗi scout.click ------------ */
{
  const cases = [
    ["scout.click", CLICK],
    ["scout.type", { target_id: "T1", selector: "#in", text: "xin chao" }],
    ["scout.key", { target_id: "T1", selector: "#in", key: "Enter" }]
  ];
  for (const [method, params] of cases) {
    const { handlers, engine } = makeHandlers(undefined);
    const error = await refusal(() => handlers[method](params));
    assert.equal(error.code, "WRITE_BLOCKED", `${method} khong bi chan`);
    assert.equal(engine.actionCalls.length, 0, `${method}: bi chan roi ma van goi engine`);
  }
  /* Và chặn hết ba cái thì phải ĐÚNG ba cái đó — bảng hành động không được mọc thêm lặng lẽ. */
  assert.deepEqual(Object.keys(SEED_CONSTANTS.ACTION_BY_METHOD).sort(), cases.map(([m]) => m).sort());
}

/* ---- ⑨ Đường ĐỌC không bị phanh: tắt công tắc thì Scouter vẫn nhìn được -- */
{
  const { handlers, engine } = makeHandlers(undefined);
  await handlers["scout.targets"]();
  await handlers["scout.page"]({ target_id: "T1" });
  await handlers["scout.query"]({ target_id: "T1", selector: "a" });
  await handlers["scout.tree"]({ target_id: "T1", depth: 2 });
  assert.equal(engine.probeCalls.length, 4, "cong tac tat lam hong ca duong doc");
  assert.equal(engine.actionCalls.length, 0);
}

/* ---- ⑩ Đường ĐỌC không mở được công tắc hộ đường ghi --------------------
 * Bất biến thật: không có method Bridge nào bật được cái phanh, nên một AI ở đầu dây không
 * tự mở khoá cho chính nó. Đo bằng cách chạy hết đường đọc rồi soi lại kho lưu. */
{
  const { handlers, chromeApi } = makeHandlers(undefined);
  await handlers["session.hello"]({ supported_versions: [1] });
  await handlers["system.capabilities"]();
  await handlers["system.ping"]();
  await handlers["scout.targets"]();
  await handlers["scout.page"]({ target_id: "T1" });
  assert.equal(chromeApi.store[GATE_KEY], undefined, "mot method nao do da ghi vao cong tac");
}

/* ---- ⑪ Bật là NẠP LẠI ngân sách, tắt là dọn sạch ------------------------- */
{
  const chromeApi = makeChrome({ enabled: true, enabled_at: 1, used: CAP });
  await setWriteGate(chromeApi, true, 999);
  assert.deepEqual(chromeApi.store[GATE_KEY], { enabled: true, enabled_at: 999, used: 0 });
  await setWriteGate(chromeApi, false);
  assert.equal(chromeApi.store[GATE_KEY].enabled, false);
  assert.equal(chromeApi.store[GATE_KEY].used, 0);
}

/* ---- ⑫ Popup không được nói khác đường ghi ------------------------------
 * Cái Đức đọc trên popup phải là cái sẽ thực sự xảy ra. Chỗ dễ lệch nhất là khi kho lưu hỏng:
 * đường ghi đóng, nên popup cũng phải báo TẮT chứ không báo bật. */
{
  assert.deepEqual(await readWriteGateState(makeChrome(undefined)),
    { enabled: false, used: 0, remaining: 0, cap_per_unlock: CAP });
  assert.deepEqual(await readWriteGateState(makeChrome({ enabled: true, enabled_at: 1, used: 0 }, { getThrows: true })),
    { enabled: false, used: 0, remaining: 0, cap_per_unlock: CAP });
  assert.deepEqual(await readWriteGateState(makeChrome({ enabled: true, enabled_at: 1, used: 8 })),
    { enabled: true, used: 8, remaining: CAP - 8, cap_per_unlock: CAP });
  /* Bản ghi méo: popup phải báo TẮT, vì đường ghi sẽ từ chối. */
  assert.equal((await readWriteGateState(makeChrome({ enabled: true, enabled_at: 1, used: "3" }))).enabled, false);
}

/* ---- ⑬ Trần là 50 và nó GÕ CỨNG ---------------------------------------
 * Không nhận từ tham số, không đọc từ kho lưu. Trần đọc được từ chỗ mà kẻ bị chặn ghi được
 * thì nó không phải là trần. */
{
  assert.equal(SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK, CAP);
  assert.equal(SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY, GATE_KEY);
  const { handlers, engine } = makeHandlers({ enabled: true, enabled_at: 1, used: 0, cap_per_unlock: 9999 });
  await handlers["scout.click"](CLICK);
  assert.equal(engine.actionCalls.length, 1);
  const bumped = makeHandlers({ enabled: true, enabled_at: 1, used: CAP, cap_per_unlock: 9999 });
  const error = await refusal(() => bumped.handlers["scout.click"](CLICK));
  assert.equal(error.details.write_code, "WRITE_CAP_REACHED", "tran bi noi bang mot truong trong kho luu");
}

/* ---- ⑭ Bề mặt quyền của manifest (S-02) --------------------------------
 * AGENTS.md của gói, luật 6: "quyền đã duyệt là TRẦN, không phải sàn". ADR-0009 duyệt tới sáu
 * thứ; hôm nay khai bốn. Khai thêm ngoài danh sách này là việc phải hỏi Đức, nên phép ghim
 * này ĐỎ chính là lời nhắc đi hỏi — không phải lỗi để sửa cho xanh.
 * `alarms` vào ngày 07/09 theo chốt S-02: lưới đỡ đánh thức service worker đã ngủ. */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  assert.deepEqual([...manifest.permissions].sort(), ["alarms", "debugger", "storage"]);
  assert.deepEqual(manifest.host_permissions, ["http://127.0.0.1/*"]);
  /* Quyền ADR-0009 CHƯA duyệt: không được xuất hiện, dù có tiện tới đâu. */
  const never = ["cookies", "history", "webRequest", "declarativeNetRequest", "nativeMessaging", "management", "proxy"];
  for (const permission of never) {
    assert.ok(!manifest.permissions.includes(permission), `quyen '${permission}' khong nam trong ADR-0009`);
  }
  /* Lưới đỡ chỉ chạy được khi CẢ HAI có mặt: quyền trong manifest, và người nghe trong dây
   * thật. Thiếu một nửa thì alarm là quyền thừa — đúng loại phình mà audit hai chiều phải bắt. */
  const background = fs.readFileSync(path.join(here, "..", "scouter-background.js"), "utf8");
  assert.match(background, /chrome\.alarms\.onAlarm\.addListener/);
  assert.match(background, /chrome\.alarms\.get\(/, "phai tao alarm co dieu kien, khong tao mu moi lan worker tinh");
}

console.log("scouter-write-gate-smoke: 14 khoi, tat ca DAT");

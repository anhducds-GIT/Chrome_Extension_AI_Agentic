/* Phép ghim cho CỬA BRIDGE của Scouter seed — `scripts/scouter-bridge-core.mjs` +
 * `scripts/scouter-seed-core.mjs`.
 *
 * Nghiệm thu mục 5 của BRIEF-SCOUTER-SEED-01: ba khả năng của seed, mỗi khả năng có phép ghim.
 * File này ghim khả năng ② (báo cáo qua Bridge) và ③ (tự nạp lại mình), cộng đường nối của
 * khả năng ① (bốn phép dò) vào từ vựng method. Dây thật ở `tests/scouter-transport-smoke.mjs`.
 *
 * Luật ghim của repo (MULTIFLOW.md mục 5): ghim HÀNH VI, và ghim CẢ HAI CHIỀU — một bản "luôn
 * từ chối" phải ĐỎ y như một bản "luôn cho qua".
 *
 * Danh sách method dưới đây KHAI LẠI TẠI ĐÂY, cố ý không import. Import là để cái được ghim tự
 * chấm điểm cho chính nó: ai thêm một method vào bảng thì test cũng thêm theo, và phép ghim
 * im lặng mất tác dụng.
 */

import assert from "node:assert/strict";

const core = await import("../scripts/scouter-bridge-core.mjs");
const { createSeedHandlers, SEED_CONSTANTS } = await import("../scripts/scouter-seed-core.mjs");

/* Bản khai ĐỘC LẬP của test. Đừng đồng bộ nó với module — lệch nhau là tín hiệu, không phải lỗi. */
const EXPECTED_METHODS = [
  "session.hello",
  "system.capabilities",
  "system.ping",
  "scout.targets",
  "scout.page",
  "scout.query",
  "scout.tree",
  "scout.click",
  "scout.type",
  "scout.key",
  "scout.reload"
];
/* Bốn method GHI. `scout.reload` nạp lại chính extension; ba `scout.*` kia chạm TRANG — đó là
 * chỗ Scouter thôi làm người quan sát (ADR-0009). Cờ `read_only` phải nói đúng điều đó. */
const EXPECTED_WRITE_METHODS = new Set(["scout.reload", "scout.click", "scout.type", "scout.key"]);
/* Ba hành động của lõi ghi. Không tên nào khác được phép tới tay `ObserverEngine.runAction`. */
const EXPECTED_ACTIONS = new Set(["input.click", "input.type", "input.key"]);
/* Bốn phép dò của lõi. Không tên nào khác được phép tới tay `ObserverEngine.runProbe`. */
const EXPECTED_PROBES = new Set(["targets.list", "page.snapshot", "dom.query", "dom.tree"]);

const POISON = "'); doSomething(); ('";
const TARGET_ID = "TARGET-1";

/* ---- Đồ giả -------------------------------------------------------------- */

function makeEngine(overrides = {}) {
  const calls = [];
  return {
    calls,
    async scanTargets() {
      return [{ targetId: TARGET_ID, attached: false, type: "page", title: "t", url: "https://example.test/" }];
    },
    async runProbe(target, name, params) {
      calls.push({ target, name, params });
      if (overrides.fail) return { ok: false, probe: name, code: "SELECTOR_INVALID", detail: "Chrome từ chối selector", cdp: [] };
      return { ok: true, probe: name, data: { echoed: params ?? null }, cdp: [{ method: "DOM.enable", params: {} }] };
    },
    async runAction(target, name, params) {
      calls.push({ target, name, params, ghi: true });
      if (overrides.failAction) return { ok: false, action: name, code: "SELECTOR_AMBIGUOUS", detail: "khớp 7 phần tử", cdp: [] };
      return { ok: true, action: name, data: { echoed: params ?? null }, cdp: [{ method: "Input.dispatchMouseEvent", params: {} }] };
    }
  };
}

function makeChrome() {
  const store = {};
  const reloads = [];
  return {
    reloads,
    store,
    runtime: { id: "abcdefghijklmnopabcdefghijklmnop", reload: () => reloads.push(Date.now()) },
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of [].concat(keys)) if (key in store) out[key] = store[key];
          return out;
        },
        async set(patch) { Object.assign(store, patch); }
      }
    }
  };
}

/* Hẹn giờ giả: giữ lại callback thay vì chạy, để test quyết khi nào "tới giờ". */
function makeTimers() {
  const pending = [];
  return {
    pending,
    setTimeout(callback, delay) { pending.push({ callback, delay }); return pending.length; },
    clearTimeout() {},
    fireAll() { const queued = pending.splice(0); for (const item of queued) item.callback(); }
  };
}

let clockMs = Date.parse("2026-09-06T10:00:00Z");
const now = () => new Date(clockMs);

/* Xả vòng lặp sự kiện thật, để đọc trạng thái SAU khi mọi promise đang treo có cơ hội chạy. */
async function flush() {
  for (let index = 0; index < 3; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

function makeSeed(engineOverrides = {}, chromeOverride = null) {
  const engine = makeEngine(engineOverrides);
  const chromeApi = chromeOverride || makeChrome();
  const timers = makeTimers();
  const handlers = createSeedHandlers({
    engine,
    chromeApi,
    timers,
    now,
    BridgeProtocolError: core.BridgeProtocolError,
    negotiateVersion: core.negotiateVersion,
    capabilities: core.capabilities
  });
  const dispatch = core.createDispatcher({ handlers, now });
  return { engine, chromeApi, timers, handlers, dispatch };
}

let requestCounter = 0;
function request(method, params) {
  requestCounter += 1;
  return {
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "request",
    request_id: `req-${String(requestCounter).padStart(6, "0")}`,
    method,
    sent_at: "2026-09-06T10:00:00Z",
    client: { client_id: "pin-test", name: "pin", version: "1" },
    params: params ?? {}
  };
}

/* ---- ① Từ vựng CỐ ĐỊNH -------------------------------------------------- */
{
  assert.deepEqual([...core.METHOD_NAMES], EXPECTED_METHODS, "bảng method lệch bản khai của test");

  for (const name of EXPECTED_METHODS) {
    const entry = core.METHOD_REGISTRY[name];
    assert.equal(entry.read_only, !EXPECTED_WRITE_METHODS.has(name), `cờ read_only sai ở ${name}`);
  }

  const { dispatch, engine } = makeSeed();
  /* `input.click` là tên của LÕI hành động, không phải tên method Bridge — nó phải bị từ chối
   * y như một tên bịa. Hai từ vựng, hai bảng; lẫn chúng vào nhau là mở một cửa thứ hai. */
  for (const bogus of ["scout.drag", "input.click", "runtime.evaluate", "scout.probe", "dom.query"]) {
    const response = await dispatch(request(bogus));
    assert.equal(response.ok, false, `method lạ phải bị từ chối: ${bogus}`);
    assert.equal(response.error.code, "METHOD_NOT_FOUND");
  }
  assert.deepEqual(engine.calls, [], "method lạ không được chạm tới engine");
}

/* ---- ② Chiều NGƯỢC LẠI: việc hợp lệ KHÔNG bị chặn ----------------------- */
{
  const { dispatch, engine } = makeSeed();
  const ok = [
    await dispatch(request("session.hello", { supported_versions: [1] })),
    await dispatch(request("system.capabilities")),
    await dispatch(request("system.ping")),
    await dispatch(request("scout.targets")),
    await dispatch(request("scout.page", { target_id: TARGET_ID })),
    await dispatch(request("scout.page", { target_id: TARGET_ID, offset: 10, limit: 5 })),
    await dispatch(request("scout.query", { target_id: TARGET_ID, selector: "button" })),
    await dispatch(request("scout.tree", { target_id: TARGET_ID, depth: 4, max_nodes: 50 }))
  ];
  for (const response of ok) {
    assert.equal(response.ok, true, `việc hợp lệ bị chặn: ${JSON.stringify(response.error || {})}`);
    assert.equal(response.protocol, "duc-auto-chatgpt.bridge");
    assert.equal(response.kind, "response");
    assert.ok(response.responded_at.endsWith("Z"));
  }
  assert.equal(ok[0].result.selected_version, 1);
  assert.equal(ok[1].result.methods.length, EXPECTED_METHODS.length);

  /* Đúng bốn tên phép dò tới được lõi, không tên nào khác. */
  for (const call of engine.calls) assert.ok(EXPECTED_PROBES.has(call.name), `tên phép dò lạ: ${call.name}`);
  assert.deepEqual(engine.calls.map((call) => call.name),
    ["targets.list", "page.snapshot", "page.snapshot", "dom.query", "dom.tree"]);

  /* Tham số phân trang đi tới nơi, không bị nuốt. */
  assert.deepEqual(engine.calls[2].params, { offset: 10, limit: 5 });
  assert.deepEqual(engine.calls[4].params, { depth: 4, maxNodes: 50 });
}

/* ---- ③ Phong bì hỏng thì ĐỎ, và không bao giờ NÉM ----------------------- */
{
  const { dispatch } = makeSeed();
  const broken = [
    { ...request("system.ping"), protocol: "some.other.bridge" },
    { ...request("system.ping"), version: 2 },
    { ...request("system.ping"), kind: "response" },
    { ...request("system.ping"), request_id: "short" },
    { ...request("system.ping"), sent_at: "hôm qua" },
    { ...request("system.ping"), client: undefined },
    { ...request("system.ping"), client: { client_id: "", name: "x", version: "1" } },
    { ...request("system.ping"), method: "Runtime.evaluate" },
    { ...request("system.ping"), params: "chuỗi" },
    "không phải JSON",
    null
  ];
  for (const envelope of broken) {
    const response = await dispatch(envelope);
    assert.equal(response.ok, false, `phong bì hỏng lọt qua: ${JSON.stringify(envelope)}`);
    assert.ok(["INVALID_ENVELOPE", "UNSUPPORTED_VERSION"].includes(response.error.code), response.error.code);
    assert.equal(response.protocol, "duc-auto-chatgpt.bridge");
    assert.ok("error" in response && !("result" in response));
  }
}

/* ---- ④ Tham số: trường lạ bị từ chối, bắt buộc là bắt buộc -------------- */
{
  const { dispatch, engine } = makeSeed();
  const bad = [
    request("system.ping", { extra: 1 }),
    request("scout.page", {}),                                        // thiếu target_id
    request("scout.page", { target_id: TARGET_ID, limits: 5 }),        // gõ sai tên trường
    request("scout.page", { target_id: TARGET_ID, limit: 0 }),
    request("scout.page", { target_id: TARGET_ID, limit: 201 }),
    request("scout.query", { target_id: TARGET_ID }),                  // thiếu selector
    request("scout.query", { target_id: TARGET_ID, selector: "" }),
    request("scout.query", { target_id: TARGET_ID, selector: "x".repeat(1025) }),
    request("scout.tree", { target_id: TARGET_ID, depth: 11 }),
    request("scout.tree", { target_id: TARGET_ID, max_nodes: 501 }),
    request("session.hello", { supported_versions: [] }),
    request("scout.reload", { force: true })
  ];
  for (const envelope of bad) {
    const response = await dispatch(envelope);
    assert.equal(response.ok, false, `tham số sai lọt qua: ${JSON.stringify(envelope.params)}`);
    assert.ok(["INVALID_PARAMS", "UNSUPPORTED_VERSION"].includes(response.error.code), response.error.code);
  }
  assert.deepEqual(engine.calls, [], "tham số sai không được chạm tới engine");
}

/* ---- ⑤ Selector là DỮ LIỆU, đi qua nguyên văn --------------------------- */
{
  const { dispatch, engine } = makeSeed();
  const response = await dispatch(request("scout.query", { target_id: TARGET_ID, selector: POISON }));
  assert.equal(response.ok, true, "selector độc phải đi tới lõi dưới dạng dữ liệu, không bị chặn ở đây");
  assert.equal(engine.calls[0].params.selector, POISON, "selector bị sửa trên đường đi");
}

/* ---- ⑥ Phép dò hỏng KHÔNG được mặc vỏ thành công ------------------------ */
{
  const { dispatch } = makeSeed({ fail: true });
  const response = await dispatch(request("scout.query", { target_id: TARGET_ID, selector: "button" }));
  assert.equal(response.ok, false, "phép dò hỏng mà phong bì vẫn ok:true");
  assert.equal(response.error.code, "PROBE_FAILED");
  assert.equal(response.error.details.probe_code, "SELECTOR_INVALID");
}

/* ---- ⑥b S-01: HÀNH ĐỘNG hỏng cũng KHÔNG được mặc vỏ thành công ---------
 * Ở đường đọc, một thất bại bị bỏ qua nghĩa là đọc hụt. Ở đường GHI, nó nghĩa là AI ở đầu dây
 * tưởng đã bấm được trong khi chưa bấm gì, rồi đi tiếp bước sau — đắt hơn hẳn. */
{
  const { dispatch, engine } = makeSeed({ failAction: true });
  for (const [method, params] of [
    ["scout.click", { target_id: TARGET_ID, selector: "button" }],
    ["scout.type", { target_id: TARGET_ID, selector: "#txt", text: "abc" }],
    ["scout.key", { target_id: TARGET_ID, selector: "#txt", key: "Enter" }]
  ]) {
    const response = await dispatch(request(method, params));
    assert.equal(response.ok, false, `${method}: hành động hỏng mà phong bì vẫn ok:true`);
    assert.equal(response.error.code, "ACTION_FAILED");
    assert.equal(response.error.details.action_code, "SELECTOR_AMBIGUOUS");
  }
  /* Chiều NGƯỢC LẠI: hành động chạy được thì phải ra ok:true, và đúng ba tên hành động tới lõi. */
  const good = makeSeed();
  const ok = [
    await good.dispatch(request("scout.click", { target_id: TARGET_ID, selector: "button" })),
    await good.dispatch(request("scout.type", { target_id: TARGET_ID, selector: "#txt", text: "abc" })),
    await good.dispatch(request("scout.key", { target_id: TARGET_ID, selector: "#txt", key: "Enter" }))
  ];
  for (const response of ok) assert.equal(response.ok, true, `hành động hợp lệ bị chặn: ${JSON.stringify(response.error || {})}`);
  const ghi = good.engine.calls.filter((call) => call.ghi);
  assert.deepEqual(ghi.map((call) => call.name), ["input.click", "input.type", "input.key"]);
  for (const call of ghi) assert.ok(EXPECTED_ACTIONS.has(call.name), `tên hành động lạ: ${call.name}`);
  /* Tham số đi tới nơi nguyên vẹn, không bị nuốt. */
  assert.deepEqual(ghi[1].params, { selector: "#txt", text: "abc" });
  assert.deepEqual(ghi[2].params, { selector: "#txt", key: "Enter" });
  assert.equal(engine.calls.length, 3, "mỗi lượt hỏng vẫn phải gọi đúng một lượt tới lõi");
}

/* ---- ⑦ Target không có thì nói thẳng, không dò bừa ---------------------- */
{
  const { dispatch, engine } = makeSeed();
  const response = await dispatch(request("scout.page", { target_id: "KHONG-CO" }));
  assert.equal(response.ok, false);
  assert.equal(response.error.details.probe_code, "TARGET_NOT_FOUND");
  assert.deepEqual(engine.calls, [], "target không có mà vẫn gọi phép dò");
}

/* ---- ⑧ Khả năng ③: tự nạp lại mình -------------------------------------- */
{
  const { dispatch, chromeApi, timers } = makeSeed();

  const response = await dispatch(request("scout.reload"));
  assert.equal(response.ok, true, JSON.stringify(response.error || {}));
  assert.equal(response.result.reloading, true);

  /* Trả lời TRƯỚC, nạp lại SAU: lúc phong bì đã dựng xong thì chưa ai gọi reload. */
  assert.deepEqual(chromeApi.reloads, [], "reload chạy trước khi phản hồi kịp rời tay");
  assert.equal(timers.pending.length, 1, "reload phải được hẹn giờ, không gọi thẳng");
  timers.fireAll();
  assert.equal(chromeApi.reloads.length, 1, "reload phải chạy đúng một lần");

  /* Trần chống bão: lượt thứ hai trong 10 giây bị từ chối. */
  const again = await dispatch(request("scout.reload"));
  assert.equal(again.ok, false, "hai lượt nạp lại liền nhau phải bị chặn");
  assert.equal(again.error.code, "RELOAD_RATE_LIMIT");
  timers.fireAll();
  assert.equal(chromeApi.reloads.length, 1, "lượt bị chặn vẫn gọi reload");

  /* Chiều ngược lại: qua trần rồi thì KHÔNG bị chặn nữa. */
  clockMs += SEED_CONSTANTS.RELOAD_MIN_GAP_MS + 1;
  const later = await dispatch(request("scout.reload"));
  assert.equal(later.ok, true, "quá trần rồi mà vẫn bị chặn: trần này chặn oan");
  timers.fireAll();
  assert.equal(chromeApi.reloads.length, 2);
  clockMs = Date.parse("2026-09-06T10:00:00Z");
}

/* ---- ⑧b Mốc chống bão phải ghi XONG rồi mới trả lời ---------------------
 * Sau `runtime.reload()` không còn ai ghi được nữa, nên một mốc chưa kịp ghi là một trần chưa
 * từng tồn tại — và lần chạy tới sẽ cho nạp lại ngay, đúng cái vòng quay tít mà trần này sinh
 * ra để cắt. Ghim bằng một kho lưu CHẬM: bản đúng phải còn treo, bản buông tay sẽ trả lời xong
 * trước khi mốc kịp xuống đĩa. */
{
  const chromeApi = makeChrome();
  let releaseSet = null;
  const baseSet = chromeApi.storage.local.set;
  chromeApi.storage.local.set = async (patch) => {
    await new Promise((resolve) => { releaseSet = resolve; });
    return baseSet(patch);
  };

  const { dispatch, timers } = makeSeed({}, chromeApi);
  let settled = false;
  const pending = dispatch(request("scout.reload")).then((response) => { settled = true; return response; });

  await flush();
  assert.equal(settled, false, "trả lời xong trước khi mốc chống bão kịp ghi");
  assert.equal(timers.pending.length, 0, "hẹn giờ nạp lại được lên trước khi mốc kịp ghi");

  releaseSet();
  const response = await pending;
  assert.equal(response.ok, true, JSON.stringify(response.error || {}));
  assert.equal(chromeApi.store[SEED_CONSTANTS.RELOAD_STORAGE_KEY], Date.parse("2026-09-06T10:00:00Z"));
}

/* ---- ⑨ Không method nào thiếu tay, và handler ném thì thành phong bì ----- */
{
  assert.throws(() => core.createDispatcher({ handlers: {} }), /missing handlers/i,
    "bảng method thiếu handler phải chết lúc dựng, không phải lúc có người gọi");

  const handlers = Object.fromEntries(EXPECTED_METHODS.map((name) => [name, async () => ({})]));
  handlers["system.ping"] = async () => { throw new Error("bể trong ruột"); };
  const dispatch = core.createDispatcher({ handlers, now });
  const envelope = request("system.ping");
  const response = await dispatch(envelope);
  assert.equal(response.ok, false);
  assert.equal(response.error.code, "INTERNAL_ERROR");
  /* Phải trả lại ĐÚNG request_id: máy chủ đối chiếu bằng nó, và một phản hồi lệch id bị coi là
   * không tương ứng rồi thay bằng lỗi chung (`bridge-host.mjs:207`), nên nguyên nhân thật mất. */
  assert.equal(response.request_id, envelope.request_id);
  assert.ok(response.error.details.message.includes("bể trong ruột"));
}

/* ---- ⑩ Ánh xạ method → phép dò là DỮ LIỆU, phủ đủ bốn ------------------- */
{
  assert.deepEqual(new Set(Object.values(SEED_CONSTANTS.PROBE_BY_METHOD)), EXPECTED_PROBES);
  assert.equal(Object.keys(SEED_CONSTANTS.PROBE_BY_METHOD).length, 4);
}

console.log("scouter-bridge smoke tests: PASS");

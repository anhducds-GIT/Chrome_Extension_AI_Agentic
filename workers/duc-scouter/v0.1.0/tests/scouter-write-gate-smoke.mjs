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
const LFT = String.fromCharCode(10);

const { createSeedHandlers, setWriteGate, readWriteGateState, SEED_CONSTANTS } =
  await import("../scripts/scouter-seed-core.mjs");
const { BridgeProtocolError, negotiateVersion, capabilities, MAX_ENVELOPE_BYTES } =
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
  /* Ghi lại MỌI lượt gọi mạng, kể cả lượt bị chặn — vì thứ đáng ghim nhất ở đây là lượt gọi
   * KHÔNG xảy ra. Mặc định trả 200 rỗng; test nào cần khác thì đưa `fetchImpl`. */
  const fetchCalls = [];
  const doFetch = options.fetchImpl || (async (url, init) => {
    fetchCalls.push({ url, init });
    return {
      status: 200, ok: true, url, headers: new Map([["content-type", "application/json"]]),
      text: async () => "{}"
    };
  });
  const wrapped = async (url, init) => {
    if (options.fetchImpl) fetchCalls.push({ url, init });
    return await doFetch(url, init);
  };
  const handlers = createSeedHandlers({
    engine, chromeApi, BridgeProtocolError, negotiateVersion, capabilities,
    timers: { setTimeout: () => 0 }, fetch: wrapped
  });
  return { handlers, engine, chromeApi, fetchCalls };
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
 * `alarms` vào ngày 07/09 theo chốt S-02 (lưới đỡ đánh thức service worker đã ngủ);
 * `sidePanel` cùng ngày theo chốt của Đức: gói đổi vỏ từ popup sang bảng bên (S-09). */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  assert.deepEqual([...manifest.permissions].sort(), ["alarms", "debugger", "sidePanel", "storage"]);
  /* `<all_urls>` — Đức chốt 07/09: *"tôi muốn mở tất cả quyền cho seed & Scouter & bridge ...
   * để không bị giới hạn case by case của các web khác nhau"*. Ghi ở ADR-0003 của gói.
   * `http://127.0.0.1/*` GIỮ LẠI dù trông như đã bị `<all_urls>` phủ: `<all_urls>` không phủ
   * `ws:`, mà cửa Bridge là WebSocket tới 127.0.0.1. Gộp cho gọn là đánh cược vào một chi tiết
   * của Chrome mà không ai ở đây đo được. */
  assert.deepEqual(manifest.host_permissions, ["<all_urls>", "http://127.0.0.1/*"]);
  /* MỞ VÙNG ĐÍCH THÌ PHẢI SIẾT VÙNG HÌNH DẠNG — nếu không, lượt chốt trên là lớp cuối cùng.
   * Ba thứ dưới đây là cái còn lại sau khi `<all_urls>` bỏ hàng rào theo từng trang, nên chúng
   * KHÔNG phải chi tiết cài đặt: gỡ cái nào cũng là gỡ một chốt, không phải dọn code. */
  {
    const bridge = fs.readFileSync(path.join(here, "..", "scripts", "scouter-bridge-core.mjs"), "utf8");
    const seed = fs.readFileSync(path.join(here, "..", "scripts", "scouter-seed-core.mjs"), "utf8");
    assert.match(bridge, /name: "scout\.fetch", read_only: false/,
      "scout.fetch phai read_only:false — do la thu bat no chui qua phanh");
    assert.match(seed, /credentials: params\.with_credentials \? "include" : "omit"/,
      "mac dinh phai la omit: mot luot goi kem cookie doc duoc moi trang Duc dang dang nhap");
    assert.match(bridge, /FORBIDDEN_HEADERS = Object\.freeze\(\["cookie", "authorization"\]\)/,
      "khong duoc nhan hai header nay tu nguoi goi");
  }
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

/* ---- ⑮ Icon khai trong manifest phải CÓ THẬT ---------------------------
 * Ở nhờ file này, và nói rõ vì sao: khối ⑭ đã mở và đọc `manifest.json` rồi, nên dựng hẳn một
 * file phép ghim thứ hai chỉ để `assert` bốn đường dẫn thì phần khung tốn hơn phần đo.
 * Đáng canh vì đây là hỏng IM LẶNG: manifest trỏ hụt một file icon thì Chrome không báo gì, nó
 * chỉ lặng lẽ quay về mảnh ghép xám mặc định — và người ta sẽ đi sửa nhầm chỗ khác. */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  const duongDan = new Set([
    ...Object.values(manifest.icons || {}),
    ...Object.values(manifest.action?.default_icon || {})
  ]);
  assert.ok(duongDan.size > 0, "manifest khong khai icon nao — Chrome se hien manh ghep xam");
  for (const duong of duongDan) {
    assert.ok(fs.existsSync(path.join(here, "..", duong)), `manifest tro toi '${duong}' nhung file khong co that`);
  }
  /* Bốn cỡ Chrome thật sự dùng: 16 thanh công cụ · 32 Windows · 48 trang quản lý · 128 cửa hàng.
   * Thiếu cỡ nào thì Chrome tự phóng cỡ khác lên, và chữ S sẽ nhoè đúng ở chỗ hay nhìn nhất. */
  for (const co of ["16", "32", "48", "128"]) {
    assert.ok(manifest.icons?.[co], `thieu icon co ${co}`);
    assert.ok(manifest.action?.default_icon?.[co], `thieu default_icon co ${co}`);
  }
}

/* ---- (16) Vo giao dien la BANG BEN, va ca ba manh phai co mat cung luc ----
 * Hỏng im lặng y như khối ⑮, nhưng tệ hơn một bậc: bỏ `default_popup` khỏi manifest là bỏ luôn
 * hành vi mặc định của nút icon. Thiếu `setPanelBehavior` trong dây thật thì bấm icon KHÔNG mở
 * gì cả — không lỗi, không thông báo, nhìn ra ngoài giống hệt "extension chết".
 *
 * Ghim CẢ BA mảnh vì thiếu mảnh nào cũng ra một kiểu hỏng khác nhau:
 *   thiếu khai `side_panel`  → Chrome không biết mở trang nào
 *   thiếu `setPanelBehavior` → bấm icon không phản ứng
 *   còn `default_popup`      → popup thắng, bảng bên không bao giờ mở, và cái phanh lại chết
 *                              theo tiêu điểm — đúng lỗi mà lượt đổi vỏ này sinh ra để sửa */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  assert.equal(manifest.side_panel?.default_path, "sidepanel.html", "manifest chua khai trang bang ben");
  assert.ok(fs.existsSync(path.join(here, "..", "sidepanel.html")), "trang bang ben khong co that");
  assert.equal(manifest.action?.default_popup, undefined,
    "con default_popup thi popup thang, bang ben khong bao gio mo");

  const background = fs.readFileSync(path.join(here, "..", "scouter-background.js"), "utf8");
  assert.match(background, /sidePanel\.setPanelBehavior/,
    "thieu setPanelBehavior — bam icon se KHONG mo gi ca");
  assert.match(background, /openPanelOnActionClick:\s*true/);

  /* DÂY THẬT KHÔNG CÓ NHÁNH CHẾT. Con `R3` sống sót lượt đầu vì nó không xoá lời gọi — nó bọc
   * `if (false)` quanh lời gọi, và một phép ghim chỉ soi "chuỗi có mặt không" thì mù trước
   * kiểu sửa đó. Đây là kiểu sửa THẬT: người ta tắt một đường lúc gỡ lỗi rồi quên bật lại.
   * `scouter-background.js` cố ý chỉ là nối dây, nên một nhánh luôn-sai trong đây LUÔN là dấu
   * vết của một đường bị tắt mà không xoá. Bắt cả lớp đó, đừng vá từng con.
   * Nó KHÔNG bắt được: xoá hẳn lời gọi (hai phép khẳng định trên bắt) · đổi tên hàm rồi không
   * gọi (chưa ai canh — nếu tới lượt đó thì cần một phép đo mở Chrome thật). */
  for (const nhanhChet of [/if\s*\(\s*false/, /if\s*\(\s*0\s*\)/, /&&\s*false/, /false\s*&&/]) {
    assert.ok(!nhanhChet.test(background),
      `scouter-background.js co nhanh chet ${nhanhChet} — day that khong duoc co nhanh`);
  }

  /* Không còn file `popup.*` nào sót lại: hai vỏ cùng tồn tại là hai chỗ để sửa và một chỗ để
   * quên. Lượt đổi vỏ dùng `git mv`, nên sót lại nghĩa là ai đó đã copy-rồi-xoá. */
  for (const cu of ["popup.html", "popup.js", "popup.css"]) {
    assert.ok(!fs.existsSync(path.join(here, "..", cu)), `con sot ${cu} — hai vo cung ton tai`);
  }
}

/* ---- ⑰ `scout.fetch` trả đúng cái giá của một lệnh GHI (S-10) -----------
 * Đức mở `<all_urls>` ngày 07/09 (ADR-0003 của gói). Từ lúc đó, phanh KHÔNG còn là lớp phụ —
 * nó là thứ duy nhất đứng giữa một lượt gọi sai và mọi trang Đức đang đăng nhập. Nên năm chốt
 * dưới đây canh HÀNH VI, không canh khai báo: khối ⑭ đã ghim rằng cờ và mặc định được VIẾT
 * đúng, khối này ghim rằng chúng CHẠY đúng. Hai câu hỏi khác nhau, và câu thứ hai mới là câu
 * người dùng gặp.
 *
 * FETCH_ERR: mạng hỏng. Dựng riêng vì đây là đường mà lượt trừ ngân sách dễ bị bỏ quên nhất. */
{
  const URL_OK = "https://vi-du.test/du-lieu";

  /* ⒜ Công tắc TẮT thì không gọi mạng — và "không gọi" phải đo bằng số lượt gọi thật, không
   * đo bằng việc có ném lỗi hay không. Một bản vá chặn SAU lượt gọi vẫn ném đúng lỗi đó. */
  {
    const { handlers, fetchCalls } = makeHandlers(undefined);
    const error = await refusal(() => handlers["scout.fetch"]({
      url: URL_OK, method: "GET", headers: {}, body: null, with_credentials: false
    }));
    assert.equal(error.code, "WRITE_BLOCKED");
    assert.equal(error.details.write_code, "DEV_MODE_OFF");
    assert.equal(fetchCalls.length, 0, "bi chan roi ma van goi ra mang");
  }

  /* ⒝ GỌI HỤT VẪN TỐN MỘT LƯỢT. Nếu không, một vòng lặp gọi vào một tên miền chết sẽ quay mãi
   * mà trần 50 không bao giờ chạm — tức cái trần không tồn tại. Cùng lý do với chốt ⑶ của lõi. */
  {
    const { handlers, chromeApi } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, {
      fetchImpl: async () => { throw new TypeError("fetch failed"); }
    });
    const error = await refusal(() => handlers["scout.fetch"]({
      url: URL_OK, method: "GET", headers: {}, body: null, with_credentials: false
    }));
    assert.equal(error.code, "ACTION_FAILED");
    assert.equal(error.details.action_code, "FETCH_FAILED");
    assert.equal(chromeApi.store[GATE_KEY].used, 1, "goi hut ma khong tru ngan sach");
  }

  /* ⒞ MẶC ĐỊNH KHÔNG KÈM DANH TÍNH. Đây là chốt đắt nhất của cả method: `include` mặc định
   * nghĩa là một lượt gọi bất kỳ đọc được nội dung sau đăng nhập của trang bất kỳ. */
  {
    const { handlers, fetchCalls } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 });
    await handlers["scout.fetch"]({ url: URL_OK, method: "GET", headers: {}, body: null, with_credentials: false });
    assert.equal(fetchCalls[0].init.credentials, "omit", "mac dinh phai la omit");

    const xin = makeHandlers({ enabled: true, enabled_at: 1, used: 0 });
    await xin.handlers["scout.fetch"]({ url: URL_OK, method: "GET", headers: {}, body: null, with_credentials: true });
    assert.equal(xin.fetchCalls[0].init.credentials, "include", "xin tuong minh thi phai duoc kem danh tinh");
  }

  /* ⒟ THÂN QUÁ TRẦN THÌ ĐỎ, KHÔNG CẮT. Cắt rồi trả về im lặng là đưa người gọi nửa file JSON
   * và để họ đi tìm bug ở chỗ không có bug. Đo bằng byte UTF-8, không đo bằng `length`: một
   * trang tiếng Việt có dấu nặng gấp rưỡi số ký tự, và trần phong bì tính theo byte. */
  {
    const qua = "đ".repeat(400 * 1024);            // 400k ký tự → 800k byte UTF-8
    const { handlers } = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, {
      fetchImpl: async (url) => ({
        status: 200, ok: true, url, headers: new Map(), text: async () => qua
      })
    });
    const error = await refusal(() => handlers["scout.fetch"]({
      url: URL_OK, method: "GET", headers: {}, body: null, with_credentials: false
    }));
    assert.equal(error.details.action_code, "FETCH_BODY_TOO_LARGE");
    assert.ok(error.details.bytes > SEED_CONSTANTS.FETCH_MAX_BODY_BYTES, "phai bao so byte that");
  }

  /* ⒠ TRẦN THÂN PHẢI DƯỚI TRẦN PHONG BÌ. Hai hằng số ở hai file, và chúng chỉ đúng khi đứng
   * cạnh nhau — bằng nhau là chạm trần vận chuyển, và lúc đó lượt gọi chết ở tầng dưới với một
   * câu không ai lần ra được. */
  assert.ok(SEED_CONSTANTS.FETCH_MAX_BODY_BYTES < MAX_ENVELOPE_BYTES,
    "tran than phai NHO HON tran phong bi, de con cho cho phan vo");
}

/* ---- ⑧ PHANH KHẨN — cái phanh phải với tới được khi bảng đã đóng ---------
 * Mục 9 của `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`. Ở đó nó là một điều NÊN có;
 * từ khi Đức mở `<all_urls>` (ADR-0003) nó là NGHĨA VỤ — công tắc trong bảng bên là cái
 * phanh DUY NHẤT, mà bảng đóng thì không có đường nào tắt nó.
 *
 * Ghim CẢ BA mảnh, vì thiếu mảnh nào thì cả cái phanh là giả và nó hỏng IM LẶNG: khai
 * phím trong manifest · có người nghe trong dây thật · và người nghe đó gọi `false`.
 * Con `N5` `N6` canh đúng ba mảnh này. */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(here, "..", "manifest.json"), "utf8"));
  const lenh = manifest.commands?.["dung-khan"];
  assert.ok(lenh, "manifest chua khai phim tat dung-khan");
  assert.ok(lenh.suggested_key?.default, "phim tat khong co phim mac dinh thi Duc phai tu di dat");

  const background = fs.readFileSync(path.join(here, "..", "scouter-background.js"), "utf8");
  assert.match(background, /chrome\.commands\.onCommand\.addListener/,
    "khai phim trong manifest ma khong ai nghe = quyen thua, phanh khong ton tai");
  assert.match(background, /setWriteGate\(chrome, false\)/,
    "phanh phai TAT cong tac; goi true la bam phanh hoa ra dap ga");
  assert.ok(!/setWriteGate\(chrome, true\)/.test(background),
    "day that KHONG duoc co duong BAT cong tac tu phim tat");

  /* Dùng CHÍNH hàm mà bảng bên dùng, không tự dựng bản thứ hai: hai bản của một luật thì
   * sớm muộn trả hai câu khác nhau (ADR-0006 đã ghi cái giá). */
  const chrome = makeChrome({ enabled: true, enabled_at: 1, used: 7 });
  await setWriteGate(chrome, false);
  const sau = await readWriteGateState(chrome);
  assert.equal(sau.enabled, false, "tat roi ma van bao dang bat");
}

/* ---- ⑲ CÂU CHỈ ĐƯỜNG PHẢI CHỈ ĐÚNG CỬA (S-14) ---------------------------
 *
 * Nổ thật 08/09: hết hạn mức ghi giữa lượt tải PDF, câu báo lỗi nói *"tắt rồi bật lại công
 * tắc trong POPUP"* — nhưng Scouter không có popup, công tắc nằm ở BẢNG BÊN. Đức phải hỏi lại
 * công tắc ở đâu.
 *
 * Nhỏ, nhưng đúng loại lỗi đắt nhất với người dùng: một câu hướng dẫn CHỈ SAI CHỖ thì người
 * đọc đi tìm nhầm cửa sổ rồi kết luận là công cụ hỏng.
 *
 * Ghim ĐỌC NHÃN THẬT TỪ `sidepanel.html`, không gõ lại chuỗi vào đây — gõ lại là dựng bản sao
 * thứ hai của một cái tên, và hai bản sẽ lệch đúng như đã lệch lần này.
 */
{
  const html = fs.readFileSync(path.join(here, "..", "sidepanel.html"), "utf8");
  const khop = html.match(/id="gate-heading"[^>]*>([^<]+)</);
  assert.ok(khop, "không đọc được nhãn công tắc từ sidepanel.html — ghim này mất chỗ dựa");
  const nhan = khop[1].trim();
  assert.equal(nhan, "Cho phép bấm và gõ", "nhãn công tắc đổi: sửa cả ba câu báo lỗi cho khớp");

  const nguon = fs.readFileSync(path.join(here, "..", "scripts", "scouter-seed-core.mjs"), "utf8");

  /* ⑴ Không được nhắc tới một cửa KHÔNG tồn tại. */
  assert.ok(!/popup/i.test(nguon),
    "scouter-seed-core.mjs còn nhắc 'popup' — Scouter không có popup, công tắc ở bảng bên");

  /* ⑵ Cả ba câu về công tắc phải gọi ĐÚNG TÊN nhãn thật. */
  for (const ma of ["DEV_MODE_OFF", "GATE_CORRUPT", "WRITE_CAP_REACHED"]) {
    const dong = nguon.split(LFT).find((x) => x.includes(ma + ":"));
    assert.ok(dong, `không thấy câu báo lỗi cho ${ma}`);
    assert.ok(dong.includes(nhan),
      `câu ${ma} không gọi đúng tên công tắc ("${nhan}") — người đọc sẽ đi tìm nhầm chỗ`);
    assert.ok(/BẢNG BÊN/.test(dong),
      `câu ${ma} không nói rõ công tắc nằm ở BẢNG BÊN`);
  }

  /* ⑶ Chữ Đức đọc thì phải CÓ DẤU (luật vàng 5). Mã lỗi giữ tiếng Anh, phần còn lại tiếng Việt.
   * Trước 08/09 ba câu này viết không dấu, lệch với chính chú thích trong cùng file. */
  for (const ma of ["DEV_MODE_OFF", "GATE_CORRUPT", "WRITE_CAP_REACHED"]) {
    const dong = nguon.split(LFT).find((x) => x.includes(ma + ":"));
    assert.match(dong, /[ắằẳẵặăâấầẩẫậêếềểễệôốồổỗộơớờởỡợưứừửữựđáàảãạéèẻẽẹíìỉĩịóòỏõọúùủũụýỳỷỹỵ]/,
      `câu ${ma} viết không dấu — đây là chữ Đức đọc, không phải mã lỗi`);
  }
}

console.log("scouter-write-gate-smoke: 19 khoi, tat ca DAT");

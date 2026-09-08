/* be-mat-hep-smoke.mjs — GHIM LỜI HỨA LỚN NHẤT của HNX Fetch: nó KHÔNG bấm được.
 *
 * Cả gói này tồn tại vì một phép đo: toàn bộ việc lấy dữ liệu HNX chạy trên ĐÚNG MỘT method
 * (`scout.fetch`), và method đó không cần `chrome.debugger`. Nên extension này bỏ hẳn quyền
 * debugger, bỏ hẳn đường DOM. Đó là một lời hứa — và một lời hứa không có phép ghim đứng sau
 * thì nó chỉ sống tới lần sửa vội tiếp theo.
 *
 * Bốn khối dưới đây canh bốn cách lời hứa đó có thể chết:
 *   ⑴ ai đó nối lại một method ghi vào từ vựng;
 *   ⑵ ai đó khai lại quyền `debugger` trong manifest;
 *   ⑶ ai đó gỡ cái phanh, hoặc để `scout.fetch` đi vòng qua nó;
 *   ⑷ hai tệp lõi chép từ Scouter trôi khỏi bản gốc mà không ai biết.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const goc = path.join(here, "..");

const { capabilities, createDispatcher, BridgeProtocolError, negotiateVersion, PROTOCOL, METHOD_NAMES } =
  await import("../scripts/bridge-core.mjs");
const { createSeedHandlers, setWriteGate, readWriteGateState, SEED_CONSTANTS } =
  await import("../scripts/fetch-core.mjs");

/* ---- Đồ giả -------------------------------------------------------------- */

function makeChrome(gate) {
  const store = Object.create(null);
  if (gate !== undefined) store[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY] = gate;
  return {
    store,
    runtime: { id: "hnx-fetch-gia" },
    storage: {
      local: {
        async get(keys) {
          const ra = {};
          for (const k of [].concat(keys)) if (k in store) ra[k] = store[k];
          return ra;
        },
        async set(o) { Object.assign(store, o); }
      }
    }
  };
}

function makeHandlers(gate, doFetch) {
  const chromeApi = makeChrome(gate);
  const handlers = createSeedHandlers({
    chromeApi, BridgeProtocolError, negotiateVersion, capabilities,
    fetch: doFetch || (async () => { throw new Error("lượt gọi mạng không được phép xảy ra ở đây"); })
  });
  return { chromeApi, handlers };
}

async function tuChoi(fn) {
  try { await fn(); }
  catch (e) { return e; }
  throw new assert.AssertionError({ message: "đáng lẽ phải bị từ chối, nhưng nó chạy qua" });
}

/* ---- ⑴ TỪ VỰNG ĐÓNG: đúng bốn method, và không cái nào bấm được ----------
 * Đây là khối chịu lực. `system.capabilities` là thứ AI ở đầu dây đọc để biết nó làm được gì —
 * nên bảng đó KHÔNG được chứa một lệnh bấm nào, kể cả một lệnh "chưa nối tay". */
{
  const MONG_DOI = ["session.hello", "system.capabilities", "system.ping", "scout.fetch"];
  assert.deepEqual([...METHOD_NAMES], MONG_DOI, "từ vựng đã đổi — đọc lại ADR-0001 của gói trước khi sửa test này");

  const ban = capabilities();
  assert.equal(ban.protocol, "hnx-fetch.bridge",
    "giao thức phải mang tên của CHÍNH sản phẩm này, không dùng chung tên với Scouter");
  assert.equal(ban.seed, "hnx-fetch-v0.1");
  assert.deepEqual(ban.methods.map((m) => m.name), MONG_DOI, "bảng năng lực lệch với từ vựng");

  /* Danh sách CẤM, không phải danh sách cho phép: một method bấm mang tên khác mai sau vẫn phải
   * bị bắt, nên khối trên đã khoá bằng deepEqual. Khối này nói rõ CÁI GÌ không được có, để câu
   * lỗi chỉ thẳng vào chỗ sai thay vì chỉ báo "danh sách khác rồi". */
  for (const cam of ["scout.click", "scout.type", "scout.key", "scout.navigate", "scout.reload",
                     "scout.targets", "scout.page", "scout.query", "scout.tree", "scout.a11y", "scout.shot"]) {
    assert.ok(!METHOD_NAMES.includes(cam), `${cam} KHÔNG được có mặt trong HNX Fetch`);
  }

  /* `scout.fetch` là method GHI duy nhất. Nếu một ngày có method ghi thứ hai, nó phải được nối
   * vào `spendWriteBudget()` — và khối ⑶ dưới đây sẽ đỏ nếu ai quên. */
  const ghi = ban.methods.filter((m) => m.read_only === false).map((m) => m.name);
  assert.deepEqual(ghi, ["scout.fetch"], "có method ghi thứ hai — nó đã được nối vào cái phanh chưa?");

  /* Dispatcher dựng được với đúng bốn tay này, và TỪ CHỐI một method lạ. Từ chối vì method
   * KHÔNG TỒN TẠI, khác hẳn với "tồn tại nhưng đang bị chặn": cái sau thì bật lại được. */
  const { handlers } = makeHandlers({ enabled: false });
  const dispatch = createDispatcher({ handlers });
  const tra = await dispatch({
    protocol: PROTOCOL, version: 1, kind: "request", request_id: "req-scout-click-1",
    sent_at: new Date().toISOString(), client: { client_id: "phep-ghim" },
    method: "scout.click", params: { selector: "button" }
  });
  assert.equal(tra.ok, false);
  assert.equal(tra.error.code, "METHOD_NOT_FOUND", "scout.click phải là method KHÔNG TỒN TẠI ở đây");
}

/* ---- ⑵ MANIFEST: không có `debugger`, và vùng đích hẹp ------------------
 * Quyền là TRẦN chứ không phải sàn. Khai `debugger` ở đây là mở lại đúng cánh cửa mà cả gói
 * sinh ra để đóng — và Chrome sẽ dựng dải băng "đang gỡ lỗi trình duyệt này" trên tab của Đức. */
{
  const manifest = JSON.parse(fs.readFileSync(path.join(goc, "manifest.json"), "utf8"));
  assert.equal(manifest.name, "HNX Fetch");
  assert.deepEqual([...manifest.permissions].sort(), ["alarms", "sidePanel", "storage"],
    "quyền đã đổi — `debugger` KHÔNG được có mặt");
  assert.ok(!manifest.permissions.includes("debugger"), "khai `debugger` là bỏ lời hứa lớn nhất của gói");
  assert.ok(!JSON.stringify(manifest.host_permissions).includes("all_urls"),
    "`<all_urls>` là của Scouter. Gói này chỉ chạm hnx.vn và máy chủ Bridge tại chỗ");
  assert.deepEqual(manifest.host_permissions,
    ["https://hnx.vn/*", "https://*.hnx.vn/*", "http://127.0.0.1/*"]);
  /* `http://127.0.0.1/*` GIỮ LẠI dù trông thừa: cửa Bridge là WebSocket (`ws:`), mà `ws:` không
   * nằm trong vùng của một mục `https:` nào. Gộp cho gọn là đánh cược vào một chi tiết của
   * Chrome mà không ai ở đây đo được. */
  assert.equal(manifest.background.service_worker, "background.js");
  assert.equal(manifest.side_panel.default_path, "sidepanel.html");
}

/* ---- ⑶ CÁI PHANH vẫn đứng trước `scout.fetch` --------------------------- */
{
  /* Tắt công tắc → từ chối, và KHÔNG gọi mạng. `doFetch` ném nếu bị gọi, nên nếu lượt gọi lọt
   * qua thì test này đỏ với một câu khác — và cả hai câu đều đúng chỗ. */
  const tat = makeHandlers({ enabled: false });
  const loi = await tuChoi(() => tat.handlers["scout.fetch"]({ url: "https://hnx.vn/" }));
  assert.equal(loi.details.write_code, "DEV_MODE_OFF");

  /* Không có bản ghi công tắc nào (lần chạy đầu) cũng phải là ĐÓNG. "Không biết" xử như
   * "chưa mở" — một cái phanh mở ra khi thiếu dữ liệu thì không phải phanh. */
  const trang = makeHandlers(undefined);
  assert.equal((await tuChoi(() => trang.handlers["scout.fetch"]({ url: "https://hnx.vn/" }))).details.write_code,
    "DEV_MODE_OFF");

  /* Trần là 200, GÕ CỨNG. Bản ghi trong kho lưu khai `cap_per_unlock: 9999` không được nghe
   * theo: trần đọc từ chỗ mà kẻ bị chặn ghi được thì nó không phải là trần. (ADR-0005) */
  assert.equal(SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK, 200);
  const het = makeHandlers({ enabled: true, enabled_at: 1, used: 200, cap_per_unlock: 9999 });
  assert.equal((await tuChoi(() => het.handlers["scout.fetch"]({ url: "https://hnx.vn/" }))).details.write_code,
    "WRITE_CAP_REACHED");

  /* Mở khoá thì đi được, và ngân sách TRỪ THẬT — trừ trước, gọi sau. */
  let daGoi = 0;
  const mo = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, async () => {
    daGoi += 1;
    return { ok: true, status: 200, url: "https://hnx.vn/", headers: new Map([["content-type", "text/html; charset=utf-8"]]),
      text: async () => "xin chao", arrayBuffer: async () => new TextEncoder().encode("xin chao").buffer };
  });
  const ra = await mo.handlers["scout.fetch"]({ url: "https://hnx.vn/" });
  assert.equal(daGoi, 1);
  assert.equal(ra.write_budget.used, 1);
  assert.equal(ra.write_budget.remaining, 199);

  /* Một lượt gọi HỎNG vẫn tốn một lượt. Ngược lại thì một vòng lặp gọi hỏng quay mãi mà trần
   * không bao giờ chạm — tức cái trần không tồn tại. */
  const hong = makeHandlers({ enabled: true, enabled_at: 1, used: 0 }, async () => { throw new Error("mạng chết"); });
  await tuChoi(() => hong.handlers["scout.fetch"]({ url: "https://hnx.vn/" }));
  assert.equal((await readWriteGateState(hong.chromeApi)).used, 1, "lượt gọi hỏng phải vẫn bị trừ");

  /* Bật lại là NẠP LẠI ngân sách về 0 — đó là chỗ duy nhất ngân sách được cấp, và nó nằm trong
   * tay Đức chứ không trong tay AI. */
  const c = makeChrome({ enabled: true, enabled_at: 1, used: 77 });
  await setWriteGate(c, true);
  assert.equal((await readWriteGateState(c)).used, 0);
  await setWriteGate(c, false);
  assert.equal((await readWriteGateState(c)).enabled, false);
}

/* ---- ⑷ HAI TỆP CHÉP TỪ SCOUTER PHẢI CÒN GIỐNG BẢN GỐC -------------------
 * `transport.mjs` và `journal-core.mjs` là bản chép NGUYÊN VĂN của Scouter. Chép rồi để đó là
 * đúng cái bệnh của ba gói `duc-auto-*`: ba bản của một tệp, khác nhau cả ba, nên mỗi lỗi phải
 * sửa ba lần và một bản vá an toàn chỉ tới được một bản.
 *
 * Khối này không cấm hai bản khác nhau — nó cấm chúng khác nhau MÀ KHÔNG AI BIẾT. Muốn khác
 * thật thì khai vào `CO_Y_KHAC` kèm lý do, và lúc đó nó là một quyết định có chữ ký chứ không
 * phải một vệt trôi.
 *
 * `bridge-core.mjs` và `fetch-core.mjs` CỐ Ý không nằm ở đây: chúng là bản rút gọn thật (11
 * method bị cắt), và khối ⑴ đã canh đúng thứ đáng canh ở chúng — từ vựng. */
{
  const CO_Y_KHAC = Object.create(null);   /* tên tệp → lý do. Rỗng là đúng cho tới khi có lý do thật. */
  const nguon = path.join(goc, "..", "..", "duc-scouter", "v0.1.0", "scripts");
  const CAP = [
    ["transport.mjs", "scouter-transport-loopback.mjs"],
    ["journal-core.mjs", "scouter-journal-core.mjs"]
  ];
  const bam = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);

  for (const [tenDay, tenGoc] of CAP) {
    const banGoc = path.join(nguon, tenGoc);
    /* Bản gốc BIẾN MẤT thì ĐỎ, không lặng lẽ bỏ qua: một phép kiểm tự tắt khi mất mỏ neo đọc y
     * hệt một phép kiểm đang chạy tốt. Nếu Scouter thật sự đổi tên tệp thì sửa bảng CẶP ở trên. */
    assert.ok(fs.existsSync(banGoc), `không thấy bản gốc ${tenGoc} bên Scouter — sửa bảng CẶP, đừng bỏ khối này`);
    if (CO_Y_KHAC[tenDay]) continue;
    assert.equal(bam(path.join(goc, "scripts", tenDay)), bam(banGoc),
      `${tenDay} đã trôi khỏi bản gốc ${tenGoc}. Đồng bộ lại, HOẶC khai vào CO_Y_KHAC kèm lý do.`);
  }
}

console.log("be-mat-hep-smoke: 4 khoi, tat ca DAT");

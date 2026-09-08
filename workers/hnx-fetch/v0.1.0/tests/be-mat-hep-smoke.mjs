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
import os from "node:os";
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
  /* KHÔNG CHỈ `debugger`. Audit nội dung 08/09 chỉ đúng một chỗ tôi nói quá: bỏ `debugger`
   * KHÔNG tự nó chứng minh extension không bấm được — một extension còn hai đường khác để chạm
   * DOM, và cả hai đều KHÔNG đi qua danh sách `permissions`:
   *   · `content_scripts` — khai ở TẦNG NGOÀI CÙNG của manifest, tiêm thẳng mã vào trang;
   *   · `scripting` + `tabs` — tiêm mã lúc chạy.
   * Lời hứa chỉ đứng được khi **cả ba đều vắng**, nên phải khẳng định cả ba. Bản trước chỉ so
   * `permissions`, tức nó bỏ lọt đường thứ nhất hoàn toàn. */
  assert.ok(!("content_scripts" in manifest),
    "khai `content_scripts` là tiêm mã thẳng vào trang — đường đó KHÔNG đi qua danh sách permissions");
  for (const cam of ["scripting", "tabs", "activeTab", "webRequest", "declarativeNetRequest"]) {
    assert.ok(!manifest.permissions.includes(cam), `quyền ${cam} mở lại một đường chạm trang`);
  }
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

  /* HỎNG THÌ ĐÓNG. Đọc kho lưu mà NÉM thì cũng phải từ chối — "không biết Đức đã mở chưa"
   * phải được xử như "chưa mở". Một cái phanh mở ra khi hỏng thì không phải phanh, và ca này
   * KHÁC hẳn ca "chưa có bản ghi" ở trên: ở đây kho lưu còn không trả lời được. */
  {
    const noVo = {
      runtime: { id: "hnx-fetch-gia" },
      storage: { local: { async get() { throw new Error("kho luu chet"); }, async set() {} } }
    };
    const h = createSeedHandlers({
      chromeApi: noVo, BridgeProtocolError, negotiateVersion, capabilities,
      fetch: async () => { throw new Error("lượt gọi mạng không được phép xảy ra ở đây"); }
    });
    const e = await tuChoi(() => h["scout.fetch"]({ url: "https://hnx.vn/" }));
    assert.equal(e.details.write_code, "DEV_MODE_UNREADABLE");
    /* Và `readWriteGateState` — thứ bảng bên đọc — cũng phải nói TẮT, không được nói "không rõ".
     * Bảng nói một đằng mà đường ghi làm một nẻo là chỗ Đức mất lòng tin vào cả cái bảng. */
    assert.equal((await readWriteGateState(noVo)).enabled, false);
  }

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
  const scouter = path.join(goc, "..", "..", "duc-scouter", "v0.1.0");
  /* Đường dẫn ĐẦY ĐỦ hai bên, vì bản chép không phải lúc nào cũng nằm cùng thư mục với bản
   * gốc: `file-core.mjs` ở `bridge/`, hai tệp kia ở `scripts/`. Bảng rút gọn theo tên tệp đã
   * đúng khi chỉ có hai cặp và sai ngay khi có cặp thứ ba. */
  const CAP = [
    ["scripts/transport.mjs", "scripts/scouter-transport-loopback.mjs"],
    ["scripts/journal-core.mjs", "scripts/scouter-journal-core.mjs"],
    ["bridge/file-core.mjs", "bridge/file-core.mjs"]
  ];
  const bam = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);

  for (const [tenDay, tenGoc] of CAP) {
    const banGoc = path.join(scouter, ...tenGoc.split("/"));
    /* Bản gốc BIẾN MẤT thì ĐỎ, không lặng lẽ bỏ qua: một phép kiểm tự tắt khi mất mỏ neo đọc y
     * hệt một phép kiểm đang chạy tốt. Nếu Scouter thật sự đổi tên tệp thì sửa bảng CẶP ở trên. */
    assert.ok(fs.existsSync(banGoc), `không thấy bản gốc ${tenGoc} bên Scouter — sửa bảng CẶP, đừng bỏ khối này`);
    if (CO_Y_KHAC[tenDay]) continue;
    assert.equal(bam(path.join(goc, ...tenDay.split("/"))), bam(banGoc),
      `${tenDay} đã trôi khỏi bản gốc ${tenGoc}. Đồng bộ lại, HOẶC khai vào CO_Y_KHAC kèm lý do.`);
  }
}

/* ---- ⑸ HAI ĐẦU CỦA MỘT SỢI DÂY: tên giao thức phải khớp -------------------
 * Extension khai `PROTOCOL` ở `scripts/bridge-core.mjs`; máy chủ khai lại ở
 * `bridge/hnx-fetch-host.mjs`. Lõi máy chủ so tên đó trên MỌI phong bì, nên lệch một ký tự là
 * extension nối mãi không được — mà triệu chứng chỉ là *"Mất kết nối"*, **không có câu lỗi nào**
 * nói vì sao. Đây là dạng hỏng đắt nhất: nó trông y hệt máy chủ chưa bật.
 *
 * Đã xảy ra thật 08/09: Đức nạp extension mới rồi ghép cặp bằng tệp của Scouter — tệp hợp lệ,
 * cùng cổng, cùng token, và vẫn không nối được, vì máy chủ hôm đó nói `duc-scouter.bridge`. */
{
  const host = await import("../bridge/hnx-fetch-host.mjs");
  assert.equal(host.PROTOCOL, PROTOCOL,
    `máy chủ nói "${host.PROTOCOL}" còn extension nói "${PROTOCOL}" — bắt tay sẽ hỏng IM LẶNG`);
  assert.equal(PROTOCOL, "hnx-fetch.bridge",
    "và tên đó phải KHÁC Scouter, nếu không hai extension nhận nhầm lệnh của nhau");
}

/* ---- ⑹ ICON phải là icon của CHÍNH gói này -------------------------------
 * Bốn tệp PNG ban đầu được CHÉP từ Scouter lúc dựng gói. Đức chốt 08/09: *"đổi icon thành HNX,
 * không nhầm với extension scout. Màu text khác & background khác."*
 *
 * Một icon trùng Scouter không làm hỏng dòng mã nào — nó chỉ làm Đức bấm nhầm extension, mỗi
 * ngày, mãi mãi. Đó đúng là loại lỗi không có gì đỏ lên. */
{
  const iconGoi = path.join(goc, "icons");
  const iconScouter = path.join(goc, "..", "..", "duc-scouter", "v0.1.0", "icons");
  const PNG = "89504e470d0a1a0a";
  for (const co of [16, 32, 48, 128]) {
    const ta = fs.readFileSync(path.join(iconGoi, `icon-${co}.png`));
    assert.equal(ta.subarray(0, 8).toString("hex"), PNG, `icon-${co}.png không phải PNG hợp lệ`);
    assert.ok(ta.length > 100, `icon-${co}.png quá nhỏ (${ta.length} byte) — nhiều khả năng sinh hỏng`);
    const ho = fs.readFileSync(path.join(iconScouter, `icon-${co}.png`));
    assert.notEqual(createHash("sha256").update(ta).digest("hex"),
      createHash("sha256").update(ho).digest("hex"),
      `icon-${co}.png trùng y hệt Scouter — sinh lại: node scripts/make-icons.mjs`);
  }
  /* Và bộ sinh phải còn đó. Icon là MÃ NGUỒN ở repo này, không phải bốn cục nhị phân mồ côi:
   * mất bộ sinh thì không ai sửa lại được màu, và cũng không ai biết nó vẽ bằng gì. */
  assert.ok(fs.existsSync(path.join(goc, "scripts", "make-icons.mjs")),
    "mất bộ sinh icon — bốn tệp PNG thành nhị phân mồ côi");
}

/* ---- ⑺ NĂM CHỖ DO AUDIT ĐỘC LẬP TÌM RA (08/09) --------------------------
 * Codex đọc mã và tìm ra năm chỗ mà đọc một mình không thấy, vì ba trong số đó chỉ nổ khi hai
 * lượt chồng nhau. Mỗi khối con dưới đây là một con đường đã ĐI ĐƯỢC trước khi vá.
 *
 * Kho lưu giả ở đây CỐ Ý chậm: nó nhường lượt giữa `get` và `set`. Không có chỗ nhường đó thì
 * hai lỗi đua nhau **không tái hiện được**, và một phép ghim không tái hiện được lỗi là một
 * phép ghim xanh vì may mắn. */
{
  function khoCham(gate) {
    const store = Object.create(null);
    if (gate !== undefined) store[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY] = gate;
    const nhuong = () => new Promise((r) => setTimeout(r, 0));
    return {
      store,
      runtime: { id: "hnx-fetch-gia" },
      storage: {
        local: {
          async get(keys) {
            await nhuong();
            const ra = {};
            for (const k of [].concat(keys)) if (k in store) ra[k] = store[k];
            return ra;
          },
          async set(o) { await nhuong(); Object.assign(store, o); }
        }
      }
    };
  }
  const tayLenh = (chromeApi, doFetch) => createSeedHandlers({
    chromeApi, BridgeProtocolError, negotiateVersion, capabilities,
    fetch: doFetch || (async () => ({
      ok: true, status: 200, url: "https://hnx.vn/",
      headers: new Map([["content-type", "text/html; charset=utf-8"]]),
      text: async () => "x", arrayBuffer: async () => new TextEncoder().encode("x").buffer
    }))
  });

  /* ⑺a PHANH KHẨN KHÔNG ĐƯỢC BỊ HỒI SINH — và bản ghi công tắc phải do ta VIẾT RA, không
   * phải kế thừa.
   *
   * Bản trước ghi một bản ghi trải từ `gate` cũ, tức chở theo `enabled: true` đọc từ TRƯỚC. Một
   * lượt phanh khẩn rơi vào giữa lượt đọc và lượt ghi thì chính lượt trừ ngân sách bật lại cái
   * công tắc Đức vừa tắt.
   *
   * Hai vế, và phải nói rõ vế nào chữa cái gì, kẻo lần sau ai đó gỡ nhầm vế:
   *   · **Hàng đợi** là thứ đóng đường đua — nó ép lượt tắt và lượt trừ không bao giờ lồng nhau.
   *   · **Ghi từng trường** là lớp thứ hai: nó chặn một trường LẠ trong kho lưu bám theo sang
   *     bản ghi mới. Không có nó thì một `cap_per_unlock` lọt vào kho sẽ sống mãi ở đó, và con
   *     đường mà `N7` mô tả (kẻ bị chặn tự đặt trần cho mình) mở ra một nửa. */
  {
    const c = khoCham({ enabled: true, enabled_at: 1, used: 0 });
    const h = tayLenh(c);
    const dangGoi = h["scout.fetch"]({ url: "https://hnx.vn/" });
    const tat = setWriteGate(c, false);
    await Promise.allSettled([dangGoi, tat]);
    assert.equal((await readWriteGateState(c)).enabled, false,
      "lượt trừ ngân sách đã HỒI SINH công tắc vừa tắt — phanh khẩn không còn là phanh");

    /* Vế hai: trường lạ KHÔNG được bám theo. */
    const ban = khoCham({ enabled: true, enabled_at: 7, used: 0, cap_per_unlock: 9999, rac: "bam theo" });
    await tayLenh(ban)["scout.fetch"]({ url: "https://hnx.vn/" });
    const ghiRa = ban.store[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY];
    assert.deepEqual(Object.keys(ghiRa).sort(), ["enabled", "enabled_at", "used"],
      "bản ghi công tắc chở theo trường lạ từ kho lưu — phải VIẾT RA từng trường, không trải bản cũ");
    assert.equal(ghiRa.enabled, true);
    assert.equal(ghiRa.enabled_at, 7, "mốc bật phải giữ nguyên, nếu không mỗi lượt trừ là một lượt bật lại");
    assert.equal(ghiRa.used, 1);
  }

  /* ⑺b TRẦN KHÔNG ĐƯỢC VƯỢT KHI NHIỀU LƯỢT CHỒNG NHAU.
   * Đọc rồi ghi là hai lượt tách rời, nên năm lượt cùng đọc một con số rồi cùng ghi, và cả năm
   * đều đi ra ngoài. Trần đếm được mà không chặn được thì nó không phải trần. */
  {
    const CAP = SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK;
    let daGoiMang = 0;
    const c = khoCham({ enabled: true, enabled_at: 1, used: CAP - 2 });
    const h = tayLenh(c, async () => {
      daGoiMang += 1;
      return { ok: true, status: 200, url: "https://hnx.vn/",
        headers: new Map([["content-type", "text/html; charset=utf-8"]]),
        text: async () => "x", arrayBuffer: async () => new TextEncoder().encode("x").buffer };
    });
    const ra = await Promise.allSettled(
      Array.from({ length: 5 }, () => h["scout.fetch"]({ url: "https://hnx.vn/" }))
    );
    const qua = ra.filter((r) => r.status === "fulfilled").length;
    assert.equal(qua, 2, `chỉ còn 2 lượt mà ${qua} lượt lọt qua — trần vỡ khi chồng lượt`);
    assert.equal(daGoiMang, 2, "số lượt CHẠM MẠNG phải bằng số lượt được cấp, không hơn");
    assert.equal(c.store[SEED_CONSTANTS.WRITE_GATE_STORAGE_KEY].used, CAP);
  }

  /* ⑺c ĐỨT GIỮA CHỪNG THÂN cũng là MẠNG HỎNG, không phải lỗi nội bộ.
   * Bản trước để lượt đọc thân ngoài `try`, nên nó rơi ra thành `INTERNAL_ERROR`. Khác biệt đó
   * không phải chuyện chữ nghĩa: tầng vòng lặp phân loại lỗi để quyết thử-lại-hay-không, và
   * `INTERNAL_ERROR` bị xếp là KHÔNG thử lại được — tức một lượt chạy dài chết ở một cú vấp
   * lẽ ra tự qua. */
  {
    const c = khoCham({ enabled: true, enabled_at: 1, used: 0 });
    const h = tayLenh(c, async () => ({
      ok: true, status: 200, url: "https://hnx.vn/",
      headers: new Map([["content-type", "text/html; charset=utf-8"]]),
      text: async () => { throw new Error("socket hang up"); },
      arrayBuffer: async () => { throw new Error("socket hang up"); }
    }));
    const e = await tuChoi(() => h["scout.fetch"]({ url: "https://hnx.vn/" }));
    assert.equal(e.code, "ACTION_FAILED", "đứt giữa chừng thân phải là lỗi MẠNG, không phải INTERNAL_ERROR");
    assert.equal(e.details.action_code, "FETCH_FAILED");

    /* Nhưng lỗi HÌNH DẠNG ném từ trong khối đọc là quyết định có chủ ý — nó phải về nguyên vẹn,
     * đừng khoác cho nó cái áo lỗi mạng, vì hai loại này thử-lại khác nhau. */
    const c2 = khoCham({ enabled: true, enabled_at: 1, used: 0 });
    const h2 = tayLenh(c2, async () => ({
      ok: true, status: 200, url: "https://hnx.vn/a.pdf",
      headers: new Map([["content-type", "application/pdf"]]),
      text: async () => "khong duoc goi", arrayBuffer: async () => new ArrayBuffer(8)
    }));
    const e2 = await tuChoi(() => h2["scout.fetch"]({ url: "https://hnx.vn/a.pdf" }));
    assert.equal(e2.details.action_code, "FETCH_BINARY_BODY", "lỗi hình dạng phải giữ nguyên mã của nó");
  }

  /* ⑺d THÂN QUÁ KHỔ BỊ CHẶN TRƯỚC KHI ĐỌC, nếu máy chủ đã tự khai độ dài.
   * Đọc xong rồi mới đo là đã nuốt trọn thân vào bộ nhớ của một service worker. */
  {
    let daDocThan = false;
    const c = khoCham({ enabled: true, enabled_at: 1, used: 0 });
    const h = tayLenh(c, async () => ({
      ok: true, status: 200, url: "https://hnx.vn/",
      headers: new Map([["content-type", "text/html"], ["content-length", String(50 * 1024 * 1024)]]),
      text: async () => { daDocThan = true; return "x"; },
      arrayBuffer: async () => { daDocThan = true; return new ArrayBuffer(8); }
    }));
    const e = await tuChoi(() => h["scout.fetch"]({ url: "https://hnx.vn/" }));
    assert.equal(e.details.action_code, "FETCH_BODY_TOO_LARGE");
    assert.equal(daDocThan, false, "đã đọc thân rồi mới từ chối — chặn muộn thì bộ nhớ đã mất");

    /* Khai DỐI theo hướng nhỏ thì phép đo thật ở dưới vẫn bắt được. Chỉ tin `content-length` theo
     * hướng AN TOÀN — đó là cả lý do nó là phép kiểm THỨ HAI, không phải phép kiểm duy nhất. */
    const c2 = khoCham({ enabled: true, enabled_at: 1, used: 0 });
    const to = "x".repeat(SEED_CONSTANTS.FETCH_MAX_BODY_BYTES + 10);
    const h2 = tayLenh(c2, async () => ({
      ok: true, status: 200, url: "https://hnx.vn/",
      headers: new Map([["content-type", "text/html"], ["content-length", "10"]]),
      text: async () => to, arrayBuffer: async () => new TextEncoder().encode(to).buffer
    }));
    const e2 = await tuChoi(() => h2["scout.fetch"]({ url: "https://hnx.vn/" }));
    assert.equal(e2.details.action_code, "FETCH_BODY_TOO_LARGE", "khai dối nhỏ thì phép đo thật phải bắt");
  }

  /* ⑺e KHÔNG CÒN DẤU VẾT NỬA VỜI CỦA SCOUTER trong phần TỰ KHAI.
   * `session.hello` từng trả `seed: "scouter-seed-v0.1"` trong khi ping và bảng năng lực trả
   * `hnx-fetch-v0.1`. Ba chỗ tự khai mà nói ba kiểu thì bên kia dây tin chỗ nào? */
  {
    const c = khoCham({ enabled: false });
    const h = tayLenh(c);
    const chao = await h["session.hello"]({ supported_versions: [1] });
    assert.equal(chao.seed, "hnx-fetch-v0.1", "session.hello còn khai là seed của Scouter");
    const ping = await h["system.ping"]();
    assert.equal(ping.seed, chao.seed, "hai chỗ tự khai phải nói CÙNG một tên");
    assert.equal(capabilities().seed, chao.seed, "và bảng năng lực cũng vậy");
  }
}

/* ---- ⑻ VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP ----------------------------
 * `file.read` đọc được mọi tệp dưới vùng ghi — đó là thiết kế. Hệ quả: vùng ghi trỏ vào thư mục
 * đang giữ tệp ghép cặp nghĩa là **token đọc được qua dây**.
 *
 * Audit độc lập 08/09 chỉ ra bản đầu chỉ dò TÊN tệp ở tầng con trực tiếp, nên nó bỏ lọt hai ca
 * mà người ta rơi vào rất tự nhiên: tệp ghép cặp **đặt tên khác**, và tệp ghép cặp nằm **sâu
 * một tầng**. Cả hai ca đều để lộ đúng cái token của lượt chạy đang bật. */
{
  const { createHnxFetchBridge } = await import("../bridge/hnx-fetch-host.mjs");
  const CONG = 39951;
  const ghepCap = {
    schema_version: 1, host: "127.0.0.1", port: CONG,
    http_url: `http://127.0.0.1:${CONG}/v1/rpc`,
    websocket_url: `ws://127.0.0.1:${CONG}/v1/extension`,
    token: "a".repeat(43)
  };
  const dungKhi = (fn, vi) => {
    try { const may = fn(); if (may && typeof may.stop === "function") may.stop(); }
    catch (e) { return e; }
    throw new assert.AssertionError({ message: `đáng lẽ phải TỪ CHỐI khởi động: ${vi}` });
  };

  const san = fs.mkdtempSync(path.join(os.tmpdir(), "hnx-vung-"));
  try {
    const vung = path.join(san, "du-lieu");
    fs.mkdirSync(vung);

    /* Vùng sạch thì khởi động được — nếu không, ba khẳng định dưới đây đỏ vì lý do khác và
     * chúng không chứng minh gì cả. */
    const may = createHnxFetchBridge({ pairing: ghepCap, root: vung });
    assert.equal(typeof may.start, "function");

    /* ⑻a Tệp ghép cặp ĐANG DÙNG nằm trong vùng ghi → TỪ CHỐI, dù nó tên gì.
     * Đây là phép kiểm so SỰ THẬT, không so quy ước đặt tên. */
    const laMat = path.join(vung, "credentials.json");
    fs.writeFileSync(laMat, JSON.stringify(ghepCap), "utf8");
    const e1 = dungKhi(
      () => createHnxFetchBridge({ pairing: ghepCap, root: vung, pairingPath: laMat }),
      "tệp ghép cặp đặt tên lạ, nằm ngay trong vùng ghi");
    assert.match(String(e1.message), /Vùng ghi chứa tệp ghép cặp/);
    fs.rmSync(laMat);

    /* ⑻b Một tệp ghép cặp KHÁC, nằm SÂU một tầng → vẫn phải TỪ CHỐI.
     * Ca này là tệp của Scouter hoặc của một lượt cài cũ bị bỏ quên trong thư mục dữ liệu. */
    fs.mkdirSync(path.join(vung, "cu"));
    const bo_quen = path.join(vung, "cu", "pairing-scouter.json");
    fs.writeFileSync(bo_quen, "{}", "utf8");
    const e2 = dungKhi(
      () => createHnxFetchBridge({ pairing: ghepCap, root: vung }),
      "tệp ghép cặp bỏ quên ở thư mục con");
    assert.match(String(e2.message), /Vùng ghi chứa tệp ghép cặp/);
    assert.match(String(e2.message), /pairing-scouter\.json/, "câu lỗi phải chỉ ĐÚNG tệp nào");
    fs.rmSync(path.join(vung, "cu"), { recursive: true });

    /* ⑻c Tệp ghép cặp nằm NGOÀI vùng ghi → cho qua. Một phép kiểm từ chối tất cả thì nó không
     * phân biệt được gì, và người vận hành sẽ đi tìm cách tắt nó. */
    const ngoai = path.join(san, "pairing.json");
    fs.writeFileSync(ngoai, JSON.stringify(ghepCap), "utf8");
    const may2 = createHnxFetchBridge({ pairing: ghepCap, root: vung, pairingPath: ngoai });
    assert.equal(typeof may2.start, "function", "tệp ghép cặp ở ngoài vùng ghi thì phải cho chạy");

    /* ⑻d Vùng ghi phải là đường dẫn TUYỆT ĐỐI — vùng ghi do người khởi động khai, không do
     * thư mục làm việc lúc đó quyết định. */
    const e3 = dungKhi(() => createHnxFetchBridge({ pairing: ghepCap, root: "du-lieu" }), "đường dẫn tương đối");
    assert.match(String(e3.message), /TUYỆT ĐỐI/);
  } finally {
    fs.rmSync(san, { recursive: true, force: true });
  }
}

/* ---- ⑼ LƯỢT BỊ TỪ CHỐI Ở TẦNG PHONG BÌ PHẢI GIỮ `request_id` (S-13) ----
 * Lỗi đo được bên Scouter 08/09, và `bridge-core.mjs` của gói này là bản rút gọn của cùng một
 * lõi — nên nó có y hệt. `parseRequest` ném TRƯỚC khi biến `request` được gán, nên phản hồi ra
 * đi với `request_id: null`; máy chủ khớp phản hồi bằng đúng trường đó, khớp hụt, rồi thay cả
 * phản hồi bằng `INTERNAL_ERROR / uncorrelated_extension_response`.
 *
 * Với gói này hậu quả nặng hơn một chút: tầng vòng lặp `vong-lay.mjs` phân loại lỗi để quyết
 * thử-lại-hay-không, và `INTERNAL_ERROR` bị xếp là KHÔNG thử lại được. Một lượt chạy dài có thể
 * chết ở một phong bì gõ sai, với một câu không nói được sai ở đâu. */
{
  const { handlers } = makeHandlers({ enabled: false });
  const dispatch = createDispatcher({ handlers });
  const goc = () => ({
    protocol: PROTOCOL, version: 1, kind: "request", request_id: "req-s13-0001",
    sent_at: "2026-09-08T10:00:00Z", client: { client_id: "phep-ghim" }, params: {}
  });

  for (const [ten, xau, ma] of [
    ["tên method không có dấu chấm", { method: "capabilities" }, "INVALID_ENVELOPE"],
    ["sai dấu thời gian", { method: "system.ping", sent_at: "hom qua" }, "INVALID_ENVELOPE"],
    ["thiếu client_id", { method: "system.ping", client: {} }, "INVALID_ENVELOPE"],
    ["tên lạ đúng hình dạng", { method: "khong.co.that" }, "METHOD_NOT_FOUND"]
  ]) {
    const ra = await dispatch({ ...goc(), ...xau });
    assert.equal(ra.request_id, "req-s13-0001", ten + ": mất request_id — máy chủ sẽ thay bằng INTERNAL_ERROR");
    assert.equal(ra.ok, false);
    assert.equal(ra.error.code, ma, ten + ": sai mã lỗi");
  }

  /* Vớt được không có nghĩa là tin, và bộ vớt không được tự nổ. */
  assert.equal((await dispatch({ ...goc(), request_id: "x", method: "system.ping" })).request_id, null,
    "request_id sai hình dạng mà vẫn được chép ra phản hồi");
  assert.equal((await dispatch("{ khong phai json")).request_id, null);
}

console.log("be-mat-hep-smoke: 9 khoi, tat ca DAT");

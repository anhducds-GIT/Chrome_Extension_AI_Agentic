/* scouter-seed-core.mjs — BA KHẢ NĂNG của Scouter seed, nối vào từ vựng Bridge.
 *
 * Đề bài: docs/briefs/BRIEF-SCOUTER-SEED-01.md mục 2. ADR-0009 mục ⑸ định nghĩa seed là bộ
 * nhỏ nhất biết ba việc:
 *
 *   ① quan sát        → bốn phép dò của `scripts/observer-probes.mjs`, đi qua `ObserverEngine`
 *   ② báo cáo qua Bridge → từ vựng method ở `scripts/scouter-bridge-core.mjs`
 *   ③ tự nạp lại mình  → `scout.reload`
 *
 * File này là chỗ ba thứ đó gặp nhau, và nó KHÔNG biết `chrome` là gì: mọi thứ chạm trình
 * duyệt đều tiêm vào. Nhờ thế phép ghim chạy được mà không cần Chrome, và
 * `scouter-background.js` ở gốc repo chỉ còn là vài dòng bơm đồ thật vào đây.
 *
 * ─── VÌ SAO GỌI LẠI `ObserverEngine` THAY VÌ TỰ GẮN DEBUGGER ────────────────
 * `observer-engine.js` đã có sẵn phần gắn/tháo debugger và phần từ chối tên phép dò lạ TRƯỚC
 * khi gắn, và bốn con đột biến W1..W4 trong `scripts/observer-mutation-check.mjs` đang canh
 * đúng đoạn đó. Tự gắn debugger ở đây là dựng đường thứ hai tới cùng một chỗ, mà đường thứ
 * hai thì không con đột biến nào canh.
 */

/* Bốn phép dò, ánh xạ từ tên method Bridge sang tên phép dò của lõi. Bảng này CỐ Ý là dữ
 * liệu, không phải chuỗi ghép: không có đường nào để một tên từ ngoài dây trở thành tên phép
 * dò. Người gọi chọn được method nào có trong bảng, hết. */
const PROBE_BY_METHOD = Object.freeze({
  "scout.targets": "targets.list",
  "scout.page": "page.snapshot",
  "scout.query": "dom.query",
  "scout.tree": "dom.tree",
  "scout.a11y": "a11y.tree",
  "scout.snapshot": "dom.snapshot",
  "scout.shot": "page.shot"
});

/* Ba hành động GHI, ánh xạ sang tên của `scripts/scouter-actions-core.mjs`. Bảng riêng, cố ý:
 * đọc và ghi đi qua hai lõi khác nhau với hai danh sách method CDP khác nhau, và gộp hai bảng
 * này lại là bước đầu tiên để hai danh sách kia cũng bị gộp. */
const ACTION_BY_METHOD = Object.freeze({
  "scout.click": "input.click",
  "scout.type": "input.type",
  "scout.key": "input.key"
});

/* Trần chống bão nạp lại. Vòng tự cải tiến của ADR-0009 là: AI ghi code → gọi `scout.reload`
 * → extension khởi động lại → nối lại Bridge. Nếu máy chủ (hoặc một AI đang lặp) gửi lại
 * `scout.reload` ngay khi thấy kết nối trở lại thì vòng đó quay tít và Scouter không bao giờ
 * đứng yên đủ lâu để làm việc gì. Mười giây đủ cắt vòng, và đủ ngắn để không cản một lượt
 * sửa-rồi-nạp thật. Trần GÕ CỨNG, không nhận từ tham số — nới nó là đổi luật an toàn. */
/* ---- PHANH CHO ĐƯỜNG GHI (S-05 · Đức chốt 2026-09-07) ---------------------
 * Từ 06/09 Scouter bấm được nút thật. Cho tới lúc có khối này, thứ duy nhất đứng giữa một AI
 * và một cú bấm là MỘT CÂU VĂN trong `AGENTS.md` ("cấm chạy trên trang thật") — luật viết cho
 * người vận hành đọc, không phải chốt trong code. Một AI đọc hụt câu đó thì không gì chặn nó.
 *
 * Đức chọn đúng khuôn ba gói `duc-auto-*` đang dùng: một CÔNG TẮC, mặc định TẮT, chỉ người mở
 * được — cộng thêm một TRẦN SỐ LƯỢT. Không đẻ khái niệm mới.
 *
 * Bốn điều đã cân, và lý do chọn:
 *
 * ⑴ Chặn ở `runAction()`, không chặn ở từng method. Ba `scout.click/type/key` đều chui qua đây,
 *   nên một cửa là đủ — và lệnh ghi thứ TƯ mai sau cũng bị chặn mà không ai phải nhớ đi thêm
 *   một dòng. Chặn ở ba chỗ là ba chỗ để quên một chỗ.
 *
 * ⑵ HỎNG THÌ ĐÓNG, ngược hẳn với trần nạp lại ở dưới. Trần nạp lại đọc storage lỗi thì cho
 *   qua, vì nó chỉ chống bão và từ chối nạp lại là tự khoá mình ra khỏi vòng tự sửa. Cái này
 *   thì khác: đọc không ra trạng thái công tắc nghĩa là KHÔNG BIẾT Đức đã mở chưa, và "không
 *   biết" phải được xử như "chưa mở". Một cái phanh mở ra khi hỏng không phải là phanh.
 *
 * ⑶ TRỪ TRƯỚC, BẤM SAU. Cùng lý do với việc ghi mốc trước `runtime.reload()`: một lượt đã bấm
 *   mà chưa trừ là một trần chưa từng tồn tại. Lượt bấm hỏng vẫn bị trừ — lệch về phía an toàn,
 *   và một vòng lặp hỏng vẫn tiêu hết ngân sách chứ không quay mãi.
 *
 * ⑷ Trần đếm theo MỖI LẦN MỞ KHOÁ, không theo giờ và không theo đời service worker. Đếm theo
 *   đời service worker là trần giả: Chrome cho worker ngủ vài phút một lần, và mỗi lần tỉnh là
 *   một bộ đếm mới tinh. Đếm theo lần mở khoá thì cửa tự đóng lại sau 50 lượt và phải chính
 *   Đức bật lại — tức là cái phanh luôn quay về tay người.
 *
 * 50 là gì: đủ cho một lượt dò một trang thật (ADR-0009 đặt mục tiêu ~20–40 thao tác cho một
 * adapter), và đủ nhỏ để một vòng lặp hỏng dừng trước khi kịp làm gì đáng kể. */
const WRITE_GATE_STORAGE_KEY = "scouter.write.gate.v1";
const WRITE_CAP_PER_UNLOCK = 50;
/* Trần thân trả về của `scout.fetch`. Đặt ở 512 KiB chứ không phải 1 MiB của phong bì: phần vỏ
 * (JSON escape, các trường khác) phình thêm được đáng kể, và chạm trần phong bì thì cả lượt
 * chết ở tầng vận chuyển với một câu khó hiểu, thay vì chết ở đây với một câu nói rõ vì sao. */
const FETCH_MAX_BODY_BYTES = 512 * 1024;

/* Kiểu thân ĐỌC ĐƯỢC bằng văn bản. Danh sách CHO PHÉP, không phải danh sách cấm: kiểu lạ thì
 * mặc định coi là nhị phân và bắt người gọi khai `as: "base64"`. Ngược lại — cấm vài kiểu đã
 * biết rồi cho qua phần còn lại — nghĩa là mỗi kiểu nhị phân chưa nghĩ tới đều hỏng im lặng,
 * mà đó đúng là lỗi khối này sinh ra để chữa. */
const LA_VAN_BAN = /^(?:text\/|application\/(?:json|xml|javascript|ecmascript|x-www-form-urlencoded)\b|application\/[^;]*\+(?:json|xml)\b)/i;

/* Base64 cho một Uint8Array. Chia mẻ vì `String.fromCharCode(...mảng)` trải cả mảng thành đối
 * số, và với một file vài trăm KB thì nó VƯỢT TRẦN ĐỐI SỐ rồi ném — đúng cái bẫy đã làm hỏng
 * một phép đếm dòng ngày 07/09, chỉ khác chỗ nổ. */
function base64Tu(bytes) {
  const ME = 0x8000;
  let nhiPhan = "";
  for (let i = 0; i < bytes.length; i += ME) {
    nhiPhan += String.fromCharCode.apply(null, bytes.subarray(i, i + ME));
  }
  return btoa(nhiPhan);
}

const RELOAD_MIN_GAP_MS = 10000;
const RELOAD_STORAGE_KEY = "scouter.reload.last.v1";
/* Trả lời TRƯỚC rồi mới khởi động lại. `chrome.runtime.reload()` giết service worker ngay,
 * nên gọi nó trong handler là cắt đứt phong bì phản hồi trước khi nó rời socket, và người gọi
 * chỉ thấy một kết nối chết — không phân biệt được với Scouter hỏng.
 * ponytail: độ trễ cố định, không phải xác nhận đã gửi. Muốn chắc chắn thì phải có móc
 * "khung đã rời socket" ở transport; đổi khi có một lượt reload thật bị mất phản hồi. */
const RELOAD_DELAY_MS = 250;

/**
 * @param {object} deps
 *   engine     — ObserverEngine (cần `scanTargets()` và `runProbe(target, name, params)`)
 *   chromeApi  — { runtime: { id, reload() }, storage: { local: { get, set } } }
 *   timers     — { setTimeout } (tiêm để phép ghim không phải chờ thật)
 *   now        — () => Date
 *   BridgeProtocolError · negotiateVersion · capabilities — từ `scouter-bridge-core.mjs`
 */
export function createSeedHandlers(deps = {}) {
  const engine = deps.engine;
  const chromeApi = deps.chromeApi;
  const timers = deps.timers || globalThis;
  /* Bơm `fetch` vào thay vì gọi thẳng globalThis — đúng quy ước của file này (`chromeApi`,
   * `timers` đều bơm). Không bơm thì phép ghim phải thay một hàm toàn cục rồi nhớ trả lại, và
   * cái "nhớ trả lại" đó là chỗ một suite rò rỉ sang suite khác. */
  const doFetch = typeof deps.fetch === "function" ? deps.fetch : ((...args) => globalThis.fetch(...args));
  const now = typeof deps.now === "function" ? deps.now : () => new Date();
  const BridgeProtocolError = deps.BridgeProtocolError;
  const negotiateVersion = deps.negotiateVersion;
  const capabilities = deps.capabilities;
  if (!engine || !chromeApi || !BridgeProtocolError || typeof negotiateVersion !== "function" || typeof capabilities !== "function") {
    throw new TypeError("Scouter seed handlers need engine, chromeApi, BridgeProtocolError, negotiateVersion and capabilities.");
  }

  async function resolveTarget(targetId) {
    const targets = await engine.scanTargets();
    const found = (targets || []).find((target) => (target.targetId ?? target.id) === targetId);
    if (!found) {
      throw new BridgeProtocolError("PROBE_FAILED", `No Chrome debug target with id '${targetId}'.`, {
        probe_code: "TARGET_NOT_FOUND", target_id: targetId
      });
    }
    /* `ObserverEngine.runProbe` đọc `target.id ?? target.targetId` và `target.attached`.
     * `scanTargets()` trả về dạng đã mô tả (`targetId`), nên dựng lại đúng hai trường đó. */
    return { id: found.targetId, targetId: found.targetId, attached: Boolean(found.attached) };
  }

  /* Đọc công tắc. Mọi đường ra khỏi hàm này đều là "mở" hoặc một lỗi — cố ý không có đường thứ
   * ba trả về một giá trị mặc định hiền lành. Xem ⑵ ở khối đầu file. */
  async function readWriteGate() {
    let stored;
    try {
      stored = await chromeApi.storage.local.get([WRITE_GATE_STORAGE_KEY]);
    } catch (error) {
      throw new BridgeProtocolError("WRITE_BLOCKED",
        "DEV_MODE_UNREADABLE: khong doc duoc trang thai cong tac, nen coi nhu DANG TAT.", {
          write_code: "DEV_MODE_UNREADABLE", detail: String(error?.message || error)
        });
    }
    const gate = stored?.[WRITE_GATE_STORAGE_KEY];
    if (!gate || typeof gate !== "object" || gate.enabled !== true) {
      throw new BridgeProtocolError("WRITE_BLOCKED",
        "DEV_MODE_OFF: Che do phat trien dang TAT. Chi Duc bat duoc cong tac nay trong popup cua Scouter.", {
          write_code: "DEV_MODE_OFF", cap_per_unlock: WRITE_CAP_PER_UNLOCK
        });
    }
    /* Bộ đếm hỏng cũng là "không biết". Bản ghi méo thì đóng, đừng đoán là 0 — đoán 0 là tặng
     * thêm 50 lượt cho đúng cái bản ghi đáng ngờ nhất. */
    if (!Number.isInteger(gate.used) || gate.used < 0) {
      throw new BridgeProtocolError("WRITE_BLOCKED",
        "GATE_CORRUPT: ban ghi cong tac bi meo. Tat roi bat lai cong tac trong popup.", {
          write_code: "GATE_CORRUPT"
        });
    }
    return gate;
  }

  /* Trừ MỘT lượt khỏi ngân sách, và chỉ trả về khi đã trừ XONG. Xem ⑶. */
  async function spendWriteBudget() {
    const gate = await readWriteGate();
    if (gate.used >= WRITE_CAP_PER_UNLOCK) {
      throw new BridgeProtocolError("WRITE_BLOCKED",
        `WRITE_CAP_REACHED: da dung het ${WRITE_CAP_PER_UNLOCK} luot ghi cua lan mo khoa nay. Tat roi bat lai cong tac trong popup.`, {
          write_code: "WRITE_CAP_REACHED", used: gate.used, cap_per_unlock: WRITE_CAP_PER_UNLOCK
        });
    }
    const used = gate.used + 1;
    try {
      await chromeApi.storage.local.set({ [WRITE_GATE_STORAGE_KEY]: { ...gate, used } });
    } catch (error) {
      /* Ghi hụt thì KHÔNG bấm. Bấm mà không trừ được là cái trần không tồn tại. */
      throw new BridgeProtocolError("WRITE_BLOCKED",
        "GATE_NOT_RECORDED: khong ghi duoc luot vao ngan sach, nen khong bam.", {
          write_code: "GATE_NOT_RECORDED", detail: String(error?.message || error)
        });
    }
    return { used, cap_per_unlock: WRITE_CAP_PER_UNLOCK, remaining: WRITE_CAP_PER_UNLOCK - used };
  }

  async function runAction(method, target, params) {
    const name = ACTION_BY_METHOD[method];
    /* Cái phanh đứng TRƯỚC `engine.runAction`, tức là trước cả lượt gắn debugger. Đặt nó sau
     * thì mỗi lượt bị chặn vẫn kịp dựng dải băng "đang gỡ lỗi trình duyệt này" trên tab. */
    const budget = await spendWriteBudget();
    const result = await engine.runAction(target, name, params);
    /* Hành động hỏng KHÔNG được mặc vỏ thành công, cùng lý do với phép dò: một phong bì
     * `ok: true` chở một thất bại là thứ người gọi phải nhớ mà bóc, và sẽ có người quên.
     * Ở đường GHI thì quên nghĩa là tưởng đã bấm được trong khi chưa bấm gì. */
    if (!result || result.ok !== true) {
      throw new BridgeProtocolError("ACTION_FAILED", result?.detail || `Hành động '${name}' không chạy được.`, {
        action: name, action_code: result?.code || "ACTION_FAILED"
      });
    }
    /* Trả ngân sách còn lại về theo mỗi lượt: người ở đầu dây kia thấy mình sắp hết trước khi
     * hết, thay vì đâm vào tường ở lượt thứ 51 mà không hiểu vì sao. */
    return { action: name, data: result.data, cdp: result.cdp || [], write_budget: budget };
  }

  async function runProbe(method, target, params) {
    const name = PROBE_BY_METHOD[method];
    const result = await engine.runProbe(target, name, params);
    /* Phép dò thất bại KHÔNG được trả về dưới vỏ `ok: true`. Một phong bì thành công chở một
     * thất bại là thứ người gọi phải nhớ mà bóc, và sớm muộn sẽ có người quên. */
    if (!result || result.ok !== true) {
      throw new BridgeProtocolError("PROBE_FAILED", result?.detail || `Probe '${name}' failed.`, {
        probe: name, probe_code: result?.code || "PROBE_FAILED"
      });
    }
    return { probe: name, data: result.data, cdp: result.cdp || [] };
  }

  async function lastReloadAt() {
    try {
      const stored = await chromeApi.storage.local.get([RELOAD_STORAGE_KEY]);
      const value = Number(stored?.[RELOAD_STORAGE_KEY]);
      return Number.isFinite(value) ? value : 0;
    } catch (_error) {
      /* Kho lưu hỏng thì coi như chưa từng nạp lại: trần này chống bão, nó không phải lớp bảo
       * mật. Từ chối nạp lại chỉ vì đọc storage lỗi là tự khoá mình ra khỏi vòng tự sửa. */
      return 0;
    }
  }

  return {
    async "session.hello"(params) {
      return {
        selected_version: negotiateVersion(params.supported_versions),
        extension_id: chromeApi.runtime.id ?? null,
        seed: "scouter-seed-v0.1",
        transport: "loopback_ws",
        server_time: now().toISOString()
      };
    },

    async "system.capabilities"() {
      return capabilities();
    },

    async "system.ping"() {
      return { scouter: "online", seed: "scouter-seed-v0.1", server_time: now().toISOString() };
    },

    async "scout.targets"() {
      return await runProbe("scout.targets", null, {});
    },

    async "scout.page"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.page", target, { offset: params.offset, limit: params.limit });
    },

    async "scout.query"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.query", target, {
        selector: params.selector, offset: params.offset, limit: params.limit
      });
    },

    async "scout.tree"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.tree", target, { depth: params.depth, maxNodes: params.max_nodes });
    },

    async "scout.a11y"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.a11y", target, { limit: params.limit });
    },

    async "scout.snapshot"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.snapshot", target, { rects: params.rects });
    },

    async "scout.shot"(params) {
      const target = await resolveTarget(params.target_id);
      return await runProbe("scout.shot", target, { format: params.format, quality: params.quality });
    },

    async "scout.click"(params) {
      const target = await resolveTarget(params.target_id);
      return await runAction("scout.click", target, { selector: params.selector });
    },

    async "scout.type"(params) {
      const target = await resolveTarget(params.target_id);
      return await runAction("scout.type", target, { selector: params.selector, text: params.text });
    },

    async "scout.key"(params) {
      const target = await resolveTarget(params.target_id);
      return await runAction("scout.key", target, { selector: params.selector, key: params.key });
    },

    /* ---- LỆNH GỌI MẠNG (S-10) ------------------------------------------
     * KHÔNG đi qua `runAction()`: chỗ đó bơm việc cho `ObserverEngine`, mà lượt gọi này không
     * chạm một tab nào. Nhưng nó PHẢI trả đúng cái giá kia — nên nó gọi thẳng
     * `spendWriteBudget()`, tức vẫn là cái phanh đó, chỉ khác đường vào.
     *
     * TRỪ NGÂN SÁCH TRƯỚC KHI GỌI, giống ⑶ ở đầu file: một lượt gọi hỏng vẫn tốn một lượt.
     * Ngược lại thì một vòng lặp gọi hỏng liên tục sẽ quay mãi mà trần không bao giờ chạm.
     *
     * `credentials` mặc định `omit`. Đây là chốt an toàn thật, không phải mặc định cho có: với
     * `<all_urls>`, một lượt gọi kèm cookie đọc được nội dung sau đăng nhập của BẤT KỲ trang
     * nào Đức đang mở. Pilot `hnx.vn` là dữ liệu công khai nên không cần cookie — và thứ không
     * cần thì đừng bật sẵn. Ai thật sự cần thì khai `with_credentials: true`, và lúc đó nó nằm
     * trong nhật ký lệnh gọi chứ không nằm trong một mặc định không ai đọc. */
    async "scout.fetch"(params) {
      const budget = await spendWriteBudget();
      let response;
      try {
        response = await doFetch(params.url, {
          method: params.method,
          headers: params.headers,
          body: params.body === null ? undefined : params.body,
          credentials: params.with_credentials ? "include" : "omit",
          redirect: "follow"
        });
      } catch (error) {
        /* Mạng hỏng KHÔNG phải `ok:false` — nó là một lượt chưa bao giờ tới nơi. Dùng lại
         * `ACTION_FAILED` thay vì đẻ mã mới: bảng lỗi cố ý nhỏ (xem đầu `scouter-bridge-core`). */
        throw new BridgeProtocolError("ACTION_FAILED", `Không gọi được '${params.url}': ${String(error?.message || error)}`, {
          action: "fetch", action_code: "FETCH_FAILED", url: params.url
        });
      }
      const contentType = response.headers.get("content-type");

      /* HAI ĐƯỜNG ĐỌC THÂN, và chọn sai đường thì DỮ LIỆU HỎNG IM LẶNG.
       *
       * Đo thật 08/09: tải một PDF của `owa.hnx.vn` bằng đường văn bản thì máy chủ gửi 32.210
       * byte mà nhận về 18.215 ký tự, trong đó **6.707 ký tự thay thế** (U+FFFD). File không
       * cứu lại được. Nguyên nhân: `response.text()` giải mã UTF-8, và mọi byte không hợp lệ
       * trong UTF-8 đều bị thay bằng một ký tự duy nhất — mất byte, không báo lỗi.
       *
       * Nên đường nhị phân đọc `arrayBuffer()` và trả base64, còn `bytes` lấy từ CHÍNH BỘ ĐỆM.
       * Vế sau quan trọng ngang vế trước: bản cũ đo `bytes` trên chuỗi ĐÃ giải mã, nên con số
       * nó khai không phải số byte máy chủ gửi — một phép đo tự khẳng định mình. */
      let bytes;
      let text = null;
      let base64 = null;
      if (params.as === "base64") {
        const buffer = new Uint8Array(await response.arrayBuffer());
        bytes = buffer.length;
        base64 = base64Tu(buffer);
      } else {
        /* CHẶN ĐƯỜNG HỎNG IM LẶNG. Xin văn bản cho một thân nhị phân là một lỗi, không phải một
         * lựa chọn — và trước 08/09 nó trả về thành công kèm dữ liệu đã hỏng. Thà đỏ và nói rõ
         * phải làm gì. Thiếu `content-type` thì vẫn cho qua: đó là mặc định cũ, và đoán bừa
         * "chắc là nhị phân" sẽ chặn oan những trang không khai kiểu. */
        if (contentType && !LA_VAN_BAN.test(contentType)) {
          throw new BridgeProtocolError("ACTION_FAILED",
            `Thân kiểu '${contentType}' không phải văn bản; đọc kiểu văn bản sẽ làm hỏng byte. Gọi lại với as: "base64".`, {
              action: "fetch", action_code: "FETCH_BINARY_BODY", content_type: contentType
            });
        }
        text = await response.text();
        bytes = new TextEncoder().encode(text).length;
      }

      /* CẮT BỚT LÀ NÓI DỐI. Phong bì Bridge trần 1 MiB, nên một thân dài hơn phải làm ĐỎ chứ
       * không được cắt rồi trả về im lặng: người gọi đọc phải nửa file JSON sẽ đi tìm bug ở
       * chỗ không có bug. Trần đặt dưới trần phong bì để chừa chỗ cho phần vỏ.
       * Base64 phồng 4/3, nên đo phần ĐÃ mã hoá — đó mới là thứ phải chui vào phong bì. */
      const trenDay = base64 === null ? bytes : base64.length;
      if (trenDay > FETCH_MAX_BODY_BYTES) {
        throw new BridgeProtocolError("ACTION_FAILED",
          `Thân trả về ${trenDay} byte, quá trần ${FETCH_MAX_BODY_BYTES} byte của một phong bì.`, {
            action: "fetch", action_code: "FETCH_BODY_TOO_LARGE", bytes: trenDay, max_bytes: FETCH_MAX_BODY_BYTES
          });
      }
      return {
        action: "fetch",
        status: response.status,
        ok: response.ok,
        url: response.url,
        content_type: contentType,
        bytes,
        /* Đúng MỘT trong hai trường có giá trị. Không trả cả hai, và không đặt chuỗi base64 vào
         * `body`: người gọi cũ đọc `body` phải nhận `null` rõ ràng chứ không phải một chuỗi
         * trông như văn bản mà không phải văn bản. */
        body: text,
        body_base64: base64,
        write_budget: budget
      };
    },

    async "scout.reload"() {
      const at = now().getTime();
      const previous = await lastReloadAt();
      const since = at - previous;
      if (previous && since < RELOAD_MIN_GAP_MS) {
        throw new BridgeProtocolError("RELOAD_RATE_LIMIT", undefined, {
          min_gap_ms: RELOAD_MIN_GAP_MS, since_previous_ms: since
        });
      }
      /* Ghi mốc TRƯỚC khi hẹn giờ: sau `runtime.reload()` không còn ai ghi được nữa, và một
       * mốc chưa kịp ghi là một trần chưa từng tồn tại. */
      await chromeApi.storage.local.set({ [RELOAD_STORAGE_KEY]: at });
      timers.setTimeout(() => chromeApi.runtime.reload(), RELOAD_DELAY_MS);
      return {
        reloading: true,
        reload_in_ms: RELOAD_DELAY_MS,
        extension_id: chromeApi.runtime.id ?? null,
        note: "Kết nối Bridge sẽ đứt rồi tự nối lại. Đợi ít nhất " + (RELOAD_DELAY_MS + 1000) + "ms rồi gọi system.ping."
      };
    }
  };
}

/* Bật/tắt công tắc bằng MỘT hàm dùng chung, để popup và phép ghim không tự dựng lấy hình dạng
 * bản ghi. Hai bản của một luật thì sớm muộn trả hai câu khác nhau — ADR-0006 đã ghi cái giá.
 * Bật là ĐẶT LẠI bộ đếm về 0: đó chính là chỗ ngân sách được nạp, xem ⑷ ở khối đầu file. */
export async function setWriteGate(chromeApi, enabled, at = Date.now()) {
  const gate = enabled === true
    ? { enabled: true, enabled_at: at, used: 0 }
    : { enabled: false, enabled_at: null, used: 0 };
  await chromeApi.storage.local.set({ [WRITE_GATE_STORAGE_KEY]: gate });
  return gate;
}

export async function readWriteGateState(chromeApi) {
  try {
    const stored = await chromeApi.storage.local.get([WRITE_GATE_STORAGE_KEY]);
    const gate = stored?.[WRITE_GATE_STORAGE_KEY];
    if (!gate || gate.enabled !== true || !Number.isInteger(gate.used) || gate.used < 0) {
      return { enabled: false, used: 0, remaining: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK };
    }
    return {
      enabled: true, used: gate.used, cap_per_unlock: WRITE_CAP_PER_UNLOCK,
      remaining: Math.max(0, WRITE_CAP_PER_UNLOCK - gate.used)
    };
  } catch (_error) {
    /* Đọc hụt thì BÁO LÀ TẮT, khớp với ⑵: cái mà popup hiện phải là cái mà đường ghi sẽ làm. */
    return { enabled: false, used: 0, remaining: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK };
  }
}

export const SEED_CONSTANTS = Object.freeze({
  RELOAD_MIN_GAP_MS,
  RELOAD_DELAY_MS,
  RELOAD_STORAGE_KEY,
  WRITE_GATE_STORAGE_KEY,
  FETCH_MAX_BODY_BYTES,
  WRITE_CAP_PER_UNLOCK,
  PROBE_BY_METHOD,
  ACTION_BY_METHOD
});


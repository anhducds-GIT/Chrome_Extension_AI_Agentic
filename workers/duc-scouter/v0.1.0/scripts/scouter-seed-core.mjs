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
  "scout.tree": "dom.tree"
});

/* Trần chống bão nạp lại. Vòng tự cải tiến của ADR-0009 là: AI ghi code → gọi `scout.reload`
 * → extension khởi động lại → nối lại Bridge. Nếu máy chủ (hoặc một AI đang lặp) gửi lại
 * `scout.reload` ngay khi thấy kết nối trở lại thì vòng đó quay tít và Scouter không bao giờ
 * đứng yên đủ lâu để làm việc gì. Mười giây đủ cắt vòng, và đủ ngắn để không cản một lượt
 * sửa-rồi-nạp thật. Trần GÕ CỨNG, không nhận từ tham số — nới nó là đổi luật an toàn. */
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

export const SEED_CONSTANTS = Object.freeze({
  RELOAD_MIN_GAP_MS,
  RELOAD_DELAY_MS,
  RELOAD_STORAGE_KEY,
  PROBE_BY_METHOD
});


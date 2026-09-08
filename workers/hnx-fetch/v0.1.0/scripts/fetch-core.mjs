/* fetch-core.mjs — LÕI CỦA HNX FETCH: bốn method Bridge, và cái phanh đứng trước lượt gọi mạng.
 *
 * Tệp này là bản RÚT GỌN của `scouter-seed-core.mjs` bên Scouter, và chỗ khác nhau là chỗ đáng
 * đọc: **HNX Fetch không có đường DOM nào.** Không `ObserverEngine`, không gắn debugger, không
 * `scout.click/type/key`, không phép dò. Extension này chỉ biết MỘT việc chạm ra ngoài:
 * `scout.fetch` — gọi một URL bằng chồng mạng của chính trình duyệt.
 *
 * Vì sao cắt chứ không tắt: một method không tồn tại thì không ai bật lại được. Một method còn
 * đó mà bị chặn bằng cờ thì cái cờ là thứ duy nhất đứng giữa, và cờ thì sửa được. Bản kê năng
 * lực (`system.capabilities`) khai đúng bốn method, nên AI ở đầu dây KHÔNG đọc thấy một đường
 * bấm nào — không phải vì ta giấu, mà vì không có.
 *
 * Cái GIỮ NGUYÊN, cố ý, không đụng một dòng: toàn bộ khối phanh dưới đây. `scout.fetch` là
 * `read_only: false` nên nó trả giá hạn mức y như một cú bấm. Lý do ở ADR-0001 của Scouter và
 * ADR-0005 (trần 50 → 200).
 *
 * Tệp này KHÔNG biết `chrome` là gì — mọi thứ chạm trình duyệt đều tiêm vào, nên phép ghim
 * chạy được không cần trình duyệt.
 */

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
 * ⑴ MỘT cửa duy nhất: `spendWriteBudget()`. Bên Scouter cửa đó là `runAction()` vì ba lệnh bấm
 *   cùng chui qua; ở đây chỉ có `scout.fetch`, nên nó gọi thẳng. Điều KHÔNG đổi là luật: mọi
 *   method `read_only: false` phải đi qua đúng một cửa. Thêm method ghi thứ hai mà quên nối
 *   vào cửa này là cách cái phanh biến mất mà không ai thấy — phép ghim ⑬ canh đúng chỗ đó.
 *
 * ⑵ HỎNG THÌ ĐÓNG. Đọc không ra trạng thái công tắc nghĩa là KHÔNG BIẾT Đức đã mở chưa, và "không
 *   biết" phải được xử như "chưa mở". Một cái phanh mở ra khi hỏng không phải là phanh.
 *
 * ⑶ TRỪ TRƯỚC, BẤM SAU. Cùng lý do với việc ghi mốc trước `runtime.reload()`: một lượt đã bấm
 *   mà chưa trừ là một trần chưa từng tồn tại. Lượt bấm hỏng vẫn bị trừ — lệch về phía an toàn,
 *   và một vòng lặp hỏng vẫn tiêu hết ngân sách chứ không quay mãi.
 *
 * ⑷ Trần đếm theo MỖI LẦN MỞ KHOÁ, không theo giờ và không theo đời service worker. Đếm theo
 *   đời service worker là trần giả: Chrome cho worker ngủ vài phút một lần, và mỗi lần tỉnh là
 *   một bộ đếm mới tinh. Đếm theo lần mở khoá thì cửa tự đóng lại sau 200 lượt và phải chính
 *   Đức bật lại — tức là cái phanh luôn quay về tay người.
 *
 * 200 là gì, và vì sao KHÔNG còn là 50: con số cũ là ước lượng chưa đo, đặt theo mục tiêu
 * ~20–40 thao tác cho một adapter (ADR-0009). Lượt chạy thật đầu tiên ngày 08/09 đã hiệu chỉnh
 * nó: một lượt tải 216 tệp PDF chạm trần GIỮA CHỪNG, và Đức phải bật lại công tắc nhiều lần
 * cho một việc duy nhất. Trần đó không lọc được gì — nó chỉ cắt một việc lành làm nhiều khúc,
 * mà mỗi khúc lại tốn đúng một lượt bật tay của người. Đức chốt 200 ngày 08/09 (ADR-0005).
 *
 * Cái KHÔNG đổi, và đó mới là chỗ chịu lực: trần vẫn GÕ CỨNG trong mã, vẫn đếm theo mỗi lần mở
 * khoá, vẫn phải chính tay Đức bật lại. Một vòng lặp hỏng dừng ở lượt 200 thay vì quay mãi —
 * chậm hơn 50, nhưng vẫn là dừng, và vẫn dừng mà không cần ai canh. */
const WRITE_GATE_STORAGE_KEY = "scouter.write.gate.v1";
const WRITE_CAP_PER_UNLOCK = 200;
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

/**
 * @param {object} deps
 *   chromeApi  — { runtime: { id, reload() }, storage: { local: { get, set } } }
 *   timers     — { setTimeout } (tiêm để phép ghim không phải chờ thật)
 *   now        — () => Date
 *   BridgeProtocolError · negotiateVersion · capabilities — từ `scouter-bridge-core.mjs`
 */
export function createSeedHandlers(deps = {}) {
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
  if (!chromeApi || !BridgeProtocolError || typeof negotiateVersion !== "function" || typeof capabilities !== "function") {
    throw new TypeError("HNX Fetch handlers need chromeApi, BridgeProtocolError, negotiateVersion and capabilities.");
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
        "DEV_MODE_OFF: Chế độ phát triển đang TẮT. Chỉ Đức bật được công tắc “Cho phép bấm và gõ” ở đầu BẢNG BÊN của Scouter.", {
          write_code: "DEV_MODE_OFF", cap_per_unlock: WRITE_CAP_PER_UNLOCK
        });
    }
    /* Bộ đếm hỏng cũng là "không biết". Bản ghi méo thì đóng, đừng đoán là 0 — đoán 0 là tặng
     * thêm 50 lượt cho đúng cái bản ghi đáng ngờ nhất. */
    if (!Number.isInteger(gate.used) || gate.used < 0) {
      throw new BridgeProtocolError("WRITE_BLOCKED",
        "GATE_CORRUPT: bản ghi công tắc bị méo. Tắt rồi bật lại công tắc “Cho phép bấm và gõ” ở đầu BẢNG BÊN.", {
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
        `WRITE_CAP_REACHED: đã dùng hết ${WRITE_CAP_PER_UNLOCK} lượt ghi của lần mở khoá này. Tắt rồi bật lại công tắc “Cho phép bấm và gõ” ở đầu BẢNG BÊN.`, {
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
      return { hnx_fetch: "online", seed: "hnx-fetch-v0.1", server_time: now().toISOString() };
    },

    /* ---- LỆNH GỌI MẠNG (S-10) ------------------------------------------
     * Đây là method DUY NHẤT của HNX Fetch đi ra ngoài trình duyệt, và nó `read_only: false`
     * nên nó gọi thẳng `spendWriteBudget()` — tức trả đúng cái giá mà một cú bấm bên Scouter
     * phải trả. Không chạm tab nào, nhưng vẫn tốn ngân sách: cái phanh đo LƯỢT RA NGOÀI, không
     * đo mức độ ồn ào của lượt đó.
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

  };
}

/* Bật/tắt công tắc bằng MỘT hàm dùng chung, để bảng bên và phép ghim không tự dựng lấy hình dạng
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
    /* Đọc hụt thì BÁO LÀ TẮT, khớp với ⑵: cái mà bảng bên hiện phải là cái mà đường ghi sẽ làm. */
    return { enabled: false, used: 0, remaining: 0, cap_per_unlock: WRITE_CAP_PER_UNLOCK };
  }
}

export const SEED_CONSTANTS = Object.freeze({
  WRITE_GATE_STORAGE_KEY,
  FETCH_MAX_BODY_BYTES,
  WRITE_CAP_PER_UNLOCK
});


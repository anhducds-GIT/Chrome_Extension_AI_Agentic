/* day-tron-vong-smoke.mjs — CẢ SỢI DÂY, một lượt, không giả lập khúc nào ở giữa.
 *
 * ══ VÌ SAO FILE NÀY PHẢI TỒN TẠI ══
 *
 * `be-mat-hep-smoke.mjs` gọi thẳng vào từng tay lệnh. Nó chứng minh **lõi** đúng, và nó **không**
 * chứng minh được rằng một lệnh gửi từ ngoài đi tới được tay lệnh đó rồi quay về. Giữa hai chỗ
 * ấy còn: cửa HTTP của máy chủ · định tuyến xuống extension · cái bắt tay hai chiều · khung
 * WebSocket · bộ điều phối · sổ công việc.
 *
 * Ngày 08/09 khoảng giữa đó hỏng thật, và hỏng theo đúng cách tệ nhất: Đức nạp extension mới rồi
 * ghép cặp bằng tệp của Scouter. Tệp hợp lệ, cổng đúng, token đúng — và **không nối được**, vì
 * máy chủ hôm đó nói `duc-scouter.bridge` còn extension nói `hnx-fetch.bridge`. Triệu chứng duy
 * nhất là dòng *"Mất kết nối"*, y hệt lúc chưa bật máy chủ. Không dòng log nào nói vì sao.
 *
 * Phép ghim này chạy: **máy chủ THẬT ↔ transport THẬT ↔ lõi THẬT**, qua một socket TCP thật trên
 * loopback. Thứ duy nhất còn giả là `fetch()` — cố ý, vì một suite gọi ra Internet là một suite
 * đỏ theo thời tiết.
 *
 * ── VÌ SAO PHẢI TỰ DỰNG LỚP WebSocket ──
 * `WebSocket` sẵn có của Node **không gửi được header `Origin`**, mà máy chủ đòi
 * `chrome-extension://…` ở cửa nâng cấp giao thức — đúng như một extension thật gửi. Nên ở đây
 * dựng một lớp mỏng trên socket trần, dùng lại bộ khung của `_shared`. Nới lỏng phép kiểm Origin
 * ở máy chủ cho test dễ chạy là **gỡ một chốt để cho test xanh**, và luật vàng 3 cấm đúng việc đó.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";

import { createFrameDecoder, encodeFrame } from "../../../_shared/bridge-host/websocket-core.mjs";
import { createHnxFetchBridge, PROTOCOL as PROTOCOL_HOST } from "../bridge/hnx-fetch-host.mjs";
import { BridgeProtocolError, capabilities, createDispatcher, negotiateVersion, MAX_ENVELOPE_BYTES, PROTOCOL } from "../scripts/bridge-core.mjs";
import { createSeedHandlers, setWriteGate, SEED_CONSTANTS } from "../scripts/fetch-core.mjs";
import { createTransport } from "../scripts/transport.mjs";

/* Cổng cao, cố định. Cổng ngẫu nhiên nghe hay hơn nhưng làm một lượt đỏ không dựng lại được. */
const CONG = 39947;
const TOKEN = crypto.randomBytes(32).toString("base64url");
const ORIGIN = "chrome-extension://" + "abcdefghijklmnop".repeat(2);
const pairing = {
  schema_version: 1, host: "127.0.0.1", port: CONG,
  http_url: `http://127.0.0.1:${CONG}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${CONG}/v1/extension`,
  token: TOKEN
};

const san = fs.mkdtempSync(path.join(os.tmpdir(), "hnx-day-"));

/* ---- Lớp WebSocket đủ dùng cho transport ---------------------------------
 * Bề mặt transport thật sự đụng tới, không hơn: `onopen` · `onmessage` · `onclose` · `onerror` ·
 * `send` · `close` · `readyState` · hằng `OPEN`. Dựng đúng bấy nhiêu — một bản giả đầy đủ hơn
 * chỉ là thêm mã không ai canh. */
class WsGia {
  static OPEN = 1;
  static CONNECTING = 0;
  static CLOSED = 3;

  constructor(url) {
    this.readyState = WsGia.CONNECTING;
    this.onopen = null; this.onmessage = null; this.onclose = null; this.onerror = null;
    const cong = Number(new URL(url).port);
    this._decoder = createFrameDecoder({ maxPayloadBytes: 1 << 20, requireMasked: false });
    this._daNangCap = false;
    this._socket = net.connect(cong, "127.0.0.1", () => {
      this._socket.write([
        "GET /v1/extension HTTP/1.1",
        `Host: 127.0.0.1:${cong}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Origin: ${ORIGIN}`,
        "Sec-WebSocket-Key: " + crypto.randomBytes(16).toString("base64"),
        "Sec-WebSocket-Version: 13",
        "\r\n"
      ].join("\r\n"));
    });
    this._socket.on("data", (chunk) => this._nhan(chunk));
    this._socket.on("close", () => this._dong());
    this._socket.on("error", () => { if (this.onerror) this.onerror({}); this._dong(); });
  }

  _nhan(chunk) {
    let phan = chunk;
    if (!this._daNangCap) {
      const vt = chunk.indexOf("\r\n\r\n");
      if (vt < 0) return;
      const dau = chunk.subarray(0, vt).toString("utf8");
      if (!/^HTTP\/1\.1 101 /.test(dau)) { this._dong(); return; }
      this._daNangCap = true;
      this.readyState = WsGia.OPEN;
      if (this.onopen) this.onopen({});
      phan = chunk.subarray(vt + 4);
      if (!phan.length) return;
    }
    for (const khung of this._decoder.push(phan)) {
      if (khung.opcode === 0x8) { this._dong(); continue; }
      if (khung.opcode !== 0x1) continue;
      if (this.onmessage) this.onmessage({ data: khung.text });
    }
  }

  _dong() {
    if (this.readyState === WsGia.CLOSED) return;
    this.readyState = WsGia.CLOSED;
    if (this.onclose) this.onclose({});
  }

  /* `masked: true` là bắt buộc, đúng chuẩn: khung đi TỪ client mà không che là khung sai, và
   * máy chủ dựng bộ giải mã với `requireMasked: true` nên nó sẽ đóng kết nối. */
  send(text) { this._socket.write(encodeFrame(text, { masked: true })); }
  close() { this._socket.destroy(); this._dong(); }
}

/* ---- Kho lưu giả, đủ cho transport và cái phanh --------------------------- */
const kho = Object.create(null);
const chromeApi = {
  runtime: { id: "hnx-fetch-e2e" },
  storage: {
    local: {
      async get(keys) {
        const ra = {};
        for (const k of [].concat(keys)) if (k in kho) ra[k] = kho[k];
        return ra;
      },
      async set(o) { Object.assign(kho, o); },
      async remove(k) { delete kho[k]; }
    },
    onChanged: { addListener() {} }
  }
};

let soLuotGoiMang = 0;
const handlers = createSeedHandlers({
  chromeApi, BridgeProtocolError, negotiateVersion, capabilities,
  fetch: async (url) => {
    soLuotGoiMang += 1;
    return {
      ok: true, status: 200, url: String(url),
      headers: new Map([["content-type", "text/html; charset=utf-8"]]),
      text: async () => "<html>xin chao</html>",
      arrayBuffer: async () => new TextEncoder().encode("<html>xin chao</html>").buffer
    };
  }
});

const may = createHnxFetchBridge({ pairing, root: san });
const transport = createTransport({
  chrome: chromeApi,
  WebSocket: WsGia,
  crypto: globalThis.crypto,
  dispatch: createDispatcher({ handlers }),
  max_envelope_bytes: MAX_ENVELOPE_BYTES
});

/* Gọi vào cửa HTTP của máy chủ — đúng đường mà một lệnh `node` thật đi. */
let soThuTu = 0;
async function goi(method, params) {
  soThuTu += 1;
  const tra = await fetch(pairing.http_url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      protocol: PROTOCOL, version: 1, kind: "request",
      request_id: `e2e-${String(soThuTu).padStart(4, "0")}`,
      method, sent_at: new Date().toISOString(),
      client: { client_id: "phep-ghim-e2e" },
      params: params || {}
    })
  });
  return await tra.json();
}

const cho = (ms) => new Promise((r) => setTimeout(r, ms));

let loi = null;
try {
  await may.start();
  await chromeApi.storage.local.set({ [transport.PAIRING_STORAGE_KEY]: pairing });
  await transport.loadPairing();
  await transport.connect();

  /* ---- ⑴ Bắt tay đi trọn vòng ------------------------------------------- */
  {
    /* Chờ có điều kiện, không ngủ một khoảng cố định: một `sleep(500)` là một phép ghim chập
     * chờn trên máy chậm, và một phép ghim chập chờn thì người ta chạy lại cho tới khi nó xanh. */
    for (let i = 0; i < 100 && transport.state() !== "connected"; i += 1) await cho(20);
    assert.equal(transport.state(), "connected",
      "bắt tay hai chiều không xong — kiểm tên giao thức hai đầu trước tiên");
    assert.equal(PROTOCOL_HOST, PROTOCOL, "máy chủ và extension phải nói cùng một tên giao thức");
  }

  /* ---- ⑵ Một lệnh CHỈ ĐỌC đi xuống extension và quay về ------------------ */
  {
    const t = await goi("system.ping");
    assert.equal(t.ok, true, `system.ping hỏng: ${JSON.stringify(t.error || {})}`);
    assert.equal(t.result.hnx_fetch, "online");
    assert.equal(t.result.seed, "hnx-fetch-v0.1");

    const c = await goi("system.capabilities");
    assert.equal(c.ok, true);
    assert.deepEqual(c.result.methods.map((m) => m.name),
      ["session.hello", "system.capabilities", "system.ping", "scout.fetch"],
      "bảng năng lực NHÌN TỪ NGOÀI DÂY phải đúng bốn lệnh — đây mới là thứ AI vận hành đọc");
  }

  /* ---- ⑶ Lệnh KHÔNG TỒN TẠI bị từ chối, qua cả sợi dây ------------------- */
  {
    const t = await goi("scout.click", { selector: "button" });
    assert.equal(t.ok, false);
    assert.equal(t.error.code, "METHOD_NOT_FOUND",
      "scout.click phải KHÔNG TỒN TẠI ở đây, không phải tồn-tại-mà-bị-chặn");
  }

  /* ---- ⑷ CÁI PHANH chặn thật qua dây, và KHÔNG chạm mạng ----------------- */
  {
    const truoc = soLuotGoiMang;
    const t = await goi("scout.fetch", { url: "https://hnx.vn/vi-vn/phai-sinh/thong-ke.html" });
    assert.equal(t.ok, false);
    assert.equal(t.error.details.write_code, "DEV_MODE_OFF");
    assert.equal(soLuotGoiMang, truoc, "công tắc TẮT mà lượt gọi mạng vẫn đi ra — phanh thủng");
  }

  /* ---- ⑸ Mở khoá thì đi được, và ngân sách trừ thật qua dây -------------- */
  {
    await setWriteGate(chromeApi, true);
    const t = await goi("scout.fetch", { url: "https://hnx.vn/vi-vn/phai-sinh/thong-ke.html" });
    assert.equal(t.ok, true, `scout.fetch hỏng: ${JSON.stringify(t.error || {})}`);
    assert.equal(t.result.status, 200);
    assert.match(t.result.body, /xin chao/);
    assert.equal(t.result.write_budget.used, 1);
    assert.equal(t.result.write_budget.remaining, SEED_CONSTANTS.WRITE_CAP_PER_UNLOCK - 1);
    assert.equal(soLuotGoiMang, 1);
  }

  /* ---- ⑹ `file.*` dừng ở MÁY CHỦ, không xuống extension ------------------
   * Đây là ranh giới kiến trúc của cả gói: extension chỉ TẢI, tiến trình Node mới ĐẶT tệp xuống
   * đĩa. Nếu một ngày `file.write` đi xuống extension thì vùng ghi đã bị nới ra ngoài tầm kiểm. */
  {
    const t = await goi("file.write", { path: "thu.txt", content: "xin chao" });
    assert.equal(t.ok, true, `file.write hỏng: ${JSON.stringify(t.error || {})}`);
    assert.equal(fs.readFileSync(path.join(san, "thu.txt"), "utf8"), "xin chao");

    const h = await goi("host.capabilities");
    assert.equal(h.ok, true);
    assert.equal(h.result.protocol, PROTOCOL);
    assert.equal(h.result.host, "hnx-fetch-host");
    assert.ok(h.result.local_methods.includes("file.write"));
    /* Máy chủ phải nói thẳng cái KHÔNG có, đừng bắt người gọi suy ra từ chỗ vắng mặt. */
    assert.ok(h.result.absent && h.result.absent["file.delete"], "phải khai rõ vì sao không có file.delete");
  }

  /* ---- ⑺ Vùng ghi nhốt được: đường đi ra ngoài bị TỪ CHỐI ---------------- */
  {
    const t = await goi("file.write", { path: "../thoat.txt", content: "khong duoc" });
    assert.equal(t.ok, false, "ghi ra ngoài vùng phải bị từ chối");
    assert.ok(!fs.existsSync(path.join(path.dirname(san), "thoat.txt")), "tệp đã lọt ra ngoài vùng ghi");
  }

  console.log("day-tron-vong-smoke: 7 khoi, tat ca DAT");
} catch (e) {
  loi = e;
} finally {
  try { transport.disconnect(); } catch { /* đóng được tới đâu hay tới đó */ }
  try { await may.stop(); } catch { /* nt */ }
  fs.rmSync(san, { recursive: true, force: true });
}

if (loi) throw loi;

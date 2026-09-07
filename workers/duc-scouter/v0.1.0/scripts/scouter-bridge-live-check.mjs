#!/usr/bin/env node
/* scouter-bridge-live-check.mjs — ĐO THẬT: Scouter seed có nối được vào MÁY CHỦ BRIDGE THẬT không.
 *
 * Vì sao cần, dù đã có hai phép ghim: phép ghim dựng máy chủ GIẢ. Một máy chủ giả nói đúng thứ
 * mà người viết nó TƯỞNG máy chủ thật nói — và brief `SCOUTER-SEED-01` mục 2 tồn tại đúng vì
 * chuyện tưởng nhầm đó đã xảy ra một lần (bảng "6 file giống hệt nhau" hoá ra sai khi đo lại).
 * File này bỏ hết đồ giả ở phía máy chủ: nó khởi động `bridge-host.mjs` THẬT trong tiến trình,
 * trên một cổng trống, rồi bắn RPC thật qua cửa HTTP của nó.
 *
 * Cái CÒN giả: `ObserverEngine`. Bốn phép dò cần `chrome.debugger`, không có trong Node. Phần
 * đó đã được ghim ở `tests/observer-probes-smoke.mjs` và bốn con W1..W4 của
 * `scripts/observer-mutation-check.mjs`. Cái đo ở đây là DÂY và TỪ VỰNG, nói rõ để không ai
 * đọc kết quả này thành "phép dò đã chạy trên trang thật".
 *
 * KHÔNG nằm trong suite mặc định, cố ý: nó mở một cổng nghe và đọc file của gói worker khác.
 * Cùng kiểu với `scripts/scouter-input-trust-probe.mjs`.
 *
 * Mã thoát: 0 ĐẠT · 1 KHÔNG ĐẠT · 2 KHÔNG CHẠY ĐƯỢC (khác hẳn "không đạt" — đừng ghi nhầm).
 *
 * Chạy: node scripts/scouter-bridge-live-check.mjs
 */

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
/* Máy chủ thật nằm trong gói ChatGPT. CHỈ ĐỌC — đây là gói của lane khác (AGENTS.md mục 1).
 * Ba bản host trong repo KHÁC NHAU, và chỉ bản này đòi bắt tay hai chiều; đó là bản seed nhắm tới. */
const HOST_DIR = path.join(ROOT, "..", "..", "duc-auto-chatgpt", "v0.1.0", "duc-auto-chatgpt-loopback-bridge-host-v1");

function khongChayDuoc(ly_do) {
  console.error(`KHÔNG CHẠY ĐƯỢC: ${ly_do}`);
  console.error("Mã thoát 2 nghĩa là phép đo không chạy được, KHÔNG phải 'không đạt'.");
  process.exit(2);
}

for (const file of ["bridge-host.mjs", "websocket-core.mjs"]) {
  if (!fs.existsSync(path.join(HOST_DIR, file))) khongChayDuoc(`không thấy ${path.join(HOST_DIR, file)}`);
}

const { createBridgeHost } = await import(`file://${path.join(HOST_DIR, "bridge-host.mjs").split(path.sep).join("/")}`);
const { createFrameDecoder, encodeFrame } = await import(`file://${path.join(HOST_DIR, "websocket-core.mjs").split(path.sep).join("/")}`);

const bridgeCore = await import("./scouter-bridge-core.mjs");
const { createSeedHandlers } = await import("./scouter-seed-core.mjs");
const { createTransport } = await import("./scouter-transport-loopback.mjs");

/* ---- Một WebSocket đủ dùng, trên http.request -----------------------------
 * `globalThis.WebSocket` của Node không đặt được header `Origin`, mà máy chủ ĐÒI
 * `chrome-extension://[a-p]{32}` (`bridge-host.mjs:227`). Nên lớp này dựng tay lượt nâng cấp
 * giao thức, dùng chính bộ mã khung của máy chủ. Nó chỉ có đúng bề mặt mà transport dùng:
 * `readyState` · `send` · `close` · `onopen/onmessage/onclose/onerror` · hằng `OPEN`. */
class NodeExtensionSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url) {
    const parsed = new URL(url);
    this.readyState = NodeExtensionSocket.CONNECTING;
    this.onopen = null;
    this.onmessage = null;
    this.onclose = null;
    this.onerror = null;
    this.socket = null;

    const request = http.request({
      host: parsed.hostname,
      port: Number(parsed.port),
      path: parsed.pathname,
      headers: {
        Connection: "Upgrade",
        Upgrade: "websocket",
        "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": crypto.randomBytes(16).toString("base64"),
        Origin: `chrome-extension://${"a".repeat(32)}`
      }
    });
    request.on("upgrade", (_response, socket, head) => {
      this.socket = socket;
      this.readyState = NodeExtensionSocket.OPEN;
      const decoder = createFrameDecoder({ requireMasked: false });
      const feed = (chunk) => {
        for (const frame of decoder.push(chunk)) {
          if (frame.opcode === 0x1 && this.onmessage) this.onmessage({ data: frame.text });
        }
      };
      socket.on("data", feed);
      socket.on("close", () => {
        this.readyState = NodeExtensionSocket.CLOSED;
        if (this.onclose) this.onclose();
      });
      if (head.length) feed(head);
      if (this.onopen) this.onopen();
    });
    request.on("error", () => {
      this.readyState = NodeExtensionSocket.CLOSED;
      if (this.onerror) this.onerror();
      if (this.onclose) this.onclose();
    });
    request.end();
  }

  send(text) {
    this.socket.write(encodeFrame(text, { masked: true }));
  }

  close() {
    this.readyState = NodeExtensionSocket.CLOSED;
    try { this.socket?.destroy(); } catch (_error) { /* Cố hết sức. */ }
  }
}

/* ---- Dựng sân --------------------------------------------------------- */

async function congTrong() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function base64Url(bytes) {
  return Buffer.from(bytes).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

const PORT = await congTrong();
const TOKEN = base64Url(crypto.randomBytes(32));
const PAIRING = {
  schema_version: 1,
  host: "127.0.0.1",
  port: PORT,
  http_url: `http://127.0.0.1:${PORT}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${PORT}/v1/extension`,
  token: TOKEN
};

const store = { "dac.bridge.pairing.v1": PAIRING };
const fakeChrome = {
  runtime: { id: "a".repeat(32), reload() { throw new Error("live-check không được nạp lại gì"); } },
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

/* Engine giả — xem khối đầu file: `chrome.debugger` không tồn tại trong Node. */
const fakeEngine = {
  async scanTargets() {
    return [{ targetId: "LIVE-TARGET", attached: false, type: "page", title: "trang thử", url: "https://example.test/" }];
  },
  async runProbe(_target, name) {
    return { ok: true, probe: name, data: { stub: true }, cdp: [] };
  },
  async runAction(_target, name, params) {
    return { ok: true, action: name, data: { stub: true, params }, cdp: [] };
  }
};

const handlers = createSeedHandlers({
  engine: fakeEngine,
  chromeApi: fakeChrome,
  BridgeProtocolError: bridgeCore.BridgeProtocolError,
  negotiateVersion: bridgeCore.negotiateVersion,
  capabilities: bridgeCore.capabilities
});

const host = createBridgeHost({ pairing: PAIRING });
await host.start();

const transport = createTransport({
  chrome: fakeChrome,
  WebSocket: NodeExtensionSocket,
  crypto: globalThis.crypto,
  dispatch: bridgeCore.createDispatcher({ handlers }),
  max_envelope_bytes: bridgeCore.MAX_ENVELOPE_BYTES
});

/* ---- Gọi RPC qua cửa HTTP thật ------------------------------------------ */

let ordinal = 0;
function rpc(method, params, target) {
  ordinal += 1;
  const envelope = {
    protocol: bridgeCore.PROTOCOL,
    version: 1,
    kind: "request",
    request_id: `live-${String(ordinal).padStart(6, "0")}`,
    method,
    sent_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    client: { client_id: "scouter-live-check", name: "live-check", version: "1" },
    params: params || {}
  };
  if (target) envelope.target = target;
  const body = Buffer.from(JSON.stringify(envelope), "utf8");
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1", port: PORT, path: "/v1/rpc", method: "POST",
      headers: { "content-type": "application/json", "content-length": body.length, authorization: `Bearer ${TOKEN}` }
    }, (response) => {
      const chunks = [];
      response.on("data", (chunk) => chunks.push(chunk));
      response.on("end", () => {
        try { resolve(JSON.parse(Buffer.concat(chunks).toString("utf8"))); }
        catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    request.end(body);
  });
}

async function doiNoi(timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (transport.state() === "connected") return true;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return false;
}

/* ---- Đo ------------------------------------------------------------------ */

let mã = 0;
try {
  await transport.connect();
  if (!await doiNoi()) {
    console.error("KHÔNG ĐẠT: seed không hoàn tất được bắt tay với máy chủ Bridge thật.");
    mã = 1;
  } else {
    console.log("① bắt tay hai chiều với máy chủ THẬT: ĐẠT");

    const caps = await rpc("system.capabilities");
    assert.equal(caps.ok, true, `system.capabilities: ${JSON.stringify(caps.error || {})}`);
    assert.equal(caps.result.methods.length, bridgeCore.METHOD_NAMES.length);
    console.log(`② system.capabilities đi trọn vòng: ĐẠT (${caps.result.methods.length} method)`);

    const hello = await rpc("session.hello", { supported_versions: [1] });
    assert.equal(hello.ok, true, `session.hello: ${JSON.stringify(hello.error || {})}`);
    assert.equal(hello.result.selected_version, 1);

    const targets = await rpc("scout.targets");
    assert.equal(targets.ok, true, `scout.targets: ${JSON.stringify(targets.error || {})}`);
    assert.equal(targets.result.probe, "targets.list");
    console.log("③ một phép dò đi trọn vòng qua dây: ĐẠT (engine là bản giả — xem đầu file)");

    const unknown = await rpc("scout.drag", { x: 1 });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.error.code, "METHOD_NOT_FOUND");
    console.log("④ method ngoài từ vựng bị từ chối qua dây thật: ĐẠT");

    const badParams = await rpc("scout.page", {});
    assert.equal(badParams.ok, false);
    assert.equal(badParams.error.code, "INVALID_PARAMS");
    console.log("⑤ tham số thiếu bị từ chối qua dây thật: ĐẠT");

    /* S-05: cái phanh phải chặn được QUA DÂY THẬT, không chỉ trong phép ghim chạy trong bộ nhớ.
     * Đây là chiều quan trọng hơn của hai chiều: nó là thứ chứng minh một AI ở đầu dây bên kia
     * — đúng vị trí của kẻ đáng lo — không bấm được gì khi Đức chưa mở khoá. */
    const chanTruoc = await rpc("scout.click", { target_id: "LIVE-TARGET", selector: "button" });
    assert.equal(chanTruoc.ok, false, "công tắc TẮT mà lệnh bấm vẫn lọt qua dây thật");
    assert.equal(chanTruoc.error.code, "WRITE_BLOCKED");
    assert.equal(chanTruoc.error.details.write_code, "DEV_MODE_OFF");
    /* Và không method nào của từ vựng mở được cái khoá đó hộ người gọi. */
    assert.equal(store["scouter.write.gate.v1"], undefined, "một method qua dây đã tự mở khoá cho nó");
    console.log("⑥ công tắc TẮT: ba lệnh ghi bị chặn qua dây thật: ĐẠT");

    /* Mở khoá đúng cách người mở: ghi thẳng vào kho lưu, như popup làm. Không có đường nào từ
     * phía máy chủ làm được việc này, và đó chính là điều khối trên vừa đo. */
    store["scouter.write.gate.v1"] = { enabled: true, enabled_at: 1, used: 0 };

    /* S-01: ba method GHI cũng phải đi trọn vòng qua dây thật — và quan trọng hơn: một yêu cầu
     * mang TOẠ ĐỘ phải chết ngay ở cổng phong bì, trước khi chạm tới Chrome. */
    const click = await rpc("scout.click", { target_id: "LIVE-TARGET", selector: "button" });
    assert.equal(click.ok, true, `scout.click: ${JSON.stringify(click.error || {})}`);
    assert.equal(click.result.action, "input.click");

    const type = await rpc("scout.type", { target_id: "LIVE-TARGET", selector: "#txt", text: "xin chao" });
    assert.equal(type.ok, true, `scout.type: ${JSON.stringify(type.error || {})}`);

    const key = await rpc("scout.key", { target_id: "LIVE-TARGET", selector: "#txt", key: "Enter" });
    assert.equal(key.ok, true, `scout.key: ${JSON.stringify(key.error || {})}`);
    /* Ngân sách phải trừ THẬT qua dây, không chỉ trong bộ nhớ của lõi. */
    assert.equal(store["scouter.write.gate.v1"].used, 3, "ba lượt bấm mà ngân sách không trừ đủ");
    assert.equal(key.result.write_budget.remaining, 47);
    console.log("⑦ mở khoá rồi: ba hành động ghi đi trọn vòng, ngân sách trừ đúng: ĐẠT (engine là bản giả — xem đầu file)");

    const toaDo = await rpc("scout.click", { target_id: "LIVE-TARGET", selector: "button", x: 10, y: 10 });
    assert.equal(toaDo.ok, false, "yêu cầu mang toạ độ lọt qua dây thật");
    assert.equal(toaDo.error.code, "INVALID_PARAMS");

    const phimLa = await rpc("scout.key", { target_id: "LIVE-TARGET", selector: "#txt", key: "F5" });
    assert.equal(phimLa.ok, false, "phím ngoài bảng lọt qua dây thật");
    assert.equal(phimLa.error.code, "INVALID_PARAMS");
    console.log("⑧ toạ độ và phím ngoài bảng bị chặn ngay ở cổng phong bì: ĐẠT");

    console.log("\nscouter-bridge live check: ĐẠT — seed nói đúng giao thức của máy chủ Bridge thật.");
  }
} catch (error) {
  console.error(`KHÔNG ĐẠT: ${error?.message || error}`);
  mã = 1;
} finally {
  transport.disconnect();
  await host.stop();
}

process.exit(mã);

/* Phép ghim cho DÂY của cửa Bridge — `scripts/scouter-transport-loopback.mjs`.
 *
 * Nghiệm thu mục 5 của BRIEF-SCOUTER-SEED-01, khả năng ② "báo cáo qua Bridge": lõi giao thức
 * ở `tests/scouter-bridge-smoke.mjs`, còn file này ghim ĐƯỜNG ĐI THẬT trên socket.
 *
 * Vì sao phải có mẻ riêng: lõi chỉ bảo vệ được thứ ĐI QUA lõi. Một lớp dây tự trả lời khung
 * `rpc` mà không gọi lõi, hoặc đưa token ra trước khi máy chủ chứng minh nó biết token, sẽ đi
 * vòng qua toàn bộ phép ghim của lõi mà lõi vẫn xanh. Bài học này đã trả giá ở
 * `scripts/observer-mutation-check.mjs` (mẻ NỐI DÂY, bốn con W1..W4).
 *
 * Máy chủ giả ở đây tính HMAC THẬT bằng WebCrypto, đúng công thức `hostProof()` của
 * `bridge-host.mjs:76` — nên một bản transport bỏ qua bước kiểm bằng chứng sẽ ĐỎ, không phải
 * xanh nhờ một máy chủ giả dễ tính.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { createTransport, validatePairing, verifyHostProof, TRANSPORT_CONSTANTS } =
  await import("../scripts/scouter-transport-loopback.mjs");

const PORT = 32147;
const TOKEN = base64Url(new Uint8Array(32).map((_value, index) => (index * 7 + 3) & 0xff));
const PAIRING = Object.freeze({
  schema_version: 1,
  host: "127.0.0.1",
  port: PORT,
  http_url: `http://127.0.0.1:${PORT}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${PORT}/v1/extension`,
  token: TOKEN
});

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlBytes(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/* Đúng công thức của máy chủ thật: HMAC-SHA256(khoá = 32 byte token, dữ liệu = nonce). */
async function hostProof(token, nonce) {
  const key = await crypto.subtle.importKey("raw", base64UrlBytes(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(nonce));
  return base64Url(new Uint8Array(signature));
}

/* ---- Đồ giả -------------------------------------------------------------- */

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static last = null;

  constructor(url) {
    this.url = url;
    this.readyState = FakeSocket.OPEN;
    this.sent = [];
    this.closed = null;
    FakeSocket.last = this;
  }

  send(text) { this.sent.push(JSON.parse(text)); }

  close(code, reason) {
    this.readyState = FakeSocket.CLOSED;
    this.closed = { code, reason };
  }

  /* `onmessage` của transport là hàm đồng bộ ném việc vào một promise (nó phải thế: WebSocket
   * không await handler). Nên gửi xong phải XẢ vòng lặp sự kiện thật, không thì test đọc trạng
   * thái trước khi việc kịp chạy — và một transport hỏng sẽ trông y hệt một transport chậm. */
  async deliver(message) {
    this.onmessage({ data: JSON.stringify(message) });
    await flush();
  }

  frames(type) { return this.sent.filter((frame) => frame.type === type); }
}

/* Ba nhịp là đủ cho chuỗi await dài nhất ở đây (đọc storage → nhập khoá → kiểm HMAC). */
async function flush() {
  for (let index = 0; index < 3; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

function makeTimers() {
  const timeouts = new Map();
  const intervals = new Map();
  let nextId = 1;
  return {
    timeouts,
    intervals,
    setTimeout(callback, delay) { const id = nextId++; timeouts.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(callback, delay) { const id = nextId++; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); },
    fireTimeouts() { const queued = [...timeouts.entries()]; timeouts.clear(); for (const [, item] of queued) item.callback(); },
    fireIntervals() { for (const [, item] of [...intervals.entries()]) item.callback(); }
  };
}

function makeChrome(pairing = PAIRING) {
  const store = pairing ? { "dac.bridge.pairing.v1": pairing } : {};
  return {
    store,
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

function makeRig(overrides = {}) {
  const timers = makeTimers();
  const chromeApi = makeChrome(overrides.pairing === undefined ? PAIRING : overrides.pairing);
  const dispatched = [];
  const transport = createTransport({
    chrome: chromeApi,
    WebSocket: FakeSocket,
    crypto: globalThis.crypto,
    timers,
    dispatch: async (envelope) => {
      dispatched.push(envelope);
      return { protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "response", request_id: envelope.request_id, ok: true, result: {}, responded_at: "2026-09-06T10:00:00.000Z" };
    },
    ...overrides.options
  });
  return { transport, timers, chromeApi, dispatched };
}

/* Đưa một socket đi trọn vòng bắt tay hai chiều, trả về socket đã xác thực. */
async function handshake(rig) {
  await rig.transport.connect();
  const socket = FakeSocket.last;
  socket.onopen();
  const challenge = socket.frames("auth_challenge")[0];
  await socket.deliver({ type: "auth_proof", proof: await hostProof(TOKEN, challenge.nonce) });
  await socket.deliver({ type: "auth_ok", session_id: "s-1" });
  return socket;
}

/* ---- ① Bắt tay HAI CHIỀU: token không rời tay trước khi máy chủ tự chứng minh --- */
{
  const rig = makeRig();
  await rig.transport.connect();
  const socket = FakeSocket.last;
  assert.equal(socket.url, PAIRING.websocket_url, "nối sai địa chỉ");

  socket.onopen();
  const challenge = socket.frames("auth_challenge")[0];
  assert.ok(challenge, "mở socket xong phải gửi auth_challenge trước tiên");
  assert.equal(challenge.role, "extension");
  assert.match(challenge.nonce, /^[A-Za-z0-9_-]{43}$/, "nonce phải là 32 byte base64url");
  assert.deepEqual(socket.frames("auth"), [], "token rời tay TRƯỚC khi máy chủ chứng minh — đây là lỗ bảo mật của hai bản worker cũ");

  await socket.deliver({ type: "auth_proof", proof: await hostProof(TOKEN, challenge.nonce) });
  const auth = socket.frames("auth")[0];
  assert.ok(auth, "máy chủ đã chứng minh xong mà token vẫn không được gửi");
  assert.equal(auth.token, TOKEN);
  assert.equal(auth.role, "extension");

  await socket.deliver({ type: "auth_ok", session_id: "s-1" });
  assert.equal(rig.transport.state(), "connected");
}

/* ---- ② Bằng chứng SAI thì đứt, và token không bao giờ ra ---------------- */
{
  for (const badProof of [
    await hostProof(TOKEN, "nonce-khac"),
    base64Url(new Uint8Array(32)),
    "khong-phai-base64url",
    ""
  ]) {
    const rig = makeRig();
    await rig.transport.connect();
    const socket = FakeSocket.last;
    socket.onopen();
    await socket.deliver({ type: "auth_proof", proof: badProof });
    assert.deepEqual(socket.frames("auth"), [], `token lọt ra với bằng chứng sai: ${badProof.slice(0, 12)}`);
    assert.ok(socket.closed, "bằng chứng sai mà socket không bị đóng");
    assert.equal(socket.closed.code, 1008);
    assert.equal(rig.transport.state(), "disconnected");
  }
}

/* ---- ③ `auth_ok` không có bắt tay đứng sau thì bị vứt ------------------- */
{
  const rig = makeRig();
  await rig.transport.connect();
  const socket = FakeSocket.last;
  socket.onopen();
  await socket.deliver({ type: "auth_ok", session_id: "s-1" });
  assert.equal(rig.transport.state(), "disconnected", "auth_ok trần đủ để coi là đã xác thực");
  assert.equal(socket.closed.code, 1008);
}

/* ---- ④ Một socket xác thực ĐÚNG MỘT LẦN -------------------------------- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  assert.equal(rig.transport.state(), "connected");
  await socket.deliver({ type: "auth_ok", session_id: "s-2" });
  assert.ok(socket.closed, "auth_ok lặp lại phải bị coi là khung lạ");
  assert.equal(rig.transport.state(), "disconnected");
}

/* ---- ⑤ `rpc` TRƯỚC khi xác thực: không dispatch, đứt luôn -------------- */
{
  const rig = makeRig();
  await rig.transport.connect();
  const socket = FakeSocket.last;
  socket.onopen();
  await socket.deliver({ type: "rpc", relay_id: "r-1", envelope: { method: "system.ping" } });
  assert.deepEqual(rig.dispatched, [], "khung rpc chưa xác thực vẫn tới được lõi");
  assert.deepEqual(socket.frames("rpc_response"), []);
  assert.equal(socket.closed.code, 1008);
}

/* ---- ⑥ Chiều NGƯỢC LẠI: `rpc` hợp lệ đi tới lõi và trả về đúng relay_id -- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  await socket.deliver({ type: "rpc", relay_id: "r-42", envelope: { request_id: "req-000001", method: "system.ping" } });
  assert.equal(rig.dispatched.length, 1, "khung rpc hợp lệ không tới được lõi");
  assert.equal(rig.dispatched[0].method, "system.ping");
  const answer = socket.frames("rpc_response")[0];
  assert.ok(answer, "không có phản hồi nào rời socket");
  assert.equal(answer.relay_id, "r-42", "relay_id lệch: máy chủ sẽ không đối chiếu được");
  assert.equal(answer.envelope.request_id, "req-000001");
}

/* ---- ⑦ Khung rác: JSON hỏng 1007, loại lạ 1008 -------------------------- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  socket.onmessage({ data: "{khong-phai-json" });
  await flush();
  assert.equal(socket.closed.code, 1007);

  const rig2 = makeRig();
  const socket2 = await handshake(rig2);
  await socket2.deliver({ type: "hay-lam-viec-nay", payload: 1 });
  assert.equal(socket2.closed.code, 1008, "khung loại lạ phải làm đứt, không được lờ đi");
  assert.deepEqual(rig2.dispatched, []);
}

/* ---- ⑧ Nhịp tim: không ai trả lời thì socket nửa mở bị bỏ -------------- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  rig.timers.fireIntervals();
  assert.equal(socket.frames("keepalive").length, 1, "tới nhịp mà không có lần dò nào bắn ra");
  assert.equal(rig.transport.state(), "connected");

  rig.timers.fireTimeouts();                       // hạn chót ACK
  assert.ok(socket.closed, "lần dò không ai trả lời mà socket vẫn được coi là sống");
  assert.equal(rig.transport.state(), "disconnected");
}

/* ---- ⑨ Chiều ngược lại: có ACK thì socket sống tiếp -------------------- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  rig.timers.fireIntervals();
  await socket.deliver({ type: "keepalive_ack" });
  rig.timers.fireTimeouts();
  assert.equal(socket.closed, null, "có ACK rồi mà vẫn bị cắt: nhịp tim này giết oan");
  assert.equal(rig.transport.state(), "connected");
}

/* ---- ⑩ Socket đứt thì có hẹn nối lại ----------------------------------- */
{
  const rig = makeRig();
  const socket = await handshake(rig);
  socket.readyState = FakeSocket.CLOSED;
  socket.onclose();
  assert.equal(rig.transport.state(), "disconnected");
  assert.ok(rig.timers.timeouts.size >= 1, "đứt kết nối mà không hẹn nối lại lần nào");
}

/* ---- ⑪ Ghép cặp: chỉ 127.0.0.1, đúng đường dẫn cố định, token 32 byte --- */
{
  assert.deepEqual(validatePairing(PAIRING), PAIRING);

  const bad = [
    { ...PAIRING, host: "localhost" },
    { ...PAIRING, host: "10.0.0.5" },
    { ...PAIRING, port: 80 },
    { ...PAIRING, port: 70000 },
    { ...PAIRING, schema_version: 2 },
    { ...PAIRING, websocket_url: `ws://127.0.0.1:${PORT}/v1/anything` },
    { ...PAIRING, http_url: `http://127.0.0.1:${PORT}/rpc` },
    { ...PAIRING, websocket_url: `wss://evil.test:${PORT}/v1/extension` },
    { ...PAIRING, token: "qua-ngan" },
    { ...PAIRING, token: base64Url(new Uint8Array(16)) },
    null,
    []
  ];
  for (const input of bad) {
    assert.throws(() => validatePairing(input), /PAIRING_/, `ghép cặp sai lọt qua: ${JSON.stringify(input)}`);
  }

  /* Chưa ghép cặp thì không mở socket nào cả. */
  const rig = makeRig({ pairing: null });
  const before = FakeSocket.last;
  await rig.transport.connect();
  assert.equal(FakeSocket.last, before, "chưa ghép cặp mà vẫn mở socket");
  assert.equal(rig.transport.state(), "unpaired");

  /* Tệp ghép cặp HỎNG nằm sẵn trong kho lưu: kết quả là "chưa ghép cặp", không phải một ngoại
   * lệ bay ra khỏi service worker — và tuyệt đối không phải một socket được mở. */
  const rigBad = makeRig({ pairing: { ...PAIRING, host: "evil.test" } });
  const beforeBad = FakeSocket.last;
  await rigBad.transport.connect();
  assert.equal(FakeSocket.last, beforeBad, "ghép cặp hỏng mà vẫn mở socket");
  assert.equal(rigBad.transport.state(), "unpaired");
}

/* ---- ⑫ CHỐNG TRÔI DẠT: luật ghép cặp phải khớp bản dùng chung của ba worker ---
 * `bridge-pairing-core.js` là file DUY NHẤT giống hệt từng byte ở cả ba worker (đo 06/09).
 * Seed viết lại luật đó vì bản kia là IIFE toàn cục, không nạp được vào ESM. Hai bản của MỘT
 * luật thì sớm muộn nói hai câu khác nhau — nên ghim chúng vào nhau tại đây. Đỏ ở đây nghĩa
 * là hợp đồng ghép cặp vừa đổi ở đâu đó, và Scouter phải đi theo. */
{
  /* Ba gói kia là HÀNG XÓM của gói này trong `workers/` (ADR-0013). Chỉ đọc — vùng của lane khác. */
  const workers = [
    "duc-auto-gemini/v0.2.0/bridge-pairing-core.js",
    "duc-auto-chatgpt/v0.1.0/bridge-pairing-core.js",
    "duc-auto-gg-flow-video/v0.1.0/bridge-pairing-core.js"
  ].map((relative) => path.join(ROOT, "..", "..", relative));

  const bodies = workers.map((file) => fs.readFileSync(file, "utf8"));
  assert.equal(new Set(bodies).size, 1, "ba bản bridge-pairing-core.js đã trôi khỏi nhau — đọc lại cả ba trước khi tin bản nào");

  const shared = bodies[0];
  for (const literal of ['"127.0.0.1"', "/v1/rpc", "/v1/extension", "{43}", "1024", "65535"]) {
    assert.ok(shared.includes(literal), `hằng số hợp đồng biến mất khỏi bản dùng chung: ${literal}`);
  }
  assert.equal(TRANSPORT_CONSTANTS.PAIRING_STORAGE_KEY, "dac.bridge.pairing.v1",
    "khoá lưu ghép cặp phải trùng bản worker, nếu không Scouter đọc nhầm chỗ");
  assert.ok(shared.includes('"dac.bridge.pairing.v1"'), "khoá lưu ghép cặp đã đổi ở bản dùng chung");
}

/* ---- ⑬ `verifyHostProof` từ chối rác mà không nổ ------------------------ */
{
  assert.equal(await verifyHostProof(globalThis.crypto, TOKEN, "n", null), false);
  assert.equal(await verifyHostProof(globalThis.crypto, TOKEN, "n", "x"), false);
  assert.equal(await verifyHostProof(globalThis.crypto, "token-hong", "n", base64Url(new Uint8Array(32))), false);
  const nonce = base64Url(new Uint8Array(32).fill(9));
  assert.equal(await verifyHostProof(globalThis.crypto, TOKEN, nonce, await hostProof(TOKEN, nonce)), true,
    "bằng chứng ĐÚNG bị từ chối: hàm này chặn oan mọi máy chủ hợp lệ");
}

console.log("scouter-transport smoke tests: PASS");

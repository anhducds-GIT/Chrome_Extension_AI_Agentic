/* Async-boundary pins for the multi-profile identity read (audit finding 02/09).

   On this branch the auth frame is sent after BOTH the HMAC proof verification
   AND an async storage read. tokenSent flips before the read (replay guard),
   so the pin here is authSent: an auth_ok arriving after a valid proof but
   BEFORE our auth frame left the socket must be refused fail-closed, and a
   socket replaced mid-read must never receive the auth frame. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
for (const name of ["bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-transport-loopback.js"]) {
  await import(pathToFileURL(path.join(here, "..", name)));
}
const pairingCore = globalThis.DacBridgePairingCore;

function hostProofFor(token, nonce) {
  const key = Buffer.from(token.replace(/-/g, "+").replace(/_/g, "/") + "=", "base64");
  return crypto.createHmac("sha256", key).update(String(nonce), "utf8").digest("base64url");
}

function eventSource() {
  const listeners = [];
  return { addListener(listener) { listeners.push(listener); }, emit(...args) { for (const listener of [...listeners]) listener(...args); } };
}

class FakeWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 3;
  static instances = [];
  constructor(url) { this.url = url; this.readyState = FakeWebSocket.CONNECTING; this.listeners = new Map(); this.sent = []; FakeWebSocket.instances.push(this); }
  addEventListener(name, listener) { const list = this.listeners.get(name) || []; list.push(listener); this.listeners.set(name, list); }
  emit(name, value = {}) { if (name === "open") this.readyState = FakeWebSocket.OPEN; for (const listener of this.listeners.get(name) || []) listener(value); }
  send(value) { this.sent.push(JSON.parse(value)); }
  close() { if (this.readyState === FakeWebSocket.CLOSED) return; this.readyState = FakeWebSocket.CLOSED; this.emit("close", {}); }
}

const token = Buffer.alloc(32, 9).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token };
const values = { [pairingCore.PAIRING_STORAGE_KEY]: pairing };

const gates = [];
const chromeMock = {
  runtime: { id: "a".repeat(32), onConnect: eventSource(), onMessage: eventSource(), getManifest: () => ({ version: "0.1.0" }) },
  alarms: { onAlarm: eventSource(), create() {} },
  storage: {
    local: {
      get(key) {
        if (Array.isArray(key)) {
          return new Promise((resolve) => gates.push(() => resolve(Object.fromEntries(key.map((name) => [name, values[name]])))));
        }
        return Promise.resolve(key ? { [key]: values[key] } : { ...values });
      },
      async set(next) { Object.assign(values, next); },
      async remove(key) { delete values[key]; }
    },
    onChanged: eventSource()
  }
};

const tick = () => new Promise((resolve) => setTimeout(resolve, 5));
/* CHỜ THEO ĐIỀU KIỆN, KHÔNG THEO ĐỒNG HỒ.
 * `tick()` ở trên đặt cứng 5ms. Đo 2026-09-10: cả file này PASS khi chạy MỘT MÌNH và FAIL
 * trong suite — ba lượt liên tiếp, không phải chập chờn — với `TypeError: gateOne is not a
 * function`, tức `gates` còn RỖNG lúc `shift()`. Máy rảnh thì 5ms đủ cho lượt đọc danh tính
 * bất đồng bộ; máy đang chạy Chrome, bridge và một tab đang sinh chữ thì không.
 * Nâng 5 lên 50 chỉ là dời con số, và nó sẽ đỏ lại trên một máy chậm hơn. Chờ tới khi
 * ĐIỀU KIỆN đúng, có hạn chót, và hạn chót nói ra mình đang chờ gì. */
/* NHƯỜNG hàng đợi, dùng cho các khẳng định PHỦ ĐỊNH không có sự kiện nhân quả nào để chờ.
 * Khác `tick()` cũ ở chỗ nó không hứa hẹn một khoảng thời gian: nó cho hàng đợi vi tác vụ và
 * vĩ tác vụ chạy hết vài lượt, thứ thật sự cần cho một chuỗi `await` đã xếp sẵn. */
const nhuong = async (lan = 5) => {
  for (let i = 0; i < lan; i += 1) await new Promise((resolve) => setTimeout(resolve, 0));
};
const doiDen = async (dieuKien, viSao, hanMs = 3000) => {
  const han = Date.now() + hanMs;
  while (!dieuKien()) {
    if (Date.now() > han) throw new Error(`QUA_HAN_CHO sau ${hanMs}ms: ${viSao}`);
    await new Promise((resolve) => setTimeout(resolve, 1));
  }
};

const transport = globalThis.DacBridgeLoopbackTransport.create({ chrome: chromeMock, WebSocket: FakeWebSocket });
await doiDen(() => FakeWebSocket.instances.length > 0, "transport phải mở socket đầu tiên");

async function handshakeUpToProof(socket) {
  socket.emit("open");
  await doiDen(() => socket.sent.length > 0, "socket phải phát ra khung thách thức");
  const challenge = socket.sent[0];
  assert.equal(challenge.type, "auth_challenge", "the extension challenges the host first");
  socket.emit("message", { data: JSON.stringify({ type: "auth_proof", proof: hostProofFor(token, challenge.nonce) }) });
  // Khẳng định phía sau là PHỦ ĐỊNH ("chưa có khung `auth`"), nên chờ theo điều kiện của
  // chính nó là vô nghĩa — nó đúng ngay cả khi chưa có gì xảy ra. Chờ đúng SỰ KIỆN NHÂN QUẢ
  // phải tới trước: lượt đọc danh tính được phát ra. Chính nó là thứ giữ khung `auth` lại.
  await doiDen(() => gates.length > 0, "lượt đọc danh tính phải được phát ra sau chứng minh hợp lệ");
}

// --- pin 1: auth_ok after a valid proof but before OUR auth frame is refused --
const first = FakeWebSocket.instances[0];
await handshakeUpToProof(first);
assert.equal(first.sent.some((frame) => frame.type === "auth"), false, "the auth frame waits for the identity read");
first.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "too-early" }) });
await doiDen(() => first.readyState === FakeWebSocket.CLOSED, "một `auth_ok` không trả lời được phải ĐÓNG socket");
assert.equal(first.readyState, FakeWebSocket.CLOSED, "an unanswerable auth_ok closes the socket fail-closed");
assert.notEqual(values[pairingCore.STATUS_STORAGE_KEY]?.state, "connected", "a premature auth_ok never yields a connected status");
await doiDen(() => gates.length >= 1, "lượt đọc danh tính đầu tiên phải được phát ra");
const gateOne = gates.shift();
gateOne();
// KHÔNG có sự kiện nhân quả nào để chờ ở đây, và tôi đã đoán sai một lần: socket đầu vừa bị
// ĐÓNG fail-closed, nên không lượt đọc danh tính nào được phát ra nữa — phép chờ theo điều
// kiện đứng đó quá hạn 3 giây, đúng như nó phải làm. Khẳng định phía sau là phủ định thuần
// ("socket bỏ đi không bao giờ nhận khung `auth`"), nên thứ đúng cần làm là NHƯỜNG cho hàng
// đợi vi tác vụ chạy hết, không phải chờ một mốc thời gian.
await nhuong();
assert.equal(first.sent.some((frame) => frame.type === "auth"), false, "the abandoned socket never receives the auth frame (token stays home)");

// --- pin 2: a socket replaced mid-read never receives the auth frame ---------
await transport.connectHost();
const second = FakeWebSocket.instances.at(-1);
await handshakeUpToProof(second);
second.close();
await transport.connectHost();
const third = FakeWebSocket.instances.at(-1);
assert.notEqual(third, second, "a replacement socket exists");
await handshakeUpToProof(third);
// Fixture trick that isolates the IDENTITY predicate of the post-read guard:
// ownership already moved to the replacement, but the old handle is forced to
// look OPEN again — so only socket-identity, not readiness, can block the send.
second.readyState = FakeWebSocket.OPEN;
// Identity reads are SERIALIZED since the workspace-seat work (audit 03/09,
// MED: two first-run reads racing the create-if-missing write could mint two
// different profile ids). So the third socket's read is only ISSUED once the
// second's resolves: release them one at a time instead of shifting both.
await doiDen(() => gates.length >= 1, "hàng đợi đọc danh tính phải có một lượt chờ");
assert.equal(gates.length, 1, "the serialized identity queue holds exactly one pending read");
const gateSecond = gates.shift();
gateSecond();
await doiDen(() => gates.length >= 1, "lượt đọc thứ ba phải được phát ra sau khi lượt hai xong");
assert.equal(second.sent.some((frame) => frame.type === "auth"), false, "the replaced socket never receives the auth frame");
await doiDen(() => gates.length >= 1, "lượt đọc thứ ba chỉ được phát ra SAU khi lượt hai xong");
const gateThird = gates.shift();
gateThird();
await doiDen(() => third.sent.some((frame) => frame.type === "auth"), "socket còn sống phải gửi khung `auth` khi lượt đọc danh tính về");
const auth = third.sent.find((frame) => frame.type === "auth");
assert.ok(auth, "the live socket authenticates once its identity read lands");
assert.equal(auth.instance.worker, "duc-auto-chatgpt");
third.emit("message", { data: JSON.stringify({ type: "auth_ok", session_id: "session-ok" }) });
await doiDen(() => values[pairingCore.STATUS_STORAGE_KEY]?.state === "connected", "`auth_ok` SAU khung `auth` phải cho trạng thái connected");
assert.equal(values[pairingCore.STATUS_STORAGE_KEY].state, "connected", "auth_ok AFTER the auth frame still connects normally");

console.log("bridge multiprofile transport async smoke tests: PASS");
process.exit(0);

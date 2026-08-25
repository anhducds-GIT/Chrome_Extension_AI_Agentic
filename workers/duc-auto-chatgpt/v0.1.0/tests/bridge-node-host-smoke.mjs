import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createBridgeHost } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs";
import { createFrameDecoder, encodeFrame } from "../duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs";

async function freePort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function rawExtension(port, origin = `chrome-extension://${"a".repeat(32)}`) {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const request = http.request({
      host: "127.0.0.1", port, path: "/v1/extension",
      headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": key, Origin: origin }
    });
    request.on("upgrade", (_response, socket, head) => {
      const decoder = createFrameDecoder({ requireMasked: false });
      const queued = [];
      const waiters = [];
      let closedResolve;
      const closed = new Promise((done) => { closedResolve = done; });
      function deliver(value) {
        const waiter = waiters.shift();
        if (waiter) waiter.resolve(value); else queued.push(value);
      }
      function consume(chunk) {
        for (const frame of decoder.push(chunk)) {
          if (frame.opcode === 0x1) deliver(JSON.parse(frame.text));
        }
      }
      socket.on("data", consume);
      socket.on("close", closedResolve);
      if (head.length) consume(head);
      resolve({
        send(value) { socket.write(encodeFrame(JSON.stringify(value), { masked: true })); },
        next(timeoutMs = 2000) {
          if (queued.length) return Promise.resolve(queued.shift());
          return new Promise((nextResolve, nextReject) => {
            const timer = setTimeout(() => nextReject(new Error("Timed out waiting for host frame.")), timeoutMs);
            waiters.push({
              resolve(value) { clearTimeout(timer); nextResolve(value); },
              reject: nextReject
            });
          });
        },
        closed,
        close() { socket.end(); }
      });
    });
    request.on("response", (response) => reject(Object.assign(new Error(`Upgrade rejected with ${response.statusCode}.`), { statusCode: response.statusCode })));
    request.on("error", reject);
    request.end();
  });
}

const port = await freePort();
const token = crypto.randomBytes(32).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port, http_url: `http://127.0.0.1:${port}/v1/rpc`, websocket_url: `ws://127.0.0.1:${port}/v1/extension`, token };
const host = createBridgeHost({ pairing, requestTimeoutMs: 1000, authTimeoutMs: 500 });
await host.start();
assert.equal(host.address().address, "127.0.0.1", "host binds only literal IPv4 loopback");

const requestEnvelope = {
  protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "request", request_id: "host-request-0001",
  method: "system.ping", sent_at: "2026-08-24T10:00:00.000Z",
  client: { client_id: "host-test", name: "Host Test", version: "1" }, params: {}
};
const unauthorized = await fetch(pairing.http_url, { method: "POST", body: JSON.stringify(requestEnvelope) });
assert.equal(unauthorized.status, 401);
assert.equal(unauthorized.headers.get("access-control-allow-origin"), null, "host emits no CORS headers");
const browserOrigin = await fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}`, Origin: "http://localhost:8080" }, body: JSON.stringify(requestEnvelope) });
assert.equal(browserOrigin.status, 403);
const wrongToken = await fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${crypto.randomBytes(32).toString("base64url")}` }, body: JSON.stringify(requestEnvelope) });
assert.equal(wrongToken.status, 401);

const offline = await fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(requestEnvelope) });
assert.equal((await offline.json()).error.code, "EXTENSION_OFFLINE");
await assert.rejects(() => rawExtension(port, "http://localhost"), (error) => error.statusCode === 403);

const rejected = await rawExtension(port);
rejected.send({ type: "auth_challenge", role: "extension", nonce: crypto.randomBytes(32).toString("base64url") });
assert.equal((await rejected.next()).type, "auth_proof");
rejected.send({ type: "auth", role: "extension", token: crypto.randomBytes(32).toString("base64url") });
await Promise.race([rejected.closed, new Promise((_, reject) => setTimeout(() => reject(new Error("wrong WebSocket token was not closed")), 1500))]);

const extension = await rawExtension(port);
extension.send({ type: "auth_challenge", role: "extension", nonce: crypto.randomBytes(32).toString("base64url") });
assert.equal((await extension.next()).type, "auth_proof");
extension.send({ type: "auth", role: "extension", token });
assert.equal((await extension.next()).type, "auth_ok");
assert.equal(host.extensionConnected(), true);

const pendingHttp = fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(requestEnvelope) });
const relayed = await extension.next();
assert.equal(relayed.type, "rpc");
assert.equal(relayed.envelope.request_id, requestEnvelope.request_id);
extension.send({
  type: "rpc_response", relay_id: relayed.relay_id,
  envelope: { protocol: requestEnvelope.protocol, version: 1, kind: "response", request_id: requestEnvelope.request_id, ok: true, result: { extension: "online" }, responded_at: "2026-08-24T10:00:01.000Z" }
});
const completed = await pendingHttp;
assert.equal(completed.status, 200);
assert.equal((await completed.json()).request_id, requestEnvelope.request_id, "host preserves request_id exactly");
assert.equal(host.inflightCount(), 0);

const mismatchRequest = { ...requestEnvelope, request_id: "host-request-0002" };
const mismatchHttp = fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(mismatchRequest) });
const mismatchRelay = await extension.next();
extension.send({
  type: "rpc_response", relay_id: mismatchRelay.relay_id,
  envelope: { protocol: requestEnvelope.protocol, version: 1, kind: "response", request_id: "different-request-id", ok: true, result: {}, responded_at: "2026-08-24T10:00:01.000Z" }
});
assert.equal((await (await mismatchHttp).json()).error.code, "INTERNAL_ERROR", "uncorrelated extension response fails closed");

extension.close();
await host.stop();

// Token rotation invalidates the prior caller even when the host is reinstalled
// onto the same endpoint. The new token remains private and the fresh host is
// correctly offline until the extension pairs again.
const rotatedToken = crypto.randomBytes(32).toString("base64url");
const rotatedPairing = { ...pairing, token: rotatedToken };
const rotatedHost = createBridgeHost({ pairing: rotatedPairing, requestTimeoutMs: 1000, authTimeoutMs: 500 });
await rotatedHost.start();
const staleCaller = await fetch(rotatedPairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(requestEnvelope) });
assert.equal(staleCaller.status, 401, "a rotated token revokes the old CLI immediately");
const freshCaller = await fetch(rotatedPairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${rotatedToken}` }, body: JSON.stringify(requestEnvelope) });
assert.equal((await freshCaller.json()).error.code, "EXTENSION_OFFLINE", "the rotated token authenticates but cannot invent an extension session");
await rotatedHost.stop();

console.log("bridge node host smoke tests: PASS");

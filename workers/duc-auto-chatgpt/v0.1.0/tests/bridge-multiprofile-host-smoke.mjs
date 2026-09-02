/* Multi-profile Bridge routing (BRIDGE-MULTIPROFILE-DESIGN-V1, approved 2026-08-28).

   Pins the safety contract that several Chrome profiles can hold seats on one
   host at the same time WITHOUT ever being confused for each other:
   - one session, no target      -> routed (single-profile behaviour unchanged)
   - several sessions, no target -> TARGET_AMBIGUOUS, never a silent pick
   - named target                -> routed to exactly that session
   - unknown target              -> TARGET_NOT_CONNECTED (retryable)
   - duplicate label             -> TARGET_AMBIGUOUS with instance ids
   - same-instance reconnect     -> replaces ONLY its own seat; other
                                    profiles' in-flight work survives
   - every relayed response is stamped served_by; target never reaches
     the extension; legacy (no-instance) extensions still work fail-closed. */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeHost, parseInstance } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs";
import { applyTarget, commandRequest } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs";
import { createFrameDecoder, encodeFrame } from "../duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));

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
        queuedCount: () => queued.length,
        closed,
        // destroy(), not end(): the host's upgraded server socket may sit
        // half-open after a bare client FIN, and this harness must never hang
        // on a close the test itself initiated.
        close() { socket.destroy(); }
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
const host = createBridgeHost({ pairing, requestTimeoutMs: 1500, authTimeoutMs: 500 });
await host.start();

// A client-initiated destroy reaches the host a beat later; poll instead of
// assuming instant server-side cleanup.
async function waitForSessions(expected, timeoutMs = 3000) {
  const start = Date.now();
  while (host.sessionCount() !== expected) {
    if (Date.now() - start > timeoutMs) throw new Error(`session count never reached ${expected} (still ${host.sessionCount()})`);
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
}

let requestCounter = 0;
function envelopeFor(target) {
  requestCounter += 1;
  const envelope = {
    protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "request",
    request_id: `multi-request-${String(requestCounter).padStart(4, "0")}`,
    method: "system.ping", sent_at: "2026-08-28T10:00:00.000Z",
    client: { client_id: "multi-test", name: "Multi Test", version: "1" }, params: {}
  };
  if (target !== undefined) envelope.target = target;
  return envelope;
}

function rpc(envelope) {
  return fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(envelope) });
}

function respondFrom(extension, relayed) {
  extension.send({
    type: "rpc_response", relay_id: relayed.relay_id,
    envelope: { protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "response", request_id: relayed.envelope.request_id, ok: true, result: { pong: true }, responded_at: "2026-08-28T10:00:01.000Z" }
  });
}

// This branch host requires the challenge handshake BEFORE auth: the fake
// extension sends auth_challenge, receives auth_proof, then sends auth.
async function authenticate(extension, authMessage) {
  const nonce = crypto.randomBytes(32).toString("base64url");
  extension.send({ type: "auth_challenge", role: "extension", nonce });
  const proof = await extension.next();
  assert.equal(proof.type, "auth_proof", "the host proves token knowledge before receiving it");
  extension.send(authMessage);
}

function instanceAuth(instanceId, label) {
  return { type: "auth", role: "extension", token, instance: { schema_version: 1, instance_id: instanceId, label, worker: "duc-auto-chatgpt", extension_version: "0.1.0" } };
}

// --- parseInstance unit pins -------------------------------------------------
assert.equal(parseInstance(undefined), null, "absent instance = legacy, not an error");
assert.throws(() => parseInstance({ schema_version: 2, instance_id: "a".repeat(12) }), /schema_version/);
assert.throws(() => parseInstance({ schema_version: 1, instance_id: "short" }), /instance_id/);
assert.equal(parseInstance({ schema_version: 1, instance_id: "a".repeat(12), label: "x".repeat(200) }).label.length, 64, "labels are capped at 64 chars");

// --- one profile: behaviour unchanged ---------------------------------------
const A_ID = "profile-a-1111-2222-3333";
const extA = await rawExtension(port);
await authenticate(extA, instanceAuth(A_ID, "kaito"));
assert.equal((await extA.next()).type, "auth_ok");
assert.equal(host.sessionCount(), 1);

const single = rpc(envelopeFor());
const singleRelay = await extA.next();
assert.equal(singleRelay.type, "rpc");
assert.equal(Object.hasOwn(singleRelay.envelope, "target"), false, "no target field leaks to the extension");
respondFrom(extA, singleRelay);
const singleBody = await (await single).json();
assert.equal(singleBody.ok, true, "single session, no target: routed exactly as before multi-profile");
assert.deepEqual(singleBody.served_by, { instance_id: A_ID, label: "kaito" }, "every relayed response says WHICH runtime answered");

// A targeted request also never leaks the target field to the extension.
const targetedSingle = rpc(envelopeFor("kaito"));
const targetedRelay = await extA.next();
assert.equal(Object.hasOwn(targetedRelay.envelope, "target"), false, "target is consumed by the host, stripped before relay");
respondFrom(extA, targetedRelay);
assert.equal((await (await targetedSingle).json()).ok, true);

// --- bridge.sessions: host-answered, read-only -------------------------------
const dirOne = await (await rpc({ ...envelopeFor(), method: "bridge.sessions" })).json();
assert.equal(dirOne.ok, true);
assert.equal(dirOne.result.count, 1);
assert.equal(dirOne.result.sessions[0].instance_id, A_ID);
assert.equal(dirOne.result.sessions[0].label, "kaito");
assert.equal(dirOne.result.sessions[0].legacy, false);
assert.equal(dirOne.result.sessions[0].worker, "duc-auto-chatgpt");

// --- second profile joins: NOBODY gets kicked --------------------------------
const B_ID = "profile-b-4444-5555-6666";
const extB = await rawExtension(port);
await authenticate(extB, instanceAuth(B_ID, "sct01"));
assert.equal((await extB.next()).type, "auth_ok");
assert.equal(host.sessionCount(), 2, "a second profile takes a second seat instead of stealing the first");

// No target with two sessions: refuse, list candidates, never pick.
const ambiguous = await (await rpc(envelopeFor())).json();
assert.equal(ambiguous.ok, false);
assert.equal(ambiguous.error.code, "TARGET_AMBIGUOUS");
assert.equal(ambiguous.error.retryable, false);
assert.equal(ambiguous.error.details.candidates.length, 2);
assert.deepEqual(
  ambiguous.error.details.candidates.map((c) => c.label).sort(),
  ["kaito", "sct01"],
  "the refusal names the owner-readable labels"
);

// Target by label routes to exactly that session.
const toB = rpc(envelopeFor("sct01"));
const bRelay = await extB.next();
respondFrom(extB, bRelay);
const toBBody = await (await toB).json();
assert.equal(toBBody.ok, true);
assert.deepEqual(toBBody.served_by, { instance_id: B_ID, label: "sct01" });
assert.equal(extA.queuedCount(), 0, "the other profile never sees a request that was not addressed to it");

// Target by instance_id routes as well.
const toAById = rpc(envelopeFor(A_ID));
const aRelay = await extA.next();
respondFrom(extA, aRelay);
assert.deepEqual((await (await toAById).json()).served_by, { instance_id: A_ID, label: "kaito" });

// Unknown target: fail closed, retryable (the profile may just be asleep).
const nobody = await (await rpc(envelopeFor("nobody"))).json();
assert.equal(nobody.error.code, "TARGET_NOT_CONNECTED");
assert.equal(nobody.error.retryable, true);
assert.equal(nobody.error.details.candidates.length, 2);

// Duplicate label: ambiguity is refusal, with instance ids to disambiguate.
const C_ID = "profile-c-7777-8888-9999";
const extC = await rawExtension(port);
await authenticate(extC, instanceAuth(C_ID, "kaito"));
assert.equal((await extC.next()).type, "auth_ok");
const dupLabel = await (await rpc(envelopeFor("kaito"))).json();
assert.equal(dupLabel.error.code, "TARGET_AMBIGUOUS");
assert.equal(dupLabel.error.details.candidates.length, 2);
assert.equal(new Set(dupLabel.error.details.candidates.map((c) => c.instance_id)).size, 2);
const toCById = rpc(envelopeFor(C_ID));
respondFrom(extC, await extC.next());
assert.deepEqual((await (await toCById).json()).served_by, { instance_id: C_ID, label: "kaito" });
extC.close();
await extC.closed;
await waitForSessions(2);

// --- the scoping pin: a reconnect kills ONLY its own in-flight work ----------
const pendingA = rpc(envelopeFor(A_ID));
await extA.next();               // relayed to A; A never answers
const pendingB = rpc(envelopeFor(B_ID));
const pendingBRelay = await extB.next();
const extA2 = await rawExtension(port);
await authenticate(extA2, instanceAuth(A_ID, "kaito"));
assert.equal((await extA2.next()).type, "auth_ok");
await extA.closed;               // same instance -> only A's old seat replaced
const pendingABody = await (await pendingA).json();
assert.equal(pendingABody.error.code, "TRANSPORT_DISCONNECTED", "the reconnecting profile's own in-flight request fails retryable");
respondFrom(extB, pendingBRelay);
const pendingBBody = await (await pendingB).json();
assert.equal(pendingBBody.ok, true, "the OTHER profile's in-flight request survives the reconnect untouched");
assert.deepEqual(pendingBBody.served_by, { instance_id: B_ID, label: "sct01" });
assert.equal(host.sessionCount(), 2);

// --- legacy extension (no instance block) still works, fail-closed -----------
const extLegacy = await rawExtension(port);
await authenticate(extLegacy, { type: "auth", role: "extension", token });
assert.equal((await extLegacy.next()).type, "auth_ok");
assert.equal(host.sessionCount(), 3);
const dirThree = await (await rpc({ ...envelopeFor(), method: "bridge.sessions" })).json();
const legacyRow = dirThree.result.sessions.find((row) => row.legacy);
assert.ok(legacyRow, "a legacy session is listed, not hidden");
assert.match(legacyRow.instance_id, /^legacy:/);
assert.equal(legacyRow.label, null);
const legacyAmbiguous = await (await rpc(envelopeFor())).json();
assert.equal(legacyAmbiguous.error.code, "TARGET_AMBIGUOUS", "legacy sessions count toward ambiguity");
const toLegacy = rpc(envelopeFor(legacyRow.instance_id));
respondFrom(extLegacy, await extLegacy.next());
assert.deepEqual((await (await toLegacy).json()).served_by, { instance_id: legacyRow.instance_id, label: null });

// One named session + one legacy session is STILL two sessions. The host must
// not "helpfully" pick the named one — a legacy profile can hold a live page.
extB.close();
await extB.closed;
await waitForSessions(2);
const namedPlusLegacy = await (await rpc(envelopeFor())).json();
assert.equal(namedPlusLegacy.error.code, "TARGET_AMBIGUOUS", "a legacy session forces explicit targeting even when only one named session remains");

// --- malformed instance metadata is rejected fail-closed ---------------------
const extBad = await rawExtension(port);
await authenticate(extBad, { type: "auth", role: "extension", token, instance: { schema_version: 2, instance_id: "b".repeat(12) } });
await Promise.race([extBad.closed, new Promise((_, reject) => setTimeout(() => reject(new Error("malformed instance was not rejected")), 1500))]);
assert.equal(host.sessionCount(), 2, "a rejected auth never takes a seat");

// --- invalid target values are an envelope error ------------------------------
const badTarget = await rpc({ ...envelopeFor(), target: 7 });
assert.equal(badTarget.status, 400);
assert.equal((await badTarget.json()).error.code, "INVALID_ENVELOPE");

// --- everyone leaves: offline again, exactly like before ----------------------
extA2.close(); extB.close(); extLegacy.close();
await Promise.all([extA2.closed, extB.closed, extLegacy.closed]);
await waitForSessions(0);
assert.equal(host.extensionConnected(), false);
const offline = await (await rpc(envelopeFor())).json();
assert.equal(offline.error.code, "EXTENSION_OFFLINE");
const dirEmpty = await (await rpc({ ...envelopeFor(), method: "bridge.sessions" })).json();
assert.equal(dirEmpty.result.count, 0, "bridge.sessions answers even with nobody connected");

await host.stop();

// --- operator tooling: --target and the sessions subcommand -------------------
assert.equal(commandRequest("sessions").method, "bridge.sessions");
const baseEnvelope = { protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "request", request_id: "cli-test-0001", method: "system.ping", sent_at: "2026-08-28T10:00:00.000Z", client: { client_id: "c", name: "c", version: "1" }, params: {} };
assert.equal(applyTarget(baseEnvelope, {}).target, undefined, "no flag, no target field");
assert.equal(applyTarget(baseEnvelope, { target: "kaito" }).target, "kaito");
assert.throws(() => applyTarget(baseEnvelope, { target: "   " }), /--target/);

// --- wiring pins: panel, transport and host agree on the storage contract -----
const transportSource = fs.readFileSync(path.join(here, "..", "bridge-transport-loopback.js"), "utf8");
const panelSource = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const panelHtml = fs.readFileSync(path.join(here, "..", "sidepanel.html"), "utf8");
assert.ok(transportSource.includes('"dac.bridge.instance.v1"'), "transport persists the per-profile identity");
assert.ok(transportSource.includes('"dac.bridge.instance_label.v1"'), "transport reads the owner-typed label");
assert.ok(panelSource.includes('"dac.bridge.instance_label.v1"'), "the side panel writes the SAME label key the transport reads");
assert.ok(panelHtml.includes('id="bridgeProfileLabelInput"'), "the side panel offers the label input");
assert.ok(panelSource.includes("bridgeProfileLabelInput"), "the side panel wires the label input");

console.log("bridge multiprofile host smoke tests: PASS");

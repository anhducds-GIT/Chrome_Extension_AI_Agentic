import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createBridgeHost } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs";
import { createFrameDecoder, encodeFrame } from "../duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-router-core.js")));
const core = globalThis.DacBridgeCore;

async function freePort() {
  const server = http.createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
}

function connectWorker(port, onRpc) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      host: "127.0.0.1", port, path: "/v1/extension",
      headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": crypto.randomBytes(16).toString("base64"), Origin: `chrome-extension://${"b".repeat(32)}` }
    });
    request.on("upgrade", (_response, socket, head) => {
      const decoder = createFrameDecoder({ requireMasked: false });
      const send = (value) => socket.write(encodeFrame(JSON.stringify(value), { masked: true }));
      const consume = (chunk) => {
        for (const frame of decoder.push(chunk)) {
          if (frame.opcode !== 0x1) continue;
          const message = JSON.parse(frame.text);
          if (message.type === "rpc") Promise.resolve(onRpc(message.envelope)).then((envelope) => send({ type: "rpc_response", relay_id: message.relay_id, envelope }));
        }
      };
      socket.on("data", consume);
      if (head.length) consume(head);
      resolve({ send, close: () => socket.end() });
    });
    request.on("error", reject);
    request.end();
  });
}

const port = await freePort();
const token = crypto.randomBytes(32).toString("base64url");
const pairing = { schema_version: 1, host: "127.0.0.1", port, http_url: `http://127.0.0.1:${port}/v1/rpc`, websocket_url: `ws://127.0.0.1:${port}/v1/extension`, token };
const host = createBridgeHost({ pairing, requestTimeoutMs: 2000 });
await host.start();

let executorAvailable = true;
let proposalAcceptCount = 0;
const replay = core.createMemoryReplayStore();
const executor = core.createDispatcher({
  replay_store: replay,
  handlers: {
    "queue.list": async () => ({ ledger_etag: "sha256:test", run_id: null, checkpoint: { version: 0, filename: null }, jobs: [], next_cursor: null }),
    "queue.propose": async () => {
      proposalAcceptCount += 1;
      return { proposal_id: "proposal-integration", status: "AWAITING_OWNER_APPROVAL", preview: [], final_job_ids: [] };
    }
  }
});
const router = globalThis.DacBridgeRouterCore.createRouter({
  core, extension_id: "b".repeat(32), session_id: "integration-worker",
  executor_state: () => ({ available: executorAvailable, executor_epoch: executorAvailable ? "epoch-integration" : null }),
  send_executor: (request) => executor(request)
});
const worker = await connectWorker(port, (envelope) => router.route(envelope));
worker.send({ type: "auth", role: "extension", token });
await new Promise((resolve) => setTimeout(resolve, 20));

async function rpc(envelope) {
  const response = await fetch(pairing.http_url, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(envelope) });
  assert.equal(response.status, 200);
  return response.json();
}
const base = { protocol: core.PROTOCOL, version: 1, kind: "request", sent_at: "2026-08-24T10:00:00.000Z", client: { client_id: "integration-cli", name: "Integration CLI", version: "1" } };
const hello = await rpc({ ...base, request_id: "integration-hello-0001", method: "session.hello", params: { supported_versions: [1] } });
assert.equal(hello.result.executor.available, true);
const listed = await rpc({ ...base, request_id: "integration-list-0001", method: "queue.list", params: {} });
assert.equal(listed.request_id, "integration-list-0001");
assert.deepEqual(listed.result.jobs, []);

const proposalRequest = {
  ...base, request_id: "integration-proposal-0001", method: "queue.propose",
  params: { if_ledger_etag: "sha256:test", proposal_label: "integration", jobs: [{ client_job_id: "a", requested_job_id: null, prompt: "stage only", reference_images: [], settings: {} }] }
};
const first = await rpc(proposalRequest);
const retry = await rpc({ ...proposalRequest, sent_at: "2026-08-24T10:00:01.000Z" });
assert.deepEqual(retry, first, "identical retry after a lost response returns the original proposal envelope");
assert.equal(proposalAcceptCount, 1);

executorAvailable = false;
const closed = await rpc({ ...base, request_id: "integration-list-0002", method: "queue.list", params: {} });
assert.equal(closed.error.code, "EXECUTOR_UNAVAILABLE");
worker.close();
await host.stop();

console.log("bridge loopback integration tests: PASS");

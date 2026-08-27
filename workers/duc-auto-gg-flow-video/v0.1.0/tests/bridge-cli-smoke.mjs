import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildEnvelope, commandRequest, defaultPairingPath, main } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs";

assert.match(defaultPairingPath("C:\\Local"), /DucAutoChatGPT[\\/]BridgeV1[\\/]duc-auto-chatgpt-bridge-pairing-v1\.json$/);
assert.deepEqual(commandRequest("ping"), { method: "system.ping", params: {} });
assert.deepEqual(commandRequest("queue-list", { limit: "25", statuses: "READY,FAILED", "include-prompt": true }), {
  method: "queue.list",
  params: { cursor: null, limit: 25, statuses: ["READY", "FAILED"], include_prompt: true }
});
assert.deepEqual(commandRequest("ledger-read", { "include-removed": true }), {
  method: "ledger.read",
  params: { cursor: null, limit: 50, include_prompt: false, include_removed: true }
});
assert.throws(() => commandRequest("proposal-get", {}), /proposal-id/);
assert.throws(() => commandRequest("run-start", {}), /Unknown command/);
const envelope = buildEnvelope("system.ping", {}, new Date("2026-08-24T10:00:00.000Z"), "cli-request-0001");
assert.equal(envelope.method, "system.ping");
assert.equal(envelope.client.client_id, "duc-auto-chatgpt-bridge-cli-v1");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "dac-bridge-cli-"));
try {
  const port = 32147;
  const token = crypto.randomBytes(32).toString("base64url");
  const pairingPath = path.join(tempRoot, "pairing.json");
  fs.writeFileSync(pairingPath, JSON.stringify({
    schema_version: 1,
    host: "127.0.0.1",
    port,
    http_url: `http://127.0.0.1:${port}/v1/rpc`,
    websocket_url: `ws://127.0.0.1:${port}/v1/extension`,
    token
  }));
  let request;
  let output = "";
  const exitCode = await main(["capabilities", "--pairing", pairingPath], {
    stdout: { write: (value) => { output += value; } },
    stderr: { write: () => {} },
    fetch: async (url, options) => {
      request = { url, options };
      return { ok: true, json: async () => ({ ok: true, result: { auto_execute: false } }) };
    }
  });
  assert.equal(exitCode, 0);
  assert.equal(request.url, `http://127.0.0.1:${port}/v1/rpc`);
  assert.equal(request.options.headers.Authorization, `Bearer ${token}`);
  assert.equal(Object.hasOwn(request.options.headers, "Origin"), false, "CLI never supplies a browser Origin");
  assert.equal(JSON.parse(request.options.body).method, "system.capabilities");
  assert.equal(JSON.parse(output).result.auto_execute, false);
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

console.log("bridge CLI smoke tests: PASS");

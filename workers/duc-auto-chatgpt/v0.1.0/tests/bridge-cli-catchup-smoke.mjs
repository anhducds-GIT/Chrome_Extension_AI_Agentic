import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildEnvelope, commandRequest, main } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs";

const commands = {
  "jobs-add": "jobs.add", "jobs-update": "jobs.update", "jobs-remove": "jobs.remove", "jobs-reorder": "jobs.reorder",
  "output-configure": "output.configure", "run-settings-configure": "run_settings.configure",
  "output-set-folder-hint": "output.set_folder_hint", "run-trial": "run.trial",
  "proposal-withdraw": "queue.proposal.withdraw", "profiles-remove": "profiles.remove"
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "dac-cli-catchup-"));
try {
  const paramsPath = path.join(root, "params.json");
  fs.writeFileSync(paramsPath, JSON.stringify({ marker: "generic" }));
  for (const [command, method] of Object.entries(commands)) {
    assert.deepEqual(commandRequest(command, { "params-file": paramsPath }), { method, params: { marker: "generic" } });
    assert.throws(() => commandRequest(command, {}), /params-file/);
  }
  const envelope = buildEnvelope("run.trial", { job_ids: ["J-1"] }, new Date("2026-08-25T00:00:00.000Z"), "stable-request", "stable-client");
  assert.equal(envelope.request_id, "stable-request");
  assert.equal(envelope.client.client_id, "stable-client");

  const pairingPath = path.join(root, "pairing.json");
  fs.writeFileSync(pairingPath, JSON.stringify({
    schema_version: 1, host: "127.0.0.1", port: 32147,
    http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension",
    token: crypto.randomBytes(32).toString("base64url")
  }));
  const run = async (body, ok = false) => {
    let request;
    const code = await main(["run-trial", "--params-file", paramsPath, "--pairing", pairingPath, "--request-id", "same-id", "--client-id", "agent-x"], {
      stdout: { write() {} }, stderr: { write() {} },
      fetch: async (_url, options) => { request = options; return { ok, json: async () => body }; }
    });
    return { code, request };
  };
  const success = await run({ ok: true, result: {} }, true);
  assert.equal(success.code, 0);
  assert.equal(JSON.parse(success.request.body).request_id, "same-id");
  assert.equal(JSON.parse(success.request.body).client.client_id, "agent-x");
  assert.ok(success.request.signal instanceof AbortSignal);
  assert.equal((await run({ ok: false, error: { retryable: true } })).code, 3);
  assert.equal((await run({ ok: false, error: { retryable: false } })).code, 2);

  const cliSource = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs", import.meta.url), "utf8");
  assert.match(cliSource, /AbortSignal\.timeout\(40000\)/);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

console.log("bridge CLI catch-up smoke tests: PASS");

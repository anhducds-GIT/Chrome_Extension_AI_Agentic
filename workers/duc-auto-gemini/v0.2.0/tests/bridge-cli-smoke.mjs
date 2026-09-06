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

/* --- hai lệnh thêm 06/09 -------------------------------------------------- */

// Gọi trần phải chạy được: hai nắp đều có mặc định, và tích của chúng
// (10 x 8000) nằm gọn dưới trần 200000 mà Bridge cưỡng chế.
assert.deepEqual(commandRequest("chat-read"), { method: "chat.read", params: { limit: 10, max_chars_per_turn: 8000 } });
assert.deepEqual(commandRequest("chat-read", { limit: "5", "max-chars": "20000" }), {
  method: "chat.read",
  params: { limit: 5, max_chars_per_turn: 20000 }
});
// CA HỒI QUY, và nó suýt lọt: bộ đọc số dùng chung chặn cứng ở 100, nên gõ
// TƯỜNG MINH đúng con số mặc định (8000) bị từ chối OAN — trong khi gọi trần vẫn
// chạy vì giá trị đó đi qua nhánh `fallback`. Một lỗi chỉ nổ khi người dùng gõ
// ra thứ tài liệu bảo họ gõ.
assert.doesNotThrow(() => commandRequest("chat-read", { "max-chars": "8000" }), "gõ tường minh đúng giá trị mặc định phải chạy được");
assert.throws(() => commandRequest("chat-read", { "max-chars": "50000" }), /200 to 40000/, "vượt trần thì từ chối ngay ở CLI, không tốn một vòng đi-về");
assert.throws(() => commandRequest("chat-read", { "max-chars": "199" }), /200 to 40000/);
assert.throws(() => commandRequest("chat-read", { limit: "60" }), /1 to 50/);

assert.deepEqual(commandRequest("set-folder-hint", { hint: "C:\\Anh\\Pilot-09" }), {
  method: "output.set_folder_hint",
  params: { folder_hint: "C:\\Anh\\Pilot-09" }
});
// `--profile` KHONG duoc co mac dinh: khi chi co MOT ho so thi extension tu suy
// ra, khi co NHIEU thi no TU CHOI va ke ten chung. Mot mac dinh o CLI se go bo
// dung cai cho tu choi do, va ghi duong dan cua pilot nay len pilot khac.
assert.equal(Object.hasOwn(commandRequest("set-folder-hint", { hint: "C:\\Anh" }).params, "profile_id"), false, "khong tu dien profile_id");
assert.deepEqual(commandRequest("set-folder-hint", { hint: "C:\\Anh", profile: "pilot-09" }).params.profile_id, "pilot-09");
assert.throws(() => commandRequest("set-folder-hint", {}), /set-folder-hint requires --hint/);
assert.deepEqual(commandRequest("profiles-remove", { profile: "pilot-cu" }), { method: "profiles.remove", params: { profile_id: "pilot-cu" } });
assert.throws(() => commandRequest("profiles-remove", {}), /profiles-remove requires --profile/);

assert.deepEqual(commandRequest("proposal-withdraw", { "proposal-id": "prop-9" }), {
  method: "queue.proposal.withdraw",
  params: { proposal_id: "prop-9" }
});
// Thiếu tham số thì câu lỗi phải kể ĐÚNG TÊN lệnh vừa gõ. Hai lệnh dùng chung một
// nhánh xử lý, nên một câu lỗi đóng cứng "proposal-get" sẽ chỉ sai chỗ.
assert.throws(() => commandRequest("proposal-withdraw", {}), /proposal-withdraw requires --proposal-id/);
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

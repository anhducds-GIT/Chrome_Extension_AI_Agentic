import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validatePairing } from "./bridge-host.mjs";

const COMMANDS = Object.freeze({
  ping: "system.ping",
  capabilities: "system.capabilities",
  "queue-list": "queue.list",
  "run-status": "run.status",
  "ledger-read": "ledger.read",
  "proposal-get": "queue.proposal.get",
  "proposal-withdraw": "queue.proposal.withdraw",
  // chat-read CHỈ ĐỌC: không click, không gõ, không đổi focus. Cố ý KHÔNG bị
  // khoá RUN_ACTIVE chặn như chat-reload — đọc không giết được attempt đang bay,
  // mà lúc cần đọc nhất chính là lúc đang chẩn đoán một run đang chạy.
  "chat-read": "chat.read",
  propose: "queue.propose",
  "run-trial": "run.trial",
  // Cặp lệnh điều khiển. run-stop đi vòng qua khoá RUN_ACTIVE (dừng chỉ bớt
  // việc), chat-reload thì bị khoá đó chặn (F5 giữa chừng giết attempt đang
  // bay). Dùng nối tiếp: run-stop -> chat-reload -> chạy lại.
  "run-stop": "run.stop",
  "chat-reload": "chat.reload",
  // Multi-profile: the host answers this itself — who is connected right now.
  sessions: "bridge.sessions"
});

const DEFAULT_PAIRING_NAME = "duc-auto-chatgpt-bridge-pairing-v1.json";

export function defaultPairingPath(localAppData = process.env.LOCALAPPDATA) {
  if (!localAppData) throw new Error("LOCALAPPDATA is unavailable; pass --pairing <path>.");
  return path.join(localAppData, "DucAutoChatGPT", "BridgeV1", DEFAULT_PAIRING_NAME);
}

function parseFlags(argv) {
  const flags = Object.create(null);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    if (["include-prompt", "include-removed"].includes(name)) {
      flags[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`Missing value for --${name}.`);
    flags[name] = value;
    index += 1;
  }
  return flags;
}

// Bien the co tran/san RIENG. `positiveInteger` chan cung o 100, dung cho moi co
// dem-so-luong hien co - nhung `--max-chars` cua chat-read chay toi 40000, nen
// dung lai no la tu choi OAN mot gia tri hop le. Da suyt dinh: mac dinh 8000 di
// qua nhanh `fallback` nen `chat-read` tran van chay, va chi vo khi ai do go
// tuong minh dung con so mac dinh.
function boundedInteger(value, name, fallback, min, max) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`--${name} must be an integer from ${min} to ${max}.`);
  return parsed;
}

function positiveInteger(value, name, fallback) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) throw new Error(`--${name} must be an integer from 1 to 100.`);
  return parsed;
}

export function commandRequest(command, flags = {}) {
  const method = COMMANDS[command];
  if (!method) throw new Error(`Unknown command '${command}'.`);
  let params = {};
  if (command === "queue-list") {
    params = {
      cursor: flags.cursor || null,
      limit: positiveInteger(flags.limit, "limit", 50),
      statuses: flags.statuses ? String(flags.statuses).split(",").map((item) => item.trim()).filter(Boolean) : [],
      include_prompt: Boolean(flags["include-prompt"])
    };
  } else if (command === "ledger-read") {
    params = {
      cursor: flags.cursor || null,
      limit: positiveInteger(flags.limit, "limit", 50),
      include_prompt: Boolean(flags["include-prompt"]),
      include_removed: Boolean(flags["include-removed"])
    };
  } else if (command === "proposal-get" || command === "proposal-withdraw") {
    if (!flags["proposal-id"]) throw new Error(`${command} requires --proposal-id <id>.`);
    params = { proposal_id: flags["proposal-id"] };
  } else if (command === "chat-read") {
    // Hai nắp đi CÙNG NHAU và cùng có mặc định: gọi trần `chat-read` phải chạy
    // được. Bridge từ chối tích hai nắp vượt 200000 ký tự, nên mặc định ở đây
    // (10 x 8000) nằm gọn trong ngưỡng đó.
    params = {
      limit: boundedInteger(flags.limit, "limit", 10, 1, 50),
      max_chars_per_turn: boundedInteger(flags["max-chars"], "max-chars", 8000, 200, 40000)
    };
  } else if (command === "propose") {
    if (!flags["params-file"]) throw new Error("propose requires --params-file <json>.");
    params = JSON.parse(fs.readFileSync(path.resolve(flags["params-file"]), "utf8"));
  } else if (command === "run-trial") {
    // Development trial run (owner decision 2026-08-25): <=2 jobs, capped
    // timing; refused by the extension unless its dev-mode toggle is ON.
    if (!flags.jobs) throw new Error("run-trial requires --jobs <id[,id]>.");
    const jobIds = String(flags.jobs).split(",").map((item) => item.trim()).filter(Boolean);
    params = { job_ids: jobIds };
    if (flags.timeout !== undefined) params.timeout_sec = Number(flags.timeout);
    if (flags.delay !== undefined) params.delay_sec = Number(flags.delay);
  }
  return { method, params };
}

export function buildEnvelope(method, params, now = new Date(), requestId = `cli-${crypto.randomUUID()}`) {
  return {
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "request",
    request_id: requestId,
    method,
    sent_at: now.toISOString(),
    client: { client_id: "duc-auto-chatgpt-bridge-cli-v1", name: "Duc Auto ChatGPT Bridge CLI", version: "1.0.0" },
    params
  };
}

// --target <label|instance_id> rides at the ENVELOPE top level; the host
// consumes it for routing and strips it before relaying to the extension.
// With several profiles connected and no target, the host refuses with
// TARGET_AMBIGUOUS — it never picks one on its own.
export function applyTarget(envelope, flags = {}) {
  if (flags.target === undefined) return envelope;
  const target = String(flags.target).trim();
  if (!target || target.length > 128) throw new Error("--target must be 1-128 characters (a session label or instance_id).");
  return { ...envelope, target };
}

export async function main(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr, fetch: globalThis.fetch }) {
  const [command, ...rest] = argv;
  if (!command || command === "help" || command === "--help") {
    io.stdout.write("Usage: node bridge-cli.mjs <ping|capabilities|queue-list|run-status|ledger-read|chat-read|proposal-get|proposal-withdraw|propose|run-trial|run-stop|chat-reload|sessions> [options] [--target <label|instance_id>]\n");
    return 0;
  }
  const flags = parseFlags(rest);
  const pairingPath = path.resolve(flags.pairing || defaultPairingPath());
  const pairing = validatePairing(JSON.parse(fs.readFileSync(pairingPath, "utf8")));
  const { method, params } = commandRequest(command, flags);
  const envelope = applyTarget(buildEnvelope(method, params), flags);
  const response = await io.fetch(pairing.http_url, {
    method: "POST",
    headers: { Authorization: `Bearer ${pairing.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(envelope)
  });
  const body = await response.json();
  io.stdout.write(`${JSON.stringify(body, null, 2)}\n`);
  return response.ok && body?.ok ? 0 : 2;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === fileURLToPath(import.meta.url)) {
  try { process.exitCode = await main(); }
  catch (error) {
    process.stderr.write(`${error?.message || String(error)}\n`);
    process.exitCode = 1;
  }
}

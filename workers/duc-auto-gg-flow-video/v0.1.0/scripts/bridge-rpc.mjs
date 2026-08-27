/* Raw Agent Bridge RPC caller for the AI operator.

   The installed bridge-cli.mjs only has subcommands for the read surface plus
   run-trial. Everything else -- jobs.add, jobs.update, jobs.remove,
   jobs.reorder, references.add, output.configure, run_settings.configure,
   diagnostics.dom_probe -- needs a raw protocol envelope. This is that.
   Loopback only; the token is read from the pairing file, never printed.

   Usage:
     node scripts/bridge-rpc.mjs <method> [inline-json-params]
     node scripts/bridge-rpc.mjs <method> --params-file <path.json>
     node scripts/bridge-rpc.mjs <method> ... --pairing <path.json>

   Examples:
     node scripts/bridge-rpc.mjs diagnostics.dom_probe
     node scripts/bridge-rpc.mjs jobs.add --params-file jobs.json
*/
import fs from "node:fs";
import crypto from "node:crypto";

const DEFAULT_PAIRING = "C:/WORKING ZONE/Duc-Auto-GG-Flow-Video-Bridge/duc-auto-gg-flow-video-bridge-pairing-v1.json";

const argv = process.argv.slice(2);
const method = argv.shift();
if (!method || method.startsWith("--")) {
  console.error("Usage: node scripts/bridge-rpc.mjs <method> [json | --params-file <path>] [--pairing <path>]");
  process.exit(1);
}

let params = {};
let pairingPath = DEFAULT_PAIRING;
while (argv.length) {
  const token = argv.shift();
  if (token === "--params-file") params = JSON.parse(fs.readFileSync(argv.shift(), "utf8"));
  else if (token === "--pairing") pairingPath = argv.shift();
  else params = JSON.parse(token);
}

const pairing = JSON.parse(fs.readFileSync(pairingPath, "utf8"));
const token = pairing.token || pairing.bearer_token || pairing.auth?.token;
const port = pairing.port || pairing.endpoint?.port || 32148;
if (!token) { console.error(`No token in ${pairingPath}.`); process.exit(1); }

const response = await fetch(`http://127.0.0.1:${port}/v1/rpc`, {
  method: "POST",
  headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
  body: JSON.stringify({
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "request",
    request_id: `ai-${crypto.randomUUID()}`,
    method,
    sent_at: new Date().toISOString(),
    client: { client_id: "duc-auto-gg-flow-video-ai-operator", name: "AI Operator raw RPC", version: "1.0.0" },
    params
  })
});

const text = await response.text();
try { console.log(JSON.stringify(JSON.parse(text), null, 2)); }
catch { console.log(`HTTP ${response.status}: ${text}`); }
process.exit(response.ok ? 0 : 1);

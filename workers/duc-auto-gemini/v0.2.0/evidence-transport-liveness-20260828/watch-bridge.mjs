/* Live probe for the Gemini Bridge, sampled once a second.

   Three outcomes, and the difference between the last two is the whole point:
     HOST-DOWN   nothing is listening on 32148            -> the host is off
     NO-EXT      the host answers EXTENSION_OFFLINE       -> host is back, extension has NOT reconnected yet
     OK          full round trip CLI -> host -> extension -> router

   So the gap between the first NO-EXT and the first OK measures how long the
   extension's bounded reconnect actually took on the real machine.
*/
import fs from "node:fs";
import crypto from "node:crypto";

const PAIRING = "C:/WORKING ZONE/Chrome Extension Bridge/duc-auto-gemini/duc-auto-gemini-bridge-pairing-v1.json";
const pairing = JSON.parse(fs.readFileSync(PAIRING, "utf8"));
const token = pairing.token || pairing.bearer_token || pairing.auth?.token;

const started = Date.now();
const RUN_MS = Number(process.argv[2] || 600) * 1000;
let previous = null;
let lastChangeAt = started;

function stamp(at) {
  return new Date(at).toTimeString().slice(0, 8);
}

async function probe() {
  const envelope = {
    protocol: "duc-auto-chatgpt.bridge",
    version: 1,
    kind: "request",
    request_id: `ai-${crypto.randomUUID()}`,
    method: "system.ping",
    sent_at: new Date().toISOString(),
    client: { client_id: "live-watch", name: "Live watch", version: "1" },
    params: {}
  };
  const response = await fetch(pairing.http_url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(envelope)
  });
  const body = await response.json();
  if (body?.ok) return "OK";
  const code = body?.error?.code || `HTTP_${response.status}`;
  return code === "EXTENSION_OFFLINE" ? "NO-EXT" : code;
}

console.log(`watching 127.0.0.1:${pairing.port} — one sample a second, ${RUN_MS / 1000}s`);
console.log(`${stamp(Date.now())}  start`);

while (Date.now() - started < RUN_MS) {
  let state;
  try {
    state = await probe();
  } catch (_) {
    state = "HOST-DOWN";
  }
  const now = Date.now();
  if (state !== previous) {
    const held = previous === null ? "" : `  (previous state held ${((now - lastChangeAt) / 1000).toFixed(1)}s)`;
    console.log(`${stamp(now)}  ${state}${held}`);
    previous = state;
    lastChangeAt = now;
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
console.log(`${stamp(Date.now())}  done — final state ${previous}`);

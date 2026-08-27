import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routerPath = path.join(here, "..", "bridge-router-core.js");
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(routerPath));

const core = globalThis.DacBridgeCore;
const routerCore = globalThis.DacBridgeRouterCore;
const routerSource = fs.readFileSync(routerPath, "utf8");
const routeBody = routerSource.slice(routerSource.indexOf("async function route("), routerSource.indexOf("return Object.freeze({ route"));

assert.match(routerSource, /BOOTSTRAP_ALLOWED_METHODS/, "router source declares the bootstrap allowlist");
assert.match(routeBody, /BOOTSTRAP_ALLOWED_SET\.has\(request\.method\)/, "route() enforces the bootstrap allowlist");
assert.match(routerSource, /const BOOTSTRAP_ALLOWED_SET = new Set\(BOOTSTRAP_ALLOWED_METHODS\)/, "the membership Set is built from the frozen list and stays module-private");
assert.ok(Object.isFrozen(routerCore.BOOTSTRAP_ALLOWED_METHODS), "the exported bootstrap allowlist is frozen");
assert.ok(Array.isArray(routerCore.BOOTSTRAP_ALLOWED_METHODS), "the export is a frozen ARRAY, not a Set — Object.freeze does not freeze Set contents (audit 2026-08-27)");
assert.deepEqual(
  [...routerCore.BOOTSTRAP_ALLOWED_METHODS],
  ["session.hello", "system.ping", "system.capabilities", "diagnostics.dom_probe"],
  "only the four bootstrap methods are exposed"
);
// Bypass regression (audit blocker 2026-08-27): mutating the exported value
// must be impossible, and even a swallowed attempt must not open the gate.
assert.throws(() => routerCore.BOOTSTRAP_ALLOWED_METHODS.push("run.trial"), TypeError, "the exported allowlist rejects mutation");
assert.equal(routerCore.BOOTSTRAP_ALLOWED_METHODS.includes("run.trial"), false, "the allowlist is unchanged after the mutation attempt");

const base = {
  protocol: core.PROTOCOL,
  version: 1,
  kind: "request",
  request_id: "bootstrap-request-0001",
  sent_at: "2026-08-27T10:00:00.000Z",
  client: { client_id: "bootstrap-test", name: "Bootstrap Test", version: "1" }
};
const router = routerCore.createRouter({
  core,
  extension_id: "f".repeat(32),
  session_id: "bootstrap-session",
  now: () => new Date("2026-08-27T10:00:01.000Z"),
  executor_state: () => ({ available: false, executor_epoch: null }),
  send_executor: async () => { throw new Error("offline executor must not be called"); }
});

const request = (requestId, method, params) => ({ ...base, request_id: requestId, method, params });

const capabilities = await router.route(request("bootstrap-request-0001", "system.capabilities", {}));
assert.equal(capabilities.ok, true, "system.capabilities passes the bootstrap gate");

const hello = await router.route(request("bootstrap-request-0002", "session.hello", { supported_versions: [1] }));
assert.equal(hello.ok, true, "session.hello passes the bootstrap gate");

const ping = await router.route(request("bootstrap-request-0003", "system.ping", {}));
assert.equal(ping.ok, true, "offline system.ping passes the bootstrap gate");
assert.equal(ping.result.executor, "unavailable");

const probe = await router.route(request("bootstrap-request-0004", "diagnostics.dom_probe", {}));
assert.equal(probe.ok, false, "dom_probe reaches executor dispatch while offline");
assert.equal(probe.error.code, "EXECUTOR_UNAVAILABLE");

const lockedCases = [
  ["run.trial", { job_ids: ["FLOW-01"] }],
  ["run.status", {}],
  ["queue.list", {}],
  ["chat.reload", {}],
  ["jobs.add", { jobs: [{ prompt: "bootstrap gate test" }] }]
];
for (const [index, [method, params]] of lockedCases.entries()) {
  const response = await router.route(request(`bootstrap-request-${String(index + 5).padStart(4, "0")}`, method, params));
  assert.equal(response.ok, false, `${method} is rejected during bootstrap`);
  assert.equal(response.error.code, "FORBIDDEN", `${method} reuses the existing forbidden taxonomy`);
  assert.equal(response.error.details.reason, "bootstrap_locked", `${method} carries the bootstrap lock reason`);
  assert.equal(response.error.details.method, method, `${method} is identified in rejection details`);
}

assert.equal(capabilities.ok, true, "capabilities still succeeds while locked methods are rejected behaviorally");

// Even after the (rejected) mutation attempt above, the gate must still hold.
const postMutation = await router.route(request("bootstrap-request-0099", "run.trial", { job_ids: ["FLOW-01"] }));
assert.equal(postMutation.ok, false, "run.trial stays locked after an attempted allowlist mutation");
assert.equal(postMutation.error.details.reason, "bootstrap_locked");
console.log("bootstrap gate smoke tests: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;

// ---------------------------------------------------------------------------
// Registry contract
// ---------------------------------------------------------------------------
const entry = core.METHOD_REGISTRY["chat.reload"];
assert.deepEqual(JSON.parse(JSON.stringify({
  context: entry.context, approval: entry.approval, read_only: entry.read_only,
  idempotent: entry.idempotent, deadline_ms: entry.deadline_ms
})), {
  // 30s, not 10s: the handler deliberately waits up to 20s for the page to
  // answer before replying, so the deadline has to outlast the wait.
  context: "executor", approval: "none", read_only: false, idempotent: true, deadline_ms: 30000
});

// No arguments: the caller does not choose the tab, it is told which one was
// reloaded. A tab_id parameter would invite reloading a tab nobody looked at.
assert.deepEqual(JSON.parse(JSON.stringify(core.validateParams("chat.reload", {}))), {});
assert.throws(() => core.validateParams("chat.reload", { tab_id: 7 }), (error) => error.code === "INVALID_PARAMS");
assert.throws(() => core.validateParams("chat.reload", { force: true }), (error) => error.code === "INVALID_PARAMS");

// RUN_ACTIVE must stay a retryable code: "not now, stop the run first" is a
// condition the caller can actually clear on its own, unlike VALIDATION_FAILED.
assert.equal(core.ERROR_DEFINITIONS.RUN_ACTIVE.retryable, true);

// ---------------------------------------------------------------------------
// Handler contract (static: sidepanel.js needs chrome + DOM to execute)
// ---------------------------------------------------------------------------
const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const start = sidepanel.indexOf("// The mirror image of run.stop");
// The method is two functions: bridgeChatReload holds the latch, and
// performChatReload does the work inside it. The slice spans both, ending at
// performChatReload's own closing brace (its indentation level) rather than at
// the name of whatever is defined next.
const body = sidepanel.indexOf("async function performChatReload", start);
const end = body + sidepanel.slice(body).search(/^ {2}\}$/m) + 3;
assert.ok(start >= 0 && body > start && end > body, "chat.reload is defined, explained, and split into latch + work");
assert.ok(sidepanel.indexOf("async function bridgeChatReload", start) < body, "the latch wrapper comes first");
const handler = sidepanel.slice(start, end);
const codeOnly = handler.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:])\/\/.*$/gm, "$1");

// REQUIREMENT: refuse while a run is active. F5 kills the content script and
// every attempt in flight, losing quota already spent and risking a second
// submission of the same prompt. Exact-once is not negotiable for convenience.
// The guard must be a LATCH, not a naked read of the flags. Antigravity's
// audit of 2026-08-26 found the naked read: this handler awaits activeTab()
// and then polls for up to 20 seconds, and during that whole window nothing
// stopped a run from starting against the tab being reloaded -- the exact-once
// hole the guard exists to close. Reverting to `if (state.running || ...)`
// here would silently reopen it, so the latch is what is asserted.
assert.match(codeOnly, /queueRunLock\.tryBeginMutation\(\)/, "the reload claims the mutation latch instead of merely reading the flags");
assert.match(codeOnly, /queueRunLock\.endMutation\(\)/, "and releases it");
assert.match(codeOnly, /finally/, "release happens in finally, so a thrown reload cannot strand the lock");
assert.match(codeOnly, /BridgeProtocolError\(\s*\n?\s*"RUN_ACTIVE"/, "the refusal uses the RUN_ACTIVE code");
assert.match(handler, /run\.stop/, "the refusal names run.stop as the way forward");
assert.ok(
  codeOnly.indexOf("tryBeginMutation") < codeOnly.indexOf("await"),
  "the latch is claimed before the handler's first await, not after"
);
assert.match(handler, /exact-once|Exact-once/, "the reason the guard exists stays written down");
// The latch must outlive the readiness wait, not be released before it.
const reloadWork = sidepanel.slice(sidepanel.indexOf("async function performChatReload"));
assert.ok(
  reloadWork.indexOf("chrome.tabs.reload") < reloadWork.indexOf("DAC_PING"),
  "the reload happens before the readiness poll"
);
assert.doesNotMatch(
  codeOnly.slice(0, codeOnly.indexOf("finally")),
  /chrome\.tabs\.reload/,
  "the tab is only reloaded while the latch is held"
);

// REQUIREMENT: wait for the content script to answer before replying. Replying
// ok on a page that cannot be used yet is a small lie that makes the caller act
// too early.
assert.match(codeOnly, /DAC_PING/, "readiness is proven by the page answering, not by a timer");
assert.match(codeOnly, /composerFound/, "alive is not enough -- the composer must exist, as system.ping requires");
assert.match(codeOnly, /ready/, "the answer carries an explicit ready flag");
assert.ok(
  codeOnly.indexOf("chrome.tabs.reload") < codeOnly.indexOf("DAC_PING"),
  "the poll happens after the reload, not before"
);
// The poll must target the tab that was actually reloaded. send() re-resolves
// the active tab on every call (B-01), so using it here could ping a different
// tab than the one that was reloaded and report a stale success.
assert.match(codeOnly, /chrome\.tabs\.sendMessage\(tabId/, "the readiness poll is addressed to the reloaded tab by id");
assert.doesNotMatch(codeOnly, /await send\(/, "the poll must not go through send(), which re-resolves the active tab");
// A page that never answers is reported, not thrown: the reload did happen and
// the caller needs to know that as much as it needs to know it is not ready.
assert.doesNotMatch(codeOnly, /throw new Error/, "a page that stays silent is reported as ready=false, not as a crash");

// REQUIREMENT: say exactly WHICH tab was reloaded. activeTab() re-resolves the
// active tab on every call (B-01, unfixed), so leaving this implicit would let
// the caller assume the wrong tab.
for (const field of ["tab_id", "url_before", "url_after", "waited_ms", "composer_found", "ready", "note"]) {
  assert.match(handler.slice(handler.indexOf("return {")), new RegExp(`\\b${field}\\s*[,:]`), `chat.reload reports ${field}`);
}
assert.match(handler, /B-01/, "the known tab-resolution defect is cited where it matters");

// REQUIREMENT: audited with tab id and url.
assert.match(codeOnly, /audit\("BRIDGE_CHAT_RELOADED"/, "a reload is recorded as its own audit event");
assert.match(codeOnly, /tab_id=\$\{tabId\}/, "the audit row names the tab that was reloaded");
assert.match(codeOnly, /target_url:/, "the audit row carries the url");
assert.match(codeOnly, /input_origin: "bridge"/, "the audit row names the bridge as the origin");

// REQUIREMENT: this wave opens a manual command only. Self-healing inside the
// job loop is a separate decision and must not sneak in here.
const runStart = sidepanel.indexOf('async function run(mode = "all")');
const runBody = sidepanel.slice(runStart, runStart + 20000);
assert.doesNotMatch(runBody, /bridgeChatReload|chrome\.tabs\.reload/, "the run loop must never reload the tab by itself");

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
assert.match(sidepanel, /"chat\.reload": withBridgeErrors\(bridgeChatReload\)/, "registered in the executor dispatcher");
assert.match(sidepanel, /"chat\.reload": bridgeChatReload/, "registered in the test-hook handler table");

// ---------------------------------------------------------------------------
// The pair is designed to be used in sequence. run.stop bypasses the lock that
// chat.reload obeys; if that ever inverts, the sequence stops working and both
// methods become unsafe at once.
// ---------------------------------------------------------------------------
const stopStart = sidepanel.indexOf("// Deliberately does NOT take queueRunLock");
const stopBody = sidepanel.indexOf("async function bridgeRunStop", stopStart);
const stopHandler = sidepanel.slice(stopStart, stopBody + sidepanel.slice(stopBody).search(/^ {2}\}$/m) + 3);
const stopCode = stopHandler.replace(/(^|[^:])\/\/.*$/gm, "$1");
assert.doesNotMatch(stopCode, /RUN_ACTIVE/, "run.stop never refuses with RUN_ACTIVE");
assert.match(codeOnly, /RUN_ACTIVE/, "chat.reload always can");

console.log("bridge chat.reload smoke tests: PASS");

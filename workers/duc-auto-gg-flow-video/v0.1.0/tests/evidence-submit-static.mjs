// diagnostics.evidence_submit — the FLOW-01 bootstrap interaction scaffold.
// Pins: registry + params contract, router allowlist membership, panel wiring,
// and the content-side hard cap of 3 submissions per page load (the owner's
// whole free budget is 3 videos x 15 credits — decisions.md 2026-08-27).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-router-core.js")));
const bridge = globalThis.DacBridgeCore;
const routerCore = globalThis.DacBridgeRouterCore;
const panel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const content = fs.readFileSync(path.join(here, "..", "content.js"), "utf8");

// Registry: executor context, write method, no approval gate of its own (the
// cap lives content-side), bounded deadline.
const entry = bridge.METHOD_REGISTRY["diagnostics.evidence_submit"];
assert.ok(entry, "diagnostics.evidence_submit is registered");
assert.equal(entry.context, "executor");
assert.equal(entry.read_only, false, "it clicks Create — never claim read-only");
assert.deepEqual(bridge.POLICY.prohibited_methods, ["run.start", "run.pause", "run.resume"], "prohibited list unchanged");

// Params: prompt required, 1..2000 chars, unknown fields rejected.
assert.deepEqual(bridge.validateParams("diagnostics.evidence_submit", { prompt: " hello " }), { prompt: "hello" });
assert.throws(() => bridge.validateParams("diagnostics.evidence_submit", {}), (error) => error.code === "INVALID_PARAMS", "missing prompt is rejected");
assert.throws(() => bridge.validateParams("diagnostics.evidence_submit", { prompt: "" }), (error) => error.code === "INVALID_PARAMS", "empty prompt is rejected");
assert.throws(() => bridge.validateParams("diagnostics.evidence_submit", { prompt: "x", click: true }), (error) => error.code === "INVALID_PARAMS", "unknown fields are rejected");
assert.throws(() => bridge.validateParams("diagnostics.evidence_submit", { prompt: "x".repeat(2001) }), (error) => error.code === "INVALID_PARAMS", "oversized prompt is rejected");

// Router: it is the SIXTH and last bootstrap-allowlisted method.
assert.ok(routerCore.BOOTSTRAP_ALLOWED_METHODS.includes("diagnostics.evidence_submit"), "allowlisted during bootstrap");

// Panel wiring: dispatch map + test hooks + forwards DAC_FLOW_EVIDENCE_SUBMIT.
assert.match(panel, /"diagnostics\.evidence_submit": withBridgeErrors\(bridgeEvidenceSubmit\)/);
assert.match(panel, /"diagnostics\.evidence_submit": bridgeEvidenceSubmit,/, "test hooks expose the raw handler");
assert.match(panel, /send\(\{ type: "DAC_FLOW_EVIDENCE_SUBMIT", prompt: params\.prompt \}\)/);

// Content side: hard cap constant, evidence-backed finders, async response.
const blockStart = content.indexOf('if (message.type === "DAC_FLOW_EVIDENCE_SUBMIT")');
assert.ok(blockStart > -1, "content script handles DAC_FLOW_EVIDENCE_SUBMIT");
const blockEnd = content.indexOf('if (message.type === "DAC_DOM_PROBE")', blockStart);
assert.ok(blockEnd > blockStart, "the scaffold block sits BEFORE the dom-probe block, keeping the probe purity slice clean");
const block = content.slice(blockStart, blockEnd);
assert.match(block, /EVIDENCE_SUBMIT_CAP = 3/, "hard cap is 3 per page load — the owner's whole free budget");
assert.match(block, /STATE\.evidenceSubmitCount >= EVIDENCE_SUBMIT_CAP/, "the cap is enforced, not decorative");
assert.match(block, /findComposer\(\)/, "reuses the evidence-verified composer finder");
assert.match(block, /setComposerText\(/, "reuses the proven typing path");
assert.match(block, /arrow_forward/, "Create button match is evidence-backed (F1 snapshot 1)");
assert.match(block, /\.then\(\(result\) => sendResponse\(\{ ok: true, result \}\)\)/, "responds asynchronously via promise");
assert.match(block, /return true;/, "keeps the message channel open for the async response");
// Audit blockers 2026-08-27 (Codex), pinned so they cannot regress:
// 1. The slot is reserved SYNCHRONOUSLY — the count increment must sit before
//    the async IIFE, so two concurrent submits can never both pass the cap.
assert.ok(block.indexOf("STATE.evidenceSubmitCount += 1") < block.indexOf("(async () =>"), "slot reserved synchronously, before any await");
assert.ok(block.indexOf("STATE.evidenceSubmitCount += 1") < block.indexOf("createButton.click()"), "count first, click second");
// 2. One submit in flight at a time, and the busy flag is always released.
assert.match(block, /STATE\.evidenceSubmitInFlight\b/, "in-flight serialization flag exists");
assert.ok(block.indexOf("STATE.evidenceSubmitInFlight = true") < block.indexOf("(async () =>"), "busy flag set synchronously");
assert.match(block, /\.finally\(\(\) => \{ STATE\.evidenceSubmitInFlight = false; \}\)/, "busy flag released on every path");
// 3. Panel side (audit round 2): the lock is ACQUIRED, not just read — a bare
//    check leaves the await-send window open for run() to start (TOCTOU).
//    Pin the chat.reload-shaped sequence: sync check, sync acquire, finally release.
const panelHandlerStart = panel.indexOf("async function bridgeEvidenceSubmit(");
const panelHandlerEnd = panel.indexOf("function connectBridgeExecutor", panelHandlerStart);
const panelHandler = panel.slice(panelHandlerStart, panelHandlerEnd);
assert.match(panelHandler, /bridgeApprovalLockReason\(\{ workbookRequired: false, persistenceRequired: false \}\)/, "lock reason is checked");
assert.match(panelHandler, /BridgeProtocolError\(\s*"RUN_ACTIVE"/, "refuses with RUN_ACTIVE while a run is live");
assert.ok(panelHandler.indexOf("state.queueMutationRunning = true") > -1, "the lock is acquired, not just read");
assert.ok(panelHandler.indexOf("state.queueMutationRunning = true") < panelHandler.indexOf("await Promise.race("), "acquired synchronously BEFORE the await window opens");
assert.match(panelHandler, /finally \{\s*state\.queueMutationRunning = false;/, "the lock is released on every path");
// 4. (audit round 3) The await is BOUNDED — an unanswered sendMessage must not
//    hold the RUN_ACTIVE lock forever.
assert.match(panelHandler, /Promise\.race\(/, "the content-script wait is bounded by a timeout race");
assert.match(panelHandler, /EVIDENCE_SUBMIT_TIMEOUT/, "timeout failure is named and explains the maybe-consumed slot");

console.log("evidence-submit static: PASS");

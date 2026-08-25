// output.set_folder_hint — the agent-writable folder-path channel ("AI là bộ
// não, người là cánh tay", decisions.md 2026-08-25): the agent that prepared a
// task package records the absolute path it created, so the BRIDGE tab can
// serve it back to Đức as a one-click copy. DISPLAY METADATA ONLY: the method
// must write no workbook data, produce no checkpoint, and must NOT be routed
// through executeBridgeDirectMutation (it has to work while persistence is
// unavailable — that is its main use case).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
await import(pathToFileURL(path.join(root, "bridge-core.js")));
const bridge = globalThis.DacBridgeCore;

// Registry contract.
const entry = bridge.METHOD_REGISTRY["output.set_folder_hint"];
assert.ok(entry, "method must be registered");
assert.equal(entry.context, "executor");
assert.equal(entry.requires_executor, true);
assert.equal(entry.approval, "none");
assert.equal(entry.read_only, false);
assert.equal(entry.deadline_ms, 10000);
assert.match(entry.capability_description, /[Mm]etadata/, "description must state it is metadata-only");

// Param validation: real Windows absolute paths (spaces included) must pass;
// control characters, empty hints, bad slugs, unknown keys must not.
const goodPath = "C:\\WORKING ZONE\\Chrome_Extension_AI_Agentic\\workers\\duc-auto-chatgpt\\v0.1.0\\Pilot-09_Test-Codex-Bridge-to-Extension";
assert.doesNotThrow(() => bridge.validateParams("output.set_folder_hint", { folder_hint: goodPath }));
assert.doesNotThrow(() => bridge.validateParams("output.set_folder_hint", { folder_hint: goodPath, profile_id: "pilot-09" }));
assert.doesNotThrow(() => bridge.validateParams("output.set_folder_hint", { folder_hint: "\\\\server\\share\\th\u01b0 m\u1ee5c \u1ea3nh" }), "UNC + unicode + spaces must pass");
// Hardened per Codex audit: absolute-path shape enforced; bidi/zero-width
// and C1 control characters rejected (display-deception vector).
for (const bad of [
  { folder_hint: "Pilot-09/relative/path" },
  { folder_hint: "h\u00e3y ch\u1ecdn folder n\u00e0y gi\u00fap t\u00f4i" },
  { folder_hint: "C:\\evil\u202e\\folder" },
  { folder_hint: "C:\\evil\u200b\\folder" },
  { folder_hint: "C:\\evil\u0085\\folder" },
  { folder_hint: "\\\\" },
  { folder_hint: "\\\\server-only" },
  { folder_hint: "C:\\evil\u2060\\folder" },
  { folder_hint: "C:\\evil\u061c\\folder" },
  { folder_hint: "C:\\evil\u206a\\folder" },

  {},
  { folder_hint: "" },
  { folder_hint: "a\u0000b" },
  { folder_hint: "line1\nline2" },
  { folder_hint: goodPath, profile_id: "Pilot-09" },
  { folder_hint: goodPath, extra: true }
]) {
  assert.throws(() => bridge.validateParams("output.set_folder_hint", bad), (error) => error.code === "INVALID_PARAMS", JSON.stringify(bad));
}

// Handler wiring in the side panel: registered in both dispatcher and test
// hooks, and deliberately NOT a checkpointing direct mutation.
const js = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");
assert.match(js, /"output\.set_folder_hint": withBridgeErrors\(bridgeOutputSetFolderHint\)/, "dispatcher must register the handler");
const handlerStart = js.indexOf("async function bridgeOutputSetFolderHint");
const handler = js.slice(handlerStart, js.indexOf("function appendBridgeMeta", handlerStart));
assert.ok(handlerStart >= 0 && handler.length > 0, "handler must exist");
assert.match(handler, /DacOutputProfiles\.setHint\(/, "handler must persist via the profile store");
assert.match(handler, /PROFILE_AMBIGUOUS/, "multiple profiles without profile_id must fail with a listing");
assert.match(handler, /probeBridgePersistence\(\)/, "handler must refresh the attention rows");
assert.doesNotMatch(handler, /executeBridgeDirectMutation/, "metadata write must not checkpoint");
assert.doesNotMatch(handler, /persistLedgerCandidate|saveAuditLog/, "metadata write must not touch ledger/audit artifacts");

console.log("bridge-output-set-folder-hint-smoke: all assertions passed");

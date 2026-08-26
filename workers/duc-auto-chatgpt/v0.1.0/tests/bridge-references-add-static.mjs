/* A bridge-supplied reference image must be INDISTINGUISHABLE from one the
   owner picked.

   references.add exists so an AI operator can run a job with reference images
   at all. Proven live 2026-08-26: jobs.add answered
   "MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'", because
   reference_images everywhere else is a filename TOKEN that must already
   resolve against state.files, and state.files was only ever filled by the
   owner's <input type=file>.

   The danger in fixing that is building a SECOND attachment path. If a
   bridge-added reference carried a different in-memory shape, then every test
   and every pilot run through the bridge would be exercising something the
   owner's own runs never touch -- and the thing measured would not be the
   thing shipped. So the shape is pinned here, field for field, against the
   picker path that produced it.

   Static checks: the side panel cannot be exercised headlessly, so the
   guarantees are pinned by reading the source. */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const bridgeCore = fs.readFileSync(new URL("bridge-core.js", root), "utf8");

const between = (source, from, to) => {
  const start = source.indexOf(from);
  assert.ok(start > 0, `anchor not found: ${from}`);
  const end = to ? source.indexOf(to, start) : source.length;
  assert.ok(end > start, `end anchor not found after ${from}: ${to}`);
  return source.slice(start, end);
};

/* --- the handler is reachable ------------------------------------------ */

// Two dispatch maps, and a method missing from either one is unreachable in
// that path while looking present in the other.
assert.match(sidepanel, /"references\.add": withBridgeErrors\(bridgeReferencesAdd\)/,
  "references.add must be in the withBridgeErrors dispatch map");
assert.match(sidepanel, /"references\.add": bridgeReferencesAdd,/,
  "references.add must be in the second dispatch map too");

const cli = fs.readFileSync(new URL("duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs", root), "utf8");
assert.match(cli, /"references-add": "references\.add"/, "the CLI must expose a subcommand or no operator can call it");
assert.match(between(cli, "const PARAMS_FILE_COMMANDS", "]);"), /"references-add"/,
  "references-add carries base64 payloads and MUST take --params-file, never a shell argument");

/* --- the picker shape, field for field --------------------------------- */

const picker = between(sidepanel, "els.referencesInput.files", ";");
assert.match(picker, /dataUrl\(file\)/, "the picker path builds its entry from dataUrl(file)");
assert.match(picker, /alias: ""/, "the picker path defaults alias to empty");

const apply = between(sidepanel, "function applyBridgeReferencesAdd", "\n  async function applyBridgeJobsAdd");

// The three fields resolveReferences() and the run path actually read.
assert.match(apply, /const file = \{ fileName: reference\.name, dataUrl: reference\.data_url, alias: "" \};/,
  "a bridge reference must be exactly { fileName, dataUrl, alias } -- the picker's shape, or attachment diverges");
assert.match(apply, /state\.files\.push\(file\)/, "bridge references land in the SAME state.files the picker fills");

// Replace-by-name rather than append. Two entries with one name would make
// resolveReferences ambiguous, and AMBIGUOUS_REFERENCE would fail the run.
assert.match(apply, /findIndex\(\(existing\) => String\(existing\.fileName \|\| existing\.name \|\| ""\)\.toLowerCase\(\) === key\)/,
  "an existing name is located case-insensitively, matching resolveReferences' own normalisation");
assert.match(apply, /state\.files\.splice\(index, 1, file\)/, "a repeat name REPLACES in place; appending would create an ambiguous token");

/* --- the side effects the picker also triggers ------------------------- */

// Skipping any of these leaves the UI and Check Plan describing the previous
// set of references while the run uses the new one.
assert.match(apply, /invalidateValidation\(/, "changing inputs must force Check Plan again before Run");
assert.match(apply, /renderReferenceGallery\(\)/, "the gallery must show what the run will actually attach");
assert.match(apply, /els\.referenceText/, "the reference count line must reflect the new total");

/* --- the audit records names, never bytes ----------------------------- */

assert.match(apply, /bytes: referenceDataUrlBytes\(reference\.data_url\)/, "byte size is recorded");
assert.ok(!/data_url:[^\n]*auditEvent/.test(apply), "no data_url may be routed into an audit event");

const auditEvent = between(sidepanel, "function bridgeDirectAuditEvent", "\n  function bridgeDirectLock");
assert.match(auditEvent, /references: mutation\.reference_names \|\| \[\]/,
  "the audit carries reference NAMES");
assert.ok(!/data_url/.test(auditEvent),
  "the audit event must never carry image data -- it is persisted to JSONL and committed as evidence");
assert.match(auditEvent, /reference_bytes: mutation\.reference_bytes/, "byte sizes ride along for cost accounting");
// Same field names as the Gemini worker, so one audit reader serves both (B-06).
for (const field of ["bridge_reference_names", "bridge_replaced_names"]) {
  assert.ok(auditEvent.includes(field), `${field} must match the Gemini worker's audit field names`);
}

/* --- the safety envelope ---------------------------------------------- */

const handler = between(sidepanel, "async function bridgeReferencesAdd", "\n  async function bridgeJobsUpdate");
assert.match(handler, /executeBridgeDirectMutation\(/,
  "it must go through the shared direct-mutation path, which takes the run lock and checkpoints");
assert.match(handler, /persistenceRequired: false/, "references are pre-submit input; no output binding is needed yet");
assert.ok(!/workbookRequired: false/.test(handler),
  "workbookRequired stays default TRUE: executeBridgeDirectMutation throws WORKBOOK_NOT_LOADED after mutate() anyway, and jobs.add is the bootstrap door");

// state.files must be inside the mutation transaction. This handler is the only
// direct mutation that touches it, and before the Antigravity audit of
// 2026-08-26 the snapshot omitted it: a persistence failure rolled the workbook
// and audit back but left the images. The sharp case is REPLACEMENT -- a
// bridge-supplied name overwriting an image Đức had picked, with no way back.
const snapshot = between(sidepanel, "function bridgeDirectSnapshot", "\n  function ");
assert.match(snapshot, /files: \[\.\.\.state\.files\]/, "the snapshot must capture state.files, or references.add is outside the transaction");
const restore = between(sidepanel, "function restoreBridgeDirectSnapshot", "\n  function ");
assert.match(restore, /state\.files = snapshot\.files/, "rollback must restore state.files");
assert.match(restore, /renderReferenceGallery\(\)/, "rollback must repaint the gallery, or it shows images the session no longer holds");

// The run lock. A reference swapped mid-run would change what an in-flight
// attempt attaches, so this must never be exempted the way run.stop is.
const directMutation = between(sidepanel, "async function executeBridgeDirectMutation", "\n  async function bridgeJobsAdd");
assert.match(directMutation, /tryBeginMutation\(\)/, "direct mutations are refused while a run is live");

/* --- limits are declared, not implied --------------------------------- */

const limits = between(bridgeCore, "const LIMITS = deepFreeze", "});");
assert.match(limits, /max_references_per_add: 5/, "the batch ceiling is explicit");
assert.match(limits, /max_reference_data_url_bytes: 700 \* 1024/, "the per-image ceiling is explicit");
const envelope = Number(/max_envelope_bytes: (\d+) \* 1024/.exec(limits)?.[1]);
assert.ok(envelope * 1024 > 700 * 1024, "one reference must fit inside the envelope with room for JSON framing");

console.log("bridge references.add static tests: PASS");

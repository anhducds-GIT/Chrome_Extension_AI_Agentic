import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
await import(pathToFileURL(path.join(here, "..", "bridge-router-core.js")));
await import(pathToFileURL(path.join(here, "..", "runner-core.js")));
const bridge = globalThis.DacBridgeCore;
const routerCore = globalThis.DacBridgeRouterCore;
const runner = globalThis.DacRunnerCore;
const sidepanel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");

// ---------------------------------------------------------------------------
// Registry entry: references.add is a direct executor mutation, no owner click.
// ---------------------------------------------------------------------------
const entry = bridge.METHOD_REGISTRY["references.add"];
assert.ok(entry, "references.add is registered");
assert.equal(entry.context, "executor");
assert.equal(entry.read_only, false);
assert.equal(entry.approval, "none");
assert.equal(entry.requires_executor, true);
assert.equal(entry.idempotent, false);
assert.equal(entry.deadline_ms, 30000);
const advertised = bridge.capabilities().methods.find((method) => method.name === "references.add");
assert.ok(advertised, "system.capabilities lists references.add");
assert.equal(advertised.approval, "none");
assert.equal(bridge.capabilities().limits.max_references_per_add, 5);
assert.equal(bridge.capabilities().limits.max_reference_data_url_bytes, 716800);

// ---------------------------------------------------------------------------
// Validator matrix.
// ---------------------------------------------------------------------------
const goodDataUrl = "data:image/png;base64,aGVsbG8=";
const reference = (overrides = {}) => ({ name: "Duc1.png", data_url: goodDataUrl, ...overrides });
assert.doesNotThrow(() => bridge.validateParams("references.add", { references: [reference()] }));
assert.doesNotThrow(() => bridge.validateParams("references.add", {
  references: [
    reference({ name: "a.png" }), reference({ name: "b.JPG" }), reference({ name: "c.jpeg" }),
    reference({ name: "d.webp", data_url: "data:image/webp;base64,aGVsbG8=" }),
    reference({ name: "e.jpg", data_url: "data:image/jpeg;base64,aGVsbG8=" })
  ]
}), "1-5 references with every allowed extension and mime pass");
const invalidCases = [
  ["zero references", { references: [] }],
  ["six references", { references: ["a", "b", "c", "d", "e", "f"].map((stem) => reference({ name: `${stem}.png` })) }],
  ["bad extension", { references: [reference({ name: "Duc1.gif" })] }],
  ["no extension", { references: [reference({ name: "Duc1" })] }],
  ["path traversal name", { references: [reference({ name: "../Duc1.png" })] }],
  ["bad data_url prefix", { references: [reference({ data_url: "data:image/gif;base64,aGVsbG8=" })] }],
  ["non-base64 encoding", { references: [reference({ data_url: "data:image/png,plain" })] }],
  ["bad base64 charset", { references: [reference({ data_url: "data:image/png;base64,not valid!!" })] }],
  ["empty payload", { references: [reference({ data_url: "data:image/png;base64," })] }],
  ["oversize data_url", { references: [reference({ data_url: `data:image/png;base64,${"A".repeat(716800)}` })] }],
  ["duplicate names case-insensitive", { references: [reference({ name: "Duc1.png" }), reference({ name: "duc1.PNG" })] }],
  ["unknown reference field", { references: [{ ...reference(), alias: "duc" }] }],
  ["unknown params field", { references: [reference()], replace: true }]
];
for (const [label, params] of invalidCases) {
  assert.throws(() => bridge.validateParams("references.add", params), (error) => error.code === "INVALID_PARAMS", `${label} is rejected with typed INVALID_PARAMS`);
}

// ---------------------------------------------------------------------------
// Executor handler stores picker-shaped objects, replaces by name, refreshes
// the same plan path the file picker uses, and audits names without pixels.
// ---------------------------------------------------------------------------
assert.match(sidepanel, /"references\.add": withBridgeErrors\(bridgeReferencesAdd\)/, "the executor dispatch map routes references.add");
assert.match(sidepanel, /"references\.add": bridgeReferencesAdd/, "the executor test hooks expose references.add");
const handler = sidepanel.slice(sidepanel.indexOf("async function bridgeReferencesAdd"), sidepanel.indexOf("async function bridgeOutputConfigure"));
assert.match(handler, /\{ fileName: reference\.name, dataUrl: reference\.data_url, alias: "" \}/, "bridge references use the exact loadFiles() picker shape");
assert.match(handler, /state\.files\.findIndex/, "existing names are looked up case-insensitively");
assert.match(handler, /state\.files\.splice\(index, 1, file\)/, "an existing name is REPLACED in place, not duplicated");
assert.match(handler, /state\.files\.push\(file\)/, "new names append to the same in-memory store the picker fills");
assert.match(handler, /event: "BRIDGE_REFERENCES_ADDED"/);
assert.match(handler, /input_origin: "bridge"/);
assert.match(handler, /state\.auditEvents\.push\(auditEvent\)/, "the audit event enters the canonical audit buffer");
assert.match(handler, /invalidateValidation\("Reference inputs changed; check plan again before Run\."\)/, "same invalidation message as the picker path");
assert.match(handler, /renderReferenceGallery\(\);/);
assert.match(handler, /await prepare\(\);/, "the picker's plan refresh re-runs so Check Plan resolves the new references");
assert.doesNotMatch(handler, /\brun\s*\(|DAC_RUN_IMAGE_JOB|chrome\.tabs\.sendMessage/, "references.add can never start or submit a run");
const auditLiteral = handler.slice(handler.indexOf("const auditEvent = {"), handler.indexOf("state.auditEvents.push(auditEvent)"));
assert.match(auditLiteral, /reference_bytes: sizes/, "audit carries per-reference byte sizes");
assert.doesNotMatch(auditLiteral, /data_url|dataUrl/, "audit never carries the image data");
assert.match(sidepanel, /"BRIDGE_REFERENCES_ADDED"/, "the bridge activity feed recognises the new event type");
assert.doesNotMatch(handler, /innerHTML/);

// The stored shape resolves through the same runner-core path the run uses:
// a job token matches fileName exactly, and executeAttempt reads .dataUrl.
const storedFile = { fileName: "Duc1.png", dataUrl: goodDataUrl, alias: "" };
const resolved = runner.resolveReferences({ id: "Q001", reference_images: "Duc1.png" }, [storedFile], 5);
assert.equal(resolved.length, 1);
assert.equal(resolved[0], storedFile, "plan resolution returns the exact stored object, dataUrl intact");
assert.equal(resolved[0].dataUrl, goodDataUrl);

// ---------------------------------------------------------------------------
// Executor error transparency: INTERNAL_ERROR now carries details.message.
// ---------------------------------------------------------------------------
const bridgeErrorSource = sidepanel.slice(sidepanel.indexOf("function bridgeError"), sidepanel.indexOf("function requireBridgeWorkbook"));
assert.match(bridgeErrorSource, /BridgeProtocolError\("INTERNAL_ERROR", undefined, \{ message: String\(error\?\.message \?\? error\)\.slice\(0, 300\) \}\)/, "unexpected executor handler failures keep the taxonomy but expose a bounded message");
assert.match(sidepanel, /failureResponse\(envelope\?\.request_id, "INTERNAL_ERROR", undefined, undefined, \{ message: String\(error\?\.message \?\? error\)\.slice\(0, 300\) \}\)/, "the Port-level wrap also carries details.message");

const wrapped = new bridge.BridgeProtocolError("INTERNAL_ERROR", undefined, { message: "x".repeat(400).slice(0, 300) });
assert.equal(wrapped.code, "INTERNAL_ERROR");
assert.equal(wrapped.retryable, false);
assert.equal(wrapped.details.message.length, 300);
const dispatch = bridge.createDispatcher({
  handlers: { "system.ping": async () => { throw new bridge.BridgeProtocolError("INTERNAL_ERROR", undefined, { message: "REFERENCE_DECODE_FAILED: bad png header" }); } },
  now: () => new Date("2026-08-25T10:00:01.000Z")
});
const failed = await dispatch({
  protocol: bridge.PROTOCOL, version: 1, kind: "request", request_id: "references-req-0001",
  method: "system.ping", sent_at: "2026-08-25T10:00:00.000Z",
  client: { client_id: "references-test", name: "References Test", version: "1" }, params: {}
});
assert.equal(failed.ok, false);
assert.equal(failed.error.code, "INTERNAL_ERROR");
assert.equal(failed.error.message, "The bridge could not complete the request.", "the stable taxonomy message is unchanged");
assert.equal(failed.error.details.message, "REFERENCE_DECODE_FAILED: bad png header", "details.message survives the response envelope for remote diagnosis");

let routerForwarded = false;
const router = routerCore.createRouter({
  core: bridge,
  executor_state: () => ({ available: true, executor_epoch: "epoch-1" }),
  send_executor: async () => { routerForwarded = true; throw new Error("panel Port disappeared mid-flight"); },
  now: () => new Date("2026-08-25T10:00:02.000Z")
});
const routed = await router.route({
  protocol: bridge.PROTOCOL, version: 1, kind: "request", request_id: "references-req-0002",
  method: "references.add", sent_at: "2026-08-25T10:00:00.000Z",
  client: { client_id: "references-test", name: "References Test", version: "1" },
  params: { references: [reference()] }
});
assert.equal(routed.error.code, "FORBIDDEN");
assert.deepEqual(routed.error.details, { reason: "bootstrap_locked", method: "references.add" });
assert.equal(routerForwarded, false, "bootstrap-locked references never reach the executor");

console.log("bridge references.add smoke tests: PASS");

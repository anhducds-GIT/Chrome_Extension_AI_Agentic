import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
context.globalThis = context;
vm.createContext(context);
vm.runInContext(fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8"), context);
const core = context.DacBridgeCore;
const etag = "sha256:current-ledger";
const fixtures = {
  "jobs.update": { job_id: "J-1", prompt: "updated", if_ledger_etag: etag },
  "jobs.remove": { job_id: "J-1", if_ledger_etag: etag },
  "jobs.reorder": { job_id: "J-1", position: 1, if_ledger_etag: etag },
  "output.configure": { image_pattern: "{job_id}", if_ledger_etag: etag },
  "run_settings.configure": { timeout_sec: 90, if_ledger_etag: etag }
};
for (const [method, params] of Object.entries(fixtures)) {
  const normalized = core.validateParams(method, params);
  assert.equal(normalized.if_ledger_etag, etag, `${method} preserves the optional etag`);
  const omitted = { ...params };
  delete omitted.if_ledger_etag;
  assert.equal(Object.hasOwn(core.validateParams(method, omitted), "if_ledger_etag"), false, `${method} keeps omitted-etag compatibility`);
}
assert.throws(() => core.validateParams("output.configure", { if_ledger_etag: etag }), /at least one output field/);
assert.throws(() => core.validateParams("run_settings.configure", { if_ledger_etag: etag }), /at least one run setting/);

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const transaction = source.slice(source.indexOf("async function executeBridgeDirectMutation"), source.indexOf("async function bridgeJobsAdd"));
assert.ok(transaction.indexOf("queueRunLock.tryBeginMutation()") < transaction.indexOf("const actualEtag = await currentLedgerEtag()"), "etag is checked after taking the mutation latch");
assert.ok(transaction.indexOf("const actualEtag = await currentLedgerEtag()") < transaction.indexOf("DacApprovalPersistence.execute"), "stale etag fails before mutation/audit/checkpoint transaction");
assert.match(transaction, /BridgeProtocolError\("PROPOSAL_CONFLICT"/);
for (const method of Object.keys(fixtures)) {
  const methodName = method.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(source, new RegExp(`method: "${methodName}"[^\n]*ifLedgerEtag: params\\.if_ledger_etag`), `${method} threads its etag to the transaction`);
}
for (const handlerName of ["bridgeOutputConfigure", "bridgeRunSettingsConfigure"]) {
  const start = source.indexOf(`async function ${handlerName}`);
  const end = source.indexOf("\n  async function", start + 20);
  const handler = source.slice(start, end);
  assert.match(handler, /delete values\.if_ledger_etag/);
  // The invariant: what gets applied is `values` (etag stripped) — never raw
  // `params`. bridgeOutputConfigure's mutate became block-bodied when the
  // Downloads-subfolder channel landed (2026-08-25), so match the apply call
  // rather than a one-liner arrow shape.
  if (handlerName === "bridgeOutputConfigure") {
    assert.match(handler, /applyArtifactNamingValues\(values\)/);
    assert.doesNotMatch(handler, /applyArtifactNamingValues\(params\)/, `${handlerName} must not persist or audit the etag precondition`);
  } else {
    assert.match(handler, /mutate: async \(\) => .*\(values\)/);
    assert.doesNotMatch(handler, /mutate: async \(\) => .*\(params\)/, `${handlerName} must not persist or audit the etag precondition`);
  }
}

console.log("bridge Tier-1 etag smoke tests: PASS");

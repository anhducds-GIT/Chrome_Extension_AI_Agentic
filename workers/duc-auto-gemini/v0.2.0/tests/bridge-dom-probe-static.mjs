// diagnostics.dom_probe: read-only remote eyes for the AI operator.
// Pins: registry shape, empty-params contract, executor wiring, and — most
// importantly — that the content-side probe path can never act on the page.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const bridge = globalThis.DacBridgeCore;
const panel = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8");
const content = fs.readFileSync(path.join(here, "..", "content.js"), "utf8");

// Registry: executor context, read-only, no approval.
const entry = bridge.METHOD_REGISTRY["diagnostics.dom_probe"];
assert.ok(entry, "diagnostics.dom_probe is registered");
assert.equal(entry.context, "executor");
assert.equal(entry.read_only, true, "the probe is a read-only method");
assert.equal(entry.approval, "none");
assert.deepEqual(bridge.POLICY.prohibited_methods, ["run.start", "run.pause", "run.resume"], "prohibited list unchanged");

// Params: empty object only; unknown fields rejected; undefined tolerated.
assert.deepEqual(bridge.validateParams("diagnostics.dom_probe", {}), {});
assert.deepEqual(bridge.validateParams("diagnostics.dom_probe", undefined), {});
assert.throws(() => bridge.validateParams("diagnostics.dom_probe", { click: true }), (error) => error.code === "INVALID_PARAMS", "unknown fields are rejected");

// Capabilities advertise it.
assert.ok(bridge.capabilities().methods.some((method) => method.name === "diagnostics.dom_probe"));

// Panel wiring: dispatch map + test hooks + forwards DAC_DOM_PROBE.
assert.match(panel, /"diagnostics\.dom_probe": withBridgeErrors\(bridgeDomProbe\)/);
assert.match(panel, /"diagnostics\.dom_probe": bridgeDomProbe,/, "test hooks expose the raw handler");
assert.match(panel, /send\(\{ type: "DAC_DOM_PROBE" \}\)/);

// Content-side purity: the probe block must never click, type, or move focus.
const probeStart = content.indexOf('if (message.type === "DAC_DOM_PROBE")');
assert.ok(probeStart > -1, "content script handles DAC_DOM_PROBE");
const probeEnd = content.indexOf('if (message.type === "DAC_ABORT")', probeStart);
const probeBlock = content.slice(probeStart, probeEnd);
for (const forbidden of [".click(", "execCommand", ".focus(", "dispatchEvent", "input.files", "DataTransfer"]) {
  assert.ok(!probeBlock.includes(forbidden), `probe path must not contain '${forbidden}'`);
}
assert.match(probeBlock, /64 \* 1024/, "payload cap is present");
assert.match(probeBlock, /truncated = true/, "truncation is recorded, not silent");
assert.match(probeBlock, /selectorCounts/, "adapter selector match counts are reported");
assert.match(probeBlock, /return false;/, "probe responds synchronously");

console.log("bridge dom-probe static: PASS");

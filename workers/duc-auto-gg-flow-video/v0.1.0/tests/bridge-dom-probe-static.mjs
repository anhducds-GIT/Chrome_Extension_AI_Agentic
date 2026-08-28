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
assert.match(content, /const FLOW_RUNTIME_CONTRACT = "flow04-image-video-create-scope-v1";/, "content runtime contract is a stable exact constant");
assert.match(probeBlock, /runtime_contract: FLOW_RUNTIME_CONTRACT/, "dom_probe returns the stable content runtime contract");
// The two halves of the fingerprint are useless if they can drift apart: the
// panel would happily accept a runtime that no longer means what it claims.
assert.equal(
  panel.match(/const REQUIRED_FLOW_RUNTIME_CONTRACT = "([^"]+)";/)?.[1],
  content.match(/const FLOW_RUNTIME_CONTRACT = "([^"]+)";/)?.[1],
  "side panel and content script pin the identical runtime contract string"
);
assert.match(probeBlock, /in_composer_form:/, "every reported visible button proves whether it belongs to the exact composer form");
assert.match(probeBlock, /chain: chainOf\(button\)/, "button ancestry evidence is read-only and included in dom_probe");

// Flow is a VIDEO product: the probe must scan <video> elements (added F-01,
// 2026-08-27 — the image-era probe was blind to them) and ship them in the
// payload, shrunk under the cap rather than dropped.
assert.match(probeBlock, /querySelectorAll\("video"\)/, "probe scans <video> elements");
assert.match(probeBlock, /selectorCounts, buttons, images, videos, textboxes, customTags, fileInputs/, "videos and textboxes ride in the probe payload");
assert.match(probeBlock, /probe\.videos = probe\.videos\.slice\(0, 5\)/, "videos participate in truncation");
// Live miss 27/08: the first [contenteditable][role=textbox] was NOT the box
// wired to Create. The probe must list every candidate text-entry surface so
// the operator picks from evidence instead of guessing.
assert.match(probeBlock, /querySelectorAll\('textarea, input\[type="text"\], \[contenteditable="true"\], \[role="textbox"\]'\)/, "probe scans all text-entry candidates");
assert.match(probeBlock, /probe\.textboxes = probe\.textboxes\.slice\(0, 5\)/, "textboxes participate in truncation");

console.log("bridge dom-probe static: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");

const tabs = [...html.matchAll(/class="workflow-tab(?: active)?" data-screen="([^"]+)"/g)].map((match) => match[1]);
assert.deepEqual(tabs, ["setupScreen", "runScreen", "outputScreen", "bridgeScreen"]);
assert.match(html, /data-screen="bridgeScreen"[^>]*>[\s\S]*?<span class="tab-num">4<\/span> BRIDGE<\/button>/);
const bridgeScreen = html.slice(html.indexOf('<section id="bridgeScreen"'), html.indexOf("<footer>"));
for (const id of ["bridgePairingCard", "bridgeHostReachable", "bridgePairingState", "bridgeLastActivity", "bridgeActivityList", "bridgeProposalCard"]) {
  assert.match(bridgeScreen, new RegExp(`id="${id}"`), `${id} lives under bridgeScreen`);
}
assert.doesNotMatch(html.slice(html.indexOf('<section id="setupScreen"'), html.indexOf('<section id="runScreen"')), /id="bridgePairingCard"/);
assert.doesNotMatch(html.slice(html.indexOf('<section id="runScreen"'), html.indexOf('<section id="outputScreen"')), /id="bridgeProposalCard"/);
assert.match(sidepanel, /if \(id === "bridgeScreen"\) refreshBridgeScreen\(\)/, "the fourth tab uses the existing workflow-tab wiring");
assert.match(sidepanel, /async function refreshBridgeScreen\(\)[\s\S]*?const ping = await bridgeSystemPing\(\)/, "connection status is sourced from bridgeSystemPing");
assert.match(sidepanel, /state\.bridgeActivity[\s\S]*?\.reverse\(\)/, "the passive direct-mutation activity feed renders newest first");
assert.match(css, /\.workflow-tabs[\s\S]*?grid-template-columns:\s*repeat\(4, 1fr\)/);

console.log("bridge tab static tests: PASS");

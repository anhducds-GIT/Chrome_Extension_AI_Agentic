import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const pairingPath = "C:\\WORKING ZONE\\Chrome Extension Bridge\\hnx-fetch\\hnx-fetch-bridge-pairing-v1.json";
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const script = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

assert.match(html, /class="bridge-pairing-path"/, "Bridge screen shows a dedicated pairing-path block");
assert.ok(html.includes(pairingPath), "Bridge screen shows its exact pairing JSON path");
assert.match(html, /id="bridge-pairing-path-copy"/, "Bridge screen exposes the one-click copy control");
const buttonStart = html.indexOf('<button id="bridge-pairing-path-copy"');
const buttonTag = html.slice(buttonStart, html.indexOf(">", buttonStart) + 1);
assert.ok(buttonTag.includes(`data-bridge-pairing-path="${pairingPath}"`), "copy control carries its own exact pairing path");
assert.match(script, /navigator\.clipboard\.writeText\(pairingPath\)/, "copy control writes the pairing path to the clipboard");
assert.match(script, /#bridge-pairing-path-copy"\)\.addEventListener\("click", \(\) => copyBridgePairingPath\(\$\("#bridge-pairing-path-copy"\)\)/, "copy control is wired to its click handler");
console.log("bridge-pairing-path-static: PASS");

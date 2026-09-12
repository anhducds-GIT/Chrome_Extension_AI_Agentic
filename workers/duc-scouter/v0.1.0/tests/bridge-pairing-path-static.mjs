import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const pairingPath = "C:\\WORKING ZONE\\Chrome Extension Bridge\\duc-scouter\\duc-scouter-bridge-pairing-v1.json";
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const script = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

assert.match(html, /class="bridge-pairing-path"/, "Bridge screen shows a dedicated pairing-path block");
assert.ok(html.includes(pairingPath), "Bridge screen shows its exact pairing JSON path");
assert.match(html, /id="bridge-pairing-path-copy"/, "Bridge screen exposes the one-click copy control");
const buttonStart = html.indexOf('<button id="bridge-pairing-path-copy"');
const buttonTag = html.slice(buttonStart, html.indexOf(">", buttonStart) + 1);
assert.ok(buttonTag.includes(`data-bridge-pairing-path="${pairingPath}"`), "copy control carries its own exact pairing path");
/* Duong di gio qua HAI chang, vi nut sao chep Profile ID (12/09) dung chung dung mot cho
 * sao chep — hai ban cua mot luat thi som muon hai nut cu xu khac nhau truoc mat nguoi dung.
 * Nen ghim CA HAI chang thay vi ghim mot cach viet: ban cu chi doi thay dung chuoi
 * `writeText(pairingPath)`, va no se DO oan cho mot ban refactor giu nguyen hanh vi — trong
 * khi van XANH cho mot ban goi writeText voi bien SAI. */
assert.match(script, /copyBridgePairingPath\(button\)\s*\{\s*await chepVaoBangNho\(button, button\?\.dataset\.bridgePairingPath \|\| ""\);/,
  "copy control hands its own exact pairing path to the shared clipboard helper");
assert.match(script, /async function chepVaoBangNho\(button, chuoi\)[\s\S]{0,400}?navigator\.clipboard\.writeText\(chuoi\)/,
  "the shared clipboard helper is what actually writes to the clipboard");
assert.match(script, /#bridge-pairing-path-copy"\)\.addEventListener\("click", \(\) => copyBridgePairingPath\(\$\("#bridge-pairing-path-copy"\)\)/, "copy control is wired to its click handler");
console.log("bridge-pairing-path-static: PASS");

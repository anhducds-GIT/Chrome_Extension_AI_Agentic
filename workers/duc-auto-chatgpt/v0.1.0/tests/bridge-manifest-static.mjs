import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const background = fs.readFileSync(new URL("background.js", root), "utf8");
const transport = fs.readFileSync(new URL("bridge-transport-loopback.js", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");

assert.equal(Number(manifest.minimum_chrome_version), 120);
assert.ok(manifest.permissions.includes("alarms"));
assert.ok(manifest.host_permissions.includes("http://127.0.0.1/*"));
assert.equal(manifest.permissions.includes("debugger"), false);
assert.equal(manifest.host_permissions.some((value) => value.includes("<all_urls>") || value.includes("0.0.0.0")), false);
assert.match(background, /^importScripts\("bridge-core\.js", "bridge-pairing-core\.js", "bridge-router-core\.js", "bridge-workspace-core\.js", "bridge-transport-loopback\.js"\);/);
assert.match(transport, /KEEPALIVE_MS = 20000/);
assert.match(transport, /periodInMinutes: 0\.5/);
assert.match(transport, /type: "auth", role: "extension", token: pairing\.token/);
assert.doesNotMatch(transport, /new WebSocketApi\([^\n]*token|protocols?:[^\n]*token/i, "token is absent from URL and subprotocol");
assert.match(sidepanel, /DacBridgePairingCore\.parse\(await file\.text\(\)\)/);
assert.match(sidepanel, /DAC_BRIDGE_RPC_RESPONSE/);
assert.match(html, />Kết nối Agent Bridge</);
assert.ok(html.indexOf('src="bridge-pairing-core.js"') < html.indexOf('src="sidepanel.js"'));

console.log("bridge manifest static tests: PASS");

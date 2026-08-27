import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const background = fs.readFileSync(new URL("background.js", root), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const readme = fs.readFileSync(new URL("README.md", root), "utf8");
const installer = fs.readFileSync(new URL("scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1", root), "utf8");
const cli = fs.readFileSync(new URL("duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs", root), "utf8");

assert.equal(Object.hasOwn(manifest, "externally_connectable"), false);
assert.deepEqual(manifest.host_permissions.filter((value) => value.startsWith("http://")), ["http://127.0.0.1/*"]);
assert.doesNotMatch(background, /onMessageExternal|job\.submit|job\.abort|DAC_RUN_PROMPT|dac\.terminal_jobs/);
assert.match(background, /DAC_DOWNLOAD_IMAGE/, "the private generated-image download path survives migration");
assert.equal(fs.existsSync(new URL("worker-api-test.html", root)), false);
assert.equal(fs.existsSync(new URL("start-worker-api-test.bat", root)), false);
assert.match(installer, /bridge-cli\.mjs/);
assert.match(cli, /validatePairing/);
assert.match(cli, /pairing\.http_url/);
assert.doesNotMatch(cli, /run\.start|run\.pause|run\.resume/);
assert.match(readme, /Agent Bridge V1/);
assert.match(readme, /không bắt đầu Run|không tự chạy/i);
assert.match(readme, /RotateToken/);
assert.match(readme, /Uninstall-DucAutoChatGPTLoopbackBridgeV1/);

console.log("bridge migration closure smoke tests: PASS");

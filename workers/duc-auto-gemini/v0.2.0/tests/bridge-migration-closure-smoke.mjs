import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const background = fs.readFileSync(new URL("background.js", root), "utf8");
const manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", root), "utf8"));
const readme = fs.readFileSync(new URL("README.md", root), "utf8");
const installer = fs.readFileSync(new URL("scripts/Install-DucAutoGeminiBridgeV1.ps1", root), "utf8");
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
/* Ý đồ giữ nguyên: README phải khai lệnh xoá Bridge. Chỉ đổi TÊN script cho đúng gói —
   03/09 phát hiện README của gói này là bản chép từ gói ChatGPT nên khai tên script sai.

   BẰNG CHỨNG cho việc bản Gemini mới là bản đúng, đo 03/09:
     Install-DucAutoGeminiBridgeV1.ps1            cổng 32148 · gốc .../duc-auto-gemini
     Install-DucAutoChatGPTLoopbackBridgeV1.ps1   cổng 32147 · gốc %LOCALAPPDATA%/DucAutoChatGPT
   Gói ChatGPT THẬT cũng dùng 32147. Nên bản ChatGPT nằm trong gói này là đồ thừa lúc fork,
   và chạy nó là ĐÂM CỔNG với Bridge của gói ChatGPT. Xoá file cần Đức chốt (G-13). */
assert.match(readme, /Uninstall-DucAutoGeminiBridgeV1/,
  "README phai khai lenh xoa Bridge cua CHINH goi nay");

/* Và một khẳng định MỚI, mạnh hơn bản cũ — bản cũ chỉ đòi README nhắc MỘT tên script, nên
   nó vẫn xanh khi README chỉ dẫn Đức chạy đúng cái script gây đâm cổng. Nay cấm hẳn:
   README của gói này KHÔNG được bảo người đọc chạy script của gói ChatGPT. */
assert.doesNotMatch(readme, /(Install|Uninstall)-DucAutoChatGPTLoopbackBridgeV1/,
  "README goi Gemini KHONG duoc chi Duc chay script cua goi ChatGPT — hai script khac cong,"
  + " chay nham la dung Bridge o cho extension khong tim toi");

console.log("bridge migration closure smoke tests: PASS");

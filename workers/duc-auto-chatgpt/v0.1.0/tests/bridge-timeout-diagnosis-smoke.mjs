/* B-50 / B-58 — MỘT LƯỢT HẾT GIỜ PHẢI NÓI RA MÌNH LÀ LOẠI NÀO.
 *
 * Đo live 11/09: panel trả lời cửa router trong **166 ms** trong khi cửa executor hết giờ
 * **11/11** lượt suốt hơn 10 phút. Ba chuyện rất khác nhau — extension rụng giữa chừng ·
 * panel đang bận · executor kẹt hẳn — đều hiện ra là **cùng một chữ** `REQUEST_TIMEOUT` với
 * `details` rỗng, nên người ngoài chỉ còn nước ngồi đợi một thứ không bao giờ tự khỏi.
 *
 * Tệp này lái HOST THẬT (`createBridgeHost`) với một extension giả, và đòi câu lỗi phân biệt
 * được hai ca. Không mô phỏng lại logic; nếu host đổi cách nghĩ thì mép này đỏ.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { createBridgeHost } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs";
import { createFrameDecoder, encodeFrame } from "../duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs";

let passed = 0;
const ok = (ten) => { passed += 1; console.log(`  ok  ${ten}`); };

async function congTrong() {
  const s = http.createServer();
  await new Promise((r) => s.listen(0, "127.0.0.1", r));
  const p = s.address().port;
  await new Promise((r) => s.close(r));
  return p;
}

/* Extension giả: bắt tay, xác thực, rồi **không bao giờ** trả lời một lượt rpc nào.
   `keepalive` thì vẫn gửi nếu được bảo — đó đúng là chữ ký của "executor kẹt": đường
   truyền sống, người ở đầu kia im. */
function noiSocket(port) {
  return new Promise((resolve, reject) => {
    const key = crypto.randomBytes(16).toString("base64");
    const req = http.request({
      host: "127.0.0.1", port, path: "/v1/extension",
      headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13",
        "Sec-WebSocket-Key": key, Origin: `chrome-extension://${"a".repeat(32)}` }
    });
    req.on("upgrade", (_res, socket, head) => {
      const decoder = createFrameDecoder();
      const hangCho = [];
      const doi = [];
      const nhan = (v) => { if (doi.length) doi.shift()(v); else hangCho.push(v); };
      const an = (c) => { for (const f of decoder.push(c)) if (f.opcode === 0x1) nhan(JSON.parse(f.text)); };
      socket.on("data", an);
      if (head?.length) an(head);
      resolve({
        socket,
        gui: (v) => socket.write(encodeFrame(JSON.stringify(v), { masked: true })),
        ke: (ms = 2000) => hangCho.length
          ? Promise.resolve(hangCho.shift())
          : new Promise((res, rej) => {
            const t = setTimeout(() => rej(new Error("chờ khung của host quá lâu")), ms);
            doi.push((v) => { clearTimeout(t); res(v); });
          })
      });
    });
    req.on("error", reject);
    req.end();
  });
}

/* Extension giả ĐI TRỌN BẮT TAY THẬT — thách đố, nhận chứng minh, rồi xác thực — nhưng sau
   đó **không bao giờ** trả lời một lượt `rpc` nào. Đường truyền sống, người ở đầu kia im:
   đó đúng là chữ ký của "executor kẹt" đo được sáng 11/09. */
async function extensionGia(port, token, { instanceId, label }) {
  const e = await noiSocket(port);
  e.gui({ type: "auth_challenge", role: "extension", nonce: crypto.randomBytes(32).toString("base64url") });
  const proof = await e.ke();
  assert.equal(proof.type, "auth_proof", "host phải chứng minh nó biết token trước khi nhận token");
  e.gui({ type: "auth", role: "extension", token,
    instance: { schema_version: 1, instance_id: instanceId, label, worker: "duc-auto-chatgpt", extension_version: "0.1.0" } });
  const okAuth = await e.ke();
  assert.equal(okAuth.type, "auth_ok", "extension giả phải vào được ghế, nếu không cả tệp này không đo gì");
  return e;
}

/* LUÔN khai `target`. Không khai thì khi có hai phiên cùng nối, host trả TARGET_AMBIGUOUS
   (đúng luật fail-closed của nó) — và một phép kiểm chỉ đòi "khác EXECUTOR_STUCK" sẽ XANH VÌ LÝ
   DO SAI, không bao giờ chạm tới đường nó định đo. Đã dính đúng bẫy này một lần ở ca ⓒ. */
function goiRpc(port, token, method, target) {
  return new Promise((resolve, reject) => {
    const than = JSON.stringify({
      protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "request",
      request_id: `thu-het-gio-${crypto.randomUUID()}`, method, params: {},
      target, client_id: "thu", issued_at: new Date().toISOString()
    });
    const req = http.request({
      host: "127.0.0.1", port, path: "/v1/rpc", method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(than) }
    }, (res) => {
      let b = ""; res.on("data", (c) => { b += c; }); res.on("end", () => resolve(JSON.parse(b)));
    });
    req.on("error", reject);
    req.end(than);
  });
}

const port = await congTrong();
const token = crypto.randomBytes(32).toString("base64url");
const host = createBridgeHost({
  pairing: { schema_version: 1, host: "127.0.0.1", port, token,
    http_url: `http://127.0.0.1:${port}/v1/rpc`, websocket_url: `ws://127.0.0.1:${port}/v1/extension`,
    created_at: new Date().toISOString() },
  requestTimeoutMs: 600
});
await host.start();

try {
  /* ---- ⓐ EXECUTOR KẸT: đường truyền sống, không ai trả lời ------------------
     Đây đúng cảnh sáng 11/09 và là ca chịu tải: người ngoài PHẢI đọc ra rằng chờ thêm
     không giúp gì, và việc cần làm là mở lại side panel. */
  const ext = await extensionGia(port, token, { instanceId: "a".repeat(16), label: "ket" });
  /* Nhịp `keepalive` GIỮA quãng chờ — đây chính là thứ dựng lại cảnh sáng 11/09: host vẫn
     nhận khung từ extension (nên `bridge.sessions` báo "thấy 9 giây trước") trong khi mọi
     lượt gọi executor im hoàn toàn. Không có nhịp này thì ca ⓐ không khác gì ca ⓓ. */
  const nhip = setInterval(() => ext.gui({ type: "keepalive" }), 150);
  const r = await goiRpc(port, token, "run.status", "ket");
  clearInterval(nhip);

  assert.equal(r.ok, false);
  assert.equal(r.error.code, "REQUEST_TIMEOUT", "vẫn là REQUEST_TIMEOUT — không đổi mã, chỉ thêm chẩn đoán");
  const d = r.error.details;
  assert.equal(d.diagnosis, "EXECUTOR_STUCK", "đường truyền sống mà không trả lời = executor kẹt");
  assert.equal(d.target_connected, true);
  assert.equal(d.heard_during_wait, true, "phải khai ĐÃ NGHE THẤY trong lúc chờ — đó là neo của cả phép phân loại");
  assert.equal(typeof d.last_seen_ms_ago, "number", "phải nêu ĐÃ IM BAO LÂU, không chỉ nói còn nối");
  assert.ok(d.last_seen_ms_ago <= 600, `mốc im phải đọc LÚC HẾT GIỜ, không phải lúc gửi (được ${d.last_seen_ms_ago})`);
  assert.equal(d.waited_ms, 600, "phải nêu đã chờ bao lâu — nếu không thì con số im kia vô nghĩa");
  assert.match(d.remedy, /REOPEN the side panel/i, "phải chỉ đúng một việc, không bắt người đoán");
  assert.match(d.remedy, /Waiting does not clear this/i, "và phải nói thẳng rằng chờ thêm KHÔNG chữa được");
  ok("ⓐ executor kẹt (còn nhịp keepalive): nói đúng bệnh và bảo mở lại panel");

  /* ---- ⓑ CHIỀU NGƯỢC — bản cũ trả `details` RỖNG ---------------------------
     Không có mép này thì ⓐ chỉ ghim lại chính bản vá của tôi, không ghim lỗi đã xảy ra. */
  assert.notDeepEqual(d, {}, "bản cũ trả details rỗng — đó là lỗi mép trên bắt được");
  assert.ok(Object.keys(d).length >= 5, `phải mang đủ số liệu để phân loại, đang có ${Object.keys(d).length}`);
  ok("ⓑ chiều ngược: details rỗng là thứ bản cũ trả, nay không còn");

  /* ---- ⓒ EXTENSION RỤNG GIỮA CHỪNG — phải là chẩn đoán KHÁC ----------------
     Một chẩn đoán nói sai bệnh còn tệ hơn không chẩn đoán. Cắt đường truyền ngay sau khi
     lượt gọi đã vào hàng đợi, rồi đòi host phân loại khác hẳn ca ⓐ. */
  const ext2 = await extensionGia(port, token, { instanceId: "b".repeat(16), label: "rung" });
  const chay = goiRpc(port, token, "run.status", "rung");
  setTimeout(() => ext2.socket.destroy(), 120);
  const r2 = await chay;
  assert.equal(r2.ok, false);
  /* Host có thể đóng sổ ngay bằng TRANSPORT_DISCONNECTED — đó là đường TỐT HƠN và vẫn là
     một chẩn đoán khác hẳn. Chấp nhận cả hai, nhưng KHÔNG chấp nhận EXECUTOR_STUCK. */
  const ma = r2.error.code === "REQUEST_TIMEOUT" ? r2.error.details.diagnosis : r2.error.code;
  assert.notEqual(ma, "EXECUTOR_STUCK", "rụng đường truyền KHÔNG được đọc thành executor kẹt");
  ok(`ⓒ đường truyền rụng cho ra chẩn đoán khác: ${ma}`);

  /* ---- ⓓ IM HẲN — khác ⓐ, và đây là mép PHÂN BIỆT của cả tệp -----------------
     Cùng một extension còn nối, cùng một lượt hết giờ; khác nhau ĐÚNG MỘT điều: lần này nó
     không gửi gì trong lúc chờ. Nếu hai ca cho cùng một chẩn đoán thì trường `diagnosis`
     không mang thông tin nào, và cả bản vá này vô nghĩa. */
  const ext3 = await extensionGia(port, token, { instanceId: "c".repeat(16), label: "im" });
  const r3 = await goiRpc(port, token, "run.status", "im");
  assert.equal(r3.error.code, "REQUEST_TIMEOUT");
  assert.equal(r3.error.details.heard_during_wait, false, "không gửi gì thì phải khai là không nghe thấy gì");
  assert.equal(r3.error.details.diagnosis, "PANEL_SILENT");
  assert.notEqual(r3.error.details.diagnosis, d.diagnosis,
    "im hẳn và executor kẹt PHẢI ra hai chẩn đoán khác nhau — nếu trùng thì trường này vô dụng");
  /* Và phải tự khai giới hạn của chính nó: chờ ngắn hơn nhịp keepalive thì không kết luận
     được. Một chẩn đoán không nói ra điểm mù của nó sẽ bị đọc quá. */
  assert.match(r3.error.details.remedy, /keepalive/i, "phải tự khai điểm mù: chờ ngắn hơn nhịp keepalive thì chưa chắc");
  ext3.socket.destroy();
  ok("ⓓ im hẳn ra chẩn đoán KHÁC, và câu chữa tự khai điểm mù của nó");

  ext.socket.destroy();
} finally {
  await host.stop();
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

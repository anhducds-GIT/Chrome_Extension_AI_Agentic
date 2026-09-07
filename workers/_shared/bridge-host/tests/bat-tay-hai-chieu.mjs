/* bat-tay-hai-chieu.mjs — ghim CHỐT AN TOÀN ĐÁNG GIÁ NHẤT của lõi, bằng một lượt nối THẬT.
 *
 * ══ VÌ SAO FILE NÀY PHẢI TỒN TẠI ══
 *
 * Bắt tay hai chiều là **11 dòng mà `duc-auto-gemini` và `duc-auto-gg-flow-video` không có** —
 * một bản vá làm ở một bản chép và không bao giờ tới hai bản kia. Nó là lý do chính khiến lõi
 * được tách ra dùng chung.
 *
 * Vậy mà sau lượt tách 07/09, **nó không có phép ghim hành vi nào.** Phát hiện ra không phải
 * nhờ đọc lại: bộ đo đột biến báo ba mỏ neo hỏng (chốt đã chuyển file), tôi đi sửa mỏ neo và
 * thấy con canh cái bắt tay sẽ **sống sót** — vì không có gì đỏ khi gỡ nó. Một chốt không có
 * test ghim thì nó chỉ là bình luận.
 *
 * ══ CÁI BẮT TAY LÀM GÌ ══
 *
 * Không có nó: extension mở socket rồi **đưa token ra ngay** cho bất cứ ai đang nghe đúng cổng.
 * Trên loopback, "bất cứ ai" gồm mọi tiến trình đang chạy trên máy — một tiến trình chiếm được
 * cổng trước là lấy được token.
 *
 * Có nó: extension gửi một `nonce` ngẫu nhiên, và **máy chủ phải trả lại HMAC của nonce đó bằng
 * chính token**. Kẻ không biết token không tạo được bằng chứng, nên extension không bao giờ đưa
 * token cho nó.
 *
 * Nối THẬT bằng socket trần, không giả lập: cái bắt tay sống ở tầng khung WebSocket, và một bản
 * giả lập ở tầng trên sẽ ghim đúng phần không cần ghim.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import net from "node:net";
import { createBridgeHostCore, hostProof } from "../bridge-host-core.mjs";
import { createFrameDecoder, encodeFrame } from "../websocket-core.mjs";

const TOKEN = crypto.randomBytes(32).toString("base64url");
const CONG = 39931;
const pairing = {
  schema_version: 1, host: "127.0.0.1", port: CONG,
  http_url: `http://127.0.0.1:${CONG}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${CONG}/v1/extension`,
  token: TOKEN
};

/* Origin của một extension Chrome thật: 32 chữ cái a–p. Lõi từ chối mọi thứ khác ở cửa nâng cấp
 * giao thức, nên sai chỗ này thì không vào nổi tới cái bắt tay. */
const ORIGIN = "chrome-extension://" + "abcdefghijklmnop".repeat(2);

const may = createBridgeHostCore({ pairing, protocol: "duc-scouter.bridge" });
await may.start();

/* Một extension GIẢ, nói đúng giao thức ở tầng khung. `masked: true` là bắt buộc: lõi dựng bộ
 * giải mã với `requireMasked: true`, đúng chuẩn — khung từ client mà không che là khung sai. */
function moKetNoi() {
  return new Promise((ok, no) => {
    const socket = net.connect(CONG, "127.0.0.1", () => {
      socket.write([
        "GET /v1/extension HTTP/1.1",
        `Host: 127.0.0.1:${CONG}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Origin: ${ORIGIN}`,
        "Sec-WebSocket-Key: " + crypto.randomBytes(16).toString("base64"),
        "Sec-WebSocket-Version: 13",
        "\r\n"
      ].join("\r\n"));
    });

    const decoder = createFrameDecoder({ maxPayloadBytes: 1 << 20, requireMasked: false });
    const nhan = [];
    let doiCho = null;
    let daNangCap = false;
    let dongRoi = false;

    socket.on("data", (chunk) => {
      let phanKhung = chunk;
      if (!daNangCap) {
        const vt = chunk.indexOf("\r\n\r\n");
        if (vt < 0) return;
        const dau = chunk.subarray(0, vt).toString("utf8");
        if (!/^HTTP\/1\.1 101 /.test(dau)) { no(new Error("khong nang cap duoc: " + dau.split("\r\n")[0])); return; }
        daNangCap = true;
        phanKhung = chunk.subarray(vt + 4);
        ok(api);
        if (!phanKhung.length) return;
      }
      for (const khung of decoder.push(phanKhung)) {
        if (khung.opcode === 0x8) { dongRoi = true; continue; }
        if (khung.opcode !== 0x1) continue;
        nhan.push(JSON.parse(khung.text));
      }
      if (doiCho) { const f = doiCho; doiCho = null; f(); }
    });
    socket.on("close", () => { dongRoi = true; if (doiCho) { const f = doiCho; doiCho = null; f(); } });
    socket.on("error", () => { dongRoi = true; });

    const api = {
      gui: (v) => socket.write(encodeFrame(JSON.stringify(v), { masked: true })),
      /* Chờ MỘT nhịp: hoặc có tin mới, hoặc socket đóng, hoặc hết 700ms. Đóng cũng là một câu
       * trả lời — với cái bắt tay, "im lặng rồi đóng" CHÍNH LÀ câu trả lời đúng. */
      cho: () => new Promise((xong) => {
        if (nhan.length || dongRoi) return xong();
        doiCho = xong;
        setTimeout(() => { if (doiCho) { doiCho = null; xong(); } }, 700);
      }),
      lay: () => nhan.shift() ?? null,
      daDong: () => dongRoi,
      dong: () => socket.destroy()
    };
  });
}

const nonceMoi = () => crypto.randomBytes(32).toString("base64url");

try {
  /* ---- ① ĐƯA TOKEN RA NGAY MÀ KHÔNG BẮT TAY → BỊ TỪ CHỐI ------------------
   * Đây là hành vi của hai gói `duc-auto-gemini` / `duc-auto-gg-flow-video` tới hôm nay. Lõi này
   * PHẢI từ chối nó — nếu nhận, cái bắt tay chỉ là trang trí vì kẻ tấn công cứ bỏ qua bước đó. */
  {
    const c = await moKetNoi();
    c.gui({ type: "auth", role: "extension", token: TOKEN });
    await c.cho();
    assert.equal(c.lay(), null, "khong duoc tra auth_ok cho mot luot KHONG bat tay");
    assert.equal(c.daDong(), true, "phai dong ket noi");
    c.dong();
  }

  /* ---- ② MÁY CHỦ PHẢI CHỨNG MINH NÓ BIẾT TOKEN ---------------------------
   * Bằng chứng phải là HMAC của ĐÚNG nonce vừa gửi. Một máy chủ trả bừa, hoặc trả HMAC của một
   * nonce cũ, đều không qua được — đó là toàn bộ giá trị của bước này. */
  {
    const c = await moKetNoi();
    const nonce = nonceMoi();
    c.gui({ type: "auth_challenge", role: "extension", nonce });
    await c.cho();
    const tin = c.lay();
    assert.equal(tin?.type, "auth_proof", "phai tra ve auth_proof");
    assert.equal(tin.proof, hostProof(TOKEN, nonce), "bang chung phai la HMAC cua DUNG nonce vua gui");
    assert.notEqual(tin.proof, hostProof(TOKEN, nonceMoi()), "bang chung khong duoc dung cho nonce khac");
    c.dong();
  }

  /* ---- ③ BẮT TAY XONG NHƯNG TOKEN SAI → VẪN TỪ CHỐI ----------------------
   * Bắt tay chứng minh MÁY CHỦ; nó không thay việc extension phải chứng minh chính nó. Mất chốt
   * này thì ai bắt tay được cũng vào được. */
  {
    const c = await moKetNoi();
    const nonce = nonceMoi();
    c.gui({ type: "auth_challenge", role: "extension", nonce });
    await c.cho();
    assert.equal(c.lay()?.type, "auth_proof");
    c.gui({ type: "auth", role: "extension", token: crypto.randomBytes(32).toString("base64url") });
    await c.cho();
    assert.equal(c.lay(), null, "token sai ma van cho vao");
    assert.equal(c.daDong(), true);
    c.dong();
  }

  /* ---- ④ ĐÚNG TRÌNH TỰ → VÀO ĐƯỢC ---------------------------------------
   * Chốt phải HẸP. Một cái chặn từ chối cả đường đúng sẽ bị người ta gỡ, và lúc đó mất luôn ba
   * khối trên. */
  {
    const c = await moKetNoi();
    const nonce = nonceMoi();
    c.gui({ type: "auth_challenge", role: "extension", nonce });
    await c.cho();
    assert.equal(c.lay()?.type, "auth_proof");
    c.gui({ type: "auth", role: "extension", token: TOKEN, instance: { schema_version: 1, instance_id: "pin-12345678", label: "ghim" } });
    await c.cho();
    const ok = c.lay();
    assert.equal(ok?.type, "auth_ok", "trinh tu dung ma van bi chan");
    assert.match(String(ok.session_id), /^[0-9a-f-]{36}$/);
    assert.equal(may.sessionCount(), 1, "may chu phai ghi nhan mot phien dang noi");
    c.dong();
  }

  /* ---- ⑤ NONCE PHẢI ĐÚNG HÌNH — rác không được thành một lượt bắt tay ----- */
  {
    for (const xau of ["", "ngan", "x".repeat(44), "co khoang trang de day day day day day"]) {
      const c = await moKetNoi();
      c.gui({ type: "auth_challenge", role: "extension", nonce: xau });
      await c.cho();
      assert.equal(c.lay(), null, `nonce xau '${xau.slice(0, 12)}' khong duoc nhan bang chung`);
      assert.equal(c.daDong(), true, "nonce xau thi phai dong");
      c.dong();
    }
  }
} finally {
  await may.stop();
}

console.log("bat-tay-hai-chieu: PASS (5 khoi, noi that qua socket)");

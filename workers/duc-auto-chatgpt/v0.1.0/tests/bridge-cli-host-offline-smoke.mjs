/* CẦU NỐI CHƯA CHẠY THÌ CÔNG CỤ PHẢI NÓI RA LÀ THẾ.
 *
 * Sinh ra từ một lượt thật 11/09: tiến trình host tắt, và `bridge-cli.mjs` in đúng hai chữ
 * `fetch failed` — câu của Node cho một cổng đóng. Hai chữ đó đọc **y như một lỗi trong mã**,
 * nên tôi đi kiểm nhầm chỗ mấy lượt trước khi nhận ra chỉ là tiến trình chưa bật.
 *
 * Cùng họ với `B-58`: cửa BIẾT chuyện gì xảy ra nhưng trả ra một câu không ai dùng được.
 *
 * Tệp ghép cặp ở đây là ĐỒ GIẢ hoàn toàn: cổng 59999 (không phải 32147 của máy Đức) và token
 * **sinh ngẫu nhiên lúc chạy**, không gõ cứng vào repo — repo này CÔNG KHAI, và một chuỗi
 * trông giống token nằm trong mã nguồn là thứ không nên có kể cả khi nó vô hại.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { main } from "../duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs";

let passed = 0;
const ok = (ten) => { passed += 1; console.log(`  ok  ${ten}`); };

/* Cổng 59999 KHÔNG có ai nghe — đó chính là điều kiện cần đo. Nếu một ngày nào đó nó có
   người nghe, phép kiểm này sẽ đỏ, và đỏ là đúng: nó không còn đo cái nó định đo. */
const CONG_CHET = 59999;
const tep = path.join(os.tmpdir(), `pair-gia-${crypto.randomUUID()}.json`);
fs.writeFileSync(tep, JSON.stringify({
  schema_version: 1,
  host: "127.0.0.1",
  port: CONG_CHET,
  http_url: `http://127.0.0.1:${CONG_CHET}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${CONG_CHET}/v1/extension`,
  token: crypto.randomBytes(32).toString("base64url"),
  created_at: new Date().toISOString()
}));

try {
  let loi = null;
  try {
    await main(["run-status", "--pairing", tep, "--request-id", "thu-cong-dong-1"],
      { stdout: { write() {} }, stderr: { write() {} }, fetch: globalThis.fetch });
  } catch (e) { loi = e; }

  assert.ok(loi, "cổng đóng mà lệnh không ném gì — bên gọi sẽ tưởng nó chạy được");
  const cau = String(loi.message);

  /* Bốn điều câu lỗi phải nói, và mỗi điều đóng một cách hiểu sai đã xảy ra thật. */
  assert.match(cau, /KHONG_NOI_DUOC_CAU_NOI/, "phải có một mã đọc được bằng máy");
  assert.match(cau, /START-BRIDGE/, "phải chỉ ĐÚNG MỘT lệnh chữa, không bắt người đi đoán");
  assert.match(cau, /chưa có gì được gửi/, "phải nói rõ chưa gửi gì — nếu không, người ta sẽ sợ trùng lặp mà không dám chạy lại");
  assert.match(cau, new RegExp(String(CONG_CHET)), "phải nêu địa chỉ đã thử, để phân biệt sai cổng với chưa bật");
  assert.doesNotMatch(cau, /^fetch failed$/m, "không được để nguyên câu trần của Node");
  ok("cổng đóng → nói đúng bệnh, nêu địa chỉ, chỉ một lệnh chữa, và khai là chưa gửi gì");

  /* CHIỀU NGƯỢC — bản cũ (không bắt) để lọt đúng cảnh này: nó ném thẳng `fetch failed`.
     Không có mép này thì phép kiểm trên chỉ ghim lại chính bản vá của tôi, không ghim lỗi. */
  const cu = async () => { await fetch(`http://127.0.0.1:${CONG_CHET}/v1/rpc`, { method: "POST" }); };
  let loiCu = null;
  try { await cu(); } catch (e) { loiCu = e; }
  assert.ok(loiCu, "đối chứng: cổng này phải thật sự đóng, nếu không cả tệp không đo gì");
  assert.match(String(loiCu.message), /fetch failed/i,
    "bản cũ thật sự chỉ nói 'fetch failed' — đây là lỗi mép trên bắt được");
  ok("chiều ngược: không vá thì câu lỗi đúng là hai chữ vô dụng");

  /* Lỗi KHÁC không được nuốt thành 'cầu nối chưa chạy'. Một chẩn đoán nói sai bệnh còn tệ
     hơn không chẩn đoán — đó là nguyên văn bài học của `WRONG_SURFACE` trong gói này. */
  let loiLa = null;
  try {
    await main(["run-status", "--pairing", tep, "--request-id", "thu-loi-la-1"],
      { stdout: { write() {} }, stderr: { write() {} },
        fetch: async () => { throw new Error("BOOM_KHONG_PHAI_MANG"); } });
  } catch (e) { loiLa = e; }
  assert.ok(loiLa, "lỗi lạ vẫn phải nổi lên");
  assert.match(String(loiLa.message), /BOOM_KHONG_PHAI_MANG/,
    "lỗi không thuộc họ mạng phải đi qua nguyên vẹn, không bị đọc thành 'chưa bật cầu nối'");
  ok("lỗi lạ không bị nuốt thành chẩn đoán sai");
} finally {
  try { fs.unlinkSync(tep); } catch { /* đã mất thì thôi */ }
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

/* tuong-duong-voi-ban-goc.mjs — LÕI TÁCH RA PHẢI CƯ XỬ Y HỆT BẢN GỐC.
 *
 * Đây là phép ghim đúng loại cho một lượt TÁCH LÕI. Một suite thường chỉ trả lời "code mới có
 * chạy không"; câu hỏi thật ở đây là **"tách ra có làm rơi mất hành vi nào không"** — và cách
 * duy nhất trả lời là hỏi cả hai bản cùng một câu rồi so đáp án.
 *
 * Bản gốc lấy từ `workers/duc-auto-chatgpt/…` — gói ĐÃ ĐÓNG BĂNG. File này chỉ ĐỌC nó, đúng
 * luật mục 1. Và đóng băng lại là điều làm nó thành một cái mốc tốt: nó không đổi nữa, nên
 * lệch nhau bao giờ cũng là lỗi của bản mới.
 *
 * KHÔNG so `protocol`: đó là thứ CỐ Ý khác (bản gốc gõ cứng tên một sản phẩm, lõi mới nhận qua
 * tham số). Mọi thứ khác phải khớp từng ký tự.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAN_GOC = path.resolve(HERE, "..", "..", "..",
  "duc-auto-chatgpt", "v0.1.0", "duc-auto-chatgpt-loopback-bridge-host-v1", "bridge-host.mjs");

const goc = await import(`file://${BAN_GOC.split(path.sep).join("/")}`);
const moi = await import("../bridge-host-core.mjs");

const TOKEN = crypto.randomBytes(32).toString("base64url");
const ghepCap = (port = 32151) => ({
  schema_version: 1, host: "127.0.0.1", port,
  http_url: `http://127.0.0.1:${port}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${port}/v1/extension`,
  token: TOKEN
});

/* Hỏi cả hai bản cùng một câu. Cả hai NÉM thì so câu ném; cả hai TRẢ thì so giá trị. Một bên
 * ném một bên trả là lệch — và đó chính là loại lệch âm thầm mà lượt tách lõi hay đẻ ra. */
function soSanh(ten, chay) {
  let a, b, loiA = null, loiB = null;
  try { a = chay(goc); } catch (e) { loiA = String(e.message); }
  try { b = chay(moi); } catch (e) { loiB = String(e.message); }
  assert.equal(loiA === null, loiB === null, `${ten}: mot ben nem mot ben khong — goc=${loiA} moi=${loiB}`);
  if (loiA !== null) assert.equal(loiB, loiA, `${ten}: hai ben nem hai cau khac nhau`);
  else assert.deepEqual(b, a, `${ten}: hai ben tra ve khac nhau`);
}

/* ---- ① `validatePairing` — cửa vào của mọi thứ --------------------------- */
{
  const caThu = [
    ["hop le", ghepCap()],
    ["thieu schema", { ...ghepCap(), schema_version: 2 }],
    ["host la ten mien", { ...ghepCap(), host: "localhost" }],
    ["cong qua thap", { ...ghepCap(), port: 80 }],
    ["cong khong nguyen", { ...ghepCap(), port: 3.5 }],
    ["token ngan", { ...ghepCap(), token: "qua-ngan" }],
    ["token co ky tu la", { ...ghepCap(), token: TOKEN.slice(0, 42) + "!" }],
    ["url khong khop cong", { ...ghepCap(), http_url: "http://127.0.0.1:9999/v1/rpc" }],
    ["ws url sai duong", { ...ghepCap(), websocket_url: "ws://127.0.0.1:32151/v1/khac" }],
    ["khong phai object", "chuoi"],
    ["mang", []],
    ["null", null]
  ];
  for (const [ten, dauVao] of caThu) soSanh(`validatePairing / ${ten}`, (m) => m.validatePairing(dauVao));
}

/* ---- ② `parseInstance` — dữ liệu định tuyến, và nó fail-closed ----------
 * Chỗ tinh nhất của cả file gốc: cắt nhãn theo trần TRƯỚC khi quét, bỏ ký tự điều khiển C1, rồi
 * quét nốt nửa cặp thay thế lạc mà chính lượt cắt vừa tạo ra. Viết lại bằng tay là chỗ dễ rơi
 * mất một trong ba bước nhất — và rơi bước nào cũng không ai thấy cho tới lúc có nhãn lạ. */
{
  const dk = (n) => String.fromCharCode(n);
  const caThu = [
    ["vang mat", undefined],
    ["null", null],
    ["hop le", { schema_version: 1, instance_id: "abc-12345678", label: "Ho so chinh" }],
    ["thieu schema", { instance_id: "abc-12345678" }],
    ["id qua ngan", { schema_version: 1, instance_id: "abc" }],
    ["id co ky tu la", { schema_version: 1, instance_id: "abc_1234567890" }],
    ["id dai qua tran", { schema_version: 1, instance_id: "a".repeat(65) }],
    ["nhan co ky tu dieu khien", { schema_version: 1, instance_id: "abc-12345678", label: `A${dk(0)}B${dk(31)}C${dk(127)}D${dk(159)}E` }],
    ["nhan dai 300 ky tu", { schema_version: 1, instance_id: "abc-12345678", label: "x".repeat(300) }],
    ["nhan co khoang trang hai dau", { schema_version: 1, instance_id: "abc-12345678", label: "   giua   " }],
    ["nhan la so", { schema_version: 1, instance_id: "abc-12345678", label: 42 }],
    ["nhan co emoji day du", { schema_version: 1, instance_id: "abc-12345678", label: "Ho so 🙂 chinh" }],
    ["nhan cat dut doi emoji", { schema_version: 1, instance_id: "abc-12345678", label: "y".repeat(63) + "🙂" }],
    ["nua cap thay the lac", { schema_version: 1, instance_id: "abc-12345678", label: `A${dk(0xD800)}B` }],
    ["worker va version dai", { schema_version: 1, instance_id: "abc-12345678", worker: "w".repeat(80), extension_version: "v".repeat(50) }],
    ["la mang", []],
    ["la chuoi", "abc"]
  ];
  for (const [ten, dauVao] of caThu) soSanh(`parseInstance / ${ten}`, (m) => m.parseInstance(dauVao));
}

/* ---- ③ Hai hàm mật mã — bản gốc KHÔNG xuất chúng ra ---------------------
 * `sameToken` và `hostProof` là `function` thường trong bản gốc, không `export`. Lõi mới XUẤT
 * chúng, cố ý: cái bắt tay hai chiều là thứ hai gói kia thiếu, nên nó phải ghim được trực tiếp
 * chứ không chỉ ghim gián tiếp qua một lượt nối thật.
 *
 * Không so được với bản gốc thì ghim bằng TÍNH CHẤT — và tính chất mới là thứ đáng ghim. */
{
  const khac = crypto.randomBytes(32).toString("base64url");
  assert.equal(moi.sameToken(TOKEN, TOKEN), true, "cung token phai khop");
  assert.equal(moi.sameToken(TOKEN, khac), false, "khac token phai truot");
  /* Sai định dạng thì TRẢ VỀ false, không ném — một ngoại lệ ở đây làm sập cửa vào HTTP. */
  for (const xau of ["", null, undefined, "qua-ngan", TOKEN.slice(0, 42), TOKEN + "x", 42, {}]) {
    assert.equal(moi.sameToken(TOKEN, xau), false, `token xau '${String(xau)}' phai tra false chu khong nem`);
    assert.equal(moi.sameToken(xau, TOKEN), false, `token mong doi xau '${String(xau)}' cung vay`);
  }

  /* `hostProof` phải PHỤ THUỘC CẢ HAI đầu vào. Chỉ phụ thuộc nonce thì mọi máy chủ đều chứng
   * minh được; chỉ phụ thuộc token thì bằng chứng dùng lại được cho mọi lần bắt tay. */
  const nonce = crypto.randomBytes(32).toString("base64url");
  const nonce2 = crypto.randomBytes(32).toString("base64url");
  assert.equal(moi.hostProof(TOKEN, nonce), moi.hostProof(TOKEN, nonce), "cung dau vao phai cung ket qua");
  assert.notEqual(moi.hostProof(TOKEN, nonce), moi.hostProof(TOKEN, nonce2), "doi nonce phai doi bang chung");
  assert.notEqual(moi.hostProof(TOKEN, nonce), moi.hostProof(khac, nonce), "doi token phai doi bang chung");
  assert.match(moi.hostProof(TOKEN, nonce), /^[A-Za-z0-9_-]{43}$/, "bang chung phai la base64url 43 ky tu");
}

/* ---- ④ Lõi mới ĐÒI tên giao thức, và không nhận tên bừa ------------------
 * Đây là lý do cả lượt tách này tồn tại: bản gốc gõ cứng `duc-auto-chatgpt.bridge` ở bốn chỗ,
 * nên mỗi bản nhân bản lại mang tên một sản phẩm khác. Lõi mới bắt buộc khai. */
{
  assert.throws(() => moi.createBridgeHostCore({ pairing: ghepCap() }), /protocol/,
    "khong khai giao thuc thi phai TU CHOI, khong duoc chon mot ten mac dinh");
  for (const xau of ["", "A.Bridge", "x", "co khoang trang", "Qua" + "x".repeat(70)]) {
    assert.throws(() => moi.createBridgeHostCore({ pairing: ghepCap(), protocol: xau }), /protocol/, `'${xau}' phai bi tu choi`);
  }
  const may = moi.createBridgeHostCore({ pairing: ghepCap(), protocol: "duc-scouter.bridge" });
  assert.equal(may.protocol, "duc-scouter.bridge");
  assert.deepEqual(may.localMethods(), [], "khong khai method tai cho thi danh sach phai rong");

  const may2 = moi.createBridgeHostCore({
    pairing: ghepCap(), protocol: "duc-scouter.bridge",
    methodTaiCho: { "file.write": async () => ({}), "file.read": async () => ({}) }
  });
  assert.deepEqual(may2.localMethods().sort(), ["file.read", "file.write"]);
}

/* ---- ⑤ Hằng số phải khớp bản gốc ---------------------------------------- */
{
  assert.equal(moi.DEFAULT_HOST, goc.DEFAULT_HOST);
  assert.equal(moi.MAX_ENVELOPE_BYTES, goc.MAX_ENVELOPE_BYTES);
  assert.equal(moi.MAX_INFLIGHT, goc.MAX_INFLIGHT);
}

console.log("tuong-duong-voi-ban-goc: PASS (5 khoi)");

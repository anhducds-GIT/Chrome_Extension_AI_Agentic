/* Phép ghim cho TÊN GHẾ — "Profile ID" theo lời Đức, 12/09.
 *
 * VÌ SAO CÓ MẺ NÀY. Ngày 12/09 `bridge.sessions` của máy chủ THẬT trả về hai ghế cùng nối, cả
 * hai `label: null` `legacy: true`. Máy chủ định tuyến fail-closed, nên mọi lượt gọi không nêu
 * đích bị từ chối `TARGET_AMBIGUOUS` — gói đứng hình không phải vì thiếu năng lực mà vì không
 * ai gọi được đúng ghế. Chỗ hỏng nằm ở phía extension: nó chưa bao giờ khai `instance`.
 *
 * CHỐT ĐẮT NHẤT Ở ĐÂY LÀ CON `G6`, và nó là lý do file này không dựng máy chủ giả cho phần
 * danh tính: nó nhập `parseInstance` THẬT từ `_shared/bridge-host/bridge-host-core.mjs` rồi
 * đút khối `instance` mà extension vừa gửi vào đúng hàm đó. Một máy chủ giả dễ tính sẽ nhận
 * mọi thứ; hàm thật thì đóng socket bằng mã 1008 khi `instance_id` sai hình dạng, và triệu
 * chứng ngoài đời là "extension không nối được nữa" — xa cái nguyên nhân đúng một quãng dài.
 *
 * Ba thứ mẻ này KHÔNG ghim, và nói ra để người sau khỏi tưởng đã có: nó không chạy máy chủ
 * thật (việc đó ở `npm run scouter:bridge-live`), không mở trình duyệt, và không kiểm bảng bên
 * vẽ ra sao (`sidepanel-dom-smoke.mjs` canh phần DOM).
 */

import assert from "node:assert/strict";
import { PROTOCOL } from "../scripts/scouter-bridge-core.mjs";
import { parseInstance } from "../../../_shared/bridge-host/bridge-host-core.mjs";

const { createTransport, sanitizeInstanceLabel, TRANSPORT_CONSTANTS } =
  await import("../scripts/scouter-transport-loopback.mjs");

/* Tên gói mà PHÉP GHIM tự chọn — cố ý KHÔNG phải "duc-scouter". Dùng đúng tên thật ở đây thì
 * một bản transport gõ cứng "duc-scouter" vẫn xanh trọn, và đó chính là bug 12/09. */
const WORKER_ID_THU = "goi-thu-nghiem";

const PORT = 32147;
const TOKEN = base64Url(new Uint8Array(32).map((_value, index) => (index * 7 + 3) & 0xff));
const PAIRING = Object.freeze({
  schema_version: 1,
  host: "127.0.0.1",
  port: PORT,
  http_url: `http://127.0.0.1:${PORT}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${PORT}/v1/extension`,
  token: TOKEN
});

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlBytes(value) {
  const normalized = String(value).replace(/-/g, "+").replace(/\//g, "/").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

/* Đúng công thức của máy chủ thật: HMAC-SHA256(khoá = 32 byte token, dữ liệu = nonce). Chép
 * công thức chứ không chép kết quả — một hằng số dán cứng sẽ vẫn xanh sau khi công thức đổi. */
async function hostProof(token, nonce) {
  const key = await crypto.subtle.importKey("raw", base64UrlBytes(token), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(nonce));
  return base64Url(new Uint8Array(signature));
}

class FakeSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static last = null;

  constructor(url) {
    this.url = url;
    this.readyState = FakeSocket.OPEN;
    this.sent = [];
    this.closed = null;
    FakeSocket.last = this;
  }

  send(text) { this.sent.push(JSON.parse(text)); }
  close(code, reason) { this.readyState = FakeSocket.CLOSED; this.closed = { code, reason }; }

  async deliver(message) {
    this.onmessage({ data: JSON.stringify(message) });
    await flush();
  }

  frames(type) { return this.sent.filter((frame) => frame.type === type); }
}

async function flush() {
  for (let index = 0; index < 5; index += 1) await new Promise((resolve) => setTimeout(resolve, 0));
}

function makeTimers() {
  let nextId = 1;
  const timeouts = new Map();
  const intervals = new Map();
  return {
    setTimeout(callback, delay) { const id = nextId++; timeouts.set(id, { callback, delay }); return id; },
    clearTimeout(id) { timeouts.delete(id); },
    setInterval(callback, delay) { const id = nextId++; intervals.set(id, { callback, delay }); return id; },
    clearInterval(id) { intervals.delete(id); }
  };
}

/* Kho lưu giả GIỮ NGUYÊN giữa các lượt nối trong cùng một rig — đó là cả điểm của con `G2`:
 * `instance_id` phải sống sót qua một lượt nối lại, y như `chrome.storage.local` thật. */
function makeChrome(seed = {}) {
  const store = { "dac.bridge.pairing.v1": PAIRING, ...seed };
  return {
    store,
    runtime: { getManifest: () => ({ version: "0.1.0" }) },
    storage: {
      local: {
        async get(keys) {
          const out = {};
          for (const key of [].concat(keys)) if (key in store) out[key] = store[key];
          return out;
        },
        async set(patch) { Object.assign(store, patch); }
      }
    }
  };
}

function makeRig(seed, tenGoi = WORKER_ID_THU) {
  const chromeApi = makeChrome(seed);
  const transport = createTransport({
    chrome: chromeApi,
    /* Tên gói do LỚP NỐI DÂY khai, không do transport gõ cứng — xem G9. */
    worker_id: tenGoi,
    WebSocket: FakeSocket,
    crypto: globalThis.crypto,
    timers: makeTimers(),
    dispatch: async (envelope) => ({
      protocol: PROTOCOL, version: 1, kind: "response", request_id: envelope.request_id,
      ok: true, result: {}, responded_at: "2026-09-12T10:00:00.000Z"
    })
  });
  return { transport, chromeApi };
}

/* Đưa một socket đi trọn vòng bắt tay hai chiều và trả về khung `auth` nó gửi đi. */
async function batTay(rig) {
  await rig.transport.connect();
  const socket = FakeSocket.last;
  socket.onopen();
  const challenge = socket.frames("auth_challenge")[0];
  assert.ok(challenge, "mở socket xong phải gửi auth_challenge trước tiên");
  await socket.deliver({ type: "auth_proof", proof: await hostProof(TOKEN, challenge.nonce) });
  const auth = socket.frames("auth")[0];
  assert.ok(auth, "kiểm bằng chứng máy chủ xong phải gửi khung auth");
  return { socket, auth };
}

const ket = [];
async function ghim(ten, chay) {
  try { await chay(); ket.push(`PASS  ${ten}`); }
  catch (loi) { ket.push(`FAIL  ${ten}\n      ${String(loi?.message || loi).split("\n")[0]}`); process.exitCode = 1; }
}

/* ---- G1 · Khung `auth` khai danh tính, không còn ngồi ghế vô danh --------- */
await ghim("G1 khung auth mang instance đủ bốn trường", async () => {
  const rig = makeRig({ [TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]: "udine-chinh" });
  const { auth } = await batTay(rig);
  assert.ok(auth.instance, "khung auth phải có khối instance — thiếu nó là quay lại ghế legacy");
  assert.equal(auth.instance.schema_version, 1);
  assert.equal(auth.instance.label, "udine-chinh");
  assert.equal(auth.instance.worker, WORKER_ID_THU);
  assert.equal(auth.instance.extension_version, "0.1.0");
  /* Token vẫn phải ở đúng chỗ cũ: `instance` là dữ liệu ĐỊNH TUYẾN, nó không được thay thế
   * hay làm xê dịch thứ quyết định ai được vào. */
  assert.equal(auth.token, TOKEN);
  assert.equal(auth.role, "extension");
});

/* ---- G2 · Số ghế đúc MỘT LẦN rồi ở yên ------------------------------------
 * Một cái ghế tự đổi số giữa hai lượt nối lại thì mọi lệnh đang nhắm vào nó lạc chỗ — và
 * service worker MV3 bị Chrome giết rồi dựng lại suốt ngày, nên "lượt nối lại" không phải
 * chuyện hiếm mà là chuyện thường. */
await ghim("G2 instance_id sống sót qua lượt nối lại", async () => {
  const rig = makeRig();
  const lan1 = await batTay(rig);
  const so1 = lan1.auth.instance.instance_id;
  assert.ok(so1, "lượt nối đầu phải đúc được số ghế");

  rig.transport.disconnect();
  const lan2 = await batTay(rig);
  assert.equal(lan2.auth.instance.instance_id, so1, "số ghế phải GIỮ NGUYÊN qua lượt nối lại");
  assert.equal(rig.chromeApi.store[TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY].instance_id, so1,
    "số ghế trên đĩa phải là chính cái vừa khai lên dây");
});

/* ---- G3 · Số ghế hỏng trên đĩa thì ĐÚC LẠI, không khai bừa ----------------
 * Một `instance_id` sai hình dạng bị máy chủ đóng socket bằng 1008, và triệu chứng ngoài đời
 * là "extension không nối được nữa" — cách nguyên nhân đúng một quãng dài. */
await ghim("G3 bản ghi hỏng trên đĩa bị thay, không được khai lên dây", async () => {
  const rig = makeRig({ [TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY]: { schema_version: 1, instance_id: "x" } });
  const { auth } = await batTay(rig);
  assert.notEqual(auth.instance.instance_id, "x");
  assert.match(auth.instance.instance_id, TRANSPORT_CONSTANTS.INSTANCE_ID_SHAPE);
});

/* ---- G4 · Đổi tên ăn ở lượt nối KẾ TIẾP ----------------------------------- */
await ghim("G4 tên mới đi lên dây ở lượt nối sau", async () => {
  const rig = makeRig({ [TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]: "ten-cu" });
  const lan1 = await batTay(rig);
  assert.equal(lan1.auth.instance.label, "ten-cu");

  /* Đúng việc mà bảng bên làm: ghi kho lưu, hết. */
  rig.chromeApi.store[TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY] = "ten-moi";
  rig.transport.disconnect();
  const lan2 = await batTay(rig);
  assert.equal(lan2.auth.instance.label, "ten-moi", "lượt nối sau phải đọc tên MỚI, không phải bản đã nhớ");
  assert.equal(lan2.auth.instance.instance_id, lan1.auth.instance.instance_id, "đổi TÊN không được đổi GHẾ");
});

/* ---- G5 · Làm sạch nhãn khớp từng bước với máy chủ ------------------------ */
await ghim("G5 sanitizeInstanceLabel cắt đúng chỗ", async () => {
  assert.equal(sanitizeInstanceLabel(undefined), "");
  assert.equal(sanitizeInstanceLabel(12345), "", "không phải chuỗi thì là chuỗi rỗng, không phải '12345'");
  assert.equal(sanitizeInstanceLabel("  udine  "), "udine");
  assert.equal(sanitizeInstanceLabel("a bcde"), "abcde", "ký tự điều khiển C0 và C1 đều phải rụng");
  assert.equal(sanitizeInstanceLabel("x".repeat(200)).length, 64, "trần 64 ký tự");
  /* Nửa cặp thay thế LẠC — thứ chính lượt cắt 64 có thể vừa tạo ra. Để lại thì chuỗi JSON
   * gửi lên dây không còn là UTF-16 hợp lệ. */
  assert.equal(sanitizeInstanceLabel("ok\uD800"), "ok");
  assert.equal(sanitizeInstanceLabel("ok\uDC00"), "ok");
  assert.equal(sanitizeInstanceLabel("\u{1F600}"), "\u{1F600}", "cặp thay thế ĐỦ ĐÔI thì phải giữ nguyên");
});

/* ---- G6 · Hai đầu dây đồng ý với nhau — đo, không phải hứa ---------------- */
await ghim("G6 parseInstance THẬT của máy chủ nhận đúng thứ extension gửi", async () => {
  const rig = makeRig({ [TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]: "  udine chính  " });
  const { auth } = await batTay(rig);
  const mayChuThay = parseInstance(auth.instance);
  assert.equal(mayChuThay.instance_id, auth.instance.instance_id);
  assert.equal(mayChuThay.label, auth.instance.label,
    "nhãn extension gửi và nhãn máy chủ lưu phải là MỘT — lệch thì Đức gọi tên nào cũng không trúng");
  assert.equal(mayChuThay.label, "udine chính");
  assert.equal(mayChuThay.worker, WORKER_ID_THU);
});

/* ---- G7 · Đọc danh tính hỏng KHÔNG được kéo theo mất kết nối --------------
 * `instance` là dữ liệu định tuyến, không bao giờ tham gia xác thực. Nên kho lưu hỏng thì cái
 * giá đúng là ngồi ghế không tên như trước 12/09 — không phải mất cả Bridge. Đảo chốt này lại
 * nghĩa là thêm một cách mới làm chết kết nối, đổi lấy đúng một cái nhãn. */
await ghim("G7 storage hỏng thì vẫn đăng nhập được, chỉ là không tên", async () => {
  const rig = makeRig();
  const that = rig.chromeApi.storage.local.get;
  rig.chromeApi.storage.local.get = async (keys) => {
    const ten = [].concat(keys);
    if (ten.includes(TRANSPORT_CONSTANTS.INSTANCE_STORAGE_KEY)) throw new Error("storage đang hỏng");
    return that(keys);
  };
  const { auth } = await batTay(rig);
  assert.equal(auth.token, TOKEN, "vẫn phải gửi được khung auth");
  assert.equal(auth.instance, undefined, "không đọc được danh tính thì KHÔNG khai bừa một khối rỗng");
});

/* ---- G8 · Không thêm chữ nào vào từ vựng cửa Bridge (luật gói số 4) -------
 * Nhãn đi kèm khung `auth` CHÍNH LÀ để khỏi phải thêm method — thêm method là đổi luật an
 * toàn và phải hỏi Đức. Con này ĐỎ đúng lúc ai đó lặng lẽ mở một cửa mới cho việc đặt tên. */
await ghim("G8 không có khung lạ nào mọc thêm trong lượt bắt tay", async () => {
  const rig = makeRig({ [TRANSPORT_CONSTANTS.INSTANCE_LABEL_STORAGE_KEY]: "udine" });
  const { socket } = await batTay(rig);
  const loai = [...new Set(socket.sent.map((khung) => khung.type))].sort();
  assert.deepEqual(loai, ["auth", "auth_challenge"],
    `lượt bắt tay chỉ được gửi auth_challenge rồi auth; thấy thêm: ${loai.join(", ")}`);
});

/* ---- G9 · Transport KHÔNG được gõ cứng tên gói nào --------------------------
 * BUG THẬT, 12/09. `scripts/scouter-transport-loopback.mjs` được CHÉP NGUYÊN VĂN sang gói
 * `hnx-fetch` (phép ghim ⑷ của gói đó so từng byte). Tôi gõ cứng `WORKER_ID = "duc-scouter"`
 * vào file này, nên bản chép sẽ khiến HNX Fetch **tự khai sai tên mình trên dây** — và
 * `bridge.sessions` là đúng chỗ người ta nhìn để phân biệt các ghế.
 *
 * Đây là luật gói số 1 dưới một hình dạng khác: năng lực vào seed, hiểu biết riêng của một
 * chỗ vào lớp nối dây. Tên gói là hiểu biết riêng. */
await ghim("G9 transport không chứa tên gói nào — tên do lớp nối dây khai", async () => {
  const fs = await import("node:fs");
  const url = new URL("../scripts/scouter-transport-loopback.mjs", import.meta.url);
  const ma = fs.readFileSync(url, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")          // bỏ chú thích khối
    .replace(/(^|[^:])\/\/.*$/gm, "$1");        // bỏ chú thích dòng
  for (const ten of ["duc-scouter", "hnx-fetch", "duc-auto-chatgpt", "duc-auto-gemini"]) {
    assert.equal(ma.includes(ten), false,
      `transport gõ cứng tên gói "${ten}" — bản chép sang gói khác sẽ khai sai tên gói đó`);
  }

  /* Chiều NGƯỢC LẠI: tên hình dạng sai thì KHÔNG khai, chứ không khai bừa. Một `worker` rác
   * đi thẳng vào bảng `bridge.sessions` mà người đọc đang tin. */
  for (const xau of ["Duc Scouter", "", "  ", 42, null, "x".repeat(65), "-bat-dau-bang-gach"]) {
    const rig = makeRig(undefined, xau);
    const { auth } = await batTay(rig);
    assert.equal(auth.instance.worker, null, `tên gói hỏng vẫn lọt: ${JSON.stringify(xau)}`);
  }
});

for (const dong of ket) console.log(dong);
console.log(`\n${ket.filter((d) => d.startsWith("PASS")).length}/${ket.length} phép ghim TÊN GHẾ`);

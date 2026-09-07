#!/usr/bin/env node
/* scouter-bridge-host-smoke.mjs — ghim MÁY CHỦ BRIDGE RIÊNG của Scouter.
 *
 * ══ VIẾT LẠI 07/09 KHI KIẾN TRÚC ĐỔI ══
 * Bản trước ghim một **lớp đứng TRƯỚC** host của `duc-auto-chatgpt`, nên ba khối đầu của nó đo
 * việc chuyển tiếp. Đức chốt Scouter phải có host riêng (để nhân bản seed sang nhiều extension),
 * nên ba khối đó không còn thứ để đo và đã BỎ. Sáu khối an toàn thì giữ nguyên từng chữ — đổi
 * kiến trúc mà làm rơi một chốt an toàn là cách tệ nhất để đổi kiến trúc.
 *
 * Cái gì đo Ở ĐÂY và cái gì đo CHỖ KHÁC:
 *   · Hành vi chung của lõi (bắt tay hai chiều, định tuyến, phiên) → đo ở
 *     `workers/_shared/bridge-host/tests/tuong-duong-voi-ban-goc.mjs`, bằng cách so với BẢN GỐC.
 *   · Phần RIÊNG của Scouter (nhóm `file.*`, vùng ghi, cái chặn tệp ghép cặp) → đo ở đây.
 *
 * Máy chủ THẬT, cổng thật trên loopback: chốt Origin và chốt token chỉ tồn tại ở tầng HTTP, nên
 * gọi thẳng hàm nội bộ là bỏ qua đúng chỗ cần ghim.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { createScouterBridge, PROTOCOL } = await import("../bridge/scouter-bridge-host.mjs");

const TAM = fs.mkdtempSync(path.join(os.tmpdir(), "scouter-host-pin-"));
const GOC = path.join(TAM, "vung-ghi");
fs.mkdirSync(GOC, { recursive: true });

const TOKEN = crypto.randomBytes(32).toString("base64url");
const CONG = 39881;
const pairing = Object.freeze({
  schema_version: 1, host: "127.0.0.1", port: CONG,
  http_url: `http://127.0.0.1:${CONG}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${CONG}/v1/extension`,
  token: TOKEN
});

const bridge = createScouterBridge({ pairing, root: GOC });
await bridge.start();

const URL_RPC = `http://127.0.0.1:${CONG}/v1/rpc`;
let soRequest = 0;
async function goi(method, params, { token = TOKEN, origin, raw } = {}) {
  soRequest += 1;
  const headers = { "content-type": "application/json" };
  if (token !== null) headers.authorization = `Bearer ${token}`;
  if (origin !== undefined) headers.origin = origin;
  const body = raw ?? JSON.stringify({
    protocol: PROTOCOL, version: 1, kind: "request",
    request_id: `pin-${String(soRequest).padStart(4, "0")}`,
    method, sent_at: new Date().toISOString(),
    client: { client_id: "pin", name: "pin", version: "1" },
    params: params ?? {}
  });
  const r = await fetch(URL_RPC, { method: "POST", headers, body });
  return { status: r.status, body: await r.json() };
}

let soKhoi = 0;
const khoi = (ten, fn) => { soKhoi += 1; return fn(); };

try {
  /* ---- ① TÊN GIAO THỨC LÀ CỦA SCOUTER ------------------------------------
   * Lý do cả lượt đổi kiến trúc này tồn tại. Một cái seed sắp nhân bản mà mang tên sản phẩm
   * khác thì bản clone nào cũng kéo theo cái tên đó. Và phong bì mang tên CŨ phải bị TỪ CHỐI —
   * nếu vẫn nhận thì việc đổi tên chỉ là trang trí. */
  await khoi("ten giao thuc la cua Scouter", async () => {
    assert.equal(PROTOCOL, "duc-scouter.bridge");

    const cu = JSON.stringify({
      protocol: "duc-auto-chatgpt.bridge", version: 1, kind: "request", request_id: "pin-cu-0001",
      method: "file.list", sent_at: new Date().toISOString(),
      client: { client_id: "pin", name: "pin", version: "1" }, params: {}
    });
    const ra = await goi(null, null, { raw: cu });
    assert.equal(ra.status, 400, "phong bi mang ten giao thuc CU phai bi tu choi");
    assert.equal(ra.body.error.code, "INVALID_ENVELOPE");
    assert.equal(ra.body.protocol, PROTOCOL, "phong bi loi cung phai mang ten MOI");
  });

  /* ---- ② METHOD CỦA EXTENSION khi CHƯA có extension nào nối ---------------
   * Không có extension thì `scout.*` phải trả `EXTENSION_OFFLINE` — mã ĐÁNG THỬ LẠI, vì
   * extension nối lại được. Trả một mã không-thử-lại ở đây là bảo người gọi bỏ cuộc trong khi
   * chỉ cần đợi. */
  await khoi("chua co extension thi scout.* bao offline", async () => {
    const ra = await goi("scout.targets", {});
    assert.equal(ra.body.ok, false);
    assert.equal(ra.body.error.code, "EXTENSION_OFFLINE");
    assert.equal(ra.body.error.retryable, true, "extension noi lai duoc, nen day phai la dang thu lai");
  });

  /* ---- ③ NHÓM `file.*` CHẠY ĐƯỢC KHI KHÔNG CÓ EXTENSION -------------------
   * Đây là tính chất mà kiến trúc mới đem lại, và nó đáng ghim: ghi một file xuống đĩa không
   * cần trình duyệt mở. Bản cũ chuyển tiếp mọi thứ nên tính chất này mờ; nay nó rõ. */
  await khoi("bon method dia chay khong can extension", async () => {
    const ghi = await goi("file.write", { path: "du-lieu/ngay-01.json", content: '{"n":1}' });
    assert.equal(ghi.body.ok, true, JSON.stringify(ghi.body));
    assert.equal(ghi.body.result.bytes, 7);
    assert.equal(fs.readFileSync(path.join(GOC, "du-lieu", "ngay-01.json"), "utf8"), '{"n":1}');

    await goi("file.append", { path: "du-lieu/ngay-01.json", content: "x" });
    const doc = await goi("file.read", { path: "du-lieu/ngay-01.json" });
    assert.equal(doc.body.result.content, '{"n":1}x');

    const ds = await goi("file.list", { path: "du-lieu" });
    assert.deepEqual(ds.body.result.entries.map((e) => e.name), ["ngay-01.json"]);

    const kn = await goi("host.capabilities", {});
    assert.equal(kn.body.result.write_root, fs.realpathSync(GOC));
    assert.equal(kn.body.result.protocol, PROTOCOL);
    assert.ok(kn.body.result.absent["file.delete"], "phai noi thang cai KHONG co");
    /* Bảng tự khai phải khớp bảng thật — hai danh sách gõ tay thì sớm muộn lệch. */
    assert.deepEqual([...kn.body.result.local_methods].sort(), ["file.append", "file.list", "file.read", "file.write", "host.capabilities"]);
  });

  /* ---- ④ VÙNG GHI là vùng ghi ---------------------------------------------
   * Chốt đắt nhất của cả file. `file-core.mjs` đã ghim đầy đủ ở tầng hàm; ở đây hỏi lại qua
   * ĐƯỜNG DÂY, vì một lượt bóc tham số cẩu thả ở tầng HTTP là đủ để vô hiệu hoá tầng dưới. */
  await khoi("vung ghi la vung ghi", async () => {
    for (const xau of ["../thoat.txt", "C:\\Windows\\x.txt", "/etc/passwd", "..\\..\\x"]) {
      const ra = await goi("file.write", { path: xau, content: "x" });
      assert.equal(ra.body.ok, false, `duong '${xau}' le ra phai bi tu choi`);
      assert.equal(ra.body.error.code, "PATH_OUTSIDE_ROOT", xau);
    }
    assert.ok(!fs.existsSync(path.join(TAM, "thoat.txt")), "da ghi ra NGOAI vung ghi");
  });

  /* ---- ⑤ Hai cổng vào của tầng HTTP ---------------------------------------
   * `Origin` có mặt = lượt gọi tới từ một TRANG WEB. Một trang web không được sai khiến máy chủ
   * này. Chốt này nay sống ở lõi dùng chung, nên hỏi lại ở đây là hỏi "lõi có thật sự canh
   * không" — không phải hỏi lại điều đã biết. */
  await khoi("hai cong vao", async () => {
    assert.equal((await goi("file.list", {}, { token: "sai-token-hoan-toan" })).status, 401);
    assert.equal((await goi("file.list", {}, { token: null })).status, 401);
    assert.equal((await goi("file.list", {}, { origin: "https://ke-tan-cong.test" })).status, 403,
      "loi goi tu mot trang web phai bi tu choi");
  });

  /* ---- ⑥ Phong bì hỏng thì ĐỎ ------------------------------------------- */
  await khoi("phong bi hong", async () => {
    const ra = await goi(null, null, { raw: "{khong-phai-json" });
    assert.equal(ra.status, 400);
    assert.equal(ra.body.error.code, "INVALID_ENVELOPE");
  });

  /* ---- ⑦ Gốc phải TUYỆT ĐỐI và có thật ------------------------------------
   * Chốt ⑴ của `file-core.mjs`, hỏi ở tầng khởi động: vùng ghi do NGƯỜI BẬT MÁY khai. Nhận gốc
   * tương đối là để vùng ghi trôi theo thư mục hiện tại của tiến trình. */
  await khoi("goc phai tuyet doi", async () => {
    assert.throws(() => createScouterBridge({ pairing, root: "tuong-doi" }), /TUYỆT ĐỐI/);
    assert.throws(() => createScouterBridge({ pairing, root: path.join(TAM, "khong-co") }), /không tồn tại/);
  });

  /* ---- ⑧ VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP (07/09) --------------------
   * `file.read` đọc được MỌI file dưới vùng ghi — đó là thiết kế, vì một danh sách trừ thì sớm
   * muộn sót. Hệ quả: vùng ghi trỏ vào thư mục đang giữ tệp ghép cặp nghĩa là **token đọc được
   * qua dây**.
   *
   * Không phải rủi ro lý thuyết. Quy ước sẵn có trên máy Đức là
   * `Chrome Extension Bridge/<tên>/` chứa CẢ máy chủ LẪN `<tên>-pairing-v1.json`, nên trỏ vùng
   * ghi vào đúng thư mục đó là việc tự nhiên nhất để làm — Đức hỏi đúng câu đó 07/09. Cái bẫy
   * mà người ta rơi vào một cách tự nhiên thì phải CHẶN, không phải dặn. */
  await khoi("vung ghi khong duoc chua tep ghep cap", async () => {
    const gocBan = fs.mkdtempSync(path.join(os.tmpdir(), "scouter-ban-"));
    fs.writeFileSync(path.join(gocBan, "duc-scouter-bridge-pairing-v1.json"), JSON.stringify({ port: 1, token: "x" }));
    assert.throws(() => createScouterBridge({ pairing, root: gocBan }), /chứa tệp ghép cặp/,
      "root chua tep ghep cap ma van khoi dong duoc");

    /* Cái chặn phải HẸP: một thư mục con sạch thì vẫn dựng được. Chặn cả đường đúng thì người ta
     * sẽ tắt cái chặn đi, và mất luôn phần nó canh đúng. */
    const con = path.join(gocBan, "du-lieu");
    fs.mkdirSync(con);
    const may = createScouterBridge({ pairing: { ...pairing, port: CONG + 1, http_url: `http://127.0.0.1:${CONG + 1}/v1/rpc`, websocket_url: `ws://127.0.0.1:${CONG + 1}/v1/extension` }, root: con });
    assert.ok(may, "thu muc con sach thi phai dung duoc");
    fs.rmSync(gocBan, { recursive: true, force: true });
  });
} finally {
  await bridge.stop();
  fs.rmSync(TAM, { recursive: true, force: true });
}

console.log(`scouter-bridge-host-smoke: ${soKhoi} khoi, tat ca DAT`);

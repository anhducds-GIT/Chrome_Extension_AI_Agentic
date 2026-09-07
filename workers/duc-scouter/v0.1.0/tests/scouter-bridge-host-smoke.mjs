#!/usr/bin/env node
/* scouter-bridge-host-smoke.mjs — ghim LỚP ĐỨNG TRƯỚC của Bridge Scouter.
 *
 * Đo đúng thứ file này thêm vào, không đo lại host cũ: bốn method đĩa, hai cổng vào (Origin,
 * token), và **chuyển tiếp nguyên văn**. Host cũ được thay bằng một cái giả — cố ý, vì mở
 * WebSocket thật là đo lại thứ `scouter-bridge-live-check.mjs` đã đo, và đo hai lần một thứ
 * thì lượt nào hỏng cũng không biết là của ai.
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
const CONG_HOST_CU = 39871;
const CONG_TOI = 39872;
const pairing = Object.freeze({
  schema_version: 1, host: "127.0.0.1", port: CONG_HOST_CU,
  http_url: `http://127.0.0.1:${CONG_HOST_CU}/v1/rpc`,
  websocket_url: `ws://127.0.0.1:${CONG_HOST_CU}/v1/extension`,
  token: TOKEN
});

/* Host cũ GIẢ: chỉ đếm số lượt được gọi và trả về một dấu nhận biết. */
const hostCu = { started: 0, stopped: 0, async start() { this.started += 1; }, async stop() { this.stopped += 1; } };
const dauVetChuyenTiep = [];
const bridge = await createScouterBridge({
  pairing, root: GOC, port: CONG_TOI, hostCu,
  relayFetch: async (body) => {
    dauVetChuyenTiep.push(body.toString("utf8"));
    return { status: 200, text: JSON.stringify({ ok: true, dau_nhan_biet: "host-cu-da-tra-loi" }) };
  }
});
await bridge.start();

const URL_RPC = `http://127.0.0.1:${CONG_TOI}/v1/rpc`;
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
  /* ---- ① Host cũ được KHỞI ĐỘNG, không bị bỏ quên -------------------------
   * Lớp này bọc host cũ. Quên gọi `start()` của nó thì cổng của tôi vẫn lên, `file.*` vẫn
   * chạy, và mọi thứ trông ổn — cho tới khi ai đó gọi một method của extension. Hỏng muộn và
   * hỏng ở chỗ khác chỗ gây ra nó. */
  await khoi("host cu duoc khoi dong", async () => {
    assert.equal(hostCu.started, 1, "khong goi start() cua host cu");
  });

  /* ---- ② Method LẠ đi thẳng sang host cũ, NGUYÊN VĂN ----------------------
   * Bóc phong bì ra rồi dựng lại là chỗ hai bản của một giao thức bắt đầu lệch nhau. Ghim rằng
   * byte gửi đi bằng đúng byte nhận về, và câu host cũ trả lời tới tay người gọi không sứt mẻ. */
  await khoi("chuyen tiep nguyen van", async () => {
    const than = JSON.stringify({
      protocol: PROTOCOL, version: 1, kind: "request", request_id: "pin-relay",
      method: "scout.targets", sent_at: "2026-09-07T00:00:00Z",
      client: { client_id: "pin", name: "pin", version: "1" }, params: {}
    });
    const ra = await goi(null, null, { raw: than });
    assert.equal(ra.body.dau_nhan_biet, "host-cu-da-tra-loi", "cau tra loi cua host cu bi sua");
    assert.equal(dauVetChuyenTiep.at(-1), than, "than gui di KHONG con nguyen van");
  });

  /* ---- ③ Method KHÔNG TỒN TẠI cũng phải chuyển tiếp -----------------------
   * Dễ sai theo hướng ngược lại: giữ một danh sách "method hợp lệ" ở lớp này rồi tự từ chối.
   * Làm thế là dựng bản sao thứ hai của bảng method — mà bảng thật nằm ở extension, và hai bản
   * sẽ lệch nhau ngay lần extension thêm method mới. */
  await khoi("method la van chuyen tiep", async () => {
    const truoc = dauVetChuyenTiep.length;
    await goi("scout.chua-ton-tai", {});
    assert.equal(dauVetChuyenTiep.length, truoc + 1, "lop nay tu tu choi thay vi chuyen tiep");
  });

  /* ---- ④ Bốn method đĩa chạy TẠI ĐÂY, không chuyển tiếp ------------------- */
  await khoi("bon method dia", async () => {
    const truoc = dauVetChuyenTiep.length;
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
    assert.equal(kn.body.result.write_root, GOC);
    assert.ok(kn.body.result.absent["file.delete"], "phai noi thang cai KHONG co");

    assert.equal(dauVetChuyenTiep.length, truoc, "method dia bi chuyen tiep sang host cu");
  });

  /* ---- ⑤ VÙNG GHI là vùng ghi ---------------------------------------------
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

  /* ---- ⑥ Hai cổng vào của tầng HTTP ---------------------------------------
   * `Origin` có mặt = lượt gọi tới từ một TRANG WEB. Một trang web không được sai khiến máy chủ
   * này, và chốt đó là chốt dễ quên nhất khi dựng một lớp mới đứng trước lớp đã có nó. */
  await khoi("hai cong vao", async () => {
    const saiToken = await goi("file.list", {}, { token: "sai-token-hoan-toan" });
    assert.equal(saiToken.status, 401);

    const khongToken = await goi("file.list", {}, { token: null });
    assert.equal(khongToken.status, 401);

    const tuTrang = await goi("file.list", {}, { origin: "https://ke-tan-cong.test" });
    assert.equal(tuTrang.status, 403, "loi goi tu mot trang web phai bi tu choi");
  });

  /* ---- ⑦ Phong bì hỏng thì ĐỎ ở đây, không đẩy rác sang host cũ ---------- */
  await khoi("phong bi hong", async () => {
    const truoc = dauVetChuyenTiep.length;
    const ra = await goi(null, null, { raw: "{khong-phai-json" });
    assert.equal(ra.status, 400);
    assert.equal(ra.body.error.code, "INVALID_ENVELOPE");
    assert.equal(dauVetChuyenTiep.length, truoc, "day rac sang host cu");
  });

  /* ---- ⑧ Gốc phải TUYỆT ĐỐI và có thật ------------------------------------
   * Chốt ⑴ của `file-core.mjs`, hỏi ở tầng khởi động: vùng ghi do NGƯỜI BẬT MÁY khai. Nhận gốc
   * tương đối là để vùng ghi trôi theo thư mục hiện tại của tiến trình. */
  await khoi("goc phai tuyet doi", async () => {
    await assert.rejects(() => createScouterBridge({ pairing, root: "tuong-doi", hostCu }), /TUYỆT ĐỐI/);
    await assert.rejects(() => createScouterBridge({ pairing, root: path.join(TAM, "khong-co"), hostCu }), /không tồn tại/);
    await assert.rejects(() => createScouterBridge({ pairing, root: GOC, port: CONG_HOST_CU, hostCu }), /khác cổng/);
  });

  /* ---- ⑨ VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP (07/09) --------------------
   * `file.read` đọc được MỌI file dưới `--root` — đó là thiết kế, vì một danh sách trừ thì sớm
   * muộn sót. Hệ quả: `--root` trỏ vào thư mục đang giữ tệp ghép cặp nghĩa là **token đọc được
   * qua dây**.
   *
   * Không phải rủi ro lý thuyết. Quy ước sẵn có trên máy Đức là
   * `Chrome Extension Bridge/<tên>/` chứa CẢ `bridge-host.mjs` LẪN `<tên>-pairing-v1.json`, nên
   * trỏ `--root` vào đúng thư mục đó là việc tự nhiên nhất để làm — Đức hỏi đúng câu đó 07/09.
   * Cái bẫy mà người ta rơi vào một cách tự nhiên thì phải CHẶN, không phải dặn. */
  await khoi("vung ghi khong duoc chua tep ghep cap", async () => {
    const gocBan = fs.mkdtempSync(path.join(os.tmpdir(), "scouter-ban-"));
    fs.writeFileSync(path.join(gocBan, "duc-scouter-bridge-pairing-v1.json"), JSON.stringify({ port: 1, token: "x" }));
    await assert.rejects(
      () => createScouterBridge({ pairing, root: gocBan, hostCu }),
      /chứa tệp ghép cặp/,
      "root chua tep ghep cap ma van khoi dong duoc"
    );

    /* Cái chặn phải HẸP: một thư mục con sạch thì vẫn khởi động được. Chặn cả đường đúng thì
     * người ta sẽ tắt cái chặn đi, và mất luôn phần nó canh đúng. */
    const con = path.join(gocBan, "du-lieu");
    fs.mkdirSync(con);
    /* Host giả RIÊNG cho lượt này. Dùng chung `hostCu` thì bộ đếm `stopped` lệch, và phép
     * ghim ở cuối file — canh đúng việc "dừng lớp trước thì dừng cả host cũ" — sẽ đỏ oan. */
    const hostRieng = { started: 0, stopped: 0, async start() { this.started += 1; }, async stop() { this.stopped += 1; } };
    const may = await createScouterBridge({ pairing, root: con, port: CONG_HOST_CU + 7, hostCu: hostRieng });
    assert.ok(may, "thu muc con sach thi phai khoi dong duoc");
    await may.stop();
    fs.rmSync(gocBan, { recursive: true, force: true });
  });
} finally {
  await bridge.stop();
  fs.rmSync(TAM, { recursive: true, force: true });
}

assert.equal(hostCu.stopped, 1, "khong goi stop() cua host cu");
console.log(`scouter-bridge-host-smoke: ${soKhoi} khoi, tat ca DAT`);

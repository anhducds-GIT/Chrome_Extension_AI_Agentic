/* ghep-manh-noi.mjs — LÕI PHẢI GHÉP ĐƯỢC TIN WEBSOCKET BỊ CẮT MẢNH (`S-25`).
 *
 * ══ CHUYỆN GÌ ĐÃ XẢY RA ══
 *
 * `websocket-core.mjs` từ ngày đầu có đúng một dòng: `if (!fin) throw`. Chuẩn WebSocket cho phép
 * phía gửi cắt một tin thành nhiều mảnh, và **Chrome cắt mảnh mọi tin vượt khoảng 64 KiB** — nên
 * dòng đó không phải một ca hiếm, nó là đường đi bình thường của mọi câu trả lời hơi lớn.
 *
 * Hậu quả nhìn từ ngoài không giống nguyên nhân chút nào: không có lỗi có tên, chỉ có
 * `TRANSPORT_DISCONNECTED`. `scout.shot` chết trên trang thật, mọi lượt `grab` trả thân thật
 * chết, và vì cỡ tin dao động quanh ngưỡng nên nó trông **chập chờn** (`G-63` đã từng bị kết
 * luận nhầm là một "ngưỡng" sạch).
 *
 * ══ VÌ SAO ĐÂY KHÔNG PHẢI "NỚI MỘT LỚP BẢO VỆ" ══
 *
 * Một lớp bảo vệ từ chối thứ KHÔNG ĐƯỢC PHÉP. Dòng kia từ chối thứ ĐƯỢC PHÉP mà chưa ai viết.
 * Phân biệt được hai thứ đó là điều kiện để sửa: bản sửa **thuần thêm vào**, và khối ① dưới đây
 * tồn tại để chứng minh đúng câu ấy — tin KHÔNG cắt mảnh cư xử y hệt như trước.
 *
 * ══ CÁI CÂN CỦA KHỐI ① ══
 *
 * Không so với một bản chép tay của hành vi cũ, mà so với **bản gốc thật**: ba gói đã đóng băng
 * mỗi gói giữ một bản sao `websocket-core.mjs` **y hệt từng byte** với bản `_shared` trước lượt
 * sửa này. Chúng không đổi nữa, nên chúng là cái mốc: lệch nhau bao giờ cũng là lỗi của bản mới.
 * (Cùng lối nghĩ với `tuong-duong-voi-ban-goc.mjs`.)
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFrameDecoder, encodeFrame } from "../websocket-core.mjs";
import { createBridgeHostCore, hostProof, MAX_ENVELOPE_BYTES } from "../bridge-host-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAN_GOC = path.resolve(HERE, "..", "..", "..",
  "duc-auto-chatgpt", "v0.1.0", "duc-auto-chatgpt-loopback-bridge-host-v1", "websocket-core.mjs");
const goc = await import(`file://${BAN_GOC.split(path.sep).join("/")}`);

const chu = (n, k = "x") => Buffer.from(k.repeat(n), "utf8");

/* ══ ① TIN KHÔNG CẮT MẢNH: Y HỆT BẢN GỐC ═══════════════════════════════════
 * Phép ghim quan trọng nhất của cả file. Hỏi cả hai bản cùng một câu; cả hai ném thì so câu ném,
 * cả hai trả thì so từng trường. Một bên ném một bên trả là lệch — và đó chính là loại lệch âm
 * thầm mà một lượt "chỉ thêm vào" hay đẻ ra. */
{
  function soSanh(ten, chay) {
    let a, b, loiA = null, loiB = null;
    try { a = chay(goc); } catch (e) { loiA = String(e.message); }
    try { b = chay(moi); } catch (e) { loiB = String(e.message); }
    assert.equal(loiA === null, loiB === null, `${ten}: mot ben nem mot ben khong — goc=${loiA} moi=${loiB}`);
    if (loiA !== null) assert.equal(loiB, loiA, `${ten}: hai ben nem hai cau khac nhau`);
    else assert.deepEqual(b, a, `${ten}: hai ben tra ve khac nhau`);
  }
  const moi = { createFrameDecoder, encodeFrame };

  /* ⓐ Bộ MÃ HOÁ: mọi lượt gọi mà mã cũ chấp nhận phải cho ra ĐÚNG từng byte như cũ. */
  const maskKey = Buffer.from([0x0a, 0x1b, 0x2c, 0x3d]);
  const caMaHoa = [
    ["chu ngan", "xin chao", {}],
    ["rong", "", {}],
    ["dung 125", chu(125).toString(), {}],
    ["dung 126 — doi sang 2 byte do dai", chu(126).toString(), {}],
    ["dung 65535", chu(65535).toString(), {}],
    ["dung 65536 — doi sang 8 byte do dai", chu(65536).toString(), {}],
    ["co che, khoa co dinh", "xin chao", { masked: true, maskKey }],
    ["ping", "p", { opcode: 0x9 }],
    ["pong", "p", { opcode: 0xa }],
    ["close", "è", { opcode: 0x8 }],
    ["control qua 125 byte", chu(126).toString(), { opcode: 0x9 }],
    ["opcode nhi phan chua mo", "x", { opcode: 0x2 }],
    ["opcode bay", "x", { opcode: 0x7 }],
    ["khoa che sai do dai", "x", { masked: true, maskKey: Buffer.from([1, 2, 3]) }]
  ];
  for (const [ten, than, tuyChon] of caMaHoa) {
    soSanh(`encodeFrame / ${ten}`, (m) => m.encodeFrame(than, tuyChon).toString("base64"));
  }

  /* ⓑ Bộ GIẢI MÃ: cùng một chuỗi byte vào, cùng một danh sách khung ra.
   * `deepEqual` nhìn cả `text: null` lẫn kiểu của `payload`, nên một khác biệt lặng cũng đỏ. */
  const caGiaiMa = [
    ["mot khung tron", encodeFrame("xin chao", { masked: true })],
    ["khung rong", encodeFrame("", { masked: true })],
    ["hai khung lien tiep trong mot chunk", Buffer.concat([encodeFrame("mot", { masked: true }), encodeFrame("hai", { masked: true })])],
    ["khung 200 byte — 2 byte do dai", encodeFrame(chu(200), { masked: true })],
    ["khung 70000 byte — 8 byte do dai", encodeFrame(chu(70000), { masked: true })],
    ["ping xen giua", Buffer.concat([encodeFrame("p", { opcode: 0x9, masked: true }), encodeFrame("sau", { masked: true })])],
    ["close", encodeFrame(Buffer.from([0x03, 0xe8]), { opcode: 0x8, masked: true })],
    ["chua du hai byte dau", Buffer.from([0x81])],
    ["dau du nhung than thieu", encodeFrame("xin chao", { masked: true }).subarray(0, 6)],
    ["bit RSV bat", Buffer.from([0xc1, 0x00])],
    ["opcode la", Buffer.from([0x87, 0x00])],
    ["khung khong che ma doi che", encodeFrame("x")],
    ["do dai vuot tran", encodeFrame(chu(3000), { masked: true })]
  ];
  for (const [ten, byte] of caGiaiMa) {
    soSanh(`decoder / ${ten}`, (m) => {
      const d = m.createFrameDecoder({ maxPayloadBytes: 2000, requireMasked: true });
      return { khung: d.push(byte), con: d.bufferedBytes() };
    });
  }

  /* ⓒ Và một lượt chia chunk lắt nhắt: byte tới từng cái một vẫn ra đúng một khung, y như cũ. */
  soSanh("decoder / tung byte mot", (m) => {
    const d = m.createFrameDecoder({ maxPayloadBytes: 2000, requireMasked: true });
    const byte = m.encodeFrame("nho giot", { masked: true });
    const ra = [];
    for (const b of byte) ra.push(...d.push(Buffer.from([b])));
    return { khung: ra, con: d.bufferedBytes() };
  });

  /* ⓓ Chốt lại điều KHIẾN khối này có nghĩa: bản gốc THẬT SỰ còn mang con bệnh. Không có dòng
   * này thì một ngày nào đó ai đó sửa luôn bản gốc, khối ① vẫn xanh, và cái cân thành vô nghĩa. */
  assert.throws(() => goc.createFrameDecoder({}).push(Buffer.from([0x01, 0x03, 0x61, 0x62, 0x63])),
    /Fragmented/, "ban goc phai VAN nem o manh noi — neu khong, no khong con la cai moc nua");
}

/* ══ ② GHÉP ĐƯỢC — ĐÚNG CÁI PHÉP THỬ ĐÃ TÌM RA GỐC (`G-67`) ════════════════
 * Byte gõ tay, không qua bộ mã hoá của chính file này: một bộ mã hoá sai cũng sẽ đẻ ra một bộ
 * giải mã "khớp với nó" mà sai với cả thế giới. */
{
  const d = createFrameDecoder({});
  assert.deepEqual(d.push(Buffer.from([0x01, 0x03, 0x61, 0x62, 0x63])), [], "manh dau chua thanh tin");
  const ra = d.push(Buffer.from([0x80, 0x03, 0x64, 0x65, 0x66]));
  assert.equal(ra.length, 1, "manh cuoi phai cho ra dung mot tin");
  assert.equal(ra[0].text, "abcdef", "hai manh phai ghep lai dung thu tu");
  assert.equal(ra[0].opcode, 0x1, "tin ghep phai mang opcode cua MANH DAU, khong phai 0");
  assert.equal(ra[0].fin, true);
  assert.equal(d.bufferedBytes(), 0);
}

/* ══ ③ BA MẢNH, VÀ MỘT TIN GHÉP RỒI MỘT TIN THƯỜNG NỐI ĐUÔI ════════════════ */
{
  const d = createFrameDecoder({ requireMasked: true });
  const byte = Buffer.concat([
    encodeFrame("mo", { masked: true, fin: false }),
    encodeFrame("-giua-", { masked: true, fin: false, opcode: 0x0 }),
    encodeFrame("dong", { masked: true, opcode: 0x0 }),
    encodeFrame("rieng", { masked: true })
  ]);
  const ra = d.push(byte);
  assert.equal(ra.length, 2, "mot tin ghep + mot tin thuong");
  assert.equal(ra[0].text, "mo-giua-dong");
  assert.equal(ra[1].text, "rieng");
  assert.equal(d.bufferedBytes(), 0);
}

/* ══ ④ KHUNG ĐIỀU KHIỂN XEN GIỮA — PHẢI RA NGAY, KHÔNG ĐỢI TIN GHÉP XONG ═══
 * RFC 6455 §5.4 cho phép chèn. Nuốt một cái ping vì "đang bận ghép" thì phía kia tưởng chết và
 * đóng kết nối — tức là đúng con bệnh cũ, chỉ đổi lối chết. */
{
  const d = createFrameDecoder({ requireMasked: true });
  const ra = d.push(Buffer.concat([
    encodeFrame("dau", { masked: true, fin: false }),
    encodeFrame("p", { masked: true, opcode: 0x9 }),
    encodeFrame("cuoi", { masked: true, opcode: 0x0 })
  ]));
  assert.equal(ra.length, 2);
  assert.equal(ra[0].opcode, 0x9, "ping phai ra TRUOC, ngay khi toi");
  assert.equal(ra[0].text, null, "khung dieu khien khong co text");
  assert.equal(ra[1].text, "daucuoi", "ping xen giua khong duoc lam ban tin ghep");
}

/* ══ ⑤ TRẦN TÍNH TRÊN TIN ĐÃ GHÉP ═════════════════════════════════════════
 * Đây là chỗ dễ mất nhất khi thêm tính năng ghép: kiểm từng mảnh thì mọi trần đều lách được
 * bằng cách cắt nhỏ ra, và một trần lách được thì không còn là trần. */
{
  const d = createFrameDecoder({ maxPayloadBytes: 100, requireMasked: true });
  d.push(encodeFrame(chu(60), { masked: true, fin: false }));
  assert.throws(() => d.push(encodeFrame(chu(60), { masked: true, opcode: 0x0 })),
    /exceeds the configured limit/, "60+60 > 100 thi phai nem, du tung manh deu duoi tran");

  /* Và vừa đúng trần thì vẫn phải qua — một cái chặn quá tay cũng là một lỗi. */
  const d2 = createFrameDecoder({ maxPayloadBytes: 100, requireMasked: true });
  d2.push(encodeFrame(chu(60), { masked: true, fin: false }));
  assert.equal(d2.push(encodeFrame(chu(40), { masked: true, opcode: 0x0 }))[0].payload.length, 100);
}

/* ══ ⑥ SAI TRÌNH TỰ LÀ LỖI GIAO THỨC, KHÔNG PHẢI CA CHƯA VIẾT ═════════════ */
{
  const a = createFrameDecoder({ requireMasked: true });
  assert.throws(() => a.push(encodeFrame("lac", { masked: true, opcode: 0x0 })),
    /nothing to continue/, "manh noi ma khong co tin nao dang do");

  const b = createFrameDecoder({ requireMasked: true });
  b.push(encodeFrame("dang do", { masked: true, fin: false }));
  assert.throws(() => b.push(encodeFrame("chen ngang", { masked: true })),
    /interrupted a fragmented message/, "tin moi khong duoc chen vao giua mot tin dang ghep");

  /* Khung điều khiển bị cắt mảnh là sai chuẩn ở CẢ HAI ĐẦU. */
  assert.throws(() => encodeFrame("p", { opcode: 0x9, fin: false }), /Control frames/);
  assert.throws(() => createFrameDecoder({}).push(Buffer.from([0x09, 0x01, 0x70])), /Control frames/);
}

/* ══ ⑦ BỘ MÃ HOÁ NÓI ĐƯỢC THỨ BỘ GIẢI MÃ NGHE ĐƯỢC ════════════════════════
 * Một bộ mã hoá không diễn đạt nổi cái mà bộ giải mã vừa học nghe là một cặp lệch — và lệch kiểu
 * đó chỉ lộ ra ở lượt đầu tiên có người cần gửi một tin lớn. */
{
  assert.equal(encodeFrame("x", { fin: false })[0] & 0x80, 0, "fin:false phai TAT bit FIN");
  assert.equal(encodeFrame("x", { fin: false })[0] & 0x0f, 0x1, "fin khong duoc lam hong opcode");
  assert.equal(encodeFrame("x", { opcode: 0x0 })[0], 0x80, "manh cuoi: FIN bat, opcode 0");
}

/* ══ ⑧ MỘT TIN 1 MiB, CẮT THÀNH 17 MẢNH ═══════════════════════════════════ */
{
  const MiB = 1024 * 1024;
  const goc1 = crypto.randomBytes(MiB);
  const d = createFrameDecoder({ maxPayloadBytes: 2 * MiB, requireMasked: true });
  const CO = 64 * 1024;
  const ra = [];
  for (let i = 0; i < goc1.length; i += CO) {
    const lat = goc1.subarray(i, i + CO);
    const cuoi = i + CO >= goc1.length;
    ra.push(...d.push(encodeFrame(lat, { masked: true, fin: cuoi, opcode: i === 0 ? 0x1 : 0x0 })));
  }
  assert.equal(ra.length, 1, "17 manh phai cho ra dung mot tin");
  assert.equal(Buffer.compare(ra[0].payload, goc1), 0, "tin ghep phai trung TUNG BYTE voi ban goc");
}

/* ══ ⑨ ĐI TRỌN QUA DÂY THẬT ════════════════════════════════════════════════
 * Ba khối trên chạy thẳng vào bộ giải mã. Khối này đi đúng con đường của Chrome: socket thật →
 * nâng cấp giao thức → bắt tay → một lượt RPC mà câu trả lời **đúng 1 MiB, cắt thành mảnh**.
 * Bộ nhớ của tôi có một dòng vì sao phải có khối này: một bản giả mã hoá đúng niềm tin của chính
 * tôi, và niềm tin đó đã sai ít nhất một lần dù 15 phép ghim xanh. */
{
  const TOKEN = crypto.randomBytes(32).toString("base64url");
  const CONG = 39937;
  const PROTO = "duc-scouter.bridge";
  const ORIGIN = "chrome-extension://" + "abcdefghijklmnop".repeat(2);
  const may = createBridgeHostCore({
    pairing: {
      schema_version: 1, host: "127.0.0.1", port: CONG,
      http_url: `http://127.0.0.1:${CONG}/v1/rpc`,
      websocket_url: `ws://127.0.0.1:${CONG}/v1/extension`,
      token: TOKEN
    },
    protocol: PROTO
  });
  await may.start();

  const socket = net.connect(CONG, "127.0.0.1");
  const nhan = [];
  let doiCho = null;
  let daNangCap = false;
  const giaiMa = createFrameDecoder({ maxPayloadBytes: 2 * 1024 * 1024, requireMasked: false });
  socket.on("data", (chunk) => {
    let phan = chunk;
    if (!daNangCap) {
      const vt = chunk.indexOf("\r\n\r\n");
      if (vt < 0) return;
      daNangCap = true;
      phan = chunk.subarray(vt + 4);
      if (!phan.length) return;
    }
    for (const k of giaiMa.push(phan)) if (k.opcode === 0x1) nhan.push(JSON.parse(k.text));
    if (doiCho) { const f = doiCho; doiCho = null; f(); }
  });
  const cho = () => new Promise((xong) => {
    if (nhan.length) return xong();
    doiCho = xong;
    setTimeout(() => { if (doiCho) { doiCho = null; xong(); } }, 4000);
  });
  const gui = (v) => socket.write(encodeFrame(JSON.stringify(v), { masked: true }));

  try {
    await new Promise((ok) => socket.once("connect", ok));
    socket.write([
      "GET /v1/extension HTTP/1.1", `Host: 127.0.0.1:${CONG}`,
      "Upgrade: websocket", "Connection: Upgrade", `Origin: ${ORIGIN}`,
      "Sec-WebSocket-Key: " + crypto.randomBytes(16).toString("base64"),
      "Sec-WebSocket-Version: 13", "\r\n"
    ].join("\r\n"));

    const nonce = crypto.randomBytes(32).toString("base64url");
    gui({ type: "auth_challenge", role: "extension", nonce });
    await cho();
    assert.equal(nhan.shift()?.proof, hostProof(TOKEN, nonce), "bat tay hong");
    gui({ type: "auth", role: "extension", token: TOKEN, instance: { schema_version: 1, instance_id: "ghep-12345678", label: "ghep" } });
    await cho();
    assert.equal(nhan.shift()?.type, "auth_ok", "vao khong duoc");

    /* Lượt gọi HTTP. Không `await` ở đây: câu trả lời chỉ tới sau khi extension giả trả lời. */
    const requestId = crypto.randomUUID();
    const traLoi = new Promise((ok, no) => {
      const req = http.request({
        host: "127.0.0.1", port: CONG, path: "/v1/rpc", method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` }
      }, (res) => {
        const manh = [];
        res.on("data", (c) => manh.push(c));
        res.on("end", () => ok({ status: res.statusCode, than: Buffer.concat(manh) }));
      });
      req.on("error", no);
      req.end(JSON.stringify({ protocol: PROTO, version: 1, kind: "request", request_id: requestId, method: "scout.grab", params: {} }));
    });

    await cho();
    const hoi = nhan.shift();
    assert.equal(hoi?.type, "rpc", "may chu phai chuyen tiep luot goi xuong extension");

    /* Câu trả lời ĐÚNG 1 MiB tính theo byte trên dây — chèn thêm chữ vào `data` cho tròn số.
     * Trần của bộ giải mã phía máy chủ là `MAX_ENVELOPE_BYTES + 8192`, nên 1 MiB nằm gọn trong
     * khoảng hở mà chính lõi đã chừa ra. */
    const dung = (n) => JSON.stringify({
      protocol: PROTO, version: 1, kind: "response", request_id: requestId, ok: true,
      result: { data: "u".repeat(Math.max(0, n)) }
    });
    const MiB = 1024 * 1024;
    const than = Buffer.from(dung(MiB - Buffer.byteLength(dung(0))), "utf8");
    assert.equal(than.length, MiB, "than tin phai dung 1 MiB — day la con so dang ghim");

    /* Cắt mảnh ĐÚNG KIỂU CHROME: nhiều mảnh 64 KiB, mảnh đầu mang opcode, mảnh sau mang 0. */
    const CO = 64 * 1024;
    const tin = Buffer.from(JSON.stringify({ type: "rpc_response", relay_id: hoi.relay_id, envelope: JSON.parse(than.toString("utf8")) }), "utf8");
    let soManh = 0;
    for (let i = 0; i < tin.length; i += CO) {
      const lat = tin.subarray(i, i + CO);
      const cuoi = i + CO >= tin.length;
      socket.write(encodeFrame(lat, { masked: true, fin: cuoi, opcode: i === 0 ? 0x1 : 0x0 }));
      soManh += 1;
    }
    assert.ok(soManh > 1, "phai that su cat manh, neu khong khoi nay khong chung minh gi");
    assert.ok(tin.length > MAX_ENVELOPE_BYTES * 0.9, "tin phai that su lon");

    const { status, than: ra } = await traLoi;
    assert.equal(status, 200, "luot goi phai ve 200, khong phai dut day");
    const bao = JSON.parse(ra.toString("utf8"));
    assert.equal(bao.ok, true, `phai thanh cong, nhan duoc: ${JSON.stringify(bao).slice(0, 200)}`);
    assert.equal(bao.request_id, requestId);
    assert.equal(bao.result.data.length, JSON.parse(than.toString("utf8")).result.data.length,
      "tung ky tu cua cau tra loi phai qua duoc day");
  } finally {
    socket.destroy();
    await may.stop();
  }
}

console.log("ghep-manh-noi: PASS (9 khoi, co mot tin 1 MiB cat manh di qua socket that)");

#!/usr/bin/env node
/* scouter-bridge-host.mjs — Bridge của Scouter: một LỚP ĐỨNG TRƯỚC, không phải bản thứ tư.
 *
 * ---- VÌ SAO KHÔNG DỰNG BẢN MỚI HẲN -----------------------------------------
 * Đức chốt 07/09: *"ta hoàn toàn có thể xây một bridge mới cho scouter & seed framework này,
 * ta đang phát triển toàn bộ luồng làm việc nên cần mở thông luồng cho tất cả các tính năng"*.
 *
 * Nhưng repo đã có BA bản sao của cùng một máy chủ (mỗi gói `duc-auto-*` một bản), và giới hạn
 * ② của chính Đức (07/09) cấm cài một tính năng hai lần. Bản thứ tư sẽ là bản thứ tư của
 * WebSocket, khung nhị phân, ghép cặp, và định tuyến nhiều phiên Chrome — bốn thứ khó, đã chạy
 * đúng, và **đã đóng băng nên không còn trôi đi đâu nữa**.
 *
 * Nên file này CHỈ làm phần còn thiếu, và chuyển tiếp phần đã có:
 *
 *     AI / CLI  →  :<cổng của tôi>/v1/rpc
 *                    ├── file.* · host.*      → xử lý TẠI ĐÂY (đĩa)
 *                    └── mọi method còn lại   → chuyển tiếp sang host cũ → WebSocket → extension
 *
 * Host cũ chạy TRONG CÙNG tiến trình này (`createBridgeHost`), nên Đức vẫn bật một lệnh duy
 * nhất. Gói ChatGPT chỉ bị ĐỌC, đúng luật vùng đóng băng.
 *
 * ---- HAI CHỖ SẼ LÀM NGƯỜI ĐỌC VẤP, NÓI TRƯỚC -------------------------------
 * ⑴ Chuỗi giao thức vẫn là `duc-auto-chatgpt.bridge`. Tên xấu cho một gói tên Scouter, nhưng
 *    đó là chuỗi mà **extension đang nói** (`scouter-bridge-core.mjs`) và host cũ đang kiểm.
 *    Đổi tên ở đây là làm gãy cả hai đầu để đẹp một cái tên.
 * ⑵ Cùng một tệp ghép cặp, hai cổng. Cổng trong tệp là của host cũ (extension nối vào đó);
 *    cổng của tôi mặc định là cổng đó **+1**. Dùng chung token vì đây cùng một vùng tin cậy —
 *    ai vào được cổng này thì cũng vào được cổng kia.
 *
 * Chạy:
 *   node bridge/scouter-bridge-host.mjs --pairing <tệp.json> --root <thư-mục-ghi> [--port N]
 */
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { docFile, FileError, ghiFile, lietKe, MAX_FILE_BYTES } from "./file-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const HOST_CU_DIR = path.resolve(HERE, "..", "..", "..", "duc-auto-chatgpt", "v0.1.0",
  "duc-auto-chatgpt-loopback-bridge-host-v1");

export const PROTOCOL = "duc-auto-chatgpt.bridge";       // xem ⑴ ở khối đầu file
export const LOOPBACK = "127.0.0.1";
export const MAX_ENVELOPE_BYTES = 1024 * 1024;

/* Method do CHÍNH máy chủ này trả lời. Mọi cái tên khác đi thẳng sang host cũ — kể cả tên
 * không tồn tại, vì host cũ và extension mới là nơi biết bảng method thật. Giữ danh sách ở đây
 * mà đoán hộ chúng là dựng bản sao thứ hai của một bảng, đúng thứ file này tránh. */
const METHOD_TAI_CHO = Object.freeze({
  "host.capabilities": true,
  "file.write": true,
  "file.append": true,
  "file.read": true,
  "file.list": true
});

const loiPhongBi = (requestId, code, message, details) => ({
  protocol: PROTOCOL, version: 1, kind: "response",
  request_id: typeof requestId === "string" ? requestId : null,
  ok: false,
  error: { code, message, retryable: false, details: details || {} },
  responded_at: new Date().toISOString()
});

const okPhongBi = (requestId, result) => ({
  protocol: PROTOCOL, version: 1, kind: "response",
  request_id: requestId, ok: true, result,
  responded_at: new Date().toISOString()
});

function traLoi(response, status, value) {
  const body = Buffer.from(JSON.stringify(value), "utf8");
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "content-length": body.length });
  response.end(body);
}

async function docThan(request, max) {
  const phan = [];
  let tong = 0;
  for await (const mieng of request) {
    tong += mieng.length;
    if (tong > max) {
      const error = new Error("body too large");
      error.code = "LIMIT";
      throw error;
    }
    phan.push(mieng);
  }
  return Buffer.concat(phan);
}

/* So token theo THỜI GIAN KHÔNG ĐỔI. `===` trên chuỗi thoát sớm ở ký tự lệch đầu tiên, và
 * chênh lệch đó đo được qua mạng — kể cả trên loopback. Host cũ làm đúng thế; làm khác đi ở
 * đây là để hở đúng chỗ nó đã bịt. */
function cungToken(mongDoi, nhanDuoc) {
  const a = Buffer.from(String(mongDoi));
  const b = Buffer.from(String(nhanDuoc || ""));
  if (a.length !== b.length) return false;
  let lech = 0;
  for (let i = 0; i < a.length; i += 1) lech |= a[i] ^ b[i];
  return lech === 0;
}

/* ---- Bốn method đĩa ------------------------------------------------------
 * Chúng mỏng có chủ ý: mọi phép kiểm thật nằm trong `file-core.mjs`, nơi ghim được mà không
 * cần mở cổng. Ở đây chỉ có việc bóc tham số và đổi `FileError` thành phong bì. */
function xuLyTaiCho(method, params, { root, port, portHostCu }) {
  const p = params && typeof params === "object" && !Array.isArray(params) ? params : {};
  switch (method) {
    case "host.capabilities":
      return {
        host: "scouter-bridge-host",
        protocol: PROTOCOL,
        port,
        relay_port: portHostCu,
        write_root: root,
        max_file_bytes: MAX_FILE_BYTES,
        local_methods: Object.keys(METHOD_TAI_CHO),
        /* Nói thẳng cái KHÔNG có, đừng bắt người gọi suy ra từ chỗ vắng mặt. */
        absent: { "file.delete": "Xoá file là việc phải hỏi Đức trước (luật gốc). Chưa mở." },
        note: "Mọi method khác đi thẳng sang extension qua host cũ."
      };
    case "file.write":
      return ghiFile(root, p.path, p.content, { append: false, encoding: p.encoding || "utf8" });
    case "file.append":
      return ghiFile(root, p.path, p.content, { append: true, encoding: p.encoding || "utf8" });
    case "file.read":
      return docFile(root, p.path, { encoding: p.encoding || "utf8" });
    case "file.list":
      return lietKe(root, p.path === undefined || p.path === null ? "." : p.path);
    default:
      throw new FileError("METHOD_NOT_FOUND", `Không có method '${method}' ở tầng máy chủ.`);
  }
}

/**
 * @param {object} opts
 * @param {object} opts.pairing  tệp ghép cặp ĐÃ kiểm (dùng `validatePairing` của host cũ)
 * @param {string} opts.root     thư mục gốc cho mọi lượt ghi — do NGƯỜI KHỞI ĐỘNG khai
 * @param {number} [opts.port]   cổng của lớp này; mặc định `pairing.port + 1`
 * @param {object} [opts.hostCu] host cũ đã dựng sẵn (dùng cho phép ghim); mặc định tự dựng
 */
export async function createScouterBridge({ pairing, root, port, hostCu, relayFetch } = {}) {
  if (!pairing || typeof pairing !== "object") throw new Error("Thiếu tệp ghép cặp.");
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("`--root` phải là một đường dẫn TUYỆT ĐỐI: vùng ghi do người khởi động khai, không do lệnh trên dây khai.");
  }
  if (!fs.existsSync(root)) throw new Error(`Thư mục gốc không tồn tại: ${root}`);

  /* ---- VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP (07/09) ----------------------
   * `file.read` đọc được MỌI file nằm dưới `--root`, không trừ cái nào — đó là thiết kế, vì một
   * danh sách trừ thì sớm muộn sót. Hệ quả: nếu `--root` trỏ vào thư mục đang chứa tệp ghép cặp
   * thì một lệnh `file.read` trên dây **lấy được chính cái token** đang bảo vệ cửa Bridge. Kẻ
   * gọi đã có token mới gọi được, nên đây không phải đường leo thang từ số không — nhưng nó
   * biến một token đang nằm trên đĩa của Đức thành một thứ **đọc qua dây được**, và từ đó nó đi
   * xa tuỳ ý người ở đầu dây.
   *
   * Đây KHÔNG phải rủi ro lý thuyết: quy ước có sẵn trên máy Đức là
   * `Chrome Extension Bridge/<tên>/` chứa **cả** `bridge-host.mjs` **lẫn** `<tên>-pairing-v1.json`,
   * và trỏ `--root` vào đúng thư mục đó là điều tự nhiên nhất để làm. Đức hỏi đúng câu đó
   * ngày 07/09, và câu trả lời phải là một cái chặn chứ không phải một lời dặn.
   *
   * Chặn ở LÚC KHỞI ĐỘNG, không phải lúc đọc: hỏng lúc khởi động thì người bật thấy ngay và
   * sửa được; hỏng lúc đọc thì nó im cho tới đúng lượt gọi lấy mất token. */
  const goiThat = fs.realpathSync(root);
  for (const ten of fs.readdirSync(goiThat)) {
    if (!/pairing.*\.json$/i.test(ten)) continue;
    throw new Error([
      `Vùng ghi chứa tệp ghép cặp: ${path.join(root, ten)}`,
      "",
      "`file.read` đọc được mọi file dưới `--root`, nên để tệp ghép cặp trong đó nghĩa là TOKEN",
      "đọc được qua dây. Trỏ `--root` vào một thư mục con chỉ chứa dữ liệu, ví dụ:",
      `  --root "${path.join(root, "du-lieu")}"`
    ].join("\n"));
  }

  const congToi = Number.isInteger(port) ? port : pairing.port + 1;
  if (congToi === pairing.port) throw new Error("Cổng của lớp này phải khác cổng host cũ.");

  /* Host cũ chạy trong cùng tiến trình. Bơm vào được (`hostCu`) để phép ghim đo lớp này mà
   * không phải mở WebSocket thật. */
  let ben = hostCu;
  if (!ben) {
    const url = `file://${path.join(HOST_CU_DIR, "bridge-host.mjs").split(path.sep).join("/")}`;
    const { createBridgeHost } = await import(url);
    ben = createBridgeHost({ pairing });
  }

  /* Chuyển tiếp: gửi NGUYÊN VĂN thân đã nhận, trả NGUYÊN VĂN thứ host cũ đáp. Không bóc, không
   * dựng lại — bóc ra rồi dựng lại là chỗ hai bản của một giao thức bắt đầu lệch nhau. */
  const chuyenTiep = relayFetch || (async (body) => {
    const r = await fetch(`http://${LOOPBACK}:${pairing.port}/v1/rpc`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${pairing.token}` },
      body
    });
    return { status: r.status, text: await r.text() };
  });

  const server = http.createServer(async (request, response) => {
    if (request.url !== "/v1/rpc" || request.method !== "POST") {
      traLoi(response, 404, { ok: false, code: "NOT_FOUND" });
      return;
    }
    /* Trình duyệt gắn `Origin` cho mọi lượt gọi chéo nguồn. Có nó nghĩa là lượt này tới từ một
     * TRANG WEB, không phải từ công cụ — và một trang web không được sai khiến máy chủ này.
     * Host cũ chặn y hệt; đây là chỗ dễ quên nhất khi dựng lớp mới đứng trước. */
    if (request.headers.origin !== undefined) {
      traLoi(response, 403, loiPhongBi(null, "FORBIDDEN", "Lượt gọi từ một trang web bị từ chối."));
      return;
    }
    const auth = String(request.headers.authorization || "");
    if (!auth.startsWith("Bearer ") || !cungToken(pairing.token, auth.slice(7))) {
      traLoi(response, 401, loiPhongBi(null, "UNAUTHENTICATED", "Thiếu hoặc sai token ghép cặp."));
      return;
    }

    let than;
    let phongBi;
    try {
      than = await docThan(request, MAX_ENVELOPE_BYTES);
      phongBi = JSON.parse(than.toString("utf8"));
    } catch (error) {
      traLoi(response, error?.code === "LIMIT" ? 413 : 400, loiPhongBi(null, "INVALID_ENVELOPE", "Phong bì không đọc được."));
      return;
    }

    const method = phongBi?.method;
    if (!Object.hasOwn(METHOD_TAI_CHO, String(method))) {
      /* KHÔNG phải việc của tôi — chuyển tiếp và đứng ra ngoài. */
      try {
        const ra = await chuyenTiep(than);
        response.writeHead(ra.status, { "content-type": "application/json; charset=utf-8" });
        response.end(ra.text);
      } catch (error) {
        traLoi(response, 502, loiPhongBi(phongBi?.request_id, "TRANSPORT_DISCONNECTED",
          `Không chuyển tiếp được sang host cũ: ${String(error?.message || error)}`));
      }
      return;
    }

    try {
      traLoi(response, 200, okPhongBi(phongBi.request_id, xuLyTaiCho(method, phongBi.params, {
        root, port: congToi, portHostCu: pairing.port
      })));
    } catch (error) {
      if (error instanceof FileError) {
        traLoi(response, 200, loiPhongBi(phongBi.request_id, error.code, error.message, error.details));
        return;
      }
      traLoi(response, 200, loiPhongBi(phongBi.request_id, "INTERNAL_ERROR", String(error?.message || error)));
    }
  });

  return Object.freeze({
    async start() {
      await ben.start();
      await new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(congToi, LOOPBACK, () => { server.off("error", reject); resolve(); });
      });
      return { port: congToi, relay_port: pairing.port, root };
    },
    async stop() {
      await new Promise((resolve) => server.close(resolve));
      await ben.stop();
    },
    port: () => congToi,
    address: () => server.address()
  });
}

/* ---- Chạy trực tiếp ------------------------------------------------------ */
function thamSo(ten) {
  const i = process.argv.indexOf(ten);
  return i >= 0 ? process.argv[i + 1] : null;
}

if (process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("/scouter-bridge-host.mjs")) {
  const tepGhepCap = thamSo("--pairing");
  const goc = thamSo("--root");
  if (!tepGhepCap || !goc) {
    process.stderr.write("Dùng: node bridge/scouter-bridge-host.mjs --pairing <tệp.json> --root <thư-mục> [--port N]\n");
    process.stderr.write("  --root là VÙNG GHI. Mọi lượt file.* bị nhốt trong đó; lệnh trên dây không nới ra được.\n");
    process.exit(2);
  }
  const url = `file://${path.join(HOST_CU_DIR, "bridge-host.mjs").split(path.sep).join("/")}`;
  const { validatePairing } = await import(url);
  const pairing = validatePairing(JSON.parse(fs.readFileSync(tepGhepCap, "utf8")));
  const cong = thamSo("--port");
  const bridge = await createScouterBridge({
    pairing, root: path.resolve(goc), port: cong ? Number(cong) : undefined
  });
  const ra = await bridge.start();
  process.stdout.write(`Scouter bridge: cổng ${ra.port} · chuyển tiếp sang ${ra.relay_port} · vùng ghi ${ra.root}\n`);
  const tat = async () => { await bridge.stop(); process.exit(0); };
  process.on("SIGINT", tat);
  process.on("SIGTERM", tat);
}

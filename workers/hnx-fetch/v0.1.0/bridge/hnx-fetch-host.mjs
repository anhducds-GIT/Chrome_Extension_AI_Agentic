/* hnx-fetch-host.mjs — MÁY CHỦ BRIDGE CỦA HNX FETCH. Host riêng, mỏng.
 *
 * ─── VÌ SAO GÓI NÀY PHẢI CÓ HOST RIÊNG ─────────────────────────────────────
 * Extension khai giao thức `hnx-fetch.bridge` (xem `scripts/bridge-core.mjs`). Lõi máy chủ
 * dùng chung **so khớp tên giao thức trên MỌI phong bì** — nên một host khởi động cho Scouter
 * (`duc-scouter.bridge`) sẽ **từ chối** mọi phong bì của HNX Fetch. Ghép cặp bằng tệp của
 * Scouter thì tệp đó *hợp lệ* (cùng cổng, cùng token) nhưng bắt tay vẫn **không thành**, và
 * bảng bên chỉ báo *"Mất kết nối"* mà không nói vì sao.
 *
 * Đó là hành vi ĐÚNG, không phải lỗi cần vá: tên giao thức là thứ giữ cho hai extension trên
 * cùng một máy không nhận nhầm lệnh của nhau. Cái phải thêm là **host này**, không phải nới
 * lỏng phép so khớp kia.
 *
 * ─── FILE NÀY CHỈ LÀM BA VIỆC ──────────────────────────────────────────────
 *   ⑴ khai tên giao thức của CHÍNH gói này
 *   ⑵ cắm nhóm `file.*` vào móc `methodTaiCho` của lõi
 *   ⑶ canh vùng ghi — gồm cái chặn "vùng ghi không được chứa tệp ghép cặp"
 *
 * Mọi thứ khác (bắt tay hai chiều · chặn Origin · so token thời gian hằng · định tuyến
 * fail-closed · trần lượt đang bay) nằm ở `workers/_shared/bridge-host/`, dùng chung với
 * Scouter — nên một bản vá an toàn ở lõi tới được cả hai gói cùng lúc. Đây chính là chỗ ba gói
 * `duc-auto-*` làm sai và phải trả giá (`S-11`).
 *
 * Chạy:
 *   node bridge/hnx-fetch-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeHostCore, MAX_ENVELOPE_BYTES, validatePairing } from "../../../_shared/bridge-host/bridge-host-core.mjs";
import { docFile, FileError, ghiFile, lietKe, MAX_FILE_BYTES } from "./file-core.mjs";

/* Tên giao thức của CHÍNH gói này. Nó phải khớp TỪNG KÝ TỰ với `PROTOCOL` trong
 * `scripts/bridge-core.mjs` — hai đầu của một sợi dây. Phép ghim `be-mat-hep-smoke.mjs` khối ⑸
 * so hai chỗ đó, vì lệch nhau thì extension nối mãi không được mà không có câu lỗi nào nói tại sao. */
export const PROTOCOL = "hnx-fetch.bridge";
export { MAX_ENVELOPE_BYTES };
export const LOOPBACK = "127.0.0.1";

const METHOD_TAI_CHO = Object.freeze(["host.capabilities", "file.write", "file.append", "file.read", "file.list"]);

/* ---- VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP -------------------------------
 * `file.read` đọc được MỌI file dưới vùng ghi — đó là thiết kế, vì một danh sách trừ thì sớm
 * muộn sót. Hệ quả: vùng ghi trỏ vào thư mục đang giữ tệp ghép cặp nghĩa là **token đọc được
 * qua dây**.
 *
 * Không phải rủi ro lý thuyết: quy ước trên máy Đức là một thư mục chứa CẢ máy chủ LẪN tệp ghép
 * cặp, nên trỏ vùng ghi vào đúng đó là việc tự nhiên nhất để làm. Cái bẫy mà người ta rơi vào
 * một cách tự nhiên thì phải CHẶN, không phải dặn. Chặn lúc KHỞI ĐỘNG: hỏng lúc khởi động thì
 * người bật thấy ngay; hỏng lúc đọc thì nó im cho tới đúng lượt gọi lấy mất token. */
function canhVungGhi(root) {
  if (typeof root !== "string" || !path.isAbsolute(root)) {
    throw new Error("`--root` phải là một đường dẫn TUYỆT ĐỐI: vùng ghi do người khởi động khai, không do lệnh trên dây khai.");
  }
  if (!fs.existsSync(root)) throw new Error(`Thư mục gốc không tồn tại: ${root}`);
  const goiThat = fs.realpathSync(root);
  for (const ten of fs.readdirSync(goiThat)) {
    if (!/pairing.*\.json$/i.test(ten)) continue;
    throw new Error([
      `Vùng ghi chứa tệp ghép cặp: ${path.join(root, ten)}`,
      "",
      "`file.read` đọc được mọi file dưới vùng ghi, nên để tệp ghép cặp trong đó nghĩa là TOKEN",
      "đọc được qua dây. Trỏ `--root` vào một thư mục con chỉ chứa dữ liệu, ví dụ:",
      `  --root "${path.join(root, "du-lieu")}"`
    ].join("\n"));
  }
  return goiThat;
}

function xuLyTaiCho(method, p, root, port) {
  switch (method) {
    case "host.capabilities":
      return {
        host: "hnx-fetch-host",
        protocol: PROTOCOL,
        port,
        write_root: root,
        max_file_bytes: MAX_FILE_BYTES,
        local_methods: [...METHOD_TAI_CHO],
        /* Nói thẳng cái KHÔNG có, đừng bắt người gọi suy ra từ chỗ vắng mặt. */
        absent: { "file.delete": "Xoá file là việc phải hỏi Đức trước (luật gốc). Chưa mở." },
        note: "Mọi method khác đi thẳng xuống extension qua WebSocket. Extension này chỉ có scout.fetch."
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
 * @param {object} o
 * @param {object} o.pairing  tệp ghép cặp
 * @param {string} o.root     vùng ghi — đường dẫn TUYỆT ĐỐI, do người khởi động khai
 */
export function createHnxFetchBridge({ pairing, root, ...conLai } = {}) {
  const daKiem = validatePairing(pairing);
  const gocThat = canhVungGhi(root);

  /* Bảng `methodTaiCho` dựng từ MỘT danh sách tên, không gõ hai lần: `host.capabilities` tự khai
   * `local_methods` từ cùng danh sách đó, nên bảng và bản tự khai không thể lệch nhau. */
  const methodTaiCho = Object.fromEntries(METHOD_TAI_CHO.map((ten) => [
    ten,
    async (params) => xuLyTaiCho(ten, params && typeof params === "object" && !Array.isArray(params) ? params : {}, gocThat, daKiem.port)
  ]));

  return createBridgeHostCore({ ...conLai, pairing: daKiem, protocol: PROTOCOL, methodTaiCho });
}

/* ---- Chạy thẳng từ dòng lệnh --------------------------------------------- */
function thamSo(ten) {
  const i = process.argv.indexOf(ten);
  return i >= 0 ? process.argv[i + 1] : null;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const duongGhepCap = thamSo("--pairing");
  const goc = thamSo("--root");
  if (!duongGhepCap || !goc) {
    process.stderr.write("Dùng: node bridge/hnx-fetch-host.mjs --pairing <tệp> --root <thư-mục>\n");
    process.stderr.write("  --root là VÙNG GHI. Mọi lượt file.* bị nhốt trong đó; lệnh trên dây không nới ra được.\n");
    process.exit(2);
  }
  const pairing = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
  const may = createHnxFetchBridge({ pairing, root: path.resolve(goc) });
  await may.start();
  process.stdout.write(`HNX Fetch Bridge nghe ở 127.0.0.1:${pairing.port} · giao thức: ${PROTOCOL} · vùng ghi: ${path.resolve(goc)}\n`);
  const dong = async () => { await may.stop(); process.exit(0); };
  process.on("SIGINT", dong);
  process.on("SIGTERM", dong);
}

/* scouter-bridge-host.mjs — MÁY CHỦ BRIDGE CỦA SCOUTER. Host riêng, không mượn của ai.
 *
 * ══ ĐỔI HƯỚNG 07/09 — Đức chốt, thay ADR-0004 ══
 *
 * Bản trước của file này là một **lớp đứng TRƯỚC** host của `duc-auto-chatgpt`: `file.*` xử tại
 * chỗ, mọi method khác chuyển tiếp sang host kia chạy trong cùng tiến trình. Ý định đúng (né
 * fork), nhưng hai chỗ hỏng mà Đức chỉ ra:
 *
 *   ⑴ Scouter phụ thuộc **lúc chạy** vào một gói ĐÃ ĐÓNG BĂNG. Host cần sửa thì không sửa được,
 *      và cũng không được phép sửa.
 *   ⑵ Tên giao thức là `"duc-auto-chatgpt.bridge"` — một cái seed sắp nhân bản ra nhiều
 *      extension mà mang tên một sản phẩm khác thì bản clone nào cũng kéo theo cái tên đó.
 *
 * Nhưng "thì chép một bản như ba gói kia" cũng sai, và có số: `bridge-host.mjs` có **3 bản chép,
 * KHÁC NHAU cả ba** (461/451/450 dòng), và 11 dòng khác biệt chính là **cái bắt tay hai chiều**
 * — một bản vá an toàn làm ở một bản chép, không bao giờ tới hai bản kia.
 *
 * Đường thứ ba, và nó là luật sẵn có của repo (`AGENTS.md` mục 3, luật 2): **lõi vào
 * `workers/_shared/`, mỗi extension một host MỎNG**. File này là cái host mỏng đó.
 *
 * ══ FILE NÀY CHỈ CÒN LÀM BA VIỆC ══
 *   ⑴ khai tên giao thức của CHÍNH Scouter
 *   ⑵ cắm nhóm `file.*` vào móc `methodTaiCho` của lõi
 *   ⑶ canh vùng ghi — gồm cái chặn "vùng ghi không được chứa tệp ghép cặp"
 *
 * Mọi thứ khác (bắt tay hai chiều · chặn Origin · so token thời gian hằng · định tuyến
 * fail-closed · trần lượt đang bay) nằm ở lõi, và **có phép ghim chứng minh lõi cư xử y hệt bản
 * gốc**: `workers/_shared/bridge-host/tests/tuong-duong-voi-ban-goc.mjs`.
 *
 * Chạy:
 *   node bridge/scouter-bridge-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeHostCore, MAX_ENVELOPE_BYTES, validatePairing } from "../../../_shared/bridge-host/bridge-host-core.mjs";
import { docFile, FileError, ghiFile, lietKe, MAX_FILE_BYTES } from "./file-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Tên giao thức của CHÍNH gói này. Nhân bản seed sang extension khác thì đổi đúng dòng này và
 * dòng cùng tên trong `scripts/scouter-bridge-core.mjs` — hai đầu của một sợi dây. */
export const PROTOCOL = "duc-scouter.bridge";
export { MAX_ENVELOPE_BYTES };
export const LOOPBACK = "127.0.0.1";

const METHOD_TAI_CHO = Object.freeze(["host.capabilities", "file.write", "file.append", "file.read", "file.list"]);

/* ---- VÙNG GHI KHÔNG ĐƯỢC CHỨA TỆP GHÉP CẶP (07/09) ------------------------
 * `file.read` đọc được MỌI file dưới vùng ghi — đó là thiết kế, vì một danh sách trừ thì sớm
 * muộn sót. Hệ quả: vùng ghi trỏ vào thư mục đang giữ tệp ghép cặp nghĩa là **token đọc được
 * qua dây**.
 *
 * Không phải rủi ro lý thuyết. Quy ước sẵn có trên máy Đức là `Chrome Extension Bridge/<tên>/`
 * chứa CẢ máy chủ LẪN tệp ghép cặp, nên trỏ vùng ghi vào đúng đó là việc tự nhiên nhất để làm —
 * Đức hỏi đúng câu đó ngày 07/09. Cái bẫy mà người ta rơi vào một cách tự nhiên thì phải CHẶN,
 * không phải dặn. Chặn lúc KHỞI ĐỘNG: hỏng lúc khởi động thì người bật thấy ngay; hỏng lúc đọc
 * thì nó im cho tới đúng lượt gọi lấy mất token. */
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
        host: "scouter-bridge-host",
        protocol: PROTOCOL,
        port,
        write_root: root,
        max_file_bytes: MAX_FILE_BYTES,
        local_methods: [...METHOD_TAI_CHO],
        /* Nói thẳng cái KHÔNG có, đừng bắt người gọi suy ra từ chỗ vắng mặt. */
        absent: { "file.delete": "Xoá file là việc phải hỏi Đức trước (luật gốc). Chưa mở." },
        note: "Mọi method khác đi thẳng xuống extension qua WebSocket."
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
export function createScouterBridge({ pairing, root, ...conLai } = {}) {
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
    process.stderr.write("Dùng: node bridge/scouter-bridge-host.mjs --pairing <tệp> --root <thư-mục>\n");
    process.stderr.write("  --root là VÙNG GHI. Mọi lượt file.* bị nhốt trong đó; lệnh trên dây không nới ra được.\n");
    process.exit(2);
  }
  const pairing = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
  const may = createScouterBridge({ pairing, root: path.resolve(goc) });
  await may.start();
  process.stdout.write(`Scouter Bridge nghe ở 127.0.0.1:${pairing.port} · vùng ghi: ${path.resolve(goc)}\n`);
  const dong = async () => { await may.stop(); process.exit(0); };
  process.on("SIGINT", dong);
  process.on("SIGTERM", dong);
}

export { HERE };

/* udin-optic-host.mjs — MÁY CHỦ BRIDGE CỦA UDIN OPTIC. Host riêng, không mượn của ai.
 *
 * Vỏ mỏng trên lõi dùng chung `workers/_shared/bridge-host/bridge-host-core.mjs`. Chép từ
 * `duc-scouter/v0.1.0/bridge/udin-optic-host.mjs` ngày 15/09 và đổi ĐÚNG MỘT chỗ: tên
 * giao thức. Mọi luật còn lại (bắt tay hai chiều · chặn Origin · so token thời gian hằng ·
 * định tuyến fail-closed · trần lượt đang bay · chặn "vùng ghi không được chứa tệp ghép cặp")
 * nằm ở lõi hoặc ở `file-core.mjs`, và **có phép ghim chứng minh lõi cư xử y hệt bản gốc**:
 * `workers/_shared/bridge-host/tests/tuong-duong-voi-ban-goc.mjs`.
 *
 * TỆP GHÉP CẶP RIÊNG, CỔNG RIÊNG — không dùng chung với Scouter:
 *   node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi udin-optic
 * Dùng chung một tệp thì hai extension cùng nối vào một máy chủ và mọi lượt gọi không nêu đích
 * trả `TARGET_AMBIGUOUS` — đúng chuyện đã xảy ra 08/09.
 *
 * Chạy:
 *   node workers/udin-optic/v0.1.0/bridge/udin-optic-host.mjs --pairing <tệp.json> [--root <thư-mục-ghi>]
 *
 * Bỏ `--root` thì vùng ghi do `vung-ghi.mjs` quyết định: `vung-ghi.txt` cạnh tệp ghép cặp, rồi
 * đến `anh-ra`. MỘT luật, một chỗ — hai bộ khởi động chỉ gọi vào, không giữ bản riêng.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBridgeHostCore, MAX_ENVELOPE_BYTES, validatePairing } from "../../../_shared/bridge-host/bridge-host-core.mjs";
import { timVungGhi, canhTrumLenNhau } from "./vung-ghi.mjs";
import { docFile, FileError, ghiFile, lietKe, MAX_FILE_BYTES } from "./file-core.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Tên giao thức của CHÍNH gói này. Nhân bản seed sang extension khác thì đổi đúng dòng này và
 * dòng cùng tên trong `scripts/bridge-core.mjs` — hai đầu của một sợi dây. */
export const PROTOCOL = "udin-optic.bridge";
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
        host: "udin-optic-bridge-host",
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
export function createUdinBridge({ pairing, root, ...conLai } = {}) {
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
  if (!duongGhepCap) {
    process.stderr.write("Dùng: node bridge/udin-optic-host.mjs --pairing <tệp> [--root <thư-mục>]\n");
    process.stderr.write("  --root là VÙNG GHI. Mọi lượt file.* bị nhốt trong đó; lệnh trên dây không nới ra được.\n");
    process.stderr.write("  Bỏ --root thì máy chủ tự tìm: vung-ghi.txt cạnh tệp ghép cặp, rồi đến anh-ra.\n");
    process.exit(2);
  }
  /* Vùng ghi do MỘT luật quyết định, nằm ở `vung-ghi.mjs` — xem đầu file đó để biết vì sao
   * nó không được nằm trong bộ khởi động. */
  const pairing = JSON.parse(fs.readFileSync(duongGhepCap, "utf8"));
  let chon;
  try {
    chon = timVungGhi({ duongGhepCap, root: thamSo("--root") });
    canhTrumLenNhau({ duongGhepCap, vungGhi: chon.duong });
    if (!fs.existsSync(chon.duong)) fs.mkdirSync(chon.duong, { recursive: true });
  } catch (loi) {
    /* Một dòng, không phải một bức tường stack trace. Đây đúng lúc Đức vừa gõ sai một dòng
     * trong `vung-ghi.txt` và cần biết mình sai ở đâu — stack trace của Node không nói điều đó. */
    process.stderr.write(`KHÔNG BẬT ĐƯỢC MÁY CHỦ: ${loi?.message || loi}
`);
    process.exit(2);
  }
  const may = createUdinBridge({ pairing, root: chon.duong });
  await may.start();
  /* NÓI RA vùng ghi LẤY TỪ ĐÂU, không chỉ nói nó ở đâu: Đức sửa `vung-ghi.txt` rồi bật lại mà
   * thấy đường cũ thì câu này là thứ duy nhất nói cho anh ấy biết tệp đó có được đọc hay không. */
  process.stdout.write(`Udin Optic Bridge nghe ở 127.0.0.1:${pairing.port} · vùng ghi: ${chon.duong} (lấy từ ${chon.tu})\n`);
  const dong = async () => { await may.stop(); process.exit(0); };
  process.on("SIGINT", dong);
  process.on("SIGTERM", dong);
}

export { HERE };

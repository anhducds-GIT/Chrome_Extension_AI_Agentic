/* NGUỒN SỰ THẬT DUY NHẤT VỀ HÌNH DẠNG REPO — `.repo-structure.json`.
 *
 * Vì sao có file này (K1, 2026-09-02): trước K1, bốn script cùng "biết" hình dạng repo bằng
 * cách viết cứng chuỗi vào code — `"workers"` là thư mục đơn vị, `"manifest.json"` là file
 * đánh dấu, `/^workers\//` là tiền tố quyền sở hữu. Đó KHÔNG phải luật chung; đó là hình dạng
 * riêng của repo Chrome. Hệ quả đo được: bộ LUẬT sạch 91% tên dự án, nhưng bộ MÁY không rời
 * khỏi repo này được. Một template mà bộ máy chỉ chạy đúng ở một bố cục thì không phải template.
 *
 * Cách chia việc ở đây, và lý do:
 *   - Hàm SUY RA (`unitsFrom`, `claimPrefixesFrom`) là hàm THUẦN, nhận object đã parse.
 *   - Việc ĐỌC file thì để mỗi bên tự làm, vì hai bên đọc từ hai nguồn khác nhau:
 *       · bộ sinh đọc từ HEAD (chỉ sự thật đã commit),
 *       · cổng đóng phiên và safe-push đọc từ CÂY LÀM VIỆC (phải thấy cả bản sửa dở).
 *     Gộp phần đọc vào đây là ép một trong hai bên đọc sai nguồn.
 *
 * FAIL CLOSED ở mọi chỗ: khai sai thì NÉM, không lặng lẽ lùi về mặc định. Lùi về mặc định là
 * kiểu hỏng tệ nhất — mọi thứ vẫn chạy, bảng vẫn sinh ra, nhưng đếm đơn vị ở SAI thư mục và
 * quy commit cho SAI chủ. Không khai gì thì mới dùng mặc định (giữ tương thích ngược).
 */

import fs from "node:fs";
import path from "node:path";

export const STRUCTURE_FILE = ".repo-structure.json";

/* Hình dạng đơn vị công việc. `depth` = số tầng thư mục dưới `root_dir` cho tới đơn vị:
     depth 2 → workers/<gói>/<phiên-bản>/manifest.json   (repo Chrome, hồ sơ P1)
     depth 1 → packages/<tên>/package.json               (monorepo phẳng)
     root_dir null → repo không có đơn vị con, chỉ có đơn vị GỐC (P2/P3/P4)  */
export const DEFAULT_UNITS = Object.freeze({ rootDir: "workers", marker: "manifest.json", depth: 2 });

/* Tiền tố quyền sở hữu: thư mục nào chia chủ theo từng gói con. Mặc định giữ hình dạng cũ. */
export const DEFAULT_CLAIM_PREFIXES = Object.freeze(["workers/"]);

export function unitsFrom(parsed) {
  const block = parsed?.units;
  if (block === undefined) return DEFAULT_UNITS;
  if (block === null || typeof block !== "object" || Array.isArray(block)) {
    throw new Error("UNITS_HONG: khối `units` trong .repo-structure.json phải là object (hoặc bỏ hẳn để dùng mặc định).");
  }
  const rootDir = block.root_dir === null ? null : (block.root_dir ?? DEFAULT_UNITS.rootDir);
  const marker = block.marker ?? DEFAULT_UNITS.marker;
  const depth = block.depth ?? DEFAULT_UNITS.depth;
  if (rootDir !== null && (typeof rootDir !== "string" || rootDir === "" || rootDir.includes("/"))) {
    throw new Error(`UNITS_HONG: units.root_dir phải là MỘT đoạn thư mục (ví dụ "workers"), hoặc null nếu repo không có đơn vị con. Đang là: ${JSON.stringify(block.root_dir)}`);
  }
  if (typeof marker !== "string" || marker === "" || marker.includes("/")) {
    throw new Error(`UNITS_HONG: units.marker phải là tên MỘT file (ví dụ "manifest.json"). Đang là: ${JSON.stringify(block.marker)}`);
  }
  if (!Number.isInteger(depth) || depth < 1 || depth > 4) {
    throw new Error(`UNITS_HONG: units.depth phải là số nguyên 1..4. Đang là: ${JSON.stringify(block.depth)}`);
  }
  return Object.freeze({ rootDir, marker, depth });
}

/* Đọc tiền tố quyền từ chính khối `areas` đã có sẵn — KHÔNG thêm khối cấu hình mới.
   `areas` đã khai `ownership_mode: "per-package"` kèm `claim_prefix` từ trước; chỉ là chưa
   script nào đọc. Thêm một khối thứ hai nói cùng một điều là tự tạo nguồn sự thật thứ hai. */
export function claimPrefixesFrom(parsed) {
  const areas = parsed?.areas;
  if (areas === undefined || areas === null) return DEFAULT_CLAIM_PREFIXES;
  if (typeof areas !== "object" || Array.isArray(areas)) {
    throw new Error("CAU_TRUC_HONG: khối `areas` phải là object.");
  }
  const prefixes = [];
  for (const [key, value] of Object.entries(areas)) {
    if (!value || typeof value !== "object" || value.ownership_mode !== "per-package") continue;
    const prefix = value.claim_prefix ?? key;
    if (typeof prefix !== "string" || prefix === "" || !prefix.endsWith("/")) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"].claim_prefix phải là chuỗi kết thúc bằng "/". Đang là: ${JSON.stringify(value.claim_prefix)}`);
    }
    prefixes.push(prefix);
  }
  // Không khai vùng chia-theo-gói nào là hợp lệ: repo một chủ duy nhất, mọi thứ thuộc `_root`.
  return Object.freeze(prefixes);
}

/* Gói một đường dẫn về "vùng sở hữu" của nó: `workers/abc/v1/x.js` → `workers/abc`.
   Không thuộc tiền tố nào thì thuộc `_root`. Dùng chung cho cổng đóng phiên và safe-push,
   vì hai chỗ đó từng có HAI bản regex riêng và đã lệch nhau một lần (26/08, đường dẫn
   tiếng Việt). Một hàm thì không lệch được. */
export function areaOf(relPath, prefixes = DEFAULT_CLAIM_PREFIXES) {
  for (const prefix of prefixes) {
    if (!relPath.startsWith(prefix)) continue;
    const rest = relPath.slice(prefix.length);
    const slash = rest.indexOf("/");
    if (slash <= 0) continue;            // ngay dưới tiền tố là FILE, không phải gói
    return `${prefix}${rest.slice(0, slash)}`;
  }
  return "_root";
}

/* Đọc từ CÂY LÀM VIỆC. Chỉ dành cho cổng đóng phiên và safe-push — hai chỗ buộc phải thấy
   cả bản sửa dở. Bộ sinh KHÔNG dùng hàm này: nó đọc từ HEAD qua deps của chính nó. */
export function readStructureFromDisk(root) {
  const file = path.join(root, STRUCTURE_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`CAU_TRUC_HONG: ${STRUCTURE_FILE} không phải JSON đọc được (${error.message}). Sửa file đó rồi chạy lại.`);
  }
}

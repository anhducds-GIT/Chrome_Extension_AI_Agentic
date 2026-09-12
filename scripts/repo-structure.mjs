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
export const DEFAULT_UNITS = Object.freeze({ rootDir: "workers", marker: "manifest.json", depth: 2, ten: "Đơn vị" });

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
  // TÊN GỌI của một đơn vị, dùng cho tiêu đề bảng và tên cột. Trước 03/09 bộ sinh đóng cứng
  // chữ "Extension" ở hai chỗ, nên MỌI repo dựng từ bộ khung đều nhận một bảng tên là "Bảng
  // điều hành Extension" với một cột tên "Extension" — kể cả repo tài liệu. Lộ ra ngay lần đầu
  // dựng thử một repo mới. Cùng họ với lỗi "bộ sinh đóng cứng tên repo gốc" mà audit đã bắt.
  const ten = block.ten ?? DEFAULT_UNITS.ten;
  // Cấm cả `..`, dấu gạch ngược và mọi dạng đường dẫn. Bản đầu chỉ cấm "/", nên trên Windows
  // một cấu hình dị dạng (`a\b`, `..`) không ném mà lặng lẽ quét sai thư mục.
  const badSegment = (value) => typeof value !== "string" || value === "" || value === "." || value === ".."
    || value.includes("/") || value.includes("\\");
  if (rootDir !== null && badSegment(rootDir)) {
    throw new Error(`UNITS_HONG: units.root_dir phải là MỘT đoạn thư mục (ví dụ "workers"), hoặc null nếu repo không có đơn vị con. Đang là: ${JSON.stringify(block.root_dir)}`);
  }
  if (badSegment(marker)) {
    throw new Error(`UNITS_HONG: units.marker phải là tên MỘT file (ví dụ "manifest.json"). Đang là: ${JSON.stringify(block.marker)}`);
  }
  if (typeof ten !== "string" || ten.trim() === "") {
    throw new Error(`UNITS_HONG: units.ten phải là một chữ không rỗng (ví dụ "Extension", "Gói", "Dịch vụ"). Đang là: ${JSON.stringify(block.ten)}`);
  }
  if (!Number.isInteger(depth) || depth < 1 || depth > 4) {
    throw new Error(`UNITS_HONG: units.depth phải là số nguyên 1..4. Đang là: ${JSON.stringify(block.depth)}`);
  }
  return Object.freeze({ rootDir, marker, depth, ten });
}

/* Đọc tiền tố quyền từ chính khối `areas` đã có sẵn — KHÔNG thêm khối cấu hình mới.
   `areas` đã khai `ownership_mode: "per-package"` kèm `claim_prefix` từ trước; chỉ là chưa
   script nào đọc. Thêm một khối thứ hai nói cùng một điều là tự tạo nguồn sự thật thứ hai. */
export function claimPrefixesFrom(parsed) {
  // `null` = KHÔNG có file cấu hình (repo chưa chuẩn hoá) → giữ hình dạng cũ, hợp lệ.
  // Có file mà thiếu `areas`, hoặc `areas: null` → NÉM. Bản đầu gộp hai ca này làm một, nên gõ
  // nhầm tên trường (`areass`) là lặng lẽ lùi về `workers/` và quy chủ sai cho mọi commit.
  if (parsed === null || parsed === undefined) return DEFAULT_CLAIM_PREFIXES;
  const areas = parsed.areas;
  if (areas === undefined || areas === null) {
    throw new Error("CAU_TRUC_THIEU_AREAS: có .repo-structure.json nhưng thiếu khối `areas` (hoặc khai null). Không đoán được thư mục nào đã khai chủ — khai rõ, kể cả khi rỗng: \"areas\": {}.");
  }
  if (typeof areas !== "object" || Array.isArray(areas)) {
    throw new Error("CAU_TRUC_HONG: khối `areas` phải là object.");
  }
  const OWNERSHIP_MODES = new Set(["root", "per-package"]);
  const prefixes = [];
  for (const [key, value] of Object.entries(areas)) {
    if (key.startsWith("_")) continue;                 // khoá chú thích, ví dụ "_doc_"
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"] phải là object.`);
    }
    // Gõ sai `ownership_mode` (ví dụ "per-pacakge") mà im lặng bỏ qua là kiểu hỏng tệ nhất:
    // danh sách tiền tố thành rỗng, MỌI package bị quy về `_root`, và cổng vẫn xanh.
    if (value.ownership_mode !== undefined && !OWNERSHIP_MODES.has(value.ownership_mode)) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"].ownership_mode phải là ${[...OWNERSHIP_MODES].join(" hoặc ")}. Đang là: ${JSON.stringify(value.ownership_mode)}`);
    }
    if (value.ownership_mode !== "per-package") continue;
    const prefix = value.claim_prefix ?? key;
    if (typeof prefix !== "string" || prefix === "" || !prefix.endsWith("/")) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"].claim_prefix phải là chuỗi kết thúc bằng "/". Đang là: ${JSON.stringify(value.claim_prefix)}`);
    }
    prefixes.push(prefix);
  }
  // Cấm tiền tố CHỒNG LẤN. `areaOf` lấy tiền tố khớp ĐẦU TIÊN, nên với `packages/` và
  // `packages/special/` cùng khai thì câu trả lời phụ thuộc thứ tự khoá trong JSON — tức
  // quyền sở hữu đổi theo cách người ta gõ file cấu hình. Cấm hẳn còn rõ hơn là chọn tiền tố
  // dài nhất: hai vùng lồng nhau vốn đã là một mô hình sở hữu mập mờ.
  for (const a of prefixes) {
    for (const b of prefixes) {
      if (a !== b && b.startsWith(a)) {
        throw new Error(`CAU_TRUC_HONG: hai vùng chia-theo-gói lồng nhau ("${a}" chứa "${b}"). Quyền sở hữu sẽ phụ thuộc thứ tự khai — hãy chọn một trong hai.`);
      }
    }
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

/* KHOÁ QUYỀN của một đường dẫn — A2, 2026-09-02.
   `areaOf` gộp MỌI thứ không thuộc vùng chia-theo-gói về một khoá `_root`. Đo thật ngày 02/09:
   **98 trong 127 commit (77%) chạm `_root`**, vì cổng đóng phiên bắt sinh lại bốn trang máy
   sinh ở gốc repo — nên một phiên chỉ sửa code trong một gói vẫn buộc phải nhận `_root` ở cuối.
   Hậu quả thật cùng ngày: một phiên mượn `_root` để sửa audit K1 (chỉ cần `scripts/`), còn tôi
   chỉ cần `docs/` — hai việc KHÔNG chồng nhau mà một khoá chặn cả hai.

   Khối `areas` **đã có sẵn** trường `steward` cho từng thư mục; chỉ là cả bảy đều khai `_root`
   nên chưa ai tách. Hàm này đọc đúng trường đó. Không thêm khối cấu hình mới — thêm là tự tạo
   nguồn sự thật thứ hai, đúng cái luật này cấm.

   Không khai `steward`, hoặc khai `null`, thì về `_root`: giữ hình dạng cũ cho repo chưa tách. */
export function stewardOf(relPath, parsed, prefixes = DEFAULT_CLAIM_PREFIXES) {
  const area = areaOf(relPath, prefixes);
  if (area !== "_root") return area;                 // vùng chia theo gói, `areaOf` đã trả lời
  const areas = parsed?.areas;
  if (!areas || typeof areas !== "object" || Array.isArray(areas)) return "_root";
  let dai = -1;
  let ketQua = "_root";                              // file ở tầng ngoài cùng, không thuộc vùng nào
  for (const [key, value] of Object.entries(areas)) {
    if (key.startsWith("_")) continue;               // khoá chú thích, ví dụ "_doc_"
    if (!key.endsWith("/")) continue;                // chỉ vùng dạng thư mục mới có tiền tố
    if (!relPath.startsWith(key)) continue;
    // TIỀN TỐ DÀI NHẤT THẮNG, không phải khoá khai trước.
    //
    // Bản đầu trả về ngay ở khớp ĐẦU TIÊN theo thứ tự khoá JSON. Khai cả `docs/` lẫn
    // `docs/internal/` thì chủ của `docs/internal/a.md` đổi theo thứ tự gõ hai dòng — vô hình
    // với người viết cấu hình, mà lại quyết định ai được ghi file nào. Vùng cụ thể hơn phải
    // thắng: đó chính là điều người khai `docs/internal/` muốn nói.
    if (key.length < dai) continue;
    const steward = value?.steward;
    if (steward === null || steward === undefined) { dai = key.length; ketQua = "_root"; continue; }
    // Gõ sai tên khoá (ví dụ "root" thiếu gạch dưới) mà im lặng bỏ qua là kiểu hỏng tệ nhất:
    // vùng đó lặng lẽ về `_root`, hai phiên lại choảng nhau, và cổng vẫn xanh.
    if (typeof steward !== "string" || !steward.startsWith("_")) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"].steward phải là khoá quyền bắt đầu bằng "_" (ví dụ "_root", "_docs"). Đang là: ${JSON.stringify(steward)}`);
    }
    dai = key.length;
    ketQua = steward;
  }
  return ketQua;
}

/* "CHỈ THÊM DÒNG?" — quyết định thuần, tách khỏi việc gọi git để kiểm được mọi nhánh.
   Dùng cho miễn trừ `HANDOFF.md` ở gốc (A2): luật mục 7 bắt MỌI phiên ghi Log vào đó, nên bắt
   phải nhận thêm một khoá chỉ để tuân luật là tự chặn luật của mình. Nhưng miễn trừ chỉ đúng
   khi **chỉ thêm dòng** — sửa hay xoá dòng cũ là viết lại lịch sử của phiên khác.

   Đầu vào là một dòng `git diff --numstat`: "<thêm>\t<xoá>\t<đường dẫn>".
   FAIL CLOSED: đọc không ra số dòng xoá thì KHÔNG miễn. Với file nhị phân git trả "-\t-", và
   miễn oan ở đó là mở cửa cho việc thay trắng nội dung mà cổng vẫn xanh. */
export function appendOnlyFromNumstat(stat) {
  const line = String(stat ?? "").trim();
  if (!line) return true;                       // không có dòng nào = file không đổi
  const deleted = Number(line.split(/\s+/)[1]);
  return Number.isFinite(deleted) && deleted === 0;
}

/* "CHỈ THÊM VÀO CUỐI FILE?" — chặt hơn `appendOnlyFromNumstat`, và đây là lý do phải chặt hơn.

   `appendOnlyFromNumstat` chỉ chứng minh **0 dòng bị xoá**. Nó KHÔNG chứng minh dòng mới nằm ở
   CUỐI. Nên một phiên không giữ khoá gốc vẫn chèn được một dòng bịa vào GIỮA `HANDOFF.md` — git
   báo "thêm N, xoá 0" và miễn trừ hành chính cho qua. Đó là một lỗ CẤP QUYỀN: ghi vào file luật
   ở gốc repo mà không cần nhận khoá gốc. Lỗ có từ A2 (02/09) ở cổng đóng phiên; audit độc lập
   (Codex, vòng 2) bác đúng chuyện "ghi chú ra thì không có nghĩa là được phép mở rộng nó".

   Đầu vào là diff `-U0` của MỘT file, cộng NỘI DUNG bản cũ. Nhận nội dung chứ không nhận số
   dòng là có chủ ý: đếm dòng ở mỗi bên gọi là sinh ra bản đếm thứ hai, thứ ba — đúng cái bệnh
   "hai bản lệch nhau" mà cả bản vá K2-2b này sinh ra để chữa.

   Với `-U0`, một cú thêm thuần ở cuối cho ĐÚNG MỘT hunk dạng `@@ -<N>,0 +<N+1>,K @@` với N =
   số dòng bản cũ. Ba điều kiện, thiếu một là không miễn: một hunk · hunk không chạm dòng cũ
   (`oldLen === 0`) · hunk bắt đầu ngay sau dòng cuối bản cũ.

   FAIL CLOSED ở mọi chỗ mờ: nhiều hunk, hay đọc không ra số, thì KHÔNG miễn. */
export function appendOnlyAtEof(diffU0, oldText) {
  const text = String(diffU0 ?? "");
  if (text.trim() === "") return true;                 // file không đổi
  const hunks = [...text.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/gm)];
  if (hunks.length !== 1) return false;                // chèn nhiều chỗ = không phải thêm ở cuối
  const oldStart = Number(hunks[0][1]);
  const oldLen = hunks[0][2] === undefined ? 1 : Number(hunks[0][2]);
  if (!Number.isFinite(oldStart) || !Number.isFinite(oldLen)) return false;
  if (oldLen !== 0) return false;                      // chạm dòng cũ = sửa/xoá, không được miễn
  return oldStart === lineCountOf(oldText);
}

/* Đếm dòng của một chuỗi git trả về. Chuỗi đó kết thúc bằng "\n", nên `split` sinh một phần tử
   rỗng ở cuối — trừ nó ra. Chuỗi rỗng = file chưa tồn tại = 0 dòng, và khi đó cả file là mới,
   tức toàn bộ đúng là "thêm ở cuối". */
export function lineCountOf(text) {
  const value = String(text ?? "");
  if (value === "") return 0;
  const parts = value.split("\n");
  return parts[parts.length - 1] === "" ? parts.length - 1 : parts.length;
}

/* THỨ MÁY SỞ HỮU THÌ KHÔNG AI PHẢI NHẬN QUYỀN — K2-1, 2026-09-02.
 *
 * ĐO ĐƯỢC, không phải suy luận. Dựng lại 138 lượt ghi lịch sử `.agents/claims.json`:
 *   · **5 trong 27 lượt nhận `_root` ngày 02/09 (19%) tồn tại CHỈ để chạy bộ sinh.** Ghi chú
 *     nguyên văn trong bảng quyền: "Sinh lai artifact sau khi va con tro chet" · "Sinh lai
 *     DASHBOARD/llms.txt/repo-map" · "Sinh lai artifact sau va F-18"…
 *   · 21.7% commit chạm `_root` chỉ vì file máy sinh.
 * Nội dung mấy file đó **tất định từ HEAD** — không ai "sở hữu" chúng theo nghĩa nào. Nên tranh
 * chấp quanh chúng là **nhân tạo**: một phiên chỉ sửa code trong một gói vẫn buộc phải nhận khoá
 * gốc ở cuối, chỉ để ghi lại thứ máy tự tính ra.
 *
 * KHÔNG LÀM YẾU LỚP BẢO VỆ NÀO, và đây là chỗ phải nói rõ vì nó dễ bị đọc thành nới lỏng:
 * miễn cho chúng khỏi **tranh chấp quyền** thì nội dung vẫn bị **phép kiểm #7** ("Sự thật máy
 * sinh còn tươi") đối chiếu với HEAD ở mọi phiên. Sửa tay một dòng trong `DASHBOARD.md` vẫn ĐỎ
 * — chỉ là nó đỏ ở phép kiểm ĐÚNG chỗ, thay vì đòi một cái khoá không liên quan. Audit GPT
 * 02/09 chốt đúng điều kiện này: bỏ khỏi tranh chấp được, bỏ khỏi kiểm chứng thì không.
 *
 * ĐỪNG GỘP `generated` VỚI `generators` — hai khoá khác nhau một chữ, và gộp là hỏng cả hai:
 *   · `generators` = danh sách SCRIPT sinh ra artifact. Phép kiểm #7 chạy từng cái với
 *     `--check-head` để hỏi "bản đã commit có còn khớp HEAD không".
 *   · `generated`  = danh sách FILE do chúng sinh ra. Chỉ dùng cho việc quy quyền ở đây.
 * Phép kiểm #7 KHÔNG hề đọc `generated`, và đó là chủ ý: nhờ vậy miễn quyền không thể vô tình
 * miễn luôn kiểm chứng. Đã đọc lại code để chắc — #7 chỉ gọi `generatorsFrom` và `--check-head`,
 * không chạm `ownershipKeys`, `generatedFrom`, `adminFile` hay `mine()`.
 *
 * TƯƠNG THÍCH NGƯỢC CÓ CHỦ Ý: chưa khai `generated` thì trả mảng RỖNG, tức hành vi y hệt trước.
 * Nhờ vậy nửa MÁY này vào được mà không cần nửa LUẬT, và không phá phiên nào đang chạy — đúng
 * thứ tự "MÁY trước, LUẬT sau" mà bài học A2 (nửa di trú) đã dạy trong chính ngày này. */
export function generatedFrom(parsed) {
  const value = parsed?.generated;
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new Error("GENERATED_HONG: `generated` phải là MẢNG đường dẫn tương đối của file máy sinh (hoặc bỏ hẳn). Đang là: " + JSON.stringify(value));
  }
  for (const name of value) {
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`GENERATED_HONG: mỗi phần tử phải là đường dẫn không rỗng. Đang là: ${JSON.stringify(name)}`);
    }
    // Đường dẫn tuyệt đối hay đi ngược lên trên là cách âm thầm miễn trừ thứ ngoài repo.
    if (name.startsWith("/") || name.startsWith("\\") || name.includes("..") || /^[A-Za-z]:/.test(name)) {
      throw new Error(`GENERATED_HONG: "${name}" phải là đường dẫn TƯƠNG ĐỐI trong repo, không tuyệt đối và không chứa "..".`);
    }
    // Thư mục thì không: miễn cả một thư mục là mở một lỗ rộng mà không ai đọc ra từ cấu hình.
    if (name.endsWith("/")) {
      throw new Error(`GENERATED_HONG: "${name}" là thư mục. Khai TỪNG FILE máy sinh — miễn cả thư mục là một lỗ mà đọc cấu hình không thấy.`);
    }
  }
  return Object.freeze([...value]);
}

/* MỘT BỘ PHÂN GIẢI, MỌI CÔNG CỤ ĐI QUA NÓ — thêm K2-2b, 2026-09-02.

   Vì sao có hàm này, và nó là LẦN LỆCH THỨ HAI ở đúng hai file của lần thứ nhất:
   26/08 `session-check.mjs` và `safe-push.mjs` mỗi bên giữ một bản regex `^workers/`, hai bản
   lệch nhau, và một đường dẫn tiếng Việt bị quy sai chủ. Chữa bằng cách tách ra `areaOf` dùng
   chung. Rồi 02/09 A2 tách gốc repo thành `_root` · `_docs` · `_code` · `_template` bằng hàm
   MỚI `stewardOf`, nối dây cho cổng đóng phiên mà không nối cho `safe-push`. Lệch lại — lần này
   không phải vì chép hai bản, mà vì **thêm một hàm thứ hai rồi chỉ nối một bên**.

   Hậu quả ĐO ĐƯỢC ngày 02/09: `docs/studies/X.md` thì cổng quy `_docs`, `safe-push` quy `_root`.
   Một phiên giữ `_docs` đúng luật, làm xong, cổng XANH, rồi bị chính `safe-push` từ chối đẩy
   việc của mình — và đường thoát duy nhất là `--carry`, thứ phải hỏi Đức. Tức hai công cụ trả
   hai câu khác nhau cho cùng một câu hỏi "file này thuộc ai".

   Nên câu trả lời đó nay chỉ có MỘT chỗ. Bài học đắt hơn bản vá: tách hàm dùng chung không
   chặn được lệch, vì người sau vẫn thêm được hàm thứ hai. Thứ chặn được là **một cửa duy nhất**,
   cộng một phép kiểm ghim rằng không công cụ nào còn đường quy vùng riêng.

   `isAdmin` là của BÊN GỌI, có chủ ý: cả hai bên miễn trừ cùng một tập file, nhưng hỏi git theo
   hai cách khác nhau (cổng so `origin/main` → cây làm việc; `safe-push` so từng commit). Đúng
   cách chia đã khai ở đầu file: hàm SUY RA thì thuần và dùng chung, việc ĐỌC thì mỗi bên tự làm.
   Mặc định `() => false` = không miễn gì: quên truyền thì miễn trừ BIẾN MẤT, không phải nới ra. */
export function ownershipKeys(files, parsed, prefixes = DEFAULT_CLAIM_PREFIXES, isAdmin = () => false) {
  if (!Array.isArray(files)) {
    throw new TypeError("OWNERSHIP_HONG: `files` phải là mảng đường dẫn tương đối.");
  }
  // File MÁY SINH bỏ qua ngay tại cửa, không qua `isAdmin`. Hai thứ khác nhau và cố ý tách:
  // `isAdmin` là của bên gọi vì nó phải hỏi git (`HANDOFF.md` chỉ miễn khi chỉ-thêm-dòng), còn
  // "file này do máy sinh" là một sự thật THUẦN của tầng LUẬT — đọc cấu hình là biết, không cần
  // hỏi git. Nhét nó vào `isAdmin` là buộc mọi bên gọi tự nhớ, và người thứ ba sẽ quên.
  const generated = new Set(generatedFrom(parsed));
  const keys = new Set();
  for (const file of files) {
    if (generated.has(file)) continue;
    if (isAdmin(file)) continue;
    keys.add(stewardOf(file, parsed, prefixes));
  }
  return [...keys].sort();
}

/* NHÃN LANE TRONG COMMIT — K2-3, 2026-09-02. NGUỒN GỐC, KHÔNG PHẢI QUYỀN.
 *
 * Vì sao phải có, và nó sửa một lỗi ĐO ĐƯỢC: `safe-push` quy một commit cho ai bằng cách xem
 * **chủ HIỆN TẠI** của vùng mà commit đó chạm. Chủ sở hữu là trạng thái SỐNG, commit là chuyện
 * ĐÃ QUA — nên phép quy đó sai theo cả hai chiều:
 *   · commit của TÔI trong một vùng nay là của người khác → safe-push **từ chối việc của tôi**;
 *   · commit của NGƯỜI KHÁC trong một vùng nay là của tôi → safe-push coi là của tôi và
 *     **đẩy kèm việc của họ trong im lặng**. Cái thứ hai nguy hiểm hơn hẳn.
 * Audit độc lập (Codex) chỉ ra đúng cặp này khi bác bản K2-2 đầu tiên, và đó là lý do K2-3 phải
 * đứng TRƯỚC K2-2 chứ không phải sau.
 *
 * Nhãn trả lời đúng một câu: *"commit này do phiên nào làm?"* Nó KHÔNG cấp quyền. Quyền vẫn nằm
 * ở bảng `claims.json` — nếu không thì một phiên tự cấp phạm vi cho mình bằng cách gõ một dòng.
 *
 * FAIL CLOSED khi KHÔNG QUY THUỘC ĐƯỢC, và phân biệt hai ca khác nhau:
 *   · KHÔNG CÓ nhãn  → `{ lane: null, problem: null }`. Đây là ca THƯỜNG, không phải lỗi: 509
 *     commit trong lịch sử repo không có nhãn nào. Bên gọi tự quyết cách xử (hiện: lùi về quy
 *     theo vùng, và NÓI TO là đang lùi).
 *   · CÓ nhãn mà HỎNG → `{ lane: null, problem: "<mã>: …" }`. Rỗng, có khoảng trắng, hay hai
 *     nhãn khác nhau trong một commit đều là hỏng — và một commit không quy thuộc được thì thà
 *     nói là không biết, đừng đoán lấy cái đầu.
 */
export const LANE_TRAILER = "Lane:";

export function laneFromMessage(text) {
  const lines = String(text ?? "").split("\n");
  const values = [];
  for (const line of lines) {
    if (!line.startsWith(LANE_TRAILER)) continue;      // chỉ TRAILER ở đầu dòng, không nhắc giữa câu
    values.push(line.slice(LANE_TRAILER.length).trim());
  }
  if (values.length === 0) return { lane: null, problem: null };
  const empty = values.some((v) => v === "");
  if (empty) {
    return { lane: null, problem: `LANE_RONG: commit có dòng \`${LANE_TRAILER}\` nhưng không có nhãn nào sau nó.` };
  }
  const bad = values.find((v) => /\s/.test(v));
  if (bad !== undefined) {
    return { lane: null, problem: `LANE_CO_KHOANG_TRANG: nhãn lane "${bad}" có khoảng trắng. Nhãn phiên là một từ, ví dụ "claude-k2-design".` };
  }
  const unique = [...new Set(values)];
  if (unique.length > 1) {
    return { lane: null, problem: `LANE_XUNG_DOT: một commit mang ${unique.length} nhãn khác nhau (${unique.join(", ")}). Không quy thuộc được cho ai — sửa thông điệp commit.` };
  }
  return { lane: unique[0], problem: null };
}

/* NHÃN AUDIT — `KHUNG-56`, và nó vá một lỗ đo được ngày 10/09.
 *
 * `AGENTS.md` mục 2 cho tự đẩy khi đủ ba, trong đó điều ⑵ là *"cổng XANH TOÀN BỘ, **code thì đã
 * qua audit độc lập**"*. Vế cổng-xanh có máy canh: `safe-push` đọc dấu cổng. Vế đã-qua-audit thì
 * KHÔNG có gì canh — không cờ, không trường, không phép kiểm.
 *
 * Ca thật 10/09: lane `harness-loi-02` commit 5 lượt bản vá lõi, ghi rõ trong `HANDOFF.md`
 * *"chưa qua audit — đừng --carry"*, rồi lane `harness-migrate-3repo` chạy `safe-push` và cuốn cả
 * 5 lên `origin/main` sau **20 phút**. Lane đó không làm gì sai: cổng của họ xanh, mọi commit đều
 * có nhãn `Lane:`. Lời cảnh báo nằm ở `HANDOFF.md` — Tầng 2, không nạp mặc định — và không lane
 * nào phải đọc nhật ký của lane khác trước khi đẩy.
 *
 * GIỚI HẠN, nói thẳng để không ai tưởng đây là lớp thép: nhãn này do **người sửa TỰ KHAI**. Nó
 * không chứng minh đã có audit; nó chỉ làm cho một lời tự khai *"chưa duyệt"* đi được tới máy,
 * thay vì chết trong một quyển sổ Tầng 2. Bản chặt hơn (dấu cổng mang trường `audit` do một lệnh
 * nghiệm thu riêng đặt) là `Y-02`, và nó đắt hơn nhiều.
 *
 * KHÔNG khai gì = KHÔNG chặn. Chặn mọi commit thiếu nhãn là khoá repo ngay lượt đầu — cùng cái
 * bẫy `laneFromMessage` đã tránh với 509 commit cũ không nhãn. */
export const AUDIT_TRAILER = "Audit:";
export const AUDIT_CHUA_CO = "chua-co";

/** Ai được coi là NGƯỜI DUYỆT — đọc từ `.repo-structure.json`, không đoán từ chữ.
 *
 *  TRẢ CẢ TÊN SAI KHUÔN, KHÔNG BỎ IM LẶNG. Audit vòng 4 nêu: bản đầu `filter` thẳng, nên repo
 *  khai `Duc` (hoa) hay `nguyen van a` (có khoảng trắng) thì tên đó **rơi mất không một tiếng
 *  nào** — người khai tưởng mình đã cấp quyền duyệt, mà thật ra chưa. Đây không phải lỗ nhận
 *  nhầm; nó là chỗ **fail SILENT**, và repo này có luật riêng cho đúng chuyện đó.
 *  Không tự chuẩn hoá (không tự hạ về chữ thường): đoán ý người khai là một cửa khác. */
export function nguoiDuyetFrom(structure) {
  const ds = structure?.audit?.nguoi_duyet;
  if (!Array.isArray(ds)) return [];
  return ds.filter((x) => typeof x === "string" && /^[a-z0-9][a-z0-9._-]*$/.test(x));
}

/** Tên khai trong `audit.nguoi_duyet` mà SAI KHUÔN, nên không có hiệu lực. Để cổng nêu tên. */
export function nguoiDuyetSaiKhuon(structure) {
  const ds = structure?.audit?.nguoi_duyet;
  if (!Array.isArray(ds)) return [];
  return ds.filter((x) => typeof x !== "string" || !/^[a-z0-9][a-z0-9._-]*$/.test(x)).map((x) => String(x));
}

/** Đọc nhãn `Audit:`. **CHỈ một tên trong DANH SÁCH KHAI mới là "đã duyệt"; mọi thứ khác là CHƯA.**
 *
 *  BA VÒNG AUDIT ĐỘC LẬP MỚI TỚI ĐƯỢC HÌNH DẠNG NÀY, và hai vòng đầu tôi vá sai chỗ:
 *    · 1.8.4 hỏi *"có đúng bằng `chua-co` không? không thì là tên người duyệt"* → `chua-co (dang
 *      cho)` và `chua co` thành **ĐÃ DUYỆT**.
 *    · 1.8.5 hỏi *"có đúng khuôn một thẻ không?"* → `pending`, `none`, `todo`, `not-reviewed`
 *      thành **ĐÃ DUYỆT**. Đo được cả bốn. Và mẹo `/^chua/` chặn oan một tên hợp lệ như `chuan`.
 *
 *  GỐC BỆNH của cả hai: tôi để **người viết commit** tự định nghĩa cái gì là "đã duyệt". Một
 *  chuỗi tự do thì không có cách nào phân biệt `codex-r03` với `pending` — cả hai chỉ là chữ.
 *  Nên câu hỏi phải đổi chủ: **repo khai trước ai được duyệt**, và mọi thứ ngoài danh sách là
 *  CHƯA. Một phép so danh sách THAY CHỖ hai mẹo dò chuỗi, nên bản này vừa chặt hơn vừa ít luật
 *  hơn — không phải thêm một lớp nữa.
 *
 *  Hậu tố vòng `-rNN` được phép (`codex` khai một lần, `codex-r03` dùng được) — không thì mỗi
 *  vòng audit lại phải sửa cấu hình.
 *
 *  Repo KHÔNG khai danh sách → KHÔNG ai là người duyệt → lời khai `chua-co` chỉ gỡ được bằng
 *  `--duc-duyet-chua-audit`. Fail-closed, và nói rõ bằng mã lỗi. */
export function auditFromMessage(text, dsNguoiDuyet = []) {
  /* Bỏ DÒNG TIÊU ĐỀ — đo được 10/09 ở một repo đích (họ tự vá, lõi thì chưa).
     `Audit:` là một TRAILER, và trailer không bao giờ nằm ở dòng đầu. Bản cũ quét cả dòng đầu,
     nên một commit theo lối conventional-commit với KIỂU là `audit:` bị đọc thành lời khai
     người duyệt tên *"moc 2 fail — thieu …"*, rơi ra ngoài `audit.nguoi_duyet` và **bị chặn
     push**. Nặng hơn: một commit có nhãn `Audit: codex` HỢP LỆ mà tiêu đề tình cờ là `audit:`
     thì thành HAI nhãn → `AUDIT_XUNG_DOT`, tức cản đúng cái commit đã làm đúng.
     `laneFromMessage` ngay trên đúng từ đầu (`startsWith`, không nới) — chỉ chỗ này lệch. */
  const values = String(text ?? "").split("\n").slice(1)
    .filter((line) => /^\s*audit\s*:/i.test(line))
    .map((line) => line.slice(line.indexOf(":") + 1).trim().toLowerCase());
  if (!values.length) return { chuaAudit: false, khai: null, problem: null };
  const khai = values.join(" · ");
  /* Hậu tố vòng `-rNN`: `codex` khai một lần thì `codex-r03` dùng được. So bằng CẮT HẬU TỐ chứ
     không dựng RegExp từ chuỗi cấu hình — `.` trong một tên như `a.b` là ký tự đặc biệt của
     RegExp, và dựng biểu thức từ dữ liệu là cách tự mở một cửa mình không nhìn thấy. */
  const hopLe = (v) => {
    const goc = v.replace(/-r\d+$/, "");
    return dsNguoiDuyet.includes(v) || dsNguoiDuyet.includes(goc);
  };
  /* MỘT commit MỘT lời khai. Hai dòng `Audit:` khác nhau là hai câu trả lời cho một câu hỏi, và
     phiên sau bốc trúng câu nào thì tuỳ — cùng lý do `laneFromMessage` chặn `LANE_XUNG_DOT`. */
  if (new Set(values).size > 1) {
    return { chuaAudit: true, khai, problem: `AUDIT_XUNG_DOT: một commit mang ${new Set(values).size} nhãn \`${AUDIT_TRAILER}\` khác nhau (${khai}). Không quy được là đã duyệt hay chưa.` };
  }
  if (values.every(hopLe)) return { chuaAudit: false, khai, problem: null };
  return {
    chuaAudit: true,
    khai,
    problem: `AUDIT_NGOAI_DANH_SACH: "${khai}" không có trong \`audit.nguoi_duyet\` của .repo-structure.json${dsNguoiDuyet.length ? ` (đang khai: ${dsNguoiDuyet.join(", ")})` : " (repo CHƯA khai ai)"}. Ngoài danh sách thì coi là CHƯA duyệt.`,
  };
}

/* BẤT BIẾN BA TẦNG — LAW `steward` ↔ STATE khoá quyền ↔ MÁY một hàm duy nhất.

   Yêu cầu bởi audit GPT 02/09, và nó không phải luật di-trú mà là bất biến: A2 đổi tầng LAW
   (`steward` trong `.repo-structure.json`) và tầng STATE (khoá trong `.agents/claims.json`) và
   tầng MÁY, nhưng nếu ba tầng lệch nhau thì bảng nói một đằng máy nói một nẻo — và cổng lặng lẽ
   quy việc cho sai người, vẫn xanh. Thiếu một trong ba thì FAIL CLOSED.

   Trả về danh sách lỗi (rỗng = đạt) thay vì ném, để bên gọi in được cả các lỗi cùng lúc. */
export function ownershipInvariant(parsed, claims) {
  const problems = [];
  const areas = parsed?.areas;
  if (!areas || typeof areas !== "object" || Array.isArray(areas)) {
    return ["BAT_BIEN_HONG: thiếu khối `areas` trong .repo-structure.json — không kiểm được bất biến."];
  }
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    return ["BAT_BIEN_HONG: thiếu khối `claims` trong .agents/claims.json — không kiểm được bất biến."];
  }
  const stewards = new Map();                        // khoá quyền → thư mục đã khai nó
  for (const [key, value] of Object.entries(areas)) {
    if (key.startsWith("_")) continue;
    const steward = value?.steward;
    if (typeof steward !== "string") continue;       // null / không khai = về `_root`, hợp lệ
    if (!stewards.has(steward)) stewards.set(steward, []);
    stewards.get(steward).push(key);
  }
  const claimKeys = new Set(Object.keys(claims).filter((k) => k.startsWith("_")));
  // `_root` PHẢI TỒN TẠI. Nó là khoá mà `stewardOf` trả về cho mọi file ở tầng ngoài cùng
  // (`AGENTS.md`, `package.json`…), nên thiếu nó thì những file đó không ai nhận được — việc mồ
  // côi vĩnh viễn, và cổng sẽ chặn mọi phiên chạm chúng. Audit độc lập (Codex, vòng 2) bắt đúng
  // chỗ này: bản trước của tôi MIỄN `_root` khỏi phép kiểm khoá-chết rồi quên đòi nó có mặt.
  if (!claimKeys.has("_root")) {
    problems.push(`THIEU_KHOA_ROOT: .agents/claims.json không có khoá "_root". Đó là khoá cho mọi file ở tầng ngoài cùng repo, nên thiếu nó là không ai nhận được chúng. Thêm "_root": { "owner": null, "ai": null, "claimed_at": null, "task": null, "released_at": null }.`);
  }
  for (const [steward, dirs] of stewards) {
    if (!claimKeys.has(steward)) {
      problems.push(`STEWARD_THIEU_KHOA: areas ${dirs.join(", ")} khai steward "${steward}" nhưng .agents/claims.json không có khoá đó. Không ai nhận được vùng đó — thêm "${steward}": { "owner": null, … } vào bảng quyền.`);
    }
  }
  for (const key of claimKeys) {
    // `_root` LUÔN sống, kể cả khi không thư mục nào khai nó: đó là khoá DỰ PHÒNG mà `stewardOf`
    // trả về cho mọi đường dẫn ở tầng ngoài cùng (`AGENTS.md`, `package.json`, `.gitignore`…).
    // Phép kiểm ghim bắt được đúng chỗ này: bản đầu của tôi báo `_root` là "khoá chết" trong một
    // repo chỉ khai `workers/`, tức sẽ đỏ oan mọi repo dựng từ bộ khung.
    if (key === "_root") continue;
    if (!stewards.has(key)) {
      problems.push(`KHOA_KHONG_VUNG: .agents/claims.json có khoá "${key}" mà không thư mục nào khai steward đó. Khoá chết — hoặc khai steward cho một thư mục, hoặc bỏ khoá đi.`);
    }
  }
  return problems;
}

/* Danh tính repo dùng cho trang cổng vào máy đọc. THÊM 2026-09-02 sau khi audit độc lập chỉ ra
   bộ sinh đóng cứng chuỗi tên repo gốc: mọi repo lấy bộ khung về sẽ sinh ra một trang **tự nhận
   là repo Chrome**. Đúng cái bệnh "mọi repo cùng nói dối" mà luật cấm chép tầng GENERATED sinh
   ra để tránh — và luật đó không chặn nổi, vì nó chỉ soi DANH SÁCH file mang theo, không soi
   NỘI DUNG file sinh ra. Mặc định giữ nguyên chuỗi cũ để repo này sinh ra y hệt. */
/* Mặc định phải TRUNG TÍNH. Để mặc định là tên repo gốc chính là cái bẫy: repo nào quên khai
   sẽ lặng lẽ sinh ra một trang tự nhận là repo gốc, và không phép kiểm nào thấy vì file vẫn
   sinh ra bình thường. Nay quên khai thì trang nói thẳng là chưa đặt tên — khó chịu đúng mức
   để người ta đi khai, và không bao giờ nói dối. */
export const DEFAULT_REPO = Object.freeze({
  name: "Repo chưa đặt tên",
  tagline: null
});

export function repoIdentityFrom(parsed) {
  const block = parsed?.repo;
  if (block === undefined) return DEFAULT_REPO;
  if (block === null || typeof block !== "object" || Array.isArray(block)) {
    throw new Error("REPO_HONG: khối `repo` trong .repo-structure.json phải là object (hoặc bỏ hẳn để dùng mặc định).");
  }
  const name = block.name ?? DEFAULT_REPO.name;
  if (typeof name !== "string" || name.trim() === "") {
    throw new Error(`REPO_HONG: repo.name phải là chuỗi không rỗng. Đang là: ${JSON.stringify(block.name)}`);
  }
  const tagline = block.tagline ?? null;
  if (tagline !== null && (typeof tagline !== "string" || tagline.trim() === "")) {
    throw new Error(`REPO_HONG: repo.tagline phải là chuỗi không rỗng, hoặc bỏ hẳn. Đang là: ${JSON.stringify(block.tagline)}`);
  }
  return Object.freeze({ name: name.trim(), tagline: tagline && tagline.trim() });
}

/* Hồ sơ repo (P1…P5). Trước 2026-09-02 bộ sinh xuất hằng "P1" vào hợp đồng máy đọc bất kể
   `.repo-structure.json` khai gì — tức bản đồ máy đọc nói dối về chính hình dạng repo. */
export const PROFILES = Object.freeze(["P1", "P2", "P3", "P4", "P5"]);

export function profileFrom(parsed) {
  const value = parsed?.profile;
  if (value === undefined) return "P1";
  if (!PROFILES.includes(value)) {
    throw new Error(`PROFILE_HONG: profile phải là một trong ${PROFILES.join(" · ")}. Đang là: ${JSON.stringify(value)}`);
  }
  return value;
}

/* Script nào sinh ra artifact đã commit. Cổng đóng phiên đối chiếu từng cái với HEAD.
   Trước 2026-09-02 danh sách này viết cứng và gồm cả `feature-parity.mjs` — một script CHỈ có
   ở repo này. Bộ khung cố ý không mang nó theo, nên một repo dựng từ bộ khung chạy cổng đóng
   phiên là **hỏng ngay ở cổng của chính nó**. Phép thử repo rỗng không thấy, vì nó chỉ chạy
   cổng cấu trúc. */
export const DEFAULT_GENERATORS = Object.freeze(["build-dashboard.mjs", "feature-parity.mjs"]);

/* NGHỀ NÀO ĐẾM FILE NGHỀ ẤY. Bộ đếm "code đã đổi sau lần kiểm chứng" mặc định chỉ nhìn
 * .js/.mjs/.json/.css/.html — tức nó ĐO ĐƯỢC ĐÚNG MỘT NGHỀ. Repo Python thì `tools/*.py` đổi cả
 * ngày mà cột đó vẫn nói KHÔNG, và không ai biết nó đang mù.
 *
 * VẤP THẬT 05/09, lượt migrate `n8n-orchestrator`: trường này được chú thích trong
 * `build-dashboard.mjs` như thể đã dùng được, nhưng `kiemKhoaLa()` TỪ CHỐI nó — repo Python khai
 * vào là lệnh nổ ngay. Chú thích dạy một trường, bộ kiểm cấm trường ấy, và không ai đối chiếu
 * hai chỗ. Nay trường hợp lệ, và hàm này là chỗ duy nhất đọc nó. */
export function behaviourGlobsFrom(parsed) {
  const value = parsed?.units?.behaviour_globs;
  if (value === undefined) return null;              // null = repo không khai, giữ mặc định
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("BEHAVIOUR_GLOBS_HONG: `units.behaviour_globs` phải là mảng không rỗng các mẫu như \"**/*.py\" (hoặc bỏ hẳn để dùng mặc định).");
  }
  for (const g of value) {
    if (typeof g !== "string" || !g.includes(".")) {
      throw new Error(`BEHAVIOUR_GLOBS_HONG: mỗi mẫu phải là chuỗi có phần đuôi, ví dụ "**/*.py". Đang là: ${JSON.stringify(g)}`);
    }
  }
  return Object.freeze([...value]);
}

/* TÊN BA ARTIFACT MÁY SINH — repo khai được, không đóng cứng trong code.

   VÌ SAO CÓ. Vấp thật 06/09, lượt migrate `ALL_SKILL_MANAGEMENT`: repo đó có một bảng theo
   dõi VIẾT TAY tên `DASHBOARD.md`, có mirror sang Google Sheet, 123 dòng. Bộ khung đóng cứng
   đúng cái tên đó cho bản máy sinh, nên chạy bộ sinh MỘT LẦN là đè mất — và đè im lặng.
   Phải đổi tên file của repo đích để nhường bộ sinh, tức bộ khung là khách mà bắt chủ nhà
   dọn phòng.

   Khai thiếu một khoá thì khoá đó dùng mặc định — repo chỉ vướng một tên không phải khai cả ba.

   FAIL CLOSED với đầu vào sai: khai `"generated_names": "khac"` mà lặng lẽ lùi về mặc định thì
   người viết tưởng tên riêng đang có hiệu lực, còn bộ sinh vẫn ghi đè file cũ. Đúng cái lỗ
   `budget` đã mắc và đã vá 05/09. */
/* FILE HÀNH CHÍNH — thao tác quyền, KHÔNG phải hành vi của repo.
 *
 * NHÀ DUY NHẤT của khái niệm này. Trước 10/09 nó nằm trong `build-dashboard.mjs` dưới tên
 * `HANH_CHINH`, nên chỉ bộ đếm hành vi biết tới nó, còn `chay-test.mjs` thì không — và cái
 * giá đo được ở phiên 09→10/09: dấu xác nhận suite băm CẢ `.agents/claims.json`, mà file đó
 * bị MỌI lane ghi lại ở mỗi lượt `--sua` / `--xong`. Trong một repo có hai lane cùng làm, dấu
 * **không bao giờ ghi được**: ba lượt chạy đủ bộ (514.8s + 524.2s + 702s = **29 phút**) không
 * lượt nào cấp được dấu, và cổng còn báo *"suite gốc repo ĐỎ"* trong khi 22/22 suite xanh.
 *
 * Repo này đã có một phép ghim cho đúng ý đó ở `tests/core-contract.mjs`:
 * `isBehaviourFile(".agents/claims.json") === false`, kèm ca thật 06/09 (commit `fa7e8a7`
 * chạm đúng một file là `claims.json` và bộ đếm hành vi nhảy 4 → 5). Nên đây không phải luật
 * mới — nó là luật ĐÃ CÓ, nay được mang tới chỗ thứ hai đang cần nó. */
export const FILE_HANH_CHINH = Object.freeze([".agents/claims.json"]);

export const TEN_MAY_SINH_MAC_DINH = Object.freeze({
  dashboard: "DASHBOARD.md",
  llms: "llms.txt",
  repo_map: "repo-map.json",
  /* `overview` = trang HTML cho người xem. `null` nghĩa là **suy từ `repo.name`**, không phải
   * "không có" — bộ sinh tự đặt `DASHBOARD-<tên-repo>.html`. Khai một chuỗi ở đây chỉ khi repo
   * đích đã có sẵn file trùng tên, đúng lý do khối `generated_names` tồn tại. */
  overview: null
});

/* TÊN TRANG HTML — SUY MỘT LẦN, hai cổng dùng chung.
 *
 * Trước 07/09 phép suy này nằm trong `build-overview.mjs` và **chỉ bộ sinh trang biết nó**.
 * Hệ quả đo được ở repo `nav_platform_main`: bộ đếm "code đã đổi sau kiểm chứng" thấy
 * `DASHBOARD-NAV-Platform-V1.html` là một file `.html` bình thường, nên mỗi lượt sinh lại
 * trang là bộ đếm +1, và cổng *"Sự thật máy sinh còn tươi"* ĐỎ vĩnh viễn — không cách nào
 * thoát bằng cách sinh lại, vì chính việc sinh lại làm nó tăng.
 *
 * Đây ĐÚNG con bệnh đã được ghi ngay trên `MAY_SINH` cho `repo-map.json`, lặp lại lần thứ hai
 * với một file mới. Lần trước vá bằng cách thêm tên vào một danh sách; lần này vá bằng cách
 * **bỏ danh sách** — tên suy ra từ cấu hình, nên repo không phải nhớ khai gì. */
export function tenTrangFrom(parsed) {
  const khai = parsed?.generated_names?.overview;
  if (typeof khai === "string" && khai.trim() && !khai.includes("/") && !khai.includes("\\")) {
    return khai.trim();
  }
  const ten = String(parsed?.repo?.name || "").trim();
  if (!ten) return "DASHBOARD.html";
  /* Giữ chữ cái và số, gộp mọi thứ khác thành một gạch nối. Dấu tiếng Việt rụng — đúng ý:
     tên file có dấu là chỗ hỏng kinh điển khi đem qua máy khác.
     `Đ`/`đ` KHÔNG tách được bằng NFD — nó là một chữ cái riêng, không phải D có dấu.
     Bỏ qua chỗ này thì "Đầu tư" ra "au-tu", mất luôn chữ đầu của tên repo. */
  const gon = ten.split("Đ").join("D").split("đ").join("d")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return gon ? `DASHBOARD-${gon}.html` : "DASHBOARD.html";
}

export function tenMaySinhFrom(parsed) {
  const khai = parsed?.generated_names;
  if (khai === undefined) return TEN_MAY_SINH_MAC_DINH;
  if (khai === null || typeof khai !== "object" || Array.isArray(khai)) {
    throw new Error(`TEN_MAY_SINH_HONG: \`generated_names\` phải là object dạng {"dashboard": "...", "llms": "...", "repo_map": "..."}. Đang là: ${Array.isArray(khai) ? "mảng" : typeof khai}`);
  }
  const ra = { ...TEN_MAY_SINH_MAC_DINH };
  for (const [k, v] of Object.entries(khai)) {
    if (k.startsWith("_")) continue;                   // chú thích `_doc` không tính là gõ sai
    if (!(k in TEN_MAY_SINH_MAC_DINH)) {
      throw new Error(`TEN_MAY_SINH_HONG: không có khoá \`${k}\`. Chỉ nhận: ${Object.keys(TEN_MAY_SINH_MAC_DINH).join(", ")}. Gõ sai tên khoá mà lặng lẽ bỏ qua thì người viết tưởng đã khai.`);
    }
    if (v === null) { ra[k] = null; continue; }   // `null` = để bộ sinh tự suy, xem TEN_MAY_SINH_MAC_DINH
    if (typeof v !== "string" || !v.trim() || v.includes("/") || v.includes("\\")) {
      throw new Error(`TEN_MAY_SINH_HONG: \`${k}\` phải là TÊN FILE ở gốc repo, không có dấu gạch chéo. Đang là: ${JSON.stringify(v)}`);
    }
    ra[k] = v.trim();
  }
  /* HAI ARTIFACT TRÙNG TÊN NHAU LÀ TỰ ĐÈ CHÍNH MÌNH — bộ sinh ghi ba file theo thứ tự, nên
     khai trùng thì file ghi sau nuốt file ghi trước và cổng "còn tươi" đỏ vĩnh viễn mà không
     ai hiểu vì sao. Bắt ngay lúc đọc cấu hình, chỗ người ta còn đang nhìn cái tên mình vừa gõ. */
  const ten = Object.values(ra).filter((x) => x !== null);
  if (new Set(ten).size !== ten.length) {
    throw new Error(`TEN_MAY_SINH_HONG: ba artifact phải có ba tên KHÁC nhau. Đang là: ${JSON.stringify(ra)}`);
  }
  return Object.freeze(ra);
}

export function generatorsFrom(parsed) {
  const value = parsed?.generators;
  if (value === undefined) return DEFAULT_GENERATORS;
  /* MẢNG RỖNG LÀ HỢP LỆ TỪ 10/09 (R1), và đó là cả một quyết định: nó là cách DUY NHẤT để một
     repo nói "ĐỪNG đối chiếu artifact nào của tôi với HEAD".
     KHÔNG đồng nghĩa "repo không commit artifact nào" — repo này VẪN commit DASHBOARD.md,
     llms.txt, repo-map.json; chúng chỉ thôi bị canh. Lẫn hai câu đó là hiểu sai cả hai chiều.
     Trước đó `[]` bị coi là gõ sai, nên repo bắt buộc
     phải có ít nhất một bộ sinh bị cổng đối chiếu với HEAD mỗi lượt — tức vòng lặp 37% commit
     không có đường thoát nào ngoài việc sửa chính hàm này. Vắng khoá thì VẪN dùng mặc định:
     bỏ quên khác với khai rỗng, và im lặng tắt một lớp bảo vệ thì phải là hành động cố ý. */
  if (!Array.isArray(value)) {
    throw new Error("GENERATORS_HONG: `generators` phải là MẢNG tên script trong scripts/ — `[]` nghĩa là KHÔNG đối chiếu artifact nào với HEAD (repo vẫn có thể commit chúng), bỏ hẳn khoá thì dùng mặc định.");
  }
  for (const name of value) {
    if (typeof name !== "string" || name === "" || name.includes("/") || name.includes("\\")) {
      throw new Error(`GENERATORS_HONG: mỗi phần tử phải là TÊN một file trong scripts/ (ví dụ "build-dashboard.mjs"). Đang là: ${JSON.stringify(name)}`);
    }
  }
  return Object.freeze([...value]);
}

/* Thư mục ĐƠN VỊ mà một đường dẫn thuộc về — khác `areaOf`, và lẫn hai cái này là sai thật.
   `areaOf("workers/abc/v1/x.js")` trả `workers/abc` (VÙNG SỞ HỮU, nơi khai chủ trong claims).
   `unitDirOf` trả `workers/abc/v1` (ĐƠN VỊ, nơi có manifest, AGENTS.md và suite của nó).
   Với `depth: 1` hai cái trùng nhau; với `depth: 2` thì không, và cổng đóng phiên cần cái sau. */
export function unitDirOf(relPath, units = DEFAULT_UNITS) {
  if (units.rootDir === null) return null;
  const prefix = `${units.rootDir}/`;
  if (!relPath.startsWith(prefix)) return null;
  const parts = relPath.slice(prefix.length).split("/");
  if (parts.length <= units.depth) return null;          // chưa đủ sâu, hoặc chính là file đơn vị
  if (parts.slice(0, units.depth).some((part) => part === "")) return null;
  return prefix + parts.slice(0, units.depth).join("/");
}

/* Mọi thư mục đơn vị nằm dưới một vùng sở hữu, tìm bằng cách đi xuống đúng số tầng còn lại.
   `listDirs(path)` trả tên các thư mục con; bên gọi tự quyết đọc từ đĩa hay từ git. */
export function unitDirsUnder(areaPath, units = DEFAULT_UNITS, listDirs) {
  if (units.rootDir === null) return [];
  const prefix = `${units.rootDir}/`;
  if (!areaPath.startsWith(prefix)) return [];
  const consumed = areaPath.slice(prefix.length).split("/").filter(Boolean).length;
  let level = [areaPath];
  for (let i = consumed; i < units.depth; i += 1) {
    level = level.flatMap((dir) => listDirs(dir).map((name) => `${dir}/${name}`));
  }
  return level;
}

/* Đọc từ CÂY LÀM VIỆC. Chỉ dành cho cổng đóng phiên và safe-push — hai chỗ buộc phải thấy
   cả bản sửa dở. Bộ sinh KHÔNG dùng hàm này: nó đọc từ HEAD qua deps của chính nó. */
/* GÕ SAI MỘT CHỮ KHÔNG ĐƯỢC PHÉP IM LẶNG.
 *
 * Cấu hình này chỉ fail-closed ở lỗi CÚ PHÁP. Gõ sai TÊN TRƯỜNG thì vẫn parse ngon lành, và
 * hậu quả không hiện ra ở đâu cả:
 *
 *   `units.root_dri`  → `root_dir` thiếu → lùi mặc định `"workers"` → quét sai thư mục, bảng
 *                       vẫn sinh, cổng vẫn xanh, chỉ là đang nói về một repo khác.
 *   `mutabilty`       → vùng bằng chứng KHÔNG CÒN được bảo vệ chỉ-thêm. Không dòng nào báo.
 *
 * Đúng là kiểu hỏng mà cả lớp cấu hình này sinh ra để chặn: repo tưởng đang được canh, thật ra
 * không. Nên: trường lạ = NÉM. Thà chặn một cấu hình hợp lệ mà lạ, còn hơn im lặng bỏ canh.
 * Trường bắt đầu bằng `_` được miễn — bản hạt giống dùng `_doc`, `_ten_doc` để chú thích. */
const KHOA_UNITS = new Set(["root_dir", "marker", "depth", "ten", "behaviour_globs"]);
const KHOA_AREA = new Set(["steward", "ownership_mode", "claim_prefix", "mutability", "note"]);

export function kiemKhoaLa(parsed) {
  const loi = [];
  const soi = (obj, hopLe, ten) => {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return;
    for (const k of Object.keys(obj)) {
      if (k.startsWith("_")) continue;                 // `_doc`, `_ten_doc`: chú thích cho người
      if (!hopLe.has(k)) loi.push(`${ten}.${k} — không phải trường hợp lệ. Hợp lệ: ${[...hopLe].join(", ")}`);
    }
  };
  soi(parsed?.units, KHOA_UNITS, "units");
  const areas = parsed?.areas;
  if (areas && typeof areas === "object" && !Array.isArray(areas)) {
    for (const [key, value] of Object.entries(areas)) soi(value, KHOA_AREA, `areas["${key}"]`);
  }
  return loi;
}

export function readStructureFromDisk(root) {
  const file = path.join(root, STRUCTURE_FILE);
  if (!fs.existsSync(file)) return null;
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`CAU_TRUC_HONG: ${STRUCTURE_FILE} không phải JSON đọc được (${error.message}). Sửa file đó rồi chạy lại.`);
  }
  const loi = kiemKhoaLa(parsed);
  if (loi.length) {
    throw new Error(`CAU_TRUC_HONG: ${STRUCTURE_FILE} có trường không nhận ra — nhiều khả năng là gõ sai, và gõ sai ở đây làm MẤT lớp bảo vệ mà không báo gì:\n  ${loi.join("\n  ")}`);
  }
  return parsed;
}

/* ---- LỜI KHUYÊN KHI CỔNG XUẤT BẢN CHẶN -----------------------------------
 *
 * Ở ĐÂY chứ không ở `safe-push.mjs`, và lý do là kiểm được: `safe-push.mjs` chạy phần chính ngay
 * lúc nạp module và THOÁT khi thiếu `--as`, nên không phép ghim nào `import` nổi nó. Một nhánh
 * quyết định không nạp được là một nhánh không ai đột biến kiểm được — và nhánh này in ra câu mà
 * người bị chặn sẽ làm theo.
 */
/** Lời khuyên in ra khi cổng xuất bản chặn. THUẦN, nên đột biến kiểm được.
 *
 *  Một câu khuyên SAI tệ hơn không có câu nào: nó làm người đọc tin là mình chỉ cần đợi, nên
 *  không ai đi hỏi người chốt, nên repo kẹt im lặng. */
export function handoffCapFrom(parsed) {
  const khoi = parsed?.handoff;
  if (khoi === null || khoi === undefined) return null;
  if (typeof khoi !== "object" || Array.isArray(khoi)) {
    throw new Error("CAU_TRUC_HONG: `handoff` phải là một object, ví dụ { \"tran_byte_moi_muc\": 2600 }.");
  }
  const tran = khoi.tran_byte_moi_muc;
  if (tran === undefined) return null;
  if (!Number.isInteger(tran) || tran <= 0) {
    throw new Error(`CAU_TRUC_HONG: \`handoff.tran_byte_moi_muc\` phải là số nguyên dương (byte), nhận "${tran}".`);
  }
  return tran;
}

/* ---- DANH SÁCH NHÓM CỦA BẢNG — hợp đồng, đọc từ dữ liệu ------------------
 *
 * KHUNG-46 (đo 08/09): danh sách này từng bị `assert.deepEqual` gõ cứng ở **hai** file test.
 * Hai bản sao của một luật thì **lệch được** — một bản nói năm nhóm, bản kia bốn, và cả hai
 * vẫn "xanh" ở suite của riêng nó. Đúng bệnh mà `append_only_exempt` đã gây ra 02/09.
 *
 * Vì sao hợp đồng KHÔNG nằm trong `build-overview.mjs`: bộ sinh là bên **bị kiểm**. Hợp đồng
 * nằm trong nó thì một lượt thêm tab sửa cả hai vế của phép so sánh cùng lúc, và phép kiểm
 * xanh với mọi danh sách — tức nó không còn canh gì. Ở đây thì thêm tab là phải sửa HAI chỗ
 * có chủ ý: bộ sinh, rồi hợp đồng này.
 *
 * Trả `null` khi chưa khai — repo mới migrate chưa có khối này, và một phép kiểm đỏ oan ở repo
 * đích thì bị tháo trong một ngày. Suite gọi hàm này phải BỎ QUA CÓ TÊN, không bỏ qua im lặng. */
/* TÊN THƯ MỤC LƯU TRỮ — khai MỘT chỗ, hai chỗ đọc.
 *
 * `can-nang.mjs` miễn `docs/archive/` khỏi ngân sách tài liệu từ 06/09, và ghi rõ vì sao: ngân
 * sách đo THỨ MỌI PHIÊN PHẢI NẠP, mà lưu trữ theo định nghĩa là thứ không nạp mỗi lần. `AGENTS.md`
 * nói y hệt. Nhưng `session-check.mjs` thì KHÔNG miễn — hai bản của một luật, và 08/09 chúng lệch
 * thật: một lane chạy đúng nhịp DỌN mà repo bắt làm, dời 1.135 dòng sang lưu trữ, và cổng ĐỎ vì
 * chính việc dọn. Nên hằng số về đây, chỗ cả hai bên đều đã nạp. */
export const THU_MUC_LUU_TRU = "archive";

/* CÁC THƯ MỤC CON CỦA `docs/` KHÔNG TÍNH VÀO NGÂN SÁCH TÀI LIỆU — một danh sách, ba lý do CÙNG
 * MỘT HÌNH DẠNG. Ngân sách đo **thứ MỌI PHIÊN PHẢI NẠP**; ba thư mục dưới đây là **bản ghi việc
 * đã xảy ra**, chỉ đọc khi đi tra, và cả ba **chỉ có thể to lên**:
 *
 *   · `adr/`        quyết định đã `Accepted` là bất biến (ADR-0000)
 *   · `archive/`    thứ nhịp DỌN dời sang, giữ nguyên từng chữ
 *   · `migrations/` mỗi lượt migrate MỘT hồ sơ, chỉ thêm (AGENTS.md mục 6)
 *
 * Tính chúng vào thước thì mỗi quyết định mới / mỗi lượt dọn / mỗi lượt migrate đều làm cổng ĐỎ —
 * và một cổng đỏ vì việc ĐÚNG thì người ta nới số cho xong, rồi sau vài lượt thước hết nghĩa.
 * Đo được 08/09, cả ba đã xảy ra thật trong MỘT ngày: nhịp DỌN làm cổng đỏ, rồi một lượt migrate
 * làm cổng đỏ lần nữa. Đức chốt cả hai lượt.
 *
 * Bỏ ba thư mục ra thì con số thật là **3.248** — CHẶT HƠN 5.744 ban đầu gần một nửa. Miễn đúng
 * chỗ làm thước chặt hơn, không lỏng hơn: nó thôi đo thứ nó không định đo. */
export const THU_MUC_DOCS_KHONG_TINH = Object.freeze(["adr", THU_MUC_LUU_TRU, "migrations"]);

export function nhomBangFrom(parsed) {
  const khoi = parsed?.bang;
  if (khoi === null || khoi === undefined) return null;
  if (typeof khoi !== "object" || Array.isArray(khoi)) {
    throw new Error("CAU_TRUC_HONG: `bang` phải là một object, ví dụ { \"nhom\": [\"tong-quan\"] }.");
  }
  const nhom = khoi.nhom;
  if (nhom === undefined) return null;
  if (!Array.isArray(nhom) || nhom.length === 0) {
    throw new Error("CAU_TRUC_HONG: `bang.nhom` phải là mảng KHÔNG RỖNG các mã nhóm. Mảng rỗng làm phép kiểm đạt tầm thường với mọi bảng.");
  }
  for (const n of nhom) {
    if (typeof n !== "string" || !/^[a-z][a-z-]*[a-z]$/.test(n)) {
      throw new Error(`CAU_TRUC_HONG: mỗi mã nhóm phải là chữ thường và dấu gạch nối (khớp thuộc tính data-tab của trang). Đang là: ${JSON.stringify(n)}`);
    }
  }
  if (new Set(nhom).size !== nhom.length) {
    throw new Error(`CAU_TRUC_HONG: \`bang.nhom\` có mã trùng. Trùng thì phép so sánh theo tập vẫn đạt, nên bảng thiếu một tab mà không ai đỏ. Đang là: ${nhom.join(" ")}`);
  }
  return Object.freeze([...nhom]);
}

/* NHÁP DÙNG CHUNG — N-64, khôi phục 12/09.
 *
 * `.repo-structure.json` khai `nhap_dung_chung: ["drafts/"]` từ 09/09, và KHÔNG script nào đọc
 * nó — lượt migrate bộ khung (4da1e9e5) gỡ mất cả hàm này lẫn hai chỗ gọi. Tức một dòng LUẬT
 * nằm trong bản đồ mà không có máy nào cưỡng chế: đúng thứ tệ nhất, vì người đọc tin là có.
 *
 * Vì sao cần: CLAUDE.md toàn cục nói `drafts/` là chỗ DUY NHẤT agent tự ghi không cần hỏi —
 * tức nhiều lane ghi vào đó CÙNG LÚC theo đúng thiết kế. Tiền đề "bẩn trong vùng tôi giữ = của
 * tôi" sai ở đúng thư mục ấy. Đo 09/09 18:30: lane `claude-context-review` để một file nháp,
 * lane đang giữ `_root` bị quy cho nó và KHÔNG ĐẨY ĐƯỢC, trong khi không được commit hay xoá
 * file người khác. Đức ghi: "lần thứ ba trong một ngày". Đo lại 12/09: y hệt. */
export function nhapDungChungFrom(parsed) {
  const value = parsed?.nhap_dung_chung;
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new Error("NHAP_DUNG_CHUNG_HONG: `nhap_dung_chung` phải là mảng đường dẫn thư mục (hoặc bỏ hẳn).");
  }
  const ra = [];
  for (const d of value) {
    if (typeof d !== "string" || d === "") {
      throw new Error("NHAP_DUNG_CHUNG_HONG: mỗi mục phải là một đường dẫn thư mục khác rỗng.");
    }
    ra.push(d.endsWith("/") ? d : `${d}/`);
  }
  return Object.freeze(ra);
}

export function frozenFrom(parsed) {
  const value = parsed?.frozen;
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) {
    throw new Error("FROZEN_HONG: `frozen` phải là mảng đường dẫn gói đã đóng băng (hoặc bỏ hẳn).");
  }
  const ra = [];
  for (const p of value) {
    if (typeof p !== "string" || p === "") {
      throw new Error(`FROZEN_HONG: mỗi phần tử phải là một đường dẫn gói. Đang là: ${JSON.stringify(p)}`);
    }
    const chuan = p.replaceAll("\\", "/").replace(/\/+$/, "");
    if (chuan === "" || chuan.startsWith("/") || chuan.split("/").includes("..")) {
      throw new Error(`FROZEN_HONG: đường dẫn phải tương đối và không chứa "..". Đang là: ${JSON.stringify(p)}`);
    }
    ra.push(chuan);
  }
  return Object.freeze(ra);
}

export function loiKhuyenKhiChan(claims) {
  const daBoLai = Object.entries(claims || {})
    .filter(([, c]) => c && c.tra_khi_chua_day)
    .map(([khoa, c]) => `  ${khoa}: khai bỏ lại "${String(c.tra_khi_chua_day)}"`);
  if (!daBoLai.length) return ["Cách xử lý: chờ phiên đó tự push, HOẶC hỏi Đức rồi chạy lại kèm --carry."];
  return [
    "",
    "⚠ CÓ LANE ĐÃ TRẢ KHOÁ RỒI ĐI, VÀ ĐỂ LẠI COMMIT CHƯA ĐẨY — đừng chờ nó:",
    ...daBoLai,
    "Commit đó sẽ KHÔNG tự lên. Đây đúng là ca phải hỏi Đức rồi chạy lại kèm --carry."
  ];
}

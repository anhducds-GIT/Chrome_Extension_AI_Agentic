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
  for (const [key, value] of Object.entries(areas)) {
    if (key.startsWith("_")) continue;               // khoá chú thích, ví dụ "_doc_"
    if (!key.endsWith("/")) continue;                // chỉ vùng dạng thư mục mới có tiền tố
    if (!relPath.startsWith(key)) continue;
    const steward = value?.steward;
    if (steward === null || steward === undefined) return "_root";
    // Gõ sai tên khoá (ví dụ "root" thiếu gạch dưới) mà im lặng bỏ qua là kiểu hỏng tệ nhất:
    // vùng đó lặng lẽ về `_root`, hai phiên lại choảng nhau, và cổng vẫn xanh.
    if (typeof steward !== "string" || !steward.startsWith("_")) {
      throw new Error(`CAU_TRUC_HONG: areas["${key}"].steward phải là khoá quyền bắt đầu bằng "_" (ví dụ "_root", "_docs"). Đang là: ${JSON.stringify(steward)}`);
    }
    return steward;
  }
  return "_root";                                    // file ở tầng ngoài cùng, không thuộc vùng nào
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

export function generatorsFrom(parsed) {
  const value = parsed?.generators;
  if (value === undefined) return DEFAULT_GENERATORS;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("GENERATORS_HONG: `generators` phải là mảng không rỗng các tên script trong scripts/ (hoặc bỏ hẳn để dùng mặc định).");
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
export function readStructureFromDisk(root) {
  const file = path.join(root, STRUCTURE_FILE);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`CAU_TRUC_HONG: ${STRUCTURE_FILE} không phải JSON đọc được (${error.message}). Sửa file đó rồi chạy lại.`);
  }
}

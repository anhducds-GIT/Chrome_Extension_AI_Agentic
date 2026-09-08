/* NHẬN / TRẢ QUYỀN GÓI — một lệnh, và nó TỪ CHỐI khi không được phép.
 *
 * Vì sao có file này (đo thật 2026-09-02): quyền được nhận bằng `node -e "…"` thủ công, tức
 * đọc → sửa → ghi. Hai phiên cùng đọc thấy "trống" rồi cùng ghi tên mình thì **người ghi sau
 * thắng, người ghi trước không hề biết**. Hôm đó ghi được 63 lần trong một ngày, 21 nhãn phiên
 * khác nhau, và một lần quyền bị ghi đè thật.
 *
 * Nghịch lý mà file này chữa: `claims.json` sinh ra để chống tranh chấp, mà chính nó là tài
 * nguyên bị tranh chấp và không được bảo vệ.
 *
 * KHÔNG hứa chống đua tuyệt đối — Node không có khoá file khả chuyển. Nó làm hai việc:
 *   1. thu cửa sổ đua từ "vài phút giữa lúc đọc và lúc ghi" xuống "vài mili-giây";
 *   2. GHI RỒI ĐỌC LẠI để KIỂM — nếu vẫn bị ghi đè thì nó **nói to**, thay vì im lặng.
 * Khác biệt giữa "thỉnh thoảng xảy ra" và "thực tế không xảy ra", cộng với "không bao giờ âm
 * thầm".
 *
 * Dùng:
 *   node scripts/claim.mjs --list
 *   node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu"
 *   node scripts/claim.mjs --release <khoá> --as <phiên> [--task "một câu"]
 *
 * TRẢ QUYỀN SAU KHI ĐẨY, không phải sau khi commit (AGENTS.md mục 1). `--release` TỪ CHỐI khi
 * vùng đó còn commit chưa đẩy. Thật sự phải bàn giao vùng lúc chưa đẩy được:
 *   node scripts/claim.mjs --release <khoá> --as <phiên> --du-biet "vì sao chưa đẩy được"
 *
 * Mã thoát:  0 xong · 2 dùng sai · 3 TỪ CHỐI (đã có chủ khác / không phải chủ / còn commit
 *            chưa đẩy) · 4 bị ghi đè
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { appendOnlyAtEof, appendOnlyExemptFrom, CHUA_DAY, generatedFrom, CHUA_THAY_DAU_VET, claimPrefixesFrom, commitChuaDay, DAU_VET, dauVetTheoVung, mocMs, readStructureFromDisk, stewardOf } from "./repo-structure.mjs";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");
export const CLAIMS_FILE = path.join(ROOT, ".agents", "claims.json");

export const EXIT = Object.freeze({ OK: 0, MISUSE: 2, REFUSED: 3, CLOBBERED: 4 });

/* NGỦ ĐỒNG BỘ, vài mili giây. `Atomics.wait` chứ không vòng lặp bận: vòng lặp bận đốt một
   lõi trong đúng lúc máy đang bận vì có lane khác chạy — tức nó làm nặng thêm cái nó đang chờ. */
function nghiMs(ms) {
  try { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } catch { /* thôi */ }
}

/* ---- ĐỌC BẢNG: THỬ LẠI CÓ GIỚI HẠN — N-33 ---------------------------------
 *
 * **[ĐO 07/09, lúc có 6 lane cùng chạy]** cổng đóng phiên nhấp nháy đỏ 1–2 mục, và mục đỏ nào
 * chạy riêng ngay sau cũng XANH. Một trong ba câu báo sai là *"claims.json thiếu trường
 * `_fingerprint`"* trong khi đọc trực tiếp năm lượt đều thấy nó.
 *
 * Nguyên nhân: `writeFileSync` **không nguyên tử**. Nó cắt file về 0 byte rồi ghi lại, nên có
 * một khe vài chục micro-giây mà người đọc thấy một file rỗng hoặc cụt. Bảng này bị ghi rất
 * dày — đo 02/09: **63 lượt ghi trong một ngày**.
 *
 * Cái giá của một lượt đỏ SAI không nhỏ: cổng đỏ thì luật cấm báo xong và cấm đẩy, nên nó
 * **giam commit của cả repo**; tệ hơn, nó dạy phiên đi sửa một thứ không hỏng — hoặc chạy
 * `--restamp` cho xong việc, đúng cái luật cấm.
 *
 * HAI LỚP, và lớp ghi mới là lớp chính: `ghiBangNguyenTu` bên dưới ghi ra file tạm rồi
 * `rename` — `rename` trong cùng một thư mục là nguyên tử, nên người đọc thấy **hoặc bản cũ
 * hoặc bản mới**, không bao giờ thấy nửa chừng. Lớp đọc này là dây bảo hiểm cho bản ghi của
 * công cụ khác (và của lượt sửa tay), không phải lớp chính.
 *
 * CHỈ THỬ LẠI VỚI LỖI THOÁNG QUA. Một bảng hỏng THẬT thì hỏng ổn định, nên thử lại ba lượt
 * cũng ra đúng lỗi ấy và nó vẫn được ném — thử lại **không** biến một bảng hỏng thành hợp lệ. */
export function readClaims(file = CLAIMS_FILE, { lan = 3, nghi = 15 } = {}) {
  let cuoiCung;
  for (let i = 0; i < Math.max(1, lan); i += 1) {
    if (i > 0) nghiMs(nghi);
    let raw;
    try { raw = fs.readFileSync(file, "utf8"); }
    catch (error) {
      // File KHÔNG CÓ là kết luận ổn định — đừng thử lại ba lượt cho một câu trả lời không đổi.
      if (error && error.code === "ENOENT") throw new Error(`CLAIMS_KHONG_DOC_DUOC: ${error.message}`);
      cuoiCung = new Error(`CLAIMS_KHONG_DOC_DUOC: ${error.message}`);
      continue;
    }
    let parsed;
    try { parsed = JSON.parse(raw); }
    catch (error) { cuoiCung = new Error(`CLAIMS_HONG: không phải JSON đọc được (${error.message}). Sửa tay rồi chạy lại.`); continue; }
    if (!parsed || typeof parsed.claims !== "object" || Array.isArray(parsed.claims)) {
      cuoiCung = new Error("CLAIMS_HONG: thiếu khối `claims` dạng object.");
      continue;
    }
    return parsed;
  }
  throw cuoiCung;
}

/* GHI NGUYÊN TỬ — lớp chính của N-33. Ghi ra file tạm CÙNG THƯ MỤC rồi `rename`: cùng thư mục
   thì cùng phân vùng, và `rename` cùng phân vùng là một thao tác nguyên tử của hệ điều hành.
   Tên tạm mang PID để hai tiến trình không giẫm lên file tạm của nhau. */
export function ghiBangNguyenTu(file, noiDung) {
  const tam = `${file}.dang-ghi-${process.pid}`;
  try {
    fs.writeFileSync(tam, noiDung, "utf8");
    fs.renameSync(tam, file);
  } finally {
    // Dọn file tạm nếu `rename` không tới nơi. Không ném ở đây — lỗi thật đã ném ở trên rồi,
    // và một lỗi dọn dẹp che mất lỗi gốc là kiểu báo lỗi tệ nhất.
    try { if (fs.existsSync(tam)) fs.unlinkSync(tam); } catch { /* thôi */ }
  }
}

/* ---- DẤU NIÊM PHONG -------------------------------------------------------
 *
 * Vấn đề còn lại sau khi có lệnh này: lệnh bảo vệ ĐƯỜNG GHI, nhưng không gì bảo vệ chính
 * `claims.json` khỏi bị mở ra sửa tay. Ngày 03/09 đã xảy ra thật — cả bốn khoá gốc bị đổi chủ
 * bằng một lượt sửa hàng loạt, đi vòng qua lệnh này, và phiên đang giữ khoá không hề biết.
 *
 * VÌ SAO KHÔNG SOI BẰNG CÁCH SO TRẠNG THÁI: hướng hiển nhiên là so bảng cũ với bảng mới rồi
 * bắt lỗi "chủ đổi thẳng từ người này sang người kia". Hướng đó SAI, và tự tay tôi chứng minh
 * cùng ngày: `_root` đi từ "claude-don-nha" sang "claude-k2-design" trong đúng một diff, mà
 * chuỗi thật là TRẢ rồi NHẬN — hai thao tác hoàn toàn hợp lệ, chỉ bị ép phẳng khi so hai ảnh
 * chụp. Ảnh chụp không phân biệt được "trả rồi nhận" với "ghi đè", nên phép kiểm kiểu đó chỉ
 * báo oan.
 *
 * Nên: đóng dấu, đừng so. Lệnh này ghi một dấu băm của khối `claims` vào chính file. Sửa tay
 * làm dấu vỡ, và cổng đóng phiên của BẤT KỲ phiên nào cũng thấy — kể cả phiên vừa bị mất khoá.
 *
 * Chỉ băm khối `claims`. Văn xuôi `_doc` / `_labels` sửa thoải mái không vỡ dấu — dấu để bắt
 * đổi chủ lén, không phải để đóng băng tài liệu.
 *
 * KHÔNG hứa chống người cố tình: ai muốn thì tính lại dấu được. Nó chặn ĐƯỜNG TẮT, không chặn
 * kẻ địch — và đường tắt mới là thứ đã xảy ra hai lần. Muốn mạnh hơn thì cần sổ cái chỉ-thêm
 * (mỗi lượt nhận/trả một dòng, cổng phát lại từ gốc); ghi ở BACKLOG, chưa xây vì chưa cần.
 */
export const FINGERPRINT_FIELD = "_fingerprint";
/* Khoá file sinh ra để giữ VÀI PHÚT (Đức 08/09). Quá ngưỡng này là dấu hiệu ai đó quên trả —
   và quên trả thì nó thoái hoá thành đúng cái khoá dài hạn mà nó thay thế. NHẮC, không tự nhả:
   tự nhả là tự động hoá đúng vụ nhả-khoá-hộ ngày 06/09, lần này không ai kịp thấy. */
export const PHUT_NHAC_KHOA_FILE = 30;

export const VO_DAU = "DAU_VO: `.agents/claims.json` đã bị sửa NGOÀI lệnh này — dấu niêm phong không khớp nội dung.\n"
  + "Nghĩa là có người mở file ra sửa tay. Ngày 03/09 chuyện này đã lấy mất khoá của một phiên đang làm dở,\n"
  + "và phiên đó không hề biết. ĐỪNG đóng lại dấu cho xong.\n"
  + "  1. xem đã đổi gì:  git diff .agents/claims.json\n"
  + "  2. khoá của bạn có bị đổi chủ không? nếu có thì hỏi Đức — luật mục 1: muốn giành thì hỏi.\n"
  + "  3. chốt xong rồi mới đóng lại dấu: node scripts/claim.mjs --restamp --as <phiên>\n"
  + "     (nếu lượt sửa đó CHUYỂN CHỦ một khoá thì lệnh sẽ đòi thêm --duc-duyet \"<câu chốt của Đức>\",\n"
  + "      và câu đó được ghi VÀO bảng — để phiên vừa mất khoá đọc được, vì họ chỉ đọc bảng chứ không chạy lệnh)";

const canon = (v) => {
  if (v === undefined) return "null";
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
};

/* Băm ổn định: thứ tự khoá trong file không đổi được dấu, nội dung đổi thì dấu đổi. */
export function claimsFingerprint(claims, tam) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("CLAIMS_HONG: không băm được — khối `claims` phải là object.");
  }
  /* KHỐI `tam` RỖNG THÌ BĂM Y HỆT HÔM QUA — cố ý, và đây là chỗ dễ làm sai nhất.
     Băm thẳng `{claims, tam}` là đổi dấu của MỌI bảng đang tồn tại, nên ngay lượt chạy sau
     mọi phiên khác thấy `DAU_VO` và cổng của họ đỏ vì một cải tiến họ không liên quan.
     Có khoá file thì dấu phủ cả hai khối, nên không có cửa nào để sửa tay lọt qua. */
  const coTam = tam && typeof tam === "object" && !Array.isArray(tam) && Object.keys(tam).length > 0;
  return createHash("sha256").update(canon(coTam ? { claims, tam } : claims)).digest("hex").slice(0, 16);
}

/* null = chưa từng đóng dấu (file cũ) · true/false = dấu còn nguyên / đã vỡ. Ba trạng thái,
 * cố ý không gộp: "chưa kiểm" không được đội lốt "đã đạt". */
export function fingerprintState(parsed) {
  const stamped = parsed?.[FINGERPRINT_FIELD];
  if (typeof stamped !== "string" || stamped === "") return { stamped: null, actual: claimsFingerprint(parsed?.claims, parsed?.tam), ok: null };
  const actual = claimsFingerprint(parsed.claims, parsed.tam);
  return { stamped, actual, ok: stamped === actual };
}

/* ---- TUỔI KHOÁ ------------------------------------------------------------
 *
 * Ngày 03/09 hai khoá gốc bị giành bằng tay, và một phần lý do là ĐÚNG: chủ của chúng đã tắt
 * thật, khoá thành bỏ rơi. Nhưng bảng không hề nói ra điều đó — `claimed_at` chỉ có NGÀY, nên
 * một khoá nhận cách đây 5 phút và một khoá bỏ quên từ sáng trông y hệt nhau. Người muốn làm
 * đúng cũng không có cách nào phân biệt, nên họ đoán.
 *
 * Nên: ghi cả GIỜ, và in tuổi ra ngay chỗ người ta nhìn trước khi quyết định — `--list`.
 *
 * CỐ Ý KHÔNG tự đòi lại khoá quá hạn. Một phiên chạy dài là chuyện bình thường ở repo này, và
 * `claimed_at` không được chạm lại trong lúc làm, nên "cũ" KHÔNG đồng nghĩa "chết". Tự đòi lại
 * là dựng đúng cái tai nạn hôm nay thành tính năng. Đây là số liệu cho người đọc, không phải
 * một phán quyết — luật mục 1 vẫn giữ nguyên: muốn giành thì hỏi Đức.
 */
export const GIO_NHAC = 6;

/* Chấp nhận cả dạng cũ chỉ có ngày ("2026-09-02") lẫn dạng mới có giờ. Không đọc được thì trả
 * null — đoán bừa một con số giờ còn tệ hơn không nói gì. */
export function ageHours(stamp, now = new Date()) {
  /* MỘT bản của luật đọc mốc nhận, dùng chung với phép đo dấu vết (`mocMs` trong
     `repo-structure.mjs`). Hai bản của một luật đã trả hai câu khác nhau cho cùng một file
     ngày 02/09 — xem `append_only_exempt` trong AGENTS.md mục 1. */
  const t = mocMs(stamp);
  if (t === null) return null;
  return Math.max(0, (now.getTime() - t) / 3600000);
}

export function ageLabel(hours) {
  if (hours === null) return "";
  if (hours < 1) return `${Math.round(hours * 60)} phút`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)} ngày`;
}

/* ---- ĐÓNG DẤU KHÔNG ĐƯỢC RỬA SẠCH MỘT VỤ ĐỔI CHỦ ------------------------
 *
 * Lỗ thật, đo được ngày 04/09: `--take` từ chối cứng khi vùng có chủ khác — nhưng `--restamp`
 * thì đóng dấu cho BẤT KỲ nội dung nào đang nằm trên đĩa. Nên đường đi trọn vẹn của một vụ
 * lấy khoá là: sửa tay `claims.json` → `--restamp` → bảng có dấu hợp lệ, cổng XANH với mọi
 * phiên, và **người vừa bị lấy khoá không hề biết**.
 *
 * Đã xảy ra thật: `_code` bị lấy khỏi tay phiên `claude-k2-snapshot` GIỮA LÚC phiên đó đang
 * sửa đúng vùng đó, kèm một trường `taken_from` viết tay. Trường đó KHÔNG do công cụ này sinh
 * ra — `claim.mjs` chưa bao giờ ghi nó — nên nó không phải bằng chứng gì cả, nó chỉ là chữ.
 * Phiên bị lấy chỉ phát hiện vì cổng in "Bạn chịu trách nhiệm: (không vùng nào)".
 *
 * Vì sao cảnh báo bằng chữ trên màn hình không đủ: bản cũ CÓ in "nếu bạn không cố ý thì vừa
 * xoá dấu vết một vụ sửa tay". Người đang cố ý làm thì đọc câu đó rồi đi tiếp. Một dòng chữ
 * không phải một chốt.
 *
 * KHÔNG cấm hẳn việc chuyển chủ. Có ca thật cần nó: chủ cũ đã tắt, Đức phân xử xong, phải có
 * đường ghi lại kết quả. Nên luật là: chuyển chủ thì PHẢI có câu chốt của Đức, và câu đó được
 * ghi VÀO FILE chứ không chỉ in ra màn hình — để phiên bị lấy đọc được, và để lần sau còn
 * truy được. Im lặng là thứ bị cấm, không phải việc chuyển chủ.
 *
 * ĐỐI CHIẾU VỚI KHỐI "DẤU NIÊM PHONG" Ở TRÊN — nó nói thẳng rằng so hai ảnh chụp là hướng SAI,
 * vì "trả rồi nhận" bị ép phẳng thành "ghi đè" và phép kiểm sẽ báo oan. Câu đó ĐÚNG, và tôi
 * không lật nó. Khác biệt nằm ở CHỖ ĐẶT:
 *   · ở đó, phép so chạy trên MỌI lượt nhận/trả — tức đường đi bình thường của cả repo, nên
 *     báo oan là chi phí thường trực và nó sẽ bị bỏ qua như mọi cảnh báo hay kêu;
 *   · ở đây, phép so chỉ chạy trong `--restamp` — một lệnh mà theo đúng tài liệu của nó chỉ
 *     được dùng SAU khi đã có sửa tay và Đức đã phân xử. Nhận/trả bình thường không bao giờ
 *     đi qua đây.
 * Nên ca báo oan (trả-rồi-nhận rồi có người restamp) tốn đúng một cờ kèm một câu — trong một
 * tình huống mà theo định nghĩa đã cần một câu của Đức rồi. So sánh không phải công cụ xấu;
 * đặt nó lên đường đi thường ngày mới là cái xấu.
 */
/* MỐC SO PHẢI LÀ "BẢN NIÊM PHONG HỢP LỆ GẦN NHẤT", KHÔNG PHẢI HEAD — audit GPT vòng 7, 04/09.
 *
 * Bản đầu của tôi lấy thẳng `HEAD:.agents/claims.json` làm mốc. Hai lỗ, cả hai tôi tự tạo ra:
 *
 * 1. VÒNG QUA BẰNG MỘT LƯỢT COMMIT. Sửa tay owner → `git commit` (dấu đang vỡ, nhưng `git
 *    commit` không hỏi ai) → `--restamp`. Lúc đó HEAD đã mang owner mới, file trên đĩa cũng
 *    owner mới, nên phép so thấy "không đổi gì" và không đòi câu chốt nào. Chốt vừa dựng xong
 *    đã có cửa sau, và cửa đó chỉ tốn thêm một lệnh.
 * 2. LỖI ĐỌC GIT THÀNH "KHÔNG CÓ VẤN ĐỀ". `catch { return null; }` rồi `khoaBiDoiChu(null,…)`
 *    trả mảng rỗng. Tức git hỏng → kết luận không ai bị lấy khoá → cho đóng dấu. Đúng họ lỗi
 *    mà cổng đóng phiên vừa loại bỏ sáng nay bằng phép kiểm #12.
 *
 * Nên mốc so KHÔNG phải "bản mới nhất", mà là **bản gần nhất mà dấu còn khớp nội dung** — tức
 * bản cuối cùng ta biết chắc chưa bị sửa tay. Một lượt sửa tay rồi commit sẽ tạo ra một bản có
 * dấu KHÔNG khớp; bản đó bị bỏ qua, và phép so lùi tiếp về mốc lành. Cửa sau đóng lại.
 *
 * Ba trạng thái, cố ý không gộp — "chưa biết" không được đội lốt "không sao":
 *   OK        → có mốc lành, so với nó.
 *   BOOTSTRAP → repo chưa từng đóng dấu lần nào (thời trước khi có niêm phong, hoặc repo mới
 *               dựng). Cho qua, vì đòi hỏi ở đây là khoá repo ngay từ commit đầu.
 *   LOI       → không đọc được lịch sử, HOẶC quét hết mức cho phép mà không thấy mốc lành nào.
 *               TỪ CHỐI. Không đoán.
 */
export const BASELINE = Object.freeze({ OK: "ok", BOOTSTRAP: "bootstrap", LOI: "loi" });
const QUET_TOI_DA = 50;

export function baselineDaNiemPhong(root = ROOT, capQuet = QUET_TOI_DA) {
  const chay = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8" });

  // HAI CÂU HỎI, KHÔNG PHẢI MỘT — audit GPT vòng 8, 04/09.
  //
  // Bản trước hỏi đúng một câu (`rev-parse --verify HEAD` có chạy không) rồi coi mọi thất bại
  // là "repo mới, cho qua". Nhưng thất bại đó có HAI nguyên nhân hoàn toàn khác nhau:
  //   · repo git hợp lệ mà chưa có commit nào → chưa từng có trạng thái niêm phong để mà mất.
  //     Bootstrap thật, cho qua, nếu không thì khoá repo ngay commit đầu tiên.
  //   · KHÔNG phải repo git / `.git` hỏng / git không chạy được → ta KHÔNG BIẾT lịch sử có gì.
  //     "Không biết" phải là TỪ CHỐI. Đây đúng họ lỗi đã bị loại khỏi K2 nhiều lần rồi.
  //
  // Nên hỏi tách làm hai: đứng trong cây làm việc git đã, rồi mới hỏi HEAD.
  let trongCayGit = "";
  try { trongCayGit = chay("rev-parse", "--is-inside-work-tree").trim(); } catch { trongCayGit = ""; }
  if (trongCayGit !== "true") {
    return { trangThai: BASELINE.LOI, ly_do: "không đọc được git ở đây (không phải cây làm việc git, hoặc git không chạy được)" };
  }
  try { chay("rev-parse", "--verify", "HEAD"); }
  catch { return { trangThai: BASELINE.BOOTSTRAP, ly_do: "repo git hợp lệ nhưng chưa có commit nào" }; }

  let shas;
  try {
    shas = chay("log", `-n${capQuet}`, "--format=%H", "--", ".agents/claims.json")
      .split("\n").map((s) => s.trim()).filter(Boolean);
  } catch (error) {
    return { trangThai: BASELINE.LOI, ly_do: `không đọc được lịch sử của bảng quyền: ${String(error.message).split("\n")[0]}` };
  }
  if (!shas.length) return { trangThai: BASELINE.BOOTSTRAP, ly_do: "bảng quyền chưa từng được commit" };

  // ĐẾM CẢ SỐ BẢN ĐỌC HỎNG. Bản đầu của tôi chỉ `continue` — nên nếu MỌI bản đều đọc hỏng thì
  // vòng lặp kết thúc êm, `thayDau` vẫn false, và hàm trả BOOTSTRAP tức CHO QUA. Đó là đúng
  // fail-open mà bản vá này sinh ra để diệt, chỉ là nó nấp sâu hơn một tầng. GPT không nêu ca
  // này; tôi tìm ra khi đọc lại vòng lặp của chính mình.
  let thayDauBaoGioChua = false;
  let soBanDocHong = 0;
  for (const sha of shas) {
    let parsed;
    try { parsed = JSON.parse(chay("show", `${sha}:.agents/claims.json`)); }
    catch { soBanDocHong += 1; continue; }
    const stamped = parsed?.[FINGERPRINT_FIELD];
    if (typeof stamped !== "string" || stamped === "") continue;   // bản thời chưa có dấu
    thayDauBaoGioChua = true;
    let actual;
    try { actual = claimsFingerprint(parsed.claims, parsed.tam); } catch { soBanDocHong += 1; continue; }
    if (stamped === actual) return { trangThai: BASELINE.OK, claims: parsed.claims, sha };
    // dấu KHÔNG khớp = bản này đã bị sửa tay rồi commit. Bỏ qua, lùi về mốc lành hơn.
    // Chính chỗ này đóng cửa sau "sửa tay → commit → restamp": lượt commit đó không biến
    // trạng thái bẩn thành mốc so được.
  }
  // Chỉ cho qua khi CHẮC CHẮN là repo thời trước niêm phong: không bản nào có dấu, không bản
  // nào đọc hỏng, và đã quét hết lịch sử chứ không phải dừng vì chạm trần.
  if (!thayDauBaoGioChua && soBanDocHong === 0 && shas.length < capQuet) {
    return { trangThai: BASELINE.BOOTSTRAP, ly_do: "bảng quyền chưa bao giờ được đóng dấu" };
  }
  return {
    trangThai: BASELINE.LOI,
    ly_do: `quét ${shas.length} bản gần nhất của bảng quyền mà không thấy mốc niêm phong lành nào`
      + (soBanDocHong ? ` (${soBanDocHong} bản không đọc được)` : "")
  };
}

/* Hàm THUẦN: khoá nào vừa bị chuyển khỏi tay một người ĐANG GIỮ, mà người đó không phải bạn.
 *
 * `cu === as` thì bỏ qua — bạn nhả hoặc giữ tiếp khoá của chính mình là chuyện bình thường.
 * `cu === null` cũng bỏ qua — nhận một vùng trống không lấy của ai.
 * Còn lại (`X → Y` và `X → trống`, với X không phải bạn) đều phải có Đức chốt: cả hai đều xoá
 * quyền của một phiên có thể đang làm dở, và phiên đó không có cách nào tự biết. */
export function khoaBiDoiChu(truoc, sau, as) {
  const ra = [];
  for (const [key, cur] of Object.entries(sau || {})) {
    const cu = truoc?.[key]?.owner ?? null;
    const moi = cur?.owner ?? null;
    if (cu && cu !== as && cu !== moi) ra.push({ key, tu: cu, sang: moi });
  }
  return ra;
}

/* ---- MỞ MỘT VÙNG DÙNG CHUNG — N-41 -----------------------------------------
 *
 * Ca thật 07–08/09 khi mở `workers/_shared/`: cả ba cửa đều đóng. `--take` từ chối khoá lạ và
 * bảo *"khai ở .repo-structure.json trước"*; khai vào khối `areas` **vẫn đỏ**, vì mọi thư mục
 * dưới `workers/` là một package cần khoá riêng trong `claims.json`; và **không lệnh nào tạo
 * được khoá đó**. Nên người đầu tiên phải sửa tay `claims.json` rồi `--restamp` — đúng thao
 * tác mà luật cảnh báo nặng nhất.
 *
 * Nó chạy được. Vấn đề là **một đường hợp lệ trông giống hệt một vụ cướp khoá**, nên lần sau
 * không ai phân biệt được hai thứ đó — và người đọc `git diff` thì càng không.
 *
 * Cửa này KHÔNG nới lỏng gì: nó chỉ tạo một ô TRỐNG CHỦ cho một khoá mà cấu hình đã công nhận.
 * Không chạm chủ của khoá nào — có phép kiểm ngay trong lệnh, và nó FAIL CLOSED. */
export function kiemKhoaKhaiDuoc(khoa, { structure, prefixes, coThuMuc }) {
  if (typeof khoa !== "string" || khoa.trim() === "" || khoa !== khoa.trim()) {
    return { ok: false, ly_do: "tên khoá rỗng hoặc dính khoảng trắng" };
  }
  /* HỎI CHÍNH BỘ QUY VÙNG, đừng tự đoán luật. Một khoá hợp lệ là khoá mà `stewardOf()` của một
     file BÊN TRONG nó trả về đúng nó. Viết lại luật ở đây là đẻ ra bản sao thứ hai của một
     luật — và hai bản sao đã trả hai câu khác nhau cho cùng một file ngày 02/09. */
  const thu = stewardOf(`${khoa}/.kiem-mot-file-khong-co-that`, structure, prefixes);
  if (thu !== khoa) {
    return {
      ok: false,
      ly_do: `\`.repo-structure.json\` chưa công nhận "${khoa}" là một vùng — file bên trong nó `
        + `quy về "${thu}". Khai khối \`areas\` trước, rồi chạy lại.`,
    };
  }
  if (!coThuMuc(khoa)) {
    return {
      ok: false,
      ly_do: `thư mục "${khoa}" chưa có trên đĩa. Khoá cho một vùng không tồn tại là một dòng `
        + "không ai đọc, và nó sẽ nằm đó mãi.",
    };
  }
  return { ok: true };
}

/* ---- KHOÁ MỨC FILE: GIỮ NGẮN, TRẢ NGAY — Đức chốt 2026-09-08 ---------------
 *
 * Nguyên văn: *"AI Assistant chỉ giữ khóa đúng ở file mà AI đó đang sửa … khóa được giữ và trả
 * ngay trước và sau khi AI sửa … Nếu chỉ đọc ko cần giữ khóa."*
 *
 * SỐ ĐO ỦNG HỘ, và tôi đã đo vì linh cảm ban đầu của tôi NGƯỢC LẠI. Nhìn bảng "file bị hai lane
 * chạm nhiều nhất" thì bốn cái đầu là `HANDOFF.md` · `BACKLOG.md` · `claims.json` · `AGENTS.md`,
 * mà ba trong bốn cái đó VỐN ĐÃ miễn khoá — nên thoạt trông khoá file chẳng gỡ được gì. Đếm đủ
 * thì khác hẳn: **2.628 cặp commit khác lane, cách nhau ≤ 1 giờ, cùng vùng** — trong đó
 * **1.839 cặp (70%) KHÔNG đụng file nào chung**. Bảy phần mười lượt chặn hôm nay là chặn oan.
 *
 * BA CHỖ THIẾT KẾ, không cái nào tuỳ tiện:
 *
 * ⑴ **Khoá file ở khối RIÊNG (`tam`), không nhét vào `claims`.** Hàng trong `claims` là vùng sở
 *    hữu — vĩnh viễn, trống chủ thì vẫn còn hàng; `session-check` còn có bất biến *"mỗi khoá
 *    vùng gốc phải có thư mục khai steward, và ngược lại"*. Nhét một đường dẫn file vào đó là
 *    làm bất biến ấy đỏ. Khoá file thì NGƯỢC: nó là tạm, trả xong thì **xoá hàng**.
 *
 * ⑵ **Dấu niêm phong phủ cả khối mới, nhưng KHÔNG đổi dấu khi chưa ai khoá file nào.** Băm
 *    `{claims, tam}` thay vì `claims` sẽ làm MỌI phiên đang chạy thấy `DAU_VO` ngay lượt sau —
 *    một lượt cải tiến không được phép làm cả repo đỏ. Nên: khối rỗng thì băm y hệt hôm qua,
 *    có khoá file thì băm phủ cả hai. Không có cửa nào để sửa tay lọt qua.
 *
 * ⑶ **CHỨA NHAU HAI CHIỀU.** Ai giữ cả vùng thì được ghi mọi file trong đó, nên khoá file phải
 *    từ chối nếu vùng bao ngoài có chủ khác; và ngược lại, nhận cả vùng phải từ chối nếu bên
 *    trong còn khoá file của người khác. Thiếu một chiều là hai lane cùng tin mình được ghi.
 *
 * CÁI NÓ **KHÔNG** CHỮA, nói thẳng: khoá không giữ file — **git giữ**. Hai lane dùng CHUNG một
 * cây làm việc, nên `git commit -a` của lane này vẫn cuốn file đã dàn của lane kia (`N-40`, nổ
 * thật 07/09) và `git commit -o <file>` vẫn cuốn sửa đổi của lane kia trên chính file đó
 * (`N-05`). Khoá file làm số người ghi đồng thời TĂNG, nên hai lỗi đó nổ dày hơn chứ không thưa
 * đi. Bù lại nó mở đường vá: xem `--soat` ở dưới. */

/** Vùng bao ngoài một đường dẫn. Hỏi chính bộ quy vùng, không đoán lại luật. */
export function vungBaoNgoai(duongDan, structure, prefixes) {
  return stewardOf(duongDan, structure, prefixes);
}

/** Chuẩn hoá đường dẫn về dạng repo dùng: dấu gạch xuôi, không `./`, không dấu cách thừa. */
export function chuanDuongDan(d) {
  return String(d ?? "").trim().replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/* QUYẾT ĐỊNH THUẦN — không chạm đĩa, để ghim được mọi nhánh bằng chuỗi. `bang` = cả file
   `claims.json` đã đọc (`{ claims, tam }`). Trả `{ code, message?, next? }`; `next` là khối
   `tam` MỚI, bên gọi tự ghi. */
export function quyetDinhSua(bang, { duongDan, as, luc, vungCua }) {
  const d = chuanDuongDan(duongDan);
  if (!d || d.includes("..")) {
    return { code: EXIT.MISUSE, message: `DUONG_DAN_LA: "${duongDan}" — phải là đường dẫn tương đối từ gốc repo.` };
  }
  const tam = { ...(bang.tam || {}) };
  const dangGiu = tam[d]?.owner || null;
  if (dangGiu && dangGiu !== as) {
    return {
      code: EXIT.REFUSED,
      message: `TU_CHOI_SUA: "${d}" đang do "${dangGiu}" sửa (từ ${tam[d].luc || "?"}).`
        + `\nGhi chú của họ: ${String(tam[d].viec || "(không có)").slice(0, 160)}`
        + "\nKhoá file là loại giữ VÀI PHÚT. Đợi một nhịp rồi chạy lại — đừng giành, đừng sửa tay.",
    };
  }
  /* CHIỀU MỘT của luật chứa nhau: ai giữ cả vùng thì được ghi mọi file trong đó. */
  const vung = vungCua(d);
  const chuVung = bang.claims?.[vung]?.owner || null;
  if (chuVung && chuVung !== as) {
    return {
      code: EXIT.REFUSED,
      message: `TU_CHOI_SUA: "${d}" nằm trong vùng "${vung}", mà vùng đó đang do "${chuVung}" giữ.`
        + "\nGiữ cả vùng nghĩa là được ghi mọi file trong đó — khoá file không chen vào giữa được."
        + "\nLuật mục 1: vùng có chủ mà chủ không phải bạn thì CHỈ ĐƯỢC ĐỌC.",
    };
  }
  tam[d] = { owner: as, luc, viec: null };
  return { code: EXIT.OK, already: dangGiu === as, next: tam };
}

export function quyetDinhXong(bang, { duongDan, as }) {
  const d = chuanDuongDan(duongDan);
  const tam = { ...(bang.tam || {}) };
  const dangGiu = tam[d]?.owner || null;
  if (!dangGiu) return { code: EXIT.OK, already: true, next: tam };
  if (dangGiu !== as) {
    return {
      code: EXIT.REFUSED,
      message: `TU_CHOI_XONG: "${d}" đang do "${dangGiu}" sửa — KHÔNG trả hộ người khác.`
        + "\nTrả hộ là xoá dấu vết một phiên đang ghi dở, và họ sẽ không biết mình vừa mất quyền.",
    };
  }
  // XOÁ HÀNG, không để `owner: null`. Khoá file là tạm; giữ lại hàng trống thì sau một ngày
  // bảng đầy xác đường dẫn và không ai đọc nổi nó nữa.
  delete tam[d];
  return { code: EXIT.OK, next: tam };
}

/** Khoá file của người khác đang nằm TRONG một vùng — chặn lượt nhận cả vùng (chiều hai). */
export function khoaFileTrongVung(bang, vung, as, vungCua) {
  return Object.entries(bang.tam || {})
    .filter(([d, o]) => o?.owner && o.owner !== as && vungCua(d) === vung)
    .map(([d, o]) => ({ duongDan: d, owner: o.owner }));
}

/** Khoá file giữ quá lâu. Khoá file sinh ra để giữ VÀI PHÚT — quá ngưỡng là dấu hiệu ai đó
    quên trả, và quên trả thì nó thoái hoá thành đúng cái khoá vùng dài hạn mà nó thay thế. */
export function khoaFileQuaHan(bang, phut, now = Date.now()) {
  return Object.entries(bang.tam || {}).map(([d, o]) => {
    /* `mocMs`, KHÔNG `Date.parse` trần: mốc trong bảng là `2026-09-08T11:51` — thiếu chữ Z,
       nên `Date.parse` đọc nó là GIỜ ĐỊA PHƯƠNG và ra lệch đúng bằng múi giờ. Bản đầu báo một
       khoá vừa nhận 1 phút là "420 phút — quên trả?". Repo đã có hàm xử đúng, dùng lại nó. */
    const t = mocMs(o?.luc);
    const soPhut = t === null ? null : Math.floor((now - t) / 60000);
    return { duongDan: d, owner: o?.owner ?? null, phut: soPhut };
  }).filter((x) => x.phut !== null && x.phut > phut);
}


/* ---- SOÁT TRƯỚC KHI COMMIT — vá cái mà khoá file KHÔNG chữa được -----------
 *
 * Khoá không giữ file; **git giữ**. Hai lane dùng CHUNG một cây làm việc, nên `git commit -a`
 * của lane này cuốn file đã dàn của lane kia (`N-40`, nổ thật 07/09 — commit 27a88ce7 chứa 6
 * file của lane khác) và `git commit -o <file>` cuốn sửa đổi của lane kia trên chính file đó
 * (`N-05`, nổ hai lần trong một buổi 06/09).
 *
 * Khoá mức file làm số người ghi đồng thời TĂNG, nên hai lỗi ấy nổ DÀY HƠN. Nhưng nó cũng lần
 * đầu cho ta thứ để soát: trước đây "vùng tôi giữ" quá thô để nói file nào là của ai, giờ thì
 * đủ mịn. Đây là hàm đó.
 *
 * KHÔNG chặn được từ trong máy: cổng đóng phiên chạy lúc index đã rỗng, nên nó không nhìn thấy
 * gì. Đây là một LỆNH phải gọi, và mục 0b của `AGENTS.md` xếp nó vào đúng chỗ trong chuỗi. */
export function soatDanHang({ daDan, tam, claims, as, mienKhoa, maySinh, vungCua }) {
  /* HAI DANH SÁCH MIỄN, và bỏ sót cái thứ hai làm phép soát BÁO OAN ngay lượt dùng thật đầu
     tiên (08/09): nó chặn ba artifact máy sinh mà luật mục 1 khai rõ là **không đòi khoá nào**
     — không có gì của ai trong đó để mất, chạy lại bộ sinh là ra y hệt. Một cỗ máy dựng ra để
     chống chặn oan mà tự chặn oan thì nó sẽ bị bỏ qua trong một ngày. */
  const sinh = new Set(maySinh || []);
  const mien = new Set(mienKhoa || []);
  const la = [];
  const soChung = [];
  for (const f of daDan || []) {
    const d = chuanDuongDan(f);
    /* SỔ MIỄN KHOÁ KHÔNG ĐƯỢC IM LẶNG BỎ QUA — N-05.
       `BACKLOG.md` · `HANDOFF.md` · `IDEAS.md` miễn khoá khi chỉ thêm dòng ở cuối, nên nhiều
       lane cùng ghi vào chúng một cách HỢP LỆ. Đó là chỗ va chạm **được thiết kế ra**, không
       phải tai nạn — và nó là chỗ `N-05` nổ hai lần trong một buổi 06/09: `git commit -o
       BACKLOG.md` giới hạn đường dẫn rồi lấy TRỌN nội dung cây làm việc của đường dẫn ấy, tức
       cuốn cả những dòng lane khác vừa viết vào cùng file.
       Không chặn được (ghi vào đó là hợp lệ), nên trả về riêng để bên gọi soi tiếp: phần bạn
       dàn có đúng là CHỈ THÊM Ở CUỐI không. Sửa dòng cũ thì hoặc bạn phạm luật miễn khoá, hoặc
       bạn đang cuốn chữ của người khác — cả hai đều đáng dừng lại. */
    // Artifact máy sinh: bỏ qua HẲN. Nó không phải sổ, nên không soi append-only — bộ sinh
    // viết lại cả file mỗi lượt, và đó là hành vi đúng của nó.
    if (sinh.has(d)) continue;
    const vung = vungCua(d);
    /* GIỮ KHOÁ THÌ ĐƯỢC VIẾT LẠI, KỂ CẢ MỘT SỔ MIỄN KHOÁ.
       Miễn khoá nghĩa là "thêm dòng ở cuối thì KHÔNG CẦN khoá" — nó không có nghĩa là "có
       khoá cũng không được sửa". Bản đầu bỏ qua chủ sở hữu ngay khi thấy tên sổ trong danh
       sách miễn, nên lượt cắt `HANDOFF.md` mà ADR-0008 cho phép tường minh **không có đường
       nào qua nổi phép soát**, dù lane đang giữ đủ khoá — cửa duy nhất còn lại là
       `--no-verify`, tức tắt cả phép soát để làm một việc hợp lệ. Đo thật 09/09. */
    const coQuyen = (tam || {})[d]?.owner === as || (claims || {})[vung]?.owner === as;
    if (mien.has(d)) { soChung.push({ duongDan: d, coQuyen }); continue; }
    if (coQuyen) continue;
    la.push({ duongDan: d, vung, chuVung: (claims || {})[vung]?.owner || null, chuFile: (tam || {})[d]?.owner || null });
  }
  return { la, soChung };
}

/* Quyết định THUẦN — tách khỏi việc đọc/ghi để kiểm được mọi nhánh mà không cần đĩa. */
export function decide(claims, { action, key, as, today }) {
  if (!Object.prototype.hasOwnProperty.call(claims, key)) {
    return {
      code: EXIT.MISUSE,
      message: `KHOA_LA: "${key}" không có trong claims.json. Khoá hợp lệ: ${Object.keys(claims).join(" · ")}.`
        + "\nKhông tự thêm khoá mới ở đây — thêm một vùng sở hữu là chuyện cấu trúc, khai ở `.repo-structure.json` trước."
    };
  }
  const cur = claims[key];
  const owner = cur.owner || null;

  if (action === "take") {
    if (owner && owner !== as) {
      return {
        code: EXIT.REFUSED,
        message: `TU_CHOI: "${key}" đang do "${owner}" giữ, không phải bạn.`
          + `\nGhi chú của họ: ${String(cur.task || "(không có)").slice(0, 160)}`
          + "\nLuật mục 1: gói có chủ mà chủ không phải bạn thì CHỈ ĐƯỢC ĐỌC. Muốn giành thì hỏi Đức."
      };
    }
    // Đã là của mình rồi thì không phải lỗi — chạy lại lệnh cùng nội dung phải an toàn.
    return { code: EXIT.OK, already: owner === as, next: { ...cur, owner: as, ai: "Claude", claimed_at: today, released_at: null } };
  }

  if (action === "release") {
    if (!owner) return { code: EXIT.OK, already: true, next: cur };
    if (owner !== as) {
      return {
        code: EXIT.REFUSED,
        message: `TU_CHOI: "${key}" đang do "${owner}" giữ — KHÔNG trả quyền hộ người khác.`
          + "\nTrả hộ là xoá dấu vết một phiên đang làm dở, và phiên đó sẽ không biết mình vừa mất quyền."
      };
    }
    return { code: EXIT.OK, next: { ...cur, owner: null, ai: null, released_at: today } };
  }

  return { code: EXIT.MISUSE, message: `HANH_DONG_LA: "${action}"` };
}

/* ---- TRẢ QUYỀN SAU KHI ĐẨY, KHÔNG PHẢI SAU KHI COMMIT — TRA-KHOA-01, 06/09 --
 *
 * Luật này có từ 04/09, nhưng chỉ nằm trong sổ tay của vai ĐIỀU PHỐI — mà executor thì không
 * đọc sổ đó. Ngày 06/09 ba lane cùng vi phạm trong một buổi, và cả ba đều thành thật: chúng
 * đọc `AGENTS.md`, không thấy luật, nên trả khoá cho sạch. `AGENTS.md` mục 7: *luật nào không
 * kiểm được bằng máy thì sớm muộn cũng bị bỏ qua*. Nên nay máy kiểm.
 *
 * Vì sao trả khoá sớm là chuyện lớn: cổng đóng phiên không soi cây làm việc, nó soi **commit
 * chưa đẩy**. Commit của bạn còn nằm đó mà vùng đã trống chủ thì cổng báo *"Vùng gốc repo bị
 * sửa nhưng chưa ai đứng tên"*, và phiên đến sau phải dọn một mục đỏ không phải của họ.
 *
 * HÀM THUẦN, tách khỏi việc gọi git — để kiểm được cả ba nhánh mà không cần dựng một remote.
 * Nhưng test ghim PHẢI đi qua CLI, không chỉ qua hàm này: `MULTIFLOW.md` mục 5 bẫy ①, "ghim
 * hàm không thay được ghim đường đi" — hàm trả đúng mà `main()` lờ đi thì cũng như không.
 *
 * BA NHÁNH, và ranh giới giữa chúng là điểm chính:
 *   · LOI (không đọc được git)      → CHẶN. Bất biến ④: "không biết" phải là ĐỎ.
 *   · KHONG_CO_MOC (chưa có remote) → KHÔNG chặn. Đây là bootstrap thật — repo mới dựng từ bộ
 *     khung chưa có `origin`, và nó KHÔNG BAO GIỜ có commit chưa đẩy để mà mất, vì chưa có
 *     chỗ nào để đẩy tới. Chặn ở đây là khoá cứng đúng đối tượng mà bộ khung nhắm tới, và đổi
 *     lại chẳng bảo vệ được gì.
 *   · OK                            → chặn KHI VÀ CHỈ KHI vùng này còn commit chưa đẩy.
 *
 * QUY THEO VÙNG, KHÔNG QUY THEO NHÃN LANE — cố ý. Thứ làm cổng phiên sau đỏ là "vùng bị chạm
 * mà không ai đứng tên", và nó không hỏi ai gõ phím. Một commit của lane khác chạm vùng bạn
 * đang giữ vẫn thành mồ côi y hệt lúc bạn trả khoá. */
export function canDayTruocKhiTra(doc, key) {
  if (!doc || doc.trangThai === CHUA_DAY.LOI) {
    return { chan: true, ma: "KHONG_DEM_DUOC", ly_do: doc?.ly_do ?? "không có kết quả đo" };
  }
  if (doc.trangThai === CHUA_DAY.KHONG_CO_MOC) return { chan: false, ma: "KHONG_CO_MOC", commits: [] };
  const commits = (doc.commits || []).filter((c) => Array.isArray(c.areas) && c.areas.includes(key));
  return commits.length ? { chan: true, ma: "CON_COMMIT_CHUA_DAY", commits } : { chan: false, ma: "SACH", commits: [] };
}

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true) : null;
  };
  /* Một lượt sửa chạm NHIỀU file — đo 7 ngày: trung vị 2 file/commit, p90 là 7. Bắt gõ bảy
     lệnh cho một lượt sửa là bảy dịp quên một cái, nên cờ này gom được cả mẻ. */
  const flagNhieu = (name) => {
    const i = argv.indexOf(`--${name}`);
    if (i < 0) return null;
    const ra = [];
    for (let k = i + 1; k < argv.length && !argv[k].startsWith("--"); k += 1) ra.push(argv[k]);
    return ra;
  };

  let parsed;
  try { parsed = readClaims(); }
  catch (error) { console.error(error.message); process.exit(EXIT.MISUSE); }

  const seal = fingerprintState(parsed);
  const bang = () => {
    let coCu = false;
    /* CỘT DẤU VẾT — N-09. Đọc git một lượt cho cả bảng. Git hỏng thì cột này im, KHÔNG in
       "chưa thấy": không đo được mà nói "chưa thấy" là mời người ta đi giành một khoá đang bận. */
    let dauVet = new Map();
    try { dauVet = dauVetTheoVung(ROOT, readStructureFromDisk(ROOT), Object.fromEntries(
      Object.entries(parsed.claims).filter(([, v]) => v?.owner).map(([k, v]) => [k, v.claimed_at])
    )); } catch { dauVet = new Map(); }
    let coVet = false;
    for (const [key, value] of Object.entries(parsed.claims)) {
      const owner = value.owner || "";
      let duoi = "";
      if (owner) {
        const gio = ageHours(value.claimed_at);
        if (gio !== null) {
          duoi = `  (giữ ${ageLabel(gio)})`;
          if (gio >= GIO_NHAC) { duoi += "  ⚠"; coCu = true; }
        }
        if (dauVet.get(key)?.trangThai === DAU_VET.CHUA_THAY) { duoi += `  · ${CHUA_THAY_DAU_VET}`; coVet = true; }
      }
      console.log(`${owner ? "GIU  " : "TRỐNG"} ${key.padEnd(34)}${owner}${duoi}`);
    }
    if (coVet) {
      console.log(`
"${CHUA_THAY_DAU_VET}" = không commit nào chạm vùng đó kể từ lúc nhận, và không file nào trong vùng`);
      console.log("  bị sửa trên đĩa. Nó nói REPO CHƯA THẤY GÌ — nó KHÔNG nói lane đó đang rảnh. Một lane cẩn thận");
      console.log("  dựng thử ngoài repo rồi mới ghi vào, và ngày 06/09 một khoá đã bị nhả hộ đúng vì đọc nhầm chỗ này.");
      console.log("  Thấy dòng này thì HỎI lane đó hoặc hỏi Đức. Ba đường hợp lệ để một khoá được trả: chính lane đó");
      console.log("  trả · lane đó báo đã xong · Đức chốt chuyển (--restamp --duc-duyet). Không có đường thứ tư.");
    }
    /* KHOÁ FILE in thành khối RIÊNG, dưới bảng vùng. Trộn chung là làm người đọc tưởng hai
       thứ cùng loại: một cái giữ hàng giờ và là quyền sở hữu, cái kia giữ vài phút và là
       "tôi đang gõ vào file này". */
    const tam = Object.entries(parsed.tam || {}).filter(([, o]) => o?.owner);
    if (tam.length) {
      console.log(`\nĐANG SỬA — ${tam.length} file, khoá giữ NGẮN:`);
      for (const [d, o] of tam) {
        const t = mocMs(o.luc);
        const phut = t === null ? null : Math.floor((Date.now() - t) / 60000);
        const nhac = phut !== null && phut > PHUT_NHAC_KHOA_FILE ? `  ⚠ ${phut} phút — quên trả?` : phut !== null ? `  (${phut} phút)` : "";
        console.log(`  ${d}  ← ${o.owner}${nhac}`);
      }
      console.log(`  Trả hết: node scripts/claim.mjs --xong --het --as <phiên>`);
    }
    if (coCu) {
      console.log(`\n⚠ = giữ đã quá ${GIO_NHAC}h. CŨ KHÔNG CÓ NGHĨA LÀ CHẾT — phiên chạy dài là bình thường,`);
      console.log("  và `claimed_at` không được chạm lại trong lúc làm. Đây là số liệu để bạn HỎI, không phải");
      console.log("  giấy phép để giành. Muốn lấy vùng người khác đang giữ thì hỏi Đức (luật mục 1).");
    }
  };

  if (flag("list") || argv.length === 0) {
    bang();
    if (seal.ok === false) console.error(`\n${VO_DAU}`);
    if (seal.ok === null) console.error("\nCHUA_DONG_DAU: bảng này chưa có dấu niêm phong. Đóng: node scripts/claim.mjs --restamp --as <phiên>");
    process.exit(EXIT.OK);
  }

  // ĐÓNG LẠI DẤU — lối thoát tường minh, và cố ý ồn ào. Dùng khi: (a) file cũ chưa có dấu;
  // (b) Đức đã phân xử xong một vụ sửa tay và muốn chốt trạng thái hiện tại là đúng.
  // Nó in cả bảng ra trước khi đóng, để người chạy phải NHÌN thấy mình đang niêm phong cái gì.
  if (flag("restamp")) {
    const as = flag("as");
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --restamp --as <phiên>");
      process.exit(EXIT.MISUSE);
    }
    // CHỐT, KHÔNG PHẢI CẢNH BÁO. Xem khối dài ở `khoaBiDoiChu` phía trên: bản cũ chỉ in một
    // câu nhắc, mà người đang cố ý lấy khoá thì đọc xong vẫn đi tiếp.
    const ducDuyet = flag("duc-duyet");
    const coCauChot = typeof ducDuyet === "string" && ducDuyet.trim() !== "";
    const moc = baselineDaNiemPhong();
    if (moc.trangThai === BASELINE.LOI) {
      // FAIL CLOSED. Không có mốc lành thì không biết ai vừa mất khoá — mà "không biết" đúng ra
      // phải là ĐỎ, không phải "chắc không sao". Đây là lỗ GPT bắt được ở vòng 7.
      console.error(`\nKHONG_CO_MOC_SO: ${moc.ly_do}.`);
      console.error("Không có mốc niêm phong lành thì không kết luận được có ai vừa bị lấy khoá hay không,");
      console.error("và đoán bừa ở đây nghĩa là đóng dấu hợp lệ cho một vụ lấy khoá mà không ai thấy.");
      console.error("Kiểm: `git log -- .agents/claims.json` và `git diff .agents/claims.json`. Vướng thì hỏi Đức.\n");
      process.exit(EXIT.REFUSED);
    }
    const doiChu = moc.trangThai === BASELINE.OK ? khoaBiDoiChu(moc.claims, parsed.claims, as) : [];
    if (doiChu.length && !coCauChot) {
      console.error(`\nTU_CHOI_DONG_DAU: bảng này đang chuyển ${doiChu.length} khoá khỏi tay phiên khác:`);
      for (const d of doiChu) console.error(`  ${d.key}: "${d.tu}" → ${d.sang ? `"${d.sang}"` : "(trống)"}`);
      console.error("\nĐóng dấu bây giờ là biến một vụ sửa tay thành trạng thái hợp lệ — cổng sẽ XANH với mọi phiên,");
      console.error("và phiên VỪA BỊ LẤY KHOÁ không có cách nào biết. Ngày 04/09 chuyện này đã xảy ra thật.");
      console.error("\nLuật mục 1: muốn giành vùng người khác đang giữ thì HỎI ĐỨC. Đức chốt rồi thì ghi lại câu chốt đó:");
      console.error(`  node scripts/claim.mjs --restamp --as ${as} --duc-duyet "Đức chốt <ngày>: <lý do một câu>"`);
      console.error("Chỉ muốn đóng dấu sau khi sửa văn xuôi (_doc/_labels)? Thì đừng đổi chủ khoá nào — sửa lại rồi chạy lại.\n");
      process.exit(EXIT.REFUSED);
    }
    console.log(`Đang niêm phong trạng thái này (phiên "${as}"):`);
    bang();
    if (doiChu.length) {
      // GHI VÀO FILE, không chỉ in ra màn hình. Người cần biết nhất là phiên vừa mất khoá, mà
      // họ không hề chạy lệnh này — họ chỉ đọc bảng. Chữ trên màn hình của tôi không tới được họ.
      const luc = new Date().toISOString().slice(0, 16);
      for (const d of doiChu) {
        parsed.claims[d.key] = { ...parsed.claims[d.key], taken_from: d.tu, taken_by: as, taken_at: luc, duc_decision: ducDuyet };
      }
      console.log(`\nĐã ghi xuất xứ cho ${doiChu.length} khoá đổi chủ: ${doiChu.map((d) => d.key).join(", ")}`);
    }
    parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims, parsed.tam);
    ghiBangNguyenTu(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`\ndấu cũ: ${seal.stamped ?? "(chưa có)"}  →  dấu mới: ${parsed[FINGERPRINT_FIELD]}`);
    console.log("Nếu bạn KHÔNG cố ý làm việc này thì vừa xoá dấu vết một vụ sửa tay. Xem lại git diff .agents/claims.json.");
    process.exit(EXIT.OK);
  }

  /* ---- SOÁT ĐÃ DÀN, trước khi commit ---- */
  if (flag("soat")) {
    const as = flag("as");
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --soat --as <phiên>   (chạy NGAY TRƯỚC git commit)");
      process.exit(EXIT.MISUSE);
    }
    let structure;
    try { structure = readStructureFromDisk(ROOT); }
    catch (error) { console.error(`CAU_HINH_HONG: ${error.message}`); process.exit(EXIT.MISUSE); }
    let daDan;
    try {
      daDan = execFileSync("git", ["diff", "--cached", "--name-only"], { cwd: ROOT, encoding: "utf8" })
        .split(String.fromCharCode(10)).map((d) => d.trim()).filter(Boolean);
    } catch (error) {
      // FAIL CLOSED: không đọc được index thì KHÔNG nói "sạch". Câu "sạch" ở đây là giấy phép
      // để commit, và cấp giấy phép dựa trên một phép đo không chạy được là tệ nhất.
      console.error(`KHONG_DOC_DUOC_INDEX: ${error.message}`);
      console.error("Không đo được thì không kết luận. Kiểm tay: git diff --cached --name-only");
      process.exit(EXIT.REFUSED);
    }
    if (!daDan.length) { console.log("index rỗng — chưa dàn gì để soát."); process.exit(EXIT.OK); }
    const prefixes = claimPrefixesFrom(structure);
    const { la, soChung } = soatDanHang({
      daDan, tam: parsed.tam, claims: parsed.claims, as,
      mienKhoa: appendOnlyExemptFrom(structure),
      maySinh: generatedFrom(structure),
      vungCua: (d) => vungBaoNgoai(d, structure, prefixes),
    });

    /* SỔ CHUNG: hợp lệ khi CHỈ THÊM Ở CUỐI. Dùng lại `appendOnlyAtEof` — chính hàm mà cổng
       đóng phiên và `safe-push` đang dùng cho cùng luật. Hai bản sao của một luật đã trả hai
       câu khác nhau cho cùng một file ngày 02/09; không đẻ bản thứ ba. */
    const soHong = [];
    for (const { duongDan: d, coQuyen } of soChung) {
      if (coQuyen) continue;      // giữ khoá thì viết lại được — xem ghi chú ở `soatDanHang`
      try {
        const diff = execFileSync("git", ["diff", "--cached", "-U0", "--", d], { cwd: ROOT, encoding: "utf8" });
        let cu2 = "";
        try { cu2 = execFileSync("git", ["show", `HEAD:${d}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 }); }
        catch { cu2 = ""; }                                    // file mới: cả file là "thêm ở cuối"
        if (!appendOnlyAtEof(diff, cu2)) soHong.push(d);
      } catch { /* đọc không được thì im — không đo được KHÁC không đạt */ }
    }

    if (!la.length && !soHong.length) {
      const them = soChung.length ? ` (${soChung.length} sổ chung: ${soChung.filter((x) => x.coQuyen).length} có khoá, còn lại chỉ thêm ở cuối)` : "";
      console.log(`${daDan.length} file đã dàn, tất cả đều thuộc quyền ghi của "${as}"${them}. Commit được.`);
      process.exit(EXIT.OK);
    }
    if (soHong.length) {
      console.error(`SOAT_SO_CHUNG: ${soHong.length} sổ miễn khoá bị SỬA DÒNG CŨ, không phải chỉ thêm ở cuối:`);
      for (const d of soHong) console.error(`  ${d}`);
      console.error("\nHai khả năng, cả hai đáng dừng lại:");
      console.error("  · bạn sửa/xoá dòng của phiên khác — sổ chỉ MIỄN KHOÁ khi thêm dòng ở CUỐI;");
      console.error("  · hoặc git commit -o <so> đang cuốn theo dòng lane khác vừa viết (N-05, nổ 2 lần 06/09).");
      console.error("Soi: git diff --cached -- <sổ>   ·   Gỡ ra: git restore --staged <sổ>");
    }
    if (!la.length) process.exit(EXIT.REFUSED);
    console.error(`SOAT_LA: ${la.length}/${daDan.length} file đã dàn KHÔNG thuộc quyền ghi của "${as}":`);
    for (const x of la) {
      const ai = x.chuFile ? `file đang do "${x.chuFile}" sửa` : x.chuVung ? `vùng "${x.vung}" do "${x.chuVung}" giữ` : `vùng "${x.vung}" không ai giữ`;
      console.error(`  ${x.duongDan}  — ${ai}`);
    }
    console.error("\nHai cách nó lọt vào index, cả hai đã nổ thật:");
    console.error("  · `git commit -a` cuốn theo file lane khác vừa dàn (N-40, 07/09)");
    console.error("  · `git add .` gom cả cây làm việc dùng chung");
    console.error("Gỡ ra: git restore --staged <đường-dẫn>   ·   Đúng là việc của bạn? Nhận trước: --sua <đường-dẫn>");
    process.exit(EXIT.REFUSED);
  }

  /* ---- KHOÁ MỨC FILE: --sua / --xong (Đức chốt 08/09) --------------------
     Nhận NGAY TRƯỚC lượt ghi, trả NGAY SAU. Chỉ đọc thì không cần gì cả. */
  const laySua = flagNhieu("sua");
  const layXong = flagNhieu("xong");
  if (laySua || layXong) {
    const as = flag("as");
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --sua <đường-dẫn>… --as <phiên>");
      console.error("      node scripts/claim.mjs --xong <đường-dẫn>… --as <phiên>");
      console.error("      node scripts/claim.mjs --xong --het --as <phiên>     # trả HẾT khoá file của mình");
      process.exit(EXIT.MISUSE);
    }
    let structure;
    try { structure = readStructureFromDisk(ROOT); }
    catch (error) { console.error(`CAU_HINH_HONG: ${error.message}`); process.exit(EXIT.MISUSE); }
    const prefixes = claimPrefixesFrom(structure);
    const vungCua = (d) => vungBaoNgoai(d, structure, prefixes);
    const luc = new Date().toISOString().slice(0, 16);

    let ds = laySua || layXong;
    if (layXong && flag("het")) ds = Object.entries(parsed.tam || {}).filter(([, o]) => o?.owner === as).map(([d]) => d);
    if (!ds.length) {
      if (layXong) { console.log(`không còn khoá file nào của "${as}".`); process.exit(EXIT.OK); }
      console.error("Thiếu đường dẫn. Dùng: --sua <đường-dẫn>… --as <phiên>");
      process.exit(EXIT.MISUSE);
    }

    /* TÍNH HẾT RỒI MỚI GHI — một mẻ là MỘT lượt, không nửa vời. Nhận được 3 trong 5 file rồi
       dừng là trạng thái tệ nhất: lane tưởng mình bị từ chối nên bỏ đi, mà ba khoá kia còn nằm
       lại mang tên họ. */
    let tam = parsed.tam || {};
    for (const d of ds) {
      const kq = laySua
        ? quyetDinhSua({ claims: parsed.claims, tam }, { duongDan: d, as, luc, vungCua })
        : quyetDinhXong({ claims: parsed.claims, tam }, { duongDan: d, as });
      if (kq.code !== EXIT.OK) { console.error(kq.message); console.error("\nKHÔNG ghi gì cả — cả mẻ dừng, không nhận nửa vời."); process.exit(kq.code); }
      tam = kq.next;
    }
    parsed.tam = tam;
    parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims, parsed.tam);
    ghiBangNguyenTu(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`);
    const ten = ds.map((d) => chuanDuongDan(d)).join(" · ");
    if (laySua) {
      console.log(`đang sửa (${ds.length}): ${ten}`);
      console.log(`TRẢ NGAY khi ghi xong: node scripts/claim.mjs --xong --het --as ${as}`);
    } else {
      console.log(`đã trả (${ds.length}): ${ten}`);
    }
    process.exit(EXIT.OK);
  }

  // MỞ MỘT VÙNG MỚI — N-41. Chỉ tạo một ô TRỐNG CHỦ cho khoá mà cấu hình đã công nhận.
  // Đặt TRƯỚC `--take` vì đây là điều kiện tiên quyết của nó: `--take` một khoá chưa có
  // trong bảng thì từ chối, và trước cửa này lối thoát duy nhất là sửa tay.
  const khaiVung = flag("khai-vung");
  if (khaiVung) {
    const as = flag("as");
    if (typeof khaiVung !== "string" || typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --khai-vung <khoá> --as <phiên>");
      process.exit(EXIT.MISUSE);
    }
    if (Object.prototype.hasOwnProperty.call(parsed.claims, khaiVung)) {
      console.error(`KHOA_DA_CO: "${khaiVung}" đã có trong bảng. Nhận nó bằng --take, đừng khai lại.`);
      process.exit(EXIT.MISUSE);
    }
    let structure;
    try { structure = readStructureFromDisk(ROOT); }
    catch (error) { console.error(`CAU_HINH_HONG: ${error.message}`); process.exit(EXIT.MISUSE); }
    const xet = kiemKhoaKhaiDuoc(khaiVung, {
      structure,
      prefixes: claimPrefixesFrom(structure),
      coThuMuc: (d) => { try { return fs.statSync(path.join(ROOT, d)).isDirectory(); } catch { return false; } },
    });
    if (!xet.ok) {
      console.error(`KHONG_KHAI_DUOC: ${xet.ly_do}`);
      process.exit(EXIT.REFUSED);
    }
    /* KHÔNG CHỤP CHỦ SỞ HỮU TRƯỚC/SAU ĐỂ SO — và đây là quyết định, không phải bỏ sót.
       Bản đầu có lớp đó. Nhưng khoá này đã được kiểm là CHƯA CÓ ở ngay trên, nên lượt gán
       dưới đây không thể chạm chủ của khoá nào — không đột biến nào giết được lớp ấy. Repo này
       đã xử đúng ca đó một lần (`PB2`, sổ nợ Scouter): bỏ lớp thừa, đừng giữ một dòng đỏ vĩnh
       viễn mà ai cũng học cách bỏ qua. Bất biến *"không chạm chủ của khoá nào"* vẫn được canh —
       ở phép ghim chạy THẬT trong `tests/claim-smoke.mjs`, nơi nó đo được. */
    parsed.claims[khaiVung] = { owner: null, ai: null, claimed_at: null, task: null, released_at: null };
    parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims, parsed.tam);
    ghiBangNguyenTu(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`);
    console.log(`đã khai vùng: ${khaiVung} — TRỐNG CHỦ. Nhận nó: node scripts/claim.mjs --take ${khaiVung} --as ${as}`);
    console.log(`dấu cũ: ${seal.stamped ?? "(chưa có)"}  →  dấu mới: ${parsed[FINGERPRINT_FIELD]}`);
    process.exit(EXIT.OK);
  }
  /* CHIỀU HAI của luật chứa nhau: nhận CẢ VÙNG nghĩa là giành quyền ghi mọi file trong đó,
     nên nó phải từ chối khi bên trong còn khoá file của người khác. Thiếu chiều này thì hai
     lane cùng tin mình được ghi một file, và không lớp nào kêu. */
  const xinVung = flag("take");
  if (typeof xinVung === "string" && Object.keys(parsed.tam || {}).length) {
    const as = flag("as");
    let structure;
    try { structure = readStructureFromDisk(ROOT); } catch { structure = null; }
    if (structure) {
      const prefixes = claimPrefixesFrom(structure);
      const vuong = khoaFileTrongVung(parsed, xinVung, as, (d) => vungBaoNgoai(d, structure, prefixes));
      if (vuong.length) {
        console.error(`TU_CHOI: vùng "${xinVung}" đang có ${vuong.length} file bị lane khác khoá để sửa:`);
        for (const v of vuong) console.error(`  ${v.duongDan}  ← ${v.owner}`);
        console.error("\nKhoá file là loại giữ VÀI PHÚT — đợi một nhịp rồi chạy lại.");
        console.error("Chỉ cần sửa đúng vài file? Dùng --sua <đường-dẫn>… thay vì nhận cả vùng.");
        process.exit(EXIT.REFUSED);
      }
    }
  }

  const take = flag("take");
  const release = flag("release");
  const as = flag("as");
  const task = flag("task");
  const key = typeof take === "string" ? take : typeof release === "string" ? release : null;
  const action = typeof take === "string" ? "take" : typeof release === "string" ? "release" : null;

  if (!action || !key || typeof as !== "string") {
    console.error("Dùng: node scripts/claim.mjs --take|--release <khoá> --as <phiên> [--task \"một câu\"]");
    console.error("      node scripts/claim.mjs --list");
    console.error("Trả quyền SAU khi đẩy. Chưa đẩy được mà buộc phải bàn giao: thêm --du-biet \"<một câu lý do>\".");
    process.exit(EXIT.MISUSE);
  }
  // Nhận quyền mà không nói làm gì là để lại một dòng vô nghĩa cho phiên sau đọc.
  if (action === "take" && typeof task !== "string") {
    console.error("THIEU_TASK: nhận quyền thì phải nói làm gì — `--task \"một câu\"`. Phiên sau đọc dòng đó để biết bạn đang đụng gì.");
    process.exit(EXIT.MISUSE);
  }

  // Dấu vỡ thì DỪNG TRƯỚC KHI GHI. Ghi đè lên một bảng đã bị sửa tay là đóng dấu hợp lệ cho
  // vụ sửa đó — tang chứng biến mất, và phiên bị mất khoá vĩnh viễn không biết.
  if (seal.ok === false) { console.error(VO_DAU); process.exit(EXIT.REFUSED); }

  // Có GIỜ, không chỉ có ngày: xem khối "TUỔI KHOÁ" ở trên. Ngày trần khiến khoá nhận 5 phút
  // trước và khoá bỏ quên từ sáng trông y hệt nhau.
  const today = new Date().toISOString().slice(0, 16);
  const verdict = decide(parsed.claims, { action, key, as, today });
  if (verdict.code !== EXIT.OK) { console.error(verdict.message); process.exit(verdict.code); }

  /* ---- CỔNG TRẢ KHOÁ: đẩy xong rồi mới trả (xem khối `canDayTruocKhiTra` ở trên) ----
   *
   * LỐI THOÁT `--du-biet` — hình dạng này được chọn có lý do, không phải cho nhanh.
   * Có ca hợp lệ thật: lane bị chặn đẩy vì lý do ngoài tầm với và phải bàn giao vùng cho phiên
   * khác. Chặn cứng không lối thoát là dựng một cái kẹt mới thay cho cái cũ.
   * Nhưng lối thoát phải để lại DẤU VẾT ĐỌC ĐƯỢC, nếu không nó chỉ là cái nút "bỏ qua". Nên
   * theo đúng khuôn `--duc-duyet` đã có ở `--restamp`: bắt kèm MỘT CÂU LÝ DO, và ghi câu đó
   * **VÀO BẢNG**, không in ra màn hình. Người cần đọc nó là phiên nhận vùng sau bạn và phiên
   * gặp mục đỏ ở cổng — cả hai đều chỉ đọc bảng, không ai chạy lại lệnh của bạn.
   * Cố ý KHÔNG đòi Đức duyệt: Đức không phải vòng QA, và đây là chuyện bàn giao trong ngày.
   * Cố ý KHÔNG cho cờ trần không lý do: cờ trần thì lần sau không ai truy được vì sao vùng đó
   * trống chủ mà vẫn còn commit chưa đẩy — tức đúng cái tình trạng luật này sinh ra để chặn. */
  const duBiet = flag("du-biet");
  const coLyDo = typeof duBiet === "string" && duBiet.trim() !== "";
  // Cờ trần `--du-biet` không kèm lý do = không có gì để ghi vào bảng = KHÔNG phải lối thoát.
  // Chặn ở đây, TRƯỚC phép đo, để câu báo nói đúng chuyện đang thiếu.
  if (duBiet !== null && !coLyDo) {
    console.error(`THIEU_LY_DO: \`--du-biet\` phải kèm MỘT CÂU lý do — \`--du-biet "vì sao chưa đẩy được"\`.`);
    console.error(`Cờ trần không ghi được gì vào bảng, nên nó chỉ là nút bỏ qua: lần sau không ai truy được`);
    console.error(`vì sao vùng đó trống chủ mà vẫn còn commit chưa đẩy — đúng tình trạng luật này sinh ra để chặn.`);
    process.exit(EXIT.MISUSE);
  }
  let boQua = null;
  if (action === "release" && !verdict.already) {
    let doc;
    try { doc = commitChuaDay(ROOT, readStructureFromDisk(ROOT)); }
    catch (error) { doc = { trangThai: CHUA_DAY.LOI, ly_do: String(error.message).split(String.fromCharCode(10))[0] }; }
    const phan = canDayTruocKhiTra(doc, key);

    if (phan.chan && !coLyDo) {
      if (phan.ma === "KHONG_DEM_DUOC") {
        console.error(`\nKHONG_DEM_DUOC_COMMIT: không đếm được commit chưa đẩy của "${key}" — ${phan.ly_do}.`);
        console.error(`Không biết còn gì chưa đẩy thì không biết trả khoá bây giờ có để lại commit vô chủ hay không,`);
        console.error(`và "không biết" ở đây phải là ĐỎ (MULTIFLOW bất biến ④), không phải "chắc không sao".`);
        console.error(`Kiểm: \`git status\` và \`git log origin/main..HEAD\`.`);
      } else {
        console.error(`\nTU_CHOI_TRA_KHOA: "${key}" còn ${phan.commits.length} commit CHƯA ĐẨY lên origin/main.`);
        for (const c of phan.commits) console.error(`  ${c.sha.slice(0, 7)}  ${String(c.subject).slice(0, 68)}`);
        console.error(`\nLuật AGENTS.md mục 1: TRẢ QUYỀN SAU KHI ĐẨY, không phải sau khi commit.`);
        console.error(`Trả bây giờ là để lại commit vô chủ — cổng đóng phiên sẽ báo "Vùng gốc repo bị sửa nhưng`);
        console.error(`chưa ai đứng tên: ${key}", và phiên đến sau phải dọn một mục đỏ không phải của họ.`);
      }
      console.error(`\nĐi tiếp đúng cách:`);
      console.error(`  1. node scripts/safe-push.mjs --as ${as}`);
      console.error(`  2. đẩy xong rồi mới: node scripts/claim.mjs --release ${key} --as ${as}`);
      console.error(`\nĐẩy KHÔNG được vì lý do ngoài tầm với, và phải bàn giao vùng này cho phiên khác?`);
      console.error(`  node scripts/claim.mjs --release ${key} --as ${as} --du-biet "<một câu: vì sao chưa đẩy được>"`);
      console.error(`Câu đó được ghi VÀO BẢNG chứ không in ra màn hình — phiên nhận vùng sau bạn chỉ đọc bảng.`);
      console.error(`Đã đẩy rồi mà vẫn thấy dòng này? Con trỏ origin/main trên máy đang cũ: \`git fetch origin main\` rồi chạy lại.\n`);
      process.exit(EXIT.REFUSED);
    }
    if (phan.chan && coLyDo) boQua = { so: phan.commits?.length ?? null, ly_do: duBiet.trim(), ma: phan.ma };
  }

  const ghi = typeof task === "string" ? { ...verdict.next, task } : { ...verdict.next };
  // Dấu vết của lượt trả sớm KHÔNG được sống dai hơn lượt đó: mọi lượt nhận/trả đều xoá trước,
  // rồi mới ghi lại nếu lượt NÀY là lượt trả sớm. Không xoá thì một khoá từng trả sớm sẽ mang
  // câu lý do cũ đi mãi, và phiên sau đọc bảng tưởng vẫn còn commit vô chủ.
  delete ghi.released_with_unpushed;
  delete ghi.unpushed_reason;
  if (boQua) {
    ghi.released_with_unpushed = boQua.ma === "KHONG_DEM_DUOC" ? "khong-dem-duoc" : boQua.so;
    ghi.unpushed_reason = boQua.ly_do;
  }
  parsed.claims[key] = ghi;
  parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims, parsed.tam);
  ghiBangNguyenTu(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`);

  // GHI RỒI ĐỌC LẠI. Không chặn được đua, nhưng không để nó âm thầm.
  const after = readClaims().claims[key];
  const muon = action === "take" ? as : null;
  if ((after.owner || null) !== muon) {
    console.error(`BI_GHI_DE: vừa ghi "${muon ?? "trống"}" cho "${key}", đọc lại thấy "${after.owner || "trống"}".`
      + "\nMột phiên khác ghi chen vào giữa. ĐỪNG chạy lại một cách máy móc — xem họ đang làm gì trước.");
    process.exit(EXIT.CLOBBERED);
  }

  const verb = action === "take" ? (verdict.already ? "vẫn đang giữ" : "đã nhận") : "đã trả";
  console.log(`${verb}: ${key}${action === "take" ? ` → ${as}` : ""}`);
  process.exit(EXIT.OK);
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();

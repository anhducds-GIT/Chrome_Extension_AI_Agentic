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
 * Mã thoát:  0 xong · 2 dùng sai · 3 TỪ CHỐI (đã có chủ khác / không phải chủ) · 4 bị ghi đè
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");
export const CLAIMS_FILE = path.join(ROOT, ".agents", "claims.json");

export const EXIT = Object.freeze({ OK: 0, MISUSE: 2, REFUSED: 3, CLOBBERED: 4 });

export function readClaims(file = CLAIMS_FILE) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); }
  catch (error) { throw new Error(`CLAIMS_KHONG_DOC_DUOC: ${error.message}`); }
  let parsed;
  try { parsed = JSON.parse(raw); }
  catch (error) { throw new Error(`CLAIMS_HONG: không phải JSON đọc được (${error.message}). Sửa tay rồi chạy lại.`); }
  if (!parsed || typeof parsed.claims !== "object" || Array.isArray(parsed.claims)) {
    throw new Error("CLAIMS_HONG: thiếu khối `claims` dạng object.");
  }
  return parsed;
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
export function claimsFingerprint(claims) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("CLAIMS_HONG: không băm được — khối `claims` phải là object.");
  }
  return createHash("sha256").update(canon(claims)).digest("hex").slice(0, 16);
}

/* null = chưa từng đóng dấu (file cũ) · true/false = dấu còn nguyên / đã vỡ. Ba trạng thái,
 * cố ý không gộp: "chưa kiểm" không được đội lốt "đã đạt". */
export function fingerprintState(parsed) {
  const stamped = parsed?.[FINGERPRINT_FIELD];
  if (typeof stamped !== "string" || stamped === "") return { stamped: null, actual: claimsFingerprint(parsed?.claims), ok: null };
  const actual = claimsFingerprint(parsed.claims);
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
  if (typeof stamp !== "string" || stamp === "") return null;
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(stamp) ? `${stamp}T00:00Z` : stamp;
  const t = Date.parse(/[Zz]|[+-]\d{2}:?\d{2}$/.test(iso) ? iso : `${iso}Z`);
  if (!Number.isFinite(t)) return null;
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
    try { actual = claimsFingerprint(parsed.claims); } catch { soBanDocHong += 1; continue; }
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

function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true) : null;
  };

  let parsed;
  try { parsed = readClaims(); }
  catch (error) { console.error(error.message); process.exit(EXIT.MISUSE); }

  const seal = fingerprintState(parsed);
  const bang = () => {
    let coCu = false;
    for (const [key, value] of Object.entries(parsed.claims)) {
      const owner = value.owner || "";
      let duoi = "";
      if (owner) {
        const gio = ageHours(value.claimed_at);
        if (gio !== null) {
          duoi = `  (giữ ${ageLabel(gio)})`;
          if (gio >= GIO_NHAC) { duoi += "  ⚠"; coCu = true; }
        }
      }
      console.log(`${owner ? "GIU  " : "TRỐNG"} ${key.padEnd(34)}${owner}${duoi}`);
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
    parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims);
    fs.writeFileSync(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    console.log(`\ndấu cũ: ${seal.stamped ?? "(chưa có)"}  →  dấu mới: ${parsed[FINGERPRINT_FIELD]}`);
    console.log("Nếu bạn KHÔNG cố ý làm việc này thì vừa xoá dấu vết một vụ sửa tay. Xem lại git diff .agents/claims.json.");
    process.exit(EXIT.OK);
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

  parsed.claims[key] = typeof task === "string" ? { ...verdict.next, task } : verdict.next;
  parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims);
  fs.writeFileSync(CLAIMS_FILE, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");

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

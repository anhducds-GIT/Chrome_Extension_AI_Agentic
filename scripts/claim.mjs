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
  + "  3. chốt xong rồi mới đóng lại dấu: node scripts/claim.mjs --restamp --as <phiên>";

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
    for (const [key, value] of Object.entries(parsed.claims)) {
      const owner = value.owner || "";
      console.log(`${owner ? "GIU  " : "TRỐNG"} ${key.padEnd(34)}${owner}`);
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
    console.log(`Đang niêm phong trạng thái này (phiên "${as}"):`);
    bang();
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

  const today = new Date().toISOString().slice(0, 10);
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

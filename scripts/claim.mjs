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

  if (flag("list") || argv.length === 0) {
    for (const [key, value] of Object.entries(parsed.claims)) {
      const owner = value.owner || "";
      console.log(`${owner ? "GIU  " : "TRỐNG"} ${key.padEnd(34)}${owner}`);
    }
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

  const today = new Date().toISOString().slice(0, 10);
  const verdict = decide(parsed.claims, { action, key, as, today });
  if (verdict.code !== EXIT.OK) { console.error(verdict.message); process.exit(verdict.code); }

  parsed.claims[key] = typeof task === "string" ? { ...verdict.next, task } : verdict.next;
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

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
 *   node scripts/claim.mjs --take <khoá> --as <phiên> --task "một câu" [--ai Codex]
 *   node scripts/claim.mjs --release <khoá> --as <phiên> [--task "một câu"] [--du-biet "vì sao"]
 *   node scripts/claim.mjs --take <khoá> --as <phiên> --task "…" --duc-duyet "<câu chốt của Đức>"
 *       ↑ giành vùng người khác đang giữ. Đòi câu chốt, và TỪ CHỐI nếu vùng đó còn file sửa dở.
 *
 * Mã thoát:  0 xong · 2 dùng sai · 3 TỪ CHỐI (đã có chủ khác / không phải chủ) · 4 bị ghi đè
 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { claimPrefixesFrom, generatedFrom, laneFromMessage, readStructureFromDisk, stewardOf } from "./repo-structure.mjs";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");
export const CLAIMS_FILE = path.join(ROOT, ".agents", "claims.json");

export const EXIT = Object.freeze({ OK: 0, MISUSE: 2, REFUSED: 3, CLOBBERED: 4 });

/* ---- DẤU NIÊM PHONG bảng quyền ------------------------------------------------
 *
 * Lệnh này bảo vệ ĐƯỜNG GHI. Không gì bảo vệ chính `claims.json` khỏi bị mở ra sửa tay —
 * và điều đó đã xảy ra thật (repo tiêu thụ, 03/09): cả bốn khoá gốc bị đổi chủ bằng một
 * lượt sửa hàng loạt, đi vòng qua lệnh, phiên đang giữ khoá không hề biết. Luật mục 1 của
 * `AGENTS.md` đã cấm sửa tay từ lâu; khối này là thứ đầu tiên CƯỠNG CHẾ câu đó.
 *
 * VÌ SAO ĐÓNG DẤU CHỨ KHÔNG SO HAI ẢNH CHỤP: hướng hiển nhiên là so bảng cũ với bảng mới rồi
 * bắt "chủ đổi thẳng từ người này sang người kia". Hướng đó BÁO OAN: `_root` đi từ lane A
 * sang lane B trong đúng một diff, mà chuỗi thật là TRẢ rồi NHẬN — hai thao tác hợp lệ, chỉ
 * bị ép phẳng khi so ảnh chụp.
 *
 * Chỉ băm khối `claims` (+ `tam` nếu có). Văn xuôi `_doc` sửa thoải mái không vỡ dấu — dấu
 * để bắt đổi chủ lén, không phải để đóng băng tài liệu.
 *
 * KHÔNG hứa chống người cố tình: ai muốn thì tính lại dấu được. Nó chặn ĐƯỜNG TẮT, không
 * chặn kẻ địch — và đường tắt mới là thứ đã xảy ra. */
export const FINGERPRINT_FIELD = "_fingerprint";

export const VO_DAU = "DAU_VO: `.agents/claims.json` đã bị sửa NGOÀI lệnh này — dấu niêm phong không khớp nội dung.\n"
  + "Nghĩa là có người mở file ra sửa tay. Chuyện này đã lấy mất khoá của một phiên đang làm dở,\n"
  + "và phiên đó không hề biết. ĐỪNG đóng lại dấu cho xong.\n"
  + "  1. xem đã đổi gì:  git diff .agents/claims.json\n"
  + "  2. khoá của bạn có bị đổi chủ không? nếu có thì HỎI Đức — luật mục 1: muốn giành thì hỏi.\n"
  + "  3. chốt xong rồi mới đóng lại dấu: node scripts/claim.mjs --restamp --as <phiên>\n"
  + "     (lượt sửa đó CHUYỂN CHỦ một khoá thì lệnh đòi thêm --duc-duyet \"<câu chốt của Đức>\",\n"
  + "      và câu đó được ghi VÀO bảng — để phiên vừa mất khoá đọc được, vì họ chỉ đọc bảng)";

/* Ghi nguyên tử: file tạm rồi `rename`. Không có cửa sổ nào bảng nằm dở dang trên đĩa —
   và một lượt ghi đứt giữa chừng là mất trắng bảng quyền của mọi lane. */
export function ghiBangNguyenTu(file, noiDung) {
  const tam = `${file}.dang-ghi-${process.pid}`;
  try {
    fs.writeFileSync(tam, noiDung, "utf8");
    fs.renameSync(tam, file);
  } finally {
    // Lỗi thật đã ném ở trên; một lỗi DỌN DẸP che mất lỗi gốc là kiểu báo lỗi tệ nhất.
    try { if (fs.existsSync(tam)) fs.unlinkSync(tam); } catch { /* thôi */ }
  }
}

/* Băm ổn định: thứ tự khoá trong file không đổi được dấu, nội dung đổi thì dấu đổi. */
const canon = (v) => {
  if (v === undefined) return "null";
  if (Array.isArray(v)) return `[${v.map(canon).join(",")}]`;
  if (v && typeof v === "object") {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${canon(v[k])}`).join(",")}}`;
  }
  return JSON.stringify(v);
};

export function claimsFingerprint(claims, tam) {
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("CLAIMS_HONG: không băm được — khối `claims` phải là object.");
  }
  /* KHỐI `tam` RỖNG THÌ BĂM Y HỆT KHI KHÔNG CÓ `tam` — cố ý, và đây là chỗ dễ sai nhất.
     Băm thẳng `{claims, tam}` là đổi dấu của MỌI bảng đang tồn tại, nên ngay lượt chạy sau
     mọi phiên khác thấy DAU_VO và cổng của họ đỏ vì một cải tiến họ không liên quan. */
  const coTam = tam && typeof tam === "object" && !Array.isArray(tam) && Object.keys(tam).length > 0;
  return createHash("sha256").update(canon(coTam ? { claims, tam } : claims)).digest("hex").slice(0, 16);
}

/* BA trạng thái, cố ý không gộp: null = chưa từng đóng dấu (bảng cũ) · true = còn nguyên ·
   false = đã vỡ. "Chưa kiểm" không được đội lốt "đã đạt". */
export function fingerprintState(parsed) {
  const stamped = parsed?.[FINGERPRINT_FIELD];
  const actual = claimsFingerprint(parsed?.claims, parsed?.tam);
  if (typeof stamped !== "string" || stamped === "") return { stamped: null, actual, ok: null };
  return { stamped, actual, ok: stamped === actual };
}

/* Đường ghi DUY NHẤT của bảng quyền: đóng dấu rồi ghi nguyên tử. Mọi nhánh phải đi qua đây —
   một nhánh ghi thẳng là một nhánh sinh ra bảng vỡ dấu, và phiên sau lãnh đủ. */
export function ghiBang(parsed, file = CLAIMS_FILE) {
  parsed[FINGERPRINT_FIELD] = claimsFingerprint(parsed.claims, parsed.tam);
  ghiBangNguyenTu(file, `${JSON.stringify(parsed, null, 2)}${String.fromCharCode(10)}`);
}

/* Chủ khoá theo HEAD — để `--restamp` biết lượt sửa tay có CHUYỂN CHỦ hay không. */
export function chuTheoHead(root = ROOT, file = ".agents/claims.json") {
  try {
    const raw = execFileSync("git", ["show", `HEAD:${file}`], { cwd: root, encoding: "utf8" });
    const j = JSON.parse(raw);
    return new Map(Object.entries(j.claims || {}).map(([k, v]) => [k, (v && v.owner) || null]));
  } catch { return null; }
}

const KHUON_MUC = '"owner": null, "ai": null, "claimed_at": null, "task": null, "released_at": null }';

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
  /* MỖI MỤC PHẢI LÀ OBJECT, và nói ra ngay tại cửa nếu không.
   * VẤP THẬT 05/09, lượt migrate `n8n-orchestrator`: bảng quyền khai `{"_root": null}` — cách
   * viết tự nhiên cho "chưa ai giữ" — và `--list` NỔ với `TypeError: Cannot read properties of
   * null (reading 'owner')`, rơi stack trace vào mặt người dùng ở dòng 143.
   * Không nhận `null` là "trống", cố ý: hai cách biểu diễn cùng một trạng thái thì phép so sánh
   * bảng-trên-máy ↔ bảng-trên-remote có hai kết quả cho cùng một sự thật. Một cách viết, và
   * khi sai thì NÓI RÕ SAI Ở ĐÂU — đó là điều bộ khung này làm ở mọi cửa vào khác. */
  for (const [key, value] of Object.entries(parsed.claims)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        "CLAIMS_MUC_HONG: khoa " + '`' + key + '`' + " phai la object, dang la "
          + (value === null ? "null" : typeof value) + ".\n"
          + "  Khuon dung: " + JSON.stringify(key) + ": { " + KHUON_MUC + "\n"
          + "  Viet null cho ca muc la cach viet tu nhien cho chua-ai-giu, nhung KHONG hop le:\n"
          + "  hai cach bieu dien cung mot trang thai lam phep doi chieu bang quyen co hai ket qua."
      );
    }
  }
  return parsed;
}

/* Sổ MIỄN khoá của repo này — hai file, hai lý do khác nhau (AGENTS.md mục 1).
 * `.agents/claims.json` là thao tác hành chính; `HANDOFF.md` ở gốc là chỗ luật mục 7 bắt MỌI
 * phiên ghi Log, và chỉ miễn khi CHỈ THÊM dòng. Phép soát nêu tên chúng chứ không chặn — chặn
 * là chặn đúng thứ luật bắt làm. */
export const MIEN_KHOA = Object.freeze(["HANDOFF.md"]);

/* KHOÁ THẬT, KHÔNG PHẢI ĐỌC-LẠI-KIỂM.
 *
 * Đọc → sửa → ghi → đọc lại KHÔNG đóng được cửa sổ đua: A và B cùng đọc thấy trống, A ghi rồi
 * đọc lại thấy A, B ghi rồi đọc lại thấy B — cả hai cùng thoát 0, cả hai cùng tin mình có
 * quyền, và người ghi trước mất việc mà không hề biết. Đọc-lại chỉ bắt được ca A đọc SAU khi
 * B đã ghi; nó bỏ lọt đúng ca hai bên xen kẽ khít nhau.
 *
 * `mkdir` là thao tác NGUYÊN TỬ trên mọi hệ điều hành: hai tiến trình cùng gọi thì đúng một
 * cái thành công. Đó là toàn bộ mẹo ở đây — không cần thư viện khoá.
 *
 * TÁCH THÀNH HÀM từ bản 1.3.75, vì đường ghi khoá mức FILE cũng phải đi qua đúng cái khoá này.
 * Hai đường ghi cùng một file mà chỉ một đường có mutex thì mutex đó không còn nghĩa gì.
 *
 * `ponytail: khoá cả file bảng quyền, không khoá từng vùng. Đủ cho vài phiên; tách khoá theo
 * vùng nếu sau này có hàng chục phiên cùng lúc.`
 *
 * Trả về hàm NHẢ. Gọi nhiều lần vô hại. */
/* NHẬN ĐƯỜNG DẪN BẢNG — T2 (10/09): cửa `post-commit` chạy với `--goc` có thể khác gốc
   module (fixture, và `git worktree` của KHUNG-50). Khoá phải nằm cạnh ĐÚNG bảng đang ghi.
   Mặc định giữ nguyên nên mọi bên gọi cũ không đổi một chữ. */
export function giuBangQuyen(tepBang = CLAIMS_FILE) {
  const KHOA = `${tepBang}.lock`;
  let daKhoa = false;
  for (let i = 0; i < 50 && !daKhoa; i += 1) {
    try { fs.mkdirSync(KHOA); daKhoa = true; }
    catch (e) {
      if (e?.code !== "EEXIST") throw e;
      // Khoá mồ côi: tiến trình giữ nó đã chết. Quá 30 giây thì dọn — không dọn thì một lần
      // Ctrl+C khoá vĩnh viễn bảng quyền của cả repo.
      try {
        if (Date.now() - fs.statSync(KHOA).mtimeMs > 30000) { fs.rmSync(KHOA, { recursive: true, force: true }); continue; }
      } catch { /* khoá vừa được nhả giữa chừng — vòng sau thử lại */ }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
    }
  }
  if (!daKhoa) {
    console.error(`DANG_BI_KHOA: một phiên khác đang ghi bảng quyền (${KHOA}). Thử lại sau vài giây.`);
    process.exit(EXIT.MISUSE);
  }
  // Nhả trên MỌI đường ra, kể cả đường thoát sớm và đường ném. Quên nhả thì lần chạy sau phải
  // chờ hết 30 giây hạn khoá mồ côi — một cái khoá bỏ quên còn phiền hơn không có khoá.
  const nha = () => { try { fs.rmSync(KHOA, { recursive: true, force: true }); } catch { /* đã nhả rồi */ } };
  process.on("exit", nha);
  return nha;
}

/* ---- KHOÁ MỨC FILE — giữ ngắn, trả ngay ----------------------------------
 *
 * Đức chốt 2026-09-08, nguyên văn: *"AI Assistant chỉ giữ khóa đúng ở file mà AI đó đang sửa,
 * các file khác không giữ, khóa được giữ và trả ngay trước và sau khi AI sửa. Nếu chỉ đọc ko
 * cần giữ khóa."*
 *
 * ĐO Ở CHÍNH REPO NÀY trước khi tin — số của repo tiêu thụ là số của họ. 7 ngày, 384 commit,
 * 381 có nhãn `Lane:`, 41 lane khác nhau:
 *
 *   620  cặp commit KHÁC LANE, cách nhau <= 1 giờ, CÙNG VÙNG
 *   ├ 265 (43%)  dùng chung ít nhất một FILE   → khoá file KHÔNG gỡ được
 *   └ 355 (57%)  khác file hoàn toàn           → khoá file GỠ ĐƯỢC
 *   file/commit: trung vị 3 · p90 12 · p99 30 · max 42
 *
 * Hơn một nửa lượt chặn hôm nay là **chặn oan**. Và p90 = 12 file một lượt sửa — cao hơn hẳn
 * repo tiêu thụ (7) — nên `--sua` phải nhận cả MẺ đường dẫn trong một lệnh; không thì luật
 * "nhận ngay trước lượt ghi" lại thành chữ, vì làm đúng quá phiền.
 *
 * KHỐI RIÊNG `tam`, KHÔNG nhét vào `claims`. Hàng trong `claims` là vùng sở hữu, và cổng đóng
 * phiên có bất biến *"mỗi khoá vùng gốc phải có thư mục khai steward, và ngược lại"* — một
 * đường dẫn file nằm đó làm bất biến ấy ĐỎ.
 *
 * CÁI NÀY KHÔNG CHỮA, và nó làm chỗ đó XẤU ĐI — mang theo cả vế này, đừng chỉ mang phần đẹp:
 * khoá không giữ file, GIT giữ. Hai lane dùng chung một cây làm việc nên `git commit -a` vẫn
 * cuốn file lane khác vừa dàn. Khoá vùng trước đây SERIAL HOÁ hai lane nên lỗi đó ít có dịp nổ;
 * khoá file bỏ đúng sự serial hoá ấy, nên nó nổ DÀY HƠN. `--soat` là thứ mua lại, và nó chỉ là
 * một LỆNH chứ không phải một cổng — cổng đóng phiên chạy lúc index đã rỗng, không thấy gì. */

/* Khoá file sinh ra để giữ VÀI PHÚT. Quá ngưỡng này là dấu hiệu ai đó quên trả — và quên trả
   thì nó thoái hoá thành đúng cái khoá dài hạn mà nó thay thế. NHẮC, không tự nhả: tự nhả là
   tự động hoá đúng vụ nhả-khoá-hộ 06/09, lần này không ai kịp thấy. */
export const PHUT_NHAC_KHOA_FILE = 30;

/** Vùng bao ngoài một đường dẫn. Hỏi chính bộ quy vùng, không đoán lại luật. */
export function vungBaoNgoai(duongDan, structure, prefixes) {
  return stewardOf(duongDan, structure, prefixes);
}

/** Chuẩn hoá đường dẫn về dạng repo dùng: gạch xuôi, không `./`, không gạch cuối. */
export function chuanDuongDan(d) {
  return String(d ?? "").trim().split("\\").join("/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/* QUYẾT ĐỊNH THUẦN — không chạm đĩa, nên ghim được mọi nhánh bằng chuỗi. `bang` = cả file đã
   đọc (`{ claims, tam }`). Trả `{ code, message?, next? }`; `next` là khối `tam` MỚI. */
export function quyetDinhSua(bang, { duongDan, as, luc, vungCua, laMaySinh = () => false }) {
  const d = chuanDuongDan(duongDan);
  if (!d || d.split("/").includes("..")) {
    return { code: EXIT.MISUSE, message: `DUONG_DAN_LA: "${duongDan}" — phải là đường dẫn tương đối từ gốc repo.` };
  }
  /* ARTIFACT MÁY SINH KHÔNG ĐÒI KHOÁ NÀO — luật đã khai thế ở khối `generated` của
   * `.repo-structure.json`: *"nội dung tất định từ HEAD nên không ai sở hữu chúng theo nghĩa
   * nào"*. Bỏ vế này ra là **chặn oan**, đúng thứ khoá mức file sinh ra để bỏ.
   *
   * ĐO ĐƯỢC NGAY LƯỢT DÙNG THẬT ĐẦU TIÊN (08/09, hai lane cùng chạy): lane kia giữ `_root`, và
   * `--sua DASHBOARD-*.html` của tôi bị từ chối vì bảng đó nằm trong `_root` — trong khi chính
   * luật của repo nói không ai sở hữu nó. Bộ soát `--soat` đã miễn nhóm này từ đầu; đường `--sua`
   * thì quên, nên hai cửa của cùng một cơ chế nói hai điều khác nhau. */
  if (laMaySinh(d)) {
    return { code: EXIT.OK, maySinh: true, next: { ...(bang.tam || {}) } };
  }
  const tam = { ...(bang.tam || {}) };
  const dangGiu = tam[d]?.owner || null;
  if (dangGiu && dangGiu !== as) {
    return {
      code: EXIT.REFUSED,
      message: `TU_CHOI_SUA: "${d}" đang do "${dangGiu}" sửa (từ ${tam[d].luc || "?"}).`
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
  tam[d] = { owner: as, luc };
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
  /* XOÁ HÀNG, không để `owner: null`. Khoá file là tạm; giữ hàng trống thì sau một ngày bảng
     đầy xác đường dẫn và không ai đọc nổi nó nữa. */
  delete tam[d];
  return { code: EXIT.OK, next: tam };
}

/** Khoá file của NGƯỜI KHÁC nằm trong một vùng — chặn lượt nhận cả vùng. CHIỀU HAI của luật
 *  chứa nhau; thiếu nó là hai lane cùng tin mình được ghi, và không lớp nào kêu. */
export function khoaFileTrongVung(bang, vung, as, vungCua) {
  return Object.entries(bang.tam || {})
    .filter(([d, o]) => o?.owner && o.owner !== as && vungCua(d) === vung)
    .map(([d, o]) => ({ duongDan: d, owner: o.owner }));
}

/** Khoá file giữ quá lâu. NÊU TÊN, không tự nhả. */
export function khoaFileQuaHan(bang, phut, now = Date.now()) {
  return Object.entries(bang.tam || {}).map(([d, o]) => {
    /* Dùng `ageHours` — hàm đọc mốc SẴN CÓ của repo — chứ không `Date.parse` trần. Repo tiêu
       thụ vấp đúng chỗ này: mốc của họ là `2026-09-08T11:51`, THIẾU chữ Z, nên `Date.parse`
       đọc thành giờ địa phương và một khoá vừa nhận 1 phút bị báo "420 phút — quên trả?". */
    const gio = ageHours(o?.luc, new Date(now));
    return { duongDan: d, owner: o?.owner ?? null, phut: gio === null ? null : Math.floor(gio * 60) };
  }).filter((x) => x.phut !== null && x.phut > phut);
}

/* ---- SOÁT TRƯỚC KHI COMMIT — vá cái mà khoá file KHÔNG chữa được ----------
 *
 * Khoá không giữ file; **git giữ**. Khoá mức file làm số người ghi đồng thời TĂNG, nên lỗi
 * "cuốn theo file của lane khác" nổ DÀY HƠN chứ không thưa đi. Bù lại nó lần đầu cho ta thứ đủ
 * mịn để soát: trước đây "vùng tôi giữ" quá thô để nói file nào là của ai.
 *
 * KHÔNG chặn được từ cổng đóng phiên — cổng chạy lúc index đã rỗng nên nó không thấy gì. Đây là
 * một LỆNH phải gọi trước `git commit`. */
export function soatDanHang({ daDan, tam, claims, as, mienKhoa, maySinh, vungCua }) {
  /* HAI DANH SÁCH MIỄN, và bỏ sót cái thứ hai làm phép soát BÁO OAN ngay lượt dùng thật đầu
     tiên ở repo tiêu thụ: nó chặn ba artifact máy sinh mà luật khai rõ là KHÔNG đòi khoá nào —
     không có gì của ai trong đó để mất, chạy lại bộ sinh là ra y hệt. Một cỗ máy dựng ra để
     chống chặn oan mà tự chặn oan thì nó bị bỏ qua trong một ngày. */
  const sinh = new Set(maySinh || []);
  const mien = new Set(mienKhoa || []);
  const la = [];
  const soChung = [];
  for (const f of daDan || []) {
    const d = chuanDuongDan(f);
    if (sinh.has(d)) continue;                                    // artifact máy sinh: bỏ qua hẳn
    if (mien.has(d)) { soChung.push(d); continue; }               // sổ chỉ-thêm: hợp lệ, nhưng nêu tên
    if ((tam || {})[d]?.owner === as) continue;                   // tôi đang khoá đúng file này
    const vung = vungCua(d);
    if ((claims || {})[vung]?.owner === as) continue;             // tôi giữ cả vùng
    la.push({ duongDan: d, vung, chuVung: (claims || {})[vung]?.owner || null, chuFile: (tam || {})[d]?.owner || null });
  }
  return { la, soChung };
}

/* ---- CỬA INDEX — HẸP HƠN `--soat`, cố ý -----------------------------------
 *
 * `--soat` từ chối mọi file bạn KHÔNG CÓ QUYỀN GHI, kể cả file vô chủ không ai khoá. Đúng cho
 * một LỆNH người tự gọi. SAI cho một cửa chạy ở MỌI commit của MỌI lane: nó sẽ chặn cả lượt
 * commit hợp lệ của lane quên nhận khoá, và một cửa chặn oan thì trong một ngày sẽ có người
 * mở `--no-verify` cho mọi lượt.
 *
 * KHUNG-59 mất gì? **TRUY NGUỒN** — việc của lane A vào commit dưới tên lane B. Nên cửa này
 * chỉ soi đúng điều đó: đường dẫn nào đang có CHỦ, và chủ đó KHÔNG PHẢI TÔI. File vô chủ vẫn
 * qua; kỷ luật khoá là việc của `--soat` và của cổng đóng phiên, không phải của cửa này.
 *
 * MANG THEO CẢ VẾ NÀY: hai lane đều không nhận khoá thì cửa này KHÔNG thấy gì. Bảng quyền là
 * bằng chứng duy nhất máy có về "của ai", và không ai khai thì không có gì để so. */
export function cuaIndex(doiSo) {
  const { la } = soatDanHang(doiSo);
  return la.filter((x) => (x.chuFile && x.chuFile !== doiSo.as) || (x.chuVung && x.chuVung !== doiSo.as));
}

/* CỬA ĐÃ BẬT CHƯA — quyết định THUẦN, để cổng đóng phiên ghim được cả ba nhánh bằng chuỗi.
 *
 * HAI CA TRÔNG GIỐNG NHAU, và gộp chúng là một fail-open — vòng audit 10/09 bắt đúng chỗ này:
 * bản đầu chỉ hỏi *"file hook có tồn tại không"*, nên XOÁ file hook đi là cổng chuyển sang XANH
 * (bỏ qua). Phân biệt bằng git: repo có THEO DÕI file hook thì cửa là thứ repo này phải có, và
 * thiếu nó là ĐỎ; repo chưa bao giờ nhận bản trích thì không theo dõi, và bỏ qua là đúng. */
export function xetCuaIndex({ coTrenDia, daTheoDoi, hooksPath }) {
  if (!coTrenDia) {
    if (!daTheoDoi) return { ok: true, skipped: true, msg: "repo này chưa nhận cửa index (`.githooks/commit-msg`) — không có cửa thì không đo." };
    return { ok: false, msg: "CUA_INDEX_BI_THAO: repo theo dõi `.githooks/commit-msg` nhưng file không còn trên đĩa. Lấy lại: git checkout -- .githooks/commit-msg" };
  }
  const dang = String(hooksPath ?? "").trim();
  if (dang === ".githooks") return { ok: true, msg: "cửa index đang bật" };
  return {
    ok: false,
    msg: `CUA_INDEX_TAT: core.hooksPath ${dang ? `đang trỏ "${dang}"` : "chưa đặt"}, nên \`.githooks/commit-msg\` KHÔNG chạy.`
      + " Cửa đó là thứ duy nhất chặn `git commit` của bạn cuốn theo file lane khác vừa `git add` (KHUNG-59)."
      + " Bật: git config core.hooksPath .githooks"
      + (dang ? " — đang trỏ nơi khác thì HỎI người đặt trước, đừng ghi đè." : ""),
  };
}

/* Bật cửa index cho bản sao repo này. `core.hooksPath` là cấu hình MỖI BẢN SAO, không theo git
   được — nên nó phải được bật bởi một lệnh mà mọi lane đều chạy trước lượt ghi đầu tiên, và
   `--sua` đúng là lệnh đó. Có người đã trỏ hooksPath đi nơi khác thì KHÔNG giành: nêu tên, để
   cổng đóng phiên nói tiếp. */
export function napCuaIndex(root = ROOT) {
  const doc = (args) => {
    try { return execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
    catch { return ""; }
  };
  if (!fs.existsSync(path.join(root, ".githooks", "commit-msg"))) return { trangThai: "khong-co-cua" };
  const dang = doc(["config", "--get", "core.hooksPath"]);
  if (dang === ".githooks") return { trangThai: "da-bat" };
  if (dang) return { trangThai: "tro-noi-khac", dang };
  try {
    execFileSync("git", ["config", "core.hooksPath", ".githooks"], { cwd: root, stdio: "ignore" });
    return { trangThai: "vua-bat" };
  } catch (e) { return { trangThai: "bat-khong-duoc", loi: String(e.message).split(String.fromCharCode(10))[0] }; }
}

/* Quyết định THUẦN — tách khỏi việc đọc/ghi để kiểm được mọi nhánh mà không cần đĩa. */
export function decide(claims, { action, key, as, today, ai, ducDuyet, dirty, chuaDay, duBiet }) {
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
      /* GIÀNH VÙNG NGƯỜI KHÁC: có đường máy, và đường đó ĐÒI CÂU CHỐT CỦA ĐỨC.
       *
       * Trước đây lệnh chỉ biết từ chối, nên khi Đức đã chốt thì cách duy nhất là **sửa tay**
       * `claims.json` — và sửa tay thì câu chốt không đi vào bảng, chỉ nằm trong đầu người sửa.
       * Người cần đọc câu đó là phiên vừa BỊ mất vùng, mà họ chỉ đọc bảng chứ không đọc lịch sử
       * chat. Đo thật 04/09: một lượt giành vùng phải làm bằng tay đúng vì thiếu đường này. */
      if (typeof ducDuyet !== "string" || ducDuyet.trim().length < 10) {
        return {
          code: EXIT.REFUSED,
          message: `TU_CHOI: "${key}" đang do "${owner}" giữ, không phải bạn.`
            + `\nGhi chú của họ: ${String(cur.task || "(không có)").slice(0, 160)}`
            + "\nLuật mục 1: gói có chủ mà chủ không phải bạn thì CHỈ ĐƯỢC ĐỌC. Muốn giành thì hỏi Đức."
            + "\nĐức chốt rồi thì chạy lại kèm:  --duc-duyet \"<câu chốt của Đức>\""
            + "\nCâu đó được ghi VÀO BẢNG, không phải in ra màn hình — người cần đọc nó là phiên vừa mất vùng."
        };
      }
      /* VÙNG CÒN VIỆC DỞ CỦA CHỦ CŨ THÌ KHÔNG GIÀNH ĐƯỢC, kể cả khi Đức đã chốt.
       *
       * Câu chốt của Đức nói "vùng này chuyển tay", nó KHÔNG nói "được đè lên file người ta đang
       * sửa". Đo thật 04/09, và cái giá đã trả: sau một lượt giành vùng, `git add <file>` cuốn
       * theo hai dòng `AGENTS.md` của phiên khác đang sửa dở — nội dung không mất, nhưng nhãn
       * lane ghi sai người làm, mà nhãn lane là thứ cả cơ chế này dựa vào.
       *
       * Chặn ở đây, không phải ở lúc commit: lúc commit thì người ta đã tin mình có quyền rồi. */
      if (Array.isArray(dirty) && dirty.length) {
        return {
          code: EXIT.REFUSED,
          message: `TU_CHOI: "${key}" đang do "${owner}" giữ, và vùng đó CÒN ${dirty.length} file sửa dở:`
            + `\n  ${dirty.slice(0, 8).join("\n  ")}${dirty.length > 8 ? `\n  … và ${dirty.length - 8} file nữa` : ""}`
            + "\nĐức chốt việc CHUYỂN VÙNG, không chốt việc đè lên file người ta đang sửa."
            + "\nCách xử lý: nhờ phiên đó commit (hoặc stash) phần của họ trước, rồi chạy lại."
        };
      }
      return {
        code: EXIT.OK,
        giành: owner,
        next: { ...cur, owner: as, ai: ai ?? null, claimed_at: today, released_at: null,
          taken_from: owner, taken_by: as, duc_decision: ducDuyet.trim() }
      };
    }
    // Đã là của mình rồi thì không phải lỗi — chạy lại lệnh cùng nội dung phải an toàn.
    // TRƯỜNG `ai` KHÔNG ĐƯỢC ĐÓNG CỨNG LÀ "Claude". Bảng quyền này là của cả ba AI — Codex và
    // Antigravity cũng nhận vùng bằng đúng lệnh này, và trước đây mọi lượt nhận đều bị ghi là
    // "Claude". Một bảng ghi sai ai đang giữ thì nó không còn là bảng quyền, nó là chuyện kể.
    // Không khai thì để null: thiếu thông tin còn hơn thông tin sai. NHƯNG nếu đang là quyền của
    // chính mình và lần trước đã khai rồi thì GIỮ LẠI — chạy lại lệnh để đổi mỗi câu `--task` mà
    // xoá mất tên AI là biến một lệnh vô hại thành lệnh làm mất dữ liệu.
    const aiGiu = ai ?? (owner === as ? cur.ai ?? null : null);
    return { code: EXIT.OK, already: owner === as, next: { ...cur, owner: as, ai: aiGiu, claimed_at: today, released_at: null } };
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
    /* COMMIT CHƯA ĐẨY THÌ CHƯA TRẢ ĐƯỢC — trừ khi nói rõ là mình biết.
     *
     * Trả khoá xong mà commit còn nằm trên máy thì vùng đó **không ai đứng tên** trong khi vẫn
     * có thay đổi chưa công bố. Cổng đóng phiên của phiên SAU sẽ đỏ với câu *"vùng bị sửa nhưng
     * chưa ai đứng tên"* — và cổng đúng: một commit chưa công bố mà không quy được chủ là một
     * commit không ai chịu trách nhiệm.
     *
     * HAI VẾ PHẢI ĐI CÙNG NHAU, và đây là chỗ dễ làm hỏng nhất. Chỉ lấy vế chặn thì một lane bị
     * cổng xuất bản từ chối đẩy sẽ **kẹt khoá vĩnh viễn**: nó không đẩy được, nên không trả được,
     * nên vùng đó chết theo nó. Cửa thoát `--du-biet` không phải chỗ hở — nó là điều kiện để vế
     * chặn kia được phép tồn tại. Cửa thoát GHI LẠI lý do vào bảng, nên nó là một câu khai chứ
     * không phải một cái tặc lưỡi.
     *
     * Không đo được (`chuaDay == null`) thì KHÔNG chặn: trả khoá là thao tác gỡ bí, và một lệnh
     * gỡ bí mà tự chặn vì git hỏng thì nó biến sự cố nhỏ thành sự cố kẹt cả vùng. Khác hẳn nhánh
     * `--take` ở trên, nơi fail-closed là đúng vì giành vùng không lùi lại được. */
    if (Array.isArray(chuaDay) && chuaDay.length && !duBiet) {
      const NL2 = String.fromCharCode(10);
      return {
        code: EXIT.REFUSED,
        message: [
          `TU_CHOI: "${key}" còn ${chuaDay.length} commit CHƯA ĐẨY chạm vùng này:`,
          ...chuaDay.slice(0, 8).map((c) => `  ${c}`),
          ...(chuaDay.length > 8 ? [`  … và ${chuaDay.length - 8} commit nữa`] : []),
          "Trả khoá bây giờ là để lại commit chưa công bố mà không ai đứng tên — cổng của phiên sau sẽ đỏ,",
          "và người đọc GitHub thì không thấy việc đó tồn tại.",
          `Cách xử lý: đẩy trước, rồi trả — node scripts/safe-push.mjs --as ${as}`,
          "Thật sự muốn trả kèm commit chưa đẩy thì nói rõ là mình biết:",
          `  node scripts/claim.mjs --release ${key} --as ${as} --du-biet "vì sao"`
        ].join(NL2)
      };
    }
    /* NÓI RA CÁI GIÁ, ngay lúc trả. Đo 07/09: sau một lượt `--du-biet`, lane KẾ TIẾP không đẩy
     * được — `safe-push` từ chối vì nó cuốn theo commit của lane đã đi. Gỡ được, nhưng chỉ Đức
     * gỡ được (`--carry`). Cửa thoát này vẫn đúng là cần; im lặng về cái giá của nó thì không. */
    const khai = duBiet && Array.isArray(chuaDay) && chuaDay.length
      ? { tra_khi_chua_day: `${chuaDay.length} commit · ${typeof duBiet === "string" ? duBiet : "không nêu lý do"}` }
      : {};
    return { code: EXIT.OK, next: { ...cur, owner: null, ai: null, released_at: today, ...khai } };
  }

  return { code: EXIT.MISUSE, message: `HANH_DONG_LA: "${action}"` };
}

/* ---- TUỔI MỘT LƯỢT GIỮ KHOÁ ---------------------------------------------
 *
 * Ba thứ này trước ở `what-next.mjs`, với lý do ghi rõ: *"đặt vào `claim.mjs` là buộc phải sửa
 * một script đang đi theo bản trích, tức buộc cắt một phiên bản bộ khung mới — trả giá lớn cho
 * hai hàm bốn dòng."* Lý do đó đúng lúc viết. Nay `claim.mjs` phải sửa vì việc khác (tín hiệu
 * dấu vết bên dưới) nên cái giá ấy đã trả rồi, và chỗ đúng của chúng là ĐÂY — file này là file
 * GHI `claimed_at`, nên nó là file duy nhất biết con số ấy nghĩa là gì.
 *
 * CỐ Ý KHÔNG tự đòi lại khoá quá hạn. Một phiên chạy dài là chuyện bình thường, và `claimed_at`
 * không được chạm lại trong lúc làm — nên "cũ" KHÔNG đồng nghĩa "chết". Đây là số liệu để HỎI,
 * không phải một phán quyết. */
export const GIO_NHAC = 6;

export function ageHours(stamp, now = new Date()) {
  const t = Date.parse(String(stamp || ""));
  if (!Number.isFinite(t)) return null;
  return Math.max(0, (now.getTime() - t) / 3600000);
}

/* MỐC CHỈ CÓ NGÀY THÌ KHÔNG BIẾT GIỜ — và không được giả vờ là biết.
 *
 * ĐO ĐƯỢC 06/09, và Đức là người nhìn thấy trước: bảng quyền báo ba khoá "giữ 16h ⚠ quá 6h",
 * trong khi cả ba vừa được nhận **hai tiếng trước**. Nguyên nhân: mốc cũ là `"2026-09-06"` —
 * chỉ ngày — nên `Date.parse` đọc thành nửa đêm UTC, và tới chiều thì phép trừ ra 16 tiếng.
 *
 * Con số ma đó nguy hiểm hơn không có con số: nó **bật ⚠**, và một cái ⚠ sai vài lần thì lần
 * thứ ba không ai nhìn nữa — lúc đó một khoá kẹt thật cũng trôi qua. Từ bản 1.3.21 mốc mới luôn
 * có giờ; mốc cũ thì nói ĐÚNG ĐỘ CHÍNH XÁC nó có: "nhận trong hôm nay", không phải "16h". */
export function mocCoGio(stamp) {
  return /\d{1,2}:\d{2}/.test(String(stamp || ""));
}

export function ageLabel(hours, coGio = true) {
  if (hours == null) return "không rõ từ khi nào";
  if (!coGio) {
    // Độ phân giải của mốc là NGÀY, nên câu trả lời cũng phải ở mức ngày.
    return hours < 24 ? "nhận trong hôm nay" : `${Math.round(hours / 24)} ngày`;
  }
  // Phút, không phải "dưới 1h": cả lỗ mà tín hiệu bên dưới chữa đều xảy ra trong vòng 20 phút
  // đầu của một lượt giữ. Gộp hết vào "dưới 1h" là làm mù đúng khoảng thời gian đáng nhìn.
  if (hours < 1) return `${Math.round(hours * 60)} phút`;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)} ngày`;
}

/** ⚠ chỉ khi con số ĐỦ CHÍNH XÁC để đáng tin: mốc có giờ thì theo `GIO_NHAC`, mốc chỉ-ngày thì
 *  phải qua hẳn một ngày. Không có luật này thì mọi mốc cũ đều kêu ⚠ ngay từ trưa. */
export function dangNhac(hours, coGio) {
  if (hours == null) return false;
  return coGio ? hours >= GIO_NHAC : hours >= 24;
}

/* ---- REPO CHƯA THẤY DẤU VẾT ----------------------------------------------
 *
 * TÊN CỦA TÍN HIỆU LÀ PHẦN CỦA HỢP ĐỒNG, không phải chuyện chữ nghĩa.
 *
 * Bản đầu của đề bài gọi nó là "vùng chưa bị chạm", và mọi người đọc — kể cả chính phiên viết ra
 * nó — đọc thành "lane đang rảnh". Hai câu đó KHÁC NHAU, và khoảng cách giữa chúng đã trả giá
 * thật ngày 06/09: một lane bị đo thấy "0 commit 0 sửa đổi" suốt 14 phút, phiên điều phối tin
 * con số và nhả khoá hộ — trong khi lane ấy **đang làm thật**, dựng bản nháp ở một thư mục
 * NGOÀI repo và chỉ định ghi vào ở bước cuối. Lane đó phải hoàn nguyên phần đã xong.
 *
 * Nên câu đúng, và là câu duy nhất được in ra:
 *
 *     Tín hiệu này nói REPO CHƯA THẤY GÌ. Nó KHÔNG nói lane đang rảnh, và nó KHÔNG BAO GIỜ đủ
 *     để nhả khoá của lane khác.
 *
 * Con số này về NGUYÊN TẮC không thấy được việc làm ngoài repo — nên đo kỹ hơn cũng không đóng
 * được lỗ đó. Ba đường hợp lệ để một khoá được trả, và chỉ ba: chính lane đó trả · lane đó đã
 * kết thúc · Đức chốt chuyển khoá. Xem `AGENTS.md` mục 1. */
export const DAU_VET = Object.freeze({ THAY: "thay", CHUA: "chua", KHONG_DO: "khong-do-duoc" });

/**
 * Quyết định THUẦN — không chạm git, không chạm đĩa, nên đột biến kiểm được từng nhánh.
 *
 * @param {string}  claimedAt  mốc nhận khoá, dạng ISO. Đọc không ra thì trả `KHONG_DO`.
 * @param {Array<{key:string,khi:string}>|null} chamCommit  file đã commit, đã quy về khoá, kèm
 *        mốc commit. `null` = không đo được (git hỏng) — KHÔNG được coi là "chưa thấy".
 * @param {Array<{key:string}>|null} chamDia  file sửa dở trên đĩa, đã quy về khoá.
 */
export function xetDauVet(key, claimedAt, chamCommit, chamDia) {
  /* KHÔNG ĐO ĐƯỢC ≠ CHƯA THẤY. Đây là chiều fail-closed của tín hiệu này, và nó quan trọng
   * hơn bình thường: nhánh "chưa thấy" là nhánh khiến người ta nghĩ tới việc nhả khoá. Một lần
   * git hỏng mà im lặng ngã về "chưa thấy" là dựng đúng tai nạn 06/09 thành hành vi mặc định. */
  if (chamCommit === null || chamDia === null) return DAU_VET.KHONG_DO;
  const moc = Date.parse(String(claimedAt || ""));
  if (!Number.isFinite(moc)) return DAU_VET.KHONG_DO;
  if (chamDia.some((f) => f.key === key)) return DAU_VET.THAY;
  const coCommit = chamCommit.some((f) => {
    if (f.key !== key) return false;
    const t = Date.parse(String(f.khi || ""));
    // Commit không đọc được mốc thì TÍNH LÀ CÓ — nhầm về phía "lane đang làm" là nhầm an toàn.
    return !Number.isFinite(t) || t >= moc;
  });
  return coCommit ? DAU_VET.THAY : DAU_VET.CHUA;
}

/** Câu in ra. Một chỗ duy nhất, để ba nơi hiển thị không thể nói ba kiểu. */
export function noiDauVet(trangThai) {
  if (trangThai === DAU_VET.CHUA) return "repo chưa thấy dấu vết";
  if (trangThai === DAU_VET.KHONG_DO) return "không đo được dấu vết";
  return "";
}

/**
 * Đo dấu vết cho MỌI khoá đang có chủ, bằng ĐÚNG HAI lệnh git cho cả bảng.
 *
 * Không đo khi bảng trống: `git status` trên repo lớn không rẻ, và `--list` là lệnh chạy nhiều
 * nhất trong cả bộ. Không có khoá nào bị giữ thì không có gì để nói.
 */
export async function doDauVet(claims, root = ROOT) {
  const dangGiu = Object.entries(claims).filter(([, v]) => v?.owner);
  if (!dangGiu.length) return new Map();

  const som = dangGiu
    .map(([, v]) => Date.parse(String(v.claimed_at || "")))
    .filter((t) => Number.isFinite(t));
  const tuKhi = som.length ? new Date(Math.min(...som)).toISOString() : null;

  let chamCommit = null;
  let chamDia = null;
  try {
    const { stewardOf, claimPrefixesFrom, readStructureFromDisk } = await import("./repo-structure.mjs");
    const cauTruc = readStructureFromDisk(root);
    const tienTo = claimPrefixesFrom(cauTruc);
    const chay = (args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

    chamDia = chay(["status", "--porcelain", "--untracked-files=all"])
      .split(String.fromCharCode(10)).filter(Boolean)
      .map((d) => d.slice(3).replace(/^"|"$/g, ""))
      // File bảng quyền được MIỄN khoá (luật mục 1) nên nó không phải dấu vết của ai cả.
      .filter((f) => f !== ".agents/claims.json")
      .map((f) => ({ key: stewardOf(f, cauTruc, tienTo) }));

    chamCommit = [];
    if (tuKhi) {
      // `%x00` giữa mốc và danh sách file: tên file có thể chứa mọi thứ trừ NUL.
      const ra = chay(["log", `--since=${tuKhi}`, "--name-only", "--pretty=format:%x01%cI"]);
      for (const khoi of ra.split(String.fromCharCode(1)).filter((x) => x.trim())) {
        const dong = khoi.split(String.fromCharCode(10));
        const khi = dong[0].trim();
        for (const f of dong.slice(1).filter(Boolean)) {
          chamCommit.push({ key: stewardOf(f, cauTruc, tienTo), khi });
        }
      }
    }
  } catch (_) {
    chamCommit = null;
    chamDia = null;
  }

  const ra = new Map();
  for (const [k, v] of dangGiu) ra.set(k, xetDauVet(k, v.claimed_at, chamCommit, chamDia));
  return ra;
}

async function main() {
  const argv = process.argv.slice(2);
  const flag = (name) => {
    const i = argv.indexOf(`--${name}`);
    return i >= 0 ? (argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : true) : null;
  };

  let parsed;
  try { parsed = readClaims(); }
  catch (error) { console.error(error.message); process.exit(EXIT.MISUSE); }

  if (flag("list") || argv.length === 0) {
    const dauVet = await doDauVet(parsed.claims);
    const seal = fingerprintState(parsed);
    let coChua = false;
    for (const [key, value] of Object.entries(parsed.claims)) {
      const owner = value.owner || "";
      let duoi = "";
      if (owner) {
        const coGio = mocCoGio(value.claimed_at);
        const gio = ageHours(value.claimed_at);
        const cot = [coGio ? `giữ ${ageLabel(gio, true)}` : ageLabel(gio, false)];
        const noi = noiDauVet(dauVet.get(key));
        if (noi) cot.push(noi);
        if (dauVet.get(key) === DAU_VET.CHUA) coChua = true;
        if (dangNhac(gio, coGio)) cot.push(coGio ? "⚠ quá " + GIO_NHAC + "h" : "⚠ quá một ngày");
        duoi = `  (${cot.join(" · ")})`;
      }
      console.log(`${owner ? "GIU  " : "TRỐNG"} ${key.padEnd(34)}${owner}${duoi}`);
    }
    /* KHOÁ MỨC FILE hiện ngay dưới bảng vùng — cùng một câu hỏi *"ai đang được ghi cái gì"*,
       nên cùng một chỗ trả lời. Để nó ở một lệnh riêng là dựng một nguồn sự thật thứ hai. */
    const tam = Object.entries(parsed.tam || {});
    if (tam.length) {
      console.log("");
      console.log(`KHOÁ MỨC FILE — ${tam.length} file, loại giữ VÀI PHÚT:`);
      const quaHan = new Map(khoaFileQuaHan(parsed, PHUT_NHAC_KHOA_FILE).map((x) => [x.duongDan, x.phut]));
      for (const [d, o] of tam) {
        const gio = ageHours(o?.luc);
        const tuoi = gio === null ? "không rõ từ khi nào" : `${Math.floor(gio * 60)} phút`;
        const nhac = quaHan.has(d) ? `  ⚠ quá ${PHUT_NHAC_KHOA_FILE} phút — quên trả?` : "";
        console.log(`  ${d.padEnd(44)}${o?.owner || "?"}  (${tuoi})${nhac}`);
      }
      if (quaHan.size) {
        console.log("");
        console.log("⚠ KHÔNG tự nhả hộ, kể cả khi quá hạn. Đây là số liệu để HỎI — cùng luật với khoá vùng.");
      }
    }
    if (coChua) {
      console.log("");
      console.log('"repo chưa thấy dấu vết" = không commit nào chạm vùng đó kể từ lúc nhận khoá,');
      console.log("và không file nào trong vùng đang sửa dở. Nó KHÔNG nói lane đó rảnh — một lane");
      console.log("cẩn thận dựng nháp ở ngoài repo rồi mới ghi vào, và repo không thấy được việc đó.");
      console.log("KHÔNG nhả khoá hộ lane khác vì con số này. Hỏi lane đó, hoặc hỏi Đức — AGENTS.md mục 1.");
    }
    if (seal.ok === false) console.error(`${String.fromCharCode(10)}${VO_DAU}`);
    if (seal.ok === null) {
      console.log(`${String.fromCharCode(10)}CHUA_DONG_DAU: bảng này chưa có dấu niêm phong.`);
      console.log(`Đóng dấu: node scripts/claim.mjs --restamp --as <phiên>`);
    }
    process.exit(seal.ok === false ? EXIT.REFUSED : EXIT.OK);
  }

  /* `--as` đọc SỚM: ba nhánh khoá mức file ở dưới cần nó, và chúng chạy trước khối khoá vùng.
     Khai muộn thì `as` nằm trong vùng chết của `const` và mọi nhánh mới ném ReferenceError. */
  const as = flag("as");

  /* ---- --restamp : đóng lại dấu sau khi ĐÃ xử lý lượt sửa tay -------------
   *
   * Lệnh này là CỬA SAU nếu để trần: sửa tay → restamp → dấu hợp lệ, cổng xanh với mọi phiên
   * khác. Nên nó đối chiếu với HEAD: lượt sửa đó CHUYỂN CHỦ một khoá thì đòi `--duc-duyet`,
   * và câu chốt được ghi VÀO bảng — phiên vừa mất khoá chỉ đọc bảng, không chạy lệnh. */
  if (flag("restamp")) {
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --restamp --as <phiên> [--duc-duyet \"<câu chốt>\"]");
      process.exit(EXIT.MISUSE);
    }
    const seal = fingerprintState(parsed);
    if (seal.ok === true) {
      console.log("dấu còn nguyên, không phải đóng lại.");
      process.exit(EXIT.OK);
    }
    const truoc = chuTheoHead();
    const doiChu = truoc
      ? Object.entries(parsed.claims)
          .map(([k, v]) => [k, truoc.get(k) ?? null, (v && v.owner) || null])
          .filter(([, cu2, moi2]) => cu2 !== moi2 && cu2 !== null && moi2 !== null)
      : [];
    const duyet = flag("duc-duyet");
    if (doiChu.length && typeof duyet !== "string") {
      console.error(`${String.fromCharCode(10)}TU_CHOI: lượt sửa tay này CHUYỂN CHỦ ${doiChu.length} khoá so với HEAD:`);
      for (const [k, cu2, moi2] of doiChu) console.error(`  ${k}: ${cu2} → ${moi2}`);
      console.error("Đóng dấu cho xong là hợp thức hoá đúng việc luật mục 1 cấm. Hỏi Đức, rồi:");
      console.error(`  node scripts/claim.mjs --restamp --as ${as} --duc-duyet "Đức chốt <ngày>: <lý do một câu>"`);
      process.exit(EXIT.REFUSED);
    }
    if (doiChu.length) {
      parsed._chuyen_khoa = [...(Array.isArray(parsed._chuyen_khoa) ? parsed._chuyen_khoa : []), {
        luc: new Date().toISOString(), boi: as, duc_duyet: duyet,
        khoa: doiChu.map(([k, cu2, moi2]) => `${k}: ${cu2} → ${moi2}`)
      }];
    }
    ghiBang(parsed);
    console.log(`dấu cũ: ${seal.stamped ?? "(chưa có)"}  →  dấu mới: ${parsed[FINGERPRINT_FIELD]}`);
    process.exit(EXIT.OK);
  }

  /* ---- --sau-commit : CỬA gọi bởi hook `post-commit` --------------------
   *
   * T2 (10/09). Luật mục 1 nói: khoá FILE trả NGAY SAU commit chứa lượt ghi. Nó bị cưỡng chế
   * bởi CỔNG — tức cuối phiên, và cổng ĐỎ chỉ là lưới đỡ. Đức: *"khoá phải nhả ngay khi hết
   * sửa, cố gắng hook tốt vào"*, nói hai lần. Đây là cái hook đó.
   *
   * `post-commit` là mốc ĐÚNG: commit đã hình thành, nên "lượt ghi đã xong" là sự thật, không
   * phải dự đoán. Và mã thoát của nó KHÔNG ảnh hưởng `git commit` (đo 10/09: hook thoát 7 →
   * git thoát 0), nên cửa này KHÔNG THỂ chặn oan ai. Đó là lý do nó được phép tự động.
   *
   * CHỈ TRẢ KHOÁ CỦA FILE TRONG COMMIT NÀY, và chỉ của lane đứng tên commit. File đang sửa dở
   * mà chưa commit thì giữ nguyên khoá — trả hộ chúng là lấy mất lưới đỡ của chính lane đó.
   *
   * DÙNG LẠI `quyetDinhXong`, không viết đường trả thứ hai. Vòng audit 10/09 bắt tôi hai lần vì
   * tự viết bản thứ hai của một thứ đã có nhà. */
  if (flag("sau-commit")) {
    const goc = typeof flag("goc") === "string" ? path.resolve(flag("goc")) : ROOT;
    const gitO = (...a) => execFileSync("git", ["-c", "core.quotepath=false", ...a], { cwd: goc, encoding: "utf8" });
    /* CHOT COMMIT DANG XU LY — kiem toan 10/09 [B]#5. Doc loi nhan roi doc danh sach file bang
     * HAI lan hoi "HEAD" thi giua hai lan do mot lane khac co the commit, va cua nay se tra khoa
     * theo danh sach file cua MOT commit khac voi commit no doc nhan. Giai mot lan, dung mot SHA. */
    let dinh = "HEAD";
    try { dinh = gitO("rev-parse", "HEAD").trim(); } catch { process.exit(EXIT.OK); }
    let khai = { lane: null, problem: null };
    try { khai = laneFromMessage(gitO("log", "-1", "--format=%B", dinh)); } catch { /* không đọc được lời nhắn: im, để cổng nói */ }
    if (!khai.lane || khai.problem) process.exit(EXIT.OK);
    const toi = khai.lane;
    const tepBang = path.join(goc, ".agents", "claims.json");
    let bang;
    try { bang = readClaims(tepBang); } catch { process.exit(EXIT.OK); }
    if (!bang.tam || !Object.keys(bang.tam).length) process.exit(EXIT.OK);
    let trongCommit = [];
    try {
      trongCommit = gitO("show", "--pretty=", "--name-only", "-z", dinh)
        .split(String.fromCharCode(0)).filter(Boolean);
    } catch { process.exit(EXIT.OK); }
    /* CHI TRA KHOA CUA FILE DA SACH — kiem toan 10/09 [B]#5, va day la mot lo THAT.
     * Mot file vua vao commit MA VAN con sua do (dan mot phan bang `git add -p`, hay sua tiep sau
     * khi `git add`) thi luot ghi CHUA xong — tra khoa luc do la lay mat luoi do cua chinh lane
     * dang sua. Hoi git: file nao con hien trong `status --porcelain` thi GIU khoa. */
    /* BẢN GHI ĐỔI TÊN DÙNG HAI TRƯỜNG — kiểm toán 10/09 [#4], và tôi đã tự dựng lại ca này.
     * `status --porcelain -z` phát `R  moi cu `: MỘT mục, HAI trường. Bản đầu của tôi tách
     * theo NUL rồi `slice(3)` cho MỌI trường, nên đường dẫn CŨ bị cắt mất 3 ký tự đầu — đo
     * được: `scripts/cu ten.mjs` thành `ipts/cu ten.mjs`. Một đường dẫn sai trong bảng "đang
     * bẩn" nghĩa là file bẩn thật không được nhận ra, và khoá của nó bị trả trong khi lane vẫn
     * đang sửa — đúng cái lỗ mà bản vá này sinh ra để bịt. Trường thứ hai KHÔNG có tiền tố. */
    let banTrenCay = new Set();
    try {
      const truong = gitO("status", "--porcelain", "-z", "-uall").split(String.fromCharCode(0));
      for (let k = 0; k < truong.length; k += 1) {
        const rec = truong[k];
        if (!rec) continue;
        banTrenCay.add(chuanDuongDan(rec.slice(3)));
        if (rec[0] === "R" || rec[0] === "C") {   // đổi tên / sao chép: trường kế là đường CŨ
          k += 1;
          if (truong[k]) banTrenCay.add(chuanDuongDan(truong[k]));
        }
      }
    } catch { process.exit(EXIT.OK); }   // khong doc duoc trang thai cay thi khong tra gi ca
    let tam = bang.tam;
    const daTra = [];
    const giuLai = [];
    for (const d of trongCommit) {
      const chu = tam[chuanDuongDan(d)]?.owner ?? tam[chuanDuongDan(d)]?.chu ?? null;
      if (chu !== toi) continue;                  // khong phai khoa cua toi -> khong cham
      if (banTrenCay.has(chuanDuongDan(d))) { giuLai.push(chuanDuongDan(d)); continue; }   // còn sửa dở → GIỮ
      const kq = quyetDinhXong({ claims: bang.claims, tam }, { duongDan: d, as: toi });
      if (kq.code !== EXIT.OK) continue;          // im lặng: đây là tiện ích, không phải cổng
      tam = kq.next;
      daTra.push(chuanDuongDan(d));
    }
    if (giuLai.length) console.log(`giu khoa (con sua do, chua sach tren cay): ${giuLai.join(" · ")}`);
    if (!daTra.length) process.exit(EXIT.OK);
    const nhaKhoaBang = giuBangQuyen(tepBang);
    try {
      const lai = readClaims(tepBang);           // đọc lại DƯỚI khoá: lane khác có thể vừa ghi
      let tam2 = lai.tam || {};
      const thatSu = [];
      for (const d of daTra) {
        const kq = quyetDinhXong({ claims: lai.claims, tam: tam2 }, { duongDan: d, as: toi });
        if (kq.code !== EXIT.OK) continue;
        tam2 = kq.next;
        thatSu.push(d);
      }
      if (!thatSu.length) return;
      if (Object.keys(tam2).length) lai.tam = tam2; else delete lai.tam;
      ghiBang(lai, tepBang);
      console.log(`đã tự trả khoá file sau commit (${toi}): ${thatSu.join(" · ")}`);
    } finally { nhaKhoaBang(); }
    process.exit(EXIT.OK);
  }

  /* ---- --cua-index : CỬA gọi bởi hook `commit-msg` ----------------------
   *
   * Chỗ DUY NHẤT thấy đúng mẻ sắp vào commit. `--soat` là một LỆNH người nhớ gọi, và cửa sổ
   * nguy hiểm nằm SAU nó (KHUNG-59). Cửa này nằm trong chính `git commit`. */
  if (flag("cua-index")) {
    /* GỐC LÀ THỨ HOOK TRUYỀN VÀO, không phải đường dẫn của file này.
     *
     * ĐO ĐƯỢC 10/09, chính fixture của phép ghim lôi ra: `claim.mjs` suy gốc repo từ vị trí
     * module nó. Ở cây làm việc chính hai thứ đó trùng nhau nên không ai thấy. Nhưng hook chạy
     * với `GIT_INDEX_FILE` trỏ index TẠM của cây đang commit — đọc index đó bằng cây khác thì
     * git nổ `fatal: unable to read <oid>`, và cửa fail-closed sẽ CHẶN MỌI COMMIT.
     *
     * Chỗ này sẽ va thật ở `KHUNG-50`: một `git worktree` riêng có gốc khác gốc module. */
    const goc = typeof flag("goc") === "string" ? path.resolve(flag("goc")) : ROOT;
    const fileLoiNhan = flag("loi-nhan");

    /* MỘT BỘ ĐỌC NHÃN, KHÔNG HAI. Vòng audit 10/09: bản đầu để hook tự đọc bằng `sed
     * 's/^[Ll]ane:...'`, tức bộ đọc thứ hai cho một khái niệm đã có nhà (`laneFromMessage`, thứ
     * cổng đóng phiên và `safe-push` dùng). Hai bộ đọc lệch nhau ở ba chỗ: chữ thường `lane:`
     * (hook nhận, bộ kia không) · nhiều nhãn khác nhau (hook lấy cái đầu, bộ kia TỪ CHỐI) ·
     * nhãn có khoảng trắng (bộ kia từ chối). Nên viết được một lời nhắn lọt cửa dưới tên A rồi
     * được cổng quy cho tên B. Đúng luật mục 8: một khái niệm một nhà. */
    let khai = { lane: null, problem: null };
    if (typeof fileLoiNhan === "string") {
      try { khai = laneFromMessage(fs.readFileSync(fileLoiNhan, "utf8")); }
      catch (e) {
        console.error(`CUA_INDEX_KHONG_DOC_DUOC_LOI_NHAN: ${String(e.message).split(String.fromCharCode(10))[0]}`);
        process.exit(EXIT.REFUSED);
      }
    } else if (typeof as === "string") {
      khai = { lane: as, problem: null };            // đường gọi tay, để dựng lại ca hỏng
    }
    /* CÓ dòng `Lane:` mà KHÔNG dùng được (rỗng · có khoảng trắng · hai nhãn khác nhau) thì
       TỪ CHỐI, đừng cho qua. Cổng đóng phiên cũng sẽ đỏ, nhưng nó đỏ SAU khi commit đã hình
       thành — và cái commit đó đã cuốn việc lane khác vào lịch sử rồi. */
    if (khai.problem) {
      console.error(`CUA_INDEX_NHAN_KHONG_QUY_THUOC_DUOC: ${khai.problem}`);
      console.error("Cửa không biết bạn là ai thì không biết file nào của bạn. Sửa nhãn rồi commit lại.");
      process.exit(EXIT.REFUSED);
    }
    /* KHÔNG có nhãn nào: cửa này IM LẶNG, cố ý. Cửa đó là phép kiểm "Nhãn lane trong commit"
       của cổng và của `safe-push`; hai cửa canh một điều là hai câu trả lời cho một câu hỏi. */
    if (!khai.lane) process.exit(EXIT.OK);
    const toi = khai.lane;

    /* ĐỌC TÊN FILE BẰNG `-z`, và KHÔNG `trim`. Vòng audit 10/09: `--name-only` trần thì git
     * TRÍCH DẪN mọi đường dẫn có ký tự ngoài ASCII — `"docs/Ká»¹..."` — và tên đã
     * trích dẫn không khớp hàng nào trong bảng quyền, nên file CÓ CHỦ đọc thành VÔ CHỦ và cửa
     * cho qua. Repo này có sẵn một danh sách `grandfathered` toàn đường dẫn tiếng Việt có dấu,
     * nên đây không phải ca giả định. `trim()` thì làm mất khoảng trắng cuối tên. */
    const docIndex = (...them) => execFileSync("git", ["-c", "core.quotepath=false", "diff", "--cached", "--name-only", "-z", ...them],
      { cwd: goc, encoding: "utf8" }).split(String.fromCharCode(0)).filter(Boolean);
    let daDan = [];
    let mocSo = "HEAD";      // mẻ được đọc ra so với mốc nào — cửa tầng máy phải so số bản với ĐÚNG mốc đó
    try {
      daDan = docIndex();
      /* MẺ RỖNG mà commit vẫn đang hình thành = `--amend` (hoặc `--allow-empty`): index bằng
       * HEAD nên `diff --cached` không thấy gì. Vòng audit 10/09 nêu đúng đường lách này:
       * commit KHÔNG nhãn (cửa im lặng) → `git commit --amend` thêm nhãn của mình → mẻ rỗng →
       * cửa cho qua, và commit cuối mang tên tôi mà chứa việc lane khác. Nên soi lại NỘI DUNG
       * đang được đóng lại: so với HEAD^. */
      if (!daDan.length) {
        const coCha = (() => {
          try { execFileSync("git", ["rev-parse", "--verify", "HEAD^"], { cwd: goc, stdio: "ignore" }); return true; }
          catch { return false; }
        })();
        if (coCha) { daDan = docIndex("HEAD^"); mocSo = "HEAD^"; }
      }
    } catch (e) {
      /* FAIL-CLOSED. Không đọc được index thì không biết mình đang commit gì của ai — và đúng
         thứ mục này chữa là commit mù. Cửa ra là `git commit --no-verify`, thấy được, có chủ ý. */
      console.error(`CUA_INDEX_KHONG_DOC_DUOC: ${String(e.message).split(String.fromCharCode(10))[0]}`);
      process.exit(EXIT.REFUSED);
    }
    if (!daDan.length) process.exit(EXIT.OK);

    /* ---- CỬA TẦNG MÁY — T2 (10/09) ------------------------------------------
     *
     * Chặn: mẻ commit chạm TẦNG MÁY mà số phiên bản KHÔNG đổi. Đức nói đúng chỗ: *"luật cũng
     * cần kèm cơ chế hook, chứ không thì AI vẫn làm sai"* — hôm nay tôi vi phạm đúng điều này,
     * và suite bắt được SAU 11 PHÚT. Cửa này biết đúng mẻ sắp vào commit và trả lời trong ~0,2s.
     *
     * DÙNG CHÍNH BA HẰNG SỐ CỦA `fileMay`, không chép lại danh sách — vòng audit 10/09 bắt tôi
     * hai lần vì tự viết bản thứ hai của một thứ đã có nhà. Nạp động để `--sua`/`--xong` (chạy
     * liên tục) không phải trả 99 ms nạp module này.
     *
     * `template/` KHÔNG tính: nó là bản SINH RA từ tầng máy, không phải tầng máy.
     *
     * SO VỚI ĐÚNG MỐC MÀ MẺ ĐƯỢC ĐỌC RA. Nhánh `--amend` ở trên đọc mẻ so với `HEAD^`; so số bản
     * với `HEAD` trong ca đó là CHẶN OAN một bản đã cắt — và một cửa chặn oan là ai đó gõ
     * `--no-verify`, từ lúc đó nó không canh gì nữa.
     *
     * FAIL-OPEN khi không đọc được số bản, cố ý: repo không có `package.json` (hoặc đọc không ra
     * số) thì để cổng đóng phiên nói. Cửa này chỉ chặn ca nó CHẮC CHẮN. */
    cuaTangMay: {
      /* CỬA NÀY CHỈ CỦA NƠI PHÁT HÀNH — kiểm toán 10/09, và `core-contract` đỏ ngay lượt đầu.
       * `laTangMay` coi MỌI `.mjs` là tầng máy. Ở repo NHÀ điều đó đúng: `.mjs` của nó CHÍNH LÀ
       * nguồn của tầng máy. Ở repo ĐÍCH thì `.mjs` là mã CỦA HỌ, và đòi họ tăng số bản của bộ
       * khung là vô nghĩa — cửa này sẽ chặn MỌI commit của cả 5 repo đích.
       *
       * Repo đã có sẵn phép nhận biết cho đúng lớp bệnh này (`laNoiPhatHanh`, hai dấu hiệu và cả
       * hai CỐ Ý không đi theo bản trích), sinh ra sau một lần "luật của nơi phát hành lọt sang
       * repo đích". Dùng lại nó, đừng viết dấu hiệu thứ hai. */
      const { laNoiPhatHanh } = await import("./features.mjs");
      /* `break`, KHÔNG `process.exit` — và đây là chỗ tôi vừa suýt tắt cửa KHUNG-59 cho CẢ 5 REPO
       * ĐÍCH. Khối này nằm TRƯỚC phép kiểm quyền sở hữu index, nên `process.exit(OK)` ở đây làm
       * cửa thoát sạch và KHÔNG kiểm gì nữa ở mọi repo không phải nơi phát hành. Vế 3a — chính ca
       * hỏng KHUNG-59 — đỏ ngay và bắt được. Bỏ MỘT phép kiểm thì dùng `break`, đừng dùng lệnh
       * kết thúc cả tiến trình: hai thứ đó trông giống nhau và khác nhau ở đúng chỗ chết người. */
      if (!laNoiPhatHanh(goc)) break cuaTangMay;
      const { DUOI_MAY, TEP_MAY_THEM, TEP_CUA_REPO_DICH } = await import("./build-template.mjs");
      const laTangMay = (rel) => {
        const p = String(rel ?? "").replaceAll("\\", "/");
        if (!p || p.startsWith("template/")) return false;
        if (TEP_CUA_REPO_DICH.includes(p)) return false;
        return DUOI_MAY.some((d) => p.endsWith(d)) || TEP_MAY_THEM.includes(p);
      };
      const may = daDan.filter(laTangMay);
      if (may.length) {
        const soBan = (ref) => {
          try { return JSON.parse(execFileSync("git", ["show", `${ref}:package.json`], { cwd: goc, encoding: "utf8" })).version ?? null; }
          catch { return null; }
        };
        const banMoc = soBan(mocSo);
        const banIndex = soBan("");            // `git show :package.json` — bản trong INDEX
        if (typeof banMoc === "string" && typeof banIndex === "string" && banMoc === banIndex) {
          console.error(`CUA_TANG_MAY_CHUA_CAT_BAN: mẻ này chạm ${may.length} file TẦNG MÁY mà "version" vẫn là ${banMoc}.`);
          console.error(`  ${may.slice(0, 6).join(" · ")}${may.length > 6 ? ` · …+${may.length - 6}` : ""}`);
          console.error("Một số phiên bản trỏ tới HAI nội dung tầng máy thì nó không còn là mốc, và `upgrade.mjs`");
          console.error("sẽ phát hai thứ khác nhau dưới cùng một nhãn. Sửa: tăng \"version\" trong package.json,");
          console.error("chạy `npm run template`, rồi commit lại — hoặc `--no-verify` nếu bạn biết mình đang làm gì.");
          process.exit(EXIT.REFUSED);
        }
      }
    }

    try { parsed = readClaims(path.join(goc, ".agents", "claims.json")); }
    catch (e) { console.error(`CUA_INDEX_KHONG_DOC_DUOC_BANG: ${String(e.message).split(String.fromCharCode(10))[0]}`); process.exit(EXIT.REFUSED); }
    const cauTruc = readStructureFromDisk(goc);
    const tienTo = claimPrefixesFrom(cauTruc);
    const la = cuaIndex({
      daDan,
      tam: parsed.tam,
      claims: parsed.claims,
      as: toi,
      mienKhoa: MIEN_KHOA,
      maySinh: [...generatedFrom(cauTruc), ".agents/claims.json"],
      vungCua: (d) => vungBaoNgoai(d, cauTruc, tienTo),
    });
    if (!la.length) process.exit(EXIT.OK);
    console.error(`CUA_INDEX_CUON_VIEC_LANE_KHAC: commit dưới nhãn "${toi}" đang mang ${la.length} đường dẫn của lane khác.`);
    for (const x of la) {
      const chu = x.chuFile ? `file do "${x.chuFile}" khoá` : `vùng ${x.vung} do "${x.chuVung}" giữ`;
      console.error(`  ✗ ${x.duongDan} — ${chu}`);
    }
    console.error("");
    console.error("Một cây làm việc có ĐÚNG MỘT index, nên `git add` của họ nằm trong mẻ commit của bạn.");
    console.error("Cách xử: commit đúng phần của mình — git commit --only <đường dẫn của bạn>");
    console.error("Hoặc bỏ phần của họ ra: git restore --staged <đường dẫn ✗>  (KHÔNG xoá nội dung của họ)");
    process.exit(EXIT.REFUSED);
  }

  /* ---- --soat : file đã DÀN mà bạn không có quyền ghi -------------------
   *
   * Phải chạy TRƯỚC `git commit`, và nó không thay được cổng nào: cổng đóng phiên chạy lúc
   * index đã rỗng nên nó mù ở đúng chỗ này. Xem khối lý lẽ ở `soatDanHang`. */
  if (flag("soat")) {
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --soat --as <phiên>");
      process.exit(EXIT.MISUSE);
    }
    let daDan = [];
    try {
      /* `-z` và KHÔNG `trim` — cùng lớp bệnh vòng audit 10/09 nêu ở `--cua-index`: `--name-only`
         trần thì git TRÍCH DẪN đường dẫn ngoài ASCII, và tên đã trích dẫn không khớp hàng nào
         trong bảng quyền, nên file CÓ CHỦ đọc thành VÔ CHỦ. Vá cả hai cửa cùng lượt: để một cửa
         đọc kiểu này, cửa kia kiểu khác là dựng lại đúng chỗ vừa vá. */
      daDan = execFileSync("git", ["-c", "core.quotepath=false", "diff", "--cached", "--name-only", "-z"], { cwd: ROOT, encoding: "utf8" })
        .split(String.fromCharCode(0)).filter(Boolean);
    } catch (e) {
      console.error(`KHONG_DO_DUOC_INDEX: ${String(e.message).split(String.fromCharCode(10))[0]}`);
      process.exit(EXIT.REFUSED);
    }
    if (!daDan.length) {
      console.log("Chưa dàn file nào (`git add`). Không có gì để soát.");
      process.exit(EXIT.OK);
    }
    const cauTruc = readStructureFromDisk(ROOT);
    const tienTo = claimPrefixesFrom(cauTruc);
    const { la, soChung } = soatDanHang({
      daDan,
      tam: parsed.tam,
      claims: parsed.claims,
      as,
      mienKhoa: MIEN_KHOA,
      maySinh: [...generatedFrom(cauTruc), ".agents/claims.json"],
      vungCua: (d) => vungBaoNgoai(d, cauTruc, tienTo),
    });
    console.log(`đã dàn ${daDan.length} file · ${la.length} file bạn KHÔNG có quyền ghi · ${soChung.length} sổ dùng chung`);
    for (const x of la) {
      console.log(`  ✗ ${x.duongDan}`);
      console.log(`      vùng ${x.vung}${x.chuVung ? ` — do "${x.chuVung}" giữ` : " — vô chủ"}`
        + `${x.chuFile ? ` · file do "${x.chuFile}" khoá` : ""}`);
    }
    for (const d of soChung) {
      console.log(`  ~ ${d} — sổ MIỄN khoá: nhiều lane cùng ghi hợp lệ.`);
      console.log("      Soi lại phần bạn dàn: có đúng là CHỈ THÊM Ở CUỐI không? Sửa dòng cũ thì hoặc");
      console.log("      bạn phạm luật miễn khoá, hoặc bạn đang cuốn chữ của người khác.");
    }
    if (la.length) {
      console.log("");
      console.log("Cách xử: `git restore --staged <file>` cho những dòng ✗, hoặc nhận quyền rồi dàn lại:");
      console.log(`  node scripts/claim.mjs --sua ${la.map((x) => x.duongDan).join(" ")} --as ${as}`);
      process.exit(EXIT.REFUSED);
    }
    process.exit(EXIT.OK);
  }

  /* ---- --sua / --xong : khoá mức FILE ------------------------------------ */
  const suaCo = argv.includes("--sua");
  const xongCo = argv.includes("--xong");
  if (suaCo || xongCo) {
    if (typeof as !== "string") {
      console.error("Dùng: node scripts/claim.mjs --sua <đường-dẫn>… --as <phiên>");
      console.error("      node scripts/claim.mjs --xong <đường-dẫn>… --as <phiên>   (hoặc --xong --het)");
      process.exit(EXIT.MISUSE);
    }
    // Cả MẺ đường dẫn trong một lệnh: p90 ở repo này là 12 file một lượt sửa, nên bắt gọi 12
    // lệnh là bảo đảm luật "nhận ngay trước lượt ghi" quay về làm chữ.
    const co = argv.indexOf(suaCo ? "--sua" : "--xong");
    const ds = [];
    for (let i = co + 1; i < argv.length && !argv[i].startsWith("--"); i += 1) ds.push(argv[i]);
    const het = xongCo && argv.includes("--het");
    if (het) {
      for (const [d, o] of Object.entries(parsed.tam || {})) if (o?.owner === as) ds.push(d);
    }
    if (!ds.length) {
      console.error(het ? "Bạn không giữ khoá file nào." : "THIEU_DUONG_DAN: nêu ít nhất một đường dẫn.");
      process.exit(het ? EXIT.OK : EXIT.MISUSE);
    }

    const nhaKhoaBang = giuBangQuyen();
    parsed = readClaims();
    const cauTruc = readStructureFromDisk(ROOT);
    const tienTo = claimPrefixesFrom(cauTruc);
    const vungCua = (d) => vungBaoNgoai(d, cauTruc, tienTo);
    const maySinh = new Set([...generatedFrom(cauTruc), ".agents/claims.json"]);
    const laMaySinh = (d) => maySinh.has(d);
    const luc = new Date().toISOString();
    let tam = parsed.tam || {};
    for (const d of ds) {
      const kq = suaCo
        ? quyetDinhSua({ claims: parsed.claims, tam }, { duongDan: d, as, luc, vungCua, laMaySinh })
        : quyetDinhXong({ claims: parsed.claims, tam }, { duongDan: d, as });
      if (kq.code !== EXIT.OK) { nhaKhoaBang(); console.error(kq.message); process.exit(kq.code); }
      tam = kq.next;
    }
    /* KHỐI RỖNG THÌ XOÁ HẲN, không để `"tam": {}`. Bảng của repo chưa dùng khoá file phải giữ
       nguyên từng byte — một khối rỗng thừa là mọi lane khác thấy bảng đổi mà không hiểu vì sao. */
    if (Object.keys(tam).length) parsed.tam = tam; else delete parsed.tam;
    ghiBang(parsed);
    nhaKhoaBang();
    const boQua = suaCo ? ds.map(chuanDuongDan).filter(laMaySinh) : [];
    const ten = ds.map((d) => chuanDuongDan(d)).filter((d) => !boQua.includes(d)).join(" · ");
    if (boQua.length) console.log(`bỏ qua (artifact máy sinh, không đòi khoá nào): ${boQua.join(" · ")}`);
    if (ten) console.log(`${suaCo ? "đã khoá để sửa" : "đã trả"}: ${ten}${suaCo ? ` → ${as}` : ""}`);
    if (suaCo) console.log(`Trả NGAY sau khi ghi xong: node scripts/claim.mjs --xong --het --as ${as}`);
    /* BẬT CỬA INDEX Ở ĐÂY, không ở một lệnh riêng. `core.hooksPath` là cấu hình mỗi BẢN SAO nên
       không theo git được; một lệnh riêng thì bản sao mới nào cũng chạy phiên đầu mà cửa chưa
       bật — đúng chỗ KHUNG-59 nổ. `--sua` là lệnh MỌI lane phải chạy trước lượt ghi đầu tiên. */
    if (suaCo) {
      const cua = napCuaIndex();
      if (cua.trangThai === "vua-bat") console.log("đã bật CỬA INDEX cho bản sao này (core.hooksPath = .githooks).");
      if (cua.trangThai === "tro-noi-khac") {
        console.log(`⚠ core.hooksPath đang trỏ "${cua.dang}", KHÔNG phải .githooks — cửa index KHÔNG chạy.`);
        console.log("  Không tự đổi hộ: có thể là chủ ý của người khác. Cổng đóng phiên sẽ ĐỎ tới khi xử.");
      }
      if (cua.trangThai === "bat-khong-duoc") console.log(`⚠ không bật được cửa index: ${cua.loi}`);
    }
    process.exit(EXIT.OK);
  }

  const take = flag("take");
  const release = flag("release");
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

  /* KHOÁ THẬT, KHÔNG PHẢI ĐỌC-LẠI-KIỂM.
   *
   * Đọc → sửa → ghi → đọc lại KHÔNG đóng được cửa sổ đua: A và B cùng đọc thấy trống, A ghi rồi
   * đọc lại thấy A, B ghi rồi đọc lại thấy B — cả hai cùng thoát 0, cả hai cùng tin mình có
   * quyền, và người ghi trước mất việc mà không hề biết. Đọc-lại chỉ bắt được ca A đọc SAU khi
   * B đã ghi; nó bỏ lọt đúng ca hai bên xen kẽ khít nhau.
   *
   * `mkdir` là thao tác NGUYÊN TỬ trên mọi hệ điều hành: hai tiến trình cùng gọi thì đúng một
   * cái thành công. Đó là toàn bộ mẹo ở đây — không cần thư viện khoá.
   *
   * `ponytail: khoá cả file bảng quyền, không khoá từng vùng. Đủ cho vài phiên; tách khoá theo
   * vùng nếu sau này có hàng chục phiên cùng lúc.` */
  const nhaKhoaBang = giuBangQuyen();
  const nhaKhoa = nhaKhoaBang;
  // Đọc LẠI SAU KHI có khoá — bản đọc lúc chưa khoá có thể đã cũ.
  parsed = readClaims();

  /* MỐC CÓ GIỜ, không chỉ có ngày.
   *
   * Trước bản 1.3.20 đây là `.slice(0, 10)` — chỉ ngày. Với thứ duy nhất đọc nó lúc đó (bản đồ
   * việc, in "giữ N ngày") thì đủ. Với tín hiệu dấu vết thì KHÔNG: cả hai ca thật xảy ra trong
   * vòng 20 phút đầu của một lượt giữ, mà mốc chỉ-ngày làm mọi lượt trong ngày trông như nhận
   * lúc nửa đêm. `ageHours` vẫn đọc được mốc chỉ-ngày cũ, nên bảng đang có không phải sửa. */
  const today = new Date().toISOString();

  /* File sửa dở NẰM TRONG vùng sắp giành. Chỉ tính khi thật sự đi giành vùng người khác —
     `git status` trên repo lớn không rẻ, và nhận một vùng trống thì không có gì để canh. */
  const dangGianh = action === "take" && parsed.claims[key]?.owner && parsed.claims[key].owner !== as;
  let dirty = [];
  if (dangGianh) {
    try {
      const { stewardOf, claimPrefixesFrom, readStructureFromDisk } = await import("./repo-structure.mjs");
      const cauTruc = readStructureFromDisk(ROOT);
      const tienTo = claimPrefixesFrom(cauTruc);
      dirty = execFileSync("git", ["status", "--porcelain", "--untracked-files=all"], { cwd: ROOT, encoding: "utf8" })
        .split(String.fromCharCode(10)).filter(Boolean)
        .map((d) => d.slice(3).replace(/^"|"$/g, ""))
        /* HAI NHÓM KHÔNG TÍNH LÀ "VIỆC ĐANG DỞ CỦA NGƯỜI KHÁC":
         * · bảng quyền — lệnh này SẮP ghi nó, tính vào là tự chặn chính mình mãi mãi;
         * · artifact MÁY SINH — khối `generated` của `.repo-structure.json` khai rõ KHÔNG AI sở
         *   hữu chúng, vì nội dung tất định từ HEAD. Không có gì của ai trong đó để mất.
         *
         * Nhóm thứ hai là lỗ đo được 09/09, và là LẦN THỨ HAI cùng một hình dạng trong một ngày:
         * `--sua` cũng từng chặn oan đúng nhóm này. Ca thật — Đức chốt chuyển `_root`, lệnh TỪ
         * CHỐI vì `DASHBOARD-*.html` đang sửa dở, trong khi file đó là bảng do chính lệnh sinh
         * lại mỗi lượt. Ba cửa của một cơ chế (`--soat` · `--sua` · `--take`) phải nói CÙNG một
         * câu về cùng một file; hai cửa nói khác nhau là chỗ người ta thôi tin cả ba. */
        .filter((f) => f !== ".agents/claims.json" && !new Set(generatedFrom(cauTruc)).has(f))
        .filter((f) => stewardOf(f, cauTruc, tienTo) === key);
    } catch (e) {
      // Không đo được thì KHÔNG ĐƯỢC coi là "vùng sạch" — đó là fail-open, và giành vùng là
      // thao tác không lùi lại được.
      console.error(`KHONG_DO_DUOC_VIEC_DO: ${String(e.message).split(String.fromCharCode(10))[0]}`);
      console.error("Không biết vùng đó có file sửa dở hay không thì không được giành. Sửa lỗi trên rồi chạy lại.");
      process.exit(EXIT.REFUSED);
    }
  }

  /* Commit CHƯA ĐẨY chạm vùng sắp trả. `null` = không đo được, và không đo được thì KHÔNG chặn
     (xem lý lẽ ở `decide`). Chỉ đo lúc `--release`: `git log` trên repo lớn không rẻ. */
  let chuaDay = null;
  if (action === "release" && parsed.claims[key]?.owner === as) {
    try {
      const { stewardOf, claimPrefixesFrom, readStructureFromDisk } = await import("./repo-structure.mjs");
      const cauTruc = readStructureFromDisk(ROOT);
      const tienTo = claimPrefixesFrom(cauTruc);
      const xa = execFileSync("git", ["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{upstream}"], { cwd: ROOT, encoding: "utf8" }).trim();
      const ds = execFileSync("git", ["log", `${xa}..HEAD`, "--format=%x01%h %s", "--name-only"], { cwd: ROOT, encoding: "utf8" })
        .split(String.fromCharCode(1)).filter(Boolean);
      chuaDay = ds.filter((khoi) => {
        const [, ...file] = khoi.split(String.fromCharCode(10));
        return file.filter(Boolean).some((f) => f !== ".agents/claims.json" && stewardOf(f, cauTruc, tienTo) === key);
      }).map((khoi) => khoi.split(String.fromCharCode(10))[0].trim());
    } catch (_) {
      // Không có nhánh xa, git hỏng, repo mới clone — trả `null`, tức không chặn.
      chuaDay = null;
    }
  }

  /* CHIỀU HAI của luật chứa nhau: bên TRONG vùng sắp nhận còn khoá file của người khác.
   *
   * Chiều một (vùng có chủ khác → khoá file bị từ chối) nằm trong `quyetDinhSua`. Thiếu chiều
   * này thì lane A giữ khoá file `scripts/x.mjs`, lane B nhận cả `_code`, và **cả hai cùng tin
   * mình được ghi** — không lớp nào kêu. Đó là đúng cái tai nạn khoá vùng sinh ra để chặn, chỉ
   * nhỏ hơn một cấp. */
  if (action === "take") {
    let vuong = [];
    try {
      const cauTruc2 = readStructureFromDisk(ROOT);
      const tienTo2 = claimPrefixesFrom(cauTruc2);
      vuong = khoaFileTrongVung(parsed, key, as, (d) => vungBaoNgoai(d, cauTruc2, tienTo2));
    } catch (e) {
      // Không đọc được cấu trúc thì KHÔNG được coi là "trong vùng sạch" — fail-closed, vì nhận
      // cả vùng là thứ cho phép ghi đè lên việc đang dở của người khác.
      console.error(`KHONG_DO_DUOC_KHOA_FILE: ${String(e.message).split(String.fromCharCode(10))[0]}`);
      console.error("Không biết trong vùng còn ai đang khoá file hay không thì không được nhận cả vùng.");
      process.exit(EXIT.REFUSED);
    }
    if (vuong.length) {
      console.error(`TU_CHOI_NHAN_VUNG: trong "${key}" còn ${vuong.length} khoá mức FILE của phiên khác.`);
      for (const v of vuong) console.error(`  ${v.duongDan}  →  ${v.owner}`);
      console.error("Nhận cả vùng nghĩa là được ghi mọi file trong đó — chen vào giữa một lượt sửa đang dở.");
      console.error("Khoá file là loại giữ VÀI PHÚT. Đợi một nhịp rồi chạy lại.");
      process.exit(EXIT.REFUSED);
    }
  }

  const verdict = decide(parsed.claims, { action, key, as, today, ai: flag("ai"), ducDuyet: flag("duc-duyet"), dirty, chuaDay, duBiet: flag("du-biet") });
  if (verdict.code !== EXIT.OK) { console.error(verdict.message); process.exit(verdict.code); }

  parsed.claims[key] = typeof task === "string" ? { ...verdict.next, task } : verdict.next;
  ghiBang(parsed);

  // GHI RỒI ĐỌC LẠI. Không chặn được đua, nhưng không để nó âm thầm.
  const after = readClaims().claims[key];
  const muon = action === "take" ? as : null;
  if ((after.owner || null) !== muon) {
    console.error(`BI_GHI_DE: vừa ghi "${muon ?? "trống"}" cho "${key}", đọc lại thấy "${after.owner || "trống"}".`
      + "\nMột phiên khác ghi chen vào giữa. ĐỪNG chạy lại một cách máy móc — xem họ đang làm gì trước.");
    process.exit(EXIT.CLOBBERED);
  }

  const verb = action === "take" ? (verdict.giành ? `đã GIÀNH từ "${verdict.giành}"` : verdict.already ? "vẫn đang giữ" : "đã nhận") : "đã trả";
  console.log(`${verb}: ${key}${action === "take" ? ` → ${as}` : ""}`);
  if (verdict.next?.tra_khi_chua_day) {
    console.log(`⚠ Bạn vừa để lại ${verdict.next.tra_khi_chua_day.split(" · ")[0]} chưa đẩy ở vùng này, và đã trả khoá.`);
    console.log("  Lane TIẾP THEO sẽ KHÔNG đẩy được: safe-push từ chối vì nó cuốn theo commit của bạn.");
    console.log("  Chỉ Đức gỡ được (duyệt `--carry`). Nên báo Đức ngay, đừng để phiên sau tự đâm vào.");
  }
  process.exit(EXIT.OK);
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();

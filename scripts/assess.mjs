/* ĐO ĐỘ LỆCH — một repo bất kỳ cách bộ khung bao xa?
 *
 *   node scripts/assess.mjs <đường-dẫn-repo>     # báo cáo cho người đọc
 *   node scripts/assess.mjs <đường-dẫn-repo> --json
 *
 * Vì sao công cụ này trước, không phải quy trình migrate trước: migrate mù thì đắt, đo thì rẻ.
 * Chạy một lượt trên N repo là ra **bản đồ chi phí** — repo nào chỉ cần thả vài file, repo nào
 * cần người ngồi viết, repo nào không đáng động vào. Không có bản đồ đó thì không lên lịch được
 * việc nhiều repo; chỉ đoán.
 *
 * NGUỒN CHUẨN LÀ BỘ SINH, KHÔNG PHẢI MỘT DANH SÁCH CHÉP TAY. File này gọi thẳng
 * `buildTemplateFiles()`. Nếu bộ khung thêm hay bớt một file, phép đo đi theo ngay — không có
 * bản thứ hai để mà trôi. Đây là bài học đắt nhất của repo này: hai bản của cùng một sự thật
 * thì sớm muộn cũng lệch, và lúc lệch thì không ai biết tin bản nào.
 *
 * CHỈ ĐỌC. Không ghi một byte nào vào repo đích — kể cả `.gitignore`, kể cả thư mục tạm.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildTemplateFiles } from "./build-template.mjs";

const CR = String.fromCharCode(13);
const eol = (text) => text.split(CR).join("");

/* Ba tầng, và chúng được ĐỐI XỬ KHÁC NHAU khi chấm — đây là phần dễ làm sai nhất.
 *
 *   MÁY   phải KHỚP. Bộ máy lệch một dòng là hai repo cư xử khác nhau mà bảng vẫn đẹp.
 *   LUẬT  ĐƯỢC PHÉP lệch. Mỗi repo sửa luật cho nghề của mình; đòi khớp là đòi sai.
 *   TRẠNG chỉ cần CÓ. Nội dung là của riêng repo đó, so nội dung là vô nghĩa.
 *
 * Chấm cả ba theo một thước là ra một con số nghe hay mà không dùng được: một repo sửa đúng
 * luật của nó sẽ bị chấm "lệch nhiều" y như một repo có bộ máy hỏng. */
export const TANG = {
  MAY: "máy",
  LUAT: "luật",
  TRANG: "trạng thái"
};

export function tangCuaFile(rel) {
  if (rel.startsWith("scripts/") || rel.startsWith("tests/")) return TANG.MAY;
  // `package.json` KHÔNG thuộc tầng MÁY dù bộ khung có mang một bản. Mọi repo thật đều có
  // package.json của riêng nó với hàng chục lệnh khác; đòi khớp từng byte là báo nợ oan cho
  // đúng 100% repo. Đo được ngay lần chạy đầu trên chính repo này. Thứ THẬT SỰ đáng đo ở đó
  // là một điều duy nhất — có khai `scripts.test` không — và nó được kiểm riêng bên dưới.
  if (rel === "package.json") return TANG.TRANG;
  if (rel === "HANDOFF.md" || rel === "STATUS.md" || rel === ".agents/claims.json") return TANG.TRANG;
  return TANG.LUAT;
}

/* Phụ lục nghề là VÍ DỤ, không phải yêu cầu. Bộ khung mang sẵn một cái có thật để chứng minh
   cơ chế chạy được, và hướng dẫn nói thẳng: repo không làm nghề đó thì XOÁ file đi. Đếm nó
   thành nợ là bắt mọi repo mang luật của một nghề nó không làm — đúng cái bệnh mà việc tách
   phụ lục sinh ra để chữa. */
export const TUY_CHON = new Set(["docs/ANNEX-tu-dong-hoa-trinh-duyet.md"]);

/* Cổng đóng phiên hỏi `package.json.scripts.test`. Không khai thì `hasRootTestScript()` trả
   false VĨNH VIỄN và cổng không chạy một dòng test nào — xanh, im, vô dụng. Đây là lỗi nặng
   nhất từng tìm thấy trong bộ khung, nên nó có phép đo riêng thay vì trốn trong một con số. */
export function coLenhTest(root) {
  const raw = docNeuCo(root, "package.json");
  if (raw === null) return null;
  try {
    return Boolean(JSON.parse(raw)?.scripts?.test);
  } catch (_) {
    return false;
  }
}

/* Đọc một file của repo đích. Trả null nếu không có — KHÔNG ném, vì "không có" chính là kết quả
   đo, không phải lỗi. */
function docNeuCo(root, rel) {
  try {
    return fs.readFileSync(path.join(root, ...rel.split("/")), "utf8");
  } catch (_) {
    return null;
  }
}

export function danhGia(root, chuan) {
  const dong = [];
  for (const [rel, mongDoi] of chuan) {
    const thuc = docNeuCo(root, rel);
    const tang = tangCuaFile(rel);
    let trangThai;
    if (thuc === null) trangThai = "THIẾU";
    else if (eol(thuc) === eol(mongDoi)) trangThai = "KHỚP";
    else trangThai = "LỆCH";
    dong.push({ file: rel, tang, trangThai, tuyChon: TUY_CHON.has(rel) });
  }
  return dong;
}

/* Chi phí, và cố ý KHÔNG quy về một con số duy nhất.
 *
 * "Repo này 72% đạt chuẩn" nghe gọn nhưng không ai hành động được: 72% có thể là thiếu vài bản
 * mẫu (nửa giờ) hoặc thiếu cả bộ máy (một buổi). Ba con số dưới đây tương ứng ba loại việc thật
 * khác nhau về giá:
 *
 *   thả    — chép file vào là xong, không cần nghĩ (chủ yếu tầng MÁY và bản mẫu)
 *   viết   — người phải ngồi viết nội dung của riêng repo đó (luật, trạng thái)
 *   soi    — có sẵn nhưng lệch bản chuẩn; phải mở ra đọc mới biết là cố ý hay bỏ quên
 */
export function chiPhi(dong) {
  const batBuoc = dong.filter((d) => !d.tuyChon);
  const tha = batBuoc.filter((d) => d.trangThai === "THIẾU" && d.tang === TANG.MAY).length;
  const viet = batBuoc.filter((d) => d.trangThai === "THIẾU" && d.tang !== TANG.MAY).length;
  const soi = dong.filter((d) => d.trangThai === "LỆCH" && d.tang === TANG.MAY).length;
  return { tha, viet, soi };
}

/* Bốn mức, đo bằng thứ repo THẬT SỰ CÓ, không bằng thứ nó tự khai.
 *
 * Mức không phải điểm số — nó trả lời "bước kế tiếp là gì". Một repo mức 1 và một repo mức 3
 * cần hai việc hoàn toàn khác nhau, và trộn chúng vào một thang phần trăm là mất đúng thông tin
 * đó. */
export function mucDo(dong) {
  const co = (rel) => dong.find((d) => d.file === rel)?.trangThai !== "THIẾU";
  // CHỈ `scripts/` — không tính `tests/`. Bản đầu gộp cả hai vào "bộ máy đầy đủ", nên một repo
  // có đủ năm công cụ mà thiếu suite bị chấm mức 1 ("chưa có bộ máy") thay vì mức 2 ("có bộ
  // máy, chưa có lưới đỡ"). Hai ca đó cần hai việc khác hẳn nhau về giá, và gộp lại là làm mất
  // đúng thông tin công cụ này sinh ra để cung cấp. Phép kiểm bắt được, 03/09.
  const mayDayDu = dong
    .filter((d) => d.tang === TANG.MAY && d.file.startsWith("scripts/"))
    .every((d) => d.trangThai !== "THIẾU");
  if (!co(".repo-structure.json") && !co("AGENTS.md")) {
    return { muc: 0, ten: "chưa có gì", ke: "Thả bộ khung vào, sửa tên repo trong cấu hình, chạy cổng lần đầu." };
  }
  if (!mayDayDu) {
    return { muc: 1, ten: "có luật, chưa có bộ máy", ke: "Thả nhóm MÁY vào — không cần nghĩ, chép là chạy." };
  }
  if (!co("tests/harness-smoke.mjs")) {
    return { muc: 2, ten: "có bộ máy, chưa có lưới đỡ", ke: "Thêm suite hạt giống và khai `scripts.test`, kẻo cổng không bao giờ chạy gì." };
  }
  return { muc: 3, ten: "đủ bộ", ke: "Chạy cổng kiểm; còn đỏ thì sửa theo đúng lời nó nói." };
}

/* ---- chạy ------------------------------------------------------------------ */

function inBaoCao(root, dong, json) {
  const cp = chiPhi(dong);
  const m = mucDo(dong);
  const lenhTest = coLenhTest(root);
  if (json) {
    console.log(JSON.stringify({ repo: root, muc: m.muc, ten_muc: m.ten, viec_ke: m.ke, chi_phi: cp, co_lenh_test: lenhTest, files: dong }, null, 2));
    return;
  }
  const NL = String.fromCharCode(10);
  const thieu = dong.filter((d) => d.trangThai === "THIẾU");
  const lech = dong.filter((d) => d.trangThai === "LỆCH" && d.tang === TANG.MAY);
  const khop = dong.filter((d) => d.trangThai === "KHỚP").length;

  console.log(`${NL}ĐO ĐỘ LỆCH — ${root}`);
  console.log(`${NL}  MỨC ${m.muc}/3 — ${m.ten}`);
  console.log(`  Việc kế: ${m.ke}${NL}`);
  console.log(`  ${khop}/${dong.length} file khớp bản chuẩn`);
  console.log(`  Chi phí: thả ${cp.tha} file · viết ${cp.viet} file · soi lại ${cp.soi} file`);
  // In RIÊNG, không gộp vào ba con số trên. Thiếu `scripts.test` không phải "thiếu một file" —
  // nó làm cổng đóng phiên câm trong khi vẫn báo xanh, và một dòng như thế đáng đứng một mình.
  if (lenhTest === null) console.log(`  ⚠ KHÔNG CÓ package.json — cổng đóng phiên sẽ không chạy được test nào.${NL}`);
  else if (!lenhTest) console.log(`  ⚠ package.json KHÔNG khai \`scripts.test\` — cổng sẽ báo xanh mà không chạy một dòng test nào.${NL}`);
  else console.log(`  ✓ package.json có khai \`scripts.test\` — cổng chạy được suite của repo.${NL}`);

  if (thieu.length) {
    console.log("  THIẾU:");
    for (const d of thieu) console.log(`    [${d.tang}] ${d.file}${d.tuyChon ? "   (tuỳ chọn — không tính là nợ)" : ""}`);
    console.log("");
  }
  if (lech.length) {
    // Chỉ kể tầng MÁY. Luật lệch là chuyện bình thường và đúng — kể ra chỉ làm nhiễu.
    console.log("  LỆCH BẢN CHUẨN (tầng máy — mở ra đọc, lệch ở đây thường là bỏ quên chứ không cố ý):");
    for (const d of lech) console.log(`    ${d.file}`);
    console.log("");
  }
  console.log(`  Luật lệch bản chuẩn KHÔNG được kể ở trên: mỗi repo sửa luật cho nghề của mình,${NL}  nên lệch ở tầng luật là đúng, không phải nợ.${NL}`);
}

const THIS = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS)) {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const target = args.find((a) => !a.startsWith("--"));
  if (!target) {
    console.error("Dùng: node scripts/assess.mjs <đường-dẫn-repo> [--json]");
    process.exit(2);
  }
  const root = path.resolve(target);
  if (!fs.existsSync(root)) {
    console.error(`Không thấy thư mục: ${root}`);
    process.exit(2);
  }
  inBaoCao(root, danhGia(root, buildTemplateFiles()), json);
}

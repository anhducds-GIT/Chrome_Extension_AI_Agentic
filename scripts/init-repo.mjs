/* KHỞI TẠO MỘT REPO MỚI TỪ BỘ KHUNG.
 *
 *   node scripts/init-repo.mjs <thư-mục-đích> --ten "Tên repo của bạn"
 *   node scripts/init-repo.mjs <thư-mục-đích> --ten "..." --kho-nghe   # giữ phụ lục nghề mẫu
 *
 * Vì sao có file này: hướng dẫn của bộ khung mô tả sáu bước, đúng thứ tự, và **thứ tự sai đã
 * làm hỏng một lượt thử thật** — chạy bộ sinh trước khi commit là dựng lại từ HEAD cũ. Một
 * danh sách sáu bước mà thứ tự quan trọng thì sớm muộn cũng có người làm lệch. Máy thì không.
 *
 * KHÔNG GHI ĐÈ. Thư mục đích phải trống hoặc chưa tồn tại. Đây là fail-closed có chủ đích:
 * lệnh này tạo ra một repo, và một lệnh tạo-mới lỡ tay chạy trong thư mục đang có việc thì
 * không lùi lại được.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildTemplateFiles } from "./build-template.mjs";

const NL = String.fromCharCode(10);

/* Bộ khung mang sẵn một phụ lục nghề CÓ THẬT (tự động hoá trình duyệt) để chứng minh cơ chế
   chạy được. Repo mới gần như chắc chắn làm nghề khác, và giữ lại một phụ lục sai nghề còn tệ
   hơn không có: nó dạy phiên AI sau tuân luật cho việc repo này không làm. Nên mặc định là BỎ,
   và giữ phải nói rõ ý muốn. */
const PHU_LUC_MAU = "docs/ANNEX-tu-dong-hoa-trinh-duyet.md";

export function doiTenRepo(cauHinhJson, ten) {
  const j = JSON.parse(cauHinhJson);
  j.repo.name = ten;
  return JSON.stringify(j, null, 2) + NL;
}

export function boPhuLucKhoiBanDo(luat) {
  // Xoá file mà để lại dòng trỏ tới nó là tự tạo một liên kết chết ngay ở phiên đầu tiên, và
  // cổng kiểm điều hướng sẽ báo vàng đúng ở repo vừa dựng — ấn tượng đầu tiên tệ nhất có thể.
  return luat.split(NL).filter((d) => !d.includes(PHU_LUC_MAU)).join(NL);
}

export function chuanBiFiles(chuan, { ten, giuPhuLucNghe }) {
  const ra = new Map();
  for (const [rel, noiDung] of chuan) {
    if (rel === PHU_LUC_MAU && !giuPhuLucNghe) continue;
    if (rel === ".repo-structure.json") { ra.set(rel, doiTenRepo(noiDung, ten)); continue; }
    if (rel === "AGENTS.md" && !giuPhuLucNghe) { ra.set(rel, boPhuLucKhoiBanDo(noiDung)); continue; }
    ra.set(rel, noiDung);
  }
  return ra;
}

function thuMucTrong(dich) {
  if (!fs.existsSync(dich)) return true;
  return fs.readdirSync(dich).length === 0;
}

/* ---- chạy ------------------------------------------------------------------ */

const THIS = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS)) {
  const args = process.argv.slice(2);
  const dich = args.find((a) => !a.startsWith("--"));
  const ten = args[args.indexOf("--ten") + 1];
  const giuPhuLucNghe = args.includes("--kho-nghe");

  if (!dich || !args.includes("--ten") || !ten || ten.startsWith("--")) {
    console.error('Dùng: node scripts/init-repo.mjs <thư-mục-đích> --ten "Tên repo của bạn" [--kho-nghe]');
    process.exit(2);
  }
  const root = path.resolve(dich);
  if (!thuMucTrong(root)) {
    console.error(`${NL}TU_CHOI: "${root}" đã có nội dung.`);
    console.error("Lệnh này TẠO một repo mới nên nó không bao giờ ghi đè — chạy nhầm chỗ thì không lùi được.");
    console.error("Muốn đưa một repo ĐANG CÓ lên chuẩn thì đo trước: node scripts/assess.mjs <đường-dẫn>");
    process.exit(1);
  }

  const files = chuanBiFiles(buildTemplateFiles(), { ten, giuPhuLucNghe });
  for (const [rel, noiDung] of files) {
    const abs = path.join(root, ...rel.split("/"));
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.writeFileSync(abs, noiDung, "utf8");
  }

  const at = (cmd, cmdArgs) => execFileSync(cmd, cmdArgs, { cwd: root, encoding: "utf8" });
  const git = (...a) => at("git", ["-c", "core.quotepath=false", ...a]);

  git("init", "-q", "-b", "main");
  git("add", "-A");
  git("commit", "-q", "-m", "khoi tao tu bo khung");

  // THỨ TỰ QUAN TRỌNG: bộ sinh đọc hoàn toàn từ HEAD, nên phải commit nguồn TRƯỚC rồi mới sinh.
  // Sinh trước là dựng lại từ một HEAD chưa có gì — đúng lỗi đã làm hỏng một lượt thử thật.
  at(process.execPath, [path.join(root, "scripts", "build-dashboard.mjs")]);
  git("add", "-A");
  git("commit", "-q", "-m", "sinh trang lan dau");

  let bootstrap = "";
  let sach = true;
  try {
    bootstrap = at(process.execPath, [path.join(root, "scripts", "check-bootstrap.mjs")]);
  } catch (error) {
    bootstrap = String(error.stdout || "") + String(error.stderr || "");
    sach = false;
  }
  const tongKet = bootstrap.split(NL).find((d) => d.startsWith("TỔNG:")) || "(không đọc được dòng tổng kết)";

  console.log(`${NL}ĐÃ DỰNG REPO — ${root}`);
  console.log(`${NL}  tên repo    : ${ten}`);
  console.log(`  file         : ${files.size}`);
  console.log(`  phụ lục nghề : ${giuPhuLucNghe ? "GIỮ bản mẫu (tự động hoá trình duyệt)" : "bỏ — viết cái của bạn theo docs/_TEMPLATE-annex.md"}`);
  console.log(`  cổng cấu trúc: ${tongKet}${NL}`);
  console.log("  Ba việc kế tiếp, theo đúng thứ tự:");
  console.log("    1. Sửa mục 6 của AGENTS.md — bản đồ file của RIÊNG repo bạn");
  console.log("    2. Khai `units` và `areas` trong .repo-structure.json cho khớp hình dạng repo");
  console.log(`    3. Thêm test của bạn vào tests/ — suite hạt giống chỉ kiểm chính bộ khung${NL}`);
  process.exit(sach ? 0 : 1);
}

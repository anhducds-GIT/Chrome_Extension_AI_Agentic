#!/usr/bin/env node
/* NGHIỆM THU ARTIFACT MÁY SINH — thân của pilot "CC chỉ điều phối".
 * Xem `drafts/PILOT-DIEU-PHOI-V0.md`.
 *
 * Repo có luật: artifact máy sinh phải sinh lại được Y HỆT. Chưa ai chạy kiểm điều đó một lượt
 * cho tất cả. Script này chạy từng bộ sinh rồi hỏi: có tệp nào ĐỔI BYTE không.
 *
 * Nó phải TỰ ĐÓNG VÒNG: chạy tới cùng, không hỏi ai, và kết bằng đúng một dòng `DAT` hoặc
 * `KHONG DAT: …`. Người điều phối chỉ đọc dòng cuối — đó là toàn bộ điểm của pilot.
 *
 * KHÔNG hardcode đường ra của từng bộ sinh: đo bằng cách chụp `git status` trước và sau, rồi
 * so băm. Đoán đường ra là chỗ dễ sai và sai lặng lẽ — bộ sinh đổi chỗ ghi thì phép kiểm vẫn
 * xanh mà không kiểm gì.
 *
 * KHÔNG khôi phục gì. Tệp đổi byte chính là BẰNG CHỨNG, để nguyên cho người xem. `git checkout`
 * ở đây từng xoá mất việc chưa commit của lane khác.
 *
 * Dùng:  node scripts/nghiem-thu-artifact.mjs [--chi <tên,tên>] [--json]
 */
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GOC = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

/* Sửa danh sách này khi thêm bộ sinh. Thứ tự giữ nguyên: `build-dashboard` và `feature-parity`
   đọc HEAD nên chạy sau các bộ đọc cây làm việc. */
const BO_SINH = [
  { ten: "overview", lenh: ["scripts/build-overview.mjs"] },
  { ten: "rule-compile", lenh: ["scripts/rule-compile.mjs"] },
  { ten: "dashboard", lenh: ["scripts/build-dashboard.mjs"] },
  { ten: "parity", lenh: ["scripts/feature-parity.mjs"] }
];

const git = (...a) => execFileSync("git", a, { cwd: GOC, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

/** Băm của mọi tệp git đang thấy là bẩn. Tệp sạch không có mặt — và không cần: nếu bộ sinh
 *  ghi ra đúng bytes cũ thì nó vẫn sạch, đó chính là ĐẠT. */
function chup() {
  const m = new Map();
  for (const dong of git("status", "--porcelain", "-z").split("\0")) {
    if (!dong) continue;
    const duong = dong.slice(3);
    if (!duong || duong.endsWith("/")) continue;
    let bam = "(khong-doc-duoc)";
    try { bam = git("hash-object", "--", duong).trim(); } catch { bam = "(mat)"; }
    m.set(duong, bam);
  }
  return m;
}

function main() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--chi");
  const loc = i >= 0 && argv[i + 1] ? new Set(argv[i + 1].split(",")) : null;
  const chay = BO_SINH.filter((b) => !loc || loc.has(b.ten));
  if (!chay.length) { console.log("KHONG DAT: --chi không khớp bộ sinh nào"); process.exit(2); }

  /* HAI LƯỢT, VÌ ĐÂY LÀ HAI CÂU HỎI KHÁC NHAU. Bản đầu chạy một lượt và chấm KHÔNG ĐẠT với 4
     tệp — nhưng lượt hai lại sạch trơn. Nghĩa là bộ sinh **không** hỏng; artifact chỉ **cũ**,
     vì cả ngày có commit mà chưa ai sinh lại. Gộp hai chuyện đó vào một phán quyết là báo
     động giả, và báo động giả thì lần sau không ai tin nữa.
       lượt ⑴ đổi  = artifact ĐÃ CŨ  → sinh lại rồi, đi commit
       lượt ⑵ đổi  = bộ sinh KHÔNG TẤT ĐỊNH → lỗi thật, phải sửa mã */
  const hong = [];
  const chayHet = () => {
    for (const b of chay) {
      try {
        execFileSync("node", b.lenh, { cwd: GOC, encoding: "utf8", stdio: "pipe", maxBuffer: 64 * 1024 * 1024 });
      } catch (e) {
        hong.push({ ten: b.ten, ma: e.status ?? "?", loi: String(e.stderr || e.stdout || "").trim().split("\n").slice(-2).join(" | ") });
      }
    }
  };
  const soSanh = (truoc, sau) => {
    const ra = [];
    for (const [duong, bam] of sau) {
      const cu = truoc.get(duong);
      if (cu === undefined) ra.push({ duong, vi: "sạch trước, bẩn sau" });
      else if (cu !== bam) ra.push({ duong, vi: "bẩn từ trước nhưng đổi byte" });
    }
    for (const duong of truoc.keys()) if (!sau.has(duong)) ra.push({ duong, vi: "bẩn trước, sạch sau" });
    return ra;
  };

  const moc0 = chup();
  chayHet();
  const moc1 = chup();
  chayHet();
  const moc2 = chup();

  const cu = soSanh(moc0, moc1);
  const khongTatDinh = soSanh(moc1, moc2);

  if (argv.includes("--json")) {
    console.log(JSON.stringify({ daChay: chay.map((b) => b.ten), hong, cu, khongTatDinh }, null, 1));
  } else {
    console.log(`  đã chạy 2 lượt: ${chay.map((b) => b.ten).join(" · ")}`);
    for (const d of cu) console.log(`  CŨ            ${d.duong}  — ${d.vi}`);
    for (const d of khongTatDinh) console.log(`  KHÔNG TẤT ĐỊNH ${d.duong}  — ${d.vi}`);
  }

  if (hong.length) {
    console.log(`KHONG DAT: ${hong.length} lượt chạy bộ sinh hỏng — ${hong.map((h) => `${h.ten}(${h.ma})`).join(" ")}`);
    process.exit(1);
  }
  if (khongTatDinh.length) {
    console.log(`KHONG DAT: ${khongTatDinh.length} tệp đổi byte giữa hai lượt sinh liên tiếp — bộ sinh không tất định: ${khongTatDinh.map((d) => d.duong).join(" ")}`);
    process.exit(1);
  }
  if (cu.length) {
    console.log(`DAT (bộ sinh tất định) — nhưng ${cu.length} artifact đã CŨ và vừa được sinh lại, đi commit: ${cu.map((d) => d.duong).join(" ")}`);
    process.exit(0);
  }
  console.log(`DAT: ${chay.length} bộ sinh tất định, artifact đã đúng với cây làm việc`);
}

main();

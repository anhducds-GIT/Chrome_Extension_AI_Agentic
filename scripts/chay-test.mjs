/* CHẠY SUITE — song song, và để lại một DẤU XÁC NHẬN cho cổng đóng phiên.
 *
 * VÌ SAO CÓ FILE NÀY. Đo ngày 2026-09-08, tuần tự, mỗi bước một lượt:
 *
 *     bộ khung   535s / 19 bước — 5 bước đầu chiếm 84% (194s · 79s · 66s · 56s · 54s)
 *     repo kia   242s / 16 bước — 1 bước chiếm 30%
 *
 * Và cổng đóng phiên **chạy lại toàn bộ chuỗi đó** (`session-check.mjs`, phép kiểm "Test xanh"
 * gọi `npm test`). Nên một vòng làm việc bình thường — chạy suite, rồi chạy cổng — tốn
 * **535 + 535 ≈ 18 phút**, và nửa sau không kiểm thêm được điều gì mà nửa đầu chưa kiểm.
 *
 * Hai chỗ phí, hai cách chữa, và KHÔNG cách nào gỡ một khẳng định nào:
 *
 *   ⑴ CHẠY SONG SONG. Mỗi suite nặng tự dựng repo riêng trong thư mục tạm, nên chúng độc lập.
 *      Chạy tuần tự là tự nguyện xếp hàng.
 *   ⑵ DẤU XÁC NHẬN. Chạy xong ghi lại: HEAD nào · cây làm việc nào · chuỗi lệnh nào · lúc nào.
 *      Cổng đọc dấu đó; **khớp cả ba** thì không chạy lại. Lệch một thứ thì chạy lại như cũ.
 *
 * DẤU NÀY KHÔNG PHẢI CỬA SAU, và đây là chỗ dễ hiểu sai nhất:
 *
 *   · Nó buộc vào **HEAD** + **băm của `git status --porcelain -uall`**. Sửa một byte trong bất
 *     kỳ file nào — kể cả file chưa track — là dấu hết hiệu lực. Không có đường nào để một cây
 *     làm việc CHƯA từng chạy suite mà lại có dấu hợp lệ.
 *   · Nó có **hạn dùng** (mặc định 30 phút). Không phải vì cây làm việc đổi được mà băm không
 *     thấy, mà vì một dấu để lâu là một dấu không ai còn nhớ nó nói về cái gì.
 *   · Nó **không được commit** (`.gitignore`), nên không đi theo repo và không ai "mượn" được
 *     dấu của máy khác.
 *   · Suite ĐỎ thì **xoá dấu**, không ghi dấu đỏ. Một dấu chỉ có một nghĩa: cây này đã xanh.
 *
 * ĐỎ GIẢ DO TRANH CHẤP — chữa ngay trong công cụ, không để người đoán. Chạy song song trong một
 * cây git làm hai tiến trình tranh `index.lock`, và suite hỏng vì thế báo ra một *lỗi nội dung*
 * trông y hệt lỗi thật (đã trả giá thật ngày 07/09). Nên: suite nào đỏ thì **tự chạy lại MỘT
 * MÌNH**; chỉ cái nào đỏ cả khi chạy một mình mới được coi là đỏ. Suite nào đọc git của cây làm
 * việc CHÍNH thì khai vào `test.serial` để nó không bao giờ chạy song song.
 *
 * Dùng:
 *   node scripts/chay-test.mjs              chạy tất cả, song song, rồi ghi dấu
 *   node scripts/chay-test.mjs --tuan-tu    ép tuần tự (để so, hoặc khi nghi tranh chấp)
 *   node scripts/chay-test.mjs --chi <chuỗi>  chỉ chạy suite có tên chứa <chuỗi>, KHÔNG ghi dấu
 */
import { execFileSync, spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");
export const TEN_DAU = ".ark-suite-stamp.json";
export const HAN_MAC_DINH_PHUT = 30;

/* ---- dấu xác nhận ---------------------------------------------------------- */

/** Trạng thái cây làm việc, gói thành một chuỗi. HEAD + mọi thay đổi chưa commit. */
export function dauCay(root = ROOT) {
  const git = (...a) => execFileSync("git", a, { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const head = git("rev-parse", "HEAD").trim();
  // `-uall` để một FILE mới trong thư mục mới cũng hiện ra. Mặc định git co cả thư mục thành
  // một dòng, và khi đó thêm một file test mới KHÔNG đổi băm — dấu sẽ còn hiệu lực sai.
  const ban = git("status", "--porcelain", "-uall");
  return { head, bam: crypto.createHash("sha256").update(ban).digest("hex").slice(0, 32) };
}

/** Môi trường chạy. Đổi bản Node là suite chưa từng chạy trên bản đó. */
export function moiTruongNay() {
  return `${process.version} ${process.platform} ${process.arch}`;
}

/** Chuỗi lệnh đang khai — đổi danh sách suite là dấu cũ hết hiệu lực. */
export function bamLenh(danhSach) {
  return crypto.createHash("sha256").update(danhSach.join(String.fromCharCode(31))).digest("hex").slice(0, 32);
}

/** Dấu còn dùng được không. Trả `{ dung, vi_sao }` — luôn nói VÌ SAO, kể cả khi được. */
export function xetDau(dau, { head, bam }, lenh, { phut = HAN_MAC_DINH_PHUT, now = Date.now(), moiTruong = moiTruongNay() } = {}) {
  if (!dau || typeof dau !== "object") return { dung: false, vi_sao: "chưa có dấu nào" };
  if (dau.ok !== true) return { dung: false, vi_sao: "dấu ghi lượt chạy KHÔNG xanh" };
  /* MÔI TRƯỜNG, không chỉ mã nguồn. Chỗ này do phiên Codex bắt được khi chấm chéo 08/09, và nó
     đúng: *"đừng tin một cache chỉ dựa vào HEAD — HEAD bỏ sót file bẩn, phụ thuộc, môi trường."*
     File bẩn thì `git status --porcelain -uall` đã che. Môi trường thì KHÔNG: đổi phiên bản Node
     rồi chạy cổng là suite chưa từng chạy trên bản Node đó, mà dấu vẫn hợp lệ.
     Còn một khe CỐ Ý để ngỏ, ghi ra để không ai tưởng nó kín: thư mục bị `.gitignore`
     (`node_modules/`) không nằm trong băm. Khai báo phụ thuộc thì có — `package-lock.json` là
     file được track nên HEAD ghim nội dung nó và porcelain bắt mọi sai lệch. Chỉ lượt SỬA TAY
     trong `node_modules` là lọt, và hạn 30 phút là thứ chặn nó. */
  if (dau.moi_truong !== moiTruong) {
    return { dung: false, vi_sao: `dấu chạy trên môi trường "${dau.moi_truong ?? "không ghi"}", nay là "${moiTruong}"` };
  }
  if (dau.head !== head) return { dung: false, vi_sao: `dấu thuộc HEAD ${String(dau.head).slice(0, 8)}, nay là ${head.slice(0, 8)}` };
  if (dau.bam !== bam) return { dung: false, vi_sao: "cây làm việc đã đổi kể từ lượt chạy đó" };
  if (dau.lenh !== lenh) return { dung: false, vi_sao: "danh sách suite đã đổi kể từ lượt chạy đó" };
  const tuoi = (now - Date.parse(dau.luc)) / 60000;
  if (!Number.isFinite(tuoi) || tuoi < 0) return { dung: false, vi_sao: "mốc thời gian trong dấu không đọc được" };
  if (tuoi > phut) return { dung: false, vi_sao: `dấu đã ${Math.round(tuoi)} phút, quá hạn ${phut} phút` };
  return { dung: true, vi_sao: `suite đã xanh ${Math.round(tuoi)} phút trước, cùng HEAD ${head.slice(0, 8)} và cùng cây làm việc` };
}

export function docDau(root = ROOT) {
  try { return JSON.parse(fs.readFileSync(path.join(root, TEN_DAU), "utf8")); } catch { return null; }
}

export function ghiDau(root, data) {
  fs.writeFileSync(path.join(root, TEN_DAU), `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function xoaDau(root = ROOT) {
  try { fs.rmSync(path.join(root, TEN_DAU), { force: true }); } catch { /* không có thì thôi */ }
}

/* ---- danh sách suite ------------------------------------------------------- */

/** Đọc chuỗi suite từ `package.json`. Mỗi phần tử là một lệnh `node …`. */
export function danhSachSuite(root = ROOT) {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  const chuoi = String(pkg.scripts?.["test:tuan-tu"] ?? pkg.scripts?.test ?? "");
  return chuoi.split("&&").map((s) => s.trim()).filter(Boolean)
    // Bỏ chính lệnh này ra, nếu ai đó khai nó vào chuỗi — chạy đệ quy là treo máy.
    .filter((s) => !s.includes("chay-test.mjs"));
}

/** Suite nào PHẢI chạy một mình. Khai ở `test.serial` của `.repo-structure.json`. */
export function danhSachTuanTu(root = ROOT) {
  try {
    const ct = JSON.parse(fs.readFileSync(path.join(root, ".repo-structure.json"), "utf8"));
    const ds = ct?.test?.serial;
    return Array.isArray(ds) ? ds.filter((s) => typeof s === "string" && s) : [];
  } catch { return []; }
}

/** Suite nào RỖNG hoặc KHÔNG KHẲNG ĐỊNH GÌ. Trả danh sách đường dẫn đáng ngờ.
 *
 * VÌ SAO CÓ. Ngày 09/09 `tests/rule-compile-smoke.mjs` bị cắt còn **0 byte** bởi một lệnh viết
 * sai thứ tự (mở file để GHI trước khi đọc nó). Node chạy một file rỗng và **thoát 0**. Bộ chạy
 * báo XANH, cổng báo XANH, và bản rỗng đã được commit. Không lớp nào kêu, vì mọi lớp đều đang
 * hỏi "có ĐỎ không" chứ không hỏi "có KIỂM gì không".
 *
 * Đây là họ hàng gần của `MUTATION_SKIP`: một bộ kiểm im lặng đọc y hệt một lượt xanh.
 *
 * CHỈ ĐO ĐỘ DÀI, cố ý. Bản đầu còn đòi mỗi suite phải chứa `assert` — nó báo **6 lỗi giả** ngay
 * lượt chạy đầu: bốn `run-all.mjs` là bộ GOM (chúng chạy suite con rồi chuyển tiếp mã thoát,
 * không tự khẳng định gì) và `backlog-check.mjs` là bộ kiểm chứ không phải test. Sáu lỗi giả để
 * bắt thêm một ca giả thuyết là một vụ đổi tồi: phép kiểm báo giả sẽ bị tắt, và lúc đó nó không
 * còn bắt được ca THẬT nữa. Ngưỡng 200 byte bắt đúng thứ đã xảy ra — file bị CẮT — và không
 * phán xét file viết ngắn. */
export function suiteRong(ds, root = ROOT) {
  const xau = [];
  for (const lenh of ds) {
    const f = lenh.split(/\s+/).find((x) => x.endsWith(".mjs") || x.endsWith(".js"));
    if (!f) continue;
    let noiDung;
    try { noiDung = fs.readFileSync(path.join(root, f), "utf8"); } catch { continue; }
    if (noiDung.trim().length < 200) xau.push(`${f} — chỉ ${noiDung.length} byte, nghi bị cắt`);
  }
  return xau;
}

/* ---- chạy ------------------------------------------------------------------ */

function chayMot(lenh, root) {
  return new Promise((giai) => {
    const phan = lenh.split(/\s+/);
    const t0 = Date.now();
    const con = spawn(phan[0], phan.slice(1), { cwd: root, shell: process.platform === "win32" });
    let ra = "";
    con.stdout.on("data", (d) => { ra += d; });
    con.stderr.on("data", (d) => { ra += d; });
    con.on("close", (ma) => giai({ lenh, ma: ma ?? 1, ra, giay: +((Date.now() - t0) / 1000).toFixed(1) }));
  });
}

async function chayHo(danhSach, root, songSong) {
  const ket = [];
  const hangDoi = [...danhSach];
  const chay = async () => {
    for (;;) {
      const l = hangDoi.shift();
      if (!l) return;
      ket.push(await chayMot(l, root));
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, songSong) }, chay));
  return ket;
}

async function main(argv) {
  const root = ROOT;
  const chi = argv.includes("--chi") ? argv[argv.indexOf("--chi") + 1] : null;
  const epTuanTu = argv.includes("--tuan-tu");
  let ds = danhSachSuite(root);
  if (!ds.length) { console.error("KHONG_CO_SUITE: `package.json` không khai `scripts.test`."); return 2; }
  const rong = suiteRong(ds, root);
  if (rong.length) {
    console.error("SUITE_RONG: " + rong.length + " suite không thể ĐỎ được — chạy chúng là tự lừa mình:");
    for (const x of rong) console.error("  · " + x);
    console.error("Một file test rỗng thoát 0 và đọc y hệt một lượt xanh. Khôi phục rồi chạy lại.");
    return 2;
  }
  const lenhBam = bamLenh(ds);
  if (chi) ds = ds.filter((s) => s.includes(chi));
  if (!ds.length) { console.error(`KHONG_KHOP: không suite nào có tên chứa "${chi}".`); return 2; }

  const phaiRieng = danhSachTuanTu(root);
  const laRieng = (l) => phaiRieng.some((p) => l.includes(p));
  const nhomRieng = ds.filter(laRieng);
  const nhomChung = ds.filter((l) => !laRieng(l));
  const songSong = epTuanTu ? 1 : Math.max(1, Math.min(6, os.cpus().length - 2));

  const t0 = Date.now();
  console.log(`chạy ${ds.length} suite — ${nhomChung.length} song song (${songSong} luồng) · ${nhomRieng.length} chạy riêng`);
  const ket = [...await chayHo(nhomChung, root, songSong), ...await chayHo(nhomRieng, root, 1)];

  /* ĐỎ THÌ CHẠY LẠI MỘT MÌNH TRƯỚC KHI KẾT LUẬN.
     Hai tiến trình git trong một cây tranh `index.lock`, và suite hỏng vì thế báo ra một lỗi
     NỘI DUNG trông y hệt lỗi thật. Đã mất một vòng vì tin ngay một cái đỏ như thế. */
  const nghiNgo = ket.filter((k) => k.ma !== 0);
  const doThat = [];
  for (const k of nghiNgo) {
    if (epTuanTu) { doThat.push(k); continue; }
    console.log(`  ĐỎ: ${k.lenh} — chạy lại MỘT MÌNH để loại trừ tranh chấp…`);
    const lai = await chayMot(k.lenh, root);
    if (lai.ma !== 0) doThat.push(lai);
    else console.log(`  → chạy một mình thì XANH. Đỏ vừa rồi là tranh chấp, không phải lỗi.`);
  }

  const giay = ((Date.now() - t0) / 1000).toFixed(1);
  for (const k of [...ket].sort((a, b) => b.giay - a.giay).slice(0, 5)) {
    console.log(`  ${String(k.giay).padStart(7)}s  ${k.lenh}`);
  }

  if (doThat.length) {
    xoaDau(root);
    console.error(`\nSUITE ĐỎ — ${doThat.length}/${ds.length}, sau ${giay}s:`);
    for (const k of doThat) {
      console.error(`\n── ${k.lenh} (mã ${k.ma}) ──`);
      console.error(k.ra.split(String.fromCharCode(10)).slice(-25).join(String.fromCharCode(10)));
    }
    return 1;
  }

  /* IN THEO ĐÚNG ĐỊNH DẠNG MÁY ĐỌC ĐƯỢC. Cổng đóng phiên lọc dòng khớp "N passed, N failed" để
     báo số ra bảng; không in đúng dạng thì nó chỉ nói "chạy xong" — mất con số, và một phép ghim
     của bản trích đòi đúng con số đó. Giữ hợp đồng cũ, đừng bắt cổng học dạng mới. */
  console.log(`\n${ds.length} passed, 0 failed, ${ds.length} total — SUITE XANH trong ${giay}s.`);
  if (chi) {
    console.log("Chạy CHỌN LỌC nên KHÔNG ghi dấu — cổng sẽ tự chạy lại đủ bộ.");
    return 0;
  }
  const { head, bam } = dauCay(root);
  ghiDau(root, { ok: true, head, bam, lenh: lenhBam, moi_truong: moiTruongNay(), luc: new Date().toISOString(), giay: +giay, so_suite: ds.length });
  console.log(`Đã ghi ${TEN_DAU}: cổng đóng phiên sẽ dùng lại kết quả này nếu cây làm việc không đổi.`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) {
  main(process.argv.slice(2)).then((ma) => process.exit(ma));
}

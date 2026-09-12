#!/usr/bin/env node
/* LIỆT KÊ CHUỖI — cái nào ĐANG CHẠY, cái nào đã xong, cái nào bỏ khoá lại.
 *
 * Đức nêu 12/09: *"trong lịch sử tôi thấy còn rất nhiều luồng đã không còn chạy nữa nhưng vẫn
 * thấy có trong list, gây confuse và khó thao tác."*
 *
 * `dung-chuoi.bat` trước đây in mọi thư mục con của kho nhật ký — kho ấy là tệp CHỈ-THÊM của
 * mọi lượt chạy từ trước tới nay, nên sau một tuần nó là một danh sách dài toàn xác. Người ta
 * phải GÕ TAY tên chuỗi để dừng, mà tên chuỗi là thứ Đức đặt bằng tiếng Việt có dấu, có dấu
 * cách, có cả `&` — gõ sai một ký tự là dừng nhầm, hoặc không dừng gì cả. Kho nhật ký hiện có
 * `HNX`, `HNX ` (thừa đúng một dấu cách) và `mo rong scouter 2` đứng cạnh nhau.
 *
 * Hai việc, và việc thứ hai mới là việc chính:
 *   ⑴ NÓI RÕ CÁI NÀO CÒN SỐNG. `DANG-CHAY.json` có `pid`; hỏi hệ điều hành pid ấy còn không.
 *   ⑵ CHỌN BẰNG SỐ, không gõ tên. Cái tên không bao giờ đi qua bàn phím nữa.
 *
 * Dùng:
 *   node liet-ke-chuoi.mjs --so "<thư mục gốc>" [--ra "<tệp ghi tên đã chọn>"] [--chi-song]
 *   node liet-ke-chuoi.mjs --tu-kiem
 *
 * Mã thoát: 0 đã chọn (hoặc chỉ liệt kê) · 2 không có chuỗi nào / người bỏ cuộc.
 */
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { conSong } from "./chuoi-reasoning.mjs";

/* Đọc trạng thái một thư mục chuỗi. THUẦN: nhận sẵn nội dung đã đọc, không đụng đĩa — nên phép
   ghim lái được nó qua mọi mép mà không cần dựng thư mục thật. `song` tiêm vào được vì "pid còn
   sống không" là câu hỏi về máy đang chạy, không phải về dữ liệu. */
export function trangThaiChuoi({ ten, khoaTho, nhatKyTho }, song = conSong) {
  let khoa = null;
  if (khoaTho) { try { khoa = JSON.parse(khoaTho); } catch { khoa = {}; } }

  if (khoa && song(khoa.pid)) {
    return { ten, bac: 0, nhan: "ĐANG CHẠY", chiTiet: `pid ${khoa.pid ?? "?"} · từ ${gioNgan(khoa.tu)}` };
  }
  /* KHOÁ CÒN MÀ CHỦ ĐÃ CHẾT — nói ra, đừng im. Đây chính là thứ làm Đức không chạy lại được
     một tên chuỗi và phải đặt tên mới. Từ B-77 bộ chạy tự thu, nên đây là tin, không phải lỗi. */
  if (khoa) {
    return { ten, bac: 1, nhan: "đã chết", chiTiet: `bỏ khoá lại (pid ${khoa.pid ?? "?"}) — chạy lại tên này là tự thu` };
  }

  const cuoi = dongCuoi(nhatKyTho);
  if (!cuoi) return { ten, bac: 3, nhan: "chưa chạy", chiTiet: "không có nhật ký" };
  if (cuoi.su_kien === "KET_THUC") {
    return { ten, bac: 2, nhan: "đã xong", chiTiet: `${cuoi.da_gui ?? 0} vòng · ${cuoi.ly_do ?? "?"} · ${gioNgan(cuoi.luc)}` };
  }
  /* Nhật ký dừng giữa chừng mà không có khoá: tiến trình bị giết trước khi kịp ghi `KET_THUC`. */
  return { ten, bac: 2, nhan: "đứt giữa chừng", chiTiet: `dòng cuối "${cuoi.su_kien ?? "?"}" lúc ${gioNgan(cuoi.luc)}` };
}

/** Dòng JSON cuối cùng ĐỌC ĐƯỢC. Nhật ký là tệp chỉ-thêm ghi giữa lúc chạy, nên dòng cuối có
 *  thể cụt — lùi dần cho tới khi gặp một dòng phân tích được, đừng bỏ cả tệp vì một dòng hỏng. */
export function dongCuoi(tho) {
  const dong = String(tho ?? "").split("\n").filter((d) => d.trim());
  for (let i = dong.length - 1; i >= 0; i -= 1) {
    try { return JSON.parse(dong[i]); } catch { /* thử dòng trước */ }
  }
  return null;
}

function gioNgan(iso) {
  if (!iso) return "?";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "?";
  const hai = (n) => String(n).padStart(2, "0");
  return `${hai(d.getDate())}/${hai(d.getMonth() + 1)} ${hai(d.getHours())}:${hai(d.getMinutes())}`;
}

/** Xếp: đang chạy lên đầu, rồi chết-bỏ-khoá, rồi phần còn lại theo tên. Người mở danh sách này
 *  gần như luôn muốn cái ĐANG CHẠY — bắt họ dò qua hai chục cái xác là bắt sai việc. */
export function xepChuoi(ds) {
  return [...ds].sort((a, b) => (a.bac - b.bac) || a.ten.localeCompare(b.ten, "vi"));
}

function docCo(argv, ten, mac = "") {
  const i = argv.indexOf(`--${ten}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : mac;
}

function tuKiem() {
  const assert = (dk, vi) => { if (!dk) { console.error(`TỰ KIỂM ĐỎ: ${vi}`); process.exit(1); } };
  const chet = () => false;
  const song = () => true;

  const dangChay = trangThaiChuoi({ ten: "a", khoaTho: '{"pid":123,"tu":"2026-09-12T05:31:36.000Z"}', nhatKyTho: "" }, song);
  assert(dangChay.nhan === "ĐANG CHẠY", "khoá + pid còn sống = đang chạy");
  assert(dangChay.bac === 0, "đang chạy phải xếp lên đầu");

  const moCoi = trangThaiChuoi({ ten: "b", khoaTho: '{"pid":123}', nhatKyTho: "" }, chet);
  assert(moCoi.nhan === "đã chết", "khoá + pid đã chết = khoá mồ côi");

  const xong = trangThaiChuoi({ ten: "c", khoaTho: "",
    nhatKyTho: '{"luc":"2026-09-12T05:53:01.000Z","su_kien":"KET_THUC","da_gui":3,"ly_do":"HET_SO_VONG"}\n' }, chet);
  assert(xong.nhan === "đã xong", "có KET_THUC = đã xong");
  assert(xong.chiTiet.includes("3 vòng"), "phải nêu số vòng đã gửi");

  const dut = trangThaiChuoi({ ten: "d", khoaTho: "", nhatKyTho: '{"luc":"2026-09-12T05:31:36.000Z","su_kien":"BAT_DAU"}\n' }, chet);
  assert(dut.nhan === "đứt giữa chừng", "không khoá, không KET_THUC = đứt giữa chừng");

  /* Dòng cuối cụt — lượt tắt máy giữa lúc ghi. Phải lùi về dòng trước, không được bỏ cả tệp. */
  assert(dongCuoi('{"su_kien":"BAT_DAU"}\n{"su_kien":"DA_G').su_kien === "BAT_DAU", "dòng cuối cụt thì lùi một dòng");
  assert(dongCuoi("") === null, "nhật ký rỗng trả null");
  assert(trangThaiChuoi({ ten: "e", khoaTho: "", nhatKyTho: "" }, chet).nhan === "chưa chạy", "không nhật ký = chưa chạy");

  /* Khoá hỏng KHÔNG được đọc thành "không có khoá" — mất khoá là mất lớp chống hai bản chạy. */
  assert(trangThaiChuoi({ ten: "f", khoaTho: "{bậy", nhatKyTho: "" }, chet).nhan === "đã chết",
    "khoá không phân tích được vẫn là CÓ khoá");

  const xep = xepChuoi([{ ten: "z", bac: 2 }, { ten: "a", bac: 2 }, { ten: "m", bac: 0 }]);
  assert(xep[0].ten === "m", "đang chạy phải lên đầu bất kể tên");
  assert(xep[1].ten === "a" && xep[2].ten === "z", "cùng bậc thì theo tên");

  console.log("liet-ke-chuoi tự kiểm: 12/12 xanh");
}

async function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--tu-kiem")) return tuKiem();

  const goc = docCo(argv, "so");
  if (!goc) { console.error("Thiếu --so <thư mục gốc chứa nhật ký>."); process.exit(2); }

  let thuMuc = [];
  try {
    thuMuc = fs.readdirSync(goc, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    console.error(`Không đọc được kho nhật ký: ${goc}`);
    process.exit(2);
  }

  const doc1 = (ten, tep) => { try { return fs.readFileSync(path.join(goc, ten, tep), "utf8"); } catch { return ""; } };
  let ds = xepChuoi(thuMuc.map((ten) => trangThaiChuoi({
    ten, khoaTho: doc1(ten, "DANG-CHAY.json"), nhatKyTho: doc1(ten, "nhat-ky.jsonl"),
  })));
  if (argv.includes("--chi-song")) ds = ds.filter((x) => x.bac === 0);

  if (!ds.length) {
    console.error(argv.includes("--chi-song") ? "Không chuỗi nào đang chạy." : "Chưa có chuỗi nào trong kho nhật ký.");
    process.exit(2);
  }

  console.log("");
  const rong = Math.max(...ds.map((x) => x.ten.length));
  ds.forEach((x, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. ${x.ten.padEnd(rong)}  ${x.nhan.padEnd(14)} ${x.chiTiet}`);
  });
  console.log("");

  const ra = docCo(argv, "ra");
  if (!ra) return;

  const dangChay = ds.filter((x) => x.bac === 0).length;
  if (!dangChay) console.log("  (không chuỗi nào đang chạy — dừng một chuỗi đã xong thì không có tác dụng gì)");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const hoi = (q) => new Promise((res) => rl.question(q, res));
  let chon = null;
  for (let lan = 0; lan < 3 && !chon; lan += 1) {
    /* CHỈ NHẬN MỘT CON SỐ. Nhận cả tên là mở lại đúng cái cửa vừa đóng: gõ tay tên chuỗi. */
    const tra = (await hoi(`  Chọn số 1-${ds.length} (Enter để thoát): `)).trim();
    if (!tra) break;
    const n = Number(tra);
    if (Number.isInteger(n) && n >= 1 && n <= ds.length) chon = ds[n - 1].ten;
    else console.log("  Không hiểu. Gõ đúng một con số trong danh sách.");
  }
  rl.close();
  if (!chon) { console.error("Chưa chọn gì. Không làm gì."); process.exit(2); }
  fs.writeFileSync(ra, chon);
  console.log(`  -> ${chon}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((e) => { console.error(e?.message || e); process.exit(2); });
}

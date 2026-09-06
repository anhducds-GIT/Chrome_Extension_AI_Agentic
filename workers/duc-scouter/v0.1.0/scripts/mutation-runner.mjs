/* mutation-runner.mjs — BỘ MÁY của đột biến kiểm, dùng chung cho nhiều bộ mục tiêu.
 *
 * Câu hỏi đột biến kiểm trả lời: phép ghim kia có THẬT SỰ ghim cái gì không, hay nó chỉ xanh
 * vì code đang đúng? Cách duy nhất biết là cố ý làm hỏng chốt rồi xem test có đỏ.
 * MULTIFLOW.md mục 5: "một chốt không có test ghim thì nó chỉ là bình luận" — đếm được BỐN lần
 * trong một ngày một chốt vừa viết ra hoá ra vô tác dụng mà test vẫn xanh.
 *
 * BA CÁI BẪY ĐÃ TRẢ GIÁ, và cách file này tránh:
 *
 *   · `\b` trong regex JS KHÔNG khớp cạnh chữ tiếng Việt; neo `^`/`$` gặp file CRLF báo
 *     "không khớp" trông y hệt "không có gì để sửa". → KHÔNG DÙNG REGEX. Mọi đột biến là thay
 *     chuỗi NGUYÊN VĂN, đếm bằng indexOf. NHƯNG chính bẫy đó cắn ngược lượt đầu: mỏ neo NHIỀU
 *     DÒNG viết bằng `\n`, còn file bị đo là CRLF — nên ba con khớp 0 chỗ và im lặng không đo
 *     gì (2026-09-06). Vá: `theoEol()` đổi `\n` của mỏ neo sang đúng EOL của file đích trước
 *     khi tìm. Đó cũng là lý do mỏ neo mới đều nên viết MỘT DÒNG.
 *   · Bộ đo mà mỏ neo không khớp sẽ báo SKIP, đọc gần y hệt một lượt xanh. → Ở đây mỏ neo
 *     không khớp là ĐỎ (`MO_NEO_HONG`), và số con khớp = 0 thì THOÁT NGAY mã 2.
 *   · Khôi phục bằng `git checkout` sẽ xoá luôn việc chưa commit. → Khôi phục bằng ghi lại
 *     ĐÚNG BYTES GỐC đã đọc vào bộ nhớ trước khi sửa, trong `finally`.
 *
 * Tách khỏi `observer-mutation-check.mjs` ngày 06/09 khi có bộ mục tiêu thứ hai (Scouter seed).
 * Hai bản sao của bộ máy này là hai bản sao của ba cái bẫy trên, và bản thứ hai sẽ không học
 * lại được chúng.
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

/* Đếm số lần một chuỗi xuất hiện — không regex, nên không dính bẫy `\b` / CRLF. */
export function demSoLan(nguon, tim) {
  let dem = 0;
  let vt = nguon.indexOf(tim);
  while (vt !== -1) {
    dem += 1;
    vt = nguon.indexOf(tim, vt + tim.length);
  }
  return dem;
}

export function theoEol(text, eol) {
  return eol === "\r\n" ? text.split("\n").join("\r\n") : text;
}

function chayPin(pin, root) {
  try {
    execFileSync(process.execPath, [pin], { cwd: root, stdio: "pipe", timeout: 120000 });
    return { do: false, dau: "" };
  } catch (error) {
    const dau = String(error.stdout || "") + String(error.stderr || "");
    return { do: true, dau: dau.split("\n").find((d) => d.includes("AssertionError") || d.includes("Error")) || "(đỏ)" };
  }
}

/**
 * @param {Array} batches  [{ ten, target, pin, mutants: [{ ma, ten, tim, thay, soLan }] }]
 * @param {string} root    thư mục chạy phép ghim
 * @returns {number}       mã thoát: 0 sạch · 1 có con sống sót · 2 bộ đo hỏng
 */
export function chayDotBien(batches, root) {
  let soKhop = 0;
  let soDo = 0;
  let soSong = 0;
  let tongCon = 0;
  const moNeoHong = [];
  const songSot = [];

  for (const me of batches) {
    const BYTES_GOC = fs.readFileSync(me.target);          // bytes, không phải chuỗi
    const NGUON_GOC = BYTES_GOC.toString("utf8");
    const eol = NGUON_GOC.includes("\r\n") ? "\r\n" : "\n";
    tongCon += me.mutants.length;

    console.log(`\n=== ${me.ten} ===`);
    console.log(`${path.relative(root, me.target)} → ${path.relative(root, me.pin)}  (EOL: ${eol === "\r\n" ? "CRLF" : "LF"})\n`);

    /* Vế nền: chưa đột biến thì phép ghim phải XANH. Không có vế này thì một phép ghim hỏng sẵn
     * sẽ "giết" cả mẻ và bộ đo báo thành công rực rỡ. */
    const nen = chayPin(me.pin, root);
    if (nen.do) {
      console.error(`ĐỎ: phép ghim ${path.relative(root, me.pin)} đã đỏ sẵn khi CHƯA đột biến. Sửa test trước, đo sau.`);
      console.error(nen.dau);
      return 2;
    }
    console.log("nền (chưa đột biến): XANH — bộ đo dùng được\n");

    try {
      for (const con of me.mutants) {
        const tim = theoEol(con.tim, eol);
        const thay = theoEol(con.thay, eol);
        const dem = demSoLan(NGUON_GOC, tim);
        if (dem !== con.soLan) {
          moNeoHong.push(`${con.ma} (khớp ${dem}, cần ${con.soLan})`);
          console.log(`[MỎ NEO HỎNG] ${con.ma} — ${con.ten}: khớp ${dem} chỗ, cần ${con.soLan}`);
          continue;
        }
        soKhop += 1;
        fs.writeFileSync(me.target, NGUON_GOC.split(tim).join(thay), "utf8");
        const ketQua = chayPin(me.pin, root);
        fs.writeFileSync(me.target, BYTES_GOC);
        if (ketQua.do) {
          soDo += 1;
          console.log(`[GIẾT ĐƯỢC] ${con.ma} — ${con.ten}`);
        } else {
          soSong += 1;
          songSot.push(`${con.ma} — ${con.ten}`);
          console.log(`[SỐNG SÓT ] ${con.ma} — ${con.ten}   ← chốt này chỉ là bình luận`);
        }
      }
    } finally {
      fs.writeFileSync(me.target, BYTES_GOC);              // khôi phục bytes gốc, không git checkout
    }
  }

  console.log(`\nMỏ neo khớp: ${soKhop}/${tongCon} · giết được ${soDo} · sống sót ${soSong}`);

  if (soKhop === 0) {
    console.error("ĐỎ: KHÔNG mỏ neo nào khớp. Bộ đo không đo được gì — đừng đọc đây thành 'xanh'.");
    return 2;
  }
  if (moNeoHong.length) {
    console.error(`ĐỎ: mỏ neo mục theo code: ${moNeoHong.join(", ")}. Sửa bộ đo.`);
    return 2;
  }
  if (songSot.length) {
    console.error(`ĐỎ: ${songSot.length} con sống sót:\n  - ${songSot.join("\n  - ")}`);
    return 1;
  }
  console.log("Đột biến kiểm: PASS — mọi chốt đều có phép ghim đứng sau.");
  return 0;
}

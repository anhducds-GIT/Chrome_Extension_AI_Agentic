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
import os from "node:os";
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
/* ---- MỘT LƯỢT MỘT LÚC, VÀ ĐÂY KHÔNG PHẢI LO XA ---------------------------
 * Xảy ra thật 07/09: hai lượt chạy chồng nhau trên cùng thư mục. Lượt A ghi bản đột biến; lượt
 * B đọc **bản đã đột biến đó** và lưu làm "bản gốc" của mình; A hoàn nguyên đúng; rồi B hoàn
 * nguyên bản gốc GIẢ của nó — và một con đột biến ở lại trong mã nguồn.
 *
 * Vì sao đó là hạng nặng chứ không phải phiền: mã bị nhiễm KHÔNG kêu. Lượt đó `read_only: true`
 * còn bị phép ghim bắt, nhưng một con đột biến tinh hơn thì suite vẫn xanh và thứ ở lại trong
 * repo là một chốt an toàn đã bị gỡ. Bộ đo dựng ra để canh chốt lại thành đường gỡ chốt.
 *
 * Khoá là một FILE, không phải một biến trong tiến trình: hai lượt là hai tiến trình Node khác
 * nhau, biến chung không thấy được nhau. `wx` là thao tác tạo-nếu-chưa-có nguyên tử của hệ điều
 * hành — đúng thứ cần, và không cần thư viện nào. Khoá mồ côi (máy sập giữa chừng) thì câu báo
 * chỉ thẳng đường dọn, vì một cái khoá không tự gỡ được cũng là một cái kẹt. */
/* ---- CẮT NGANG CŨNG PHẢI HOÀN NGUYÊN ------------------------------------
 * Khối `finally` bên dưới chỉ chạy khi có NGOẠI LỆ. Nó không chạy khi tiến trình bị giết —
 * Ctrl-C, đường ống đóng sớm (`node ... | grep` mà grep thoát trước), hay `process.exit` từ
 * một chỗ khác. Xảy ra thật 07/09, hai lần trong một giờ: một con đột biến ở lại trong mã
 * nguồn, và lượt chạy sau đọc nó như thể đó là bản gốc.
 *
 * Khoá file ở trên KHÔNG cứu được ca này — nó chống hai lượt chạy CÙNG LÚC, còn đây là một
 * lượt bị chém giữa chừng. Hai bệnh khác nhau, cần hai thuốc. */
let dangSuaDo = null;

function hoanNguyenNgay(vi_sao) {
  if (!dangSuaDo) return;
  const ten = path.basename(dangSuaDo.target);
  try {
    fs.writeFileSync(dangSuaDo.target, dangSuaDo.bytes);
    process.stderr.write(`\n[HOÀN NGUYÊN] ${vi_sao}: đã trả ${ten} về bản gốc.\n`);
  } catch (error) {
    /* Không ghi lại được thì PHẢI hét lên — im lặng ở đây nghĩa là để lại mã nhiễm độc. */
    process.stderr.write(`\n[NGUY] ${vi_sao}: KHÔNG hoàn nguyên được ${dangSuaDo.target} — ${error.message}\n`);
    process.stderr.write(`     Chạy git diff, và trả file đó về bản gốc BẰNG TAY trước khi làm gì tiếp.\n`);
  }
  dangSuaDo = null;
}
process.on("exit", () => hoanNguyenNgay("tiến trình thoát"));
for (const tin of ["SIGINT", "SIGTERM", "SIGHUP", "SIGBREAK"]) {
  process.on(tin, () => { hoanNguyenNgay(tin); process.exit(130); });
}
process.on("uncaughtException", (error) => { hoanNguyenNgay("lỗi không bắt được"); throw error; });

/* ---- NHẬT KÝ HỒI PHỤC — thứ DUY NHẤT sống sót được một cú giết cứng ------
 * Bản đầu của tôi bắt tín hiệu (SIGINT/SIGTERM) và `process.on("exit")`. Đo thật 07/09:
 * trên Windows KHÔNG có tín hiệu thật — `p.kill("SIGINT")` giết thẳng tiến trình, handler
 * không bao giờ nổ, và một con đột biến ở lại trong mã nguồn. Tôi thử chính cái chốt vừa
 * dựng và nó trượt — đó là lý do khối này tồn tại thay chỗ chốt kia.
 *
 * Nhật ký nằm TRÊN ĐĨA, ghi TRƯỚC khi sửa, xoá SAU khi trả về. Nên nó sống sót qua
 * Ctrl-C, qua `kill -9`, qua mất điện. Lượt chạy sau thấy nó thì HOÀN NGUYÊN TRƯỚC rồi mới đo. */
const NHAT_KY = path.join(os.tmpdir(), "scouter-dot-bien.journal.json");

function ghiNhatKy(target, bytes) {
  fs.writeFileSync(NHAT_KY, JSON.stringify({ target, base64: bytes.toString("base64") }));
}

function xoaNhatKy() {
  try { fs.unlinkSync(NHAT_KY); } catch { /* chưa có thì thôi */ }
}

/* Gọi Ở ĐẦU mỗi lượt chạy. Trả về tên file đã cứu, hoặc null. */
function cuuLuotTruoc() {
  if (!fs.existsSync(NHAT_KY)) return null;
  let ban;
  try { ban = JSON.parse(fs.readFileSync(NHAT_KY, "utf8")); }
  catch {
    /* Nhật ký hỏng = KHÔNG BIẾT còn gì nhiễm hay không. Phải đỏ, không được đoán là sạch. */
    console.error("NHAT_KY_HONG: " + NHAT_KY + " không đọc được.");
    console.error("Chạy `git diff` để tự kiểm, trả file về bản gốc, rồi xoá file nhật ký trên.");
    process.exit(2);
  }
  fs.writeFileSync(ban.target, Buffer.from(ban.base64, "base64"));
  xoaNhatKy();
  return ban.target;
}
const KHOA = path.join(os.tmpdir(), "scouter-dot-bien.lock");

/* Tiến trình đang giữ khóa còn sống không. `process.kill(pid, 0)` không giết ai — nó chỉ hỏi.
 * ESRCH = không có tiến trình đó. EPERM = có, nhưng của người khác — vẫn là đang sống. */
function conSong(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; }
  catch (error) { return error.code === "EPERM"; }
}

function nhanKhoa() {
  for (let vong = 0; vong < 2; vong += 1) {
    try {
      fs.writeFileSync(KHOA, process.pid + " " + new Date().toISOString() + "\n", { flag: "wx" });
      return;
    } catch (error) {
      if (error && error.code !== "EEXIST") throw error;
      let chu = "";
      try { chu = fs.readFileSync(KHOA, "utf8").trim(); } catch { /* vừa bị gỡ, thử lại */ continue; }
      const pid = Number.parseInt(chu.split(" ")[0], 10);
      /* KHÓA MỒ CÔI. Một lượt bị giết cứng không kịp gỡ khóa của nó — xảy ra thật 07/09, và
       * lúc đó khóa chặn MỌI lượt sau đó vĩnh viễn. Một cái khóa không tự gỡ được thì nó biến
       * một rủi ro hiếm thành một cái kẹt thường trực. Nên hỏi chủ cũ còn sống không đã.
       * Nhật ký hồi phục ở trên lo phần mã còn nhiễm; chỗ này chỉ lo cái khóa. */
      if (!conSong(pid)) {
        console.error("[KHOA MO COI] tiến trình " + pid + " giữ khóa này đã chết — nhận lại khóa.");
        try { fs.unlinkSync(KHOA); } catch { /* ai đó nhanh tay hơn */ }
        continue;
      }
      console.error("DANG_CHAY_ROI: một lượt đột biến khác ĐANG CHẠY trên thư mục này.");
      console.error("  khóa: " + KHOA + "\n  của:  " + chu);
      console.error("Hai lượt cùng ghi–hoàn nguyên một file sẽ BỎ LẠI đột biến trong mã nguồn.");
      console.error("Đợi lượt kia xong.");
      process.exit(2);
    }
  }
  console.error("KHONG_NHAN_DUOC_KHOA: thử hai lần vẫn vướng. Xem " + KHOA);
  process.exit(2);
}

export function chayDotBien(batches, root) {
  nhanKhoa();
  const daCuu = cuuLuotTruoc();
  if (daCuu) console.error("[CUU LUOT TRUOC] " + path.basename(daCuu) + " con mang dot bien cua mot luot bi chem ngang - da tra ve ban goc.");
  try {
    return chayDotBienDaKhoa(batches, root);
  } finally {
    try { fs.unlinkSync(KHOA); } catch { /* đã bị gỡ rồi thì thôi */ }
  }
}

function chayDotBienDaKhoa(batches, root) {
  let soKhop = 0;
  let soDo = 0;
  let soSong = 0;
  let tongCon = 0;
  const moNeoHong = [];
  const songSot = [];

  for (const me of batches) {
    const BYTES_GOC = fs.readFileSync(me.target);          // bytes, không phải chuỗi
    dangSuaDo = { target: me.target, bytes: BYTES_GOC };
    ghiNhatKy(me.target, BYTES_GOC);   // xem khối "CẮT NGANG" ở trên
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
      dangSuaDo = null;
      xoaNhatKy();
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

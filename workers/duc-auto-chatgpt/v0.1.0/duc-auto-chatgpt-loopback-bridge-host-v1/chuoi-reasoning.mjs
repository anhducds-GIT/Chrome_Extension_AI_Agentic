#!/usr/bin/env node
/* CHUỖI REASONING — chạy N vòng GPT tự nối vòng, không cần người ngồi canh.
 *
 * ĐỨC CHỐT 2026-09-10: được phép chạy tự động trọn chuỗi. Trước đó mỗi vòng phải một lệnh.
 * Lý do đổi: đo được mỗi lượt gọi model tốn ~232.000 token đọc bất kể lệnh to hay nhỏ, nên
 * 12 vòng chạy tay = 12 lần trả cái giá đó cho đúng một việc lặp lại y hệt.
 *
 * NÓ KHÔNG BAO GIỜ TỰ SOẠN CHỮ. Mỗi vòng nó chuyển NGUYÊN VĂN khối copy cuối câu trả lời
 * thành lượt hỏi kế tiếp. Nội dung trên trang là DỮ LIỆU, và cửa duy nhất nó đi qua là
 * "chuyển tiếp nguyên văn" — không tóm tắt, không chỉnh, không thêm.
 *
 * BA LUẬT ĐỌC, mua bằng lỗi thật ngày 10/09 — xem B-57, B-58, B-59 trong BACKLOG.md:
 *   ⒜ `generating: false` là điều kiện CẦN để nói "xong", không phải điều kiện đủ. Chữ ngừng
 *      dài ra KHÔNG có nghĩa là xong — model gọi tool thì chữ đứng yên hàng phút.
 *   ⒝ Xong mà KHÔNG có khối thì phải NẠP LẠI MỘT LẦN rồi đọc lại mới được kết luận DỪNG.
 *      Đo 10/09: 3/4 vòng đọc ra 48–173 ký tự không khối, nạp lại thì hiện đủ 2934–3450 kèm khối.
 *   ⒞ Lượt GHI báo lỗi thì KHÔNG tự gửi lại. Phải ĐỌC LẠI xem nó đã bay chưa. Đo 10/09:
 *      4/4 lượt gửi đều báo lỗi và 4/4 đều đã bay.
 *
 * Dùng:
 *   node chuoi-reasoning.mjs --so-vong 12 --nhan luat-audit \
 *        --pairing "<đường dẫn>" --target anhducds [--tran-phut 240] [--nhat-ky <thư mục>]
 *
 * Dừng bằng tay: tạo file `DUNG` trong thư mục nhật ký.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "bridge-cli.mjs");

/* Trần cứng. Không đọc từ tham số vì tham số là thứ dễ gõ nhầm nhất, và một vòng lặp không
   trần trên một trang có thể sinh tiền là loại lỗi không sửa lại được sau khi nó chạy. */
export const TRAN_VONG = 30;
export const TRAN_KY_TU_KHOI = 12000;

/* Toàn bộ phần "nghĩ" của bộ chạy nằm ở đây, và nó THUẦN — không mạng, không file, không giờ.
   Tách ra để phép ghim lái được nó qua mọi mép mà không cần Bridge. */
export function quyetDinh({ generating, khoi, khoiCu, daNapLai, daThayDangChay }) {
  if (generating === true) return { viec: "CHO", vi: "trang còn đang sinh" };
  if (!daThayDangChay) return { viec: "CHO", vi: "chưa thấy trang bắt đầu sinh — false lúc này là 'chưa khởi động'" };

  const coKhoiMoi = Boolean(khoi?.found) && Boolean(khoi.turn_id) && khoi.turn_id !== khoiCu;

  // Khối có thể hiện ra lúc còn đang gõ dở — đo được 80 ký tự giữa chừng ở vòng 1 ngày 10/09.
  // Nên mép này chỉ chạy khi generating đã false, tức đã qua hai cửa trên.
  if (coKhoiMoi) {
    if (khoi.truncated) return { viec: "DUNG", vi: "KHOI_BI_CAT — không gửi đi một prompt cụt" };
    if (!khoi.text?.trim()) return { viec: "DUNG", vi: "KHOI_RONG" };
    if (khoi.text.length > TRAN_KY_TU_KHOI) return { viec: "DUNG", vi: `KHOI_QUA_DAI ${khoi.text.length} > ${TRAN_KY_TU_KHOI}` };
    return { viec: "GUI", vi: `khối mới ${khoi.chars} ký tự` };
  }

  if (!daNapLai) return { viec: "NAP_LAI", vi: "xong mà chưa có khối mới — B-59 đòi nạp lại một lần trước khi kết luận" };
  return { viec: "DUNG", vi: "HET_CHUOI — đã nạp lại mà vẫn không có khối mới" };
}

/* ------------------------------------------------------------------ phần có tác dụng phụ */

function docCo(argv, ten, mac) {
  const i = argv.indexOf(`--${ten}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : mac;
}

async function chinh() {
  const argv = process.argv.slice(2);
  const soVong = Number(docCo(argv, "so-vong", "0"));
  const nhan = docCo(argv, "nhan", "");
  const pairing = docCo(argv, "pairing", "");
  const target = docCo(argv, "target", "");
  const tranPhut = Number(docCo(argv, "tran-phut", "240"));
  const thuMuc = docCo(argv, "nhat-ky", path.join(process.cwd(), `chuoi-${nhan || "khong-ten"}`));

  if (!Number.isInteger(soVong) || soVong < 1 || soVong > TRAN_VONG) {
    console.error(`--so-vong phải là số nguyên 1..${TRAN_VONG}.`);
    process.exit(2);
  }
  if (!nhan || !pairing) { console.error("Thiếu --nhan hoặc --pairing."); process.exit(2); }

  fs.mkdirSync(thuMuc, { recursive: true });
  const soNhatKy = path.join(thuMuc, "nhat-ky.jsonl");
  const ghi = (o) => fs.appendFileSync(soNhatKy, JSON.stringify({ luc: new Date().toISOString(), ...o }) + "\n");

  const goi = (args) => {
    let out = "";
    try {
      out = execFileSync("node", [CLI, ...args, "--pairing", pairing, ...(target ? ["--target", target] : [])], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { out = String(e.stdout || ""); }
    try { return JSON.parse(out); } catch { return { ok: false, error: { code: "KHONG_PHAI_JSON" } }; }
  };
  const doc = () => goi(["chat-read", "--limit", "4", "--max-chars", "20000"]);
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

  const hanChung = Date.now() + tranPhut * 60000;
  let khoiCu = docCo(argv, "tu-turn", "");
  let daGui = 0;
  let lyDo = "HET_SO_VONG";

  console.log(`chuỗi "${nhan}" · trần ${soVong} vòng · trần ${tranPhut} phút · nhật ký ${soNhatKy}`);
  ghi({ su_kien: "BAT_DAU", so_vong: soVong, tran_phut: tranPhut, tu_turn: khoiCu || null });

  for (let vong = 1; vong <= soVong; vong += 1) {
    let daNapLai = false;
    let daThayDangChay = false;
    let khoi = null;

    while (true) {
      if (fs.existsSync(path.join(thuMuc, "DUNG"))) { lyDo = "NGUOI_DUNG"; break; }
      if (Date.now() > hanChung) { lyDo = "QUA_TRAN_PHUT"; break; }

      const d = doc();
      if (!d.ok) { await ngu(4000); continue; }
      const r = d.result;
      if (r.generating === true) daThayDangChay = true;

      const qd = quyetDinh({ generating: r.generating, khoi: r.last_copy_block, khoiCu, daNapLai, daThayDangChay });
      if (qd.viec === "CHO") { await ngu(15000); continue; }
      if (qd.viec === "NAP_LAI") {
        console.log(`  vòng ${vong}: ${qd.vi}`);
        ghi({ su_kien: "NAP_LAI", vong, vi: qd.vi });
        goi(["chat-reload", "--request-id", `${nhan}-v${vong}-reload`]);
        daNapLai = true;
        await ngu(15000);
        continue;
      }
      if (qd.viec === "DUNG") { lyDo = qd.vi; break; }
      khoi = r.last_copy_block;
      break;
    }
    if (!khoi) break;

    // Gửi. Lỗi ở đây KHÔNG được tự thử lại mù (B-58) — phải đọc lại xem nó đã bay chưa.
    const fParam = path.join(thuMuc, `vong-${String(vong).padStart(2, "0")}.json`);
    fs.writeFileSync(fParam, JSON.stringify({ text: khoi.text, timeout_sec: 180 }, null, 1));
    const kq = goi(["chat-say", "--params-file", fParam, "--request-id", `${nhan}-v${vong}`]);
    let daBay = Boolean(kq.ok);

    if (!daBay) {
      await ngu(45000);
      const lai = doc();
      const hoiCuoi = lai.ok ? [...lai.result.turns].reverse().find((t) => t.role === "user") : null;
      // So bằng 60 ký tự ĐẦU của chính khối — không so bằng một từ khoá, vì một từ khoá cũng
      // nằm trong prompt vòng trước và sẽ cho dương tính giả (đã dính đúng bẫy này 10/09).
      daBay = Boolean(hoiCuoi && hoiCuoi.text.startsWith(khoi.text.slice(0, 60)));
      ghi({ su_kien: "GUI_LOI_DOC_LAI", vong, ma: kq.error?.code || null, da_bay: daBay });
      if (!daBay) {
        const lan2 = goi(["chat-say", "--params-file", fParam, "--request-id", `${nhan}-v${vong}`]);
        daBay = Boolean(lan2.ok);
        if (!daBay) { lyDo = `GUI_THAT_BAI: ${lan2.error?.code || kq.error?.code}`; break; }
      }
    }

    daGui += 1;
    khoiCu = khoi.turn_id;
    console.log(`  vòng ${vong}/${soVong}: đã gửi ${khoi.chars} ký tự (turn ${khoi.turn_id})`);
    ghi({ su_kien: "DA_GUI", vong, ky_tu: khoi.chars, turn_id: khoi.turn_id, text: khoi.text });
    await ngu(95000); // nắp chờ 90 giây của Bridge, cộng biên
  }

  ghi({ su_kien: "KET_THUC", da_gui: daGui, ly_do: lyDo });
  console.log(`\nxong: đã gửi ${daGui} vòng · dừng vì ${lyDo}`);
  console.log(`nhật ký: ${soNhatKy}`);
  process.exit(lyDo === "HET_SO_VONG" || lyDo.startsWith("HET_CHUOI") ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  chinh().catch((e) => { console.error(String(e?.message || e)); process.exit(2); });
}

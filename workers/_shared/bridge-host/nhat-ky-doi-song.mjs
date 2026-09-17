/* NHẬT KÝ ĐỜI SỐNG của một máy chủ Bridge — để lượt sau biết lượt trước chết thế nào.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI ───────────────────────────────────────────────
 * 17/09, máy chủ Udin chết **ba lần** trong một phiên. `stderr` **rỗng** ở cả ba — tức nó bị
 * GIẾT, không tự lỗi. Phía Đức thì triệu chứng chỉ là `fetch failed`, mỗi lần lại tốn một lượt
 * đoán rồi một lượt bật lại.
 *
 * Giả thuyết đầu tiên của tôi (*"`Start-Process` bị dọn theo tiến trình cha"*) **đã bị đo và
 * bác** — xem `G-98`: ba máy chủ đang sống đều có tiến trình cha đã chết, kể cả một cái do chính
 * Đức bật. **Nguyên nhân thật vẫn chưa biết**, và file này không đoán thêm một lần nào nữa. Nó
 * chỉ làm đúng một việc: **giữ lại dấu vết để lần chết sau KHÔNG mất**.
 *
 * ─── VÌ SAO MỘT CÚ GIẾT LẠI KHÔNG ĐỂ LẠI DÒNG NÀO ─────────────────────────
 * Trên Windows, `Stop-Process` (kể cả **không** `-Force`) gọi thẳng `TerminateProcess`. Nó KHÔNG
 * gửi tín hiệu nào, nên `SIGTERM` của Node không bao giờ chạy, `process.on("exit")` cũng không.
 * Tiến trình biến mất giữa câu.
 *
 * **Chính sự IM LẶNG ấy là thứ phân biệt được hai nhánh**, và đó là cả thiết kế ở đây:
 *   · đóng tử tế / tự lỗi → có dòng `tat_sach: true` kèm mã thoát
 *   · bị giết từ ngoài    → file giữ nguyên `tat_sach: false` và một mốc `con_song_luc` đã cũ
 *
 * ─── VÌ SAO GHI ĐÈ MỘT DÒNG, KHÔNG NỐI THÊM VÀO LOG ────────────────────────
 * Đường rẻ hơn là in một nhịp tim ra `stdout` — nó đã được chuyển hướng sẵn vào `*.BRIDGE.stdout
 * .log` rồi, không phải dựng gì cả. Nhưng một nhịp mỗi 30 giây là **2.880 dòng mỗi ngày** trên
 * một tệp không ai dọn, và thứ Đức cần đọc (dòng khai vùng ghi) sẽ trôi mất trong đó. Ghi đè một
 * tệp một dòng thì **kích thước không đổi**, và lời chẩn đoán hiện ra **đúng lúc nó có ích** —
 * ở dòng khởi động của lượt sau, chỗ Đức vốn đã nhìn.
 *
 * ─── THỨ FILE NÀY KHÔNG TRẢ LỜI ĐƯỢC ───────────────────────────────────────
 * Nó nói được *"bị giết từ ngoài"*, **không** nói được *"AI giết"*. Muốn biết tên tiến trình ra
 * lệnh giết thì phải bật kiểm toán tiến trình của Windows (`Audit Process Termination`) hoặc cài
 * Sysmon — **đổi cài đặt hệ thống, việc của Đức, không phải của AI**. Đừng lặng lẽ ghi *"máy chủ
 * bị X giết"* từ dữ liệu ở đây.
 */
import { readFileSync, writeFileSync } from "node:fs";

/** Đọc bản ghi của lượt chạy trước. Không có, hỏng, hay không đọc được → `null`, không ném. */
export function docLuotTruoc(duong, doc = readFileSync) {
  try {
    const o = JSON.parse(doc(duong, "utf8"));
    return o && typeof o === "object" && !Array.isArray(o) ? o : null;
  } catch {
    /* Tệp chưa có (lượt chạy đầu tiên) đọc y hệt tệp hỏng, và cả hai đều KHÔNG phải chuyện đáng
     * làm máy chủ không bật được. Một bộ chẩn đoán làm hỏng thứ nó đi chẩn đoán thì tệ hơn là
     * không có nó — cùng bài với `G-91`. */
    return null;
  }
}

function khoang(msA, msB) {
  const giay = Math.max(0, Math.round((msB - msA) / 1000));
  if (giay < 60) return `${giay} giây`;
  if (giay < 3600) return `${Math.round(giay / 60)} phút`;
  return `${Math.floor(giay / 3600)}h ${Math.round((giay % 3600) / 60)}m`;
}

/**
 * Một câu cho lượt chạy TRƯỚC, in ra lúc khởi động. `null` = không có gì đáng nói.
 *
 * Trả `null` cho lượt đầu tiên và cho lượt đóng tử tế: một dòng *"lần trước ổn"* in ở mọi lượt
 * bật sẽ dạy người đọc bỏ qua chỗ ấy, rồi lần thật sự có chuyện họ cũng bỏ qua nốt.
 */
export function cauChanDoan(truoc) {
  if (!truoc || typeof truoc.bat_luc !== "string") return null;
  if (truoc.tat_sach === true) return null;

  const song = typeof truoc.con_song_luc === "string" ? truoc.con_song_luc : truoc.bat_luc;
  const tBat = Date.parse(truoc.bat_luc);
  const tSong = Date.parse(song);
  const soLuot = Number.isFinite(truoc.so_luot) ? truoc.so_luot : null;

  return (
    `[đời sống] Lượt chạy TRƯỚC (pid ${truoc.pid ?? "?"}) KHÔNG chào tạm biệt. ` +
    `Bật lúc ${truoc.bat_luc}, còn thấy sống lúc ${song}` +
    (Number.isFinite(tBat) && Number.isFinite(tSong) ? ` (sống được ${khoang(tBat, tSong)})` : "") +
    (soLuot === null ? "" : `, đã phục vụ ${soLuot} lượt gọi`) + ". " +
    "Nó bị GIẾT TỪ NGOÀI — `TerminateProcess` của Windows không gửi tín hiệu nào cho Node, nên " +
    "không có mã thoát nào để ghi. AI KHÔNG NÓI ĐƯỢC AI GIẾT; muốn biết thì phải bật kiểm toán " +
    "tiến trình của Windows, và đó là quyết định của Đức."
  );
}

/**
 * Bắt đầu theo dõi. Trả về `{ cau, dem }` — `cau` là câu chẩn đoán cho lượt trước (hoặc `null`),
 * `dem()` để đếm thêm một lượt gọi đã phục vụ.
 *
 * `nhip` mặc định 30 giây: nó là **độ rộng của cửa sổ** mà lần chết sau được khoanh vào, nên
 * ngắn hơn thì đoán gần hơn — và vì tệp bị ghi đè chứ không nối thêm, ngắn hơn KHÔNG tốn thêm
 * một byte nào.
 */
export function theoDoiDoiSong({ duong, pid, nhip = 30_000, ghi = writeFileSync, doc = readFileSync,
  now = Date.now, timers = globalThis, dangKy = process } = {}) {
  if (typeof duong !== "string" || duong === "") throw new TypeError("theoDoiDoiSong cần `duong`.");

  const cau = cauChanDoan(docLuotTruoc(duong, doc));
  const batLuc = new Date(now()).toISOString();
  let soLuot = 0;

  const luu = (tatSach, lyDo) => {
    try {
      ghi(duong, JSON.stringify({
        pid: pid ?? dangKy.pid, bat_luc: batLuc, con_song_luc: new Date(now()).toISOString(),
        so_luot: soLuot, tat_sach: tatSach, ly_do: lyDo ?? null,
      }, null, 1) + "\n");
    } catch { /* Vùng ghi đầy hay bị khoá KHÔNG được làm máy chủ chết — xem khối ở `docLuotTruoc`. */ }
  };

  luu(false, null);

  /* `unref` để cái đồng hồ này KHÔNG giữ tiến trình sống: một bộ chẩn đoán mà tự nó làm máy chủ
   * không thoát được thì chính nó thành cái lỗi tiếp theo. */
  const dongHo = timers.setInterval(() => luu(false, null), nhip);
  if (dongHo && typeof dongHo.unref === "function") dongHo.unref();

  /* CHỈ móc vào `exit`, không móc `uncaughtException`. Đăng ký `uncaughtException` sẽ CHẶN cú
   * sập mặc định của Node và đổi hành vi của máy chủ — một bộ đo không được phép làm thế. `exit`
   * vẫn chạy khi sập (mã 1) và khi `process.exit(0)` của tay nghe SIGINT/SIGTERM gọi tới, còn
   * dấu vết vì sao sập thì Node đã in sẵn ra `stderr`. Ghi ở đây phải ĐỒNG BỘ: `exit` không chờ
   * một lượt ghi bất đồng bộ nào. */
  dangKy.on("exit", (ma) => luu(true, `exit ${ma}`));

  return { cau, dem: () => { soLuot += 1; } };
}

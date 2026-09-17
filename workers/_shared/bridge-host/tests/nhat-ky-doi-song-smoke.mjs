/* Phép ghim cho NHẬT KÝ ĐỜI SỐNG — chạy không cần máy chủ, không cần đĩa.
 *
 * ─── KHỐI ĐẮT NHẤT LÀ ⓑ, VÀ NÓ KHÔNG PHẢI CÁI CÂU CHỮ ──────────────────────
 * Cả file này sinh ra để phân biệt **bị giết** với **tự đóng**. Một bộ đo chỉ hỏi *"có in ra câu
 * nào không"* sẽ xanh cho một bản in câu ấy ở **mọi** lượt bật — và một cảnh báo hiện ở mọi lượt
 * thì người đọc thôi đọc nó, đúng lúc nó thật sự có chuyện. Nên ⓑ đòi **hai lượt trái ngược cho
 * hai đầu vào trái ngược**, không đòi một lượt có chữ.
 *
 * Bài `assertion-must-distinguish-branches`, và lần này nó áp cho chính bộ đo của một bộ đo.
 */
import assert from "node:assert/strict";
import { docLuotTruoc, cauChanDoan, theoDoiDoiSong } from "../nhat-ky-doi-song.mjs";

const DUONG = "C:/khong-co-that/doi-song.json";

/* Đồng hồ giả và bộ đăng ký giả: file thật KHÔNG được chạm tới đĩa trong phép ghim, và tay nghe
 * `exit` thật thì chỉ chạy đúng một lần — lúc suite này thoát, tức quá muộn để kiểm. */
function dungSan() {
  const daGhi = [];
  const tay = new Map();
  let t = Date.parse("2026-09-17T10:00:00.000Z");
  return {
    daGhi, tay,
    tien: (ms) => { t += ms; },
    doiSo: () => ({
      duong: DUONG, pid: 4242,
      ghi: (d, chu) => daGhi.push({ duong: d, o: JSON.parse(chu) }),
      doc: () => { throw new Error("chua co tep"); },
      now: () => t,
      timers: { setInterval: (fn, ms) => {
        const h = { daUnref: false, unref() { h.daUnref = true; } };
        tay.set("nhip", { fn, ms, h });
        return h;
      } },
      dangKy: { pid: 4242, on: (ten, fn) => tay.set(ten, fn) },
    }),
  };
}

/* ---- ⓐ LƯỢT ĐẦU TIÊN: không có tệp thì KHÔNG ném, và KHÔNG bịa ra chẩn đoán --- */
{
  assert.equal(docLuotTruoc(DUONG, () => { throw new Error("ENOENT"); }), null);
  assert.equal(docLuotTruoc(DUONG, () => "{ day khong phai json"), null);
  assert.equal(docLuotTruoc(DUONG, () => "[1,2,3]"), null, "mảng KHÔNG phải một bản ghi");
  assert.equal(cauChanDoan(null), null);
}

/* ---- ⓑ HAI ĐẦU VÀO TRÁI NGƯỢC → HAI CÂU TRẢ LỜI TRÁI NGƯỢC ---------------
 * Thiếu vế thứ hai thì một bản LUÔN cảnh báo vẫn xanh. Đó đúng là bản hỏng. */
{
  const chung = { pid: 16152, bat_luc: "2026-09-17T07:19:24.000Z", con_song_luc: "2026-09-17T08:31:02.000Z", so_luot: 37 };

  const biGiet = cauChanDoan({ ...chung, tat_sach: false });
  assert.ok(biGiet, "lượt trước KHÔNG chào tạm biệt thì phải có câu chẩn đoán");
  assert.match(biGiet, /GI\u1ebeT T\u1eea NGO\u00c0I/);
  assert.ok(biGiet.includes("16152"), "phải in pid — không có nó thì không nối được với bảng tiến trình");
  assert.ok(biGiet.includes("08:31:02"), "phải in mốc CÒN THẤY SỐNG, đó là cửa sổ khoanh lần chết");
  assert.ok(biGiet.includes("37"), "phải in số lượt đã phục vụ");
  assert.match(biGiet, /1h 12m/, "phải đọc ra KHOẢNG SỐNG, không bắt người đọc trừ hai mốc ISO");

  assert.equal(cauChanDoan({ ...chung, tat_sach: true, ly_do: "exit 0" }), null,
    "đóng tử tế thì IM LẶNG — cảnh báo hiện ở mọi lượt bật là cảnh báo không ai đọc");
  /* Thiếu hẳn `tat_sach` cũng là chưa chào tạm biệt: một tệp cụt giữa chừng đọc y hệt một cú
   * giết, và đoán nó "chắc ổn" là fail-open đúng chỗ file này sinh ra để chặn. */
  assert.ok(cauChanDoan({ ...chung }), "thiếu `tat_sach` phải xử như CHƯA đóng tử tế");
}

/* ---- ⓒ Không có `bat_luc` thì KHÔNG chẩn đoán ---------------------------- */
{
  assert.equal(cauChanDoan({ pid: 9, tat_sach: false }), null,
    "một bản ghi không có mốc bật thì không nói được gì về khoảng sống — im lặng, đừng đoán");
}

/* ---- ⓓ GHI NGAY LÚC BẬT, và ghi `tat_sach: false` ------------------------
 * Ghi lúc đóng thôi thì đúng ca ta đi tìm — bị giết — sẽ KHÔNG ghi gì cả. */
{
  const s = dungSan();
  const { cau } = theoDoiDoiSong(s.doiSo());
  assert.equal(cau, null, "lượt đầu tiên không có gì để chẩn đoán");
  assert.equal(s.daGhi.length, 1, "phải ghi NGAY lúc bật");
  assert.equal(s.daGhi[0].o.tat_sach, false);
  assert.equal(s.daGhi[0].o.pid, 4242);
  assert.equal(s.daGhi[0].o.so_luot, 0);
}

/* ---- ⓔ NHỊP TIM đẩy mốc `con_song_luc` tới, và đồng hồ phải `unref` ------
 * `unref` là vế thật: thiếu nó, cái đồng hồ giữ tiến trình sống mãi và bộ chẩn đoán tự biến
 * thành lỗi tiếp theo. */
{
  const s = dungSan();
  const { dem } = theoDoiDoiSong(s.doiSo());
  const nhip = s.tay.get("nhip");
  assert.equal(nhip.ms, 30_000, "nhịp mặc định 30 giây — đó là ĐỘ RỘNG cửa sổ khoanh lần chết");
  /* KIỂM `unref`, không chỉ NÓI về nó trong chú thích. Bản đầu của khối này viết hẳn một câu
   * giải thích vì sao `unref` quan trọng rồi **không assert gì cả** — con đột biến gỡ `unref`
   * sống sót ngay lượt chạy đầu. Một lời giải thích không phải một phép kiểm. */
  assert.equal(nhip.h.daUnref, true,
    "đồng hồ phải `unref` — thiếu nó thì chính bộ chẩn đoán giữ máy chủ không thoát được");

  dem(); dem();
  s.tien(30_000);
  nhip.fn();

  const cuoi = s.daGhi.at(-1).o;
  assert.equal(cuoi.so_luot, 2, "nhịp tim phải mang theo số lượt đã phục vụ");
  assert.equal(cuoi.tat_sach, false, "còn sống thì vẫn là CHƯA đóng tử tế");
  assert.notEqual(cuoi.con_song_luc, s.daGhi[0].o.con_song_luc, "mốc còn-sống phải tiến lên");
  assert.equal(cuoi.bat_luc, s.daGhi[0].o.bat_luc, "mốc BẬT thì không được đổi");
}

/* ---- ⓕ ĐÓNG TỬ TẾ ghi `tat_sach: true` kèm mã thoát ---------------------- */
{
  const s = dungSan();
  theoDoiDoiSong(s.doiSo());
  const tayExit = s.tay.get("exit");
  assert.equal(typeof tayExit, "function", "phải móc vào `exit`");
  assert.equal(s.tay.has("uncaughtException"), false,
    "KHÔNG được móc `uncaughtException` — móc vào là chặn cú sập mặc định, tức bộ đo đổi hành vi máy chủ");

  tayExit(0);
  const cuoi = s.daGhi.at(-1).o;
  assert.equal(cuoi.tat_sach, true);
  assert.equal(cuoi.ly_do, "exit 0");
}

/* ---- ⓖ Ổ ĐĨA HỎNG KHÔNG ĐƯỢC GIẾT MÁY CHỦ ------------------------------- */
{
  const s = dungSan();
  const doiSo = { ...s.doiSo(), ghi: () => { throw new Error("EACCES"); } };
  assert.doesNotThrow(() => theoDoiDoiSong(doiSo),
    "không ghi được nhật ký thì máy chủ vẫn phải chạy — bộ chẩn đoán làm hỏng thứ nó chẩn đoán là ca tệ nhất");
}

console.log("  · bridge-host nhat-ky-doi-song: 7 khối xanh");

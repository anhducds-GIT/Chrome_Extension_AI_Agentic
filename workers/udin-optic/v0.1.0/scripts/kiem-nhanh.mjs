/* kiem-nhanh.mjs — "Kiểm tra kết nối", chạy TỪ TRONG bảng bên. Đức chốt 15/09.
 *
 * ─── NĂM BƯỚC, KHÔNG PHẢI SÁU — và lý do không phải là cắt bớt ─────────────
 * Lộ trình `U3` viết là *"chạy đúng sáu bước của `kiem-cai-dat.mjs` từ trong bảng bên,
 * bước ① hỏi `bridge.sessions`"*. **Đo 16/09: bảng bên KHÔNG hỏi được `bridge.sessions`.**
 * Đọc `scouter-transport-loopback.mjs`: extension chỉ gửi ra dây đúng ba loại khung —
 * `auth`, `keepalive`, `rpc_response`. Nó **chỉ trả lời**, không có đường phát đi một yêu
 * cầu. Mở đường đó là đổi hình dạng dây, tức đổi luật an toàn → phải hỏi Đức → chuỗi dừng.
 *
 * Nên bộ kiểm này hỏi **cùng những câu ấy từ phía bên kia**, bằng thứ bảng bên vốn có:
 *
 * | `kiem-cai-dat.mjs` (dòng lệnh, đứng ở phía MÁY CHỦ) | ở đây (đứng ở phía EXTENSION) |
 * |---|---|
 * | ① `bridge.sessions` — máy chủ có trả lời không | ① trạng thái dây trong kho lưu |
 * | ② `system.ping` tới ghế — ghế có đáp không | *gộp vào ①: bảng bên **là** cái ghế đó* |
 * | ③ `system.capabilities` | ② `capabilities()` gọi thẳng |
 * | ④ `scout.targets` | ③ quét target thẳng |
 * | ⑤ `scout.query` | ④ dò thật một trang |
 * | ⑥ công tắc ghi | ⑤ đọc công tắc thẳng |
 *
 * Bước ② của bản dòng lệnh **biến mất chứ không bị bỏ**: nó hỏi *"cái ghế kia còn sống
 * không"*, mà ở đây người hỏi chính là cái ghế. Câu ấy ở phía này là hằng đúng.
 *
 * ─── HỎNG PHẢI NÓI ĐƯỢC LÀM GÌ TIẾP ────────────────────────────────────────
 * Đức đọc bảng này chứ không đọc mã. Một bước đỏ ghi "lỗi" thì không dùng được; nó phải
 * nói ra **câu tiếp theo anh ấy cần làm**. Và "máy chủ chưa chạy" phải khác hẳn "chưa
 * chọn tệp ghép cặp" — hai việc khác nhau, hai câu khác nhau.
 *
 * ─── DỪNG Ở BƯỚC HỎNG ĐẦU TIÊN ─────────────────────────────────────────────
 * Y như bản dòng lệnh: bước sau không có nghĩa khi bước trước đã gãy. Chạy tiếp cho đủ
 * danh sách chỉ đẻ thêm bốn dòng đỏ ăn theo, và chôn mất dòng đỏ thật.
 *
 * File này KHÔNG đụng `chrome`, `document` hay `window` — mọi thứ đi vào qua `do_`. Nhờ thế
 * phép ghim gọi được hàm thật, thay vì dò chữ trong `sidepanel.js`.
 */

/** Số method của gói này. Lệch số = Chrome đang chạy một bản KHÁC bản trong thư mục này. */
export const SO_METHOD = 12;

/** Trạng thái dây → một câu cho người đọc, và một câu bảo làm gì. */
const CUA_DAY = {
  connected: { dat: true, noi: "đã nối máy chủ Bridge trên máy này", lamGi: null },
  disconnected: {
    dat: false,
    noi: "chưa nối được máy chủ Bridge",
    lamGi: "Máy chủ Bridge của Udin chưa chạy. Chạy `bridge/Chay-may-chu-Udin.cmd` " +
           "(hoặc kéo tệp ghép cặp thả vào nó), rồi bấm lại nút này."
  },
  unpaired: {
    dat: false,
    noi: "chưa chọn tệp ghép cặp",
    lamGi: "Ở khối 'Kết nối Bridge' ngay trên, chọn tệp ghép cặp mà bộ cài đã tạo. " +
           "Chưa có tệp đó thì chạy `tao-tep-ghep-cap.mjs --goi udin-optic` trước."
  }
};

/**
 * `do_` là năm phép dò thật, bơm vào từ bảng bên:
 *   `day()`      → chuỗi trạng thái (`connected` · `disconnected` · `unpaired`)
 *   `nangLuc()`  → `{ methods: [{ name, read_only }] }`
 *   `quetTab()`  → mảng target
 *   `doTrang(t)` → số phần tử `body` khớp trên target `t`
 *   `congTac()`  → `{ enabled, remaining, cap_per_unlock }`
 *
 * Trả `{ dat, buoc: [{ ten, dat, noi, lamGi }] }`.
 */
export async function kiemNhanh(do_, tuyChon = {}) {
  const mien = tuyChon.mien || "vinfast.udinbv.com";
  const buoc = [];
  const them = (ten, dat, noi, lamGi = null) => { buoc.push({ ten, dat, noi, lamGi }); return dat; };
  const ket = () => ({ dat: buoc.every((b) => b.dat), buoc });

  /* ① CỬA BRIDGE. Đây là bước duy nhất trả lời được câu "máy chủ có chạy không", và nó trả
   * lời gián tiếp: dây đứt thì `transport` ghi `disconnected` xuống kho lưu. Nói thẳng giới
   * hạn đó trong chính câu trả lời chứ không giấu — trạng thái là thứ ghế này NHÌN THẤY, và
   * nó trễ đúng một nhịp thử nối lại. */
  let day;
  try { day = await do_.day(); }
  catch (loi) {
    them("① Cửa Bridge", false, `không đọc được trạng thái dây (${loi?.message || loi})`,
      "Đóng rồi mở lại bảng bên. Vẫn thế thì vào chrome://extensions nạp lại tiện ích.");
    return ket();
  }
  const cua = CUA_DAY[day] || {
    dat: false, noi: `trạng thái lạ: ${day}`,
    lamGi: "Nạp lại tiện ích ở chrome://extensions rồi bấm lại."
  };
  them("① Cửa Bridge", cua.dat, cua.noi, cua.lamGi);
  if (!cua.dat) return ket();

  /* ② TỪ VỰNG. Con số là hợp đồng: thêm một method là đổi luật an toàn (luật gói ⑴ ⑷). */
  let nl;
  try { nl = await do_.nangLuc(); }
  catch (loi) { them("② Từ vựng", false, String(loi?.message || loi), "Nạp lại tiện ích rồi bấm lại."); return ket(); }
  const ms = nl?.methods || [];
  const ghi = ms.filter((m) => m.read_only === false).length;
  const dungSo = ms.length === (tuyChon.soMethod ?? SO_METHOD);
  them("② Từ vựng", dungSo, `${ms.length} lệnh · ${ghi} lệnh ghi · ${ms.length - ghi} lệnh chỉ đọc`,
    dungSo ? null : `Chờ ${tuyChon.soMethod ?? SO_METHOD} lệnh mà thấy ${ms.length} — Chrome đang chạy một bản KHÁC bản trong thư mục này. Vào chrome://extensions bấm nạp lại đúng tiện ích đó.`);
  if (!dungSo) return ket();

  /* ③ THẤY TAB. Đây là ca hay gặp nhất sau khi cài: mọi thứ xanh mà không làm được gì, vì
   * không có tab nào để nhìn. */
  let tab = [];
  try { tab = await do_.quetTab(); }
  catch (loi) { them("③ Nhìn thấy tab", false, String(loi?.message || loi), "Nạp lại tiện ích rồi bấm lại."); return ket(); }
  const web = (tab || []).filter((t) => typeof t.url === "string" && /^https?:/.test(t.url));
  const cuaUdin = web.filter((t) => { try { return new URL(t.url).hostname === mien; } catch { return false; } });
  them("③ Nhìn thấy tab", web.length > 0,
    `${web.length} tab web${cuaUdin.length ? `, trong đó ${cuaUdin.length} tab ${mien}` : `, KHÔNG có tab ${mien} nào`}`,
    web.length > 0 ? null : `Mở một tab http hoặc https trong CHÍNH cửa sổ Chrome đã nạp tiện ích. Trang 'file:' và 'chrome://' không dò được, cố ý.`);
  if (web.length === 0) return ket();

  /* ④ ĐỌC THẬT MỘT TRANG. Ba bước trên mới chứng minh dây thông và bảng lệnh đủ; bước này
   * chứng minh `chrome.debugger` gắn được — thứ duy nhất không suy ra được từ ba bước kia.
   * Ưu tiên tab Udin: đó là tab gói này sinh ra để làm việc, và nếu chỉ tab ấy hỏng thì ba
   * bước trên vẫn xanh trong khi việc thật vẫn không chạy. */
  const dich = (cuaUdin[0] || web[0]);
  let khop = null, noi = "";
  try { khop = await do_.doTrang(dich); noi = `đọc được ${dich.url} (body khớp ${khop})`; }
  catch (loi) { noi = String(loi?.message || loi); }
  const docDuoc = khop === 1;
  them("④ Đọc được trang", docDuoc, noi,
    docDuoc ? null : "Phép dò không gắn được vào tab. Thường là đang có một cửa sổ DevTools mở trên chính tab đó — đóng nó rồi bấm lại.");
  if (!docDuoc) return ket();

  /* ⑤ CÔNG TẮC GHI. ĐÓNG KHÔNG PHẢI HỎNG — nó là mặc định và là một lớp bảo vệ. Nên bước này
   * LUÔN ĐẠT; nó chỉ nói ra công tắc đang ở đâu, để đừng ai tưởng mình cài sai.
   * Và nó KHÔNG thử ghi: bản dòng lệnh tiêu một lượt trong trần 200 để thử, ở đây thì không
   * cần — bảng bên đọc thẳng được trạng thái công tắc, nên đo mà không tốn gì. */
  let ct = null;
  try { ct = await do_.congTac(); }
  catch (loi) { them("⑤ Công tắc ghi", true, `không đọc được (${loi?.message || loi})`, null); return ket(); }
  them("⑤ Công tắc ghi", true,
    ct?.enabled
      ? `ĐANG MỞ — còn ${ct.remaining}/${ct.cap_per_unlock} lượt của lần bật này`
      : "ĐANG ĐÓNG — đúng mặc định. Muốn Udin bấm và gõ thì bật công tắc ở đầu bảng.",
    null);
  return ket();
}

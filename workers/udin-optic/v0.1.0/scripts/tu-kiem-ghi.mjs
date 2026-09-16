/* tu-kiem-ghi.mjs — ĐƯỜNG GHI TỰ KIỂM: phần THUẦN LOGIC (`S1`, `S2`).
 *
 * ─── VIỆC NÓ LÀM, ĐÚNG MỘT CÂU ──────────────────────────────────────────────
 * Cho hai lần đọc cùng một ô nhập — TRƯỚC và SAU khi gõ — nó trả lời: *trang có thật sự nhận
 * chữ không*. Ba câu trả lời, không phải hai:
 *
 *   · **khớp**          → `da_kiem: true`;
 *   · **không đọc được** → `da_kiem: false` kèm MỘT CÂU nói vì sao (ô che chữ, cây bị cắt,
 *                          phần tử biến mất) — không ném, và cũng không im lặng báo đạt;
 *   · **lệch**          → **NÉM** `WRITE_NOT_OBSERVED`.
 *
 * Vì sao nhánh thứ ba ném chứ không trả về một cái cờ buồn: một phong bì `ok: true` chở một
 * thất bại là thứ người gọi phải NHỚ MÀ BÓC, và sớm muộn sẽ có người quên. Cùng lý lẽ mà
 * `scouter-seed-core.mjs` đã dùng cho `runProbe`/`runAction`.
 *
 * ─── VÌ SAO ĐẾM, KHÔNG PHẢI "CÓ CHỨA" ───────────────────────────────────────
 * `input.type` KHÔNG xoá chữ cũ, nên ô có thể đã sẵn chữ — kể cả đúng chuỗi sắp gõ. Một phép
 * `sau.includes(daGo)` sẽ ĐẠT cho một lượt gõ chưa bao giờ tới trang, chỉ vì chữ ấy vốn đã
 * nằm đó. Một phép kiểm đạt dưới CẢ HAI nhánh là một màu xanh giả. Nên: đếm số lần chuỗi xuất
 * hiện trước, đếm lại sau, và đòi con số TĂNG.
 *
 * ─── KHÔNG BAO GIỜ IN LẠI CHỮ ĐÃ GÕ ─────────────────────────────────────────
 * Mọi câu giải thích ở đây nói bằng ĐỘ DÀI và SỐ LẦN, không bao giờ chở nội dung ô nhập ra
 * ngoài. Đo 16/09: ô `type="password"` trả về chuỗi dấu chấm tròn qua đường trợ năng — tức
 * đường đọc lại đi thẳng qua chỗ mật khẩu nằm. Nhánh `laChe` bên dưới sinh ra từ phép đo đó.
 *
 * File này KHÔNG biết `chrome`, không biết Bridge, không biết tên gói — nó nhận hai bản đọc
 * và trả một lời phán. Nhờ thế nó chép sang gói khác được nguyên văn, và phép ghim chạy không
 * cần trình duyệt.
 */

/* Mã lỗi DUY NHẤT của nhánh "lệch". Người gọi ở đầu dây kia đọc đúng chữ này để phân biệt
 * *"tôi gõ mà trang không nhận"* với *"lệnh gõ hỏng"* — hai chuyện khác nhau, hai cách chữa
 * khác nhau. */
export const MA_KHONG_QUAN_SAT = "WRITE_NOT_OBSERVED";

/* Mã lỗi của nhánh "xoá mà ô vẫn còn chữ" (`S-27`). Tách khỏi `WRITE_NOT_OBSERVED` vì hai
 * chuyện khác nhau và cách chữa khác nhau: một bên là *chữ không tới được ô*, bên này là
 * *chữ không rời khỏi ô*. Gộp chung thì người ở đầu dây kia phải đọc câu văn mới biết mình
 * đang gặp cái nào. */
export const MA_XOA_KHONG_SACH = "CLEAR_NOT_OBSERVED";

export class TuKiemError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "TuKiemError";
    this.code = code;
  }
}

/* Ký tự CHE của các ô giấu nội dung. Chrome trả `•` cho `type="password"`; mấy ký tự còn lại
 * là những thứ trang tự vẽ ra khi che bằng CSS/JS. Danh sách này KHÔNG cần phủ hết mọi cách
 * che trên đời — thiếu một ký tự thì nhánh này không bắt được và lượt đọc rơi xuống nhánh
 * "lệch" (ném), tức là ngả AN TOÀN: báo chưa quan sát được, không phải báo đạt. */
const KY_TU_CHE = new Set([..."•●○*·×∙"]);

/** Ô có đang che nội dung không: có chữ, mà chữ toàn ký tự che. */
export function laChe(gia) {
  const chu = typeof gia === "string" ? gia.trim() : "";
  if (chu === "") return false;
  return [...chu].every((k) => KY_TU_CHE.has(k));
}

/** Đếm số lần `tim` xuất hiện trong `trong`, KHÔNG chồng lấn. Chuỗi rỗng → 0. */
export function demLan(trong, tim) {
  if (typeof trong !== "string" || typeof tim !== "string" || tim === "") return 0;
  let dem = 0;
  let tu = 0;
  for (;;) {
    const thay = trong.indexOf(tim, tu);
    if (thay === -1) return dem;
    dem += 1;
    tu = thay + tim.length;
  }
}

/* Câu khai của một cú BẤM không có gì để đọc lại (`S2`). Để ở đây chứ không gõ thẳng vào
 * `scouter-seed-core.mjs` vì đây là chỗ bản chép sang gói khác đi qua — một câu gõ cứng ở lớp
 * nối dây sẽ lệch giữa hai gói ngay lượt sửa đầu tiên. */
export const CAU_BAM_KHONG_KIEM =
  "Đã bắn sự kiện chuột vào đúng phần tử đã khớp. KHÔNG kiểm được trang có phản ứng hay không: " +
  "một cú bấm không để lại dấu vết chung nào để đọc lại. Muốn kiểm thì đưa `wait_for` — " +
  "một selector phải xuất hiện (hoặc biến mất) sau cú bấm.";

/**
 * Phán một lượt gõ, từ hai bản đọc cùng một ô.
 *
 * @param {object}  a
 * @param {string}  a.daGo   chuỗi vừa gõ (KHÔNG bao giờ đi ra kết quả)
 * @param {object}  a.truoc  { docDuoc, gia, cat }  — bản đọc TRƯỚC khi gõ
 * @param {object}  a.sau    { docDuoc, gia, cat }  — bản đọc SAU khi gõ
 * @param {string}  a.cach   tên đường đọc đã dùng ("dom.text" | "a11y")
 * @returns {{da_kiem: boolean, kiem_bang: string|null, kiem_noi: string}}
 * @throws  {TuKiemError} mã `WRITE_NOT_OBSERVED` khi đọc được mà chữ không tăng thêm
 */
export function xetDocLai({ daGo, truoc, sau, cach }) {
  if (typeof daGo !== "string" || daGo === "") {
    throw new TuKiemError("TU_KIEM_SAI", "xetDocLai cần `daGo` là chuỗi không rỗng.");
  }
  const t = chuanBanDoc(truoc);
  const s = chuanBanDoc(sau);
  const ten = typeof cach === "string" && cach !== "" ? cach : "không rõ";

  /* ① KHÔNG ĐỌC ĐƯỢC — khai thẳng. Đòi CẢ HAI bản đọc chứ không chỉ bản sau: thiếu bản trước
   *    thì không có gì để so, và "có chứa" thì không phân biệt được hai nhánh (xem đầu file). */
  if (!t.docDuoc || !s.docDuoc) {
    return chuaKiem(`Không đọc lại được ô nhập bằng ${ten} ` +
      `(${!t.docDuoc ? "trước khi gõ" : "sau khi gõ"} không có bản đọc nào). ` +
      "Lượt gõ đã bắn đi, nhưng KHÔNG có bằng chứng trang đã nhận.");
  }

  /* ② Ô CHE NỘI DUNG. Đo 16/09: `type="password"` trả về dấu chấm tròn. So chuỗi chấm với chữ
   *    đã gõ sẽ ĐỎ ở mọi lượt gõ mật khẩu — một lời buộc tội sai. Khai là chưa kiểm được. */
  if (laChe(s.gia)) {
    return chuaKiem(`Ô che nội dung (đọc lại bằng ${ten} chỉ ra ${s.gia.length} ký tự che). ` +
      "Không có cách nào đối chiếu mà không đòi trang nhả chữ thật ra — nên KHÔNG kiểm.");
  }

  /* ③ ĐẾM, KHÔNG PHẢI "CÓ CHỨA". */
  const truocLan = demLan(t.gia, daGo);
  const sauLan = demLan(s.gia, daGo);
  if (sauLan > truocLan) {
    return {
      da_kiem: true,
      kiem_bang: ten,
      kiem_noi: `Đọc lại bằng ${ten}: chuỗi ${daGo.length} ký tự xuất hiện ${truocLan} lần trước ` +
        `khi gõ và ${sauLan} lần sau khi gõ — trang đã nhận.`
    };
  }

  /* ④ BỊ CẮT Ở TRẦN. Cả hai đường đọc đều có trần ký tự và cả hai đều KHAI khi đã cắt. Chữ vừa
   *    gõ có thể nằm ngoài chỗ bị cắt — nên đây là "không kiểm được", KHÔNG phải "lệch". Xếp
   *    nhánh này SAU phép đếm là cố ý: đếm thấy tăng thì đã đủ bằng chứng, cắt hay không
   *    không đổi kết luận. */
  if (t.cat || s.cat) {
    return chuaKiem(`Giá trị đọc lại bằng ${ten} đã bị cắt ở trần ký tự, nên chữ vừa gõ có thể ` +
      "nằm ngoài phần đọc được. KHÔNG kết luận lệch từ một bản đọc cụt.");
  }

  /* ⑤ LỆCH — ném. */
  throw new TuKiemError(MA_KHONG_QUAN_SAT,
    `Đã gõ ${daGo.length} ký tự, nhưng đọc lại bằng ${ten} thì chuỗi đó vẫn xuất hiện ` +
    `${sauLan} lần — y như trước khi gõ (${truocLan}). Trang KHÔNG nhận lượt gõ này. ` +
    "Đừng nới hạn chờ rồi đọc lại tới khi khớp: hạn chờ không phải nguyên nhân (`S-22`).");
}

/**
 * Phán một lượt XOÁ ô nhập (`S-27`), từ hai bản đọc cùng một ô.
 *
 * ─── VÌ SAO LUẬT Ở ĐÂY ĐƠN GIẢN HƠN `xetDocLai`, VÀ ĐÓ KHÔNG PHẢI NỚI TAY ───
 * *"Ô có rỗng không"* là một trạng thái **tuyệt đối**; *"ô có chứa chuỗi vừa gõ không"* thì
 * không — chuỗi ấy có thể vốn đã nằm sẵn ở đó, nên `xetDocLai` buộc phải ĐẾM. Ở đây không có
 * cái bẫy tương ứng: một ô rỗng là rỗng, không ai "rỗng sẵn hộ" nó theo nghĩa làm sai kết luận.
 *
 * ─── HAI PHÉP ĐO 16/09 ĐỔI HẲN HAI NHÁNH SO VỚI `xetDocLai` ─────────────────
 * Chrome sạch, bốn loại ô, gõ rồi xoá rồi đọc lại (`scripts/do-doc-lai.mjs`):
 *
 *   ⑴ **Ô rỗng đọc ra ĐÚNG chuỗi rỗng `""`** trên cả bốn loại — không khoảng trắng thừa,
 *      không mẩu `<br>` sót trong ô `contenteditable`. Nên phép so là `=== ""`, không phải
 *      một phép `trim` đoán chừng.
 *   ⑵ **Ô che nội dung KHÔNG còn là trạng thái thứ ba ở đây.** Với `xetDocLai`, `type="password"`
 *      trả dấu che nên không đối chiếu được — đó là cả lý do nhánh `laChe` ra đời. Nhưng sau khi
 *      XOÁ, chính ô ấy đọc ra `""` y như mọi ô khác; còn chữ thì nó trả dấu che, tức **vẫn còn
 *      chữ** — một câu trả lời rõ ràng, không phải một ô mù. Vậy `scout.clear` **kiểm được trên
 *      ô mật khẩu, trong khi `scout.type` thì không.**
 *
 * ─── VÌ SAO KHÔNG CÓ NHÁNH "BẢN ĐỌC BỊ CẮT" ────────────────────────────────
 * `xetDocLai` phải có nhánh đó: chữ vừa gõ có thể nằm ngoài phần bị cắt, nên cắt = chưa biết.
 * Ở đây thì ngược — một bản đọc BỊ CẮT theo định nghĩa là một bản đọc **có chữ**, tức ô KHÔNG
 * rỗng, tức đã trả lời xong. Cùng một lá cờ `cat`, hai ý nghĩa, vì hai câu hỏi khác nhau.
 *
 * @param {object} a
 * @param {object} a.truoc  { docDuoc, gia, cat } — bản đọc TRƯỚC khi xoá
 * @param {object} a.sau    { docDuoc, gia, cat } — bản đọc SAU khi xoá
 * @param {string} a.cach   tên đường đọc đã dùng ("dom.text" | "a11y")
 * @returns {{da_kiem: boolean, kiem_bang: string|null, kiem_noi: string}}
 * @throws  {TuKiemError} mã `CLEAR_NOT_OBSERVED` khi đọc lại được mà ô vẫn còn chữ
 */
export function xetXoaSach({ truoc, sau, cach }) {
  const t = chuanBanDoc(truoc);
  const s = chuanBanDoc(sau);
  const ten = typeof cach === "string" && cach !== "" ? cach : "không rõ";

  /* ① KHÔNG ĐỌC LẠI ĐƯỢC — khai thẳng. Chỉ đòi bản đọc SAU: bản trước chỉ làm câu giải thích
   *    giàu hơn, nó không tham gia vào phép phán. */
  if (!s.docDuoc) {
    return chuaKiem(`Không đọc lại được ô nhập bằng ${ten} sau khi xoá. Hai phím đã bắn đi, ` +
      "nhưng KHÔNG có bằng chứng ô đã sạch.");
  }

  /* ② CÒN CHỮ — ném. Kể cả chữ ấy là dấu che: dấu che nghĩa là CÒN NỘI DUNG (xem phép đo ⑵). */
  if (s.gia !== "") {
    throw new TuKiemError(MA_XOA_KHONG_SACH,
      `Đã bắn Ctrl+A rồi Delete, nhưng đọc lại bằng ${ten} thì ô vẫn còn ${s.gia.length} ký tự` +
      `${laChe(s.gia) ? " (ô che nội dung — dấu che nghĩa là CÒN chữ, không phải không đọc được)" : ""}. ` +
      "Ô CHƯA sạch. Đừng gõ đè lên: `scout.type` không xoá ô, nên lượt gõ sau sẽ dính vào phần còn lại.");
  }

  /* ③ RỖNG. Hai câu khác nhau, và khác biệt này KHÔNG phải để cho đẹp: nếu trước đó ô vốn đã
   *    rỗng thì lượt này xác nhận TRẠNG THÁI, nhưng không chứng minh được hai phím có tới trang
   *    hay không — ô rỗng vẫn rỗng dù lệnh có chạy hay không. Người gọi nào đang dùng lượt xoá
   *    để thử đường ghi thì phải đọc được câu đó, chứ không chỉ thấy `da_kiem: true`. */
  const goc = { da_kiem: true, kiem_bang: ten, kiem_noi: "" };
  if (t.docDuoc && t.gia !== "") {
    goc.kiem_noi = `Đọc lại bằng ${ten}: ô có ${t.gia.length} ký tự trước khi xoá và rỗng sau ` +
      "khi xoá — hai phím đã tới trang và ô đã sạch.";
    return goc;
  }
  goc.kiem_noi = `Đọc lại bằng ${ten}: ô rỗng sau khi xoá, nhưng ` +
    `${t.docDuoc ? "nó VỐN ĐÃ rỗng trước lệnh" : "không đọc được ô trước lệnh"} — ` +
    "lượt này xác nhận TRẠNG THÁI của ô, KHÔNG chứng minh hai phím đã tới trang.";
  return goc;
}

function chuaKiem(noi) {
  return { da_kiem: false, kiem_bang: null, kiem_noi: noi };
}

function chuanBanDoc(ban) {
  const o = ban && typeof ban === "object" ? ban : {};
  return {
    docDuoc: o.docDuoc === true && typeof o.gia === "string",
    gia: typeof o.gia === "string" ? o.gia : "",
    cat: o.cat === true
  };
}

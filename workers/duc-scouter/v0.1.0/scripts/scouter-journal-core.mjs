/* scouter-journal-core.mjs — SỔ CÔNG VIỆC: thứ duy nhất cho bảng bên biết AI đã làm gì.
 *
 * VÌ SAO CÓ FILE NÀY (07/09). Bản vẽ giao diện v1 có một khối "tiến độ thuần hoá trang web" —
 * ý mạnh nhất trong cả bản vẽ, vì nó là chỗ duy nhất trả lời được "đã đi tới đâu" thay vì
 * "hiện đang ra sao". Nhưng bản vẽ ghi `6 / 8` ở đầu khối trong khi danh sách ngay dưới chỉ có
 * 4 dấu tích. Hai con số về CÙNG một thứ, cách nhau ba phân, lệch nhau hai mục.
 *
 * Lỗi đó không phải lỗi vẽ. Nó là hệ quả của việc **không có nguồn sự thật nào để vẽ theo**.
 * Con số nào không đọc ra được từ dữ liệu thì sớm muộn có người gõ tay, và chữ gõ tay thì
 * không bao giờ tự sửa. File này là cái nguồn đó.
 *
 * BA BẤT BIẾN — mất cái nào thì sổ này thành thứ tệ hơn cả không có, vì nó nói dối có thẩm quyền:
 *
 *   ⑴ CHỈ GHI THỨ ĐÃ CHẠY XONG VÀ ĐÃ THÀNH CÔNG. Không có đường nào đánh dấu một mục vì
 *      "chắc là được". Một lệnh ném lỗi thì vào phần hoạt động (để Đức thấy nó hỏng) nhưng
 *      KHÔNG cộng vào tiến độ. Tiến độ là bằng chứng, không phải dự định.
 *
 *   ⑵ TIẾN ĐỘ KHOÁ THEO TÊN MIỀN, VÀ TÊN MIỀN LẤY LÚC GHI — không phải lúc đọc. Một `target_id`
 *      chỉ sống bằng tuổi của cái tab; đóng tab là mất. Nếu để bảng bên tự tra ngược lúc vẽ thì
 *      mọi việc đã làm hôm qua đều thành vô chủ. Đó là khác biệt giữa một cuốn sổ và một cái
 *      đèn báo.
 *
 *   ⑶ GHI HỎNG THÌ IM, KHÔNG LÀM HỎNG LƯỢT GỌI. Sổ này phục vụ con mắt của Đức; đường ghi của
 *      AI không được chết vì cuốn sổ đầy. Mọi lối ra của `boc()` đều trả về đúng phong bì mà
 *      dispatch gốc trả, kể cả khi phần ghi sổ ném lỗi.
 */

const JOURNAL_STORAGE_KEY = "scouter.journal.v1";

/* `system.ping` đập liên tục theo nhịp lưới đỡ. Để nó vào thì danh sách "hoạt động gần nhất"
 * 100% là ping và 0% là việc thật — tức là mất luôn cái khối đó. Đây là phép lọc DUY NHẤT;
 * mọi method khác đều được ghi, kể cả method hỏng. */
const KHONG_GHI = new Set(["system.ping"]);

const RING_TOI_DA = 40;   /* hoạt động gần nhất giữ bao nhiêu dòng */
const TRANG_TOI_DA = 20;  /* nhớ tiến độ của bao nhiêu tên miền, quá thì bỏ cái cũ nhất */

/* ---- TÁM MỐC THUẦN HOÁ ---------------------------------------------------
 * Mỗi mốc buộc vào ĐÚNG MỘT method. Đó là điều kiện để bất biến ⑴ đứng được: một mốc không
 * chỉ ra được lệnh nào chứng minh nó thì không có cách nào đánh dấu nó mà không đoán.
 *
 * Bản vẽ v1 có hai mốc "Xác minh thành công" và "Ổn định — thử lại nhiều lần". Cả hai đã bị
 * BỎ, cố ý: không lệnh nào chứng minh được chúng, nên chúng chỉ có thể được tích bằng cách
 * đoán — đúng cái mà dòng chữ "Không tự đánh dấu" ngay dưới bản vẽ cấm.
 *
 * Thứ tự là thứ tự người ta thật sự đi khi thuần hoá một trang: nhìn → tìm → nhìn kỹ → chạm. */
const MOC_THUAN_HOA = Object.freeze([
  { ma: "doc-trang", method: "scout.page",  ten: "Đọc được trang",       mota: "Lấy thông tin trang và danh sách phần tử bấm được" },
  { ma: "doc-cay",   method: "scout.tree",  ten: "Đọc được cây DOM",     mota: "Lấy cấu trúc trang theo tầng" },
  { ma: "tim-ten",   method: "scout.a11y",  ten: "Tìm control theo tên", mota: "Gọi đúng nút bằng tên, không cần selector" },
  { ma: "khop-chon", method: "scout.query", ten: "Khớp được selector",   mota: "Đếm xem một selector trúng mấy phần tử" },
  { ma: "chup-anh",  method: "scout.shot",  ten: "Chụp được màn hình",   mota: "Nhìn thấy trang bằng ảnh" },
  { ma: "go-chu",    method: "scout.type",  ten: "Gõ được chữ",          mota: "Nhập văn bản vào ô soạn" },
  { ma: "bam-nut",   method: "scout.click", ten: "Bấm được nút",         mota: "Bấm chuột thật, trang thấy isTrusted" },
  { ma: "nhan-phim", method: "scout.key",   ten: "Nhấn được phím",       mota: "Enter, Tab và các phím có tên" }
]);

const METHOD_CUA_MOC = new Set(MOC_THUAN_HOA.map((moc) => moc.method));

/* Tên miền, không phải cả địa chỉ. `https://chatgpt.com/c/abc-123` và `https://chatgpt.com/`
 * là CÙNG một trang cần thuần hoá; tách theo địa chỉ đầy đủ thì mỗi cuộc trò chuyện mới lại là
 * một trang lạ và tiến độ không bao giờ nhích. */
export function tenMien(url) {
  try {
    const u = new URL(String(url));
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.origin;
  } catch (_error) {
    return null;
  }
}

function soDuong(giaTri, macDinh = 0) {
  return Number.isInteger(giaTri) && giaTri >= 0 ? giaTri : macDinh;
}

/* Đọc bản ghi thô từ kho lưu và nắn về đúng hình. Kho lưu là thứ tồn tại qua nhiều phiên bản
 * của chính file này, nên KHÔNG được tin hình dạng của nó — một bản ghi cũ méo mà lọt vào phần
 * vẽ sẽ làm trắng bảng bên, và Đức sẽ thấy "extension hỏng" chứ không thấy "sổ cũ". */
export function nanSo(tho) {
  const trang = {};
  const nguon = tho && typeof tho === "object" && tho.trang && typeof tho.trang === "object" ? tho.trang : {};
  for (const [mien, ban] of Object.entries(nguon)) {
    if (!ban || typeof ban !== "object" || tenMien(mien) !== mien) continue;
    const moc = {};
    const nguonMoc = ban.moc && typeof ban.moc === "object" ? ban.moc : {};
    for (const [ten, o] of Object.entries(nguonMoc)) {
      if (!METHOD_CUA_MOC.has(ten) || !o || typeof o !== "object") continue;
      moc[ten] = { lan: soDuong(o.lan, 1), cuoi: soDuong(o.cuoi) };
    }
    trang[mien] = { moc, chamCuoi: soDuong(ban.chamCuoi) };
  }
  const hoatDong = Array.isArray(tho?.hoatDong)
    ? tho.hoatDong.filter((d) => d && typeof d === "object" && typeof d.method === "string").slice(0, RING_TOI_DA)
    : [];
  return { trang, hoatDong };
}

/* Tiến độ của MỘT tên miền, tính từ sổ. Cố ý KHÔNG nhận tham số "đã xong mấy mục" từ bên ngoài:
 * con số tổng và danh sách chi tiết phải ra từ CÙNG một lượt tính, nếu không thì lại đúng cái
 * lỗi `6/8` mà dưới nó chỉ có 4 dấu tích. */
export function tinhTienDo(so, mien) {
  const ban = mien ? so?.trang?.[mien] : null;
  const moc = MOC_THUAN_HOA.map((m) => {
    const o = ban?.moc?.[m.method];
    return { ...m, xong: Boolean(o), lan: o?.lan ?? 0, cuoi: o?.cuoi ?? 0 };
  });
  const xong = moc.filter((m) => m.xong).length;
  return { mien: mien || null, moc, xong, tong: MOC_THUAN_HOA.length, phanTram: Math.round((xong / MOC_THUAN_HOA.length) * 100) };
}

export function createJournal(deps = {}) {
  const chromeApi = deps.chromeApi;
  const now = typeof deps.now === "function" ? deps.now : () => Date.now();
  /* Tra tên miền từ `target_id`. Bơm vào thay vì gọi thẳng `chrome.debugger` để phép ghim chạy
   * được không cần trình duyệt — cùng quy ước với ba lõi kia. */
  const traUrl = typeof deps.traUrl === "function" ? deps.traUrl : async () => null;
  if (!chromeApi) throw new TypeError("Scouter journal needs chromeApi.");

  /* Đọc-sửa-ghi trên kho lưu chung, mà `dispatch` chạy song song được. Không xếp hàng thì hai
   * lượt ghi cùng lúc sẽ đọc cùng một bản cũ rồi cùng ghi đè — người ghi sau thắng, người ghi
   * trước biến mất không dấu vết. Đúng loại lỗi đã ăn một quyền sở hữu trong repo này ngày
   * 02/09; ở đây nó chỉ ăn một dòng nhật ký, nhưng cái giá của việc phòng nó là ba dòng. */
  let hangDoi = Promise.resolve();
  function xepHang(viec) {
    const ket = hangDoi.then(viec, viec);
    hangDoi = ket.then(() => {}, () => {});
    return ket;
  }

  async function doc() {
    try {
      const kho = await chromeApi.storage.local.get([JOURNAL_STORAGE_KEY]);
      return nanSo(kho?.[JOURNAL_STORAGE_KEY]);
    } catch (_error) {
      /* Kho hỏng thì trả sổ trắng, đừng ném. Bảng bên hiện "chưa có gì" là đúng sự thật mà nó
       * biết; hiện một trang lỗi thì không giúp được ai. */
      return { trang: {}, hoatDong: [] };
    }
  }

  async function ghiThat(method, targetId, ok, maLoi) {
    const luc = now();
    const so = await doc();

    so.hoatDong.unshift({ method, ok: Boolean(ok), ma: ok ? null : (maLoi || "ERROR"), luc, target_id: targetId || null });
    if (so.hoatDong.length > RING_TOI_DA) so.hoatDong.length = RING_TOI_DA;

    /* Bất biến ⑴: chỉ lượt THÀNH CÔNG mới chạm phần tiến độ. */
    if (ok && METHOD_CUA_MOC.has(method) && targetId) {
      /* Bất biến ⑵: tra tên miền NGAY BÂY GIỜ, lúc cái tab còn sống. */
      const mien = tenMien(await traUrl(targetId));
      if (mien) {
        const ban = so.trang[mien] || { moc: {}, chamCuoi: 0 };
        const cu = ban.moc[method];
        ban.moc[method] = { lan: (cu?.lan ?? 0) + 1, cuoi: luc };
        ban.chamCuoi = luc;
        so.trang[mien] = ban;

        const theoTuoi = Object.entries(so.trang).sort((a, b) => b[1].chamCuoi - a[1].chamCuoi);
        if (theoTuoi.length > TRANG_TOI_DA) so.trang = Object.fromEntries(theoTuoi.slice(0, TRANG_TOI_DA));
      }
    }

    await chromeApi.storage.local.set({ [JOURNAL_STORAGE_KEY]: so });
    return so;
  }

  /* Bất biến ⑶ sống ở đây, và chỉ ở đây: mọi lối vào phần ghi đều đi qua hàm này, và hàm này
   * không có đường nào ném ra ngoài. */
  function ghi(method, targetId, ok, maLoi) {
    if (typeof method !== "string" || KHONG_GHI.has(method)) return Promise.resolve(null);
    return xepHang(() => ghiThat(method, targetId, ok, maLoi)).then((so) => so, () => null);
  }

  return {
    doc,
    ghi,

    /* Bọc `dispatch` gốc. Cố ý KHÔNG sờ vào phong bì: đọc xong thì trả về đúng vật đã nhận, nên
     * một cuốn sổ hỏng không đổi được một byte nào của thứ AI nhận về.
     *
     * KHÔNG `await` lượt ghi sổ: ghi vào `storage.local` chậm hơn phần lớn các method, và bắt
     * AI chờ cuốn sổ của Đức là trả tiền cho một thứ AI không hề đọc. */
    boc(dispatch) {
      if (typeof dispatch !== "function") throw new TypeError("Scouter journal cannot wrap a non-function dispatch.");
      return async function dispatchCoSo(input) {
        const phongBi = await dispatch(input);
        const method = typeof input?.method === "string" ? input.method : null;
        if (method) {
          const targetId = typeof input?.params?.target_id === "string" ? input.params.target_id : null;
          ghi(method, targetId, phongBi?.ok === true, phongBi?.error?.code);
        }
        return phongBi;
      };
    }
  };
}

export const JOURNAL_CONSTANTS = Object.freeze({
  JOURNAL_STORAGE_KEY,
  KHONG_GHI,
  RING_TOI_DA,
  TRANG_TOI_DA,
  MOC_THUAN_HOA
});

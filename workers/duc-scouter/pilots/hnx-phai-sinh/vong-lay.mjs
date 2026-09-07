/* vong-lay.mjs — VÒNG LẤY DỮ LIỆU THEO NGÀY: lặp · không làm hai lần · chạy tiếp khi đứt.
 *
 * CHỖ ĐỨNG. File này nằm trong `pilots/`, không nằm trong seed — [ADR-0020](../../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md)
 * mục ⑶a. Nhưng nội dung của nó thì **không riêng của trang nào**: nó không biết `hnx.vn` là
 * gì, không biết tham số nào, không biết dữ liệu hình thù ra sao. Mọi hiểu biết về trang nằm ở
 * `nguon` bơm vào.
 *
 * Nên nó là **ứng viên đẩy lên seed** theo luật chiều-ngược của ADR-0009 mục ⑵ — nhưng chỉ SAU
 * khi nó chạy đúng một lần thật. Đẩy code chưa chứng minh lên seed là nhân bản một giả định.
 *
 * BA TÍNH CHẤT PHẢI GIỮ, và cả ba là điều kiện đóng của `S-10`:
 *
 *   ⑴ **Không làm hai lần.** Lượt chạy thứ hai không tải lại ngày đã có.
 *   ⑵ **Đứt thì chạy tiếp được.** Không có "bắt đầu lại từ đầu".
 *   ⑶ **Thử lại khi hụt** — nhưng CHỈ với lỗi đáng thử lại. Xem khối phân loại lỗi bên dưới.
 *
 * Ba tính chất đó đứng trên MỘT quyết định: **file đã ghi CHÍNH LÀ trạng thái.** Không có sổ
 * tiến độ riêng. Lý do: một cuốn sổ riêng thì lệch được với đĩa — ghi file xong mà chết trước
 * khi ghi sổ là lần sau tải lại; ghi sổ xong mà chết trước khi ghi file là lần sau bỏ sót. Cái
 * bỏ sót mới đáng sợ, vì nó im lặng. Lấy chính file làm sổ thì không có khe nào để lệch.
 */

/* Lỗi của tầng nguồn. `thuLai` là trường quan trọng nhất của cả file này. */
export class LoiNguon extends Error {
  constructor(ma, thongDiep, { thuLai = false, chiTiet } = {}) {
    super(thongDiep);
    this.name = "LoiNguon";
    this.ma = ma;
    this.thuLai = thuLai;
    this.chiTiet = chiTiet;
  }
}

/* ---- PHÂN LOẠI LỖI — chỗ dễ sai nhất, và sai thì tốn tiền thật ------------
 *
 * `scout.fetch` KHÔNG phải lệnh đọc: nó tiêu một lượt trong ngân sách 50 của cái phanh. Nên
 * "cứ thử lại cho chắc" không miễn phí — thử lại một yêu cầu SAI năm lần là đốt năm lượt để
 * nhận năm câu trả lời sai giống hệt nhau.
 *
 * BA NHÓM, ba cách xử khác hẳn nhau:
 *
 *   · ĐÁNG THỬ LẠI — mạng đứt, 5xx, quá hạn. Trang vẫn đúng, chỉ là lúc này không với tới.
 *
 *   · KHÔNG ĐÁNG THỬ LẠI, VÀ PHẢI DỪNG CẢ LƯỢT CHẠY — hình dạng trả về sai. Đây là cái bẫy đã
 *     ghi trong `S-10`: đoán sai tên tham số thì `hnx.vn` trả **200 OK kèm một trang HTML 43KB**,
 *     trông y hệt thành công. Nếu yêu cầu sai thì nó sai với MỌI ngày — chạy tiếp chỉ để đốt
 *     sạch ngân sách rồi báo "hỏng hết". Dừng ngay ở ngày đầu tiên là câu trả lời đúng.
 *
 *   · KHÔNG ĐÁNG THỬ LẠI, DỪNG CẢ LƯỢT — cái phanh chặn (công tắc tắt, hết 50 lượt). Thử lại
 *     một cái phanh là vô nghĩa; nó chỉ mở khi CON NGƯỜI mở.
 */
const MA_PHANH = new Set(["DEV_MODE_OFF", "WRITE_CAP_REACHED", "GATE_CORRUPT", "DEV_MODE_UNREADABLE", "GATE_NOT_RECORDED", "WRITE_BLOCKED"]);

export const KET_QUA = Object.freeze({
  DA_CO: "da-co",        /* đã có file, bỏ qua — đây là ⑴ và ⑵ */
  LAY_MOI: "lay-moi",
  TRONG: "trong",        /* trang trả lời đúng nhưng không có dữ liệu (ngày nghỉ) */
  HONG: "hong"
});

export function createVongLay(deps = {}) {
  const goi = deps.goi;
  const nguon = deps.nguon;
  const thuMuc = typeof deps.thuMuc === "string" ? deps.thuMuc : ".";
  const lanThuToiDa = Number.isInteger(deps.lanThuToiDa) ? deps.lanThuToiDa : 3;
  const ngu = typeof deps.ngu === "function" ? deps.ngu : (ms) => new Promise((r) => setTimeout(r, ms));
  const cho = typeof deps.cho === "function" ? deps.cho : (lan) => Math.min(30000, 1000 * 2 ** (lan - 1));
  const ghiLai = typeof deps.ghiLai === "function" ? deps.ghiLai : () => {};

  if (typeof goi !== "function" || !nguon || typeof nguon.tenFile !== "function"
      || typeof nguon.yeuCau !== "function" || typeof nguon.kiemTra !== "function") {
    throw new TypeError("Vòng lấy cần `goi` và một `nguon` có tenFile/yeuCau/kiemTra.");
  }

  /* Đọc thư mục MỘT LẦN cho cả lượt chạy, không hỏi lại từng ngày. Hỏi từng ngày là N lượt gọi
   * để trả lời một câu hỏi không đổi trong lúc chạy — và chính vòng này là thứ duy nhất thêm
   * file vào đó, nên nó tự biết mình vừa ghi gì. */
  async function daCoGi() {
    let ra;
    try {
      ra = await goi("file.list", { path: thuMuc });
    } catch (error) {
      /* Thư mục chưa tồn tại là chuyện BÌNH THƯỜNG ở lượt chạy đầu — `file.write` sẽ tự tạo.
       * Mọi lỗi khác thì ném, vì không đọc được thư mục nghĩa là không biết mình đã có gì, và
       * đoán ở đây là tải lại cả tuần. */
      if (error?.ma === "DIR_NOT_FOUND" || error?.code === "DIR_NOT_FOUND") return new Set();
      throw error;
    }
    const co = new Set();
    for (const muc of ra?.entries || []) {
      /* File 0 byte KHÔNG tính là đã có. Máy chủ chết giữa lượt ghi thì để lại đúng cái đó, và
       * coi nó là xong nghĩa là bỏ sót một ngày mãi mãi — im lặng, đúng loại tệ nhất. */
      if (muc?.kind === "file" && Number(muc.bytes) > 0) co.add(muc.name);
    }
    return co;
  }

  async function layMotNgay(ngay) {
    const yeuCau = nguon.yeuCau(ngay);
    let loiCuoi = null;

    for (let lan = 1; lan <= lanThuToiDa; lan += 1) {
      let phanHoi;
      try {
        phanHoi = await goi("scout.fetch", yeuCau);
      } catch (error) {
        /* Cái phanh chặn → dừng cả lượt, đừng thử lại. */
        const ma = error?.ma || error?.code;
        if (MA_PHANH.has(String(ma))) {
          throw new LoiNguon("PHANH_CHAN", `Cái phanh chặn đường ghi (${ma}). Bật công tắc trong bảng bên rồi chạy lại.`, { chiTiet: ma });
        }
        loiCuoi = new LoiNguon("GOI_HONG", String(error?.message || error), { thuLai: true, chiTiet: ma });
        ghiLai({ ngay, lan, ma: "GOI_HONG", thuLai: true });
        if (lan < lanThuToiDa) await ngu(cho(lan));
        continue;
      }

      /* Tầng nguồn quyết định phong bì này là dữ liệu thật hay một trang khác. Đây là chỗ DUY
       * NHẤT biết trang trông ra sao — vòng lặp cố ý mù về chuyện đó. */
      let doc;
      try {
        doc = nguon.kiemTra(phanHoi, ngay);
      } catch (error) {
        if (error instanceof LoiNguon && error.thuLai) {
          loiCuoi = error;
          ghiLai({ ngay, lan, ma: error.ma, thuLai: true });
          if (lan < lanThuToiDa) await ngu(cho(lan));
          continue;
        }
        /* Hình dạng sai → yêu cầu sai → sai với MỌI ngày. Ném ra ngoài để dừng cả lượt. */
        throw error;
      }

      if (doc?.trong === true) {
        ghiLai({ ngay, lan, ma: "TRONG" });
        return { trang_thai: KET_QUA.TRONG, ngay };
      }

      const ra = await goi("file.write", {
        path: `${thuMuc}/${nguon.tenFile(ngay)}`,
        content: doc.noiDung
      });
      ghiLai({ ngay, lan, ma: "LAY_MOI", bytes: ra?.bytes });
      return { trang_thai: KET_QUA.LAY_MOI, ngay, bytes: ra?.bytes ?? null };
    }

    return { trang_thai: KET_QUA.HONG, ngay, ma: loiCuoi?.ma ?? "KHONG_RO", chi_tiet: loiCuoi?.message ?? null };
  }

  return {
    daCoGi,

    /* Chạy một danh sách ngày. KHÔNG tự sinh danh sách — ngày nào là việc của người gọi, vì
     * "ngày giao dịch" là hiểu biết về thị trường, không phải về vòng lặp. */
    async chay(dsNgay) {
      const daCo = await daCoGi();
      const ket = [];

      for (const ngay of dsNgay) {
        if (daCo.has(nguon.tenFile(ngay))) {
          /* ⑴ và ⑵ nằm gọn ở đúng dòng này. */
          ket.push({ trang_thai: KET_QUA.DA_CO, ngay });
          continue;
        }
        const mot = await layMotNgay(ngay);
        ket.push(mot);
        if (mot.trang_thai === KET_QUA.LAY_MOI) daCo.add(nguon.tenFile(ngay));
      }

      const dem = (t) => ket.filter((k) => k.trang_thai === t).length;
      return {
        ket,
        tom_tat: {
          tong: ket.length,
          da_co: dem(KET_QUA.DA_CO),
          lay_moi: dem(KET_QUA.LAY_MOI),
          trong: dem(KET_QUA.TRONG),
          hong: dem(KET_QUA.HONG)
        }
      };
    }
  };
}

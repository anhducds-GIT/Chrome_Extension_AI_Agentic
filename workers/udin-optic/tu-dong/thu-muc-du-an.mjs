/* thu-muc-du-an.mjs — tên project → thư mục ra. Đức chốt 15/09:
 * *"các project, job khác nhau sẽ có kết xuất khác nhau"*.
 *
 * ─── HAI TẦNG, MỖI TẦNG MỘT NHỊP ĐỔI ───────────────────────────────────────
 *   · **vùng ghi** = ổ đĩa + thư mục gốc. Đức đặt MỘT LẦN cho cả máy, bằng một dòng trong
 *     `vung-ghi.txt` cạnh tệp ghép cặp. File này không biết gì về nó — máy chủ Bridge giữ.
 *   · **thư mục con** = `<du-an>/<lượt-chạy>`. AI đặt theo từng job. Đó là file này.
 *
 * Cả hai vẫn nằm SAU máy chủ Bridge, nên giữ nguyên hai lớp bảo vệ đã có: vùng ghi không
 * được chứa tệp ghép cặp, và trần kích thước tệp. Đường `showDirectoryPicker` của ba gói
 * `duc-auto-*` chết ở đây, lý do ghi trong `CHUOI-VIEC.md` ⓪b.
 *
 * ─── TỪ CHỐI, KHÔNG SỬA LÉN ────────────────────────────────────────────────
 * Tên xấu thì **ném kèm lý do**, tuyệt đối không tự dọn thành tên gần giống. Lặng lẽ đổi
 * `Dự án A` thành `Du-an-A` nghĩa là Đức đi tìm một thư mục không tồn tại, mà lượt chạy thì
 * báo xong — hỏng ở chỗ khó nhìn nhất. Thà đỏ ngay với một câu đọc được.
 */

/** Thư mục gốc của gói, nằm ngay dưới vùng ghi. */
export const THU_MUC_GOC = "udin-optic";

export const DAI_TOI_DA = 64;

/* Tên dành riêng của Windows. `CON` không tạo được thư mục, và lỗi Windows trả về đọc không
 * ra nguyên nhân — nên chặn ở đây, nơi còn nói được câu tử tế. */
const TEN_CAM_WINDOWS = new Set([
  "CON", "PRN", "AUX", "NUL",
  ...Array.from({ length: 9 }, (_, i) => `COM${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `LPT${i + 1}`)
]);

/**
 * Kiểm tên project. ĐẠT thì trả lại chính tên đó; không đạt thì **ném**, kèm lý do đọc được.
 * Không bao giờ trả về một tên đã bị sửa.
 */
export function kiemTenDuAn(ten) {
  if (typeof ten !== "string") {
    throw new Error(`Tên project phải là chữ, nhận được ${ten === null ? "null" : typeof ten}. Dùng: --du-an "xe-dien-2026".`);
  }
  if (ten !== ten.trim()) {
    /* Windows CẮT LẶNG dấu cách và dấu chấm ở cuối tên thư mục, nên `"A "` và `"A"` là cùng
     * một thư mục trên đĩa trong khi ở đây là hai chuỗi khác nhau. Từ chối chứ không trim. */
    throw new Error(`Tên project '${ten}' có dấu cách thừa ở đầu hoặc cuối. Bỏ đi rồi chạy lại — Windows cắt lặng chỗ đó, nên hai tên khác nhau sẽ ra cùng một thư mục.`);
  }
  if (ten === "") throw new Error("Tên project rỗng. Bỏ hẳn `--du-an` nếu không muốn chia theo project.");
  if (ten.length > DAI_TOI_DA) throw new Error(`Tên project dài ${ten.length} ký tự, tối đa ${DAI_TOI_DA}.`);
  if (ten.includes("/") || ten.includes("\\")) {
    throw new Error(`Tên project '${ten}' chứa dấu gạch chéo. Đây là MỘT TÊN, không phải một đường dẫn — thư mục con do máy đặt.`);
  }
  if (ten.includes("..")) throw new Error(`Tên project '${ten}' chứa '..' — đường đi ra ngoài vùng ghi, từ chối.`);
  if (ten.endsWith(".")) throw new Error(`Tên project '${ten}' kết thúc bằng dấu chấm. Windows cắt lặng dấu đó.`);
  if (/^[.\-]/.test(ten)) throw new Error(`Tên project '${ten}' bắt đầu bằng '.' hoặc '-'. Đặt chữ hoặc số ở đầu.`);
  if (TEN_CAM_WINDOWS.has(ten.toUpperCase())) {
    throw new Error(`'${ten}' là tên dành riêng của Windows — không tạo được thư mục tên đó. Đổi tên khác.`);
  }
  const xau = [...ten].find((c) => !/[A-Za-z0-9._-]/.test(c));
  if (xau !== undefined) {
    /* Nói ra ĐÚNG ký tự nào sai. "tên không hợp lệ" bắt Đức thử lại từng chữ một; dấu tiếng
     * Việt và dấu cách là hai ca hay gặp nhất và cả hai đều nhìn bằng mắt không ra. */
    const ten_kt = xau === " " ? "dấu cách" : `'${xau}'`;
    throw new Error(`Tên project '${ten}' chứa ${ten_kt}. Chỉ dùng chữ không dấu, số, '.', '_' và '-' — ví dụ 'xe-dien-2026'.`);
  }
  return ten;
}

/** Nhãn một lượt chạy: thời điểm, đã bỏ ký tự Windows không nhận (`:` trong giờ). */
export function nhanLuotChay(luc = new Date()) {
  return (luc instanceof Date ? luc.toISOString() : String(luc)).replace(/[:.]/g, "-");
}

/**
 * Đường thư mục ra, **tương đối với vùng ghi** — máy chủ Bridge ghép phần gốc.
 *
 * Không có `duAn` thì giữ NGUYÊN hình dạng cũ (`udin-optic/<lượt-chạy>`), để mọi lượt chạy
 * và mọi script đã có không gãy. Thêm một tầng chỉ khi có người xin nó.
 */
export function duongThuMuc({ duAn = null, dau = null } = {}) {
  const luot = dau || nhanLuotChay();
  if (duAn === null || duAn === undefined) return `${THU_MUC_GOC}/${luot}`;
  return `${THU_MUC_GOC}/${kiemTenDuAn(duAn)}/${luot}`;
}

/** Ghép vùng ghi (máy chủ khai) với đường tương đối, để in ra cho Đức mở bằng tay. */
export function duongDayDu(vungGhi, duongCon) {
  const goc = String(vungGhi || "").replace(/[\\/]+$/, "");
  /* Giữ dấu gạch theo kiểu của vùng ghi: Explorer nhận cả hai, nhưng một đường lai
   * `C:\x/y\z` dán vào ô địa chỉ trông như bị hỏng và Đức sẽ tưởng lượt chạy sai. */
  const nguoc = goc.includes("\\");
  const con = nguoc ? duongCon.replace(/\//g, "\\") : duongCon;
  return `${goc}${nguoc ? "\\" : "/"}${con}`;
}

/* vung-ghi.mjs — VÙNG GHI nằm ở đâu. Một luật, một chỗ.
 *
 * ─── VÌ SAO FILE NÀY TỒN TẠI ───────────────────────────────────────────────
 * Đức chốt 15/09: *"các project, job khác nhau sẽ có kết xuất khác nhau"*, và tầng trên của
 * câu đó — **ổ đĩa** — là thiết lập của MÁY, đặt một lần. Bản đầu (16/09) cài luật ấy vào
 * từng bộ khởi động, và hoá ra có **HAI** bộ khởi động:
 *
 *   · `bridge/Chay-may-chu-Udin.cmd`  — kéo-thả, nằm TRONG repo
 *   · `START-BRIDGE_Udin-Optic.ps1`   — thứ Đức thật sự bấm, nằm **NGOÀI** repo
 *
 * Hai bản của một luật thì sớm muộn lệch nhau — và ở đây tệ hơn thế: bản ngoài repo **không
 * ai ghim được**, git không thấy nó, một lượt cài lại máy là nó biến mất cùng cái luật. Nên
 * luật về ở đây, trong repo, có phép ghim đứng sau; hai bộ khởi động chỉ còn việc gọi vào.
 *
 * ─── THỨ TỰ, TỪ MẠNH ĐẾN YẾU ───────────────────────────────────────────────
 *   ⑴ `--root <đường-dẫn>`    — người khởi động khai thẳng, thắng tất
 *   ⑵ `vung-ghi.txt` cạnh tệp ghép cặp — **đây là dòng Đức sửa để đổi sang ổ `D:`**
 *   ⑶ `anh-ra` cạnh tệp ghép cặp — mặc định, y như từ trước tới nay
 *
 * KHÔNG đọc biến môi trường: vùng ghi là thứ quyết định file rơi xuống đâu, và một biến môi
 * trường vô hình đặt ở đâu đó ba tháng trước là đúng loại thứ không ai truy ra được.
 */

import fs from "node:fs";
import path from "node:path";

export const TEN_TEP_CAU_HINH = "vung-ghi.txt";
export const TEN_THU_MUC_MAC_DINH = "anh-ra";

/**
 * @param {object} o
 * @param {string}   o.duongGhepCap  đường tới tệp ghép cặp — mọi thứ neo vào thư mục chứa nó
 * @param {string?}  o.root          giá trị `--root` nếu người khởi động có khai
 * @param {object?}  o.tep           bơm hệ tệp vào để phép ghim chạy không cần đĩa thật
 * @returns {{ duong: string, tu: "--root"|"vung-ghi.txt"|"mac-dinh" }}
 */
export function timVungGhi({ duongGhepCap, root = null, tep = fs } = {}) {
  if (typeof duongGhepCap !== "string" || duongGhepCap === "") {
    throw new Error("timVungGhi: thiếu `duongGhepCap` — mọi đường đều neo vào thư mục chứa tệp ghép cặp.");
  }
  const nha = path.dirname(path.resolve(duongGhepCap));

  if (typeof root === "string" && root.trim() !== "") {
    return { duong: path.resolve(root.trim()), tu: "--root" };
  }

  const cauHinh = path.join(nha, TEN_TEP_CAU_HINH);
  if (tep.existsSync(cauHinh)) {
    /* Đọc ĐÚNG dòng đầu. Một tệp cấu hình một dòng thì dòng thứ hai là chú thích của người
     * viết, không phải một đường dẫn thứ hai — và đoán sai chỗ đó thì file rơi xuống một ổ
     * không ai định. */
    const dong = String(tep.readFileSync(cauHinh, "utf8")).split(/\r?\n/)[0].trim().replace(/^"|"$/g, "").trim();
    if (dong !== "") {
      if (!path.isAbsolute(dong)) {
        throw new Error(
          `'${cauHinh}' đang ghi '${dong}' — phải là đường dẫn TUYỆT ĐỐI (bắt đầu bằng ổ đĩa), ` +
          `ví dụ:  D:\\Udin\\ket-xuat`
        );
      }
      return { duong: path.resolve(dong), tu: TEN_TEP_CAU_HINH };
    }
    /* Tệp rỗng = chưa điền gì = dùng mặc định. KHÔNG phải lỗi: Đức tạo tệp trước rồi điền sau
     * là một chuyện bình thường, và đỏ ở đó thì máy chủ không bật được vì một tệp trống. */
  }

  return { duong: path.join(nha, TEN_THU_MUC_MAC_DINH), tu: "mac-dinh" };
}

/**
 * Vùng ghi KHÔNG được chứa thư mục ghép cặp. `file.read` đọc được mọi tệp dưới vùng ghi, nên
 * trỏ ra ngoài một nấc là **token đọc được qua dây**.
 *
 * `canhVungGhi` trong host cũng chặn ca này, nhưng nó chặn bằng cách quét tên tệp trong đúng
 * một thư mục. Phép kiểm ở đây hỏi câu tổng quát hơn — *thư mục ghép cặp có nằm DƯỚI vùng ghi
 * không* — nên nó bắt được cả khi vùng ghi là thư mục cha, ông, cụ.
 */
export function canhTrumLenNhau({ duongGhepCap, vungGhi }) {
  const nha = path.resolve(path.dirname(path.resolve(duongGhepCap)));
  const goc = path.resolve(vungGhi);
  /* CẮT dấu gạch cuối trước khi nối thêm một dấu gạch. `path.resolve("C:/")` trả về `C:\`, nên
   * nối thẳng thành hai dấu gạch `C:\` — không khớp với đường nào, và **cả ổ đĩa lọt qua phép canh**. Đúng
   * ca một người gõ `C:\` vào `vung-ghi.txt` cho nhanh. Phép ghim bắt 16/09. */
  const gocKhongGach = goc.endsWith(path.sep) ? goc.slice(0, -path.sep.length) : goc;
  const duoi = nha === goc || nha.toLowerCase().startsWith(gocKhongGach.toLowerCase() + path.sep);
  if (duoi) {
    throw new Error(
      `Vùng ghi '${goc}' đang CHỨA thư mục ghép cặp '${nha}'. Tệp ghép cặp có token, và ` +
      `\`file.read\` đọc được mọi tệp dưới vùng ghi — nên đường này để lộ token qua dây. ` +
      `Trỏ vùng ghi sang một thư mục khác, ví dụ:  D:\\Udin\\ket-xuat`
    );
  }
  return goc;
}

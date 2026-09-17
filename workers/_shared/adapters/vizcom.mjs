/* ADAPTER VIZCOM — HIỂU BIẾT VỀ MỘT TRANG, VÀ KHÔNG CÓ GÌ KHÁC.
 *
 * File này là DỮ LIỆU. Nó không import gì, không gọi `chrome.*`, không chạm CDP, không gọi
 * Bridge. Bộ chạy chung đọc nó rồi gọi `scout.*`. Thêm một trang mới = thêm một file như file
 * này — **không** thêm một Chrome extension. Đó là toàn bộ lời khai mà nghiên cứu đi chứng minh.
 *
 * ─── MỌI SELECTOR DƯỚI ĐÂY ĐẾN TỪ BẰNG CHỨNG DOM THẬT, 18/09 ───────────────
 * `scout.page` trên `app.vizcom.com/files/<org>/recent`: 23 phần tử tương tác. Không selector
 * nào ở đây là đoán — luật gói duc-scouter cấm đoán selector, và nó cấm có lý do.
 *
 * ─── VÌ SAO DANH TÍNH LÀ CÁI ĐẮT NHẤT TRONG FILE NÀY ───────────────────────
 * Đức có **ba** tài khoản Vizcom. Cả ba mở cùng `app.vizcom.com`, cùng hình dạng URL
 * `/files/<uuid>/recent`, cùng `title` là `"Vizcom"`. **Không phép lọc URL nào phân biệt được
 * chúng.** Đo 18/09, hai cửa sổ mở cùng lúc ở hai ghế khác nhau:
 *
 *     [data-testid="organization-switcher-button"]  →  "ĐĐức Nguyễn's WorkspaceFree plan"
 *     [data-testid="organization-switcher-button"]  →  "VinfastEnterprise plan"
 *
 * Nên danh tính đi qua **selector ổn định** (khớp đúng một, có mặt trên cả hai tài khoản),
 * còn `xac_nhan_truoc_khi_ghi` là **cổng thứ hai độc lập**: chuỗi email trong cây trợ năng,
 * đo được ổn định 3/3 lượt. Hai cổng vì đây là ranh giới an toàn, không phải một lượt tra cứu:
 * một cổng hỏng thì cổng kia vẫn phải chặn.
 */
export const VIZCOM = {
  id: "vizcom",
  origin: "https://app.vizcom.com/",
  tai_khoan: "anhducds",

  /* Cổng ①: khớp đúng một, chuỗi có nghĩa với người đọc. */
  danh_tinh: {
    selector: '[data-testid="organization-switcher-button"]',
    chua: "Đức Nguyễn's Workspace"
  },

  /* Cổng ②: BẮT BUỘC chạy trước bất kỳ bước GHI nào. Email là chính TÀI KHOẢN, còn cổng ① chỉ
   * là tên workspace — một người có thể được thêm vào một workspace trùng tên, không ai được
   * thêm vào một địa chỉ email. Nằm trong `StaticText` nên `scout.page` (chỉ liệt kê phần tử
   * tương tác) không với tới; đường đọc duy nhất không phải đoán selector là cây trợ năng. */
  xac_nhan_truoc_khi_ghi: { a11y_chua: "anhducds@gmail.com" },

  /* Bề mặt đã quét được, 18/09. Mỗi dòng là một phần tử CÓ THẬT với `matchCount` đã đo. */
  be_mat: {
    chuyen_to_chuc: '[data-testid="organization-switcher-button"]',
    tim_tep: 'input[placeholder="Search all files"]',
    cai_dat: '[data-testid="settings-button"]',
    tep_moi: 'a[href^="/workbench/folder/"]',
    khung_intercom: "iframe#intercom-frame"
  },

  /* Trang đã quét là **trình duyệt tệp**, không phải trình soạn thảo. Bề mặt sinh ảnh (ô nhập
   * prompt · tải ảnh tham chiếu · nút render · vùng kết quả) nằm ở `/workbench/…` và **chưa
   * được quét** — đi tới đó cần `scout.navigate` hoặc `scout.click`, cả hai là lệnh GHI, mà
   * cổng ghi chỉ tay Đức mở được. Để trống ở đây là **đúng**: khai một bước chưa đo là dựng
   * một selector đoán, và file này tồn tại để chặn đúng chuyện đó. */
  viec: {
    doc_danh_tinh: [
      { ten: "đọc tổ chức đang mở", method: "scout.text", selector: '[data-testid="organization-switcher-button"]' }
    ],
    kiem_ke_tep: [
      { ten: "đếm bề mặt tương tác", method: "scout.page" },
      { ten: "đọc cây trợ năng", method: "scout.a11y" }
    ]
  }
};

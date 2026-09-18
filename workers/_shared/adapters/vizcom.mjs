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
 * ─── 18/09, ĐỨC CHỐT: DANH TÍNH CHÍNH LÀ EMAIL, KHÔNG PHẢI WORKSPACE ───────
 * Bản đầu lấy tên workspace làm cổng chính. Nó **chạy đúng** trong pilot — và vẫn sai luật, vì
 * một cái tên workspace là thứ người ta đặt được: hai tài khoản khác nhau có thể cùng đặt
 * `"Đức Nguyễn's Workspace"`, còn *bị thêm vào một workspace trùng tên* là chuyện xảy ra được.
 * Không ai được thêm vào một địa chỉ email. Nên:
 *
 *     danh_tinh      = email trong cây trợ năng   → QUYẾT ĐỊNH
 *     danh_tinh_phu  = workspace + gói cước       → CHỈ IN RA CHO NGƯỜI ĐỌC
 *
 * `danh_tinh_phu` **không có quyền cho qua và không có quyền chặn**. Nó lệch thì bộ giải in
 * `phu_lech` để người thấy, rồi vẫn đi tiếp theo email — vì Đức chốt nó là *supplementary*.
 * Khối ⓞ của `giai-target-smoke.mjs` ĐỎ nếu ai đảo ngược hai dòng này.
 */
export const VIZCOM = {
  id: "vizcom",
  origin: "https://app.vizcom.com/",
  tai_khoan: "anhducds",

  /* DANH TÍNH CHÍNH — thứ DUY NHẤT được quyền quyết định. Chuỗi email nằm trong `StaticText`
   * nên `scout.page` (chỉ liệt kê phần tử tương tác) không với tới; đường đọc duy nhất không
   * phải đoán selector là cây trợ năng. Đo 18/09: ổn định 3/3 lượt, xuất hiện 2 lần mỗi lượt. */
  danh_tinh: { a11y_chua: "anhducds@gmail.com" },

  /* PHỤ — in ra cho người đọc, không tham gia quyết định. Xem đầu file. */
  danh_tinh_phu: {
    selector: '[data-testid="organization-switcher-button"]',
    chua: "Đức Nguyễn's Workspace"
  },

  /* Bề mặt đã quét được, 18/09. Mỗi dòng là một phần tử CÓ THẬT với `matchCount` đã đo. */
  be_mat: {
    chuyen_to_chuc: '[data-testid="organization-switcher-button"]',
    tim_tep: 'input[placeholder="Search all files"]',
    cai_dat: '[data-testid="settings-button"]',
    /* ⚠ TẠO TỆP — KHÔNG phải một đường điều hướng. Đo 18/09: `a[href^="/workbench/"]` khớp
     * đúng **1** phần tử trên trang này, và nó chính là nút `Create new file`. Tức đường DUY
     * NHẤT từ trình duyệt tệp sang `/workbench/…` là tạo một tệp mới — và tạo tệp thì chỉ xoá
     * mới đảo ngược được, mà xoá là thứ Đức cấm thẳng. Pilot ghi 18/09 dừng trước đúng cửa này.
     * Ai đọc tên trường này thành "mở tệp" sẽ tạo rác trong tài khoản của Đức. */
    tao_tep_moi: 'a[href^="/workbench/folder/"]',
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

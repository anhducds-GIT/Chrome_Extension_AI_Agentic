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

  /* ─── BỀ MẶT `/workbench/<uuid>` — quét thật 18/09, 25 phần tử tương tác ───────────────
   * 13/25 có neo ngữ nghĩa, 12/25 chỉ có hash styled-components. Mọi dòng dưới đây kèm số
   * khớp ĐÃ ĐO; không dòng nào là đoán.
   *
   * ═══ KHÔNG GHI ĐƯỢC Ở ĐÂY, VÀ ĐÓ LÀ PHÉP ĐO CHỨ KHÔNG PHẢI SỰ THẬN TRỌNG ═══
   * Xem `workbench_khong_ghi_duoc` ngay dưới. Hai lý do độc lập, mỗi lý do tự nó đủ.
   *
   * ═══ GRAPH CỦA WORKBENCH KHÔNG NẰM TRONG DOM — đo 18/09 ═══
   * `img` 0 · `[style*="background-image"]` 0 · `picture` 0 · `video` 0 · `[role="img"]` 0 ·
   * `canvas` **1** (có `data-engine`) · `data-node-id` 0 · `data-id` 0 · `draggable` 0 ·
   * `scout.view`: `document` 2048×1017 **==** viewport ⇒ graph không nở ra DOM.
   *
   * Ảnh gốc · ảnh kết quả · cạnh nối: **vẽ trong canvas, không có phần tử DOM nào**. Với ba
   * lớp đối tượng đó `scout.shot` KHÔNG phải cách tối ưu — nó là **giác quan duy nhất**.
   * 20 phần tử `svg` ↔ đúng 20 node `role=image` **không tên**: đó là icon, không phải tác phẩm.
   * Đầy đủ: `duc-scouter/v0.1.0/docs/WORKBENCH-GRAPH.md`. */
  /* ═══ BẢN ĐỒ COMPONENT CỦA KHỐI PROMPT — đo 18/09, và nó SỬA MỘT KẾT LUẬN CỦA TÔI ═══
   * Tôi từng báo với Đức: *"nút Generate không có đường gọi hợp lệ vì mọi class là hash"*.
   * **SAI.** Class có hash ở ĐUÔI, còn ĐẦU là tên component ổn định của styled-components:
   *
   *     Button__StyledButton-sc-1dj7csb-0  WorkbenchElementImg2Img__GenerateButton-sc-ukbsh3-2 …
   *     └── hash ở đuôi ──────────────────┘└── tên component, ỔN ĐỊNH ──────────────┘
   *
   * Nên một selector khớp TIỀN TỐ **không chứa `-sc-`** và **qua được luật ⑸**. Tám component
   * đọc được trong khối:
   *
   *     WorkbenchElementImg2Img                  ← khung khối
   *       ├ __Title · __TitleLeft · __TitleRight   ("Render" · "LEGACY")
   *       ├ __Img2ImgToolbar
   *       ├ __Img2ImgPromptWrapper
   *       │   └ __Img2ImgTextArea                 ← ô prompt
   *       └ __GenerateButton                      ← Generate
   *
   * CHỖ CHẶN THẬT không phải hash, mà là **SỐ LƯỢNG**: canvas có 2 khối đối xứng, và mọi biến
   * thể CSS đã thử đều trả **2** — `:has()` chạy, nhưng CSS không so được chữ trong `value` nên
   * không tách được khối nào là khối nào. Lõi ghi ném `SELECTOR_AMBIGUOUS` khi khớp ≠ 1
   * (`scouter-actions-core.mjs`), nên **không lệnh GHI nào chạm được nút Generate hôm nay**.
   * Cần một tham số CHỈ SỐ — đổi luật an toàn, Đức chốt. */
  be_mat_workbench: {
    /* Ô nhập prompt. **KHỚP 2** — mỗi phần tử trên canvas một ô. Luật gói số 7 đòi selector
     * khớp ĐÚNG MỘT trước khi ghi, nên selector này KHÔNG dùng để ghi được. */
    o_prompt: 'textarea[placeholder="What are you creating?"]',
    /* Hợp lệ với luật ⑸ (không chứa `-sc-`), nhưng **khớp 2** nên chưa ghi được. */
    nut_generate: 'button[class*="WorkbenchElementImg2Img__GenerateButton"]',
    khung_khoi: '[class*="WorkbenchElementImg2Img__Img2Img"]',
    thanh_cong_cu_khoi: '[class*="WorkbenchElementImg2Img__Img2ImgToolbar"]',
    thu_vien_tai_nguyen: '[data-testid="asset-library-toolbar-button"]',   /* khớp 1 */
    duong_ho_so: 'a[href="/settings/account/profile"]',                    /* khớp 1 */
    khung_intercom: "iframe#intercom-frame"                                /* khớp 1 */
  },

  /* ─── VÌ SAO PILOT 18/09 DỪNG Ở READ-ONLY TRONG WORKBENCH ────────────────────────────
   *
   * ⑴ **KHÔNG CÓ DẤU HIỆU DANH TÍNH.** Quét cây trợ năng của canvas: 50 tên node, và
   *    **không có** email, **không có** tên workspace, **không có** tên gói cước. Thứ duy
   *    nhất dính tới người dùng là chữ `"Đ"` — một ký tự đầu của avatar. Một ký tự không
   *    phải một danh tính: nó không do ai khai, và nó trùng với bất kỳ tài khoản nào bắt đầu
   *    bằng chữ đó. Nên `khoaDanhTinh` trả `DANH_TINH_LECH` — **4/4 lượt, đều ~100ms**, tức
   *    không phải đua thời gian mà là dấu hiệu KHÔNG TỒN TẠI trên bề mặt này.
   *
   *    Hệ quả cho kiến trúc: `danh_tinh` hôm nay là MỘT dấu hiệu cho cả site, còn thực tế
   *    mỗi route phơi ra một bộ khác nhau. Muốn ghi trong workbench thì phải khai danh tính
   *    THEO TỪNG BỀ MẶT — và trước đó phải ĐO ra một dấu hiệu vừa ổn định vừa phân biệt được.
   *    Hiện tại chưa đo ra cái nào. Đừng lấy `srcRoute=…/files/<org-uuid>/…` trong URL: nó
   *    là vết của lượt điều hướng vừa rồi, mất ngay sau một lượt tải lại.
   *
   * ⑵ **Ô PROMPT ĐANG GIỮ CHỮ CỦA NGƯỜI DÙNG.** Đọc bằng a11y, không gõ gì:
   *    `"Elegan nice coupe silver car"` và `"Racing morden car colorful"`. Nên lượt ghi
   *    "gõ rồi xoá" — thứ chạy sạch ở trang `/files/…` — ở đây sẽ **xoá mất chữ thật của
   *    Đức**. Một lượt ghi đảo ngược được trên ô trống là một lượt ghi PHÁ HOẠI trên ô đầy.
   *
   * Mỗi lý do tự nó đủ để dừng. Cộng lại thì không còn gì để cân nhắc. */
  workbench_khong_ghi_duoc: {
    ly_do_danh_tinh: "canvas không phơi email/workspace/plan — chỉ có một ký tự avatar",
    ly_do_o_prompt: "cả 2 ô prompt đang giữ chữ thật của người dùng; selector lại khớp 2, không khớp 1"
  },

  /* ~~"Bề mặt `/workbench/…` chưa được quét"~~ — câu đó đúng lúc viết và **SAI từ 18/09 tối**:
   * Đức mở sẵn một tệp, bề mặt đã quét xong, kết quả ở `be_mat_workbench` ngay trên và ở
   * `duc-scouter/v0.1.0/docs/WORKBENCH-GRAPH.md`. Sửa tại chỗ chứ không xoá, vì một câu
   * "chưa đo" là thứ phiên sau đọc rồi đi đo lại cái đã có.
   *
   * `viec` dưới đây vẫn **chỉ có bước của trang mẹ**, và đó là cố ý: các bước của Workbench
   * đòi một đường gọi theo CHỈ SỐ (ô prompt khớp 2, nút Generate không có selector) — thứ hôm
   * nay chưa có. Khai một bước không gọi được là khai một lời hứa. */
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

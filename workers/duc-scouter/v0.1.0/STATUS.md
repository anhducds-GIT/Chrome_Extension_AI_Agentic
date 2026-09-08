---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "Trang thử THỨ HAI — mục ① của ROADMAP.md nay có bản đề xuất ba ứng viên, Đức chọn một. Bước đầu là MỘT PHÉP ĐO bằng diagnostics.dom_probe, không phải viết mã: xem dữ liệu tới từ một lượt gọi mạng hay chỉ hiện ra sau một cú bấm. Sau đó mới tới bước 2 của ROADMAP.md — đóng vòng tự cải tiến MỘT lần trên một trang tự dựng: Scouter dò trang, AI viết adapter xuống đĩa, gọi scout.reload, adapter chạy. Từng mảnh đã có và đã đo; cả vòng thì chưa ai chạy lần nào."
human_action: "Nạp lại extension trong Chrome — khối phanh vừa được vá 08/09 (mục S-15), bản đang chạy KHÔNG tự cập nhật. Rồi chọn trang thử thứ hai: ROADMAP.md mục ① có ba ứng viên, tôi khuyên HOSE hsx.vn."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Ba lệnh bấm và gõ nay đã chạy trên một trang THẬT và đúng: ĐẠT 11/11 trên Chrome 152, kể cả ca phải cuộn hai chiều và ca hai nút chữ giống hệt nhau. Đường ghi có phanh (công tắc trong bảng bên, mặc định tắt, trần 200 lượt — Đức nâng từ 50 ngày 08/09). Khối phanh vừa được vá 08/09 theo chốt của Đức: hai lỗi chỉ nổ khi nhiều lượt chồng nhau — phanh khẩn bị bật lại, và trần 200 bị vượt — nay đã đóng, có phép ghim tái hiện được và đột biến giết được. Hai việc lớn còn lại: chọn trang thử THỨ HAI, và cả VÒNG tự cải tiến chưa ai chạy trọn một lần."
lam_duoc: "Bộ dò trang đa năng, không gắn với trang nào: đọc trang (cây DOM, cây trợ năng, ảnh chụp), bấm và gõ bằng chuột/bàn phím THẬT của trình duyệt (trang thấy isTrusted true), đi sang trang khác, gọi mạng, và tự nạp lại chính nó sau khi AI ghi mã mới."
khong_lam_duoc: "Không tự chạy. Mọi lệnh bấm và gõ đóng mặc định, chỉ tay Đức mở được, và mỗi lần mở có trần lượt. Không ghi tệp — việc đó ở máy chủ Bridge. Không biết trang nào cả: hiểu biết về một trang cụ thể phải nằm ở tầng adapter bên ngoài."
dung_the_nao: "Nạp thư mục v0.1.0 vào Chrome, bật máy chủ Bridge của Scouter, chọn tệp ghép cặp trong bảng bên. Muốn nó bấm hay gõ thì bật công tắc Cho phép bấm và gõ — Chrome sẽ hiện dải băng đang gỡ lỗi trình duyệt trên tab nó cắm vào. Phanh khẩn: Ctrl+Shift+X."
ref_runbook: workers/duc-scouter/v0.1.0/AGENTS.md
ref_readme: workers/duc-scouter/v0.1.0/README.md
ref_handoff: workers/duc-scouter/v0.1.0/HANDOFF.md
---

# Duc Scouter

Gói riêng trong `workers/` từ ngày 06/09 theo [ADR-0013](../../../docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md).
Trước đó nó nằm rải ở gốc repo và `scripts/` + `tests/` — tức là chiếm hai khoá đông nhất repo
cho một việc không liên quan tới khoá nào trong hai.

**Vì sao `lifecycle: building`, không còn là `idea`.** Nó đã có code chạy được, có phép ghim,
và có một phép đo với máy chủ thật. Nhưng nó **chưa từng chạy trên một trang thật**, nên chưa
lên được mức cao hơn.

**Vì sao không khai `last_verified`.** Chưa có pilot nào. Luật của repo: khai `last_verified`
thì phải có `evidence_ref` trỏ tới bằng chứng vận hành thật.

## Ba khả năng của bản nền, và cách tự kiểm lại

```bash
npm run test:scouter          # 8 phép ghim của gói
npm run scouter:mutation      # đột biến kiểm: 58 con, con nào sống sót là chốt rỗng
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT, không phải bản giả
npm run scouter:action-probe  # phép đo ②: ba lệnh ghi trên một trang thật (cần Chrome)
```

Đi tới đâu tiếp theo: **`ROADMAP.md`**.

## Câu còn treo, chỉ Đức chốt được

**Không còn câu nào chờ Đức.** Câu cuối cùng — chính sách che dữ liệu khi ghi báo cáo xuống
đĩa — Đức chốt ngày 07/09: Scouter **được** ghi
([ADR-0016](../../../docs/adr/0016-scouter-duoc-ghi-ghi-chep-xuong-dia.md)).

Sáu câu treo cũ đã chốt hết: vỏ giao diện là bảng bên (ADR-0002 của gói, 07/09) · chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09) ·
ghi xuống đĩa (ADR-0016, 07/09).

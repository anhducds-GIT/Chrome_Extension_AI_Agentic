---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "Bước 2 của ROADMAP.md — đóng vòng tự cải tiến MỘT lần trên một trang tự dựng: Scouter dò trang, AI viết adapter xuống đĩa, gọi scout.reload, adapter chạy. Từng mảnh đã có và đã đo; cả vòng thì chưa ai chạy lần nào."
human_action: "Nạp lại extension trong Chrome — manifest đổi (thêm quyền hẹn giờ) nên bản đang chạy không tự cập nhật. Muốn Scouter bấm thì mở popup, bật Chế độ phát triển; tắt thì nó chỉ nhìn."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Ba lệnh bấm và gõ nay đã chạy trên một trang THẬT và đúng: ĐẠT 11/11 trên Chrome 152, kể cả ca phải cuộn hai chiều và ca hai nút chữ giống hệt nhau. Đường ghi có phanh (công tắc trong popup, mặc định tắt, trần 50 lượt). Việc còn lại lớn nhất: cả VÒNG tự cải tiến chưa ai chạy trọn một lần."
ref_readme: README.md
ref_handoff: HANDOFF.md
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

Năm câu treo cũ đã chốt hết: chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09) ·
ghi xuống đĩa (ADR-0016, 07/09).

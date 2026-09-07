---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "S-06 — đo bấm và gõ trên một trang thử tự dựng: ba lệnh ghi mới chỉ chạy trên trang giả trong phép ghim, chưa lần nào chạm một nút thật. Đây cũng là lượt hiệu chỉnh trần 50, con số hiện là ước lượng."
human_action: "Nạp lại extension trong Chrome — manifest đổi (thêm quyền hẹn giờ) nên bản đang chạy không tự cập nhật. Muốn Scouter bấm thì mở popup, bật Chế độ phát triển; tắt thì nó chỉ nhìn."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Scouter bấm và gõ được như tay người, và từ 07/09 đường ghi đã có phanh: công tắc trong popup, mặc định tắt, trần 50 lượt mỗi lần mở khoá, không method nào tự mở khoá được. Bridge cũng tự nối lại sau khi service worker ngủ. Còn thiếu đúng một thứ: chưa lần nào bấm trên một trang thật."
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
npm run test:scouter          # 7 phép ghim của gói
npm run scouter:mutation      # đột biến kiểm: 58 con, con nào sống sót là chốt rỗng
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT, không phải bản giả
```

## Câu còn treo, chỉ Đức chốt được

- @Đức:chốt(SCOUTER-INVENTORY-01) Chính sách che dữ liệu khi Scouter ghi báo cáo xuống đĩa.
  Chừng nào chưa chốt thì Scouter **không được ghi nội dung trang xuống đĩa** (ADR-0010).

Bốn câu treo cũ đã được chốt: chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09).

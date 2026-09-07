---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "Đo bấm và gõ trên một trang thử tự dựng: ba lệnh mới mới chỉ chạy trên trang giả trong phép ghim, chưa lần nào chạm một nút thật."
human_action: "Hai câu chờ Đức chốt: cái phanh cho đường ghi nên có hình dạng gì, và có cho thêm quyền hẹn giờ để Bridge tự nối lại khi máy chủ tắt lâu không. Ngoài ra: nạp lại extension trong Chrome, các bước ở đầu README của gói."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Scouter nay bấm và gõ được như tay người, không chỉ nhìn. Đường ghi là một lõi riêng nên phần chỉ-đọc vẫn chứng minh được là chỉ đọc. Chưa có phanh nào cho đường ghi, và chưa lần nào bấm trên trang thật."
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
npm run test:scouter          # 5 phép ghim của gói
npm run scouter:mutation      # đột biến kiểm: 24 con, con nào sống sót là chốt rỗng
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT, không phải bản giả
```

## Câu còn treo, chỉ Đức chốt được

- @Đức:chốt(SCOUTER-INVENTORY-01) Chính sách che dữ liệu khi Scouter ghi báo cáo xuống đĩa.
  Chừng nào chưa chốt thì Scouter **không được ghi nội dung trang xuống đĩa** (ADR-0010).

Hai câu treo cũ đã được chốt: chỗ đặt thư mục (ADR-0013) và làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`).

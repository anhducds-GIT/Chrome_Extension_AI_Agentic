---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "Cho Scouter bấm và gõ được như tay người: mở nhóm lệnh Input của giao thức debug, đúng thứ tự bảng kiểm kê đã xếp. Phép đo ① ngày 06/09 đã chứng minh đường đó dùng được."
human_action: "Scouter đã đổi chỗ nên bản đang nạp trong Chrome không còn dùng được: gỡ nó ra rồi nạp lại từ thư mục mới của gói. Xong thì mở popup, chọn tệp ghép cặp Bridge. Đường dẫn đầy đủ và các bước ở đầu README của gói."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Khung nền đã xong và đo được: quan sát, báo cáo qua Bridge, tự nạp lại mình. Cửa Bridge đã nói chuyện trót lọt với máy chủ Bridge thật, không phải máy chủ giả."
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

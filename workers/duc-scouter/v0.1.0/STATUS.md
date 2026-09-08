---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: paused
owner: claude
priority_rank: 4
next_step: "TẠM DỪNG từ 08/09 theo chốt của Đức — không ai đang làm gói này. Quay lại thì việc đầu tiên là trang thử THỨ HAI — mục ① của ROADMAP.md nay có bản đề xuất ba ứng viên, Đức chọn một. Bước đầu là MỘT PHÉP ĐO bằng diagnostics.dom_probe, không phải viết mã: xem dữ liệu tới từ một lượt gọi mạng hay chỉ hiện ra sau một cú bấm. Sau đó mới tới bước 2 của ROADMAP.md — đóng vòng tự cải tiến MỘT lần trên một trang tự dựng: Scouter dò trang, AI viết adapter xuống đĩa, gọi scout.reload, adapter chạy. Từng mảnh đã có và đã đo; cả vòng thì chưa ai chạy lần nào. Nhớ cho lúc quay lại: bản Scouter đang cài trong Chrome là bản CŨ, khối phanh vá ngày 08/09 chưa vào — dùng lại thì NẠP LẠI extension trước."
human_action: "không"
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "TẠM DỪNG 08/09 — Đức chuyển sang ba gói duc-auto-*. Gói dừng ở chỗ SẠCH: sổ nợ còn đúng hai mục nhỏ, suite xanh, đột biến 0 sống sót, không việc gì dở dang. Ba lệnh bấm và gõ đã chạy trên một trang THẬT và đúng: ĐẠT 11/11 trên Chrome 152, kể cả ca phải cuộn hai chiều và ca hai nút chữ giống hệt nhau. Đường ghi có phanh (công tắc trong bảng bên, mặc định tắt, trần 200 lượt — Đức nâng từ 50 ngày 08/09). Khối phanh vừa được vá 08/09 theo chốt của Đức: hai lỗi chỉ nổ khi nhiều lượt chồng nhau — phanh khẩn bị bật lại, và trần 200 bị vượt — nay đã đóng, có phép ghim tái hiện được và đột biến giết được. Hai việc lớn còn lại: chọn trang thử THỨ HAI, và cả VÒNG tự cải tiến chưa ai chạy trọn một lần."
lam_duoc: "Bộ dò trang đa năng, không gắn với trang nào: đọc trang (cây DOM, cây trợ năng, ảnh chụp), bấm và gõ bằng chuột/bàn phím THẬT của trình duyệt (trang thấy isTrusted true), đi sang trang khác, gọi mạng, và tự nạp lại chính nó sau khi AI ghi mã mới."
khong_lam_duoc: "Không tự chạy. Mọi lệnh bấm và gõ đóng mặc định, chỉ tay Đức mở được, và mỗi lần mở có trần lượt. Không ghi tệp — việc đó ở máy chủ Bridge. Không biết trang nào cả: hiểu biết về một trang cụ thể phải nằm ở tầng adapter bên ngoài."
dung_the_nao: "Nạp thư mục v0.1.0 vào Chrome, bật máy chủ Bridge của Scouter, chọn tệp ghép cặp trong bảng bên. Muốn nó bấm hay gõ thì bật công tắc Cho phép bấm và gõ — Chrome sẽ hiện dải băng đang gỡ lỗi trình duyệt trên tab nó cắm vào. Phanh khẩn: Ctrl+Shift+X."
ref_runbook: workers/duc-scouter/v0.1.0/AGENTS.md
ref_readme: workers/duc-scouter/v0.1.0/README.md
ref_handoff: workers/duc-scouter/v0.1.0/HANDOFF.md
---

# Duc Scouter

Gói riêng trong `workers/` từ ngày 06/09 theo [ADR-0013](../../../docs/adr/0007-scouter.md).
Trước đó nó nằm rải ở gốc repo và `scripts/` + `tests/` — tức là chiếm hai khoá đông nhất repo
cho một việc không liên quan tới khoá nào trong hai.

**Vì sao `lifecycle: paused`, từ 08/09.** Không phải vì nó hỏng, cũng không phải vì nó xong.
Đức chuyển hướng sang ba gói `duc-auto-*`, nên gói này **không có ai đang làm** — và một gói
khai `building` mà không ai xây là một dòng nói dối trên bảng của Đức.

**Nó dừng ở chỗ nào.** Ba lệnh bấm và gõ đã chạy trên một trang thật (11/11, Chrome 152), đường
ghi có phanh, và một pilot thật đã chạy qua nó 46 ngày liền mạch. **Chưa chứng minh được:** seed
mới thử **đúng MỘT trang** (`hnx.vn`), nên câu "năng lực chung" vẫn là lời khai chưa được đo.
Đó là lý do trang thử thứ hai đứng đầu `ROADMAP.md` lúc quay lại.

**Vì sao không khai `last_verified`.** Pilot 46 ngày ấy nay **thuộc gói khác**: nó đã chuyển nhà
sang `workers/hnx-fetch` ngày 08/09, và bằng chứng vận hành đi theo nhà mới. Luật của repo:
khai `last_verified` thì phải có `evidence_ref` trỏ tới bằng chứng **của chính gói này** — mà
bằng chứng chứng minh Scouter *dùng chung được* thì chỉ trang thử thứ hai mới sinh ra.

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
([ADR-0016](../../../docs/adr/0007-scouter.md)).

Sáu câu treo cũ đã chốt hết: vỏ giao diện là bảng bên (ADR-0002 của gói, 07/09) · chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09) ·
ghi xuống đĩa (ADR-0016, 07/09).

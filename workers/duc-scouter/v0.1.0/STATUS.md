---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "T33 T34 T36 XONG 14/09 — danh sach W de xuat BAT BUOC (W1 W2 W3 W4 W7 + E2E) nay DAT TRON. Nen viec ke la chang (3) DONG BANG SEED: T8 doi ten observer->scouter, T9 goi v1. Roi (4) T21 tach Udin. T35 (W6, dinh S-22) va T29 (upload -> W8) de LAI SAU khi tach — dung de xuat cua chinh minh. Duc them W nao vao danh sach bat buoc thi chung quay lai truoc. Chi tiet o CHUOI-VIEC.md."
human_action: "@Đức:ký — ⓪ nay chỉ còn một chữ ký: danh sách đề xuất `W1 W2 W3 W4 W7` + E2E đã ĐẠT trọn 14/09. Gật là đủ điều kiện tách Udin; muốn thêm `W5` `W6` `W8` thì nói, `T35`/`T29` quay lại trước. Không gấp: `G-69`. Mười giây: `G-65` — zoom RA rồi DỪNG, để tôi đếm."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "DIEU KIEN TACH UDIN DA DU 14/09. Sang hom do thu chan la NANG LUC SEED; toi hom do ca nam W de xuat bat buoc deu DAT va E2E di tron bon chang W1->W2->W3->W4 mot mach. Bang W: 5/8 DAT, con 1 CHAN (W8 can T29). Danh sach dong bang van chi mot dong that: I9 upload. Thu chan bay gio khong con la nang luc, cung khong con la workflow — ma la mot chu ky. S-22 van che khuat W5 va W6."
lam_duoc: "Bộ dò trang đa năng, không gắn với trang nào: đọc trang (cây DOM, cây trợ năng, ảnh chụp), bấm và gõ bằng chuột/bàn phím THẬT của trình duyệt (trang thấy isTrusted true), đi sang trang khác, gọi mạng, và tự nạp lại chính nó sau khi AI ghi mã mới."
khong_lam_duoc: "Không tự chạy. Mọi lệnh bấm và gõ đóng mặc định, chỉ tay Đức mở được, và mỗi lần mở có trần lượt. Không ghi tệp — việc đó ở máy chủ Bridge. Không biết trang nào cả: hiểu biết về một trang cụ thể phải nằm ở tầng adapter bên ngoài."
dung_the_nao: "Nạp thư mục v0.1.0 vào Chrome, bật máy chủ Bridge của Scouter, chọn tệp ghép cặp trong bảng bên. Muốn nó bấm hay gõ thì bật công tắc Cho phép bấm và gõ — Chrome sẽ hiện dải băng đang gỡ lỗi trình duyệt trên tab nó cắm vào. Phanh khẩn: Ctrl+Shift+X."
ref_runbook: workers/duc-scouter/v0.1.0/CHUOI-VIEC.md
ref_readme: workers/duc-scouter/v0.1.0/README.md
ref_handoff: workers/duc-scouter/v0.1.0/HANDOFF.md
---

# Duc Scouter

Gói riêng trong `workers/` từ ngày 06/09 theo [ADR-0013](../../../docs/adr/0007-scouter.md).
Trước đó nó nằm rải ở gốc repo và `scripts/` + `tests/` — tức là chiếm hai khoá đông nhất repo
cho một việc không liên quan tới khoá nào trong hai.

**Từng `paused` từ 08/09, quay lại `building` ngày 12/09** khi Đức mở lại gói bằng trang thử
thứ hai. Giữ lại đoạn này vì nó ghi *vì sao* từng dừng: không phải hỏng, không phải xong — Đức
chuyển hướng sang ba gói `duc-auto-*`, và một gói khai `building` mà không ai xây là một dòng
nói dối trên bảng của Đức.

**Câu "năng lực chung" nay đã được đo, một phần.** Từ 08/09 tới 11/09 seed mới thử **đúng MỘT
trang** (`hnx.vn`), nên câu đó là lời khai chưa kiểm. Ngày 12/09 nó chạy trên một SPA React khác
hẳn (Udin) **không sửa một dòng seed nào**, rồi trên một trang tự dựng. Xem `docs/TRIALS.md`.
Còn thiếu: trang có khung lồng, và **cả vòng tự cải tiến** — việc lớn nhất còn nợ.

**Vì sao không khai `last_verified`.** Pilot 46 ngày ấy nay **thuộc gói khác**: nó đã chuyển nhà
sang `workers/hnx-fetch` ngày 08/09, và bằng chứng vận hành đi theo nhà mới. Luật của repo:
khai `last_verified` thì phải có `evidence_ref` trỏ tới bằng chứng **của chính gói này** — mà
bằng chứng chứng minh Scouter *dùng chung được* thì chỉ trang thử thứ hai mới sinh ra.

## Ba khả năng của bản nền, và cách tự kiểm lại

```bash
npm run test:scouter          # phép ghim của gói — số hiện ở dòng cuối, đừng gõ số vào đây
npm run scouter:mutation      # đột biến kiểm: con nào SỐNG SÓT là một chốt rỗng
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT, không phải bản giả
npm run scouter:action-probe  # phép đo ②: ba lệnh ghi trên một trang thật (cần Chrome)
```

Đi tới đâu tiếp theo: **`ROADMAP.md`**.

## Câu còn treo, chỉ Đức chốt được

**Không còn câu nào treo, và Đức đã UỶ QUYỀN phần còn lại.** Ngày 14/09 Đức trao quyền tự quyết
cho `S-25` · `I9` · `I5` `I6` `I7` · `O12`, theo hướng *"mở rộng năng lực để cover nhiều use case
hiện tại và sau này"*. Biên của uỷ quyền ghi ngay trong
[ADR-0007](docs/adr/0007-nhom-nhin-va-di-lai-va-uy-quyen-mo-rong.md) — nó **không** gồm nới một
lớp bảo vệ, `Runtime.*`, toạ độ/URL/mã phím tự do từ ngoài, hay quyền `manifest` mới.

`Q1` — chính sách che `de-xuat-chat-v1` — Đức chốt 14/09 đường ⒝:
ký nguyên bản, kèm **một cửa hẹp** `scout.text` ([ADR-0006](docs/adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md)).
`O8` đóng cùng ngày và **đã chạy thật** trên Udin (`G-57`).

**Bốn câu đã chốt ngày 14/09.** `S-24` URL ký sẵn → đường ⒜, `scout.grab` ra đời. `D3` `scout.focus`
→ **KHÔNG**: cửa sổ extension chạy ẩn bên dưới, adapter phải chạy được trên tab nền. `S-22` →
đóng bằng **lời khai** trong `README` (`scout.click` không hứa *"trang đã nhận"*), không bằng bản vá.

**Câu trước đó đã chốt.** Chính sách ghi báo cáo xuống đĩa — Đức chốt ngày 07/09: Scouter **được**
ghi ([ADR-0016](../../../docs/adr/0007-scouter.md)).

Sáu câu treo cũ đã chốt hết: vỏ giao diện là bảng bên (ADR-0002 của gói, 07/09) · chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09) ·
ghi xuống đĩa (ADR-0016, 07/09).

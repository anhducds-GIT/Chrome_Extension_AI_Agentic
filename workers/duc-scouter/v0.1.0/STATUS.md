---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: active
last_verified: 2026-09-16
last_verified_commit: bf3ff4413e3a384495356b161ed751f6d98121d9
last_verified_how: "Live 16/09: mot luot E2E that tren trang Udin (prompt moi, --du-an s1-nghiem-thu) chay tron W1->W2->W3->JPG->W4 — 4 tep mo dau FF D8 FF, co khop TUNG BYTE voi bao cao, ban .webp goc con nguyen. Tren chinh luot do scout.type tra da_kiem:true qua duong tro nang (~390ms moi lenh go; doi chung scout.query tran 15ms). Ba nhanh cua scout.click do TREN DAY THAT: moc co that -> da_kiem true sau 2ms; moc khong toi -> CLICK_NOT_OBSERVED sau 1018ms; bam tran -> tu khai chua kiem. PHAM VI: day KHONG phai nghiem thu scout.clear — lenh do van chua tu kiem, no S-27."
evidence_ref: workers/duc-scouter/v0.1.0/docs/TRIALS.md
owner: claude
priority_rank: 4
next_step: "Seed du dung cho mot vong viec that ma KHONG sua mot dong nao cua no — vong-tham-chieu.mjs ben Udin chay tron bang bon lenh cua seed. scout.chon va scout.tha deu da chay that. Viec ke: R2 (khep vong tu cai tien lan hai voi bo day du) va R3 (TRANG THU HAI khac loai)."
human_action: "khong"
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Cau \"Scouter la bo do nghe chung\" THOI la loi khai tu 15/09: mot extension khac (udin-optic) chay tron mot viec that tren ma nay ma khong bat no sua mot dong. Gia phai tra do duoc: ~2.100 dong may bam/go bi chep sang goi moi (G-93), va bay tep chep nay bi ghim so TUNG BYTE — mot ban va an toan lam o day PHAI toi duoc do hoac suite ben kia do. Bai hoc cua SEED tu luot nay: thu hep host_permissions la mot thay doi HANH VI, khong phai mot dong khai bao (G-94) — goi nao sinh ra tu seed nay ma thu quyen lai thi phai co mot luot chay live truoc khi tin."
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

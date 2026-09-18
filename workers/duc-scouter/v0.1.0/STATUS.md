---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: active
last_verified: 2026-09-18
last_verified_commit: 6f3a761f3c02a5fba478eb3f3c857fbf9304132a
last_verified_how: "Live 18/09 tren Vizcom that, ghe dia chi bang instance_id: giai target -> khoanh dung mot khoi Img2Img theo CHU prompt -> bam Generate con cua chinh khoi do. Hang output cua dung khoi ay 2 -> 3, anh moi o ngoai cung ben phai; 0 lenh ghi sang ghe hay tai khoan khac. Cung luot do: `target_id` giu nguyen qua mot luot tai lai trang day du, con `id` React cua nut thi DOI han (:r1eg: -> :r1l:, :r1et: -> :r22:) nen phai giai dong moi luot. PHAM VI: day KHONG phai nghiem thu autonomous authorization — cong ghi do Duc mo va luot bam do Duc chi thi; xem khoi CHAN trong docs/UNIVERSAL-SCOUTER.md §V1."
evidence_ref: workers/duc-scouter/v0.1.0/docs/TRIALS.md
owner: claude
priority_rank: 4
next_step: "V1 DA DONG PHAM VI 18/09 — doc docs/UNIVERSAL-SCOUTER.md §V1 truoc moi thu khac; do la SSOT cua moc, dung chep lai so lieu sang day. V2 bat dau o DUNG MOT cho: identity attestation (/files -> bind ghe/session -> mang sang /workbench, kem dieu kien vo hieu hoa). Thi nghiem nho nhat da thiet ke san: mot ghe Scouter co chua duoc hai tai khoan Vizcom khac nhau cung luc khong. Bon viec hoan khac va ly do tung viec: cung muc §V1."
human_action: "CO — mot viec, va no la cua V2: mo them mot tab Vizcom dang nhap tai khoan KHAC trong CUNG profile dang chay Workbench, de thi nghiem identity attestation co cai de bac. Ngoai ra: moi luot tieu them credit Vizcom deu cho Duc duyet. AI khong tu gui gi ra ngoai."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Moc dang dong: Universal Scouter V1 — Browser I/O Feasibility + Context-Efficient Workbench Control. Cau da chung minh: duong Bridge -> extension -> CDP -> tab chay duoc va Side Panel khong nam tren duong du lieu; bien runtime la GHE Scouter, dia chi luon la instance_id chu khong bao gio la nhan; danh tinh tai khoan phai doc tu TRANG chu khong suy tu URL; graph Workbench la source -> prompt_block -> outputs[]; nut Generate phai giai dong moi luot. Cau CHUA chung minh, va no la ly do V1 khong goi la autonomy: Workbench thuong khong lo email, nen luot Generate vua roi chay duoc la nho Duc truc tiep chi thi. Bang chung tung cau o docs/UNIVERSAL-SCOUTER.md §V1 va so gia thuyet docs/GIA-THUYET.md."
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

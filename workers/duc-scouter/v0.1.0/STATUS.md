---
schema: extension-status/v2
id: duc-scouter
name: Duc Scouter
lifecycle: building
owner: claude
priority_rank: 4
next_step: "T22 — gui-prompt phai phan biet QUA GIO voi HONG, va nang tran len 900s (bang han cua URL ky san). Luot chay that 14/09 bo cuoc o 300s trong khi Udin chay tiep hon 17 phut: credit tieu roi ma luot chay vut di, W3 khong bao gio chay. Chay lai nguyen trang se nga dung cho cu. Sau T22 moi chay lai T13+T15. Song song duoc: T18 (O8 qua scout.text, ADR-0006 da ky, khong cho ai)."
human_action: "@Duc:khong co viec nao cho Duc luc nay. Ghi de biet: luot 14/09 da tieu credit cho mot lan sinh anh ma khong lay duoc anh nao — vi URL ky san het han sau 900 giay va adapter bo cuoc o 300s. Da ghi thanh T22; se khong chay lai luot ton tien nao cho toi khi T22 xong."
version_source: workers/duc-scouter/v0.1.0/manifest.json
current_focus: "Hoàn thiện SEED dùng chung — Scouter là ĐÍCH, trang Udin (vinfast.udinbv.com/optic) chỉ là CA THỬ để ép seed lộ chỗ nó còn hẹp. Ngày 12/09 ca thử đó ép lộ năm khuyết tật của SEED (S-16 tới S-20) và BỐN cái đã vá xong trong ngày, cả bốn đo ngoài đời chứ không chỉ trước máy giả. S-17: scout.click hỏi Chrome điểm sắp bấm thuộc về ai TRUOC khi bắn, có lớp che thì từ chối CLICK_OBSCURED. S-18: scout.wait nhận thêm state usable, phân biệt có mặt với dùng được, và nói ra VÌ SAO chưa dùng được. S-19: scout.navigate nạp lại được cùng một URL — 15 giây báo sai nguyên nhân xuống 254ms báo đúng. S-16: ba hạn chờ xuống dưới ngưỡng 35 giây của máy chủ, và ngưỡng đó nay có tên để phép ghim đọc thẳng thay vì gõ lại. Còn mở: S-20 (nghe mạng trong lúc bấm) và S-21 (target thỉnh thoảng không trả lời được câu hỏi hình học, chưa biết vì sao). Tên ghế đã nghiệm thu ngoài đời: Đức gõ Udin_Scout và định tuyến theo tên chạy đúng. Không thêm method Bridge nào trong lượt T4 — số method hiện ở cột Method Bridge [ĐO] trên DASHBOARD.md, đừng ghi tay vào đây."
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

**Đang treo một câu: `Q1` — chính sách che dữ liệu `de-xuat-chat-v1` chưa ai ký.** Nó chặn `O8`
(đọc chữ trên trang) — mục đắt nhất của **danh sách đóng băng** (`docs/CAPABILITIES.md` §5.2),
tức là thứ phải xong **trước** khi tách Udin ra gói riêng. Và `scout.grab` đã chạy **trên** chính
sách đó rồi (`source.masked` cắt query theo nó) mà chưa có chữ ký nào phía sau.

**Ba câu đã chốt ngày 14/09.** `S-24` URL ký sẵn → đường ⒜, `scout.grab` ra đời. `D3` `scout.focus`
→ **KHÔNG**: cửa sổ extension chạy ẩn bên dưới, adapter phải chạy được trên tab nền. `S-22` →
đóng bằng **lời khai** trong `README` (`scout.click` không hứa *"trang đã nhận"*), không bằng bản vá.

**Câu trước đó đã chốt.** Chính sách ghi báo cáo xuống đĩa — Đức chốt ngày 07/09: Scouter **được**
ghi ([ADR-0016](../../../docs/adr/0007-scouter.md)).

Sáu câu treo cũ đã chốt hết: vỏ giao diện là bảng bên (ADR-0002 của gói, 07/09) · chỗ đặt thư mục (ADR-0013) · làm tới đâu (ADR-0010, dừng ở
`SEED v0.1`) · hình dạng cái phanh cho đường ghi và quyền `alarms` (ADR-0001 của gói, 07/09) ·
ghi xuống đĩa (ADR-0016, 07/09).

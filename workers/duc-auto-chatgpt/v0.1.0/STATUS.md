---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**Không còn mục nào chặn, và không còn mục nào làm được mà không cần Đức.** `B-40` `B-41` `B-42` `B-43` `B-44` đóng; `B-45` đóng là **sẽ không làm** và `B-46` đóng là **đã đo, tiền đề sai** — cả hai đo mất **0 credit**. Còn `B-36` (nút cấp lại quyền, Đức nói tạm chưa cần) và vế live của ADR-0053 (đã hạ mức, không chặn). Việc kế đáng làm nhất là **một loạt chạy ảnh thật**: nó vừa dùng được tính năng, vừa tự trả lời câu duy nhất còn để mở — tab bị che có vẽ xong một `<img>` sinh ra hay không (probe đã ghi sẵn `imageCandidateCount` và `generatedChains`, không cần thêm phép đo riêng)."
human_action: "Không có việc nào đang chặn. Đức đã nạp lại tiện ích và F5 sau bản audit; `chat.say` chạy live PASS. Khi nào muốn thì **chạy một loạt ảnh thật** — nó sẽ tự trả lời câu cuối còn để mở của `B-46` (tab bị che có vẽ xong ảnh sinh hay không), không cần thêm phép đo riêng nào."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "**Năm mục đóng trong ngày 09/09, một lượt audit độc lập đảo lại hai trong số đó, rồi hai mục nữa đóng bằng phép đo 0 credit.** Vòng chat 0 cú bấm chạy trọn: sổ ghi **1.867** = máy chủ **1.867** với cửa sổ bị che. `chat.say` — đường chat thẳng, không job, không dòng Excel — chạy live: 349 ký tự, xác nhận **0,9 giây**, đọc **17 → 135** ký tự sau một cú F5, **0** dòng Excel. **Audit Codex hai vòng, CẢ HAI FAIL.** Nặng nhất nằm trong mã tôi đã báo đóng cùng buổi: phép neo lượt hỏi chỉ so 160 ký tự đầu, nên hai job chung đoạn mở đầu 173 ký tự ra **cùng khoá** → ghi **câu trả lời của job khác** vào sổ với dấu đã-xác-minh. Sáng đó tôi đã ghim chính ca này thành *\"giới hạn đã biết\"* — ghi cái giới hạn mà **không ghi cái giá**. Đã sửa: khoá đầu+đuôi, phép neo đòi **DUY NHẤT**. Thứ hai: cửa gửi lại sau đối soát mù **gỡ hẳn** — **không thể khẳng định \"máy chủ không tạo gì\" từ DOM**, nên vế đó của ADR-0050 ⒞ là **không thi hành được** và số nguồn khẳng định trở lại **0**. Ba mục HIGH của `chat.say` cũng đã sửa. **Rồi `B-46` đo được điều làm hẹp cả hướng đó:** tab bị che **KHÔNG** làm bộ dò mù — `assistantMessages().length` = **3** khi `visibility: hidden`, cùng biểu thức mà điều kiện mù dùng. Che cửa sổ chỉ làm **chữ** không vẽ xong, thứ B-43 đã xử. Suite **126/126**; thử phá **8/8** và **9/9**, 0 thoát."
ref_readme: workers/duc-auto-chatgpt/v0.1.0/README.md
ref_handoff: workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md
ref_backlog: workers/duc-auto-chatgpt/v0.1.0/BACKLOG.md
---

# STATUS — Duc Auto ChatGPT

> **File này là gì:** trạng thái vận hành, một trang, cho mắt Đức đọc.
> **File này KHÔNG phải gì:** không phải README thứ hai. Kiến trúc, cách dùng, bảng lỗi —
> đều nằm ở file khác, dưới đây chỉ có đường dẫn tới.
> Dashboard ở gốc repo (`DASHBOARD.md`) đọc phần đầu file này để sinh ra bảng tổng.

## Ý tưởng ban đầu

Đức có một file Excel liệt kê hàng chục việc tạo ảnh. Làm tay thì phải ngồi dán từng prompt
vào ChatGPT, chờ, tải ảnh về, đặt tên, ghi vào sổ. Extension này làm hộ đúng vòng đó, ngay
trên trình duyệt của Đức, không gửi gì ra máy chủ lạ.

## Mục đích

Chạy một **kế hoạch bằng XLSX** trên ChatGPT: đọc danh sách job từ workbook, gửi prompt,
chờ ảnh, lưu ảnh về đúng thư mục, và ghi lại nhật ký đủ để chứng minh việc nào đã chạy,
chạy mấy lần, kết quả nằm ở đâu. Một AI khác có thể điều khiển nó từ xa qua **Bridge**,
không cần Đức ngồi bấm. Số lệnh Bridge hiện có: xem cột **Method Bridge [ĐO]** trên
[`DASHBOARD.md`](../../../DASHBOARD.md) — máy đếm, luôn tươi.

## Đã kiểm chứng tới đâu

Lời khai và cách kiểm nằm ở `last_verified` / `last_verified_how` đầu file. **Chi tiết không
chép lại ở đây** — đọc bằng chứng:
[`Pilot-14…/evidence/idempotency-fix-live-proof.md`](Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md),
diễn biến phiên ở cuối [`HANDOFF.md`](HANDOFF.md).

## Giới hạn đã biết

Ba điều Đức nên biết trước khi tin tưởng chạy việc lớn. Chi tiết ở [`BACKLOG.md`](BACKLOG.md):

1. ~~Việc thật **không chạy được qua `run.trial`** — trần 90 giây quá ngắn (**B-17**).~~
   **ĐÃ ĐÓNG 2026-09-07** — Đức chốt nâng trần lên **900 giây** ([ADR-0015](../../../docs/adr/0015-nang-tran-duong-thu-len-900-giay.md)).
   `run.start` vẫn cấm. Đổi lại, đường 900 giây phải theo dõi bằng `run.status`
   (`current.stage_elapsed_sec` / `stage_budget_sec`), đừng ngồi im chờ hết giờ.
2. Hai selector **chưa từng khớp lần nào** trên trang thật (**B-14**, **B-15**).
3. **"Thử lại" rộng hơn tên gọi** — lỗi sau khi đã gửi vẫn có thể gửi lại lần hai. Đổi việc
   này là *đổi luật an toàn* → chờ Đức chốt (**B-19**).

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| Extension làm gì, dùng thế nào | [`README.md`](README.md) |
| Luật riêng của package, Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Phiên trước làm tới đâu (cuối file) | [`HANDOFF.md`](HANDOFF.md) |
| Việc còn mở, đánh số B-xx | [`BACKLOG.md`](BACKLOG.md) |
| Schema workbook XLSX | [`DAC_XLSX_RUN_PLAN_V1.md`](DAC_XLSX_RUN_PLAN_V1.md) |
| Đức đã chốt những gì | [`decisions.md`](decisions.md) |
| Nhánh này hơn/kém nhánh Gemini chỗ nào | [`../../../FEATURE-PARITY.md`](../../../FEATURE-PARITY.md) |

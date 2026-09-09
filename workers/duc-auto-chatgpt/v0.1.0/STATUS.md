---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**B-41 và B-40 đã đóng trọn** (09/09). Việc kế là **B-42** — đường chat thẳng cho reasoning nhiều lượt. Đức chốt 09/09: *"bạn chủ động làm tôi approve và sẽ review sau khi tính năng này tồn tại, vì tôi ko hiểu về code"*, nên brief viết ra để LÀM SỔ, không để chờ duyệt. Hai chỗ phải khai rõ trong mã, không chỉ trong brief: nó khác `run.start` (cấm vĩnh viễn) ở chỗ nào, và mỗi lượt gửi phải có một dòng audit. **Còn hai mục cần Đức chốt trước khi viết mã:** `B-45` (luật quy thuộc ảnh sau F5) và `B-36` (một nút cấp lại quyền thư mục)."
human_action: "Nạp lại tiện ích ở `chrome://extensions` rồi F5 tab ChatGPT — nạp lại tab một mình là KHÔNG ĐỦ. **Không có việc nào đang chặn Đức.** Hai câu chốt khi nào rảnh, cả hai đều là chuyện luật, không phải chuyện mã: ① `B-45` — cho máy quy thuộc một ảnh **sau** cú F5 bằng luật "đúng một ảnh mới không nằm trong ảnh cũ" hay không? Không mở thì một job mà ảnh **đã có** vẫn phải người xem. ② `B-36` — có cần một nút "cấp lại quyền thư mục" trong panel hay không (ADR-0051 đã bỏ nhu cầu chọn thư mục, nên đây chỉ còn là bất tiện). Đường chat thẳng của `B-42` **tôi tự chốt mặc định an toàn**: một phiên có **giới hạn số lượt và giới hạn thời gian**, không phải quyền gửi tin nhắn tự do — vì gửi tự do là đường vòng quanh lệnh cấm `run.start`. Muốn khác thì nói."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "**Vòng chat 0 cú bấm đã chạy trọn, và ba mục đóng trong ngày 09/09: B-43, B-40 đường ⒝, B-41 trọn ba phần.** Máy tự gửi prompt vào ChatGPT, đọc câu trả lời về, phân tích, gửi tiếp. Số ký tự ghi vào sổ **bằng** số đọc lại được từ máy chủ (đo live **1.867 = 1.867** trong một hội thoại Project, và **1.761 = 1.761** ở lượt hồi quy), với cửa sổ ChatGPT **để nguyên bị che** — đúng cách Đức vận hành 99% thời gian. Con bug nặng nhất trong ngày là **báo-thành-công-giả**: job ghi 27 ký tự rồi đóng dấu *đã xác minh*, câu trả lời thật dài 1.917 ký tự — Chrome không cấp khung hình cho tab bị che nên trang không **vẽ** chữ vào DOM. [ADR-0052](docs/adr/0052-tab-bi-che-thi-doc-lai-sau-f5-thay-vi-dung-han.md) chữa bằng đúng thói quen của Đức: hết giờ thì **F5 rồi đọc lại từ máy chủ**, và chỉ F5 sau khi đã thấy lượt hỏi của chính job trong hội thoại — nên nó không bao giờ gửi lại prompt. **Ba loại lỗi nay tự chạy tiếp thay vì dừng hẳn**, mỗi loại một nắp riêng và ba lối vào khác nhau: hạ tầng chưa gửi gì (nắp 3/loại/run), lời nhà cung cấp xin chữa ([ADR-0053](docs/adr/0053-loi-nha-cung-cap-la-mot-nguon-doi-soat-cau-chua-lay-tu-ma-cua-ta.md), nắp 2/job), và bộ dò mù đối soát trước (nắp 1/job). **Captcha và hết credit vẫn dừng hẳn**, cưỡng chế bằng bất biến ghim được chứ không bằng một nhánh `if`. `canRetry()` và `submissionMayExist()` **không đổi một chữ** qua cả ba bản vá. Suite **125/125**; thử phá của B-41 ⑵ **16/16 bắt, 0 thoát**. **Một vế của ADR-0050 ⒞ không thi hành được** — F5 xoá bằng chứng quy thuộc ảnh, nên bộ dò mù không cứu miễn phí được job đã có ảnh; đã tách thành `B-45`, cần Đức chốt."
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

---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "Lấy nốt mục AI làm được mà không cần Đức: B-08 — dọn neo chữ của poll A/B về `provider-adapter.js`, thuần refactor, không đổi hành vi, và cần cẩn thận vì nó chạm bốn chỗ gọi trong `content.js`. Xong B-08 thì dừng dọn nợ và quay sang chạy MVP CC ↔ GPT, vì phần còn lại của sổ nợ hoặc chờ tay Đức hoặc là việc lớn cần brief riêng."
human_action: "Nạp lại tiện ích ở `chrome://extensions` rồi F5 tab ChatGPT — nạp lại tab một mình là KHÔNG ĐỦ. Rồi ba phép nghiệm thu, không tốn credit nào: ① tạm dừng một run, che side panel khoảng hai phút, mở lại và bấm Tiếp tục — job kế tiếp phải chạy trong khoảng một giây, không phải sau một phút; ② chọn một thư mục đích, đóng rồi mở lại panel, gọi nạp việc qua Bridge — tên tệp phải đúng VÀ số tệp tên rác trong Downloads KHÔNG tăng (mốc 39); ③ `dom_probe` giữa lúc đang gắn ảnh, một lượt với ảnh nhỏ và một lượt với ảnh khoảng 2MB. Và chốt một câu: tính năng tên gọi ngắn cho ảnh mẫu — bỏ hẳn hay nối thật một ô nhập?"
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "Nợ kỹ thuật đang được dọn theo lệnh Đức 08/09: sổ nợ gói **22 → 12 mục mở**, đo bằng chính bộ đếm `parseBacklog()`. Tám mục đóng là sổ **nói thật trở lại** — chúng đã xong từ trước mà viết bằng cú pháp bộ đếm không đọc được, nên máy vẫn tính là nợ suốt hai ngày. Hai mục đóng bằng BẢN VÁ THẬT: `run.status` thôi khai job cũ khi rảnh, và hai đồng hồ còn bị Chrome bóp (nút Tiếp tục nay ăn ngay, cooldown thử lại thôi trôi). Bản vá đồng hồ đi qua **ba vòng audit độc lập**, và vòng 1 có một lỗi thật do tôi đưa vào — rò rỉ ~240 reaction mỗi phút tạm dừng — mà phép ghim vẫn xanh vì nó đo sai thứ; đã vá, và nay phép ghim đo thẳng con rò rỉ. **MVP vẫn bị chặn ở đúng một chỗ:** B-36, mọi lệnh ghi qua Bridge chết khi Chrome tự đặt tên tệp. Đã vá 07/09 nhưng điều kiện đóng LÀ một lượt chạy thật, và lần nghiệm thu 04/09 đã THẤT BẠI nên đừng đọc lần này thành xong. Đi vòng được ngay: chọn một thư mục đích trong Side Panel thì đường ghi không qua Chrome Downloads. Bốn mục còn lại chờ Đức (B-36 · B-09 · B-15 · B-20), sáu mục là việc lớn cần brief và audit riêng (B-06 · B-07 · B-31 · B-33 · B-34 · B-35), và B-14 còn nợ đúng một phép đo DOM. Suite 117/117."
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

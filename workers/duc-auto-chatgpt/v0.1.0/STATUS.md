---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**`B-14` và `B-48` đã ĐÓNG 09/09** (đo live, 0 credit ảnh): chip đính kèm có mỏ neo cấu trúc `div[role="group"][aria-label=<tên file>]` + `data-default-action` — cả hai độc lập ngôn ngữ. Chúng nằm ở nhóm RIÊNG `attachmentChip`, **chưa file ship nào đọc**, vì gộp vào `attachmentPreview` sẽ mở cổng gửi SỚM (1 chip trên 2 ảnh cho `3 >= 2`). Suite **130/130**, thử phá **7/7 đỏ**. **Còn ba việc, tất cả CHỜ ĐỨC CHỐT:** `B-47`⑵ (job ảnh cần tab hiện) · `B-49` (nay GỘP hai vế: bỏ `!uploadIsPending()` **và** đổi vòng chờ sang đếm-theo-TÊN — cùng một hàm, một lượt chốt) · `B-50` (panel treo khi nạp ảnh lớn, cần tách nguyên nhân). Việc AI làm được ngay: `B-47`⑴ đổi thông điệp `NO_NEW_IMAGE`."
human_action: "**Ba câu chốt, tôi khuyên đồng ý cả ba.** @Đức:chốt(B-47) Cho cổng **từ chối gửi job ảnh khi tab bị che** không? (Đo 09/09: che thì Chrome không giải mã xong bitmap → job chết sau 300 giây, mất 1 credit mà không lấy được ảnh.) @Đức:chốt(B-49) Cho đổi vòng chờ gắn ảnh sang **đếm theo TÊN FILE** (mỏ neo mới, độc lập ngôn ngữ) **và** bỏ `!uploadIsPending()` không? Hai vế cùng một hàm nên phải đi cùng lượt — làm nửa vời là mở cổng sớm. @Đức:chốt(B-47-loi) Và vế rẻ: cho tôi đổi thông điệp `NO_NEW_IMAGE` thành mã riêng kèm câu *"mở tab lên rồi chạy lại"* — thông điệp hiện tại nói sai nguyên nhân và đã đẩy hai phiên đi tìm lỗi selector."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "**Một lượt đo live 09/09 trả lời ba câu và tìm ra bốn khiếm khuyết mới** (số đầy đủ ở `~~B-15~~`, `~~B-46~~`, `B-47`..`B-50` trong `BACKLOG.md`). Dựng 4 ảnh PNG **1,83MB**, gắn vào một job **chữ** (0 credit ảnh), dò `dom_probe` **~7 lần/giây**; rồi một job **ảnh** (1 credit). ⑴ `B-15` đóng: trong cửa sổ upload thật (**3,82 giây**, ~27 lượt dò) `uploadPending` **0/0/0**, nhưng lúc **đang sinh ảnh** thì `[aria-busy]` **khớp** — nhóm đó đo *"trang đang bận"*, không phải *"ảnh đang upload"*. Cái lo ban đầu **không** tái hiện: ChatGPT tả đúng cả bốn ảnh, `Q001` SUCCESS. ⑵ `B-46` vế cuối đóng, **nhánh xấu là nhánh xảy ra:** tab bị che **CÓ** vẽ `<img>` sinh nhưng bitmap **không giải mã xong** (`ready:false` **3/3** node) → `Q002` chết `NO_NEW_IMAGE` sau 300 giây. **Job ảnh cần tab HIỆN.** ⑶ `B-48` đã vá: probe soi **theo phạm vi** trong `form` soạn thảo; suite **129/129**, thử phá **10/10 đỏ**."
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

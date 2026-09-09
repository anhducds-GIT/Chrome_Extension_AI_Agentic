---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**Đọc bốn mục mới trước khi làm gì:** `B-47` (job ảnh cần tab hiện + thông điệp `NO_NEW_IMAGE` nói sai nguyên nhân) · `B-48` (nới `dom_probe` soi trong `form` soạn thảo — mở đường đóng `B-14` bằng một lượt **0 credit**) · `B-49` (bỏ `!uploadIsPending()` khỏi vòng chờ gắn ảnh) · `B-50` (ảnh mẫu lớn làm panel không phản hồi hàng phút, bridge báo timeout trong khi mutation **vẫn lành**). **Việc AI làm được ngay mà không cần Đức: `B-48`** — nới probe, rồi một job chữ có ảnh mẫu là đóng `B-14`. **Hai việc phải Đức chốt vì đụng cổng sẵn-sàng (`AGENTS.md` 2.4): `B-47` ⑵ và `B-49`.** Vế ⑴ của `B-47` (đổi thông điệp lỗi) thì AI làm được, cùng họ với `B-16`."
human_action: "**MỘT LUẬT VẬN HÀNH MỚI, ĐO ĐƯỢC HÔM NAY: job ảnh phải để tab ChatGPT HIỆN, đừng che.** Tab bị che thì ChatGPT vẫn sinh ảnh nhưng Chrome không giải mã xong bitmap, nên tiện ích **không nhận được** và job chết sau 300 giây — đúng ca vừa xảy ra với `Q002` hôm nay (**mất 1 credit, ảnh nằm trong hội thoại nhưng KHÔNG được lưu**). Job **chữ** thì che vẫn xong bình thường. @Đức:chốt(B-47) Đức chốt giúp: có cho cổng sẵn-sàng **từ chối gửi job ảnh khi tab đang bị che** không (tôi khuyên CÓ — thà chặn trước còn hơn mất credit rồi mới biết)? @Đức:chốt(B-49) và có cho bỏ điều kiện `!uploadIsPending()` khỏi vòng chờ gắn ảnh không (nó đo sai thứ nó khai, và có thể làm job gắn ảnh chết oan khi trang đang sinh)? Hai câu này đụng cổng an toàn nên tôi không tự làm."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "**Một lượt đo live 09/09 trả lời ba câu và tìm ra bốn khiếm khuyết mới.** Tôi dựng 4 ảnh PNG **1,83MB** rồi gắn vào một job **chữ** (0 credit ảnh), dò `dom_probe` **~7 lần/giây** xuyên cửa sổ gắn; rồi một job **ảnh** (1 credit). ⑴ **`B-15` đóng, và câu trả lời khác cả hai giả thuyết:** trong cửa sổ upload thật (**3,82 giây**, ~27 lượt dò) `uploadPending` **0/0/0**, nhưng lúc **đang sinh ảnh** thì `[aria-busy=\"true\"]` **khớp** — nhóm đó đo *\"trang đang bận\"*, không phải *\"ảnh đang upload\"*. Cái lo ban đầu **không** tái hiện: ChatGPT tả đúng cả bốn ảnh (`202` ký tự), job `Q001` **SUCCESS**. ⑵ **`B-46` vế cuối đóng, và nhánh xấu là nhánh xảy ra:** tab bị che **CÓ** vẽ `<img>` sinh (alt `Generated image: Minimalist Lamp…`) nhưng bitmap **không giải mã xong** — `ready:false` **3/3 node** → job `Q002` chết `NO_NEW_IMAGE` sau **300 giây**. **Job ảnh cần tab HIỆN.** Và một câu tôi viết trước đó phải đảo: che cửa sổ không chỉ làm *chữ* không vẽ, nó cũng làm **bitmap ảnh** không giải mã. ⑶ **`B-14` chưa đóng, vì chính cái probe mù:** `buttons` nắp 40 mục bị thanh bên của Đức chiếm hết. Mới: `B-47` `B-48` `B-49` `B-50`."
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

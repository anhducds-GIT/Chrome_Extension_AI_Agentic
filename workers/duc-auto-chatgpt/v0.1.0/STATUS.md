---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "B-41 phần ⑵ và ⑶ — cho `DETECTION_BLIND` chữa được nhưng **đối soát trước, tuyệt đối không gửi lại**, rồi nhận lời nhà cung cấp tự khẳng định làm một nguồn đối soát (đóng luôn B-40). Phần ⑴ xong 09/09. Đây là phần khó nhất của ADR-0050 vì nó nằm SAU lúc gửi: một bộ dò vừa mù rất có thể đang mù trước một kết quả ĐÃ CÓ, và gửi lại lúc đó là đốt lượt thứ hai cho một việc đã xong — đúng cái ADR-0047 sinh ra để chặn."
human_action: "Nạp lại tiện ích ở `chrome://extensions` rồi F5 tab ChatGPT — nạp lại tab một mình là KHÔNG ĐỦ. Đang có ba bản vá chờ nạp: nắp chờ giữa hai lượt Bridge còn 90 giây, câu báo lý do job chết, và tự chữa khi mất kết nối. Rồi hai phép nghiệm thu, không tốn credit nào: ① chạy một loạt job rồi **chuyển tab ChatGPT sang một hội thoại khác** giữa chừng — máy phải tự đưa tab về hội thoại cũ và chạy tiếp, tối đa ba lần mỗi loại lỗi; **đóng hẳn tab thì máy vẫn dừng, cố ý** — nó không tự mở tab mới. ② chọn một thư mục đích, đóng rồi mở lại panel, gọi nạp việc qua Bridge — tên tệp phải đúng VÀ số tệp tên rác trong Downloads KHÔNG tăng (mốc 39). Và chốt một câu cho đường chat thẳng: nó được gửi bất kỳ tin nhắn nào, hay chỉ trong một phiên có giới hạn số lượt và thời gian?"
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-08-26
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "Đang thi hành [ADR-0050](docs/adr/0050-chay-het-job-tru-ba-loai-dung-han.md) — quyết định của Đức 08/09: *“phải chạy được đến hết Job, trừ khi bị halt bởi Captcha”*. Xong **hai trong năm mục**: nắp chờ giữa hai lượt gửi Bridge 5 phút → 90 giây, và **hai trong năm hard stop thôi dừng hẳn** — mất kết nối với tab và sai trang nay tự chữa được (F5, hoặc đưa tab về đúng hội thoại của run), nắp ba lần mỗi loại trong một loạt job. Cửa chữa đứng TRƯỚC cửa gửi lại và không sửa vào trong nó, nên luật *đã gửi thì không gửi lại* còn nguyên. Một số đo ngược với kỳ vọng, ghi ra để đừng ai đọc nhầm: **sai trang trên thực tế phần lớn vẫn dừng hẳn**, vì ca nó xảy ra là ca run chưa gắn vào hội thoại nào, và lúc đó không có đích để quay về — chữa thật thì phải cho phép mở hội thoại mới, một quyết định khác cần Đức. Sổ nợ gói **15 mục mở**. Suite **121/121**, thử phá 12/12. **MVP vẫn bị chặn ở đúng một chỗ:** B-36 — sau khi Đức chọn thư mục đích thì đường ghi chạy đúng, nhưng panel đóng rồi mở lại vẫn bắt chọn lại tay, và đó là điều kiện đóng chưa đạt."
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

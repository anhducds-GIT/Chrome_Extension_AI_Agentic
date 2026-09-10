---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**ĐỌC `## ROADMAP MVP` ở cuối `BACKLOG.md`.** **PILOT 5 VÒNG REASONING ĐÃ CHẠY THẬT 10/09** — mỗi vòng máy đọc khối copy GPT tự soạn rồi máy gửi tiếp, Đức không dán tay lần nào (805 → 1069 → 1213 → 1206 → 1331 ký tự). **`~~B-57~~` vá + nghiệm thu live:** `chat.read` trả thêm `generating`, lấy từ đúng `findStopButton()` của runner; **`generating: false` là tuyên bố DUY NHẤT rằng câu trả lời đã xong** — chữ đứng yên KHÔNG nói gì cả (tôi đoán sai kiểu này ba lần: `busy:false`, rồi 'số ký tự đứng yên'). **`B-59` MỚI, P1, chặn `B-56`⓶:** trang trả lời xong rồi mà DOM sống vẫn cụt — 3/4 vòng đọc ra 48–173 ký tự và KHÔNG có khối, nạp lại thì hiện đủ 2934–3450 ký tự kèm khối. Nên luật *không-có-khối-thì-dừng* phải thêm **nạp lại một lần rồi đọc lại**. Còn mở: `B-58` (bốn cửa nói bốn chuyện lúc bị chặn, CHƯA đo được cờ nào giữ), `B-56`⓶, `B-47`⑴, `B-51`, `B-54`, `B-50`."
human_action: "**Đọc kết quả kiểm toán ở `BACKLOG.md` mục *Kết quả pilot 5 vòng*.** GPT chấm 27 nhóm luật: **CỨNG 7 · MỀM 3 · RỖNG 11 · chưa đủ bằng chứng 6**. Tôi kiểm lại ba kết luận sắc nhất: **một đúng** (`git push` trần không bị chặn — không có `pre-push` hook) và **hai SAI**: `innerHTML` CÓ ghim ở `artifact-integrity-smoke.mjs:71`, và `--soat` CÓ hook — `core.hooksPath = .githooks`, `commit-msg` chạy `claim.mjs --soat` và đã chặn tôi một lần trong phiên. Câu *"`.git/hooks/` trống"* tôi báo trước đó là SAI: tôi không kiểm `core.hooksPath`. @Đức:chốt(vòng-6) GPT đề nghị vòng 6 thiết kế kiến trúc cưỡng chế cho Top 5 — **số vòng là của Đức**, tôi không tự chạy tiếp. @Đức:chốt(B-56-2) Hai phanh cho nửa ⓶ vẫn chờ: **không có khối thì dừng** (nay phải kèm bước nạp lại của `B-59`) và **chỉ lấy chữ trong khối**. @Đức:bấm(B-49) Vẫn cần một job **có ảnh mẫu** để đóng nốt `~~B-49~~`."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-09-10
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Live 10/09 trên HEAD 48e9fb36: `~~M0~~` `jobs.add` trả `checkpoint.verified: true` không cần mở hộp chọn thư mục, rồi hai chuỗi 3 + 10 ảnh — **13/13 thành công, 0 hỏng, 0 thử lại**, 13 tên đúng, 13 mã băm khác nhau, mỗi job 85s–183s"
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

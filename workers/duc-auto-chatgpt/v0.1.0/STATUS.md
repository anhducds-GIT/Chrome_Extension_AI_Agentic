---
schema: extension-status/v2
id: duc-auto-chatgpt
name: Duc Auto ChatGPT
lifecycle: active
owner: claude
priority_rank: 2
next_step: "**Sổ nợ 38 → 3.** Còn `B-50` (panel chết một nửa: cửa router 166 ms trong khi cửa executor 11/11 hết giờ) · `B-58` (các cửa nói khác nhau) · `B-70` (cầu nối không tự bật, cần Đức bấm một lượt). **Luật đắt nhất, mua bằng hai lượt đo live:** không tín hiệu nào trên trang trả lời được *"xong chưa"*. Nút Stop **dương tính giả** (tắt ở giây 8,7 khi câu trả lời mới có 26/85 ký tự) · dạng `data-turn-id` **âm tính giả** (còn tạm 22 giây sau khi nội dung đã đủ 1096 ký tự). Dạng id chỉ nói *DOM sống chưa kết luận được*, và **nạp lại** là thứ duy nhất gỡ. **Luật vận hành đã xác nhận: đừng thu nhỏ Chrome khi chuỗi đang chạy** — tab hiện thì chữ chạy 13→909→1096 trong 5 giây, tab che thì đứng im. Xem `~~B-59~~`."
human_action: "@Đức:chốt(bật-cầu-nối) **Chạy một lượt `scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1`** để cầu nối tự bật cùng Windows như bản Gemini (`B-70`). @Đức:chốt(suite) **`npm test` gốc repo vẫn chết** ở `tests/repo-structure-smoke.mjs` — việc của lane `_code`, đừng xoá phép kiểm cho suite xanh. @Đức:chốt(pilot) **Pilot điều phối cần một phiên CC MỚI** (Haiku/Sonnet): `drafts/pilot-dieu-phoi/GOI-VIEC.md`."
version_source: workers/duc-auto-chatgpt/v0.1.0/manifest.json
last_verified: 2026-09-10
last_verified_commit: 00d1f99b44bd490cac079da5e803917346571a26
last_verified_how: "Live 10/09 trên HEAD 48e9fb36: `~~M0~~` `jobs.add` trả `checkpoint.verified: true` không cần mở hộp chọn thư mục, rồi hai chuỗi 3 + 10 ảnh — **13/13 thành công, 0 hỏng, 0 thử lại**, 13 tên đúng, 13 mã băm khác nhau, mỗi job 85s–183s"
evidence_ref: workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md
current_focus: "**Nền chạy chuỗi reasoning đã xong và tốn 0 usage CC** — `chay-chuoi.bat` / `dung-chuoi.bat`, chọn hồ sơ và xác nhận hội thoại từ danh sách, sáu mép an toàn đã bắt được lỗi thật (`~~B-57~~` `~~B-61~~` `~~B-62~~` `~~B-63~~` `~~B-68~~` `~~B-59~~`/`~~B-60~~`). Luật và cách dùng: mục *Chuỗi reasoning nhiều vòng* trong `AI-OPERATOR-GUIDE.md`. **Chỗ hỏng không nằm ở suy luận, nằm ở GIÁC QUAN** — mọi lỗi đắt của hai ngày qua đều ở câu *bây giờ trên trang đang xảy ra chuyện gì*, và cụ thể là **một dấu hiệu VẮNG MẶT bị đọc thành bằng chứng kết thúc**."
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

**Soát lại 11/09 bằng mã, và ba mục cũ ở đây đều đã SAI** — chúng nằm lại sau khi việc đã
đóng. Ghi ra vì một giới hạn sai còn hại hơn không ghi giới hạn nào: nó làm người ta e dè
đúng chỗ không cần, và yên tâm đúng chỗ cần dè.

- ~~*"Hai selector chưa từng khớp lần nào"* (**B-14**, **B-15**)~~ — cả hai **ĐÓNG sau đo
  live 09/09**. `B-14` tìm được mỏ neo cấu trúc (`div[role="group"]` mang **tên file**, không
  phụ thuộc ngôn ngữ); `B-15` hoá ra nhóm đó đo *"trang đang bận"*, không phải *"ảnh đang tải
  lên"* — đo sai THỨ, không phải đo hụt.
- ~~*"Thử lại rộng hơn tên gọi — gửi rồi vẫn có thể gửi lại"* (**B-19**)~~ — **ĐÓNG
  2026-09-06**. Kiểm lại hôm nay: `canRetry()` mang `!submissionMayExist(item)`, và
  [ADR-0047](docs/adr/) đã `Accepted`. Mặc định nay là **không gửi lại sau khi đã gửi**, trừ
  khi đối soát khẳng định được.

**Năm giới hạn còn THẬT, mỗi cái đo được:**

1. **Job ảnh cần tab HIỆN.** Tab bị che *có* vẽ ảnh nhưng bitmap không giải mã xong → job chết
   `NO_NEW_IMAGE` sau 300 giây (đo 09/09, `~~B-46~~`).
2. **Không tín hiệu nào trên trang trả lời được *"xong chưa"*.** Nút Stop **dương tính giả**
   (nói xong khi mới có 26/85 ký tự) · dạng `data-turn-id` **âm tính giả** (còn tạm 22 giây
   sau khi nội dung đã đủ 1096 ký tự). Bộ chạy dùng dạng id cho đúng việc nó làm được: chặn
   một kết luận từ DOM chưa tin được, rồi **nạp lại** (đo 11/09, `~~B-59~~`).
3. **Đừng thu nhỏ Chrome khi chuỗi đang chạy.** Tab hiện: chữ chạy 13 → 909 → 1096 ký tự trong
   5 giây. Tab bị che: **đứng im ngay**. Chuỗi vẫn chạy, nhưng mỗi vòng mất thêm một lượt nạp
   lại (đo 11/09).
4. **Panel có thể chết một nửa** — cửa router trả lời 166 ms trong khi cửa executor hết giờ
   100%. Chữa: đóng rồi mở lại side panel (`B-50`).
5. **Cầu nối không tự bật cùng Windows** như bản Gemini; tắt là kênh chết lặng (`B-70`).

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

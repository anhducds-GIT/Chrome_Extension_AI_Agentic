---
schema: extension-status/v2
id: duc-auto-gemini
name: Duc Auto Gemini (Platform)
lifecycle: active
owner: claude
priority_rank: 3
next_step: "Gói này chỉ còn BA việc mở, và không việc nào AI làm tiếp được. Hai việc chờ Đức bấm — và gộp được vào MỘT lượt chạy: bấm dừng giữa chừng (sau lệnh dừng không prompt nào được bay đi nữa), rồi bấm sang tab khác giữa chừng (prompt phải vẫn vào tab đã khoá). Cả hai đã vá tĩnh và có phép kiểm tái hiện, chỉ thiếu một lượt nghiệm thu thật. Việc thứ ba (gộp BẢY module còn giống hệt nhau sang thư mục chung — đo lại 07/09, không phải tám: cái thứ tám đã trôi dạt 28/08) cần khoá gốc repo nên không thuộc gói này. Trôi dạt tiếp thì nay có chuông: phép ghim `tests/shared-modules-no-drift-static.mjs`."
human_action: "Trên MỘT hồ sơ Chrome, cần đủ BỐN thứ — đo 07/09 thấy chưa hồ sơ nào đủ, nên lượt nghiệm thu chưa chạy được: ⑴ nạp lại tiện ích ở chrome://extensions ⑵ mở tab gemini.google.com/app và để nó là tab đang hoạt động ⑶ mở side panel ⑷ bật công tắc Chế độ phát triển. Xong bốn cái đó thì chạy MỘT lượt thật và làm hai việc giữa chừng: bấm Dừng, và bấm sang tab khác — một lượt đó nghiệm thu cả hai mục P1 còn lại của gói."
version_source: workers/duc-auto-gemini/v0.2.0/manifest.json
last_verified: 2026-09-07
last_verified_commit: aa2c0b873cba43bc21866928590992823814c7f1
last_verified_how: "Lớp nối nhiều hồ sơ Chrome, nghiệm thu CHỈ ĐỌC qua Bridge thật với 2 hồ sơ thật, 0 credit: đạt cả bốn bảo đảm (kể đúng hồ sơ kèm tên Đức đặt · quên --target thì TARGET_AMBIGUOUS chứ không tự chọn · đích lạ thì TARGET_NOT_CONNECTED chứ không rơi sang hồ sơ khác · served_by đúng đích ở mọi lượt). LƯU Ý phạm vi: đây KHÔNG phải nghiệm thu G-01 — lượt live bấm dừng vẫn CHƯA chạy, xem giới hạn 1 và 2"
evidence_ref: workers/duc-auto-gemini/v0.2.0/evidence-multiprofile-nghiem-thu-20260907/README.md
current_focus: "Nợ gói 9 -> 3 trong ngày 06/09. Đóng xong: dừng cứng khi extension bị mù (nhánh kia thêm lớp này sau khi một lượt live đốt sáu lượt tạo ảnh; gói này chưa có) - sổ cái thôi khai sai là đã ghi đè lên bằng chứng cũ (phép so đường dẫn cũ không bao giờ đúng được một lần nào) - nút CHAT ZOOM hỏi nhầm câu hỏi của runner nên tự xám trên 6/10 trang Gemini, Đức đã nghiệm thu - bốn lệnh Bridge còn nợ nay đủ cả bốn, gồm cả CLI - soát README bằng cách đối chiếu từng con số với code. Hai việc lớn nhất (nhiều ảnh một job, poll A/B) NGỦ ĐÔNG theo chốt của Đức vì Gemini chưa bao giờ làm thế; đã đặt bẫy để lúc nó xảy ra thì sổ cái tự khai. Suite 88 -> 94, thử phá 61/61 đều bị bắt."
ref_readme: workers/duc-auto-gemini/v0.2.0/README.md
ref_handoff: workers/duc-auto-gemini/v0.2.0/HANDOFF.md
ref_runbook: workers/duc-auto-gemini/v0.2.0/AI-OPERATOR-GUIDE.md
ref_backlog: workers/duc-auto-gemini/v0.2.0/BACKLOG.md
---

# STATUS — Duc Auto Gemini (Platform)

> **File này là gì:** trạng thái vận hành, một trang, cho mắt Đức đọc.
> **File này KHÔNG phải gì:** không phải README thứ hai. Kiến trúc, cách vận hành, bảng lỗi
> đã gặp — đều nằm ở file khác, dưới đây chỉ có đường dẫn tới.
> Dashboard ở gốc repo (`DASHBOARD.md`) đọc phần đầu file này để sinh ra bảng tổng.

## Ý tưởng ban đầu

Cùng bài toán với nhánh ChatGPT — chạy kế hoạch XLSX tạo ảnh hàng loạt — nhưng trên
**Gemini**. Hai nhà cung cấp có trang khác nhau, cách nhận biết "ảnh đã xong" khác nhau,
nên phải có hai bản, không dùng chung một bản được.

## Mục đích

Chạy kế hoạch XLSX trên Gemini, ngay trong trình duyệt của Đức, không gửi gì ra máy chủ lạ.
Điều khiển từ xa được bằng **Bridge**, để một AI khác vận hành hộ. Số lệnh Bridge hiện có:
xem cột **Method Bridge [ĐO]** trên [`DASHBOARD.md`](../../../DASHBOARD.md) — máy đếm, luôn tươi.

## Đã kiểm chứng tới đâu

Lời khai và cách kiểm nằm ở `last_verified` / `last_verified_how` đầu file. **Chi tiết không
chép lại ở đây** — đọc bằng chứng:
[`evidence-multiprofile-nghiem-thu-20260907/README.md`](evidence-multiprofile-nghiem-thu-20260907/README.md),
[`evidence-stop-reload-20260826/README.md`](evidence-stop-reload-20260826/README.md),
diễn biến phiên ở cuối [`HANDOFF.md`](HANDOFF.md), bảng lỗi thật ở
[`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

## Giới hạn đã biết

1. **Hai bản vá chưa live** — lời nhắn (26/08) và hành vi G-01 (27/08) đều nằm trong code.
   **Đo 07/09: một hồ sơ đã nạp code mới, một hồ sơ CHƯA.** Hồ sơ `kaito` trả về đủ bộ lệnh
   Bridge của HEAD; hồ sơ `anhducds` **thiếu bốn lệnh thêm ngày 06/09**, tức nó còn ôm bản
   extension cũ trong RAM — dù **cả hai** đều báo `legacy: false` và cùng
   `extension_version: 0.2.0`. Nên đừng tin hai trường đó: **muốn biết hồ sơ nào chạy code mới
   thì đối chiếu bộ lệnh `capabilities` của nó với bộ lệnh của HEAD.** Bằng chứng:
   [`evidence-multiprofile-nghiem-thu-20260907/`](evidence-multiprofile-nghiem-thu-20260907/README.md).
2. **G-01 đã vá TĨNH, chưa kiểm chứng LIVE** — race "dừng nhận trước lúc gửi mà prompt vẫn
   bay" (đo thật 26/08) đã tái hiện được bằng test, vá theo hướng huỷ-theo-attempt (Đức Go
   27/08), test đỏ→xanh + 6 phép phá thử đều bị bắt. Nhưng chính lỗi này suite tĩnh từng
   bỏ lọt, nên **chỉ được coi là XONG sau trial live** đọc sổ cái không còn chuỗi
   `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED` (Đức đã duyệt trial, chạy sau reload).
   **Thử 07/09 và DỪNG trước khi tiêu đồng nào:** Bridge sống, 2 hồ sơ nối, nhưng không hồ sơ
   nào hội đủ điều kiện chạy (một cái panel đóng + code cũ, một cái code mới + panel mở nhưng
   **không có tab hội thoại Gemini đang hoạt động** để khoá vào). Giao thức **cố ý không có**
   lệnh mở tab, nên đây là việc Đức bấm — bốn điều kiện ở `human_action` đầu file.
3. **Còn nợ nhánh ChatGPT một số tính năng và method.** Con số cụ thể **không ghi ở đây** —
   nó đổi mỗi lần port xong một món, và số gõ tay thì mục ngay. **Số hiện tại lấy ở khối máy
   sinh trong** [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md); [`BACKLOG.md`](BACKLOG.md)
   nói *có nợ những món nào*, không giữ con số. Lý do tách như vậy: danh sách port gõ tay
   trong sổ của nhánh ChatGPT đã lạc hậu một lần (B-07).
4. **`README.md` của package này là bản chép từ nhánh ChatGPT** — tiêu đề vẫn ghi "Duc Auto
   ChatGPT V0.3", nên nó dẫn sai tên ngay dòng đầu (**G-03**).

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| **Vận hành / debug qua Bridge, và bảng lỗi thật đã gặp trên trang** | [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md) |
| Luật riêng của package, Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Phiên trước làm tới đâu (cuối file) | [`HANDOFF.md`](HANDOFF.md) |
| Việc còn mở, đánh số G-xx | [`BACKLOG.md`](BACKLOG.md) |
| Extension làm gì (**lưu ý giới hạn 4**) | [`README.md`](README.md) |
| Schema workbook XLSX | [`DAC_XLSX_RUN_PLAN_V1.md`](DAC_XLSX_RUN_PLAN_V1.md) |
| Đức đã chốt những gì | [`decisions.md`](decisions.md) |
| Nhánh này hơn/kém nhánh ChatGPT chỗ nào | [`../../../FEATURE-PARITY.md`](../../../FEATURE-PARITY.md) |

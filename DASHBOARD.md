# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh ngày 2026-09-12. Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **XUNG ĐỘT** — 3 đơn vị cùng khai `priority_rank: 1` (`_root` · `workers/duc-auto-gg-flow-video/v0.1.0` · `workers/hnx-fetch/v0.1.0`). Chỉ một việc được là số 1; sửa STATUS rồi sinh lại.
2. **Phiên gần nhất** — 2026-09-12 · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| chrome-extension-ai-agentic | 0.3.0 | active | 0 | 31 | 2026-09-09 @ `4da1e9e` — migrate bộ khung 0.3.0 → 1.8.0; cổng cấu trúc còn ĐỎ ở B12 (42 ADR) và B16 — xem BACKLOG ([bằng chứng](HANDOFF.md)) | CÓ (40 commit) | Vừa lên khung 1.8.0: nhận bộ nén luật, Context Compiler, can-nang đo token, bảng sống. Cổng nay chặt hơn và đang nêu nợ có thật. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 24 | 138 | 2026-09-10 @ `00d1f99` — Live 10/09 trên HEAD 48e9fb36: `~~M0~~` `jobs.add` trả `checkpoint.verified: true` không cần mở hộp chọn thư mục, rồi hai chuỗi 3 + 10 ảnh — **13/13 thành công, 0 hỏng, 0 thử lại**, 13 tên đúng, 13 mã băm khác nhau, mỗi job 85s–183s ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (99 commit) | **Nền chạy chuỗi reasoning đã xong và tốn 0 usage CC** — `chay-chuoi.bat` / `dung-chuoi.bat`, chọn hồ sơ và xác nhận hội thoại từ danh sách, sáu mép an toàn đã bắt được lỗi thật (`~~B-57~~` `~~B-61~~` `~~B-62~~` `~~B-63~~` `~~B-68~~` `~~B-59~~`/`~~B-60~~`). Luật và cách dùng: mục *Chuỗi reasoning nhiều vòng* trong `AI-OPERATOR-GUIDE.md`. **Chỗ hỏng không nằm ở suy luận, nằm ở GIÁC QUAN** — mọi lỗi đắt của hai ngày qua đều ở câu *bây giờ trên trang đang xảy ra chuyện gì*, và cụ thể là **một dấu hiệu VẮNG MẶT bị đọc thành bằng chứng kết thúc**. | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 23 | 98 | 2026-09-07 @ `aa2c0b8` — Lớp nối nhiều hồ sơ Chrome, nghiệm thu CHỈ ĐỌC qua Bridge thật với 2 hồ sơ thật, 0 credit: đạt cả bốn bảo đảm (kể đúng hồ sơ kèm tên Đức đặt · quên --target thì TARGET_AMBIGUOUS chứ không tự chọn · đích lạ thì TARGET_NOT_CONNECTED chứ không rơi sang hồ sơ khác · served_by đúng đích ở mọi lượt). LƯU Ý phạm vi: đây KHÔNG phải nghiệm thu G-01 — lượt live bấm dừng vẫn CHƯA chạy, xem giới hạn 1 và 2 ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-multiprofile-nghiem-thu-20260907/README.md)) | CÓ (3 commit) | Nợ gói 9 -> 3 trong ngày 06/09. Đóng xong: dừng cứng khi extension bị mù (nhánh kia thêm lớp này sau khi một lượt live đốt sáu lượt tạo ảnh; gói này chưa có) - sổ cái thôi khai sai là đã ghi đè lên bằng chứng cũ (phép so đường dẫn cũ không bao giờ đúng được một lần nào) - nút CHAT ZOOM hỏi nhầm câu hỏi của runner nên tự xám trên 6/10 trang Gemini, Đức đã nghiệm thu - bốn lệnh Bridge còn nợ nay đủ cả bốn, gồm cả CLI - soát README bằng cách đối chiếu từng con số với code. Hai việc lớn nhất (nhiều ảnh một job, poll A/B) NGỦ ĐÔNG theo chốt của Đức vì Gemini chưa bao giờ làm thế; đã đặt bẫy để lúc nó xảy ra thì sổ cái tự khai. Suite 88 -> 94, thử phá 61/61 đều bị bắt. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 104 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Đã đi hết đường trên trang Flow mới: ô nhập prompt, cụm nút, nút tạo, nhận diện video vừa sinh — tất cả đều đo được trên trang thật. Thêm một lớp chặn mới: Flow báo quá tải. Đây là loại trạng thái thứ ba, khác hẳn hai loại cũ, và là loại DUY NHẤT mà cứ thử đi thì tốn tiền thật, vì hai loại kia đều dừng trước khi gõ. Đức chốt dừng hẳn cả mẻ, không tự thử lại. Suite 101/101, thử phá 10/10. | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |
| Duc Scouter (seed v0.1) | 0.1.0 | paused | 0 | 16 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | TẠM DỪNG 08/09 — Đức chuyển sang ba gói duc-auto-*. Gói dừng ở chỗ SẠCH: sổ nợ còn đúng hai mục nhỏ, suite xanh, đột biến 0 sống sót, không việc gì dở dang. Ba lệnh bấm và gõ đã chạy trên một trang THẬT và đúng: ĐẠT 11/11 trên Chrome 152, kể cả ca phải cuộn hai chiều và ca hai nút chữ giống hệt nhau. Đường ghi có phanh (công tắc trong bảng bên, mặc định tắt, trần 200 lượt — Đức nâng từ 50 ngày 08/09). Khối phanh vừa được vá 08/09 theo chốt của Đức: hai lỗi chỉ nổ khi nhiều lượt chồng nhau — phanh khẩn bị bật lại, và trần 200 bị vượt — nay đã đóng, có phép ghim tái hiện được và đột biến giết được. Hai việc lớn còn lại: chọn trang thử THỨ HAI, và cả VÒNG tự cải tiến chưa ai chạy trọn một lần. | [STATUS](workers/duc-scouter/v0.1.0/STATUS.md) |
| HNX Fetch | 0.1.0 | active | 0 | 5 | 2026-09-08 @ `7cb9f76` — Chạy thật trọn vòng qua chính extension trong Chrome: ping trả đúng tên gói, bảng năng lực nhìn từ ngoài dây đúng bốn lệnh, scout.fetch lấy trang thật status 200, ngân sách trừ đúng, một lượt tai-ket-qua.mjs đầy đủ 0 hỏng ([bằng chứng](workers/hnx-fetch/v0.1.0/evidence/2026-09-08-chay-that-lan-dau.md)) | CÓ (7 commit) | Gói đã đứng vững: chạy thật trọn vòng trong Chrome, phanh khẩn bấm tay ăn thật, và từ 08/09 có tệp ghép cặp cùng máy chủ RIÊNG nên không còn phải chỉ đích danh extension nữa. Sổ nợ RỖNG. Việc còn lại chỉ là chạy mỗi ngày một lượt. | [STATUS](workers/hnx-fetch/v0.1.0/STATUS.md) |

## D · Sức khoẻ điều hướng [ĐO]

| Nợ | Số | Nghĩa là gì |
|---|---:|---|
| Đơn vị chưa khai STATUS | 0 | mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức |
| Link chết trong file cổng | 0 | kiểm 11 link ở llms.txt và bảng B |
| Thư mục top-level chưa khai chủ | 1 | chưa khai trong khối `areas` của `.repo-structure.json` |
| Tài liệu quá hạn chưa rà | 1 | `status: active` mà quá `ttl_days` tính từ commit cuối chạm vào |

Thư mục chưa khai chủ: `drafts/`

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

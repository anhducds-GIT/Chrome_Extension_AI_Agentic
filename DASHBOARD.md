# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `c33e378` (2026-09-07). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — Chờ Flow hết quá tải rồi chạy MỘT job — kiểm chứng đầu tiên, và là thứ đưa gói lên active. Job Q001 đã nằm sẵn trong hàng đợi, chưa bấm chạy. Lưu ý tiền: chip đang để x2 mà trang tự khai mỗi video 6 credit, nên nếu runner không tự hạ về x1 thì một job là 12 credit chứ không phải 6. · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-07 @ `c33e378` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Duc Auto ChatGPT | 0.3.0 | active | 23 | 116 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (33 commit) | Phiên làm việc theo tab (ADR-0046) — bước 1 ĐÓNG BĂNG với phán quyết PASS của GPT sau 6 vòng audit, 32 mutation đỏ, suite 102/102. Chờ pilot vận hành thật (cần Đức duyệt). Việc cũ vẫn mở: B-14…B-21, B-34, B-35, audit độc lập gói khoảng-nghỉ-giữa-job. Và một mục P1 mà ô này bỏ sót cho tới 06/09: B-36 — mọi mutation Bridge chết khi đích ghi rơi về Chrome Downloads. Đã thử vá 04/09, nghiệm thu live cùng ngày và bản vá KHÔNG giữ được; chẩn đoán nay đã lật: determiner có đề xuất tên, Chrome bỏ qua đề xuất. Đường đi vòng vẫn dùng được: chọn một thư mục đích trong Side Panel thì đường ghi không qua Chrome Downloads nữa | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 23 | 97 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (26 commit) | Nợ gói 9 -> 3 trong ngày 06/09. Đóng xong: dừng cứng khi extension bị mù (nhánh kia thêm lớp này sau khi một lượt live đốt sáu lượt tạo ảnh; gói này chưa có) - sổ cái thôi khai sai là đã ghi đè lên bằng chứng cũ (phép so đường dẫn cũ không bao giờ đúng được một lần nào) - nút CHAT ZOOM hỏi nhầm câu hỏi của runner nên tự xám trên 6/10 trang Gemini, Đức đã nghiệm thu - bốn lệnh Bridge còn nợ nay đủ cả bốn, gồm cả CLI - soát README bằng cách đối chiếu từng con số với code. Hai việc lớn nhất (nhiều ảnh một job, poll A/B) NGỦ ĐÔNG theo chốt của Đức vì Gemini chưa bao giờ làm thế; đã đặt bẫy để lúc nó xảy ra thì sổ cái tự khai. Suite 88 -> 94, thử phá 61/61 đều bị bắt. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 103 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Đã đi hết đường trên trang Flow mới: ô nhập prompt, cụm nút, nút tạo, nhận diện video vừa sinh — tất cả đều đo được trên trang thật. Thêm một lớp chặn mới: Flow báo quá tải. Đây là loại trạng thái thứ ba, khác hẳn hai loại cũ, và là loại DUY NHẤT mà cứ thử đi thì tốn tiền thật, vì hai loại kia đều dừng trước khi gõ. Đức chốt dừng hẳn cả mẻ, không tự thử lại. Suite 101/101, thử phá 10/10. | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |
| Duc Scouter (seed v0.1) | 0.1.0 | building | 0 | 7 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Scouter nay bấm và gõ được như tay người, không chỉ nhìn. Đường ghi là một lõi riêng nên phần chỉ-đọc vẫn chứng minh được là chỉ đọc. Chưa có phanh nào cho đường ghi, và chưa lần nào bấm trên trang thật. | [STATUS](workers/duc-scouter/v0.1.0/STATUS.md) |

## D · Sức khoẻ điều hướng [ĐO]

| Nợ | Số | Nghĩa là gì |
|---|---:|---|
| Đơn vị chưa khai STATUS | 0 | mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức |
| Link chết trong file cổng | 0 | kiểm 9 link ở llms.txt và bảng B |
| Thư mục top-level chưa khai chủ | 0 | chưa khai trong khối `areas` của `.repo-structure.json` |
| Tài liệu quá hạn chưa rà | 1 | `status: active` mà quá `ttl_days` tính từ commit cuối chạm vào |

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

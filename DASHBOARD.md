# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `b182d9c` (2026-09-04). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — F-25 bước ③ — CẦN ĐỨC CHỐT: cho vòng chạy job sống ở service worker thay vì side panel. Đây là đổi lớn nên chưa tự làm. Trước đó cần bước ①: đo xem cái gì giết vòng lặp (panel đóng? cửa sổ đổi? service worker ngủ kéo panel theo?) — chưa đo được, không đoán. Bước ② ĐÃ XONG nên bước ① nay rẻ hơn hẳn: chuỗi chết bị phát hiện trong khoảng một phút thay vì hai mươi hai phút. Việc rẽ đang chờ Đức: nạp lại tiện ích rồi chạy MỘT job (Image + chip x3) để kiểm live F-26 — hỏng thì vẫn 0 credit. · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-04 @ `b182d9c` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | idea | 0 | 12 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa từng chạy pilot nào. Đây là mã quan sát ở gốc repo, còn nằm ngoài cấu trúc workers/ — phiên S8 sẽ chuyển nó vào đúng chỗ. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 23 | 106 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (23 commit) | Phiên làm việc theo tab (ADR-0046) — bước 1 ĐÓNG BĂNG với phán quyết PASS của GPT sau 6 vòng audit, 32 mutation đỏ, suite 102/102. Chờ pilot vận hành thật (cần Đức duyệt). Việc cũ vẫn mở: B-14…B-21, B-34, B-35, audit độc lập gói khoảng-nghỉ-giữa-job | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 87 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (10 commit) | Lớp nối nhiều hồ sơ Chrome đã chuyển xong sang nhánh này (02/09), theo mẫu đã qua kiểm chéo của nhánh Flow Video: máy chủ chịu được nhiều kết nối và dừng an toàn khi nhập nhằng, bảng điều khiển có ô đặt tên hồ sơ, 83/83 phép kiểm xanh, 10/10 phép thử phá hoại đều bị bắt. Máy chủ mới đã chạy và thấy một kết nối kiểu cũ — đang chờ Đức nạp lại tiện ích rồi đặt tên. Hai nợ cũ giữ nguyên: đo thật nhánh tắt máy chủ quá hai phút, và G-01 chờ một lượt chạy thật. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 97 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | F-25 bước ② XONG: `run.status` nay trả thêm khối `loop` nói rõ vòng chạy còn sống hay đã chết, đứng yên bao lâu, và chết ở BƯỚC NÀO. Nhịp tim do chính vòng lặp chạy job đập ra chứ không phải một đồng hồ riêng — vì lúc chuỗi gãy ngày 02/09 thì side panel VẪN SỐNG, chính nó trả lời `run.status`, nên đồng hồ riêng sẽ không thấy gì. Mỗi giai đoạn tự khai trần chờ riêng, `WAITING_JOB` lấy trần từ timeout thật của job. F-14 ĐÓNG HOÀN TOÀN từ 02/09 (nửa sau đã chứng minh: sổ cái ghi nhãn Video sau khi chuyển mode). F-26 XONG code, chờ kiểm live. Suite 95/95, thử phá 25/25 đều bị bắt. | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

## D · Sức khoẻ điều hướng [ĐO]

| Nợ | Số | Nghĩa là gì |
|---|---:|---|
| Đơn vị chưa khai STATUS | 0 | mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức |
| Link chết trong file cổng | 0 | kiểm 9 link ở llms.txt và bảng B |
| Thư mục top-level chưa khai chủ | 0 | chưa khai trong khối `areas` của `.repo-structure.json` |
| Tài liệu quá hạn chưa rà | 0 | `status: active` mà quá `ttl_days` tính từ commit cuối chạm vào |

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

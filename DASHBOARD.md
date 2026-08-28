# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `bee2eb0` (2026-08-28). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 4 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa khai STATUS; đây là một việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto ChatGPT | 0.3.0 | active | 22 | 97 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (3 commit) | B-14…B-21 đang mở; việc thật không chạy qua trần 90s của run.trial (B-17) | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | CHƯA KHAI STATUS — cần khai trạng thái và việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 84 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | KHÔNG | Lớp vận chuyển Bridge đã xong và đã kiểm chứng live cả hai bản (28/08). Còn một nhánh chưa đo thật: tắt host quá 2 phút thì thang bỏ cuộc và alarm 30 giây lo tiếp — hiện chỉ ghim bằng test. G-01 vẫn chờ trial live riêng. Còn nợ nhánh ChatGPT một số tính năng và method — xem BACKLOG.md và FEATURE-PARITY.md | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 20 | 86 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản vá FLOW-04 (khoá nút Create vào đúng form composer + tiền kiểm runtime_contract) đã xong, audit PASS, suite 84/84 — nhưng CHƯA kiểm live được: extension nạp ở 3 profile Chrome nên Bridge đang nói chuyện với bản cũ | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

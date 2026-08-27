# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `a173507` (2026-08-27). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 4 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa khai STATUS; đây là một việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto ChatGPT | 0.3.0 | active | 22 | 94 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | KHÔNG | B-14…B-21 đang mở; việc thật không chạy qua trần 90s của run.trial (B-17) | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | CHƯA KHAI STATUS — cần khai trạng thái và việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 83 | 2026-08-26 @ `dd3c736` — Trial live cặp run.stop/chat.reload 9/9 bước, khoá RUN_ACTIVE chứng minh thật ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-stop-reload-20260826/README.md)) | CÓ (1 commit) | G-01 đã vá hành vi (Đức Go 27/08, hướng huỷ-theo-attempt) — test race đỏ→xanh, CHỜ trial live sau khi Đức reload extension; lời khai kiểm chứng bên dưới là của bản TRƯỚC bản vá; còn nợ nhánh ChatGPT một số tính năng và method — xem BACKLOG.md và FEATURE-PARITY.md | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 19 | 82 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | FLOW-01: chụp bằng chứng DOM trang Flow qua dom_probe (bootstrap đã fork, Bridge khoá chỉ-đọc, chưa chạy được job video nào) | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

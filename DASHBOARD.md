# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `fa205f3` (2026-09-02). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **CHƯA KHAI** — chưa STATUS nào khai `next_step` (trường của schema `extension-status/v2`, phiên S3 thêm). Tạm thời xem cột "Việc đang mở" ở bảng B.
2. **Phiên gần nhất** — 2026-09-02 @ `fa205f3` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 4 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa khai STATUS; đây là một việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto ChatGPT | 0.3.0 | active | 22 | 97 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (4 commit) | B-14…B-21 đang mở; việc thật không chạy qua trần 90s của run.trial (B-17) | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | unclassified · CHƯA KHAI STATUS | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | CHƯA KHAI STATUS — cần khai trạng thái và việc đang mở. | CHƯA KHAI STATUS |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 84 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | KHÔNG | Lớp vận chuyển Bridge đã xong và đã kiểm chứng live cả hai bản (28/08). Còn một nhánh chưa đo thật: tắt host quá 2 phút thì thang bỏ cuộc và alarm 30 giây lo tiếp — hiện chỉ ghim bằng test. G-01 vẫn chờ trial live riêng. Còn nợ nhánh ChatGPT một số tính năng và method — xem BACKLOG.md và FEATURE-PARITY.md | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 20 | 87 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Multi-profile Bridge (hướng A, Đức duyệt 28/08) đã code xong: host giữ nhiều kết nối + target/bridge.sessions/served_by, panel có ô tên hồ sơ, sửa nốt F-14 (chip mode qua pressFlowControl). Suite xanh, mutation đỏ đủ. CHƯA kiểm live: cần Đức chép host mới sang thư mục Bridge + khởi động lại host + reload extension ở từng profile + đặt tên từng profile | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

## D · Sức khoẻ điều hướng [ĐO]

| Nợ | Số | Nghĩa là gì |
|---|---:|---|
| Đơn vị chưa khai STATUS | 2 | mỗi dòng là một câu hỏi AI sẽ phải hỏi Đức |
| Link chết trong file cổng | 0 | kiểm 7 link ở llms.txt và bảng B |
| Thư mục top-level chưa khai chủ | 7 | chưa có khoá trong `.agents/claims.json` |
| Tài liệu quá hạn chưa rà | 0 | `status: active` mà quá `ttl_days` tính từ commit cuối chạm vào |

Thư mục chưa khai chủ: `delegations/` · `docs/` · `drafts/` · `evidence/` · `pilots/` · `scripts/` · `tests/`

## Chú giải

- **[ĐO]**: Máy đếm trực tiếp từ repo, không qua tay người; đây là mức chắc chắn.
- **[KHAI]**: Do con người khai trong STATUS; lời khai kiểm chứng chỉ hợp lệ khi có liên kết bằng chứng.

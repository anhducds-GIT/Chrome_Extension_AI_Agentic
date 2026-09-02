# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `cbe4262` (2026-09-02). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — F-18 (van la viec #1): duong BANG CHUNG da va 02/09 — lan chay sau se ghi typing_path + composer_len truoc/sau ngay ca khi chet o PRE_SUBMIT. Can tay Duc: bat panel + Dev Mode + Video mode tren ho so kaito, RELOAD extension, roi AI chay run.trial x1. Hong thi van 0 credit. KHONG can nap workbook (jobs.add tu tao) · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-02 @ `cbe4262` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | idea | 0 | 5 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa từng chạy pilot nào. Đây là mã quan sát ở gốc repo, còn nằm ngoài cấu trúc workers/ — phiên S8 sẽ chuyển nó vào đúng chỗ. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 22 | 100 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (9 commit) | Multi-profile Bridge đã PORT xong 02/09 (bắt tay auth_challenge/auth_proof GIỮ NGUYÊN, instance gắn vào auth cuối): suite 96/96, 10/10 mutation đỏ, host mới deploy + chạy trên 32147, thấy 1 kết nối legacy — chờ tay Đức reload extension + đặt tên. Việc cũ vẫn mở: B-14…B-21, audit độc lập gói khoảng-nghỉ-giữa-job | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 86 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (5 commit) | Multi-profile Bridge đã PORT xong 02/09 (mẫu gg-flow-video đã audit PASS): host nhiều kết nối fail-closed + bridge.sessions/target/served_by, ô tên hồ sơ trong panel, suite 83/83, 10/10 mutation đỏ. Host mới đã deploy + chạy trên 32148, thấy 1 kết nối legacy — chờ tay Đức reload extension + đặt tên. Nợ cũ giữ nguyên: đo live nhánh tắt host quá 2 phút; G-01 chờ trial live | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 20 | 90 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Doc lai bang chung F-18 (02/09, 0 credit): so do detection.typing_path cua luot F4R2 CHUA BAO GIO duoc ghi — cho ghi nam sau dung cai cong da nem. Da va duong bang chung + pin test (suite 88/88, 15/15 dot bien bi bat, audit doc lap 2 vong). Doc lai snapshot 27/08 con loai duoc 2 trong 4 ung vien cua F-18: valueLen 172 khong chung minh gi ca. Bang chung: evidence/F18-PHAN-TICH-BANG-CHUNG-20260902.md | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

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

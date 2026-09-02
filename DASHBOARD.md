# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `c321557` (2026-09-03). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — F-25 (vat can that cua chuoi dai: vong chay chet am tham) — chua giai. Truoc do co hai viec re: (a) kiem not nua sau F-14 bang MOT job tu che do Image (6 credit, con 8/50 tren Binh); (b) F-26 can Duc chot — bang cau hinh liet ke duoc nen runner CO THE tu dat x1/doc do phan giai, nhung bam vao do la doi cau hinh cua Duc · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-03 @ `c321557` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | idea | 0 | 12 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa từng chạy pilot nào. Đây là mã quan sát ở gốc repo, còn nằm ngoài cấu trúc workers/ — phiên S8 sẽ chuyển nó vào đúng chỗ. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 22 | 102 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (14 commit) | Multi-profile Bridge đã PORT xong 02/09 (bắt tay auth_challenge/auth_proof GIỮ NGUYÊN, instance gắn vào auth cuối): suite 96/96, 10/10 mutation đỏ, host mới deploy + chạy trên 32147, thấy 1 kết nối legacy — chờ tay Đức reload extension + đặt tên. Việc cũ vẫn mở: B-14…B-21, audit độc lập gói khoảng-nghỉ-giữa-job | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 87 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (8 commit) | Lớp nối nhiều hồ sơ Chrome đã chuyển xong sang nhánh này (02/09), theo mẫu đã qua kiểm chéo của nhánh Flow Video: máy chủ chịu được nhiều kết nối và dừng an toàn khi nhập nhằng, bảng điều khiển có ô đặt tên hồ sơ, 83/83 phép kiểm xanh, 10/10 phép thử phá hoại đều bị bắt. Máy chủ mới đã chạy và thấy một kết nối kiểu cũ — đang chờ Đức nạp lại tiện ích rồi đặt tên. Hai nợ cũ giữ nguyên: đo thật nhánh tắt máy chủ quá hai phút, và G-01 chờ một lượt chạy thật. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 96 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | F-15 XONG (cong chan chip x2+, 0 credit moi duong thoat). F-14 GIAI bang cong cu 0 credit moi diagnostics.mode_probe: bang cau hinh MO RA -> nhom nut co nghe su kien pointer, ket luan cu da het han; nua sau (bam tuy chon co doi mode khong) chua chung minh. F-24 la BAO DONG GIA cua chinh toi: videocam Video KHONG bi dich, nhung image Hinh anh THI CO -> rui ro chuyen sang F-11. Phat hien kem: bang cau hinh liet ke duoc (F-26). Suite 94/94 | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

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

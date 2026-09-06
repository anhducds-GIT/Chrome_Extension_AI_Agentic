# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `1b3f7b2` (2026-09-06). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — F-29 — đo địa chỉ file video trên trang mới TRƯỚC khi chạy job. Đây là chỗ duy nhất còn trỏ về địa chỉ cũ, và nó chạy SAU cú bấm nên nếu sai thì credit đã tiêu mà không thu được video. Đo bằng một lượt đọc trang, 0 credit, không bấm gì. Cần Đức nạp lại tiện ích rồi mở một dự án đã có video sẵn. · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-06 @ `1b3f7b2` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | idea | 0 | 19 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa từng chạy pilot nào. Đức đã chốt ngày 06/09 là nuôi tiếp và đổi hướng: Observer thành Scouter, từ cửa quan sát chỉ đọc thành bộ khung tương tác tự hoàn thiện. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 23 | 112 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (27 commit) | Phiên làm việc theo tab (ADR-0046) — bước 1 ĐÓNG BĂNG với phán quyết PASS của GPT sau 6 vòng audit, 32 mutation đỏ, suite 102/102. Chờ pilot vận hành thật (cần Đức duyệt). Việc cũ vẫn mở: B-14…B-21, B-34, B-35, audit độc lập gói khoảng-nghỉ-giữa-job. Và một mục P1 mà ô này bỏ sót cho tới 06/09: B-36 — mọi mutation Bridge chết khi đích ghi rơi về Chrome Downloads. Đã thử vá 04/09, nghiệm thu live cùng ngày và bản vá KHÔNG giữ được; chẩn đoán nay đã lật: determiner có đề xuất tên, Chrome bỏ qua đề xuất. Đường đi vòng vẫn dùng được: chọn một thư mục đích trong Side Panel thì đường ghi không qua Chrome Downloads nữa | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 92 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (20 commit) | Lớp nối nhiều hồ sơ Chrome đã chuyển xong sang nhánh này (02/09), theo mẫu đã qua kiểm chéo của nhánh Flow Video: máy chủ chịu được nhiều kết nối và dừng an toàn khi nhập nhằng, bảng điều khiển có ô đặt tên hồ sơ, 83/83 phép kiểm xanh, 10/10 phép thử phá hoại đều bị bắt. Máy chủ mới đã chạy và thấy một kết nối kiểu cũ — đang chờ Đức nạp lại tiện ích rồi đặt tên. Hai nợ cũ giữ nguyên: đo thật nhánh tắt máy chủ quá hai phút, và G-01 chờ một lượt chạy thật. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 100 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Google đã dời Flow sang địa chỉ mới flow.google.com — phát hiện 06/09 từ chính nút CHAT ZOOM xám mà Đức báo. Trước khi vá, extension KHÔNG chạy được gì trên trang mới: Chrome không tiêm code vào trang, nên không gõ, không bấm, không đọc được. Đức duyệt thêm địa chỉ mới và giữ luôn địa chỉ cũ. Đã vá quyền, bộ khớp địa chỉ, và ba câu báo lỗi. Suite 98/98, thử phá 7/7 đều bị bắt. Còn đúng một chỗ chưa vá được vì thiếu bằng chứng: chỗ nhận diện file video (F-29). | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

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

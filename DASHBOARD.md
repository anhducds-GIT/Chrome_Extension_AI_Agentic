# Bảng điều hành Extension

> **SINH TỰ ĐỘNG — ĐỪNG SỬA TAY.** Sinh lại bằng `node scripts/build-dashboard.mjs`.

Trang được sinh tại commit `6eda6fb` (2026-09-06). Đây là lúc sinh trang, **KHÔNG phải lúc bất kỳ extension nào được kiểm chứng**.

## A · Bắt đầu từ đâu

1. **Việc ưu tiên #1** — **workers/duc-auto-gg-flow-video/v0.1.0** — Lượt live MỘT job (chế độ Image + chip x3) để khai kiểm chứng đầu tiên — CẦN ĐỨC BẤM. Một lượt đó kiểm cả bản vá F-26 (runner tự đặt x1 rồi đọc lại chip) lẫn khối nhịp tim của F-25 bước ②. Hỏng thì 0 credit; chạy trọn thì khoảng 6 credit. Sau lượt đó mới khai được last_verified và đưa gói lên active. Vẫn chờ Đức chốt riêng: F-25 bước ③ — cho vòng chạy job sống ở service worker thay vì side panel. · [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md)
2. **Phiên gần nhất** — 2026-09-06 @ `6eda6fb` · [HANDOFF.md](HANDOFF.md)
3. **Luật phải đọc trước khi sửa gì** — [AGENTS.md](AGENTS.md) · cổng vào cho AI: [llms.txt](llms.txt)
4. **Ai đang giữ package nào** — `.agents/claims.json` (trạng thái sống, cố tình KHÔNG chép vào trang này để trang không mục theo từng lần nhận/trả quyền)

## B · Có gì trong repo

| Extension | Version [ĐO] | Lifecycle [KHAI] | Method Bridge [ĐO] | File test [ĐO] | Kiểm chứng cuối (ngày @ commit 7 ký tự, cách kiểm) [KHAI + bằng chứng] | Code đã commit đổi sau kiểm chứng? [ĐO] | Việc đang mở | Đọc sâu (link STATUS) |
|---|---:|---|---:|---:|---|---|---|---|
| Extension Observer V0 | 0.1.0 | idea | 0 | 19 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Chưa từng chạy pilot nào. Đức đã chốt ngày 06/09 là nuôi tiếp và đổi hướng: Observer thành Scouter, từ cửa quan sát chỉ đọc thành bộ khung tương tác tự hoàn thiện. | [STATUS](STATUS.md) |
| Duc Auto ChatGPT | 0.3.0 | active | 23 | 112 | 2026-08-26 @ `00d1f99` — Pilot-14 live 3/3 job ảnh tham chiếu đầu-cuối + xác minh live idempotency 5/5 phép đo ([bằng chứng](workers/duc-auto-chatgpt/v0.1.0/Pilot-14_RefFeatureTest/evidence/idempotency-fix-live-proof.md)) | CÓ (27 commit) | Phiên làm việc theo tab (ADR-0046) — bước 1 ĐÓNG BĂNG với phán quyết PASS của GPT sau 6 vòng audit, 32 mutation đỏ, suite 102/102. Chờ pilot vận hành thật (cần Đức duyệt). Việc cũ vẫn mở: B-14…B-21, B-34, B-35, audit độc lập gói khoảng-nghỉ-giữa-job. Và một mục P1 mà ô này bỏ sót cho tới 06/09: B-36 — mọi mutation Bridge chết khi đích ghi rơi về Chrome Downloads. Đã thử vá 04/09, nghiệm thu live cùng ngày và bản vá KHÔNG giữ được; chẩn đoán nay đã lật: determiner có đề xuất tên, Chrome bỏ qua đề xuất. Đường đi vòng vẫn dùng được: chọn một thư mục đích trong Side Panel thì đường ghi không qua Chrome Downloads nữa | [STATUS](workers/duc-auto-chatgpt/v0.1.0/STATUS.md) |
| Duc Auto Gemini | 0.1.0 | superseded | 0 | 21 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | Bản đã nghỉ. Mọi việc tiếp tục ở v0.2.0. Giữ lại vì Pilot-01 là bằng chứng vận hành, không được xoá. | [STATUS](workers/duc-auto-gemini/v0.1.0/STATUS.md) |
| Duc Auto Gemini (Platform) | 0.2.0 | active | 19 | 91 | 2026-08-28 @ `4789754` — Live sau khi hạ trần chờ xuống 5 giây: tắt/bật host, nối lại sau 1,0 giây (bản trước đo 22,5s và 27,7s). Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp ([bằng chứng](workers/duc-auto-gemini/v0.2.0/evidence-transport-liveness-5s-20260828/README.md)) | CÓ (17 commit) | Lớp nối nhiều hồ sơ Chrome đã chuyển xong sang nhánh này (02/09), theo mẫu đã qua kiểm chéo của nhánh Flow Video: máy chủ chịu được nhiều kết nối và dừng an toàn khi nhập nhằng, bảng điều khiển có ô đặt tên hồ sơ, 83/83 phép kiểm xanh, 10/10 phép thử phá hoại đều bị bắt. Máy chủ mới đã chạy và thấy một kết nối kiểu cũ — đang chờ Đức nạp lại tiện ích rồi đặt tên. Hai nợ cũ giữ nguyên: đo thật nhánh tắt máy chủ quá hai phút, và G-01 chờ một lượt chạy thật. | [STATUS](workers/duc-auto-gemini/v0.2.0/STATUS.md) |
| Duc Auto GG Flow Video | 0.1.0 | building | 21 | 99 | CHƯA KHAI KIỂM CHỨNG | KHÔNG ÁP DỤNG (chưa khai mốc commit) | F-08 ĐÓNG 06/09 và nó gần nổ thật: trần chờ sinh video mặc định là 180 giây, còn ca xấu nhất đo được trên 9 job live là 175 giây — biên năm giây. Chín lượt vừa qua thoát chỉ vì workbook có khai 300. Trần này áp lên giai đoạn SAU khi credit đã tiêu, nên hết trần sớm là vứt một video đã trả tiền và dừng cả mẻ. Nay 600 giây, ghim bằng phép kiểm suy từ số đo. Suite 99/99, thử phá 4/4 bị bắt. Mở F-27: giai đoạn chuẩn bị trước cú bấm mất 51–144 giây mà chỉ ~25 giây có tên. | [STATUS](workers/duc-auto-gg-flow-video/v0.1.0/STATUS.md) |

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

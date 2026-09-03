---
schema: extension-status/v2
id: duc-auto-gg-flow-video
name: Duc Auto GG Flow Video
lifecycle: building
owner: claude
priority_rank: 1
next_step: "F-25 bước ③ — CẦN ĐỨC CHỐT: cho vòng chạy job sống ở service worker thay vì side panel. Đây là đổi lớn nên chưa tự làm. Trước đó cần bước ①: đo xem cái gì giết vòng lặp (panel đóng? cửa sổ đổi? service worker ngủ kéo panel theo?) — chưa đo được, không đoán. Bước ② ĐÃ XONG nên bước ① nay rẻ hơn hẳn: chuỗi chết bị phát hiện trong khoảng một phút thay vì hai mươi hai phút. Việc rẽ đang chờ Đức: nạp lại tiện ích rồi chạy MỘT job (Image + chip x3) để kiểm live F-26 — hỏng thì vẫn 0 credit."
version_source: workers/duc-auto-gg-flow-video/v0.1.0/manifest.json
current_focus: "F-25 bước ② XONG: `run.status` nay trả thêm khối `loop` nói rõ vòng chạy còn sống hay đã chết, đứng yên bao lâu, và chết ở BƯỚC NÀO. Nhịp tim do chính vòng lặp chạy job đập ra chứ không phải một đồng hồ riêng — vì lúc chuỗi gãy ngày 02/09 thì side panel VẪN SỐNG, chính nó trả lời `run.status`, nên đồng hồ riêng sẽ không thấy gì. Mỗi giai đoạn tự khai trần chờ riêng, `WAITING_JOB` lấy trần từ timeout thật của job. F-14 ĐÓNG HOÀN TOÀN từ 02/09 (nửa sau đã chứng minh: sổ cái ghi nhãn Video sau khi chuyển mode). F-26 XONG code, chờ kiểm live. Suite 95/95, thử phá 25/25 đều bị bắt."
human_action: "Nạp lại tiện ích trong Chrome, rồi chạy MỘT job ở chế độ Image với chip x3. Một lượt đó kiểm cả F-26 lẫn khối `loop` mới. Hỏng thì vẫn 0 credit. Và một câu cần Đức chốt: có cho chuyển vòng chạy job sang service worker không (F-25 bước ③) — đó là đổi lớn về kiến trúc nên AI không tự quyết."
ref_readme: workers/duc-auto-gg-flow-video/v0.1.0/README.md
ref_handoff: workers/duc-auto-gg-flow-video/v0.1.0/HANDOFF.md
ref_runbook: workers/duc-auto-gg-flow-video/v0.1.0/AI-OPERATOR-GUIDE.md
ref_backlog: workers/duc-auto-gg-flow-video/v0.1.0/BACKLOG.md
---

# STATUS — Duc Auto GG Flow Video

> Trạng thái vận hành, một trang, cho mắt Đức. Kiến trúc/cách dùng ở file khác — chỉ trỏ link.

## Ý tưởng ban đầu

Cùng bài toán với hai nhánh ảnh (ChatGPT, Gemini) — chạy kế hoạch XLSX hàng loạt —
nhưng cho **video trên Google Flow**. Fork từ nhánh Gemini v0.2.0 vì kiến trúc đã tách
sạch phần biết-về-trang vào một file adapter.

## Mục đích

Tạo video hàng loạt theo kế hoạch XLSX trên `labs.google/fx/tools/flow`, ngay trong
trình duyệt của Đức, điều khiển từ xa qua Bridge để AI vận hành hộ. Không gửi gì ra
máy chủ lạ.

## Đã kiểm chứng tới đâu

**Đã sinh được video thật bằng máy, nhưng bản code HIỆN TẠI thì chưa kiểm live.**
Phân biệt hai điều đó là quan trọng:

- ✅ **Đã chạy thật:** 27/08 máy tự gõ prompt + bấm Create, video đầu tiên sinh ra (~70s).
  28/08 chạy đúng đường runner thật (`jobs.add` → `run.trial`): **2 job thành công**, mỗi
  job đúng 1 video mới được ghi sổ. Bằng chứng: [`evidence/F1-EVIDENCE-NOTES.md`](evidence/F1-EVIDENCE-NOTES.md),
  [`evidence/F4-KET-QUA.md`](evidence/F4-KET-QUA.md).
- ⚠️ **Đã chạm trang thật 02/09, chưa đi hết:** bản vá FLOW-04 ngày 28/08. Suite 84/84 xanh, audit đối kháng 5
  vòng PASS, 8 phép mutation đều làm suite đỏ — nhưng chưa một job nào chạy qua bản vá này
  trên trang thật. Bằng chứng: [`evidence/F4-create-scope-fix-audit-20260828.json`](evidence/F4-create-scope-fix-audit-20260828.json).

Vì sao chưa kiểm được — **rào cản này đã gỡ ngày 02/09.** Trước đó Bridge chỉ giữ một khe
kết nối nên luôn nói chuyện nhầm profile. Nay host nhận nhiều phiên, mỗi hồ sơ Chrome có tên
riêng và nhắm được bằng `--target` ([bằng chứng](../../../evidence/20260902-multiprofile-naming-gate-r01/README.md)).
Cái còn thiếu để kiểm live giờ là **tay Đức bật panel + workbook + Dev Mode + Video mode**, không
còn là hạ tầng. Cách vận hành trong [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

## Giới hạn đã biết

1. **Chưa tự tin dùng cho việc thật.** Đường chạy đã thông và đã ra video, nhưng bản vá mới
   nhất chưa được kiểm trên trang thật.
2. ~~Nhiều profile Chrome = chưa dùng được ổn định.~~ **ĐÃ GỠ 02/09.** Host nhận nhiều phiên
   cùng lúc, mỗi hồ sơ có tên riêng, nhắm bằng `--target`; không nêu đích thì host **từ chối**
   chứ không đoán. Còn lại một ghế `legacy` ở profile thứ tư (không tên, id đổi khi service
   worker ngủ dậy) — **chờ Đức quyết đặt tên hay tắt.**
3. Video **trừ credits thật** mỗi lần sinh → trần trial dev ≤3 video (3 × 15 credits), chặt
   hơn nhánh ảnh. Không tự nới.
4. Nhãn Image mode trong adapter khớp chính xác đúng một chuỗi đã đo (F-11); ảnh tham chiếu
   image→video chưa thử bao giờ.

## Đọc sâu ở đâu

| Cần gì | Mở file |
|---|---|
| Luật riêng + Bản đồ file | [`AGENTS.md`](AGENTS.md) |
| Tổng quan + cài đặt | [`README.md`](README.md) |
| Việc còn mở F-xx | [`BACKLOG.md`](BACKLOG.md) |
| Vận hành qua Bridge (kèm phép kiểm vân tay runtime BẮT BUỘC) | [`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md) |
| Kế hoạch điều phối 5 checkpoint | [`../../../docs/studies/FLOW-EXT-COORDINATION-PLAN.md`](../../../docs/studies/FLOW-EXT-COORDINATION-PLAN.md) |

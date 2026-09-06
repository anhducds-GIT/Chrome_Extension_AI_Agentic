---
schema: extension-status/v2
id: duc-auto-gg-flow-video
name: Duc Auto GG Flow Video
lifecycle: building
owner: claude
priority_rank: 1
next_step: "Lượt live MỘT job (chế độ Image + chip x3) để khai kiểm chứng đầu tiên — CẦN ĐỨC BẤM. Một lượt đó kiểm cả bản vá F-26 (runner tự đặt x1 rồi đọc lại chip) lẫn khối nhịp tim của F-25 bước ②. Hỏng thì 0 credit; chạy trọn thì khoảng 6 credit. Sau lượt đó mới khai được last_verified và đưa gói lên active. Vẫn chờ Đức chốt riêng: F-25 bước ③ — cho vòng chạy job sống ở service worker thay vì side panel."
version_source: workers/duc-auto-gg-flow-video/v0.1.0/manifest.json
current_focus: "F-08 ĐÓNG 06/09 và nó gần nổ thật: trần chờ sinh video mặc định là 180 giây, còn ca xấu nhất đo được trên 9 job live là 175 giây — biên năm giây. Chín lượt vừa qua thoát chỉ vì workbook có khai 300. Trần này áp lên giai đoạn SAU khi credit đã tiêu, nên hết trần sớm là vứt một video đã trả tiền và dừng cả mẻ. Nay 600 giây, ghim bằng phép kiểm suy từ số đo. Suite 99/99, thử phá 4/4 bị bắt. Mở F-27: giai đoạn chuẩn bị trước cú bấm mất 51–144 giây mà chỉ ~25 giây có tên."
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
   - Ghế không tên đó: đặt tên cho nó, hay tắt hẳn? @Đức:chốt
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

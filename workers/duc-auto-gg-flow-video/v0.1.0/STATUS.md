---
schema: extension-status/v2
id: duc-auto-gg-flow-video
name: Duc Auto GG Flow Video
lifecycle: building
owner: claude
priority_rank: 1
next_step: "F-21: tren duong VIDEO, attempt.detection bi nhanh video cua sidepanel ghi de nen typing_path/attach khong toi so cai (sidepanel.js:4512 thay trang cai 4697 vua ghi). Sua thi can 1 luot live nua (15 credit) de xac nhan -> HOI DUC. F-18 da HA khoi P1: luot F4R3 02/09 chay tron ven, video that, typing_path=input_events, create_button=enabled"
version_source: workers/duc-auto-gg-flow-video/v0.1.0/manifest.json
current_focus: "F4R3 (02/09, kaito): luot trial x1 CHAY XONG — video that c81af2c5, quy gan dung 1 ung vien, 0 retry, 15 credit. Duong go do duoc typing_path=input_events + create_button=enabled voi 0 credit (dry_run), TRUNG KHIT 27/08 -> F-18 khong tai hien. DINH CHINH: ung vien 27-ky-tu-thua SONG LAI (composer rong=28 nhung go 141 ky tu ra 141 -> hang so bi THAY THE chu khong cong them). No moi: F-21. Bang chung: evidence/F4R3-KET-QUA.md"
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

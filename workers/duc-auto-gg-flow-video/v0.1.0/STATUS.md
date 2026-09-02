---
schema: extension-status/v2
id: duc-auto-gg-flow-video
name: Duc Auto GG Flow Video
lifecycle: building
owner: claude
priority_rank: 1
next_step: "Kiem live multi-profile: chep bridge-host.mjs + bridge-cli.mjs moi sang thu muc Bridge, reload extension tung profile, dat ten tung ho so, roi goi bridge.sessions dem du ten"
version_source: workers/duc-auto-gg-flow-video/v0.1.0/manifest.json
current_focus: "Multi-profile Bridge (hướng A, Đức duyệt 28/08) đã code xong: host giữ nhiều kết nối + target/bridge.sessions/served_by, panel có ô tên hồ sơ, sửa nốt F-14 (chip mode qua pressFlowControl). Suite xanh, mutation đỏ đủ. CHƯA kiểm live: cần Đức chép host mới sang thư mục Bridge + khởi động lại host + reload extension ở từng profile + đặt tên từng profile"
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
- ❌ **Chưa kiểm live:** bản vá FLOW-04 ngày 28/08. Suite 84/84 xanh, audit đối kháng 5
  vòng PASS, 8 phép mutation đều làm suite đỏ — nhưng chưa một job nào chạy qua bản vá này
  trên trang thật. Bằng chứng: [`evidence/F4-create-scope-fix-audit-20260828.json`](evidence/F4-create-scope-fix-audit-20260828.json).

Vì sao chưa kiểm được: extension đang nạp ở **3 profile Chrome** cùng lúc, Bridge chỉ giữ
một khe kết nối nên đang nói chuyện với profile chưa reload. Chi tiết + cách xử lý trong
[`AI-OPERATOR-GUIDE.md`](AI-OPERATOR-GUIDE.md).

## Giới hạn đã biết

1. **Chưa tự tin dùng cho việc thật.** Đường chạy đã thông và đã ra video, nhưng bản vá mới
   nhất chưa được kiểm trên trang thật.
2. **Nhiều profile Chrome = chưa dùng được ổn định.** Host Bridge chỉ có một khe cho
   extension; profile nào nối sau cùng thì chiếm khe, và cả ba profile khai danh tính giống
   hệt nhau nên không phân biệt được. Đang có phiên riêng thiết kế lại phần này.
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
| Kế hoạch điều phối 5 checkpoint | [`../../../drafts/FLOW-EXT-COORDINATION-PLAN.md`](../../../drafts/FLOW-EXT-COORDINATION-PLAN.md) |

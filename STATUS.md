---
schema: extension-status/v2
id: extension-observer-v0
name: Extension Observer V0
lifecycle: idea
owner: claude
priority_rank: 4
next_step: "Kiểm kê năng lực trước khi viết dòng code nào: ba worker đang dùng gì, và trình duyệt cho phép gì mà ta chưa dùng. Bảng kiểm kê đó là tiêu chuẩn nghiệm thu của bản nền."
human_action: "Ba câu còn treo của Scouter, chỉ Đức chốt được: chính sách che dữ liệu khi ghi báo cáo xuống đĩa, chỗ đặt thư mục trong cây repo, và làm tới bản v0.1 hay đi tiếp lên v1."
version_source: manifest.json
current_focus: "Chưa từng chạy pilot nào. Đức đã chốt ngày 06/09 là nuôi tiếp và đổi hướng: Observer thành Scouter, từ cửa quan sát chỉ đọc thành bộ khung tương tác tự hoàn thiện."
ref_readme: README.md
ref_handoff: HANDOFF.md
---

# Extension Observer V0

Đơn vị ở **gốc repo** — `manifest.json` nằm ở tầng ngoài cùng, không nằm trong `workers/`.

**Vì sao `lifecycle: idea`, không phải `building`.** Nó chưa từng chạy pilot, chưa có bằng
chứng vận hành, và không phiên nào đang phát triển nó. Khai `building` là nói quá.

**Vì sao không khai `last_verified`.** Không có gì để kiểm chứng — chưa chạy lần nào. Luật
của repo: khai `last_verified` thì phải có `evidence_ref` trỏ tới bằng chứng thật.

**Ba câu còn treo, chỉ Đức chốt được.** Cả ba đến từ quyết định đổi hướng ngày 06/09
(`ADR-0009`), và chốt xong thì mở khoá chuỗi kiểm kê năng lực:

- @Đức:chốt(SCOUTER-INVENTORY-01) Chính sách che dữ liệu khi Scouter ghi báo cáo xuống đĩa.
- @Đức:chốt(SCOUTER-INVENTORY-01) Chỗ đặt thư mục Scouter trong cây repo.
- @Đức:chốt(SCOUTER-INVENTORY-01) Nhìn bảng kiểm kê rồi quyết làm tới đâu: dừng ở bản v0.1 hay đi tiếp lên v1.

Việc đang mở nằm ở `next_step` phía trên. Nó không chặn ai.

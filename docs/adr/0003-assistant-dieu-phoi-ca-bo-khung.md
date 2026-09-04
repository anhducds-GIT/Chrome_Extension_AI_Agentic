---
status: Accepted
adr: 0003
date: 2026-09-04
deciders: Đức
---

# ADR-0003 — Assistant điều phối cả repo bộ khung, nhưng vẫn không tự tay code

## Bối cảnh

Ngày 04/09 gói Assistant v0.1 dựng xong bốn năng lực lõi ở repo Extension, rồi Đức chốt port
sang repo bộ khung `Ark_Repo_Harness`. Chặng A xong cùng ngày. Câu hỏi tiếp theo là **địa bàn**:
Assistant có trách nhiệm gì ở bộ khung?

Ba số đo có thật lúc quyết, không phải phỏng đoán:

- Assistant hiện chỉ biết **một** repo. `state-check.mjs` và `what-next.mjs` đều đọc repo chúng
  đang đứng. `repo-map.json` được khai là "hợp đồng cross-repo" nhưng **không có một chữ nào về
  repo khác** — đã mở ra kiểm.
- Bộ khung phát hành bản `1.2.20`; repo Extension **không có chỗ nào khai nó đang dùng bản nào**.
  Nên câu *"repo này có tụt lại sau bộ khung không"* không ai trả lời được bằng máy.
- `ORCHESTRATOR.md` mục 4 (`HARD ROLE FIREWALL`) cấm vai điều phối code / debug / đề xuất patch,
  **không ngoại lệ**. Luật đó mới ra đời cùng ngày, sau defect `ROLE-DRIFT-01` do **Đức** bắt.

Đức nói rõ bộ khung **khác bản chất** với một repo sản phẩm: nó là *một lõi code · các rule ·
hook · lịch sử audit · lịch sử migrate*. Tức là ở đó gần như **mọi thứ đều là hạ tầng** — không
có phần "product" để làm ranh giới. Một firewall dựa trên biên "hạ tầng ↔ product" vì thế **mất
điểm tựa** ở repo này, chứ không phải trở nên rộng rãi hơn.

## Quyết định

Assistant **điều phối toàn bộ việc triển khai ở repo bộ khung**, và **không tự tay sửa code ở
đó**. Đức chốt: *"có thể không trực tiếp làm, nhưng sẽ điều phối để các AI agent khác làm."*

Cụ thể, Assistant chịu trách nhiệm ở bộ khung đúng những việc nó đang làm ở repo Extension:
cầm toàn cảnh nợ · quyết thứ tự · viết brief · giao executor · kiểm chứng độc lập kết quả ·
giữ trạng thái khớp nguồn có thẩm quyền. Năm loại việc của bộ khung — **lõi code · rule · hook ·
lịch sử audit · lịch sử migrate** — đều nằm trong địa bàn điều phối này, không loại nào bị coi
là "ngoài tầm".

`HARD ROLE FIREWALL` **giữ nguyên, không sửa một dòng**. `role_scope: control-plane` vẫn đúng và
vẫn là toàn bộ giới hạn: mọi lượt sửa code ở bộ khung do executor làm.

## Hệ quả

**Được:** một vai duy nhất chịu trách nhiệm về sức khoẻ bộ khung, thay vì mỗi phiên chạm vào nó
một góc rồi đi. Cái chốt vừa lắp sáng nay không bị tháo ra sau nửa ngày — và đó là điều đáng
giá nhất, vì một luật bị nới một lần thì lần sau nới dễ hơn.

**Mất:** Assistant chậm hơn ở bộ khung so với tự sửa. Mỗi việc phải qua một lượt bàn giao, và
ngày 04/09 đo được **sáu** phiên executor chết giữa chừng — bàn giao là chỗ hỏng thật, không
phải chi phí trên giấy. Đổi lại, phiên duy nhất không mất gì là phiên được bảo "commit từng
bước", nên chỗ hỏng này có cách sống chung.

**Phải làm khác đi từ nay:**

- Mở phiên điều phối thì đọc `AGENTS.md` của **cả hai** repo, không chỉ repo đang đứng.
- Assistant tuyệt đối **không nhận khoá ở bộ khung để tự sửa**. Nhận khoá ở đó chỉ để làm việc
  văn bản thuộc vai điều phối (brief, ADR, log) — y như ở repo Extension.
- Một câu bắc qua hai repo hiện phải trả lời bằng cách `cd` sang đọc tay. **Đó là gõ tay, không
  phải năng lực của gói** — phiên sau không thừa hưởng. Việc biến nó thành năng lực nằm ở
  `Y-13` phần 2, và **chưa làm**: mốc pilot v0.1 chưa đạt, thêm địa bàn thứ hai vào một gói
  chưa trơn ở địa bàn thứ nhất là nhân đôi chỗ vướng trước khi biết nó ở đâu.
- Luật này hiện **chưa có phép kiểm máy**. `AGENTS.md` mục 7 nói thẳng: luật nào không kiểm
  được bằng máy thì sớm muộn cũng bị bỏ qua. Ghi ra đây để không ai tưởng nó đã được cưỡng chế
  — phép kiểm cần sửa `tests/role-firewall-smoke.mjs`, tức cần khoá `_code`, và là một lượt khác.

## Trạng thái

Accepted

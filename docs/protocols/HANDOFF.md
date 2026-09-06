---
kind: protocol
status: active
ttl_days: 365
---

# HANDOFF — luật ghi nhật ký phiên

> Mở file này khi bạn **sắp ghi một mục nhật ký**, hoặc khi cổng đóng phiên chặn bạn vì mục quá
> dài. Quyết định gốc: [ADR-0011](../adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md) ·
> cơ chế lưu trữ: [ADR-0008](../adr/0008-cat-duoi-handoff-giu-hai-muoi-luot.md).

## 1. `HANDOFF.md` dùng để làm gì — và không dùng để làm gì

**Mục tiêu, một câu:** để phiên sau mở lên và **nắm trạng thái gần nhất trong một lần đọc**.

| Thuộc về `HANDOFF.md` | Thuộc về nơi khác |
|---|---|
| Làm gì · kết quả bằng số · còn gì mở | **Vì sao quyết như vậy** → ADR |
| Trạng thái vùng, khoá, việc dở | **Việc còn nợ** → `BACKLOG.md` |
| Một dòng cho mỗi sự cố gặp thật | **Cách làm một việc** → brief trong `docs/briefs/` |
| | **Thay đổi mã** → thông điệp commit |

Đây không phải luật mới: `AGENTS.md` mục 7 đã ghi *"làm gì, kết quả số, còn gì mở"* từ đầu. Cái
mới là **có trần và có máy kiểm**.

**Viết một mục dài không phải chăm chỉ — nó là đẩy chi phí sang mọi phiên sau.** Mọi phiên mở
`HANDOFF.md` đều trả tiền cho chữ bạn viết, kể cả phiên chỉ cần biết một câu.

## 2. Trần độ dài một mục

Trần khai ở `.repo-structure.json`, **không gõ cứng trong script**. Cổng đóng phiên chặn khi
vượt.

**Con số phải ĐO rồi chốt, không đoán.** Số đo ngày 06/09 làm điểm tựa: gói Flow Video trung
bình **1.158 byte mỗi mục** cho cùng loại việc mà gói ChatGPT tốn **5.193** — tức mức thấp
**đã có người làm được**, không phải lý thuyết.

Vượt trần thì **không phải cắt bớt chữ cho vừa** — phải hỏi: phần thừa đó **thuộc về file nào**?
Gần như luôn là ADR, sổ nợ, hoặc brief. Chuyển nó sang đó rồi để lại một con trỏ.

## 3. Xoay file theo tháng

`HANDOFF.md` chỉ chứa **tháng hiện tại**.

- Ghi mục mới → luôn ghi vào cuối `HANDOFF.md`. Không phải nghĩ.
- Sang tháng mới → nội dung tháng cũ thành file lưu trữ của tháng đó, `HANDOFF.md` bắt đầu lại
  với một **con trỏ** sang file vừa sinh.

**Vì sao xoay lúc GHI chứ không cắt lúc quét:** các mục Log **không xếp theo thứ tự thời gian**
(đo được ở gói ChatGPT: `22/08` rồi `24/08` rồi `22/08` lại). Nên "cắt phần cũ hơn N ngày" là
câu **máy không xác định được**, và ADR-0008 bất biến ⑵ cấm. Xoay lúc ghi thì không cần thứ tự
nào cả.

**Ba bất biến của lược đồ lưu trữ:**

1. **Không mất một byte.** Dời, không xoá. Nối lại phải ra bản gốc **giống hệt từng byte**.
2. **Chuỗi con trỏ phải đi được bằng máy.** File hiện tại trỏ sang file trước, file trước trỏ
   sang file trước nữa. **Đừng gõ cứng tên file lưu trữ ở bất kỳ đâu.**
3. **File lưu trữ khai vào Bản đồ file** (`AGENTS.md` mục 4). Không khai = không tồn tại.

## 4. Cỗ máy đọc GỘP — đừng làm nó mù

Người và AI đọc `HANDOFF.md` theo kiểu **đọc đuôi**. Nhưng **bộ đếm sự cố** của bảng trạng thái
đọc **mọi mục**, không chỉ mục cuối.

Ngày 06/09 một lượt cắt làm bốn dòng sự cố biến mất khỏi file hiện tại. Số đếm về **0**, và cổng
đỏ với **mọi lane**. Đã vá bằng cách cho bộ đếm **đi theo con trỏ lưu trữ**.

> **"0 sự cố" đọc y hệt "sạch sẽ", trong khi thật ra là "mù".**

Mọi thay đổi về lưu trữ phải kiểm lại: bộ đếm còn đọc được qua chuỗi con trỏ không.

## 5. Cấm

- Cấm xoá mục cũ. Dời thì được, xoá thì không.
- Cấm cắt theo ngày tháng (ADR-0008 bất biến ⑵).
- Cấm gõ cứng tên file lưu trữ trong script — đi theo con trỏ.
- Cấm nới trần để cho mục của mình lọt.
- Cấm để phần lý do **bốc hơi** khi viết ngắn: nó phải sang ADR / sổ nợ / brief, kèm con trỏ.
  Cắt để tiết kiệm token mà làm mất một thứ người sau cần là **lỗ, không phải lãi**.

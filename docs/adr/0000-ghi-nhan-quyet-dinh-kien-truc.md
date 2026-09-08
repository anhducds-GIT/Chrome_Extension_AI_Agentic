---
status: Accepted
adr: 0000
decides: [0000, 0026]
date: 2026-09-02
last_reviewed: 2026-09-09
deciders: Đức
---

# ADR-0000 — Cách ghi một quyết định

> **File chủ đề.** Mang quyết định **0000** (02/09, lập sổ ADR) và **0026** (09/09, hồ sơ sửa
> được). Gộp 09/09. Tên file giữ nguyên vì 118 file trong các gói đang trỏ tới nó.

## Bối cảnh

Trước 0000, quyết định kiến trúc là các dòng trong một bảng — trích dẫn được nhiều nhất là *"dòng
thứ mấy trong một file dài"*. Quyết định 0000 cho mỗi quyết định một địa chỉ.

Sổ đó lớn thêm một tuần rồi tự sinh ra hỏng của chính nó: **26 file xếp theo thời gian, năm chỗ
mâu thuẫn, và không chỗ nào nói cái nào đang có hiệu lực.** Một chỗ đã tốn thời gian thật ngày
09/09 — một phiên đọc câu cũ trong hai câu khoá ngược nhau rồi áp cho khoá của chính mình.
Nguyên nhân là luật bất biến: nó làm mâu thuẫn **không sửa được**, vì đường hợp lệ duy nhất là
viết thêm file thứ 27.

Đức chốt 09/09: *"ADR đã accepted vẫn có thể sửa, phân nhóm, gộp, viết lại để có kiến trúc tốt
hơn… đừng máy móc add vào sẽ bị phình… nên được làm điều này hàng tuần."*

## Quyết định

### ⑴ Một quyết định, một địa chỉ

Quyết định ghi thành ADR theo chuẩn Nygard, bốn mục: **Bối cảnh · Quyết định · Hệ quả · Trạng
thái**. Hai tầng, theo phạm vi:

- quyết định của MỘT gói → `workers/<gói>/<phiên-bản>/docs/adr/`
- quyết định của CẢ REPO → `docs/adr/` ở gốc

**Đánh số liên tục trong phạm vi từng thư mục**, bắt đầu `0001` (thư mục gốc bắt đầu từ file này,
`0000`). Nên định danh một quyết định là **thư mục + số**, không phải số trần: `docs/adr/0001` và
`workers/duc-scouter/v0.1.0/docs/adr/0001` là hai quyết định khác nhau.

`decisions.md` của một gói không bị xoá. Nó thành **mục lục** trỏ sang từng ADR, kèm một dòng nói
nội dung đi đâu và vì sao.

### ⑵ HỒ SƠ sửa được. QUYẾT ĐỊNH thì không.

Hai việc trước đây bị gộp làm một:

| Việc | Được không? |
|---|---|
| Gộp nhiều ADR thành một file chủ đề · phân nhóm · dịch · rút gọn · sửa câu chữ | **Được** |
| Đánh dấu một vế đã chết vì quyết định sau thay nó | **Được** — phải nêu tên quyết định thay nó |
| Đổi điều đã quyết, mà không có quyết định mới đứng sau | **Không** |
| Bỏ hẳn một quyết định khỏi sổ | **Không** |

Git giữ mọi bản cũ, nên dấu vết mà tính bất biến bảo vệ không mất — nó chuyển từ *"file không đổi
được"* sang *"mọi lượt đổi đều là một commit đọc lại được"*.

**Vế này thay luật 1 của quyết định 0000** (*"ADR đã Accepted là bất biến, kể cả lỗi chính tả"*).
Luật đó chết từ 09/09.

### ⑶ Mỗi quyết định giữ một số hiệu vĩnh viễn, và không số nào được biến mất

Đây là máy canh thay cho bất biến-từng-byte. Phép kiểm **B12** không còn hỏi *"thân file có đổi
không"*; nó hỏi *"mọi số hiệu từng cấp có còn nằm ở đúng một file không"*. File gộp khai:

```yaml
adr: 0008
decides: [0008, 0011, 0012]
```

**Gộp thì tự do. Mất thì ĐỎ. Hai file cùng nhận một số cũng ĐỎ** — lúc đó không ai biết đọc bản
nào. Quyết định **rời khỏi repo** một cách hợp lệ thì khai kèm lý do ở `adr.moved_out` trong
`.repo-structure.json`: xoá một quyết định phải để lại chữ nói nó đi đâu.

Thay thế vẫn như cũ: quyết định mới nêu tên cái nó thay, vế bị thay nói cái gì thay nó. **Hai bên
phải trỏ nhau.**

### ⑷ Luật viết bằng TIẾNG VIỆT

**Đức chốt 09/09:** *"giữ luật bằng tiếng việt để tôi cùng đọc bản cuối."*

Trước đó cùng ngày, vế này từng chốt ngược lại — viết luật bằng tiếng Anh cho rẻ token (đo được:
tiếng Việt có dấu tách token nặng gấp ~2 lần). **Vế tiếng Anh đã chết.** Lý do Đức đảo lại nặng
hơn tiền token: Đức là người chốt duy nhất, và **một bộ luật Đức không đọc được là một bộ luật
Đức không kiểm được**.

Phần tiết kiệm còn giữ lại là phần **cắt ngắn và phân nhóm** — nó không phụ thuộc ngôn ngữ.
Chỉ mã lỗi (CODE) và tên lệnh giữ tiếng Anh.

### ⑸ Rà soát sổ luật hằng tuần, không đợi có việc mới rà

Một lượt rà gộp những chỗ đã tách ra xa nhau, và đánh dấu những vế đã bị quyết định sau thay.
Thêm một luật mà không nêu tên luật nó thay vẫn bị cấm — đó là giới hạn ⑧ của `AGENTS.md`.

## Hệ quả

**Được:** mỗi quyết định có địa chỉ trích dẫn được. Quan hệ thay thế thành dữ liệu máy đọc được.
Sổ **co lại được** thay vì chỉ phình — lượt rà đầu tiên đưa 27 file xuống 9.

**Mất, và đây là cái mất thật:** câu *"file này không đổi kể từ lúc được duyệt"* không còn đúng
theo cấu trúc nữa. Ai cần bản gốc phải đọc `git log -p`. Thứ còn lại là kỷ luật ở vế ⑵, cộng sổ
định danh ở vế ⑶ — nó bắt được **mất**, nhưng **không bắt được một lượt viết lại đổi nội dung**.
Muốn lấy lại lớp đó thì bản rẻ nhất là một phép kiểm: mọi diff vào thân một ADR đã Accepted phải
nêu tên quyết định cho phép nó.

**Đã trả ở lượt chuyển đổi gốc:** 112 file mới (45 ở `duc-auto-chatgpt`, 67 ở `duc-auto-gemini`),
và mục Hệ quả của cả 112 đều ghi *"không ghi lại"* — bảng nguồn không có cột đó, bịa ra cho đẹp
thì bản ghi hết đáng tin. `duc-auto-gg-flow-video` (8 quyết định) **chưa bao giờ được chuyển**:
lúc đó gói do phiên khác giữ, và định dạng văn xuôi của nó cần một bộ tách riêng.

## Trạng thái

Accepted.

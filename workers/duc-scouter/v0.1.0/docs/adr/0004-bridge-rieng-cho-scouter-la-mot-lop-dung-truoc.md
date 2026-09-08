---
status: Accepted
adr: 0004
date: 2026-09-07
deciders: Đức
---

# ADR-0004 — Bridge riêng cho Scouter là một LỚP ĐỨNG TRƯỚC, không phải bản thứ tư

## Bối cảnh

[ADR-0003](0003-mo-het-quyen-truy-cap-va-cai-gi-thay-cho-hang-rao-cu.md) ghi lại một chỗ chặn
chưa gỡ: `bridge-host.mjs` **không ghi được file**, và nó nằm trong `workers/duc-auto-chatgpt` —
gói Đức đóng băng sáng 07/09 (giới hạn ①). Nên *"Bridge ghi code mới xuống đĩa"* của
[ADR-0009](../../../../docs/adr/0007-scouter.md) mục ⑸ vẫn là một
câu tả một thứ chưa tồn tại.

Đức chốt 07/09: *"ta hoàn toàn có thể xây một bridge mới cho scouter & seed framework này, ta
đang phát triển toàn bộ luồng làm việc nên cần mở thông luồng cho tất cả các tính năng."*

## Quyết định

Dựng Bridge riêng cho Scouter — **nhưng dựng nó thành một lớp đứng trước, không phải một bản
sao thứ tư**:

```
AI / CLI  →  :<cổng Scouter>/v1/rpc
                ├── file.* · host.*      → xử lý TẠI ĐÂY (đĩa)
                └── mọi method còn lại   → chuyển tiếp NGUYÊN VĂN → host cũ → WebSocket → extension
```

Host cũ chạy **trong cùng tiến trình** (`createBridgeHost`, nhập từ gói đóng băng — chỉ đọc,
đúng luật vùng ①). Đức vẫn bật một lệnh duy nhất.

**Vì sao không viết mới hẳn, dù Đức nói "xây một bridge mới".** Repo đã có **ba** bản sao của
cùng một máy chủ, và giới hạn ② của chính Đức (07/09) cấm cài một tính năng hai lần. Bản thứ tư
sẽ là bản thứ tư của WebSocket, khung nhị phân, ghép cặp, và định tuyến nhiều phiên Chrome — bốn
thứ khó, đã chạy đúng, và **đã đóng băng nên không còn trôi đi đâu nữa**. Một phụ thuộc vào thứ
không bao giờ đổi là phụ thuộc tốt nhất có thể có.

Câu chốt của Đức là *"mở thông luồng cho tất cả các tính năng"*. Lớp này mở thông luồng đó. Nó
chỉ không mở bằng cách chép lại thứ đã có.

**Cũng không đưa vào `workers/_shared/`** — dù giới hạn ② chỉ đúng chỗ đó. Lý do: `_shared/` sẽ
có **đúng một** người dùng, vì ba gói kia đã đóng băng và không di cư sang được. Một module dùng
chung với một người dùng là trừu tượng dựng sớm; nó đắt đúng bằng chỗ nó tiết kiệm.

## Hệ quả

**Bốn method mới, tất cả ở tầng máy chủ:** `file.write` · `file.append` · `file.read` ·
`file.list`, cộng `host.capabilities` để tự khai. Chúng **không đi qua extension**.

**Vùng ghi là một tường thật, và nó do NGƯỜI KHỞI ĐỘNG khai** (`--root`). Lệnh đi trên dây không
nới ra được. Nếu người gọi tự khai gốc thì cái gốc chỉ là một gợi ý.

Cách thoát khỏi vùng ghi, và cái chặn từng cái — `bridge/file-core.mjs`, ghim ở
`tests/scouter-file-core-smoke.mjs`, đột biến `G1..G3`:

| Lối ra | Bịt bằng |
|---|---|
| `../ra-ngoai` | `path.relative`, không phải `startsWith` |
| `C:x.txt` (tương đối theo ổ) | phép kiểm riêng — `path.isAbsolute` trả `false` cho nó |
| thư mục **anh em trùng tiền tố** (`/goc-khac` so với `/goc`) | cùng phép `path.relative` trên |
| **liên kết mềm trong gốc trỏ ra ngoài** | hỏi `realpath`, không tin chuỗi |

**KHÔNG có `file.delete`.** Luật gốc của Đức xếp "xoá file" vào nhóm phải hỏi trước; câu *"mở
thông luồng"* là câu chung, và luật riêng thắng luật chung. Khối ⑪ của phép ghim cấm luôn
`unlinkSync`/`rmSync`/`renameSync` trong lõi, để lượt "tiện tay thêm cho đủ bộ" sau này phải đi
hỏi Đức trước.

**Ba chốt chỉ sống ở tầng HTTP** (đột biến `H1..H3`): từ chối lượt gọi mang `Origin` (tức tới từ
một **trang web**), kiểm token ghép cặp theo **thời gian không đổi**, và **chuyển tiếp mọi
method lạ** thay vì tự từ chối. Cái thứ ba nghe như chuyện tiện dụng nhưng là chuyện đúng đắn:
giữ một bảng "method hợp lệ" ở lớp này là dựng bản sao thứ hai của một bảng mà bản thật nằm ở
extension — hai bản sẽ lệch nhau ngay lần extension thêm method mới.

**Ba lần bộ đo đột biến bỏ lại mã nhiễm độc trong repo, và cách bịt.** Trong lượt này, ba lần
một con đột biến ở lại trong mã nguồn sau khi bộ đo dừng bất thường. Lần đầu phép ghim bắt được;
nhưng một con tinh hơn thì suite vẫn xanh và thứ nằm lại là **một chốt an toàn đã bị gỡ**. Hai
lớp, và chúng chữa hai bệnh khác nhau:

- **Khoá file** (`wx`, nguyên tử) — chống **hai lượt chạy cùng lúc**, ca mà lượt sau lưu bản đã
  đột biến làm "bản gốc". Khoá ghi PID và **tự nhận lại khi chủ cũ đã chết**: bản đầu không làm
  thế, và một khoá mồ côi đã chặn mọi lượt chạy sau đó — biến một rủi ro hiếm thành một cái kẹt
  thường trực.
- **Nhật ký hồi phục trên đĩa** — chống **một lượt bị chém ngang**. Ghi trước khi sửa, xoá sau
  khi trả về; lượt sau thấy nó thì hoàn nguyên trước rồi mới đo.

**Bắt tín hiệu thì KHÔNG đủ, và tôi đã đo.** Bản đầu của tôi dùng `process.on("SIGINT"|"exit")`.
Trên Windows không có tín hiệu thật: `kill("SIGINT")` giết thẳng tiến trình và handler không bao
giờ nổ. Tôi thử chính cái chốt vừa dựng, nó trượt, nên mới có nhật ký. Ghi ra vì bài học tổng
quát hơn lượt này: **một chốt chưa thử là một chốt chưa biết có chạy.**

## Trạng thái

Accepted

# `workers/_shared/` — mã dùng chung cho nhiều extension

> Vùng này ra đời 07/09 theo `AGENTS.md` gốc mục 3, luật 2: *"Cấm cài một tính năng hai lần.
> Cần ở hai gói → vào `workers/_shared/` trước."* Luật có từ trước; nhà thì tới hôm nay mới xây.

## Luật của vùng này — bốn dòng

1. **Vào đây chỉ khi đã có HAI người dùng thật, hoặc sắp có và biết chắc.** Một module dùng chung
   cho một người dùng là một tầng gián tiếp không đổi lấy gì.
2. **Không mã riêng của sản phẩm nào.** Tên sản phẩm, selector, endpoint — không thứ nào được
   nằm ở đây. Cần khác nhau giữa các gói thì **nhận qua tham số**.
3. **Sửa ở đây là sửa cho MỌI người dùng.** Nên mỗi chốt phải có phép ghim, và phép ghim chạy
   trong suite của người tiêu thụ (xem dưới).
4. **Không chép file từ đây sang gói.** Chép là quay lại đúng cái bệnh vùng này sinh ra để chữa.

## Có gì trong đây

| Thư mục | Là gì |
|---|---|
| `bridge-host/` | **Lõi máy chủ Bridge**: khung WebSocket + cửa HTTP + bắt tay hai chiều + định tuyến nhiều hồ sơ. Mỗi extension dựng một host MỎNG gọi vào đây, khai tên giao thức của mình |

## `bridge-host/` — vì sao nó tồn tại, đo ngày 07/09

Ba gói `duc-auto-*` mỗi gói giữ một bản chép của cùng đoạn mã. Đếm bằng mã băm:

| File | Số bản | Giống nhau? |
|---|---:|---|
| `websocket-core.mjs` | 3 | **giống hệt cả ba** — nhân bản thuần |
| `bridge-host.mjs` | 3 | **khác nhau cả ba** — 461/451/450 dòng, ba mã băm |

11 dòng khác biệt giữa bản `duc-auto-chatgpt` và hai bản kia **chính là cái bắt tay hai chiều**:
máy chủ phải chứng minh nó biết token TRƯỚC khi extension đưa token ra.

Nghĩa là **một bản vá an toàn làm ở một bản chép, không bao giờ tới hai bản kia.** Hai Bridge
tới hôm nay vẫn nhận token trần. Đó là cái giá của fork, đo được, trên đĩa — không phải lý thuyết.

## Ba gói đóng băng KHÔNG dùng lõi này

`duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video` giữ nguyên bản chép của chúng.
Luật cấm sửa gói đóng băng, và cũng không cần: chúng đã ngừng thay đổi. Bản chép của
`duc-auto-chatgpt` còn có một công dụng nữa — nó là **cái mốc** để `tuong-duong-voi-ban-goc.mjs`
so đáp án, và đóng băng chính là điều làm nó thành một cái mốc tốt.

## Phép ghim chạy ở đâu

Suite của vùng này chạy trong `workers/duc-scouter/v0.1.0/tests/run-all.mjs` — nó quét theo
hình dạng `_shared/*/tests/*.mjs`. Scouter là **người tiêu thụ duy nhất hôm nay** nên nó gánh
việc chạy.

**Có người tiêu thụ thứ hai thì việc này phải chuyển lên suite gốc** — đừng dựng sẵn một tầng
cho một người dùng tưởng tượng, nhưng cũng đừng quên chuyển khi tới lúc.

| File ghim | Hỏi gì |
|---|---|
| `bridge-host/tests/tuong-duong-voi-ban-goc.mjs` | **Tách lõi có làm rơi hành vi nào không** — hỏi cả bản gốc lẫn bản mới cùng một câu, 29 ca, rồi so đáp án |
| `bridge-host/tests/bat-tay-hai-chieu.mjs` | Cái bắt tay, bằng một lượt **nối thật qua socket**. Sinh ra vì bộ đo đột biến chỉ ra rằng chốt đáng giá nhất của lõi chưa ai canh |
| `bridge-host/tao-tep-ghep-cap.mjs` | **Sinh một tệp ghép cặp** cho một máy chủ Bridge (H-06). Ở đây chứ không ở một gói, vì nó phải sinh ra thứ `validatePairing()` chấp nhận và **tự kiểm bằng chính hàm đó**. Hai chốt: không ghi vào trong kho mã (tệp chở token) · không ghi đè tệp đã có |
| `bridge-host/tests/tao-tep-ghep-cap-smoke.mjs` | Ghim bộ sinh trên. Chạy THẬT và thử **đường dẫn có dấu cách** — chốt "không ghi vào repo" đã hỏng CÂM đúng ở đó ngày 08/09 |

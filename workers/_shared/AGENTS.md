# `workers/_shared/` — mã dùng chung cho nhiều extension

> Vùng này ra đời 07/09 theo `AGENTS.md` gốc, **giới hạn ②**: *"Cấm cài một tính năng hai lần.
> Cần ở hai gói → vào `workers/_shared/` trước."* Luật có từ trước; nhà thì tới hôm nay mới xây.

## Luật của vùng này — bốn dòng

1. **Vào đây chỉ khi đã có HAI người dùng thật, hoặc sắp có và biết chắc.** Một module dùng chung
   cho một người dùng là một tầng gián tiếp không đổi lấy gì.
2. **Không mã riêng của sản phẩm nào.** Tên sản phẩm, selector, endpoint — không thứ nào được
   nằm ở đây. Cần khác nhau giữa các gói thì **nhận qua tham số**.
3. **Sửa ở đây là sửa cho MỌI người dùng.** Nên mỗi chốt phải có phép ghim, và phép ghim chạy
   trong suite của người tiêu thụ (xem dưới).
4. **Không chép file từ đây sang gói.** Chép là quay lại đúng cái bệnh vùng này sinh ra để chữa.

## Luật chung cho MỌI extension — hai luật, ở đây vì chúng đúng cho cả năm gói

> Đưa lên đây 09/09 theo giới hạn ② (*"cần ở hai gói → vào `workers/_shared/` trước"*). Trước đó
> chúng nằm **nguyên văn** trong `AGENTS.md` của cả `duc-auto-chatgpt` lẫn `duc-auto-gemini`, và
> phép ③ `LUAT_TRUNG` nêu đúng cặp đó. **Cái giá của bản chép đã đo được:** một luật anh em
> (*cấm harness*) chết 24/08 mà nhánh Gemini vẫn dạy tới 09/09 — **16 ngày**.

1. **Sửa bất kỳ file `.js` nào → phải nói Đức reload extension ở `chrome://extensions` trước khi
   test.** Đừng giả định thay đổi đã có hiệu lực. Không có cách nào máy kiểm được vế này.
2. **In-app preview pane vẫn CẤM dùng để "xem" UI** (nó chặn script, bỏ stylesheet). **Nhưng
   harness bằng Chrome THẬT thì ĐƯỢC** — Playwright/CDP chạy extension thật với trang giả lập là
   công cụ verify hợp lệ (Đức chốt 24/08). Việc xem bằng mắt của Đức chỉ còn cần cho những gì
   harness không chạm được: OS folder picker, và trang thật.
   Căn cứ: [ADR-0022](../duc-auto-gemini/v0.2.0/docs/adr/0022-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md) · [ADR-0030](../duc-auto-chatgpt/v0.1.0/docs/adr/0030-sua-luat-8-agents-md-cho-phep-xay-harness-test-bang.md)
   — **cùng một chốt 24/08 của Đức, ghi hai lần ở hai sổ.** Đó chính là lý do dòng luật này chuyển lên đây.

Gói nào có ngoại lệ thì ghi ngoại lệ **tại gói đó**, đừng sửa hai dòng trên.

## Có gì trong đây

| Thư mục | Là gì |
|---|---|
| `bridge-host/` | **Lõi máy chủ Bridge**: khung WebSocket + cửa HTTP + bắt tay hai chiều + định tuyến nhiều hồ sơ. Mỗi extension dựng một host MỎNG gọi vào đây, khai tên giao thức của mình |
| `goi-bridge/` | **Bên GỌI Bridge từ dòng lệnh** (Node, không phải mã extension). Một cái xưởng `taoGoiBridge({goi})`; mỗi gói dựng cái vỏ năm dòng khai danh tính của mình. Dọn về đây 15/09 — `T21` chặng ① |
| `adapters/` | **HIỂU BIẾT VỀ TỪNG TRANG, và không có gì khác.** Mỗi trang một file DỮ LIỆU: origin · danh tính · selector · bước việc · bằng chứng xong. Adapter **không** import gì, **không** chạm `chrome.*`/CDP, **không** tự gọi Bridge. Thêm một website = thêm một file ở đây, **không** thêm một Chrome extension — đó là lời khai mà `duc-scouter/v0.1.0/docs/UNIVERSAL-SCOUTER.md` đi chứng minh |

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

## Ba gói `duc-auto-*` CHƯA dùng lõi này

`duc-auto-chatgpt` · `duc-auto-gemini` · `duc-auto-gg-flow-video` vẫn giữ bản chép của chúng.

> **Sửa 09/09.** Đoạn này từng nói *"Luật cấm sửa gói đóng băng"*. Vế đó **chết 08/09**:
> [ADR-0021](../../docs/adr/0021-goi-extension.md) ⑴ bỏ hẳn trần số gói và mở băng cả năm gói,
> `frozen` nay là danh sách rỗng. **Không còn luật nào cấm sửa ba gói này.**

Vì sao vẫn chưa chuyển: [ADR-0021](../../docs/adr/0021-goi-extension.md) ⑶ — Đức chấp nhận rủi
ro token trần ở hai Bridge cũ, vì *"mở băng đắt hơn chỗ hở"* và bản thân lượt chuyển là con
đường những vệt trôi mới đi vào. Đó là một lựa chọn còn hiệu lực, **không** phải một điều cấm.

Bản chép của `duc-auto-chatgpt` còn một công dụng nữa: nó là **cái mốc** để
`tuong-duong-voi-ban-goc.mjs` so đáp án. Mốc tốt vì nó **đứng yên**, không vì nó bị cấm chạm.

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
| `bridge-host/tao-tep-ghep-cap.mjs` | **Sinh một tệp ghép cặp** cho một máy chủ Bridge (H-06), và **giữ quy ước NHÀ CHUNG** (xem dưới bảng). Tự kiểm bằng chính `validatePairing()`. Ba chốt: không ghi vào kho mã · không ghi đè tệp đã có · `--goi <tên>` tự đặt đúng chỗ |
| `goi-bridge/do-chi-phi.mjs` | **CÂN CHI PHÍ CONTEXT** — bọc quanh `goi`, ghi mỗi lượt: method · node · `truncated` · ms · `bytes_tho`. Giữ **HAI con số tách nhau**: `bytes_tho` (trình duyệt→Node, không tốn context) và `chu_cho_ai` (chữ→context model, đắt). `token_that` luôn `null` — không đọc được usage runtime thì **không bịa** |
| `goi-bridge/giai-target.mjs` | **Bộ giải target theo DANH TÍNH** (Gap 3). `discover → ghế → loại → lược đồ → URL → danh tính → đúng MỘT hoặc từ chối`. Không first-match, không tab đang xem, không dùng lại `target_id` cũ. Địa chỉ ghế LUÔN là `instance_id` — nhãn có thể RỖNG (`G-105`). Cũng giữ **`khoaDanhTinh()`**: chạy trước MỖI lượt GHI và sau MỖI lần điều hướng — target còn sống · còn đúng `origin` · danh tính còn đọc ra. Đọc-không-ra **là trượt**. Cần vì `target_id` sống qua điều hướng SPA (`G-102`) |
| `goi-bridge/tests/giai-target-smoke.mjs` | 21 khối, và việc nặng nhất là canh bộ giải **TỪ CHỐI đúng lúc**: đúng URL sai trang · hai ứng viên cùng thoả · ứng viên đọc không ra phải được KỂ chứ không bị giấu · ghế chưa đặt tên vẫn phải gọi tới được |
| `adapters/hop-dong.mjs` | **Máy canh hợp đồng adapter** (Gap 4): bắt buộc có `danh_tinh` · cấm lời gọi trình duyệt thô · method phải trong từ vựng đóng · cấm toạ độ tự do · **cấm neo vào hash styled-components** (`G-104`) |
| `adapters/vizcom.mjs` | Adapter Vizcom. Mọi selector đến từ `scout.page` chạy thật 18/09. Danh tính CHÍNH là **email**, workspace/gói chỉ là `danh_tinh_phu` (in ra, không quyết định). Khai luôn **`workbench_khong_ghi_duoc`** kèm hai lý do đo được |
| `adapters/tests/hop-dong-smoke.mjs` | 10 khối. Mỗi điều cấm đi kèm **một adapter vi phạm cố ý** — bộ soát không có ca vi phạm là bộ soát không ai biết nó có kêu không (`G-106` bắt được đúng một mẫu cấm RỖNG nhờ khối này) |
| `goi-bridge/tests/do-chi-phi-smoke.mjs` | 5 khối canh đúng bốn chỗ cái cân có thể nói dối: đếm node theo hình dạng sai · **trộn `bytes_tho` với `chu_cho_ai`** · lượt gọi HỎNG biến mất khỏi sổ · tự bịa một con số token |
| `goi-bridge/tests/goi-bridge-smoke.mjs` | **Tên gói không được quay lại làm hằng số ở đây** — khối ⓐ đọc chính mã của lớp dùng chung và đỏ khi thấy một tên gói. Cùng cái lưới `G9` đã bắt ở `transport.mjs` 12/09, đặt TRƯỚC khi có bản chép thứ hai. Cộng: hai gói ⇒ hai tên giao thức · biến môi trường là của riêng từng gói · **token không lọt vào lời báo lỗi** |
| `bridge-host/tests/tao-tep-ghep-cap-smoke.mjs` | Ghim bộ sinh trên. Chạy THẬT và thử **đường dẫn có dấu cách** — chốt "không ghi vào repo" đã hỏng CÂM đúng ở đó ngày 08/09 |

## NHÀ CHUNG CỦA BRIDGE — luật đường dẫn, Đức chốt 08/09

**Mọi thứ thuộc Bridge của MỌI extension nằm dưới đúng một chỗ**, mỗi gói một thư mục con mang
đúng tên gói:

```
C:\WORKING ZONE\Chrome Extension Bridge\<tên-gói>\
    <tên-gói>-bridge-pairing-v1.json    ← tệp ghép cặp (CÓ TOKEN)
    START-BRIDGE_<Tên>.cmd  +  .ps1     ← bộ khởi động
    du-lieu-ra\   (hoặc du-lieu\)       ← VÙNG GHI, luôn là thư mục CON
```

**Ba lý do, theo thứ tự sức nặng:**

1. **Ngoài kho mã.** Tệp ghép cặp chở token; luật gốc cấm token vào repo.
2. **Vùng ghi là thư mục CON, không phải chính thư mục gói.** `file.read` đọc được mọi tệp dưới
   vùng ghi — trỏ vùng ghi vào chính thư mục gói nghĩa là **token đọc được qua dây**. Máy chủ sẽ
   từ chối khởi động, nhưng đừng thử.
3. **Một chỗ, không tản mát.** Đức nói lỗi đặt lung tung đã gặp **vài lần**.

**Vì sao luật này ghim vào MÃ chứ không chỉ vào tài liệu:** quy ước đã tồn tại từ trước — bốn gói
cũ đều theo — nhưng nó chỉ nằm trong đầu người. Ngày 08/09 chính phiên viết dòng này vẫn đặt một
tệp ghép cặp vào thư mục hồ sơ người dùng, vì không có gì nhắc. Nên nó phải là **giá trị mặc định
của công cụ**:

```bash
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <tên-gói>
```

Cờ `--goi` tự dựng đúng đường, đúng tên tệp, tự tạo thư mục con. Còn `--ra <đường dẫn>` vẫn có,
cho ca có lý do riêng — và nó **không** tự tạo thư mục, vì gõ nhầm một ký tự mà tự tạo thư mục là
đặt token ở chỗ không ai nhìn tới.

Phép ghim `tests/tao-tep-ghep-cap-smoke.mjs` khối ⑸ canh cả hằng số, đường chuẩn, cờ `--goi`, và
câu hướng dẫn có nói ra nhà chung hay không.

## Log

- **2026-09-09** · `claude-luat-rasoat` · Thêm mục **Luật chung cho MỌI extension** (hai luật:
  *sửa `.js` thì nhắc Đức reload* · *preview pane cấm, harness Chrome thật thì được*). Chúng từng
  nằm **nguyên văn** trong `AGENTS.md` của cả `duc-auto-chatgpt` lẫn `duc-auto-gemini`; phép ③
  `LUAT_TRUNG` nêu đúng cặp đó. Cái giá của bản chép **đã đo được**: luật *cấm harness* chết
  24/08 mà nhánh Gemini vẫn dạy tới 09/09 — **16 ngày**. Đưa lên đây theo giới hạn ②.

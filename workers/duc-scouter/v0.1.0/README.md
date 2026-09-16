# Duc Scouter — bản nền v0.1

Một extension Chrome **cục bộ**, dùng riêng. Nó không tự động hoá một trang cụ thể nào. Việc của
nó là: **dò một trang · báo cáo cho AI qua Bridge · tự nạp lại chính nó** khi AI đã ghi code mới
xuống đĩa. Đó là vòng tự cải tiến mô tả ở [ADR-0009](../../../docs/adr/0007-scouter.md).

Phạm vi lượt này dừng ở `SEED v0.1`, 25 mục năng lực, chốt ở
[ADR-0010](../../../docs/adr/0007-scouter.md). Không đi tiếp lên `SEED v1` nếu
chưa có một ADR mới.

## Cài và chạy

Ba lệnh, ba lượt bấm. Làm xong thì **chạy bước ⑤ để biết mình đã làm đúng chưa** —
đừng đoán, cũng đừng thử một việc thật rồi suy ngược từ chỗ nó hỏng.

**① Sinh tệp ghép cặp.** Nó chứa TOKEN nên **phải nằm ngoài kho mã** — kho này công khai.
`--goi` tự đặt nó đúng nhà chung và tự chọn một cổng còn trống:

```bash
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi duc-scouter
```

**② Bật máy chủ Bridge** với đúng tệp vừa sinh, và **để cửa sổ đó chạy**:

```bash
node workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs --pairing "C:/WORKING ZONE/Chrome Extension Bridge/duc-scouter/duc-scouter-bridge-pairing-v1.json"
```

*(Máy chủ nằm trong thư mục của gói `duc-auto-chatgpt` vì lý do lịch sử — nó là máy chủ dùng
chung, không riêng gói nào. Vì thế nó in ra `Duc Auto ChatGPT bridge listening on …` **kể cả khi
bạn đang cài Scouter**: dòng đó đúng, chỉ là tên cũ. Đường dẫn tệp ghép cặp ở trên là chỗ bước ①
đặt nó; bước ① tự in ra đường dẫn thật nếu khác.)*

**③ Nạp extension.** Chrome → `chrome://extensions` → bật **Developer mode** → **Load unpacked**
→ chọn thư mục `workers/duc-scouter/v0.1.0`.
*Nếu trước đây đã nạp bản ở gốc kho mã thì gỡ bản đó đi — nó không còn nữa (ADR-0013).*

**④ Nối dây.** Bấm biểu tượng extension → **bảng bên mở ra ở cạnh phải** → mục **Cửa Bridge** →
chọn tệp ghép cặp ở bước ①. Dòng trạng thái đổi thành *Đã nối Bridge.*

**⑤ Kiểm bản cài — đừng bỏ bước này:**

```bash
node workers/duc-scouter/v0.1.0/scripts/kiem-cai-dat.mjs
```

Sáu bước, dừng ở bước đầu tiên hỏng, và **mỗi bước hỏng nói luôn phải làm gì**. Nó gõ cửa đúng
cái Bridge bạn đang chạy và đúng extension bạn vừa nạp — khác hẳn `npm run scouter:bridge-live`,
lệnh đó dựng một máy chủ riêng để đo **mã**, không đo **bản cài của bạn**.

Bước ⑥ của nó tiêu **một** lượt trong trần ghi để biết công tắc đang mở hay đóng; không muốn thì
thêm `--khong-thu-ghi`. **Công tắc ĐÓNG không phải hỏng** — đó là mặc định.

**⑥ Muốn Scouter bấm và gõ thì bật *Chế độ phát triển* trong bảng bên.** Tắt thì nó chỉ nhìn
được. Mỗi lần bật cho 200 lượt; hết thì tắt rồi bật lại. Phanh khẩn: **Ctrl+Shift+X** — chỉ tắt
được, không bật được.

Chrome sẽ hiện dải băng *"… đang gỡ lỗi trình duyệt này"* ở tab nào Scouter cắm vào. Không giấu
được, và không nên giấu.

## AI ở đầu dây gọi được gì

**Hai mươi bốn** method, **từ vựng đóng**. Gọi `system.capabilities` để lấy danh sách kèm mô tả và lược đồ
tham số — đó là câu trả lời có thẩm quyền, đừng chép danh sách ra chỗ khác.

| Method | Ghi | Làm gì |
|---|---|---|
| `session.hello` · `system.ping` · `system.capabilities` | không | bắt tay, kiểm còn sống, đọc bề mặt |
| `scout.targets` | không | liệt kê và phân loại các target debug của Chrome |
| `scout.page` | không | metadata trang + kiểm kê phần tử tương tác, có phân trang |
| `scout.query` | không | một selector khớp mấy phần tử, và chúng là gì |
| `scout.view` | không | **Scouter đang nhìn phần nào của trang**: độ cuộn, cỡ khung nhìn, cỡ cả trang, **còn bao nhiêu để cuộn nữa**, và mức thu phóng. Đọc nó TRƯỚC và SAU mọi lệnh đổi tầm nhìn ([ADR-0007](docs/adr/0007-nhom-nhin-va-di-lai-va-uy-quyen-mo-rong.md)) |
| `scout.text` | không | **chữ của ĐÚNG MỘT phần tử** khớp selector. Khớp 0 hay 2+ thì từ chối; trần 5.000 ký tự; không bao giờ trả `outerHTML` ([ADR-0006](docs/adr/0006-chinh-sach-che-va-cua-hep-doc-chu.md)) |
| `scout.tree` | không | cây DOM tới độ sâu N, thuộc tính đã che |
| `scout.a11y` | không | cây trợ năng — cái mà trình đọc màn hình thấy, không phải cái mắt thấy |
| `scout.shot` | không | ảnh chụp trang, trả về base64 |
| `scout.wait` | không | chờ NGAY TRONG trình duyệt tới khi một selector khớp (`present`), thôi khớp (`absent`), hoặc **thật sự bấm được** (`usable`), rồi trả lời một lần. Hết giờ trả `satisfied: false`, không phải lỗi |
| `scout.network` | không | nghe trang nói chuyện với máy chủ trong N giây: mỗi lượt gọi một dòng — cách gọi, đường dẫn, mã trạng thái, kiểu nội dung, số byte, mất bao lâu. **Không bao giờ** trả header, nội dung gửi lên, hay nội dung phản hồi |
| `scout.click` | **có** | bấm một phần tử bằng **chuột thật của trình duyệt** (trang thấy `isTrusted: true`). Kiểm điểm sắp bấm thuộc về ai TRƯỚC khi bắn; có thứ chắn thì từ chối `CLICK_OBSCURED`. Tự nó trả `da_kiem: false` — đưa `wait_for` để kiểm được |
| `scout.type` | **có** | gõ một chuỗi bằng **bàn phím thật**, từng phím một. Không xoá nội dung cũ. **Đọc lại ô sau khi gõ**: không thấy chữ thì `WRITE_NOT_OBSERVED` |
| `scout.key` | **có** | gõ một phím có tên: Enter · Tab · Escape · Backspace · Delete · bốn mũi tên · Home · End |
| `scout.hover` | **có** | đưa chuột tới một phần tử mà **không bấm** — cho những menu chỉ tồn tại khi có chuột rê lên. Cùng ba cái khoá của `scout.click`, kể cả hỏi-điểm trước khi bắn |
| `scout.scroll` | **có** | **đưa một phần tử vào tầm nhìn mà không bấm** — để chụp nó, hoặc để danh sách tải-thêm-khi-cuộn sinh ra phần tiếp theo (cuộn tới phần tử cuối rồi lặp). **Không nhận số điểm ảnh**: đường bánh xe chuột không bao giờ trả lời trên trang thật và nó **khoá cả tab** (`G-72`). Hứa *đã bảo trình duyệt cuộn*, không hứa *nó đang hiện* — kiểm bằng `scout.view` |
| `scout.history` | **có** | lùi / tiến **một bước** trong lịch sử của chính tab đó, giữ nguyên trạng thái trang đã cất ở đó. Người gọi nói HƯỚNG; chỉ số mục lịch sử tính ở trong. Hết đường thì từ chối, không im lặng |
| `scout.clear` | **có** | **xoá sạch một ô nhập** bằng bàn phím thật: `Ctrl+A` rồi `Delete`. Phím và phím bổ trợ **gõ cứng trong lõi ghi** — không tham số nào đổi được, vì `Ctrl` + phím tuỳ ý chạm tới lệnh của trình duyệt (`Ctrl+W` đóng tab). Trên macOS **không xoá được** (ở đó là `Cmd+A`) |
| `scout.fetch` | **có** | gọi một URL http(s) bằng **chồng mạng của chính trình duyệt**. Trả văn bản; `as: "base64"` cho thân nhị phân như PDF. Không kèm cookie trừ khi khai `with_credentials` |
| `scout.grab` | **có** | tải TỆP mà một phần tử trỏ tới (`src` hoặc `href`), dùng URL đọc được **bên trong** trình duyệt. **Không trả URL** — ảnh sau URL ký sẵn thì chữ ký không lọt ra nhật ký hay xuống đĩa. Nhận selector, không nhận url |
| `scout.navigate` | **có** | đi sang trang khác rồi đợi tới nơi — **kể cả đi tới đúng trang đang mở, tức là F5**. Trả về `reloaded` và `arrivedBy` (`new_document` hay `url_change`). Đổi trang là điều khiển trang, nên nó là lệnh GHI |
| `scout.reload` | **có** | nạp lại chính extension. Trả lời trước, khởi động lại sau. Trần 10 giây một lượt |

Mọi method chạm trang **bắt buộc** có `target_id` — lấy từ `scout.targets`. Không có đường
"tab đang mở": nhánh Flow đã trả giá cho đường đó.

### `present` khác `usable` ở đâu, và vì sao chỗ đó đắt

`present` trả lời *"selector này có khớp không"*. Nó KHÔNG trả lời *"bấm vào có ăn không"* —
một hộp thoại hay tấm chắn phủ lên trên thì cả cây DOM vẫn nằm nguyên bên dưới và mọi selector
vẫn khớp. Đo thật ngày 12/09: một lượt chờ trả `satisfied` sau **36 mili giây** trong khi màn
hình đang bị phủ kín.

`usable` đo thêm một bước: lấy điểm giữa của phần tử rồi hỏi Chrome *điểm đó thuộc về ai*.
Thuộc về chính nó, hoặc con cháu nó (nút biểu tượng là `<button><svg><path>`, điểm giữa rơi
vào `<path>`) thì tính là dùng được; thứ khác chắn thì không.

Kết quả trả về **cả hai con số**, và cặp đáng giá nhất là `matchCount: 1, usableCount: 0` —
*"nó có đấy, nhưng đang bị chắn"*. Phần tử nằm ngoài màn hình cũng tính là **chưa** dùng được:
phép dò cố ý không cuộn trang, vì cuộn là sửa thứ mình đang quan sát.

`scout.click` dùng **đúng phép hỏi đó** ngay trước mỗi lượt bắn chuột. Nên `usable` không phải
một phép đo xấp xỉ cho lượt bấm — nó là cùng một câu hỏi, hỏi sớm hơn.

**Ba method ghi ĐÓNG MẶC ĐỊNH.** Chưa bật *Chế độ phát triển* trong bảng bên thì chúng trả về
`WRITE_BLOCKED` và **không hề chạm tới trang** — không gắn debugger, không gửi khung nào. Bật
một lần được 200 lượt, hết thì tắt rồi bật lại. Không method Bridge nào bật được công tắc đó, nên
AI ở đầu dây không tự mở khoá cho chính nó. Lý do từng chốt:
[ADR-0001](docs/adr/0001-phanh-cho-duong-ghi-va-quyen-alarms.md) của gói.

**Ba method ghi không nhận toạ độ.** Chúng nhận một `selector`, và **từ chối nếu selector không
khớp đúng một phần tử**. Toạ độ do Scouter tự tính từ hộp của phần tử đó. Nhận toạ độ từ ngoài
là bấm được vào bất kỳ đâu trên màn hình, và cổng selector thành đồ trang trí.

`scout.type` **từ chối ký tự điều khiển**: Enter và Tab đi qua `scout.key`. Một ký tự xuống dòng
lọt vào giữa chuỗi là một lượt gửi biểu mẫu mà không ai yêu cầu.

### Ba method ghi hứa gì — và KHÔNG hứa gì

> **ĐỔI 16/09 (`S1`, `S2`).** `scout.type` nay **đọc lại ô nhập** sau khi gõ, và `scout.click`
> **khai thẳng** là nó chưa kiểm được. Mục này giữ nguyên phần *vì sao*, nhưng lời hứa đã khác —
> xem khối **"Đường ghi tự kiểm"** ngay dưới.

`scout.click` · `scout.type` · `scout.key` hứa đúng một câu:

> **đã bắn sự kiện chuột/bàn phím thật vào đúng điểm của đúng phần tử đã khớp.**

Chúng **không** hứa *"trang đã nhận"*. Đo được 12–14/09 (`S-22`): có tab mà lệnh DOM chạy bình
thường trong khi lệnh Input biến mất — không một `mousedown` nào tới trang, mà `scout.click` vẫn
trả `ok`. Hỏng **theo từng tab**, không theo hồ sơ Chrome, và **không** do tab ẩn hay cửa sổ thu
nhỏ (năm giả thuyết đó đã chết, xem `docs/GIA-THUYET.md`).

**Hệ quả cho người viết adapter — bắt buộc:** sau mỗi thao tác ghi, **kiểm bằng trạng thái trên
trang**, đừng tin mã trả về. `pilots/udin-optic/` làm đúng thế: bấm Try Again rồi kiểm *màn chắn
đã tắt chưa*; bấm Send rồi kiểm *nút có đổi thành Stop không*. Cả hai ĐẠT trên trang thật.

Đây là một **giới hạn đã khai**, không phải một lỗi đang chờ vá.

### Đường ghi tự kiểm (16/09)

Một giới hạn được viết ra **không tự nó trở thành an toàn**. Câu trên vẫn đúng, nhưng nó bắt mọi
người viết adapter phải nhớ tự kiểm — và sẽ có người quên. Nay hai lệnh tự đi tìm bằng chứng.

**`scout.type` — gõ xong thì ĐỌC LẠI.** Ba câu trả lời, không phải hai:

| kết quả | nghĩa là |
|---|---|
| `da_kiem: true` | đọc lại thấy chữ vừa gõ đã **tăng thêm** trong ô — trang đã nhận |
| lỗi `WRITE_NOT_OBSERVED` | đọc lại được, mà chữ **không tăng** — trang KHÔNG nhận. Lệnh **ĐỎ**, không phải "đạt kèm ghi chú" |
| `da_kiem: false` + một câu | **chưa kiểm được**: ô che nội dung (kiểu mật khẩu), bản đọc bị cắt ở trần, hoặc selector không khớp đúng một phần tử |

Nó **đếm số lần** chuỗi xuất hiện trước và sau, chứ không hỏi *"ô có chứa chuỗi đó không"*. Lý do
là một màu xanh giả có thật: `scout.type` **không xoá chữ cũ**, nên một ô đã sẵn chuỗi ấy sẽ làm
phép "có chứa" ĐẠT cho một lượt gõ chưa bao giờ tới trang.

**Đừng gõ lại mù quáng khi gặp `WRITE_NOT_OBSERVED`** — lệnh này không xoá chữ cũ, nên một lượt
thử lại là **gõ hai lần**. Nhìn lại trang trước đã. Và **đừng nới hạn chờ**: `S-22` ghi rõ đó là
sai hoàn toàn hướng.

**`scout.click` — khai thật, và kiểm được khi bạn đưa mốc.** Một cú bấm không để lại dấu vết
chung nào, nên tự nó trả `da_kiem: false` kèm một câu nói rõ điều đó. Đưa thêm `wait_for` — một
selector **phải xuất hiện** sau cú bấm, hoặc **phải biến mất** với `wait_state: "absent"` — thì
nó kiểm được, và không xảy ra thì **ĐỎ** (`CLICK_NOT_OBSERVED`).

```jsonc
{ "method": "scout.click",
  "params": { "target_id": "…", "selector": "#gui", "wait_for": "#dang-chay" } }
```

**MỘT SỰ THẬT ĐO ĐƯỢC, ngược với điều ai cũng tưởng** (`npm run scouter:doc-lai`): `<input>` và
`<textarea>` giữ chữ ở **thuộc tính đối tượng**, nên đọc cây DOM ra **rỗng** — đường đọc lại của
chúng là **cây trợ năng**. Ô `contenteditable` thì ngược lại: chữ nằm thật trong cây, nên nó đi
đường rẻ. Chọn đường theo **tên thẻ**, không mò.

**GIÁ CỦA LƯỢT ĐỌC LẠI, đo trên trang thật 16/09** (Udin, ô nhiều dòng → đường trợ năng):
**~390 ms** cho mỗi lượt `scout.type`, đã gồm một lượt dò và **hai** lượt kéo cây trợ năng.
Đối chứng: một lượt `scout.query` trần trên cùng tab mất 15 ms. Rẻ — nên đường hẹp hơn
(`Accessibility.getPartialAXTree`, hỏi đúng một nút) **không cần mở**.

**Từ vựng KHÔNG đổi:** vẫn 24 method. `wait_for` là một **tham số** của `scout.click`, không phải
một lệnh mới — và không lượt gọi cũ nào phải sửa.

## Tự kiểm

```bash
npm run test:scouter          # 8 phép ghim
npm run scouter:mutation      # 58 con đột biến
npm run scouter:bridge-live   # nối thử với máy chủ Bridge THẬT
npm run scouter:input-probe   # phép đo ①: cú bấm của máy có được coi là của người không
npm run scouter:action-probe  # phép đo ②: ba lệnh ghi có làm đúng việc trên trang thật không
npm run scouter:doc-lai       # phép đo ③: gõ xong thì đọc lại được bằng đường nào (bốn loại ô)
```

Luật của gói: `AGENTS.md`. Trạng thái: `STATUS.md`. Nhật ký: `HANDOFF.md`. Việc còn mở: `BACKLOG.md`.

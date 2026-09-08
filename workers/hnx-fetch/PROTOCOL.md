# PROTOCOL — HNX Fetch

> **Tệp này viết cho AI vận hành, và nó tự đứng một mình.** Bạn không cần đọc file nào khác
> để chạy được việc hằng ngày. Bạn cũng không cần là Claude Code — mọi thứ dưới đây là lệnh
> `node` chạy trên máy của Đức.
>
> Đức là chủ dự án, non-tech, người chốt duy nhất. Chữ Đức đọc: tiếng Việt. Mã lỗi: tiếng Anh.

---

## 0. Việc này là gì, nói một lần cho rõ

Mỗi ngày, Sở Giao dịch Chứng khoán Hà Nội công bố dữ liệu phái sinh trên hai trang:

| Trang | Ra cái gì |
|---|---|
| `https://hnx.vn/vi-vn/phai-sinh/ket-qua-giao-dich.html` | **kết quả giao dịch** từng hợp đồng — bảng 24 cột (23 cột chữ và số, cột đầu là **ảnh** mũi tên tăng/giảm — xem bẫy ⑶ mục 4.1) |
| `https://hnx.vn/vi-vn/phai-sinh/thong-ke.html` | **báo cáo thống kê** dạng tệp PDF |

Việc của bạn: lấy cả hai về thư mục dữ liệu của Đức, **không làm hỏng thứ đã có**, và **nói
thật** khi có gì đó không khớp.

Thư mục đích (Đức đã duy trì bằng tay từ 07/2026 — dữ liệu ở đó là dữ liệu thật):

```
G:\My Drive\WORKING AI CONTENT\Chứng khoán_AI\Phái Sinh daily Fetch\
```

Trong đó có **một tệp SSOT duy nhất** — nguồn sự thật cho mọi phân tích:

```
HNX_PS_Ket_qua_giao_dich_SSOT.csv
```

> **Vì sao MỘT tệp, và vì sao CSV.** Đức chốt 08/09: *"giữ 1 file duy nhất, ko làm thành nhiều
> file"* và *"định dạng để GPT & CC cùng thao tác được"*. Điều kiện là **hai công cụ cùng thao
> tác được**, không phải đuôi tệp. `.xlsx` là một tệp ZIP chứa XML; kho mã này không có thư
> viện phụ thuộc nào, nên mỗi lượt ghi phải tự cuộn ZIP bằng tay — và mỗi lượt là một cơ hội
> làm hỏng dữ liệu thật. CSV thì cả người, Excel, Python và mọi AI đều đọc thẳng được.

---

## 1. Extension này làm được gì — và cố ý KHÔNG làm được gì

HNX Fetch là extension Chrome cục bộ. Nó có **đúng bốn lệnh**, và bạn nên đọc kỹ danh sách này
trước khi định làm gì khác:

| Lệnh | Tốn lượt? | Làm gì |
|---|---|---|
| `session.hello` | không | bắt tay, thoả thuận phiên bản giao thức |
| `system.ping` | không | kiểm extension còn thức |
| `system.capabilities` | không | **tự khai năng lực** — nguồn có thẩm quyền, đừng chép ra chỗ khác |
| `scout.fetch` | **có** | gọi một URL bằng chồng mạng của **chính trình duyệt** |

**Nó KHÔNG bấm, KHÔNG gõ, KHÔNG mở tab, KHÔNG đọc DOM, KHÔNG chụp màn hình.**

Lời hứa đó đứng được là nhờ **BA thứ cùng vắng mặt** trong `manifest.json`, không phải một:

| Vắng mặt | Nếu có thì mở lại đường gì |
|---|---|
| quyền `debugger` | gắn vào tab và gửi sự kiện chuột/bàn phím thật |
| khối `content_scripts` | tiêm mã thẳng vào trang — **đường này KHÔNG đi qua danh sách `permissions`** |
| quyền `scripting` / `tabs` | tiêm mã lúc chạy |

Nói đủ ba vì bỏ mỗi `debugger` thì lời hứa **chưa đứng** — audit nội dung độc lập 08/09 chỉ
đúng chỗ này, và bản trước của tệp này nói thiếu. Phép ghim `v0.1.0/tests/be-mat-hep-smoke.mjs`
khối ⑵ khẳng định cả ba, và con đột biến `N22` chứng minh nó bắt được.

Hệ quả thực tế: **không có dải băng *"đang gỡ lỗi trình duyệt này"*** trên tab của Đức.

**Vì sao phải gọi mạng qua trình duyệt chứ không gọi thẳng bằng Node:** `hnx.vn` gửi chuỗi
chứng chỉ **thiếu** (chỉ có lá, không có chứng chỉ trung gian). Chrome tự đi lấy phần thiếu nên
vào được; Node thì không, và nó báo một lỗi TLS nghe như trang bị hỏng. Đừng "sửa" bằng cách
tắt kiểm chứng chỉ trong Node — đó là gỡ một lớp bảo vệ để chữa một triệu chứng.

### Ghi tệp thì KHÔNG đi qua extension

Đây là ranh giới quan trọng nhất của cả kiến trúc, đừng phá:

```
extension  →  chỉ TẢI về (scout.fetch)
Node       →  mới ĐẶT file xuống đĩa
```

Máy chủ Bridge nhốt mọi lệnh `file.*` trong một vùng ghi riêng, và vùng đó **cố ý không phải**
thư mục dữ liệu của Đức trên Drive. Nới vùng ghi ra tới Drive là hạ đúng cái chốt sinh ra để
một trang web không bao giờ ghi được vào dữ liệu thật. Tiến trình Node — của chính Đức, chạy
trên máy Đức — mới là thứ đặt tệp xuống.

---

## 2. Chuẩn bị

### ⓪ Bắt đầu từ số không — bốn thứ bạn phải CÓ trước khi làm gì

Ba trong bốn thứ này **chỉ Đức đưa được**. Thiếu chúng thì không có cách nào tự tìm ra, và
đoán bừa là hỏng. Hỏi một lần, ghi lại, dùng cho mọi phiên sau.

| Cần | Ai đưa | Ghi chú |
|---|---|---|
| **Đường dẫn kho mã** — thư mục chứa `workers/hnx-fetch/` | Đức | mọi đường dẫn trong tệp này tính từ đây, gọi là **gốc kho** |
| **Tệp ghép cặp** (`.json`, chứa cổng và token) | Đức | do bộ cài Bridge tạo. **Không có trong kho mã**, và không được đặt vào thư mục dữ liệu |
| **Thư mục dữ liệu** trên Drive | Đức | mục 0 ghi đường dẫn Đức đang dùng — xác nhận lại, đừng gõ theo trí nhớ |
| **Node.js ≥ 20** | tự kiểm | `node --version`. Mã dùng `node:` prefix và `Object.hasOwn`, nên bản cũ hơn sẽ hỏng |

**Quy ước thư mục làm việc trong cả tệp này** — audit chỉ đúng rằng bản trước trộn hai gốc:

| Khối lệnh ghi | thì `cd` về |
|---|---|
| bắt đầu bằng `workers/hnx-fetch/…` | **gốc kho** |
| bắt đầu bằng `node tai-…` hoặc `node kiem-…` | `workers/hnx-fetch/du-lieu/` |
| bắt đầu bằng `node v0.1.0/…` hoặc `node du-lieu/…` | `workers/hnx-fetch/` |

Shell: các câu lệnh dưới đây viết cho **PowerShell hoặc Git Bash trên Windows**. Đường dẫn có
dấu cách và dấu tiếng Việt, nên **luôn bọc trong dấu nháy kép**.

### Rồi ba việc này, làm một lần mỗi phiên

### ① Máy chủ Bridge **CỦA CHÍNH GÓI NÀY** phải đang chạy

Bridge là cái cầu giữa lệnh `node` của bạn và extension trong Chrome. Không có nó thì mọi lệnh
dưới đây báo `MAY_CHU_HONG`.

> **Đây là chỗ vấp đầu tiên, và nó hỏng IM LẶNG.** HNX Fetch nói giao thức `hnx-fetch.bridge`;
> máy chủ của Scouter nói `duc-scouter.bridge`. Lõi máy chủ so tên đó trên **mọi** phong bì, nên
> ghép cặp bằng tệp của Scouter thì tệp *hợp lệ* — cùng cổng, cùng token — mà bắt tay vẫn
> **không thành**. Triệu chứng duy nhất là dòng *"Mất kết nối"* ở bảng bên, **y hệt** lúc chưa
> bật máy chủ. Đã xảy ra thật ngày 08/09.
>
> Đó là hành vi **đúng**, không phải lỗi: tên giao thức là thứ giữ cho hai extension trên cùng
> một máy không nhận nhầm lệnh của nhau. Cách chữa là chạy **đúng máy chủ**, không phải nới lỏng
> phép so khớp kia.

Chạy máy chủ của gói này:

```bash
node workers/hnx-fetch/v0.1.0/bridge/hnx-fetch-host.mjs --pairing <tệp.json> --root <thư-mục-ghi>
```

Đức thì nhấp đúp `v0.1.0/bridge/Chay-may-chu-HNX.cmd`, hoặc kéo thả tệp ghép cặp vào nó.

**Dùng chung một tệp ghép cặp với Scouter được**, miễn là **không chạy hai máy chủ cùng lúc**
trên cùng cổng đó. Nhưng dùng chung thì mọi lượt gọi phải mang thêm cờ `--target` — xem ①bis.

**Cách đỡ phiền hơn: cho gói này một tệp ghép cặp RIÊNG, cổng riêng.** Sinh bằng một lệnh:

```bash
node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --ra "<đường dẫn .json NGOÀI kho mã>"
```

Không đưa `--cong` thì nó tự chọn cổng trống (32152 trở đi). Sinh xong: đưa tệp đó cho
`Chay-may-chu-HNX.cmd`, rồi **chọn đúng tệp đó trong bảng bên** của HNX Fetch. Từ lúc đó mỗi
máy chủ chỉ có một extension cắm vào, và `--target` thành không cần.

Lệnh này **từ chối ghi vào trong kho mã** (tệp chở token) và **từ chối ghi đè tệp đã có** (ghi
đè là làm chết kết nối của extension đang chạy). Gặp `TU_CHOI` thì đọc câu nó in ra — nó nói rõ
đường dẫn nào và vì sao.

**Tệp ghép cặp không bao giờ nằm trong kho mã** — hỏi Đức đường dẫn, rồi truyền qua `--pairing`.

**`--root` là VÙNG GHI, và nó KHÔNG được chứa tệp ghép cặp.** `file.read` đọc được mọi tệp dưới
vùng ghi, nên để tệp ghép cặp trong đó nghĩa là **token đọc được qua dây**. Máy chủ từ chối khởi
động nếu thấy — chặn lúc bật, không phải dặn.

### ①bis Trên máy có HAI extension? Bạn phải chỉ đích danh

Nếu Scouter và HNX Fetch **ghép cặp bằng cùng một tệp** thì **cả hai cùng cắm** vào máy chủ
đang chạy, và máy chủ không đoán hộ được. Mọi lượt gọi trả về:

```
TARGET_AMBIGUOUS — More than one extension session is connected
```

> **Tên giao thức KHÔNG chặn được chuyện này**, và đó là điều dễ hiểu nhầm nhất ở đây. Tên
> giao thức gác ở tầng **phong bì**; còn **cắm dây** thì xảy ra trước đó. Một extension nói
> `duc-scouter.bridge` vẫn cắm vào được máy chủ nói `hnx-fetch.bridge` — nó chỉ hỏng khi có
> phong bì thật đi qua. Hai cửa gác hai chuyện khác nhau.

Cách xử: thêm `--target <instance_id>` vào lệnh. Câu lỗi **tự kể tên các ứng viên** kèm dòng
lệnh chạy được ngay, nên bạn không phải đi tra ở đâu cả.

Không biết dòng nào là HNX Fetch? Gọi `system.ping` với từng dòng — đúng cái của nó trả về
`seed: hnx-fetch-v0.1`. Scouter trả về một lỗi.

Muốn khỏi phải chỉ đích danh: cho HNX Fetch **một tệp ghép cặp riêng, cổng riêng** — sinh bằng
`tao-tep-ghep-cap.mjs`, xem mục ① ở trên. Chừng nào chưa làm thì `--target` là đường đi.

### ② Chrome đang mở, đã nạp HNX Fetch, và bảng bên đã ghép cặp

`chrome://extensions` → Developer mode → **Load unpacked** → chọn thư mục
`workers/hnx-fetch/v0.1.0`. Bấm icon → bảng bên mở ở cạnh phải → mục **Kết nối Bridge** → chọn
tệp ghép cặp. Dòng trạng thái đổi thành *Đã nối máy chủ Bridge trên máy này.*

### ③ Bật công tắc "Cho phép lấy dữ liệu"

Ở đầu bảng bên. **Mặc định TẮT.** Tắt thì mọi lượt `scout.fetch` bị từ chối với
`DEV_MODE_OFF` — và extension **không hề chạm mạng**.

Mỗi lần bật cho **200 lượt gọi**. Hết thì tắt rồi bật lại.

> **Bạn KHÔNG tự bật được công tắc này, và đó là cả ý nghĩa của nó.** Không lệnh Bridge nào mở
> được nó. Nếu bạn thấy `DEV_MODE_OFF` hoặc `WRITE_CAP_REACHED`, việc đúng là **dừng lại và
> nói với Đức**, không phải tìm đường vòng. Tìm đường vòng quanh một cái phanh là việc phải
> hỏi Đức trước, không có ngoại lệ.
>
> Phím tắt **Ctrl+Shift+H** tắt công tắc ngay, dùng được cả khi bảng bên đã đóng. Nó chỉ tắt
> chứ không bật.

---

## 3. Việc hằng ngày

`cd` về `workers/hnx-fetch/du-lieu/` trước.

### Bước 0 — HỎI TỆP SSOT xem phải lấy từ ngày nào

Đừng gõ một khoảng ngày theo trí nhớ. **Tệp chính là trạng thái**, nên hỏi nó:

```bash
node kiem-ssot.mjs "<đường dẫn SSOT>"
```

Nó in ra `ngày CUỐI`. **Luật chọn khoảng: `--tu` là ngày SAU ngày đó, `--den` là hôm nay.**
Cả hai đầu đều TÍNH VÀO. Cuối tuần cứ để trong khoảng — mã tự bỏ qua thứ Bảy và Chủ nhật.

Lấy thừa về quá khứ cũng **vô hại** (ngày đã có thì bỏ qua, không tốn lượt gọi nào), nên khi
phân vân thì lấy rộng ra.

**HNX công bố trong ngày, không phải ngay lúc đóng cửa.** Chạy quá sớm thì ngày hôm nay ra
*không có phiên* — và lượt đó **không** đánh dấu gì cả, nên chạy lại sau vẫn lấy được. Đó là
lý do `S-12` (ngày lễ bị gọi lại) cố ý chưa vá: đánh dấu là đổi một phiền toái nhỏ lấy một
lỗi im lặng lớn.

### Bước 1 — kết quả giao dịch, nối vào tệp SSOT

```bash
node tai-ket-qua.mjs --pairing <tệp-ghép-cặp> --master "G:\My Drive\WORKING AI CONTENT\Chứng khoán_AI\Phái Sinh daily Fetch\HNX_PS_Ket_qua_giao_dich_SSOT.csv" --tu 2026-09-01 --den 2026-09-08
```

### Bước 2 — báo cáo PDF

```bash
node tai-pdf.mjs --pairing <tệp-ghép-cặp> --thu-muc "G:\My Drive\WORKING AI CONTENT\Chứng khoán_AI\Phái Sinh daily Fetch" --thang 09/2026
```

**Thêm `--target <instance_id>`** nếu trên máy có hai extension cùng ghép cặp — xem mục 2 ①bis.

**Thêm `--thu-xem` vào bất kỳ lệnh nào để CHỈ LIỆT KÊ, không ghi gì.** Chạy lượt xem trước khi
chạy thật là thói quen tốt: nó tốn lượt gọi, nhưng nó không bao giờ chạm đĩa.

### Bước 3 — soi lại tệp trước khi nói xong

```bash
node kiem-ssot.mjs "<đường dẫn SSOT>"
```

**Xong một lượt nghĩa là:** `dòng lệch cột: không` · `khoá trùng: không` · và mọi ngày mà nó
báo *thiếu hẳn* hoặc *khác 8 hàng* đều đã được giải thích bằng mục 4.3 ⑶ (đối chiếu chéo).
Còn một ngày chưa giải thích được thì **lượt đó chưa xong** — báo Đức, đừng tự kết luận.

### Bốn tính chất khiến hai lệnh trên an toàn khi chạy lại

1. **Ngày đã có thì KHÔNG lấy lại.** Tệp SSOT chính là trạng thái — không có sổ tiến độ riêng
   nào để lệch với nó.
2. **MỘT NGÀY VÀO TỆP TRỌN VẸN HOẶC KHÔNG VÀO GÌ.** Cả 8 hàng của một ngày đi trong **một**
   lượt ghi, và lượt ghi đó đi qua tệp tạm rồi mới đổi tên. Nên không có chuyện *"ngày này đã có một nửa"*: cắt điện giữa chừng thì ngày đó vắng hẳn, và lượt sau lấy lại từ
   đầu. Đây là điều khiến tính chất ⑴ an toàn — nếu thiếu nó, *"đã có"* sẽ là một câu nói dối.
3. **Chỉ NỐI vào cuối, không bao giờ sửa dòng cũ.** Dữ liệu Đức gom từ 07/2026 không bị đụng.
4. **Không bao giờ ghi đè tệp PDF đã có**, kể cả khi nội dung khác. Ghi đè là việc phải hỏi.

> **Đừng chạy hai lượt cùng lúc trên cùng một tệp SSOT.** Hai tiến trình Node không xếp hàng
> với nhau, và tính chất ⑵ chỉ bảo đảm cho MỘT lượt ghi, không bảo đảm cho hai lượt chồng nhau.
> Chạy tuần tự — mỗi lượt vài giây.

---

## 4. KIỂM TRA VÀ ĐỐI CHIẾU — phần quan trọng nhất của tệp này

Đức giữ việc này cho AI (chứ không làm thành một nút bấm) **vì phần đối chiếu**. Lấy được dữ
liệu là việc dễ. Biết dữ liệu đó có đúng không mới là việc bạn được thuê để làm.

### 4.1 Chỗ dữ liệu SAI mà vẫn trông ĐÚNG

Đọc hết bốn cái bẫy này trước khi tin bất kỳ con số nào.

**⑴ Số kiểu Việt — nguy hiểm nhất.**

`1.952,8` nghĩa là **một nghìn chín trăm năm mươi hai phẩy tám**. Dấu chấm là phân cách nghìn,
dấu phẩy là thập phân — **ngược hẳn** kiểu Anh. Đọc nhầm một lần là **sai gấp 1000 lần**, mà
con số vẫn trông hoàn toàn hợp lý nên không ai phát hiện.

Ô rỗng phải **ở lại rỗng, không thành `0`**. HNX để trống khi không có giao dịch, mà `0` và
"không có giao dịch" là hai chuyện khác nhau khi tính trung bình.

Hàm `so()` trong `luoc-do-master.mjs` đã xử lý, và nó **ném lỗi `SO_LA`** với thứ không phải
số thay vì lặng lẽ trả `0` hay `NaN`. Đừng viết bộ đọc số thứ hai.

**⑵ Sai tham số thì trang trả `200 OK` kèm một trang HTML KHÁC.**

Ở `hnx.vn`, **sai không ra lỗi — nó ra một trang khác**, trông y hệt thành công. Hàm
`kiemTra()` trong `nguon-hnx.mjs` là chốt duy nhất phân biệt được hai thứ đó, và nó ném lỗi
**KHÔNG-thử-lại**: yêu cầu sai thì sai với MỌI ngày, chạy tiếp chỉ để đốt sạch ngân sách rồi
báo "hỏng hết".

**⑶ Một cột có thể biến mất trong im lặng.**

Cột đầu bảng HNX **không có chữ nào** — nó chứa `<img src="up.png">`, tức dấu tăng/giảm. Một
bộ đọc gỡ thẻ HTML rồi lấy phần chữ sẽ làm **cả một cột biến mất**, mà CSV vẫn đủ số cột, vẫn
mở được, vẫn có số. Chuyện này đã xảy ra thật ngày 08/09. `oCuaHang()` trong `bang-ket-qua.mjs`
lấy tên tệp ảnh khi ô không có chữ.

**⑷ Lệch cột thì mọi giá trị nằm dưới sai tên.**

Ánh xạ sang lược đồ đi theo **vị trí**, nên một bảng 23 hay 25 cột sẽ gán mọi giá trị vào sai
tên — và tệp vẫn mở được, vẫn có số. `hangMaster()` ném `SO_COT_LA` nếu bảng nguồn không đúng
**24 cột**.

### 4.2 Bốn phép kiểm chạy tự động, bạn không phải làm gì

Chúng đã nằm trong mã. Việc của bạn là **đọc mã lỗi khi nó đỏ**, đừng vá quanh.

| Kiểm | Ném gì khi sai |
|---|---|
| Tiêu đề tệp SSOT khớp đúng 25 cột | `TIEU_DE_LECH` — **dừng, không tự sửa tiêu đề tệp dữ liệu thật** |
| Mọi dòng cũ trong tệp đủ 25 ô | `HANG_LECH` — tệp đã hỏng, dừng |
| Hàng sắp ghi đủ 25 ô | `HANG_SAI_CO` — không chạm đĩa |
| Bảng nguồn đúng 24 cột | `SO_COT_LA` |

Với PDF, mỗi tệp qua **bốn điều kiện trước khi chạm đĩa**: số byte khớp con số máy chủ khai ·
tệp ≥ 1024 byte · mở đầu bằng `%PDF-` · 2048 byte cuối có `%%EOF`. Lượt ghi đi qua tên
tạm `.dang-tai` rồi mới đổi tên — **chết giữa chừng để lại một tệp `.dang-tai` mà lượt sau bỏ
qua, KHÔNG để lại một tệp mang tên thật nhưng thiếu nửa sau.**

### 4.3 Bốn việc đối chiếu BẠN phải tự làm

Đây là phần máy không làm thay được, và là lý do Đức giữ việc này cho AI.

**⑴ Chạy bộ soi, đừng tự đếm.**

```bash
node kiem-ssot.mjs "<đường dẫn SSOT>"
```

Nó trả lời bốn câu, và **hai câu cuối là hai chỗ mù mà cách đếm thủ công không thấy** (audit
nội dung độc lập 08/09 chỉ ra):

| Nó đo gì | Vì sao đếm tay không đủ |
|---|---|
| dòng lệch cột | — |
| **khoá trùng** — khoá là **ngày + ISIN**, không phải chỉ ngày | cùng một hợp đồng ghi hai lần trong một ngày thì **tổng vẫn đúng 8 hàng**, mà một hợp đồng khác đã biến mất |
| ngày khác 8 hàng | một phiên đủ có 8 hàng: VN30 và VN100, mỗi loại 4 hợp đồng |
| **ngày trong tuần thiếu hẳn** | ngày không có dòng nào thì **không có gì để đếm** — nó vô hình với mọi phép đếm, chỉ dò bằng lịch mới thấy |

`dòng lệch cột` hoặc `khoá trùng` khác `không` → **dừng, báo Đức.** Hai dòng còn lại là **câu
hỏi**, không phải kết luận — đưa chúng sang ⑶.

```bash
node -e "const s=require('fs').readFileSync(process.argv[1],'utf8').replace(/^\uFEFF/,'').trim().split('\r\n').slice(1);const d={};for(const l of s){const n=l.split(',')[0].replace(/\"/g,'');d[n]=(d[n]||0)+1;}const la=Object.entries(d).filter(([,c])=>c!==8);console.log('ngày:',Object.keys(d).length,'· hàng:',s.length,'· ngày KHÁC 8 hàng:',la.length?JSON.stringify(la):'không');" "<đường-dẫn-SSOT>"
```

**⑵ Cột số phải là số, và ô rỗng phải ở lại rỗng.** Bộ soi không đọc nội dung số — nó soi
*hình dạng* tệp. Phần số do `luoc-do-master.mjs` canh lúc GHI và nó ném `SO_LA` với thứ không
phải số, nên tới được tệp là đã qua cửa đó. Việc của bạn là **liếc vài dòng mới nhất bằng mắt**
sau mỗi lượt: một cột giá bỗng nhỏ đi 1000 lần là dấu hiệu số kiểu Việt bị đọc nhầm (bẫy ⑴).

**⑶ Đối chiếu chéo giữa HAI ĐƯỜNG — và biết chính xác nó chứng minh được gì.**

Với mỗi ngày mà ⑴ báo *thiếu hẳn* hoặc *khác 8 hàng*, chạy đường PDF ở chế độ chỉ xem cho
đúng tháng đó:

```bash
node tai-pdf.mjs --pairing "<tệp>" --thu-muc "<thư mục>" --thang MM/YYYY --thu-xem
```

| Hai đường nói gì | Kết luận ĐƯỢC PHÉP rút |
|---|---|
| **cả hai** cùng trống | rất nhiều khả năng HNX không có phiên hôm đó — **nhưng vẫn chỉ là khả năng**, xem cảnh báo dưới |
| **chỉ một** đường trống | **có gì đó sai ở phía TA.** Đừng ghi ngày đó là ngày nghỉ |

> **Đừng đọc thành "hai nguồn độc lập".** Chúng là hai ĐƯỜNG LẤY khác nhau (khác địa chỉ,
> khác định dạng, khác cách dựng), nhưng **cùng một nhà công bố là HNX**. Nên chúng loại trừ
> được **lỗi của ta**, và **không** loại trừ được HNX công bố muộn hay HNX hỏng. Ngày nghỉ
> thật thì lượt chạy hôm sau vẫn thấy trống; HNX công bố muộn thì hôm sau có dữ liệu — nên
> **cách phân biệt duy nhất là đợi một lượt chạy nữa**, không phải suy từ hai đường.

Đo thật 08/09: ba ngày 31/08 · 01/09 · 02/09 được hai đường cùng báo trống, và các lượt chạy
sau đó vẫn trống — đó mới là đủ để gọi chúng là ngày không có phiên.

**⑷ Khi nghi ngờ một ngày, LẤY LẠI NÓ VÀO MỘT TỆP KHÁC rồi so.**

Đây là chỗ bản trước của tệp này nói một việc **không làm theo được**: ngày đã có trong SSOT
thì lượt lấy bỏ qua, nên không có cách nào "lấy lại" vào chính tệp đó. Cách đúng là lấy vào
một tệp trắng ở thư mục tạm — SSOT thật **không bị chạm một byte nào**:

```bash
node tai-ket-qua.mjs --pairing "<tệp>" --master "<thư-mục-tạm>/doi-chieu.csv" --tu 2026-08-12 --den 2026-08-12
```

Rồi so dòng của ngày đó ở hai tệp. Giống nhau từng ô thì cả hai đều tin được; khác nhau thì
**dừng và báo Đức** — đừng tự sửa tệp thật.

Đo thật 08/09, làm đúng cách này để nghiệm thu lược đồ: lấy lại 12/08 rồi so từng ô với hàng
`VN41I1G80003` có sẵn trong tệp của Đức — **25/25 khớp**.

### 4.4 Bốn điều KHÔNG BAO GIỜ được làm với dữ liệu

1. **Không sửa dòng cũ.** Chỉ nối vào cuối. Dữ liệu Đức gom bằng tay từ 07/2026 nằm trong đó.
2. **Không tự sửa tiêu đề** của tệp SSOT cho hết lỗi. Tiêu đề lệch nghĩa là có gì đó sai ở
   chỗ khác; sửa tiêu đề là làm mọi cột lệch tên mà không ai biết.
3. **Không cắt bớt dữ liệu cho vừa trần.** Thân trả về quá 512 KiB thì lệnh báo đỏ
   (`FETCH_BODY_TOO_LARGE`) chứ không cắt — cắt bớt là nói dối. Cách chia nhỏ: **hạ khoảng ngày
   xuống từng ngày một** (`--tu` và `--den` cùng một ngày). Xem mục 5 nếu vẫn vượt.
4. **Không xoá tệp nào.** Xoá là việc phải hỏi Đức.

---

## 5. Đỏ thì làm gì — bảng tra mã lỗi

| Mã | Nghĩa | Việc đúng |
|---|---|---|
| `DEV_MODE_OFF` | công tắc đang tắt | **báo Đức bật công tắc.** Không có đường vòng |
| `DEV_MODE_UNREADABLE` | không đọc được trạng thái công tắc | xử như đang tắt. Báo Đức |
| `WRITE_CAP_REACHED` | hết 200 lượt của lần bật này | báo Đức tắt rồi bật lại. **Đừng thử lại** — thử lại một cái phanh là vô nghĩa |
| `MAY_CHU_HONG` | không nối được máy chủ Bridge | kiểm máy chủ có đang chạy, và tệp ghép cặp còn đúng không |
| `TARGET_AMBIGUOUS` | hai extension cùng cắm vào một máy chủ | thêm `--target` — câu lỗi tự kể tên ứng viên. Xem mục 2 ①bis |
| `EXTENSION_OFFLINE` | không extension nào cắm vào | mở Chrome, mở bảng bên, kiểm dòng trạng thái đã báo *Đã nối* |
| `HINH_DANG_SAI` · `BANG_SAI` · `KHONG_CO_TBODY` | trang trả về thứ không phải bảng mong đợi | **KHÔNG thử lại.** Nhiều khả năng HNX đổi trang → xem mục 6 |
| `SO_COT_LA` | bảng nguồn không đúng 24 cột | HNX đổi cấu trúc bảng. Dừng, báo Đức, xem mục 6 |
| `TIEU_DE_LECH` · `HANG_LECH` | tệp SSOT hỏng hoặc không phải tệp mong đợi | **dừng hẳn.** Kiểm đúng đường dẫn chưa. Đừng ghi tiếp |
| `SO_LA` · `THAY_DOI_LA` | một ô chứa thứ không phải số | câu lỗi có kèm ISIN của hàng hỏng — mở trang, đọc thật |
| `FETCH_BODY_TOO_LARGE` | một ngày phình quá 512 KiB | hạ khoảng ngày xuống **một ngày một lượt**. Đừng cắt bớt. Xem ghi chú dưới bảng |
| `LAY_MOI` · lỗi mạng | trục trặc nhất thời | thử lại được, có giới hạn |

**Luật chung:** lỗi *hình dạng* (trang trả sai thứ) thì **không thử lại** — yêu cầu sai thì sai
với mọi ngày, chạy tiếp chỉ đốt sạch ngân sách rồi báo "hỏng hết". Lỗi *mạng* thì thử lại được;
vòng lặp tự thử lại vài lượt rồi bỏ, và lượt chạy sau lấy nốt ngày còn thiếu — nên **cách xử
lý đúng với lỗi mạng là chạy lại cả lệnh**, không phải can thiệp gì.

> **Về `FETCH_BODY_TOO_LARGE` — thứ tự thử, và một chỗ tài liệu này từng nói sai:**
>
> ⑴ **Hạ xuống một ngày một lượt.** Đây là cách gần như luôn đủ.
> ⑵ **Chia theo loại sản phẩm:** `--loai CHI_SO_CO_PHIEU` hoặc `--loai TRAI_PHIEU_CHINH_PHU`
>   (cũng nhận mã trang: `HDTLCSCP` · `HDTLTPCP`). Gõ sai mã thì lệnh **dừng** và kể ra danh
>   sách hợp lệ — cố ý, vì trang HNX trả 200 OK kèm cả một trang HTML khi tham số sai, nên chạy
>   tiếp với mặc định nghĩa là ghi dữ liệu của loại khác vào SSOT.
> ⑶ Còn vượt nữa thì phải mở mã — báo Đức, **đừng tự nới trần**.
>
> Bản trước của tệp này khuyên chia theo loại sản phẩm trong khi **cờ đó chưa tồn tại** — một
> lời khuyên không làm theo được, audit nội dung 08/09 bắt ra. Cờ nay đã có (`H-05` đóng 08/09).

**Một ngày đo được: 46 KB.** Trần 512 KiB rộng gấp hơn mười lần, nên mã lỗi này gần như chỉ
nổ khi có gì đó khác đã sai.

---

## 6. Khi HNX đổi trang

Sẽ có ngày HNX đổi. Lúc đó:

1. **Đừng đoán selector hay tên tham số.** Mở trang thật trong Chrome, bật **DevTools → tab
   Network**, thao tác trên trang, rồi đọc lượt gọi thật. Việc này bạn làm **bằng tay trong
   trình duyệt**, không qua extension: HNX Fetch cố ý không có đường đọc DOM hay đọc mạng của
   trang (mục 1). Cần Đức mở máy giúp thì hỏi — đó là việc một câu.
2. **Mọi hiểu biết về trang chỉ được nằm ở hai tệp:** `nguon-hnx.mjs` (kết quả giao dịch) và
   `nguon-thong-ke.mjs` (thống kê/PDF). Đừng rắc địa chỉ hay tên tham số ra chỗ khác.
3. **Mỗi lần sửa kèm một phép ghim.** Suite trong `du-lieu/tests/` không chạm mạng thật — nó
   chạy trên dữ liệu mẫu. Thêm một mẫu cho hình dạng mới.
4. **Chạy lại toàn bộ suite trước khi đụng dữ liệu thật:**

```bash
node v0.1.0/tests/run-all.mjs
```

(`cd` về `workers/hnx-fetch/` trước.) Nó quét theo hình dạng thư mục, nên một phép ghim mới
không phải khai vào đâu cả. Và nếu bạn vừa sửa một **chốt an toàn**, chạy thêm:

```bash
node v0.1.0/scripts/mutation-check.mjs
```

Bộ này cố tình làm hỏng từng chốt rồi xem phép ghim có đỏ lên không. **Con nào SỐNG SÓT nghĩa
là chốt đó đang không ai canh** — sửa cho tới khi 0 sống sót.

**Một chỗ đã biết là chưa xong:** trang thống kê nhận `p_report_type` là `D` (ngày) hoặc `M`
(tháng). Giá trị `Y` **cố ý không có** — nó trả về *"Không tìm thấy dữ liệu"*. Đừng thêm lại.

---

## 7. Ba việc phải hỏi Đức trước

1. **Thêm quyền mới cho extension** — nhất là `debugger`. Đó là bỏ lời hứa lớn nhất của gói.
2. **Đổi luật an toàn** — công tắc, trần 200 lượt, luật không-ghi-đè, luật chỉ-nối-vào-cuối.
3. **Xoá hoặc sửa dữ liệu gốc** trong thư mục Drive của Đức.

Ngoài ra, luật gốc: không gửi gì ra ngoài, không tạo automation tự chạy — nếu chưa hỏi.

---

## 8. Bảo trì chính tệp này

Đức chốt 08/09: **protocol này được maintain độc lập** với phần còn lại của kho mã.

Ba luật giữ nó khỏi mục:

1. **Đổi hành vi thì sửa tệp này trong CÙNG lượt.** Một protocol trễ một ngày là một protocol
   nói dối — và người đọc nó không có cách nào biết.
2. **Số liệu phải kèm cách đo, không chỉ kèm giá trị.** Con số viết ra sẽ mục; câu lệnh thì
   không. Mục 4.3 viết theo kiểu đó, hãy giữ kiểu đó.
3. **Cái gì đã cắn một lần thì ghi vào mục 4.1.** Mục đó không phải lý thuyết — cả bốn cái bẫy
   trong đó đều đã xảy ra thật, và mỗi cái đều từng cho ra dữ liệu trông đúng.

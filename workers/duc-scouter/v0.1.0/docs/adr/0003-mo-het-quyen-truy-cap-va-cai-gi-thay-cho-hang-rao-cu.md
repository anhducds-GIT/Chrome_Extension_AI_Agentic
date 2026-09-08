---
status: Accepted
adr: 0003
date: 2026-09-07
deciders: Đức
---

# ADR-0003 — Mở hết quyền truy cập, và cái gì đứng thay hàng rào vừa bỏ

## Bối cảnh

Pilot đầu tiên của Scouter là `hnx.vn` (`S-10`): lấy dữ liệu phái sinh theo ngày, một tuần.
Đo ngày 07/09 ra ba chỗ chặn, và cả ba đều nằm ngoài dự đoán của [ADR-0009](../../../../../docs/adr/0007-scouter.md):

**⑴ Node không vào được `hnx.vn`.** Máy chủ đó gửi chuỗi chứng chỉ **thiếu** — chỉ có lá, không
kèm trung gian `GlobalSign GCC R3 EV TLS CA 2025`. Trình duyệt tự đi lấy phần thiếu nên vào bình
thường; Node ném `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Đo lại được bất cứ lúc nào:

```
node -e 'const t=require("node:tls");const s=t.connect({host:"hnx.vn",port:443,servername:"hnx.vn",rejectUnauthorized:false},()=>{let c=s.getPeerCertificate(true),n=0;while(c&&n<6){console.log(n,c.subject.CN,"<-",c.issuer.CN);const p=c.issuerCertificate;if(!p||p===c)break;c=p;n++}console.log(s.authorized,s.authorizationError);s.end()})'
```

Chuỗi dài **một** mắt xích. Nên đi vòng qua trình duyệt **không phải cho đẹp kiến trúc** — ở máy
này nó là đường duy nhất không phải tắt kiểm chứng chỉ. Đường kia là `rejectUnauthorized: false`,
tức gỡ một lớp bảo vệ để test xanh, và luật vàng 3 cấm.

**⑵ Bridge host không ghi được file.** `bridge-host.mjs` chỉ đọc đúng một file (tệp ghép cặp) và
không có đường ghi nào. Câu *"Bridge ghi code mới xuống đĩa"* ở ADR-0009 mục ⑸ mô tả một thứ
**chưa tồn tại**. Mà host nằm trong `workers/duc-auto-chatgpt` — gói Đức **đóng băng** sáng cùng
ngày (giới hạn ①), nên không được sửa.

**⑶ Scouter không có đường nào gọi một endpoint.** `Runtime.*` và `Network.*`/`Fetch.*` bị loại
có chủ ý từ [ADR-0007](../../../../../docs/adr/0007-scouter.md), và lượt
này **không mở**.

Tôi hỏi Đức ba lựa chọn: cho quyền riêng `hnx.vn` · để Node tự lấy (cài chứng chỉ thiếu) ·
Scouter bấm nút như người rồi đọc bảng.

## Quyết định

**Đức chốt 07/09, rộng hơn cả ba lựa chọn:** *"tôi muốn mở tất cả quyền cho seed & Scouter &
bridge như ban đầu đã nói, để không bị giới hạn case by case của các web khác nhau và mục đích
khác nhau."*

Nên:

1. `host_permissions` thành `["<all_urls>", "http://127.0.0.1/*"]`. **Giữ dòng 127.0.0.1** dù
   trông như đã bị phủ: `<all_urls>` không phủ lược đồ `ws:`, mà cửa Bridge là WebSocket.
2. Thêm method **`scout.fetch`** — `fetch()` của chính service worker. **Không** mở `Runtime.*`,
   **không** mở `Network.*`/`Fetch.*`; ⑶ ở trên giữ nguyên.
3. **Không** đụng gói đóng băng. Phần ghi file nằm ở **phía gọi** — một script Node trong gói
   Scouter. Điều đó giữ được cả ý Đức lẫn giới hạn ① của chính Đức.

## Hệ quả

**Nói thẳng cái đắt nhất trước.** `<all_urls>` cộng `debugger` nghĩa là Scouter chạm được **mọi
trang Đức đang đăng nhập**. Đây là quyền thật. Đức được báo trước bằng đúng câu đó và vẫn chốt;
ghi lại đây để lần sau không ai phải đoán là Đức có biết hay không.

**Cái đổi lại, và đây là phần quan trọng của ADR này:** hàng rào cũ là *"chỉ vào được trang nào
đã khai"*. Lượt chốt này bỏ nó. Cái đứng thay là **năm chốt hình dạng**, và vì chúng là lớp cuối
nên gỡ cái nào cũng là gỡ một lớp, không phải dọn code:

| Chốt | Chặn cái gì | Ghim ở |
|---|---|---|
| `scout.fetch` là `read_only: false` | bắt nó chui qua phanh 50 lượt | `F1` · bridge-smoke |
| chỉ nhận `http:`/`https:` | `file://` đọc đĩa của Đức — `fetch()` nuốt lược đồ này | `F2` · bridge-smoke |
| từ chối header `cookie`/`authorization` | mượn danh tính người khác | `F3` · bridge-smoke |
| `credentials` mặc định `omit` | đọc nội dung sau đăng nhập của trang bất kỳ | `F5` · gate-smoke ⒞ |
| thân quá 512 KiB thì **đỏ**, không cắt | trả nửa file mà người gọi tưởng đủ | `F6` · gate-smoke ⒟ |

**Cờ `read_only: false` trên một lượt chỉ ĐỌC dữ liệu — chỗ dễ cãi nhất, nên nói rõ.** Cờ đó
không hỏi *"có sửa trang không"*, nó hỏi *"có phải đi qua phanh không"*. Xếp `scout.fetch` là
`read_only: true` là cho nó chạy tự do đúng lúc nó nguy hiểm nhất.

**Cái phanh đổi vai.** Từ [ADR-0001](0001-phanh-cho-duong-ghi-va-quyen-alarms.md) nó là lớp phụ
cho ba lệnh bấm. Nay nó là **lớp bảo vệ chính** của cả gói: thứ duy nhất đứng giữa một lượt gọi
sai và mọi trang Đức đang mở. Trần 50 lượt một lần mở khoá không đổi ở lượt này — pilot một tuần
tốn 5 lượt.

**Con `Q2` chết theo lượt chốt này.** Nó từng ghim *"không được nới `host_permissions` ra cả
Internet"*. Mỏ neo của nó khớp 0 lần sau lượt sửa, và bộ đo **ĐỎ là đúng** — đó là lý do trường
`soLan` tồn tại. `Q2` chuyển sang canh cái còn lại: gộp mất dòng `127.0.0.1` thì cửa Bridge mất
đường về, và hỏng đó im lặng.

**Một lỗi hạ tầng lộ ra trong lúc làm, đã vá.** Chạy bộ đo đột biến hai lượt chồng nhau thì lượt
sau lưu **bản đã đột biến** làm "bản gốc", và một con đột biến **ở lại trong mã nguồn**. Xảy ra
thật lượt này (`read_only: true` kẹt lại; phép ghim bắt được, nhưng một con tinh hơn thì suite
vẫn xanh và thứ ở lại là một chốt đã bị gỡ). `scripts/mutation-runner.mjs` nay nhận một **khoá
file** (`wx`, nguyên tử) và từ chối lượt thứ hai với mã thoát 2.

**Ai phải làm gì khác đi.** Đức **nạp lại extension** — manifest đổi, và Chrome sẽ hỏi lại quyền
với câu *"Đọc và thay đổi dữ liệu trên tất cả các trang web"*. Câu đó **đúng**, không phải cảnh
báo thừa.

## Trạng thái

Accepted

# Bằng chứng — Bridge tự phát hiện mất kết nối và tự nối lại (28/08/2026)

> Bằng chứng vận hành. **Chỉ được thêm, không sửa, không xoá.**

## Kiểm chứng cái gì

Bản vá lớp vận chuyển Bridge (commit `3514aa5`): keepalive có **hạn chờ ACK**, và reconnect
theo **thang có trần**. Trước bản vá, extension gửi tín hiệu "còn sống" mỗi 20 giây nhưng không
bao giờ kiểm xem host có trả lời không — nên kết nối đã đứt vẫn hiện **Connected**.

## Cách đo

Đức bấm ⟳ reload extension, rồi tắt/bật cửa sổ host hai lần. Song song, một máy đo lấy mẫu
mỗi giây từ phía CLI, phân biệt ba trạng thái:

| Trạng thái | Nghĩa |
|---|---|
| `HOST-DOWN` | không có gì lắng nghe ở cổng 32148 — host đang tắt |
| `NO-EXT` | host trả lời `EXTENSION_OFFLINE` — **host đã sống lại, extension chưa nối lại** |
| `OK` | đi trọn vòng CLI → host → extension → router |

Khoảng `NO-EXT` chính là thời gian extension nối lại. Máy đo: `scripts/watch-bridge.mjs`
(bản chạy nằm ở thư mục tạm của phiên, nội dung log nguyên văn bên dưới).

## Kết quả

Hai máy đo chạy độc lập, số khớp nhau.

```
11:25:51  start
11:25:51  OK
11:29:06  HOST-DOWN  (previous state held 194.4s)
11:30:03  NO-EXT     (previous state held 57.6s)
11:30:26  OK         (previous state held 22.5s)
11:34:39  HOST-DOWN  (previous state held 252.8s)
11:34:59  NO-EXT     (previous state held 19.2s)
11:35:26  OK         (previous state held 27.7s)
```

**Phía Đức nhìn thấy:** tab BRIDGE chuyển sang **Mất kết nối** cả hai lần — không còn đứng
**Connected** giả. Đây là nửa quan trọng nhất và chỉ mắt người mới xác nhận được.

## Vì sao con số 22,5s và 27,7s là ĐÚNG, không phải lỗi

Thang chờ lúc đó là 1s → 2s → 5s → 10s → 30s, nên extension thử lại ở giây 1, 3, 8, 18, 48, 78
tính từ lúc đứt. Thời gian chờ = khoảng cách từ lúc host sống lại tới lần thử kế tiếp.

| Cú đứt | Host tắt | Lần thử kế tiếp | Dự đoán | Đo được |
|---|---:|---:|---:|---:|
| 1 | 57 s | giây 78 | 21,0 s | 22,5 s |
| 2 | 19 s | giây 48 | 28,8 s | 27,7 s |

**Cả hai dự đoán được viết ra TRƯỚC khi đọc số đo**, và khớp trong vòng 1 giây. Việc khớp hai
lần cũng chứng minh service worker MV3 **vẫn thức suốt cú đứt** — nếu nó ngủ thì đồng hồ của nó
chết theo và thang chờ không thể chạy tới giây 78.

## Điều bằng chứng này KHÔNG chứng minh

- Ba tình huống mà bản vá thật sự chữa — kết nối chết lặng không ai báo, socket kẹt lúc đang
  nối, host nhận kết nối rồi không trả lời auth — **không tái hiện được bằng cách tắt cửa sổ
  host**, nên không nằm trong bằng chứng này. Chúng được ghim bằng test, không bằng đo live.
- Với đúng kịch bản tắt/bật host, bản vá **không làm nối lại nhanh hơn** bản cũ: trước là alarm
  30 giây, sau là trần thang cũng 30 giây.

## Việc làm sau đó

Chính vì hai điều trên, Đức chốt ngày 28/08 **hạ trần xuống 5 giây** và cho thang **nhường lại
cho alarm sau ~2 phút** (host nằm ngay trên máy nên "lùi để khỏi nện" không còn lý do; đổi lại
không để extension thức vô hạn khi host tắt cả đêm). **Thay đổi đó CHƯA được đo live** — số
trong file này là của bản trần 30 giây.

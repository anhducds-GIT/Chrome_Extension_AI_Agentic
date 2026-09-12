# Pilot `trang-thu-cham` — bàn đo để khép vòng tự cải tiến (T7)

Một trang thử **tự dựng**, tối thiểu: một ô nhập, một nút, một kết quả hiện ra **sau
1.200ms**. Độ trễ là phần bắt buộc — nó là thứ ép người gọi phải chờ cho đúng thay vì
đọc ngay rồi tưởng mình đã xong.

Không phải trang của ai cả, nên **không cần Đức duyệt** (luật gói số 3: trang thật thì
hỏi, trang tự tạo thì được), và bật/tắt được thứ mà trang thật không cho: thêm `?chan=1`
vào URL là dựng một tấm chắn phủ kín — cây DOM vẫn nguyên bên dưới, đúng ca đã làm
`scout.wait` nói dối ngày 12/09.

## Chạy

```bash
node workers/duc-scouter/pilots/trang-thu-cham/phuc-vu.mjs        # cửa sổ riêng, giữ chạy
```

Rồi, với `SCOUTER_GHE` là `instance_id` của ghế (lấy ở `bridge.sessions`):

```bash
SCOUTER_GHE=<id> node workers/duc-scouter/pilots/trang-thu-cham/scripts/do-trang.mjs
SCOUTER_GHE=<id> node workers/duc-scouter/pilots/trang-thu-cham/scripts/vong.mjs "câu cần vọng lại"
```

`do-trang.mjs` là **chặng 2** (dò rồi ghi báo cáo xuống đĩa qua Bridge); `vong.mjs` là
**chặng 4** (nạp lại → adapter chạy → so với thứ đã biết). Adapter ở `scripts/adapter.mjs`.

Phép ghim `tests/adapter-trang-thu-smoke.mjs` (9 khối) chạy trong `npm run test:scouter` và
**không cần trình duyệt** — `goi` đi vào adapter bằng tham số nên mọi ca hỏng dựng được
bằng hàng giả, kể cả ca không dựng lại được ngoài đời.

## Bản đồ file

| file | việc |
|---|---|
| `trang/index.html` | trang thử. Sửa nó là đổi bàn đo — sửa xong phải chạy lại chặng 2 |
| `phuc-vu.mjs` | máy chủ tĩnh, **chỉ nghe 127.0.0.1**. Cần vì `scout.navigate` chặn `file:` và `data:`, cố ý |
| `scripts/goi-bridge.mjs` | gọi Bridge. Token nằm NGOÀI repo; ở đây chỉ có đường dẫn, đổi được bằng `SCOUTER_GHEP` |
| `scripts/do-trang.mjs` | chặng 2 — dò và ghi báo cáo |
| `scripts/adapter.mjs` | chặng 3 — hiểu biết về **trang này**, không dòng nào được trôi lên seed |
| `scripts/vong.mjs` | chặng 4 — nạp lại, chạy adapter, so kết quả |
| `tests/adapter-trang-thu-smoke.mjs` | phép ghim, 9 khối, chạy không cần Chrome |

## Ba thứ đo được ở đây mà trang thật không dạy được

1. **Ô kết quả `#ket-qua` là một `div` ẩn** → `scout.page` không thấy (không phải phần tử
   tương tác) và `scout.a11y` cũng không thấy (lúc còn ẩn nó không có trong cây trợ năng).
   Chỉ `scout.tree` thấy. Dò bằng hai phép đầu là dựng được adapter biết bấm mà **không
   biết câu trả lời rơi vào đâu**.
2. **Seed không có phép đọc chữ của MỘT phần tử.** Đường duy nhất hôm nay là đọc cây trợ
   năng rồi lọc theo tiền tố — adapter đang làm đúng thế, và đó là một khuyết của seed chứ
   không phải chuyện riêng của trang này.
3. **`scout.click` báo trúng vẫn có thể không tới nơi** — xem `S-22`. Dấu `data-bam` đặt
   ngay trong tay nghe lượt bấm là thứ tách được "không tới nơi" khỏi "tới nơi mà chậm".

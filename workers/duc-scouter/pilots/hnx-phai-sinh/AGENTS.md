# PILOT `hnx-phai-sinh` — lấy dữ liệu phái sinh theo ngày

> **Đây là PILOT, không phải seed.** Seed ở `../../v0.1.0/`. Ranh giới:
> [ADR-0020](../../../../docs/adr/0020-thang-phien-ban-scouter-va-ranh-gioi-seed-pilot.md) mục ⑶.
> Việc gốc: `S-10` trong `../../v0.1.0/BACKLOG.md`.

## Pilot này là gì

Đức chốt 07/09: lấy dữ liệu hai trang phái sinh của Sở Giao dịch Chứng khoán Hà Nội **theo
ngày**, ghi file xuống máy **qua Bridge** (không thêm quyền `downloads`). Phạm vi lượt đầu: **một
tuần**.

Đây là **nấc v1** của thang phiên bản: pilot này là việc thật kéo seed tới chỗ đóng gói được.

## Một điều phải nói ngay, kẻo hiểu nhầm cả gói

**Pilot này KHÔNG bấm một nút nào.** Dữ liệu không nằm trong trang — nó tới từ một lượt `POST`
trả về JSON. Nên ba năng lực đắt nhất của Scouter (`scout.click` · `scout.type` · `scout.key`)
**không dùng tới ở đây**, và pilot này **không chứng minh** được vòng tự cải tiến.

Thứ nó chứng minh: `scout.fetch` + ghi file + bộ máy hàng đợi. Đó là ba thứ thật, nhưng đừng
nhầm chúng với mục đích của cả gói.

## Bản đồ file

| File | Vai trò |
|---|---|
| `vong-lay.mjs` | **Vòng lặp, KHÔNG biết trang nào.** Ba tính chất: không làm hai lần · chạy tiếp khi đứt · thử lại đúng loại lỗi. Ứng viên đẩy lên seed **sau khi chạy thật một lần** |
| `nguon-hnx.mjs` | **Hiểu biết về trang** — địa chỉ, tham số, cách nhận ra trả lời đúng. Mọi thứ riêng của trang chỉ được nằm ở đây |
| `tests/vong-lay-smoke.mjs` | Ghim ba điều kiện đóng của `S-10` trên **máy chủ giả** — không tiêu một lượt gọi thật nào |
| `scripts/pilot-mutation-check.mjs` | 9 con đột biến. Dùng chung bộ máy với seed, không chép bản thứ hai |

## Hai ràng buộc vận hành, đo được, đừng quên

1. **`scout.fetch` trần 512 KiB một lượt.** Một ngày `hnx.vn` là **~231 KB** — lọt, nhưng không
   rộng. Ngày nào phình quá trần thì lệnh ĐỎ chứ không cắt bớt (cắt bớt là nói dối), và lúc đó
   phải chia nhỏ theo loại sản phẩm.
2. **`scout.fetch` TIÊU NGÂN SÁCH GHI** — nó không phải lệnh đọc. Cái phanh cho **50 lượt một
   lần bật**. Một tuần 5 ngày thì thoải mái; một tháng thì phải bật lại giữa chừng. Vòng lặp
   dừng ngay khi gặp phanh chứ không thử lại — thử lại một cái phanh là vô nghĩa.

## Cái bẫy đã trả giá, đọc trước khi sửa `nguon-hnx.mjs`

**Sai tên tham số thì trang trả `200 OK` kèm một trang HTML khác**, trông y hệt thành công. Ở
trang này, **sai không ra lỗi — nó ra một trang khác**.

Nên `kiemTra()` là chốt duy nhất phân biệt được hai thứ đó, và nó ném lỗi **KHÔNG-thử-lại**:
yêu cầu sai thì sai với MỌI ngày, chạy tiếp chỉ để đốt sạch ngân sách rồi báo "hỏng hết".
Khối ⑥ của phép ghim canh đúng chỗ này.

## Chạy

```bash
node tests/vong-lay-smoke.mjs          # ghim, không cần mạng
node scripts/pilot-mutation-check.mjs  # đột biến kiểm
```

Suite này cũng chạy trong `../../v0.1.0/tests/run-all.mjs` — nó quét `pilots/*/tests/*.mjs`
theo hình dạng, nên pilot thứ hai không phải sửa gì.

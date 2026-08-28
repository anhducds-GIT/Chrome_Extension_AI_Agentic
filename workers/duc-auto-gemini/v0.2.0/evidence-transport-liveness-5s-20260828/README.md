# Bằng chứng — trần chờ 5 giây, đo trên máy thật (28/08/2026, chiều)

> Bằng chứng vận hành. **Chỉ được thêm, không sửa, không xoá.**
>
> **File này hoàn tất phần còn treo của `evidence-transport-liveness-20260828/`.** Thư mục đó đo
> bản **trần 30 giây** và kết thúc bằng câu "thay đổi trần 5 giây CHƯA được đo live". Đây là
> phép đo đó. Thư mục cũ không bị sửa — luật bằng chứng chỉ cho thêm mới.

## Kiểm chứng cái gì

Commit `4789754`: hạ trần chờ nối lại từ 30 giây xuống **5 giây**, thang `1s → 2s → 5s` lặp, và
sau ~2 phút thì thang bỏ cuộc, nhường lại cho alarm 30 giây.

## Dự đoán, viết TRƯỚC khi đo

Thang thử lại ở giây 1, 3, 8, 13, 18, 23, 28… tính từ lúc đứt. Nên **chờ nhiều nhất 5 giây**,
bất kể host tắt bao lâu, miễn là dưới 2 phút.

## Kết quả

Đức bấm ⟳ reload extension, rồi tắt/bật host một lần. Máy đo lấy mẫu mỗi giây từ phía CLI
(cùng script với lần trước: `watch-bridge.mjs`).

```
14:02:02  start
14:02:02  OK
14:02:36  HOST-DOWN  (previous state held 34.8s)
14:02:53  NO-EXT     (previous state held 16.1s)
14:02:54  OK         (previous state held 1.0s)
```

**Nối lại sau 1,0 giây.**

Khớp model lần thứ ba liên tiếp: host tắt lúc 14:02:36, sống lại lúc 14:02:53 — tức 17 giây
sau. Lần thử kế tiếp của thang rơi vào **giây 18**, tức 14:02:54. Đo được đúng 14:02:54.

## So với bản cũ

| Bản | Trần thang | Host tắt | Chờ nối lại |
|---|---:|---:|---:|
| trước (`3514aa5`) | 30 s | 57 s | 22,5 s |
| trước (`3514aa5`) | 30 s | 19 s | 27,7 s |
| **sau (`4789754`)** | **5 s** | 16 s | **1,0 s** |

## Đọc con số 1,0 giây cho đúng

1,0 giây là **may**, không phải bảo đảm: host sống lại ngay sát một mốc thử. Cái được bảo đảm là
**trần 5 giây** — xấu nhất, host sống lại ngay sau một lần thử thì phải chờ trọn 5 giây.

## Chưa đo

Nhánh "tắt host quá 2 phút → thang bỏ cuộc → alarm 30 giây lo tiếp" **chưa đo live**. Nó được
ghim bằng test (`tests/bridge-transport-liveness-smoke.mjs`), không bằng đo thật. Đo được nếu
muốn: tắt host trên 2 phút rồi bật lại, chờ sẽ lên tới ~30 giây thay vì dưới 5 — và đó là
**đúng thiết kế**, không phải hỏng.

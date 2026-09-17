# Bằng chứng — Udin Optic chạy trọn vòng việc thật, 17/09/2026

> Trang này là thứ `STATUS.md` trỏ tới khi khai `last_verified: 2026-09-17`.
> **Đức mở được từng thứ dưới đây bằng tay** — đó là điều kiện để nó được gọi là bằng chứng.

## Chạy cái gì

Một lệnh, không một cú bấm nào của người:

```
node workers/udin-optic/tu-dong/vong-tham-chieu.mjs \
  "Create 4 images: @2 reimagined as a 1970s Scandinavian enamel cookware advert, thick matte
   colour blocks, avocado green and burnt orange, borrowing the lighting of @1" \
  --anh "canvas:2u4vdq" \
  --anh "udin-optic/w4-vao-vong-17-09/2026-09-16T18-13-35-224Z/02-batch-1789582400646-1-x6oh18h8.jpg" \
  --du-an ma-dinh-danh-17-09 --bo-chon-cu
```

## Ảnh ra — mở thư mục này là thấy

```
C:\WORKING ZONE\Chrome Extension Bridge\udin-optic\anh-ra\udin-optic\ma-dinh-danh-17-09\2026-09-17T02-22-30-537Z
```

Bốn tệp `.jpg` (kèm bản `.webp` gốc, **không bị xoá**):

| | tệp | byte `.webp` |
|---|---|---|
| 1 | `01-batch-1789611733460-0-kya4pnfm` | — |
| 2 | `02-batch-1789611734013-0-k0e8sou2` | — |
| 3 | `03-batch-1789611735030-1-16l0g61w` | — |
| 4 | `04-batch-1789611734519-0-kzrbw0b2` | 672.864 |

## Vì sao lượt này đáng làm bằng chứng, chứ không phải một lượt chạy đẹp

Nó chạy **ca khó nhất** trong hai ca Đức nêu: `@2` là **một tệp trên đĩa**, được thả vào canvas
trong chính lượt chạy.

| | nguồn | mã trang tự gán |
|---|---|---|
| `@1` | ảnh đã có sẵn trên canvas | `image-1789566611569-cmy3iqb0b` |
| `@2` | **tệp trên đĩa**, thả bằng `scout.tha` | `image-1789611506928-vyqc9zbu2` |

Sáng cùng ngày, chính ca này **gãy**: canvas đang giữ nhiều ảnh thả mang `src` giống hệt nhau
trong 200 ký tự đầu, nên phép so `src` thấy *0 ảnh mới* và lệnh báo *"trang chưa nhận"* — một câu
sai nguyên nhân. Danh tính nay là `data-image-id` ([ADR-0009]), nên chỗ đặt mới có mã riêng ngay
từ lượt thả.

## Ba con số đo được, không phải lời khai

1. **Bảy chặng đều xanh:** `W1 → NGUỒN → CHỌN → W2 → W3 → JPG → W4`.
2. **0 hộp thoại hệ điều hành**, đếm `0/14` và `0/11` lần bằng `EnumWindows` lọc lớp cửa sổ
   `32770` của Windows — tức đếm bằng dụng cụ *nhìn thấy được* hộp thoại con, không phải bằng
   việc Đức không kêu.
3. **Thứ tự `@N` đọc NGƯỢC lại từ huy hiệu trên trang**, không tin thứ tự mình bấm.

## Vế mà không phép ghim nào kiểm được

Câu Udin tự viết ra ở chặng `W4`:

> *"Here are those 1970s Scandinavian-inspired variations! I've reimagined the teapot with thick
> matte enamel color blocks in avocado green and burnt orange, all while keeping that dramatic
> sunlight from **the first** image."*

Nó nói *the first* — đúng chiều `@1` cho ánh sáng, `@2` là vật thể. Chọn nhầm thứ tự thì Udin
vẫn chạy, vẫn ra bốn ảnh, và **không một dòng đỏ nào**; chỉ câu này nói được là đúng chiều.

## Phạm vi — thứ trang này KHÔNG chứng minh

- **KHÔNG** phải nghiệm thu `T7` (vòng tự cải tiến). Mức ấy vẫn là `PARTIAL` và cần chữ ký Đức.
- **KHÔNG** phải nghiệm thu cho một trang nào khác Udin. Gói này khai đúng một trang.

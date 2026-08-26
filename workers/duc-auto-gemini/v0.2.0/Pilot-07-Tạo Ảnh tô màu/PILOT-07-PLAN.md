# Pilot 07 — Ảnh nét để trẻ 5 tuổi tô màu (26/08/2026)

## Đức đặt hàng

18 ảnh minh hoạ màu → 18 tranh nét đen trắng cho trẻ **5 tuổi** tô màu.
Yêu cầu của Đức, nguyên văn: *"chỉ gồm các nét mảnh liền dạng vector, vùng màu rõ ràng,
nền trắng hoàn toàn, nét rõ ràng."*

## Nguyên liệu

| Mục | Số liệu đo được |
|---|---|
| Ảnh gốc | 18 file PNG, 44 MB, `1536×1024` và `1448×1086`, RGB |
| Ảnh thu nhỏ để gắn kèm | 18 file JPEG trong `refs-thu-nho/`, 1024px cạnh dài, **127–294 KB** |
| Trần của `references.add` | 700 KB mỗi ảnh (dạng data URL) → bản thu nhỏ nặng nhất ≈ 392 KB, **lọt thoải mái** |
| Ảnh gốc có bị đụng không | **Không.** Bản thu nhỏ là file mới, thư mục riêng. Bảng đối chiếu: `refs-thu-nho/BANG-DOI-CHIEU.md` |

## Năng lực CHƯA từng chạy live mà pilot này phụ thuộc vào

Pilot REF-01 (26/08) dùng **một** ảnh mẫu chung cho cả hai job. Pilot 07 cần
**mỗi job một ảnh mẫu riêng** — 18 job, 18 ảnh khác nhau. Đường code có hỗ trợ
(`reference_images` là trường riêng của từng job) nhưng **chưa có bằng chứng live**.
Đây là lý do phải chứng minh nhỏ trước.

## Rủi ro chất lượng đã nhìn thấy TRƯỚC khi chạy

Bộ 18 ảnh có độ rậm rất khác nhau. Hai đầu cực:

| Ảnh | Nội dung | Rủi ro |
|---|---|---|
| `ref-18` (nhẹ nhất, 127 KB) | Bố + con + chó xếp khối gỗ, nền gần như trắng | Thấp — gần như đã là tranh tô màu |
| `ref-12` (nặng nhất, 287 KB) | Chợ nổi miền Tây: hàng chục thuyền, sóng lăn tăn, lá dừa, chữ trên biển | **Cao** — vẽ nét trung thành sẽ ra hàng nghìn nét vụn, trẻ 5 tuổi không tô được |

Nên prompt phải bắt Gemini **đơn giản hoá**, không phải **đồ lại**. Đây là điểm dễ hỏng nhất
của pilot, và là lý do bộ chứng minh cố tình lấy cả tấm dễ nhất lẫn tấm khó nhất.

## Prompt dùng chung (tiếng Anh — Gemini bám sát hơn)

```
Generate an image: redraw the attached picture as a black-and-white colouring page for a
5-year-old child. Simple vector-style line art: thin, smooth, continuous black outlines of
even weight on a pure white background. Keep the main characters and only the few most
important objects; simplify or remove small background clutter, fine texture, patterns and
any text. Every shape must be a fully closed outline so a child can colour inside it.
Outlines only - no shading, no hatching, no grey, no colour, no fill, no watermark.
Large, clear, well-separated shapes.
```

Bắt buộc mở đầu bằng `Generate an image:` — luật cũ trong `AI-OPERATOR-GUIDE.md` mục 6.4.

## Cách chạy — hai chặng, không chạy thẳng 18

### Chặng 1 — chứng minh nhỏ, 3 job

Chọn 3 tấm trải hết dải khó dễ, **có chủ đích**:

| Job | Ảnh mẫu | Vì sao chọn |
|---|---|---|
| Q001 | `ref-18` | Dễ nhất — nếu tấm này cũng hỏng thì hỏng ở prompt, không phải ở độ rậm |
| Q002 | `ref-04` | Trung bình (bếp làm bánh quy, có chữ trên bảng đen) — kiểm luật "bỏ chữ" |
| Q003 | `ref-12` | Khó nhất — biết luôn giới hạn trên, trước khi đốt 18 lượt quota |

Tham số: chuỗi liên tục 3 job, timeout 90s, delay 25s. Cần Dev Mode BẬT.

**Chặng 1 đạt nghĩa là:** 3/3 SUCCESS, và mắt Đức xác nhận ảnh ra **dùng được để in cho trẻ tô**.
Sổ cái báo SUCCESS chỉ chứng minh không lỗi kỹ thuật — nó không chứng minh tranh tô được.

### Chặng 2 — 15 tấm còn lại

Chỉ chạy sau khi Đức gật chặng 1. Một chuỗi 15 job (trần 30), cách chặng 1 ≥300 giây.

## Tiêu chí đạt của cả pilot

1. 18/18 có file ảnh về đĩa, tên sạch `Q001…Q018`, `persistence_verified` true.
2. Mỗi job gắn ĐÚNG ảnh mẫu của nó — kiểm bằng `references_per_job` trong sổ cái **và** bằng
   mắt (tranh nét phải cùng bố cục với ảnh gốc tương ứng, không phải ảnh của job khác).
3. Đức xác nhận tranh in ra tô được.

Kết quả ghi vào `PILOT-07-KET-QUA.md` cùng thư mục.

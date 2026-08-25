# Batch Sản Xuất 01 — kiểm chứng chuỗi >10 job (AI tự vận hành, ủy quyền owner 25/08)

- Mục đích: mảnh cuối chưa kiểm chứng của pipeline — chuỗi dài liên tục (12 job) chạy một mạch.
- Cách chạy: AI đẩy 12 job qua `jobs.add` → `run.trial` MỘT chuỗi 12 job (trần 30, Dev Mode ON) →
  theo dõi `run.status` → đối chiếu 12 ảnh tải về.
- Chủ đề: "12 tấm poster du lịch tối giản" — đồng bộ phong cách để dễ thẩm định chất lượng.

## 12 prompt

| # | Prompt |
|---|---|
| 1 | Generate an image: a minimalist travel poster of Ha Long Bay, Vietnam — limestone karsts at dawn, flat design, teal and gold palette. |
| 2 | Generate an image: a minimalist travel poster of Kyoto, Japan — red torii gate and maple leaves, flat design. |
| 3 | Generate an image: a minimalist travel poster of Paris — Eiffel Tower at dusk, flat design, warm purple palette. |
| 4 | Generate an image: a minimalist travel poster of Santorini, Greece — white houses and blue domes, flat design. |
| 5 | Generate an image: a minimalist travel poster of the Sahara desert — camel caravan silhouettes at sunset, flat design. |
| 6 | Generate an image: a minimalist travel poster of New York City — skyline with yellow taxi, flat design. |
| 7 | Generate an image: a minimalist travel poster of the Swiss Alps — snow peaks and a red cable car, flat design. |
| 8 | Generate an image: a minimalist travel poster of Venice — gondola under a bridge at golden hour, flat design. |
| 9 | Generate an image: a minimalist travel poster of Bali — rice terraces and a temple gate, flat design, green palette. |
| 10 | Generate an image: a minimalist travel poster of Iceland — northern lights over a black-sand beach, flat design. |
| 11 | Generate an image: a minimalist travel poster of Cairo — pyramids and a felucca on the Nile, flat design. |
| 12 | Generate an image: a minimalist travel poster of Sydney — Opera House sails at sunrise, flat design. |

## Tiêu chí đạt

- ≥ 11/12 SUCCESS không can thiệp tay; mọi thất bại (nếu có) phải tự chẩn đoán được từ ledger/details.
- Ảnh về đĩa đúng tên (kiểm chứng luôn bản vá đặt-tên-download mới).
- Kết quả ghi vào `BATCH-SX-01-KET-QUA.md` cùng thư mục.

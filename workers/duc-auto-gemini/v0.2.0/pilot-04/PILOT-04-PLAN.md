# Pilot 04 — Vòng tự hành khép kín đầu tiên (chat-driven, zero-UI)

- Ngày: 2026-08-25 · Người điều khiển: Claude (AI) qua Agent Bridge · Owner: Đức (chỉ quan sát)
- Mục đích: chứng minh flow tự chạy trọn một vòng KHÔNG chạm giao diện extension:
  `jobs.add` (tạo phiên trong bộ nhớ + 6 job) → `run.trial` ×3 (mỗi trial 2 job, cách ≥5 phút
  theo trần đã chốt trong decisions.md) → camera trực qua `run.status` → đọc `ledger.read` → đúc kết.
- Không ảnh tham chiếu. Không workbook file — phiên sống trong bộ nhớ panel (điểm cần kiểm chứng).
- Ghi chú: file `Duc-Auto-ChatGPT-Pilot-04.xlsx` trong thư mục này là fixture của test suite
  (không thuộc pilot này — đừng xoá).

## 6 prompt

| # | Prompt |
|---|---|
| 1 | Create a minimalist poster of a red hot air balloon floating over a calm blue sea, flat design. |
| 2 | Create a simple line-art illustration of a bicycle, black lines on a white background. |
| 3 | Create a watercolor painting of a small wooden cabin in a pine forest, soft morning light. |
| 4 | Create a geometric low-poly illustration of a mountain range at sunset. |
| 5 | Create a cute cartoon robot watering a potted plant, pastel colors. |
| 6 | Create an isometric illustration of a tiny coffee shop interior, warm colors. |

## Điều kiện dừng

- Bất kỳ trial nào halt/fail → dừng chuỗi, chẩn đoán qua ledger + details.message, sửa, ghi nhận.
- Kết quả và kết luận ghi vào `PILOT-04-KET-LUAN.md` cùng thư mục.

---
kind: protocol
status: active
ttl_days: 365
---

# RULE-COMPILER — sổ tay thi hành

> **Vì sao có bộ này, và lý lẽ sau từng lựa chọn: [ADR-0027](../adr/0027-bo-bien-dich-luat.md).**
> Sổ này chỉ nói **làm gì**. Bộ đo: `node scripts/rule-compile.mjs`.

## 1. Hai tầng — nhớ đúng chiều

```
SỔ CÁI (docs/adr/**)  ──▶  append → merge → supersede → trim → compile  ──▶  BẢN HIỆU LỰC
chỉ thêm · B12 canh                                                   AGENTS.md + sổ tay · thứ AI nạp
```

**Luật mới vào sổ cái trước.** Viết thẳng vào bản hiệu lực là bỏ qua cả năm bước.
Nơi chứa luật khai ở `.repo-structure.json` → `luat.ra_soat`. **Khai thiếu một nơi = nơi đó vô
hình với bộ biên dịch.**

## 2. Thêm một luật — sáu bước

1. **Normalize** — một luật = **một câu**, kèm phạm vi, cứng hay mềm, và ADR làm căn cứ.
2. **Deduplicate** — chạy bộ đo, xem phép ③. Có câu cùng nghĩa rồi thì **sửa câu đó**.
3. **Subsume** — luật mới bao hàm luật cũ thì **chỉ giữ luật mới**. Máy không làm hộ bước này.
4. **Conflict** — đá với một bất biến cứng thì **DỪNG, hỏi Đức**. Thứ tự ưu tiên: bất biến cứng
   > luật theo phạm vi > thói quen làm việc > luật lịch sử.
5. **Trim** — lấy luật cũ ra. **Trim không phải xoá**: nó xuống mục `Vế đã chết` của ADR, kèm
   **tên quyết định đã thay nó**.
6. **Compile** — đặt câu mới vào đúng nhóm trong `AGENTS.md`, không nối vào cuối.

Năm cửa để một luật rời bản hiệu lực: **bị thay · trùng · hết phạm vi · đã thành phép kiểm máy ·
lỗi thời**. Cửa thứ tư hay bị quên nhất — luật nào cổng đã cưỡng chế thì đừng giữ thêm bản chữ.

## 3. Bốn phép đo

| Phép | Bắt gì | Mức |
|---|---|---|
| **① `TRICH_VE_CHET`** | nơi chứa luật trích một vế đã chết | **ĐỎ** (cổng chặn) |
| **② `QUYET_DINH_MO_COI`** | quyết định còn sống mà không nơi nào mang | vàng |
| **③ `LUAT_TRUNG`** | hai dòng luật cùng vân tay ở hai file | vàng |
| **④ `CHUA_RA_SOAT`** | quá `luat.tran_ngay_ra_soat` ngày | vàng |

Chỉ ① đỏ. Lý do ở [ADR-0027](../adr/0027-bo-bien-dich-luat.md) ⑶ — tóm tắt: một cổng đỏ vì mùi
là một cổng sẽ bị tắt. **Bộ đo không có cờ `--fix`**: AI đề xuất, Đức quyết, máy tố giác.

## 4. Lượt rà HẰNG TUẦN (`AGENTS.md` giới hạn ⑨)

1. `node scripts/rule-compile.mjs` — đọc **cả bốn** phép, không chỉ phép đỏ.
2. Chọn **một** nơi quá hạn ở phép ④. Đọc **hết** nó. Đối chiếu với sổ cái.
3. Xong thì đặt ngày hôm nay vào `luat.ra_soat` của nơi đó. **Chỉ đặt khi đã đọc hết** — đặt
   ngày cho xong là tự tắt máy canh, và không ai phát hiện được.
4. Mỗi nhóm ở phép ③ quyết một trong ba: **gộp** · **một bên trỏ sang bên kia** · **giữ cả hai
   và nói ra vì sao** ngay tại dòng đó.
5. Kho nhớ của chính phiên bạn cũng đi qua lượt này ([ADR-0027](../adr/0027-bo-bien-dich-luat.md)
   ⑸) — nó nằm ngoài repo nên **không có máy nào canh**.

## 5. Ba chỗ dễ vấp

- **Trích theo SỐ HIỆU ĐANG SỐNG, đừng trích theo tên file.** Một file chủ đề mang nhiều quyết
  định và số dẫn của nó có thể đã chết. Bản đồ số hiệu → file: `docs/README.md`.
- **Số hiệu có phạm vi.** `ADR-0001` ở gốc khác `ADR-0001` trong một gói.
- **Vế viết sau đuôi liên kết:** `[ADR-0005](…) ⑴`.

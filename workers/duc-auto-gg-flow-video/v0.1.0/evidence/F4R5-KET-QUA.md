# F4R5 — chuỗi 3 job, thử tái hiện F-18. 02/09 09:43

> Phiên `claude-f18-evidence`. Đức cho trial thoải mái. **3 video, đúng trần dev (≤3).**
> Ba prompt KHÁC NHAU (luật mới của Đức: mỗi trial một prompt mới).

## Giả thuyết đem đi thử — và nó SAI

**Giả thuyết:** trạng thái composer lai ở lượt F4R2 (prompt 145, đo ra 172) xuất hiện khi job
**thứ hai trở đi** gõ vào ô mà job trước vừa dùng. Lượt F4R2 và hai lượt sau đều chỉ có MỘT
job, nên chưa lần nào chạm điều kiện đó.

**Cách thử:** ba prompt độ dài khác hẳn nhau — 129 / 208 / 122 — để `composer_len_after_typing`
tự tố job nào lai, không lẫn vào đâu được.

**Kết quả: 3/3 SUCCESS, và không job nào lai.**

| Job | `typing_path` | `typing_ok` | `prompt_len` | `before` | `after` | `after − prompt_len` |
|---|---|---|---:|---:|---:|---:|
| Q001 | `input_events` | true | 129 | **28** | 129 | **0** |
| Q002 | `input_events` | true | 208 | **28** | 208 | **0** |
| Q003 | `input_events` | true | 122 | **28** | 122 | **0** |

Mỗi job đúng **1** video ứng viên, **0** retry, không lỗi:
`a2c72dd0…` · `71e270ee…` · `2ce90819…`

**Đọc kết quả:** job 2 và 3 gõ vào ô mà job trước vừa dùng, mà `before` vẫn **28** — ô đã sạch.
Vậy **chuỗi nhiều job KHÔNG phải cơ chế gây trạng thái lai.** Giả thuyết bị loại.

## Còn lại gì cho F-18

Tính cả lượt này, đã có **5 lượt gõ sạch liên tiếp** (F4R3 ×1, F4R4 ×1, F4R5 ×3), tất cả
`before=28`, `after=prompt_len` chằn chặn, `typing_path=input_events`. Chỉ lượt F4R2 lệch.

Cái đã loại được: tầng gõ (`input_events` chạy) · đường gọi · chuỗi nhiều job · "chữ không vào
được DOM".

**Giả thuyết còn lại, chưa kiểm được:** F4R2 chạy lúc 06:28, mà quanh 06:06 cùng ngày có đợt
reload/pair lại nhiều hồ sơ (xem `evidence/MP-01-live-routing-and-audit-20260902.md`). Hôm nay
tôi gặp đúng một ca họ hàng: sau khi Đức reload extension mà chưa F5 tab, content script thành
**mồ côi** và Bridge trả `receiver unavailable`. Một content script ở trạng thái nửa vời là ứng
viên hợp lý cho một composer nửa vời. **Chưa có bằng chứng** — ghi lại để đừng ai đi tìm lại
từ đầu, và **đừng sửa mù**.

Nay mọi lượt đều ghi `composer_len_before_typing`, nên lượt nào lai sẽ đọc thẳng ra ở dòng đầu
sổ cái. Đó là toàn bộ mục đích của bản vá `be17e75` + F-21.

## Cột mốc phụ

Đây là **chuỗi 3 job đầu tiên chạy trọn vẹn** của nhánh này, và là lần đầu sổ cái có đủ chẩn
đoán tiền-submit cho **từng** job trong chuỗi.

---
status: Accepted
adr: 0001
date: 2026-09-17
deciders: Đức
---

# ADR-0001 — Đức ký `Udin v1`: gói này chạy được việc thật, và nó khai đúng chỗ nó không làm được

## Bối cảnh

Gói `udin-optic` tách khỏi `duc-scouter` ngày 15/09 (`T21`). Chuỗi việc `U0`–`U5` đóng trọn
16/09, cả hai điểm dừng đã qua. Ngày 17/09 đóng nốt bốn mép và chạy sống trọn vòng.

**Nhưng "chạy được" không phải là một chữ ký.** Cho tới hôm nay gói vẫn khai `lifecycle: building`
và không có một câu nào nói *"đây là bản dùng được, và đây là thứ nó KHÔNG hứa."* Thiếu câu ấy
thì mỗi phiên sau lại phải tự đoán gói này đã xong tới đâu — và đoán thì mỗi phiên một kiểu.

Đức chốt 17/09: *"Ok R3, sau đó làm nốt Udin v1."*

## Quyết định

**`Udin v1` được ký.** Nó nói đúng ba điều, không hơn.

### ⑴ Nó làm được gì — và mỗi dòng có một lượt chạy thật đứng sau

| việc | bằng chứng |
|---|---|
| Sinh ảnh từ một câu, ảnh về đĩa dạng `.jpg` | E2E chạy thật từ 15/09, lặp lại nhiều lượt |
| **Sinh ảnh CÓ ẢNH THAM CHIẾU `@1` / `@2`** — cả ảnh Udin tự sinh lẫn **ảnh từ ngoài thả vào** | [lượt chạy 17/09](../../evidence/2026-09-17-vong-tham-chieu-tron-ven.md) |
| Đọc lại câu Udin trả lời, và từ chối nếu chữ y hệt lượt trước | `W4`, trong vòng từ 17/09 |
| Vượt màn chắn `User Limit Reached` | `W1`, bấm lại tới 12 lượt |
| Chọn chế độ · thêm khung · đổi `.webp` sang `.jpg` | `W5` `W6`, ĐẠT 16/09 |

**Vòng chính chạy bảy chặng bằng MỘT lệnh:** `W1 → NGUỒN → CHỌN → W2 → W3 → JPG → W4`.

### ⑵ Nó KHÔNG hứa gì — và đây là nửa quan trọng hơn

- **Không tự chạy.** Không hàng đợi job, không lịch. Mọi lượt do người hoặc AI gõ lệnh.
- **Một trang.** Manifest khai đúng trang Udin. Trang khác là việc của `duc-scouter`.
- **Không dò trang lạ.** `scout.page` · `scout.tree` · `scout.a11y` · `scout.shot` ·
  `scout.network` **KHÔNG TỒN TẠI** ở gói này (ADR-0021 ⑵ *"cắt chứ không tắt"*) — chúng trả
  `METHOD_NOT_FOUND`, không phải "bị chặn".
- **Không tự nạp lại chính nó.** `scout.reload` cắt ở `T21`; nợ `S-31` bên Scouter giữ chỗ đó,
  và đường mặc định là **gộp nhiều lượt sửa thành một lượt nạp lại**, không phải mở thêm method.
- **Không gọi mạng tuỳ ý.** `scout.fetch` bị cắt.
- **Không nói gì về `T7`.** Vòng tự cải tiến vẫn ở mức `PARTIAL`; nó là việc của Scouter và phụ
  thuộc `R2`. Chữ ký này **không** nâng mức ấy.

### ⑶ Cái phanh giữ nguyên, không nới một chốt nào cho lượt ký

Công tắc ghi vẫn **mặc định TẮT**, vẫn cần tay người bật, vẫn trần **200 lượt** mỗi lần bật, vẫn
có `Ctrl + Shift + U` tắt khẩn. Ký một phiên bản **không** phải lúc để đổi các con số ấy.

## Vì sao ký bây giờ, không sớm hơn và không muộn hơn

Điều kiện *"gói này dùng được"* đã đủ từ 16/09 theo bảng năng lực. Thứ còn thiếu tới hôm nay là
**ca khó nhất**: đưa một ảnh từ máy Đức vào rồi xin Udin vẽ theo. Ca ấy gãy suốt sáng 17/09 vì
danh tính ảnh học bằng `src` bị cắt, và chỉ đóng sau
[ADR-0009](../../../duc-scouter/v0.1.0/docs/adr/0009-doc-duoc-data-image-id.md).

Ký sớm hơn thì chữ ký bao gồm một ca đang hỏng. Muộn hơn thì mỗi phiên lại tự đoán một kiểu.

## Giá phải trả, nói trước

- **Một chữ ký làm người ta ngừng đọc.** `Scouter v1` ký 16/09 rồi ngay hôm sau bề mặt ghi
  **bớt** một method và bề mặt đọc **thêm** một thuộc tính. `v1` nghĩa là *hứa đúng thứ nó làm
  hôm nay*, không nghĩa là *đóng băng*. Đổi tiếp thì ghi ADR tiếp.
- **`lifecycle: active` kéo theo `last_verified`**, và trường ấy **hết hạn theo thời gian**. Gói
  này từ nay phải có một lượt chạy thật định kỳ, nếu không bảng tổng sẽ báo tài liệu quá hạn —
  đúng ý, đó là cái giá của việc khai mình đang chạy.
- **Chữ ký này không làm `S-31` biến mất.** Mỗi lượt sửa mã extension vẫn cần Đức bấm một lần.

## Hệ quả

- `STATUS.md`: `lifecycle: building → active`, kèm `last_verified: 2026-09-17` và trang bằng chứng.
- Thẻ **Hướng dẫn** trong bảng bên: danh sách việc + cách bắt đầu + **giới hạn**, có phép ghim
  `tests/huong-dan-smoke.mjs` đối chiếu với các lệnh CHẠY ĐƯỢC thật — thêm lệnh mà quên viết vào
  hướng dẫn thì bộ đo đỏ.
- Chuỗi `CHUOI-VIEC.md` của gói đóng trọn; việc tiếp theo của repo là `R2` bên Scouter.

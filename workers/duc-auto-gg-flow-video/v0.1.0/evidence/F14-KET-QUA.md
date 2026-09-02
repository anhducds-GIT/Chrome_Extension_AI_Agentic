# F-14 giải xong bằng 0 credit — và nó trả lời luôn F-24. 02/09

> Lệnh `diagnostics.mode_probe` chạy trên hồ sơ `Bình`, giao diện tiếng Việt.
> **0 credit.** Bằng chứng: `evidence/F14-mode-probe-vi-20260902.json`.

## Câu trả lời chính

**`opened: true` — bảng cấu hình MỞ RA.**

Nhóm nút cấu hình của Flow **có** nghe sự kiện pointer tổng hợp. Giả thuyết 1 của F-14 đúng;
giả thuyết 2 (đòi `isTrusted`) sai. `pressFlowControl` — bắn `pointerdown` → `mousedown` →
`pointerup` → `mouseup` → `click` — làm được việc mà `element.click()` trần không làm được.

Trang được trả về nguyên trạng: `panel_closed_again: true`, mode trước và sau đều
`Video · 360p · 8s crop_16_9 x1`.

**Hệ quả:** kết luận cũ *"`element.click()` không tác dụng nên chuyển mode phải do người làm"*
**đã hết hạn**. Đường tự động không bị chặn ở tầng sự kiện.

⚠️ **Nhưng chưa chứng minh trọn vẹn.** Phép đo này chứng minh **mở được bảng**. Nó **chưa**
chứng minh rằng bấm tuỳ chọn `videocam Video` sẽ thật sự đổi mode — đó là một cú bấm khác, và
lệnh này **cố ý không bấm** (bấm là đổi cấu hình của Đức sau lưng). Nửa còn lại kiểm bằng cách
rẻ nhất: Đức đặt chip về Image rồi chạy **một** job; nếu mode tự chuyển thì xong.

## Và nó giải luôn F-24 — theo hướng ngược với dự đoán của tôi

Tôi ghi F-24 rằng `findVideoModeOption` so khớp cứng `"videocam Video"` nên **gần chắc** hỏng
trên giao diện tiếng Việt. **Sai.** Đo thật:

| Nhãn | Tiếng Việt |
|---|---|
| `videocam Video` | **giữ nguyên** — "Video" trong tiếng Việt cũng là "Video" |
| `image Hình ảnh` | **bị dịch** (Image → Hình ảnh) |
| `crop_free Khung hình` | bị dịch |
| `chrome_extension Thành phần` | bị dịch |
| `360p` `720p` `4s` `6s` `8s` `10s` `x1`…`x4` `16:9` `9:16` | giữ nguyên |

`video_option_found_by_english_label: true` — hàm chạy đúng trên tiếng Việt, **do may mắn về
từ vựng chứ không phải do thiết kế**. Nhãn **Image** thì bị dịch thật, nên rủi ro locale chuyển
sang chỗ khác: `IMAGE_MODE_SUMMARY_LABEL` và mọi chỗ nhận diện mode Ảnh (**F-11**).

**Bài học:** tôi đã suy đoán "nhãn nút bị dịch nên hàm này chắc hỏng" từ **một** ca đã đo
(`arrow_forward Tạo`) và tổng quát hoá sang ca chưa đo. Một quả mìn suy ra bằng loại suy vẫn
cần một phép đo trước khi được coi là mìn — và cũng cần một phép đo trước khi được coi là an toàn.

## Phát hiện kèm theo, chưa ai biết: bảng cấu hình LIỆT KÊ ĐƯỢC

17 nhãn xuất hiện gồm **toàn bộ** các nút cấu hình rời: độ phân giải (`360p` `720p`), thời lượng
(`4s` `6s` `8s` `10s`), tỉ lệ (`16:9` `9:16`), và **số lượng output (`x1` `x2` `x3` `x4`)`.

Nghĩa là ba việc đang treo nay có đường đi rẻ hơn hẳn:

- **F-15** hiện *từ chối* khi chip không phải `x1`. Với bảng này, runner có thể **tự đặt về `x1`**
  thay vì bắt Đức sửa tay. (Vẫn nên giữ cổng từ chối làm lớp cuối.)
- **F-22** cần biết độ phân giải để suy trần chuỗi. Nay đọc được `360p`/`720p` trực tiếp.
- Thời lượng `8s` vs `10s` — thứ quyết định 6 hay 7 credit mỗi video — cũng đọc được.

**Chưa làm gì với phát hiện này.** Mỗi cú bấm vào các nút đó là **đổi cấu hình của Đức**, nên
đó là việc cần Đức chốt chứ không phải việc AI tự tiện.

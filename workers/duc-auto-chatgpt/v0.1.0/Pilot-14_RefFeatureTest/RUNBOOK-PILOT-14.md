# Pilot-14 · Kiểm tính năng "ảnh tham chiếu" — Runbook cho Đức

> Pilot **nhỏ, chỉ để kiểm tính năng**. Không dùng việc thật của Đức.
> 3 job, tốn **3 lượt quota** (xấu nhất 1 lượt — xem "Dừng ở đâu").
> Đức chốt 2026-08-26: không chạy Pilot-08, tự tạo pilot nhỏ kiểm thử.
> Chuẩn bị bởi phiên `claude-chatgpt-3`.

## Đo cái gì

`attachmentPreview` và `uploadPending` là **nhóm selector duy nhất chưa từng đo được**
trên trang thật — vì chưa có run nào dùng ảnh tham chiếu. Đường lỗi `ATTACHMENT_FAILED`
cũng chưa từng nổ. Đó đúng là loại lỗi đã đốt 6 lượt quota ngày 25/08: bộ dò mù mà
không ai hay.

## Vì sao pilot này chứng minh được, không phải đoán

Ảnh tham chiếu do chính phiên này tạo ra, mỗi ảnh **một hình + một màu + chữ nhãn**:

| File | Nội dung |
|---|---|
| `REF-A-RED-CIRCLE.png` | hình tròn ĐỎ |
| `REF-B-BLUE-TRIANGLE.png` | tam giác XANH DƯƠNG |
| `REF-C-GREEN-SQUARE.jpg` | hình vuông XANH LÁ (**định dạng jpg**) |
| `REF-D-YELLOW-STAR.png` | ngôi sao VÀNG |

Prompt yêu cầu ChatGPT vẽ lại **đúng hình, đúng màu** của ảnh được gắn kèm.

Nên kết quả tự tố cáo: ảnh ra đúng hình đúng màu → ảnh tham chiếu **thật sự đã tới**.
Ảnh ra một thứ vô can, hoặc ChatGPT nói "không thấy ảnh nào" → **chưa tới**.
Không phải suy diễn.

## 3 job, và mỗi job đo thêm gì

| Job | Số ảnh | Đo thêm |
|---|---|---|
| `FT-01-ONE-REF` | 1 | đường gắn ảnh đơn giản nhất |
| `FT-02-TWO-REFS-MIXED` | 2 | nhiều ảnh **và** trộn png + jpg |
| `FT-03-FOUR-REFS` | 4 | nhiều ảnh một lượt |

## Cấu hình

`timeout 300s`, `delay 12–24s`, `cooldown 6–9s`, `max_input_images 5`,
`collision uniquify`.

Hai chốt an toàn cho lần đo đầu:
- `max_retries = 0` — có lỗi cũng không âm thầm nghiền quota.
- `continue_on_error = false` — job đầu đỏ là dừng cả batch.

Ảnh ra: `Downloads\Duc Auto ChatGPT\Pilot-14-RefFeatureTest\`

## Việc của Đức — 4 bước

1. Mở Side Panel **Duc Auto ChatGPT**. Tab ChatGPT để nguyên như đang có
   (đang ở trang chat mới — **đúng ý**, xem mục dưới).
2. **Workbook** → chọn:
   `Pilot-14_RefFeatureTest\Pilot14.REF-FEATURE-TEST.xlsx`
3. **References** → chọn **cả 4 file** trong `Pilot-14_RefFeatureTest\references\`
4. Bấm **Check Plan**, rồi **nhắn Claude**. **Chưa bấm Run.**

Phải thấy: **3 job**, **4 ảnh tham chiếu**, tối đa **4 ảnh/job**, ảnh ra trỏ
`Duc Auto ChatGPT/Pilot-14-RefFeatureTest`. Đỏ thì dừng, gọi Claude.

Vì sao chưa bấm Run: Claude phải bật bộ theo dõi **trước**. Cửa sổ upload ảnh của
job đầu chỉ vài giây, và đó là phép đo chính của pilot. Chờ nhắn xong mới bật là hụt.

## Chạy từ trang chat mới — có chủ đích

Tab đang ở `chatgpt.com/` (chat mới), không phải hội thoại cũ. Giữ vậy: nó kiểm thêm
đường "bắt đầu từ chat mới rồi tự nhận hội thoại do chính run tạo ra" —
đã đọc trong code (`sidepanel.js` `activeTab()`) nhưng chưa chạy thật.

Hai kiểu lỗi **phân biệt được bằng mã** nên không sợ lẫn: hội thoại chết →
`RECEIVER_LOST`; ảnh tham chiếu chết → `ATTACHMENT_FAILED` /
`INPUT_IMAGE_FALSE_POSITIVE`.

Thêm nữa, chat mới chỉ có 4 ảnh giao diện và 0 lượt trả lời, nên quy ảnh về job
**dễ hơn** hội thoại 21 ảnh.

## Claude đo gì trong lúc chạy

- **Ngay sau khi bấm Run:** dò DOM dày để bắt cửa sổ upload —
  `attachmentPreview`, `uploadPending`, `attachmentContainer`, `fileInput`.
- **Xuyên suốt:** `run.status` lấy phase và **thời gian thật mỗi job** (trả lời câu
  treo Q-02 — trước giờ chưa ai biết ChatGPT sinh ảnh mất bao lâu).
- **Sau khi xong:** mở từng ảnh tải về **xem bằng mắt** có đúng hình đúng màu không;
  ảnh có nằm đúng thư mục không; ledger có khai đúng `write_outcome` /
  `landed_as_requested` không.

## Dừng ở đâu

- Check Plan đỏ → dừng, không bấm Run.
- Job đầu đỏ → cả batch dừng (`continue_on_error = false`), nên xấu nhất **tốn 1 lượt**.
- Cần cứu giữa lúc chạy → Claude có `run.stop` và `chat.reload` qua Bridge, không cần
  tay Đức. Lưu ý: `run.stop` **không thu hồi được** prompt đã gửi, nó chỉ cứu job sau.

## Ảnh tham chiếu có bị nhận nhầm thành ảnh sinh không

Không — và đã tra ra ba tín hiệu độc lập chặn việc đó (`content.js:237`):
ảnh nằm trong lượt của người dùng, ảnh nằm trong `attachmentContainer`, và khớp theo
tên file. Tín hiệu thứ hai dựa vào `form` trần nên **miễn nhiễm** khi ChatGPT đổi tên
`data-testid`. Nếu vẫn lọt thì nó nổ thành `INPUT_IMAGE_FALSE_POSITIVE` — có tên, không
âm thầm.

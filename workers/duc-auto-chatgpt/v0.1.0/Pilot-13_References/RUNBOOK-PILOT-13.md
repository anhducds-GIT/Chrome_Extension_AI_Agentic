# Pilot-13 · Ảnh tham chiếu — Runbook cho Đức

> Pilot thật đầu tiên **có ảnh tham chiếu**. 3 job, lấy nguyên văn từ Pilot-08 (66 job)
> mà Đức đã chuẩn bị nhưng chưa từng chạy live. Tốn **3 lượt quota**.
> Chuẩn bị bởi phiên `claude-chatgpt-3`, 2026-08-26.

## Vì sao pilot này, không phải pilot khác

`attachmentPreview` và `uploadPending` là **nhóm selector duy nhất chưa từng đo được** trên
trang thật — vì chưa có run nào dùng ảnh tham chiếu. Đường lỗi `ATTACHMENT_FAILED` cũng
chưa từng nổ. Đó đúng là loại lỗi đã đốt 6 lượt quota ngày 25/08: bộ dò mù mà không ai biết.

Pilot-08 thật có 66 job. Chạy thẳng 66 job là đặt 66 lượt quota lên một nhóm selector
chưa ai đo. Pilot này lấy **3 job thật** ra đo trước.

## 3 job được chọn, và vì sao

| Job | Số ảnh ref | Độ dài prompt | Đại diện cho |
|---|---|---|---|
| `P08-S01-C01-MEO-FRONT` | 2 | 1.949 | 4/66 job concept |
| `P08-S01-C05-DUO-FRONT` | 4 | 2.479 | job 4 ảnh, prompt ngắn |
| `P08-S01-I001-S1-01A-F01` | 4 | 3.825 | **60/66 job thật** — dạng phổ biến nhất |

Prompt là **nguyên văn** từ `Pilot08-S01-R03.IMAGE-QUEUE.xlsx`, không sửa một chữ.
Ảnh tham chiếu trong `references/` là **bản copy hash-trùng-khớp** của
`Pilot-08/20260823-p08-s01-r01/references/`.

## Cấu hình: đúng cấu hình thật của Đức, trừ một chỗ

Đọc từ sheet `config` của Pilot-08 và giữ nguyên: `timeout 900s`, `delay 18–32s`,
`cooldown 8–12s`, `continue_on_error = false`, `max_input_images 5`, `collision uniquify`.

**Một chỗ đổi:** `max_retries` `2` → **`0`**. Lần đo đầu không được âm thầm nghiền quota
khi có lỗi. Sau khi pilot xanh thì trả lại 2.

Ảnh ra: `Downloads\Duc Auto ChatGPT\Pilot-13-References\` — thư mục riêng, không trộn
vào output thật của Pilot-08.

## Việc của Đức — 5 bước

1. Mở Side Panel của **Duc Auto ChatGPT**, và mở sẵn **một tab ChatGPT** ở hội thoại
   Đức muốn dùng. (Run sẽ khoá đúng tab + đúng hội thoại đó; đổi tab giữa chừng là nó
   dừng chứ không gõ nhầm chỗ.)
2. **Workbook** → chọn:
   `Pilot-13_References\Pilot13-S01.REFERENCE-PILOT.xlsx`
3. **References** → chọn **cả 4 file** trong:
   `Pilot-13_References\references\`
4. Bấm **Check Plan**. Phải thấy: **3 job**, **4 ảnh tham chiếu**, tối đa **4 ảnh/job**,
   và ảnh ra trỏ về `Duc Auto ChatGPT/Pilot-13-References`.
   **Nếu Check Plan đỏ — dừng, gọi Claude. Đừng bấm Run.**
5. Bấm **Run**. Rồi nhắn Claude một câu "đã bấm Run".

Đức không phải làm gì thêm. Claude đo trong lúc chạy qua Bridge.

## Claude đo gì trong lúc chạy

- **Ngay sau khi bấm Run:** dò DOM liên tục để bắt cửa sổ upload —
  `attachmentPreview`, `uploadPending`, `fileInput`. Đây là phép đo chính của pilot.
  Cửa sổ này ngắn, nên phải dò dày.
- **Xuyên suốt:** `run.status` để lấy phase, và thời gian thật mỗi job mất bao lâu
  (trả lời câu treo Q-02 — trước giờ chưa ai biết ChatGPT sinh ảnh mất bao lâu).
- **Sau khi xong:** ảnh có nằm đúng `Pilot-13-References` không, và ledger có khai đúng
  `write_outcome` / `landed_as_requested` không.

## Nếu có sự cố

Claude có `run.stop` (dừng ở ranh giới an toàn) và `chat.reload` (F5 tab) qua Bridge,
không cần tay Đức. Lưu ý: `run.stop` **không thu hồi được** prompt đã gửi — nó chỉ
cứu các job sau.

## Sau pilot

Xanh 3/3 → trả `max_retries` về 2 và chạy Pilot-08 thật 66 job.
Đỏ → sửa, rồi chạy lại pilot 3 job này, **không** chạy 66 job.

# Pilot-14 · Kết quả — 3/3 SUCCESS

> Chạy 2026-08-26, `trial-9b1d444a-9167-44af-9e0c-b40a03d3c42a`,
> run_id `20260826-1411-bridge-2026-08-26t14-11`, checkpoint v12.
> Phiên `claude-chatgpt-3`. Tốn 3 lượt quota.

## Điều lớn nhất: AI tự làm trọn vòng, ảnh tham chiếu và tất cả

Sau khi Đức reload extension, **không có cú click nào của người**. Toàn bộ do Bridge:

```
jobs.add (3 prompt) → references.add (4 ảnh) → jobs.update (gắn ảnh)
→ output.configure → run_settings.configure → run.trial → run.status
```

Trước phiên này việc đó **bất khả thi** trên worker GPT. Bằng chứng live, cùng ngày:
`jobs.add` trả về `MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'`.
`references.add` (port từ worker Gemini) là cánh cửa còn thiếu.

## Ảnh tham chiếu có thật sự tới ChatGPT không — có, và tự chứng minh

Mỗi ảnh tham chiếu là một hình + một màu + chữ nhãn. Prompt bắt vẽ lại đúng hình đúng màu.
Nên kết quả không phải chuyện suy diễn:

| Job | Ảnh vào | Ảnh ra | Khớp? |
|---|---|---|---|
| Q001 | tròn đỏ | tròn đỏ, nền trắng, không chữ | ĐÚNG |
| Q002 | tam giác xanh + vuông xanh lá (**.jpg**) | tam giác xanh **bên trái**, vuông xanh lá **bên phải** | ĐÚNG, kể cả thứ tự |
| Q003 | cả 4 | 2×2: tròn đỏ, tam giác xanh, vuông xanh lá, sao vàng | ĐÚNG cả 4 |

Q002 chứng minh thêm hai điều: **thứ tự ảnh được giữ** (ảnh 1 sang trái, ảnh 2 sang phải),
và **đường .jpg chạy** (vuông xanh lá đến từ file jpg).

Số byte `references.add` khai trùng khớp **từng byte** với file trên đĩa
(13420 / 11497 / 28064 / 14669) — vòng base64 không làm hỏng dữ liệu.

## Nhóm selector chưa từng đo được: nay đã đo

**`attachmentPreview` CÒN SỐNG — nhưng chỉ 1 trong 5 mục bắt được.**

| Mục | Kết quả |
|---|---|
| `button[aria-label*="Remove file"]` | **BẮT ĐƯỢC** — `=> 2` ở Q002, `=> 4` ở Q003 |
| `[data-testid*="attachment"]` | không bao giờ khớp |
| `[data-testid*="file-upload"]` | không bao giờ khớp |
| `[data-testid*="upload-preview"]` | không bao giờ khớp |
| `button[aria-label*="Remove attachment"]` | không bao giờ khớp |

Số khớp **đúng bằng số ảnh của job** — tín hiệu chính xác, không phải khớp bừa.
Nhưng cả nhóm đang đứng trên **một** mục, và mục đó dựa vào `aria-label` tiếng Anh.
ChatGPT đổi nhãn là nhóm này mù. Đã ghi backlog.

**`uploadPending` KHÔNG bắt được lần nào** — cả 3 mục, qua 52 lần dò có ảnh đính kèm hiện
trên trang. Chưa chứng minh được. Có thể ChatGPT không dùng dấu hiệu nào trong nhóm đó.
**Vẫn là mảng chưa đo**, không được coi là đã xong.

**`ATTACHING_REFS`** — runtime stage lần đầu quan sát được (Q002, Q003).

## Trả lời câu treo Q-02: ChatGPT sinh ảnh mất bao lâu

| Job | Số ảnh ref | Gửi → phát hiện |
|---|---|---|
| Q001 | 1 | **40 giây** |
| Q002 | 2 | **61 giây** |
| Q003 | 4 | **68 giây** |

**Càng nhiều ảnh tham chiếu càng lâu.**

**Và đây là cảnh báo quan trọng cho lần chạy 66 job:** `run.trial` chặn cứng **90 giây/job**.
Job 4 ảnh với prompt *ngắn* đã mất 68 giây — chỉ còn dư 22 giây. Job thật của Pilot-08 là
4 ảnh **kèm prompt 3.825 ký tự**. Rất có thể vượt 90 giây.

→ **Đừng chạy việc thật qua `run.trial`.** Đường đó là đường dev. Việc thật phải do Đức bấm
Run với `timeout 900` như cấu hình gốc của Pilot-08. Nếu job nào chết ở mốc ~90 giây qua
`run.trial` thì đó là **giới hạn đường trial**, không phải lỗi tính năng ảnh.

## Ledger có nói thật không — có

- `write_outcome=written` cả 3 job (bản vá B-13b giữ được; trước B-13b luôn khai sai `uniquified`).
- `landed_as_requested=true` cả 3 (nằm trong trường `message`).
- `persistence_verified=true` cả 3.
- Ảnh vào **đúng** `Downloads\Duc Auto ChatGPT\Pilot-14-RefFeatureTest\`.
- **Audit không rò dữ liệu ảnh:** cả file 81KB không chứa `data:image` cũng không chứa `base64`.
  Chỉ có tên và số byte. Đây là điều kiện bắt buộc vì file audit được commit làm bằng chứng.

## Đường "bắt đầu từ chat mới" cũng đã chạy thật

Run bắt đầu ở `chatgpt.com/` (chat mới, `assistantCount: 0`), rồi tự nhận hội thoại do chính
prompt đầu tiên tạo ra, và giữ nguyên hội thoại đó cho cả 3 job. Nhánh này đọc được trong
`activeTab()` nhưng trước nay chưa từng chạy live.

## Chỗ tôi hụt, nói thẳng

**Cửa sổ upload của Q001 không đo được.** Bộ theo dõi bản đầu của tôi có lỗi logic: nó đếm
`IDLE` lúc run chưa kịp khởi động rồi tự thoát, nên khoảng 14:12:30–14:12:54 bị trống — đúng
lúc Q001 gắn ảnh. Đã sửa (chỉ tin `IDLE` **sau khi** đã thấy trạng thái chạy) và bắt được đủ
ở Q002 với Q003.

Q001 vẫn có bằng chứng gián tiếp: ảnh ra là hình tròn đỏ, tức ảnh tham chiếu đã tới.
Nhưng **số khớp selector lúc gắn ảnh thì không có** cho job đó.

## Bằng chứng kèm theo

- `evidence/watch-run-20260826-1411.jsonl` — 976 lần dò, mốc nền + toàn bộ vòng chạy
- `evidence/dom-probe-baseline-before-run.json` — mốc nền trước run
- Ảnh ra + checkpoint v01→v12 + audit: `Downloads\Duc Auto ChatGPT\Pilot-14-RefFeatureTest\`

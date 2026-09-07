# Bằng chứng: nghiệm thu lớp nối nhiều hồ sơ Chrome — 07/09/2026 (CHỈ ĐỌC, không tốn credit)

Phiên `claude-gemini-nghiem-thu`. Sổ nguyên văn: `bridge-sessions-transcript.txt` (10 mục).

**Không một lệnh nào gõ lên trang. Không job nào được mở. Không tốn một credit nào.**
Mọi lệnh dùng đều mang `read_only: true` trong registry, trừ chỗ đã nói rõ ở mục 4 dưới.

## 1. Chạy lúc nào, chạy cái gì

| | |
|---|---|
| Ngày | 2026-09-07, khoảng 01:53 → 02:04 UTC (09:03 giờ máy) |
| Máy chủ Bridge | `duc-auto-gemini`, cổng 32148, loopback — **đang chạy** |
| Số hồ sơ Chrome đang nối | **2** |
| Lệnh đã dùng | `bridge.sessions` · `system.capabilities` · `run.status` · `queue.list` · `ledger.read` · `diagnostics.dom_probe` |
| Credit tiêu | **0** |

## 2. Bốn bảo đảm của lớp nhiều hồ sơ — ĐẠT cả bốn

| Bảo đảm | Đo bằng | Kết quả |
|---|---|---|
| ⑴ Kể đúng danh sách hồ sơ đang nối, kèm tên Đức đặt | mục `[1]` | **ĐẠT** — 2 hồ sơ: `anhducds`, `kaito`. Cả hai `legacy: false`, `worker: duc-auto-gemini`, `extension_version: 0.2.0` |
| ⑵ Quên nêu đích thì **TỪ CHỐI**, không bao giờ tự chọn | mục `[2]` | **ĐẠT** — `TARGET_AMBIGUOUS`, `retryable: false`, kèm đủ danh sách 2 ứng viên |
| ⑶ Nêu đích không tồn tại thì TỪ CHỐI, không rơi về hồ sơ khác | mục `[3]` | **ĐẠT** — `TARGET_NOT_CONNECTED`, in cả `target` đã hỏi lẫn danh sách thật |
| ⑷ Mọi phản hồi mang dấu `served_by` đúng hồ sơ đã gọi | mục `[4]`…`[9]` | **ĐẠT** — `served_by` khớp `instance_id` + `label` ở **mọi** lượt. Không một lượt nào lệch đích |

Trích nguyên văn bảo đảm ⑴ và ⑵ — hai dòng quan trọng nhất:

```
      "sessions": [
        { "instance_id": "c36620cc-a7bf-4764-b7a4-3dbe76718f95", "label": "anhducds",
          "legacy": false, "worker": "duc-auto-gemini", "extension_version": "0.2.0" },
        { "instance_id": "ff71d827-108e-41dc-bdf7-f262551285a9", "label": "kaito",
          "legacy": false, "worker": "duc-auto-gemini", "extension_version": "0.2.0" }
      ],
      "count": 2
```

```
    "code": "TARGET_AMBIGUOUS",
    "message": "More than one extension session is connected; name exactly one target.",
    "retryable": false,
```

## 3. Phát hiện quan trọng nhất: `legacy: false` KHÔNG có nghĩa "đang chạy code mới nhất"

Cả hai hồ sơ báo `legacy: false`. Nhưng đếm số method thì chúng chạy **hai bản code khác nhau**
(mục `[7]`):

| Hồ sơ | Số method | Thiếu gì |
|---|---|---|
| `kaito` | **23** | — bản HEAD, đầy đủ |
| `anhducds` | **19** | thiếu `chat.read` · `output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw` |

Bốn method đó là bốn method thêm ngày 06/09. Đã đối chiếu với mã nguồn: cả bốn có mặt trong
`bridge-core.js` ở HEAD (dòng 576–592). Nên `anhducds` **còn ôm bản extension cũ trong RAM**.

Đây **không phải bug của cờ `legacy`** — cờ đó chỉ nói hồ sơ có bắt tay theo giao thức
nhiều-hồ-sơ hay không, và `anhducds` có (nó báo được tên). Nhưng bài học vận hành thì thật, và
nó suýt làm tôi chạy lượt live vào hồ sơ sai:

> **Muốn biết một hồ sơ có đang chạy code mới hay không thì ĐẾM METHOD, đừng đọc cờ `legacy`.**

## 4. Phép đo suýt thành một báo cáo sai — ghi lại để phiên sau đỡ mất công

Giữa buổi, `run.status --target kaito` **timeout 5 trong 6 lượt** liên tiếp, trong khi
`ledger.read` cùng hồ sơ trả lời 6/6. Cùng `context: executor`, cùng `deadline_ms: 10000`,
cùng đường dispatch. Kết luận suy ra rất gọn: *"`run.status` hỏng riêng"* — mà `run.status`
chính là camera trực dùng để canh lúc bấm dừng, nên nếu đúng thì nó chặn cả `G-01`.

**Nó sai.** Phép đo quyết định (mục `[10]`) là **xen kẽ ba method và in giờ từng lượt**:

```
09:03:49 run.status  REQUEST_TIMEOUT
09:03:59 queue.list  REQUEST_TIMEOUT
09:04:09 ledger.read REQUEST_TIMEOUT
09:04:20 run.status  WORKBOOK_NOT_LOADED
09:04:22 queue.list  WORKBOOK_NOT_LOADED
...  (15 lượt sau đều trả lời trong 4 giây)
```

Lỗi đóng theo **THỜI GIAN**, không theo **METHOD**: ba lượt đầu timeout — mỗi method đúng một
lượt — rồi 15 lượt sau trả lời tức thì. Đo lại lần hai ra y hệt.

**Sự thật là:** 1–3 lượt gọi đầu sau một khoảng nghỉ **tiêu trọn 10 giây deadline mỗi lượt** để
đánh thức service worker; xong rồi thì mọi method trả lời dưới 1 giây. Không method nào hỏng.

Hệ quả cho `G-01`: **không chặn.** Vòng poll `run.status` mỗi 10 giây trong lúc chạy tự giữ
kênh ấm, nên lúc cần canh để bấm dừng thì nó tin được.

Cách đọc chung, đắt hơn cả con số: *cùng một triệu chứng, hai nguyên nhân khác hẳn nhau.*
Gọi liên tiếp **một** method thì hai nguyên nhân đó nhìn giống hệt. Chỉ xen kẽ mới tách được.

## 5. Vì sao lượt live của `G-01` KHÔNG chạy được trong phiên này

Side panel là executor duy nhất, và nó phải khoá được một tab hội thoại Gemini lúc bắt đầu run.
Đo được:

| Hồ sơ | Side panel | Code | Tab hội thoại Gemini |
|---|---|---|---|
| `anhducds` | **ĐÓNG** (`EXECUTOR_UNAVAILABLE`, mục `[4]`) | **cũ** (19 method) | — |
| `kaito` | **MỞ** (`WORKBOOK_NOT_LOADED`, mục `[6]` — panel trả lời được thì panel đang mở) | mới (23 method) | **KHÔNG có** |

Bằng chứng cho ô cuối, mục `[9]` — `diagnostics.dom_probe` là lệnh chỉ-đọc, không bấm không gõ:

```
    "code": "INTERNAL_ERROR",
    "details": {
      "message": "Open a normal Gemini conversation in the active tab."
    }
```

Nên **không hồ sơ nào hội đủ điều kiện**: `anhducds` panel đóng và code cũ; `kaito` code mới và
panel mở nhưng không có tab hội thoại Gemini đang hoạt động để `bindRunTab()` khoá vào.

Giao thức **cố ý không có** lệnh mở tab hay điều hướng (`AGENTS.md` mục 7: Bridge là ingress +
observability, không phải remote execution). Thêm một lệnh như thế là thêm năng lực mới → phải
hỏi Đức. Nên đây là **việc Đức bấm**, không phải việc AI sửa. Đã dừng, không thử vòng vo, và
**không mở lượt live nào** — đúng luật trần cứng của phiên.

Còn một điều kiện nữa chưa kiểm được từ xa: **công tắc "Chế độ phát triển"**. Lệnh duy nhất
soi được nó là `run.trial`, mà `run.trial` chính là lệnh tiêu tiền — không dùng nó làm phép thử.

## 6. Đức cần bấm gì để phiên sau đóng được `G-01`

Trên **một** hồ sơ Chrome, đủ cả bốn:

1. Nạp lại tiện ích ở `chrome://extensions` (hồ sơ `anhducds` chắc chắn cần — nó đang chạy bản cũ).
2. Mở một tab hội thoại Gemini (`gemini.google.com/app` hoặc `/images`) và **để nó là tab đang hoạt động**.
3. Mở side panel Duc Auto Gemini.
4. Bật công tắc **"Chế độ phát triển"** trong panel.

Xong bốn cái đó thì lượt nghiệm thu `G-01` chạy được: ≤2 job, prompt mới, bấm dừng giữa chừng.

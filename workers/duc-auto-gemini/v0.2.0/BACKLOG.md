# Backlog — Duc Auto Gemini (Platform)

Nơi chứa mọi việc phát sinh mà **không** thuộc checkpoint của phiên đang chạy.

Luật (Đức chốt 2026-08-26): mỗi phiên chỉ đóng **một** checkpoint. Ý tưởng mới nảy ra giữa
chừng thì ghi vào đây, không mở rộng phiên đang làm.

Cách đọc: `P1` = chặn việc khác, làm trước. `P2` = nên làm sớm. `P3` = khi rảnh.
Mục nào xong thì chuyển xuống mục **Đã đóng** kèm số commit.

**Đánh số `G-xx`** để không lẫn với `B-xx` của nhánh ChatGPT. Hai sổ, hai nhánh, hai dãy số.

> **Sổ này lập ngày 2026-08-27** (`opus-platform-2`, GPT chốt thứ tự việc). Trước đó nhánh
> Gemini **không có nơi canonical để giữ việc mở** — chúng nằm rải trong `HANDOFF.md` hoặc
> nằm nhờ ở sổ của nhánh ChatGPT, tức là một chiều. Đó chính là lỗ vận hành sổ này bịt.

## Đọc mỗi dòng cho đúng độ tin cậy

Kế thừa quy ước của [`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md):

| Ký hiệu | Nghĩa | Tin được tới đâu |
|---|---|---|
| **[ĐO]** | Máy đếm được | Chắc |
| **[ĐỌC]** | Đã mở code đọc thẳng hàm đó | Chắc |
| **[DÒ]** | Tìm theo tên hàm/hằng số | **Có thể sai** |

**Dòng [DÒ] phải kiểm lại TRƯỚC khi hành động.** Dò theo tên đã cho kết luận sai **bốn lần
trong một ngày** ở repo này, và lần đắt nhất là một tính năng không ai nghĩ ra để dò.

---

## P1 — Chặn vòng tự hành

### G-01 · Lệnh dừng chỉ ăn ở mốc ngắt, prompt vẫn bay sau khi đã báo dừng — **[ĐỌC]**

Trial live 2026-08-26 ghi sổ cái: `BRIDGE_RUN_STOPPED` lúc 14:20:36 với
`STOP_REQUESTED_BEFORE_SUBMIT`, rồi **`PROMPT_SUBMITTED` lúc 14:20:37** — đúng một giây sau.
Cờ dừng chỉ được đọc ở các mốc ngắt, nên job đang chạy đi nốt tới chỗ gửi.

Đã vá **lời nhắn** (trước đó nó trấn an "Không job nào bị gửi thêm", và câu đó sai).
Bằng chứng: `evidence-stop-reload-20260826/README.md`.

**CẬP NHẬT 27/08 — Đức Go trong chat, HÀNH VI ĐÃ VÁ TĨNH:** root cause chứng minh bằng test
tái hiện đúng thứ tự message (`tests/content-abort-race-behavior.mjs` đỏ trên code cũ, xanh
sau vá) — `content.js` mở đầu `runPrompt()` bằng xoá cờ huỷ nên `DAC_ABORT` tới trước job bị
nuốt. Vá theo hướng B-refined: `DAC_ABORT` mang `job_id`+`attempt_id`, cờ chỉ giữ cho đúng
attempt bị huỷ; kèm recheck cờ dừng sau `await gateNextJob` trong runner
(`tests/sidepanel-stop-before-submit-static.mjs`). 6 phép phá thử đều bị bắt.

**Còn mở — chưa được đóng mục này:** trial live sau khi Đức reload extension, đọc sổ cái
chứng minh không còn chuỗi `STOP_REQUESTED_BEFORE_SUBMIT → PROMPT_SUBMITTED`, ghi bằng chứng
vào `evidence-stop-*/` rồi cập nhật `STATUS.md`. Cùng lỗi bên nhánh ChatGPT: **B-22**.

### G-02 · Khoá tab và khoá hội thoại — Gemini chưa có — **[ĐỌC]**

`sidepanel.js:2414` `activeTab()` vẫn gọi `chrome.tabs.query({active:true})` **mỗi lần gửi**,
và chỉ kiểm origin chứ không ghim `/c/<id>`. Đổi tab hoặc đổi hội thoại giữa chừng là runner
âm thầm gõ sang chỗ khác.

Nhánh ChatGPT đã có (B-01). Port sang, **đừng chép nguyên xi** — hai nhánh khác nhau ở chốt
khởi động run, xem `HANDOFF.md` mục port `run.stop`/`chat.reload` để biết ba chỗ khác nhau.

## P2 — Nên làm sớm

### G-03 · `README.md` của package này là bản chép từ nhánh ChatGPT — **[ĐỌC]**

Dòng tiêu đề vẫn ghi *"Duc Auto ChatGPT V0.3"*. Ai đọc README để hiểu nhánh Gemini bị dẫn sai
tên **ngay dòng đầu**. So hai file thì chúng chỉ khác đúng một mục (`references.add`).

Đây là lỗi tài liệu rẻ nhất trong sổ này và cũng dễ gây hiểu nhầm nhất cho người mới.

### G-04 · Nợ ba method Bridge — **[ĐO]**

`output.set_folder_hint` · `profiles.remove` · `queue.proposal.withdraw`.

**Đừng gõ lại con số vào đây** — số hiện tại luôn nằm ở khối `AUTO:DEBT-METHODS` trong
[`FEATURE-PARITY.md`](../../../FEATURE-PARITY.md), do máy sinh. Dòng này chỉ để biết *có nợ*.

### G-05 · `image-evidence-core.js` nhỏ hơn nhánh kia hơn hai lần — **[ĐO]**

145 dòng bên ChatGPT, 66 bên Gemini. Đây là **lớp quy ảnh về job** — tức là lớp **an toàn**,
không phải UI. Chênh lệch ở đây đáng lo hơn chênh lệch ở giao diện.

Chưa ai đọc để biết 79 dòng đó làm gì. **Việc đầu tiên là ĐỌC, không phải port.**

### G-06 · Bốn hành vi nhánh ChatGPT có mà Gemini chưa — **[DÒ], phải kiểm lại**

- `DETECTION_BLIND` — mù thì dừng cứng, không thử lại (chốt dựng ra sau khi đốt 6 lượt quota ngày 25/08)
- Ledger khai thật `landed_as_requested`
- Nhiều ảnh một job
- Đọc `tab.url || tab.pendingUrl`

Cả bốn đều là **[DÒ]** — chỉ mới dò theo tên hằng số/thuộc tính. **Kiểm lại bằng cách đọc code
trước khi kết luận là thiếu.** Nhánh Gemini đã hai lần bị báo oan "thiếu" trong khi nó **có**,
chỉ là làm theo cách khác và đặt tên khác (`tryBeginRun`, `assertTrialDevMode`).

### G-09 · `npm test` ở gốc repo KHÔNG chạy suite Gemini — **[ĐO]**

`package.json` gốc chạy `workers/duc-auto-chatgpt/.../run-all.mjs` rồi 4 test gốc. Suite Gemini
(82 phép) **không nằm trong đó**. Cổng `session-check.mjs` thì có chạy, nên luật vẫn được canh —
nhưng ai chỉ chạy `npm test` sẽ tưởng nhánh Gemini đã xanh mà thật ra chưa chạy dòng nào.

`package.json` là file gốc repo → phải giữ `_root` mới sửa được. Ghi lại để không quên.

### G-10 · Ba guard lớp hai chưa có phép ghim — **[ĐỌC]**

Trong `bridge-transport-loopback.js`: (a) điều kiện `reconnectTimer` trong `scheduleReconnect`,
(b) phép kiểm danh tính `socket !== targetSocket` trong callback hạn chờ ACK, (c) phép kiểm
"đã bị bản mới hơn vượt qua" trong `publishStatus`. Phá thử 39 chiều (28/08) bắt được 36, thoát
đúng ba cái này — **vì không còn đường nào tới được chúng** sau khi guard lớp một được vá:
`connectHost` gỡ **mọi** timer của socket bị thay, và ghi trạng thái đã được xếp thứ tự.
Auditor độc lập xác nhận cả ba là phòng thủ chiều sâu đúng đắn, không phải lỗi.

Giữ lại. Nếu sau này ai gỡ một guard lớp một, ba cái này thành đường sống — nên **đừng xoá vì
thấy test không đụng tới**.

## P3 — Khi rảnh

### G-07 · Poll A/B "thích ảnh nào hơn" — **[ĐO]**

`ab-poll-core.js` chỉ có ở nhánh ChatGPT. Không phải lớp an toàn, nên xếp P3.

### G-08 · Tám module giống hệt từng byte giữa hai nhánh — **[ĐO]**

Danh sách hiện tại ở khối `AUTO:MODULES` trong `FEATURE-PARITY.md`. Dời chúng vào
`workers/_shared/` thì **rủi ro bằng không** và hết cảnh sửa một chỗ quên chỗ kia.

Đây là việc **chung cả hai nhánh**, nên phải giữ `_root` mới làm được — không thuộc riêng sổ
này, ghi lại để không quên.

---

## Đã đóng

### G-11 · Đo live bản trần 5 giây — **ĐÓNG 28/08** ✅

Đo được **1,0 giây** (bản trước: 22,5s và 27,7s). Bằng chứng:
`evidence-transport-liveness-5s-20260828/`. Khớp dự đoán viết trước khi đo, lần thứ ba liên tiếp.

Còn một nhánh **chưa đo thật**, ghi lại để không tưởng là đã phủ: tắt host **quá 2 phút** thì
thang bỏ cuộc và alarm 30 giây lo tiếp. Hiện chỉ ghim bằng test.

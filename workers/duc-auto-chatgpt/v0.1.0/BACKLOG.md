# Backlog — Duc Auto ChatGPT

Nơi chứa mọi việc phát sinh mà **không** thuộc checkpoint của phiên đang chạy.

Luật (Đức chốt 2026-08-26): mỗi phiên chỉ đóng **một** checkpoint. Ý tưởng mới
nảy ra giữa chừng thì ghi vào đây, không mở rộng phiên đang làm. Claude là người
chủ động chặn và ghi, không chờ Đức nhắc.

Cách đọc: `P1` = chặn việc khác, làm trước. `P2` = nên làm sớm. `P3` = khi rảnh.
Mục nào xong thì chuyển xuống mục **Đã đóng** kèm số commit.

---

## P1 — Chặn vòng tự hành

### B-01 · Khoá tab lúc Run, không giải lại mỗi lần gửi
`sidepanel.js` `activeTab()` gọi `chrome.tabs.query({active: true, currentWindow: true})`
**mỗi lần gửi message**. Đổi tab giữa chừng là runner âm thầm gõ sang tab khác.
**Có ở CẢ HAI extension** (Gemini `sidepanel.js:2268` giống hệt) → sửa như lỗi lõi chung.
Cần: bind đúng 1 tab id lúc bấm Run, mọi message sau đó chỉ gửi tới tab đó, tab
biến mất thì báo `RECEIVER_LOST` rõ ràng thay vì lặng lẽ đổi mục tiêu.

### B-02 · Selector ChatGPT phải có bằng chứng, không kế thừa
**Đã làm một phần** (`c1e7d04`, `f418bc1`): `assistantMessage`/`userMessage` đã
sửa theo bằng chứng đo được, `conversationRoot` đã bỏ phụ thuộc tên. **CHƯA đo
lại trên trang thật** — xem bước 0 của `drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md`.
Các nhóm còn lại (`composer`, `send`, `stop`, `attachmentPreview`, `uploadPending`)
vẫn mang dấu `UNVERIFIED`. Chạy `diagnostics.dom_probe` trên tab thật, thay từng
nhóm bằng selector khớp thật, xoá dấu `UNVERIFIED` theo từng nhóm đã xác minh. Lưu ảnh chụp bằng chứng vào `evidence/` giống cách worker
Gemini đã làm (`duc-auto-gemini/v0.1.0/evidence/G1-live-dom-20260825/`).

### ~~B-03 · Cảnh báo sớm khi selector chết~~ — ĐÃ ĐÓNG `55b47e3`
Vòng 2026-08-26 đốt 6 lượt quota vì retry mù: gửi prompt → không thấy gì → retry
→ lặp lại. Cần một chốt chặn: nếu attempt kết thúc mà `assistant_count_after == 0`
(tức là trang **không có lấy một tin nhắn trả lời nào**), đó không phải "ảnh chưa
ra" mà là "bộ dò đã mù" → dừng cả batch bằng một failure type riêng
(`DETECTION_BLIND` hoặc tương tự), **không retry**. Retry chỉ đúng khi ta có bằng
chứng là trang vẫn đang hoạt động bình thường.

---

## P2 — Vận hành & đồng bộ

### B-04 · `run.stop` cho bridge — **ĐANG GIAO** (`drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md`)
Panel đã có `stop()` (`sidepanel.js`, bật cờ `stopRequested` + gửi `DAC_ABORT`) —
đúng đường nút Stop của Đức, đã được chứng minh an toàn. Đưa lên bridge.
**Bắt buộc: đi vòng qua khoá `RUN_ACTIVE`**, nếu không thì vô dụng đúng lúc cần nhất.
Không làm `run.pause`/`run.resume` cùng lúc — một việc một lúc.

### B-05 · `chat.reload` cho bridge (F5 tab) — **ĐANG GIAO** (`drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md`)
`chrome.tabs.reload(tabId)` — quyền đã đủ trong manifest, hiện chưa chỗ nào dùng.
Đóng được vòng đang hở: mất content script thì hệ thống hiện chỉ *bảo Đức* F5 rồi
đứng chờ. **Đã tự dính đúng lỗi này 2026-08-26**: reload extension xong, `dom_probe`
trả `RECEIVER_LOST` vì tab chưa F5, phải nhờ tay Đức.
**Bắt buộc: từ chối khi có job nào ở trạng thái post-submit** — F5 giết content
script và mọi attempt đang bay, mất dấu một lượt sinh ảnh đã tốn quota và lần
retry sau có nguy cơ gửi lại, phá đảm bảo "gửi đúng một lần".

### B-06 · Cơ chế đồng bộ & cross-check GPT ↔ Gemini
Đo 2026-08-26: **86% code chung**, nhưng lệch sai chỗ ở `bridge-core.js` (84%),
`image-evidence-core.js` (52%), `checkpoint-core.js` (79%), `output-profile-core.js` (62%).
Hai bridge đang thiếu method của nhau (GPT thiếu `references.add`; Gemini thiếu
`output.set_folder_hint`, `profiles.remove`, `queue.proposal.withdraw`).
Ba bước, tăng dần, **không gộp hai extension làm một**:
1. Một file spec hợp đồng bridge v1 + test conformance chạy cho **cả hai** worker.
   Lệch mà không khai báo ngoại lệ → test đỏ.
2. Báo cáo lệch tự động: in bảng % chung mỗi lần chạy test, cảnh báo có tên khi
   một file lõi chung tụt dưới ngưỡng. **Lưu ý kỹ thuật: GPT dùng LF, Gemini dùng
   CRLF** — script phải chuẩn hoá xuống dòng, nếu không mọi file đều báo lệch 100%.
3. Dời dần lõi chung vào `workers/_shared/`, bắt đầu bằng **8 file đang giống hệt
   nhau 100%** (rủi ro bằng không vì không sửa dòng logic nào).

### B-07 · Port ngược sang Gemini — danh sách chờ
Ghi ngày để không trôi:
- **2026-08-25** wave A/B-poll + multi-image (`image-evidence-core.js` hai bên đang
  52% giống nhau vì wave đó chỉ làm bên GPT). Gemini sớm muộn cũng gặp nhiều ảnh một lượt.
- **2026-08-26** `DETECTION_BLIND` — Gemini cũng retry mù được y hệt.
- **2026-08-26** `run.stop` + `chat.reload` khi wave đang giao hoàn tất.
- Chiều ngược lại: GPT còn thiếu `references.add` của Gemini.

---

## P3 — Dọn dẹp

### B-08 · Chuyển text anchor của poll A/B vào adapter
`ab-poll-core.js` đang giữ cả *chính sách* (random/click_1/... — trung tính) lẫn
*text anchor* của ChatGPT (riêng nhà cung cấp). Anchor nên nằm trong
`provider-adapter.js`, chính sách ở lại. Hoãn tới sau khi selector đã xác minh
xong, để lần bóc tách này vẫn là "không đổi hành vi".

### B-09 · Rác test trong thư mục output
`Downloads\Phai sinh\DucAuto_GPT-Output\Pilot-10_Trial-Tu-Hanh` còn checkpoint và
audit của các phiên hỏng (`Bridge-2026-08-25T07-25*`, `Bridge-2026-08-26T01-56*`).
Xoá là quyền của Đức — **AI không tự xoá file**.

---

## Câu hỏi còn treo, chưa đủ dữ kiện để quyết

- ~~**Q-01 · Ảnh ChatGPT "không hiển rõ & tốt"**~~ — **ĐÃ TRẢ LỜI 2026-08-26.**
  `dom_probe` đo được: `complete: true`, `naturalWidth: 1254`, render 600×600.
  Ảnh hoàn toàn bình thường, không liên quan tới lỗi dò. Loại khỏi diện nghi vấn.
- **Q-02 · Ngưỡng 90 giây của trial có còn hợp lý không?** Vòng 2026-08-26 mỗi
  attempt chạy ~150 giây (90s dò + ~60s reconcile) mới chịu thua. Chưa biết ChatGPT
  thật sự sinh ảnh mất bao lâu vì bộ dò mù suốt. Đo lại sau khi selector đã đúng.

---

## Phiên kế tiếp

Gói việc đã soạn sẵn: **`drafts/RUN-STOP-CHAT-RELOAD-HANDOFF.md`** (B-04 + B-05,
kèm bước 0 xác minh selector còn treo).

## Đã đóng

- **2026-08-26 · `d53a7e7`** — `provider-adapter.js` + `diagnostics.dom_probe` cho GPT,
  học cấu trúc từ worker Gemini. Kèm `tests/provider-adapter-static.mjs` làm hàng rào.
- **2026-08-26 · `5be8160`** — `BACKLOG.md` + subcommand `dom-probe` cho CLI.
- **2026-08-26 · `55b47e3`** (B-03) — `DETECTION_BLIND`: mù thì dừng, không retry.
- **2026-08-26 · `adbd87d`** — `dom_probe` trả giá trị attribute + chuỗi tổ tiên của ảnh.
- **2026-08-26 · `c1e7d04`** (B-02, một phần) — lượt assistant dùng `data-turn`, không
  còn `data-message-author-role`.
- **2026-08-26 · `f418bc1`** (B-02, một phần) — gốc quét là tổ tiên chung của các lượt,
  không khớp theo tên nữa.

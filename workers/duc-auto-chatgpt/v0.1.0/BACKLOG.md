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
`provider-adapter.js` hiện đánh dấu `UNVERIFIED` toàn bộ. Chạy `diagnostics.dom_probe`
trên tab thật, thay từng nhóm bằng selector khớp thật, xoá dấu `UNVERIFIED` theo
từng nhóm đã xác minh. Lưu ảnh chụp bằng chứng vào `evidence/` giống cách worker
Gemini đã làm (`duc-auto-gemini/v0.1.0/evidence/G1-live-dom-20260825/`).

### B-03 · Cảnh báo sớm khi selector chết
Vòng 2026-08-26 đốt 6 lượt quota vì retry mù: gửi prompt → không thấy gì → retry
→ lặp lại. Cần một chốt chặn: nếu attempt kết thúc mà `assistant_count_after == 0`
(tức là trang **không có lấy một tin nhắn trả lời nào**), đó không phải "ảnh chưa
ra" mà là "bộ dò đã mù" → dừng cả batch bằng một failure type riêng
(`DETECTION_BLIND` hoặc tương tự), **không retry**. Retry chỉ đúng khi ta có bằng
chứng là trang vẫn đang hoạt động bình thường.

---

## P2 — Vận hành & đồng bộ

### B-04 · `run.stop` cho bridge
Panel đã có `stop()` (`sidepanel.js`, bật cờ `stopRequested` + gửi `DAC_ABORT`) —
đúng đường nút Stop của Đức, đã được chứng minh an toàn. Đưa lên bridge.
**Bắt buộc: đi vòng qua khoá `RUN_ACTIVE`**, nếu không thì vô dụng đúng lúc cần nhất.
Không làm `run.pause`/`run.resume` cùng lúc — một việc một lúc.

### B-05 · `chat.reload` cho bridge (F5 tab)
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

### B-07 · Port ngược wave A/B-poll + multi-image sang Gemini
`image-evidence-core.js` hai bên đang 52% giống nhau vì wave 2026-08-25 chỉ làm
bên GPT. Gemini sớm muộn cũng gặp nhiều ảnh một lượt.

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

- **Q-01 · Ảnh ChatGPT "không hiển rõ & tốt"** (Đức nhận xét 2026-08-26). Chưa rõ
  là chất lượng ảnh model sinh ra kém, hay ảnh render lỗi/chưa tải xong trên trang.
  Nếu là vế sau thì nó ảnh hưởng trực tiếp tới bộ dò: `imageCandidates()` loại ảnh
  có `naturalWidth === 0` hoặc nhỏ hơn 64px. `dom_probe` có trả `naturalW`/`complete`/
  `rect` cho từng ảnh — đọc field đó là trả lời được.
- **Q-02 · Ngưỡng 90 giây của trial có còn hợp lý không?** Vòng 2026-08-26 mỗi
  attempt chạy ~150 giây (90s dò + ~60s reconcile) mới chịu thua. Chưa biết ChatGPT
  thật sự sinh ảnh mất bao lâu vì bộ dò mù suốt. Đo lại sau khi selector đã đúng.

---

## Đã đóng

- **2026-08-26 · `d53a7e7`** — `provider-adapter.js` + `diagnostics.dom_probe` cho GPT,
  học cấu trúc từ worker Gemini. Kèm `tests/provider-adapter-static.mjs` làm hàng rào.

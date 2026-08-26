# Brief — `run.stop` + `chat.reload` cho Agent Bridge

Gói việc cho **một phiên mới**, tự chứa. Đóng khi hai method chạy thật trên
extension đã reload, có test, có audit, đã commit + push.

Nguồn: `BACKLOG.md` mục **B-04** và **B-05**. Đức chốt 2026-08-26: làm hai
tính năng này trước vì chúng làm việc vận hành và debug trơn hơn hẳn.

---

## 0. Bước 0 — xác minh việc còn treo của phiên trước (2 phút)

Phiên 2026-08-26 sửa hai lỗi selector nhưng **chưa kịp đo lại trên trang thật**.
Làm việc này trước, vì dù sao cũng phải reload extension để test tính năng mới.

1. Đức reload extension ở `chrome://extensions`, F5 tab hội thoại ChatGPT
   (phải là `chatgpt.com/c/...`, **không phải** trang chat mới).
2. Chạy:
   ```bash
   node "C:/WORKING ZONE/Chrome_Extension_AI_Agentic/workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs" dom-probe --pairing "$LOCALAPPDATA/DucAutoChatGPT/BridgeV1/duc-auto-chatgpt-bridge-pairing-v1.json"
   ```
3. Kỳ vọng: `assistantCount` > 0 **và** `imageCandidates` ≈ tổng số ảnh đang
   hiển thị trong hội thoại (trên hội thoại đã đo hôm 26/08 là ~14, lúc hỏng
   chỉ ra 3). Nếu `imageCandidates` vẫn nhỏ hơn nhiều so với số ảnh thấy trên
   màn hình thì gốc quét vẫn sai — dừng và báo, **không chạy pilot**.
4. Ghi kết quả vào Log của `HANDOFF.md`. Nếu đạt, gỡ dấu `UNVERIFIED` cho hai
   nhóm `assistantMessage` / `userMessage` trong `provider-adapter.js`.

---

## 1. `run.stop`

### Vì sao cần
Bridge hiện **không có cách dừng một run**. Ngày 26/08 một trial hỏng chạy hết
6 lần thử và không ai dừng được từ phía agent — phải chờ nó tự kết thúc.

### Đã có sẵn
`sidepanel.js:4978`:
```js
async function stop() { state.stopRequested = true; progress("Stopping current operation…"); try { await send({ type: "DAC_ABORT" }); } catch (_) { /* local stop prevents further jobs */ } }
```
Đây đúng là đường mà nút Stop của Đức đang gọi — đã được chứng minh an toàn qua
nhiều pilot. Đưa lên bridge **không đổi ngữ nghĩa an toàn nào**, chỉ đổi ai bấm.

### Yêu cầu bắt buộc

1. **Phải đi vòng qua khoá `RUN_ACTIVE`.** Mọi method ghi hiện tại bị từ chối
   khi run đang chạy (`queueRunLock.tryBeginMutation()` ở `sidepanel.js:1233`).
   Nếu `run.stop` cũng bị từ chối như vậy thì nó **vô dụng đúng lúc cần nhất**.
   Đây là ngoại lệ có lý do: dừng là hành động *giảm* rủi ro, không phải tăng.
   Ghi rõ lý do này thành comment ngay tại chỗ, để lần audit sau không ai
   "sửa lại cho nhất quán".
2. **Idempotent thật.** Gọi khi không có run nào đang chạy phải trả `ok` với
   `was_running: false`, không được báo lỗi. Gọi hai lần liên tiếp phải cho
   cùng kết quả.
3. **Trả về trạng thái tại thời điểm dừng**, để bên gọi biết có prompt nào đang
   bay hay không: `was_running`, `job_id`, `attempt_id`, `phase`,
   `runtime_stage`. Nếu `phase` đã qua `PRE_SUBMIT` thì prompt **đã gửi đi rồi**
   — dừng không thu hồi được nó, và câu trả lời phải nói thẳng điều đó.
4. **Audit** một event riêng, ví dụ `BRIDGE_RUN_STOPPED`, mang `input_origin`
   như các method bridge khác.
5. **Không kèm `run.pause`/`run.resume`.** Một việc một lúc — pause để sau khi
   stop chạy ổn.

### Bẫy cần kiểm
`state.stopRequested` được `run()` reset về `false` ở đầu mỗi lần chạy
(`sidepanel.js` ~4837), nên bật cờ lúc rảnh là vô hại. **Hãy kiểm chứng lại điều
này bằng test**, đừng tin vào dòng chữ này: nếu sai, một lệnh stop lúc rảnh sẽ
âm thầm giết run kế tiếp.

---

## 2. `chat.reload`

### Vì sao cần
`chrome.tabs.reload(tabId)` — quyền đã đủ trong manifest (`tabs` +
host_permissions), hiện **chưa chỗ nào dùng**. Khi content script chết, hệ
thống hiện chỉ *bảo Đức* "reload tab ChatGPT một lần" rồi đứng chờ tay người.

Ngày 26/08 chính Claude đã dính đúng lỗ này: reload extension xong, `dom_probe`
trả `RECEIVER_LOST` vì tab chưa F5, phải nhờ Đức bấm — mất mấy vòng qua lại.

### Yêu cầu bắt buộc

1. **Từ chối khi đang có run.** F5 giết content script và mọi attempt đang bay:
   ta mất dấu một lượt sinh ảnh **đã tốn quota thật**, và lần retry sau có nguy
   cơ gửi lại prompt — phá vỡ đảm bảo "gửi đúng một lần", một trong những bất
   biến không được phép yếu đi.
   Cách ghép đúng là: `run.stop` → `chat.reload` → chạy lại. Hai method này
   thiết kế để dùng nối nhau, không phải để reload đè lên một run đang sống.
   Từ chối bằng `RUN_ACTIVE` kèm thông điệp nói rõ phải `run.stop` trước.
2. **Đợi content script sống lại rồi mới trả lời.** Sau `tabs.reload`, ping cho
   tới khi trang trả lời hoặc hết giờ (khoảng 15–20 giây). Trả `ready: true/false`.
   Một lệnh reload trả `ok` trong khi trang chưa dùng được là một lời nói dối
   nhỏ nhưng sẽ khiến bên gọi làm bước tiếp theo quá sớm.
3. **Ghi rõ đã reload CÁI GÌ.** Trả `tab_id` và `url` trước/sau. Hiện tab được
   giải bằng `activeTab()` (`sidepanel.js:5068`) — tức là **tab đang active**,
   giải lại mỗi lần gửi (đây là lỗi **B-01**, chưa sửa). Nên câu trả lời và
   audit **phải** nói rõ tab nào đã bị reload, không được để mơ hồ.
4. **Audit** `BRIDGE_CHAT_RELOADED` với tab_id + url.
5. **Không tự động reload trong đường chạy job.** Wave này chỉ mở một lệnh thủ
   công cho agent gọi. Tự chữa trong lúc chạy là việc khác, cần bàn riêng.

---

## 3. Việc chung cho cả hai

- **Đăng ký method** trong `bridge-core.js` (`METHOD_REGISTRY`), giữ đúng thứ
  tự với danh sách kỳ vọng trong `tests/bridge-method-registry-smoke.mjs` —
  test này so khớp **cả thứ tự**, thêm vào cuối là đơn giản nhất. Nhớ dấu phẩy:
  entry cuối cùng trong mảng không có dấu phẩy.
- **Hai bảng dispatch** trong `sidepanel.js` đều phải khai (tìm
  `"diagnostics.dom_probe"` sẽ thấy cả hai chỗ).
- **CLI**: thêm subcommand vào
  `duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs` (`COMMANDS`), và
  **copy bản mới vào `%LOCALAPPDATA%\DucAutoChatGPT\BridgeV1\`** — bản đã cài
  là bản CLI thực sự chạy, quên bước này là gọi không được.
- **Test**: mỗi method một file smoke riêng, theo mẫu
  `tests/bridge-run-trial-smoke.mjs`. Bắt buộc phải có test cho: đi vòng qua
  `RUN_ACTIVE` (stop), bị chặn bởi `RUN_ACTIVE` (reload), và idempotent (stop).
- **Docs**: cập nhật `BACKLOG.md` (chuyển B-04, B-05 xuống mục Đã đóng), thêm
  một dòng Log vào `HANDOFF.md`, ghi vào `decisions.md` quyết định "run.stop đi
  vòng qua khoá RUN_ACTIVE" kèm lý do.
- **Audit trước khi bàn giao**: theo `audit-before-handoff-workflow`. Vòng này
  đúng lượt **Antigravity** (vòng 26/08 đã dùng Codex).

## 4. Đồng bộ với Gemini — đừng quên

Thêm hai method vào GPT là **làm rộng thêm khoảng cách** với Gemini (đo 26/08:
`bridge-core.js` chung 84%, hai bên đã thiếu method của nhau). Không port trong
phiên này — nhưng **phải ghi ngay** hai method này vào danh sách port ở
`BACKLOG.md` mục **B-06/B-07**, kèm ngày. Nếu không ghi, nó sẽ trôi.

---

## 5. Ngoài phạm vi phiên này

Không đụng tới, kể cả khi thấy tiện tay:

- **B-01 khoá tab** — lỗi thật, có ở cả hai extension, nhưng là một wave riêng.
- **B-02 lưu bằng chứng DOM vào `evidence/`**.
- **B-03 đã xong** (`DETECTION_BLIND`, commit `55b47e3`).
- **Chạy lại pilot** — chỉ chạy sau khi bước 0 đạt. Mỗi lần thử là quota thật.
- `run.pause` / `run.resume`.

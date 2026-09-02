# BACKLOG — Duc Auto GG Flow Video (`F-xx`)

> Việc còn mở của nhánh này. Mỗi dòng gắn nhãn nguồn: [ĐO] máy đếm · [ĐỌC] đọc thẳng
> code · [DÒ] tìm theo tên (phải kiểm lại trước khi hành động). Mới nhất thêm xuống cuối.

## P1 — chặn đường

- **F-01** · Chụp bằng chứng DOM trang Flow (4 snapshot: nghỉ / đang sinh / có video /
  màn nhập prompt) qua `diagnostics.dom_probe`, lưu `evidence/`. [ĐỌC] — dom_probe là
  generic, không phụ thuộc selector Gemini (content.js, nhánh `DAC_DOM_PROBE`).
- **F-02** · Viết lại `provider-adapter.js` từ bằng chứng F-01: SELECTORS, TIMING
  (video tính bằng phút), surface Flow thật, tín hiệu "video xong". Kèm test ghim.
- **F-03** · Thay `image-evidence-core.js` bằng lớp bằng chứng video (URL, poster,
  duration; chính sách đề xuất: chỉ ghi URL + metadata, không tự tải file video).
- **F-04** · Hạ trần `dev-trial-core.js` xuống **≤3 job** cho nhánh này (Đức chốt 27/08:
  3 video × 15 credit = 45, giới hạn free; hiện code còn trần 30 của nhánh ảnh [ĐỌC]) —
  làm TRƯỚC khi gỡ khoá bootstrap.

## P2 — trước pilot live

- **F-05** · Gỡ khoá bootstrap Bridge sau khi F-02+F-04 xong (ghi decisions.md).
  **Kèm bắt buộc:** khôi phục kỳ vọng gốc của 5 test router đã đổi sang
  `FORBIDDEN/bootstrap_locked` (failure-semantics, loopback-integration,
  mv3-reconnect, references-add, router-smoke) — đặc biệt là coverage
  idempotent-retry của queue.propose trong loopback-integration [ĐỌC diff Codex 27/08].
- **F-06** · Rebrand chữ hiển thị: sidepanel còn nói "Gemini" nhiều chỗ [DÒ]; lời nhắn
  operator nhắc "ảnh" phải thành "video" ở các đường chạy thật.
- **F-07** · Mở rộng schema XLSX cho video (duration, model, aspect ratio…) — sửa
  `DAC_XLSX_RUN_PLAN_V1.md` thành bản V2 có cột video, giữ tương thích cột cũ.
- **F-08** · Đo và đặt lại timeout runner cho video (Gemini: 90s/job — video cần
  nhiều phút [ĐỌC comment TIMING]).

## P3 — sau khi chạy được

- **F-09** · [ĐO 28/08] Flow chưa lộ số dư số học trong probe, nhưng khi hết credit thì
  `Create` biến mất và có 2 nút `Upgrade` visible/enabled. Matcher + test đã ghim
  `GENERATION_LIMIT_REACHED`, zero click/retry; còn cần reload và live verify bản vá.
- **F-10** · FEATURE-PARITY: nhánh này sẽ vào bảng parity khi có method Bridge chạy thật.
- **F-11** · [ĐỌC 28/08, do audit Codex nêu] Nhãn Image mode trong `provider-adapter.js`
  đang khớp CHÍNH XÁC đúng một chuỗi đã đo: `🍌 Nano Banana 2 crop_9_16 x2`. Đổi model
  ảnh, đổi tỉ lệ, hay đổi số lượng (`x3`) → `generationMode()` trả `unknown` → job dừng
  `WRONG_GENERATION_MODE` trước khi gõ. Đây là fail-closed CỐ Ý (chưa có bằng chứng DOM
  cho dạng tổng quát, luật vàng 1 cấm đoán selector), KHÔNG phải bug — nhưng Đức sẽ gặp
  nó thật nếu đổi cấu hình ảnh. Nới ra thì phải đo trước: chụp `dom_probe` vài cấu hình
  Image khác nhau, rồi mới ghim pattern có cấu trúc như đã làm cho nhãn Video.
- **F-12** · [ĐỌC 28/08, audit Codex vòng 3] Composer giờ được lấy SAU mọi bước làm
  thay đổi DOM (đổi mode, gắn ảnh) và ngay trước khi gõ. Còn một khe hẹp chưa đo:
  nếu Flow remount composer trong khoảng GIỮA lúc gõ xong và lúc bấm Create
  (`confirmReferences`), chữ vừa gõ sẽ mất. Hiện khe này được chặn gián tiếp — composer
  rỗng thì Flow gỡ/khoá nút Create nên `waitForSendButtonReady()` hết giờ và zero click.
  Muốn chặn thẳng thì phải thêm phép kiểm "prompt còn nguyên trong composer" ngay trước
  click; CHƯA làm vì cách đọc chữ khỏi editor Lexical chưa được đo đủ chắc, đặt nhầm
  ngưỡng sẽ chặn oan cả job lành. Đo trước (dom_probe `textboxes[].valueLen`), rồi mới ghim.
- **F-13** · [ĐỌC 28/08, audit nêu] **Chưa đo được độ trễ mount của nút `arrow_forward Create`.**
  Sau khi gõ prompt, trạng thái "có chữ + không có Create + có Upgrade" vừa có thể là tường hết
  credit, vừa có thể là nút chưa kịp hiện. Hiện phân biệt bằng THỜI GIAN: hết hạn chờ
  (`sendReadyTimeoutMs`, đang 5s) mà vẫn vậy thì kết luận hết credit. Đó là đánh đổi có ý thức,
  không phải phép đo — nút mount chậm hơn 5s sẽ bị báo oan. Chọn hướng dừng vì an toàn credit,
  và lời nhắn cho Đức đã viết ở dạng "nhiều khả năng", không khẳng định. **Việc cần làm:** đo
  thật độ trễ mount qua vài lần gõ (dom_probe liên tiếp, đếm ms tới khi nút hiện), rồi đặt
  ngưỡng từ số đo. Trước khi có số, đừng nới/siết ngưỡng theo cảm tính.
- **F-14** · [ĐO 28/08, hai lần] **`element.click()` KHÔNG có tác dụng lên nhóm nút cấu hình
  của Flow.** Chứng minh hai lượt, cả hai 0 credit: (Q001) bấm chip mode → bảng không mở;
  (Q002) bảng đang mở sẵn, runner TÌM THẤY và BẤM đúng `videocam Video` → mode vẫn Image, bảng
  vẫn mở. Đối chiếu: cũng `element.click()` đó **bấm được `arrow_forward Create`** — Q003 submit
  thành công bằng đúng đường ấy. Nhóm nút hỏng đều mang class `flow_tab_slider_trigger`.
  **Giả thuyết (CHƯA chứng minh):** chúng nghe `pointerdown`/`mousedown`, mà `.click()` chỉ bắn
  mỗi `click` — cùng họ với bài học editor Lexical. Khả năng còn lại chưa loại trừ: component
  đòi sự kiện thật (`isTrusted`). **Cách phân biệt, rẻ và 0 credit:** thêm một lệnh chẩn đoán
  chỉ-thử-mở-bảng, bắn `pointerdown`+`mousedown`+`mouseup`+`click` rồi probe xem bảng có mở
  không. Mở được = giả thuyết 1, sửa luôn. Không mở = giả thuyết 2, và khi đó chuyển mode phải
  do người làm. **Hệ quả hiện tại:** Đức phải tự đặt Video mode trước mỗi phiên chạy; khi mode
  đã là Video thì `ensureFlowVideoMode` thoát sớm và đường tự động không bị ảnh hưởng.
- **F-15** · [ĐO 28/08] Chip cấu hình có ô **số lượng output** (`x1`…`x4`). Đặt `x2` trở lên là
  Flow sinh nhiều video một lượt → luật gán "đúng 1 id mới" sẽ trả `OUTPUT_AMBIGUOUS`, không
  nhận cái nào, **mà credit thì đã tiêu**. Lần này bắt được trước khi chạy nhờ đọc chip, nhưng
  runner hiện KHÔNG tự kiểm điều đó. Nên thêm tiền kiểm: nếu chip không phải `x1` thì từ chối
  trước khi gõ, kèm lời nhắn bảo Đức đổi về `x1`. (Cẩn thận: đọc `x{n}` từ nhãn chip là selector
  mới → phải có bằng chứng DOM, đã có trong `F4-trial-success-live-20260828.json`.)
- **F-16** · [Thiết kế 28/08, rủi ro có thật] Copy nguyên thư mục profile Chrome sẽ nhân đôi
  `instance_id` trong `chrome.storage.local` → hai profile thay nhau chiếm ghế CỦA NHAU trên
  host (khoanh trong một cặp, các profile khác không bị vạ). Cần nút **"Tạo danh tính mới"**
  trong side panel để đổi `instance_id` tại chỗ. Dấu hiệu nhận biết: `bridge.sessions` thấy một
  entry có `connected_at` nhảy liên tục.
- **F-17** · [V2 của design multi-profile §5.4] Panel/transport gửi kèm chuỗi `runtime_contract`
  trong `auth` để MỘT lệnh `bridge.sessions` thấy độ tươi của mọi profile. Hiện tại phải
  `dom_probe --target` từng đích (2 lệnh) — vẫn đủ dùng, chưa gấp.

- **F-18** · [ĐO 02/09, lượt trial F4R2] **Chữ vào được composer nhưng nút gửi không bao giờ
  enable → job chết ở `PRE_SUBMIT`.** Đo thật trên hồ sơ `kaito`: sau khi runner gõ, composer
  `[contenteditable="true"][role="textbox"]` có `valueLen: 172` (không rỗng), nhưng
  `arrow_forward Create` vẫn `disabled: true`, nên `waitForSendButtonReady()` hết giờ và ledger
  ghi `Send button did not become ready`. **0 credit, 0 retry, số video không đổi** — fail-closed
  đúng. Nghi: đường gõ ở `content.js` (`execCommand insertText` → `beforeinput`/`input` →
  `ClipboardEvent paste`, dòng ~253–275) ghi được ký tự vào DOM nhưng Flow (React/Lexical) không
  ghi nhận vào state, nên Create không mở. **Đính chính bảng lỗi dòng 150 của
  `AI-OPERATOR-GUIDE.md`:** kết luận cũ "nút disabled nghĩa là chưa gõ được chữ" chưa đủ — chữ
  ĐÃ vào DOM. **Chưa giải thích:** prompt 145 ký tự mà composer đo 172, lệch 27; lượt sau phải
  lưu probe TRƯỚC khi chạy để có mốc so. **Đức đã biết lỗi này, chốt 02/09 để debug sau** —
  đừng tự sửa mù. Bằng chứng: `evidence/F4R2-KET-QUA.md`.
- **F-19** · [ĐO 02/09] Chữ lỗi trả về operator còn nói **"Gemini DOM may have changed"** trên
  một trang Google Flow — đồ thừa kế từ nhánh Gemini, thuộc nợ rebrand **F-06**. Nhỏ, nhưng
  người đọc ledger sẽ đi tìm nhầm chỗ.

### Cửa sổ bỏ cuộc là cận trên, không phải đồng hồ thật — **[ĐỌC]**, chấp nhận có chủ đích

`bridge-transport-loopback.js` trừ vào ngân sách bỏ cuộc **những khoảng chờ chính nó hẹn** (độ trễ
giữa các lần thử, hạn bắt tay, kỳ thử + hạn chờ ACK). Nó **không** đọc đồng hồ thật, nên sau một
ACK về muộn, chu kỳ kế bị trừ trọn một kỳ dù thực tế trôi ít hơn.

Hệ quả: thang **bỏ cuộc sớm hơn** 2 phút một chút trong tình huống đó — lệch về phía tiết kiệm
pin, đúng mục đích của cửa sổ. Auditor độc lập nêu 02/09; **chấp nhận, không sửa**, vì đọc đồng hồ
thật sẽ làm mọi hạn chờ trong file này không test được bằng đồng hồ tiêm vào.

Chỉ mở lại nếu có bằng chứng thật là extension nhường alarm quá sớm và gây phiền.

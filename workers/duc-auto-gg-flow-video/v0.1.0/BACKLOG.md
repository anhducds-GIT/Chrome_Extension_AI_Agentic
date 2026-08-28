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

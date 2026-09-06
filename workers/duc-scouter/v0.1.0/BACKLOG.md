# BACKLOG — Duc Scouter (`S-xx`)

> Việc còn mở của gói này. Mỗi mục PHẢI khai `đóng khi:` — không khai được điều kiện đóng thì
> mục đó chưa đủ chín để ghi. Mới nhất thêm xuống cuối. Đóng mục bằng cách **thêm một dòng ở
> cuối**, đừng sửa khối cũ.
>
> Nhãn nguồn: [ĐO] máy đếm · [ĐỌC] đọc thẳng code · [DÒ] tìm theo tên (phải kiểm lại trước khi
> hành động).

## P1 — chặn đường

- **S-01** · Bấm và gõ như tay người: mở nhóm lệnh `Input` của giao thức debug
  (`dispatchMouseEvent` · `dispatchKeyEvent` · `insertText`). Đây là năng lực xếp hạng **số một**
  của bảng kiểm kê, và phép đo ① ngày 06/09 đã chứng minh đường đó dùng được (`isTrusted: true`).
  Chưa làm trong lượt này vì việc ② của `BRIEF-SCOUTER-SEED-01` chỉ gồm ba khả năng nền.
  **[ĐO]** `scripts/scouter-input-trust-probe.mjs`, ĐẠT trên Chrome 152.
  · **đóng khi:** có method `scout.click` / `scout.type` trong từ vựng, mỗi cái một phép ghim,
  và đột biến kiểm có con canh đường ghi mới.

## P2 — nợ đã biết

- **S-02** · Nối lại Bridge đang chạy bằng `setTimeout` trong service worker, mà service worker
  ngủ thì hẹn giờ chết theo. Ba worker kia dùng `chrome.alarms`, nhưng quyền `alarms` **không**
  nằm trong danh sách ADR-0009 duyệt, và thêm quyền là việc phải hỏi Đức (`AGENTS.md` gốc mục 2).
  Đường nâng đã chừa sẵn: tiêm `options.schedule` vào `createTransport`.
  **[ĐỌC]** khối đầu `scripts/scouter-transport-loopback.mjs`.
  · **đóng khi:** Đức chốt cho thêm quyền `alarms`, manifest khai, và bộ hẹn giờ nối lại đi qua
  `chrome.alarms` — hoặc Đức chốt là KHÔNG thêm, và mục này đóng bằng một dòng ghi lý do.

- **S-03** · Tên file còn mang chữ `observer`: `observer-engine.js` · `scripts/observer-probes.mjs`
  · `scripts/observer-mutation-check.mjs` · `tests/observer-*-smoke.mjs`. ADR-0009 đã đổi tên
  Observer thành Scouter từ 06/09. Không đổi trong lượt này vì nó làm hỏng 14 mỏ neo đột biến và
  làm mọi diff của lượt xây khó đọc — đúng lý do ADR-0013 nêu khi bàn chuyện chuyển chỗ.
  · **đóng khi:** đổi bằng `git mv` (không copy-rồi-xoá), 14 mỏ neo của
  `observer-mutation-check.mjs` khớp lại đủ, và `npm run scouter:mutation` vẫn 0 con sống sót.

- **S-04** · `scout.reload` trả lời rồi mới nạp lại sau **một độ trễ cố định 250ms**, chứ không
  chờ xác nhận khung đã rời socket. Muốn chắc thì transport phải có móc "đã gửi xong".
  **[ĐỌC]** `RELOAD_DELAY_MS` trong `scripts/scouter-seed-core.mjs`.
  · **đóng khi:** có một lượt reload thật bị mất phản hồi (thì làm móc), hoặc chạy đủ nhiều lượt
  mà không mất lần nào (thì đóng bằng một dòng ghi số lượt đã đo).

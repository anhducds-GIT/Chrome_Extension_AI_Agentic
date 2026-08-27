# HANDOFF — Duc Auto GG Flow Video

> Trạng thái mới nhất ở CUỐI file. Log chỉ thêm dòng.

## Trạng thái hiện tại (2026-08-27)

- Package khai sinh theo `drafts/FLOW-EXT-COORDINATION-PLAN.md` (FLOW-00 đã chốt cả 3 điều).
- Fork bootstrap từ `workers/duc-auto-gemini/v0.2.0`: runtime + tests + scripts +
  templates + host source. KHÔNG mang theo pilot/evidence/sổ sách của Gemini
  (riêng `pilot-04/`, `pilot-05/` chỉ giữ 2 file XLSX làm fixture test).
- Việc tiếp theo (1): FLOW-01 — bằng chứng DOM trang Flow qua `dom_probe`.
- Rủi ro đang mở: UI Flow là dạng project editor, có thể khác chat UI nhiều hơn dự
  kiến → reuse content.js có thể thấp hơn kỳ vọng; chỉ biết chắc sau F-01.

## Log

- 2026-08-27 · `claude-flow-1` (Claude, cùng phiên viết kế hoạch) · Fork bootstrap +
  bộ docs mới (README/AGENTS/STATUS/HANDOFF/BACKLOG/decisions/AI-OPERATOR-GUIDE).
  Suite thừa kế: 78/79 xanh trước khi Codex sửa code (1 đỏ là
  bridge-migration-closure cần README — đã viết, sẽ xanh sau lượt Codex). Còn mở:
  Codex sửa manifest + ORIGIN adapter + khoá bootstrap router + test ghim.
- 2026-08-27 · `claude-flow-1` · Codex implementer hoàn tất bootstrap surgical:
  manifest + Flow ORIGIN/surface + Bridge allowlist 4 method + test ghim; 5 test router kế
  thừa đã đổi kỳ vọng sang `FORBIDDEN/bootstrap_locked`. Suite: 80/80 xanh;
  `node --check` xanh; không commit/push. Còn mở: F-01/F-02 DOM evidence.
- 2026-08-27 · `claude-flow-1` · Audit độc lập vòng 1 (Codex phiên mới): **FAIL, 1 blocker
  thật** — `Object.freeze(new Set(...))` không đóng băng nội dung Set, export bị mutate được
  để xuyên khoá bootstrap; test cũ chỉ check `isFrozen` nên trấn an sai. Đã sửa: export
  thành MẢNG frozen, membership dùng Set riêng trong closure; test thêm regression mutate
  (throw + gate vẫn đóng sau đó). Suite 80/80 xanh lại. Vòng 2 re-audit: **PASS**.
  Kiểm chứng độc lập thêm: content.js/sidepanel.js hash-identical với Gemini HEAD (không
  dính WIP G-01 của phiên khác). AGY vẫn hỏng headless (hook cá nhân chặn mọi tool call —
  probe không-tool xanh là bẫy), auditor là Codex. Host Bridge riêng đã dựng và đang nghe
  cổng 32149 (`C:\WORKING ZONE\Duc-Auto-GG-Flow-Video-Bridge\`). Còn mở: Đức load unpacked
  + mở tab Flow + dán pairing → F-01 chụp bằng chứng DOM.
- 2026-08-27 · `claude-flow-1` · Đức đã nối Bridge (ping OK, extension paired) + yêu cầu 2
  đổi: tên hiển thị → "Duc Auto GG Flow", icon → F nền teal. Đã làm cả hai + thêm
  `chat.reload` vào allowlist (method thứ 5) vì gặp thật RECEIVER_LOST — tab mở trước khi
  load extension, và mọi lần reload extension sau này đều cần F5 tab. 2 test đổi pin theo
  rebrand, bootstrap-gate đổi kỳ vọng chat.reload. Suite 80/80 xanh. Còn mở: Đức bấm ⟳
  extension (nạp icon + allowlist mới) → chat.reload → dom_probe chụp bằng chứng.
- 2026-08-27 · `claude-flow-1` · FLOW-01 bắt đầu ăn: chat.reload tự F5 tab OK, snapshot #1
  (idle) đã lưu `evidence/F1-snapshot-1-idle-20260827.json`. Phát hiện chính: composer =
  đúng 1 `[contenteditable][role=textbox]`; nút gửi = "arrow_forward Create" (disabled khi
  trống); input file `image/*` multiple; chip cấu hình "Video · 720p · 10s · 16:9 · x1";
  trang React/Next, KHÔNG có custom tag → bám text/class. Probe cũ MÙ thẻ <video> → đã
  thêm mắt video + class nút vào DAC_DOM_PROBE (test ghim trong bridge-dom-probe-static).
  Đức chốt trần trial 3 video/lượt (15 credit/video, free 45) → decisions.md + F-04.
  Suite 80/80. Còn mở: Đức ⟳ lần nữa (nạp probe mới) → re-probe idle (thấy video sẵn có)
  → nhờ Đức bấm Create 1 lần để chụp trạng thái "đang sinh" + "xong".

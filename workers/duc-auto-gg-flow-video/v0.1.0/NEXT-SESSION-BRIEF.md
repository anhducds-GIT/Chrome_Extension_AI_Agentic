# NEXT-SESSION-BRIEF — Duc Auto GG Flow Video (viết 2026-08-27, phiên `claude-flow-1`)

> Brief bàn giao cho phiên triển khai tiếp theo. Kiểm ngày trước khi tin: nếu HANDOFF.md
> có log mới hơn brief này thì HANDOFF thắng.

## Prompt mở phiên — Đức dán nguyên khối này vào chat mới

```text
You are the implementation coordinator for the Google Flow video extension. Session label: `claude-flow-2`.

Read first, in this exact order:
1. `AGENTS.md` at repo root — the constitution. Everything in it binds you.
2. `workers/duc-auto-gg-flow-video/v0.1.0/NEXT-SESSION-BRIEF.md` — your handover brief (this file). Then the tail of `HANDOFF.md` in the same package.
3. `workers/duc-auto-gg-flow-video/v0.1.0/evidence/F1-EVIDENCE-NOTES.md` — the measured truth about the Flow page.
4. `workers/duc-auto-gg-flow-video/v0.1.0/AI-OPERATOR-GUIDE.md` — how to drive the Bridge (port 32149).

Claim `workers/duc-auto-gg-flow-video` in `.agents/claims.json` with your label before touching anything.

Your first checkpoint is FLOW-04: the live trial through the REAL runner path (jobs.add → run.trial, cap 3 videos). The brief has the exact step list and every trap the last session hit. Đức has many free accounts — trials are cheap, but the 3-per-trial cap is owner law. Work the same loop as before: implement via Codex CLI, adversarial-audit via a fresh Codex session (AGY is broken headless — a no-tool probe passing is a TRAP), fix until PASS, commit → session-check green → safe-push. Report to Đức in simple Vietnamese.
```

## Chỗ đang đứng (2026-08-27, HEAD ~a35554b + 1 commit claims)

- FLOW-00 ✅ (3 chốt của Đức) · FLOW-01 ✅ (bằng chứng DOM + **video đầu tiên sinh bằng máy**,
  ~70s, evidence/F1-*) · FLOW-02 ✅ (adapter thật + đường job video qua runner, audit 3 vòng
  PASS) · F-04 ✅ (trần trial 3) · F-05 ✅ (gỡ khoá bootstrap, router = Gemini HEAD).
- Suite **84/84 xanh** (86 file test [ĐO]). Bridge **20 method [ĐO]**. Tất cả đã push.
- **FLOW-04 ĐANG DỞ**: trial 3 video qua runner chưa chạy được vì extension trong Chrome
  vẫn nạp bản CŨ (jobs.add còn báo `bootstrap_locked`). Đức đã ⟳ một lần nhưng không ăn.

## FLOW-04 — việc đầu tiên của bạn, từng bước

1. Nhờ Đức: ⟳ extension → mở lại side panel → bật **Chế độ phát triển (Dev Mode)**.
2. Kiểm bản mới đã nạp: `bridge-cli.mjs capabilities` — jobs.add gọi thử phải hết
   `bootstrap_locked`. Nếu còn: đợi 15-30s (SW thay ca) rồi thử lại; còn nữa thì nhờ Đức ⟳ lần
   nữa. Đã gặp cả `METHOD_NOT_FOUND` giả trong khe SW thay ca — `session.hello` 5-6 lần thấy
   extension_id ổn định là sạch.
3. `chat.reload` (tự F5 tab) → `jobs.add` 2-3 job prompt ngắn (params qua `--params-file`,
   KHÔNG inline JSON — PowerShell phá quoting) → `run.trial` với job_ids (cap 3, cần Dev Mode).
4. Theo dõi `run-status` + `queue-list` mỗi 10-15s (counts là TÍCH LŨY — đặt điều kiện dừng
   theo delta). Video ~70-90s/cái lúc trang khoẻ; trang đang có banner "high demand" nên có
   thể chậm/trượt — job trượt sẽ ĐẬU LẠI, không tự retry (đúng thiết kế, đừng "sửa").
5. Kết quả job = URL video + metadata trong ledger (không tải byte). Lưu bằng chứng vào
   `evidence/F4-*`, viết F4-KET-QUA.md.
6. Sau trial: cập nhật STATUS (lifecycle → active nếu đủ bằng chứng, kèm last_verified +
   evidence_ref + SHA 40 ký tự) → **claim `_root`** → regen DASHBOARD **từ git worktree
   checkout HEAD sạch** (bẫy: generator đọc working tree, cổng #7 so HEAD-HEAD; sinh xong
   commit code TRƯỚC, regen SAU) → session-check xanh → safe-push → trả _root.

## Sau FLOW-04 (BACKLOG.md có đủ, đọc nó)

F-06 rebrand chữ còn sót "Gemini/ảnh" trong panel · F-07 schema XLSX video (duration, model,
aspect — chip cấu hình "Video · 720p · 10s crop_16_9 x1" là button mở menu, CHƯA thăm dò) ·
F-08 đo lại timing thật · F-09 chụp text quota/credit thật khi gặp (matcher đang generic,
đã sống, scan text trang trừ ô nhập) · F-10 parity · ảnh tham chiếu image→video (input file
`image/*` multiple đã thấy, đường gắn CHƯA thử).

## Bẫy đã trả giá trong phiên trước — đọc kỹ, đừng dẫm lại

1. **Editor Flow là Lexical/React**: gõ bằng `beforeinput`/`input` InputEvent (đã có sẵn
   `typeIntoFlowComposer` dùng chung); GHI ĐÈ textContent = chữ hiện nhưng state chết. Có
   `diagnostics.evidence_submit` với `dry_run:true` để thử gõ 0 credit.
2. **Attribution video**: đúng-1-id-mới thì nhận; ≥2 id mới → OUTPUT_AMBIGUOUS, không đoán.
   Đừng nới. Timeout hậu-submit KHÔNG BAO GIỜ auto-retry (mỗi lần Create = 15 credit thật).
3. **MV3 "nhịp thở"**: Bridge đứt ~15-20s mỗi phút do SW ngủ, tự nối lại ≤30s — là thiết kế,
   không phải bug. Lỗi retryable thì gọi lại.
4. **Host Bridge** ở `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\` (cổng
   32149). Host đang chạy là process cũ vẫn sống trong RAM; nếu chết thì đúp
   `START-BRIDGE_GG_Flow_Video.cmd` ở thư mục MỚI đó.
5. **Codex**: implement + audit đều được (`--dangerously-bypass-approvals-and-sandbox`),
   nhưng snapshot HEAD trước-sau mỗi lần chạy. **AGY hỏng headless** — probe không-tool
   xanh là bẫy, hook `datacloud_telemetry` trong config Gemini cá nhân của Đức chặn mọi tool
   call (sửa 1 dòng nháy lồng trong `C:\Users\MAYTEST_12\.gemini\config\plugins\...` — HỎI
   ĐỨC trước).
6. **Đóng phiên đúng thứ tự**: commit → session-check xanh → safe-push → TRẢ QUYỀN CUỐI CÙNG.
   Đừng nối `lệnh; safe-push` bằng `;` — PowerShell vẫn push khi cổng đỏ (đã dẫm 1 lần).
7. File `evidence/F1-snapshot-7-high-demand-banner-20260827.json` (untracked) là VỎ LỖI
   EXECUTOR_UNAVAILABLE, không phải bằng chứng — chụp lại banner "high demand" khi panel mở
   (bằng chứng quý cho F-09), rồi hỏi Đức cho xử lý file hỏng đó.
8. STATUS.current_focus đang nói "Tiếp theo F-02" — LẠC HẬU (F-02 xong rồi). Bạn cập nhật
   cùng lượt STATUS sau trial (kèm regen dashboard, xem bước 6 ở trên).

## Ai đang giữ gì lúc bàn giao

`workers/duc-auto-gg-flow-video`: **đã trả** (nhận lại bằng nhãn của bạn) · `_root`: phiên
`claude-platform-orchestrator-study` đang giữ (việc 1 file drafts, sẽ trả) · gemini:
`opus-platform-3` giữ chờ trial live G-01 · chatgpt: trống.

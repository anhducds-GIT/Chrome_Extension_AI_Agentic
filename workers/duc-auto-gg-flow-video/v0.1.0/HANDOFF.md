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
  cổng 32149 (`C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\`). Còn mở: Đức load unpacked
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
- 2026-08-27 · `claude-flow-1` · Đức đổi lệnh: "tự động thử tất cả tính năng, việc cần
  tay người để cuối". Snapshot #2 (probe có mắt video): videos=[] — project trống, phải
  tự sinh. Claude-in-Chrome chưa cài → thêm `diagnostics.evidence_submit` (primitive
  tương tác duy nhất: gõ 1 prompt + bấm Create; trần cứng 3 lượt/trang = ngân sách free
  3 video Đức chốt). Audit Codex 4 vòng: FAIL race vượt trần khi gọi đồng thời → FAIL
  thiếu khoá RUN_ACTIVE → FAIL TOCTOU khoá chỉ đọc không giành → FAIL deadlock khi
  content không trả lời → sửa cả 4 (đếm+busy đồng bộ trước await; giành khoá kiểu
  chat.reload; Promise.race 15s) → **PASS**. Suite 81/81. Còn mở: Đức ⟳ + mở lại panel
  → phiên này tự chạy: chat.reload → evidence_submit → poller chụp during/after.
- 2026-08-27 · `claude-flow-1` · Bằng chứng sống đầu tiên + trượt có giá trị: (a) Bridge
  folder được Đức gom về `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\`
  — bridge-rpc.mjs đã trỏ lại; (b) sau F5, trang render 4 thẻ <video> (trước đó 0 — render
  lười), URL media pattern `labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=…`, lưu
  `evidence/F1-snapshot-4-after-video-20260827.json`; (c) evidence_submit lượt 1 TRƯỢT:
  gõ được chữ vào ô contenteditable nhưng nút Create không sáng → ô đó KHÔNG phải ô prompt
  nối với Create. Không tốn credit (chưa click). Vá: probe thêm mục `textboxes` (mọi ô nhập
  ứng viên), evidence_submit thêm `dry_run` (gõ + báo trạng thái nút, KHÔNG click, KHÔNG
  tiêu lượt) + ưu tiên TEXTAREA với native React setter. Đức chốt thêm: trial thoải mái,
  nhiều tài khoản free — trần 3/lượt-nạp-trang giữ nguyên (đổi account/F5 = lượt mới).
  Suite 81/81. Còn mở: Đức ⟳ → dry_run xác định đúng ô prompt → submit thật.
- 2026-08-27 · `claude-flow-1` · **FLOW-01 ĐÓNG — video đầu tiên sinh bằng máy, đầu-cuối.**
  Chuỗi: dry_run xác nhận bộ gõ 3 chiến thuật (Lexical ăn đường `input_events`; textContent
  là thuốc độc) → evidence_submit thật (lượt 1/3, path execCommand) → ~70s → thẻ <video>
  tăng 4→5, video mới `name=7e084b0` đứng đầu danh sách. Bộ bằng chứng đủ 6 snapshot +
  tổng kết `evidence/F1-EVIDENCE-NOTES.md` (tín hiệu hoàn thành = đếm+so id video, KHÔNG
  có progressbar; timeout khuyến nghị 180-300s; cấm bám class sc-*). Push chuỗi 3 commit
  theo lệnh "duyệt carry" của Đức (kèm a19c81f + de61be9 của opus-platform-2, diff đã tự
  đọc lại). STATUS current_focus → F-02. Còn mở: F-02 adapter thật + video-evidence-core
  + nối runner/workbook; F-04 hạ trần trial 3; F-05 gỡ khoá bootstrap.

- 2026-08-27 · Claude (`opus-platform-2`) · **Bridge host đã dời chỗ — đường dẫn tài liệu trong package này đã trỏ lại.** Đức yêu cầu quy tập mọi bridge về một nơi, và duyệt cho tôi sửa dù package đang do `claude-flow-1` giữ (`AGENTS.md` mục 1 — đã hỏi Đức).
  - Chỗ mới: `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-gg-flow-video\` (cũ: `C:\WORKING ZONE\Duc-Auto-GG-Flow-Video-Bridge\`). Cổng 32149 không đổi.
  - Sửa **4 dòng, thuần đường dẫn**: `AI-OPERATOR-GUIDE.md` ×2 · `HANDOFF.md` · `README.md`. **Không đụng** `scripts/bridge-rpc.mjs` — `claude-flow-1` đã tự sửa dòng đó trong commit `0fb28ed`.
  - Không commit hộ việc đang làm dở của `claude-flow-1`: chỉ stage đúng file của tôi.
- 2026-08-27 · Codex implementer (theo brief F-02/F-04, dưới claim `claude-flow-1`) · Adapter Flow thật + đường job video đã nối đầu-cuối ở mức deterministic: Create theo text/structure, gõ chung 3 chiến thuật đã chứng minh, completion bằng count tăng + diff `name=` video, chỉ ghi URL/metadata không tải byte; trial cap/registry/UI hạ 30→3. Thêm `flow-video-job-static.mjs`, cập nhật các pin Gemini đã lỗi thời; suite **82/82 xanh**. Không pilot live, không commit/push; còn cần Đức reload extension trước kiểm chứng runtime.
- 2026-08-27 · `claude-flow-1` · Codex implementer sửa đủ F-02 audit blockers R1–R5: video reconcile dùng tối thiểu budget 300s; timeout/uncertain/ambiguous sau submit được park hard-stop, không auto-retry; port G-01 abort theo attempt ở content + side panel và chặn race sau readiness gate; boundary video chụp ngay trước Create, đúng 1 ID mới mới được nhận, nhiều ID trả `OUTPUT_AMBIGUOUS` kèm toàn bộ candidate; khôi phục quota fallback EN+VN+credit và UTF-8 security; UI trial còn ≤3. Thêm test hành vi `content-abort-race-behavior.mjs`, `flow-video-safety-behavior.mjs` và test wiring `sidepanel-stop-before-submit-static.mjs`; suite **85/85 xanh**, syntax/diff check xanh. Không pilot live, không commit/push; cần reload extension trước runtime test.
- 2026-08-27 · Codex implementer (dưới claim `claude-flow-1`) · Sửa blocker quota unreachable: `content.js` quét text hiển thị toàn trang nhưng loại `[contenteditable]`, `input`, `textarea`; giữ nguyên matcher EN+VN+credit. `generation-limit-smoke.mjs` chạy content receiver thật: “hết credit” + “you are out of credits” hard-stop, câu chỉ trong composer không chặn. Adapter ghi rõ message Flow còn UNMEASURED tới F-09. Suite **85/85 xanh**; không commit/push.
- 2026-08-27 · Codex implementer F-05 (dưới claim `claude-flow-1`) · Đã gỡ bootstrap gate, khôi phục router + 5 test path byte-equivalent Gemini HEAD (gồm retry idempotent `queue.propose`), xoá test gate, giữ `diagnostics.evidence_submit` với cap 3/trang, cập nhật docs + decisions. Suite **84/84 xanh**; không commit/push.
- 2026-08-27 · `claude-flow-1` · **BÀN GIAO PHIÊN — chat dài, Đức mở chat mới.** F-02/F-04/F-05
  đã push (a35554b) sau 3 vòng audit (4 blocker vòng 1 gồm cả thiếu port G-01; quota
  unreachable vòng 2; vòng 3 PASS). FLOW-04 ĐANG DỞ: trial runner chưa chạy vì extension
  trong Chrome còn nạp bản cũ (jobs.add báo bootstrap_locked sau một lần ⟳ không ăn) — chờ
  Đức ⟳ + Dev Mode. Brief bàn giao đầy đủ + prompt mở phiên: `NEXT-SESSION-BRIEF.md` (đã
  khai Bản đồ file). Artifact "Bảng Điều Phối Duc Auto" được cập nhật thêm khu GG Flow
  (feature list + roadmap checkpoint, cùng phiên này). STATUS.current_focus còn nói "Tiếp
  theo F-02" — lạc hậu, phiên sau sửa cùng lượt regen dashboard sau trial (cần _root, đang
  do phiên study giữ). Quyền package TRẢ sau dòng log này — phiên mới claim bằng nhãn riêng.
- 2026-08-28 · Codex implementer (dưới claim `claude-flow-2`) · Sửa timeout `run.trial` video: bound 15–90s → 15–300s, default 90s → 180s, registry/comment đồng bộ; test ghim nhận 180s/300s và từ chối 301s. Suite **84/84 xanh**, `node --check` xanh trên 3 file JS/MJS đã sửa; không pilot live, không commit/push.
- 2026-08-28 · Codex implementer (claim `claude-flow-2`, audit preflight đính chính log ngay trước) · Phát hiện `dev-trial-core.js` thực tế vẫn còn `TIMEOUT_BOUNDS` 15–90/default 90; đã vá thành 15–300/default 180 và thêm test ghim min/default/max nhất quán với `bridge.validateParams`. Smoke PASS, suite mới chạy lại **84/84 xanh**, syntax/diff check xanh; không pilot/Bridge write, không commit/push.
- 2026-08-28 · `claude-flow-2` (Codex điều phối) · **FLOW-04 trial runner thật đã chạy đúng một lần** qua `jobs.add` → `run.trial`, 3 job, timeout 300s, delay 25s, max_retries=0. Q001/Q002 SUCCESS, mỗi job đúng 1 video ID mới và URL được ghi ledger; Q003 dừng PRE_SUBMIT, 0 Submit, lỗi `Create button not found`. DOM tăng 5→7 video, không CAPTCHA/quota blocker. Bằng chứng mới: `evidence/F4-*`, tổng kết `F4-KET-QUA.md`.
- 2026-08-28 · Codex implementer (dưới claim `claude-flow-2`) · Sửa lỗi live Q003 bằng thay đổi tối thiểu: bỏ gate tìm Create trước khi gõ; vẫn giữ gate `waitForSendButtonReady()` sau gõ, attribution boundary, `DECISIONS.clickSend` và đúng một click. Test hành vi mới đỏ trên code cũ, xanh sau fix; ca nút không trở lại vẫn fail với zero click. Suite **84/84 xanh**, session-check xanh; cần Đức reload Extension trước live verification của bản vá.
- 2026-08-28 · `claude-flow-2` + Codex implementer mới · Chạy đúng 1 job Q001 để capture tường hết credit: trước gõ có `Create`, sau gõ `Create` mất và có 2 nút `Upgrade` visible/enabled; audit có **0 `PROMPT_SUBMITTED`**, ledger `attempt_count=1`, `retry_count=0`, PRE_SUBMIT. Runtime cũ phân loại sai `OTHER`; đã thêm matcher Flow để trả `GENERATION_LIMIT_REACHED`, zero click/retry, không đổi tài khoản/bypass. Test mới đỏ→xanh; suite **84/84**, session-check xanh. Bằng chứng thêm mới `evidence/F4-credit-limit-*`; còn cần Đức reload Extension và live verify matcher mới trước audit cuối.
- 2026-08-28 · `claude-flow-2` + Codex implementer selector drift · Live verify matcher credit chưa tới tường credit: sau gõ, probe thấy nút enabled exact text `add_2 Create`, trong khi adapter chỉ nhận `arrow_forward Create`; job dừng PRE_SUBMIT, **0 `PROMPT_SUBMITTED`**, `attempt_count=1`, `retry_count=0`. Đã ghim matcher exact cho cả 2 nhãn đo thật và từ chối near-match; test đỏ→xanh, suite **84/84**, session-check xanh. Bằng chứng mới `evidence/F4-selector-drift-add-2-live-20260828.json`; cần Đức reload Extension lần nữa rồi mới retry live trên cùng tài khoản hết credit.
- 2026-08-28 · `claude-flow-2` · Retry live sau reload xác nhận selector `add_2 Create` đã nạp: đúng 1 `JOB_START`, 1 `PROMPT_SUBMITTED`, 0 retry; 7 video không đổi sau 60 poll/300s. Lần này Flow không tái hiện nút `Upgrade`, nên không tuyên bố matcher quota đã được live-confirm; hậu-submit `NO_NEW_VIDEO` được giữ mơ hồ, không gán quota. Reconcile còn chờ nên operator gọi `run.stop` fail-closed, checkpoint `v02`, job `FAILED / USER_STOP`, không job thứ hai. Bằng chứng thêm mới `F4-credit-limit-final-live-*`; bước tiếp theo Đức đổi sang tài khoản đủ credit để chạy một job thành công xác nhận toàn đường sửa.
- 2026-08-28 · `claude-flow-2` (Codex điều phối) · **BÀN GIAO WIP CHO CLAUDE CODE THEO LỆNH ĐỨC.** Từ điểm bắt đầu Image mode, chạy đúng 1 job qua `jobs.add` → `run.trial`, `max_retries=0`: runner chọn nhầm nút `add_2 Create` cấp trang, mở bảng media thay vì submit composer; prompt còn nguyên, 0 video/ảnh mới. Đã gọi `run.stop`; ledger cuối: run `20260828-0147-bridge-2026-08-28t01-47`, Q001/attempt `attempt-mtcam66t-1-dzin5d2p`, `STOPPED / USER_STOP`, `attempt_phase=SUBMITTED` do race lúc dừng, `retry_count=0`, `decision_reason=NO_NEW_VIDEO`. Bằng chứng thêm mới: `evidence/F4-image-mode-live-*` (file params đầu tiên ghi request invalid cũng phải giữ nguyên vì `evidence/` chỉ-thêm). Nguyên nhân code: `findCreateButton(root)` quét toàn trang; cần khóa vào form chứa đúng một composer và tiền kiểm `runtime_contract` trước mọi mutation của trial vì Bridge đã dao động runtime/profile. Một phiên Codex CLI mới chỉ kịp thêm 3 test regression rồi bị ngắt theo lệnh Đức; implementation fingerprint chưa có. Hiện test đích **ĐỎ**: `flow-video-safety-behavior.mjs` (line 217), `bridge-run-trial-smoke.mjs` (thiếu `REQUIRED_FLOW_RUNTIME_CONTRACT`), `bridge-dom-probe-static.mjs` (thiếu `FLOW_RUNTIME_CONTRACT`). Chưa chạy full suite/session-check sau test đỏ; không commit/push. Claude phải claim package, giữ nguyên WIP/unrelated dirt, hoàn thiện code + test, audit độc lập PASS, rồi mới nhờ Đức reload Extension và thử lại tối đa 1 job, zero retry.
- 2026-08-28 · `claude-flow-create-scope` (Claude Code, tiếp quản WIP của `claude-flow-2`) ·
  **Sửa xong nguyên nhân lượt hỏng 28/08 + 5 vòng audit đối kháng, vòng cuối PASS.** Không chạy live.
  - **Nút Create giờ bị khoá vào đúng form của composer.** `findCreateButton` trước đây quét
    MỌI `<button>` toàn trang nên đã bấm nhầm nút `add_2 Create` cấp trang. Nay: phải có đúng
    MỘT composer nhìn thấy được, composer đó phải có đúng MỘT `<form>` cha, và trong form đó
    phải có đúng MỘT nút đúng nhãn đã đo. Thiếu một điều kiện = không có ứng viên = zero click.
    `generationLimitBlocker` khoá cùng phạm vi: nút `Upgrade` cấp trang không còn bị đọc thành
    hết credit; và 2 nút Create = MƠ HỒ chứ không phải hết credit (audit vòng 1).
  - **Vân tay runtime.** content.js khai `FLOW_RUNTIME_CONTRACT = "flow04-image-video-create-scope-v1"`;
    `diagnostics.dom_probe` trả `runtime_contract` + `composer_scope_resolved` + mỗi nút kèm
    `chain` và `in_composer_form` (soi được phạm vi selector từ bằng chứng). `run.trial` gọi
    dom_probe TRƯỚC TIÊN và từ chối `VALIDATION_FAILED / RUNTIME_CONTRACT_MISMATCH` trước khi
    ghi history, đổi state, hay khởi chạy. **Giới hạn nói thẳng:** phép kiểm này nằm TRONG panel
    nên chỉ bắt được "tab chưa F5"; extension cũ thì panel cũng cũ, không có phép kiểm nào để
    chạy. Bù bằng quy trình vận hành bắt buộc, đã ghi vào `AI-OPERATOR-GUIDE.md`.
  - **Bốn lỗi thật do audit tìm thêm, đã sửa:** (a) composer được lấy TRƯỚC lúc đổi mode và
    TRƯỚC lúc gắn ảnh — React remount là mất tham chiếu, gõ vào hư không rồi bấm Create của
    form mới với prompt RỖNG (15 credit cho không); nay lấy SAU mọi bước đụng DOM, ngay trước
    khi gõ. (b) `ensureFlowVideoMode` kiểm CAPTCHA/quota SAU khi phán mode, nên CAPTCHA trên
    trang lạ mode ra `WRONG_GENERATION_MODE` → phân loại `OTHER` → **được retry**; nay hard-stop
    đứng trên mọi câu hỏi về mode. (c) `waitForSendButtonReady` chỉ đưa security vào `sendReady`
    chứ không ném, nên CAPTCHA đến muộn hết giờ thành thông báo chung cũng retryable; nay ném
    `HARD_STOP` đối xứng với `LIMIT_STOP`. (d) mode chỉ được chứng minh một lần; nay chứng minh
    LẠI ngay trước cú click duy nhất.
  - **Hai kết luận của audit đã BÁC BỎ có lý do** (ghi lại để phiên sau khỏi làm lại): fallback
    quét chữ quota toàn trang là lớp bảo vệ CỐ Ý (chữ quota thật của Flow chưa đo được, gỡ đi là
    làm yếu hard-stop); và "waitUntil không kiểm blocker" là SAI — hàm đó ném cả HARD_STOP lẫn
    LIMIT_STOP mỗi vòng lặp.
  - Suite **84/84 xanh**. **8 phép mutation đều làm suite ĐỎ** (trong đó có "xoá call site" của
    cả hai lớp bảo vệ mới) — pin không phải đồ trang trí. `node --check` + `git diff --check` xanh.
    session-check xanh. Audit: Codex phiên mới mỗi vòng, 5 vòng, vòng 5 **PASS**. AGY vẫn hỏng
    headless nên không dùng.
  - Bằng chứng mới: `evidence/F4-create-scope-fix-audit-20260828.json`. Mở thêm backlog **F-11**
    (nhãn Image mode khớp chính xác một chuỗi — fail-closed cố ý, muốn nới phải đo trước) và
    **F-12** (khe hẹp remount giữa lúc gõ xong và lúc click).
  - **Việc tiếp theo (1):** Đức reload Extension + F5 tab Flow. Rồi phiên sau gọi `dom_probe`,
    xác nhận `runtime_contract = flow04-image-video-create-scope-v1` và `composer_scope_resolved = true`,
    **chỉ khi đó** mới thử live lại tối đa 1 job, `max_retries=0`, không bypass quota/CAPTCHA.
  - Còn mở: `evidence/F1-snapshot-7-high-demand-banner-20260827.json` vẫn là vỏ lỗi
    EXECUTOR_UNAVAILABLE, chưa commit và chưa xoá — `evidence/` chỉ-thêm nên chờ Đức quyết.
    STATUS/DASHBOARD cần `_root`, phiên khác đang giữ, nên lượt này không đụng.

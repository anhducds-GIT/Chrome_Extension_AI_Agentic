# 20260828 ChatGPT Text Reasoning R01 — Claude Code Handoff

## 1. Trạng thái ngắn

- Đức yêu cầu Codex **dừng và handoff** ngày 2026-08-28.
- Toàn bộ thay đổi hiện **chưa commit, chưa push, chưa chạy live pilot**.
- Static implementation đã hoàn tất; `npm.cmd test` xanh, trong đó worker **94/94**.
- `node scripts/session-check.mjs --as codex-chatgpt-text-reasoning-1` đã **XANH TOÀN BỘ** trước handoff.
- Pass B đầu tiên: **REVISE** vì hai test còn structural và thiếu HANDOFF log. Cả ba điểm đã sửa.
- Pass B refresh đang chạy thì Đức yêu cầu dừng; auditor bị interrupt, nên **chưa có verdict cuối**.
- Trần tuyên bố trung thực hiện tại: **static complete, live owner-profile unverified**.

## 2. Mục tiêu không được đổi

1. Extension ChatGPT phục vụ cả `text_reasoning` và `image_generation`.
2. Job cũ thiếu `task_type` vẫn mặc định `image_generation`.
3. Text phải đi qua cùng pre-send reservation/exact-once boundary, nhưng không download/reconcile ảnh.
4. Text chỉ SUCCESS sau khi Result XLSX được ghi và xác minh; lưu nguyên văn, số ký tự và SHA-256.
5. Nếu đã nhận text nhưng checkpoint lỗi: halt/INTERRUPTED, **không resend**.
6. Vá lỗi pre-send `PERSISTENCE_FILENAME_MISMATCH` bằng một background transaction giữ reservation sống qua lúc gọi `chrome.downloads.download`.

Không mở lại luật retry/halt/exact-once. Không thêm permission. Không chạm Gemini/Flow/root/protected evidence.

## 3. Những gì đã triển khai

- `text-output-core.js`: enum task, capture text, ledger/audit fields, `verifiedTextTransition` dùng chung giữa panel và behavioral test.
- `sidepanel.html` / `sidepanel.js`: Quick Prompt mặc định Reasoning text; task-aware queue/rerun; text dispatch và verified checkpoint.
- `content.js`: receiver `DAC_RUN_TEXT_JOB`, dùng đường `runPrompt(..., expectImage=false, ...)` và attempt identity.
- `runner-core.js`, `resume-core.js`, `xlsx-codec.js`: task propagation, dynamic column, text resume proof.
- `bridge-core.js`, `bridge-proposal-core.js`: task type cho add/update/proposal; Bridge read không lộ `response_text`.
- `background.js`: `DAC_DOWNLOAD_ARTIFACT` gom reserve → download → completion → byte verification trong một turn của service worker.
- `output-location-core.js`: xác minh leaf Chrome trả về theo collision policy.
- README, XLSX contract, file map và HANDOFF đã cập nhật.

## 4. Test đối kháng mới

### AC-01 — filename persistence, test hành vi

`tests/persistence-download-filename-regression.mjs` chạy `background.js` trong VM với mock `chrome.downloads`, gọi listener `onDeterminingFilename`, gọi thật `DAC_DOWNLOAD_ARTIFACT`, trả completed filename dạng GUID, rồi đưa qua `DacOutputLocation.verifyDownloadedFilename` trong `DacRunnerCore.verifiedRunCheckpoint`.

Kỳ vọng đã xanh:

- reservation được listener nhận;
- completion có tên/byte thật;
- GUID bị từ chối bằng `PERSISTENCE_FILENAME_MISMATCH`;
- prompt send count bằng **0**.

### AC-02 — text transition, test hành vi

`tests/text-reasoning-mode-smoke.mjs` gọi chính `verifiedTextTransition` mà side panel sử dụng, với content/persistence callback giả.

Kỳ vọng đã xanh:

- success: gửi đúng 1 lần, Result reopen giữ exact Unicode/newlines, resume là `SAFE_COMPLETE`;
- checkpoint failure sau response: send count vẫn 1, verified hook không chạy, `persistence_verified=false`, không `SAFE_COMPLETE`.

## 5. Bằng chứng mới nhất

Chạy từ repo root:

```powershell
npm.cmd test
node scripts/session-check.mjs --as <claim-cua-claude>
git diff --check
```

Kết quả Codex đã quan sát trước handoff:

- worker: `94 passed, 0 failed, 94 total`;
- observer/session-check/dashboard/feature-parity root suites: xanh;
- session-check: XANH TOÀN BỘ;
- `git diff --check`: không lỗi whitespace.

Bridge read-only ping ngay trước handoff:

- host reachable, extension online/paired, executor available;
- ChatGPT tab `BUSY`/generating tại thời điểm ping;
- workbook đang nạp: `Quick-2026-08-28T01-43.xlsx`.

Không suy diễn ping này thành write control hay live acceptance. Extension trong Chrome có thể vẫn là code cũ cho đến khi Đức reload.

## 6. Bridge launcher ngoài repo

- `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-chatgpt\duc-auto-chatgpt.START-BRIDGE.cmd`
- `C:\WORKING ZONE\Chrome Extension Bridge\duc-auto-chatgpt\duc-auto-chatgpt.START-BRIDGE.ps1`

Host đã từng nghe ở `127.0.0.1:32147`. Không in hoặc đưa pairing token vào log/repo.

## 7. Dirty tree và quyền sở hữu

- Repo còn thay đổi của các phiên khác ở Flow và root. **Không stage/commit chúng.**
- Chỉ nhận package `workers/duc-auto-chatgpt`; đọc `.agents/claims.json` trước.
- HEAD quan sát lúc handoff: `b7a0c49a719116ce75694f2ac3b819bf934acba8`.
- Các file ChatGPT dirty/untracked trong `git status` là deliverable của run này; xem diff thay vì đoán từ danh sách.

## 8. Bước tiếp theo bắt buộc cho Claude Code

1. Đọc root `AGENTS.md`, package `AGENTS.md`, cuối `HANDOFF.md`, file này và execution ledger cùng run.
2. Claim `workers/duc-auto-chatgpt` bằng một tên phiên mới.
3. Audit lại diff hiện tại; không tái thiết kế.
4. Chạy lại hai test mới, `npm.cmd test`, `git diff --check`, rồi session-check bằng claim của Claude.
5. Dùng auditor độc lập để trả PASS/REVISE/REJECT theo Acceptance Contract trong execution ledger.
6. Nếu static PASS, báo rõ **live unverified**. Chỉ reload/chạy một live text trial sau khi Đức nói rõ đồng ý.
7. Chỉ commit/push khi trọn vẹn + audit PASS + session-check xanh; dùng `safe-push.mjs`, không dùng `git push` trần.

## 9. Prompt copy cho Claude Code

```text
Đọc AGENTS.md ở gốc repo trước. Sau đó đọc workers/duc-auto-chatgpt/v0.1.0/AGENTS.md, cuối HANDOFF.md, drafts/20260828-chatgpt-text-reasoning-r01.CLAUDE-HANDOFF.md và drafts/20260828-chatgpt-text-reasoning-r01.EXECUTION-RUN.md. Claim đúng package ChatGPT rồi tiếp quản run hiện tại từ working-tree diff; không làm lại từ đầu, không mở rộng scope, không chạm Flow/root/evidence. Chạy refreshed independent Pass B cho bản vá text_reasoning + atomic artifact filename persistence; nếu có finding thì chỉ sửa finding trong acceptance contract và ghim test. Chạy npm.cmd test, git diff --check, session-check. Không chạy live pilot, không thêm permission, không đổi retry/halt/exact-once nếu Đức chưa duyệt. Không commit/push cho tới khi audit PASS và cổng xanh; khi đủ điều kiện dùng safe-push.mjs, tuyệt đối không git push trần.
```

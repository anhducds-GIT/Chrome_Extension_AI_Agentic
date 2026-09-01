# ORCH-01B — FINAL EVIDENCE MICRO-PROOF

> 2026-08-27 · phiên `claude-platform-orchestrator-study` · tiếp ORCH-01, vẫn evidence-only.
> Không sửa extension, không schema/runtime mới, không pilot, không đổi luật, không commit/push.
> Thao tác ghi duy nhất: harness + bản COPY checkpoint trong scratchpad temp (`ledger-lab/`).
> File gốc không bị đụng — sha256 bản copy == bản gốc, ghi ngay dưới.

---

## A. Real-checkpoint micro-proof — PASS

**Checkpoint thật được chọn (chỉ đọc, copy sang temp):**
`workers/duc-auto-chatgpt/v0.1.0/Pilot-09_Test-Codex-Bridge-to-Extension/Duc-Auto-ChatGPT-Pilot-09__results__v09.xlsx`

**Chuỗi đã chạy trọn, dùng ĐÚNG module thật, không mô phỏng thuật toán:**
file bytes → `xlsx-codec.js` (`DacXlsx.open`) → `resume-core.js` (`checkpointValidation` + `plan`) → verdict tất định. Harness nạp module y cách test suite của repo (`run-crash-safety-smoke.mjs:22-28`): vm context + FakeDOMParser/FakeXMLSerializer + `Blob/Response/DecompressionStream/File` của Node 24.

**Kết quả (metadata-only, không prompt/output):**

| Trường | Giá trị |
|---|---|
| sha256 (bản gốc == bản copy) | `153f24d49a3c506c76fdc1c711d56cda6697b4684b6871f9d262e3e512831703` |
| run_id | `20260824-0652-duc-auto-chatgpt-pilot-09` · provenance `persisted` |
| Version từ filename / từ config | 9 / "9" — **khớp** |
| `checkpoint_filename` trong config | đúng bằng leaf của file — **tự nhất quán** |
| `checkpointValidation.ready` | **true**, 0 finding |
| plan_summary | total 4 · completed 1 · safe_pending 0 · failed 1 · **ambiguous_submitted 2** |
| job states | P09-01 AMBIGUOUS · P09-02 AMBIGUOUS · P09-03 SAFE_COMPLETE · P09-04 SAFE_FAILED |
| next_eligible_job | P09-04 (SAFE_FAILED — chỉ chạy lại có chủ đích) |
| resume verdict | **`ready: false`, blocker `RESUME_AMBIGUOUS_SUBMISSION`** |

Verdict "chặn resume" là **đúng đắn về nghiệp vụ** — checkpoint pilot này thật sự có 2 attempt
mơ hồ. Máy fail-closed đúng trên dữ liệu thật, không phải trên fixture.

**Hai phát hiện phụ có giá trị cho implementation sau này (ghi lại, KHÔNG sửa gì):**

1. **Bẫy wiring vm:** `resume-core.js:76` tra `globalThis.DacCheckpointCore`, module lại gắn
   vào `window` — trong browser `window === globalThis` nên chạy; trong vm phải alias
   `globalThis[k] = window[k]` sau khi nạp, không thì `checkpointValidation` báo oan
   `RESUME_LEDGER_INVALID` ("pattern không khớp") dù parse version vẫn đúng. Đã tái hiện cả
   hai chiều (không alias → đỏ oan; alias → sạch). Reconcile engine V0.3 PHẢI alias.
2. **Bằng chứng cho ràng buộc Downloads-mode:** checkpoint profile-mode này ghi
   `effective_result_xlsx = "Authorized folder handle: … (absolute path unavailable)/…"` —
   chính file thật xác nhận profile mode KHÔNG lưu được đường dẫn tuyệt đối. Downloads mode
   cho V0.3 không còn là sở thích, là hệ quả của evidence.

## B. Offline resume verdict

Trên checkpoint thật: **deterministic, fail-closed, không cần panel, không cần Bridge.**
`plan()` cho đủ: đếm theo phân loại, danh sách job-state, next_eligible, blocker codes.
Đây đúng là engine mà bước reconcile B0–B6 (ORCH-01) cần — **không phải viết thuật toán
resume mới, chỉ viết phần nạp-và-gọi.**

## C. Quiescence lifecycle — COUNTEREXAMPLE CÓ THẬT, WORKBOOK_NOT_LOADED bị giáng cấp

**Đường code thật [ĐỌC]:**

- `DAC_RUN_IMAGE_JOB` → `runPrompt(...)` chạy async **trong content script của TAB**
  (`content.js:931-946`). Panel chỉ là bên gửi message chờ response.
- **Panel reload/mất workbook ⇒ run LOOP chết (không gửi thêm job), nhưng attempt đang bay
  trong tab CHẠY TIẾP** tới xong/timeout; và generation phía server ChatGPT chạy tiếp bất
  kể cả panel lẫn content script.
- **Trả lời thẳng câu hỏi:** CÓ — `run.status` có thể trả `WORKBOOK_NOT_LOADED` (panel mới,
  chưa nạp workbook) **trong khi trang vẫn đang generation**. Vậy `WORKBOOK_NOT_LOADED`
  **bị loại khỏi danh sách bằng chứng quiescence độc lập** — nó chỉ chứng minh "run loop
  của panel không thể đang chạy", không chứng minh provider idle.

**State nằm ở đâu:**

| Nơi | Giữ gì | Chết khi nào |
|---|---|---|
| Panel (sidepanel.js) | workbook in-memory, queue, run loop, `state.running`, chuỗi checkpoint/audit của phiên | panel reload/đóng |
| Content script (tab) | `STATE.busy`, `activeAttempt`, `abortRequested`, watcher DOM | tab đóng / F5 |
| Trang + server ChatGPT | generation thật | không phụ thuộc extension |
| Đĩa (ledger) | reservation TRƯỚC ranh giới gửi (`sidepanel.js:5230-5232`: flushRunCheckpoint pre-send) | không chết — đây là lưới đỡ |

**Tín hiệu read-only chứng minh provider/DOM idle: CÓ THẬT** — `diagnostics.dom_probe`
(Bridge, khai `read_only: true`, "must never click/type/change focus" `content.js:789-792`)
trả về: **`busy`** (STATE.busy của content — có attempt automation đang bay trong tab),
**`stopFound`** (nút Stop của ChatGPT — trang đang generation), `attachmentPending`,
`abPollPending`, `securityBlocker`. Provider idle chứng minh được bằng
`busy:false && stopFound:false` (+ không blocker).

**Lưới đỡ tầng dưới (đã có, không phải thiết kế mới):** vì reservation được checkpoint
TRƯỚC khi gửi, mọi attempt có-thể-đang-bay đều đã nằm trên đĩa → offline `plan()` xếp nó
AMBIGUOUS → điều kiện 5 của takeover chặn. Kể cả lọt mọi lớp, `waitForChatReady` từ chối
gửi khi `generating:true` (`content.js:676`). Ba lớp độc lập.

## D. Lease takeover contract CUỐI — phép AND, đủ CẢ NĂM

```
TAKEOVER được phép ⟺
  1. lease cũ hết TTL (expires_at < now)
  2. lease cũ không còn hợp lệ cách khác (released_at đã đặt, hoặc chính là lease hết hạn ở 1;
     không bao giờ takeover lease còn sống — còn sống mà chủ mất tích thì hỏi Đức)
  3. quiescence CÓ BẰNG CHỨNG, gồm CẢ HAI vế:
       a. provider/DOM idle: dom_probe → busy:false && stopFound:false && không securityBlocker
       b. panel-loop idle:   run.status → IDLE/HALTED + current:null, HOẶC WORKBOOK_NOT_LOADED
     (vế b KHÔNG thay được vế a — counterexample mục C)
  4. offline checkpoint parse PASS: đúng file theo boundary record (run_id + filename +
     version khớp + sha256 khớp), checkpointValidation.ready = true
  5. full reconcile: đơn vị sắp chạy không dính AMBIGUOUS / INTERRUPTED / protected blocker
```

**Tín hiệu ĐỦ / KHÔNG ĐỦ:**

| Tín hiệu | Vai |
|---|---|
| dom_probe `busy:false && stopFound:false` | ĐỦ cho vế 3a |
| run.status IDLE/HALTED + current:null | ĐỦ cho vế 3b |
| `WORKBOOK_NOT_LOADED` | chỉ ĐỦ cho vế 3b (panel-loop), KHÔNG BAO GIỜ cho 3a |
| Executor/tab không trả lời | **KHÔNG là bằng chứng gì** → BLOCK, chuyển Đức |
| TTL hết, thời gian trôi, lời kể trong chat | KHÔNG BAO GIỜ là bằng chứng quiescence |

Không chứng minh được bất kỳ vế nào → **BLOCK takeover, chuyển Đức.** Takeover thành công
phải ghi log (ai, lúc nào, bằng chứng nào) vào runs.json + story log.

## E. PASS / REVISE / BLOCK

| Giả định | Phán quyết |
|---|---|
| Offline parse checkpoint thật end-to-end bằng module thật | **PASS [ĐO]** — mục A, kèm điều kiện alias globals |
| resume-core cho verdict tất định + fail-closed trên dữ liệu thật | **PASS [ĐO]** |
| `WORKBOOK_NOT_LOADED` là bằng chứng quiescence độc lập | **FAIL — loại bỏ.** Giáng xuống vế panel-loop; provider idle phải có dom_probe (mục C) |
| Có tín hiệu read-only chứng minh provider idle | **PASS [ĐỌC]** — dom_probe `busy` + `stopFound`, khai read-only trong code |
| Takeover = AND 5 điều kiện | **PASS (chốt)** — mục D |
| Downloads-mode cho V0.3 | **PASS, nay có bằng chứng từ chính file thật** (profile mode "absolute path unavailable") |

## F. Lean V0.3 — ràng buộc KHOÁ

1. Một máy duy nhất. 2. Extension: **ChatGPT**. 3. Checkpoint **Downloads mode** — profile
mode DEFER (bằng chứng mục A.2). 4. Đường dẫn thư mục tuyệt đối **xác nhận với Đức lúc tạo
Story**, ghi vào story.json. 5. AI reconcile bằng **đọc checkpoint offline** (engine mục B;
alias globals bắt buộc). 6. Ngày 2: Đức **Continue Existing Run** (chọn đúng file
ORCHESTRATOR.md nêu tên) + **bấm Run** — 2 thao tác. 7. Pilot 5 job: ngày 1 **Run Selected
3 job**, ngày 2 chạy 2 job còn lại. 8. **Cấm Stop/Abort trong pilot** (B-22 còn nguyên,
`content.js:703`). 9. Kết thúc tự nhiên, không cắt ngang.

## G. MỘT quyết định cần Đức chốt

**Cả hai micro-proof đều đạt** (offline parse PASS thật; quiescence contract đóng được bằng
tín hiệu read-only có thật). Theo điều kiện đề ra: **đề nghị Đức DUYỆT KIẾN TRÚC V0.3**
đúng bộ ràng buộc mục F + lease contract mục D — duyệt xong mới được mở implementation
(viết brief riêng, không phải file này).

## CHƯA ĐỦ EVIDENCE — còn lại, không chặn duyệt kiến trúc

1. Run Selected ghi checkpoint qua đường Downloads-mode trên MÁY ĐỨC (số đo pilot mới có).
2. Handler `ledger.read`/`run.status`/dom_probe phía **Gemini** — ngoài phạm vi V0.3, chưa đọc.
3. `run.status` khi panel mở nhưng tab đóng — không ảnh hưởng contract (rơi vào "trả lời
   được" hoặc "không trả lời → BLOCK").

## Log

- 2026-08-27 · `claude-platform-orchestrator-study` · ORCH-01B: micro-proof offline parse
  trên checkpoint thật Pilot-09 v09 (PASS, sha256 ghi trên); counterexample quiescence tìm
  thấy bằng đọc code (`WORKBOOK_NOT_LOADED` bị giáng cấp); lease contract chốt AND-5;
  V0.3 khoá ràng buộc. Harness + bản copy nằm trong scratchpad temp. Không sửa file gốc
  nào, không commit/push.

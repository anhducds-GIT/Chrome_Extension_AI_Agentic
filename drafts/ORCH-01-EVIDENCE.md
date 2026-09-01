# ORCH-01 — Báo cáo EVIDENCE-ONLY (kiểm giả định thiết kế orchestrator)

> 2026-08-27 · phiên `claude-platform-orchestrator-study` · Đức duyệt mở ORCH-01 evidence-only.
> Chỉ thao tác đọc; đúng một micro-test lockfile trong thư mục temp (scratchpad), không đụng
> production state. Không implement, không sửa extension, không commit/push.
> Nhánh được đọc: **ChatGPT v0.1.0** (mục tiêu pilot). Nhánh Gemini/Flow: chưa đọc lại từng
> handler — dòng nào suy sang nhánh khác đều ghi rõ.

---

## A. Bảng evidence

| # | Câu hỏi | Evidence (path:line) | Kết luận |
|---|---|---|---|
| 1 | `ledger.read` trả gì thật? | `sidepanel.js:1094-1108` (handler) · `:515-524` (etag + checkpointSummary) · `bridge-proposal-core.js:77-99` (sanitize + etag material) · registry `bridge-core.js:646` | [ĐỌC] Trả dữ liệu THÔ đủ để TỰ TÍNH next unit; KHÔNG trả phân loại/next có sẵn. Chi tiết mục B |
| 2 | ledger.read đọc từ đâu? | `sidepanel.js:1095` `requireBridgeWorkbook()` | [ĐỌC] Đọc workbook **in-memory của panel**. Không workbook nạp → lỗi `WORKBOOK_NOT_LOADED`. Không đọc file trên đĩa |
| 3 | Có Bridge method nạp workbook không? | registry đầy đủ trong `bridge-core.js` (22 method, [ĐO] qua feature-parity) | [ĐỌC] **KHÔNG có.** Nạp ledger ngày-2 = Đức chọn file qua panel (`resumeWorkbookInput`, `continueExistingRunBtn` — `sidepanel.js:4`) |
| 4 | Checkpoint là file mới hay ghi đè? | `sidepanel.js:4689-4744` (`assertCheckpointVersionAvailable`, `persistLedgerCandidate`) | [ĐỌC] **File bất biến MỚI mỗi version.** Trùng tên → từ chối; trùng version khác độ rộng số (v02/v002) → từ chối; trùng lịch sử Chrome Downloads → từ chối; bản ghi hỏng bị cách ly (`CHECKPOINT_PARTIAL_ABANDONED`) |
| 5 | Quan hệ run_id / version / filename | `resume-core.js:74-91` (`checkpointValidation`) · `DAC_XLSX_RUN_PLAN_V1.md` mục Continue | [ĐỌC] run_id nằm TRONG config mỗi checkpoint; `checkpoint_version` phải khớp số parse từ filename; `checkpoint_filename` + `effective_result_xlsx` phải bằng chính leaf của file. **Đổi tên file → checkpoint tự vô hiệu (fail-closed)** |
| 6 | Run Selected có ghi ledger như run thường? | `sidepanel.js:5169` (chung `run()`, chỉ khác `selectQueue`) · `:5226-5232` (reservation + pre-send checkpoint) · `:5293-5298` (`finally`: saveAuditLog + saveLedger cho MỌI mode) · `runner-core.js:230-244` | [ĐỌC] **CÓ — cùng một hàm, cùng reservation trước gửi, cùng checkpoint, cùng RUN_END.** Job không chọn giữ PENDING → SAFE_PENDING lúc resume |
| 7 | Run Selected có loại bỏ B-22 không? | `content.js:700-704`: `runPrompt()` mở đầu `STATE.abortRequested = false` | [ĐỌC] **KHÔNG.** Race còn nguyên trên đường Stop. Run Selected chỉ **né** (không dùng Stop), không sửa |
| 8 | run.status có làm tín hiệu idle/busy được không? | `sidepanel.js:564-585` | [ĐỌC] Có: `state: RUNNING/PAUSED/HALTED/IDLE` + `current{job_id, attempt_id, phase}` + counts + checkpoint. Nhưng cũng đòi workbook nạp; panel đóng → executor không trả lời. Chi tiết mục E |
| 9 | Vị trí ledger ổn định tới đâu? | `output-location-core.js:142,151` (subfolder Downloads, mặc định "Duc Auto ChatGPT") · `sidepanel.js:1026-1043` (profile handle bị thu hồi → `FOLDER_REAUTH_NEEDED`, chỉ còn `last_known_folder_hint`) · `sidepanel.js:4740-4741` (downloads trả đường dẫn thật của file) | [ĐỌC] Mục C/F |
| 10 | `wx` có atomic trên máy này? | micro-test scratchpad `wx-test.mjs`, Node v24.18.0 win32 | **[ĐO]** `{"second_open":"EEXIST","concurrent_wins":1,"concurrent_losses":["EEXIST"]}` — đúng 1 winner |

## B. Contract THỰC TẾ của `ledger.read` (nhánh ChatGPT)

**Precondition:** panel đang mở **và** workbook đang nạp (`WORKBOOK_NOT_LOADED` nếu không).
Đọc trạng thái in-memory — trong lúc run nó tươi hơn file checkpoint gần nhất.

**Params:** `cursor`, `limit` (1..100), `include_prompt`, `include_removed`.

**Payload thật:**

```
{
  ledger_etag,            // hash canonical của TOÀN BỘ material đã sanitize (in-memory)
  run_id,                 // state.runId || config.run_id || null  ← NULLABLE khi chưa run
  checkpoint: { version, filename },   // leaf, 0/null nếu chưa có checkpoint
  jobs: [ mọi cột ledger của từng job, sort key, ĐÃ LỌC:
          bỏ key bắt đầu "_", bỏ token/handle/data_url/object_url/absolute_path,
          path rút về leaf; prompt → prompt_fingerprint trừ khi include_prompt ],
  next_cursor
}
```

**Trường có thật đủ để tính next unit** (input của `resume-core.classify/plan`): `id`,
`status`, `attempt_phase`, `submitted_at`, `persistence_verified`, `result_file` (leaf),
`requested_file`, `recreate_operator_approved`, `queue_removed`, `queue_position`,
`attempt_count`, `retry_count`, `failure_type`.

**Trường V2 đã GIẢ ĐỊNH mà KHÔNG có thật:** phân loại `SAFE_*/AMBIGUOUS_SUBMITTED` tính
sẵn · `next_eligible_job` · con trỏ đường dẫn thư mục ledger. Chúng là output của
`resume-core.plan()` chạy trong panel khi Continue Existing Run — **không expose qua Bridge**.
Orchestrator muốn có thì tự chạy `resume-core` (module thuần, test suite đã nạp được trong
Node/vm) trên dữ liệu jobs — hoặc trên file checkpoint đọc từ đĩa bằng `xlsx-codec.js`.

**Suy sang Gemini:** handler cùng tên tồn tại [ĐO], nội dung CHƯA ĐỌC — không giả định giống.

## C. Stable checkpoint identity

- File checkpoint = **artifact bất biến, một file một version** (evidence A#4). Workbook
  in-memory thì đổi liên tục — **SHA-256 phải hash đúng FILE CHECKPOINT trên đĩa** (bản đã
  qua verify của `persistDirectoryCheckpoint`/downloads verify), KHÔNG hash workbook đang
  nạp, KHÔNG hash source XLSX.
- **Đừng nhầm hai identity:** `ledger_etag` của Bridge = hash trạng thái in-memory HIỆN TẠI
  (đổi mỗi mutation, dùng cho optimistic concurrency của proposal); sha256 checkpoint =
  danh tính một MỐC bất động. Boundary record dùng cái sau.
- Identity đề xuất cho verified boundary (không đổi so V2, nay có bằng chứng đỡ):
  `run_id + checkpoint filename + version + sha256(file)` — và vì extension đã ép
  metadata-tự-nhất-quán (A#5), một file bị đổi tên tự vô hiệu, không cần orchestrator chống.
- Nếu sau này gặp chế độ nào ghi đè tại chỗ (chưa thấy ở nhánh ChatGPT): identity thay thế
  là `run_id + checkpoint_version + checkpoint_created_at` đọc từ config trong file —
  ghi nhận phương án, **không implement**.

## D. operator_intent vs next_executable_unit — bỏ "plan thắng"

Ba tầng, ba chủ:

| Tầng | Chủ | Ví dụ |
|---|---|---|
| `operator_intent` | control plane (story.json) | "hôm nay chỉ ws-01" · "chạy 3 job đầu (Run Selected)" · "Đức bảo bỏ job X" · "dừng trước 17h" |
| runtime truth | ledger | job nào SAFE_PENDING, job nào AMBIGUOUS/INTERRUPTED/protected |
| `next_executable_unit` | **derived, không ai "sở hữu"** — tính lại sau mỗi reconcile | giao hai tầng trên |

**Quy tắc thay cho "plan thắng": phép GIAO (AND).** Một job chỉ được chạy khi **cả hai**
cho phép:

- **Ledger bắt buộc thắng khi nó nói KHÔNG** — không intent nào chạy được job mà ledger
  cấm (AMBIGUOUS_SUBMITTED, INTERRUPTED, protected_checkpoint). Muốn vượt phải đi cửa
  người có sẵn (Resolve/Recreate), không phải cửa orchestrator.
- **Intent bắt buộc thắng khi nó nói KHÔNG** — ledger bảo SAFE_PENDING không có nghĩa là
  chạy ngay; intent thu hẹp (chọn 3 job, hoãn, bỏ) luôn được tôn trọng. Ledger không bao
  giờ ÉP chạy.
- B6 của cây reconcile V2 sửa lại cho đúng chữ: khi field next-action trong story.json lệch
  với kết quả derive → **giá trị derive thắng field cache**, và intent vẫn nguyên vẹn ở
  tầng trên. (Cái thắng là phép tính, không phải "ledger đè plan".)

## E. Lease — takeover preconditions (sửa V2 theo phản biện)

**Rút lại hai câu của V2:** (1) "hết TTL → ghi đè không cần hỏi Đức" — SAI, thiếu điều kiện;
(2) "lease là phép lịch sự" — SAI cách đóng khung. Đúng là: **lease bảo vệ operator/DOM
concurrency** (hai operator xen kẽ lệnh trên một panel/tab làm run hỏng kiểu vận hành —
tầng ledger không nhìn thấy chuyện này), còn **exact-once của ledger bảo vệ duplicate
execution**. Hai lớp trực giao, không lớp nào thay lớp nào.

**Preconditions takeover — phải đủ CẢ BA, thiếu một là không:**

1. **Lease hết TTL** (điều kiện cần, không bao giờ đủ một mình);
2. **Runtime quiescent CÓ BẰNG CHỨNG**, một trong:
   - `run.status` trả lời và `state ∈ {IDLE, HALTED}` với `current = null` [ĐỌC A#8];
   - `run.status` trả `WORKBOOK_NOT_LOADED` — panel sống nhưng không workbook ⇒ không thể
     có run (run đòi prepared workbook, `sidepanel.js:5169`);
   - Đức xác nhận trực tiếp browser/panel đã đóng.
   **Executor không trả lời ⛔ KHÔNG phải bằng chứng quiescent** — panel có thể vẫn đang
   chạy mà bridge host chết. Trường hợp này: **BLOCK takeover**, chuyển Đức.
3. **Full reconcile B0–B6 PASS** trên ledger (đường offline đọc file checkpoint được —
   không cần panel), 0 ambiguous ở đơn vị sắp chạy.

Sau takeover: ghi log takeover (ai, lúc nào, bằng chứng quiescence nào) vào runs.json + story log.

**Cơ chế khoá:** `wx` PASS thật trên máy này [ĐO A#10] — dùng được làm nguyên thuỷ acquire
cho V0.3 single-machine.

## F. PASS / REVISE / BLOCK cho từng giả định V2

| Giả định V2 | Phán quyết | Vì sao |
|---|---|---|
| ledger.read đủ cho bản xuất boundary | **REVISE** | Đủ dữ liệu THÔ, không đủ dạng: thiếu classification/next có sẵn; đòi panel + workbook nạp. Đường chính nên là đọc FILE checkpoint offline (xlsx-codec + resume-core trong Node); ledger.read làm phép kiểm sống khi panel mở |
| Checkpoint bất biến, sha256 hash được | **PASS** | File mới mỗi version, không ghi đè, hỏng bị cách ly; hash đúng file checkpoint |
| "Plan thắng" (B6) | **REVISE** | Thay bằng intent ∩ ledger (mục D): mỗi bên thắng tuyệt đối ở chiều NÓI KHÔNG |
| Run Selected ghi ledger + terminal boundary như run thường | **PASS** [ĐỌC] | Chung `run()`, chung reservation/checkpoint/finally. B-22 KHÔNG bị loại bỏ — pilot cấm Stop/Abort, kết thúc tự nhiên sau 3 job chọn |
| Đường dẫn ledger ổn định | **REVISE** | Downloads mode: ổn (subfolder cố định dưới Chrome Downloads; đường dẫn thật lộ khi ghi). Profile mode: handle bị thu hồi sau reload (FOLDER_REAUTH_NEEDED), chỉ còn hint — orchestrator đọc đĩa bằng Node thì không vướng handle, nhưng story PHẢI khai đường dẫn thư mục tuyệt đối do Đức xác nhận một lần. File đổi tên → tự vô hiệu (tốt, khỏi chống); folder move → LEDGER_MISSING → cập nhật reference là việc người |
| `wx` atomic trên Windows | **PASS [ĐO]** | EEXIST cả tuần tự lẫn race, đúng 1 winner |
| TTL hết → tự takeover | **REVISE** | Thêm precondition quiescence + reconcile (mục E). Quiescence không chứng minh được → **BLOCK** |

## G. Lean V0.3 đã chỉnh (mức kiến trúc, không phải brief)

Thay đổi so bản lean V2, đều do evidence ép:

1. **Reconcile engine chạy OFFLINE là đường chính:** đọc file checkpoint cao nhất từ thư mục
   khai trong story.json, parse bằng `xlsx-codec.js`, phân loại bằng `resume-core.js` (cả
   hai là module thuần có ở repo [ĐO]) — không cần panel, không thêm method Bridge, dùng
   được cả lúc kiểm-trước-takeover. `ledger.read`/`run.status` là phép kiểm SỐNG khi panel mở.
2. **Thao tác ngày-2 của Đức là 2 bước, ghi thẳng vào thiết kế pilot:** mở panel → Continue
   Existing Run (chọn đúng file checkpoint mà ORCHESTRATOR.md nêu TÊN) → bấm Run. Không có
   Bridge method nạp workbook (A#3) — không giả vờ AI tự nạp được.
3. **Pilot 5 job:** ngày 1 Run Selected 3 job, kết thúc TỰ NHIÊN — **cấm Stop/Abort trong
   pilot** (B-22 còn nguyên, A#7). Ngày 2 phiên mới reconcile offline → Đức 2 bước → 2 job còn lại.
4. **Boundary record:** `run_id + filename + version + sha256(file checkpoint)` (mục C).
5. **Lease:** wx-lockfile, TTL, takeover theo preconditions mục E (BLOCK nếu không chứng
   minh được quiescence).
6. **Quy tắc next unit = intent ∩ ledger** (mục D) thay điều B6 cũ.

Danh sách IN/DEFER/OUT của V2 giữ nguyên phần còn lại (ORCHESTRATOR.md rút gọn A/B/F/G;
WORKFLOWS/ROADMAP/gate #8 defer; daemon/run.start out).

## H. MỘT quyết định Đức cần chốt sau ORCH-01

**Chốt đường resume ngày-2 của V0.3:** orchestrator reconcile bằng cách **đọc thẳng file
checkpoint trên đĩa** (không thêm method Bridge mới, không sửa extension), và Đức thao tác
đúng 2 bước trên panel (Continue Existing Run — chọn file theo tên ORCHESTRATOR.md nêu —
rồi bấm Run). Phương án ngược lại là thêm method Bridge kiểu `resume.plan`/`workbook.load`
— tức là SỬA EXTENSION, phình phạm vi và đụng luật duyệt. **Đề xuất: chốt phương án đọc đĩa.**

## CHƯA ĐỦ EVIDENCE — còn lại sau ORCH-01

1. `xlsx-codec.js` parse được file checkpoint THẬT trong Node chưa từng được chứng minh
   end-to-end ngoài vm test (test dùng fixture XLSX của pilot [ĐO tồn tại] — mức tin cao,
   nhưng chưa chạy trên một checkpoint thật của run thật).
2. Handler `ledger.read`/`run.status` bên **Gemini**: tồn tại [ĐO], nội dung chưa đọc.
3. Đường dẫn thật của thư mục profile-mode trên máy Đức (hint có sẵn nhưng phải Đức xác
   nhận một lần khi tạo story).
4. `run.status` khi panel mở nhưng tab ChatGPT đóng — hành vi chưa đọc tới; không ảnh
   hưởng preconditions (case đó rơi vào "trả lời được" hoặc "không trả lời").

## Log

- 2026-08-27 · `claude-platform-orchestrator-study` · ORCH-01 evidence-only: đọc handler
  ledger.read/run.status/run()/persistLedgerCandidate/selectQueue/content.js:703 (ChatGPT),
  resume-core + checkpoint-core (Gemini, dùng chung nguồn fork), micro-test `wx` trong
  scratchpad [ĐO PASS]. Không sửa code, không commit/push. File này là output duy nhất.

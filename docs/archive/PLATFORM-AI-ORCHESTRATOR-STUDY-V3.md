---
kind: study
status: active
ttl_days: 180
---

# AI-ORCHESTRATOR — Reasoning V3: Project Resume Protocol + Full AI Control

> 2026-08-28 · phiên `claude-platform-orchestrator-study` · REASONING ONLY.
> Không implement, không sửa file có sẵn, không commit/push.
> **Input:** ORCH-01B mục A–E được ACCEPT làm evidence (fact, không bàn lại).
> **Superseded:** mục F–G của ORCH-01B (ràng buộc "Đức bấm Continue + Run", khoá
> Downloads-mode làm target, đề nghị duyệt V0.3 cũ) — không còn là kiến trúc đích.
> **Khai thật:** prompt V3 gốc không nằm trong context phiên này; khung A→Q dưới đây do tôi
> dựng để phủ kín các yêu cầu được nêu tường minh trong chỉ thị mới nhất (pipeline 9 bước;
> canonical workspace · Project ID · state ownership · scan strategy · approval/revalidation
> · full AI extension control · reporting SSOT · shared protocol/skill · Lean V0.3 mới).

---

## A. Fact nền — mang từ ORCH-01B sang, không chứng minh lại

1. **Offline engine có thật [ĐO]:** bytes → `xlsx-codec` → `resume-core` chạy trọn trong
   Node trên checkpoint thật, verdict tất định fail-closed; identity = run_id + filename +
   version + sha256; vm phải alias `globalThis[k]=window[k]`.
2. **Checkpoint = file bất biến mỗi version [ĐỌC];** profile mode không lưu được đường dẫn
   tuyệt đối (chuỗi "absolute path unavailable" trong file thật).
3. **Quiescence:** `WORKBOOK_NOT_LOADED` chỉ chứng minh panel-loop idle; provider idle phải
   có `dom_probe` (`busy:false && stopFound:false`); executor im lặng = không bằng chứng.
4. **Lease AND-5** (TTL hết · lease cũ vô hiệu · quiescence 2 vế · offline parse PASS ·
   reconcile sạch) — giữ nguyên, nhúng vào pipeline mới ở mục K.
5. **B-22 chưa vá** trên ChatGPT (`content.js:703`); `run.trial` trần 90s (B-17); **không
   có method Bridge nào nạp workbook hay khởi động run thật** — hôm nay "full AI control"
   là CHƯA TỒN TẠI về mặt cơ khí, không phải chuyện thiếu giấy phép.

## B. Pipeline V3 — 9 bước, vai từng bước

```
1 Project Resolve   → từ lệnh của Đức, xác định project_id + canonical workspace
2 Scan/Reconcile    → quét workspace, dựng sự thật từ artifact, không tin cache
3 Preflight Report  → bản chụp tất định: đang ở đâu, định làm gì, rủi ro gì
4 Đức approve       → duyệt EXECUTION PLAN, gắn vào hash của preflight
5 Lease             → nhận quyền chạy (AND-5)
6 Revalidate        → quét lại ngay trước khi chạy; lệch so với bản đã duyệt → dừng
7 AI execution      → AI tự nạp plan + tự khởi động + giám sát (cần năng lực mới, mục L)
8 Verify            → parse offline checkpoint mới nhất, đối chiếu kỳ vọng
9 Record/Report     → Execution Record bất biến + checkpoint control-plane + view cho Đức
```

Nguyên tắc xuyên suốt: **bước 2 và 8 dùng CÙNG một engine** (offline parse — fact A.1).
Scan lúc vào và verify lúc ra không được là hai bộ luật khác nhau, nếu không hệ sẽ tự mâu
thuẫn đúng kiểu FEATURE-PARITY mục 2 vs mục 4 ngày xưa.

## C. Canonical workspace

**Chốt đề xuất: một thư mục trên đĩa cho mỗi project**, ví dụ
`<Downloads>\DAC-Projects\<project-id>\`, chứa: `project.json` (control-plane state) ·
workbook nguồn · checkpoint XLSX + audit JSONL (extension ghi thẳng vào đây qua
`output_downloads_subfolder`) · `evidence\` · `reports\`.

Vì sao đặt trên đĩa, dưới Downloads, mà không phải trong repo:

1. **Extension chỉ GHI được vào Downloads** (downloads API) hoặc thư mục được cấp handle;
   handle bị thu hồi theo phiên browser (fact A.2). Downloads là đường ghi bền duy nhất
   không cần tay người mỗi phiên.
2. **Bridge host là process local có toàn quyền đọc đĩa** — nó đọc được mọi thứ trong
   workspace. Extension ghi vào, host đọc ra: workspace là điểm gặp tự nhiên của hai plane.
3. Artifact chạy thật (ảnh, checkpoint, audit) không thuộc về git repo (nặng, riêng tư,
   và vùng bằng chứng repo là append-only có luật riêng).

**Quan hệ với repo:** repo KHÔNG còn giữ `stories/` như V2 đề xuất. Repo giữ: (a) protocol
+ engine (code, khi được duyệt implement); (b) bản sao Execution Record/Preflight đã chốt,
chép vào vùng evidence lúc git checkpoint — để GPT audit qua GitHub (memory: GPT chỉ thấy
thứ đã push); (c) `ORCHESTRATOR.md` view. **Một sự thật một nhà:** trạng thái sống ở
workspace; repo chỉ nhận bản sao bất biến có dấu thời gian + hash.

## D. Project ID

- Dạng: `P-YYYYMMDD-<slug>` (ví dụ `P-20260828-story-x`) — đọc được bằng mắt, an toàn cho
  tên file/thư mục, sort theo thời gian.
- ID xuất hiện ở: tên thư mục workspace · `project.json` · **tên workbook**
  (`P-20260828-story-x__ws01.xlsx`) — nhờ đó `run_id` (sinh từ tên workbook, fact ORCH-01)
  TỰ mang project_id mà **không đổi schema XLSX** — và trong mọi report.
- KHÔNG thêm config key `project_id` vào XLSX ở V0.3: liên kết bằng quy ước tên + ghi nhận
  hai chiều trong `project.json` (workbook nào, run_id nào, sha256 nào). Đổi schema là việc
  của extension, để dành khi có nhu cầu thật.

## E. State ownership map V3

| Thành phần | Loại | Sở hữu | Cấm |
|---|---|---|---|
| Ledger checkpoint XLSX + audit JSONL (workspace) | durable canonical — execution | job/attempt, exact-once, ranh giới đã-gửi | ý định, approval |
| `project.json` (workspace) | durable canonical — control | project identity, workstream refs, verified boundary, **approvals (hash-bound)**, execution-plan đang mở, log | bản chép hàng job; số repo đo được; trạng thái "đang chạy live" |
| Preflight Report (workspace `reports\`, bản sao vào repo khi chốt) | **generated → bị ĐÔNG LẠNH khi được duyệt** (thành record bất biến, định danh bằng sha256) | bản chụp trạng thái + kế hoạch tại thời điểm duyệt | bị regen đè sau khi duyệt — bản duyệt là bản đóng băng |
| Execution Record (workspace, bản sao vào repo) | durable record — append-only | AI đã làm gì, lúc nào, kết quả verify, checkpoint nào sinh ra | sửa hồi tố |
| `.agents/runs.json` (repo) | ephemeral coordination | lease | mọi thứ cần cho resume |
| `ORCHESTRATOR.md` (repo) | generated view | không gì | bị đọc làm input, sửa tay |

Điểm mới so V2: **Preflight Report có vòng đời hai pha** — generated khi chưa duyệt, record
bất biến sau khi duyệt. Không có pha hai thì "Đức đã duyệt gì" lại trôi về chat.

## F. Project Resolve (bước 1)

Input: lệnh của Đức ("chạy tiếp Story X" / "tạo project mới cho Story Y").
Resolve = ánh xạ lệnh → đúng một workspace: (a) project có sẵn: tìm thư mục theo
`project-id` hoặc liệt kê `DAC-Projects\*` cho Đức chọn; (b) project mới: sinh id, dựng
skeleton workspace, ghi `project.json` draft. Fail-closed: hai thư mục cùng id → dừng hỏi;
`project.json` hỏng → dừng hỏi (canonical hỏng không đoán — luật B0 cũ).

## G. Scan strategy (bước 2)

**Full scan, mọi lần, không incremental ở V0.3.** Lý do: workspace một project cỡ chục
file; giá một lần quét ~giây; còn cache-invalidation là nguồn nói dối kinh điển. Quét gì:

1. Liệt kê workbook nguồn + mọi file khớp pattern checkpoint của từng workstream.
2. Với mỗi workstream: tìm version CAO NHẤT (số version, không phải mtime — đúng semantics
   extension), phát hiện **version collision** (`cpcore.versionCollisions` có sẵn) → đỏ.
3. Offline parse checkpoint cao nhất (engine fact A.1) → classification + next unit.
4. Đối chiếu `project.json`: boundary cũ vs thực tế — lệch-tiến (ledger mới hơn) = bình
   thường, tự cập nhật có log; lệch-lùi / sha256 đổi cùng version / run_id lạ → đỏ, dừng.
5. Kiểm audit JSONL tồn tại + non-empty nếu plan khai có (đúng luật audit-continuity sẵn có).
6. Xuất **mọi** anomaly vào Preflight — scan không có quyền im lặng bỏ qua.

Scan KHÔNG đụng browser — thuần đọc đĩa. (Trạng thái sống của trang là việc của bước 6/7.)

## H. Reconcile — cây B0–B6 nhúng vào scan

Cây quyết định ORCH-01 giữ nguyên, đổi chỗ đứng: B0–B4 chạy TRONG scan (bước 2) trên đĩa;
B5 (ambiguous → halt-safety) trở thành **một dòng của Preflight** thay vì lỗi runtime —
Đức thấy trước khi duyệt, và plan được duyệt phải nói rõ xử lý ambiguous thế nào (bỏ qua
job đó / mở route Resolve-Recreate có người). B6 (next-unit lệch cache) tự sửa trong scan.
Quy tắc intent ∩ ledger (ORCH-01 mục D) giữ nguyên khi dựng execution plan.

## I. Preflight Report (bước 3)

Sinh tất định từ scan + `project.json`, gồm: trạng thái từng workstream (đếm theo
classification, next unit, blocker) · **EXECUTION PLAN đề xuất** (job nào, thứ tự, trần:
số job / thời gian / credits, điều kiện halt, hành vi với ambiguous) · anomaly · điều AI
KHÔNG tự quyết được. Chốt danh tính: **sha256 của chính file report** — approval trỏ vào
hash này. Report viết cho mắt Đức (tiếng Việt, ngắn), phần máy đọc là khối YAML/JSON kèm.

## J. Approval & Revalidation (bước 4 + 6)

- **Approve = Đức duyệt MỘT preflight cụ thể**, ghi vào `project.json`:
  `{plan_hash, scope (workstream+job set+caps), by, date}`. Duyệt trong chat vẫn được,
  nhưng phiên phải ghi record này ngay — chat không phải nơi lưu approval (luật cũ).
- **Approval trói vào trạng thái xuất phát:** fingerprint checkpoint (sha256) của
  workstream tại preflight nằm trong report. **Revalidate (bước 6, SAU lease, TRƯỚC lệnh
  đầu tiên):** quét lại; fingerprint xuất phát còn đúng → chạy; **bất kỳ đổi khác nào trên
  workstream sắp chạy → DỪNG, sinh preflight mới, xin duyệt lại.** Workstream khác đổi →
  không ảnh hưởng. Đây là chốt TOCTOU — đúng lớp lỗi audit Gate #7 và evidence_submit từng
  dính (race giữa kiểm và làm).
- Trong lúc AI đang chạy, checkpoint tiến lên là ĐÚNG KỲ VỌNG (approval trói trạng thái
  xuất phát + plan, không trói từng bước giữa chừng).

## K. Lease trong pipeline V3

Giữ nguyên contract AND-5 (fact A.4), đứng ở bước 5, với hai tinh chỉnh:

1. Quiescence (vế 3) giờ BẮT BUỘC gồm `dom_probe` — và vì bước 7 là AI tự điều khiển,
   dom_probe sẵn đường gọi rồi (không thêm chi phí).
2. Lease ghi kèm `plan_hash` đang thi hành — ai đọc runs.json biết lease này chạy plan nào.
   Takeover kế thừa plan đã duyệt CHỈ khi revalidate (bước 6) pass lại từ đầu.

## L. Full AI extension control — phân tích khoảng trống, đây là TRÁI TIM của V3

**Ba khoảng trống cơ khí, đo được, không phải chuyện xin phép suông:**

| # | Thiếu gì | Bằng chứng |
|---|---|---|
| 1 | Không method nào NẠP workbook/checkpoint vào panel | registry 22 method [ĐO], không có workbook.load; resume = file picker của người |
| 2 | Không method nào KHỞI ĐỘNG run thật | chỉ `run.trial` (90s, dev-gate); run thật = nút Run của người |
| 3 | Extension không TỰ ĐỌC lại được file từ Downloads | downloads API chỉ search metadata (`sidepanel.js:4709`); đọc nội dung cần handle (bị thu hồi theo phiên browser) hoặc picker |

**Chìa khoá kiến trúc cho #3 — không cần quyền Chrome mới:** Bridge **host** là process
local, đọc đĩa vô hạn chế. Vậy đường nạp là: host đọc file checkpoint từ workspace → đẩy
BYTES qua transport → method mới phía extension nhận bytes, parse bằng chính `xlsx-codec`
(như một File được pick). Chrome manifest không đổi một dòng.

**Bộ method tối thiểu (mức reasoning, chưa phải spec):**

- `plan.load` — nhận bytes workbook/checkpoint + tên file; parse, validate, nạp vào panel
  đúng đường Continue Existing Run hiện có (resume-core chạy như cũ). Từ chối khi run đang
  sống. Audit event riêng, ghi sha256 của bytes nhận.
- `run.start` — khởi động run thật theo plan ĐÃ NẠP, **gate bằng approval**: param mang
  `plan_hash`; extension đối chiếu hash với ledger_etag/sha256 nó đang giữ + ghi cả hash
  vào audit. Kèm trần trong-phiên (max jobs) lấy từ plan. Không có approval hợp lệ → từ chối.
- `run.continue` — biến thể resume của run.start (áp resume-plan rồi chạy phần SAFE_PENDING
  theo intent ∩ ledger).

**Điều kiện tiên quyết cứng, xếp TRƯỚC mọi method mới: VÁ B-22.** Trao quyền tự khởi động
cho AI mà lệnh dừng còn race "đã báo dừng vẫn gửi" là trao ga không trao phanh. B-22 từ
"việc mở P?" thăng cấp thành **blocker của Full AI Control trên nhánh ChatGPT** — có sẵn
bản vá mẫu + test mẫu bên Gemini (commit `a173507`), nhưng phải viết lại test race cho DOM
ChatGPT trước (đúng ghi chú backlog).

**Governance:** ba method này là năng lực mới thuộc thẳng AGENTS §2 (đổi luật an toàn +
cho AI mở lô) → **phải Đức chốt riêng, bằng chữ, trước khi viết dòng code nào.** Toàn bộ
kiến trúc còn lại của V3 (workspace, scan, preflight, lease, record) KHÔNG phụ thuộc quyết
định này — chúng chạy được cả trong chế độ "Đức bấm 2 nút" lẫn chế độ full-AI.

## M. Autonomous execution & Verify (bước 7 + 8)

- AI giám sát bằng `run.status` (poll thưa) + `dom_probe` khi bất thường; **không thêm
  chính sách retry nào ngoài runner** — halt của runner là halt, AI báo cáo chứ không lách.
- Điều kiện dừng của AI-operator: hết plan · halt cứng · chạm trần plan · Đức can thiệp.
- **Verify (bước 8) = chạy lại đúng engine scan** trên checkpoint mới nhất: mọi job trong
  plan phải terminal đúng kỳ vọng (SUCCESS có persistence_verified, FAILED đã cạn retry,
  ambiguous → liệt kê); sha256 checkpoint cuối ghi vào Execution Record. Verify fail →
  record ghi fail, KHÔNG được "làm tròn thành xong" (kiểu-nói-dối #3 của V1).

## N. Reporting SSOT (bước 9)

- **Execution Record** (append-only, mỗi run một bản trong workspace): plan_hash đã chạy ·
  thời điểm · job kết quả · checkpoint sinh ra (tên + version + sha256) · verify verdict ·
  bất thường. Nguồn để dựng nó: ledger + audit JSONL — không có dòng nào tự kể không dẫn nguồn.
- `project.json` cập nhật boundary + log một dòng.
- `ORCHESTRATOR.md` regen từ project.json các project — **view, không nguồn**.
- Git checkpoint (đóng phiên): chép Preflight-đã-duyệt + Execution Record vào vùng evidence
  repo (append-only) để GPT audit; nhịp commit theo luật V2 mục 3 (không theo nhịp job).

## O. Shared protocol / skill

- Protocol 9 bước viết MỘT LẦN thành sổ tay Tầng-2 trong repo (kiểu AI-OPERATOR-GUIDE):
  bất kỳ phiên AI nào — Claude hôm nay, AI khác ngày mai — resume một project đều đi đúng
  một cửa. Chat không bao giờ là một bước của protocol.
- Đóng gói thành skill (lệnh một phát `/project-resume`) là việc SAU khi protocol sống qua
  ≥2 lần lặp thật — đúng nguyên tắc PLATFORM.md §7 "chưa đủ lần lặp thì chưa biết hình
  dạng đúng". V0.3: sổ tay + engine script là đủ.
- Phần kiểm được bằng máy (preflight tươi? record đủ trường? approval có hash?) sau này vào
  session-check — nhưng KHÔNG nâng cổng trong V0.3 (giữ đúng quyết định defer cũ).

## P. Lean V0.3 MỚI — hai pha, ranh giới là quyết định của Đức

**V0.3a — control plane, KHÔNG đụng extension (làm được ngay sau khi Đức duyệt study):**
workspace + project.json + engine scan/preflight/verify offline (tái dùng fact A.1) +
approval hash-bound + lease AND-5 + Execution Record + ORCHESTRATOR.md rút gọn.
Execution tạm thời vẫn qua tay Đức (2 thao tác) — nay được gọi đúng tên: **chế độ quá độ**,
không phải kiến trúc đích. Pilot 5 job cross-session giữ nguyên giá trị chứng minh.

**V0.3b — full AI control, ĐỤNG extension (chỉ mở sau khi Đức chốt mục Q):**
vá B-22 (có test race DOM ChatGPT) → `plan.load` → `run.start`/`run.continue` gate theo
plan_hash → pilot full-AI: AI tự nạp, tự chạy, tự verify, Đức chỉ duyệt preflight.
Mỗi bước một checkpoint, audit độc lập, đúng nếp cũ.

**OUT (cả hai pha):** daemon/scheduler/chạy nền không phiên; nới retry/halt; incremental
scan; skill hoá; multi-machine; profile-mode làm đường chính; đổi schema XLSX.

## Q. CHƯA ĐỦ EVIDENCE + failure mode mở

1. **Trần kích thước message của transport loopback** — `plan.load` đẩy bytes XLSX (KB–MB);
   dom_probe tự cắt ở 64KB. Phải đọc transport trước khi spec `plan.load` (chunking?).
2. **Panel nhận bytes có đi được đúng đường Continue Existing Run không** — Continue hiện
   nhận File từ picker; nhận Blob từ message về lý thuyết tương đương, chưa đọc hết đường ràng.
3. **Gemini/Flow**: toàn bộ V3 mới reasoning trên ChatGPT; hai nhánh kia chưa đọc handler.
4. **Approval UX**: Đức duyệt preflight bằng kênh nào để record được hash (chat + phiên ghi
   lại, hay một nút trong panel)? Ảnh hưởng spec, không ảnh hưởng kiến trúc.
5. Prompt V3 gốc không có trong context — khung A→Q này là bản dựng lại từ chỉ thị tóm tắt.

---

## MỘT quyết định kiến trúc thực sự còn cần Đức chốt

Sau khi V3 reasoning xong, mọi thứ khác đều đã suy ra được hoặc hoãn được. Còn đúng một
điểm không ai thay Đức quyết được, vì nó là **trao năng lực thi hành cho AI** (AGENTS §2):

> **Có mở "execution-control surface" trên Bridge không:** thêm `plan.load` (bytes qua
> host) + `run.start`/`run.continue` (gate bằng plan_hash đã duyệt), với điều kiện tiên
> quyết **vá B-22 trước**, mỗi method một test ghim + audit độc lập?
>
> - **CÓ** → V0.3 chạy hai pha a→b như mục P, đích là full AI control.
> - **KHÔNG/CHƯA** → V0.3 dừng ở pha a; "Đức bấm 2 nút" từ chế độ quá độ trở thành chế độ
>   thường trực, và các phần workspace/preflight/record vẫn giữ nguyên giá trị.
>
> **Đề xuất của tôi: CÓ, theo đúng thứ tự B-22 → plan.load → run.start**, vì (a) toàn bộ
> lớp phanh nằm ở approval-hash + trần plan + runner halt sẵn có, (b) không cần quyền
> Chrome mới, (c) từng bước đều có chỗ lùi.

## Log

- 2026-08-28 · `claude-platform-orchestrator-study` · Reasoning V3 theo chỉ thị hợp nhất
  (ORCH-01B A–E làm fact; F–G cũ bị supersede). Chỉ tạo file này trong `drafts/`.
  Không sửa file có sẵn, không commit/push.

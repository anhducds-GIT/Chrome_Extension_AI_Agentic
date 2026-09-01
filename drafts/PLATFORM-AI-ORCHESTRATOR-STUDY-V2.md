# AI-ORCHESTRATOR — Reasoning V2 (trả lời 6 phản biện của GPT)

> Viết 2026-08-27, phiên `claude-platform-orchestrator-study`.
> **Trạng thái: REASONING, chưa implement.** Bản V1: `PLATFORM-AI-ORCHESTRATOR-STUDY.md`
> (giữ nguyên để đối chiếu — V2 SỬA V1 ở chỗ nào thì nói thẳng ở chỗ đó).
> GPT: APPROVE DIRECTION / REVISE ARCHITECTURE. 5 hướng giữ nguyên, 6 vấn đề phải trả lời.

---

## 1. Phân loại state — không được gọi tất cả là SSOT

V1 sai ở chỗ gom mọi thứ vào một bảng "SSOT". Bốn loại này KHÁC nhau về hệ quả khi mất,
khi lệch, và khi bị sửa tay:

| Thành phần | Loại | SỞ HỮU điều gì | CẤM chứa điều gì |
|---|---|---|---|
| **runtime ledger XLSX** | **durable canonical** (execution plane) | job/attempt, ranh giới đã-gửi, exact-once, checkpoint version bất biến, attribution artifact | ý định story, approval, bất kỳ thứ gì cross-extension |
| **story.json** | **durable canonical** (control plane) | danh tính story, goal, approvals, danh sách workstream *reference*, **verified boundary** (mục 2), next action, blockers | bản chép hàng job/attempt; lời khai "đang chạy live"; số máy đếm được từ repo; bất kỳ field nào ledger đang là chân lý |
| **runs.json** | **ephemeral coordination** | ai đang cầm quyền CHẠY workstream nào, ngay bây giờ | tiến độ, lịch sử, bất kỳ thứ gì cần cho resume. **Phép thử: xoá trắng runs.json thì không mất dữ liệu nào** — chỉ mất khoá, dựng lại được từ việc hỏi "ai đang chạy?". Không bao giờ render vào artifact commit |
| **WORKFLOWS.md** | **human planning/reference** | mô tả flow, maturity, ghi chú an toàn, link bằng chứng | số máy đếm được (method count…), trạng thái tiến độ |
| **ROADMAP.md** | **human planning/reference** | ý định NOW/NEXT/LATER | tiến độ story, số derivable — mọi thứ máy đo được |
| **ORCHESTRATOR.md** | **generated view** | **không sở hữu gì** | bị sửa tay; bị bất kỳ quy trình/tài liệu nào **đọc làm input** (view chỉ để mắt người); lease sống |

Hệ quả thực dụng của phân loại:

- Mất **canonical** = mất thật → phải có bằng chứng + quy tắc reconcile (mục 4).
- Mất **ephemeral** = phiền, không mất dữ liệu → cho phép TTL/ghi đè (mục 5).
- **View** lệch = regen, không bao giờ "sửa view".
- **Human doc** lỗi thời = chấp nhận được, vì nó khai ý định chứ không khai sự thật đo được.

## 2. Giản lược domain model — nhận phản biện, cắt

V1 đề xuất Story/Workstream + "checkpoint mức story". V2 cắt tiếp theo hướng GPT: control
plane chỉ sở hữu thứ mà KHÔNG plane nào khác giữ được.

**Mô hình entity V2 — control plane sở hữu đúng 4 thứ:**

```
Story
 ├─ danh tính, goal, status, approvals[]
 └─ Workstream reference (mỗi mảng việc)
     ├─ extension ref (đường dẫn package) + flow name (chuỗi, chưa cần catalog)
     ├─ ledger/run reference:  workbook path · thư mục ledger · run_id ·
     │                         checkpoint filename + version + sha256 (fingerprint)
     ├─ verified boundary:     "tính đến checkpoint vXX (bằng chứng E), phần đã
     │                         CHỨNG MINH xong là ...; ghi lúc <observed_at>"
     └─ next action:           MỘT đơn vị kế tiếp (job id hoặc blocker hoặc 'chờ Đức X')
```

**Run / Job / Attempt / fine checkpoint: KHÔNG phải entity control plane.** Chúng ở nguyên
execution plane; control plane chỉ cầm *reference* (run_id, checkpoint filename) — con trỏ,
không phải bản sao. So với V1: khối `checkpoint` của V1 (có `completed`, `next_job`,
`retries_note`) bị hạ cấp — các con số đếm trong verified boundary là **advisory cache cho
view**, gắn nhãn rõ, KHÔNG BAO GIỜ là input cho quyết định gửi. Quyết định gửi luôn lấy từ
`resume-core.plan()` đọc ledger thật. Field `retries_note` bỏ hẳn: retry là chuyện của
runner, control plane không được biết tới mức đó.

Phép thử đã dùng để cắt: *"nếu field này sai thì ai phát hiện, bằng gì?"* — field nào chỉ
phát hiện được bằng cách mở ledger thì field đó không được sống ở control plane quá vai
trò cache.

## 3. Checkpoint và Git — ba tầng, không commit theo nhịp job

V1 nói mơ hồ "commit ở mốc checkpoint" — dễ trượt thành commit liên tục. V2 tách ba tầng:

| Tầng | Ai ghi | Nhịp | Ghi vào đâu |
|---|---|---|---|
| **Fine-grained runtime checkpoint** | ledger (extension) | mỗi attempt / `checkpoint_interval_jobs` | XLSX ngoài repo — **git không bao giờ thấy** |
| **Durable Story checkpoint** (= cập nhật verified boundary trong story.json) | orchestrator | chỉ tại ranh giới CÓ NGHĨA: mở/đóng phiên làm story, workstream đổi trạng thái (start/pause/block/done), sau một quyết định của Đức | **working tree** — file trên đĩa, sống sót qua chết phiên dù CHƯA commit |
| **Git checkpoint** | orchestrator | kết thúc phiên/ngày · Story đổi status · cần handoff bền / GPT audit | commit + safe-push |

Điểm V2 muốn nói thẳng: **durable ≠ committed.** story.json nằm trên đĩa là đủ durable cho
kịch bản "máy chết giữa ngày" — phiên sau đọc working tree + ledger là reconcile được.
Commit là cho ba nhu cầu khác: nhìn thấy từ máy khác/GPT, lịch sử audit, và handoff chốt ngày.

**Failure mode nếu nhiều Story commit liên tục lên main** (lý do phải chặn nhịp commit):

1. **Sweep risk leo thang** — nhiều phiên chung một worktree; càng nhiều commit lắt nhắt
   càng nhiều lần safe-push phải phân xử "của ai", và càng nhiều dịp lặp lại sự cố 26/08
   (một push cuốn theo commit chưa duyệt của phiên khác).
2. **Lịch sử thành nhiễu** — 60 job = hàng chục commit "cp job N" vô nghĩa với người đọc
   lịch sử; vi phạm tinh thần "commit khi việc trọn vẹn".
3. **Regen churn** — mỗi commit đổi story.json kéo nghĩa vụ regen ORCHESTRATOR.md (nếu sau
   này có cổng freshness), tạo vòng commit-regen-commit giữa các phiên đang giữ `_root`.
4. **Push race** — hai story push xen kẽ liên tục → non-fast-forward liên tục → pull/rebase
   trong worktree chung là thao tác nguy hiểm nhất repo này có.

Luật rút ra: **git checkpoint tối đa vài lần/ngày/story, mặc định một lần lúc đóng phiên.**

## 4. Reconciliation — decision tree thay cho một câu khẩu hiệu

Nhận phản biện: "lệch → ledger thắng → hỏi Đức" vừa thô vừa làm phiền Đức oan. Cây quyết
định tối thiểu, chạy TRƯỚC mọi lệnh gửi của một phiên resume:

```
B0  Đọc story.json (schema hợp lệ?) → hỏng: HALT-HUMAN (file canonical control plane hỏng)
B1  Tìm thư mục ledger theo stable reference đã khai
      không thấy thư mục / không thấy file nào khớp pattern
      → LEDGER_MISSING: HALT-HUMAN (di chuyển file là việc vật lý, máy không tự bịa)
B2  Mở checkpoint CAO NHẤT (thủ tục sẵn có của extension: version số, không phải mtime)
      checkpoint hỏng/metadata tự mâu thuẫn → extension đã tự chặn
      (RESUME_LATEST_CHECKPOINT_INVALID) → HALT-HUMAN, không fallback
B3  So run_id ledger ↔ run_id story.json
      khác → SAI SỔ hoặc có run ngoài luồng → HALT-HUMAN (không tự nhận sổ lạ)
B4  So version + fingerprint:
      ledger.version == story.version và sha256 khớp
        → boundary XÁC NHẬN. Đi B5.
      ledger.version >  story.version
        → story STALE về phía sau — ĐÂY LÀ LỆCH LÀNH: ledger chạy thêm sau lần ghi
          boundary cuối. MÁY TỰ RECONCILE: cập nhật boundary từ ledger, ghi log, đi B5.
          KHÔNG hỏi Đức.
      ledger.version <  story.version
        → sổ bị lùi/tráo — bất thường thật → HALT-HUMAN.
      version bằng nhưng sha256 KHÁC (cùng tên file, nội dung đổi)
        → file bị sửa sau khi ghi boundary → HALT-HUMAN.
B5  Chạy resume-core.plan() trên ledger vừa xác nhận:
      có AMBIGUOUS_SUBMITTED (attempt đã-gửi-không-rõ-kết-cục)
        → HALT-SAFETY: đúng luật fail-closed sẵn có của extension. Đường thoát là
          hai route thủ công có sẵn (Resolve / Recreate) — cần người, theo governance cũ.
          Đây KHÔNG phải "hỏi Đức vì máy bí" — là luật an toàn đã chốt, giữ nguyên.
      0 ambiguous → next unit = next_eligible_job của plan.
B6  So next unit ↔ next action trong story.json: khác → plan thắng, sửa story (advisory),
    ghi log. KHÔNG halt.
```

Phân loại kết cục — đúng 4 loại đề bài yêu cầu:

- **Máy tự reconcile an toàn:** B4-forward (ledger mới hơn), B6 (next action lệch).
- **Ledger thiếu/di chuyển/hỏng:** B1, B2 → halt, cần người (thường là Đức vì đụng file hệ
  thống của Đức).
- **Attempt mơ hồ → bắt buộc halt:** B5 — theo luật an toàn CÓ SẴN, không phải luật mới.
- **Chỉ khi không phân giải được mới tới Đức:** B0, B3, B4-backward, B4-hash — các ca có
  dấu hiệu sai sổ/tráo sổ/hỏng canonical, máy không được đoán.

`observed_at` (giờ ghi boundary) chỉ dùng để BÁO độ cũ trong view — **không bao giờ** là
tiêu chí quyết định (đồng hồ nói dối được; version + fingerprint thì không).

Fingerprint = `run_id + checkpoint filename + version + sha256(file)`. sha256 là phần V2
thêm so với V1, lý do: ledger sống NGOÀI repo, không có git bảo vệ vùng bằng chứng — hash
là lớp duy nhất phát hiện sửa-tại-chỗ.

## 5. Lease — hợp đồng tối thiểu

| Câu hỏi | Chốt V2 | Vì sao |
|---|---|---|
| Khoá theo gì | **Workstream** | Story quá thô (chặn oan 2 workstream cùng story trên 2 extension); Run quá mịn (run_id chưa tồn tại trước khi chạy). Kèm **bất biến kiểm được**: hai lease sống không được cùng trỏ một extension runtime |
| Acquire atomic | KHÔNG sửa tay runs.json. Helper nhỏ (`run-lease acquire/release`) bọc read-modify-write bằng **lockfile tạo với cờ `wx`** (tạo-độc-quyền, thất bại nếu tồn tại) — nguyên thuỷ atomic rẻ nhất trên một máy | claims.json sửa tay sống được nhờ nhịp chậm; lease đổi nhanh hơn và lỗi race đắt hơn |
| Identity | nhãn phiên (đúng quy ước claims) | một quy ước danh tính cho cả repo |
| acquired_at | có | rẻ, cần cho log |
| **expires_at / TTL** | **có — TTL mặc định 12h**, acquire được gia hạn khi checkpoint | đây là cơ chế recovery duy nhất khi máy chết (thay heartbeat) |
| Heartbeat | **KHÔNG** | heartbeat = một writer chạy nền = mùi daemon; với 1 máy + ≤2 operator tương tác, TTL đủ. V1 nói "không expiry, mồ côi thì hỏi Đức" — V2 đổi: TTL tự động hoá đúng phần rẻ, vẫn giữ người cho phần đắt |
| Release | tường minh tại ranh giới an toàn (đặt `released_at`), bắt buộc lúc đóng phiên | |
| Máy/AI chết | lease hết TTL → phiên mới ĐƯỢC ghi đè **không cần hỏi Đức**, với điều kiện bắt buộc: chạy trọn cây reconcile mục 4 trước lệnh gửi đầu tiên, và ghi log takeover | an toàn nằm ở ledger (reservation-trước-ranh-giới-gửi khiến job dở thành AMBIGUOUS → tự halt ở B5), không nằm ở lease |
| Stale lease CHƯA hết TTL, chủ mất liên lạc | hỏi Đức (giữ luật giành-claim hiện hành) | |
| Phạm vi V0.3 | **MỘT MÁY DUY NHẤT** — khuyến nghị đúng một phạm vi này | multi-machine đòi khoá qua storage chung/git — over-build khi mọi phiên hiện chạy trên một máy của Đức |

Nói thẳng một điều để khỏi ảo tưởng: lease là **phép lịch sự có tổ chức**, không phải hàng
rào an toàn. Hàng rào thật là exact-once + fail-closed của ledger. Vì thế lease được phép
đơn giản (TTL, ghi đè có log) — sai lease không gây trùng-gửi, chỉ gây phiền.

## 6. Lean V0.3 — cắt tiếp

Nhận phản biện: V1 xếp 9 món vào một version là tham. Bằng chứng lõi cần chứng minh chỉ là
**một vòng cross-session resume sạch**: A tạo story → chạy vài job → dừng ranh giới an toàn
→ B (không chat cũ) đọc durable state → reconcile với ledger → đúng next unit → không trùng
→ Đức nhìn thấy trạng thái đúng.

| | Món | Lý do |
|---|---|---|
| **IN** | schema `story/v1` (entity V2, mục 2) + validator tối thiểu | không có nó thì không có durable state để B đọc |
| **IN** | runs.json + helper lease (mục 5) | chứng minh "không chạy trùng" ở tầng chủ đích |
| **IN** | thủ tục reconcile (mục 4) dạng script/checklist chạy được + bản xuất boundary (file tóm từ ledger, có sha256) | trái tim của bằng chứng |
| **IN** | generator `ORCHESTRATOR.md` **RÚT GỌN: chỉ mục A, B, F, G** (đang ở đâu · checkpoint từng story · chờ Đức · một việc tiếp theo) + `--check` | "operator nhìn thấy trạng thái chính xác" là một nửa bài toán; nhưng chưa cần mục C (flow) và E (roadmap) |
| **IN** | **pilot 3–5 job trên ChatGPT, hai phiên hai ngày** | 3–5 job chứng minh ĐỦ ngữ nghĩa resume — quy mô 60 không thêm bằng chứng gì mà ledger chưa chứng minh ở Pilot-14. Đề xuất 5 job: ngày 1 chạy 3 bằng **Run Selected** (tính năng có thật, đã xác minh [ĐỌC 26/08]) — dừng ở ranh giới TỰ NHIÊN, né hẳn race Stop-giữa-run (B-22 bên ChatGPT CHƯA vá); ngày 2 phiên B resume 2 job còn lại |
| **DEFER** | WORKFLOWS.md ×2 | pilot dùng đúng 1 flow đã biết; catalog chỉ cần khi chọn-flow thành việc thật |
| **DEFER** | ROADMAP.md | không góp gì cho bằng chứng lõi |
| **DEFER** | gate #8 (`--check-head` vào session-check) | nâng cổng là đổi luật chung — đáng làm SAU khi generator sống qua pilot, một quyết định riêng của Đức |
| **DEFER** | mục C/E của ORCHESTRATOR.md · máy đối chiếu flow↔registry | theo các món trên |
| **OUT** (không đổi so V1) | AI tự bấm Run lô thật · daemon/scheduler · hàng đợi cross-extension · sửa luật an toàn runner · web dashboard sống | |

So V1: từ "6 món + pilot 10–15 job" xuống **4 món + pilot 5 job**. Checkpoint triển khai
cũng co lại: ORCH-01 (schema+lease+reconcile+generator rút gọn, có fixture test) → ORCH-02
(pilot 2 ngày). Hết. Món deferred có việc thật kéo thì mới lên lịch.

---

## F. CHƯA ĐỦ EVIDENCE — khai thật, phải đọc trước khi implement

1. **Payload `ledger.read` qua Bridge** — mới xác nhận method TỒN TẠI [ĐO]; chưa đọc handler
   để biết nó trả đủ trường cho bản xuất boundary hay orchestrator phải tự mở file XLSX
   (repo có `xlsx-codec.js` dùng được, nhưng đường nào rẻ hơn thì chưa biết).
2. **Đường dẫn ledger ổn định ở chế độ Downloads vs profile** — stable reference của B1
   dựa trên giả định thư mục khai được; hai chế độ output có thể khác nhau về độ ổn định.
3. **Hành vi `wx`/lockfile trên máy Windows này** — nguyên thuỷ chuẩn POSIX/Node, nhưng
   phải test thật lúc viết helper (bài học BOM/PowerShell của repo: Windows hay có bất ngờ).
4. **Run Selected có ghi ranh giới ledger y hệt run thường không** — [ĐỌC 26/08] xác nhận
   nút có thật và chạy; chưa đọc xem đường ghi checkpoint có khác đường run-all ở điểm nào.
5. **`observed_at` và múi giờ** — quy ước giờ trong repo chưa thống nhất (file dùng cả ngày
   trần lẫn ISO); vô hại vì không dùng để quyết định, nhưng nên chốt một định dạng khi viết schema.

## G. MỘT quyết định cần Đức chốt

**Duyệt phạm vi V0.3 rút gọn ở mục 6** — cụ thể một câu: *"V0.3 = story/v1 + lease +
reconcile + ORCHESTRATOR.md rút gọn, chứng minh bằng pilot 5 job hai-phiên-hai-ngày trên
ChatGPT (Đức bấm Run, ngày 1 Run Selected 3 job); WORKFLOWS / ROADMAP / gate #8 lùi lại sau."*

Đức gật câu này là ORCH-01 bắt đầu được; mọi quyết định khác (gate #8, AI tự bấm Run,
multi-machine) đều đã được đẩy về sau có bằng chứng pilot.

## Log

- 2026-08-27 · `claude-platform-orchestrator-study` · Viết V2 trả lời 6 phản biện GPT.
  Chỉ tạo file này trong `drafts/`. Không sửa code, không commit/push, không đụng package nào.

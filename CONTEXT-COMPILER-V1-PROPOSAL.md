---
status: proposal-revised-after-codex-review
kind: architecture-proposal
topic: context-compiler-v1
created: 2026-09-09
revised: 2026-09-09
review_basis: "Codex independent challenge of commit 364c6932 + GPT verification against current main"
authority: none
source_draft: draft.md
note: "Bản proposal đã sửa sau phản biện độc lập. Chưa phải ADR, luật hiệu lực hay SSOT cho đến khi Đức chốt."
---

# Context Compiler V1 — Revised Proposal after Codex Review

## 0. Kết luận điều chỉnh

Codex **không bác kiến trúc**; phản biện làm rõ rằng bản trước đã gán cho Router vài trách nhiệm mà máy hiện tại không thể chứng minh.

Giữ hướng:

```text
Context Compiler — umbrella

A. Bootstrap compilation       [ĐÃ CÓ]
   Rule Compiler -> PHIEN.md

B. Read-only Context Router    [V1 NÊN BUILD]
   descriptor + evidence đúng operation
      -> resolve unit/context obligations
      -> Context Manifest

C. Continuity / compaction     [SAU]
   durable checkpoint -> carry pointers -> rehydrate
```

Nhưng V1 sửa bốn boundary lớn:

1. `PHIEN` **khớp nội dung chưa đủ**; bootstrap phải có contract `source-complete + generated-match` do Rule Compiler sở hữu.
2. Router **không phát hiện semantic conflict tổng quát**.
3. `repo.write` luôn có prerequisite claim; không mô tả flow `write -> claim` nữa.
4. Context/evidence resolve theo **versioned unit + operation evidence**, không chỉ theo `focus_scope`.

---

## 1. Router sở hữu đúng một việc

Router trả lời:

> Với operation sắp làm và evidence hiện tại, **control-plane context bắt buộc nào phải được nạp**, cho những unit nào, và evidence có đủ để xác định route hay chưa?

Router **không** trả lời:

```text
"action này đã được phép chưa?"
"rules có mâu thuẫn ngữ nghĩa không?"
"claim hiện tại có hợp lệ không?"
"commit/push có an toàn không?"
```

Các câu đó tiếp tục thuộc:

```text
Rule Compiler / Đức     -> semantic rule decisions
claim.mjs               -> write ownership tại action boundary
session-check / hook    -> commit/session gates
safe-push               -> publish gate
product guards/tests    -> domain safety
```

**Decision B1:** Context Router là loader/coverage checker, không phải authorization engine hay semantic theorem prover.

---

## 2. Bootstrap contract — `PHIEN` có ba trạng thái khác nhau

Repo hiện đã sinh package bootstrap bằng:

```text
LUAT-CORE
+ package AGENTS "Luật vàng"
+ STATUS selected fields
-> PHIEN.md
```

Nhưng generator hiện có thể để trạng thái rỗng khi `STATUS.md` thiếu. Vì vậy không dùng từ `current` cho một check mơ hồ.

### Ba khái niệm phải tách

```text
SOURCE_COMPLETE
  = các source bắt buộc cho bootstrap tồn tại và parse được

GENERATED_MATCH
  = PHIEN trên đĩa byte/semantic-match output mà cùng generator logic sẽ sinh từ source hiện tại

GATE_VERIFIED
  = các gate khác của repo đã chạy/đạt ở thời điểm riêng của chúng
```

Router chỉ cần hai cái đầu. `GATE_VERIFIED` không phải việc của Router.

### Ownership của check

**Rule Compiler phải sở hữu `validatePhien(unit)` dạng read-only/pure** hoặc export primitive tương đương:

```text
input: versioned unit
read: core + package AGENTS + STATUS + PHIEN
output:
  source_complete
  generated_match
  missing/invalid sources
```

Router **reuse** primitive đó; không gọi `rule-compile --sinh`, không viết PHIEN, không dựng fingerprint thứ hai.

### Fail policy

```text
product operation cần bootstrap
+ SOURCE_COMPLETE=false -> BLOCKED
+ GENERATED_MATCH=false -> BLOCKED: REGENERATE_REQUIRED
```

Không fallback sang `AGENTS + STATUS` ghép tay.

**Decision B2:** `PHIEN` là generated bootstrap artifact, nhưng readiness của nó phải được chứng minh bằng cùng logic sinh và đủ source, không chỉ bằng file tồn tại.

---

## 3. Unit ≠ ownership area ≠ focus

Repo có versioned unit thật, ví dụ:

```text
workers/duc-auto-gemini/v0.1.0
workers/duc-auto-gemini/v0.2.0
```

Ownership area có thể là:

```text
workers/duc-auto-gemini
```

Hai khái niệm không được nhập làm một.

### Descriptor revised

```json
{
  "schema_version": 1,
  "operation": "repo.write",
  "targets": [
    "workers/duc-scouter/v0.1.0/scripts/observer-probes.mjs"
  ],
  "role": "product",
  "orchestration": false,
  "resume": false,
  "focus_unit": "workers/duc-scouter/v0.1.0",
  "label": "sửa observer probe"
}
```

`focus_unit`:

- là mental/bootstrap focus của session;
- phải là **versioned unit identity**, không package parent mơ hồ;
- không authorize write/publish;
- không che actual target units.

### Resolve targets

Router reuse topology/unit mapping hiện có để map:

```text
target path -> versioned unit hoặc non-unit area
```

Không tự chọn "version mới nhất" hay "unit nào có PHIEN".

Nếu target nằm trong unit cũ không được first slice hỗ trợ:

```text
UNSUPPORTED_UNIT -> BLOCKED/UNSUPPORTED
```

không silently dùng PHIEN của unit khác.

**Decision B3:** context coverage resolve theo exact unit; `focus_unit` chỉ định hướng session.

---

## 4. Operation evidence là bắt buộc và khác nhau theo operation

Không còn `optional git/tool state` chung chung.

Mỗi operation có **evidence provider contract** riêng.

### `repo.read`

```text
evidence = explicit target paths hoặc explicit unit/domain target
```

### `repo.write`

```text
evidence = exact intended write paths
prerequisite = claim workflow trước lượt ghi
```

### `commit.prepare`

```text
evidence = STAGED INDEX
source = cùng semantics với `git diff --cached --name-only` / claim --soat
```

### `push.prepare`

```text
evidence = UNPUSHED COMMITS / files sẽ được công bố
source = reuse `commitChuaDay` / safe-push semantics
```

### `session.close`

```text
evidence = session-close scope theo cơ chế session-check hiện có
```

### Manifest validity

Manifest chỉ đúng cho evidence snapshot nó được resolve từ. Evidence đổi -> phải resolve lại.

Có thể thêm derived metadata sau:

```text
evidence_provider
evidence_fingerprint
```

nhưng không cần build fingerprint subsystem trước first slice.

**Decision B4:** commit, push và close-session không được dùng cùng một generic `git scope`.

---

## 5. `READY` được đổi nghĩa để không giả làm giấy phép

Bỏ status `READY` mơ hồ. V1 dùng:

```text
CONTEXT_READY
WARN
BLOCKED
UNSUPPORTED
```

`CONTEXT_READY` chỉ có nghĩa:

> Router đã xác định đủ bootstrap + mandatory context + target/evidence coverage cho operation này.

Nó **KHÔNG** có nghĩa:

```text
context đã được model đọc
model đã hiểu
claim đã được cấp
suite xanh
commit được phép
push được phép
```

Những thứ đó do adapter/action gate chứng minh sau.

**Decision B5:** Manifest là loading contract, không phải permission certificate.

---

## 6. Claim -> write — sửa flow

Luật repo hiện tại là:

```text
trước MỖI lượt ghi
-> nhận claim
-> đọc kết quả
-> mới write
```

Vì Router first slice stateless, nó không giả vờ nhớ caller đã claim ở turn trước hay chưa.

### V1 routing contract

`repo.write` luôn phải surface:

```text
prerequisite:
  claim_required: true
```

Và context bắt buộc cho write phải đủ để agent biết claim protocol. Cách đơn giản/an toàn cho V1:

```text
repo.write -> MULTIFLOW required-now
```

`claim.change` vẫn giữ cho thao tác nhận/trả/chuyển claim explicit, cũng route MULTIFLOW.

Sau này nếu runtime adapter có proof rằng prerequisite vừa được hoàn tất và protocol vẫn active, Context Delta/caching có thể tránh reload; **không tối ưu việc đó ở first slice**.

**Decision B6:** safety trước micro-optimization; không có khoảng trống `write` mà chưa route claim contract.

---

## 7. Operation taxonomy revised — bám nghĩa vụ thật của repo

Không mở enum thành mọi lệnh CLI, nhưng first slice phải cover các obligation class đang ghi trong `AGENTS.md`/protocol.

Candidate:

```text
session.start
repo.read
repo.write
claim.change
verify.run
commit.prepare
push.prepare
session.close
rule.change
handoff.maintain
project.next
platform.change
live.run
recovery.request
hnx.fetch
```

### Mapping mandatory context candidate

```text
repo.write                         -> MULTIFLOW (claim prerequisite)
claim.change                       -> MULTIFLOW
commit.prepare                     -> MULTIFLOW
push.prepare                       -> MULTIFLOW
session.close                      -> MULTIFLOW §3b + HANDOFF protocol when log/maintenance required
rule.change                        -> RULE-COMPILER
handoff.maintain                   -> HANDOFF protocol + RULE-COMPILER §5a where debt/limit semantics apply
project.next                       -> ROADMAP + what-next output contract
platform.change                    -> PLATFORM
live.run                           -> PLATFORM + domain safety context required by target
recovery.request                   -> scoped HANDOFF + current canonical bootstrap
hnx.fetch                          -> workers/hnx-fetch/PROTOCOL.md
orchestration=true                 -> ORCHESTRATOR
```

`repo.write` vào file class đặc biệt (rule/permission/platform/etc.) **không được làm mất specialized obligation**. Resolver phải derive additional obligation từ target classification hoặc caller phải dùng specialized operation; nếu ambiguity high-risk -> BLOCKED thay vì chọn operation rộng để bypass.

**Decision B7:** operation rộng không được phép hạ cấp nghĩa vụ chuyên biệt.

---

## 8. Mandatory-only Registry — giữ, nhưng test phải độc lập với registry

Giữ nguyên nguyên tắc:

> Registry chỉ catalog context **bắt buộc theo điều kiện**, không catalog mọi tài liệu hữu ích.

Candidate root file:

```text
context-registry.json
```

### Schema first slice nên cực nhỏ

Không giữ field luôn cố định chưa có biến thể thật.

Candidate:

```json
{
  "id": "protocol.multiflow",
  "source": "docs/protocols/MULTIFLOW.md",
  "triggers": [
    "repo.write",
    "claim.change",
    "commit.prepare",
    "push.prepare",
    "session.close"
  ]
}
```

Không cần ở first slice nếu mọi entry giống nhau:

```text
projection: full
authority: canonical
retain: while_operation
```

Thêm field khi xuất hiện biến thể thật.

### Missing-registry-entry problem

Nếu một entry bị xóa khỏi registry, resolver không thể tự biết nó thiếu chỉ bằng cách đọc chính registry.

Vì vậy test corpus phải **độc lập**:

```text
fixture từ nghĩa vụ thật trong AGENTS/protocol
-> descriptor/evidence
-> expected mandatory source(s)
```

Expected sources **không được generate từ registry**.

**Decision B8:** production registry là config; independent obligation fixtures là anti-omission test, không phải SSOT runtime thứ hai.

---

## 9. Multi-unit coverage

Router phải xuất rõ:

```text
focus_unit
effective_target_units
non_unit_areas
mandatory_context_by_unit_or_operation
```

### Content-changing operation

Với:

```text
repo.write
rule.change
platform.change
live.run
```

mọi impacted **supported versioned unit** cần bootstrap/context rules phù hợp với unit đó, không chỉ focus unit.

### Publish operation

Với:

```text
commit.prepare
push.prepare
```

Router phải resolve **tất cả effective units/areas từ evidence provider**.

Nhưng không nhất thiết load PHIEN của mọi commit/lane nếu package-specific product rules không phải input của publish decision. Publish mandatory context chủ yếu là MULTIFLOW; authorization vẫn do claim/session-check/safe-push.

Manifest vẫn phải **nói ra coverage** của mọi unit/area để adapter/auditor thấy không có target bị ẩn.

**Decision B9:** coverage completeness và context loading là hai việc khác nhau; không load thừa PHIEN chỉ để chứng minh đã thấy scope.

---

## 10. Semantic conflict — bỏ lời hứa quá mức

Router **không** phát hiện hai câu prose nói ngược nhau bằng semantic reasoning.

Nó được phép phát hiện:

```text
missing required source
invalid source shape
stale/mismatched generated bootstrap
unresolved exact unit
explicitly declared structural conflict
duplicate identity/path configuration
operation/evidence mismatch
```

Semantic contradiction giữa canonical prose sources:

```text
-> Rule Compiler audit / human independent review / Đức decision
```

Không dựng LLM conflict engine trong V1.

**Decision B10:** `conflicts` nếu còn trong manifest chỉ chứa conflict deterministic/explicit, không hứa semantic completeness.

---

## 11. Baseline drift hiện có là pre-implementation governance debt

Codex bắt đúng một vấn đề ngoài Router: nguồn hiện tại vẫn có wording drift về load contract.

Ví dụ:

```text
AGENTS §1: package startup chỉ PHIEN
AGENTS §8: đụng duc-auto-* phải đọc package AGENTS trước
PHIEN: package AGENTS nằm trong nhóm "cần thêm thì mở"
MULTIFLOW: phải đọc trước claim/commit/close
```

Router không được "chữa" drift này bằng cách tự chọn câu thuận tiện hơn.

### Pre-implementation requirement

Trước khi freeze routing fixtures, cần một **approved obligation table** nói duy nhất:

```text
operation / target class
-> mandatory context source
```

Bảng này phải được Đức chốt hoặc suy trực tiếp từ rule đã được Đức chốt sau khi drift được sửa.

Sau đó:

```text
AGENTS/PHIEN/protocol
-> đồng nhất với obligation table
-> fixtures pin contract đó
```

**Decision B11:** context routing không thể đáng tin hơn các canonical obligations mà nó compile.

---

## 12. Compact/resume revised

Giữ nguyên invariant:

```text
summary/carry = cache + pointers
canonical sources = authority
```

Nhưng recovery không chỉ dựa vào một `focus_unit + HANDOFF`.

### Resume input

Mọi tín hiệu continuity:

```text
resume=true
work.resume
recovery.request
```

phải normalize về cùng một recovery path.

### Rehydrate

```text
1. resolve CURRENT bootstrap của các unit đang thực sự liên quan
2. load HANDOFF/recovery source khi cần
3. refresh operation-specific evidence cho action sắp làm
4. không restore claims/suite/publish permission từ summary
```

Nếu carry nói có unit thứ hai/shared dependency thì recovery coverage phải giữ pointer tới nó; không ép mọi thứ về một focus duy nhất.

Không tạo persistent checkpoint database thứ hai.

---

## 13. Context Manifest revised

Candidate:

```json
{
  "schema_version": 1,
  "status": "CONTEXT_READY",
  "operation": "repo.write",
  "role": "product",
  "focus_unit": "workers/duc-scouter/v0.1.0",
  "evidence": {
    "provider": "explicit-targets"
  },
  "effective_target_units": [
    "workers/duc-scouter/v0.1.0"
  ],
  "non_unit_areas": [],
  "bootstrap": [
    {
      "unit": "workers/duc-scouter/v0.1.0",
      "source": "workers/duc-scouter/v0.1.0/PHIEN.md",
      "source_complete": true,
      "generated_match": true
    }
  ],
  "required_now": [
    {
      "source": "docs/protocols/MULTIFLOW.md",
      "reason": "claim prerequisite before write"
    }
  ],
  "prerequisites": [
    "claim_required_before_write"
  ],
  "warnings": [],
  "errors": []
}
```

Manifest không chứa:

```text
risk score
permission verdict
claim snapshot
suite verdict
semantic conflict claims
token estimate
vendor injection command
full context body
```

---

## 14. First slice support boundary

Khuyến nghị theo Codex và GPT:

> **First slice chỉ support versioned units đã có PHIEN contract hiện hành.**

Current `phien_goi.goi` là explicit supported set. Unit cũ/HNX/non-PHIEN flow:

```text
UNSUPPORTED hoặc route qua explicit domain operation
```

không tự đoán bootstrap.

Lý do:

- chứng minh Router trên một contract bootstrap đã ổn định trước;
- không kéo migration legacy vào cùng first slice;
- HNX có protocol riêng và bản chất task external-data khác package product session.

Mở rộng support sau bằng evidence, không bằng fallback magic.

**DECISION REQUIRED FROM ĐỨC:** approve/reject phạm vi này.

---

## 15. Revised test corpus — phải bắt được omission

### A. PHIEN readiness

1. supported unit + đủ source + generated match -> bootstrap valid.
2. PHIEN tồn tại nhưng STATUS source thiếu -> BLOCKED `BOOTSTRAP_SOURCE_INCOMPLETE`.
3. sources đổi nhưng PHIEN chưa regenerate -> BLOCKED `BOOTSTRAP_STALE`.
4. old/unsupported version unit -> `UNSUPPORTED`, không dùng PHIEN version khác.

### B. Claim/write

5. `repo.write` -> MULTIFLOW + `claim_required_before_write`.
6. `claim.change` -> MULTIFLOW.
7. write target classified là rule -> thêm RULE-COMPILER obligation hoặc BLOCKED nếu descriptor quá rộng.

### C. Evidence

8. `commit.prepare` targets phải lấy từ staged index semantics.
9. `push.prepare` targets phải lấy từ unpushed-commit semantics.
10. focus unit hẹp hơn actual publish coverage -> manifest vẫn liệt kê toàn coverage.
11. evidence provider thiếu/không đọc được ở publish -> BLOCKED.

### D. Mandatory obligations

12. `session.close` -> MULTIFLOW + HANDOFF maintenance obligations đúng contract.
13. `handoff.maintain` -> HANDOFF protocol.
14. `platform.change` -> PLATFORM.
15. `hnx.fetch` -> HNX PROTOCOL.
16. `project.next` -> ROADMAP/what-next contract.
17. orchestration -> ORCHESTRATOR.

### E. Anti-omission

18. xóa registry entry MULTIFLOW nhưng giữ independent fixture `commit.prepare -> MULTIFLOW` -> test ĐỎ.
19. xóa registry entry HNX nhưng fixture HNX còn -> test ĐỎ.

### F. Boundary/determinism

20. Router không đọc claims như context payload.
21. Router không semantic-judge prose conflicts.
22. same descriptor + same evidence + same repo state -> manifest stable.

---

## 16. Acceptance criteria trước adapter

First slice đạt khi:

1. supported operation + target-unit corpus có independent fixtures;
2. known mandatory-context omission làm test đỏ;
3. PHIEN readiness phân biệt đủ source với generated match;
4. claim-before-write không còn khoảng trống;
5. commit/push dùng đúng evidence semantics riêng;
6. multi-unit coverage không bị focus che;
7. unsupported unit fail explicit, không fallback magic;
8. Router deterministic và read-only;
9. không NLP/LLM trong routing path;
10. `CONTEXT_READY` không được dùng như permission/publish verdict.

---

## 17. Những gì bị REMOVE/REVISED sau Codex review

```text
REMOVE / REVISED
- READY như một trạng thái dễ hiểu nhầm thành "được làm"
- generic risk subsystem/score
- generic semantic conflict detection
- repo.write -> claim.change flow
- focus_scope parent package mơ hồ
- generic optional git/tool evidence
- một bootstrap focus duy nhất đủ cho mọi multi-unit content change
- assumption PHIEN file exists/matches = bootstrap fully valid
- fixed-value registry metadata chưa có biến thể thật
- test expected results sinh từ chính registry
```

Giữ nguyên các loại bỏ trước đó:

```text
- registry trong .agents/
- source_ref/rule:// ở V1
- claims projection
- LLM semantic compression
- NLP classifier first slice
- persistent carry packet song song HANDOFF
- lossy projector first slice
- Context Delta trước stateless correctness
- giant cross-runtime prompt parity
```

---

## 18. Hai decision cần Đức chốt trước khi freeze routing contract

### D1 — First-slice support boundary

**Khuyến nghị:** chỉ support `phien_goi.goi` hiện hành; legacy Gemini v0.1/HNX/non-PHIEN explicit `UNSUPPORTED` hoặc domain route riêng.

### D2 — Canonical load obligations đang drift

Cần chốt một bảng duy nhất cho các điểm đang nói lệch, đặc biệt:

```text
package startup PHIEN-only
vs
AGENTS §8 yêu cầu đọc package AGENTS khi "đụng" duc-auto

Flow package audit chung
vs
ngoại lệ "fix nhỏ" nếu vẫn còn sống
```

Router không được encode một trong hai trước khi source law được thống nhất.

---

## 19. Implementation order revised

```text
Phase 0A — Đức resolve D1/D2
Phase 0B — Claude/independent reviewer challenge bản revised này

Phase 1 — extract/reuse pure PHIEN readiness validator from Rule Compiler
Phase 2 — read-only Router + minimal context-registry + independent obligation fixtures
Phase 3 — stress-test six real flows
Phase 4 — observe context/token/latency
Phase 5 — runtime adapters
Phase 6 — continuity/compact automation
Phase 7 — optimization only from measurements
```

Không build adapter/hook trước Router correctness.

---

## 20. Final architecture after Codex challenge

```text
                    CANONICAL LAW / STATE
                             │
                             ▼
                       Rule Compiler
             sinh PHIEN + validatePhien(unit)
                             │
                             ▼
Task Descriptor + OPERATION-SPECIFIC EVIDENCE
          │                  │
          └──────────┬───────┘
                     ▼
             Read-only Context Router
        resolve exact units + obligations
                     │
          ┌──────────┼───────────┐
          │          │           │
      BOOTSTRAP   REQUIRED   COVERAGE
        PHIEN     protocols   all units/areas
          │          │           │
          └──────────┴───────────┘
                     │
              Context Manifest
      CONTEXT_READY / WARN / BLOCKED /
                UNSUPPORTED
                     │
             [V1 STOPS HERE]

ACTION-TIME ENFORCEMENT stays authoritative:
claim.mjs / commit hook / session-check / safe-push / domain guards

CONTINUITY later:
durable truth -> pointers -> compact -> rehydrate current sources + fresh operation evidence
```

## 21. Verdict

**REVISE accepted. Architecture survives; contracts are narrower and more testable.**

Codex's strongest contribution is the distinction between:

```text
context coverage
vs
action authorization
vs
semantic correctness
```

V1 should prove only the first one. Anything else remains with the machine/human authority that already owns it.

---
status: proposal-ready-for-independent-review
kind: architecture-proposal
topic: context-compiler-v1
created: 2026-09-09
authority: none
source_draft: draft.md
note: "Bản đã audit/gộp/trim từ draft reasoning của Đức + GPT. Chưa phải ADR, luật hiệu lực hay SSOT cho đến khi được review và Đức chốt."
---

# Context Compiler V1 — Final Proposal for Review

## 0. Executive conclusion

Repo hiện **đã có một phần quan trọng của Context Compiler**: `Rule Compiler -> PHIEN.md` đang tạo **bootstrap context bundle** cho từng package. Vì vậy V1 không nên xây lại startup compilation.

Phần còn thiếu, và nên build trước, là một **read-only Context Router** trả lời đúng một câu:

> Với `role + focus_scope + operation + actual targets` hiện tại, control-plane context nào **bắt buộc** phải có mà bootstrap hiện tại chưa cung cấp?

Kiến trúc tổng thể nên là:

```text
CONTEXT COMPILER — umbrella

A. Bootstrap Compilation       [ĐÃ CÓ]
   Rule Compiler -> PHIEN.md

B. Conditional Context Router  [V1 NÊN BUILD]
   Task Descriptor
      -> required control context
      -> Context Manifest
      -> READY / WARN / BLOCKED

C. Continuity / Compaction     [SAU V1]
   durable checkpoint
      -> carry pointers
      -> compact/new session
      -> rehydrate từ CURRENT canonical sources
```

V1 phải **read-only, deterministic, không LLM trong đường routing, không hook/inject runtime**.

---

## 1. Problem statement

Dự án AI dài hạn có bốn loại phình khác nhau:

```text
Rules      — luật tăng, trùng, stale, conflict
Knowledge  — protocol/architecture/domain docs tăng
State      — current truth trộn narrative/lịch sử
History    — ADR/handoff/evidence/git tăng vô hạn
```

Không thể giải bài toán này chỉ bằng “trim prompt” hay “compact conversation”.

Mục tiêu là:

- startup không tăng tuyến tính theo tuổi repo;
- package mới không làm session package khác nặng lên;
- mandatory context được nạp đúng lúc;
- history không mặc định nằm trong active context;
- deterministic enforcement rời prompt khi máy có thể cưỡng chế;
- compact không biến summary thành source of truth;
- cùng semantic contract dùng được cho Claude Code / Codex / GPT / Antigravity dù native mechanism khác nhau.

---

## 2. Current repo baseline — không xây lại thứ đã tồn tại

### 2.1 Package bootstrap đã có

Contract hiện tại của repo:

```text
product session đụng một package
    -> đọc đúng <package>/PHIEN.md

system / infrastructure session
    -> đọc AGENTS.md root

orchestration mode
    -> AGENTS.md root + ORCHESTRATOR.md
```

`PHIEN.md` là artifact máy sinh từ rule/state sources của package và được coi là bundle mở phiên.

**Decision A1:** Context Compiler V1 **reuse PHIEN**, không tự ghép lại `root AGENTS + package AGENTS + STATUS`.

### 2.2 Deterministic enforcement đã có và phải giữ ngoài model context

Ví dụ:

```text
claim.mjs
session-check.mjs
safe-push.mjs
tests / permission guards
```

Các cơ chế này trả lời câu “action có được phép hay không” tốt hơn việc preload state vào prompt.

**Decision A2:** Context Router không duplicate authorization/safety gates.

---

## 3. Hai trục semantic bắt buộc giữ rõ

### 3.1 Semantic kind — thông tin LÀ GÌ

```text
rules
knowledge
state
history
```

### 3.2 Operational load class — dùng KHI NÀO

Với runtime flow hiện tại, dùng ba lớp thực tế:

```text
BOOTSTRAP
REQUIRED-NOW
DISCOVERABLE
```

#### BOOTSTRAP
Context bắt buộc để session bắt đầu đúng vai/scope.

#### REQUIRED-NOW
Context bắt buộc trước **operation hiện tại**.

Ví dụ:

```text
claim.change / commit.prepare / push.prepare -> MULTIFLOW
rule.change                                  -> RULE-COMPILER
work.resume / recovery.request               -> scoped HANDOFF
orchestration=true                           -> ORCHESTRATOR
```

#### DISCOVERABLE
Tài liệu có thể hữu ích nhưng không bắt buộc cho mọi instance của operation.

Discoverable tiếp tục do:

```text
PHIEN pointers
protocol pointers
repo-map/docs index
agent/tool retrieval
```

**Decision A3:** `context-registry.json` chỉ quản lý **mandatory conditional context**, không catalog toàn bộ “useful docs”.

---

## 4. Context Router V1 — scope chính xác

Context Router sở hữu đúng việc:

```text
INPUT
role + focus_scope + operation + actual targets

OUTPUT
bootstrap contract
+ mandatory required-now context
+ effective action scopes
+ warnings/conflicts
+ READY / WARN / BLOCKED
```

Nó **không sở hữu**:

- rule semantics;
- package startup prose;
- ownership permission;
- commit/push safety;
- source-code/workset retrieval;
- roadmap prioritization;
- product state truth;
- physical compact implementation.

**Decision A4:** giữ Router nhỏ; không biến nó thành mega-orchestrator.

---

## 5. Task Descriptor V1

Task Descriptor mô tả **operation hiện tại**, không mô tả cả workflow.

Một session có thể đi qua nhiều descriptor nối tiếp:

```text
repo.read
-> repo.write
-> claim.change
-> verify.run
-> commit.prepare
-> push.prepare
```

Candidate contract:

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
  "focus_scope": "workers/duc-scouter",
  "label": "sửa observer probe"
}
```

### Field semantics

- `operation` — required enum đóng.
- `targets` — actual physical paths nếu biết; evidence mạnh cho action scope.
- `role` — `system | product | null`.
- `orchestration` — boolean riêng; orchestration là mode, không phải vai thứ ba.
- `resume` — explicit continuity signal.
- `focus_scope` — mental/bootstrap scope của session.
- `label` — human/log only; **không tham gia routing**.

### Derived field caller KHÔNG được khai

```text
risk
scopes
triggers
required_context
runtime
context_budget
```

**Decision A5:** caller không được tự khai risk/context requirement để tránh bypass.

---

## 6. Operation taxonomy V1

First slice dùng enum đóng:

```text
session.start
work.resume
repo.read
repo.write
rule.change
claim.change
verify.run
commit.prepare
push.prepare
live.run
permission.change
recovery.request
```

Unknown operation:

```text
UNKNOWN_OPERATION -> BLOCKED
```

Không có NLP task classifier trong first slice.

**Decision A6:** NLP/LLM chỉ có thể trở thành convenience adapter sau này; không trở thành authority routing.

---

## 7. Evidence precedence

Router tin evidence theo thứ tự:

```text
actual repo/tool state
> explicit target paths
> explicit descriptor operation/mode
> focus_scope
> human label/task text
```

`focus_scope` chọn bootstrap mental model nhưng **không authorize write** và không che actual target/git state.

Ví dụ commit đang focus Scouter nhưng actual git scope gồm Scouter + `_shared` thì publish manifest phải thấy cả hai scope.

---

## 8. Bootstrap resolution

Không hand-author registry entry cho từng package.

### Product

```text
role=product + valid package focus_scope
-> resolve package PHIEN.md từ topology/unit mapping
-> validate đó là generated PHIEN artifact hiện hành
-> bootstrap = PHIEN.md
```

Nếu PHIEN missing/stale:

```text
BLOCKED hoặc yêu cầu regenerate
```

không tự fallback sang một bundle đoán tay.

### System

```text
role=system
-> bootstrap = AGENTS.md root
```

### Orchestration

```text
orchestration=true
-> bootstrap root AGENTS
-> required ORCHESTRATOR.md
```

**Decision A7:** package count không được làm registry tăng tuyến tính chỉ vì mỗi package có PHIEN riêng.

---

## 9. `context-registry.json`

### 9.1 Location

V1 đặt file ở root:

```text
context-registry.json
```

Lý do:

- vendor-neutral;
- không chiếm `.agents/` của Antigravity;
- không tạo hidden/magic namespace mới;
- không biến `docs/` thành config store;
- hiện chỉ cần một file canonical nhỏ.

### 9.2 Registry chỉ giữ mandatory conditional sources

Candidate inventory đầu tiên:

```text
ORCHESTRATOR
MULTIFLOW
RULE-COMPILER
HANDOFF scope-relative resolver
PLATFORM
HNX PROTOCOL
```

Không khai package bootstrap rules/state ở đây vì PHIEN đã sở hữu phần đó.

### 9.3 Candidate minimal entry

```json
{
  "id": "protocol.multiflow",
  "source": "docs/protocols/MULTIFLOW.md",
  "kind": "knowledge",
  "triggers": ["claim.change", "commit.prepare", "push.prepare"],
  "authority": "canonical",
  "projection": "full",
  "retain": "while_operation"
}
```

Scope-relative source như package HANDOFF có thể dùng named resolver; exact syntax là implementation detail còn mở.

### 9.4 Rule-source duplication

V1 **không dùng `source_ref`/`rule://` abstraction**.

Nếu sau này registry có canonical rule source vật lý thì validator cross-check source đó với Rule Compiler registry. Path duplication được chấp nhận nếu máy chặn drift.

---

## 10. Read-only Resolver algorithm

```text
INPUT:
Task Descriptor
+ context-registry.json
+ .repo-structure.json
+ current canonical sources
+ optional read-only git/tool state

1. validate descriptor
2. derive risk class
3. resolve bootstrap from role/focus_scope
4. resolve actual/effective targets
5. map targets -> effective action scopes
6. derive deterministic triggers from operation
7. select mandatory conditional sources
8. validate required sources exist/current
9. detect authority/context conflicts
10. apply risk-aware fail policy
11. emit deterministic Context Manifest
```

Không làm trong resolver:

```text
không write
không claim
không commit/push
không run suite
không compact
không LLM rewrite
không vendor injection
```

---

## 11. Context Manifest V1

Candidate output:

```json
{
  "schema_version": 1,
  "status": "READY",
  "operation": "repo.write",
  "risk": "WRITE",
  "role": "product",
  "focus_scope": "workers/duc-scouter",
  "effective_action_scopes": ["workers/duc-scouter"],
  "bootstrap": [
    {
      "source": "workers/duc-scouter/v0.1.0/PHIEN.md",
      "reason": "product-bootstrap"
    }
  ],
  "required_now": [],
  "warnings": [],
  "conflicts": [],
  "route_evidence": []
}
```

`status` chỉ có:

```text
READY
WARN
BLOCKED
```

Manifest không chứa:

- full transcript;
- token estimate trong first slice;
- vendor injection command;
- copied context body mặc định;
- current ownership snapshot.

Cùng repo state + cùng descriptor phải cho output deterministic.

---

## 12. Ownership/context boundary

**Không preload `.agents/claims.json` vào model context.**

Ownership được xác minh ở action boundary:

```text
trước write
-> claim.mjs --sua ...
-> đọc kết quả
```

Một claims snapshot nạp sớm có thể stale và không thay thế được enforcement thật.

General invariant:

> Nếu một sự thật chỉ cần để máy quyết “action này có được phép hay không”, ưu tiên deterministic enforcement tại action boundary thay vì preload vào prompt.

---

## 13. Conflict + fail policy

### Hard-stop examples

```text
unknown operation
missing/stale product PHIEN bootstrap
missing ORCHESTRATOR in orchestration mode
missing mandatory protocol trước high-risk operation
canonical authority conflict không có explicit override
insufficient target evidence cho write/high-risk action
```

### Warning examples

```text
cache/carry cũ khác current canonical state
optional/discoverable doc unavailable
low-risk retrieval ambiguity có canonical fallback
```

Precedence không được dùng để “nuốt” hai canonical rules cùng cấp đang nói ngược nhau.

---

## 14. Projection policy

Draft ban đầu thiết kế projector framework khá rộng. Stress-test cho thấy repo hiện **chưa cần lossy projector trong first slice** vì PHIEN đã materialize package bootstrap.

### First implementation

Chỉ cần:

```text
full
```

cho mandatory protocol.

### Khi nào mới thêm lossy projector

Chỉ khi xuất hiện source thật sự cần giảm payload và có thể chứng minh Loss Contract:

```text
accepted source shape
required fields/sections
allowed loss
parse-failure fallback
```

Projector muốn thay raw source phải có golden + mutation + unknown-shape tests.

**Decision A8:** không implement abstraction/projector chỉ vì “có thể hữu ích”.

---

## 15. Continuity / compact architecture — sau Router correctness

Compact không bắt đầu bằng summary. Nó bắt đầu bằng durable checkpoint.

```text
material durable change
    -> persist canonical truth ngay

continuity boundary
    -> carry packet nhỏ, chủ yếu pointers

compact / new session
    -> resolve CURRENT bootstrap
    -> work.resume/recovery loads scoped HANDOFF
    -> canonical current source thắng carry summary
```

### Durable events

Ví dụ:

```text
human decision accepted
state transition
ownership transition
commit created
blocker đổi next action
new durable debt/task
```

Không persist toàn bộ brainstorm/tool output chỉ vì sắp compact.

### Carry Packet

Không phải audit log và không sở hữu rule/state truth.

Candidate nhỏ:

```text
role
focus_scope
current operation/task pointer
recovery pointer
optional repo revision
```

### Runtime hooks

Vendor `PreCompact` nếu có chỉ là safety net.

Primary mechanism vẫn là:

```text
material durable event -> canonical source ngay lúc nó xảy ra
```

**Decision A9:** summary = cache; canonical source = authority.

---

## 16. Runtime adapter strategy — sau V1 read-only

Core contract chung:

```text
Task Descriptor
-> Context Manifest
```

Adapter runtime compile manifest sang mechanism native tốt nhất.

### Claude Code

Có native scoped/lazy instructions, skills và compact lifecycle hooks; có thể tự động hóa nhiều hơn sau này.

### Codex

AGENTS hierarchy mạnh; compact lifecycle hook tương đương Claude chưa được coi là guarantee.

### Antigravity

Có native rules/skills/workflows; không đặt cross-runtime registry trong `.agents/`.

### GPT Web

Retrieval/project-context driven; project memory là continuity cache, không phải repo authority.

Adapter artifacts nếu phải tồn tại chỉ được:

1. thin pointer/import; hoặc
2. generated derived artifact có drift check.

Không copy manual rồi “nhớ sync”.

---

## 17. First-slice test corpus

### Bootstrap

1. product + valid package focus -> đúng PHIEN; không raw AGENTS/STATUS bundle.
2. system -> root AGENTS.
3. orchestration=true -> root AGENTS + ORCHESTRATOR.
4. missing/stale PHIEN -> BLOCKED/regenerate requirement.

### Conditional

5. claim.change -> MULTIFLOW.
6. commit.prepare -> MULTIFLOW + effective action scopes.
7. push.prepare -> MULTIFLOW.
8. rule.change -> RULE-COMPILER.
9. work.resume/recovery -> scoped HANDOFF.

### Boundary

10. repo.write không preload claims snapshot.
11. repo.write không auto-load HANDOFF.
12. repo.write không auto-load MULTIFLOW trước khi operation chuyển claim.change.
13. orchestration không load PHIEN của mọi package.
14. actual targets/git scope thắng focus_scope trong publish risk.

### Failure + determinism

15. unknown operation -> BLOCKED.
16. mandatory source missing ở high-risk operation -> BLOCKED.
17. authority conflict -> BLOCKED.
18. same input + same repo state -> manifest stable.
19. registry source order thay đổi không làm semantics/output ordering ngẫu nhiên.

---

## 18. Acceptance criteria trước khi nối runtime adapter

Read-only Context Router chỉ được coi là đạt khi:

1. mọi operation enum có fixture happy path;
2. known high-risk failure corpus không có false-negative;
3. missing mandatory bootstrap/protocol không bao giờ `READY` cho high-risk path;
4. actual target scope không bị focus_scope che;
5. output deterministic;
6. không LLM/NLP trong đường quyết định;
7. chạy Router không write một byte vào repo/runtime.

Incident mới về routing phải sinh fixture trước/s cùng bugfix, theo triết lý gate từ lỗi thật.

---

## 19. Explicitly rejected / revised from draft

Các proposal sau **không còn nằm trong V1 final**:

```text
REJECTED/REVISED
- startup = root AGENTS + package AGENTS + STATUS raw
- registry trong .agents/
- giant registry catalog mọi useful doc
- source_ref / rule:// provider layer trong V1
- claims.scope_current model projection
- NLP/LLM task classifier trong first slice
- LLM semantic compression active rules
- persistent Carry Packet song song với HANDOFF cho mọi session
- protocol section projection trong first slice
- lossy STATUS projector trong first slice
- Context Delta trước khi stateless manifest đúng
- giant cross-runtime prompt parity
```

---

## 20. Deferred — không phải phần cần build đầu tiên

```text
V1.1+
- Context Delta: ADD / REMOVE / REFRESH / KEEP
- lossy projector framework khi có use case thật
- runtime-specific adapters
- Claude PreCompact integration
- GPT retrieval-proof mechanism
- Codex/Antigravity lifecycle automation
- token/context/latency measurement
- section-level protocol projection
- generalized source_ref cho virtual/generated source
```

---

## 21. Open implementation questions — không còn là blocker kiến trúc

1. Scope-relative source syntax cho `HANDOFF`/package protocol.
2. API/check tối thiểu để xác định `PHIEN.md` stale/current mà reuse Rule Compiler logic, không dựng fingerprint thứ hai.
3. CLI shape của read-only Context Router.
4. Registry validation nằm script riêng hay tích hợp check-bootstrap.
5. Runtime adapter cụ thể sau khi Router manifest được chứng minh đúng.

Các câu trên nên được Claude challenge trong review nhưng **không cần thêm abstraction trước review**.

---

## 22. Recommended implementation order after review

```text
Phase 0 — independent review
Claude challenge proposal này; chưa code.

Phase 1 — read-only Router
Task Descriptor + context-registry.json + resolver + manifest + fixtures.

Phase 2 — observe/measure
Dùng manifest correctness để đo actual context/token/latency theo runtime.

Phase 3 — native adapters
Claude/Codex/Antigravity/GPT adapter theo capability thật.

Phase 4 — continuity
Checkpoint/carry/rehydrate; vendor compact hooks chỉ bổ sung.

Phase 5 — optimization
Chỉ lúc có số đo mới cân nhắc projection sâu, delta caching, token budget.
```

---

## 23. Review questions for Claude

Claude reviewer không cần brainstorm lại từ đầu. Hãy tìm điểm sai/thiếu trong proposal bằng các câu sau:

1. `PHIEN.md` có đủ tư cách làm canonical generated bootstrap hay có failure mode khiến Router phải biết source bên dưới?
2. Boundary giữa Router và deterministic enforcement đã đủ sạch chưa?
3. Operation taxonomy có thiếu một action class thật của repo không?
4. `focus_scope` vs actual targets có xử đúng multi-scope publish không?
5. Mandatory-context-only registry có bỏ sót failure mode nào nguy hiểm?
6. Read-only first slice có quá nhỏ đến mức không chứng minh được giá trị, hay đây đúng là cut an toàn?
7. Có điểm nào đang duplicate Rule Compiler / MULTIFLOW / Orchestrator hiện hữu?

Reviewer phải ưu tiên **đơn giản hơn nếu vẫn giữ safety**, và nêu rõ nếu một abstraction chưa có evidence/use case thật.

---

## 24. Final architecture snapshot

```text
                      CANONICAL TRUTH
            ADR / active rules / STATUS / protocols
                              │
                              ▼
                       Rule Compiler
                ┌─────────────┴─────────────┐
                │                           │
        generated PHIEN              rule validity
       package bootstrap                   │
                │                           │
                └─────────────┬─────────────┘
                              │
                       Task Descriptor
          role + focus_scope + operation + targets
                              │
                              ▼
                    Read-only Context Router
          ┌───────────────────┼───────────────────┐
          │                   │                   │
      BOOTSTRAP          REQUIRED-NOW       DISCOVERABLE
  PHIEN / root AGENTS    mandatory protocol    pointers/retrieval
          │                   │                   │
          └───────────────────┴───────────────────┘
                              │
                      Context Manifest
                    READY / WARN / BLOCKED
                              │
                    [V1 STOPS HERE]
                              │
                   future Runtime Adapters

PARALLEL DETERMINISTIC ENFORCEMENT — ngoài model context:
claim.mjs / session-check / safe-push / tests / permission guards

CONTINUITY — sau Router correctness:
material durable change -> canonical source
compact boundary -> carry pointers
rehydrate -> CURRENT bootstrap + recovery context
```

## 25. Final decision summary

V1 proposal chốt 10 nguyên tắc:

1. Reuse `PHIEN.md`; không build startup compiler lần hai.
2. Build **read-only Context Router** trước mọi hook/injection.
3. Registry chỉ giữ **mandatory conditional context**.
4. Task Descriptor mô tả **current operation**, không cả workflow.
5. `focus_scope` chọn bootstrap; actual targets quyết action scope.
6. Deterministic authorization/enforcement **không preload vào prompt**.
7. Không NLP/LLM trong first routing path.
8. Context Manifest deterministic, status `READY/WARN/BLOCKED`.
9. Summary/carry là cache/pointer; canonical sources là authority.
10. Chỉ tối ưu sâu/token/compact sau khi routing correctness được chứng minh và đo.

**Status:** proposal đã đủ để independent reviewer challenge. Chưa implement và chưa trở thành luật hiệu lực.

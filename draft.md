---
status: draft
kind: working-proposal
topic: context-compiler-v1
created: 2026-09-09
authority: none
load_policy: do-not-auto-load
note: "Working memory giữa Đức và GPT. Không phải ADR, luật hiệu lực hay SSOT. Sẽ được audit, gộp, trim và kiến trúc lại trước khi gửi Claude reasoning."
---

# Context Compiler V1 — Working Draft

> File này giữ reasoning đang sống. Không được coi nội dung bên dưới là quyết định cuối trừ khi được đánh dấu `PROVISIONAL DECISION`; ngay cả các quyết định provisional vẫn có thể bị đảo sau audit cuối.
>
> Quy ước: `OPEN` = chưa chốt · `PROVISIONAL` = hướng đang ưu tiên · `REVISED` = proposal cũ đã bị thay · `DEFERRED` = chưa làm V1 · `REJECTED` = đã loại.

## 0. Mục tiêu

Project AI dài hạn không chỉ có vấn đề token. Bốn loại phình khác nhau phải được kiểm soát độc lập:

1. **Rules** — luật hiệu lực tăng, trùng, stale hoặc conflict.
2. **Knowledge** — protocol, architecture, domain docs tăng.
3. **State** — current truth bị trộn với narrative/lịch sử.
4. **History** — ADR, handoff, git, evidence tăng vô hạn.

Mục tiêu Context Compiler:

- AI nạp đúng context cho đúng task;
- startup không tăng tuyến tính theo tuổi repo;
- package mới không làm session package khác nặng lên;
- current state nhỏ nhưng không mất khả năng giải thích/recovery;
- compact không biến summary thành source of truth;
- cùng semantic contract dùng được cho GPT + Claude Code + Antigravity/Codex;
- deterministic rule/enforcement rời prompt khi máy có thể cưỡng chế chắc.

Chưa làm ở giai đoạn này:

- chưa đo token thực tế;
- chưa implement production Context Compiler;
- chưa thay Rule Compiler;
- chưa đổi startup contract runtime;
- chưa gửi Claude reasoning.

---

## 1. Nền hiện có trong repo

### 1.1 Rule Compiler đã có hướng đúng

Repo hiện có logic:

```text
ADR ledger
  -> append
  -> merge
  -> supersede
  -> trim
  -> compile
  -> active rules
```

Rule Compiler trả lời:

> **Luật nào còn hiệu lực?**

Context Compiler phải trả lời câu khác:

> **Task/session này cần nạp những context nào, ở projection nào, và giữ tới bao giờ?**

**PROVISIONAL:** Context Compiler nằm *trên* Rule Compiler, không thay nó.

### 1.2 Startup policy hiện tại

Contract gốc đang hướng tới:

```text
root AGENTS
-> package AGENTS
-> package STATUS
```

`HANDOFF` đã được chủ đích chuyển khỏi startup vì từng chiếm phần rất lớn hóa đơn context cũ.

### 1.3 Drift đã phát hiện

Scouter package vẫn có câu yêu cầu đọc `HANDOFF.md` ngay sau package AGENTS, trong khi root policy và `.repo-structure.json` nói HANDOFF là on-demand.

**Kết luận:** loading policy viết bằng prose ở nhiều nơi có thể tự drift. Context loading cần một representation canonical để máy kiểm được.

---

## 2. REVISED — Context có hai trục, không phải một cây

Proposal đầu tiên đã trộn:

```text
ALWAYS / SCOPED / ON_DEMAND / STATE / HISTORY
```

Cách này sai mô hình vì `STATE/HISTORY` nói *thông tin là gì*, còn `ALWAYS/SCOPED/ON_DEMAND` nói *khi nào nạp*.

### Trục A — Semantic kind

```text
rules
knowledge
state
history
```

- `rules`: invariant/constraint đang hiệu lực.
- `knowledge`: protocol, architecture, domain knowledge, runbook.
- `state`: current truth thay đổi theo thời gian.
- `history`: quá khứ/bằng chứng để audit và recovery.

### Trục B — Load mode

```text
always
scoped
on_demand
never_auto
```

Ví dụ:

```text
root AGENTS          kind=rules      load=always
package AGENTS       kind=rules      load=scoped
package STATUS view  kind=state      load=scoped
MULTIFLOW            kind=knowledge  load=on_demand
ADR ledger           kind=history    load=never_auto
```

**PROVISIONAL:** mọi context source được mô tả bằng hai trục độc lập này.

---

## 3. Control-plane Context ≠ Workset Context

Đây là ranh giới cần giữ để registry không biến thành repo-map thứ hai.

### Control-plane context

Nói AI **phải làm việc như thế nào**:

- rules;
- protocols;
- state;
- ownership;
- roadmap;
- handoff/recovery.

Context Compiler quản lý lớp này.

### Workset context

Nói AI **đang sửa/nghiên cứu cái gì**:

- source code;
- tests;
- DOM evidence;
- logs;
- screenshots;
- external docs.

Coding agent/tool retrieval quản lý workset theo task. Không đăng ký từng source file vào Context Registry.

---

## 4. Pipeline V1

```text
Canonical Sources
       ↓
    Registry
       ↓
    Resolver
       ↓
    Projector
       ↓
 Manifest + Delta
       ↓
 Runtime Adapter
       ↓
    AI Context
```

### Registry

Biết source nào tồn tại, loại gì, scope nào, khi nào cần nạp và authority của nó.

### Resolver

Nhận task descriptor và quyết source nào cần cho phase hiện tại.

Ưu tiên signal deterministic:

1. operation;
2. target path / scope;
3. session role;
4. explicit trigger;
5. task-text classification chỉ fallback.

### Projector

Không mặc định load nguyên file. Project canonical source thành view nhỏ vừa đủ.

Ví dụ:

```text
STATUS.md
 -> startup: structured frontmatter
 -> body: on-demand khi cần explanation

claims.json
 -> current scope owner/task/timestamp
 -> không load lịch sử transfer của mọi scope

HANDOFF.md
 -> tail/current item
 -> archive chỉ khi recovery

ADR
 -> relevant decision/section
 -> không load cả ledger
```

### Manifest + Delta

Không concatenate một giant prompt. Sinh kế hoạch context đang active và thay đổi giữa hai phase.

### Runtime Adapter

CC/GPT/Codex/An có đường load khác nhau nhưng dùng cùng registry/source. Adapter không được fork luật.

---

## 5. Registry schema — proposal V1

Candidate tối thiểu:

```yaml
- id: package.scouter.state
  source: workers/duc-scouter/v0.1.0/STATUS.md
  kind: state
  scope: workers/duc-scouter
  load: scoped
  trigger: touch_scope
  authority: canonical
  projection: status.frontmatter
  retain: while_scope
```

Field đang có use case thật:

```text
id
source
kind
scope
load
trigger
authority
projection
retain
```

### DEFERRED khỏi V1 nếu chưa có evidence

```text
priority
depends_on
conflicts_with
max_tokens
runtime
cost
rank
semantic_score
```

### REVISED — TTL

Không dùng TTL chung làm mặc định. File cũ không đồng nghĩa stale, file mới không đồng nghĩa đúng.

Ưu tiên refresh theo event/source revision. TTL chỉ dùng cho nguồn thật sự time-sensitive sau này.

---

## 6. Projection trước khi split storage

Một insight quan trọng: muốn giảm context không nhất thiết phải refactor vật lý source ngay.

### STATUS

Giữ file thân thiện cho người:

```text
frontmatter = current machine truth
body        = explanation/human context
```

Startup chỉ lấy `frontmatter projection`.

### claims.json

Proposal cũ từng nghĩ tới tách `claims-current.json` và history. **DEFERRED**.

V1 có thể project đúng scope:

```text
owner
task
claimed_at
```

và bỏ transfer history khỏi payload mà không đổi canonical storage hoặc audit toàn bộ consumers.

**PROVISIONAL:** projection là đòn bẩy đầu tiên; split physical storage chỉ khi có lý do độc lập ngoài token.

---

## 7. Router V1

Input candidate:

```yaml
operation: edit_code
target_paths:
  - workers/duc-scouter/v0.1.0/scripts/observer-probes.mjs
role: product
resume: false
```

Flow:

```text
1. add all load=always
2. resolve scope from target_paths
3. add scoped sources for each active scope
4. map operation -> deterministic triggers
5. add matching on-demand sources
6. apply projections
7. de-duplicate by context id
8. validate authority/conflict
9. emit manifest + delta
```

Natural-language task không phải authority chính nếu actual path/operation đã biết.

---

## 8. Multi-scope routing

Task có thể chạm:

```text
root
+ workers/_shared
+ workers/duc-scouter
```

Resolver phải:

1. resolve tất cả scope thật;
2. load root ALWAYS đúng một lần;
3. union scoped context;
4. union triggered protocol;
5. de-duplicate;
6. kiểm conflict.

Không đặt sẵn “max N scopes” nếu chưa đo. Context fan-out cao chỉ là signal rằng task có thể quá rộng hoặc shared abstraction chưa đúng.

---

## 9. Manifest và Context Delta

### Manifest ephemeral mặc định

**PROVISIONAL:** Registry commit; manifest không commit cho từng task/session.

Persist mọi manifest sẽ tạo một lớp history mới rồi chính nó phình.

Candidate:

```yaml
schema: context-manifest/v1

task:
  operation: edit_code
  scopes:
    - workers/duc-scouter

loaded:
  - id: repo.constitution
    reason: always
    projection: full
  - id: package.scouter.rules
    reason: scope
    projection: full
  - id: package.scouter.state
    reason: scope
    projection: status.frontmatter

deferred:
  - id: scouter.handoff
    trigger: resume_previous_work

conflicts: []
```

### Context Delta

Giữa hai phase:

```yaml
add: []
remove: []
refresh: []
keep: []
```

Ví dụ từ edit sang commit:

```text
add: protocol.multiflow.commit
keep: root rules + package rules + package state
```

Mục tiêu: không rebuild mental model từ đầu mỗi phase.

---

## 10. Lifecycle — logical eviction ≠ token biến mất

Một khi model đã đọc context trong conversation, compiler thường không thể lấy token đó ra ngay.

Vì vậy `evict` trong V1 có nghĩa:

> source không còn active, không re-inject và không carry qua checkpoint/compact kế tiếp.

Lifecycle logical:

```text
CANDIDATE
  -> ACTIVE
  -> RETAINED
  -> DROPPED_FROM_NEXT_CARRY
```

Physical reclaim phụ thuộc runtime:

- compact;
- new session;
- hoặc primitive riêng của vendor.

Candidate retention:

```text
root rules       -> pinned
package rules    -> while_scope
current state    -> while_scope + refresh on relevant event
protocol         -> while_operation
history excerpt  -> one_shot / until_question_resolved
workset          -> runtime/tool-managed
```

---

## 11. Compact — checkpoint trước, summary sau

Compact an toàn:

```text
ACTIVE SESSION
     ↓
CHECKPOINT
     ↓
CARRY PACKET
     ↓
COMPACT / NEW SESSION
     ↓
REHYDRATE
```

### Checkpoint

Trước compact phân loại durable information:

```text
decision durable? -> ADR / approved state
open work?        -> backlog / handoff delta
current truth?    -> canonical state
code change?      -> git
ephemeral reasoning -> không persist toàn bộ
```

Invariant:

> Không compact một quyết định quan trọng nếu nó chỉ còn tồn tại trong conversation.

### Summary

```text
summary != authority
summary = cache
```

Nếu summary nói owner=Claude nhưng canonical claims hiện owner=null thì canonical state thắng.

Sau compact, resolver phải chạy lại với **current canonical sources**, không replay summary cũ như truth.

---

## 12. Carry Packet — candidate ban đầu

```yaml
task:
scope:
phase:
open_items:
blockers:
human_decisions:
state_pointers:
active_context_ids:
recovery_pointers:
```

Không chứa toàn transcript, toàn ADR, toàn rules, toàn HANDOFF hoặc toàn tool output.

Pointer tối thiểu hiện ưu tiên:

```text
context_id + canonical source/path
```

SHA/hash vẫn `OPEN`: hữu ích cho forensic nhưng có cost. Chưa bắt mọi pointer có SHA.

---

## 13. Refresh policy

Không refresh state mỗi turn vì đó chỉ là polling latency.

Candidate event:

```text
scope_enter
relevant_write_completed
before_commit
before_high_risk_action
explicit_state_query
source_changed
```

Ví dụ claims projection invalidated bởi:

```text
claim
release
ownership_transfer
```

Có thể encode invalidation trong router/projector code thay vì thêm field vào registry V1.

---

## 14. Runtime capability boundary

Runtime khác nhau có capability khác:

```text
can_read_local_repo
can_search_repo
can_load_on_demand
can_persist_checkpoint
can_compact
can_start_clean_session
can_receive_context_pointer
```

Nhưng capability không phải authority.

Không ép mọi runtime xuống lowest-common-denominator. Dùng:

```text
shared semantic contract
+ runtime-specific adapter
```

---

## 15. Latency boundary

### Startup path

Nên chỉ:

```text
read registry/index
-> ALWAYS projection
-> resolve scope
-> SCOPED projections
-> ready
```

Không startup scan git history, toàn ADR, HANDOFF archive, full rule audit, suite, dashboard build hoặc token accounting.

### Task transition

```text
scope/operation changed
-> compute delta
-> ADD / REFRESH only
```

### Close session

`soat -> commit -> regenerate -> suite -> session-check -> safe-push` là verification pipeline, không nhập vào Context Compiler. Context Compiler có thể đọc outcome nhưng không trở thành mega-orchestrator.

---

## 16. Failure modes

### Missing registry entry

Context source tồn tại nhưng registry không biết -> invisible context.

Cần registered-source audit, nhưng không chạy mỗi prompt.

### Router false negative

Nguy hiểm hơn false positive. Với high-risk operation cần fail-closed.

Candidate high-risk:

```text
commit
push
permissions
live pilot
rule change
ownership transfer
```

### Router false positive

Load thừa -> cost/token/distraction. Không biến mọi false positive thành gate đỏ.

### Projection mất field quan trọng

Mỗi projection cần acceptance test từ canonical source -> projection.

### Stale carry packet

Rehydrate ưu tiên canonical state; carry cũ chỉ là hint/cache.

### Summary authority inversion

Nếu runtime summary thắng canonical source, kiến trúc thất bại.

---

# VÒNG 3 — Bốn contract khó

## 17. Registry nên nằm ở đâu?

Hai phương án chính:

### A. Nhét tiếp vào `.repo-structure.json`

Ưu:

- đã là machine-readable LAW/index;
- hiện có `luat.nap`, areas, generated, frozen;
- không thêm file mới.

Nhược:

- file đã mang nhiều concern;
- `_doc` và historical explanation dài;
- context registry có lifecycle riêng, có thể đổi thường xuyên hơn top-level repo structure;
- dễ biến `.repo-structure.json` thành “god manifest”.

### B. File riêng, ví dụ `.agents/context-registry.json`

Ưu:

- concern rõ: chỉ context sources/routing metadata;
- dễ schema/test/version riêng;
- thay đổi context routing không đồng nghĩa thay repo topology;
- có thể generate/validate độc lập.

Nhược:

- thêm một canonical file;
- phải tránh duplicate `luat.nap`/rule source registry hiện có.

### PROVISIONAL DECISION R3-1

**Ưu tiên file registry riêng**, nhưng không duplicate rule inventory.

Shape đề xuất:

```text
.repo-structure.json
  = topology + ownership + repo-level structural law

rule compiler registry/current `luat.*`
  = rule authority/compile metadata

.agents/context-registry.json
  = loading/routing/projection metadata
```

Context Registry **tham chiếu** rule source/group đã có thay vì khai lại danh sách rule bằng tay.

Điểm cần thiết kế sau: một `source_ref` có thể trỏ tới source đã được Rule Compiler biết, tránh hai registry drift.

---

## 18. Trigger taxonomy tối thiểu

Không nên tạo trigger theo mọi câu tiếng người. Trigger phải gần với operation có thể nhận diện chắc.

### Nhóm V1 đề xuất

```text
session.start
scope.enter
scope.leave
work.resume
code.read
code.write
rule.change
state.read
state.write
claim.change
verify.run
commit.prepare
push.prepare
live.run
permission.change
recovery.request
```

Đây vẫn có thể quá nhiều. Nên normalize thành 6 family:

```text
SESSION
SCOPE
READ_WRITE
GOVERNANCE
PUBLISH
RECOVERY
```

### PROVISIONAL DECISION R3-2

Registry nên dùng **operation cụ thể**, router code có thể group family nội bộ.

Lý do: `commit.prepare` và `permission.change` đều high-risk nhưng cần protocol khác; nếu registry chỉ thấy `GOVERNANCE`, nó sẽ load quá rộng.

### Trigger source priority

```text
actual tool/action > explicit operation > target path > task classifier
```

Ví dụ khi agent thực sự chuẩn bị `git commit`, router không cần NLP đoán “user có định commit không”.

---

## 19. Carry Packet contract

Carry Packet phục vụ **continuity**, không phải audit log.

### Candidate V1 revised

```yaml
schema: context-carry/v1

session:
  role: product
  phase: edit

task:
  id: optional
  summary: "một câu"
  scopes:
    - workers/duc-scouter

progress:
  done:
    - "..."
  open:
    - "..."
  blockers:
    - "..."

human_decisions:
  - text: "..."
    source: conversation-or-adr-pointer

state:
  pointers:
    - package.scouter.state
    - claims.scouter

context:
  active_ids:
    - repo.constitution
    - package.scouter.rules
  recovery_pointers:
    - id: scouter.handoff
      reason: "resume detail if needed"

repo:
  head: optional
```

### Những gì carry packet KHÔNG sở hữu

- decision truth;
- source code truth;
- ownership truth;
- rule truth.

Nó chỉ trỏ tới source canonical tương ứng.

### PROVISIONAL DECISION R3-3

Carry Packet mặc định **ephemeral/local/runtime-owned**. Chỉ persist khi:

1. runtime sắp compact mà cần handoff machine-readable;
2. chuyển sang runtime khác;
3. đóng session nhưng công việc còn mở.

Nếu persist, nó nên là artifact nhỏ có lifecycle/cleanup, không append vô hạn vào một ledger mới.

`HANDOFF.md` vẫn là human-readable continuity; Carry Packet là machine continuity. Chưa chốt hai thứ có merge thành một source hay giữ song song.

---

## 20. Conflict-resolution policy

Không phải mọi disagreement đều cùng cấp.

### Loại 1 — Authority conflict

Hai canonical source cùng scope/authority nói ngược nhau.

Ví dụ root active rule và package active rule conflict mà không có explicit override contract.

**HARD STOP.** Router/compiler không tự chọn.

### Loại 2 — Current-state conflict

Carry/summary nói A, current canonical state nói B.

**Canonical current state thắng**, ghi warning/delta; không hard-stop trừ khi operation high-risk và không xác định được source canonical.

### Loại 3 — History vs current

ADR superseded/history nói A, active compiled rule nói B.

**Current active rule thắng.** History chỉ dùng để giải thích.

### Loại 4 — Scope override có chủ đích

Package rule cụ thể hơn root rule và root contract **cho phép override ở scope**.

Không phải conflict; resolver áp explicit precedence.

### Loại 5 — Duplicate / semantic overlap

Hai source nói gần giống nhau.

Warning/dedupe candidate, không hard-stop.

### PROVISIONAL DECISION R3-4

Precedence candidate:

```text
explicit user decision / approved hard invariant
> canonical current scoped rule with allowed override
> canonical current repo rule
> canonical current state
> scoped knowledge/protocol
> carry/summary cache
> history
```

Nhưng **không dùng precedence để che authority conflict**. Nếu hai canonical rule cùng level đá nhau, phải surface `CONTEXT_CONFLICT`.

---

## 21. Integration với Rule Compiler — tránh hai source of truth

Risk lớn nhất của việc tạo Context Registry riêng là khai lại:

```text
AGENTS.md là rule source
package AGENTS là rule source
...
```

trong cả Rule Compiler và Context Compiler.

### Proposal

Context Registry có hai dạng source:

```yaml
source: path/to/file
```

hoặc:

```yaml
source_ref: rules.repo.active
```

Trong đó `rules.repo.active` do Rule Compiler/index hiện tại resolve.

Như vậy Context Compiler biết **khi nào load**, còn Rule Compiler vẫn sở hữu **rule set nào active**.

### OPEN

Cần xem `luat.ra_soat`, `luat.khoi_sinh`, `luat.nap` hiện tại có đủ identity để expose stable `source_ref` hay phải thêm một index nhỏ do máy sinh.

---

## 22. Context Compiler V1 không nên tự “semantic compress” rules

Một temptation nguy hiểm:

> dùng LLM mỗi session để rewrite/gộp active rules cho ngắn.

**REJECTED cho V1.**

Lý do:

- nondeterministic;
- có thể làm mất vế;
- khó audit;
- conflict với Rule Compiler hiện đã có human approval + ledger.

Context Compiler được phép:

- select;
- project deterministic structure;
- route;
- dedupe exact known identity;
- drop inactive source khỏi carry.

Không được tự đổi nghĩa canonical rules.

---

## 23. Proposal cho projection implementation

Projection có hai loại:

### Declarative projection

Ví dụ:

```text
status.frontmatter
claims.scope_current
handoff.tail_1
```

Ưu tiên loại này vì deterministic, test được.

### Code-owned projection

Dùng khi structure phức tạp, ví dụ follow archive pointer hoặc resolve relevant ADR section.

### PROVISIONAL

Registry chỉ ghi **projection id**, không chứa query language tùy ý.

Ví dụ:

```yaml
projection: status.frontmatter
```

Projector implementation sở hữu semantics của ID đó.

Không cho registry chứa regex/script arbitrary vì sẽ biến metadata thành programming language khó audit.

---

## 24. Working architecture snapshot — sau vòng 3

```text
                 Rule Ledger / State / Protocol / History
                               │
                               ▼
                      Canonical Sources
                               │
             ┌─────────────────┴─────────────────┐
             │                                   │
       Rule Compiler                      Context Registry
  "what rules are active?"          "when/how should sources load?"
             │                                   │
             └──────────── source_ref ────────────┘
                               │
                               ▼
                            Resolver
                               │
                            Projector
                               │
                       Manifest + Delta
                               │
                        Runtime Adapter
                               │
                           AI Context

Continuity:
AI Context
  -> durable checkpoint
  -> Carry Packet (cache + pointers)
  -> compact/new runtime
  -> resolver re-runs against CURRENT canonical sources
```

---

## 25. OPEN sau vòng 3

1. Exact format cho `.agents/context-registry.json` và schema validation.
2. Rule Compiler expose stable `source_ref` như thế nào mà không sửa lớn.
3. `HANDOFF.md` và machine Carry Packet nên quan hệ một chiều hay hai artifact độc lập.
4. Runtime adapters thực tế của Claude Code / Codex / GPT / Antigravity hỗ trợ những primitive nào.
5. Checkpoint trigger trước compact có thể tự động đến đâu mà không phụ thuộc vendor hook.
6. Test strategy: fixture nào chứng minh router không false-negative ở high-risk operation.
7. Khi nào một projection được coi là safe để thay raw source trong startup.

---

## 26. Change log

### 2026-09-09 — vòng 1–2 migrate vào repo

- phân tách Rules / Knowledge / State / History;
- REVISED thành hai trục semantic kind × load mode;
- thêm Registry → Resolver → Projector → Manifest/Delta → Adapter;
- projection trước physical split;
- logical eviction khác physical token reclaim;
- checkpoint/carry/recovery;
- summary là cache, canonical source là authority;
- event-driven refresh thay TTL chung;
- control-plane context tách workset context;
- failure modes cơ bản.

### 2026-09-09 — vòng 3

- PROVISIONAL: registry file riêng thay vì tiếp tục phình `.repo-structure.json`;
- trigger taxonomy dựa trên operation deterministic;
- Carry Packet là machine continuity, mặc định ephemeral;
- conflict policy chia authority/state/history/override/duplicate;
- Context Registry dùng `source_ref` tới Rule Compiler để tránh hai SSOT;
- REJECTED semantic LLM-compression của active rules trong V1;
- projection dùng named deterministic projector, không arbitrary query language.

Chưa gửi Claude. Chưa implement production Context Compiler.

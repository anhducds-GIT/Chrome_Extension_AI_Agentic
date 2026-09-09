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

---

# VÒNG 4 — Registry schema, Projection Safety, Handoff/Carry, Compact Checkpoint

## 27. Exact Context Registry V1 — proposal chặt hơn

Registry V1 nên là file machine-only, không chứa reasoning dài. Candidate:

```json
{
  "schema_version": 1,
  "sources": [
    {
      "id": "repo.rules.active",
      "source_ref": "rules.repo.active",
      "kind": "rules",
      "scope": "repo",
      "load": "always",
      "authority": "canonical",
      "projection": "full",
      "retain": "pinned"
    },
    {
      "id": "package.scouter.state",
      "source": "workers/duc-scouter/v0.1.0/STATUS.md",
      "kind": "state",
      "scope": "workers/duc-scouter",
      "load": "scoped",
      "authority": "canonical",
      "projection": "status.frontmatter",
      "retain": "while_scope"
    },
    {
      "id": "protocol.multiflow",
      "source": "docs/protocols/MULTIFLOW.md",
      "kind": "knowledge",
      "scope": "repo",
      "load": "on_demand",
      "triggers": ["claim.change", "commit.prepare", "push.prepare"],
      "authority": "canonical",
      "projection": "protocol.section_by_trigger",
      "retain": "while_operation"
    }
  ]
}
```

### PROVISIONAL DECISION R4-1 — schema constraints

V1 nên cưỡng chế:

- `id` unique và stable;
- đúng **một** trong `source` hoặc `source_ref`;
- `kind ∈ {rules, knowledge, state, history}`;
- `load ∈ {always, scoped, on_demand, never_auto}`;
- `authority ∈ {canonical, derived, cache}`;
- `retain ∈ {pinned, while_scope, while_operation, one_shot}`;
- `triggers` bắt buộc khi `load=on_demand`, cấm/không cần khi `always`;
- source path phải tồn tại hoặc source_ref phải resolve được.

Không thêm `priority`, `score`, `max_tokens`, `depends_on` trong V1.

### Scope representation

V1 ưu tiên `scope` là một identity canonical, không arbitrary glob. Ví dụ:

```text
repo
workers/duc-scouter
workers/_shared
```

Resolver sở hữu mapping path -> scope. Registry không nên chứa glob/regex thứ hai song song với `.repo-structure.json`.

---

## 28. Projection Safety — phải có Loss Contract

Projection có rủi ro nguy hiểm hơn raw load: nó có thể **trông hợp lệ nhưng đã bỏ mất field quyết định**.

Vì vậy mỗi projection ID cần một contract code-owned:

```text
projection id
accepted source shape
fields/sections bắt buộc giữ
phần được phép bỏ
fallback khi parse fail
```

Ví dụ:

```text
status.frontmatter
  accepts: STATUS.md có YAML frontmatter hợp lệ
  must_keep: schema, id, lifecycle, next_step, human_action, current_focus
  may_drop: explanatory body
  on_error: FALLBACK_RAW
```

### PROVISIONAL DECISION R4-2

**Projection chỉ được thay raw source nếu projector chứng minh được loss contract.**

Nếu:

- parse lỗi;
- required field thiếu;
- source shape lạ;
- projector version không hiểu schema;

thì hành vi mặc định:

```text
FALLBACK_RAW + warning
```

không phải:

```text
return partial projection
```

Với operation high-risk, nếu raw fallback cũng không đọc được thì hard-stop.

### Projector không được “hiểu nghĩa” bằng LLM trong V1

V1 projection là deterministic extraction/transformation. Semantic summarization bằng model có thể là lớp research sau, nhưng không được đứng trên đường safety-critical.

---

## 29. Projection test contract

Mỗi projector cần ít nhất ba loại test:

### A. Golden fixture

Canonical source hợp lệ -> projection đúng shape và giữ đủ required fields.

### B. Mutation / deletion

Xoá từng required field quan trọng -> projector phải:

```text
fallback hoặc fail
```

không được vẫn báo projection sạch.

### C. Unknown-shape fixture

Schema/version mới chưa biết -> fallback raw, không đoán.

### PROVISIONAL DECISION R4-3

Một projection chưa có acceptance/mutation test **không được dùng để thay raw source trong startup bundle**.

Nó vẫn có thể tồn tại ở experimental mode, nhưng resolver phải coi raw source là authoritative load path.

---

## 30. HANDOFF và Carry Packet — không nên có hai “sự thật về tiến độ”

Nếu giữ song song:

```text
HANDOFF.md = human continuity
Carry Packet = machine continuity
```

thì có nguy cơ cả hai cùng chứa `done/open/blocker` và drift.

### Ba phương án

#### A. Hai artifact độc lập, cùng được ghi

**REJECTED cho V1** vì duplicate state/progress rất dễ lệch.

#### B. Carry Packet sinh từ HANDOFF

Khó vì HANDOFF là prose và schema không đủ ổn để parse chắc toàn bộ.

#### C. Một checkpoint payload máy đọc, HANDOFF render/projection từ payload + prose bổ sung

Kiến trúc sạch nhất về dài hạn nhưng đổi workflow hiện tại nhiều hơn.

### PROVISIONAL DECISION R4-4 — V1 ít xâm lấn

V1 **không tạo persistent Carry Packet song song cho mọi session**.

Carry Packet chỉ xuất hiện ở boundary thật:

```text
compact
cross-runtime handoff
session đóng khi việc còn mở
```

Nội dung machine packet chỉ giữ **delta + pointers**, tránh lặp toàn bộ `done/open/blocker` nếu chúng đã được persist vào HANDOFF/BACKLOG/state.

Candidate revised:

```yaml
schema: context-carry/v1
reason: compact
operation: edit_code
scopes:
  - workers/duc-scouter
phase: edit
resume_summary: "một câu về điểm đang đứng"
open_pointer: workers/duc-scouter/v0.1.0/HANDOFF.md
state_ids:
  - package.scouter.state
  - claims.scouter
active_context_ids:
  - repo.rules.active
  - package.scouter.rules
recovery:
  - id: protocol.multiflow
    reason: commit step may follow
source_revision:
  head: optional
```

Điểm quan trọng: packet nói **đọc ở đâu**, không copy nguyên current truth vào chính nó.

---

## 31. Durable Checkpoint trước compact

Compact cần tách hai khái niệm:

```text
checkpoint durability
vs
context compression
```

Nếu checkpoint chưa durable mà đã compact, summary sẽ vô tình trở thành nơi duy nhất giữ quyết định/progress.

### Checkpoint classifier V1

Trước compact, classify delta từ lần checkpoint gần nhất:

```text
DECISION
CURRENT_STATE
OPEN_WORK
CODE_CHANGE
EVIDENCE
EPHEMERAL_REASONING
```

Route:

```text
DECISION          -> ADR / nơi quyết định canonical nếu đã được Đức chốt
CURRENT_STATE     -> STATUS / canonical state owner
OPEN_WORK         -> BACKLOG hoặc HANDOFF theo semantics hiện tại
CODE_CHANGE       -> git/working tree
EVIDENCE          -> evidence source phù hợp
EPHEMERAL_REASONING -> không cần persist toàn bộ
```

### PROVISIONAL DECISION R4-5

Compact gate chỉ cần hỏi một câu máy có thể kiểm phần lớn:

> **Có durable fact nào đang chỉ tồn tại trong conversation/carry cache không?**

Nếu có -> checkpoint chưa complete.

Không yêu cầu “mọi reasoning phải persist”; đó sẽ biến repo thành transcript archive.

---

## 32. Checkpoint trigger không phụ thuộc hoàn toàn vendor hook

Ta chưa biết mọi runtime có hook “before compact”. Vì vậy architecture không được phụ thuộc duy nhất vào hook đó.

Candidate trigger:

```text
A. vendor before-compact hook nếu có
B. explicit user/runtime compact command wrapper
C. context-pressure warning nếu runtime expose
D. session handoff / new-chat command
E. periodic durable checkpoint sau material state change — nhẹ, không summary toàn session
```

### PROVISIONAL DECISION R4-6

V1 nên coi **material state change** là checkpoint opportunity chính, thay vì đợi tới giây cuối trước compact.

Ví dụ khi:

- Đức chốt một quyết định;
- task chuyển từ open -> done/blocker;
- code đã commit;
- ownership đổi;

thì durable source nên được cập nhật lúc sự kiện xảy ra. Đến lúc compact, Carry Packet chỉ cần nối pointer.

Đây là cách giảm latency/risk của “panic checkpoint” trước compact.

---

## 33. Material change ≠ mỗi turn

Không checkpoint mỗi câu chat.

Candidate material events:

```text
human decision accepted
state transition
scope ownership transition
commit created
blocker discovered that changes next action
new durable task/debt created
```

Không checkpoint:

```text
brainstorm branch chưa chốt
câu hỏi giải thích
tool output tạm
reasoning bị bác ngay trong cùng vòng
```

**PROVISIONAL:** Context Compiler/Checkpoint layer cần phân biệt `durable delta` với `conversation delta`.

Nếu không có durable delta, compact chỉ cần carry current task pointer chứ không ghi repo.

---

## 34. Registry validation và fail policy

Registry lỗi không nên làm mọi tác vụ đọc vô dụng.

Candidate:

```text
missing/invalid ALWAYS canonical source -> HARD STOP
missing scoped rules/state for active write scope -> HARD STOP trước write
missing on-demand knowledge for low-risk read -> warning + raw/manual fallback
unresolved cache/history source -> warning
```

### PROVISIONAL DECISION R4-7

Fail policy phụ thuộc **authority + operation risk**, không phụ thuộc chỉ file có missing hay không.

Điều này tránh hai cực:

- fail-open mọi thứ -> context safety vô dụng;
- fail-closed mọi warning -> mọi người sẽ tắt compiler.

---

## 35. Working architecture snapshot — sau vòng 4

```text
                    CANONICAL SOURCES
          rules / state / knowledge / history
                           │
          ┌────────────────┴────────────────┐
          │                                 │
   Rule Compiler                    Context Registry
 active-rule identity          load/projection/retain metadata
          │                                 │
          └──────────── source_ref ──────────┘
                           │
                         Resolver
                           │
                     Risk/Conflict Gate
                           │
                         Projector
                     + Loss Contract
                           │
                    Manifest + Delta
                           │
                     Runtime Adapter
                           │
                       AI Context

Durability path:
material change
   -> durable canonical source NOW
   -> checkpoint records pointers
   -> Carry Packet only at continuity boundary
   -> compact/new runtime
   -> resolver rehydrates from CURRENT canonical sources
```

---

## 36. OPEN sau vòng 4

1. Rule Compiler hiện tại expose `source_ref` stable thế nào với thay đổi tối thiểu?
2. `protocol.section_by_trigger` có nên thật sự project theo section hay V1 load full protocol khi trigger nổ để giảm implementation risk?
3. Machine Carry Packet nếu cần persist tạm thì đặt ngoài repo, `.agents/`, hay nhúng vào HANDOFF metadata?
4. Làm sao xác định “durable fact only in conversation” ở GPT Web nơi repo write không luôn trực tiếp?
5. Runtime adapter capability thực tế của CC/Codex/An/GPT cần audit riêng trước implementation.
6. Projection nào đáng làm V1 đầu tiên? Candidate: `status.frontmatter`, `claims.scope_current`; HANDOFF projection có thể để sau vì shape phức tạp hơn.
7. Context registry là hand-authored hay generate một phần từ `.repo-structure.json` + Rule Compiler inventory?

---

## 37. Change log — vòng 4

### 2026-09-09 — vòng 4

- chốt candidate JSON schema cho `.agents/context-registry.json`;
- scope identity lấy từ topology hiện có, không thêm glob/regex riêng;
- thêm **Projection Loss Contract** + fallback raw;
- projection muốn thay raw startup phải có golden + mutation + unknown-shape tests;
- REJECTED hai persistent continuity artifacts cùng sở hữu tiến độ;
- Carry Packet chuyển thành boundary artifact nhỏ, chủ yếu pointers;
- compact tách thành durable checkpoint trước compression;
- checkpoint ưu tiên material state change, không chờ panic trước compact;
- fail policy dựa trên authority × operation risk.

Chưa gửi Claude. Chưa implement production Context Compiler.

---

# VÒNG 5 — SourceRef, V1 tối thiểu và capability thật của runtime

## 38. Evidence snapshot — runtime capability, kiểm ngày 2026-09-09

Vòng này dùng tài liệu chính thức / codelab chính thức để tránh thiết kế dựa trên giả định runtime.

### Claude Code

Nguồn: `code.claude.com/docs/en/memory`, `/hooks`, `/features-overview`, `/context-window`.

Đã xác nhận:

- project `CLAUDE.md` được nạp vào session; `CLAUDE.md` trong subdirectory có thể load lazy khi Claude truy cập file trong vùng đó;
- `.claude/rules/` hỗ trợ rules theo phạm vi/path và có thể load theo trigger path;
- skills có description ở startup, body nạp khi dùng; skill manual có thể có zero startup context;
- `SessionStart` hook có thể thêm dynamic context;
- `InstructionsLoaded` cho observability khi instruction file được eager/lazy load;
- có `PreCompact` và `PostCompact` lifecycle hook;
- `/context` và `/memory` cho observability context/memory.

Điều quan trọng: docs nói static context nên dùng `CLAUDE.md`; `SessionStart` cần giữ nhanh và chỉ dùng khi context thực sự dynamic.

### Codex

Nguồn: OpenAI `Unrolling the Codex agent loop`, `Introducing Codex`, `Harness engineering`.

Đã xác nhận:

- Codex có native `AGENTS.md` hierarchy và instruction precedence theo scope directory;
- user instructions được aggregate từ `AGENTS.override.md` / `AGENTS.md`, mặc định có budget khoảng 32 KiB trong luồng startup được mô tả;
- OpenAI khuyến nghị `AGENTS.md` ngắn như **map/table of contents**, còn knowledge sâu nằm trong structured docs thay vì một manual khổng lồ;
- có compaction primitive ở OpenAI Responses API, nhưng vòng này **chưa tìm được evidence chính thức rằng Codex CLI expose lifecycle hook tương đương Claude `PreCompact`**.

Vì vậy không được thiết kế checkpoint phụ thuộc Codex hook chưa chứng minh tồn tại.

### ChatGPT / GPT Web

Nguồn: OpenAI Help `Projects in ChatGPT`, `Connecting GitHub to ChatGPT`.

Đã xác nhận:

- Projects có project memory/context từ chats/files/instructions;
- GitHub trong ChatGPT có thể retrieve repo content theo yêu cầu;
- standard GitHub app documentation mô tả GitHub access trong ChatGPT là retrieval/read, còn write/edit/push được định tuyến sang Codex ở product surface chuẩn.

Điều này có nghĩa project memory hữu ích như cache/continuity, nhưng **không thể coi là canonical repo state**.

Lưu ý: connector/tool surface trong từng ChatGPT environment có thể mạnh hơn product GitHub app chuẩn; adapter phải capability-detect thay vì assume.

### Google Antigravity

Nguồn: Google Codelabs `Getting Started with Antigravity IDE`, `Spec-Driven ADK Agent Development`, Antigravity developer pipeline codelabs.

Đã xác nhận Antigravity có native hierarchy gần đúng thứ Context Compiler đang thiết kế:

```text
.agents/rules/       = always-active workspace instructions
.agents/skills/      = on-demand knowledge, match bằng description
.agents/workflows/   = explicit slash-triggered workflow
```

Ngoài ra có global `~/.gemini/GEMINI.md` và Agent/IDE/CLI cùng một harness family.

**Chưa đủ evidence** trong vòng này về hook before-compact hay primitive physical eviction tương đương Claude Code.

---

## 39. REVISED — không đặt registry cross-runtime trong `.agents/`

R3/R4 từng ưu tiên:

```text
.agents/context-registry.json
```

Capability audit cho thấy `.agents/` là **namespace native của Antigravity** cho rules/skills/workflows.

Dù Antigravity có thể bỏ qua file JSON lạ, dựa vào hành vi đó là coupling không cần thiết và chưa được chứng minh.

### REVISED DECISION R5-1

**Không chốt `.agents/context-registry.json` làm canonical cross-runtime registry.**

Registry phải sống ở namespace neutral với vendor.

Candidate còn mở:

```text
.context/registry.json
context/registry.json
context-registry.json
```

Không chốt vị trí cuối chỉ vì thẩm mỹ. Tiêu chí:

- không chiếm namespace vendor;
- machine-readable;
- topology/check-bootstrap biết nó;
- không auto-load vào model chỉ vì file tồn tại;
- không biến `docs/` thành config store.

---

## 40. SourceRef contract — dùng provider identity, không dùng path giả

`source_ref` không nên là một alias tùy ý kiểu:

```text
rules.repo.active
```

mà không nói ai resolve nó.

### PROVISIONAL DECISION R5-2

Dùng provider-qualified identity. Candidate đơn giản:

```text
rule://repo
rule://workers/duc-scouter
rule://workers/_shared
```

Semantics:

```text
rule://<scope>
    ↓
Rule Compiler provider
    ↓
active canonical rule source(s) của scope đó
```

Context Registry sở hữu:

```text
WHEN / HOW TO LOAD
```

Rule Compiler provider sở hữu:

```text
WHAT RULE SOURCE IS ACTIVE
```

### Resolved manifest phải giữ cả symbolic và physical view

Ví dụ:

```yaml
id: package.scouter.rules
source_ref: rule://workers/duc-scouter
resolved:
  sources:
    - workers/duc-scouter/v0.1.0/AGENTS.md
  revision: <fingerprint-or-source-revision>
```

`resolved` là derived observability, không phải config người phải maintain.

### Fail policy

Nếu `rule://<active-write-scope>` không resolve được:

```text
HARD STOP before write
```

Không fallback sang “đoán path AGENTS.md”. Đoán path chính là tạo source of truth thứ hai bằng convention ngầm.

### Không generic hóa quá sớm

V1 chỉ cần provider `rule://` nếu đó là nơi thật sự cần indirect resolution.

Các source state/knowledge có path canonical ổn định vẫn dùng:

```json
"source": "workers/.../STATUS.md"
```

Không tạo một URI framework cho mọi thứ chỉ vì có thể.

---

## 41. V1 projector set — cắt rất mạnh scope implementation

R4 còn cân nhắc projector cho protocol/HANDOFF. Sau audit runtime, proposal V1 nên nhỏ hơn.

### PROVISIONAL DECISION R5-3

V1 production chỉ cần ba projector primitive:

```text
full
status.frontmatter
claims.scope_current
```

#### `full`

Không transform. Dùng cho active rules và on-demand protocol ban đầu.

#### `status.frontmatter`

Giảm startup state mà vẫn deterministic theo schema status hiện có.

#### `claims.scope_current`

Chỉ lấy ownership/task state của scope đang cần, không mang transfer history và claims của scope khác.

### DEFERRED — `protocol.section_by_trigger`

V1 khi trigger protocol nổ thì **load full protocol**.

Lý do:

- protocol đã on-demand nên không trả cost ở mọi session;
- section projection tạo risk mất điều kiện liên mục;
- implementation/test phức tạp hơn phần token có thể tiết kiệm lúc đầu.

Sau khi có measurement mới quyết có đáng section-project hay không.

### DEFERRED — HANDOFF projector

Không xây `handoff.latest_entry` trong first production slice.

V1 `work.resume/recovery` có thể load raw HANDOFF on-demand. HANDOFF đã bị loại khỏi startup, nên lợi ích chính đã đạt.

Sau này có thể reuse parser hiện có nếu audit chứng minh boundary entry deterministic và không mất pointer/archive semantics.

---

## 42. Runtime adapter không phải một injector chung

Capability audit xác nhận bốn runtime có native primitives khác nhau.

### PROVISIONAL DECISION R5-4

Context Compiler sinh **semantic manifest chung**, rồi adapter compile nó sang native mechanism phù hợp nhất.

Không có requirement:

> “mọi runtime phải nhận cùng một giant prompt string”.

### Claude Code adapter — native-rich

Mapping khả thi:

```text
always rules        -> root CLAUDE.md import / project instructions
scoped rules        -> nested CLAUDE.md hoặc path-scoped rules nếu được generate an toàn
on-demand knowledge -> skills / explicit read
checkpoint          -> material-change persistence + PreCompact hook bổ sung
observability       -> InstructionsLoaded + /context + /memory
```

**OPEN:** repo hiện dùng package `AGENTS.md`, không phải nested `CLAUDE.md`. Không tự sinh adapter file trước khi audit nguy cơ duplicate/drift và khả năng import thin-pointer.

### Codex adapter — AGENTS-native, hook-poor chưa rõ

Mapping:

```text
rules              -> AGENTS hierarchy native
knowledge/state    -> manifest-guided file reads
checkpoint         -> vendor-independent material-change checkpoint
compact hook       -> KHÔNG ASSUME
```

Có một nuance cần giữ: tài liệu về agent loop mô tả startup aggregation root→cwd, trong khi AGENTS spec nói nested instructions có scope trên subtree file. Trước implementation cần test surface Codex thật của Đức để biết eager/lazy behavior chính xác; không suy từ một tài liệu thành runtime guarantee rộng hơn.

### GPT Web adapter — retrieval-first

Mapping:

```text
project instructions/memory -> cache / conversational continuity
GitHub/files                -> canonical retrieval on demand
manifest                    -> kế hoạch retrieval, không phải local hook
checkpoint write            -> phụ thuộc connector/product surface
```

GPT project memory **không** thay repo canonical source.

### Antigravity adapter — rules/skills/workflows native

Mapping tự nhiên:

```text
always/scoped workspace guidance -> rules
on-demand knowledge              -> skills
explicit multi-step operation    -> workflows
```

Nhưng không copy canonical content bằng tay vào `.agents/rules`/skills. Nếu adapter artifact cần tồn tại, nó phải được generate/thin-reference và có drift check.

---

## 43. Runtime profile tách khỏi Context Registry

Không nên thêm vào mỗi source:

```json
"runtime": ["claude", "codex", "antigravity"]
```

vì cùng semantic source áp cho mọi runtime; khác nhau là **cách vận chuyển**.

### PROVISIONAL DECISION R5-5

Registry vẫn vendor-neutral.

Runtime capability sống trong adapter/profile riêng, ví dụ conceptual:

```yaml
runtime: claude-code
capabilities:
  scoped_native_rules: true
  lifecycle_precompact: true
  on_demand_skill: true
  repo_read: local
```

V1 chưa cần file profile hand-authored nếu capability có thể nằm trong code adapter + tests.

Không đưa capability matrix vào canonical registry chỉ để documentation đẹp.

---

## 44. Adapter artifact rule — derived hoặc pointer-only

Nếu sau này Context Compiler tạo:

```text
.claude/rules/...
.agents/rules/...
AGENTS adapter files
```

thì những file đó có nguy cơ trở thành bản sao luật.

### PROVISIONAL DECISION R5-6

Adapter artifact chỉ hợp lệ khi một trong hai:

1. **thin pointer/import** tới canonical source; hoặc
2. **100% generated derived artifact** có drift check và không được human-edit.

Không có phương án thứ ba “copy rồi nhớ sync”.

Điều này áp dụng đặc biệt cho Antigravity rules và Claude path-scoped rules.

---

## 45. Context Compiler first implementation nên là READ-ONLY

Đây là thay đổi quan trọng về thứ tự build.

Nếu build ngay hooks/injection, khi routing sai ta khó biết lỗi nằm ở:

```text
registry?
resolver?
projector?
adapter?
runtime?
```

### PROVISIONAL DECISION R5-7

First slice nên chỉ:

```text
TASK DESCRIPTOR
      ↓
read canonical registry/topology/rule provider
      ↓
resolve + project
      ↓
print CONTEXT MANIFEST + warnings/conflicts
```

**Không inject. Không sửa CLAUDE/AGENTS. Không hook compact.**

Acceptance ban đầu là correctness/inspectability:

- task giống nhau -> manifest deterministic;
- scope đúng;
- high-risk trigger không false-negative trong fixtures;
- source_ref resolve được;
- projector fallback đúng;
- conflict surface đúng.

Sau khi manifest đáng tin mới nối adapter.

Điều này giảm mạnh cost of change và giúp Đức/GPT/Claude cùng audit output bằng mắt.

---

## 46. Capability tiers thay vì cố parity tuyệt đối

Không cần mọi runtime có feature parity.

Candidate:

```text
Tier A — native context lifecycle
  Claude Code: scoped/lazy instructions + hooks + compact lifecycle evidence

Tier B — native rule hierarchy, external lifecycle
  Codex: AGENTS strong; compact/checkpoint hook chưa xác nhận
  Antigravity: rules/skills/workflows strong; compact lifecycle chưa xác nhận

Tier C — retrieval orchestrated
  GPT Web: connector/project-context driven, no repo-local lifecycle contract assumed
```

Đây chỉ là **adapter capability classification**, không phải ranking chất lượng AI.

### Hệ quả

Core Context Compiler phải đúng ngay cả ở Tier C:

```text
resolve manifest
-> tell runtime what must be fetched
-> verify canonical source was retrieved before high-risk action
```

Runtime giàu capability chỉ làm flow tự động hơn, không thay semantic contract.

---

## 47. Compact strategy sau capability audit

Claude Code có `PreCompact/PostCompact`, nên adapter Claude có thể tận dụng chúng.

OpenAI Responses API có compaction primitive, nhưng đó không chứng minh Codex CLI hay GPT Web expose cùng lifecycle hook.

Antigravity evidence hiện chưa đủ.

### PROVISIONAL DECISION R5-8

**Material-change checkpoint vẫn là cơ chế chính. Vendor pre-compact hook chỉ là safety net.**

```text
PRIMARY:
material durable event -> persist canonical truth ngay

SECONDARY:
if runtime has PreCompact -> verify checkpoint / emit carry pointers

FALLBACK:
manual compact/new-session wrapper -> verify checkpoint first
```

Như vậy architecture không gãy khi chuyển runtime.

---

## 48. Insight đối chiếu với hướng ngành

OpenAI mô tả chính bài toán chúng ta đang gặp: giant `AGENTS.md` làm context bị lấn, guidance thành noise, docs stale và khó verify; giải pháp họ dùng là `AGENTS.md` ngắn như map, deeper knowledge ở structured docs.

Claude Code docs cũng khuyên giữ CLAUDE nhỏ, chuyển procedure/reference material sang scoped rules/skills; Antigravity phân tách rules/skills/workflows.

Ba hệ độc lập đang hội tụ về cùng một shape:

```text
SMALL ALWAYS-ON CONTROL PLANE
        +
SCOPED / ON-DEMAND KNOWLEDGE
        +
NATIVE TOOL/HOOK ENFORCEMENT
```

**Kết luận provisional:** hướng Context Compiler không phải một abstraction tự nghĩ ra để tối ưu repo này; nó phù hợp với native loading models của các runtime hiện đại. Giá trị riêng của hệ thống của Đức là thêm:

- canonical cross-runtime registry;
- rule ledger/compiler;
- projection safety;
- state/history separation;
- deterministic manifest;
- recovery/checkpoint contract.

---

## 49. OPEN sau vòng 5

1. Chọn namespace neutral cuối cho registry: `.context/` hay file root?
2. Rule Compiler provider có thể expose `rule://scope` bằng cách import function hiện có hay cần generated index?
3. Claude thin adapter cho package AGENTS nên dùng nested `CLAUDE.md @AGENTS.md`, path-scoped rule, hay không tạo file nào?
4. Test Codex surface thật của Đức: nested AGENTS load/apply ở repo-root working directory chính xác ra sao?
5. Audit Antigravity compact/session lifecycle thêm nếu có docs chính thức sâu hơn.
6. GPT adapter cần cơ chế gì để chứng minh required canonical source đã được retrieve trước high-risk action?
7. Task Descriptor được sinh từ đâu trong first read-only slice: CLI flags deterministic trước, NLP parser sau?

---

## 50. Change log — vòng 5

### 2026-09-09 — vòng 5

- audit capability thật của Claude Code / Codex / ChatGPT / Google Antigravity;
- **REVISED** vị trí `.agents/context-registry.json` vì `.agents/` là namespace native của Antigravity;
- chốt proposal `rule://<scope>` provider-qualified source_ref;
- thu V1 projector xuống `full`, `status.frontmatter`, `claims.scope_current`;
- DEFER protocol section projection và HANDOFF projection;
- runtime adapter compile manifest sang native mechanisms, không giant prompt parity;
- registry vendor-neutral, runtime capability nằm ở adapter;
- adapter file chỉ thin-pointer hoặc generated derived artifact;
- **first implementation nên read-only manifest compiler**, chưa hook/inject;
- material-change checkpoint là primary, vendor PreCompact chỉ safety net;
- ghi nhận convergence giữa OpenAI/Claude/Antigravity về small always-on + scoped/on-demand context.

Chưa gửi Claude. Chưa implement production Context Compiler.

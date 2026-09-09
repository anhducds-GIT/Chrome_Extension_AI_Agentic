---
status: proposal-revised-after-codex-and-cc-review
kind: architecture-proposal
topic: context-compiler-v1
created: 2026-09-09
revised: 2026-09-09
authority: none
source_draft: draft.md
note: "Bản proposal đã được Đức + GPT reasoning, Codex challenge, CC challenge và GPT đối chiếu lại với main. Chưa phải ADR/luật hiệu lực cho tới khi Đức chốt."
---

# Context Compiler V1 — Consolidated Proposal after Codex + CC Review

## 0. Executive conclusion

Hai reviewer đều giữ nguyên chẩn đoán gốc nhưng buộc proposal cắt nhỏ hơn.

**Không build một Router framework trước.** Repo hiện đã có bootstrap compiler (`Rule Compiler -> PHIEN.md`) và nhiều deterministic gates. Phần V1 nên là ba lát cắt độc lập, mỗi lát vá một failure mode đang có và tự chứng minh giá trị:

```text
V1a — BOOTSTRAP FRESHNESS
      PHIEN phải source-complete + khớp output generator hiện tại

V1b — ONE LOADING LAW + HARD BUDGET
      một bảng machine-readable: operation -> source#section bắt buộc
      mọi bảng prose khác sinh/đối chiếu từ đó
      phần đọc thêm được đo actual chars và có trần cứng

V1c — READ-ONLY INSPECTOR
      node scripts/context.mjs --viec <operation> [...evidence]
      -> in bootstrap + required-now + chars + total + missing
      -> exit 0/1
```

**Chưa tạo JSON Manifest contract, runtime adapters, Context Delta, projector framework hay semantic conflict engine.** Có consumer thật rồi mới thêm output machine contract nếu cần.

---

## 1. Problem statement

Project AI dài hạn phình ở bốn lớp khác nhau:

```text
Rules      — luật active tăng/trùng/stale
Knowledge  — protocol/domain docs tăng
State      — current truth trộn narrative/lịch sử
History    — ADR/handoff/evidence/git tăng vô hạn
```

Context control phải đạt đồng thời:

- startup không tăng tuyến tính theo tuổi repo;
- operation chỉ nạp phần context thật sự bắt buộc;
- context mới phải **trả giá bằng phép đo**, không có kênh tăng vô hạn mới;
- deterministic authorization/enforcement không bị kéo ngược vào prompt;
- summary/carry không trở thành authority;
- cùng semantic law có thể được runtime khác nhau tiêu thụ sau này.

---

## 2. Boundary: cái gì đã có, không xây lại

### 2.1 Bootstrap compilation đã có

Package session hiện dùng:

```text
CLAUDE routing + <versioned-unit>/PHIEN.md
```

`PHIEN.md` được sinh từ `LUAT-CORE + package AGENTS Luật vàng + STATUS fields`.

**Decision C1:** reuse `PHIEN.md`; không tạo startup bundle thứ hai.

### 2.2 Authorization/enforcement đã có

Tiếp tục thuộc các cổng thật:

```text
claim.mjs
claim.mjs --soat
session-check.mjs
safe-push.mjs
suite / permission guards
```

**Decision C2:** context system không preload snapshot ownership để thay cổng tại action boundary.

### 2.3 Rule semantics thuộc Rule Compiler + Đức

Rule Compiler hiện có các phép deterministic như dead-clause reference, orphan decision, duplicate fingerprint, stale review. Nó **không** là semantic theorem prover.

**Decision C3:** V1 không hứa phát hiện mâu thuẫn ngữ nghĩa tổng quát.

---

# V1a — Bootstrap Freshness Gate

## 3. Vấn đề thật

`PHIEN.md` là bootstrap authority của package session nhưng lifecycle hiện chưa kín:

- generator có thể đọc thiếu `STATUS.md` và tiếp tục với state rỗng;
- khi generation fail ở một package, PHIEN cũ có thể còn trên đĩa;
- thước startup có thể bỏ qua package/file chưa tồn tại;
- PHIEN không nằm trong cơ chế artifact freshness chung hiện tại.

Vì vậy ba câu khác nhau phải được tách:

```text
PHIEN_EXISTS
PHIEN_GENERATED_MATCH
PHIEN_SOURCE_COMPLETE
```

`EXISTS` hoặc `MATCH` một mình không đủ.

## 4. Contract V1a

Reuse chính pure generation logic hiện có (`sinhPhienGoi()` hoặc function cùng authority), sinh expected PHIEN **trong memory**, không ghi file.

Mỗi versioned unit được support phải kiểm:

```text
1. required source tồn tại
2. required source parse được
3. generator tạo expected output thành công
4. PHIEN trên đĩa tồn tại
5. PHIEN trên đĩa === expected output
6. startup bundle không vượt hard char cap hiện hành
```

Nếu một điều kiện fail:

```text
PHIEN_INVALID -> fail closed cho package bootstrap
```

Không fallback im lặng sang raw AGENTS/STATUS bundle và không gọi `--sinh` từ checker read-only.

## 5. Generated artifact / locking issue

`rule-compile --sinh` có thể chạm nhiều package PHIEN trong một lượt. Đây là **lỗ vận hành hiện hữu**, không phải Context Router concern.

Cần một quyết định riêng:

```text
PHIEN là generated artifact 100% -> được cơ chế generated-artifact miễn khóa phù hợp
```

hoặc generator phải có đường target-scoped không chạm unit khác.

**Không để việc “đổi một rule phải giữ 4 package lock” trở thành requirement ngầm.**

---

# V1b — One Loading Law + Hard Conditional Budget

## 6. Không tạo registry thứ ba

Hiện loading obligation đã xuất hiện trong ít nhất:

```text
AGENTS.md mục “Đọc trước khi làm”
LUAT-CORE mục “Cần thêm thì mở”
protocol prose
```

Thêm `context-registry.json` riêng sẽ trở thành một bản thứ ba phải sync.

**Decision C4:** canonical loading law đặt trong machine LAW hiện có, candidate:

```text
.repo-structure.json -> luat.context
```

Không thêm root config file mới trong V1.

## 7. `luat.context` chỉ chứa nghĩa vụ bắt buộc

Nó **không catalog mọi tài liệu hữu ích**.

Candidate shape tối thiểu:

```json
{
  "commit.prepare": [
    { "source": "docs/protocols/MULTIFLOW.md", "section": "3a-3b" }
  ],
  "rule.change": [
    { "source": "docs/protocols/RULE-COMPILER.md", "section": "full" }
  ],
  "handoff.write": [
    { "source": "docs/protocols/HANDOFF.md", "section": "required-for-write" },
    { "source": "docs/protocols/RULE-COMPILER.md", "section": "5a" }
  ]
}
```

V1 syntax cuối của selector có thể là heading IDs / named section resolver. Không dùng arbitrary regex/query language trong config.

### Quan trọng

**Không hand-maintain `chars` trong LAW.** `context.mjs` đọc section thật và tự tính chars mỗi lần. Measurement là derived fact; không tạo một số phải sync bằng tay.

## 8. Section load là requirement hiện hành, không phải V1.1 optimization

Nếu luật hiện nói:

```text
MULTIFLOW mục 3a–3b
```

thì V1 phải giữ đúng section đó, không đổi thành `full` chỉ vì implementation rẻ hơn.

**Decision C5:** default là exact required section; `full` chỉ dùng khi source contract thật sự yêu cầu toàn file.

## 9. Conditional context cũng phải có hard budget

Bootstrap hiện đã có char budget/hard cap. Nếu system mới được phép thêm required-now context nhưng không đo/chặn, nó tạo một kênh phình mới.

V1b phải có:

```text
bootstrap_chars
conditional_chars
combined_context_chars
conditional_cap / hoặc combined cap theo policy Đức chốt
```

Vượt hard cap:

```text
CONTEXT_QUA_TRAN -> exit non-zero
```

Không chỉ cảnh báo.

### OPEN DECISION D-BUDGET

Con số/shape của trần conditional chưa được chốt trong proposal này. Không invent một số tròn.

Trước implementation phải:

1. đo actual section bundles cho operation corpus;
2. đề xuất cap từ phân bố thật + mục tiêu context;
3. Đức chốt;
4. lưu cap trong machine LAW.

N-51 cũ **không được dùng làm cap mới tự động**: BACKLOG hiện có entry nói Đức đã bác hướng “đổi sang 1.500 dòng” và chuyển trọng tâm sang categorize/merge/eliminate rules. Cần reconcile entry đó với current active AGENTS trước khi lấy nó làm authority.

## 10. Prose tables phải được sinh hoặc machine-cross-check từ một LAW

Mục tiêu cuối:

```text
luat.context = canonical operation->required sections

AGENTS “Đọc trước khi làm” = human projection
LUAT-CORE pointers        = package projection
```

Hai đường hợp lệ:

1. generate những block có marker;
2. nếu không muốn generate prose, machine test phải chứng minh chúng equivalent với LAW.

Không chấp nhận “copy rồi nhớ sync”.

---

# V1c — Read-only Context Inspector

## 11. V1c không phải workflow orchestrator

CLI chỉ trả lời:

> Với operation này và evidence hiện tại, bootstrap + mandatory context là gì, tổng bao nhiêu chars, và còn thiếu gì?

Candidate:

```text
node scripts/context.mjs --viec commit.prepare --as <lane>
node scripts/context.mjs --viec repo.write --target <path> --as <lane>
node scripts/context.mjs --viec work.resume --unit <versioned-unit>
```

V1 chưa cần JSON manifest schema. Human-readable stable output + exit code đủ để test và audit.

Có consumer machine thật thì thêm `--json` sau mà không đổi semantic core.

## 12. Output tối thiểu

```text
BOOTSTRAP
  <source>                     <chars>

REQUIRED NOW
  <source>#<section>           <chars>

TOTAL
  bootstrap=<n>
  conditional=<n>
  combined=<n>
  cap=<n>

COVERAGE
  supported units / unresolved targets / missing evidence

RESULT
  OK | BLOCKED
```

`OK` chỉ có nghĩa:

> context route đã xác định đủ và nằm trong budget.

Nó **không** có nghĩa:

- đã claim;
- được quyền write;
- suite xanh;
- commit hợp lệ;
- push an toàn.

## 13. Evidence khác nhau theo operation

Không có generic “actual git scope”.

### `repo.write`

Evidence = concrete target path(s).

Prerequisite loading:

```text
repo.write -> MULTIFLOW section liên quan claim/write
```

vì luật hiện yêu cầu claim **trước** lượt ghi. Không mô tả `write -> claim`.

### `commit.prepare`

Evidence = **staged index**, cùng nguồn/logic mà `claim.mjs --soat` đang dùng.

### `push.prepare`

Evidence = **unpushed commits**, cùng abstraction mà `safe-push`/`commitChuaDay` đang dùng.

### `generate.artifact`

Evidence = generator target/output set; không gộp mù vào `rule.change`.

**Decision C6:** reuse existing pure scope/evidence helpers; không dựng một scope calculator thứ hai.

## 14. Versioned unit, không ownership area

`workers/duc-auto-gemini/v0.1.0` và `v0.2.0` không phải cùng bootstrap unit chỉ vì cùng ownership family.

V1c resolve:

```text
target path -> exact versioned unit
```

sau đó mới resolve PHIEN/support state.

`focus` chỉ là orientation; actual targets/evidence quyết coverage.

---

## 15. Operation corpus — nghĩa vụ phải độc lập với registry

Nếu expected tests được sinh từ chính `luat.context`, xóa một entry có thể làm cả implementation lẫn test cùng “quên”.

Cần **independent obligation corpus** lấy từ active law/use cases thật.

First corpus tối thiểu:

```text
session/package.start
repo.read
repo.write / claim-before-write
commit.prepare
push.prepare
rule.change
generate.artifact
handoff.write
session.close
work.resume / recovery
orchestration.query
platform/bridge operation
hnx.fetch
audit.independent
backlog.write
```

Không có nghĩa operation enum cuối phải giữ đúng mọi tên trên. Corpus là list nghĩa vụ thật để fixture không tự sinh từ implementation config.

---

## 16. Non-PHIEN scopes

Không giả định mọi scope đều có PHIEN.

First slice phải khai rõ support matrix, ví dụ:

```text
PHIEN-backed versioned units     -> bootstrap via validated PHIEN
_shared / root infrastructure    -> explicit system bootstrap contract
hnx-fetch                         -> explicit non-PHIEN contract hoặc migrate riêng
legacy units không đăng ký       -> UNSUPPORTED, không đoán nearest PHIEN
```

**Decision C7:** unsupported phải được gọi đúng tên; không map một legacy version sang version khác chỉ vì version kia có PHIEN.

---

## 17. Orchestration is a special control-plane case

Orchestration không chỉ cần `AGENTS + ORCHESTRATOR` nếu chính protocol bắt thêm live evidence.

V1c phải đọc nghĩa vụ thật từ canonical loading law, bao gồm các nguồn/lệnh bắt buộc như:

```text
what-next
claim list / live ownership view
required HANDOFF tail nếu active protocol nói vậy
```

Không hard-code một simplified orchestrator bundle trong Context system.

---

# Continuity / Compact — giữ kiến trúc, chưa implement V1

## 18. Durable checkpoint trước summary

Phần này được cả reasoning và reviewer giữ lại:

```text
material durable fact
    -> persist canonical source ngay

continuity boundary
    -> carry pointers nhỏ

compact/new session
    -> rehydrate CURRENT bootstrap + required recovery context
```

Summary/carry là cache, không sở hữu:

- rule truth;
- ownership truth;
- product state truth;
- publish truth.

Vendor `PreCompact` nếu có chỉ là safety net.

**Decision C8:** không chờ tới lúc compact mới cứu durable facts.

---

# Explicitly removed from V1

## 19. Không build các abstraction sau trong first slice

```text
- context-registry.json riêng
- READY/WARN/BLOCKED JSON manifest contract
- schema_version cho descriptor/manifest chỉ để dự phòng
- route_evidence metadata framework
- risk subsystem
- authority/conflict engine
- retain policy framework
- generic lossy projector framework
- Context Delta
- NLP/LLM routing
- semantic LLM rule compression
- runtime adapter parity cho 4 vendor
- persistent Carry Packet song song HANDOFF
```

Có use case thật rồi mới thêm.

---

# Acceptance gates

## 20. V1a đạt khi

1. every supported PHIEN can be recomputed read-only from canonical sources;
2. missing required source cannot silently produce a valid bootstrap;
3. stale PHIEN is detected;
4. hard startup cap still blocks oversized generated bundle;
5. failure cannot leave an old PHIEN being silently certified as current.

## 21. V1b đạt khi

1. one machine LAW owns mandatory operation->source#section mapping;
2. AGENTS/LUAT-CORE projections cannot drift silently from that LAW;
3. exact sections are resolved deterministically;
4. actual chars are measured from actual content;
5. conditional/combined budget has a Đức-approved hard cap;
6. exceed cap exits non-zero.

## 22. V1c đạt khi

1. CLI is read-only;
2. same repo state + same operation/evidence => deterministic output;
3. commit uses staged-index evidence;
4. push uses unpushed-commit evidence;
5. exact versioned units resolve correctly;
6. unsupported/non-PHIEN units are explicit;
7. missing loading-law obligation is caught by independent fixture corpus;
8. output always includes context cost.

---

# Decisions still requiring Đức

## 23. D1 — conditional context budget

Không chốt số trong proposal. Cần đo section bundles thật rồi Đức duyệt cap.

## 24. D2 — PHIEN generated-artifact ownership

Chọn một:

```text
A. PHIEN là generated artifact 100% và được miễn locking theo generated-artifact policy
B. generator có target-scoped write, chỉ chạm PHIEN của unit đang thay đổi
```

Không giữ trạng thái hiện tại nếu một rule compile hợp lệ buộc phải giành lock của nhiều package không liên quan.

## 25. D3 — non-PHIEN support boundary

Khuyến nghị first slice:

```text
- support 4 unit hiện có trong luat.phien_goi.goi
- root/_shared có explicit system context path
- HNX có explicit hnx.fetch route, chưa bắt buộc migrate sang PHIEN
- legacy Gemini v0.1 = UNSUPPORTED cho package bootstrap, không map sang v0.2
```

---

# Recommended implementation order after one final review

```text
0. Reconcile active loading law drift + N-51 status

1. V1a PHIEN freshness/source-completeness gate

2. Measure current exact operation section bundles
   -> Đức chốt conditional hard cap

3. V1b luat.context + projection/drift tests + hard budget

4. V1c read-only context inspector CLI

5. Observe actual runtime context/token/latency

6. Only then decide whether JSON manifest, adapters, delta or deeper projection are justified

7. Continuity/compact automation after routing/loading correctness
```

---

# Final architecture

```text
                         CANONICAL LAW / STATE
                                  │
                 ┌────────────────┴────────────────┐
                 │                                 │
            Rule Compiler                    .repo-structure
                 │                          luat.context
        generate expected PHIEN          operation -> source#section
                 │                                 │
         V1a freshness gate                       │
                 │                                 │
                 └──────────────┬──────────────────┘
                                ▼
                       V1c read-only inspector
                  operation + exact evidence/unit
                                │
                 ┌──────────────┴──────────────┐
                 │                             │
          validated bootstrap          required-now sections
                 │                             │
                 └──────────────┬──────────────┘
                                ▼
                     chars + total + hard cap
                                │
                           OK / BLOCKED

AUTHORIZATION/PUBLISH SAFETY — vẫn độc lập:
claim.mjs / --soat / session-check / safe-push / tests

CONTINUITY — sau V1:
durable change -> canonical source -> compact pointers -> rehydrate current truth
```

## Final position

Sau Codex + CC, giá trị cốt lõi của Context Compiler không còn là “một Router thông minh”. Nó là:

1. **bootstrap phải luôn current và source-complete**;
2. **chỉ có một machine law nói context nào bắt buộc theo operation**;
3. **mọi context thêm vào đều được đo và chịu hard budget**;
4. **một lệnh read-only cho người/AI thấy context bill trước khi hành động**;
5. deterministic enforcement tiếp tục nằm ngoài prompt.

Đây là scope nhỏ hơn proposal đầu, nhưng sát failure mode hiện có hơn và rẻ để đổi nếu measurement sau này cho thấy assumption sai.

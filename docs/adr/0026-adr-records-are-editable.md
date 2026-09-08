---
status: Accepted
adr: 0026
date: 2026-09-09
deciders: Đức
decides: [0026]
supersedes_clause: "ADR-0000 law 1 (Accepted ADRs are immutable)"
---

# ADR-0026 — ADR records may be rewritten; decisions may not be lost

## Context

Đức, 2026-09-09, reviewing the whole rule corpus:

> *"rà soát thủ công và eliminate các decision, luật trùng nhau, nhiều quyết định sau cover
> hoặc reverse cái cũ -> sẽ sinh noise. khi add rules, ta cần categorize nó và xếp nó đúng chỗ,
> hợp lý chứ ko ghi kiểu cứ thêm dần thêm dần -> phình vô hạn. ko bao giờ control được."*
>
> *"ADR đã accepted vẫn có thể sửa, phân nhóm, gộp, viết lại để có kiến trúc tốt hơn, AI đọc
> dễ hơn. đừng máy móc add vào sẽ bị phình, và nên được làm điều này hàng tuần."*

**Measured the same day.** 26 ADRs + 4 protocol books + `AGENTS.md` = **3,918 lines of rules**,
and **nothing anywhere states which rule is in force today**. Five live contradictions were
found by hand:

| Conflict | Two rules that disagree |
|---|---|
| Locks | ADR-0023 *"no trace > 30 min → yield the lock"* vs ADR-0025 *"never release another lane's lock, only ask"* |
| Journal | ADR-0008 cut by count · ADR-0011 rotate by month *"instead of periodic cutting"* · ADR-0012 *"age is NOT a criterion"* |
| Package cap | ADR-0021 *"cap raised to TWO live packages"* vs ADR-0024 *"no package cap at all"* |
| Authority | ADR-0018 is `Accepted` but points to ADR-0019, which is only `Proposed` |
| Scope | ADR-0011 says `Superseded in part by ADR-0012` without saying **which part** |

The lock conflict cost real time on 2026-09-09: a session read ADR-0023's older sentence,
applied it to **its own** file lock, and held a lock it should have released immediately —
while both sentences were about **other lanes'** locks.

ADR-0000 law 1 made every ADR immutable and check **B12** enforced it byte-for-byte. That law
bought one thing: you can trust an ADR says today what was decided then. It also made the
contradictions above **permanently unfixable** — the only legal move was to add a 27th ADR,
which is exactly the growth Đức is objecting to.

## Decision

**⑴ The RECORD may be rewritten. The DECISION may not be changed.**

Two different acts, previously conflated:

| Act | Allowed? |
|---|---|
| Merge several ADRs into one topic file · regroup · translate · shorten · fix wording | **Yes** |
| Mark a clause dead because a later decision replaced it | **Yes** — cite the replacing decision |
| Change what was decided, with no new decision behind it | **No** |
| Drop a decision from the corpus entirely | **No** |

Git keeps every prior version, so the audit trail immutability protected is not lost — it moves
from "the file cannot change" to "every change is a commit you can read".

**⑵ Every decision keeps a permanent ID, and no ID may disappear.**

This replaces byte-immutability as the machine guard. B12 no longer asks *"did the body
change?"*; it asks *"is every decision ID ever issued still present in exactly one file?"*
A consolidated file declares what it carries in frontmatter:

```yaml
adr: 0008
decides: [0008, 0011, 0012]
```

Merging is free. Losing a decision is red. This is the risk that actually matters when 26 files
become 8 — B12 as written could not see it at all.

**⑶ Rules are written in English.** Measured: `AGENTS.md` is 16% non-ASCII, and Vietnamese
tokenises roughly 2–2.5× heavier than English for the same content. Every session loads that
file. Text Đức reads — dashboards, session logs, anything addressed to him — **stays
Vietnamese**; golden rule 5 is unchanged for those.

**⑷ The corpus is reviewed weekly, not on demand.** Đức: *"nên được làm điều này hàng tuần."*
A review pass merges what has drifted apart and marks what a later decision replaced. Adding a
rule without saying which rule it replaces remains forbidden — that is limit ⑦, unchanged.

## Consequences

**Gained:** the five conflicts above become fixable. The corpus can shrink instead of only
growing. AI sessions load one register instead of reconstructing law from 26 chronological files.

**Lost, and it is a real cost:** "this file has not changed since it was accepted" is no longer
true by construction. Anyone who needs the original must read `git log -p` on the file. The
protection that remains is procedural — ⑴ above — plus the ID ledger in ⑵, which catches loss
but cannot catch a substantive rewrite. **If Đức later wants that back, the cheap version is a
gate check that any diff to an Accepted ADR body must name the decision authorising it.**

**Not done on purpose:** no attempt to keep a second "immutable original" copy. That is two
sources of truth for one decision, which is the failure ADR-0006 already names.

## Status

Accepted

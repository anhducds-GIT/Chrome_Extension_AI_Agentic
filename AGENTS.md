# AGENTS.md — repo constitution

> **Layer 1: the register of rules in force today.** Read it fully before your first edit.
> One rule per line, plus the decision record behind it. No history, no measurements — those live
> in the ADR each line points to. Layer 2 handbooks are in §7; do not read them up front.
>
> Owner is **Đức** — non-technical, Vietnamese, short sentences, and the only person who decides.
> **This file is English because every session loads it** (~2× cheaper to read than Vietnamese).
> Anything Đức reads — dashboards, session logs, messages to him — stays Vietnamese: §5.

## 0. A session, start to finish

1. **Open:** read this file → the `AGENTS.md` of the package you are about to touch → the tail of
   that package's `HANDOFF.md`.
2. **Work:** one thing at a time. Anything out of scope goes to `BACKLOG.md`; do not just do it.
3. **Close:** run the gate. Red means not done. Never report "done" on a red gate, and never edit
   the gate to make it green.

```bash
node scripts/session-check.mjs --as <your-session-name>
```

### 0a. Closing order — getting it wrong doubles your time

```
--sua → edit → --soat → commit → --xong → regenerate artifacts → commit
      → npm run test:song-song → gate → safe-push → release area locks
```

- **Run the full suite AFTER your last commit.** The runner leaves a stamp bound to HEAD plus a
  working-tree hash; the gate reuses a valid stamp instead of re-running. Committing afterwards
  invalidates it. Measured on the same mechanism: **1,095s → 278s**.
- **While working, run one suite:** `node scripts/chay-test.mjs --chi <suite>`. It deliberately
  writes no stamp. The full suite runs **once**, at the end.
- **Do not change `scripts.test`.** It is a sequential chain on purpose — a pin inside
  `duc-auto-*` reads that field to catch fake-green.
- **A generator that writes into a constrained book runs ONCE, after the suite is green.**
- **Never `git push`.** It sweeps up every other session's commits from the shared worktree
  (happened for real on 26/08). Use `node scripts/safe-push.mjs --as <your-session-name>`.

## 1. Locks — who may write where

State lives in `.agents/claims.json`. **One area, one writing session at a time.** Every
take and release goes through the command; never hand-edit the file.

### 1a. File locks are the default — hold briefly, release at once

[ADR-0025](docs/adr/0025-khoa-muc-file-giu-ngan-tra-ngay.md).

Take immediately **before** a write, release immediately **after**. **Reading needs no lock.**
Take a whole area only when you genuinely edit across it.

```bash
node scripts/claim.mjs --sua <path> [<path>…] --as <session>   # before writing
node scripts/claim.mjs --soat --as <session>                   # before git commit
node scripts/claim.mjs --xong --het --as <session>             # right after writing
git config core.hooksPath .githooks                            # once, covers every lane
```

When you really do edit across a whole area, claim the area instead — those commands stay:

```bash
node scripts/claim.mjs --list
node scripts/claim.mjs --take <key> --as <session> --task "one sentence"
node scripts/claim.mjs --release <key> --as <session>
node scripts/claim.mjs --khai-vung <key> --as <session>   # open a NEW area
```

- **Containment runs both ways.** Someone else owns the area → your file lock is refused.
  Someone else's file lock sits inside → your area claim is refused.
- **File locks release at END OF SESSION. Area locks release AFTER PUSH.** Two lock kinds, two
  deadlines. The gate is red while you still hold a file lock. If a push fails, **keep the area
  lock** and say so — an unpushed commit in an ownerless area turns the gate red for whoever
  comes next.
- **`--soat` is mandatory before `git commit`.** It covers what locks cannot: two lanes share one
  git worktree, so `git commit -a` sweeps files another lane just staged, and `git commit -o`
  sweeps their edits to the very file you named. The `commit-msg` hook runs it inside the commit
  itself, closing the window between checking and committing. It **fails open** in three places
  and blocks only a real violation; if you are stuck, `git commit --no-verify` and **say so in
  the session log**.
- **Never release another lane's lock** — not when the gate calls it overdue, not when it reports
  "no trace in the repo yet". That sentence means *the repo has not seen anything*; it does not
  mean the lane is idle. Three lawful releases: **the lane releases it** · **the lane reports
  done** · **Đức decides the transfer** (`--restamp --as <session> --duc-duyet "<his words>"`).
  A lock sitting a long time is a reason to **ask**, never to take.
- **Never hand-edit `claims.json`.** Read-modify-write silently overwrote a claim once. To open a
  new area use `--khai-vung`; hand-editing then `--restamp` looks identical to stealing a lock.
- **Never pipe `claim.mjs`.** A pipeline's exit code is the *last* command's, so
  `claim.mjs --take … | tail -3 && git commit …` proceeds even when the claim was **refused**.

### 1b. Areas, exemptions, generated files

| Key | Covers |
|---|---|
| `_docs` | `docs/` |
| `_code` | `scripts/` + `tests/` |
| `_root` | everything else, plus top-level files |
| `workers/<package>` | that package |

Claim the area you actually touch, never the whole root. The gate names the missing key. Whoever
splits an area declares `steward` in the `areas` block of `.repo-structure.json`.

**Five generated artifacts need no lock:** `DASHBOARD.md` · `llms.txt` · `repo-map.json` ·
`DASHBOARD-Chrome-Extension-AI-Agentic.html` · `FEATURE-PARITY-AUTO.md`. Re-running the generator
reproduces them exactly, so there is nothing of anyone's to lose. Declared in `generated`.
`FEATURE-PARITY.md` is deliberately **not** among them — its §2 is human prose (§7).

**Two kinds of exemption, different conditions:**

- **Unconditional:** `.agents/claims.json`. Without it, releasing a lock would itself count as
  editing a source file.
- **Only when appending at the end:** root `HANDOFF.md` · `IDEAS.md` · root `BACKLOG.md`. Every
  lane must write to these, so making them queue behind `_root` would block the very rules that
  require them. **Editing or deleting older lines is not exempt** — unless you hold the lock on
  that file, in which case it is allowed: exempt means *no lock required*, not *no lock helps*.
  Closing an item in those books is also just **one appended line**; never rewrite the old block.

Declared in `append_only_exempt` in `.repo-structure.json` — **edit there, never in a script.**

## 2. Commit and push

- **Every commit ends with `Lane: <session-name>`** — exactly the name you passed to `--as`, one
  line, no spaces. Missing it turns the gate red **and** `safe-push` refuses; `--carry` cannot
  open that door, because it approves "carrying X's work" and an unlabelled commit has no X. The
  label is **provenance, not permission** — who may write is decided by §1. A broken label is red,
  never guessed; fix with `git commit --amend`.
- **Committing and pushing need no approval** (Đức, 26/08) when all three hold: ⑴ the work is
  complete — never push work in progress · ⑵ the gate is fully green, and for code, independently
  audited · ⑶ you push with `safe-push.mjs`.
- **`--carry` needs no approval** ([ADR-0005](docs/adr/0005-duyet-thuong-truc-cho-push-va-carry.md)).
  In exchange, **every `--carry` must name the carried lane in the session log** — that is the
  only trace left.

## 3. Ask Đức first

1. A new extension permission
2. A new live pilot on a real site
3. Changing a safety law (retry, halt, attribution, persistence, exact-once)
4. **Force-push, rewriting history, merging a branch into `main`**

Plus Đức's standing rules: send nothing outward · delete no files · modify no source data ·
create no self-running automation — not without asking.

## 4. Hard limits

1. **No cap on the number of packages.** All five are live
   ([ADR-0024](docs/adr/0024-mo-bang-toan-bo-nam-goi.md)). The freeze mechanism stays in place
   with an empty list — it is a switch Đức can flip back. Limits ⑦ and ② now carry the weight this
   cap used to; do not loosen either.
2. **Never build one feature twice.** Needed in two packages → `workers/_shared/` first.
3. **`docs/` ≤ 8,000 lines is the TARGET; the ratchet is what the machine watches.**
   `docs.tran_dong_khong_ke_adr` holds today's number, excluding ADRs. The gate is red above it,
   and tells you to lower it once you are 50 lines under. A check that is red for every session
   for weeks is a check that gets deleted — that is why the machine does not watch 8,000 directly.
4. **`AGENTS.md` has a ratchet too:** `agents.tran_dong`. Same shape, same reason.
5. **Infrastructure backlog ≤ 15 items.** Count it, do not trust this line:
   `node scripts/backlog-check.mjs`. The way out is **closing an item** — append
   `- **ĐÓNG <id>** · …` at the end. Cap lives in `backlog.tran`; **ask Đức before changing it**.
6. **A test file that catches 0 mutations gets deleted.** A check that catches nothing still taxes
   every session.
7. **At most 2 parallel chats.** Đức, 07/09: *"lane ở đây tôi hiểu là 2 phiên chat với AI; trong 1
   chat mà bạn manage cùng lúc 5 task chạy ngầm không giẫm chân nhau thì tôi vẫn ok"* — so
   background tasks **inside** one chat are not limited.
8. **One rule in, one rule out.** Adding a rule here must name the rule it replaces, or measure how
   many times it has actually fired. The place for the story is the ADR, not this file.
9. **Rules get reviewed weekly, not on demand**
   ([ADR-0026](docs/adr/0026-adr-records-are-editable.md)). ADR records may be merged, regrouped,
   translated and rewritten; a decision may never be lost. Check B12 enforces the second half.

## 5. Never

- `pilot-*/`, `Pilot-*/`, `Batch-*/`, `evidence/` are **operational evidence**: append only —
  never edit, delete, or regenerate.
- Never let a token, password, or pairing file into the repo. **This repo is public.**
- Never assign `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.
- Never weaken an existing guard to make the gate pass. Fixing a bug is fine; removing a guard is
  not.
- Never guess a selector. Every selector needs real DOM evidence — call `diagnostics.dom_probe`
  through the Bridge rather than asking Đức to look.
- Never trust another AI's report. Re-run the tests yourself, re-read the diff yourself. "Done"
  from a sub-agent is not evidence.
- Never `git checkout`, `reset` or `stash` live state files. `.agents/claims.json` holds other
  sessions' uncommitted locks; to compare against HEAD use `git show HEAD:<file>`.

**Two rules about people, not machines:**

- **Every fix ships with a pin.** The suite never touches a real DOM, so evidence fixtures are the
  whole value.
- **Write for Đức.** If Đức cannot follow it, that is a system failure — rewrite it simpler.
  Operator-visible text is Vietnamese; error codes are English.

## 6. Roles — by direction of work, not by vendor

**Đức decides everything.** Beyond that there are two roles
([ADR-0017](docs/adr/0017-hai-vai-assistant-thay-the-mot-cua.md)). A role belongs to a **session**,
not a vendor: any model can hold any role, and a session holds exactly one until it closes.

| Role | Owns | Does | Must not |
|---|---|---|---|
| **① Core keeper** | rules · tooling · state of this repo | every patch ships a pin · delete rules that never fired · keep the gate's teeth | loosen a guard for a green gate · **sign off on its own work** |
| **② Outbound** | the only door between this repo and everything else | run the process against other repos and packages · **bring failures back as backlog items** · improve that process | patch the core to make outside work run — failures go **to role ①** · report a process as passing before it has actually run |

- **Load-bearing invariant: whoever makes a fix does not sign it off.** A sign-off written by the
  party being checked is a self-declaration, not a barrier — the same rule `SELF_ATTESTATION`
  enforces in the permissions core. Do not read it as "the fixer may not look for bugs": anyone may
  find a bug anywhere; what must be separated is **signer** from **fixer**.
- **Handover between roles has exactly one shape:** role ② writes the failure into `BACKLOG.md`
  with an `đóng khi:` field; role ① turns it into a patch plus a pin. This half is machine-checked
  (`npm run test:backlog`); the *"② finds, ① fixes"* half is prose, not enforced — said plainly so
  nobody believes otherwise.
- Both roles may run at once, in **different areas** (§1), which fits the 2-chat limit exactly.

**How this file reaches each AI:** Claude reads `CLAUDE.md`, which points here. Codex reads
`AGENTS.md` directly. **Antigravity needs one pasted line each session:** *"Đọc AGENTS.md ở gốc
repo trước khi làm gì."* — it was never proven to load the file on its own.

## 7. Handbooks — Layer 2, open on demand

| When you are about to… | Open |
|---|---|
| **Touch the three `duc-auto-*` packages** | That package's own `workers/<pkg>/<ver>/AGENTS.md`, with its `BACKLOG.md` and `HANDOFF.md` beside it. They are **forks of each other** (limit ②), so one bug usually has three copies and patching one leaves two |
| **Coordinate: Đức asks what is happening, what is next, what can run in parallel** | `docs/protocols/ORCHESTRATOR.md` — the **hard role firewall** (a coordinating session does not code, debug, or propose patches; no "small fix" exception), the five-part report shape, when to ask Đức. Tool: `node scripts/what-next.mjs`, read-only, no lock needed |
| **Find out what Đức decided, and why** | `docs/adr/` for repo-wide decisions, `workers/<pkg>/<ver>/docs/adr/` for one package. Rules for the register: [ADR-0000](docs/adr/0000-ghi-nhan-quyet-dinh-kien-truc.md) and [ADR-0026](docs/adr/0026-adr-records-are-editable.md). Template: `docs/_TEMPLATE-adr.md` |
| **Write a journal entry, or the gate rejected yours as too long** | `docs/protocols/HANDOFF.md` — what an entry holds and what belongs elsewhere (reason → ADR · open work → `BACKLOG.md` · method → brief). Cap **2,600 bytes per entry**, and the gate blocks **only the entry you just added**; a book keeps **20 entries** ([ADR-0008](docs/adr/0008-cat-duoi-handoff-giu-hai-muoi-luot.md)), with `handoff.tran_so_muc` as the trip wire. Tools: `node scripts/handoff.mjs --check` · `--rotate <file>` moves into a new month ([ADR-0011](docs/adr/0011-handoff-chan-o-dau-vao-va-xoay-theo-thang.md) clause ⑴) |
| **Read further back than 20 entries** | `HANDOFF-ARCHIVE-*.md` next to that `HANDOFF.md`. They chain: `-02` carries a pointer back to `-01`. **Verbatim, read-only** — reassembling them reproduces the original byte for byte. Cut again: `node scripts/handoff.mjs --cat <file> --giu 20` |
| **Know what your branch is missing versus the other** | Two files, read together ([ADR-0014](docs/adr/0014-tach-khoi-may-sinh-cua-bang-doi-chieu.md)): `FEATURE-PARITY.md` is **human prose** (§2 behaviour, evidence tagged **[ĐỌC]**) and needs `_root`; `FEATURE-PARITY-AUTO.md` is **machine numbers**, generated and lock-free. Never put human prose on a machine line — one explanation was already swallowed that way. **[DÒ]** rows are name-matching guesses: verify before acting |
| **Understand the repo in one read** | `llms.txt` (llmstxt.org entry point) and `repo-map.json` (machine map, versioned schema). Both from `node scripts/build-dashboard.mjs` |
| **See which extensions exist and which work** | `DASHBOARD.md` — generated, never hand-edited |
| **Run a multi-extension setup, or add one** | `PLATFORM.md`; declare a new one by copying `STATUS.template.md` next to its `manifest.json` |
| **Find out what the repo owes structurally** | `node scripts/check-bootstrap.mjs [--all]` — B1…B15, each line naming both the fault and the fix. Eight block: `B1 B2 B3 B4 B5 B7 B10 B12`, declared in `bootstrap.blocking`. The other seven — `B6 B8 B9 B11 B13 B14 B15` — only warn; **B15 enforces the write-for-Đức rule** on the three board fields |
| **Fetch HNX data, or work on that package** | `workers/hnx-fetch/PROTOCOL.md` ([ADR-0021](docs/adr/0021-hnx-fetch-tach-thanh-extension-rieng.md)) — a standalone runbook written for a non-Claude AI. That extension has **no `debugger` permission**, so it cannot click anything; clicking is Scouter's job |
| **Work on Scouter** | `workers/duc-scouter/v0.1.0/AGENTS.md` ([ADR-0009](docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md) · [ADR-0013](docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)). Two traps: **a selector never goes into the seed** (seed/adapter boundary), and its Bridge door does a **two-way handshake**, so it pairs only with the ChatGPT-era host |
| **Find a document, or an old `drafts/…` path** | `docs/README.md` — index plus a map of 33 old paths. `drafts/` at repo root is gone |
| **Write a new study** | `docs/_TEMPLATE-study.md`. A retired study is **deleted**, not archived — git keeps it |
| **Reuse or change the harness** | **Not in this repo.** It lives at `https://github.com/anhducds-GIT/Ark_Repo_Harness` ([ADR-0001](docs/adr/0001-template-o-repo-doc-lap-project-3ai-nghi.md)). This repo is a **consumer** |
| **Change the Assistant package** (`what-next.mjs` · `state-check.mjs` · `ORCHESTRATOR.md`) | **Change it in the harness first**, then bring it back ([ADR-0006](docs/adr/0006-goi-assistant-phat-hanh-tu-bo-khung.md)). The other order produces two versions of one package, each claiming to be canonical |
| **Place a pairing file, launcher, or Bridge write-area** | **Do not pick a location.** Everything Bridge-related lives under the path declared in `thu_muc_ngoai_repo`. Use `node workers/_shared/bridge-host/tao-tep-ghep-cap.mjs --goi <pkg>`; it reads the map. The write-area is **always a subdirectory**, because `file.read` can read anything beneath it |
| **The gate reports `DAU_VO` — the claims table was hand-edited** | `git diff .agents/claims.json` → was your key reassigned? → if yes, **ask Đức** → only then `--restamp`. **Never restamp just to move on**: that stamps the edit as lawful and erases the evidence. If the edit moved a key away from someone, `--restamp` refuses until you pass `--duc-duyet "<his words>"`, and that sentence is written **into the table**, where the lane who lost the key will actually read it |
| **Work alongside another AI, or change one of the four concurrency mechanisms** | `docs/protocols/MULTIFLOW.md` — the four mechanisms, six invariants with the reason for each, the change procedure (**mutation testing is mandatory**: four times in one day a freshly written guard turned out to do nothing while the tests stayed green), and the error-code table |
| **Understand why sessions collide** | `docs/studies/PARALLEL-WORK-DESIGN-V0.md` — separates two different problems: claims being overwritten (a bug, fixed) and pushes carrying other sessions' commits (a consequence of one branch) |
| **Give Đức a line to paste** | `PROMPTS.md` — one block per flow. **Every line must work with all three AIs**, so it states the goal, never a tool name |
| **Let Đức open the status board himself** | `bang-trang-thai/` — three doors, one core. Four safety latches, all pinned by `tests/bang-ba-cua-smoke.mjs`: it stops generating while a session holds `_code` and says why · HTML board only · no commit, push, or claim · 30-second batching |
| **Generate the board** | `node scripts/build-overview.mjs <out.html>` — same source as `DASHBOARD.md`, so the three views cannot disagree. Output is **not committed**. Banned inside the page: SHAs, paths, percentages, self-praise |
| **Record a debt you tripped over while doing something else** | `BACKLOG.md` — infrastructure debt, lock-free, exit is one appended line. `đóng khi:` is **required** and counted (`npm run test:backlog`): if you cannot state the closing condition, the item is not ripe |
| **Park an idea of Đức's** | `IDEAS.md` — a waiting room, not a second roadmap. Requires `bậc` and `việc kế`; while being built it must declare `chủ` and `phạm vi`. Once an idea has a home, it leaves the book |

## 8. Closing a session — record three things

1. One log line in the package's `HANDOFF.md`: what you did, the numbers, what is still open.
2. A new decision from Đức → its ADR.
3. A new failure seen on a real site → one row in the handbook's error table, **and** consider one
   more check in `scripts/session-check.mjs`.

> A rule no machine can check will eventually be ignored. That is why the gate exists.

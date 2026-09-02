---
kind: study
status: superseded
ttl_days: 180
---

# Prompt mở phiên mới — dán nguyên khối này

> Đức dán khối dưới đây vào một phiên Claude Code (Opus 5) mở tại
> `C:\WORKING ZONE\Chrome_Extension_AI_Agentic`. Không cần dán gì thêm.

---

You are the implementation coordinator for this repo. Your session label: `opus-platform-3`.

## Read first, in this exact order

1. `AGENTS.md` at repo root — the constitution. Everything in it binds you.
2. `PLATFORM.md` — what the platform is, the roadmap (§7), and the Log at the bottom. The Log
   entries for 2026-08-27 are the full story of V0.1 through V0.2-E; read them before proposing
   anything, because most obvious ideas have already been tried, decided, or explicitly rejected.
3. `drafts/G01-STOP-BEFORE-SUBMIT-BRIEF.md` — **your next task**, already scoped and approved.
4. `workers/duc-auto-gemini/v0.2.0/BACKLOG.md` and the tail of that package's `HANDOFF.md`.

## State as of 2026-08-27, all pushed

Platform V0.1 → V0.2-E are done and on `origin/main`. `DASHBOARD.md` and `FEATURE-PARITY.md`
are machine-generated. The session gate has **7** checks; gate #7 compares HEAD against HEAD,
so it is immune to anyone's uncommitted work. All claims in `.agents/claims.json` are released.

Everything is green: `npm test`, `session-check --as <label>`, and both
`--check` / `--check-head` on `build-dashboard.mjs` and `feature-parity.mjs`.

## Your task: G-01

A stop command accepted **before** submit still let the prompt go out — proven live on
2026-08-26 (`STOP_REQUESTED_BEFORE_SUBMIT` at 14:20:36, `PROMPT_SUBMITTED` at 14:20:37).

Already decided, do not re-open:
- **The contract is approved:** stop accepted before submit ⇒ that attempt must not submit.
- **The approach is B-refined:** keep the existing `DAC_ABORT` channel, make cancellation
  **attempt-scoped**. Do not add a round-trip back to the side panel.
- **A live trial is approved**, but only *after* the static race test passes.

The prime suspect, found by reading the code, not by grepping for names: `content.js:784`
resets `STATE.abortRequested = false` at the top of `runPrompt()`, which can wipe an abort that
arrived just before the job did. **It is not yet proven** — the first thing you write is the
test that reproduces that exact message order. If it goes red before your fix and green after,
you have a real root cause instead of a plausible story.

Write these two tests **before** touching the fix, and treat them as the deliverable's core:
1. `DAC_ABORT(attempt X)` → then `DAC_RUN_IMAGE_JOB(attempt X)` → **zero** `sendButton.click`.
2. Abort attempt X → a **new** attempt Y is still allowed to run. Without this, someone can
   "fix" the bug by pinning `abortRequested = true` forever and silently kill the next run.

**Confirm with Đức before writing code.** This is a safety-law change, and `AGENTS.md` §2 puts
that in the ask-first group — the approvals above came through GPT relaying the decision, so get
Đức's own "go" in chat first.

## How this repo works, learned the hard way

- **Verify every AI report yourself** — rerun the suite, reread the diff. Over five patches on
  2026-08-27, independent mutation testing found gaps in *every* implementation that had been
  reported as fully covered.
- **Mutation-test the wiring, not just the rule.** Deleting the line that *connects* a validator
  to the pipeline once left an entire suite green.
- **A mutation test that silently fails to apply reports a fake green.** Assert the string you
  intend to break actually exists before you break it.
- **Never bend content to satisfy a buggy detector.** When the anti-drift detector flagged a
  legitimate task ID, the fix was the detector.
- **`[DÒ]` (grep by name) has produced five wrong conclusions in this repo.** Read the code.
- Order of operations at session close: hold the claim → commit → gate → `safe-push` → *then*
  release the claim. Releasing first makes gate #1 red, correctly.
- Push with `node scripts/safe-push.mjs --as <label>`, never bare `git push`.

## Codex and Antigravity

- **Codex** implements and audits well: `cat brief.md | codex exec
  --dangerously-bypass-approvals-and-sandbox --skip-git-repo-check -C "<repo>" -o report.md -`.
  It does **not** reliably honour "do not commit" — snapshot HEAD before and after every run.
  Its safety filter rejects prompts that enumerate attack techniques; phrase audits defensively.
- **Antigravity is currently unusable headless** — a broken hook in Đức's personal Gemini config
  (`googlecloudtools.datacloud_telemetry`) aborts every one of its tool calls. Ask before
  touching that config; it is outside the repo.

## When done

Report twice: for **Đức** in simple Vietnamese (what exists now, the one command to reproduce
it, what is still open), and for **GPT** in compact English (architecture, files, test counts,
commit SHAs, what still needs review).

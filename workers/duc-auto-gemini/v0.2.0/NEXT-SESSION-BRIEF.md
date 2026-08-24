# Next session brief — selective run & deliberate override

Written 2026-08-22 at the end of a long session. Read this plus `HANDOFF.md`
(the Log at the bottom) before touching anything.

---

## 0. State of the tree

- **Tests: 34 passed, 0 failed.** Run everything with one command from the repo root:
  ```bash
  npm test
  ```
- **Nothing is committed.** 9 modified files + 3 new files sit in the working
  tree on `main`. Đức has not approved a commit yet. Ask before committing;
  never push or merge without him (his rule).
- Last commit `4e4a9f5` ("1") is Đức's own, made mid-session.
- Other agents edit these files too. Codex made a SETUP overlap fix, and at
  least one change (`workbook-actions`) came from outside this session. **Check
  `git status` and re-read a file before editing it.**

## 1. Hard constraints — do not break these

- Never assign `.innerHTML` / `.outerHTML` / `insertAdjacentHTML`.
  `tests/artifact-integrity-smoke.mjs` fails the build if any appears. This is
  a security requirement: thumbnail URLs come from the chatgpt.com DOM.
- Never weaken exact-once submission, attribution, readiness gating, retry
  semantics, persistence verification, the checkpoint protocol, or the security
  hard-stop.
- Never edit, regenerate or delete anything under `pilot-03/`, `pilot-05/`,
  `pilot-06/`. They are operator evidence.
- Operator-facing text is **Vietnamese** (`operator-messages-core.js`); finding
  CODES stay English because they are identifiers in the audit JSONL, the
  Result ledger and the tests. Never let a safety test assert on a caption.
- Any `.js` change requires Đức to reload the extension at `chrome://extensions`
  before testing. Say so in every handover.
- The in-app Browser pane **cannot** verify this UI — it strips stylesheets and
  blocks scripts. Do not build preview harnesses. Reason from source, write
  static tests, and hand visual acceptance to Đức.

---

## 2. Issue A — Run button says READY but nothing runs (BUG)

**Reproduced, root cause known.** Not a mystery; do not re-investigate from scratch.

With `pilot-06/Duc-Auto-ChatGPT-Pilot-06__results__v02.xlsx` as the ledger:

```
P06-A..P06-E  = SAFE_COMPLETE      plan.ready = true, 0 blockers
selectQueue(queue, "all")  ->  EMPTY
```

`controls()` enables Run from `workbook && prepared && outputSettings && validated`.
It never asks whether any job is actually eligible. So the chip reads
"READY TO RUN", the button is green, and `run("all")` immediately returns
`{ ok: false, reason: "No all jobs are eligible." }`.

The status does flip to `NOT READY` with that message, but after a green
"ready" button that reads as "nothing happened".

**Fix direction:** make the control reflect real eligibility. Compute the
selected-mode queue length in `controls()` and disable Run when it is zero,
with a Vietnamese reason next to it (e.g. "Mọi job trong ledger đã hoàn tất —
chọn job muốn chạy lại bên dưới"). Do not make Run *do* something when there is
nothing to do.

This bug disappears in practice once Issue B and C exist, but fix it anyway:
a green button that cannot act is the exact class of lie this project rejects.

---

## 3. Issue B — deliberate re-run / override of a completed job (FEATURE)

Đức wants to regenerate an image he is unhappy with, and let the new image
replace the old one.

**Current behaviour, verified:**

- `runner-core.prepare()` honours `rerun_done=true` and marks completed jobs
  `PENDING` / `PRE_SUBMIT`.
- `resume-core.applyToQueue()` then **overrides that**: any `SAFE_COMPLETE` job
  becomes `skipped: true, protected_checkpoint: true`.
- Result: **there is no path to re-run a completed job while resuming.**
  `rerun_done` only works on a fresh (non-resume) run.

That override is deliberate — README: "Completed verified outputs stay skipped
forever". It is the guarantee that a finished job is never silently redone.

**Recommended shape** (Đức asked whether full replace is reasonable — this is
the answer to give him):

1. **Per-job, explicit.** Re-run must be chosen for named jobs, the way
   Recreate already is. Never a blanket toggle that quietly unlocks everything.
2. **Confirmation naming the jobs**, in the same style as the Recreate dialog.
3. **Preserve the old image by default.** `collision_policy` already supports
   `overwrite` / `uniquify` / `fail`. Default the re-run to keep the previous
   file (`uniquify` → `__attempt-01`) and offer "đè hẳn lên ảnh cũ" as an
   explicit choice in the confirmation. Destroying the only copy of a verified
   artifact should be a decision, not a default.
4. **Record the supersession.** The ledger and audit must say a replacement
   happened: which attempt replaced which file, and when. Otherwise the audit
   claims a history that no longer matches the folder.
5. Everything else stays: readiness gate before submit, verified persistence
   before SAVED, a new checkpoint version after.

Reuse the `recreate_*` ledger fields and the approval/checkpoint sequence in
`persistRecreateApproval()` rather than inventing a parallel mechanism.

---

## 4. Issue C — choose which tasks to run (FEATURE)

Today SETUP always runs everything. Đức wants to pick jobs from the loaded list.

**Most of this already exists:**

- `runner-core.selectQueue(queue, mode, selectedId)` already implements
  `all`, `pending`, `failed`, `recreate`, `selected`.
- `sidepanel.js` only wires **two** buttons: `run("all")` and `run("failed")`.
  `pending` and `selected` have no UI at all.
- `renderQueue()` already tracks `state.selectedJobId` on row click and renders
  an expanded detail panel — a single-selection affordance is already there.

**Fix direction:** extend `state.selectedJobId` to a selection *set*, add a
checkbox per queue row, and wire a "Chạy job đã chọn" control. `selectQueue`
likely needs a `selectedIds` array rather than one `selectedId`; keep the
existing single-id behaviour working or update its callers and tests together.

Note `selectQueue("selected")` currently refuses anything not in `PRE_SUBMIT`
and excludes `SUCCESS`/`INTERRUPTED`/`STOPPED` — which is what makes Issue B
and Issue C the same piece of work. Design them together.

---

## 5. Suggested order

1. Issue C (selection UI + `selectQueue` set support) — it is the surface both
   other items need.
2. Issue A (Run reflects real eligibility) — trivial once selection exists.
3. Issue B (override, on top of the selection surface) — the risky one; do it
   last, with the confirmation and provenance rules above.

Write regression tests for each before handing back. Then ask Đức to reload the
extension and accept the UI visually.

---

## 6. Useful commands

```bash
npm test
```

```bash
node workers/duc-auto-chatgpt/v0.1.0/scripts/add-jobs-to-ledger.mjs <ledger.xlsx> "ID=prompt"
```

Adds PENDING jobs to a Result ledger so a continuation has real work. Editing a
verified checkpoint by hand is acceptable for test fixtures only.

# Agent Bridge Tier 1 — handoff to Codex

Written 2026-08-24 by Claude, acting as coordinator. Đức continues this work
with Codex directly. This file is self-contained: Codex needs nothing from
the conversation that produced it, but should read `AGENTS.md` and
`decisions.md` in this same folder first — this handoff implements the
Tier-1 decision recorded there today.

Design of record for the *existing* Bridge: `drafts/AGENT-BRIDGE-DESIGN-V1.md`
and `drafts/AGENT-BRIDGE-HANDOFF.md` (WP-1..WP-4, already shipped and live-
tested). Read those before touching `bridge-core.js` — this handoff **adds**
to that surface, it does not replace it.

---

## 0. What Tier 1 actually is

Today, the only Bridge write path is `queue.propose`: an external agent
stages a job, and Đức must click **Duyệt & ghi checkpoint** in the side panel
before it becomes a real Queue row. That path stays exactly as-is — do not
remove or weaken it.

Tier 1 adds a **second, parallel set of write methods** that need **no**
owner click. An external agent using these methods gets the same power Đức
has on the SETUP tab — add/edit/remove/reorder jobs, change output naming,
change Run Settings — up until the moment Run is pressed. **Run itself stays
100% Đức's own click, no exceptions, no new method may reach it.**

This is a real, deliberate policy change, recorded in `decisions.md` under
2026-08-24. Re-litigating whether AI should have this much Setup power is out
of scope for this handoff — Đức already decided it. What Codex is building is
the *safe mechanics* of that decision, not re-debating the decision.

---

## 1. Two constraints that are physics, not policy — design around them, don't paper over them

1. **No new method may open a native file/folder picker.** `showOpenFilePicker()`
   (choosing an .xlsx from disk) and `showDirectoryPicker()` (binding a
   *brand-new* output folder) both require a live user gesture inside the
   side panel document. Chrome refuses them when called from a Bridge RPC
   handler running off a WebSocket message — there is no workaround.
   - "AI loads a workbook" therefore means: build/extend an **in-memory**
     session the same way the existing Quick Prompt feature does
     (`window.DacXlsx.createWorkbook(fileName, jobs)` if no session is open,
     `addJob`/`addJobsBatch` to extend one that is — see `sidepanel.js`'s
     `submitQuickPrompt`/`checkQuickPrompt`/`splitQuickPromptText`, added
     2026-08-23, entry in `HANDOFF.md`). Do not attempt to synthesize a picker
     call or bypass the gesture requirement.
   - "AI configures output" means: adjust naming/save-toggle/collision-policy
     fields on the profile **already bound** (Đức picked it once, by hand,
     earlier). If no profile is bound yet, the method must fail closed with a
     clear error, not fall back to guessing a folder.
2. **Run stays reserved.** No new method, no combination of new methods, may
   start/pause/resume a run or submit anything to ChatGPT. `run.start`,
   `run.pause`, `run.resume` remain absent from `METHOD_REGISTRY`. If you find
   yourself writing code that would let a sequence of Bridge calls result in
   an image being generated without Đức's own click on the Run button in the
   side panel, stop — that violates the one constraint that was never up for
   negotiation in this handoff.

---

## 2. New methods to add to `bridge-core.js` / the executor dispatch

All six are `context: "executor"`, `requires_executor: true`, `read_only:
false`, **`approval: "none"`** (this is the actual Tier-1 change — contrast
with `queue.propose`'s `approval: "owner_click"`). **These six mutate
`state.workbook` synchronously, inside the RPC call itself — they do not
stage a proposal record for a later human approval step.** That staging
mechanism (`bridge-proposal-core.js`'s pending-record store,
`AWAITING_OWNER_APPROVAL`, the "ĐỀ XUẤT TỪ AGENT" card) is what makes
`queue.propose` safe *without* Tier-1 trust; it is deliberately the wrong
model to copy here — reusing it for these six would silently reintroduce the
owner-click gate Tier 1 exists to remove. Add them to
`METHOD_REGISTRY` in `bridge-core.js` the same way `queue.propose` is
registered, and add handlers to `bridgeExecutorDispatch`'s `handlers` object
in `sidepanel.js` (currently `system.ping`, `queue.list`, `run.status`,
`ledger.read`, `queue.propose`, `queue.proposal.get`).

- **`jobs.add`** — params: `{ jobs: [{ prompt, reference_images?, settings? }, ...] }`
  (no `client_job_id`/idempotency ceremony needed here — that machinery exists
  because `queue.propose` is a two-phase stage-then-approve flow; `jobs.add`
  is one-phase). If no workbook/session is open, create one via
  `createWorkbook`; otherwise append via `addJob`/`addJobsBatch`. Returns the
  assigned job IDs.
- **`jobs.update`** — params: `{ job_id, prompt?, reference_images?, settings? }`.
  Must reject (clear error code) if the job is not `PRE_SUBMIT`. **No existing
  Setup-tab button does exactly this** (confirmed by reading the file: the
  operator can only Duplicate+tombstone, not edit a row in place). Build it
  from `window.DacXlsx.updateJob(state.workbook, job, values)` — the
  data-layer function `duplicateQueueJob`/the run engine's `update(item,
  values)` already call underneath — plus the same guard/refresh cascade
  every other Setup mutation uses (`isQueueEditable(item)`,
  `queueMutationLocked()`, then `refreshQueueAfterMutation(...)`). Do not
  invent a different validation path for this one method.
- **`jobs.remove`** — params: `{ job_id }`. Tombstones via the existing
  `queue_removed` mechanism (same as the "Bỏ khỏi Queue" button) — never a
  hard delete, never touches a non-`PRE_SUBMIT` row.
- **`jobs.reorder`** — params: `{ job_id, position }` or `{ order: [job_id, ...] }`
  (pick whichever maps more directly onto the existing `queue_position`
  reorder logic already backing `↑ Lên`/`↓ Xuống`/drag-drop — reuse it, don't
  reimplement the adjacency/pre-submit-only rule).
- **`output.configure`** — params: subset of `{ image_pattern, result_filename_pattern,
  audit_filename, collision_policy, save_images, save_result_xlsx, save_audit_jsonl }`.
  Calls the same path `setArtifactNaming()` calls, minus the DOM reads (take
  values from `params`, not `els.*.value`). Must fail closed if no output
  profile/location is bound yet — do not silently default to Downloads mode.
- **`run_settings.configure`** — params: subset of `{ timeout_sec, max_retries,
  delay_min_sec, delay_max_sec, safety_cooldown_sec, max_input_images,
  continue_on_error, rerun_done }`. Same validation the SETUP inputs already
  apply (reuse, don't reimplement).

### Shared handler shape

Every one of the six:

1. Computes the lock reason using the **same** checks `bridgeApprovalLockReason()`
   already uses for `queue.propose` (not running, no reconciliation/recreate/
   audit-gap in progress, workbook present where required, persistence
   enabled where required). If locked, fail with the existing lock-reason
   text, same as today's proposal card shows.
2. Applies the mutation by calling the **real** Setup function — the one the
   UI itself calls on a button click/input change. Do not duplicate the
   validation or persistence logic inline in the handler.
3. Appends one audit event describing the change (new event names, e.g.
   `BRIDGE_JOB_ADDED_DIRECT`, `BRIDGE_JOB_UPDATED`, `BRIDGE_JOB_REMOVED`,
   `BRIDGE_JOB_REORDERED`, `BRIDGE_OUTPUT_CONFIGURED`, `BRIDGE_RUN_SETTINGS_CONFIGURED`
   — keep them distinguishable from the existing `BRIDGE_PROPOSAL_*`/
   `BRIDGE_JOB_ADDED` events used by the propose/approve path, and from plain
   operator-driven events, so the audit trail can tell "Đức edited this" from
   "the Bridge edited this" apart later).
4. Persists using the existing `DacApprovalPersistence.execute()` shape
   (`snapshot`/`apply`/`persist_audit`/`persist_checkpoint`/`commit`/`rollback`)
   — the exact pattern `approveBridgeProposal()` already uses in
   `sidepanel.js`, just without an `owner_click` wait in the middle. A failed
   persist must roll back cleanly, same guarantee the existing path gives.
   Checkpoint on every successful mutation (one new Result XLSX version per
   call) — this matches the project's existing "every write is a new
   immutable version" philosophy. Flag in your own PR notes if you think the
   version churn from many small AI edits will be a real usability problem;
   don't silently switch to batching without saying so.

### Errors

Reuse `BridgeProtocolError` and existing error codes where they fit
(`EXECUTOR_UNAVAILABLE`, `WORKBOOK_NOT_LOADED`, `VALIDATION_FAILED`,
`PERSISTENCE_VERIFICATION_FAILED`, `PROPOSAL_CONFLICT`-style ledger-etag
races if relevant). Only add a new code if nothing existing fits, and say so
explicitly rather than silently repurposing an existing code's meaning.

---

## 3. New "BRIDGE" tab in the side panel

`sidepanel.html` currently has exactly 3 tabs (`workflow-tabs` nav):

```html
<button class="workflow-tab active" data-screen="setupScreen" ...>1 SETUP</button>
<button class="workflow-tab" data-screen="runScreen" ...>2 RUN</button>
<button class="workflow-tab" data-screen="outputScreen" ...>3 OUTPUT</button>
```

Add a 4th, same pattern, same wiring (`sidepanel.js` already looks elements
up by id and toggles `.active`/`hidden` by `data-screen` — follow that, don't
invent a new tab mechanism):

```html
<button class="workflow-tab" data-screen="bridgeScreen" ...>4 BRIDGE</button>
```

Contents of the `bridgeScreen` section, this pass only:

1. **Connection/pairing status** — host reachable, extension paired, last
   activity timestamp. Source this from `bridgeSystemPing()`'s existing data,
   don't build a second status-fetch path.
2. **Live activity feed** — a plain read-only list of the new
   `BRIDGE_*_DIRECT`/`BRIDGE_JOB_UPDATED`/etc. audit events from §2.3, newest
   first. This is passive visibility, not a gate — nothing here blocks or
   requires a click.
3. **Move the existing "ĐỀ XUẤT TỪ AGENT" approval card into this tab**
   (currently it renders somewhere in the existing screens — relocate it
   here so all Bridge-related UI has one home). Its behavior is unchanged,
   only its location moves.

**Explicitly not in this pass:** any "review what changed before Run is
enabled" screen. Đức asked for that to come later, after Tier 1 ships and a
broader pass. Do not build it now even if it seems like a natural extension
of the activity feed — the activity feed is passive, that one would be a
gate, and adding a gate now would contradict the whole point of Tier 1.

---

## 4. Tests

One smoke test per new method, following the existing
`tests/bridge-*-smoke.mjs` naming/shape (e.g. `bridge-jobs-add-smoke.mjs`,
`bridge-jobs-update-smoke.mjs`, `bridge-jobs-remove-smoke.mjs`,
`bridge-jobs-reorder-smoke.mjs`, `bridge-output-configure-smoke.mjs`,
`bridge-run-settings-configure-smoke.mjs`). Each should assert:

- `approval: "none"` in the method's registry entry.
- The lock-reason check actually blocks when running/reconciling/etc.
  (reuse whatever fixture the existing `queue.propose` lock tests use).
- A successful call produces exactly one new audit event of the right type
  and one new checkpoint version.
- The method is unreachable/rejected while `state.workbook` is absent, where
  that applies (`jobs.update`/`remove`/`reorder`/`output.configure`/
  `run_settings.configure` all require an existing session; `jobs.add` is the
  one exception since it can create one).

Add a static test for the new BRIDGE tab (`bridge-tab-static.mjs` or similar)
asserting the 4th tab exists, wires to `bridgeScreen`, and that the proposal
card's markup now lives under it — same spirit as the existing
`bridge-sidepanel-static.mjs`/`setup-simplification-static.mjs`.

Full suite must stay green: `npm test` (currently 63/63 in `workers/duc-auto-chatgpt/v0.1.0`).

---

## 5. What NOT to do

- Do not touch `pilot-03/`, `pilot-05/`, `pilot-06/` (protected evidence).
- Do not remove `queue.propose`/`queue.proposal.get`/the approval UI.
- Do not add `run.start`/`run.pause`/`run.resume`, or any method that could
  be chained to reach the same effect.
- Do not attempt a file/folder picker workaround for Constraint 1 in §1 —
  fail closed instead, with a clear error.
- Do not build the deferred pre-Run review/diff screen.
- Do not commit — leave the tree ready for Claude to audit and for Đức to
  review before anything is committed/pushed.

---

## 6. Report back

When done: `RESULT: PASS | CONDITIONAL PASS | FAIL`, test count, list of
files changed, and a short note on the checkpoint-per-mutation choice from
§2 if you think it needs reconsidering. Independent live acceptance (Đức
exercising each method through the real paired extension) happens after
Claude's own audit pass, not before.

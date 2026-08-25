# Giai đoạn 2A — agent-grade Bridge essentials: handoff to Codex

Written 2026-08-25 by Claude (coordinator). Phase 2 of the approved roadmap
(`AUDIT-SYSTEM-EFFECTIVENESS-2026-08-24.md` §4). Read `../AGENTS.md` and
`../decisions.md` first — especially the 2026-08-25 dev trial-run exception,
which item 1 implements.

Baseline: `origin/main` @ `3e77ecc`, suite **73/73 + observer PASS**. Keep it
green; one test per item; no commit (Claude audits then commits); do not touch
`pilot-03/05/06/06B`.

---

## 1. `run.trial` — the owner-approved capped dev trial channel (TOP PRIORITY)

Implements the decision recorded in `../decisions.md` (2026-08-25) and the
shared memory `dev-trial-run-exception`. This is the ONLY sanctioned way any
run starts without a human click, and every cap below must be enforced in
CODE, fail-closed:

- **Panel dev-mode toggle**: a visible control + unmissable badge (e.g. in the
  BRIDGE tab header) named "Chế độ phát triển". State persisted in
  `chrome.storage.local`. OFF (default) ⇒ `run.trial` fails with a clear,
  non-retryable error. Only Đức flips it (panel UI only — no bridge method may
  change it).
- **Method** `run.trial` (registry: executor, approval "none", read_only
  false, deadline 30000, idempotent true). Params: `{ job_ids: string[1..2] }`
  — explicit selection, max 2. The handler:
  1. refuses when dev toggle OFF, when a run/mutation is active (reuse
     `createQueueRunLock`), or when any selected job is not eligible via the
     same `selectQueue(queue, "selected", ids)` gate the UI uses;
  2. enforces **min 5 minutes since the previous trial** (persist the last
     trial timestamp in `chrome.storage.local`; refuse early with the
     remaining wait in the error message — non-retryable code so agents don't
     spin);
  3. clamps effective `timeout_sec` to ≤90 for the trial regardless of config;
  4. runs the existing `run("selected")` machinery — do NOT fork a parallel
     runner; the trial IS a normal run with caps, so exact-once, attribution,
     readiness, hard-stops, checkpoints all apply unchanged;
  5. audits start/end with a distinct origin (`input_origin: "bridge_dev"` or
     equivalent field the audit row already carries) so the trail can tell a
     trial from an owner click;
  6. returns immediately AFTER the run completes or halts (the 30s deadline is
     too short for a real trial — see the note below) — **design decision
     needed**: either (a) return `{accepted: true, trial_id}` immediately and
     let the agent poll `run.status`, or (b) a longer deadline. Choose (a):
     accept-and-poll matches the existing async model and keeps deadlines
     honest. Return the reservation info; the agent watches `run.status`.
- `prohibited_methods` stays `["run.start","run.pause","run.resume"]` — and
  add a registry-level guard test proving `run.trial` cannot run >2 jobs, and
  that the dispatcher refuses it when the toggle flag in state is false.

## 2. Split non-transient lock errors out of RUN_ACTIVE

`bridgeApprovalLockReason` reasons that need a HUMAN (persistence toggles off)
are today thrown as `RUN_ACTIVE` (retryable) — an agent honoring `retryable`
spins forever. Keep `RUN_ACTIVE` for genuinely transient states (running,
reconciliation, recreate, audit-gap, queue mutation); throw the
persistence-missing case as `VALIDATION_FAILED` (non-retryable) with the same
Vietnamese reason text. Update the attention-hub mapper if the code changes
(`bridgeAttentionFromError` currently matches RUN_ACTIVE + /bật lưu audit/).

## 3. Optimistic concurrency on Tier-1 writes

Accept optional `if_ledger_etag` on `jobs.update`, `jobs.remove`,
`jobs.reorder`, `output.configure`, `run_settings.configure` (schema +
validator, mirroring `queue.propose`). When supplied and stale ⇒
`PROPOSAL_CONFLICT` (existing retryable code; the agent re-reads and retries).
Omitted ⇒ current behavior. `jobs.add` may accept it too (cheap, consistent).

## 4. Batch mutation forms — one checkpoint per call

- `jobs.reorder`: accept `{ order: [job_id, ...] }` (full active-queue
  permutation of PRE_SUBMIT-movable rows) as the brief for Tier 1 originally
  specified; keep `{job_id, position}` working.
- `jobs.update`: accept `{ jobs: [{job_id, ...fields}, 1..20] }`.
- `jobs.remove`: accept `{ job_ids: [1..20] }`.
Each batch call = ONE `executeBridgeDirectMutation` (one audit event listing
all ids via `bridge_job_ids`, one checkpoint). Single-item forms unchanged.

## 5. `queue.proposal.withdraw` — agents clean up their own stale proposals

Params `{ proposal_id }`. Only withdraws a proposal in a PENDING status AND
whose `client.client_id` matches the caller's envelope client_id (an agent may
only retract its own). Transitions to a terminal `WITHDRAWN` status (add to
the status labels + render), audited. Owner approval/rejection paths
unchanged. This closes the "tennis-ball debris" annoyance from live testing.

## 6. `profiles.remove` — retire stale folder profiles

Params `{ profile_id }`. Deletes ONE record from the IndexedDB profile store
(`DacOutputProfiles`, add a `remove(id)` using one readwrite txn). Refuse
(VALIDATION_FAILED) if that profile is the session's currently bound
image/result profile. This deletes only extension-local metadata — never any
file on disk; say so in the method description. Attention-hub probe must cope
(it already re-lists on every probe).

## 7. CLI catch-up (installed copy is deployed by the installer — update the
repo source `duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs`)

- Subcommands for every executor method that lacks one: the six Tier-1
  mutations, `output.set_folder_hint`, `run.trial`, `proposal.withdraw`,
  `profiles.remove` (generic pattern: `--params-file <json>` like `propose`
  already does — do not hand-roll per-field flags).
- `--request-id` and `--client-id` flags threaded into `buildEnvelope`.
- `AbortSignal.timeout(40000)` on the fetch.
- Exit codes: 0 ok; 3 when `error.retryable === true`; 2 otherwise — so a
  script can retry on 3 with the SAME `--request-id`.
- Update `README.md` §Agent Bridge CLI accordingly (it currently omits
  `run-status` and everything after).

---

## What NOT to do

- No `run.start`/`run.pause`/`run.resume`; no way for `run.trial` to exceed
  its caps; no bridge method may flip the dev toggle.
- No event stream / long-poll / sidecar JSON / host service work — that is
  Giai đoạn 2B, deliberately out of scope here.
- Do not weaken any protection; do not re-litigate decided policy.
- Leave the tree uncommitted; report per item + final
  `RESULT: PASS|CONDITIONAL PASS|FAIL, files changed, test count`.

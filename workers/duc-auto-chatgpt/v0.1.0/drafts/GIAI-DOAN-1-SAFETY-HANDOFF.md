# Giai đoạn 1 — safety-foundation fixes: handoff to Codex

Written 2026-08-25 by Claude (coordinator). Đức approved the 5-decision roadmap
in `AUDIT-SYSTEM-EFFECTIVENESS-2026-08-24.md` (same folder); this brief is
Phase 1: the nhóm-A correctness fixes. Read `../AGENTS.md` (golden rules) and
the audit report §3 nhóm A before coding. This brief is self-contained; the
audit report carries the full evidence trail per finding.

**Prime directive: these are fixes to make the EXISTING design true, not new
features.** Do not weaken exact-once, attribution, readiness gating, retry
semantics, persistence verification, checkpoint protocol, or hard-stops.
One test (new or extended) per fix. Do not touch `pilot-03/05/06/06B`. Do not
commit — Claude audits, then commits under the owner's autonomy policy
(`../decisions.md` 2026-08-24).

Baseline: `origin/main` @ `11f3698`, suite **72/72 PASS** (`npm test` at repo
root). Keep it green.

---

## Fix 1 (A1) — Mid-run crash must not lose the run, and must never enable re-submission

**Now:** `audit()` only pushes to in-memory `state.auditEvents`; `saveAuditLog`
and `saveLedger` run only in `run()`'s `finally` (`sidepanel.js` ~4254-4256 in
the audited revision). Closing the panel mid-run loses every job's ledger row
and the whole audit trail; jobs whose `submitted_at` never persisted classify
`SAFE_PENDING` on resume and get **re-submitted** — defeating exact-once.

**Live proof captured 2026-08-25:** the Pilot-09 audit JSONL contains the
`BRIDGE_RUN_SETTINGS_CONFIGURED` event of a mutation whose checkpoint rolled
back — audit persistence is already not transactional with the checkpoint.

**Required:**
1. Persist `submitted_at` (audit + ledger row) **before** the prompt is sent,
   so an unflushed submitted job can never classify `SAFE_PENDING` — worst
   case it classifies `AMBIGUOUS_SUBMITTED` (blocked, human review), which is
   the safe failure.
2. Flush audit + checkpoint at a configurable interval inside the run loop
   (new optional config key, e.g. `checkpoint_interval_jobs`, default every
   job completion; document in `DAC_XLSX_RUN_PLAN_V1.md`). CRITICAL trap
   already documented in HANDOFF (2026-08-23 entry on pause): `saveLedger()`
   re-parses the workbook, and the in-flight `runQueue` holds `item.job._row`
   references into the OLD DOM. After every mid-run checkpoint you MUST
   re-derive the remaining queue (or re-bind `_row` references) before the
   next `update()` — silently writing into an orphaned document is the
   failure mode that made the previous coordinator defer this feature. Prove
   the re-bind with a test.
3. The audit buffer must clear only what was verifiably flushed (the existing
   post-verified-write clearing rule).

**Acceptance:** a test that simulates: run 2 jobs, flush after job 1, kill the
loop (throw), re-open ledger from the flushed checkpoint → job 1 shows its
terminal state, job 2 (submitted, unresolved) classifies AMBIGUOUS_SUBMITTED,
and no path re-submits it automatically.

## Fix 2 (A2) — Tier-1 mutations must be idempotent

`bridge-core.js` METHOD_REGISTRY: set `idempotent: true` on `jobs.add`,
`jobs.update`, `jobs.remove`, `jobs.reorder`, `output.configure`,
`output.set_folder_hint`, `run_settings.configure`. The replay machinery
already exists (`createDispatcher` payload-hash dedupe + `REQUEST_ID_REUSED`;
panel `createBridgeReplayStore` in `sidepanel.js`) — raise the store's record
cap (currently 50) to a level that survives an agent editing session (≥500).
`REQUEST_TIMEOUT`/`TRANSPORT_DISCONNECTED` already instruct "retry the
identical idempotency key"; after this fix that instruction stops being a
duplicate-job generator.

**Acceptance:** extend the registry smoke: same `client_id`+`request_id`+
payload replayed → identical cached response, no second mutation; same id with
different payload → `REQUEST_ID_REUSED`.

## Fix 3 (A3) — Scope the CAPTCHA detector away from the operator's own prompt

`content.js` `securityBlockerText()` matches its phrase list against
`document.body.innerText`, which includes the just-submitted user message.
A prompt like "draw a robot solving a captcha" hard-stops the whole batch as
`SECURITY_HARD_STOP`. The quota detector (`matchesGenerationLimit`) was
already scoped to a single assistant message for exactly this false-positive
class — its comment says so. Apply the same discipline: exclude
`[data-message-author-role="user"]` subtrees (minimum), or scope to
interstitial/dialog containers plus assistant messages.

**Acceptance:** extend `generation-limit-smoke`-style tests: a user-message
string containing "captcha" must NOT trigger; a page-level interstitial string
still must.

## Fix 4 (A4) — Classify RECEIVER_LOST before the generic HARD_STOP branch

`runner-core.js` `classifyFailure()`: the `/HARD_STOP|captcha|.../` branch
matches before the `/receiver|composer|chatgpt tab/` branch, so every lost-tab
error (thrown as `"HARD_STOP: ChatGPT receiver unavailable..."` in
`sidepanel.js`) reports as `SECURITY_HARD_STOP` — the operator is told to
solve a CAPTCHA when the fix is "reload the tab". Prefer structured prefixes:
change the throw site to a `RECEIVER_LOST:` prefix and match prefixes before
generic patterns. Halt behavior stays identical (both are hard stops); only
the diagnosis changes.

**Acceptance:** unit test: the exact receiver-unavailable message classifies
`RECEIVER_LOST`; a real captcha message still classifies `SECURITY_HARD_STOP`.

## Fix 5 (A5) — Image attribution must not accept arbitrary page images

`content.js` `imageCandidates()` runs over `document` and keeps
`role: "unknown"` images; `image-evidence-core.js` `selectAttributableImage`
lets a single such image win via `new_visible_fallback` — a sidebar thumbnail
can be saved as the job's verified output. Root candidates at the
conversation/message-list container, and exclude `role === "unknown"` from
fallback eligibility. Ambiguity must keep failing closed (that part works).

**Acceptance:** extend the image-evidence test: a fresh unknown-role image
outside the conversation subtree is not selectable; a fresh assistant-message
image still is.

## Fix 6 (A6) — Take the mutation lock before any await; run() must respect it

- `approveBridgeProposal` (`sidepanel.js`): the lock check and
  `state.queueMutationRunning = true` are separated by several awaits — a
  bridge mutation admitted in that window replaces `state.workbook` under the
  approval's feet. Set the flag immediately after the lock check (before the
  first await) and release in `finally`.
- `run()` never checks `queueMutationRunning`; `state.running` is only set
  after `authoritativeValidate()`'s awaits. Add a lock check + `RUN_ACTIVE`-
  style refusal at run entry, and set a "run starting" latch before the first
  await so a concurrent bridge mutation in the validate window is refused.

**Acceptance:** a vm test that interleaves: start approval (hold at an awaited
stub), inject a direct mutation → mutation must be refused with the lock
reason, not applied.

## Fix 7 (A7) — Mutual authentication on the WS handshake

`bridge-transport-loopback.js` marks the session authenticated on ANY
`auth_ok` carrying a string `session_id`; the extension has already sent the
token by then. A same-user process that binds the paired port first (host
crash window / logon race) exfiltrates the token and gets the full Tier-1
surface. Fix: extension sends a random nonce first; host must reply with
proof of token possession (HMAC-SHA256 over the nonce using the token, via
WebCrypto) BEFORE the extension sends the token; reject otherwise. Update
`bridge-host.mjs` correspondingly. Keep the frame allowlists tight. Bump
nothing in the protocol version — this is transport-layer, both ends ship
together.

**Acceptance:** extend `bridge-mv3-reconnect-smoke`/loopback integration: a
host replying `auth_ok` without valid proof never receives the token and the
socket closes; the real host handshake still completes.

## Fix 8 (A8) — A failed checkpoint write must not wedge the version counter

`persistLedgerCandidate`: on a verify failure the partial file stays while
`state.checkpointVersion` doesn't advance → every retry hits
`CHECKPOINT_VERSION_CONFLICT` forever, while operator guidance says never to
delete checkpoints. On verify failure: rename the partial to a non-checkpoint
name (`<name>.partial-vNN`, probe-for-free-name, never overwrite), record an
audit event naming the abandoned file, and let the retry take the next
version. `parse()` must never recognize the partial name as a checkpoint
(assert by parsing it back → null, same trick the collision-rename test uses).

**Acceptance:** simulate verify-failure → partial renamed, audit event
present, subsequent write succeeds at vNN (same number), resume scan
unaffected by the partial file.

---

## Order & reporting

Suggested order: 2, 4, 8, 3, 5 (small, independent) → 6 → 7 → 1 (largest,
riskiest — do last with the most attention). After each fix: full `npm test`
green before moving on. Report per fix: what changed, test name, and any
place you deliberately diverged from this brief and why. RESULT line at the
end: PASS | CONDITIONAL PASS | FAIL, files changed, final test count.
Leave everything uncommitted.

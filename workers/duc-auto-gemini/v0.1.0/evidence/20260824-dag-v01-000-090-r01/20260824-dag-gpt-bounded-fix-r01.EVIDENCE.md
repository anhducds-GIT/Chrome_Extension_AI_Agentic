# GPT Web Bounded Fix Evidence — GPT-DAG-001/002

- Audit base: `90d837f1fca2b2e048615a213ec8a362fb3cd70e`
- GPT verdict: `REVISE — BOUNDED FIX REQUIRED`
- Scope: `workers/duc-auto-gemini/v0.1.0/**` only
- Live Gemini actions: none
- Boundary retained: `LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING`

## GPT-DAG-001 — abort race immediately before Send

- Production fix: `content.js` now delegates the actual Send click to `DagContentDecisionCore.clickSend()`.
- The snapshot passed to that guard contains both current page blockers and `state.abortRequested`.
- This snapshot is taken after durable `SUBMITTED` persistence and immediately before the synchronous click action.
- Behavioral regression: the test marks SUBMITTED persisted, injects Stop, invokes the Send guard, expects `ABORTED_BY_OPERATOR`, and proves click count remains zero. It also proves the no-abort path clicks exactly once.

## GPT-DAG-002 — extension-wide single submit-critical attempt

- Production fix: background imports `lease-core.js` and owns one `globalSubmitLease` controller backed by `chrome.storage.session`.
- `routeRun()` marks acquisition pending before its first await, persists the lease before target selection and releases it identity-safely after the routed attempt settles.
- A simultaneous second `DAG_ROUTE_RUN` receives `GLOBAL_ACTIVE_ATTEMPT_EXISTS` and cannot select a second Gemini tab or enter content submit work.
- A new controller/runtime instance reconstructs the same conflict from storage after an MV3 service-worker restart. A matching terminal/output-detected stage can release the old runtime's lease; a different identity cannot.
- The new failure is a batch hard stop, not a retry/resend path.
- Behavioral regression: one routed attempt is held open while a different run/job/attempt competes in both the same controller and a recreated post-restart controller; the second task never enters, release is identity-safe, and a later attempt can then acquire normally.

## Verification target

- Full verification completed at `2026-08-24T09:47:43.1034817+07:00`.
- Gemini: 18 passed, 0 failed.
- Repository: 63 passed, 0 failed; observer PASS.
- Syntax, JSON parse, diff-check and secret-candidate scans: PASS.
- Independent local revision audit: `PASS` for GPT-DAG-001 and GPT-DAG-002-R1, including durable service-worker restart semantics.
- Exact-path staging must contain Gemini files only.
- Immutable implementation SHA: `bc28e792a7650d3a375e8e924589fb4f8f442220`.
- Push range: `90d837f1fca2b2e048615a213ec8a362fb3cd70e..bc28e792a7650d3a375e8e924589fb4f8f442220` on `main`.
- Independent `git ls-remote origin refs/heads/main` readback after implementation push: `bc28e792a7650d3a375e8e924589fb4f8f442220`.

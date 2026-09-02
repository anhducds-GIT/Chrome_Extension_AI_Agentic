---
kind: study
status: active
ttl_days: 180
---

# EXP-05 — Restart Recovery + Durable Local Checkpoint Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. No production implementation. Provider policy/regulation remains a separate axis.

## 1. Research question

Can the platform recover a long-running workflow after any of these events without losing authoritative job state or blindly replaying side effects?

```text
extension service worker termination
extension reload/update
Chrome restart
browser/tab crash
chrome.debugger detach
Native Messaging disconnect / native host exit
local orchestrator restart
```

Target model:

```text
Durable local story/checkpoint
        ↓
Chrome/Extension actuator disappears
        ↓
restart/reconnect/re-enumerate
        ↓
reconcile browser reality with checkpoint
        ↓
resume from safe state
```

The target is multi-hour / multi-day continuity, not merely keeping an MV3 service worker alive.

---

## 2. Core finding

**Yes, but only if recovery is designed as reconstruction + reconciliation, not process continuation.**

Chrome provides enough lifecycle and enumeration primitives to rebuild browser-side state, but identifiers such as `tabId`, debugger `sessionId`, targets, execution contexts, and in-memory extension state must be treated as **ephemeral runtime handles**.

A durable workflow therefore needs two distinct identity layers:

```text
DURABLE LOGICAL IDENTITY
job_id / step_id / action_id / artifact_id / app_binding

EPHEMERAL BROWSER IDENTITY
tabId / targetId / debugger sessionId / frameId / executionContextId
```

After restart, the second layer is re-discovered and rebound to the first.

**Technical reach:** LIKELY / strong documented basis. Crash-window semantics require controlled micro-proof before marking PROVEN.

---

## 3. Primitive P1 — MV3 service worker is reconstructable, not durable memory

Chrome normally terminates extension service workers after inactivity or other lifecycle limits. Chrome explicitly instructs extensions to persist state rather than rely on global variables because globals are lost when the service worker shuts down.

Relevant lifecycle signals:

- `chrome.runtime.onStartup` fires when a user profile containing the extension starts;
- extension events/API calls can wake a dormant service worker;
- Chrome 118+ active `chrome.debugger` sessions keep the service worker alive;
- Chrome 105+ `runtime.connectNative()` keeps the service worker alive while the native host connection remains active.

This improves runtime continuity, but **keep-alive is not durable recovery**.

Recommended interpretation:

```text
service worker = reconstructable browser control process
not = authoritative workflow database
```

Sources:
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/runtime

---

## 4. Primitive P2 — extension-local durable vs session state

`chrome.storage` provides different persistence classes.

### `storage.local`

- persists locally;
- survives browser restart;
- cleared when the extension is removed.

### `storage.session`

- memory-only while the extension/browser session remains loaded;
- cleared when the extension is disabled, reloaded, updated, or when the browser restarts.

Therefore:

```text
storage.session
→ cache / reconstructed browser-runtime state

storage.local
→ small durable extension metadata / recovery hints

persistent local orchestrator DB/filesystem
→ authoritative multi-day workflow state
```

The local orchestrator remains preferable as SSOT for large workflow history, queues, artifact references, retry journals, and multi-app coordination.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/storage

---

## 5. Primitive P3 — startup is a recovery trigger, not a continuation signal

`chrome.runtime.onStartup` fires when the Chrome profile starts.

That event can initiate a recovery handshake:

```text
Chrome starts
→ extension service worker receives onStartup
→ reconnect Native Bridge / local orchestrator
→ request active jobs
→ enumerate current browser state
→ rebuild debugger registry
→ reconcile each recoverable job
```

Important limitation: `onStartup` does not mean the previous browser tabs, debugger sessions, or in-flight actions still exist.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/runtime

---

## 6. Primitive P4 — browser identifiers are session-scoped

Chrome documents `tabs.Tab.id` as unique **within a browser session**.

Therefore a persisted `tabId` is not a durable cross-restart identity.

Likewise, debugger child session IDs are identifiers for attached debugging sessions, and target/context registries are live runtime structures that must be rebuilt after restart/detach.

This leads to a hard rule:

> Never persist `tabId`, `sessionId`, `targetId`, `frameId`, or `executionContextId` as the sole identity of a durable workflow binding.

Instead persist a logical binding descriptor such as:

```text
app_binding = {
  app_id,
  expected_origin,
  expected_url_pattern,
  account/profile hint?,
  semantic page fingerprint?,
  durable provider object id if available?
}
```

Then resolve that descriptor back to current browser handles during recovery.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 7. Primitive P5 — tab recovery can use discovery and optional session restore

Two recovery paths exist.

### Path A — current tab discovery

After restart, enumerate current tabs/windows and identify an existing app tab by durable binding/semantics.

### Path B — reopen a recently closed session

`chrome.sessions` can query and restore recently closed tabs/windows.

However this should be treated as a convenience/fallback, not the authoritative workflow mechanism:

- recently-closed history is bounded;
- browser restore behavior is user/browser-state dependent;
- the workflow should be able to create/reopen the application URL if no reusable tab exists.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/sessions
- https://developer.chrome.com/docs/extensions/reference/api/tabs

---

## 8. Primitive P6 — debugger recovery is reattach + rebuild

After browser restart or debugger detach, prior debugger sessions must not be assumed valid.

Recovery flow:

```text
find/recreate app tab
→ chrome.debugger.getTargets()
→ attach root debugger session
→ enable required domains
→ re-enable Target.setAutoAttach(flatten=true)
→ recursively discover child targets
→ rebuild Target / Session / Frame / Context Registry
→ resume observations/actions
```

`Target.getTargets()` and debugger target enumeration allow reconstruction of available live targets, but old runtime IDs are not durable workflow state.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 9. Primitive P7 — Native Messaging connection is not itself a persistent orchestrator

Chrome documents that `runtime.connectNative()` starts a native messaging host process and keeps that process running until the messaging port is destroyed.

If the host exits or the pipe breaks, the port disconnects. Chrome's service-worker lifecycle documentation recommends reconnecting from `port.onDisconnect` when appropriate.

This creates an important architecture distinction:

```text
Native Messaging host process
= transport endpoint whose lifetime may be tied to Chrome/port

Persistent Local Orchestrator
= independent durable runtime / daemon / service / database
```

They may be the same executable in a simple implementation, but they should not be treated as the same **reliability abstraction**.

For strong browser-restart recovery, one of these models is safer:

### Model A — independent daemon

```text
persistent daemon/DB
↕
small Native Messaging adapter
↕
Extension
```

### Model B — restartable native host + durable disk state

```text
Chrome launches host
→ host reloads durable local DB/checkpoints
→ resumes orchestrator state
```

The key requirement is that authoritative state survives destruction of the Native Messaging port/process.

Sources:
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

---

## 10. Hard problem — the crash window creates ambiguous outcome

The most important failure mode is not loss of process state. It is **uncertain side-effect state**.

Example:

```text
checkpoint says: READY_TO_SEND
→ click Send
→ server accepts request
→ Chrome crashes before confirmation is persisted
```

After restart, the orchestrator cannot safely infer either:

```text
A. send failed → replay
B. send succeeded → do not replay
```

Blind replay can duplicate a side effect.

Therefore exactly-once browser automation cannot be guaranteed generically from browser control alone.

Reliable recovery needs one or more of:

- provider/backend idempotency key;
- durable object/result identifier returned by the application;
- observable postcondition allowing reconciliation;
- monotonic provider state;
- human gate for irreducibly ambiguous high-impact operations.

This is a technical distributed-systems limit, not merely an extension limitation.

---

## 11. Proposed Action Journal primitive

Every externally meaningful action should have a durable journal entry before dispatch.

Candidate state machine:

```text
PLANNED
  ↓ persist intent
PREPARED
  ↓ dispatch browser action
DISPATCHED
  ↓ correlated backend/UI proof
CONFIRMED
  ↓ durable checkpoint
COMMITTED
```

Unexpected restart can occur at any transition.

Recovery rule:

```text
PLANNED/PREPARED
→ may dispatch if preconditions still match

DISPATCHED without CONFIRMED
→ UNKNOWN_OUTCOME
→ reconcile first
→ never replay blindly

CONFIRMED
→ persist/advance checkpoint
```

Suggested durable fields:

```text
action_id
job_id
step_id
action_type
logical app binding
expected precondition
intended effect
artifact refs
started_at
last_observed_at
confirmation evidence
recovery policy
```

This journal belongs in the local orchestrator SSOT, not only extension memory.

---

## 12. Proposed Recovery Coordinator

A reusable recovery subsystem could run these phases:

### R1 — load durable jobs

Read active/incomplete workflows from local SSOT.

### R2 — classify last durable action

```text
SAFE_NOT_STARTED
IN_FLIGHT_UNKNOWN
CONFIRMED_NOT_COMMITTED
COMMITTED
```

### R3 — recover browser binding

```text
query tabs
→ semantic/origin match
→ restore/reopen/create if needed
```

### R4 — reconstruct Browser Runtime

```text
attach debugger
→ rebuild target/session/frame/context registry
→ re-enable Network/Runtime/Page/etc.
```

### R5 — reconcile provider reality

Use the EXP-03 correlation engine:

```text
network/backend evidence
+ DOM semantic state
+ durable artifact/result evidence
```

### R6 — choose resume action

```text
confirmed → commit checkpoint and continue
not executed → execute
ambiguous → bounded retry / stronger probe / human gate
```

---

## 13. Failure modes to model explicitly

### F1 — service worker terminated, browser remains alive

Expected recovery: wake on event → reload cache/state → reconnect/reuse browser handles where still valid.

### F2 — Native host process exits

Expected recovery: port `onDisconnect` → mark transport unavailable → reconnect/relaunch → reload durable local state.

### F3 — debugger detach while tab remains

Expected recovery: preserve local action state → reattach when safe → rebuild child sessions/contexts.

### F4 — tab closes but Chrome remains

Expected recovery: discover provider state via another tab, `chrome.sessions.restore()`, or recreate app URL.

### F5 — Chrome restarts

Expected recovery: all browser-session handles considered stale → `onStartup` handshake → enumerate/rebind/rebuild.

### F6 — browser crash during side effect

Expected recovery: `UNKNOWN_OUTCOME` → reconciliation required before replay.

### F7 — local orchestrator restarts while Chrome remains alive

Expected recovery: local runtime reloads journal → Bridge handshake asks extension for live runtime inventory → reconcile both sides.

### F8 — both browser and local runtime restart

Expected recovery: durable disk checkpoint is the only trusted starting point; reconstruct all live browser identities from scratch.

### F9 — authenticated session expired after restart

Expected recovery: browser actuator reaches login/auth gate but workflow cannot automatically assume prior authenticated state; mark `AUTH_REQUIRED`/human gate or provider-specific recovery.

### F10 — extension update/reload

`storage.session` is cleared and service-worker runtime rebuilt; durable state must remain outside that layer.

---

## 14. Compound capability unlocked

If EXP-05 proves reliable, the platform gains more than “long-running automation”.

### C1 — Multi-day browser jobs

```text
start today
→ checkpoint
→ Chrome closes
→ resume tomorrow
```

### C2 — Durable multi-app workflow

```text
App A
→ artifact
→ restart
→ App B
→ checkpoint
```

### C3 — Self-healing browser actuator

```text
detect missing tab/session/Bridge
→ reconstruct runtime
→ reconcile
→ continue
```

### C4 — Safe bounded retries

Action journal + EXP-03 state correlation allows retries based on evidence instead of arbitrary repeat-click behavior.

### C5 — Local-first orchestration

The browser becomes a replaceable actuator while the durable story remains outside Chrome.

This strongly supports the larger architecture hypothesis:

> Extension/CDP should be treated as a reconstructable browser execution plane attached to a persistent local orchestrator.

---

## 15. Controlled micro-proof design

Use only controlled test pages and a controlled local endpoint/database.

### Scenario 1 — service worker termination

1. create durable test job;
2. attach page state;
3. let/force worker terminate without closing Chrome;
4. trigger extension event;
5. verify job/browser state reconstructs.

### Scenario 2 — Native Messaging disconnect

1. connect host;
2. persist job;
3. kill host/close pipe;
4. record `onDisconnect`;
5. reconnect/relaunch;
6. verify no job state loss.

### Scenario 3 — debugger detach

1. build child target registry;
2. force detach;
3. preserve durable job state;
4. reattach;
5. compare reconstructed registry semantics.

### Scenario 4 — tab close/reopen

1. bind durable logical app descriptor to tab;
2. close tab;
3. recover using session restore or fresh navigation;
4. establish a new `tabId` binding.

### Scenario 5 — Chrome restart at clean checkpoint

1. checkpoint before action;
2. restart browser;
3. receive startup/recovery trigger;
4. reopen/reuse app;
5. rebuild debugger registry;
6. continue exactly once from checkpoint.

### Scenario 6 — Chrome restart after side effect but before confirmation

Controlled endpoint increments a durable server-side counter.

1. persist `PREPARED`;
2. dispatch action causing server state change;
3. terminate Chrome before local confirmation is stored;
4. restart;
5. classify `UNKNOWN_OUTCOME`;
6. inspect endpoint/DOM/network evidence;
7. confirm the runtime does **not** blindly dispatch a duplicate action.

### Scenario 7 — local runtime restart only

1. Chrome remains attached/alive;
2. kill/restart orchestrator;
3. reload durable journal;
4. handshake with extension;
5. reconstruct current job relation.

### Scenario 8 — simultaneous browser + local restart

1. persist checkpoint/action journal;
2. terminate both;
3. restart both;
4. rebuild from durable disk state only;
5. verify deterministic reconciliation.

### Scenario 9 — stale runtime identifier rejection

Persist old `tabId/sessionId/contextId` as test evidence only, restart browser, and demonstrate that recovery obtains new live handles instead of trusting old IDs.

### Scenario 10 — auth session unavailable

Recover app binding after restart with controlled auth expiration and verify workflow moves to explicit `AUTH_REQUIRED` rather than falsely marking task failure/success.

---

## 16. PASS criteria

EXP-05 passes only if controlled measurement shows:

1. authoritative job state survives service-worker destruction;
2. authoritative job state survives Native Messaging host/port destruction;
3. Chrome restart does not require persisted `tabId`, debugger session ID, frame ID, or execution-context ID;
4. Browser Runtime can rebuild target/session/frame/context registry from current browser reality;
5. durable logical app binding can be rebound to a restored or newly-created tab;
6. local runtime restart can reconcile with a still-running browser;
7. `UNKNOWN_OUTCOME` is detected when a crash occurs after dispatch but before confirmation;
8. ambiguous side effects are **not blindly replayed**;
9. recovery can distinguish `AUTH_REQUIRED` from ordinary execution failure;
10. resumed workflow advances only after new evidence satisfies the prior step's postcondition.

A weaker result where clean checkpoints recover but crash-window ambiguity cannot be resolved should be classified **PARTIAL**, not PASS.

---

## 17. What EXP-05 cannot prove universally

Even a successful micro-proof does not imply:

- browser tabs are always restored automatically;
- web-app authentication always survives restart;
- arbitrary provider side effects are exactly-once;
- every app exposes a queryable postcondition;
- a native messaging process is a durable daemon;
- provider-specific sessions can always be reconstructed without user interaction.

Those are adapter/application-level properties that need separate evidence.

---

## 18. Architecture hypothesis strengthened by EXP-05

The clean responsibility boundary is increasingly:

### Local Orchestrator — authoritative

- job/story graph;
- durable checkpoint;
- action journal;
- artifact registry;
- retry/recovery policy;
- scheduling;
- durable logical browser/app bindings.

### Extension / Browser Runtime — reconstructable

- current tabs/windows;
- debugger attachments;
- target/session/frame/context registry;
- DOM/network/input observation and action;
- current authenticated browser reality;
- short-lived runtime caches.

### Native Messaging — transport

- handshake;
- commands/events;
- references to durable local state/artifacts;
- reconnect/recovery signaling.

This division minimizes cost of browser crashes, extension reloads, DevTools conflicts, and future site-adapter changes.

---

## 19. Current conclusion

The technical ceiling supports a credible **durable browser-worker architecture**, but durability comes from **externalizing truth and rebuilding browser state**, not from making Chrome processes immortal.

The key invariant is:

```text
Browser state is disposable.
Workflow truth is durable.
After failure: reconstruct → reconcile → resume.
```

The deepest limitation discovered is the **ambiguous crash window** around side-effecting actions. Generic browser automation cannot guarantee exactly-once effects without application-level idempotency or a reliable postcondition.

This should become a first-class platform primitive rather than be hidden inside individual GPT/Gemini/Flow adapters.

---

## Sources

Official Chrome / CDP references:

- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/extensions/reference/api/storage
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/sessions
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developer.chrome.com/docs/extensions/reference/api/alarms
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

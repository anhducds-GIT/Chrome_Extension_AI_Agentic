# Phase 1 Synthesis — Browser Runtime Capability Map V0

**Status:** Phase 1 synthesis  
**Date:** 2026-08-28  
**Inputs:** `CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`, factual corrections, EXP-02 → EXP-15, repo evidence.  
**Scope:** Technical reach synthesis. Regulation/provider boundaries remain a separate axis. No production architecture is locked by this document.

---

## 1. Executive conclusion

Phase 1 has enough evidence to stop opening broad discovery studies and move to a targeted proof/build phase.

The strongest model is no longer “one Chrome extension that automates one website”. The technical surface discovered across EXP-01 → EXP-15 is better represented as a **Browser Runtime** with five cooperating capability planes:

```text
1. Observation Plane
   DOM + Accessibility + CSS + DOMSnapshot + webRequest + CDP Network

2. Actuation Plane
   content script + userScripts + DOM actions + CDP Input + Fetch interception

3. Browser Topology / Session Plane
   tabs + windows + webNavigation + debugger target/session/frame/context registry

4. Artifact / Evidence / Recovery Plane
   upload + downloads + Evidence Bundle + checkpoint/reconciliation

5. Local Runtime Plane
   loopback Bridge + filesystem + durable state + CLI/process/DB/scheduler as separately implemented
```

These planes support a higher-level compound capability:

```text
AI Orchestrator
→ inspect authenticated web app
→ understand current semantic/browser state
→ choose appropriate actuation path
→ correlate backend/UI evidence
→ move artifacts in/out
→ checkpoint durable state
→ recover after browser/runtime interruption
→ continue across tabs/apps/sessions
```

The repo proves useful pieces of this runtime, but the repo is still only the evidence layer. Much of the browser ceiling is currently **documented/reachable but not yet implemented or micro-proven in one unified runtime**.

---

## 2. Classification model

The synthesis uses five technical statuses.

### `PROVEN`
Measured in the existing repo or a controlled test with concrete evidence. This is stronger than merely being documented by Chrome.

### `LIKELY`
Strong current Chrome/CDP/Chromium evidence shows the capability is reachable, but our platform has not yet completed the controlled micro-proof needed to call it proven.

### `GATED`
Technically reachable only after an explicit permission, user-controlled toggle, browser version, host access, runtime state, or similar setup condition.

### `NEEDS PROOF`
A specific load-bearing runtime behavior remains uncertain enough that architecture should not rely on it until a controlled micro-proof is run.

### `CLOSED`
Current Chrome/Chromium source establishes that ordinary extensions cannot use the path as modeled. A different mechanism is required.

A capability can have one primary status plus qualifiers. Example:

```text
Local-path file upload
= GATED + NEEDS PROOF
```

because the CDP primitive exists, but local-file access is controlled by the extension file-access setting and still needs an end-to-end proof.

---

## 3. Capability Plane A — Observation

### A1. Live DOM observation and content-script semantics

**Status:** `PROVEN` at repo level for site-specific page observation; generic discovery layer still `LIKELY`.

Reach:

- read DOM;
- observe mutations;
- read visible text/attributes;
- infer page-specific states;
- communicate state to the extension;
- inject packaged page adapters.

Best role:

> Default, lowest-complexity semantic layer.

Do not treat selectors as durable identity. DOM churn, generated classes, hidden state, cross-origin frames and browser-level semantics remain failure modes.

---

### A2. Accessibility semantic tree

**Status:** `LIKELY`.

Reach:

- computed roles;
- accessible names/descriptions;
- widget state such as checked/selected/expanded/focus-related semantics;
- mapping toward DOM through backend node identity.

Best use:

```text
“Find the Generate button”
should not mean only
querySelector('.css-abc123')
```

It can become:

```text
role=button
+ accessibleName=Generate
+ live DOM validation
+ CSS/layout validation
```

Limit:

Accessibility is a derived semantic tree, not a complete representation of the page.

Source study: EXP-12.

---

### A3. DOMSnapshot + CSS structural state

**Status:** `LIKELY`.

Reach:

- point-in-time DOM structure;
- flattened shadow DOM representation;
- layout data;
- selected computed styles;
- matched/computed CSS state;
- backend node correlation.

Best role:

- discovery;
- drift comparison;
- evidence capture;
- explaining why a control exists but is hidden/disabled-looking/unpositioned.

Not a replacement for live MutationObserver/runtime events.

Source study: EXP-12.

---

### A4. `chrome.webRequest` lifecycle observation

**Status:** `LIKELY` / documented extension-level reach.

Reach without debugger:

- request lifecycle;
- requestId correlation;
- tab/frame/document attribution;
- initiator;
- method/URL/resource type;
- selected request-body information;
- completion/error/redirect signals;
- WebSocket handshake.

This is a major finding because **meaningful network-assisted state detection does not automatically require `debugger`**.

Best role:

> Normal-mode browser request telemetry.

Source study: EXP-11.

---

### A5. CDP Network deep telemetry

**Status:** `LIKELY`, `GATED` by `debugger` permission/attachment.

Adds:

- response bodies;
- richer timing/cache/service-worker metadata;
- WebSocket messages/frames;
- EventSource/SSE messages;
- deeper per-target/session visibility.

Best role:

> Escalation when DOM + webRequest cannot establish semantic state reliably.

Do not use “network idle” as a universal completion rule. Polling, SSE, WebSockets and streaming can make the application intentionally never idle.

Source studies: EXP-03, EXP-11.

---

### A6. Correlated state detection

**Status:** `LIKELY`.

This is the high-value compound primitive:

```text
ACTION_SPAN
+ browser context
+ request lifecycle
+ backend evidence
+ DOM/AX semantic evidence
+ failure evidence
→ CORRELATED_STATE
→ CHECKPOINT
```

No single event is authoritative across all apps.

This should become a central runtime abstraction rather than site-specific “wait for spinner to disappear” logic.

Source study: EXP-03.

---

## 4. Capability Plane B — Actuation

### B1. Ordinary page actuation

**Status:** `PROVEN` for current workers/site adapters.

Reach:

- set values;
- focus fields;
- click controls;
- dispatch ordinary DOM interaction logic;
- provider-specific page adapters.

Best role:

> Default actuation path when it works reliably.

It is cheap, debuggable and easier to constrain than browser-level input.

---

### B2. Runtime-delivered `chrome.userScripts` adapters

**Status:** `LIKELY` + `GATED`.

Reach:

- register raw runtime JavaScript;
- update/remove adapters;
- execute against tab/frame/document on supported Chrome versions;
- use `USER_SCRIPT` or `MAIN` world;
- isolate adapters using `worldId` on newer Chrome versions.

Important gates:

- `userScripts` permission;
- target host access;
- user must enable User Scripts for the extension;
- registrations are cleared when the extension itself updates and therefore need rehydration.

Architectural implication:

> A stable Seed/Browser Runtime can potentially receive or generate site adapters without republishing the base extension.

This is one of the strongest enabling primitives for the Seed Extension concept.

Source study: EXP-09.

---

### B3. CDP browser-routed Input

**Status:** `LIKELY` + `NEEDS PROOF` for exact trusted-event semantics.

Reach documented by Input domain:

- mouse;
- keyboard;
- text insertion;
- wheel;
- touch;
- drag/drop;
- coordinates-based browser interaction.

This is technically different from:

```text
element.click()
dispatchEvent()
value = ...
```

But the key remaining proof is:

```text
Input.dispatchMouseEvent / dispatchKeyEvent
→ event.isTrusted ?
→ navigator.userActivation ?
```

These two concepts must not be conflated. Even if browser-routed input creates trusted DOM events, that does not automatically prove it grants all browser “user gesture” capabilities.

Source study: EXP-14.

---

### B4. File upload through CDP

**Primary status:** `GATED + NEEDS PROOF`.

Three paths exist:

1. stable `<input type=file>` → `DOM.setFileInputFiles`;
2. native/dynamic chooser → `Page.setInterceptFileChooserDialog` + chooser event + file assignment when possible;
3. drag/drop surface → `Input.dispatchDragEvent` with file paths.

Critical correction:

`DOM.setFileInputFiles` using local paths is not unlocked by `debugger` permission alone. Chromium gates local file reading through the extension’s file-access setting.

Programmatic setup signal:

```text
chrome.extension.isAllowedFileSchemeAccess()
```

exists, but correlation with successful end-to-end upload still needs controlled proof.

Path C drag/drop is experimental and should not be the sole strategy.

Source: EXP-02 + factual corrections.

---

### B5. DNR network mutation

**Status:** `LIKELY` / documented reach.

Reach:

- block;
- redirect;
- allow;
- upgrade scheme;
- modify headers.

`declarativeNetRequestWithHostAccess` is especially relevant when site scope is already explicit.

Important lifecycle finding:

- dynamic DNR rules persist across browser restart and extension upgrades;
- session rules do not.

DNR is a mutation/policy plane, not a complete telemetry plane.

Source study: EXP-11.

---

### B6. CDP Fetch interception / response simulation

**Status:** `LIKELY`, `GATED` by debugger.

Reach:

- pause matching requests;
- continue/fail/modify;
- fulfill requests with synthetic responses;
- handle selected auth challenges;
- stream response bodies.

Strong compound capability:

> Offline adapter rehearsal using captured fixtures without spending provider quota or depending on live backend behavior.

Important caution:

Fetch interception perturbs request timing because matching traffic is paused. It should be an explicit interception mode, not the default observer.

Source studies: EXP-03, EXP-11.

---

## 5. Capability Plane C — Browser topology and authenticated session

### C1. Debugger attach / lifecycle

**Status:** `LIKELY`; pieces are source-proven, unified runtime micro-proof still needed.

Root model:

```text
chrome.debugger.attach({tabId})
```

Opening Chrome DevTools on the same tab detaches the extension debugger session and must be treated as a recoverable lifecycle transition.

Current important boundary:

ordinary extension debugger clients are untrusted and receive restricted Target access.

Source: living study EXP-01 + factual corrections.

---

### C2. Target / Session / Frame / ExecutionContext Registry

**Status:** `LIKELY`.

Correct abstraction:

```text
TAB / ROOT DEBUGGEE
→ TARGET(S)
→ DEBUGGER SESSION(S)
→ FRAME(S)
→ EXECUTION CONTEXT(S)
```

Not 1:1.

Key facts:

- same-process frames may share a target;
- OOPIFs may become separate targets;
- workers may be targets;
- Chrome 125+ supports flat debugger child sessions;
- auto-attach is not recursive;
- stale numeric executionContext IDs must not be durable identity.

Source study: EXP-04.

---

### C3. Generic CDP target discovery/control

**Status:** `CLOSED` for ordinary extension debugger sessions.

Current Chromium `kAutoAttachOnly` blocks generic paths including at least:

- `Target.getTargets`;
- `Target.setDiscoverTargets`;
- `Target.attachToTarget`;
- `Target.createTarget`;
- `Target.activateTarget`.

`Target.setAutoAttach` is the related-target traversal mechanism that survives.

Important asymmetry:

```text
chrome.debugger.getTargets()
!=
CDP Target.getTargets
```

Therefore browser topology must use Chrome extension APIs plus related-target auto-attach, not assume full DevTools Target authority.

Source: factual corrections + EXP-04/08.

---

### C4. Popup / new tab / redirect / SPA handoff

**Status:** `LIKELY`.

Topology plane:

- `tabs.onCreated`;
- `openerTabId`;
- `tabs.onUpdated`;
- `windows.onCreated`;
- `webNavigation` document lifecycle;
- `documentId`;
- server/client redirect qualifiers;
- SPA history/fragment events;
- tab replacement/prerender events.

Actuation for a newly created top-level tab should normally attach separately by `tabId` when debugger power is needed.

Architectural implication:

> A workflow owns a **Browsing Context Graph**, not one permanent tab.

Source study: EXP-08.

---

### C5. Authenticated session observation

**Status:** `LIKELY`, permission/host-access dependent.

Correct abstraction:

```text
SESSION STATE GRAPH
├─ profile/cookie store
├─ partition key
├─ target/frame/context
├─ storage key
├─ cookies
├─ local/session storage
├─ IndexedDB/cache state
├─ network auth evidence
└─ DOM/app semantic evidence
```

Derived semantic state:

```text
AUTH_HEALTHY
AUTH_EXPIRED
AUTH_PARTIAL
AUTH_UNKNOWN
REAUTH_REQUIRED
```

Do not model authenticated state as a portable cookie blob.

Source study: EXP-07.

---

### C6. Universal session cloning

**Status:** `CLOSED / NOT UNIVERSALLY REACHABLE` as a general platform claim.

Why:

- server-side revocation/rotation;
- partitioned state;
- device/browser-bound state;
- WebAuthn/passkeys;
- app-specific integrity logic;
- worker/runtime-only state.

The realistic capability is:

> reuse, observe and semantically verify the user’s existing authenticated browser session.

Not:

> clone any authenticated session to any machine/profile by copying cookies.

---

## 6. Capability Plane D — Artifact, evidence and recovery

### D1. Browser download → local artifact

**Status:** `LIKELY`, with strong existing repo relevance.

`chrome.downloads` exposes:

- lifecycle;
- resolved absolute local filename;
- persistent Chrome download ID;
- URL/finalUrl/referrer/MIME/size/state/error/danger metadata.

Recommended pattern:

```text
browser reports download complete
→ Bridge/local runtime verifies filesystem object
→ optional hash
→ durable artifact record
```

Do not trust Chrome’s cached `exists` field as the only filesystem truth.

Source study: EXP-06.

---

### D2. Artifact Bus

**Status:** `LIKELY`, but file-ingress side remains gated.

Concept:

```text
Artifact A local
→ browser upload
→ Web App A processing
→ browser download
→ local verification
→ Artifact B
→ Web App B or local processor
```

This is one of the highest-value compound capabilities discovered in Phase 1.

It converts authenticated web apps into stages of a larger orchestrated production pipeline without routing bulk artifact bytes through the Bridge control protocol.

Sources: EXP-02 + EXP-06.

---

### D3. Evidence Bundle

**Status:** `LIKELY`.

A screenshot alone is insufficient for later audit.

Recommended conceptual evidence package:

```text
EvidenceBundle {
  evidence_id,
  action_span_id,
  workflow/step identity,
  timestamp,
  browser context identity,
  URL/document identity,
  screenshot?,
  semantic/DOM/AX snapshot?,
  relevant network evidence?,
  optional MHTML/PDF representation?,
  artifact hashes,
  capture method/version,
  privacy/redaction metadata
}
```

Key distinction:

- screenshot = visual evidence;
- DOM/AX/network = semantic evidence;
- PDF/MHTML = supplementary representations;
- hash/provenance = integrity evidence.

Source study: EXP-13.

---

### D4. Restart recovery

**Status:** `LIKELY`.

Correct recovery model:

```text
restart
→ reconstruct runtime handles
→ reconcile current browser/app reality
→ determine safe state
→ resume
```

Not:

```text
restart
→ assume old process continues
```

Hard identity split:

```text
DURABLE
job_id / step_id / action_id / artifact_id / app_binding

EPHEMERAL
tabId / targetId / sessionId / frameId / executionContextId
```

Source study: EXP-05.

---

### D5. Exactly-once side effects

**Status:** `CLOSED` as a universal guarantee.

Crash window:

```text
action dispatched
→ server side effect occurs
→ confirmation not persisted
→ crash
```

The correct result is:

```text
UNKNOWN_OUTCOME
→ reconcile
```

not blind replay.

Exactly-once-like behavior requires provider idempotency or a reliably observable postcondition.

Source study: EXP-05.

---

## 7. Capability Plane E — Browser-side and local processing

### E1. Offscreen browser processing

**Status:** `LIKELY`.

`chrome.offscreen` can provide hidden DOM/document capabilities unavailable to a service worker, including reasons covering:

- DOM parsing;
- Blob handling;
- Workers;
- localStorage migration;
- media/clipboard/iframe-related use cases.

Correct abstraction:

```text
Service Worker = browser control
Offscreen      = ephemeral browser processing
Local Runtime  = durable machine processing
```

Offscreen is not an authoritative job database and not a replacement for local filesystem/CLI/process reach.

Source study: EXP-10.

---

### E2. Loopback WebSocket Bridge

**Status:** `PROVEN` as current repo implementation; **current LNA compatibility = NEEDS PROOF**.

Repo evidence confirms:

```text
MV3 extension service worker
↔ ws://127.0.0.1:<port>
↔ Node bridge host
```

It is **not Native Messaging** in the current worker implementation.

Existing implementation includes meaningful controls:

- fixed literal loopback host;
- pairing token;
- host proof / extension authentication handshake;
- extension-origin check;
- WebSocket frame limits;
- RPC envelope limit;
- reconnect alarm;
- keepalive;
- max inflight controls;
- fail-closed behavior when extension/host disconnects.

Sources: repo `bridge-transport-loopback.js`, `bridge-host.mjs`, EXP-15.

---

### E3. Local Network Access (LNA) compatibility

**Status:** `NEEDS PROOF` — highest-priority infrastructure proof.

The old PNA framing is stale. Current Chrome/Chromium Local Network Access checks include WebSockets and loopback/local address spaces.

Load-bearing unresolved question:

> For a `chrome-extension://` MV3 service worker connecting to `ws://127.0.0.1`, how is LNA permission resolved in the actual target Chrome version/profile, and does the current manifest/extension context receive usable permission without an unavailable prompt path?

Phase 1 does **not** conclude that the Bridge is broken.

It concludes:

> The transport already works in repo history, but future/current Chrome LNA behavior must be measured explicitly before calling loopback WebSocket future-safe.

Source study: EXP-15.

---

### E4. Theoretical local-machine primitives

**Status:** `LIKELY at architectural ceiling / NOT YET IMPLEMENTED in current Bridge host`.

A persistent local runtime can theoretically own:

- filesystem;
- process/CLI execution;
- local DB;
- scheduler;
- watchers;
- Git/repo interaction;
- local applications/agents.

But the current Bridge host must not be described as already having all of those powers. Repo evidence remains narrower.

This distinction is essential:

```text
platform ceiling != current host implementation
```

---

## 8. Hard Chrome boundaries discovered in Phase 1

The following should be treated as real architectural constraints rather than missing implementation work.

### H1. Full CDP is not available to `chrome.debugger`

Allowed domains exist, but method-level trust/access gates still restrict operations.

### H2. Ordinary extension debugger clients are untrusted

Current Chromium trust path does not grant general browser-target authority to ordinary extensions.

### H3. Browser target / generic Target authority is closed

No architecture should depend on ordinary extension access to full browser-wide CDP target creation/discovery/control.

### H4. Local file read and write are separate gates

Local-path reading through protocol is conditional; protocol local-file writing is separately blocked for the extension client.

### H5. `debugger` is a high-cost permission

It cannot simply be requested opportunistically as a normal optional permission. Its UX/security cost should be considered when the final architecture is chosen.

### H6. Browser-owned user-consent surfaces remain separate

Technical page/browser actuation does not imply silent control over all browser-native consent/security prompts. User activation, permission prompts, danger gates, CAPTCHA/MFA and similar surfaces must remain explicit boundaries.

---

## 9. Best compound capabilities discovered

### C1. Reliable semantic workflow step

```text
observe page semantics
→ perform action
→ correlate network/backend/UI
→ capture evidence
→ checkpoint
```

**Status:** `LIKELY`.

---

### C2. Artifact Bus

```text
local artifact
→ authenticated web app
→ generated/exported result
→ local verified artifact
→ next app/process
```

**Status:** `LIKELY`, upload side `GATED + NEEDS PROOF`.

---

### C3. Dynamic site-adapter runtime

```text
site discovery
→ adapter spec/code
→ userScripts registration/execution
→ structured observation/action
→ version/rollback
```

**Status:** `LIKELY + GATED`.

This is foundational for the Seed/Discovery concept.

---

### C4. Cross-tab authenticated workflow

```text
action in A
→ popup/new tab/redirect
→ Browsing Context Graph update
→ session verification
→ continue in B
→ return/checkpoint
```

**Status:** `LIKELY`.

---

### C5. Restart-safe long-running browser job

```text
durable local story
→ runtime interruption
→ re-enumerate/rebind browser
→ reconcile uncertain side effects
→ resume safely
```

**Status:** `LIKELY`.

---

### C6. Auditable Browser Runtime

```text
ActionSpan
→ semantic evidence
→ network evidence
→ visual evidence
→ hashes/provenance
→ durable checkpoint
```

**Status:** `LIKELY`.

This is more important than merely “automation works” because it enables AI self-verification and later human/AI audit.

---

### C7. Progressive power escalation

Phase 1 suggests a factual power ladder:

```text
L0  Live DOM / content script
L1  Chrome APIs + webNavigation + webRequest
L2  userScripts / DNR / offscreen
L3  chrome.debugger → DOM/Runtime/Network/Input/etc.
L4  Fetch interception / deep evidence
L5  Local Runtime
```

This does **not yet lock a final Normal/Power architecture**, but it demonstrates that many useful capabilities exist before debugger escalation.

---

## 10. Phase 1 micro-proof backlog

Phase 1 is synthesis-ready even though not every documented primitive is proven.

The next stage should stop broad discovery and execute a small number of high-information proofs.

### P0 — Loopback LNA proof

**Priority:** CRITICAL.

Question:

```text
MV3 service worker
→ ws://127.0.0.1
→ current Chrome LNA result
```

Matrix:

- fresh profile;
- current installed/unpacked extension;
- host permission on/off as applicable;
- literal `127.0.0.1` vs `localhost` comparison;
- host online/offline;
- browser restart;
- extension restart/update;
- capture exact browser/console/network error.

**Why first:** this is load-bearing for the real Bridge transport.

---

### P1 — Input trust / user activation proof

**Priority:** HIGH.

Controlled page records:

```text
source
isTrusted
navigator.userActivation.isActive
navigator.userActivation.hasBeenActive
focus
mouse/keyboard event ordering
```

Compare:

- `dispatchEvent()`;
- `element.click()`;
- CDP mouse;
- CDP keyboard;
- physical user input.

**Why:** closes the most important actuation semantic gap without provider-specific testing.

---

### P2 — File upload gate proof

**Priority:** HIGH.

Test:

```text
isAllowedFileSchemeAccess()
↔ DOM.setFileInputFiles
```

with toggle off/on.

Then prove:

- stable visible file input;
- intercepted dynamic chooser with backend node;
- one drag/drop case if worthwhile.

**Why:** determines whether Artifact Bus ingress is practical enough to promote.

---

### P3 — Unified Target/Frame/Context Registry proof

**Priority:** HIGH.

Controlled nested page:

- same-process iframe;
- OOPIF;
- nested OOPIF;
- dedicated/shared worker;
- cross-process navigation;
- process swap;
- recursive auto-attach.

**Why:** shared runtime routing depends on this.

---

### P4 — Correlated State proof

**Priority:** HIGH.

Controlled app with:

- normal fetch;
- delayed response;
- failed request;
- polling;
- WebSocket or SSE;
- DOM semantic state.

Show that the reducer avoids false completion from generic network-idle logic.

---

### P5 — Evidence Bundle proof

**Priority:** MEDIUM-HIGH.

Capture before/after:

- screenshot;
- semantic/DOM snapshot;
- selected network metadata;
- hashes/provenance.

Then perform audit from stored bundle without accessing live page.

---

### P6 — Dynamic userScripts adapter proof

**Priority:** MEDIUM-HIGH.

Show:

```text
register adapter V1
→ observe controlled page
→ update V2
→ rollback
→ extension update clears registration
→ Adapter Registry rehydrates
```

---

### P7 — Artifact download registry proof

**Priority:** MEDIUM.

Show:

```text
download
→ completion event
→ resolved absolute path
→ fs stat/hash
→ artifact record
→ restart reconciliation by download ID/path
```

---

## 11. Seed / Discovery Runtime implications

Phase 1 materially strengthens the Seed hypothesis, but changes its preferred abstraction.

The weaker concept is:

> Seed Extension opens a website and directly generates a new production extension for it.

The stronger concept suggested by the technical reach is:

> **Browser Discovery Runtime** observes a website, builds evidence and a capability profile, generates/reviews a site adapter, then dynamically deploys that adapter when appropriate.

Potential pipeline:

```text
SITE OPENED
→ topology/document registration
→ normal-mode semantic discovery
→ DOM + AX + CSS + webRequest evidence
→ debugger escalation only when required
→ Site Capability Profile
→ Regulation/Boundary research as separate axis
→ Micro-proof Plan
→ adapter spec
→ reviewed userScripts/package adapter
→ monitored runtime
→ drift evidence
→ update/rollback
```

This avoids creating a separate extension binary for every provider unless a dedicated extension is genuinely required.

---

## 12. Regulation axis — intentionally not collapsed into technical status

Every capability should continue to carry a separate boundary classification:

```text
ALLOWED
CONSTRAINED
UNCERTAIN
HIGH-RISK / PROHIBITED
NEEDS STUDY
```

Examples:

- CDP can technically observe network bodies; that does not mean indiscriminate logging of sensitive data is appropriate.
- Browser input can technically operate controls; that does not imply bypassing CAPTCHA/MFA/provider security mechanisms is acceptable.
- userScripts can technically deliver runtime code; distribution/review/provider terms still need separate analysis.
- authenticated-session visibility does not justify credential/session exfiltration.

**Technical possibility is not regulatory permission.**

---

## 13. Phase 1 exit criteria

Phase 1 is considered **COMPLETE FOR SYNTHESIS** because:

1. Page/content-script reach is mapped.
2. Chrome API topology/navigation/download/session reach is mapped.
3. `chrome.debugger` domain and method-level ceiling is mapped.
4. Nested target/frame/context lifecycle is mapped.
5. Network observation/interception layers are mapped.
6. Upload/download Artifact Bus directions are mapped.
7. Restart/reconciliation semantics are mapped.
8. Authenticated browser-session observation is mapped.
9. dynamic userScripts adapter delivery is mapped.
10. offscreen processing reach is mapped.
11. semantic observation/evidence capture are mapped.
12. browser input semantics are mapped to the remaining proof.
13. loopback Bridge/LNA is mapped to the remaining infrastructure proof.

Remaining unknowns are now **specific micro-proof questions**, not broad unknown capability families.

That is the correct stopping condition for Phase 1.

---

## 14. Recommended next stage

Do **not** start another broad EXP sequence.

Proceed with:

```text
Phase 2A — Micro-Proof Sprint
P0 LNA
P1 Input semantics
P2 File upload gate
P3 Registry
P4 Correlated state

then

Phase 2B — Architecture Reconciliation
→ decide runtime layering
→ decide debugger escalation strategy
→ define Seed/Discovery runtime boundary
→ define adapter lifecycle
→ define durable/local responsibility

then

Phase 2C — thin Browser Runtime MVP
```

The first implementation target should not be “all capabilities”. It should prove the minimal runtime spine:

```text
Browsing Context Registry
+ Semantic Observation
+ ActionSpan/Correlated State
+ Evidence Bundle
+ Bridge recovery/checkpoint
```

with other powers added as adapters or escalation layers.

---

## 15. Final Phase 1 statement

Phase 1 supports this high-level conclusion:

> A Chrome Extension paired with a durable local runtime can plausibly become a general Browser Runtime for authenticated web applications, not merely a collection of provider-specific click scripts.

But the ceiling is not unlimited:

- browser-target-level CDP authority is closed;
- permissions/user settings matter;
- local-path access is gated;
- browser-owned consent/security surfaces remain boundaries;
- durable exactly-once behavior is not universal;
- the loopback Bridge needs a current-Chrome LNA proof;
- browser Input trust/user-activation semantics still need measurement.

The evidence is now specific enough to move from **capability discovery** to **micro-proof + architecture synthesis** without continuing discovery indefinitely.

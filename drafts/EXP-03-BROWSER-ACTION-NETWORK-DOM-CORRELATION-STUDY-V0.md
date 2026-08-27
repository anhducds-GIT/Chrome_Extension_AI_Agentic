# EXP-03 — Browser Action → Network/Fetch → DOM Correlation Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. No production implementation. Provider policy/regulation remains a separate axis.

## 1. Research question

Can the Browser Runtime build a materially more reliable state detector by correlating:

```text
browser action
→ network request / stream activity
→ backend transition
→ DOM/UI semantic confirmation
→ durable checkpoint
```

instead of depending mainly on selectors, spinners, button state, fixed sleeps, or timeout heuristics?

The target is not provider-specific endpoint reverse engineering. The target is a reusable runtime primitive for observing authenticated web applications.

---

## 2. Core finding

**Yes, with an important constraint:** CDP exposes enough network lifecycle information through `chrome.debugger` to build a multi-signal correlation engine, but there is no universal one-event proof that a browser action has completed successfully.

The robust abstraction is therefore not:

```text
click
→ wait for one request
→ done
```

It is closer to:

```text
ACTION_SPAN
  + target/session/frame context
  + relevant request lifecycle
  + backend success evidence
  + UI semantic evidence
  + failure/timeout evidence
→ CORRELATED_STATE
→ CHECKPOINT
```

**Technical reach:** LIKELY / strong documented basis; requires controlled micro-proof before marking PROVEN.

---

## 3. `chrome.debugger` exposure boundary

Chrome explicitly documents both `Network` and `Fetch` among the CDP domains available through `chrome.debugger`.

Therefore an extension-attached debugger session can, subject to the Chrome version/method actually supported at runtime:

- enable network tracking;
- receive request/response/loading events;
- inspect request metadata and selected bodies;
- observe WebSocket and EventSource activity;
- pause/intercept matching requests via Fetch;
- route events from root and flat child sessions using the `DebuggerSession.sessionId` model.

Important ceiling rule remains:

```text
Full CDP != chrome.debugger surface
```

The `Network` and `Fetch` domains are allowed, but experimental tip-of-tree methods should not be assumed stable merely because they appear in the full CDP documentation.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

---

## 4. Primitive map

### P1 — Request start observation

`Network.requestWillBeSent` exposes useful correlation fields including:

- `requestId`;
- `loaderId`;
- `documentURL`;
- request URL/method/headers/post data when available;
- `initiator`;
- resource `type`;
- `frameId`;
- `hasUserGesture`;
- redirect response metadata when relevant.

This gives a stronger action-attribution surface than DOM timing alone.

**Limitation:** `hasUserGesture` is only one signal; it is not a universal action ID. One user action may fan out into many requests, and unrelated background requests can occur in the same time window.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent

### P2 — Response availability

`Network.responseReceived` exposes:

- matching `requestId`;
- response status/headers/mime/timing;
- `frameId`;
- loader context;
- cache/service-worker source information via the `Response` object.

This can establish that the backend returned a response, but not necessarily that the application accepted the operation semantically.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived

### P3 — Terminal request outcome

Two core terminal events exist:

- `Network.loadingFinished`
- `Network.loadingFailed`

`loadingFailed` also exposes cancellation, blocked reason and CORS error information where available.

These are strong transport-level signals.

**Limitation:** transport completion is not business completion. A `200` response can still represent an application-level error; conversely a long-lived stream may not produce `loadingFinished` until the connection closes.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-loadingFinished
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-loadingFailed

### P4 — Request/response body access

`Network.getRequestPostData` can retrieve request post data when present, but explicitly omits files from multipart requests.

`Network.getResponseBody` can retrieve the served response body for a request.

This enables semantic backend confirmation when metadata/status is insufficient.

**Default architecture recommendation:** capture metadata first; fetch bodies only for explicitly selected endpoint patterns or proof cases. Bodies increase memory use, secret exposure, parsing complexity and application coupling.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-getRequestPostData
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#method-getResponseBody

### P5 — WebSocket observation

The Network domain exposes:

- WebSocket creation;
- handshake request/response;
- sent frames;
- received frames;
- frame errors;
- close events.

The WebSocket frame object exposes payload data for text/binary messages.

This matters for applications where the backend transition arrives over a persistent socket rather than XHR/fetch.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-webSocketFrameReceived

### P6 — Server-Sent Events / EventSource

`Network.eventSourceMessageReceived` exposes:

- request ID;
- timestamp;
- event name;
- event ID;
- event data.

This provides a direct primitive for applications that emit progress/completion over EventSource/SSE.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-eventSourceMessageReceived

### P7 — Generic streaming response observation

`Network.dataReceived` exposes chunk timing/length. Current tip-of-tree CDP also documents experimental streaming helpers such as `Network.streamResourceContent`.

However experimental methods should not be a core dependency for EXP-03.

A generic long-lived fetch stream should be treated differently from a normal finite request because waiting for `loadingFinished` can be the wrong completion condition.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-dataReceived

### P8 — Fetch interception

`Fetch.enable` + `Fetch.requestPaused` can pause matching traffic at request or response stage. The client must then continue, fail or fulfill the request.

`Fetch.requestPaused` exposes a Fetch request ID and, when a corresponding Network event exists, a `networkId` that maps back to the Network request ID.

This makes Fetch useful for controlled interception, body access, mutation, auth handling and experiments.

**Key architecture finding:** Fetch is an **interceptor**, not merely an observer. Enabling it can perturb timing and behavior because matching traffic is paused until the extension responds.

Therefore:

```text
NETWORK = default observation plane
FETCH   = selective interception/escalation plane
```

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#event-requestPaused
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#method-enable

---

## 5. Request identity is more subtle than `requestId = one HTTP hop`

CDP defines `Network.RequestId` as a unique network request identifier but explicitly notes that it does **not** identify each individual HTTP request that may be part of a network request.

Redirect handling reinforces this:

- `Network.requestWillBeSent` can carry `redirectResponse`;
- Fetch reports redirect responses and subsequent requests separately and exposes `redirectedRequestId`;
- Fetch has its own request ID namespace and can map to Network via `networkId`.

**Design implication:** do not model request identity as a flat global string.

Recommended internal key:

```text
NetworkRequestKey = {
  debugger_root,
  session_id?,
  request_id
}
```

and keep redirect-chain state explicitly rather than assuming one request event pair equals one backend operation.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-RequestId
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/#event-requestPaused

---

## 6. Event ordering and race conditions

Network observation is event-rich but not strictly sequential in the simple sense.

The protocol explicitly states for ExtraInfo events that:

- not every request/response emits ExtraInfo;
- there is no guaranteed order between `requestWillBeSent` and `requestWillBeSentExtraInfo`;
- `responseReceivedExtraInfo` may arrive before or after `responseReceived`.

Therefore the runtime should use an **event reducer / correlation store**, not code that assumes a single fixed callback order.

Candidate model:

```text
append event
→ normalize by session + request key
→ merge partial facts
→ update request state
→ evaluate correlation rules
```

This pattern also makes recovery/logging easier.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSentExtraInfo

---

## 7. Cache and Service Worker failure modes

### Cache

CDP exposes multiple cache indicators:

- `Network.requestServedFromCache`;
- `Response.fromDiskCache`;
- `Response.fromPrefetchCache`;
- response extra-info behavior can differ for cached responses.

A detector that expects a fresh wire response for every user action can therefore produce false negatives.

**Micro-proof requirement:** run the same operation with cache warm and cold and confirm the reducer still reaches the same semantic state.

### Service Worker

`Response.fromServiceWorker` indicates that a response was served from a Service Worker. The Network timing model also exposes worker-related phases, and `loaderId` is documented as empty when a request is fetched from a worker.

This means `loaderId` alone is not a safe universal correlation key.

**Micro-proof requirement:** include a controlled Service Worker path and verify request attribution survives the worker mediation.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestServedFromCache
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#type-Response
- https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent

---

## 8. Cross-frame / child-target attribution

EXP-01 already established that a tab can contain:

- same-process frames represented by different execution contexts;
- OOPIFs/workers represented as separate targets / child sessions.

`chrome.debugger.onEvent` supplies a `DebuggerSession`; from Chrome 125+ this can include `sessionId` for child protocol sessions.

Network events also expose `frameId` where applicable.

Therefore cross-frame attribution should use **both protocol session identity and frame identity**, not only tab ID.

Candidate context tuple:

```text
BrowserContextKey = {
  tab_id,
  target/session,
  frame_id?,
  execution_context_id?
}
```

EXP-04 will study nested target registry more deeply; EXP-03 only requires the correlation engine not to erase this dimension.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 9. SPA-specific correlation problem

Single-page applications create three major ambiguity classes:

1. one UI action causes several network requests;
2. background polling/telemetry occurs continuously;
3. DOM changes may happen before, after, or independently of the most meaningful backend response.

Therefore time proximity alone is insufficient.

### Proposed `ActionSpan`

Before dispatching an action, create a bounded correlation record:

```text
ActionSpan {
  action_id
  tab_id
  session_id?
  frame_id?
  action_type
  semantic_target
  t0
  expected_network_patterns?
  expected_dom_outcome?
  terminal_deadline
}
```

Candidate requests are scored/filtered by several independent signals:

- same session/frame when known;
- start timestamp after `t0`;
- URL/method/resource type pattern;
- request initiator;
- `hasUserGesture` when present;
- request-body signature when explicitly safe/useful;
- known app-specific semantic endpoint class.

This is a correlation score/state machine, not a universal deterministic causal link.

**Evidence status:** architecture hypothesis derived from documented primitives; requires micro-proof.

---

## 10. Proposed correlated state machine

```text
ACTION_ARMED
  ↓ dispatch browser action
ACTION_SENT
  ↓ candidate request(s)
BACKEND_OBSERVED
  ├─ loadingFailed / semantic error ──> FAILED
  ├─ response/stream progress ────────> BACKEND_TRANSITION
  └─ no matching request ─────────────> DOM_ONLY / AMBIGUOUS

BACKEND_TRANSITION
  ↓ expected DOM/UI semantic state
CONFIRMED
  ↓ persist evidence
CHECKPOINTED
```

Allow explicit alternate terminal paths:

```text
NETWORK_CONFIRMED + DOM_MISSING   -> AMBIGUOUS / retry UI observation
DOM_CONFIRMED + NETWORK_MISSING   -> DOM_ONLY / provider rule decides confidence
NETWORK_FAILED + DOM_SUCCESS      -> CONTRADICTION
NETWORK_SUCCESS + DOM_ERROR       -> CONTRADICTION
DEADLINE                          -> TIMEOUT with evidence bundle
```

**Important:** contradictions should be first-class evidence, not silently resolved by trusting whichever signal arrived last.

---

## 11. Failure-mode inventory

### F1 — Background network noise
Telemetry/polling can be mistaken for the action request.

**Mitigation:** ActionSpan + semantic endpoint filters + frame/session context.

### F2 — Fan-out
One action triggers many requests.

**Mitigation:** support request sets / dependency groups rather than one expected request ID.

### F3 — Redirect chain
A logical operation may span redirects.

**Mitigation:** explicit redirect-chain reducer; never assume one request ID means one wire hop.

### F4 — Cache hit
Expected fresh network behavior may be replaced by cache.

**Mitigation:** recognize cache indicators; micro-proof warm/cold cache.

### F5 — Service Worker mediation
Loader/frame assumptions can break; response may originate from worker/cache.

**Mitigation:** record Service Worker response source and child-session context.

### F6 — Long-lived stream
`loadingFinished` may not represent operation completion for WebSocket/SSE/streaming fetch.

**Mitigation:** protocol-specific completion predicates: WS frame/SSE event/semantic chunk + DOM confirmation.

### F7 — Event-order race
ExtraInfo may arrive out of order or not at all.

**Mitigation:** append-only event reducer and partial-state merging.

### F8 — Fetch observer effect
Interception pauses traffic and can introduce latency/deadlocks/behavior changes if mishandled.

**Mitigation:** Network-only by default; use Fetch only for explicit experiments/interception needs.

### F9 — Body unavailable / expensive
Body reads can fail, be too large, or create secret-retention risk.

**Mitigation:** metadata-first; body-on-demand; bounded size and retention.

### F10 — UI/backend contradiction
Backend says success while UI says error/stale, or vice versa.

**Mitigation:** mark contradiction; do not checkpoint as success automatically.

---

## 12. Compound capabilities unlocked

### C1 — Reliable web-job completion detector

```text
UI action
+ relevant request group
+ backend success semantics
+ DOM confirmation
→ high-confidence completion
```

### C2 — Semantic retry engine

Instead of retrying after an arbitrary timeout:

```text
loadingFailed / 5xx / app error
→ classify failure
→ retry policy
```

### C3 — Streaming progress tracker

```text
WebSocket / SSE / stream event
→ progress state
→ local checkpoint/log
→ DOM confirmation at terminal state
```

### C4 — Provider-independent evidence bundle

Each action can persist:

```text
action metadata
+ request IDs
+ status/timing
+ selected response semantics
+ DOM state
+ screenshot/hash if needed
```

This can support later audit/recovery without depending on chat transcript memory.

### C5 — Multi-app orchestration with stronger handoff

```text
App A action
→ correlated completion
→ artifact/result available
→ checkpoint
→ App B action
```

This directly strengthens the emerging Artifact Bus hypothesis.

### C6 — Adaptive wait instead of fixed timeout

The runtime can distinguish:

- backend still streaming;
- request failed;
- backend complete but UI stale;
- no meaningful request appeared;
- UI complete despite no observable network transition.

That is materially better than a single timer.

---

## 13. Architecture recommendation from Phase 1 evidence

Do not create one monolithic `waitForNetworkIdle()` primitive.

That abstraction is weak for modern authenticated SPAs because background traffic, WebSockets, polling and streams can keep a page perpetually non-idle.

Prefer a reusable **Correlation Engine** with provider/site adapters supplying semantic rules:

```text
Shared Browser Runtime
├─ NetworkObserver
├─ RequestReducer
├─ StreamObserver
├─ ActionSpanRegistry
└─ CorrelationEngine

Site Adapter
├─ expected endpoint classes
├─ success/error semantics
└─ DOM confirmation predicates
```

The shared runtime owns generic event transport/state. The site adapter owns semantic meaning.

This is an architecture hypothesis, not yet locked.

---

## 14. EXP-03 controlled micro-proof design

Use a controlled local/HTTPS test application; no real provider automation required.

The test app should expose buttons that intentionally create different network patterns.

### Scenario A — simple finite request

```text
button
→ POST /job
→ 200 JSON {ok:true, job_id}
→ DOM "done"
```

Measure action → request → response → loadingFinished → DOM order and latency.

### Scenario B — redirect

```text
button
→ POST /redirect
→ 302
→ /job
→ DOM "done"
```

Verify redirect-chain normalization.

### Scenario C — concurrent noise/fan-out

Action triggers meaningful API request plus analytics/background polling.

Verify correlation selects the intended request group rather than nearest event.

### Scenario D — cache

Run cold then warm cache.

Verify same semantic completion despite cache-path differences.

### Scenario E — Service Worker

Serve/intercept one relevant response through a controlled Service Worker.

Verify response source and action attribution.

### Scenario F — SSE

```text
button
→ EventSource
→ progress events
→ terminal event
→ DOM "done"
```

Verify terminal state does not depend on `loadingFinished`.

### Scenario G — WebSocket

```text
button
→ socket command
→ progress frame(s)
→ terminal frame
→ DOM "done"
```

Verify sent/received frame correlation.

### Scenario H — controlled contradiction

Backend returns success while DOM intentionally shows error, then inverse.

Verify runtime produces `CONTRADICTION`, not false success.

### Scenario I — Fetch interception perturbation

Repeat one finite request with:

1. Network observation only;
2. Fetch interception enabled and immediately continued.

Measure added latency/event ordering and prove the runtime can avoid accidental stalls.

### Scenario J — child frame

Trigger a request from a controlled iframe/child target and verify event attribution preserves session/frame identity.

---

## 15. PASS criteria

EXP-03 passes only if all of the following are demonstrated on controlled infrastructure:

1. one action can be represented by an `ActionSpan` and matched to the correct meaningful request/request group despite unrelated traffic;
2. finite request success/failure is reconstructed from Network events without fixed sleeps;
3. redirect chains do not create false completion or duplicate logical operations;
4. warm-cache and Service Worker paths remain attributable;
5. at least one SSE or WebSocket terminal signal is correlated without waiting for generic network idle;
6. root/child session + frame identity is preserved in evidence;
7. backend/UI contradictions become an explicit non-success state;
8. Fetch interception is proven optional for observation and does not become a hidden dependency;
9. event-order variation does not break the reducer;
10. authoritative checkpoint is written only after the configured semantic confirmation rule is satisfied.

### Suggested measured evidence

For each scenario persist:

```text
action_id
session/frame key
request/network IDs
ordered timestamps
redirect/cache/SW flags
response status
stream terminal signal if any
DOM terminal signal
correlation result
checkpoint decision
```

---

## 16. Decision unlocked by EXP-03

If the micro-proof passes, the platform can promote the following to a shared Browser Runtime primitive:

> **Network-assisted semantic state detection**

This would justify replacing many provider-specific fixed waits with a common correlation substrate while still leaving endpoint meaning and DOM semantics inside site adapters.

If the proof fails mainly because endpoint semantics are too provider-specific, the generic layer should remain a normalized event/reducer service rather than trying to infer success autonomously.

Either outcome is useful; it prevents over-claiming a universal network automation layer.

---

## 17. Current Phase 1 conclusion

The technical ceiling is high enough to support much more reliable browser-job state detection than DOM-only automation.

The strongest current model is:

```text
ACTION
→ normalized Network/stream evidence
→ semantic backend transition
→ DOM/UI confirmation
→ checkpoint
```

But the key design discipline is equally important:

- Network observes; Fetch selectively intercepts.
- Request IDs require session/redirect-aware normalization.
- Cache, Service Workers and streams are normal cases, not edge cases to ignore.
- Network transport success is not identical to application success.
- A checkpoint should represent correlated semantic evidence, not whichever callback fired last.

**Status:** sufficient documented evidence to proceed to controlled micro-proof; not yet PROVEN in repo implementation.

---

## Sources

Official Chrome / Chromium / CDP references:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

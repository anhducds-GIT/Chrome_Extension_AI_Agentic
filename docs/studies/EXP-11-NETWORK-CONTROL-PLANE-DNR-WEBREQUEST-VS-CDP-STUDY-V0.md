---
kind: study
status: active
ttl_days: 180
---

# EXP-11 — Network Control Plane: DNR + webRequest vs CDP Network/Fetch Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Technical reach first. No production implementation. Provider policy/regulation remains a separate boundary axis.

---

## 1. Research question

How much network observation/control can a Chrome Extension reach **without** paying the UX/security cost of `chrome.debugger`, and when is escalation to CDP `Network` / `Fetch` actually required?

Target comparison:

```text
NORMAL NETWORK MODE
chrome.webRequest + chrome.declarativeNetRequest

POWER NETWORK MODE
chrome.debugger → Network + Fetch
```

The goal is not to force a two-mode architecture yet. The goal is to map the factual ceiling of each layer.

---

## 2. Core finding

**A large amount of useful network reach is available without `debugger`.**

The strongest current decomposition is:

```text
webRequest
= observational request lifecycle / attribution plane

DNR
= declarative mutation / policy plane

CDP Network
= deep per-tab protocol telemetry plane

CDP Fetch
= imperative interception / replacement / body-stream plane
```

This materially changes the earlier assumption that meaningful network-assisted state detection automatically implies a debugger-attached tab.

### Technical classification

- `webRequest` observation: **DOCUMENTED / REACHABLE**
- DNR block/redirect/header shaping: **DOCUMENTED / REACHABLE**
- CDP Network deep telemetry: **DOCUMENTED / REACHABLE through chrome.debugger**
- CDP Fetch interception/fulfillment: **DOCUMENTED / REACHABLE through chrome.debugger**
- unified runtime strategy: **NEEDS MICRO-PROOF**

Repo evidence search currently shows no deployed `declarativeNetRequest` / `webRequest` usage in this repo: **NOT YET IMPLEMENTED**.

---

## 3. `chrome.webRequest` — observation plane

Manifest V3 removed `webRequestBlocking` for ordinary store-installed extensions, but Chrome explicitly states that the rest of `webRequest` remains available for normal use.

Policy-installed extensions are the exception and may still use blocking handlers.

Therefore ordinary MV3 should treat `webRequest` primarily as an observer.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/webRequest

### P1 — Lifecycle events

Useful events include:

- `onBeforeRequest`
- `onBeforeSendHeaders`
- `onSendHeaders`
- `onHeadersReceived`
- `onResponseStarted`
- `onBeforeRedirect`
- `onCompleted`
- `onErrorOccurred`
- `onAuthRequired` with the dedicated auth permission where applicable

Chrome documents that, except for a special data-URL redirect case, either `onCompleted` or `onErrorOccurred` is the final event for a request.

This is already enough to build a lightweight request reducer for many ActionSpan correlations.

### P2 — Strong browser attribution metadata

Current events expose useful browser-native context including:

```text
requestId
+ tabId
+ frameId
+ parentFrameId
+ documentId
+ parentDocumentId
+ documentLifecycle
+ frameType
+ initiator
+ method / URL / resource type
```

`requestId` is unique within the browser session/context of the extension and is intended to correlate lifecycle events.

`documentId` is especially useful because it aligns well with EXP-08's document-centric browsing-context model.

### P3 — Request body observation

`onBeforeRequest` can expose request body data when `extraInfoSpec` includes `requestBody`.

This means some POST/form mutation semantics can be observed without CDP.

Important limitation: this is not equivalent to arbitrary response-body access.

### P4 — Cache signal

`onResponseStarted` / related response events can expose `fromCache`.

However Chrome notes that `webRequest` is an abstraction over the network stack and does not expose every final header Chrome actually sends; some cache-related headers are hidden.

### P5 — WebSocket boundary

`webRequest` can observe/intercept the **WebSocket HTTP upgrade handshake**, but Chrome explicitly states it does **not** expose:

- individual WebSocket messages after connection establishment;
- WebSocket close messages/state through this API.

Therefore WebSocket progress/content semantics remain a CDP Network escalation case.

---

## 4. `chrome.declarativeNetRequest` — mutation/policy plane

Chrome defines DNR as a way to block or modify requests using declarative rules **without intercepting and viewing request contents**.

Supported action families include:

- `block`
- `redirect`
- `allow`
- `allowAllRequests`
- `upgradeScheme`
- `modifyHeaders`

Source:
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

### P6 — Permission tradeoff

Chrome currently documents two main permissions with the same DNR capabilities:

- `declarativeNetRequest` — install warning, but implicit access for selected rule types;
- `declarativeNetRequestWithHostAccess` — no install warning, but requires host permissions before acting on a host.

This makes the host-access variant particularly relevant to a Seed/Browser Runtime that already has explicit site scope.

### P7 — Dynamic network adapters

DNR has three rule lifetimes:

```text
static rules
→ packaged with extension

dynamic rules
→ JavaScript-managed
→ persist across browser sessions AND extension upgrades

session rules
→ JavaScript-managed
→ cleared on browser shutdown / extension version install
```

This is a notable complement to EXP-09 `userScripts`:

```text
runtime site adapter code
+ runtime network rules
```

can potentially be versioned independently from the base extension package.

### P8 — Header shaping

DNR can modify request/response headers through `modifyHeaders`.

Set/remove semantics are broad; append is restricted to Chrome's documented allowlist of request headers.

This covers a meaningful subset of scenarios that might otherwise tempt use of CDP Fetch.

### P9 — Service Worker / CacheStorage boundary

DNR only applies to requests reaching the network stack.

Chrome explicitly notes:

- cached HTTP responses can still be in scope;
- responses generated directly by a service worker or returned from CacheStorage may bypass DNR;
- `fetch()` calls initiated by a service worker can still be affected when they reach the network stack.

This is a critical failure mode for SPA/PWA discovery: absence of a DNR match does not imply absence of an application transition.

### P10 — DNR is not a production telemetry API

`onRuleMatchedDebug` and `getMatchedRules()` debugging features require `declarativeNetRequestFeedback` and are intended for unpacked-extension debugging.

Therefore production architecture should **not** rely on DNR debug callbacks as the authoritative event stream.

DNR should be treated as mutation/policy state; correlation should come from `webRequest`, page semantics, or CDP when needed.

---

## 5. CDP `Network` — deep telemetry escalation

`Network` is exposed through `chrome.debugger`.

Compared with `webRequest`, it adds deeper protocol-level signals such as:

- detailed request/response lifecycle;
- loading timing/data events;
- request/response body retrieval where supported;
- EventSource messages;
- WebSocket create/handshake/frame/error/close events;
- deeper cache/service-worker metadata;
- protocol-specific timing/security details.

For EXP-03-style completion detection, CDP Network becomes most valuable when the relevant backend truth is not adequately represented by ordinary request completion metadata.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/

### High-value unique reach

A clear differentiator is WebSocket/EventSource visibility.

`Network.webSocketFrameReceived` exposes actual message frames after the handshake; `webRequest` explicitly does not.

That makes CDP Network a strong escalation mechanism for applications whose generation/progress state is carried over persistent channels.

---

## 6. CDP `Fetch` — imperative interception escalation

`Fetch` is not merely an observer.

`Fetch.enable` pauses matching traffic until the client explicitly chooses an action such as:

- continue;
- fail;
- fulfill with a synthetic response;
- handle auth challenge.

This means enabling Fetch changes runtime behavior and can introduce latency/race conditions if used carelessly.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

### P11 — Synthetic response / fixture replay

`Fetch.fulfillRequest` can supply:

```text
status code
+ headers
+ body
```

without the original request needing to complete normally.

This is a powerful controlled-test primitive for adapter regression and offline fixture replay.

### P12 — Response-body interception / streaming

`Fetch.getResponseBody` can retrieve a response body for a response-stage paused request.

`Fetch.takeResponseBodyAsStream` can expose a stream handle, but after taking the stream the request cannot simply continue unchanged: the client must cancel or provide the body itself.

Therefore this is a **powerful but invasive** primitive, not something to turn on globally just for observation.

---

## 7. Capability ladder

### Level N0 — Page-only

```text
DOM / content-script semantics
```

Use when page state is sufficient.

### Level N1 — `webRequest` observation

```text
request lifecycle
+ status/headers
+ requestId
+ tab/frame/document attribution
+ request body where available
```

Use for ordinary network-assisted state detection without debugger UX cost.

### Level N2 — DNR mutation

```text
block / redirect / allow
+ request/response header shaping
+ dynamic/session rules
```

Use for deterministic policy/routing transformations that do not require reading bodies.

### Level N3 — CDP Network

```text
deep network telemetry
+ WebSocket/EventSource messages
+ richer timing/cache/service-worker detail
```

Escalate only when N1 cannot observe the semantic signal needed.

### Level N4 — CDP Fetch

```text
pause / continue / fail
+ synthetic response
+ body interception / streaming
```

Use only when interception is intentionally required.

---

## 8. Compound capabilities unlocked

### C1 — Low-cost network-assisted completion oracle

```text
browser action
+ webRequest request reducer
+ documentId/tabId attribution
+ DOM confirmation
→ checkpoint
```

Potentially avoids debugger entirely for many apps.

### C2 — Runtime network policy adapter

```text
Site Adapter
+ dynamic DNR rules
→ block / redirect / header shaping
```

Could become the network half of a dynamically delivered site adapter.

### C3 — Site capability discovery

```text
Seed observer
+ webRequest metadata
→ endpoint/resource-type map
→ document/frame attribution
→ candidate workflow signals
```

This is especially interesting for the parallel Seed Extension study because it provides meaningful discovery data without attaching debugger to every page.

### C4 — Progressive escalation

```text
DOM enough? yes → stop
no → webRequest
still insufficient → CDP Network
needs interception → Fetch
```

This creates a technically grounded escalation ladder rather than a binary content-script-vs-debugger model.

### C5 — Offline adapter regression

```text
captured fixture
→ Fetch.fulfillRequest
→ site adapter executes against deterministic response
→ DOM/network assertions
```

Useful for controlled test infrastructure without repeatedly consuming provider-side generation quota.

---

## 9. Limitations / failure modes

1. **webRequest blocking is unavailable to ordinary MV3 extensions.** Do not design around blocking listeners unless policy-installed deployment is explicitly intended.
2. **Host permissions matter.** Observation/intervention is not universal across arbitrary initiator/request URL combinations.
3. **webRequest is an abstraction, not raw wire truth.** It may hide headers/internal HTTP requests.
4. **One webRequest ID can abstract multiple HTTP operations** during redirects/auth flows; do not assume 1 requestId = 1 network hop.
5. **DNR has no general production rule-match event stream.** Debug feedback is not a production telemetry contract.
6. **Service-worker-generated / CacheStorage responses may bypass DNR.** Correlation must tolerate missing rule application.
7. **WebSocket handshake != WebSocket messages.** webRequest stops at the HTTP layer once the socket is established.
8. **Fetch interception perturbs the system being observed.** Never enable it globally as a passive telemetry mechanism.
9. **Rule conflicts/priority matter.** Multiple extensions and multiple rule types can alter final behavior; explicit priority is required.
10. **Rule quotas exist.** Runtime adapter design must manage dynamic/session rule IDs and quotas instead of generating unlimited rules.

---

## 10. Micro-proof design

Run only against controlled test pages/server.

### Scenario A — webRequest lifecycle

Trigger one XHR/fetch request and record:

```text
onBeforeRequest
→ onSendHeaders
→ onHeadersReceived / onResponseStarted
→ onCompleted
```

Verify constant `requestId` and correct tab/frame/document attribution.

### Scenario B — request body

Send a known POST body and verify `onBeforeRequest` exposes expected form/raw body when requested.

### Scenario C — redirect chain

Trigger 302 → final 200 and verify lifecycle/reducer behavior does not incorrectly assume one requestId equals one HTTP hop.

### Scenario D — DNR dynamic rule

Install a scoped dynamic header rule, trigger controlled request, verify server receives intended header change, then remove rule.

### Scenario E — DNR persistence

Restart browser and confirm dynamic rule remains while session rule does not.

### Scenario F — Service Worker / CacheStorage

Use a controlled service worker to return one synthetic cached response and one network fetch. Record which DNR/webRequest signals appear.

### Scenario G — WebSocket

Open a controlled WebSocket:

- verify webRequest sees handshake;
- verify it does not expose individual messages;
- attach CDP Network and verify frames become visible.

### Scenario H — Fetch perturbation

Intercept one controlled request using Fetch, measure added timing, fulfill with fixture, and verify DOM behavior.

---

## 11. PASS criteria

EXP-11 passes if controlled proof demonstrates:

1. `webRequest` can provide enough lifecycle + document attribution for a provider-independent request reducer;
2. dynamic/session DNR rules can be added/removed deterministically and their persistence semantics match docs;
3. DNR mutation can be correlated externally without relying on `onRuleMatchedDebug`;
4. service-worker/CacheStorage bypass behavior is characterized rather than misclassified as missing traffic;
5. WebSocket handshake/message boundary is reproduced;
6. CDP Network adds observable value only where ordinary APIs stop;
7. Fetch interception is measured as an intentional invasive mode;
8. no production/provider endpoint is needed for the proof.

---

## 12. Architecture hypothesis unlocked — not yet locked

The strongest Phase-1 hypothesis is now a **progressive network capability ladder**:

```text
NORMAL MODE
DOM
+ webRequest observation
+ DNR mutation when needed

POWER OBSERVATION
CDP Network

POWER INTERCEPTION
CDP Fetch
```

This is preferable to treating `debugger` as the default network layer because many completion/state/use-case signals may be available through `webRequest` with lower UX/security cost.

However this remains a hypothesis until the micro-proof measures coverage and failure modes on controlled pages.

---

## 13. Sources

Official Chrome / CDP sources:

- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/reference/api/webRequest
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

# Chrome Extension + Native Bridge Capability Reach Study V0

**Status:** Living draft  
**Date:** 2026-08-28  
**Scope:** Study technical reach first; map provider/regulation boundaries alongside use cases later.  

## 1. Primary question

How far can this stack reach technically?

```text
AI Orchestrator
      ↓
Persistent Local Runtime / Native Bridge
      ↓
Chrome Extension Control Plane
      ↓
Content Script + Chrome APIs + chrome.debugger/CDP
      ↓
Authenticated browser sessions / web apps
```

The repo is only an **evidence layer** for capabilities already proven. It must not be treated as the ceiling of the platform.

---

## 2. Working capability model

### Zone A — Page / Content Script

Can provide app-specific understanding and ordinary browser interaction:

- read/mutate DOM;
- observe DOM/page events;
- fill inputs / click elements;
- inject JS/CSS through `chrome.scripting`;
- run in `ISOLATED` or `MAIN` world;
- target top frame, selected frames or all permitted frames;
- message the extension service worker.

**Best role:** default site-adapter layer because it is simpler and easier to constrain.

**Weaknesses:** DOM churn, complex cross-origin frames, browser-input semantics, hidden SPA state, and network lifecycle signals.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

### Zone B — Privileged browser runtime

Ordinary Chrome APIs add browser-level capabilities such as tabs, navigation, downloads, storage, alarms, capture, cookies and other permission-gated browser state.

CDP through `chrome.debugger` adds a separate high-power layer.

### Zone C — Local runtime / Native Bridge

Native Messaging is transport between Chrome and a registered local process. The native host's own implementation and OS permissions define local reach.

Potential local primitives include:

- filesystem;
- process / CLI execution;
- local HTTP / sockets;
- databases;
- durable queue/checkpoint;
- scheduler;
- artifact processing;
- file watchers;
- Git/repo interaction;
- other local agents/apps.

Therefore Bridge should not be understood as “send prompt/save result”. That is merely one protocol implemented over a much broader transport boundary.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

---

## 3. `chrome.debugger` / CDP — key reach finding

`chrome.debugger` is an alternate transport for Chrome DevTools Protocol.

It can instrument network interaction, JavaScript runtime, DOM/CSS and other browser internals. It does **not** expose all CDP domains; Chrome explicitly restricts the surface for security reasons.

Current documented allowed domains include major automation-relevant areas such as:

- DOM / DOMSnapshot / DOMDebugger;
- Runtime;
- Input;
- Network;
- Fetch;
- Page;
- Storage;
- Target;
- Emulation;
- IO;
- Accessibility;
- Tracing;
- WebAuthn.

**Architectural meaning:** CDP may become a shared “power runtime” above ordinary content-script automation.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 4. High-value CDP primitives

### DOM

Potentially useful primitives include deep DOM inspection, box models, node lookup, focus/mutation, shadow/frame traversal and direct file assignment to `<input type=file>` using `DOM.setFileInputFiles`.

Compound possibility:

```text
Local artifact path
→ Bridge
→ CDP DOM.setFileInputFiles
→ authenticated web application
```

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/

### Input

The Input domain can dispatch keyboard, mouse, wheel, touch, drag and text insertion events. This is technically different from only assigning DOM values or calling `element.click()`.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/

### Runtime

Runtime provides execution contexts, JS evaluation, function calls, promises and object inspection. It can expose SPA/page state that is not represented cleanly in rendered DOM.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

### Network + Fetch

Network can observe request/response metadata, headers, timing, bodies and resource/WebSocket activity.

Fetch can pause matching requests and continue/fail/modify/fulfill selected requests and handle auth challenges.

Potential state model:

```text
browser action
→ request observed
→ backend transition observed
→ page confirmation
→ checkpoint
```

This may be substantially more reliable than inferring all state from DOM spinners.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

---

## 5. EXP-01 deep dive — CDP attach/lifecycle

### 5.1 Attach model

`chrome.debugger.attach({tabId}, requiredVersion)` creates a root debugger session. Chrome's current documentation uses protocol version `0.1` as the normal required-version example.

`chrome.debugger.getTargets()` returns available targets and whether a debugger is already attached, so it should be a preflight capability rather than blindly attaching.

Attach/send operations reject their Promise on failure, which is suitable for a deterministic runtime state machine.

### 5.2 A tab is not one execution environment

Chrome documents two different frame cases:

- same-process frames can share one target but use separate Runtime execution contexts;
- out-of-process iframes can become separate targets.

Workers can also be targets.

From **Chrome 125+**, `DebuggerSession.sessionId` supports flat child sessions. `Target.setAutoAttach({flatten:true})` can attach related targets such as OOPIFs/workers without creating another root debugger attachment.

Important limitation: auto-attach is **not recursive**. In an A → B → C nested cross-origin frame tree, A can discover B, but B itself needs auto-attach configured to discover C.

**Recommendation:** target/frame/session registry must be a shared Browser Runtime primitive, never duplicated per GPT/Gemini/Flow adapter.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

### 5.3 Detach lifecycle

`chrome.debugger.onDetach` is a first-class lifecycle event.

Current documented reasons:

- `target_closed`
- `canceled_by_user`

Chrome specifically states that opening DevTools for a tab already attached by `chrome.debugger` terminates that debugging session.

Therefore DevTools conflict should be modeled as a recoverable runtime state, not a mysterious crash.

```text
ATTACHED
→ user opens DevTools
→ DETACHED(canceled_by_user)
→ preserve authoritative job checkpoint
→ wait / re-evaluate
→ safe reattach when possible
```

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 6. Important correction — MV3 lifetime ceiling is higher than first assumed

The generic MV3 rule remains: service workers can normally terminate after about 30 seconds of inactivity, and Chrome advises persisting state instead of relying on globals.

But two documented Chrome changes materially improve this platform:

- **Chrome 105+**: an active `chrome.runtime.connectNative()` connection keeps the extension service worker alive. If the native host crashes/closes, the port closes and normal lifetime timers resume.
- **Chrome 118+**: an active `chrome.debugger` session keeps the extension service worker alive.

Therefore this statement is too simplistic:

> “MV3 means a long browser runtime necessarily dies after ~30 seconds.”

A better model is:

```text
Native Host connection ─┐
                        ├─> service worker can remain active
Debugger session ───────┘
```

This raises the practical ceiling for long-running browser workers.

However **durable orchestration state should still remain local**, because Chrome/browser/extension/native-host processes can restart, detach or crash.

### Recommended responsibility boundary

**Extension / Browser Runtime owns:**

- active tab/target/frame/session registry;
- page adapters;
- live browser events;
- debugger connection state;
- reconstructable short/medium-lived execution state.

**Local Orchestrator remains SSOT for:**

- big-story state;
- multi-hour / multi-day jobs;
- queues;
- dependency graph;
- retry history;
- checkpoint history;
- artifact registry;
- authoritative job status;
- scheduling and recovery.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

---

## 7. `debugger` permission cost

This capability is technically powerful but has non-trivial UX/security cost.

Chrome documents install warnings for the `debugger` permission including:

- access the page debugger backend;
- read and change all data on all websites.

Chrome also lists `debugger` among permissions that **cannot be specified as optional permissions**.

This suggests a possible architecture hypothesis:

```text
NORMAL MODE
content scripts + ordinary Chrome APIs

POWER MODE
chrome.debugger/CDP as required privileged capability
```

This is not locked yet. We need empirical evidence before deciding whether CDP should always be enabled or remain selective.

Sources:
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/permissions

---

## 8. EXP-01 micro-proof specification

Run only on a controlled test page. No provider-specific automation is needed.

Measure:

1. enumerate targets with `getTargets()`;
2. attach to one controlled HTTPS tab;
3. record attach latency/failure behavior;
4. enable Runtime, DOM, Page and Target;
5. enumerate root frame and execution contexts;
6. enable flat auto-attach for child targets;
7. validate recursive nested-target registration;
8. perform one read-only `Runtime.evaluate`;
9. dispatch one harmless Input event;
10. verify debugger keep-alive beyond ordinary service-worker idle window;
11. open DevTools and record `onDetach` reason;
12. attempt safe reattach after DevTools closes;
13. close target and record detach reason;
14. detach cleanly;
15. repeat with Native Bridge port connected/disconnected.

### PASS criteria

- attach/detach lifecycle is deterministic enough to model as state;
- child target/session routing is reconstructable;
- debugger detach never destroys authoritative job state;
- observed service-worker behavior matches documented Chrome lifecycle;
- proof requires no site-specific selector;
- all actions occur on controlled test infrastructure.

### Proposed runtime state machine

```text
DETACHED
  ↓
ATTACHING
  ↓ success
ATTACHED
  ↓ discover contexts/targets
READY
  ↓ action
BUSY
  ↓ complete
READY

Any state
  ├─ tab close ───────────> DETACHED(target_closed)
  ├─ DevTools/user ───────> DETACHED(canceled_by_user)
  ├─ extension restart ───> RECOVERING
  └─ Bridge loss ─────────> DEGRADED / RECOVERING
```

### Decision unlocked by EXP-01

If stable, CDP becomes a **shared Browser Runtime capability** consumed by site adapters.

If permission/conflict/detach behavior is operationally expensive, CDP remains a **selective power tool** used only where content scripts cannot provide reliable reach.

---

## 9. First compound-capability map

### C1 — Reliable authenticated web worker

```text
tab management
+ DOM semantics
+ browser input
+ network lifecycle
+ authenticated session
+ checkpoint
```

### C2 — Local artifact → web app

```text
filesystem
+ Bridge
+ file-input primitive
+ browser workflow
```

### C3 — Web app → local artifact

```text
authenticated web app
+ download/state observation
+ Bridge
+ local artifact processor
```

### C4 — Multi-web-app workflow

```text
Orchestrator
→ authenticated app A
→ app B
→ app C
→ local checkpoint
```

### C5 — Multi-AI workflow

```text
AI worker A
→ worker B critique/transform
→ creation worker C
→ QA
→ artifact/checkpoint
```

GPT/Gemini/Google Flow are examples of adapters inside this broader model, not the platform boundary.

### C6 — Network-assisted state machine

Browser action and DOM signals can be correlated with backend request/response events instead of relying only on selectors/spinners.

### C7 — Long-running browser/local execution

```text
durable local story
→ wake/use browser actuator
→ bounded task
→ persist evidence
→ retry/wait
→ continue later
```

---

## 10. Architecture hypothesis V0

### Site Adapter

Provider/app-specific:

- selectors and semantics;
- page states;
- app-specific failure detection.

### Shared Browser Runtime

Provider-independent:

- tabs/windows;
- content-script execution;
- target/frame/session registry;
- debugger attach/detach;
- safe DOM/Input/Runtime primitives;
- network observation;
- downloads;
- screenshots/evidence;
- capability probes.

### Native Runtime

- filesystem;
- process/CLI;
- durable queue/checkpoint;
- scheduler;
- artifact registry;
- local logs/evidence.

### Orchestrator

- workflow graph;
- worker selection;
- retry/fallback;
- human gates;
- multi-day continuity.

---

## 11. Reach and regulation must remain separate dimensions

Every future capability/use case should receive two independent classifications.

### Axis A — Technical reach

- proven;
- likely;
- needs experiment;
- constrained;
- impossible under current architecture.

### Axis B — Boundary/regulation

- allowed;
- constrained;
- provider-policy uncertain;
- prohibited/high-risk;
- needs further study.

This avoids two mistakes:

1. treating policy uncertainty as technical impossibility;
2. treating technical possibility as automatic permission to deploy.

---

## 12. Repo evidence layer — pending

Later, inspect current GPT/Gemini/Google Flow/Bridge implementations only to answer:

> Which theoretical primitives above have already been proven by our code?

Evidence should include file path + function/module + measured behavior.

Repo evidence must **not** redefine the theoretical capability ceiling.

---

## 13. Next experiments

- **EXP-01:** CDP attach/lifecycle — current priority.
- **EXP-02:** Local file path → `DOM.setFileInputFiles` → controlled web input.
- **EXP-03:** Browser action → Network/Fetch event → DOM correlation.
- **EXP-04:** nested cross-origin frame/worker target registry.
- **EXP-05:** extension/browser restart recovery with durable local checkpoint.

---

## 14. Current conclusion

The likely ceiling is much higher than separate GPT/Gemini/Flow extensions suggest.

The strongest model currently is:

> **Extension/CDP is a browser actuator attached to a persistent local orchestrator, not merely an extension with a helper Bridge.**

Potential end-to-end workflow:

```text
observe browser
→ reason
→ act on authenticated web app
→ exchange data with local runtime
→ act on another app
→ persist checkpoint
→ resume later
```

The next architectural decision depends on EXP-01: whether CDP is reliable enough to become a standard shared runtime layer or should remain an escalation/fallback layer.

---

## Sources

Official Chrome/Chromium references:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/downloads
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/
- https://chromedevtools.github.io/devtools-protocol/tot/Input/
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

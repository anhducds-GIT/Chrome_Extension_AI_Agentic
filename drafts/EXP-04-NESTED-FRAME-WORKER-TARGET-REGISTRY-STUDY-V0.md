# EXP-04 — Nested Frame / Worker Target Registry Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. No production implementation. Provider policy/regulation remains a separate axis.

## 1. Research question

Can a Chrome Extension using `chrome.debugger` build a reusable registry that reliably answers:

```text
Which browser execution environment does this page element / frame / worker belong to?
Which debugger session must receive the next CDP command?
Which execution context is safe to evaluate inside?
How do we recover when frames navigate, swap process, detach, or workers restart?
```

The target is a provider-independent Browser Runtime primitive, not a GPT/Gemini/Flow-specific frame hack.

---

## 2. Core finding

**Yes, with a crucial architectural correction:** a robust runtime cannot model a tab as only a DOM tree or only a list of frames.

Chrome's debugging model is multi-layered:

```text
TAB / ROOT DEBUGGEE
    ↓
TARGET(S)
    ↓
DEBUGGER SESSION(S)
    ↓
FRAME(S)
    ↓
EXECUTION CONTEXT(S)
```

There is **not** a 1:1 mapping between these layers.

Chrome explicitly documents that:

- same-process iframes may share one target and appear as separate Runtime execution contexts;
- out-of-process iframes (OOPIFs) may become separate targets;
- workers can also be related targets;
- Chrome 125+ `chrome.debugger` supports flat child sessions via `sessionId`;
- `Target.setAutoAttach()` is not recursive, so nested OOPIF/worker trees require recursive configuration on newly attached child sessions.

Therefore the reusable primitive should be a **Target / Session / Frame / Context Registry**, not merely a frame registry.

**Technical reach:** LIKELY / strong documented basis; controlled micro-proof required before marking PROVEN.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

---

## 3. Primitive P1 — Root debugger session

The root control surface starts with:

```text
chrome.debugger.attach({tabId}, "0.1")
```

From Chrome 125+, `DebuggerSession` may additionally contain a child `sessionId`.

The practical routing key becomes:

```text
{ tabId, sessionId? }
```

where the root session has no child `sessionId`, and flat child targets are addressed by adding the child `sessionId` to `chrome.debugger.sendCommand()`.

This allows multiple child targets to be controlled without separately calling `chrome.debugger.attach()` for every OOPIF/worker target.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 4. Primitive P2 — Same-process frame discovery via Runtime execution contexts

Chrome explicitly states that same-process iframes may not receive unique targets.

Therefore `Target.attachedToTarget` alone cannot discover every frame execution environment.

Required primitive:

```text
Runtime.enable
→ Runtime.executionContextCreated
```

`Runtime.ExecutionContextDescription` provides:

- numeric `id`;
- `origin`;
- human-readable `name`;
- experimental system-unique `uniqueId`;
- embedder `auxData`, which commonly includes `frameId`, `isDefault`, and context type.

Important reliability finding:

`executionContextId` can be unsafe as a durable identity across process changes. CDP documents `uniqueContextId` as system-unique across processes and specifically useful to prevent accidental evaluation in the wrong context after cross-process navigation.

**Registry implication:**

```text
(frameId, sessionId)
    ↕
executionContextId
    + uniqueContextId when supported
```

Do not persist a numeric execution context ID as if it were stable browser-wide identity.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

---

## 5. Primitive P3 — OOPIF / worker discovery via Target auto-attach

Chrome's documented extension flow is:

```text
listen Target.attachedToTarget
→ Target.setAutoAttach({
     autoAttach: true,
     waitForDebuggerOnStart: false,
     flatten: true,
     filter: ...
   })
```

`Target.attachedToTarget` returns:

- child `sessionId`;
- `TargetInfo`;
- whether the new target is waiting for debugger.

`TargetInfo` can include:

- `targetId`;
- target `type`;
- URL;
- parent target ID;
- `parentFrameId` for iframe/worker targets;
- opener information.

This provides the core relationship needed to attach an OOPIF or worker back into the logical tab/frame graph.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 6. Critical limitation — auto-attach is not recursive

Chrome documents this directly.

For nested cross-origin frames:

```text
A
└── B
    └── C
```

Calling `Target.setAutoAttach()` only on A can attach B, but does not automatically configure B to discover C.

Therefore the runtime must recursively initialize every attached child target:

```text
Target.attachedToTarget(child)
→ register child session
→ enable required domains on child
→ call Target.setAutoAttach() on child session
→ discover grandchildren
```

This is a major failure mode for naive implementations:

> "AutoAttach is enabled on the root tab, therefore every nested frame/worker is covered."

That assumption is false.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 7. Primitive P4 — Frame tree and navigation lifecycle

`Page.getFrameTree()` returns the current frame hierarchy.

Relevant events include:

- `Page.frameAttached`;
- `Page.frameNavigated`;
- `Page.frameDetached`;
- `Page.frameSubtreeWillBeDetached`;
- `Page.navigatedWithinDocument`;
- `Page.frameStartedNavigating`.

A `Page.Frame` includes useful identity/state such as:

- `id`;
- `parentId`;
- `loaderId`;
- URL;
- security origin.

Important lifecycle detail:

`Page.frameDetached` can carry reason:

- `remove`;
- `swap`.

A `swap` is materially different from a semantic iframe deletion. It can occur when frame ownership/process representation changes.

**Registry implication:** do not immediately treat every detach event as permanent logical deletion. Track frame/target **generation** and reconcile against subsequent navigation/target/context events.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

---

## 8. Primitive P5 — Target lifecycle

The Target domain exposes:

- `targetCreated`;
- `targetInfoChanged`;
- `targetDestroyed`;
- `attachedToTarget`;
- `detachedFromTarget`;
- `targetCrashed`.

Workers and OOPIF targets may be short-lived. The registry must therefore be event-driven and disposable rather than assuming a static target inventory captured once at attach time.

Useful rule:

```text
Target is runtime state, not durable job state.
```

Authoritative job/checkpoint state should remain in the persistent local orchestrator.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 9. Target filters are powerful but easy to misconfigure

`Target.setAutoAttach()` accepts a `TargetFilter`.

CDP specifies that filter entries are evaluated sequentially; the **first matching entry wins**.

If no filter is provided, the protocol default includes everything except browser/tab target types.

This means a future runtime should centralize target-filter construction. Individual site adapters should not independently invent filters because ordering mistakes can silently exclude relevant iframes/workers.

Candidate V0 policy for controlled micro-proof:

```text
include iframe
include worker-related targets observed in the controlled fixture
exclude unrelated target classes only after measurement
```

Do not prematurely hardcode a target taxonomy from full CDP documentation.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 10. Important API-surface distinction — Chrome API target types vs CDP target types

`chrome.debugger.getTargets()` exposes Chrome Extension `TargetInfoType` as a simplified enum:

- `page`;
- `background_page`;
- `worker`;
- `other`.

By contrast, the CDP `Target.TargetInfo.type` field is a string and the debugger documentation explicitly discusses types such as `iframe` and `shared_worker`.

Therefore these two inventories should not be treated as identical schemas.

**Registry implication:** preserve the raw CDP `TargetInfo.type` received from Target-domain events rather than normalizing everything prematurely to the simpler extension API enum.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 11. Worker reach — documented but heterogeneous

Chrome explicitly describes workers as related debug targets and `Target.setAutoAttach()` as applying to directly related iframes or workers.

However workers are not one homogeneous lifecycle:

- dedicated workers may be children of a frame/worker;
- shared workers may outlive a single frame relationship;
- service worker targets have lifecycle/version behavior distinct from ordinary page workers.

`Target.TargetInfo.parentFrameId` is documented for iframe and worker targets; for nested workers it may reference the ancestor frame that created the first worker in the nested chain.

### Important extension boundary

Full CDP contains a `ServiceWorker` domain, but Chrome's current documented `chrome.debugger` allowed-domain list does **not** include `ServiceWorker`.

Therefore:

```text
worker target reach via allowed Target/Runtime/etc.
!=
full ServiceWorker-domain control
```

Do not infer full service-worker administration capability from the fact that a worker target can be discovered/attached.

Exact service-worker target behavior under `chrome.debugger` remains **NEEDS MICRO-PROOF**.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/

---

## 12. Identifier namespaces must remain separate

There are several independent IDs in play:

```text
Chrome Extension layer:
- tabId
- chrome.webNavigation frameId
- documentId

CDP layer:
- TargetID
- SessionID
- Page.FrameId
- Network.LoaderId
- Runtime.ExecutionContextId
- Runtime uniqueContextId
- DOM NodeId / BackendNodeId
```

A particularly dangerous failure mode is assuming a `chrome.webNavigation.frameId` is the same identifier as a CDP `Page.FrameId`.

Chrome's WebNavigation API defines its `frameId` as a numeric ID unique within a tab, while CDP defines `Page.FrameId` independently as a string protocol identifier.

They may describe the same conceptual frame but are **different identifier namespaces** and require explicit correlation if both APIs are used.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/webNavigation
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

---

## 13. Proposed registry V0

This is a study hypothesis, not locked architecture.

### Root record

```text
BrowserRuntimeTab
- tabId
- rootDebuggerState
- attachedAt
- generation
```

### Target/session record

```text
TargetSession
- tabId
- targetId
- sessionId?          // absent for root
- parentTargetId?
- targetType
- url
- parentFrameId?
- attached
- waitingForDebugger
- generation
- discoveredAt
- lastSeenAt
```

### Frame record

```text
FrameRecord
- sessionId?          // owning CDP session
- frameId             // CDP Page.FrameId
- parentFrameId?
- loaderId?
- url
- securityOrigin?
- lifecycleState
- generation
```

### Execution-context record

```text
ExecutionContextRecord
- sessionId?
- executionContextId
- uniqueContextId?
- frameId?
- origin
- name
- type?
- isDefault?
- generation
```

### Optional extension-navigation correlation

```text
NavigationRecord
- tabId
- webNavigationFrameId
- documentId
- parentDocumentId?
- url
- lifecycle
```

The key architecture property is that **relationships are explicit** instead of deriving execution ownership repeatedly from page selectors.

---

## 14. Registry reducer model

A shared reducer can consume browser events:

```text
Target.attachedToTarget
Target.detachedFromTarget
Target.targetInfoChanged
Target.targetDestroyed
Target.targetCrashed

Page.frameAttached
Page.frameNavigated
Page.frameDetached
Page.frameSubtreeWillBeDetached

Runtime.executionContextCreated
Runtime.executionContextDestroyed
Runtime.executionContextsCleared
```

and maintain a reconstructable current graph.

High-level state:

```text
DISCOVERED
→ ATTACHED
→ INITIALIZING
→ READY
→ NAVIGATING / SWAPPING
→ READY(new generation)
→ DETACHED / DESTROYED
```

The registry should be reconstructable after extension/runtime restart by reattaching and re-enumerating current targets/frame trees/contexts rather than trusting stale in-memory objects.

---

## 15. Race conditions / failure modes

### F1 — Root-only auto-attach

Root sees first OOPIF child but misses nested grandchildren because auto-attach was not recursively enabled.

### F2 — Context reuse / process navigation

A numeric `executionContextId` is retained after navigation and a later command executes in a different context than intended.

Mitigation candidate: invalidate contexts aggressively on lifecycle events and use `uniqueContextId` when supported.

### F3 — Frame detach interpreted as permanent deletion

`frameDetached(reason="swap")` is treated as iframe removal; later events cannot be reconciled cleanly.

### F4 — Worker disappears between discovery and command

Short-lived worker target detaches before the command is routed.

Mitigation: every command path must tolerate stale-session rejection and re-resolve current registry state.

### F5 — Target filter silently excludes needed target

Filter ordering or over-specific target types prevent relevant child targets from auto-attaching.

### F6 — Identifier collision across namespaces

Extension frame ID is used as CDP Page.FrameId or vice versa.

### F7 — Event ordering assumptions

Target/frame/context events from process swaps or navigation are assumed to arrive as one perfect global sequence.

Registry should reconcile state by identity/generation rather than depend on a single fragile ordering assumption.

### F8 — Domain initialization race

A newly attached child begins executing before Runtime/Page/Network listeners are enabled and early evidence is missed.

`waitForDebuggerOnStart=true` can reduce this race but changes execution timing and requires `Runtime.runIfWaitingForDebugger`; therefore it should be measured, not enabled blindly in production.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

---

## 16. Compound capabilities unlocked

### C1 — Reliable nested-frame interaction

```text
semantic element/frame discovery
→ registry resolves owning session/context
→ targeted DOM/Runtime/Input command
→ confirmation
```

This reduces the need for per-site assumptions that every actionable UI lives in the root frame.

### C2 — Cross-frame network attribution

EXP-03 can improve from:

```text
requestId + URL
```

to:

```text
root tab
+ child session
+ target
+ frame
+ loader/context
+ request lifecycle
```

This materially improves correlation when embedded apps/iframes produce their own network traffic.

### C3 — Worker-aware application observation

The runtime can observe attached worker targets and route allowed Runtime/Network/etc. commands per child session when useful.

This is not equivalent to unrestricted worker control, but it expands visibility beyond rendered DOM.

### C4 — Process-swap recovery

A page can move from same-process frame representation to OOPIF representation or vice versa without forcing the orchestrator to treat the entire job as failed.

The registry becomes the adaptation layer.

### C5 — Provider-independent execution routing

Site adapters ask for a semantic execution environment:

```text
"frame containing upload surface"
"context for result panel"
"worker/session producing this request"
```

The shared Browser Runtime resolves the actual CDP route.

---

## 17. EXP-04 controlled micro-proof design

Use only controlled local/test infrastructure.

### Fixture

Create a top page A with:

1. same-origin iframe S;
2. cross-origin iframe B;
3. nested cross-origin iframe C inside B;
4. dedicated worker from A;
5. dedicated worker from B if practical;
6. shared worker if supported by fixture;
7. optional service worker registration only for observation of target behavior.

Use separate loopback hostnames/ports or controlled HTTPS origins to force process/site isolation conditions where possible.

### Procedure

1. attach root debugger session;
2. enable Runtime + Page + Target on root;
3. snapshot `Page.getFrameTree()`;
4. record all `Runtime.executionContextCreated` events;
5. enable flat `Target.setAutoAttach()` on root;
6. on each child attach, record session/target metadata;
7. recursively enable Runtime/Page/Target + auto-attach on every eligible child session;
8. build registry graph;
9. execute one read-only Runtime probe in A, S, B and C and verify returned origin/frame marker;
10. create/terminate controlled workers and verify attach/detach lifecycle;
11. navigate B/C across origins to provoke process/context changes;
12. verify stale contexts are invalidated and new generation becomes READY;
13. remove an iframe and compare `remove` behavior;
14. provoke/process-observe a `swap` if reproducible;
15. crash/close a child target only if safely supported in test environment, otherwise skip destructive step;
16. detach/reattach root and reconstruct registry from current browser state;
17. compare reconstructed graph against fixture truth.

---

## 18. PASS criteria

EXP-04 passes only if all mandatory criteria hold:

1. same-process child frame is discoverable through Runtime context mapping;
2. first-level OOPIF is attached and correctly routed through child `sessionId`;
3. nested OOPIF is discovered only after recursive child auto-attach is configured, confirming documented behavior;
4. registry maps each tested frame to the correct target/session/context route;
5. read-only Runtime probe executes in A/S/B/C without cross-context leakage;
6. worker lifecycle can be registered and stale worker sessions removed safely;
7. navigation/process change does not cause command execution in a stale context;
8. detach/destroy events remove or version runtime records without destroying durable job state;
9. registry can be reconstructed after root detach/reattach;
10. no PASS result depends on provider-specific selectors.

### Stretch PASS

- verify `frameDetached(reason="swap")` handling;
- verify shared-worker relationship;
- characterize service-worker target visibility under `chrome.debugger` without assuming unavailable ServiceWorker-domain commands.

---

## 19. Evidence classification after research

### Documented / strong

- frames and workers can be debugger targets;
- same-process frames may share a target and use separate execution contexts;
- OOPIF can be separate targets;
- Chrome 125+ flat child sessions;
- recursive `Target.setAutoAttach()` requirement;
- Page frame lifecycle events;
- Runtime execution-context lifecycle;
- Target lifecycle events;
- target filtering;
- system-unique Runtime context identity option;
- ServiceWorker domain absent from current documented `chrome.debugger` allowed-domain list.

### Needs experiment

- exact target taxonomy surfaced by current Chrome build for dedicated/shared/service workers through extension `chrome.debugger`;
- timing/order characteristics during rapid nested navigation;
- practical reliability of `uniqueContextId` through `chrome.debugger` in installed Chrome version;
- service-worker target attach behavior with only allowed debugger domains;
- reproducibility of frame `swap` in controlled fixture;
- restart/rebuild latency for a nontrivial registry.

---

## 20. Architecture implication — still hypothesis, not lock

EXP-04 strengthens the emerging model:

```text
Site Adapter
    ↓ asks for semantic target
Shared Browser Runtime
    ├─ Target/Session registry
    ├─ Frame registry
    ├─ Execution-context registry
    ├─ Network correlation
    └─ lifecycle/recovery reducer
    ↓
chrome.debugger/CDP
```

The largest implication is that **cross-frame/worker complexity should be absorbed once in shared infrastructure**.

It should not be reimplemented separately inside GPT, Gemini, Flow, email, SaaS, or future adapters.

But Phase 1 does **not** yet justify locking a production architecture. EXP-04 micro-proof should first measure correctness and operational complexity.

---

## 21. Sources

Official Chrome / CDP references used in this study:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developer.chrome.com/docs/extensions/reference/api/webNavigation
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/
- https://chromedevtools.github.io/devtools-protocol/tot/ServiceWorker/

---

## 22. Current conclusion

A reliable Browser Runtime cannot use a single `frameId` or a single DOM tree as its execution map.

The most defensible model currently is:

```text
TAB
→ TARGET TREE
→ FLAT DEBUGGER SESSION TREE
→ FRAME TREE
→ EXECUTION CONTEXTS
```

with lifecycle events continuously reducing these into one reconstructable registry.

If the micro-proof passes, this registry becomes a strong candidate for a foundational primitive shared by EXP-03 network correlation, file upload, nested app interaction, and future multi-web-app orchestration.

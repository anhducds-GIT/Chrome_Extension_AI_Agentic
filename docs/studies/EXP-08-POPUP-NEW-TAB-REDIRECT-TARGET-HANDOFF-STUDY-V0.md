---
kind: study
status: active
ttl_days: 180
---

# EXP-08 — Popup / New Tab / Redirect / Target Handoff Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Controlled test pages only. Technical reach; no production implementation.

## 1. Question

Can the Browser Runtime preserve workflow identity when an action leaves the current document through a popup, new tab, redirect, SPA route change, or tab replacement?

Target flow:

```text
workflow action in tab A
→ browser creates/reuses context B
→ identify B and its relationship to A
→ follow navigation/document lifecycle
→ attach the correct actuator if needed
→ confirm semantic completion
→ checkpoint
```

## 2. Core finding

**Yes, with a strong distinction between browser topology and page actuation.**

```text
Topology plane
chrome.tabs + chrome.windows + chrome.webNavigation

Actuation plane
content script + chrome.debugger/CDP
```

Current Chromium page-level debugger sessions use `TargetHandler::kAutoAttachOnly`. Generic CDP `Target.getTargets`, `setDiscoverTargets`, `attachToTarget`, and `createTarget` are rejected in that mode, while `Target.setAutoAttach` remains available for directly-related targets.

Therefore arbitrary new tabs/popups should be discovered through Chrome extension APIs first, then independently attached with `chrome.debugger.attach({tabId})` when needed and permitted.

## 3. New-tab primitives

`chrome.tabs.onCreated` fires when a tab is created. Chrome notes that URL may not yet be populated, so `tabs.onUpdated` is required for later URL/status changes.

`tabs.Tab` exposes useful runtime metadata including:

- `id`
- `windowId`
- `openerTabId`
- `pendingUrl`
- `url`
- `status`

`openerTabId` gives an explicit relationship from child tab to opener, but Chrome documents that it is only present while the opener still exists. The runtime should therefore persist this edge immediately.

Source: https://developer.chrome.com/docs/extensions/reference/api/tabs

## 4. Popup-window primitives

`chrome.windows.onCreated` fires when a browser window is created. Chrome distinguishes window types including `normal` and `popup`.

A popup is therefore representable as normal browser topology:

```text
windowId
→ contained tabId
→ openerTabId where available
```

Window IDs are runtime handles unique within a browser session, not durable workflow identities.

Source: https://developer.chrome.com/docs/extensions/reference/api/windows

## 5. Pre-signal from the opener

CDP `Page.windowOpen` fires when a new window is going to be opened through mechanisms such as `window.open()`, link clicks, and form submission. It exposes requested URL, window name/features, and whether a user gesture existed.

Treat this as **intent evidence**, not proof that a new browsing context materialized.

Candidate correlation:

```text
ActionSpan
→ Page.windowOpen intent
→ tabs.onCreated actual tab
→ openerTabId match
→ navigation commit
→ HANDOFF_CONFIRMED
```

Source: https://chromedevtools.github.io/devtools-protocol/tot/Page/#event-windowOpen

## 6. Document identity and redirects

`chrome.webNavigation` exposes the successful navigation order:

```text
onBeforeNavigate
→ onCommitted
→ [onDOMContentLoaded]
→ onCompleted
```

Errors terminate through `onErrorOccurred`.

Since Chrome 106, navigation events expose `documentId`, a UUID identifying the loaded document. This is stronger than `frameId` alone because a frame can survive while its document changes.

Chrome also documents that cross-site redirects/process swaps may produce repeated provisional navigation sequences before the final commit.

Recommended runtime key after commit:

```text
{ browser_session_epoch, tabId, frameId, documentId }
```

Source: https://developer.chrome.com/docs/extensions/reference/api/webNavigation

## 7. Redirect classification

`webNavigation.onCommitted.transitionQualifiers` can include:

- `server_redirect`
- `client_redirect`
- `forward_back`
- `from_address_bar`

This classifies the navigation at browser level, but does not enumerate every HTTP hop. Exact request-level redirect chains remain an EXP-03 Network concern.

## 8. SPA and fragment transitions

A handoff may finish without a new document.

Chrome exposes:

- `onHistoryStateUpdated` for History API changes;
- `onReferenceFragmentUpdated` for hash/fragment changes.

Therefore `onCompleted` is not a universal completion oracle.

## 9. Tab replacement / prerender

Chrome documents that prerendered content may initially be inaccessible through the Tabs API. When it replaces a visible tab, Chrome can emit:

- `tabs.onReplaced(addedTabId, removedTabId)`
- `webNavigation.onTabReplaced`

This should be treated as runtime-handle migration rather than a new logical workflow.

## 10. Close and return

`tabs.onRemoved` fires when a tab closes and indicates whether its containing window is closing.

A child tab closing is not proof that its task succeeded. Completion still requires semantic confirmation in the relevant surviving context.

## 11. Browsing Context Registry hypothesis

```text
BrowsingContextNode {
  runtime_epoch,
  workflow_id,
  tab_id,
  window_id,
  opener_tab_id?,
  document_id?,
  url?,
  debugger_attached?,
  state
}
```

Useful edges:

```text
OPEN_INTENT
OPENED_BY
NAVIGATED_TO
REDIRECTED
SPA_TRANSITION
REPLACED_BY
CLOSED
RETURNED_TO
```

Durable checkpoints should persist semantic relationships, not stale debugger/session identifiers.

## 12. Main failure modes

1. URL is absent at `tabs.onCreated` — wait for update/navigation events.
2. Opener closes — capture `openerTabId` edge before it disappears.
3. Unrelated tab opens concurrently — do not correlate by timing alone.
4. `Page.windowOpen` fires but no new tab materializes — intent is not proof.
5. Redirect/process swap creates provisional event noise — checkpoint only after committed document identity is known.
6. SPA completion has no full navigation — observe History API/fragment events plus semantics.
7. BFCache restoration may omit `onDOMContentLoaded` — do not require it.
8. Prerender can replace tab handles — migrate logical context.
9. A tab may exist while debugger/content-script access is restricted — topology visibility and actuator reach are separate.
10. Child context can disappear before confirmation — mark uncertain outcome and reconcile rather than blindly replay.

## 13. Compound capabilities

### C1 — Multi-context browser workflow

```text
A opens B
→ B is identified by opener/topology evidence
→ B executes a bounded step
→ state returns to A
→ checkpoint
```

### C2 — Cross-site redirect handoff

```text
A
→ redirect chain
→ final committed document
→ semantic state confirmation
```

### C3 — Parallel workflow routing

Explicit opener/context graphs remove the unsafe assumption that the currently active tab belongs to the current job.

### C4 — Runtime-handle migration

Logical work can survive document navigation, process swap, tab replacement, and child-tab closure because durable identity sits above browser handles.

## 14. Controlled micro-proof

Use only controlled HTTPS/local test pages.

1. `window.open()` same-origin child: record `Page.windowOpen`, `tabs.onCreated`, `openerTabId`, commit, independent debugger attach, close.
2. Cross-origin child: repeat and record permission/attach behavior.
3. Popup browser window: verify `windows.onCreated`, window type, contained tab, close lifecycle.
4. Server redirect chain: correlate Network redirects with final `server_redirect` qualifier and final documentId.
5. Client redirect: verify `client_redirect` qualifier.
6. SPA transition: verify `onHistoryStateUpdated` without requiring full reload.
7. Fragment transition: verify `onReferenceFragmentUpdated`.
8. Opener closes early: verify runtime's persisted opener edge remains available after Chrome no longer exposes it.
9. Concurrent noise: create unrelated tab and prove correlation rejects timing-only match.
10. Child closes before confirmation: outcome becomes uncertain and requires reconciliation.
11. Reproduce tab replacement where practical and migrate logical context.
12. Enable `Target.setAutoAttach({flatten:true})` on opener and measure whether an arbitrary new tab appears as `Target.attachedToTarget`; do not assume that it will.

## 15. PASS criteria

EXP-08 passes when the controlled proof shows:

- new tabs/windows are correlated without active-tab assumptions;
- opener edges are captured before they can disappear;
- a discovered child tab can receive a separate root debugger attachment when allowed;
- redirect chains converge on the correct committed document;
- SPA/fragment transitions are observable;
- tab close alone is never treated as success;
- concurrent unrelated tabs are rejected;
- replacement events migrate logical context;
- uncertain outcomes reconcile instead of blind replay;
- no provider-specific selector is required.

## 16. Evidence status

**DOCUMENTED:** Tabs/window creation events, `openerTabId`, webNavigation lifecycle, `documentId`, redirect qualifiers, History API/fragment events, tab replacement events, `Page.windowOpen`, current `kAutoAttachOnly` restrictions.

**NEEDS MICRO-PROOF:** exact event ordering across popup variants; attach timing for newly-created cross-origin tabs; whether arbitrary new tabs ever appear under `Target.attachedToTarget`; concurrency correlation; reproducible prerender replacement.

## 17. Current conclusion

The stack can plausibly operate beyond a single attached page by combining:

```text
Browser Topology Graph
+ Navigation/Document Graph
+ per-context actuator
```

The strongest Phase-1 model is:

> **Chrome extension APIs discover arbitrary browser contexts; CDP is attached selectively to the context already identified.**

This avoids assuming browser-wide CDP authority that the extension debugger client does not have.

## Sources

- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/windows
- https://developer.chrome.com/docs/extensions/reference/api/webNavigation
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.cc

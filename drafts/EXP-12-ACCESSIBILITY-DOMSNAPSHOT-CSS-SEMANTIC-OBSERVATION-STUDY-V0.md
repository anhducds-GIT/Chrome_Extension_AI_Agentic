# EXP-12 — Accessibility + DOMSnapshot + CSS Semantic Observation Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Technical reach first. Controlled pages only. No production implementation.

---

## 1. Research question

Can the Browser Runtime understand page structure and UI state more reliably than selector-only automation by combining:

```text
live DOM
+ Accessibility tree
+ DOMSnapshot
+ CSS computed/matched state
```

The target is a reusable **Semantic Observation Layer** for discovery, state detection, adapter generation and evidence collection.

---

## 2. Core finding

**Yes, but only as a fused model. No single tree is authoritative for all browser semantics.**

Recommended observation stack:

```text
Live DOM
  → current nodes + mutations + action anchors

Accessibility
  → computed role/name/state/focus/widget semantics

DOMSnapshot
  → point-in-time flattened structure + layout + selected computed styles

CSS
  → computed/matched style evidence for visibility/layout/disabled-looking state

Network / app semantics
  → backend state where UI alone is ambiguous
```

This materially raises reliability for a Seed / Discovery Runtime because it can reason over **what the browser believes an element means**, not only how the HTML happens to be structured.

**Technical reach:** LIKELY / strong documented basis. Controlled micro-proof required before PROVEN.

---

## 3. Exposure through `chrome.debugger`

Chrome currently lists all three relevant CDP domains in the `chrome.debugger` allow-list:

- `Accessibility`
- `DOMSnapshot`
- `CSS`

Important status context:

- `Accessibility` domain: Experimental
- `DOMSnapshot` domain: Experimental
- `CSS` domain: Experimental

Therefore they are reachable candidates, but adapters must not assume permanent protocol stability without capability/version checks.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- https://chromedevtools.github.io/devtools-protocol/tot/CSS/

---

## 4. Primitive P1 — Accessibility semantics

The Accessibility domain exposes the browser's accessibility tree and computed accessibility semantics.

Useful data includes:

- role;
- accessible name;
- description;
- value / value text;
- focusability/focus state;
- checked/selected/expanded/disabled-related widget states;
- parent/child accessibility relationships;
- frame association;
- `backendDOMNodeId` mapping back toward DOM identity.

`Accessibility.queryAXTree` can query by computed `accessibleName` and/or `role`.

This enables a stronger lookup primitive than brittle selectors:

```text
find role=button, name="Generate"
→ map AX node → backend DOM node
→ validate CSS/layout/live DOM
→ act
```

This is useful for websites whose DOM classes/hash IDs churn but whose human-facing control names remain stable.

### Important limitation

The accessibility tree is a **derived semantic tree**, not the page itself. Chrome explicitly describes it as a derivative/subset of the DOM intended for assistive technology. Nodes with no semantic accessibility value may be ignored or simplified.

Therefore:

```text
AX missing node != DOM node does not exist
AX says button != automatically actionable/safe
```

Source:
- https://developer.chrome.com/blog/full-accessibility-tree
- https://developer.chrome.com/docs/devtools/accessibility/reference

### Performance caveat

`Accessibility.enable()` makes AX node IDs consistent between calls but Chrome documents that enabling accessibility can impact page performance until disabled.

Therefore full-time AX observation should be benchmarked rather than assumed free.

---

## 5. Primitive P2 — DOMSnapshot as structural evidence

`DOMSnapshot.captureSnapshot` returns a point-in-time flattened representation containing:

- full DOM tree for the captured document set;
- iframe/template/imported-document structure represented by the protocol;
- flattened shadow DOM;
- layout tree;
- selected computed styles;
- optional paint order;
- optional DOM rectangles;
- form values/check/selection state;
- `backendNodeId` references.

This is particularly useful for **discovery/evidence**, because one capture can preserve more structural context than walking selectors piecemeal.

Potential use:

```text
capture snapshot
→ normalize semantic candidates
→ derive controls/forms/editors/regions
→ compare later snapshot
→ detect structural drift
```

### Limitation

DOMSnapshot is a **snapshot, not a live subscription**. It does not replace MutationObserver/live DOM events.

Large pages may produce large payloads; practical size/latency is an evidence gap.

Cross-process OOPIF coverage must be verified against the EXP-04 session registry model. Because OOPIFs can be separate debugger targets, the safe architectural assumption is:

```text
capture per relevant debugger session
→ merge by frame/target registry
```

until micro-proof demonstrates broader capture behavior.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

---

## 6. Primitive P3 — CSS state and layout semantics

The CSS domain can expose:

- computed style for a node;
- matched rules;
- inline style;
- stylesheet metadata;
- background-color information;
- pseudo-state and media-query context.

This helps answer questions selectors cannot answer reliably:

```text
Does the element exist but display:none?
Is visibility:hidden?
Is pointer-events:none?
Is it covered/repositioned by responsive CSS?
Which rule made this state occur?
```

However CSS evidence is not a universal `isInteractable` oracle. A control may be visible but blocked by another element, disabled in app logic, inert through JS, or semantically unavailable for another reason.

Therefore computed CSS should be one signal inside a state classifier.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/CSS/

---

## 7. Cross-layer identity anchor

A useful common anchor is `DOM.BackendNodeId`.

Accessibility AX nodes can expose `backendDOMNodeId`, while DOMSnapshot nodes expose `backendNodeId`. DOM methods can resolve/describe backend nodes.

This suggests a provider-independent correlation object:

```text
SemanticNode
{
  target/session/frame,
  backendNodeId,
  dom facts,
  ax facts,
  layout facts,
  css facts,
  confidence,
  observed_at
}
```

This should be treated as reconstructable runtime evidence, not a durable identity across arbitrary navigations/re-renders.

---

## 8. Compound capability — Semantic Candidate Discovery

Potential discovery flow:

```text
DOMSnapshot
→ enumerate structural candidates
→ Accessibility enrich role/name/state
→ CSS enrich visibility/layout
→ live DOM confirms current existence
→ Network/page state adds workflow context
→ candidate ranked by confidence
```

Examples:

- `button + accessible name Generate + visible + enabled`
- `textbox + accessible name Prompt + editable`
- `dialog + heading + close button`
- `progressbar/busy region + correlated request still streaming`
- upload input visually hidden but semantically associated with an upload control

This could make Seed Extension discovery materially more robust than scanning tags/classes/selectors alone.

---

## 9. Failure modes / blind spots

### F1 — Accessibility semantics can be wrong

Poorly authored sites may have missing or incorrect ARIA/name/role metadata.

**Rule:** AX evidence raises confidence; it does not automatically override DOM/app evidence.

### F2 — Accessibility can intentionally omit presentation-only nodes

A visual element needed for automation may not be meaningful in AX.

### F3 — Snapshot staleness

DOMSnapshot can become stale immediately on highly dynamic SPAs.

### F4 — CSS false confidence

Visible-looking computed styles do not prove clickability or successful action.

### F5 — React/SPA node replacement

`backendNodeId`/DOM handles are runtime handles; adapter must reconcile after navigation/rerender.

### F6 — Cross-target frame fragmentation

OOPIFs may require capture/query on child debugger sessions and merge through the registry.

### F7 — Debugger cost

These primitives sit behind `chrome.debugger`, so they inherit permission/infobar/DevTools conflict costs. They are not automatically the correct always-on path for production.

---

## 10. Architecture hypothesis

Do **not** replace content scripts with CDP semantic observation.

A more maintainable hierarchy is:

```text
NORMAL MODE
content script semantics
+ DOM/MutationObserver
+ optional webRequest

DISCOVERY / DIAGNOSTIC POWER MODE
Accessibility
+ DOMSnapshot
+ CSS
+ deeper Runtime/Network evidence
```

This makes these high-cost/experimental domains particularly valuable for:

- Seed Extension discovery;
- adapter creation;
- adapter repair after site drift;
- diagnostics;
- evidence capture;

while generated runtime adapters can still use simpler/stabler primitives when possible.

---

## 11. Micro-proof design

Use one controlled test application containing:

1. normal `<button>` with stable accessible name;
2. hashed/changing CSS class;
3. `div role="button"`;
4. visually hidden control;
5. `display:none` control;
6. `pointer-events:none` control;
7. disabled/inert control;
8. modal/dialog with focus change;
9. open shadow DOM widget;
10. same-origin iframe;
11. cross-origin OOPIF candidate;
12. dynamic SPA rerender replacing nodes.

Measure:

- DOM selector discovery;
- AX role/name/state;
- AX ↔ backend node correlation;
- DOMSnapshot structure/layout/style;
- CSS computed visibility signals;
- payload size and capture latency;
- behavior across rerender/navigation/frame boundaries.

### PASS criteria

- runtime can map AX candidate to the correct live DOM element;
- semantic candidate survives CSS-class churn;
- hidden/disabled examples are not misclassified from one signal alone;
- snapshot can be merged with live state without treating it as authoritative after mutation;
- OOPIF behavior is explicitly measured, not inferred;
- payload/latency are bounded enough for discovery-mode use;
- proof produces no destructive side effects.

---

## 12. Current classification

```text
Accessibility semantic observation: LIKELY
DOMSnapshot structural evidence:   LIKELY
CSS semantic enrichment:           LIKELY
Fused Semantic Observation Layer:  NEEDS MICRO-PROOF
Repo implementation:               NOT YET IMPLEMENTED / evidence pending
```

---

## 13. Decision unlocked

If micro-proof passes, Seed/Discovery Runtime should not ask only:

> "What selectors exist?"

It can ask:

> "What interactive/semantic objects does Chrome expose, what state are they visually and semantically in, and how confidently can they be correlated to live DOM/network behavior?"

That is a materially stronger basis for automated Site Capability Profiles and adapter generation.

---

## Sources

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- https://chromedevtools.github.io/devtools-protocol/tot/CSS/
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/
- https://developer.chrome.com/blog/full-accessibility-tree
- https://developer.chrome.com/docs/devtools/accessibility/reference

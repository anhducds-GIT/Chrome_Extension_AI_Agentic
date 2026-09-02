---
kind: study
status: active
ttl_days: 180
---

# EXP-13 — Evidence Capture Runtime Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Controlled pages and evidence design only. No production implementation.

---

## 1. Research question

Can the Browser Runtime produce an evidence package strong enough that an AI or human can later audit what browser state existed before/after an action without needing the original live tab?

Target flow:

```text
browser/page state
→ capture evidence
→ immutable artifacts
→ local registry/checkpoint
→ later audit
```

The important distinction is between **a visual record** and **an auditable state record**.

---

## 2. Core finding

**Yes, but a screenshot alone is not sufficient. The useful primitive is a multimodal Evidence Bundle with normalized provenance.**

Recommended conceptual bundle:

```text
EVIDENCE_BUNDLE
├─ manifest
│  ├─ evidence_id
│  ├─ action_span_id / workflow_id
│  ├─ wall_clock + monotonic capture time
│  ├─ browser/version + capture method/version
│  ├─ tab / target / session / frame / document identity
│  ├─ URL / final URL / title / navigation identity
│  └─ artifact hashes + sizes
├─ visual
│  ├─ viewport screenshot
│  └─ optional region/full-page capture
├─ structure
│  └─ DOMSnapshot or normalized semantic-node snapshot
├─ semantics
│  └─ selected Accessibility state / DOM facts / CSS facts
├─ optional archive
│  ├─ MHTML
│  └─ PDF
├─ correlation
│  └─ relevant ActionSpan / network / DOM completion evidence
└─ privacy metadata
   └─ sensitivity / redaction / retention flags
```

No single representation is authoritative:

- screenshot answers **what pixels were rendered**;
- DOM/AX/CSS answer **what browser/page semantics existed**;
- MHTML answers **what could be serialized as an archive**;
- PDF answers **what the page prints as**;
- ActionSpan/network evidence answers **why that state is associated with this action**.

**Technical Reach:** LIKELY / strongly documented. Controlled micro-proof required before PROVEN.

---

## 3. Primitive map

### P1 — `chrome.tabs.captureVisibleTab()`

Chrome exposes `tabs.captureVisibleTab()` to extension service workers/pages.

Documented properties:

- captures the **visible area of the currently active tab** in the chosen window;
- requires `<all_urls>` or temporary `activeTab` access;
- with `activeTab`, it can capture some otherwise restricted/sensitive surfaces;
- file URLs additionally require file access;
- Chrome documents a maximum rate of **2 calls/second** because capture is expensive.

This is useful for **Normal Mode visual evidence** because it does not require `debugger`.

Limitations:

```text
visible active tab only
!=
full document / arbitrary background tab / semantic state
```

It also has unusually high privacy reach; the ability to capture sensitive visible surfaces must not be confused with permission to persist them indefinitely.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/tabs

### P2 — `Page.captureScreenshot`

The `Page` domain is on the `chrome.debugger` allow-list, and `Page.captureScreenshot` is a stable CDP command.

It supports:

- PNG / JPEG / WebP;
- quality for JPEG;
- region capture using `clip`;
- surface capture;
- base64 output.

Two relevant options are **Experimental**:

- `captureBeyondViewport`;
- `optimizeForSpeed`.

Therefore the robust baseline should not assume experimental full-page capture is always available. A full-document evidence strategy may need one of:

```text
capability-probed captureBeyondViewport
or
controlled scroll + tiled captures + stitch
or
supplementary structural snapshot instead of pretending one image is complete
```

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

### P3 — `Page.captureSnapshot` → MHTML

`Page.captureSnapshot` is **Experimental**.

For MHTML serialization, CDP documents inclusion of:

- iframes;
- shadow DOM;
- external resources;
- element-inline styles.

This makes MHTML potentially valuable as an immutable archive artifact, but it must not be modeled as a perfect replay of the running application.

It does not prove preservation of:

- server-side state;
- worker memory;
- open network streams;
- every transient JavaScript object;
- exact visual animation/timing state.

Therefore:

```text
MHTML = archive evidence
not
live-session checkpoint
```

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

### P4 — `Page.printToPDF`

`Page.printToPDF` is a stable command.

It can produce a complete printable document, with page ranges, background graphics, headers/footers, scale and page geometry.

Important status detail:

- the command itself is stable;
- `transferMode` / stream return is experimental on the current protocol surface.

A PDF is useful for human-readable records, but CSS print media and pagination can differ materially from the browser viewport. It should be labeled **PRINT REPRESENTATION**, not screenshot-equivalent evidence.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

### P5 — DOMSnapshot structural evidence

`DOMSnapshot.captureSnapshot` belongs to an **Experimental domain** but offers a high-value structural representation:

- full root document DOM in flattened arrays;
- iframe/template content represented by the protocol;
- flattened shadow DOM;
- layout data;
- selected computed styles;
- optional paint order;
- optional DOM rectangles;
- frame IDs and backend node IDs.

This gives a machine-auditable companion to pixels:

```text
screenshot says: button appears here
DOMSnapshot says: this node/frame/layout/style existed
AX says: browser exposed it as role=button/name=Generate
```

OOPIF/session behavior still needs controlled verification against the EXP-04 registry. Safe assumption until proven otherwise:

```text
capture relevant attached sessions
→ merge using target/session/frame registry
```

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/

### P6 — Accessibility semantic evidence

Selected Accessibility nodes can preserve computed role/name/value/state that raw markup may not express directly.

This is especially valuable around an action target or terminal state, but full AX enablement can affect page performance and should not automatically remain enabled throughout every workflow.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/

### P7 — Overlay / highlight geometry

The `Overlay` domain is **Experimental** and can highlight nodes, quads and rectangles.

Useful evidence use:

```text
semantic target
→ backendNodeId / geometry
→ highlight metadata
→ human-visible target explanation
```

However two cautions matter:

1. `Overlay.highlightRect` currently documents a DPR handling issue;
2. this study does **not** assume that a CDP screenshot necessarily rasterizes the DevTools overlay exactly as seen on-screen.

Therefore the durable evidence should preserve the underlying node/quad/rect metadata even if a highlighted screenshot is also generated.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Overlay/

---

## 4. Evidence timing and action correlation

A reliable evidence capture should be tied to the existing ActionSpan model:

```text
PRE_ACTION evidence
→ action dispatch
→ backend / DOM transition
→ POST_ACTION evidence
→ semantic terminal confirmation
→ checkpoint
```

Recommended minimum identity fields:

```text
workflow_id
job_id
action_span_id
evidence_id
capture_phase = PRE | POST | FAILURE | RECOVERY
tab_id
target_id?
session_id?
frame_id
document_id?
url
wall_clock_time
monotonic_time
```

Tab/session IDs remain runtime handles, not durable identity by themselves. The bundle must retain semantic URL/document/action context as well.

---

## 5. Hashing and immutability

Evidence should become immutable only after capture is complete.

Suggested sequence:

```text
capture bytes / normalized JSON
→ local verify
→ size
→ SHA-256
→ write evidence manifest
→ hash manifest
→ register checkpoint
```

Do not hash a mutable path and later assume the file at that path is still the same artifact.

This composes naturally with EXP-06 Artifact Registry and EXP-05 durable checkpoint concepts.

---

## 6. Technical limitations

### L1 — Pixels do not prove semantics

A screenshot cannot reliably prove:

- the underlying DOM target;
- accessible role/name;
- hidden state outside viewport;
- network/server success;
- whether two visually identical elements are the same logical node.

### L2 — Structural snapshots do not prove pixels

DOMSnapshot/AX/CSS can describe browser state but are not visual renderings. Canvas/WebGL/video and rasterized content may require visual evidence.

### L3 — Full-page is not a universal stable primitive

`Page.captureScreenshot` is stable, but `captureBeyondViewport` is experimental. A platform should capability-probe instead of silently relying on it.

### L4 — PDF is print-mode evidence

Print styles, pagination and omitted interactive state can differ from what the user saw.

### L5 — MHTML is experimental and not a live runtime image

MHTML serialization may be highly useful for forensic context while still failing to preserve ephemeral application state.

### L6 — multi-target/OOPIF merge is not yet proven

EXP-04 gives the registry needed to collect per-session evidence. Exact one-call coverage for every process-separated subtree remains micro-proof territory.

### L7 — evidence can itself be sensitive data

Screenshots, DOM text, form values, URLs, accessible names and network summaries may contain credentials, personal data, private documents or provider content.

Technical ability to capture is separate from retention, sharing and policy permission.

---

## 7. Failure modes

| Failure | Meaning | Handling |
|---|---|---|
| `TAB_NOT_ACTIVE` | `captureVisibleTab` would capture a different surface | activate explicitly or use per-tab CDP capture |
| `VISUAL_PARTIAL` | viewport image does not cover full state | mark partial; supplement structure/tiled capture |
| `CAPTURE_RATE_LIMIT` | visible-tab capture exceeds documented rate | throttle |
| `SESSION_DETACHED` | debugger evidence plane lost | record failure and reconcile before retry |
| `FRAME_EVIDENCE_INCOMPLETE` | child/OOPIF capture missing | merge registry sessions / mark incomplete |
| `MHTML_UNSUPPORTED` | experimental command unavailable/fails | keep screenshot + semantic snapshot |
| `PDF_REPRESENTATION_DIFFERS` | print result differs from viewport | label representation, never substitute silently |
| `HASH_MISMATCH` | artifact changed/corrupted | reject evidence bundle |
| `PRIVACY_GATE` | evidence contains sensitive classes | redact / retain locally / require explicit policy |
| `UNKNOWN_CAPTURE_OUTCOME` | crash between artifact write and registration | reconcile filesystem/artifact registry before replay |

---

## 8. Compound capability — Auditable Evidence Bundle

Composition:

```text
ActionSpan
+ Browser Context Graph
+ screenshot
+ Semantic Observation Layer
+ optional MHTML/PDF
+ Artifact Registry
+ durable hash manifest
→ AUDITABLE_EVIDENCE_BUNDLE
```

Potential downstream uses:

- human audit after unattended execution;
- AI diagnosis of selector/state failures;
- adapter drift comparison;
- before/after regression evidence;
- recovery reconciliation after crash;
- training/discovery evidence for a Seed Runtime.

Status: **LIKELY**, not yet PROVEN end-to-end.

---

## 9. Controlled micro-proof design

Build one local controlled page containing:

- regular DOM controls;
- open shadow DOM;
- iframe and controlled cross-origin iframe/OOPIF candidate;
- scrollable content beyond viewport;
- canvas element;
- form input with a test value;
- CSS print rule that visibly differs from screen style.

Run:

1. record ActionSpan/context identity;
2. capture `tabs.captureVisibleTab`;
3. capture `Page.captureScreenshot` viewport;
4. probe `captureBeyondViewport` and record support/status;
5. capture DOMSnapshot with selected styles and rectangles;
6. capture selected AX nodes for known controls;
7. capture MHTML;
8. print PDF;
9. calculate local SHA-256 for every artifact;
10. construct manifest;
11. mutate the controlled page;
12. capture POST bundle;
13. close/restart browser and verify the bundle can still be independently inspected from disk.

Optional overlay sub-proof:

```text
highlight known backendNodeId
→ screenshot
→ verify whether overlay pixels are present
→ always persist geometry separately
```

---

## 10. PASS criteria

PASS requires all of the following:

1. PRE and POST bundles are distinguishable and correctly tied to one ActionSpan.
2. At least one visual artifact and one semantic/structural artifact are captured.
3. Every persisted artifact has size + SHA-256 + capture timestamp + method.
4. A known action target can be correlated between visual geometry and backend DOM/AX identity.
5. Cross-frame evidence gaps are explicitly detected rather than silently ignored.
6. Full-page support is capability-probed; unsupported experimental behavior does not break baseline evidence.
7. PDF is labeled print representation and MHTML labeled archive representation.
8. A post-restart audit can validate file hashes without the original live page.
9. The proof demonstrates a privacy/redaction decision point before evidence leaves the local trust boundary.

---

## 11. Technical Reach classification

| Capability | Reach |
|---|---|
| active visible-tab screenshot without debugger | **DOCUMENTED / REACHABLE** |
| per-page CDP screenshot | **DOCUMENTED / REACHABLE** |
| beyond-viewport capture | **EXPERIMENTAL / NEEDS PROBE** |
| MHTML archive | **EXPERIMENTAL / NEEDS PROBE** |
| PDF print representation | **DOCUMENTED / REACHABLE** |
| DOMSnapshot structural evidence | **EXPERIMENTAL DOMAIN / NEEDS PROBE** |
| AX semantic evidence | **EXPERIMENTAL DOMAIN / NEEDS PROBE** |
| Overlay target annotation | **EXPERIMENTAL DOMAIN / NEEDS PROBE** |
| immutable multi-artifact Evidence Bundle | **LIKELY / MICRO-PROOF REQUIRED** |
| durable local hash verification | **LIKELY; composes with local Artifact Registry** |

**Repo implementation:** NOT YET IMPLEMENTED as a unified Evidence Bundle.

---

## 12. Remaining evidence gaps

- E13-G1: Does `Page.captureScreenshot` include an active DevTools Overlay highlight in the returned bitmap on current Chrome?
- E13-G2: Practical payload/latency of DOMSnapshot on large SaaS pages.
- E13-G3: Exact OOPIF coverage per root/child debugger session.
- E13-G4: Reliability of experimental `captureBeyondViewport` across fixed/sticky/virtualized layouts.
- E13-G5: Which evidence classes should be redacted or excluded by default — boundary/policy study, not a technical reach question.

None blocks Phase-1 synthesis; they belong in the controlled micro-proof backlog.

---

## 13. Official sources

- Chrome Tabs API: https://developer.chrome.com/docs/extensions/reference/api/tabs
- Chrome Debugger API: https://developer.chrome.com/docs/extensions/reference/api/debugger
- CDP Page: https://chromedevtools.github.io/devtools-protocol/tot/Page/
- CDP DOMSnapshot: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- CDP Accessibility: https://chromedevtools.github.io/devtools-protocol/tot/Accessibility/
- CDP Overlay: https://chromedevtools.github.io/devtools-protocol/tot/Overlay/
- CDP DOM: https://chromedevtools.github.io/devtools-protocol/tot/DOM/

---

## Phase-1 conclusion

The correct abstraction is not `takeScreenshot()`.

It is:

```text
Evidence Capture Runtime
→ normalized multimodal Evidence Bundle
→ immutable Artifact Registry entry
→ durable checkpoint / later audit
```

This closes the conceptual evidence-capture gap strongly enough for Phase-1 synthesis, while leaving performance, OOPIF coverage and privacy defaults to controlled micro-proofs and the separate regulation axis.

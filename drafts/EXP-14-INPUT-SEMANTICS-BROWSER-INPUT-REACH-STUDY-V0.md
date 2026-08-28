# EXP-14 — Input Semantics / Browser Input Reach Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Controlled local test pages only. No provider-specific automation.

---

## 1. Research question

How does browser-routed CDP input differ from page-JavaScript input, and specifically can `Input.dispatchMouseEvent` / `Input.dispatchKeyEvent` create DOM events with `event.isTrusted === true`?

Target comparison:

```text
JS EventTarget.dispatchEvent()
vs
HTMLElement.click()
vs
CDP Input.*
vs
real physical user input
```

The larger question is whether a Browser Runtime can use a browser-level input plane for controls that do not respond correctly to DOM mutation/click primitives.

---

## 2. Core finding

**CDP Input is materially closer to the browser input pipeline than JavaScript `dispatchEvent()`, but G3 should remain `LIKELY / SOURCE-SUPPORTED` until a live controlled test directly records `isTrusted` and user-activation state.**

Current source chain:

```text
Input.dispatchMouseEvent / dispatchKeyEvent
→ Chromium creates WebInputEvent/WebMouseEvent/NativeWebKeyboardEvent
→ RenderWidgetHost input routing
→ browser/renderer event pipeline
→ DOM event dispatch
```

Current Chromium `input_handler.cc` explicitly forwards DevTools mouse/keyboard events through `RenderWidgetHost` and focuses the widget before injection. Blink's internal event dispatch path marks browser-dispatched events trusted, while JavaScript-originated `dispatchEvent()` marks them untrusted.

That is strong evidence that CDP Input should yield trusted DOM events, but no current primary source located in this study contains the exact assertion:

```text
Input.dispatchMouseEvent -> page listener sees event.isTrusted === true
```

Therefore **do not promote this to PROVEN without the micro-proof**.

Also:

```text
isTrusted == true
is NOT the same claim as
all user-activation-gated APIs are available
```

HTML user activation has its own state machine and should be measured separately.

---

## 3. Primitive map and protocol status

The `Input` domain is on the `chrome.debugger` allow-list.

Current tip-of-tree CDP status:

### Stable methods

- `Input.cancelDragging`
- `Input.dispatchKeyEvent`
- `Input.dispatchMouseEvent`
- `Input.dispatchTouchEvent`
- `Input.setIgnoreInputEvents`

### Experimental methods

- `Input.dispatchDragEvent`
- `Input.emulateTouchFromMouseEvent`
- `Input.imeSetComposition`
- `Input.insertText`
- `Input.setInterceptDrags`
- `Input.synthesizePinchGesture`
- `Input.synthesizeScrollGesture`
- `Input.synthesizeTapGesture`

Important: a stable method can still contain individual experimental parameters. Capability metadata must therefore be recorded at method/parameter level where relevant.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/

---

## 4. P1 — JavaScript `dispatchEvent()`

A page can construct an event and call:

```js
element.dispatchEvent(new MouseEvent(...))
```

Blink's JavaScript-facing event dispatch path explicitly marks this event **untrusted** before dispatch.

This is a hard semantic distinction:

```text
JS dispatchEvent
→ page event system directly
→ isTrusted = false
```

It is useful for simple application listeners but should not be called equivalent to browser input.

Sources:
- https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
- Chromium Blink EventTarget implementation

---

## 5. P2 — `HTMLElement.click()`

`HTMLElement.click()` is also not equivalent to a physical click.

Current MDN documentation explicitly identifies the click event fired through `HTMLElement.click()` as `isTrusted === false`.

It may still execute activation behavior and application handlers, so it remains a cheap first-tier primitive, but provider/site code can distinguish it from trusted browser-routed events.

Source:
- https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted

---

## 6. P3 — CDP mouse input

`Input.dispatchMouseEvent` is stable and supports:

- `mousePressed`
- `mouseReleased`
- `mouseMoved`
- `mouseWheel`
- button/buttons state
- click count
- modifiers
- pointer type
- coordinates relative to the **main frame viewport in CSS pixels**.

Current Chromium implementation creates browser WebMouseEvents and forwards them through the `RenderWidgetHost` input pipeline. Modern code resolves the target widget at the event coordinate, which is important for process-separated frame routing.

This is categorically different from executing `element.click()` inside the page.

Potential strength:

```text
semantic target
→ layout/box geometry
→ coordinate
→ CDP mouse press/release
→ browser hit testing/input routing
```

Potential weakness:

- stale geometry;
- scroll/layout changes between measurement and dispatch;
- overlays covering the intended node;
- zoom/DPR/visual viewport complexity;
- nested/OOPIF routing edge cases;
- app changing between press and release.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/
- https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/devtools/protocol/input_handler.cc

---

## 7. P4 — CDP keyboard input

`Input.dispatchKeyEvent` is stable.

It exposes browser-level key event fields including:

- keyDown / rawKeyDown / keyUp / char;
- key / code;
- text and unmodified text;
- modifiers;
- virtual/native key codes;
- repeat/keypad/system-key information.

Chromium routes the resulting native web keyboard event through the focused `RenderWidgetHost`; the DevTools input path explicitly focuses the widget before forwarding.

This is useful where a site depends on real keydown/input/change ordering rather than direct `.value = ...` assignment.

However key dispatch is not a universal text-entry primitive:

- keyboard layout matters;
- IME/composition differs;
- rich editors may maintain their own model;
- shortcut interception can alter results.

---

## 8. P5 — text insertion and IME

`Input.insertText` and `Input.imeSetComposition` are **Experimental**.

`insertText` is specifically for insertion that does not originate from a key press, such as IME/emoji-like text input.

This makes the input stack naturally tiered:

```text
simple value/DOM input
→ stable key events
→ experimental direct text/IME primitives when required
```

A future adapter should record which tier it relies on instead of treating all text fields alike.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/

---

## 9. P6 — touch and pointer semantics

`Input.dispatchTouchEvent` is stable.

The protocol accepts active touch points and emits touch sequences. Mouse dispatch also carries a pointer-type parameter, while several advanced pen fields/gesture helpers remain experimental.

Therefore touch-native web controls are technically reachable, but should have their own proof rather than assuming mouse equivalence.

---

## 10. P7 — drag/drop

This is the important correction to earlier optimistic upload/drag assumptions:

- `Input.dispatchDragEvent` — **Experimental**;
- `Input.setInterceptDrags` — **Experimental**;
- `Input.dragIntercepted` — **Experimental**.

The protocol's `DragData` can contain files, which makes drag/drop upload technically interesting, but it remains an experimental route and must not be the default durable architecture without proof.

This preserves EXP-02 Path C as `NEEDS EXPERIMENT`, not stable baseline.

---

## 11. G3 — what can be concluded about `isTrusted` now?

### Proven facts

1. JavaScript `EventTarget.dispatchEvent()` produces untrusted events.
2. `HTMLElement.click()` produces an untrusted click event.
3. CDP Input does not call page `dispatchEvent()`; Chromium creates browser WebInputEvents and routes them through `RenderWidgetHost`.
4. Blink internal/native event-dispatch paths set trusted state for browser-originated events.

### Strong inference

The implementation chain strongly predicts:

```text
CDP Input.dispatchMouseEvent
→ event.isTrusted === true
```

### What is not yet measured

No live controlled result has yet been captured in this project showing the listener output from the current Chrome build.

Therefore G3 classification is:

**LIKELY / SOURCE-SUPPORTED — MICRO-PROOF REQUIRED**.

This is deliberately stricter than calling it PROVEN from source-chain inference alone.

---

## 12. `isTrusted` versus user activation

HTML defines an activation-triggering input event as a trusted event of specific types such as eligible `keydown`, `mousedown`, pointer/touch events.

`navigator.userActivation` exposes:

- `isActive` — transient activation;
- `hasBeenActive` — sticky activation.

However this study does not assume that DevTools-injected trusted input necessarily behaves identically to physical-user input for every activation-gated browser API.

The controlled proof must log both:

```text
event.isTrusted
navigator.userActivation.isActive
navigator.userActivation.hasBeenActive
```

and, optionally, attempt one harmless activation-gated test action.

Sources:
- https://html.spec.whatwg.org/multipage/interaction.html
- https://developer.mozilla.org/en-US/docs/Web/API/UserActivation
- https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/User_activation

---

## 13. Focus semantics

Current Chromium DevTools input code calls `Focus()` on the target widget before forwarding mouse/keyboard input.

That improves browser-level fidelity relative to pure page mutation, but several distinct focus concepts still exist:

```text
browser window focus
tab activation
RenderWidgetHost focus
document.activeElement
shadow-root active element
editor internal focus/model
```

A reliable adapter should verify the focus postcondition rather than infer it solely from a successful Input command response.

---

## 14. Frame and coordinate routing

Mouse coordinates are documented relative to the main-frame viewport in CSS pixels.

Current Chromium's input handler can route based on the widget at the supplied point, but EXP-04 remains relevant because process-separated targets/frames can change during navigation.

Required sequence:

```text
resolve semantic target
→ confirm current target/session/frame
→ obtain current layout geometry
→ optional hit-test node at point
→ dispatch input
→ verify actual target/event/semantic result
```

Do not persist raw coordinates as durable adapter identity.

---

## 15. Event ordering / race conditions

Input success from CDP means the protocol command was handled, not that the application reached the intended semantic state.

Typical click sequence can involve:

```text
pointer/mouse movement
→ press
→ focus changes
→ pointer/mouse events
→ release
→ click
→ app event handler
→ async request
→ DOM transition
```

Therefore EXP-03 correlation still applies:

```text
Input action
+ event evidence
+ network/backend evidence where relevant
+ semantic DOM/AX evidence
→ correlated completion
```

---

## 16. Technical limitations

- stable browser input still requires the high-cost `debugger` permission;
- CDP coordinates can race with layout;
- `isTrusted` does not by itself prove human intent;
- activation-gated APIs need separate observation;
- browser-native Chrome UI is outside ordinary page Input reach;
- IME/direct text/drag/gesture helpers rely on experimental commands;
- sites may use additional signals beyond DOM `isTrusted`;
- success response is not application completion.

---

## 17. Failure modes

| Failure | Meaning | Handling |
|---|---|---|
| `STALE_GEOMETRY` | target moved before dispatch | re-resolve + hit test |
| `WRONG_HIT_TARGET` | overlay/neighbor received event | compare target/event backend identity |
| `FOCUS_MISMATCH` | keyboard input reaches wrong editor | verify activeElement/editor state |
| `PARTIAL_SEQUENCE` | press happened, release/click did not | journal action phase; reconcile |
| `FRAME_SWAP` | target context changed during dispatch | use EXP-04 generation/session reconciliation |
| `INPUT_ACCEPTED_APP_IGNORED` | browser event dispatched but app semantics unchanged | correlate with DOM/network state |
| `EXPERIMENTAL_METHOD_UNAVAILABLE` | drag/IME/text helper absent/changed | fallback tier |
| `USER_ACTIVATION_ABSENT` | trusted event does not grant required gated behavior | human gate / supported user gesture route |
| `UNKNOWN_OUTCOME` | crash after side effect but before confirmation | EXP-05 reconciliation; do not blindly replay |

---

## 18. Compound capability — Browser Input Escalation

Recommended technical hierarchy:

```text
Tier 0  direct read-only observation
Tier 1  DOM/content-script action
Tier 2  stable CDP mouse/keyboard/touch input
Tier 3  experimental drag/IME/text/gesture input
Tier 4  human interaction / browser-native UI gate
```

This prevents `debugger` Input from becoming the default tool for every control while preserving a stronger actuation route for hard widgets.

Status: **LIKELY / MICRO-PROOF REQUIRED**.

---

## 19. Controlled micro-proof design

Create a controlled page with:

- normal button;
- text input;
- contenteditable/rich-editor-like test region;
- drag/drop target;
- nested iframe;
- event logger installed for pointer/mouse/key/input/change/focus events.

Logger records:

```text
type
timestamp
isTrusted
target id/path
currentTarget
buttons/button
pointerType
key/code
inputType
document.activeElement
navigator.userActivation.isActive
navigator.userActivation.hasBeenActive
```

Run four mouse paths on the same button:

```text
A. JS dispatchEvent(new MouseEvent(...))
B. HTMLElement.click()
C. CDP Input.dispatchMouseEvent press + release
D. physical human click baseline
```

Then keyboard paths:

```text
A. direct element.value assignment + input event
B. stable Input.dispatchKeyEvent sequence
C. experimental Input.insertText
D. physical typing baseline
```

Then controlled drag proof if supported.

Capture PRE/POST evidence using EXP-13.

---

## 20. PASS criteria

PASS requires:

1. Exact event logs for JS dispatch, `.click()`, CDP input and physical baseline.
2. G3 is resolved empirically on the current minimum-supported/current Chrome versions.
3. User activation state is measured separately from `isTrusted`.
4. Stable vs experimental command dependence is recorded.
5. Mouse input reaches the intended target in main frame and at least one controlled nested-frame case.
6. Keyboard input demonstrates verified focus and resulting value/editor state.
7. A failed/stale-coordinate case is detected instead of silently accepted.
8. Application completion is verified semantically rather than from command success alone.

---

## 21. Technical Reach classification

| Capability | Reach |
|---|---|
| JS `dispatchEvent` | **PROVEN page primitive; untrusted event** |
| `HTMLElement.click()` | **PROVEN page primitive; click is untrusted** |
| stable CDP mouse input | **DOCUMENTED / REACHABLE** |
| stable CDP keyboard input | **DOCUMENTED / REACHABLE** |
| stable CDP touch input | **DOCUMENTED / REACHABLE** |
| CDP event `isTrusted === true` | **LIKELY / SOURCE-SUPPORTED / MICRO-PROOF REQUIRED** |
| CDP input grants transient/sticky user activation | **NEEDS MICRO-PROOF** |
| direct text / IME | **EXPERIMENTAL / NEEDS PROOF** |
| drag/drop | **EXPERIMENTAL / NEEDS PROOF** |
| generic browser-input escalation layer | **LIKELY** |

**Repo implementation:** current production workers do not yet use `chrome.debugger` Input.

---

## 22. Remaining evidence gaps

- E14-G1 / prior G3: live current-Chrome `isTrusted` result for CDP mouse/key/touch.
- E14-G2: exact user-activation behavior of CDP-injected eligible events.
- E14-G3: cross-origin OOPIF hit-target routing under page zoom/scroll.
- E14-G4: IME/composition behavior on real complex editors.
- E14-G5: experimental drag/drop file behavior from EXP-02 Path C.

These are controlled-proof gaps, not blockers to Phase-1 synthesis.

---

## 23. Official / primary sources

- Chrome Debugger API: https://developer.chrome.com/docs/extensions/reference/api/debugger
- CDP Input: https://chromedevtools.github.io/devtools-protocol/tot/Input/
- CDP stable 1.3 Input: https://chromedevtools.github.io/devtools-protocol/1-3/Input/
- Chromium Input handler: https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/devtools/protocol/input_handler.cc
- Chromium Blink EventTarget/Event implementation: https://chromium.googlesource.com/chromium/src/+/HEAD/third_party/blink/renderer/core/dom/events/
- HTML user activation: https://html.spec.whatwg.org/multipage/interaction.html
- MDN `Event.isTrusted`: https://developer.mozilla.org/en-US/docs/Web/API/Event/isTrusted
- MDN UserActivation: https://developer.mozilla.org/en-US/docs/Web/API/UserActivation

---

## Phase-1 conclusion

CDP Input is a legitimate **browser-input escalation plane**, not merely syntactic sugar over `element.click()`.

But Phase 1 should preserve this strict evidence boundary:

```text
browser-routed input = DOCUMENTED
trusted-event prediction = STRONGLY SOURCE-SUPPORTED
current live isTrusted/userActivation behavior = MICRO-PROOF REQUIRED
```

This is sufficient for synthesis without overstating G3 as already measured.

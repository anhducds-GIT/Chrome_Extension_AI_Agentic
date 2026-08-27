# EXP-02 — Local File → Bridge → Web Upload Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. Provider policy/regulation remains a separate axis.

## 1. Research question

Can the platform reliably move a local artifact into an authenticated web application without depending on manual native file-picker interaction?

Target flow:

```text
Local filesystem
→ Native Bridge
→ Chrome Extension
→ chrome.debugger/CDP
→ authenticated web upload surface
```

The larger question is whether this can become a reusable **Browser Runtime file-ingress primitive**, not a one-off site-specific hack.

---

## 2. Core finding

There are at least **three technically distinct upload paths** worth treating as separate primitives:

1. Existing `<input type="file">` → `DOM.setFileInputFiles`
2. Dynamically-created/native file chooser → `Page.setInterceptFileChooserDialog` + `Page.fileChooserOpened`
3. Drag/drop surface → `Input.dispatchDragEvent` with `DragData.files`

This means “file upload” should not be modeled as a single selector action.

A future shared runtime should detect the upload mechanism and choose an appropriate strategy.

---

## 3. Path A — Existing file input

CDP `DOM.setFileInputFiles` accepts an array of file paths and one of:

- `nodeId`
- `backendNodeId`
- `objectId`

The protocol description is explicit: it sets files on a file input element.

```text
Bridge returns canonical local path
→ locate <input type=file>
→ resolve node/backend node
→ DOM.setFileInputFiles([absolutePath])
→ page receives selected file state
```

### Strong evidence

Chromium's Inspector DOM implementation validates that the target node must be an HTML input whose type is `file`; otherwise the command errors.

ChromeDriver's own implementation also uses `DOM.setFileInputFiles` for file upload. Its current code validates that supplied paths are absolute and rejects paths containing parent traversal before sending them to DevTools.

**Implication:** absolute canonical paths should be the normal Bridge contract.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/#method-setFileInputFiles
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/test/chromedriver/chrome/web_view_impl.cc
- https://chromium.googlesource.com/chromium/src/+/31cb5b133b10098565b6440770d1af076c741264/third_party/blink/renderer/core/inspector/inspector_dom_agent.cc

---

## 4. Important architecture finding — move paths, not file bytes

Native Messaging transports JSON between the extension and a local native process.

For this upload path, the Bridge does **not need to stream the full file through Native Messaging**.

A more efficient design is:

```text
Local runtime owns file bytes
        ↓
Bridge sends only:
{ artifact_id, canonical_path, size, mime, hash? }
        ↓
Chrome/CDP reads the referenced local path for file assignment
```

This avoids turning Native Messaging into a bulk-file transport channel and avoids its per-message size constraints for ordinary local uploads.

**Architecture hypothesis:** Native Messaging should primarily be the **control plane** for local artifact references; filesystem remains the **data plane**.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

---

## 5. Path B — Dynamic/native file chooser

A major failure mode exists when a site creates a file input dynamically, calls `.click()`, then leaves no stable DOM element for the automation client to discover.

Chromium explicitly identified this as a web-automation problem when implementing DevTools file chooser interception.

Current CDP provides:

- `Page.setInterceptFileChooserDialog`
- `Page.fileChooserOpened`

When interception is enabled, the native file chooser is not shown; protocol control receives a file chooser event instead.

`Page.fileChooserOpened` can include:

- frame ID
- single/multiple selection mode
- `backendNodeId` when the chooser originated from an `<input type=file>`

Potential runtime flow:

```text
Enable chooser interception
→ site triggers upload action
→ Page.fileChooserOpened
→ identify frame/backendNodeId
→ assign local file(s)
→ confirm page accepted selection
```

### Evidence gap

Older Chromium implementation history referenced a `Page.handleFileChooser` command, but that command is not present in the current published Page protocol surface reviewed in this study.

Therefore the current production strategy for all chooser variants must be established by micro-proof rather than copied from historical protocol behavior.

For chooser events that expose `backendNodeId`, `DOM.setFileInputFiles` is the obvious candidate. For chooser types without a backend input node, current behavior remains **NEEDS VERIFICATION**.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-setInterceptFileChooserDialog
- https://chromedevtools.github.io/devtools-protocol/tot/Page/#event-fileChooserOpened
- https://chromium.googlesource.com/chromium/src/+/81b992e76d7268d78f51ee955c1d952c5d23de0f

---

## 6. Path C — Drag/drop upload surfaces

The CDP Input domain exposes `Input.dispatchDragEvent`.

Its `DragData` structure supports a `files` array described as filenames to include in the drop.

This creates a second potential browser-native upload mechanism for applications that expose a drag/drop zone rather than a stable file input.

Candidate flow:

```text
Bridge → local file path(s)
→ determine drop-zone coordinates
→ Input.dispatchDragEvent(dragEnter)
→ Input.dispatchDragEvent(dragOver)
→ Input.dispatchDragEvent(drop, DragData.files)
→ observe page result
```

### Evidence level

- Protocol support for drag events and `DragData.files`: **DOCUMENTED**
- Exact path requirements / cross-site reliability for real uploads: **NEEDS MICRO-PROOF**
- This protocol feature is experimental, so it should not be the only upload strategy.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/#method-dispatchDragEvent

---

## 7. `chrome.debugger` exposure boundary

Chrome documents `DOM`, `Input`, and `Page` among domains available through `chrome.debugger`, making the primitives above plausible for an extension-controlled CDP runtime.

However full CDP contains domains that `chrome.debugger` does **not** expose. In particular, the current allowed-domain list does not include the full `Browser` or `FileSystem` domains.

This is an important ceiling distinction:

```text
Full CDP capability != chrome.debugger capability
```

Therefore architecture should prefer:

- `chrome.debugger` DOM/Page/Input for browser-page upload control
- Native Bridge for real OS filesystem access
- `chrome.downloads` for extension-level download lifecycle where appropriate

rather than assuming extension CDP can directly use every full-CDP filesystem/browser command.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 8. Round-trip artifact bus hypothesis

Chrome's Downloads API exposes download lifecycle and `DownloadItem.filename` as an **absolute local path** after download resolution.

This suggests a powerful round trip:

```text
LOCAL ARTIFACT
→ Bridge path reference
→ browser upload primitive
→ authenticated web processing
→ browser download
→ chrome.downloads completion
→ absolute local path
→ Bridge/local artifact registry
→ next workflow step
```

This is larger than “upload automation”. It suggests Chrome can act as a **web-application I/O bus** between local production stages.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 9. Proposed shared `FileIngress` primitive

Do not let GPT/Gemini/Flow each reinvent file upload.

Candidate shared contract:

```text
FileIngress.request({
  tab_id,
  artifact_ref,
  strategy: "auto",
  target_hint?,
  expected_accept?,
  multiple?: false
})
```

Where local artifact metadata could be:

```text
artifact_ref = {
  artifact_id,
  canonical_path,
  filename,
  size,
  mime,
  sha256?
}
```

`strategy: auto` may probe in order:

1. stable file input
2. chooser interception
3. drag/drop
4. return `UNSUPPORTED_UPLOAD_MECHANISM`

This is only an architecture hypothesis until EXP-02 is measured.

---

## 10. Security/failure boundaries — technical only

These are implementation-safety boundaries, not provider-policy analysis.

### Local path trust

The Bridge should not accept arbitrary browser-originated paths as permission to read arbitrary local files.

Recommended direction:

- local orchestrator resolves artifact ID → canonical path;
- allowlisted artifact roots;
- reject parent traversal / non-canonical paths;
- optionally verify size/hash immediately before upload;
- do not let page DOM decide filesystem path.

### Stale artifact

Between planning and upload:

- file may be deleted;
- file may change;
- path may move;
- another process may still be writing it.

The runtime needs preflight existence/size/readiness checks.

### Navigation/frame churn

A located node/backend node may become invalid after SPA rerender/navigation.

The action must bind to current target/frame/document state and retry discovery safely rather than cache file-input node IDs for long periods.

### Multiple files

The protocol accepts an array, but app constraints such as `multiple`, accepted file types, limits and upload ordering remain site-specific semantics.

### File picker variants

Not every web upload necessarily maps to a stable `<input type=file>`.

Chooser interception and drag/drop must be tested separately.

---

## 11. EXP-02 controlled micro-proof

Use a locally controlled test page, not a provider site.

### Test fixtures

Create four upload widgets:

1. visible `<input type=file>`
2. hidden `<input type=file>` behind a button
3. input created dynamically immediately before `.click()`
4. drag/drop zone

Include:

- single-file input
- multi-file input
- nested iframe variant
- cross-origin iframe variant if practical

### Local artifacts

Use harmless generated fixtures:

- small `.txt`
- `.png`
- `.json`
- two-file batch

### Measurements

For each path record:

- strategy selected
- frame/target context
- whether chooser UI appeared
- whether upload assignment succeeded
- page-observed filename/size/type
- whether `input` / `change` behavior occurred as expected
- latency
- detach/navigation failure behavior
- error classification

### Specific tests

#### T1 — Existing visible input

`DOM.setFileInputFiles` using node/backend node.

#### T2 — Hidden input

Verify direct file assignment does not require the element to be visually exposed.

#### T3 — Dynamic chooser

Enable `Page.setInterceptFileChooserDialog`, trigger button, record `Page.fileChooserOpened`, then test current viable file-assignment path.

#### T4 — Multi-file

Assign two canonical paths and verify page receives the expected FileList.

#### T5 — Drag/drop

Use `Input.dispatchDragEvent` with `DragData.files` and verify a controlled drop zone receives files.

#### T6 — iframe

Repeat input assignment inside frame contexts to validate integration with the target/session registry from EXP-01.

#### T7 — stale path

Delete artifact before command; verify deterministic error instead of hanging.

#### T8 — path normalization

Validate Windows absolute paths and reject parent-traversal/non-canonical artifact references at the local boundary.

---

## 12. PASS criteria

EXP-02 passes as a reusable runtime primitive if:

- at least stable/hidden `<input type=file>` upload works deterministically;
- local file bytes do not need to transit through Native Messaging;
- canonical artifact path contract is sufficient;
- stale/missing path failure is classified cleanly;
- target/frame association is reconstructable;
- dynamic chooser behavior is measured rather than assumed;
- a strategy-selection model can distinguish supported vs unsupported upload mechanisms;
- authoritative artifact metadata remains local.

Drag/drop is an enhancement, not required for the minimum PASS.

---

## 13. Capability unlocked if PASS

A proven `FileIngress` primitive enables many compound capabilities without yet choosing specific providers:

```text
AI/local generation
→ upload to authenticated web tool
→ web transformation/render/process
→ download result
→ local QA/post-process
→ upload to next web tool
```

Examples of generic workflow families:

- local image → web image/video processor → local result
- local document → authenticated SaaS analysis/transformation → artifact
- batch local assets → browser production tool → result collection
- local structured data → web workflow → downloaded report
- cross-web-app asset relay coordinated by one local orchestrator

These are technical capability families only; provider-specific boundaries are evaluated later.

---

## 14. Current conclusion

EXP-02 looks **highly plausible** for ordinary HTML file inputs and potentially broader than first assumed because CDP also exposes chooser interception and drag/drop primitives.

The key architectural insight is:

> **Do not send file contents through the Bridge unless necessary. Send trusted local artifact references; let browser-native upload primitives consume the local path.**

If the controlled proof succeeds, file ingress/egress should become a shared Browser Runtime subsystem rather than provider-specific code.

---

## Sources

Official/current sources prioritized:

- Chrome Debugger API  
  https://developer.chrome.com/docs/extensions/reference/api/debugger
- Chrome Native Messaging  
  https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- Chrome Downloads API  
  https://developer.chrome.com/docs/extensions/reference/api/downloads
- CDP DOM  
  https://chromedevtools.github.io/devtools-protocol/tot/DOM/
- CDP Page  
  https://chromedevtools.github.io/devtools-protocol/tot/Page/
- CDP Input  
  https://chromedevtools.github.io/devtools-protocol/tot/Input/
- Chromium historical file-chooser interception implementation  
  https://chromium.googlesource.com/chromium/src/+/81b992e76d7268d78f51ee955c1d952c5d23de0f
- Chromium ChromeDriver current implementation  
  https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/test/chromedriver/chrome/web_view_impl.cc

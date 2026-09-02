---
kind: study
status: active
ttl_days: 180
---

# EXP-06 — Web App → Download → Local Artifact Registry Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. No production implementation. Provider policy/regulation remains a separate axis.

## 1. Research question

Can the platform reliably turn a download produced by an authenticated web application into a durable local artifact that can be consumed by the next workflow step?

Target flow:

```text
browser action
→ authenticated web app generates/export file
→ Chrome download lifecycle
→ resolved local file
→ Native Bridge filesystem verification
→ Artifact Registry
→ next web/local worker
```

The larger question is whether this can close the second half of a reusable **Artifact Bus**:

```text
LOCAL ARTIFACT
→ web upload
→ web processing
→ web download
→ LOCAL ARTIFACT
```

---

## 2. Core finding

**Yes, with a strong documented basis.** Chrome exposes a dedicated `chrome.downloads` API that can observe, search and manage browser downloads, and `DownloadItem.filename` exposes the resolved **absolute local path**.

The strongest architecture is not to move downloaded file bytes through Native Messaging. Instead:

```text
Chrome download event
→ { downloadId, url, finalUrl, mime, filename, size, state, timestamps }
→ Bridge receives path/provenance metadata
→ local runtime verifies the actual filesystem object
→ compute hash / inspect metadata as needed
→ create durable artifact record
```

This preserves the same boundary discovered in EXP-02:

```text
Native Messaging = control plane
Filesystem        = data plane
```

**Technical reach:** LIKELY / strong documented basis; controlled micro-proof required before marking PROVEN.

Primary source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 3. Primitive P1 — Browser-wide download lifecycle

With the `downloads` permission, an extension can receive:

- `chrome.downloads.onCreated`
- `chrome.downloads.onChanged`
- `chrome.downloads.onErased`
- `chrome.downloads.onDeterminingFilename`

`onCreated` fires when a download begins.

`onChanged` fires when important `DownloadItem` properties change, including terminal state changes.

This gives a natural state machine:

```text
DETECTED
→ IN_PROGRESS
→ COMPLETE

or

DETECTED
→ IN_PROGRESS
→ INTERRUPTED
```

Important: `bytesReceived` changes do not individually trigger `onChanged`, so high-frequency progress should not be designed around that event alone.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 4. Primitive P2 — `DownloadItem` is unusually rich provenance

A `DownloadItem` can expose:

- `id`
- `url`
- `finalUrl`
- `referrer`
- `mime`
- `filename`
- `fileSize`
- `totalBytes`
- `bytesReceived`
- `startTime`
- `endTime`
- `state`
- `error`
- `danger`
- `exists`
- `canResume`
- `incognito`

Two fields are especially important.

### 4.1 `filename` is an absolute local path

Chrome documents `DownloadItem.filename` as the absolute local path.

Therefore a browser-generated download can cross into the local runtime without copying its bytes through Native Messaging:

```text
DownloadItem.filename
→ Bridge
→ fs.stat(path)
→ hash(path)
→ artifact registry
```

### 4.2 `DownloadItem.id` persists across browser sessions

Chrome explicitly documents the numeric download `id` as persistent across browser sessions.

This is stronger than runtime handles such as `tabId`, debugger `sessionId`, target IDs, or execution context IDs.

However it should **not** become the canonical artifact identity, because download history may be erased and the underlying file may later be moved/deleted/replaced.

Recommended distinction:

```text
download_id  = Chrome provenance handle
artifact_id  = durable orchestrator identity
```

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 5. Primitive P3 — terminal file path is not enough; local verification is required

Chrome exposes `DownloadItem.exists`, but its documentation contains an important limitation:

- Chrome does not continuously watch for external file removal;
- `search()` can trigger an existence check;
- `search()` returns before that check necessarily completes;
- Chrome will not perform the filesystem existence check more often than approximately once every 10 seconds.

Therefore this is unsafe:

```text
state == complete
→ exists == true
→ artifact valid
```

The stronger handoff is:

```text
state == complete
→ resolved absolute filename
→ Bridge fs.stat()
→ verify regular file / expected size
→ optional hash
→ register artifact
```

This makes the Native Runtime the authority for local file reality.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 6. Primitive P4 — interrupted downloads are structured failure states

Chrome exposes structured `InterruptReason` values, including groups such as:

- `FILE_*`
- `NETWORK_*`
- `SERVER_*`
- `USER_*`
- `CRASH`

Representative examples include:

- `FILE_ACCESS_DENIED`
- `FILE_NO_SPACE`
- `NETWORK_TIMEOUT`
- `NETWORK_DISCONNECTED`
- `SERVER_UNAUTHORIZED`
- `SERVER_FORBIDDEN`
- `USER_CANCELED`
- `USER_SHUTDOWN`
- `CRASH`

`DownloadItem.canResume` indicates whether an interrupted/in-progress download can be resumed.

This means download handling should not collapse failures into a generic timeout. A future runtime can classify failure and choose retry / resume / human gate / abort behavior.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 7. Primitive P5 — filename control exists, but has coordination cost

`chrome.downloads.onDeterminingFilename` lets extensions suggest a target filename and conflict behavior.

Conflict actions include:

- `uniquify`
- `overwrite`
- `prompt`

The suggested filename must remain relative to the user's Downloads directory; absolute paths and parent traversal are rejected/ignored.

Important failure mode: multiple extensions can participate in filename determination, and Chrome documents that the last-installed extension that supplies a filename suggestion wins.

Therefore global filename interception is potentially high-coupling behavior.

**Phase-1 architecture hypothesis:**

Prefer observing the resolved filename first. Only introduce filename override when deterministic routing into a managed download namespace proves necessary.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 8. Danger / security state is a real runtime state, not an error to bypass

`DownloadItem.danger` classifies suspicious downloads.

Chrome's `acceptDanger()` does **not** silently auto-approve a dangerous download. It prompts the user and can only be called from a visible context.

Therefore a reliable orchestrator should model:

```text
DOWNLOAD_PENDING_USER_SECURITY_DECISION
```

rather than trying to hide or bypass the browser's safety decision.

This is both a technical UX constraint and a clean human-gate boundary.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/downloads

---

## 9. CDP download events: useful full-CDP capability, but `chrome.debugger` has a boundary

Current full CDP exposes browser-level download primitives in the `Browser` domain:

- `Browser.downloadWillBegin`
- `Browser.downloadProgress`
- `Browser.setDownloadBehavior`
- `Browser.cancelDownload`

`Browser.downloadWillBegin` provides valuable attribution fields such as:

- `frameId`
- download `guid`
- URL
- suggested filename

However Chrome's documented `chrome.debugger` allowed-domain list does **not** include the `Browser` domain.

Therefore this must **not** be assumed available to the extension just because full CDP supports it.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Browser/

### 9.1 Deprecated Page-domain bridge

The currently published Page domain still contains deprecated experimental events:

- `Page.downloadWillBegin`
- `Page.downloadProgress`

and deprecated `Page.setDownloadBehavior`.

Because `Page` is exposed through `chrome.debugger`, these methods/events may provide extra frame-level attribution on Chrome versions where they remain implemented.

But they are deprecated in favor of Browser-domain equivalents, while Browser is not exposed by `chrome.debugger`.

Therefore they must be treated as:

**NEEDS MICRO-PROOF / not a durable architectural dependency until verified against target Chrome versions.**

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

---

## 10. Key attribution limitation — `chrome.downloads` has no direct tab/frame field

`DownloadItem` provides rich file/network provenance but does not expose a direct `tabId` or `frameId` field in the documented API.

This creates a correlation problem when several tabs or workflows can download similar files concurrently.

Candidate correlation signals:

```text
ActionSpan start time
+ expected provider/app
+ url/finalUrl/referrer
+ MIME
+ suggested/resolved filename
+ creation time
+ observed network event
+ optional Page.downloadWillBegin frameId/guid if verified
→ candidate DownloadItem
```

Therefore a generic Artifact Bus should not simply assign "the next download" to "the current job".

It needs a download correlation layer analogous to EXP-03's network correlation engine.

---

## 11. Blob / generated-in-page downloads

Modern web applications frequently produce client-generated artifacts using mechanisms such as Blob/Object URLs rather than a stable downloadable HTTP endpoint.

`chrome.downloads` observes browser download-manager items rather than requiring a reusable public file URL, which makes it a promising layer for these flows.

However exact provenance values (`url`, `finalUrl`, `referrer`, filename behavior) for:

- Blob/Object URL download
- `data:` download
- JS-created `<a download>`
- download initiated from a nested frame

must be measured in the controlled micro-proof.

**Status:** LIKELY observable as browser downloads; exact attribution semantics NEED EXPERIMENT.

---

## 12. Artifact Registry model

A durable artifact record should not merely be a filename string.

Candidate record:

```text
artifact_id
artifact_type
created_at
producer_workflow_id
producer_action_span_id
source_app
source_url
final_url
chrome_download_id
mime
suggested_filename?
resolved_path
size
sha256?
state
verification_time
parent_artifact_ids[]
```

Recommended state progression:

```text
DISCOVERED
→ DOWNLOADING
→ BROWSER_COMPLETE
→ LOCAL_VERIFYING
→ VERIFIED
→ REGISTERED
```

Failure paths:

```text
INTERRUPTED
DANGER_GATE
MISSING_AFTER_COMPLETE
SIZE_MISMATCH
HASH_FAILED
CORRELATION_AMBIGUOUS
UNKNOWN_OUTCOME
```

This keeps browser lifecycle evidence and filesystem truth separate but linked.

---

## 13. Compound capability C1 — closed-loop Artifact Bus

EXP-02 + EXP-06 together create the following technically plausible primitive:

```text
Artifact Registry A
→ local path
→ Bridge
→ CDP upload
→ authenticated Web App A
→ processing
→ browser download
→ chrome.downloads lifecycle
→ Bridge filesystem verify
→ Artifact Registry B
```

This can then feed another adapter:

```text
Artifact B
→ Web App B
→ Artifact C
→ local CLI/process
→ Artifact D
```

The important architectural shift is that files become durable workflow objects rather than incidental download-folder side effects.

---

## 14. Compound capability C2 — restart-safe output ingestion

Because Chrome download IDs persist across browser sessions and the local orchestrator owns the durable checkpoint, recovery can potentially:

```text
restart
→ query known download_id
→ inspect terminal state/path
→ verify local file
→ reconcile pending artifact journal
→ continue
```

This directly complements EXP-05.

Limitation: if Chrome history has been erased or the file changed externally, recovery must fall back to filesystem/provenance reconciliation rather than trusting download history alone.

---

## 15. Failure modes to design for

1. **Concurrent similar downloads** — ambiguous attribution between jobs.
2. **Filename collision** — Chrome may uniquify, overwrite or prompt depending on policy.
3. **Danger gate** — completion waits for user/security decision.
4. **Interrupted download** — terminal state may be resumable or non-resumable.
5. **Chrome says complete but file disappears afterward** — local verification fails.
6. **Blob/data URL** — weak reusable network URL provenance.
7. **Multiple filename-controlling extensions** — winner depends on extension install order.
8. **Browser restart during download** — must reconcile persistent download item and filesystem.
9. **Download history erased** — Chrome ID no longer sufficient for recovery.
10. **Deprecated Page CDP download events disappear/change** — architecture must not depend on them without version probing.

---

## 16. Controlled micro-proof design

Run on controlled test infrastructure plus local fixture files. No provider-specific automation is required.

### Scenario A — ordinary HTTP download

```text
click controlled download link
→ observe onCreated
→ observe terminal onChanged
→ inspect DownloadItem
→ verify absolute filename locally
```

Measure URL, finalUrl, referrer, MIME, file size, filename and timestamps.

### Scenario B — redirect download

Verify original `url` versus `finalUrl` and resulting provenance.

### Scenario C — duplicate filename

Download same filename twice and record actual collision behavior and resolved paths.

### Scenario D — JS Blob download

Generate a Blob in-page, trigger `<a download>`, and record DownloadItem provenance.

### Scenario E — `data:` download

Repeat for a small data URL.

### Scenario F — nested-frame initiated download

Trigger a download from a same-process iframe and an OOPIF where practical.

Test whether `chrome.downloads` alone can attribute origin; separately test whether deprecated `Page.downloadWillBegin` is delivered through `chrome.debugger` and carries useful frame attribution.

### Scenario G — interruption

Interrupt a controlled transfer and inspect:

- `state`
- `error`
- `canResume`
- resume behavior

### Scenario H — browser restart

Start/persist a download record, restart Chrome, query by `downloadId`, and verify persistence/reconciliation.

### Scenario I — external file removal

Complete a download, delete/move the file through the local fixture, compare:

- `DownloadItem.exists`
- `chrome.downloads.search()` behavior
- direct Bridge filesystem truth

### Scenario J — correlation collision

Start two near-simultaneous downloads with similar filename/MIME from separate controlled frames/tabs and determine whether ActionSpan + URL/referrer/time is sufficient for deterministic mapping.

### Scenario K — danger/security gate

Do **not** create malicious content. Use only a safe controlled fixture/state if Chrome provides a benign way to exercise the visible danger/approval path; otherwise document as untested and rely on API contract.

---

## 17. PASS criteria

EXP-06 passes only if the controlled proof demonstrates:

1. browser-initiated downloads are observable without provider-specific DOM scraping;
2. a completed download yields a stable absolute local path;
3. Bridge/local filesystem verification can deterministically turn that path into a registered artifact;
4. ordinary redirect and duplicate-filename cases preserve enough provenance for reconciliation;
5. at least one client-generated Blob/download case is correctly observed;
6. interruption produces structured state rather than generic timeout-only failure;
7. restart can recover at least one known `downloadId` and reconcile it with filesystem reality;
8. concurrent-download attribution has either a deterministic solution or is explicitly marked ambiguous rather than guessed;
9. deprecated Page download events are capability-probed and not assumed;
10. no Browser-domain CDP capability is falsely attributed to `chrome.debugger`.

---

## 18. Architecture hypothesis unlocked by EXP-06

If micro-proof passes, the shared Browser Runtime should expose a provider-independent primitive similar to:

```text
beginDownloadSpan(expected_provenance)
→ observe candidate downloads
→ correlate DownloadItem
→ wait terminal state
→ hand resolved path to Native Runtime
→ verify/register artifact
→ return artifact_id
```

Site adapters would describe semantic expectation, not implement filesystem handling themselves.

Native Runtime would own:

- canonical artifact identity;
- filesystem verification;
- hashing/checksum if needed;
- durable artifact metadata;
- downstream handoff;
- cleanup/retention policy.

Browser Runtime would own:

- download lifecycle;
- browser provenance;
- candidate correlation;
- browser-side terminal/failure states.

---

## 19. Current conclusion

EXP-06 materially strengthens the Artifact Bus hypothesis.

The browser can plausibly become an authenticated web-application I/O boundary while the local runtime owns durable file truth:

```text
LOCAL PATH
   ↓ upload
WEB APP
   ↓ download
CHROME DOWNLOAD ITEM
   ↓ absolute filename
LOCAL FILESYSTEM
   ↓ verify
ARTIFACT REGISTRY
```

The biggest remaining technical uncertainty is **attribution**, not basic download reach: when multiple browser actions/downloads happen concurrently, the runtime must prove which DownloadItem belongs to which ActionSpan instead of assigning by arrival order.

---

## Sources

Official Chrome / CDP references:

- https://developer.chrome.com/docs/extensions/reference/api/downloads
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://chromedevtools.github.io/devtools-protocol/tot/Browser/

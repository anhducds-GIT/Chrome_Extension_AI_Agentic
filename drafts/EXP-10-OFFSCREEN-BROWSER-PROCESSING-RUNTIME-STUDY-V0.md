# EXP-10 — `chrome.offscreen` Browser-side Processing Runtime Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Technical reach first. No production implementation.

---

## 1. Research question

Can `chrome.offscreen` provide a reusable browser-side processing plane for work that a Manifest V3 service worker cannot do directly, such as DOM parsing, Blob handling, worker-based compute, localStorage migration, iframe scripting/scraping, media and clipboard operations?

Target hypothesis:

```text
Service Worker / Browser Runtime control plane
        ↓ chrome.runtime messaging
Offscreen Document
        ↓
DOM / Blob / Worker / media / iframe web APIs
        ↓
normalized result / artifact metadata
        ↓
Service Worker or Local Runtime
```

The larger question is whether this can reduce unnecessary Bridge traffic and keep browser-native processing inside Chrome without confusing the offscreen document with the durable local orchestrator.

---

## 2. Core finding

**Yes, but `chrome.offscreen` should be modeled as an ephemeral browser document/compute plane, not as a replacement for the local runtime.**

Current Chrome documentation states that an offscreen document is a hidden extension page with DOM access. It behaves like a `window`, but:

- its URL must be a static HTML file bundled with the extension;
- it cannot be focused;
- `window.opener` is always `null`;
- among Chrome extension APIs, only `chrome.runtime` is supported inside it;
- an extension can normally have only one offscreen document open at a time per profile;
- normal and incognito profiles may each have one when the extension runs in split incognito mode.

The document still has ordinary web-platform capabilities appropriate to the declared reason(s), which makes it valuable for DOM, Blob, worker, media and related processing.

**Technical reach:** LIKELY / strong documented basis. Controlled micro-proof required before PROVEN.

Primary sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://chromium.googlesource.com/chromium/src/+/HEAD/extensions/common/api/offscreen.webidl
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_document_manager.cc

---

## 3. Primitive P1 — lifecycle and context discovery

`chrome.offscreen.createDocument()` creates an offscreen extension document after receiving:

- bundled relative URL;
- one or more `reasons`;
- developer justification.

`closeDocument()` closes it explicitly.

Chrome 116+ can identify existing offscreen contexts with `chrome.runtime.getContexts({ contextTypes: ['OFFSCREEN_DOCUMENT'] })`.

Current Chrome docs also expose `chrome.offscreen.hasDocument()` from Chrome 150+.

This means the runtime can build an idempotent "ensure offscreen processor exists" primitive instead of racing duplicate creation.

### Important lifecycle limit

Chromium source explicitly describes offscreen documents as non-background pages that **cannot register lazy event listeners and are not automatically respawned in response to API events**.

Therefore recovery should be:

```text
need processor
→ discover existing context
→ create if missing
→ handshake version/capabilities
→ dispatch job
```

not:

```text
assume hidden page is always alive
```

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://chromium.googlesource.com/chromium/src/+/refs/tags/136.0.7067.2/extensions/browser/offscreen_document_host.h

---

## 4. Primitive P2 — DOM parsing / detached-document processing

The `DOM_PARSER` reason exists specifically for use of the `DOMParser` API.

Candidate use:

```text
HTML/string artifact
→ offscreen DOMParser
→ normalize structure / extract metadata / sanitize representation
→ structured result
```

This is useful when a service worker needs document APIs without creating a visible browser tab.

Potential compound capabilities:

- parse saved HTML evidence;
- normalize generated HTML fragments before storage;
- inspect forms/tables/documents outside the live provider page;
- convert unstructured HTML responses into deterministic JSON for downstream AI reasoning.

This should not be confused with observing the *live authenticated page*. Live page semantics still belong to content script/CDP/browser topology layers.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

---

## 5. Primitive P3 — Blob/object-URL processing

The `BLOBS` reason explicitly permits interaction with Blob objects, including `URL.createObjectURL()`.

Potential pipeline:

```text
browser-side bytes / ArrayBuffer / Blob
→ offscreen document
→ inspect / chunk / transform / object URL
→ return metadata or smaller payload
```

This can reduce pressure on the loopback Bridge for transformations that are naturally browser-side.

Examples worth micro-proofing:

- Blob → ArrayBuffer → SHA-256 via Web Crypto;
- Blob chunking;
- object URL lifecycle;
- MIME sniff/metadata extraction where browser APIs are sufficient;
- preparation of data for download or later upload.

However, offscreen does not grant OS filesystem reach. Durable local files remain the responsibility of browser Downloads API and/or the local runtime.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

---

## 6. Primitive P4 — dedicated workers inside the offscreen document

The `WORKERS` reason exists specifically so an offscreen document can spawn workers.

This provides a candidate browser-side compute pool:

```text
Service Worker
→ runtime message
→ Offscreen Document
→ Dedicated Worker(s)
→ CPU-heavy browser-safe transform
→ result
```

Potential workloads:

- hashing;
- parsing;
- compression/decompression implemented in browser JS/WASM;
- image/audio metadata processing;
- chunking and validation;
- deterministic preprocessing before evidence is persisted.

### Important architectural boundary

This is **not durable compute**.

Worker/offscreen state can disappear when:

- Chrome shuts down;
- the extension unloads/reloads/updates;
- the offscreen document is explicitly closed;
- other browser lifecycle/resource conditions terminate the context.

Therefore every meaningful job should have a durable job ID/checkpoint outside the offscreen document.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_document_manager.cc

---

## 7. Primitive P5 — localStorage bridge / migration

The `LOCAL_STORAGE` reason exists because the extension service worker itself cannot use `window.localStorage`.

Chrome's storage documentation explicitly recommends an offscreen document as a migration bridge when data must be moved from web storage into extension storage.

Possible role:

```text
legacy/localStorage data
→ offscreen reader
→ chrome.runtime message
→ service worker
→ chrome.storage / local durable store
```

This is a compatibility primitive, not a reason to make offscreen `localStorage` the platform SSOT.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/storage/

---

## 8. Primitive P6 — iframe scripting / DOM scraping

Chrome exposes two dedicated reasons:

- `IFRAME_SCRIPTING`
- `DOM_SCRAPING`

Chrome's offscreen design documentation states that offscreen documents can embed cross-origin frames under the same extension-page rules, and extension content scripts can run in those frames when permissions allow.

Potential use:

```text
Offscreen extension page
→ embed permitted remote frame
→ content script in frame
→ structured extraction
```

This can be valuable for controlled document conversion/scraping flows where opening a visible tab is unnecessary.

It must **not** be treated as a bypass of host permissions, CSP/security boundaries, authentication boundaries or provider restrictions. Permission and regulation axes remain separate.

Sources:
- https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3/
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

---

## 9. Primitive P7 — media / clipboard / environment APIs

Current reasons also include:

- `USER_MEDIA`
- `DISPLAY_MEDIA`
- `WEB_RTC`
- `CLIPBOARD`
- `BATTERY_STATUS`
- `MATCH_MEDIA`
- `GEOLOCATION`
- `AUDIO_PLAYBACK`

These make offscreen useful as a hidden document surface for browser APIs that require `window`/document context.

Examples:

- tab/display capture routed through an offscreen document;
- clipboard transforms;
- WebRTC/media processing;
- environment normalization/probes.

These are capability families, not all necessarily relevant to the first Browser Runtime implementation.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen

---

## 10. Lifetime semantics

Current Chrome documentation is explicit:

- `AUDIO_PLAYBACK` closes the document after 30 seconds without audio;
- all other reasons impose **no documented reason-specific lifetime limit**.

Current Chromium source implements the same model: `AUDIO_PLAYBACK` has a bespoke lifetime enforcer while the other reasons currently use empty/no-special enforcers.

This raises the practical ceiling for long-running browser-side processing.

But "no documented reason-specific timeout" must **not** be interpreted as "durable forever".

The manager clears offscreen documents on extension unload and browser-context shutdown.

Correct model:

```text
potentially long-lived ephemeral processor
!=
durable orchestrator
```

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/lifetime_enforcer_factories.cc
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_document_manager.cc

---

## 11. Permission / UX cost

The API requires manifest permission:

```text
"offscreen"
```

Chrome's permission reference lists `offscreen` but does not list an associated install warning.

This gives offscreen a materially lower user-facing permission cost than `debugger`.

However any host permissions/content scripts/media capture/etc. used by a specific workflow can carry their own permission or user-consent requirements.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://developer.chrome.com/docs/extensions/reference/permissions-list

---

## 12. Singleton constraint — the major scaling limitation

Current Chrome docs and Chromium source both enforce approximately:

```text
1 installed extension
→ max 1 active offscreen document per profile
```

(split-incognito can have one in each profile context).

Therefore a platform with many simultaneous adapters/jobs cannot create one offscreen document per workflow.

The likely generic abstraction is an **Offscreen Processing Broker**:

```text
single offscreen document
→ job router
→ bounded internal worker pool
→ per-job IDs
→ cancellation / timeout
→ result messages
```

The offscreen page should be reusable infrastructure rather than provider-specific state.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_api.cc

---

## 13. Recommended responsibility boundary — hypothesis, not architecture lock

### Service Worker / Browser Control Plane

Owns:

- Chrome extension API events;
- topology and routing;
- lifecycle/recovery handshake;
- offscreen job dispatch;
- browser-facing capability orchestration.

### Offscreen Processing Plane

Best suited for:

- DOMParser;
- Blob/ObjectURL operations;
- worker-based browser compute;
- browser media APIs requiring document context;
- clipboard/localStorage compatibility tasks;
- iframe/document processing where appropriate.

### Local Runtime / Bridge

Still best suited for:

- authoritative durable state;
- filesystem outside normal browser download primitives;
- CLI/process execution;
- databases;
- Git/repo;
- scheduler;
- large/long-running production compute;
- multi-day orchestration;
- artifact registry and recovery journal.

Therefore:

```text
Offscreen = browser-native ephemeral processor
Bridge/local runtime = machine-native durable processor/orchestrator
```

---

## 14. Compound capabilities unlocked

### C1 — Browser-side Artifact Preprocessor

```text
Blob
+ Web Worker
+ hash/chunk/parse
→ compact metadata/result
→ Bridge only when local persistence is required
```

### C2 — Deterministic HTML Normalizer

```text
captured HTML/MHTML-derived HTML fragment
→ DOMParser
→ normalized structural JSON
→ AI reasoning / evidence diff
```

### C3 — Browser Media Processor

```text
tab/display media
→ offscreen document
→ media APIs/worker
→ evidence artifact
```

### C4 — Invisible Document Worker

```text
service-worker request
→ offscreen DOM task
→ result
```

without opening a visible tab/window.

### C5 — Offscreen Broker

```text
many Browser Runtime jobs
→ one offscreen process plane
→ multiplexed bounded worker jobs
→ results/checkpoints elsewhere
```

---

## 15. Failure modes / limitations

1. **Singleton bottleneck** — all jobs compete for one document per profile.
2. **Not durable** — browser/extension shutdown destroys it.
3. **No general Chrome API surface inside** — only `chrome.runtime`; Chrome API operations must route back through the service worker.
4. **Static top-level page** — offscreen URL must be bundled extension HTML, so runtime code/data architecture still needs explicit delivery mechanisms.
5. **Memory pressure / large-artifact ceiling** — practical limits are not documented as a stable contract; must be measured.
6. **Messaging race** — processor may not exist when a job arrives; ensure/create/handshake required.
7. **One processor can become a failure domain** — a bad provider-specific task must not poison all other jobs.
8. **Reason mismatch / scope creep** — architecture should create the document for actual documented reasons rather than treating it as an unrestricted hidden background page.

---

## 16. Micro-proof design

Run only with bundled test resources / controlled pages.

### MP-1 — lifecycle

1. create offscreen document;
2. confirm via `runtime.getContexts()` / `hasDocument()` when available;
3. close and recreate;
4. attempt duplicate create and record deterministic error.

### MP-2 — runtime messaging

1. send job with job ID;
2. offscreen acknowledges version/capabilities;
3. return deterministic result;
4. test service-worker reconnect while document remains active.

### MP-3 — DOMParser

Parse controlled HTML with nested nodes/forms/tables and compare normalized result to expected JSON.

### MP-4 — Blob

Create controlled Blob, convert to ArrayBuffer, hash it, chunk it, create/revoke object URL and verify deterministic output.

### MP-5 — Worker

Spawn dedicated worker from offscreen document and execute a CPU-bound deterministic transformation. Record throughput and cancellation behavior.

### MP-6 — singleton broker

Dispatch multiple concurrent jobs through one offscreen document; verify isolation, correlation and bounded concurrency.

### MP-7 — service-worker lifecycle separation

Verify whether an already-running offscreen worker job continues while the extension service worker is allowed to become idle, then reconnect and recover result/state. Treat outcome as empirical, not assumed.

### MP-8 — browser/extension restart

Restart/reload and verify offscreen context disappears; durable local checkpoint survives and processor is recreated.

### MP-9 — localStorage bridge

Write known data in offscreen localStorage and migrate it through runtime messaging into canonical durable storage.

### MP-10 — resource ceiling

Measure memory/latency on increasing Blob sizes and worker payloads. Do not define production envelope until measured.

---

## 17. PASS criteria

EXP-10 passes if controlled proof shows:

- offscreen lifecycle can be modeled deterministically;
- one document can multiplex several isolated jobs;
- DOMParser/Blob/Worker primitives behave predictably;
- browser-side processing survives ordinary service-worker idleness sufficiently for bounded jobs, or its actual limitation is measured;
- restart destroys only ephemeral processor state, not authoritative workflow state;
- service worker can reconstruct/recreate the processor;
- no provider-specific selector or production website is required;
- practical artifact-size/throughput ceiling is measured rather than assumed.

---

## 18. Repo evidence status

Current worker manifests/code have previously been audited with no `chrome.offscreen` usage.

Therefore:

```text
chrome.offscreen Browser Processing Plane
Repo status: NOT YET IMPLEMENTED
Technical basis: DOCUMENTED / LIKELY
Proof status: NEEDS MICRO-PROOF
```

Repo absence does not limit the theoretical platform ceiling.

---

## 19. Side finding — EXP-02 capability probe can be cleaner than previously recorded

Chrome's general extension permissions documentation explicitly exposes:

```text
chrome.extension.isAllowedFileSchemeAccess()
```

to detect whether the user enabled **Allow access to file URLs**.

This closes most of the earlier G5 question about a programmatic signal for that toggle.

However EXP-02 should still micro-proof that this setting correlates exactly with `chrome.debugger`'s `MayReadLocalFiles()` / `DOM.setFileInputFiles` behavior on the controlled upload path.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

---

## 20. Current conclusion

`chrome.offscreen` materially expands the Browser Runtime, but in a different direction from CDP.

CDP expands **privileged observation/actuation of live browser targets**.

Offscreen expands **document-based browser-native processing that service workers cannot perform directly**.

The strongest current model is:

```text
Local Orchestrator — durable story / files / CLI / DB / scheduler
        ↕
Loopback Bridge
        ↕
Service Worker — browser control plane
        ↕
Offscreen Broker — ephemeral DOM/Blob/Worker/media compute plane
        ↕
Content Script + CDP — live website adapters/actuators
```

This suggests the platform should not force every transformation through the Bridge. Work should execute in the cheapest execution zone that naturally owns the primitive, while durable truth remains outside ephemeral Chrome contexts.

---

## Sources

- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/storage/
- https://developer.chrome.com/blog/Offscreen-Documents-in-Manifest-v3/
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://chromium.googlesource.com/chromium/src/+/HEAD/extensions/common/api/offscreen.webidl
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_document_manager.cc
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/lifetime_enforcer_factories.cc
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/extensions/browser/api/offscreen/offscreen_api.cc
- https://chromium.googlesource.com/chromium/src/+/refs/tags/136.0.7067.2/extensions/browser/offscreen_document_host.h

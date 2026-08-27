# Phase 1 Factual Corrections — 2026-08-28

**Status:** Active correction addendum  
**Scope:** Correct factual claims in `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`, especially the appended `## CC Independent Research — Phase 1` section.  
**Rule:** Where this file conflicts with the living draft, this file wins until the living draft is normalized.

## 1. `chrome.debugger` allowed-domain count

Current Chrome documentation lists **27** CDP domains exposed through `chrome.debugger`:

Accessibility, Audits, CacheStorage, Console, CSS, Database, Debugger, DOM, DOMDebugger, DOMSnapshot, Emulation, Fetch, IO, Input, Inspector, Log, Network, Overlay, Page, Performance, Profiler, Runtime, Storage, Target, Tracing, WebAudio, WebAuthn.

Therefore the CC claim "26 domains" is incorrect.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

## 2. Current Chromium trust/file-access gates

The current `DevToolsAgentHostClient` interface uses:

- `MayAttachToURL(...)`
- `MayAttachToRenderFrameHost(...)`
- `IsTrusted()`
- `MayAccessAllCookies()`
- `MayReadLocalFiles()`
- `MayWriteLocalFiles()`
- `AllowUnsafeOperations()`

The older `MayAttachToBrowser()` API appears in historical Chromium revisions but is **not** the current interface.

For `ExtensionDevToolsClientHost`, current Chromium source shows:

```text
IsTrusted()          -> ExtensionIsTrusted(*extension_)
MayReadLocalFiles()  -> util::AllowFileAccess(extension_->id(), profile_)
MayWriteLocalFiles() -> false
```

So the CC architectural conclusion about local-file gating remains directionally valid, but its explanation must use the current gate names/model.

Sources:
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/browser/devtools_agent_host_client.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/debugger/debugger_api.cc

## 3. `Target` reach under page-level extension debugger sessions

Current Chromium `TargetHandler::AccessMode::kAutoAttachOnly` explicitly documents:

> Only setAutoAttach is supported. Any non-related target are not accessible.

Current implementation rejects at least:

- `Target.setDiscoverTargets`
- `Target.getTargets`
- `Target.attachToTarget`
- `Target.createTarget`

when the handler is in `kAutoAttachOnly` mode, while `Target.setAutoAttach` remains the intended related-target mechanism.

Important distinction:

```text
chrome.debugger.getTargets()     !=     CDP Target.getTargets
```

The extension API `chrome.debugger.getTargets()` remains independently available.

Sources:
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.cc
- https://developer.chrome.com/docs/extensions/reference/api/debugger

## 4. Page method status correction

Current tip-of-tree/stable-1.3 CDP docs mark:

- `Page.setInterceptFileChooserDialog` — **Experimental**
- `Page.captureSnapshot` — **Experimental**
- `Page.setDownloadBehavior` — **Experimental + Deprecated**
- `Page.setBypassCSP` — not marked Experimental
- `Page.createIsolatedWorld` — not marked Experimental
- `Page.printToPDF` — not marked Experimental

Therefore CC's table incorrectly labeled `Page.setInterceptFileChooserDialog` stable.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Page/
- https://chromedevtools.github.io/devtools-protocol/1-3/Page/

## 5. Corrections accepted from CC

The following CC findings are retained as important Phase-1 evidence:

1. Current repo Bridge transport is a loopback WebSocket design rather than Chrome Native Messaging.
2. Chrome 116+ active WebSocket traffic can extend MV3 service-worker lifetime by resetting the idle timer.
3. The generic service-worker lifecycle still documents a five-minute limit for a single request, with specific API exceptions.
4. `chrome.userScripts` and `chrome.offscreen` are major previously omitted capability families.
5. Current repo workers do not yet implement `chrome.debugger`; repo CDP evidence is partial/prototype-level rather than deployed worker capability.
6. Local-machine primitives described in the reach model must remain theoretical/reachable unless separately proven in repo implementation.

## 6. EXP-02 local-file upload correction

`DOM.setFileInputFiles` must not be treated as automatically available merely because the extension has `debugger` permission.

Current Chromium extension debugger client gates local file reads through:

```text
MayReadLocalFiles()
-> util::AllowFileAccess(extension_id, profile)
```

and `MayWriteLocalFiles()` returns false.

Therefore the local-path upload route is **setup-gated / needs runtime probe** rather than universally open.

This does not invalidate the broader Artifact Bus hypothesis; it changes strategy ranking and requires a fallback path.

## 7. Research discipline going forward

For all next experiments:

- Chrome extension API docs define extension-level surface.
- Current Chromium source is used where the behavior is gated below domain level.
- Full CDP docs do **not** imply `chrome.debugger` reach by themselves.
- Experimental/deprecated status must be recorded explicitly.
- Repo implementation remains evidence only, never the theoretical ceiling.

---

**Next study:** EXP-08 — popup / new-tab / redirect / target handoff.

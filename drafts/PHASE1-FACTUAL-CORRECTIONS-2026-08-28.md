# Phase 1 Factual Corrections — 2026-08-28

**Status:** Active factual-reconciliation addendum  
**Scope:** Record source-level corrections discovered while auditing `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`.  
**Rule:** **Current primary source wins.** If this file, the living draft, GPT, or CC disagree, flag the claim and re-verify against current Chrome docs / CDP PDL+protocol JSON / Chromium source before treating it as canonical.

## 1. `chrome.debugger` allowed-domain count

Current Chrome documentation lists **27** CDP domains exposed through `chrome.debugger`:

Accessibility, Audits, CacheStorage, Console, CSS, Database, Debugger, DOM, DOMDebugger, DOMSnapshot, Emulation, Fetch, IO, Input, Inspector, Log, Network, Overlay, Page, Performance, Profiler, Runtime, Storage, Target, Tracing, WebAudio, WebAuthn.

The original GPT draft presented a **sample**, not a complete enumeration. CC initially transcribed the complete list as 26; the correct count is 27.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

## 2. Current Chromium trust / cookie / file-access gates

Current `DevToolsAgentHostClient` includes:

- `MayAttachToURL(...)`
- `MayAttachToRenderFrameHost(...)`
- `IsTrusted()`
- `MayAccessAllCookies()`
- `MayReadLocalFiles()`
- `MayWriteLocalFiles()`
- `AllowUnsafeOperations()`

The historical `MayAttachToBrowser()` API is not the current trust gate.

Current `ExtensionDevToolsClientHost` overrides:

```text
MayAccessAllCookies() -> false
IsTrusted()           -> ExtensionIsTrusted(*extension_)
MayReadLocalFiles()   -> util::AllowFileAccess(extension_->id(), profile_)
MayWriteLocalFiles()  -> false
```

`ExtensionIsTrusted()` currently grants trusted status only to Chromium's hard-coded Perfetto UI extension identity (with its own location/switch conditions). A normal extension we ship should therefore be modeled as **untrusted**.

Sources:
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/browser/devtools_agent_host_client.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/debugger/debugger_api.cc

## 3. `Target` reach under page-level extension debugger sessions

Current Chromium `TargetHandler::AccessMode::kAutoAttachOnly` is a hard reach boundary for ordinary extension debugger sessions.

Under this mode, generic target discovery/control commands including at least:

- `Target.setDiscoverTargets`
- `Target.getTargets`
- `Target.attachToTarget`
- `Target.createTarget`
- `Target.activateTarget`

are rejected, while `Target.setAutoAttach` is the related-target mechanism that survives.

Important asymmetry:

```text
chrome.debugger.getTargets()     !=     CDP Target.getTargets
```

The Chrome Extension API remains independently available even when the CDP command is blocked.

Sources:
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/target_handler.cc
- https://developer.chrome.com/docs/extensions/reference/api/debugger

## 4. Page protocol status — corrected after PDL / stable-channel verification

`Page.setInterceptFileChooserDialog` is a **stable command**.

The current PDL declares:

```text
command setInterceptFileChooserDialog
  parameters
    boolean enabled
    experimental optional boolean cancel
```

Therefore the **`cancel` parameter is experimental**, not the command itself.

This is also consistent with stable CDP 1.3: `setInterceptFileChooserDialog` is present, while genuinely experimental-only commands such as `Page.captureSnapshot` are excluded from that stable subset.

Other relevant status notes:

- `Page.captureSnapshot` — Experimental
- `Page.setDownloadBehavior` — Experimental + Deprecated
- `Page.setBypassCSP` — stable
- `Page.createIsolatedWorld` — stable
- `Page.printToPDF` — stable
- `Emulation.setLocaleOverride` — Experimental
- `DOMSnapshot` and `Storage` are experimental at the domain level in CDP metadata; individual command interpretation must preserve that context.

Sources:
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/third_party/blink/public/devtools_protocol/domains/Page.pdl
- https://chromedevtools.github.io/devtools-protocol/1-3/Page/
- https://chromedevtools.github.io/devtools-protocol/tot/Page/

## 5. Corrections accepted from CC

Retained as important Phase-1 evidence:

1. Current repo Bridge transport is **loopback WebSocket**, not Chrome Native Messaging.
2. Chrome 116+ WebSocket traffic can reset MV3 service-worker idle timers.
3. The generic service-worker lifecycle still documents a five-minute limit for a single request, with specific API exceptions.
4. `chrome.userScripts` and `chrome.offscreen` are major previously omitted capability families.
5. Current repo workers do not yet implement `chrome.debugger`; repo CDP evidence is prototype/partial rather than deployed worker capability.
6. Local-machine primitives in the reach model remain theoretical/reachable unless separately proven by repo implementation.
7. `kAutoAttachOnly` makes related-target auto-attach a hard architectural constraint, not merely a convenience.

## 6. EXP-02 local-file upload correction

`DOM.setFileInputFiles` must not be treated as automatically available merely because the extension has `debugger` permission.

Current Chromium extension debugger client gates local file reads through:

```text
MayReadLocalFiles()
-> util::AllowFileAccess(extension_id, profile)
```

and `MayWriteLocalFiles()` returns false.

Therefore the local-path upload route is **setup-gated / capability-probed**, not universally open. The broader Artifact Bus hypothesis remains valid, but strategy ranking needs a fallback path.

## 7. Research discipline going forward

- Chrome Extension API docs define extension-level surface.
- CDP PDL / protocol JSON are preferred for Stable / Experimental / Deprecated flags.
- Current Chromium source is used where reach is gated below domain level.
- Full CDP does **not** imply `chrome.debugger` reach.
- Repo implementation remains evidence only, never the theoretical ceiling.
- Newer internal notes do not override primary evidence automatically.

---

**Latest completed study:** EXP-09 — `chrome.userScripts` Dynamic Adapter Delivery.  
**Next planned study:** EXP-10 — `chrome.offscreen` Browser-side Processing Runtime.

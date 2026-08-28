# Chrome Extension + Native Bridge Capability Reach Study V0

**Status:** Living draft  
**Date:** 2026-08-28  
**Scope:** Study technical reach first; map provider/regulation boundaries alongside use cases later.  

## 1. Primary question

How far can this stack reach technically?

```text
AI Orchestrator
      ↓
Persistent Local Runtime / Native Bridge
      ↓
Chrome Extension Control Plane
      ↓
Content Script + Chrome APIs + chrome.debugger/CDP
      ↓
Authenticated browser sessions / web apps
```

The repo is only an **evidence layer** for capabilities already proven. It must not be treated as the ceiling of the platform.

---

## 2. Working capability model

### Zone A — Page / Content Script

Can provide app-specific understanding and ordinary browser interaction:

- read/mutate DOM;
- observe DOM/page events;
- fill inputs / click elements;
- inject JS/CSS through `chrome.scripting`;
- run in `ISOLATED` or `MAIN` world;
- target top frame, selected frames or all permitted frames;
- message the extension service worker.

**Best role:** default site-adapter layer because it is simpler and easier to constrain.

**Weaknesses:** DOM churn, complex cross-origin frames, browser-input semantics, hidden SPA state, and network lifecycle signals.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts

### Zone B — Privileged browser runtime

Ordinary Chrome APIs add browser-level capabilities such as tabs, navigation, downloads, storage, alarms, capture, cookies and other permission-gated browser state.

CDP through `chrome.debugger` adds a separate high-power layer.

### Zone C — Local runtime / Native Bridge

Native Messaging is transport between Chrome and a registered local process. The native host's own implementation and OS permissions define local reach.

Potential local primitives include:

- filesystem;
- process / CLI execution;
- local HTTP / sockets;
- databases;
- durable queue/checkpoint;
- scheduler;
- artifact processing;
- file watchers;
- Git/repo interaction;
- other local agents/apps.

Therefore Bridge should not be understood as “send prompt/save result”. That is merely one protocol implemented over a much broader transport boundary.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

---

## 3. `chrome.debugger` / CDP — key reach finding

`chrome.debugger` is an alternate transport for Chrome DevTools Protocol.

It can instrument network interaction, JavaScript runtime, DOM/CSS and other browser internals. It does **not** expose all CDP domains; Chrome explicitly restricts the surface for security reasons.

Current documented allowed domains include major automation-relevant areas such as:

- DOM / DOMSnapshot / DOMDebugger;
- Runtime;
- Input;
- Network;
- Fetch;
- Page;
- Storage;
- Target;
- Emulation;
- IO;
- Accessibility;
- Tracing;
- WebAuthn.

**Architectural meaning:** CDP may become a shared “power runtime” above ordinary content-script automation.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 4. High-value CDP primitives

### DOM

Potentially useful primitives include deep DOM inspection, box models, node lookup, focus/mutation, shadow/frame traversal and direct file assignment to `<input type=file>` using `DOM.setFileInputFiles`.

Compound possibility:

```text
Local artifact path
→ Bridge
→ CDP DOM.setFileInputFiles
→ authenticated web application
```

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/

### Input

The Input domain can dispatch keyboard, mouse, wheel, touch, drag and text insertion events. This is technically different from only assigning DOM values or calling `element.click()`.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Input/

### Runtime

Runtime provides execution contexts, JS evaluation, function calls, promises and object inspection. It can expose SPA/page state that is not represented cleanly in rendered DOM.

Source:
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

### Network + Fetch

Network can observe request/response metadata, headers, timing, bodies and resource/WebSocket activity.

Fetch can pause matching requests and continue/fail/modify/fulfill selected requests and handle auth challenges.

Potential state model:

```text
browser action
→ request observed
→ backend transition observed
→ page confirmation
→ checkpoint
```

This may be substantially more reliable than inferring all state from DOM spinners.

Sources:
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

---

## 5. EXP-01 deep dive — CDP attach/lifecycle

### 5.1 Attach model

`chrome.debugger.attach({tabId}, requiredVersion)` creates a root debugger session. Chrome's current documentation uses protocol version `0.1` as the normal required-version example.

`chrome.debugger.getTargets()` returns available targets and whether a debugger is already attached, so it should be a preflight capability rather than blindly attaching.

Attach/send operations reject their Promise on failure, which is suitable for a deterministic runtime state machine.

### 5.2 A tab is not one execution environment

Chrome documents two different frame cases:

- same-process frames can share one target but use separate Runtime execution contexts;
- out-of-process iframes can become separate targets.

Workers can also be targets.

From **Chrome 125+**, `DebuggerSession.sessionId` supports flat child sessions. `Target.setAutoAttach({flatten:true})` can attach related targets such as OOPIFs/workers without creating another root debugger attachment.

Important limitation: auto-attach is **not recursive**. In an A → B → C nested cross-origin frame tree, A can discover B, but B itself needs auto-attach configured to discover C.

**Recommendation:** target/frame/session registry must be a shared Browser Runtime primitive, never duplicated per GPT/Gemini/Flow adapter.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Target/

### 5.3 Detach lifecycle

`chrome.debugger.onDetach` is a first-class lifecycle event.

Current documented reasons:

- `target_closed`
- `canceled_by_user`

Chrome specifically states that opening DevTools for a tab already attached by `chrome.debugger` terminates that debugging session.

Therefore DevTools conflict should be modeled as a recoverable runtime state, not a mysterious crash.

```text
ATTACHED
→ user opens DevTools
→ DETACHED(canceled_by_user)
→ preserve authoritative job checkpoint
→ wait / re-evaluate
→ safe reattach when possible
```

Source:
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 6. Important correction — MV3 lifetime ceiling is higher than first assumed

The generic MV3 rule remains: service workers can normally terminate after about 30 seconds of inactivity, and Chrome advises persisting state instead of relying on globals.

But two documented Chrome changes materially improve this platform:

- **Chrome 105+**: an active `chrome.runtime.connectNative()` connection keeps the extension service worker alive. If the native host crashes/closes, the port closes and normal lifetime timers resume.
- **Chrome 118+**: an active `chrome.debugger` session keeps the extension service worker alive.

Therefore this statement is too simplistic:

> “MV3 means a long browser runtime necessarily dies after ~30 seconds.”

A better model is:

```text
Native Host connection ─┐
                        ├─> service worker can remain active
Debugger session ───────┘
```

This raises the practical ceiling for long-running browser workers.

However **durable orchestration state should still remain local**, because Chrome/browser/extension/native-host processes can restart, detach or crash.

### Recommended responsibility boundary

**Extension / Browser Runtime owns:**

- active tab/target/frame/session registry;
- page adapters;
- live browser events;
- debugger connection state;
- reconstructable short/medium-lived execution state.

**Local Orchestrator remains SSOT for:**

- big-story state;
- multi-hour / multi-day jobs;
- queues;
- dependency graph;
- retry history;
- checkpoint history;
- artifact registry;
- authoritative job status;
- scheduling and recovery.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

---

## 7. `debugger` permission cost

This capability is technically powerful but has non-trivial UX/security cost.

Chrome documents install warnings for the `debugger` permission including:

- access the page debugger backend;
- read and change all data on all websites.

Chrome also lists `debugger` among permissions that **cannot be specified as optional permissions**.

This suggests a possible architecture hypothesis:

```text
NORMAL MODE
content scripts + ordinary Chrome APIs

POWER MODE
chrome.debugger/CDP as required privileged capability
```

This is not locked yet. We need empirical evidence before deciding whether CDP should always be enabled or remain selective.

Sources:
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/permissions

---

## 8. EXP-01 micro-proof specification

Run only on a controlled test page. No provider-specific automation is needed.

Measure:

1. enumerate targets with `getTargets()`;
2. attach to one controlled HTTPS tab;
3. record attach latency/failure behavior;
4. enable Runtime, DOM, Page and Target;
5. enumerate root frame and execution contexts;
6. enable flat auto-attach for child targets;
7. validate recursive nested-target registration;
8. perform one read-only `Runtime.evaluate`;
9. dispatch one harmless Input event;
10. verify debugger keep-alive beyond ordinary service-worker idle window;
11. open DevTools and record `onDetach` reason;
12. attempt safe reattach after DevTools closes;
13. close target and record detach reason;
14. detach cleanly;
15. repeat with Native Bridge port connected/disconnected.

### PASS criteria

- attach/detach lifecycle is deterministic enough to model as state;
- child target/session routing is reconstructable;
- debugger detach never destroys authoritative job state;
- observed service-worker behavior matches documented Chrome lifecycle;
- proof requires no site-specific selector;
- all actions occur on controlled test infrastructure.

### Proposed runtime state machine

```text
DETACHED
  ↓
ATTACHING
  ↓ success
ATTACHED
  ↓ discover contexts/targets
READY
  ↓ action
BUSY
  ↓ complete
READY

Any state
  ├─ tab close ───────────> DETACHED(target_closed)
  ├─ DevTools/user ───────> DETACHED(canceled_by_user)
  ├─ extension restart ───> RECOVERING
  └─ Bridge loss ─────────> DEGRADED / RECOVERING
```

### Decision unlocked by EXP-01

If stable, CDP becomes a **shared Browser Runtime capability** consumed by site adapters.

If permission/conflict/detach behavior is operationally expensive, CDP remains a **selective power tool** used only where content scripts cannot provide reliable reach.

---

## 9. First compound-capability map

### C1 — Reliable authenticated web worker

```text
tab management
+ DOM semantics
+ browser input
+ network lifecycle
+ authenticated session
+ checkpoint
```

### C2 — Local artifact → web app

```text
filesystem
+ Bridge
+ file-input primitive
+ browser workflow
```

### C3 — Web app → local artifact

```text
authenticated web app
+ download/state observation
+ Bridge
+ local artifact processor
```

### C4 — Multi-web-app workflow

```text
Orchestrator
→ authenticated app A
→ app B
→ app C
→ local checkpoint
```

### C5 — Multi-AI workflow

```text
AI worker A
→ worker B critique/transform
→ creation worker C
→ QA
→ artifact/checkpoint
```

GPT/Gemini/Google Flow are examples of adapters inside this broader model, not the platform boundary.

### C6 — Network-assisted state machine

Browser action and DOM signals can be correlated with backend request/response events instead of relying only on selectors/spinners.

### C7 — Long-running browser/local execution

```text
durable local story
→ wake/use browser actuator
→ bounded task
→ persist evidence
→ retry/wait
→ continue later
```

---

## 10. Architecture hypothesis V0

### Site Adapter

Provider/app-specific:

- selectors and semantics;
- page states;
- app-specific failure detection.

### Shared Browser Runtime

Provider-independent:

- tabs/windows;
- content-script execution;
- target/frame/session registry;
- debugger attach/detach;
- safe DOM/Input/Runtime primitives;
- network observation;
- downloads;
- screenshots/evidence;
- capability probes.

### Native Runtime

- filesystem;
- process/CLI;
- durable queue/checkpoint;
- scheduler;
- artifact registry;
- local logs/evidence.

### Orchestrator

- workflow graph;
- worker selection;
- retry/fallback;
- human gates;
- multi-day continuity.

---

## 11. Reach and regulation must remain separate dimensions

Every future capability/use case should receive two independent classifications.

### Axis A — Technical reach

- proven;
- likely;
- needs experiment;
- constrained;
- impossible under current architecture.

### Axis B — Boundary/regulation

- allowed;
- constrained;
- provider-policy uncertain;
- prohibited/high-risk;
- needs further study.

This avoids two mistakes:

1. treating policy uncertainty as technical impossibility;
2. treating technical possibility as automatic permission to deploy.

---

## 12. Repo evidence layer — pending

Later, inspect current GPT/Gemini/Google Flow/Bridge implementations only to answer:

> Which theoretical primitives above have already been proven by our code?

Evidence should include file path + function/module + measured behavior.

Repo evidence must **not** redefine the theoretical capability ceiling.

---

## 13. Next experiments

- **EXP-01:** CDP attach/lifecycle — current priority.
- **EXP-02:** Local file path → `DOM.setFileInputFiles` → controlled web input.
- **EXP-03:** Browser action → Network/Fetch event → DOM correlation.
- **EXP-04:** nested cross-origin frame/worker target registry.
- **EXP-05:** extension/browser restart recovery with durable local checkpoint.

---

## 14. Current conclusion

The likely ceiling is much higher than separate GPT/Gemini/Flow extensions suggest.

The strongest model currently is:

> **Extension/CDP is a browser actuator attached to a persistent local orchestrator, not merely an extension with a helper Bridge.**

Potential end-to-end workflow:

```text
observe browser
→ reason
→ act on authenticated web app
→ exchange data with local runtime
→ act on another app
→ persist checkpoint
→ resume later
```

The next architectural decision depends on EXP-01: whether CDP is reliable enough to become a standard shared runtime layer or should remain an escalation/fallback layer.

---

## Sources

Official Chrome/Chromium references:

- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle
- https://developer.chrome.com/docs/extensions/reference/api/permissions
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
- https://developer.chrome.com/docs/extensions/reference/api/tabs
- https://developer.chrome.com/docs/extensions/reference/api/downloads
- https://chromedevtools.github.io/devtools-protocol/tot/Target/
- https://chromedevtools.github.io/devtools-protocol/tot/DOM/
- https://chromedevtools.github.io/devtools-protocol/tot/Input/
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
- https://chromedevtools.github.io/devtools-protocol/tot/Network/
- https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

---

# CC Independent Research — Phase 1

**Researcher:** CC (Claude) · **Date:** 2026-08-28 · **Mode:** Information collection only, no architecture debate.
**Method:** external official sources first (Chrome docs → CDP docs → Chromium source/issues), repo read last.
Repo was used **only** to label PROVEN / PARTIAL / NOT YET IMPLEMENTED. It did not set the ceiling.

**Evidence tags used below**
`[DOC]` official Chrome/CDP documentation · `[SRC]` Chromium source or tracked issue ·
`[READ]` I opened the repo file and read it · `[NV]` NEEDS VERIFICATION.

---

## Tóm tắt cho Đức (5 dòng, tiếng Việt)

1. Bản nháp của GPT **liệt kê thiếu gần một nửa** số CDP domain mà `chrome.debugger` thật sự mở ra.
2. Nhưng GPT cũng **lạc quan quá** ở một chỗ quan trọng: đường "file trong máy → ô upload của web"
   bị khoá sau một **công tắc người dùng phải tự bật tay**, không xin bằng code được.
3. **Bridge trong repo KHÔNG phải Native Messaging.** Nó là WebSocket ở `127.0.0.1`. Mọi con số giới hạn
   Native Messaging trong nháp cũ đều không áp cho ta.
4. Cái Bridge đang có **chưa hề chạm tới máy**: không đọc file, không chạy lệnh, không hàng đợi. Nó chỉ chuyển tiếp lệnh.
5. **Không worker nào đang dùng `chrome.debugger`.** Toàn bộ mục CDP hiện là lý thuyết + 1 bản mẫu đọc-only ở gốc repo.

---

## 1. New primitives discovered — not in draft V0

### 1.1 `chrome.userScripts` — arbitrary code, exempt from page CSP

`[DOC]` "the User Scripts API lets you run arbitrary code" — code that content scripts and
`chrome.scripting` are not allowed to run. Default world `USER_SCRIPT` is **isolated and exempt from
the host page's CSP**, and invisible to the page and to other extensions. `register()` persists
across restarts; `execute()` (Chrome 135+) injects on demand. Chrome 120+.

> Source: https://developer.chrome.com/docs/extensions/reference/api/userScripts

**Technical implication:** a site adapter's code no longer has to ship inside the extension package.
The orchestrator can push a *new* adapter for a changed provider DOM **without republishing the
extension**. This is the single biggest missing primitive in draft V0 — it changes adapter delivery
from a release problem into a runtime problem.

**Cost `[DOC]`:** `userScripts` carries **no install warning**, but the user must separately enable it
(a per-extension toggle in Chrome 138+, Developer Mode before that). So it is cheap on warnings,
expensive on setup — the mirror image of `debugger`.

### 1.2 `chrome.offscreen` — 15 documented reasons, not "a hidden page"

`[DOC]` Reasons include `DISPLAY_MEDIA`, `USER_MEDIA`, `WEB_RTC`, `CLIPBOARD`, `BLOBS`,
`DOM_PARSER`, `WORKERS`, `LOCAL_STORAGE`, `IFRAME_SCRIPTING`, `DOM_SCRAPING`, `GEOLOCATION`,
`MATCH_MEDIA`, `BATTERY_STATUS`, `AUDIO_PLAYBACK`, `TESTING`.

Limits `[DOC]`: exactly **one** offscreen document per profile at a time; only `chrome.runtime` is
available inside it; only `AUDIO_PLAYBACK` has a lifetime cap (closes after 30s of silence) —
**all other reasons have no documented lifetime limit**.

> Source: https://developer.chrome.com/docs/extensions/reference/api/offscreen

**Technical implication:** `BLOBS` + `WORKERS` + `DOM_PARSER` give the platform a real
**in-browser artifact-processing stage** — hash, transcode, parse, chunk — *before* anything crosses
the Bridge. That relieves the Bridge envelope cap instead of fighting it. `offscreen` costs
**no install warning** `[DOC]`.

### 1.3 WebSocket keep-alive (Chrome 116+) — a third lifetime anchor

Draft V0 lists two keep-alive routes (native messaging Chrome 105, debugger Chrome 118). There is a
third, and it is the one this repo actually depends on:

`[DOC]` **Chrome 116:** "Active WebSocket connections now extend extension service worker lifetimes.
Sending or receiving messages across a WebSocket resets the idle timer."

> Source: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

### 1.4 Full documented service-worker lifetime ladder

`[DOC]` Termination: **30s** idle · a **single request taking >5 min** · a `fetch()` response taking >30s.
Extensions by version: **105** `connectNative()` keeps alive · **109** offscreen messages reset timers ·
**110** extension API calls reset timers · **114** long-lived messaging keeps alive (opening a port
no longer resets) · **116** WebSocket keeps alive; `desktopCapture.chooseDesktopMedia()`,
`identity.launchWebAuthFlow()`, `management.uninstall()`, `permissions.request()` may exceed 5 min ·
**118** debugger session keeps alive · **120** alarms minimum period lowered to **30s**.

**Correction to draft V0 §6:** the 5-minute per-request cap is **still documented and not removed**.
Draft V0 discusses the 30s idle rule but never states the 5-minute cap. Any Bridge RPC modelled as
one long request must stay under 5 minutes or be re-modelled as poll + checkpoint.

### 1.5 `declarativeNetRequest` — header rewriting without `debugger`

`[DOC]` Actions: `block`, `redirect`, `allow`, `upgradeScheme`, `modifyHeaders`, `allowAllRequests`.
`modifyHeaders` does set/remove on **all** request and response headers (append is limited to ~13
listed headers such as `cookie`, `accept`, `user-agent`). Limits: 30,000 dynamic rules, 5,000 session
rules, ≥30,000 static rules, 1,000 regex rules per type.

`declarativeNetRequestWithHostAccess` carries **no install warning** and works from host permissions
the extension already holds `[DOC]`.

> Source: https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest

**Technical implication:** a meaningful slice of what draft V0 assigns to CDP `Fetch` (header shaping,
blocking, redirecting) is reachable with **zero** debugger cost and **zero** yellow infobar.

### 1.6 `chrome.webRequest` in MV3 — observational, with one exception

`[DOC]` "As of Manifest V3, the `webRequestBlocking` permission is no longer available for most
extensions"; "Policy installed extensions can continue to use `webRequestBlocking`." Observational
events (`onSendHeaders`, `onResponseStarted`, `onCompleted`, `onErrorOccurred`, `onBeforeRedirect`)
remain. `webRequestAuthProvider` still enables blocking/asyncBlocking `onAuthRequired`.

> Source: https://developer.chrome.com/docs/extensions/reference/api/webRequest

### 1.7 Capture stack: `tabCapture` + offscreen

`[DOC]` Chrome 116+ flow: user gesture → `chrome.tabCapture.getMediaStreamId()` in the service worker
→ pass the id to an **offscreen document** → `getUserMedia()` there. Recording in an offscreen
document survives page navigation; recording started from a content script "will automatically end
when the user navigates to a new page." `getDisplayMedia()` needs **no permission** but always shows
a consent dialog.

> Source: https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture

### 1.8 The exact non-optional permission list

`[DOC]` Cannot be declared as optional permissions: **`debugger`, `declarativeNetRequest`, `devtools`,
`geolocation`, `mdns`, `proxy`, `tts`, `ttsEngine`, `wallpaper`**.
`permissions.request()` must be called from inside a user gesture.

> Source: https://developer.chrome.com/docs/extensions/reference/api/permissions

**This confirms draft V0 §7's claim about `debugger`** — and adds that `declarativeNetRequest`
(the un-suffixed one) and `proxy` are equally locked. The `WithHostAccess` variant is not.

`[DOC]` `debugger` warnings, verbatim: *"Access the page debugger backend."* and
*"Read and change all your data on all websites."*

---

## 2. CDP reach findings

### 2.1 Correction — draft V0's domain list is incomplete

Draft V0 §3 names **15 domains across 13 bullets** (its first bullet packs three:
`DOM / DOMSnapshot / DOMDebugger`). The documented set is **27** `[DOC]`, verbatim:

> "The available domains are: Accessibility, Audits, CacheStorage, Console, CSS, Database, Debugger,
> DOM, DOMDebugger, DOMSnapshot, Emulation, Fetch, IO, Input, Inspector, Log, Network, Overlay, Page,
> Performance, Profiler, Runtime, Storage, Target, Tracing, WebAudio, and WebAuthn."

> Source: https://developer.chrome.com/docs/extensions/reference/api/debugger

**In fairness to draft V0:** its wording is *"allowed domains **include** major automation-relevant
areas **such as**"* — it was explicitly presenting a sample, not claiming a complete enumeration. So
this is a *completion*, not a contradiction. The 12 domains it does not mention are still worth naming,
because each is load-bearing and their absence shaped the rest of the study.

**Missing from draft V0, and each one is load-bearing:**

| Domain | Why it matters |
|---|---|
| **Debugger** | JS breakpoints, pause-on-exception, step. Lets the platform stop *inside* provider code, not just watch its output. |
| **CSS** | Computed styles, matched rules — decide "is this button actually disabled/hidden" without heuristics. |
| **Overlay** | Draws inspector highlights — turns a selector claim into a screenshot a human can check. |
| **Log** | Browser-level log entries (network/security/deprecation) that never reach `console`. |
| **Console** | Legacy console stream. |
| **CacheStorage** / **Database** | Read the SPA's offline cache and WebSQL directly. |
| **Performance** / **Profiler** | Frame/JS timing — distinguish "page is slow" from "page is stuck". |
| **Audits** / **Inspector** / **WebAudio** | Lower value here, but real. |

### 2.2 The hard ceiling: `chrome.debugger` ≠ full CDP, and the gate is per-client, not per-domain

This is the distinction the brief asked for, and it is **not** enforced by a domain allowlist.
It is enforced by virtual methods on the CDP client object.

`[SRC]` `content/public/browser/devtools_agent_host_client.h` defines the gates:

The current interface declares exactly these virtual methods, in this order `[SRC]`
(plus the destructor and two pure-virtual message hooks, `DispatchProtocolMessage` and
`AgentHostClosed`):

| Line | Method |
|---|---|
| `:35` | `MayAttachToURL(const GURL& url, bool is_webui)` |
| `:39` | `MayAttachToRenderFrameHost(RenderFrameHost*)` |
| `:46` | `IsTrusted()` |
| `:50` | `MayReadLocalFiles()` |
| `:54` | `MayWriteLocalFiles()` |
| `:60` | `AllowUnsafeOperations()` |
| `:67` | `GetNavigationInitiatorOrigin()` |
| `:70` | `UsesBinaryProtocol()` |
| `:74` | `GetTypeForMetrics()` |

**That is the complete list.** A review addendum circulated alongside this pass also listed a
`MayAccessAllCookies()` on this interface; **it is not there** — `grep` over the current header returns
zero occurrences. Noted so the enumeration above is not "corrected" back to something inaccurate.
`[SRC]`

The three that matter here, comments verbatim:

- **`IsTrusted`** — *"Returns true if the client is considered to be in the same trust domain from
  security perspective. It implies that the client is allowed to attach to the browser agent host and
  perform other privileged operations."*
- **`MayReadLocalFiles`** — *"Returns true if the client is allowed to read local files over the
  protocol. Example would be exposing file content to the page under debug."*
- **`MayWriteLocalFiles`** — *"Returns true if the client is allowed to write local files over the
  protocol. Example would be manipulating a deault downloads path."* (sic — typo is in the source)

> Source: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/browser/devtools_agent_host_client.h

**Naming correction (2026-08-28).** An earlier revision of this section attributed the browser-target
block to a virtual `MayAttachToBrowser()`. **No such method exists in the current interface** — the
browser-wide trust gate is `IsTrusted()`. The old name survives only as a *local variable* at the call
site, which is almost certainly where the stale naming came from. The conclusion is unchanged; the
mechanism is now stated correctly.

`[SRC]` For the extension client, in `chrome/browser/extensions/api/debugger/debugger_api.cc`:

```cpp
bool ExtensionDevToolsClientHost::IsTrusted() {          // :829
  return ExtensionIsTrusted(*extension_);
}
bool ExtensionDevToolsClientHost::MayReadLocalFiles() {  // :833
  return util::AllowFileAccess(extension_->id(), profile_);
}
bool ExtensionDevToolsClientHost::MayWriteLocalFiles() { // :837
  return false;
}
```

And `ExtensionIsTrusted` itself `[SRC]` (`debugger_api.cc:269`) is **stricter than "returns false for
extensions"** — it is an allowlist of exactly one hardcoded extension:

```cpp
bool ExtensionIsTrusted(const Extension& extension) {
  if (extension.id() != extension_misc::kPerfettoUIExtensionId) {
    return false;
  }
  return !Manifest::IsUnpackedLocation(extension.location()) ||
         base::CommandLine::ForCurrentProcess()->HasSwitch(
             ::switches::kAllowUnpackedPerfettoExtension);
}
```

**For any extension we could ever ship, `IsTrusted()` is unconditionally `false`.** This is not a
policy that might be relaxed per-permission — it is an identity check against the Perfetto UI
extension ID.

`[SRC]` The access mode follows directly from that, in
`content/browser/devtools/render_frame_devtools_agent_host.cc:450` (identical logic in
`web_contents_devtools_agent_host.cc:414`):

```cpp
const bool may_attach_to_browser = session->GetClient()->IsTrusted();
session->CreateAndAddHandler<protocol::TargetHandler>(
    may_attach_to_browser
        ? protocol::TargetHandler::AccessMode::kRegular
        : protocol::TargetHandler::AccessMode::kAutoAttachOnly, …);
```

So an extension's page/WebContents debugger session always receives
**`TargetHandler::AccessMode::kAutoAttachOnly`**.

**Three consequences, all of which change draft V0's architecture options:**

1. **The browser target is closed.** `Target.attachToBrowserTarget`, the `Browser` domain, and
   `Target.createBrowserContext` are unreachable from an extension. Draft V0 §5.2 says the target
   registry "must be a shared Browser Runtime primitive" — correct conclusion, but the *reason* is
   stronger than stated: under `kAutoAttachOnly`, `Target.setAutoAttach` is not merely the
   *recommended* route, it is **the only Target traversal command left** (proven in §2.2b below).
   Draft V0's note that auto-attach is non-recursive therefore becomes a hard architectural
   constraint, not a nuisance.
2. **No per-context isolated identities.** `createBrowserContext(proxyServer, …)` — the natural way to
   run several authenticated accounts in parallel — is out of reach. Parallel identities must be
   solved with **separate Chrome profiles driven by the local host**, not with CDP.
3. **Writing local files over CDP is gated separately from reading them.**

### 2.2b Exactly which `Target.*` commands `kAutoAttachOnly` blocks — G2 RESOLVED

The earlier revision left this as gap **G2** `[NV]`. It is now settled from primary source.
`[SRC]` `content/browser/devtools/protocol/target_handler.cc` — each guard returns
`Response::ServerError(kNotAllowedError)`:

| Command | Under `kAutoAttachOnly` | Guard |
|---|---|---|
| `Target.setAutoAttach` | **allowed** — no access-mode guard | — |
| `Target.getTargets` | **blocked** | `:1435` |
| `Target.attachToTarget` | **blocked** | `:1183` |
| `Target.createTarget` | **blocked** | `:1354` |
| `Target.setDiscoverTargets` | **blocked** | `:1073` |
| `Target.activateTarget` | **blocked** | `:1267` |
| `Target.getTargetInfo` | **own target only** — blocked when `target_id != owner_target_id_` | `:1252` |
| `Target.closeTarget` | **own target or auto-attached sessions only** | `:1287` |
| `createBrowserContext` / `disposeBrowserContext` / `getBrowserContexts` / `attachToBrowserTarget` / `exposeDevToolsProtocol` | **blocked** — guarded by `access_mode_ != kBrowser` | `:1135, :1202, :1306, :1522, :1600, :1628, :1714, :1735` |

**The asymmetry flagged earlier is now proven, not suspected:** the *extension API*
`chrome.debugger.getTargets()` works (shipped and exercised by `observer-engine.js` in this repo),
while the *CDP command* `Target.getTargets` returns `kNotAllowedError`. They are genuinely different
code paths. Any design that assumes CDP-side target enumeration will fail; enumeration must come from
the `chrome.debugger` API, and traversal from `setAutoAttach` alone.

### 2.3 The `DOM.setFileInputFiles` finding — draft V0's flagship compound capability is conditional

Draft V0 §4 and §9 (C2) put this at the centre:
`Local artifact path → Bridge → CDP DOM.setFileInputFiles → authenticated web application`.

`[SRC]` The actual implementation in `content/browser/devtools/protocol/dom_handler.cc`:

```
if (!allow_file_access_)      →  returns "Not allowed"
otherwise                     →  ChildProcessSecurityPolicy::GetInstance()->GrantReadFile(
                                     host_->GetProcess()->GetID(),
                                     base::FilePath::FromUTF8Unsafe(file))
```

> Source: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/dom_handler.cc

`allow_file_access_` for an extension client comes from `MayReadLocalFiles()` → the
**"Allow access to file URLs"** toggle.

**Correction to draft V0:** C2 is **not** unlocked by the `debugger` permission alone. It requires a
**manual, per-extension user toggle that cannot be requested through `chrome.permissions`** (it is not
a permission at all — it is an extension setting). The failure is also silent-ish: a bare
`"Not allowed"` protocol error, easily mistaken for a bad `nodeId`.

**This does not make C2 impossible.** It makes C2 a *setup-gated* capability that must be
**capability-probed at runtime**, and it needs a documented fallback (see CC2 in §4).

### 2.4 Page domain — five primitives draft V0 omits

`[DOC]` https://chromedevtools.github.io/devtools-protocol/tot/Page/

| Command | Status | Reach |
|---|---|---|
| `Page.setBypassCSP` | stable | Turn off the page's Content-Security-Policy for injection. |
| `Page.createIsolatedWorld` | stable | Named world with `grantUniveralAccess` + custom CSP — cross-origin reads from inside the page. |
| `Page.addScriptToEvaluateOnNewDocument` | stable | Adapter code runs **before page JS**, survives navigation. Solves the "SPA reloaded and lost my hooks" class of bug. |
| `Page.captureSnapshot` | experimental | Whole page → **MHTML**, iframes and external resources included. Immutable page evidence in one call. |
| `Page.printToPDF` | stable | Page → PDF, `ReturnAsBase64` or `ReturnAsStream`. |
| `Page.setInterceptFileChooserDialog` | stable | Intercept the OS file-picker instead of racing it. |
| `Page.handleJavaScriptDialog` | stable | Deterministically accept/dismiss `alert`/`confirm`/`beforeunload`. |

`[DOC]` **`Page.setDownloadBehavior` is marked Experimental *and* Deprecated.** Combined with
`MayWriteLocalFiles() == false`, CDP is the wrong tool for controlling download destination —
`chrome.downloads` + `onDeterminingFilename` is the supported path (and is what the repo already does).

**Stability re-verification (2026-08-28).** Every status in this table was re-checked against the
machine-readable protocol definition, not the rendered docs: the `experimental` / `deprecated` flags in
`json/browser_protocol.json` and the `experimental` keyword in `pdl/domains/Page.pdl`. All rows above
are confirmed unchanged.

One row was specifically challenged in review as being Experimental on tip-of-tree —
**`Page.setInterceptFileChooserDialog`** — and **the challenge does not hold**. Four independent
sources agree it is stable:

1. `json/browser_protocol.json` — no `experimental` flag on the command;
2. the rendered `/tot/Page/` reference — no Experimental badge;
3. `pdl/domains/Page.pdl` — the neighbouring command shows what an experimental declaration
   looks like, five lines away:

```
1277:  experimental command waitForDebugger
…
1282:  command setInterceptFileChooserDialog          ← no `experimental` keyword
```

4. **The decisive test — the stable `1-3` protocol, which excludes experimental commands by
   construction.** `Page.setInterceptFileChooserDialog` **is present** in `/1-3/Page/` (6 occurrences,
   with its own command anchor and no Experimental badge), while `Page.captureSnapshot` — genuinely
   experimental — is **absent from that page entirely** (0 occurrences). A command cannot be
   experimental and simultaneously appear in the stable-1.3 surface. The same review cited `/1-3/Page/`
   in support of the challenge; that page in fact refutes it.

It stays marked **stable**. Recorded here rather than silently kept, so the disagreement is auditable.

### 2.5 Fetch domain is stronger than "pause and continue"

`[DOC]` https://chromedevtools.github.io/devtools-protocol/tot/Fetch/

- `Fetch.fulfillRequest` — **"Provides response to the request"**: fabricate a complete synthetic
  response (status, headers, body) without ever contacting the server.
- `Fetch.continueRequest` — rewrite `url`, `method`, `headers`, `postData` mid-flight; `interceptResponse`.
- `Fetch.continueResponse` (experimental) — rewrite status and response headers.
- `Fetch.continueWithAuth` — answer HTTP auth challenges programmatically.
- `Fetch.takeResponseBodyAsStream` → `IO.read` — pull large authenticated bodies in chunks.
- `RequestStage`: `Request` | `Response`.

**Technical implication:** `fulfillRequest` makes **offline rehearsal of a provider adapter** possible —
replay a captured response fixture and exercise the entire success path without spending provider quota.
Draft V0 treats Fetch purely as an observation source; it is also a *simulation* source.

### 2.6 Input domain — what is stable vs experimental

`[DOC]` https://chromedevtools.github.io/devtools-protocol/tot/Input/

- **Stable:** `dispatchKeyEvent`, `dispatchMouseEvent`, `dispatchTouchEvent`, `setIgnoreInputEvents`.
- **Experimental:** `insertText`, `imeSetComposition`, `dispatchDragEvent`, `setInterceptDrags`,
  `synthesizeScrollGesture`, `synthesizePinchGesture`, `synthesizeTapGesture`, `emulateTouchFromMouseEvent`.

**Refinement of draft V0 §4:** draft V0 lists drag and text insertion alongside keyboard/mouse as if
equally solid. They are not — `insertText` and `dispatchDragEvent` are **experimental** and should not
carry a production path without a fallback. `[NV]` The docs do not state whether dispatched events
arrive with `isTrusted === true`; this is widely assumed but I found **no official statement**. It must
be measured, because provider guards may check it.

### 2.7 DOMSnapshot — the right shape for evidence capture

`[DOC]` `DOMSnapshot.captureSnapshot` returns `documents` (flattened, **including iframes and template
contents**), a deduplicated `strings` table, plus layout and text-box data — DOM, layout and computed
style in **one round trip**. Options: `computedStyles`, `includePaintOrder`, `includeDOMRects`.

**Status, precisely `[DOC]`:** the **`DOMSnapshot` domain as a whole is marked experimental**; the
`captureSnapshot` command carries no separate experimental flag within it. An earlier revision said
simply "Experimental", which blurred the two. Practical effect is the same — treat the whole domain as
unstable — but the distinction matters when reading the protocol definition.

> Source: https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/ ·
> flags verified against `pdl/domains/DOMSnapshot.pdl` and `json/browser_protocol.json`

**Technical implication:** this is a strictly better primitive than the repo's current
`diagnostics.dom_probe` (which today does N `querySelectorAll` calls inside one `Runtime.evaluate`).

### 2.8 Storage and Emulation — determinism levers

`[DOC]` Storage — **the whole `Storage` domain is marked experimental**, so everything below inherits
that: `getCookies` / `setCookies` / `clearCookies` / `clearDataForOrigin` / `clearDataForStorageKey` /
`getUsageAndQuota` / `trackIndexedDBForOrigin` / `trackCacheStorageForOrigin` (these commands carry no
*additional* experimental flag of their own). Clearable types include `cookies, file_systems,
indexeddb, local_storage, service_workers, cache_storage, storage_buckets, websql, shader_cache`.

`[DOC]` Emulation — **mixed stability, and the split matters**:

- **Stable:** `setTimezoneOverride`, `setDeviceMetricsOverride`, `setUserAgentOverride`,
  `setEmulatedMedia`, `setScriptExecutionDisabled`.
- **Experimental:** `setLocaleOverride`, `setAutomationOverride`, `setCPUThrottlingRate`,
  `setFocusEmulationEnabled`, `setHardwareConcurrencyOverride`, `setVirtualTimePolicy`.

**Technical implication, corrected:** `setTimezoneOverride` (**stable**) removes a real class of
non-reproducible failures — provider UIs rendering different date strings per machine, which then break
selectors. `setLocaleOverride` extends that to number/locale formatting but is **experimental**, so it
needs a fallback rather than a hard dependency. An earlier revision presented both as equally solid.
The determinism idea stands; only the timezone half is safe to build on today.

### 2.9 Independent corroboration of the extension-CDP ceiling

`[SRC]` *Chrowned by an Extension: Abusing the Chrome DevTools Protocol through the Debugger API*
(IMDEA / EuroS&P 2023). Peer-reviewed, and it enumerates exactly the boundary layer we care about:
attaching to the browser target, to WebUI (`chrome://`) tabs, to security interstitials, and to other
extensions. At analysis time (June 2022) **at least 434 Chrome Web Store extensions used the Debugger API**.
Several holes described there have since been fixed.

> Source: https://arxiv.org/abs/2305.11506 · PDF: https://dspace.networks.imdea.org/bitstream/handle/20.500.12761/1704/eurosp2023-final51.pdf

**Why it belongs in this study:** it is the only source I found that treats "what an extension can
actually reach through CDP" as a measured research question rather than a doc summary. It also dates
our knowledge — **anything it lists as an open hole is likely closed by 2026 and must be re-tested,
not assumed.** `[NV]`

`[SRC]` A newer tracked issue (2026) reports `chrome.debugger` still allowing attachment to another
extension's background page: https://issues.chromium.org/issues/479708131 — status unverified by me. `[NV]`

---

## 3. Native Bridge reach findings

### 3.1 Correction, and it is the largest one — this repo has no Native Messaging

Draft V0 §2 Zone C, §10 and the source list are all built on
`Chrome Extension → Native Messaging → local process`. **The repo does not use Native Messaging.**

`[READ]` Evidence:

- `grep` for `connectNative` / `sendNativeMessage` / `nativeMessaging` across every `.js`, `.mjs` and
  `.json` in the repo → **zero hits**.
- No manifest declares the `nativeMessaging` permission. All three workers declare
  `"host_permissions": ["http://127.0.0.1/*"]`
  (`workers/duc-auto-gg-flow-video/v0.1.0/manifest.json`).
- The host is an HTTP server that upgrades to WebSocket, hand-rolled in Node:
  `import http from "node:http"`, `DEFAULT_HOST = "127.0.0.1"`,
  `server.listen(pairing.port, DEFAULT_HOST, …)`, `Sec-WebSocket-Accept`
  (`bridge-host.mjs:1`, `:278`).
- The extension side is a `WebSocket` client with a 20-second application keepalive:
  `KEEPALIVE_MS = 20000`, `RECONNECT_ALARM = "dac.bridge.loopback.reconnect.v1"`
  (`bridge-transport-loopback.js:1`).
- The host validates `input.host !== "127.0.0.1"` and refuses anything else — loopback is enforced,
  not conventional (`bridge-host.mjs:70`).

**Everything this changes:**

| Question | Native Messaging (draft V0's assumption) | Loopback WebSocket (repo reality) |
|---|---|---|
| Permission | `nativeMessaging`, warning: *"Communicate with cooperating native applications."* `[DOC]` | none — just `http://127.0.0.1/*` host permission `[READ]` |
| Host registration | OS-level: Windows registry `HKLM/HKCU\SOFTWARE\Google\Chrome\NativeMessagingHosts\<name>`; per-browser JSON manifest dirs on mac/Linux `[DOC]` | a pairing file the extension and host both read `[READ]` |
| Who starts the host | Chrome starts it `[DOC]` | the user/agent starts it; Chrome only connects `[READ]` |
| Message cap | **host→ext 1 MB**, **ext→host 64 MiB** `[DOC]` | no Chrome-imposed cap; repo self-imposes `max_envelope_bytes = 1 MiB` `[READ]` |
| Framing | 32-bit length prefix, **native byte order**, JSON/UTF-8 `[DOC]` | WebSocket text frames `[READ]` |
| SW keep-alive | Chrome **105+** via `connectNative()` `[DOC]` | Chrome **116+** via WebSocket traffic `[DOC]` |
| Binding to browser | one host per Chrome install, per browser channel | one port; **any local process** can reach it, so pairing/auth is mandatory |

> Native Messaging figures: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging

**Two things worth saying plainly:**

- The **1 MB host→extension cap is a genuine Native Messaging trap that draft V0 never mentions** and
  which would have bitten a "stream a video artifact back to the browser" design. The repo's
  loopback choice **avoids it entirely**. That looks like an accidental win, and it should be recorded
  as a deliberate one.
- In exchange, the repo gives up Chrome-managed host lifecycle: nothing starts the host for us, and
  a stale/rogue local process can impersonate it. That is why `bridge-pairing-core.js` exists.

### 3.2 What the local host can theoretically provide — vs what it provides today

The brief asked for the theoretical ceiling. Once a local process exists, the ceiling is **the OS user
account**: filesystem, subprocess/CLI, sockets, databases, schedulers, watchers, Git, local models,
IPC to other agents. Neither Chrome nor the transport constrains this — only the host's own code does.

`[READ]` **What this repo's host actually implements: a relay, and nothing else.**

The entire filesystem surface of both host files is three `fs.readFileSync` calls, and all three read
the same thing — the pairing file / a params file:

```
bridge-host.mjs:306   fs.readFileSync(pairingPath, "utf8")
bridge-cli.mjs:125    fs.readFileSync(pairingPath, "utf8")
bridge-cli.mjs:99     fs.readFileSync(path.resolve(flags["params-file"]), "utf8")
```

No `child_process`, no `spawn`, no `execFile`, no database, no scheduler, no watcher, no Git.

And the protocol deliberately refuses to execute `[READ]` (`bridge-core.js:15`):

```js
const POLICY = deepFreeze({
  executor_model: "side_panel_only",
  auto_execute: false,
  prohibited_methods: ["run.start", "run.pause", "run.resume"]
});
```

**Finding:** draft V0 §2 lists ten local primitives under Zone C and says Bridge "should not be
understood as 'send prompt/save result'". As a statement about the *transport's* ceiling that is
right. As a description of *this repo* it is the opposite of what the code does — the host is a
narrow, auth-gated RPC relay with an explicit no-auto-execute policy, and the side panel is the only
executor. **Every Zone C primitive is NOT YET IMPLEMENTED.**

### 3.3 Boundaries of the loopback transport

- `[READ]` Loopback is enforced host-side (literal `127.0.0.1`), and the extension caps inbound frames at
  `max_envelope_bytes + 8192` before parsing — oversized frames close the socket with 1007/1009.
- `[NV]` **Private Network Access.** Chrome restricts public→private-network subresource requests. Whether
  PNA applies to a **WebSocket opened from an MV3 service worker to `127.0.0.1`** — and whether the
  `http://127.0.0.1/*` host permission is what exempts it — I could not confirm from an official source.
  This is load-bearing for the whole platform and belongs at the top of the verification list.
- `[NV]` Port stability across reboots, and behaviour when the port is already taken.

---

## 4. Compound capabilities

Format: `primitives → capability`. Status: **PROVEN** (repo evidence) · **REACHABLE** (documented, not
built) · **GATED** (documented, blocked behind a specific condition) · **CLOSED** (documented as
unreachable).

| # | Composition | Capability | Status |
|---|---|---|---|
| **CC1** | local path + Bridge + `DOM.setFileInputFiles` | Local artifact → authenticated web upload | **GATED** — needs `debugger` **and** the manual "Allow access to file URLs" toggle (§2.3) |
| **CC2** | Bridge + base64/Blob + content script `DataTransfer` → `input.files` + `change` | Same outcome as CC1, **no `debugger`, no toggle** | **REACHABLE** — and the repo already moves reference images this way (`max_reference_data_url_bytes = 700 KiB`) `[READ]`. This should be the default; CC1 the escalation. |
| **CC3** | `downloads.download` + `onDeterminingFilename` + Bridge | Web artifact → deterministic local folder | **PROVEN** `[READ]` |
| **CC4** | `Fetch.enable(Response)` + `Network.responseReceived` + DOM | Completion oracle from backend truth instead of spinner-watching | **REACHABLE** |
| **CC5** | `Fetch.fulfillRequest` + captured fixtures | Replay a provider response offline; exercise the full adapter **without spending quota** | **REACHABLE** — highest test-value item found |
| **CC6** | `Fetch.takeResponseBodyAsStream` + `IO.read` | Pull a large **authenticated** binary into the extension, no second unauthenticated request | **REACHABLE** |
| **CC7** | `DOMSnapshot.captureSnapshot(pierce)` | One-call structural snapshot incl. iframes + shadow DOM — a direct upgrade to `diagnostics.dom_probe` | **REACHABLE** |
| **CC8** | `Page.captureSnapshot(mhtml)` + `Page.printToPDF` | Immutable page evidence artifacts for `evidence/` | **REACHABLE** |
| **CC9** | `Input.dispatchKeyEvent` / `dispatchMouseEvent` | Input through the browser's own path, for widgets that ignore `element.click()` | **REACHABLE** (stable subset only — §2.6) |
| **CC10** | `Target.setAutoAttach({flatten:true})` per level | Reach cross-origin OOPIFs (payment frames, embedded editors) | **REACHABLE**, non-recursive — one call per nesting level |
| **CC11** | auto-attach to `service_worker` / `worker` targets | Read SPA background/offline queue state the DOM never shows | **REACHABLE** |
| **CC12** | `chrome.userScripts` (`USER_SCRIPT` world) | Ship a **new site adapter at runtime**, CSP-exempt, without republishing the extension | **REACHABLE** — gated on the user's userScripts toggle, **not** on a warning |
| **CC13** | `declarativeNetRequestWithHostAccess` `modifyHeaders` | Header shaping with **no** warning, **no** debugger, **no** infobar | **REACHABLE** |
| **CC14** | `tabCapture.getMediaStreamId` + offscreen `DISPLAY_MEDIA` | Record a whole generation session as video evidence, surviving navigation | **REACHABLE** |
| **CC15** | offscreen `BLOBS` + `WORKERS` + `DOM_PARSER` | Hash/convert/chunk artifacts **inside the browser** before the Bridge hop — relieves the envelope cap | **REACHABLE** |
| **CC16** | loopback WebSocket + 20s keepalive + `alarms` ≥30s | Long-lived browser worker: WS keeps the SW alive (Chrome 116+), alarm is the restart net | **PROVEN** `[READ]` |
| **CC17** | `Target.createBrowserContext(proxyServer)` | Parallel isolated authenticated identities in one browser | **CLOSED** — `IsTrusted()` is `false` for every non-Perfetto extension, so the session runs `kAutoAttachOnly` and the browser-context commands are guarded by `access_mode_ != kBrowser` (§2.2, §2.2b). Do it with separate Chrome profiles driven by the host. |
| **CC18** | host scheduler + WS wake + `run.trial` | Local clock drives browser work across hours/days | **REACHABLE** — host scheduler NOT YET IMPLEMENTED |
| **CC19** | `Emulation.setTimezoneOverride` + `setLocaleOverride` + `setDeviceMetricsOverride` | Make provider UI render identically on every machine — kills locale/date-dependent selector drift | **REACHABLE** |
| **CC20** | `Fetch.continueWithAuth` **or** `webRequestAuthProvider` `onAuthRequired` | Pass HTTP auth challenges without a human | **REACHABLE** |
| **CC21** | `Page.addScriptToEvaluateOnNewDocument` + `Page.createIsolatedWorld` | Adapter hooks installed **before page JS**, surviving SPA navigation | **REACHABLE** |
| **CC22** | `Storage.getCookies`/`setCookies` + host durable store | Capture and restore a whole authenticated session across browser restarts | **REACHABLE** — high boundary sensitivity, flag for Axis B |

---

## 5. Technical boundaries (factual only, per brief §E)

**MV3 lifecycle** `[DOC]` — 30s idle; **5-minute cap on a single request** (still current); 30s `fetch()`
cap. Keep-alive anchors: native port (105), long-lived messaging (114), WebSocket (116), debugger (118).
`alarms` floor is 30s (120). Globals are not durable across restarts.

**`debugger` permission** `[DOC]` — cannot be optional; two install warnings including *"Read and change
all your data on all websites."*; shows a persistent yellow infobar on the debugged tab.

**DevTools conflict** `[DOC]` — the browser terminates the session when the tab closes **or when DevTools
is invoked on the attached tab**; and Chrome will not let an extension attach to a tab that already has
DevTools open. Both directions of the conflict exist. Draft V0 §5.3 models this correctly.
Reasons are only `target_closed` and `canceled_by_user`.

**Attach restrictions** `[SRC]` — extension URLs other than your own are rejected; `file://` requires the
file-access grant; `IsRestrictedUrl()` blocks `chrome://` and policy-blocked hosts. Attaching to an
extension background page needs the `--silent-debugger-extension-api` command-line switch. Error strings
include `"Another debugger is already attached to the * with id: *."` and `"Cannot attach to this target."`

**Browser target** `[SRC]` — closed to extensions. `ExtensionDevToolsClientHost::IsTrusted()` returns
`ExtensionIsTrusted()`, which is an allowlist of one hardcoded ID (Perfetto UI), so every shippable
extension gets `TargetHandler::AccessMode::kAutoAttachOnly`. Under that mode `Target.getTargets`,
`attachToTarget`, `createTarget`, `setDiscoverTargets` and `activateTarget` all return
`kNotAllowedError`; only `Target.setAutoAttach` survives (§2.2b).

**Local files over CDP** `[SRC]` — read is gated on the "Allow access to file URLs" toggle; the
extension client does not get write. `Page.setDownloadBehavior` is deprecated anyway.

**Cross-origin frames** `[DOC]` — OOPIFs are separate targets; auto-attach is **not recursive**.

**Native Messaging caps** `[DOC]` — 1 MB host→extension, 64 MiB extension→host. *(Not currently binding
on this repo — see §3.1 — but binding on any future native-messaging design.)*

**Message size, repo** `[READ]` — self-imposed 1 MiB envelope; frames above `1 MiB + 8192` close the socket.

**webRequest blocking** `[DOC]` — gone in MV3 except for policy-installed extensions.

**Offscreen** `[DOC]` — exactly one per profile; only `chrome.runtime` available inside.

**Downloads** `[DOC]` — *"Absolute paths, empty paths, and paths containing back-references '..' will cause
an error."* Writes are confined to the default Downloads tree. `onDeterminingFilename` silently ignores
the same illegal paths.

**userScripts** `[DOC]` — requires a user-enabled toggle (Chrome 138+) or Developer Mode.

**Chrome version floors relevant here** `[DOC]` — flat sessions **125+**; WS keep-alive **116+**;
debugger keep-alive **118+**; `userScripts` **120+**, `execute()` **135+**; `tabCapture.getMediaStreamId`
offscreen flow **116+**. Repo manifests declare `minimum_chrome_version: 120` `[READ]` — **below the 125
floor for flat sessions**, which matters the moment CDP enters the workers.

**File System Access API** `[SRC]` — not a clean substitute for the Bridge: `showDirectoryPicker` is
reported as failing in extensions (crbug 40240444), and `requestPermission()` cannot be called without
an open tab. Persistent handles in IndexedDB + persistent permissions exist since Chrome 122 for
ordinary origins. `[NV]` for the side-panel/extension-tab case.

---

## 6. Proven capabilities from the current repo

`[READ]` Complete `chrome.*` surface actually called across all three workers — this is the real
current footprint, and it is small:

```
alarms.create · alarms.onAlarm
downloads.download · .search · .onChanged · .onDeterminingFilename · .showDefaultFolder
runtime.connect · .onConnect · .onMessage · .sendMessage · .onInstalled · .onStartup · .id
sidePanel.setPanelBehavior
storage.local · storage.session
tabs.query · .get · .sendMessage · .reload · .onUpdated · .onActivated
tabs.getZoom · .setZoom · .onZoomChange
```

| Capability | Status | Evidence |
|---|---|---|
| Content-script DOM read/act on a provider SPA | **PROVEN** | `content.js` in all three workers |
| Side panel as sole executor | **PROVEN** | `POLICY.executor_model = "side_panel_only"` — `bridge-core.js:15` |
| Local↔browser RPC over authenticated loopback WebSocket | **PROVEN** | `bridge-transport-loopback.js`, `bridge-host.mjs` |
| SW kept alive by WebSocket + 20s keepalive, alarm reconnect | **PROVEN** | `KEEPALIVE_MS`, `RECONNECT_ALARM` |
| Web artifact → local disk with controlled filename | **PROVEN** | `downloads.download` + `onDeterminingFilename` |
| Canonical-JSON SHA-256 audit chain / immutable checkpoints | **PROVEN** | `hashCanonical`, `FEATURES = [proposal_inbox, immutable_result_checkpoints, audit_chain, verified_persistence]` |
| Idempotent RPC with retryable/non-retryable error taxonomy | **PROVEN** | 25 codes + 16 `FAILURE_TYPES` in `bridge-core.js` |
| Read-only DOM diagnostics without the owner's eyes | **PROVEN** | `diagnostics.dom_probe` — `bridge-core.js:524` |
| Zoom control as a viewport lever | **PROVEN** | `tabs.setZoom` / `getZoom` / `onZoomChange` |
| **`chrome.debugger` / any CDP in a worker** | **NOT YET IMPLEMENTED** | zero hits in `workers/` |
| CDP read-only probe (getTargets → attach → `Runtime.evaluate` → `DOM.getDocument` → detach) | **PARTIAL** | root `observer-engine.js` — "Extension Observer V0", `permissions: ["debugger"]`, protocol `"1.3"`. Deliberately read-only; never dispatches input. |
| Local filesystem / subprocess / DB / scheduler / watcher / Git | **NOT YET IMPLEMENTED** | host does 3 × `readFileSync` of its own pairing file, nothing else |
| Native Messaging | **NOT USED AT ALL** | zero hits repo-wide |
| `userScripts`, `offscreen`, `dNR`, `webRequest`, `tabCapture`, `cookies`, `webNavigation` | **NOT YET IMPLEMENTED** | not in any manifest |

**Two incidental observations `[READ]`:**

- The root `manifest.json` ("Extension Observer V0", `permissions: ["debugger"]`) already answers part
  of draft V0's EXP-01 — steps 1, 2, 4, 8 and 14 are implemented and shipped. EXP-01 should be scoped
  as *extending* this, not building from zero.
- `observer-engine.js` uses `PROTOCOL_VERSION = "1.3"`, while the current Chrome docs use `"0.1"` as the
  `requiredVersion` example (draft V0 §5.1 notes this). Both appear to work; worth one line of evidence.

---

## 7. Open questions / evidence gaps

| # | Question | Why it blocks | How to settle it |
|---|---|---|---|
| **G1** | Does Private Network Access affect a WebSocket from an MV3 service worker to `127.0.0.1`? Is `http://127.0.0.1/*` host permission what exempts it? | The **entire** Bridge rests on this. A future Chrome PNA tightening would break every worker at once. | Official PNA spec + Chrome release notes; then a live probe with the permission removed. |
| ~~**G2**~~ | ~~Which `Target.*` commands survive `kAutoAttachOnly`?~~ | **RESOLVED 2026-08-28** — settled from `target_handler.cc`; full command-by-command table in **§2.2b**. Short answer: only `Target.setAutoAttach` survives; `getTargets`, `attachToTarget`, `createTarget`, `setDiscoverTargets`, `activateTarget` all return `kNotAllowedError`; `getTargetInfo`/`closeTarget` are limited to the own/auto-attached targets. The extension-API vs CDP-command asymmetry is confirmed. | — |
| **G3** | Do `Input.*` events arrive with `isTrusted === true`? | Providers may gate on it; the whole "browser input beats `element.click()`" claim depends on it. No official statement found. | One `Runtime.evaluate` listener + one `Input.dispatchMouseEvent`. Cheap, decisive. |
| **G4** | Is `MayWriteLocalFiles()` definitively `false` for the extension client, and does that only cost us the (already deprecated) `setDownloadBehavior`? | Determines whether CDP can ever write files, or whether `chrome.downloads` is permanent. | Read `debugger_api.cc` directly. |
| **G5** | Does the "Allow access to file URLs" toggle have any programmatic signal — can we **detect** it before attempting CC1, instead of catching `"Not allowed"`? | Turns a silent failure into a clean capability probe. | Probe `DOM.setFileInputFiles` against a harmless input on a controlled page and treat the error as the signal. |
| **G6** | How much of the *Chrowned* paper's 2022 attack surface is still open in Chrome 2026? | Our reach map inherits its age. Both over- and under-estimating is bad. | Re-test each of the six on current Chrome, on a controlled page. |
| **G7** | Does the `userScripts` user toggle survive extension update / profile sync, and is there an API to read its state? | Decides whether CC12 (runtime adapter delivery) is dependable or fragile. | Chrome docs + live test across an update. |
| **G8** | Do the repo's `minimum_chrome_version: 120` manifests need raising to 125 before any CDP work? | Flat sessions are 125+; shipping CDP on 120 would fail at runtime on older installs. | Decide when CDP enters a worker. |
| **G9** | Practical throughput of the loopback WebSocket vs the self-imposed 1 MiB envelope — where does chunking actually become necessary? | Sizes CC6/CC15. | Measure against a real video artifact. |
| **G10** | Does `chrome.debugger`'s yellow infobar have any documented suppression outside `--silent-debugger-extension-api`? | Drives the "power mode" UX cost in draft V0 §7. | Chrome docs + Chromium source. |

---

## Corrections and confirmations against draft V0

**Corrections**

1. **§3's domain sample is worth completing** — it names **15 domains in 13 bullets**; **27 are
   documented**. The 12 it does not mention: `Audits`, `CacheStorage`, `Console`, `CSS`, `Database`,
   `Debugger`, `Inspector`, `Log`, `Overlay`, `Performance`, `Profiler`, `WebAudio`. Draft V0 said
   "include … such as", so this completes a stated sample rather than correcting a wrong claim. `[DOC]`
2. **§2 / §10 / Sources: "Native Messaging" is factually wrong for this repo.** The Bridge is a loopback
   WebSocket; there is no `nativeMessaging` permission and no `connectNative` call anywhere. `[READ]`
3. **§4 / §9 C2 is over-stated.** `DOM.setFileInputFiles` is gated on the "Allow access to file URLs"
   toggle, not on the `debugger` permission; the denial is a bare `"Not allowed"`. `[SRC]`
4. **§2 Zone C describes a ceiling, not this repo.** All ten local primitives are NOT YET IMPLEMENTED;
   the host is a relay with `auto_execute: false` and three `prohibited_methods`. `[READ]`
5. **§6 omits the 5-minute per-request cap**, which is still documented and is the binding constraint on
   long Bridge RPCs — and omits the **Chrome 116 WebSocket keep-alive**, which is the one this repo
   actually relies on. `[DOC]`
6. **§5.2's target-registry recommendation is right for a stronger reason than given** — because
   `IsTrusted()` is `false` for every shippable extension, the session runs `kAutoAttachOnly`, and
   `Target.setAutoAttach` is then the **only** Target traversal command that is not blocked (§2.2b).
   Auto-attach is not the preferred route, it is the sole route, so non-recursion is a hard constraint,
   not an inconvenience. `[SRC]`
7. **§4 Input treats experimental and stable commands as equal.** `insertText` and `dispatchDragEvent`
   are experimental. `[DOC]`
8. **§12 says repo evidence is "pending"** — it is not. A `debugger`-permissioned read-only CDP probe
   already ships at the repo root and covers five of EXP-01's fifteen steps. `[READ]`

**Confirmed**

- §7's claim that `debugger` cannot be an optional permission — **correct**, and the full list is
  `debugger, declarativeNetRequest, devtools, geolocation, mdns, proxy, tts, ttsEngine, wallpaper`. `[DOC]`
- §5.3's DevTools-conflict model — **correct**, and the conflict is bidirectional. `[DOC]`
- §5.2 on OOPIFs as separate targets, flat sessions in Chrome 125+, non-recursive auto-attach — **correct**. `[DOC]`
- §6's keep-alive versions (native 105, debugger 118) — **correct**, list was incomplete. `[DOC]`
- §11's two-axis model (reach vs boundary) — endorsed; §2.3 above is exactly why it is needed.

**Not disputed, not verified** — draft V0 §8's EXP-01 protocol and §10's four-layer architecture are
design proposals, not factual claims. Phase 1 leaves them alone.

---

## Sources added by CC

- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://developer.chrome.com/docs/extensions/reference/api/offscreen
- https://developer.chrome.com/docs/extensions/reference/api/declarativeNetRequest
- https://developer.chrome.com/docs/extensions/reference/api/webRequest
- https://developer.chrome.com/docs/extensions/how-to/web-platform/screen-capture
- https://developer.chrome.com/docs/capabilities/web-apis/file-system-access
- https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api
- https://chromedevtools.github.io/devtools-protocol/tot/DOMSnapshot/
- https://chromedevtools.github.io/devtools-protocol/tot/Storage/
- https://chromedevtools.github.io/devtools-protocol/tot/Emulation/
- https://chromedevtools.github.io/devtools-protocol/tot/IO/
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/public/browser/devtools_agent_host_client.h
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/devtools/protocol/dom_handler.cc
- https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/debugger/debugger_api.cc
- https://issues.chromium.org/issues/40053041
- https://issues.chromium.org/issues/512277152
- https://issues.chromium.org/issues/479708131
- https://issues.chromium.org/issues/40240444
- https://arxiv.org/abs/2305.11506 — *Chrowned by an Extension* (IMDEA, EuroS&P 2023)

**Phase 1 stop condition reached.** Inventory is broad, unknowns are written down as G1–G10, and no
architecture debate has been opened. Phase 2 cross-audit awaits GPT/Đức.

---

## Addendum — EXP-02 and EXP-03 landed mid-session

GPT pushed `EXP-02-LOCAL-FILE-TO-WEB-UPLOAD-STUDY-V0.md` (d30f40e) and
`EXP-03-BROWSER-ACTION-NETWORK-DOM-CORRELATION-STUDY-V0.md` (4733bb7) while this section was being
written. I read both before committing. Three points, all Phase-1 factual — no architecture argument.

### A1. EXP-02 §7 draws the ceiling in the right place but at the wrong granularity — and it changes EXP-02's verdict

EXP-02 §7 says, correctly, that "full CDP capability != chrome.debugger capability", and reasons that
because `DOM`, `Page` and `Input` **are** on the allowed-domain list, the three upload paths are
"plausible for an extension-controlled CDP runtime".

`[SRC]` **The restriction is not only at domain granularity. It is also per-command, inside allowed
domains, keyed on the client type.** `DOM` is allowed; `DOM.setFileInputFiles` still checks
`allow_file_access_` and returns `"Not allowed"` when it is false (§2.3 above). For an extension client
that flag is `util::AllowFileAccess(extension_id, profile)` — the **"Allow access to file URLs"**
checkbox in `chrome://extensions`.

**Consequence for EXP-02 specifically:** its **Path A** (`DOM.setFileInputFiles`) — the path EXP-02 rates
with "Strong evidence" — is **GATED**, not open. `grep` over EXP-02 for
`AllowFileAccess` / `MayReadLocalFiles` / `allow_file_access` / `"Allow access to file URLs"` /
`"Not allowed"` returns **zero hits**, so this is not a disagreement about interpretation; the condition
is simply absent from that study. EXP-02's §11 micro-proof will therefore either pass or fail depending
on a checkbox it never asks the operator to set — and the failure surfaces as a bare `"Not allowed"`.

**Concrete, cheap fix for EXP-02 §11:** add the toggle state as a recorded pre-condition, and run the
fixture **twice** — once with file access on, once off — so the study measures the gate instead of
accidentally depending on it.

### A2. EXP-02 Path C rests on an experimental command

`[DOC]` EXP-02 §6 / Path C uses `Input.dispatchDragEvent` with `DragData.files`. That command is marked
**Experimental** in the CDP reference (§2.6 above), as are `Input.insertText` and
`Input.setInterceptDrags`. `Page.setInterceptFileChooserDialog` (Path B) is **stable**.

So the three paths are not equally solid: **Path B stable · Path A stable-but-gated · Path C experimental**.
Worth recording before any of them is treated as a fallback for the others.

### A3. EXP-03 — two Fetch primitives absent, and one buffer caveat

EXP-03's primitive map (P1–P8) covers `Network.getResponseBody` and Fetch interception. Two additions
from §2.5 above:

- `[DOC]` **`Fetch.fulfillRequest`** — fabricate a complete synthetic response without contacting the
  server. This makes offline replay of a provider response possible, which is a *testing* primitive
  EXP-03's correlation model would benefit from directly.
- `[DOC]` **`Fetch.takeResponseBodyAsStream` → `IO.read`** — chunked retrieval of large authenticated
  bodies, where `Network.getResponseBody` (EXP-03 P4) returns the whole body at once.
- `[DOC]` `Network.enable` takes **`maxTotalBufferSize`**. Response bodies are held in a bounded buffer,
  so `getResponseBody` is not unconditionally available for large or long-lived responses. EXP-03 P4
  should state this as a limit. `[NV]` exact default size not confirmed from an official source.

Nothing here contradicts EXP-03's core finding; it widens P4 and P8.

### A4. EXP-04 — the design is right, and §2.2 explains why it *has* to be

`EXP-04-NESTED-FRAME-WORKER-TARGET-REGISTRY-STUDY-V0.md` (b0650c1) landed after A1–A3 were written.
It builds the whole nested-target registry on `Target.setAutoAttach()` — recursively re-configured on
each newly attached child session — and never uses `Target.getTargets`, `attachToTarget`,
`createTarget` or `setDiscoverTargets`.

`[SRC]` That is the **correct** choice, and §2.2 / §2.2b supply the missing reason: the extension client
has `IsTrusted() == false`, so its `TargetHandler` is constructed in **`kAutoAttachOnly`** mode, and in
that mode `setAutoAttach` is the **only** Target traversal command that is not blocked. Auto-attach is
not merely the recommended strategy for OOPIFs — it is the only one available. EXP-04's recursive
configuration requirement is therefore a **hard consequence of the client gate**, not a quirk of the
`Target` domain.

Two small things this adds to EXP-04:

- Its §"exposure boundary" can state the mechanism (`IsTrusted()` → `kAutoAttachOnly`) rather than only
  the symptom (non-recursion), which makes the constraint predictable instead of empirical.
- **The asymmetry is now proven, and EXP-04 should record it:** the **extension API**
  `chrome.debugger.getTargets()` works (shipped in `observer-engine.js`), while the **CDP command**
  `Target.getTargets` returns `kNotAllowedError` under `kAutoAttachOnly` (`target_handler.cc:1435`).
  Enumeration must come from the extension API; traversal from `setAutoAttach`. EXP-04's micro-proof no
  longer needs to discover this — it can assert it.

Same pattern as A1: three GPT studies (EXP-02, EXP-03, EXP-04) reason about the ceiling at
**domain** granularity. The gate that actually binds is **per-client, per-command**. It weakens EXP-02's
Path A, leaves EXP-03 intact, and vindicates EXP-04.

---

## Accuracy pass — 2026-08-28 (CC, revision 2)

GPT audited the section above against current official Chrome/Chromium sources and raised five points.
I re-verified each one myself before editing rather than applying them on trust (AGENTS.md §3 luật 4).
Result: **three accepted, one accepted with a sharper mechanism, one rejected on evidence.**
Method note: for CDP stability flags I stopped reading the rendered `/tot/` pages and switched to the
machine-readable definitions — `json/browser_protocol.json` (the `experimental` / `deprecated` flags)
and `pdl/domains/*.pdl` (the `experimental` keyword). Those are what the rendered docs are generated
from, so they settle disagreements the rendered pages cannot.

| # | Point raised | Verdict | What changed |
|---|---|---|---|
| 1 | 27 allowed CDP domains, not 26 | **Accepted** — I miscounted when transcribing | §2.1 now quotes the sentence verbatim and says **27** |
| 2 | Re-check the "13 domains" figure for draft V0 | **Accepted** — draft V0 has **15 domains in 13 bullets** (its first bullet packs `DOM / DOMSnapshot / DOMDebugger`). Also: it said "include … such as", i.e. an explicit sample | §2.1 and Corrections #1 restated; framing softened from "incomplete list" to "completing a stated sample". The 12 missing domains were already right |
| 3 | `MayAttachToBrowser()` no longer exists; the gate is `IsTrusted()` | **Accepted, and the real mechanism is stricter than either version said** | §2.2 rewritten with source excerpts; §5, CC17, Corrections #6 and A4 all updated |
| 4 | `Page.setInterceptFileChooserDialog` is Experimental on tip-of-tree | **Rejected** — four sources say stable, including the `/1-3/` page the review itself cited | No change to the status; the disagreement and its evidence are recorded in §2.4 |
| 5 | Re-check other Stable/Experimental/Deprecated labels | **Accepted** — two genuine errors found, in Emulation and DOMSnapshot | §2.7 and §2.8 corrected; Page, Input, Fetch, DOM, IO tables re-verified and confirmed unchanged |

### On point 3 — what the naming error was hiding

The stale name was not just cosmetic. Chasing it down produced a **stronger** finding than the original
claim. `ExtensionDevToolsClientHost::IsTrusted()` delegates to `ExtensionIsTrusted()`, which is an
allowlist of **exactly one hardcoded extension ID** (`kPerfettoUIExtensionId`). So the browser target is
not merely "closed to extensions by default" — it is closed to every extension that is not Perfetto UI,
with no permission, flag, or user toggle that opens it. The `may_attach_to_browser` name survives only
as a local variable at `render_frame_devtools_agent_host.cc:450`, which is the most likely origin of the
stale API name.

Chasing it also **resolved gap G2**, which the previous revision had left `[NV]`: reading
`target_handler.cc` gave the exact command-by-command effect of `kAutoAttachOnly` (new **§2.2b**).
That converts the extension-API-vs-CDP-command asymmetry from a suspicion into a proven constraint.

### Cross-check against `PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`

That addendum was published while this pass was in flight. It is in agreement on points 1, 2, 3, 5, 6
and 7, and its §3 independently reaches the same `kAutoAttachOnly` conclusion as §2.2b here — including
the `chrome.debugger.getTargets()` vs `Target.getTargets` asymmetry. Good convergence; two of its
details do not survive checking:

- **`MayAccessAllCookies()`** is listed there as part of the current `DevToolsAgentHostClient`
  interface. It is not in the header (see §2.2). The other seven entries in that list are correct.
- **Point 4** is addressed below.

Its framing rule — *"Where this file conflicts with the living draft, this file wins until the living
draft is normalized"* — is worth flagging for Đức, because it would have propagated both of the above
into the study as authoritative. Phase 1 is an evidence-collection phase: **the source wins, not the
newer document.** Suggest that rule be relaxed to "flag and re-verify" rather than "wins".

### On point 4 — why it is rejected rather than deferred

`pdl/domains/Page.pdl` shows an experimental command and this one five lines apart:

```
1277:  experimental command waitForDebugger
…
1282:  command setInterceptFileChooserDialog
```

The `experimental` keyword is present on one and absent on the other, in the same file, in the same
domain. And the stable-`1-3` surface — which the review cited in its own support — **contains** this
command while **excluding** `Page.captureSnapshot`, which is the behaviour you would expect only if
this command is stable and that one is not.

That is not ambiguous, so I have recorded a disagreement rather than split the difference. The most
likely origin of the challenge is a **per-parameter** experimental flag being read as the command's:
`setInterceptFileChooserDialog` does carry an experimental *parameter* (`cancel`). The command itself
is stable. If the review was instead reading a Chromium-internal PDL revision, naming it would settle
the matter and I will re-check.

### Claims still marked `[NV]` after this pass

Unchanged from revision 1 except G2, which is now resolved:

- **G1** — whether Private Network Access applies to a service-worker WebSocket to `127.0.0.1`.
  Still the single highest-value unknown; the whole Bridge rests on it.
- **G3** — whether `Input.*` events carry `isTrusted === true`. No official statement found.
- **G5** — whether the "Allow access to file URLs" state is readable programmatically.
- **G6** — how much of the 2022 *Chrowned* attack surface is still open in 2026.
- **G7** — whether the `userScripts` user toggle survives extension update, and whether its state is readable.
- **G9** — practical loopback WebSocket throughput against the self-imposed 1 MiB envelope.
- **G10** — whether the debugger infobar can be suppressed outside `--silent-debugger-extension-api`.
- **§2.5** — `Network.enable`'s `maxTotalBufferSize` default value.
- **§5** — whether the File System Access API works from a side panel or extension tab page.
- **§2.9** — the status of chromium issue 479708131.

Scope discipline: this pass changed **factual statements only**. No conclusion was reversed, no new
capability was added, and Phase 2 is not opened.

---

# Seed / Scouter Discovery Protocol — Working Agreement

**Status:** working architecture agreement inside this living study; not a separate SSOT and not yet a production spec.

## Core role split

The preferred abstraction is **Scouter AI + Seed Extension**, not “a Seed Extension that independently understands and converts every website.”

```text
Scouter AI
  ├─ discovery/research protocol
  ├─ website behavioral reasoning
  ├─ experiment planning
  ├─ adapter/code generation
  ├─ debug/patch loop
  └─ verification skill
        ↓
Seed Extension
  ├─ observe browser/page signals
  ├─ expose Chrome/CDP primitives
  ├─ execute requested trials
  ├─ capture before/after evidence
  └─ return structured results
        ↓
Bridge / Local Runtime
  ├─ durable evidence
  ├─ filesystem / CLI / code/repo operations as implemented
  └─ checkpoints / artifacts
```

**Agreement:** the Seed is the browser-side arm of Scouter. Research policy and experimental protocol belong primarily in the AI/skill layer, not hard-coded into the Seed.

## What Seed should study

Seed should not stop at “which buttons/selectors exist.” Scouter uses Seed to infer the **behavioral model** of a website or individual app surface:

- site/app identity and surface identity;
- interaction archetypes such as fetch/research, task execution, workflow orchestration, transaction, communication and artifact/file handling;
- state machines such as `IDLE → INPUT_READY → RUNNING → WAITING → DONE/FAILED`;
- observable and controllable primitives behind each state transition;
- SPA/navigation, frame, popup, worker, upload/download, streaming and failure-state behavior.

One domain can expose several different surfaces/archetypes; classification should therefore be at the **workflow/surface** level, not only the domain level.

## Capability-rich Seed

The Seed should be designed as a **general-purpose browser capability kernel / laboratory** with the broadest useful Chrome/CDP capability surface available to the platform. The goal is that Scouter can systematically ask “can this website support primitive X?” and run a controlled proof.

Top-level capability families currently expected:

- OBSERVE — DOM, Accessibility, frames, navigation, Runtime state, Network;
- INPUT — focus, click, keyboard, text, select, editor and browser-input paths;
- TRANSFER — local→web upload, web→local download, clipboard/artifact paths;
- CONTROL — tabs, popups, iframes, redirects, SPA lifecycle, long-running task states, reload/recovery;
- NETWORK — request/response/WebSocket/stream observation and selected interception/simulation primitives;
- BROWSER/LOCAL — storage, evidence capture, Bridge/local filesystem/CLI/DB/scheduler where implemented.

The intent is **full capability availability**, not a weak Seed whose API surface must be expanded for every new website.

## Capability checklist / trial ledger

For each website/surface, Scouter should build a capability checklist and progressively mark evidence-backed reach.

A primitive should not be represented only as binary ✓/✗. Working progression:

```text
UNKNOWN
→ OBSERVED
→ INFERRED
→ TRIAL_READY
→ PROVEN
→ STABLE
```

Example evidence record:

```text
UPLOAD_FILE
[✓] observable
[✓] controllable
[✓] micro-proof passed
[✓] repeatable
[ ] regulation cleared
Evidence: EV-018 → EV-027
```

A technical capability proof and a regulation/provider-boundary verdict remain independent dimensions.

## Scouter self-build / self-debug / self-verify loop

Preferred operating loop:

```text
discover
→ hypothesize
→ generate adapter/code
→ reload/configure runtime
→ trial
→ observe evidence
→ diagnose
→ patch
→ retry
→ regression proof
→ mark capability
```

**Agreement:** one Scouter AI may build and verify its own code. A second AI is not architecturally required merely for independence. Verification should instead be a distinct **skill/mode with evidence-based PASS/FAIL criteria**, so the Scouter does not treat its previous conclusion as proof.

Each bug should be convertible into reusable knowledge:

```text
failure signature
→ diagnosis
→ counter-code / fallback
→ regression proof
→ reusable adapter/runtime pattern
```

This creates cumulative learning without requiring inter-AI handoff overhead for every iteration.

## Where constraints should live

Research protocol, trial sequencing, dummy/test data, provider-specific boundaries and stop/escalation decisions belong to **Scouter skills/protocols**.

Seed/runtime may still own generic technical invariants needed for deterministic execution — command IDs, timeout/abort semantics, idempotency, evidence logging, crash/restart recovery and structured error reporting. These are runtime correctness guarantees, not provider policy.

## Adapter outcome

The system should not assume every discovered website becomes a dedicated extension.

Preferred progression:

```text
Site / Surface Capability Profile
        ↓
Declarative adapter / selectors / state detectors
        ↓
Generic Browser Runtime + adapter
        ↓
runtime-delivered or packaged site module when needed
        ↓
Dedicated extension only when isolation/UX/permissions/runtime requirements justify it
```

Therefore the stronger abstraction remains:

> **Browser Discovery Runtime + Scouter AI produces evidence-backed Site Adapters / Capability Profiles; dedicated extensions are an escalation path, not the default output.**

## Architecture discipline / blind spot

The main 1–3 month risk is Seed core absorbing provider-specific fixes until it becomes another monolith. Provider-specific counter-code, selectors, workflow semantics and drift fixes should stay in adapter/skill/library layers wherever possible. Seed core should remain generic and capability-oriented.

## Current unresolved design question

Before implementation, the next architecture boundary to reason about is:

> Which primitives and invariants belong permanently in **Seed core**, which reasoning/protocol belongs in **Scouter skills**, and which behavior belongs in a **Site Adapter**?

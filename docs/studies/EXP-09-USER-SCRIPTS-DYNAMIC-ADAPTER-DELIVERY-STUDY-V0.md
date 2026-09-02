---
kind: study
status: active
ttl_days: 180
---

# EXP-09 — `chrome.userScripts` Dynamic Adapter Delivery Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Technical reach first. No production implementation. Chrome Web Store/provider policy remains a separate boundary axis.

---

## 1. Research question

Can `chrome.userScripts` turn a site adapter from code that must be bundled and released with the extension into a runtime-delivered, versioned module that can be installed, updated, executed, isolated and removed while the base extension stays unchanged?

Target hypothesis:

```text
Local Orchestrator / Adapter Registry
        ↓
adapter code + version + match scope
        ↓
Chrome Extension Control Plane
        ↓
chrome.userScripts
        ↓
USER_SCRIPT world / MAIN world
        ↓
provider page
```

The larger architectural question is whether a future Seed / Discovery Extension can produce or receive a new site adapter without republishing the base extension.

---

## 2. Core finding

**Yes technically, with meaningful setup and lifecycle gates.**

`chrome.userScripts` is explicitly designed to execute arbitrary code that is not shipped as part of the extension package. It supports dynamic registration, update, removal and — on Chrome 135+ — direct programmatic execution against a selected tab/frame/document.

This makes the following capability technically reachable:

```text
Site discovery evidence
→ adapter generated/reviewed outside extension package
→ adapter registered at runtime
→ isolated execution on matching pages
→ adapter sends structured observations/results back
→ adapter version updated or rolled back
```

However this is **not** a zero-friction hot-reload system:

1. the extension needs the `userScripts` permission;
2. it needs host access for the target site;
3. the user must explicitly enable User Scripts for the extension;
4. registered user scripts are cleared when the extension itself updates;
5. special child-frame cases are less automatic than ordinary content scripts;
6. runtime-delivered code introduces a separate trust/review problem even if Chrome technically permits execution.

**Technical reach:** LIKELY / strong documented basis; controlled micro-proof required before PROVEN.

Primary source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 3. Primitive P1 — Arbitrary runtime code

Chrome documents the key distinction directly:

- content scripts / `chrome.scripting` normally operate with extension-packaged logic;
- `chrome.userScripts` exists for user-provided scripts that cannot be shipped as part of the extension package;
- `ScriptSource` accepts either a packaged `file` or a raw JavaScript `code` string.

Therefore a Bridge/local orchestrator can technically send adapter JavaScript as data to the extension, and the extension can pass that code to `chrome.userScripts.register()` or `chrome.userScripts.execute()`.

Candidate contract:

```text
adapter_id
version
matches / exclusions
world / worldId
runAt
code_hash
code
capability_manifest
```

The base extension can remain stable while adapter code changes independently.

Important distinction:

> Runtime delivery is technically reachable; whether a particular distribution model is acceptable under Chrome Web Store/provider rules is a separate Axis B question.

Chrome Web Store MV3 policy explicitly names the User Scripts API and Debugger API as documented exceptions for execution of logic from a remote source when usage is aligned with the documented purpose of the API.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements

---

## 4. Primitive P2 — Registration lifecycle

The API provides:

- `register()`
- `getScripts()`
- `update()`
- `unregister()`

This is enough for an Adapter Registry control plane.

Possible state machine:

```text
DISCOVERED
→ VALIDATED
→ REGISTERING
→ REGISTERED
→ ACTIVE
→ UPDATING
→ ACTIVE(new version)
→ DISABLED / ROLLED_BACK / UNREGISTERED
```

### Useful atomicity property

Chrome documents that when `update()` receives invalid script data, parsing/file-validation errors, or unknown IDs, **no scripts in that call are updated**.

That means a multi-script adapter update can fail closed rather than partially applying a malformed batch.

This is valuable for staged adapter deployment and rollback.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 5. Primitive P3 — Runtime execution on a known browsing context

Chrome 135+ adds `chrome.userScripts.execute()`.

It can target:

```text
tabId
+ frameIds
or documentIds
or allFrames
```

and returns per-injection results including:

- `documentId`
- `frameId`
- result or error

This combines strongly with EXP-08's Browsing Context Graph.

Candidate flow:

```text
EXP-08 identifies documentId/frameId
→ EXP-09 execute adapter probe in that exact document
→ receive result
→ attach result to workflow/document evidence
```

This is especially useful for:

- one-shot discovery probes;
- hot patches;
- adapters that should not remain registered globally;
- special frame targeting after runtime discovery.

`injectImmediately` asks Chrome to execute as soon as possible, but Chrome explicitly states that this **does not guarantee execution before page load** if the target is already loading/loaded.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 6. Primitive P4 — Execution worlds and adapter isolation

Supported worlds:

### `USER_SCRIPT`

- default world;
- isolated from the host page and other extensions;
- page cannot directly access that JavaScript environment;
- exempt from the host page's CSP;
- Chrome can configure a separate CSP for the world.

### `MAIN`

- shared with the host page JavaScript environment;
- visible to / accessible by page code;
- useful only when the adapter genuinely needs page-world objects or hooks.

### Chrome 133+ `worldId`

A specific user-script world can be named with `worldId`.

Potential architecture:

```text
provider-a adapter → USER_SCRIPT worldId = adapter.provider_a.v3
provider-b adapter → USER_SCRIPT worldId = adapter.provider_b.v7
```

This reduces accidental cross-adapter global-state coupling.

**Recommendation hypothesis for later Phase 2:** default to `USER_SCRIPT`; escalate to `MAIN` only for evidence-backed page-world requirements.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 7. Primitive P5 — Controlled messaging boundary

User-script messaging is **disabled by default**.

The extension must call:

```text
chrome.userScripts.configureWorld({ messaging: true })
```

Messages are received through dedicated handlers:

- `runtime.onUserScriptMessage`
- `runtime.onUserScriptConnect`

rather than ordinary `onMessage` / `onConnect`.

Chrome explicitly describes user scripts as a **less-trusted context**, and the separate handlers make provenance easier to distinguish.

This maps cleanly to a capability-based adapter protocol:

```text
adapter
→ structured observation/result only
→ dedicated user-script ingress
→ validate adapter_id + schema + workflow_id
→ Browser Runtime
```

A runtime adapter does not need direct access to the local Bridge or arbitrary extension internals.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 8. Setup gate — explicit user enablement

`userScripts` requires more than manifest permission.

### Chrome < 138

User must enable Chrome Developer Mode.

### Chrome 138+

Each extension has its own **Allow User Scripts** toggle under extension details.

Chrome provides a recommended capability probe:

```text
chrome.userScripts.getScripts()
```

If the API/toggle is unavailable, the call throws.

On Chrome 138+, when the toggle is disabled `chrome.userScripts` can become undefined after the extension execution context reloads. If permission is revoked while a service worker is already running, the namespace may remain present temporarily but method calls throw.

Therefore availability must be modeled dynamically:

```text
USER_SCRIPTS_UNKNOWN
→ probe getScripts()
→ AVAILABLE
or DISABLED_BY_USER
```

This should be a capability probe, not a one-time installation assumption.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 9. Permission UX

The current Chrome permission list shows `userScripts` as granting access to the API and notes the separate user-enable requirement, but does **not** list an install warning specifically for the `userScripts` permission.

However the target sites still require host permissions, and broad host access can itself create significant warning/UX cost.

Therefore:

```text
userScripts permission cost != complete adapter permission cost
```

For a Seed Extension that reaches many websites, host-access strategy remains a separate UX/architecture question.

Sources:
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 10. Lifecycle limitation — extension updates clear user scripts

Chrome explicitly states:

> User scripts are cleared when an extension updates.

The documented recovery pattern is to add them back from `runtime.onInstalled` when the reason is `update`.

For this platform, the stronger design is likely:

```text
Local Adapter Registry = authoritative adapter SSOT
        ↓ extension update/restart reconciliation
extension asks for desired adapter set
        ↓
getScripts() current state
        ↓
diff desired vs actual
        ↓
re-register/update/remove
```

Do not make Chrome's registration table the authoritative adapter registry.

### Evidence gap

Current official documentation explicitly covers clearing on **extension update** but does not make a comparably explicit statement in the reviewed text about behavior across ordinary browser restarts.

Therefore persistence across browser restart should be included in the micro-proof rather than inferred.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts

---

## 11. Frame limitation — `allFrames` is not universal related-frame reach

`RegisteredUserScript.allFrames = true` does not mean "inject everywhere under this tab".

Chrome states that each frame is checked independently against the script's URL requirements.

More importantly, the current `RegisteredUserScript` schema reviewed here does **not** expose the content-script properties:

- `match_about_blank`
- `match_origin_as_fallback`

Ordinary content scripts have explicit support for related `about:blank`, `data:`, `blob:` and `filesystem:` frames through those options.

Therefore this assumption is unsafe:

> Register one user script with allFrames and it automatically reaches every special child frame.

Possible fallback on Chrome 135+:

```text
Browsing Context Graph discovers frame/document
→ userScripts.execute({ target: { tabId, documentIds/frameIds } })
```

Exact behavior for `about:blank` / blob / opaque-origin descendants needs micro-proof.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts

---

## 12. Versioned Adapter Package hypothesis

A future runtime adapter should probably not be represented as only one JavaScript string.

Candidate logical package:

```text
adapter_id
provider_id
adapter_version
schema_version
matches
exclude_matches
required_host_access
world
world_id
run_at
code
code_hash
capabilities[]
expected_signals[]
allowed_actions[]
message_schema
micro_proof_version
created_from_evidence
regulation_status
```

This enables:

- deterministic hash/version identity;
- provenance from Seed/Discovery evidence;
- capability gating;
- rollback;
- audit;
- provider drift detection;
- separation between technical code and regulatory approval.

This is still a hypothesis, not locked architecture.

---

## 13. Compound capabilities unlocked

### C1 — Runtime site-adapter delivery

```text
local adapter artifact
+ Bridge
+ userScripts.register
→ new provider adapter without extension republish
```

Status: **LIKELY / needs micro-proof**.

### C2 — One-shot discovery probe

```text
Browsing Context Graph
+ userScripts.execute(documentId)
→ targeted probe
→ structured result
```

Status: **LIKELY**, Chrome 135+.

### C3 — Adapter hot update with rollback

```text
versioned adapter
+ getScripts/update/unregister
+ validation
→ controlled rollout
```

Status: **LIKELY**.

### C4 — Per-provider isolated adapter worlds

```text
worldId
+ USER_SCRIPT world
+ dedicated messaging ingress
→ isolated runtime modules
```

Status: **LIKELY**, Chrome 133+.

### C5 — Seed Extension → generated adapter

```text
Seed evidence
→ reviewed adapter specification/code
→ runtime register
→ micro-proof
→ promoted adapter
```

Status: **ARCHITECTURE HYPOTHESIS**, not yet proven end to end.

---

## 14. Failure modes

### F1 — User Scripts toggle disabled

Registration/execution fails even though manifest declares permission.

Mitigation hypothesis: capability probe + clear setup state.

### F2 — Host permission missing

Adapter exists but cannot execute on target origin.

Mitigation: capability manifest must declare required host scope separately from code.

### F3 — Extension update removes registrations

Runtime silently loses adapter registrations if reconciliation is absent.

Mitigation: local Adapter Registry SSOT + startup/update reconciliation.

### F4 — Page-world contamination

Adapter in `MAIN` world can conflict with provider code and provider code can inspect/interfere with adapter globals.

Mitigation hypothesis: USER_SCRIPT default, MAIN only when needed.

### F5 — Bad runtime code

Arbitrary generated code can create infinite loops, DOM mutation, side effects or unexpected network activity.

Mitigation: code review/static checks + declared action class + discovery/read-only mode + controlled micro-proof before promotion.

### F6 — Special frame miss

Registered matching may not reach opaque/related frames that ordinary content scripts can reach with `match_origin_as_fallback`.

Mitigation: Browsing Context Graph + targeted execute/content-script/CDP fallback.

### F7 — Adapter drift

Script remains syntactically valid but provider DOM/semantics changed.

Mitigation: versioned health probes + evidence expectations + automatic degrade-to-observer rather than blind action.

### F8 — Regulation mismatch

Technically valid runtime code may violate provider/API/store boundaries.

Mitigation: preserve Technical Reach and Boundary/Regulation as separate states; do not promote merely because code executes.

---

## 15. Chrome Web Store boundary note — factual only

Manifest V3 Chrome Web Store rules generally prohibit remotely hosted executable logic, but the current official policy explicitly identifies the following documented APIs as permitted routes for remote execution when used consistently with their documented purpose:

- Debugger API
- User Scripts API

This is important evidence that runtime script execution through `chrome.userScripts` is not technically an accidental loophole.

However this does **not** mean any AI-generated adapter distribution scheme is automatically store-compliant. The policy requires API usage to align with documented purpose and the extension's overall behavior remains subject to other policies.

Boundary status for the proposed Seed-generated-adapter model:

**NEEDS DEDICATED REGULATION STUDY.**

Source:
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements

---

## 16. Controlled micro-proof design

Use only controlled test pages.

### Scenario A — availability gate

1. install test extension with `userScripts` + controlled host permission;
2. run `getScripts()` with toggle disabled;
3. record exact behavior;
4. enable toggle;
5. repeat probe.

### Scenario B — dynamic code registration

1. receive a JavaScript code string from local test fixture;
2. register with a versioned ID;
3. navigate controlled matching page;
4. verify adapter executes;
5. `getScripts()` confirms registry state.

### Scenario C — USER_SCRIPT isolation

1. adapter sets a unique global marker;
2. page attempts to inspect it;
3. confirm isolation;
4. send a structured adapter message through dedicated user-script messaging.

### Scenario D — MAIN world comparison

1. execute harmless adapter marker in MAIN;
2. verify page can observe the marker;
3. compare behavior with USER_SCRIPT.

### Scenario E — worldId isolation

1. configure two world IDs;
2. run independent variables/state;
3. verify state does not leak between worlds.

### Scenario F — update atomicity

1. register adapters A/B;
2. submit one batch update with one malformed/invalid member;
3. verify neither adapter changes;
4. submit valid batch and verify both change.

### Scenario G — extension update recovery

1. register adapter;
2. simulate extension update;
3. verify registration cleared;
4. reconcile desired adapter state from local registry;
5. verify re-registration.

### Scenario H — browser restart

1. register adapter;
2. restart Chrome;
3. inspect `getScripts()`;
4. measure whether registration persists;
5. regardless of result, verify reconciliation converges to desired state.

### Scenario I — special frames

Controlled page contains:

- normal same-origin iframe;
- cross-origin iframe;
- `about:blank` child;
- blob child where practical.

Measure `allFrames` coverage and targeted `execute(frameId/documentId)` fallback.

### Scenario J — one-shot document execution

1. obtain `documentId` from `webNavigation`;
2. use `userScripts.execute()` on that exact document;
3. navigate to replace document;
4. prove stale document identity does not execute against new document accidentally.

---

## 17. PASS criteria

EXP-09 can be marked PROVEN only if controlled tests show:

- availability/toggle state is reliably capability-probed;
- runtime-provided code can be registered and executed on an authorized controlled origin;
- adapter IDs/versions can be enumerated and reconciled deterministically;
- USER_SCRIPT isolation and dedicated messaging work as documented;
- update failures do not partially mutate a batch;
- extension-update recovery rehydrates desired adapters;
- browser-restart behavior is measured rather than assumed;
- frame coverage limitations and fallback routes are measured;
- a stale document/frame cannot silently receive a probe intended for an old workflow context;
- no test requires provider-specific production behavior.

---

## 18. Architecture implication — provisional

EXP-09 materially strengthens the emerging Seed Extension concept.

Before:

```text
provider changes
→ edit extension source
→ rebuild/reload/release extension
```

Potential model after EXP-09:

```text
Stable Browser Runtime / Seed Extension
        ↓
Adapter Registry
        ↓
versioned runtime site adapters
        ↓
USER_SCRIPT isolated worlds
        ↓
provider-specific semantics
```

The stronger abstraction may therefore be:

> **Seed Extension = stable discovery/control runtime; site-specific behavior = versioned runtime adapters whenever technically and regulatorily appropriate.**

Dedicated extensions may still be justified for permission isolation, UX, store single-purpose requirements, security boundaries or provider-specific product needs.

Do not lock that decision in Phase 1.

---

## 19. Current conclusion

`chrome.userScripts` is not merely another injection API. It potentially changes the release boundary of the platform.

It enables a stable extension shell to execute and manage versioned runtime adapter code while preserving useful isolation and a dedicated messaging boundary.

But four constraints prevent treating it as magic:

```text
user enablement
+ host access
+ update/reconciliation lifecycle
+ runtime-code trust/regulation
```

Therefore the correct current classification is:

```text
Dynamic Adapter Delivery via userScripts
Technical Reach: LIKELY
Implementation Evidence: NOT YET IMPLEMENTED
Micro-proof: REQUIRED
Boundary/Regulation: NEEDS SEPARATE STUDY
```

---

## Sources

Official Chrome references:

- https://developer.chrome.com/docs/extensions/reference/api/userScripts
- https://developer.chrome.com/docs/extensions/reference/permissions-list
- https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
- https://developer.chrome.com/docs/extensions/reference/api/runtime
- https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements
- https://developer.chrome.com/docs/extensions/develop/migrate/remote-hosted-code

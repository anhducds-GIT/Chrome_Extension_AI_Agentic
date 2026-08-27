# EXP-07 — Authenticated Session + Cookies / Storage / IndexedDB Reach Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent study:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Scope:** Technical reach only. No production implementation. Provider policy/regulation remains a separate axis.

## 1. Research question

How deeply can the Browser Runtime observe, correlate, preserve and reconstruct the authenticated state of a web application when that state may be spread across:

```text
cookies
+ partitioned cookies / cookie stores
+ localStorage
+ sessionStorage
+ IndexedDB
+ Cache Storage / Service Worker related state
+ server-side session state
```

Target model:

```text
authenticated browser profile
→ identify storage/cookie context
→ inspect relevant client-side state
→ correlate with page/network semantics
→ persist only durable workflow metadata locally
→ reconstruct Browser Runtime handles after restart
→ verify session health semantically
→ continue workflow
```

The target is **authenticated-session continuity**, not credential theft, universal session cloning or provider-specific bypass.

---

## 2. Core finding

**Chrome exposes enough primitives to build a strong authenticated-session observer and recovery layer, but “authenticated session” must not be modeled as a cookie snapshot.**

A real application can distribute state across several independent mechanisms. Therefore the reusable abstraction should be a **Session State Graph**:

```text
SESSION STATE GRAPH
├─ browser profile / cookie store
├─ top-level site / partition key
├─ target / session / frame
├─ storage key
├─ cookies
├─ localStorage / sessionStorage
├─ IndexedDB
├─ cache / worker-related state
├─ network-auth evidence
└─ DOM/application semantic evidence
```

The runtime should derive a high-level semantic state such as:

```text
AUTH_HEALTHY
AUTH_EXPIRED
AUTH_PARTIAL
AUTH_UNKNOWN
REAUTH_REQUIRED
```

rather than treating any one cookie or token as authoritative.

**Technical reach:** LIKELY / strong documented basis; controlled micro-proof required before marking PROVEN.

---

## 3. Primitive P1 — `chrome.cookies` gives extension-level cookie reach

Chrome documents `chrome.cookies` as an API to query, modify and observe cookie changes.

Required access:

```text
"cookies" permission
+ host permission for the relevant host
```

Important properties exposed on returned cookie records include:

- domain;
- path;
- value;
- expiration;
- `httpOnly`;
- `secure`;
- `sameSite`;
- session/persistent status;
- cookie store ID;
- partition key for partitioned cookies.

This means the extension is not limited to JavaScript-visible `document.cookie`. `HttpOnly` is a browser cookie property represented by the extension API even though page JavaScript cannot access such cookies.

Potential observation flow:

```text
host permission
→ chrome.cookies.getAll({url/domain/...})
→ cookie metadata/value snapshot
→ cookie change subscription
→ session evidence
```

`chrome.cookies.onChanged` also exposes cookie mutation events and causes such as explicit set, expiry, eviction and overwrite.

### Important limitation

`chrome.cookies` does not mean “all cookies in the browser with no boundary”. Retrieval is restricted to domains for which the extension has host permissions.

**Default recommendation for a shared runtime:** prefer `chrome.cookies` for site-scoped cookie observation because the permission boundary is explicit and the API understands cookie stores and partition keys.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/cookies

---

## 4. Primitive P2 — cookie stores and incognito are separate state spaces

Chrome exposes cookie stores through `chrome.cookies.getAllCookieStores()`.

The documentation explicitly notes that an incognito window uses a separate cookie store from a regular window.

Therefore session identity must include at least:

```text
profile/runtime context
+ cookieStoreId
```

and must never assume that a domain has one global cookie set.

Incognito access is separately user-controlled. Extensions do not run in incognito by default; the user must allow incognito access on the extension details page.

### Architecture implication

A future multi-account runtime may be able to **identify and route among existing cookie stores**, but the extension API should not be assumed to provide an arbitrary “create new isolated cookie store” primitive.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/cookies
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions

---

## 5. Primitive P3 — partitioned cookies / CHIPS change identity semantics

Chrome's cookie API supports partitioned cookies.

By default, API methods operate on unpartitioned cookies. A `partitionKey` can be supplied to target partitioned cookies.

Current Chrome documentation exposes:

- `Cookie.partitionKey` / `CookieDetails.partitionKey` (Chrome 119+);
- `chrome.cookies.getPartitionKey(frameDetails)` (Chrome 132+);
- `topLevelSite` as part of the partition key;
- `hasCrossSiteAncestor` in newer Chrome versions.

Meaning:

```text
cookie identity != only {domain, name, path}
```

A more complete logical key can include:

```text
cookieStoreId
+ domain/path/name
+ partitionKey(topLevelSite, cross-site ancestry state)
```

### Failure mode

A third-party iframe may have a different partitioned cookie when embedded under Site B versus Site C even though the iframe origin itself is identical.

Therefore a session observer that ignores partition keys can conclude incorrectly that the user is logged out, logged into the wrong account, or has contradictory cookie state.

Source:
- https://developer.chrome.com/docs/extensions/reference/api/cookies

---

## 6. Primitive P4 — storage partitioning means origin alone is no longer enough

Chrome documents storage partitioning changes beginning in Chrome 115.

Historically web storage was keyed largely by origin. Under storage partitioning, embedded third-party contexts may receive a partition tied to the top-level site.

Chrome's extension documentation gives the concrete example that Site B embedded by Site A may not see the same storage that Site B sees when navigated top-level.

Therefore this model is too weak:

```text
storage identity = origin
```

The Browser Runtime should instead prefer:

```text
frame/target
→ storage key
→ storage-backed state
```

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies

---

## 7. Primitive P5 — CDP `Storage` domain is exposed through `chrome.debugger`

Chrome's documented `chrome.debugger` allow-list explicitly includes the CDP `Storage` domain.

Relevant `Storage` primitives include:

- `Storage.getCookies` / `Storage.setCookies`;
- `Storage.getUsageAndQuota`;
- `Storage.clearDataForOrigin`;
- `Storage.clearDataForStorageKey`;
- `Storage.getStorageKey`;
- `Storage.trackIndexedDBForOrigin`;
- `Storage.trackIndexedDBForStorageKey`;
- corresponding IndexedDB update events;
- Cache Storage tracking primitives.

`Storage.getStorageKey(frameId)` can return the storage key associated with a frame; the older `getStorageKeyForFrame` form is deprecated.

### Architectural role

The `Storage` domain is useful as a **storage identity / lifecycle / observation layer**:

```text
frame registry
→ Storage.getStorageKey(frameId)
→ storageKey
→ track IndexedDB/cache changes
→ correlate changes with ActionSpan / session state
```

Some methods are experimental in tip-of-tree CDP and therefore require runtime capability probing before production reliance.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Storage/

---

## 8. Critical boundary — full CDP `DOMStorage` and `IndexedDB` are NOT documented `chrome.debugger` domains

Full Chrome DevTools Protocol currently contains separate domains:

- `DOMStorage`
- `IndexedDB`

The full `IndexedDB` domain can enumerate database names, inspect object-store metadata and request records.

However the current official `chrome.debugger` allow-list **does not include either `DOMStorage` or `IndexedDB`**.

Therefore this inference is invalid:

```text
IndexedDB exists in full CDP
→ extension can call IndexedDB.requestData
```

Correct current status:

```text
full CDP IndexedDB/DOMStorage capability = DOCUMENTED
chrome.debugger direct exposure           = NOT DOCUMENTED / EXPECT UNAVAILABLE
```

A controlled micro-proof should explicitly attempt one harmless direct call and record the rejection/result rather than assuming behavior.

Sources:
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/IndexedDB/
- https://chromedevtools.github.io/devtools-protocol/tot/DOMStorage/

---

## 9. Primitive P6 — page storage is still reachable through the correct execution context

Chrome documents that when a content script invokes web storage APIs, it accesses storage belonging to the **host page**, not storage belonging to the extension origin.

Chrome's storage documentation explicitly includes IndexedDB among web-platform storage APIs used by extensions/content contexts.

Separately, `Runtime` is an allowed `chrome.debugger` domain and `Runtime.evaluate` can execute JavaScript in a selected execution context and await promises.

Therefore there are two plausible paths for page-origin storage:

### Path A — Content Script

```text
site adapter/content script in permitted frame
→ localStorage / sessionStorage / IndexedDB Web APIs
→ normalized observation result
→ extension runtime
```

### Path B — CDP Runtime

```text
Target/Session/Frame/Context Registry
→ correct unique execution context
→ Runtime.evaluate / callFunctionOn
→ page's storage Web APIs
→ await Promise for IndexedDB transaction
→ return normalized data by value
```

This creates an important distinction:

```text
Direct CDP IndexedDB domain may be unavailable
BUT
IndexedDB Web API inside the page's own execution context may still be reachable
```

### Safety / correctness requirement

The Runtime path must reuse EXP-04's context registry. `executionContextId` may be reused across process boundaries; `uniqueContextId`, when supported, is safer for avoiding evaluation in a stale/wrong context after navigation.

Sources:
- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/

---

## 10. localStorage, sessionStorage and IndexedDB are different durability classes

They should not be flattened into one generic “web storage” field.

### localStorage

Page-origin persistent key/value storage. Useful for app preferences, cached identifiers or tokens when a site chooses to store them there.

### sessionStorage

Scoped to a page session. It should be treated as **ephemeral runtime state** for recovery design unless a controlled restart experiment proves the browser restores the specific state under the specific lifecycle being tested.

### IndexedDB

Asynchronous structured object storage tied to the page origin/storage partition. Web apps may store cached entities, application state, queues or tokens here.

### Cache Storage / worker-related state

Cache Storage is separately represented in CDP and `CacheStorage` is on the `chrome.debugger` allow-list. Service-worker-mediated applications may rely on cached resources or worker state, but the `ServiceWorker` CDP domain itself is not listed as directly exposed through `chrome.debugger`.

**Implication:** authenticated state can cross multiple durability and visibility boundaries. A recovery layer must re-probe semantics after restart instead of assuming byte-for-byte persistence.

Sources:
- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- https://developer.chrome.com/docs/extensions/reference/api/debugger

---

## 11. Authentication state is larger than browser-side storage

Even if cookies and page storage can be inspected, the browser does not necessarily contain the complete authority for a login.

Potential non-portable factors include:

- server-side session records;
- rotating access/refresh tokens;
- expiry/revocation;
- CSRF/nonces derived dynamically;
- origin/top-level-site partitioning;
- device-bound or browser-bound state;
- WebAuthn/passkey challenges;
- worker-memory state;
- application-specific integrity checks.

Therefore these are separate capabilities:

```text
A. Observe current authenticated browser session     → LIKELY
B. Reconstruct Browser Runtime around same profile   → LIKELY
C. Restore normal app workflow after Chrome restart  → LIKELY / needs proof
D. Clone login state into arbitrary profile/machine  → NOT UNIVERSALLY PROVEN
```

The architecture should optimize for **reuse of the already-authenticated Chrome profile**, not assume that authentication should be serialized and recreated elsewhere.

---

## 12. Recommended abstraction — Session State Graph

Candidate provider-independent data model:

```text
SessionStateGraph {
  runtime_profile_id
  cookie_store_id
  incognito
  top_level_origin
  frame_id
  target_id
  session_id
  unique_context_id?
  storage_key?

  cookie_evidence[]
  local_storage_evidence[]
  session_storage_evidence[]
  indexeddb_evidence[]
  cache_evidence[]

  network_auth_evidence[]
  dom_semantic_evidence[]

  observed_at
  auth_health
  confidence
}
```

This record should store **evidence and derived health**, not blindly persist every secret/token to disk.

The durable orchestrator needs enough metadata to reacquire the session, not necessarily a full credential dump.

---

## 13. Compound capability C1 — semantic session health probe

A reusable worker can combine:

```text
cookie presence/change
+ storage evidence
+ network response semantics
+ DOM/app identity marker
→ AUTH_HEALTHY / AUTH_EXPIRED / AUTH_UNKNOWN
```

Example generic pattern:

```text
reconnect to candidate authenticated tab
→ rebuild frame/context registry
→ identify cookie store + storage key
→ observe session evidence
→ trigger harmless app-level read
→ correlate response + UI identity
→ mark session healthy
```

This is more reliable than checking whether a cookie named `session` exists.

---

## 14. Compound capability C2 — storage-aware restart recovery

EXP-05 established that browser recovery should be reconstruction + reconciliation.

EXP-07 adds the authenticated-state layer:

```text
local workflow checkpoint
→ Chrome restarts
→ enumerate/reacquire target
→ rebuild Target/Session/Frame/Context Registry
→ rediscover cookie store / partition / storage key
→ semantic auth health probe
→ resume if healthy
→ otherwise REAUTH_REQUIRED
```

No stale tab ID, execution context or cookie snapshot is treated as authoritative.

---

## 15. Compound capability C3 — app-state introspection beyond DOM

Some SPA state may not be visible in current rendered DOM but can exist in:

- localStorage;
- IndexedDB;
- Cache Storage;
- in-page JavaScript state;
- network/session state.

A site adapter can therefore combine DOM and storage evidence to answer questions such as:

```text
Has this job already been created?
Which account/workspace is active?
Is this draft locally cached?
Did the app persist a client-side job identifier?
Has an upload entered a stored queue?
```

These remain site-specific semantics built on provider-independent primitives.

---

## 16. Compound capability C4 — partition-aware multi-context routing

The runtime can distinguish:

```text
normal cookie store
vs incognito cookie store
vs partitioned cookie under top-level Site A
vs same embedded origin under top-level Site B
```

This does not automatically create arbitrary new identities, but it provides the primitives needed to avoid mixing state from different authenticated contexts.

---

## 17. Failure modes

### F1 — cookie-only auth inference

Cookie exists but session is expired/revoked server-side.

**Mitigation:** semantic network + DOM confirmation.

### F2 — ignoring partition key

Same embedded origin appears to have contradictory cookie/storage values.

**Mitigation:** include top-level site / partition key / storage key in registry identity.

### F3 — direct full-CDP assumption

Runtime calls `IndexedDB.requestData` through `chrome.debugger` because the method exists in full CDP.

**Mitigation:** enforce documented debugger allow-list + capability probe.

### F4 — stale execution context

After cross-process navigation, storage query runs in a different context from the intended page.

**Mitigation:** EXP-04 registry + `uniqueContextId` when available + generation checks.

### F5 — IndexedDB transaction race

Database changes while the runtime is reading it, or schema upgrades invalidate a connection.

**Mitigation:** bounded read-only transactions, timeout, retry/reconcile, avoid long-held DB connections.

### F6 — browser restart assumption

Runtime assumes sessionStorage or worker-memory state survived.

**Mitigation:** treat ephemeral storage as non-authoritative and re-probe app semantics.

### F7 — incognito leakage

Orchestrator persists sensitive evidence from an incognito workflow into normal durable logs.

**Mitigation:** detect incognito context and maintain explicit no-persist/redaction rules in later regulation/security design.

### F8 — session cloning overclaim

Successful cookie export/import is treated as proof that any authenticated session is portable.

**Mitigation:** classify portability independently and require provider/application-specific proof.

---

## 18. Micro-proof design

Use controlled HTTPS test origins only. No production provider login is needed.

Suggested topology:

```text
https://app-a.test/       top-level A
https://app-c.test/       top-level C
https://embed-b.test/     third-party iframe B
```

Controlled test app creates:

- a normal cookie;
- an HttpOnly cookie;
- a session cookie;
- a persistent cookie;
- a partitioned cookie where supported;
- localStorage records;
- sessionStorage records;
- one IndexedDB database/object store;
- one synthetic app identity marker in DOM;
- one harmless authenticated-style endpoint response.

### Scenario 1 — normal cookie visibility

1. grant cookie + host permissions;
2. query cookies using `chrome.cookies`;
3. verify normal and HttpOnly records are represented;
4. compare with what page `document.cookie` can see.

### Scenario 2 — cookie mutation events

1. rotate/overwrite/expire synthetic cookie;
2. record `chrome.cookies.onChanged` events and causes;
3. correlate with network/page state.

### Scenario 3 — partitioned cookie

1. embed B under top-level A;
2. set/read partitioned cookie;
3. embed B under C;
4. prove different partition identity/value;
5. call `chrome.cookies.getPartitionKey()` for frame when supported.

### Scenario 4 — storage partitioning

1. write storage in B when top-level;
2. write/read B while embedded under A and C;
3. record whether storage differs by partition;
4. retrieve CDP storage key per frame if supported.

### Scenario 5 — local/session storage via content script

1. run content script in controlled page;
2. read synthetic localStorage/sessionStorage;
3. prove values belong to host page storage, not extension storage.

### Scenario 6 — IndexedDB through page execution context

1. create synthetic IndexedDB DB and record;
2. identify correct Runtime execution context;
3. use `Runtime.evaluate` or `callFunctionOn` with `awaitPromise:true` to perform a bounded read;
4. return normalized JSON result by value;
5. repeat after navigation/context recreation.

### Scenario 7 — direct IndexedDB-domain boundary

1. attempt harmless `IndexedDB.requestDatabaseNames` through `chrome.debugger`;
2. record actual response/rejection;
3. confirm architecture does not depend on the unavailable domain.

### Scenario 8 — Storage-domain IndexedDB tracking

1. obtain storage key where supported;
2. call `Storage.trackIndexedDBForStorageKey` or origin equivalent;
3. mutate controlled IndexedDB content from page;
4. observe list/content update events;
5. correlate update to frame/storage key.

### Scenario 9 — cookie-store separation

1. enumerate cookie stores;
2. if incognito access is explicitly enabled, create controlled normal/incognito sessions;
3. verify independent stores and correct routing;
4. do not persist incognito content in durable evidence.

### Scenario 10 — browser/reload recovery

1. persist synthetic cookie/localStorage/IndexedDB state;
2. create sessionStorage state;
3. restart/reload controlled browser/extension lifecycle;
4. rebuild runtime registry from scratch;
5. re-read available state;
6. mark which state survives empirically;
7. run semantic auth health probe rather than trusting prior snapshot.

### Scenario 11 — stale-context protection

1. obtain context identifiers;
2. navigate across process/origin boundary;
3. attempt old context reference safely/read-only;
4. verify registry rejects/reconciles stale generation;
5. repeat with `uniqueContextId` when supported.

### Scenario 12 — cookie-present but server-expired

1. leave synthetic cookie present;
2. invalidate server-side session record;
3. verify cookie-only logic would be false positive;
4. confirm combined network + DOM health probe produces `AUTH_EXPIRED` or equivalent.

---

## 19. PASS criteria

EXP-07 passes only if all of the following are demonstrated on controlled infrastructure:

1. `chrome.cookies` can deterministically enumerate relevant permitted cookies, including metadata needed to distinguish HttpOnly/session/persistent state.
2. cookie-store identity is captured and normal/incognito stores are not conflated.
3. partitioned-cookie identity is mapped correctly when CHIPS is present.
4. frame → storage-key mapping is observed where supported, and storage partitioning is not modeled as origin-only.
5. host-page localStorage/sessionStorage can be read through the intended page/frame context.
6. controlled IndexedDB records can be read through the page execution context without relying on the direct full-CDP IndexedDB domain.
7. direct unavailable-domain behavior is explicitly measured and recorded.
8. IndexedDB/storage update observation can be correlated with the correct origin/storage key where supported.
9. navigation/restart does not reuse stale runtime handles as durable identity.
10. session health is derived from at least two independent signal classes (for example storage/cookie + network/DOM semantics).
11. cookie presence alone cannot produce a false `AUTH_HEALTHY` in the server-invalidated test.
12. the proof makes no claim that arbitrary authenticated sessions are universally portable across profiles or machines.

---

## 20. Decision unlocked by EXP-07

If the micro-proof passes, authenticated browser state can become a shared Browser Runtime subsystem:

```text
AuthenticatedSessionRuntime
├─ Cookie Store Registry
├─ Partition / Storage-Key Resolver
├─ Page Storage Adapter
├─ Session Evidence Collector
├─ Semantic Auth Health Probe
└─ Recovery Reconciler
```

Site adapters then only define application semantics such as:

```text
what indicates current account/workspace
what response means auth expired
what stored key is relevant to workflow state
what page marker confirms identity
```

The shared runtime owns the browser/storage mechanics.

---

## 21. Current conclusion

The technical ceiling is materially higher than “automation inside an already-open page”.

A Chrome Extension + `chrome.debugger` can plausibly understand enough of the authenticated browser context to support durable workers that survive runtime reconstruction.

But the strongest model is:

> **Reuse and semantically verify the user's authenticated browser state; do not treat authentication as a portable cookie blob.**

This aligns with EXP-05:

```text
persistent local workflow state
→ reacquire authenticated browser context
→ rebuild target/frame/context/storage identities
→ semantic session health probe
→ continue work
```

The major remaining uncertainty is empirical: how consistently the Storage-domain experimental methods and page-context IndexedDB path behave across nested/partitioned frames and Chrome restart scenarios.

---

## Sources

Official Chrome / CDP references:

- https://developer.chrome.com/docs/extensions/reference/api/cookies
- https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies
- https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- https://developer.chrome.com/docs/extensions/reference/api/debugger
- https://developer.chrome.com/docs/extensions/reference/api/scripting
- https://chromedevtools.github.io/devtools-protocol/tot/Storage/
- https://chromedevtools.github.io/devtools-protocol/tot/Runtime/
- https://chromedevtools.github.io/devtools-protocol/tot/IndexedDB/
- https://chromedevtools.github.io/devtools-protocol/tot/DOMStorage/
- https://chromedevtools.github.io/devtools-protocol/tot/CacheStorage/
- https://chromedevtools.github.io/devtools-protocol/tot/Network/

---
kind: study
status: active
ttl_days: 180
---

# EXP-15 — Loopback Bridge / Local Network Access / WebSocket Ceiling Study V0

**Status:** Phase 1 information collection  
**Date:** 2026-08-28  
**Parent:** `drafts/CHROME_BRIDGE_CAPABILITY_REACH_STUDY_V0.md`  
**Correction baseline:** `drafts/PHASE1-FACTUAL-CORRECTIONS-2026-08-28.md`  
**Scope:** Current loopback transport reach/risk. No production redesign.

---

## 1. Research question

Is the current Bridge architecture:

```text
MV3 extension service worker
↔ ws://127.0.0.1:<port>
↔ local Node bridge host
```

technically sustainable under Chrome's current Local Network Access security model, and what failure modes must be proven before calling it future-safe?

The original gap G1 was phrased in terms of **Private Network Access (PNA)**. That framing is now stale: Chrome's current model is **Local Network Access (LNA)**, and current Chromium includes LNA checks for WebSockets.

---

## 2. Core finding

**The loopback WebSocket architecture remains technically plausible and is already implemented in the repo, but its current-Chrome LNA permission behavior from a `chrome-extension://` MV3 service worker is a load-bearing micro-proof that Phase 1 must carry forward explicitly.**

Source-level facts are now strong:

```text
WebSocket to local/loopback address
→ Local Network Access check
→ permission state is consulted
```

and for shared/service workers:

```text
worker request
→ check existing LNA permission state
→ DO NOT trigger permission prompt from worker context
```

Current Chromium Network Service also has the WebSocket LNA feature enabled by default.

What is **not** proven from primary sources in this study:

```text
Does an ordinary chrome-extension:// service-worker origin
with manifest host permission http://127.0.0.1/*
automatically resolve loopback LNA permission as GRANTED?
```

No primary source located here establishes that equivalence. Therefore:

- do **not** conclude the Bridge is broken;
- do **not** conclude host permission is sufficient;
- run the controlled permission matrix before promoting LNA compatibility to PROVEN.

**Technical Reach:** current transport implementation PROVEN in repo; current/future LNA compatibility **NEEDS MICRO-PROOF**.

---

## 3. PNA → LNA correction

Chrome's Local Network Access work replaced the earlier PNA permission/preflight direction with a permission-gated model for local-network and loopback access.

The WebSocket rollout explicitly extends LNA restrictions to WebSocket connections to local/loopback addresses.

Modern Chromium also separates local and loopback concepts in permission/policy surfaces, including `loopback-network` for local-device access.

Therefore G1 should be renamed conceptually:

```text
OLD:
Does PNA preflight affect MV3 WebSocket → 127.0.0.1?

CURRENT:
How does LNA loopback permission resolve for a chrome-extension://
service worker opening ws://127.0.0.1?
```

Sources:
- https://developer.chrome.com/blog/local-network-access
- https://groups.google.com/a/chromium.org/g/blink-dev/c/O6GMKt44Ups
- https://wicg.github.io/local-network-access/

---

## 4. Current Chromium WebSocket LNA enforcement

Current Chromium Network Service source includes a `LocalNetworkAccessChecker` in the WebSocket path and a feature flag specifically for WebSocket checks.

`services/network/public/cpp/features.cc` currently declares:

```text
kLocalNetworkAccessChecksWebSockets
= FEATURE_ENABLED_BY_DEFAULT
```

The WebSocket implementation can reject a connection when the LNA permission requirement is not satisfied, using the local-network-access failure path (`ERR_BLOCKED_BY_LOCAL_NETWORK_ACCESS_CHECKS`).

This is no longer a speculative future-only concept at source level.

Sources:
- https://chromium.googlesource.com/chromium/src/+/HEAD/services/network/websocket.cc
- https://chromium.googlesource.com/chromium/src/+/HEAD/services/network/public/cpp/features.cc

---

## 5. Worker-context permission behavior — load-bearing

Current Chromium `storage_partition_impl.cc` documents three LNA request contexts:

1. document context;
2. navigation context;
3. shared/service-worker context.

For worker context, Chromium states that workers may not have a document available, so they:

```text
check permission state
but DO NOT trigger the permission prompt
```

The worker permission path then treats only an existing `GRANTED` status as permission to proceed; ASK/DENIED are not converted into a worker-owned prompt flow.

This matters directly to the repo because the WebSocket is constructed inside the MV3 background service worker.

Implication:

```text
service worker cannot be assumed to bootstrap its own LNA grant
```

If a user-facing grant is required for extension origins, some eligible document/UI context or browser-level extension-specific grant mechanism must establish it first. Whether Chrome already grants extension origins specially is the unresolved extension-specific question.

Source:
- https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/storage_partition_impl.cc

---

## 6. Repo transport — what is actually implemented

The current ChatGPT worker manifest declares:

```json
"host_permissions": [
  "https://chatgpt.com/*",
  "https://chat.openai.com/*",
  "http://127.0.0.1/*"
]
```

and uses an MV3 background service worker.

Repo evidence:
- `workers/duc-auto-chatgpt/v0.1.0/manifest.json`

The extension transport actually does:

```text
new WebSocket(pairing.websocket_url)
```

from `bridge-transport-loopback.js`.

Current implementation includes:

- reconnect alarm every 0.5 minute;
- 20-second application keepalive;
- authenticated state machine;
- host challenge proof using HMAC-SHA256;
- token exchange only after host proof succeeds;
- JSON-only transport frames;
- frame-size rejection;
- fail-closed disconnected status.

Repo evidence:
- `workers/duc-auto-chatgpt/v0.1.0/bridge-transport-loopback.js`

This means the Bridge is not merely a proposed architecture: the WebSocket client/auth/reconnect layer exists today.

---

## 7. Local host reach and confinement

The current local host is deliberately loopback-only.

`bridge-host.mjs` defines:

```text
DEFAULT_HOST = 127.0.0.1
DEFAULT_PORT = 32147
MAX_ENVELOPE_BYTES = 1 MiB
MAX_INFLIGHT = 32
```

Pairing validation requires the host to be literal `127.0.0.1`, and the HTTP/WebSocket URLs must match fixed loopback paths.

The Node server calls:

```text
server.listen(pairing.port, 127.0.0.1)
```

so it does not intentionally bind LAN/WAN interfaces.

Repo evidence:
- `workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs`

This materially reduces network exposure, though it does not exempt the browser side from LNA security checks.

---

## 8. Origin and authentication controls

The host accepts extension WebSocket upgrades only when the request Origin matches:

```text
chrome-extension://<32-char extension id>
```

and the path is exactly `/v1/extension`.

Then authentication is two-stage:

```text
extension sends random nonce challenge
→ host proves possession of pairing token with HMAC-SHA256
→ extension verifies proof
→ extension sends auth token
→ host constant-time verifies token
→ auth_ok
```

The local HTTP `/v1/rpc` path separately:

- rejects browser requests carrying an `Origin` header;
- requires Bearer token authentication;
- enforces the 1 MiB request limit;
- correlates extension response request IDs;
- caps concurrent relay requests.

This is strong repo-level evidence that the Bridge is not an unauthenticated localhost RPC server.

However origin regex alone accepts any syntactically valid extension origin; the actual pairing token remains the core authentication secret.

---

## 9. Service-worker lifetime / reconnect

Chrome documents that from Chrome 116 onward, active WebSocket traffic can extend MV3 service-worker lifetime by resetting the idle timer.

The repo sends a keepalive every 20 seconds after authentication, which aligns with that lifecycle primitive.

The repo also creates a 30-second recurring alarm as a reconnect safety net.

This gives two distinct roles:

```text
active WebSocket traffic
→ lifecycle anchor while connected

chrome.alarms reconnect
→ reacquire after worker wake / host outage
```

Neither mechanism is durable workflow state by itself. EXP-05 remains authoritative for reconstruct/reconcile/resume.

Source:
- https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

---

## 10. Host permissions — unresolved relation to LNA permission

The manifest currently has:

```text
http://127.0.0.1/*
```

host access.

Host permissions are relevant to extension cross-origin access generally, but this study did **not** find a current official source stating:

```text
Chrome extension host permission for 127.0.0.1
==
automatic LNA `loopback-network` grant for service-worker WebSocket
```

These are different permission/security concepts and must not be collapsed by inference.

This is the central remaining G1 micro-proof.

---

## 11. Secure-context implications

LNA's user permission model is designed around secure requesting contexts.

Chrome extension pages/service workers are privileged extension contexts rather than ordinary `http:` web pages, but the exact LNA permission-query/prompt behavior of `chrome-extension://` origins is precisely the part this study leaves to live verification.

Do not assume that because the WebSocket destination is `ws://127.0.0.1` the connection is automatically exempt from LNA or mixed-content/security logic.

Recent Chromium work on WebSocket `targetAddressSpace` exists specifically because local servers commonly cannot serve secure WebSockets, which reinforces that loopback WebSocket behavior is an actively evolving browser-security area.

Source:
- https://groups.google.com/a/chromium.org/g/Blink-dev/c/hVlq3XXExbU

---

## 12. Port collision

The host uses a pairing-specified port, defaulting to 32147 in its constants.

Current `start()` calls Node `server.listen()` and rejects on server error. There is no repo evidence here of automatic fallback to another free port if the port is occupied.

Therefore:

```text
port already occupied
→ host start error
→ current pairing endpoint remains unavailable
```

The correct recovery may be to generate/re-persist a fresh pairing port, but that is not proven current behavior and should remain a future implementation decision.

---

## 13. Host unavailable / restart behavior

Extension behavior when host is unavailable:

- WebSocket errors/close lead to disconnected state;
- status records `HOST_UNAVAILABLE`;
- reconnect alarm retries while paired and unauthenticated.

When the browser/service worker restarts, pairing state is loaded from `chrome.storage.local` by the transport and connection is retried when the transport initializes.

Remaining distinction:

```text
extension reconnect logic exists
!=
local Node host is automatically persistent across OS/browser restart
```

Host process persistence/daemonization is a separate local-runtime property and should not be inferred from WebSocket reconnect code.

---

## 14. Firewall / endpoint security

Loopback binding avoids exposure on physical network interfaces, but OS firewall, endpoint security, antivirus, port reservation or local process conflicts can still affect availability.

There is no browser API that can distinguish all such causes from a generic local-host connection failure.

Operational classification should therefore remain coarse:

```text
HOST_UNAVAILABLE
PORT_IN_USE
LNA_BLOCKED
AUTH_FAILED
TRANSPORT_DISCONNECTED
```

where exact lower-level diagnosis may require host logs / Chrome NetLog / OS evidence.

---

## 15. Message size / throughput

Current host sets:

```text
MAX_ENVELOPE_BYTES = 1 MiB
MAX_INFLIGHT = 32
```

and the extension transport rejects incoming text frames larger than the protocol envelope limit plus a small framing allowance.

This is a **repo-defined protocol limit**, not a Chrome WebSocket limit.

Consequences:

- metadata/RPC fits naturally;
- large images/video/binary artifacts should not be shoved through a monolithic JSON envelope;
- EXP-02/06 Artifact Bus remains the better architecture: use the Bridge as control plane and filesystem/local artifact references as data plane.

Practical throughput/chunking remains G9-style measurement work, not a conceptual blocker.

---

## 16. Technical limitations

1. LNA WebSocket enforcement is an active/current Chromium security layer.
2. Service/shared workers cannot assume they can trigger the required permission prompt.
3. Extension-origin LNA grant semantics remain unproven in this project.
4. Host permission and LNA permission must not be treated as synonymous without proof.
5. `ws://` loopback behavior is still evolving around WebSocket target-address-space support.
6. Current port selection has no proven collision fallback.
7. Local host persistence is not guaranteed by extension reconnect logic.
8. The 1 MiB envelope is a current protocol design limit.
9. Pairing token compromise would authorize a local client that can satisfy the transport protocol; secret storage/rotation remains important.
10. Loopback-only binding protects against LAN exposure but not malicious local processes with access to the pairing secret.

---

## 17. Failure modes

| Failure | Meaning | Handling |
|---|---|---|
| `LNA_PERMISSION_NOT_GRANTED` | worker's loopback request lacks current Chrome grant | explicit setup/probe; do not retry forever |
| `LNA_PROMPT_UNAVAILABLE_IN_WORKER` | worker cannot bootstrap ASK state | obtain permission from an eligible UI/document path if Chrome supports it |
| `HOST_UNAVAILABLE` | no listener / process stopped | alarm retry + operator/local-runtime recovery |
| `PORT_IN_USE` | host cannot bind pairing port | diagnose/re-pair to free port if supported |
| `AUTH_FAILED` | host proof/token invalid | fail closed; re-pair |
| `ORIGIN_REJECTED` | WebSocket upgrade not from extension origin | fail closed |
| `FRAME_TOO_LARGE` | envelope exceeds repo limit | Artifact Bus / chunk/reference strategy |
| `RELAY_CAPACITY` | inflight cap reached | backpressure |
| `REQUEST_TIMEOUT` | local RPC exceeded host timer | idempotent retry/reconcile |
| `TRANSPORT_DISCONNECTED` | socket lost mid-request | mark unknown/retryable according to Action Journal |
| `FIREWALL_OR_SECURITY_BLOCK` | OS/security software interferes | host diagnostics / NetLog |
| `BROWSER_POLICY_BLOCK` | enterprise/local policy denies loopback | explicit policy status, not blind reconnect |

---

## 18. Compound capability — Authenticated Loopback Control Plane

Composition:

```text
loopback-only Node host
+ browser WebSocket
+ extension-origin validation
+ HMAC host proof
+ pairing-token auth
+ bounded JSON RPC
+ 20s WebSocket keepalive
+ alarm reconnect
+ durable pairing record
→ AUTHENTICATED_LOOPBACK_CONTROL_PLANE
```

Repo implementation status: **PROVEN** as implemented transport logic.

Current-Chrome security compatibility status:

```text
LNA enforcement exists                 PROVEN from source
worker cannot self-prompt              PROVEN from source
extension-origin loopback grant path   NEEDS MICRO-PROOF
```

Therefore the compound capability is not yet **future-safe PROVEN**.

---

## 19. Controlled LNA micro-proof matrix

Use a fresh controlled Chrome profile and current installed Chrome build. No provider website is needed.

Test two extension builds only for the controlled proof:

```text
A. host permission includes http://127.0.0.1/*
B. same test extension without that host permission
```

Matrix:

| Case | Initiator | Destination | Prior grant | Host | Expected evidence |
|---|---|---|---|---|---|
| 1 | MV3 service worker | `ws://127.0.0.1:<port>` | fresh profile | running | open/error + NetLog |
| 2 | extension document/side panel | same | fresh profile | running | whether LNA prompt can occur |
| 3 | MV3 worker | same | after any explicit UI grant | running | whether worker inherits grant |
| 4 | MV3 worker | `ws://localhost:<port>` | same state | running | loopback hostname comparison |
| 5 | MV3 worker | `ws://127.0.0.1:<port>` | same | absent | HOST_UNAVAILABLE baseline |
| 6 | host process | fixed port | n/a | port occupied | host bind error |
| 7 | MV3 worker | loopback | granted if possible | running | browser restart/reconnect |
| 8 | MV3 worker | loopback | same | firewall/security deny | distinguish transport failure |

Repeat A/B host-permission variants at minimum for cases 1–3.

Capture:

- WebSocket `open/error/close`;
- close code/reason when available;
- extension status storage;
- Chrome console/network diagnostics;
- Chrome NetLog if LNA reason is ambiguous;
- whether a permission prompt appears in extension UI/document context;
- permission state before/after if an applicable Permissions API query is exposed;
- browser version and feature flags/policies.

Do not infer LNA block merely from `HOST_UNAVAILABLE`; run the host-present control first.

---

## 20. PASS criteria

The LNA/Bridge proof passes only if:

1. Current Chrome behavior for MV3 service-worker `ws://127.0.0.1` is measured on a fresh profile.
2. Host-permission ON/OFF variants are distinguished.
3. Any LNA prompt/grant path is observed and documented rather than inferred.
4. Worker behavior before and after a grant is measured if a grant path exists.
5. `127.0.0.1` and `localhost` are compared.
6. An LNA denial can be distinguished from host-absent failure, ideally through NetLog/error evidence.
7. Browser restart successfully reconstructs or clearly fails the transport according to measured behavior.
8. Port collision is reproduced and failure classified.
9. Authentication still fails closed for wrong token/origin after any permission setup.
10. No claim that host permission equals LNA permission is made unless the experiment demonstrates it.

---

## 21. Technical Reach classification

| Capability | Reach |
|---|---|
| loopback Node listener bound only to `127.0.0.1` | **PROVEN repo implementation** |
| extension WebSocket transport | **PROVEN repo implementation** |
| HMAC/token pairing/auth | **PROVEN repo implementation** |
| 20s keepalive + 30s reconnect alarm | **PROVEN repo implementation** |
| 1 MiB envelope / 32 inflight limits | **PROVEN repo implementation** |
| Chrome LNA checks apply to local/loopback WebSockets | **PROVEN current Chromium/source rollout** |
| worker context checks permission but does not prompt | **PROVEN current Chromium source** |
| host permission automatically grants loopback LNA to extension worker | **NOT PROVEN** |
| extension document can bootstrap required loopback grant | **NEEDS MICRO-PROOF** |
| current Bridge remains operational under current installed Chrome | **LIKELY / MUST RE-PROVE ON CURRENT BUILD** |
| long-term/future-safe loopback transport | **CONSTRAINED / VERSION-PROBE + MICRO-PROOF** |

---

## 22. Remaining evidence gaps

### Load-bearing

**E15-G1:** Exact LNA `loopback-network` permission result for ordinary `chrome-extension://` MV3 service-worker WebSockets on the current Chrome build.

This is the highest-priority live micro-proof left from Phase 1.

### Important but non-blocking for synthesis

- E15-G2: Is there a documented extension-specific UI/Permissions API path for explicitly granting/querying `loopback-network`?
- E15-G3: Does `http://127.0.0.1/*` host permission affect LNA permission status, WebSocket creation, both, or neither?
- E15-G4: Practical reconnect behavior under browser/OS restart when the local host is managed as a daemon/service.
- E15-G5: Real throughput/backpressure around the repo's 1 MiB envelope.
- E15-G6: Port re-pair/fallback strategy after collision.
- E15-G7: Enterprise policy interaction for `chrome-extension://` origins.

These gaps should be carried into the synthesis/micro-proof backlog rather than spawning further discovery EXPs.

---

## 23. Official / primary sources

- Chrome Local Network Access: https://developer.chrome.com/blog/local-network-access
- Blink Intent to Ship — WebSocket LNA: https://groups.google.com/a/chromium.org/g/blink-dev/c/O6GMKt44Ups
- WICG Local Network Access: https://wicg.github.io/local-network-access/
- Chromium WebSocket network implementation: https://chromium.googlesource.com/chromium/src/+/HEAD/services/network/websocket.cc
- Chromium network feature flags: https://chromium.googlesource.com/chromium/src/+/HEAD/services/network/public/cpp/features.cc
- Chromium LNA request-context/worker permission handling: https://chromium.googlesource.com/chromium/src/+/HEAD/content/browser/storage_partition_impl.cc
- WebSocket `targetAddressSpace` prototype: https://groups.google.com/a/chromium.org/g/Blink-dev/c/hVlq3XXExbU
- Chrome extension service-worker lifecycle: https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle

Repo evidence:
- `workers/duc-auto-chatgpt/v0.1.0/manifest.json`
- `workers/duc-auto-chatgpt/v0.1.0/bridge-transport-loopback.js`
- `workers/duc-auto-chatgpt/v0.1.0/duc-auto-chatgpt-loopback-bridge-host-v1/bridge-host.mjs`

---

## Phase-1 conclusion

G1 is no longer an undefined question about old PNA mechanics.

The updated conclusion is:

```text
LNA WebSocket enforcement       source-proven
Worker no-prompt behavior       source-proven
Repo loopback/auth transport    implementation-proven
Extension-specific grant path   micro-proof required
```

This is sufficient to enter Phase-1 Synthesis **as a clearly classified load-bearing gap**. It does not justify either declaring the Bridge future-safe or redesigning it before the controlled current-Chrome proof is run.

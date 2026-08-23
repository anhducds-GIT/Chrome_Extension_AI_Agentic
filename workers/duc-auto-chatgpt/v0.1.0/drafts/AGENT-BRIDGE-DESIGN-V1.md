# AGENT BRIDGE DESIGN V1 — WP-0 design study

Status: design decision for WP-1 through WP-4. No bridge product code is part of WP-0.

Date verified: 2026-08-23.

Evidence basis: the current working tree, including its existing uncommitted owner work. Line references in this document point to that tree, not merely to Git `HEAD`. Before this document was added, `npm.cmd test` reported 46 worker tests passed, 0 failed, and the root observer smoke test passed.

## Decision in one page

Build one versioned, transport-independent RPC policy core and use **Option B: a token-authenticated loopback host on `127.0.0.1`** as the only production transport. A real CLI makes one authenticated HTTP connection to that host. The extension service worker keeps an outbound WebSocket to the same host and routes executor-bound requests to the open side panel. The host is a relay, not a queue, ledger, scheduler, or executor.

The side panel remains the sole product executor. It alone may turn an approved proposal into XLSX rows, run the existing Check Plan, start the existing runner, write or verify images, create an immutable Result XLSX checkpoint, and append the audit chain. Closing the side panel makes executor-bound bridge methods unavailable; it does not activate a background runner.

This retains the useful part of the prior recommendation — one pure `bridge-core.js`, a method registry, version negotiation, capability listing, default denial, stable errors, and idempotent retry — but rejects Native Messaging as the production transport for this personal workflow. Native Messaging connects Chrome to a Chrome-launched stdio child. A separate CLI cannot attach to that stdio channel; making it useful to arbitrary CLIs would require another named pipe/socket/file-queue hop. At that point it is more complex than the loopback server while providing no executor benefit.

The existing `externally_connectable` localhost API is a migration fixture only. It must be removed in WP-4, together with its test page, after the loopback bridge passes acceptance. Keeping it indefinitely would preserve an unauthenticated second ingress path and defeat the new threat model.

## Verified findings

### H1 — confirmed, with one important qualification

The current public Worker API is callable only by a web page whose Chrome origin matches `http://localhost/*` or `http://127.0.0.1/*`:

- `manifest.json` grants exactly those two external page patterns (`manifest.json:31-36`).
- `background.js` registers `chrome.runtime.onMessageExternal` (`background.js:33-38`), then independently parses `sender.origin` and accepts only HTTP plus the literal hostnames `localhost` or `127.0.0.1` (`background.js:144-172`).
- `worker-api-test.html` instructs the operator to serve the page from one of those origins and calls `chrome.runtime.sendMessage(extensionId, ...)` in page JavaScript (`worker-api-test.html:7-8`, `worker-api-test.html:19-28`).

Therefore a standalone Node or Python process cannot call `onMessageExternal` directly. It must serve or control a qualifying browser page and have that page loaded in Chrome. The qualification matters: merely owning a localhost server process is not sufficient until its page runs in Chrome.

### H2 — confirmed for the API boundary; “all logic is in the side panel” is too broad

The public Worker API is a separate text-only runner, not an entry point into the XLSX image product:

- Its registry is only `ping`, `job.submit`, `job.status`, and `job.abort` (`background.js:152-163`).
- Submission validation rejects every `task_type` except `text_prompt` (`background.js:357-363`).
- It permits one in-memory job and explicitly has no queue (`background.js:197-228`).
- Execution sends only private `DAC_RUN_PROMPT` to the content script (`background.js:273-300`); `content.js` handles that by calling `runPrompt()` without image references, image expectation, job identity, or the XLSX runner (`content.js:515-527`).
- Only terminal snapshots are copied to `chrome.storage.session`; active work is not recoverable and only the newest ten terminal records survive a service-worker sleep in the current browser session (`background.js:230-247`, `background.js:400-411`). The source itself labels the job map as in-memory and non-recovering (`background.js:28-31`).

The product path is materially different:

- The side panel prepares the logical XLSX queue through `DacRunnerCore.prepare()` (`sidepanel.js:1972-1980`) and re-runs authoritative workbook, resume, output-location, audit-chain, and ChatGPT readiness checks immediately before a run (`sidepanel.js:2181-2197`).
- Its run loop selects eligible queue rows, creates an attempt ID, sends `DAC_RUN_IMAGE_JOB`, enforces attempt identity, reconciles post-submit uncertainty, applies retry/Halt policy, performs inter-job readiness, and only advances at safe boundaries (`sidepanel.js:2996-3078`).
- `content.js` implements the page-side half: reference attachment readiness (`content.js:253-283`), attempt boundary capture and completion detection (`content.js:286-379`), the actual Send click (`content.js:421-457`), and the identity-bound `DAC_RUN_IMAGE_JOB` receiver (`content.js:539-554`).
- Output is recorded as persisted only after a write is accepted and the row is updated with `persistence_verified`, `result_file`, `output_saved_at`, and `write_outcome`; ChatGPT must then become idle before `SUCCESS` (`sidepanel.js:2905-2959`).
- Result checkpoints and audit JSONL are written at the end of the run, with persistence failure surfaced rather than reported as success (`sidepanel.js:2718-2795`, `sidepanel.js:3081-3089`).
- The current failure vocabulary has 16 canonical Failure Types and only `SECURITY_HARD_STOP`, `GENERATION_LIMIT_REACHED`, and `RECEIVER_LOST` halt the full batch (`runner-core.js:4-13`, `runner-core.js:91-117`). `resolveJobFailure()` is the single side-panel funnel that applies those rules (`sidepanel.js:2874-2903`).

So the hypothesis is right that the Worker API cannot reach the queue, checkpoints, audit chain, verified persistence, Resume, Recreate, or Halt policy. It is wrong only if read as “literally everything lives in `sidepanel.js`.” DOM submission/detection lives in `content.js`, Chrome Downloads support lives in `background.js`, workbook mechanics live in `xlsx-codec.js`, and policy/state classification is deliberately split into core modules.

#### Reusable core inventory

`sidepanel.html` loads the core stack at `sidepanel.html:552-570`. A static scan of those files finds no executable `chrome.*` reference in the modules listed below. They expose logic through `window`/`globalThis` and can run in the side panel or service worker; Node tests can load them directly. `output-location-core.js` performs side effects only through a passed-in handle-shaped object, which existing tests can fake.

| Reusable from either extension context | Responsibility and evidence |
| --- | --- |
| `checkpoint-core.js` | Immutable checkpoint naming/version collision policy; exported API at `checkpoint-core.js:67-68`. |
| `runner-core.js` | Settings, queue preparation/selection, phases, Failure Types, retry and readiness policy; `runner-core.js:4-13`, `runner-core.js:147-200`. |
| `attempt-telemetry-core.js` | Attempt/audit field normalization; `attempt-telemetry-core.js:23-28`. |
| `run-state-core.js` | Run-stage presentation state; `run-state-core.js:20-25`. |
| `resume-core.js` | Ledger identity/classification/Resume plan; `resume-core.js:116-121`. |
| `reconciliation-core.js` | Recorded-attempt proof and safe-complete decision; `reconciliation-core.js:63-68`. |
| `recreate-core.js` | Owner approval, immutable prior-attempt history, and recreate fields; `recreate-core.js:35-60`. |
| `audit-chain-core.js` | Audit gap inspection and explicit gap approval; `audit-chain-core.js:43-48`. |
| `output-location-core.js` | Naming, collision, permission preflight, handle-based write, and post-write verification; `output-location-core.js:222-242`, `output-location-core.js:299-335`, `output-location-core.js:348-371`. |
| `xlsx-run-plan-core.js` | Declarative run-plan validation; `xlsx-run-plan-core.js:54-59`. |
| `plan-diagnostics-core.js` | Check Plan findings; `plan-diagnostics-core.js:189-194`. |
| `orchestrator-review-core.js` | Read-only review packet; `orchestrator-review-core.js:114-119`. |
| `operator-glossary-core.js`, `operator-messages-core.js`, `halt-instructions-core.js` | Operator presentation/taxonomy data; exports at `operator-glossary-core.js:25-27`, `operator-messages-core.js:74-79`, and `halt-instructions-core.js:112-132`. |

Two loaded modules need a narrower description:

- `output-profile-core.js` has no `chrome.*`, but it is a browser storage adapter rather than pure policy. It opens IndexedDB, stores a directory handle, and queries that handle’s permission (`output-profile-core.js:10-41`). It is usable in an extension service worker because the extension origin shares IndexedDB, but Node requires a fake IndexedDB.
- `xlsx-codec.js` is not service-worker-ready: it uses DOM XML objects, `XMLSerializer`, and `window` (`xlsx-codec.js:106-133`, `xlsx-codec.js:219-242`, `xlsx-codec.js:338`). It remains an executor dependency in the side-panel document. `sidepanel-ui-semantics.js` is UI support, not bridge policy.

Content-side cores (`attempt-identity-core.js`, `chat-readiness-core.js`, `image-evidence-core.js`) are also browser-API-free, but they belong to the ChatGPT content receiver rather than the side-panel bridge registry.

### H3 — the absolute API claim is refuted; the executor conclusion is retained as policy

What the current code actually does:

- The user chooses a directory through `window.showDirectoryPicker()` in the side panel, and the resulting handle is placed into `state.outputSettings` (`sidepanel.js:1988-2019`). The picker itself is a Window entry point and requires a user gesture.
- The handle is also persisted in IndexedDB by `DacOutputProfiles.bind()` and later recovered and permission-checked by `resolve()` (`output-profile-core.js:10-41`). It is not held only in an ephemeral side-panel variable.
- Directory writes use `getFileHandle()`, `createWritable()`, close, then re-open and verify the exact file (`output-location-core.js:299-335`). Generated images call that handle-based writer from the side panel (`sidepanel.js:2619-2634`); Result XLSX and audit persistence also execute there (`sidepanel.js:2718-2795`).

The web-platform claim “a `FileSystemDirectoryHandle` cannot be used from an MV3 service worker” is not correct. The File System specifications expose handles to both Window and Worker and mark them Serializable; Chrome documents that file-system handles can be stored in IndexedDB. Chrome also documents that an extension’s IndexedDB is shared with its service worker. See [File System Access specification](https://wicg.github.io/file-system-access/), [Chrome persistent File System Access permissions](https://developer.chrome.com/blog/persistent-permissions-for-the-file-system-access-api), and [Chrome extension storage and service workers](https://developer.chrome.com/docs/extensions/develop/concepts/storage-and-cookies).

The real constraints are:

1. `showDirectoryPicker()` and any permission re-prompt need an open document and a user gesture; a service worker cannot present that picker.
2. Permission may be `prompt` or `denied` after reload, so a worker cannot assume a stored handle is writable.
3. The XLSX codec depends on document XML APIs and the runner’s live state, dialogs, references, queue selection, approval, and exact-once attempt loop are in the side-panel document.
4. Moving only file writes to the worker would split artifact truth from the executor that updates the workbook and audit buffer.

Therefore the chosen architecture still mandates **side panel = sole executor; service worker = authenticated transport router**. This is an explicit product invariant to prevent two execution truths, not a false claim about what Worker-exposed File System handles can technically do. WP-1 will encode this as a capability/policy rule: no registry method in the router may call `DacRunnerCore.selectQueue()`, `DAC_RUN_IMAGE_JOB`, any output writer, or any XLSX mutation.

### H4 — confirmed only when the local page is loaded in Chrome

There is no token, pairing record, allowlisted port, per-call owner approval, or capability policy in the current external API. The manifest matches both localhost names with wildcard path/port (`manifest.json:31-36`), and the only runtime check repeats protocol plus hostname (`background.js:145-169`). A qualifying page can submit a text prompt immediately; the service worker schedules execution without an owner click (`background.js:197-228`).

Threat assessment:

- A local process that serves a page and gets that page loaded in Chrome can send text prompts through Đức’s logged-in ChatGPT tab, observe the new assistant response, query its job status, and abort its job.
- A raw Node/Python client without a browser page cannot use this API, so “any localhost process can drive it” is slightly overstated.
- Ordinary remote websites and non-local origins are not allowed by the manifest/runtime checks.
- This is material but not catastrophic for a personal machine: it is an unauthenticated local-browser ingress that can impersonate the operator to ChatGPT and consume usage. It is not general browser control and does not expose the XLSX image runner.
- Malware already executing as Đức’s Windows user is a stronger adversary and remains outside this bridge’s security guarantee; it may be able to read a user token or control Chrome by other means.

Option B closes the realistic page-origin gap with an unguessable token, no CORS, a Chrome-extension-only WebSocket role, and owner approval before any product mutation.

### H5 — confirmed for a separate CLI; direct self-launch is not the same connection

Chrome’s documentation states that Chrome starts each Native Messaging host as a separate process, communicates over that child’s stdin/stdout, and starts a host when the extension calls `runtime.connectNative()` or `runtime.sendNativeMessage()`. A long-lived native port keeps that Chrome-launched process alive; `sendNativeMessage()` starts a fresh process per message. See [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging).

A separate long-lived CLI cannot attach to the stdin/stdout pipes of the instance Chrome launched. It could launch the same executable as a different process, but that new process would not be connected to Chrome. To deliver arbitrary CLI requests to the Chrome-connected instance, Option A therefore needs a second IPC facility — named pipe, loopback socket, local RPC, or shared file queue — or must stop treating the CLI as a separate process and make the Chrome-launched host itself the entire agent. The latter does not match Đức’s requirement that Codex, GPT orchestration code, Python, and scripts can independently call the extension.

That conclusion is an inference from the documented process/stdio ownership model, not an OpenAI private-protocol claim. No claim is made about how OpenAI’s private host is implemented.

### H6 — mostly confirmed; HKCU is the chosen scope, not Chrome’s only allowed scope

For Native Messaging on Windows, the host manifest must contain an exact, non-wildcard `allowed_origins` extension origin and `type: "stdio"`. Chrome locates that manifest through the default value of a registry key under either HKCU or HKLM. The personal install would correctly choose:

`HKCU\Software\Google\Chrome\NativeMessagingHosts\<host-name>`

Chrome documents both the exact origin rule and Windows registry locations in [Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging). Thus the hypothesis is wrong only in presenting HKCU as Chrome’s sole legal hive; HKLM is also supported, but would add unnecessary machine-wide/admin friction here.

The current manifest has no `key` (`manifest.json:1-37`). Chrome warns that an unpacked extension without a consistent key gets an ID based on its loaded path. The official `key` guidance describes pinning the public key in `manifest.json` to preserve one ID. See [Manifest `key`](https://developer.chrome.com/docs/extensions/reference/manifest/key) and [Chrome’s unpacked-ID warning](https://developer.chrome.com/docs/extensions/how-to/web-platform/origin-trials#determine-extension-id).

If Option A were selected, the install story would have to be all of the following, not “Đức edits Regedit”:

1. Generate and pin one extension public key in `manifest.json`; record the resulting stable ID.
2. Build a fixed host executable and host manifest whose `allowed_origins` contains exactly `chrome-extension://<stable-id>/`.
3. Give Đức one current-user installer that copies both files to a fixed `%LOCALAPPDATA%` directory, writes the exact HKCU default registry value, and verifies it. No admin prompt and no manual registry editing.
4. Give him a matching uninstaller and upgrade path. He runs those scripts himself.
5. Reload the unpacked extension after its manifest/JavaScript changes.

This is feasible, but it still does not solve the separate-CLI hop in H5. Option B needs neither registry setup nor a pinned extension ID.

## Transport decision

### Comparison

| Criterion | A — Native Messaging | B — token-authenticated loopback host | C — current `externally_connectable` page |
| --- | --- | --- | --- |
| Connection a real CLI must make | Cannot attach to Chrome’s stdio child. Needs a second IPC connection or ceases to be a separate CLI. | One authenticated HTTP request to `127.0.0.1`; host relays over its existing extension WebSocket. | Must serve/control a localhost page and get it loaded in Chrome; not a direct process API. |
| Windows install for Đức | Host binary + host manifest + exact extension ID + HKCU/HKLM registration; stable ID requires a pinned manifest key. | One current-user installer/startup helper; one pairing-file selection in the side panel; no registry and no extension-ID pinning. | Almost none, but every test/client needs a browser page and extension ID. |
| MV3 suspension | `connectNative()` keeps the worker alive while connected; disconnect still needs explicit reconnect. | Chrome 116+ WebSocket traffic resets the idle timer; a 20-second authenticated keepalive plus a 30-second alarm reconnects after host outage. Requests are idempotently retryable. | Incoming external page messages wake the worker, but the current in-memory active job is lost on termination. |
| Attack surface | Strong Chrome-side extension allowlist; native executable is privileged local code. A second CLI IPC needs its own authentication. | Listener bound only to `127.0.0.1`; 256-bit token; current-user ACL; no CORS; browser-origin rejection; fixed protocol/method allowlist; no remote listener. | Any qualifying localhost page can submit with no token or approval. |
| Effect of side-panel executor invariant | Still routes to the panel; Native Messaging does not make background execution safe. | Still routes to the panel; host has no product state. Closed panel produces an explicit executor-unavailable result. | Current API bypasses the panel and therefore cannot expose the real product safely. |
| Operational complexity | Highest: two lifecycle systems plus the missing CLI IPC. | Moderate and visible: one host process, one token, one extension socket. | Low only for the narrow text test; unsuitable for production. |

Chrome’s service-worker lifecycle documentation supports the Option B mechanics: WebSocket activity extends extension service-worker life from Chrome 116, and Chrome 120 permits 30-second alarms. See [extension service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) and [WebSockets in extension service workers](https://developer.chrome.com/docs/extensions/how-to/web-platform/websockets).

### Selected production topology

```text
 Codex / Python / CLI / Orchestrator
              |
              | HTTP POST /v1/rpc
              | Authorization: Bearer <256-bit token>
              v
 +--------------------------------------------------+
 | Duc Auto ChatGPT Loopback Bridge Host V1         |
 | bind: 127.0.0.1 only                             |
 | auth + bounded in-flight relay only              |
 | NO queue, ledger, browser control, or run state  |
 +--------------------------------------------------+
              ^
              | authenticated WebSocket /v1/extension
              | same versioned RPC envelope
              v
 +--------------------------------------------------+
 | MV3 service worker                               |
 | transport adapter + router + method denial       |
 | 20s keepalive; 30s reconnect alarm               |
 | NO XLSX mutation, run loop, or file persistence  |
 +--------------------------------------------------+
              |
              | chrome.runtime.Port "dac.bridge.executor.v1"
              | request_id preserved end to end
              v
 +--------------------------------------------------+
 | OPEN SIDE PANEL — SOLE EXECUTOR                  |
 | proposal inbox -> Đức sees exact rows -> click   |
 | XLSX queue / Check Plan / runner / checkpoints   |
 | audit chain / verified image & Result writes     |
 +--------------------------------------------------+
              |
              | existing chrome.tabs.sendMessage
              v
 +--------------------------------------------------+
 | ChatGPT content script -> DOM / attribution      |
 +--------------------------------------------------+
```

### Host, pairing, and lifecycle rules

- Default endpoint: `127.0.0.1:32147`. The installer may select another free high port, but it writes the chosen value into the pairing file; the extension never scans ports.
- Pairing file: `%LOCALAPPDATA%\DucAutoChatGPT\BridgeV1\duc-auto-chatgpt-bridge-pairing-v1.json`. It contains `schema_version: 1`, the exact loopback endpoint, and a base64url token generated from 32 cryptographically random bytes. Its ACL grants the current Windows user only.
- Đức pairs once by clicking **Kết nối Agent Bridge** and selecting that JSON file. The extension validates scheme, literal IPv4 host `127.0.0.1`, port, schema, and token length, then stores the endpoint/token in `chrome.storage.local`. It never stores the token in the XLSX, audit JSONL, console, or bridge responses.
- CLI HTTP calls require `Authorization: Bearer`. Requests carrying a browser `Origin` header are rejected and no CORS headers are emitted. This prevents an ordinary web page from becoming a CLI client.
- The extension WebSocket path accepts only a `chrome-extension://` Origin and requires the token in the first auth frame. The token is not placed in the URL or WebSocket subprotocol, where infrastructure might log it.
- The host relays opaque validated envelopes and retains only a bounded in-flight map until response/timeout. It never persists proposals, queue rows, run status, prompts, ledger data, or images.
- The service worker registers all listeners synchronously. It sends an authenticated keepalive every 20 seconds while the host is available. A Chrome alarm every 30 seconds attempts reconnect when disconnected. `minimum_chrome_version` becomes 120 so these lifecycle assumptions are explicit.
- The side panel opens a named runtime Port and announces `executor_epoch`, a random value for that document instance. When it closes, the port disconnects and all executor-bound methods fail closed.
- Request deadlines are 10 seconds for reads and 30 seconds for `queue.propose`. A timeout never implies that a mutation did or did not occur; the caller retries the same `request_id` and payload.

### Why the proposed “Native production + localhost dev” design is not selected

Two adapters over one pure core is a good pattern only when both adapters have a real job. Here Native Messaging needs a second IPC before an independent CLI can use it, while the legacy localhost-page adapter is the unauthenticated path being replaced. Maintaining both permanently would add install, lifecycle, security, and test matrices without improving Đức’s workflow.

WP-1 still builds the transport-independent `bridge-core.js`; that is not over-engineering because it centralizes default denial, schemas, capabilities, idempotency rules, and errors. What is dropped is the second production transport. Tests use an in-memory adapter and a test loopback host, not `onMessageExternal`.

## RPC envelope and method registry v1

### Envelope

Every application message, on HTTP, WebSocket, and the internal runtime Port, uses the same JSON envelope. The host auth frame is transport setup and is not an RPC message.

Request:

```json
{
  "protocol": "duc-auto-chatgpt.bridge",
  "version": 1,
  "kind": "request",
  "request_id": "018f4f2a-8a83-7b7e-9d31-5b9a54e8e01a",
  "method": "queue.list",
  "sent_at": "2026-08-23T10:00:00.000Z",
  "client": {
    "client_id": "duc-codex-local",
    "name": "Codex",
    "version": "1.0.0"
  },
  "params": {}
}
```

Success response:

```json
{
  "protocol": "duc-auto-chatgpt.bridge",
  "version": 1,
  "kind": "response",
  "request_id": "018f4f2a-8a83-7b7e-9d31-5b9a54e8e01a",
  "ok": true,
  "result": {},
  "responded_at": "2026-08-23T10:00:00.050Z"
}
```

Failure response:

```json
{
  "protocol": "duc-auto-chatgpt.bridge",
  "version": 1,
  "kind": "response",
  "request_id": "018f4f2a-8a83-7b7e-9d31-5b9a54e8e01a",
  "ok": false,
  "error": {
    "code": "EXECUTOR_UNAVAILABLE",
    "message": "Open the Duc Auto ChatGPT side panel and retry the same request_id.",
    "retryable": true,
    "details": {
      "failure_type": null,
      "halt_instruction": null
    }
  },
  "responded_at": "2026-08-23T10:00:00.050Z"
}
```

Rules:

- Unknown top-level fields are ignored for forward compatibility; missing/invalid required fields fail with `INVALID_ENVELOPE`.
- Unknown methods fail with `METHOD_NOT_FOUND`. There is no dynamic dispatch by property name and no passthrough to `chrome.*` or content-script message types.
- Unsupported major versions fail with `UNSUPPORTED_VERSION` and `details.supported_versions: [1]`.
- `request_id` is 8–128 visible ASCII characters. For `queue.propose`, `(client_id, request_id)` is an idempotency key retained with the proposal. Reusing it with a different canonical payload fails `REQUEST_ID_REUSED`; reusing it with the identical payload returns the original proposal response.
- Maximum decoded envelope size is 1 MiB. Prompts are text only; reference images are existing filenames/aliases, never base64 blobs or arbitrary local paths.
- The core exposes an immutable registry entry for every method: handler context (`router` or `executor`), read-only flag, approval policy, params validator, result serializer, deadline, and capability description.

### Included methods

#### `session.hello` — read-only, router context, no approval

Request params:

```json
{ "supported_versions": [1] }
```

Response result:

```json
{
  "selected_version": 1,
  "session_id": "bridge-session-uuid",
  "extension_id": "current runtime id",
  "transport": "loopback_ws",
  "executor": { "available": true, "executor_epoch": "panel-epoch-uuid" },
  "server_time": "2026-08-23T10:00:00.000Z"
}
```

Purpose: version negotiation and layer visibility. It never loads a workbook or wakes a run.

#### `system.ping` — read-only, router context, no approval

Request params: `{}`.

Response result:

```json
{
  "extension": "online",
  "executor": "available",
  "chatgpt": {
    "state": "READY",
    "failure_type": null,
    "composer_found": true,
    "generating": false
  },
  "workbook": { "loaded": true, "file_name": "Duc-Prompts.xlsx", "run_id": "run-..." }
}
```

The router can answer extension/executor availability. If the panel is available it adds a fresh `DAC_PING`/workbook snapshot; otherwise `chatgpt.state` and workbook fields are `UNKNOWN`, never stale cached facts presented as current.

#### `system.capabilities` — read-only, router context, no approval

Request params: `{}`.

Response result contains:

```json
{
  "protocol_versions": [1],
  "executor_model": "side_panel_only",
  "auto_execute": false,
  "methods": [
    { "name": "queue.list", "read_only": true, "approval": "none", "requires_executor": true },
    { "name": "queue.propose", "read_only": false, "approval": "owner_click", "requires_executor": true }
  ],
  "limits": { "max_envelope_bytes": 1048576, "max_jobs_per_proposal": 100, "max_page_size": 100 },
  "failure_types": ["TIMEOUT_PRE_SUBMIT", "...existing canonical values..."],
  "features": ["proposal_inbox", "immutable_result_checkpoints", "audit_chain", "verified_persistence"]
}
```

The real response enumerates every registry entry and every value from the existing canonical Failure Type set; the abbreviated example is not permission to invent another list.

#### `queue.list` — read-only, executor context, no approval

Request params:

```json
{ "cursor": null, "limit": 50, "statuses": [], "include_prompt": false }
```

Response result:

```json
{
  "ledger_etag": "sha256-base64url",
  "run_id": "run-...",
  "checkpoint": { "version": 4, "filename": "...__results__v04.xlsx" },
  "jobs": [
    {
      "job_id": "Q001",
      "queue_position": 1,
      "status": "PENDING",
      "attempt_phase": "PRE_SUBMIT",
      "failure_type": "",
      "reference_images": ["Duc1.jpg"],
      "prompt_fingerprint": "sha256:...",
      "prompt": null,
      "origin": "bridge",
      "bridge_proposal_id": "proposal-uuid"
    }
  ],
  "next_cursor": null
}
```

It uses `DacXlsx.activeJobs()` so tombstoned rows do not masquerade as runnable queue items (`xlsx-codec.js:250-267`). `include_prompt: true` is allowed because the authenticated local owner requested it; default output uses a cryptographic prompt fingerprint. Maximum page size is 100.

#### `run.status` — read-only, executor context, no approval

Request params: `{}`.

Response result:

```json
{
  "state": "RUNNING",
  "paused": false,
  "pause_requested": false,
  "current": { "job_id": "Q001", "attempt_id": "...", "phase": "SUBMITTED", "runtime_stage": "GENERATING" },
  "counts": { "total": 12, "pending": 11, "running": 1, "success": 0, "failed": 0, "interrupted": 0 },
  "halt": null,
  "artifact_persistence_failed": false,
  "checkpoint": { "version": 3, "filename": "...__results__v03.xlsx" }
}
```

When halted, `halt` contains the existing `failure_type` and the matching `DacHaltInstructions.findInstruction()` result. Bridge transport errors are not converted into job failures.

#### `ledger.read` — read-only, executor context, no approval

Request params:

```json
{ "cursor": null, "limit": 50, "include_prompt": false, "include_removed": true }
```

Response result contains the physical XLSX row view, not just the runnable queue: run/checkpoint identity, canonical status/attempt/persistence fields, queue tombstones, recreate history fields, and bridge provenance. It never returns private object properties such as `_row`, directory handles, data URLs, token material, or raw browser objects. This is how an agent audits “ledger says X” without gaining a file handle.

#### `queue.propose` — proposal mutation only, executor context, owner approval required

Request params:

```json
{
  "if_ledger_etag": "sha256-base64url from queue.list or ledger.read",
  "proposal_label": "Character batch 2026-08-23",
  "jobs": [
    {
      "client_job_id": "agent-001",
      "requested_job_id": null,
      "prompt": "Create ...",
      "reference_images": ["Duc1.jpg", "Meo1.png"],
      "settings": {
        "timeout_sec": 180,
        "max_retries": 2,
        "safety_cooldown_sec": "6-9",
        "output_folder": "Duc Auto ChatGPT"
      }
    }
  ]
}
```

Validation rules:

- 1–100 jobs; unique non-empty `client_job_id`; non-empty prompt; no unknown settings.
- `reference_images` are filename/alias tokens only and use the existing resolver/maximum-reference rules. No path traversal, URL, binary upload, or file-system lookup outside the selected reference set.
- `requested_job_id`, when present, must satisfy current XLSX ID rules and be unused. Otherwise the panel assigns the next free `Q###` ID using the same collision check as Quick Prompt (`sidepanel.js:1197-1200`). Assigned final IDs are shown before approval.
- `if_ledger_etag` must match the currently loaded ledger. If it does not, return `PROPOSAL_CONFLICT` with the current etag; the agent must refresh and resubmit.
- The method may create only a quarantined proposal record. It does not call `DacXlsx.addJob()`, select rows, run Check Plan, send a prompt, write an audit file, or create a checkpoint.

Immediate response:

```json
{
  "proposal_id": "proposal-uuid",
  "status": "AWAITING_OWNER_APPROVAL",
  "base_ledger_etag": "sha256-base64url",
  "expires_at": "2026-08-24T10:00:00.000Z",
  "preview": [
    { "job_id": "Q012", "client_job_id": "agent-001", "prompt": "Create ...", "reference_images": ["Duc1.jpg", "Meo1.png"], "settings": { "timeout_sec": 180, "max_retries": 2, "safety_cooldown_sec": "6-9", "output_folder": "Duc Auto ChatGPT" } }
  ]
}
```

#### `queue.proposal.get` — read-only, executor context, no approval

Request params: `{ "proposal_id": "proposal-uuid" }`.

Response status is one of `AWAITING_OWNER_APPROVAL`, `NEEDS_REVIEW`, `APPROVING`, `APPROVED_CHECKPOINTED`, `REJECTED`, `EXPIRED`, or `APPROVAL_FAILED`. An approved response includes final job IDs, `approved_at`, Result checkpoint filename/version, and the new ledger etag. It never reports `APPROVED_CHECKPOINTED` until the immutable Result checkpoint has been verified.

### Deliberately omitted methods

- `run.start`: omitted from v1. With mandatory owner approval it merely duplicates the existing, better-informed Run controls beside Check Plan and the exact queue. The bridge’s value is ingress plus observability, not remote execution.
- `run.pause`: omitted. Pause is session-local and intentionally waits for the current in-flight attempt to finish; remote pause would be confusing and offers no safety guarantee beyond the existing UI (`sidepanel.js:3118-3120`, `sidepanel.js:3138-3154`).
- `run.resume`: omitted for the same reason. Resume may mean same-session unpause or governed Result-XLSX recovery; collapsing them into one remote verb is unsafe.

These names must return `METHOD_NOT_FOUND` in v1 and must not appear in capabilities. A later version may add a generic owner-approved action proposal after a demonstrated workflow need; it may not silently reinterpret v1 names.

### Error codes

Bridge/RPC errors are transport and policy facts, not new job Failure Types:

| Code | Retryable | Meaning |
| --- | --- | --- |
| `INVALID_ENVELOPE` | no | Required envelope field/type/size is invalid. |
| `UNSUPPORTED_VERSION` | no | No supported major protocol version. |
| `METHOD_NOT_FOUND` | no | Default-denied method. |
| `INVALID_PARAMS` | no | Method parameters failed the registered schema. |
| `REQUEST_ID_REUSED` | no | Same client/request ID with a different payload. |
| `UNAUTHENTICATED` / `FORBIDDEN` | no | Token or transport-role policy failed. |
| `EXTENSION_OFFLINE` | yes | Host is running but no authenticated extension socket is attached. |
| `EXECUTOR_UNAVAILABLE` | yes | Extension is connected but no current side-panel executor Port exists. |
| `REQUEST_TIMEOUT` / `TRANSPORT_DISCONNECTED` | yes | Response was not delivered; retry the identical idempotency key. |
| `WORKBOOK_NOT_LOADED` | yes | Panel is open but has no workbook/session ledger. |
| `RUN_ACTIVE` | yes | An owner approval that would mutate the queue is disabled until the run becomes idle. Proposal staging itself may still succeed. |
| `PROPOSAL_NOT_FOUND` / `PROPOSAL_EXPIRED` | no | No current proposal can be queried/approved. |
| `PROPOSAL_CONFLICT` | yes | Ledger etag changed; refresh, re-propose, and obtain a new owner review. |
| `VALIDATION_FAILED` | no | Existing workbook/reference/settings validation rejected the proposal. |
| `APPROVAL_REQUIRED` | no | A product mutation was attempted without the side-panel owner click. |
| `PERSISTENCE_VERIFICATION_FAILED` | yes | Existing Failure Type used when proposal approval could not be checkpointed; details include `failure_type: "PERSISTENCE_VERIFICATION_FAILED"`. |

If a real run is halted, `run.status.halt.failure_type` uses the existing canonical value and instruction. The bridge must never create synonyms such as `NO_TAB_HALT` or `BRIDGE_HALT`.

## Approval model

### Rule

Unaided external code may read authenticated state and may place data into a quarantined proposal inbox. It may not mutate the XLSX queue, select jobs, change settings, start/pause/resume a run, send ChatGPT content, consume image quota, write output files, acknowledge an audit gap, resolve a checkpoint collision, remove/reorder/duplicate a row, or approve Recreate.

`queue.propose` is technically a write to bridge inbox state; it is the minimum ingress necessary to “push work in.” It is not a product write. The standing rule remains **reads without a person; product writes never without Đức’s click**.

### Owner experience

The side panel shows a Vietnamese **Đề xuất từ Agent** card with:

- client name/ID, proposal label, received time, and proposal ID;
- the exact final job IDs in execution order;
- full prompt text, all reference aliases/filenames, and every effective per-job override;
- count and a clear notice that approval changes the queue but does **not** start a run;
- **Từ chối** and **Duyệt & ghi checkpoint** buttons.

No prompt text is collapsed behind hover-only UI. While a run, reconciliation, Recreate, audit-gap approval, or queue mutation is active, approval is disabled and says why. Rejecting a proposal does not touch the workbook.

### Approval transaction

The transaction deliberately reuses the existing Recreate safety sequence. `recreate-core.js` snapshots prior attempt history and produces approval fields (`recreate-core.js:35-60`); `persistRecreateApproval()` writes the audit, persists an immutable Result checkpoint, re-derives the Resume plan/queue, and rolls in-memory fields back on failure (`sidepanel.js:1691-1716`). Bridge proposal approval uses the same order and shared persistence helper, but not Recreate-specific field names:

1. Recompute the ledger etag and re-run proposal validation against the current workbook, reference aliases, IDs, settings, and operator locks.
2. If etag or assigned IDs changed, set `NEEDS_REVIEW`, render the new exact list, and require a fresh click. Never carry the old click across changed content.
3. Clone the workbook candidate before mutation. Add all proposal rows to the candidate in one batch; partial insertion is not allowed. `DacXlsx.addJob()` already grows headers and appends a physical row (`xlsx-codec.js:219-234`).
4. Add bridge provenance fields to each row and buffer `BRIDGE_PROPOSAL_APPROVED` plus one `BRIDGE_JOB_ADDED` audit event per job.
5. Persist the audit according to the existing audit-chain rules, then create and independently verify the next immutable Result XLSX checkpoint using the same version-conflict checks as `saveLedger()` (`sidepanel.js:2681-2739`).
6. Only after checkpoint verification replace `state.workbook`, re-run `prepare({diagnostic:true})`, select the new jobs for visibility, and mark the proposal `APPROVED_CHECKPOINTED`. Do not call `run()`.
7. If any step fails, restore the pre-approval in-memory workbook/queue, keep the proposal visible as `APPROVAL_FAILED`, expose the existing failure detail, and do not make any proposed row eligible. A successfully appended audit entry may record the failed approval attempt; it must not claim the queue was checkpointed.

Pending/idempotency proposal records live in `chrome.storage.local` with prompt content, expire after 24 hours, and are capped at 20 records/100 jobs total. Approved/rejected/expired records retain only IDs, hashes, timestamps, decision, and checkpoint evidence for 30 days; full prompt text is removed from bridge storage because the ledger becomes authoritative after approval. Token material is stored under a separate key and never included in proposal exports.

## Provenance

Every approved bridge row carries these additive XLSX fields:

| Field | Value |
| --- | --- |
| `input_origin` | Literal `bridge`; future manual/XLSX paths may use their own values, but bridge rows are never blank. |
| `bridge_protocol_version` | Literal `1`. |
| `bridge_transport` | Literal `loopback_ws`. This records ingress route, not execution route. |
| `bridge_proposal_id` | Stable proposal UUID. |
| `bridge_request_id` | Original idempotency request ID. |
| `bridge_client_id` | Validated client ID from the envelope. |
| `bridge_client_job_id` | Caller’s stable per-proposal job ID. |
| `bridge_received_at` | ISO timestamp when the executor accepted the proposal into quarantine. |
| `bridge_approved_at` | ISO timestamp from Đức’s approval click. |
| `bridge_prompt_sha256` | SHA-256 of the exact approved UTF-8 prompt. |
| `bridge_payload_sha256` | SHA-256 of canonical approved job input including references/settings. |

These fields are never cleared by retries, queue reorder, Recreate, Result checkpoint creation, or Resume. Duplicate Queue actions continue to use the existing `duplicate_of` field (`sidepanel.js:1248-1261`); if a bridge-origin row is duplicated manually, the duplicate also gets `input_origin: "operator_duplicate"`, preserves `source_bridge_proposal_id`, and does not falsely claim it was the original bridge row.

Every audit event for a bridge-origin job adds `input_origin`, `bridge_proposal_id`, `bridge_request_id`, `bridge_client_id`, `bridge_client_job_id`, `bridge_approved_at`, and `bridge_payload_sha256`. The current audit event already binds run/job/attempt, status, failure, persistence, prompt fingerprint, target, submitted time, and detection (`sidepanel.js:182-186`); bridge fields extend that record rather than form a second audit log.

Proposal-level events are:

- `BRIDGE_PROPOSAL_RECEIVED` — local bridge storage only; no product mutation.
- `BRIDGE_PROPOSAL_REJECTED` or `BRIDGE_PROPOSAL_EXPIRED` — local proposal history only.
- `BRIDGE_PROPOSAL_APPROVED` — appended to the canonical audit as part of the checkpoint transaction.
- `BRIDGE_JOB_ADDED` — one canonical event per added row.
- `BRIDGE_PROPOSAL_APPROVAL_FAILED` — canonical only if an audit segment was successfully writable; it must state that no verified Result checkpoint accepted the rows.

No token, pairing-file path, absolute local path, or full prompt is added to the audit JSONL. Existing prompt hash/length behavior remains (`sidepanel.js:173-186`).

## Failure semantics

### Side panel closed

- `session.hello`, `system.ping`, and `system.capabilities` still report the extension and `executor.available: false`.
- Every queue/run/ledger/proposal method returns `EXECUTOR_UNAVAILABLE`, `retryable: true`.
- The service worker does not open the panel automatically, load a workbook, recover a handle, or execute from cached state.
- Pending proposal records already accepted by a prior panel remain quarantined in extension storage, but no new proposal is accepted and no approval can occur until Đức opens the panel.

This matches the existing explicit non-scope of recovery while a response is in flight (`README.md:29`) and the statement that recovery controls are side-panel-only with no durable background queue (`README.md:77`).

### No ChatGPT tab or receiver

- Read methods still return workbook/queue/ledger state.
- `system.ping.chatgpt` reports `state: "HARD_STOP"`, `failure_type: "RECEIVER_LOST"`, plus the existing Halt instruction. It does not invent a bridge-specific job failure.
- Proposal staging and owner-approved checkpointing may proceed because they do not contact ChatGPT or spend quota. The existing Run button remains blocked by `authoritativeValidate()` until a reachable idle composer exists (`sidepanel.js:2181-2197`).
- No bridge method starts a run in v1.

### Run already active

- Read methods remain available and `run.status` is current.
- `queue.propose` may stage a quarantined proposal so an agent does not lose its work.
- Owner approval/queue merge is disabled until the existing run/reconciliation/persistence finalizer is idle. An attempted approval returns/displays `RUN_ACTIVE`; it never mutates the live `runQueue` array.
- No bridge action pauses, stops, or changes the active run.

### Service worker suspended or terminated mid-request

- WebSocket closure causes the host to return `TRANSPORT_DISCONNECTED` or `REQUEST_TIMEOUT`; it never fabricates a success.
- The caller retries the identical `client_id`, `request_id`, and payload after reconnect.
- Read requests can be recomputed. `queue.propose` returns the stored original response when the payload hash matches, so a response lost after acceptance cannot create a duplicate proposal.
- All volatile router maps are disposable. Proposal idempotency and decisions are owned by executor-side extension storage, and product truth remains the verified Result XLSX/audit chain.

### Host dies or is not started

- New CLI connections fail locally; existing ones close. The extension shows **Agent Bridge: mất kết nối** but the current side-panel run continues unchanged.
- The host does not own a queue, so restart cannot lose or replay jobs. It reloads the same pairing file/token and waits for the extension to reconnect.
- Once reconnected, callers retry request IDs. A different token fails authentication; there is no automatic fallback to `externally_connectable`.

### Persistence or product Halt during owner approval/run

- A proposal approval that cannot verify its Result checkpoint remains `APPROVAL_FAILED`; proposed rows are not eligible.
- A live run exposes existing Failure Types and `DacHaltInstructions` exactly. The bridge does not translate CAPTCHA, quota, receiver loss, output ambiguity, or persistence errors into a parallel taxonomy.
- Transport loss never aborts or retries a ChatGPT attempt. Exact-once ownership stays in the existing side-panel/content-script attempt loop.

## Explicit non-goals

- No `debugger` permission, Chrome DevTools Protocol, target enumeration, or browser-wide inspection.
- No general browser control, arbitrary tab navigation, arbitrary `chrome.*` proxy, or arbitrary content-script message passthrough.
- No broad host permissions, `<all_urls>`, all-domain access, remote listener, LAN listener, `0.0.0.0`, or IPv6 wildcard. The only new network destination is the paired loopback host.
- No copying OpenAI’s private wire protocol, native host name, manifest, binaries, or implementation details. Public Chrome behavior is the only comparison basis.
- No automatic run, quota spend, queue merge, Recreate approval, audit-gap acknowledgement, checkpoint collision decision, remove/reorder/duplicate operation, or output write without Đức’s relevant click.
- No second execution path in the service worker or host. They cannot call `DAC_RUN_IMAGE_JOB`, run XLSX selection, write directory artifacts, create Result checkpoints, or append audit truth.
- No background recovery when the side panel closes during an in-flight ChatGPT response.
- No binary/reference-image upload through RPC. External code proposes aliases/filenames already selected in the current side-panel session.
- No filesystem path disclosure or file-handle transfer through RPC.
- No cloud service, OpenAI API key, account automation, multi-tab concurrency, or bypass of ChatGPT limits/security interstitials.
- No indefinite compatibility mode for the legacy `externally_connectable` Worker API. It is removed after loopback acceptance.
- No new job Failure Types for bridge transport conditions. Existing English codes stay canonical; new operator-facing explanations are Vietnamese.
- No weakening of exact-once submission, attempt attribution, readiness gating, retry semantics, persistence verification, checkpoint collision rules, audit continuity, or the security/quota hard stop.

## WP-1 through WP-4 implementation plan

Each work package ends with `npm.cmd test` from the repository root. The acceptance floor is all existing 46 worker tests plus the observer smoke test; new bridge tests add to that floor. No pilot evidence directory is edited.

### WP-1 — pure protocol, registry, policy, and idempotency core

Scope:

- Implement `bridge-core.js` with envelope parsing/serialization, version negotiation, immutable method registry, capability generation, validators, default denial, canonical JSON hashing, request replay rules, limits, and error construction.
- Register v1 method metadata and schemas, but use injected handlers only; no `chrome.*`, DOM, network, file, workbook, or ChatGPT calls.
- Encode `executor_model: "side_panel_only"`, `auto_execute: false`, and the prohibition on run-control methods.

Files touched:

- New `bridge-core.js`.
- New `tests/bridge-core-smoke.mjs`.
- New `tests/bridge-method-registry-smoke.mjs`.
- Existing source/test files otherwise untouched; `tests/run-all.mjs` auto-discovers new `.mjs` tests (`tests/run-all.mjs:8-12`).

Proof:

- Valid/invalid envelope fixtures, exact version negotiation, unknown-method denial, size limits, schema rejection, deterministic canonical hash, same-ID/same-payload replay, same-ID/different-payload rejection.
- Capability output matches the registry and contains no `run.start`, `run.pause`, or `run.resume`.
- Static test proves `bridge-core.js` contains no `chrome.`, DOM, network, file picker, or Node-only API.
- Existing artifact integrity and 46-test baseline stay green.

Đức’s manual step: reload the unpacked extension at `chrome://extensions` after the `.js` file lands. There is no visible UI or live bridge to test in WP-1.

### WP-2 — side-panel executor endpoint, proposal approval, and provenance

Scope:

- Load `bridge-core.js` in the side panel and open runtime Port `dac.bridge.executor.v1`.
- Implement executor handlers for `queue.list`, `run.status`, `ledger.read`, `queue.propose`, and `queue.proposal.get`.
- Add quarantined proposal storage, etag conflict handling, Vietnamese exact-list review UI, owner Reject/Approve controls, and the approval/checkpoint transaction.
- Refactor the existing Recreate persistence sequence only as needed to share a generic “audit then immutable checkpoint then re-derive queue” helper; do not weaken Recreate tests or semantics.
- Add the ledger/audit provenance fields defined above. Keep `DacXlsx.activeJobs()` and physical tombstones authoritative.
- Add no external transport yet; tests invoke the executor handler through an injected/in-memory adapter.

Files touched:

- `sidepanel.html`, `sidepanel.css`, `sidepanel.js`.
- `xlsx-codec.js` only for candidate-clone/batch-add support required for all-or-nothing proposal approval.
- `recreate-core.js` and/or a new `approval-persistence-core.js` only to share sequencing without giving bridge proposals Recreate semantics.
- New `bridge-proposal-core.js` for pure proposal state/validation/etag rules.
- New tests: `bridge-proposal-core-smoke.mjs`, `bridge-sidepanel-static.mjs`, `bridge-provenance-smoke.mjs`, and `bridge-approval-persistence-smoke.mjs`.
- Existing `tests/artifact-integrity-smoke.mjs` extended to cover the new UI and forbid markup sinks.

Proof:

- Proposal staging never calls `DacXlsx.addJob()` or `run()`.
- Exact preview includes full prompt/references/settings/final IDs; approval is disabled under every existing operator lock.
- Etag change forces a new review/click.
- Reject leaves workbook bytes/queue unchanged.
- Approve adds all rows or none, writes provenance, verifies the next checkpoint, then exposes rows as selected but not running.
- Forced audit/checkpoint failure rolls back eligibility and returns `APPROVAL_FAILED`.
- Response-loss replay returns the same proposal, not duplicate rows.
- Recreate, Resume, queue edit, exact-once, audit-chain, and artifact-integrity suites remain green.

Đức’s manual step: reload the extension, open the side panel, use a built-in test fixture to inspect one proposal, confirm the list is fully visible in Vietnamese, click Reject once, then approve a fresh proposal and verify that no ChatGPT run starts automatically.

### WP-3 — production loopback host, pairing, and MV3 router

Scope:

- Add a Windows current-user loopback host as a self-contained .NET executable. It exposes authenticated CLI HTTP `/v1/rpc` and the authenticated extension WebSocket `/v1/extension`, binds only `127.0.0.1`, rejects CORS/browser HTTP origins, and owns only bounded in-flight relay state.
- Add a service-worker WebSocket transport adapter/router, synchronous listeners, 20-second keepalive, 30-second reconnect alarm, panel Port routing, request deadlines, and router methods.
- Add pairing-file generation, current-user ACL, startup shortcut, installer/uninstaller, token rotation, and the Vietnamese pairing UI. No registry changes.
- Raise minimum Chrome to 120, add `alarms`, and add only the loopback host permission required by the fixed endpoint. Do not add broad site permissions.

Files touched:

- `background.js`, `manifest.json`, `sidepanel.html`, `sidepanel.css`, `sidepanel.js`.
- New `bridge-transport-loopback.js` for the thin service-worker adapter.
- New directory `duc-auto-chatgpt-loopback-bridge-host-v1/` containing `DucAutoChatGPT.LoopbackBridgeHost.csproj`, `Program.cs`, and host unit tests.
- New `scripts/Install-DucAutoChatGPTLoopbackBridgeV1.ps1` and `scripts/Uninstall-DucAutoChatGPTLoopbackBridgeV1.ps1`.
- New tests: `bridge-router-smoke.mjs`, `bridge-loopback-integration.mjs`, `bridge-auth-smoke.mjs`, `bridge-mv3-reconnect-smoke.mjs`, and `bridge-manifest-static.mjs`.

Proof:

- Non-loopback bind is impossible; wrong/missing token, HTTP Origin, wrong WebSocket Origin/role, oversized message, and unknown method all fail closed.
- A CLI request traverses host -> worker -> in-memory executor and preserves `request_id` exactly.
- Panel close returns `EXECUTOR_UNAVAILABLE`; host stop does not affect a mocked active run; host restart reconnects.
- Simulated worker termination after proposal acceptance but before response plus identical retry produces one proposal.
- Logs contain no token or prompt; host persists no product state.
- Manifest has no debugger/all-domain permissions and only the intended loopback addition.

Đức’s manual step: reload the extension; run `Install-DucAutoChatGPTLoopbackBridgeV1.ps1` himself; click **Kết nối Agent Bridge** and select the generated pairing JSON; then run the provided CLI ping/proposal acceptance script. No Regedit, native-host registration, or admin action is required.

### WP-4 — migration closure, legacy ingress removal, and live acceptance

Scope:

- Remove `externally_connectable`, `onMessageExternal`, the legacy text Worker API job map/keepalive/terminal retention, and its browser test fixture after Option B passes.
- Preserve private background image-download handling used by the real side-panel product.
- Update README/HANDOFF and operator guidance with pairing, offline/closed-panel semantics, CLI examples, token rotation, uninstall/reinstall, and explicit owner approval.
- Run full deterministic regression plus live owner acceptance. No pilot evidence is altered.

Files touched:

- `manifest.json`, `background.js`, `README.md`, `HANDOFF.md`.
- Remove `worker-api-test.html` and `start-worker-api-test.bat` only after the replacement acceptance gate passes.
- Replace/update `tests/worker-api-smoke.mjs` so it proves the legacy external listener is absent while private `DAC_DOWNLOAD_IMAGE` remains.
- New `tests/bridge-migration-closure-smoke.mjs` and `tests/bridge-failure-semantics-smoke.mjs`.
- Host/bridge tests from WP-3 extended for token rotation and reinstall.

Proof:

- A localhost browser page can no longer message the extension.
- A token-authenticated CLI can ping, list state, submit one proposal, poll its decision, and observe the checkpointed job after Đức approves.
- With the panel closed, the same CLI gets `EXECUTOR_UNAVAILABLE`; reopening restores service without replay.
- With no ChatGPT tab, reads/proposal checkpointing work and `system.ping` reports existing `RECEIVER_LOST`; no prompt is submitted.
- During a live run, proposal approval is locked; host death does not stop or retry the run.
- Owner-approved proposal creates exactly one set of rows, canonical provenance, audit events, and one verified next Result checkpoint. Run remains manual.
- Full `npm.cmd test` passes; live exact-once, attribution, persistence, checkpoint, Resume/Recreate, and security/quota hard-stop checks show no regression.

Đức’s manual step: reload the extension after final JavaScript/manifest changes; start the installed host; pair if the token was rotated; run the acceptance CLI; inspect and approve the exact proposal; then manually click the existing selected-job Run control if he chooses to spend quota. He also performs any live ChatGPT/CAPTCHA/quota checks. No commit, push, merge, registry edit, or native-host install is part of these steps unless he separately authorizes a future transport change.

## Decision revisions

### 2026-08-23 — WP-3 host runtime changed from .NET to Node ESM

The WP-3 loopback host will be plain Node ESM with zero npm dependencies, using only `node:http`, `node:crypto`, and `node:fs`. Its small-text-frame RFC 6455 server handshake and frame codec will be hand-rolled and factored into a pure Node-testable module so the worker test runner covers it. This reverses the earlier self-contained .NET choice because this machine has no .NET SDK, Node 24.18.0 already runs the dependency-free repository suite, and a compiled .NET host would be the only compiled artifact and would sit outside `tests/run-all.mjs`.

In the WP-3 file list, this replaces the entry “New directory `duc-auto-chatgpt-loopback-bridge-host-v1/` containing `DucAutoChatGPT.LoopbackBridgeHost.csproj`, `Program.cs`, and host unit tests” with “New directory `duc-auto-chatgpt-loopback-bridge-host-v1/` containing `bridge-host.mjs` and pure `websocket-core.mjs`; add `tests/bridge-node-host-smoke.mjs` and `tests/bridge-websocket-core-smoke.mjs` for auto-discovery by `tests/run-all.mjs`.” The remaining WP-3 topology, security, pairing, installer, integration, and acceptance decisions are unchanged.

## Acceptance decision

Verdict: **ALIGN_WITH_FIX**.

The core direction — versioned RPC, method registry, capability listing, unknown-method denial, idempotent reconnect, and a side-panel executor — aligns with the owner’s real workflow. The fixes are substantive:

1. Select loopback token transport, not Native Messaging, because a separate CLI otherwise needs a second IPC hop.
2. Treat the File System handle limitation accurately: initial authorization is document/user-gesture-bound, but handles are Worker-exposed and IndexedDB-serializable. Side-panel execution is a product invariant, not an API impossibility.
3. Permit only quarantined proposals from external code; require Đức’s exact-list click and a verified immutable checkpoint before queue mutation becomes accepted.
4. Omit remote run/pause/resume from v1.
5. Remove the unauthenticated `externally_connectable` path after migration rather than preserving two production truths.

# Agent Bridge — handoff to Codex

Written 2026-08-23 by Claude, acting as coordinator. Đức continues this work
with Codex directly. This file is self-contained: Codex needs nothing from the
conversation that produced it.

Design of record: [`AGENT-BRIDGE-DESIGN-V1.md`](AGENT-BRIDGE-DESIGN-V1.md) in
this same folder. Read it before writing any code.

---

## 0. State right now

| Item | State |
| --- | --- |
| WP-0 design study | **Done.** `drafts/AGENT-BRIDGE-DESIGN-V1.md`, 761 lines. |
| WP-1 protocol core | **Done.** `bridge-core.js` (605 lines) + 2 tests. |
| WP-2 executor + approval UI | **Not started.** Brief in §2 below. |
| WP-3 loopback host + router | **Not started.** Brief in §3. |
| WP-4 migration closure | **Not started.** Brief in §4. |
| `npm test` | **48 passed, 0 failed** + observer smoke PASS. |
| Git | **Nothing committed.** Đức approves every commit himself. |

`bridge-core.js` is verified pure — no `chrome.`, DOM, network, file, or
`node:` references. It loads unchanged in the service worker
(`importScripts`), the side panel (`<script>`), and Node tests.

Nothing is wired into `background.js`, `sidepanel.html`, `sidepanel.js` or
`manifest.json` yet. WP-1 only added files.

---

## 1. Decisions already made — do not relitigate

These were argued out in WP-0 and reviewed. Reopening them wastes a round.

1. **Transport is Option B: token-authenticated loopback host on `127.0.0.1`.**
   Native Messaging was rejected: Chrome launches the host as its own stdio
   child, so a separate CLI cannot attach and would need a second IPC hop.
2. **The side panel is the sole executor.** The service worker is a router and
   may never mutate XLSX, run the queue, or write output. Closing the panel
   must return `EXECUTOR_UNAVAILABLE`, never start a background runner. This is
   a deliberate product invariant to prevent two execution truths — it is *not*
   a claim that a service worker technically cannot hold a file handle (it can;
   `output-profile-core.js:10-41` already stores one in IndexedDB).
3. **External code proposes; Đức approves.** Reads need no human. Product
   writes always need his click in the side panel. Approval adds rows to the
   queue and does **not** start a run.
4. **`run.start` / `run.pause` / `run.resume` are omitted from v1** and must
   return `METHOD_NOT_FOUND`. The bridge is ingress + observability, not remote
   execution.
5. **The host is plain Node ESM, zero npm dependencies** — not .NET. There is
   no .NET SDK on this machine (`dotnet --version` fails) and this repo is
   deliberately dependency-free Node (`package.json`). Recorded as a dated
   reversal in the design document's `## Decision revisions`.
6. **The legacy `externally_connectable` localhost API is a migration fixture**
   and is removed in WP-4, not kept as a second production ingress.

---

## 2. WP-2 — side-panel executor endpoint, proposal approval, provenance

### 2a. First fix a WP-1 defect found in review

`requireMethod()` (`bridge-core.js:463-467`) reads `METHOD_REGISTRY[method]`,
and the registry is `Object.freeze(Object.fromEntries(...))`
(`bridge-core.js:346`), which inherits `Object.prototype`. Prototype members
therefore resolve as if they were registered methods:

```
requireMethod("constructor")  -> returns the Object function, no throw
requireMethod("toString")     -> returns a function, no throw
requireMethod("__proto__")    -> returns undefined, no throw
```

Reproduced directly against the built registry.

This does **not** reach the dispatcher today: `parseEnvelope()` requires a
dotted lowercase method name (`bridge-core.js:405`) and `Object.prototype` has
no dotted keys — `dispatch()` returns `INVALID_ENVELOPE` for all of them,
verified. It still must be fixed in this work package, because WP-2 adds a
**second entry path** (the `dac.bridge.executor.v1` runtime Port) that will be
tempted to call `requireMethod`/`validateParams` on a message that never went
through `parseEnvelope()`. The design document's own rule is "There is no
dynamic dispatch by property name."

Required:

1. Prototype-safe registry lookup — null-prototype object, `Map`, or an
   `Object.hasOwn` guard. Apply the same to the `handlers` lookup in
   `createDispatcher` (`bridge-core.js:546`), a caller-supplied plain object
   with the same shape of problem.
2. Regression coverage in `tests/bridge-core-smoke.mjs`: `constructor`,
   `toString`, `valueOf`, `hasOwnProperty`, `isPrototypeOf`,
   `propertyIsEnumerable`, `toLocaleString`, `__proto__` each raise
   `METHOD_NOT_FOUND` from `requireMethod()` **and** yield a clean `ok:false`
   envelope from `dispatch()` — never an uncaught `TypeError`.
3. The dispatcher currently rethrows any non-`BridgeProtocolError`
   (`bridge-core.js:568-569`), so the caller gets **no response envelope at
   all** and the request can only die at its deadline. Decide deliberately:
   convert to a stable `INTERNAL_ERROR` response that leaks no internals, or
   keep the rethrow and make the WP-2 Port endpoint convert it. Either way,
   record the choice in the design document and cover it with a test. An RPC
   layer must not have a path that silently returns nothing.

**Every message arriving on the executor Port must run the full
`parseEnvelope`/`parseRequest` validation.** The panel validates its own input;
it does not trust a message because the service worker forwarded it.

### 2b. The WP-2 scope

Per the design document's WP-2 section:

- Load `bridge-core.js` in the side panel; open the named runtime Port
  `dac.bridge.executor.v1`; announce a random per-document `executor_epoch`.
- Executor handlers for `queue.list`, `run.status`, `ledger.read`,
  `queue.propose`, `queue.proposal.get`.
- Quarantined proposal storage in `chrome.storage.local` with the documented
  expiry and caps, ledger-etag conflict handling, and idempotent replay.
- The Vietnamese **Đề xuất từ Agent** review card: exact final job IDs in
  execution order, full prompt text (never hover-only, never truncated behind a
  tooltip), all reference aliases, every effective per-job override, and a clear
  statement that approval changes the queue but does **not** start a run.
  `Từ chối` and `Duyệt & ghi checkpoint` buttons. Approval disabled — with a
  visible reason — under every existing operator lock (run, reconciliation,
  recreate, audit-gap).
- The approval transaction in the documented order: revalidate against the
  current etag → clone the workbook candidate → all-or-nothing batch add →
  provenance fields + `BRIDGE_PROPOSAL_APPROVED` / `BRIDGE_JOB_ADDED` audit
  events → persist audit → create and independently verify the next immutable
  Result checkpoint → only then swap in the new workbook and re-run
  `prepare()`. Never call `run()`. On any failure roll back in-memory state and
  surface `APPROVAL_FAILED` without claiming the queue was checkpointed.
- New `bridge-proposal-core.js` — pure proposal state/validation/etag rules,
  same module convention as the other cores.
- Share the "audit → immutable checkpoint → re-derive queue" sequence with the
  existing Recreate path instead of duplicating it, **without** giving bridge
  proposals Recreate semantics or weakening any Recreate test.
- No external transport this round; tests drive the executor through an
  injected/in-memory adapter.

**Reuse what already exists.** `Nhập prompt nhanh` (Quick Prompt,
`sidepanel.js:1383-1418`) already does almost exactly the right thing — it
appends jobs to the queue pre-ticked but **unrun** and tells the operator to
press Run when ready. Reuse that pattern and its wording style for the
approved-proposal outcome rather than inventing different post-approval
behaviour.

---

## 3. WP-3 — loopback host, pairing, MV3 router

Follow the design document's WP-3 section, with the Node override from §1.5.

- Host: plain Node ESM, zero npm dependencies, `node:http` + `node:crypto` +
  `node:fs` only. Authenticated CLI `POST /v1/rpc` and authenticated extension
  WebSocket `/v1/extension`. Binds `127.0.0.1` only. Rejects any request
  carrying a browser `Origin`; emits no CORS headers. Holds only a bounded
  in-flight relay map — no queue, ledger, run state, prompts, or images.
- The RFC 6455 handshake + frame codec is hand-rolled (both ends are ours and
  only small text frames are needed). Factor it as a **pure, Node-testable
  module** in the same style as the other cores so `tests/run-all.mjs` covers
  it — do not bury framing logic inside the server.
- Service-worker WebSocket transport adapter + router: listeners registered
  synchronously, 20s keepalive, 30s reconnect alarm, Port routing to the panel,
  request deadlines, router-context methods.
- Pairing file at `%LOCALAPPDATA%\DucAutoChatGPT\BridgeV1\...json`, current-user
  ACL, 32 random bytes base64url. Đức pairs once via **Kết nối Agent Bridge**
  and picks the file. Token never appears in XLSX, audit JSONL, console, logs,
  bridge responses, the WebSocket URL, or a subprotocol.
- `manifest.json`: raise `minimum_chrome_version` to 120, add `alarms`, add
  only the loopback host permission the fixed endpoint needs. **No `debugger`,
  no all-domain host permissions, no broad site access.**
- Windows install/uninstall PowerShell scripts. **No registry writes, no admin
  prompt** — that was the Native Messaging path and it is not being taken.

---

## 4. WP-4 — migration closure

Follow the design document's WP-4 section:

- Remove `externally_connectable`, `onMessageExternal`, the legacy text Worker
  API job map / keepalive / terminal retention, `worker-api-test.html` and
  `start-worker-api-test.bat` — **only after** the Option B path passes
  acceptance.
- **Preserve** the private `DAC_DOWNLOAD_IMAGE` background handler; the real
  product uses it.
- Update `tests/worker-api-smoke.mjs` to prove the legacy external listener is
  gone while the private download handler remains.
- Update `README.md` and append to the `HANDOFF.md` Log: pairing, closed-panel
  semantics, CLI examples, token rotation, uninstall/reinstall, and the fact
  that approval never starts a run.
- Ship a small CLI client script so Đức can actually exercise it end to end.

---

## 5. Hard rules — every round, no exceptions

- **Do not commit, do not push, do not merge.** Đức approves commits himself.
- Never edit or delete anything under `pilot-03/`, `pilot-05/`, `pilot-06/`,
  `Pilot-07/`, `Pilot-08/` — operator evidence.
- Never weaken exact-once submission, attribution, readiness gating, retry
  semantics, persistence verification, the checkpoint protocol, the audit
  chain, or the security hard-stop.
- No `innerHTML` / `outerHTML` / `insertAdjacentHTML` anywhere.
  `tests/artifact-integrity-smoke.mjs` enforces it; extend it for new UI.
- Operator-facing text is Vietnamese; finding CODES stay English identifiers.
  Never let a safety test assert on a caption.
- `npm test` must end green. Floor is 48 worker tests + observer smoke.
- Run `git diff --check` before finishing.
- Any `.js` change means Đức must reload the extension at `chrome://extensions`
  before testing. Say so in every handover.
- The in-app Browser pane cannot verify this UI. Reason from source, write
  static tests, hand visual acceptance to Đức.

---

## 6. How Đức runs the next round

Prompt bodies for WP-2 are in §2 of this file — Codex can be pointed straight
at it. From the repository root:

```bash
codex exec -s workspace-write "Read workers/duc-auto-chatgpt/v0.1.0/drafts/AGENT-BRIDGE-HANDOFF.md and implement WP-2 (section 2), including the bridge-core.js defect fix in 2a. Follow section 5 hard rules. Do not commit."
```

Or just open Codex interactively and say: *"đọc
`drafts/AGENT-BRIDGE-HANDOFF.md`, làm WP-2"*.

Each work package should end with the `npm test` result line, the list of files
touched, anything in the design document that turned out wrong, and a short
`## Đức đọc phần này` section in plain Vietnamese.

---

## 7. Đức đọc phần này

- Đã xong 2 phần: **bản thiết kế** (đã chốt kiến trúc) và **lõi giao thức**
  `bridge-core.js`. Test 48/48 xanh. Chưa commit gì cả — anh tự duyệt.
- Còn 3 phần: WP-2 (giao diện duyệt đề xuất trong side panel), WP-3 (chương
  trình host + kết nối thật), WP-4 (gỡ cổng localhost cũ không an toàn).
- Nguyên tắc đã chốt: code bên ngoài chỉ được **đề xuất**, anh bấm duyệt thì
  mới vào hàng đợi — và **duyệt xong vẫn chưa chạy**, anh phải tự bấm Run vì nó
  tốn quota ảnh thật.
- Đóng side panel là bridge ngừng phục vụ, chứ không âm thầm chạy nền. Cố ý như
  vậy để không bao giờ có hai "sự thật" khác nhau giữa sổ ghi và thư mục ảnh.
- Cổng localhost hiện tại **chưa có mật khẩu** — trang web nào chạy trên
  localhost trong Chrome cũng sai khiến được phiên ChatGPT của anh. WP-4 sẽ gỡ
  hẳn nó sau khi đường mới chạy được.
- Việc anh phải tự làm: duyệt commit, và từ WP-3 trở đi thì chạy script cài
  host + bấm **Kết nối Agent Bridge** một lần. Không phải sửa registry, không
  cần quyền admin.
- Sau mỗi lần Codex sửa file `.js`, anh phải vào `chrome://extensions` bấm
  reload thì mới có hiệu lực.

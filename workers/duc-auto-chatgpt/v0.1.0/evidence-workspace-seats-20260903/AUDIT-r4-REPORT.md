RESULT: FAIL

## INV-1 — HELD

**Lines:** `bridge-router-core.js:28-37`; `bridge-transport-loopback.js:158-179, 286-291, 497-504, 604-610, 755-761`; `sidepanel.js:1402-1414`; `bridge-workspace-seats-smoke.mjs:282-305`.

The target is carried per request. Each workspace seat owns a router whose `send_executor` closure supplies that seat's `workspaceRecord` (`bridge-transport-loopback.js:286-291`). `sendExecutor` immediately copies `{workspace_id, name, tab_id}` onto that RPC's port message and keys the pending response by a fresh `route_id` (`:161-173`). The panel takes the workspace from that individual message and passes it in that dispatch call's context (`sidepanel.js:1402-1410`). Return routing uses the same `route_id`, while each awaiting socket handler retains its own `targetSocket` and `relay_id` (`bridge-transport-loopback.js:501-504, 755-761`). There is no shared “current seat” dispatch variable.

**Adversarial attempt:** Deliver RPC A and B from different seats, let both await the executor, then return B before A. The independent route IDs resolve the corresponding promises, and the two `handleSocketMessage` invocations send only on their captured sockets. The smoke source pins this exact order (`bridge-workspace-seats-smoke.mjs:282-305`). Rename A while A is awaiting its response: reconciliation mutates the seat record and synchronously closes/cycles that seat (`bridge-transport-loopback.js:604-610`), but A's already-posted port message contains a value copy; the old response is suppressed by the `socket === targetSocket` guard (`:502-504`) rather than being sent through the renamed seat. No cross-route interleaving was found.

## INV-2 — HELD

**Lines:** `sidepanel.js:667-700, 745-757, 760-800, 965-1003, 1253-1266, 1370-1393, 1405-1409, 1728-1757, 3053-3073`.

All seats dispatch into one handler table and one panel `state` (`sidepanel.js:1370-1393`). Workspace context is only consumed by `resolveWorkspaceTab`, and the four specified tab-scoped methods call it: `diagnostics.dom_probe` (`:745-755`), `run.trial` (`:760-780`), `chat.reload` (see INV-3), and `system.ping` (`:965-972`). Queue/workbook/run status, ledger, output configuration, and other mutation handlers continue to read or mutate the single shared panel state; representative paths are `queue.list` (`:667-700`), `ledger.read` (`:1253-1266`), and `output.configure` (`:1728-1757`). Nothing constructs a per-seat workbook, queue, ledger, or output-settings store.

## INV-3 — PARTIALLY

**Lines:** `sidepanel.js:760-780, 817-868, 885-932, 952-1003, 2995-3001, 3015-3050, 3059-3073, 5555-5577`.

`chat.reload` and `system.ping` are correctly seat-aware in the ordinary and fail-closed cases. Reload resolves the workspace tab before acting, reloads that exact `tabId`, and polls that same ID (`sidepanel.js:885-932`); ping likewise resolves the workspace tab and sends to its ID (`:965-972`). `resolveWorkspaceTab` throws when the bound tab is missing/off-provider and never falls back to the active tab for a workspace call (`:3059-3073`). `run.trial` takes the single global run-start latch and binds the workspace tab before validation (`:760-780`). Once a run is bound, `run.stop` correctly addresses the one global run: its local `stopRequested` flag is global, and `send()` resolves the bound run tab by ID (`:817-868, 3015-3050`). Its result honestly distinguishes idle, pre-submit, and post-submit stops (`:832-868`).

**Adversarial break:** There is a pre-bind startup window. `run()` sets `runStarting` through the latch, then awaits `bindRunTab()` (`sidepanel.js:5555-5577`); `bridgeRunTrial` has an even earlier await after taking that latch and before binding (`:762-779`). If `run.stop` arrives during that window, it sees `runStarting === true`, sets the global stop flag, and calls `send({type: "DAC_ABORT"})` (`:832-845`). Because `boundTabId` is still null, `activeTab()` falls back to the currently active ChatGPT tab (`:3015-3018`). Thus a stop targeting seat B while a seat-A/global run is starting can send the abort to B (or another active tab). The local flag still prevents later submission, but the best-effort abort is misdirected and the response does not disclose that wrong-tab side effect. This violates the “safe regardless of seat” portion during startup.

## INV-4 — VIOLATED

**Lines:** `bridge-transport-loopback.js:511-523, 642-679, 870-903`; `sidepanel.js:2974-3001, 3031-3044, 3059-3073`; `bridge-workspace-seats-smoke.mjs:315-327, 504-510, 572-595`.

The browser-session epoch defense is sound for browser restarts: a missing session mark voids durable `tab_id` bindings before planting the new mark (`bridge-transport-loopback.js:642-679`), and reattachment is explicit in that case. Tab removal/replacement and navigation away also close current sockets synchronously (`:870-895`). Run-layer conversation binding detects a conversation change after a run has bound (`sidepanel.js:2974-3001, 3031-3044`).

However, seat lifecycle identity is still effectively “workspace record + current contents of tabId,” not the logical page the owner attached. Two concrete paths answer under the old seat name without a new owner gesture:

1. Navigate directly from one ChatGPT conversation to another in the same tab. `onUpdated` closes only when the new URL is off-provider; a provider-to-provider change leaves the authenticated seat alive (`bridge-transport-loopback.js:891-903`). Ping/probe/reload then operate on the new conversation. Only an already-running run has conversation-ID protection.
2. Navigate the tab away from ChatGPT and later back to any ChatGPT page. The record retains its `tab_id`, and the provider-return branch automatically reconnects it (`:897-902`). The smoke source explicitly asserts this no-gesture reconnection from `/c/two` to `/c/two-again` (`bridge-workspace-seats-smoke.mjs:315-327`).

**Adversarial break:** Attach seat B to conversation X; navigate B to conversation Y without starting a run; call `--target B system.ping` or `diagnostics.dom_probe`. The socket was never closed and `resolveWorkspaceTab` validates only provider origin plus tab ID, so B answers for Y. Alternatively leave the provider, return the same tab to Y, wait for automatic reconnection, and issue the call. Both violate the invariant's required re-attach gesture.

## INV-5 — VIOLATED

**Lines:** `bridge-transport-loopback.js:104-119, 235-242, 511-535, 571-572, 586-613, 824-843, 881-903, 905-910`.

The separate queues do contain their direct read-modify-write hazards, and pairing changes synchronously close seats before queued reconnects. But the per-seat async state machine has no workspace/lifecycle epoch across the awaited tab-usability check. `connectHost` reads `workspaceRecord.tab_id`, awaits `workspaceTabUsable`, then rechecks only `retired`, `pairing`, and whether a socket exists (`bridge-transport-loopback.js:511-523`). `updateWorkspace` can replace the record independently (`:571-572`), and lifecycle callbacks merely close the current socket (`:881-903`); neither invalidates an older connect continuation.

Concrete unsafe interleaving:

1. A disconnected seat is bound to tab A. The alarm starts `connectHost`; its usability read of A is delayed (`:905-910, 511-517`).
2. The owner updates that same workspace to live tab B. Upsert validates B, then reconciliation changes `workspaceRecord` from A to B, closes the seat, and starts a B connect (`:824-843, 604-610`).
3. B navigates off-provider while both connect checks are pending. The synchronous close sees no socket to invalidate.
4. The old A check returns `true`. Its continuation passes the existing guards and opens a socket, although the mutable record now names B (`:518-535`). If the B check then returns `false`, it sees that CONNECTING socket at `:519` and returns before the `!usable` close at `:520-523`.

The seat can therefore authenticate under B's workspace identity after validating A while B is off-provider. This is a current unsafe interleaving across workspace reconciliation, lifecycle callbacks, and the per-seat machine. Parking B-34 as pure churn is not justified unless a narrower equivalent fix adds a generation/epoch check (and revalidates the same workspace record) after every await.

## Extra finding 1 — attached smoke test is not runnable as packaged

**Lines:** `bridge-workspace-seats-smoke.mjs:22-24, 714-739`.

All five attached files pass `node --check`, but executing `node bridge-workspace-seats-smoke.mjs` fails before assertions with `ERR_MODULE_NOT_FOUND` for `../bridge-core.js`. The test also reads `../background.js`; neither dependency is attached in the expected parent directory. Consequently the smoke source is useful evidence, but this audit could not independently confirm its claimed runtime PASS from the supplied package.

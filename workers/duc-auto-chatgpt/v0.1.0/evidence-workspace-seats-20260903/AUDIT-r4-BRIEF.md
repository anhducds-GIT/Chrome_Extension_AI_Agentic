# Round 4: verify FIVE architecture invariants named by an external reviewer (GPT)

Same system as rounds 1-3 (workspace seats passed round 3). A second reviewer
who read only the DESIGN raised 5 invariants. Your job: check each against the
REAL implementation attached (bridge-workspace-core.js, bridge-transport-
loopback.js, sidepanel.js, bridge-router-core.js, plus the smoke test), verdict
HELD / VIOLATED / PARTIALLY per invariant, with exact lines. Then adversarial:
try to construct concrete interleavings that break 1, 3, or 4.

INV-1 (HIGH): the routing target must travel per-RPC through the whole chain,
never via any shared mutable ("current seat") variable. Two concurrent RPCs on
two seats, answered out of order, must never cross-route. Note: the HOST
consumes --target and picks a SOCKET; inside the extension each seat has its
own socket + router, and sendExecutor attaches `message.workspace` per port
message; the panel passes it per-envelope as dispatch context. Check for any
global that could cross-contaminate, including rename (updateWorkspace mutates
workspaceRecord) racing an in-flight RPC.

INV-2 (HIGH): page-scoped vs session-scoped methods must be separated. Seats
are TAB ROUTING ONLY at this stage: queue/workbook/ledger/output config remain
ONE shared set per profile; only diagnostics.dom_probe, system.ping,
chat.reload, run.trial bind to the workspace tab. Verify nothing in the diff
makes shared state appear seat-scoped or vice versa.

INV-3 (HIGH): run.stop / chat.reload / system.ping must be seat-aware where it
matters: `--target B chat.reload` must never reload the active tab or seat A's
tab; ping through a seat reports that seat's tab; run.stop stops THE single
global run (one-run-at-a-time law) regardless of seat — verify that is safe
and honestly reported.

INV-4 (HIGH): lifecycle identity must not be just tabId. Current design:
seat = workspace_id (UUID) + tab_id + browser-session epoch
(chrome.storage.session mark; bindings voided on new session); tab loss paths
onRemoved/onReplaced/navigation-away close the seat synchronously; MV3 worker
restart keeps bindings within the same browser session. Conversation identity
binds at the RUN layer (bindRunTab -> boundConversationId), inherited when
run.trial enters through a seat. Question to answer: is any path left where a
seat's name answers for a DIFFERENT logical page than the one the owner
attached — without the owner's re-attach gesture? (Known accepted: within one
browser session Chrome never reuses a tab id; a discarded-then-reloaded tab is
the same logical tab.)

INV-5 (MED): reviewer suggests ONE serialized control state machine
(transportEpoch/controlQueue) instead of pairingWork + workspaceWork +
instanceWork + per-seat machines + synchronous closes. We parked this as
backlog B-34 (each race individually pinned; rewrite = churn on hardened
code). Verdict wanted: is any CURRENT interleaving unsafe because the queues
are separate — i.e., is the backlog parking wrong?

Output: RESULT: PASS | CONDITIONAL PASS | FAIL; then one block per invariant
(HELD/VIOLATED/PARTIALLY + lines + reasoning or repro); max 3 extra findings.
Write REPORT.md in this directory.

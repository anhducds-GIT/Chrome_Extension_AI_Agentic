# Round 5 (mini): verify the fix for the stale-RPC side-effect race

GPT (round-5 external review) found, and we accepted, this HIGH:
an rpc carries a SNAPSHOT {workspace_id, name, tab_id}; if the owner
re-attaches the workspace to another tab while the rpc is in flight, the
sidepanel would still act on the OLD tab (run.trial binds it, chat.reload
reloads it). The transport's socket guard suppresses only the stale RESPONSE,
never the side effect.

THE FIX (attached final files):
- bridge-workspace-core.js: leaseHolds(store, workspaceId, tabId) — the
  binding must still hold in the durable store (normalizeStore'd; null tab or
  missing record = no lease).
- sidepanel.js resolveWorkspaceTab: before any tab is touched, re-read
  chrome.storage.local["dac.bridge.workspaces.v1"] (written by the service
  worker BEFORE it reconciles seats on every upsert/remove) and refuse
  RECEIVER_LOST when the lease no longer holds. All four tab-scoped handlers
  (dom_probe, system.ping, chat.reload, run.trial) enter through this one
  resolver.

Verify:
1. Does the fix close the reported race for run.trial and chat.reload? State
   the residual window precisely (we claim: only the microseconds between the
   storage read and the tab action, versus the full rpc deadline before).
2. Is the ordering claim true — does the service worker persist the new store
   BEFORE cycling seats on upsert/remove (bridge-transport-loopback.js)?
3. Can the lease read itself mis-resolve (storage failure -> .catch(() =>
   null) -> leaseHolds(null,...) — verify that fails CLOSED)?
4. Any tab-scoped side effect path that does NOT go through
   resolveWorkspaceTab?
5. run.trial specifics: after bindRunTab succeeds, the run keeps the tab even
   if the workspace is re-attached mid-run. We claim that is CORRECT (the run
   layer owns tab+conversation binding once bound). Agree or flag.

Output: RESULT: PASS | CONDITIONAL PASS | FAIL, findings max 5, exact lines.
Write REPORT.md here.

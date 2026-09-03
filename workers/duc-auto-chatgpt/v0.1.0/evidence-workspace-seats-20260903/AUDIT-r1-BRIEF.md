# Adversarial audit: workspace seats (multiple named Bridge connections per Chrome profile)

## Context

Chrome MV3 extension "Duc Auto ChatGPT". Its service worker keeps a WebSocket
to a loopback Bridge host (port 32147). Until now: ONE socket per Chrome
profile, authenticated by a challenge -> HMAC proof -> auth(token) handshake,
announcing an `instance` block {instance_id, label} used by the host for
routing only (multi-profile layer, already audited in 2 rounds on 2026-09-02).

NEW FEATURE (this diff): "workspaces" — up to 3 NAMED work sessions inside one
profile, each bound to one ChatGPT tab. The service worker now opens ONE EXTRA
socket per workspace. Each workspace socket walks the SAME full handshake and
announces a derived identity (instance_id = workspace_id UUID, label = the
owner-typed name). The host is intentionally UNCHANGED — a workspace looks
exactly like another profile to it. The side panel binds tab-scoped bridge
methods (diagnostics.dom_probe, system.ping, chat.reload, run.trial) to the
workspace's OWN tab via a `workspace` field that rides the extension-internal
port message (never the protocol envelope).

Files given: DIFF.patch (the full commit), final bridge-workspace-core.js,
final bridge-transport-loopback.js, the new test file.

## Invariants that MUST hold (breaking any is a HIGH finding)

1. AUTH SAFETY unchanged: token only sent after verified host proof; auth_ok
   accepted only after hostProofVerified && tokenSent && authSent, socket OPEN,
   once per socket. The refactor into createSeat() must not have weakened any
   of this for the PROFILE seat (its old tests still pass byte-for-byte).
2. A workspace seat with no readable identity must NEVER authenticate
   (no anonymous/legacy workspace seats).
3. FAIL CLOSED tab binding: a workspace whose tab is closed or navigated off
   chatgpt.com/chat.openai.com must lose its socket; its name must never be
   answerable from (or drift to) another tab.
4. Cap 3 workspaces per profile; duplicate names (case-insensitive) and
   duplicate tabs refused; hostile names bounded BEFORE scanning (O(cap)),
   C0+C1 controls stripped, lone surrogates swept (same discipline as the
   audited profile-label sanitizer).
5. No secret material in the workspace store or port messages beyond what the
   transport already carried.
6. One run at a time: run.trial through a workspace binds the run to the
   workspace tab but must still be refused while another run is active
   (queueRunLock untouched).
7. No prototype-pollution / injection path from a hostile
   chrome.storage.local "dac.bridge.workspaces.v1" value (the store is
   normalized before use).

## Your job

Attack the diff. Look specifically for:
- Races between the seat queues (pairingWork vs workspaceWork), reconcile vs
  tab listeners, double sockets per seat, seats leaking after retire().
- The connectHost() re-guard after the async tab check (workspace seats now
  await BEFORE claiming the socket slot — is the re-guard airtight?).
- The reconcile path cycling seats on rename: can a stale socket with the OLD
  name stay authenticated?
- sendExecutor workspace attachment: can a profile rpc ever carry a workspace,
  or a workspace rpc lose/swap its workspace under concurrency?
- normalizeStore/upsertWorkspace edge cases (weird tab_id types, __proto__
  keys, unicode names colliding after sanitize, workspace_id spoofing an
  EXISTING profile instance_id).
- Anything in the diff that weakens a pre-existing protection.

## Output format

RESULT: PASS | CONDITIONAL PASS | FAIL
FINDINGS: numbered, each with severity (HIGH/MED/LOW/INFO), exact location,
and a concrete repro or reasoning. If you claim a race, spell out the exact
interleaving. Max 10 findings, most severe first.

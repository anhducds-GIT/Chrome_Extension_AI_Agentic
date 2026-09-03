# Round 2: verify the fixes for your round-1 findings, hunt for regressions

Same system as round 1 (see ROUND1-FINDINGS.md — your findings, all accepted).
DIFF-FIXES.patch is the fix commit; the final files are attached.

For each round-1 finding 1..5, answer: FIXED / PARTIALLY FIXED / NOT FIXED,
with the exact line(s) that convince you. Finding 6 was answered with 5 new
regression pins in the test file (plus 5 mutation runs, all red); finding 7
by removing the raw control bytes.

Then attack the FIXES themselves:
- The synchronous seat-close in PAIRING_SET/REMOVE/loadPairingNow: any path
  left where `pairing` changes while a workspace socket survives the same
  synchronous block? (The pairingAtProof epoch check is belt-and-braces and
  deliberately unreachable while the sync close holds — flag if you find a
  path that makes it REACHABLE, i.e. the primary defense has a hole.)
- The storage.session mark: MV3 service-worker restart vs browser restart
  semantics; any way a stale tab binding survives a browser restart, or a
  same-session restart wrongly voids bindings? Harness fallback: when
  chrome.storage.session is absent the code trusts bindings — acceptable for
  test harnesses only; flag if reachable in production.
- The re-attach path (upsert with existing workspace_id onto a new tab): can
  it steal a tab already owned by another workspace, exceed the cap, or
  change identity?
- deriveInstance impostor check: bypassable via case, whitespace, or
  normalization mismatch between the two ids?
- Serialized loadInstance: deadlock risk (queue never drains), and label
  freshness (a label saved between two reads must still land on the next).

Output format: RESULT: PASS | CONDITIONAL PASS | FAIL, then FINDINGS as in
round 1 (max 10, most severe first). Write REPORT.md in this directory.

# Duc Auto Gemini — GPT Web Audit Prompt

Copy the complete prompt below into GPT Web. Do not omit the SHA or output contract.

```text
You are the independent senior auditor for a Chrome Manifest V3 extension named “Duc Auto Gemini”. Perform a READ-ONLY audit. Do not propose or perform repository writes, browser submissions, prompt entry, uploads, downloads, account changes, CAPTCHA handling, or store publication.

AUTHORITATIVE TARGET
- Repository: https://github.com/anhducds-GIT/Chrome_Extension_AI_Agentic
- Branch context: main
- Accepted 90% implementation SHA: e6408451d4105ed56c60934269fefbebdc8d2712
- Page-only preflight SHA: 8d23bc9d26c70efea9abf991452b3b75944a4b39
- Package: workers/duc-auto-gemini/v0.1.0/**
- Direct tree: https://github.com/anhducds-GIT/Chrome_Extension_AI_Agentic/tree/8d23bc9d26c70efea9abf991452b3b75944a4b39/workers/duc-auto-gemini/v0.1.0
- Page preflight evidence: https://github.com/anhducds-GIT/Chrome_Extension_AI_Agentic/blob/8d23bc9d26c70efea9abf991452b3b75944a4b39/workers/duc-auto-gemini/v0.1.0/evidence/20260824-dag-v01-000-090-r01/20260824-dag-owner-pilot-preflight-page-r01.LIVE-PAGE-EVIDENCE.md

FAIL-CLOSED SOURCE RULE
Open and inspect the actual files at the exact SHAs. Do not rely on this prompt’s claims, earlier verdicts, summaries, filenames, or GitHub search snippets. If the exact commit/files cannot be accessed, return exactly `BLOCKED — SOURCE_UNAVAILABLE`, list the missing URLs/files, and stop. Do not infer a verdict.

REQUIRED FILES
1. manifest.json
2. provider-core.js, runtime-core.js, binding-core.js, batch-core.js, content-decision-core.js
3. background.js, content.js, sidepanel.js, run-core.js, xlsx-codec.js
4. sidepanel.html and sidepanel.css
5. every file under tests/** and fixtures/**
6. README.md
7. Duc-Auto-Gemini.RUN-LEDGER.md
8. Duc-Auto-Gemini.PILOT-RUNBOOK.md
9. Duc-Auto-Gemini.HANDOFF-MANIFEST.json if present in the handoff commit
10. all evidence files under evidence/20260824-dag-v01-000-090-r01/**

PRODUCT BOUNDARY
- This is a local-only Gemini Images Side Panel runner driven by XLSX.
- Static, fixture and page-DOM evidence is claimed.
- Installed-extension runtime, actual upload/Send, generated response attribution, download completion, account/model/locale variants and subjective image quality remain `LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING`.
- The latest page preflight inspected only the rendered Gemini page. It did not inspect the extension UI and performed no prompt typing, upload, Send, generation or download.
- Three pilot reference files are intentionally owner-supplied and are not committed: reference-one.png, reference-two.jpg, reference-three.webp. Treat this as an explicit owner dependency, not as packaged test evidence.

INVARIANTS TO AUDIT SEMANTICALLY
1. Exactly one submit-critical job can run at a time.
2. `SUBMITTED` is durably persisted before Send and cannot be automatically resent after timeout, restart or ambiguity.
3. All follow-up operations retain the exact run_id/job_id/attempt_id and the originally bound Images tab/window.
4. A previous job/attempt response can never complete the current job.
5. Output is accepted only from a new model-response container observed after the submit boundary; templates, input previews, stale containers, changed src inside an old container and ambiguous multiple outputs are rejected.
6. `OWNER_REVIEW`, `INTERRUPTED`, security/quota/policy, and attempt/tab identity failures hard-stop the whole active batch even with continue_on_error=true.
7. continue_on_error applies only to ordinary exhausted pre-submit failures.
8. Only the exact `FILE_INPUT_NOT_EXPOSED` timeout can proceed from upload trigger to menu. CAPTCHA/security/quota/policy, operator abort and unknown errors must propagate without another click.
9. Blocker detection must prevent Send and any later unsafe click.
10. Side Panel must support running one explicitly selected job and show actual prompt plus attached reference thumbnails.
11. Permissions must be least-privilege and Gemini-only; no remote code, backend, API key, externally_connectable or <all_urls>.
12. Source workbook is never overwritten; output/audit/checkpoint provenance must remain explicit.

TEST/EVIDENCE AUDIT
- Verify tests execute behavior rather than merely search for tokens where semantic proof is required.
- Trace each invariant to production code and at least one meaningful test.
- Check fixture/workbook contract for 0/1/3 references and exact filenames.
- Verify the evidence does not upgrade page-only inspection into extension-runtime acceptance.
- Verify documented test counts and hash samples against the exact committed tree where feasible.
- Inspect Git scope: Gemini commits must not contain workers/duc-auto-chatgpt/** paths.

DO NOT
- Do not trust the existing PASS verdict without rechecking.
- Do not treat a passing test as proof of live Gemini behavior.
- Do not ask to view the extension through browser automation; that surface is outside this audit.
- Do not recommend a broad rewrite when a bounded fix would close a concrete defect.

REQUIRED OUTPUT
Start with exactly one verdict:
- `PASS — REVIEW-READY 90%`
- `REVISE — BOUNDED FIX REQUIRED`
- `REJECT — UNSAFE OR UNSOUND`
- `BLOCKED — SOURCE_UNAVAILABLE`

Then provide:
A. Audited SHAs and exact files actually opened.
B. Evidence matrix: invariant → production lines → test/evidence → result.
C. Findings ordered CRITICAL, MAJOR, MINOR. For every finding include:
   - stable ID `GPT-DAG-###`
   - severity
   - exact file and line(s)
   - violated invariant
   - executable/reasoned reproduction
   - smallest safe fix
   - required regression test
   - whether live owner acceptance is affected
D. Scope/publication check.
E. Honest live-status statement.
F. A Claude Code action packet:
   - If PASS: write `NO CODE CHANGE`; give only the owner pilot next action.
   - If REVISE: list exact allowed files, forbidden paths, acceptance commands and stop conditions.
   - If REJECT/BLOCKED: give exactly one next action and do not draft speculative patches.

Use concise evidence-backed language. Mark every unverified claim explicitly. Do not guess.
```

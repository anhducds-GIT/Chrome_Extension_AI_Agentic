# G2 step 3 spec — turn v0.2.0 into the Gemini extension (verified-selector adapter + Gemini content flow)

Decision (architect: Claude, per owner's Direction A + bridge-first): v0.2.0 targets ONLY
gemini.google.com. The side panel / background / xlsx / checkpoint / audit / bridge stack stays as-is
(proven on ChatGPT). The content-script layer is replaced with a Gemini flow that speaks the exact same
DAC_* message contract the side panel already consumes. The proven decision logic from
duc-auto-gemini/v0.1.0 (stage→type→confirm→send ordering, addedSince arrival model, exposeFileInput
state machine, blob→dataURL) is carried over — it is the part of v0.1.0 that 19 tests already pin.

## 1. provider-adapter.js becomes the GEMINI adapter (verified values only)

Every value below is from live evidence `workers/duc-auto-gemini/v0.1.0/evidence/G1-live-dom-20260825/`:

- provider: "gemini"
- ORIGIN.hosts: ["gemini.google.com"]; isProviderUrl: ^https://gemini\.google\.com/(images/?$|app/|u/\d+/)
  - surface(url): IMAGES for /images, CONVERSATION for /app/<id> (and /u/N/app), WRONG otherwise.
  - RULE: pre-submit readiness requires IMAGES **or** CONVERSATION reached from a prior submit in the
    same tab; post-submit the tab legitimately navigates /images → /app/<id> (snapshot 3). Never treat
    that navigation as receiver loss (fixes the v0.1.0 BOUND_TAB_LEFT_IMAGES_SURFACE design bug).
- SELECTORS:
  - composer: ['rich-textarea .ql-editor[role="textbox"][contenteditable="true"]', '[data-test-id="textarea-wrapper"] [role="textbox"][contenteditable="true"]', '[contenteditable="true"][role="textbox"]']
  - send: ['button[aria-label="Send message"]', 'button[aria-label*="Send" i]', 'button[aria-label*="Gửi" i]']
  - stop: ['button[aria-label="Stop response"]', 'button[aria-label*="Stop" i]', 'button[aria-label*="Dừng" i]']
  - uploadMenuButton: ['button[aria-label="Upload & tools"]', 'button[aria-label*="Upload" i][aria-haspopup="menu"]']
  - fileInput (transient, exists only while menu open): ['images-files-uploader input[type="file"]', '.cdk-overlay-container input[type="file"]', 'input[type="file"]']
  - attachmentPreview (composer): ['uploader-file-preview gem-media-attachment img', 'gem-media-attachment img', 'img.gem-attachment-style-img', 'img[alt="attachment" i]']
  - composerScope: 'input-container'
  - responseContainer: ['model-response'] (container key: id^="model-response-…" or generated)
  - userQueryContainer: 'user-query'  (input evidence; uploaded refs appear as user-query-file-preview img[data-test-id="uploaded-img"], blob:)
  - generatedImage: 'generated-image single-image img' — accept when alt contains "AI generated" OR src starts https://lh3.googleusercontent.com; require rect ≥ 200×200
  - EXCLUDE from output candidates: anything inside 'user-query', 'image-card', 'input-container', or src host www.gstatic.com (zero-state template gallery, snapshot 1)
  - generatingSignals: stop button visible OR 'chat-window [role="progressbar"], chat-window [aria-busy="true"]' OR 'thinking-dots-animation' present (image-loading-overlay tag exists even at rest inside DOM templates — do not use alone)
  - quotaBlocker DOM anchors: 'freemium-file-upload-quota-exceeded-disclaimer' (+ keep v0.1.0 phrase regexes as fallback, scoped to model-response text only)
  - security regex: keep v0.1.0 list (captcha / verify you are human / unusual activity / VN variants)
- TIMING: keep ChatGPT base values except referenceReadyTimeoutMs stays 15000, plus menuSettleMs:400.

## 2. content.js — Gemini flow speaking the DAC contract

Message contract (must match what sidepanel.js already sends/expects — shapes exactly as in the ChatGPT
content.js listener):
- DAC_PING → { ok, url, composerFound, sendButtonFound, generating, assistantCount (= model-response count),
  busy, securityBlocker, generationLimitBlocker }. NOTE: sendButtonFound=false on an EMPTY composer is
  normal on Gemini (snapshot 3); readiness must not require it pre-typing.
- DAC_ABORT, DAC_RUN_PROMPT (text-only path may return NOT_SUPPORTED error initially),
  DAC_RUN_IMAGE_JOB { job_id, attempt_id, prompt, referenceImages[], timeoutMs } →
  { ok, result: { type:"image", image_url, image_attribution, detection, assistant_count_*, completion },
    attempt: DacAttemptIdentity snapshot } — reuse DacAttemptIdentity + DacImageEvidence untouched:
  emit Gemini image candidates in the SAME candidate shape ({source, source_id, node_id, role, input,
  visible, ready}) so selectAttributableImage() runs unchanged.
- DAC_WAIT_CHAT_READY { timeoutMs, safetyCooldownSec, outputVerified } → gate on: composer found,
  no generating signal, no attachment pending inside input-container, no blockers. Keep the
  cooldown-then-recheck pattern via DacChatReadiness.evaluate (sendUsable input := composerFound when
  composer is empty — document this Gemini quirk in a comment).
- DAC_RECONCILE_IMAGE_JOB / DAC_MANUAL_RECONCILE_EXISTING_OUTPUT: keep semantics via DacReconciliationCore.
- Emit DAC_IMAGE_RUN_STAGE stage pings exactly like the ChatGPT flow (ATTACHING_REFS/SENDING/GENERATING/OUTPUT_DETECTED).

Run flow (order pinned by tests): ensure readiness → open upload menu → grab transient file input →
DataTransfer assign + change → close menu (Escape) → type prompt (Quill: focus, selectAll,
execCommand insertText, fallback textContent+InputEvent — v0.1.0 setComposerText) → CONFIRM attachment
(addedSince unique-new-node model inside input-container scope, from v0.1.0 content-decision-core —
port that file) → capture boundary (model-response container keys + image candidate keys) → wait send
button usable → click Send once → poll for output: new model-response container after boundary containing
a generatedImage candidate; while generating signals active keep waiting; completion when candidate ready
and generating signals cleared → blob→dataURL if scheme blob: (result images are https per evidence, but
keep the guard) → return result.
Attach fallback: if no transient input appears within 3s, dispatch synthetic drop (DataTransfer) on
file-drop-indicator/composer, then the same confirm step. Both paths instrumented with the v0.1.0
attachmentFingerprint diagnostic in the thrown error message.

## 3. manifest.json / naming

- name "Duc Auto Gemini (Platform)", version 0.2.0; host_permissions + matches → https://gemini.google.com/* only;
  content_scripts js: [provider-adapter.js, image-evidence-core.js, attempt-identity-core.js,
  reconciliation-core.js, chat-readiness-core.js, content-decision-core.js, content.js]. Icons may reuse v0.1.0 icons/.
- Do NOT rename DAC_* message types or Dac* globals in this step (churn without benefit; unified naming later).

## 4. Tests

- Port from v0.1.0: content-decision-behavior-smoke (addedSince/exposeFileInput matrices) adapted to the
  DacContentDecision global name chosen; output attribution cases translated into image-evidence fixtures.
- Update in place: provider-adapter-static (gemini values), generation-limit/security fixtures (Gemini
  quota anchors + scoped text), any static test pinning chatgpt strings in manifest/content.
- Never weaken: submit-once guards, innerHTML ban, ordering pins (attach → type → confirm → send).
- New static pins: surface rule allows /app after submit; output excludes user-query/image-card/gstatic;
  composer-scope literal 'input-container'.
- Suite must end green; expected count ≥ 71.

## 5. Out of scope for step 3 (later steps)

- Bridge diagnostics methods (step 4); durable lease/binding port from v0.1.0 (step 5);
  live pilot (owner, after reload); README/HANDOFF rewrite for the new package identity.

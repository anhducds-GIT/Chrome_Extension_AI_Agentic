# G1 snapshot 3 — AFTER result (generation completed, image visible)

- Captured 2026-08-25 ~07:07 (+07) by owner via probe v2, right after a real manual generation.
- URL: **https://gemini.google.com/app/753d3063c42ee9a3** ← see finding #1.

## Finding 1 — DESIGN-LEVEL: submitting from /images NAVIGATES the tab to /app/<conversation-id>

The pre-submit surface is `/images`; after Send the SPA routes to `/app/<id>` (zero-state gallery gone,
conversation view in). Consequences for the v0.1.0 design:
- `binding-core.validate()` returns `BOUND_TAB_LEFT_IMAGES_SURFACE` for a perfectly healthy run — the
  binding rule must allow IMAGES → CONVERSATION *after* SUBMITTED (still same tab id + window id).
- `waitReady()`-for-next-job must accept the CONVERSATION surface (follow-up jobs continue in /app), or
  navigate back to /images per job — policy decision for the adapter.

## Finding 2 — response containers: the original guesses were RIGHT, they just don't exist pre-send

Verified live: `model-response` ×1, `response-container` ×1, `message-content` ×1, `[id^="model-response"]` ×1,
`user-query` ×1. Conversation structure:
`chat-window-content > infinite-scroller > user-query + model-response > response-container >
thinking-overlay + message-content > response-element > div.attachment-container.generated-images >
generated-image > single-image > img`.

## Finding 3 — the generated image (the money shot)

- 708×708, `class="image animate loaded"`, **alt=", AI generated"** (stable marker!),
  src **https://lh3.googleusercontent.com/gg-dl/…** → result images are **https:, not blob:** —
  chrome.downloads path works directly. (Input previews ARE blob: — clean scheme separation.)
- Native `download-generated-image-button` + `button[aria-label="Download full size image"]` exist.
- `image-loading-overlay` + `thinking-overlay` elements are the generating-state markers.

## Finding 4 — input-evidence markers in conversation

Owner's uploaded reference appears as `user-query-file-preview img[data-test-id="uploaded-img"]`
(alt "Uploaded image preview", blob:) inside `user-query-file-carousel` — exclude via `user-query` ancestor.

## Finding 5 — Send button EXISTS ONLY when composer has content

`sendBtn: false` with an empty composer after the response. Readiness logic must not require a visible
Send on an empty composer; Send appears after typing. (Old GEMINI readiness used requireSend:false — correct.)

## Finding 6 — quota/blocker anchors

Custom tags exist for the freemium wall: `freemium-file-upload-near-quota-disclaimer`,
`freemium-file-upload-quota-exceeded-disclaimer`, plus `sensitive-memories-banner`,
`hallucination-disclaimer`, `model-response-disclaimers`. Far better anchors than phrase-matching.

## Still missing (optional, capture opportunistically)

- DURING-generation snapshot (real Stop button aria) — infer from `image-loading-overlay`/`thinking-overlay`
  presence meanwhile.
- Upload & tools MENU open state: menu item labels + whether a transient `input[type="file"]` appears
  (composer idle shows none). This decides exposeFileInput vs DataTransfer-drop for the adapter.

# G1 snapshot 2 — DURING generation (owner sent a 2nd prompt in the same /app conversation)

- Captured 2026-08-25 ~07:08 (+07) via probe v2 while the model was generating.

## Verified facts

1. **Stop button**: `button[aria-label="Stop response"]` — the old generic guess `button[aria-label*="Stop" i]`
   matches. Exact aria label now known.
2. **Generating signal, scoped**: `busyScoped.chatWindow = true` (progressbar/aria-busy inside `chat-window`)
   while `inputContainer = false`. Plus `thinking-dots-animation` custom tag present only during generation
   (absent in the after-result snapshot). Two independent, scoped generating markers.
3. **Boundary model confirmed live**: during generation `model-response` ×2 / `response-container` ×2 exist
   while `message-content` ×1 and `[id^="model-response"]` ×1 — the NEW response container appears first,
   its content/image arrives later. "New container after boundary" attribution works exactly as designed.
4. Send button absent while generating (and composer empty); per-message `Edit` buttons are disabled
   during generation.
5. Still no `input[type="file"]` anywhere; menu closed (menuitems []).

## Adapter decisions locked by snapshots 1–3

- stop: `button[aria-label="Stop response"]` (+ generic fallbacks)
- generating: stop-button OR chat-window-scoped busy OR `thinking-dots-animation`/`image-loading-overlay`
- output: fresh `model-response` container after boundary → `generated-image single-image img`
  (alt contains "AI generated", src https:) — exclude `user-query` subtree and `image-card`/gstatic gallery
- surface rule: allow /images → /app/<id> navigation after SUBMITTED (same tab+window)

Remaining optional capture: "Upload & tools" menu open (menu item labels + transient file input).

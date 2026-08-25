# G1 live DOM evidence — snapshot 1: reference attached + prompt typed, NOT sent

- Captured: 2026-08-25 ~06:52 (+07), by the owner via read-only console probe (`drafts/G1-DOM-PROBE.js`)
- URL: https://gemini.google.com/images · UI locale: English · Account details redacted
- State: 1 reference image staged in composer, prompt text typed, Send not clicked, no conversation yet (zero-state gallery visible)

## Verified selector table (facts, not guesses)

| Target | VERIFIED selector | Old guess status |
|---|---|---|
| Composer | `rich-textarea .ql-editor[role="textbox"][contenteditable="true"]` (aria-label "Enter a prompt for Gemini"; Quill editor, class `ql-editor textarea new-input-ui`; sits under `[data-test-id="textarea-wrapper"]`) | all 3 guesses matched (1 each) ✓ |
| Upload button | `button[aria-label="Upload & tools"]` (aria-haspopup=menu; note: mode-picker button also has haspopup=menu — generic guess matches 2, exact aria matches 1) | exact guess ✓ |
| Send button | `button[aria-label="Send message"]` | exact guess ✓ (VN variants 0 — UI is EN) |
| Stop button | unknown yet (not generating in this snapshot; all guesses 0) | capture in snapshot 2 |
| Attachment preview | `uploader-file-preview gem-media-attachment img.gem-attachment-style-img` (112×112, inside `mat-basic-chip`, under `uploader-file-preview-container`) | **all 4 guesses = 0** — Bug #3 root cause confirmed |
| Attachment/composer scope | `input-container` (custom element; contains input-area-v2, uploader-file-preview-container, rich-textarea, toolbox-drawer) | old scope `form` — no form exists |
| File input | **NONE in DOM** (0 matches even with attachment staged); page has `file-drop-indicator` → transient input on menu click, or DataTransfer drop path | exposeFileInput strategy must be re-verified live |
| Busy (idle noise!) | idle page still has `[role="progressbar"]` ×1 + `[class*="loading"]` ×2 (sidebar `mat-progress-spinner`, `chat-loading-animation`) | page-wide busy latch would deadlock — scoping to `input-container` is mandatory ✓ |
| Output false-positive trap | zero-state gallery `image-card img[data-test-id="image-card-image"]` (117×156 template cards: Origami, Slide, …) — MUST be excluded from output attribution | new finding |
| Model/response container | all 5 guesses = 0 (no conversation yet) | capture in snapshots 2–3 |

## Component map (custom elements present)

chat-app > chat-window > chat-window-content; input-container > (gxu-usage-warning-disclaimer,
file-drop-indicator, input-area-v2 > (uploader-file-preview-container > uploader-file-preview >
gem-media-attachment > mat-basic-chip > img.gem-attachment-style-img), rich-textarea,
auto-suggest, toolbox-drawer, bard-mode-switcher, speech-dictation-mic-button);
zero-state: discovery-images-page > images-section > carousel-image-layout > card-item > image-card.

Full raw JSON (account string redacted) is in `snapshot-1-attached-idle.json`.

# Audit checklist — Duc Auto ChatGPT V0

## Functional
- [ ] Side panel opens from extension action.
- [ ] Test detects ChatGPT composer on a normal chat page.
- [ ] Multiline prompts split only on delimiter line `---`.
- [ ] Prompt text is inserted exactly once.
- [ ] Send occurs exactly once per queue item.
- [ ] Next prompt waits for prior assistant generation to complete.
- [ ] Pause applies between prompts.
- [ ] Stop prevents queue advancement without stopping ChatGPT generation.
- [ ] Timeout surfaces a clear error and does not continue silently.

## Safety / scope
- [ ] No network calls to a third-party backend.
- [ ] No separate authentication/token collection.
- [ ] No logic intended to bypass ChatGPT/account rate limits.
- [ ] No source copied from the proprietary reference extension.
- [ ] Host access limited to ChatGPT domains.

## Robustness
- [ ] Works with `#prompt-textarea` when textarea or contenteditable.
- [ ] Falls back to ProseMirror/contenteditable composer selectors.
- [ ] Detects send/stop buttons via stable attributes before locale fallbacks.
- [ ] Reloading ChatGPT after installation restores content-script connectivity.
- [ ] Side-panel close/reopen marks in-flight state INTERRUPTED rather than falsely resuming.

# Audit Checklist — Duc Auto ChatGPT V0

## Functional

- [x] Side panel can be installed/opened in the user's Chrome environment.
- [x] Three-item prompt queue can execute sequentially in a live ChatGPT conversation.
- [x] Delimiter line `---` separates queue items in the tested pilot.
- [x] Prompt text was delivered exactly once for each of the three pilot items.
- [x] Next prompt waited for the prior assistant response in the tested pilot.
- [ ] Pause applies correctly between prompts.
- [ ] Stop prevents queue advancement without stopping ChatGPT generation.
- [ ] Timeout surfaces a clear error and does not continue silently.

## Safety / scope

- [ ] Independent audit confirms no network calls to a third-party backend.
- [ ] Independent audit confirms no separate authentication/token collection.
- [ ] Independent audit confirms no logic intended to bypass ChatGPT/account rate limits.
- [ ] Independent audit confirms no proprietary source copied from the reference extension.
- [ ] Independent audit confirms host access is limited to required ChatGPT domains.

## Robustness

- [ ] Works with `#prompt-textarea` when textarea or contenteditable.
- [ ] Falls back to ProseMirror/contenteditable composer selectors.
- [ ] Detects send/stop buttons via stable attributes before locale fallbacks.
- [ ] Reloading ChatGPT after installation restores content-script connectivity.
- [ ] Side-panel close/reopen marks in-flight state INTERRUPTED rather than falsely resuming.

## Current gate

Core runtime path is **PILOT PASS**. Full V0 audit remains **OPEN** until Claude/Codex review and the unchecked manual robustness tests are completed.

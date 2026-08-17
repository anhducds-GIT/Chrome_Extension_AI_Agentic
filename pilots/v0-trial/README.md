# Duc Auto ChatGPT — V0 Trial Pilot Archive

Status: **PILOT PASS · ARCHIVED**  
Date: 2026-08-18  
Implementation model: clean-room personal Chrome extension  
Install mode: Chrome Developer Mode / Load unpacked

## Purpose

This folder preserves the documentation and verified pilot record for the first Duc Auto ChatGPT V0 trial.

V0 validates one narrow core workflow:

`Side Panel -> prompt queue -> ChatGPT composer -> wait for completion -> next prompt`

## V0 scope

- Side Panel UI.
- Multiple text prompts separated by a delimiter line containing `---`.
- Sequential execution.
- Configurable inter-prompt delay and response timeout.
- Pause between prompts and stop the extension runner.
- Local draft/progress persistence with `chrome.storage.local`.
- Connection / DOM health test.
- No separate login.
- No backend/server.
- No extension-side quota.
- No paid API.

## Explicitly out of scope

- Bypassing ChatGPT limits, paywalls, account restrictions, or third-party extension licensing.
- Copying proprietary source code from another extension.
- Image/file automation.
- Multi-tab concurrency.
- Cloud synchronization.
- Broad autonomous browser control.

## Pilot result

The user installed the extension successfully with `Load unpacked` and ran a three-item sequential queue in a live ChatGPT session.

Expected outputs were observed in order:

1. `TEST 01 PASS`
2. `84`
3. `TEST 03 COMPLETE`

This establishes **runtime PASS for the core sequential text-batch path**. It does not yet establish reliability across different ChatGPT UI variants, long-running queues, failures, retries, attachments, or concurrency.

## Documents

- `TEST_REPORT.md` — static + live runtime verification record.
- `AUDIT.md` — bounded V0 audit checklist.
- `HANDOFF.md` — Claude Coordinator and Codex Auditor handoff prompts.
- `TEST_PROMPTS.md` — canonical pilot test sequence.

## Architecture

```text
Chrome Side Panel
        |
        | chrome.tabs.sendMessage
        v
Content Script on chatgpt.com
        |
        +--> locate composer
        +--> insert prompt
        +--> click Send
        +--> observe assistant/generation DOM
        +--> return completion/error
```

## Pilot interpretation

V0 is a proof of the execution primitive, not the final product. Future work should preserve this narrow verified baseline while product/architecture reasoning proceeds separately.

# Duc Auto ChatGPT V0

Personal Chrome extension for **local-only text batch automation** on ChatGPT.

## V0 scope

- Side Panel UI.
- Multiple text prompts separated by a line containing `---`.
- Sequential execution: send one prompt, wait for ChatGPT to finish, then continue.
- Configurable inter-prompt delay and response timeout.
- Pause between prompts and stop the automation runner.
- Local draft/progress persistence with `chrome.storage.local`.
- Connection/DOM health test.
- No separate login, no backend/server, no extension-side quota, no paid API.

## Explicitly out of scope

- Bypassing ChatGPT limits, paywalls, account restrictions, or third-party extension licensing.
- Copying proprietary source code from another extension.
- Image/file automation.
- Multi-tab concurrency.
- Cloud synchronization.
- Automatic recovery across a closed side panel while a response is in-flight.

## Install (Load unpacked)

1. Extract this folder somewhere permanent on your Windows PC.
2. Open `chrome://extensions`.
3. Turn on **Developer mode**.
4. Click **Load unpacked**.
5. Select the extracted `duc-auto-chatgpt-v0` folder.
6. Open or reload `https://chatgpt.com/` once after installation.
7. Click the extension icon; the side panel should open.
8. Press **Test** before the first run.

## Prompt format

```text
First prompt
---
Second prompt can be multiline.
It ends only at the delimiter line.
---
Third prompt
```

## Important behavior

- The current active tab must be a normal ChatGPT conversation.
- Stop cancels this extension's waiting loop; it intentionally does **not** click ChatGPT's Stop-generation button.
- ChatGPT is a changing web app. If its DOM changes, `content.js` selectors may need a small adapter update.

## Quick validation

1. Open a new ChatGPT chat.
2. Put two trivial prompts in the queue, separated by `---`.
3. Press **Test**; expect `Connected · ready`.
4. Press **Start queue**.
5. Verify prompt #2 is not sent until prompt #1 has finished.
6. Test Pause (takes effect between prompts).
7. Test Stop during generation; verify the extension stops advancing but ChatGPT itself may continue its current response.

## Architecture

```text
Chrome Side Panel (sidepanel.html/js)
        |
        | chrome.tabs.sendMessage
        v
Content Script on chatgpt.com (content.js)
        |
        +--> locate composer
        +--> insert prompt
        +--> click Send
        +--> observe assistant/generation DOM
        +--> return completion/error
```

## WP2 localhost Worker API

The service worker also accepts external messages only from `http://localhost/*` and `http://127.0.0.1/*`. The private `DAC_*` messages remain between `background.js` and `content.js`.

Public message shapes:

```js
{ operation: "ping" }
{ operation: "job.submit", job_id: "job-001", task_type: "text_prompt", prompt: "...", timeout_ms: 180000 }
{ operation: "job.status", job_id: "job-001" }
{ operation: "job.abort", job_id: "job-001" }
```

Only one job may be active and no queue exists. A repeated `job_id` returns the stored Job Record with `duplicate: true`; it does not resend the prompt. Statuses are `accepted`, `running`, `done`, `failed`, or `aborted`. Job state is in-memory and is lost if Chrome terminates the MV3 worker.

For a completed `text_prompt`, `job.result` is a canonical text result:

```js
{
  type: "text",
  text: "new assistant response",
  char_count: 22,
  assistant_message_index: 3,
  assistant_count_before: 3,
  assistant_count_after: 4,
  completion: { generation_seen: true, reason: "stable_text", poll_count: 9 }
}
```

`job.target` records the selected `tab_id`, `tab_url`, `window_id`, and `conversation_url`; the Job Record also exposes `created_at`, `started_at`, and `completed_at`. The result is accepted only from the first assistant message after the pre-send assistant-count boundary; the extension does not blindly return the latest assistant message.

Terminal Job Records are also retained in `chrome.storage.session` (newest 10 only), so `job.status` remains available after the MV3 service worker sleeps during the same browser/extension session. This retention stores no original prompt and is cleared by browser restart, extension reload, update, or disable. It does not resume jobs or provide durable idempotency. If retaining a terminal record fails, the completed execution remains `done`/`failed`/`aborted` and exposes `retention_error` while its in-memory record remains available.

For a manual localhost test, run `python -m http.server 8123` from this folder, visit `http://localhost:8123/worker-api-test.html`, enter the unpacked extension ID, and use the four API buttons. The test page has no server-side logic.

## License

This implementation is a clean-room personal prototype created from public Chrome extension APIs and observed product behavior. It does not include source code from ChatGPT Automation - Auto ChatGPT.

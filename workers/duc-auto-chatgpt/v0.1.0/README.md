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

## License

This implementation is a clean-room personal prototype created from public Chrome extension APIs and observed product behavior. It does not include source code from ChatGPT Automation - Auto ChatGPT.

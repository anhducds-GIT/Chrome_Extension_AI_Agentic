# Extension Observer V0 — ghi chép kỹ thuật thừa kế

> **File này là bản ghi của POC-1, giữ nguyên văn.** Cửa vào của gói là `README.md` cùng thư mục.
> Từ 06/09 Observer đã thành Scouter ([ADR-0009](../../../docs/adr/0009-scouter-thay-observer-cua-tuong-tac.md))
> và gói dọn về đây ([ADR-0013](../../../docs/adr/0013-scouter-ra-nha-rieng-co-khoa-rieng.md)).
> Bốn mục còn đúng nguyên: *Safety boundary* · *Target classifications* · *Report levels* ·
> *Expected limitations* — chúng tả `observer-engine.js`, và file đó không đổi.
> Mục *Install unpacked* đã sửa đường dẫn; mục *Explicit non-goals* nay **KHÔNG còn đúng**:
> ADR-0009 cố ý bỏ ranh giới "chỉ quan sát".


POC-1 for the Personal Browser Agent Runtime: a minimal Manifest V3 extension that discovers Chrome debug targets and performs temporary, structured, read-only observation. It does not automate any target.

## Safety boundary

The extension uses only the `debugger` permission. It has no host permissions and does not take screenshots, perform OCR/vision, click, type, dispatch events, mutate DOM, change storage, send extension messages, or bypass Chrome security restrictions. Each successful observation attaches temporarily and detaches in a `finally` block.

## Install unpacked

1. In Chrome, open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose this folder: `workers/duc-scouter/v0.1.0` (KHÔNG còn là gốc repo — ADR-0013).
5. Open the **Extension Observer V0** toolbar popup and select **Scan Targets**.

Chrome will warn that the extension can use the debugging protocol. This is expected for this deliberately scoped POC; do not proceed if that permission is not acceptable.

## Test procedure

1. Open one normal tab and, if desired, open another installed extension's popup or side panel.
2. In Observer V0, select **Scan Targets**. Extension URLs are visually highlighted.
3. Confirm target metadata: ID, type, title, URL, attached state, and conservative classification.
4. Select **Observe** for one target that is not already attached.
5. Read the report panel. It displays a readable summary plus copyable JSON.
6. Confirm the report's `detached: true` after a permitted observation.

The repository also includes a no-browser engine smoke test. From this folder, run:

```powershell
node workers/duc-scouter/v0.1.0/tests/observer-engine-smoke.mjs
```

## Target classifications

`service_worker` is confirmed only when Chrome reports `type=service_worker` with an extension URL. `normal_webpage` is confirmed for a non-extension `page`. A `page` with a `chrome-extension://` URL is reported as `extension_page`: Chrome target metadata alone does not reliably say whether it is a popup or side panel, so V0 will not guess. Other cases are `other` or `unknown` with evidence retained in the report.

## Report levels

- `FULL`: Runtime and DOM commands succeeded.
- `PARTIAL`: at least one runtime/DOM capability succeeded.
- `METADATA_ONLY`: target metadata is all that was available without an attach failure.
- `BLOCKED`: Chrome denied or interrupted attachment/observation.

## Expected limitations

- Chrome and enterprise policy may refuse attaching to extension targets, especially protected browser surfaces.
- An attached target is intentionally not taken over by V0.
- Extension pages, popups, and side panels are not always separately identifiable from `getTargets()` metadata.
- A service worker commonly has runtime metadata but no DOM.
- The current popup may appear in the target list; that is normal and should not be mistaken for an external extension.

## Architecture

`observer-engine.js` is UI-independent and exposes `scanTargets()` and `observe(target)`. `popup.js` is only the small presentation layer. A future AI/Agent Bridge can call the engine after it has an appropriate, separately reviewed invocation path.

## Explicit non-goals

> **HẾT HIỆU LỰC 06/09.** ADR-0009 chốt Scouter là kẻ hành động, không còn là người quan sát.
> Giữ đoạn dưới làm bản ghi của POC-1.

Control, automation, target messaging, input, workflow triggering, screenshots, and visual interpretation are outside POC-1.

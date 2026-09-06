/* scouter-background.js — DÂY THẬT: bơm đồ của Chrome vào ba lõi của seed.
 *
 * File này CỐ Ý mỏng và CỐ Ý không có phép ghim riêng: mọi thứ đáng ghim đã nằm ở ba lõi
 * (`scripts/scouter-bridge-core.mjs` · `scripts/scouter-seed-core.mjs` ·
 * `scripts/scouter-transport-loopback.mjs`), và cả ba đều nhận `chrome` qua tham số nên
 * `tests/scouter-bridge-smoke.mjs` và `tests/scouter-transport-smoke.mjs` chạy được không cần
 * trình duyệt. Thêm một dòng LOGIC vào đây là thêm một dòng không ai canh — logic thuộc về lõi.
 *
 * ADR-0009 mục ⑸: vòng tự cải tiến là "Scouter quan sát → Bridge ghi code mới xuống đĩa →
 * `chrome.runtime.reload()` nạp lại chính nó → vòng tiếp theo". Chân chạy nằm ở Bridge; phần
 * của extension là ba khả năng nối vào đây.
 */

import { ObserverEngine } from "./observer-engine.js";
import {
  BridgeProtocolError,
  MAX_ENVELOPE_BYTES,
  capabilities,
  createDispatcher,
  negotiateVersion
} from "./scripts/scouter-bridge-core.mjs";
import { createSeedHandlers } from "./scripts/scouter-seed-core.mjs";
import { createTransport } from "./scripts/scouter-transport-loopback.mjs";

const handlers = createSeedHandlers({
  engine: new ObserverEngine(),
  chromeApi: chrome,
  BridgeProtocolError,
  negotiateVersion,
  capabilities
});

const transport = createTransport({
  dispatch: createDispatcher({ handlers }),
  max_envelope_bytes: MAX_ENVELOPE_BYTES
});

/* Nối hụt KHÔNG được ném ra ngoài: một promise bị bỏ rơi trong service worker chỉ để lại một
 * dòng đỏ trong bảng điều khiển, còn transport thì đã tự hẹn lượt nối lại rồi. */
function connectQuietly() {
  transport.connect().catch(() => {});
}

chrome.runtime.onInstalled.addListener(connectQuietly);
chrome.runtime.onStartup.addListener(connectQuietly);

/* Chủ vừa dán tệp ghép cặp vào popup thì nối NGAY, đừng bắt họ nạp lại extension. Đọc lại từ
 * kho lưu thay vì tin giá trị trong sự kiện: `loadPairing()` là chỗ duy nhất kiểm tính hợp lệ. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[transport.PAIRING_STORAGE_KEY]) return;
  transport.disconnect();
  transport.loadPairing().then(connectQuietly).catch(() => {});
});

connectQuietly();

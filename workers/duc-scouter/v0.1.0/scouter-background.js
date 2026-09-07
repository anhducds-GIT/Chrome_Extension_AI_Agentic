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

/* ---- Bấm icon thì MỞ BẢNG BÊN (07/09) -----------------------------------
 * Bỏ `default_popup` khỏi manifest là bỏ luôn hành vi mặc định của nút icon: không có dòng
 * dưới đây thì bấm icon KHÔNG mở gì cả, và nhìn ra ngoài giống hệt "extension chết". Ba gói
 * `duc-auto-*` đều có đúng cặp này; đây là chỗ Scouter từng lệch chuẩn mà không ai giải trình.
 *
 * Bọc `try` vì `chrome.sidePanel` chỉ có từ Chrome 114, mà `minimum_chrome_version` của gói là
 * 120 — nên nó luôn có. Bọc là để một lượt gọi hỏng KHÔNG kéo theo cả lượt nối Bridge bên dưới:
 * mất bảng bên thì còn dùng được qua Bridge, mất Bridge thì mất cả gói. */
async function moBangBenKhiBamIcon() {
  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); }
  catch (error) { console.warn("Không đặt được hành vi bảng bên", error); }
}

chrome.runtime.onInstalled.addListener(() => { moBangBenKhiBamIcon(); connectQuietly(); });
chrome.runtime.onStartup.addListener(() => { moBangBenKhiBamIcon(); connectQuietly(); });

/* ---- Lưới đỡ nối lại (S-02 · Đức duyệt quyền `alarms` 2026-09-07) --------
 * Tầng thử-lại của transport chạy bằng `setTimeout`, và `setTimeout` chết theo service worker
 * khi Chrome cho nó ngủ. Hệ quả đo được: máy chủ Bridge tắt lâu thì Scouter chỉ tỉnh lại lúc
 * TÌNH CỜ có việc khác đánh thức nó — nhìn ra ngoài giống hệt "extension hỏng".
 *
 * `chrome.alarms` KHÔNG thay được tầng kia: Chrome ép sàn 30 giây một lượt hẹn, mà tầng kia
 * thử lại sau 1s/2s/5s. Hai thứ khác việc — cái nhanh vá lúc worker còn thức, cái này đánh
 * thức worker đã ngủ. Nên giữ cả hai, đừng gộp.
 *
 * `connect()` tự bỏ qua lượt gọi trùng (`if (connecting || authenticated || socket) return null`),
 * nên nhịp một phút này vô hại lúc đang nối tốt. Đó là điều kiện để khối này đúng, và
 * `tests/scouter-transport-smoke.mjs` ghim nó.
 *
 * Tạo có ĐIỀU KIỆN, không tạo mù: `alarms.create` cùng tên thì ĐẶT LẠI đồng hồ từ đầu, mà
 * đoạn này chạy lại mỗi lần worker tỉnh. Tạo mù thì một worker hay bị đánh thức sẽ đẩy lượt
 * hẹn ra xa mãi và cái lưới không bao giờ rơi. */
const RECONNECT_ALARM = "scouter.reconnect.v1";

chrome.alarms.get(RECONNECT_ALARM, (existing) => {
  if (!existing) chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECONNECT_ALARM) connectQuietly();
});

/* Chủ vừa dán tệp ghép cặp vào popup thì nối NGAY, đừng bắt họ nạp lại extension. Đọc lại từ
 * kho lưu thay vì tin giá trị trong sự kiện: `loadPairing()` là chỗ duy nhất kiểm tính hợp lệ. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[transport.PAIRING_STORAGE_KEY]) return;
  transport.disconnect();
  transport.loadPairing().then(connectQuietly).catch(() => {});
});

connectQuietly();

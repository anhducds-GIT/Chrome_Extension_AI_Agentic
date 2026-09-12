/* background.js — DÂY THẬT của HNX Fetch: bơm đồ của Chrome vào ba lõi.
 *
 * Cố ý mỏng, cố ý không có phép ghim riêng: mọi thứ đáng ghim nằm ở ba lõi
 * (`scripts/bridge-core.mjs` · `scripts/fetch-core.mjs` · `scripts/transport.mjs`), và cả ba
 * đều nhận `chrome` qua tham số nên phép ghim chạy được không cần trình duyệt. Thêm một dòng
 * LOGIC vào đây là thêm một dòng không ai canh.
 *
 * ─── KHÁC SCOUTER Ở ĐÂU, VÀ VÌ SAO ────────────────────────────────────────────────────────
 * Không `ObserverEngine`, không `chrome.debugger`, không `scout.click/type/key`. Extension này
 * biết đúng một việc chạm ra ngoài: `scout.fetch`. Quyền `debugger` KHÔNG khai trong manifest —
 * nên kể cả khi có ai đó nối lại một đường bấm vào đây, Chrome cũng từ chối nó.
 */

import {
  BridgeProtocolError,
  MAX_ENVELOPE_BYTES,
  capabilities,
  createDispatcher,
  negotiateVersion
} from "./scripts/bridge-core.mjs";
import { createJournal } from "./scripts/journal-core.mjs";
import { createSeedHandlers, setWriteGate } from "./scripts/fetch-core.mjs";
import { createTransport } from "./scripts/transport.mjs";

const handlers = createSeedHandlers({
  chromeApi: chrome,
  BridgeProtocolError,
  negotiateVersion,
  capabilities
});

/* Sổ công việc — cửa sổ của Đức nhìn vào việc AI đang làm. Bọc `dispatch` chứ không sửa nó:
 * sổ đứng NGOÀI đường đi của phong bì, nên một cuốn sổ hỏng không đổi được một byte nào của
 * thứ AI nhận về.
 *
 * `traUrl` trả `null`, và đó là câu trả lời ĐÚNG ở đây chứ không phải chỗ làm dối. Bên Scouter
 * nó tra tên miền của một `target_id` bằng `chrome.debugger.getTargets` — HNX Fetch không có
 * quyền đó và không có target nào. Hệ quả: sổ giữ VÒNG HOẠT ĐỘNG (lệnh nào, được hay hỏng, lúc
 * nào) còn phần "mốc thuần hoá trang" đứng yên. Phần mốc đó là của Scouter — tám mốc buộc vào
 * tám phép dò mà extension này không có — nên bảng bên KHÔNG vẽ nó ra. */
const journal = createJournal({ chromeApi: chrome, async traUrl() { return null; } });

const transport = createTransport({
  dispatch: journal.boc(createDispatcher({ handlers })),
  max_envelope_bytes: MAX_ENVELOPE_BYTES,
  /* TÊN GÓI KHAI Ở ĐÂY, không ở trong transport. `scripts/transport` được chép nguyên văn
   * giữa các gói, nên một tên gói gõ cứng trong đó sẽ theo bản chép sang gói khác và khiến
   * gói đó tự khai sai tên mình trên dây. Đây là lớp nối dây — chỗ của hiểu biết riêng. */
  worker_id: "hnx-fetch"
});

/* Nối hụt KHÔNG được ném ra ngoài: một promise bị bỏ rơi trong service worker chỉ để lại một
 * dòng đỏ trong bảng điều khiển, còn transport thì đã tự hẹn lượt nối lại rồi. */
function connectQuietly() {
  transport.connect().catch(() => {});
}

/* Bấm icon thì MỞ BẢNG BÊN. Không có dòng này thì bấm icon không mở gì cả, và nhìn ra ngoài
 * giống hệt "extension chết". Bọc `try` để một lượt gọi hỏng không kéo theo cả lượt nối Bridge:
 * mất bảng bên thì còn dùng được qua Bridge, mất Bridge thì mất cả gói. */
async function moBangBenKhiBamIcon() {
  try { await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }); }
  catch (error) { console.warn("Không đặt được hành vi bảng bên", error); }
}

chrome.runtime.onInstalled.addListener(() => { moBangBenKhiBamIcon(); connectQuietly(); });
chrome.runtime.onStartup.addListener(() => { moBangBenKhiBamIcon(); connectQuietly(); });

/* PHANH KHẨN — phím tắt, dùng được cả khi bảng bên đã đóng. Gọi thẳng `setWriteGate(false)`,
 * cùng một hàm mà bảng bên gọi: hai bản của một luật thì sớm muộn trả hai câu khác nhau.
 * Phím tắt chỉ TẮT chứ không bật được — một cái phanh mà bấm nhầm thành ga thì không phải phanh. */
chrome.commands.onCommand.addListener((lenh) => {
  if (lenh !== "dung-khan") return;
  setWriteGate(chrome, false)
    .then(() => console.warn("PHANH KHẨN: đã TẮT công tắc lấy dữ liệu của HNX Fetch."))
    .catch((error) => console.error("PHANH KHẨN HỎNG — công tắc CÓ THỂ VẪN ĐANG BẬT:", error));
});

/* Lưới đỡ nối lại. Tầng thử-lại của transport chạy bằng `setTimeout`, mà `setTimeout` chết theo
 * service worker khi Chrome cho nó ngủ. `chrome.alarms` KHÔNG thay được tầng kia (Chrome ép sàn
 * 30 giây một lượt hẹn, tầng kia thử lại sau 1s/2s/5s) — hai thứ khác việc, giữ cả hai.
 *
 * Tạo có ĐIỀU KIỆN: `alarms.create` cùng tên thì ĐẶT LẠI đồng hồ từ đầu, mà đoạn này chạy lại
 * mỗi lần worker tỉnh. Tạo mù thì một worker hay bị đánh thức sẽ đẩy lượt hẹn ra xa mãi. */
const RECONNECT_ALARM = "hnx-fetch.reconnect.v1";

chrome.alarms.get(RECONNECT_ALARM, (existing) => {
  if (!existing) chrome.alarms.create(RECONNECT_ALARM, { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === RECONNECT_ALARM) connectQuietly();
});

/* Chủ vừa chọn tệp ghép cặp trong bảng bên thì nối NGAY, đừng bắt họ nạp lại extension. Đọc lại
 * từ kho lưu thay vì tin giá trị trong sự kiện: `loadPairing()` là chỗ duy nhất kiểm hợp lệ. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[transport.PAIRING_STORAGE_KEY]) return;
  transport.disconnect();
  transport.loadPairing().then(connectQuietly).catch(() => {});
});

connectQuietly();

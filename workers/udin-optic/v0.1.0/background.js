/* background.js — DÂY THẬT của Udin Optic: bơm đồ của Chrome vào ba lõi.
 *
 * Chép từ `duc-scouter/v0.1.0/scouter-background.js` ngày 15/09 và đổi ĐÚNG BA chỗ:
 * đường `import` của cửa Bridge · `worker_id` · tên khoá đồng hồ. Mọi thứ khác giữ nguyên
 * từng dòng — đây là lớp nối dây, không phải chỗ để sáng tạo.
 *
 * File này CỐ Ý mỏng và CỐ Ý không có phép ghim riêng: mọi thứ đáng ghim nằm ở các lõi, và
 * các lõi đều nhận `chrome` qua tham số nên phép ghim chạy được không cần trình duyệt. Thêm
 * một dòng LOGIC vào đây là thêm một dòng không ai canh.
 *
 * KHÔNG có `scout.reload` trong từ vựng gói này, nên **không có vòng tự nạp lại**. Đó là việc
 * của seed Scouter, không phải của một gói chạy việc.
 */

import { ScouterEngine } from "./scouter-engine.js";
import {
  BridgeProtocolError,
  MAX_ENVELOPE_BYTES,
  capabilities,
  createDispatcher,
  negotiateVersion
} from "./scripts/bridge-core.mjs";
import { createJournal } from "./scripts/scouter-journal-core.mjs";
import { createSeedHandlers, setWriteGate } from "./scripts/scouter-seed-core.mjs";
import { createTransport } from "./scripts/scouter-transport-loopback.mjs";

const handlersGoc = createSeedHandlers({
  engine: new ScouterEngine(),
  chromeApi: chrome,
  BridgeProtocolError,
  negotiateVersion,
  capabilities
});

/* ---- GÓI NÀY TỰ KHAI TÊN MÌNH, ở ĐÂY chứ không ở trong lõi ----------------
 * `scripts/scouter-seed-core.mjs` là tệp chép NGUYÊN VĂN, và nó gõ cứng `"scouter-seed-v0.1"`
 * vào `session.hello` và `system.ping`. Đo thật 15/09 trên máy chủ của chính gói này:
 * `system.ping` trả `{"scouter":"online","seed":"scouter-seed-v0.1"}` — đúng cổng Udin, đúng
 * extension Udin, **tự xưng là Scouter**.
 *
 * Đó không phải chuyện thẩm mỹ: `system.ping` là thứ ĐẦU TIÊN người ta gọi để biết mình đang
 * nói chuyện với ghế nào, và bộ kiểm cài đặt in thẳng `seed` ra màn hình.
 *
 * Hai đường chữa, và đường kia SAI: sửa thẳng `scouter-seed-core.mjs` thì phải khai nó vào
 * `CO_Y_KHAC` và **mất phép so từng byte trên đúng tệp chứa CÁI PHANH**. Đổi một lớp bảo vệ lấy
 * hai chuỗi chữ là một cái giá tồi.
 *
 * Nên danh tính khai ở LỚP NỐI DÂY — cùng chỗ với `worker_id`, cùng lý do (`G9`): tên gói là
 * hiểu biết riêng của một chỗ, nó không vào tệp dùng chung hay tệp chép.
 *
 * `capabilities()` thì KHÔNG cần đụng: nó đến từ `scripts/bridge-core.mjs`, tệp riêng, và đã
 * khai `seed: "udin-optic-v0.1"`. */
const SEED_CUA_GOI = "udin-optic-v0.1";

const handlers = {
  ...handlersGoc,
  async "session.hello"(params) {
    return { ...(await handlersGoc["session.hello"](params)), seed: SEED_CUA_GOI };
  },
  async "system.ping"() {
    /* Dựng thẳng phong bì trả lời thay vì lọc bớt phong bì của bản gốc, và cố ý: bản gốc trả
     * một khoá mang TÊN GÓI KHÁC, mà một khoá như thế trên dây là đúng cái nhầm lẫn khối này
     * sinh ra để chặn. Vẫn gọi bản gốc để giữ nguyên tác dụng phụ và nguồn thời gian. */
    const goc = await handlersGoc["system.ping"]();
    return { udin_optic: "online", seed: SEED_CUA_GOI, server_time: goc.server_time };
  }
};

/* ---- SỔ CÔNG VIỆC — cửa sổ của Đức nhìn vào việc AI đang làm (07/09) ------
 * Bọc `dispatch` chứ không sửa nó: sổ đứng NGOÀI đường đi của phong bì, nên một cuốn sổ hỏng
 * không đổi được một byte nào của thứ AI nhận về. Lý do đầy đủ ở đầu `scouter-journal-core.mjs`.
 *
 * `traUrl` phải tra tên miền LÚC GHI, không phải lúc bảng bên vẽ: `target_id` chỉ sống bằng
 * tuổi cái tab, nên tra ngược lúc vẽ thì mọi việc làm hôm qua đều thành vô chủ. Dùng
 * `chrome.debugger.getTargets` — đọc thuần, không gắn vào tab nào, không dựng dải băng
 * "đang gỡ lỗi" nào. */
const journal = createJournal({
  chromeApi: chrome,
  async traUrl(targetId) {
    try {
      const targets = await chrome.debugger.getTargets();
      return targets.find((t) => t.id === targetId)?.url ?? null;
    } catch (_error) {
      return null;
    }
  }
});

const transport = createTransport({
  dispatch: journal.boc(createDispatcher({ handlers })),
  max_envelope_bytes: MAX_ENVELOPE_BYTES,
  /* TÊN GÓI KHAI Ở ĐÂY, không ở trong transport. `scripts/transport` được chép nguyên văn
   * giữa các gói, nên một tên gói gõ cứng trong đó sẽ theo bản chép sang gói khác và khiến
   * gói đó tự khai sai tên mình trên dây. Đây là lớp nối dây — chỗ của hiểu biết riêng. */
  worker_id: "udin-optic"
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

/* ---- PHANH KHẨN — phím tắt, dùng được cả khi bảng bên đã đóng --------------
 * Mục 9 trong mười năng lực còn thiếu của `docs/studies/SCOUTER-CAPABILITY-INVENTORY-V1.md`.
 * Ở đó nó là một điều nên có. Từ 07/09 nó là **nghĩa vụ**: Đức mở `<all_urls>` (ADR-0003),
 * nên Scouter chạm được mọi trang — mà cái phanh DUY NHẤT lại là một công tắc nằm trong
 * bảng bên. Bảng đóng thì không có đường nào tắt nó.
 *
 * `Ctrl+Shift+X` gọi thẳng `setWriteGate(false)` — cùng một hàm mà bảng bên gọi, cố ý: hai
 * bản của một luật thì sớm muộn trả hai câu khác nhau (ADR-0006 đã ghi cái giá).
 *
 * KHÔNG cần khai quyền nào: khoá `commands` trong manifest là đủ. Và phím tắt chỉ TẮT chứ
 * không bật được — một cái phanh mà bấm nhầm thành ga thì không phải phanh.
 */
chrome.commands.onCommand.addListener((lenh) => {
  if (lenh !== "dung-khan") return;
  setWriteGate(chrome, false)
    .then(() => console.warn("PHANH KHẨN: đã TẮT cong tac duong ghi cua Udin Optic."))
    .catch((error) => console.error("PHANH KHẨN HỎNG — công tắc CÓ THỂ VẪN ĐANG BẬT:", error));
});

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
const RECONNECT_ALARM = "udin-optic.reconnect.v1";

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

/* ---- Đức vừa đặt tên cho ghế thì CẮT DÂY để nối lại (12/09) --------------
 * Nhãn chỉ đi qua dây đúng một lần: trong khung `auth` của lượt bắt tay. Nên gõ tên xong mà
 * không cắt dây thì máy chủ vẫn thấy cái tên CŨ cho tới khi có thứ gì khác tình cờ làm đứt
 * kết nối — và "thứ gì đó tình cờ" có thể là vài giờ sau. Nhìn ra ngoài giống hệt "đổi tên
 * không ăn".
 *
 * Dùng lại đúng khuôn của khối ghép cặp ngay trên, và cố ý: hai khoá lưu, một cách xử.
 * `disconnect()` rồi `connect()` là đường đi bình thường của transport chứ không phải lối
 * tắt — không chốt nào bị nới, lượt nối mới vẫn bắt tay hai chiều đủ bước.
 *
 * KHÔNG đụng tới `INSTANCE_STORAGE_KEY`: cái đó máy sinh một lần rồi ở yên, và nó đổi thì
 * chính là lúc KHÔNG được coi như một lượt đổi tên. */
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[transport.INSTANCE_LABEL_STORAGE_KEY]) return;
  transport.disconnect();
  connectQuietly();
});

connectQuietly();

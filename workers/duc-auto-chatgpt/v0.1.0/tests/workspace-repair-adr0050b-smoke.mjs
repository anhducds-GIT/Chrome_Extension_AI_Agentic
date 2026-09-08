/**
 * Ghim ADR-0050 ⒝ — CÁCH tự chữa, không phải "có tự chữa không".
 *
 * `post-submit-no-resend-smoke.mjs` đã ghim CỬA: khi nào được chữa, nắp mấy lần, và
 * chữa xong thì vòng chạy đi tiếp thay vì dừng. File này ghim VIỆC: máy được phép đụng
 * vào trình duyệt của Đức đến đâu, và đụng vào cái gì.
 *
 * Đây là bản vá đầu tiên trong gói cho phép máy TỰ tác động lên tab của Đức giữa một
 * run — trước nay F5 và điều hướng đều do tay Đức. ADR-0050 ghi thẳng cái mất: *"Đức rời
 * máy mười phút rồi quay lại có thể thấy tab đã khác."* Nên ranh giới phải được ghim, chứ
 * không chỉ được viết trong chú giải:
 *
 *   • ĐÚNG MỘT trong hai việc — F5 tab, hoặc đưa tab về hội thoại của chính run này.
 *   • KHÔNG mở tab mới. Tab đã đóng thì chịu, báo lại và dừng.
 *   • KHÔNG tự chọn hội thoại. Run chưa gắn vào hội thoại nào thì KHÔNG ĐỤNG GÌ CẢ —
 *     đoán lấy một hội thoại là gõ prompt của job này vào luồng của người khác rồi đọc
 *     ảnh của luồng đó về làm kết quả, đúng cái `bindRunTab()` sinh ra để chặn.
 *   • Trang câm sau khi chữa là **báo lại**, không phải ném — người gọi cần biết tab ĐÃ
 *     bị đụng, y như `chat.reload` phải nói ra dù không sẵn sàng.
 *
 * Không grep chữ: file này CẮT `repairWorkspaceSurface()` cùng `waitTabComposer()` đã
 * ship rồi CHẠY chúng trong `node:vm` với một `chrome.tabs` giả có ĐẾM. Một bản còn
 * nguyên chữ mà gọi `chrome.tabs.create` vẫn phải làm test đỏ.
 *
 * Mỏ neo được ĐẾM. Ra 0 là công cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "sidepanel.js"), "utf8").split("\r\n").join("\n");
const END = "\n  }\n";

function cut(startAnchor, mustContain) {
  const hits = source.split(startAnchor).length - 1;
  assert.equal(hits, 1, `cắt được ĐÚNG một ${startAnchor.trim()} — thấy ${hits}, 0 nghĩa là mỏ neo hỏng`);
  const from = source.indexOf(startAnchor) + 1;
  const to = source.indexOf(END, from);
  assert.ok(to > from, `không tìm thấy chỗ đóng của ${startAnchor.trim()}`);
  const body = source.slice(from, to + END.length);
  assert.ok(body.includes(mustContain), `cắt nhầm khối: ${startAnchor.trim()} phải chứa ${mustContain}`);
  return body;
}

const repairFn = cut("\n  async function repairWorkspaceSurface() {\n", "chrome.tabs.reload");
const waitFn = cut("\n  async function waitTabComposer(tabId, startedAt = Date.now()) {\n", "DAC_PING");
const conversationFn = cut("\n  function conversationIdOf(url) {\n", "pathname");

const constants = source.match(/^ {2}const CHAT_RELOAD_(?:READY_TIMEOUT_MS|POLL_MS) = .*$/gm) || [];
assert.equal(constants.length, 2, "mỏ neo hỏng: phải lấy được đúng 2 hằng thời gian của vòng chờ");
const urlGuard = (source.match(/^ {2}const isChatGPTTabUrl = .*$/m) || [])[0];
assert.ok(urlGuard, "mỏ neo hỏng: không thấy phép kiểm địa chỉ ChatGPT");

/**
 * Sân khấu: một `chrome.tabs` giả có ĐẾM, và một đồng hồ giả để vòng chờ 20 giây không
 * tiêu 20 giây thật. `sleep` đẩy đồng hồ, nên vòng chờ kết thúc đúng theo số vòng chứ
 * không theo thời gian tường.
 */
function sanKhau({ tab, boundTabId = 7, boundTabUrl = "", boundConversationId = null, pingAnswers = true, composerAfter = 1 }) {
  let clock = 1_000_000;
  const did = { reload: 0, update: 0, create: 0, ping: 0, updatedTo: null };
  const sandbox = {
    state: { boundTabId, boundTabUrl, boundConversationId },
    Math,
    Boolean,
    URL,
    Date: { now: () => clock },
    sleep: async (ms) => { clock += ms; },
    chrome: {
      tabs: {
        get: async (id) => { if (!tab) throw new Error("No tab with id " + id); return tab; },
        reload: async () => { did.reload += 1; },
        update: async (_id, values) => { did.update += 1; did.updatedTo = values.url; },
        create: async () => { did.create += 1; },
        sendMessage: async () => {
          did.ping += 1;
          if (!pingAnswers) throw new Error("Receiving end does not exist.");
          // Trang TRẢ LỜI không bằng trang DÙNG ĐƯỢC: ngay sau một lượt tải, content
          // script sống lại trước khi ô soạn được dựng. `composerAfter` là số vòng hỏi
          // trước khi ô soạn xuất hiện.
          return { composerFound: did.ping >= composerAfter };
        }
      }
    }
  };
  vm.createContext(sandbox);
  vm.runInContext(
    `${constants.join("\n")}\n${urlGuard}\nvar conversationIdOf, waitTabComposer, repairWorkspaceSurface;` +
    `${conversationFn}${waitFn}${repairFn}`,
    sandbox
  );
  return { sandbox, did };
}

const BOUND = "https://chatgpt.com/c/abc-123";
const KHAC = "https://chatgpt.com/c/khac-999";
const PHONG = "https://chatgpt.com/";

/* ⑴ Chưa gắn tab nào → không chữa, và không đụng gì. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: BOUND }, boundTabId: null });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "run chưa gắn tab thì không có gì để chữa");
  assert.deepEqual([did.reload, did.update, did.create], [0, 0, 0], "và tuyệt đối không đụng vào tab nào");
}

/* ⑵ Tab đã đóng → báo lại, KHÔNG mở tab mới. Mở tab mới là một hạng hành động khác:
   nó dựng thêm cửa sổ trên máy Đức, và nó lại phải đoán mở vào đâu. */
{
  const { sandbox, did } = sanKhau({ tab: null, boundConversationId: "abc-123", boundTabUrl: BOUND });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "tab đã đóng thì không chữa được");
  assert.equal(did.create, 0, "và không được tự mở tab mới để thay");
  assert.match(ket.note, /đã đóng/, "câu báo phải nói rõ vì sao, để Đức biết cần mở lại tab");
}

/* ⑶ Tab vẫn đúng hội thoại nhưng receiver câm → F5, KHÔNG điều hướng. Điều hướng lại
   chính địa chỉ đang mở là một lượt tải thừa và nó xoá mất lịch sử cuộn của Đức. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: BOUND }, boundConversationId: "abc-123", boundTabUrl: BOUND });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, true, "trang trả lời lại thì đây là một lượt chữa thành công");
  assert.equal(did.reload, 1, "đúng chỗ rồi mà receiver câm thì cách chữa là F5");
  assert.equal(did.update, 0, "không điều hướng khi đã ở đúng hội thoại");
  assert.ok(did.ping > 0, "và phải CHỜ trang trả lời lại — báo xong ngay là một lời nói dối làm vòng chạy gửi quá sớm");
}

/* ⑷ Tab trôi sang hội thoại khác → đưa VỀ hội thoại của run, và về ĐÚNG địa chỉ run đã
   gắn. Đây là mép chống một bản "chữa" mà thật ra chỉ F5 luồng của người khác rồi gõ
   prompt của job này vào đó. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: KHAC }, boundConversationId: "abc-123", boundTabUrl: BOUND });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, true);
  assert.equal(did.update, 1, "trôi đi thì cách chữa là đưa về");
  assert.equal(did.updatedTo, BOUND, "và về ĐÚNG hội thoại run này đã gắn, không phải một hội thoại nào khác");
  assert.equal(did.reload, 0, "không F5 một hội thoại lạ");
}

/* ⑸ Mép quan trọng nhất: run chưa gắn vào hội thoại nào (ca thường gặp của
   WRONG_SURFACE — run bắt đầu ngay trên trang phóng). KHÔNG có đích để về, nên KHÔNG
   ĐỤNG GÌ. Một bản "chữa" chọn đại hội thoại gần nhất sẽ làm mép này đỏ. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: PHONG }, boundConversationId: null, boundTabUrl: PHONG });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "không biết về đâu thì phải dừng hẳn như trước ADR-0050");
  assert.deepEqual([did.reload, did.update, did.create], [0, 0, 0], "và không được đoán lấy một hội thoại — đó là cái bindRunTab() sinh ra để chặn");
  assert.match(ket.note, /hội thoại/, "câu báo phải chỉ Đức mở sẵn một hội thoại rồi chạy lại");
}

/* ⑹ Địa chỉ đã gắn không phải hội thoại đã gắn (trạng thái lệch) → cũng không đoán. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: KHAC }, boundConversationId: "abc-123", boundTabUrl: PHONG });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "địa chỉ đã gắn không trỏ về đúng hội thoại đã gắn thì nó không phải một đích tin được");
  assert.equal(did.update, 0, "và không được điều hướng tới một địa chỉ không khớp");
}

/* ⑺ Chữa rồi mà trang vẫn câm → BÁO LẠI, không ném. Người gọi cần biết tab ĐÃ bị đụng
   dù chưa dùng được; ném ra thì lượt chữa đó biến mất khỏi sổ và nắp không đếm đúng. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: BOUND }, boundConversationId: "abc-123", boundTabUrl: BOUND, pingAnswers: false });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "trang không trả lời thì lượt chữa này thất bại");
  assert.equal(did.reload, 1, "nhưng nó ĐÃ F5 thật, và điều đó phải được báo ra");
  assert.match(ket.note, /giây/, "câu báo phải nói đã chờ bao lâu");
  assert.ok(did.ping >= 2, `phải hỏi lại nhiều vòng chứ không bỏ cuộc sau một lần — đếm được ${did.ping}`);
}

/* ⑻ Trang TRẢ LỜI không bằng trang DÙNG ĐƯỢC. Ngay sau một lượt tải, content script
   sống lại trước khi ô soạn được dựng — báo sẵn sàng ở vòng hỏi đầu tiên là đẩy vòng
   chạy đi gõ prompt vào một trang chưa có chỗ để gõ. Mép này chống đúng một đột biến
   một dòng: bỏ điều kiện `composerFound` và thoát vòng chờ ngay khi trang ừ hử. Mọi mép
   khác của file này vẫn xanh với bản đó, vì ở chúng ô soạn có sẵn từ vòng đầu. */
{
  const { sandbox, did } = sanKhau({ tab: { id: 7, url: BOUND }, boundConversationId: "abc-123", boundTabUrl: BOUND, composerAfter: 4 });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, true, "ô soạn hiện muộn thì vẫn là chữa được — chỉ là phải chờ");
  assert.equal(did.ping, 4, `phải chờ tới khi ô soạn có mặt, không dừng ở lời ừ hử đầu tiên — đếm được ${did.ping} vòng hỏi`);
}
{
  const { sandbox } = sanKhau({ tab: { id: 7, url: BOUND }, boundConversationId: "abc-123", boundTabUrl: BOUND, composerAfter: Infinity });
  const ket = await sandbox.repairWorkspaceSurface();
  assert.equal(ket.ok, false, "trang trả lời đều đặn mà ô soạn không bao giờ hiện thì đó KHÔNG phải chữa xong");
}

/* ⑼ Vòng chờ có TRẦN thật. Thiếu mép này thì một vòng chờ vô hạn cũng làm ⑺ "xanh" —
   nó chỉ không bao giờ trả về. */
{
  const { sandbox } = sanKhau({ tab: { id: 7, url: BOUND }, boundConversationId: "abc-123", boundTabUrl: BOUND, pingAnswers: false });
  const waited = await sandbox.waitTabComposer(7, sandbox.Date.now());
  assert.equal(waited.ready, false);
  assert.ok(waited.waitedMs > 0 && waited.waitedMs <= 21000, `vòng chờ phải dừng trong khoảng trần đã khai — đo được ${waited.waitedMs}ms`);
}

console.log("ADR-0050⒝ tự chữa phiên làm việc, chạy thật (10 mép): PASS");

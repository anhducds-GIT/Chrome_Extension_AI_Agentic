/* Khoá tab + khoá hội thoại cho một run (G-02).
 *
 * Vì sao có file này: trước đây `activeTab()` của side panel gọi
 * `chrome.tabs.query({active:true, currentWindow:true})` MỖI LẦN gửi message,
 * nên đổi tab giữa chừng là runner âm thầm gõ prompt của job sang tab khác, và
 * đọc ảnh của hội thoại khác về làm output của job này. Cùng lỗi đó bên nhánh
 * ChatGPT là B-01, đã vá 26/08.
 *
 * Vì sao là một core RIÊNG chứ không nhét thẳng vào sidepanel.js: sidepanel.js
 * không nạp nổi vào Node (cần cả `chrome.*` lẫn DOM của side panel), nên logic
 * nằm trong đó chỉ ghim được bằng test tĩnh. Ba ca thật của việc này — đổi tab
 * · đổi hội thoại · tab biến mất — là ca HÀNH VI, phải chạy được mới ghim được.
 * Ở đây chúng chạy được: side panel bơm vào `getTab`/`pickActiveTab`, test bơm
 * vào bản giả.
 *
 * KHÔNG chép nguyên xi bản ChatGPT. Ba chỗ Gemini khác (xem HANDOFF 2026-09-04):
 *   1. Hội thoại của Gemini nằm ở `/app/<id>`, không phải `/c/<id>`, và có thể
 *      mang tiền tố tài khoản `/u/<n>`.
 *   2. Gemini có HAI mặt hợp lệ (`/images` và `/app`), và gửi từ `/images` sẽ
 *      ĐIỀU HƯỚNG tab sang `/app/<id>` — bằng chứng DOM snapshot 3, đã ghi
 *      trong `provider-adapter.js`. Nên phép kiểm địa chỉ ở đây dùng thẳng
 *      `isProviderUrl` (mặt + origin) thay vì chỉ kiểm origin như bản ChatGPT:
 *      tab trôi sang `gemini.google.com/settings` vẫn phải là mất receiver.
 *   3. Thông điệp lỗi KHÔNG nhúng nguyên địa chỉ lạ, chỉ nhúng origin.
 *      `runner-core.classifyFailure()` phân loại lỗi bằng cách dò chữ trong
 *      thông điệp, nên một địa chỉ lạ chứa chữ "timeout" hay "captcha" sẽ lái
 *      lỗi này sang nhãn khác. Bản ChatGPT nhúng 80 ký tự đầu của địa chỉ.
 *
 * Tiền tố `RECEIVER_LOST:` là CỐ Ý và phải giữ: `classifyFailure()` dò
 * `/receiver/i` để quy về `RECEIVER_LOST`, và `RECEIVER_LOST` nằm trong
 * `HARD_STOP_FAILURE_TYPES` — mất tab hay trôi hội thoại thì DỪNG CỨNG, không
 * thử lại, vì thử lại nghĩa là đoán xem nên gõ vào đâu.
 */
(function () {
  "use strict";

  // Id hội thoại Gemini, hoặc null khi tab đang ở mặt chưa có hội thoại
  // (`/images`, hoặc `/app` trần).
  function conversationIdOf(url) {
    try {
      const path = new URL(url).pathname.replace(/^\/u\/\d+/, "");
      return (path.match(/^\/app\/([^/?#]+)/) || [])[1] || null;
    } catch (_) {
      return null;
    }
  }

  function originOf(url) {
    try { return new URL(url).origin; }
    catch (_) { return "một địa chỉ không đọc được"; }
  }

  function receiverLost(message) {
    const error = new Error(`RECEIVER_LOST: ${message}`);
    error.code = "RECEIVER_LOST";
    return error;
  }

  // Giải ra tab mà run này đã khoá. Chưa khoá thì trả về tab đang hoạt động
  // (đường cũ, dùng cho Check Plan / ping lúc chưa chạy).
  //
  // Trả về `{ tab, adoptConversationId }`. `adoptConversationId` khác null
  // nghĩa là: run này chưa biết hội thoại nào, và tab vừa đáp xuống một hội
  // thoại — người gọi ghi lại id đó vào state. Sau đó id là cố định.
  async function resolveBoundTab(options) {
    const { boundTabId, boundConversationId, getTab, pickActiveTab, isProviderUrl } = options;
    if (boundTabId === null || boundTabId === undefined) {
      return { tab: await pickActiveTab(), adoptConversationId: null };
    }
    let tab = null;
    try { tab = await getTab(boundTabId); }
    catch (_) { tab = null; }
    if (!tab || !tab.id) {
      throw receiverLost(`Tab Gemini mà run này bắt đầu (id ${boundTabId}) không còn nữa. Mở lại hội thoại rồi chạy một run mới.`);
    }
    // Giữa lúc trang đang chuyển, Chrome trả `url` rỗng và để đích ở
    // `pendingUrl` — có lúc chưa có cái nào. Phán xét địa chỉ trên chuỗi rỗng
    // là dừng cứng đúng lúc trang điều hướng, mà đó chính là lúc gửi prompt
    // đầu tiên (gửi từ `/images` → nhảy sang `/app/<id>`). Chưa biết địa chỉ
    // thì hoãn phán xét, để ping của content script quyết.
    const url = tab.url || tab.pendingUrl || "";
    if (!url) return { tab, adoptConversationId: null };
    if (!isProviderUrl(url)) {
      throw receiverLost(`Tab Gemini mà run này bắt đầu (id ${boundTabId}) đã rời khỏi trang Gemini dùng được, nay ở ${originOf(url)}. Không gửi gì sang đó.`);
    }
    // Cùng một tab KHÔNG có nghĩa là cùng một hội thoại. Chưa đặt id thì nhận
    // hội thoại do chính run này tạo ra; đặt rồi mà đổi — do người bấm, do
    // link ở thanh bên, hay do nút Back — là gõ prompt của job này vào cuộc
    // chat của người khác rồi đọc ảnh của cuộc đó về làm output. Đúng cái lỗi
    // của tab không khoá, thấp hơn một tầng.
    const current = conversationIdOf(url);
    if (boundConversationId === null || boundConversationId === undefined) {
      return { tab, adoptConversationId: current };
    }
    if (current !== boundConversationId) {
      throw receiverLost(`Tab Gemini mà run này bắt đầu (id ${boundTabId}) đã chuyển sang hội thoại khác (trước là '${boundConversationId}', nay là '${current || "trang chưa có hội thoại"}'). Không gửi gì sang đó.`);
    }
    return { tab, adoptConversationId: null };
  }

  const api = { conversationIdOf, resolveBoundTab };
  (typeof window !== "undefined" ? window : globalThis).DacTabLockCore = Object.freeze(api);
})();

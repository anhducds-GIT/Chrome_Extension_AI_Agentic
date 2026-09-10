/* Provider adapter -- the single place that knows which AI chat product this
   worker drives. Every provider-specific DOM selector, blocker pattern,
   timing constant and origin rule lives here; content.js consumes this
   surface and stays provider-neutral.

   This file ships the CHATGPT adapter (chatgpt.com). Structure deliberately
   mirrors workers/duc-auto-gemini/v0.2.0/provider-adapter.js so the two
   workers converge instead of drifting -- see decisions.md 2026-08-26.

   PROVENANCE WARNING, read before trusting anything below. Unlike the Gemini
   adapter -- where every selector is backed by owner-captured live-DOM
   snapshots -- this file is at first only a faithful EXTRACTION of the
   selectors content.js already used. They are inherited, not verified. The
   2026-08-26 trial found zero `[data-message-author-role="assistant"]`
   elements on a live page across six attempts, so at least one of these may
   already be wrong. Use diagnostics.dom_probe against the real tab and
   replace guesses with evidence; mark each group below as it is confirmed. */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // VERIFIED 2026-08-26 by diagnostics.dom_probe on a live conversation,
    // and functionally by a real submission in trial-09c93cd4: the probe
    // measured "#prompt-textarea => 1" (first entry matches, so the rest are
    // untried fallbacks) and the trial's prompt reached ChatGPT.
    // Prompt composer, in preference order.
    composer: Object.freeze([
      "#prompt-textarea",
      'textarea[data-testid="prompt-textarea"]',
      'div[data-testid="composer-text-input"][contenteditable="true"]',
      'form div.ProseMirror[contenteditable="true"]',
      'form [contenteditable="true"][role="textbox"]',
      "form textarea",
    ]),
    // FUNCTIONALLY VERIFIED 2026-08-26, but NOT snapshot-verified, and the
    // difference matters. Every entry here measures 0 on a probe -- both while
    // idle AND mid-generation -- because ChatGPT only renders a send button
    // while the composer holds text, and swaps it for the stop button the
    // moment generation starts. A read-only probe cannot type, so it can never
    // catch that window. What DOES prove these selectors: trial-09c93cd4
    // submitted successfully, which requires findSendButton() to have returned
    // a real enabled button. Treat a future submission failure, not a probe
    // count of 0, as the signal that this group has rotted.
    // Send button, searched page-wide first.
    send: Object.freeze([
      'button[data-testid="send-button"]',
      'button[aria-label="Send prompt"]',
      'button[aria-label^="Send"]',
      'button[aria-label^="Gửi"]',
    ]),
    // Same status as `send` above: never observable in a probe snapshot, and
    // in trial-09c93cd4 it was not needed because `send` resolved first.
    // Send fallback, scoped to the composer's form.
    sendInForm: Object.freeze([
      'button[type="submit"]',
      'button[data-testid*="send"]',
    ]),
    // VERIFIED 2026-08-26 by probing DURING generation (trial-09c93cd4), the
    // only state in which this button exists at all:
    //     button[data-testid="stop-button"] => 1
    //     button[aria-label^="Stop"]        => 1
    //     button[aria-label="Stop generating"] => 0   (exact label has changed)
    // The first entry matches, so the exact-label entry below is dead weight
    // rather than a live dependency -- kept only as a fallback.
    // Stop button, present only during generation.
    stop: Object.freeze([
      'button[data-testid="stop-button"]',
      'button[aria-label="Stop generating"]',
      'button[aria-label^="Stop"]',
      'button[aria-label^="Dừng"]',
    ]),
    // VERIFIED 2026-08-26 by diagnostics.dom_probe against a live conversation
    // (chatgpt.com/c/6a8e47cd...). CRITICAL: attribution, the submission
    // boundary and the security scan all depend on these two.
    //
    // The probe measured, on one real page:
    //     data-turn                 => assistant x5, user x4
    //     data-message-author-role  => user x4        (assistant: ZERO)
    // ChatGPT moved the turn marker to data-turn and dropped the old
    // attribute from the ASSISTANT turn only, which is why detection went
    // blind for exactly one half of the conversation while looking healthy.
    //
    // Ordered lists, newest first. content.js resolves each to the FIRST
    // entry that actually matches something on the page and uses only that
    // one -- matching both at once would count a turn twice if a future
    // markup carries both markers on nested nodes, and attribution reads two
    // matches as two separate turns.
    assistantMessage: Object.freeze([
      '[data-turn="assistant"]',
      '[data-message-author-role="assistant"]',
    ]),
    userMessage: Object.freeze([
      '[data-turn="user"]',
      '[data-message-author-role="user"]',
    ]),
    // Fallback root for a page that has no turns yet. content.js normally
    // computes the root as the common ancestor of the turns themselves, which
    // depends on no name at all.
    //
    // The wildcard `[data-testid*="conversation"]` was REMOVED here on
    // 2026-08-26: ChatGPT names each turn container with a data-testid that
    // contains the word "conversation", so `.closest()` from a turn matched
    // THAT TURN and the scan root collapsed to a single turn -- the probe
    // measured 3 visible images instead of 14. A wildcard over a name the
    // provider also uses per-item is not a container selector.
    //
    // CONFIRMED FIXED 2026-08-26 on the same conversation, after the reload
    // that finally loaded f418bc1: imageCandidateCount went 3 -> 15 against a
    // page holding 15 conversation images (5 distinct generated images), and
    // this fallback list now matches 1 node instead of 12. The scan root
    // covers the whole conversation again, so the pre-submit baseline is built
    // from every image already on screen -- which is what stops an old image
    // being attributed to a running job.
    conversationRoot: '[data-testid="conversation-turns"], main, [role="main"]',
    // UNVERIFIED (inherited). Containers that mark an image as INPUT rather
    // than output; a false negative here can attribute a reference image to a
    // job as if the model had produced it.
    attachmentContainer: 'form, [data-testid*="attachment"], [data-testid*="upload-preview"], [data-testid*="file-upload"]',
    // B-14 · ĐO LIVE 2026-08-26 (Pilot-14, 976 lần dò DOM, `evidence/watch-run-20260826-1411.jsonl`):
    // nhóm này TRÔNG như năm lớp bảo vệ, thật ra chỉ có MỘT lớp còn sống.
    //   ✔ `button[aria-label*="Remove file"]` — khớp `=> 2` ở job 2 ảnh và `=> 4` ở job 4 ảnh.
    //     Số khớp ĐÚNG BẰNG số ảnh, nên là tín hiệu thật, không phải khớp bừa.
    //   ✘ bốn mục `data-testid` + `Remove attachment` — **CHƯA TỪNG KHỚP MỘT LẦN NÀO** trên
    //     trang thật, qua cả 976 lượt dò. Là di sản kế thừa, KHÔNG phải bằng chứng.
    // Giữ bốn mục chết làm dự phòng thì vô hại, nhưng đừng đọc chúng thành lớp bảo vệ: nếu
    // ChatGPT đổi nhãn, hoặc Đức đổi ngôn ngữ giao diện, thì nhóm này MÙ HẲN — mục duy nhất
    // còn sống neo vào `aria-label` **tiếng Anh**. Đã có tiền lệ y hệt trong repo này:
    // `button[aria-label="Stop generating"]` từng chết và phải đổi sang `data-testid`.
    // ĐÃ ĐO 2026-09-09 bằng `composerScope` của `dom_probe` (B-48), GIỮA LÚC gắn ảnh, job chữ
    // 2 ảnh, 0 credit. Chip đính kèm có hình dạng này — và nó CÓ mỏ neo cấu trúc:
    //
    //   div[role="group" aria-label="<TÊN FILE>"]      ← khung của MỘT chip
    //     ├ div > div[data-default-action="true"] > div > button[aria-label="Open image: …"]
    //     └ div > div > span[data-state="closed"] > button[aria-label="Remove file N: <TÊN FILE>"]
    //
    // Hai điều đáng giá nhất, và cả hai KHÔNG phụ thuộc ngôn ngữ giao diện:
    //   ⑴ `div[role="group"]` là khung chip, và `aria-label` của nó là **CHÍNH TÊN FILE** ta
    //      vừa nạp. Nên đếm được theo TÊN, không chỉ theo SỐ LƯỢNG — mạnh hơn hẳn.
    //   ⑵ `div[data-default-action="true"]`: đo nền (chưa gắn ảnh) thì trong ô soạn thảo
    //      KHÔNG có thuộc tính này; gắn ảnh thì nó xuất hiện. Nó bám vào chip.
    //
    // VÌ SAO KHÔNG NHÉT HAI MỤC ĐÓ VÀO `attachmentPreview` — và đây là chỗ dễ sai nhất:
    // `attachmentPreviewCount()` được SO với SỐ FILE (`>= previousPreviewCount + N`). Ba
    // selector khớp BA PHẦN TỬ KHÁC NHAU trên cùng một chip, nên thêm vào là mỗi chip đếm
    // thành 3. Một job 2 ảnh mà mới gắn xong 1 chip đã cho count = 3 >= 2 → cổng mở SỚM và
    // runner gõ Gửi khi **còn thiếu một ảnh**. Nên chúng nằm ở nhóm RIÊNG dưới đây, chỉ để
    // `dom_probe` đếm và canh, KHÔNG chỗ nào trong runner đọc. Đổi phép đếm là đổi cổng
    // trước-khi-gửi → việc của Đức (`AGENTS.md` 2.4), đã gộp vào `B-49` thành MỘT lượt.
    //
    // Giảm nhẹ (vẫn đúng): lớp chặn "ảnh tham chiếu bị nhận nhầm thành ảnh sinh" KHÔNG chỉ
    // dựa vào nhóm này — `content.js:237` còn hai tín hiệu độc lập (`role === "user"`, khớp
    // theo tên file), và `attachmentContainer` dùng `form` trần nên miễn nhiễm với đổi nhãn.
    attachmentPreview: Object.freeze([
      '[data-testid*="attachment"]',        // CHƯA TỪNG KHỚP (đo 26/08 976 lượt · 09/09 lại 0)
      '[data-testid*="file-upload"]',       // CHƯA TỪNG KHỚP
      '[data-testid*="upload-preview"]',    // CHƯA TỪNG KHỚP
      'button[aria-label*="Remove attachment"]', // CHƯA TỪNG KHỚP
      'button[aria-label*="Remove file"]',  // ✔ mục DUY NHẤT còn sống — nhãn tiếng Anh
    ]),
    // B-14 ⑵ · MỎ NEO CẤU TRÚC, đo live 09/09. **ĐÃ NỐI VÀO CỔNG TRƯỚC-KHI-GỬI 10/09** (`B-49`,
    // Đức chốt): `waitForReferenceImagesReady` đọc `aria-label` của nhóm này và đối chiếu với
    // TÊN FILE, thay cho phép đếm cũ. Nhóm này vì vậy KHÔNG còn là mỏ neo dự phòng — nó là
    // đường sống. `dom_probe` vẫn đếm nó mỗi lượt, và nay con số đó là cảnh báo sớm THẬT: nó
    // rơi về 0 nghĩa là mọi lượt gắn ảnh sắp chết, chứ không chỉ là một selector mốc.
    attachmentChip: Object.freeze([
      'form div[role="group"][aria-label]',      // ✔ MỚI 09/09 — khung chip, aria-label = TÊN FILE
      'form div[data-default-action="true"]',    // ✔ MỚI 09/09 — 0 khi chưa gắn, có khi đã gắn
    ]),
    // B-15 · ĐO LIVE 2026-08-26: cả BA mục **chưa từng khớp lần nào** qua 52 lượt dò có ảnh
    // đính kèm đang hiện trên trang. Chưa phân biệt được "selector chết" với "ChatGPT không
    // có dấu hiệu upload-đang-chạy" — hai khả năng đó xử lý khác nhau, nên **đừng viết code
    // dựa vào nhóm này** cho tới khi phân biệt được. Hiện nó là NIỀM TIN, không phải bằng
    // chứng.
    //
    // ĐÃ PHÂN BIỆT 2026-09-09, và câu trả lời KHÁC CẢ HAI khả năng trên: nhóm này không chết,
    // nó **đo sai thứ nó khai**. Phép đo: 4 ảnh, tổng **1,83MB** (đúng bậc "2MB" mục này đòi),
    // cửa sổ gắn đo được **3,82 giây**, dò ~7 lần/giây → ~**27** lượt dò TRONG cửa sổ đó, và
    // cả ba mục **0/0/0 mọi lượt**. Nhưng ở lượt job ảnh cùng buổi, lúc **ĐANG SINH ẢNH**, thì
    // `[aria-busy="true"]` **KHỚP** (`upload=[0/1/0]`, `attachmentPending=true`, stop hiện).
    // Nên nhóm này đo *"trang đang bận"*, không phải *"ảnh đang upload"*.
    //
    // HỆ QUẢ ĐÃ GỠ 10/09 (`B-49`, Đức chốt): `waitForReferenceImagesReady` **không còn** đọc
    // nhóm này. Trước đó nó có `&& !uploadIsPending()`, nên gắn ảnh trong lúc trang đang sinh
    // dở một lượt khác thì cổng chặn 15 giây rồi ném *"Required reference images did not all
    // become ready"* — một lỗi **nói sai nguyên nhân**: ảnh đã sẵn, thứ chưa xong là lượt sinh
    // của người khác.
    //
    // NHÓM NÀY KHÔNG SAI, NÓ CHỈ BỊ HỎI SAI CÂU. Nó vẫn được `DacChatReadiness` đọc, ở đó câu
    // hỏi đúng là *"trang có đang bận không"* — và cho câu ấy thì `[aria-busy="true"]` trả lời
    // đúng. Đừng xoá nó vì thấy nó bị gỡ khỏi một chỗ.
    uploadPending: Object.freeze([
      '[data-testid*="uploading"]',  // CHƯA TỪNG KHỚP (26/08 52 lượt · 09/09 ~27 lượt trong cửa sổ 3,82s)
      '[aria-busy="true"]',          // ✔ KHỚP 09/09 — nhưng lúc ĐANG SINH, không phải lúc upload
      '[role="progressbar"]',        // CHƯA TỪNG KHỚP
    ]),
    fileInput: 'form input[type="file"]',
    // Controls the A/B image poll may expose. The poll's TEXT anchors stay in
    // ab-poll-core.js with the answering policy.
    pollControl: 'button, [role="button"], a[href], [tabindex]:not([tabindex="-1"])',
  });

  const TIMING = Object.freeze({
    postTypeSettleMs: 150, // after the prompt is inserted, before Send readiness is polled
    postSendSettleMs: 500, // after Send is clicked, before completion polling starts
    completionPollMs: 300, // poll interval for completion and chat-readiness loops
    stableTextDwellMs: 1500, // text response must hold unchanged this long to count as complete
    imageSettleMs: 1500, // a multi-image set must hold unchanged this long to be complete
    referenceReadyTimeoutMs: 15000, // reference-image attach must settle within this window
    sendReadyTimeoutMs: 5000, // Send button must become enabled within this window
  });

  const SURFACE = Object.freeze({ CONVERSATION: "CONVERSATION", LAUNCHER: "LAUNCHER", WRONG: "WRONG" });

  const ORIGIN = Object.freeze({
    hosts: Object.freeze(["chatgpt.com", "chat.openai.com"]),
    urlPattern: /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i,
  });

  function isProviderUrl(url) {
    return Boolean(url && ORIGIN.urlPattern.test(url));
  }

  // Surface rule. CORRECTED 2026-09-02 after a live loss.
  //
  // The previous version returned CONVERSATION for EVERY chatgpt.com URL. Its
  // comment reasoned "ChatGPT has no images-vs-app split the way Gemini does:
  // every normal conversation URL is the same surface" -- true of conversations,
  // but it forgot that the HOME PAGE is not a conversation. Submitting from
  // https://chatgpt.com/ makes the tab NAVIGATE to /c/<id>, and the run dies
  // after the navigation with an opaque OUTPUT_DETECTION_TIMEOUT. One generation
  // spent, nothing detected. This is the same failure Gemini already solved in
  // v0.1.0 (its own note: "submitting from /images NAVIGATES the tab to
  // /app/<conversation-id>"), so this branch was the odd one out.
  //
  // EVIDENCE LEVEL, stated honestly:
  //   [ĐO] /c/<id> is a real conversation — probed live 2026-09-02 on profile
  //        kaito, url https://chatgpt.com/c/6a9803a5-..., assistantCount 2.
  //   [ĐO] / (bare home) is NOT — probed live the same day, assistantCount 0,
  //        and a run started there was lost.
  //   [DÒ] every other chatgpt.com path is treated as a LAUNCHER (blocked).
  //        Not measured. Chosen deliberately: a wrong block costs one clear
  //        message and one click, a wrong allow costs a generation and lands
  //        the operator in a timeout that says nothing. If a real conversation
  //        shape without a /c/ segment turns up, widen this WITH the probe that
  //        proves it -- do not widen it on a hunch.
  const CONVERSATION_PATH = /(^|\/)c\/[^/]+/i;

  function surface(url) {
    if (!isProviderUrl(url)) return SURFACE.WRONG;
    let pathname;
    try { pathname = new URL(url).pathname; }
    catch (_) { return SURFACE.WRONG; }
    return CONVERSATION_PATH.test(pathname) ? SURFACE.CONVERSATION : SURFACE.LAUNCHER;
  }

  function surfaceAllowed(url, _context = {}) {
    return surface(url) === SURFACE.CONVERSATION;
  }

  // ĐỊNH DANH hội thoại mà một địa chỉ trỏ tới, hoặc `null` nếu đó không phải hội thoại.
  //
  // Đây phải là CÙNG MỘT luật với `surface()` ngay trên, và nó nằm ở đây chính vì lý do đó.
  // Trước 09/09 `sidepanel.js` giữ bản sao riêng, neo ở ĐẦU đường dẫn (`/^\/c\/`), nên hai
  // bên trả lời KHÁC NHAU cho cùng một trang: một hội thoại trong Project có địa chỉ dạng
  // `chatgpt.com/g/g-p-<project>/c/<id>` — `surface()` nói CONVERSATION (đúng, và lượt chạy
  // live 09/09 gửi được bình thường ở đó), còn bản sao kia trả `null`.
  //
  // Cái mất không phải là một dòng lệch: `state.boundConversationId` nhận `null`, và cửa
  // *"cùng một tab không có nghĩa là cùng một HỘI THOẠI"* của `activeTab()` **tắt lặng lẽ**.
  // Tức trên mọi hội thoại thuộc Project, lớp chặn giữ cho prompt của job này không rơi vào
  // luồng của người khác đã không hoạt động — mà không gì đỏ lên. Phát hiện 09/09 khi đường
  // tự chữa của ADR-0050 ⒝ cần một đích để quay về và luôn nhận được `null`.
  //
  // Bất biến, được ghim: `conversationId(url) !== null` PHẢI trùng khớp với
  // `surfaceAllowed(url)` trên mọi địa chỉ. Hai câu trả lời cho cùng một câu hỏi thì sớm
  // muộn cũng lệch — lần này mất bảy ngày mới lộ ra.
  const CONVERSATION_ID = /(?:^|\/)c\/([^/?#]+)/i;
  function conversationId(url) {
    if (!isProviderUrl(url)) return null;
    try { return (new URL(url).pathname.match(CONVERSATION_ID) || [])[1] || null; }
    catch (_) { return null; }
  }

  // Page-wide interstitial blockers (CAPTCHA and similar).
  const securityBlockerPattern = /(captcha|unusual activity|verify you are human|suspicious activity)/i;

  // Image-generation quota phrases. Scoped by content.js to the ONE model
  // response under evaluation -- never the whole page, where the operator's
  // own prompt could false-match these common words.
  //
  // NOTE for whoever validates this live: this phrase list is a best-effort
  // starting set, not confirmed against a real rate-limited ChatGPT session --
  // OpenAI's exact wording cannot be verified without actually hitting the
  // limit. If a real limit is hit and the batch does NOT halt, capture the
  // exact text ChatGPT showed and add it here, the same way the CAPTCHA
  // phrase list above was built from real evidence.
  const generationLimitPattern = /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i;

  function matchesGenerationLimit(text) {
    const value = String(text || "");
    return value ? generationLimitPattern.test(value) : false;
  }

  /* B-40 đường ⒝ — Đức chốt 09/09: *"phương án 2. cần đảm bảo flow chạy từ đầu tới cuối cho đến
     hết, trừ khi bị captcha hoặc báo hết credit."*

     CA ĐO ĐƯỢC 08/09: tool tạo ảnh của ChatGPT lỗi hệ thống. Nó trả về một lượt CHỮ nói rõ không
     tạo được ảnh, lỗi từ tool, **và chỉ đúng cách chữa** — *"Hãy nhắn 'render lại' để tôi chạy
     lại từ đầu."* Một người gõ `render lại` thì ra kết quả đúng. Máy thì dừng ở đó vĩnh viễn,
     trong khi toàn bộ thông tin cần thiết nằm sẵn trên dây.

     ═══ VÌ SAO CÂU CHỮA PHẢI NẰM TRONG MÃ CỦA TA, KHÔNG LẤY TỪ TRANG ═══

     Nếu máy đọc câu *"nhắn X"* rồi gõ X, thì **nội dung trang đang quyết định máy gõ gì**. Trang
     là dữ liệu KHÔNG TIN ĐƯỢC: một lượt trả lời bị dựng ác ý — hoặc chỉ cần một câu ChatGPT vô
     tình sinh ra — sẽ khiến máy gõ bất cứ thứ gì vào hội thoại của Đức. Đó là một cửa tiêm lệnh,
     và nó nằm ở đúng chỗ tệ nhất: một cửa VỪA được cấp quyền gõ.

     Nên ranh giới là: **đọc trang để PHÂN LOẠI thì được; đọc trang để quyết định GÕ GÌ thì không
     bao giờ.** Hàm dưới đây trả về một chuỗi lấy từ `REPAIR_PHRASES` — một hằng trong tệp này —
     và tuyệt đối không trả về một mẩu nào cắt ra từ đối số. Phép ghim cưỡng chế đúng vế đó.

     ═══ HAI VẾ PHẢI CÙNG ĐÚNG ═══

       ⑴ chữ của nhà cung cấp KHẲNG ĐỊNH ÂM TÍNH — nó nói nó không tạo ra được gì;
       ⑵ và nó XIN một câu thuộc danh sách trắng.
     Thiếu một vế thì trả `null`, và lớp trên dừng hẳn như trước. Chỉ ⑴ mà không có ⑵ nghĩa là
     nhà cung cấp báo lỗi nhưng không nêu cách chữa — lúc đó không có gì để gõ.

     ═══ NÓI RÕ MỨC BẰNG CHỨNG, đừng để phiên sau tưởng nó chắc hơn thực tế ═══

     Danh sách này dựng từ ĐÚNG MỘT lần quan sát (08/09), và tôi không có nguyên văn đầy đủ của
     lượt đó — chỉ có câu chữa được trích trong `BACKLOG.md`. Nên nó là **bộ khởi đầu**, cùng mức
     bằng chứng với `generationLimitPattern` ở trên. Gặp một lượt lỗi thật mà máy KHÔNG tự chữa
     thì chụp lại nguyên văn ChatGPT hiện ra rồi thêm vào đây — đúng cách danh sách CAPTCHA đã
     được dựng. **Sai theo hướng không chữa được là hướng chấp nhận được; sai theo hướng gõ bừa
     thì không.** */
  const REPAIR_PHRASES = Object.freeze(["render lại", "render again"]);

  // ⑴ Nhà cung cấp tự nói nó KHÔNG tạo ra được gì. Cố ý hẹp: chỉ nhận câu nói về việc TẠO ẢNH
  // thất bại, không nhận mọi câu có chữ "error" — một câu trả lời BÌNH THƯỜNG bàn về lỗi (đúng
  // loại prompt Đức hay gửi) không được kích hoạt cửa này.
  const affirmedNegativePattern = /(kh(?:ô|o)ng (?:th(?:ể|e) )?(?:t(?:ạ|a)o|render|v(?:ẽ|e))[^.!?\n]{0,40}(?:(?:ả|a)nh|image)|(?:c(?:ó|o) )?l(?:ỗ|o)i (?:h(?:ệ|e) th(?:ố|o)ng|t(?:ừ|u) tool|khi (?:t(?:ạ|a)o|render))|(?:couldn.t|could not|was unable to|failed to) (?:generate|create|render)[^.!?\n]{0,40}(?:image|picture)|image generation (?:failed|error))/i;

  /* Trả về CHUỖI TỪ `REPAIR_PHRASES`, hoặc null. Không bao giờ trả một mẩu của `text`. */
  function providerRepairRequest(text) {
    const value = String(text || "");
    if (!value.trim()) return null;
    if (!affirmedNegativePattern.test(value)) return null;
    // So khớp KHÔNG dấu-nháy, không phân biệt hoa thường: nhà cung cấp có thể viết câu chữa
    // trong ngoặc kép, ngoặc đơn, hay in nghiêng bằng dấu sao.
    const phang = value.toLowerCase().replace(/[`'"*_]/g, "");
    for (const phrase of REPAIR_PHRASES) {
      if (phang.includes(phrase.toLowerCase())) {
        // `phrase` là hằng của TỆP NÀY. Đây là chỗ duy nhất câu gõ ra được quyết định.
        return { phrase, why: `nhà cung cấp báo không tạo được và xin "${phrase}"` };
      }
    }
    return null;
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "chatgpt",
    REPAIR_PHRASES,
    providerRepairRequest,
    SELECTORS,
    TIMING,
    ORIGIN,
    SURFACE,
    isProviderUrl,
    surface,
    surfaceAllowed,
    conversationId,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();

/* Provider adapter -- the single provider-specific surface for this worker.
   Flow selectors and timings below are backed by the measured lifecycle in
   evidence/F1-EVIDENCE-NOTES.md (2026-08-27). */
(() => {
  "use strict";

  const SELECTORS = Object.freeze({
    // F1 conclusion 1: exactly one durable prompt surface on the measured page.
    composer: Object.freeze(['[contenteditable="true"][role="textbox"]']),
    // Flow exposes no stable Send/Stop aria labels. Consumers use the
    // evidence-backed findCreateButton helper; generation has no Stop control.
    send: Object.freeze([]),
    stop: Object.freeze([]),
    uploadMenuButton: Object.freeze([]),
    // F1 conclusion 5: persistent body-level image inputs; there may be many.
    fileInput: Object.freeze(['input[type="file"][accept*="image"]']),
    attachmentPreview: Object.freeze([]),
    uploadPending: Object.freeze([]),
    composerScope: null,
    fileDropTarget: null,
    responseContainer: Object.freeze([]),
    userQueryContainer: null,
    generatedImage: null,
    generatedImageContainer: null,
    generatedImageAltMarker: "",
    generatedImageHostPattern: /$a/,
    generatedImageMinSize: 0,
    outputExclude: null,
    excludedImageHostPattern: /$a/,
    generatingBusy: null,
    thinkingAnimation: null,
    quotaExceededAnchor: null,
    // F1 conclusions 1 and 6: completion is a new stable media id, not a
    // styled-components class, progressbar, busy flag, or Stop button.
    videoSelector: "video",
  });

  const TIMING = Object.freeze({
    perJobTimeoutMs: 300000, // F1: measured ~70s for 720p x 10s; allow 300s
    postTypeSettleMs: 150,
    postSendSettleMs: 2000,
    completionPollMs: 5000,
    stableTextDwellMs: 1500,
    referenceReadyTimeoutMs: 15000,
    sendReadyTimeoutMs: 5000,
    menuSettleMs: 0,
  });

  // Nhịp thao tác giống người (Đức chốt 02/09). Trước bản này, runner mở trang
  // là gõ ngay, gõ xong 150 ms là bấm — nhịp không người nào có, và Đức yêu cầu
  // đừng thao tác kiểu đó.
  //
  // Ba quãng nghỉ, mỗi quãng là một KHOẢNG rồi bốc ngẫu nhiên trong đó: một
  // hằng số cố định lặp lại y hệt hàng chục lần còn dễ nhận ra hơn là nhanh.
  //
  // Vì sao chỉ có ba chỗ này, và vì sao ĐÚNG ba chỗ này:
  //   · `preComposeMs`  — đặt TRƯỚC lúc dò lại composer, không phải sau. Đặt sau
  //     là mở lại đúng lỗ hổng audit Codex vòng 3 đã bắt: composer phải được dò
  //     ở bước cuối cùng ngay trước khi gõ, vì mọi bước làm đổi DOM đều có thể
  //     remount nó, và một tham chiếu cũ thì gõ vào chỗ không còn tồn tại.
  //   · `postTypeMs`    — thay chỗ cho postTypeSettleMs cố định 150 ms.
  //   · `preSubmitMs`   — SAU khi nút đã sáng, TRƯỚC lúc chụp mốc quy gán. Không
  //     đặt sau mốc: luật "chụp mốc ngay sát cú bấm" là thứ giữ cho việc quy gán
  //     video không bị lẫn, và một quãng nghỉ chen vào giữa sẽ làm nền cũ đi.
  //
  // NANG LEN 02/09 lan hai, sau khi Google gan co "unusual activity" o luot
  // F4R6 (evidence/F4R6-KET-QUA.md). Duc chot lai muc tieu: "chay 1 flow tron
  // ven khong bi interrupt", KHONG phai chay nhanh. Nen moi khoang deu duoc noi
  // rong han va bien do lon han — bien do moi la thu quan trong, vi mot nhip
  // deu dan van la mot dau van tay du no cham.
  const HUMAN_PACING = Object.freeze({
    preComposeMs: Object.freeze({ min: 3000, max: 14000 }),
    postTypeMs: Object.freeze({ min: 2500, max: 11000 }),
    preSubmitMs: Object.freeze({ min: 1800, max: 8000 }),
  });

  const SURFACE = Object.freeze({ IMAGES: "IMAGES", CONVERSATION: "CONVERSATION", WRONG: "WRONG" });

  // MOT DOAN LOCALE TUY CHON, do that 2026-09-02 tren ho so Binh: Flow phuc vu
  // cung mot du an o CA HAI dang duong dan —
  //   https://labs.google/fx/tools/flow/project/<id>
  //   https://labs.google/fx/vi/tools/flow/project/<id>   <- giao dien tieng Viet
  // Ban truoc chi nhan dang thu nhat, nen tren mot Chrome dat tieng Viet thi
  // manifest khong tiem content script, panel bao composer_found:false va
  // trieu chung hien ra la RECEIVER_LOST — chi thang vao mot cho khong he sai.
  //
  // O day co y SIET CHAT: dung mot doan, va doan do phai co dang ma ngon ngu
  // (vi, en, pt-BR...). Manifest thi khong the chat nhu vay — match pattern cua
  // Chrome chi co `*` va no nuot ca dau gach cheo — nen manifest buoc phai rong
  // hon. Day la co y: manifest quyet dinh script CO DUOC NAP khong, con file
  // nay moi la cong quyet dinh trang do CO PHAI Flow that khong.
  const LOCALE_SEGMENT = "(?:[a-z]{2}(?:-[a-zA-Z]{2,4})?/)?";
  const ORIGIN = Object.freeze({
    hosts: Object.freeze(["labs.google"]),
    urlPattern: new RegExp(`^https://labs\.google/fx/${LOCALE_SEGMENT}tools/flow(?:/|[?#]|$)`, "i"),
  });

  function isProviderUrl(url) {
    return Boolean(url && ORIGIN.urlPattern.test(url));
  }

  function surface(url) {
    try {
      const parsed = new URL(url);
      if (parsed.origin !== "https://labs.google") return SURFACE.WRONG;
      if (new RegExp(`^/fx/${LOCALE_SEGMENT}tools/flow(?:/|$)`, "i").test(parsed.pathname)) return SURFACE.CONVERSATION;
      return SURFACE.WRONG;
    } catch (_) {
      return SURFACE.WRONG;
    }
  }

  function surfaceAllowed(url, _context = {}) {
    return surface(url) === SURFACE.CONVERSATION;
  }

  function buttonLabel(button) {
    return (button?.innerText || button?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function visibleNode(root, node) {
    if (typeof node?.getBoundingClientRect !== "function") return true;
    const rect = node.getBoundingClientRect();
    const style = root.defaultView?.getComputedStyle?.(node);
    return rect.width > 0 && rect.height > 0 && style?.display !== "none" && style?.visibility !== "hidden";
  }

  function enabledButton(button) {
    return Boolean(button) && !button.disabled && button.getAttribute?.("aria-disabled") !== "true";
  }

  // ROOT CAUSE, corrected by live measurement 2026-08-28
  // (evidence/F4-composer-scope-trace-20260828.json):
  //
  // "add_2 Create" IS NOT A SUBMIT BUTTON. It is the add-media control, and it
  // sits in the SAME composer cluster as the real submit button -- one hop above
  // the composer, alongside "Agent" and the mode chip. It is enabled at all
  // times, which is why a page-wide scan reached it first. Clicking it opens the
  // Meo Story media panel: zero videos, zero images, prompt untouched.
  //
  // It was added to the submit-label list on 2026-08-28 after a run stopped at
  // PRE_SUBMIT and a probe showed "add_2 Create" enabled while the real button
  // was not. That was read as an icon rename ("selector drift"). It was not: the
  // two controls coexist. The very next run clicked it and produced nothing,
  // which is the loss this file exists to prevent.
  //
  // Measured ground truth: the ONLY control that has ever produced a video is
  // "arrow_forward Create" (evidence/F1-EVIDENCE-NOTES.md, submit_index 1). It is
  // disabled while the composer is empty and enables on input -- so "it is
  // disabled right now" is never a reason to reach for a different button.
  // The ONE visible prompt surface. Identity only -- it deliberately says nothing
  // about where the Create control lives, because a composer with no Create yet
  // is a normal idle state on Flow (the control mounts on first input).
  function findComposer(root) {
    if (!root?.querySelectorAll) return null;
    const composers = [];
    for (const selector of SELECTORS.composer) {
      let nodes;
      try { nodes = Array.from(root.querySelectorAll(selector)); } catch (_) { return null; }
      for (const node of nodes) {
        if (!composers.includes(node) && visibleNode(root, node)) composers.push(node);
      }
    }
    return composers.length === 1 ? composers[0] : null;
  }

  // NHAN NUT GUI: DANH SACH NHAN CHINH XAC, MOI NHAN PHAI CO BANG CHUNG DOM.
  //
  // Do that 2026-09-02 tren ho so Binh (giao dien tieng Viet): cung mot trang,
  // cung mot cau truc DOM, nhung nhan nut BI DICH —
  //     "arrow_forward Create"  (en)   ->  "arrow_forward Tao"  (vi)
  //     "add_2 Create"          (en)   ->  "add_2 Tao"          (vi)
  // Ban cu chi co chuoi tieng Anh nen khong tim thay nut nao: scope khong giai
  // duoc, sendFound=false, khong job nao chay. Bang chung:
  // evidence/F4R7-probe-BEFORE-trial-20260902.json
  //
  // DA THU MOT CACH GON HON VA DA BO: so khop theo tien to ligature
  // (`^arrow_forward\s+\S`), vi ligature cua Material Symbols khong bi dich.
  // No nhan dung ca hai locale VA loai dung `add_2` o ca hai — nhung no cung
  // nhan luon `arrow_forward Recreate`, mot near-miss ma phep kiem cu co y chan.
  // Noi long mot cong CHI TIEU CREDIT de do phai them nhan cho tung ngon ngu la
  // doi sai chieu. Giu danh sach chinh xac.
  //
  // THEM MOT NGON NGU MOI: chay `diagnostics.dom_probe`, doc nhan THAT tren
  // trang do, luu probe vao evidence/, roi moi them vao day. Dung dich tay va
  // dung doan — luat vang 1. Thieu nhan thi he thong TU CHOI chay, do la huong
  // hong dung: khong click nham con hon click nham mot nut ton 6-7 credit.
  //
  // VA DAY LA CHO PHAI CAN THAN NHAT: o tieng Viet CA HAI nut deu ket thuc bang
  // "Tao". Bat ky cach so khop nao chi nhin CHU dang sau ligature deu se nuot
  // luon `add_2 Tao` — dung cai nut mo bang media da gay mat credit 28/08.
  const CREATE_BUTTON_LABELS = Object.freeze([
    "arrow_forward Create", // en — evidence/F1-EVIDENCE-NOTES.md (2026-08-27)
    "arrow_forward Tạo",  // vi — evidence/F4R7-probe-BEFORE-trial-20260902.json
  ]);
  function isCreateButtonLabel(label) {
    return CREATE_BUTTON_LABELS.includes(String(label || ""));
  }

  // MEASURED 2026-08-28: the live page carries four text-entry surfaces — the
  // composer, a nav input, a search input, and a hidden textarea. The composer's
  // own control cluster contains only the composer. So a candidate container
  // holding ANY other text-entry surface is proof we climbed past the composer's
  // area into shared page chrome, and shared page chrome is exactly where the
  // "add_2 Create" that caused the live loss lives.
  const TEXT_ENTRY_SELECTOR = 'textarea, input[type="text"], [contenteditable="true"], [role="textbox"]';
  function overshotComposerArea(container, composer) {
    let nodes;
    try { nodes = Array.from(container.querySelectorAll(TEXT_ENTRY_SELECTOR)); } catch (_) { return false; }
    return nodes.some((node) => node !== composer);
  }

  function visibleButtonsIn(root, container) {
    let nodes;
    try { nodes = Array.from(container.querySelectorAll("button")); } catch (_) { return []; }
    return nodes.filter((button) => visibleNode(root, button));
  }
  function visibleCreateButtonsIn(root, container) {
    return visibleButtonsIn(root, container).filter((button) => isCreateButtonLabel(buttonLabel(button)));
  }
  function visibleUpgradeButtonsIn(root, container) {
    return visibleButtonsIn(root, container).filter((button) => buttonLabel(button) === "Upgrade" && enabledButton(button));
  }

  // Scope is defence in depth behind the label rule above, not a substitute for
  // it. MEASURED 2026-08-28: the composer has NO <form> ancestor (the page's only
  // <form> owns the search box), and its control cluster is two hops up -- hop 1
  // holds no buttons, hop 2 holds exactly four. Beyond hop 6 the tree opens into
  // shared page chrome: 19 buttons and 3-4 competing text-entry surfaces.
  //
  // So the scope is derived STRUCTURALLY, assuming no tag, class or id: climb
  // through button-less ancestors and stop dead at the first one holding buttons.
  // The anchor cannot be Create alone: the measured no-credit wall IS Create
  // disappearing and being replaced by Upgrade (FLOW-04, 2026-08-28). Anchoring
  // only on Create would make the quota wall unrecognisable exactly when it
  // matters. So a level counts as the submit area if it holds either control.
  // The climb is BOUNDED, and the bound is the whole safety argument. Walk up
  // from the composer only while ancestors hold NO buttons at all, and stop dead
  // at the first one that does: that level is the composer's own control cluster.
  // Never climb past it. Climbing further is how a page-level control gets back
  // into reach, which is the exact bug this file exists to kill -- an unbounded
  // search would eventually reach the page root and see "add_2 Create" again.
  //
  // At that one level: exactly one Create is the composer's Create; two is an
  // unmeasured page state and fails closed; none plus a live Upgrade is the
  // measured no-credit wall (Create is REPLACED by Upgrade, so the wall can only
  // be recognised at a level that no longer has a Create).
  const MAX_SCOPE_HOPS = 8;
  function composerScope(root) {
    const composer = findComposer(root);
    if (!composer) return null;
    let container = composer.parentElement;
    for (let hop = 1; container && hop <= MAX_SCOPE_HOPS; hop += 1) {
      // Refuse before inspecting buttons: once the container is shared page
      // chrome, nothing inside it can be attributed to this composer.
      if (overshotComposerArea(container, composer)) return null;
      const buttons = visibleButtonsIn(root, container);
      if (buttons.length === 0) { container = container.parentElement; continue; }
      const creates = buttons.filter((button) => isCreateButtonLabel(buttonLabel(button)));
      if (creates.length > 1) return null;
      if (creates.length === 1) return Object.freeze({ composer, container, create: creates[0], hops: hop });
      const upgrades = buttons.filter((button) => buttonLabel(button) === "Upgrade" && enabledButton(button));
      return upgrades.length > 0 ? Object.freeze({ composer, container, create: null, hops: hop }) : null;
    }
    return null;
  }

  function scopedVisibleButtons(root, scope) {
    if (!scope) return [];
    let nodes;
    try { nodes = Array.from(scope.container.querySelectorAll("button")); } catch (_) { return []; }
    return nodes.filter((button) => visibleNode(root, button));
  }

  // Audit helper for diagnostics.dom_probe: proves for any element whether it sits
  // inside the authorised submit scope, so selector reach is inspectable from
  // evidence instead of inferred.
  function isInComposerScope(root, element) {
    const scope = composerScope(root);
    if (!scope || !element) return false;
    return scopedVisibleButtons(root, scope).includes(element);
  }

  function createCandidates(root, scope) {
    return scopedVisibleButtons(root, scope)
      .filter((button) => isCreateButtonLabel(buttonLabel(button)));
  }
  function findCreateButton(root) {
    const scope = composerScope(root);
    return scope ? scope.create : null;
  }

  // F-11 GIAI 02/09. Ban cu khop CHINH XAC dung mot chuoi da do 28/08:
  //     🍌 Nano Banana 2 crop_9_16 x2
  // Doi model, doi ti le, hay doi so luong la generationMode() tra 'unknown'
  // va moi job dung o WRONG_GENERATION_MODE. Fail-closed dung, nhung no bien
  // mot thay doi cau hinh binh thuong cua Duc thanh mot cu dung may.
  //
  // Do that 02/09 tren ho so Binh, nhan Image la:
  //     🍌 Nano Banana 2 Lite crop_16_9 x3
  // Hai diem do -> du de nhan theo CAU TRUC thay vi khop cung, y het cach nhan
  // nhan Video von da lam vay tu dau. Bang chung:
  //   evidence/F4-trial-success-live-20260828.json        (x2, crop_9_16)
  //   evidence/F26-probe-BEFORE-imagemode-20260902.json   (Lite, x3, crop_16_9)
  //
  // KHONG chong lan voi nhan Video: nhan Video bat dau bang 'Video . ', khong
  // co emoji. Hai pattern loai tru nhau, va co test ghim dieu do.
  const IMAGE_MODE_SUMMARY_PATTERN = /^\u{1F34C} .+ crop_[^\s]+ x\d+$/u;
  const VIDEO_MODE_SUMMARY_PATTERN = /^Video · [^·]+ · [^·]+ crop_[^\s]+ x\d+$/;
  const MODE_OPTION_CLASS = "flow_tab_slider_trigger";

  function hasClassToken(button, token) {
    const raw = button?.className?.baseVal || button?.className || button?.getAttribute?.("class") || "";
    return String(raw).split(/\s+/).includes(token);
  }

  // FLOW-04 live evidence (2026-08-28): the closed settings trigger is either
  // the exact measured Image summary or a structured Video summary whose
  // resolution/duration/aspect/count values may vary. Only visible, enabled
  // buttons count; prompt/page prose can never identify the generation mode.
  function generationMode(root) {
    if (!root?.querySelectorAll) return Object.freeze({ mode: "unknown", button: null, label: "" });
    const matches = Array.from(root.querySelectorAll("button")).map((button) => ({ button, label: buttonLabel(button) }))
      .filter(({ button, label }) => visibleNode(root, button) && enabledButton(button) && (IMAGE_MODE_SUMMARY_PATTERN.test(label) || VIDEO_MODE_SUMMARY_PATTERN.test(label)));
    if (matches.length !== 1) return Object.freeze({ mode: "unknown", button: null, label: "" });
    const match = matches[0];
    return Object.freeze({ mode: IMAGE_MODE_SUMMARY_PATTERN.test(match.label) ? "image" : "video", button: match.button, label: match.label, outputCount: outputCountFromSummary(match.label) });
  }

  // F-15: chip cau hinh mang ca SO LUONG OUTPUT (`x1`...`x4`), va no la mot con
  // so ton tien. Dat `x2` la Flow sinh NHIEU video mot luot; luat quy gan cua
  // goi nay doi DUNG MOT id moi, nen ket qua se la OUTPUT_AMBIGUOUS —
  // KHONG NHAN CAI NAO trong khi credit DA TIEU.
  //
  // Doc `x{n}` tu nhan chip la mot selector moi, nen no phai co bang chung DOM:
  // evidence/F4-trial-success-live-20260828.json va moi probe cua F4R7..F4R9
  // deu cho thay hau to `x1` o cuoi nhan (`Video · 360p · 8s crop_16_9 x1`).
  //
  // Tra `null` khi khong doc duoc — chu KHONG tra 1. Nguoi goi phai phan biet
  // duoc "da do va dung 1" voi "khong do duoc", vi hai truong hop do dan toi
  // hai quyet dinh khac nhau.
  function outputCountFromSummary(label) {
    const match = String(label || "").match(/\sx(\d+)$/);
    if (!match) return null;
    const count = Number(match[1]);
    return Number.isInteger(count) && count > 0 ? count : null;
  }

  // F-22: DON GIA MOI OUTPUT nam trong CUNG cai nhan chip do — o hai o dau.
  //
  // Bang chung DOM cho CAU TRUC nhan (do phan giai o o 2, thoi luong o o 3):
  //   evidence/F1-snapshot-1-idle-20260827.json        `Video · 720p · 10s crop_16_9 x1`
  //   evidence/F4-snapshot-1-baseline-20260828.json    `Video · 360p · 10s crop_16_9 x1`
  //   evidence/F14-mode-probe-vi-20260902.json         `Video · 360p · 8s crop_16_9 x3`
  //
  // Bang chung cho GIA — do that, khong suy:
  //   360p 8s  = 6  · evidence/F26R3-PHAT-HIEN-nut-Create-bien-mat-vi-gia.md
  //                   (chip x3, so du 8, Flow GO nut gui vi 3 x 6 = 18 > 8;
  //                    phep tinh nay khop dung hanh vi quan sat duoc)
  //   360p 10s = 7  · F-22, Duc chot 02/09 (50 credit / 7 = 7 video)
  //   720p 10s = 15 · decisions.md 27/08 (3 video x 15 credit = ngan sach free)
  //
  // KHONG noi suy sang to hop chua do (vi du 720p 8s). Luat vang 1: khong doan.
  // Chua do thi tra `null`, va ben goi PHAI xu ly `null` theo huong dat hon —
  // doan re la doan sai ve tien.
  const VIDEO_CREDIT_PRICE = Object.freeze({
    "360p|8s": 6,
    "360p|10s": 7,
    "720p|10s": 15,
  });
  const VIDEO_SUMMARY_CONFIG = /^Video · (\d{3,4}p) · (\d+s) crop_/;

  // Tra { resolution, duration, credits_per_output, output_count } hoac `null`.
  // `null` co nghia la "khong doc duoc", KHONG phai "re". Ba ca tra null:
  // nhan rong / nhan che do Image / to hop chua co gia do that.
  function videoCreditsFromSummary(label) {
    const text = String(label || "");
    const parts = VIDEO_SUMMARY_CONFIG.exec(text);
    if (!parts) return null;
    const credits = VIDEO_CREDIT_PRICE[`${parts[1]}|${parts[2]}`];
    if (!Number.isInteger(credits) || credits <= 0) return null;
    const outputs = outputCountFromSummary(text);
    if (outputs === null) return null;
    return Object.freeze({ resolution: parts[1], duration: parts[2], credits_per_output: credits, output_count: outputs });
  }

  // The open settings panel exposes this exact semantic button with the
  // measured stable class token. Duplicate candidates are ambiguous and must
  // fail closed; no styled-component hash class is used.
  // F-26: bang cau hinh mo ra thi lo ra TOAN BO nut cau hinh roi. Do that
  // 02/09 tren giao dien tieng Viet (evidence/F14-mode-probe-vi-20260902.json):
  // 17 nhan, trong do so luong output la bon nut co nhan CHINH XAC "x1", "x2",
  // "x3", "x4" — khong kem icon, khong bi dich.
  //
  // Chi nhan khi co DUNG MOT ung vien. Bang cau hinh cua Flow con co do phan
  // giai (360p/720p) va thoi luong (4s..10s); bam nham mot trong nhung nut do
  // KHONG mat credit ngay, nhung no doi don gia moi video (720p ton gap doi),
  // nen mo ho o day la mo ho ve tien. Hai ung vien = tu choi.
  //
  // KHONG suy ra selector tu class: probe chi cho ta NHAN, chua cho ta class cua
  // may nut nay. Bam theo nhan da do la co bang chung; bam theo class suy doan
  // thi khong. Luat vang 1.
  function findOutputCountOption(root, count) {
    if (!root?.querySelectorAll || !Number.isInteger(count) || count < 1) return null;
    const wanted = `x${count}`;
    let nodes;
    try { nodes = Array.from(root.querySelectorAll("button")); } catch (_) { return null; }
    const matches = nodes.filter((button) => buttonLabel(button) === wanted && visibleNode(root, button) && enabledButton(button));
    return matches.length === 1 ? matches[0] : null;
  }

  // Bang cau hinh dang MO hay dang DONG — do, dung doan.
  //
  // Do that 02/09, va no la nguyen nhan lam F-26 hong o luot dau: sau khi
  // chuyen mode Image->Video, bang van DANG MO. trySetSingleOutput gia dinh
  // bang dang dong nen bam chip de 'mo' — cu bam do DONG bang lai; tim x1
  // khong thay; bam lan nua de 'dong' — thuc ra MO ra, va de bang mo cho lenh
  // sau. Hai phep do dan toi ket luan nay: mode_probe lan mot 'opened:true',
  // lan hai ngay sau luot hong 'opened:false' voi 0 nhan moi.
  //
  // Dau hieu: bon nut so luong x1..x4 CHI ton tai khi bang mo
  // (evidence/F14-mode-probe-vi-20260902.json: chung nam trong 17 nhan xuat
  // hien SAU cu bam, va bien mat sau khi dong).
  function settingsPanelOpen(root) {
    for (let count = 1; count <= 4; count += 1) {
      if (findOutputCountOption(root, count)) return true;
    }
    return false;
  }

  function findVideoModeOption(root) {
    if (!root?.querySelectorAll) return null;
    const matches = Array.from(root.querySelectorAll("button")).filter((button) => (
      buttonLabel(button) === "videocam Video" && hasClassToken(button, MODE_OPTION_CLASS)
      && visibleNode(root, button) && enabledButton(button)
    ));
    return matches.length === 1 ? matches[0] : null;
  }

  // Worded as an OBSERVATION, deliberately. Audit 2026-08-28 is right that a
  // Create which mounts slower than the readiness budget looks identical to the
  // wall, and no measurement yet separates them -- see backlog F-13, which is to
  // measure real mount latency so the budget can be set from data instead of
  // taste. Until then this stops the batch (the safe direction for credits) but
  // it must not tell the owner something it cannot prove, so it reports what was
  // seen rather than asserting the account is empty.
  const FLOW_GENERATION_LIMIT_REASON = "Nút Create biến mất khỏi thanh nhập và có nút Upgrade đang hiện — nhiều khả năng hết credit. Đã dừng trước khi bấm, chưa tiêu gì. Kiểm tra credit của tài khoản; nếu vẫn còn credit thì báo lại, có thể chỉ là trang mount chậm.";

  // FLOW-04 live evidence (2026-08-28): after prompt entry on a no-credit
  // account, Create is unavailable and enabled visible buttons whose exact
  // semantic text is "Upgrade" appear. Button-only evidence deliberately
  // excludes arbitrary prompt/page prose and avoids styled-component classes.
  // FLOW-04 (2026-08-28): Upgrade is only quota evidence when it stands INSIDE
  // the composer form in place of the unavailable Create. A page-level Upgrade
  // is ordinary marketing chrome and must never be read as a quota wall.
  // The wall is claimed for exactly ONE measured shape: Create is GONE from the
  // cluster and a live Upgrade stands in its place.
  //
  // Audit finding 2026-08-28: an earlier version also claimed the wall when a
  // DISABLED Create sat beside an Upgrade. That state was never measured, and it
  // is catastrophic to guess at, because a disabled Create is the NORMAL IDLE
  // page -- arrow_forward Create is disabled whenever the composer is empty. Any
  // upsell chrome in the cluster would then have turned every idle page into a
  // false "out of credits" hard stop and blocked all work.
  //
  // Ambiguity (two Create controls) resolves the scope to null above, so it can
  // never arrive here either: ambiguity is an unmeasured DOM change, not
  // exhaustion, and must not send the owner to a billing page.
  // Audit finding 2026-08-28, second pass: "no Create in the cluster" is ALSO an
  // ordinary state -- Flow has been seen to mount the submit control only once
  // the editor accepts input. An Upgrade already sitting in the cluster would
  // then hard-stop a perfectly healthy job during a mount delay, with no retry.
  //
  // The measured wall was observed AFTER the prompt was typed: text in the
  // composer, Create gone, Upgrade in its place. So the wall additionally
  // requires a non-empty composer. Before typing there is nothing to be walled
  // off from, and a missing Create simply means "not ready yet".
  //
  // Reading the composer text is measured-safe: dom_probe reports this exact
  // value as textboxes[].valueLen (28 on the live capture). If the read ever
  // fails we under-report the wall, and the run then stops at the readiness gate
  // with zero clicks -- the safe direction.
  function composerHasText(composer) {
    const value = composer?.value ?? composer?.innerText ?? composer?.textContent ?? "";
    return String(value).trim().length > 0;
  }
  function generationLimitBlocker(root) {
    const scope = composerScope(root);
    if (!scope) return null;
    if (scope.create) return null;
    if (!composerHasText(scope.composer)) return null;
    return visibleUpgradeButtonsIn(root, scope.container).length > 0 ? FLOW_GENERATION_LIMIT_REASON : null;
  }

  // F1 measured media redirect pattern. Reject other hosts, paths, missing or
  // repeated/blank name values so a non-result video can never be attributed.
  function videoIdFromSrc(src) {
    try {
      const parsed = new URL(String(src || ""));
      if (parsed.origin !== "https://labs.google" || parsed.pathname !== "/fx/api/trpc/media.getMediaUrlRedirect") return null;
      const values = parsed.searchParams.getAll("name");
      return values.length === 1 && values[0] ? values[0] : null;
    } catch (_) {
      return null;
    }
  }

  // Page-wide interstitial blockers remain provider-independent safety gates.
  const securityBlockerPattern = /(captcha|verify you are human|unusual activity|suspicious activity|security check|xác minh.*con người|hoạt động bất thường)/i;

  // Flow quota message text is UNMEASURED: there is no DOM evidence yet.
  // The generic visible-page scan is deliberately broad until F-09 captures
  // the real message; content.js excludes composer/input surfaces from it.
  const quotaPhrasePattern = /((reached|hit|used).{0,45}(limit|quota|credit)|try again later|come back later|giới hạn|hạn mức|thử lại sau|out of credits|not enough credits|hết credit|không đủ credit)/i;
  const legacyLimitPattern = /(reached (?:your|the) (?:daily |monthly )?(?:image generation )?limit|hit (?:your|the) (?:daily |monthly )?(?:image generation )?limit|image generation limit|generate more images (?:after|later|tomorrow)|try again (?:after|tomorrow|in (?:a|\d))|come back (?:after|in|tomorrow) to (?:generate|create) (?:more )?images|daily limit for image generation|you.ve used all your (?:free )?image generations)/i;
  function matchesGenerationLimit(text) {
    const value = String(text || "");
    return Boolean(value) && (quotaPhrasePattern.test(value) || legacyLimitPattern.test(value));
  }

  (typeof window !== "undefined" ? window : globalThis).DacProviderAdapter = Object.freeze({
    provider: "gg-flow-video",
    resultKind: "video",
    SELECTORS,
    TIMING,
    HUMAN_PACING,
    ORIGIN,
    SURFACE,
    isProviderUrl,
    surface,
    surfaceAllowed,
    composerScope,
    findComposer,
    isInComposerScope,
    findCreateButton,
    generationMode,
    outputCountFromSummary,
    VIDEO_CREDIT_PRICE,
    videoCreditsFromSummary,
    findVideoModeOption,
    findOutputCountOption,
    settingsPanelOpen,
    generationLimitBlocker,
    videoIdFromSrc,
    securityBlockerPattern,
    matchesGenerationLimit,
  });
})();

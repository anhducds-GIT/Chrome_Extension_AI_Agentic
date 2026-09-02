// Behavioral pins for F-02 post-submit exact-once and video attribution.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const media = (id) => ({ currentSrc: `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${id}`, getBoundingClientRect: () => ({ width: 320, height: 180 }), querySelector: () => null });
const VIDEO_MODE_SUMMARY = "Video · 360p · 10s crop_16_9 x1";
const IMAGE_MODE_SUMMARY = "🍌 Nano Banana 2 crop_9_16 x2";

function harness({
  duringTyping = [],
  afterClick = [],
  createAvailability = "always",
  createLabel = "arrow_forward Create",
  createDisabledUntilTyped = false,
  createAlwaysDisabled = false,
  createMountsAfterPolls = 0,
  duplicateCreateCount = 1,
  globalCreateLabel = null,
  addMediaInCluster = false,
  upgradeAfterTyping = false,
  upgradeScope = "composer",
  composerCount = 1,
  composerDetached = false,
  pageText = "",
  pageTextAfterTyping = null,
  modeRegressesAfterTyping = false,
  remountComposerOnModeSwitch = false,
  modeSummaryLabel = VIDEO_MODE_SUMMARY,
  videoOptionLabel = "videocam Video",
  proveVideoAfterClick = true,
  offerOutputX1 = false,
  settingsOpenAtStart = false,
  outputFixSilentlyFails = false,
  videoSummaryAfterSwitch = VIDEO_MODE_SUMMARY,
} = {}) {
  let clicks = 0;
  let remountClicks = 0;
  let remounted = false;
  const focusedTargets = [];
  let globalCreateClicks = 0;
  let settingsClicks = 0;
  let videoModeClicks = 0;
  let tick = 0;
  let typed = false;
  let settingsOpen = settingsOpenAtStart;
  let outputOptionPresses = 0;
  let currentModeSummary = modeSummaryLabel;
  let videos = [media("old")];
  // Measured: settings controls react to the pointer sequence, not to a bare
  // .click(). Fixtures that respond to .click() would let the old code pass.
  const buttonNode = (label, { className = "", disabled = () => false, click = () => {}, onPointerDown = null } = {}) => ({
    innerText: label, textContent: label, className,
    dispatchEvent(event) { if (onPointerDown && event && event.type === "pointerdown") onPointerDown(); },
    get disabled() { return disabled(); },
    getAttribute(name) {
      if (name === "class") return className;
      if (name === "aria-disabled") return disabled() ? "true" : null;
      return null;
    },
    getBoundingClientRect: () => ({ width: 80, height: 32 }),
    click,
  });
  // MEASURED 2026-08-28 on the live Flow page: the composer has NO <form>
  // ancestor -- the page's only <form> owns the search box. The submit scope is
  // the nearest ANCESTOR that holds the composer's own Create, so the fixture is
  // built as a real parent chain: composer -> composerArea -> pageRoot.
  // composerArea holds only the prompt controls; pageRoot holds everything,
  // including the page-level "add_2 Create" that caused the live loss.
  let composerArea;
  let remountArea;
  let pageRoot;
  const makeComposer = (label, area) => ({
    tagName: "DIV", dacLabel: label, dispatchEvent() {},
    getBoundingClientRect: () => ({ width: 320, height: 48 }),
    focus() { focusedTargets.push(label); },
    closest: () => null,
    querySelectorAll: () => [],
    // The composer carries text once the editor has accepted input. The quota
    // rule depends on this: a missing Create matters only when there is a prompt
    // waiting to be submitted.
    get textContent() { return typed ? "a typed prompt" : ""; },
    get innerText() { return typed ? "a typed prompt" : ""; },
    get parentElement() { return composerDetached ? null : area(); },
  });
  const composers = Array.from({ length: composerCount }, () => makeComposer("base", () => composerArea));
  // FLOW-04 audit round 2: Flow may REMOUNT composer + form when the Image ->
  // Video switch lands. The remounted pair is a genuinely different DOM node
  // set, so any reference captured before the switch is detached.
  const remountComposer = makeComposer("remount", () => remountArea);
  const createButtons = Array.from({ length: duplicateCreateCount }, () => buttonNode(createLabel, {
    disabled: () => createAlwaysDisabled || (createDisabledUntilTyped && !typed),
    click() { clicks += 1; videos = [...afterClick.map(media), ...videos]; },
  }));
  const globalCreateButton = globalCreateLabel == null ? null : buttonNode(globalCreateLabel, { click() { globalCreateClicks += 1; } });
  const summaryButton = () => {
    const label = modeRegressesAfterTyping && typed ? IMAGE_MODE_SUMMARY : currentModeSummary;
    return label == null ? null : buttonNode(label, {
      click() { /* measured: a bare click does nothing to this control */ },
      onPointerDown() { settingsClicks += 1; settingsOpen = !settingsOpen; },
    });
  };
  const imageOption = buttonNode("image Image", { className: "flow_tab_slider_trigger" });
  // F-26: bang cau hinh lo ra bon nut so luong output co nhan chinh xac x1..x4
  // (do that: evidence/F14-mode-probe-vi-20260902.json). Harness chi dung nut x1
  // khi kich ban khai `offerOutputX1`, de con test duoc ca ca "khong co nut de
  // sua" — do la duong runner phai TU CHOI chu khong duoc im lang di tiep.
  const inertOutputOption2 = buttonNode("x2", {});
  const inertOutputOption3 = buttonNode("x3", {});
  const inertOutputOption4 = buttonNode("x4", {});
  const outputX1Option = buttonNode("x1", {
    onPointerDown() {
      outputOptionPresses += 1;
      // Mo phong ca xau: nut bam duoc, khong bao loi, ma chip KHONG doi. Neu
      // runner tin cu bam thay vi doc lai chip thi no se di tiep va tieu credit.
      if (!outputFixSilentlyFails) currentModeSummary = String(currentModeSummary || "").replace(/\sx\d+$/, " x1");
    },
  });
  const remountCreate = buttonNode(createLabel, {
    click() { remountClicks += 1; videos = [...afterClick.map(media), ...videos]; },
  });
  const videoOption = buttonNode(videoOptionLabel, {
    className: "flow_tab_slider_trigger",
    click() { /* measured: a bare click does nothing to this control */ },
    onPointerDown() {
      videoModeClicks += 1;
      settingsOpen = false;
      if (remountComposerOnModeSwitch) remounted = true;
      if (proveVideoAfterClick) currentModeSummary = videoSummaryAfterSwitch;
    },
  });
  const upgradeButtons = [1, 2].map(() => buttonNode("Upgrade", { click() { throw new Error("Upgrade must never be clicked by the runner"); } }));
  // Measured: the add-media control "add_2 Create" lives in the SAME cluster as
  // the real submit button. It is enabled at all times and must never be chosen.
  const addMediaButton = buttonNode("add_2 Create", { click() { throw new Error("add-media must never be clicked by the runner"); } });
  let clusterReads = 0;
  const composerButtons = () => {
    const extra = addMediaInCluster ? [addMediaButton] : [];
    // Flow can mount the submit control a beat after the editor accepts input.
    // During that beat the cluster holds the prompt and an Upgrade but no
    // Create -- indistinguishable from the credit wall in a single snapshot.
    if (createMountsAfterPolls > 0 && typed) {
      clusterReads += 1;
      if (clusterReads <= createMountsAfterPolls) return [...extra, ...upgradeButtons];
    }
    if (remounted) return [...extra, remountCreate];
    if (upgradeAfterTyping && typed && upgradeScope === "composer") return [...extra, ...upgradeButtons];
    if (createAvailability === "never") return extra;
    if (createAvailability === "after_typing" && !typed) return extra;
    return [...extra, ...createButtons];
  };
  pageRoot = {
    tagName: "DIV", parentElement: null,
    querySelectorAll(selector) { return selector === "button" ? document.querySelectorAll("button") : []; },
  };
  composerArea = {
    tagName: "DIV",
    get parentElement() { return pageRoot; },
    querySelectorAll(selector) { return selector === "button" ? composerButtons() : []; },
  };
  remountArea = {
    tagName: "DIV",
    get parentElement() { return pageRoot; },
    querySelectorAll(selector) { return selector === "button" ? [remountCreate] : []; },
  };
  const document = {
    body: { get innerText() { return pageTextAfterTyping !== null && typed ? pageTextAfterTyping : pageText; } }, defaultView: null,
    querySelectorAll(selector) {
      if (selector === "button") {
        const buttons = [summaryButton()].filter(Boolean);
        if (settingsOpen) {
          buttons.push(imageOption, videoOption);
          // Trang that LUON lo ca bon nut so luong khi bang mo
          // (evidence/F14-mode-probe-vi-20260902.json). Harness phai giong the,
          // vi bo do 'bang dang mo' dua tren chinh su co mat cua chung — thieu
          // chung thi bo do bi mu va test khong con phan anh trang that.
          // `offerOutputX1` chi quyet dinh nut x1 CO BAM DUOC khong.
          buttons.push(inertOutputOption2, inertOutputOption3, inertOutputOption4);
          if (offerOutputX1) buttons.push(outputX1Option);
        }
        if (globalCreateButton) buttons.push(globalCreateButton);
        if (upgradeAfterTyping && typed && upgradeScope === "global") buttons.push(...upgradeButtons);
        return [...buttons, ...composerButtons()];
      }
      if (selector.includes("contenteditable")) return remounted ? [remountComposer] : composers;
      if (selector === "video") return videos;
      return [];
    },
    querySelector: () => null,
    createTreeWalker: () => ({ nextNode: () => null }),
    createRange: () => ({ selectNodeContents() {} }),
    execCommand() { typed = true; videos = [...duringTyping.map(media), ...videos]; return true; },
  };
  class FastDate extends Date {
    static now() { tick += 1000; return tick; }
  }
  const listeners = [];
  const context = {
    console, URL, Date: FastDate, document, NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }, location: { href: "https://labs.google/fx/tools/flow/project/test" },
    setTimeout: (fn) => { queueMicrotask(fn); return 1; }, clearTimeout() {}, setInterval, clearInterval,
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
    getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    Event: class { constructor(type) { this.type = type; } }, InputEvent: class { constructor(type) { this.type = type; } },
    chrome: { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) }, sendMessage: () => Promise.resolve() } },
  };
  context.window = context; context.globalThis = context; document.defaultView = context;
  vm.createContext(context);
  for (const file of ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "content-decision-core.js", "content.js"]) {
    vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
  }
  const receive = listeners[0];
  return {
    deliver: (message) => new Promise((resolve) => receive(message, {}, resolve)),
    clicks: () => clicks,
    remountClicks: () => remountClicks,
    typedInto: () => focusedTargets[focusedTargets.length - 1] || null,
    settingsClicks: () => settingsClicks,
    outputOptionPresses: () => outputOptionPresses,
    videoModeClicks: () => videoModeClicks,
    globalCreateClicks: () => globalCreateClicks,
    typed: () => typed,
  };
}

// The real DAC_RUN_IMAGE_JOB path must establish Video mode before prompt
// typing. An already-Video summary is a zero-settings-click no-op.
{
  // Chip o x1: kich ban nay kiem chuyen MODE, khong phai so luong output. Ban
  // dau fixture de "x2" mot cach tinh co, va cong F-15 (chan x2+) chan dung no.
  const h = harness({ modeSummaryLabel: "Video · 720p · 5s crop_9_16 x1", afterClick: ["already-video"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-VIDEO", attempt_id: "attempt-mode-video", prompt: "already video", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(h.settingsClicks(), 0);
  assert.equal(h.videoModeClicks(), 0);
  assert.equal(h.clicks(), 1);
}

// F-15: chip dat x2 tro len = mot luot sinh NHIEU video, ma luat quy gan doi
// dung MOT id moi -> khong nhan duoc gi trong khi credit da tieu. Cong nay phai
// tu choi TRUOC khi go va truoc moi cu bam, nen moi duong thoat deu ZERO CREDIT.
//
// Kiem ca ca "mode da dung Video ma van x4": do la ca nguy hiem nhat, vi moi
// tien de khac deu xanh nen khong ai nghi ngo gi.
// (a) KHONG co nut de sua -> phai TU CHOI. Duong nay la lop cuoi, va no van
//     phai dung: F-26 cho runner TU SUA, khong phai cho no im lang di tiep.
//     Luu y: nay runner DUOC PHEP mo bang cau hinh de thu sua — phep kiem cu
//     "khong duoc dung toi bang cau hinh" da lac hau va da bo.
for (const label of ["Video · 360p · 8s crop_16_9 x2", "Video · 360p · 8s crop_16_9 x4"]) {
  const h = harness({ modeSummaryLabel: label, afterClick: ["already-video"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-X2", attempt_id: "attempt-x2", prompt: "khong duoc gui", timeoutMs: 15000 });
  assert.equal(response.ok, false, `${label}: sua khong duoc thi phai tu choi`);
  assert.match(response.error, /x[24]/, "chu bao loi phai noi ro chip dang dat bao nhieu");
  assert.equal(h.clicks(), 0, `${label}: KHONG duoc bam Create — day la cho credit bi tieu`);
  assert.equal(h.typed(), false, `${label}: khong duoc go khi chua sua duoc chip`);
}

// (b) CO nut x1 -> runner phai TU SUA roi chay tiep. Day la dieu Duc chot
//     02/09: "cho runner tu dat x1 va tu doc cau hinh" — thay vi bat nguoi sua tay.
{
  const h = harness({ modeSummaryLabel: "Video · 360p · 8s crop_16_9 x3", offerOutputX1: true, afterClick: ["fixed-then-ran"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-FIX", attempt_id: "attempt-fix", prompt: "duoc gui sau khi sua", timeoutMs: 15000 });
  assert.equal(response.ok, true, "co nut x1 thi runner phai tu sua roi chay tiep");
  assert.equal(h.outputOptionPresses(), 1, "phai bam DUNG MOT lan vao nut x1");
  const fixedChip = response.attempt?.detection?.output_chip;
  assert.ok(fixedChip, "sua xong cung phai ghi lai — Duc phai doc duoc bang mat rang AI da doi cau hinh cua anh ay");
  assert.equal(fixedChip.count_before, 3);
  assert.equal(fixedChip.count_after, 1);
  assert.equal(fixedChip.fixed, true);
  assert.equal(h.clicks(), 1, "sua xong roi moi duoc bam Create, dung mot lan");
  assert.equal(h.typed(), true);
}

// VA TREN DUONG CHUYEN ANH -> VIDEO. Day la ca de sot nhat: chip Image von la
// `... x2`, nen kiem so luong TRUOC khi chuyen se chan nham moi job anh->video.
// Cong phai kiem tren chip VIDEO VUA CO — tuc sau khi hau dieu kien duoc chung
// minh. Mot dot bien go dung cong nay tung lot luoi vi khong test nao di qua
// duong chuyen mode voi chip x2 o dau kia.
{
  const h = harness({
    modeSummaryLabel: IMAGE_MODE_SUMMARY,
    videoSummaryAfterSwitch: "Video · 360p · 8s crop_16_9 x3",
    afterClick: ["switched-video"],
  });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-SWITCH-X3", attempt_id: "attempt-switch-x3", prompt: "khong duoc gui", timeoutMs: 15000 });
  assert.equal(response.ok, false, "chuyen sang Video ma chip la x3 thi phai tu choi");
  assert.match(response.error, /x3/, "chu bao loi phai noi ro chip dang dat bao nhieu");
  assert.equal(h.clicks(), 0, "KHONG duoc bam Create — day la cho credit bi tieu");
  assert.equal(h.typed(), false, "khong duoc go prompt khi da biet luot nay se sinh 3 video");
}

// Ghi chu ve nhanh "khong doc duoc so luong" trong assertSingleOutputChip:
// no la lop phong thu thu hai va HIEN CHUA THE TOI DUOC, vi
// VIDEO_MODE_SUMMARY_PATTERN da doi hau to ` x{n}` moi nhan mot nhan la chip
// Video — nhan thieu hau to se thanh mode "unknown" va bi chan som hon boi mot
// cau bao loi khac. Giu lai co chu dich: neu ai noi pattern do ra, nhanh nay la
// thu duy nhat con dung giua ta va mot luot chay khong biet se sinh may video.
// KHONG viet test gia vo kiem no — mot test di qua duong khac roi bao "da phu"
// con te hon khong co test.

// (c) Bam duoc nut x1 nhung CHIP KHONG DOI. Day la ca duy nhat phan biet duoc
//     "kiem lai chip" voi "tin cu bam". Mot dot bien doi buoc kiem cuoi thanh
//     `return true` tung lot luoi vi trong harness cu bam luon thanh cong.
{
  const h = harness({ modeSummaryLabel: "Video · 360p · 8s crop_16_9 x2", offerOutputX1: true, outputFixSilentlyFails: true, afterClick: ["khong-duoc-chay"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-FIXFAIL", attempt_id: "attempt-fixfail", prompt: "khong duoc gui", timeoutMs: 15000 });
  assert.equal(response.ok, false, "bam xong ma chip khong doi thi phai tu choi — cu bam khong phai bang chung");
  assert.equal(h.outputOptionPresses(), 1, "van phai thu sua dung mot lan");
  // `fixed` phai la KET LUAN DOC TU CHIP, khong phai "toi da bam". Day la ca
  // duy nhat phan biet duoc hai thu do — o moi ca khac, bam xong la chip doi.
  const chip = response.attempt?.detection?.output_chip;
  assert.ok(chip, "phai ghi lai output_chip ke ca khi tu choi");
  assert.equal(chip.fix_attempted, true, "phai ghi nhan la da thu sua");
  assert.equal(chip.fixed, false, "chip khong doi thi KHONG duoc bao la da sua xong");
  assert.equal(chip.count_before, 2);
  assert.equal(chip.count_after, 2, "phai doc LAI chip sau khi bam, khong duoc tin cu bam");
  assert.equal(h.clicks(), 0, "KHONG duoc bam Create");
  assert.equal(h.typed(), false, "khong duoc go");
}

// (d) Khong tim thay nut x1 -> phai DONG BANG lai truoc khi tu choi. De bang mo
//     la de trang o trang thai Duc khong dat, va luot sau se gap mot bang dang mo.
{
  const h = harness({ modeSummaryLabel: "Video · 360p · 8s crop_16_9 x2", afterClick: ["khong-duoc-chay"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-NOFIX", attempt_id: "attempt-nofix", prompt: "khong duoc gui", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.equal(h.settingsClicks(), 2, "mo bang ra thi phai dong lai: dung hai cu bam chip (mo + dong)");
}

// (e) BANG DA MO SAN — ca da lam F-26 hong o luot live dau tien 02/09.
//     Sau khi chuyen mode Image->Video, bang cau hinh VAN DANG MO. Ban dau
//     trySetSingleOutput gia dinh no dang dong nen bam chip de "mo" — cu bam do
//     DONG bang lai, x1 khong con nhin thay, va lan bam thu hai (de "dong") lai
//     MO ra, de bang mo cho lenh sau.
//     Nay: DO trang thai truoc, chi bam khi can, va tra bang ve dung trang thai
//     ban dau. Neu bang da mo san thi KHONG duoc bam chip lan nao.
{
  const h = harness({
    modeSummaryLabel: "Video · 360p · 8s crop_16_9 x3",
    offerOutputX1: true,
    settingsOpenAtStart: true,
    afterClick: ["fixed-with-panel-open"],
  });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-PANEL-OPEN", attempt_id: "attempt-panel-open", prompt: "bang da mo san", timeoutMs: 15000 });
  assert.equal(response.ok, true, "bang mo san thi van phai sua duoc chip");
  assert.equal(h.outputOptionPresses(), 1, "van bam dung mot lan vao x1");
  assert.equal(h.settingsClicks(), 0, "bang da mo san thi KHONG duoc bam chip lan nao — bam la dong no lai");
  const chip = response.attempt?.detection?.output_chip;
  assert.equal(chip.panel_was_open, true, "phai ghi nhan la bang da mo san");
  assert.equal(chip.option_found, true);
  assert.equal(chip.fixed, true);
  assert.equal(h.clicks(), 1, "sua xong roi moi bam Create, dung mot lan");
}

// Measured Image summary: one settings click, one exact measured Video-option
// click, then a proven closed Video summary before typing/Create.
{
  const h = harness({ modeSummaryLabel: IMAGE_MODE_SUMMARY, afterClick: ["switched-video"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-IMAGE", attempt_id: "attempt-mode-image", prompt: "switch image to video", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(h.settingsClicks(), 1);
  assert.equal(h.videoModeClicks(), 1);
  assert.equal(h.typed(), true);
  assert.equal(h.clicks(), 1);
}

// Audit round 2 (Codex, 2026-08-28): the Image -> Video switch can REMOUNT the
// composer and its form. A reference captured before the switch is detached, so
// typing would go nowhere while the readiness gate resolves the NEW form and
// clicks its live Create -- submitting an EMPTY prompt for 15 real credits and
// then reporting success. The prompt must land in the composer that exists AFTER.
{
  const h = harness({ modeSummaryLabel: IMAGE_MODE_SUMMARY, remountComposerOnModeSwitch: true, afterClick: ["remounted-owned"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-REMOUNT", attempt_id: "attempt-mode-remount", prompt: "survive the remount", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(h.typedInto(), "remount", "the prompt must be typed into the post-switch composer, not the detached one");
  assert.equal(h.remountClicks(), 1, "exactly the remounted form Create is clicked");
  assert.equal(h.clicks(), 0, "the detached pre-switch Create must never be clicked");
  assert.equal(response.result.video_id, "remounted-owned");
}

// Audit round 3 of the redesign (Codex, 2026-08-28): the credit wall and an
// ordinary mount delay look IDENTICAL in one snapshot once the prompt is typed
// -- text present, no Create, an Upgrade sitting in the cluster. Deciding on the
// first snapshot hard-stops healthy jobs with no retry. The verdict may only be
// taken after the readiness budget is spent, so a Create that turns up late
// still submits normally.
{
  const h = harness({ createMountsAfterPolls: 3, upgradeAfterTyping: false, afterClick: ["mounted-late"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-LATE-MOUNT", attempt_id: "attempt-late-mount", prompt: "create mounts a beat late", timeoutMs: 15000 });
  assert.equal(response.ok, true, "a late-mounting Create must not be read as a credit wall");
  assert.doesNotMatch(String(response.error || ""), /LIMIT_STOP/);
  assert.equal(h.clicks(), 1);
  assert.equal(response.result.video_id, "mounted-late");
}

// Audit round 4 (Codex, 2026-08-28): mode is proven before staging and typing,
// both of which mutate Flow's React tree. If the page falls back to Image mode
// after that proof, the composer-owned Create is still there and still enabled
// -- clicking it would spend 15 credits on the wrong product. Video must be
// re-proven at the submit boundary, and refusing there is zero-click.
{
  const h = harness({ modeRegressesAfterTyping: true, afterClick: ["wrong-product"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-REGRESS", attempt_id: "attempt-mode-regress", prompt: "mode falls back before submit", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /WRONG_GENERATION_MODE/, "a mode that stopped being Video must stop the submit");
  assert.equal(h.typed(), true, "the regression is only detectable after typing");
  assert.equal(h.clicks(), 0, "no credit may be spent under an unproven mode");
  assert.equal(response.attempt.phase, "PRE_SUBMIT");
}

// Audit round 3 (Codex, 2026-08-28): a CAPTCHA that lands MID-ATTEMPT, after
// the pre-flight blocker check has already passed, must still hard-stop before
// any click -- even with an enabled Create sitting right there. Measured while
// writing this pin: on this fixture the typing path guard is the one that
// fires, so this test proves the OUTCOME (hard stop, zero clicks), not which
// guard caught it. The readiness loop's own guard is pinned statically in
// flow-video-job-static.mjs, where deleting it can be seen to turn red.
{
  const h = harness({ pageTextAfterTyping: "verify you are human", afterClick: ["never-reached"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-LATE-CAPTCHA", attempt_id: "attempt-late-captcha", prompt: "captcha lands mid-attempt", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /HARD_STOP/, "a late CAPTCHA is a security hard stop, not a generic readiness timeout");
  assert.doesNotMatch(response.error, /Send button did not become ready/);
  assert.equal(h.typed(), true);
  assert.equal(h.clicks(), 0, "an enabled Create must not be clicked behind a CAPTCHA");
}

// Audit round 2: a page-wide security blocker outranks every mode question.
// WRONG_GENERATION_MODE classifies as OTHER, and OTHER is RETRYABLE -- so
// letting an unknown mode summary mask a CAPTCHA would hand a hard stop back to
// the retry loop. Zero settings clicks, zero typing, zero Create.
{
  const h = harness({ modeSummaryLabel: null, pageText: "verify you are human" });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-CAPTCHA-MODE", attempt_id: "attempt-captcha-mode", prompt: "must not run", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /HARD_STOP/, "a CAPTCHA is a security hard stop, never a mode complaint");
  assert.doesNotMatch(response.error, /WRONG_GENERATION_MODE/);
  assert.equal(response.attempt.phase, "PRE_SUBMIT");
  assert.equal(h.settingsClicks(), 0);
  assert.equal(h.typed(), false);
  assert.equal(h.clicks(), 0);
}

// Missing and near-match Video options fail before prompt mutation or Create.
for (const [index, videoOptionLabel] of [null, "videocam Videos", "Video", "videocam Video project"].entries()) {
  const h = harness({ modeSummaryLabel: IMAGE_MODE_SUMMARY, videoOptionLabel });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: `V-MODE-OPTION-${index}`, attempt_id: `attempt-mode-option-${index}`, prompt: "must remain untouched", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /WRONG_GENERATION_MODE.*FLOW_VIDEO_MODE_NOT_READY/);
  assert.equal(response.attempt.phase, "PRE_SUBMIT");
  assert.equal(h.settingsClicks(), 1);
  assert.equal(h.videoModeClicks(), 0);
  assert.equal(h.typed(), false);
  assert.equal(h.clicks(), 0);
}

// A Video-option click is insufficient unless the closed/current summary
// independently proves Video afterwards.
{
  const h = harness({ modeSummaryLabel: IMAGE_MODE_SUMMARY, proveVideoAfterClick: false });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-UNPROVEN", attempt_id: "attempt-mode-unproven", prompt: "do not type", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /WRONG_GENERATION_MODE.*FLOW_VIDEO_MODE_NOT_READY/);
  assert.equal(response.attempt.phase, "PRE_SUBMIT");
  assert.equal(h.settingsClicks(), 1);
  assert.equal(h.videoModeClicks(), 1);
  assert.equal(h.typed(), false);
  assert.equal(h.clicks(), 0);
}

// F-11 (va 02/09): nhan Image duoc nhan theo CAU TRUC, khong khop cung mot
// chuoi. Do that tren ho so Binh: "🍌 Nano Banana 2 Lite crop_16_9 x3" —
// Duc doi model (Lite), doi ti le, doi so luong, va ban cu tra "unknown" nen
// MOI job dung o WRONG_GENERATION_MODE. Do la fail-closed dung, nhung no bien
// mot thay doi cau hinh binh thuong thanh mot cu dung may.
{
  const h = harness({ modeSummaryLabel: "🍌 Nano Banana 2 Lite crop_16_9 x3", afterClick: ["switched"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-IMG-VARIANT", attempt_id: "attempt-img-variant", prompt: "chuyen tu bien the Image", timeoutMs: 15000 });
  assert.equal(h.settingsClicks() > 0, true, "phai nhan ra day la Image va bat dau chuyen mode, thay vi bo cuoc voi unknown");
  assert.equal(h.videoModeClicks(), 1, "phai bam dung mot lan vao tuy chon Video");
}

// Prompt prose containing "Video" is not settings-button evidence and cannot
// spoof an unknown Image summary into authorizing prompt mutation or Create.
{
  // Nhan KHONG nhan ra duoc: thieu emoji dan dau nen khong phai nhan Image,
  // cung khong phai nhan Video. Ban cu dung "🍌 ... x3" lam dai dien cho
  // "khong nhan ra", nhung sau ban va F-11 (nhan Image theo CAU TRUC thay vi
  // khop cung mot chuoi) thi x3 la mot cau hinh HOP LE — fixture do da lac hau,
  // khong phai y dinh cua test lac hau.
  const h = harness({ modeSummaryLabel: "Nano Banana 2 crop_9_16 x3" });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MODE-PROMPT-SPOOF", attempt_id: "attempt-mode-prompt-spoof", prompt: "Image prompt containing the word Video", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /WRONG_GENERATION_MODE.*FLOW_VIDEO_MODE_NOT_READY/);
  assert.equal(response.attempt.phase, "PRE_SUBMIT");
  assert.equal(h.settingsClicks(), 0);
  assert.equal(h.videoModeClicks(), 0);
  assert.equal(h.typed(), false);
  assert.equal(h.clicks(), 0);
}

// Live Flow evidence: the prompt-level Create control is absent while the
// composer is empty, then appears after typing. That idle state must not fail
// pre-submit, while the post-type readiness gate remains fail-closed.
{
  const h = harness({ createAvailability: "after_typing", createLabel: "arrow_forward\n  Create", afterClick: ["owned-after-type"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-LATE-CREATE", attempt_id: "attempt-late-create", prompt: "late Create", timeoutMs: 15000 });
  assert.equal(response.ok, true, "an absent pre-type Create button is a valid idle state");
  assert.equal(h.typed(), true);
  assert.equal(h.clicks(), 1);
}

// THE live defect, as finally measured: the add-media control "add_2 Create"
// sits in the SAME cluster as the real submit button and is enabled at all
// times, while the real submit button is disabled until the prompt is typed.
// Reaching for the enabled neighbour is what produced a media panel and no
// video. Here the neighbour is modelled page-level as well, to prove it is
// refused on label grounds alone, not merely on position.
{
  const h = harness({
    addMediaInCluster: true,
    globalCreateLabel: "add_2 Create",
    createLabel: "arrow_forward Create",
    createDisabledUntilTyped: true,
    afterClick: ["composer-owned"],
  });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-COMPOSER-SCOPE", attempt_id: "attempt-composer-scope", prompt: "scope Create", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(h.typed(), true);
  assert.equal(h.globalCreateClicks(), 0, "the enabled add-media control must never be selected or clicked");
  assert.equal(h.clicks(), 1, "typing enables and clicks exactly the prompt-form Create");
  assert.equal(response.result.video_id, "composer-owned");
}

// Duplicate exact Create controls in the one composer form are ambiguous.
{
  const h = harness({ duplicateCreateCount: 2 });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-DUPLICATE-CREATE", attempt_id: "attempt-duplicate-create", prompt: "must fail closed", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /Send button did not become ready/);
  assert.equal(h.clicks(), 0, "no ambiguous Create candidate may be clicked");
  assert.equal(h.globalCreateClicks(), 0);
}

// Composer IDENTITY must be unambiguous: two visible candidates is not a page
// this runner understands, and it stops before touching the prompt.
for (const [name, options] of [
  ["ambiguous-composer", { composerCount: 2 }],
  ["no-composer", { composerCount: 0 }],
]) {
  const h = harness(options);
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: `V-${name}`, attempt_id: `attempt-${name}`, prompt: "must remain untouched", timeoutMs: 15000 });
  assert.equal(response.ok, false, `${name} must fail closed`);
  assert.match(response.error, /Flow composer not found/);
  assert.equal(h.typed(), false, `${name} cannot mutate the prompt`);
  assert.equal(h.clicks(), 0, `${name} cannot click Create`);
}

// A composer with no ancestor chain at all yields no submit scope. That is NOT
// a "composer not found" — the composer is right there and gets typed into —
// it is a readiness failure, and it must still end in zero clicks.
{
  const h = harness({ composerDetached: true });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-NO-SCOPE", attempt_id: "attempt-no-scope", prompt: "no scope", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /Send button did not become ready/);
  assert.equal(h.clicks(), 0);
  assert.equal(h.globalCreateClicks(), 0, "an unscoped page-level Create is never a fallback");
}

// Only the two measured, normalized semantic labels are Create controls.
// Near-matches remain fail-closed even when they are structurally buttons.
for (const [index, createLabel] of ["arrow_forward Create project", "arrow_forward Recreate", "add_2 Create project", "add_2 Recreate"].entries()) {
  const h = harness({ createLabel });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: `V-INVALID-${index}`, attempt_id: `attempt-invalid-${index}`, prompt: "selector near-match", timeoutMs: 15000 });
  assert.equal(response.ok, false, `${createLabel} is not an exact Create label`);
  assert.match(response.error, /Send button did not become ready/);
  assert.equal(h.clicks(), 0, `${createLabel} must never be clicked`);
}

{
  const h = harness({ createAvailability: "never" });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-CREATE-PROMPT", attempt_id: "attempt-create-prompt", prompt: "Storyboard text: arrow_forward Create", timeoutMs: 15000 });
  assert.equal(response.ok, false, "prompt text is not structural button evidence");
  assert.equal(h.clicks(), 0, "prompt text cannot authorize a Create click");
}

{
  const h = harness({ createAvailability: "never" });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-NO-READY-CREATE", attempt_id: "attempt-no-ready-create", prompt: "no ready Create", timeoutMs: 15000 });
  assert.equal(h.typed(), true, "the attempt reaches typing before the readiness decision");
  assert.equal(response.ok, false);
  assert.match(response.error, /Send button did not become ready/);
  assert.equal(h.clicks(), 0, "the post-type ready-button guard remains mandatory");
}

// Measured FLOW-04 no-credit wall: after typing, Create disappears and visible
// enabled buttons with exact text "Upgrade" replace it. This is a provider-
// specific quota stop, before any irreversible click, and diagnostics must
// report the identical operator-safe reason.
let flowQuotaError;
{
  const h = harness({ upgradeAfterTyping: true });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-UPGRADE-WALL", attempt_id: "attempt-upgrade-wall", prompt: "unique quota probe", timeoutMs: 15000 });
  assert.equal(h.typed(), true);
  assert.equal(response.ok, false);
  assert.match(response.error, /^LIMIT_STOP: /);
  assert.match(response.error, /hết credit/, "the operator-facing reason is Vietnamese");
  assert.match(response.error, /nhiều khả năng/, "the reason reports what was seen, it does not assert exhaustion");
  assert.equal(h.clicks(), 0, "quota detection must happen before the Create click");
  flowQuotaError = response.error;

  const ping = await h.deliver({ type: "DAC_PING" });
  assert.equal(ping.generationLimitBlocker, response.error.replace(/^LIMIT_STOP: /, ""), "diagnostics and readiness use the same quota reason");
  const diagnostics = await h.deliver({ type: "DAC_DOM_PROBE" });
  assert.equal(diagnostics.ok, true);
  assert.equal(diagnostics.probe.generationLimitBlocker, ping.generationLimitBlocker, "diagnostics.dom_probe exposes the same quota reason");
}

// A page-level Upgrade outside the exact composer form is unrelated UI and
// cannot spoof a quota wall. The runner still fails closed because no prompt
// Create becomes ready, but it must not classify that page control as quota.
{
  // Measured live: the composer keeps its own Create even while empty (disabled),
  // so the composer's control cluster is where scope stops. A page-level Upgrade
  // sits outside it and is ordinary marketing chrome.
  const h = harness({ createAlwaysDisabled: true, upgradeAfterTyping: true, upgradeScope: "global" });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-GLOBAL-UPGRADE", attempt_id: "attempt-global-upgrade", prompt: "global Upgrade is unrelated", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /Send button did not become ready/);
  assert.doesNotMatch(response.error, /LIMIT_STOP|generation limit/i);
  assert.equal(h.clicks(), 0);
}

// User-authored prompt text is not button evidence and must never be mistaken
// for the Flow quota wall.
{
  const h = harness({ createAvailability: "after_typing", afterClick: ["owned-upgrade-word"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-UPGRADE-PROMPT", attempt_id: "attempt-upgrade-prompt", prompt: "Storyboard title: Upgrade", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(response.result.video_id, "owned-upgrade-word");
  assert.equal(h.clicks(), 1);
}

// Boundary is captured after typing: a concurrent pre-click result is baseline;
// exactly one post-click id is the only attributable result.
{
  const h = harness({ duringTyping: ["manual-before-click"], afterClick: ["owned"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-SINGLE", attempt_id: "attempt-single", prompt: "single", timeoutMs: 15000 });
  assert.equal(response.ok, true);
  assert.equal(response.result.video_id, "owned");
  assert.deepEqual([...response.result.detection.candidate_video_ids], ["owned"]);
  assert.equal(h.clicks(), 1);
}

// Two post-click ids are ambiguous: record both, claim neither.
{
  const h = harness({ afterClick: ["candidate-a", "candidate-b"] });
  const response = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-MULTI", attempt_id: "attempt-multi", prompt: "multi", timeoutMs: 15000 });
  assert.equal(response.ok, false);
  assert.match(response.error, /OUTPUT_AMBIGUOUS/);
  assert.deepEqual([...response.attempt.detection.candidate_video_ids], ["candidate-a", "candidate-b"]);
  assert.equal(response.result, undefined, "neither ambiguous id is claimed");
  assert.equal(h.clicks(), 1);
}

// A submitted timeout reconciles read-only. It never clicks Create again, and
// the runner parks uncertainty instead of authorizing an automatic retry.
{
  const h = harness();
  const first = await h.deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V-TIMEOUT", attempt_id: "attempt-timeout", prompt: "timeout", timeoutMs: 15000 });
  assert.equal(first.ok, false);
  assert.match(first.error, /OUTPUT_DETECTION_TIMEOUT/);
  assert.equal(h.clicks(), 1);
  const reconciled = await h.deliver({ type: "DAC_RECONCILE_IMAGE_JOB", job_id: "V-TIMEOUT", attempt_id: "attempt-timeout", timeoutMs: 300000 });
  assert.equal(reconciled.ok, false);
  assert.equal(h.clicks(), 1, "reconciliation cannot issue a second Create click");
}

const runnerContext = { window: {}, globalThis: null };
runnerContext.globalThis = runnerContext.window;
vm.createContext(runnerContext);
vm.runInContext(fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8"), runnerContext);
const runner = runnerContext.window.DacRunnerCore;
assert.equal(runner.classifyFailure(flowQuotaError, "PRE_SUBMIT"), "GENERATION_LIMIT_REACHED");
assert.equal(runner.canRetry({ retry_count: 0, settings: { max_retries: 3 } }, "GENERATION_LIMIT_REACHED"), false, "quota hard-stop cannot switch account or retry");
const parked = { phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.canRetry(parked, "POST_SUBMIT_UNCERTAIN"), false);
assert.equal(runner.canRetry(parked, "TIMEOUT_AFTER_SUBMIT"), false);
assert.equal(runner.interruptedStatus("SUBMITTED", "POST_SUBMIT_UNCERTAIN"), "INTERRUPTED");

const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
assert.match(panel, /timeoutMs: Math\.max\(item\.settings\.timeout_sec \* 1000, window\.DacProviderAdapter\.TIMING\.perJobTimeoutMs\)/, "video reconciliation is at least the 300s adapter budget");

console.log("flow video safety behavior: PASS");

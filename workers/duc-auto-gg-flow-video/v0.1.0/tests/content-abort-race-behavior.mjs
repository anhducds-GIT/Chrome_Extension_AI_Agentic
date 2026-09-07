// G-01 behavioral pin: load the real Flow content receiver and count Create.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let createClicks = 0;
let videos = [];
// FLOW-04, measured 2026-08-28: the composer has NO <form> ancestor. The submit
// scope is the nearest ancestor holding buttons -- the composer's own control
// cluster. The settings summary stays page-level, exactly as measured live.
let composerArea;
const composer = {
  tagName: "DIV", textContent: "", innerText: "", focus() {}, dispatchEvent() {},
  getBoundingClientRect: () => ({ width: 320, height: 48 }),
  closest: () => null,
  querySelectorAll: () => [],
  get parentElement() { return composerArea; },
};
const createButton = {
  innerText: "arrow_forward Create", textContent: "arrow_forward Create", disabled: false,
  getAttribute: () => null, getBoundingClientRect: () => ({ width: 80, height: 32 }),
  click() {
    createClicks += 1;
    // F-33: san khau nay dung NHA MOI — do 06/09, nha moi khong con the <video>
    // nao, video hien bang <img> trong <flow-video-tile>
    // (evidence/F31-dom-probe-flow-google-com-20260906.json). Nha cu van duoc
    // canh o tests/flow-video-safety-behavior.mjs.
    videos = [{
      __tag: "img", __tile: "flow-video-tile",
      currentSrc: `https://flow.google.com/asb/created-${createClicks}`,
      getBoundingClientRect: () => ({ width: 320, height: 180 }),
      closest: () => null, alt: "", getAttribute: () => null,
    }];
  },
};
composerArea = { tagName: "DIV", parentElement: null, querySelectorAll: (selector) => selector === "button" ? [createButton] : [] };
const videoModeSummary = {
  innerText: "Video · 360p · 10s crop_16_9 x1", textContent: "Video · 360p · 10s crop_16_9 x1", disabled: false,
  getAttribute: () => null, getBoundingClientRect: () => ({ width: 180, height: 32 }),
  click() { throw new Error("an already-Video run must not click settings"); },
};
const document = {
  body: { innerText: "" }, defaultView: null,
  querySelectorAll(selector) {
    if (selector === "button") return [videoModeSummary, createButton];
    if (selector.includes("contenteditable")) return [composer];
    // F-33: giai selector bang bo do THAT — tach danh sach bang dau phay (trinh
    // duyet hieu the), roi doc moi phan nhu chuoi the-to-hau-due. So BANG CHU
    // nhu truoc 06/09 la harness noi doi: no im lang tra [] ngay khi adapter
    // them nhanh thu hai, ma nhanh thu hai chinh la duong nha moi.
    return videos.filter((node) => String(selector).split(",").some((phan) => {
      const tu = phan.trim().split(/\s+/).filter(Boolean);
      if (!tu.length || tu[tu.length - 1] !== node.__tag) return false;
      return tu.slice(0, -1).every((toTien) => toTien === node.__tile);
    }));
  },
  querySelector: () => null,
  createTreeWalker: () => ({ nextNode: () => null }),
  createRange: () => ({ selectNodeContents() {} }),
  execCommand: () => true,
};
const listeners = [];
const context = {
  console, URL, document, NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 }, location: { href: "https://labs.google/fx/tools/flow/project/test" },
  setTimeout: (fn) => { queueMicrotask(fn); return 1; }, clearTimeout() {}, setInterval, clearInterval,
  getComputedStyle: () => ({ visibility: "visible", display: "block" }),
  getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
  MutationObserver: class { observe() {} disconnect() {} },
  Event: class { constructor(type) { this.type = type; } },
  InputEvent: class { constructor(type) { this.type = type; } },
  chrome: { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) }, sendMessage: () => Promise.resolve() } },
};
context.window = context;
context.globalThis = context;
document.defaultView = context;
vm.createContext(context);
for (const file of ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "content-decision-core.js", "content.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}
assert.equal(listeners.length, 1);
const receive = listeners[0];
const deliver = (message) => new Promise((resolve) => receive(message, {}, resolve));

await deliver({ type: "DAC_ABORT", job_id: "V001", attempt_id: "attempt-x" });
const stopped = await deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V001", attempt_id: "attempt-x", prompt: "must not submit", timeoutMs: 15000 });
assert.equal(stopped.ok, false);
assert.match(stopped.error, /stopped by user/i);
assert.equal(createClicks, 0, "abort(X) before run(X) produces zero Create clicks");

const later = await deliver({ type: "DAC_RUN_IMAGE_JOB", job_id: "V001", attempt_id: "attempt-y", prompt: "later attempt", timeoutMs: 15000 });
assert.equal(later.ok, true, "abort of X must not block later attempt Y");
assert.equal(later.result.video_id, "created-1", "quy ket tren NHA MOI: id la ma sau /asb/");
assert.ok(later.result.video_url.startsWith("https://flow.google.com/asb/"));
assert.equal(createClicks, 1);

console.log("content abort race behavior: PASS");

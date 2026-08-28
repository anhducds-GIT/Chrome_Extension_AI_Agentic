// G-01 behavioral pin: load the real Flow content receiver and count Create.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

let createClicks = 0;
let videos = [];
// FLOW-04: the composer must resolve to exactly one owning <form>, and that
// form is the only authorised Create scope. The settings summary stays
// page-level, exactly as measured live.
let composerForm;
const composer = {
  tagName: "DIV", textContent: "", innerText: "", focus() {}, dispatchEvent() {},
  getBoundingClientRect: () => ({ width: 320, height: 48 }),
  closest: (selector) => selector === "form" ? composerForm : null,
  querySelectorAll: () => [],
};
const createButton = {
  innerText: "arrow_forward Create", textContent: "arrow_forward Create", disabled: false,
  getAttribute: () => null, getBoundingClientRect: () => ({ width: 80, height: 32 }),
  click() {
    createClicks += 1;
    videos = [{ currentSrc: `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=created-${createClicks}`, getBoundingClientRect: () => ({ width: 320, height: 180 }) }];
  },
};
composerForm = { tagName: "FORM", querySelectorAll: (selector) => selector === "button" ? [createButton] : [] };
createButton.closest = (selector) => selector === "form" ? composerForm : null;
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
    if (selector === "video") return videos;
    return [];
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
assert.equal(later.result.video_id, "created-1");
assert.equal(createClicks, 1);

console.log("content abort race behavior: PASS");

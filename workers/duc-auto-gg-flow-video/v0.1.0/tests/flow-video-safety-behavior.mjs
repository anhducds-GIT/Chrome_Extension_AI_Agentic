// Behavioral pins for F-02 post-submit exact-once and video attribution.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const media = (id) => ({ currentSrc: `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=${id}`, getBoundingClientRect: () => ({ width: 320, height: 180 }) });

function harness({ duringTyping = [], afterClick = [] } = {}) {
  let clicks = 0;
  let tick = 0;
  let videos = [media("old")];
  const composer = { tagName: "DIV", focus() {}, dispatchEvent() {}, getBoundingClientRect: () => ({ width: 320, height: 48 }), closest: () => null, querySelectorAll: () => [] };
  const button = {
    innerText: "arrow_forward Create", textContent: "arrow_forward Create", disabled: false,
    getAttribute: () => null, getBoundingClientRect: () => ({ width: 80, height: 32 }),
    click() { clicks += 1; videos = [...afterClick.map(media), ...videos]; },
  };
  const document = {
    body: { innerText: "" }, defaultView: null,
    querySelectorAll(selector) {
      if (selector === "button") return [button];
      if (selector.includes("contenteditable")) return [composer];
      if (selector === "video") return videos;
      return [];
    },
    querySelector: () => null,
    createTreeWalker: () => ({ nextNode: () => null }),
    createRange: () => ({ selectNodeContents() {} }),
    execCommand() { videos = [...duringTyping.map(media), ...videos]; return true; },
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
  return { deliver: (message) => new Promise((resolve) => receive(message, {}, resolve)), clicks: () => clicks };
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
const parked = { phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 2 } };
assert.equal(runner.canRetry(parked, "POST_SUBMIT_UNCERTAIN"), false);
assert.equal(runner.canRetry(parked, "TIMEOUT_AFTER_SUBMIT"), false);
assert.equal(runner.interruptedStatus("SUBMITTED", "POST_SUBMIT_UNCERTAIN"), "INTERRUPTED");

const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
assert.match(panel, /timeoutMs: Math\.max\(item\.settings\.timeout_sec \* 1000, window\.DacProviderAdapter\.TIMING\.perJobTimeoutMs\)/, "video reconciliation is at least the 300s adapter budget");

console.log("flow video safety behavior: PASS");

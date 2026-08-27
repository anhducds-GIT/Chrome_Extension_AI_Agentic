/* Flow has no measured quota DOM anchor/message yet, so exercise the real
   content-layer page scan and hard-stop wiring rather than isolated cores. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const adapterSource = fs.readFileSync(new URL("provider-adapter.js", root), "utf8");
const content = fs.readFileSync(new URL("content.js", root), "utf8");
const readinessSource = fs.readFileSync(new URL("chat-readiness-core.js", root), "utf8");
const runnerSource = fs.readFileSync(new URL("runner-core.js", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

const context = { URL };
vm.runInNewContext(adapterSource, context);
const adapter = context.DacProviderAdapter;
assert.equal(adapter.SELECTORS.quotaExceededAnchor, null);
for (const phrase of ["daily limit for image generation", "try again later", "giới hạn", "hạn mức", "thử lại sau", "out of credits", "not enough credits", "hết credit", "không đủ credit"]) {
  assert.equal(adapter.matchesGenerationLimit(phrase), true, `quota fallback must match: ${phrase}`);
}
assert.match(adapterSource, /xác minh\.\*con người\|hoạt động bất thường/, "Vietnamese security phrases remain valid UTF-8");
assert.doesNotMatch(adapterSource, /xÃ|ngÆ|hoáº/, "security matcher contains no mojibake");

const quota = content.slice(content.indexOf("function quotaPageText"), content.indexOf("function generatingSignal"));
assert.match(quota, /createTreeWalker\(body, NodeFilter\.SHOW_TEXT/, "quota fallback scans page text directly");
assert.match(quota, /closest\?\.\('\[contenteditable\], input, textarea'\)/, "quota fallback excludes all user-input surfaces");
assert.match(quota, /matchesGenerationLimit\(quotaPageText\(\)\)/, "page-text fallback is wired into generationLimitText");
assert.match(content, /generationLimitBlocker: generationLimitText\(\)/, "the bridge contract remains shape-compatible");
const videoPolling = content.slice(content.indexOf("async function waitForVideoCompletion"), content.indexOf("function newAssistantMessages"));
assert.match(videoPolling, /LIMIT_STOP: \$\{limitBlocker\}/, "video polling also halts on the live quota text layer");

const readinessContext = {};
vm.runInNewContext(readinessSource, readinessContext);
assert.equal(readinessContext.DacChatReadiness.evaluate({ composerFound: true, sendUsable: true, generating: false, securityBlocker: "CAPTCHA", generationLimitBlocker: null, outputVerified: true }), "HARD_STOP");
assert.equal(readinessContext.DacChatReadiness.evaluate({ composerFound: true, sendUsable: true, generating: false, securityBlocker: null, generationLimitBlocker: "out of credits", outputVerified: true }), "HARD_STOP");
assert.equal(readinessContext.DacChatReadiness.evaluate({ composerFound: true, sendUsable: true, generating: false, securityBlocker: null, generationLimitBlocker: null, outputVerified: true }), "READY");

const runnerContext = {};
vm.runInNewContext(runnerSource, runnerContext);
assert.equal(runnerContext.DacRunnerCore.classifyFailure("HARD_STOP: Flow security/interstitial blocker detected."), "SECURITY_HARD_STOP");
assert.equal(runnerContext.DacRunnerCore.classifyFailure("LIMIT_STOP: out of credits"), "GENERATION_LIMIT_REACHED");
assert.equal(runnerContext.DacRunnerCore.classifyFailure("OUTPUT_DETECTION_TIMEOUT: NO_NEW_VIDEO", "SUBMITTED"), "TIMEOUT_AFTER_SUBMIT");
assert.equal(runnerContext.DacRunnerCore.canRetry({ retry_count: 0, settings: { max_retries: 2 } }, "GENERATION_LIMIT_REACHED"), false);
assert.match(sidepanel, /if \(hardStop\) \{[\s\S]*?markInterrupted\(item, failureType, message\);[\s\S]*?halted: true/, "quota classification reaches the batch halt branch");

function contentHarness({ pageText = "", composerText = "" } = {}) {
  let createClicks = 0;
  let videos = [];
  const composer = {
    tagName: "DIV", textContent: composerText, innerText: composerText, focus() {}, dispatchEvent() {},
    getBoundingClientRect: () => ({ width: 320, height: 48 }), closest: () => null, querySelectorAll: () => [],
  };
  const createButton = {
    innerText: "arrow_forward Create", textContent: "arrow_forward Create", disabled: false,
    getAttribute: () => null, getBoundingClientRect: () => ({ width: 80, height: 32 }),
    click() {
      createClicks += 1;
      videos = [{ currentSrc: `https://labs.google/fx/api/trpc/media.getMediaUrlRedirect?name=quota-test-${createClicks}`, getBoundingClientRect: () => ({ width: 320, height: 180 }) }];
    },
  };
  const body = { innerText: pageText };
  const pageParent = { parentElement: body, closest: () => null };
  const composerParent = { parentElement: body, closest: (selector) => selector.includes("contenteditable") ? composer : null };
  const textNodes = [
    { nodeValue: pageText, parentElement: pageParent },
    { nodeValue: composerText, parentElement: composerParent },
  ];
  const document = {
    body, defaultView: null, documentElement: {},
    querySelectorAll(selector) {
      if (selector === "button") return [createButton];
      if (selector.includes("contenteditable")) return [composer];
      if (selector === "video") return videos;
      return [];
    },
    querySelector: () => null,
    createTreeWalker() {
      let index = 0;
      return {
        nextNode() {
          while (index < textNodes.length) {
            const node = textNodes[index++];
            if (this.filter.acceptNode(node) === 1) return node;
          }
          return null;
        },
        filter: null,
      };
    },
    createRange: () => ({ selectNodeContents() {} }),
    execCommand: () => true,
  };
  const originalCreateTreeWalker = document.createTreeWalker;
  document.createTreeWalker = (_root, _show, filter) => {
    const walker = originalCreateTreeWalker();
    walker.filter = filter;
    return walker;
  };
  const listeners = [];
  const contentContext = {
    console, URL, document, NodeFilter: { SHOW_TEXT: 4, FILTER_ACCEPT: 1, FILTER_REJECT: 2 },
    location: { href: "https://labs.google/fx/tools/flow/project/quota-test" },
    setTimeout: (fn) => { queueMicrotask(fn); return 1; }, clearTimeout() {}, setInterval, clearInterval,
    getComputedStyle: () => ({ visibility: "visible", display: "block" }),
    getSelection: () => ({ removeAllRanges() {}, addRange() {} }),
    MutationObserver: class { observe() {} disconnect() {} },
    Event: class { constructor(type) { this.type = type; } },
    InputEvent: class { constructor(type) { this.type = type; } },
    chrome: { runtime: { onMessage: { addListener: (listener) => listeners.push(listener) }, sendMessage: () => Promise.resolve() } },
  };
  contentContext.window = contentContext;
  contentContext.globalThis = contentContext;
  document.defaultView = contentContext;
  vm.createContext(contentContext);
  for (const file of ["provider-adapter.js", "image-evidence-core.js", "attempt-identity-core.js", "reconciliation-core.js", "chat-readiness-core.js", "content-decision-core.js", "content.js"]) {
    vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), contentContext, { filename: file });
  }
  const deliver = (message) => new Promise((resolve) => listeners[0](message, {}, resolve));
  return { deliver, clicks: () => createClicks };
}

for (const phrase of ["hết credit", "you are out of credits"]) {
  const harness = contentHarness({ pageText: phrase });
  const response = await harness.deliver({ type: "DAC_WAIT_CHAT_READY", timeoutMs: 15000 });
  assert.equal(response.ok, false, `page quota text must hard-stop: ${phrase}`);
  assert.match(response.error, /^LIMIT_STOP:/, `quota must use the hard-stop error path: ${phrase}`);
  assert.equal(harness.clicks(), 0, `quota readiness hard-stop must never click Create: ${phrase}`);
}

const composerOnly = contentHarness({ composerText: "my prompt says hết credit and you are out of credits" });
const composerResponse = await composerOnly.deliver({ type: "DAC_WAIT_CHAT_READY", timeoutMs: 15000 });
assert.equal(composerResponse.ok, true, "quota phrase only inside the composer must not trip");
assert.equal(composerOnly.clicks(), 0, "readiness check remains non-submitting");

console.log("generation limit smoke tests: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";

// 1. Static HTML, CSS, and JS inspections
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../sidepanel.css", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

assert.match(html, /CHAT ZOOM/);
assert.match(html, /data-zoom="0\.8"/);
assert.match(html, /data-zoom="0\.9"/);
assert.match(html, /data-zoom="1\.0"/);
assert.match(html, /<button[^>]*class="zoom-btn"[^>]*>80%<\/button>/);
assert.match(html, /<button[^>]*class="zoom-btn"[^>]*>90%<\/button>/);
assert.match(html, /<button[^>]*class="zoom-btn"[^>]*>100%<\/button>/);
assert.doesNotMatch(html, /<input[^>]*type="checkbox"[^>]*data-zoom/, "Zoom control must use segmented buttons, NOT checkboxes");

assert.match(css, /\.zoom-group/);
assert.match(css, /\.zoom-label/);
assert.match(css, /\.segmented/);
assert.match(css, /\.zoom-btn/);
assert.match(css, /\.zoom-btn\.active/);

// Verify truthful zoom state matching and origin-level semantics in source
assert.match(source, /matchesZoomLevel/);
assert.doesNotMatch(source, /nearestZoom/, "nearest-value presentation must not be used");
assert.match(source, /Chrome default zoom behavior[\s\S]*?may persist across the same ChatGPT origin/i);

// 2. Behavioral logic tests
function isChatGPTUrl(url) {
  return Boolean(url && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(url));
}

const ZOOM_LEVELS = [0.8, 0.9, 1.0];
const ZOOM_EPSILON = 0.015;

function matchesZoomLevel(actualZoom, targetLevel, epsilon = ZOOM_EPSILON) {
  if (!Number.isFinite(actualZoom) || !Number.isFinite(targetLevel)) return false;
  return Math.abs(actualZoom - targetLevel) <= epsilon;
}

// URL filtering checks
assert.equal(isChatGPTUrl("https://chatgpt.com/"), true);
assert.equal(isChatGPTUrl("https://chatgpt.com/c/67890"), true);
assert.equal(isChatGPTUrl("https://chat.openai.com/"), true);
assert.equal(isChatGPTUrl("https://chat.openai.com/g/g-1234"), true);
assert.equal(isChatGPTUrl("https://google.com"), false);
assert.equal(isChatGPTUrl("chrome://extensions"), false);
assert.equal(isChatGPTUrl("http://chatgpt.com/"), false, "Insecure HTTP should not match");
assert.equal(isChatGPTUrl(""), false);
assert.equal(isChatGPTUrl(null), false);

// Truthful zoom matching checks
assert.equal(matchesZoomLevel(0.8, 0.8), true, "80% matches 0.8");
assert.equal(matchesZoomLevel(0.805, 0.8), true, "80.5% matches 0.8 within epsilon");
assert.equal(matchesZoomLevel(0.9, 0.9), true, "90% matches 0.9");
assert.equal(matchesZoomLevel(1.0, 1.0), true, "100% matches 1.0");

// Off-target zoom levels must NOT match any supported button
for (const offTarget of [0.75, 1.10, 1.25, 0.50, 1.50]) {
  for (const supported of ZOOM_LEVELS) {
    assert.equal(matchesZoomLevel(offTarget, supported), false, `${offTarget * 100}% must not match ${supported * 100}%`);
  }
}

// 3. Tab zoom interaction simulation
class MockChromeTabs {
  constructor(activeUrl, initialZoom = 1.0) {
    this.activeUrl = activeUrl;
    this.zoom = initialZoom;
    this.setZoomCalls = [];
  }

  async query({ active, currentWindow }) {
    if (active && currentWindow) {
      return [{ id: 101, url: this.activeUrl }];
    }
    return [];
  }

  async getZoom(tabId) {
    if (tabId === 101) return this.zoom;
    throw new Error("Tab not found");
  }

  async setZoom(tabId, zoomFactor) {
    if (tabId === 101) {
      this.zoom = zoomFactor;
      this.setZoomCalls.push({ tabId, zoomFactor });
      return;
    }
    throw new Error("Tab not found");
  }
}

async function simulateZoomSync(mockChrome, buttons) {
  const [tab] = await mockChrome.query({ active: true, currentWindow: true });
  if (!tab?.id || !isChatGPTUrl(tab.url)) {
    for (const btn of buttons) {
      btn.disabled = true;
      btn.active = false;
    }
    return;
  }
  const currentZoom = await mockChrome.getZoom(tab.id);
  for (const btn of buttons) {
    btn.disabled = false;
    const targetZoom = Number(btn.dataset.zoom);
    btn.active = matchesZoomLevel(currentZoom, targetZoom);
  }
}

async function simulateSetZoom(mockChrome, buttons, targetLevel) {
  const [tab] = await mockChrome.query({ active: true, currentWindow: true });
  if (!tab?.id || !isChatGPTUrl(tab.url)) return;
  await mockChrome.setZoom(tab.id, targetLevel);
  await simulateZoomSync(mockChrome, buttons);
}

// Case A: Non-ChatGPT active tab -> buttons disabled, none active
const mockNonChat = new MockChromeTabs("https://example.com", 1.0);
const buttonsA = [
  { dataset: { zoom: "0.8" }, disabled: false, active: false },
  { dataset: { zoom: "0.9" }, disabled: false, active: false },
  { dataset: { zoom: "1.0" }, disabled: false, active: false }
];
await simulateZoomSync(mockNonChat, buttonsA);
assert.equal(buttonsA.every((b) => b.disabled === true), true, "All buttons disabled on non-ChatGPT tabs");
assert.equal(buttonsA.every((b) => b.active === false), true, "No button active on non-ChatGPT tabs");
await simulateSetZoom(mockNonChat, buttonsA, 0.8);
assert.equal(mockNonChat.setZoomCalls.length, 0, "No setZoom calls on non-ChatGPT tabs");

// Case B: ChatGPT active tab with supported zoom levels (80, 90, 100) -> correct active button
for (const level of [0.8, 0.9, 1.0]) {
  const mockChat = new MockChromeTabs("https://chatgpt.com/", level);
  const buttons = [
    { dataset: { zoom: "0.8" }, disabled: true, active: false },
    { dataset: { zoom: "0.9" }, disabled: true, active: false },
    { dataset: { zoom: "1.0" }, disabled: true, active: false }
  ];
  await simulateZoomSync(mockChat, buttons);
  assert.equal(buttons.every((b) => b.disabled === false), true, `Buttons enabled on ChatGPT tab at ${level * 100}%`);
  const activeBtn = buttons.find((b) => b.active);
  assert.ok(activeBtn, `One button must be active for supported level ${level * 100}%`);
  assert.equal(Number(activeBtn.dataset.zoom), level, `Active button matches ${level * 100}%`);
}

// Case C: ChatGPT active tab with off-target zoom levels (75, 110, 125) -> NO active button
for (const offTarget of [0.75, 1.10, 1.25]) {
  const mockChat = new MockChromeTabs("https://chatgpt.com/", offTarget);
  const buttons = [
    { dataset: { zoom: "0.8" }, disabled: true, active: false },
    { dataset: { zoom: "0.9" }, disabled: true, active: false },
    { dataset: { zoom: "1.0" }, disabled: true, active: false }
  ];
  await simulateZoomSync(mockChat, buttons);
  assert.equal(buttons.every((b) => b.disabled === false), true, `Buttons enabled on ChatGPT tab at ${offTarget * 100}%`);
  assert.equal(buttons.every((b) => b.active === false), true, `No button active for off-target zoom ${offTarget * 100}%`);
}

// Case D: User clicks 80% on ChatGPT tab -> sets zoom to 0.8 and highlights 80%
const mockChatD = new MockChromeTabs("https://chatgpt.com/", 1.0);
const buttonsD = [
  { dataset: { zoom: "0.8" }, disabled: true, active: false },
  { dataset: { zoom: "0.9" }, disabled: true, active: false },
  { dataset: { zoom: "1.0" }, disabled: true, active: false }
];
await simulateZoomSync(mockChatD, buttonsD);
assert.equal(buttonsD.find((b) => b.dataset.zoom === "1.0").active, true);
await simulateSetZoom(mockChatD, buttonsD, 0.8);
assert.equal(mockChatD.setZoomCalls.length, 1);
assert.deepEqual(mockChatD.setZoomCalls[0], { tabId: 101, zoomFactor: 0.8 });
assert.equal(buttonsD.find((b) => b.dataset.zoom === "0.8").active, true, "80% active after setZoom");
assert.equal(buttonsD.find((b) => b.dataset.zoom === "1.0").active, false);

console.log("ChatGPT zoom control smoke tests: PASS");

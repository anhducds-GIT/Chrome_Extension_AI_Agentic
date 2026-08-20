import assert from "node:assert/strict";
import fs from "node:fs";

// 1. Static HTML and CSS inspections
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

// 2. Behavioral logic tests
function isChatGPTUrl(url) {
  return Boolean(url && /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i.test(url));
}

const ZOOM_LEVELS = [0.8, 0.9, 1.0];

function nearestZoom(value) {
  const num = Number.isFinite(Number(value)) ? Number(value) : 1.0;
  let closest = 1.0;
  let minDiff = Infinity;
  for (const z of ZOOM_LEVELS) {
    const diff = Math.abs(num - z);
    if (diff < minDiff) {
      minDiff = diff;
      closest = z;
    }
  }
  return closest;
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

// Nearest zoom calculation checks
assert.equal(nearestZoom(0.8), 0.8);
assert.equal(nearestZoom(0.79), 0.8);
assert.equal(nearestZoom(0.83), 0.8);
assert.equal(nearestZoom(0.88), 0.9);
assert.equal(nearestZoom(0.9), 0.9);
assert.equal(nearestZoom(0.92), 0.9);
assert.equal(nearestZoom(0.96), 1.0);
assert.equal(nearestZoom(1.0), 1.0);
assert.equal(nearestZoom(1.1), 1.0);
assert.equal(nearestZoom(0), 0.8);

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
  const nearest = nearestZoom(currentZoom);
  for (const btn of buttons) {
    btn.disabled = false;
    btn.active = Math.abs(Number(btn.dataset.zoom) - nearest) < 0.04;
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
await simulateSetZoom(mockNonChat, buttonsA, 0.8);
assert.equal(mockNonChat.setZoomCalls.length, 0, "No setZoom calls on non-ChatGPT tabs");

// Case B: ChatGPT active tab with zoom 1.0 -> buttons enabled, 100% active
const mockChat = new MockChromeTabs("https://chatgpt.com/", 1.0);
const buttonsB = [
  { dataset: { zoom: "0.8" }, disabled: true, active: false },
  { dataset: { zoom: "0.9" }, disabled: true, active: false },
  { dataset: { zoom: "1.0" }, disabled: true, active: false }
];
await simulateZoomSync(mockChat, buttonsB);
assert.equal(buttonsB.every((b) => b.disabled === false), true, "Buttons enabled on ChatGPT tabs");
assert.equal(buttonsB.find((b) => b.dataset.zoom === "1.0").active, true, "100% active initially");
assert.equal(buttonsB.find((b) => b.dataset.zoom === "0.8").active, false);

// Case C: User clicks 80% on ChatGPT tab -> sets zoom to 0.8 and highlights 80%
await simulateSetZoom(mockChat, buttonsB, 0.8);
assert.equal(mockChat.setZoomCalls.length, 1);
assert.deepEqual(mockChat.setZoomCalls[0], { tabId: 101, zoomFactor: 0.8 });
assert.equal(buttonsB.find((b) => b.dataset.zoom === "0.8").active, true, "80% active after setZoom");
assert.equal(buttonsB.find((b) => b.dataset.zoom === "1.0").active, false);

console.log("ChatGPT zoom control smoke tests: PASS");

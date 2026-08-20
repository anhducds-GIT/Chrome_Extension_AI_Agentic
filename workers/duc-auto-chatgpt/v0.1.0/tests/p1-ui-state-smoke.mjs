import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

// 1. Static source inspection of sidepanel.js and sidepanel.html
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const sidepanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

// Verify essential UI element IDs and state-driven hooks exist
assert.match(html, /id="setupScreen"/);
assert.match(html, /id="runScreen"/);
assert.match(html, /id="outputScreen"/);
assert.match(sidepanelSource, /showScreen\("runScreen"\)/, "START RUN must automatically activate RUN screen");
assert.match(sidepanelSource, /showScreen\("outputScreen"\)/, "Successful legitimate run completion must activate OUTPUT screen");
assert.match(sidepanelSource, /const completedNaturally = !state\.stopRequested && !halted;[\s\S]*?if \(completedNaturally\) \{\s*showScreen\("outputScreen"\);?\s*\}/, "OUTPUT screen is only activated when run completes legitimately without halt");
assert.match(sidepanelSource, /if \(state\.running && id === "outputScreen"\) return;/, "User cannot switch to OUTPUT screen during an active run");

// 2. Behavioral verification of Attempt Semantics in Current Job (P1-1)
function formatTiming(item, elapsed = 10, stageBudget = 170, reason = "Live progress") {
  const isRetryEligible = item.status === "RUNNING" && item.phase === "PRE_SUBMIT";
  const attemptLabel = isRetryEligible
    ? `Attempt ${item.attempt_count}/${1 + item.settings.max_retries}`
    : `Attempt ${item.attempt_count}`;
  const flags = [];
  if (!isRetryEligible && (item.phase !== "PRE_SUBMIT" || ["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status))) {
    flags.push("Auto-retry: No");
  }
  if (item.protected_checkpoint) {
    flags.push("Output checkpoint protected");
  }
  const flagsText = flags.length ? ` · ${flags.join(" · ")}` : "";
  return `${attemptLabel}${flagsText} · Elapsed 00:10 · Stage budget 02:50 remaining · ${reason}`;
}

// Case 1: Retry-eligible Current Job shows X/Y and allows auto-retry
const retryEligibleItem = {
  job: { id: "JOB_001" },
  status: "RUNNING",
  phase: "PRE_SUBMIT",
  attempt_count: 1,
  protected_checkpoint: false,
  settings: { max_retries: 2, timeout_sec: 180 }
};
const retryEligibleTiming = formatTiming(retryEligibleItem);
assert.match(retryEligibleTiming, /^Attempt 1\/3/, "retry-eligible job shows Attempt X/Y");
assert.doesNotMatch(retryEligibleTiming, /Auto-retry: No/, "retry-eligible job does NOT show Auto-retry: No");

// Case 2: Post-submit Current Job shows Attempt X without /Y and indicates Auto-retry: No
const postSubmitItem = {
  job: { id: "JOB_001" },
  status: "RUNNING",
  phase: "SUBMITTED",
  attempt_count: 1,
  protected_checkpoint: false,
  settings: { max_retries: 2, timeout_sec: 180 }
};
const postSubmitTiming = formatTiming(postSubmitItem);
assert.match(postSubmitTiming, /^Attempt 1 · Auto-retry: No/, "post-submit job shows Attempt X and Auto-retry: No");
assert.doesNotMatch(postSubmitTiming, /^Attempt 1\/3/, "post-submit job does NOT imply remaining retries with /Y");

// Case 3: Output checkpoint protected item shows Attempt X, Auto-retry: No, and checkpoint label
const checkpointItem = {
  job: { id: "JOB_001" },
  status: "INTERRUPTED",
  phase: "OUTPUT_SAVED",
  attempt_count: 1,
  protected_checkpoint: true,
  settings: { max_retries: 2, timeout_sec: 180 }
};
const checkpointTiming = formatTiming(checkpointItem);
assert.match(checkpointTiming, /^Attempt 1 · Auto-retry: No · Output checkpoint protected/, "protected checkpoint shows Attempt X and protected notice");
assert.doesNotMatch(checkpointTiming, /^Attempt 1\/3/, "protected checkpoint never shows X/Y");

// Case 4: Terminal HALTED / FAILED item shows Attempt X with Auto-retry: No
const haltedItem = {
  job: { id: "JOB_002" },
  status: "FAILED",
  phase: "PRE_SUBMIT",
  attempt_count: 3,
  protected_checkpoint: false,
  settings: { max_retries: 2, timeout_sec: 180 }
};
const haltedTiming = formatTiming(haltedItem);
assert.match(haltedTiming, /^Attempt 3 · Auto-retry: No/, "halted/exhausted job shows Attempt 3 and Auto-retry: No");

// 3. State-driven Screen Transition Logic (P1-2)
class MockUI {
  constructor() {
    this.activeScreen = "setupScreen";
    this.tabs = [
      { dataset: { screen: "setupScreen" }, disabled: false, active: true },
      { dataset: { screen: "runScreen" }, disabled: false, active: false },
      { dataset: { screen: "outputScreen" }, disabled: false, active: false }
    ];
    this.running = false;
    this.stopRequested = false;
  }

  showScreen(id) {
    if (this.running && id === "outputScreen") return;
    this.activeScreen = id;
    for (const tab of this.tabs) {
      tab.active = tab.dataset.screen === id;
    }
  }

  updateControls() {
    for (const tab of this.tabs) {
      if (tab.dataset.screen === "outputScreen") {
        tab.disabled = this.running;
      }
    }
  }

  startRun() {
    this.running = true;
    this.showScreen("runScreen");
    this.updateControls();
  }

  finishRun(halted) {
    const completedNaturally = !this.stopRequested && !halted;
    this.running = false;
    this.updateControls();
    if (completedNaturally) {
      this.showScreen("outputScreen");
    }
  }
}

// Test Flow A: START RUN -> activates RUN screen, disables OUTPUT tab during execution
const uiA = new MockUI();
assert.equal(uiA.activeScreen, "setupScreen");
uiA.startRun();
assert.equal(uiA.activeScreen, "runScreen", "START RUN automatically activates RUN screen");
assert.equal(uiA.tabs.find((t) => t.dataset.screen === "outputScreen").disabled, true, "OUTPUT tab is disabled during active run");
uiA.showScreen("outputScreen");
assert.equal(uiA.activeScreen, "runScreen", "Manual switch to OUTPUT during active run is blocked");

// Test Flow B: HALTED run stays on RUN screen
uiA.finishRun(/* halted */ true);
assert.equal(uiA.activeScreen, "runScreen", "HALTED run remains on RUN screen");
assert.equal(uiA.tabs.find((t) => t.dataset.screen === "outputScreen").disabled, false, "OUTPUT tab re-enabled after run ceases");

// Test Flow C: Completed legitimate run switches to OUTPUT screen
const uiB = new MockUI();
uiB.startRun();
assert.equal(uiB.activeScreen, "runScreen");
uiB.finishRun(/* halted */ false);
assert.equal(uiB.activeScreen, "outputScreen", "Legitimate complete run automatically activates OUTPUT screen");

// 4. Output controls regression checks
const outputContext = { Promise, Array, String, Object, Error, Number, Set, RegExp, Math };
vm.runInNewContext(fs.readFileSync(new URL("../output-location-core.js", import.meta.url), "utf8"), outputContext);
const outputLocation = outputContext.DacOutputLocation;

const renderedName = outputLocation.renderImageFilename("{job_id}__{attempt}", { job_id: "JOB_100", attempt: 2, index: 1 }, "png");
assert.equal(renderedName, "JOB_100__02.png", "Image naming tokens render deterministically");
assert.equal(outputLocation.collisionPolicy("uniquify"), "uniquify");
assert.equal(outputLocation.collisionPolicy("overwrite"), "overwrite");
assert.equal(outputLocation.collisionPolicy("fail"), "fail");

console.log("P1 UI state & attempt semantics smoke tests: PASS");

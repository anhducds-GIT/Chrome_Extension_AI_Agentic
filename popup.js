import { ObserverEngine } from "./observer-engine.js";

const engine = new ObserverEngine();
const scanButton = document.querySelector("#scan");
const targetList = document.querySelector("#target-list");
const status = document.querySelector("#status");
const reportBox = document.querySelector("#report");
const copyButton = document.querySelector("#copy-report");

let targetsById = new Map();
let lastReport = null;

scanButton.addEventListener("click", scan);
copyButton.addEventListener("click", copyReport);

async function scan() {
  setBusy(true, "Scanning Chrome debug targets…");
  try {
    const targets = await engine.scanTargets();
    targetsById = new Map(targets.map((target) => [target.targetId, target]));
    renderTargets(targets);
    setBusy(false, `Found ${targets.length} debug target${targets.length === 1 ? "" : "s"}.`);
  } catch (error) {
    setBusy(false, `Scan failed: ${error.message || error}`);
  }
}

function renderTargets(targets) {
  targetList.replaceChildren();
  if (targets.length === 0) {
    targetList.innerHTML = '<p class="empty">No debug targets were exposed by Chrome.</p>';
    return;
  }

  for (const target of targets) {
    const card = document.createElement("article");
    card.className = `target${target.extensionRelated ? " extension" : ""}`;
    const title = document.createElement("div");
    title.className = "target-title";
    title.textContent = target.title || "(untitled target)";
    const info = document.createElement("div");
    info.className = "meta";
    info.textContent = `${target.classification.kind} · type=${target.type} · attached=${target.attached}`;
    const url = document.createElement("div");
    url.className = "url";
    url.textContent = target.url || "(no URL)";
    const row = document.createElement("div");
    row.className = "target-row";
    const id = document.createElement("code");
    id.textContent = target.targetId;
    const observe = document.createElement("button");
    observe.type = "button";
    observe.textContent = "Observe";
    observe.disabled = target.attached;
    observe.title = target.attached ? "Already attached; V0 will not take over." : "Attach temporarily and run read-only inspection.";
    observe.addEventListener("click", () => observeTarget(target.targetId, observe));
    row.append(id, observe);
    card.append(title, info, url, row);
    targetList.append(card);
  }
}

async function observeTarget(targetId, button) {
  const target = targetsById.get(targetId);
  if (!target) return;
  button.disabled = true;
  setBusy(true, `Observing ${targetId} with a temporary read-only attach…`);
  try {
    lastReport = await engine.observe(target);
    reportBox.textContent = formatReport(lastReport);
    copyButton.disabled = false;
    setBusy(false, `Observation complete: ${lastReport.observabilityLevel}.`);
  } catch (error) {
    setBusy(false, `Observation failed: ${error.message || error}`);
  } finally {
    button.disabled = target.attached;
  }
}

function formatReport(report) {
  const summary = [
    `OBSERVABILITY: ${report.observabilityLevel}`,
    `TARGET: ${report.target.title || "(untitled)"} (${report.target.classification.kind})`,
    `ACCESS: ${report.access.method}`,
    `RUNTIME: ${report.runtime.accessible ? "accessible" : "unavailable"}`,
    `DOM: ${report.dom.accessible ? "accessible" : "unavailable"}`,
    `ELEMENTS: ${report.elements.count} found; ${report.elements.returned} returned`,
    `LIMITATIONS: ${report.limitations.length ? report.limitations.join(" | ") : "none"}`
  ].join("\n");
  return `${summary}\n\nJSON\n${JSON.stringify(report, null, 2)}`;
}

async function copyReport() {
  if (!lastReport) return;
  try {
    await navigator.clipboard.writeText(JSON.stringify(lastReport, null, 2));
    status.textContent = "JSON report copied.";
  } catch (error) {
    status.textContent = `Copy failed: ${error.message || error}`;
  }
}

function setBusy(isBusy, message) {
  scanButton.disabled = isBusy;
  status.textContent = message;
}

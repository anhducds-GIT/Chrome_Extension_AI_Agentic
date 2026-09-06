import { ObserverEngine } from "./observer-engine.js";
import { validatePairing, TRANSPORT_CONSTANTS } from "./scripts/scouter-transport-loopback.mjs";

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

/* ---- Cửa Bridge: nhận tệp ghép cặp -------------------------------------
 * Popup KHÔNG tự nối socket. Nó chỉ ghi tệp ghép cặp ĐÃ KIỂM vào kho lưu; service worker theo
 * dõi kho lưu và nối. Lý do: popup đóng lại là chết, còn service worker thì sống tiếp — một
 * kết nối mở từ popup sẽ đứt ngay khi Đức bấm ra chỗ khác.
 * Kiểm ngay tại đây bằng CHÍNH hàm mà transport dùng, nên kho lưu không bao giờ chứa một tệp
 * ghép cặp hỏng. */
const pairingInput = document.querySelector("#pairing-file");
const bridgeState = document.querySelector("#bridge-state");

const BRIDGE_TEXT = {
  connected: "Đã nối Bridge.",
  disconnected: "Chưa nối được máy chủ Bridge. Bật máy chủ rồi thử lại.",
  unpaired: "Chưa ghép cặp. Chọn tệp ghép cặp bên dưới."
};

pairingInput.addEventListener("change", savePairing);
renderBridgeState();

async function renderBridgeState() {
  const stored = await chrome.storage.local.get([TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY]);
  const status = stored?.[TRANSPORT_CONSTANTS.STATUS_STORAGE_KEY];
  bridgeState.textContent = BRIDGE_TEXT[status?.status] || BRIDGE_TEXT.unpaired;
}

async function savePairing() {
  const file = pairingInput.files?.[0];
  if (!file) return;
  let pairing;
  try {
    pairing = validatePairing(JSON.parse(await file.text()));
  } catch (error) {
    /* Mã lỗi tiếng Anh, câu cho người đọc tiếng Việt — luật vàng 5. */
    bridgeState.textContent = `Tệp ghép cặp không dùng được (${String(error?.message || error).split(":")[0]}).`;
    return;
  }
  await chrome.storage.local.set({ [TRANSPORT_CONSTANTS.PAIRING_STORAGE_KEY]: pairing });
  bridgeState.textContent = `Đã lưu ghép cặp cho 127.0.0.1:${pairing.port}. Đang nối…`;
  window.setTimeout(renderBridgeState, 1500);
}

function setBusy(isBusy, message) {
  scanButton.disabled = isBusy;
  status.textContent = message;
}

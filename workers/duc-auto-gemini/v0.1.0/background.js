"use strict";
const GEMINI_URLS = ["https://gemini.google.com/*"];
const TERMINAL_KEY = "dag.terminal_attempts.v1";

chrome.runtime.onInstalled.addListener(() => { if (chrome.sidePanel?.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {}); });

async function target() {
  const tabs = await chrome.tabs.query({ url: GEMINI_URLS }); const attempts = [];
  for (const tab of tabs.sort((a, b) => Number(b.active) - Number(a.active) || Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))) {
    try {
      const ping = await chrome.tabs.sendMessage(tab.id, { type: "DAG_PING" });
      if (ping?.ok && ping.receiver === "duc-auto-gemini" && ping.snapshot?.surface !== "WRONG") return { tab, ping };
      attempts.push({ tab_id: tab.id, url: tab.url, reason: ping?.snapshot?.surface || "NO_RECEIVER" });
    } catch (error) { attempts.push({ tab_id: tab.id, url: tab.url, reason: error.message }); }
  }
  const error = new Error("No reachable Gemini Images receiver. Open gemini.google.com/images and reload it once."); error.attempts = attempts; throw error;
}
async function persistTerminal(attempt) {
  if (!attempt) return;
  const current = await chrome.storage.session.get(TERMINAL_KEY); const rows = Array.isArray(current[TERMINAL_KEY]) ? current[TERMINAL_KEY] : [];
  const next = [attempt, ...rows.filter((row) => row.attempt_id !== attempt.attempt_id)].slice(0, 10);
  await chrome.storage.session.set({ [TERMINAL_KEY]: next });
}
async function routeRun(message) {
  const resolved = await target(); const response = await chrome.tabs.sendMessage(resolved.tab.id, message);
  if (response?.attempt && /^(SUCCESS|FAILED_PRE_SUBMIT|OWNER_REVIEW|INTERRUPTED)$/.test(response.attempt.phase)) await persistTerminal(response.attempt).catch(() => {});
  return { ...response, target: { tab_id: resolved.tab.id, url: resolved.tab.url, window_id: resolved.tab.windowId } };
}
async function downloadImage(message) {
  if (!/^https?:|^data:|^blob:/.test(String(message.url || ""))) throw new Error("Generated image URL is not downloadable.");
  const filename = String(message.filename || "Duc Auto Gemini/output.png").replace(/[<>:"|?*]/g, "_").replace(/^[/\\]+/, "");
  const id = await chrome.downloads.download({ url: message.url, filename, conflictAction: "uniquify", saveAs: false });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const [item] = await chrome.downloads.search({ id });
    if (item?.state === "complete") return { id, filename: item.filename, state: item.state, url: item.url };
    if (item?.state === "interrupted") throw new Error(`Download interrupted: ${item.error || "unknown"}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Download completion timeout.");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const action = (async () => {
    if (message?.type === "DAG_RESOLVE_TARGET") { const found = await target(); return { ok: true, tab: { id: found.tab.id, url: found.tab.url, title: found.tab.title }, snapshot: found.ping.snapshot }; }
    if (message?.type === "DAG_ROUTE_RUN") return routeRun({ ...message, type: "DAG_RUN_IMAGE_JOB" });
    if (message?.type === "DAG_ROUTE_READY") { const found = await target(); return chrome.tabs.sendMessage(found.tab.id, { type: "DAG_WAIT_READY", timeout_ms: message.timeout_ms }); }
    if (message?.type === "DAG_ROUTE_ABORT") { const found = await target(); return chrome.tabs.sendMessage(found.tab.id, { type: "DAG_ABORT" }); }
    if (message?.type === "DAG_ROUTE_ADVANCE") { const found = await target(); return chrome.tabs.sendMessage(found.tab.id, { type: "DAG_ADVANCE_ATTEMPT", run_id: message.run_id, job_id: message.job_id, attempt_id: message.attempt_id, next_phase: message.next_phase, values: message.values || {} }); }
    if (message?.type === "DAG_DOWNLOAD_IMAGE") return { ok: true, download: await downloadImage(message) };
    throw new Error("UNSUPPORTED_DAG_MESSAGE");
  })();
  action.then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message, attempts: error.attempts || [] }));
  return true;
});

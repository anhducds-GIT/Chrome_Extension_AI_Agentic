"use strict";
importScripts("binding-core.js");
const Binding = globalThis.DagBindingCore;
const GEMINI_URLS = ["https://gemini.google.com/*"];
const TERMINAL_KEY = "dag.terminal_attempts.v1";
const ATTEMPTS_KEY = "dag.durable_attempts.v1";
const BINDINGS_KEY = "dag.attempt_bindings.v1";

chrome.runtime.onInstalled.addListener(() => { if (chrome.sidePanel?.setPanelBehavior) chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {}); });
async function mapFromStorage(key) { const stored = await chrome.storage.local.get(key); return stored[key] && typeof stored[key] === "object" ? stored[key] : {}; }
async function putMap(key, value) { await chrome.storage.local.set({ [key]: value }); }
async function persistBinding(binding) { const rows = await mapFromStorage(BINDINGS_KEY); rows[binding.key] = binding; await putMap(BINDINGS_KEY, rows); }
async function getBinding(message) { const rows = await mapFromStorage(BINDINGS_KEY); return rows[Binding.attemptKey(message)] || null; }
async function persistAttempt(attempt) {
  if (!attempt?.attempt_id) throw new Error("ATTEMPT_ID_REQUIRED");
  const rows = await mapFromStorage(ATTEMPTS_KEY); rows[Binding.attemptKey(attempt)] = { ...attempt, persisted_at: new Date().toISOString() }; await putMap(ATTEMPTS_KEY, rows);
  if (/^(SUCCESS|FAILED_PRE_SUBMIT|OWNER_REVIEW|INTERRUPTED)$/.test(attempt.phase)) { const current = await chrome.storage.session.get(TERMINAL_KEY); const terminal = Array.isArray(current[TERMINAL_KEY]) ? current[TERMINAL_KEY] : []; await chrome.storage.session.set({ [TERMINAL_KEY]: [attempt, ...terminal.filter((row) => row.attempt_id !== attempt.attempt_id)].slice(0, 10) }); }
}
async function target() {
  const tabs = await chrome.tabs.query({ url: GEMINI_URLS }); const attempts = [];
  for (const tab of tabs.sort((a, b) => Number(b.active) - Number(a.active) || Number(b.lastAccessed || 0) - Number(a.lastAccessed || 0))) {
    try { const ping = await chrome.tabs.sendMessage(tab.id, { type: "DAG_PING" }); if (ping?.ok && ping.receiver === "duc-auto-gemini" && ping.snapshot?.surface === "IMAGES") return { tab, ping }; attempts.push({ tab_id: tab.id, url: tab.url, reason: ping?.snapshot?.surface || "NO_RECEIVER" }); }
    catch (error) { attempts.push({ tab_id: tab.id, url: tab.url, reason: error.message }); }
  }
  const error = new Error("No exact Gemini Images receiver. Open gemini.google.com/images and reload it once."); error.attempts = attempts; throw error;
}
async function boundReceiver(message) {
  const binding = await getBinding(message); if (!binding || !Binding.matches(binding, message)) throw new Error("ATTEMPT_ID_MISMATCH");
  let tab; try { tab = await chrome.tabs.get(binding.tab_id); } catch (_) { throw new Error("BOUND_TAB_MISSING"); }
  let ping; try { ping = await chrome.tabs.sendMessage(tab.id, { type: "DAG_PING" }); } catch (_) { throw new Error("BOUND_TAB_RECEIVER_MISSING"); }
  const checked = Binding.validate(binding, message, tab, ping?.snapshot); if (!checked.ok) throw new Error(checked.reason); return { binding, tab, ping };
}
async function routeRun(message) {
  const resolved = await target(); const binding = Binding.createBinding(message, resolved.tab, resolved.ping.snapshot.surface); await persistBinding(binding);
  const response = await chrome.tabs.sendMessage(resolved.tab.id, { ...message, type: "DAG_RUN_IMAGE_JOB" }); if (response?.attempt && Binding.matches(binding, response.attempt)) await persistAttempt(response.attempt);
  return { ...response, target: { tab_id: resolved.tab.id, url: resolved.tab.url, window_id: resolved.tab.windowId } };
}
async function routeBound(message, payload) { const resolved = await boundReceiver(message); return chrome.tabs.sendMessage(resolved.tab.id, payload); }
async function downloadImage(message) {
  if (!/^https?:|^data:|^blob:/.test(String(message.url || ""))) throw new Error("Generated image URL is not downloadable."); const filename = String(message.filename || "Duc Auto Gemini/output.png").replace(/[<>:"|?*]/g, "_").replace(/^[/\\]+/, "");
  const id = await chrome.downloads.download({ url: message.url, filename, conflictAction: "uniquify", saveAs: false }); const deadline = Date.now() + 60000;
  while (Date.now() < deadline) { const [item] = await chrome.downloads.search({ id }); if (item?.state === "complete") return { id, filename: item.filename, state: item.state, url: item.url }; if (item?.state === "interrupted") throw new Error(`Download interrupted: ${item.error || "unknown"}`); await new Promise((resolve) => setTimeout(resolve, 250)); }
  throw new Error("Download completion timeout.");
}
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = (async () => {
    if (message?.type === "DAG_ATTEMPT_STAGE") { const binding = await getBinding(message.attempt || {}); if (!binding || sender.tab?.id !== binding.tab_id || sender.tab?.windowId !== binding.window_id || !Binding.matches(binding, message.attempt)) throw new Error("ATTEMPT_ID_MISMATCH"); await persistAttempt(message.attempt); return { ok: true, persisted_phase: message.attempt.phase }; }
    if (message?.type === "DAG_GET_ATTEMPTS") { const rows = await mapFromStorage(ATTEMPTS_KEY); return { ok: true, attempts: Object.values(rows).filter((attempt) => !message.run_id || attempt.run_id === message.run_id) }; }
    if (message?.type === "DAG_RESOLVE_TARGET") { const found = await target(); return { ok: true, tab: { id: found.tab.id, url: found.tab.url, title: found.tab.title }, snapshot: found.ping.snapshot }; }
    if (message?.type === "DAG_ROUTE_RUN") return routeRun(message);
    if (message?.type === "DAG_ROUTE_READY") return routeBound(message, { type: "DAG_WAIT_READY", run_id: message.run_id, job_id: message.job_id, attempt_id: message.attempt_id, timeout_ms: message.timeout_ms });
    if (message?.type === "DAG_ROUTE_ABORT") return routeBound(message, { type: "DAG_ABORT", run_id: message.run_id, job_id: message.job_id, attempt_id: message.attempt_id });
    if (message?.type === "DAG_ROUTE_ADVANCE") return routeBound(message, { type: "DAG_ADVANCE_ATTEMPT", run_id: message.run_id, job_id: message.job_id, attempt_id: message.attempt_id, next_phase: message.next_phase, values: message.values || {} });
    if (message?.type === "DAG_DOWNLOAD_IMAGE") return { ok: true, download: await downloadImage(message) };
    throw new Error("UNSUPPORTED_DAG_MESSAGE");
  })(); action.then(sendResponse).catch((error) => sendResponse({ ok: false, error: error.message, attempts: error.attempts || [] })); return true;
});

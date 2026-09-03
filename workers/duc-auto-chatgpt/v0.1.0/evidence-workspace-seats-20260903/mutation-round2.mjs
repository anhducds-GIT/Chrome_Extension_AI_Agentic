// Mutations for the round-2 audit fixes.
import fs from "node:fs";
import { execSync } from "node:child_process";

const root = "C:/WORKING ZONE/Chrome_Extension_AI_Agentic/workers/duc-auto-chatgpt/v0.1.0";
function normalizeTo(content, needle) {
  return content.includes("\r\n") ? needle.replace(/\r?\n/g, "\r\n") : needle.replace(/\r\n/g, "\n");
}

const mutations = [
  { id: "MB1-loadPairing-rollover-close", file: "bridge-transport-loopback.js",
    find: "      if (changed) {\n        profileSeat.close();\n        for (const seat of workspaceSeats.values()) seat.close();\n      }\n      await profileSeat.connect();",
    replace: "      await profileSeat.connect();" },
  { id: "MB2-mark-before-void", file: "bridge-transport-loopback.js",
    find: "        if (store.workspaces.some((entry) => entry.tab_id !== null)) {\n          store = { schema_version: 1, workspaces: store.workspaces.map((entry) => ({ ...entry, tab_id: null })) };\n          await persistWorkspaceStore(store);\n        }\n        try { await sessionApi?.set?.({ [WORKSPACE_SESSION_MARK_KEY]: new Date().toISOString() }); }\n        catch (_) { /* Next start voids again — the safe direction. */ }",
    replace: "        try { await sessionApi?.set?.({ [WORKSPACE_SESSION_MARK_KEY]: new Date().toISOString() }); }\n        catch (_) { }\n        if (store.workspaces.some((entry) => entry.tab_id !== null)) {\n          store = { schema_version: 1, workspaces: store.workspaces.map((entry) => ({ ...entry, tab_id: null })) };\n          await persistWorkspaceStore(store);\n        }" },
  { id: "MB3-onReplaced-queued", file: "bridge-transport-loopback.js",
    find: "    chromeApi.tabs?.onReplaced?.addListener?.((addedTabId, removedTabId) => { closeSeatsBoundToTab(removedTabId); });",
    replace: "    chromeApi.tabs?.onReplaced?.addListener?.((addedTabId, removedTabId) => { queueWorkspaceWork(async () => closeSeatsBoundToTab(removedTabId)); });" },
  { id: "MB4-fail-open-no-session", file: "bridge-transport-loopback.js",
    find: "      let freshBrowserSession = true;",
    replace: "      let freshBrowserSession = Boolean(chromeApi.storage.session);" }
];

const tests = ["tests/bridge-workspace-seats-smoke.mjs"];
let allRed = true;
for (const mutation of mutations) {
  const path = `${root}/${mutation.file}`;
  const original = fs.readFileSync(path, "utf8");
  const find = normalizeTo(original, mutation.find);
  if (!original.includes(find)) { console.log(`${mutation.id}: FIND-MISS (harness bug)`); allRed = false; continue; }
  fs.writeFileSync(path, original.replace(find, normalizeTo(original, mutation.replace)));
  let survived = true;
  try {
    for (const test of tests) execSync(`node ${test}`, { cwd: root, stdio: "pipe", timeout: 120000 });
  } catch (_) { survived = false; }
  fs.writeFileSync(path, original);
  console.log(`${mutation.id}: ${survived ? "SURVIVED (decorative pin!)" : "killed"}`);
  if (survived) allRed = false;
}
console.log(allRed ? "ALL MUTANTS KILLED" : "SOME MUTANTS SURVIVED");

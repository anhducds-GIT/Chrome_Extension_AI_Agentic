// Mutations for the 03/09 audit fixes (F1..F5). Repo committed at c6e6f48.
import fs from "node:fs";
import { execSync } from "node:child_process";

const root = "C:/WORKING ZONE/Chrome_Extension_AI_Agentic/workers/duc-auto-chatgpt/v0.1.0";
function normalizeTo(content, needle) {
  return content.includes("\r\n") ? needle.replace(/\r?\n/g, "\r\n") : needle.replace(/\r\n/g, "\n");
}

const mutations = [
  { id: "MA1-sync-close-on-pairing-set", file: "bridge-transport-loopback.js",
    find: "          for (const seat of workspaceSeats.values()) seat.close();\n          await profileSeat.connect();",
    replace: "          await profileSeat.connect();" },
  { id: "MA2-onReplaced", file: "bridge-transport-loopback.js",
    find: "    chromeApi.tabs?.onReplaced?.addListener?.((addedTabId, removedTabId) => {\n      queueWorkspaceWork(async () => {\n        for (const seat of workspaceSeats.values()) {\n          if (seat.workspace()?.tab_id === removedTabId) seat.close();\n        }\n      });\n    });",
    replace: "" },
  { id: "MA3-session-strip", file: "bridge-transport-loopback.js",
    find: "        if (freshBrowserSession && store.workspaces.some((entry) => entry.tab_id !== null)) {\n          store = { schema_version: 1, workspaces: store.workspaces.map((entry) => ({ ...entry, tab_id: null })) };\n          await persistWorkspaceStore(store);\n        }",
    replace: "" },
  { id: "MA4-impostor-id", file: "bridge-workspace-core.js",
    find: "    if (String(workspace.workspace_id) === String(profileInstance.instance_id)) return null;",
    replace: "" },
  { id: "MA5-instance-serialization", file: "bridge-transport-loopback.js",
    find: "    function loadInstance() {\n      return queueInstanceWork(loadInstanceNow);\n    }",
    replace: "    function loadInstance() {\n      return loadInstanceNow();\n    }" }
];

const tests = ["tests/bridge-workspace-seats-smoke.mjs", "tests/bridge-multiprofile-transport-async-smoke.mjs"];
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

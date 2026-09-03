// Mutation run for the workspace-seat layer: delete each protection, prove a
// test goes red, restore. Repo state is COMMITTED (54160a2) before this runs.
import fs from "node:fs";
import { execSync } from "node:child_process";

const root = "C:/WORKING ZONE/Chrome_Extension_AI_Agentic/workers/duc-auto-chatgpt/v0.1.0";
const T = (file) => `${root}/${file}`;

function normalizeTo(content, needle) {
  // Match the file's newline convention (CRLF checkouts bit us on 02/09).
  return content.includes("\r\n") ? needle.replace(/\r?\n/g, "\r\n") : needle.replace(/\r\n/g, "\n");
}

const mutations = [
  { id: "M1-tab-guard", file: "bridge-transport-loopback.js",
    find: "          if (!usable) {\n            closeSocket();\n            return safeStatus(currentState());\n          }",
    replace: "" },
  { id: "M2-onRemoved", file: "bridge-transport-loopback.js",
    find: "          if (seat.workspace()?.tab_id === tabId) seat.close();",
    replace: "          ;" },
  { id: "M3-onUpdated-close", file: "bridge-transport-loopback.js",
    find: "          } else {\n            seat.close();\n          }",
    replace: "          }" },
  { id: "M4-workspace-on-port", file: "bridge-transport-loopback.js",
    find: "        if (workspace) message.workspace = { workspace_id: workspace.workspace_id, name: workspace.name, tab_id: workspace.tab_id };",
    replace: "" },
  { id: "M5-anonymous-workspace-auth", file: "bridge-transport-loopback.js",
    find: "          if (!isProfile && !instance) {\n            abandonSocket(targetSocket, 1008, \"Workspace identity unavailable.\");\n            return;\n          }",
    replace: "" },
  { id: "M6-cap", file: "bridge-workspace-core.js",
    find: "    if (existingIndex < 0 && base.workspaces.length >= MAX_WORKSPACES) {\n      throw workspaceError(\"WORKSPACE_LIMIT\",",
    replace: "    if (false) {\n      throw workspaceError(\"WORKSPACE_LIMIT\"," },
  { id: "M7-dup-name", file: "bridge-workspace-core.js",
    find: "      if (other.name.toLowerCase() === nameKey) throw workspaceError(\"WORKSPACE_NAME_TAKEN\",",
    replace: "      if (false) throw workspaceError(\"WORKSPACE_NAME_TAKEN\"," },
  { id: "M8-dup-tab", file: "bridge-workspace-core.js",
    find: "      if (other.tab_id === input.tab_id) throw workspaceError(\"WORKSPACE_TAB_TAKEN\",",
    replace: "      if (false) throw workspaceError(\"WORKSPACE_TAB_TAKEN\"," },
  { id: "M9-rename-cycle", file: "bridge-transport-loopback.js",
    find: "        if (changed) {\n          existing.close();\n          await existing.connect().catch(() => {});\n        } else if (!existing.isAuthenticated()) {",
    replace: "        if (!existing.isAuthenticated()) {" },
  { id: "M10-upsert-door", file: "bridge-transport-loopback.js",
    find: "          const usable = await workspaceTabUsable(message.tab_id);\n          if (!usable) {\n            const error = new Error(\"Tab được gắn phải là một tab ChatGPT đang mở.\");\n            error.code = \"WORKSPACE_TAB_INVALID\";\n            throw error;\n          }",
    replace: "" },
  { id: "M11-store-cap", file: "bridge-workspace-core.js",
    find: "      if (workspaces.length >= MAX_WORKSPACES) break;",
    replace: "" },
  { id: "M12-panel-fail-closed", file: "sidepanel.js",
    find: "      throw new Error(`RECEIVER_LOST: tab của phiên làm việc '${name}' đã đóng hoặc không còn ở ChatGPT. Mở lại trang và gắn lại phiên trong side panel.`);",
    replace: "      return null;" },
  { id: "M13-trial-workspace-bind", file: "sidepanel.js",
    find: "      await bindRunTab(await resolveWorkspaceTab(call));",
    replace: "      await bindRunTab();" }
];

const tests = ["tests/bridge-workspace-seats-smoke.mjs", "tests/bound-tab-static.mjs"];
let allRed = true;
for (const mutation of mutations) {
  const path = T(mutation.file);
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

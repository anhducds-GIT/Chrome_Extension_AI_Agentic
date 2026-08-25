// BRIDGE tab "Cần thao tác của Đức" attention hub (owner request 2026-08-24):
// human-gesture blocks surfaced by Bridge calls must render as actionable rows
// inside the BRIDGE tab instead of scattering the operator across SETUP/RUN.
// Asserts wiring/logic only — never operator-facing caption text (AGENTS.md #4).
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "sidepanel.html"), "utf8");
const js = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");

function segment(source, startAnchor, endAnchor, label) {
  const start = source.indexOf(startAnchor);
  const end = source.indexOf(endAnchor, start + startAnchor.length);
  assert.ok(start >= 0, `${label}: start anchor missing (${startAnchor})`);
  assert.ok(end > start, `${label}: end anchor missing (${endAnchor})`);
  const piece = source.slice(start, end);
  assert.ok(piece.length > 0, `${label}: empty segment`);
  return piece;
}

// --- HTML: attention card lives inside the BRIDGE screen, badge inside the tab button.
const bridgeScreen = segment(html, '<section id="bridgeScreen"', 'class="card bridge-activity-card"', "bridgeScreen html");
for (const id of ["bridgeAttentionCard", "bridgeAttentionList", "bridgeAttentionCount"]) {
  assert.match(bridgeScreen, new RegExp(`id="${id}"`), `${id} must be inside bridgeScreen`);
}
const tabButton = segment(html, 'data-screen="bridgeScreen"', "</button>", "bridge tab button");
assert.match(tabButton, /id="bridgeTabAttentionBadge"/, "attention badge must live inside the BRIDGE tab button");
assert.match(tabButton, /hidden/, "badge starts hidden");

// --- JS: ids registered for lookup.
for (const id of ["bridgeAttentionCard", "bridgeAttentionList", "bridgeAttentionCount", "bridgeTabAttentionBadge"]) {
  assert.match(js, new RegExp(`"${id}"`), `${id} must be in the els id list`);
}

// --- JS: every executor-handler failure funnels through the attention mapper.
const withBridgeErrors = segment(js, "function withBridgeErrors", "async function", "withBridgeErrors");
assert.match(withBridgeErrors, /bridgeAttentionFromError\(/, "withBridgeErrors catch must raise attention");

// --- JS: the mapper covers the four human-gesture block classes by error CODE
// (codes are identifiers, stable; captions are not asserted).
const mapper = segment(js, "function bridgeAttentionFromError", "function renderBridgeActivityFeed", "bridgeAttentionFromError");
assert.match(mapper, /PERSISTENCE_VERIFICATION_FAILED/);
assert.match(mapper, /WORKBOOK_NOT_LOADED/);
assert.match(mapper, /OUTPUT_PROFILE_UNBOUND/);
assert.match(mapper, /RUN_ACTIVE/);

// --- JS: a verified direct mutation clears all attention rows (commit path),
// and a satisfied workbook requirement clears the workbook row (read path).
const commitRegion = segment(js, "recordBridgeActivity(applied.auditEvent)", "refreshBridgeScreen()", "commit region");
assert.match(commitRegion, /clearBridgeAttention\(\)/, "successful mutation commit must clear attention");
const requireWb = segment(js, "function requireBridgeWorkbook", "async function currentLedgerEtag", "requireBridgeWorkbook");
assert.match(requireWb, /clearBridgeAttention\(\["WORKBOOK_NEEDED"\]\)/);

// --- JS: renderer builds DOM nodes (element()/replaceChildren), wires the two
// action kinds to the real handlers, and never uses HTML-string sinks.
const renderer = segment(js, "function renderBridgeAttention", "function raiseBridgeAttention", "renderBridgeAttention");
assert.match(renderer, /replaceChildren\(\)/);
assert.match(renderer, /openFolderPickDialog\(\)/, "folder action must reuse the existing pick dialog (user gesture)");
assert.match(renderer, /showScreen\("setupScreen"\)/, "setup action must reuse the existing tab switch");
// "AI là bộ não, người là cánh tay": the workbook row launches the real file
// pickers directly from the row instead of sending the operator to SETUP.
assert.match(renderer, /resumeWorkbookInput\?\.click\(\)/, "workbook row must open the continue-run picker in place");
assert.match(renderer, /workbookInput\?\.click\(\)/, "workbook row must open the new-workbook picker in place");
// Each row names the exact target path with a one-click copy (user-select: all
// fallback lives in CSS). The path must render via textContent (element()).
assert.match(renderer, /item\.suggestion/, "renderer must show the suggested path");
// One Copy button per path line — copying a multi-path blob would paste as
// garbage into a folder picker (Codex cross-audit finding).
assert.match(renderer, /String\(item\.suggestion\)\.split\("\\n"\)/, "multi-path suggestions must render per line");
assert.match(renderer, /clipboard\.writeText\(line\)/, "each line must copy individually");
const attentionMapper = segment(js, "function bridgeAttentionFromError", "function renderBridgeActivityFeed", "mapper suggestion");
assert.match(attentionMapper, /folderHint/, "mapper must attach the AI's target folder as the suggestion");

// --- Proactive probe: opening the BRIDGE tab must detect a revoked folder
// permission by itself (queryPermission via preflight — no failed agent call
// needed), and a completed folder pick must re-probe so the row self-clears.
const probe = segment(js, "async function probeBridgePersistence", "function bridgeAttentionFromError", "probeBridgePersistence");
assert.match(probe, /DacOutputLocation\.preflight/);
assert.match(probe, /clearBridgeAttention\(\["FOLDER_REAUTH_NEEDED"\]\)/);
assert.match(probe, /raiseBridgeAttention\("FOLDER_REAUTH_NEEDED"/);
// Root cause of the row-never-appears bug: outputSettings only exists after a
// workbook loads. The probe must fall back to the stored IndexedDB profiles.
assert.match(probe, /DacOutputProfiles\.list\(\)/, "probe must check stored profiles when no session settings exist");
assert.match(probe, /DacOutputProfiles\.resolve\(/, "probe must resolve stored profile permission");
// And the folder picker must survive a null outputSettings (BRIDGE-tab pick
// before any workbook) — picker first (user gesture), defaults built after.
const chooser = segment(js, "async function choosePrimaryDestination()", "function choosePrimaryDestinationFromUserGesture", "choosePrimaryDestination");
assert.ok(chooser.indexOf("showDirectoryPicker(") < chooser.indexOf("DacOutputProfiles.bind("), "picker must run before any await that could expire the gesture");
assert.match(chooser, /if \(!state\.outputSettings\) state\.outputSettings = window\.DacOutputLocation\.fromWorkbook\(/, "null outputSettings must be initialized, not dereferenced");
const profileCore = fs.readFileSync(path.join(root, "output-profile-core.js"), "utf8");
assert.match(profileCore, /async function list\(\)/, "profile store must expose list()");
assert.match(profileCore, /async function setHint\(/, "profile store must persist the authored folder path");
assert.match(profileCore, /\{ DB_NAME, STORE, profileId, get, list, bind, setHint, resolve \}/, "list()/setHint() must be exported");
// One-click copy must yield the REAL path when a workbook ever recorded one:
// hints are persisted on workbook profile resolution and on folder pick, and
// the probe prefers last_known_folder_hint over the bare folder name.
assert.match(probe, /last_known_folder_hint/, "probe suggestion must prefer the persisted real path");
const resolveProfileRegion = segment(js, "async function resolveOutputProfile", "async function resolveResultProfile", "resolveOutputProfile");
assert.match(resolveProfileRegion, /DacOutputProfiles\.setHint\(/, "workbook load must persist the folder hint onto the profile");
// Hint/profile affinity: the hint must be snapshotted BEFORE the await on
// resolve(), from the same config that supplied profileId (Codex finding).
assert.ok(resolveProfileRegion.indexOf("folderHint") < resolveProfileRegion.indexOf("DacOutputProfiles.resolve("), "hint must be captured before the resolve await");
// The picker must NOT stamp the workbook's hint onto an arbitrary picked
// folder — that would persist a false path (Codex finding).
assert.doesNotMatch(chooser, /setHint\(/, "folder pick must not stamp a hint");
// setHint must be a single readwrite transaction (no get+put across
// transactions — lost-update race, Codex finding).
const setHintRegion = profileCore.slice(profileCore.indexOf("async function setHint"), profileCore.indexOf("async function resolve"));
assert.match(setHintRegion, /txn\.oncomplete/, "setHint must resolve on transaction completion");
assert.doesNotMatch(setHintRegion, /await get\(/, "setHint must not read in a separate transaction");
const refresh = segment(js, "async function refreshBridgeScreen", "async function bridgeLedgerRead", "refreshBridgeScreen");
assert.match(refresh, /probeBridgePersistence\(\)/, "BRIDGE tab refresh must run the proactive probe");
// Codex cross-audit finding #2: the probe must run BEFORE the status ping so a
// rejected ping cannot skip it.
assert.ok(refresh.indexOf("probeBridgePersistence()") < refresh.indexOf("bridgeSystemPing()"), "probe must precede the status ping");
// Codex cross-audit finding #1: one authorized profile must not suppress
// another profile's revocation — no early break out of the blocked scan.
assert.doesNotMatch(probe, /blocked\.length = 0/, "an authorized profile must not clear other profiles' blocks");
const pickers = segment(js, "function choosePrimaryDestinationFromUserGesture", "function folderPickRunner", "picker re-probe");
assert.ok((pickers.match(/probeBridgePersistence\(\)/g) || []).length >= 2, "both folder pickers must re-probe after picking");

// --- "Ẩn" is a recoverable dismissal, never a delete: rows keep a dismissed
// flag, the badge counts only visible rows, and a restore button un-hides all.
assert.match(html, /id="bridgeAttentionRestoreBtn"/, "restore button must exist in the card");
assert.match(js, /"bridgeAttentionRestoreBtn"/, "restore button must be in the els id list");
assert.match(renderer, /item\.dismissed/, "renderer must filter by the dismissed flag");
assert.doesNotMatch(renderer, /clearBridgeAttention\(\[item\.code\]\)/, "the dismiss button must not delete the row");
assert.match(js, /bridgeAttentionRestoreBtn\?\.addEventListener/, "restore button must be wired");

// --- Startup: the badge must be computable WITHOUT visiting the BRIDGE tab —
// init must render attention and run the probe (the "vẫn bị ẩn" live bug).
const initRegion = segment(js, "renderBridgeTransportStatus(); renderBridgeActivityFeed();", "chrome.storage?.onChanged", "panel init");
assert.match(initRegion, /renderBridgeAttention\(\)/, "init must render attention");
assert.match(initRegion, /probeBridgePersistence\(\)/, "init must run the proactive probe");
assert.doesNotMatch(renderer, /innerHTML|insertAdjacentHTML|outerHTML/);

// --- Attention definitions exist for every code the mapper can raise.
const defs = segment(js, "const BRIDGE_ATTENTION_DEFS", "function renderBridgeAttention", "BRIDGE_ATTENTION_DEFS");
for (const code of ["FOLDER_REAUTH_NEEDED", "FOLDER_BIND_NEEDED", "WORKBOOK_NEEDED", "PERSISTENCE_TOGGLES_OFF"]) {
  assert.match(defs, new RegExp(code), `definition missing for ${code}`);
}

console.log("bridge-attention-static: all assertions passed");

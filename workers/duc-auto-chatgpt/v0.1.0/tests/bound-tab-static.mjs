/* A run drives ONE tab, chosen once, at the moment it starts.

   Before 2026-08-26 `activeTab()` re-resolved "the active tab in the current
   window" on EVERY message. Switching tabs mid-run silently redirected the
   runner into whatever ChatGPT tab happened to be in front: a job's prompt
   typed into the wrong conversation, and another chat's images read back as
   this job's output. Attribution cannot defend against that -- it reasons
   about one page, and it was handed a different one.

   It bit twice in a single session (2026-08-26): a trial ran against the
   empty new-chat page while the owner's conversation sat in another tab, and
   a diagnostic probe reported on a tab that was not the one being debugged.

   These are static checks: the side panel cannot be exercised headlessly, so
   the guarantees are pinned by reading the source. */
import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

const between = (from, to) => {
  const start = sidepanel.indexOf(from);
  assert.ok(start > 0, `anchor not found: ${from}`);
  const end = to ? sidepanel.indexOf(to, start) : sidepanel.length;
  assert.ok(end > start, `end anchor not found after ${from}: ${to}`);
  return sidepanel.slice(start, end);
};

// --- the binding exists -------------------------------------------------
assert.match(sidepanel, /boundTabId: null,/, "the bound tab is run state, not a local");
assert.match(sidepanel, /boundTabUrl: "",/);
assert.match(sidepanel, /async function bindRunTab\(\)/);
assert.match(sidepanel, /function releaseRunTab\(\)/);

// --- binding is chosen ONCE ---------------------------------------------
const bind = between("async function bindRunTab()", "function releaseRunTab()");
assert.match(bind, /if \(state\.boundTabId !== null\) return state\.boundTabId;/, "binding is idempotent, so a second caller cannot re-pick the tab");
assert.match(bind, /pickActiveChatGPTTab\(\)/);

// --- once bound, the tab is resolved by ID and never re-picked ----------
const resolve = between("async function activeTab()", "async function send(message)");
assert.match(resolve, /if \(state\.boundTabId === null\) return pickActiveChatGPTTab\(\);/, "only an UNBOUND caller may fall back to the active tab");
assert.match(resolve, /await chrome\.tabs\.get\(state\.boundTabId\)/, "a bound run resolves its tab by id");
assert.doesNotMatch(resolve, /chrome\.tabs\.query/, "a bound run must never re-query for the active tab");

// --- a lost or navigated-away tab is RECEIVER_LOST, not a silent swap ---
// RECEIVER_LOST is a hard stop. Continuing would mean guessing which tab the
// operator meant, which is the whole bug.
// Four ways a bound tab can stop being the right one: the get() throws, the
// tab has no id, it left ChatGPT, or it moved to another conversation.
assert.equal((resolve.match(/RECEIVER_LOST:/g) || []).length, 4, "every wrong-tab verdict reports RECEIVER_LOST");
assert.match(resolve, /is gone\. Reopen the conversation and start a new run\./);
assert.match(resolve, /is no longer on ChatGPT/);

// --- the same tab is not the same CONVERSATION --------------------------
// Sending the first prompt from chatgpt.com/ legitimately navigates to
// /c/<id>, so an unset id adopts what the run's own submission created. After
// that the conversation is fixed: drifting to another chat -- an operator
// click, a sidebar link, a back button -- would type this job's prompt into
// someone else's thread and read that thread's images back as this job's
// output. Same defect as the unbound tab, one level down.
assert.match(sidepanel, /function conversationIdOf\(url\)/);
assert.match(sidepanel, /boundConversationId: null,/);
assert.match(resolve, /if \(state\.boundConversationId === null\) \{/, "an unset conversation adopts the one this run created");
assert.match(resolve, /\} else if \(current !== state\.boundConversationId\) \{/, "a changed conversation is refused");
assert.match(resolve, /has moved to a different conversation/);
assert.match(resolve, /Nothing was sent there\./, "the operator is told no prompt leaked into the other chat");
// Going BACK to the new-chat page must also be refused, not silently adopted.
assert.match(resolve, /now '\$\{current \|\| "the new-chat page"\}'/);
assert.match(sidepanel, /releaseRunTab\(\)[\s\S]{0,200}boundConversationId = null;|boundConversationId = null;/, "release clears the conversation lock too");

// --- a URL that is not knowable YET must not hard-stop a healthy run ----
// Mid-commit Chrome reports an empty url with the destination in pendingUrl,
// and briefly neither. Judging origin on "" would hard-stop every run at its
// first prompt, because that is exactly when the page navigates.
assert.match(resolve, /const url = tab\.url \|\| tab\.pendingUrl \|\| "";/, "pendingUrl is consulted before declaring a tab off-origin");
assert.match(resolve, /if \(!url\) return tab;/, "an unknowable address defers to the content-script ping instead of halting");
assert.ok(
  resolve.indexOf("if (!url) return tab;") < resolve.indexOf("if (!isChatGPTTabUrl(url))"),
  "the transient case is handled BEFORE the origin verdict"
);

// --- bound BEFORE validation, on both entry paths -----------------------
// authoritativeValidate() talks to the page. Binding after it would let a run
// be validated against one tab and then executed against another.
const runStart = between("async function run(mode = \"all\")", "queueRunLock.promoteRun();");
assert.ok(
  runStart.indexOf("await bindRunTab();") < runStart.indexOf("await authoritativeValidate("),
  "run() binds before it validates"
);
const trial = between("async function bridgeRunTrial(params)", "async function bridgeRunStop()");
assert.ok(
  trial.indexOf("await bindRunTab();") > 0 && trial.indexOf("await bindRunTab();") < trial.indexOf("await authoritativeValidate()"),
  "the bridge trial binds before it validates too -- it reaches the page before run() is ever called"
);

// --- every exit path releases -------------------------------------------
// A binding that outlived its run would pin the NEXT run to a stale tab.
assert.ok((sidepanel.match(/releaseRunTab\(\);/g) || []).length >= 4, "release is wired on the failure, empty-queue, trial-rejected and normal-completion paths");
assert.match(sidepanel, /state\.running = false; state\.stopRequested = false; releaseRunTab\(\);/, "the normal end-of-run cleanup releases the tab");
const trialTail = between("async function bridgeRunTrial(params)", "async function bridgeRunStop()");
assert.match(trialTail, /if \(!accepted\) \{[\s\S]*releaseRunTab\(\);/, "a rejected trial does not leave a tab bound");

console.log("bound tab static checks: PASS");

import assert from "node:assert/strict";
import fs from "node:fs";

const read = (name) => fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const content = read("content.js");
const sidepanel = read("sidepanel.js");
const manifest = JSON.parse(read("manifest.json"));
const html = read("sidepanel.html");

// --- the policy module is actually loaded in both worlds ---------------
const contentScripts = manifest.content_scripts[0].js;
assert.ok(contentScripts.includes("ab-poll-core.js"), "the page needs the poll policy");
assert.ok(
  contentScripts.indexOf("ab-poll-core.js") < contentScripts.indexOf("content.js"),
  "ab-poll-core.js must load before content.js"
);
assert.ok(
  html.indexOf('src="ab-poll-core.js"') >= 0 && html.indexOf('src="ab-poll-core.js"') < html.indexOf('src="runner-core.js"'),
  "runner-core.js validates ab_poll_action through DacAbPoll, so it must load after it"
);

// --- the poll is answered in the readiness gate, never mid-detection ---
// The images this job must save are still on screen while waitForCompletion
// runs, and their blob/CDN URLs are still live. Clicking the poll there could
// tear them down before sidepanel.js has persisted them, so detection only
// RECORDS the poll; the click happens in the gate, which runs after the job's
// output step has finished either way (saved, or detected-not-downloaded).
assert.match(content, /const livePoll = findAbPoll\(\);/, "waitForCompletion records the poll");
assert.match(content, /abPollSeen = \{ detected: true, answered: false/, "detection never claims to have answered");
const completionStart = content.indexOf("async function waitForCompletion");
const readyStart = content.indexOf("async function waitForChatReady");
assert.ok(completionStart > 0 && readyStart > completionStart, "unexpected function order");
const completionBody = content.slice(completionStart, readyStart);
const readyBody = content.slice(readyStart, content.indexOf("async function runPrompt"));
assert.doesNotMatch(completionBody, /answerAbPoll\(/, "waitForCompletion must never click the poll");
assert.match(content.slice(readyStart), /const outcome = await answerAbPoll\(abPollAction\)/, "the readiness gate answers the poll");

// --- safety outranks the poll, in both directions ----------------------
// Clicking ChatGPT before the security/quota hard-stop is enforced, or while
// generation is still running, would use the poll as a way around the gate.
assert.match(content, /function pollInteractionBlocker\(\)/);
for (const check of ["securityBlockerText()", "generationLimitText()", "findStopButton()"]) {
  assert.ok(content.slice(content.indexOf("function pollInteractionBlocker")).slice(0, 600).includes(check), `the poll blocker must consult ${check}`);
}
const answerStart = content.indexOf("async function answerAbPoll");
const answerBody = content.slice(answerStart, content.indexOf("async function waitForCompletion"));
assert.match(answerBody, /const blocked = pollInteractionBlocker\(\);/, "blocked before an answer is even chosen");
assert.ok(
  answerBody.indexOf("const blockedNow = pollInteractionBlocker();") < answerBody.indexOf("target.click();"),
  "re-checked in the instant before the click, so a blocker that appeared meanwhile still wins"
);

// --- a poll is answered at most once -----------------------------------
// Keyed on the assistant message NODE, not its fingerprint: answering changes
// the block's content, and a fingerprint key would read the answered block as
// a brand-new unanswered poll and loop forever.
assert.match(content, /answeredPolls: new Set\(\)/);
assert.match(content, /function abPollOpen\(\)/);
assert.doesNotMatch(content, /answeredPolls\.(?:has|add)\(poll\.fingerprint\)/);
// Only ChatGPT actually closing the block counts as answered. A click the
// page never acted on must NOT make the poll vanish from readiness.
assert.match(content, /if \(cleared\) STATE\.answeredPolls\.add\(poll\.node_id\);/);
assert.ok(
  answerBody.indexOf("if (cleared) STATE.answeredPolls.add(poll.node_id);") > answerBody.indexOf("target.click();"),
  "answered is recorded only after verified closure, never before the click"
);
// Attempts are capped separately so an ineffective click is not repeated forever.
assert.match(content, /STATE\.pollAttempts\.set\(poll\.node_id, \(STATE\.pollAttempts\.get\(poll\.node_id\) \|\| 0\) \+ 1\);/);
assert.match(content, />= AB_POLL_MAX_ATTEMPTS\) return null;/);
assert.match(readyBody, /if \(abPollOpen\(\)\) \{/, "the readiness loop only clicks polls that are still worth clicking");
// A human who answers by hand must be able to unblock the run: an unanswered
// question with no answerable control blocks only for a bounded grace period.
assert.match(content, /AB_POLL_CONTROL_GRACE_MS/);
const pendingBody = content.slice(content.indexOf("function abPollPending()"), content.indexOf("async function waitForPollCleared"));
assert.match(pendingBody, /if \(poll\.choices\.length \|\| poll\.skip\) return true;/, "a real answerable poll always blocks");
assert.match(pendingBody, /return Date\.now\(\) - \(STATE\.pollFirstSeen\.get\(poll\.node_id\) \|\| 0\) < AB_POLL_CONTROL_GRACE_MS;/);
assert.match(content, /aria-disabled|aria-pressed/, "already-answered controls are not clickable candidates");

// --- readiness is fail-closed on an UNRECOGNISED poll ------------------
// The composer is locked by the poll itself, not by its buttons. Reporting
// "no poll" when no control is recognised would let readiness call a locked
// composer READY and send the next prompt into a chat that cannot accept it.
assert.doesNotMatch(content, /if \(!choices\.length && !skip\) return null;/, "a poll with unrecognised controls is still a poll");
const findPollBody = content.slice(content.indexOf("function findAbPoll()"), content.indexOf("function abPollOpen()"));
assert.match(findPollBody, /if \(!window\.DacAbPoll\.isQuestionText\(text\)\) return null;/, "the question text is the only thing that decides a poll exists");
assert.equal((findPollBody.match(/return null;/g) || []).length, 2, "findAbPoll returns null only for 'no assistant turn' and 'no poll question'");

// --- the audit never claims an answer ChatGPT did not accept -----------
assert.match(sidepanel, /const event = outcome\.cleared \? "AB_POLL_ANSWERED" : "AB_POLL_CLICK_UNCONFIRMED";/);
assert.match(sidepanel, /if \(outcome\.clicked\) \{/, "the audit branches on what was clicked, not on an assumed answer");
// clicked stays a boolean: the description of the control that was clicked
// lives under its own key, or it would silently overwrite the flag.
assert.match(content, /clicked_control: describeControl\(target\)/);
assert.equal((content.match(/^\s+clicked: /gm) || []).length, 1, "exactly one 'clicked' key in the outcome");
assert.match(content, /answered: cleared,/, "an outcome is only 'answered' once ChatGPT accepted the click");
assert.doesNotMatch(content, /answered: true,\n      kind: instruction\.kind/);

// --- readiness never reports READY while a poll is pending -------------
assert.equal(
  (readyBody.match(/abPollPending: abPollPending\(\)/g) || []).length,
  2,
  "both the first and the confirming readiness evaluation must see the poll"
);
assert.match(readyBody, /if \(outcome && !outcome\.clicked\) await sleep\(1000\)/, "a refusal keeps waiting instead of busy-looping");

// --- only the newest assistant turn is ever clicked --------------------
assert.match(content, /const message = messages\[messages\.length - 1\];/, "an older answered poll must never be re-clicked");
assert.match(content, /if \(!window\.DacAbPoll\.isQuestionText\(text\)\) return null;/);

// --- every live encounter captures the block's real attributes ---------
// ChatGPT's testids/classes for this block are unknown and will churn; the
// diagnostics are how the next revision gets anchored on something durable.
for (const field of ["message_testid", "choice_controls", "skip_control", "question_text"]) {
  assert.ok(content.includes(field), `poll diagnostics must capture ${field}`);
}
assert.match(content, /function describeControl\(element\)/);

// --- multi-image plumbing ---------------------------------------------
assert.match(content, /turn_id: turnId/, "candidates carry the assistant turn they belong to");
assert.match(content, /image_urls: candidates\.map\(\(candidate\) => candidate\.source\)/);
assert.match(content, /maxImages: Math\.max\(1, Math\.min\(Number\(message\.maxImages\) \|\| 1, 20\)\)|Math\.max\(1, Math\.min\(Number\(message\.maxImages\) \|\| 1, 20\)\)/);
assert.match(sidepanel, /maxImages: item\.settings\.max_images_per_job/);
assert.match(sidepanel, /abPollAction: item\.settings\.ab_poll_action/);

// --- every image of a multi-image job is saved and recorded ------------
assert.match(sidepanel, /const imageUrls = Array\.isArray\(result\.image_urls\) && result\.image_urls\.length \? result\.image_urls : \[result\.image_url\];/);
assert.match(sidepanel, /const accepted = await saveGeneratedImage\(imageUrl, item, imageLocationFor\(item, effectiveOutput\), variant\);/);
assert.match(sidepanel, /state\.verifiedImageFiles\.push\(accepted\.filename\)/, "each variant enters the verified set");
assert.match(sidepanel, /result_files: savedFiles\.join\(" \| "\)/, "the ledger records the whole verified set, not just the first file");
assert.match(sidepanel, /write_outcome: writeOutcomes\.join\(" \| "\)/, "per-file write outcomes are not collapsed into the first file's");
// Variants written before a mid-set failure are real files on disk; the
// ledger must not claim the job wrote nothing while orphans sit in the folder.
assert.match(sidepanel, /audit\("OUTPUT_PARTIAL", item/);
assert.match(sidepanel, /image_count: `\$\{savedFiles\.length\}\/\$\{totalVariants\}`/);
assert.match(sidepanel, /image_count: String\(totalVariants\)/);
assert.match(sidepanel, /result_file: firstAccepted\.filename/, "result_file stays the first variant so existing readers keep working");
assert.match(sidepanel, /effective_ab_poll_action: settings\.ab_poll_action/, "the run's poll policy is recorded in the config snapshot");
assert.match(sidepanel, /effective_max_images_per_job: settings\.max_images_per_job/);

// --- the interaction is audited either way -----------------------------
assert.match(sidepanel, /audit\(event, item, \{ message: `action=\$\{outcome\.action\}/);
assert.match(sidepanel, /audit\("AB_POLL_UNANSWERED", item/);
assert.match(sidepanel, /recordAbPollOutcome\(item, response\?\.ab_poll\);/);
assert.ok(
  sidepanel.indexOf("recordAbPollOutcome(item, response?.ab_poll);") < sidepanel.indexOf('if (!response?.ok) throw new Error(response?.error || "ChatGPT did not become ready'),
  "a poll answered before a gate timeout must still be audited"
);

// --- the security hard-stop is untouched -------------------------------
// It still fires at exactly the same point; it now carries the refused poll
// out with it so the refusal is audited instead of being lost.
assert.match(content, /if \(readiness === "HARD_STOP"\) throw hardStopError\(/);
assert.match(content, /function hardStopError\(message, abPoll\)/);
assert.match(content, /error\.ab_poll = abPoll \|\| null;/);
assert.match(content, /ab_poll: error\?\.ab_poll \|\| null/, "the message handler forwards the refusal to the side panel");
// The Skip fallback must clear the same answerable filter as the choices --
// otherwise a disabled control from an answered poll, or an inert <span>,
// gets clicked here after the filter above rejected it.
assert.match(content, /function answerableControl\(element\)/);
assert.match(content, /skip = answerableControl\(candidate\) \? candidate : null;/);
assert.match(content, /\.filter\(answerableControl\)/);
assert.doesNotMatch(content, /innerHTML|outerHTML|insertAdjacentHTML/, "poll discovery must not introduce an HTML sink");

console.log("ab-poll integration static checks: PASS");

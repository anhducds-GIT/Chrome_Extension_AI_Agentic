/* Feature: capture GPT/Gemini-style daily image-generation quota limits and
   halt the batch at exactly that point -- no further prompt gets submitted
   "on top of" a limit that has already been reached ("không bị override
   hoặc là bị gửi prompt đè lên").

   Modelled on the existing securityBlockerText()/SECURITY_HARD_STOP
   mechanism, but kept as its own distinct classification throughout (never
   folded into "security") so the operator can tell the two apart, and
   scoped to the specific new assistant message under evaluation rather than
   the whole page -- securityBlockerText() scans the whole page because a
   CAPTCHA interstitial isn't tied to a particular chat turn, but a quota
   message IS one specific assistant response; matching page-wide would risk
   false-firing on the operator's own prompt text if it happened to contain
   the same common words ("draw someone waiting for their daily limit to
   reset", etc). This is the same false-positive class of bug the security
   blocker had before it was scoped down.

   IMPORTANT: the phrase list in provider-adapter.js is a best-effort
   starting set, not verified against a real rate-limited ChatGPT session --
   that can only be confirmed live, by actually hitting the limit. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const content = fs.readFileSync(new URL("content.js", root), "utf8");
const readinessSource = fs.readFileSync(new URL("chat-readiness-core.js", root), "utf8");
const runnerSource = fs.readFileSync(new URL("runner-core.js", root), "utf8");
const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

/* ---- content.js: detection is scoped, not page-wide ---------------------- */

// The phrase list moved into provider-adapter.js; content.js keeps a local
// matchesGenerationLimit that delegates to the adapter. Exercise the REAL
// delegation path: run the adapter, alias it the way content.js sees it
// (const ADAPTER = window.DacProviderAdapter), then run the content.js slice.
const adapterSource = fs.readFileSync(new URL("provider-adapter.js", root), "utf8");
const matchesFnSource = content.slice(content.indexOf("function matchesGenerationLimit"), content.indexOf("function generationLimitText"));
const matchesContext = vm.createContext({});
vm.runInContext(adapterSource, matchesContext);
vm.runInContext("this.ADAPTER = this.DacProviderAdapter;", matchesContext);
vm.runInContext(`${matchesFnSource}\nthis.matchesGenerationLimit = matchesGenerationLimit;`, matchesContext);
const matches = matchesContext.matchesGenerationLimit;

// The provider wording lives in the adapter; content.js only delegates and
// must no longer carry its own copy of the phrase regex.
assert.match(adapterSource, /daily limit for image generation/, "the quota phrase list lives in provider-adapter.js");
assert.match(matchesFnSource, /ADAPTER\.matchesGenerationLimit\(text\)/, "content.js delegates limit matching to the provider adapter");
assert.doesNotMatch(content, /daily limit for image generation/, "content.js no longer carries a duplicate phrase list");

// On Gemini the PRIMARY quota signal is the freemium DOM anchor; the phrase
// list is the fallback, still scoped to model-response text only. Both the
// v0.1.0 Gemini regex (EN + VN) and the ChatGPT-era phrasing must keep firing.
assert.match(adapterSource, /freemium-file-upload-quota-exceeded-disclaimer/, "the quota DOM anchor lives in provider-adapter.js");
assert.match(content, /quotaAnchorPresent/, "content.js checks the quota DOM anchor before any phrase matching");

for (const text of [
  "You've reached your image generation limit for today.",
  "You've hit your daily limit for image generation.",
  "you can generate more images tomorrow",
  "Try again in a few hours to create more images.",
  "You've used all your free image generations for today.",
  "You have reached your quota for image creation.",
  "Bạn đã đạt giới hạn tạo ảnh hôm nay.",
  "Đã hết hạn mức, vui lòng thử lại sau.",
]) assert.equal(matches(text), true, `recognizes a real limit message: "${text}"`);

for (const text of [
  "Here is your cat wearing a tiny hat.",
  "Draw a comic about someone waiting in a long line.",
  "",
  "The captcha in this image is a fun visual gag, not a real limit.",
]) assert.equal(matches(text), false, `does not fire on an unrelated assistant response: "${text}"`);

// Checked against the NEW message only, once streaming has stopped -- never
// mid-generation (partial text could false-match) and never against the
// whole page (an unrelated older turn could false-match).
const waitForCompletionSegment = content.slice(content.indexOf("async function waitForCompletion("), content.indexOf("function sendUsable"));
assert.match(waitForCompletionSegment, /if \(resultMessage && !generating && matchesGenerationLimit\(text\)\) throw new Error\("LIMIT_STOP: Gemini image generation limit reached for now\."\);/, "the mid-generation check only fires once this attempt's own response has finished, against that response's own text");
assert.match(waitForCompletionSegment, /if \(!generating && quotaAnchorPresent\(\)\) throw new Error\("LIMIT_STOP: Gemini image generation quota reached \(freemium quota disclaimer present\)\."\);/, "the DOM-anchor quota check also never fires mid-generation");
assert.ok(waitForCompletionSegment.indexOf("matchesGenerationLimit(text)") < waitForCompletionSegment.indexOf("if (expectImage)"), "generation-limit detection takes priority over image-decision handling for the same poll");

// The pre-submit readiness gate (before the NEXT job is ever sent) must also
// check it, both on first read and on the re-check right before READY is
// trusted -- this is the actual "don't send a prompt on top of it" gate.
const waitForChatReadySegment = content.slice(content.indexOf("async function waitForChatReady("), content.indexOf("async function runPrompt("));
const limitCheckCount = [...waitForChatReadySegment.matchAll(/generationLimitText\(\)/g)].length;
assert.equal(limitCheckCount, 2, "the readiness gate checks the limit on the initial read and the final re-check before trusting READY");
assert.match(waitForChatReadySegment, /if \(readiness === "HARD_STOP"\) throw new Error\(limitBlocker \? `LIMIT_STOP: \$\{limitBlocker\}` : `HARD_STOP: \$\{blocker\}`\);/, "a limit block is reported distinctly from a security block, not folded into the same message");

// DAC_PING (used by Check Plan and by authoritativeValidate before every run)
// surfaces the same signal so a limit already in effect is caught before a
// run even starts, not only mid-run.
assert.match(content, /generationLimitBlocker: generationLimitText\(\),/, "DAC_PING reports the same signal");

/* ---- chat-readiness-core.js: a limit block is a hard stop ---------------- */

const readinessContext = {};
vm.runInNewContext(readinessSource, readinessContext);
const readiness = readinessContext.DacChatReadiness;
assert.equal(readiness.evaluate({ composerFound: true, sendUsable: true, generating: false, securityBlocker: null, generationLimitBlocker: "limit reached", outputVerified: true }), "HARD_STOP", "a generation-limit block is a hard stop, the same as a security block");
assert.equal(readiness.evaluate({ composerFound: true, sendUsable: true, generating: false, securityBlocker: null, generationLimitBlocker: null, outputVerified: true }), "READY", "no limit and no security block stays ready");

/* ---- runner-core.js: its own distinct, non-retryable classification ------ */

const runnerContext = {};
vm.runInNewContext(runnerSource, runnerContext);
const runner = runnerContext.DacRunnerCore;
assert.equal(runner.classifyFailure("LIMIT_STOP: Gemini image generation limit reached for now."), "GENERATION_LIMIT_REACHED", "the LIMIT_STOP prefix classifies distinctly from SECURITY_HARD_STOP");
assert.equal(runner.classifyFailure("LIMIT_STOP: Gemini image generation quota reached (freemium quota disclaimer present)."), "GENERATION_LIMIT_REACHED", "the DOM-anchor quota message classifies the same way");
assert.equal(runner.classifyFailure("HARD_STOP: Gemini security/interstitial blocker detected."), "SECURITY_HARD_STOP", "a real security block still classifies as security, not folded into the new type");
assert.ok(runner.FAILURE_TYPES.has("GENERATION_LIMIT_REACHED"), "the new classification is a recognized failure type");
assert.equal(runner.HARD_STOP_FAILURE_TYPES.has("GENERATION_LIMIT_REACHED"), true, "a reached quota is one of the three genuine hard stops -- retrying would just resubmit into the same wall");
assert.equal(runner.canRetry({ phase: "PRE_SUBMIT", retry_count: 0, settings: { max_retries: 2 } }, "GENERATION_LIMIT_REACHED"), false, "canRetry refuses a generation-limit failure even with retries remaining");
assert.equal(runner.interruptedStatus("SUBMITTED", "GENERATION_LIMIT_REACHED"), "INTERRUPTED", "a hard stop mid-job blocks Resume until the operator resolves it, same as SECURITY_HARD_STOP and RECEIVER_LOST");

/* ---- sidepanel.js: the batch actually halts, nothing sent "on top" ------- */

assert.match(sidepanel, /const hardStop = window\.DacRunnerCore\.HARD_STOP_FAILURE_TYPES\.has\(failureType\);/, "resolveJobFailure gates the whole retry/skip decision on the three hard stops");
assert.match(sidepanel, /if \(hardStop\) \{/, "a generation-limit failure still routes to the markInterrupted+halt branch, same as a security hard stop");
assert.match(sidepanel, /markInterrupted\(item, failureType, message\);\s*return \{ completed: true, halted: true \};/, "a hard stop halts the whole run instead of retrying or skipping");
assert.match(sidepanel, /if \(!ping\?\.composerFound \|\| ping\.generating \|\| ping\.busy \|\| ping\.securityBlocker \|\| ping\.generationLimitBlocker\) throw new Error\(ping\.generationLimitBlocker \? `LIMIT_STOP: \$\{ping\.generationLimitBlocker\}` : ping\.securityBlocker \? `HARD_STOP: \$\{ping\.securityBlocker\}` : "Gemini must be reachable, idle, and show its composer\."\);/, "a limit already in effect blocks authoritativeValidate() before a run even starts, not only mid-run");
assert.match(sidepanel, /if \(ping\?\.generationLimitBlocker\) return \{ ok: false, code: "CHATGPT_GENERATION_LIMIT"/, "Check Plan surfaces the same block as its own finding, distinct from the security one");

console.log("generation limit smoke tests: PASS");

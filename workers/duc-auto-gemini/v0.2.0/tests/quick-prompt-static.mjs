/* Feature: "Nhập prompt nhanh". Đức's real workflow (GPT's Orchestrator
   skill proposes ideas; his only manual step is "OK, render") doesn't fit
   authoring an Excel workbook per image. The first prompt builds a session
   workbook in memory (DacXlsx.createWorkbook); every later prompt in the
   same sitting appends to that SAME session (DacXlsx.addJob) -- confirmed
   with Đức as "nối tiếp trong 1 phiên", not a fresh file per render.

   Revised per follow-up feedback: (1) the box accepts MULTIPLE prompts,
   separated by a blank line, matching the reference extension's convention;
   (2) the button only STAGES jobs into the queue -- it never starts a run
   itself. Đức could not tell from the old single "add & run" button whether
   pressing it would just preview or immediately submit to ChatGPT; "Kiểm
   tra & thêm vào hàng đợi" materializes every prompt as a queue row on the
   RUN tab, pre-selected, and leaves the actual run to the existing Run
   controls. An (i) info icon next to the card title explains the blank-line
   convention and the stage-then-run split on hover. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

for (const id of ["quickPromptCard", "quickPromptInput", "quickPromptCheckBtn", "quickPromptStatus", "quickPromptSessionText"]) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} exists in the SETUP screen`);
}
assert.ok(html.indexOf('id="quickPromptCard"') < html.indexOf('id="workbookCard"'), "Quick Prompt sits above the Excel workbook card -- it is the primary path for this workflow, not a buried extra");

// (i) hover guidance exists and actually explains the two things operators
// were confused about: multi-prompt syntax and stage-vs-run.
const quickPromptCardSegment = html.slice(html.indexOf('id="quickPromptCard"'), html.indexOf('id="workbookCard"'));
assert.match(quickPromptCardSegment, /class="info-icon"[^>]*title="[^"]*DÒNG TRỐNG[^"]*"/, "the info icon explains the blank-line-separated multi-prompt syntax");
assert.match(quickPromptCardSegment, /class="info-icon"[^>]*title="[^"]*CHƯA chạy[^"]*"/, "the info icon explains that Check only stages jobs, it does not run them");

// --- multi-prompt splitting -------------------------------------------------

const splitContext = vm.createContext({});
const splitSource = sidepanel.slice(sidepanel.indexOf("function splitQuickPromptText"), sidepanel.indexOf("async function checkQuickPrompt"));
vm.runInContext(`${splitSource}\nthis.splitQuickPromptText = splitQuickPromptText;`, splitContext);
// Cross-realm arrays (this vm context vs. the test's own) fail
// deepStrictEqual on prototype identity even when their contents match, so
// every result is spread into a plain array of this realm before comparing.
const split = (text) => [...splitContext.splitQuickPromptText(text)];

assert.deepEqual(split("one prompt only, no blank line"), ["one prompt only, no blank line"], "a single prompt with no blank-line gap stays whole");
assert.deepEqual(split("line one\nstill the same prompt"), ["line one\nstill the same prompt"], "a single \\n inside one prompt does not split it");
assert.deepEqual(split("first prompt\n\nsecond prompt"), ["first prompt", "second prompt"], "a blank line separates two prompts");
assert.deepEqual(split("first\n\n\nsecond\n \nthird"), ["first", "second", "third"], "multiple blank lines, and a whitespace-only blank line, both separate prompts");
assert.deepEqual(split("  padded first  \n\n  padded second  "), ["padded first", "padded second"], "each prompt is trimmed");
assert.deepEqual(split("\n\nonly one real prompt\n\n"), ["only one real prompt"], "leading/trailing blank sections do not create empty jobs");
assert.deepEqual(split(""), [], "empty input yields no prompts");
assert.deepEqual(split("   "), [], "whitespace-only input yields no prompts");

// --- staging behaviour (source-level, since it needs the full DOM/state) --

const fnSegment = sidepanel.slice(sidepanel.indexOf("async function checkQuickPrompt()"), sidepanel.indexOf("// `extra` carries fields"));
assert.ok(fnSegment.length > 0, "checkQuickPrompt() is present");

assert.match(fnSegment, /const prompts = splitQuickPromptText\(els\.quickPromptInput\?\.value\);/, "the textarea is parsed for multiple prompts, not read as one block");
assert.match(fnSegment, /for \(const prompt of prompts\) \{/, "every parsed prompt becomes its own job in one Check click");
assert.match(fnSegment, /if \(!state\.workbook\) \{/, "workbook creation is gated on there being no session yet");
assert.match(fnSegment, /window\.DacXlsx\.createWorkbook\(`Quick-\$\{stamp\}\.xlsx`, \[\{ id: nextQuickPromptId\(\), prompt \}\]\)/, "the first prompt builds a real, from-scratch workbook rather than a parallel data structure");
assert.match(fnSegment, /window\.DacXlsx\.addJob\(state\.workbook, \{ id: nextQuickPromptId\(\), prompt \}\)/, "later prompts append into the same session workbook");
assert.doesNotMatch(fnSegment, /DacXlsx\.open\(/, "quick prompt never routes through the file-upload path");

// The critical behavior change: Check must never itself start a run.
assert.doesNotMatch(fnSegment, /await run\(/, "checking prompts never starts a run -- staging and running are two separate, deliberate steps");
assert.match(fnSegment, /state\.runSelection = new Set\(addedIds\);/, "every newly staged job is pre-selected for the operator");
assert.match(fnSegment, /showScreen\("runScreen"\)/, "the operator is taken to the RUN tab to see the staged jobs materialize as queue rows");
assert.match(fnSegment, /state\.queueExpanded = true;/, "the full queue is expanded so a multi-prompt batch isn't hidden past the 6-row preview");

assert.match(fnSegment, /applyWorkbookConfig\(\)/, "output settings are derived the same way as any opened workbook");
assert.match(fnSegment, /await prepare\(\{ diagnostic: true \}\);/, "the queue is re-derived through the normal prepare() path");
assert.match(fnSegment, /await validate\(\);/, "Check Plan state stays consistent for the rest of the UI (readiness checklist, Setup's own Run button)");

// Collision-safe id generation.
const idFnSegment = sidepanel.slice(sidepanel.indexOf("function nextQuickPromptId()"), sidepanel.indexOf("function splitQuickPromptText"));
assert.match(idFnSegment, /existing\.has\(`Q\$\{String\(candidate\)\.padStart\(3, "0"\)\}`\)/, "the next id is checked against ids already in the session before being handed out");

// Busy-state gating and wiring.
assert.match(sidepanel, /if \(els\.quickPromptCheckBtn\) els\.quickPromptCheckBtn\.disabled = operatorLocked;/, "controls() gates the button the same way as every other operator action");
assert.match(sidepanel, /els\.quickPromptCheckBtn\?\.addEventListener\("click", \(\) => checkQuickPrompt\(\)\);/, "the button is wired to the handler");

// A normal workbook load resets the quick-prompt counter so ids never carry
// state across an unrelated session.
const openWorkbookSegment = sidepanel.slice(sidepanel.indexOf("async function openWorkbook()"), sidepanel.indexOf("async function openWorkbook()") + 800);
assert.match(openWorkbookSegment, /state\.quickPromptCounter = 0;/, "opening a real workbook resets the quick-prompt counter");

console.log("quick prompt static tests: PASS");

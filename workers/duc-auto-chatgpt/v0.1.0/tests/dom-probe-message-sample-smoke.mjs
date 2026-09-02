/* diagnostics.dom_probe must never go blind on page TEXT without saying so.

   FOUND LIVE 2026-09-02 on two profiles ("anhducds_multi work flow" and
   "kaito"), two different conversations. The probe's only text-bearing field
   was built from `document.querySelectorAll("article")`, and ChatGPT had moved
   its turns off <article>. Measured on both pages:

       articleSample: []            <- empty
       assistantCount: 2 / 3        <- but the turns ARE there
       data-turn: assistant x3, user x2
       data-message-author-role: assistant x3, user x2
       truncated: false             <- and the probe called itself healthy
       payload 7780 / 7404 bytes against the 65536 cap

   So it failed SILENTLY, and it had been failing for a week: Pilot-13's own
   baseline of 2026-08-26 recorded `articleSample: []` next to
   `assistantCount: 7` and nobody read it as a defect.

   Why that matters more than one empty field: golden rule 1 sends every AI to
   dom_probe for DOM evidence instead of guessing selectors. With the only text
   sample blind, an AI diagnosing an output-detection problem gets structure and
   no text, and cannot tell "the page has no text" from "the selector is dead" --
   the two conclusions that point in opposite directions.

   NOTE ON PRIOR COVERAGE, per the guide's lesson from error #2 (a test that
   asserted the WRONG behaviour is why that bug lived): before this file, NO
   test referenced articleSample at all -- not asserting it could be empty, not
   asserting anything. The only neighbouring assertion was
   provider-adapter-static.mjs, which pins that `messageAttributes` appears in
   the probe. Nothing had to be relaxed to land the fix.

   This file does not grep the source, it RUNS it: the shipped block is sliced
   out of content.js and executed against fixture DOMs. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8").split("\r\n").join("\n");

// --- slice the shipped source ------------------------------------------
const startAnchor = "        const MESSAGE_TURN_SELECTOR =";
const endAnchor = "        // Attribute NAMES alone were not enough";
const start = content.indexOf(startAnchor);
const end = content.indexOf(endAnchor);
assert.ok(start > 0, `content.js still defines ${startAnchor.trim()} -- if this moved, this test must follow it, not be deleted`);
assert.ok(end > start, "the sample block still sits above the attributeValues block");
const sampleBlock = content.slice(start, end);

// One definition, two readers. The whole defect was two copies drifting apart,
// so a second literal container list in this block is the regression.
assert.equal(
  (sampleBlock.match(/document\.querySelectorAll\(/g) || []).length,
  2,
  "exactly two queries: one for attribute discovery, one for the text sample"
);
assert.ok(
  !/document\.querySelectorAll\(\s*["'`]/.test(sampleBlock),
  "neither query may carry an inline selector literal -- both must read the shared constant, which is what stops the two copies drifting apart again"
);
assert.doesNotMatch(
  content,
  /querySelectorAll\("article"\)/,
  'the dead literal querySelectorAll("article") must never come back: it matched nothing on the live page'
);
assert.doesNotMatch(content, /articleSample/, "the field name that lied about its own selector is gone, so no reader assumes <article> again");

const runSampleBlock = vm.runInNewContext(
  `(function (document) {\n${sampleBlock}\nreturn { MESSAGE_TURN_SELECTOR, MESSAGE_DISCOVERY_SELECTOR, messageAttributes, messageSample, messageSampleDiag };\n})`
);

// --- a fixture DOM just wide enough for these selectors ----------------
// Supports "tag" and "[attr]" tokens separated by commas -- everything the
// block actually asks for. Returns each node at most once, like the real
// querySelectorAll does, so `matched` cannot be inflated by a node carrying
// two markers.
function makeDocument(nodes) {
  const element = (spec) => ({
    tagName: (spec.tag || "div").toUpperCase(),
    attributes: Object.entries(spec.data || {}).map(([name, value]) => ({ name, value: String(value) })),
    innerText: spec.text || "",
    getAttribute(name) {
      const found = this.attributes.find((attribute) => attribute.name === name);
      return found ? found.value : null;
    },
    querySelectorAll: () => new Array(spec.imgs || 0).fill({}),
  });
  const all = nodes.map(element);
  const matches = (node, token) => {
    const attr = token.match(/^\[([\w-]+)\]$/);
    if (attr) return node.attributes.some((a) => a.name === attr[1]);
    return node.tagName === token.toUpperCase();
  };
  return {
    querySelectorAll(selector) {
      const tokens = selector.split(",").map((token) => token.trim()).filter(Boolean);
      return all.filter((node) => tokens.some((token) => matches(node, token)));
    },
  };
}

// --- case 1: the live page as measured 2026-09-02 ----------------------
const live = runSampleBlock(makeDocument([
  { data: { "data-sidebar-item": "true", "data-testid": "create-new-chat-button" }, text: "New chat" },
  { data: { "data-turn": "user", "data-message-author-role": "user", "data-message-id": "m1" }, text: "chao ban" },
  { data: { "data-turn": "assistant", "data-message-author-role": "assistant", "data-message-id": "m2" }, text: "Chao Duc, toi day.", imgs: 1 },
]));
assert.equal(live.messageSampleDiag.status, "OK", "turns marked with data-turn are found and their text is sampled");
assert.equal(live.messageSampleDiag.matched, 2, "the two real turns, counted once each despite carrying three markers apiece");
assert.equal(live.messageSampleDiag.with_text, 2);
assert.equal(live.messageSample.length, 2);
assert.equal(live.messageSample[1].txtHead, "Chao Duc, toi day.", "the field carries real page text again -- this is the assertion the old code could not pass");
assert.equal(live.messageSample[1].imgs, 1);
// The sidebar row matched [data-testid] and so reaches attribute DISCOVERY,
// but must never reach the text sample as if it were conversation content.
assert.ok(live.messageAttributes.includes("data-sidebar-item"), "the wide discovery net still sees markers outside the turns, which is the net that saves us when every known marker dies at once");
assert.ok(!live.messageSample.some((entry) => entry.txtHead === "New chat"), "sidebar text is never reported as a message");

// --- case 2: containers real, page genuinely empty ---------------------
const quiet = runSampleBlock(makeDocument([
  { data: { "data-turn": "user" }, text: "" },
  { data: { "data-turn": "assistant" }, text: "   " },
]));
assert.equal(quiet.messageSampleDiag.status, "MATCHED_BUT_NO_TEXT", "an empty page says so, instead of looking like a dead selector");
assert.equal(quiet.messageSampleDiag.matched, 2);
assert.equal(quiet.messageSampleDiag.with_text, 0);

// --- case 3: every marker dead -- the case that used to be silent ------
const dead = runSampleBlock(makeDocument([
  { data: { "data-conversation-node": "assistant" }, text: "this text exists but no known marker reaches it" },
]));
assert.equal(dead.messageSampleDiag.status, "NO_CONTAINER_MATCHED", "a dead selector is named as a dead selector -- the whole point of this fix");
assert.equal(dead.messageSampleDiag.matched, 0);
assert.equal(dead.messageSample.length, 0);
// And the reader is handed what was tried, so the next selector is derived
// rather than guessed (golden rule 1).
assert.equal(dead.messageSampleDiag.selector, dead.MESSAGE_TURN_SELECTOR, "the failing selector travels with the failure");
for (const marker of ['[data-turn]', '[data-message-author-role]']) {
  assert.ok(dead.MESSAGE_TURN_SELECTOR.includes(marker), `${marker} is in the shared definition -- both were live on 2026-09-02`);
}
assert.ok(dead.MESSAGE_DISCOVERY_SELECTOR.includes(dead.MESSAGE_TURN_SELECTOR), "discovery is the turn selector PLUS a wider net, derived from it rather than retyped");
assert.ok(dead.MESSAGE_DISCOVERY_SELECTOR.includes("[data-testid]") && !dead.MESSAGE_TURN_SELECTOR.includes("[data-testid]"), "data-testid is for discovery only, never for reading text");

// --- the payload cap was the SECOND silent path -------------------------
const shrinkStart = content.indexOf("        if (JSON.stringify(probe).length > 64 * 1024) {");
assert.ok(shrinkStart > 0, "the payload cap branch is still there");
const shrinkBlock = content.slice(shrinkStart, content.indexOf("\n        sendResponse({ ok: true, probe });", shrinkStart));
const runShrink = vm.runInNewContext(`(function (probe) {\n${shrinkBlock}\nreturn probe;\n})`);
const shrunk = runShrink({
  images: new Array(30).fill({ pad: "x".repeat(4000) }),
  buttons: new Array(40).fill({}),
  customTags: new Array(100).fill("x-tag"),
  messageSample: [{ txtHead: "real text that is about to be thrown away" }],
  messageSampleDiag: { status: "OK", selector: "[data-turn]", matched: 5, sampled: 4, with_text: 4 },
  truncated: false,
});
assert.equal(shrunk.truncated, true, "the fixture really did exceed the cap, so this branch really ran");
assert.equal(shrunk.messageSample.length, 0, "the sample is the first thing dropped, as before");
assert.equal(shrunk.messageSampleDiag.status, "DROPPED_FOR_SIZE", "dropping the sample for size must not be reported as a dead selector, and must not stay silent either");
assert.equal(shrunk.messageSampleDiag.with_text, 0, "the old counts would be a lie once the sample is gone");
assert.equal(shrunk.messageSampleDiag.matched, 5, "what the page HAD is still reported -- only the sample was dropped");

// --- the three statuses are distinct, or none of the above helps -------
assert.equal(new Set(["OK", "MATCHED_BUT_NO_TEXT", "NO_CONTAINER_MATCHED", "DROPPED_FOR_SIZE"]).size, 4);

console.log("dom probe message sample smoke tests: PASS");

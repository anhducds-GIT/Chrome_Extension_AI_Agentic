import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

assert.match(source, /if \(expectImage && !stopButton\) \{/);
assert.ok(
  source.indexOf("if (expectImage && !stopButton)") < source.indexOf("if (text === stableText)"),
  "image-only completion must precede the text-stability condition"
);
assert.match(source, /reason: "image_ready"/);
assert.match(source, /data:image\\\//);
assert.match(source, /HARD_STOP: \$\{blocker\}/);
assert.match(source, /if \(text === stableText\) \{/);
assert.match(source, /type: "text"/);
assert.match(source, /async function waitForReferenceImagesReady/);
assert.match(source, /previewsReady && !uploadIsPending\(\)/);
assert.doesNotMatch(source, /await sleep\(750\)/);
assert.match(source, /runPrompt\(prompt, timeoutMs\)/);
assert.match(source, /DAC_WAIT_CHAT_READY/);
assert.match(source, /MutationObserver/);
assert.match(source, /waitForChatReady/);

console.log("content image static checks: PASS");

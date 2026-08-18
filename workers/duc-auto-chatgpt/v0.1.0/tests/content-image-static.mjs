import assert from "node:assert/strict";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");

assert.match(source, /if \(expectImage && imageUrl\) \{/);
assert.ok(
  source.indexOf("if (expectImage && imageUrl)") < source.indexOf("if (text === stableText)"),
  "image-only completion must precede the text-stability condition"
);
assert.match(source, /reason: "image_ready"/);
assert.match(source, /if \(text === stableText\) \{/);
assert.match(source, /type: "text"/);
assert.match(source, /async function waitForReferenceImageReady/);
assert.match(source, /previewCreated && !uploadIsPending\(\)/);
assert.doesNotMatch(source, /await sleep\(750\)/);
assert.match(source, /runPrompt\(prompt, timeoutMs\)/);

console.log("content image static checks: PASS");

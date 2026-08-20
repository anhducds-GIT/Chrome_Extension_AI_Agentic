import assert from "node:assert/strict";
import fs from "node:fs";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const js = fs.readFileSync(new URL("sidepanel.js", root), "utf8");

assert.match(html, /id="outputDestinationMode"/);
assert.match(html, /Chrome Downloads/);
assert.match(html, /Authorized Folder/);
assert.match(html, /id="destinationFolderBtn"/);
assert.match(html, /Save result artifacts to a different destination/);
assert.match(html, /id="separateResultDestinationControls"[^>]*hidden/);
assert.doesNotMatch(html, /Choose Image Folder|Use Source Folder|id="changeImageFolderBtn"/);
assert.match(html, /id="planCheckSummary"/);
assert.match(html, /id="validationGuidance"/);
assert.match(html, /id="checkSettings"/);

assert.match(js, /async function diagnosticChatCheck\(\)/);
assert.match(js, /window\.DacPlanDiagnostics\.analyze/);
assert.match(js, /state\.prepared = window\.DacRunnerCore\.prepare\(state\.workbook, state\.files, state\.runtimeOverrides\);/);
assert.match(js, /async function run\(mode = "all"\)[\s\S]*?effectiveOutput = await authoritativeValidate\(\)/);
assert.match(js, /state\.validated = state\.diagnostics\.summary\.blockers === 0/);
assert.match(js, /destinationFolderBtn\.textContent = values\.image\.kind === "directory" && values\.image\.handle \? "Change Folder" : "Choose Folder"/);
assert.doesNotMatch(js, /chooseImageFolderBtn|useSourceFolderBtn|changeImageFolderBtn/);

console.log("validation and output UX static checks: PASS");

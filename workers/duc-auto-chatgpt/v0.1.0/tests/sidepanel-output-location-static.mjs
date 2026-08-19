import assert from "node:assert/strict";
import fs from "node:fs";

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");

for (const id of ["outputLocationCard", "imageOutputText", "resultOutputText", "chooseImageFolderBtn", "useSourceFolderBtn", "changeImageFolderBtn", "resultFilenameInput", "runPlanCard"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /Generated Images:/);
assert.match(html, /Result XLSX:/);
assert.match(source, /DacOutputLocation\.preflight/);
assert.match(source, /OUTPUT_LOCATION:/);
assert.match(source, /saveGeneratedImage/);
assert.match(source, /writeUniqueFile/);
assert.match(source, /effective_image_output/);
assert.match(source, /effective_result_xlsx/);
assert.match(source, /showDirectoryPicker/);
assert.doesNotMatch(source, /location\.kind === "directory"[\s\S]{0,220}download\(/, "custom-folder writes must not fall back to Downloads");

console.log("sidepanel output-location static checks: PASS");

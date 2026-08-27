import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
const source = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
const css = fs.readFileSync(new URL("sidepanel.css", root), "utf8");
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("operator-glossary-core.js", root), "utf8"), context);

const outputTerms = context.DacOperatorGlossary.GLOSSARY.filter((entry) => entry.section === "OUTPUT");
for (const term of ["Artifact", "Jobs completed", "Persistence", "Persistence verified", "Artifact persistence failed", "Detected not downloaded", "Result XLSX", "Audit JSONL"]) {
  assert.ok(outputTerms.some((entry) => entry.term === term), `${term} has an Output-specific definition`);
}
assert.match(outputTerms.find((entry) => entry.term === "Jobs completed").detail, /không tự chứng minh các artifact đã được lưu/i);
assert.match(outputTerms.find((entry) => entry.term === "Artifact persistence failed").detail, /phần tạo ảnh có thể đã hoàn tất/i);
assert.match(html, /id="outputConceptsCard"[\s\S]*?id="outputGlossary"/, "Output has a dedicated contextual glossary");
assert.match(source, /function renderOutputGlossary\(\)/);

assert.match(html, /id="statusChipTranslation"[^>]*lang="vi"/, "header status has a Vietnamese line");
assert.match(html, /id="completionTranslation"[^>]*lang="vi"/, "Output completion notice has a Vietnamese line");
assert.match(html, /id="failedJobsTranslation"[^>]*lang="vi"/, "Output failure detail has a Vietnamese line");
assert.match(source, /"OUTPUT PERSISTENCE FAILED": "Lưu hoặc xác minh artifact thất bại"/);

const dialogIds = [...html.matchAll(/<dialog\s+id="([^"]+)"/g)].map((match) => match[1]);
assert.equal(dialogIds.length, 7, "all seven current operator dialogs are inventoried");
for (const id of dialogIds) {
  const start = html.indexOf(`<dialog id="${id}"`);
  const end = html.indexOf("</dialog>", start);
  assert.ok(start >= 0 && end > start, `${id} exists`);
  const dialog = html.slice(start, end);
  assert.match(dialog, /bilingual-dialog/, `${id} uses the bilingual dialog contract`);
  assert.match(dialog, /class="[^"]*notice-translation[^"]*"[^>]*lang="vi"/, `${id} includes a smaller Vietnamese translation`);
}

assert.match(css, /\.notice-translation \{[^}]*font-size: 9px;/, "Vietnamese translations use a smaller visual line");
console.log("Output glossary and bilingual notices static checks: PASS");

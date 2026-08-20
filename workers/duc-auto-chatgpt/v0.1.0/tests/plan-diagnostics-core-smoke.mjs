import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = vm.createContext({ console });
for (const file of ["runner-core.js", "output-location-core.js", "plan-diagnostics-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8"), context, { filename: file });
}
const { DacRunnerCore: runner, DacPlanDiagnostics: diagnostics, DacOutputLocation: output } = context;
const workbook = {
  fileName: "pilot.xlsx",
  config: { output_folder: "Duc Auto ChatGPT/Pilot03", max_input_images: 5 },
  jobs: [
    { id: "P03-A", prompt: "no references" },
    { id: "P03-B", prompt: "one", reference_images: "ref-01.png|ref-02.png" },
    { id: "P03-C", prompt: "two", reference_images: "ref-03.png" }
  ]
};
const outputSettings = output.fromWorkbook(workbook.config, workbook.fileName);
const readyOutput = { ok: true, settings: outputSettings };
const readyChat = { ok: true };
const run = (values = {}) => diagnostics.analyze({ workbook, files: [], overrides: {}, outputCheck: readyOutput, chatCheck: readyChat, runner, output, ...values });

// A parsed workbook never depends on prepare() to become inspectable; all required refs are reported together.
const zeroRefs = run();
assert.equal(zeroRefs.references.required, 3);
assert.equal(zeroRefs.references.missing, 3);
assert.deepEqual([...zeroRefs.blockers.find((item) => item.code === "MISSING_REFERENCES").job_ids].sort(), ["P03-B", "P03-C"]);
assert.equal(zeroRefs.findings.some((item) => item.code === "WORKBOOK_OK"), true);

const noRefWorkbook = { ...workbook, jobs: [{ id: "P03-A", prompt: "no references" }] };
const noRefs = diagnostics.analyze({ workbook: noRefWorkbook, files: [], outputCheck: readyOutput, chatCheck: readyChat, runner, output });
assert.equal(noRefs.references.required, 0);
assert.equal(noRefs.findings.some((item) => item.code === "REFERENCES_OPTIONAL" && item.severity === "OK"), true);

const manyBlockers = run({ outputCheck: { ok: false, error: "No writable destination selected." }, chatCheck: { ok: false, code: "CHATGPT_NOT_CONNECTED", message: "No ChatGPT tab." } });
assert.equal(manyBlockers.blockers.some((item) => item.code === "MISSING_REFERENCES"), true);
assert.equal(manyBlockers.blockers.some((item) => item.code === "OUTPUT_PREFLIGHT_FAILED"), true);
assert.equal(manyBlockers.blockers.some((item) => item.code === "CHATGPT_NOT_CONNECTED"), true);

const completeRefs = run({ files: [{ fileName: "ref-01.png" }, { fileName: "ref-02.png" }, { fileName: "ref-03.png" }] });
assert.equal(completeRefs.blockers.some((item) => item.code === "MISSING_REFERENCES"), false);
assert.equal(completeRefs.findings.some((item) => item.code === "REFERENCES_OK"), true);

const ambiguous = run({ files: [{ fileName: "ref-01.png", alias: "hero" }, { fileName: "other.png", alias: "hero" }, { fileName: "ref-02.png" }, { fileName: "ref-03.png" }] });
assert.equal(ambiguous.blockers.some((item) => item.code === "DUPLICATE_ALIASES"), true);

const outputMissing = run({ outputCheck: null });
assert.equal(outputMissing.blockers.find((item) => item.code === "OUTPUT_DESTINATION_MISSING").action, "Choose output destination");
const authorizedUnset = run({ outputCheck: { ok: false, missingDestination: true, error: "No authorized folder selected." } });
assert.equal(authorizedUnset.blockers.some((item) => item.code === "OUTPUT_DESTINATION_MISSING"), true);
const invalidNaming = run({ outputCheck: { ok: false, namingInvalid: true, error: "Image filename pattern is required." } });
assert.equal(invalidNaming.blockers.some((item) => item.code === "OUTPUT_NAMING_INVALID"), true);
const profileUnbound = run({ outputProfileState: { state: "unbound", profile_id: "pilot-04" } });
assert.equal(profileUnbound.blockers.some((item) => item.code === "OUTPUT_PROFILE_UNBOUND"), true);

console.log("plan-diagnostics-core smoke: PASS");

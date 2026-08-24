/* Bug report: images were being silently saved with the "overwrite"
   collision policy, with no visible choice offered. The three-option control
   (overwrite / keep both — add number / stop and report conflict) already
   existed in SETUP -- the actual root cause traced to pilot-06's own ledger
   config sheet carrying `collision_policy=overwrite` (set during an earlier
   test), which is data, not a code defect, and pilot-06 is protected
   evidence that must not be edited. But the underlying complaint is real:
   the active policy was buried as three lowercase words inside the Naming
   row's detail text, with the same green "OK" as every other row, so a
   workbook-carried overwrite setting is easy to run right past. This adds a
   visible WARNING (Run stays enabled -- overwrite is a legitimate choice,
   it just must not be silent) whenever collision policy is overwrite,
   through the same Check Plan finding/guidance system as every other
   diagnostic, with Vietnamese operator text like every other code. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["output-location-core.js", "plan-diagnostics-core.js", "orchestrator-review-core.js"]) {
  vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context, { filename: file });
}
const { DacOutputLocation: output, DacPlanDiagnostics: diagnostics, DacOrchestratorReview: review } = context;

const workbook = { fileName: "pilot.xlsx", config: {}, jobs: [{ id: "A", prompt: "a" }] };

const uniquifySettings = output.fromWorkbook(workbook.config, workbook.fileName);
const uniquifyResult = diagnostics.analyze({ workbook, files: [], outputCheck: { ok: true, settings: uniquifySettings }, chatCheck: { ok: true }, runner: { referenceTokens: () => [], runtimeConfig: () => ({ timeout_sec: 180, max_retries: 2, safety_cooldown_sec: 0, max_input_images: 5 }) }, output });
assert.equal(uniquifyResult.findings.some((item) => item.code === "OUTPUT_COLLISION_OVERWRITE_ACTIVE"), false, "the default (uniquify) policy raises no overwrite warning");

const overwriteSettings = { ...uniquifySettings, collisionPolicy: "overwrite" };
const overwriteResult = diagnostics.analyze({ workbook, files: [], outputCheck: { ok: true, settings: overwriteSettings }, chatCheck: { ok: true }, runner: { referenceTokens: () => [], runtimeConfig: () => ({ timeout_sec: 180, max_retries: 2, safety_cooldown_sec: 0, max_input_images: 5 }) }, output });
const overwriteFinding = overwriteResult.findings.find((item) => item.code === "OUTPUT_COLLISION_OVERWRITE_ACTIVE");
assert.ok(overwriteFinding, "an active overwrite policy is a distinct, visible finding");
assert.equal(overwriteFinding.severity, "WARNING", "overwrite stays a legitimate choice -- it warns, it does not block Run");
assert.equal(overwriteResult.summary.blockers, 0, "Run is not disabled just because overwrite is the chosen policy");
assert.equal(overwriteResult.summary.warnings > 0, true, "the warning is counted toward the Check Plan summary, so the banner actually shows WARNING instead of a plain green ready state");

// Vietnamese operator text exists for the new code (checked directly here,
// and operator-messages-core-smoke.mjs enforces this generically for every
// code raised anywhere in plan-diagnostics-core.js).
const messages = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("operator-messages-core.js", root), "utf8"), messages, { filename: "operator-messages-core.js" });
const entry = messages.DacOperatorMessages.messageFor("OUTPUT_COLLISION_OVERWRITE_ACTIVE");
assert.ok(entry, "the new code has a Vietnamese label/guidance entry");
assert.match(`${entry.label} ${entry.guidance}`, /[ơưăâêôđ]/i, "the entry actually reads as Vietnamese");

// The readiness checklist's Naming row also carries a visible flag, not just
// three quiet lowercase words next to the pattern.
const checklist = review.checklist({ workbook, prepared: null, diagnostics: overwriteResult, outputSettings: overwriteSettings, output, settings: null });
const namingSection = checklist.find((item) => item.id === "naming");
assert.equal(namingSection.severity, "WARNING", "the Naming checklist row itself is flagged, not left as a plain OK");
assert.match(namingSection.detail, /ĐÈ LÊN/, "the Naming row explicitly says images will be overwritten, not just the policy name");

console.log("collision overwrite warning smoke tests: PASS");

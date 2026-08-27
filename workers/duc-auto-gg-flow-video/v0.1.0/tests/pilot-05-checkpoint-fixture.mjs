import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { unzip } from "./xlsx-test-utils.mjs";

const fixture = fileURLToPath(new URL("../pilot-05/Duc-Auto-ChatGPT-Pilot-05.xlsx", import.meta.url));
const entries = unzip(fixture);
const configXml = entries.get("xl/worksheets/sheet2.xml");
const jobsXml = entries.get("xl/worksheets/sheet1.xml");
assert.ok(configXml && jobsXml, "Pilot-05 fixture must expose its jobs and config worksheets");
for (const expected of [
  "result_filename_pattern", "Duc-Auto-ChatGPT-Pilot-05__results__v{version}.xlsx",
  "audit_filename", "Duc-Auto-ChatGPT-Pilot-05__audit.jsonl", "image_filename_pattern", "{job_id}",
  "output_profile_id", "pilot-05", "delay_min_sec", ">5<", "delay_max_sec", ">12<",
  "save_images", "save_result_xlsx", "save_audit_jsonl"
]) assert.match(configXml, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.doesNotMatch(configXml, /<x:v>run_id<\/x:v>/, "Pilot-05 must not prefill a run ID");
for (const job of ["P05-A", "P05-B", "P05-C", "P05-D", "P05-E"]) assert.match(jobsXml, new RegExp(`>${job}<`));

// The source workbook declares a mixed-case audit filename. Artifact filenames
// must never be lower-cased on their way into recorded provenance.
assert.match(configXml, /Duc-Auto-ChatGPT-Pilot-05__audit\.jsonl/, "the declared audit filename keeps its exact case");

console.log("Pilot-05 checkpoint fixture: PASS");

/* Feature: "Nhập prompt nhanh" (Quick Prompt) -- Đức's actual workflow with
   GPT's Orchestrator skill is a one-line "OK, render" prompt repeated many
   times per session, not an Excel workbook authored up front. Rather than
   build a second, simplified run pipeline, createWorkbook()/addJob() let a
   session start and grow entirely in memory while still producing a real
   XLSX indistinguishable from one the operator opened from disk -- every
   other module (runner-core, resume-core, the checkpoint writer) keeps
   working unmodified. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { FakeDOMParser, FakeXMLSerializer, parseXmlDocument } from "./xlsx-test-utils.mjs";

const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, DOMParser: FakeDOMParser, XMLSerializer: FakeXMLSerializer, console });
vm.runInContext(fs.readFileSync(new URL("../xlsx-codec.js", import.meta.url), "utf8"), context);
const xlsx = context.window.DacXlsx;

assert.throws(() => xlsx.createWorkbook("Quick.xlsx", []), /At least one job is required/, "a session cannot start with zero jobs");

const workbook = xlsx.createWorkbook("Quick-20260823-1420.xlsx", [{ id: "Q001", prompt: 'a cat wearing a tiny hat & "sunglasses" <indoors>' }]);
assert.equal(workbook.fileName, "Quick-20260823-1420.xlsx");
assert.deepEqual([...workbook.headers], ["id", "prompt"], "a from-scratch session only carries the two required columns until the runner adds more");
assert.equal(workbook.jobs.length, 1);
assert.equal(workbook.jobs[0].id, "Q001");
assert.equal(workbook.jobs[0].prompt, 'a cat wearing a tiny hat & "sunglasses" <indoors>', "special characters survive the escape/parse round trip intact");
assert.deepEqual({ ...workbook.config }, {}, "a fresh session has no config overrides -- workbook defaults (Downloads, uniquify, etc.) apply");

// This is what a real xlsx-codec.open() call produces -- runner-core.prepare(),
// resume-core, and the checkpoint writer must not be able to tell the
// difference from an uploaded file.
for (const key of ["fileName", "entries", "sheets", "jobsSheet", "jobsPath", "headers", "jobs", "config", "configSheet", "configPath"]) {
  assert.ok(Object.hasOwn(workbook, key), `createWorkbook() returns the same shape as open(): missing "${key}"`);
}

// Appending a second prompt into the SAME session (the "nối tiếp trong 1
// phiên" decision) must not disturb the first job's row.
const job2 = xlsx.addJob(workbook, { id: "Q002", prompt: "same cat, now a bow tie" });
assert.equal(job2.id, "Q002");
assert.equal(workbook.jobs.length, 2, "the new job is appended, not replacing the session");
assert.equal(workbook.jobs[0].id, "Q001", "the first job is untouched by the append");

// A quick-prompt job goes through the exact same runner/checkpoint machinery
// as any workbook job: prepare a real job onto it, run it through the
// existing update() write path, and the config snapshot path used at the end
// of every run -- then verify the persisted bytes are well-formed and
// re-parseable, not just correct in memory.
xlsx.updateJob(workbook, workbook.jobs[0], { status: "SUCCESS", attempt_phase: "SUCCESS", persistence_verified: "true", result_file: "Q001.png" });
xlsx.updateConfigSnapshot(workbook, { run_id: "20260823-1420-quick", effective_collision_policy: "uniquify" });

const jobsXmlBytes = workbook.entries.get(workbook.jobsPath);
const configXmlBytes = workbook.entries.get(workbook.configPath);
assert.ok(jobsXmlBytes && jobsXmlBytes.length > 0, "the jobs sheet was re-serialized after the update");
assert.ok(configXmlBytes && configXmlBytes.length > 0, "the config sheet was serialized after the first snapshot");

const decoder = new TextDecoder();
const reparsedJobs = parseXmlDocument(decoder.decode(jobsXmlBytes));
const reparsedRows = reparsedJobs.getElementsByTagNameNS("*", "row");
assert.equal(reparsedRows.length, 3, "header + two job rows survive a from-scratch re-parse of the persisted bytes");
const reparsedConfig = parseXmlDocument(decoder.decode(configXmlBytes));
assert.match(decoder.decode(configXmlBytes), /<t>20260823-1420-quick<\/t>/, "the config snapshot persisted the run_id written after this session's first job completed");
assert.ok(reparsedConfig.getElementsByTagNameNS("*", "row").length >= 2, "config sheet re-parses with its header and new key row intact");

// Two independent quick-prompt sessions must not collide on worksheet identity.
const other = xlsx.createWorkbook("Quick-other.xlsx", [{ id: "Q001", prompt: "unrelated session" }]);
assert.equal(other.jobs[0].prompt, "unrelated session");
assert.notEqual(other.entries, workbook.entries, "each session owns its own independent entries map");

// Queue edits are logical metadata changes, never destructive worksheet
// surgery. Reorder all active rows, tombstone one, then verify the physical
// ledger still contains it while the runner-facing view does not.
const editable = xlsx.createWorkbook("Queue-edit.xlsx", [
  { id: "A", prompt: "alpha" },
  { id: "B", prompt: "beta" },
  { id: "C", prompt: "gamma" }
]);
xlsx.setQueueOrder(editable, [editable.jobs[2], editable.jobs[0], editable.jobs[1]]);
assert.equal(xlsx.activeJobs(editable).map((job) => job.id).join(","), "C,A,B", "queue_position controls the logical run order");
xlsx.removeFromQueue(editable, editable.jobs[0], "2026-08-23T00:00:00.000Z");
assert.equal(editable.jobs.length, 3, "removing from Queue never deletes the physical XLSX row");
assert.equal(editable.jobs[0].queue_removed, "true", "the preserved row is explicitly tombstoned");
assert.equal(xlsx.activeJobs(editable).map((job) => job.id).join(","), "C,B", "tombstoned rows are excluded from the runnable Queue");
const duplicateInput = xlsx.addJob(editable, { id: "B-copy", prompt: editable.jobs[1].prompt, duplicate_of: "B", queue_removed: "false" });
xlsx.setQueueOrder(editable, [editable.jobs[2], editable.jobs[1], duplicateInput]);
assert.equal(xlsx.activeJobs(editable).map((job) => job.id).join(","), "C,B,B-copy", "a duplicate is a new row with its own stable ID and position");
assert.equal(String(duplicateInput.status || ""), "", "a duplicate carries no source execution status");
assert.equal(duplicateInput.duplicate_of, "B", "duplicate provenance is persisted in the ledger");
xlsx.placeQueueJob(editable, duplicateInput, editable.jobs[2], "before");
assert.equal(xlsx.activeJobs(editable).map((job) => job.id).join(","), "B-copy,C,B", "drag placement can move a pending duplicate before any target row");
xlsx.placeQueueJob(editable, duplicateInput, editable.jobs[1], "after");
assert.equal(xlsx.activeJobs(editable).map((job) => job.id).join(","), "C,B,B-copy", "drag placement persists an explicit after-target position");
vm.runInContext(fs.readFileSync(new URL("../runner-core.js", import.meta.url), "utf8"), context);
const preparedQueue = context.window.DacRunnerCore.prepare(editable, []);
assert.equal(preparedQueue.queue.map((item) => item.job.id).join(","), "C,B,B-copy", "runner.prepare consumes the logical active Queue order and cannot execute a tombstoned job");

console.log("xlsx quick-prompt smoke tests: PASS");

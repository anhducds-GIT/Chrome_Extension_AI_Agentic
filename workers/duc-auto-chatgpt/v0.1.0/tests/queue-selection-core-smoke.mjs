/* Issue C (NEXT-SESSION-BRIEF): SETUP always ran every eligible job. This
   guards selectQueue's "selected" mode now accepting a set of job ids (not
   just one), while keeping the original single-id callers working, and
   guards that the side panel actually wires a multi-select control to it. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({ console });
for (const file of ["runner-core.js"]) vm.runInContext(fs.readFileSync(new URL(file, root), "utf8"), context);
const runner = context.DacRunnerCore;

const jobs = [
  { id: "A", prompt: "a", status: "PENDING" },
  { id: "B", prompt: "b", status: "FAILED", attempt_phase: "PRE_SUBMIT", failure_type: "TIMEOUT_PRE_SUBMIT" },
  { id: "C", prompt: "c", status: "SUCCESS", attempt_phase: "SUCCESS", result_file: "C.png" },
  { id: "D", prompt: "d", status: "PENDING" }
];
const prepared = runner.prepare({ config: {}, jobs }, []);

// Legacy single-id callers (unchanged behavior).
assert.equal(runner.selectQueue(prepared.queue, "selected", "A").length, 1, "a bare string id still selects that one job");
assert.equal(runner.selectQueue(prepared.queue, "selected", "C").length, 0, "a completed job is never selectable, string form");

// New multi-select forms.
assert.deepEqual(runner.selectQueue(prepared.queue, "selected", ["A", "B"]).map((item) => item.job.id), ["A", "B"], "an array of ids selects every eligible one, in queue order");
assert.deepEqual(runner.selectQueue(prepared.queue, "selected", new Set(["A", "B"])).map((item) => item.job.id), ["A", "B"], "a Set of ids works identically to an array");
assert.equal(runner.selectQueue(prepared.queue, "selected", ["A", "C"]).map((item) => item.job.id).join(","), "A", "a completed job in the selection is silently excluded, not an error");
assert.equal(runner.selectQueue(prepared.queue, "selected", []).length, 0, "an empty selection runs nothing");
assert.equal(runner.selectQueue(prepared.queue, "selected", undefined).length, 0, "no selection at all runs nothing, same as before this field existed");

const sidepanel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
assert.match(sidepanel, /runSelection: new Set\(\)/, "run selection is tracked as its own state, separate from the row-expand selectedJobId");
assert.match(sidepanel, /selectCheckbox\.addEventListener\("change", \(\) => \{/, "queue rows expose a selection checkbox");
assert.match(sidepanel, /state\.runSelection\.add\(item\.job\.id\)/, "checking a row adds it to the run selection");
assert.match(sidepanel, /state\.runSelection\.delete\(item\.job\.id\)/, "unchecking a row removes it from the run selection");
assert.match(sidepanel, /selectCheckbox\.addEventListener\("click", \(event\) => event\.stopPropagation\(\)\)/, "the checkbox click must not also toggle the row's expand/collapse");
assert.match(sidepanel, /els\.runSelectedBtn\?\.addEventListener\("click", \(\) => run\("selected"\)\)/, "a dedicated control runs only the checked jobs");
assert.match(sidepanel, /window\.DacRunnerCore\.selectQueue\(state\.prepared\.queue, mode, mode === "selected" \? state\.runSelection : state\.selectedJobId\)/, "run() forwards the full selection set, not a single id, in selected mode");
assert.match(sidepanel, /if \(mode === "selected"\) state\.runSelection\.clear\(\);/, "the selection is cleared once its run finishes, so stale checked rows do not linger");

const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
assert.match(html, /id="runSelectedBtn"/, "the run-selected control exists in the queue card");

console.log("queue selection core smoke tests: PASS");

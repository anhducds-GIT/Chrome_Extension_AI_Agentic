import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(name, globalName) {
  const context = {};
  vm.runInNewContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context[globalName];
}

const images = load("image-evidence-core.js", "DacImageEvidence");
const runner = load("runner-core.js", "DacRunnerCore");
const candidate = (source, options = {}) => ({ source, ready: true, visible: true, ...options });

assert.equal(images.selectAttributableImage({ postTurn: [candidate("https://new")], visible: [], baseline: [] }).attribution, "post_turn");
assert.equal(images.selectAttributableImage({ postTurn: [], visible: [candidate("https://old"), candidate("https://new")], baseline: [candidate("https://old")] }).attribution, "new_visible_fallback");
assert.equal(images.selectAttributableImage({ postTurn: [], visible: [candidate("https://old")], baseline: [candidate("https://old")] }).reason, "NO_NEW_IMAGE");
assert.equal(images.selectAttributableImage({ postTurn: [candidate("https://one"), candidate("https://two")], visible: [], baseline: [] }).reason, "AMBIGUOUS_POST_TURN_IMAGE");
assert.equal(images.selectAttributableImage({ postTurn: [candidate("https://retry-image")], visible: [], baseline: [] }).ok, true, "Retry UI does not alter image evidence");

const files = [{ fileName: "meo.png" }, { fileName: "bo.jpg" }, { fileName: "style.webp" }];
assert.equal(runner.resolveReferences({ id: "one", reference_images: "meo|bo.jpg" }, files, 3).length, 2);
assert.throws(() => runner.resolveReferences({ id: "one", reference_image: "meo" }, [{ fileName: "meo.png" }, { fileName: "meo.jpg" }], 3), /AMBIGUOUS_REFERENCE/);
assert.throws(() => runner.resolveReferences({ id: "one", reference_images: "meo|bo|style|extra" }, files, 3), /MAX_INPUT_IMAGES/);
assert.throws(() => runner.resolveReferences({ id: "one", reference_images: "meo|meo" }, files, 3), /DUPLICATE_REFERENCE/);
const settings = runner.config({ delay_sec: "5", continue_on_error: "true", max_input_images: "3" });
assert.deepEqual({ min: settings.delay_min_sec, max: settings.delay_max_sec, continue: settings.continue_on_error }, { min: 5, max: 5, continue: true });
assert.equal(runner.resultWorkbookName("jobs.xlsx"), "jobs-result.xlsx");
assert.equal(runner.delaySeconds(runner.config({ delay_min_sec: 4, delay_max_sec: 6 }), () => .99), 6);
const prepared = runner.prepare({ config: { rerun_done: "false" }, jobs: [{ id: "done", prompt: "x", status: "DONE" }, { id: "pending", prompt: "x" }] }, []);
assert.deepEqual(prepared.queue.map((item) => item.status), ["DONE", "PENDING"]);

console.log("v0.2 core smoke tests: PASS");

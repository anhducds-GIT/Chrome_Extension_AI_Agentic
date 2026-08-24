import { readFile, access } from "node:fs/promises";
import { assert, pass } from "./test-helpers.mjs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(await readFile(new URL("Duc-Auto-Gemini.HANDOFF-MANIFEST.json", root), "utf8"));
const gpt = await readFile(new URL("Duc-Auto-Gemini.GPT-WEB-AUDIT-PROMPT.md", root), "utf8");
const claude = await readFile(new URL("Duc-Auto-Gemini.CLAUDE-CODE-HANDOFF.md", root), "utf8");

assert.equal(manifest.schema, "duc-auto-gemini.handoff.v1");
assert.match(manifest.repository.accepted_90_percent_sha, /^[0-9a-f]{40}$/);
assert.match(manifest.repository.page_only_preflight_sha, /^[0-9a-f]{40}$/);
assert.equal(manifest.status.implementation, "REVIEW_READY_90_PERCENT");
assert.equal(manifest.status.live_runtime, "LIVE_RUNTIME_UNVERIFIED");
assert.deepEqual(manifest.scope.allowed, ["workers/duc-auto-gemini/v0.1.0/**"]);
assert.equal(manifest.pilot_inputs.reference_images.included, false);
assert.deepEqual(manifest.pilot_inputs.reference_images.required_names, ["reference-one.png", "reference-two.jpg", "reference-three.webp"]);

for (const path of manifest.source_of_truth) await access(new URL(path, root));
for (const token of [manifest.repository.accepted_90_percent_sha, manifest.repository.page_only_preflight_sha, "BLOCKED — SOURCE_UNAVAILABLE", "PASS — REVIEW-READY 90%", "Claude Code action packet"]) assert.ok(gpt.includes(token), token);
for (const token of ["READ_ONLY_AUDIT", "git pull --ff-only origin main", "git add -A", "NO CODE CHANGE", "LIVE_RUNTIME_UNVERIFIED / OWNER_PILOT_PENDING", "reference-three.webp"]) assert.ok(claude.includes(token), token);
assert.ok(!/TO[_ -]?FILL|PLACEHOLDER_SHA|TBD_SHA/i.test(gpt + claude + JSON.stringify(manifest)), "handoff has no unresolved identity placeholder");

pass("handoff package: immutable identities, source topology, GPT audit and Claude Code routing");

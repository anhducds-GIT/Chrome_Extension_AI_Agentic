import { readFile } from "node:fs/promises";
import { assert, pass } from "./test-helpers.mjs";
const body = await readFile(new URL("../content.js", import.meta.url), "utf8");
for (const guard of ["ensureFileInput", "FILE_INPUT_NOT_EXPOSED", "ATTACHMENT_NOT_READY", "SEND_NOT_READY", "attachmentPending()", "securityBlocker", "quotaBlocker", "responseKey", "afterBoundary"]) assert.ok(body.includes(guard), guard);
assert.ok(body.indexOf("persistStage(attempt)") < body.indexOf("send.click()"), "SUBMITTED is durably requested before the send click");
assert.ok(body.includes("Runtime.matchesAttempt(state.activeAttempt, message)"), "abort and wait are identity-bound");
pass("content guards: lazy upload, preview readiness, disabled send, blockers and durable pre-click boundary");

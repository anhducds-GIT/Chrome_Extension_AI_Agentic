/* Operator-facing diagnostics are Vietnamese; the finding CODE stays English
   because it is the identifier written to the audit JSONL, the Result ledger
   and every other test. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const context = vm.createContext({});
vm.runInContext(fs.readFileSync(new URL("operator-messages-core.js", root), "utf8"), context);
const messages = context.DacOperatorMessages;

/* ---- every code the panel can render has Vietnamese text ----------------- */

const diagnostics = fs.readFileSync(new URL("plan-diagnostics-core.js", root), "utf8");
const blockingCodes = [...diagnostics.matchAll(/makeFinding\("([A-Z0-9_]+)", "(BLOCKER|WARNING)"/g)].map((match) => match[1]);
assert.ok(blockingCodes.length >= 10, "the diagnostic codes were found");
for (const code of blockingCodes) {
  assert.ok(messages.messageFor(code), `${code} has Vietnamese operator text`);
}

// Resume and checkpoint codes are raised from sidepanel.js and resume-core.js.
for (const code of [
  "RESUME_LEDGER_INVALID", "RESUME_RUN_ID_MISMATCH", "RESUME_LATEST_CHECKPOINT_INVALID",
  "RESUME_OUTPUT_MISMATCH", "RESUME_AMBIGUOUS_SUBMISSION", "RESUME_RECREATE_INCOMPLETE",
  "RESUME_AUDIT_CHAIN_MISSING", "RESUME_AUDIT_GAP_SEGMENT_MISSING", "RESUME_AUDIT_APPEND_UNAVAILABLE",
  "RESUME_CHECKPOINT_VERSION_AMBIGUOUS", "CHECKPOINT_VERSION_CONFLICT",
  "CHATGPT_NOT_CONNECTED", "CHATGPT_RECEIVER_UNAVAILABLE", "CHATGPT_COMPOSER_UNAVAILABLE",
  "CHATGPT_BUSY", "CHATGPT_SECURITY_BLOCKER"
]) assert.ok(messages.messageFor(code), `${code} has Vietnamese operator text`);

/* ---- the text is actually Vietnamese, not the English left in place ------ */

const vietnamese = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
for (const [code, entry] of Object.entries(messages.MESSAGES)) {
  assert.ok(entry.label && entry.guidance, `${code} has both a label and guidance`);
  assert.ok(vietnamese.test(`${entry.label} ${entry.guidance}`), `${code} reads as Vietnamese`);
  assert.doesNotMatch(entry.label, /_/, `${code} label is prose, not a raw code`);
}

/* ---- presentation ------------------------------------------------------- */

const shown = messages.present({
  code: "RESUME_CHECKPOINT_VERSION_AMBIGUOUS",
  severity: "BLOCKER",
  message: "v02: Pilot__results__v002.xlsx · Pilot__results__v02.xlsx",
  guidance: "Keep exactly one file per checkpoint version."
});
assert.equal(shown.label, "Hai file checkpoint trùng số phiên bản");
assert.match(shown.guidance, /Đừng xoá/, "the Vietnamese guidance replaces the English one");
assert.equal(shown.detail, "v02: Pilot__results__v002.xlsx · Pilot__results__v02.xlsx", "filenames survive as technical detail");

// An untranslated code still renders rather than showing a blank row.
const fallback = messages.present({ code: "SOME_FUTURE_CODE", guidance: "Do the thing." });
assert.equal(fallback.label, "SOME FUTURE CODE");
assert.equal(fallback.guidance, "Do the thing.");

// A message identical to the guidance is not repeated twice in one row.
assert.equal(messages.present({ code: "WORKBOOK_NOT_LOADED", message: "Chọn một file .xlsx để bắt đầu." }).detail, "");

/* ---- the panel uses it, and codes stay English in machine records -------- */

const sidepanel = fs.readFileSync(new URL("sidepanel.js", root), "utf8");
assert.match(sidepanel, /window\.DacOperatorMessages\.present\(finding\)/, "the Check Plan panel renders translated text");
assert.match(sidepanel, /window\.DacOperatorMessages\.present\(item\)/, "the Resume Plan panel renders translated text");
assert.doesNotMatch(sidepanel, /finding\.code\.replace\(\/_\/g, " "\)/, "the raw SCREAMING_SNAKE code is no longer the row title");
assert.match(sidepanel, /audit\("ARTIFACT_PERSISTENCE_FAILED"/, "audit event names remain English identifiers");

const html = fs.readFileSync(new URL("sidepanel.html", root), "utf8");
assert.match(html, /<script src="operator-messages-core\.js"><\/script>/, "the module is loaded by the side panel");

console.log("operator messages core smoke: PASS");

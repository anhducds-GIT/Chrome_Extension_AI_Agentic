/* Regression guard for the Result-checkpoint config worksheet.
   updateConfigSnapshot derives both its key index and its next row number from
   the `rows` array captured at open(). Rows it appends must be pushed back
   into that array, otherwise a second snapshot cannot see them and appends a
   duplicate set reusing the same @r row numbers -- invalid SpreadsheetML whose
   first copy keeps a stale value forever. Observed in Pilot-05 v005: 64 rows,
   44 distinct @r, 40 duplicated cell refs. */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createConfigWorkbook, FakeXMLSerializer, serialize } from "./xlsx-test-utils.mjs";

const context = vm.createContext({ window: {}, TextEncoder, TextDecoder, XMLSerializer: FakeXMLSerializer, console });
vm.runInContext(fs.readFileSync(new URL("../xlsx-codec.js", import.meta.url), "utf8"), context);
const xlsx = context.window.DacXlsx;

const workbook = createConfigWorkbook([["timeout_sec", "300"], ["collision_policy", "overwrite"]]);

assert.equal(xlsx.updateConfigSnapshot(workbook, { run_id: "20260821-0314-pilot-05", effective_collision_policy: "uniquify" }), true);
assert.equal(xlsx.updateConfigSnapshot(workbook, { run_id: "20260821-0314-pilot-05", effective_collision_policy: "overwrite", checkpoint_version: "2" }), true);
assert.equal(xlsx.updateConfigSnapshot(workbook, { checkpoint_version: "3", checkpoint_filename: "Pilot__results__v003.xlsx" }), true);

const xml = serialize(workbook.configSheet.document.documentElement);
const rowNumbers = [...xml.matchAll(/<row r="(\d+)"/g)].map((match) => Number(match[1]));
const cellRefs = [...xml.matchAll(/<c r="([A-Z]+\d+)"/g)].map((match) => match[1]);

assert.equal(rowNumbers.length, new Set(rowNumbers).size, `config worksheet must not reuse row numbers (${rowNumbers.join(",")})`);
assert.equal(cellRefs.length, new Set(cellRefs).size, "config worksheet must not reuse cell references");

// header + 2 seeded rows + run_id + effective_collision_policy + checkpoint_version + checkpoint_filename
assert.equal(rowNumbers.length, 7, "each key occupies exactly one row across repeated snapshots");

for (const key of ["run_id", "effective_collision_policy", "checkpoint_version", "checkpoint_filename"]) {
  const occurrences = [...xml.matchAll(new RegExp(`<t>${key}</t>`, "g"))].length;
  assert.equal(occurrences, 1, `${key} must appear exactly once, not once per snapshot`);
}

assert.equal(workbook.config.effective_collision_policy, "overwrite", "the latest snapshot value wins");
assert.equal(workbook.config.checkpoint_version, "3");
assert.equal(workbook.config.checkpoint_filename, "Pilot__results__v003.xlsx");
assert.match(xml, /<t>overwrite<\/t>/, "current value is written");
assert.doesNotMatch(xml, /<t>uniquify<\/t>/, "no stale duplicate keeps a superseded value");

assert.ok(workbook.entries.get(workbook.configPath), "serialized worksheet is written back into the ZIP entries");

console.log("XLSX config snapshot smoke tests: PASS");

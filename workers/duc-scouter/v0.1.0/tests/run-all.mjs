/* Runs every deterministic worker test in one pass.
   Node only -- no shell builtins, so it behaves identically in PowerShell,
   Git Bash and CI. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const skip = new Set(["run-all.mjs", "xlsx-test-utils.mjs"]);
const files = fs.readdirSync(here).filter((name) => name.endsWith(".mjs") && !skip.has(name)).sort();

let passed = 0;
const failed = [];
for (const file of files) {
  try {
    execFileSync(process.execPath, [path.join(here, file)], { stdio: "pipe", encoding: "utf8" });
    passed += 1;
    console.log(`PASS  ${file}`);
  } catch (error) {
    failed.push(file);
    console.log(`FAIL  ${file}`);
    const detail = `${error.stdout || ""}${error.stderr || ""}`.trim().split("\n").slice(0, 15);
    for (const line of detail) console.log(`      ${line}`);
  }
}

console.log(`\n${passed} passed, ${failed.length} failed, ${files.length} total`);
if (failed.length) {
  console.log(`Failed: ${failed.join(", ")}`);
  process.exitCode = 1;
}

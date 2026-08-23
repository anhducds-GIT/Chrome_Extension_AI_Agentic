import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
export { assert };
export async function load(file, globalName) { delete globalThis[globalName]; const href=file instanceof URL?file.href:pathToFileURL(resolve(file)).href; await import(`${href}?v=${Date.now()}-${Math.random()}`); return globalThis[globalName]; }
export function pass(name) { console.log(`PASS ${name}`); }

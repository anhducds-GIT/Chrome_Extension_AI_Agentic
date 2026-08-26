/* references.add -- the ONE bridge method that accepts image BYTES.

   Why it exists: on 2026-08-26 an AI operator tried to stage a reference-image
   pilot entirely over the bridge and could not. jobs.add returned, live,
   "MISSING_REFERENCE: Q001 requires 'REF-A-RED-CIRCLE.png'" -- because
   reference_images everywhere else carries a bare filename TOKEN that must
   already resolve against state.files, and state.files was only ever filled by
   the owner's file picker. The Gemini worker had solved this; this worker had
   not (recorded in BACKLOG B-06 as "GPT còn thiếu references.add").

   These tests pin the params contract. The in-memory shape the handler builds
   is pinned separately in tests/bridge-references-add-static.mjs, because the
   handler lives in sidepanel.js and cannot be imported here. */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const bridge = globalThis.DacBridgeCore;

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
const JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwcJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPDIzNP/AABEIAAEAAQMBIgACEQEDEQH/xAAfAAABBQEBAQEBAQAAAAAAAAABAgMEBQYHCAkKC//EALUQAAIBAwMCBAMFBQQEAAABfQECAwAEEQUSITFBBhNRYQcicRQygZGhCCNCscEVUtHwJDNicoIJChYXGBkaJSYnKCkqNDU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6g4SFhoeIiYqSk5SVlpeYmZqio6Slpqeoqaqys7S1tre4ubrCw8TFxsfIycrS09TV1tfY2drh4uPk5ebn6Onq8fLz9PX29/j5+v/aAAwDAQACEQMRAD8A/9k=";

const valid = (extra = {}) => ({ references: [{ name: "REF-A.png", data_url: PNG }], ...extra });
const accepts = (params, why) => assert.doesNotThrow(() => bridge.validateParams("references.add", params), why);
const rejects = (params, pattern, why) => assert.throws(() => bridge.validateParams("references.add", params), pattern, why);

/* ---- the method is actually wired ------------------------------------- */

const entry = bridge.METHOD_REGISTRY["references.add"];
assert(entry, "references.add must be in the registry, or the CLI cannot reach it");
assert.equal(entry.read_only, false, "it mutates the Setup session");
assert.equal(entry.approval, "none", "reference bytes are pre-submit input, not an owner-gated action");
assert.equal(entry.context, "executor");
// A repeat call REPLACES the stored image rather than being a no-op, so the
// replay store must not be told it can dedupe two calls into one.
assert.equal(entry.idempotent, false, "replace-by-name is not idempotent and must not claim to be");
assert(bridge.capabilities().methods.some((method) => method.name === "references.add"),
  "an AI operator discovers this method through system.capabilities");

/* ---- happy paths ------------------------------------------------------ */

accepts(valid(), "one png reference is the simplest legitimate call");
accepts({ references: [{ name: "REF-C.jpg", data_url: JPEG }] }, "jpeg is accepted");
accepts({ references: [{ name: "REF-C.jpeg", data_url: JPEG }] }, ".jpeg spelling is accepted");
accepts({ references: [
  { name: "a.png", data_url: PNG }, { name: "b.png", data_url: PNG },
  { name: "c.jpg", data_url: JPEG }, { name: "d.png", data_url: PNG }, { name: "e.webp", data_url: PNG.replace("image/png", "image/webp") }
] }, "five references is the documented ceiling");

const normalized = bridge.validateParams("references.add", valid());
assert.deepEqual(normalized, { references: [{ name: "REF-A.png", data_url: PNG }] },
  "validation returns exactly name + data_url, dropping nothing and inventing nothing");

/* ---- the door must stay narrow ---------------------------------------- */

rejects({ references: [] }, /1-5 reference images/, "an empty batch is a caller mistake, not a no-op");
rejects({ references: Array.from({ length: 6 }, (_, index) => ({ name: `r${index}.png`, data_url: PNG })) },
  /1-5 reference images/, "six exceeds max_references_per_add");
rejects({}, /references/, "references is required");
rejects(valid({ extra: 1 }), /unknown field/, "unknown top-level fields are refused, not ignored");
rejects({ references: [{ name: "a.png", data_url: PNG, extra: 1 }] }, /unknown field/, "unknown per-reference fields too");

// Path traversal and absolute paths. The name becomes a filename token that
// resolveReferences matches, and later a key the runner reports in the audit;
// a path here would let a caller reach outside the notion of "a filename".
rejects({ references: [{ name: "../a.png", data_url: PNG }] }, /filename or alias token/, "parent traversal");
rejects({ references: [{ name: "dir/a.png", data_url: PNG }] }, /filename or alias token/, "forward slash");
rejects({ references: [{ name: "dir\\a.png", data_url: PNG }] }, /filename or alias token/, "backslash");
rejects({ references: [{ name: "C:\\a.png", data_url: PNG }] }, /filename or alias token/, "absolute Windows path");
rejects({ references: [{ name: "..", data_url: PNG }] }, /filename or alias token/, "bare parent");

// Extension gate. This is what keeps a scriptable SVG out: image/svg+xml is
// not in the MIME allowlist AND .svg is not in the extension allowlist, so it
// fails twice rather than relying on either one alone.
rejects({ references: [{ name: "a.svg", data_url: "data:image/svg+xml;base64,PHN2Zy8+" }] }, /\.png, \.jpg, \.jpeg, or \.webp/, "svg name");
rejects({ references: [{ name: "a.png", data_url: "data:image/svg+xml;base64,PHN2Zy8+" }] }, /data:image\/\(png\|jpeg\|webp\);base64,/, "svg payload behind a png name");
rejects({ references: [{ name: "a.txt", data_url: PNG }] }, /\.png, \.jpg, \.jpeg, or \.webp/, "non-image extension");

// The payload must really be a base64 image data URL, not a URL to fetch, not
// raw bytes, not a file:// reference.
rejects({ references: [{ name: "a.png", data_url: "https://example.com/a.png" }] }, /data:image/, "remote URL");
rejects({ references: [{ name: "a.png", data_url: "file:///C:/a.png" }] }, /data:image/, "local file URL");
rejects({ references: [{ name: "a.png", data_url: "data:image/png;base64," }] }, /standard base64/, "empty payload");
rejects({ references: [{ name: "a.png", data_url: "data:image/png;base64,not base64!" }] }, /standard base64/, "non-base64 payload");
rejects({ references: [{ name: "a.png", data_url: "data:image/png,iVBOR" }] }, /data:image/, "missing base64 marker");
rejects({ references: [{ name: "a.png", data_url: PNG.replace("base64", "BASE64") }] }, /data:image/, "the prefix is matched case-sensitively");
rejects({ references: [{ name: "a.png", data_url: 123 }] }, /expected a string/, "a number is not a data url");

// Size ceiling. Guards the envelope: a caller with a 4MB photo must downscale
// it rather than have it silently truncated or blow up the transport.
const oversized = "data:image/png;base64," + "A".repeat(700 * 1024);
rejects({ references: [{ name: "big.png", data_url: oversized }] }, /at most 716800 bytes/, "over the per-reference ceiling");

// Duplicate names, case-insensitively: two entries claiming the same token
// would make resolveReferences ambiguous, and which one won would depend on
// iteration order.
rejects({ references: [{ name: "a.png", data_url: PNG }, { name: "A.PNG", data_url: PNG }] },
  /duplicate reference name/, "same name in different case is still a collision");

console.log("bridge references.add smoke tests: PASS");

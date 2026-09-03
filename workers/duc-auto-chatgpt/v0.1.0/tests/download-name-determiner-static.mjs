// Chrome on the owner's machine ignores blob-download filename suggestions
// (URL-derived GUID names, flat in the configured download directory — live
// evidence 2026-08-25, both GPT and Gemini extensions affected). A filename
// determiner has final say, so the background names this extension's OWN
// downloads and defers on everything else.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const background = fs.readFileSync(path.join(root, "background.js"), "utf8");
const panel = fs.readFileSync(path.join(root, "sidepanel.js"), "utf8");

// Determiner registered, scoped to our own downloads, defers otherwise.
assert.match(background, /chrome\.downloads\.onDeterminingFilename\?\.addListener/, "determiner must be registered");
const determiner = background.slice(background.indexOf("onDeterminingFilename"), background.indexOf("chrome.runtime.onMessage.addListener"));
// 2026-09-04, B-36: this file used to assert the determiner contains
// `item.byExtensionId !== chrome.runtime.id`. That pinned the IMPLEMENTATION,
// and the implementation was the bug -- Chrome does not always populate that
// field, and the bare `suggest()` behind it silently handed the download
// Chrome's default name, which for a blob URL is a GUID. 36 GUID-named files
// on disk between 09 Jul and 04 Sep, including one dated 28 Aug, i.e. AFTER
// B-13 was written into "closed". A test that asserts the presence of a bug is
// a wall across the road to fixing it.
//
// Rewritten as invariants that survive the fix. The OUTCOMES these lines used
// to gesture at -- names honoured, other people's downloads deferred, expired
// tickets refused -- are now proven by running the shipped code against real
// DownloadItem shapes in tests/download-name-determiner-behaviour.mjs (8/8
// mutations red). Static assertions keep only what static reading can prove:
// that ownership is decided by the ticket, and that a defer path exists.
assert.match(determiner, /takeExpectedDownloadName\(item\)/, "ownership must be decided by the reservation lookup, not by a metadata field");
assert.match(determiner, /if \(!expected\) \{ suggest\(\); return; \}/, "must keep a defer path: no usable ticket means no opinion, so other extensions' downloads are left alone");
assert.match(determiner, /suggest\(\{ filename: expected\.filename, conflictAction: expected\.conflictAction \}\)/, "must suggest the expected name");
assert.match(background, /expectedDownloadNames\.get\(item\?\.url\)/, "must still key expectations by url as the primary lookup");
assert.doesNotMatch(determiner, /byExtensionId/, "the determiner must NOT gate on byExtensionId again -- that field is the 8-week bug (B-36)");

// Expectations validated and TTL-pruned; conflictAction restricted to the
// chrome enum (never "fail" — that policy is pre-checked before download).
const remember = background.slice(background.indexOf("function rememberExpectedDownloadName"), background.indexOf("chrome.downloads.onDeterminingFilename"));
assert.match(remember, /\["uniquify", "overwrite", "prompt"\]/, "conflictAction must be a chrome enum value");
assert.match(remember, /expires/, "expectations must expire");

// Images already reserve and download inside background.js. Artifact blobs
// now do the same in one DAC_DOWNLOAD_ARTIFACT request: splitting those two
// operations across MV3 turns lost the in-memory reservation live and let a
// GUID filename through.
const backgroundCall = background.indexOf("chrome.downloads.download({ url, filename: requestedFilename");
assert.ok(backgroundCall > 0 && background.lastIndexOf("rememberExpectedDownloadName(url, requestedFilename", backgroundCall) > 0, "image download must register its name");
assert.doesNotMatch(panel, /chrome\.downloads\.download\(\{ url: objectUrl/, "panel does not start artifact downloads after releasing naming state");
assert.equal((panel.match(/downloadArtifactViaBackground\(objectUrl, request/g) || []).length, 2, "both panel artifact sites use the atomic background transaction");
assert.match(panel, /DAC_DOWNLOAD_ARTIFACT/, "panel must call the atomic artifact message");
assert.match(background, /DAC_DOWNLOAD_ARTIFACT/, "background must accept the atomic artifact message");
assert.match(background, /DAC_EXPECT_DOWNLOAD_NAME/, "background must accept the registration message");

console.log("download-name-determiner-static: all assertions passed");

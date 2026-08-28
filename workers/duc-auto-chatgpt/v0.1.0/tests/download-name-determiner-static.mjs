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
assert.match(determiner, /item\.byExtensionId !== chrome\.runtime\.id/, "must defer on other extensions' downloads");
assert.match(determiner, /expectedDownloadNames\.get\(item\.url\)/, "must key expectations by url");
assert.match(determiner, /suggest\(\{ filename: expected\.filename, conflictAction: expected\.conflictAction \}\)/, "must suggest the expected name");

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

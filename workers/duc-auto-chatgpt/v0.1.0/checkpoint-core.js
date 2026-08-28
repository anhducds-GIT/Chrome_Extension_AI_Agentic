(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const leaf = (value) => text(value).replace(/^.*[\\/]/, "");
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  // Two digits is the naming convention: a run reaches a handful of
  // checkpoints, not hundreds.  Versions past 99 simply widen rather than
  // truncate, so ordering by number stays correct.
  function formatVersion(value) {
    const version = Number(value);
    if (!Number.isInteger(version) || version < 1) throw new Error("Checkpoint version must be a positive integer.");
    return String(version).padStart(2, "0");
  }

  function hasVersionToken(pattern) { return /\{version\}/.test(text(pattern)); }

  function render(pattern, version) {
    if (!hasVersionToken(pattern)) throw new Error("Result checkpoint pattern must include {version}.");
    return text(pattern).replace(/\{version\}/g, formatVersion(version));
  }

  function parse(pattern, filename) {
    const source = text(pattern);
    const actual = leaf(filename);
    if (!hasVersionToken(source)) return null;
    const parts = source.split("{version}");
    // Accepts two or more digits so checkpoints written under the earlier
    // three-digit convention (v001) still resume; they parse to the same
    // version number and the next checkpoint is written as v02.
    const expression = `^${parts.map(escapeRegExp).join("(\\d{2,})")}$`;
    const match = new RegExp(expression, "i").exec(actual);
    if (!match) return null;
    const version = Number(match[1]);
    return Number.isSafeInteger(version) && version >= 1 ? { filename: actual, version } : null;
  }

  // The same naming rule as parse(), expressed for chrome.downloads.search().
  // Chrome matches this against the FULL path, so it is anchored only at the
  // end: the folder part varies, the leaf must match exactly. Built from the
  // pattern -- which carries the workbook's own base name -- so a search can
  // never reach another run's files, and never the audit JSONL, which has no
  // {version} token at all.
  // Anchored at BOTH ends: start-of-string or a path separator, and end of
  // string. Without the leading guard this matched 'Final-Pilot__results__
  // v03.xlsx' when the run was 'Pilot' -- a different workbook whose name
  // merely ends with ours, whose files would then become deletion candidates.
  function filenameRegex(pattern) {
    const source = text(pattern);
    if (!hasVersionToken(source)) return "";
    return `(?:^|[\\\\/])${source.split("{version}").map(escapeRegExp).join("\\d{2,}")}$`;
  }

  // Is `candidatePath` in the SAME directory as `anchorPath`?
  //
  // Re-audit 2026-08-28 killed two weaker versions of this. Comparing the tail
  // of the path (`endsWith(folder + leaf)`) accepted a folder whose name merely
  // ends with ours ('ChatGPT/' vs 'Duc Auto ChatGPT/'), and adding a leading
  // separator still accepted a NESTED one ('Reports/' vs 'Archive/Reports/') --
  // which deleted the only surviving ledger of a different run. Nothing short
  // of comparing the whole directory is safe, so this takes the absolute path
  // Chrome reported for the file we ourselves just wrote as the anchor.
  //
  // Case-insensitive because Windows paths are, and Chrome reports the folder
  // as it exists on disk: a folder created as 'duc auto chatgpt' would
  // otherwise silently match nothing and quietly disable cleanup altogether.
  function sameFolder(anchorPath, candidatePath) {
    const directory = (value) => {
      const normalised = String(value ?? "").replace(/\\/g, "/");
      const cut = normalised.lastIndexOf("/");
      return cut < 0 ? "" : normalised.slice(0, cut + 1).toLowerCase();
    };
    const anchor = directory(anchorPath);
    if (!anchor) return false;
    return directory(candidatePath) === anchor;
  }

  function highest(candidates = []) {
    return [...candidates].filter((item) => Number.isInteger(item?.version) && item.version >= 1)
      .sort((left, right) => right.version - left.version || String(left.filename).localeCompare(String(right.filename)))[0] || null;
  }

  // Bounded retention. Đức, 2026-08-28, after a live trial: three text jobs
  // left ten Result checkpoints behind, and a 66-job pilot would leave ~200.
  // Every checkpoint carries state the one before it does not, so the answer
  // is NOT to write fewer of them -- it is to stop keeping all of them.
  //
  // Three rules this function exists to make unbreakable:
  //   1. The highest version is NEVER prunable. scanProfileCheckpoints() opens
  //      exactly that file to recover a run, so it is the authoritative ledger.
  //   2. Nothing is pruned until more than `keep` checkpoints exist, so disk
  //      never holds fewer than one verified file at any instant.
  //   3. Mixed naming widths ('v2' and 'v02' both mean version 2) make "which
  //      file is newest" genuinely ambiguous. highest() would tie-break on
  //      filename and could pick the OLDER one. Refuse to prune anything while
  //      that ambiguity exists and let the existing resume blocker surface it
  //      -- deleting the wrong file here is not recoverable.
  function prunable(candidates = [], { keep = 2 } = {}) {
    if (versionCollisions(candidates).length) return [];
    const retained = Math.max(1, Math.floor(Number(keep)) || 1);
    const seen = new Set();
    const ordered = (candidates || [])
      // A filename must be a bare leaf. This helper is exported as a general
      // pure function and its output is fed straight to a delete call, so it
      // refuses anything carrying a path -- it must never be the thing that
      // lets '../' reach outside the run's own folder.
      .filter((item) => Number.isInteger(item?.version) && item.version >= 1
        && typeof item?.filename === "string" && item.filename.trim()
        // The previous form -- split(".").includes("..") -- could never be
        // true, because splitting on "." discards the delimiter. It read like a
        // traversal guard while being a no-op.
        && !/[\\/]/.test(item.filename) && item.filename.trim() !== "." && item.filename.trim() !== "..")
      // De-duplicate by filename. versionCollisions() reports nothing when two
      // entries are IDENTICAL (same version AND same name), so duplicates used
      // to inflate the count past `keep` and push the newest file into the
      // delete list -- three copies of a lone checkpoint deleted it.
      .filter((item) => { const key = item.filename.toLowerCase(); if (seen.has(key)) return false; seen.add(key); return true; })
      .sort((left, right) => right.version - left.version);
    const stale = ordered.length > retained ? ordered.slice(retained) : [];
    // Backstop only, and honestly labelled as such: with the clamp and the
    // de-duplication above, slice(retained >= 1) already cannot reach index 0.
    // No test can kill this line, so do not read a passing suite as evidence
    // that it works -- it is here so that a future edit weakening either guard
    // still cannot delete the recoverable ledger.
    //
    // It refuses EVERYTHING rather than quietly trimming the newest back out:
    // if this ever fires, a guard above has failed and the whole result set is
    // untrustworthy. Silently repairing it would hide the real bug.
    const newest = highest(ordered);
    if (newest && stale.some((item) => item.filename === newest.filename)) return [];
    return stale;
  }

  // The complete "may I delete anything at all?" decision, kept pure so it can
  // be tested. Pruning keeps the highest versions, so it is only ever correct
  // when the checkpoint just written IS the highest one present. A mismatch
  // means the destination holds checkpoints this run did not write -- debris to
  // report, never licence to delete.
  function pruneTargets(candidates = [], justWritten = null, { keep = 2 } = {}) {
    const newest = highest(candidates);
    if (!newest || !justWritten) return { ok: false, newest, stale: [] };
    if (newest.version !== justWritten.version || newest.filename !== justWritten.filename) return { ok: false, newest, stale: [] };
    return { ok: true, newest, stale: prunable(candidates, { keep }) };
  }

  function nextVersion(currentVersion) { return Math.max(0, Number(currentVersion) || 0) + 1; }
  function hasVersionConflict(candidates = [], version) { return (candidates || []).some((item) => Number(item?.version) === Number(version)); }

  function partialFilename(filename, version, ordinal = 0) {
    const suffix = ordinal > 0 ? `-${String(ordinal).padStart(2, "0")}` : "";
    return `${leaf(filename)}.partial-v${formatVersion(version)}${suffix}`;
  }

  async function quarantinePartial(directoryHandle, filename, version, fileExists) {
    if (!directoryHandle || typeof directoryHandle.getFileHandle !== "function" || typeof fileExists !== "function") {
      throw new Error("Checkpoint quarantine requires a writable directory handle.");
    }
    const source = await directoryHandle.getFileHandle(leaf(filename), { create: false });
    if (typeof source.move !== "function") throw new Error("Checkpoint quarantine requires FileSystemFileHandle.move().");
    for (let ordinal = 0; ordinal < 100; ordinal += 1) {
      const candidate = partialFilename(filename, version, ordinal);
      if (await fileExists(directoryHandle, candidate)) continue;
      await source.move(candidate);
      return candidate;
    }
    throw new Error("Could not find a non-overwriting partial checkpoint filename.");
  }

  async function persistDirectoryCheckpoint({ directoryHandle, filename, version, blob, writeNewFile, fileExists, onAbandoned = async () => {} }) {
    try {
      return await writeNewFile(directoryHandle, filename, blob);
    } catch (error) {
      if (!/^PERSISTENCE_VERIFICATION_FAILED:/i.test(String(error?.message || error))) throw error;
      if (!(await fileExists(directoryHandle, filename))) throw error;
      const abandonedFilename = await quarantinePartial(directoryHandle, filename, version, fileExists);
      await onAbandoned({ filename, abandoned_filename: abandonedFilename, version, error: String(error?.message || error) });
      throw error;
    }
  }

  // Two files can parse to the same version once a folder mixes naming widths
  // (v002 and v02 both mean 2).  highest() would then break the tie on
  // filename and silently prefer one, which is exactly the "never fall back
  // quietly" rule the checkpoint protocol exists to enforce.  Callers must
  // surface a collision instead of choosing.
  function versionCollisions(candidates = []) {
    const byVersion = new Map();
    for (const item of candidates || []) {
      if (!Number.isInteger(item?.version) || item.version < 1) continue;
      const filenames = byVersion.get(item.version) || [];
      const filename = String(item.filename ?? "");
      if (!filenames.includes(filename)) filenames.push(filename);
      byVersion.set(item.version, filenames);
    }
    return [...byVersion.entries()]
      .filter(([, filenames]) => filenames.length > 1)
      .map(([version, filenames]) => ({ version, filenames: [...filenames].sort() }))
      .sort((left, right) => right.version - left.version);
  }

  (typeof window !== "undefined" ? window : globalThis).DacCheckpointCore = { formatVersion, hasVersionToken, render, parse, filenameRegex, sameFolder, highest, prunable, pruneTargets, nextVersion, hasVersionConflict, partialFilename, quarantinePartial, persistDirectoryCheckpoint, versionCollisions };
})();

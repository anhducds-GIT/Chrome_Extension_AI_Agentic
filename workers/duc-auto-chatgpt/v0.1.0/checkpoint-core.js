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

  function highest(candidates = []) {
    return [...candidates].filter((item) => Number.isInteger(item?.version) && item.version >= 1)
      .sort((left, right) => right.version - left.version || String(left.filename).localeCompare(String(right.filename)))[0] || null;
  }

  function nextVersion(currentVersion) { return Math.max(0, Number(currentVersion) || 0) + 1; }
  function hasVersionConflict(candidates = [], version) { return (candidates || []).some((item) => Number(item?.version) === Number(version)); }

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

  (typeof window !== "undefined" ? window : globalThis).DacCheckpointCore = { formatVersion, hasVersionToken, render, parse, highest, nextVersion, hasVersionConflict, versionCollisions };
})();

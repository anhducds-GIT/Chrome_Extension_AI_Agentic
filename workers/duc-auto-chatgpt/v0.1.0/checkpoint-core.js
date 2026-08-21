(() => {
  "use strict";

  const text = (value) => String(value ?? "").trim();
  const leaf = (value) => text(value).replace(/^.*[\\/]/, "");
  const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  function formatVersion(value) {
    const version = Number(value);
    if (!Number.isInteger(version) || version < 1) throw new Error("Checkpoint version must be a positive integer.");
    return String(version).padStart(3, "0");
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
    const expression = `^${parts.map(escapeRegExp).join("(\\d{3,})")}$`;
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

  (typeof window !== "undefined" ? window : globalThis).DacCheckpointCore = { formatVersion, hasVersionToken, render, parse, highest, nextVersion, hasVersionConflict };
})();

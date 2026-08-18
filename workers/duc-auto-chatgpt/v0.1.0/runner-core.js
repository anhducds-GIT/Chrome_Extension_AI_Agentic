(() => {
  "use strict";

  const DEFAULTS = { timeout_sec: 180, delay_min_sec: 3, delay_max_sec: 3, continue_on_error: true, output_folder: "Duc Auto ChatGPT", max_input_images: 3, rerun_done: false };
  const imageExtension = /\.(avif|gif|jpe?g|png|webp)$/i;
  const normalise = (value) => String(value || "").trim().toLowerCase();
  const basename = (value) => normalise(value).replace(/^.*[\\/]/, "").replace(imageExtension, "");
  const tokens = (value) => String(value || "").split("|").map((item) => item.trim()).filter(Boolean);

  function bool(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    if (/^(true|1|yes)$/i.test(String(value).trim())) return true;
    if (/^(false|0|no)$/i.test(String(value).trim())) return false;
    throw new Error(`Invalid boolean value '${value}'.`);
  }
  function whole(value, fallback, minimum, maximum, key) {
    if (value === undefined || value === null || value === "") return fallback;
    const number = Number(value);
    if (!Number.isInteger(number) || number < minimum || number > maximum) throw new Error(`Invalid ${key}; expected ${minimum}-${maximum}.`);
    return number;
  }
  function config(raw = {}) {
    const timeout = whole(raw.timeout_sec, DEFAULTS.timeout_sec, 15, 900, "timeout_sec");
    const legacyDelay = raw.delay_sec === undefined || raw.delay_sec === "" ? null : whole(raw.delay_sec, null, 1, 120, "delay_sec");
    const min = whole(raw.delay_min_sec, legacyDelay ?? DEFAULTS.delay_min_sec, 1, 120, "delay_min_sec");
    const max = whole(raw.delay_max_sec, legacyDelay ?? DEFAULTS.delay_max_sec, 1, 120, "delay_max_sec");
    if (min > max) throw new Error("delay_min_sec must not exceed delay_max_sec.");
    const folder = String(raw.output_folder || DEFAULTS.output_folder).trim();
    if (!folder || /(^|[\\/])\.\.([\\/]|$)/.test(folder)) throw new Error("output_folder must be a safe relative folder name.");
    return { timeout_sec: timeout, delay_min_sec: min, delay_max_sec: max, continue_on_error: bool(raw.continue_on_error, true), output_folder: folder.replace(/[\\/]+/g, "/"), max_input_images: whole(raw.max_input_images, 3, 0, 10, "max_input_images"), rerun_done: bool(raw.rerun_done, false) };
  }
  function referenceTokens(job) { return tokens(job.reference_images || job.reference_image); }
  function resolveReferences(job, selectedFiles, maxInputImages) {
    const requested = referenceTokens(job);
    if (requested.length > maxInputImages) throw new Error(`MAX_INPUT_IMAGES: ${job.id} requests ${requested.length}, limit is ${maxInputImages}.`);
    const files = Array.from(selectedFiles || []);
    const resolved = requested.map((token) => {
      const exact = imageExtension.test(normalise(token)) ? files.filter((file) => normalise(file.fileName || file.name) === normalise(token)) : [];
      const matches = exact.length ? exact : files.filter((file) => basename(file.fileName || file.name) === basename(token));
      if (!matches.length) throw new Error(`MISSING_REFERENCE: ${job.id} requires '${token}'.`);
      if (matches.length > 1) throw new Error(`AMBIGUOUS_REFERENCE: ${job.id} requires '${token}'.`);
      return matches[0];
    });
    if (new Set(resolved.map((file) => normalise(file.fileName || file.name))).size !== resolved.length) throw new Error(`DUPLICATE_REFERENCE: ${job.id} requests the same file more than once.`);
    return resolved;
  }
  function resultWorkbookName(name) { return `${String(name || "workbook.xlsx").replace(/\.xlsx$/i, "")}-result.xlsx`; }
  function delaySeconds(settings, random = Math.random) { return settings.delay_min_sec + Math.floor(random() * (settings.delay_max_sec - settings.delay_min_sec + 1)); }
  function prepare(workbook, selectedFiles) {
    const settings = config(workbook.config);
    const queue = workbook.jobs.map((job, index) => {
      const references = resolveReferences(job, selectedFiles, settings.max_input_images);
      const existingDone = normalise(job.status) === "done";
      return { job, number: index + 1, references, status: existingDone && !settings.rerun_done ? "DONE" : "PENDING", skipped: existingDone && !settings.rerun_done };
    });
    return { settings, queue };
  }
  const api = { DEFAULTS, basename, referenceTokens, config, resolveReferences, resultWorkbookName, delaySeconds, prepare };
  (typeof window !== "undefined" ? window : globalThis).DacRunnerCore = api;
})();

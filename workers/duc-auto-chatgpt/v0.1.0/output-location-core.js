(() => {
  "use strict";

  const IMAGE_EXTENSIONS = new Set(["avif", "gif", "jpg", "jpeg", "png", "webp"]);

  function safeRelativeFolder(value, fallback = "Duc Auto ChatGPT") {
    const folder = String(value || fallback).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
    if (!folder || folder.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Image Output Folder must be a safe relative Downloads folder.");
    return folder.replace(/[^A-Za-z0-9._ -/]/g, "_").slice(0, 160);
  }

  function safeFileLeaf(value, fallback) {
    const name = String(value || fallback).trim().replace(/[\\/]/g, "_");
    if (!name || name === "." || name === ".." || /\.\./.test(name)) throw new Error("Result XLSX Filename must be a safe filename.");
    return name;
  }

  function safeFilename(value, fallback) {
    const name = safeFileLeaf(value, fallback);
    return name.toLowerCase().endsWith(".xlsx") ? name : `${name}.xlsx`;
  }

  function baseResultName(workbookName) {
    return `${workbookBase(workbookName)}__results.xlsx`;
  }

  function workbookBase(workbookName) {
    return safeFileLeaf(String(workbookName || "workbook.xlsx").replace(/\.xlsx$/i, ""), "workbook").replace(/\.[^.]+$/, "") || "workbook";
  }

  function baseAuditName(workbookName) { return `${workbookBase(workbookName)}__audit.jsonl`; }

  // This intentionally accepts only leaf-name tokens.  Paths, unknown tokens,
  // and a missing job identifier are validation errors rather than values that
  // are silently rewritten into a surprising output path.
  function validateImagePattern(value) {
    const pattern = String(value ?? "{job_id}").trim();
    if (!pattern) throw new Error("Image filename pattern is required.");
    if (/[\\/]|\.\./.test(pattern)) throw new Error("Image filename pattern must be a safe filename leaf.");
    if (/[<>:"|?*\u0000-\u001f]/.test(pattern)) throw new Error("Image filename pattern contains unsafe filename characters.");
    const tokens = pattern.match(/\{[^}]+\}/g) || [];
    for (const token of tokens) if (!/^\{(?:job_id|attempt|index)\}$/.test(token)) throw new Error(`Unsupported image filename token '${token}'.`);
    if (pattern.replace(/\{(?:job_id|attempt|index)\}/g, "").includes("{") || pattern.replace(/\{(?:job_id|attempt|index)\}/g, "").includes("}")) throw new Error("Image filename pattern has an unmatched token delimiter.");
    return pattern;
  }

  function renderImageFilename(pattern, values = {}, extension = "png") {
    const safePattern = validateImagePattern(pattern);
    const replacements = {
      job_id: safeJobId(values.job_id),
      attempt: String(Math.max(1, Number(values.attempt) || 1)).padStart(2, "0"),
      index: String(Math.max(1, Number(values.index) || 1)).padStart(3, "0")
    };
    const stem = safePattern.replace(/\{(job_id|attempt|index)\}/g, (_match, token) => replacements[token]);
    return `${safeFileLeaf(stem, "image")}.${actualExtension(null, extension)}`;
  }

  function collisionPolicy(value) {
    const policy = String(value || "uniquify").toLowerCase();
    if (!["overwrite", "uniquify", "fail"].includes(policy)) throw new Error("Collision policy must be overwrite, uniquify, or fail.");
    return policy;
  }

  function artifactNames(workbookName, settings = {}) {
    return {
      resultFilename: safeFilename(settings.resultFilename || baseResultName(workbookName), baseResultName(workbookName)),
      auditFilename: safeFileLeaf(settings.auditFilename || baseAuditName(workbookName), baseAuditName(workbookName)),
      imagePattern: validateImagePattern(settings.imagePattern || "{job_id}")
    };
  }

  function downloadsLocation(folder) {
    const relativeFolder = safeRelativeFolder(folder);
    return { kind: "downloads", folder: relativeFolder, label: `Downloads/${relativeFolder}` };
  }

  function directoryLocation(handle, label) {
    if (!handle || typeof handle !== "object") throw new Error("Choose an image folder before using a custom location.");
    const name = String(label || handle.name || "Authorized folder").trim() || "Authorized folder";
    // File System Access deliberately exposes a handle and leaf name, not an
    // absolute local path. Keep the current handle as the only identity we can
    // prove and never imply that a same-named folder is the owner's intended one.
    return { kind: "directory", handle, handleName: name, label: `Authorized folder handle: ${name} (absolute path unavailable)` };
  }

  function fromWorkbook(config, workbookName) {
    const mode = String(config?.output_destination_mode || "downloads").trim().toLowerCase();
    const downloads = downloadsLocation(config?.output_downloads_subfolder || config?.output_folder || "Duc Auto ChatGPT");
    const profileId = String(config?.output_profile_id || "").trim();
    const image = mode === "profile"
      ? { kind: "directory", handle: null, profileId, handleName: "", label: profileId ? `Output profile '${profileId}' (not bound)` : "Output profile not configured" }
      : downloads;
    const separate = /^(true|1|yes)$/i.test(String(config?.separate_result_destination || ""));
    const resultMode = String(config?.result_destination_mode || "downloads").trim().toLowerCase();
    const result = !separate ? { kind: "same_as_image" } : resultMode === "profile"
      ? { kind: "directory", handle: null, profileId: String(config?.result_output_profile_id || "").trim(), handleName: "", label: "Result output profile not bound" }
      : downloadsLocation(config?.result_downloads_subfolder || config?.output_downloads_subfolder || config?.output_folder || "Duc Auto ChatGPT");
    return {
      workbookName: String(workbookName || "workbook.xlsx"),
      image,
      result,
      resultFilename: config?.result_filename || baseResultName(workbookName),
      auditFilename: config?.audit_filename || baseAuditName(workbookName),
      imagePattern: config?.image_filename_pattern || "{job_id}",
      collisionPolicy: config?.collision_policy || "uniquify",
      saveImages: config?.save_images === undefined ? true : /^(true|1|yes)$/i.test(String(config.save_images)),
      saveResultXlsx: config?.save_result_xlsx === undefined ? true : /^(true|1|yes)$/i.test(String(config.save_result_xlsx)),
      saveAuditJsonl: config?.save_audit_jsonl === undefined ? true : /^(true|1|yes)$/i.test(String(config.save_audit_jsonl)),
      namingPattern: "{job_id} with the detected image extension; allowed tokens: {job_id}, {attempt}, {index}."
    };
  }

  function effective(settings) {
    if (!settings?.image) throw new Error("Choose an image output location.");
    const image = settings.image;
    const result = settings.result?.kind === "same_as_image" ? image : settings.result;
    if (!result) throw new Error("Choose a result XLSX location.");
    const names = artifactNames(settings.workbookName, settings);
    return { image, result, ...names, collisionPolicy: collisionPolicy(settings.collisionPolicy), saveImages: settings.saveImages !== false, saveResultXlsx: settings.saveResultXlsx !== false, saveAuditJsonl: settings.saveAuditJsonl !== false, namingPattern: settings.namingPattern };
  }

  function locationLabel(location) {
    return location?.label || "No location selected";
  }

  function fileLabel(location, filename) {
    return `${locationLabel(location)}/${filename}`;
  }

  function downloadArtifactRequest(location, filename, policy = "uniquify") {
    if (location?.kind !== "downloads") throw new Error("A Chrome download request requires a Downloads destination.");
    const requestedFilename = safeFileLeaf(filename, "output");
    const selectedPolicy = collisionPolicy(policy);
    return {
      filename: `${safeRelativeFolder(location.folder)}/${requestedFilename}`,
      requestedFilename,
      conflictAction: selectedPolicy === "fail" ? "uniquify" : selectedPolicy,
      collisionPolicy: selectedPolicy
    };
  }

  function downloadLeaf(filename) {
    return safeFileLeaf(String(filename || "").split(/[\\/]/).pop(), "output");
  }

  function isPolicyFilename(requestedFilename, actualFilename, policy) {
    const requested = safeFileLeaf(requestedFilename, "output");
    const actual = downloadLeaf(actualFilename);
    if (actual === requested) return true;
    if (collisionPolicy(policy) !== "uniquify") return false;
    const match = /^(.*?)(\.[^.]+)?$/.exec(requested);
    const stem = match?.[1] || requested;
    const extension = match?.[2] || "";
    const escapedStem = stem.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedExtension = extension.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`^${escapedStem}(?:__attempt-\\d+| \\(\\d+\\))${escapedExtension}$`).test(actual);
  }

  function verifyDownloadedFilename(request, completedFilename) {
    const actual = downloadLeaf(completedFilename);
    if (!isPolicyFilename(request?.requestedFilename, actual, request?.collisionPolicy)) {
      throw new Error(`PERSISTENCE_FILENAME_MISMATCH: requested '${request?.requestedFilename || "output"}' but Chrome reported '${actual}'.`);
    }
    return { filename: String(completedFilename), leaf: actual };
  }

  function runPlan(workbookName, settings) {
    const values = effective(settings);
    return {
      sourceWorkbook: String(workbookName || "No workbook selected"),
      imageDestination: locationLabel(values.image),
      resultDestination: fileLabel(values.result, values.resultFilename),
      namingPattern: values.namingPattern
    };
  }

  async function permission(location) {
    if (location?.kind === "downloads") return { ok: true, location, detail: "Chrome Downloads permission is available." };
    if (location?.kind !== "directory" || !location.handle || typeof location.handle.queryPermission !== "function") {
      return { ok: false, location, detail: "This folder is no longer authorized. Choose it again before Run." };
    }
    try {
      const state = await location.handle.queryPermission({ mode: "readwrite" });
      return state === "granted"
        ? { ok: true, location, detail: "Write permission granted." }
        : { ok: false, location, detail: `Write permission is ${state}. Choose the folder again before Run.` };
    } catch (error) {
      return { ok: false, location, detail: `Could not verify folder permission: ${error?.message || String(error)}` };
    }
  }

  async function preflight(settings) {
    const values = effective(settings);
    const locations = values.image === values.result ? [values.image] : [values.image, values.result];
    const checks = await Promise.all(locations.map(permission));
    const failed = checks.find((check) => !check.ok);
    return failed ? { ok: false, checks, error: failed.detail, effective: values } : { ok: true, checks, effective: values };
  }

  function actualExtension(blob, fallback = "png") {
    const fromType = /^image\/(avif|gif|jpe?g|png|webp)$/i.exec(blob?.type || "")?.[1];
    const extension = String(fromType || fallback).toLowerCase().replace("jpeg", "jpg");
    return IMAGE_EXTENSIONS.has(extension) ? extension : "png";
  }

  function safeJobId(value) {
    return String(value || "image").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "image";
  }

  function imageCandidates(jobId, extension, maximum = 1000) {
    return fileCandidates(`${safeJobId(jobId)}.${actualExtension(null, extension)}`, maximum);
  }

  function imageCandidatesFor(settings, values, extension, maximum = 1000) {
    return fileCandidates(renderImageFilename(settings?.imagePattern || "{job_id}", values, extension), maximum);
  }

  function candidatesForPolicy(filename, policy, maximum = 1000) {
    const checked = collisionPolicy(policy);
    return checked === "uniquify" ? fileCandidates(filename, maximum) : [safeFileLeaf(filename, "output")];
  }

  function fileCandidates(filename, maximum = 1000) {
    const safe = safeFileLeaf(filename, "result.xlsx");
    const match = /^(.*?)(\.[^.]+)$/.exec(safe);
    const base = match ? match[1] : safe;
    const extension = match ? match[2] : "";
    return Array.from({ length: maximum }, (_unused, index) => index === 0 ? safe : `${base}__attempt-${String(index).padStart(2, "0")}${extension}`);
  }

  async function findAvailableFilename(directoryHandle, candidates) {
    if (!directoryHandle || typeof directoryHandle.getFileHandle !== "function") throw new Error("Selected output folder is unavailable. Choose it again before Run.");
    for (const filename of candidates) {
      try {
        await directoryHandle.getFileHandle(filename, { create: false });
      } catch (error) {
        if (error?.name && error.name !== "NotFoundError") throw error;
        return filename;
      }
    }
    throw new Error("Could not find a non-overwriting output filename.");
  }

  async function writeNewFile(directoryHandle, filename, blob) {
    try {
      await directoryHandle.getFileHandle(filename, { create: false });
      throw new Error(`Refusing to overwrite existing output file '${filename}'.`);
    } catch (error) {
      if (error?.name && error.name !== "NotFoundError") throw error;
    }
    const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(blob);
    await writable.close();
    await verifyPersistedFile(directoryHandle, filename);
    return filename;
  }

  // FileSystemWritableFileStream.close() resolves when Chrome has accepted the
  // write, not when this runner has independently proven the selected directory
  // now exposes a readable non-empty file. Re-open the exact leaf through the
  // same user-authorized DirectoryHandle before any caller reports "written".
  async function verifyPersistedFile(directoryHandle, filename) {
    const actual = safeFileLeaf(filename, "output");
    try {
      const fileHandle = await directoryHandle.getFileHandle(actual, { create: false });
      const file = await fileHandle.getFile();
      if (!file) throw new Error("the file could not be read");
      if (Number(file.size) <= 0) throw new Error("the file is zero bytes");
      return { filename: actual, size: Number(file.size) };
    } catch (error) {
      const detail = error?.message || String(error);
      throw new Error(`PERSISTENCE_VERIFICATION_FAILED: '${actual}' was not readable and non-empty after close (${detail}).`);
    }
  }

  async function writeUniqueFile(directoryHandle, candidates, blob) {
    const filename = await findAvailableFilename(directoryHandle, candidates);
    return writeNewFile(directoryHandle, filename, blob);
  }

  async function writeFileWithPolicy(directoryHandle, filename, blob, policy = "uniquify") {
    const selected = collisionPolicy(policy);
    if (selected === "uniquify") {
      const actual = await writeUniqueFile(directoryHandle, fileCandidates(filename), blob);
      const persisted = await verifyPersistedFile(directoryHandle, actual);
      return { filename: actual, outcome: actual === filename ? "written" : "uniquified", size: persisted.size };
    }
    if (selected === "fail") {
      const actual = safeFileLeaf(filename, "output");
      await writeNewFile(directoryHandle, actual, blob);
      const persisted = await verifyPersistedFile(directoryHandle, actual);
      return { filename: actual, outcome: "written", size: persisted.size };
    }
    const actual = safeFileLeaf(filename, "output");
    const fileHandle = await directoryHandle.getFileHandle(actual, { create: true });
    const writable = await fileHandle.createWritable({ keepExistingData: false });
    await writable.write(blob); await writable.close();
    const persisted = await verifyPersistedFile(directoryHandle, actual);
    return { filename: actual, outcome: "overwritten", size: persisted.size };
  }

  const api = { safeRelativeFolder, safeFileLeaf, safeFilename, baseResultName, baseAuditName, workbookBase, validateImagePattern, renderImageFilename, collisionPolicy, artifactNames, downloadsLocation, directoryLocation, fromWorkbook, effective, locationLabel, fileLabel, downloadArtifactRequest, verifyDownloadedFilename, isPolicyFilename, runPlan, permission, preflight, actualExtension, imageCandidates, imageCandidatesFor, candidatesForPolicy, fileCandidates, findAvailableFilename, verifyPersistedFile, writeNewFile, writeUniqueFile, writeFileWithPolicy };
  (typeof window !== "undefined" ? window : globalThis).DacOutputLocation = api;
})();

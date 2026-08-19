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
    return `${String(workbookName || "workbook.xlsx").replace(/\.xlsx$/i, "")}-result.xlsx`;
  }

  function downloadsLocation(folder) {
    const relativeFolder = safeRelativeFolder(folder);
    return { kind: "downloads", folder: relativeFolder, label: `Downloads/${relativeFolder}` };
  }

  function directoryLocation(handle, label) {
    if (!handle || typeof handle !== "object") throw new Error("Choose an image folder before using a custom location.");
    const name = String(label || handle.name || "Authorized folder").trim() || "Authorized folder";
    return { kind: "directory", handle, label: `Authorized folder: ${name}` };
  }

  function fromWorkbook(config, workbookName) {
    const downloads = downloadsLocation(config?.output_folder || "Duc Auto ChatGPT");
    return {
      image: downloads,
      result: { kind: "same_as_image" },
      resultFilename: baseResultName(workbookName),
      namingPattern: "<job-id>.<actual-extension>; existing files use __attempt-01, __attempt-02, ..."
    };
  }

  function effective(settings) {
    if (!settings?.image) throw new Error("Choose an image output location.");
    const image = settings.image;
    const result = settings.result?.kind === "same_as_image" ? image : settings.result;
    if (!result) throw new Error("Choose a result XLSX location.");
    return { image, result, resultFilename: safeFilename(settings.resultFilename, "workbook-result.xlsx"), namingPattern: settings.namingPattern };
  }

  function locationLabel(location) {
    return location?.label || "No location selected";
  }

  function fileLabel(location, filename) {
    return `${locationLabel(location)}/${filename}`;
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

  function fileCandidates(filename, maximum = 1000) {
    const safe = safeFileLeaf(filename, "result.xlsx");
    const match = /^(.*?)(\.[^.]+)$/.exec(safe);
    const base = match ? match[1] : safe;
    const extension = match ? match[2] : "";
    return Array.from({ length: maximum }, (_unused, index) => index === 0 ? safe : `${base}__attempt-${String(index).padStart(2, "0")}${extension}`);
  }

  async function writeUniqueFile(directoryHandle, candidates, blob) {
    if (!directoryHandle || typeof directoryHandle.getFileHandle !== "function") throw new Error("Selected output folder is unavailable. Choose it again before Run.");
    for (const filename of candidates) {
      try {
        await directoryHandle.getFileHandle(filename, { create: false });
      } catch (error) {
        if (error?.name && error.name !== "NotFoundError") throw error;
        const fileHandle = await directoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable({ keepExistingData: false });
        await writable.write(blob);
        await writable.close();
        return filename;
      }
    }
    throw new Error("Could not find a non-overwriting output filename.");
  }

  const api = { safeRelativeFolder, safeFilename, baseResultName, downloadsLocation, directoryLocation, fromWorkbook, effective, locationLabel, fileLabel, runPlan, permission, preflight, actualExtension, imageCandidates, fileCandidates, writeUniqueFile };
  (typeof window !== "undefined" ? window : globalThis).DacOutputLocation = api;
})();

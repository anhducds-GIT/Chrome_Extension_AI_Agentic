importScripts("bridge-core.js", "bridge-pairing-core.js", "bridge-router-core.js", "bridge-workspace-core.js", "bridge-transport-loopback.js");

// Listener registration happens synchronously inside create(); storage lookup
// and network connection are deliberately deferred behind those listeners.
const bridgeLoopbackTransport = globalThis.DacBridgeLoopbackTransport.create();

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("Unable to set side panel behavior", error);
  }
});

chrome.runtime.onStartup.addListener(async () => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (error) {
    console.warn("Unable to set side panel behavior", error);
  }
});

const DOWNLOAD_COMPLETE_TIMEOUT_MS = 120000;
const EXPECTED_DOWNLOAD_NAME_TTL_MS = 120000;

// Chrome on this machine ignores the `filename` suggestion for blob: URL
// downloads (URL-derived GUID names, flat in the download directory — hit
// live 2026-08-25 on BOTH the GPT and Gemini extensions). A filename
// determiner has final say, so this extension names its OWN downloads here
// and defers on everything else. Registered synchronously (MV3 rule).
const expectedDownloadNames = new Map();

function rememberExpectedDownloadName(url, filename, conflictAction) {
  const now = Date.now();
  for (const [key, value] of expectedDownloadNames) if (value.expires < now) expectedDownloadNames.delete(key);
  if (typeof url !== "string" || !url || typeof filename !== "string" || !filename) return false;
  const action = ["uniquify", "overwrite", "prompt"].includes(conflictAction) ? conflictAction : "uniquify";
  expectedDownloadNames.set(url, { filename, conflictAction: action, expires: now + EXPECTED_DOWNLOAD_NAME_TTL_MS });
  return true;
}

// Bằng chứng sở hữu là PHIẾU GIỮ TÊN, không phải `item.byExtensionId`.
//
// Bản trước hỏi `byExtensionId` TRƯỚC rồi mới tra phiếu, và trả về sớm bằng
// `suggest()` trần khi trường đó không khớp. `suggest()` trần nghĩa là "tôi
// không có ý kiến", nên Chrome dùng tên mặc định — mà tên mặc định của một blob
// URL LÀ cái GUID. Kết quả: một trường metadata trống là đủ để mất tên, im lặng.
// Đo được (B-36): 36 file tên-GUID trong Downloads, 09/07 → 04/09, gồm cả file
// 28/08 tức sau khi B-13 được ghi "đã đóng".
//
// Phiếu giữ tên khớp URL là bằng chứng sở hữu MẠNH HƠN: chỉ extension này tạo
// nổi một blob URL trên origin của chính nó, và phiếu chỉ được trồng ngay trước
// khi `downloads.download` được gọi, trong cùng một lượt. Nên: tra phiếu trước,
// nhường chỉ khi KHÔNG có phiếu dùng được.
function takeExpectedDownloadName(item) {
  const now = Date.now();
  const direct = expectedDownloadNames.get(item?.url);
  if (direct) {
    expectedDownloadNames.delete(item.url);
    return direct.expires < now ? null : direct;
  }
  // Chrome có thể báo lại một chuỗi URL khác chuỗi ta dùng làm khoá. Chỉ nhận
  // khi đúng ba điều cùng lúc: blob trên origin của CHÍNH extension này, còn
  // đúng MỘT phiếu còn hạn, và phiếu đó cũng trỏ vào origin ấy. Nhiều phiếu
  // cùng lúc thì không đoán — đặt sai tên tệ hơn để Chrome đặt GUID.
  const ourBlobPrefix = `blob:chrome-extension://${chrome.runtime.id}/`;
  if (typeof item?.url !== "string" || !item.url.startsWith(ourBlobPrefix)) return null;
  const live = [...expectedDownloadNames].filter(([url, value]) => value.expires >= now && url.startsWith(ourBlobPrefix));
  if (live.length !== 1) return null;
  expectedDownloadNames.delete(live[0][0]);
  return live[0][1];
}

chrome.downloads.onDeterminingFilename?.addListener((item, suggest) => {
  const expected = takeExpectedDownloadName(item);
  if (!expected) { suggest(); return; }
  suggest({ filename: expected.filename, conflictAction: expected.conflictAction });
});

// Private messages used only by this extension's side panel.
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "DAC_EXPECT_DOWNLOAD_NAME") {
    sendResponse({ ok: rememberExpectedDownloadName(message.url, message.filename, message.conflictAction) });
    return false;
  }
  if (message?.type === "DAC_DOWNLOAD_ARTIFACT") {
    downloadArtifact(message)
      .then(sendResponse)
      .catch((error) => sendResponse(failure("DOWNLOAD_FAILED", error?.message || String(error))));
    return true;
  }
  if (message?.type !== "DAC_DOWNLOAD_IMAGE") return false;
  downloadGeneratedImage(message)
    .then(sendResponse)
    .catch((error) => sendResponse(failure("DOWNLOAD_FAILED", error?.message || String(error))));
  return true;
});

// Audit JSONL and Result XLSX used to reserve the blob filename in one
// message and start chrome.downloads in a later side-panel turn. MV3 may
// suspend this worker between those calls, erasing the in-memory reservation
// and leaving Chrome's GUID as the physical name. Keep the whole operation in
// one background request so onDeterminingFilename consumes live state.
async function downloadArtifact(message) {
  const url = typeof message.url === "string" ? message.url : "";
  if (!/^blob:/i.test(url)) return failure("INVALID_ARTIFACT_URL", "Artifact download requires an extension-owned blob URL.");
  const requestedFilename = safeArtifactFilename(message.filename);
  if (!requestedFilename) return failure("INVALID_ARTIFACT_FILENAME", "Artifact filename must be a safe Downloads-relative path.");
  const conflictAction = ["uniquify", "overwrite", "prompt"].includes(message.conflictAction) ? message.conflictAction : "uniquify";
  rememberExpectedDownloadName(url, requestedFilename, conflictAction);
  const downloadId = await chrome.downloads.download({ url, filename: requestedFilename, conflictAction, saveAs: false });
  const item = await waitForCompletedDownload(downloadId);
  const verified = verifyCompletedDownload(item, Number(message.expectedBytes));
  if (!verified.ok) return verified;
  return { ok: true, download_id: downloadId, filename: item.filename, requested_filename: requestedFilename, persisted_bytes: verified.persisted_bytes };
}

function safeArtifactFilename(value) {
  const requested = typeof value === "string" ? value.trim().replace(/\\/g, "/") : "";
  if (!requested || requested.length > 240 || requested.startsWith("/") || /^[A-Za-z]:/.test(requested)) return "";
  if (requested.split("/").some((part) => !part || part === "." || part === ".." || /[\x00-\x1f\x7f<>:"|?*]/.test(part))) return "";
  return requested;
}

function verifyCompletedDownload(item, expectedBytes = 0) {
  const reportedBytes = [item?.fileSize, item?.bytesReceived].map(Number).filter((value) => Number.isFinite(value));
  const persistedBytes = Math.max(0, ...reportedBytes);
  if (item?.exists === false) return failure("PERSISTENCE_VERIFICATION_FAILED", `PERSISTENCE_VERIFICATION_FAILED: Chrome reported '${item.filename}' as complete but the file no longer exists.`);
  if (reportedBytes.length && persistedBytes <= 0) return failure("PERSISTENCE_VERIFICATION_FAILED", `PERSISTENCE_VERIFICATION_FAILED: Chrome reported '${item.filename}' as complete with zero bytes received.`);
  if (expectedBytes > 0 && reportedBytes.length && persistedBytes !== expectedBytes) return failure("PERSISTENCE_VERIFICATION_FAILED", `PERSISTENCE_VERIFICATION_FAILED: Chrome reported ${persistedBytes} bytes for '${item.filename}', expected ${expectedBytes}.`);
  return { ok: true, persisted_bytes: persistedBytes };
}

// Two DIFFERENT questions about a finished download, kept apart on purpose.
//
// item.filename is Chrome's ABSOLUTE path; requestedFilename is
// Downloads-RELATIVE ("folder/leaf"). Comparing those two directly can never
// be true, which is how every Downloads image came to be recorded as
// "uniquified" -- telling the operator a file of that name already existed
// and theirs had been renamed around it. Caught live on Pilot-11, where
// Q001.png sat on disk under exactly the requested name (BACKLOG B-13).

// 1. Was the file RENAMED to dodge a collision? chrome.downloads'
//    conflictAction only ever alters the LEAF, never the folder, so the leaf
//    is the whole signal. Compared exactly: any difference at all, including
//    case, means something other than a clean write happened, and reporting
//    the conservative answer is better than claiming a clean write we did not
//    observe.
function downloadLeaf(value) {
  return String(value || "").split(/[\\/]/).pop() || "";
}

// 2. Did it land under the path we asked for? This is a TEXTUAL TAIL CHECK,
//    not a resolved-path proof: chrome.downloads gives no Downloads-root
//    oracle, so it can only say "the absolute path ends with the relative
//    path we asked for". Case-folded because this extension runs on Windows,
//    where the filesystem is case-insensitive. Reported as its own field
//    rather than folded into write_outcome, so neither fact has to pretend to
//    be the other.
function pathTailMatches(absolutePath, requestedRelative) {
  const normalise = (value) => String(value || "").replace(/\\/g, "/").toLowerCase();
  const actual = normalise(absolutePath);
  const requested = normalise(requestedRelative).replace(/^\/+/, "");
  if (!actual || !requested) return false;
  return actual === requested || actual.endsWith(`/${requested}`);
}

async function downloadGeneratedImage(message) {
  const url = typeof message.url === "string" ? message.url : "";
  if (!/^https:\/\//i.test(url) && !/^data:image\//i.test(url)) {
    return failure("INVALID_IMAGE_URL", "Generated image URL was not usable.");
  }
  const safeId = String(message.jobId || "image").replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100) || "image";
  const extension = imageExtension(url);
  const folder = safeDownloadFolder(message.outputFolder);
  const requestedFilename = safeRequestedFilename(message.filename, folder, `${safeId}.${extension}`);
  const collisionPolicy = ["overwrite", "uniquify", "fail"].includes(message.collisionPolicy) ? message.collisionPolicy : "uniquify";
  if (collisionPolicy === "fail") {
    const existing = await chrome.downloads.search({ filename: requestedFilename });
    const suffix = requestedFilename.replace(/\//g, "\\").toLowerCase();
    if (existing.some((item) => String(item.filename || "").toLowerCase().endsWith(suffix) && item.state === "complete")) return failure("COLLISION", `Output already exists: ${requestedFilename}`);
  }
  const conflictAction = collisionPolicy === "fail" ? "uniquify" : collisionPolicy;
  rememberExpectedDownloadName(url, requestedFilename, conflictAction);
  const downloadId = await chrome.downloads.download({ url, filename: requestedFilename, conflictAction, saveAs: false });
  const item = await waitForCompletedDownload(downloadId);
  // A "complete" DownloadItem is Chrome's claim, not proof the bytes are on
  // disk. The directory writer reopens and measures its file; give the
  // Downloads path the closest equivalent before reporting a saved image.
  // An absent byte count means Chrome did not report one; only a byte count
  // that is present and zero is proof of an empty file.  Reporting an unknown
  // count as a failure would invent a failure mode rather than remove one.
  const verified = verifyCompletedDownload(item);
  if (!verified.ok) return verified;
  const persistedBytes = verified.persisted_bytes;
  // Under the default uniquify policy this distinction is the whole answer to
  // "did anything of mine get shadowed?", so it has to be true.
  //
  // "overwritten" is deliberately NOT reachable here. A completed download
  // under conflictAction:"overwrite" proves Chrome was ALLOWED to replace a
  // file -- not that one existed to replace. Reporting a first-ever write as
  // having destroyed prior operator evidence is the same lie, pointed the
  // other way. The directory writer can probe before writing and does; this
  // path cannot, so it states only what it observed. collision_policy is
  // reported alongside, so what was ASKED FOR stays visible without the
  // ledger pretending to know what HAPPENED.
  const writeOutcome = downloadLeaf(item.filename) === downloadLeaf(requestedFilename) ? "written" : "uniquified";
  return { ok: true, download_id: downloadId, filename: item.filename, requested_filename: requestedFilename, collision_policy: collisionPolicy, persisted_bytes: persistedBytes, write_outcome: writeOutcome, landed_as_requested: pathTailMatches(item.filename, requestedFilename) };
}

function safeRequestedFilename(value, folder, fallback) {
  const requested = typeof value === "string" ? value.trim().replace(/\\/g, "/") : "";
  if (!requested || requested.startsWith("/") || requested.split("/").some((part) => !part || part === "." || part === "..")) return `${folder}/${fallback}`;
  return requested;
}

async function waitForCompletedDownload(downloadId, timeoutMs = DOWNLOAD_COMPLETE_TIMEOUT_MS) {
  const lookup = async () => {
    const items = await chrome.downloads.search({ id: downloadId });
    return items?.[0] || null;
  };
  const current = await lookup();
  if (current?.state === "complete" && current.filename) return current;
  if (current?.state === "interrupted") throw new Error(`Generated image download failed: ${current.error || "interrupted"}.`);
  if (!chrome.downloads.onChanged?.addListener) throw new Error("Could not verify the final generated-image filename.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      chrome.downloads.onChanged.removeListener?.(listener);
      callback(value);
    };
    const listener = async (delta) => {
      if (delta?.id !== downloadId || (!delta.state && !delta.filename)) return;
      try {
        const item = await lookup();
        if (item?.state === "complete" && item.filename) finish(resolve, item);
        else if (item?.state === "interrupted") finish(reject, new Error(`Generated image download failed: ${item.error || "interrupted"}.`));
      } catch (error) { finish(reject, error); }
    };
    const timer = setTimeout(() => finish(reject, new Error("Timed out waiting for the final generated-image filename.")), timeoutMs);
    chrome.downloads.onChanged.addListener(listener);
    lookup().then((item) => {
      if (item?.state === "complete" && item.filename) finish(resolve, item);
      else if (item?.state === "interrupted") finish(reject, new Error(`Generated image download failed: ${item.error || "interrupted"}.`));
    }).catch((error) => finish(reject, error));
  });
}

function imageExtension(url) {
  const dataMime = /^data:image\/(avif|gif|jpe?g|png|webp)/i.exec(url)?.[1];
  if (dataMime) return dataMime.toLowerCase().replace("jpeg", "jpg");
  try {
    const parsed = new URL(url);
    const fromPath = /\.(avif|gif|jpe?g|png|webp)$/i.exec(parsed.pathname)?.[1];
    const fromQuery = parsed.searchParams.get("format") || parsed.searchParams.get("fm");
    const candidate = fromPath || (/^(avif|gif|jpe?g|png|webp)$/i.test(fromQuery || "") ? fromQuery : null);
    if (candidate) return candidate.toLowerCase().replace("jpeg", "jpg");
  } catch (_) { /* URL was already validated; retain the safe fallback. */ }
  return "png";
}

function safeDownloadFolder(value) {
  const folder = String(value || "Duc Auto ChatGPT").replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  if (!folder || folder.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("Image output folder must be a safe relative Downloads folder.");
  const safeFolder = folder.replace(/[^A-Za-z0-9._ -/]/g, "_").slice(0, 160);
  if (!safeFolder) throw new Error("Image output folder must not be empty.");
  return safeFolder;
}

function failure(code, error, extra) {
  return { ok: false, code, error, ...(extra || {}) };
}

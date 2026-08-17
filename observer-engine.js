const PROTOCOL_VERSION = "1.3";
const EXTENSION_PREFIX = "chrome-extension://";
const MAX_ELEMENTS = 100;

/**
 * A deliberately read-only wrapper around chrome.debugger.
 * It never sends input, dispatches events, changes DOM/storage, or messages pages.
 */
export class ObserverEngine {
  async scanTargets() {
    const targets = await chrome.debugger.getTargets();
    return targets.map((target) => this.describeTarget(target));
  }

  describeTarget(target) {
    const classification = classifyTarget(target);
    return {
      targetId: target.id ?? target.targetId,
      type: target.type ?? "unknown",
      title: target.title ?? "",
      url: target.url ?? "",
      attached: Boolean(target.attached),
      tabId: target.tabId ?? null,
      extensionRelated: isExtensionUrl(target.url),
      classification
    };
  }

  async observe(target) {
    const report = createReport(this.describeTarget(target));
    const debuggee = { targetId: target.id ?? target.targetId };
    let attachedHere = false;

    if (target.attached) {
      report.limitations.push("Target is already attached to a debugger; Observer V0 will not take over that session.");
      report.access.attach = { attempted: false, permitted: false, detail: "already attached" };
      return finalize(report);
    }

    try {
      report.access.attach.attempted = true;
      await chrome.debugger.attach(debuggee, PROTOCOL_VERSION);
      attachedHere = true;
      report.access.attach = { attempted: true, permitted: true, detail: "ephemeral attach succeeded" };
      report.access.method = "chrome.debugger (ephemeral read-only attach)";

      await this.inspectRuntime(debuggee, report);
      await this.inspectDom(debuggee, report);
    } catch (error) {
      const detail = normaliseError(error);
      report.access.attach.permitted = false;
      report.access.attach.detail = detail;
      report.limitations.push(`Chrome denied or interrupted observation: ${detail}`);
    } finally {
      if (attachedHere) {
        try {
          await chrome.debugger.detach(debuggee);
          report.access.detached = true;
        } catch (error) {
          report.access.detached = false;
          report.limitations.push(`Could not detach cleanly: ${normaliseError(error)}`);
        }
      }
    }

    return finalize(report);
  }

  async inspectRuntime(debuggee, report) {
    try {
      await chrome.debugger.sendCommand(debuggee, "Runtime.enable");
      const result = await chrome.debugger.sendCommand(debuggee, "Runtime.evaluate", {
        expression: readOnlyPageSnapshotExpression(),
        returnByValue: true,
        awaitPromise: false,
        userGesture: false
      });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text || "Runtime evaluation failed");

      const value = result.result?.value;
      if (!value || typeof value !== "object") throw new Error("Target returned no serialisable runtime snapshot");
      report.runtime.accessible = true;
      report.runtime.metadata = value.metadata ?? null;
      report.runtime.hasDocument = Boolean(value.hasDocument);
      report.elements = value.elements ?? emptyElements();
      if (report.elements.truncated) report.limitations.push(`Element inventory is limited to ${MAX_ELEMENTS} entries.`);
    } catch (error) {
      report.runtime.error = normaliseError(error);
      report.limitations.push(`Runtime inspection unavailable: ${report.runtime.error}`);
    }
  }

  async inspectDom(debuggee, report) {
    if (!report.runtime.hasDocument) {
      report.limitations.push("Target does not expose a document to the runtime; DOM inspection was not attempted.");
      return;
    }
    try {
      await chrome.debugger.sendCommand(debuggee, "DOM.enable");
      const document = await chrome.debugger.sendCommand(debuggee, "DOM.getDocument", { depth: 0, pierce: false });
      report.dom.accessible = Boolean(document.root?.nodeId);
      report.dom.root = document.root
        ? { nodeId: document.root.nodeId, nodeName: document.root.nodeName, childNodeCount: document.root.childNodeCount }
        : null;
    } catch (error) {
      report.dom.error = normaliseError(error);
      report.limitations.push(`DOM inspection unavailable: ${report.dom.error}`);
    }
  }
}

function classifyTarget(target) {
  const url = target.url ?? "";
  if (!isExtensionUrl(url)) {
    return target.type === "page"
      ? { kind: "normal_webpage", confidence: "confirmed", evidence: "type=page and non-extension URL" }
      : { kind: "other", confidence: "confirmed", evidence: `type=${target.type ?? "unknown"} and non-extension URL` };
  }
  if (target.type === "service_worker") {
    return { kind: "service_worker", confidence: "confirmed", evidence: "type=service_worker and extension URL" };
  }
  if (target.type === "page") {
    return {
      kind: "extension_page",
      confidence: "confirmed",
      evidence: "type=page and extension URL; Chrome target metadata does not reliably distinguish popup from side panel"
    };
  }
  return { kind: "unknown", confidence: "uncertain", evidence: `extension URL with target type=${target.type ?? "unknown"}` };
}

function createReport(target) {
  return {
    schemaVersion: "extension-observer-v0/1",
    generatedAt: new Date().toISOString(),
    safety: "Read-only: no input, DOM mutation, extension messaging, storage changes, screenshots, OCR, or security bypass.",
    target,
    access: {
      method: "target metadata only",
      attach: { attempted: false, permitted: null, detail: null },
      detached: null
    },
    runtime: { accessible: false, hasDocument: null, metadata: null, error: null },
    dom: { accessible: false, root: null, error: null },
    elements: emptyElements(),
    limitations: [],
    observabilityLevel: "METADATA_ONLY"
  };
}

function finalize(report) {
  if (report.runtime.accessible && report.dom.accessible) report.observabilityLevel = "FULL";
  else if (report.runtime.accessible || report.dom.accessible) report.observabilityLevel = "PARTIAL";
  else if (report.access.attach.attempted && report.access.attach.permitted === false) report.observabilityLevel = "BLOCKED";
  return report;
}

function emptyElements() {
  return { count: 0, returned: 0, truncated: false, items: [] };
}

function isExtensionUrl(url) {
  return typeof url === "string" && url.startsWith(EXTENSION_PREFIX);
}

function normaliseError(error) {
  return error?.message || String(error);
}

function readOnlyPageSnapshotExpression() {
  return `(() => {
    const hasDocument = typeof document !== "undefined" && Boolean(document.documentElement);
    const metadata = {
      url: typeof location !== "undefined" ? location.href : null,
      title: hasDocument ? document.title : null,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null
    };
    if (!hasDocument) return { hasDocument, metadata, elements: { count: 0, returned: 0, truncated: false, items: [] } };
    const selector = "a,button,input,select,textarea,[role='button'],[role='link'],[contenteditable='true'],[tabindex]";
    const nodes = Array.from(document.querySelectorAll(selector));
    const items = nodes.slice(0, ${MAX_ELEMENTS}).map((node) => ({
      tag: node.tagName.toLowerCase(),
      type: node.getAttribute("type"),
      role: node.getAttribute("role"),
      name: node.getAttribute("aria-label") || node.getAttribute("name") || node.textContent.trim().slice(0, 120) || null,
      disabled: "disabled" in node ? Boolean(node.disabled) : false
    }));
    return { hasDocument, metadata, elements: { count: nodes.length, returned: items.length, truncated: nodes.length > ${MAX_ELEMENTS}, items } };
  })()`;
}

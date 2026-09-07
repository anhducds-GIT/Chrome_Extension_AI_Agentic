import { runProbe as runProbeCore, PROBE_NAMES } from "./scripts/observer-probes.mjs";
import { runAction as runActionCore, ACTION_NAMES } from "./scripts/scouter-actions-core.mjs";

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

  /* ---- Nối dây: bốn phép dò read-only (scripts/observer-probes.mjs) -------
   * ĐƯỜNG THÊM VÀO, không thay `observe()`. `observe()` giữ nguyên hành vi cũ.
   *
   * Lớp này CỐ Ý mỏng: nó chỉ bơm `chrome.debugger.sendCommand` và `chrome.debugger.getTargets`
   * vào lõi rồi trả kết quả. Nó KHÔNG tự gọi một method CDP nào, KHÔNG tự thêm tham số nào.
   *
   * Lý do phải mỏng: ba chốt của lõi (PROBE_NAMES · READ_ONLY_CDP_METHODS · chốt hình dạng
   * tham số) chỉ bảo vệ được những gì ĐI QUA lõi. Một lớp nối dây tự gọi thẳng `sendCommand`
   * sẽ đi vòng qua cả ba, mà mọi phép ghim CỦA LÕI vẫn xanh — nên phép ghim của lớp này quan
   * sát ở BIÊN `chrome`, không ở biên lõi. Xem mục "nối dây" trong
   * tests/observer-engine-smoke.mjs, và bốn con W1..W4 trong scripts/observer-mutation-check.mjs.
   */
  async runProbe(target, name, params = {}) {
    /* Tên lạ thì để LÕI từ chối, và từ chối TRƯỚC khi gắn debugger: gắn debugger vào một trang
     * là thao tác mạnh nhất extension này làm được, đừng làm nó cho một yêu cầu sai. Gọi lại
     * lõi với deps rỗng thay vì tự soạn câu từ chối — hai bản của một luật thì sớm muộn lệch. */
    if (!PROBE_NAMES.includes(name)) return await runProbeCore(name, {}, params);

    if (name === "targets.list") {
      return await runProbeCore(name, { listTargets: () => chrome.debugger.getTargets() }, params);
    }

    if (target?.attached) {
      return { ok: false, probe: name, code: "TARGET_ALREADY_ATTACHED", cdp: [],
        detail: "Target đã có debugger khác gắn vào; Observer không cướp phiên của người khác." };
    }

    const debuggee = { targetId: target?.id ?? target?.targetId };
    let attachedHere = false;
    try {
      await chrome.debugger.attach(debuggee, PROTOCOL_VERSION);
      attachedHere = true;
      const sendRaw = (method, cdpParams) => chrome.debugger.sendCommand(debuggee, method, cdpParams);
      return await runProbeCore(name, { targetId: debuggee.targetId, sendRaw }, params);
    } catch (error) {
      return { ok: false, probe: name, code: "ATTACH_FAILED", detail: normaliseError(error), cdp: [] };
    } finally {
      if (attachedHere) await detachQuietly(debuggee);
    }
  }

  /* ---- Nối dây: BA HÀNH ĐỘNG GHI (scripts/scouter-actions-core.mjs) -------
   * Song song với `runProbe`, và CỐ Ý mỏng y như nó: lớp này chỉ bơm
   * `chrome.debugger.sendCommand` vào lõi hành động rồi trả kết quả. Nó KHÔNG tự gọi một
   * method CDP nào, KHÔNG tự tính một toạ độ nào.
   *
   * Vì sao phải mỏng, ở đây còn quan trọng hơn ở `runProbe`: bốn chốt của lõi hành động
   * (ACTION_NAMES · WRITE_CDP_METHODS · cấm toạ độ từ ngoài · selector khớp đúng một) chỉ
   * bảo vệ được những gì ĐI QUA lõi. Một lớp nối dây tự gọi thẳng `Input.dispatchMouseEvent`
   * sẽ đi vòng qua cả bốn, mà mọi phép ghim CỦA LÕI vẫn xanh. Xem bốn con A1..A4 trong
   * scripts/scouter-mutation-check.mjs — chúng quan sát ở BIÊN `chrome`, không ở biên lõi.
   *
   * KHÁC `runProbe` một chỗ, cố ý: hành động KHÔNG có nhánh nào chạy mà không gắn debugger.
   * `targets.list` đọc được từ metadata nên nó có đường tắt; bấm và gõ thì không. */
  async runAction(target, name, params = {}) {
    /* Tên lạ thì để LÕI từ chối, và từ chối TRƯỚC khi gắn debugger: gắn debugger vào một trang
     * là thao tác mạnh nhất extension này làm được, đừng làm nó cho một yêu cầu sai. */
    if (!ACTION_NAMES.includes(name)) return await runActionCore(name, {}, params);

    if (target?.attached) {
      return { ok: false, action: name, code: "TARGET_ALREADY_ATTACHED", cdp: [],
        detail: "Target đã có debugger khác gắn vào; Scouter không cướp phiên của người khác." };
    }

    const debuggee = { targetId: target?.id ?? target?.targetId };
    let attachedHere = false;
    try {
      await chrome.debugger.attach(debuggee, PROTOCOL_VERSION);
      attachedHere = true;
      const sendRaw = (method, cdpParams) => chrome.debugger.sendCommand(debuggee, method, cdpParams);
      return await runActionCore(name, { sendRaw }, params);
    } catch (error) {
      return { ok: false, action: name, code: "ATTACH_FAILED", detail: normaliseError(error), cdp: [] };
    } finally {
      if (attachedHere) await detachQuietly(debuggee);
    }
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

async function detachQuietly(debuggee) {
  /* Tháo hụt không được nuốt kết quả đã lấy được — nên nuốt lỗi ở đây, cố ý. */
  try { await chrome.debugger.detach(debuggee); } catch { /* bỏ qua */ }
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

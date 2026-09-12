import assert from "node:assert/strict";

const calls = [];
let attachShouldFail = false;
/* Đường đọc muốn ba khớp (để kiểm phân trang); đường GHI đòi đúng một. Một biến, hai vế. */
let soKhopQuery = [11, 12, 13];

globalThis.chrome = {
  debugger: {
    getTargets: async () => [
      { id: "extension-page", type: "page", title: "Extension surface", url: "chrome-extension://abc/ui.html", attached: false },
      { id: "worker", type: "service_worker", title: "Extension worker", url: "chrome-extension://abc/worker.js", attached: false }
    ],
    attach: async () => {
      calls.push("attach");
      if (attachShouldFail) throw new Error("Not allowed to attach to this target");
    },
    detach: async () => calls.push("detach"),
    sendCommand: async (_debuggee, method, params = {}) => {
      calls.push(method);
      if (method === "Runtime.evaluate") {
        return {
          result: {
            value: {
              hasDocument: true,
              metadata: { url: "chrome-extension://abc/ui.html", title: "Extension surface", userAgent: "test" },
              elements: { count: 1, returned: 1, truncated: false, items: [{ tag: "button", type: null, role: null, name: "Safe", disabled: false }] }
            }
          }
        };
      }
      if (method === "DOM.getDocument") return { root: { nodeId: 1, nodeName: "#document", childNodeCount: 1 } };
      if (method === "Target.getTargetInfo") {
        return { targetInfo: { title: "Extension surface", url: "chrome-extension://abc/ui.html?tok=SECRET-DO-NOT-LEAK" } };
      }
      if (method === "DOM.querySelectorAll") return { nodeIds: soKhopQuery };
      if (method === "DOM.getBoxModel") return { model: { content: [10, 20, 110, 20, 110, 60, 10, 60] } };
      /* Chốt ⑸ (S-17) hỏi điểm sắp bấm là ai. Trang giả trả về CHÍNH phần tử đã khớp —
       * ca "có lớp phủ chắn" ghim ở `scouter-actions-smoke.mjs`, chỗ này chỉ cần đường vui. */
      if (method === "DOM.getNodeForLocation") return { nodeId: soKhopQuery[0], backendNodeId: 900 };
      if (method === "DOM.describeNode") {
        return { node: { nodeId: params.nodeId, nodeType: 1, nodeName: "BUTTON", localName: "button", childNodeCount: 0,
          attributes: ["id", `b${params.nodeId}`, "data-secret", "SECRET-DO-NOT-LEAK"] } };
      }
      return {};
    }
  }
};

const { ObserverEngine } = await import("../observer-engine.js");
const engine = new ObserverEngine();
const targets = await engine.scanTargets();

assert.equal(targets[0].classification.kind, "extension_page");
assert.equal(targets[1].classification.kind, "service_worker");

const full = await engine.observe(targets[0]);
assert.equal(full.observabilityLevel, "FULL");
assert.equal(full.runtime.accessible, true);
assert.equal(full.dom.accessible, true);
assert.equal(full.access.detached, true);
assert.deepEqual(calls, ["attach", "Runtime.enable", "Runtime.evaluate", "DOM.enable", "DOM.getDocument", "detach"]);

calls.length = 0;
attachShouldFail = true;
const blocked = await engine.observe(targets[1]);
assert.equal(blocked.observabilityLevel, "BLOCKED");
assert.equal(blocked.access.detached, null);
assert.deepEqual(calls, ["attach"]);


/* ---- Nối dây: lõi bốn phép dò đi qua chrome.debugger ---------------------
 *
 * Vì sao phần này quan sát ở BIÊN `chrome` chứ không ở biên lõi:
 * ba chốt read-only nằm TRONG scripts/observer-probes.mjs, nên chúng chỉ bảo vệ được
 * những gì đi QUA lõi. Một lớp nối dây gọi thẳng `chrome.debugger.sendCommand` sẽ đi vòng
 * qua cả ba, mà mọi phép ghim của lõi vẫn xanh — bài học "mutation-test the WIRING, not just
 * the rule". Nên ở đây ta không hỏi lõi trả về gì; ta hỏi `chrome` ĐÃ BỊ GỌI NHỮNG GÌ.
 *
 * Danh sách dưới đây KHAI LẠI tại chỗ, cố ý không import từ module — import là để cái được
 * ghim tự chấm điểm cho chính nó. */
const READ_ONLY_AT_CHROME = new Set([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.describeNode",
  "Target.getTargetInfo"
]);

attachShouldFail = false;

/* ① Đường vui: dom.query chạy được, và MỌI method chạm tới chrome đều read-only. */
calls.length = 0;
const q = await engine.runProbe(targets[0], "dom.query", { selector: "button" });
assert.equal(q.ok, true, `dom.query phải chạy được: ${JSON.stringify(q)}`);
assert.equal(q.data.matchCount, 3);
assert.equal(q.data.items.length, 3);

const chamChrome = calls.filter((c) => c !== "attach" && c !== "detach");
assert.ok(chamChrome.length > 0, "không lệnh CDP nào tới chrome — lớp nối dây không chạy thật");
for (const method of chamChrome) {
  assert.ok(READ_ONLY_AT_CHROME.has(method), `lọt method ngoài bộ read-only tới chrome: ${method}`);
}

/* Nhật ký `cdp` chỉ được ghi BÊN TRONG cổng read-only của lõi. Rỗng nghĩa là lớp nối dây
 * đã đi vòng qua cổng đó. */
assert.ok(Array.isArray(q.cdp) && q.cdp.length > 0, "nhật ký cdp rỗng — lõi không nằm trên đường chạy");
assert.ok(calls.includes("attach") && calls.includes("detach"), "phải gắn rồi THÁO debugger");

/* ② Che dữ liệu vẫn còn tác dụng sau khi nối dây. */
const attrs = q.data.items[0].attributes;
assert.equal(attrs["data-secret"], undefined, "thuộc tính ngoài danh sách trắng không được lộ giá trị");
assert.ok(q.data.items[0].redactedAttributes.includes("data-secret"));
assert.ok(!JSON.stringify(q.data).includes("SECRET-DO-NOT-LEAK"), "bí mật lọt qua lớp nối dây");

/* ③ Tên phép dò lạ: từ chối, và KHÔNG gắn debugger vào trang nào cả. */
calls.length = 0;
const la = await engine.runProbe(targets[0], "dom.eval", { selector: "button" });
assert.equal(la.ok, false);
assert.equal(la.code, "PROBE_UNKNOWN");
assert.deepEqual(calls, [], "tên lạ mà vẫn đụng tới debugger");

/* ④ targets.list đi đường listTargets, không gắn debugger. */
calls.length = 0;
const ds = await engine.runProbe(targets[0], "targets.list", {});
assert.equal(ds.ok, true);
assert.equal(ds.data.count, 2);
assert.equal(ds.data.targets[1].classification.kind, "service_worker");
assert.deepEqual(calls, [], "targets.list không được gắn debugger");

/* ⑤ Không cướp phiên debug của người khác — kỷ luật cũ của observe(), giữ ở đường mới. */
calls.length = 0;
const ban = await engine.runProbe({ id: "x", attached: true }, "dom.query", { selector: "button" });
assert.equal(ban.ok, false);
assert.equal(ban.code, "TARGET_ALREADY_ATTACHED");
assert.deepEqual(calls, []);

/* ---- Nối dây ĐƯỜNG GHI: ba hành động đi qua chrome.debugger (S-01) -------
 *
 * Cùng lý do với khối trên, và ở đây nó nặng hơn: bốn chốt của lõi hành động chỉ bảo vệ được
 * thứ ĐI QUA lõi. Một lớp nối dây tự gọi thẳng `Input.dispatchMouseEvent` sẽ bấm được vào bất
 * kỳ toạ độ nào mà mọi phép ghim CỦA LÕI vẫn xanh trọn. Nên ở đây ta hỏi `chrome` đã bị gọi
 * những gì, không hỏi lõi trả về gì.
 *
 * Khai lại tại chỗ, cố ý không import. */
const WRITE_AT_CHROME = new Set([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.scrollIntoViewIfNeeded",
  "DOM.getBoxModel",
  "DOM.getNodeForLocation",
  "DOM.focus",
  "Input.dispatchMouseEvent",
  "Input.dispatchKeyEvent"
]);

soKhopQuery = [11];

/* ⑥ Đường vui: bấm chạy được, và mọi method chạm tới chrome đều nằm trong bộ ghi. */
calls.length = 0;
const bam = await engine.runAction(targets[0], "input.click", { selector: "button" });
assert.equal(bam.ok, true, `input.click phải chạy được: ${JSON.stringify(bam)}`);
assert.deepEqual(bam.data.clickedAt, { x: 60, y: 40 }, "toạ độ phải do lõi tính từ hộp, không phải số bịa");

const chamGhi = calls.filter((c) => c !== "attach" && c !== "detach");
assert.ok(chamGhi.length > 0, "không lệnh CDP nào tới chrome — lớp nối dây đường ghi không chạy thật");
for (const method of chamGhi) {
  assert.ok(WRITE_AT_CHROME.has(method), `lọt method ngoài bộ ghi tới chrome: ${method}`);
}
assert.equal(calls.filter((c) => c === "Input.dispatchMouseEvent").length, 3, "phải đủ ba khung chuột");
assert.ok(Array.isArray(bam.cdp) && bam.cdp.length > 0, "nhật ký cdp rỗng — lõi hành động không nằm trên đường chạy");
assert.ok(calls.includes("attach") && calls.includes("detach"), "đường ghi cũng phải gắn rồi THÁO debugger");

/* ⑦ Tên hành động lạ: từ chối, và KHÔNG gắn debugger vào trang nào cả.
 * Gắn debugger là thao tác mạnh nhất extension này làm được — đừng làm nó cho một yêu cầu sai. */
calls.length = 0;
const laGhi = await engine.runAction(targets[0], "input.drag", { selector: "button" });
assert.equal(laGhi.ok, false);
assert.equal(laGhi.code, "ACTION_UNKNOWN");
assert.deepEqual(calls, [], "tên hành động lạ mà vẫn đụng tới debugger");

/* ⑧ Yêu cầu mang toạ độ: từ chối SAU khi gắn, nhưng KHÔNG một khung chuột nào rời đi. */
calls.length = 0;
const toaDo = await engine.runAction(targets[0], "input.click", { selector: "button", x: 5, y: 5 });
assert.equal(toaDo.ok, false);
assert.equal(toaDo.code, "COORDINATE_NOT_ACCEPTED");
assert.deepEqual(calls.filter((c) => c.startsWith("Input.")), [], "yêu cầu mang toạ độ mà vẫn có khung chuột rời đi");

/* ⑨ Selector khớp nhiều: không bấm gì cả. */
calls.length = 0;
soKhopQuery = [11, 12];
const nhieu = await engine.runAction(targets[0], "input.click", { selector: "button" });
assert.equal(nhieu.ok, false);
assert.equal(nhieu.code, "SELECTOR_AMBIGUOUS");
assert.deepEqual(calls.filter((c) => c.startsWith("Input.")), [], "khớp nhiều mà vẫn bấm");
soKhopQuery = [11];

/* ⑩ Không cướp phiên debug của người khác — kỷ luật giữ nguyên ở đường ghi. */
calls.length = 0;
const banGhi = await engine.runAction({ id: "x", attached: true }, "input.click", { selector: "button" });
assert.equal(banGhi.ok, false);
assert.equal(banGhi.code, "TARGET_ALREADY_ATTACHED");
assert.deepEqual(calls, []);

console.log("scouter-actions wiring pins: PASS");

console.log("observer-engine wiring pins: PASS");

console.log("observer-engine smoke tests: PASS");

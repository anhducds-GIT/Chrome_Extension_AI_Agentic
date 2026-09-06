import assert from "node:assert/strict";

const calls = [];
let attachShouldFail = false;

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
      if (method === "DOM.querySelectorAll") return { nodeIds: [11, 12, 13] };
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

console.log("observer-engine wiring pins: PASS");

console.log("observer-engine smoke tests: PASS");

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
    sendCommand: async (_debuggee, method) => {
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

console.log("observer-engine smoke tests: PASS");

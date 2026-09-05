/* Phép ghim cho BỐN phép dò read-only của Observer (scripts/observer-probes.mjs).
 *
 * Luật ghim của repo (MULTIFLOW.md mục 5): ghim HÀNH VI, không ghim chuỗi nguồn; và ghim
 * CẢ HAI CHIỀU — "chặn đúng thứ cần chặn" lẫn "KHÔNG chặn thứ hợp lệ". Một bản "luôn từ
 * chối" phải làm file này ĐỎ, y như một bản "luôn cho qua".
 *
 * Danh sách method read-only ở dưới được KHAI LẠI TẠI ĐÂY, cố ý không import từ module.
 * Import là để cái được ghim tự chấm điểm cho chính nó: ai nới danh sách trong module thì
 * test cũng nới theo, và phép ghim im lặng mất tác dụng.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { runProbe, createReadOnlySender, ProbeError, PROBE_NAMES } =
  await import("../scripts/observer-probes.mjs");

/* Bản khai ĐỘC LẬP của test. Đừng đồng bộ nó với module — lệch nhau là tín hiệu, không phải lỗi. */
const READ_ONLY_EXPECTED = new Set([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.describeNode",
  "Target.getTargetInfo"
]);

/* Method GHI — không cái nào được lọt qua cổng. */
const WRITE_METHODS = [
  "Runtime.evaluate",
  "Runtime.callFunctionOn",
  "Runtime.compileScript",
  "Input.dispatchKeyEvent",
  "Input.insertText",
  "Input.dispatchMouseEvent",
  "DOM.setAttributeValue",
  "DOM.setOuterHTML",
  "DOM.removeNode",
  "DOMStorage.setDOMStorageItem",
  "Page.navigate",
  "Page.reload",
  "Network.setCookie",
  "Emulation.setScriptExecutionDisabled"
];

const POISON = "'); doSomething(); ('";
const INTERACTIVE =
  "a,button,input,select,textarea,[role='button'],[role='link'],[contenteditable='true'],[tabindex]";

/* ---- Trang giả lập ------------------------------------------------------ */

function attrsOf(i) {
  return [
    "id", `btn-${i}`,
    "class", "ok primary",
    "href", "https://example.test/go?token=SECRET-DO-NOT-LEAK#frag",
    "data-secret", "SECRET-DO-NOT-LEAK",
    "aria-label", `Nút số ${i}`
  ];
}

function childTree(depth, id) {
  if (depth <= 0) return { nodeId: id, nodeType: 1, nodeName: "SPAN", localName: "span", childNodeCount: 0, attributes: ["id", `n${id}`] };
  return {
    nodeId: id,
    nodeType: 1,
    nodeName: "DIV",
    localName: "div",
    childNodeCount: 2,
    attributes: ["id", `n${id}`, "data-secret", "SECRET-DO-NOT-LEAK"],
    children: [childTree(depth - 1, id * 10), childTree(depth - 1, id * 10 + 1)]
  };
}

function makeFakePage({ matchCount = 3 } = {}) {
  const seen = [];       // mọi lệnh lọt tới "trang"
  const writes = [];     // lệnh nào KHÔNG read-only mà tới được đây = lớp bảo vệ đã thủng
  const sendRaw = async (method, params = {}) => {
    seen.push({ method, params });
    if (!READ_ONLY_EXPECTED.has(method)) writes.push({ method, params });
    if (method === "Target.getTargetInfo") {
      return { targetInfo: { title: "Trang thử", url: "https://example.test/x", type: "page" } };
    }
    if (method === "DOM.enable") return {};
    if (method === "DOM.getDocument") {
      const depth = params.depth ?? 0;
      const root = {
        nodeId: 1,
        nodeType: 9,
        nodeName: "#document",
        localName: "",
        documentURL: "https://example.test/x?token=SECRET-DO-NOT-LEAK",
        baseURL: "https://example.test/",
        childNodeCount: 1,
        attributes: []
      };
      if (depth > 0) root.children = [childTree(depth - 1, 2)];
      return { root };
    }
    if (method === "DOM.querySelectorAll") {
      if (params.selector === POISON) {
        const err = new Error("DOM Error while querying");
        err.code = -32000;
        throw err;
      }
      const n = params.selector === INTERACTIVE ? 250 : matchCount;
      return { nodeIds: Array.from({ length: n }, (_, i) => 100 + i) };
    }
    if (method === "DOM.describeNode") {
      const i = (params.nodeId ?? 100) - 100;
      return {
        node: {
          nodeId: params.nodeId, nodeType: 1, nodeName: "BUTTON", localName: "button",
          childNodeCount: 0, attributes: attrsOf(i)
        }
      };
    }
    throw new Error(`Fake page không hiểu method ${method}`);
  };
  return { sendRaw, seen, writes };
}

const FAKE_TARGETS = [
  { id: "extension-page", type: "page", title: "Extension surface", url: "chrome-extension://abc/ui.html", attached: false },
  { id: "web", type: "page", title: "Trang thường", url: "https://example.test/x", attached: false }
];

/* ---- ① targets.list ----------------------------------------------------- */
{
  const res = await runProbe("targets.list", { listTargets: async () => FAKE_TARGETS });
  assert.equal(res.ok, true, "targets.list phải chạy được");
  assert.equal(res.data.count, 2);
  assert.equal(res.data.targets[0].classification.kind, "extension_page");
  assert.equal(res.data.targets[1].classification.kind, "normal_webpage");
  assert.ok(res.data.targets[0].classification.evidence, "phải kèm bằng chứng phân loại");
  assert.deepEqual(res.cdp, [], "targets.list không được gửi lệnh CDP nào");
}

/* ---- ② page.snapshot — PHÂN TRANG (lỗ ⑷ của brief) ---------------------- */
{
  const page = makeFakePage();
  const mid = await runProbe("page.snapshot", { sendRaw: page.sendRaw, targetId: "T1" }, { offset: 100, limit: 50 });
  assert.equal(mid.ok, true, mid.detail);
  assert.equal(mid.data.elements.total, 250, "phải báo TỔNG thật, không phải số đã cắt");
  assert.equal(mid.data.elements.returned, 50);
  assert.equal(mid.data.elements.offset, 100);
  assert.equal(mid.data.elements.hasMore, true);
  assert.equal(mid.data.elements.nextOffset, 150);
  assert.equal(mid.data.metadata.title, "Trang thử");
  assert.ok(!mid.data.metadata.documentURL.includes("token"), "URL trang cũng phải bị cắt query");
  assert.ok(mid.data.metadata.documentURL.startsWith("https://example.test/x"));

  const tail = await runProbe("page.snapshot", { sendRaw: page.sendRaw, targetId: "T1" }, { offset: 240, limit: 50 });
  assert.equal(tail.data.elements.returned, 10, "trang cuối phải trả đúng phần còn lại");
  assert.equal(tail.data.elements.hasMore, false);
  assert.equal(tail.data.elements.nextOffset, null);

  /* Bộ chọn gửi đi phải là HẰNG SỐ, không dính offset/limit của người gọi. */
  const qsa = page.seen.filter((c) => c.method === "DOM.querySelectorAll");
  assert.ok(qsa.length > 0);
  for (const call of qsa) assert.equal(call.selector, undefined);
  for (const call of qsa) assert.equal(call.params.selector, INTERACTIVE);

  /* Che dữ liệu: thuộc tính ngoài danh sách trắng chỉ hiện TÊN. */
  const item = mid.data.elements.items[0];
  assert.equal(item.attributes["data-secret"], undefined, "giá trị ngoài danh sách trắng không được lọt");
  assert.ok(item.redactedAttributes.includes("data-secret"), "nhưng phải báo là CÓ thuộc tính đó");
  assert.ok(!JSON.stringify(mid).includes("SECRET-DO-NOT-LEAK"), "không mẩu bí mật nào được nằm trong báo cáo");
  assert.ok(item.attributes.href.startsWith("https://example.test/go"), "href giữ đường dẫn");
  assert.ok(!item.attributes.href.includes("token"), "href phải bị cắt query");
}

/* ---- ③ dom.query — luật vàng số 1 -------------------------------------- */
{
  const page = makeFakePage({ matchCount: 7 });
  const res = await runProbe("dom.query", { sendRaw: page.sendRaw }, { selector: "button.ok", limit: 3 });
  assert.equal(res.ok, true, res.detail);
  assert.equal(res.data.matchCount, 7, "phải trả lời 'khớp mấy phần tử'");
  assert.equal(res.data.returned, 3, "và trả về đúng lát đã xin");
  assert.equal(res.data.hasMore, true);
  assert.equal(res.data.items[0].nodeName, "BUTTON", "và 'chúng là gì'");
  assert.equal(res.data.items[0].attributes["aria-label"], "Nút số 0");

  /* Selector đi làm THAM SỐ giao thức, không nối vào chuỗi nào. */
  const qsa = page.seen.find((c) => c.method === "DOM.querySelectorAll");
  assert.equal(qsa.params.selector, "button.ok");

  const missing = await runProbe("dom.query", { sendRaw: page.sendRaw }, {});
  assert.equal(missing.ok, false);
  assert.equal(missing.code, "SELECTOR_REQUIRED");
}

/* ---- ③b Selector độc — không có mã nào được dựng, nên không có mã nào chạy */
{
  const page = makeFakePage();
  const res = await runProbe("dom.query", { sendRaw: page.sendRaw }, { selector: POISON });
  assert.equal(res.ok, false);
  assert.equal(res.code, "SELECTOR_INVALID", "selector độc phải chết như một selector CSS SAI");

  const carriers = page.seen.filter((c) => JSON.stringify(c.params).includes("doSomething"));
  assert.equal(carriers.length, 1, "chuỗi độc chỉ được xuất hiện đúng một lần");
  assert.equal(carriers[0].method, "DOM.querySelectorAll");
  assert.equal(carriers[0].params.selector, POISON, "và chỉ ở vị trí tham số `selector`, nguyên văn");
  assert.deepEqual(Object.keys(carriers[0].params).sort(), ["nodeId", "selector"]);
  assert.deepEqual(page.writes, [], "không một lệnh ghi nào được phát ra");
  for (const call of page.seen) {
    assert.ok(!call.method.startsWith("Runtime."), `lộ đường chạy mã: ${call.method}`);
  }
}

/* ---- ④ dom.tree — độ sâu N kèm thuộc tính (lỗ ⑵ của brief) -------------- */
{
  const page = makeFakePage();
  const res = await runProbe("dom.tree", { sendRaw: page.sendRaw }, { depth: 3 });
  assert.equal(res.ok, true, res.detail);
  const doc = page.seen.find((c) => c.method === "DOM.getDocument");
  assert.equal(doc.params.depth, 3, "phải xin đúng độ sâu, không phải depth:0 như bản cũ");
  assert.ok(Array.isArray(res.data.tree.children) && res.data.tree.children.length > 0, "phải có cấu trúc cây");
  const grand = res.data.tree.children[0];
  assert.equal(grand.nodeName, "DIV");
  assert.equal(grand.attributes.id, "n2", "cây phải kèm thuộc tính");
  assert.ok(grand.redactedAttributes.includes("data-secret"));
  assert.ok(!JSON.stringify(res).includes("SECRET-DO-NOT-LEAK"));

  const small = await runProbe("dom.tree", { sendRaw: page.sendRaw }, { depth: 4, maxNodes: 3 });
  assert.equal(small.data.truncated, true, "vượt ngân sách nút thì phải NÓI là đã cắt");
  assert.equal(small.data.nodeCount, 3);

  for (const bad of [0, 11, 2.5, "3", -1]) {
    const r = await runProbe("dom.tree", { sendRaw: page.sendRaw }, { depth: bad });
    assert.equal(r.ok, false, `depth=${bad} phải bị từ chối`);
    assert.equal(r.code, "PARAM_INVALID");
  }
}

/* ---- ⑤ BẤT BIẾN READ-ONLY — ghim cả hai chiều --------------------------- */
{
  /* Chiều CHẶN: mọi method ghi đều bị cổng ném, và không tới được trang. */
  const reached = [];
  const send = createReadOnlySender(async (method) => { reached.push(method); return {}; });
  for (const method of WRITE_METHODS) {
    await assert.rejects(
      () => send(method, {}),
      (error) => error instanceof ProbeError && error.code === "CDP_METHOD_NOT_ALLOWED",
      `method ghi lọt qua cổng: ${method}`
    );
  }
  assert.deepEqual(reached, [], "không method ghi nào được chạm tới trang");

  /* Chiều KHÔNG CHẶN OAN: method read-only hợp lệ phải đi được. Thiếu vế này thì một bản
   * "luôn từ chối" vẫn qua sạch (bẫy số 3 của MULTIFLOW mục 5). */
  for (const method of READ_ONLY_EXPECTED) {
    await send(method, { nodeId: 1 });
  }
  assert.equal(reached.length, READ_ONLY_EXPECTED.size, "method read-only phải tới được trang");

  /* Chốt ⑶: khoá tham số chở mã bị chặn NGAY CẢ trên một method hợp lệ. */
  for (const key of ["expression", "functionDeclaration", "text", "value", "outerHTML", "arguments"]) {
    await assert.rejects(
      () => send("DOM.getDocument", { [key]: "1+1" }),
      (error) => error instanceof ProbeError && error.code === "CDP_PARAM_NOT_ALLOWED",
      `tham số chở mã lọt qua: ${key}`
    );
  }

  /* Và trên đường đi thật của cả bốn phép dò: không method nào ngoài danh sách. */
  const page = makeFakePage();
  const deps = { sendRaw: page.sendRaw, targetId: "T1", listTargets: async () => FAKE_TARGETS };
  const runs = [
    await runProbe("targets.list", deps),
    await runProbe("page.snapshot", deps),
    await runProbe("dom.query", deps, { selector: "button" }),
    await runProbe("dom.tree", deps)
  ];
  for (const run of runs) {
    assert.equal(run.ok, true, `${run.probe}: ${run.detail}`);
    for (const call of run.cdp) {
      assert.ok(READ_ONLY_EXPECTED.has(call.method), `${run.probe} gửi method ngoài danh sách: ${call.method}`);
    }
  }
  assert.deepEqual(page.writes, [], "không lệnh ghi nào lọt tới trang qua bất kỳ phép dò nào");
}

/* ---- ⑥ Từ vựng CỐ ĐỊNH -------------------------------------------------- */
{
  assert.deepEqual([...PROBE_NAMES], ["targets.list", "page.snapshot", "dom.query", "dom.tree"]);
  for (const bogus of ["dom.eval", "runtime.evaluate", "page.click", ""]) {
    const res = await runProbe(bogus, { sendRaw: async () => ({}) }, {});
    assert.equal(res.ok, false, `tên lạ phải bị từ chối: ${bogus}`);
    assert.equal(res.code, "PROBE_UNKNOWN");
  }
}

console.log("observer-probes smoke tests: PASS");

/* ---- Bộ đo đột biến ------------------------------------------------------
 * Chạy ở tiến trình con, chỉ khi được gọi với --with-mutation (mặc định TẮT: nó bẩn file
 * nguồn vài chục giây, mà suite gốc chạy chung một cây làm việc với lane khác). */
if (process.argv.includes("--with-mutation")) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  execFileSync(process.execPath, [path.join(here, "..", "scripts", "observer-mutation-check.mjs")], { stdio: "inherit" });
}

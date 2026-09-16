/* Phép ghim cho BỐN phép dò read-only của Observer (scripts/scouter-probes.mjs).
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
  await import("../scripts/scouter-probes.mjs");

/* Bản khai ĐỘC LẬP của test. Đừng đồng bộ nó với module — lệch nhau là tín hiệu, không phải lỗi. */
const READ_ONLY_EXPECTED = new Set([
  "DOM.enable",
  "DOM.getDocument",
  "DOM.querySelectorAll",
  "DOM.describeNode",
  "Target.getTargetInfo",
  /* Bốn miền mở thêm 07/09. Vẫn là getter thuần — đó là điều kiện để vào danh sách này.
   * `Page.captureScreenshot` CÓ vào; `Page.navigate` thì KHÔNG, và khoảng cách giữa hai
   * cái đó chính là ranh giới đọc/điều-khiển mà file này canh. */
  "Accessibility.enable",
  "Accessibility.getFullAXTree",
  "Page.captureScreenshot",
  /* `Page.getLayoutMetrics` vào danh sách ngày 16/09, và **không phải để làm một cổng xanh lại**.
   * `page.shot` và `page.view` **đã gửi nó từ lâu**; lượt quét ở khối ⑤ chỉ phủ bốn phép dò đầu
   * nên chưa bao giờ nhìn thấy hai phép dò đó. Tức lớp bảo vệ này **vốn đã không phủ chúng**,
   * và việc mở rộng lượt quét là thứ làm chuyện đó hiện ra.
   *
   * Nó đủ điều kiện vào đây vì nó là **getter thuần**: trả về số đo khung nhìn và cỡ trang,
   * không đổi một byte nào của trang — cùng họ với `Page.captureScreenshot` ở ngay trên.
   * Đây là một quyết định về BỀ MẶT AN TOÀN, nên nó được viết ra chứ không lặng lẽ thêm vào. */
  "Page.getLayoutMetrics"
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
    "data-image-id", `anh-${i}`,
    "aria-label", `Nút số ${i}`
  ];
}

/* `conLai` = còn được phép trả bao nhiêu tầng (mép `depth` của lượt hỏi).
 * `sauThat` = cây THẬT còn sâu bao nhiêu tầng nữa.
 *
 * Hai con số phải tách nhau thì trang giả mới dựng được ca đáng sợ: cây thật sâu hơn lượt hỏi.
 * Ở đúng mép ấy CDP vẫn khai `childNodeCount` THẬT nhưng KHÔNG gửi `children` — và bản cũ của
 * hàm này trả `childNodeCount: 0` ở mép, tức là vẽ một cái cây lúc nào cũng vừa khít lượt hỏi.
 * Vì thế không phép ghim nào nhìn ra nhát cắt độ sâu đang im lặng (`G-83`, đo thật trên Udin:
 * `truncated:false` trong khi 42 nhánh bị cụt). Trang giả mã hoá niềm tin của người viết nó. */
function childTree(conLai, id, sauThat = Infinity) {
  if (sauThat <= 0) return { nodeId: id, nodeType: 1, nodeName: "SPAN", localName: "span", childNodeCount: 0, attributes: ["id", `n${id}`] };
  const nut = {
    nodeId: id,
    nodeType: 1,
    nodeName: "DIV",
    localName: "div",
    childNodeCount: 2,
    attributes: ["id", `n${id}`, "data-secret", "SECRET-DO-NOT-LEAK"]
  };
  if (conLai <= 0) return nut;   // mép độ sâu: CÓ con, mà không gửi con
  nut.children = [childTree(conLai - 1, id * 10, sauThat - 1), childTree(conLai - 1, id * 10 + 1, sauThat - 1)];
  return nut;
}

function makeFakePage({ matchCount = 3, sauThat = Infinity } = {}) {
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
      if (depth > 0) root.children = [childTree(depth - 1, 2, sauThat - 1)];
      return { root };
    }
    /* Ba method dưới đây thêm 16/09 để lượt quét ở khối ⑤ chạy được CẢ `a11y.tree`, `page.shot`
     * và `page.view`. Trước đó trang giả không hiểu chúng, nên ba phép dò ấy **chưa bao giờ đi
     * qua cổng đó** — và một trang giả thiếu method đọc y hệt một phép dò đã được kiểm. */
    if (method === "Accessibility.enable") return {};
    if (method === "Accessibility.getFullAXTree") {
      return { nodes: [
        { nodeId: "1", ignored: false, role: { value: "button" }, name: { value: "Nút số 1" } },
        { nodeId: "2", ignored: true, role: { value: "generic" }, name: { value: "" } }
      ] };
    }
    if (method === "Page.getLayoutMetrics") {
      return {
        cssLayoutViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 720 },
        cssVisualViewport: { pageX: 0, pageY: 0, clientWidth: 1280, clientHeight: 720, scale: 1, zoom: 1 },
        cssContentSize: { width: 1280, height: 4000 }
      };
    }
    if (method === "Page.captureScreenshot") return { data: "aVZCT1JytoJQ==" };
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
          nodeId: params.nodeId, backendNodeId: 900 + i,
          nodeType: 1, nodeName: "BUTTON", localName: "button",
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

  /* `data-image-id` MỞ 17/09 — Đức chốt. Hai vế phải cùng đúng, và vế thứ hai mới là vế giữ
   * cho lượt nới này HẸP: cái đã khai thì đọc được GIÁ TRỊ, cái chưa khai vẫn chỉ hiện TÊN.
   * Một bản vá lười — bỏ hẳn danh sách trắng, hoặc cho qua mọi `data-*` — làm vế đầu xanh y
   * hệt, nên chỉ mình nó không phân biệt được hai nhánh. */
  /* Suy từ `id` của chính phần tử ấy, đừng gõ cứng "anh-0": khối này đọc một LÁT ở giữa trang,
   * nên số thứ tự phụ thuộc `offset` — một con số gõ cứng sẽ đỏ oan mỗi lần ai đó sửa lát cắt. */
  assert.equal(item.attributes["data-image-id"], item.attributes.id.replace("btn-", "anh-"),
    "`data-image-id` đã khai thì phải đọc được GIÁ TRỊ — danh tính ảnh trên canvas Udin dựa vào nó");
  assert.ok(!item.redactedAttributes.includes("data-image-id"));
  assert.ok(item.redactedAttributes.includes("data-secret"),
    "và một `data-*` CHƯA khai vẫn phải bị che — nới cho cả họ `data-*` là mở bừa");
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
  /* `backendNodeId` — MỐI NỐI giữa hai phép dò (`S1`, 16/09). `a11y.tree` đã khai
   * `backend_node_id` từ lâu; thiếu con số này ở phía DOM thì không có cách nào hỏi *"nút trợ
   * năng nào là phần tử tôi vừa gõ vào"*, và đối chiếu theo TÊN chỉ là đoán. Bỏ nó đi thì
   * `scout.type` lặng lẽ tụt xuống *"không đọc được"* ở mọi ô nhập thường — một màu xanh giả
   * trọn vẹn, vì lượt gõ vẫn báo `ok: true`. */
  assert.equal(res.data.items[0].backendNodeId, 900, "dom.query phải chở backendNodeId ra ngoài");
  assert.equal(res.data.items[1].backendNodeId, 901, "và nó phải là của ĐÚNG phần tử đó, không phải một hằng số");

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

/* ---- ③c `dom.text` và `dom.wait` — CÙNG cái chốt ấy, cho TỪNG đường một ------
 * `S-26`, đóng 16/09. Hai phép dò này ra đời bằng cách **dùng lại** đường của `dom.query`,
 * và chúng đã được coi là “có chốt” suốt từ đó — nhưng chỉ vì con đột biến `M5` cũ thay cả **ba**
 * chỗ cùng lúc, nên một mình khối ③b (chỉ dò `dom.query`) đủ làm nó đỏ. Tách `M5` làm ba con
 * rồi chạy lại: **`M5a` và `M5c` SỐNG SÓT** — hai đường này không hề có chốt nào.
 *
 * Bài học, và nó rộng hơn hai phép dò này: **một con đột biến thay nhiều chỗ cùng lúc là một
 * con đột biến KHÔNG PHÂN BIỆT ĐƯỢC hai nhánh** — nó báo “giết được” cho cả những chỗ trống không. */
{
  for (const [ten, params] of [
    ["dom.text", { selector: POISON }],
    /* `timeoutMs`/`pollMs` ở mức nhỏ nhất: selector độc chết ngay ở lượt hỏi đầu, nhưng nếu
       một bản sửa nào đó nuốt lỗi thì phép ghim phải thức dậy, không treo một phút. */
    ["dom.wait", { selector: POISON, timeoutMs: 100, pollMs: 100 }]
  ]) {
    const page = makeFakePage();
    const res = await runProbe(ten, { sendRaw: page.sendRaw }, params);
    assert.equal(res.ok, false, `${ten}: selector độc phải chết`);
    assert.equal(res.code, "SELECTOR_INVALID", `${ten}: và chết như một selector CSS SAI`);

    const carriers = page.seen.filter((c) => JSON.stringify(c.params).includes("doSomething"));
    assert.equal(carriers.length, 1, `${ten}: chuỗi độc chỉ được xuất hiện đúng một lần`);
    assert.equal(carriers[0].method, "DOM.querySelectorAll", `${ten}: và phải đi qua đường hỏi DOM`);
    assert.equal(carriers[0].params.selector, POISON, `${ten}: chỉ ở vị trí tham số \`selector\`, nguyên văn`);
    assert.deepEqual(Object.keys(carriers[0].params).sort(), ["nodeId", "selector"],
      `${ten}: không tham số nào khác được chở theo`);
    assert.deepEqual(page.writes, [], `${ten}: không một lệnh ghi nào được phát ra`);
    for (const call of page.seen) {
      assert.ok(!call.method.startsWith("Runtime."), `${ten} lộ đường chạy mã: ${call.method}`);
    }
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

  /* ---- NHÁT CẮT THEO ĐỘ SÂU — cái xanh giả của `G-83` -------------------
   * Ca đắt nhất KHÔNG phải "cắt mà báo là cắt", mà là **cắt trong lúc mọi con số đều nói là
   * chưa cắt**: ngân sách nút còn thừa, `truncated:false`, và cây vẫn cụt ở mép độ sâu. Đúng
   * hình dạng đó đã làm báo cáo chặng ② trên Udin thiếu mất 36 ảnh kết quả mà vẫn tự khai đủ. */
  {
    const sau = await runProbe("dom.tree", { sendRaw: page.sendRaw }, { depth: 3, maxNodes: 500 });
    assert.equal(sau.data.truncated, false, "ngân sách nút còn thừa — ca cần thử đúng là ca này");
    assert.ok(sau.data.cutByDepth > 0, "cây thật sâu hơn lượt hỏi mà khai cutByDepth:0 là nói dối");
    assert.equal(sau.data.childrenDropped, sau.data.cutByDepth * 2, "phải đếm ĐÚNG số nút con rơi ra ngoài, không chỉ số nhánh cụt");
    /* và nó phải chỉ ra ĐÚNG NHÁNH NÀO cụt, không chỉ đưa một con số tổng */
    const memMep = [];
    (function di(n) { if (n.cutByDepth) memMep.push(n); for (const k of n.children || []) di(k); })(sau.data.tree);
    assert.equal(memMep.length, sau.data.cutByDepth, "mỗi nhánh cụt phải tự mang dấu, để người đọc biết đi tiếp từ đâu");
    assert.ok(memMep.every((n) => (n.children || []).length === 0 && n.childNodeCount > 0));
  }
  {
    /* Chiều ngược: cây thật NÔNG hơn lượt hỏi thì không được bịa ra nhát cắt nào. */
    const nong = makeFakePage({ sauThat: 2 });
    const du = await runProbe("dom.tree", { sendRaw: nong.sendRaw }, { depth: 8, maxNodes: 500 });
    assert.equal(du.data.cutByDepth, 0, "dò hết cây mà vẫn kêu bị cắt thì lần sau không ai tin nữa");
    assert.equal(du.data.childrenDropped, 0);
  }

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
  /* `matchCount: 1` — `dom.text` từ chối một selector khớp nhiều phần tử, và lượt quét này cần
   * mọi phép dò ĐI ĐẾN CÙNG đường thật, không dừng ở một lỗi tham số. */
  const page = makeFakePage({ matchCount: 1 });
  const deps = { sendRaw: page.sendRaw, targetId: "T1", listTargets: async () => FAKE_TARGETS };
  /* Quét **MỌI** phép dò chạy được với trang giả, không chỉ bốn cái đầu tiên (`S-26`).
   * Danh sách cũ dừng ở bốn, nên sáu phép dò mở thêm sau đó **chưa bao giờ đi qua cổng này** —
   * và một danh sách gõ tay thì lần sau lại quên tiếp. Neo vào `PROBE_NAMES` thật: thêm một
   * phép dò mà quên khai tham số ở đây thì khối này ĐỎ ngay. */
  const THAM_SO_QUET = {
    "targets.list": {},
    "page.snapshot": {},
    "dom.query": { selector: "button" },
    "dom.tree": {},
    "dom.text": { selector: "button" },
    "dom.wait": { selector: "button", timeoutMs: 100, pollMs: 100 },
    "a11y.tree": {},
    "page.shot": {},
    "page.view": {},
    /* `network.watch` KHÔNG quét được ở đây: nó cần `subscribe`, mà trang giả này không
       có kênh sự kiện. Khai ra bằng `null` chứ không bỏ lặng lẽ — một cái tên thiếu trong
       bảng này đọc y hệt một cái tên đã được quét. */
    "network.watch": null
  };
  assert.deepEqual(Object.keys(THAM_SO_QUET).sort(), [...PROBE_NAMES].sort(),
    "bảng tham số quét phải phủ ĐÚNG từ vựng phép dò thật — thêm một phép dò thì phải khai ở đây");
  const runs = [];
  for (const [ten, ps] of Object.entries(THAM_SO_QUET)) {
    if (ps === null) continue;
    runs.push(await runProbe(ten, deps, ps));
  }
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
  assert.deepEqual([...PROBE_NAMES],
    ["targets.list", "page.snapshot", "dom.query", "dom.tree", "a11y.tree", "page.shot", "dom.wait", "network.watch", "dom.text", "page.view"]);
  for (const bogus of ["dom.eval", "runtime.evaluate", "page.click", ""]) {
    const res = await runProbe(bogus, { sendRaw: async () => ({}) }, {});
    assert.equal(res.ok, false, `tên lạ phải bị từ chối: ${bogus}`);
    assert.equal(res.code, "PROBE_UNKNOWN");
  }
}


/* ---- Bộ đo đột biến ------------------------------------------------------
 * Chạy ở tiến trình con, chỉ khi được gọi với --with-mutation (mặc định TẮT: nó bẩn file
 * nguồn vài chục giây, mà suite gốc chạy chung một cây làm việc với lane khác). */
/* ---- a11y.tree — ĐỌC THEO VAI TRÒ VÀ TÊN (07/09) -------------------------
 * Ba chốt, và cả ba là kiểu hỏng IM LẶNG — thứ suite vẫn xanh trong khi phép dò đã vô dụng.
 * Con `N1` `N2` canh đúng ba chốt này. */
{
  const axNodes = [
    { role: { value: "button" }, name: { value: "Gửi" }, backendDOMNodeId: 11,
      properties: [{ name: "focusable", value: { value: true } }] },
    { role: { value: "textbox" }, name: { value: "Lời nhắc" }, value: { value: "xin chào" }, backendDOMNodeId: 12,
      properties: [{ name: "disabled", value: { value: true } }] },
    /* Ba nút dưới đây KHÔNG mang thông tin. Trên trang thật chúng chiếm phần lớn cây. */
    { role: { value: "generic" }, name: { value: "" }, backendDOMNodeId: 13 },
    { role: { value: "none" }, name: { value: "" }, backendDOMNodeId: 14 },
    { role: { value: "button" }, name: { value: "ẩn" }, ignored: true, backendDOMNodeId: 15 }
  ];
  const send = async (method) => {
    if (method === "Accessibility.getFullAXTree") return { nodes: axNodes };
    return {};
  };
  const res = await runProbe("a11y.tree", { sendRaw: send });
  assert.equal(res.ok, true, JSON.stringify(res));

  /* ① LỌC. Năm nút vào, hai nút có ích ra. Không lọc thì phong bì đầy rác rồi chạm trần vì rác. */
  assert.equal(res.data.total_nodes, 5);
  assert.equal(res.data.useful_nodes, 2, "phai bo nut ignored va nut generic/none khong ten");
  assert.deepEqual(res.data.nodes.map((n) => n.name), ["Gửi", "Lời nhắc"]);

  /* ② TÊN KHÔNG BỊ CHE. Mọi chỗ khác trong lõi che thuộc tính; ở đây `name` chính là thứ cần,
   *   và che nó là trả về một cây rỗng rọt. ADR-0016 cho phép điều này từ 07/09. */
  assert.equal(res.data.nodes[0].role, "button");
  assert.equal(res.data.nodes[1].value, "xin chào", "gia tri o nhap phai di theo");
  assert.equal(res.data.nodes[0].focusable, true);
  assert.equal(res.data.nodes[1].disabled, true);

  /* ③ CẮT THÌ PHẢI NÓI. `getFullAXTree` không phân trang được ở tầng CDP nên lõi phải cắt —
   *   và cắt im lặng là nói dối. Con `N1` mutant hoá đúng dòng này. */
  const cat = await runProbe("a11y.tree", { sendRaw: send }, { limit: 1 });
  assert.equal(cat.data.returned, 1);
  assert.equal(cat.data.truncated, true, "cat bot ma bao truncated:false la noi doi");
  const du = await runProbe("a11y.tree", { sendRaw: send }, { limit: 50 });
  assert.equal(du.data.truncated, false, "khong cat gi ma bao da cat cung sai");
}

/* ---- page.shot — ẢNH, và hai chốt về TRẦN (07/09) ------------------------
 * Con `N3` `N4` canh đúng hai chốt này. */
{
  const anhNho = Buffer.alloc(1000).toString("base64");
  const daGoi = [];
  const send = async (method, params) => {
    daGoi.push({ method, params });
    return { data: anhNho };
  };

  /* ① MẶC ĐỊNH LÀ JPEG, không phải PNG. Một PNG toàn trang thường vượt trần phong bì, nên
   *   để PNG làm mặc định là để phép dò hỏng ở đúng ca hay gặp nhất. */
  const mac = await runProbe("page.shot", { sendRaw: send });
  assert.equal(mac.data.format, "jpeg", "mac dinh phai la jpeg");
  assert.equal(daGoi.at(-1).params.format, "jpeg");
  assert.equal(daGoi.at(-1).params.quality, 60);
  const png = await runProbe("page.shot", { sendRaw: send }, { format: "png" });
  assert.equal(png.data.format, "png");
  assert.equal(daGoi.at(-1).params.quality, undefined, "png khong duoc kem quality");

  /* ② QUÁ TRẦN THÌ ĐỎ, KHÔNG CẮT. Một ảnh bị cắt là một file hỏng, và người nhận sẽ đi tìm
   *   bug ở chỗ không có bug. Cùng luật với `scout.fetch`. */
  const anhTo = Buffer.alloc(900 * 1024).toString("base64");
  const to = await runProbe("page.shot", { sendRaw: async () => ({ data: anhTo }) });
  assert.equal(to.ok, false, "anh qua tran ma van bao thanh cong");
  assert.equal(to.code, "SHOT_TOO_LARGE");

  const rong = await runProbe("page.shot", { sendRaw: async () => ({}) });
  assert.equal(rong.ok, false);
  assert.equal(rong.code, "NO_SCREENSHOT");
}

/* `dom.snapshot` ĐÃ BỊ BỎ ngày 08/09 — Đức chốt.
 *
 * Lý do, đo thật trên Bridge đang chạy: nó GIẾT service worker trên trang lớn (2/3 trang thử).
 * Trần thêm vào cùng ngày chỉ đỡ được trang vừa; trang rất lớn thì worker chết ngay trong lúc
 * Chrome trả dữ liệu, tức TRƯỚC khi bất kỳ dòng nào của ta kịp chạy. Không còn chỗ đặt hàng rào.
 *
 * `dom.tree` (có MAX_TREE_NODES) và `dom.query` làm được cùng việc, có trần, chưa bao giờ làm
 * đứt kết nối. Để một method biết chắc sẽ sập trong danh sách khả năng là mời phiên AI sau
 * giẫm vào — mà danh sách khả năng chính là thứ AI đọc để quyết định gọi gì.
 *
 * Mã không bị xoá khỏi lịch sử; nó chỉ không còn là một khả năng được khai. */

if (process.argv.includes("--with-mutation")) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  execFileSync(process.execPath, [path.join(here, "..", "scripts", "scouter-probes-mutation-check.mjs")], { stdio: "inherit" });
}

/* Dòng PASS phải là dòng CUỐI CÙNG chạy được.
 * Trước 08/09 nó nằm ở giữa file, và bốn khối kiểm chạy SAU nó — nên một phép ghim đỏ vẫn in
 * ra chữ PASS rồi mới nổ. run-all.mjs đọc mã thoát nên nó không bị lừa, nhưng người đọc thì
 * có. Một dòng nói "đạt" trước khi đo xong là một dòng nói dối, dù máy không tin nó. */
console.log("scouter-probes smoke tests: PASS");

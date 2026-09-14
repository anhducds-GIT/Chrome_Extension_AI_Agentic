/* scouter-text-smoke.mjs — phép ghim cho `scout.text` / `dom.text` ([ADR-0006], Đức chốt 14/09).
 *
 * Thứ method này bán là một LỜI HỨA HẸP: *chữ của MỘT phần tử đã chỉ đích danh, có trần.* Cái
 * được bảo vệ là **KHỐI LƯỢNG**, không phải bản thân chữ — nên phần lớn khối dưới đây không kiểm
 * "nó đọc được chữ không" mà kiểm **cái không được xảy ra**: không lấy cả trang, không lấy mã
 * trong `<script>`, không đoán "phần tử đầu tiên", không vượt trần, và không có đường nào nới
 * hai thứ đó bằng tham số.
 *
 * CHỮ MỒI trong file này cố tình dài và dễ nhận: mọi khối đều tìm nó trong đầu ra, nên một chỗ
 * rò rỉ là ĐỎ chứ không phải "trông cũng ổn".
 */
import assert from "node:assert/strict";
import { runProbe, PROBE_NAMES } from "../scripts/scouter-probes.mjs";

const MA_BI_MAT = "KHONG_DUOC_LOT_RA_NGOAI_9F3A";

/* Chrome giả: dựng một cây DOM nhỏ rồi trả lời đúng bốn lệnh mà phép dò này dùng. */
function lamTrang({ cay = null, soKhop = 1 } = {}) {
  const goiCdp = [];
  const mac = {
    nodeId: 10, nodeType: 1, nodeName: "DIV",
    children: [
      { nodeId: 11, nodeType: 3, nodeValue: "Xin chào " },
      { nodeId: 12, nodeType: 1, nodeName: "B", children: [{ nodeId: 13, nodeType: 3, nodeValue: "Đức" }] },
      { nodeId: 14, nodeType: 3, nodeValue: "  \n  — xong rồi." }
    ]
  };
  return {
    goiCdp,
    sendRaw: async (method, params) => {
      goiCdp.push({ method, params });
      if (method === "DOM.enable") return {};
      if (method === "DOM.getDocument") return { root: { nodeId: 1 } };
      if (method === "DOM.querySelectorAll") return { nodeIds: Array.from({ length: soKhop }, (_, i) => 10 + i * 100) };
      if (method === "DOM.describeNode") return { node: cay || mac };
      throw new Error("method CDP không ngờ tới: " + method);
    }
  };
}
const chay = (trang, params) => runProbe("dom.text", { sendRaw: trang.sendRaw }, params);

// ⓐ đường thẳng: gom chữ của cả cây con, gộp khoảng trắng, cắt hai đầu
{
  const trang = lamTrang();
  const k = await chay(trang, { selector: "div.loi-bao" });
  assert.equal(k.ok, true);
  assert.equal(k.data.text, "Xin chào Đức — xong rồi.");
  assert.equal(k.data.chars, k.data.text.length);
  assert.equal(k.data.truncated, false);
  assert.equal(k.data.matchCount, 1);
  assert.ok(trang.goiCdp.some((g) => g.method === "DOM.describeNode" && g.params.depth === -1),
    "phải xin cả cây con: chữ của một phần tử nằm rải ở các nút con, không nằm ở chính nó");
}

// ⓑ KHOÁ ⑴ — selector khớp NHIỀU phần tử thì TỪ CHỐI, không lấy "cái đầu tiên"
{
  const k = await chay(lamTrang({ soKhop: 4 }), { selector: "div" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SELECTOR_AMBIGUOUS");
  assert.ok(!JSON.stringify(k).includes("Xin chào"), "lượt bị từ chối không được chở chữ ra");
}

// ⓒ KHÔNG khớp phần tử nào → nói thẳng, không trả chuỗi rỗng như thể đã đọc được
{
  const k = await chay(lamTrang({ soKhop: 0 }), { selector: "div.khong-co" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SELECTOR_NO_MATCH");
}

// ⓓ KHOÁ ⑵ — trần ký tự có thật, và khi đã cắt thì NÓI RA
{
  const dai = { nodeId: 10, nodeType: 1, nodeName: "DIV", children: [{ nodeId: 11, nodeType: 3, nodeValue: "x".repeat(9000) }] };
  const k = await chay(lamTrang({ cay: dai }), { selector: "div" });
  assert.equal(k.ok, true);
  assert.equal(k.data.chars, 5000, "trần 5.000 ký tự của ADR-0006");
  assert.equal(k.data.maxChars, 5000);
  assert.equal(k.data.truncated, true, "cắt mà báo truncated:false là một lời nói dối đi ra ngoài dây");
}

// ⓔ KHOÁ ⑵ (chiều kia) — dừng SỚM, không gom cả cây rồi mới cắt
{
  const con = Array.from({ length: 400 }, (_, i) => ({ nodeId: 100 + i, nodeType: 3, nodeValue: "y".repeat(50) }));
  const k = await chay(lamTrang({ cay: { nodeId: 10, nodeType: 1, nodeName: "DIV", children: con } }), { selector: "div" });
  assert.equal(k.data.truncated, true);
  assert.ok(k.data.chars <= 5000);
}

// ⓕ `<script>` và `<style>` KHÔNG phải chữ trên trang — trả mã nguồn dưới danh nghĩa "chữ"
//    là lách chính sách bằng một cái tên khác
{
  const cay = {
    nodeId: 10, nodeType: 1, nodeName: "DIV",
    children: [
      { nodeId: 11, nodeType: 1, nodeName: "SCRIPT", children: [{ nodeId: 12, nodeType: 3, nodeValue: `var token="${MA_BI_MAT}"` }] },
      { nodeId: 13, nodeType: 1, nodeName: "STYLE", children: [{ nodeId: 14, nodeType: 3, nodeValue: `.a{content:"${MA_BI_MAT}"}` }] },
      { nodeId: 15, nodeType: 3, nodeValue: "Thông báo lỗi thật" }
    ]
  };
  const k = await chay(lamTrang({ cay }), { selector: "div" });
  assert.equal(k.data.text, "Thông báo lỗi thật");
  assert.ok(!JSON.stringify(k).includes(MA_BI_MAT), "mã trong script/style lọt ra ngoài");
}

// ⓖ KHOÁ ⑶ — CHỈ chữ đi ra. Không `outerHTML`, không thuộc tính, không cấu trúc cây
{
  const cay = {
    nodeId: 10, nodeType: 1, nodeName: "DIV",
    attributes: ["data-token", MA_BI_MAT, "class", "loi-bao"],
    children: [{ nodeId: 11, nodeType: 3, nodeValue: "chỉ chữ thôi" }]
  };
  const k = await chay(lamTrang({ cay }), { selector: "div" });
  assert.deepEqual(Object.keys(k.data).sort(),
    ["chars", "matchCount", "maxChars", "redaction", "selector", "text", "truncated"],
    "thêm một trường vào đây là nới ADR-0006 — thuộc tính và cấu trúc cây phải ở lại `scout.query`/`scout.tree`");
  assert.ok(!JSON.stringify(k).includes(MA_BI_MAT), "giá trị thuộc tính lọt ra qua đường đọc chữ");
  /* Chỉ soi TRƯỜNG CHỮ, không soi cả khối: `redaction.rule` nhắc tên `outerHTML` để KHAI rằng
   * nó không được trả — soi cả khối là bắt đúng văn của chính mình, không bắt được lỗi nào. */
  assert.ok(!k.data.text.includes("outerHTML"));
}

// ⓗ cửa TỪ VỰNG: không tham số nào nới được trần hay bỏ được phép kiểm khớp-đúng-một
{
  const { METHOD_REGISTRY } = await import("../scripts/scouter-bridge-core.mjs");
  const muc = METHOD_REGISTRY["scout.text"];
  assert.ok(muc, "scout.text phải có trong bảng từ vựng");
  assert.deepEqual(Object.keys(muc.params_schema).sort(), ["selector", "target_id"],
    "lược đồ chỉ được có hai trường: thêm max_chars hay allow_multiple là mở lại đúng cái ADR-0006 đóng");
  assert.throws(() => muc.params_validator({ target_id: "T", selector: "div", max_chars: 999999 }), /unknown field/);
  assert.throws(() => muc.params_validator({ target_id: "T", selector: "div", allow_multiple: true }), /unknown field/);
  assert.equal(muc.read_only, true, "đọc chữ là ĐỌC: nó không được tiêu trần ghi, và không được vào lõi ghi");
}

// ⓘ lõi ĐỌC vẫn không có cửa chạy mã — `dom.text` không mở thêm method CDP nào
{
  const { READ_ONLY_CDP_METHODS } = await import("../scripts/scouter-probes.mjs");
  assert.ok(!READ_ONLY_CDP_METHODS.some((m) => m.startsWith("Runtime.")), "cửa chạy mã vẫn phải đóng");
  assert.ok(!READ_ONLY_CDP_METHODS.includes("DOM.getOuterHTML"),
    "getOuterHTML là đường vòng để lấy cả HTML — ADR-0006 cấm outerHTML, nên cửa đó phải ở ngoài");
  for (const m of ["DOM.enable", "DOM.getDocument", "DOM.querySelectorAll", "DOM.describeNode"]) {
    assert.ok(READ_ONLY_CDP_METHODS.includes(m), `${m} phải có sẵn — dom.text dùng lại, không mở cửa mới`);
  }
  assert.ok(PROBE_NAMES.includes("dom.text"));
}

// ⓙ lõi GHI không được mượn đường đọc chữ (luật gói số 6 — hai lõi, hai danh sách)
{
  const { WRITE_CDP_METHODS, ACTION_NAMES } = await import("../scripts/scouter-actions-core.mjs");
  assert.ok(!ACTION_NAMES.some((n) => /text|innerText/i.test(n)),
    "lõi ghi mọc một hành động đọc chữ là gộp hai lõi lại bằng cửa sau");
  assert.ok(!WRITE_CDP_METHODS.includes("DOM.getOuterHTML"));
}

console.log("  · scouter text: 10 khối xanh");

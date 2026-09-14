/* scouter-grab-smoke.mjs — phép ghim cho `scout.grab` / `input.grabUrl` (`S-24`, Đức chốt 14/09).
 *
 * Thứ method này bán là một LỜI HỨA HẸP: *URL đọc ở trong, dùng ở trong, không ra dây.* Nên
 * phần lớn các khối dưới đây không kiểm "nó tải được file không" mà kiểm **cái không được xảy
 * ra**: URL đầy đủ không nằm trong thứ trả về, không nằm trong lời báo lỗi, và không có lệnh
 * Bridge nào gọi thẳng được hành động đọc URL.
 *
 * CHỮ KÝ GIẢ trong file này cố tình dài và dễ nhận: mọi khối đều tìm nó trong đầu ra, nên một
 * chỗ rò rỉ là ĐỎ chứ không phải "trông cũng ổn".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const { runAction, ACTION_NAMES, WRITE_CDP_METHODS, GRAB_ATTRIBUTES } =
  await import("../scripts/scouter-actions-core.mjs");

const CHU_KY = "X-Amz-Signature=CHUKYBIMATKHONGDUOCLOT";
const URL_DAY_DU = `https://cdn.test/anh/v1.webp?${CHU_KY}&X-Amz-Expires=900`;

/* Chrome giả: chỉ trả lời đúng bốn lệnh mà hành động này dùng. */
function lamTrang({ src = URL_DAY_DU, soKhop = 1, baseURL = "https://trang.test/optic/" } = {}) {
  const goiCdp = [];
  return {
    goiCdp,
    sendRaw: async (method, params) => {
      goiCdp.push({ method, params });
      if (method === "DOM.enable") return {};
      if (method === "DOM.getDocument") return { root: { nodeId: 1, baseURL, documentURL: baseURL } };
      if (method === "DOM.querySelectorAll") return { nodeIds: Array.from({ length: soKhop }, (_, i) => 10 + i) };
      if (method === "DOM.getAttributes") {
        return { attributes: src === null ? ["class", "anh"] : ["class", "anh", "src", src] };
      }
      throw new Error("method CDP không ngờ tới: " + method);
    }
  };
}
const chay = (trang, params) => runAction("input.grabUrl", { sendRaw: trang.sendRaw }, params);

// ⓐ đường thẳng: trả URL ĐẦY ĐỦ cho người gọi TRONG MÁY, và `masked` thì cắt sạch query
{
  const trang = lamTrang();
  const k = await chay(trang, { selector: "img.anh" });
  assert.equal(k.ok, true);
  assert.equal(k.data.url, URL_DAY_DU, "người gọi trong máy phải nhận URL đầy đủ, không thì tải 403");
  assert.equal(k.data.masked, "https://cdn.test/anh/v1.webp");
  assert.ok(!k.data.masked.includes("?"), "masked không được chở query");
  assert.ok(!k.data.masked.includes(CHU_KY), "masked không được chở chữ ký");
  assert.equal(k.data.attribute, "src");
  assert.ok(trang.goiCdp.some((g) => g.method === "DOM.getAttributes"), "phải đọc thuộc tính từ trang");
}

// ⓑ `src` tương đối giải theo baseURL của tài liệu, không ghép chuỗi bừa
{
  const trang = lamTrang({ src: "../tep/anh 2.webp?k=1" });
  const k = await chay(trang, { selector: "img.anh" });
  assert.equal(k.data.url, "https://trang.test/tep/anh%202.webp?k=1");
  assert.equal(k.data.masked, "https://trang.test/tep/anh%202.webp");
}

// ⓒ blob: và data: — TỪ CHỐI, và lời từ chối KHÔNG chở lại giá trị thuộc tính
for (const xau of [`blob:https://trang.test/${CHU_KY}`, `data:image/png;base64,${CHU_KY}`]) {
  const trang = lamTrang({ src: xau });
  const k = await chay(trang, { selector: "img.anh" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "URL_INVALID");
  assert.ok(!JSON.stringify(k).includes(CHU_KY), `lời báo lỗi rò chuỗi gốc: ${k.detail}`);
}

// ⓓ `javascript:` — cửa chạy mã, từ chối; và lời từ chối vẫn không chở chuỗi gốc
{
  const trang = lamTrang({ src: `javascript:void(${CHU_KY})` });
  const k = await chay(trang, { selector: "img.anh" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "URL_INVALID");
  assert.ok(!JSON.stringify(k).includes(CHU_KY), "lời báo lỗi rò chuỗi gốc");
}

/* ĐÃ BIẾT, ghi ra thay vì giả vờ không có: chữ ký nằm trong ĐƯỜNG DẪN (không phải query) thì
 * `masked` vẫn chở nó. Đúng bằng thứ lõi đọc vẫn để lọt (nó cũng chỉ cắt query), nên method này
 * KHÔNG mở thêm gì — nhưng ai đổi chính sách che thì phải đổi cả `masked` ở đây. */

// ⓔ selector khớp nhiều phần tử → từ chối, không đoán "cái đầu tiên"
{
  const k = await chay(lamTrang({ soKhop: 3 }), { selector: "img" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "SELECTOR_AMBIGUOUS");
}

// ⓕ phần tử không có thuộc tính đó → nói thẳng, không trả URL rỗng
{
  const k = await chay(lamTrang({ src: null }), { selector: "img.anh" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "ATTRIBUTE_MISSING");
}

// ⓖ chỉ hai tên thuộc tính, danh sách TRẮNG
{
  assert.deepEqual([...GRAB_ATTRIBUTES], ["src", "href"]);
  const k = await chay(lamTrang(), { selector: "img.anh", attribute: "onclick" });
  assert.equal(k.ok, false);
  assert.equal(k.code, "ATTRIBUTE_NOT_ALLOWED");
}

// ⓗ người gọi KHÔNG nhét được url vào: cửa TỪ VỰNG chặn, và chặn ở đúng chỗ người gọi đọc được
{
  const { METHOD_REGISTRY } = await import("../scripts/scouter-bridge-core.mjs");
  const muc = METHOD_REGISTRY["scout.grab"];
  assert.ok(muc, "scout.grab phải có trong bảng từ vựng");
  assert.deepEqual(Object.keys(muc.params_schema).sort(), ["attribute", "selector", "target_id"],
    "lược đồ không được có trường url: nhận địa chỉ từ ngoài là biến grab thành fetch thứ hai");
  assert.throws(
    () => muc.params_validator({ target_id: "T", selector: "img.anh", url: "https://khac.test/x.png" }),
    /unknown field/,
    "tham số lạ phải bị TỪ CHỐI ở cửa, không bị lờ đi"
  );
  assert.throws(() => muc.params_validator({ target_id: "T", selector: "img.anh", attribute: "onclick" }), /attribute/);
  assert.equal(muc.read_only, false, "grab gọi mạng: nó phải chui qua phanh ghi như scout.fetch");
}

// ⓘ `DOM.getAttributes` phải nằm trong danh sách CDP của đường ghi, và Runtime vẫn đóng
{
  assert.ok(WRITE_CDP_METHODS.includes("DOM.getAttributes"));
  assert.ok(!WRITE_CDP_METHODS.some((m) => m.startsWith("Runtime.")), "cửa chạy mã vẫn phải đóng");
  assert.ok(ACTION_NAMES.includes("input.grabUrl"));
}

// ⓙ GR9 — KHÔNG lệnh Bridge nào ánh xạ tới `input.grabUrl`
{
  const seed = fs.readFileSync(path.join(here, "..", "scripts", "scouter-seed-core.mjs"), "utf8");
  const bang = seed.slice(seed.indexOf("const ACTION_BY_METHOD"), seed.indexOf("/* Trần chống bão nạp lại"));
  assert.ok(bang.length > 40, "không đọc được bảng ACTION_BY_METHOD — phép ghim này đã chết, sửa nó");
  assert.ok(!bang.includes("grabUrl"),
    "có lệnh Bridge ánh xạ thẳng tới input.grabUrl: nó trả URL đầy đủ, nối ra dây là phát chữ ký ra ngoài");
}

// ⓚ GR7 — khối trả về của `scout.grab` không có trường `url`
{
  const seed = fs.readFileSync(path.join(here, "..", "scripts", "scouter-seed-core.mjs"), "utf8");
  const dau = seed.indexOf('async "scout.grab"(params)');
  assert.ok(dau > 0, "không tìm thấy scout.grab — phép ghim này đã chết, sửa nó");
  const than = seed.slice(dau, seed.indexOf('async "scout.reload"', dau));
  const traVe = than.slice(than.lastIndexOf("return {"));
  assert.ok(!/^\s*url:/m.test(traVe), "khối trả về của scout.grab có trường `url` — đó là cả cái lỗ S-24 sinh ra để bịt");
  assert.ok(traVe.includes("masked"), "vẫn phải trả `source.masked` để người gọi đặt được tên tệp");
}

console.log("  · scouter grab: 11 khối xanh");

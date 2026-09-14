/* Phép ghim BỀ MẶT HẸP của gói `udin-optic`.
 *
 * Gói này tách khỏi `duc-scouter` ngày 15/09 **bằng cách chép**, và Đức chốt như vậy với lý do
 * rõ: *"sau này Scouter sẽ còn thay đổi nhiều, ngoài ra UI của Udin Extension cũng sẽ bị thay
 * đổi cho phù hợp usecase"*. Một bản chép được phép trôi — nhưng **không được trôi mà không ai
 * biết**. Đó là toàn bộ việc của file này.
 *
 * Ba gói `duc-auto-*` là cái giá của việc không có file này: ba bản của một tệp, khác nhau cả
 * ba, nên mỗi lỗi phải sửa ba lần và một bản vá an toàn chỉ tới được một bản.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { METHOD_NAMES, PROTOCOL, capabilities } from "../scripts/bridge-core.mjs";
import { PROTOCOL as PROTOCOL_HOST } from "../bridge/udin-optic-host.mjs";

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const scouter = path.join(goc, "..", "..", "duc-scouter", "v0.1.0");
const doc = (...p) => fs.readFileSync(path.join(...p), "utf8");

/* ---- ⑴ TỪ VỰNG ĐÓNG Ở MƯỜI HAI LỆNH, và 12 lệnh kia KHÔNG TỒN TẠI ---------
 * "Cắt chứ không tắt" (ADR-0021 ⑵): một lệnh bị bỏ phải là lệnh KHÔNG CÓ, không phải lệnh có
 * mà đang bị chặn — cái sau thì bật lại được bằng một dòng cờ. */
{
  const DUNG = ["session.hello", "system.capabilities", "system.ping", "scout.targets",
    "scout.query", "scout.text", "scout.wait",
    "scout.click", "scout.type", "scout.clear", "scout.grab", "scout.navigate"];
  assert.deepEqual([...METHOD_NAMES].sort(), [...DUNG].sort(),
    "từ vựng đổi = đổi luật an toàn (luật gói số 4). Thêm/bớt phải hỏi Đức, không sửa lén dòng này.");

  const CAT = ["scout.page", "scout.view", "scout.tree", "scout.a11y", "scout.network", "scout.shot",
    "scout.hover", "scout.scroll", "scout.history", "scout.key", "scout.fetch", "scout.reload"];
  for (const ten of CAT) {
    assert.ok(!METHOD_NAMES.includes(ten), `\`${ten}\` phải KHÔNG TỒN TẠI ở gói này`);
  }
  /* `scout.fetch` đáng một dòng riêng: giữ nó là giữ một cửa gọi mạng tuỳ ý mà gói này KHÔNG
   * dùng — ảnh Udin nằm sau URL ký hạn giờ nên `scout.fetch` trả 403 (`S-24`, đo 14/09). */
  assert.ok(!METHOD_NAMES.includes("scout.fetch"));

  /* Bản gốc phải còn ĐỦ 24 — lệch nghĩa là ai đó cắt nhầm bên Scouter, và bảng trên thành vô nghĩa. */
  const goc24 = doc(scouter, "scripts", "scouter-bridge-core.mjs").match(/^    name: "/gm) || [];
  assert.equal(goc24.length, 24, "Scouter phải còn 24 method; đổi thì xem lại bảng CẮT ở trên");

  const c = capabilities();
  assert.equal(c.methods.filter((m) => !m.read_only).length, 5, "năm lệnh GHI: click · type · clear · grab · navigate");
  assert.equal(c.seed, "udin-optic-v0.1", "tự khai đúng tên mình — `bridge.sessions` là chỗ người ta nhìn để phân biệt");
}

/* ---- ⑵ QUYỀN HẸP HƠN SCOUTER — đây là lời hứa lớn nhất của gói -------------
 * Scouter mở `<all_urls>` vì nó dò trang bất kỳ. Udin chạm đúng MỘT trang. Nới dòng này là bỏ
 * đi lý do duy nhất khiến việc chép ~2.100 dòng máy bấm/gõ là đáng. */
{
  const mf = JSON.parse(doc(goc, "manifest.json"));
  assert.deepEqual(mf.host_permissions, ["https://vinfast.udinbv.com/*", "http://127.0.0.1/*"]);
  assert.ok(!JSON.stringify(mf.host_permissions).includes("all_urls"),
    "`<all_urls>` ở đây là xoá sạch chỗ hẹp hơn duy nhất của gói so với Scouter");
  assert.deepEqual([...mf.permissions].sort(), ["alarms", "debugger", "sidePanel", "storage"]);
  /* Phím phanh phải KHÁC Scouter: hai extension xin cùng một tổ hợp thì Chrome chỉ trao cho
   * một, và cái mất phím là cái không còn phanh lúc bảng bên đóng. */
  assert.equal(mf.commands["dung-khan"].suggested_key.default, "Ctrl+Shift+U");
  const mfScouter = JSON.parse(doc(scouter, "manifest.json"));
  assert.notEqual(mf.commands["dung-khan"].suggested_key.default,
    mfScouter.commands["dung-khan"].suggested_key.default, "trùng phím là một gói mất phanh");
}

/* ---- ⑶ HAI ĐẦU MỘT SỢI DÂY, và KHÔNG được trùng tên Scouter ---------------
 * `hnx-fetch` mất một buổi ngày 08/09 vì máy chủ nói một tên còn extension nói tên kia — cùng
 * cổng, cùng token, vẫn không nối được, triệu chứng chỉ là "im lặng". */
{
  assert.equal(PROTOCOL, "udin-optic.bridge");
  assert.equal(PROTOCOL_HOST, PROTOCOL, "extension và máy chủ phải khai CÙNG một chuỗi");
  assert.notEqual(PROTOCOL, "duc-scouter.bridge");
}

/* ---- ⑷ NĂM TỆP CHÉP TỪ SCOUTER PHẢI CÒN GIỐNG BẢN GỐC ---------------------
 * Khối này KHÔNG cấm hai bản khác nhau — nó cấm chúng khác nhau MÀ KHÔNG AI BIẾT. Muốn khác
 * thật thì khai vào `CO_Y_KHAC` kèm lý do, và lúc đó nó là một quyết định có chữ ký.
 *
 * Vì sao đúng năm tệp này: chúng là **bộ máy gắn debugger, tổng hợp phím chuột, và CÁI PHANH**
 * (trần 200 lượt mỗi lần mở khoá, mặc định TẮT, chỉ tay người bật). Một bản vá an toàn làm ở
 * Scouter phải tới được đây, và đây là sợi dây duy nhất bắt nó phải tới.
 *
 * `bridge-core.mjs` · `manifest.json` · `sidepanel.*` · `background.js` CỐ Ý không nằm ở đây:
 * chúng là chỗ gói này hẹp lại và là chỗ Đức nói UI sẽ đổi. Khối ⑴ và ⑵ canh đúng thứ đáng canh
 * ở chúng — từ vựng và quyền. */
{
  const CO_Y_KHAC = Object.create(null);   /* tên tệp → lý do. Rỗng là đúng cho tới khi có lý do thật. */
  const CAP = [
    ["scouter-engine.js", "scouter-engine.js"],
    ["scripts/scouter-probes.mjs", "scripts/scouter-probes.mjs"],
    ["scripts/scouter-actions-core.mjs", "scripts/scouter-actions-core.mjs"],
    ["scripts/scouter-seed-core.mjs", "scripts/scouter-seed-core.mjs"],
    ["scripts/scouter-transport-loopback.mjs", "scripts/scouter-transport-loopback.mjs"],
    ["scripts/scouter-journal-core.mjs", "scripts/scouter-journal-core.mjs"],
    ["bridge/file-core.mjs", "bridge/file-core.mjs"]
  ];
  const bam = (p) => createHash("sha256").update(fs.readFileSync(p)).digest("hex").slice(0, 16);

  for (const [tenDay, tenGoc] of CAP) {
    const banGoc = path.join(scouter, ...tenGoc.split("/"));
    /* Bản gốc BIẾN MẤT thì ĐỎ, không lặng lẽ bỏ qua: một phép kiểm tự tắt khi mất mỏ neo đọc y
     * hệt một phép kiểm đang chạy tốt. Scouter đổi tên tệp thì sửa bảng CẶP này. */
    assert.ok(fs.existsSync(banGoc), `không thấy bản gốc ${tenGoc} bên Scouter — sửa bảng CẶP, đừng bỏ khối này`);
    if (CO_Y_KHAC[tenDay]) continue;
    assert.equal(bam(path.join(goc, ...tenDay.split("/"))), bam(banGoc),
      `${tenDay} đã trôi khỏi bản gốc. Đồng bộ lại, HOẶC khai vào CO_Y_KHAC kèm lý do.`);
  }
}

/* ---- ⑸ TÊN GÓI PHẢI KHAI Ở LỚP NỐI DÂY, không ở trong tệp chép ------------
 * `G9`, 12/09: một chuỗi `"duc-scouter"` gõ cứng trong `transport.mjs` đi theo bản chép sang
 * `hnx-fetch` và khiến gói đó tự khai sai tên mình trên dây. */
{
  const bg = doc(goc, "background.js");
  assert.match(bg, /worker_id: "udin-optic"/, "tên gói khai ở background, không ở trong transport");
  const tp = doc(goc, "scripts", "scouter-transport-loopback.mjs").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!tp.includes("udin-optic") && !tp.includes("duc-scouter"),
    "transport là tệp CHÉP — một tên gói trong đó sẽ theo bản chép sang gói tiếp theo");
}

console.log("  · be-mat-hep: 5 khối xanh");

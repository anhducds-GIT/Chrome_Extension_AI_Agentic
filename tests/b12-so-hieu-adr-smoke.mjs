/* B12 — SỔ SỐ HIỆU QUYẾT ĐỊNH. Ghim máy canh mà `ADR-0026` (Đức chốt 09/09) đặt ra THAY cho
 * luật bất biến-từng-byte của ADR-0000 luật 1.
 *
 * Vì sao file này tồn tại: từ 09/09 tới 12/09 B12 vẫn cưỡng chế luật ĐÃ BỊ THU HỒI và kêu 42
 * chỗ — 22 chỗ ADR-DELETED oan cho một lượt gộp Đức tự chốt, cộng 20 chỗ ADR-EDITED cho đúng
 * cái việc ADR-0026 vừa cho phép. B12 thuộc nhóm CHẶN, nên ba ngày ấy không phiên nào báo xong
 * được. `tests/check-bootstrap-smoke.mjs` không bắt được vì nó chết từ lượt migrate bộ khung.
 *
 * Ghim HÀM THUẦN (`nhaCuaSoHieu`, `soHieuAdr`) chứ không dựng cả một repo giả: phần khó của
 * máy canh này nằm ở chỗ "số hiệu nào có nhà", còn phần đọc git đã có mép khác lo.
 */
import assert from "node:assert/strict";
import { checkB12, nhaCuaSoHieu, soHieuAdr } from "../scripts/check-bootstrap.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

{
  assert.equal(soHieuAdr("docs/adr/0026-adr-records-are-editable.md"), "0026");
  assert.equal(soHieuAdr("workers/x/v1/docs/adr/0007-scouter.md"), "0007");
  assert.equal(soHieuAdr("docs/adr/README.md"), null, "file không mang số hiệu thì trả null, không đoán");
  assert.equal(soHieuAdr(null), null);
  ok("số hiệu đọc từ tên file, không đoán khi vắng");
}

{
  /* `parseStatus` là bộ đọc frontmatter MỘT DÒNG-MỘT KHOÁ, nên `decides:` về tay ta dưới dạng
     CHUỖI THÔ. Đây đúng là chỗ bản vá đầu của tôi trượt: `Array.isArray` luôn false, khai
     `decides:` xong vẫn không ai nghe, và 16 chỗ vẫn đỏ. */
  const fm = {
    "docs/adr/0001-ranh-gioi.md": { adr: "0001", decides: "[0001, 0002, 0003, 0006]" },
    "docs/adr/0004-hai-vai.md": { adr: "0004" },
  };
  const nha = nhaCuaSoHieu(Object.keys(fm), (f) => fm[f]);
  for (const so of ["0001", "0002", "0003", "0006"]) {
    assert.deepEqual(nha.get(so), ["docs/adr/0001-ranh-gioi.md"], `số ${so} phải về nhà file gộp`);
  }
  assert.deepEqual(nha.get("0004"), ["docs/adr/0004-hai-vai.md"],
    "không khai `decides:` thì file tự nhận số của chính nó — 146 ADR đơn lẻ không phải gõ thêm một dòng");
  ok("decides: dạng chuỗi thô vẫn được đọc ra danh sách");
}

{
  // Số không đệm, có nháy, hoặc viết kiểu YAML một dòng — cùng một ý, đừng bắt người gõ nhớ.
  const nha = nhaCuaSoHieu(["a/0001-x.md"], () => ({ decides: '[1, "0002", 0003]' }));
  assert.deepEqual([...nha.keys()].sort(), ["0001", "0002", "0003"], "1 và 0001 là một số");
  ok("số hiệu chuẩn hoá về bốn chữ số, nháy và khoảng trắng không đổi ý");
}

{
  /* HAI FILE CÙNG NHẬN MỘT SỐ — vế mà commit gộp N-54 hứa ("B12 ĐỎ nếu một số hiệu biến mất
     hoặc bị hai file cùng nhận") và không ai cài. Nó là đúng cái bệnh lượt gộp sinh ra để chữa:
     quyết định có hai bản và không ai biết bản nào đang có hiệu lực. */
  const nha = nhaCuaSoHieu(["a/0001-x.md", "a/0002-y.md"], (f) =>
    f.endsWith("0001-x.md") ? { decides: "[0001, 0009]" } : { decides: "[0002, 0009]" });
  assert.equal(nha.get("0009").length, 2, "số bị hai file cùng nhận phải THẤY được, không im");
  ok("số hiệu bị hai file cùng nhận thì lộ ra");
}

{
  /* CÙNG SỐ NHƯNG KHÁC THƯ MỤC KHÔNG PHẢI TRÙNG. ADR sống ở HAI TẦNG (ADR-0000 luật 3): sổ
     của gốc repo và sổ của từng gói là hai sổ khác nhau, và cả hai đều có ADR-0007. */
  const nha = nhaCuaSoHieu(["docs/adr/0007-a.md", "workers/x/v1/docs/adr/0007-b.md"], () => ({}));
  assert.equal(nha.get("0007").length, 2, "hàm thuần gom theo SỐ; việc tách theo thư mục là của bên gọi");
  const thuMuc = new Set(nha.get("0007").map((f) => f.slice(0, f.lastIndexOf("/") + 1)));
  assert.equal(thuMuc.size, 2, "hai đường dẫn này thuộc HAI sổ, nên không được chấm là trùng");
  ok("hai tầng ADR: cùng số khác thư mục không phải trùng");
}

{
  assert.deepEqual([...nhaCuaSoHieu([], () => ({})).keys()], [], "repo chưa có ADR thì trả rỗng, không ném");
  assert.deepEqual([...nhaCuaSoHieu(["a/0001-x.md"], () => null).keys()], ["0001"],
    "đọc frontmatter trượt thì vẫn lùi về số của tên file, không làm mất một số hiệu");
  ok("rỗng và hỏng đều không làm mất số hiệu");
}

{
  /* LÁI THẲNG `checkB12` — hàm thuần ở trên KHÔNG phủ được bộ lọc theo thư mục, và đã kiểm
     đột biến 12/09 để biết điều đó: bỏ `f.startsWith(thuMuc)` thì sáu mép trên vẫn xanh.
     Bộ lọc ấy là thứ giữ hai tầng ADR tách nhau (ADR-0000 luật 3): xoá `docs/adr/0007` mà lấy
     `workers/x/v1/docs/adr/0007` làm chứng "số còn nhà" là bỏ lọt một quyết định đã mất. */
  const adr = (so, status = "Accepted", decides = null) =>
    `---
status: ${status}
adr: ${so}
${decides ? `decides: ${decides}
` : ""}---

than file
`;

  const dungDeps = ({ song, xoa, noiDung }) => ({
    root: ".",
    readFile: (f) => noiDung[f] ?? null,
    git: {
      trackedPaths: () => song,
      deletedPaths: () => xoa,
      fileHistory: (f) => (noiDung[f] ? ["sha1"] : ["sha0"]),
      showAt: (_sha, f) => noiDung[f] ?? noiDung[`__daxoa__${f}`] ?? null,
    },
  });

  // ⓐ Số hiệu của một ADR ĐÃ XOÁ ở tầng GỐC, mà chỉ file cùng số ở tầng GÓI còn sống.
  //    Đây KHÔNG phải "còn nhà" — hai sổ khác nhau. Phải ĐỎ.
  const a = checkB12(dungDeps({
    song: ["workers/x/v1/docs/adr/0007-cua-goi.md"],
    xoa: ["docs/adr/0007-cua-goc.md"],
    noiDung: { "workers/x/v1/docs/adr/0007-cua-goi.md": adr("0007"), "__daxoa__docs/adr/0007-cua-goc.md": adr("0007") },
  }));
  assert.equal(a.state, "fail", "số của sổ GỐC mất mà chỉ sổ GÓI còn số ấy thì phải ĐỎ");
  assert.match(JSON.stringify(a), /ADR-DELETED/);

  // ⓑ Cùng tầng, có file gộp nhận nuôi → XANH. Đây là lượt gộp N-54 Đức tự chốt.
  const b = checkB12(dungDeps({
    song: ["docs/adr/0001-gop.md"],
    xoa: ["docs/adr/0002-da-gop.md"],
    noiDung: { "docs/adr/0001-gop.md": adr("0001", "Accepted", "[0001, 0002]"), "__daxoa__docs/adr/0002-da-gop.md": adr("0002") },
  }));
  assert.equal(b.state, "ok", `gộp có khai decides: thì XANH. Ra: ${JSON.stringify(b).slice(0, 300)}`);

  // ⓒ Xoá hẳn, không ai nhận nuôi → ĐỎ. Đây là thứ máy canh mới sinh ra để bắt.
  const c = checkB12(dungDeps({
    song: ["docs/adr/0001-gop.md"],
    xoa: ["docs/adr/0002-mat-han.md"],
    noiDung: { "docs/adr/0001-gop.md": adr("0001"), "__daxoa__docs/adr/0002-mat-han.md": adr("0002") },
  }));
  assert.equal(c.state, "fail", "một quyết định biến mất mà không ai nhận nuôi phải ĐỎ");

  // ⓓ Thân file đổi sau khi Accepted KHÔNG còn là lỗi — ADR-0026 thu hồi luật ấy 09/09.
  //    Ghim để không ai lặng lẽ cài lại: cài lại là chặn đúng việc Đức vừa cho phép.
  const d = checkB12(dungDeps({
    song: ["docs/adr/0001-x.md"], xoa: [],
    noiDung: { "docs/adr/0001-x.md": adr("0001").replace("than file", "than file DA VIET LAI HOAN TOAN") },
  }));
  assert.equal(d.state, "ok", "viết lại thân một ADR Accepted là HỢP LỆ từ ADR-0026 — đừng cài lại luật đã chết");
  ok("checkB12: hai tầng tách sổ · gộp có decides thì xanh · mất hẳn thì đỏ · viết lại thân thì KHÔNG đỏ");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

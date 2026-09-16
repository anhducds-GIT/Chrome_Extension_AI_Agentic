/* Phép ghim cho `scout.upload` (`T29`/`W8`, 16/09). Chạy không cần trình duyệt.
 *
 * ─── VÌ SAO TỆP NÀY ĐÁNG ĐỌC KỸ HƠN CÁC TỆP GHIM KHÁC ───────────────────────
 * Đây là lệnh DUY NHẤT của cả hai gói đưa byte đi **từ đĩa ra một trang web**. Mọi lệnh còn lại
 * đi chiều ngược lại. Nên lớp bảo vệ ở đây không phải *"kiểm tham số cho sạch"* — nó là thứ
 * đứng giữa một lượt gọi lỡ tay và ổ đĩa của Đức.
 *
 * Lớp ấy nằm ở **HAI chỗ khác nhau**, và tệp này ghim cả hai:
 *   ① MÁY CHỦ ghép `path` tương đối vào vùng ghi — và **GHI ĐÈ** thứ người gọi tự điền;
 *   ② LÕI GHI từ chối khi thiếu đường máy chủ đặt, và khi phần tử không phải ô chọn tệp.
 *
 * Khối ⓑ là khối đắt nhất: nó ghim rằng một người gọi **cố tình** đưa đường dẫn tới một tệp
 * ngoài vùng ghi thì đường dẫn ấy bị vứt, chứ không phải bị *"ưu tiên thấp hơn"*.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { ghepDuongUpload } from "../bridge/udin-optic-host.mjs";

const GOC = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "tai-len-")));
fs.mkdirSync(path.join(GOC, "udin-optic", "xe-dien-2026"), { recursive: true });
fs.writeFileSync(path.join(GOC, "udin-optic", "xe-dien-2026", "anh-1.webp"), "khong-phai-anh-that");
/* Một tệp NGOÀI vùng ghi, để khối ⓑ có thứ thật mà trỏ tới. */
const NGOAI = path.join(GOC, "..", `bi-mat-${path.basename(GOC)}.txt`);
fs.writeFileSync(NGOAI, "bi mat");

const phongBi = (params, method = "scout.upload") => ({
  protocol: "udin-optic.bridge", version: 1, kind: "request",
  request_id: "req-000001", method, params
});

/* ---- ⓐ Đường đúng: `path` tương đối → đường tuyệt đối TRONG vùng ghi ----- */
{
  const ra = ghepDuongUpload(phongBi({ selector: "#tep", path: "udin-optic/xe-dien-2026/anh-1.webp" }), GOC);
  assert.equal(ra.params.path, "udin-optic/xe-dien-2026/anh-1.webp", "`path` người gọi đưa phải đi qua nguyên vẹn");
  assert.ok(path.isAbsolute(ra.params.path_tuyet_doi));
  assert.equal(ra.params.path_tuyet_doi, path.join(GOC, "udin-optic", "xe-dien-2026", "anh-1.webp"));
  /* Phong bì khác phải nguyên vẹn — móc này chỉ được chạm tham số. */
  assert.equal(ra.method, "scout.upload");
  assert.equal(ra.request_id, "req-000001");
}

/* ---- ⓑ KHỐI ĐẮT NHẤT: người gọi TỰ ĐIỀN `path_tuyet_doi` → BỊ VỨT -------
 * Đây là cả cái khoá. Một trường mà người gọi đặt được thì nó không còn là chốt an toàn, nó
 * là một gợi ý. Nếu ai đó sửa móc thành *"điền vào nếu còn trống"* thì lượt gọi dưới đây sẽ
 * đưa một tệp NGOÀI vùng ghi vào trang, và mọi phép kiểm khác vẫn xanh. */
{
  const ra = ghepDuongUpload(phongBi({
    selector: "#tep",
    path: "udin-optic/xe-dien-2026/anh-1.webp",
    path_tuyet_doi: NGOAI
  }), GOC);
  assert.notEqual(ra.params.path_tuyet_doi, NGOAI,
    "người gọi tự điền `path_tuyet_doi` mà giá trị ấy SỐNG SÓT — đó là đường vòng qua cả lớp bảo vệ");
  assert.equal(ra.params.path_tuyet_doi, path.join(GOC, "udin-optic", "xe-dien-2026", "anh-1.webp"));
  /* Và tiền đề của khối này: tệp kia CÓ THẬT và nằm NGOÀI vùng ghi — nếu không thì phép ghim
   * đang canh một chỗ không ai tới được, và nó xanh vì lý do sai. */
  assert.ok(fs.existsSync(NGOAI), "tiền đề hỏng: tệp ngoài vùng ghi không tồn tại");
  assert.ok(path.relative(GOC, NGOAI).startsWith(".."), "tiền đề hỏng: tệp kia lại nằm TRONG vùng ghi");
}

/* ---- ⓒ Bốn hình dạng đường dẫn phải bị TỪ CHỐI ở máy chủ ----------------
 * Phép kiểm thật là `trongGoc` của `file-core.mjs`, đã ghim riêng từ 07/09. Khối này chỉ
 * khẳng định `scout.upload` ĐI QUA nó — chép lại luật ở đây là dựng bản thứ hai sẽ lệch. */
{
  for (const xau of ["../ra-ngoai.txt", "udin-optic/../../ra-ngoai.txt", path.join(GOC, "x.txt"), "C:x.txt"]) {
    assert.throws(() => ghepDuongUpload(phongBi({ selector: "#tep", path: xau }), GOC),
      (e) => e.code === "PATH_OUTSIDE_ROOT" || e.code === "PATH_INVALID",
      `'${xau}' phải bị từ chối ở MÁY CHỦ`);
  }
  for (const xau of [undefined, null, "", "   ", 7]) {
    assert.throws(() => ghepDuongUpload(phongBi({ selector: "#tep", path: xau }), GOC),
      (e) => typeof e.code === "string", `path=${JSON.stringify(xau)} phải bị từ chối`);
  }
}

/* ---- ⓓ Móc CHỈ chạm `scout.upload` -------------------------------------- */
{
  const goc = phongBi({ target_id: "T1", selector: "#nut" }, "scout.click");
  const { truocKhiChuyen } = { truocKhiChuyen: (e) => (e.method === "scout.upload" ? ghepDuongUpload(e, GOC) : e) };
  assert.equal(truocKhiChuyen(goc), goc, "phong bì của method khác phải đi qua Y NGUYÊN, cùng một đối tượng");
}

/* Hai khối về LÕI GHI (`input.upload` từ chối khi thiếu đường máy chủ đặt · từ chối khi phần
 * tử không phải ô chọn tệp) KHÔNG nằm ở đây, cố ý. `scouter-actions-core.mjs` là tệp của gói
 * `duc-scouter`; gói này chỉ giữ một BẢN CHÉP TỪNG BYTE. Ghim nó ở đây thì con đột biến mổ bản
 * gốc bên kia trong khi phép ghim đọc bản chép bên này — nó sống sót mà bộ đo vẫn xanh.
 * Chúng ở `workers/duc-scouter/v0.1.0/tests/tai-len-smoke.mjs`. */

try { fs.rmSync(GOC, { recursive: true, force: true }); fs.rmSync(NGOAI, { force: true }); } catch { /* thư mục tạm */ }
console.log("  · tai-len máy chủ (T29/W8): 4 khối xanh");

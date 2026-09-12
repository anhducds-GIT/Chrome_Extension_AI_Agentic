/* PHÉP GHIM CHO KHOÁ MỨC FILE — giữ ngắn, trả ngay.
 *
 * Đức chốt 2026-09-08: *"AI Assistant chỉ giữ khóa đúng ở file mà AI đó đang sửa … Nếu chỉ đọc
 * ko cần giữ khóa."* Cơ chế chạy thật ở một repo TIÊU THỤ trước, rồi mang lên đây — nơi
 * phát hành — để mọi repo cùng có. (Tên repo đó cố ý không nêu: bản trích đi tới repo của người
 * khác, và tên riêng của một repo nguồn trong đó là nhiễu.)
 *
 * ĐO Ở CHÍNH REPO NÀY, không mượn số của họ (7 ngày · 384 commit · 381 có nhãn `Lane:` · 41 lane):
 *   620 cặp commit khác lane, cách nhau <= 1h, CÙNG VÙNG
 *   ├ 265 (43%) dùng chung ít nhất một FILE  → khoá file KHÔNG gỡ được
 *   └ 355 (57%) khác file hoàn toàn          → khoá file GỠ ĐƯỢC
 *   file/commit: trung vị 3 · p90 12 · p99 30 · max 42
 *
 * Đây là cơ chế ĐA PHIÊN, nên `MULTIFLOW.md` mục 5 bắt phải có đột biến kiểm. Danh sách đột
 * biến đã chạy nằm ở CUỐI file.
 *
 * MỌI VẾ Ở ĐÂY DÙNG HÀM THUẦN, không chạm đĩa — nên chúng chạy ở repo nào cũng được, kể cả repo
 * vừa dựng chưa có bảng quyền. Đó là chủ ý: ba lần trong ngày 08/09 một phép ghim viết ở nơi
 * phát hành đã đỏ oan ở repo tiêu thụ vì nó soi thứ chỉ nơi phát hành mới có.
 */

import assert from "node:assert/strict";

import { readFileSync } from "node:fs";

import {
  chuanDuongDan, EXIT, khoaFileQuaHan, khoaFileTrongVung, MIEN_KHOA,
  PHUT_NHAC_KHOA_FILE, quyetDinhSua, quyetDinhXong, soatDanHang,
  FINGERPRINT_FIELD, claimsFingerprint, fingerprintState,
} from "../scripts/claim.mjs";
import { generatedFrom } from "../scripts/repo-structure.mjs";

let so = 0;
const ok = (t) => { so += 1; console.log(`  ok  ${t}`); };
const LUC = "2026-09-08T10:00:00.000Z";
// Bản đồ vùng giả, đủ đơn giản để đọc: mọi thứ dưới `scripts/` và `tests/` là `_code`.
const vungCua = (d) => (d.startsWith("scripts/") || d.startsWith("tests/") ? "_code" : "_root");

/* ---- 1. Nhận và trả một khoá file --------------------------------------- */
{
  const trong = { claims: {}, tam: {} };
  const a = quyetDinhSua(trong, { duongDan: "scripts/x.mjs", as: "lane-a", luc: LUC, vungCua });
  assert.equal(a.code, EXIT.OK);
  assert.deepEqual(a.next["scripts/x.mjs"], { owner: "lane-a", luc: LUC });

  // Nhận lại chính file mình đang giữ: KHÔNG phải lỗi. Một lượt sửa dài có thể gọi hai lần, và
  // bắt nó đỏ là dạy người ta bỏ qua lệnh.
  const lai = quyetDinhSua({ claims: {}, tam: a.next }, { duongDan: "scripts/x.mjs", as: "lane-a", luc: LUC, vungCua });
  assert.equal(lai.code, EXIT.OK);
  assert.equal(lai.already, true);

  const b = quyetDinhXong({ claims: {}, tam: a.next }, { duongDan: "scripts/x.mjs", as: "lane-a" });
  assert.equal(b.code, EXIT.OK);
  /* XOÁ HÀNG, không để `owner: null`. Khoá file là tạm; giữ hàng trống thì sau một ngày bảng
     đầy xác đường dẫn và không ai đọc nổi nó. Đây là chỗ khác hẳn khoá VÙNG — khoá vùng giữ
     hàng vì hàng đó khai một vùng có thật, tồn tại cả khi vô chủ. */
  assert.ok(!Object.hasOwn(b.next, "scripts/x.mjs"), "tra khoa file thi XOA HANG, khong de owner: null");
  assert.deepEqual(Object.keys(b.next), []);
  ok("1 · nhận · nhận lại không lỗi · trả thì XOÁ HÀNG chứ không để vỏ rỗng");
}

/* ---- 2. Không giành, không trả hộ --------------------------------------- */
{
  const bang = { claims: {}, tam: { "scripts/x.mjs": { owner: "lane-a", luc: LUC } } };
  const gianh = quyetDinhSua(bang, { duongDan: "scripts/x.mjs", as: "lane-b", luc: LUC, vungCua });
  assert.equal(gianh.code, EXIT.REFUSED);
  assert.match(gianh.message, /TU_CHOI_SUA/);
  assert.match(gianh.message, /lane-a/, "phai NEU TEN ai dang giu — khong noi ten thi khong biet hoi ai");

  const traHo = quyetDinhXong(bang, { duongDan: "scripts/x.mjs", as: "lane-b" });
  assert.equal(traHo.code, EXIT.REFUSED);
  assert.match(traHo.message, /KHÔNG trả hộ/);

  // Trả một file KHÔNG ai giữ: không phải lỗi. `--xong --het` gọi hàng loạt, và một cái đã trả
  // rồi không được làm hỏng cả mẻ.
  const traTrong = quyetDinhXong({ claims: {}, tam: {} }, { duongDan: "scripts/y.mjs", as: "lane-b" });
  assert.equal(traTrong.code, EXIT.OK);
  ok("2 · không giành file người khác · không trả hộ · trả file không ai giữ thì im lặng cho qua");
}

/* ---- 3. CHỨA NHAU HAI CHIỀU — thiếu một chiều là hai lane cùng tin mình đúng --- */
{
  /* Chiều MỘT: vùng có chủ khác → khoá file bị từ chối. Giữ cả vùng nghĩa là được ghi mọi file
     trong đó; khoá file không chen vào giữa được. */
  const coChuVung = { claims: { _code: { owner: "lane-a" } }, tam: {} };
  const c1 = quyetDinhSua(coChuVung, { duongDan: "scripts/x.mjs", as: "lane-b", luc: LUC, vungCua });
  assert.equal(c1.code, EXIT.REFUSED);
  assert.match(c1.message, /nằm trong vùng "_code"/);
  // Nhưng CHÍNH CHỦ vùng thì khoá file được — không thì người giữ vùng tự chặn mình.
  assert.equal(quyetDinhSua(coChuVung, { duongDan: "scripts/x.mjs", as: "lane-a", luc: LUC, vungCua }).code, EXIT.OK);

  /* Chiều HAI: bên trong vùng còn khoá file của người khác → nhận cả vùng bị từ chối. */
  const coKhoaFile = { claims: {}, tam: { "scripts/x.mjs": { owner: "lane-a", luc: LUC }, "README.md": { owner: "lane-a", luc: LUC } } };
  const vuong = khoaFileTrongVung(coKhoaFile, "_code", "lane-b", vungCua);
  assert.deepEqual(vuong, [{ duongDan: "scripts/x.mjs", owner: "lane-a" }],
    "chi ke file TRONG vung do — README.md thuoc _root, khong duoc keo vao");
  // Khoá của CHÍNH MÌNH không chặn mình nhận cả vùng.
  assert.deepEqual(khoaFileTrongVung(coKhoaFile, "_code", "lane-a", vungCua), []);
  ok("3 · chứa nhau HAI chiều: vùng chặn file · file chặn vùng · và chính chủ không tự chặn mình");
}

/* ---- 4. Quá hạn thì NÊU TÊN, tuyệt đối không tự nhả --------------------- */
{
  const now = Date.parse("2026-09-08T11:00:00.000Z");           // một tiếng sau LUC
  const bang = { claims: {}, tam: {
    "scripts/cu.mjs": { owner: "lane-a", luc: LUC },              // 60 phút
    "scripts/moi.mjs": { owner: "lane-a", luc: "2026-09-08T10:55:00.000Z" }, // 5 phút
    "scripts/hong.mjs": { owner: "lane-a", luc: "khong-phai-moc" },
  } };
  const qua = khoaFileQuaHan(bang, PHUT_NHAC_KHOA_FILE, now);
  assert.deepEqual(qua.map((x) => x.duongDan), ["scripts/cu.mjs"]);
  assert.equal(qua[0].phut, 60);
  /* MỐC ĐỌC KHÔNG RA thì KHÔNG nêu — đoán bừa một con số còn tệ hơn im lặng. Repo tiêu thụ vấp
     đúng chỗ này theo hướng ngược: mốc của họ thiếu chữ `Z`, `Date.parse` trần đọc thành giờ
     địa phương, và một khoá vừa nhận 1 phút bị báo "420 phút — quên trả?". Một cái ⚠ sai vài
     lần thì lần thứ ba không ai nhìn nữa. */
  assert.ok(!qua.some((x) => x.duongDan === "scripts/hong.mjs"), "moc doc khong ra thi KHONG neu, khong doan");

  /* VÀ HÀM NÀY KHÔNG ĐƯỢC ĐỘNG VÀO BẢNG. Tự nhả là tự động hoá đúng vụ nhả-khoá-hộ 06/09 —
     lần đó một người làm, và một lane mất phần đã xong; nếu máy làm thì không ai kịp thấy. */
  assert.equal(Object.keys(bang.tam).length, 3, "khoaFileQuaHan chi DOC — no khong duoc nha bat cu thu gi");
  ok(`4 · quá ${PHUT_NHAC_KHOA_FILE} phút thì nêu tên · mốc hỏng thì im · và KHÔNG tự nhả`);
}

/* ---- 5. Soát file đã dàn — thứ khoá file KHÔNG chữa được ---------------- */
{
  /* Khoá không giữ file, GIT giữ. Hai lane chung một cây làm việc nên `git commit -a` vẫn cuốn
     file lane khác vừa dàn. Khoá vùng trước đây SERIAL HOÁ hai lane nên lỗi đó ít có dịp nổ;
     khoá file bỏ đúng sự serial hoá ấy, nên nó nổ DÀY HƠN. Đây là thứ mua lại. */
  const chung = {
    tam: { "scripts/cua-toi.mjs": { owner: "toi", luc: LUC } },
    claims: { _root: { owner: "nguoi-khac" } },
    as: "toi",
    mienKhoa: MIEN_KHOA,
    maySinh: ["DASHBOARD.md", ".agents/claims.json"],
    vungCua,
  };
  const kq = soatDanHang({ ...chung, daDan: [
    "scripts/cua-toi.mjs",   // tôi khoá → im
    "scripts/la.mjs",        // không khoá, vùng _code vô chủ → LẠ
    "README.md",             // vùng _root do người khác giữ → LẠ
    "HANDOFF.md",            // sổ miễn khoá → nêu tên, không chặn
    "DASHBOARD.md",          // artifact máy sinh → bỏ qua HẲN
    ".agents/claims.json",   // hành chính → bỏ qua HẲN
  ] });
  assert.deepEqual(kq.la.map((x) => x.duongDan), ["scripts/la.mjs", "README.md"]);
  assert.deepEqual(kq.soChung, ["HANDOFF.md"]);
  /* ARTIFACT MÁY SINH PHẢI ĐI QUA IM LẶNG. Bỏ sót danh sách này làm phép soát BÁO OAN ngay lượt
     dùng thật đầu tiên ở repo tiêu thụ (08/09): nó chặn ba artifact mà luật khai rõ là KHÔNG đòi
     khoá nào — không có gì của ai trong đó để mất, chạy lại bộ sinh là ra y hệt. Một cỗ máy dựng
     ra để chống chặn oan mà tự chặn oan thì nó bị bỏ qua trong một ngày. */
  assert.ok(!kq.la.some((x) => x.duongDan === "DASHBOARD.md"), "artifact may sinh KHONG duoc bao oan");
  assert.ok(!kq.soChung.includes("DASHBOARD.md"), "artifact may sinh cung khong duoc neu ten — no khong phai so");

  // Giữ CẢ VÙNG thì mọi file trong vùng đều im.
  const giuVung = soatDanHang({ ...chung, claims: { _code: { owner: "toi" } }, daDan: ["scripts/la.mjs"] });
  assert.deepEqual(giuVung.la, []);
  ok("5 · soát: file lạ NÊU · sổ miễn khoá nêu-không-chặn · artifact máy sinh im · giữ cả vùng thì im");
}

/* ---- 5b. Artifact MÁY SINH không đòi khoá nào -------------------------- */
{
  /* LỖ ĐO ĐƯỢC NGAY LƯỢT DÙNG THẬT ĐẦU TIÊN, 08/09, hai lane cùng chạy: lane kia giữ `_root`, và
   * `--sua DASHBOARD-*.html` của tôi bị từ chối vì bảng đó nằm trong `_root` — trong khi chính
   * luật của repo khai nó ở khối `generated` với câu *"nội dung tất định từ HEAD nên không ai sở
   * hữu chúng theo nghĩa nào"*.
   *
   * Đó là **chặn oan**, đúng thứ khoá mức file sinh ra để bỏ. Và nó lộ ra một hình dạng lỗi đáng
   * ghim hơn bản thân ca này: `--soat` miễn nhóm máy sinh từ đầu, `--sua` thì quên — **hai cửa
   * của cùng một cơ chế nói hai điều khác nhau**. Vế này giữ hai cửa nói cùng một câu. */
  const vungCoChu = { claims: { _root: { owner: "lane-khac" } }, tam: {} };
  const laMaySinh = (d) => d === "DASHBOARD.md";

  // Không khai `laMaySinh` → vẫn bị vùng chặn. Đây là hành vi ĐÚNG cho file thường.
  assert.equal(quyetDinhSua(vungCoChu, { duongDan: "DASHBOARD.md", as: "toi", luc: LUC, vungCua }).code,
    EXIT.REFUSED, "file thuong trong vung nguoi khac giu thi van phai bi tu choi");

  // Khai rồi → đi qua, và KHÔNG ghi một hàng nào vào bảng.
  const r = quyetDinhSua(vungCoChu, { duongDan: "DASHBOARD.md", as: "toi", luc: LUC, vungCua, laMaySinh });
  assert.equal(r.code, EXIT.OK);
  assert.equal(r.maySinh, true, "phai NOI RA rang no duoc bo qua vi la artifact may sinh");
  assert.deepEqual(Object.keys(r.next), [],
    "khong duoc ghi hang nao — no khong phai khoa, va mot hang khong ai tra la rac vinh vien");

  // Và `--soat` phải nói y hệt: cùng một file, cùng một câu trả lời.
  const soat = soatDanHang({
    daDan: ["DASHBOARD.md"], tam: {}, claims: { _root: { owner: "lane-khac" } },
    as: "toi", mienKhoa: MIEN_KHOA, maySinh: ["DASHBOARD.md"], vungCua,
  });
  assert.deepEqual(soat.la, [], "hai cua cua mot co che phai noi cung mot dieu ve cung mot file");
  ok("5b · artifact máy sinh: `--sua` bỏ qua không ghi hàng · `--soat` cũng im · hai cửa nói cùng một câu");
}

/* ---- 6. Chuẩn hoá đường dẫn và cửa từ chối đường dẫn lạ ----------------- */
{
  assert.equal(chuanDuongDan("./scripts/x.mjs"), "scripts/x.mjs");
  assert.equal(chuanDuongDan("scripts\\x.mjs"), "scripts/x.mjs", "gach nguoc cua Windows phai ve gach xuoi");
  assert.equal(chuanDuongDan("  scripts/x.mjs/  "), "scripts/x.mjs");
  for (const la of ["", "   ", "../ngoai.md", "a/../../b"]) {
    const r = quyetDinhSua({ claims: {}, tam: {} }, { duongDan: la, as: "x", luc: LUC, vungCua });
    assert.equal(r.code, EXIT.MISUSE, `duong dan la phai bi tu choi: ${JSON.stringify(la)}`);
  }
  /* `..` chỉ bị cấm khi nó là MỘT ĐOẠN đường dẫn. Cấm theo chuỗi con thì một thư mục tên hợp lệ
     như `docs/a..b/` cũng bị chặn — chặn oan, và chặn oan thì người ta đi vòng qua lệnh. */
  assert.equal(quyetDinhSua({ claims: {}, tam: {} }, { duongDan: "docs/a..b/c.md", as: "x", luc: LUC, vungCua }).code,
    EXIT.OK, "hai cham GIUA ten thu muc khong phai la di ra ngoai repo");
  ok("6 · chuẩn hoá đường dẫn · rỗng và `..` bị từ chối · nhưng `a..b` thì không bị chặn oan");
}

/* BỐN ĐỘT BIẾN ĐÃ CHẠY THẬT trên máy, cả bốn bị bắt (bộ ghim này + cổng đóng phiên):
 *
 *  1. `quyetDinhXong` đặt `owner: null` thay vì xoá hàng          → vế 1 đỏ
 *  2. bỏ chiều MỘT (không xét chủ vùng trong `quyetDinhSua`)      → vế 3 đỏ
 *  3. bỏ chiều HAI (`khoaFileTrongVung` luôn trả `[]`)            → vế 3 đỏ
 *  4. `khoaFileQuaHan` tự `delete` khoá quá hạn                   → vế 4 đỏ
 *  5. bỏ vế miễn artifact máy sinh khỏi `quyetDinhSua`             → vế 5b đỏ
 *  6. `quyetDinhSua` GHI một hàng cho artifact máy sinh            → vế 5b đỏ
 *  7. bỏ vế miễn artifact máy sinh khỏi phép lọc của `--take`      → vế 5c đỏ
 *
 * Và HAI cửa chạy thật ở repo này, không phải hàm thuần:
 *  · lane khác `--take _code` khi tôi đang khoá 2 file bên trong  → TU_CHOI_NHAN_VUNG
 *  · còn treo một khoá file lúc chạy cổng                          → mục "Khoá file đã trả hết" ĐỎ
 */

/* ---- 5c. BA CỬA phải nói CÙNG một câu về artifact máy sinh -------------- */
{
  /* Đo 09/09, hai lần trong một ngày, cùng một hình dạng:
   *   · `--sua DASHBOARD-*.html` bị từ chối vì bảng nằm trong vùng người khác giữ  → đã vá (5b)
   *   · `--take _root` bị từ chối vì `DASHBOARD-*.html` "đang sửa dở"              → vế này
   *
   * Cả hai lần đều là **chặn oan**, và cả hai lần lý do giống hệt: luật khai artifact máy sinh
   * KHÔNG AI sở hữu (nội dung tất định từ HEAD), nhưng chỉ `--soat` biết điều đó. Ca thứ hai
   * chặn đúng lúc Đức đã chốt chuyển vùng — tức một lớp bảo vệ đứng chắn một quyết định của
   * người chốt, vì một file mà chính lệnh sinh lại mỗi lượt.
   *
   * Vế này không đo một cửa; nó đo **sự ĐỒNG Ý giữa ba cửa**. Hai cửa nói khác nhau về cùng một
   * file là chỗ người ta thôi tin cả ba. */
  const cauTrucGia = { generated: ["DASHBOARD.md", "llms.txt"] };
  const maySinh = new Set([...generatedFrom(cauTrucGia), ".agents/claims.json"]);
  const laMaySinh = (d) => maySinh.has(d);

  // CỬA 1 — `--soat`: bỏ qua hẳn, không nêu tên.
  const soat = soatDanHang({
    daDan: ["DASHBOARD.md"], tam: {}, claims: { _root: { owner: "lane-khac" } },
    as: "toi", mienKhoa: MIEN_KHOA, maySinh: [...maySinh], vungCua,
  });
  assert.deepEqual(soat.la, [], "cua --soat: artifact may sinh khong duoc bao la file la");

  // CỬA 2 — `--sua`: đi qua, và KHÔNG ghi hàng nào.
  const sua = quyetDinhSua({ claims: { _root: { owner: "lane-khac" } }, tam: {} },
    { duongDan: "DASHBOARD.md", as: "toi", luc: LUC, vungCua, laMaySinh });
  assert.equal(sua.code, EXIT.OK, "cua --sua: artifact may sinh khong doi khoa nao");
  assert.deepEqual(Object.keys(sua.next), [], "va khong duoc ghi mot hang nao");

  /* CỬA 3 — `--take`: phép lọc "file đang sửa dở" phải BỎ artifact máy sinh ra.
   * Đây là hàm thuần hoá của đúng phép lọc trong `main()`, nên nó ghim được LUẬT mà không cần
   * dựng một kho git thật. Đổi luật ở `main()` mà quên chỗ này thì vế dưới đỏ. */
  const nguon = readFileSync(new URL("../scripts/claim.mjs", import.meta.url), "utf8");
  assert.match(nguon, /generatedFrom\(cauTruc\)\)\.has\(f\)/,
    "phep loc 'file dang sua do' cua --take phai bo artifact may sinh ra — neu khong, mot lenh"
    + " sinh lai bang moi luot se tu chan chinh minh, va no da chan that mot quyet dinh cua nguoi chot");
  ok("5c · ba cửa (--soat · --sua · --take) nói CÙNG một câu về artifact máy sinh");
}

/* ---- 6. DẤU NIÊM PHONG bảng quyền ---------------------------------------------
 *
 * Luật mục 1 viết "nhận và trả BẰNG LỆNH, không sửa tay" từ lâu, mà KHÔNG gì cưỡng chế.
 * Kéo lớp này về từ repo tiêu thụ 09/09, nơi nó đã trả giá thật: bốn khoá gốc bị đổi chủ
 * bằng một lượt sửa hàng loạt đi vòng qua lệnh, phiên đang giữ khoá không hề biết.
 *
 * FIXTURE PHẢI DỰNG NỔI CA HỎNG (luật vàng 2): mỗi vế dưới đây có một ca ĐỎ THẬT, không chỉ
 * ca xanh. Một phép kiểm không phân biệt được hai nhánh là đồ trang trí, dù nó xanh. */
{
  const banGoc = { claims: { _root: { owner: "lane-a" }, _docs: { owner: null } } };

  // 6a — ba trạng thái, KHÔNG gộp: chưa đóng dấu ≠ dấu nguyên ≠ dấu vỡ.
  assert.equal(fingerprintState(banGoc).ok, null, "bang chua co dau thi tra null, khong duoc tra true");

  const daDong = { ...banGoc, [FINGERPRINT_FIELD]: claimsFingerprint(banGoc.claims, banGoc.tam) };
  assert.equal(fingerprintState(daDong).ok, true, "vua dong dau xong thi dau phai con nguyen");

  const suaTay = JSON.parse(JSON.stringify(daDong));
  suaTay.claims._root.owner = "ke-la-mat";
  assert.equal(fingerprintState(suaTay).ok, false, "CA DO THAT: sua tay chu khoa PHAI lam vo dau");
  ok("6a · ba trạng thái dấu niêm phong: chưa đóng · còn nguyên · ĐÃ VỠ — ca đỏ dựng được");

  /* 6b — THỨ TỰ KHOÁ KHÔNG ĐƯỢC ĐỔI DẤU. Nếu băm theo `JSON.stringify` thẳng thì một lượt
     ghi lại cùng nội dung nhưng khác thứ tự khoá sẽ báo VỠ oan, và người ta sẽ tắt phép kiểm. */
  const daoThuTu = { claims: { _docs: { owner: null }, _root: { owner: "lane-a" } } };
  assert.equal(claimsFingerprint(daoThuTu.claims), claimsFingerprint(banGoc.claims),
    "dao thu tu khoa ma dau doi la bao oan — se bi tat");

  /* 6c — KHỐI `tam` RỖNG PHẢI BĂM Y HỆT KHI KHÔNG CÓ `tam`. Đây là chỗ dễ sai nhất: băm
     thẳng {claims, tam} là đổi dấu của MỌI bảng đang tồn tại, nên ngay lượt sau mọi phiên
     khác thấy DAU_VO và cổng của họ đỏ vì một cải tiến họ không liên quan. */
  assert.equal(claimsFingerprint(banGoc.claims, {}), claimsFingerprint(banGoc.claims, undefined),
    "khoi `tam` rong phai bam y het khi khong co `tam`");
  assert.notEqual(claimsFingerprint(banGoc.claims, { "a.md": { owner: "x" } }), claimsFingerprint(banGoc.claims),
    "CA DO THAT: co khoa file that thi dau PHAI khac");
  ok("6b/6c · dấu ổn định theo NỘI DUNG: đảo thứ tự không đổi, `tam` rỗng không đổi, `tam` thật thì đổi");

  /* 6d — MỌI ĐƯỜNG GHI PHẢI ĐI QUA `ghiBang`. Một nhánh ghi thẳng `writeFileSync(CLAIMS_FILE…)`
     là một nhánh sinh ra bảng VỠ DẤU, và phiên sau lãnh đủ — cổng đỏ mà không ai sửa tay cả.
     Đo bằng sự VẮNG MẶT trong nguồn, vì đó là thứ duy nhất đo được mà không dựng repo thật. */
  const nguonKhoa = readFileSync(new URL("../scripts/claim.mjs", import.meta.url), "utf8");
  const ghiThang = nguonKhoa.split(String.fromCharCode(10))
    .filter((d) => /writeFileSync\(\s*CLAIMS_FILE/.test(d));
  assert.deepEqual(ghiThang, [],
    "co nhanh ghi THANG vao CLAIMS_FILE, khong qua ghiBang() — nhanh do se sinh bang vo dau:"
    + String.fromCharCode(10) + ghiThang.join(String.fromCharCode(10)));
  assert.match(nguonKhoa, /export function ghiBang\(/, "phai co duong ghi duy nhat ten ghiBang");

  // ĐỐI CHỨNG DƯƠNG: phép lọc trên phải BẮT được một dòng ghi thẳng. Không có vế này thì
  // regex hỏng cũng cho "khong thay gi" và vế trên xanh vĩnh viễn.
  const gia = ['fs.writeFileSync(CLAIMS_FILE, "x", "utf8");', "ghiBang(parsed);"];
  assert.deepEqual(gia.filter((d) => /writeFileSync\(\s*CLAIMS_FILE/.test(d)),
    ['fs.writeFileSync(CLAIMS_FILE, "x", "utf8");'], "phep loc phai bat dung dong ghi thang");
  ok("6d · một đường ghi DUY NHẤT: không nhánh nào ghi thẳng vào bảng quyền");

  /* 6e — `--restamp` KHÔNG được là cửa sau. Sửa tay → restamp → dấu hợp lệ là hợp thức hoá
     đúng việc luật mục 1 cấm. Nên nó phải đối chiếu HEAD và đòi câu chốt của Đức khi lượt
     sửa đó CHUYỂN CHỦ một khoá. Đo trên nguồn: cả ba mảnh phải có mặt. */
  assert.match(nguonKhoa, /chuTheoHead/, "restamp phai doi chieu voi HEAD, khong tin file tren dia");
  assert.match(nguonKhoa, /duc-duyet/, "restamp phai doi cau chot khi CHUYEN CHU");
  assert.match(nguonKhoa, /_chuyen_khoa/, "cau chot phai duoc ghi VAO bang — phien vua mat khoa chi doc bang");
  ok("6e · `--restamp` không phải cửa sau: đối chiếu HEAD · đòi câu chốt · ghi vào bảng");
}

/* ---- 7. Gỡ hộ một khoá file BỎ QUÊN — cửa mới 12/09 ---------------------- */
/* Khoá mức FILE tự khai là "giữ VÀI PHÚT". Đo 12/09: một khoá `HANDOFF.md` treo 58 TIẾNG, và
   luật chiều hai làm nó chặn luôn cả vùng bao ngoài (`_root`). Trước hôm nay KHÔNG lệnh nào gỡ
   được: khoá VÙNG của người khác thì `--take --duc-duyet` giành được, khoá FILE thì không có
   cửa nào. Đó là một lỗ, không phải một sự nghiêm khắc — và nó khoá một phần tư repo.
   Vẫn đòi CÂU CHỐT chứ không mở theo thời gian: một cái hạn tự động là lời mời ngồi đợi cho
   hết giờ rồi lấy, và lần đó sẽ đúng vào phiên đang ghi dở thật. */
{
  const bang = { claims: {}, tam: { "a.md": { owner: "p2", luc: LUC } } };

  const khongChot = quyetDinhXong(bang, { duongDan: "a.md", as: "p1" });
  assert.equal(khongChot.code, EXIT.REFUSED, "không có câu chốt thì VẪN từ chối — mặc định không đổi");
  assert.match(khongChot.message, /--duc-duyet/, "lời từ chối phải chỉ ra đúng cửa đi tiếp");

  // Câu chốt phải là một câu THẬT. Một chuỗi ngắn là cách đi vòng qua luật bằng một ký tự.
  for (const xau of ["", "   ", "ok", "Duc ok"]) {
    assert.equal(quyetDinhXong(bang, { duongDan: "a.md", as: "p1", ducDuyet: xau }).code, EXIT.REFUSED,
      `câu chốt quá ngắn (${JSON.stringify(xau)}) không được tính là duyệt`);
  }

  const chot = "Duc chot 2026-09-12: go khoa bo quen cua harness-loi-01";
  const go = quyetDinhXong(bang, { duongDan: "a.md", as: "p1", ducDuyet: chot });
  assert.equal(go.code, EXIT.OK);
  assert.deepEqual(go.next, {}, "gỡ xong thì HÀNG BỊ XOÁ hẳn, không để lại xác đường dẫn");
  assert.deepEqual(go.goHo, { duongDan: "a.md", cua: "p2", chot },
    "phải trả về ai vừa bị gỡ và vì sao — lệnh in ra để phiên kia còn được báo");
  assert.deepEqual(bang.tam, { "a.md": { owner: "p2", luc: LUC } }, "không được sửa bảng gốc tại chỗ");

  // Cửa này CHỈ mở cho khoá của NGƯỜI KHÁC. Khoá của chính mình vẫn trả bình thường, không câu
  // chốt nào — nếu không thì mọi lượt `--xong --het` hàng ngày đều đòi duyệt.
  const cuaMinh = quyetDinhXong({ claims: {}, tam: { "b.md": { owner: "p1", luc: LUC } } }, { duongDan: "b.md", as: "p1" });
  assert.equal(cuaMinh.code, EXIT.OK);
  assert.equal(cuaMinh.goHo, undefined, "trả khoá của chính mình KHÔNG phải gỡ hộ");

  // Và ĐƯỜNG DÂY: nhánh CLI phải thật sự chuyển cờ xuống, không chỉ khai trong hàm thuần.
  const nguonCli = readFileSync(new URL("../scripts/claim.mjs", import.meta.url), "utf8");
  assert.match(nguonCli, /ducDuyet: flag\("duc-duyet"\)/,
    "nhánh --xong của CLI phải chuyển --duc-duyet xuống, nếu không thì cửa mới không với tới được");
  assert.match(nguonCli, /GỠ HỘ: /, "gỡ hộ phải IN RA — một dòng lặng lẽ là cách phiên kia không bao giờ biết");
  ok("7 · khoá file bỏ quên: gỡ được bằng câu chốt của Đức, và CHỈ bằng câu chốt");
}

console.log(`khoa-file: ${so} vế xanh`);

/* Test ghim cho lệnh nhận/trả quyền (A1).
 *
 * Phép quan trọng nhất là hai phép TỪ CHỐI. Cả hai đều bảo vệ một phiên khác đang làm dở, và
 * cả hai đều dễ hỏng âm thầm: một lệnh "cứ ghi" vẫn chạy trơn, chỉ có phiên bị mất quyền là
 * không biết gì. Đó chính là chuyện đã xảy ra ngày 02/09.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ageHours, ageLabel, claimsFingerprint, decide, EXIT, FINGERPRINT_FIELD, fingerprintState, GIO_NHAC, khoaBiDoiChu, readClaims } from "../scripts/claim.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const CLAIMS = () => ({
  "_root": { owner: "phien-A", ai: "Claude", task: "dang sua audit K1", released_at: null },
  "_docs": { owner: null, ai: null, task: "", released_at: "2026-09-01" },
  "workers/goi-b": { owner: null, ai: null, task: "", released_at: null }
});

/* ---- 1. Bốn nhánh quyết định ---- */
{
  const c = CLAIMS();
  assert.equal(decide(c, { action: "take", key: "_docs", as: "phien-B", today: "2026-09-02" }).code, EXIT.OK,
    "goi trong thi cho nhan");
  assert.equal(decide(c, { action: "take", key: "_root", as: "phien-A", today: "x" }).code, EXIT.OK,
    "nhan lai goi cua CHINH MINH khong phai loi — chay lai lenh phai an toan");
  assert.equal(decide(c, { action: "release", key: "_root", as: "phien-A", today: "x" }).code, EXIT.OK,
    "tra quyen cua chinh minh thi cho");
  assert.equal(decide(c, { action: "release", key: "workers/goi-b", as: "phien-B", today: "x" }).code, EXIT.OK,
    "tra mot goi von da trong khong phai loi");
  ok("bon nhanh hop le: nhan goi trong, nhan lai goi minh, tra goi minh, tra goi da trong");
}

/* ---- 2. HAI PHÉP TỪ CHỐI — lý do file này tồn tại ---- */
{
  const c = CLAIMS();
  const cuop = decide(c, { action: "take", key: "_root", as: "phien-B", today: "x" });
  assert.equal(cuop.code, EXIT.REFUSED, "nhan goi phien khac dang giu phai TU CHOI");
  assert.match(cuop.message, /phien-A/, "thong bao phai noi RO ai dang giu");
  assert.match(cuop.message, /dang sua audit K1/, "phai in ghi chu cua ho — de nguoi doc biet ho dang lam gi");

  const traHo = decide(c, { action: "release", key: "_root", as: "phien-B", today: "x" });
  assert.equal(traHo.code, EXIT.REFUSED, "tra quyen HO nguoi khac phai TU CHOI");
  assert.match(traHo.message, /KHÔNG trả quyền hộ/, "phai noi ro vi sao khong duoc tra ho");

  // Và quan trọng: TỪ CHỐI thì KHÔNG ĐƯỢC trả về `next` — có `next` là nơi gọi có thể vô tình ghi.
  assert.equal(cuop.next, undefined, "tu choi thi khong duoc kem du lieu de ghi");
  assert.equal(traHo.next, undefined, "tu choi thi khong duoc kem du lieu de ghi");
  ok("HAI PHEP TU CHOI: khong cuop goi nguoi khac, khong tra quyen ho — va tu choi thi khong kem du lieu ghi");
}

/* ---- 3. Khoá bịa ra thì báo dùng sai, KHÔNG tự thêm ---- */
{
  const c = CLAIMS();
  const la = decide(c, { action: "take", key: "workers/khong-ton-tai", as: "phien-B", today: "x" });
  assert.equal(la.code, EXIT.MISUSE, "khoa khong co trong bang thi la dung sai, khong phai tu choi");
  assert.match(la.message, /KHOA_LA/, "ma loi phai doc duoc");
  assert.match(la.message, /_root/, "phai liet ke khoa hop le de nguoi doc sua duoc ngay");
  assert.equal(Object.keys(c).length, 3, "KHONG duoc tu them khoa moi vao bang");
  ok("khoa bia ra: bao dung sai, liet ke khoa hop le, va khong tu them khoa");
}

/* ---- 4. Chạy THẬT trên một bảng thật — vì ba phép trên chỉ kiểm phần quyết định ---- */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-cli-"));
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    mkdirSync(join(temp, "scripts"), { recursive: true });
    writeFileSync(claimsPath, JSON.stringify({ claims: CLAIMS() }, null, 2) + "\n", "utf8");
    // Chép lệnh sang repo tạm: ROOT của nó suy từ vị trí file, nên phải nằm trong `scripts/`.
    // fileURLToPath, KHÔNG tự bóc `pathname` bằng regex: thư mục repo này có DẤU CÁCH nên
    // pathname trả về "%20" và mọi phép cắt tay đều sai. Đo thật — bản đầu chết ở đúng chỗ đó.
    const here = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "claim.mjs");
    writeFileSync(join(temp, "scripts", "claim.mjs"), readFileSync(here, "utf8"), "utf8");

    const run = (...args) => {
      try {
        const out = execFileSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
        return { code: 0, out };
      } catch (error) {
        return { code: error.status, out: `${error.stdout ?? ""}${error.stderr ?? ""}` };
      }
    };
    const owner = (key) => JSON.parse(readFileSync(claimsPath, "utf8")).claims[key].owner;

    assert.equal(run("--take", "_docs", "--as", "phien-B", "--task", "viet tai lieu").code, EXIT.OK, "nhan goi trong: thoat 0");
    assert.equal(owner("_docs"), "phien-B", "va PHAI ghi that vao bang");

    const cuop = run("--take", "_root", "--as", "phien-B", "--task", "cuop");
    assert.equal(cuop.code, EXIT.REFUSED, "cuop goi nguoi khac: thoat 3");
    assert.equal(owner("_root"), "phien-A", "va TUYET DOI khong ghi gi — day moi la diem chinh");

    assert.equal(run("--take", "_docs", "--as", "phien-B").code, EXIT.MISUSE,
      "nhan quyen ma khong noi lam gi thi phai bao dung sai");
    assert.equal(run("--release", "_docs", "--as", "phien-B").code, EXIT.OK, "tra quyen cua minh: thoat 0");
    assert.equal(owner("_docs"), null, "va bang phai ve trong that");
    ok("chay THAT: nhan/tra ghi dung vao bang, va lan cuop KHONG ghi mot chu nao");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-cli-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- 5. Bảng hỏng thì NÉM, không đoán ---- */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-hong-"));
  try {
    mkdirSync(join(temp, ".agents"), { recursive: true });
    const p = join(temp, ".agents", "claims.json");
    writeFileSync(p, "{khong-phai-json", "utf8");
    assert.throws(() => readClaims(p), /CLAIMS_HONG/, "JSON hong phai NEM");
    writeFileSync(p, JSON.stringify({ claims: [] }), "utf8");
    assert.throws(() => readClaims(p), /CLAIMS_HONG/, "`claims` la MANG cung phai NEM — mang lot qua typeof object");
    assert.throws(() => readClaims(join(temp, "khong-co.json")), /CLAIMS_KHONG_DOC_DUOC/, "thieu file phai NEM");
    ok("bang hong / thieu / sai kieu deu NEM, khong doan bua");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-hong-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- K2-4. DẤU NIÊM PHONG — bảng có bị mở ra sửa tay không ----------------
 *
 * Bệnh: lệnh này giữ ĐƯỜNG GHI, nhưng ngày 03/09 `claims.json` bị mở ra sửa tay đi vòng qua
 * lệnh, cả bốn khoá gốc đổi chủ một lượt, và phiên đang làm dở không hề biết.
 *
 * Hướng chữa BỊ LOẠI, ghim lại ở đây để đừng ai làm lại: so trạng thái cũ với mới rồi bắt lỗi
 * "chủ đổi thẳng người này sang người kia". Cùng ngày đó `_root` đi thẳng từ chủ này sang chủ
 * kia trong đúng MỘT diff, mà chuỗi thật là TRẢ rồi NHẬN — hai thao tác hợp lệ bị ép phẳng.
 * Ảnh chụp không phân biệt được hai chuyện đó. Nên: soi DẤU, đừng so ảnh chụp.
 */
{
  const a = { x: { owner: "p1", task: "m" }, y: { owner: null } };
  const b = { y: { owner: null }, x: { task: "m", owner: "p1" } };   // y HỆT, chỉ khác thứ tự khoá
  assert.equal(claimsFingerprint(a), claimsFingerprint(b),
    "thu tu khoa trong file KHONG duoc doi dau — neu khong, chi cong cu ghi lai la dau vo oan");
  assert.notEqual(claimsFingerprint(a), claimsFingerprint({ ...a, x: { owner: "p2", task: "m" } }),
    "doi CHU thi dau PHAI doi — day la ca duy nhat phep kiem nay ton tai de bat");
  assert.notEqual(claimsFingerprint(a), claimsFingerprint({ x: { owner: "p1", task: "m" } }),
    "bot han mot khoa cung phai doi dau");
  assert.throws(() => claimsFingerprint(null), /CLAIMS_HONG/, "dau vao hong thi NEM, khong tra dau bua");
  assert.throws(() => claimsFingerprint([]), /CLAIMS_HONG/, "mang cung NEM — mang lot qua typeof object");

  // BA trạng thái, cố ý không gộp: "chưa đóng dấu" KHÔNG được đội lốt "đã đạt".
  assert.equal(fingerprintState({ claims: a }).ok, null, "file cu chua co dau = CHUA KIEM, khong phai DAT");
  assert.equal(fingerprintState({ claims: a, [FINGERPRINT_FIELD]: "" }).ok, null, "dau rong cung la chua kiem");
  assert.equal(fingerprintState({ claims: a, [FINGERPRINT_FIELD]: claimsFingerprint(a) }).ok, true, "dau khop");
  assert.equal(fingerprintState({ claims: a, [FINGERPRINT_FIELD]: "sai" }).ok, false, "dau khong khop = VO");
  ok("K2-4 · dau on dinh theo NOI DUNG (khong theo thu tu khoa); chua dong dau la trang thai RIENG");
}

/* ---- K2-4. Lệnh: đóng dấu khi ghi, và DỪNG khi dấu vỡ ---- */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-dau-"));
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    mkdirSync(join(temp, "scripts"), { recursive: true });
    writeFileSync(claimsPath, `${JSON.stringify({ claims: CLAIMS() }, null, 2)}\n`, "utf8");
    const here = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "claim.mjs");
    writeFileSync(join(temp, "scripts", "claim.mjs"), readFileSync(here, "utf8"), "utf8");

    const run = (...args) => {
      // spawnSync, KHONG execFileSync: `--list` kêu dấu vỡ ra STDERR mà vẫn thoát 0, nên nhánh
      // catch không chạy và cảnh báo biến mất khỏi test. Bắt được ở ngay vòng chạy đầu.
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));
    const suaTay = (doi) => { const p = doc(); doi(p); writeFileSync(claimsPath, `${JSON.stringify(p, null, 2)}\n`, "utf8"); };

    // Tương thích ngược: bảng CHƯA có dấu thì lệnh vẫn chạy, và đóng dấu cho nó.
    assert.equal(doc()[FINGERPRINT_FIELD], undefined, "bat dau tu bang chua co dau");
    assert.equal(run("--take", "_docs", "--as", "phien-B", "--task", "viet").code, EXIT.OK,
      "bang chua co dau thi van chay — khong khoa repo vi mot truong moi");
    assert.equal(doc()[FINGERPRINT_FIELD], claimsFingerprint(doc().claims), "ghi xong PHAI dong dau");

    // Văn xuôi ngoài khối `claims` sửa thoải mái: dấu để bắt đổi chủ lén, không để đóng băng tài liệu.
    suaTay((p) => { p._doc = "doi loi giai thich"; });
    assert.equal(run("--list").code, EXIT.OK, "sua van xuoi khong duoc lam vo dau");
    assert.doesNotMatch(run("--list").out, /DAU_VO/, "sua `_doc` khong phai sua tay bang quyen");

    // ĐÂY LÀ CA CHÍNH: đổi chủ bằng tay, đi vòng qua lệnh.
    suaTay((p) => { p.claims["workers/goi-b"].owner = "ke-cuop"; });
    const sauKhiSua = run("--take", "_docs", "--as", "phien-B", "--task", "gi do");
    assert.equal(sauKhiSua.code, EXIT.REFUSED, "dau vo thi lenh phai TU CHOI, thoat 3");
    assert.match(sauKhiSua.out, /DAU_VO/, "va phai noi ro la bi sua tay");
    assert.equal(doc().claims["workers/goi-b"].owner, "ke-cuop",
      "TU CHOI nghia la KHONG GHI GI — ghi de len bang da bi sua tay la dong dau hop le cho vu sua do");
    assert.match(run("--list").out, /DAU_VO/, "`--list` cung phai keu — nan nhan thuong chi chay --list");

    // Lối thoát tường minh, và nó phải ỒN ÀO.
    const dong = run("--restamp", "--as", "nguoi-phan-xu");
    assert.equal(dong.code, EXIT.OK, "--restamp phai chay duoc, neu khong thi khong co duong hoi phuc");
    assert.match(dong.out, /ke-cuop/, "phai IN RA trang thai dang niem phong — de nguoi chay NHIN thay minh dong dau cai gi");
    assert.equal(fingerprintState(doc()).ok, true, "sau restamp thi dau khop lai");
    assert.equal(run("--restamp").code, EXIT.MISUSE, "--restamp ma khong khai --as thi bao dung sai");

    // Và sau khi phân xử xong thì mọi thứ chạy lại bình thường.
    assert.equal(run("--release", "_docs", "--as", "phien-B").code, EXIT.OK, "chay lai binh thuong sau khi dong dau");
    assert.equal(fingerprintState(doc()).ok, true, "va van giu dau khop");
    ok("K2-4 · lenh dong dau khi ghi; sua tay thi TU CHOI ma KHONG ghi de; --restamp la loi thoat on ao");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-dau-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- K2-5. TUỔI KHOÁ — cho người quyết định nhìn thấy, KHÔNG tự đòi lại ----
 *
 * Ngày 03/09 hai khoá gốc bị giành bằng tay, và phần đó ĐÚNG: chủ của chúng đã tắt thật. Nhưng
 * bảng không nói ra được điều đó — `claimed_at` chỉ có NGÀY, nên khoá nhận 5 phút trước và khoá
 * bỏ quên từ sáng trông y hệt nhau. Người muốn làm đúng cũng phải đoán.
 *
 * Vế PHẢI GHIM MẠNH NHẤT là vế phủ định: lệnh KHÔNG được tự đòi lại khoá quá hạn. `claimed_at`
 * không được chạm lại trong lúc làm, nên "cũ" không đồng nghĩa "chết"; tự đòi lại là biến đúng
 * tai nạn hôm nay thành tính năng.
 */
{
  const moc = new Date("2026-09-03T12:00Z");
  assert.equal(ageHours("2026-09-03T10:00", moc), 2, "doc duoc dang MOI co gio");
  assert.equal(ageHours("2026-09-03", moc), 12, "dang CU chi co ngay van doc duoc — tinh tu 00:00");
  assert.equal(ageHours("2026-09-03T10:00Z", moc), 2, "co san hau to Z thi khong duoc dan them");
  assert.equal(ageHours("2026-09-03T20:00", moc), 0, "moc tuong lai thi ve 0, khong duoc ra so AM");

  // Không đọc được thì trả null. Đoán bừa một con số giờ tệ hơn không nói gì — người đọc sẽ
  // tin vào nó để quyết định có giành khoá của người khác hay không.
  for (const xau of [null, undefined, "", "hom qua", 42, "2026-13-99"]) {
    assert.equal(ageHours(xau, moc), null, `moc khong doc duoc phai tra null: ${JSON.stringify(xau)}`);
  }
  assert.equal(ageLabel(null), "", "khong biet tuoi thi khong in gi");
  assert.match(ageLabel(0.5), /phút/, "duoi 1h thi in phut");
  assert.match(ageLabel(5), /^5h$/, "vai gio thi in gio");
  assert.match(ageLabel(72), /ngày/, "qua 48h thi in ngay cho de doc");
  ok("K2-5 · tuoi khoa: doc ca dang cu lan moi, moc hong tra null, nhan don vi theo do lon");
}

{
  const temp = mkdtempSync(join(tmpdir(), "claim-tuoi-"));
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    mkdirSync(join(temp, "scripts"), { recursive: true });
    const here = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "claim.mjs");
    writeFileSync(join(temp, "scripts", "claim.mjs"), readFileSync(here, "utf8"), "utf8");
    const cu = new Date(Date.now() - (GIO_NHAC + 2) * 3600000).toISOString().slice(0, 16);
    const moi = new Date(Date.now() - 5 * 60000).toISOString().slice(0, 16);
    writeFileSync(claimsPath, `${JSON.stringify({ claims: {
      _root: { owner: "phien-cu", ai: "Claude", claimed_at: cu, task: "giu lau roi" },
      _docs: { owner: "phien-moi", ai: "Claude", claimed_at: moi, task: "vua nhan" },
      "workers/goi-b": { owner: null, ai: null, claimed_at: cu, task: "" }
    } }, null, 2)}\n`, "utf8");

    const run = (...args) => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };
    const dong = (khoa) => (run("--list").out.match(new RegExp(`^.*${khoa.replace("/", "\\/")}.*$`, "m")) ?? [""])[0];

    assert.match(dong("_root"), /⚠/, "khoa giu qua nguong phai co dau nhac");
    assert.doesNotMatch(dong("_docs"), /⚠/, "khoa vua nhan thi KHONG duoc nhac — bao oan la nguoi ta bo qua het");
    assert.doesNotMatch(dong("workers/goi-b"), /giữ/, "khoa TRONG thi khong co tuoi de in");
    assert.match(run("--list").out, /hỏi Đức/, "phai noi ro day la so lieu de HOI, khong phai giay phep gianh");

    // VẾ PHỦ ĐỊNH — quan trọng nhất cả khối.
    const cuop = run("--take", "_root", "--as", "phien-khac", "--task", "khoa nay cu roi ma");
    assert.equal(cuop.code, EXIT.REFUSED, "khoa QUA HAN van la khoa co chu — TUYET DOI khong tu doi lai");
    assert.equal(JSON.parse(readFileSync(claimsPath, "utf8")).claims._root.owner, "phien-cu",
      "va khong duoc ghi mot chu nao vao bang");

    // Mốc mới phải có GIỜ, không chỉ ngày — nếu không thì cả khối này vô nghĩa từ lần ghi sau.
    assert.equal(run("--take", "workers/goi-b", "--as", "phien-moi", "--task", "viec moi").code, EXIT.OK);
    assert.match(JSON.parse(readFileSync(claimsPath, "utf8")).claims["workers/goi-b"].claimed_at,
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "moc moi PHAI co gio — ngay tran la goc benh dang chua");
    ok("K2-5 · --list in tuoi va nhac dung khoa cu; khoa qua han VAN khong tu doi lai duoc");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-tuoi-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}


/* ---- K2-11. HÀM THUẦN: khoá nào vừa bị chuyển khỏi tay người khác ---- */
{
  const truoc = { _code: { owner: "A" }, _docs: { owner: "B" }, _root: { owner: null }, "workers/g": { owner: "C" } };

  // Lấy khỏi tay A, sang mình → phải bị bắt. Đây là ca thật ngày 04/09.
  assert.deepEqual(khoaBiDoiChu(truoc, { ...truoc, _code: { owner: "toi" } }, "toi"),
    [{ key: "_code", tu: "A", sang: "toi" }], "lay khoa tu tay A ve minh PHAI bi bat");

  // Lấy khỏi tay A, sang người thứ ba → cũng phải bị bắt. Bắt hộ người khác vẫn là bắt.
  assert.deepEqual(khoaBiDoiChu(truoc, { ...truoc, _code: { owner: "D" } }, "toi"),
    [{ key: "_code", tu: "A", sang: "D" }], "chuyen khoa cua A sang D cung PHAI bi bat");

  // Xoá chủ hộ người khác → vẫn bắt. Trả hộ là xoá dấu vết một phiên đang làm dở.
  assert.deepEqual(khoaBiDoiChu(truoc, { ...truoc, _docs: { owner: null } }, "toi"),
    [{ key: "_docs", tu: "B", sang: null }], "tra quyen ho nguoi khac cung PHAI bi bat");

  // BA ca KHÔNG được bắt — thiếu vế này thì một hàm "luôn báo" vẫn qua test.
  assert.deepEqual(khoaBiDoiChu(truoc, { ...truoc, _root: { owner: "toi" } }, "toi"), [],
    "nhan mot vung TRONG khong lay cua ai — khong duoc bao");
  assert.deepEqual(khoaBiDoiChu(truoc, { ...truoc, _code: { owner: null } }, "A"), [],
    "chinh chu tra khoa cua minh — khong duoc bao");
  assert.deepEqual(khoaBiDoiChu(truoc, truoc, "toi"), [], "khong doi gi thi khong bao gi");

  // Không có bảng cũ để so (repo chưa commit lần nào) → không có gì để kết luận.
  assert.deepEqual(khoaBiDoiChu(null, { _code: { owner: "toi" } }, "toi"), [],
    "khong co ban cu thi khong the ket luan ai lay cua ai");
  ok("K2-11 · hàm thuần: bắt đúng ba hình dạng lấy khoá, và im với bốn ca hợp lệ");
}

/* ---- K2-11. Lệnh: `--restamp` KHÔNG được rửa sạch một vụ đổi chủ ----
   Lỗ thật (04/09): `--take` từ chối cứng khi vùng có chủ khác, nhưng `--restamp` đóng dấu cho
   BẤT KỲ nội dung nào trên đĩa. Nên đường lấy khoá trọn vẹn là: sửa tay → restamp → bảng có dấu
   hợp lệ, cổng XANH với mọi phiên, và người vừa bị lấy khoá KHÔNG HỀ BIẾT. Đã xảy ra với phiên
   `claude-k2-snapshot` giữa lúc nó đang sửa đúng vùng đó.

   Bản cũ CÓ in một câu nhắc. Người đang cố ý làm thì đọc xong vẫn đi tiếp — một dòng chữ không
   phải một chốt. */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-restamp-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: temp, encoding: "utf8" });
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    mkdirSync(join(temp, "scripts"), { recursive: true });
    const here = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "claim.mjs");
    writeFileSync(join(temp, "scripts", "claim.mjs"), readFileSync(here, "utf8"), "utf8");
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));
    const ghi = (claims) => writeFileSync(claimsPath, `${JSON.stringify({ claims }, null, 2)}\n`, "utf8");
    const run = (...args) => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };

    gitAt("init", "-q", "-b", "main");
    gitAt("config", "user.name", "K2 Restamp");
    gitAt("config", "user.email", "k2@example.invalid");
    // Trạng thái ĐÃ COMMIT: `_code` của nạn nhân, `_docs` trống.
    ghi({ _code: { owner: "nan-nhan", ai: "Claude", task: "dang lam do" }, _docs: { owner: null } });
    run("--restamp", "--as", "nan-nhan");           // đóng dấu cho trạng thái gốc
    gitAt("add", "-A"); gitAt("commit", "-q", "-m", "seed");

    // VẾ 1 — sửa tay để lấy khoá, rồi restamp. PHẢI TỪ CHỐI.
    const cuop = doc();
    cuop.claims._code = { owner: "ke-lay", taken_from: "nan-nhan" };   // đúng hình dạng đã xảy ra
    writeFileSync(claimsPath, `${JSON.stringify(cuop, null, 2)}\n`, "utf8");
    const r1 = run("--restamp", "--as", "ke-lay");
    assert.equal(r1.code, EXIT.REFUSED, `K2-11: restamp de gan dau cho mot vu lay khoa PHAI bi tu choi. Ra: ${r1.out}`);
    assert.match(r1.out, /TU_CHOI_DONG_DAU/, "phai co ma loi doc duoc");
    assert.match(r1.out, /_code: "nan-nhan" → "ke-lay"/, "phai noi RO khoa nao, cua ai, ve tay ai");
    assert.match(r1.out, /--duc-duyet/, "phai chi ra duong hop le, khong chi noi khong");
    // `taken_from` viết tay KHÔNG phải giấy phép — nó chỉ là chữ, công cụ chưa bao giờ sinh ra nó.
    assert.notEqual(doc()[FINGERPRINT_FIELD], claimsFingerprint(doc().claims),
      "tu choi thi KHONG duoc ghi dau moi — dau phai con vo, de cong con bao do");

    // VẾ 2 — VẾ CHỊU LỰC: có câu chốt của Đức thì đi được, VÀ xuất xứ phải nằm TRONG FILE.
    const r2 = run("--restamp", "--as", "ke-lay", "--duc-duyet", "Duc chot 04/09: chu cu da tat");
    assert.equal(r2.code, EXIT.OK, `co cau chot cua Duc thi phai di duoc. Ra: ${r2.out}`);
    const sau = doc();
    assert.equal(sau[FINGERPRINT_FIELD], claimsFingerprint(sau.claims), "di duoc thi phai dong dau that");
    assert.equal(sau.claims._code.taken_from, "nan-nhan", "xuat xu phai ghi VAO FILE");
    assert.equal(sau.claims._code.taken_by, "ke-lay", "phai ghi ai la nguoi lay");
    assert.equal(sau.claims._code.duc_decision, "Duc chot 04/09: chu cu da tat",
      "cau chot cua Duc phai nam trong file — nguoi can doc no la nan nhan, ma ho khong chay lenh nay");

    // VẾ 3 — cờ RỖNG không được coi là có chốt. Nếu không thì `--duc-duyet ""` là đường vòng.
    gitAt("add", "-A"); gitAt("commit", "-q", "-m", "sau khi Duc chot");
    const lai = doc();
    lai.claims._docs = { owner: "ai-do" };
    writeFileSync(claimsPath, `${JSON.stringify(lai, null, 2)}\n`, "utf8");
    run("--restamp", "--as", "ai-do", "--duc-duyet", "Duc chot: nhan vung trong");
    gitAt("add", "-A"); gitAt("commit", "-q", "-m", "docs co chu");
    const cuop2 = doc();
    cuop2.claims._docs = { owner: "ke-lay-2" };
    writeFileSync(claimsPath, `${JSON.stringify(cuop2, null, 2)}\n`, "utf8");
    const r3 = run("--restamp", "--as", "ke-lay-2", "--duc-duyet", "   ");
    assert.equal(r3.code, EXIT.REFUSED, `co RONG khong duoc tinh la co chot. Ra: ${r3.out}`);

    // VẾ 4 — đóng dấu sau khi CHỈ sửa văn xuôi thì vẫn phải chạy trơn. Không được biến một
    // lệnh bảo trì bình thường thành thứ phải xin phép.
    const vanXuoi = doc();
    vanXuoi.claims._docs = { owner: "ai-do" };     // trả về đúng trạng thái đã commit
    vanXuoi._doc = "doi loi giai thich";
    writeFileSync(claimsPath, `${JSON.stringify(vanXuoi, null, 2)}\n`, "utf8");
    const r4 = run("--restamp", "--as", "ai-do");
    assert.equal(r4.code, EXIT.OK, `chi sua van xuoi thi restamp phai chay tron. Ra: ${r4.out}`);
    ok("K2-11 · `--restamp` từ chối đóng dấu cho vụ đổi chủ; có câu chốt Đức thì đi được và ghi xuất xứ VÀO FILE; cờ rỗng không tính; sửa văn xuôi vẫn trơn");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-restamp-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

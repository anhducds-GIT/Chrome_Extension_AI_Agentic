/* Test ghim cho lệnh nhận/trả quyền (A1).
 *
 * Phép quan trọng nhất là hai phép TỪ CHỐI. Cả hai đều bảo vệ một phiên khác đang làm dở, và
 * cả hai đều dễ hỏng âm thầm: một lệnh "cứ ghi" vẫn chạy trơn, chỉ có phiên bị mất quyền là
 * không biết gì. Đó chính là chuyện đã xảy ra ngày 02/09.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { ageHours, ageLabel, BASELINE, baselineDaNiemPhong, canDayTruocKhiTra, claimsFingerprint, decide, EXIT, FINGERPRINT_FIELD, fingerprintState, GIO_NHAC, ghiBangNguyenTu, khoaBiDoiChu, khoaFileTrongVung, kiemKhoaKhaiDuoc, quyetDinhSua, quyetDinhXong, readClaims, soatDanHang } from "../scripts/claim.mjs";
import { CHUA_DAY } from "../scripts/repo-structure.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* Chép lệnh sang repo tạm: ROOT của nó suy từ vị trí file, nên phải nằm trong `scripts/`.
 * fileURLToPath, KHÔNG tự bóc `pathname` bằng regex: thư mục repo này có DẤU CÁCH nên pathname
 * trả về "%20" và mọi phép cắt tay đều sai. Đo thật — bản đầu chết ở đúng chỗ đó.
 *
 * CHÉP CẢ HAI FILE (TRA-KHOA-01, 06/09): `claim.mjs` nay import `repo-structure.mjs` để dùng
 * CHUNG phép đếm commit chưa đẩy với `safe-push.mjs` — chép một bản thứ hai của phép đếm đó
 * chính là con bug ngày 02/09. Chép thiếu module thì fixture chết vì `ERR_MODULE_NOT_FOUND`,
 * và cái chết đó trông y hệt một phép kiểm hỏng. */
const SCRIPTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts");
function chepLenh(dir) {
  mkdirSync(join(dir, "scripts"), { recursive: true });
  for (const ten of ["claim.mjs", "repo-structure.mjs"]) {
    writeFileSync(join(dir, "scripts", ten), readFileSync(join(SCRIPTS_DIR, ten), "utf8"), "utf8");
  }
  return join(dir, "scripts", "claim.mjs");
}

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
    chepLenh(temp);
    // PHẢI là repo git thật (thêm 04/09): từ khi `--restamp` so với mốc niêm phong hợp lệ gần
    // nhất trong LỊCH SỬ, nó cần lịch sử để đọc. Không đọc được thì nó TỪ CHỐI — cố ý, vì
    // "không biết" mà cho qua chính là fail-open GPT bắt được ở vòng 7. Thư mục trần không
    // phải hình dạng thật: `claims.json` luôn nằm trong một repo.
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: temp, encoding: "utf8" });

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
    chepLenh(temp);
    // PHẢI là repo git thật (thêm 04/09): từ khi `--restamp` so với mốc niêm phong hợp lệ gần
    // nhất trong LỊCH SỬ, nó cần lịch sử để đọc. Không đọc được thì nó TỪ CHỐI — cố ý, vì
    // "không biết" mà cho qua chính là fail-open GPT bắt được ở vòng 7. Thư mục trần không
    // phải hình dạng thật: `claims.json` luôn nằm trong một repo.
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: temp, encoding: "utf8" });

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
    chepLenh(temp);
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
    chepLenh(temp);
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


/* ---- K2-12. Mốc so phải là BẢN NIÊM PHONG HỢP LỆ GẦN NHẤT, không mù quáng là HEAD ----
   Hai fail-open GPT bắt được ở vòng 7, cộng một cái tôi tìm ra khi đọc lại vòng lặp của mình:

   1. VÒNG QUA BẰNG MỘT LƯỢT COMMIT: sửa tay owner → `git commit` → `--restamp`. Mốc cũ là HEAD,
      mà HEAD giờ đã mang owner mới, nên phép so thấy "không đổi gì" và cho qua. Chốt vừa dựng
      hôm nay đã có cửa sau, và cửa đó chỉ tốn thêm một lệnh.
   2. LỖI ĐỌC GIT thành "không có vấn đề" — `catch → null → mảng rỗng → cho qua".
   3. (tôi) MỌI BẢN ĐỌC HỎNG cũng từng lọt: vòng lặp chỉ `continue`, nên nó kết thúc êm rồi trả
      BOOTSTRAP tức cho qua. Nấp sâu hơn một tầng so với (2). */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-baseline-"));
  const gitAt = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args], { cwd: temp, encoding: "utf8" });
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    mkdirSync(join(temp, "scripts"), { recursive: true });
    chepLenh(temp);
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));
    const ghiDoc = (p) => writeFileSync(claimsPath, `${JSON.stringify(p, null, 2)}\n`, "utf8");
    const run = (...args) => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };

    gitAt("init", "-q", "-b", "main");
    gitAt("config", "user.name", "K2 Baseline");
    gitAt("config", "user.email", "k2@example.invalid");

    // CA A — repo chưa có commit nào: BOOTSTRAP thật, phải cho qua. Đòi hỏi ở đây là khoá repo
    // ngay từ commit đầu tiên — đúng kiểu chặn oan mà cả K2 sinh ra để xoá.
    ghiDoc({ claims: { _code: { owner: "nan-nhan", task: "dang lam do" }, _docs: { owner: null } } });
    assert.equal(baselineDaNiemPhong(temp).trangThai, BASELINE.BOOTSTRAP,
      "repo chua co commit nao thi chua tung co trang thai niem phong de mat — phai cho qua");
    assert.equal(run("--restamp", "--as", "nan-nhan").code, EXIT.OK, "va restamp phai chay duoc o repo moi");
    gitAt("add", "-A"); gitAt("commit", "-q", "-m", "seed da dong dau");

    // Mốc lành có thật, và nó đúng là bản vừa commit.
    const moc = baselineDaNiemPhong(temp);
    assert.equal(moc.trangThai, BASELINE.OK, "co ban niem phong hop le thi phai tim ra");
    assert.equal(moc.claims._code.owner, "nan-nhan", "moc phai mang trang thai LANH, khong phai trang thai hien tai");

    // CA B — CRITICAL 1: sửa tay ĐỂ LẤY KHOÁ, rồi COMMIT, rồi restamp. Lượt commit KHÔNG được
    // biến trạng thái bẩn thành mốc so — nếu không thì chốt hôm nay có cửa sau một lệnh.
    const cuop = doc();
    cuop.claims._code = { owner: "ke-lay", taken_from: "nan-nhan" };
    ghiDoc(cuop);
    gitAt("add", "-A"); gitAt("commit", "-q", "-m", "sua tay roi commit — dau dang vo");
    const sauCommit = baselineDaNiemPhong(temp);
    assert.equal(sauCommit.trangThai, BASELINE.OK, "van phai tim duoc moc lanh, bang cach LUI QUA ban vua bi sua tay");
    assert.equal(sauCommit.claims._code.owner, "nan-nhan",
      "moc phai van la ban LANH truoc do — neu no la HEAD thi vu lay khoa da tu hop thuc hoa");
    const rB = run("--restamp", "--as", "ke-lay");
    assert.equal(rB.code, EXIT.REFUSED, `CRITICAL 1: commit truoc roi restamp VAN phai bi tu choi. Ra: ${rB.out}`);
    assert.match(rB.out, /_code: "nan-nhan" → "ke-lay"/, "phai chi dung khoa nao, cua ai, ve tay ai");

    // CA C — CRITICAL 2 / fail-closed: không có mốc lành nào trong tầm quét thì TỪ CHỐI, không
    // đoán. Ép bằng cách chỉ cho quét đúng 1 bản — bản đó chính là bản vừa bị sửa tay.
    const hepTam = baselineDaNiemPhong(temp, 1);
    assert.equal(hepTam.trangThai, BASELINE.LOI,
      "quet het tam ma khong thay moc lanh thi phai la LOI — 'khong biet' KHONG duoc thanh 'khong sao'");
    assert.match(hepTam.ly_do, /không thấy mốc niêm phong lành nào/, "phai noi ro vi sao");

    // CA D — KHÔNG phải repo git thì phải TỪ CHỐI, không được lùi về BOOTSTRAP.
    //
    // Ca này TRƯỚC ĐÂY GHIM NGƯỢC (sửa 04/09, GPT audit vòng 8 chỉ ra): chú thích viết "phải
    // TỪ CHỐI" mà khẳng định ngay dưới lại đòi BOOTSTRAP. Tức test đang xác nhận chính cái
    // fail-open là hành vi đúng — tệ hơn không có test, vì nó làm cái lỗ trông như đã kiểm chứng.
    //
    // Phân biệt: "repo git chưa có commit" (ca A) là chưa từng có gì để mất → cho qua.
    // "Không phải repo git / git hỏng" là KHÔNG BIẾT lịch sử có gì → từ chối.
    const troc = mkdtempSync(join(tmpdir(), "claim-khong-git-"));
    try {
      assert.equal(baselineDaNiemPhong(troc).trangThai, BASELINE.LOI,
        "khong phai repo git = KHONG BIET lich su co gi, khong phai 'chua tung co gi de mat'");
      // Và qua ĐƯỜNG LỆNH nữa — bài học vòng trước: ghim hàm không thay được ghim đường đi.
      mkdirSync(join(troc, ".agents"), { recursive: true });
      mkdirSync(join(troc, "scripts"), { recursive: true });
      writeFileSync(join(troc, ".agents", "claims.json"),
        `${JSON.stringify({ claims: { _code: { owner: "ai-do" } } }, null, 2)}\n`, "utf8");
      chepLenh(troc);
      const cliTroc = spawnSync(process.execPath, [join(troc, "scripts", "claim.mjs"), "--restamp", "--as", "ai-do"], { encoding: "utf8" });
      assert.equal(cliTroc.status, EXIT.REFUSED,
        `khong phai repo git thi LENH phai tu choi. Ra: ${cliTroc.stdout}${cliTroc.stderr}`);
      assert.match(`${cliTroc.stdout}${cliTroc.stderr}`, /KHONG_CO_MOC_SO/, "phai co ma loi doc duoc");
    } finally { rmSync(troc, { recursive: true, force: true }); }

    // CA E — khôi phục hợp lệ: Đức chốt thì đi được, và xuất xứ ghi VÀO FILE.
    const rE = run("--restamp", "--as", "ke-lay", "--duc-duyet", "Duc chot 04/09: chu cu da tat that");
    assert.equal(rE.code, EXIT.OK, `co cau chot cua Duc thi phai di duoc. Ra: ${rE.out}`);
    assert.equal(doc().claims._code.duc_decision, "Duc chot 04/09: chu cu da tat that", "cau chot phai nam trong bang");
    // CA F — nhánh tôi tự tìm ra: MỌI bản trong lịch sử đều đọc hỏng. Vòng lặp chỉ `continue`
    // nên nó kết thúc êm, không bản nào "có dấu", và hàm suýt trả BOOTSTRAP tức CHO QUA. Nấp
    // sâu hơn một tầng so với ca đọc-git-lỗi mà GPT nêu, và không ca nào ở trên chạm tới nó.
    const hong = mkdtempSync(join(tmpdir(), "claim-ban-hong-"));
    try {
      const gh = (...a) => execFileSync("git", a, { cwd: hong, encoding: "utf8" });
      gh("init", "-q", "-b", "main");
      gh("config", "user.name", "K2"); gh("config", "user.email", "k2@example.invalid");
      mkdirSync(join(hong, ".agents"), { recursive: true });
      writeFileSync(join(hong, ".agents", "claims.json"), "{ khong-phai-json", "utf8");
      gh("add", "-A"); gh("commit", "-q", "-m", "ban duy nhat trong lich su bi hong");
      const r = baselineDaNiemPhong(hong);
      assert.equal(r.trangThai, BASELINE.LOI,
        "moi ban trong lich su doc hong thi phai LOI — 'khong doc duoc' KHONG duoc thanh 'chua tung dong dau'");
      assert.match(r.ly_do, /không đọc được/, "phai noi ro co ban khong doc duoc, de nguoi doc biet di sua dau");

      // VÀ QUA ĐƯỜNG LỆNH, không chỉ qua hàm. Mutation chỉ ra rằng ghim hàm thôi thì gỡ hẳn
      // chốt trong `main()` vẫn không test nào đỏ — hàm trả LOI xong mà nơi gọi lờ đi thì cũng
      // như không. Bảng trên đĩa để HỢP LỆ, chỉ lịch sử là hỏng, để `readClaims` không chặn trước.
      mkdirSync(join(hong, "scripts"), { recursive: true });
      chepLenh(hong);
      writeFileSync(join(hong, ".agents", "claims.json"),
        `${JSON.stringify({ claims: { _code: { owner: "ai-do" } } }, null, 2)}\n`, "utf8");
      const cli = spawnSync(process.execPath, [join(hong, "scripts", "claim.mjs"), "--restamp", "--as", "ai-do"], { encoding: "utf8" });
      assert.equal(cli.status, EXIT.REFUSED,
        `khong co moc lanh thi LENH phai tu choi, khong chi ham bao LOI. Ra: ${cli.stdout}${cli.stderr}`);
      assert.match(`${cli.stdout}${cli.stderr}`, /KHONG_CO_MOC_SO/, "phai co ma loi doc duoc");
    } finally { rmSync(hong, { recursive: true, force: true }); }
    ok("K2-12 · mốc so là bản niêm phong LÀNH gần nhất: commit-rồi-restamp vẫn bị chặn · hết tầm quét thì TỪ CHỐI · bản đọc hỏng KHÔNG thành bootstrap · repo mới vẫn chạy");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-baseline-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- TRA-KHOA-01. TRẢ QUYỀN SAU KHI ĐẨY, KHÔNG PHẢI SAU KHI COMMIT --------
 *
 * Luật `AGENTS.md` mục 1. Trước 06/09 nó chỉ là chữ, và ngày 06/09 ba lane cùng vi phạm trong
 * một buổi — cả ba đều thành thật: chúng đọc hiến pháp, không thấy luật, nên trả khoá cho sạch.
 *
 * BỐN CON ĐỘT BIẾN mà khối này phải bắt (MULTIFLOW mục 5 — chốt không có test ghim là bình luận):
 *   ① gỡ hẳn phép chặn trong `main()`     → ca A, F
 *   ② đảo điều kiện (chặn khi ĐÃ đẩy)     → ca B, C  (vế "KHÔNG chặn thứ hợp lệ", bẫy ③)
 *   ③ bỏ nhánh "không có remote"          → ca D
 *   ④ lối thoát bỏ qua mà KHÔNG ghi lý do → ca F
 * Mọi ca đều đi qua ĐƯỜNG LỆNH, không chỉ qua hàm thuần — bẫy ① của mục 5: hàm trả đúng mà
 * `main()` lờ đi thì cũng như không, và bài học đó đã trả giá một lần ở K2-12. */
{
  // Hàm thuần trước: ba nhánh, kiểm được mà không cần dựng remote.
  const commit = (sha, areas) => ({ sha, subject: `viec ${sha}`, areas, lane: "ai-do", laneProblem: null });
  assert.equal(canDayTruocKhiTra({ trangThai: CHUA_DAY.LOI, ly_do: "git chet" }, "_code").chan, true,
    "khong doc duoc git = KHONG BIET, va khong biet phai la DO (bat bien 4)");
  assert.equal(canDayTruocKhiTra(null, "_code").chan, true, "khong co ket qua do cung phai chan");
  assert.equal(canDayTruocKhiTra({ trangThai: CHUA_DAY.KHONG_CO_MOC }, "_code").chan, false,
    "chua co remote = bootstrap that, KHONG duoc chan — repo moi dung tu bo khung khong co origin");
  assert.equal(canDayTruocKhiTra({ trangThai: CHUA_DAY.OK, commits: [commit("aaa", ["_docs"])] }, "_code").chan, false,
    "commit chua day cua VUNG KHAC khong duoc chan vung nay");
  const dinh = canDayTruocKhiTra({ trangThai: CHUA_DAY.OK, commits: [commit("aaa", ["_code", "_docs"])] }, "_code");
  assert.equal(dinh.chan, true, "commit chua day cham dung vung nay thi phai chan");
  assert.equal(dinh.commits.length, 1, "va phai keo theo commit de bao cho nguoi doc biet la cai nao");
  ok("TRA-KHOA-01 · hàm thuần: git hỏng chặn · chưa có remote KHÔNG chặn · chỉ chặn khi đúng vùng còn commit chưa đẩy");
}

{
  const temp = mkdtempSync(join(tmpdir(), "claim-tra-khoa-"));
  try {
    const remote = join(temp, "origin.git");
    const work = join(temp, "lam-viec");
    execFileSync("git", ["init", "-q", "--bare", "-b", "main", remote], { encoding: "utf8" });
    execFileSync("git", ["clone", "-q", remote, work], { encoding: "utf8" });
    const gw = (...a) => execFileSync("git", a, { cwd: work, encoding: "utf8" });
    gw("config", "user.name", "TRA-KHOA"); gw("config", "user.email", "tra-khoa@example.invalid");

    const claimsPath = join(work, ".agents", "claims.json");
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));
    const owner = (k) => doc().claims[k].owner;
    const ghi = (p, noiDung) => { mkdirSync(dirname(join(work, p)), { recursive: true }); writeFileSync(join(work, p), noiDung, "utf8"); };
    const NL = String.fromCharCode(10);

    ghi(".repo-structure.json", `${JSON.stringify({ areas: { "scripts/": { steward: "_code" }, "docs/": { steward: "_docs" } } }, null, 2)}${NL}`);
    ghi(".agents/claims.json", `${JSON.stringify({ claims: {
      "_code": { owner: "phien-A", ai: "Claude", task: "sua cong tra khoa", released_at: null },
      "_docs": { owner: "phien-A", ai: "Claude", task: "viet tai lieu", released_at: null }
    } }, null, 2)}${NL}`);
    ghi("docs/ghi-chu.md", `dong dau${NL}`);
    const cli = chepLenh(work);
    gw("add", "-A"); gw("commit", "-q", "-m", `nen ban dau${NL}${NL}Lane: phien-A`);
    gw("push", "-q", "origin", "main");

    const run = (...args) => {
      const r = spawnSync(process.execPath, [cli, ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };

    // Sạch: chưa có commit nào chưa đẩy → cả hai vùng phải trả được. Đây là vế "KHÔNG chặn thứ
    // hợp lệ" (MULTIFLOW bẫy ③): thiếu nó thì một bản "luôn từ chối" vẫn qua sạch mọi phép kiểm.
    assert.equal(run("--release", "_docs", "--as", "phien-A").code, EXIT.OK,
      "day xong roi thi tra khoa phai TROI CHAY — thieu ve nay thi ban 'luon tu choi' cung qua sach");
    assert.equal(owner("_docs"), null, "va bang phai ve trong that");
    assert.equal(run("--take", "_docs", "--as", "phien-A", "--task", "nhan lai").code, EXIT.OK, "nhan lai de chay tiep");

    // CA A — vùng còn commit CHƯA ĐẨY thì TỪ CHỐI, và TỪ CHỐI nghĩa là KHÔNG GHI GÌ.
    ghi("scripts/moi.mjs", `// viec cua phien-A${NL}`);
    gw("add", "-A"); gw("commit", "-q", "-m", `them mot script${NL}${NL}Lane: phien-A`);
    const chan = run("--release", "_code", "--as", "phien-A");
    assert.equal(chan.code, EXIT.REFUSED, `con commit chua day thi phai TU CHOI, thoat 3. Ra: ${chan.out}`);
    assert.equal(owner("_code"), "phien-A", "TU CHOI nghia la KHONG GHI GI — day moi la diem chinh");
    assert.match(chan.out, /TU_CHOI_TRA_KHOA/, "phai co ma loi doc duoc");
    assert.match(chan.out, /_code/, "phai noi RO la vung nao");
    assert.match(chan.out, /1 commit CHƯA ĐẨY/, "phai noi RO con bao nhieu commit chua day");
    assert.match(chan.out, /safe-push\.mjs --as phien-A/, "phai chi duong di tiep DUNG: day truoc roi moi tra");
    assert.match(chan.out, /--du-biet/, "phai neu LOI THOAT — chan cung khong loi thoat la dung mot cai ket moi thay cai cu");

    // CA B — commit chưa đẩy đó KHÔNG chạm `_docs`, nên `_docs` vẫn phải trả được.
    // Chặn cả vùng không liên quan là đúng lỗi "một khoá chặn mọi việc" mà A2 vừa gỡ.
    assert.equal(run("--release", "_docs", "--as", "phien-A").code, EXIT.OK,
      "commit chua day cua vung KHAC khong duoc chan vung nay");
    assert.equal(owner("_docs"), null, "va no phai ve trong that");

    // CA F — lối thoát mà KHÔNG ghi lý do thì KHÔNG phải lối thoát. Đây là đột biến ④.
    const tran = run("--release", "_code", "--as", "phien-A", "--du-biet");
    // MÃ THOÁT RIÊNG, không chỉ "khác 0": một con đột biến làm cờ trần "chạy được" thường chết
    // bằng TypeError, tức vẫn khác 0 — nên `notEqual(0)` cho nó sống sót. Ghim đúng mã DUNG_SAI.
    assert.equal(tran.code, EXIT.MISUSE, `co tran khong ly do thi KHONG duoc mo cua, va phai la DUNG SAI (2). Ra: ${tran.out}`);
    assert.match(tran.out, /THIEU_LY_DO/, "phai noi ro thieu cai gi");
    assert.equal(owner("_code"), "phien-A", "va van KHONG duoc ghi gi");
    const rong = run("--release", "_code", "--as", "phien-A", "--du-biet", "   ");
    assert.equal(rong.code, EXIT.MISUSE, "ly do toan dau cach cung khong tinh la ly do");
    assert.equal(owner("_code"), "phien-A", "van khong ghi gi");

    // CA E — lối thoát ĐÚNG: có câu lý do thì đi được, VÀ câu đó phải nằm TRONG BẢNG.
    // Ghi vào bảng chứ không in ra màn hình: người cần đọc là phiên nhận vùng sau, mà họ chỉ
    // đọc bảng — y hệt lý lẽ của `--duc-duyet` ở `--restamp`.
    const thoat = run("--release", "_code", "--as", "phien-A", "--du-biet", "remote tu choi vi khoa 2FA, ban giao cho phien-B");
    assert.equal(thoat.code, EXIT.OK, `co cau ly do thi phai di duoc. Ra: ${thoat.out}`);
    assert.equal(owner("_code"), null, "va khoa phai ve trong that");
    assert.equal(doc().claims._code.unpushed_reason, "remote tu choi vi khoa 2FA, ban giao cho phien-B",
      "cau ly do phai nam TRONG BANG, khong phai chi in ra man hinh");
    assert.equal(doc().claims._code.released_with_unpushed, 1, "va phai ghi con bao nhieu commit chua day");
    assert.equal(fingerprintState(doc()).ok, true, "ghi xong van phai dong dau");

    // CA G — dấu vết trả sớm KHÔNG được sống dai hơn lượt đó.
    assert.equal(run("--take", "_code", "--as", "phien-B", "--task", "nhan ban giao").code, EXIT.OK, "phien sau nhan duoc vung");
    assert.equal(doc().claims._code.unpushed_reason, undefined,
      "nhan lai thi phai xoa dau vet tra som cu — de nguoi doc sau khong tuong van con commit vo chu");
    assert.equal(doc().claims._code.released_with_unpushed, undefined, "ca hai truong phai bien mat");

    // CA C — đẩy xong thì trả trơn, và KHÔNG còn trường trả sớm nào.
    gw("push", "-q", "origin", "main");
    const sach = run("--release", "_code", "--as", "phien-B");
    assert.equal(sach.code, EXIT.OK, `day xong roi thi tra khoa phai troi chay. Ra: ${sach.out}`);
    assert.equal(doc().claims._code.unpushed_reason, undefined, "tra binh thuong thi khong ghi truong tra som nao");
    ok("TRA-KHOA-01 · lệnh: còn commit chưa đẩy thì TỪ CHỐI mà không ghi gì · vùng khác không bị vạ lây · --du-biet phải kèm lý do và lý do vào BẢNG · đẩy xong thì trơn");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-tra-khoa-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- TRA-KHOA-01. Hai ca không-đo-được, hai cách xử KHÁC NHAU -------------
 * Ranh giới này là điểm chính của bản vá, và nó dễ bị "dọn" mất thành một nhánh chung. */
{
  const NL = String.fromCharCode(10);
  // CA D — repo CHƯA CÓ REMOTE thì KHÔNG được chặn. Repo mới dựng từ bộ khung không có
  // `origin`, và nó không bao giờ có commit chưa đẩy để mà mất — chưa có chỗ nào để đẩy tới.
  const moi = mkdtempSync(join(tmpdir(), "claim-chua-remote-"));
  try {
    mkdirSync(join(moi, ".agents"), { recursive: true });
    writeFileSync(join(moi, ".agents", "claims.json"),
      `${JSON.stringify({ claims: { _code: { owner: "phien-A", task: "x" } } }, null, 2)}${NL}`, "utf8");
    const cli = chepLenh(moi);
    const g = (...a) => execFileSync("git", a, { cwd: moi, encoding: "utf8" });
    g("init", "-q", "-b", "main");
    g("config", "user.name", "TRA-KHOA"); g("config", "user.email", "tra-khoa@example.invalid");
    g("add", "-A"); g("commit", "-q", "-m", `nen${NL}${NL}Lane: phien-A`);
    const r = spawnSync(process.execPath, [cli, "--release", "_code", "--as", "phien-A"], { encoding: "utf8" });
    assert.equal(r.status, EXIT.OK,
      `repo chua co origin thi KHONG duoc chan — chan o day la khoa cung repo moi dung. Ra: ${r.stdout}${r.stderr}`);
    assert.equal(JSON.parse(readFileSync(join(moi, ".agents", "claims.json"), "utf8")).claims._code.owner, null,
      "va no phai ve trong that");
  } finally { rmSync(moi, { recursive: true, force: true }); }

  // CA H — KHÔNG phải repo git thì TỪ CHỐI. Đây là ca ĐỐI của ca D, và gộp hai ca này lại là
  // đúng fail-open đã bị loại nhiều lần: "không đọc được git" bị đội lốt "repo mới, cho qua".
  const troc = mkdtempSync(join(tmpdir(), "claim-khong-git-tra-"));
  try {
    mkdirSync(join(troc, ".agents"), { recursive: true });
    writeFileSync(join(troc, ".agents", "claims.json"),
      `${JSON.stringify({ claims: { _code: { owner: "phien-A", task: "x" } } }, null, 2)}${NL}`, "utf8");
    const cli = chepLenh(troc);
    const r = spawnSync(process.execPath, [cli, "--release", "_code", "--as", "phien-A"], { encoding: "utf8" });
    assert.equal(r.status, EXIT.REFUSED,
      `khong doc duoc git = KHONG BIET, va khong biet phai la DO. Ra: ${r.stdout}${r.stderr}`);
    assert.match(`${r.stdout}${r.stderr}`, /KHONG_DEM_DUOC_COMMIT/, "phai co ma loi doc duoc");
    assert.equal(JSON.parse(readFileSync(join(troc, ".agents", "claims.json"), "utf8")).claims._code.owner, "phien-A",
      "TU CHOI nghia la KHONG GHI GI");
  } finally { rmSync(troc, { recursive: true, force: true }); }
  ok("TRA-KHOA-01 · chưa có remote thì KHÔNG chặn (bootstrap thật) · không đọc được git thì CHẶN (bất biến ④) — hai ca KHÔNG được gộp");
}

/* ---- N-15 · NỐI `claim.mjs` VÀO MỘT ỐNG LÀM CÚ TỪ CHỐI CỦA NÓ BIẾN MẤT --------------------
 *
 * Ca thật 06/09 (`claude-gemini-hoan-thien`):
 *
 *     node scripts/claim.mjs --take _root --as <phiên> ... | tail -3 && git commit ...
 *
 * Lệnh nhận khoá TỪ CHỐI đúng như phải thế (`_root` vừa bị lane khác nhận). Nhưng mã thoát của
 * một đường ống là mã thoát của lệnh CUỐI — tức `tail`, luôn là 0. Nên `&&` vẫn chạy, và
 * `git commit` ghi vào một vùng lane đó KHÔNG có quyền.
 *
 * Vì sao nó nguy hiểm hơn vẻ ngoài: `claim.mjs` được thiết kế rất cẩn thận để từ chối đúng lúc,
 * và nó ĐÃ từ chối đúng. Lớp bảo vệ chạy hoàn hảo rồi bị MỘT KÝ TỰ ống NUỐT MẤT. Ai nhìn màn
 * hình cũng thấy chữ `TU_CHOI` — nhưng vào lúc đó lệnh sau đã chạy xong rồi.
 *
 * KHÔNG CÓ ĐƯỜNG SỬA TRONG SCRIPT. Mã thoát bị nuốt ở tầng shell, ngoài tầm với của tiến trình
 * node; còn bắt `claim.mjs` từ chối chạy khi stdout không phải màn hình thì giết mọi lượt gọi
 * trong test và trong công cụ khác. Nên chốt nằm ở LUẬT (`AGENTS.md` mục 1), và phép ghim này
 * giữ hai vế:
 *   ⑴ chứng minh cái bẫy CÓ THẬT và vẫn còn nguyên — shell nào đó đổi nết thì phép này đỏ, và
 *     lúc đó ta biết dòng luật kia đã thành thừa;
 *   ⑵ canh chính dòng luật đó trong `AGENTS.md` mục 1 — một luật không ai canh thì nó biến mất
 *     trong im lặng, đúng bài học của N-01.
 */
{
  const temp = mkdtempSync(join(tmpdir(), "claim-ong-"));
  try {
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: temp, encoding: "utf8" });
    mkdirSync(join(temp, ".agents"), { recursive: true });
    writeFileSync(join(temp, ".agents", "claims.json"),
      `${JSON.stringify({ claims: { _root: { owner: "lane-khac", task: "dang lam" } } }, null, 2)}`, "utf8");
    const cli = chepLenh(temp);

    // Chạy TRẦN: từ chối, mã thoát 3. Đây là hành vi đúng, và nó vẫn đúng.
    const tran = spawnSync(process.execPath, [cli, "--take", "_root", "--as", "toi", "--task", "x"], { cwd: temp, encoding: "utf8" });
    assert.equal(tran.status, EXIT.REFUSED, "chay tran: phai TU CHOI voi ma thoat 3");

    // Chạy QUA ỐNG: cùng cú từ chối đó, nhưng mã thoát của cả chuỗi là 0. Cái bẫy.
    const ONG = String.fromCharCode(124);
    const lenh = `"${process.execPath}" "${cli}" --take _root --as toi --task x ${ONG} tail -3`;
    const ong = spawnSync(lenh, { cwd: temp, encoding: "utf8", shell: true });
    assert.equal(ong.status, 0,
      "BAY CUA N-15: ma thoat cua mot duong ong la ma thoat cua lenh CUOI, nen cu TU CHOI bien mat."
      + ` Ca nay doi thanh khac 0 nghia la cai bay het, va dong luat trong AGENTS.md muc 1 thanh thua. Ra: ${ong.status}`);
    assert.equal(JSON.parse(readFileSync(join(temp, ".agents", "claims.json"), "utf8")).claims._root.owner, "lane-khac",
      "du bi nuot ma thoat, ban quyen KHONG duoc doi chu — TU CHOI van la KHONG GHI GI");

    // Vế ⑵. Ghim vào MỤC 1, không phải cả file: một dòng cấm nằm lạc ở mục khác thì người đang
    // đọc luật khoá không gặp nó.
    const agents = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "..", "AGENTS.md"), "utf8");
    // Neo theo NỘI DUNG, không theo số mục. Bản cũ cắt giữa "## 1. " và "## 2. " và nó đỏ ngay
    // lượt sắp xếp lại mục ngày 09/09 — số mục là VỊ TRÍ, và vị trí đổi mỗi lượt nén
    // (`RULE-COMPILER.md` mục 6 nói đúng điều này, phép ghim này thì chưa nghe). Mục khoá là mục
    // gọi tên bảng quyền: không có mục thứ hai nào nhắc `.agents/claims.json`.
    const cacMuc = agents.split(/\n(?=## )/);
    const mucKhoa = cacMuc.filter((m) => m.includes(".agents/claims.json"));
    assert.equal(mucKhoa.length, 1,
      `phai co DUNG MOT muc noi ve bang quyen trong AGENTS.md, thay ${mucKhoa.length} — cau truc doi?`);
    assert.ok(/pipe|ống/.test(mucKhoa[0]) && mucKhoa[0].includes("claim.mjs"),
      "muc KHOA cua AGENTS.md phai co dong cam noi claim.mjs vao ong — N-15. Do la chot duy nhat cho cai bay tren.");
    ok("N-15 · cu TU CHOI cua claim.mjs bien mat khi noi ong (bay con nguyen), va muc khoa co dong cam");
  } finally { rmSync(temp, { recursive: true, force: true }); }
}

/* ---- MỞ MỘT VÙNG DÙNG CHUNG — N-41 ----------------------------------------
 *
 * Ca thật 07–08/09 khi mở `workers/_shared/`: cả ba cửa đóng, nên người đầu tiên phải **sửa tay
 * `claims.json` rồi `--restamp`** — đúng thao tác luật cảnh báo nặng nhất. Nó chạy được; vấn đề
 * là một đường HỢP LỆ trông giống hệt một vụ cướp khoá, nên lần sau không ai phân biệt nổi.
 *
 * Ghim vế bán hàng của cửa này, không chỉ vế "nó chạy": **nó KHÔNG được chạm chủ của khoá nào**,
 * và nó phải từ chối khi cấu hình chưa công nhận vùng đó — nếu không thì nó chỉ là `--restamp`
 * đội tên mới. */
{
  const cauHinh = { areas: { "workers/": { ownership_mode: "per-package", claim_prefix: "workers/" } } };
  const pfx = ["workers/"];
  const coHet = () => true;

  assert.equal(kiemKhoaKhaiDuoc("workers/moi", { structure: cauHinh, prefixes: pfx, coThuMuc: coHet }).ok, true,
    "vung da khai trong cau hinh + co thu muc that thi khai duoc");

  const laKhoa = kiemKhoaKhaiDuoc("khong-thuoc-vung-nao", { structure: cauHinh, prefixes: pfx, coThuMuc: coHet });
  assert.equal(laKhoa.ok, false, "cau hinh chua cong nhan thi TU CHOI");
  assert.match(laKhoa.ly_do, /areas/, "cau bao phai chi ra cho phai khai truoc");

  const khongCo = kiemKhoaKhaiDuoc("workers/moi", { structure: cauHinh, prefixes: pfx, coThuMuc: () => false });
  assert.equal(khongCo.ok, false, "thu muc chua co tren dia thi TU CHOI — khoa cho vung khong ton tai la rac");

  for (const xau of ["", "   ", " workers/moi", "workers/moi "]) {
    assert.equal(kiemKhoaKhaiDuoc(xau, { structure: cauHinh, prefixes: pfx, coThuMuc: coHet }).ok, false,
      `ten khoa "${xau}" phai bi tu choi`);
  }
  ok("kiemKhoaKhaiDuoc: hoi chinh bo quy vung, tu choi vung la va ten dinh khoang trang");
}

{
  const temp = mkdtempSync(join(tmpdir(), "claim-khai-"));
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    writeFileSync(claimsPath, JSON.stringify({ claims: CLAIMS() }, null, 2) + "\n", "utf8");
    writeFileSync(join(temp, ".repo-structure.json"), JSON.stringify({
      areas: { "workers/": { ownership_mode: "per-package", claim_prefix: "workers/" } },
    }, null, 2) + "\n", "utf8");
    mkdirSync(join(temp, "workers", "_chung"), { recursive: true });
    chepLenh(temp);
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: temp, encoding: "utf8" });

    const run = (...args) => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8" });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));

    // Trước cửa này: `--take` một khoá chưa khai là ngõ cụt, và lối thoát duy nhất là sửa tay.
    assert.equal(run("--take", "workers/_chung", "--as", "phien-B", "--task", "x").code, EXIT.MISUSE,
      "chua khai thi --take van phai la ngo cut — cua moi KHONG duoc noi long cua cu");

    const truoc = doc().claims;
    const kq = run("--khai-vung", "workers/_chung", "--as", "phien-B");
    assert.equal(kq.code, EXIT.OK, `khai vung hop le phai thoat 0 — ra: ${kq.out}`);
    const sau = doc().claims;
    assert.equal(sau["workers/_chung"].owner, null, "vung moi phai TRONG CHU, khong tu gan cho nguoi khai");
    for (const k of Object.keys(truoc)) {
      assert.equal(sau[k].owner, truoc[k].owner, `khai vung KHONG duoc cham chu cua "${k}"`);
    }
    assert.ok(doc()._fingerprint, "phai dong lai dau, khong de bang vo dau roi cong do voi MOI phien");

    // Và sau khi khai thì đường thường phải thông — nếu không thì cửa này vô dụng.
    assert.equal(run("--take", "workers/_chung", "--as", "phien-B", "--task", "lam gi do").code, EXIT.OK,
      "khai xong thi --take phai chay duoc");
    assert.equal(doc().claims["workers/_chung"].owner, "phien-B");

    assert.equal(run("--khai-vung", "workers/_chung", "--as", "phien-B").code, EXIT.MISUSE,
      "khai lai mot khoa da co phai bao dung sai, dung im lang ghi de");
    assert.equal(doc().claims["workers/_chung"].owner, "phien-B", "va TUYET DOI khong xoa chu dang giu");
    ok("chay THAT: khai vung moi mo duoc duong --take, va khong cham chu cua khoa nao");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-khai-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- KHOÁ MỨC FILE: giữ ngắn, trả ngay (Đức chốt 2026-09-08) --------------
 *
 * Số đo dựng nên nó: **2.628 cặp commit khác lane, cách nhau ≤ 1 giờ, cùng vùng** — trong đó
 * **1.839 cặp (70%) không đụng file nào chung**. Bảy phần mười lượt chặn hôm nay là chặn oan.
 *
 * Ghim CẢ HAI CHIỀU của luật chứa nhau. Thiếu một chiều là hai lane cùng tin mình được ghi một
 * file, và không lớp nào kêu — đúng loại hỏng im lặng mà bảng quyền sinh ra để chặn. */
{
  const vungCua = () => "_code";
  const trong = { claims: { _code: { owner: null } }, tam: {} };

  const a = quyetDinhSua(trong, { duongDan: "scripts/x.mjs", as: "p1", luc: "2026-09-08T10:00", vungCua });
  assert.equal(a.code, EXIT.OK, "file trong, vung trong: nhan duoc");
  assert.equal(a.next["scripts/x.mjs"].owner, "p1");

  const lai = quyetDinhSua({ ...trong, tam: a.next }, { duongDan: "scripts/x.mjs", as: "p1", luc: "2026-09-08T10:01", vungCua });
  assert.equal(lai.code, EXIT.OK, "chay lai cung lenh phai an toan, khong phai loi");
  assert.equal(lai.already, true);

  const cuop = quyetDinhSua({ ...trong, tam: a.next }, { duongDan: "scripts/x.mjs", as: "p2", luc: "2026-09-08T10:02", vungCua });
  assert.equal(cuop.code, EXIT.REFUSED, "file lane khac dang sua: TU CHOI");
  assert.match(cuop.message, /TU_CHOI_SUA/);

  // CHIỀU MỘT: ai giữ cả vùng thì được ghi mọi file trong đó.
  const coChuVung = { claims: { _code: { owner: "p9" } }, tam: {} };
  assert.equal(quyetDinhSua(coChuVung, { duongDan: "scripts/x.mjs", as: "p2", luc: "t", vungCua }).code, EXIT.REFUSED,
    "vung co chu khac thi khoa file KHONG chen vao giua duoc");
  assert.equal(quyetDinhSua({ claims: { _code: { owner: "p2" } }, tam: {} }, { duongDan: "scripts/x.mjs", as: "p2", luc: "t", vungCua }).code, EXIT.OK,
    "chinh minh giu vung thi van khoa file duoc");

  // CHIỀU HAI: nhận cả vùng phải thấy khoá file của người khác bên trong.
  const vuong = khoaFileTrongVung({ claims: {}, tam: a.next }, "_code", "p2", vungCua);
  assert.deepEqual(vuong.map((v) => v.owner), ["p1"], "phai neu ten nguoi dang giu file ben trong");
  assert.deepEqual(khoaFileTrongVung({ claims: {}, tam: a.next }, "_code", "p1", vungCua), [],
    "khoa file CUA CHINH MINH khong duoc chan luot nhan vung cua chinh minh");

  assert.equal(quyetDinhSua(trong, { duongDan: "../ngoai-repo.md", as: "p1", luc: "t", vungCua }).code, EXIT.MISUSE,
    "duong dan thoat ra ngoai repo: bao dung sai");
  ok("khoa file: chua nhau HAI CHIEU, chay lai an toan, chan duong dan la");
}

{
  const tam = { "a.md": { owner: "p1", luc: "t" }, "b.md": { owner: "p2", luc: "t" } };
  const bang = { claims: {}, tam };

  const ho = quyetDinhXong(bang, { duongDan: "b.md", as: "p1" });
  assert.equal(ho.code, EXIT.REFUSED, "tra ho nguoi khac: TU CHOI");

  const minh = quyetDinhXong(bang, { duongDan: "a.md", as: "p1" });
  assert.equal(minh.code, EXIT.OK);
  // XOÁ HÀNG chứ không để `owner: null` — khoá file là tạm; giữ hàng trống thì sau một ngày
  // bảng đầy xác đường dẫn và không ai đọc nổi nó.
  assert.ok(!("a.md" in minh.next), "tra xong phai XOA HANG, khong de lai hang trong");
  assert.ok("b.md" in minh.next, "va KHONG duoc dung vao hang cua nguoi khac");

  assert.equal(quyetDinhXong(bang, { duongDan: "chua-ai-khoa.md", as: "p1" }).already, true,
    "tra cai chua khoa: khong phai loi");
  ok("tra khoa file: xoa hang, khong tra ho, tra thua khong phai loi");
}

{
  /* DẤU NIÊM PHONG PHẢI PHỦ KHỐI MỚI — nhưng KHÔNG được đổi dấu khi chưa ai khoá file nào.
     Băm thẳng {claims, tam} là làm MỌI bảng đang tồn tại thấy DAU_VO ngay lượt sau, tức một
     cải tiến làm cổng của người khác đỏ vì chuyện họ không liên quan. */
  const c = { _code: { owner: "p1", task: "x" } };
  assert.equal(claimsFingerprint(c), claimsFingerprint(c, {}),
    "khoi `tam` RONG thi dau phai y het hom qua — khong duoc lam ca repo do vi mot cai tien");
  assert.equal(claimsFingerprint(c), claimsFingerprint(c, undefined), "thieu han khoi `tam` cung vay");
  const co = { "a.md": { owner: "p1", luc: "t" } };
  assert.notEqual(claimsFingerprint(c), claimsFingerprint(c, co),
    "co khoa file thi dau PHAI khac — khong thi sua tay khoi do lot qua");
  assert.notEqual(claimsFingerprint(c, co), claimsFingerprint(c, { "a.md": { owner: "p2", luc: "t" } }),
    "doi chu mot khoa file phai lam vo dau");
  ok("dau niem phong phu khoi khoa file, va khong doi dau khi khoi rong");
}

{
  /* SOÁT ĐÃ DÀN — vá cái mà khoá file KHÔNG chữa: hai lane dùng chung MỘT cây git, nên
     `git commit -a` cuốn file lane khác vừa dàn (N-40, no that 07/09). */
  const vungCua = (d) => (d.startsWith("scripts/") ? "_code" : "_root");
  const chung = {
    tam: { "scripts/cua-toi.mjs": { owner: "p1", luc: "t" }, "scripts/cua-ho.mjs": { owner: "p2", luc: "t" } },
    claims: { _code: { owner: null }, _root: { owner: "p2" } },
    as: "p1",
    mienKhoa: ["BACKLOG.md"],
    vungCua,
  };
  const la = soatDanHang({ ...chung, daDan: ["scripts/cua-toi.mjs", "scripts/cua-ho.mjs", "BACKLOG.md", "AGENTS.md"] }).la;
  assert.deepEqual(la.map((x) => x.duongDan), ["scripts/cua-ho.mjs", "AGENTS.md"],
    "chi neu ten file KHONG thuoc quyen ghi: file minh khoa thi qua, so mien khoa thi qua");
  assert.equal(la[0].chuFile, "p2", "phai noi ro ai dang giu, de nguoi doc biet nhan ai");

  /* ARTIFACT MÁY SINH KHÔNG ĐÒI KHOÁ NÀO (AGENTS.md mục 1) — và bỏ sót danh sách này làm phép
     soát BÁO OAN ngay lượt dùng thật đầu tiên 08/09: nó chặn ba artifact mà không ai sở hữu.
     Một cỗ máy dựng ra để chống chặn oan mà tự chặn oan thì nó bị bỏ qua trong một ngày. */
  const daySinh = soatDanHang({
    ...chung, as: "p1", maySinh: ["DASHBOARD.md", "llms.txt"],
    daDan: ["DASHBOARD.md", "llms.txt", "AGENTS.md"],
  });
  assert.deepEqual(daySinh.la.map((x) => x.duongDan), ["AGENTS.md"],
    "artifact may sinh khong duoc coi la file LA — khong co gi cua ai trong do de mat");
  assert.deepEqual(daySinh.soChung, [],
    "va cung KHONG phai so: bo sinh viet lai ca file moi luot, soi append-only la bao oan lan hai");
  assert.deepEqual(soatDanHang({ ...chung, as: "p2", daDan: ["AGENTS.md"] }).la, [],
    "p2 giu ca vung _root nen AGENTS.md la cua ho — khong duoc bao oan");
  ok("soat da dan: bat dung file khong thuoc quyen, tha so mien khoa va vung minh giu");
}

{
  /* CHẠY THẬT — ba phép trên chỉ kiểm phần quyết định. Vế đắt nhất là vế Đức mua: HAI LANE
     SỬA HAI FILE KHÁC NHAU TRONG CÙNG MỘT VÙNG thì CẢ HAI phải đi được. Đó là 70% số lượt
     bị chặn hôm nay. */
  const temp = mkdtempSync(join(tmpdir(), "claim-file-"));
  try {
    const claimsPath = join(temp, ".agents", "claims.json");
    mkdirSync(dirname(claimsPath), { recursive: true });
    // `_code` khong co trong CLAIMS() mac dinh, ma moi file khoa o day deu quy ve no.
    writeFileSync(claimsPath, JSON.stringify({ claims: { ...CLAIMS(), _code: { owner: null, ai: null, task: "", released_at: null } } }, null, 2) + "\n", "utf8");
    writeFileSync(join(temp, ".repo-structure.json"), JSON.stringify({
      areas: {
        "scripts/": { ownership_mode: "root", steward: "_code", mutability: "rw" },
        "workers/": { ownership_mode: "per-package", claim_prefix: "workers/" },
      },
      append_only_exempt: ["BACKLOG.md"],
    }, null, 2) + "\n", "utf8");
    mkdirSync(join(temp, "scripts"), { recursive: true });
    chepLenh(temp);
    execFileSync("git", ["init", "-q", "-b", "main"], { cwd: temp, encoding: "utf8" });

    const run = (...args) => {
      const r = spawnSync(process.execPath, [join(temp, "scripts", "claim.mjs"), ...args], { encoding: "utf8", cwd: temp });
      return { code: r.status, out: `${r.stdout ?? ""}${r.stderr ?? ""}` };
    };
    const doc = () => JSON.parse(readFileSync(claimsPath, "utf8"));

    // VẾ ĐỨC MUA: hai lane, hai file khác nhau, CÙNG vùng `_code` → cả hai đi được.
    assert.equal(run("--sua", "scripts/a.mjs", "--as", "p1").code, EXIT.OK, "lane 1 khoa file a");
    const hai = run("--sua", "scripts/b.mjs", "--as", "p2");
    assert.equal(hai.code, EXIT.OK, `lane 2 khoa file KHAC trong CUNG vung phai di duoc — ra: ${hai.out}`);
    assert.equal(doc().tam["scripts/a.mjs"].owner, "p1");
    assert.equal(doc().tam["scripts/b.mjs"].owner, "p2");

    // Cùng một file thì vẫn chặn.
    assert.equal(run("--sua", "scripts/a.mjs", "--as", "p2").code, EXIT.REFUSED, "cung mot file thi van chan");

    // MỘT MẺ LÀ MỘT LƯỢT: xin 2 file mà 1 file vướng thì KHÔNG được nhận nửa vời.
    const nuaVoi = run("--sua", "scripts/c.mjs", "scripts/a.mjs", "--as", "p2");
    assert.equal(nuaVoi.code, EXIT.REFUSED);
    assert.ok(!doc().tam["scripts/c.mjs"], "vuong mot file thi CA ME khong duoc ghi — nua voi la trang thai te nhat");

    // Chiều hai: nhận cả vùng phải từ chối khi bên trong còn khoá file của người khác.
    const caVung = run("--take", "_code", "--as", "p3", "--task", "x");
    assert.equal(caVung.code, EXIT.REFUSED, "nhan ca vung khi ben trong con khoa file cua nguoi khac: TU CHOI");
    assert.match(caVung.out, /scripts\/a\.mjs/, "phai ke ten file dang vuong");

    // Trả hết rồi thì đường cũ thông lại.
    assert.equal(run("--xong", "--het", "--as", "p1").code, EXIT.OK);
    assert.equal(run("--xong", "--het", "--as", "p2").code, EXIT.OK);
    assert.deepEqual(doc().tam, {}, "tra het thi khoi `tam` phai RONG, khong con xac duong dan");
    assert.equal(run("--take", "_code", "--as", "p3", "--task", "x").code, EXIT.OK, "het khoa file thi nhan ca vung duoc");

    // Dấu niêm phong phải còn khớp sau tất cả những lượt trên.
    const d = doc();
    assert.equal(d._fingerprint, claimsFingerprint(d.claims, d.tam), "moi luot ghi deu phai dong lai dau");
    ok("chay THAT: hai lane sua hai file cung vung deu di duoc; me nua voi bi chan; chua nhau hai chieu");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-file-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

{
  /* SỔ MIỄN KHOÁ KHÔNG ĐƯỢC IM LẶNG BỎ QUA — N-05.
   *
   * `BACKLOG.md` · `HANDOFF.md` · `IDEAS.md` miễn khoá KHI CHỈ THÊM DÒNG Ở CUỐI, nên nhiều lane
   * cùng ghi vào chúng một cách HỢP LỆ — chỗ va chạm **được thiết kế ra**, không phải tai nạn.
   * Và đó đúng là chỗ `N-05` nổ hai lần trong một buổi 06/09: `git commit -o BACKLOG.md` giới
   * hạn đường dẫn rồi lấy TRỌN nội dung cây làm việc của đường dẫn ấy.
   *
   * Bản đầu của `soatDanHang` bỏ qua hẳn nhóm này (`if (mien.has(d)) continue`), tức im lặng ở
   * đúng chỗ nguy nhất. Nay nó trả về riêng để bên gọi soi tiếp bằng `appendOnlyAtEof`. */
  const vungCua = () => "_root";
  const kq = soatDanHang({
    daDan: ["BACKLOG.md", "HANDOFF.md", "scripts/x.mjs"],
    tam: { "scripts/x.mjs": { owner: "p1" } },
    claims: { _root: { owner: null } },
    as: "p1",
    mienKhoa: ["BACKLOG.md", "HANDOFF.md", "IDEAS.md"],
    vungCua,
  });
  assert.deepEqual(kq.soChung.map((x) => x.duongDan), ["BACKLOG.md", "HANDOFF.md"],
    "so mien khoa phai duoc TRA VE RIENG, khong duoc im lang bo qua — day la cho N-05 no");
  assert.deepEqual(kq.la, [], "file minh dang khoa thi khong phai la");

  // Sổ chung KHÔNG được lẫn vào danh sách "lạ": ghi vào chúng là hợp lệ, chặn là khoá cửa ra.
  const chiSo = soatDanHang({
    daDan: ["IDEAS.md"], tam: {}, claims: { _root: { owner: "nguoi-khac" } }, as: "p1",
    mienKhoa: ["IDEAS.md"], vungCua,
  });
  assert.deepEqual(chiSo.la, [], "so mien khoa KHONG bi coi la la, du vung co chu khac");
  assert.deepEqual(chiSo.soChung.map((x) => x.duongDan), ["IDEAS.md"]);
  assert.equal(chiSo.soChung[0].coQuyen, false, "vung co chu khac thi khong co quyen viet lai");
  /* GIỮ KHOÁ THÌ ĐƯỢC VIẾT LẠI MỘT SỔ MIỄN KHOÁ — và bản đầu KHÔNG cho, dù giữ đủ khoá.
     "Miễn khoá" nghĩa là *thêm dòng ở cuối thì không CẦN khoá*; nó không có nghĩa là *có khoá
     cũng không được sửa*. Hệ quả đo thật 09/09: lượt cắt `HANDOFF.md` mà ADR-0008 cho phép
     tường minh không có đường nào qua nổi `--soat`, và cửa duy nhất còn lại là `--no-verify`
     — tức tắt cả phép soát để làm một việc hợp lệ. Một cổng chỉ mở được bằng cách tắt nó thì
     nó sẽ bị tắt thường xuyên, và lần sau người ta tắt nó cho một việc KHÔNG hợp lệ. */
  {
    const coKhoaFile = soatDanHang({
      daDan: ["HANDOFF.md"], tam: { "HANDOFF.md": { owner: "p1" } }, claims: { _root: { owner: null } },
      as: "p1", mienKhoa: ["HANDOFF.md"], vungCua,
    });
    assert.equal(coKhoaFile.soChung[0].coQuyen, true, "giu khoa FILE thi duoc viet lai so do");
    const coKhoaVung = soatDanHang({
      daDan: ["HANDOFF.md"], tam: {}, claims: { _root: { owner: "p1" } },
      as: "p1", mienKhoa: ["HANDOFF.md"], vungCua,
    });
    assert.equal(coKhoaVung.soChung[0].coQuyen, true, "giu ca VUNG thi cung duoc");
    const khongKhoa = soatDanHang({
      daDan: ["HANDOFF.md"], tam: { "HANDOFF.md": { owner: "p2" } }, claims: { _root: { owner: "p2" } },
      as: "p1", mienKhoa: ["HANDOFF.md"], vungCua,
    });
    assert.equal(khongKhoa.soChung[0].coQuyen, false,
      "khong giu gi thi VAN phai chi them o cuoi — day la cho N-05 no, dung noi ra");
    assert.deepEqual(khongKhoa.la, [], "va van khong duoc coi la LA: ghi vao so chung la hop le");
  }
  ok("soat: so mien khoa tra ve RIENG de soi append-only, khong im va khong chan (N-05)");
}

{
  // Ghim ĐƯỜNG DÂY: hàm trả về đúng mà nhánh CLI không soi thì N-05 vẫn nguyên.
  const nguon = readFileSync(join(SCRIPTS_DIR, "claim.mjs"), "utf8");
  assert.ok(nguon.includes("if (coQuyen) continue;      // giữ khoá"),
    "nhanh CLI phai bo qua so minh dang giu khoa — ham biet ma CLI khong soi thi van chan oan");
  assert.match(nguon, /appendOnlyAtEof\(diff, cu2\)/,
    "nhanh --soat phai soi so chung bang appendOnlyAtEof");
  assert.match(nguon, /SOAT_SO_CHUNG/, "phai co ma loi rieng de tra duoc");
  assert.doesNotMatch(nguon, /import \{ appendOnlyAtEof[^}]*\} from "\.\/[a-z-]*claim/,
    "phai DUNG LAI ham cua repo-structure, dung viet ban sao thu ba cua luat append-only");
  ok("--soat that su soi so chung, va dung lai luat append-only san co");
}

{
  /* ---- ĐỎ GIẢ KHI NHIỀU LANE CÙNG GHI — N-33 ------------------------------
   *
   * **[ĐO 07/09, 6 lane cùng chạy]** cổng nhấp nháy đỏ 1–2 mục, và mục đỏ nào chạy riêng ngay
   * sau cũng XANH. Một câu báo sai: *"claims.json thiếu `_fingerprint`"* trong khi đọc trực
   * tiếp năm lượt đều thấy nó. Nguyên nhân: `writeFileSync` cắt file về 0 byte rồi ghi lại,
   * nên có một khe mà người đọc thấy file rỗng. Bảng bị ghi 63 lượt/ngày.
   *
   * Cái giá không nhỏ: cổng đỏ thì luật cấm đẩy, nên một lượt đỏ SAI giam commit của cả repo. */
  const temp = mkdtempSync(join(tmpdir(), "claim-n33-"));
  try {
    const f = join(temp, "claims.json");
    const day = { claims: { _root: { owner: "p1" } }, _fingerprint: "x" };
    ghiBangNguyenTu(f, JSON.stringify(day, null, 2) + "\n");
    assert.deepEqual(readClaims(f).claims, day.claims, "ghi nguyen tu roi doc lai phai ra dung ban do");
    assert.deepEqual(
      readdirSync(temp).filter((x) => x.includes("dang-ghi")), [],
      "khong duoc de lai file tam sau khi ghi xong",
    );

    /* CỐ Ý KHÔNG dựng ca "đọc trúng khe ghi rồi lượt sau lành": lớp đọc thử lại chặn bằng
       `Atomics.wait`, thứ khoá luôn vòng lặp sự kiện — nên trong một phép kiểm đồng bộ không
       có cách nào để file đổi nội dung GIỮA hai lượt thử. Dựng một ca giả vờ ở đây sẽ xanh mà
       không chứng minh gì. Tính chất thật — người đọc không bao giờ thấy nửa chừng — do LỚP
       GHI bảo đảm, và lớp đó thì kiểm được: xem ba khẳng định trên và khối cuối. */
    ok("N-33 · ghi nguyen tu: khong de lai file tam, doc lai ra dung ban do");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-n33-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

{
  /* THỬ LẠI KHÔNG ĐƯỢC BIẾN MỘT BẢNG HỎNG THẬT THÀNH HỢP LỆ. Một bảng hỏng thì hỏng ỔN ĐỊNH,
     nên ba lượt thử ra cùng một lỗi và lỗi ấy vẫn phải được ném. Thiếu vế này thì "thử lại"
     trở thành "bỏ qua", và cửa fail-closed của bảng quyền biến mất. */
  const temp = mkdtempSync(join(tmpdir(), "claim-n33b-"));
  try {
    const f = join(temp, "claims.json");
    writeFileSync(f, "{ khong phai json", "utf8");
    assert.throws(() => readClaims(f, { lan: 3, nghi: 1 }), /CLAIMS_HONG/,
      "bang hong THAT thi thu lai bao nhieu lan cung phai NEM");
    writeFileSync(f, JSON.stringify({ khong_co_khoi_claims: 1 }), "utf8");
    assert.throws(() => readClaims(f, { lan: 3, nghi: 1 }), /CLAIMS_HONG/, "thieu khoi claims cung vay");
    assert.throws(() => readClaims(join(temp, "khong-co-file.json"), { lan: 3, nghi: 1 }), /CLAIMS_KHONG_DOC_DUOC/,
      "file khong co la ket luan ON DINH — nem ngay, dung thu lai ba luot cho mot cau tra loi khong doi");
    ok("N-33 · thu lai KHONG bien mot bang hong that thanh hop le");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-n33b-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

{
  // Ghim ĐƯỜNG DÂY: mọi lượt ghi bảng phải đi qua cửa nguyên tử. Một hàm đúng mà chỗ ghi vẫn
  // gọi `writeFileSync` thẳng thì N-33 còn nguyên.
  const nguon = readFileSync(join(SCRIPTS_DIR, "claim.mjs"), "utf8");
  assert.doesNotMatch(nguon, /fs\.writeFileSync\(CLAIMS_FILE/,
    "khong duoc con luot ghi thang nao vao CLAIMS_FILE — moi luot phai qua ghiBangNguyenTu");
  assert.match(nguon, /renameSync\(tam, file\)/, "ghi nguyen tu phai la ghi-tam-roi-rename");
  ok("N-33 · moi luot ghi bang deu qua cua nguyen tu");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

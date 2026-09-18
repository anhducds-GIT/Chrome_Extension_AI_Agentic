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

import { ageHours, ageLabel, claimsFingerprint, decide, EXIT, FINGERPRINT_FIELD, fingerprintState, GIO_NHAC, ghiBangNguyenTu, khoaFileTrongVung, kiemKhoaKhaiDuoc, quyetDinhSua, quyetDinhXong, readClaims, soatDanHang } from "../scripts/claim.mjs";

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
  /* ĐỔI 18/09 (N-65): bản cũ ghim `""` — in RỖNG khi không biết tuổi. Nay là câu "không rõ từ
     khi nào", và câu đó ĐÚNG HƠN: một ô trống trong bảng đọc thành "vừa nhận", tức chỗ này
     từng nói dối theo đúng cái hướng khiến người ta giành khoá. Ghim CÂU, không ghim rỗng. */
  assert.equal(ageLabel(null), "không rõ từ khi nào", "khong biet tuoi thi phai NOI la khong biet, khong duoc im");
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
    /* BỎ 18/09 (N-65): vế "câu nhắc HỎI, đừng nhả" đã có nhà — `tests/khoa-dau-vet.mjs` vế 6
       và vế 8, và nó ghim CẢ chữ lẫn nguồn chung. Ở đây câu ấy chỉ hiện khi tín hiệu dấu vết
       ra "chưa thấy", mà thư mục tạm này không phải repo git nên tín hiệu ra "không đo được".
       Ghim lại ở đây là bản thứ hai của một luật, và là bản sẽ đỏ oan. Khối này ghim TUỔI. */

    // VẾ PHỦ ĐỊNH — quan trọng nhất cả khối.
    const cuop = run("--take", "_root", "--as", "phien-khac", "--task", "khoa nay cu roi ma");
    assert.equal(cuop.code, EXIT.REFUSED, "khoa QUA HAN van la khoa co chu — TUYET DOI khong tu doi lai");
    assert.equal(JSON.parse(readFileSync(claimsPath, "utf8")).claims._root.owner, "phien-cu",
      "va khong duoc ghi mot chu nao vao bang");

    /* Mốc mới phải có GIỜ, không chỉ ngày — nếu không thì cả khối này vô nghĩa từ lần ghi sau.
       VÀ PHẢI CÓ MÚI (18/09, N-65). Bản cũ ghim đúng hình dạng `…THH:MM`, tức một chuỗi KHÔNG
       múi giờ — và chính hình dạng đó là con bug vừa vá: `Date.parse` đọc nó là giờ ĐỊA PHƯƠNG,
       nên trên máy UTC+7 một khoá vừa nhận hiện thành "giữ 7h ⚠". Ghim TÍNH CHẤT, không ghim
       hình dạng: có giờ, và tự nói ra mình ở múi nào. */
    assert.equal(run("--take", "workers/goi-b", "--as", "phien-moi", "--task", "viec moi").code, EXIT.OK);
    const mocMoi = JSON.parse(readFileSync(claimsPath, "utf8")).claims["workers/goi-b"].claimed_at;
    assert.match(mocMoi, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/, "moc moi PHAI co gio — ngay tran la goc benh dang chua");
    assert.match(mocMoi, /([Zz]|[+-]\d{2}:?\d{2})$/, "va PHAI mang mui gio — thieu mui la doc thanh gio dia phuong");
    ok("K2-5 · --list in tuoi va nhac dung khoa cu; khoa qua han VAN khong tu doi lai duoc");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-tuoi-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
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
    assert.match(r1.out, /TU_CHOI: lượt sửa tay này CHUYỂN CHỦ/, "phai noi ro LY DO tu choi, khong chi mot ma");
    assert.match(r1.out, /_code: nan-nhan → ke-lay/, "phai noi RO khoa nao, cua ai, ve tay ai");
    assert.match(r1.out, /--duc-duyet/, "phai chi ra duong hop le, khong chi noi khong");
    // `taken_from` viết tay KHÔNG phải giấy phép — nó chỉ là chữ, công cụ chưa bao giờ sinh ra nó.
    assert.notEqual(doc()[FINGERPRINT_FIELD], claimsFingerprint(doc().claims),
      "tu choi thi KHONG duoc ghi dau moi — dau phai con vo, de cong con bao do");

    // VẾ 2 — VẾ CHỊU LỰC: có câu chốt của Đức thì đi được, VÀ xuất xứ phải nằm TRONG FILE.
    const r2 = run("--restamp", "--as", "ke-lay", "--duc-duyet", "Duc chot 04/09: chu cu da tat");
    assert.equal(r2.code, EXIT.OK, `co cau chot cua Duc thi phai di duoc. Ra: ${r2.out}`);
    const sau = doc();
    assert.equal(sau[FINGERPRINT_FIELD], claimsFingerprint(sau.claims), "di duoc thi phai dong dau that");
    /* XUẤT XỨ ĐỔI CHỖ, KHÔNG ĐỔI LUẬT (18/09, N-65). Bản cũ ghim ba trường `taken_from` ·
       `taken_by` · `duc_decision` NGAY TRONG mục khoá. Nay là một dòng nhật ký ở `_chuyen_khoa`
       mức trên cùng. Hình dạng mới đúng hơn — nó là SỔ, nên lượt đổi chủ thứ hai không đè lên
       lượt thứ nhất — nên ghim TÍNH CHẤT: ai lấy, lấy của ai, và câu chốt của Đức đều phải nằm
       TRONG FILE, vì người cần đọc chúng là nạn nhân, mà họ không chạy lệnh này. */
    const so = sau._chuyen_khoa;
    assert.ok(Array.isArray(so) && so.length === 1, `xuat xu phai ghi VAO FILE, o \`_chuyen_khoa\`. Dang co: ${JSON.stringify(sau._chuyen_khoa)}`);
    assert.equal(so[0].boi, "ke-lay", "phai ghi ai la nguoi lay");
    assert.deepEqual(so[0].khoa, ["_code: nan-nhan → ke-lay"], "phai ghi khoa nao, cua ai, ve tay ai");
    assert.equal(so[0].duc_duyet, "Duc chot 04/09: chu cu da tat",
      "cau chot cua Duc phai nam trong file — nguoi can doc no la nan nhan, ma ho khong chay lenh nay");
    assert.ok(so[0].luc, "va phai co moc: mot so khong co ngay thi khong doi chieu duoc voi git log");

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



/* ---- TRẢ QUYỀN SAU KHI ĐẨY, KHÔNG PHẢI SAU KHI COMMIT (TRA-KHOA-01) ------
 *
 * Luật `AGENTS.md` mục 1. Trước 06/09 nó chỉ là chữ, và ngày 06/09 ba lane cùng vi phạm trong
 * một buổi — cả ba đều thành thật: chúng đọc hiến pháp, không thấy luật, nên trả khoá cho sạch.
 *
 * VIẾT LẠI 18/09 (N-65). Bản cũ gọi `canDayTruocKhiTra(ketQuaDo, vung)` từ `repo-structure.mjs`
 * cùng bảng mã `CHUA_DAY`. Cả hai KHÔNG CÒN TỒN TẠI sau `4da1e9e5`: phép đo nay nằm thẳng trong
 * nhánh `--release` của `claim.mjs`, và kết quả vào `decide()` qua ĐÚNG MỘT tham số `chuaDay` —
 * một mảng mã commit, hoặc `null` nghĩa là không đo được. Nên khối này ghim `decide` trực tiếp.
 *
 * VÀ MỘT VẾ ĐÃ ĐẢO CHIỀU, ghi ra đây vì nó đúng là chỗ dễ "sửa cho xanh" nhất: bản cũ ghim
 * *"không đọc được git thì CHẶN (bất biến ④)"*. Hôm nay `chuaDay == null` **KHÔNG chặn**, và
 * `claim.mjs` nêu lý do ngay tại chỗ: trả khoá là thao tác GỠ BÍ, một lệnh gỡ bí mà tự chặn vì
 * git hỏng thì biến sự cố nhỏ thành sự cố kẹt cả vùng. Fail-closed chuyển sang cửa `--take`,
 * nơi nó đúng vì giành vùng không lùi lại được — vế đó ghim ở khối lệnh bên dưới. Đừng "khôi
 * phục" bất biến ④ ở đây: nó đã bị một quyết định có ghi lý do thay thế, không phải bị đánh rơi.
 *
 * BỐN CON ĐỘT BIẾN mà khối này phải bắt (MULTIFLOW mục 5 — chốt không có test ghim là bình luận):
 *   ① gỡ hẳn phép chặn trong `decide`        → vế ⑶
 *   ② đảo điều kiện (chặn khi mảng RỖNG)     → vế ⑴⑵
 *   ③ coi `null` là "có commit" (chặn oan)   → vế ⑵
 *   ④ lối thoát `--du-biet` mà KHÔNG ghi lý do vào bảng → vế ⑷⑸ */
{
  const nen = { _code: { owner: "phien-A", ai: "Claude", task: "x", released_at: null } };
  const tra = (them) => decide(nen, { action: "release", key: "_code", as: "phien-A", today: "2026-09-18", ...them });

  // ⑴ Không commit nào chưa đẩy → trơn. Mảng rỗng KHÔNG được đọc thành "có nợ".
  assert.equal(tra({ chuaDay: [] }).code, EXIT.OK, "mang rong = da day het = tra duoc");

  // ⑵ Không đo được → KHÔNG chặn. Đây là vế đã đảo chiều; đọc docblock trên trước khi sửa.
  assert.equal(tra({ chuaDay: null }).code, EXIT.OK,
    "khong do duoc thi KHONG chan — tra khoa la thao tac go bi (claim.mjs, nhanh release)");

  // ⑶ Có commit chưa đẩy chạm đúng vùng → TỪ CHỐI, và từ chối thì KHÔNG kèm dữ liệu ghi.
  const chan = tra({ chuaDay: ["aaa1111 viec mot", "bbb2222 viec hai"] });
  assert.equal(chan.code, EXIT.REFUSED, "con commit chua day thi phai tu choi");
  assert.equal(chan.next, undefined, "TU CHOI nghia la KHONG GHI GI");
  for (const sha of ["aaa1111", "bbb2222"]) {
    assert.ok(chan.message.includes(sha), `phai keo theo ma commit de nguoi doc biet la cai nao: ${sha}`);
  }
  assert.ok(chan.message.includes("safe-push.mjs"), "va phai chi duong ra, khong chi noi khong");

  // ⑷ Cửa thoát `--du-biet` mở được — nó là ĐIỀU KIỆN để vế ⑶ được phép tồn tại: thiếu nó thì
  //    một lane bị cổng xuất bản từ chối sẽ kẹt khoá vĩnh viễn.
  const duBiet = tra({ chuaDay: ["aaa1111 viec mot"], duBiet: "Duc chot 18/09: de lane sau cuon theo" });
  assert.equal(duBiet.code, EXIT.OK, "cua thoat phai mo duoc");
  assert.equal(duBiet.next.owner, null, "va no phai ve trong that");

  // ⑸ …nhưng cửa thoát phải GHI LẠI cái giá VÀO BẢNG. Một cửa thoát không để lại vết là một
  //    cái tặc lưỡi; ghi vào bảng thì nó là một câu khai, và lane sau đọc được.
  assert.ok(duBiet.next.tra_khi_chua_day, "cua thoat phai ghi vet vao bang, khong duoc im");
  assert.ok(String(duBiet.next.tra_khi_chua_day).includes("Duc chot 18/09"),
    "va vet phai cho ra LY DO da neu, khong phai mot co bool");
  assert.ok(!tra({ chuaDay: [] }).next.tra_khi_chua_day, "khong no thi khong duoc dan nhan khai bao");

  ok("TRA-KHOA-01 · decide: rỗng trơn · KHÔNG ĐO ĐƯỢC cũng trơn (vế đã đảo) · đúng vùng thì TỪ CHỐI không ghi gì · --du-biet mở được và ghi lý do vào bảng");
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
    assert.match(chan.out, /TU_CHOI: "_code" còn 1 commit CHƯA ĐẨY/, "phai noi ro LY DO va SO LUONG, khong chi mot ma");
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
    /* ĐỔI CHỖ 18/09 (N-65): bản cũ ghim hai trường `unpushed_reason` + `released_with_unpushed`.
       Nay là MỘT trường `tra_khi_chua_day` chở cả hai vế trong một câu. Ghim TÍNH CHẤT: bảng
       phải nói ra BAO NHIÊU commit và VÌ SAO — thiếu vế nào thì phiên sau cũng không quyết được. */
    const khai = String(doc().claims._code.tra_khi_chua_day ?? "");
    assert.match(khai, /^1 commit · /, "bang phai ghi con bao nhieu commit chua day");
    assert.ok(khai.includes("remote tu choi vi khoa 2FA, ban giao cho phien-B"),
      "cau ly do phai nam TRONG BANG, khong phai chi in ra man hinh");
    assert.equal(fingerprintState(doc()).ok, true, "ghi xong van phai dong dau");

    // CA G — dấu vết trả sớm KHÔNG được sống dai hơn lượt đó.
    assert.equal(run("--take", "_code", "--as", "phien-B", "--task", "nhan ban giao").code, EXIT.OK, "phien sau nhan duoc vung");
    assert.equal(doc().claims._code.tra_khi_chua_day, undefined,
      "nhan lai thi phai xoa dau vet tra som cu — de nguoi doc sau khong tuong van con commit vo chu");

    // CA C — đẩy xong thì trả trơn, và KHÔNG còn trường trả sớm nào.
    gw("push", "-q", "origin", "main");
    const sach = run("--release", "_code", "--as", "phien-B");
    assert.equal(sach.code, EXIT.OK, `day xong roi thi tra khoa phai troi chay. Ra: ${sach.out}`);
    assert.equal(doc().claims._code.tra_khi_chua_day, undefined, "tra binh thuong thi khong ghi truong tra som nao");
    ok("TRA-KHOA-01 · lệnh: còn commit chưa đẩy thì TỪ CHỐI mà không ghi gì · vùng khác không bị vạ lây · --du-biet phải kèm lý do và lý do vào BẢNG · đẩy xong thì trơn");
  } finally {
    assert.ok(temp.startsWith(join(tmpdir(), "claim-tra-khoa-")), "chi don dung temp fixture cua phep kiem nay");
    rmSync(temp, { recursive: true, force: true });
  }
}

/* ---- HAI CỬA, HAI CÁCH XỬ KHI KHÔNG ĐO ĐƯỢC — và đó là CHỦ Ý ---------------
 *
 * VIẾT LẠI 18/09 (N-65). Bản cũ ghim hai ca ở CÙNG MỘT CỬA (`--release`): chưa có remote thì
 * cho qua, không phải repo git thì TỪ CHỐI với mã `KHONG_DEM_DUOC_COMMIT`. Mã đó không còn tồn
 * tại: `--release` nay bọc cả phép đo trong `try` và trả `chuaDay = null`, tức KHÔNG chặn.
 *
 * Ranh giới THẬT hôm nay không nằm giữa hai loại lỗi git — nó nằm giữa HAI CỬA:
 *   · `--release` = GỠ BÍ, lùi lại được → không đo được thì cho qua;
 *   · `--take` đang GIÀNH vùng của người khác = KHÔNG lùi lại được → không đo được thì TỪ CHỐI.
 * Gộp hai cửa này là cách fail-open quay lại mà vẫn trông có lý: "không đọc được git" đội lốt
 * "repo mới, cho qua" ở đúng cái cửa mà một lượt cho qua là xoá việc đang dở của người khác.
 * Cả hai ca đi qua ĐƯỜNG LỆNH, không chỉ qua hàm thuần — hàm trả đúng mà `main()` lờ đi thì
 * cũng như không, và bài học đó đã trả giá một lần ở K2-12. */
{
  const NL = String.fromCharCode(10);
  const dungBang = (dir, claims) => {
    mkdirSync(join(dir, ".agents"), { recursive: true });
    writeFileSync(join(dir, ".agents", "claims.json"), `${JSON.stringify({ claims }, null, 2)}${NL}`, "utf8");
    return chepLenh(dir);
  };
  const chuCua = (dir) => JSON.parse(readFileSync(join(dir, ".agents", "claims.json"), "utf8")).claims._code.owner;

  // CỬA 1 — `--release` trong một thư mục KHÔNG phải repo git: vẫn phải TRƠN.
  // Repo mới dựng từ bộ khung chưa có `origin`, và một lane bị git hỏng vẫn phải trả được khoá.
  const go = mkdtempSync(join(tmpdir(), "claim-tra-khong-git-"));
  try {
    const cli = dungBang(go, { _code: { owner: "phien-A", task: "x" } });
    const r = spawnSync(process.execPath, [cli, "--release", "_code", "--as", "phien-A"], { encoding: "utf8" });
    assert.equal(r.status, EXIT.OK,
      `khong do duoc o cua --release thi KHONG duoc chan: tra khoa la thao tac go bi. Ra: ${r.stdout}${r.stderr}`);
    assert.equal(chuCua(go), null, "va no phai ve trong that");
  } finally { rmSync(go, { recursive: true, force: true }); }

  // CỬA 2 — `--take` GIÀNH vùng người khác, cùng một thư mục không phải repo git: phải TỪ CHỐI,
  // có mã đọc được, và KHÔNG ghi một chữ nào vào bảng.
  const gianh = mkdtempSync(join(tmpdir(), "claim-gianh-khong-git-"));
  try {
    const cli = dungBang(gianh, { _code: { owner: "phien-A", task: "dang lam do" } });
    const r = spawnSync(process.execPath, [cli, "--take", "_code", "--as", "phien-B", "--task", "cuop"], { encoding: "utf8" });
    assert.equal(r.status, EXIT.REFUSED,
      `khong biet vung do co file sua do hay khong thi KHONG duoc gianh. Ra: ${r.stdout}${r.stderr}`);
    assert.match(`${r.stdout}${r.stderr}`, /KHONG_DO_DUOC_VIEC_DO/, "phai co ma loi doc duoc");
    assert.equal(chuCua(gianh), "phien-A", "TU CHOI nghia la KHONG GHI GI");
  } finally { rmSync(gianh, { recursive: true, force: true }); }

  ok("hai cửa KHÔNG được gộp: `--release` không đo được thì TRƠN (gỡ bí) · `--take` đang giành thì TỪ CHỐI và không ghi gì");
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
    /* RỖNG hay VẮNG đều đạt (18/09): nay lệnh xoá hẳn khoá `tam` thay vì để lại `{}`. Luật là
       "không còn xác đường dẫn", không phải "phải có một object rỗng". */
    assert.deepEqual(Object.keys(doc().tam ?? {}), [], "tra het thi khong duoc con xac duong dan nao");
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
  assert.deepEqual(kq.soChung, ["BACKLOG.md", "HANDOFF.md"],
    "so mien khoa phai duoc TRA VE RIENG, khong duoc im lang bo qua — day la cho N-05 no");
  assert.deepEqual(kq.la, [], "file minh dang khoa thi khong phai la");

  // Sổ chung KHÔNG được lẫn vào danh sách "lạ": ghi vào chúng là hợp lệ, chặn là khoá cửa ra.
  const chiSo = soatDanHang({
    daDan: ["IDEAS.md"], tam: {}, claims: { _root: { owner: "nguoi-khac" } }, as: "p1",
    mienKhoa: ["IDEAS.md"], vungCua,
  });
  assert.deepEqual(chiSo.la, [], "so mien khoa KHONG bi coi la la, du vung co chu khac");
  assert.deepEqual(chiSo.soChung, ["IDEAS.md"]);

  /* VẾ `coQuyen` BỎ 18/09 (N-65), và nêu bằng chứng chứ không bỏ vì khó sửa. Bản cũ ghim rằng
     mỗi mục `soChung` chở một cờ `coQuyen`, để nhánh CLI phân biệt "giữ khoá → được viết lại"
     với "không giữ gì → chỉ được thêm ở cuối". Hôm nay:
       · chuỗi `coQuyen` xuất hiện 0 lần trong cả `scripts/` — hàm trả về mảng CHUỖI đường dẫn;
       · nhánh `--soat` KHÔNG từ chối vì `soChung` ở bất kỳ nhánh nào; nó in cùng một câu nhắc
         "soi lại: có đúng là CHỈ THÊM Ở CUỐI không?" cho mọi mục.
     Tức cái cờ ấy không còn người tiêu thụ, và luật nó tinh chỉnh (đừng chặn oan lượt cắt
     HANDOFF mà ADR-0008 cho phép) không còn cửa nào để chặn oan. Luật N-05 — NÊU TÊN chứ không
     im, và KHÔNG chặn — vẫn sống, và được ghim ngay trên. */
  {
    const khongKhoa = soatDanHang({
      daDan: ["HANDOFF.md"], tam: { "HANDOFF.md": { owner: "p2" } }, claims: { _root: { owner: "p2" } },
      as: "p1", mienKhoa: ["HANDOFF.md"], vungCua,
    });
    assert.deepEqual(khongKhoa.soChung, ["HANDOFF.md"], "khong giu gi thi so chung VAN phai duoc neu ten");
    assert.deepEqual(khongKhoa.la, [], "va van khong duoc coi la LA: ghi vao so chung la hop le");
  }
  ok("soat: so mien khoa tra ve RIENG de soi append-only, khong im va khong chan (N-05)");
}

{
  /* ĐƯỜNG DÂY append-only ĐÃ DỜI NHÀ — bỏ khối ghim cũ 18/09 (N-65), nêu bằng chứng.
   *
   * Bản cũ ghim bằng cách DÒ VĂN BẢN NGUỒN của `claim.mjs`: `includes('if (coQuyen) continue;
   * // giữ khoá')` · `match(/appendOnlyAtEof\(diff, cu2\)/)` · `match(/SOAT_SO_CHUNG/)`. Cả ba
   * chuỗi nay xuất hiện 0 lần — và đó là hai chuyện khác nhau gộp vào một:
   *
   *   ⑴ Kiểu ghim SAI. Dò văn bản nguồn của một file BỘ KHUNG sở hữu thì hỏng có hệ thống: mỗi
   *      lượt nâng bộ khung đổi cách viết là ghim chết, và sửa cho khớp chữ hôm nay chỉ là đặt
   *      lại đồng hồ. Đây là bài học đã trả giá ở `check-bootstrap-smoke` cùng lượt N-65 này.
   *   ⑵ Luật thì KHÔNG mất, nó ĐỔI CỬA. `--soat` nay nêu tên sổ chung kèm câu nhắc, không tự
   *      soi diff. Phép soi append-only thật chạy ở hai cửa khác, và cả hai đều có người canh:
   *        · `scripts/session-check.mjs` — hàng "Vùng CHỈ-THÊM không bị viết lại" (cổng đóng phiên)
   *        · `scripts/safe-push.mjs`     — cửa xuất bản
   *      và chính `appendOnlyAtEof` có phép ghim riêng ở `tests/repo-structure-smoke.mjs`
   *      (vế "K2-2b"), bài đang nằm trong `npm test`.
   *
   * Nên chỗ đúng của luật này là ba file trên, không phải một phép dò chuỗi ở đây. Một luật
   * một chỗ. */
  const nguon = readFileSync(join(SCRIPTS_DIR, "claim.mjs"), "utf8");
  assert.ok(!nguon.includes("coQuyen"),
    "neu `coQuyen` song lai thi no can mot phep ghim THAT (qua ham, khong qua van ban nguon) — xem docblock tren");
  ok("đường dây append-only đã dời sang session-check · safe-push · repo-structure-smoke (một luật một chỗ)");
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

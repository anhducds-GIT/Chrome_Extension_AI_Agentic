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

import { claimsFingerprint, decide, EXIT, FINGERPRINT_FIELD, fingerprintState, readClaims } from "../scripts/claim.mjs";

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

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

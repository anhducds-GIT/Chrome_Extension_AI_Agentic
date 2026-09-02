/* PHÉP KIỂM CÔNG CỤ ĐO ĐỘ LỆCH.
 *
 * Công cụ này sinh ra để trả lời "repo kia cách chuẩn bao xa" TRƯỚC khi ai đó bỏ công migrate.
 * Nên kiểu hỏng đáng sợ nhất của nó không phải là chạy sai — mà là **luôn trả lời dễ chịu**:
 * một bộ đo lúc nào cũng nói "gần đạt rồi" thì vô hại về mặt kỹ thuật và tai hại về mặt quyết
 * định, vì nó khiến người ta lên lịch cho một việc rẻ hơn sự thật.
 *
 * Vì thế mọi khối dưới đây đều dựng **hai đầu**: một repo THẬT SỰ đủ và một repo THẬT SỰ thiếu.
 * Không có đầu thiếu thì mọi khẳng định "đo đúng" đều rỗng nghĩa.
 */

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { buildTemplateFiles } from "../scripts/build-template.mjs";
import { chiPhi, coLenhTest, danhGia, mucDo, tangCuaFile, TANG, TUY_CHON } from "../scripts/assess.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const chuan = buildTemplateFiles();
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

function dungRepo(files) {
  const root = mkdtempSync(join(tmpdir(), "assess-"));
  for (const [rel, text] of files) {
    const abs = join(root, ...rel.split("/"));
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, text, "utf8");
  }
  return root;
}

/* ---- 1. Repo dựng ĐÚNG từ bộ khung: mức cao nhất, chi phí bằng 0 ---------- */
{
  const root = dungRepo(chuan);
  try {
    const dong = danhGia(root, chuan);
    const m = mucDo(dong);
    const cp = chiPhi(dong);
    assert.equal(m.muc, 3, `repo dung dung tu bo khung phai dat muc cao nhat, dang ra ${m.muc}`);
    assert.deepEqual(cp, { tha: 0, viet: 0, soi: 0 }, `khong duoc bao no cho mot repo vua dung tu chinh bo khung: ${JSON.stringify(cp)}`);
    assert.equal(coLenhTest(root), true, "bo khung phai khai scripts.test — thieu no la cong cam vinh vien");
    assert.ok(dong.every((d) => d.trangThai === "KHỚP"), "moi file phai KHOP vi day la ban sao nguyen ban");
    ok("repo dung tu bo khung: mức 3 · chi phí 0/0/0 · mọi file khớp");
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/* ---- 2. ĐẦU KIA — repo trống rỗng phải ra mức 0 --------------------------- */
{
  // Không có khối này thì khối 1 rỗng nghĩa: một hàm luôn trả `muc: 3` cũng qua được nó.
  const root = dungRepo(new Map());
  try {
    const dong = danhGia(root, chuan);
    const m = mucDo(dong);
    assert.equal(m.muc, 0, `thu muc rong phai ra muc 0, dang ra ${m.muc}`);
    assert.ok(m.ke.length > 10, "muc 0 phai kem mot cau viec-ke doc duoc, khong chi mot con so");
    assert.equal(coLenhTest(root), null, "khong co package.json thi phai tra null, khong phai false");
    const cp = chiPhi(dong);
    assert.ok(cp.tha >= 5, `repo rong phai can tha it nhat 5 file may, dang ra ${cp.tha}`);
    ok(`thư mục rỗng: mức 0 · phải thả ${cp.tha} file máy`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/* ---- 3. Repo NỬA VỜI — có luật, chưa có bộ máy --------------------------- */
{
  // Ca thật hay gặp nhất khi migrate: repo cũ có README và vài quy ước, nhưng không có công cụ
  // nào. Nếu công cụ đo gộp ca này với ca "chưa có gì" thì nó nói sai về giá: một bên cần thả
  // file, một bên cần dựng lại từ đầu.
  const nuaVoi = new Map([
    ["AGENTS.md", chuan.get("AGENTS.md")],
    [".repo-structure.json", chuan.get(".repo-structure.json")]
  ]);
  const root = dungRepo(nuaVoi);
  try {
    const dong = danhGia(root, chuan);
    const m = mucDo(dong);
    assert.equal(m.muc, 1, `co luat ma khong co bo may phai ra muc 1, dang ra ${m.muc}`);
    const cp = chiPhi(dong);
    assert.ok(cp.tha > 0, "phai noi ro con bao nhieu file may can tha");
    assert.ok(cp.viet > 0, "phai noi ro con bao nhieu file nguoi phai viet");
    ok(`repo nửa vời: mức 1 · thả ${cp.tha} · viết ${cp.viet}`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/* ---- 4. Có bộ máy nhưng KHÔNG có lưới đỡ -------------------------------- */
{
  // Đây là ca đã hỏng thật ở chính bộ khung này (02/09): năm công cụ đầy đủ, cổng chạy, mà
  // không có một phép kiểm nào và `package.json` không khai `scripts.test` — nên cổng xanh
  // vĩnh viễn mà không chạy gì. Công cụ đo PHẢI phân biệt được ca này với ca đủ bộ, nếu không
  // nó sẽ chấm một repo có cổng câm là "đạt chuẩn".
  const khongLuoi = new Map(chuan);
  khongLuoi.delete("tests/harness-smoke.mjs");
  khongLuoi.set("package.json", JSON.stringify({ name: "x", scripts: { gate: "node scripts/session-check.mjs" } }, null, 2));
  const root = dungRepo(khongLuoi);
  try {
    const dong = danhGia(root, chuan);
    assert.equal(mucDo(dong).muc, 2, "co bo may ma thieu suite phai ra muc 2, khong duoc cham la du bo");
    assert.equal(coLenhTest(root), false, "package.json khong khai scripts.test thi phai bao FALSE");
    ok("repo có bộ máy nhưng cổng câm: mức 2, và nói rõ thiếu scripts.test");
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/* ---- 5. Phân tầng phải đúng, vì cả cách chấm dựa lên nó ------------------ */
{
  assert.equal(tangCuaFile("scripts/session-check.mjs"), TANG.MAY);
  assert.equal(tangCuaFile("tests/harness-smoke.mjs"), TANG.MAY);
  assert.equal(tangCuaFile("AGENTS.md"), TANG.LUAT);
  assert.equal(tangCuaFile("docs/_TEMPLATE-adr.md"), TANG.LUAT);
  assert.equal(tangCuaFile("HANDOFF.md"), TANG.TRANG);
  // `package.json` KHÔNG được xếp tầng máy: mọi repo thật đều có bản riêng với hàng chục lệnh
  // khác, nên đòi khớp từng byte là báo nợ oan cho đúng 100% repo. Đo được ngay lần chạy đầu
  // trên chính repo này, 03/09.
  assert.equal(tangCuaFile("package.json"), TANG.TRANG,
    "package.json phai la tang TRANG — xep vao MAY la bao no oan cho moi repo that");
  ok("phân tầng: máy phải khớp · luật được lệch · trạng thái chỉ cần có");
}

/* ---- 6. File tuỳ chọn không được đếm thành nợ ---------------------------- */
{
  const thieuPhuLuc = new Map(chuan);
  for (const rel of TUY_CHON) thieuPhuLuc.delete(rel);
  const root = dungRepo(thieuPhuLuc);
  try {
    const cp = chiPhi(danhGia(root, chuan));
    assert.deepEqual(cp, { tha: 0, viet: 0, soi: 0 },
      `xoa file tuy chon di thi KHONG duoc sinh no: ${JSON.stringify(cp)}`);
    // ĐỐI CHỨNG: xoá một file BẮT BUỘC thì phải sinh nợ ngay. Không có vế này thì khối trên
    // cũng qua được với một hàm chiPhi luôn trả 0.
    const thieuThat = new Map(chuan);
    thieuThat.delete("scripts/safe-push.mjs");
    const root2 = dungRepo(thieuThat);
    try {
      assert.equal(chiPhi(danhGia(root2, chuan)).tha, 1, "xoa mot file MAY bat buoc thi phai sinh dung 1 no 'tha'");
    } finally { rmSync(root2, { recursive: true, force: true }); }
    ok(`file tuỳ chọn (${TUY_CHON.size}) không sinh nợ, file bắt buộc thì có`);
  } finally { rmSync(root, { recursive: true, force: true }); }
}

/* ---- 7. Trên chính repo này: phải đạt mức cao nhất ----------------------- */
{
  // Repo sinh ra bộ khung mà không đạt chuẩn của chính nó thì mọi thứ khác đều đáng nghi.
  const dong = danhGia(ROOT, chuan);
  const m = mucDo(dong);
  assert.equal(m.muc, 3, `repo sinh ra bo khung phai dat muc 3, dang ra ${m.muc} (${m.ten})`);
  assert.equal(coLenhTest(ROOT), true, "repo goc phai khai scripts.test");
  ok("repo sinh ra bộ khung tự đạt chuẩn của chính nó");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

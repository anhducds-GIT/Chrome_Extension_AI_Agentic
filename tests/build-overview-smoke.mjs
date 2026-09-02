/* Phép thử cho bộ sinh bảng trạng thái.
 *
 * Phép quan trọng nhất là phép CUỐI: bảng không được lộ chi tiết kỹ thuật. Đó là yêu cầu gốc
 * của Đức ("không muốn đưa các chi tiết quá kỹ thuật vào"), và nó dễ hỏng âm thầm — chỉ cần
 * một trường trong hồ sơ trạng thái đổi cách viết là đường dẫn lọt lên bảng. Bản đầu đã lọt
 * thật một đường dẫn ba tầng, và chính phép kiểm này bắt được.
 */
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createDefaultDeps } from "../scripts/build-dashboard.mjs";
import { buildOverview, IDEA_STAGES, readIdeas, shorten } from "../scripts/build-overview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const ideasDeps = (text) => ({
  fileExists: (p) => p === "IDEAS.md" && text !== null,
  readFile: () => text
});

/* ---- 1. Đọc sổ ý tưởng ---- */
{
  assert.deepEqual(readIdeas(ideasDeps(null)), [], "chua co IDEAS.md thi tra ve rong, khong nem");

  const text = [
    "# Sổ ý tưởng",
    "## Y-01 · Ý tưởng đầu",
    "- **bậc:** ý tưởng",
    "- **việc kế:** làm bước một",
    "## Y-02 · Đang xây",
    "- **bậc:** đang xây",
    "- **chủ:** phien-thu-nghiem",
    "- **việc kế:** làm bước hai",
    "## Y-03 · Đã ra khỏi phòng chờ",
    "- **bậc:** đang xây",
    "- **việc kế:** không quan trọng",
    "- **nhà:** đã thành một đơn vị riêng",
    "## Y-04 · Đã nghỉ",
    "- **bậc:** nghỉ",
    "- **việc kế:** không làm nữa"
  ].join("\n");

  const list = readIdeas(ideasDeps(text));
  assert.deepEqual(list.map((i) => i.code), ["Y-01", "Y-02", "Y-04"],
    "y tuong da dien `nha:` phai RA KHOI phong cho — con hien la dem hai lan mot viec");
  assert.deepEqual(list.map((i) => i.stage), [0, 1, 3], "xep theo bac, thap truoc");
  assert.equal(list[1].owner, "phien-thu-nghiem",
    "phai doc duoc `chu` — day la cho nhin 'ai dang lam gi' cho viec chay song song");
  assert.equal(list[0].owner, "", "khong khai chu thi de rong, khong bia");
  ok("so y tuong: doc dung bac, doc duoc chu, y tuong co nha thi roi phong cho");
}

/* ---- 2. FAIL CLOSED: khai bậc lạ thì NÉM ---- */
{
  for (const bad of ["dang xay", "ĐANG XÂY", "building", "", "ý tưởng hay"]) {
    const text = `## Y-09 · Sai bậc\n- **bậc:** ${bad}\n- **việc kế:** x\n`;
    assert.throws(() => readIdeas(ideasDeps(text)), /SO_Y_TUONG_HONG/,
      `bac "${bad}" khong hop le thi phai NEM, khong duoc im lang doan`);
  }
  // Và bốn bậc hợp lệ phải khớp MỘT-MỘT với thanh bậc bốn nút trên trang.
  assert.equal(IDEA_STAGES.size, 4, "dung bon bac, khop thanh bac bon nut");
  assert.deepEqual([...IDEA_STAGES.values()].sort(), [0, 1, 2, 3], "bac phai la 0..3 lien tuc");
  ok("FAIL CLOSED · bac la thi nem; bon bac khop thanh bac tren trang");
}

/* ---- 3. Bộ rút gọn phải cắt đường dẫn, không chỉ tên file ---- */
{
  assert.ok(!shorten("chuyển vào workers/observer-v0/v0.1.0/ theo phiên sau").includes("/"),
    "duong dan THU MUC cung phai bi cat, khong chi ten file");
  assert.ok(!shorten("sửa scripts/build-dashboard.mjs cho đúng").includes(".mjs"),
    "ten file phai bi cat");
  assert.ok(shorten("chọn A và/hoặc B").includes("và/hoặc"),
    "mot dau gach cheo la chu binh thuong, khong duoc cat oan");
  assert.ok(!shorten("đo được [ĐO 02/09] xong rồi").includes("[ĐO"),
    "nhan xuat xu la cho AI doc, khong phai cho Duc");
  ok("bo rut gon: cat duong dan va nhan ky thuat, khong cat oan chu thuong");
}

/* ---- 4. BẤT BIẾN — bảng không lộ chi tiết kỹ thuật.
     Đo trên repo THẬT, vì cái hỏng ở đây đến từ nội dung hồ sơ trạng thái chứ không từ mã
     bộ sinh. Fixture giả sẽ không bao giờ dựng lại được ca hỏng thật. ---- */
{
  const { html, stats } = buildOverview(createDefaultDeps(ROOT));
  const body = html.slice(html.indexOf('<div class="wrap">'));

  for (const [pattern, why] of [
    [/workers\//, "duong dan thu muc"],
    [/scripts\//, "duong dan thu muc"],
    [/\.mjs\b/, "ten file ma"],
    [/\.json\b/, "ten file cau hinh"],
    [/\b[0-9a-f]{7,40}\b/, "chuoi giong ma commit"]
  ]) {
    assert.ok(!pattern.test(body), `bang KHONG duoc chua ${why} (khop ${pattern}) — Duc doc bang, khong doc repo`);
  }

  // Con số phải là số đo thật, không phải chỗ trống trang trí.
  assert.ok(stats.initiatives > 0, "phai co it nhat mot huong dang chay");
  assert.ok(stats.decisions > 0, "phai dem duoc quyet dinh da chot");
  assert.match(stats.stamp, /^\d{4}-\d{2}-\d{2}$/, "ngay sinh phai co that va dung hinh dang");
  ok("BAT BIEN tren repo that: bang khong lo duong dan / ten file / ma commit");
}

/* ---- 5. Cờ cũ bật theo ngày, không theo cảm giác ---- */
{
  const deps = createDefaultDeps(ROOT);
  const fresh = buildOverview(deps, { today: Date.parse("2026-09-02T12:00:00Z") });
  const old = buildOverview(deps, { today: Date.parse("2026-10-02T12:00:00Z") });
  assert.equal(fresh.stats.stale, false, "moi sinh thi khong bat co");
  assert.equal(old.stats.stale, true, "qua 7 ngay thi PHAI bat co");
  // Tim THE duoc ve ra, khong tim ten class — ten class luon co trong CSS nen phep kiem ban
  // dau do do va chinh no bao lam. Do la mot phep kiem GIA neu khong sua.
  const BANNER = '<div class="stalebanner">';
  assert.ok(!fresh.html.includes(BANNER), "khong cu thi khong ve banner");
  assert.ok(old.html.includes(BANNER), "cu thi PHAI ve banner do");
  assert.ok(old.html.includes(String(old.stats.ageDays)), "banner phai noi ro cu bao nhieu ngay");
  ok("co cu bat theo ngay do duoc, va banner noi ro so ngay");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

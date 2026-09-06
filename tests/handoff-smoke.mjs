/* Phép ghim cho `scripts/handoff.mjs` — trần độ dài mục nhật ký + xoay file theo tháng.
 * Đề bài: ADR-0011 · `docs/protocols/HANDOFF.md` · `docs/briefs/BRIEF-HANDOFF-TRAN-01.md`.
 *
 * Mỗi khối dưới đây ghim MỘT cách hỏng đã trả giá thật trong repo này, không phải một cách
 * hỏng tưởng tượng. Tên khối nói cách hỏng đó.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  datThang, docMuc, docMucTuFile, laNhatKy, mucMoi, soLuuTruTiepTheo, tachThan, tenLuuTru,
  thangCua, thangHienTai, vuotTran, xoay
} from "../scripts/handoff.mjs";
import { handoffCapFrom } from "../scripts/repo-structure.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const CAC_FILE = [
  "HANDOFF.md",
  "workers/duc-auto-chatgpt/v0.1.0/HANDOFF.md",
  "workers/duc-auto-gemini/v0.2.0/HANDOFF.md",
  "workers/duc-auto-gg-flow-video/v0.1.0/HANDOFF.md"
];

const mau = (mucs, dau = "# H\n\n## Log\n\n") => dau + mucs.join("");
const mucCo = (tieuDe, byte) => `## ${tieuDe}\n${"x".repeat(Math.max(0, byte - tieuDe.length - 5))}\n\n`;

/* (1) BỘ ĐO PHẢI KHỚP TRÊN FILE THẬT.
   "Ra 0 chỗ khớp" đọc y hệt "không có gì phải sửa" — ngày 06/09 đúng cái nhầm đó xảy ra với
   NĂM lane khác nhau trong repo này. Nên phép ghim đầu tiên không kiểm logic, nó kiểm rằng
   mỏ neo còn bám vào file thật. */
{
  let tong = 0;
  for (const f of CAC_FILE) {
    const n = docMucTuFile(doc(f)).length;
    assert.ok(n > 0, `khong bo duoc muc nao trong ${f} — bo do HONG, khong phai "khong co gi"`);
    tong += n;
  }
  assert.ok(tong >= 30, `chi bo duoc ${tong} muc tren toan repo, qua it — mo neo dang truot`);
}

/* (1b) "LÀ NHẬT KÝ" HỎI THEO NỘI DUNG, KHÔNG HỎI THEO TÊN FILE.
   Sự cố thật 06/09, ngay lượt chạy cổng đầu tiên của cơ chế này: `docs/protocols/HANDOFF.md` —
   sổ tay LUẬT — cũng có tên kết thúc bằng `HANDOFF.md`, nên nó bị đòi khai mốc tháng và cổng ĐỎ
   với một file không hề là nhật ký. */
{
  for (const f of CAC_FILE) assert.ok(laNhatKy(doc(f)), `${f} phai duoc nhan ra la nhat ky`);
  assert.equal(laNhatKy(doc("docs/protocols/HANDOFF.md")), false,
    "so tay luat KHONG phai nhat ky — loc theo ten file la chan oan mot file khong co muc nao");
  assert.equal(laNhatKy(""), false);
  assert.equal(laNhatKy("## Log của tôi"), false, "phai dung dong `## Log`, khong phai chua chu Log");
  assert.equal(laNhatKy("# H\n## Log\n"), true);
}

/* (2) BẤT BIẾN ⑴ CỦA PROTOCOL: KHÔNG MẤT MỘT BYTE.
   `dau + than` phải dựng lại nguyên bản, từng byte — mọi phép xoay dựa vào đây. */
for (const f of CAC_FILE) {
  const goc = doc(f);
  const { dau, than } = tachThan(goc);
  assert.equal(dau + than, goc, `tachThan lam mat byte o ${f}`);
}

/* (3) ĐẾM BYTE MỘT MỤC — mục bắt đầu ở `## `, chữ trước mục đầu tiên không thuộc mục nào.
   Khối con trỏ lưu trữ nằm trước mục đầu: nó là chú thích của file, không phải nhật ký của ai,
   nên tính nó vào mục đầu tiên là đổ chữ của máy lên đầu một lane. */
{
  const t = mau([mucCo("A", 100), mucCo("B", 200)], "# H\n\n## Log\n\n> con tro lu tru\n\n");
  const ms = docMucTuFile(t);
  assert.equal(ms.length, 2, "phai bo ra dung hai muc");
  assert.deepEqual(ms.map((m) => m.tieuDe), ["## A", "## B"]);
  assert.ok(!ms[0].text.includes("con tro"), "khoi con tro KHONG duoc tinh vao muc dau tien");
  assert.ok(ms[1].byte > ms[0].byte, "muc dai hon phai dem ra nhieu byte hon");
  assert.equal(docMuc("").length, 0, "than rong thi khong co muc nao");
}

/* (4) CHỈ CHẶN MỤC VỪA THÊM — brief mục 2, và đây là chỗ dễ hỏng nhất của cả bài.
   So theo TIÊU ĐỀ, không so theo nội dung: so theo nội dung thì một lượt sửa lỗi chính tả
   trong mục cũ biến mục đó thành "mới", và cổng chặn lane này vì chữ của lane khác. */
{
  const cu = mau([mucCo("CU-DAI", 9000)]);
  const moi = mau([mucCo("CU-DAI", 9000), mucCo("MOI-NGAN", 300)]);
  const dsMoi = mucMoi(moi, cu);
  assert.equal(dsMoi.length, 1, "chi mot muc la moi");
  assert.equal(dsMoi[0].tieuDe, "## MOI-NGAN");
  assert.equal(vuotTran(dsMoi, 2600).length, 0, "muc cu 9000 byte KHONG duoc lam lane nay do");

  // Mục cũ được sửa chữ (cùng tiêu đề) vẫn là mục CŨ.
  const suaChu = mau([mucCo("CU-DAI", 9000).replace("xxxx", "yyyy")]);
  assert.equal(mucMoi(suaChu, cu).length, 0, "sua chu trong muc cu KHONG bien no thanh muc moi");

  // Không có bản gốc (file mới toanh) → mọi mục đều là mục mới.
  assert.equal(mucMoi(moi, "").length, 2, "file chua co tren origin/main thi moi muc deu la moi");
}

/* (5) TRẦN: vượt thì bị bắt, vừa đúng thì không. Biên là `>`, không phải `>=`. */
{
  const vua = docMucTuFile(mau([mucCo("VUA", 2600)]))[0];
  assert.equal(vua.byte, 2600, "dung mau 2600 byte de kiem dung bien");
  assert.equal(vuotTran([vua], 2600).length, 0, "muc dung bang tran thi KHONG do");
  assert.equal(vuotTran([{ tieuDe: "## X", byte: 2601 }], 2600).length, 1, "hon tran mot byte thi do");
  for (const xau of [0, -1, 2.5, "2600", null, undefined]) {
    assert.throws(() => vuotTran([], xau), /HANDOFF_TRAN_HONG/,
      `tran "${xau}" phai NEM — lui lang le ve mac dinh la cach mot con so Duc chot bien mat`);
  }
}

/* (6) TRẦN ĐỌC TỪ `.repo-structure.json`, KHÔNG GÕ CỨNG — brief mục 1 và mục 8 cấm.
   Đổi số trong cấu hình thì hành vi phải đổi theo; khai sai kiểu thì NÉM. */
{
  const that = JSON.parse(doc(".repo-structure.json"));
  const tran = handoffCapFrom(that);
  assert.ok(Number.isInteger(tran) && tran > 0, "repo nay PHAI khai handoff.tran_byte_moi_muc");
  assert.equal(handoffCapFrom({ handoff: { tran_byte_moi_muc: 999 } }), 999, "doi cau hinh thi doi hanh vi");
  assert.equal(handoffCapFrom({}), null, "khong khai gi thi tra null (repo moi dung tu bo khung)");
  assert.equal(handoffCapFrom(null), null);
  for (const xau of [{ handoff: 5 }, { handoff: [] }, { handoff: { tran_byte_moi_muc: 0 } },
    { handoff: { tran_byte_moi_muc: "2600" } }, { handoff: { tran_byte_moi_muc: -3 } }]) {
    assert.throws(() => handoffCapFrom(xau), /CAU_TRUC_HONG/, `khai sai kieu phai NEM: ${JSON.stringify(xau)}`);
  }
  // Trần phải chặn thật: mục dài nhất đang có trong repo phải vượt nó.
  const dai = Math.max(...CAC_FILE.flatMap((f) => docMucTuFile(doc(f)).map((m) => m.byte)));
  assert.ok(dai > tran, "tran khong chan duoc muc nao trong lich su thi no khong phai tran");
}

/* (7) MỐC THÁNG: đọc, ghi, và không nhận rác. */
{
  assert.equal(thangCua("khong co gi"), null);
  assert.equal(thangCua("<!-- HANDOFF-THANG: 2026-09 -->"), "2026-09");
  const t1 = datThang("# H\n\n## Log\n", "2026-10");
  assert.equal(thangCua(t1), "2026-10", "chua khai thi them mot dong o CUOI file");
  assert.equal(thangCua(datThang(t1, "2026-11")), "2026-11", "khai roi thi GHI DE, khong de hai moc");
  assert.equal((datThang(t1, "2026-11").match(/HANDOFF-THANG/g) ?? []).length, 1,
    "hai moc thang trong mot file thi may doc cai nao cung sai");
  for (const xau of ["2026-9", "thang chin", "", null, "2026-13-01"]) {
    assert.throws(() => datThang("x", xau), /HANDOFF_THANG_HONG/, `thang "${xau}" phai NEM`);
  }
  assert.match(thangHienTai(), /^\d{4}-\d{2}$/);
  assert.equal(thangHienTai(new Date(2026, 0, 31)), "2026-01", "thang 1 phai la 01, khong phai 1");
  // File thật ở gốc repo đã vào lược đồ xoay.
  assert.match(thangCua(doc("HANDOFF.md")) ?? "", /^\d{4}-\d{2}$/, "HANDOFF.md goc phai khai thang");
}

/* (8) XOAY THEO THÁNG — ba bất biến của protocol mục 3.
   ⑴ không mất một byte · ⑵ chuỗi con trỏ đi được bằng máy · ⑶ (khai Bản đồ file: việc của người). */
{
  const goc = datThang(mau([mucCo("THANG-9-A", 400), mucCo("THANG-9-B", 500)]), "2026-09");
  const { than } = tachThan(goc);
  const r = xoay({ text: goc, thangMoi: "2026-10", so: 2 });

  assert.equal(r.luuTruTen, "HANDOFF-ARCHIVE-02.md", "so tiep theo phai la 02");
  /* BẤT BIẾN ⑴ kiểm bằng ĐẲNG THỨC, không bằng `endsWith`. Đo thật 06/09: một đột biến bớt đúng
     MỘT byte đầu `than` SỐNG SÓT qua `endsWith(than)`, vì byte bị bớt trùng byte cuối của phần
     đầu. "Gần đúng" ở đây là mất chữ của một lane, và nó im lặng. */
  assert.equal(r.luuTru, r.luuTruDau + than,
    "BAT BIEN 1: file luu tru = phan dau may sinh + THAN nguyen van, tung byte, khong thieu mot ky tu");
  assert.ok(r.luuTru.endsWith(than), "va THAN phai nam o duoi cung");
  assert.equal(tachThan(goc).dau + than, goc, "dung lai duoc ban goc tung byte");
  assert.equal(docMucTuFile(r.luuTru).length, 2, "hai muc cu nam tron trong file luu tru");
  assert.equal(docMucTuFile(r.moi).length, 0, "file moi bat dau lai voi 0 muc");
  assert.equal(thangCua(r.moi), "2026-10", "file moi mo thang moi");
  assert.equal(thangCua(r.luuTru), "2026-09", "file luu tru giu thang cu cua chinh no");

  /* BẤT BIẾN ⑵ — và đây là chỗ bộ đếm sự cố sống hay chết. Con trỏ phải khớp ĐÚNG hình dạng
     `HANDOFF-ARCHIVE-\d+\.md` mà `readAssistantEvents` dò. Đặt tên theo tháng
     (`HANDOFF-ARCHIVE-2026-09.md`) là bộ đếm mu ngay, va "0 su co" doc y het "sach se". */
  const CON_TRO = /HANDOFF-ARCHIVE-\d+\.md/g;
  assert.deepEqual([...new Set(r.moi.match(CON_TRO) ?? [])], ["HANDOFF-ARCHIVE-02.md"],
    "file moi phai tro sang file vua sinh, dung hinh dang ten ma bo dem su co do");

  /* CHUỖI DÀI HƠN MỘT BƯỚC: xoay lần nữa. File `-03` phải mang theo con trỏ sang `-02`, nếu
     không thì lịch sử cũ hơn hai tháng roi khoi chuoi va bo dem am tham hut so. */
  const r2 = xoay({ text: r.moi + mucCo("THANG-10", 300), thangMoi: "2026-11", so: 3 });
  assert.ok((r2.luuTru.match(CON_TRO) ?? []).includes("HANDOFF-ARCHIVE-02.md"),
    "BAT BIEN 2: file luu tru moi phai mang theo con tro CU — chuoi phai di duoc bang may");
  assert.deepEqual([...new Set(r2.moi.match(CON_TRO) ?? [])], ["HANDOFF-ARCHIVE-03.md"]);
}

/* (9) SỐ THỨ TỰ FILE LƯU TRỮ SUY TỪ THƯ MỤC — cấm gõ cứng tên file lưu trữ (protocol mục 5). */
{
  assert.equal(soLuuTruTiepTheo([]), 1, "thu muc chua co file luu tru nao thi bat dau tu 01");
  assert.equal(soLuuTruTiepTheo(["HANDOFF.md", "HANDOFF-ARCHIVE-01.md"]), 2);
  assert.equal(soLuuTruTiepTheo(["HANDOFF-ARCHIVE-01.md", "HANDOFF-ARCHIVE-09.md", "README.md"]), 10,
    "phai lay MAX chu khong phai dem so file");
  assert.equal(soLuuTruTiepTheo(["HANDOFF-ARCHIVE-01.md.bak", "handoff-archive-02.md"]), 1,
    "ten gan giong KHONG duoc tinh — dem nham la ghi de mot file luu tru that");
  assert.equal(tenLuuTru(2), "HANDOFF-ARCHIVE-02.md");
  assert.equal(tenLuuTru(12), "HANDOFF-ARCHIVE-12.md", "qua 9 thi khong dem so 0 nua");
  // Nối tiếp được với file lưu trữ có sẵn ở gốc repo (sinh sáng 06/09 theo ADR-0008).
  assert.ok(fs.existsSync(path.join(ROOT, "HANDOFF-ARCHIVE-01.md")), "file luu tru 06/09 phai con do");
  assert.equal(soLuuTruTiepTheo(fs.readdirSync(ROOT)), 2,
    "luot xoay dau tien o goc repo phai sinh ra -02, khong duoc ghi de -01");
}

/* (10) CỔNG PHẢI THẬT SỰ GỌI, KHÔNG CHỈ NHẮC TÊN.
   Chín khối trên ghim `handoff.mjs`. Nhưng moi ruột phép kiểm trong `session-check.mjs` mà vẫn
   để lại vỏ thì `EXPECTED_CHECKS` vẫn đúng 13 và KHÔNG gì kêu — cơ chế thành trang trí. Nên soi
   ĐÚNG LỜI GỌI, cùng kiểu `check-bootstrap-smoke.mjs` soi lời gọi cổng con. */
{
  const gate = doc("scripts/session-check.mjs");
  assert.match(gate, /vuotTran\(\s*mucMoi\(/,
    "cong phai do MUC MOI roi moi so voi tran — bo mucMoi di la chan ca chu cua lane khac");
  assert.match(gate, /handoffCapFrom\(structure\)/,
    "tran phai doc tu .repo-structure.json, khong duoc go cung mot con so trong cong");
  assert.ok(!/\b26\d\d\b/.test(gate.slice(gate.indexOf("HANDOFF: mục mới trong trần"))),
    "khong duoc go cung con so tran o trong cong");
  const khoi = gate.slice(gate.indexOf('check("HANDOFF: mục mới trong trần'));
  assert.match(khoi.slice(0, khoi.indexOf("\n/* ----")), /HANDOFF_MUC_QUA_DAI[\s\S]*ok: false/,
    "vuot tran phai tra ok:false — mot canh bao khong chan thi khong phai cong");
}

console.log("handoff-smoke: XANH");

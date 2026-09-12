/* Phép ghim cho `scripts/handoff.mjs` — trần độ dài mục nhật ký + xoay file theo tháng.
 * Đề bài: ADR-0011 · `docs/protocols/HANDOFF.md` · `docs/briefs/BRIEF-HANDOFF-TRAN-01.md`.
 *
 * Mỗi khối dưới đây ghim MỘT cách hỏng đã trả giá thật trong repo này, không phải một cách
 * hỏng tưởng tượng. Tên khối nói cách hỏng đó.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  datThang, docMuc, docMucTuFile, laNhatKy, mucMoi, soLuuTruTiepTheo, tachThan, tenLuuTru,
  thangCua, thangHienTai, vuotTran, xoay
} from "../scripts/handoff.mjs";
import { handoffCapFrom } from "../scripts/repo-structure.mjs";
import { laNoiPhatHanh } from "../scripts/features.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

/* DÒ RA, KHÔNG GÕ CỨNG. Bản gốc của phép ghim này (repo tiêu thụ) liệt kê thẳng bốn đường dẫn
   `workers/<tên-gói>/…` của repo đó. Ở ĐÂY — repo phát hành — gõ cứng là sai hai lần:
   bộ khung không có thư mục `workers/` nào, và bản trích phát đi sẽ mang tên gói của một repo
   khác sang mọi repo đích. Hỏi git là câu trả lời đúng cho mọi repo, kể cả repo chưa có quyển
   nhật ký nào.

   Bỏ `template/`: đó là bản trích PHÁT ĐI, và quyển nhật ký trong đó cố ý TRẮNG — repo mới nhận
   một quyển chưa có mục nào. Quét nó vào đây thì phép ⑴ đòi "mọi quyển phải có mục" sẽ đỏ vì một
   file đúng ra phải rỗng, và phép ⑵ đếm lặp mọi thứ hai lần. */
/* GOM THEO TEN, ROI LOC THEO NOI DUNG — sua 12/09.
   Ban truoc gom `*HANDOFF.md` bang git roi khang dinh MOI file gom duoc deu la nhat ky. Do la
   DUNG CAI LOI ma khoi (1b) ben duoi mo ta: `docs/protocols/HANDOFF.md` la SO TAY LUAT, khong
   co muc `## Log` nao, va no bi tinh la nhat ky chi vi cai ten. Bo do that (`session-check.mjs`)
   da loc theo noi dung tu lau; chi phep ghim nay con hoi theo ten, nen no DO tren mot file
   khong he sai. */
const CAC_FILE_THEO_TEN = execFileSync("git", ["ls-files", "*HANDOFF.md"], { cwd: ROOT, encoding: "utf8" })
  .split(String.fromCharCode(10)).map((d) => d.trim())
  .filter((d) => d && !d.startsWith("template/"));

const CAC_FILE = CAC_FILE_THEO_TEN.filter((f) => laNhatKy(doc(f)));
const KHONG_PHAI_NHAT_KY = CAC_FILE_THEO_TEN.filter((f) => !laNhatKy(doc(f)));

const mau = (mucs, dau = "# H\n\n## Log\n\n") => dau + mucs.join("");
const mucCo = (tieuDe, byte) => `## ${tieuDe}\n${"x".repeat(Math.max(0, byte - tieuDe.length - 5))}\n\n`;

/* (1) BỘ ĐO PHẢI KHỚP TRÊN FILE THẬT.
   "Ra 0 chỗ khớp" đọc y hệt "không có gì phải sửa" — ngày 06/09 đúng cái nhầm đó xảy ra với
   NĂM lane khác nhau trong repo này. Nên phép ghim đầu tiên không kiểm logic, nó kiểm rằng
   mỏ neo còn bám vào file thật. */
/* NEO VÀO PHÉP ĐẾM THÔ, KHÔNG NEO VÀO MỘT CON SỐ TỐI THIỂU.
   Bản gốc đòi mỗi quyển có ít nhất một mục và cả repo có ít nhất 30. Đúng ở repo đã chạy lâu,
   SAI ở repo vừa dựng từ bản khung: quyển nhật ký ở đó cố ý TRẮNG, và một repo mới không có
   lỗi gì cả. Đo thật 08/09: phép ghim này đỏ ngay lượt chạy đầu trong repo rỗng.
   Thứ cần ghim vẫn còn nguyên, chỉ đổi mỏ neo: bộ đọc phải khớp với số tiêu đề đếm bằng tay.
   0 == 0 ở repo mới là ĐÚNG; 0 trên một file có 37 tiêu đề mới là bộ đo hỏng. */
{
  const demTho = (text) => {
    const dong = String(text).split(/\r?\n/);
    const i = dong.findIndex((d) => /^##[ \t]+Log[ \t]*$/.test(d));
    return i < 0 ? 0 : dong.slice(i + 1).filter((d) => /^##[ \t]/.test(d)).length;
  };
  let tong = 0;
  for (const f of CAC_FILE) {
    const text = doc(f);
    const n = docMucTuFile(text).length;
    assert.equal(n, demTho(text),
      `${f}: bo do ra ${n} muc nhung dem tho thay ${demTho(text)} — bo do HONG, khong phai "khong co gi"`);
    tong += n;
  }
  assert.ok(tong >= 0, "phep dem khong duoc nem");
}

/* (1b) "LÀ NHẬT KÝ" HỎI THEO NỘI DUNG, KHÔNG HỎI THEO TÊN FILE.
   Sự cố thật 06/09, ngay lượt chạy cổng đầu tiên của cơ chế này: `docs/protocols/HANDOFF.md` —
   sổ tay LUẬT — cũng có tên kết thúc bằng `HANDOFF.md`, nên nó bị đòi khai mốc tháng và cổng ĐỎ
   với một file không hề là nhật ký. */
{
  /* MO NEO PHAI CON BAM: loc theo noi dung xong ma con 0 file thi phep ghim nay xanh vi rong. */
  assert.ok(CAC_FILE.length >= 3,
    `chi ${CAC_FILE.length} quyen nhat ky sau khi loc — bo do laNhatKy hong, phep ghim dang xanh vi rong`);
  /* VA CHIEU NGUOC, tren FILE THAT chu khong tren mot mau dung san: so tay luat mang dung cai
     ten do phai bi loai. Day la su co 06/09, va tu 12/09 no duoc ghim bang chinh thu phai. */
  assert.ok(KHONG_PHAI_NHAT_KY.includes("docs/protocols/HANDOFF.md"),
    "docs/protocols/HANDOFF.md la SO TAY LUAT — phai bi loai khoi tap nhat ky, du ten ket thuc bang HANDOFF.md");
  /* Bản gốc đọc THẲNG `docs/protocols/HANDOFF.md` của repo tiêu thụ. Bộ khung không có sổ tay
     đó, và **cố ý không mang sang** — ta đang cắt kho chữ, không thêm. Nên ca này dựng bằng chữ
     tại chỗ: nó ghim HÀNH VI (một file tên `…HANDOFF.md` mà không có dòng `## Log` thì không
     phải nhật ký), và hành vi đó không cần một file thật để đúng. Repo nào CÓ sổ tay đó thì
     `CAC_FILE` ở trên đã tự dò ra và vòng lặp ngay trên đã phủ. */
  const soTayLuat = "# HANDOFF — sổ tay luật\n\nMột mục chứa gì và KHÔNG chứa gì.\n\n## Trần một mục\n\n2.600 byte.\n";
  assert.equal(laNhatKy(soTayLuat), false,
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
  /* Trần phải chặn THẬT: mục dài nhất trong lịch sử repo phải vượt nó — một trần cao hơn mọi
     thứ từng viết là một trần trang trí. Nhưng repo VỪA DỰNG chưa có mục nào, và ở đó câu hỏi
     này không trả lời được; khẳng định bừa sẽ làm repo mới đỏ vì một lỗi nó không có. */
  /* CÂU NÀY CHỈ TRẢ LỌI ĐƯỢC Ở REPO NHÀ. "Trần phải chặn thật" là một tính chất của DỮ LIỆU,
     không phải của mã: ở repo nhà trần 2600 sinh ra VÌ có mục dài hơn thế, nên nó đúng. Nhưng bản
     trích mang vế này sang mọi repo đích, và một repo có nhật ký VỐN GỌN thì Đỏ — trong khi nó
     không sai gì cả, trần ở đó chỉ là CHƯA ràng buộc. Đo 10/09 ở `n8n_Local host`.
     Khả năng phân biệt của `handoffCapFrom` đã được bốn dòng trên ghim bằng FIXTURE, nên chỗ này
     không mất lưới nào. Dùng `laNoiPhatHanh` — cơ chế repo này đã dựng cho đúng lớp câu hỏi
     "chỉ có nghĩa ở nhà". */
  const moiByte = laNoiPhatHanh(ROOT)
    ? CAC_FILE.flatMap((f) => docMucTuFile(doc(f)).map((m) => m.byte))
    : [];
  if (moiByte.length) {
    assert.ok(Math.max(...moiByte) > tran, "tran khong chan duoc muc nao trong lich su thi no khong phai tran");
  }
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
  /* File thật ở gốc repo đã vào lược đồ xoay — NHƯNG chỉ đòi khi nó đã có mục. Mốc tháng để
     biết phần nào đem đi lưu trữ; quyển trắng của một repo vừa dựng không có gì để lưu, và
     bắt nó khai là bắt chạy một lượt xoay trên file rỗng ngay ngày đầu. */
  const gocText = doc("HANDOFF.md");
  if (docMucTuFile(gocText).length > 0) {
    assert.match(thangCua(gocText) ?? "", /^\d{4}-\d{2}$/, "HANDOFF.md goc da co muc thi PHAI khai thang");
  }
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
  /* NỐI TIẾP TỪ THỨ ĐANG CÓ TRÊN ĐĨA, không từ một con số gõ sẵn. Bản gốc đòi
     `HANDOFF-ARCHIVE-01.md` phải tồn tại và lượt xoay tới phải ra `-02` — đúng với repo tiêu thụ
     (nó đã xoay một lần ngày 06/09), sai với mọi repo chưa xoay lần nào, kể cả repo này. Vế đáng
     ghim không phải con số, mà là **không ghi đè**: số tiếp theo luôn là max+1. */
  const coSan = fs.readdirSync(ROOT).filter((f) => /^HANDOFF-ARCHIVE-(\d+)\.md$/.test(f));
  const lonNhat = coSan.reduce((m, f) => Math.max(m, Number(/(\d+)/.exec(f)[1])), 0);
  assert.equal(soLuuTruTiepTheo(fs.readdirSync(ROOT)), lonNhat + 1,
    `co ${coSan.length} file luu tru, lon nhat la ${lonNhat} — luot xoay toi phai ra ${lonNhat + 1}, khong duoc ghi de`);
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
  /* NEO VAO TEN HAM, KHONG VAO CU PHAP DANG KY — 09/09 bon cap phep kiem duoc GOP lai (Duc chot
     giam 32 -> 25), va ve nay do vi no cat lat theo chuoi `check("HANDOFF: muc moi trong tran"`.
     Hanh vi no canh khong doi mot chut nao — chi cho DANG KY doi. Dung bai hoc KHUNG-47: ghim
     HANH VI, dung ghim hinh dang loi goi. */
  const NEO = "const doTranHandoff";
  assert.ok(gate.includes(NEO), `ve nay MAT DOI TUONG DO: khong con ham ${NEO} trong cong`);
  assert.ok(!/\b26\d\d\b/.test(gate.slice(gate.indexOf(NEO))),
    "khong duoc go cung con so tran o trong cong");
  const khoi = gate.slice(gate.indexOf(NEO));
  assert.match(khoi.slice(0, khoi.indexOf("\n/* ----")), /HANDOFF_MUC_QUA_DAI[\s\S]*ok: false/,
    "vuot tran phai tra ok:false — mot canh bao khong chan thi khong phai cong");
}

console.log("handoff-smoke: XANH");

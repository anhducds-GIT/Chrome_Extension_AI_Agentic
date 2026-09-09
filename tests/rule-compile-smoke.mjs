/* Phép ghim cho `scripts/rule-compile.mjs` — bộ biên dịch luật (ADR-0027).
 *
 * VÌ SAO GHIM BẰNG FIXTURE CHỨ KHÔNG BẰNG REPO THẬT. Phép kiểm chạy trên repo thật thì hôm nay
 * xanh và ngày mai đỏ vì một lane khác vừa sửa một file luật — tức nó đo *repo*, không đo *bộ
 * biên dịch*. Ghim ở đây đo đúng cái nó phải đo: cho một sổ cái và một bản hiệu lực dựng sẵn,
 * hàm `bienDich` có nói đúng không. Repo thật thì cổng đóng phiên lo (phép kiểm "Luật biên dịch
 * sạch").
 *
 * GHIM CẢ HAI CHIỀU (luật vàng 2): trích vế chết thì ĐỎ · trích số hiệu đang sống thì XANH.
 * Chiều "sạch thì xanh" không thừa — một phép kiểm luôn đỏ sẽ bị gỡ khỏi cổng trong một ngày.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { bienDich, docFileADR, dongLuat, phamViCuaMotLuot, phamViCuaNguoiTrich, trichDan, vanTay, VE } from "../scripts/rule-compile.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let passed = 0;
const ok = (name) => {
  passed += 1;
  console.log(`  ok  ${name}`);
};

const [VE1, VE2, VE3] = VE;
const NL = String.fromCharCode(10);

/* Sổ cái mẫu. Hình dạng thật sau lượt gộp 09/09: một file chủ đề gánh ba số hiệu, có vế đang
   sống của RIÊNG FILE (`### ⑴`, `### ⑶`), một vế cũ đã chết, và một quyết định chết TRỌN. */
const SO_CAI_GOC = `---
adr: 0001
decides: [0001, 0002, 0003]
---

# ADR-0001 — thử

### ${VE1} vế đang sống của file
### ${VE3} vế đang sống thứ hai

## Vế đã chết

- **0001 ${VE2} — *"câu cũ"*.** Chết: 0003 chốt ngược.
- **0002 — trọn quyết định.** Chết cùng ngày.

## Trạng thái
Accepted.
`;

const soCai = [
  docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md"),
  docFileADR(SO_CAI_GOC, "workers/goi-x/v1/docs/adr/0001-thu.md"),
];

/* ---- đọc sổ cái ---------------------------------------------------------- */

{
  const f = soCai[0];
  assert.deepEqual(f.mang, ["0001", "0002", "0003"], "decides phải được đệm 0 và gánh đủ");
  assert.deepEqual(
    f.chet.map((c) => c.so + (c.ve ? " " + c.ve : "")),
    ["0001 " + VE2, "0002"],
    "phải đọc được cả vế chết lẻ lẫn quyết định chết trọn"
  );
  assert.deepEqual([...f.veSong].sort(), [VE1, VE3].sort(), "phải đọc được các vế ĐANG SỐNG của chính file");
  ok("docFileADR đọc decides, hai hình dạng vế chết, và các vế đang sống");
}

{
  /* Không có `decides` thì số hiệu của chính file là số nó mang — nếu không, mọi ADR viết theo
     kiểu cũ (một file một quyết định) sẽ vô hình với bộ biên dịch. */
  const f = docFileADR("---\nadr: 42\n---\n# x\n", "docs/adr/0042-x.md");
  assert.deepEqual(f.mang, ["0042"]);
  ok("ADR kiểu cũ (không có decides) vẫn mang số hiệu của chính nó");
}

/* ---- trích dẫn và phạm vi ------------------------------------------------ */

{
  const t = trichDan("xem [ADR-0001](x.md) " + VE2 + " và ADR-0003 ở dòng này");
  assert.deepEqual(t, [
    { so: "0001", lienKet: "x.md", ve: VE2, dong: 1 },
    { so: "0003", lienKet: null, ve: null, dong: 1 },
  ]);
  ok("trichDan bắt được vế viết SAU đuôi liên kết — hình dạng thật trong AGENTS.md");
}

{
  /* MỘT FILE TRONG GÓI VẪN TRÍCH ĐƯỢC SỔ GỐC, và cái đuôi liên kết là thứ nói ra điều đó.
     Chỗ mô hình sai thứ hai của ngày 09/09: chỉ suy phạm vi theo thư mục thì lượt trích
     `[ADR-0016](../../../docs/adr/0007-scouter.md)` trong AGENTS của Scouter rơi vào sổ của
     GÓI, và ADR-0016 của gốc bị báo mồ côi oan. */
  const pv = ["docs/adr/", "workers/goi-x/v1/docs/adr/"];
  const trongGoi = "workers/goi-x/v1/AGENTS.md";
  assert.equal(phamViCuaMotLuot(trongGoi, "../../../docs/adr/0007-x.md", pv), "docs/adr/");
  assert.equal(phamViCuaMotLuot(trongGoi, "docs/adr/0001-x.md", pv), "workers/goi-x/v1/docs/adr/");
  assert.equal(phamViCuaMotLuot(trongGoi, null, pv), "workers/goi-x/v1/docs/adr/");
  assert.equal(phamViCuaMotLuot(trongGoi, "https://vi.dụ/khong-phai-so-cai", pv), "workers/goi-x/v1/docs/adr/");
  ok("phạm vi của MỘT lượt trích suy từ đuôi liên kết khi có, từ thư mục khi không");
}


{
  /* PHẠM VI LÀ THEO THƯ MỤC. Bài học của B12, ngày 09/09: `docs/adr/0001` và
     `workers/goi-x/v1/docs/adr/0001` là HAI quyết định khác nhau. Bỏ qua vế này thì bộ biên
     dịch báo hàng chục lỗi giả — và một phép kiểm báo lỗi giả sẽ bị tắt trong một ngày. */
  const pv = ["docs/adr/", "workers/goi-x/v1/docs/adr/"];
  assert.equal(phamViCuaNguoiTrich("AGENTS.md", pv), "docs/adr/");
  assert.equal(phamViCuaNguoiTrich("docs/protocols/X.md", pv), "docs/adr/");
  assert.equal(phamViCuaNguoiTrich("workers/goi-x/v1/AGENTS.md", pv), "workers/goi-x/v1/docs/adr/");
  ok("phạm vi suy theo thư mục — file trong gói đọc sổ của gói");
}

/* ---- ① TRICH_VE_CHET ----------------------------------------------------- */

const dangKySach = { tran_ngay_ra_soat: 7, ra_soat: {} };
const HOM_NAY = Date.parse("2026-09-09T00:00:00Z");
const soi = (noiDung, duongDan = "AGENTS.md", so = soCai) =>
  bienDich({ soCai: so, banHieuLuc: [{ duongDan, noiDung }], dangKy: dangKySach, homNay: HOM_NAY });

{
  const kq = soi("luật: theo [ADR-0001](x.md) " + VE2 + " thì làm thế.");
  assert.equal(kq.veChetConTrich.length, 1, "trích một vế đã chết PHẢI bị bắt");
  assert.equal(kq.veChetConTrich[0].so, "0001");
  assert.equal(kq.veChetConTrich[0].ve, VE2);
  ok("① bắt được lượt trích vào một vế đã chết");
}

{
  const kq = soi("luật: theo ADR-0002 thì làm thế.");
  assert.equal(kq.veChetConTrich.length, 1, "quyết định chết TRỌN cũng phải bị bắt, không cần nêu vế");
  ok("① bắt cả lượt trích vào một quyết định đã chết trọn");
}

{
  const kq = soi("luật: theo [ADR-0001](x.md) " + VE1 + " và ADR-0003.");
  assert.equal(kq.veChetConTrich.length, 0, "trích số hiệu đang sống thì KHÔNG được đỏ");
  ok("① im lặng khi mọi lượt trích đều vào số hiệu đang sống");
}

{
  /* SỐ VẾ BỊ DÙNG LẠI — chỗ mô hình sai đã lọt một lần 09/09. Sau lượt gộp, số vế là số của
     FILE, không phải của quyết định cũ. File dưới đây có `### ⑵` ĐANG SỐNG trong khi mục
     `Vế đã chết` ghi `0001 ⑵` (vế cũ). Hai vật khác nhau, cùng ký hiệu — không được báo đỏ. */
  const dungLai = SO_CAI_GOC.replace("### " + VE3 + " vế đang sống thứ hai", "### " + VE2 + " vế MỚI mang ký hiệu cũ");
  const kq = soi("theo [ADR-0001](x.md) " + VE2 + " nhé", "AGENTS.md", [docFileADR(dungLai, "docs/adr/0001-thu.md")]);
  assert.equal(kq.veChetConTrich.length, 0, "file còn một vế đang sống mang ký hiệu đó thì lượt trích KHÔNG chết");
  ok("① không báo oan khi số vế bị dùng lại cho một vế mới");
}

{
  /* Chiều ĐỎ của cùng cơ chế đuôi-liên-kết: file trong gói trích một vế đã chết CỦA SỔ GỐC
     thì vẫn phải bắt — nếu không, dời một câu luật vào gói là cách gỡ phép kiểm. */
  const soCaiHaiTang = [
    docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md"),
    docFileADR(["---", "adr: 0001", "decides: [0001]", "---", "# x", ""].join(NL), "workers/goi-x/v1/docs/adr/0001-x.md"),
  ];
  const kq = bienDich({
    soCai: soCaiHaiTang,
    banHieuLuc: [{ duongDan: "workers/goi-x/v1/AGENTS.md", noiDung: "theo [ADR-0001](../../../docs/adr/0001-thu.md) " + VE2 }],
    dangKy: dangKySach,
    homNay: HOM_NAY,
  });
  assert.equal(kq.veChetConTrich.length, 1, "vế chết của sổ GỐC vẫn phải bắt khi file trong gói trỏ thẳng vào đó");
  ok("① đi theo đuôi liên kết sang sổ gốc, không dừng ở sổ của gói");
}

{
  /* Chiều nguy hiểm nhất: một file TRONG GÓI trích `ADR-0001 ⑵` của GÓI mình. Vế đó chết ở sổ
     gốc, nhưng ở đây nó là sổ của gói — trộn hai phạm vi thì bộ biên dịch báo đỏ oan. */
  const soCaiGoiSach = [
    docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md"),
    docFileADR("---\nadr: 0001\ndecides: [0001]\n---\n# x\n", "workers/goi-y/v1/docs/adr/0001-x.md"),
  ];
  const kq = soi("theo ADR-0001 " + VE2 + " nhé", "workers/goi-y/v1/AGENTS.md", soCaiGoiSach);
  assert.equal(kq.veChetConTrich.length, 0, "vế chết ở sổ GỐC không được lây sang sổ của GÓI");
  ok("① không lây vế chết giữa hai phạm vi khác nhau");
}

/* ---- ② mồ côi, gộp theo sổ ------------------------------------------------ */

{
  /* MỒ CÔI CỐ Ý — khai ở `luat.mo_coi_co_y` thì phép ② thôi đếm nó. Không có cửa này thì ②
     báo một con số không bao giờ về 0, và phép kiểm nào không bao giờ về 0 thì thôi được đọc. */
  const kq = bienDich({
    soCai: [docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md")],
    banHieuLuc: [{ duongDan: "AGENTS.md", noiDung: "chỉ nhắc ADR-0001 thôi" }],
    dangKy: { ...dangKySach, mo_coi_co_y: { "docs/adr/0003": "gộp vào 0001, trích dưới số đó" } },
    homNay: HOM_NAY,
  });
  assert.equal(kq.moCoi.length, 0, "mồ côi đã khai lý do thì không được đếm nữa");
  ok("② trừ ra mồ côi CỐ Ý đã khai lý do");
}

{
  /* DẠNG NHÓM — một lý do chung + danh sách số hiệu. Thêm 09/09 khi soi 59 quyết định của một
     gói cùng lúc: 25 mục có CÙNG một lý do thật, chép câu đó 25 lần là giả vờ đã suy nghĩ 25 lần.

     Ghim CẢ HAI chiều, và chiều thứ hai mới là chiều quan trọng: số hiệu KHÔNG có trong danh
     sách vẫn phải KÊU. Không có nó thì dạng nhóm trượt thành "cả sổ này miễn" — tức tắt hẳn ②,
     mà chính ② vừa lôi ra bốn chốt `run.trial` của Đức đang sống mà không nơi luật nào mang. */
  const kq = bienDich({
    soCai: [docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md")],
    banHieuLuc: [{ duongDan: "AGENTS.md", noiDung: "chỉ nhắc ADR-0001 thôi" }],
    dangKy: {
      ...dangKySach,
      mo_coi_co_y: { "docs/adr/": { nhom: [{ ly_do: "bản ghi lịch sử", cac_so: ["0003"] }] } },
    },
    homNay: HOM_NAY,
  });
  assert.equal(kq.moCoi.length, 0, "dạng NHÓM phải trừ được mồ côi y như dạng từng số");

  /* Số hiệu KHÔNG có trong danh sách vẫn phải KÊU — chiều này mới là chiều quan trọng. */
  const soLa = docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md");
  soLa.mang = [...soLa.mang, "0009"];
  const themSo = bienDich({
    soCai: [soLa],
    banHieuLuc: [{ duongDan: "AGENTS.md", noiDung: "chỉ nhắc ADR-0001 thôi" }],
    dangKy: {
      ...dangKySach,
      mo_coi_co_y: { "docs/adr/": { nhom: [{ ly_do: "bản ghi lịch sử", cac_so: ["0003"] }] } },
    },
    homNay: HOM_NAY,
  });
  const keu = themSo.moCoi.flatMap((m) => m.cai.map((c) => c.so));
  assert.deepEqual(keu, ["0009"], "số ngoài danh sách phải kêu; số trong danh sách thì không");
  ok("② dạng NHÓM trừ đúng danh sách, và KHÔNG miễn cả sổ");
}

{
  const kq = soi("chỉ nhắc ADR-0001 thôi", "AGENTS.md", [docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md")]);
  /* 0001 được trích · 0002 chết trọn nên không tính · còn lại 0003 mồ côi. */
  assert.equal(kq.moCoi.length, 1, "mồ côi phải GỘP theo sổ, không đổ phẳng");
  assert.deepEqual(kq.moCoi[0].cai.map((c) => c.so), ["0003"]);
  assert.equal(kq.moCoi[0].imLang, false, "sổ này CÓ số hiệu được trích nên không phải sổ im lặng");
  ok("② gộp mồ côi theo sổ, và không tính quyết định đã chết trọn");
}

{
  const kq = soi("không nhắc số hiệu nào cả", "AGENTS.md", [docFileADR(SO_CAI_GOC, "docs/adr/0001-thu.md")]);
  assert.equal(kq.moCoi[0].imLang, true, "sổ không được trích lần nào là MỘT việc, không phải N việc");
  ok("② đánh dấu sổ im lặng — một dòng thay cho N dòng");
}

/* ---- ③ vân tay trùng ------------------------------------------------------ */

const CAU = "- Không bao giờ nới một lớp bảo vệ để cổng kiểm chuyển sang màu xanh nhé";

{
  const daoTu = "- nhé xanh màu sang chuyển kiểm cổng để vệ bảo lớp một nới giờ bao Không";
  assert.equal(vanTay(CAU), vanTay(daoTu), "đảo thứ tự từ phải ra cùng vân tay");
  assert.notEqual(vanTay(CAU), vanTay("- Mọi commit phải kết bằng một dòng nhãn lane của phiên đang ghi"));
  ok("③ vân tay bỏ qua thứ tự từ, nhưng không gộp hai câu khác nghĩa");
}

{
  assert.equal(vanTay("- ngắn quá"), null, "câu quá ngắn không được sinh vân tay");
  ok("③ câu ngắn không sinh vân tay — chặn báo động giả");
}

{
  const kq = bienDich({
    soCai,
    banHieuLuc: [
      { duongDan: "AGENTS.md", noiDung: CAU },
      { duongDan: "docs/protocols/X.md", noiDung: CAU },
      { duongDan: "docs/protocols/Y.md", noiDung: "- khác hẳn: mọi commit phải kết bằng một dòng nhãn lane" },
    ],
    dangKy: dangKySach,
    homNay: HOM_NAY,
  });
  assert.equal(kq.trung.length, 1);
  assert.equal(kq.trung[0].length, 2);
  ok("③ bắt câu luật lặp giữa hai file");
}

{
  const kq = soi(CAU + "\n" + CAU);
  assert.equal(kq.trung.length, 0, "lặp TRONG một file là chuyện hành văn, không phải luật trôi lệch");
  ok("③ bỏ qua lặp trong cùng một file");
}

{
  assert.equal(dongLuat("| - dòng này nằm trong bảng nên không phải câu luật đâu nhé |").length, 0);
  assert.equal(dongLuat("```\n- dòng này nằm trong khối mã nên không phải câu luật\n```").length, 0);
  ok("③ bỏ bảng và khối mã — đó là ví dụ, không phải luật");
}

/* ---- ④ hạn rà soát -------------------------------------------------------- */

{
  const kq = bienDich({
    soCai,
    banHieuLuc: [],
    dangKy: { tran_ngay_ra_soat: 7, ra_soat: { "moi.md": "2026-09-08", "cu.md": "2026-08-01", "chua.md": null } },
    homNay: HOM_NAY,
  });
  assert.deepEqual(kq.quaHan.map((c) => c.duongDan), ["chua.md", "cu.md"], "chưa rà bao giờ xếp trước, rồi tới cũ nhất");
  ok("④ chỉ nêu nơi quá hạn, xếp cũ nhất trước");
}

/* ---- BỘ BIÊN DỊCH PHẢI CÒN ĐƯỢC GỌI --------------------------------------- */

{
  /* Bài học N-01: ghim một bộ kiểm mà không ghim lượt GỌI nó thì gỡ lượt gọi là luật biến mất
     trong im lặng, và mọi test vẫn xanh. */
  const congKiem = fs.readFileSync(path.join(ROOT, "scripts", "session-check.mjs"), "utf8");
  assert.match(congKiem, /from "\.\/rule-compile\.mjs"/, "cổng đóng phiên phải còn nạp bộ biên dịch luật");
  assert.match(congKiem, /Luật biên dịch sạch/, "cổng đóng phiên phải còn phép kiểm 'Luật biên dịch sạch'");
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  assert.ok(String(pkg.scripts?.test ?? "").includes("rule-compile-smoke.mjs"), "`scripts.test` phải còn gọi chính phép ghim này");
  ok("cổng đóng phiên và chuỗi test còn gọi bộ biên dịch luật");
}

{
  /* Bản đăng ký là ĐẦU VÀO của bộ biên dịch. Rút ruột nó thì bộ biên dịch soi 0 file và báo
     SẠCH — đúng kiểu xanh giả mà repo này cấm. */
  const cauTruc = JSON.parse(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8"));
  assert.ok(cauTruc.luat, "`.repo-structure.json` phải còn khối `luat`");
  const noi = Object.keys(cauTruc.luat.ra_soat ?? {});
  assert.ok(noi.length >= 15, `bản đăng ký nơi chứa luật chỉ còn ${noi.length} mục — nghi bị rút ruột`);
  for (const p of noi) assert.ok(fs.existsSync(path.join(ROOT, p)), `bản đăng ký trỏ vào file không tồn tại: ${p}`);
  ok(`bản đăng ký còn đủ ${noi.length} nơi chứa luật, và mọi đường dẫn đều tồn tại`);
}

/* ---- FILE NÀY KHÔNG ĐƯỢC RỖNG -------------------------------------------- */
/*
 * Ngày 09/09 chính file này bị cắt còn 0 byte bởi một lệnh Python viết sai thứ tự —
 * `open(…, "w")` chạy TRƯỚC lệnh đọc, nên nó cắt file rồi mới đọc ra chuỗi rỗng. Bộ chạy suite
 * báo XANH, cổng báo XANH, và bản rỗng **đã được commit**. Một file test rỗng thoát 0.
 *
 * Nên phép cuối là phép tự soi: đếm số khẳng định đã chạy. Cùng bệnh với `MUTATION_SKIP` —
 * một bộ kiểm không khẳng định gì thì im lặng, và im lặng đọc y hệt một lượt xanh.
 */
const TOI_THIEU = 20;
if (passed < TOI_THIEU) {
  console.error(`\nPHEP_GHIM_RONG: chỉ chạy ${passed} khẳng định, phải có ít nhất ${TOI_THIEU}.`);
  console.error("File này đã bị cắt hoặc rút ruột. Một phép ghim không khẳng định gì thì thoát 0 và đọc y hệt một lượt xanh.\n");
  process.exit(1);
}

console.log(`\n${passed} passed, 0 failed — rule-compile-smoke`);

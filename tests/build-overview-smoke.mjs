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

import { collectModel, createDefaultDeps } from "../scripts/build-dashboard.mjs";
import { bacMoc, blockedIfSkipped, buildOverview, demLuongSongSong, readBatBien, readCoChe, readCanDuc, canDucDaDong, khoangNgay, SO_CAN_DUC, choDuc, chungMinhCu, compareOverview, debtByUnit, gateNext, GATE_MIN, humanWork, IDEA_STAGES, isDone, KHOA_PREFIX, NHOM_CHUA_XEP, tuoiTuMoc, trangThaiDonVi, readAssistantEvents, readBrief, readDecisions, readDefects, readFeatures, readAreas, readIdeas, readKhoa, readLuong, readMoc, readMocDaXong, shorten, sinhTrang, SU_CO_ASSISTANT, TAB_MAC_DINH, tenKhoa, TRANG_FILE } from "../scripts/build-overview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* MỘT bộ đọc dùng chung cho CẢ file, không dựng lại ở từng khối.
 *
 * Bộ đọc ghim mốc commit ở lượt đọc đầu tiên (xem `createHeadDeps`), nên dựng một bộ là cả
 * file nhìn ĐÚNG MỘT commit. Dựng lại ở từng khối thì mỗi bộ ghim một mốc khác nhau, và một
 * lane khác commit xen giữa hai khối là hai khối so với nhau trên hai commit — đỏ oan.
 *
 * Đo thật 2026-09-05, hai lần trong một buổi. Bộ đọc không giữ trạng thái nào ngoài mốc đó
 * (toàn hàm thuần đóng trên `root`), nên dùng chung là an toàn. Khối nào cần dữ liệu khác
 * thì bọc bằng `bocFile`, thứ trả về bản mới chứ không sửa bản gốc. */
const REAL = createDefaultDeps(ROOT);
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const collectModelRows = (deps) => collectModel(deps, { tolerant: true }).rows;

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
  const { html, stats } = buildOverview(REAL);
  const full = html.slice(html.indexOf(String.fromCharCode(60) + 'div class="wrap"' + String.fromCharCode(62)));

  /* KHỐI BẢN ĐỒ là ngoại lệ DUY NHẤT, và nó thu hẹp phạm vi chứ không khoét lỗ.

     Bất biến này sinh ra để chặn đường dẫn LỌT VÀO VĂN XUÔI mô tả — Đức không phải đọc chi
     tiết kỹ thuật trong một câu kể. Ngày 03/09 Đức yêu cầu bản đồ file và cấu trúc thư mục
     phải có trên bảng: ở đó đường dẫn CHÍNH LÀ nội dung được yêu cầu, không phải rác lọt vào.

     Nên cách xử lý là: cắt khối `map` ra rồi kiểm phần CÒN LẠI như cũ, VÀ thêm một khẳng
     định mới — đường dẫn chỉ được xuất hiện TRONG khối đó. Bản cũ không có khẳng định thứ
     hai, nên nếu sau này ai chuyển bản đồ ra ngoài khối thì không ai biết. */
  const MO = String.fromCharCode(60) + 'div class="map"' + String.fromCharCode(62);
  const iMap = full.indexOf(MO);
  assert.notEqual(iMap, -1, "phai co khoi ban do — Duc yeu cau 03/09");
  const jMap = full.indexOf(String.fromCharCode(60) + "/div" + String.fromCharCode(62) + String.fromCharCode(10) + "  </div>", iMap);
  assert.notEqual(jMap, -1, "khoi ban do phai dong lai duoc — neu khong, cat sai va phep kiem duoi vo nghia");
  const khoiMap = full.slice(iMap, jMap);
  const body = full.slice(0, iMap) + full.slice(jMap);

  /* Fixture phải dựng được ca hỏng: khối map rỗng thì hai khẳng định dưới đều vô nghĩa.
     Bản cũ đo bằng `khoiMap.length > 400` — một ngưỡng byte, GPT audit chỉ đúng: 400 byte
     chỉ nói "có chữ", không nói "có đủ thư mục". Đếm theo QUAN HỆ với nguồn: bản đồ phải có
     đúng một dòng cho mỗi vùng khai trong bảng phân vùng. Rơi một thư mục là đỏ ngay. */
  const soVung = readAreas(REAL).length;
  const soDong = [...khoiMap.matchAll(/<div class="tr">/g)].length;
  assert.ok(soVung > 0, "phai doc duoc bang phan vung — 0 la bo doc hong");
  assert.equal(soDong, soVung,
    `ban do phai co dung mot dong cho moi vung: ${soVung} vung, dang ve ${soDong} dong`);

  for (const [pattern, why] of [
    [/workers\//, "duong dan thu muc"],
    [/scripts\//, "duong dan thu muc"],
    [/\.mjs\b/, "ten file ma"],
    [/\.json\b/, "ten file cau hinh"],
    [/\b[0-9a-f]{7,40}\b/, "chuoi giong ma commit"]
  ]) {
    assert.ok(!pattern.test(body), `bang KHONG duoc chua ${why} (khop ${pattern}) — Duc doc bang, khong doc repo`);
  }

  /* Và chiều ngược lại: bản đồ PHẢI nằm trong khối map. Không có khẳng định này thì ai
     chuyển bản đồ ra ngoài khối sẽ làm bất biến trên xanh một cách sai. */
  for (const [pattern, why] of [
    [/workers\//, "duong dan goi extension"],
    [/scripts\//, "duong dan thu muc ma"]
  ]) {
    assert.ok(pattern.test(khoiMap), `khoi ban do PHAI chua ${why} — neu khong thi ban do da bi chuyen ra ngoai khoi, va phep kiem tren xanh mot cach sai`);
  }

  // Con số phải là số đo thật, không phải chỗ trống trang trí.
  assert.ok(stats.extensions > 0, "phai co it nhat mot extension");
  assert.ok(stats.decisions > 0, "phai dem duoc quyet dinh da chot");
  assert.match(stats.stamp, /^\d{4}-\d{2}-\d{2}$/, "ngay sinh phai co that va dung hinh dang");
  ok("BAT BIEN tren repo that: bang khong lo duong dan / ten file / ma commit");
}

/* ---- 5. MỐC HEAD HỎNG PHẢI NÉM, tuyệt đối không lùi về giờ đồng hồ.
 *
 * Chỗ này thay cho phép kiểm cũ về "cờ cũ bật theo ngày". Phép kiểm cũ ĐÃ BỊ XOÁ, và xoá có
 * lý do — không phải để cho suite dễ thở:
 *
 *   Cờ `stale` chỉ bật khi `ageDays > 7`. Nhưng cả HAI đường trong `main()` đều đi qua
 *   `sinhTrang`, mà hàm đó luôn truyền `today: "head"`, nên `ageDays` LUÔN bằng 0. Cờ đó chưa
 *   từng bật một lần nào trong bất kỳ lượt sinh thật. Bốn phép kiểm xanh cho một nhánh không
 *   ai chạm tới được — và cái giá không phải là bốn dòng code, mà là người đọc sau tin rằng
 *   "bảng tự báo cũ" trong khi việc đó do đoạn JS lúc mở trang làm.
 *
 * Đổi lấy phép kiểm này, ghim đúng cái nguy hiểm thật: `Date.parse(headDate) || Date.now()`.
 * Cái `||` đó là fail-OPEN. Mốc HEAD hỏng thì bản commit lặng lẽ nhìn đồng hồ, sang ngày là
 * lệch HEAD, và `safe-push` chặn ĐẨY VIỆC CỦA MỌI PHIÊN dù không dữ liệu nào đổi.
 *
 * Fixture phải dựng được ca hỏng: bốn dạng mốc hỏng, và phải chứng minh mốc TỐT vẫn chạy —
 * không có nửa sau thì "cái gì cũng ném" cũng xanh. */
{
  const deps = REAL;
  const tot = buildOverview(deps, { today: "head" });
  assert.match(tot.stats.stamp, /^\d{4}-\d{2}-\d{2}$/, "moc HEAD that phai chay duoc, khong nem");

  // Hai dạng là đủ: cả bốn đều rơi vào cùng một nhánh `Number.isFinite`, mà mỗi ca tốn một
  // lượt sinh đầy đủ (~9 giây). Giữ một chuỗi sai hình dạng + một giá trị rỗng.
  for (const hong of ["khong-phai-ngay", null]) {
    const depsHong = { ...deps, git: { ...deps.git, headDate: () => hong } };
    let nem = null;
    try { buildOverview(depsHong, { today: "head" }); } catch (e) { nem = e; }
    assert.ok(nem, `moc HEAD = ${JSON.stringify(hong)} PHAI nem, khong duoc lui ve Date.now()`);
    assert.match(nem.message, /MOC_HEAD_HONG/, "loi phai noi ro ten nguyen nhan");
  }
  ok("moc HEAD hong thi NEM (2 dang), moc tot van chay — het cua fail-open");
}

/* ---- 5b. N-07 · Trang KHÔNG được bảo Đức đi nhờ AI làm mới bảng.
 *
 * Trước 06/09 trang có ĐÚNG BA chỗ dạy Đức đi nhờ AI: dải đỏ ở đầu trang, thẻ "Làm mới bảng"
 * ở tab đầu, và một khối prompt ở tab Vận hành. Cả ba đọc chung một câu từ PROMPTS.md — cơ
 * chế đó đúng vào lúc chỉ có một cách làm mới, và câu ấy là "nhờ AI".
 *
 * Từ 06/09 Đức tự làm được: ba cửa nhấp đúp trong thư mục `bang-trang-thai`. Một dòng chữ
 * bảo Đức đi nhờ AI trong khi Đức tự làm được là dòng chữ DẠY SAI THÓI QUEN — Đức nói thẳng:
 * mỗi lần muốn xem số mới lại phải cắt ngang một luồng việc khác.
 *
 * GHIM CẢ HAI CHIỀU, cố ý. Chỉ chặn câu cũ thì xoá trắng cả thẻ cũng xanh, và Đức mất luôn
 * chỗ duy nhất trên bảng nói cho biết cách tự làm — tức lại quay về đi hỏi AI, đúng cái bệnh
 * vừa chữa. */
{
  const html = buildOverview(REAL, { today: "head" }).html;

  for (const [pattern, why] of [
    [/Nhờ AI: Làm mới/, "dai do o dau trang bao Duc di nho AI"],
    [/dán câu dưới đây/, "the Lam moi bang bao Duc dan prompt cho AI"],
    [/Câu để dán cho AI/, "khoi prompt o tab Van hanh"]
  ]) {
    assert.ok(!pattern.test(html),
      `trang KHONG duoc con ${why} — tu 06/09 Duc tu lam moi bang duoc, cau do day sai thoi quen`);
  }

  for (const [chuoi, why] of [
    ["bang-trang-thai", "ten thu muc ba cua"],
    ["Xem-bang.cmd", "cua xem ngay mot lan"],
    ["Mo-may-chu.cmd", "cua co nut Lam moi ngay"],
    ["Bat-tu-chay.cmd", "cua tu chay luc bat may"]
  ]) {
    assert.ok(html.includes(chuoi),
      `trang PHAI chi ra ${why} — khong noi cach tu lam thi Duc lai di hoi AI`);
  }

  ok("N-07: trang chi cach Duc tu lam moi bang, khong con cau bao di nho AI");
}

/* ---- 6. Y-03 · VIỆC CHỜ TAY ĐỨC — ba trạng thái phải phân biệt được.
     Cái tệ nhất là gộp "không" (đã trả lời, không có gì) với rỗng (chưa ai trả lời): bảng sẽ
     báo "không có việc nào chờ Đức" trong khi thật ra chưa ai được hỏi. Đó đúng là tình
     trạng trước khi có trường này, và là lý do Y-03 tồn tại. ---- */
{
  const rows = [
    { name: "Có việc",        lifecycle: "active",     humanAction: "Nạp lại tiện ích rồi điền tên hồ sơ." },
    { name: "Đã trả lời không", lifecycle: "active",   humanAction: "không" },
    { name: "Viết hoa KHÔNG", lifecycle: "building",   humanAction: "KHÔNG" },
    { name: "Chưa khai",      lifecycle: "building",   humanAction: "" },
    { name: "Khai toàn dấu cách", lifecycle: "active", humanAction: "   " },
    { name: "Đã nghỉ mà có việc", lifecycle: "superseded", humanAction: "Việc này KHÔNG được tính" },
    { name: "Đã lưu trữ",     lifecycle: "archived",   humanAction: "" }
  ];
  const { actions, undeclared } = humanWork(rows);

  assert.deepEqual(actions.map((a) => a.unit), ["Có việc"],
    'chi don vi khai chuoi THAT moi la viec cho Duc');
  assert.equal(actions[0].what, "Nạp lại tiện ích rồi điền tên hồ sơ.", "giu nguyen van cau Duc doc");
  assert.equal(undeclared, 2, 'rong VA toan dau cach deu la "chua ai tra loi" — dem ca hai');

  // Đơn vị đã nghỉ hưu KHÔNG được lọt vào, dù có khai việc.
  assert.ok(!actions.some((a) => a.unit === "Đã nghỉ mà có việc"),
    'don vi da nghi huu ra khoi cuoc dua — khong duoc dem viec cua no');
  assert.ok(!actions.some((a) => a.unit === "Đã lưu trữ"), 'don vi luu tru cung vay');

  // "không" viết kiểu nào cũng là "không có gì chờ", và KHÔNG bị đếm là chưa khai.
  assert.ok(!actions.some((a) => a.unit === "Viết hoa KHÔNG"), '"KHONG" viet hoa cung la khong co gi cho');
  assert.equal(humanWork([{ name: "x", lifecycle: "active", humanAction: "không" }]).undeclared, 0,
    'khai "khong" la DA tra loi — khong duoc dem la chua khai');

  // Và trên repo thật: cả ba trạng thái phải cùng xuất hiện, nếu không phép kiểm trên là lý thuyết.
  const { html } = buildOverview(REAL);
  assert.match(html, /việc đang chờ|Không có việc nào chờ Đức/, "bang phai noi ro co bao nhieu viec cho Duc");
  ok("Y-03 ba trang thai: co viec / da tra loi khong / chua ai tra loi — khong gop lan nhau");
}

/* ---- 5b. KHỐI "CẦN ĐỨC" SUY TỪ DẤU TRONG SỔ — đề bài `BANG-CAN-DUC-01` ----
 *
 * Bốn thứ ghim ở đây, và cả bốn dựng được ca hỏng thật:
 *   · có dấu thì LÊN bảng, gỡ dấu thì BIẾN MẤT — đó là cả cơ chế;
 *   · đóng mục thì dấu hết hiệu lực, KHÔNG phải nhớ đi xoá dấu (ràng buộc Đức nêu thẳng);
 *   · BẤM và CHỐT không được trộn;
 *   · sổ viết bằng CRLF vẫn phải quét được. Repo này CRLF, và ngày 06/09 một bộ đo ở đây mù
 *     3/10 con vì mỏ neo viết `\n` — mù kiểu đó báo "0 mục", trông y hệt "không có gì".
 */
{
  const CR = String.fromCharCode(13) + String.fromCharCode(10);
  const G = String.fromCharCode(10);
  const soGia = (files, ngay = {}) => ({
    fileExists: (p) => p in files,
    readFile: (p) => { if (!(p in files)) throw new Error(`KHONG_CO: ${p}`); return files[p]; },
    listFiles: () => { throw new Error("khong co so de bai trong fixture nay"); },
    git: {
      trackedPaths: () => Object.keys(files),
      headDate: () => "2026-09-10",
      lineDate: (p, n) => ngay[`${p}:${n}`] || ""
    }
  });

  /* --- (a) có dấu thì lên, gỡ dấu thì biến mất --- */
  const coDau = ["# Sổ", "- Nạp lại tiện ích @Đức:bấm", "- Chọn phạm vi @Đức:chốt"].join(G);
  const khongDau = ["# Sổ", "- Nạp lại tiện ích", "- Chọn phạm vi"].join(G);
  const a = readCanDuc(soGia({ "IDEAS.md": coDau }), null);
  assert.equal(a.length, 2, "hai muc co dau thi len bang du hai");
  assert.deepEqual(a.map((x) => x.loai), ["BẤM", "CHỐT"], "BAM phai xep truoc CHOT trong mot chuoi");
  assert.ok(a[0].viec.includes("Nạp lại tiện ích") && !a[0].viec.includes("@"),
    "chu cua nguoi phai o lai, dau phai bi cat khoi cau hien tren bang");
  assert.equal(readCanDuc(soGia({ "IDEAS.md": khongDau }), null).length, 0,
    "go dau thi muc phai BIEN MAT khoi bang — day la ca cai co che");

  /* --- (b) đóng mục thì dấu đi theo, không phải nhớ đi xoá --- */
  for (const dong of ["- ~~Nạp lại tiện ích~~ @Đức:bấm", "- XONG 06/09 · nạp lại tiện ích @Đức:bấm",
    "## ~~B-19~~ · Chọn phạm vi @Đức:chốt"]) {
    assert.equal(readCanDuc(soGia({ "IDEAS.md": ["# Sổ", dong].join(G) }), null).length, 0,
      `muc da dong thi dau het hieu luc: ${dong}`);
  }
  // Nhưng "XONG một phần" thì CHƯA xong — cùng luật với sổ nợ, không được nới.
  assert.equal(readCanDuc(soGia({ "IDEAS.md": ["# Sổ", "- XONG một phần · còn dở @Đức:chốt"].join(G) }), null).length, 1,
    "'xong mot phan' khong phai xong — muc phai con tren bang");

  /* --- (c) CRLF: mỏ neo phải khớp trên sổ viết bằng CRLF --- */
  const crlf = readCanDuc(soGia({ "IDEAS.md": ["# Sổ", "- Nạp lại @Đức:bấm", "- Chốt phạm vi @Đức:chốt"].join(CR) }), null);
  assert.equal(crlf.length, 2, "so viet bang CRLF van phai quet duoc — mo neo mu la bao '0 muc', trong y het 'khong co gi'");
  assert.ok(!crlf.some((x) => /[\r]/.test(x.viec)), "khong duoc de sot ky tu xuong dong trong cau hien tren bang");

  // Viết không dấu cũng nhận: người gõ vội không phải nhớ bỏ dấu ở đâu.
  assert.equal(readCanDuc(soGia({ "IDEAS.md": ["# Sổ", "- x @Duc:chot", "- y @duc:bam"].join(G) }), null).length, 2,
    "viet khong dau cung phai nhan — dau ma phai tra tai lieu moi dat duoc thi khong ai dat");

  /* --- (d) TREO BAO LÂU đo bằng git, không đọc đồng hồ hệ thống --- */
  const treo = readCanDuc(soGia({ "IDEAS.md": ["# Sổ", "- x @Đức:chốt", "- y @Đức:chốt"].join(G) },
    { "IDEAS.md:2": "2026-09-04", "IDEAS.md:3": "2026-09-10" }), null);
  assert.deepEqual(treo.map((x) => x.treo).sort(), [0, 6],
    "so ngay treo phai la hieu giua ngay HEAD va ngay dong — ca hai deu lay tu git");
  assert.equal(readCanDuc(soGia({ "IDEAS.md": ["# Sổ", "- x @Đức:chốt"].join(G) }), null)[0].treo, null,
    "khong phan giai duoc ngay dong thi tra null de bang noi 'chua do duoc' — tuyet doi khong bia mot ngay");

  /* --- (e) FAIL CLOSED: bộ đọc không có đường đo bằng git thì NÉM ---
     Rơi về đồng hồ hệ thống là cách bảng bắt đầu phụ thuộc giờ chạy, và sang ngày mới thì
     MỌI lane bị chặn đẩy dù không dữ liệu nào đổi. */
  const cut = soGia({ "IDEAS.md": "- x @Đức:chốt" });
  delete cut.git.lineDate;
  assert.throws(() => readCanDuc(cut, null), /THIEU_LINE_DATE/,
    "thieu duong do bang git thi phai NEM, khong duoc im lang doc dong ho");

  /* --- (f) MỎ NEO PHẢI KHỚP TRÊN REPO THẬT. Ra 0 sổ là bộ đo mù, không phải 'không có gì'. --- */
  const soThat = REAL.git.trackedPaths().filter((p) => SO_CAN_DUC.includes(p.split("/").pop()));
  assert.ok(soThat.length > 0,
    `mo neo phai khop it nhat mot so tren repo that — ra 0 la bo do HONG: ${SO_CAN_DUC.join(" ")}`);
  assert.ok(soThat.some((p) => p.endsWith("/BACKLOG.md")) && soThat.includes("IDEAS.md")
    && soThat.some((p) => p.endsWith("STATUS.md")),
    "phai quet du CA BA loai so — thieu mot loai la mot nguon viec khong co duong len bang");
  ok(`khoi Can Duc: dau len/xuong bang, muc dong thi dau di theo, CRLF khop, treo do bang git (${soThat.length} so)`);
}


/* ---- 7. Dấu ĐÓNG của sổ nợ — hai ca bẫy là lý do phép kiểm này tồn tại ---- */
{
  // ĐÓNG THẬT: dấu đứng ĐẦU tiêu đề.
  assert.equal(isDone("**XONG 02/09** (`claude-f18-evidence`). Cổng tự động"), true, "XONG dau de la da dong");
  assert.equal(isDone("ĐÃ XONG 01/09 — vá bằng cách đọc cấu trúc"), true, "DA XONG dau de la da dong");
  assert.equal(isDone("ĐÃ VÁ XONG, có bằng chứng"), true, "DA VA XONG dau de la da dong");
  assert.equal(isDone("**ĐÓNG 02/09** vì đo lại thấy không có lỗi"), true, "DONG dau de la da dong");

  // HAI CA BẪY — nới thêm chữ vào biểu thức là đóng oan đúng hai mục này.
  assert.equal(isDone("Gỡ khoá bootstrap Bridge sau khi F-02+F-04 xong (ghi decisions.md)."), false,
    'F-05: chu "xong" nam trong mot DIEU KIEN o giua cau — VAN DANG MO');
  assert.equal(isDone("**XONG một phần 02/09** (`claude-f18-evidence`): câu ở cổng gửi"), false,
    'F-19: "XONG mot phan" khong phai xong — VAN DANG MO');

  // Dấu đóng nằm giữa câu thì tính là còn mở: cố ý lệch về phía BÁO THỪA nợ.
  assert.equal(isDone("Vá cổng gửi, phần này đã xong từ hôm trước"), false,
    "dau dong giua cau khong tinh — le ve phia bao thua no, khong bao thieu");
  assert.equal(isDone(""), false, "tieu de rong khong phai da dong");
  assert.equal(isDone(null), false, "null khong duoc lam no nem");
  ok("dau DONG neo vao dau tieu de: dong 4 ca that, GIU MO ca F-05 va F-19");
}

/* ---- 8. debtByUnit đếm đúng trên một sổ nợ có đủ cả bốn loại dòng ---- */
{
  const backlog = [
    "# Sổ nợ",
    "- **F-01** · Việc đang mở bình thường",
    "- **F-02** · **XONG 02/09** đã vá và có bằng chứng",
    "- **F-03** · Gỡ khoá sau khi F-01 xong",
    "- **F-04** · **XONG một phần 02/09**",
    "- **F-05** · ~~đã đóng bằng gạch ngang~~",
    "## F-06 · Việc mở viết kiểu tiêu đề",
    "## ~~F-07~~ · Đóng bằng gạch ở mã"
  ].join("\n");
  const deps = {
    git: { trackedPaths: () => ["workers/goi-thu/v1/BACKLOG.md"] },
    readFile: () => backlog
  };
  const rows = debtByUnit(deps, { rows: [] });
  assert.equal(rows.length, 1, "mot so no thi mot dong");
  // Mở: F-01, F-03, F-04, F-06 = 4.  Đóng: F-02, F-05, F-07 = 3.
  assert.equal(rows[0].n, 4, "dem dung 4 muc con mo — F-03 va F-04 PHAI con nam trong do");
  ok("debtByUnit: 4 mo / 3 dong tren so no co du bon loai dong");
}

/* ---- 9. Dòng tuổi bảng: sinh trong ngày thì phải là "hôm nay" ---- */
{
  const deps = REAL;
  const headDate = buildOverview(deps).stats.stamp;
  // 20:00 UTC cùng ngày với mốc HEAD. Bản cũ lấy `today` (có giờ) trừ nửa-đêm-UTC rồi làm
  // tròn -> 20/24 tròn thành 1 -> "1 ngày trước" ngay trong ngày sinh. Fixture này dựng
  // ĐÚNG ca đó; đặt giờ sớm hơn 12:00 thì phép kiểm xanh cả khi lỗi còn nguyên.
  const { html, stats } = buildOverview(deps, { today: Date.parse(headDate + "T20:00:00Z") });
  assert.equal(stats.ageDays, 0, "sinh trong ngay thi tuoi phai la 0, khong phai 1");
  assert.match(html, /hôm nay/, "bang phai in hom nay");

  // Và vẫn phải đếm đúng khi thật sự đã cũ — nếu không thì phép kiểm trên là do luôn trả 0.
  const cu = buildOverview(deps, { today: Date.parse(headDate + "T20:00:00Z") + 8 * 86400000 });
  assert.equal(cu.stats.ageDays, 8, "qua 8 ngay thi phai dem ra 8");
  ok("tuoi bang: 0 ngay trong ngay sinh, 8 ngay thi dem ra 8");
}

/* ---- 10. TAB — mỗi link ở bảng tổng phải có đích thật ---- */
{
  const { html } = buildOverview(REAL);
  const tabs = [...html.matchAll(/role="tab" data-tab="([a-z-]+)" aria-selected="(true|false)"/g)];
  const panes = [...html.matchAll(/role="tabpanel" data-pane="([a-z-]+)"/g)].map((m) => m[1]);
  /* GHIM QUAN HỆ, KHÔNG GHIM CON SỐ.

     Bản đầu viết `assert.equal(tabs.length, 7)`. Thêm một tab là phép kiểm ĐỎ dù không có gì
     sai — lại đúng cái bệnh "ghim hiện trạng thay vì ghim cơ chế" đã bắt hai lần trong ngày
     03/09. Số tab là chuyện Đức quyết, không phải bất biến.

     Cái PHẢI đúng là quan hệ: mỗi tab có đúng một khung, tên khớp nhau, đúng một tab được
     chọn sẵn, và tất cả khung còn lại mang `hidden` — hỏng cái cuối là mở trang ra thấy mọi
     khung chồng nhau, đúng bệnh cuộn-quá-nhiều mà tab sinh ra để chữa. */
  assert.ok(tabs.length >= 7, `phai co it nhat 7 tab, dang co ${tabs.length}`);
  assert.equal(panes.length, tabs.length, "moi tab phai co dung mot khung noi dung");
  assert.equal(tabs.filter((t) => t[2] === "true").length, 1, "dung MOT tab duoc chon san");
  assert.deepEqual(tabs.map((t) => t[1]).sort(), [...panes].sort(), "ten tab va ten khung phai khop");

  const an = [...html.matchAll(/role="tabpanel" data-pane="[a-z-]+" hidden/g)].length;
  assert.equal(an, tabs.length - 1,
    `moi khung TRU MOT phai co hidden: co ${tabs.length} tab thi phai ${tabs.length - 1} khung an, dang co ${an}`);
  // LINK CHẾT LÀ LỖI ÂM THẦM: Đức bấm, không có gì xảy ra, và không ai biết.
  /* ID TRÙNG là lỗi VÔ HÌNH với bản trước của chính phép kiểm này: nó nhồi id vào `Set` rồi
     mới hỏi "đích có tồn tại", và `Set` ăn mất trùng lặp. Nên hai thẻ cùng
     `id="ext-duc-auto-gemini"` vẫn xanh, trong khi Đức bấm "Gemini (Platform)" ở bảng tổng thì
     trình duyệt nhảy vào thẻ ĐẦU TIÊN — bản v0.1.0 đã nghỉ.

     Đo 04/09: `r.id` duy nhất 4/5, `r.key` duy nhất 5/5. GPT audit chỉ ra, chỗ này ghim lại.
     Kiểm trên DANH SÁCH, trước khi nhồi vào Set — không thì lại tự bịt mắt mình lần nữa. */
  const idList = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
  const trung = idList.filter((v, i) => idList.indexOf(v) !== i);
  assert.deepEqual(trung, [], `id trong trang PHAI duy nhat — dang trung: ${trung.join(" ")}`);

  const ids = new Set(idList);
  const links = [...html.matchAll(/href="#([^"]+)" data-goto="([a-z-]+)"/g)];

  /* GHIM QUAN HỆ chứ không ghim ngưỡng. Bản cũ viết `links.length >= 5` — một con số hiện
     trạng: nó KHÔNG đỏ khi một đơn vị bị rơi khỏi bảng tổng, mà rơi đúng là cái đáng sợ —
     Đức mở bảng, không thấy extension đó, và tưởng nó không tồn tại. */
  const soDonVi = collectModelRows(REAL).length;
  const soYTuong = readIdeas(REAL).length;
  /* ĐẾM TRONG PHẠM VI TAB TỔNG QUAN, không đếm cả trang.
     Bản trước đếm cả trang và ăn khớp vì chỉ tab Tổng quan có link. Từ DASH-ORCH-V2 tab AI
     điều phối cũng có link nhảy sang tab Extension, nên con số cả trang không còn nói được
     điều gì — mà điều PHẢI giữ răng vẫn là: không đơn vị nào, không ý tưởng nào rơi khỏi
     bảng tổng. Rơi là Đức mở bảng, không thấy, rồi tưởng nó không tồn tại. */
  const tabTong = html.slice(html.indexOf('data-pane="tong-quan"'), html.indexOf('data-pane="ai-dieu-phoi"'));
  const linkTong = [...tabTong.matchAll(/href="#([^"]+)" data-goto="([a-z-]+)"/g)];
  assert.equal(linkTong.length, soDonVi + soYTuong,
    `bang tong phai co dung MOT link cho moi don vi va moi y tuong: ${soDonVi}+${soYTuong}, dang co ${linkTong.length}`);
  for (const [, target, goto] of links) {
    assert.ok(ids.has(target), `link "#${target}" khong co dich tren trang — bam vao khong co gi xay ra`);
    assert.ok(panes.includes(goto), `link tro sang tab "${goto}" khong ton tai`);
  }
  ok(`${tabs.length} tab, ${an} khung an, ${linkTong.length} link o bang tong va ca ${links.length} link tren trang deu co dich that`);
}

/* ---- 10b. DASH-TAB-01 · `hidden` phải THẬT SỰ ẩn, không chỉ có mặt ----

   Phép kiểm 10 ở trên hỏi "trang CÓ gì": có chín khung, tám khung mang `hidden`. Nó xanh suốt,
   và bug vẫn sống từ commit 7-tab đầu tiên tới 04/09 — vì cả suite thiếu đúng MỘT loại khẳng
   định: trang ẨN đúng những gì. Đoạn JS gán `pane.hidden = true` rất đúng; CSS mới là chỗ vỡ.
   `[role="tabpanel"]{display:flex}` là luật của TÁC GIẢ, `[hidden]{display:none}` là luật mặc
   định của TRÌNH DUYỆT, và luật tác giả thắng luật trình duyệt bất kể độ đặc hiệu. Kết quả:
   Đức bấm tab, chín khung vẫn hiện chồng nhau, không thấy gì đổi.

   Suite này KHÔNG có thư viện DOM (package.json: "dependency-free Node scripts"), nên đây là
   một bộ suy cascade tí hon, chỉ trả lời đúng một câu: "một khung tabpanel mang `hidden` thì
   `display` cuối cùng là gì". Nó KHÔNG ghim chữ của bản vá — mọi cách vá đúng đều xanh; đổi
   `display:flex` sang `display:block` mà quên luật ẩn thì đỏ.

   Hai ca tổng hợp ở dưới là BẰNG CHỨNG BỘ SUY CÓ RĂNG: nếu nó vốn luôn trả "none" thì khẳng
   định trên trang thật xanh một cách vô nghĩa. ---- */
{
  const { html } = buildOverview(REAL);

  /* Đọc `display` từ một bảng kiểu. Luật lồng trong `@media` bị làm phẳng — cố ý: làm phẳng
     là NGHIÊM HƠN (một luật chỉ đúng ở màn hình hẹp cũng bị tính), và nghiêm quá thì đỏ, còn
     lỏng quá thì im lặng cho qua. */
  const docLuat = (sheetTho) => {
    /* GHI CHÚ CSS PHẢI BỊ GỠ TRƯỚC. Bản đầu không gỡ, và văn xuôi trong ghi chú — chính ghi chú
       giải thích bản vá này — bị đọc thành một luật, rồi "thắng" cascade và làm phép kiểm đỏ
       oan. Chuyện đó xảy ra ngay lượt chạy đầu, nên nó không phải giả thuyết. */
    const sheet = sheetTho.replace(/\/\*[\s\S]*?\*\//g, " ");
    const luat = [];
    let thuTu = 0;
    for (const m of sheet.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      const d = [...m[2].matchAll(/(?:^|;)\s*display\s*:\s*([^;!]+?)\s*(!important)?\s*(?=;|$)/g)].pop();
      for (const sel of m[1].split(",")) {
        const s = sel.trim();
        thuTu += 1;
        if (s && !s.startsWith("@") && d) luat.push({ sel: s, display: d[1].trim(), quan: Boolean(d[2]), thuTu });
      }
    }
    return luat;
  };

  /* Chỉ compound CUỐI của selector mới quyết định nó có khớp chính element này hay không —
     `.card .x` không khớp được nếu `.x` không khớp. Ngược lại, compound cuối khớp thì TÍNH LÀ
     khớp dù còn tổ tiên chưa kiểm: đoán về phía nghiêm hơn, vì đoán về phía lỏng là đúng cách
     bug này đã lọt. */
  const khop = (sel, el) => {
    const cuoi = sel.split(/[\s>+~]+/).filter(Boolean).pop() || "";
    const dacTinh = [...cuoi.matchAll(/\[([\w-]+)(?:([~^$*|]?)="?([^\]"]*)"?)?\]/g)];
    const tran = cuoi.replace(/\[[^\]]*\]/g, "").replace(/::?[\w-]+(\([^)]*\))?/g, "");
    const the = (tran.match(/^[a-z][\w-]*/i) || [""])[0].toLowerCase();
    if (the && the !== el.the) return false;
    if ([...tran.matchAll(/\.([\w-]+)/g)].some((c) => !el.lop.includes(c[1]))) return false;
    if ([...tran.matchAll(/#([\w-]+)/g)].some((i) => i[1] !== el.id)) return false;
    for (const [, ten, op, giaTri] of dacTinh) {
      if (!(ten in el.dacTinh)) return false;
      if (giaTri !== undefined && op === "" && el.dacTinh[ten] !== giaTri) return false;
    }
    return true;
  };

  const dacHieu = (sel) => {
    const tran = sel.replace(/\[[^\]]*\]/g, "@");
    const id = (tran.match(/#[\w-]+/g) || []).length;
    const giua = (tran.match(/\.[\w-]+|@|:(?!:)[\w-]+/g) || []).length;
    const the = (tran.replace(/[.#][\w-]+/g, "").match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
    return id * 10000 + giua * 100 + the;
  };

  /* Luật mặc định của TRÌNH DUYỆT là điểm khởi đầu, và mọi luật tác giả đều thắng nó. Đó chính
     là cơ chế đã gây ra bug — nên nó phải nằm trong bộ suy, không được bỏ qua. */
  const tinhDisplay = (luat, el) => {
    let thang = { display: el.dacTinh.hidden !== undefined ? "none" : "block", quan: false, dh: -1, thuTu: -1, sel: "(trình duyệt)" };
    for (const r of luat) {
      if (!khop(r.sel, el)) continue;
      const dh = dacHieu(r.sel);
      const an = thang.thuTu === -1 ? true
        : r.quan !== thang.quan ? r.quan
          : dh !== thang.dh ? dh > thang.dh
            : r.thuTu > thang.thuTu;
      if (an) thang = { display: r.display, quan: r.quan, dh, thuTu: r.thuTu, sel: r.sel };
    }
    return thang;
  };

  // Element không bịa: đọc thẳng thẻ mở của từng khung trên trang thật.
  const doc = (the) => {
    const dacTinh = {};
    for (const a of the.matchAll(/([\w-]+)(?:="([^"]*)")?/g)) if (a.index > 0) dacTinh[a[1]] = a[2] === undefined ? "" : a[2];
    return { the: (the.match(/^<([a-z][\w-]*)/i) || ["", ""])[1].toLowerCase(), id: dacTinh.id || "", lop: (dacTinh.class || "").split(/\s+/).filter(Boolean), dacTinh };
  };

  const khung = [...html.matchAll(/<div [^>]*role="tabpanel"[^>]*>/g)].map((m) => doc(m[0]));
  assert.ok(khung.length >= 8, `phai doc duoc it nhat 8 khung tabpanel, dang co ${khung.length}`);
  const an = khung.filter((k) => k.dacTinh.hidden !== undefined);
  const hien = khung.filter((k) => k.dacTinh.hidden === undefined);
  assert.equal(hien.length, 1, "dung MOT khung khong mang hidden");
  assert.equal(an.length, khung.length - 1, "moi khung con lai phai mang hidden");

  /* RĂNG CỦA BỘ SUY — hai ca tổng hợp, dựng lại đúng ca hỏng lịch sử và ca đã vá.
     Không dùng chữ của bản vá, nên vá kiểu nào đúng cũng qua được. */
  const mauAn = an[0];
  assert.equal(tinhDisplay(docLuat(`[role="tabpanel"]{display:flex}`), mauAn).display, "flex",
    "BO SUY PHAI BAT DUOC ca hong: chi co luat tac gia display:flex thi khung mang hidden VAN hien — day dung la DASH-TAB-01");
  assert.equal(tinhDisplay(docLuat(`[role="tabpanel"]{display:flex}[role="tabpanel"][hidden]{display:none}`), mauAn).display, "none",
    "va PHAI cong nhan ban va dung — neu khong thi no chi biet noi 'do'");

  // TRANG THẬT.
  const iS = html.indexOf("<style>");
  const jS = html.indexOf("</style>", iS);
  assert.ok(iS !== -1 && jS !== -1, "trang phai co khoi <style> — khong co thi khong the ket luan gi");
  const luat = docLuat(html.slice(iS + "<style>".length, jS));
  assert.ok(luat.length > 0, "phai doc duoc luat display tu bang kieu — 0 la bo doc hong, khong phai bang kieu trong");

  for (const k of an) {
    const kq = tinhDisplay(luat, k);
    assert.equal(kq.display, "none",
      `khung "${k.dacTinh["data-pane"]}" mang hidden ma display = ${kq.display} (luat thang: ${kq.sel}) — Duc bam tab se khong thay gi doi`);
  }
  const kqHien = tinhDisplay(luat, hien[0]);
  assert.notEqual(kqHien.display, "none",
    `khung dang mo "${hien[0].dacTinh["data-pane"]}" bi an mat (luat thang: ${kqHien.sel}) — mo trang ra trang trong`);

  ok(`DASH-TAB-01 · ${an.length} khung mang hidden deu that su an, 1 khung mo van hien`);
}

/* ---- 11. MÔ TẢ FAIL CLOSED — thà trống còn hơn khai sai tên ---- */
{
  const deps = (h1) => ({ fileExists: () => true, readFile: () => `# ${h1}\n\nMột câu mô tả gói.\n\n## Mục sau` });

  const khop = readBrief(deps("Duc Auto ChatGPT V0.3"), { key: "workers/x/v1", name: "Duc Auto ChatGPT" });
  assert.equal(khop.text, "Một câu mô tả gói.", "tieu de khop ten thi LAY duoc mo ta");

  // Ca thật, đo 03/09: README của gói Gemini mở đầu bằng "Duc Auto ChatGPT V0.3".
  const lech = readBrief(deps("Duc Auto ChatGPT V0.3"), { key: "workers/y/v2", name: "Duc Auto Gemini (Platform)" });
  assert.equal(lech.text, "", "tieu de KHONG khop ten thi TUYET DOI khong hien chu do");
  assert.match(lech.why, /không khớp/, "phai noi ro vi sao de trong");

  // Ngoặc là chú thích của bảng, README không buộc phải có.
  const ngoac = readBrief(deps("Duc Auto Gemini V0.2"), { key: "workers/y/v2", name: "Duc Auto Gemini (Platform)" });
  assert.equal(ngoac.text, "Một câu mô tả gói.", "bo phan trong ngoac roi so — (Platform) khong lam lech");

  assert.equal(readBrief({ fileExists: () => false }, { key: "a", name: "B" }).text, "", "khong co README thi de trong");

  /* Và trên repo thật — BẤT BIẾN, không ghim một gói cụ thể.
     Bản đầu chỗ này khẳng định "gói Gemini đang có README sai tên". Sửa README xong thì
     phép kiểm ĐỎ — tức nó ghim CON BUG chứ không ghim CƠ CHẾ, và nó chặn đường sửa.
     Bất biến đúng: mỗi đơn vị phải có ĐÚNG MỘT trong hai — một câu mô tả, HOẶC một lý do
     vì sao không có. Trống cả hai là lỗi âm thầm: bảng hiện một ô rỗng không ai giải thích. */
  const real = REAL;
  for (const r of collectModelRows(real)) {
    const b = readBrief(real, r);
    assert.ok(Boolean(b.text) !== Boolean(b.why),
      `don vi "${r.name}": phai co dung MOT trong hai (mo ta / ly do de trong) — dang co`
      + ` text=${JSON.stringify(b.text)} why=${JSON.stringify(b.why)}`);
  }
  ok("mo ta FAIL CLOSED: tieu de README khong khop ten don vi thi de trong va noi ro ly do");
}

/* ---- 12. TÍNH NĂNG — ô bảng có dấu gạch chéo ngược từng làm vỡ cả bảng ---- */
{
  const BS = String.fromCharCode(92);
  const md = [
    "## 2. Tính năng",
    "",
    "| Tính năng | GPT | Gemini | Loại | Bằng chứng |",
    "|---|---|---|---|---|",
    "| Khoá tab lúc Run (B-01) | ✅ | ❌ | [ĐỌC] | chỗ nào đó |",
    `| Đọc tab.url ${BS}|${BS}| tab.pendingUrl | ✅ | ❌ | [DÒ] | đếm file |`,
    "| Cả hai đều có | ✅ | ✅ | [ĐO] | registry |",
    "",
    "## 3. Module",
    "| Không được lấy mục này | ✅ | ❌ | x | y |"
  ].join("\n");
  const rows = readFeatures({ fileExists: () => true, readFile: () => md });

  assert.equal(rows.length, 3, "dung 3 dong: bo dong tieu de, dong ke, va ca muc 3");
  assert.ok(!rows.some((r) => /Module|Không được lấy/.test(r.name)), "TUYET DOI khong lay muc 3 — do la ten module");
  assert.equal(rows[0].name, "Khoá tab lúc Run", "ma ky thuat (B-01) phai bi cat");
  assert.deepEqual([rows[0].gpt, rows[0].gemini], [true, false], "cot co/khong phai doc dung");

  // ĐÂY LÀ CA ĐÃ HỎNG THẬT: pipe có gạch chéo ngược là pipe THUỘC NỘI DUNG, không phải
  // vách ô. Tháo sai thì ô lệch và cột co/khong doc sang o sai.
  assert.match(rows[1].name, /tab\.url \|\| tab\.pendingUrl/, "pipe trong noi dung phai giu lai nguyen ven");
  assert.deepEqual([rows[1].gpt, rows[1].gemini], [true, false], "va cot co/khong KHONG duoc lech theo");
  assert.deepEqual([rows[2].gpt, rows[2].gemini], [true, true], "ca hai co thi ca hai la true");
  ok("bang tinh nang: giu pipe trong noi dung, cot khong lech, va khong lan sang muc 3");
}

/* ---- 13. NHẬT KÝ — tên quyết định phải là chữ người viết, có dấu ---- */
{
  const real = REAL;
  const d = readDecisions(real, 6);
  /* Bản cũ viết `d.total > 100` — ngưỡng hiện trạng, GPT audit chỉ đúng. Nó không nói gì về
     cơ chế: sắp xếp lại thư mục quyết định thì nó đỏ oan, còn bộ đọc hỏng hoàn toàn thì nó
     vẫn xanh miễn còn hơn 100 file. Cái PHẢI đúng là quan hệ giữa tổng và danh sách hiển thị. */
  assert.ok(d.total > 0, "phai dem duoc quyet dinh — 0 la bo doc hong, khong phai repo trong");
  assert.ok(d.total >= d.top.length, "tong khong the nho hon so dong dang hien");
  assert.equal(d.top.length, 6, "lay dung so luong xin");
  // Tên lấy từ tên file là slug không dấu — Đức đọc không hiểu. Phải đọc tiêu đề trong file.
  assert.ok(d.top.some((x) => /[àáãạăâêôơưđýếệốồớủịùũọ]/i.test(x.name)),
    "ten quyet dinh phai co dau tieng Viet — lay tu tieu de trong file, khong suy tu ten file");
  assert.ok(d.top.every((x) => /^\d{4}$/.test(x.num)), "so hieu phai la 4 chu so");
  assert.ok(d.top.every((x) => x.where), "moi quyet dinh phai noi thuoc pham vi nao");
  ok(`nhat ky: ${d.total} quyet dinh, ten doc tu tieu de trong file nen co dau`);
}

/* ---- 14. BẢN COMMIT PHẢI TẤT ĐỊNH — phép kiểm quan trọng nhất của lần này ----

   `DASHBOARD-Chrome-Extension-AI-Agentic.html` nay nằm trong khối `generators`, nên cổng chạy `--check-head` mỗi phiên
   và `safe-push` TỪ CHỐI ĐẨY khi nó lệch. Nếu nội dung phụ thuộc GIỜ ĐỒNG HỒ thì sang ngày
   mới là nó lệch HEAD **dù không một dữ liệu nào đổi**, và MỌI phiên khác bị chặn push chỉ
   vì một ngày đã qua. Đó không phải lỗi của bảng — đó là lỗi làm tê cả repo.

   Bốn lượt sinh, không nhiều hơn: một lượt tốn ~9 giây (đo 03/09) và suite này chạy trong
   cổng đóng phiên của MỌI phiên. Bản đầu gọi sáu lượt bằng deps HEAD và vượt 120 giây —
   cơ chế cần kiểm là "có nhìn đồng hồ hay không", và nó không khác nhau giữa hai loại
   deps, nên deps đĩa là đủ. ---- */
{
  const deps = REAL;
  const ten = path.basename(ROOT);
  const r1 = sinhTrang(deps);
  const a = r1.html;
  /* KHONG kiem lai "sinh hai lan ra y het" o day: cong dong phien chay
     `build-overview.mjs --check-head` MOI PHIEN, tuc tinh tat dinh duoc kiem lien tuc tren
     repo that. Mot luot sinh ton ~9 giay, va file nay chay trong cong cua moi phien — bo
     mot luot du la tra lai 9 giay cho tung phien, moi ngay. */

  const moc = Date.parse(`${r1.stats.stamp}T00:00:00Z`);

  /* FIXTURE PHẢI DỰNG ĐƯỢC CA HỎNG. Nếu `buildOverview` vốn đã phớt lờ `today` thì khẳng
     định bên dưới xanh một cách vô nghĩa. Chứng minh nó CÓ nhảy theo `today` trước đã. */
  assert.notEqual(buildOverview(deps, { title: ten, today: moc + 40 * 86400000 }).html, a,
    "buildOverview VAN phai nhay theo `today` khi duoc truyen — neu khong, khang dinh duoi vo nghia");

  // Và điều thật sự phải đúng: `sinhTrang` KHÔNG ĐƯỢC nhìn đồng hồ.
  const thuc = Date.now;
  try {
    Date.now = () => moc + 99 * 86400000;
    assert.equal(sinhTrang(deps).html, a,
      "doi dong ho len 99 ngay ma ban commit PHAI khong doi mot byte — neu doi thi moi phien bi chan push khi sang ngay");
  } finally {
    Date.now = thuc;
  }

  // Báo cũ không mất đi: nó do JS trong trang tự tính lúc MỞ, từ mốc ngày nhúng sẵn.
  assert.match(a, /data-sinh="[0-9]{4}-[0-9]{2}-[0-9]{2}"/, "trang phai nhung moc ngay de JS tinh tuoi luc xem");
  /* CHẠY THẬT đoạn JS, thay vì ghim cách nó được viết.

     Bản đầu ghim nguyên văn `nay > b.dataset.sinh` — đỏ oan khi viết lại cho gọn. Tôi nới
     xuống chỉ ghim `dataset.sinh`, và nới QUÁ TAY: một bộ sinh CÓ đọc mốc ngày nhưng KHÔNG
     BAO GIỜ bật dải đỏ vẫn xanh — tức Đức mở bảng cũ mà không hề được cảnh báo, đúng thứ
     Đức yêu cầu 03/09. GPT audit vòng 2 bắt được.

     Chạy thật thì hết cả hai lo cùng lúc: không phụ thuộc cách viết, mà vẫn đòi đúng hành vi. */
  const src = a.slice(a.lastIndexOf("<script>") + "<script>".length, a.lastIndexOf("</script>"));
  const chay = (sinh) => {
    const el = { dataset: { sinh }, textContent: "" };
    new Function("document", src)({
      getElementById: (id) => (id === "cu" ? el : null),
      querySelectorAll: () => []
    });
    return el;
  };
  const nayISO = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  const homQua = new Date(Date.parse(nayISO) - 86400000).toISOString().slice(0, 10);

  const moi = chay(nayISO);
  assert.notEqual(moi.dataset.hien, "1", "mo trong NGAY SINH thi KHONG duoc bat dai do");
  assert.equal(moi.textContent, "", "khong cu thi khong duoc viet gi len dai do");

  const cuRoi = chay(homQua);
  assert.equal(cuRoi.dataset.hien, "1", "mo SANG NGAY KHAC thi PHAI bat dai do — Duc yeu cau 03/09");
  assert.ok(cuRoi.textContent.includes(homQua), "loi bao phai noi ro ngay sinh");
  assert.ok(cuRoi.textContent.includes(nayISO), "va noi ro hom nay la ngay nao");

  assert.equal(TRANG_FILE, "DASHBOARD-Chrome-Extension-AI-Agentic.html", "ten ban chuan cua repo");
  ok("ban commit TAT DINH: doi dong ho 99 ngay khong doi mot byte, bao cu do JS tinh luc mo");
}
/* ================= TAB "AI ĐIỀU PHỐI" — brief DASH-ORCH-01 =================
 *
 * Bốn thứ phải ghim, và mỗi thứ đều dựng được ca hỏng THẬT (sửa cho sai → đỏ):
 *   · ba khối có mặt;
 *   · bảng khoá ĐỌC từ bảng chủ sở hữu, không đóng cứng;
 *   · KHÔNG rò tên chủ ra trang — đây là thứ Đức bỏ đi có chủ đích;
 *   · số khoá đổi thì bảng đổi theo.
 *
 * Ba khối đọc bằng `fileExists` / `readFile` / `listFiles`, nên thay được nguồn bằng một lớp
 * bọc mỏng quanh deps thật. Bọc chứ không dựng deps giả hoàn toàn: `buildOverview` còn đọc
 * hàng chục file khác, và một fixture giả cho tất cả sẽ không bao giờ dựng lại được ca thật. */
const bocFile = (deps, thay) => ({
  ...deps,
  fileExists: (p) => (p in thay ? thay[p] !== null : deps.fileExists(p)),
  readFile: (p) => {
    if (p in thay) {
      if (thay[p] === null) throw new Error(`KHONG_CO: ${p}`);
      return thay[p];
    }
    return deps.readFile(p);
  }
});

const claimsJson = (obj) => JSON.stringify({ claims: obj });

/* ---- T1. Bảng khoá đọc từ bảng chủ sở hữu, và chỉ nói bận/mở ---- */
{
  const deps = (obj) => bocFile(REAL, { ".agents/claims.json": claimsJson(obj) });

  assert.deepEqual(
    readKhoa(deps({ "_root": { owner: null }, "workers/goi-mot": { owner: "phien-x" } })),
    [{ ten: "_root", ban: false }, { ten: "goi-mot", ban: true }],
    "doc dung tap khoa, va owner co gia tri = BAN");

  // Chuỗi rỗng KHÔNG phải là "có chủ". `claim.mjs` đặt owner về null khi trả quyền, nhưng một
  // bản ghi cũ có thể còn "" — coi "" là bận thì Đức thấy một khoá bận vĩnh viễn không ai gỡ.
  assert.deepEqual(readKhoa(deps({ "_a": { owner: "" }, "_b": { owner: "   " } })),
    [{ ten: "_a", ban: false }, { ten: "_b", ban: false }],
    "owner rong hoac toan dau cach = MO, khong phai BAN");

  // FAIL CLOSED — bảng chủ sở hữu thiếu / hỏng / thiếu khối thì NÉM. Nuốt lỗi ở đây nghĩa là
  // Đức nhìn thấy sáu chỗ trống trong khi thật ra có người đang làm.
  assert.throws(() => readKhoa(bocFile(REAL, { ".agents/claims.json": null })),
    /CLAIMS_THIEU_FILE/, "thieu bang chu so huu thi nem");
  assert.throws(() => readKhoa(bocFile(REAL, { ".agents/claims.json": "{" })),
    /CLAIMS_HONG/, "bang chu so huu hong thi nem");
  assert.throws(() => readKhoa(bocFile(REAL, { ".agents/claims.json": "{\"claims\":[]}" })),
    /CLAIMS_THIEU_KHOI/, "mang cung cho typeof object — phai bi tu choi");

  assert.equal(tenKhoa("workers/duc-auto-gemini"), "duc-auto-gemini", "khoa goi bo phan thu muc");
  assert.equal(tenKhoa("_root"), "_root", "khoa goc giu nguyen");
  ok("khoi 1: bang khoa doc tu bang chu so huu, chi bien BAN/MO, va fail closed 3 dang");
}

/* ---- T2. DASH-ORCH-V2 · tab AI điều phối = BỐN VÙNG, đúng thứ tự ----
 *
 * THỨ TỰ LÀ ĐỀ BÀI, nên nó phải được ghim: vùng CẦN ĐỨC đứng TRƯỚC vùng công việc trong HTML.
 * Bản V1 đặt bảng khoá ở vị trí số 1, và chính bộ sinh phải lọc dòng khoá khỏi phép so độ
 * tươi vì chúng đổi quá thường xuyên — tức nó tự thừa nhận đó là ảnh chụp. Đảo lại thứ tự là
 * quay về đúng chỗ sai đó, mà không con số nào trên trang đổi, nên không gì khác bắt được.
 *
 * CẮT BẰNG CHỈ SỐ, chặn hai đầu. Không dùng biểu thức kiểu "mở [\s\S]*? đóng": phần lười đó
 * chạy thẳng ra ngoài khối và cho xanh giả — ở repo này nó đã cắn bốn lần.
 */
{
  const CHU = "phien-bi-mat-khong-duoc-lo";
  const goc = REAL;
  const sinh = (thay) => buildOverview(bocFile(goc, thay)).html;

  const cuaTab = (trang) => {
    const i = trang.indexOf('data-pane="ai-dieu-phoi"');
    assert.notEqual(i, -1, "phai co khung tab AI dieu phoi");
    const j = trang.indexOf('data-pane="extension"', i);
    assert.ok(j > i, "khung tab phai dong lai duoc, neu khong thi cat sai");
    return trang.slice(i, j);
  };
  /* Cắt tab thành từng vùng theo mốc mở khối, chặn dưới bằng mốc kế — không có khối nào lọt
     sang khối khác, nên mọi khẳng định dưới đây đúng phạm vi của nó. */
  const cuaVung = (tab) => {
    const moc = [...tab.matchAll(/<div class="card">/g)].map((m) => m.index);
    return moc.map((a, k) => tab.slice(a, k + 1 < moc.length ? moc[k + 1] : tab.length));
  };
  const vungCua = (trang) => cuaVung(cuaTab(trang));

  const sauKhoa = { "_root": { owner: CHU }, "_docs": { owner: null }, "_code": { owner: null },
    "workers/goi-mot": { owner: CHU }, "workers/goi-hai": { owner: null },
    "workers/goi-ba": { owner: null } };
  const html = sinh({ ".agents/claims.json": claimsJson(sauKhoa) });
  const tab = cuaTab(html);
  assert.ok(html.includes('data-tab="ai-dieu-phoi"'), "phai co nut tab tren thanh tab");

  const vung = cuaVung(tab);
  assert.equal(vung.length, 4,
    "tab phai co DUNG bon vung — them vung thu nam la trai brief, bot la thieu mot cau Duc phai tra loi duoc");

  /* --- (a) BỐN VÙNG, ĐÚNG THỨ TỰ --- */
  const viTri = (s) => { const i = tab.indexOf(s); assert.notEqual(i, -1, `thieu vung: ${s}`); return i; };
  const iDuc = viTri('<div class="sect">Cần Đức');
  const iViec = viTri('<div class="sect">Công việc hiện tại');
  const iKhoe = viTri('<div class="sect">Sức khoẻ Assistant');
  const iHaTang = viTri('<span class="nm">Hạ tầng<');
  assert.ok(iDuc < iViec,
    "vung CAN DUC phai dung TRUOC vung cong viec — thu tu la mot phan de bai, khong phai so thich trinh bay");
  assert.ok(iViec < iKhoe && iKhoe < iHaTang,
    "bon vung phai theo dung thu tu: can Duc -> cong viec -> suc khoe -> ha tang");

  /* --- (b) VÙNG 4 GẬP LẠI, mặc định đóng --- */
  const v4 = vung[3];
  assert.ok(v4.includes('<details class="the">'), "vung ha tang phai boc trong khoi gap");
  assert.ok(!/<details[^>]*\sopen/.test(v4),
    "khoi gap phai DONG mac dinh — mo san la ha tang lai chiem cho cua viec Duc can lam");
  assert.ok(!tab.includes("PORTABLE FREEZE"),
    "ba moc goi phai thu lai thanh MOT chip — con ca ba dong la chua thu, va moc doi vai tuan mot lan thi khong dang mot khoi rieng");
  assert.ok(v4.includes("ASSISTANT PILOT"),
    "chip phai in ten moc DANG CHAY, doc lai tu ho so moc chu khong go tay");

  /* --- (c) DẤU DÒNG KHOÁ VẪN Ở ĐẦU DÒNG sau khi bảng khoá vào khối gập ---
     Đây là cái bẫy brief cảnh báo, và nó KHÔNG có phép kiểm nào khác: thụt lề trước dấu thì
     mọi lượt đổi bận↔mở lại làm bảng lệch HEAD, và chuyện đó chỉ hiện ra lúc một phiên bị
     cổng xuất bản từ chối mà không hiểu vì sao. */
  const dongKhoa = v4.split(String.fromCharCode(10))
    .filter((l) => /<span class="badge b\d">(?:BẬN|MỞ)</.test(l));
  assert.equal(dongKhoa.length, 6, "sau khoa thi ve sau dong, va ca sau dong phai nam trong khoi gap");
  for (const l of dongKhoa) {
    assert.ok(l.startsWith(KHOA_PREFIX),
      `dong khoa PHAI bat dau bang dau, khong duoc thut le truoc dau: ${l.slice(0, 40)}`);
  }
  assert.deepEqual(dongKhoa.map((l) => [/<span class="n">([^<]+)</.exec(l)[1], /badge b\d">([^<]+)</.exec(l)[1]]),
    [["_root", "BẬN"], ["_docs", "MỞ"], ["_code", "MỞ"],
      ["goi-mot", "BẬN"], ["goi-hai", "MỞ"], ["goi-ba", "MỞ"]],
    "moi khoa mot dong, dung thu tu bang chu so huu, dung bien");

  /* --- (d) TÊN PHIÊN GIỜ ĐƯỢC HIỆN — và CHỈ ở khối "đang làm gì" ---
   *
   * ĐÂY LÀ MỘT PHÉP GHIM BỊ LẬT NGƯỢC, ghi rõ ra để phiên sau không tưởng là lỗi. Trước
   * 05/09 chỗ này ghim `!tab.includes(CHU)` — "tuyệt đối không lộ tên phiên". `ADR-0004` đảo
   * lại chính quyết định đó của Đức: tên lane quay lại bảng, vì lý do bỏ đi hồi trước (tên
   * đổi liên tục làm bảng mục) đã được xử bằng `KHOA_PREFIX`.
   *
   * Nhưng nửa sau của khẳng định KHÔNG được nới: tên lane chỉ được xuất hiện trên những dòng
   * MANG DẤU. Một tên lane lọt ra dòng không dấu là mỗi lượt nhận/trả khoá lại chặn push của
   * MỌI lane — đúng cái mà phép ghim cũ đang bảo vệ, và phần đó vẫn phải đứng. */
  assert.ok(tab.includes(CHU), "ten lane dang giu vung PHAI hien o tab AI dieu phoi (ADR-0004)");
  {
    const dongCoTen = html.split(String.fromCharCode(10)).filter((l) => l.includes(CHU));
    assert.ok(dongCoTen.length > 0, "fixture phai toi duoc bo sinh");
    for (const l of dongCoTen) {
      assert.ok(l.startsWith(KHOA_PREFIX),
        `ten lane CHI duoc nam tren dong mang dau — dong nay khong mang: ${l.slice(0, 70)}`);
    }
  }
  assert.ok(/ảnh chụp lúc sinh/.test(v4),
    "phai con cau noi ro khoi khoa la anh chup luc sinh, khong phai trang thai thoi gian thuc");

  // Số khoá đổi thì bảng đổi theo — bằng chứng nó không đóng cứng sáu dòng.
  const v4It = vungCua(sinh({ ".agents/claims.json": claimsJson({ "_root": { owner: null }, "_docs": { owner: "ai-do" } }) }))[3];
  assert.equal([...v4It.matchAll(/class="badge b\d">(?:BẬN|MỞ)</g)].length, 2,
    "hai khoa thi ve hai dong — bang khoa khong duoc dong cung");
  assert.ok(v4It.includes("2 khoá") && v4.includes("6 khoá"), "so dem tren tieu de phai di theo tap khoa");

  /* --- (e) VÙNG 1 SUY TỪ DẤU TRONG SỔ, không đọc `human_action` (đề bài `BANG-CAN-DUC-01`) ---
   *
   * PHÉP GHIM BỊ LẬT NGƯỢC, ghi rõ để phiên sau không tưởng là lỗi. Trước 06/09 chỗ này ghim
   * "vùng 1 phải có đúng MỘT dòng cho mỗi đơn vị có `human_action`". Đức bác chính hình dạng
   * đó: một trường một hồ sơ nghĩa là trần cứng bốn dòng, chữ gõ tay thì mục, và việc BẤM bị
   * trộn với việc CHỐT. Nay nguồn là DẤU trong ba sổ, nên khẳng định phải neo vào dấu.
   *
   * LƯỢT ĐIỀN DẤU ĐÃ XẢY RA (06/09, hai lane `claude-dau-goc` và `claude-dau-worker`), nên
   * khẳng định ở đây LẬT NGƯỢC: trên sổ thật khối phải CÓ DÒNG, và câu "chưa ai đánh dấu"
   * phải biến mất. Bản trước ghim trạng thái rỗng và tự nói "điền dấu là lượt sau" — lượt sau
   * đến rồi, dấu nằm ở `_docs`/`_root`, còn phép ghim nằm ở `_code`, nên hai lane điền dấu
   * không với tới được nó và cổng đỏ với mọi phiên cho tới khi chủ `_code` dọn.
   *
   * Số ghim là số ĐẾM ĐƯỢC từ sổ, không gõ cứng: sổ còn mọc dấu, và số gõ cứng thì sẽ mục. */
  const rows = collectModelRows(goc);
  const v1 = vung[0];
  const canDuc = readCanDuc(goc, collectModel(goc, { tolerant: true }));
  assert.equal(canDuc.length,
    [...v1.matchAll(/<div class="dr"><div class="h">/g)].length,
    "so dong ve ra phai bang DUNG so muc co dau — khong tran, khong hut");
  assert.ok(canDuc.length > 0,
    "so that phai con dau @Duc, neu khong thi moi khang dinh duoi day chi dang do nhanh RONG");
  assert.ok(!v1.includes("vì chưa ai đánh dấu"),
    "co dau roi ma van in cau 'chua ai danh dau' la bang noi hai dieu nguoc nhau");
  assert.ok(!v1.includes("Cách cũ vẫn còn"),
    "cau an ui cua nhanh RONG phai bien mat khi khoi da co dong");
  assert.ok(rows.filter(choDuc).length > 0,
    "ho so that phai con don vi khai theo cach cu — hai nguon con song song, chua cat nguon nao");
  assert.ok(v1.includes("@Đức:bấm") && v1.includes("@Đức:chốt"),
    "trang phai day du cach dat dau — nguoi viet so khong duoc phai tra tai lieu moi dat duoc");

  /* --- (f) FIXTURE: cắm dấu vào sổ thì mục LÊN bảng, gom theo chuỗi, tách BẤM/CHỐT, và
       trường TUỲ CHỌN `blocked_if_skipped` vẽ dòng phụ khi mục nằm trong hồ sơ trạng thái.
     MỘT lượt sinh cho cả cụm. Đo trên máy: một lượt `buildOverview` tốn khoảng mười hai giây,
     nên mỗi fixture thêm là mười hai giây cộng vào cổng đóng phiên của MỌI phiên sau. */
  assert.equal([...v1.matchAll(/class="w">/g)].length, canDuc.filter((v) => v.chan).length,
    "dong phu chi moc o muc CO khai truong tuy chon — dem tren so that, khong go cung");
  const themFm = (text, dong) => text.replace(/^---\r?\n/, `---${String.fromCharCode(10)}${dong}${String.fromCharCode(10)}`);
  const doiHang = (text, so) => text.replace(/^priority_rank:.*$/m, `priority_rank: ${so}`);
  const CAU_CHAN = "quan sat nam im, khong ai biet no con song hay khong";
  const G = String.fromCharCode(10);
  const VIEC_BAM = "nap lai tien ich roi bao lai cho toi";
  const VIEC_CHOT = "co cho doi pham vi cua goi nay khong";
  const gpt = rows.find((r) => r.name === "Duc Auto ChatGPT");
  assert.ok(gpt && gpt.statusPath, "phai tim duoc ho so cua don vi GPT de dung fixture");
  /* Bản vá fixture tách ra thành BIẾN, để phép ghim đọc được cùng một thứ mà bộ sinh đọc.
     Bản trước ghim thẳng số 2 vì lúc đó sổ thật chưa có dấu nào. Hai lane điền dấu 06/09 làm
     con số đó sai, và cách chữa "cộng thêm số dấu thật" VẪN SAI: fixture cắm
     `blocked_if_skipped` vào `STATUS.md` gốc, nên mọi dấu THẬT nằm trong file đó cũng mọc
     dòng phụ theo. Nên số kỳ vọng phải đếm trên CHÍNH bộ đọc đã vá, không phải trên bộ gốc.
     (`readCanDuc` chỉ dùng `model` để đoán tên chuỗi, nên truyền `null` là đủ và rẻ.) */
  const thayFx = {
    "STATUS.md": themFm(goc.readFile("STATUS.md"), `blocked_if_skipped: "${CAU_CHAN}"`)
      + `${G}- ${VIEC_CHOT} @Đức:chốt${G}`,
    "IDEAS.md": `${goc.readFile("IDEAS.md")}${G}- ${VIEC_BAM} @Đức:bấm${G}`,
    [gpt.statusPath]: doiHang(goc.readFile(gpt.statusPath), 99)
  };
  const canDucFx = readCanDuc(bocFile(goc, thayFx), null);
  assert.equal(canDucFx.length, canDuc.length + 2, "fixture phai them DUNG hai dau, khong hon khong kem");
  const vungFx = vungCua(sinh(thayFx));
  const v1Co = vungFx[0];
  assert.equal([...v1Co.matchAll(/<div class="dr"><div class="h">/g)].length, canDucFx.length,
    "cam hai dau thi ve them DUNG hai dong — day la bang chung khoi khong con tran so dong");
  assert.ok(v1Co.includes(VIEC_BAM) && v1Co.includes(VIEC_CHOT), "ca hai muc phai len bang");
  assert.ok(/<span class="badge b0">BẤM</.test(v1Co) && /<span class="badge b1">CHỐT</.test(v1Co),
    "BAM va CHOT phai tach ra, moi loai mot nhan — xep chung thi cai nao cung trong nhu nhau");
  assert.ok([...v1Co.matchAll(/<div class="cg">/g)].length >= 1,
    "phai gom theo chuoi viec — day la hinh dang Duc chot 06/09");
  assert.ok(/treo \d+ ngày|vừa nêu ở bản mới nhất|chưa đo được/.test(v1Co),
    "moi dong phai noi muc do treo bao lau");
  assert.ok(v1Co.includes("xong thì mở khoá chuỗi"),
    "moi dong phai noi ro xong no thi mo khoa chuoi nao — do la ca ly do Duc chon hinh dang nay");
  assert.ok(v1Co.includes(`Chưa làm thì: ${CAU_CHAN}`),
    "muc nam trong ho so trang thai co khai truong tuy chon thi PHAI ve dong phu");
  assert.equal([...v1Co.matchAll(/class="w">/g)].length, canDucFx.filter((v) => v.chan).length,
    "CHI muc co khai moi co dong phu — muc trong so y tuong khong duoc moc them dong rong");
  assert.ok(canDucFx.some((v) => !v.chan),
    "phai con muc KHONG co dong phu, neu khong thi khang dinh tren khong phan biet duoc gi");
  assert.ok(!v1Co.includes("vì chưa ai đánh dấu"),
    "co dau roi thi cau 'chua ai danh dau' phai BIEN MAT — con lai la bang noi hai dieu nguoc nhau");

  /* --- (g) VÙNG 2 xếp theo thứ hạng tự khai --- */
  const v2 = vung[1];
  const tenV2 = [...v2.matchAll(/data-goto="extension">([^<]+)<\/a>/g)].map((m) => m[1]);
  assert.equal(tenV2.length, rows.length, "vung 2 phai co dung MOT dong cho moi don vi — roi mot don vi la Duc tuong no khong ton tai");
  const hang1 = rows.find((r) => r.priorityRank === 1);
  assert.ok(hang1, "ho so that phai co dung mot don vi hang 1");
  assert.equal(tenV2[0], hang1.name, "don vi hang 1 phai dung DAU vung cong viec");
  const chuaHang = rows.filter((r) => !Number.isFinite(r.priorityRank)).map((r) => r.name);
  assert.ok(chuaHang.length > 0, "ho so that phai co it nhat mot don vi chua khai hang");
  for (const n of chuaHang) {
    assert.ok(tenV2.indexOf(n) >= tenV2.length - chuaHang.length,
      `${n} chua khai hang thi phai xuong CUOI — coi no la hang 0 la no nhay len dau bang`);
  }
  // Và thứ tự PHẢI đi theo thứ hạng, không theo tên: đổi hạng thì dòng phải đổi chỗ.
  const tenDoi = [...vungFx[1].matchAll(/data-goto="extension">([^<]+)<\/a>/g)].map((m) => m[1]);
  assert.ok(tenV2.indexOf(gpt.name) < tenDoi.indexOf(gpt.name),
    "ha thu hang mot don vi thi dong cua no phai TUT XUONG — khong tut la bang khong doc thu hang");

  /* --- (h) VÙNG 3: đổi tên khối, và nói thẳng chỗ bảng chưa đếm được --- */
  const v3 = vung[2];
  assert.ok(v3.includes("Đề bài đang mở của chính tôi"),
    "phai doi ten khoi — goi mot de bai cai tien la 'sai lech' thi sai");
  assert.ok(!tab.includes("Sai lệch đã ghi nhận"), "ten cu phai bien mat khoi tab");
  const deBaiMo = readDefects(goc).filter((d) => d.mo);
  assert.ok(v3.includes(`${deBaiMo.length} MỤC`), "so de bai dang mo phai dem tu truong may doc duoc");
  for (const d of deBaiMo) assert.ok(v3.includes(d.ma), `ma de bai dang mo ${d.ma} phai co trong danh sach mot dong`);
  assert.ok(v3.includes("ASSISTANT PILOT"), "moc pilot phai doc lai tu ho so moc");
  /* Ba dòng đếm sự cố nay ĐÃ đếm được (Đức chốt định dạng 04/09), nên câu "bảng chưa đếm được"
     phải biến mất — để lại là bảng nói mình không biết trong khi nó đang in ba con số. */
  assert.ok(!tab.includes("bảng chưa đếm được"),
    "cau 'chua dem duoc' phai bien mat khi ba dong da dem duoc — de lai la bang tu noi nguoc voi so no dang in");
  for (const [, ten] of SU_CO_ASSISTANT) {
    assert.ok(v3.includes(ten), `vung 3 phai co dong dem "${ten}"`);
  }

  /* --- (i) Bỏ hết `human_action` thì huy hiệu ở vùng 2 phải đổi từ CHỜ ĐỨC sang ĐANG CHẠY.
     VÙNG 1 KHÔNG CÒN ĐỌC TRƯỜNG NÀY (đề bài `BANG-CAN-DUC-01`, Đức chốt 06/09), nên phần
     khẳng định về vùng 1 nay neo vào chỗ khác: bỏ hết trường thì câu "cách cũ vẫn còn N đơn
     vị" phải biến mất, vì không còn đơn vị nào khai theo cách cũ để mà kể. --- */
  const xoaFm = (text, ten) => text.replace(new RegExp(`^${ten}:.*\\r?\\n`, "m"), "");
  const boHet = {};
  for (const r of rows) if (r.statusPath) boHet[r.statusPath] = xoaFm(goc.readFile(r.statusPath), "human_action");
  assert.ok(Object.keys(boHet).length >= 4, "phai bo duoc truong o it nhat bon ho so, neu khong thi (i) vo nghia");
  /* GỠ CẢ DẤU, không chỉ trường cũ. Vùng 1 nay ăn DẤU chứ không ăn `human_action`, nên bỏ
     mỗi trường cũ thì vùng 1 KHÔNG rỗng và nhánh "rỗng" không bao giờ được chạy thử. Bản
     trước vẫn ghim câu "chưa ai đánh dấu" ở đây; nó chỉ còn xanh chừng nào sổ chưa có dấu
     nào — tức nó xanh vì repo trống, không vì bộ sinh đúng. Cắt dấu ở đúng những file mà
     `readCanDuc` đã đọc ra dấu, rồi kiểm lại là đã sạch trước khi khẳng định. */
  const xoaDau = (text) => text.split(G).map((l) => l.replace(/@(?:Đức|Duc)\s*:\s*(?:chốt|chot|bấm|bam)/giu, "")).join(G);
  for (const rel of new Set(canDuc.map((v) => v.nguon))) boHet[rel] = xoaDau(boHet[rel] ?? goc.readFile(rel));
  assert.equal(readCanDuc(bocFile(goc, boHet), null).length, 0,
    "fixture phai go SACH dau, neu khong thi khang dinh 'vung rong' duoi day do sai nhanh");
  const vungTrong = vungCua(sinh(boHet));
  assert.equal(vungTrong.length, 4, "vung 1 trong thi tab VAN du bon vung");
  assert.ok(vungTrong[0].includes("vì chưa ai đánh dấu"),
    "vung trong LA mot thong tin — phai in ra mot dong noi ro vi sao trong, khong duoc an ca vung");
  assert.ok(!vungTrong[0].includes("Cách cũ vẫn còn"),
    "khong con don vi nao khai theo cach cu thi cau ke ve cach cu phai BIEN MAT — de lai la bang dem mot con so khong con dung");
  /* KHỚP TRÊN HUY HIỆU, không khớp trên cả vùng: câu chú giải của vùng 2 có NHẮC chữ
     "CHỜ ĐỨC" để giải thích luật, nên `includes` trên cả vùng luôn đúng và khẳng định này
     sẽ không bao giờ đỏ. Bắt được đúng ở lượt chạy đầu — một xanh giả thật. */
  const huyHieu = (v) => [...v.matchAll(/class="badge b\d">([^<]+)</g)].map((m) => m[1]);
  assert.ok(!huyHieu(vungTrong[1]).includes("CHỜ ĐỨC"),
    "bo het truong thi khong con huy hieu CHO DUC nao o vung 2");
  assert.ok(huyHieu(vungTrong[1]).includes("ĐANG CHẠY"), "va don vi con song phai doi sang DANG CHAY");
  assert.ok(huyHieu(vung[1]).includes("CHỜ ĐỨC"),
    "va tren ho so THAT thi phai co huy hieu CHO DUC — neu khong thi khang dinh tren vo nghia");

  ok("tab AI dieu phoi: bon vung dung thu tu, vung 1 suy tu DAU trong so (gom theo chuoi, tach BAM/CHOT, co so ngay treo), vung 2 xep theo hang, dau dong khoa con nguyen trong khoi gap");
}

/* ---- T2b. Ba trạng thái suy ra, và `human_action` THẮNG `lifecycle` ----
 *
 * Ghim trên bảng thật KHÔNG đủ: hôm nay cả bốn đơn vị còn sống đều có việc chờ Đức, nên
 * nhánh ĐANG CHẠY chưa từng chạy trên hồ sơ thật. Ba trạng thái thì phải ghim cả ba, và ghim
 * cả quan hệ giữa chúng — không thì một bản gộp hai trạng thái vẫn xanh.
 */
{
  const tt = (row) => trangThaiDonVi(row).chu;

  assert.equal(tt({ lifecycle: "active", humanAction: "nạp lại tiện ích" }), "CHỜ ĐỨC");
  assert.equal(tt({ lifecycle: "building", humanAction: "chốt một câu" }), "CHỜ ĐỨC");
  assert.equal(tt({ lifecycle: "active", humanAction: "không" }), "ĐANG CHẠY",
    "'khong' la DA TRA LOI va khong co gi cho — khong duoc coi la co viec");
  assert.equal(tt({ lifecycle: "building", humanAction: "" }), "ĐANG CHẠY");
  assert.equal(tt({ lifecycle: "active", humanAction: "   " }), "ĐANG CHẠY",
    "truong toan dau cach la CHUA AI TRA LOI, khong phai co viec");
  assert.equal(tt({ lifecycle: "superseded", humanAction: "" }), "XONG");
  assert.equal(tt({ lifecycle: "archived" }), "XONG");
  assert.equal(tt({ lifecycle: "paused" }), "XONG",
    "'paused' cung la mot gia tri nghi — de no thanh DANG CHAY thi bang noi khac thanh bac o tab Tong quan");

  /* KHẲNG ĐỊNH QUAN TRỌNG NHẤT: cùng một `lifecycle` mà một cái có việc chờ Đức, một cái
     không, thì HAI trạng thái phải KHÁC nhau. Không có dòng này thì một bản chỉ đọc
     `lifecycle` và bỏ qua `human_action` vẫn xanh ở mọi khẳng định trên. */
  assert.notEqual(tt({ lifecycle: "active", humanAction: "cần Đức chốt" }),
    tt({ lifecycle: "active", humanAction: "không" }),
    "human_action PHAI thang lifecycle — cung mot lifecycle phai ra hai trang thai khac nhau");

  // Đơn vị đã nghỉ hưu thì ra khỏi cuộc đua, dù trường cũ còn chữ trong đó.
  assert.equal(tt({ lifecycle: "superseded", humanAction: "chữ cũ còn sót lại" }), "XONG",
    "don vi da nghi huu KHONG cho Duc nua — con hien la Duc lam mot viec da khong con y nghia");
  assert.equal(choDuc({ lifecycle: "superseded", humanAction: "chữ cũ" }), false,
    "va ba cho hoi cung mot cau phai tra cung mot cau tra loi");

  // Ba trạng thái, không hai và không năm.
  const bo = new Set(["active", "building", "superseded", "archived", "paused", "idea", "experimental"]
    .flatMap((lc) => [tt({ lifecycle: lc }), tt({ lifecycle: lc, humanAction: "x" })]));
  assert.equal(bo.size, 3, `phai la DUNG ba trang thai, dang co: ${[...bo].join(" · ")}`);
  ok("trang thai luong: ba nhanh dung, human_action thang lifecycle, don vi nghi huu ra khoi cuoc dua");
}

/* ---- T2b2. CONTENT-TRUTH-01 defect 4: chip "ĐÃ CHỨNG MINH" không được đứng một mình khi
 * code đã đổi kể từ mốc kiểm chứng.
 *
 * GHIM QUAN HỆ, KHÔNG GHIM CON SỐ. Số commit đổi mỗi ngày (brief ghi 10, đo lại ra 14 chỉ sau
 * một buổi), nên mọi khẳng định dưới đây lấy số TỪ MÔ HÌNH rồi đòi trang phải nói đúng số đó.
 * Ghim `23` là ngày mai đỏ oan, và người sau sẽ sửa phép kiểm thay vì sửa bảng.
 */
{
  const goc = REAL;
  const rows = collectModelRows(goc);
  const coMoc = (r) => Boolean(String(r.lastVerified ?? "").trim());
  const cu = rows.filter((r) => coMoc(r) && r.changedCount > 0);
  const tuoi = rows.filter((r) => !(coMoc(r) && r.changedCount > 0));
  assert.ok(cu.length > 0,
    "ho so that phai co it nhat mot don vi 'co moc kiem chung ma code da doi' — khong co thi ca khoi nay vo nghia");
  assert.ok(tuoi.length > 0,
    "va it nhat mot don vi KHONG thuoc ca do — khong co thi khang dinh 'khong bia canh bao' vo nghia");

  // Hàm thuần trước: quan hệ hai điều kiện, cả bốn tổ hợp.
  assert.equal(chungMinhCu({ lastVerified: "2026-08-26", changedCount: 7 }).includes("7 commit"), true);
  assert.equal(chungMinhCu({ lastVerified: "2026-08-26", changedCount: 0 }), "",
    "code chua doi ke tu moc thi bang chung DUNG la cua ban dang chay — canh bao la bia");
  assert.equal(chungMinhCu({ lastVerified: "", changedCount: 9 }), "",
    "chua tung khai kiem chung thi khong co khoang cach nao de noi");
  assert.equal(chungMinhCu({ lastVerified: "   ", changedCount: 9 }), "",
    "truong toan dau cach la CHUA KHAI, khong phai da khai");
  assert.equal(chungMinhCu({}), "", "row trong thi tra rong, khong nem");
  assert.ok(/CẦN KIỂM LẠI/.test(chungMinhCu({ lastVerified: "2026-08-26", changedCount: 1 })),
    "chu Duc muon thay la 'can kiem lai' — khong duoc rut thanh mot con so tran");

  const html = buildOverview(goc).html;

  /* (a) BẢNG TỔNG — nơi Đức nhìn đầu tiên, và KHÔNG nằm trong khối gập. */
  const tabTong = html.slice(html.indexOf('data-pane="tong-quan"'), html.indexOf('data-pane="ai-dieu-phoi"'));
  const iBig = tabTong.indexOf('<div class="big">');
  assert.notEqual(iBig, -1, "phai co khoi danh sach extension o tab tong quan");
  const khoiBig = tabTong.slice(iBig, tabTong.indexOf('<p class="note">', iBig));
  assert.ok(!khoiBig.includes("<details"),
    "canh bao do tuoi KHONG duoc nam trong khoi gap — de bai noi ro: hien cung cho voi chip trang thai");

  const dongCua = (khoi, ten) => {
    const d = khoi.split('<div class="br">').filter((x) => x.includes(`>${ten}</a>`));
    assert.equal(d.length, 1, `${ten}: phai co dung MOT dong trong bang tong`);
    return d[0];
  };
  for (const r of cu) {
    const d = dongCua(khoiBig, r.name);
    assert.ok(d.includes('class="chip'), `${r.name}: dong phai co chip trang thai, neu khong thi cat sai`);
    assert.ok(d.includes('class="stale"'),
      `${r.name}: co moc kiem chung ma code da doi ${r.changedCount} commit — trang PHAI canh bao ngay canh chip, khong duoc de chip 'DA CHUNG MINH' dung mot minh`);
    assert.ok(d.includes(`cũ hơn ${r.changedCount} commit`),
      `${r.name}: canh bao phai noi dung so commit lay tu mo hinh, khong duoc go cung`);
  }
  for (const r of tuoi) {
    assert.ok(!dongCua(khoiBig, r.name).includes('class="stale"'),
      `${r.name}: khong thuoc ca hong thi KHONG duoc bia canh bao — bia canh bao lam mon chinh canh bao`);
  }

  /* (b) TAB EXTENSION — cảnh báo phải nằm trong phần TÓM TẮT, tức thấy được khi khối còn đóng.
     Nhét vào thân khối là đúng cái "giấu trong toggle" mà đề bài cấm. */
  const iExt = html.indexOf('data-pane="extension"');
  const jExt = html.indexOf('data-pane="y-tuong"', iExt);
  assert.ok(jExt > iExt, "khung tab Extension phai dong lai duoc — cat ho toi cuoi trang la an ca khoi gap cua tab khac");
  const tabExt = html.slice(iExt, jExt);
  const tomTat = new Map(tabExt.split('<details class="the" id="').slice(1).map((c) => {
    const j = c.indexOf("</summary>");
    assert.notEqual(j, -1, "moi khoi don vi phai co phan tom tat dong lai duoc");
    const s = c.slice(0, j);
    return [/<span class="nm">([^<]+)</.exec(s)[1], s];
  }));
  assert.equal(tomTat.size, rows.length, "phai cat duoc dung mot phan tom tat cho moi don vi");
  for (const r of cu) {
    assert.ok(tomTat.get(r.name).includes('class="stale"'),
      `${r.name}: canh bao phai o phan TOM TAT — nam trong than khoi la giau trong toggle, de bai cam`);
  }
  for (const r of tuoi) {
    assert.ok(!tomTat.get(r.name).includes('class="stale"'), `${r.name}: khong duoc bia canh bao o tom tat`);
  }

  ok(`chung minh cu: ${cu.length} don vi co moc ma code da doi deu duoc canh bao canh chip, ${tuoi.length} don vi con lai khong bi bia`);
}

/* ---- T2b3. Ba dòng đếm sự cố của chính Assistant — Đức chốt định dạng 04/09.
 *
 * NEO BẰNG MỘT DÒNG. Nhật ký gốc có một câu GIẢI THÍCH định dạng, trong đó nhãn nằm giữa câu
 * và trong nháy ngược. Neo nhiều dòng hoặc dò văn xuôi là đếm cả câu giải thích đó — và ở repo
 * này CRLF đã làm hỏng neo nhiều dòng bốn lần trong một ngày, lần nào cũng báo "0 lần khớp".
 */
{
  const goc = REAL;
  const CRLF = String.fromCharCode(13) + String.fromCharCode(10);
  const nhatKy = (dong) => bocFile(goc, { "HANDOFF.md": dong.join(CRLF) });
  const dem = (dong) => {
    const r = readAssistantEvents(nhatKy(dong));
    return new Map([...r.dong.map((s) => [s.token, s.n]), ["UNKNOWN", r.la]]);
  };

  /* (a) NHẬT KÝ THẬT: ba sự cố đã ghi lùi. Đây là chỗ đỏ khi ai đó xoá một dòng. */
  const that = readAssistantEvents(goc);
  assert.equal(that.dong.length, 3, "phai la DUNG ba dong dem — them dong thu tu la trai de bai");
  for (const s of that.dong) {
    assert.ok(s.n >= 1,
      `${s.token}: nhat ky that co ghi lui su co nay, ma dem ra ${s.n} — hoac dong da bi xoa, hoac bo doc hong`);
  }
  assert.equal(that.la, 0, "nhat ky that khong co su co chua phan loai nao");

  /* (b) ĐẾM KHỚP TOKEN, một dòng, và nhắc nhãn giữa câu KHÔNG được tính. */
  let m = dem(["AssistantEvent: ROLE-DRIFT", "văn xuôi ở giữa", "AssistantEvent: ROLE-DRIFT",
    "AssistantEvent: DASHBOARD-STALE"]);
  assert.equal(m.get("ROLE-DRIFT"), 2, "hai dong thi dem hai — CRLF khong duoc lam mat dong nao");
  assert.equal(m.get("DASHBOARD-STALE"), 1);
  assert.equal(m.get("STATE-DRIFT-CAUGHT-BY-DUC"), 0, "token khong xuat hien thi la 0, khong phai bien mat");

  m = dem(["Đức chốt: mỗi sự cố là một dòng `AssistantEvent: ROLE-DRIFT`",
    "> Đức: AssistantEvent: ROLE-DRIFT"]);
  assert.equal(m.get("ROLE-DRIFT"), 0,
    "nhac nhan GIUA CAU khong phai mot su co — dem no la bang tu thoi phong so cua chinh no");

  /* (c) TOKEN LẠ THÌ NÉM. Trong đó có `PASS` và `ANSWERED`: Assistant không có đường nào tự
     ghi điểm cho mình, và luật token lạ là thứ cưỡng chế điều đó. */
  for (const la of ["ROLEDRIFT", "role-drift", "PASS", "ANSWERED", "ROLE-DRIFT-01", ""]) {
    assert.throws(() => readAssistantEvents(nhatKy([`AssistantEvent: ${la}`])),
      /NHAN_SU_CO_LA/,
      `token la "${la}" phai NEM co ten — bo qua im lang thi dung cai su co ay bien mat khoi so dem`);
  }

  /* (d) `UNKNOWN` đếm riêng, KHÔNG gộp vào ba dòng. */
  m = dem(["AssistantEvent: UNKNOWN", "AssistantEvent: UNKNOWN"]);
  assert.equal(m.get("UNKNOWN"), 2, "`UNKNOWN` la token hop le, phai dem duoc");
  assert.equal(SU_CO_ASSISTANT.reduce((s, [t]) => s + m.get(t), 0), 0,
    "`UNKNOWN` KHONG duoc gop vao ba dong — gop la mot su co chua phan loai bi tinh thanh mot loai cu the");

  /* (d2) CẮT ĐUÔI `HANDOFF.md` KHÔNG ĐƯỢC LÀM SỐ ĐẾM VỀ 0 — sự cố thật, 06/09.
     ADR-0008 dời 62 mục cũ sang `HANDOFF-ARCHIVE-01.md` (commit c2e5a2d). Bộ đếm này khi đó
     chỉ đọc `HANDOFF.md`, nên cả bốn dòng sự cố biến mất, mục (a) ở trên ĐỎ, và vì bảng nằm
     trong khối `generators` nên cổng đóng phiên ĐỎ với MỌI lane trên `origin/main`.
     Đây là bộ đếm CỘNG DỒN: "0 sự cố" đọc y hệt "sạch sẽ" trong khi thật ra là "mù" — đúng
     cái bẫy mục (e) bên dưới cảnh báo, chỉ khác là nó tới từ phía dữ liệu. */
  {
    const luuTru = "HANDOFF-ARCHIVE-01.md";
    const conTro = `> Lịch sử cũ hơn đã dời sang [\`${luuTru}\`](${luuTru}) — cùng thư mục.`;
    const cu = ["AssistantEvent: ROLE-DRIFT", "AssistantEvent: DASHBOARD-STALE"].join(CRLF);

    const coConTro = readAssistantEvents(bocFile(goc, {
      "HANDOFF.md": [conTro, "AssistantEvent: ROLE-DRIFT"].join(CRLF),
      [luuTru]: cu
    }));
    const dongCua2 = new Map(coConTro.dong.map((s) => [s.token, s.n]));
    assert.equal(dongCua2.get("ROLE-DRIFT"), 2,
      "cat duoi roi thi phai dem CA phan da doi di — khong thi mot lan cat lam moi so ve 0 trong im lang");
    assert.equal(dongCua2.get("DASHBOARD-STALE"), 1, "su co chi con o file luu tru van phai duoc dem");

    /* Đi theo CON TRỎ, không gõ cứng tên file: không có con trỏ thì không đọc gì thêm. Đây là
       thứ khiến lần cắt sau (`-02`, `-03`…) không phải sửa lại bộ đếm. */
    const khongConTro = readAssistantEvents(bocFile(goc, {
      "HANDOFF.md": "AssistantEvent: ROLE-DRIFT",
      [luuTru]: cu
    }));
    assert.equal(new Map(khongConTro.dong.map((s) => [s.token, s.n])).get("ROLE-DRIFT"), 1,
      "khong co con tro thi KHONG duoc tu doan ten file luu tru — go cung ten la no chet o lan cat sau");

    /* CHUỖI DÀI HƠN MỘT BƯỚC — ADR-0011 xoay `HANDOFF.md` theo THÁNG, nên chuỗi dài ra mãi:
       `HANDOFF.md` → `-02` → `-01` → … Con trỏ sang `-01` nằm TRONG `-02`, không nằm trong
       `HANDOFF.md`. Bản đầu của bộ đếm lấy danh sách con trỏ MỘT LẦN rồi mới vào vòng lặp, nên
       nó đi được đúng một bước và mọi sự cố cũ hơn một tháng biến mất khỏi số đếm — đúng lại
       con bug 06/09, chỉ chậm hơn 30 ngày. */
    {
      const troToi = (t) => `> Lịch sử cũ hơn đã dời sang [\`${t}\`](${t}) — cùng thư mục.`;
      const chuoi = readAssistantEvents(bocFile(goc, {
        "HANDOFF.md": [troToi("HANDOFF-ARCHIVE-02.md"), "AssistantEvent: ROLE-DRIFT"].join(CRLF),
        "HANDOFF-ARCHIVE-02.md": [troToi(luuTru), "AssistantEvent: ROLE-DRIFT"].join(CRLF),
        [luuTru]: "AssistantEvent: ROLE-DRIFT"
      }));
      assert.equal(new Map(chuoi.dong.map((s) => [s.token, s.n])).get("ROLE-DRIFT"), 3,
        "phai di HET chuoi con tro, khong phai mot buoc — di mot buoc thi thang thu hai tro di am tham bien mat");

      /* Chuỗi vòng lại chính nó KHÔNG được làm treo bộ đếm. */
      const vong = readAssistantEvents(bocFile(goc, {
        "HANDOFF.md": [troToi("HANDOFF-ARCHIVE-02.md"), "AssistantEvent: ROLE-DRIFT"].join(CRLF),
        "HANDOFF-ARCHIVE-02.md": [troToi("HANDOFF-ARCHIVE-02.md"), "AssistantEvent: ROLE-DRIFT"].join(CRLF)
      }));
      assert.equal(new Map(vong.dong.map((s) => [s.token, s.n])).get("ROLE-DRIFT"), 2,
        "con tro vong lai chinh no thi doc mot lan, khong treo va khong dem hai lan");
    }

    /* Con trỏ trỏ vào chỗ trống thì đếm phần đọc được, không được ném cả bảng. */
    assert.equal(
      new Map(readAssistantEvents(bocFile(goc, {
        "HANDOFF.md": [conTro, "AssistantEvent: ROLE-DRIFT"].join(CRLF),
        [luuTru]: null
      })).dong.map((s) => [s.token, s.n])).get("ROLE-DRIFT"), 1,
      "con tro tro vao file khong co thi dem phan doc duoc, khong duoc lam sap ca trang");
  }

  /* (e) TRÊN TRANG: chữ phải là "đã ghi nhận", TUYỆT ĐỐI không phải "0 lỗi".
     Đây là chỗ Đức nêu riêng: `N = 0` chỉ nghĩa la chưa ai ghi nhận, không nghĩa là không có
     sự cố. Viết "0 lỗi" là biến một khoảng trống dữ liệu thành lời tự khen. */
  const trangKhong = buildOverview(nhatKy(["nhật ký chưa ghi sự cố nào"])).html;
  const vung3 = (trang) => {
    const i = trang.indexOf('<div class="sect">Sức khoẻ Assistant');
    assert.notEqual(i, -1, "phai co vung suc khoe Assistant");
    const j = trang.indexOf('<div class="card">', i);
    assert.ok(j > i, "vung phai dong lai duoc, neu khong thi cat sai");
    return trang.slice(i, j);
  };
  const v3Khong = vung3(trangKhong);
  for (const [, ten] of SU_CO_ASSISTANT) {
    assert.ok(new RegExp(`${ten}</span><span class="badge b0">0 ĐÃ GHI NHẬN<`).test(v3Khong),
      `${ten}: chua ai ghi nhan thi in "0 ĐÃ GHI NHẬN" voi mau trung tinh — to xanh la khen mot khoang trong du lieu`);
  }
  assert.ok(/chưa ai ghi nhận/.test(v3Khong),
    "trang phai NOI RA nghia cua so 0 — khong noi thi Duc hop ly ma hieu la 'khong co su co'");
  for (const trang of [trangKhong, buildOverview(goc).html]) {
    assert.ok(!/0 lỗi/.test(trang),
      "TUYET DOI khong duoc viet '0 loi' — Duc neu rieng dieu nay khi chot dinh dang");
  }

  /* (f) SỐ TRÊN TRANG PHẢI ĐI THEO NHẬT KÝ, không gõ cứng. */
  const v3Nhieu = vung3(buildOverview(nhatKy(["AssistantEvent: ROLE-DRIFT", "AssistantEvent: ROLE-DRIFT",
    "AssistantEvent: ROLE-DRIFT"])).html);
  assert.ok(/Trượt vai<\/span><span class="badge b1">3 ĐÃ GHI NHẬN</.test(v3Nhieu),
    "ba dong nhat ky thi bang phai in 3 — in so khac la bang khong doc nhat ky");
  assert.notEqual(v3Khong, v3Nhieu, "doi nhat ky thi vung 3 PHAI doi theo");

  ok(`bo dem su co: nhat ky that ra ${that.dong.map((s) => s.n).join("/")}, token la thi nem, chu la 'da ghi nhan' chu khong phai '0 loi'`);
}

/* ---- T2c. Gate tiếp theo: câu ĐẦU của việc kế, không phải cả trường ---- */
{
  const G = String.fromCharCode(8212);

  assert.equal(gateNext(""), "", "khong khai viec ke thi tra rong, khong bia");
  assert.equal(gateNext("Một câu ngắn thôi"), "Một câu ngắn thôi",
    "cau da ngan va khong co dau ngat thi giu nguyen, KHONG them dau ba cham");
  assert.equal(gateNext("Một câu ngắn thôi."), "Một câu ngắn thôi",
    "go dau cham cuoi cau KHONG phai la cat — them '…' o day la bang noi con nua trong khi khong con gi");
  assert.equal(gateNext("Câu đầu tiên nói đủ nghĩa rồi. Câu sau không cần lên bảng."),
    "Câu đầu tiên nói đủ nghĩa rồi…", "cat o dau cham, va co cat thi phai co dau ba cham");
  /* Nhãn ở fixture này dài hơn ngưỡng `GATE_MIN` một cách CÓ Ý — ngắn hơn ngưỡng thì luật
     ngoại lệ ngay dưới sẽ nhận việc, và khẳng định này không còn đo cái nó định đo.
     Bắt được ở lượt chạy đầu: nhãn 27 ký tự, ngưỡng 28, và phép kiểm đỏ vì FIXTURE sai. */
  const NHAN = "Một nhãn khá là dài đứng trước";
  assert.ok(NHAN.length > GATE_MIN, "fixture phai dai hon nguong, neu khong thi no do luat khac");
  assert.equal(gateNext(`${NHAN} ${G} phần giải thích dài phía sau`), `${NHAN}…`,
    "cat o dau gach dai khi no toi truoc");

  /* NGOẠI LỆ đã khai trong bộ sinh: cắt ở gạch dài mà ra một mẩu quá ngắn để thành câu thì
     cắt lại ở dấu chấm. Đo trên hồ sơ thật: đơn vị hạng 1 khai "F-25 bước ③ — CẦN ĐỨC
     CHỐT: …", và luật gạch-dài-trước cắt ra đúng bốn chữ. Luật vàng 5: Đức đọc không hiểu
     là lỗi hệ thống. */
  const ngan = gateNext(`F-25 bước ③ ${G} CẦN ĐỨC CHỐT: cho vòng chạy job sống ở service worker. Câu sau.`);
  assert.ok(ngan.length >= GATE_MIN, `mau qua ngan thi phai cat lai o dau cham, dang ra: ${ngan}`);
  assert.ok(ngan.includes("CẦN ĐỨC CHỐT"), "va phai giu duoc phan noi ra viec, khong chi giu cai nhan");

  // Trần độ dài, và đường dẫn phải bị cắt — trang này cấm in đường dẫn.
  const dai = gateNext("x".repeat(40) + " " + "y".repeat(40) + " " + "z".repeat(40));
  assert.ok(dai.length <= 111, `gate phai co tran do dai, dang dai ${dai.length}`);
  assert.ok(dai.endsWith("…"), "cat vi qua dai thi cung phai co dau ba cham");
  assert.ok(!gateNext("chuyển vào workers/observer-v0/v0.1.0/ rồi khai lại").includes("/"),
    "duong dan phai bi cat khoi gate — trang danh cho Duc cam in duong dan");
  ok("gate tiep theo: cat cau dau, co tran do dai, cat duong dan, va khong them dau ba cham oan");
}

/* ---- T2d. `blocked_if_skipped` là trường TUỲ CHỌN, và đọc nó không được ném ---- */
{
  const fm = (than) => `---${String.fromCharCode(10)}${than}${String.fromCharCode(10)}---${String.fromCharCode(10)}# x`;
  const d = (text) => ({ readFile: () => text });

  assert.equal(blockedIfSkipped(d(fm('blocked_if_skipped: "chặn cả nhánh"')), { statusPath: "S.md" }),
    "chặn cả nhánh", "doc duoc, va go cap nhay kep");
  assert.equal(blockedIfSkipped(d(fm("blocked_if_skipped: chặn cả nhánh")), { statusPath: "S.md" }),
    "chặn cả nhánh", "khong nhay kep thi cung doc duoc");
  assert.equal(blockedIfSkipped(d(fm("lifecycle: active")), { statusPath: "S.md" }), "",
    "truong VANG thi tra rong — day la trang thai binh thuong, khong phai loi");
  assert.equal(blockedIfSkipped(d("# khong co frontmatter"), { statusPath: "S.md" }), "",
    "khong co frontmatter thi tra rong");
  assert.equal(blockedIfSkipped(d(fm("x: 1")), { statusPath: "" }), "",
    "don vi chua khai ho so thi khong co gi de doc, va KHONG duoc nem");
  assert.equal(blockedIfSkipped({ readFile: () => { throw new Error("KHONG_CO"); } }, { statusPath: "S.md" }), "",
    "doc that bai thi tra rong — mot truong TUY CHON khong duoc lam chet ca bo sinh");
  // Và trường của một đơn vị KHÁC không được lọt sang: chặn ở hết frontmatter.
  assert.equal(blockedIfSkipped(d(`${fm("lifecycle: active")}${String.fromCharCode(10)}blocked_if_skipped: nam ngoai frontmatter`), { statusPath: "S.md" }),
    "", "chi doc trong frontmatter — chu trong than file KHONG duoc tinh");
  ok("blocked_if_skipped: truong tuy chon, vang thi tra rong, doc that bai thi khong nem, chan o het frontmatter");
}

/* ---- T3. Khối mốc: đọc lại từ hồ sơ, và fail closed ---- */
{
  const mocDeps = (text) => bocFile(REAL, { "docs/protocols/ASSISTANT-V0.1.md": text });
  const G = String.fromCharCode(8212);
  const bang = [
    "---", "kind: protocol", "---", "# tiêu đề",
    "## 1. Mục khác", "| Không phải mốc | x |",
    "## 2. Mốc",
    "| Mốc | Trạng thái |", "|---|---|",
    `| **MỐC MỘT** ${G} giải thích dài | ✅ **xong** 2026-01-02 |`,
    "| **MỐC HAI** | ⏳ **đang chạy** |",
    "| **MỐC BA** | ⛔ **khoá**, chờ cái kia |",
    "## 3. Mục sau", "| Bảng của mục khác | y |"
  ].join(String.fromCharCode(10));

  assert.deepEqual(readMoc(mocDeps(bang)), [
    { ten: "MỐC MỘT", trangThai: "xong 2026-01-02", bac: 2 },
    { ten: "MỐC HAI", trangThai: "đang chạy", bac: 1 },
    { ten: "MỐC BA", trangThai: "khoá, chờ cái kia", bac: 3 }
  ], "doc dung ba moc: bo dam, bo ky tu trang tri, cat phan giai thich sau gach dai");

  // Không được liếm sang bảng của mục khác — đúng cái bẫy đã cắn `readRefreshLine` 04/09.
  assert.equal(readMoc(mocDeps(bang)).length, 3, "chan o muc ke, khong nhat bang cua muc 1 hay muc 3");

  assert.throws(() => readMoc(bocFile(REAL, { "docs/protocols/ASSISTANT-V0.1.md": null })),
    /THIEU_MOC_ASSISTANT/, "mat ho so moc thi NEM, khong ve khoi rong");
  assert.throws(() => readMoc(mocDeps("# chỉ có tiêu đề")), /THIEU_MOC_ASSISTANT/,
    "mat muc 2 thi NEM");
  assert.throws(() => readMoc(mocDeps("## 2. Mốc\n| Mốc | Trạng thái |\n|---|---|\n")),
    /THIEU_MOC_ASSISTANT/, "muc 2 con bang nhung KHONG con dong moc nao thi NEM");

  assert.equal(bacMoc("chưa biết"), 0, "chu la thi ve mau trung tinh, khong doan");
  ok("khoi 2: ba moc doc lai tu ho so, chan o muc ke, va fail closed 3 dang");
}

/* ---- T4. Khối defect: đọc trường máy đọc được, không dò văn xuôi ---- */
{
  const G = String.fromCharCode(8212);
  const briefs = {
    "BRIEF-AAA-01.md": `---\nkind: brief\nstatus: active\n---\n\n# BRIEF \`AAA-01\` ${G} triệu chứng một`,
    "BRIEF-BBB-02.md": `---\nkind: brief\nstatus: parked\n---\n\n# BRIEF \`BBB-02\` ${G} triệu chứng hai`,
    // Brief phiên: không có mã trong nháy ngược → tự rơi ra ngoài, không phải kê tay danh sách.
    "BRIEF-S9.md": `---\nkind: brief\nstatus: active\n---\n\n# BRIEF ${G} Phiên S9`,
    // Chữ "đã đóng" nằm trong văn xuôi mà `status:` vẫn `active` — đây chính là ca brief cấm
    // dò văn xuôi. Phải ra MỞ.
    "BRIEF-CCC-03.md": `---\nkind: brief\nstatus: active\n---\n\n# BRIEF \`CCC-03\` ${G} triệu chứng ba\n\nViệc này đã đóng rồi.`
  };
  const deps = {
    ...REAL,
    listFiles: (p) => (p === "docs/briefs" ? Object.keys(briefs) : []),
    readFile: (p) => {
      const ten = p.startsWith("docs/briefs/") ? p.slice("docs/briefs/".length) : null;
      return ten && ten in briefs ? briefs[ten] : REAL.readFile(p);
    }
  };
  assert.deepEqual(readDefects(deps), [
    { ma: "AAA-01", trieuChung: "triệu chứng một", mo: true },
    { ma: "BBB-02", trieuChung: "triệu chứng hai", mo: false },
    { ma: "CCC-03", trieuChung: "triệu chứng ba", mo: true }
  ], "lay ma + trieu chung tu tieu de, mo/dong tu frontmatter, brief phien tu roi ra ngoai");

  assert.deepEqual(readDefects({ ...deps, listFiles: () => { throw new Error("x"); } }), [],
    "khong co thu muc brief thi tra rong, khong nem — day la khoi mo rong duoc");
  ok("khoi 3: mo/dong lay tu truong may doc duoc, van xuoi noi nguoc lai KHONG lam doi ket qua");
}

/* ---- T5. Phép so độ tươi lọc đúng dòng khoá, và KHÔNG lọc gì khác ---- */
{
  const A = ["<html>", `${KHOA_PREFIX}  <div>_root MỞ</div>`, "<p>nội dung</p>"].join(String.fromCharCode(10));
  const B = ["<html>", `${KHOA_PREFIX}  <div>_root BẬN</div>`, "<p>nội dung</p>"].join(String.fromCharCode(10));
  const C = ["<html>", `${KHOA_PREFIX}  <div>_root MỞ</div>`, "<p>nội dung KHÁC</p>"].join(String.fromCharCode(10));

  assert.ok(compareOverview(A, B).matches, "chi dong khoa doi thi KHONG duoc coi la lech HEAD");
  assert.ok(!compareOverview(A, C).matches, "dong khac doi thi PHAI coi la lech — neu khong, cong mat rang");
  assert.ok(!compareOverview(A, A + String.fromCharCode(10) + "<p>thêm</p>").matches,
    "them dong thi phai lech");

  // Và bằng chứng phép lọc ăn khớp với cái bộ sinh THẬT in ra: mọi dòng khoá của trang thật
  // đều mang dấu. Không có khẳng định này thì phép lọc có thể đúng mà dấu in sai chỗ.
  const html = buildOverview(REAL).html;
  const dong = html.split(String.fromCharCode(10));
  const coDau = dong.filter((l) => l.startsWith(KHOA_PREFIX));
  // Nhận dòng khoá theo ĐÚNG hình dạng của nó: ô tên chỉ có chữ, không thẻ con. Dòng defect
  // cũng in chữ "MỞ" nhưng ô tên của nó bọc thêm một thẻ, nên rơi ra ngoài — và phải rơi ra:
  // trạng thái defect là NỘI DUNG, lọc nó khỏi phép so là làm cổng mất răng.
  // (Lượt chạy đầu bắt được đúng chỗ này: regex rộng quét luôn cả 4 dòng defect.)
  const dongKhoaThat = dong.filter((l) => /<span class="n">[^<]+<\/span><span class="badge b\d">(?:BẬN|MỞ)</.test(l));
  assert.ok(coDau.length > 0, "trang that phai co dong khoa mang dau");
  /* TỪ `LIVE-BLOCK-01` CÓ HAI KHỐI ĐƯỢC MIỄN, không còn một. Khối "đang làm gì" cũng đọc
     thẳng từ bảng chủ sở hữu, nên nó đổi đúng những lúc bảng khoá đổi và phải được miễn cùng
     một đường. Khẳng định giữ nguyên sức: tập dòng mang dấu phải bằng ĐÚNG hai khối đó —
     thiếu một dòng là cổng đỏ oan, thừa một dòng là cổng mất răng ở chỗ đó. */
  const iKhoi = dong.findIndex((l) => l.includes('class="sect">Đang làm gì'));
  const jKhoi = dong.findIndex((l, k) => k > iKhoi && l.includes('class="sect">Cần Đức'));
  assert.ok(iKhoi !== -1 && jKhoi > iKhoi, "phai tim duoc khoi 'Dang lam gi' de tach hai khoi duoc mien");
  const dongKhoiLuong = dong.slice(iKhoi, jKhoi);
  assert.deepEqual(coDau, [...dongKhoiLuong, ...dongKhoaThat],
    "tap dong mang dau phai bang DUNG hai khoi doc tu bang chu so huu — thieu la cong do oan, thua la cong mat rang");
  /* HUY HIEU KHAC KHOA tuyệt đối KHÔNG được mang dấu — chúng là NỘI DUNG, lọc chúng khỏi phép
     so là làm cổng mất răng. Trước DASH-ORCH-V2 ca này dựng bằng dòng defect mang huy hiệu
     "MỞ"; từ khi mỗi đề bài không còn một dòng riêng thì dòng đó biến mất, nên khẳng định
     phải neo vào cái CÒN LẠI: huy hiệu trạng thái luồng ở vùng công việc. */
  const dongHuyHieuKhac = dong.filter((l, k) => /class="badge b\d">/.test(l)
    && !/<span class="badge b\d">(?:BẬN|MỞ)</.test(l)
    /* Huy hiệu tên vùng trong khối "đang làm gì" là NGOẠI LỆ có chủ đích: nó đọc từ bảng chủ
       sở hữu nên nó phải được miễn, y như dòng khoá. Loại theo VỊ TRÍ chứ không theo hình
       dạng — loại theo hình dạng là mở một lỗ mà bất kỳ huy hiệu nào sau này cũng chui lọt. */
    && !(k >= iKhoi && k < jKhoi));
  assert.ok(dongHuyHieuKhac.length > 0,
    "trang that phai co huy hieu KHAC khoa, neu khong thi khang dinh duoi vo nghia");
  for (const l of dongHuyHieuKhac) {
    assert.ok(!l.startsWith(KHOA_PREFIX),
      `huy hieu khac khoa KHONG duoc mang dau — do la noi dung, phai lam cong do: ${l.slice(0, 60)}`);
  }
  ok("do tuoi: dong khoa duoc loc, moi thu khac van chan, va dau in dung cho tren trang that");
}

/* ---- T6. DASH-ROADMAP-01 · roadmap ý tưởng ở tab Tổng quan ----
 *
 * Đức chốt hình: MỘT hàng cho mỗi ý tưởng, mỗi hàng một thanh bước, và đánh dấu rõ đang ở
 * bước nào. Danh sách phẳng cũ nói được "có 8 ý tưởng" nhưng không nói được "đi tới đâu".
 *
 * Bốn thứ ghim ở đây, và cả bốn dựng được ca hỏng thật:
 *   · bậc vẽ SAI CHỖ — dấu đang-ở-đây lệch khỏi bậc đã khai trong sổ;
 *   · một ý tưởng RƠI khỏi roadmap — rơi là Đức mở bảng rồi tưởng nó không tồn tại;
 *   · bậc `nghỉ` bị vẽ như BƯỚC CUỐI, tức thanh của một ý tưởng đã bị bác trông y như một
 *     ý tưởng gần xong. Ca này PHẢI dựng bằng fixture: sổ thật hôm nay chưa có ý tưởng nào ở
 *     bậc `nghỉ`, nên đo trên sổ thật thì nhánh đó chưa từng chạy và khẳng định vô nghĩa;
 *   · khối mới KHÔNG được làm hỏng cơ chế ẩn/hiện khung — đó là bug DASH-TAB-01, và cách
 *     nhanh nhất tái sinh nó là thêm một khung vào trang.
 *
 * CẮT ĐÚNG PHẠM VI, không dùng biểu thức kiểu "mở [\s\S]*? đóng": phần lười đó chạy thẳng ra
 * ngoài khối và cho xanh giả. Ở repo này nó đã cắn bốn lần. Nên cắt bằng chỉ số, chặn hai đầu.
 */
{
  const G = String.fromCharCode(10);
  const soY = (danh) => bocFile(REAL, { "IDEAS.md": danh.join(G) });

  /* Khối roadmap: chặn TRÊN bằng đầu tab Tổng quan, chặn DƯỚI bằng đầu tab kế tiếp. Trong
     phạm vi đó mới cắt từ mở khối tới câu chú giải nằm ngay sau các hàng. */
  const khoiRoadmap = (trang) => {
    const dau = trang.indexOf('data-pane="tong-quan"');
    const het = trang.indexOf('data-pane="ai-dieu-phoi"');
    assert.ok(dau !== -1 && het > dau, "phai tim duoc dung pham vi tab Tong quan");
    const tab = trang.slice(dau, het);
    const a = tab.indexOf('<div class="rm">');
    assert.notEqual(a, -1, "khoi roadmap PHAI nam trong tab Tong quan — Duc doc trang dau");
    const b = tab.indexOf('<p class="note">', a);
    assert.ok(b > a, "khoi roadmap phai ket bang mot cau chu giai");
    return tab.slice(a, b);
  };

  const docHang = (trang) => khoiRoadmap(trang)
    .split('<div class="rmr"').slice(1)
    .filter((c) => !c.startsWith(" rmh"))          // bỏ hàng tiêu đề tên ba bước
    .map((c) => ({
      ma: (/href="#y-([a-z0-9-]+)"/.exec(c) || [, ""])[1],
      chet: /<div class="rms dead">/.test(c),
      nut: [...c.matchAll(/<div class="node([^"]*)">/g)].map((m) => m[1].trim()),
      chip: Number((/<span class="chip s(\d)">/.exec(c) || [, -1])[1])
    }));

  /* --- (a) trên SỔ THẬT: không ý tưởng nào rơi, và bậc vẽ đúng chỗ --- */
  const trangThat = buildOverview(REAL).html;
  const ideas = readIdeas(REAL);
  const hang = docHang(trangThat);

  /* GHIM QUAN HỆ, không ghim ngưỡng: ">= 8" sẽ KHÔNG đỏ khi một ý tưởng rơi khỏi bảng, mà
     rơi đúng là cái đáng sợ. */
  assert.deepEqual(hang.map((h) => h.ma), ideas.map((i) => i.code.toLowerCase()),
    "roadmap phai co dung MOT hang cho moi y tuong trong so, va dung thu tu bac");

  for (const i of ideas) {
    const h = hang.find((x) => x.ma === i.code.toLowerCase());
    assert.equal(h.nut.length, 3,
      `${i.code}: thanh phai co dung BA buoc — 'nghi' KHONG phai buoc thu tu`);
    assert.equal(h.chip, i.stage,
      `${i.code}: nhan bac bang chu phai khop bac da khai trong IDEAS.md`);
    if (i.stage < 3) {
      assert.deepEqual(h.nut, [0, 1, 2].map((k) => (k === i.stage ? "on" : (k < i.stage ? "past" : ""))),
        `${i.code}: dau 'dang o day' phai nam DUNG o buoc ${i.stage}, buoc truoc to day, buoc sau de trong`);
      assert.ok(!h.chet, `${i.code}: y tuong con song KHONG duoc ve la thanh chet`);
    }
  }

  /* --- (b) ý tưởng KHÔNG còn nằm trong danh sách phẳng nữa --- */
  const tabDau = trangThat.slice(trangThat.indexOf('data-pane="tong-quan"'),
    trangThat.indexOf('data-pane="ai-dieu-phoi"'));
  const bigA = tabDau.indexOf('<div class="big">');
  assert.notEqual(bigA, -1, "khoi danh sach extension phai con");
  const khoiBig = tabDau.slice(bigA, tabDau.indexOf('<p class="note">', bigA));
  assert.ok(!khoiBig.includes('data-goto="y-tuong"'),
    "y tuong phai RA KHOI danh sach phang — con o ca hai cho la bang dem hai lan mot viec");

  /* --- (c) bậc `nghỉ`: fixture, vì sổ thật chưa có ca này --- */
  const trangNghi = buildOverview(soY([
    "# Sổ ý tưởng",
    "## Y-90 · Đang xây thật", "- **bậc:** đang xây", "- **việc kế:** làm tiếp",
    "## Y-91 · Đã bị bác", "- **bậc:** nghỉ", "- **việc kế:** không làm nữa",
    "## Y-92 · Đã chạy xong", "- **bậc:** đã chứng minh", "- **việc kế:** không còn gì"
  ])).html;
  const h2 = docHang(trangNghi);
  assert.deepEqual(h2.map((x) => x.ma), ["y-90", "y-92", "y-91"],
    "fixture phai vao duoc trang, xep theo bac — neu khong, moi khang dinh duoi vo nghia");

  const nghi = h2.find((x) => x.ma === "y-91");
  const xong = h2.find((x) => x.ma === "y-92");
  assert.equal(nghi.nut.length, 3, "'nghi' KHONG duoc them mot buoc thu tu vao thanh");
  assert.deepEqual(nghi.nut, ["", "", ""],
    "thanh cua 'nghi' KHONG duoc to buoc nao — to la lam no trong nhu gan xong");
  assert.ok(nghi.chet, "'nghi' phai duoc ve la thanh CHET, khong phai buoc cuoi");
  assert.equal(nghi.chip, 3, "va nhan bang chu phai noi ro la bac nghi");

  /* Khẳng định PHÂN BIỆT — cái thật sự quan trọng: 'nghỉ' và 'đã chứng minh' phải trông KHÁC
     nhau. Không có hai dòng dưới thì một bản vẽ cả hai giống nhau vẫn xanh. */
  assert.deepEqual(xong.nut, ["past", "past", "on"],
    "'da chung minh' MOI la buoc cuoi cua duong di that");
  assert.notDeepEqual(nghi.nut, xong.nut, "'nghi' va 'da chung minh' PHAI ve khac nhau");
  assert.ok(!xong.chet, "'da chung minh' khong phai thanh chet");

  /* --- (d) DASH-TAB-01 không được tái sinh --- */
  assert.ok(!khoiRoadmap(trangThat).includes('role="tabpanel"'),
    "khoi roadmap KHONG duoc dung them khung — them khung la lam lech quan he tab/khung (DASH-TAB-01)");
  assert.ok(trangThat.includes('[role="tabpanel"][hidden]{display:none}'),
    "luat an khung PHAI con nguyen — thieu no la ca chin khung hien cung luc (DASH-TAB-01)");

  ok(`roadmap: ${hang.length} y tuong moi cai mot thanh 3 buoc, bac dung cho, 'nghi' ve la thanh chet`);
}


/* ================= MULTIFLOW-ON-BOARD-01 · mục "Nhiều việc chạy cùng lúc" =================
 *
 * Đề bài của Đức: đưa cách vận hành nhiều phiên song song lên tab Vận hành, và
 * **TUYỆT ĐỐI không nhúng ai đang giữ vùng nào**.
 *
 * Câu cuối đó không phải yêu cầu trình bày — nó là một luật an toàn, và đây là phép ghim nó.
 * `DASHBOARD-Chrome-Extension-AI-Agentic.html` nằm trong khối `generators`, nên cổng so nó với HEAD MỖI PHIÊN và
 * `safe-push` từ chối đẩy khi lệch. Chủ vùng đổi liên tục (ngày 04/09 riêng `_code` đổi chủ
 * BỐN lần). Nên nếu tên chủ lọt vào trang thì bảng lệch HEAD ngay lượt nhận khoá kế tiếp, và
 * MỌI phiên bị chặn đẩy việc dù không một dữ liệu nào đổi. Đúng cái bẫy đã suýt xảy ra với
 * dòng "hôm nay / N ngày trước", vá bằng `today: "head"`.
 *
 * Bốn lượt sinh ở khối này (~9 giây một lượt, đo 03/09) — mỗi lượt dựng một ca hỏng khác
 * nhau, không lượt nào lặp lượt nào.
 */
{
  const goc = REAL;
  const sinh = (thay) => buildOverview(thay ? bocFile(goc, thay) : goc).html;
  const khoaThat = Object.keys(JSON.parse(goc.readFile(".agents/claims.json")).claims);

  /* --- (a) Ba bộ đọc: quan hệ, KHÔNG ghim con số hiện tại ---
     Ghim "4 cơ chế" / "5 bất biến" là ghim hiện trạng: thêm một cơ chế vào luật thì đỏ oan,
     mà bộ đọc hỏng hoàn toàn thì vẫn xanh. Cái phải đúng là "đọc được, và đọc từ file". */
  assert.equal(demLuongSongSong(goc), khoaThat.length,
    "so viec song song duoc PHAI bang so khoa trong bang quyen");
  assert.ok(demLuongSongSong(goc) >= 2,
    "0 hoac 1 la bo doc hong, khong phai repo that — repo nay co nhieu vung");
  assert.ok(readCoChe(goc).length >= 2, "phai doc duoc cac co che o muc 2 MULTIFLOW.md");
  assert.ok(readBatBien(goc).length >= 2, "phai doc duoc cac bat bien o muc 4 MULTIFLOW.md");
  assert.ok(readCoChe(goc).every((c) => c.ten && c.traLoi),
    "moi co che phai co ca ten va cau tra loi — thieu mot nua la o trong tren bang");
  assert.ok(readBatBien(goc).every((b) => /^[①-⑤]$/.test(b.so) && b.cau),
    "moi bat bien phai co so vong tron va mot cau");

  /* --- (b) Mục có thật trong tab Vận hành, và con số là con số đọc được --- */
  const trangThat = sinh(null);
  const iVH = trangThat.indexOf('data-pane="van-hanh"');
  assert.notEqual(iVH, -1, "phai co khung tab Van hanh");
  const jVH = trangThat.indexOf('data-pane="suc-khoe"', iVH);
  assert.ok(jVH > iVH, "khung tab Van hanh phai dong lai duoc, neu khong thi cat sai");
  const tabVH = trangThat.slice(iVH, jVH);

  assert.ok(tabVH.includes("Nhiều việc chạy cùng lúc"),
    "muc PHAI nam trong tab Van hanh — Duc chot cho no o day");
  assert.ok(tabVH.includes(`<strong>${khoaThat.length} vùng</strong>`),
    `so vung tren trang phai la ${khoaThat.length}, doc tu bang quyen chu khong go tay`);
  assert.ok(tabVH.includes(`${readCoChe(goc).length} cơ chế`)
    && tabVH.includes(`${readBatBien(goc).length} điều không được phá`),
    "hai khoi gap phai in dung so muc doc duoc tu luat");
  assert.ok(tabVH.includes("cố ý không hiện ai đang giữ vùng nào"),
    "phai noi RO vi sao bang khong hien chu vung — thieu cau nay thi phien sau lai nhung vao");

  /* --- (c) PHÉP GHIM NẶNG NHẤT: đổi HẾT chủ vùng, giữ nguyên khoá → bảng không đổi MỘT BYTE ---
     Đây là ca hỏng thật: một phiên sau này thấy `owner` sẵn trong file và in nó lên bảng cho
     "đủ thông tin". Không có phép này thì chuyện đó xanh, và cả repo bị chặn push hôm sau. */
  const CHU_GIA = "phien-gia-khong-duoc-lo-len-bang";
  const doiChu = {};
  for (const k of khoaThat) doiChu[k] = { owner: CHU_GIA, task: "viec gia", since: "2000-01-01" };
  const trangDoiChu = sinh({ ".agents/claims.json": claimsJson(doiChu) });

  //  · Mục của tôi: không đổi một byte. Đây là phần thuộc phạm vi việc này.
  const tabDoiChu = trangDoiChu.slice(trangDoiChu.indexOf('data-pane="van-hanh"'),
    trangDoiChu.indexOf('data-pane="suc-khoe"'));
  assert.equal(tabDoiChu, tabVH,
    "doi HET chu vung ma tab Van hanh PHAI khong doi mot byte — lot `owner` vao la moi phien bi chan day viec");

  //  · Và bất biến thật sự bảo vệ cả repo: cổng KHÔNG được đỏ vì ai đó nhận một khoá.
  //    Bảng cố ý có in dấu bận/mở ở tab AI điều phối, nhưng những dòng đó mang tiền tố
  //    `KHOA_PREFIX` nên `compareOverview` miễn. Khẳng định này là chỗ duy nhất kiểm rằng
  //    mục mới KHÔNG đẻ thêm một dòng lệch nào ngoài tập được miễn đó.
  assert.ok(compareOverview(trangThat, trangDoiChu).matches,
    "doi chu vung KHONG duoc lam cong do — do la moi phien bi chan day viec du chang co gi doi");

  //  · Nửa chứng minh cho khẳng định trên: mọi dòng KHÁC nhau phải nằm trong tập được miễn.
  //    Thiếu nửa này thì `matches` xanh cũng có thể vì bộ so hỏng, chứ không vì trang đúng.
  /* SO THEO TẬP DÒNG, KHÔNG SO THEO CHỈ SỐ. Bản trước ghim thêm `A.length === B.length` và
     so từng vị trí. Từ `LIVE-BLOCK-01` thì SỐ DÒNG đổi thật khi số vùng đang bận đổi — khối
     "đang làm gì" vẽ một dòng cho mỗi vùng có chủ — nên phép so theo chỉ số vô nghĩa ở đây.
     Cái phải đúng không đổi: mọi dòng CHỈ CÓ ở một bên đều phải mang dấu. */
  const dong = (s) => s.replace(/\r\n?/g, "\n").split("\n");
  const A = dong(trangThat);
  const B = dong(trangDoiChu);
  const tapB = new Set(B);
  const tapA = new Set(A);
  const lech = [...A.filter((x) => !tapB.has(x)), ...B.filter((x) => !tapA.has(x))];
  assert.ok(lech.length > 0,
    "phai co it nhat mot dong lech — khong lech gi nghia la fixture khong toi duoc bo sinh");
  assert.ok(lech.every((x) => x.startsWith(KHOA_PREFIX)),
    "moi dong lech PHAI nam trong tap duoc mien; dong ngoai tap la mot lan chan push cho ca repo:\n  "
    + lech.filter((x) => !x.startsWith(KHOA_PREFIX)).slice(0, 3).join("\n  "));

  /* PHÉP GHIM BỊ LẬT NGƯỢC — `ADR-0004` đảo lại quyết định 04/09 của Đức: tên lane quay lại
     bảng. Trước 05/09 chỗ này ghim `!trangDoiChu.includes(CHU_GIA)`, và giữ nguyên nó là ghim
     chính cái defect cần vá. Nửa PHẢI giữ: tên lane chỉ được nằm trên dòng mang dấu — lọt ra
     dòng không dấu là mỗi lượt nhận/trả khoá lại chặn push của mọi lane. */
  assert.ok(trangDoiChu.includes(CHU_GIA), "ten lane dang giu vung PHAI hien tren bang (ADR-0004)");
  for (const l of B.filter((x) => x.includes(CHU_GIA))) {
    assert.ok(l.startsWith(KHOA_PREFIX),
      `ten lane CHI duoc nam tren dong mang dau: ${l.slice(0, 70)}`);
  }

  /* --- (d) NỬA CÒN LẠI của phép (c): chứng minh fixture THẬT SỰ tới được bộ sinh ---
     Thiếu nửa này thì (c) xanh một cách vô nghĩa: một lớp bọc hỏng, một đường đọc khác, hay
     một bộ nhớ đệm đều làm hai trang giống nhau mà chẳng chứng minh điều gì. Bỏ MỘT khoá:
     trang PHẢI đổi, và đổi đúng con số. Đã bị cắn đúng kiểu này ngày 04/09 (DB15). */
  const botMot = {};
  for (const k of khoaThat.slice(1)) botMot[k] = { owner: null };
  const depsBot = bocFile(goc, { ".agents/claims.json": claimsJson(botMot) });
  assert.equal(demLuongSongSong(depsBot), khoaThat.length - 1,
    "bo mot khoa thi so viec song song duoc phai giam mot");
  const trangBot = sinh({ ".agents/claims.json": claimsJson(botMot) });
  assert.notEqual(trangBot, trangThat,
    "bo mot khoa MA trang khong doi nghia la fixture khong toi duoc bo sinh — phep (c) vo nghia");
  assert.ok(trangBot.includes(`<strong>${khoaThat.length - 1} vùng</strong>`),
    "va con so tren trang phai giam theo — day la bang chung no doc song, khong phai go tay");

  /* --- (e) Mất file luật: trả rỗng, và trang KHÔNG bịa ra mục ---
     Fail closed kiểu nhẹ: không có luật thì không có gì để khoe, chứ không phải in một khối
     rỗng hoặc giữ lại con số của lần trước. */
  //  · Bộ đọc: mất file, hoặc đọc thất bại → trả rỗng, KHÔNG ném. Kiểm trực tiếp bằng deps
  //    tối thiểu, vì fixture "mất hẳn file" không đi qua `buildOverview` được: `collectDocs`
  //    của bộ sinh bảng cũng đọc file đó và nó ném trước.
  for (const nhan of ["khong ton tai", "doc that bai"]) {
    const d = nhan === "khong ton tai"
      ? { fileExists: () => false, readFile: () => { throw new Error("khong duoc goi"); } }
      : { fileExists: () => true, readFile: () => { throw new Error("IO"); } };
    assert.deepEqual(readCoChe(d), [], `co che · ${nhan}: phai tra rong, khong nem`);
    assert.deepEqual(readBatBien(d), [], `bat bien · ${nhan}: phai tra rong, khong nem`);
  }

  //  · Trang: file CÒN nhưng luật bị viết lại, không còn mục 2 / mục 4. Đây là ca thật —
  //    luật được đánh số lại thì có, chứ không ai xoá hẳn file. Trang phải BỎ hai khối gấp,
  //    không được in khối rỗng và không được giữ con số của lần trước.
  const luatKhac = ["# MULTIFLOW", "", "## 1. Chuyện gì", "", "Luat da duoc viet lai.", ""].join("\n");
  const depsKhac = bocFile(goc, { "docs/protocols/MULTIFLOW.md": luatKhac });
  assert.deepEqual(readCoChe(depsKhac), [], "khong con muc 2 thi tra rong");
  assert.deepEqual(readBatBien(depsKhac), [], "khong con muc 4 thi tra rong");
  const trangKhac = sinh({ "docs/protocols/MULTIFLOW.md": luatKhac });
  assert.ok(!trangKhac.includes("cơ chế giữ cho không giẫm chân")
    && !trangKhac.includes("điều không được phá"),
    "khong doc duoc muc nao thi KHONG duoc bia ra hai khoi gap");
  assert.ok(trangKhac.includes(`<strong>${khoaThat.length} vùng</strong>`),
    "nhung cau chinh van phai con — so vung khong den tu file luat");

  ok(`nhieu viec cung luc: ${khoaThat.length} vung / ${readCoChe(goc).length} co che / ${readBatBien(goc).length} bat bien, doi HET chu vung khong doi mot byte`);
}

/* ---- T9. LIVE-BLOCK-01 · khối "đang làm gì" và tab mở sẵn ----
 *
 * Bốn thứ được ghim ở đây, và cả bốn dựng được ca hỏng thật:
 *   · khối ĐỌC từ bảng chủ sở hữu, không đóng cứng danh sách lane;
 *   · không luồng nào chạy → VẪN in một dòng, không ẩn khối (khối trống và khối hỏng phải
 *     phân biệt được bằng mắt);
 *   · MỌI dòng của khối mang dấu lọc ở ĐẦU DÒNG — phép ghim quan trọng nhất, vì sai chỗ này
 *     không ai thấy cho tới lúc một phiên bất kỳ bị cổng xuất bản từ chối;
 *   · tab mặc định là AI điều phối, và NÚT TAB KHỚP VỚI KHUNG NỘI DUNG.
 *
 * HAI lượt sinh trang, không hơn: một lượt `buildOverview` tốn khoảng mười hai giây và cộng
 * thẳng vào cổng đóng phiên của MỌI phiên sau. Phần đọc dữ liệu kiểm bằng `readLuong` (không
 * dựng trang), phần tab dùng lại trang của ca thứ nhất — tab mặc định không phụ thuộc bảng
 * chủ sở hữu, nên sinh riêng một trang nữa cho nó là mười hai giây mua về không gì cả. */
{
  const goc = REAL;
  const sinh = (thay) => buildOverview(bocFile(goc, thay)).html;
  const NL = String.fromCharCode(10);

  /* SỔ BỊA + DANH SÁCH NHÓM BỊA — đề bài `BANG-DANG-LAM-01`, Đức nêu 06/09.
     Bịa cả hai để ca này đỏ ổn định, không phụ thuộc hôm nay sổ thật có mã nào. Danh sách nhóm
     ĐẮP LÊN cấu hình thật chứ không thay hẳn: `buildOverview` còn đọc `units`/`profile` ở cùng
     file đó, và thay hẳn là hỏng cả trang vì một lý do không liên quan gì tới việc đang kiểm. */
  const SO_BIA = [
    "## N-90 · Cau viec bia lay TU SO, khong lay tu chuoi task",
    "",
    "- **nhóm:** bang",
    "- **đóng khi:** đức: chốt",
    "",
    "## N-91 · Muc bia khong khai nhom nao ca",
    "",
    "- **đóng khi:** đức: chốt",
    ""
  ].join(NL);
  const NHOM_BIA = "Nhom bia de nhan ra ngay tren trang";
  const cauHinhBia = JSON.stringify({
    ...JSON.parse(goc.readFile(".repo-structure.json")),
    nhom_van_de: { bang: NHOM_BIA }
  });
  const soBia = (claims) => bocFile(goc, {
    "BACKLOG.md": SO_BIA,
    ".repo-structure.json": cauHinhBia,
    ".agents/claims.json": claimsJson(claims)
  });

  /* --- (a) CÂU VIỆC LẤY TỪ SỔ, NHÓM LẤY TỪ FILE CẤU HÌNH ---
     Chuỗi `--task` là tham số dòng lệnh trên PowerShell — chỗ chữ có dấu hay hỏng nhất — nên
     nó sẽ MÃI không dấu và đầy từ kỹ thuật. Bảng phải tra mã sang sổ, không in chuỗi thô. */
  const doc = readLuong(soBia({
    "_root": { owner: null, task: "N-90", claimed_at: "2020-01-01T00:00" },
    "_docs": { owner: "lane-mot", task: "N-90", claimed_at: "2026-09-05T10:05" },
    "_code": { owner: "  lane-hai  ", task: "N-91", claimed_at: "2026-09-05T11:30" },
    "workers/goi-mot": { owner: "lane-ba", task: "chuoi khong dau khong khai ma nao", claimed_at: "2026-09-05T12:00" }
  }));
  assert.deepEqual(doc.map((r) => ({ lane: r.lane, ma: r.ma, viec: r.viec, nhom: r.nhom })), [
    { lane: "lane-mot", ma: "N-90", viec: "Cau viec bia lay TU SO, khong lay tu chuoi task", nhom: NHOM_BIA },
    { lane: "lane-ba", ma: "", viec: "", nhom: NHOM_CHUA_XEP },
    { lane: "lane-hai", ma: "N-91", viec: "Muc bia khong khai nhom nao ca", nhom: NHOM_CHUA_XEP }
  ], "cau viec lay tu so theo ma; muc khong khai nhom va lane khong khai ma deu roi ve 'chua xep nhom', nhom do xuong CUOI, trong nhom thi xep theo ten lane");

  /* Mã lạ KHÔNG được lặng lẽ thành nhóm mới — mở lại đúng cửa sau mà danh sách cố định đóng. */
  assert.equal(readLuong(bocFile(goc, {
    "BACKLOG.md": SO_BIA.replace("- **nhóm:** bang", "- **nhóm:** mot-nhom-tu-che"),
    ".repo-structure.json": cauHinhBia,
    ".agents/claims.json": claimsJson({ "_docs": { owner: "lane-mot", task: "N-90" } })
  }))[0].nhom, NHOM_CHUA_XEP, "ma nhom ngoai danh sach co dinh thi KHONG duoc thanh nhom moi");

  /* --- (a2) GỘP THEO LANE + CÂU VIỆC ---
     Ngày 06/09 một lane giữ ba khoá worker cho cùng một việc và khối vẽ ba dòng y hệt nhau.
     Gộp lại phải lấy mốc SỚM NHẤT: việc bắt đầu lúc ô đầu tiên bị giữ. */
  const gop = readLuong(soBia({
    "_docs": { owner: "lane-mot", task: "N-90", claimed_at: "2026-09-05T11:00" },
    "_code": { owner: "lane-mot", task: "N-90", claimed_at: "2026-09-05T09:00" },
    "workers/goi-mot": { owner: "lane-mot", task: "N-91", claimed_at: "2026-09-05T13:00" }
  }));
  assert.equal(gop.length, 2, "mot lane giu hai khoa cho CUNG mot viec ra MOT dong; viec khac thi van ra dong rieng");
  assert.equal(gop.find((r) => r.ma === "N-90").tu, "2026-09-05T09:00",
    "gop thi lay moc SOM NHAT — lay moc muon nhat la lam viec trong tre hon that");

  /* Vùng đang giữ mà KHÔNG khai gì: vẫn phải ra một dòng. Bỏ dòng đó đi là Đức nhìn thấy ít
     luồng hơn thực tế — sai nguy hiểm hơn một ô để trống. */
  assert.deepEqual(readLuong(soBia({ "_code": { owner: "lane-cau-that" } }))
    .map((r) => ({ lane: r.lane, ma: r.ma, viec: r.viec, tu: r.tu, tuoi: r.tuoi })),
  [{ lane: "lane-cau-that", ma: "", viec: "", tu: "", tuoi: "" }],
  "thieu task/claimed_at thi van ra mot dong, khong bi loai, va tuoi de rong chu khong bia");

  /* Bảng hỏng thì NÉM, y hệt `readKhoa`: một khối rỗng đọc ra là "không có gì chạy", mà đó
     đúng là câu nói dối tệ nhất khối này có thể nói. */
  assert.throws(() => readLuong(bocFile(goc, { ".agents/claims.json": null })), /CLAIMS_THIEU_FILE/,
    "mat bang chu so huu thi NEM, khong ve khoi rong");
  assert.throws(() => readLuong(bocFile(goc, { ".agents/claims.json": "{" })), /CLAIMS_HONG/,
    "bang khong doc duoc thi NEM");

  /* KHÔNG ĐƯỢC RƠI VỀ ĐỒNG HỒ HỆ THỐNG. Mốc sinh mất thì NÉM — lùi về `Date.now()` là đúng
     cái bệnh đề bài này chữa: một ảnh chụp cũ đội lốt số liệu thời gian thực. */
  const cutMoc = { ...goc, git: { ...goc.git } };
  delete cutMoc.git.headStamp;
  assert.throws(() => readLuong(cutMoc), /THIEU_MOC_SINH/,
    "khong co moc sinh thi NEM, tuyet doi khong lui ve dong ho he thong");

  /* --- (a3) TUỔI ĐO TỪ MỐC SINH, không từ đồng hồ người xem ---
     Ghim CẢ DÂY NỐI, không chỉ ghim hàm tính. Ghim mình hàm thì ai đó thay `headStamp()` bằng
     `Date.now()` ở chỗ gọi vẫn xanh — mà đó đúng là bệnh đề bài này chữa. Ép mốc sinh thành
     một giờ cố định rồi đòi ĐÚNG con số: đồng hồ máy chạy tới đâu cũng không đổi được nó. */
  const mocEp = { ...goc, git: { ...goc.git, headStamp: () => "2026-09-06T12:00" } };
  assert.equal(readLuong(bocFile(mocEp, { ".agents/claims.json": claimsJson({
    "_code": { owner: "lane-mot", task: "N-90", claimed_at: "2026-09-06T04:00" }
  }) }))[0].tuoi, "8 giờ trước",
  "tuoi PHAI tinh tu moc sinh cua HEAD — thay bang dong ho he thong la anh chup cu doi lot so lieu song");


  assert.equal(tuoiTuMoc("2026-09-06T12:00", "2026-09-06T04:00"), "8 giờ trước",
    "anh chup cu 8 tieng phai TRONG cu 8 tieng");
  assert.equal(tuoiTuMoc("2026-09-06T12:00", "2026-09-06T11:30"), "dưới một giờ", "duoi mot gio thi noi vay");
  assert.equal(tuoiTuMoc("2026-09-08T12:00", "2026-09-06T04:00"), "2 ngày trước", "qua mot ngay thi dem theo ngay");
  assert.equal(tuoiTuMoc("2026-09-06T12:00", ""), "", "khong co moc nhan thi tra rong, khong bia mot con so");
  assert.equal(tuoiTuMoc("", "2026-09-06T04:00"), "", "khong co moc sinh thi tra rong");

  /* N-10 — PHEP GHIM DANG LE DA CHAN DUOC LOI NAY.

     `tuoiTuMoc` deterministic, va cac khang dinh ngay tren van dung. Cho sai nam mot tang
     cao hon: NUONG chuoi tuoi vao trang lam trang phu thuoc GIO COMMIT CUA HEAD — ma chinh
     viec commit trang lai de ra mot HEAD moi. Tu tham chieu.

     Do that 06/09: khoa nhan luc 15:33, HEAD nhich qua moc mot gio, chuoi doi tu
     "duoi mot gio" sang "1 gio truoc" tuy KHONG du lieu nao doi. `safe-push` chan MOI lane,
     va luot sinh lai chinh no lai de ra HEAD moi. Ba luot lien tiep khong luot nao qua.

     Nen phep kiem phai hoi cau nay: CUNG DU LIEU + MOC SINH KHAC NHAU => KET QUA GIONG HET. */
  const CLAIMS_N10 = { "_code": { owner: "lane-n10", task: "N-90", claimed_at: "2026-09-05T10:00" } };
  const depsN10 = (stamp) => {
    const d = soBia(CLAIMS_N10);
    return { ...d, git: { ...d.git, headStamp: () => stamp } };
  };
  const n10Som = readLuong(depsN10("2026-09-05T10:30"));   // 30 phut sau khi nhan
  const n10Muon = readLuong(depsN10("2026-09-07T12:00"));  // 26 gio sau khi nhan
  assert.ok(n10Som.length > 0, "phai dung duoc it nhat mot dong luong de so");
  assert.deepEqual(n10Som, n10Muon,
    "khoi luong doi khi CHI moc sinh doi — do la thu nuong dong ho vao artifact va chan push moi lane (N-10)");
  for (const r of n10Som) {
    assert.ok(!/gio truoc|ngay truoc|duoi mot gio/.test(JSON.stringify(r)),
      "dong luong khong duoc mang chuoi tuoi da nuong san: " + JSON.stringify(r));
    assert.equal(r.moc, "2026-09-05T10:00", "phai giu MOC NHAN nguyen van tu bang chu so huu");
  }
  ok("N-10: khoi luong giu nguyen khi chi moc sinh doi (30 phut vs 26 gio)");

  /* --- (b) TRANG CÓ LUỒNG: lồng theo nhóm, câu việc từ sổ, tuổi tính lúc sinh --- */
  const LANE_A = "lane-bia-mot-khong-co-trong-repo";
  const LANE_B = "lane-bia-hai-khong-co-trong-repo";
  /* Lane B CỐ TÌNH không khai mã, và chuỗi `--task` của nó CỐ TÌNH bẩn: nó mang một đường dẫn
     + tên file mã, đúng thứ một lane hay gõ vào `--task`. Không dựng thêm trang nào cho ca
     này — nó đi ké trang có luồng, vì một lượt `buildOverview` tốn khoảng mười hai giây. */
  const VIEC_B = "cau viec bia hai cham scripts/claim.mjs cho vui";
  const MOC_A = "2026-09-05T10:05";
  const trangCo = sinh({
    "BACKLOG.md": SO_BIA,
    ".repo-structure.json": cauHinhBia,
    ".agents/claims.json": claimsJson({
      "_root": { owner: null },
      "_docs": { owner: LANE_A, task: "N-90", claimed_at: MOC_A },
      "_code": { owner: LANE_B, task: VIEC_B, claimed_at: "2026-09-05T11:30" }
    })
  });

  const khoiCua = (trang) => {
    const dong = trang.split(NL);
    const i = dong.findIndex((l) => l.includes('class="sect">Đang làm gì'));
    assert.notEqual(i, -1, "phai co khoi 'Dang lam gi' tren trang");
    const j = dong.findIndex((l, k) => k > i && l.includes('class="sect">Cần Đức'));
    assert.ok(j > i, "khoi 'Dang lam gi' phai dung TRUOC vung Can Duc — Duc mo tab ra la thay no ngay");
    return dong.slice(i, j);
  };

  const khoiCo = khoiCua(trangCo);
  /* Ghim ĐÚNG DÒNG TIÊU ĐỀ, không ghim cả khối. Bản đầu viết `khoiCo.some(...)` và đột biến
     kiểm cho thấy nó VÔ NGHĨA: chữ đó cũng nằm trong đoạn ghi chú cuối khối, nên xoá sạch nó
     khỏi tiêu đề vẫn xanh. Một phép ghim khớp nhầm dòng là một phép ghim không có răng. */
  const dongTieuDe = khoiCo.find((l) => l.includes('class="sect">Đang làm gì'));
  assert.ok(dongTieuDe && dongTieuDe.includes("ảnh chụp lúc sinh bảng"),
    "DONG TIEU DE cua khoi PHAI noi thang day la anh chup — mot anh chup cu doi lot so lieu thoi gian thuc la kieu sai te nhat");
  assert.ok(khoiCo.some((l) => l.includes(LANE_A) ), "lane thu nhat phai co dong cua no");
  assert.ok(khoiCo.some((l) => l.includes(LANE_B)), "lane thu hai cung phai co dong cua no");
  assert.equal(khoiCo.filter((l) => l.includes('class="lr"')).length, 2,
    "hai viec dang chay thi ve DUNG hai dong — bang doc duoc, khong dong cung danh sach lane");

  /* LỒNG THEO NHÓM VẤN ĐỀ, không theo khoá — đây là câu Đức hỏi: "việc này đang giải quyết
     vấn đề gì". Tên nhóm phải là chữ trong FILE CẤU HÌNH, không phải mã. */
  assert.ok(khoiCo.some((l) => l.includes("Nhóm vấn đề") && l.includes(NHOM_BIA)),
    "phai co dong tieu de nhom, va ten nhom lay tu file cau hinh");
  assert.ok(khoiCo.some((l) => l.includes("Nhóm vấn đề") && l.includes(NHOM_CHUA_XEP)),
    "lane khong khai ma thi van phai co mot nhom de nam vao, khong duoc bien mat");

  /* CÂU VIỆC LẤY TỪ SỔ, và chuỗi `--task` KHÔNG được in nữa. Hai vế: câu của sổ phải LÊN, và
     chuỗi thô phải BIẾN MẤT — thiếu vế nào phép ghim cũng vô nghĩa. */
  const dongA = khoiCo.find((l) => l.includes(LANE_A));
  assert.ok(dongA && dongA.includes("Cau viec bia lay TU SO"),
    "cau viec phai lay TU SO theo ma lane khai, khong lay tu chuoi task");
  assert.ok(!khoiCo.some((l) => l.includes("N-90")),
    "ma viec la chu cho AI doc — no da lam xong viec cua no o buoc tra, khong can len bang");

  /* --- (b2) LANE KHÔNG KHAI MÃ THÌ BẢNG NÓI THẲNG LÀ KHÔNG TRA ĐƯỢC ---
     Im lặng in chuỗi thô thì không ai sửa thói quen đó — và chuỗi thô là chỗ chữ có dấu hỏng.
     Ngày 06/09 một câu việc mang tên file mã vào HEAD và chặn cổng đóng phiên của MỌI lane. */
  const dongB = khoiCo.find((l) => l.includes(LANE_B));
  assert.ok(dongB, "phai tim duoc dong cua lane thu hai");
  assert.ok(dongB.includes("chưa khai mã việc"),
    `lane khong khai ma thi phai NOI THANG la khong tra duoc — ${dongB.slice(0, 160)}`);
  assert.ok(!dongB.includes("claim.mjs") && !dongB.includes("scripts/") && !dongB.includes("cau viec bia hai"),
    `chuoi task tho KHONG duoc len bang nua — ${dongB.slice(0, 160)}`);

  /* --- (c) TUỔI TÍNH LÚC SINH, KHÔNG TÍNH LÚC MỞ TRANG ---
     ĐẢO NGƯỢC phép ghim cũ (03/09), có chủ đích. Bản cũ cấm chữ "giờ trước" trong thân trang
     và đẩy việc tính sang đoạn JS chạy lúc MỞ trang, để bản commit không phụ thuộc đồng hồ.
     Mục tiêu đó vẫn đúng, nhưng cách đạt được thì sai: nó lấy đồng hồ NGƯỜI XEM trừ đi một mốc
     đã đóng băng, nên một khối cũ tám tiếng vẫn hiện ra như số liệu thời gian thực và Đức tin
     hai luồng đã trả khoá vẫn đang chạy (06/09).
     Nay tuổi tính lúc sinh, TỪ GIỜ COMMIT CỦA HEAD — không phải đồng hồ hệ thống — nên bản
     commit vẫn tất định. Hai vế phải ghim cùng lúc, thiếu vế nào cũng cho phép quay lại bệnh cũ. */
  assert.ok(khoiCo.some((l) => /Nhận vùng (dưới một giờ|\d+ (giờ|ngày) trước)/.test(l)),
    "khoi PHAI in tuoi thanh chu ngay trong than trang — do la nua nhin thay duoc cua luat 'tinh luc sinh'");
  assert.ok(trangCo.includes("<script>"), "phai co doan JS, neu khong thi khang dinh duoi vo nghia");
  assert.ok(!trangCo.includes("data-tu"),
    "doan JS tinh lai tuoi luc MO trang phai bien mat han — con moc neo la con duong quay lai");

  /* --- (d) KHÔNG LUỒNG NÀO CHẠY → VẪN in một dòng, không ẩn khối --- */
  /* CÙNG fixture sổ + cấu hình với trang trên, KHÁC ĐÚNG bảng chủ sở hữu. Khác thêm bất cứ
     thứ gì là khẳng định (f) dưới đây mất nghĩa: nó phải chứng minh "đổi chủ vùng KHÔNG làm
     cổng đỏ", chứ không phải "hai trang bịa khác nhau ở chỗ khác thì cổng đỏ". */
  const trangTrong = sinh({
    "BACKLOG.md": SO_BIA,
    ".repo-structure.json": cauHinhBia,
    ".agents/claims.json": claimsJson({
      "_root": { owner: null }, "_docs": { owner: null }, "_code": { owner: null }
    })
  });
  const khoiTrong = khoiCua(trangTrong);
  assert.ok(khoiTrong.some((l) => l.includes("Không có luồng nào đang chạy")),
    "khong luong nao chay thi PHAI in mot dong noi ro — khoi trong va khoi hong phai phan biet duoc bang mat");
  assert.equal(khoiTrong.filter((l) => l.includes('class="lr"')).length, 1,
    "dung MOT dong, khong an ca khoi");
  assert.ok(!khoiTrong.some((l) => l.includes(LANE_A) || l.includes(LANE_B)),
    "khong con lane nao giu vung thi tuyet doi khong duoc con ten lane sot lai");

  /* --- (e) HAI CHỖ KHỐI NÀY KHÔNG THẤY, nói ra NGAY TRÊN TRANG ---
     Đức nhìn khối trống rồi tin là không có gì chạy — trong khi có thể đang có executor chạy
     ở repo khác — thì sai kiểu đó tệ hơn không có khối này. Nên câu cảnh báo phải có mặt ở
     CẢ HAI trạng thái, nhất là trạng thái trống. */
  for (const [ten, khoi] of [["co luong", khoiCo], ["khong luong", khoiTrong]]) {
    const chu = khoi.join(NL);
    assert.ok(chu.includes("repo khác"),
      `${ten}: phai noi ro khoi nay khong thay luong o repo khac`);
    assert.ok(chu.includes("chưa kịp nhận vùng"),
      `${ten}: phai noi ro khoi nay khong thay luong chua kip nhan vung`);
  }

  /* --- (f) MỌI DÒNG CỦA KHỐI MANG DẤU LỌC Ở ĐẦU DÒNG ---
     Phép ghim quan trọng nhất của việc này. Đo trên lịch sử thật: 146 trong 174 commit chạm
     bảng chủ sở hữu làm ĐỔI trạng thái bận/mở. Thiếu dấu ở MỘT dòng là mỗi lượt nhận/trả khoá
     lại chặn push của MỌI lane, và chuyện đó chỉ hiện ra lúc một phiên bị từ chối mà không
     hiểu vì sao. Thụt lề trước dấu cũng tính là thiếu: phép lọc dùng `startsWith`. */
  for (const [ten, khoi] of [["co luong", khoiCo], ["khong luong", khoiTrong]]) {
    for (const l of khoi) {
      assert.ok(l.startsWith(KHOA_PREFIX),
        `${ten}: MOI dong cua khoi phai bat dau bang dau loc, khong duoc thut le truoc dau: ${l.slice(0, 60)}`);
    }
  }

  /* Và bằng chứng cái dấu đó THẬT SỰ làm việc của nó: đổi hết chủ vùng thì cổng KHÔNG đỏ.
     Không có khẳng định này thì (f) chỉ chứng minh có dấu, không chứng minh dấu ăn khớp với
     phép so của cổng. */
  assert.ok(compareOverview(trangCo, trangTrong).matches,
    "doi het chu vung KHONG duoc lam cong do — do la moi lane bi chan day viec du chang co gi doi");
  assert.notEqual(trangCo, trangTrong, "hai trang phai KHAC nhau, neu khong thi fixture chua toi duoc bo sinh");

  /* --- (g) TAB MỞ SẴN là AI điều phối, và NÚT KHỚP KHUNG ---
     Ghim CẢ HAI, không ghim một. Nút tab được tô sáng và khung được mở nằm ở hai chỗ khác
     nhau trong HTML; lệch nhau là Đức mở trang ra thấy nút này sáng mà nội dung kia hiện, và
     không có cách nào để Đức biết mình đang nhìn nhầm tab. */
  assert.equal(TAB_MAC_DINH, "ai-dieu-phoi", "tab mo san phai la AI dieu phoi (Duc chot 05/09)");
  const nutSang = [...trangCo.matchAll(/data-tab="([a-z-]+)" aria-selected="true"/g)].map((m) => m[1]);
  const khungMo = [...trangCo.matchAll(/data-pane="([a-z-]+)"( hidden)?>/g)]
    .filter((m) => !m[2]).map((m) => m[1]);
  assert.deepEqual(nutSang, [TAB_MAC_DINH], "dung MOT nut tab duoc to sang, va phai la tab mo san");
  assert.deepEqual(khungMo, [TAB_MAC_DINH], "dung MOT khung khong mang hidden, va phai la tab mo san");
  assert.deepEqual(nutSang, khungMo, "nut tab duoc to sang PHAI la dung tab co khung dang mo");

  /* Và KHÔNG được đụng vào dòng CSS đang giữ cho tab đổi được (bug DASH-TAB-01). Thêm một
     luật `display` nữa cho khung là cả chín tab lại không đổi được, y như lần trước. */
  assert.ok(trangCo.includes('[role="tabpanel"][hidden]{display:none}'),
    "dong CSS giu cho tab doi duoc phai con nguyen — DASH-TAB-01");
  assert.equal([...trangCo.matchAll(/\[role="tabpanel"\][^{]*\{[^}]*display:/g)].length, 2,
    "chi duoc DUNG hai luat display cho khung tab (flex + none khi hidden) — them cai thu ba la tai sinh DASH-TAB-01");

  ok(`khoi dang lam gi: ${khoiCo.filter((l) => l.includes('class="lr"')).length} luong doc tu bang, khoi trong van in mot dong, moi dong mang dau, tab mo san khop nut voi khung`);
}

/* ---- T16. VIỆC LỚN ĐÃ ĐÓNG — đề bài `MOC-DA-XONG-01` ----
 *
 * Ghim HÀNH VI, không ghim chuỗi nguồn. Ba vế, và vế thứ hai là vế hay bị bỏ quên nhất:
 *   • chặn đúng thứ cần chặn (tiêu đề hỏng ở một đề bài ĐÃ ĐÓNG → ném)
 *   • KHÔNG chặn thứ hợp lệ (tiêu đề hỏng ở một đề bài CHƯA đóng → kệ, không phải việc của khối này)
 *   • ngày đi theo git, không theo đồng hồ (đổi ngày git thì thứ tự đổi theo)
 * Thiếu vế hai thì một bản "luôn từ chối" vẫn qua sạch — MULTIFLOW mục 5, bẫy số 3. */
{
  const G = String.fromCharCode(8212);
  const NL = String.fromCharCode(10);
  const goc = REAL;
  const ten = (p) => (p.startsWith("docs/briefs/") ? p.slice("docs/briefs/".length) : null);
  const soDeBai = (briefs, ngay) => ({
    ...goc,
    listFiles: (p) => (p === "docs/briefs" ? Object.keys(briefs) : goc.listFiles(p)),
    readFile: (p) => (ten(p) && ten(p) in briefs ? briefs[ten(p)] : goc.readFile(p)),
    git: { ...goc.git, lastCommitDate: (p) => (ten(p) in ngay ? ngay[ten(p)] : "") }
  });
  const fm = (st) => `---${NL}kind: brief${NL}status: ${st}${NL}---${NL}${NL}`;

  const briefs = {
    "BRIEF-AAA-01.md": fm("done") + `# BRIEF \`AAA-01\` ${G} việc có mã`,
    "BRIEF-S9.md": fm("done") + `# BRIEF ${G} Phiên S9`,
    "BRIEF-BBB-02.md": fm("active") + `# BRIEF \`BBB-02\` ${G} còn đang mở`,
    "BRIEF-CCC-03.md": fm("superseded") + `# BRIEF \`CCC-03\` ${G} đã bị bản mới thay`
  };
  const ngay = {
    "BRIEF-AAA-01.md": "2026-09-01", "BRIEF-S9.md": "2026-09-04",
    "BRIEF-BBB-02.md": "2026-09-05", "BRIEF-CCC-03.md": "2026-09-05"
  };

  assert.deepEqual(readMocDaXong(soDeBai(briefs, ngay)), [
    { ma: "", ten: "Phiên S9", ngay: "2026-09-04" },
    { ma: "AAA-01", ten: "việc có mã", ngay: "2026-09-01" }
  ], "chi lay status: done, doc CA HAI dang tieu de, ngay moi nhat len dau");

  // Ngày ĐI THEO GIT. Đổi ngày git thì thứ tự đổi theo — bằng chứng khối này không nhìn đồng
  // hồ: đồng hồ không đổi giữa hai lượt gọi mà kết quả vẫn đổi.
  assert.deepEqual(
    readMocDaXong(soDeBai(briefs, { ...ngay, "BRIEF-AAA-01.md": "2026-09-09" })).map((r) => r.ma),
    ["AAA-01", ""], "ngay doc tu git: doi ngay git thi thu tu doi theo");

  // (a) CHẶN ĐÚNG THỨ CẦN CHẶN.
  assert.throws(() => readMocDaXong(soDeBai({ "BRIEF-BBB-02.md": briefs["BRIEF-BBB-02.md"] }, ngay)),
    /MOC_XONG_RONG/, "khong co de bai nao da dong thi NEM, khong ve the rong");
  assert.throws(
    () => readMocDaXong(soDeBai({ ...briefs, "BRIEF-AAA-01.md": fm("done") + "# Tiêu đề không còn dạng brief" }, ngay)),
    /MOC_XONG_TIEU_DE_HONG: BRIEF-AAA-01/,
    "de bai DA DONG ma tieu de hong thi NEM KEM TEN FILE — bo qua im lang la lam ngan danh sach");
  assert.throws(() => readMocDaXong(soDeBai(briefs, { ...ngay, "BRIEF-S9.md": "" })),
    /MOC_XONG_THIEU_NGAY: BRIEF-S9/, "khong co commit nao cham file thi NEM, khong dien ngay hom nay");
  assert.throws(() => readMocDaXong(soDeBai(briefs, { ...ngay, "BRIEF-S9.md": "hôm nay" })),
    /MOC_XONG_THIEU_NGAY: BRIEF-S9/, "gia tri khong phai mot ngay thi cung NEM, khong doan");

  // (b) KHÔNG CHẶN THỨ HỢP LỆ. Thiếu vế này thì một bản "luôn từ chối" vẫn qua sạch.
  assert.equal(
    readMocDaXong(soDeBai({ ...briefs, "BRIEF-BBB-02.md": fm("active") + "# Tiêu đề hỏng" }, ngay)).length, 2,
    "tieu de hong o de bai CHUA dong thi KHONG chan — khoi nay chi noi ve viec da dong");
  assert.equal(
    readMocDaXong(soDeBai({ ...briefs, "GHI-CHU.md": fm("done") + "# Không phải brief" }, ngay)).length, 2,
    "file khong mang tien to BRIEF- thi khong phai de bai, khong chan");

  /* --- Trên trang thật --- */
  const trang = buildOverview(goc).html;
  const thatMoc = readMocDaXong(goc);
  assert.ok(thatMoc.length > 0, "repo that phai co it nhat mot de bai da dong, neu khong thi phep duoi vo nghia");

  assert.ok(/data-tab="nhat-ky"[^>]*>Nhật ký &amp; mốc</.test(trang),
    "nhan tab phai la 'Nhat ky & moc' — de bai chot doi nhan cung luot them the");

  const tabNhatKy = trang.slice(trang.indexOf(`data-pane="nhat-ky"`), trang.indexOf(`data-pane="tra-cuu"`));
  const mocThe = [...tabNhatKy.matchAll(/<div class="card">/g)].map((m) => m.index);
  assert.equal(mocThe.length, 2, "tab Nhat ky phai co DUNG hai the: quyet dinh da chot + viec lon da dong");

  const theQuyetDinh = tabNhatKy.slice(mocThe[0], mocThe[1]);
  const theMoc = tabNhatKy.slice(mocThe[1]);
  assert.ok(theQuyetDinh.includes("Quyết định đã chốt"), "the DAU van phai la the quyet dinh — khong duoc dung vao no");
  assert.equal([...theMoc.matchAll(/<div class="lr">/g)].length, thatMoc.length,
    "the moi phai co DUNG mot dong cho moi de bai da dong");
  for (const m of thatMoc) {
    assert.ok(theMoc.includes(m.ngay), `${m.ngay}: ngay dong phai co mat tren the`);
  }

  /* KHÔNG TRÙNG THẺ BÊN CẠNH — ràng buộc bắt buộc của đề bài. Hai bản của một danh sách thì
     sớm muộn đếm ra hai số khác nhau, và Đức không có cách nào biết bên nào đúng. */
  const cauCua = (khoi) => new Set([...khoi.matchAll(/<span class="d">([^<]+)</g)].map((m) => m[1]));
  const cauQuyetDinh = cauCua(theQuyetDinh);
  assert.ok(cauQuyetDinh.size > 0, "the quyet dinh phai co dong nao do, neu khong thi phep so nay vo nghia");
  for (const m of thatMoc) {
    assert.ok(!cauQuyetDinh.has(m.ten), `"${m.ten}" xuat hien o CA HAI the — the moi bi cam chep lai the quyet dinh`);
  }

  /* MỘT DÒNG Ở VÙNG 2 CỦA TAB AI ĐIỀU PHỐI, không phải một vùng thứ năm. */
  const tabDp = trang.slice(trang.indexOf(`data-pane="ai-dieu-phoi"`), trang.indexOf(`data-pane="extension"`));
  const vungDp = [...tabDp.matchAll(/<div class="card">/g)].map((m) => m.index);
  assert.equal(vungDp.length, 4, "tab AI dieu phoi van phai DUNG bon vung — dong moc la MOT DONG, khong phai vung thu nam");
  const vung2 = tabDp.slice(vungDp[1], vungDp[2]);
  assert.ok(vung2.includes("Công việc hiện tại"), "cat dung vung 2");
  const TRO = "Danh sách đầy đủ ở tab <strong>Nhật ký &amp; mốc</strong>";
  assert.equal(vung2.split(TRO).length - 1, 1, "vung 2 phai co DUNG MOT dong tro sang tab Nhat ky");
  assert.equal(trang.split(TRO).length - 1, 1,
    "ca trang chi duoc co MOT dong do — hai chuong la hai ban cua mot con so");
  assert.ok(vung2.includes(`Đã đóng <strong>${thatMoc.length} việc lớn</strong>`),
    "so tren dong do phai la so dem that, khong go tay");
  assert.ok(vung2.includes(thatMoc[0].ma || thatMoc[0].ten),
    "dong do phai keu ten viec dong gan nhat");

  ok(`viec lon da dong: ${thatMoc.length} de bai doc tu status: done, ngay lay tu git, khong trung the quyet dinh, mot dong tro o vung 2`);
}

/* ---- T17. N-03 · SỔ NỢ Ở GỐC REPO PHẢI LÊN BẢNG ----
 *
 * Bộ lọc cũ là `p.endsWith("/BACKLOG.md")` — có dấu `/` ở đầu, nên nó chỉ thấy sổ nợ CỦA GÓI.
 * Ngày 06/09 mười bốn mục dời từ `IDEAS.md` sang `BACKLOG.md` ở gốc repo, và cả mười bốn
 * biến mất khỏi bảng: đo được 19 ý tưởng trước khi tách, 5 sau khi tách, không mục nào đóng.
 * Đức đọc bảng để ra quyết định, nên một con số làm repo NHẸ ĐI là loại sai nguy hiểm nhất.
 *
 * Ghim cả hai chiều: sổ gốc phải có mặt VÀ dòng `- **ĐÓNG N-xx**` phải trừ ra được. Cửa ra
 * của sổ gốc là thêm một dòng ở cuối (luật mục 4 của chính sổ đó), không phải sửa khối cũ —
 * nếu bảng không đọc dòng đó thì số nợ chỉ tăng, không bao giờ giảm. */
{
  const soGoc = [
    "# Sổ nợ hạ tầng repo",
    "```",
    "## N-xx · bản mẫu nằm trong khối mã, KHÔNG được đếm",
    "- **ĐÓNG N-xx** · bản mẫu của dòng đóng",
    "```",
    "## Y-03 · việc chuyển từ sổ ý tưởng",
    "## N-01 · việc đang mở",
    "## N-02 · việc đã đóng bằng dòng thêm ở cuối",
    "## N-03 · Đóng một mục là thêm dòng, nhưng chưa có gì gấp sổ lại",
    "- **ĐÓNG N-02** · 2026-09-07 · lane `x` · lệnh đã xanh"
  ].join("\n");
  const soGoi = ["# Sổ nợ gói", "- **F-01** · việc mở", "- **F-02** · **XONG 02/09**"].join("\n");
  const deps = {
    git: { trackedPaths: () => ["BACKLOG.md", "workers/goi-thu/v1/BACKLOG.md"] },
    readFile: (p) => (p === "BACKLOG.md" ? soGoc : soGoi)
  };
  const rows = debtByUnit(deps, { rows: [] });
  assert.equal(rows.length, 2, "phai co CA so goc LAN so no cua goi — bo loc cu chi thay mot");

  const goc = rows.find((r) => r.name === "nợ hạ tầng repo");
  assert.ok(goc, "so no goc repo phai co nhan rieng, khong duoc mang ten mot goi worker");
  // Mở: Y-03, N-01, N-03 = 3.  Đóng bằng dòng thêm ở cuối: N-02.  Bản mẫu trong khối mã: 0.
  // N-03 mở đầu bằng chữ "Đóng" mà VẪN ĐANG MỞ — sổ gốc không đặt dấu đóng vào tiêu đề,
  // nên đọc tiêu đề của nó bằng `isDone` là hỏi sai câu. Ca thật, đo 06/09: bảng in 16 / sổ 17.
  assert.equal(goc.n, 3, "dem 3 muc con mo — N-02 dong bang dong them o cuoi, N-03 mo dau bang chu Dong nhung VAN MO");

  const goi = rows.find((r) => r.name !== "nợ hạ tầng repo");
  assert.equal(goi.n, 1, "so no cua goi van dem nhu cu — ban va nay khong duoc lam lech con so goc");

  /* Chiều thứ hai, trên FILE THẬT: con số bảng in ra phải khớp phép đếm tay trong sổ.
     Không gõ cứng con số — sổ này còn mọc thêm mục, và số gõ cứng thì sẽ mục nát. */
  const vanBan = REAL.readFile("BACKLOG.md");
  const daDong = new Set([...vanBan.matchAll(/^-\s+\*\*ĐÓNG\s+([A-Z]{1,3}-\d+)\*\*/gm)].map((m) => m[1]));
  const dangMo = [...vanBan.matchAll(/^#{2}\s+([A-Z]{1,3}-\d+)\s+·/gm)]
    .map((m) => m[1]).filter((ma) => !daDong.has(ma));
  assert.ok(dangMo.length >= 14, `so goc phai con it nhat 14 muc mo, dem duoc ${dangMo.length}`);

  const thatSu = debtByUnit(REAL, { rows: [] }).find((r) => r.name === "nợ hạ tầng repo");
  assert.ok(thatSu, "tren repo THAT, so no goc cung phai len bang");
  assert.equal(thatSu.n, dangMo.length,
    `bang in ${thatSu?.n} muc, dem tay trong so duoc ${dangMo.length} — hai so nay khong duoc lech`);

  ok(`so no goc repo len bang: ${dangMo.length} muc mo, dong "ĐÓNG" tru duoc, so cua goi khong doi`);
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

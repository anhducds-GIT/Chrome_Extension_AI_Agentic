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
import { bacMoc, buildOverview, compareOverview, debtByUnit, humanWork, IDEA_STAGES, isDone, KHOA_PREFIX, readBrief, readDecisions, readDefects, readFeatures, readAreas, readIdeas, readKhoa, readMoc, readRefreshLine, shorten, sinhTrang, tenKhoa, TRANG_FILE } from "../scripts/build-overview.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
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
  const { html, stats } = buildOverview(createDefaultDeps(ROOT));
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
  const soVung = readAreas(createDefaultDeps(ROOT)).length;
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
  const deps = createDefaultDeps(ROOT);
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

/* ---- 5b. Câu "làm mới bảng" phải ĐỌC từ PROMPTS.md, không được gõ cứng.
 *
 * Bản cũ gõ cứng "sinh lại rồi ĐĂNG LẠI ARTIFACT". Rồi bảng vào repo, PROMPTS.md sửa theo,
 * chuỗi trong bộ sinh thì không — nên trang bảo AI làm một đằng, sổ prompt bảo một nẻo.
 * Chép là tạo bản thứ hai, và bản thứ hai luôn lệch. */
{
  const deps = createDefaultDeps(ROOT);
  const cau = readRefreshLine(deps);

  /* CA QUYẾT ĐỊNH: đưa một PROMPTS.md ĐÃ ĐỔI CÂU, rồi đòi TRANG đổi theo.

     Bản trước chỉ hỏi "trang có chứa câu hiện tại không" — mà một bộ sinh GÕ CỨNG đúng câu
     hiện tại thì cũng xanh. Tức nó KHÔNG chứng minh được điều nó tự nhận là chứng minh, và
     tôi đã dựa vào nó để báo "thử phá 6/6". GPT audit vòng 2 bắt được 04/09; con số thật
     lúc đó là 5/6.

     Bỏ luôn `cau.length > 10`: một ngưỡng tuỳ ý, không nói gì về cơ chế, và ca dưới bao hàm nó. */
  const CAU_LA = "Cau thu nghiem khong the go cung duoc 20260904";
  const gocPrompts = deps.readFile("PROMPTS.md");
  const doiNguon = {
    ...deps,
    readFile: (f) => (f === "PROMPTS.md" ? gocPrompts.split(cau).join(CAU_LA) : deps.readFile(f))
  };
  assert.equal(readRefreshLine(doiNguon), CAU_LA, "doi nguon thi cau DOC RA phai doi theo");
  const htmlDoi = buildOverview(doiNguon, { today: "head" }).html;
  assert.ok(htmlDoi.includes(CAU_LA), "doi nguon thi TRANG phai doi theo — con go cung thi khong");
  assert.ok(!htmlDoi.includes(cau), "cau CU khong duoc con sot lai tren trang");

  // Ca hỏng: PROMPTS.md mất mục 2 thì phải NÉM, không được âm thầm dùng câu dự phòng —
  // câu dự phòng âm thầm chính là con đường đã đi vào lỗi trên.
  const mat = { ...deps, readFile: (f) => f === "PROMPTS.md" ? "# rong" : deps.readFile(f) };
  assert.throws(() => readRefreshLine(mat), /THIEU_CAU_LAM_MOI/,
    "mat muc 2 thi phai nem, khong duoc lang le dung cau go cung");

  /* CA HỎNG THẬT của lỗi tràn mục — và ca này SUÝT không có.
     Thử phá DB21 (bỏ chặn ở mục kế) để suite XANH, nghĩa là bản vá đó chưa được ghim.
     Ca trên không dựng được nó: `"# rong"` KHÔNG có mục 2 nào cả, nên nó ném dù có chặn
     hay không — xanh vì lý do khác.
     Ca thật phải là: mục 2 CÒN ĐÓ nhưng MẤT khối, còn mục SAU thì CÓ khối. Không chặn ở
     mục kế thì nó nhặt câu của mục 3 rồi trả về như thật — Đức dán nhầm câu mà không ai biết. */
  const tranMuc = [
    "# Sổ prompt", "", "## 2. Làm mới bảng trạng thái", "",
    "Mục này mất khối lệnh.", "",
    "## 3. Một việc hoàn toàn khác", "",
    "```text", "Cau cua MUC KHAC, tuyet doi khong duoc lay", "```", ""
  ].join("\n");
  const tran = { ...deps, readFile: (f) => (f === "PROMPTS.md" ? tranMuc : deps.readFile(f)) };
  assert.throws(() => readRefreshLine(tran), /THIEU_CAU_LAM_MOI/,
    "muc 2 mat khoi thi phai NEM, tuyet doi khong duoc nhat khoi cua muc sau");
  ok("cau lam moi doc tu PROMPTS.md, va mat nguon thi nem chu khong doan");
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
  const { html } = buildOverview(createDefaultDeps(ROOT));
  assert.match(html, /việc đang chờ|Không có việc nào chờ Đức/, "bang phai noi ro co bao nhieu viec cho Duc");
  ok("Y-03 ba trang thai: co viec / da tra loi khong / chua ai tra loi — khong gop lan nhau");
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
  const deps = createDefaultDeps(ROOT);
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
  const { html } = buildOverview(createDefaultDeps(ROOT));
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
  const soDonVi = collectModelRows(createDefaultDeps(ROOT)).length;
  const soYTuong = readIdeas(createDefaultDeps(ROOT)).length;
  assert.equal(links.length, soDonVi + soYTuong,
    `bang tong phai co dung MOT link cho moi don vi va moi y tuong: ${soDonVi}+${soYTuong}, dang co ${links.length}`);
  for (const [, target, goto] of links) {
    assert.ok(ids.has(target), `link "#${target}" khong co dich tren trang — bam vao khong co gi xay ra`);
    assert.ok(panes.includes(goto), `link tro sang tab "${goto}" khong ton tai`);
  }
  ok(`${tabs.length} tab, ${an} khung an, va ca ${links.length} link o bang tong deu co dich that`);
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
  const real = createDefaultDeps(ROOT);
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
  const real = createDefaultDeps(ROOT);
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

   `DASHBOARD.html` nay nằm trong khối `generators`, nên cổng chạy `--check-head` mỗi phiên
   và `safe-push` TỪ CHỐI ĐẨY khi nó lệch. Nếu nội dung phụ thuộc GIỜ ĐỒNG HỒ thì sang ngày
   mới là nó lệch HEAD **dù không một dữ liệu nào đổi**, và MỌI phiên khác bị chặn push chỉ
   vì một ngày đã qua. Đó không phải lỗi của bảng — đó là lỗi làm tê cả repo.

   Bốn lượt sinh, không nhiều hơn: một lượt tốn ~9 giây (đo 03/09) và suite này chạy trong
   cổng đóng phiên của MỌI phiên. Bản đầu gọi sáu lượt bằng deps HEAD và vượt 120 giây —
   cơ chế cần kiểm là "có nhìn đồng hồ hay không", và nó không khác nhau giữa hai loại
   deps, nên deps đĩa là đủ. ---- */
{
  const deps = createDefaultDeps(ROOT);
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

  assert.equal(TRANG_FILE, "DASHBOARD.html", "ten ban chuan cua repo");
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
  const deps = (obj) => bocFile(createDefaultDeps(ROOT), { ".agents/claims.json": claimsJson(obj) });

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
  assert.throws(() => readKhoa(bocFile(createDefaultDeps(ROOT), { ".agents/claims.json": null })),
    /CLAIMS_THIEU_FILE/, "thieu bang chu so huu thi nem");
  assert.throws(() => readKhoa(bocFile(createDefaultDeps(ROOT), { ".agents/claims.json": "{" })),
    /CLAIMS_HONG/, "bang chu so huu hong thi nem");
  assert.throws(() => readKhoa(bocFile(createDefaultDeps(ROOT), { ".agents/claims.json": "{\"claims\":[]}" })),
    /CLAIMS_THIEU_KHOI/, "mang cung cho typeof object — phai bi tu choi");

  assert.equal(tenKhoa("workers/duc-auto-gemini"), "duc-auto-gemini", "khoa goi bo phan thu muc");
  assert.equal(tenKhoa("_root"), "_root", "khoa goc giu nguyen");
  ok("khoi 1: bang khoa doc tu bang chu so huu, chi bien BAN/MO, va fail closed 3 dang");
}

/* ---- T2. Ba khối có mặt · KHÔNG rò tên chủ · số khoá đổi thì bảng đổi ---- */
{
  const CHU = "phien-bi-mat-khong-duoc-lo";
  const sinh = (obj) => buildOverview(bocFile(createDefaultDeps(ROOT), {
    ".agents/claims.json": claimsJson(obj)
  })).html;

  const sau = { "_root": { owner: CHU }, "_docs": { owner: null }, "_code": { owner: null },
    "workers/goi-mot": { owner: CHU }, "workers/goi-hai": { owner: null },
    "workers/goi-ba": { owner: null } };
  const html = sinh(sau);

  // Cắt ĐÚNG khung của tab rồi mới khẳng định. Khẳng định trên cả trang thì một chữ trùng ở
  // tab khác cũng cho xanh giả — repo này đã bị cắn đúng kiểu đó.
  const iTab = html.indexOf('data-pane="ai-dieu-phoi"');
  assert.notEqual(iTab, -1, "phai co khung tab AI dieu phoi");
  const jTab = html.indexOf('data-pane="extension"', iTab);
  assert.notEqual(jTab, -1, "khung tab phai dong lai duoc, neu khong thi cat sai");
  const tab = html.slice(iTab, jTab);

  assert.ok(html.includes('data-tab="ai-dieu-phoi"'), "phai co nut tab tren thanh tab");

  // Ba khối, không hơn không kém. Khối thứ tư là thứ brief cấm.
  assert.equal([...tab.matchAll(/<div class="card">/g)].length, 3,
    "tab phai co DUNG ba khoi — them khoi thu tu la trai brief, bot la thieu");

  // KHỐI 1 — cắt RIÊNG khung khối một rồi mới đếm. Đếm trên cả tab thì huy hiệu MỞ của khối
  // defect cũng bị đếm vào: đúng cái bẫy "regex chạy ra ngoài phạm vi" đã cắn repo này nhiều
  // lần, và nó cắn thật ở lượt chạy đầu — hai khoá mà đếm ra sáu.
  const khoiKhoa = (trang) => {
    const i = trang.indexOf('data-pane="ai-dieu-phoi"');
    const t = trang.slice(i, trang.indexOf('data-pane="extension"', i));
    const a = t.indexOf('<div class="card">');
    return t.slice(a, t.indexOf('<div class="card">', a + 1));
  };
  const k1 = khoiKhoa(html);

  // Một dòng cho mỗi khoá, đúng bận/mở, và tuyệt đối không có tên chủ.
  const dongKhoa = [...k1.matchAll(/<div class="kr"><span class="n">([^<]+)<\/span><span class="badge b\d">(BẬN|MỞ)<\/span><\/div>/g)]
    .map((m) => [m[1], m[2]]);
  assert.deepEqual(dongKhoa, [["_root", "BẬN"], ["_docs", "MỞ"], ["_code", "MỞ"],
    ["goi-mot", "BẬN"], ["goi-hai", "MỞ"], ["goi-ba", "MỞ"]],
  "moi khoa mot dong, dung thu tu bang chu so huu, dung bien");
  assert.ok(!tab.includes(CHU), "TUYET DOI khong duoc lo ten phien dang giu khoa");
  assert.ok(!html.includes(CHU), "va khong lo o bat ky tab nao khac");

  // Số khoá đổi thì bảng đổi theo — bằng chứng nó không đóng cứng sáu dòng.
  const k1It = khoiKhoa(sinh({ "_root": { owner: null }, "_docs": { owner: "ai-do" } }));
  assert.equal([...k1It.matchAll(/class="badge b\d">(?:BẬN|MỞ)</g)].length, 2,
    "hai khoa thi ve hai dong — bang khoa khong duoc dong cung");
  assert.ok(k1It.includes("2 khoá"), "so dem tren tieu de khoi phai di theo tap khoa");
  assert.ok(k1.includes("6 khoá"), "va bang sau khoa thi noi sau");

  // Trang PHẢI nói rõ đây là ảnh chụp lúc sinh — điều kiện Đức đặt cho đường (b).
  assert.ok(/ảnh chụp lúc sinh/.test(tab),
    "chon duong loc thi PHAI noi ro khoi nay la anh chup luc sinh, khong phai thoi gian thuc");

  // KHỐI 2 — ba mốc, đọc từ hồ sơ mốc.
  for (const ten of ["V0.1 PACKAGE", "EXTENSION PILOT", "PORTABLE FREEZE"]) {
    assert.ok(tab.includes(ten), `khoi moc phai co moc ${ten}`);
  }
  // KHỐI 3 — defect có mã và có biến mở/đóng.
  assert.ok(/ROLE-DRIFT-01/.test(tab), "khoi defect phai co ma defect that");
  assert.ok(/>ĐÓNG</.test(tab) && /class="badge b1">MỞ</.test(tab),
    "khoi defect phai the hien duoc ca hai bien mo va dong");
  ok("tab AI dieu phoi: ba khoi, khoa doc tu bang chu so huu, KHONG lo ten chu, so khoa doi thi bang doi");
}

/* ---- T3. Khối mốc: đọc lại từ hồ sơ, và fail closed ---- */
{
  const mocDeps = (text) => bocFile(createDefaultDeps(ROOT), { "docs/protocols/ASSISTANT-V0.1.md": text });
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

  assert.throws(() => readMoc(bocFile(createDefaultDeps(ROOT), { "docs/protocols/ASSISTANT-V0.1.md": null })),
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
    ...createDefaultDeps(ROOT),
    listFiles: (p) => (p === "docs/briefs" ? Object.keys(briefs) : []),
    readFile: (p) => {
      const ten = p.startsWith("docs/briefs/") ? p.slice("docs/briefs/".length) : null;
      return ten && ten in briefs ? briefs[ten] : createDefaultDeps(ROOT).readFile(p);
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
  const html = buildOverview(createDefaultDeps(ROOT)).html;
  const dong = html.split(String.fromCharCode(10));
  const coDau = dong.filter((l) => l.startsWith(KHOA_PREFIX));
  // Nhận dòng khoá theo ĐÚNG hình dạng của nó: ô tên chỉ có chữ, không thẻ con. Dòng defect
  // cũng in chữ "MỞ" nhưng ô tên của nó bọc thêm một thẻ, nên rơi ra ngoài — và phải rơi ra:
  // trạng thái defect là NỘI DUNG, lọc nó khỏi phép so là làm cổng mất răng.
  // (Lượt chạy đầu bắt được đúng chỗ này: regex rộng quét luôn cả 4 dòng defect.)
  const dongKhoaThat = dong.filter((l) => /<span class="n">[^<]+<\/span><span class="badge b\d">(?:BẬN|MỞ)</.test(l));
  assert.ok(coDau.length > 0, "trang that phai co dong khoa mang dau");
  assert.deepEqual(coDau, dongKhoaThat, "MOI dong khoa deu phai mang dau — sot mot dong la cong do oan");
  assert.ok(dong.some((l) => !l.startsWith(KHOA_PREFIX) && /<em>[^<]*<\/em><\/span><span class="badge b\d">MỞ</.test(l)),
    "dong defect MO tuyet doi KHONG duoc mang dau — trang thai defect la noi dung, phai lam cong do");
  ok("do tuoi: dong khoa duoc loc, moi thu khac van chan, va dau in dung cho tren trang that");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

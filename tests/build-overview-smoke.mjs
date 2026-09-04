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
import { bacMoc, blockedIfSkipped, buildOverview, demLuongSongSong, readBatBien, readCoChe, choDuc, chungMinhCu, compareOverview, debtByUnit, gateNext, GATE_MIN, humanWork, IDEA_STAGES, isDone, KHOA_PREFIX, trangThaiDonVi, readAssistantEvents, readBrief, readDecisions, readDefects, readFeatures, readAreas, readIdeas, readKhoa, readMoc, readRefreshLine, shorten, sinhTrang, SU_CO_ASSISTANT, tenKhoa, TRANG_FILE } from "../scripts/build-overview.mjs";

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
  const { html } = buildOverview(createDefaultDeps(ROOT));

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
  const goc = createDefaultDeps(ROOT);
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

  /* --- (d) KHÔNG rò tên phiên đang giữ khoá --- */
  assert.ok(!tab.includes(CHU), "TUYET DOI khong duoc lo ten phien dang giu khoa");
  assert.ok(!html.includes(CHU), "va khong lo o bat ky tab nao khac");
  assert.ok(/ảnh chụp lúc sinh/.test(v4),
    "phai con cau noi ro khoi khoa la anh chup luc sinh, khong phai trang thai thoi gian thuc");

  // Số khoá đổi thì bảng đổi theo — bằng chứng nó không đóng cứng sáu dòng.
  const v4It = vungCua(sinh({ ".agents/claims.json": claimsJson({ "_root": { owner: null }, "_docs": { owner: "ai-do" } }) }))[3];
  assert.equal([...v4It.matchAll(/class="badge b\d">(?:BẬN|MỞ)</g)].length, 2,
    "hai khoa thi ve hai dong — bang khoa khong duoc dong cung");
  assert.ok(v4It.includes("2 khoá") && v4.includes("6 khoá"), "so dem tren tieu de phai di theo tap khoa");

  /* --- (e) VÙNG 1 đọc từ `human_action`, và KHÔNG lẫn đơn vị không có việc --- */
  const rows = collectModelRows(goc);
  const dangCho = rows.filter((r) => trangThaiDonVi(r).chu === "CHỜ ĐỨC");
  assert.ok(dangCho.length > 0, "ho so that phai co it nhat mot don vi cho Duc, neu khong thi (e) vo nghia");
  const v1 = vung[0];
  assert.equal([...v1.matchAll(/<div class="dr">/g)].length, dangCho.length,
    "vung 1 phai co dung MOT dong cho moi don vi co viec cho Duc");
  for (const r of dangCho) {
    assert.ok(v1.includes(r.name), `${r.name} co viec cho Duc thi phai co mat o vung 1`);
    assert.ok(v1.includes(String(r.humanAction).trim()),
      `${r.name}: cau viec phai lay NGUYEN VAN tu truong don vi tu khai, khong viet lai`);
  }
  for (const r of rows.filter((x) => trangThaiDonVi(x).chu !== "CHỜ ĐỨC")) {
    assert.ok(!v1.includes(`data-goto="extension">${r.name}</a>`),
      `${r.name} khong co viec cho Duc thi KHONG duoc lan vao vung 1`);
  }

  /* --- (f) trường TUỲ CHỌN `blocked_if_skipped`: vắng thì không vẽ gì, có thì vẽ dòng phụ ---
     Hôm nay trường này vắng ở CẢ BỐN đơn vị, nên nhánh "có khai" phải dựng bằng fixture —
     đo trên hồ sơ thật thì nhánh đó chưa từng chạy và khẳng định vô nghĩa. */
  assert.equal([...v1.matchAll(/class="w">/g)].length, 0,
    "truong vang thi KHONG ve gi them — khong bia, cung khong de mot cho trong trong nhu loi");
  const themFm = (text, dong) => text.replace(/^---\r?\n/, `---${String.fromCharCode(10)}${dong}${String.fromCharCode(10)}`);
  const doiHang = (text, so) => text.replace(/^priority_rank:.*$/m, `priority_rank: ${so}`);
  const CAU_CHAN = "quan sat nam im, khong ai biet no con song hay khong";
  const gpt = rows.find((r) => r.name === "Duc Auto ChatGPT");
  assert.ok(gpt && gpt.statusPath, "phai tim duoc ho so cua don vi GPT de dung fixture");
  /* MỘT lượt sinh cho HAI nhánh fixture. Đo trên máy: một lượt `buildOverview` tốn khoảng
     mười hai giây, nên mỗi fixture thêm là mười hai giây cộng vào cổng đóng phiên của MỌI
     phiên sau. Hai nhánh này không đụng nhau (một thêm trường tuỳ chọn ở đơn vị gốc, một hạ
     thứ hạng đơn vị GPT), nên gộp được mà không cái nào che cái nào. */
  const vungFx = vungCua(sinh({
    "STATUS.md": themFm(goc.readFile("STATUS.md"), `blocked_if_skipped: "${CAU_CHAN}"`),
    [gpt.statusPath]: doiHang(goc.readFile(gpt.statusPath), 99)
  }));
  const v1Co = vungFx[0];
  assert.ok(v1Co.includes(`Chưa làm thì: ${CAU_CHAN}`), "co khai truong tuy chon thi PHAI ve dong phu");
  assert.equal([...v1Co.matchAll(/class="w">/g)].length, 1,
    "CHI don vi co khai moi co dong phu — ba don vi kia khong duoc moc them dong rong");
  assert.equal([...v1Co.matchAll(/<div class="dr">/g)].length, dangCho.length,
    "them truong tuy chon KHONG duoc lam mat hay moc them dong viec nao");

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

  /* --- (i) PHÉP THỬ CUỐI CỦA BRIEF, tự động hoá: bỏ hết `human_action` thì đơn vị phải RỜI
     vùng 1 và huy hiệu ở vùng 2 phải đổi từ CHỜ ĐỨC sang ĐANG CHẠY. --- */
  const xoaFm = (text, ten) => text.replace(new RegExp(`^${ten}:.*\\r?\\n`, "m"), "");
  const boHet = {};
  for (const r of rows) if (r.statusPath) boHet[r.statusPath] = xoaFm(goc.readFile(r.statusPath), "human_action");
  assert.ok(Object.keys(boHet).length >= 4, "phai bo duoc truong o it nhat bon ho so, neu khong thi (i) vo nghia");
  const vungTrong = vungCua(sinh(boHet));
  assert.equal(vungTrong.length, 4, "vung 1 trong thi tab VAN du bon vung");
  assert.ok(vungTrong[0].includes("Không có việc nào đang chờ Đức"),
    "vung trong LA mot thong tin — phai in ra mot dong, khong duoc an ca vung");
  /* KHỚP TRÊN HUY HIỆU, không khớp trên cả vùng: câu chú giải của vùng 2 có NHẮC chữ
     "CHỜ ĐỨC" để giải thích luật, nên `includes` trên cả vùng luôn đúng và khẳng định này
     sẽ không bao giờ đỏ. Bắt được đúng ở lượt chạy đầu — một xanh giả thật. */
  const huyHieu = (v) => [...v.matchAll(/class="badge b\d">([^<]+)</g)].map((m) => m[1]);
  assert.ok(!huyHieu(vungTrong[1]).includes("CHỜ ĐỨC"),
    "bo het truong thi khong con huy hieu CHO DUC nao o vung 2");
  assert.ok(huyHieu(vungTrong[1]).includes("ĐANG CHẠY"), "va don vi con song phai doi sang DANG CHAY");
  assert.ok(huyHieu(vung[1]).includes("CHỜ ĐỨC"),
    "va tren ho so THAT thi phai co huy hieu CHO DUC — neu khong thi khang dinh tren vo nghia");

  ok("tab AI dieu phoi: bon vung dung thu tu, vung 1 doc human_action, truong tuy chon vang thi khong ve gi, vung 2 xep theo hang, dau dong khoa con nguyen trong khoi gap, KHONG lo ten chu");
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
  const goc = createDefaultDeps(ROOT);
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
  const goc = createDefaultDeps(ROOT);
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
  /* HUY HIEU KHAC KHOA tuyệt đối KHÔNG được mang dấu — chúng là NỘI DUNG, lọc chúng khỏi phép
     so là làm cổng mất răng. Trước DASH-ORCH-V2 ca này dựng bằng dòng defect mang huy hiệu
     "MỞ"; từ khi mỗi đề bài không còn một dòng riêng thì dòng đó biến mất, nên khẳng định
     phải neo vào cái CÒN LẠI: huy hiệu trạng thái luồng ở vùng công việc. */
  const dongHuyHieuKhac = dong.filter((l) => /class="badge b\d">/.test(l)
    && !/<span class="badge b\d">(?:BẬN|MỞ)</.test(l));
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
  const soY = (danh) => bocFile(createDefaultDeps(ROOT), { "IDEAS.md": danh.join(G) });

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
  const trangThat = buildOverview(createDefaultDeps(ROOT)).html;
  const ideas = readIdeas(createDefaultDeps(ROOT));
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
 * `DASHBOARD.html` nằm trong khối `generators`, nên cổng so nó với HEAD MỖI PHIÊN và
 * `safe-push` từ chối đẩy khi lệch. Chủ vùng đổi liên tục (ngày 04/09 riêng `_code` đổi chủ
 * BỐN lần). Nên nếu tên chủ lọt vào trang thì bảng lệch HEAD ngay lượt nhận khoá kế tiếp, và
 * MỌI phiên bị chặn đẩy việc dù không một dữ liệu nào đổi. Đúng cái bẫy đã suýt xảy ra với
 * dòng "hôm nay / N ngày trước", vá bằng `today: "head"`.
 *
 * Bốn lượt sinh ở khối này (~9 giây một lượt, đo 03/09) — mỗi lượt dựng một ca hỏng khác
 * nhau, không lượt nào lặp lượt nào.
 */
{
  const goc = createDefaultDeps(ROOT);
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
  const dong = (s) => s.replace(/\r\n?/g, "\n").split("\n");
  const A = dong(trangThat);
  const B = dong(trangDoiChu);
  assert.equal(A.length, B.length, "doi chu vung khong duoc lam doi SO DONG cua trang");
  const lech = A.map((x, i) => (x === B[i] ? null : x)).filter(Boolean);
  assert.ok(lech.length > 0,
    "phai co it nhat mot dong lech — khong lech gi nghia la fixture khong toi duoc bo sinh");
  assert.ok(lech.every((x) => x.startsWith(KHOA_PREFIX)),
    "moi dong lech PHAI nam trong tap duoc mien; dong ngoai tap la mot lan chan push cho ca repo:\n  "
    + lech.filter((x) => !x.startsWith(KHOA_PREFIX)).slice(0, 3).join("\n  "));

  assert.ok(!trangThat.includes(CHU_GIA) && !trangDoiChu.includes(CHU_GIA),
    "ten chu vung tuyet doi khong duoc co mat tren trang, ke ca khi bang quyen dang khai no");

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

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

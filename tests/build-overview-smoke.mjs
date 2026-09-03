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
import { buildOverview, debtByUnit, humanWork, IDEA_STAGES, isDone, readBrief, readDecisions, readFeatures, readIdeas, shorten } from "../scripts/build-overview.mjs";

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
  assert.ok(stats.extensions > 0, "phai co it nhat mot extension");
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
  assert.equal(stats.stale, false, "0 ngay thi khong duoc bat co do");
  assert.match(html, /hôm nay/, "bang phai in hom nay");

  // Và vẫn phải đếm đúng khi thật sự đã cũ — nếu không thì phép kiểm trên là do luôn trả 0.
  const cu = buildOverview(deps, { today: Date.parse(headDate + "T20:00:00Z") + 8 * 86400000 });
  assert.equal(cu.stats.ageDays, 8, "qua 8 ngay thi phai dem ra 8");
  assert.equal(cu.stats.stale, true, "qua 7 ngay thi PHAI bat co do");
  ok("tuoi bang: 0 ngay trong ngay sinh, 8 ngay thi bat co do");
}

/* ---- 10. TAB — mỗi link ở bảng tổng phải có đích thật ---- */
{
  const { html } = buildOverview(createDefaultDeps(ROOT));
  const tabs = [...html.matchAll(/role="tab" data-tab="([a-z-]+)" aria-selected="(true|false)"/g)];
  const panes = [...html.matchAll(/role="tabpanel" data-pane="([a-z-]+)"/g)].map((m) => m[1]);
  assert.equal(tabs.length, 7, "phai co dung 7 tab");
  assert.equal(panes.length, 7, "moi tab phai co dung mot khung noi dung");
  assert.equal(tabs.filter((t) => t[2] === "true").length, 1, "dung MOT tab duoc chon san");
  assert.deepEqual(tabs.map((t) => t[1]).sort(), [...panes].sort(), "ten tab va ten khung phai khop");

  // Sáu khung sau phải mang `hidden`, nếu không thì mở trang ra là bảy khung chồng nhau —
  // đúng cái bệnh cuộn-quá-nhiều mà tab sinh ra để chữa.
  assert.equal([...html.matchAll(/role="tabpanel" data-pane="[a-z-]+" hidden/g)].length, 6,
    "sau khung con lai PHAI co hidden, khong thi bay khung chong nhau");

  // LINK CHẾT LÀ LỖI ÂM THẦM: Đức bấm, không có gì xảy ra, và không ai biết.
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
  const links = [...html.matchAll(/href="#([^"]+)" data-goto="([a-z-]+)"/g)];
  assert.ok(links.length >= 5, "bang tong phai co link sang chi tiet");
  for (const [, target, goto] of links) {
    assert.ok(ids.has(target), `link "#${target}" khong co dich tren trang — bam vao khong co gi xay ra`);
    assert.ok(panes.includes(goto), `link tro sang tab "${goto}" khong ton tai`);
  }
  ok(`7 tab, 6 khung an, va ca ${links.length} link o bang tong deu co dich that`);
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
  assert.ok(d.total > 100, "repo nay phai co tren 100 quyet dinh");
  assert.equal(d.top.length, 6, "lay dung so luong xin");
  // Tên lấy từ tên file là slug không dấu — Đức đọc không hiểu. Phải đọc tiêu đề trong file.
  assert.ok(d.top.some((x) => /[àáãạăâêôơưđýếệốồớủịùũọ]/i.test(x.name)),
    "ten quyet dinh phai co dau tieng Viet — lay tu tieu de trong file, khong suy tu ten file");
  assert.ok(d.top.every((x) => /^\d{4}$/.test(x.num)), "so hieu phai la 4 chu so");
  assert.ok(d.top.every((x) => x.where), "moi quyet dinh phai noi thuoc pham vi nao");
  ok(`nhat ky: ${d.total} quyet dinh, ten doc tu tieu de trong file nen co dau`);
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

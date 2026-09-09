/* BỘ ĐỌC CỦA BẢNG — phép kiểm phá.
 *
 * Năm tab mới đọc từ năm nguồn khác nhau, và mỗi nguồn là chữ do NGƯỜI viết vào một file
 * markdown. Nghĩa là mọi lỗi ở đây đều có chung một hình dạng: **bảng vẽ ra một con số trông
 * hợp lý, từ một cách đọc sai** — và không ai kiểm được bằng mắt vì con số nào cũng trông
 * giống nhau.
 *
 * Nên mỗi vế dưới đây dựng đúng một ca hỏng thật rồi đòi bộ đọc bắt được nó.
 *
 * BẢY ĐỘT BIẾN ĐÃ CHẠY THẬT cho hai vế cuối (07/09) — **cả bảy đều bị bắt**, không cái nào
 * sống sót lượt đầu. Ghi lại để lần sau ai nới hai vế đó thì biết chúng đang canh gì:
 *
 *  1. gộp `[~]` MỘT PHẦN vào `[x]` XONG            → vế 11 đỏ
 *  2. không có khối thì trả `0/0` thay vì `null`   → vế 11 đỏ
 *  3. lấy khối ĐẦU thay vì khối CUỐI               → vế 11 đỏ
 *  4. đọc không ra cổng thì đóng cứng `4747`       → vế 12 đỏ
 *  5. luôn vẽ cửa bảng sống, kể cả repo không có   → vế 12 đỏ
 *  6. chỉ in vế "F5 LÀ THẤY", bỏ vế ảnh chụp       → vế 12 đỏ
 *  7. bỏ mất NGÀY ĐO khỏi khối checklist           → vế 11 đỏ
 */

import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BAC, docChecklistTinhNang, khoangNgay, nguonLamMoi, noiTuoi, quetDauDuc, readBatBien,
  readCoChe, readIdeas, readKhoa, readNo
} from "../scripts/overview-doc.mjs";
import { khoiBaCau, khoiChecklist, khoiLamMoi, NHAN_KHOA, SO_CON_SONG, soSanhTrang, tenTrang } from "../scripts/build-overview.mjs";
import { nhomBangFrom } from "../scripts/repo-structure.mjs";

let passed = 0;
let boQua = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

/* BỎ QUA CÓ TÊN, không bỏ qua im lặng.
 *
 * Suite này ĐI THEO BẢN TRÍCH, nên nó chạy ở repo của người khác. Ba vế dưới đây đọc file thật
 * của repo — sổ ý tưởng, luật đa phiên, trang đã sinh — mà repo mới dựng chưa chắc có file nào
 * trong ba. Đo thật lúc phát bản 1.3.17: dựng một repo giả rồi chạy `npm test`, suite **chết**
 * ngay ở `IDEAS.md`.
 *
 * Bỏ qua thì được, nhưng phải IN RA TÊN. Một vế bỏ qua im lặng trông giống hệt một vế đã chạy
 * và xanh — và bảng thì luôn xanh. */
const boQuaVi = (ten, vi) => { boQua += 1; console.log(`  --  ${ten} — BỎ QUA: ${vi}`); };
const docNeuCo = (rel) => { try { return readFileSync(join(ROOT, rel), "utf8"); } catch { return null; } };
const NL = String.fromCharCode(10);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/* ---- 1. Bậc lạ phải NÉM, không được xếp vào thùng "khác" ----------------- */
{
  // Một bậc gõ sai mà lặng lẽ rơi vào "khác" là ý tưởng đó biến mất khỏi thanh tiến độ, và
  // biến mất im lặng — người viết vẫn thấy nó trong sổ, bảng thì không.
  assert.throws(() => readIdeas("## Y-01 · x" + NL + "- **bậc:** gần xong"), /BAC_LA/);
  assert.throws(() => readIdeas("## Y-01 · x" + NL + "- **việc kế:** y"), /THIEU_BAC/);
  for (const b of BAC) {
    const r = readIdeas("## Y-01 · x" + NL + `- **bậc:** ${b}`);
    assert.equal(r[0].bac, b);
  }
  ok("sổ ý tưởng: bậc lạ NÉM · thiếu bậc NÉM · bốn bậc hợp lệ đều nhận");
}

/* ---- 2. Trường lạ KHÔNG được rơi vào hư không ---------------------------- */
{
  // Ai viết thêm một dòng vào sổ thì dòng đó phải hiện lên bảng. Bảng im lặng nuốt chữ của
  // người viết là bảng dạy người ta thôi viết vào sổ.
  const r = readIdeas(["## Y-07 · x", "- **bậc:** ý tưởng", "- **rủi ro:** cao",
    "- **việc kế:** làm A", "", "**nguồn** — Đức nêu 04/09", "dòng tiếp"].join(NL));
  assert.deepEqual(r[0].extra, [["rủi ro", "cao"]], "trường lạ phải được giữ nguyên");
  assert.equal(r[0].viecKe, "làm A");
  assert.equal(r[0].khoi.length, 1);
  assert.deepEqual(r[0].khoi[0].than, ["Đức nêu 04/09", "dòng tiếp"], "khối văn xuôi phải gom đủ dòng");
  ok("sổ ý tưởng: trường lạ và văn xuôi đều giữ, không nuốt chữ");
}

/* ---- 3. Bộ đọc của bảng và của bản đồ việc phải khớp NHAU ---------------- */
{
  /* Hai lệnh cùng đọc `IDEAS.md`. Nhận dạng khác nhau thì sẽ có ngày một ý tưởng hiện ở chỗ
   * này mà không hiện ở chỗ kia, và không ai biết bên nào đúng. Vế này ghim đúng chỗ đó bằng
   * cách bắt cả hai đọc CÙNG một file thật. */
  const raw = docNeuCo("IDEAS.md");
  if (raw !== null) {
    const cuaBang = readIdeas(raw);
    assert.ok(cuaBang.length >= 1, "sổ ý tưởng có mà đọc ra rỗng — bộ đọc hỏng");
  }

  const wn = readFileSync(join(ROOT, "scripts", "what-next.mjs"), "utf8");
  const mWn = /const MA_Y = (\/[^\n]+\/);/.exec(wn);
  assert.ok(mWn, "what-next.mjs không còn hằng MA_Y — hai bộ đọc đã trôi khỏi nhau");
  const od = readFileSync(join(ROOT, "scripts", "overview-doc.mjs"), "utf8");
  const mOd = /const MUC_Y = (\/[^\n]+\/);/.exec(od);
  assert.ok(mOd, "overview-doc.mjs không còn hằng MUC_Y");
  assert.equal(mOd[1], mWn[1], "hai bộ đọc phải nhận dạng mã ý tưởng BẰNG NHAU:"
    + NL + "  bảng      : " + mOd[1] + NL + "  bản đồ việc: " + mWn[1]);
  ok("sổ ý tưởng: bảng và bản đồ việc nhận dạng mã BẰNG NHAU");
}

/* ---- 4. Dấu chờ người chốt: đúng hai loại, không nhận biến thể ----------- */
{
  const ra = quetDauDuc([
    "### KHUNG-11 · abc",
    "> `@Đức:chốt` — chọn một trong hai",
    "> @duc:bam nạp lại tiện ích",
    "Đức nói câu này nhưng không có dấu",
    "@Đức: chốt có khoảng trắng"
  ].join(NL), "BACKLOG.md");
  assert.equal(ra.length, 3);
  assert.deepEqual(ra.map((x) => x.loai), ["chot", "bam", "chot"]);
  assert.deepEqual(ra.map((x) => x.soDong), [2, 3, 5]);
  // Câu văn xuôi nhắc tới tên người chốt KHÔNG được thành một mục việc — nếu không thì danh
  // sách "cần Đức" đầy rác và người ta thôi đọc nó.
  assert.ok(!ra.some((x) => x.cau.includes("không có dấu")), "văn xuôi có tên người không phải là dấu");
  assert.ok(ra[0].cau.startsWith("KHUNG-11") === false, "câu phải là phần còn lại của DÒNG có dấu");
  ok("dấu chờ: hai loại · bỏ dấu tiếng Việt vẫn nhận · văn xuôi không thành việc");
}

/* ---- 5. Sổ nợ: dấu đóng phải ở ĐẦU mã, không dò giữa câu ----------------- */
{
  const ra = readNo([
    "### KHUNG-1 · còn mở",
    "### ~~KHUNG-2~~ · ĐÓNG 06/09 · đã vá",
    "### KHUNG-3 · gỡ khoá sau khi việc kia xong",
    "khong phai muc"
  ].join(NL));
  assert.equal(ra.length, 3);
  assert.deepEqual(ra.map((x) => x.dong), [false, true, false]);
  // Chữ "xong" giữa câu là một ĐIỀU KIỆN, không phải trạng thái. Đóng oan nó là bảng báo
  // THIẾU nợ — và một việc bị đếm thiếu thì biến mất, không ai đi tìm.
  assert.equal(ra[2].dong, false, "chữ xong giữa câu KHÔNG phải dấu đóng");
  ok("sổ nợ: chỉ gạch mã mới là đóng, không dò từ khoá giữa câu");
}

/* ---- 6. Bảng quyền: hỏng thì NÉM, và `_docs` không được bị nuốt ---------- */
{
  assert.throws(() => readKhoa("{ khong phai json"), /BANG_QUYEN_HONG/);
  assert.throws(() => readKhoa('{"a":1}'), /BANG_QUYEN_HONG/);
  const ds = readKhoa(JSON.stringify({
    _doc: "chú thích", _labels: "chú thích",
    claims: { _root: { owner: "ai-do" }, _docs: { owner: null }, _code: { owner: null } }
  }));
  // Bản đầu lọc `startsWith("_doc")` và nuốt luôn khoá vùng THẬT tên `_docs` — một vùng biến
  // mất khỏi bảng, im lặng. Bắt được ngay lượt chạy đầu trên dữ liệu thật.
  assert.deepEqual(ds.map((k) => k.khoa), ["_code", "_docs", "_root"], "_docs là khoá vùng thật, không phải chú thích");
  assert.equal(ds.filter((k) => k.owner).length, 1);
  ok("bảng quyền: hỏng thì NÉM · khoá `_docs` không bị nhầm là chú thích");
}

/* ---- 7. Đọc lại luật: cắt tới mục KẾ, và bắt được cả năm bất biến -------- */
{
  const luat = docNeuCo("docs/protocols/MULTIFLOW.md");
  if (luat === null) {
    boQuaVi("đọc lại luật đa phiên", "repo này chưa có docs/protocols/MULTIFLOW.md");
  } else {
  const cc = readCoChe(luat);
  const bb = readBatBien(luat);
  assert.ok(cc.length >= 3, "bốn cơ chế đọc ra " + cc.length + " — bộ đọc hỏng");
  // Bản đầu neo `$` vào cuối dòng, mà bất biến viết dạng `**① Câu.** rồi văn xuôi chạy tiếp` —
  // nên nó bắt được 0 cái và vẫn trả mảng rỗng LỄ PHÉP. Rỗng-mà-đúng và rỗng-vì-đọc-hỏng
  // trông giống hệt nhau trên bảng, nên chỗ này phải ghim bằng số.
  assert.equal(bb.length, 5, "phải đọc ra ĐỦ năm bất biến, đọc ra " + bb.length);
  assert.deepEqual(bb.map((b) => b.so), ["①", "②", "③", "④", "⑤"]);
  assert.ok(bb.every((b) => b.cau.length > 8), "mỗi bất biến phải có câu chốt, không rỗng");
  ok("đọc lại luật: bốn cơ chế · ĐỦ năm bất biến, không rỗng lễ phép");
  }
}

/* ---- 8. Tuổi: không đo được KHÁC bằng 0 --------------------------------- */
{
  assert.equal(khoangNgay("2026-09-06", "2026-09-01"), 5);
  assert.equal(khoangNgay("2026-09-06", "2026-09-06"), 0);
  assert.equal(khoangNgay("2026-09-01", "2026-09-06"), 0, "mốc sau nằm trước thì kẹp về 0, không âm");
  assert.equal(khoangNgay("hôm nọ", "2026-09-01"), null);
  // "Chưa đo được" và "treo 0 ngày" là hai câu khác nhau: câu thứ hai nói việc vừa nêu hôm nay,
  // câu thứ nhất nói bảng KHÔNG BIẾT. Gộp chúng là bảng khẳng định một thứ nó không biết.
  assert.notEqual(noiTuoi(null), noiTuoi(0));
  assert.match(noiTuoi(null), /chưa đo được/);
  ok("tuổi: không đo được là null, và null nói khác 0");
}

/* ---- 9. Dòng bảng quyền KHÔNG được làm trang lệch HEAD ------------------ */
{
  /* ĐO ĐƯỢC NGAY LƯỢT ĐẦU, và nó chặn cả repo: bảng chủ sở hữu đổi mỗi lần một phiên nhận hay
   * trả khoá — nhiều lần một ngày. Trang máy sinh nằm trong khối `generators`, nên cổng so nó
   * với HEAD mỗi phiên. Không có bộ lọc này thì **trả khoá xong là trang lệch**, và phiên tiếp
   * theo bị chặn đẩy vì một thứ nó không hề đụng tới.
   *
   * Vế này ghim CẢ HAI chiều. Chỉ ghim chiều "bỏ qua" thôi thì một bộ lọc bỏ qua TẤT CẢ cũng
   * xanh — và lúc đó trang đứng yên ở một quá khứ nào đó mà cổng vẫn báo sạch. */
  const goc = ["<h1>x</h1>", NHAN_KHOA + "<div>ai-mot ĐANG GIỮ</div>", "<p>chữ thường</p>"].join(NL);
  const doiKhoa = ["<h1>x</h1>", NHAN_KHOA + "<div>ai-hai KHÁC HẲN</div>", "<p>chữ thường</p>"].join(NL);
  const doiThuong = ["<h1>x</h1>", NHAN_KHOA + "<div>ai-mot ĐANG GIỮ</div>", "<p>chữ ĐÃ ĐỔI</p>"].join(NL);
  const themDong = goc + NL + "<p>dòng mới</p>";

  assert.equal(soSanhTrang(goc, doiKhoa), true, "đổi dòng bảng quyền KHÔNG được tính là trang cũ");
  assert.equal(soSanhTrang(goc, doiThuong), false, "đổi dòng thường PHẢI tính là trang cũ");
  assert.equal(soSanhTrang(goc, themDong), false, "thêm một dòng PHẢI tính là trang cũ");
  assert.equal(soSanhTrang(goc, goc), true);

  // Và trang thật phải THẬT SỰ mang nhãn — bộ lọc đúng mà không dòng nào đeo nhãn thì nó không
  // bảo vệ gì cả, chỉ trông như đang bảo vệ.
  // TÊN TRANG SUY TỪ CẤU HÌNH, không đóng cứng tên của repo nhà — suite này chạy ở repo khác.
  const html = docNeuCo(tenTrang(docNeuCo(".repo-structure.json")));
  if (html === null) {
    boQuaVi("trang thật có mang nhãn", "repo này chưa sinh trang lần nào (chạy: npm run overview)");
  } else {
    const soNhan = html.split(NL).filter((d) => d.trimStart().startsWith(NHAN_KHOA)).length;
    assert.ok(soNhan >= 3, "trang thật chỉ có " + soNhan + " dòng mang nhãn — khối bảng quyền chưa được đánh dấu");
    ok("dòng bảng quyền: bỏ qua ở phép SO, và trang thật có mang nhãn thật");
  }
}

/* ---- 10. Liên kết nhảy tab phải trỏ tới thứ CÓ THẬT ---------------------- */
{
  /* HỎNG IM LẶNG, và đã lọt thật một lần. Bản trước thêm liên kết `data-goto` vào khối ý tưởng
   * nhưng KHÔNG thêm đoạn JS xử lý nó — trình duyệt nhảy tới một id đang nằm trong tab BỊ ẨN,
   * nên không có gì xảy ra cả. Người bấm chỉ thấy trang không nhúc nhích, và không ai báo lỗi.
   *
   * Vế này bắt cả ba đường hỏng: liên kết trỏ tới tab không tồn tại · trỏ tới id không tồn tại ·
   * và trang không có đoạn JS để xử lý liên kết đó. */
  const html = docNeuCo(tenTrang(docNeuCo(".repo-structure.json")));
  if (html === null) {
    boQuaVi("liên kết nhảy tab", "repo này chưa sinh trang lần nào (chạy: npm run overview)");
  } else {
  const idCo = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const tabCo = new Set([...html.matchAll(/data-tab="([^"]+)"/g)].map((m) => m[1]));
  const tab2Co = new Set([...html.matchAll(/data-tab2="([^"]+)"/g)].map((m) => m[1]));

  const goto = [...html.matchAll(/href="#([^"]+)"\s+data-goto="([^"]+)"/g)];
  /* CHỈ ĐÒI CÓ LIÊN KẾT KHI CÓ THỨ ĐỂ LIÊN KẾT TỚI.
   *
   * Bản đầu đòi cứng `goto.length > 0`. Đúng ở repo nhà (có sổ ý tưởng nên có chín liên kết),
   * SAI ở repo vừa nhận bản phát: chưa có `IDEAS.md`, chưa có hồ sơ migrate, nên trang không có
   * liên kết nào — và đó là trạng thái HỢP LỆ. Bắt được lúc nâng repo `n8n-orchestrator` lên
   * 1.3.19; đọc lại code không thấy, chỉ chạy ở repo thật mới thấy.
   *
   * Điều kiện đúng là điều kiện CÓ ĐIỀU KIỆN: tab nào có mặt thì liên kết của tab đó phải có. */
  const coTabY = /data-tab="y-tuong"/.test(html);
  if (coTabY) {
    assert.ok(goto.length > 0, "trang CÓ tab Ý tưởng mà không có liên kết nhảy nào — khối ý tưởng đã mất?");
  }
  for (const [, dich, tab] of goto) {
    assert.ok(tabCo.has(tab), `liên kết nhảy tới tab "${tab}" mà tab đó không có trên trang`);
    assert.ok(idCo.has(dich), `liên kết nhảy tới id "${dich}" mà id đó không có trên trang`);
  }
  for (const t2 of tab2Co) {
    assert.ok(idCo.has(t2), `nút tab con "${t2}" không có khung nội dung nào mang id đó`);
  }
  const goto2 = [...html.matchAll(/data-goto2="([^"]+)"/g)].map((m) => m[1]);
  for (const g of goto2) assert.ok(tab2Co.has(g), `bảng trỏ tới tab con "${g}" mà không có nút nào`);

  // Và JS phải THẬT SỰ có đoạn xử lý. Không có nó thì mọi liên kết trên là chữ chết.
  assert.match(html, /data-goto\]/, "trang thiếu đoạn JS bắt liên kết nhảy tab");
  assert.match(html, /data-goto2\]/, "trang thiếu đoạn JS bắt liên kết nhảy tab con");
  ok(`liên kết nhảy tab: ${goto.length} liên kết + ${tab2Co.size} tab con đều trỏ tới thứ có thật`);
  }
}

/* ---- 11. Checklist tinh nang: CHUA DO khac THIEU ------------------------- */
{
  const khoi = [
    "## Checklist tính năng đã migrate — danh mục bản 1.3.31 · đo ngày 2026-09-07",
    "",
    "**F1 · Bảng trạng thái** — 2/3",
    "",
    "- [x] `F1.1` Bảng chính HTML *(từ bản 1.3.18)*",
    "- [~] `F1.2` Ba artifact máy đọc *(từ bản 1.0.0)* — thiếu: `npm run dashboard`",
    "- [x] `F1.4` Tab Migrate *(từ bản 1.3.20)*",
    "",
    "**F7 · Phát hành** — 0/0",
    "",
    "- [-] `F7.1` Bản trích tự sinh *(từ bản 1.0.0)*",
    "",
    "**Tổng: 2 xong · 1 một phần · 0 thiếu.**"
  ].join(NL);

  const r = docChecklistTinhNang(khoi);
  assert.equal(r.ban, "1.3.31");
  assert.equal(r.ngay, "2026-09-07");
  assert.equal(r.khoi.length, 2);
  assert.equal(r.xong + "/" + r.tong, "2/3");
  assert.deepEqual(r.dem, { xong: 2, "mot-phan": 1, thieu: 0, ngoai: 1 });

  // MOT PHAN KHAC THIEU, va khac DU. Ba trang thai phai la ba, khong duoc lam tron ve hai:
  // mot muc `[~]` bi doc thanh `[x]` la bang bao xong mot thu dang hong o cho khong ai nhin.
  const mp = r.khoi[0].muc.find((m) => m.ma === "F1.2");
  assert.equal(mp.trang, "mot-phan");
  assert.equal(mp.thieu, "npm run dashboard");
  assert.equal(mp.tuBan, "1.0.0");
  assert.ok(!/từ bản/.test(mp.ten) && !/thiếu/.test(mp.ten), "tên mục còn dính phần phụ");

  // KHONG CO KHOI => null, va bang phai noi CHUA DO. `null` bi lam tron thanh 0/0 la bang
  // bao mot repo khong co tinh nang nao — trong khi that ra ho so chua tung do.
  assert.equal(docChecklistTinhNang("## Trạng thái" + NL + "Xong hết."), null);
  const hChua = khoiChecklist(null);
  assert.match(hChua, /chưa đo/, "khối rỗng phải nói CHƯA ĐO");
  assert.doesNotMatch(hChua, /0\/0|thiếu tính năng nào<\/h/, "khối rỗng không được hoá con số");

  // KHOI CUOI thang, khong phai khoi dau: ho so migrate la vung CHI THEM.
  const hai = khoi + NL + NL + khoi
    .replace("bản 1.3.31", "bản 1.4.0").replace("2026-09-07", "2026-10-01");
  assert.equal(docChecklistTinhNang(hai).ban, "1.4.0", "phải lấy lần đo MỚI NHẤT");
  assert.equal(docChecklistTinhNang(hai).ngay, "2026-10-01");

  // Bang phai IN RA ngay do va ban danh muc — Duc doi dung hai con so nay 07/09.
  const h = khoiChecklist(r);
  assert.match(h, /1\.3\.31/);
  assert.match(h, /2026-09-07/);
  assert.match(h, /F1\.2/, "mục một phần phải hiện ra, không bị gập");
  ok("checklist tính năng: ba trạng thái tách nhau · chưa đo khác thiếu · lấy khối cuối · in ngày+bản");
}

/* ---- 12. O lam moi: F5 CO va F5 KHONG khong duoc noi gop ----------------- */
{
  const lenhDay = [["overview", "node scripts/build-overview.mjs"], ["bang-song:may-chu", "node bang-song/may-chu.mjs"]];
  const co = nguonLamMoi({ tenBang: "DASHBOARD-X.html", lenh: lenhDay, maMayChu: "export const CONG_MAC_DINH = 4747;" });
  assert.equal(co.anhChup.f5, false, "bản đã commit thì F5 KHÔNG đổi số");
  assert.equal(co.song.f5, true, "bản sống thì F5 LÀ THẤY");
  assert.equal(co.song.cong, 4747);
  assert.equal(co.song.url, "http://127.0.0.1:4747/");

  // Repo KHONG co bang song thi khong duoc ve mot cua khong ton tai: bang day nguoi ta go
  // mot lenh chay khong duoc la bang tu ha do tin cay cua chinh no.
  const khong = nguonLamMoi({ tenBang: "B.html", lenh: [["overview", "x"]], maMayChu: null });
  assert.equal(khong.song, null);
  const hK = khoiLamMoi(khong);
  assert.match(hK, /chưa có bảng SỐNG/);
  assert.doesNotMatch(hK, /bang-song\\\\|127\.0\.0\.1/, "repo không có bảng sống không được in cửa của nó");

  // CONG DOC TU MA NGUON, khong dong cung. Cong doc khong ra thi noi thang la doc luc chay —
  // dong cung mot con so la dan nguoi xem toi bang CUA REPO KHAC khi may chu nhay cong.
  const mu = nguonLamMoi({ tenBang: "B.html", lenh: lenhDay, maMayChu: "// khong khai cong o day" });
  assert.equal(mu.song.cong, null);
  assert.equal(mu.song.url, null);
  assert.match(khoiLamMoi(mu), /in ra lúc chạy/);

  // Ca hai cau tra loi phai co mat CUNG MOT CHO. Chi in mot ve la day sai mot nua.
  const hCo = khoiLamMoi(co);
  assert.match(hCo, /F5 LÀ THẤY/);
  assert.match(hCo, /F5 KHÔNG ĐỔI SỐ/);
  assert.ok((hCo.match(/data-cp="/g) || []).length >= 4, "phải có nút COPY cho từng thứ copy được");
  ok("ô làm mới: hai câu trả lời cùng một chỗ · cổng đọc từ mã · repo không có bảng sống thì im");
}

/* ---- 13. LICH SU KHONG BAO GIO THANH VIEC -------------------------------
 *
 * Do 07/09: bang noi HAI con so khac nhau cho cung mot cau hoi "Duc can lam gi" — tab dau noi
 * "bon muc", tab AI dieu phoi noi "13 viec". Tim ra nguyen nhan: nguon quet dau cho co
 * `HANDOFF.md`, ma `HANDOFF.md` la nhat ky CHI THEM DONG. Moi lan mot phien KE LAI rang co viec
 * cho Duc thi lan ke do thanh mot viec moi, VINH VIEN — 8 trong 13 dau la ao, va mot trong tam
 * dau ao nam trong chinh cau giai thich quy uoc dau.
 *
 * Ve nay ghim ca hai chieu: nhat ky KHONG duoc trong danh sach, va so con song PHAI trong.
 */
{
  // 1. Nhat ky KHONG duoc la nguon sinh viec. Day la ve chinh.
  assert.ok(!SO_CON_SONG.includes("HANDOFF.md"),
    "HANDOFF.md la nhat ky CHI THEM — quet no tim dau viec thi moi lan ke lai thanh mot viec moi");
  for (const f of SO_CON_SONG) {
    assert.doesNotMatch(f, /HANDOFF|CHANGELOG|archive/i,
      `"${f}" la so lich su, khong duoc sinh ra viec`);
  }
  // 2. Va so CON SONG phai co mat — cat qua tay thi bang thanh mu, cung te.
  for (const f of ["BACKLOG.md", "IDEAS.md", "STATUS.md"]) {
    assert.ok(SO_CON_SONG.includes(f), `so con song thieu ${f} — bang se khong thay viec that`);
  }
  ok(`lịch sử không thành việc: ${SO_CON_SONG.length} sổ còn sống, nhật ký bị loại`);
}

/* ---- 14. TONG QUAN dung BA CAU, va hai cau sau MAY DEM ------------------
 *
 * Duc chot 07/09: "Homepage chi giu 3 cau". Ba, khong phai bon — va khong phai ba cau CONG mot
 * bang. Ve nay dem so hang that trong HTML, khong dem loi hua trong chu thich.
 */
{
  const dl = {
    st: { current_focus: "\"dang lam mot viec\"", human_action: "\"CO — bon muc\"" },
    canDuc: [{ loai: "bam", cau: "x" }, { loai: "chot", cau: "y" }, { loai: "chot", cau: "z" }],
    khoa: [{ khoa: "_root", owner: "lane-a" }, { khoa: "_docs", owner: null }],
    so: [{ so: 0, nhan: "tài liệu quá hạn" }, { so: 3, nhan: "nợ cấu trúc" }, { so: 0, nhan: "việc lớn" }],
    noMo: [1, 2, 3, 4, 5],
    tenNguoi: "Đức"
  };
  const h = khoiBaCau(dl);
  /* Dem theo `data-cau`, KHONG theo `<div class="bc">`.
   *
   * Ban dau ve nay dem chuoi `<div class="bc">` — va no vo ngay hom do, luc khoi ba cau duoc
   * them thuoc tinh `data-cau`/`data-den`: the mo khong con dong y het chuoi nua nen dem ra 0,
   * va phep kiem bao "dang 0 cau" trong khi trang co du ba. Mot phep ghim neo vao HINH DANG
   * THE HTML thi moi lan them mot thuoc tinh la no vo, va no vo voi mot cau loi noi sai
   * nguyen nhan. Neo vao khoa may doc thi khong. */
  const hang = [...h.matchAll(/<div class="bc" data-cau="/g)].length;
  assert.equal(hang, 3, `Tổng quan phải đúng BA câu, đang ${hang}`);
  assert.equal([...h.matchAll(/<table/g)].length, 0, "ba câu KHÔNG được kèm bảng");
  assert.equal([...h.matchAll(/class="luoi"|class="sk"|class="nn"/g)].length, 0,
    "ba câu KHÔNG được kèm lưới ô đếm — đó là bản vẽ lại của thứ đã có chỗ canonical");

  // Cau 2 phai la SO MAY DEM, khong phai chu go tay trong `human_action`.
  assert.match(h, /3 việc đang chờ/, "câu 2 phải đếm từ canDuc");
  assert.doesNotMatch(h, /CO — bon muc/, "câu 2 KHÔNG được lấy chữ gõ tay ở human_action");

  // Cau 3: `null` la KHONG DO DUOC, va no phai NANG hon mot con so duong.
  const hHong = khoiBaCau({ ...dl, so: [{ so: null, nhan: "nợ cấu trúc" }, { so: 9, nhan: "tài liệu quá hạn" }] });
  assert.match(hHong, /KHÔNG ĐO ĐƯỢC/, "phép đo chết phải nói ra là chết");
  assert.match(hHong, /đáng ngờ/, "phép đo chết phải nói mọi số cạnh nó đáng ngờ");
  assert.match(hHong, /cham do/, "phép đo chết → đèn đỏ");

  // Sach thi noi sach, va khong duoc noi sach khi con no chan.
  const hSach = khoiBaCau({ ...dl, so: [{ so: 0, nhan: "a" }, { so: 0, nhan: "b" }], noMo: [] });
  assert.match(hSach, /Không chỗ nào đang chặn/);
  assert.doesNotMatch(hSach, /cham do/, "sạch thì không được bật đèn đỏ");

  // Moi cau phai co MOT lien ket sang cho canonical — tom tat ma khong dan duoc di thi
  // nguoi doc phai tu di tim, va luc do bang lai thanh mot cho nua phai doc.
  assert.equal([...h.matchAll(/data-goto="/g)].length, 3, "mỗi câu phải có đúng một liên kết");
  ok("Tổng quan: đúng 3 câu · không bảng không lưới · hai câu sau máy đếm · mỗi câu một liên kết");
}

/* ---- 15. MOT KHAI NIEM MOT CHO -------------------------------------------
 *
 * Do 07/09 tren ban da commit: ban do file ve BA lan; "Can Duc" · "Suc khoe" · "Y tuong" ·
 * "Giao viec" · "Lam moi bang" moi thu ve HAI lan — va khong lan nao la tom tat, deu la ban ve
 * DAY DU. Hau qua khong phai la dai: hau qua la bang noi hai con so khac nhau.
 *
 * LO DA BIET cua ve nay, ghi ADR-0006: no dem TIEU DE khoi. Doi ten tieu de la lach duoc.
 * Chua co cach nao may chan viec ai do ve lai cung noi dung duoi mot cai ten khac.
 */
{
  const trang = join(ROOT, tenTrang(readFileSync(join(ROOT, ".repo-structure.json"), "utf8")));
  let html = null;
  try { html = readFileSync(trang, "utf8"); } catch { html = null; }
  if (html === null) {
    boQua += 1;
    console.log("  --  một khái niệm một chỗ — BỎ QUA: repo này chưa sinh trang lần nào (chạy: npm run overview)");
  } else {
  const dem = (re) => [...html.matchAll(re)].length;
  const canonical = [
    ["Cần <người chốt>", /<h2>Cần [^<]*— \d+ việc/g],
    ["Sức khoẻ", /<h2>Sức khoẻ/g],
    ["Sổ ý tưởng", /<h2>Sổ ý tưởng/g],
    ["Bản đồ file", /<th>Khi bạn sắp/g],
    ["Làm mới bảng", /<h2>Làm mới bảng/g],
    ["Bảng quyết định", /<th>Quyết định<\/th>/g],
    ["Lệnh chạy được", /Lệnh chạy được — \d+ lệnh/g],
    ["Giao việc ba lệnh", /npm run giao-viec -- --viec nang/g]
  ];
  const lap = canonical.filter(([, re]) => dem(re) > 1).map(([t, re]) => `${t} (${dem(re)} lần)`);
  assert.deepEqual(lap, [],
    `mỗi khái niệm chỉ được vẽ ĐẦY ĐỦ một chỗ; chỗ khác chỉ tóm tắt + liên kết. Đang lặp: ${lap.join(" · ")}`);

  /* NĂM nhóm từ 08/09 — ADR-0007 bổ sung ADR-0006 (tab Migrate tách riêng).
   *
   * BẢN THỨ HAI CỦA CÙNG MỘT LUẬT, và đó là chỗ đáng ghi hơn con số. Danh sách nhóm bị khẳng
   * định ở HAI file: `overview-smoke.mjs` và đây. Tôi sửa bản kia rồi tưởng xong; cổng đỏ thêm
   * một vòng 9 phút chỉ để tìm ra bản này. Cùng bệnh một-luật-hai-chỗ mà repo này đã gặp:
   * `append_only_exempt` từng gõ cứng ở hai script và trả hai câu khác nhau cho cùng một file.
   *
   * ĐÃ GỘP 08/09 — KHUNG-46. Hợp đồng nay nằm ở khối `bang.nhom` của `.repo-structure.json`,
   * và cả hai suite đọc từ đó. Thêm một tab vào bộ sinh làm CẢ HAI đỏ cùng lúc; đổi số nhóm
   * là phải sửa hợp đồng có chủ ý, kèm một ADR. */
  const nhom = [...new Set([...html.matchAll(/data-tab="([a-z-]+)"/g)].map((m) => m[1]))];
  const KHAI = nhomBangFrom(JSON.parse(readFileSync(join(ROOT, ".repo-structure.json"), "utf8")));
  if (!KHAI) {
    boQuaVi("danh sách nhóm của bảng", "repo này chưa khai khối `bang.nhom` trong .repo-structure.json");
  } else {
    assert.deepEqual(nhom.sort(), [...KHAI].sort(),
      `bảng phải có đúng các nhóm khai ở bang.nhom (ADR-0006 + ADR-0007), đang có: ${nhom.join(" ")}`);
  }

  // Khong lien ket chet: moi `data-goto` phai tro toi mot nhom CO THAT.
  const di = [...new Set([...html.matchAll(/data-goto="([a-z-]+)"/g)].map((m) => m[1]))];
  const chet = di.filter((g) => !nhom.includes(g));
  assert.deepEqual(chet, [], `liên kết trỏ tới nhóm không tồn tại: ${chet.join(" ")}`);
  ok(`một khái niệm một chỗ: ${canonical.length} khái niệm đều vẽ đúng 1 lần · 4 nhóm · 0 liên kết chết`);
  }
}

/* ---- 16. Không ai được GÕ CỨNG LẠI danh sách nhóm vào `tests/` ----------- */
{
  /* PHÉP GHIM CỦA CHÍNH BẢN VÁ KHUNG-46, và nó canh thứ mà bản vá không tự canh được.
   *
   * Gộp về một nguồn chỉ sửa được TRẠNG THÁI hôm nay. Cái đã gây ra bệnh là một THÓI QUEN:
   * lần sau ai cần danh sách nhóm sẽ gõ lại năm chuỗi cho nhanh, và bản sao thứ hai mọc lại
   * — lần này im lặng, vì cả hai bản đều đang đúng vào ngày nó mọc. Đo 08/09: hai bản sao
   * sống chung nhiều ngày, chỉ lộ ra lúc chúng lệch nhau.
   *
   * Nên vế này không hỏi "danh sách có đúng không" mà hỏi "có ai chép nó lại không".
   * Ngưỡng là HAI mã nhóm trên MỘT dòng: một mã là đang nói về một tab cụ thể (hợp lệ, ví dụ
   * `id="tab-tong-quan"`); hai mã trở lên trên cùng một dòng thì đó là một bản sao của DANH
   * SÁCH. Đọc ngưỡng này từ hợp đồng, không gõ cứng — chính là điều nó đang bắt người khác làm.
   *
   * KHỚP NGUYÊN MÃ, KHÔNG KHỚP CHUỖI CON — vế này bắt oan ngay lượt chạy đầu vì thế: dòng
   * `assert.ok(!/id="so-migrate"/.test(T["cong-viec"]))` bị đếm là hai mã, do "so-migrate"
   * chứa "migrate". Nên hai bên mã phải KHÔNG phải chữ thường hay gạch nối. */
  const KHAI = nhomBangFrom(JSON.parse(readFileSync(join(ROOT, ".repo-structure.json"), "utf8")));
  if (!KHAI) {
    boQuaVi("cấm gõ cứng lại danh sách nhóm", "repo này chưa khai khối `bang.nhom`");
  } else {
    const thuMuc = join(ROOT, "tests");
    const phamLuat = [];
    for (const ten of readdirSync(thuMuc).filter((f) => f.endsWith(".mjs"))) {
      const dong = readFileSync(join(thuMuc, ten), "utf8").split(/\r?\n/);
      dong.forEach((d, i) => {
        const thay = KHAI.filter((n) => new RegExp(`(?<![a-z-])${n}(?![a-z-])`).test(d));
        if (thay.length >= 2) phamLuat.push(`${ten}:${i + 1} (${thay.join(" ")})`);
      });
    }
    assert.deepEqual(phamLuat, [],
      "danh sách nhóm chỉ được khai ở `bang.nhom` của .repo-structure.json. " +
      `Đang có bản sao trong tests/: ${phamLuat.join(" · ")}`);
    ok(`không bản sao nào của danh sách nhóm trong tests/ (${KHAI.length} mã, quét ${readdirSync(thuMuc).filter((f) => f.endsWith(".mjs")).length} file)`);
  }

  /* Bộ đọc hợp đồng phải FAIL-CLOSED. Hai cửa dưới đây là hai cách hợp đồng hỏng mà phép so
   * sánh ở trên KHÔNG bắt được, vì nó so theo TẬP đã sắp xếp:
   *   · mảng rỗng  → so với tập rỗng, đạt tầm thường với một bảng KHÔNG CÓ TAB NÀO
   *   · mã trùng   → tập vẫn khớp trong khi hợp đồng thiếu một tab
   * Còn `null` khi chưa khai thì KHÔNG phải lỗi: repo mới migrate chưa có khối này. */
  assert.equal(nhomBangFrom({}), null, "chưa khai `bang` thì trả null, không ném — repo mới không được đỏ oan");
  assert.equal(nhomBangFrom({ bang: {} }), null, "khai `bang` mà thiếu `nhom` thì cũng là chưa khai");
  assert.throws(() => nhomBangFrom({ bang: { nhom: [] } }), /CAU_TRUC_HONG/, "mảng rỗng phải NÉM");
  assert.throws(() => nhomBangFrom({ bang: { nhom: ["a", "a"] } }), /CAU_TRUC_HONG/, "mã trùng phải NÉM");
  assert.throws(() => nhomBangFrom({ bang: { nhom: ["Tong Quan"] } }), /CAU_TRUC_HONG/, "mã không khớp data-tab phải NÉM");
  assert.throws(() => nhomBangFrom({ bang: [] }), /CAU_TRUC_HONG/, "`bang` là mảng phải NÉM");
  ok("bộ đọc hợp đồng fail-closed: 4 cửa NÉM · 2 cửa trả null có chủ ý");
}

/* ---- Sổ nợ: đọc được MỨC ƯU TIÊN, và mã việc không mất tiêu đề --------- */
{
  /* Đức nêu 09/09: *"tôi tìm khung 30, 40, 53 trong dashboard nhưng rất mơ hồ"*. Đo lại: bảng
   * có hai CON SỐ của sổ nợ và một đoạn giải thích cách đếm, nhưng **không liệt kê mục nào** —
   * `KHUNG-53` xuất hiện 0 lần trên cả trang dù nó đang mở. Nay bảng liệt kê, và danh sách đó
   * cần mức ưu tiên: 25 dòng không xếp hạng thì người đọc vẫn phải mở sổ ra tra từng cái.
   *
   * `P?` là ca THẬT, không phải ca lý thuyết: mục nằm trước mọi tiêu đề nhóm. **Không biết**
   * khác **không quan trọng**, nên nó phải có mã riêng chứ không được gán bừa vào P3. */
  const so = readNo([
    "### KHUNG-9 · truoc moi nhom",
    "## P1",
    "### KHUNG-1 · mot",
    "### ~~KHUNG-2~~ · da dong",
    "## P2",
    "### KHUNG-3 · ba @Duc:chot",
  ].join(NL));
  assert.deepEqual(so.map((x) => [x.ma, x.uuTien, x.dong]), [
    ["KHUNG-9", "P?", false],
    ["KHUNG-1", "P1", false],
    ["KHUNG-2", "P1", true],
    ["KHUNG-3", "P2", false],
  ], "moi muc phai mang muc uu tien cua nhom dung tren no");
  assert.equal(so.find((x) => x.ma === "KHUNG-3").choChot, true, "dau @Duc: phai bat co cho chot");
  assert.equal(so.find((x) => x.ma === "KHUNG-1").choChot, false);
  assert.equal(so.find((x) => x.ma === "KHUNG-1").ten, "mot", "tieu de khong duoc mat");

  /* BYTE ĐIỀU KHIỂN THÔ TRONG MÃ NGUỒN — vế này canh một cái bẫy đã cắn HAI LẦN ở repo này.
   *
   * 08/09: byte NUL lọt vào `chay-test.mjs`, git coi file là nhị phân nên bộ quét secret bỏ qua
   * nó. 09/09: byte BACKSPACE (0x08) lọt vào chính `UU_TIEN_NO` ở đây, vì regex được dựng bằng
   * một chuỗi Python và `\b` là escape HỢP LỆ của Python. Hậu quả: regex không khớp gì, mọi mục
   * mang `P?`, và **không phép kiểm nào đỏ** — nó hỏng im lặng, đúng kiểu tệ nhất.
   *
   * Cả hai lần đều chỉ lộ ra vì một phép kiểm KHÁC đếm sai một đơn vị. Nên đây là vế đếm thẳng. */
  const nguonDoc = readFileSync(join(ROOT, "scripts", "overview-doc.mjs"), "utf8");
  const byteLa = [...nguonDoc].filter((c) => {
    const m = c.charCodeAt(0);
    return m < 32 && m !== 9 && m !== 10 && m !== 13;
  });
  assert.deepEqual(byteLa.map((c) => c.charCodeAt(0)), [],
    "khong duoc co byte dieu khien tho trong ma nguon — dung tra ve: dung regex literal, dung dung chuoi Python de dung regex");
  ok(`sổ nợ: mức ưu tiên theo nhóm · P? cho mục ngoài nhóm · cờ chờ-chốt · 0 byte điều khiển thô`);
}

console.log(`overview-doc-smoke: ${passed} vế xanh` + (boQua ? ` · ${boQua} vế BỎ QUA (kể tên ở trên)` : ""));

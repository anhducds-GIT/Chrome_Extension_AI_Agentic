/* Phép ghim cho `scripts/backlog-check.mjs` — N-01.
 *
 * Phép quan trọng nhất là phép CUỐI: `package.json` phải còn gọi bộ kiểm này. Trước 06/09 luật
 * "mỗi mục `## N-xx` phải khai `đóng khi:`" sống bằng một dòng `node -e` nhét trong `scripts.test`
 * và **không có gì canh chính dòng đó** — xoá nó đi là luật biến mất trong im lặng, mọi test vẫn
 * xanh. Ghim một mình bộ kiểm là chưa đủ: một bộ kiểm không ai gọi thì cũng chỉ là bình luận.
 *
 * Ghim CẢ HAI CHIỀU (luật vàng 2): thiếu trường thì ĐỎ · đủ trường thì XANH. Chiều "đủ thì xanh"
 * không thừa — một bộ kiểm luôn đỏ sẽ bị người ta gỡ khỏi cổng trong vòng một ngày.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { dangMo, docMuc, docMucDaGo, DONG_DOI_MA, kiemSo, thieuDongKhi, trungMa, TRUONG_DONG_KHI } from "../scripts/backlog-check.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BO_KIEM = path.join(ROOT, "scripts", "backlog-check.mjs");
let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };

const so = (...dong) => dong.join("\n");
const muc = (ma, dongKhi) => so(
  `## ${ma} · một câu nói vấn đề`,
  "",
  dongKhi === null ? "- **mở:** 2026-09-06 · lane `x`" : `${TRUONG_DONG_KHI} ${dongKhi}`,
  "- **vùng:** `_code`",
  ""
);

/* ---- 1. Chiều ĐỎ: một mục thiếu `đóng khi:` thì phải kêu tên đúng mục đó ---- */
{
  const text = so(muc("N-01", "lệnh: node tests/x.mjs xanh"), muc("N-02", null), muc("N-03", "đức: chốt có làm không"));
  assert.deepEqual(thieuDongKhi(text), ["N-02"], "phai keu dung ten muc thieu, khong keu ca so");
  assert.equal(kiemSo(text).tong, 3, "dem du ba muc");
  ok("thieu truong dong-khi: keu dung N-02, khong bao oan N-01/N-03");
}

/* ---- 2. Trường có mặt nhưng BỎ TRỐNG cũng là chưa khai ---- */
{
  const trong = so(`## N-04 · việc gì đó`, `${TRUONG_DONG_KHI}   `, "- **vùng:** `_root`");
  assert.deepEqual(thieuDongKhi(trong), ["N-04"],
    "truong rong trong nhu da khai voi may dem dong, nhung voi mat nguoi thi no khong noi gi");
  ok("truong dong-khi bo trong van tinh la chua khai");
}

/* ---- 3. Chiều XANH: đủ trường thì không kêu ai ---- */
{
  const text = so(muc("N-01", "lệnh: node tests/x.mjs xanh"), muc("N-02", "đức: chốt có cần bảng đếm không"));
  assert.deepEqual(thieuDongKhi(text), [], "du truong thi khong duoc bao oan");
  ok("du truong dong-khi: khong bao oan mot muc nao");
}

/* ---- 4. Chỉ soi `## N-`. Mục `## Y-` và bản mẫu `## N-xx` được miễn ----
 *
 * 14 mục `Y-` chuyển từ `IDEAS.md` ra đời TRƯỚC luật này, và sửa chúng là sửa chữ của phiên
 * khác. Bản mẫu trong khối mã viết `## N-xx` — không phải số, nên nó rơi ra ngoài. */
{
  const text = so(
    "## Y-03 · mục chuyển từ sổ ý tưởng, không khai đóng khi",
    "## N-xx · <bản mẫu trong khối mã>",
    "## N-99 · một mục thật",
    `${TRUONG_DONG_KHI} lệnh: node tests/x.mjs xanh`
  );
  assert.deepEqual(docMuc(text).map((m) => m.ma), ["N-99"], "chi soi ## N-<so>, bo qua Y- va ban mau N-xx");
  assert.deepEqual(thieuDongKhi(text), [], "Y-03 khong khai ma van phai xanh — no duoc mien");
  ok("mien muc Y- va ban mau N-xx, chi soi ## N-<so>");
}

/* ---- 5. Tiêu đề THIẾU dấu phân cách vẫn bị soi ----
 *
 * Bản cũ cắt bằng `\n## N-[0-9]`, tức nhận mọi tiêu đề `## N-<số>`. Đòi thêm dấu `·` là làm
 * phép kiểm hở ra: một mục viết thiếu dấu sẽ lọt qua mà không ai biết. */
{
  const text = so("## N-07 khong co dau cham giua", "- **vùng:** `_code`");
  assert.deepEqual(thieuDongKhi(text), ["N-07"], "thieu dau phan cach thi VAN bi soi, khong duoc lot");
  ok("tieu de thieu dau phan cach van bi soi — phep kiem khong ho ra");
}

/* ---- 6. Chạy thật: mã thoát 1 khi thiếu, 0 khi đủ ----
 *
 * Cổng đóng phiên đọc MÃ THOÁT, không đọc chữ in ra. Một bộ kiểm in "thiếu 2 mục" rồi thoát 0
 * là một bộ kiểm không chặn gì cả. */
{
  const thu = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-check-"));
  const chay = (text) => {
    const f = path.join(thu, "BACKLOG.md");
    fs.writeFileSync(f, text, "utf8");
    try {
      execFileSync(process.execPath, [BO_KIEM, f], { encoding: "utf8", stdio: "pipe" });
      return 0;
    } catch (e) { return e.status; }
  };
  assert.equal(chay(so(muc("N-01", "lệnh: node tests/x.mjs xanh"))), 0, "du truong thi ma thoat 0");
  assert.equal(chay(so(muc("N-01", null))), 1, "thieu truong thi ma thoat 1 — neu khong thi cong khong chan gi");
  fs.rmSync(thu, { recursive: true, force: true });
  ok("ma thoat: 0 khi du, 1 khi thieu");
}

/* ---- 7. Sổ THẬT ở gốc repo phải xanh ---- */
{
  const { tong, thieu, trung } = kiemSo(fs.readFileSync(path.join(ROOT, "BACKLOG.md"), "utf8"));
  assert.ok(tong >= 3, `so that phai co it nhat 3 muc N-, dem duoc ${tong}`);
  assert.deepEqual(thieu, [], `so that dang thieu truong dong-khi o: ${thieu.join(" ")}`);
  assert.deepEqual(trung, [], `so that dang co ma bi trung o: ${trung.map((t) => t.ma).join(" ")}`);
  ok(`so that o goc repo: ${tong} muc N-, khong muc nao thieu truong dong-khi, khong ma nao trung`);
}

/* ---- 8. `package.json` PHẢI còn gọi bộ kiểm này ----
 *
 * Đây là phép ghim mà N-01 sinh ra để đòi. Không có nó thì gỡ bộ kiểm khỏi cổng là một luật
 * biến mất trong im lặng — chính xác cái đã xảy ra được mô tả trong sổ nợ. */
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  const GOI = "scripts/backlog-check.mjs";
  assert.ok(String(pkg.scripts.test).includes(GOI),
    "scripts.test phai con goi backlog-check.mjs — go no ra la luat bien mat trong im lang");
  assert.ok(String(pkg.scripts["test:backlog"] ?? "").includes(GOI),
    "scripts.test:backlog phai goi backlog-check.mjs, khong duoc giu ban sao thu hai cua cung mot luat");
  assert.ok(String(pkg.scripts.test).includes("tests/backlog-check-smoke.mjs"),
    "scripts.test phai chay ca phep ghim nay — mot phep ghim khong ai chay thi cung chi la binh luan");
  ok("package.json con goi bo kiem VA phep ghim cua no");
}

/* ---- 9. TRÙNG MÃ — N-12 --------------------------------------------------
 *
 * Ca thật HAI LẦN TRONG MỘT NGÀY (06/09): hai lane cùng chọn `N-08`, rồi hai lane cùng chọn
 * `N-13`. Sổ miễn khoá không có ai cấp số, nên chuyện này còn xảy ra; bộ kiểm phải ĐỎ.
 *
 * GHIM CẢ HAI CHIỀU: trùng thì đỏ · không trùng thì không được báo oan. Và ghim cả CỬA RA —
 * một cái chặn mà người bị chặn không có quyền gỡ thì nó tệ hơn không chặn. */
{
  const hai = so(muc("N-01", "lệnh: x"), muc("N-02", "lệnh: y"), muc("N-01", "lệnh: z"));
  assert.deepEqual(trungMa(hai).map((t) => t.ma), ["N-01"], "hai khoi cung ma thi phai keu dung ma do");
  assert.deepEqual(trungMa(so(muc("N-01", "lệnh: x"), muc("N-02", "lệnh: y"))), [],
    "khong trung thi khong duoc bao oan");
  assert.equal(trungMa(hai)[0].lan, 2, "phai noi ro co may khoi cung mang ma do");
  ok("N-12 · hai khoi cung ma thi keu dung ma do, khong trung thi khong bao oan");
}

/* ---- 10. CỬA RA CHỈ LÀ MỘT DÒNG THÊM Ở CUỐI ---- */
{
  const hai = so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: z"));
  const daGo = hai + DONG_DOI_MA + " N-01 " + String.fromCharCode(8594) + " N-09** · 2026-09-07 · lane `x` · khoi thu hai doc la N-09";
  assert.deepEqual(trungMa(daGo), [], "mot dong doi ma o cuoi phai go duoc mot luot trung");
  assert.deepEqual(docMucDaGo(daGo).map((m) => m.ma), ["N-01", "N-09"],
    "khoi DAU giu ma cu — no co truoc; khoi thu hai nhan ma moi");

  // Đổi sang một mã ĐANG CÓ NGƯỜI DÙNG chỉ là dời chỗ va chạm, và phải VẪN đỏ.
  const doiVaoChoDaCo = so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: z"), muc("N-09", "lệnh: w"))
    + DONG_DOI_MA + " N-01 " + String.fromCharCode(8594) + " N-09** · 2026-09-07 · lane `x` · doi vao cho da co nguoi";
  assert.deepEqual(trungMa(doiVaoChoDaCo).map((t) => t.ma), ["N-09"],
    "doi sang mot ma dang dung chi la doi cho va cham — van phai DO");
  ok("N-12 · cua ra la mot dong them o cuoi, va doi vao cho da co nguoi thi van DO");
}

/* ---- 11. DÒNG ĐỔI MÃ MANG LUÔN `đóng khi:` CHO MÃ MỚI ----
 *
 * Khối bị đổi số thường CHÍNH LÀ khối chưa khai `đóng khi:` (đo 07/09: 5 trong 6 khối trùng ở
 * sổ thật). Thêm trường vào giữa khối cũ là sửa chữ lane khác VÀ đòi khoá `_root` — nên trường
 * đó đi theo dòng đổi mã, cùng một cửa append-only. */
{
  const chuaKhai = so(muc("N-01", "lệnh: x"), muc("N-01", null));
  assert.deepEqual(thieuDongKhi(chuaKhai), ["N-01"], "khoi thu hai chua khai thi phai keu");
  const co = chuaKhai + DONG_DOI_MA + " N-01 " + String.fromCharCode(8594)
    + " N-09** · 2026-09-07 · lane `x` · " + TRUONG_DONG_KHI.replace("- ", "") + " lệnh: node tests/x.mjs xanh";
  assert.deepEqual(thieuDongKhi(co), [], "dong doi ma co `dong khi:` thi ma moi coi nhu da khai");
  const rong = chuaKhai + DONG_DOI_MA + " N-01 " + String.fromCharCode(8594)
    + " N-09** · 2026-09-07 · lane `x` · " + TRUONG_DONG_KHI.replace("- ", "") + "   ";
  assert.deepEqual(thieuDongKhi(rong), ["N-09"],
    "truong de trong tren dong doi ma cung la CHUA KHAI — y het trong than khoi");
  ok("N-12 · dong doi ma mang duoc `dong khi:` cho ma moi, va de trong thi van la chua khai");
}

/* ---- 12. MÃ THOÁT: trùng mã cũng phải ĐỎ ----
 * Cổng đóng phiên đọc MÃ THOÁT, không đọc chữ in ra. */
{
  const thu = fs.mkdtempSync(path.join(os.tmpdir(), "backlog-trung-"));
  const chay = (text) => {
    const f = path.join(thu, "BACKLOG.md");
    fs.writeFileSync(f, text, "utf8");
    try { execFileSync(process.execPath, [BO_KIEM, f], { encoding: "utf8", stdio: "pipe" }); return 0; }
    catch (e) { return e.status; }
  };
  assert.equal(chay(so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: z"))), 1,
    "trung ma thi ma thoat phai la 1 — khong thi cong khong chan gi");
  assert.equal(chay(so(muc("N-01", "lệnh: x"), muc("N-02", "lệnh: z"))), 0,
    "khong trung thi van phai 0");
  fs.rmSync(thu, { recursive: true, force: true });
  ok("N-12 · ma thoat 1 khi trung ma, 0 khi khong trung");
}

/* ---- 13. MÃ ĐÍCH VA CHẠM THÌ VẪN GỠ ĐƯỢC BẰNG MỘT DÒNG THÊM Ở CUỐI ----
 *
 * Ca thật 07/09, và nó là ca ĐẦU TIÊN bộ kiểm trùng mã tự bắt được: một khối đã được đổi SANG
 * `N-19` va vào một tiêu đề vốn là `N-19`. Bản đầu của `docMucDaGo` đánh số theo mã GỐC của
 * tiêu đề, nên khối "vốn là N-19" luôn ở lần gặp thứ nhất và **không dòng đổi mã nào chạm tới
 * được** — cửa append-only bịt kín, người bị chặn buộc phải sửa tiêu đề (tức phải xin khoá
 * `_root`). Nay đánh số theo mã ĐÃ GIẢI, nên các lượt đổi nối đuôi được. */
const MUI = String.fromCharCode(8594);   // dấu mũi tên của dòng đổi mã
{
  const va = so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: y"), muc("N-09", "lệnh: z"))
    + DONG_DOI_MA + " N-01 " + MUI + " N-09** · lane `a` · khoi thu hai doc la N-09";
  assert.deepEqual(trungMa(va).map((t) => t.ma), ["N-09"],
    "ma DICH va cham thi phai keu — day chinh la ca that 07/09");

  const noiDuoi = va + String.fromCharCode(10)
    + DONG_DOI_MA + " N-09 " + MUI + " N-20** · lane `b` · khoi den sau doc la N-20";
  assert.deepEqual(trungMa(noiDuoi), [],
    "noi duoi mot dong nua o CUOI phai go duoc — khong duoc bat ai di sua tieu de khoi cu");
  assert.deepEqual(docMucDaGo(noiDuoi).map((m) => m.ma), ["N-01", "N-09", "N-20"],
    "khoi vao truoc giu ma; khoi den sau di tiep mot nac");
  ok("N-12 · ma DICH va cham van go duoc bang mot dong them o cuoi (day doi noi duoi nhau)");
}

/* ---- 14. DÂY ĐỔI VÒNG TRÒN KHÔNG ĐƯỢC TREO BỘ KIỂM ----
 * Mỗi dòng đổi dùng đúng một lần, nên hàng đợi cạn rồi dừng. Một bộ kiểm treo là một cổng
 * không bao giờ xanh, và nó sẽ bị gỡ khỏi `npm test` trong vòng một ngày. */
{
  const vong = so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: y"))
    + DONG_DOI_MA + " N-01 " + MUI + " N-02** · lane `a` · di" + String.fromCharCode(10)
    + DONG_DOI_MA + " N-02 " + MUI + " N-01** · lane `a` · quay lai";
  const bat = Date.now();
  const r = trungMa(vong);
  assert.ok(Date.now() - bat < 5000, "day doi vong tron KHONG duoc treo bo kiem");
  assert.ok(Array.isArray(r), "van phai tra ve mot ket qua doc duoc");
  ok("N-12 · day doi vong tron khong treo bo kiem");
}
/* ---- `dangMo`: đếm mục CÒN MỞ, và đây là chỗ dễ đếm sai nhất của sổ này ----
 *
 * Sổ đóng mục bằng cách THÊM DÒNG Ở CUỐI, không gạch tiêu đề — nên đếm tiêu đề là đếm sai, và
 * tôi đã đếm sai đúng kiểu đó một lần (báo 14 mục mở trong khi thật ra 12). Ba vế dưới ghim ba
 * cách sai khác nhau, không phải ba biến thể của một cách. */
{
  const hai = so(muc("N-01", "lệnh: x"), muc("N-02", "lệnh: y"));

  assert.deepEqual(dangMo(hai), ["N-01", "N-02"], "chua co dong dong thi ca hai deu MO");

  const daDongMot = hai + String.fromCharCode(10)
    + "- **" + "ĐÓNG" + " N-01** · 2026-09-08 · lane `a` · lenh da xanh";
  assert.deepEqual(dangMo(daDongMot), ["N-02"], "them dong dong o CUOI phai lam mot muc thanh DONG");
  assert.equal(kiemSo(daDongMot).tong, 2, "muc da dong VAN nam trong tong — so giu lai de tra lich su");

  // ⑴ Tự khai trong THÂN không phải là đóng. Thân là chữ của người mở mục; dòng ở cuối là một
  //    lượt ghi riêng có ngày, có lane, có bằng chứng.
  const tuKhai = so(muc("N-01", "lệnh: x"), "ĐÃ VÁ 06/09, khoi can lam nua", muc("N-02", "lệnh: y"));
  assert.ok(dangMo(tuKhai).includes("N-01"), "tu khai \"DA VA\" trong than KHONG duoc tinh la dong");

  // ⑵ Dòng nói VỀ một dòng đóng không phải dòng đóng. Sổ thật có sẵn một dòng như vậy
  //    (`- **LÀM RÕ DÒNG ĐÓNG N-30** …`), nên phép so phải khớp ĐẦU dòng.
  const noiVe = hai + String.fromCharCode(10)
    + "- **LÀM RÕ DÒNG " + "ĐÓNG" + " N-01** · 2026-09-08 · lane `a` · dong do noi chua het y";
  assert.deepEqual(dangMo(noiVe), ["N-01", "N-02"], "dong NOI VE mot dong dong KHONG duoc dong ho muc do");

  // ⑶ Mã đã đổi thì dòng đóng viết theo mã MỚI — `dangMo` phải gỡ `ĐỔI MÃ` trước khi so.
  const doi = so(muc("N-01", "lệnh: x"), muc("N-01", "lệnh: y"))
    + String.fromCharCode(10) + DONG_DOI_MA + " N-01 " + MUI + " N-09** · lane `a` · tranh trung"
    + String.fromCharCode(10) + "- **" + "ĐÓNG" + " N-09** · 2026-09-08 · lane `a` · xong";
  assert.deepEqual(dangMo(doi), ["N-01"], "dong dong viet theo ma SAU khi doi — phai go DOI MA truoc khi so");

  ok("N-01 · dangMo: dòng ở cuối mới đóng · tự khai trong thân KHÔNG · dòng nói VỀ nó KHÔNG · mã đã đổi vẫn khớp");
}

console.log(`\n${passed} passed, 0 failed, ${passed} total`);

/* BẢNG SỐNG — phép ghim cho ba cửa và bốn chốt an toàn.
 *
 * Cửa ③ chạy khi KHÔNG AI NHÌN. Mọi lỗi ở đó là lỗi im lặng, nên file này ghim những thứ mà
 * hỏng thì không ai biết cho tới lúc đã muộn.
 *
 * ĐỘT BIẾN KIỂM ĐÃ CHẠY THẬT khi viết file này. Mỗi cái phá đúng MỘT thứ và đòi ĐÚNG vế của nó
 * đỏ, rồi hoàn nguyên nguyên byte:
 *
 *   1. bỏ khoá của `scripts/` khỏi danh sách chặn sinh          → vế 1 ĐỎ
 *   2. bảng quyền hỏng trả `{ngung:false}` thay vì `true`        → vế 2 ĐỎ
 *   3. thêm một đường `/ghi` vào máy chủ                         → vế 4 ĐỎ
 *   4. cho `PHUONG_THUC` nhận thêm `POST`                        → vế 5 ĐỎ
 *   5. `canSinh(null, null)` trả `false`                         → vế 6 ĐỎ
 *   6. gỡ hàng rào `KHOA_SONG` trong `build-overview.mjs`        → vế 7 ĐỎ
 *   7. gỡ hai dòng của `.gitignore`                              → vế 8 ĐỎ
 *   8. đóng cứng lại danh sách thay vì suy từ hình dạng repo     → vế 1 ĐỎ
 *   9. hình dạng đọc được nhưng thiếu `scripts/` → `[]` thay `null` → vế 1 ĐỎ
 *
 * HAI CÁI SỐNG SÓT LƯỢT ĐẦU, và cả hai đáng ghi lại hơn bảy cái kia:
 *   · Đột biến 1 sống vì vế 1 **lặp qua chính danh sách nó phải canh** — bỏ một khoá đi thì nó
 *     chỉ kiểm phần còn lại rồi báo xanh. Một phép kiểm tự soi mình luôn đúng, nên nó ghim số 0.
 *     Chữa bằng cách hỏi HÀNH VI: dựng bảng quyền có chủ của `scripts/` đang giữ, rồi đòi ngừng.
 *   · Đột biến 9 sống vì phép ghim chỉ thử hình dạng HỎNG, chưa thử hình dạng ĐỌC ĐƯỢC MÀ THIẾU.
 *     Đó mới là ca thật ở repo đích: `areas` đầy đủ nhưng không khai `scripts/`, và lúc đó danh
 *     sách rỗng nghĩa là "không vùng nào chặn" — tức bảng cứ chạy bằng một bộ sinh có thể đang
 *     sửa dở, im lặng, ở đúng chỗ không ai nhìn.
 *
 * VÌ SAO ĐỘT BIẾN 6 VÀ 7 LÀ HAI CÁI QUAN TRỌNG NHẤT: chúng canh ranh giới giữa bản SỐNG và bản
 * ĐÃ COMMIT. Bỏ hàng rào là bản commit ở gốc repo cũng đọc bảng quyền từ đĩa, và lúc đó cổng
 * "Sự thật máy sinh còn tươi" ĐỎ với MỌI phiên mỗi lượt có ai nhận hay trả khoá — tức một tiến
 * trình chạy trên máy người chủ chặn push của tất cả mọi người.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { once } from "node:events";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { canSinh, chenBang, khoaChanSinhFrom, KHOA_CHAN_SINH, NHAN_BANG, xetChot } from "../bang-song/loi.mjs";
import { DUONG, PHUONG_THUC, xuLy } from "../bang-song/may-chu.mjs";

let passed = 0;
const ok = (name) => { passed += 1; console.log(`  ok  ${name}`); };
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const doc = (p) => readFileSync(join(ROOT, p), "utf8");

const NL = String.fromCharCode(10);
const bang = (khoa) => JSON.stringify({ claims: khoa });

/* ---- 1. CHỐT ⑴ — lane giữ vùng của bộ sinh thì NGỪNG SINH ---------------
 *
 * Bộ sinh nằm trong `scripts/`. Lane giữ `_code` có thể đang sửa dở nó, và một bảng sinh từ mã
 * nửa vời trông y hệt một bảng thật. Lần đó có người phát hiện; tiến trình nền thì không. */
{
  for (const k of KHOA_CHAN_SINH) {
    const r = xetChot(bang({ [k]: { owner: "lane-x" } }));
    assert.equal(r.ngung, true, `lane giu ${k} thi PHAI ngung sinh`);
    assert.match(r.ly_do, new RegExp(k), "ly do phai NOI RA khoa nao dang chan — bang im lang la bang lam nguoi doc tin nham");
    assert.match(r.ly_do, /lane-x/, "phai noi TEN luong dang giu, de nguoi doc biet hoi ai");
  }
  /* Mặt còn lại: chặn THỪA cũng là hỏng — bảng chết cả ngày vì một lane không liên quan.
   *
   * Vùng "không chứa bộ sinh" phải ĐO từ repo, đừng gõ tên vào đây: file này đi theo bản trích,
   * và ở bản trích `scripts/` thuộc `_root` chứ không thuộc `_code`. Một tên gõ tay làm phép
   * ghim tự đỏ ở chính repo nó vừa được phát tới — đã cắn thật đúng một lượt khi viết file này.
   * Repo một-chủ thì không có vùng nào như thế, và lúc đó bỏ qua vế này là ĐÚNG, không phải né. */
  const chuKhac = Object.values(JSON.parse(doc(".repo-structure.json"))?.areas ?? {})
    .map((a) => a?.steward).filter((st) => st && !(KHOA_CHAN_SINH ?? []).includes(st))[0];
  if (chuKhac) {
    assert.equal(xetChot(bang({ [chuKhac]: { owner: "lane-y" } })).ngung, false,
      `lane giu "${chuKhac}" (vung KHONG chua bo sinh) thi khong duoc chan — chan thua la bang chet ca ngay`);
  }

  /* VÀ ĐÂY MỚI LÀ VẾ CÓ RĂNG. Phần trên lặp qua CHÍNH `KHOA_CHAN_SINH`, nên bỏ một khoá khỏi
   * danh sách thì nó chỉ kiểm phần còn lại rồi báo xanh — một phép kiểm tự soi mình. Đột biến
   * số 1 sống sót đúng vì thế, và đây là chỗ file này suýt nói dối.
   *
   * Bất biến thật KHÔNG phải "danh sách chứa `_code`" (một chuỗi gõ tay), mà là **HÀNH VI**:
   * dựng một bảng quyền trong đó chủ của `scripts/` đang giữ vùng, rồi đòi `xetChot` NGỪNG.
   * Hỏi hành vi chứ không so hai danh sách — hai bên cùng suy từ một nguồn thì so danh sách
   * luôn đúng, tức không ghim được gì. */
  const chuBoSinh = JSON.parse(doc(".repo-structure.json"))?.areas?.["scripts/"]?.steward;
  assert.ok(chuBoSinh, "khong doc duoc chu cua scripts/ — khong do duoc thi DUNG, dung doan");
  assert.equal(xetChot(bang({ [chuBoSinh]: { owner: "lane-bo-sinh" } })).ngung, true,
    `chu cua scripts/ la "${chuBoSinh}"; lane giu no PHAI lam bang ngung sinh, khong thi mot lane sua do bo sinh se bi chay bang chinh ban nua voi do`);

  /* Và fail-closed ở tầng trên: không biết vùng nào chứa bộ sinh thì NGỪNG, đừng cho chạy. */
  assert.equal(khoaChanSinhFrom("{{"), null, "hinh dang hong phai tra null (= KHONG BIET), khong tra [] (= khong co vung nao)");
  assert.equal(khoaChanSinhFrom(JSON.stringify({ areas: { "docs/": { steward: "_docs" } } })), null,
    "hinh dang DOC DUOC nhung khong khai scripts/ cung phai tra null — [] o day nghia la 'khong vung nao chan', tuc bang cu chay bang mot bo sinh co the dang sua do");
  assert.equal(xetChot(bang({}), null).ngung, true, "khong biet vung nao chan thi PHAI ngung");
  assert.deepEqual(khoaChanSinhFrom(JSON.stringify({ areas: { "scripts/": { steward: "core" } } })), ["core"],
    "repo dat ten khoa khac van phai suy ra dung — file nay di theo ban trich");

  ok(`1 · chốt ⑴: vùng chứa bộ sinh (${chuBoSinh}) chặn sinh, và lý do nói rõ ai đang giữ`);
}

/* ---- 2. CHỐT ⑴ FAIL-CLOSED — đọc không được thì NGỪNG, không đoán -------- */
{
  for (const xau of ["{{{", "", "null", '{"khong_co_claims": 1}']) {
    assert.equal(xetChot(xau).ngung, true, `bang quyen "${xau}" doc khong duoc thi PHAI ngung`);
  }
  assert.match(xetChot("{{{").ly_do, /không đọc được/, "phai noi ro la KHONG DOC DUOC, khong noi mo ho");
  ok("2 · bảng quyền hỏng → ngừng sinh (fail-closed), không ngã về 'chắc là rảnh'");
}

/* ---- 3. CHỐT ⑶ — không một đường GHI nào vào repo ------------------------
 *
 * Cả ba cửa chỉ đọc repo và ghi hai file NGOÀI git. Đây là chỗ dễ trượt nhất: thêm "commit hộ
 * cho tiện" là biến một tiến trình nền thành một tiến trình sửa được lịch sử của người khác. */
{
  const goChuThich = (ma) => ma.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/.*$/gm, " ");
  for (const f of ["loi.mjs", "may-chu.mjs", "mot-luot.mjs"]) {
    const ma = goChuThich(doc(join("bang-song", f)));
    for (const cam of [/"commit"/, /"push"/, /--take/, /--release/, /\bclaim\.mjs\b/]) {
      assert.doesNotMatch(ma, cam, `bang-song/${f} khong duoc chua ${cam} — ba cua CHI DOC repo`);
    }
  }
  ok("3 · không cửa nào commit, đẩy, hay nhận/trả khoá");
}

/* ---- 4. MÁY CHỦ: ĐÚNG BA ĐƯỜNG, TẤT CẢ CHỈ ĐỌC --------------------------
 *
 * Con số 3 là phần của hợp đồng, không phải chi tiết. Người chốt đã bác việc tự nhập liệu:
 * *"Tôi muốn là người ĐỌC thông tin AI báo cáo, chứ không phải người báo cáo cho AI."*
 * Thêm một đường "cho tiện sau này" là cách một máy chủ chỉ-đọc thành máy chủ sửa được repo. */
{
  assert.equal(DUONG.length, 3, `may chu phai co DUNG ba duong, dang co ${DUONG.length}: ${DUONG.join(", ")}`);
  assert.deepEqual([...DUONG].sort(), ["/", "/lam-moi", "/trang-thai.json"], "ba duong phai dung ba duong da chot");
  ok("4 · máy chủ có đúng ba đường, và đúng ba đường đã chốt");
}

/* ---- 5. MÁY CHỦ: mọi phương thức GHI bị chặn, và chặn THẬT ---------------
 *
 * Không chỉ đọc hằng số — gọi thẳng bộ xử lý. Một danh sách hằng đúng mà nhánh xử lý quên kiểm
 * thì hằng số đó là đồ trang trí. */
{
  assert.deepEqual([...PHUONG_THUC].sort(), ["GET", "HEAD"], "chi GET va HEAD");
  const goi = (method, url) => {
    const ra = { ma: 0, dau: null, than: "" };
    xuLy({ method, url }, {
      writeHead(ma, dau) { ra.ma = ma; ra.dau = dau; },
      end(t) { ra.than = String(t ?? ""); }
    }, { lamMoi() { throw new Error("KHONG duoc goi lamMoi tu mot phuong thuc GHI"); } });
    return ra;
  };
  for (const m of ["POST", "PUT", "PATCH", "DELETE"]) {
    const r = goi(m, "/");
    assert.equal(r.ma, 405, `${m} phai bi tu choi 405, nhan duoc ${r.ma}`);
  }
  assert.equal(goi("POST", "/lam-moi").ma, 405, "POST /lam-moi cung phai 405 — dung de duong lam moi thanh cua sau");
  assert.equal(goi("GET", "/khong-co-duong-nay").ma, 404, "duong la thi 404");
  ok("5 · POST/PUT/PATCH/DELETE đều 405, kể cả trên đường làm mới");
}

/* ---- 6. CHỐT ⑷ FAIL-CLOSED — không đo được thì SINH LẠI ------------------
 *
 * `null === null` là `true`, nên một phép so trần sẽ biến "git hỏng hai nhịp liền" thành "repo
 * không đổi gì" và bảng đứng im vĩnh viễn mà vẫn trông bình thường. */
{
  assert.equal(canSinh(null, "a"), true, "khong do duoc lan truoc → phai sinh lai");
  assert.equal(canSinh("a", null), true, "khong do duoc lan nay → phai sinh lai");
  assert.equal(canSinh(null, null), true, "hai lan lien khong do duoc KHONG phai la 'khong co gi doi'");
  assert.equal(canSinh(undefined, "a"), true, "nhip dau tien → phai sinh");
  assert.equal(canSinh("a", "a"), false, "khong doi that thi dung sinh — mot luot sinh ~15s, nua nhip");
  ok("6 · dấu vân tay không đo được → sinh lại, không ngã về 'không có gì đổi'");
}

/* ---- 7. HÀNG RÀO GIỮA BẢN SỐNG VÀ BẢN ĐÃ COMMIT --------------------------
 *
 * Vế quan trọng nhất file này. Bản ở gốc repo PHẢI suy hoàn toàn từ HEAD; chỉ bản sống mới được
 * đọc bảng quyền từ đĩa. Gỡ hàng rào là cổng "Sự thật máy sinh còn tươi" đỏ với MỌI phiên mỗi
 * lượt có ai nhận khoá — một tiến trình trên máy người chủ chặn push của cả repo. */
{
  const ma = doc("scripts/build-overview.mjs");
  assert.match(ma, /const KHOA_SONG = /, "phai co mot hang ra ro rang ten KHOA_SONG");
  assert.match(ma, /KHOA_SONG\s*$|KHOA_SONG\s*\n?\s*\?/m, "duong doc tu dia phai nam SAU hang rao KHOA_SONG");

  // Đọc đĩa CHỈ được xuất hiện trong nhánh có hàng rào. Đếm, đừng tin mắt.
  const docDia = ma.match(/readFileSync\([^)]*claims\.json/g) || [];
  assert.equal(docDia.length, 1, `bo sinh chi duoc doc claims.json tu dia DUNG MOT cho, dang co ${docDia.length}`);
  const quanh = ma.slice(Math.max(0, ma.indexOf(docDia[0]) - 400), ma.indexOf(docDia[0]));
  assert.match(quanh, /KHOA_SONG/, "cho doc dia PHAI nam trong nhanh KHOA_SONG");
  ok("7 · bản ở gốc repo vẫn suy từ HEAD — đường đọc đĩa nằm sau hàng rào `KHOA_SONG`");
}

/* ---- 8. BẢN RA NẰM NGOÀI GIT, và git tự xác nhận -------------------------
 *
 * Không đọc `.gitignore` bằng mắt — hỏi thẳng git. Một dòng gitignore gõ sai trông y hệt một
 * dòng đúng, và hậu quả chỉ lộ ra lúc ai đó commit nhầm bảng sống. */
{
  const hoiGit = (p) => {
    try {
      execFileSync("git", ["check-ignore", "-q", p], { cwd: ROOT });
      return true;
    } catch (_) { return false; }
  };
  for (const f of ["bang-song/BANG.html", "bang-song/trang-thai.json", "bang-song/DUNG.txt"]) {
    assert.equal(hoiGit(f), true, `${f} PHAI nam ngoai git — commit no la moi phien khac thay cay lam viec ban`);
  }
  // Và mặt còn lại: mã nguồn của ba cửa thì PHẢI được theo dõi.
  assert.equal(hoiGit("bang-song/loi.mjs"), false, "ma nguon cua ba cua thi phai duoc git theo doi");
  ok("8 · git tự xác nhận: ba file bản ra nằm ngoài, mã nguồn nằm trong");
}

/* ---- 9. BĂNG: gỡ được, không chồng, và NÓI RA thứ nó không thấy ---------- */
{
  const goc = "<p>trang</p>";
  const mot = chenBang(goc, { nhip: "2026-09-06T18:00:00Z", sinh_luc: "2026-09-06T18:00:00Z" });
  const hai = chenBang(mot, { nhip: "2026-09-06T19:00:00Z", sinh_luc: "2026-09-06T18:00:00Z" });
  assert.equal(hai.split(NHAN_BANG).length - 1, 1, "dap bang hai lan phai ra DUNG mot bang, khong chong");
  assert.ok(hai.startsWith(goc), "noi dung trang goc phai con nguyen");

  // Trang im lặng về giới hạn của chính nó là cách làm người đọc tin nhầm: một khối trống đọc
  // y hệt "không có gì chạy" trong khi thật ra là "mù".
  assert.match(hai, /KHÔNG thấy luồng ở repo khác/, "bang PHAI noi ra: no khong thay repo khac");
  assert.match(hai, /KHÔNG thấy việc lane làm ngoài repo/, "bang PHAI noi ra: no khong thay viec ngoai repo");

  const dung = chenBang(goc, { ngung: true, ly_do: "lane-z giữ _code" });
  assert.match(dung, /DỪNG CẬP NHẬT/, "dang ngung thi phai NOI ngay tren trang, khong im lang de bang cu trong nhu bang moi");
  assert.match(dung, /lane-z/, "phai noi ai dang giu, de nguoi doc biet hoi ai");
  ok("9 · băng: một băng duy nhất, nói rõ hai chỗ mù, và nói khi đang dừng");
}

/* ---- 10. CỔNG BẬN ≠ "BẢN KHÁC CỦA CHÍNH MÌNH ĐANG CHẠY" -----------------
 *
 * Bản đầu thoát im lặng khi gặp cổng bận, dựa trên đúng giả định đó. ĐO 07/09 trên một máy thật: MỘT REPO KHÁC trên
 * cùng máy đó cũng phát một máy chủ bảng ở **cùng cổng mặc định**, cũng kèm mục tự chạy lúc bật
 * máy — vì nó lắp cùng bộ khung này. Hai repo, một cổng. Càng nhiều repo lắp bộ khung thì ca này
 * càng chắc chắn xảy ra, chứ không phải càng hiếm.
 *
 * Hậu quả nếu giữ nguyên: bản bật sau thoát IM LẶNG, người mở trình duyệt thấy bảng CỦA REPO KIA
 * và tin đó là bảng repo này. **Tệ hơn không có bảng** — bảng vẫn hiện, số vẫn đẹp, chỉ là của
 * chỗ khác. Đây không phải giả thuyết: cả hai file đều đã nằm trên đĩa cùng một máy, đo được bằng một dòng.
 *
 * Vế này ghim HÀNH VI trong một tiến trình thật, không đọc mã: chiếm cổng trước, rồi bật máy chủ,
 * rồi đòi nó (a) không chết, (b) nói ra cổng nó thật sự dùng.
 *
 * Đột biến đã chạy: trả `process.exit(0)` ngay ở `EADDRINUSE` → vế này ĐỎ. */
{
  const may = createServer((_q, r) => r.end("ke chiem cong")).listen(0, "127.0.0.1");
  await once(may, "listening");
  const bi = may.address().port;
  const r = spawnSync(process.execPath, [join(ROOT, "bang-song", "may-chu.mjs"), "--cong", String(bi)],
    { cwd: ROOT, encoding: "utf8", timeout: 60_000 });
  may.close();
  const ra = String(r.stdout || "") + String(r.stderr || "");

  assert.match(ra, /đã có người nghe/, "phai NOI RA la cong bi chiem, dung im lang");
  const dung = /phục vụ ở http:\/\/127\.0\.0\.1:(\d+)\//.exec(ra);
  assert.ok(dung, `phai van mo duoc bang o mot cong khac, va phai IN RA cong do. Nhan duoc:${NL}${ra.slice(0, 400)}`);
  assert.notEqual(Number(dung[1]), bi, "cong dang phuc vu phai KHAC cong bi chiem");
  assert.match(ra, /KHÔNG phải cổng mặc định/,
    "phai noi ro day khong phai cong quen thuoc — nguoi doc go dia chi cu se ra bang cua REPO KHAC");
  ok(`10 · cổng bận → né sang cổng khác và NÓI RA (bị chiếm ${bi} → dùng ${dung[1]})`);
}

/* ---- 11. FILE LỆNH WINDOWS PHẢI LÀ CRLF ---------------------------------
 *
 * Vế này có vì một phép đo SAI của chính phiên viết nó, và cái sai đáng chép lại.
 *
 * Lượt 1: thêm `*.cmd text eol=crlf` theo LINH CẢM. Không có số đo.
 * Lượt 2: viết một file `.cmd` NGẮN thuần LF, chạy, thấy đúng → kết luận "LF chạy được" và GỠ
 *         luật đi. Fixture quá đơn giản để dựng nổi ca hỏng — luật vàng 2, đúng chữ.
 * Lượt 3: chạy CHÍNH `Bat-tu-chay.cmd` ở hai dạng, cùng nội dung, chỉ khác xuống dòng:
 *           LF   → 'cp' is not recognized · 'tlocal' is not recognized · mã thoát 1
 *           CRLF → chạy đúng, mã thoát 0
 *
 * `cmd.exe` nhảy theo ĐỘ DỜI BYTE và giả định CRLF, nên với LF nó rơi vào giữa một từ và ăn mất
 * ký tự đầu dòng. File càng dài càng lệch — nên một file thử ngắn KHÔNG bao giờ bắt được.
 *
 * Đọc BYTE THẬT trên đĩa, không đọc `.gitattributes`: một dòng cấu hình đúng mà file trong cây
 * làm việc vẫn LF thì người vừa clone vẫn dính. Đó chính là bệnh `.gitattributes` sinh ra để chữa.
 *
 * Đột biến đã chạy: đổi một file `.cmd` về LF → vế này ĐỎ. */
{
  const cmds = readdirSync(join(ROOT, "bang-song")).filter((f) => f.endsWith(".cmd"));
  assert.ok(cmds.length >= 1, "bang-song phai co it nhat mot file lenh");
  for (const f of cmds) {
    const b = readFileSync(join(ROOT, "bang-song", f));
    let lf = 0, crlf = 0;
    for (let i = 0; i < b.length; i += 1) {
      if (b[i] === 10) { if (i > 0 && b[i - 1] === 13) crlf += 1; else lf += 1; }
    }
    assert.equal(lf, 0,
      `bang-song/${f} co ${lf} dong ket bang LF tran — cmd.exe se an mat ky tu dau dong va bao 'tlocal is not recognized'`);
    assert.ok(crlf > 0, `bang-song/${f} khong co dong nao?`);
  }
  ok(`11 · ${cmds.length} file lệnh Windows đều là CRLF thật trên đĩa`);
}

console.log(`bang-song: ${passed} vế xanh`);

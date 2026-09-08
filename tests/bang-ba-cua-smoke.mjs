/* Phép ghim cho BA CỬA vào bảng trạng thái (BRIEF-BANG-BA-CUA-01).
 *
 * Ghim đúng những chốt mà brief nói là quan trọng nhất — mục 2 — vì cửa ③ chạy khi
 * không ai nhìn, nên mọi lỗi ở đó là lỗi im lặng và không ai báo cho Đức.
 *
 * ĐỘT BIẾN KIỂM (đã chạy tay 06/09, cả bốn đều ĐỎ đúng chỗ):
 *   · gỡ chốt ⑴ trong `sinhLai`            → ĐỎ ở "ngừng sinh khi có phiên giữ _code"
 *   · cho lõi gọi một lệnh hệ điều hành     → ĐỎ ở "không lệnh nào, không bộ sinh nào khác"
 *   · thêm một đường ghi vào máy chủ        → ĐỎ ở "máy chủ chỉ đọc"
 *   · bỏ câu "chưa commit thì không hiện"   → ĐỎ ở "băng nói ra thứ trang không thấy"
 *
 * ĐỐI CHỨNG ÂM bắt buộc ở phép đếm mỏ neo: khớp 0 chỗ nghĩa là THƯỚC HỎNG, không phải
 * "không có gì phải sửa". Ngày 06/09 đúng cái bẫy đó cắn năm lane khác nhau.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KHOA_NGUNG, chenBang, doiSangBanSong, goBang, docChuKhoa, sinhLai, trangNgungToiThieu, vanTay, gioVN
} from "../bang-trang-thai/loi.mjs";
import { KHAI_BAN_CHUP, KHAI_BAN_SONG } from "../scripts/build-overview.mjs";
import { DUONG, PHUONG_THUC, xuLy } from "../bang-trang-thai/may-chu.mjs";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THU_MUC = path.join(GOC, "bang-trang-thai");

let passed = 0;
const ok = (ten) => { passed += 1; console.log(`  ok  ${ten}`); };

const tam = fs.mkdtempSync(path.join(os.tmpdir(), "bang-ba-cua-"));
const fileBang = path.join(tam, "BANG.html");
const fileTT = path.join(tam, "trang-thai.json");

/* ---- 1. MỎ NEO: bộ sinh còn chỗ để chèn băng, và đúng MỘT chỗ ------------ */
{
  const trang = fs.readFileSync(path.join(GOC, "DASHBOARD-Chrome-Extension-AI-Agentic.html"), "utf8");
  const khop = trang.match(/<div class="cu" id="cu" data-sinh="[^"]*"><\/div>/g) ?? [];
  assert.equal(khop.length, 1,
    `thuoc hong hoac bo sinh da doi: tim thay ${khop.length} cho chen bang, phai la dung 1. ` +
    `Ra 0 KHONG phai la "khong co gi phai sua" — sua MO_NEO trong bang-trang-thai/loi.mjs.`);
  ok("mỏ neo chèn băng: đúng 1 chỗ trong trang bộ sinh ra");
}

/* ---- 2. Băng nói ra thứ trang KHÔNG thấy (mục 6 của brief) --------------- */
{
  const trang = fs.readFileSync(path.join(GOC, "DASHBOARD-Chrome-Extension-AI-Agentic.html"), "utf8");
  const co = chenBang(trang, { ngung: false, luc: "2026-09-06T12:45:00.000Z" });

  assert.ok(/chưa commit thì không hiện/.test(co),
    "bang phai noi ra rang viec chua commit thi khong hien — mot bang im lang ve gioi han " +
    "cua chinh no la cach lam Duc tin nham");
  assert.ok(co.includes("Bảng sinh lúc"), "bang phai in moc sinh gan nhat");
  assert.ok(co.includes(gioVN("2026-09-06T12:45:00.000Z")), "moc sinh phai la gio may cua Duc");
  ok("băng nói ra thứ trang không thấy, kèm mốc sinh");

  // Đắp lại nhiều lần vẫn ra đúng MỘT băng — máy chủ dựa vào tính chất này.
  const hai = chenBang(co, { ngung: false, luc: "2026-09-06T12:45:00.000Z" });
  assert.equal(hai, co, "chen bang hai lan phai ra y het mot lan");
  assert.equal((hai.match(/id="bang-ba-cua"/g) ?? []).length, 1, "chi duoc mot bang");
  assert.equal(goBang(hai), trang, "go bang phai tra ve dung trang goc");
  ok("chèn băng là thao tác lặp lại được, gỡ ra là về đúng bản gốc");

  // Thước hỏng phải NÉM, không được lặng lẽ trả về trang không băng.
  assert.throws(() => chenBang("<p>trang la</p>", {}), /MO_NEO_0/,
    "khong tim thay mo neo thi phai NEM, khong duoc lang le bo bang");
  ok("mất mỏ neo thì ném lỗi, không lặng lẽ bỏ băng");
}

/* ---- 3. CHỐT ⑴ — lần đầu chạy đúng lúc có phiên giữ `_code` -------------- */
{
  const tt = await sinhLai({
    fileBang, fileTrangThai: fileTT,
    docChu: () => "lane-dang-sua-bo-sinh"
  });
  assert.equal(tt.ngung, true, "co phien giu _code thi PHAI ngung sinh");
  assert.equal(tt.chuKhoa, "lane-dang-sua-bo-sinh");

  const html = fs.readFileSync(fileBang, "utf8");
  assert.ok(html.includes("lane-dang-sua-bo-sinh"), "trang phai goi ten phien dang giu khoa");
  assert.ok(/ĐANG NGỪNG SINH/.test(html), "trang phai noi ro dang ngung, khong duoc im lang");
  assert.ok(html.includes(KHOA_NGUNG), "trang phai noi ro khoa nao");
  ok("chốt ⑴: chưa từng có bảng mà gặp phiên giữ _code → nói rõ, không mở ra trang trắng");
}

/* ---- 4. Không giữ khoá thì sinh thật, và sinh hai lần là giống hệt ------- */
{
  const luc = "2026-09-06T09:00:00.000Z";
  const a = await sinhLai({ fileBang, fileTrangThai: fileTT, docChu: () => null, luc });
  assert.equal(a.ngung, false, "khong ai giu khoa thi phai sinh");
  const mot = fs.readFileSync(fileBang, "utf8");
  assert.ok(mot.length > 10_000, "ban ra phai la ca trang bang, khong phai mot manh");
  // Mở thẳng bằng trình duyệt thì không có khung trang nào khai charset hộ. Thiếu dòng này
  // là Đức nhận về một trang tiếng Việt đầy ký tự rác.
  assert.ok(mot.startsWith('<meta charset="utf-8">'), "ban ra phai tu khai charset");

  await sinhLai({ fileBang, fileTrangThai: fileTT, docChu: () => null, luc });
  const hai = fs.readFileSync(fileBang, "utf8");
  assert.equal(hai, mot, "sinh hai lan tren cung HEAD phai giong het tung byte");
  ok("sinh hai lượt trên cùng HEAD: giống hệt từng byte");
}

/* ---- 4b. CHỐT ⑴ trên một bảng ĐÃ CÓ — đây mới là ca hay gặp -------------- */
{
  const truoc = fs.readFileSync(fileBang, "utf8");
  const tt = await sinhLai({ fileBang, fileTrangThai: fileTT, docChu: () => "lane-khac" });
  assert.equal(tt.ngung, true);
  const sau = fs.readFileSync(fileBang, "utf8");

  assert.ok(/ĐANG NGỪNG SINH/.test(sau), "bang cu im lang trong y het bang moi — phai noi ra");
  assert.ok(sau.includes("lane-khac"), "phai goi ten phien dang giu khoa");
  assert.equal(goBang(sau), goBang(truoc),
    "ngung sinh thi NOI DUNG bang phai giu nguyen — chi bang thong bao doi");
  ok("chốt ⑴: bảng cũ giữ nguyên nội dung, chỉ băng thông báo đổi");
}

/* ---- 5. CHỐT ⑵⑶ — lõi không chạy lệnh nào, không đụng bộ sinh nào khác --- */
{
  const nguon = fs.readdirSync(THU_MUC)
    .filter((f) => /\.(mjs|cmd|vbs)$/i.test(f))
    .map((f) => ({ ten: f, chu: fs.readFileSync(path.join(THU_MUC, f), "utf8") }));
  assert.ok(nguon.length >= 5, `thuoc hong: chi thay ${nguon.length} file nguon trong bang-trang-thai/`);

  const cam = [
    ["child_process", /child_process|execFile|spawnSync|\bspawn\(/],
    ["đối chiếu tính năng", /feature-parity/i],
    ["commit / đẩy", /git\s+(commit|push|add)|safe-push/i],
    ["nhận / trả khoá", /claim\.mjs|--take\b|--release\b/i]
  ];
  const mjs = nguon.filter((n) => n.ten.endsWith(".mjs"));
  for (const [ten, re] of cam) {
    const dinh = mjs.filter((n) => re.test(n.chu)).map((n) => n.ten);
    assert.deepEqual(dinh, [],
      `chot (2)(3): ma trong bang-trang-thai/ khong duoc dinh toi "${ten}" — thay o: ${dinh.join(", ")}`);
  }
  ok("chốt ⑵⑶: không lệnh nào, không bộ sinh nào khác, không commit/đẩy/khoá");
}

/* ---- 6. Máy chủ CHỈ ĐỌC ------------------------------------------------- */
{
  assert.deepEqual(DUONG, ["/", "/lam-moi", "/trang-thai.json"],
    "may chu chi duoc co ba duong, ca ba chi doc. Them duong moi = sua phep ghim nay va " +
    "doc lai muc 4 cua brief truoc da.");
  assert.deepEqual(PHUONG_THUC, ["GET", "HEAD"], "may chu khong duoc nhan phuong thuc ghi");
  ok("máy chủ: đúng ba đường, chỉ GET/HEAD");

  for (const pt of ["POST", "PUT", "DELETE", "PATCH"]) {
    const res = giaRes();
    xuLy({ method: pt, url: "/" }, res, { lamMoi: () => assert.fail("khong duoc chay") });
    assert.equal(res.ma, 405, `${pt} phai bi tu choi`);
  }
  ok("mọi phương thức ghi đều bị từ chối (405)");

  {
    const res = giaRes();
    xuLy({ method: "GET", url: "/khong-co" }, res, { lamMoi: () => assert.fail("khong duoc chay") });
    assert.equal(res.ma, 404);
    ok("đường lạ trả 404, không chạy gì");
  }
}

/* ---- 7. Dấu vân tay đọc được, và đọc bảng quyền thật không nổ ------------ */
{
  const vt = vanTay(GOC);
  assert.ok(vt && !vt.includes("khong-doc-duoc-git"),
    `thuoc hong: khong doc duoc dau van tay git — ${vt}`);
  assert.notEqual(vt, vanTay(path.join(tam, "khong-ton-tai")),
    "dau van tay cua hai repo khac nhau phai khac nhau");
  ok("dấu vân tay repo đọc được bằng hệ thống file, không cần lệnh");

  // Bảng quyền hỏng / không có → coi như CÓ CHỦ (ngừng sinh). Fail-closed.
  const chu = docChuKhoa(KHOA_NGUNG, path.join(tam, "khong-co-bang.json"));
  assert.ok(chu, "khong doc duoc bang quyen thi phai coi nhu CO CHU, khong duoc coi la trong");
  ok("không đọc được bảng quyền → ngừng sinh (fail-closed)");
}

/* ---- 8. Trang tối thiểu vẫn nói ra lý do -------------------------------- */
{
  const t = trangNgungToiThieu({ chuKhoa: "lane-x" });
  assert.ok(t.includes("lane-x") && t.includes(KHOA_NGUNG), "trang toi thieu phai noi ro ly do");
  ok("chưa từng có bảng nào thì vẫn mở ra một trang nói rõ lý do");
}

function giaRes() {
  return {
    ma: null, dau: null, than: "",
    writeHead(ma, dau) { this.ma = ma; this.dau = dau; },
    end(than) { this.than = than ?? ""; }
  };
}

/* ---- HAI BẢN PHẢI TỰ KHAI LÀ BẢN NÀO — N-11 -------------------------------
 *
 * Đức báo 06/09: *"tôi thấy có 2 dashboard nên bị confuse."* Hai file không gộp được (bản ở
 * gốc phải nằm yên trong git, bản sống phải ghi đè liên tục), nên cách duy nhất còn lại là
 * bắt mỗi bản nói ra nó là bản nào — ở DÒNG ĐẦU cho máy, và ở dải mốc cho mắt Đức. */
{
  const goc = fs.readFileSync(path.join(GOC, "DASHBOARD-Chrome-Extension-AI-Agentic.html"), "utf8");
  const dongDau = goc.split("\n")[0];
  assert.ok(dongDau.includes(KHAI_BAN_CHUP),
    "dong dau cua ban da commit phai tu khai la BAN CHUP kem duong sang ban song");
  assert.match(KHAI_BAN_CHUP, /bang-trang-thai/, "cau khai phai chi duong sang ban song, khong chi noi no cu");
  assert.ok(goc.split(KHAI_BAN_CHUP).length - 1 >= 2,
    "phai khai o CA HAI cho: dong dau (may doc) va dai moc (Duc doc)");
  ok("ban da commit tu khai la BAN CHUP, o ca cho may doc lan cho Duc doc (N-11)");
}

{
  const gia = `<!-- ${KHAI_BAN_CHUP} -->\n<span>${KHAI_BAN_CHUP}</span>`;
  const song = await doiSangBanSong(gia);
  assert.ok(!song.includes(KHAI_BAN_CHUP), "ban song KHONG duoc con cau cua ban chup o bat ky cho nao");
  assert.equal(song.split(KHAI_BAN_SONG).length - 1, 2, "phai doi CA HAI cho, khong phai cho dau tien");
  assert.match(KHAI_BAN_SONG, /DASHBOARD-/, "cau cua ban song phai chi nguoc lai ban chup");
  ok("ban song doi het cau khai sang cua no");
}

{
  // Bộ sinh đổi chữ mà đây im lặng bỏ qua thì bản sống mang câu của bản chụp — tức bảo Đức đi
  // nhấp đúp đúng cái ông vừa nhấp. Ném lỗi là đúng, im lặng là sai.
  await assert.rejects(() => doiSangBanSong("<html>khong co cau khai nao</html>"), /KHAI_BAN_0/,
    "khong thay cau khai thi phai NEM LOI, khong duoc tra ve nguyen trang");
  ok("bo sinh doi chu thi ba cua KEU, khong lang le tra ve ban sai");
}
fs.rmSync(tam, { recursive: true, force: true });
console.log(`\n${passed} passed, 0 failed, ${passed} total`);

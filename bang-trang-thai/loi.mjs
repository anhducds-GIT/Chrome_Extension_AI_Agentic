/* LÕI DÙNG CHUNG cho cả ba cửa vào bảng trạng thái (BRIEF-BANG-BA-CUA-01).
 *
 * Ba cửa — nhấp đúp · máy chủ tại chỗ · canh nền — chỉ khác nhau ở CÁCH ĐƯỢC GỌI.
 * Phần "sinh lại bảng cho an toàn" viết đúng MỘT LẦN, ở đây. Ba bản sao của cùng một
 * logic là ba bản sẽ trôi khác nhau; repo này đã trả giá cho đúng chuyện đó (ADR-0006).
 *
 * BỐN CHỐT AN TOÀN (mục 2 của brief — cửa ③ chạy khi không ai nhìn, nên mọi lỗi ở đó
 * là lỗi im lặng):
 *
 *   ⑴ Phiên nào đang giữ khoá `_code` thì NGỪNG sinh. Bộ sinh nằm trong `scripts/`,
 *     tức là trong vùng đó, và có thể đang sửa dở. Ngày 06/09 một phiên chạy bộ sinh
 *     giữa lúc một lane sửa dở và ra một bảng từ mã nửa vời — lần đó có người phát
 *     hiện, tiến trình nền thì không. Ngừng rồi thì NÓI RÕ TRÊN TRANG vì sao đang
 *     ngừng: bảng cũ im lặng trông y hệt bảng mới.
 *     Cách chốt này được cài: khi ngừng thì thậm chí KHÔNG `import` bộ sinh — nạp một
 *     file đang sửa dở đã đủ ném lỗi. Chốt nằm ở đường nạp, không phải ở lời hứa.
 *
 *   ⑵ CHỈ sinh bảng HTML. Không đụng bộ sinh đối chiếu tính năng (bảng FEATURE PARITY) —
 *     nửa file đó là chữ của người và cần khoá `_root`. Một tiến trình nền ghi vào đó
 *     là máy của Đức làm bẩn cây làm việc của lane đang chạy.
 *
 *   ⑶ Không commit, không đẩy, không nhận/trả khoá. Lõi này KHÔNG chạy một lệnh nào của
 *     hệ điều hành — cả thư mục không nạp mô-đun chạy tiến trình con nào, và phép ghim
 *     `tests/bang-ba-cua-smoke.mjs` đếm để chắc là còn đúng thế. (Phép ghim quét chính
 *     mã ở đây, nên đừng gõ tên mô-đun đó ra trong văn: nó sẽ tự bắt mình.)
 *
 *   ⑷ Gộp nhịp. Vòng canh nền so DẤU VÂN TAY của repo mỗi nhịp rồi mới sinh, chứ không
 *     sinh theo từng sự kiện file. Một lượt lane làm việc đổi hàng chục file.
 *
 * BẢN RA KHÔNG NẰM TRONG REPO: ghi ra `BANG.html` ngay cạnh file này, đã cho vào
 * `.gitignore`. Cố ý — bản đã commit ở gốc repo là việc của phiên AI lúc đóng phiên
 * (cổng kiểm bắt), còn ba cửa này không được phép làm bẩn cây làm việc của ai.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
export const GOC = path.resolve(THU_MUC, "..");
export const FILE_BANG = path.join(THU_MUC, "BANG.html");
export const FILE_TRANG_THAI = path.join(THU_MUC, "trang-thai.json");
export const FILE_DUNG = path.join(THU_MUC, "DUNG.txt");
export const FILE_CLAIMS = path.join(GOC, ".agents", "claims.json");

/* Khoá che `scripts/` + `tests/`, tức là che chính bộ sinh. Xem chốt ⑴. */
export const KHOA_NGUNG = "_code";

/* MỎ NEO để chèn băng thông báo: khối cảnh báo "bảng đã cũ" mà bộ sinh luôn đặt ngay
 * dưới thanh mốc. Đếm số chỗ khớp — ra 0 là THƯỚC HỎNG, không phải "không có gì phải
 * chèn", nên hàm NÉM chứ không lặng lẽ trả về bản không băng. */
const MO_NEO = /<div class="cu" id="cu" data-sinh="[^"]*"><\/div>/;
const DAU_MO = "<!--BANG-BA-CUA:BANG-->";
const DAU_DONG = "<!--/BANG-BA-CUA:BANG-->";
const NL = "\n";

const esc = (s) => String(s ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const hai = (n) => String(n).padStart(2, "0");

/* "12:45 ngày 06/09/2026" — giờ máy của Đức, vì đây là thứ Đức đọc để biết bảng mới hay cũ. */
export function gioVN(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `${hai(d.getHours())}:${hai(d.getMinutes())} ngày ${hai(d.getDate())}/${hai(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/* Ai đang giữ một khoá. Đọc THẲNG file, không qua công cụ nào — chỉ đọc, và đọc hỏng
 * thì coi như CÓ CHỦ (ngừng sinh). Fail-closed: không đọc được bảng quyền là lúc ít có
 * cơ sở nhất để tin rằng chạy bộ sinh là an toàn. */
export function docChuKhoa(khoa = KHOA_NGUNG, file = FILE_CLAIMS) {
  try {
    const bang = JSON.parse(fs.readFileSync(file, "utf8"));
    const o = bang?.claims?.[khoa]?.owner;
    return o ? String(o) : null;
  } catch {
    return `KHÔNG ĐỌC ĐƯỢC BẢNG QUYỀN`;
  }
}

export function docTrangThai(file = FILE_TRANG_THAI) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return null; }
}

export function ghiTrangThai(tt, file = FILE_TRANG_THAI) {
  fs.writeFileSync(file, `${JSON.stringify(tt, null, 2)}${NL}`, "utf8");
}

/* ---- băng thông báo ------------------------------------------------------
 *
 * Thuần: cùng một `tt` cho ra cùng một chuỗi, nên sinh hai lần trên cùng HEAD với cùng
 * trạng thái là giống hệt từng byte. Thứ duy nhất phụ thuộc đồng hồ nằm TRONG `tt`.
 *
 * Ý tưởng: gỡ băng cũ trước rồi chèn băng mới, nên gọi bao nhiêu lần cũng ra một băng.
 * Nhờ đó máy chủ đắp lại băng lúc phục vụ (thêm nút Làm mới) mà không phải sinh lại
 * cả trang. */
export function chenBang(html, tt = {}) {
  const gocHtml = goBang(html);
  if (!MO_NEO.test(gocHtml)) {
    throw new Error(
      "MO_NEO_0: không tìm thấy chỗ chèn băng thông báo trong trang. Bộ sinh đã đổi cấu " +
      "trúc — sửa MO_NEO trong loi.mjs. KHÔNG được lặng lẽ bỏ băng: trang không tự nói ra " +
      "giới hạn của nó là trang làm Đức tin nhầm."
    );
  }
  return gocHtml.replace(MO_NEO, (khop) => `${khop}${NL}${bang(tt)}`);
}

/* Bộ sinh KHÔNG in `<meta charset>` — cố ý, vì bản đã commit sinh ra để nhúng vào một khung
 * trang đã khai sẵn charset. Nhưng ba cửa này mở file THẲNG bằng trình duyệt, và một trang
 * tiếng Việt không khai charset thì trình duyệt đoán — đoán sai là Đức nhận về một trang đầy
 * ký tự rác. Thêm ở đây, không sửa bộ sinh: bản đã commit phải giữ nguyên từng byte, nếu
 * không thì cổng chặn đẩy với MỌI phiên. */
/* BẢN SỐNG PHẢI NÓI NÓ LÀ BẢN SỐNG — N-11.
 *
 * Bộ sinh in câu của BẢN CHỤP, vì bản nó ghi ra là bản đi vào git. Ba cửa này ghi ra một file
 * khác, dựng lại mỗi lần nhấp — nên câu đó sai ở đây, và sai theo hướng nguy nhất: bảo Đức đi
 * nhấp đúp đúng cái ông vừa nhấp. Đổi bằng cách thay CHUỖI HẰNG, không gõ lại chữ: hai câu
 * gõ tay ở hai file là hai câu sẽ lệch nhau ở lượt sửa thứ ba.
 *
 * Không tìm thấy câu khai thì NÉM LỖI, đừng bỏ qua: bộ sinh đã đổi chữ, và một bản sống mang
 * câu của bản chụp là đúng cái lỗi N-11 sinh ra để chặn. */
export async function doiSangBanSong(html) {
  const { KHAI_BAN_CHUP, KHAI_BAN_SONG } = await import("../scripts/build-overview.mjs");
  if (!html.includes(KHAI_BAN_CHUP)) {
    throw new Error(
      "KHAI_BAN_0: không thấy câu tự khai của bản chụp trong trang. Bộ sinh đã đổi chữ — sửa " +
      "KHAI_BAN_CHUP ở build-overview.mjs, đừng gõ lại chữ ở đây. KHÔNG được lặng lẽ bỏ qua: " +
      "bản sống mang câu của bản chụp là bảo Đức đi nhấp đúp đúng cái vừa nhấp."
    );
  }
  return html.split(KHAI_BAN_CHUP).join(KHAI_BAN_SONG);
}
export function themCharset(html) {
  return /<meta\s+charset/i.test(html) ? html : `<meta charset="utf-8">${NL}${html}`;
}

export function goBang(html) {
  const i = html.indexOf(DAU_MO);
  if (i < 0) return html;
  const j = html.indexOf(DAU_DONG, i);
  if (j < 0) return html;
  // Nghịch đảo ĐÚNG của lượt chèn: nuốt cả dấu xuống dòng đứng ngay trước băng, vì chính
  // lượt chèn đã thêm nó. Bỏ sót một byte ở đây thì mỗi lượt đắp lại băng lại dôi ra một
  // dòng trống, và phép ghim "sinh hai lần giống hệt từng byte" ĐỎ — nó đã đỏ thật.
  const dau = html[i - 1] === NL ? i - 1 : i;
  return html.slice(0, dau) + html.slice(j + DAU_DONG.length);
}

function bang(tt) {
  const { ngung = false, chuKhoa = null, luc = null, nhip = null, quaMayChu = false } = tt;
  const nen = ngung ? "var(--warn-bg,#F7E7D5)" : "var(--inset,#F6F8F7)";
  const vien = ngung ? "var(--warn,#A9500B)" : "var(--line,#D8DFDB)";
  const d = [];

  d.push(`${DAU_MO}`);
  d.push(`<div id="bang-ba-cua" data-nhip="${esc(nhip ?? "")}" style="background:${nen};border:1px solid ${vien};border-left-width:4px;border-radius:8px;padding:12px 14px;margin:12px 0;font-size:13px;line-height:1.55">`);

  if (ngung) {
    d.push(`  <div style="font-weight:600">ĐANG NGỪNG SINH LẠI — phiên “${esc(chuKhoa)}” đang giữ khoá ${esc(KHOA_NGUNG)}.</div>`);
    d.push(`  <div>Bộ sinh bảng nằm trong vùng đó và có thể đang sửa dở, nên chạy nó lúc này có thể ra một bảng từ mã nửa vời. Bảng dưới đây là <b>bản cũ</b>${luc ? `, sinh lúc ${esc(gioVN(luc) ?? luc)}` : ""}. Phiên đó trả khoá xong là bảng tự sinh lại.</div>`);
  } else {
    d.push(`  <div><b>Bảng sinh lúc ${esc(gioVN(luc) ?? "—")}.</b>${quaMayChu ? ` <a href="/lam-moi" style="color:inherit">Làm mới ngay</a>` : ""}</div>`);
  }

  d.push(`  <div style="margin-top:6px">Bảng đọc từ những gì <b>đã commit</b>. Việc một phiên AI đang làm mà <b>chưa commit thì không hiện ở đây</b> — bảng quyền thì ngược lại, nó đọc thẳng file nên luôn mới.</div>`);
  d.push(`  <div id="bang-ba-cua-nhip" style="margin-top:6px;opacity:.85"></div>`);
  d.push(`</div>`);
  d.push(`<script>`);
  d.push(`(function(){`);
  d.push(`  var o=document.getElementById("bang-ba-cua"),d=document.getElementById("bang-ba-cua-nhip");`);
  d.push(`  if(!o||!d)return;`);
  d.push(`  var n=o.getAttribute("data-nhip"),t=n?new Date(n):null;`);
  d.push(`  if(!t||isNaN(t.getTime())){d.textContent="Canh nền: chưa bật lần nào. Muốn bảng tự mới thì nhấp đúp Bat-tu-chay.cmd.";return;}`);
  d.push(`  var p=function(x){return String(x).padStart(2,"0")};`);
  d.push(`  var g=p(t.getHours())+":"+p(t.getMinutes())+" ngày "+p(t.getDate())+"/"+p(t.getMonth()+1)+"/"+t.getFullYear();`);
  d.push(`  var phut=(Date.now()-t.getTime())/60000;`);
  d.push(`  d.textContent=phut>5`);
  d.push(`    ? "Canh nền: KHÔNG chạy — nhịp cuối lúc "+g+". Nhấp đúp Bat-tu-chay.cmd để bật lại."`);
  d.push(`    : "Canh nền: đang chạy — nhịp lúc "+g+".";`);
  d.push(`})();`);
  d.push(`</script>`);
  d.push(`${DAU_DONG}`);
  return d.join(NL);
}

/* Trang tối thiểu cho trường hợp hiếm: cửa nào đó chạy lần đầu ĐÚNG LÚC một phiên đang
 * giữ `_code`, nên chưa từng có bảng nào để mà hiện. Vẫn phải nói ra, không được để một
 * cú nhấp đúp mở ra khoảng trắng. */
export function trangNgungToiThieu(tt) {
  return [
    `<meta charset="utf-8">`,
    `<title>Bảng trạng thái — đang ngừng sinh</title>`,
    `<div style="font:14px/1.6 system-ui,sans-serif;max-width:720px;margin:40px auto;padding:0 16px">`,
    `  <h1 style="font-size:20px">ĐANG NGỪNG SINH LẠI — chưa có bảng để hiện</h1>`,
    `  <p>Phiên “${esc(tt.chuKhoa)}” đang giữ khoá ${esc(KHOA_NGUNG)}, tức là bộ sinh bảng có thể đang sửa dở. Chạy nó lúc này có thể ra một bảng sai, nên đã ngừng.</p>`,
    `  <p>Phiên đó trả khoá xong thì mở lại trang này (hoặc nhấp đúp <b>Xem-bang.cmd</b>) là có bảng.</p>`,
    `</div>`,
    ``
  ].join(NL);
}

/* ---- lõi: một lượt sinh lại --------------------------------------------- */
/* `docChu` tách ra làm tham số để phép ghim thử được cả hai nhánh mà không phải đụng
 * vào bảng quyền thật — bảng đó có dấu niêm phong, và sửa tay nó làm vỡ dấu. */
export async function sinhLai({
  goc = GOC,
  fileBang = FILE_BANG,
  fileTrangThai = FILE_TRANG_THAI,
  docChu = () => docChuKhoa(),
  luc = new Date().toISOString(),
  nhip = null
} = {}) {
  const cu = docTrangThai(fileTrangThai) ?? {};
  const chuKhoa = docChu();

  // ⑴ CHỐT: có chủ thì KHÔNG nạp bộ sinh, không sinh.
  if (chuKhoa) {
    const tt = {
      ngung: true,
      chuKhoa,
      luc: cu.luc ?? null,
      nhip: nhip ?? cu.nhip ?? null,
      ly_do: `khoá ${KHOA_NGUNG} đang do phiên "${chuKhoa}" giữ`
    };
    let html;
    try { html = themCharset(chenBang(fs.readFileSync(fileBang, "utf8"), tt)); }
    catch { html = trangNgungToiThieu(tt); }
    fs.writeFileSync(fileBang, html, "utf8");
    ghiTrangThai(tt, fileTrangThai);
    return tt;
  }

  // ⑵ CHỈ bảng HTML. Nạp muộn, sau khi chốt ⑴ đã cho qua.
  /* `sinhTrang(createDefaultDeps(goc))` LA API CU — ca hai ham bien mat o luot migrate bo khung
     (4da1e9e5), nen dong nay nem `sinhTrang is not a function` MOI LAN ba cua duoc nhap. Tuc
     bang song cua Duc hong tu 10/09, va phep ghim cua no nam trong chuoi `npm test` da chet o
     bai dau tien. Nay goi dung API hien tai: `trang(await gomDuLieu())`. */
  const { trang, gomDuLieu } = await import("../scripts/build-overview.mjs");
  const html = trang(await gomDuLieu());

  const tt = { ngung: false, chuKhoa: null, luc, nhip: nhip ?? cu.nhip ?? null, ly_do: null };
  fs.writeFileSync(fileBang, themCharset(chenBang(await doiSangBanSong(html), tt)), "utf8");
  ghiTrangThai(tt, fileTrangThai);
  return tt;
}

/* ---- ⑷ dấu vân tay của repo, để gộp nhịp -------------------------------
 *
 * Đọc bằng hệ thống file, KHÔNG gọi lệnh nào (chốt ⑶). Đủ để biết "có commit mới" và
 * "bảng quyền vừa đổi" — hai thứ duy nhất làm nội dung bảng đổi. */
export function vanTay(goc = GOC) {
  const phan = [];
  try {
    const head = fs.readFileSync(path.join(goc, ".git", "HEAD"), "utf8").trim();
    phan.push(head);
    const m = /^ref:\s*(.+)$/.exec(head);
    if (m) {
      try { phan.push(fs.readFileSync(path.join(goc, ".git", ...m[1].split("/")), "utf8").trim()); }
      catch { phan.push(String(fs.statSync(path.join(goc, ".git", "packed-refs")).mtimeMs)); }
    }
  } catch { phan.push("khong-doc-duoc-git"); }
  try { phan.push(String(fs.statSync(path.join(goc, ".agents", "claims.json")).mtimeMs)); }
  catch { phan.push("khong-doc-duoc-quyen"); }
  return phan.join("|");
}

/* Chạy thẳng: một lượt sinh, dùng cho cửa ① (nhấp đúp). */
async function main() {
  try {
    const tt = await sinhLai();
    if (tt.ngung) {
      console.log(`ĐANG NGỪNG SINH LẠI: ${tt.ly_do}.`);
      console.log(`Bảng đang hiện là bản cũ${tt.luc ? ` sinh lúc ${gioVN(tt.luc)}` : ""}.`);
    } else {
      console.log(`Đã sinh lại bảng lúc ${gioVN(tt.luc)}.`);
    }
    process.exit(0);
  } catch (loi) {
    console.error(`KHÔNG SINH ĐƯỢC BẢNG: ${loi.message}`);
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) main();

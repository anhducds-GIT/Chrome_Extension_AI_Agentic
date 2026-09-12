/* BẢNG TỔNG QUAN — một layout dùng chung cho MỌI repo dựng từ harness.
 *
 *   node scripts/build-overview.mjs <file-ra.html>
 *
 * Vì sao layout này ở trong harness chứ không viết lại mỗi lần: mỗi repo tự nghĩ ra một cách bày
 * là 21 repo có 21 cách đọc, và người xem phải học lại từ đầu ở mỗi chỗ. Cùng một khung tab thì
 * nhìn repo nào cũng biết mục nào ở đâu.
 *
 * MỌI PHẦN ĐỌC TỪ FILE, không gõ vào đây:
 *   package.json            -> tên · phiên bản · danh sách lệnh (tức FEATURE LIST)
 *   AGENTS.md mục 6         -> bảng "khi bạn sắp… thì mở file nào"
 *   docs/workflows/*.md     -> workflow, kèm lưu đồ mermaid
 *   docs/protocols/*.md     -> protocol
 *   docs/adr/*.md           -> quyết định đã chốt
 *   docs/LEGEND.md          -> tra cứu từ
 *   CHANGELOG.md            -> nhật ký, gập được
 * Thiếu file nào thì mục đó **biến mất êm**, không vỡ trang — repo khác sẽ không có đủ cả bảy.
 *
 * BẢN RA CÓ COMMIT (đổi 04/09, Đức chốt) — `DASHBOARD-Ark-Repo-Harness.html` ở gốc repo.
 * Trước đó bảng chỉ tồn tại dạng artifact trên claude.ai, tức là muốn xem trạng thái repo thì
 * phải có một phiên Claude đăng hộ: điểm phụ thuộc một AI duy nhất của cả hệ. File trong repo
 * xoá bỏ chỗ đó — mở bằng trình duyệt là xong, không nhờ ai. Đổi lại, nội dung phải suy HOÀN
 * TOÀN TỪ HEAD (xem `doc`/`liet` và `mocHEAD` bên dưới): nó nằm trong khối `generators` nên
 * cổng kiểm nó mỗi phiên, và một bộ sinh nhìn đồng hồ hay nhìn đĩa sẽ chặn push của MỌI phiên.
 */

import { execFileSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { esc, md, tachFrontmatter } from "./md-mini.mjs";
import { CSS_LUU_DO } from "./luu-do.mjs";

/* CHỈ NHẬP TỪ BA FILE, và cả ba ĐỀU ĐI THEO BẢN TRÍCH.
 *
 * Đây là điều kiện để trang này phát đi được. Bản 1.3.16 nhập từ `giao-viec.mjs` và
 * `build-so-migrate.mjs` — hai lệnh **ở lại repo nhà** — nên phát đi là repo đích nạp trang
 * chết ngay dòng import, với một câu lỗi không nói gì về nguyên nhân thật. Hằng số và bộ đọc
 * đã dời sang `overview-doc.mjs`; chiều phụ thuộc nay chảy từ thứ ở lại sang thứ đi theo. */
import { ageHours, ageLabel, DAU_VET, dangNhac, doDauVet, GIO_NHAC as GIO_NHAC_BANG, mocCoGio, noiDauVet } from "./claim.mjs";
import {
  BAC, docChecklistTinhNang, khoangNgay, nguonLamMoi, noiTuoi, quetDauDuc, readBatBien, readCoChe,
  readHoSo, readIdeas, readKhoa, readNo, THU_MUC_MIGRATE, VIEC
} from "./overview-doc.mjs";
import { tenTrangFrom } from "./repo-structure.mjs";

const NL = String.fromCharCode(10);

/* SỔ CÒN SỐNG — nơi DUY NHẤT được sinh ra việc chờ người chốt.
 *
 * `HANDOFF.md` CỐ Ý KHÔNG có trong danh sách này, và đó là cả điểm của hằng số.
 *
 * Đo 07/09 trên bản đã commit: 13 dấu chờ, trong đó **8 dấu đến từ `HANDOFF.md`** — mà
 * `HANDOFF.md` là nhật ký **chỉ thêm dòng**. Nghĩa là mỗi lần một phiên *kể lại* rằng có việc
 * chờ Đức thì lần kể đó thành một việc mới, **vĩnh viễn**: con số chỉ có một chiều là tăng, và
 * nó tăng theo SỐ PHIÊN chứ không theo số việc thật. Ba trong tám dấu ảo còn tệ hơn — một dấu
 * nằm trong câu giải thích CHÍNH quy ước dấu, tức bảng biến sách hướng dẫn của nó thành việc.
 *
 * Luật một dòng: **thứ không hành động được nữa thì không được sinh ra việc.** Nhật ký là chỗ
 * kể lại. Sổ nợ, sổ ý tưởng, hồ sơ trạng thái là chỗ giao việc.
 *
 * Khai thành hằng số export được, không phải một mảng gõ trong hàm — để phép ghim đọc được
 * chính danh sách này thay vì gõ lại tên file lần thứ hai. */
export const SO_CON_SONG = Object.freeze(["BACKLOG.md", "IDEAS.md", "STATUS.md"]);

/* Bật bằng `--khoa-song` hoặc biến môi trường `ARK_KHOA_SONG=1`. Biến môi trường có vì cửa
 * nhấp đúp gọi lệnh qua nhiều lớp và một cờ dòng lệnh dễ rơi mất giữa đường. */
const KHOA_SONG = process.argv.includes("--khoa-song") || process.env.ARK_KHOA_SONG === "1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/* ĐỌC TỪ HEAD, KHÔNG ĐỌC TỪ ĐĨA — và đây là chỗ dễ làm tê cả repo nhất, nên nói to.
 *
 * Từ khi trang này được commit, nó nằm trong khối `generators`: cổng đóng phiên chạy
 * `--check-head` mỗi lượt và `safe-push` từ chối đẩy khi bản đã commit lệch HEAD. Nếu bộ sinh
 * đọc THƯ MỤC LÀM VIỆC thì bất kỳ file sửa dở nào của bất kỳ phiên nào cũng làm trang lệch —
 * và phiên bị chặn sẽ không hiểu vì sao, vì cái làm lệch không nằm trong commit của họ.
 * Đọc từ HEAD thì "sinh" và "kiểm" hỏi cùng một câu, nên hai bên không thể trả lời khác nhau. */
const gitRa = (...args) => execFileSync("git", ["-c", "core.quotepath=false", ...args],
  { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
const doc = (rel) => { try { return gitRa("show", `HEAD:${rel}`); } catch (_) { return null; } };
/* Trang .html ở GỐC repo, theo HEAD. Dùng để "Trang liên quan" chỉ trỏ tới trang có thật. */
const lietHTML = () => {
  try {
    return gitRa("ls-tree", "-z", "--name-only", "HEAD")
      .split(String.fromCharCode(0)).filter((f) => f.endsWith(".html"));
  } catch (_) { return []; }
};
const liet = (rel) => {
  try {
    return gitRa("ls-tree", "-z", "--name-only", `HEAD:${rel}`)
      .split("\0").filter((f) => f.endsWith(".md")).sort();
  } catch (_) { return []; }
};
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/* Mốc ngày của HEAD — thứ thay thế cho đồng hồ ở MỌI phép tính trong file này.
 *
 * FAIL-CLOSED, không fail-open. Lùi về `new Date()` khi không hỏi được git thì đúng một chỗ
 * này mở lại cửa hậu mà cả đoạn ghi chú ở `ngay:` vừa đóng: sang ngày là lệch HEAD, cổng đỏ
 * với mọi phiên, và không ai lần ra vì sao. Chết ngay tại chỗ kèm tên nguyên nhân thì rẻ hơn. */
/* MỐC ĐẦY ĐỦ (có giờ phút) — cho ô "giữ khoá bao lâu".
 *
 * `mocHEAD()` chỉ trả NGÀY, đủ cho "hôm nay" trên trang nhưng không đủ cho một con số tính bằng
 * PHÚT. Đó là vì sao ô thời-gian-giữ-khoá vẫn còn đọc `Date.now()` sau khi cả file này đã học
 * bài "bộ sinh không nhìn đồng hồ" ở hai chỗ khác.
 *
 * `KHUNG-63`, đo 10/09: cổng đòi trang tươi → sinh lại rồi commit → commit làm mất hiệu lực dấu
 * xác nhận → suite chạy ~19 phút → 19 phút sau con số phút đã đổi → trang lại cũ. **Lane nào giữ
 * khoá vùng thì KHÔNG BAO GIỜ đóng được phiên**, trong khi luật lại bắt giữ khoá cho tới khi đã
 * đẩy. Một vòng không lối ra, và nó chỉ nổ ở repo khai `build-overview.mjs` trong `generators`.
 *
 * FAIL-CLOSED y như `mocHEAD`: không hỏi được git thì KHÔNG sinh. Lùi về `new Date()` là dựng
 * lại đúng cửa hậu vừa đóng. */
export function mocHEADLuc() {
  let ra;
  try { ra = gitRa("log", "-1", "--format=%cI").trim(); }
  catch (e) { throw new Error(`MOC_HEAD_HONG: không hỏi được git về LÚC của HEAD (${String(e.message).split(NL)[0]}). Trang này phải suy mốc từ HEAD chứ không từ đồng hồ — không suy được thì KHÔNG sinh.`); }
  const d = new Date(ra);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`MOC_HEAD_HONG: lúc của HEAD đọc ra "${ra}", không phải một mốc thời gian. Trang này phải suy mốc từ HEAD — đọc không ra thì KHÔNG sinh.`);
  }
  return d;
}

export function mocHEAD() {
  let ra;
  try { ra = gitRa("log", "-1", "--format=%cd", "--date=format:%Y-%m-%d").trim(); }
  catch (e) { throw new Error(`MOC_HEAD_HONG: không hỏi được git về ngày của HEAD (${String(e.message).split(NL)[0]}). Trang này phải suy mốc từ HEAD chứ không từ đồng hồ — không suy được thì KHÔNG sinh.`); }
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(ra)) {
    throw new Error(`MOC_HEAD_HONG: ngày của HEAD đọc ra "${ra}", không phải dạng YYYY-MM-DD. Trang này phải suy mốc từ HEAD — đọc không ra thì KHÔNG sinh.`);
  }
  return ra;
}

/* NGÀY SINH CỦA MỘT DÒNG — dùng để nói một việc chờ người chốt đã treo bao lâu.
 *
 * `git log -L n,n:file` chứ không phải đồng hồ. Cùng lý do với `mocHEAD`: bảng nằm trong khối
 * `generators`, nên một con số nhìn đồng hồ là sang ngày mọi phiên bị chặn đẩy.
 *
 * `null` = KHÔNG ĐO ĐƯỢC, và null khác 0. Dòng vừa thêm mà chưa commit thì git không biết nó,
 * và bảng phải nói "chưa đo được tuổi" chứ không phải "treo 0 ngày" — hai câu đó khác nhau. */
function ngaySinhDong(rel, soDong) {
  try {
    const ra = gitRa("log", "-1", "--format=%cs", `-L${soDong},${soDong}:${rel}`).split(NL)[0].trim();
    return /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(ra) ? ra : null;
  } catch (_) { return null; }
}

/* ---- gom dữ liệu ----------------------------------------------------------- */

export function docTaiLieu(thuMuc) {
  return liet(thuMuc).map((f) => {
    const { fm, than } = tachFrontmatter(doc(`${thuMuc}/${f}`) || "");
    const tieuDe = (than.split(CR).join("").split(NL).find((l) => l.startsWith("# ")) || `# ${f}`).slice(2).trim();
    return { file: f, fm, than, tieuDe };
  });
}
const CR = String.fromCharCode(13);

/* Bảng mục 6 của AGENTS.md = danh sách "làm được gì". Đọc từ đó thay vì gõ lại: bảng ấy vốn đã
   là hợp đồng giữa repo và mọi phiên AI, nên nó không bao giờ cũ hơn thực tế. */
export function docBanDo(luat) {
  if (!luat) return [];
  const dong = luat.split(CR).join("").split(NL);
  const dau = dong.findIndex((l) => l.startsWith("## 6."));
  if (dau < 0) return [];
  const het = dong.findIndex((l, i) => i > dau && l.startsWith("## 7."));
  return dong.slice(dau, het < 0 ? dong.length : het)
    .filter((l) => l.startsWith("|") && !/^\|[\s:|-]+\|?\s*$/.test(l) && !/^\|\s*Khi bạn sắp/.test(l))
    .map((l) => l.replace(/^\||\|$/g, "").split("|").map((c) => c.trim()))
    .filter((c) => c.length >= 2 && c[0]);
}

/* Bản đồ ĐẦY ĐỦ: file khai ở `docs.file_map`. Định dạng khác bảng — mỗi mục là `### <khi nào>`
   rồi một đoạn văn — nên đọc riêng, không dùng lại bộ đọc bảng. */
export function banDoKhaiTu(rawJson) {
  /* Đọc từ CHỮ THÔ, không đòi đối tượng đã parse: bộ sinh chỉ có `doc()` đọc theo HEAD, và cấu
     trúc đã parse nằm ở một hàm khác. Hỏng JSON thì trả null — bảng vẫn dựng được, chỉ mất phần
     bản đồ đầy đủ, và cổng cấu trúc mới là chỗ báo JSON hỏng. */
  try {
    const v = JSON.parse(rawJson || "{}")?.docs?.file_map;
    return (typeof v === "string" && v.trim()) ? v.trim() : null;
  } catch { return null; }
}
export function docBanDoChiTiet(text) {
  if (!text) return [];
  const dong = String(text).split(CR).join("").split(NL);
  const ra = [];
  let ten = null;
  let than = [];
  for (const d of dong) {
    const m = /^###\s+(.+)$/.exec(d);
    if (m) { if (ten) ra.push([ten, than.join(" ").trim()]); ten = m[1].trim(); than = []; continue; }
    if (ten) than.push(d);
  }
  if (ten) ra.push([ten, than.join(" ").trim()]);
  return ra.filter((c) => c[0] && c[1]);
}

/* Nhật ký: mỗi khối `## <bản> — <ngày> — <một câu>`. Bản đầu mở sẵn, các bản cũ gập lại — người
   xem quan tâm "vừa đổi gì", không phải toàn bộ lịch sử. */
/* VIỆC ĐÃ XONG 100% — đọc từ sổ nợ, mục có mã BỊ GẠCH (`### ~~MÃ~~ · …`).
 *
 * Vì sao tab này đáng có: bảng vốn chỉ chiếu thứ ĐANG mở — việc còn lại, nợ còn treo, chỗ chờ
 * người chốt. Người chốt nhìn mãi một danh sách việc chưa xong thì không thấy repo đang tiến,
 * chỉ thấy nó đang nợ. Việc đã đóng là bằng chứng ngược lại, và nó vốn đã nằm sẵn trong sổ —
 * chỉ là không ai chiếu ra.
 *
 * ĐỌC ĐÚNG QUY ƯỚC SỔ, không dò từ khoá trong văn xuôi: gạch mã là cách sổ khai "đã đóng", và
 * `what-next.mjs` cũng đọc đúng dấu đó. Hai chỗ đọc cùng một dấu thì không trôi khỏi nhau. */
export function tachDaXong(text) {
  if (!text) return [];
  const ra = [];
  let uuTien = "";
  for (const dong of String(text).replaceAll(CR, "").split(NL)) {
    const p = /^##\s+(P[1-9])\b/.exec(dong);
    if (p) { uuTien = p[1]; continue; }
    const m = /^###\s+~~([A-Za-z0-9]+-\d+)~~\s*[·:]?\s*(.*)$/.exec(dong);
    if (m) ra.push({ ma: m[1], tieuDe: m[2].trim(), uuTien });
  }
  return ra;
}

function tachNhatKy(text) {
  if (!text) return [];
  const dong = text.split(CR).join("").split(NL);
  const ra = [];
  let hien = null;
  for (const l of dong) {
    const m = l.match(/^##\s+(\S+)\s+—\s+(\S+)\s+—\s+(.*)$/);
    if (m) { hien = { ban: m[1], ngay: m[2], tomTat: m[3], than: [] }; ra.push(hien); continue; }
    if (hien) hien.than.push(l);
  }
  return ra.map((k) => ({ ...k, than: k.than.join(NL).trim() }));
}

/* ---- trang ----------------------------------------------------------------- */

const CSS = `

/* Banner "trang có thể đã cũ" — đỏ, chiếm trọn dòng đầu, chỉ hiện khi quá 7 ngày.
   Trang là file tĩnh đem publish, nên nó PHẢI tự biết mình bao nhiêu tuổi ở lúc XEM,
   không phải lúc sinh. Ngày sinh thì luôn hiện, kể cả khi còn mới. */
.cu{display:none;background:#FBE3E0;color:#8C3A34;border:1px solid #E7B8B2;border-radius:9px;
  padding:11px 16px;margin:0 0 16px;font-weight:600;font-size:14px;text-align:center}
.cu[data-hien="1"]{display:block}
:root:not([data-theme="light"]) .cu{background:#3A1D1A;color:#E8A29A;border-color:#5C302A}
@media (prefers-color-scheme:light){:root:not([data-theme="dark"]) .cu{background:#FBE3E0;color:#8C3A34;border-color:#E7B8B2}}

.nn{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:1px;
  background:var(--vien);border:1px solid var(--vien);border-radius:11px;overflow:hidden;margin:0 0 16px}
.nn .m{background:var(--mat);padding:15px 17px;display:flex;flex-direction:column;gap:5px}
.nn .m.viec{background:var(--vang-nen)}
.nn .nhan{font-family:var(--mono);font-size:10.2px;letter-spacing:.11em;text-transform:uppercase;color:var(--mo)}
.nn .m.viec .nhan{color:var(--vang)}
.nn .gt{font-size:15px;font-weight:600;line-height:1.35;color:var(--chu)}
.nn .gt.to{font-family:var(--disp);font-size:21px;font-weight:800;letter-spacing:-.02em}

.vong{display:flex;align-items:center;gap:0;margin:6px 0 2px;overflow-x:auto;padding:6px 0}
.vong .b{display:flex;flex-direction:column;align-items:center;gap:7px;flex:1;min-width:82px}
.vong .cham{width:15px;height:15px;border-radius:50%;background:var(--vien2);border:3px solid var(--mat)}
.vong .b.qua .cham{background:var(--xanh)}
.vong .b.nay .cham{background:var(--mat);border-color:var(--nhan);box-shadow:0 0 0 4px var(--nhan-nen)}
.vong .ten{font-family:var(--mono);font-size:10.4px;letter-spacing:.08em;text-transform:uppercase;color:var(--mo);white-space:nowrap}
.vong .b.nay .ten{color:var(--nhan);font-weight:600}
.vong .noi{height:2px;background:var(--vien);flex:1;margin-bottom:19px;min-width:14px}
.vong .noi.qua{background:var(--xanh)}

/* MÔ HÌNH BA KHỐI — Đức mô tả 06/09: một khối DỮ LIỆU LÕI, một khối PROTOCOL, một khối
   REPO ĐÍCH, và luồng chạy cả BÊN TRONG từng khối lẫn GIỮA các khối.

   Vẽ bằng lưới CSS chứ không bằng thư viện vẽ sơ đồ: trang này là file tĩnh đem gửi cho
   người khác mở, nên nó không được phụ thuộc vào một CDN còn sống hay không. */
.mh{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:0;align-items:stretch;margin:14px 0 6px}
.mh-cot{background:var(--mat);border:1px solid var(--vien);border-radius:11px;padding:14px 15px;
  display:flex;flex-direction:column;gap:9px;min-width:0}
.mh-cot.loi{border-color:var(--nhan)}
.mh-so{font-family:var(--mono);font-size:10.2px;letter-spacing:.11em;text-transform:uppercase;color:var(--mo)}
.mh-ten{font-family:var(--disp);font-size:16.5px;font-weight:800;letter-spacing:-.01em;line-height:1.2;color:var(--chu)}
.mh-mota{font-size:13px;color:var(--chu2);line-height:1.45;margin:-3px 0 2px}
.mh-hop{background:var(--nen);border:1px solid var(--vien);border-radius:8px;padding:9px 11px}
.mh-hop h4{margin:0 0 5px;font-family:var(--mono);font-size:10.2px;letter-spacing:.09em;
  text-transform:uppercase;color:var(--mo);font-weight:600}
.mh-hop ul{margin:0;padding-left:16px}
.mh-hop li{font-size:13.2px;line-height:1.5;color:var(--chu)}
.mh-hop li code{font-size:12px}
.mh-mui{display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:0 9px;gap:4px;min-width:56px}
.mh-mui .ky{font-size:20px;color:var(--nhan);line-height:1}
.mh-mui .nh{font-family:var(--mono);font-size:9.6px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--mo);text-align:center;line-height:1.3}
.mh-vai{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:10px 0 0}
.mh-vai .mh-cot{gap:8px}
.mh-vai .giu{font-family:var(--mono);font-size:10px;letter-spacing:.07em;text-transform:uppercase;
  color:var(--nhan)}
.mh-bat{margin:8px 0 0;background:var(--nen);border:1px solid var(--vien);border-radius:9px;
  padding:9px 12px;font-size:13px;line-height:1.5;color:var(--chu)}
.mh-vong{margin:8px 0 0;background:var(--nhan-nen);border:1px dashed var(--nhan);border-radius:9px;
  padding:10px 13px;font-size:13px;line-height:1.5;color:var(--chu)}
.mh-vong b{color:var(--nhan)}
@media (max-width:860px){
  .mh{grid-template-columns:1fr}
  .mh-mui{flex-direction:row;padding:7px 0;min-width:0}
  .mh-mui .ky{transform:rotate(90deg)}
  .mh-vai{grid-template-columns:1fr}
}

/* ---- NĂM TAB MỚI (06/09) — mượn hình từ bảng repo Chrome Extension -------------------
   Không dựng bảng token thứ hai: chúng dùng lại đúng biến màu khai ở khối :root phía trên. Một bảng
   màu thứ hai là hai bảng sẽ lệch nhau, và lúc đó không ai biết màu nào là đúng. */

/* BA CÂU của Tổng quan. Mỗi câu MỘT dòng — nhãn hẹp, câu giãn, liên kết bám phải.
   Không ô đếm, không bảng: thứ gì đếm được thì đã có chỗ canonical của nó. */
.ba-cau{padding:0}
.bc{display:grid;grid-template-columns:132px minmax(0,1fr) auto;gap:12px;align-items:baseline;
  padding:13px clamp(12px,1.5vw,17px);border-top:1px solid var(--vien)}
.bc:first-child{border-top:0}
.bc .n{font-family:var(--mono);font-size:10.4px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--mo);font-weight:600}
.bc .c{font-size:15px;line-height:1.5;color:var(--chu)}
.bc .c .cham{width:9px;height:9px;border-radius:50%;display:inline-block;margin-right:7px;
  vertical-align:1px;flex:0 0 auto}
.bc .c .cham.xanh{background:var(--xanh)}.bc .c .cham.vang{background:var(--vang)}.bc .c .cham.do{background:var(--do)}
.bc a.hieu{text-decoration:none}
.ba-cau > .ghi{padding:0 clamp(12px,1.5vw,17px) 13px;border-top:1px solid var(--vien);padding-top:11px}
@media (max-width:700px){ .bc{grid-template-columns:1fr} }

/* Ô đếm KÈM MẪU SỐ. Một số 0 đứng một mình trông giống hệt nhau ở hai ca ngược nhau:
   "đã dò hết, sạch" và "chưa dò gì cả". Mẫu số là thứ tách được hai ca đó. */
.sk{display:grid;grid-template-columns:repeat(auto-fit,minmax(178px,1fr));gap:1px;
  background:var(--vien);border:1px solid var(--vien);border-radius:11px;overflow:hidden}
.sk .o{background:var(--mat);padding:13px 15px;display:flex;flex-direction:column;gap:3px}
.sk .n{font-family:var(--disp);font-size:27px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.sk .o.sach .n{color:var(--xanh)}
.sk .o.ban .n{color:var(--vang)}
.sk .l{font-size:13.4px;font-weight:600;color:var(--chu)}
.sk .m{font-size:11.8px;color:var(--mo);line-height:1.4}

/* Hàng "số rồi tới chữ" — nợ theo nhóm, khoá, mốc. */
.hs{display:grid;grid-template-columns:46px 1fr;gap:8px;align-items:baseline;
  padding:7px 0;border-top:1px solid var(--vien)}
.hs:first-child{border-top:0}
.hs .n{font-family:var(--mono);font-size:16px;font-weight:600;color:var(--vang);text-align:right}
.hs .t{font-size:14px;color:var(--chu)}

/* Dòng CẦN NGƯỜI CHỐT: nhãn loại việc + câu + tuổi. */
.cd{display:grid;grid-template-columns:56px 1fr;gap:9px;padding:8px 0;border-top:1px solid var(--vien)}
.cd:first-of-type{border-top:0}
.cd .lo{font-family:var(--mono);font-size:10px;letter-spacing:.08em;font-weight:600;
  padding:3px 0;text-align:center;border-radius:5px;height:fit-content}
.cd .lo.bam{background:var(--nhan-nen);color:var(--nhan)}
.cd .lo.chot{background:var(--vang-nen);color:var(--vang)}
.cd .c{font-size:14px;line-height:1.45;color:var(--chu)}
.cd .tu{font-family:var(--mono);font-size:11.4px;color:var(--mo);display:block;margin-top:2px}

/* Một khoá vùng: tên + MỞ/BẬN + ai giữ. */
.kh{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;
  padding:8px 0;border-top:1px solid var(--vien)}
.kh:first-of-type{border-top:0}
.kh .t{font-family:var(--mono);font-size:13.4px;color:var(--chu)}
.kh .t small{font-family:var(--sans);color:var(--mo);font-size:12px;display:block;margin-top:1px}
.hieu{font-family:var(--mono);font-size:10px;letter-spacing:.09em;font-weight:600;
  padding:3px 8px;border-radius:20px;white-space:nowrap}
.hieu.mo{background:var(--xanh-nen);color:var(--xanh)}
.hieu.ban{background:var(--vang-nen);color:var(--vang)}
.hieu.tt{background:var(--mat2);color:var(--chu2)}
/* CHƯA THẤY DẤU VẾT — vàng viền, không vàng đặc: nó là câu hỏi, không phải phán quyết. */
.hieu.cho{background:transparent;color:var(--vang);box-shadow:inset 0 0 0 1px var(--vang)}
/* Ô mốc của sổ migrate. Chữ to, màu theo trạng thái — bảng này để LIẾC, không để đọc. */
.mc{font-size:15px;font-weight:700;text-align:center}
.mc sup{font-size:9px;font-weight:400;opacity:.7}
.mc-xong{color:var(--xanh)}.mc-chua{color:var(--do)}.mc-dang{color:var(--vang)}.mc-trong{color:var(--chu2);opacity:.45}
details.gap>summary{cursor:pointer;font-weight:600;font-size:13px;color:var(--chu2);list-style:none}
details.gap>summary::before{content:'▸ ';color:var(--vang)}
details.gap[open]>summary::before{content:'▾ '}
details.gap[open]>summary{margin-bottom:12px;color:var(--chu)}

/* Thanh ba bậc của một ý tưởng. Bậc "nghỉ" KHÔNG phải bậc thứ tư: nó vẽ thành chấm rỗng có
   gạch ngang, để không ai đọc nhầm một ý tưởng đã bỏ là "gần xong". */
.yt{display:grid;grid-template-columns:minmax(0,1fr) 190px;gap:12px;align-items:center;
  padding:9px 0;border-top:1px solid var(--vien)}
.yt:first-of-type{border-top:0}
.yt .ten{font-size:14px;font-weight:600;color:var(--chu)}
.yt .ke{font-size:12.6px;color:var(--chu2);margin-top:2px;line-height:1.4}
.bac{display:flex;align-items:center;gap:0;position:relative}
.bac .b{flex:1;display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0}
.bac .d{width:11px;height:11px;border-radius:50%;background:var(--vien2);border:2px solid var(--mat)}
.bac .b.qua .d{background:var(--xanh)}
.bac .b.nay .d{background:var(--mat);border-color:var(--nhan);box-shadow:0 0 0 3px var(--nhan-nen)}
.bac .nh{font-family:var(--mono);font-size:9px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--mo);white-space:nowrap}
.bac .b.nay .nh{color:var(--nhan);font-weight:600}
.bac .l{height:2px;background:var(--vien);flex:1;margin-bottom:15px;min-width:8px}
.bac .l.qua{background:var(--xanh)}
.bac.nghi .d{background:transparent;border-color:var(--vien2)}
.bac.nghi::after{content:"";position:absolute;left:6%;right:6%;top:5px;height:2px;
  background:var(--vien2)}

/* Cấu trúc: thư mục / file gốc / bản đồ file. Tab DUY NHẤT được in đường dẫn. */
.cay{display:grid;grid-template-columns:minmax(0,1fr) auto auto;gap:9px;align-items:center;
  padding:7px 0;border-top:1px solid var(--vien)}
.cay:first-of-type{border-top:0}
.cay .p{font-family:var(--mono);font-size:13px;color:var(--chu)}
.cay .st{font-family:var(--mono);font-size:11.4px;color:var(--nhan)}
.cay .sl{font-family:var(--mono);font-size:11.4px;color:var(--mo);white-space:nowrap}
.tep{display:flex;flex-wrap:wrap;gap:5px;margin-top:4px}
.tep span{font-family:var(--mono);font-size:11.6px;padding:3px 7px;border-radius:5px;
  background:var(--mat2);color:var(--chu2)}
.tep span.may{background:var(--xanh-nen);color:var(--xanh)}
@media (max-width:600px){ .yt{grid-template-columns:1fr} .cay{grid-template-columns:1fr auto} }

/* TAB CON — dùng cho tab Migrate, và dùng lại được cho bất kỳ tab nào có nhiều hồ sơ.
   Đức nêu 06/09: "tách riêng các job thành các tab riêng, sẽ dễ theo dõi hơn so với để tràn
   lan". Đúng: sổ migrate xếp ba hồ sơ nối đuôi nhau, và hồ sơ nào cũng dài — người mở ra phải
   cuộn qua hai lượt cũ mới tới lượt mình cần. */
.tabs2{display:flex;gap:4px;flex-wrap:wrap;margin:0 0 12px;padding:4px;
  background:var(--mat2);border:1px solid var(--vien);border-radius:10px}
.tabs2 button{font:inherit;font-size:13.2px;font-weight:600;cursor:pointer;
  padding:7px 13px;border:1px solid transparent;border-radius:7px;background:transparent;
  color:var(--chu2);display:flex;align-items:center;gap:7px}
.tabs2 button:hover{color:var(--chu)}
.tabs2 button[aria-selected="true"]{background:var(--mat);border-color:var(--vien);
  color:var(--chu);box-shadow:var(--bong)}
.tabs2 button .cham{width:8px;height:8px;border-radius:50%;flex:0 0 auto}
.tabs2 button .cham.xanh{background:var(--xanh)}
.tabs2 button .cham.vang{background:var(--vang)}
.tabs2 button .cham.do{background:var(--do)}
.tabs2 button small{font-weight:400;color:var(--mo);font-size:11.4px}
.tab2[hidden]{display:none}

/* CHECKLIST TÍNH NĂNG của một lượt migrate. Bốn trạng thái, và MỘT PHẦN phải nhìn ra
   NGAY là khác THIẾU — mục một phần trông như đang chạy nhưng hỏng ở chỗ không ai nhìn. */
.ckt{display:grid;grid-template-columns:repeat(auto-fit,minmax(112px,1fr));gap:1px;
  background:var(--vien);border:1px solid var(--vien);border-radius:9px;overflow:hidden;margin:8px 0}
.ckt .o{background:var(--mat);padding:9px 11px;gap:1px}
.ckt .o b{font-family:var(--disp);font-size:21px;font-weight:800;line-height:1.05;
  font-variant-numeric:tabular-nums;color:var(--chu)}
.ckt .o.xong b{color:var(--xanh)} .ckt .o.mot-phan b{color:var(--vang)}
.ckt .o.thieu b{color:var(--do)} .ckt .o.ngoai b{color:var(--chu2);opacity:.6}
.ckt .o span{font-size:11.6px;color:var(--mo);line-height:1.3}
.ckb{display:grid;grid-template-columns:76px 1fr auto;gap:9px;align-items:center;
  padding:5px 0;border-top:1px solid var(--vien);font-size:13.4px}
.ckb:first-of-type{border-top:0}
.ckb .ma{font-family:var(--mono);font-size:12px;color:var(--mo)}
.ckb .dm{font-family:var(--mono);font-size:12.4px;white-space:nowrap}
.ckb .dm.het{color:var(--xanh)} .ckb .dm.thieu{color:var(--vang)}
.ckm{display:grid;grid-template-columns:18px 62px 1fr;gap:8px;align-items:baseline;
  padding:4px 0;border-top:1px solid var(--vien);font-size:13.2px}
.ckm:first-of-type{border-top:0}
.ckm .d{text-align:center;font-weight:700}
.ckm.mot-phan .d{color:var(--vang)} .ckm.thieu .d{color:var(--do)} .ckm.xong .d{color:var(--xanh)}
.ckm .ma{font-family:var(--mono);font-size:11.8px;color:var(--mo)}
.ckm .tv{display:block;font-family:var(--mono);font-size:11.6px;color:var(--vang);margin-top:1px}

/* Một dòng sổ nợ: mức ưu tiên · mã · tiêu đề. Mã dùng font mono để mắt bắt được nó trong một
   cột dài — người ta tra sổ nợ bằng MÃ, không bằng tiêu đề. */
.nom{display:grid;grid-template-columns:26px 74px 1fr;gap:8px;align-items:baseline;
  padding:5px 0;border-top:1px solid var(--vien);font-size:13.2px;line-height:1.4}
.nom .ut{font-family:var(--mono);font-size:11px;color:var(--mo)}
.nom .ma{font-family:var(--mono);font-size:11.8px;color:var(--chu2)}
.nom .t{color:var(--chu)}
.nom.chot .ma{color:var(--vang)}
.nom em{color:var(--vang);font-style:normal;font-family:var(--mono);font-size:11.4px}

/* O TIM. Dat ngay duoi thanh tab, khong dat trong header: no la cong cu dung LIEN TUC trong
   luc doc, con header la thu doc mot lan roi thoi. */
.tim-o{margin:0 0 10px}
.tim-o input{width:100%;box-sizing:border-box;font-family:var(--sans);font-size:13.6px;
  padding:9px 13px;border:1px solid var(--vien);border-radius:9px;background:var(--mat);
  color:var(--chu)}
.tim-o input:focus{outline:none;border-color:var(--nhan);box-shadow:0 0 0 3px var(--nhan-nen)}
.tim-kq{border:1px solid var(--vien);border-radius:10px;background:var(--mat);
  padding:9px;margin:0 0 14px;max-height:52vh;overflow-y:auto}
.tim-tom{margin:0 0 7px;font-family:var(--mono);font-size:11.4px;color:var(--mo)}
.tim-khong{margin:0;font-size:13.2px;color:var(--chu2)}
.tim-dong{display:grid;grid-template-columns:96px 1fr;gap:9px;width:100%;text-align:left;
  font:inherit;font-size:13.2px;line-height:1.45;color:var(--chu);background:none;border:0;
  border-top:1px solid var(--vien);padding:6px 4px;cursor:pointer}
.tim-dong:first-of-type{border-top:0}
.tim-dong:hover{background:var(--mat2)}
.tim-dong .nh{font-family:var(--mono);font-size:11px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--mo)}
/* To sang cho vua nhay toi. Khong dung dau hai cham target vi mot phan tu bat ky khong co id. */
.tim-sang{outline:2px solid var(--nhan);outline-offset:3px;border-radius:5px}

/* DANH SÁCH DÀI CHẢY THÀNH NHIỀU CỘT.
 *
 * Đo 08/09 với tab Migrate mở hết: **10.607px chiều cao**, 207 dòng mục xếp mỗi dòng một hàng
 * trên một cột duy nhất — Đức phải cuộn rất dài để đọc một checklist. Bề ngang thì bỏ trống.
 *
 * Dùng "column-width" chứ KHÔNG dùng "column-count": khai bề rộng thì trình duyệt tự tính được
 * bao nhiêu cột vừa màn hình, nên cùng một trang đọc được trên laptop hẹp lẫn màn rộng mà không
 * cần điểm ngắt nào. Khai số cột thì màn hẹp bị ép nhồi và chữ vỡ.
 *
 * "--ck-cot" là biến NGƯỜI XEM chỉnh được (tay kéo ở đầu tab Migrate), nhớ trong trình duyệt của
 * họ. Đức nêu 08/09: *"độ rộng có thể adjustable để tôi chủ động co kéo phù hợp khi xem"*. */
.cot{column-width:var(--ck-cot,360px);column-gap:20px}
.cot > *{break-inside:avoid}
/* Viền trên của dòng đầu MỖI CỘT phải bỏ, không chỉ dòng đầu danh sách — nếu không, đầu cột hai
   trở đi có một gạch cụt trông như lỗi vẽ. */
.cot > *:first-child{border-top:0}

/* Tay kéo bề rộng cột. Một thanh, kéo ngang, và NÓI RA con số — một tay kéo không có số thì
   người dùng không biết mình đang ở đâu và không quay lại được chỗ vừa ý. */
.keo{display:flex;align-items:center;gap:10px;margin:0 0 10px;flex-wrap:wrap}
.keo label{font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:var(--mo)}
.keo input[type=range]{flex:1;min-width:150px;max-width:340px;accent-color:var(--nhan);cursor:ew-resize}
.keo output{font-family:var(--mono);font-size:11.6px;color:var(--chu2);min-width:66px}
.keo button{font-family:var(--mono);font-size:11px;padding:3px 9px;border:1px solid var(--vien);
  border-radius:6px;background:var(--mat);color:var(--chu2);cursor:pointer}
.keo button:hover{border-color:var(--nhan);color:var(--nhan)}

/* Ô LÀM MỚI — hai file, hai câu trả lời cho cùng một cú F5. Chúng phải nằm cạnh nhau,
   vì cái sai duy nhất ở đây là tưởng chúng giống nhau. */
.lm{display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));gap:9px;margin:8px 0 0}
.lm .h{border:1px solid var(--vien);border-radius:9px;padding:11px 13px;background:var(--nen)}
.lm .h.co{border-color:var(--xanh)} .lm .h.khong{border-color:var(--vien2)}
.lm .t{font-family:var(--mono);font-size:12.6px;color:var(--chu);word-break:break-all}
.lm .f5{font-family:var(--mono);font-size:10px;letter-spacing:.08em;font-weight:600;
  padding:2px 7px;border-radius:20px;margin-bottom:6px;display:inline-block}
.lm .h.co .f5{background:var(--xanh-nen);color:var(--xanh)}
.lm .h.khong .f5{background:var(--mat2);color:var(--chu2)}
.lm .g{font-size:12.6px;color:var(--chu2);line-height:1.45;margin:6px 0 0}
.cpd{display:flex;align-items:center;gap:6px;margin-top:5px}
.cpd code{flex:1;min-width:0;overflow-x:auto;white-space:nowrap;font-size:12px;padding:4px 7px}
button.cp{font:inherit;font-family:var(--mono);font-size:10px;letter-spacing:.07em;font-weight:600;
  cursor:pointer;padding:4px 8px;border:1px solid var(--vien);border-radius:6px;
  background:var(--mat);color:var(--chu2);white-space:nowrap}
button.cp:hover{border-color:var(--nhan);color:var(--nhan)}
button.cp[data-xong="1"]{border-color:var(--xanh);color:var(--xanh)}

/* Bảng đối chiếu mọi lượt migrate — cái nhìn đầu tiên, trước khi mở từng hồ sơ. */
.mgt{width:100%;border-collapse:collapse;font-size:13.6px}
.mgt th,.mgt td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--vien)}
.mgt th{font-family:var(--mono);font-size:10.6px;letter-spacing:.07em;text-transform:uppercase;
  color:var(--mo);font-weight:600}
.mgt td.so{font-family:var(--mono);white-space:nowrap}
.mgt tr:last-child td{border-bottom:0}

.batdau pre.code{margin:6px 0 4px}
.lienquan{margin:6px 0 0;padding-left:20px}
.lienquan li{margin:5px 0;font-size:14.4px}
details.the summary{font-family:var(--disp);font-size:clamp(18px,2.2vw,22px);font-weight:700}
.den{width:18px;height:18px;border-radius:50%;display:inline-block;vertical-align:-3px}
.den.xanh{background:var(--xanh)} .den.vang{background:var(--vang)} .den.do{background:var(--do)}
:root{
  --nen:#F7F5F0; --mat:#FFFFFF; --mat2:#EFEBE3; --vien:#DED8CC; --vien2:#C6BDAC;
  --chu:#1C1A16; --chu2:#4E483E; --mo:#7C7466;
  --nhan:#8A5A2B; --nhan-nen:#F3E7D6;
  --xanh:#2F6B4F; --xanh-nen:#DFEDE4;
  --vang:#8A6A12; --vang-nen:#F6EBCE;
  --do:#8C3A34; --do-nen:#F6E0DC;
  --bong:0 1px 2px rgba(28,26,22,.05), 0 10px 28px -18px rgba(28,26,22,.28);
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --disp:"Bricolage Grotesque","IBM Plex Sans",-apple-system,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --nen:#15130F; --mat:#1E1B16; --mat2:#282419; --vien:#38322A; --vien2:#4B4438;
  --chu:#F2EDE4; --chu2:#C7BFB2; --mo:#948B7C;
  --nhan:#D9A56B; --nhan-nen:#33261A;
  --xanh:#7EC49E; --xanh-nen:#18291F;
  --vang:#D9BE6B; --vang-nen:#2C2515;
  --do:#E0928A; --do-nen:#331D1A;
  --bong:0 1px 2px rgba(0,0,0,.5), 0 10px 28px -18px rgba(0,0,0,.8);
}}
:root[data-theme="dark"]{
  --nen:#15130F; --mat:#1E1B16; --mat2:#282419; --vien:#38322A; --vien2:#4B4438;
  --chu:#F2EDE4; --chu2:#C7BFB2; --mo:#948B7C;
  --nhan:#D9A56B; --nhan-nen:#33261A;
  --xanh:#7EC49E; --xanh-nen:#18291F;
  --vang:#D9BE6B; --vang-nen:#2C2515;
  --do:#E0928A; --do-nen:#331D1A;
  --bong:0 1px 2px rgba(0,0,0,.5), 0 10px 28px -18px rgba(0,0,0,.8);
}
*{box-sizing:border-box}
/* KHUNG RỘNG HƠN, LỀ MỎNG HƠN. Đo 07/09 trên màn 1440: khung 1080 bỏ không 360px chiều
   ngang, trong khi tab Vận hành cao 16 màn hình. Chỗ trống ngang mà cuộn dọc mỏi tay là
   lỗi bày trang: nới ngang là bớt dọc, không phải nhồi thêm chữ. */
body{background:var(--nen);color:var(--chu);font-family:var(--sans);font-size:15px;
  line-height:1.55;margin:0;padding:clamp(10px,1.4vw,16px) clamp(12px,2.4vw,26px) 56px}
.wrap{max-width:1280px;margin:0 auto}
h1,h2,h3,h4,h5{font-family:var(--disp);margin:0;letter-spacing:-.018em;text-wrap:balance;color:var(--chu)}
h1{font-size:clamp(27px,4.4vw,42px);font-weight:800;line-height:1.05}
h2{font-size:clamp(17px,2vw,20px);font-weight:700;margin-top:18px}
h3{font-size:16px;font-weight:700;margin-top:20px}
h4,h5{font-size:14px;font-weight:600;margin-top:16px;color:var(--chu2)}
p{margin:7px 0;max-width:82ch}
ul,ol{margin:7px 0;padding-left:21px}
li{margin:2px 0;max-width:82ch}
a{color:var(--nhan)}
code{font-family:var(--mono);font-size:.87em;background:var(--mat2);padding:.1em .34em;border-radius:3px;color:var(--chu2)}
.ref{font-family:var(--mono);font-size:.87em;color:var(--nhan)}
pre.code{background:var(--mat2);border:1px solid var(--vien);border-radius:8px;padding:13px 15px;
  overflow-x:auto;margin:11px 0}
pre.code code{background:none;padding:0;font-size:12.8px;color:var(--chu)}
blockquote{border-left:3px solid var(--nhan);background:var(--nhan-nen);margin:12px 0;
  padding:11px 15px;border-radius:0 8px 8px 0;color:var(--chu2)}
blockquote code{background:rgba(0,0,0,.06)}
.tw{overflow-x:auto;border:1px solid var(--vien);border-radius:9px;margin:12px 0;background:var(--mat)}
table{border-collapse:collapse;width:100%;min-width:520px;font-size:13.4px}
th,td{text-align:left;padding:9px 14px;border-bottom:1px solid var(--vien);vertical-align:top}
th{font-family:var(--mono);font-size:10.4px;letter-spacing:.09em;text-transform:uppercase;
  color:var(--mo);background:var(--mat2);white-space:nowrap;font-weight:600}
tr:last-child td{border-bottom:none}

/* ĐẦU TRANG MỘT HÀNG. Đo 07/09: đầu trang 179px + lề thân 40px + thanh tab 51px = 270px
   trước khi có chữ nào — 30% một màn 900px, và trên laptop có thanh trình duyệt thì đúng là
   nửa màn. Tên repo và một câu là đủ; câu dài gập vào dấu ? bên cạnh. */
header{border-bottom:1px solid var(--vien);padding-bottom:9px;margin-bottom:0;
  display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px}
header h1{font-size:clamp(19px,2.4vw,25px);line-height:1.15}
header .sub{font-size:13.4px;color:var(--mo);max-width:62ch;margin:0}
header .nhan-hang{margin-left:auto}
details.vi-sao{background:none;border:0;box-shadow:none;margin:0;padding:0;flex:0 0 auto}
details.vi-sao>summary{padding:0;font-family:var(--mono);font-size:11px;color:var(--mo);
  border:1px solid var(--vien);border-radius:20px;width:19px;height:19px;
  display:flex;align-items:center;justify-content:center;list-style:none}
details.vi-sao>summary::marker,details.vi-sao>summary::-webkit-details-marker{display:none}
details.vi-sao[open]{flex:1 1 100%}
details.vi-sao[open]>summary{margin-bottom:5px}
details.vi-sao p{font-size:13.4px;color:var(--chu2);margin:0}
.nhan-hang{display:flex;flex-wrap:wrap;gap:8px;align-items:center;
  font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--mo)}
.chip{font-family:var(--mono);font-size:11px;font-weight:600;letter-spacing:.04em;
  padding:3px 9px;border-radius:20px;background:var(--nhan-nen);color:var(--nhan);text-transform:none}
.chip.ok{background:var(--xanh-nen);color:var(--xanh)}
.chip.canh{background:var(--vang-nen);color:var(--vang)}

nav.tabs{display:flex;flex-wrap:wrap;gap:4px;margin:0;position:sticky;top:0;z-index:5;
  background:var(--nen);padding:7px 0;border-bottom:1px solid var(--vien)}
nav.tabs button{font-family:var(--sans);font-size:13.4px;font-weight:600;cursor:pointer;
  border:1px solid transparent;background:none;color:var(--mo);padding:7px 13px;border-radius:8px}
nav.tabs button:hover{color:var(--chu);background:var(--mat2)}
nav.tabs button[aria-selected="true"]{background:var(--mat);color:var(--chu);
  border-color:var(--vien);box-shadow:var(--bong)}
nav.tabs button:focus-visible{outline:2px solid var(--nhan);outline-offset:2px}

section.tab{padding-top:9px}
.the{background:var(--mat);border:1px solid var(--vien);border-radius:11px;
  padding:clamp(12px,1.5vw,17px);margin:9px 0;box-shadow:var(--bong)}
.the > h2:first-child, .the > h3:first-child{margin-top:0}

/* XẾP LƯỚI CHO TAB DÀI — Đức nêu 08/09: tab Hệ thống scroll quá dài, nhiều không gian thừa.
 *
 * Đo trước khi sửa, và lượt đo ĐẦU của tôi sai nên ghi cả hai ra đây: đếm byte markup thì mục
 * "Bảo trì định kỳ" chiếm 50% cả tab — nhưng mục đó ĐÃ nằm trong <details>, nên nó chỉ chiếm MỘT
 * DÒNG scroll. Đi theo con số đó là đi gập những thứ đã gập sẵn.
 *
 * Số đúng: 9.483 byte đang hiện · 186.605 byte đã gập · 21 khối xếp một hàng một. Mỗi khối .the
 * tốn padding 12-17px hai bên cộng margin 9px hai đầu, nên 21 khối tốn khoảng 1.150px chỉ riêng
 * viền, đệm và khoảng cách — trước một chữ nội dung nào. Đó là "không gian thừa".
 *
 * Chốt: xếp các khối vào một lưới tự co. Khối GẬP nằm 3 cột; khối MỞ tự giãn hết chiều ngang
 * (grid-column:1/-1) nên bảng và mã bên trong không bị bóp. Thuần CSS — không một dòng JS, và
 * thẻ details là thẻ gốc của trình duyệt nên không thêm thư viện nào. */
.xep{display:grid;grid-template-columns:repeat(auto-fit,minmax(268px,1fr));
  gap:9px;align-items:start;margin:9px 0}
.xep > .the{margin:0}
/* Khối đang MỞ chiếm cả hàng — nội dung bên trong (bảng, mã, sơ đồ ba khối) cần chiều ngang. */
.xep > details.the[open]{grid-column:1/-1}
/* SỔ MIGRATE CHIẾM TRỌN BỀ NGANG, không nằm trong ô thẻ hẹp.
 *
 * Đo 08/09: ".xep" là lưới thẻ "auto-fit, minmax(268px, 1fr)" — hợp cho những thẻ NGẮN đứng cạnh
 * nhau, nhưng bốn hồ sơ migrate rơi vào đó thành bốn cột **rộng 296px** giữa một trang rộng
 * 1.213px, mỗi cột cao hàng chục nghìn pixel. Đức nói đúng hiện tượng: "bị chồng thành 1 cột,
 * làm phải scroll dài". Gốc bệnh không phải danh sách, mà là cái ô chứa nó.
 *
 * Thanh tab con, tay kéo, và mỗi khung hồ sơ đều là thứ đọc TRỌN BỀ NGANG — cho chúng span hết,
 * rồi các danh sách bên trong mới có chỗ mà chảy thành cột. */
.xep > .tabs2, .xep > .keo, .xep > .tab2{grid-column:1/-1}
/* Thanh khi GẬP chỉ cần cao bằng một dòng: bỏ đệm đứng, bỏ cả bóng cho nhẹ mắt. */
.xep > details.the:not([open]){padding:9px clamp(10px,1.2vw,13px);box-shadow:none}
.xep > details.the:not([open]) > summary{font-size:14.6px;line-height:1.35;margin:0}
/* Khối KHÔNG gập được (mở cứng) vẫn chiếm cả hàng — nếu không thì nó bị bóp còn 1/3 chiều ngang
 * mà chẳng ai gập được nó để lấy lại. */
.xep > div.the{grid-column:1/-1}
@media (max-width:700px){ .xep{grid-template-columns:1fr} }
.luoi{display:grid;grid-template-columns:repeat(auto-fit,minmax(146px,1fr));gap:1px;
  background:var(--vien);border:1px solid var(--vien);border-radius:9px;overflow:hidden;margin:14px 0}
.o{background:var(--mat);padding:13px 15px;display:flex;flex-direction:column;gap:3px}
.o b{font-family:var(--disp);font-size:27px;font-weight:800;line-height:1;color:var(--nhan);
  font-variant-numeric:tabular-nums}
.o span{font-size:12.2px;color:var(--mo);line-height:1.34}
.o.ok b{color:var(--xanh)} .o.canh b{color:var(--vang)} .o.thieu b{color:var(--do)}

details{background:var(--mat);border:1px solid var(--vien);border-radius:10px;margin:7px 0;
  padding:0 14px;box-shadow:var(--bong)}
details[open]{padding-bottom:10px}
summary{cursor:pointer;padding:9px 0;font-weight:600;font-family:var(--disp);font-size:14.6px;
  display:flex;gap:9px;align-items:baseline;flex-wrap:wrap}
summary:hover{color:var(--nhan)}
summary::marker{color:var(--mo)}
summary .ngay{font-family:var(--mono);font-size:11.5px;color:var(--mo);font-weight:400}
summary .tt{font-size:13.2px;color:var(--chu2);font-weight:400}

footer{border-top:1px solid var(--vien);margin-top:34px;padding-top:15px;
  display:flex;flex-wrap:wrap;gap:6px 20px;font-family:var(--mono);font-size:11.6px;color:var(--mo)}
@media (max-width:640px){ nav.tabs{position:static} }
@media (prefers-reduced-motion:no-preference){ section.tab{animation:hien .18s ease-out} }
@keyframes hien{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}
${CSS_LUU_DO}`;

const JS = `
(function(){
  /* BỀ RỘNG CỘT — người xem tự co kéo, và trang NHỚ lấy.
   *
   * Đức nêu 08/09: *"độ rộng có thể adjustable để tôi chủ động co kéo phù hợp khi xem"*. Nhớ
   * bằng localStorage nên mở lại vẫn đúng chỗ vừa ý — một tay kéo quên ngay lượt sau thì lần nào
   * cũng phải kéo lại, và người ta thôi dùng nó.
   *
   * BỌC TRY/CATCH TOÀN BỘ: cửa sổ riêng tư hoặc trình duyệt chặn lưu trữ thì chính lệnh ĐỌC ném,
   * và một ngoại lệ ở đây làm chết mọi khối JS phía dưới trong cùng hàm — tab bấm không đổi,
   * banner tuổi không hiện. Trang tĩnh thì không ai thấy lỗi để mà sửa. */
  var MAC_DINH = 360;
  var KHOA_LUU = 'ark-ck-cot';
  function datCot(px, ghiNho){
    var n = Math.max(200, Math.min(900, Number(px) || MAC_DINH));
    document.documentElement.style.setProperty('--ck-cot', n + 'px');
    var thanh = document.getElementById('ck-cot');
    var so = document.getElementById('ck-cot-so');
    if (thanh) thanh.value = String(n);
    if (so) so.textContent = n + 'px';
    if (ghiNho) { try { localStorage.setItem(KHOA_LUU, String(n)); } catch (e) {} }
  }
  try {
    var luu = null;
    try { luu = localStorage.getItem(KHOA_LUU); } catch (e) { luu = null; }
    datCot(luu === null ? MAC_DINH : luu, false);
    var thanh2 = document.getElementById('ck-cot');
    if (thanh2) thanh2.addEventListener('input', function(){ datCot(thanh2.value, true); });
    var ve = document.getElementById('ck-cot-ve');
    if (ve) ve.addEventListener('click', function(){ datCot(MAC_DINH, true); });
  } catch (e) {}

  // Trang là file tĩnh đem publish — nó phải tự biết mình bao nhiêu tuổi ở lúc XEM, không phải
  // lúc sinh. Bảy ngày là mốc: quá đó thì mọi con số ở đây đáng ngờ, và người xem phải biết
  // điều đó TRƯỚC khi đọc, không phải sau.
  try {
    var el = document.querySelector('.cu');
    if (el && el.dataset.sinh) {
      var ngay = Math.floor((Date.now() - new Date(el.dataset.sinh).getTime()) / 86400000);
      if (ngay > 7) {
        el.dataset.hien = '1';
        el.textContent = 'TRANG NÀY CÓ THỂ ĐÃ CŨ — sinh ngày ' + el.dataset.sinh + ', ' + ngay + ' ngày trước. Sinh lại trước khi tin số.';
      }
    }
  } catch (e) {}

  function lui(gia, xong){
    try {
      var ta = document.createElement('textarea');
      ta.value = gia; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta); xong();
    } catch (e) {}
  }

  /* TÌM TRÊN CẢ TRANG — Đức nêu 09/09: *"tôi tìm khung 30, 40, 53 trong dashboard nhưng rất mơ hồ"*.
   *
   * Ctrl+F của trình duyệt KHÔNG đủ ở trang này, và lý do là cấu trúc chứ không phải thói quen:
   * bốn trong năm nhóm đang "hidden", và phần lớn nội dung nằm trong "<details>" đóng. Trình
   * duyệt không tìm thấy chữ trong nút bị ẩn — nên với người xem, thứ họ cần "không có trên
   * trang", trong khi nó có.
   *
   * Nên ô này tìm trên TOÀN BỘ trang kể cả phần đang ẩn, và mỗi kết quả nói rõ **nó nằm ở nhóm
   * nào** — bấm là nhảy đúng chỗ, mở sẵn mọi "<details>" bao quanh, và tô sáng vài giây.
   *
   * CHỈ TÌM TRONG TIÊU ĐỀ VÀ DÒNG NGẮN, cố ý — "h2" · "h3" · "summary" · dòng sổ nợ · dòng việc
   * chờ chốt · dòng checklist · dòng khoá. Quét cả văn xuôi thì một chữ thường gặp trả về sáu
   * chục đoạn dài và kết quả thành vô dụng. Người ta tra bảng này bằng MÃ VIỆC, và mã việc luôn
   * nằm ở tiêu đề hoặc dòng ngắn. */
  try {
    var oTim = document.getElementById('tim');
    var oKq = document.getElementById('tim-kq');
    if (oTim && oKq) {
      var tenNhom = {};
      [].slice.call(document.querySelectorAll('nav.tabs button')).forEach(function(b){
        tenNhom[b.dataset.tab] = b.textContent.trim();
      });
      var MUC_TIM = 'h2, h3, summary, .nom, .cd .c, .ckm, .kh .t, .hs .t';
      var kho = [].slice.call(document.querySelectorAll('section.tab')).reduce(function(acc, sec){
        var nhom = sec.id.replace(/^tab-/, '');
        [].slice.call(sec.querySelectorAll(MUC_TIM)).forEach(function(el){
          var chu = (el.textContent || '').replace(/\\s+/g, ' ').trim();
          if (chu.length > 2 && chu.length < 220) acc.push({ el: el, chu: chu, thap: chu.toLowerCase(), nhom: nhom });
        });
        return acc;
      }, []);

      var TOI_DA = 40;
      function nhay(m){
        var b = document.querySelector('nav.tabs button[data-tab=' + JSON.stringify(m.nhom) + ']');
        if (b) b.click();
        // Mở mọi "<details>" bao quanh — không mở thì bấm xong vẫn không thấy gì, và người dùng
        // kết luận nút hỏng. Cả ".tab2" (tab con của sổ migrate) cũng phải bật.
        var n = m.el;
        while (n && n !== document.body) {
          if (n.tagName === 'DETAILS') n.open = true;
          if (n.classList && n.classList.contains('tab2') && n.hidden) {
            var b2 = document.querySelector('.tabs2 button[data-tab2=' + JSON.stringify(n.id) + ']');
            if (b2) b2.click();
          }
          n = n.parentElement;
        }
        m.el.scrollIntoView({ block: 'center' });
        m.el.classList.add('tim-sang');
        setTimeout(function(){ m.el.classList.remove('tim-sang'); }, 2400);
      }

      function ve(){
        var q = oTim.value.trim().toLowerCase();
        oKq.innerHTML = '';
        if (q.length < 2) { oKq.hidden = true; return; }
        var hit = kho.filter(function(m){ return m.thap.indexOf(q) >= 0; });
        oKq.hidden = false;
        if (!hit.length) {
          oKq.innerHTML = '<p class="tim-khong">Không có chỗ nào khớp <b></b>. '
            + 'Bảng này chỉ nói về repo <em>NÀY</em> — thứ bạn tìm có thể nằm ở sổ nợ của repo khác.</p>';
          oKq.querySelector('b').textContent = '"' + oTim.value.trim() + '"';
          return;
        }
        var dem = {};
        hit.forEach(function(m){ dem[m.nhom] = (dem[m.nhom] || 0) + 1; });
        var tom = document.createElement('p');
        tom.className = 'tim-tom';
        tom.textContent = hit.length + ' chỗ khớp — '
          + Object.keys(dem).map(function(k){ return (tenNhom[k] || k) + ' ' + dem[k]; }).join(' · ')
          + (hit.length > TOI_DA ? '  (hiện ' + TOI_DA + ' chỗ đầu)' : '');
        oKq.appendChild(tom);
        hit.slice(0, TOI_DA).forEach(function(m){
          var nut = document.createElement('button');
          nut.type = 'button';
          nut.className = 'tim-dong';
          var n1 = document.createElement('span');
          n1.className = 'nh';
          n1.textContent = tenNhom[m.nhom] || m.nhom;
          var n2 = document.createElement('span');
          n2.textContent = m.chu.length > 130 ? m.chu.slice(0, 130) + '…' : m.chu;
          nut.appendChild(n1);
          nut.appendChild(n2);
          nut.addEventListener('click', function(){ nhay(m); });
          oKq.appendChild(nut);
        });
      }
      oTim.addEventListener('input', ve);
      oTim.addEventListener('keydown', function(e){
        if (e.key === 'Escape') { oTim.value = ''; ve(); oTim.blur(); }
      });
    }
  } catch (e) {}

  var nut = [].slice.call(document.querySelectorAll('nav.tabs button'));
  var mucs = [].slice.call(document.querySelectorAll('section.tab'));
  function chon(id, luu){
    nut.forEach(function(b){ b.setAttribute('aria-selected', String(b.dataset.tab === id)); });
    mucs.forEach(function(s){ s.hidden = (s.id !== 'tab-' + id); });
    if (luu) { try { location.hash = id; } catch(e){} }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }
  nut.forEach(function(b){ b.addEventListener('click', function(){ chon(b.dataset.tab, true); }); });
  var dau = (location.hash || '').replace('#','');
  chon(nut.some(function(b){ return b.dataset.tab === dau; }) ? dau : nut[0].dataset.tab, false);
  // TAB CON — dùng ở tab Migrate. Chọn theo \`data-tab2\`, khung là \`.tab2\`.
  // Tên thuộc tính KHÁC hẳn tab lớn, cố ý: dùng chung tên thì một cú bấm tab con sẽ quét luôn
  // cả tab lớn, và người xem bị đá về trang đầu mà không hiểu vì sao.
  function chon2(id){
    [].slice.call(document.querySelectorAll('.tabs2 button')).forEach(function(b){
      b.setAttribute('aria-selected', String(b.dataset.tab2 === id));
    });
    [].slice.call(document.querySelectorAll('.tab2')).forEach(function(d){ d.hidden = (d.id !== id); });
  }
  document.addEventListener('click', function(e){
    var b = e.target.closest && e.target.closest('.tabs2 button');
    if (b) { chon2(b.dataset.tab2); return; }

    // COPY. Trang mo bang file:// van la secure context tren Chrome nen clipboard API chay,
    // nhung KHONG dua ca tinh nang vao mot API co the vang: co duong lui bang textarea an.
    // Nut phai NOI RA la da copy — bam mot nut khong phan hoi gi thi nguoi ta bam lai ba lan
    // roi ket luan nut hong.
    var cp = e.target.closest && e.target.closest('button.cp');
    if (cp) {
      var gia = cp.dataset.cp || '';
      var xong = function(){
        var cu = cp.textContent; cp.textContent = 'ĐÃ COPY'; cp.dataset.xong = '1';
        setTimeout(function(){ cp.textContent = cu; cp.dataset.xong = ''; }, 1400);
      };
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(gia).then(xong, function(){ lui(gia, xong); });
        } else { lui(gia, xong); }
      } catch (err) { lui(gia, xong); }
      return;
    }

    // Bảng đối chiếu nhảy thẳng vào tab con của một lượt.
    var g2 = e.target.closest && e.target.closest('[data-goto2]');
    if (g2) {
      e.preventDefault();
      chon2(g2.dataset.goto2);
      var el2 = document.getElementById(g2.dataset.goto2);
      if (el2) el2.scrollIntoView({ behavior:'smooth', block:'start' });
      return;
    }

    // NHẢY CHÉO TAB. Không có đoạn này thì mọi liên kết \`data-goto\` là chữ chết: trình duyệt
    // nhảy tới một id đang nằm trong tab BỊ ẨN, nên không có gì xảy ra cả — và hỏng IM LẶNG,
    // người bấm chỉ thấy trang không nhúc nhích. Đã để lọt đúng lỗi này ở bản trước.
    var g = e.target.closest && e.target.closest('[data-goto]');
    if (g) {
      e.preventDefault();
      chon(g.dataset.goto, true);
      var el = document.getElementById((g.getAttribute('href') || '').slice(1));
      if (el) {
        if (el.tagName === 'DETAILS') el.open = true;
        el.scrollIntoView({ behavior:'smooth', block:'start' });
      }
      return;
    }

  });
})();
`;

/* NOW/NEXT — bốn ô, đọc từ frontmatter của STATUS.md. Ô cuối là **việc cần NGƯỜI làm**, tô khác
   màu, vì đó là thứ duy nhất trên trang mà AI không tự làm được. Chủ dự án mở trang ra chỉ cần
   nhìn đúng ô đó. */
/* ---- TỔNG QUAN = ĐÚNG BA CÂU -----------------------------------------------
 *
 * Đức chốt 07/09 sau audit UX: *"Homepage chỉ giữ 3 câu: Đang làm gì / Cần Đức làm gì /
 * Blocker-risk."*
 *
 * Bản trước nhồi SÁU khối vào tab đầu — now/next, Cần Đức, ý tưởng, bắt đầu, vòng đời, sức
 * khoẻ — và **bốn trong sáu là bản vẽ LẠI của thứ đã có tab riêng**. Hậu quả không phải là dài:
 * hậu quả là **nói hai con số khác nhau cho cùng một câu hỏi**. Ngày 07/09 tab đầu nói *"bốn mục
 * đang mang dấu chờ"* trong khi tab AI điều phối nói *"13 việc"*. Người đọc không biết tin cái nào,
 * nên không tin cái nào.
 *
 * Nên ba câu này là **TÓM TẮT, không phải bản sao**: mỗi câu một dòng, một con số, và một liên
 * kết sang chỗ vẽ đầy đủ. Không bảng, không ô đếm phụ, không danh sách.
 *
 * MỖI CÂU PHẢI SUY TỪ MÁY, không lấy chữ người gõ — trừ câu thứ nhất, vì *"đang làm gì"* là
 * việc chỉ người biết. Câu thứ hai và thứ ba mà lấy chữ gõ tay thì đó là nguồn sự thật thứ hai,
 * và nguồn thứ hai đã lệch thật một lần rồi.
 */
export function khoiBaCau({ st = {}, canDuc = [], khoa = [], so = [], noMo = [], tenNguoi = "người chốt" } = {}) {
  const giu = khoa.filter((k) => k.owner);

  /* ① ĐANG LÀM GÌ — chữ của người (hồ sơ trạng thái) + số luồng máy đếm được. */
  const focus = boTenFile(String(st.current_focus || "").replace(/^"|"$/g, "")).trim();
  const cau1 = (focus || "Hồ sơ trạng thái chưa khai đang làm gì.")
    + (giu.length
      ? ` — ${giu.length} luồng đang giữ vùng: ${giu.map((k) => k.owner).join(", ")}.`
      : " — không luồng nào đang giữ vùng trong repo này.");

  /* ② CẦN NGƯỜI CHỐT — MÁY ĐẾM, và chỉ đếm ở sổ còn sống. Xem `SO_CON_SONG`. */
  const bam = canDuc.filter((c) => c.loai === "bam").length;
  const chot = canDuc.length - bam;
  const cau2 = canDuc.length
    ? `${canDuc.length} việc đang chờ — ${bam} việc cần BẤM, ${chot} việc cần CHỐT.`
    : `Không việc nào đang chờ ${tenNguoi}.`;

  /* ③ BLOCKER — thứ đang CHẶN, không phải thứ đang nợ.
   *
   * `so === null` nghĩa là KHÔNG ĐO ĐƯỢC, và nó nặng hơn một con số dương: một phép đo chết thì
   * mọi con số cạnh nó đều đáng ngờ. Nên nó lên đầu danh sách, không bị làm tròn thành 0. */
  const hong = so.filter((x) => x.so === null).map((x) => x.nhan);
  const ban = so.filter((x) => x.so !== null && x.so > 0);
  const cau3 = hong.length
    ? `KHÔNG ĐO ĐƯỢC ${hong.length} phép: ${hong.join(" · ")}. Mọi con số trên trang này đang đáng ngờ.`
    : ban.length
      ? ban.map((x) => `${x.so} ${x.nhan}`).join(" · ") + (noMo.length ? ` · ${noMo.length} mục nợ đang mở.` : ".")
      : `Không chỗ nào đang chặn.${noMo.length ? ` ${noMo.length} mục nợ đang mở, nhưng không mục nào chặn.` : ""}`;

  const den3 = hong.length ? "do" : ban.length ? "vang" : "xanh";
  /* LIÊN KẾT TRỎ TỚI KHỐI, không chỉ tới nhóm. `data-goto` chọn nhóm, `href` cuộn tới đúng
   * khối canonical trong nhóm đó — một liên kết chỉ mở đúng nhóm rồi để người đọc tự tìm thì
   * nó là nửa liên kết, và bảng lại thành một chỗ nữa phải đọc. Ba id dưới đây do chính ba
   * hàm canonical đặt ra; một phép ghim cũ đòi mọi `href` phải trỏ tới id CÓ THẬT. */
  /* `data-cau` + `data-den` là PHÁN QUYẾT MÁY ĐỌC ĐƯỢC, không phải trang trí.
   *
   * Phép ghim phải đọc được "câu này đang xanh hay đỏ" mà không phải suy từ tên lớp CSS —
   * suy từ CSS thì đổi một lớp cho đẹp là phép ghim mù, và nó mù IM LẶNG. Trước 07/09 phép
   * ghim đèn sức khoẻ đọc `class="den xanh"`, nên lúc khối đèn bị gộp vào ba câu thì nó đỏ
   * với một câu lỗi không nói gì về nguyên nhân. */
  const hang = (khoaCau, nhan, cau, den, nhom, id, nhanDi) => '<div class="bc" data-cau="' + khoaCau
    + '" data-den="' + den + '"><span class="n">' + esc(nhan) + '</span>'
    + '<span class="c"><span class="cham ' + den + '"></span>' + esc(cau) + '</span>'
    + '<a class="hieu ' + (den === "xanh" ? "mo" : den === "vang" ? "ban" : "tt") + '" href="#' + id + '" data-goto="' + nhom + '">' + esc(nhanDi) + '</a></div>';

  /* KHOÁ CÂU đặt tay, KHÔNG suy từ nhãn tiếng Việt. `slug()` bỏ dấu rồi gộp, nên "Đang làm gì"
   * ra `ang-l-m-g` — một khoá máy đọc mà đổi theo cách viết nhãn thì nó không phải khoá. */
  return '<div class="the ba-cau">'
    + hang("dang-lam-gi", "Đang làm gì", cau1, giu.length ? "vang" : "xanh", "cong-viec", "dang-lam-gi", "AI NÀO ĐANG GIỮ VÙNG")
    + hang("can-nguoi-chot", "Cần " + tenNguoi + " làm gì", cau2, canDuc.length ? "vang" : "xanh", "cong-viec", "can-nguoi-chot", "XEM " + (canDuc.length || 0) + " VIỆC")
    + hang("cho-dang-chan", "Chỗ đang chặn", cau3, den3, "cong-viec", "so-no", "SỔ NỢ")
    + '<p class="ghi">Ba câu này là <strong>tóm tắt, không phải bản sao</strong> — mỗi khái niệm chỉ '
    + 'vẽ đầy đủ ở <strong>một</strong> chỗ, và liên kết bên phải dẫn tới đúng chỗ đó. Câu đầu lấy '
    + 'chữ từ hồ sơ trạng thái (chỉ người biết đang làm gì); <strong>hai câu sau MÁY ĐẾM</strong>, '
    + 'không lấy chữ gõ tay — một bản đếm gõ tay là nguồn sự thật thứ hai, và ngày 07/09 nó đã lệch '
    + 'thật: nó nói bốn việc trong khi máy đếm mười ba. Xem '
    + '<code>docs/adr/0006-bang-mot-khai-niem-mot-cho.md</code>.</p></div>';
}

/* Tách thành hàm RIÊNG và XUẤT RA để phép kiểm gọi thẳng được.
 *
 * Nó từng nằm inline trong `gomDuLieu()`, và `gomDuLieu()` chỉ chạy được trên đĩa thật — nên
 * phép kiểm không với tới, và một hằng số `1` nằm đó sống sót qua cả một vòng đột biến. Thử phá
 * mà không đỏ nghĩa là phép kiểm chưa từng canh chỗ đó; chỗ nào không gọi được thì không kiểm
 * được. Đây là lý do nó ở đây chứ không phải trong thân hàm kia. */
export function noChuaChungMinh(lifecycle) {
  if (!lifecycle) return null;                                  // không khai = không đo được
  // Dùng CHUNG bảng giá trị với validator (`LIFECYCLES` của build-dashboard). Bản đầu dùng
  // "proven"/"retired" — hai giá trị mà validator TỪ CHỐI, nên không repo hợp luật nào chạm
  // tới được; còn bốn giá trị hợp lệ thì không có chặng nào trên vòng đời. Hai bảng, một sự thật.
  return DA_XONG.has(lifecycle) ? 0 : 1;
}

/* Bốn chặng, và MỌI giá trị validator chấp nhận đều phải rơi vào một chặng. Phép kiểm
   `tests/core-contract.mjs` khối F3 cưỡng chế hai chiều: không chặng nào dùng giá trị lạ, và
   không giá trị hợp lệ nào rơi ra ngoài bảng. */
export const DA_XONG = new Set(["active", "archived", "superseded"]);
export const VONG_DOI = {
  idea: { ten: "Ý TƯỞNG", i: 0 },
  building: { ten: "ĐANG DỰNG", i: 1 },
  experimental: { ten: "THỬ NGHIỆM", i: 1 },
  active: { ten: "ĐANG CHẠY", i: 2 },
  paused: { ten: "TẠM DỪNG", i: 2 },
  archived: { ten: "ĐÃ NGHỈ", i: 3 },
  superseded: { ten: "ĐÃ THAY THẾ", i: 3 }
};

/* Vòng đời — bốn chặng, chấm sáng ở chặng hiện tại. Cố ý KHÔNG hiện phần trăm: một dự án không
   chạy được đo bằng phần trăm, và một con số như thế chỉ tạo cảm giác chính xác giả. */
function khoiVongDoi(st) {
  const nay = VONG_DOI[st?.lifecycle]?.i;
  if (nay === undefined) return "";
  const chang = [["Ý tưởng", 0], ["Đang dựng", 1], ["Đã chứng minh", 2], ["Dừng / nghỉ", 3]];
  return `<div class="the"><h2>Vòng đời</h2><div class="vong">${
    chang.map(([ten, i], k) => {
      const lop = i < nay ? "qua" : (i === nay ? "nay" : "");
      const noi = k < chang.length - 1 ? `<div class="noi${i < nay ? " qua" : ""}"></div>` : "";
      return `<div class="b ${lop}"><div class="cham"></div><div class="ten">${esc(ten)}</div></div>${noi}`;
    }).join("")}</div></div>`;
}

/* Sức khoẻ — ba con số đếm và MỘT đèn. Đèn xanh chỉ khi cả ba bằng 0. Không phần trăm, không
   lời máy tự khen: một dòng "đạt 94%" là thứ không ai hành động được. */


/* BẮT ĐẦU Ở ĐÂU — ba câu hỏi, ba lệnh. Đặt NGAY dưới NOW/NEXT vì đây là thứ người mở trang
   cần nhiều nhất, và trước đây nó nằm tận tab thứ ba. Cuộn để tìm việc hay làm nhất là lỗi bày
   trang, không phải lỗi người đọc. */
/* HAI CÂU TỰ KHAI CỦA TRANG — khôi phục 12/09, mất ở lượt migrate bộ khung (4da1e9e5).
 *
 * Trang này ra ở HAI bản: bản CHỤP nằm trong git (không tự cập nhật), và bản SỐNG do ba cửa
 * `bang-trang-thai/` dựng lại mỗi lần Đức nhấp. `doiSangBanSong()` trong `bang-trang-thai/loi.mjs`
 * đổi câu này khi dựng bản sống — bằng cách thay CHUỖI HẰNG, cố ý không gõ lại chữ ở hai nơi.
 *
 * Gỡ hai hằng số đi mà giữ nguyên bên gọi: `doi-sang-ban-song` NÉM LỖI mỗi lần chạy, tức ba
 * cửa bảng sống của Đức hỏng từ 10/09 và không ai biết — phép ghim của nó
 * (`tests/bang-ba-cua-smoke.mjs`) nằm trong chuỗi `npm test` đã chết ở bài đầu tiên. */
export const KHAI_BAN_CHUP = "BẢN CHỤP trong git — không tự cập nhật. Bản SỐNG: nhấp đúp bang-trang-thai" + String.fromCharCode(92) + "Xem-bang.cmd";
export const KHAI_BAN_SONG = "BẢN SỐNG — dựng lại mỗi lần bạn nhấp. Bản chụp trong git: DASHBOARD-Chrome-Extension-AI-Agentic.html ở gốc repo";

export function khoiBatDau(dl) {
  return `<div class="the batdau">
    <h2>Bắt đầu ở đâu</h2>
    <p class="khai-ban" style="color:var(--mo);font-size:12.6px;margin:0 0 10px">${KHAI_BAN_CHUP}</p>
    <div class="cols">
      <div><h3>Repo này đang thế nào?</h3><pre class="code"><code>npm run gate -- --as duc</code></pre>
        <p>XANH TOÀN BỘ = xong. ĐỎ = chưa xong, mỗi dòng nói luôn cách sửa.</p></div>
      <div><h3>Repo kia còn cách chuẩn bao xa?</h3><pre class="code"><code>npm run assess -- &lt;đường-dẫn&gt;</code></pre>
        <p>Ra mức 0–3 và ba con số chi phí: thả · viết · soi.</p></div>
      <div><h3>Xem lại trang này</h3><pre class="code"><code>npm run overview -- bang.html</code></pre>
        <p>Rồi mở <code>bang.html</code> bằng trình duyệt.</p></div>
    </div>
    <p style="color:var(--mo);font-size:13.2px;margin-bottom:0">Không cần cài gì thêm — không thư viện ngoài, không gọi mạng, không tài khoản. Chỉ cần Node và git.</p>
  </div>`;
}

/* TRANG LIÊN QUAN — đọc thẳng từ bản đồ mục 6, không khai lần thứ hai.
   Trang vệ tinh (sổ migrate…) trước đây không có đường nào dẫn tới từ trang mẹ, nên coi như
   không tồn tại với người chỉ mở một link.

   ĐỔI 04/09, và đây là chỗ dễ hỏng ÂM THẦM nhất của cả bản vá này. Bản trước tìm chuỗi
   `https://claude.ai/code/artifact/`, tức trang vệ tinh CHỈ hiện ra khi nó là artifact trên
   claude.ai. Đức chốt bảng ở dạng file HTML trong repo — nên với phép tìm cũ, bỏ artifact đi
   là khối này rỗng VĨNH VIỄN và đường dẫn tới sổ migrate mất hẳn khỏi trang mẹ, mà trang vẫn
   sinh ra bình thường nên không ai thấy.

   Nay tìm LIÊN KẾT MARKDOWN `[chữ](file.html)`, và chỉ nhận khi file đó CÓ THẬT trong HEAD —
   một link chết trên trang mẹ còn tệ hơn không có link. Đòi dạng ngoặc đầy đủ là để
   `<file-tạm.html>` và `bang.html` viết trong câu văn không lọt vào. */
/* MÔ HÌNH VẬN HÀNH — ba khối, Đức mô tả 06/09.
 *
 * Vì sao khối này đáng có: mọi tab khác của trang trả lời "repo đang thế nào". Không tab nào
 * trả lời "cái này VẬN HÀNH ra sao" — mà đó lại là câu đầu tiên của bất kỳ ai mới nhìn thấy
 * nó, kể cả một phiên AI mới mở. Trước khi có khối này, câu trả lời nằm rải ở bốn file
 * protocol, và muốn hiểu phải đọc hết cả bốn.
 *
 * SUY TỪ DỮ LIỆU, KHÔNG GÕ TAY. Danh sách protocol đọc từ `docs/protocols`, đề bài đọc từ
 * `docs/briefs`, repo đích đọc từ `docs/migrations`. Gõ tay thì ba tháng nữa nó nói về một bộ
 * khung không còn tồn tại — đúng bệnh mà cả repo này sinh ra để chữa. */
export function khoiMoHinh({ lenh = [], protocols = [], briefs = [], dichDen = [], soPhepKiem = null }) {
  const muc = (x) => `<li>${x}</li>`;
  const hop = (ten, items) => items.length
    ? `<div class="mh-hop"><h4>${esc(ten)}</h4><ul>${items.join("")}</ul></div>` : "";
  const mui = (nhan) => `<div class="mh-mui"><span class="ky">&#9654;</span><span class="nh">${esc(nhan)}</span></div>`;

  /* Khối 1 — DỮ LIỆU LÕI. Ba tầng của repo nhà, đúng ba tầng mà cổng đóng phiên canh. */
  const loi = [
    hop("Luật", [muc("<code>AGENTS.md</code> — hiến pháp, một trang"),
      muc("<code>decisions.md</code> + <code>docs/adr/</code> — đã chốt gì, vì sao")]),
    hop("Máy", [muc(`<b>${lenh.length}</b> lệnh chạy được`),
      muc(soPhepKiem === null ? "suite phép kiểm ghim hành vi" : `<b>${soPhepKiem}</b> suite phép kiểm ghim hành vi`),
      muc("cổng đóng phiên · cổng xuất bản · bảng chủ sở hữu")]),
    hop("Trạng thái", [muc("<code>STATUS.md</code> · <code>HANDOFF.md</code> · <code>BACKLOG.md</code>"),
      muc("<code>.agents/claims.json</code> — ai đang giữ vùng nào")])
  ].join("");

  /* Khối 2 — PROTOCOL. Đây là thứ ĐI RA NGOÀI: việc lặp lại, có checklist, giao được cho AI khác. */
  /* Tên ba việc lấy THẲNG từ bảng `VIEC` của `giao-viec.mjs`, không suy từ tên file. Suy từ
   * tên file thì `BRAINSTORM-GPT-V1.md` hoá ra một `--viec brainstorm` không tồn tại, và trang
   * dạy người ta gõ một lệnh chạy không được. */
  const tenFile = new Map(briefs.map((b) => [b.file, b.tieuDe]));
  const dsBrief = Object.entries(VIEC).map(([khoa, cf]) => {
    const tieuDe = tenFile.get(String(cf.doc).split("/").pop()) || cf.nhan;
    return muc(`<code>--viec ${esc(khoa)}</code> — ${esc(tieuDe.replace(/^PHẦN VIỆC — /, ""))}`);
  });
  const proto = [
    hop("Ba việc giao được", dsBrief.length ? dsBrief : [muc("chưa khai đề bài nào")]),
    hop("Quy trình đầy đủ", protocols.map((p) => muc(esc(p.tieuDe.replace(/^QUY TRÌNH — /, "")))) ),
    hop("Ai thực thi", [muc("Claude Code · Codex CLI · GPT — cùng một đề bài"),
      muc("<code>npm run giao-viec</code> đo repo đích rồi mới ghép đề bài")])
  ].join("");

  /* Khối 3 — REPO ĐÍCH. Đọc từ hồ sơ migrate: đó là bằng chứng, không phải trí nhớ. */
  const dsDich = dichDen.length
    ? dichDen.map((d) => muc(`${esc(d.ten)} <span class="ref">${esc(d.trangThai || "—")}</span>`))
    : [muc("chưa repo nào")];
  const dich = [
    hop(`${dichDen.length} repo đã lắp`, dsDich),
    hop("Ở repo đích có gì", [muc("cùng bộ luật, cùng cổng kiểm, cùng bảng chủ sở hữu"),
      muc("<code>.ark/harness.lock.json</code> — ghim đang dùng bản khung nào")])
  ].join("");

  /* HAI VAI ASSISTANT — Đức phân vai 08/09, và ranh giới suy THẲNG từ ba khối ở trên.
   *
   * Vì sao khối này nằm CHUNG tab với mô hình vận hành, không thành tab riêng: nó không phải một
   * câu chuyện thứ hai, nó là câu *"ai giữ khối nào"* của đúng sơ đồ ngay trên nó. Tách ra tab
   * riêng thì người đọc phải tự ghép hai trang lại, và mỗi lần một khối đổi thì hai trang lệch
   * nhau — đúng bệnh mà trang này sinh ra để chữa.
   *
   * TÊN VAI VÀ TRÁCH NHIỆM LÀ GÕ TAY, và đó không phải chỗ lười: nó là một QUYẾT ĐỊNH của Đức,
   * không phải một số đo. Nhưng mỗi thẻ vai phải chở một con số SUY TỪ REPO — nếu không thì ba
   * tháng nữa nó nói về một bộ khung không còn tồn tại. Ranh giới rõ ràng: chữ là quyết định,
   * số là đo được. */
  const soSuite = soPhepKiem === null ? "suite" : `<b>${soPhepKiem}</b> suite`;
  const vai = `<div class="mh-vai">
    <div class="mh-cot loi">
      <span class="mh-so">Vai ①</span>
      <span class="mh-ten">Giữ lõi</span>
      <span class="giu">giữ Khối 1</span>
      <p class="mh-mota">Bộ khung phải còn đúng với chính nó. Vai này không đi ra ngoài.</p>
      ${hop("Việc chính", [
    muc("luật · bộ máy · trạng thái — ba tầng cổng đóng phiên canh"),
    muc(`<b>${lenh.length}</b> lệnh và ${soSuite} phải còn chạy đúng`),
    muc("mỗi bản vá kèm <b>một phép kiểm ghim</b>, không vá trần"),
    muc("<b>xoá luật không nổ lần nào</b> — thêm luật phải kể tên luật nó thay")
  ])}
      ${hop("Không được làm", [
    muc("không tự nới một lớp bảo vệ cho cổng xanh"),
    muc("không tự ký nghiệm thu việc của chính mình")
  ])}
    </div>
    <div class="mh-cot">
      <span class="mh-so">Vai ②</span>
      <span class="mh-ten">Phát &amp; thu</span>
      <span class="giu">giữ hai mũi + vòng ngược</span>
      <p class="mh-mota">Cửa duy nhất giữa bộ khung và thế giới. Vai này đi ra ngoài, rồi mang chỗ vấp về.</p>
      ${hop("Việc chính", [
    muc(`thi hành <b>${protocols.length}</b> quy trình lên <b>${dichDen.length}</b> repo đích`),
    muc("gói bản phát, đo repo đích, ghép đề bài rồi giao"),
    muc("<b>mang chỗ vấp về</b> thành mục sổ nợ của lõi — đây là việc chịu tải"),
    muc("<b>tối ưu chính quy trình</b>: cửa nào chặn 0 lượt thì cửa đó là thuế")
  ])}
      ${hop("Không được làm", [
    muc("không tự sửa lõi để repo đích chạy được — chỗ vấp phải về Vai ①"),
    muc("không báo một quy trình là ĐẠT khi chưa chạy thật trên một repo đích")
  ])}
    </div>
  </div>
  <div class="mh-bat"><b>Bất biến chịu tải, một câu:</b> người <em>sửa</em> không tự
  <em>nghiệm thu</em> bản sửa của mình. Một tờ nghiệm thu do bên bị kiểm ký là lời tự khai, không
  phải hàng rào.<br><b>Đừng đọc thành</b> &#8220;người sửa không được tìm lỗi&#8221; — vai nào cũng
  được tìm lỗi ở bất kỳ đâu; tách <em>ai tìm</em> khỏi <em>ai sửa</em> là cấm Vai &#9312; soi chính
  lõi nó giữ. Thứ phải tách là <b>người ký</b> khỏi <b>người sửa</b>.</div>`;

  return `<div class="the">
  <h2>Mô hình vận hành — ba khối</h2>
  <p>Bộ khung không phải một thư mục file đem chép. Nó là <strong>một khối dữ liệu lõi</strong>
  tự cải tiến, <strong>một lớp protocol</strong> biến việc lặp lại thành đề bài giao được, và
  <strong>các repo đích</strong> nhận bản phát rồi gửi ngược chỗ vấp về lõi.</p>
  <div class="mh">
    <div class="mh-cot loi">
      <span class="mh-so">Khối 1</span>
      <span class="mh-ten">Dữ liệu lõi</span>
      <p class="mh-mota">Repo nhà. Một nguồn sự thật cho luật, bộ máy và trạng thái.</p>
      ${loi}
    </div>
    ${mui("phát bản")}
    <div class="mh-cot">
      <span class="mh-so">Khối 2</span>
      <span class="mh-ten">Protocol</span>
      <p class="mh-mota">Việc lặp lại, có checklist, đo được bằng máy — nên giao được cho AI khác.</p>
      ${proto}
    </div>
    ${mui("thi hành")}
    <div class="mh-cot">
      <span class="mh-so">Khối 3</span>
      <span class="mh-ten">Repo đích</span>
      <p class="mh-mota">Repo đang sống, có việc và người dùng riêng. Bộ khung là khách.</p>
      ${dich}
    </div>
  </div>
  <div class="mh-vong">
    <b>Vòng ngược — đây mới là chỗ bộ khung lớn lên.</b> Repo đích vấp ở đâu thì chỗ đó thành
    một mục trong sổ nợ của lõi, rồi thành một bản vá, rồi thành một phép kiểm ghim để nó không
    tái diễn. Ba lượt migrate đầu tìm ra <b>9 · 8 · và một loạt</b> lỗi <em>của chính bộ khung</em>
    — không phải của repo đích. Không có vòng ngược thì lõi chỉ đúng trên giấy.
  </div>
  <h3 style="margin:16px 0 0">Hai vai Assistant — ai giữ khối nào</h3>
  <p class="mh-mota" style="margin:4px 0 0">Ba khối trên cần <strong>hai vai</strong>, không phải
  ba: Khối 1 là việc ở nhà, còn hai mũi và vòng ngược là <strong>cùng một việc</strong> —
  đi ra rồi mang về. Chia theo khối thì vai giữa không có gì làm; chia theo hướng đi thì đủ.</p>
  ${vai}
</div>`;
}

/* ---- KHỐI CỦA NĂM TAB MỚI ------------------------------------------------------------
 *
 * Mỗi khối dưới đây trả lời ĐÚNG MỘT câu, và câu đó viết ngay trên đầu hàm. Khối nào không nói
 * được nó trả lời câu gì thì nó là trang trí — và trang trí trên một bảng trạng thái là thứ làm
 * người ta thôi đọc cả bảng.
 */

/* "Còn việc nào đang chờ chính tôi?" — quét dấu đặt ngay trên dòng của mục, ở bốn sổ. */
/* ĐỔI MỘT KHỐI MỞ CỨNG THÀNH KHỐI GẬP ĐƯỢC — Đức nêu 08/09 cho tab Hệ thống.
 *
 * Vì sao là một bộ chuyển ở chỗ GHÉP TAB, chứ không phải một tham số thêm vào từng hàm sinh:
 * bốn khối cần gập do `khoiBatDau` · `khoiVanHanh` · `khoiVongDoi` · `khoiCauTruc` sinh ra, và cả
 * bốn hàm đó **dùng chung cho nhiều tab**. Thêm cờ vào chúng là đổi luôn các tab Đức không hề
 * phàn nàn, cộng bốn chỗ để lệch nhau. Đổi ở một chỗ ghép thì tab khác không bị chạm một byte.
 *
 * FAIL-OPEN CÓ CHỦ Ý, và đây là chỗ duy nhất trong repo tôi chọn fail-open: khối nào không khớp
 * hình dạng mong đợi (không cân thẻ, hoặc không có h2 để làm nhãn) thì **giữ nguyên**. Hỏng theo
 * hướng đó là khối vẫn mở — tức đúng hành vi hôm nay. Hỏng theo hướng ngược lại là **nội dung
 * biến mất khỏi bảng**, và một bảng thiếu mục thì tệ hơn một bảng dài. Phép ghim đo rằng nó thật
 * sự chuyển được đầu ra của các hàm sinh THẬT, nên "không khớp rồi bỏ qua" không lặng lẽ thành
 * đường mặc định. */
export function gapKhoi(html, { moSan = [] } = {}) {
  const s = String(html);
  let ra = "";
  let i = 0;

  /* Thẻ đóng khớp với thẻ mở ở vị trí `tu`, đếm ĐÚNG MỘT tên thẻ. Đếm một tên là đủ và đúng vì
   * HTML sinh ra ở đây cân thẻ: một <details> lồng trong <div> không sinh thêm thẻ div nào. */
  const timDong = (tu, ten) => {
    const tok = new RegExp(`<(/?)${ten}\\b[^>]*>`, "g");
    tok.lastIndex = tu;
    let sau = 1;
    let t;
    while ((t = tok.exec(s))) {
      sau += t[1] ? -1 : 1;
      if (sau === 0) return t.index;
    }
    return -1;
  };

  /* CHỈ CHUYỂN Ở TẦNG NGOÀI CÙNG — và đây là chỗ bản đầu của tôi sai.
   *
   * Bản đầu dò `<div class="the">` ở BẤT KỲ đâu trong chuỗi, nên nó lặn vào một <details> đã có
   * và chuyển cả khối con bên trong. Kết quả đo được: khối "Mô hình vận hành" hiện HAI nhãn —
   * một của <details> bọc ngoài, một của chính nó vừa bị chuyển. Trang trông vẫn chạy, và đó là
   * lý do lỗi này đi qua được mắt: nó không vỡ, nó chỉ nói lặp.
   *
   * Nên vòng dưới đi theo TỪNG khối ở tầng ngoài: gặp <div class="the"> thì chuyển, gặp bất kỳ
   * thẻ nào khác (kể cả <details> đã gập sẵn) thì CHÉP NGUYÊN và nhảy qua trọn khối đó. */
  const TOK = /<(div|details)\b([^>]*)>/g;
  while (i < s.length) {
    TOK.lastIndex = i;
    const m = TOK.exec(s);
    if (!m) { ra += s.slice(i); break; }

    ra += s.slice(i, m.index);
    const ten = m[1];
    const thanTu = m.index + m[0].length;
    const dong = timDong(thanTu, ten);
    if (dong < 0) { ra += s.slice(m.index); break; }          // thẻ không cân → giữ nguyên
    const ketThuc = dong + `</${ten}>`.length;

    const laThe = ten === "div" && /^ class="the/.test(m[2]);
    const than = s.slice(thanTu, dong);
    const h2 = laThe ? /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(than) : null;

    if (!h2) {
      ra += s.slice(m.index, ketThuc);                        // khối khác, hoặc không có nhãn
    } else {
      const lop = /^ class="the([^"]*)"/.exec(m[2]);
      const conLai = than.slice(0, h2.index) + than.slice(h2.index + h2[0].length);
      const mo = moSan.some((k) => h2[1].includes(k)) ? " open" : "";
      const dư = m[2].replace(/^ class="the[^"]*"/, "");
      ra += `<details class="the gap${lop ? lop[1] : ""}"${dư}${mo}>`
        + `<summary>${h2[1]}</summary>${conLai}</details>`;
    }
    i = ketThuc;
  }
  return ra;
}

export function khoiCanDuc(canDuc, tenNguoi) {
  if (!canDuc.length) {
    return '<div class="the" id="can-nguoi-chot"><h2>Cần ' + esc(tenNguoi) + '</h2>'
      + '<p>Không mục nào đang mang dấu chờ. <strong>Đọc đúng chữ:</strong> nghĩa là chưa ai '
      + '<em>đánh dấu</em> việc nào cần ' + esc(tenNguoi) + ' — không phải là không có việc nào. '
      + 'Muốn một mục hiện ở đây thì đặt <code>@Đức:bấm</code> hoặc <code>@Đức:chốt</code> ngay '
      + 'trên dòng của mục đó trong sổ nợ, sổ ý tưởng hay hồ sơ trạng thái.</p></div>';
  }
  const bam = canDuc.filter((c) => c.loai === "bam").length;
  const chot = canDuc.length - bam;
  const dong = canDuc.map((c) => '<div class="cd">'
    + '<span class="lo ' + c.loai + '">' + (c.loai === "bam" ? "BẤM" : "CHỐT") + '</span>'
    + '<span class="c">' + esc(boTenFile(c.cau))
    + '<span class="tu">' + esc(c.tuoi) + ' · nêu trong ' + esc(c.file) + '</span></span></div>').join("");
  return '<div class="the" id="can-nguoi-chot"><h2>Cần ' + esc(tenNguoi) + ' — ' + canDuc.length + ' việc · '
    + bam + ' bấm · ' + chot + ' chốt</h2>' + dong
    + '<p class="ghi"><strong>BẤM</strong> là việc tay vài phút, gom được thành một buổi. '
    + '<strong>CHỐT</strong> là việc cần nghĩ, mỗi cái một lượt. Số ngày treo <strong>đo bằng '
    + 'lịch sử kho mã</strong>, không đọc đồng hồ. Bảng <strong>không giữ danh sách này</strong>: '
    + 'nó quét dấu ngay trên dòng của mục, nên mục đóng thì dấu mất theo — không ai phải nhớ đi '
    + 'xoá ở một chỗ thứ hai.</p></div>';
}

/* "Ngay lúc này có mấy luồng đang chạy, và chúng đang làm gì?" */
/* `luc` = MỐC ĐỂ TRỪ RA TUỔI KHOÁ, và nó phải đến từ CÙNG NGUỒN với `khoa`.
 *
 * Đây là chỗ `KHUNG-63` nổ: khối này lấy bảng quyền từ HEAD (bản đem commit) rồi trừ bằng
 * `Date.now()`. Trộn dữ liệu-của-HEAD với đồng-hồ-bây-giờ là trang không bao giờ tất định, nên
 * cổng "Sự thật máy sinh còn tươi" đỏ lại sau mỗi phút trôi qua.
 *
 * LUẬT RÚT RA, ghi ở đây vì đây là chỗ trả giá: **bảng đọc dữ liệu ở đâu thì phải đọc đồng hồ ở
 * đó.** Bản commit đọc HEAD → mốc là lúc của HEAD. Bản sống `--khoa-song` đọc đĩa → mốc là bây
 * giờ, và đúng như vậy: câu duy nhất đáng hỏi ở bảng sống là câu về BÂY GIỜ. */
export function khoiDangLamGi(khoa, ngay, vet = new Map(), luc = new Date()) {
  const giu = khoa.filter((k) => k.owner);
  /* CÂU IN RA LẤY TỪ `noiDauVet`, không viết lại ở đây.
   *
   * Ba chỗ hiển thị tín hiệu này (`claim.mjs --list` · khối này · cổng đóng phiên) phải nói ĐÚNG
   * MỘT câu. Chỗ nào tự viết lại là chỗ đó sẽ rút gọn thành "rảnh" — và "rảnh" chính là cách đọc
   * đã làm một lane mất việc ngày 06/09. Tên của tín hiệu là phần của hợp đồng. */
  const noi = (k) => {
    // Tuổi thay cho mốc thô: "giữ 40 phút" đọc được ngay, "2026-09-06T09:40:00Z" thì phải tự trừ.
    // Không tính được tuổi thì mới in mốc — thà xấu còn hơn giấu.
    const gio = ageHours(k.tu, luc);
    const coGio = mocCoGio(k.tu);
    // Mốc chỉ có ngày thì KHÔNG nói giờ — xem `mocCoGio` ở `claim.mjs`, con số ma đã bật ⚠ thật.
    const phan = [gio != null ? (coGio ? "giữ " + ageLabel(gio, true) : ageLabel(gio, false)) : k.tu ? "từ " + k.tu : null];
    if (dangNhac(gio, coGio)) phan.push(coGio ? "⚠ quá " + GIO_NHAC_BANG + "h" : "⚠ quá một ngày");
    phan.push(noiDauVet(vet.get(k.khoa)));
    const co = phan.filter(Boolean);
    return co.length ? " · " + esc(co.join(" · ")) : "";
  };
  const than = giu.length
    ? giu.map((k) => NHAN_KHOA + '<div class="kh"><span class="t">' + esc(k.owner)
        + '<small>' + esc(k.task || "chưa khai đang làm gì") + ' · giữ khoá <code>' + esc(k.khoa)
        + '</code>' + noi(k) + '</small></span>'
        + '<span class="hieu ' + (vet.get(k.khoa) === DAU_VET.CHUA ? "cho" : "ban") + '">'
        + (vet.get(k.khoa) === DAU_VET.CHUA ? "CHƯA THẤY DẤU VẾT" : "ĐANG GIỮ") + '</span></div>').join(NL)
    : NHAN_KHOA + '<p>Không luồng nào đang giữ vùng trong repo này.</p>';
  /* MỖI DÒNG MỘT KHOÁ, và mỗi dòng mang nhãn. Nối chúng bằng xuống dòng chứ không nối liền:
   * bộ lọc làm việc theo DÒNG, nên hai khoá nằm chung một dòng thì hoặc lọt cả hai hoặc lọc
   * cả hai — không có cách nào đúng. */
  return NHAN_KHOA + '<div class="the" id="dang-lam-gi"><h2>Đang làm gì — ảnh chụp lúc sinh bảng · ' + giu.length + ' luồng</h2>' + NL
    + than + NL
    + '<p class="ghi"><strong>Khối này không thấy hai thứ.</strong> Một: <em>luồng đang chạy ở '
    + 'repo khác</em> — bảng của repo này chỉ thấy repo của nó. Hai: <em>luồng vừa được giao mà '
    + 'chưa kịp nhận vùng</em> — lúc đó nó chưa để lại dấu vết nào trong repo. Nên dòng "không '
    + 'luồng nào đang chạy" đọc đúng là <strong>"không luồng nào đang giữ vùng trong repo '
    + 'này"</strong>. Đây là ảnh chụp theo lần ghi gần nhất vào repo (' + esc(ngay)
    + '), không phải số liệu thời gian thực.</p>' + NL
    + NHAN_KHOA + '<p class="ghi"><strong>"Repo chưa thấy dấu vết" KHÔNG có nghĩa là luồng đó rảnh.</strong> '
    + 'Repo chỉ thấy được thứ đã chạm repo, mà một luồng cẩn thận thì dựng nháp ở ngoài rồi mới ghi vào. '
    + 'Ngày 06/09 một luồng bị đọc nhầm đúng như vậy và bị nhả khoá hộ, phải hoàn nguyên phần đã xong. '
    + '<strong>Đừng nhả khoá của luồng khác vì con số này</strong> — hỏi luồng đó, hoặc hỏi Đức.</p></div>';
}

/* "Còn mấy chỗ trống để giao việc song song?" — cố ý KHÔNG kể ai giữ, khối trên đã kể rồi. */
export function khoiKhoa(khoa) {
  const mo = khoa.filter((k) => !k.owner).length;
  const dong = khoa.map((k) => NHAN_KHOA + '<div class="kh"><span class="t">' + esc(k.khoa) + '</span>'
    + '<span class="hieu ' + (k.owner ? "ban" : "mo") + '">' + (k.owner ? "BẬN" : "MỞ")
    + '</span></div>').join(NL);
  return NHAN_KHOA + '<details class="the"><summary>Khoá làm việc — ' + khoa.length + ' khoá, ' + mo
    + ' đang mở<span class="tt">mở ra khi cần giao việc song song</span></summary>' + NL
    + '<div class="in">' + NL + dong + NL
    + '<p class="ghi">Bảng này trả lời đúng một câu: <strong>còn mấy chỗ trống để giao việc song '
    + 'song</strong>. Hai việc chạy song song được <strong>khi và chỉ khi</strong> chúng thuộc hai '
    + 'khoá khác nhau và cả hai đang MỞ. Khoá BẬN thì chỉ đọc, đừng giao thêm.</p></div></details>';
}

/* Thanh ba bậc của một ý tưởng.
 *
 * Bậc "nghỉ" KHÔNG phải bậc thứ tư trên đường đi — nó là nhánh rẽ ra. Vẽ nó thành chấm rỗng có
 * gạch ngang, chứ vẽ nó ở cuối thanh là báo cáo sai chiều: một ý tưởng đã bỏ trông y hệt một ý
 * tưởng gần xong. */
const BAC_HIEN = [["ý tưởng", "Ý TƯỞNG"], ["đang xây", "ĐANG XÂY"], ["đã chứng minh", "ĐÃ CHỨNG MINH"]];
function thanhBac(bac) {
  const nghi = bac === "nghỉ";
  const i = nghi ? -1 : BAC_HIEN.findIndex((x) => x[0] === bac);
  const o = [];
  BAC_HIEN.forEach((x, n) => {
    if (n) o.push('<span class="l' + (!nghi && n <= i ? " qua" : "") + '"></span>');
    const lop = nghi ? "" : (n < i ? " qua" : (n === i ? " nay" : ""));
    o.push('<span class="b' + lop + '"><span class="d"></span><span class="nh">' + esc(x[1]) + '</span></span>');
  });
  return '<span class="bac' + (nghi ? " nghi" : "") + '">' + o.join("") + '</span>';
}

/* BỎ TÊN FILE MÃ NGUỒN khỏi chữ hiện ở tab đầu.
 *
 * Tab đầu viết cho người KHÔNG đọc code — một phép kiểm cũ ghim đúng chỗ đó, và nó bắt được
 * bản đầu của khối này: sổ ý tưởng có mục nhắc tên một file `.mjs` ngay trong dòng "việc kế",
 * và dòng đó chảy thẳng ra trang đầu. Lọc ở ĐÂY chứ không sửa sổ: sổ là chữ của người viết,
 * và ở tab Ý tưởng thì tên file lại đúng chỗ. Cùng một câu, hai nơi đọc, hai mức chi tiết. */
export function boTenFile(t) {
  return String(t)
    .replace(/`?[\w./-]+\.(mjs|js|json|ts|py|sh)`?/g, "một file mã nguồn")
    .replace(/\s+/g, " ").trim();
}

/* Tab Ý tưởng — mỗi ý tưởng một thẻ gập.
 *
 * GIỮ NGUYÊN mọi trường lạ (`extra`). Ai viết thêm `- **rủi ro:** …` vào sổ thì dòng đó vẫn hiện
 * lên bảng. Bảng không được im lặng nuốt chữ của người viết. */
export function khoiYTuongDay(ideas) {
  if (!ideas.length) {
    return '<div class="the"><h2>Sổ ý tưởng</h2><p>Repo này chưa có <code>IDEAS.md</code>. '
      + 'Sổ ý tưởng là <em>phòng chờ</em>: chỗ để một hướng nằm lại trước khi có người bắt tay '
      + 'làm — để nó không phải rơi vào sổ nợ (nơi mọi thứ trông như lỗi) mà cũng không bốc hơi.</p></div>';
  }
  return ideas.map((y) => {
    const kv = [["Việc kế", y.viecKe], ["Ai đang làm", y.chu || "chưa ai nhận"],
      ["Phạm vi", y.phamVi || "chưa khai"]].concat(y.extra).filter((x) => x[1]);
    const than = y.khoi.map((k) => '<h4>' + esc(k.ten) + '</h4><p>' + esc(k.than.join(" ")) + '</p>').join("");
    return '<details class="the" id="y-' + esc(slug(y.ma)) + '">'
      + '<summary>' + esc(y.ma) + ' · ' + esc(y.ten)
      + '<span class="tt">' + esc(y.viecKe || "chưa khai việc kế") + '</span></summary>'
      + '<div class="in">' + thanhBac(y.bac)
      + '<dl class="kv">' + kv.map((x) => '<dt>' + esc(x[0]) + '</dt><dd>' + esc(x[1]) + '</dd>').join("") + '</dl>'
      + than + '</div></details>';
  }).join("");
}

/* "Repo chia vùng thế nào, ai được ghi vào đâu?" — tab DUY NHẤT được in đường dẫn. */
export function khoiCauTruc(vung, fileGoc, banDo) {
  const hangVung = vung.map((v) => '<div class="cay"><span class="p">' + esc(v.duong) + '</span>'
    + '<span class="st">' + esc(v.chu || "từng gói tự giữ") + '</span>'
    + '<span class="sl">' + v.soFile + ' file</span></div>').join("");
  const oFile = fileGoc.map((f) => '<span' + (f.may ? ' class="may"' : "") + '>' + esc(f.ten) + '</span>').join("");
  /* BẢN ĐỒ FILE KHÔNG VẼ Ở ĐÂY NỮA — nó có đúng MỘT chỗ, và chỗ đó là bảng đầy đủ ở nhóm
   * Hệ thống.
   *
   * Đo 07/09: cùng một nguồn `banDo` được vẽ **BA LẦN** trên cùng một tab — một danh sách gọn
   * (2.011px), một bảng đầy đủ (4.676px), và một câu trỏ qua lại giữa hai cái. Ba cách chiếu,
   * không cách nào bổ sung cho cách nào. Bản gọn còn phải **cắt câu và bỏ liên kết** để vừa
   * một dòng, tức nó là bản KÉM HƠN của cùng dữ liệu — giữ nó lại chỉ để người đọc phải cuộn
   * qua trước khi tới bản dùng được.
   *
   * Hai hàm `sach()` và `gon()` chỉ tồn tại để cắt câu cho bản gọn, nên chúng chết theo. */
  return '<div class="the"><h2>Thư mục ở tầng ngoài cùng — ' + vung.length + ' vùng</h2>' + hangVung
    + '<p class="ghi">Cột giữa là <strong>ai được ghi vào đó</strong>. Một vùng chỉ một AI được ghi '
    + 'tại một thời điểm; vùng của người khác thì chỉ được đọc.</p></div>'
    + '<div class="the"><h2>File ở gốc repo — ' + fileGoc.length + ' file</h2>'
    + '<div class="tep">' + oFile + '</div>'
    + '<p class="ghi">Ô tô xanh là file <strong>máy sinh</strong> — đừng sửa tay, sửa là mất ở lần '
    + 'sinh sau. Số còn lại là chữ của người. <strong>Bản đồ file</strong> (' + banDo.length
    + ' lối) nằm ở khối riêng phía dưới — một chỗ duy nhất.</p></div>';
}

export function khoiSucKhoeNo(so, noMo, noMuc) {
  const o = so.map((x) => {
    const lop = x.so === null ? "" : (x.so === 0 ? " sach" : " ban");
    return '<div class="o' + lop + '"><span class="n">' + (x.so === null ? "?" : x.so) + '</span>'
      + '<span class="l">' + esc(x.nhan) + '</span>'
      + '<span class="m">' + esc(x.mau || "chưa khai đã dò bao nhiêu") + '</span></div>';
  }).join("");
  const daDong = noMuc.length - noMo.length;
  return '<div class="the"><h2>Sức khoẻ — mỗi phép dò kèm nó đã dò bao nhiêu</h2>'
    + '<div class="sk">' + o + '</div>'
    + '<p class="ghi">Một số <strong>0</strong> đứng một mình trông giống hệt nhau ở hai ca ngược '
    + 'nhau: <em>đã dò hết, sạch</em> và <em>chưa dò gì cả</em>. Dòng nhỏ dưới mỗi ô là thứ tách '
    + 'được hai ca đó. Dấu <strong>?</strong> nghĩa là KHÔNG ĐO ĐƯỢC — và nó khác 0.</p></div>'
    + '<div class="the" id="so-no"><h2>Việc còn nợ — ' + noMo.length + ' mục đang mở</h2>'
    + '<div class="hs"><span class="n">' + noMo.length + '</span><span class="t">đang mở trong sổ nợ</span></div>'
    + '<div class="hs"><span class="n">' + daDong + '</span><span class="t">đã đóng, giữ lại để tra</span></div>'
    /* DANH SÁCH, KHÔNG CHỈ CON SỐ — Đức nêu 09/09: *"tôi tìm KHUNG-30, 40, 53 trong dashboard
     * nhưng rất mơ hồ"*. Đo lại đúng thế: `KHUNG-53` xuất hiện **0 lần** trên cả trang dù nó
     * đang mở, `KHUNG-30` chỉ hiện như một chữ nhắc trong thân mục khác. Khối này có hai con số
     * và một đoạn giải thích cách đếm — nhưng **không có mục nào**.
     *
     * Dữ liệu vốn đã có: `parseBacklog` trả về đủ `ma` · `tieuDe` · `uuTien` · `choChot` cho cả
     * 25 mục. Bảng chỉ đếm rồi vứt đi. Đây là kiểu thiếu tệ nhất của một bảng trạng thái: nó
     * KHẲNG ĐỊNH có 25 việc rồi không cho người đọc biết 25 việc đó là gì, nên con số thành một
     * lời phải tin chứ không phải một thứ tra được.
     *
     * Chảy thành cột (`.cot`) — 25 dòng một cột là thứ Đức vừa phải cuộn ở tab Migrate. */
    + (noMo.length
      ? '<h3>Cả ' + noMo.length + ' mục, xếp theo mức ưu tiên</h3><div class="cot">'
        + [...noMo].sort((a2, b2) => String(a2.uuTien).localeCompare(String(b2.uuTien))
          || String(a2.ma).localeCompare(String(b2.ma), undefined, { numeric: true }))
          .map((m) => '<div class="nom' + (m.choChot ? " chot" : "") + '">'
            + '<span class="ut">' + esc(m.uuTien || "P?") + '</span>'
            + '<span class="ma">' + esc(m.ma) + '</span>'
            + '<span class="t">' + esc(m.ten || "(mục này không có tiêu đề)")
            + (m.choChot ? '<em> — chờ người chốt</em>' : "") + '</span></div>').join("")
        + '</div>'
      : '')
    + '<details><summary>Con số này đếm thế nào, và vì sao nó thà đếm thừa hơn đếm thiếu</summary>'
    + '<p>Đếm mục trong sổ nợ, và một mục tính là đã đóng <strong>chỉ khi mã của nó bị gạch</strong>. '
    + 'Không dò từ khoá "xong" trong văn xuôi — có mục viết <em>"gỡ khoá sau khi việc kia xong"</em>, '
    + 'và chữ "xong" ở đó là một điều kiện chứ không phải trạng thái. Dò giữa câu là <strong>đóng '
    + 'oan</strong> một việc đang mở, tức bảng báo <em>thiếu</em> nợ. Cố ý lệch về phía báo thừa: '
    + 'một việc bị đếm thừa thì có người mở ra xem rồi bỏ qua; một việc bị đếm thiếu thì biến mất '
    + 'và không ai đi tìm.</p></details></div>';
}

/* "Bảng này chạy thế nào, và nhiều AI cùng làm thì cái gì giữ cho không giẫm chân?" */
export function khoiVanHanh(coChe, batBien, soKhoa, oLamMoi = "") {
  const cc = coChe.map((c) => '<li><strong>' + esc(c.ten) + '</strong> — '
    + esc(String(c.cau).replace(/\*/g, "")) + '</li>').join("");
  const bb = batBien.map((b) => '<li><strong>' + esc(b.so) + '</strong> ' + esc(b.cau) + '</li>').join("");
  /* O LAM MOI TRUYEN VAO, khong viet ban thu hai o day. Ban truoc co mot the "Lam moi bang
   * nay" go tay ngay cho nay, va no chi ke ve ban da commit — nen nguoi doc no ket luan F5
   * khong bao gio thay so moi, ke ca khi repo dang co bang SONG. Mot cau tra loi dung mot
   * nua la cau tra loi sai. */
  return oLamMoi
    + (coChe.length
      ? '<div class="the"><h2>' + coChe.length + ' cơ chế giữ cho không giẫm chân</h2>'
        + '<p>Hiện có <strong>' + soKhoa + ' vùng</strong>, nên tối đa <strong>' + soKhoa
        + ' việc</strong> chạy song song được — việc thứ ' + (soKhoa + 1)
        + ' phải chờ một vùng được trả.</p><ul>' + cc + '</ul></div>'
      : "")
    + (batBien.length
      ? '<div class="the"><h2>' + batBien.length + ' điều không được phá</h2>'
        + '<p>Mỗi cái sinh ra từ một lần hỏng thật.</p><ul>' + bb + '</ul>'
        + '<p class="ghi">Các mục trên <strong>đọc lại từ luật</strong>, không phải bản chép — nên '
        + 'bảng không thể nói khác luật.</p></div>'
      : "");
}

/* "Đã đưa repo nào lên chuẩn, ngày nào, bản nào, còn treo gì?"
 *
 * VÌ SAO NÓ THÀNH MỘT TAB, chứ vẫn để là một trang riêng. Đức nêu 06/09: mở bảng mẹ mà **không
 * thấy đường nào dẫn sang sổ migrate**. Đường đó có thật — nó nằm trong khối "Trang liên quan"
 * ở tab đầu — nhưng nằm dưới bốn khối khác, nên trên thực tế nó không tồn tại. Một liên kết
 * người dùng không tìm ra thì bằng không có, và câu trả lời đúng không phải là bôi đậm nó lên.
 *
 * Trang riêng VẪN GIỮ: cả hai đọc chung một thư mục hồ sơ, nên chúng không thể nói khác nhau —
 * một nguồn, hai cách chiếu. Trang riêng có ích khi cần gửi riêng sổ migrate cho ai đó.
 *
 * TÁCH TỪNG LƯỢT THÀNH TAB CON, cũng theo Đức: ba hồ sơ nối đuôi nhau thì người mở ra phải
 * cuộn qua hai lượt cũ mới tới lượt mình cần, và mỗi hồ sơ đều dài. */
/* ---- Tab Migrate: BẢNG MỐC trước, chữ sau ---------------------------------
 *
 * Đức chốt 06/09, nguyên văn: *"mỗi khi tôi check status migrate, tôi sẽ thấy milestone lớn đang
 * ở bước nào, các feature đã được migrate thế nào, đã go live thế nào, trải qua các bước audit ra
 * sao. Nếu mà dừng lại bước nào tôi sẽ continue và chạy bước đó chứ tôi sẽ không đi sâu vào đọc
 * từng chữ."*
 *
 * Bản trước chiếu gần trọn thân hồ sơ ra màn hình. Chữ thì hay, nhưng nó trả lời sai câu hỏi:
 * người mở sổ hỏi *"đang ở đâu, làm gì tiếp"*, không hỏi *"lượt thứ hai viết gì"*. Nên bố cục đảo
 * lại: bảng mốc → việc kế → rồi mới tới chữ, và chữ **gập lại**.
 *
 * BA MỐC LỚN lấy từ `docs/protocols/CHUYEN-REPO-LEN-CHUAN.md` — *"migrate là BA việc trong một"*
 * (Đức chốt 05/09): **migrate** · **audit** · **assistant onboard**. Không tự đặt mốc mới ở đây;
 * bảng chỉ chiếu lại mốc mà quy trình đã khai, nếu không thì hai chỗ sẽ nói hai kiểu.
 *
 * "CHƯA KHAI" KHÔNG ĐƯỢC LÀM TRÒN THÀNH "CHƯA XONG". Ba hồ sơ đang có được ghi TRƯỚC khi bảng này
 * tồn tại, nên chúng không khai hai mốc sau. Suy bừa ra "chưa xong" là bịa một con số nợ; suy bừa
 * ra "xong" thì tệ hơn. Ô nào không có nguồn thì nói thẳng là chưa khai — và chính chỗ trống đó
 * là thông tin: nó chỉ ra hồ sơ đang thiếu gì. */

/** Ba mốc lớn của một lượt migrate. Thứ tự là thứ tự thật: không audit nổi thứ chưa nằm trong repo. */
export const MOC_MIGRATE = Object.freeze([
  { khoa: "viec_migrate", nhan: "Migrate", y: "bộ khung nằm trong repo đích, hình dạng đã khai, cổng chạy được" },
  { khoa: "viec_audit", nhan: "Audit", y: "đã quét repo đích, nợ tìm được đã nằm trong sổ nợ của nó" },
  { khoa: "viec_assistant", nhan: "AI onboard", y: "một phiên AI ở repo đích chạy được trọn vòng làm việc" }
]);

/**
 * Trạng thái một mốc, và **nguồn** của nó. Thuần, nên đột biến kiểm được.
 *
 * `nguon` là phần quan trọng: `"khai"` = hồ sơ tự nói · `"suy"` = bảng suy ra từ trường khác, và
 * phải nói rõ suy từ đâu · `null` = không có nguồn nào, ô để trống.
 */
export function xetMoc(fm, moc) {
  const raw = fm?.[moc.khoa];
  if (raw !== undefined && String(raw).trim() !== "") {
    const t = String(raw).trim().toLowerCase();
    const den = /^(xong|đã xong|có|xanh|đạt)$/.test(t) ? "xong" : /^(đang|dở|một phần)$/.test(t) ? "dang" : "chua";
    return { den, chu: String(raw).trim(), nguon: "khai" };
  }
  /* SUY, và chỉ suy ĐÚNG MỘT ô. Mức 3 là định nghĩa "đã lên chuẩn" của quy trình, nên `muc_sau`
   * trả lời được mốc 1 — và chỉ mốc 1. Hai mốc sau không có trường nào tương đương, nên chúng
   * để trống chứ không được mượn tạm con số của mốc 1. */
  if (moc.khoa === "viec_migrate") {
    const m = Number(fm?.muc_sau);
    if (Number.isFinite(m)) return { den: m >= 3 ? "xong" : "chua", chu: `mức ${m}`, nguon: "suy" };
  }
  return { den: "trong", chu: "chưa khai", nguon: null };
}

/** Một câu: lượt này dừng ở đâu, chạy gì để đi tiếp. Không có thì im, đừng bịa. */
export function viecKe(fm) {
  const khai = fm?.viec_ke;
  if (typeof khai === "string" && khai.trim()) return khai.trim();
  const cong = String(fm?.cong_dong_phien || "").trim().toLowerCase();
  if (cong && !/xanh/.test(cong)) return "cổng đóng phiên chưa xanh — chạy lại `node scripts/session-check.mjs --as <phiên>` ở repo đó";
  for (const moc of MOC_MIGRATE) {
    const x = xetMoc(fm, moc);
    if (x.den === "chua" || x.den === "dang") return `mốc "${moc.nhan}" chưa xong — ${moc.y}`;
  }
  return null;
}

/* ---- O LAM MOI: F5 co doi so hay khong -------------------------------------
 *
 * Duc neu 07/09: *"can them 1 o nho de copy link cua file dung de refresh, chay host local...
 * neu hien tai F5 la check status moi nhat duoc roi thi phai giai thich"*.
 *
 * Cau tra loi KHAC NHAU cho hai file, va day la cho de hieu sai nhat cua ca bang:
 * ban da commit suy tu HEAD nen **F5 khong doi so**; ban SONG doc bang quyen tu dia nen
 * **F5 co doi**. Noi gop "F5 di" la day sai mot trong hai.
 *
 * Khoi dat o tab AI dieu phoi vi do la tab tra loi *"dang co gi - lam gi tiep"* - nguoi hoi
 * "F5 thay chua" dang dung dung o do. Tab Van hanh dung LAI cung khoi nay, khong viet ban
 * thu hai: hai ban la hai ban se lech.
 */
export function khoiLamMoi(ng) {
  const nut = (gia) => '<div class="cpd"><code>' + esc(gia) + '</code>'
    + '<button class="cp" type="button" data-cp="' + esc(gia) + '">COPY</button></div>';
  const ac = ng.anhChup;
  const oAnh = '<div class="h khong"><span class="f5">F5 KHÔNG ĐỔI SỐ</span>'
    + '<div class="t">' + esc(ac.file || "bảng đã commit") + '</div>'
    + '<p class="g">Bản <strong>đã commit</strong>. Nội dung suy hoàn toàn từ lần commit gần nhất, '
    + 'nên bấm F5 mười lần vẫn ra đúng con số cũ — muốn số mới thì phải sinh lại rồi commit. '
    + 'Cố ý làm vậy: bộ sinh nhìn đồng hồ thì sang ngày là mọi phiên bị chặn đẩy dù không dữ '
    + 'liệu nào đổi.</p>' + nut(ac.lenh) + '</div>';
  if (!ng.song) {
    return '<div class="the"><h2>Làm mới bảng — F5 có thấy số mới không?</h2>'
      + '<div class="lm">' + oAnh + '</div>'
      + '<p class="ghi">Repo này <strong>chưa có bảng SỐNG</strong> (không khai lệnh chạy nó), nên '
      + 'câu trả lời chỉ có một: F5 không đổi số, phải sinh lại. Bảng sống là tính năng '
      + '<code>F1.3</code> của bộ khung — muốn có thì nâng bộ khung, đừng chép tay.</p></div>';
  }
  const s2 = ng.song;
  const oSong = '<div class="h co"><span class="f5">F5 LÀ THẤY</span>'
    + '<div class="t">' + esc(s2.file) + (s2.url ? " &nbsp;·&nbsp; " + esc(s2.url) : "") + '</div>'
    + '<p class="g">Bản <strong>SỐNG</strong>, nằm ngoài git. Nó đọc bảng quyền từ <strong>đĩa</strong> '
    + 'nên đổi byte mỗi lượt có ai nhận hay trả khoá — F5 là thấy ngay, không cần nhờ AI sinh lại.</p>'
    + s2.cua.map((c) => '<p class="g" style="margin-top:7px"><strong>' + esc(c.nhan) + '</strong></p>' + nut(c.gia)).join("")
    + (s2.url ? nut(s2.url) : "")
    + '</div>';
  return '<div class="the"><h2>Làm mới bảng — F5 có thấy số mới không?</h2>'
    + '<div class="lm">' + oSong + oAnh + '</div>'
    + '<p class="ghi"><strong>Hai file, hai việc — đừng gộp.</strong> Cái sai duy nhất ở đây là tưởng '
    + 'chúng giống nhau: một cái là ảnh chụp có commit, cổng đóng phiên kiểm được; một cái là số thời '
    + 'gian thực, không commit.'
    + (s2.cong
      ? ' Cổng mặc định <code>' + s2.cong + '</code>, nhưng máy chủ <strong>nhảy cổng</strong> nếu cổng '
        + 'đó đã bị một repo khác chiếm — lấy cổng thật ở dòng máy chủ in ra, đừng tin con số ở đây.'
      : ' Cổng thì đọc ở dòng máy chủ in ra lúc chạy.')
    + '</p></div>';
}

/* ---- Checklist tinh nang cua mot luot migrate ------------------------------
 *
 * Chieu lai khoi ma `features.mjs --migrate` sinh va nguoi dan vao ho so. Bang **khong khai
 * lan thu hai** - ho so noi gi thi bang noi dung the, kem NGAY DO va BAN DANH MUC cua chinh
 * luot do ay. Thieu hai con so do thi sau thang sau khong ai biet checklist nay con dung khong.
 *
 * MUC CHUA XONG HIEN TRUOC, muc da xong gap lai. Nguoi mo so hoi *"con thieu gi"*, khong hoi
 * *"da co gi"* - va 24 dong xanh dung tren 10 dong vang la cach chon 10 dong vang.
 */
export function khoiChecklist(ck) {
  if (!ck) {
    return '<details class="the gap"><summary>Checklist tính năng — <strong>chưa đo</strong></summary>'
      + '<p>Hồ sơ này không mang khối checklist. <strong>Chưa đo khác với thiếu tính năng</strong> — '
      + 'ba hồ sơ đầu được ghi trước khi danh mục tính năng tồn tại, nên chỗ trống này nói về hồ sơ, '
      + 'không nói về repo.</p>'
      + '<p>Đo rồi dán vào hồ sơ:</p>'
      + '<pre class="code">node scripts/features.mjs --migrate &lt;đường-dẫn-repo&gt;</pre>'
      + '<p class="ghi">Hồ sơ migrate là vùng <strong>chỉ thêm</strong>: thêm khối mới, đừng sửa khối cũ.</p></details>';
  }
  const D = { xong: "✓", "mot-phan": "~", thieu: "✗", ngoai: "–" };
  const NHAN = { xong: "đủ", "mot-phan": "một phần", thieu: "thiếu", ngoai: "chỉ repo phát hành" };
  const o = ["xong", "mot-phan", "thieu", "ngoai"].map((t) => '<div class="o ' + t + '"><b>'
    + ck.dem[t] + '</b><span>' + esc(NHAN[t]) + '</span></div>').join("");
  const hangKhoi = ck.khoi.map((k) => '<div class="ckb"><span class="ma">' + esc(k.ma) + '</span>'
    + '<span>' + esc(k.ten) + '</span>'
    + '<span class="dm ' + (k.tong === 0 ? "" : k.xong === k.tong ? "het" : "thieu") + '">'
    + (k.tong === 0 ? "ngoài phạm vi" : k.xong + "/" + k.tong) + '</span></div>').join("");
  const dongMuc = (m) => '<div class="ckm ' + m.trang + '"><span class="d">' + D[m.trang] + '</span>'
    + '<span class="ma">' + esc(m.ma) + '</span><span>' + esc(m.ten)
    + (m.tuBan ? ' <span class="ma">từ bản ' + esc(m.tuBan) + '</span>' : "")
    + (m.thieu ? '<span class="tv">thiếu: ' + esc(m.thieu) + '</span>' : "") + '</span></div>';
  const tatCa = ck.khoi.flatMap((k) => k.muc);
  const chuaXong = tatCa.filter((m) => m.trang === "mot-phan" || m.trang === "thieu");
  return '<div class="the"><h2>Checklist tính năng — ' + ck.xong + '/' + ck.tong + ' trong phạm vi</h2>'
    + '<p class="ghi">Danh mục bản <code>' + esc(ck.ban || "chưa khai") + '</code> · đo ngày <strong>'
    + esc(ck.ngay || "chưa khai") + '</strong>. Số này <strong>đo, không tự khai</strong> — nguồn là '
    + 'khối do <code>features.mjs --migrate</code> sinh, dán vào hồ sơ lượt ấy.</p>'
    + '<div class="ckt">' + o + '</div>'
    + (chuaXong.length
      ? '<h3>Còn ' + chuaXong.length + ' mục chưa xong — xử <code>~</code> trước <code>✗</code></h3>'
        + '<div class="cot">' + chuaXong.map(dongMuc).join("") + '</div>'
        + '<p class="ghi"><strong><code>~</code> MỘT PHẦN nguy hiểm hơn <code>✗</code> THIẾU.</strong> '
        + 'Mục một phần trông như đang chạy nhưng hỏng ở chỗ không ai nhìn — ca thật đo được: có '
        + '<code>session-check.mjs</code> mà thiếu <code>npm run gate</code>, nên cổng có mặt mà không '
        + 'ai gọi được bằng tên chuẩn.</p>'
      : '<h3>Không mục nào chưa xong</h3><p>Mọi tính năng trong phạm vi repo này đều đủ ở lần đo trên.</p>')
    + '<details class="gap" style="background:none;border:0;box-shadow:none;padding:0;margin:9px 0 0">'
    + '<summary>Cả ' + ck.khoi.length + ' khối tính năng, và ' + tatCa.length + ' mục</summary>'
    + '<div class="cot">' + hangKhoi + '</div>'
    + '<h4>Từng mục</h4><div class="cot">' + tatCa.map(dongMuc).join("") + '</div>'
    + '</details></div>';
}

export function khoiMigrate(hoSo) {
  if (!hoSo.length) {
    return '<div class="the"><h2>Sổ migrate</h2><p>Chưa lượt migrate nào được ghi hồ sơ. '
      + 'Mỗi lần đưa một repo lên chuẩn thì thêm <strong>một</strong> hồ sơ, chỉ thêm — migrate '
      + 'xảy ra thưa, vài tuần có khi vài tháng một lần, nên không ghi là lần sau dò lại từ đầu '
      + 'và vấp đúng chỗ cũ.</p></div>';
  }
  const den = { "xanh": "xanh", "đỏ": "do", "chưa chạy": "vang" };
  const v = (h, k) => (h.fm[k] === undefined || h.fm[k] === "" ? null : String(h.fm[k]));
  /* CHECKLIST doc tu THAN ho so, khong tu frontmatter: khoi do `features.mjs --migrate` sinh
   * ra la markdown, va nguoi dan nguyen khoi vao. Doc lai chinh khoi ay la bang khong the noi
   * khac ho so — bat ai go tay mot con so vao frontmatter thi som muon hai cho se lech. */
  const ckOf = new Map(hoSo.map((h) => [h.file, docChecklistTinhNang(h.body)]));
  const id = (h) => "mg-" + slug(v(h, "repo") || h.file);
  const O = { xong: "✓", chua: "✗", dang: "◐", trong: "·" };

  /* ---- 1. BẢNG MỐC. Ô đầu tiên người mở sổ nhìn vào. ---------------------- */
  const hangMoc = hoSo.map((h) => {
    const o = MOC_MIGRATE.map((m) => {
      const x = xetMoc(h.fm, m);
      return '<td class="so mc mc-' + x.den + '" title="' + esc(m.nhan + ": " + x.chu + (x.nguon === "suy" ? " (suy ra)" : "")) + '">'
        + O[x.den] + (x.nguon === "suy" ? '<sup>?</sup>' : "") + '</td>';
    }).join("");
    const cong = v(h, "cong_dong_phien") || "chưa khai";
    const ck = ckOf.get(h.file);
    const oTN = ck
      ? '<td class="so mc mc-' + (ck.xong === ck.tong ? "xong" : "dang") + '" title="'
        + esc('danh mục bản ' + (ck.ban || "?") + " · đo ngày " + (ck.ngay || "?")) + '">'
        + ck.xong + '/' + ck.tong + '</td>'
      : '<td class="so mc mc-trong" title="hồ sơ chưa mang khối checklist — chưa ĐO, không phải THIẾU">chưa đo</td>';
    return '<tr><td><a href="#' + esc(id(h)) + '" data-goto2="' + esc(id(h)) + '">'
      + esc(v(h, "repo") || h.file) + '</a><small>' + esc(v(h, "ngay") || "—") + '</small></td>'
      + o + oTN
      + '<td class="so"><span class="cham ' + (den[cong.trim()] || (/xanh/i.test(cong) ? "xanh" : "vang")) + '"></span>' + esc(cong) + '</td>'
      + '<td class="so">' + esc(v(h, "ban_khung") || "—") + '</td>'
      + '<td>' + esc(v(h, "trang_thai") || "chưa khai") + '</td></tr>';
  }).join("");

  /* ---- 2. VIỆC KẾ. Chỉ hiện repo còn dở — repo xong rồi thì không có gì để nói. */
  const ke = hoSo.map((h) => [h, viecKe(h.fm)]).filter(([, k]) => k);
  const khoiKe = ke.length
    ? '<div class="the"><h2>Dừng ở đâu — ' + ke.length + ' lượt còn việc</h2>'
      + ke.map(([h, k]) => '<div class="kh"><span class="t">' + esc(v(h, "repo") || h.file)
        + '<small>' + esc(k) + '</small></span>'
        + '<a class="hieu ban" href="#' + esc(id(h)) + '" data-goto2="' + esc(id(h)) + '">MỞ HỒ SƠ</a></div>').join("")
      + '</div>'
    : '<div class="the"><h2>Dừng ở đâu</h2><p>Không lượt nào đang dở — cả ' + hoSo.length
      + ' hồ sơ đều khai xong và cổng đóng phiên xanh.</p></div>';

  /* ---- 3. Tab con từng repo: SỐ trước, chữ GẬP LẠI ---------------------- */
  const nut = hoSo.map((h, i) => '<button role="tab" data-tab2="' + esc(id(h)) + '"'
    + ' aria-selected="' + (i === 0 ? "true" : "false") + '">'
    + '<span class="cham ' + (den[String(v(h, "cong_dong_phien") || "").trim()] || "vang") + '"></span>'
    + esc(v(h, "repo") || h.file)
    + '<small>' + esc(v(h, "ngay") || "chưa khai ngày") + '</small></button>').join("");

  const oSo = (h) => [["mức đạt chuẩn", (v(h, "muc_truoc") || "?") + " → " + (v(h, "muc_sau") || "?")],
    ["lỗi bộ khung tìm ra", v(h, "loi_tim_ra") || "chưa khai"],
    ["cổng đóng phiên", v(h, "cong_dong_phien") || "chưa khai"],
    ["kết quả", v(h, "trang_thai") || "chưa khai"]]
    .map((x) => '<div class="o"><span class="n">' + esc(x[1]) + '</span><span class="l">' + esc(x[0]) + '</span></div>')
    .join("");

  const mocCon = (h) => MOC_MIGRATE.map((m) => {
    const x = xetMoc(h.fm, m);
    return '<div class="kh"><span class="t">' + O[x.den] + " " + esc(m.nhan)
      + '<small>' + esc(m.y) + '</small></span>'
      + '<span class="hieu ' + (x.den === "xong" ? "mo" : x.den === "trong" ? "tt" : "ban") + '">'
      + esc(x.chu) + (x.nguon === "suy" ? " (suy ra)" : "") + '</span></div>';
  }).join("");

  const khung = hoSo.map((h, i) => '<div class="tab2" id="' + esc(id(h)) + '"' + (i === 0 ? "" : " hidden") + '>'
    + '<div class="the"><h2>' + esc(v(h, "repo") || h.file) + '</h2>'
    + '<p class="ghi">' + esc(v(h, "ngay") || "chưa khai ngày") + ' · bản khung <code>'
    + esc(v(h, "ban_khung") || "?") + '</code> · ' + esc(v(h, "nghe") || "chưa khai nghề") + '</p>'
    + '<div class="sk">' + oSo(h) + '</div>'
    + mocCon(h)
    + '<div class="hs-do">chi phí trước: ' + esc(v(h, "chi_phi_truoc") || "chưa khai")
    + ' &nbsp;·&nbsp; sau: ' + esc(v(h, "chi_phi_sau") || "chưa khai") + '</div>'
    + '</div>'
    + khoiChecklist(ckOf.get(h.file))
    /* CHỮ GẬP LẠI, và mặc định ĐÓNG. Toàn văn hồ sơ là thứ đáng giữ — chỗ vấp thật nằm trong đó —
     * nhưng nó là thứ đọc KHI CẦN, không phải thứ đập vào mắt mỗi lần mở sổ. */
    + '<details class="the gap"><summary>Toàn văn hồ sơ — chỗ vấp, cách chữa, số đo từng bước</summary>'
    + md(h.body) + '</details></div>').join("");

  /* TAY KÉO ĐẶT MỘT LẦN, ăn cho cả tab. Nó đổi một biến ở `:root` nên mọi khối `.cot` bên dưới
   * theo cùng — bốn hồ sơ migrate mỗi cái một checklist, đặt bốn tay kéo là bốn chỗ nói cùng một
   * điều, đúng cái luật một-khái-niệm-một-chỗ của ADR-0006 cấm. */
  const tayKeo = '<div class="keo">'
    + '<label for="ck-cot">Bề rộng cột</label>'
    + '<input type="range" id="ck-cot" min="200" max="900" step="20" value="360">'
    + '<output id="ck-cot-so">360px</output>'
    + '<button type="button" id="ck-cot-ve">về mặc định</button>'
    + '</div>';

  return '<div class="the"><h2>Sổ migrate — ' + hoSo.length + ' lượt · ba mốc mỗi lượt</h2>'
    + '<div class="tw"><table class="mgt"><thead><tr><th>Repo</th>'
    + MOC_MIGRATE.map((m) => '<th class="so" title="' + esc(m.y) + '">' + esc(m.nhan) + '</th>').join("")
    + '<th class="so" title="tính năng đủ / tổng số trong phạm vi repo đó, theo lần ĐO ghi trong hồ sơ">Tính năng</th>'
    + '<th class="so">Cổng</th><th class="so">Bản khung</th><th>Kết quả</th></tr></thead><tbody>'
    + hangMoc + '</tbody></table></div>'
    + '<p class="ghi"><strong>✓ xong · ◐ đang · ✗ chưa · · chưa khai.</strong> Dấu <sup>?</sup> nghĩa là '
    + 'bảng <em>suy ra</em> từ trường khác, không phải hồ sơ tự khai — chỉ mốc <em>Migrate</em> suy được '
    + '(từ <code>muc_sau</code>). Ô trống <strong>không</strong> có nghĩa là chưa làm: ba hồ sơ đang có '
    + 'được ghi trước khi bảng này tồn tại nên chúng không khai hai mốc sau. Hồ sơ từ nay khai thêm '
    + '<code>viec_audit</code> · <code>viec_assistant</code> · <code>viec_ke</code> thì ô tự đầy.</p>'
    + '<p class="ghi">Cột <strong>Tính năng</strong> đọc từ khối checklist do '
    + '<code>features.mjs --migrate</code> sinh, dán trong hồ sơ lượt ấy — kèm <strong>ngày đo</strong> '
    + 'và <strong>bản danh mục</strong> (đưa chuột lên ô để xem). <em>chưa đo</em> nói về HỒ SƠ, không '
    + 'nói về repo: ba hồ sơ đầu được ghi trước khi danh mục tính năng tồn tại.</p>'
    + '<p class="ghi">Hồ sơ <strong>chỉ thêm, không sửa cái cũ</strong>. Cột <em>lỗi tìm ra</em> ở tab con '
    + 'đếm lỗi <strong>của chính bộ khung</strong> mà lượt ấy lôi ra, không phải lỗi của repo đích: '
    + 'đó là chỗ bộ khung lớn lên.</p></div>'
    + khoiKe
    + '<nav class="tabs2" role="tablist">' + nut + '</nav>'
    + tayKeo
    + khung;
}

export function khoiLienQuan(banDo, trangCo) {
  const co = trangCo instanceof Set ? trangCo : new Set(trangCo || []);
  const item = [];
  for (const c of banDo || []) {
    for (const m of String(c[1] || "").matchAll(/\]\(([^()\s]+\.html)\)/g)) {
      const url = m[1];
      // Bỏ chính trang mẹ: một trang tự trỏ về mình trong mục "trang liên quan" là nhiễu.
      if (url === TRANG_FILE || !co.has(url)) continue;
      const ten = String(c[0]).split("**").join("");
      item.push(`<li><a href="${esc(url)}">${esc(ten)}</a></li>`);
    }
  }
  if (!item.length) return "";
  return `<div class="the"><h2>Trang liên quan</h2><ul class="lienquan">${item.join("")}</ul></div>`;
}

export function trang(dl) {
  const { ten, ban, ngay, so, lenh, banDo, workflows, protocols, adrs, legend, nhatKy, daXong = [], huongDan, st,
    briefs = [], dichDen = [], soPhepKiem = null,
    ideas = [], canDuc = [], khoa = [], vetKhoa = new Map(), noMo = [], noMuc = [], coChe = [], batBien = [], vung = [], fileGoc = [], hoSo = [], laRepoNha = false } = dl;
  const tenNguoi = dl.tenNguoiChot || "người chốt";
  /* MOT khoi, HAI cho dat (tab AI dieu phoi + tab Van hanh). Tinh mot lan roi dung lai:
   * hai ban se lech, va luc do khong ai biet ban nao dung. */
  const oLamMoi = khoiLamMoi(nguonLamMoi({ tenBang: TRANG_FILE, lenh, maMayChu: dl.maMayChu }));

  /* BỐN NHÓM, không phải mười tab.
   *
   * Đức chốt 07/09 sau audit UX: bảng đang *fragment* và *tự mâu thuẫn*. Đo được trên bản đã
   * commit: **bản đồ file vẽ 3 lần**, còn "Cần Đức" · "Sức khoẻ" · "Ý tưởng" · "Giao việc" ·
   * "Làm mới bảng" mỗi thứ vẽ **2 lần** — và không lần nào là tóm tắt, đều là bản vẽ ĐẦY ĐỦ.
   *
   * Mười tab ngang hàng không nói được cái gì quan trọng hơn cái gì. Bốn nhóm thì nói được, vì
   * chúng chia theo **câu hỏi người mở trang đang có**:
   *
   *   Tổng quan → "repo đang thế nào"        (đúng BA CÂU, không gì khác)
   *   Công việc → "tôi phải làm gì"           (mọi thứ HÀNH ĐỘNG được)
   *   Hệ thống  → "cái này chạy thế nào"      (đọc một lần là hiểu)
   *   Lịch sử   → "chuyện gì đã xảy ra"       (KHÔNG hành động được nữa)
   *
   * LUẬT MỘT-CHỖ: mỗi khái niệm chỉ vẽ đầy đủ ở **một** nhóm. Chỗ khác được in một câu tóm tắt
   * kèm liên kết, không được vẽ lại. Ba câu ở Tổng quan là ngoại lệ DUY NHẤT, và chúng là tóm
   * tắt thật — một dòng, một con số, một liên kết.
   *
   * Vì sao ranh "Lịch sử" quan trọng hơn nó trông: thứ nằm trong đó **không được sinh ra việc**.
   * Bản trước quét `HANDOFF.md` tìm dấu chờ người chốt, nên mỗi lần một phiên KỂ LẠI rằng có
   * việc chờ thì lần kể đó thành một việc mới, vĩnh viễn — 8 trong 13 dấu là ảo. Xem `SO_CON_SONG`.
   *
   * Lý do và cái MẤT: `docs/adr/0006-bang-mot-khai-niem-mot-cho.md`. */
  const tabs = [
    ["tong-quan", "Tổng quan"],
    ["cong-viec", "Công việc"],
    ["migrate", "Migrate"],
    ["he-thong", "Hệ thống"],
    ["lich-su", "Lịch sử"]
  ];

  const oSo = so.map((s) => `<div class="o ${s.mau || ""}"><b>${esc(s.so)}</b><span>${s.nhan}</span></div>`).join("");

  /* WORKFLOW CHIA THEO NHÓM, KHAI TRONG DỮ LIỆU — không lọc theo tên file.
   *
   * Đức nêu 08/09: nội dung migrate bị trộn vào các tab khác nên khó làm việc. Đo lại đúng thế:
   * chữ "migrate" xuất hiện 59 lần ở tab Công việc, 53 lần ở Hệ thống, 41 lần ở Lịch sử — sổ
   * migrate nằm tab này, quy trình migrate nằm tab kia.
   *
   * Cách chia: workflow nào khai `nhom: migrate` trong frontmatter thì về tab Migrate. Lọc theo
   * TÊN FILE thì đổi tên file một lần là tab rỗng mà không ai đỏ; khai vào dữ liệu thì chính
   * file đó nói nó thuộc nhóm nào — cùng nguyên tắc "suy từ dữ liệu, không gõ tay" của cả trang. */
  /* MỘT bộ vẽ workflow, dùng cho cả hai tab.
   *
   * Trước 08/09 có HAI bộ vẽ: một hàm `tabWorkflow` và một khối lồng thẳng trong tab Hệ thống.
   * Hàm kia **chưa bao giờ được gọi** — kiểm ở bản đã commit: chuỗi `tabWorkflow` xuất hiện đúng
   * MỘT lần, tức chỉ có định nghĩa. Nên nó là mã chết, và nó là loại mã chết tệ nhất: một bản sao
   * trông y như bản thật, nên lượt sau sửa nhầm vào đó rồi tưởng đã sửa. Đã xoá. */
  const veWorkflow = (w, mo = false) => {
    const than2 = w.than.split(NL).filter((l) => !l.startsWith("# "));
    const iMer = than2.findIndex((l) => l.trim().startsWith("```mermaid"));
    const jMer = iMer >= 0 ? than2.findIndex((l, k) => k > iMer && l.trim().startsWith("```")) : -1;
    const luuDo = iMer >= 0 ? than2.slice(iMer, jMer + 1).join(NL) : "";
    const conLai = iMer >= 0 ? [...than2.slice(0, iMer), ...than2.slice(jMer + 1)].join(NL) : than2.join(NL);
    return `<details class="the gap" id="wf-${slug(w.file)}"${mo ? " open" : ""}>
        <summary>${esc(w.fm.ten || w.tieuDe)}${w.fm.mat ? ` <span class="tt">mất ${esc(w.fm.mat)}</span>` : ""}</summary>
        ${md(luuDo)}
        <details><summary>Chi tiết từng bước và các chỗ dễ sai</summary>${md(conLai)}</details>
      </details>`;
  };
  const laMigrate = (w) => String(w.fm.nhom || "").trim() === "migrate";
  const tabWorkflowKhac = workflows.filter((w) => !laMigrate(w)).map(veWorkflow).join("");
  const tabWorkflowMigrate = workflows.filter(laMigrate).map((w) => veWorkflow(w, true)).join("");

  const tabProtocol = `
      ${protocols.length ? `<div class="the"><h2>Protocol</h2>
        <p>Quy trình có các bước cụ thể và phép nghiệm thu bằng máy. Khác với workflow ở chỗ nó
        nói <em>làm thế nào cho đúng</em>, còn workflow nói <em>đi qua những bước nào</em>.</p>
        ${protocols.map((p) => `<h3 id="pr-${slug(p.file)}">${esc(p.tieuDe)}</h3>${md(p.than.split(NL).filter((l) => !l.startsWith("# ")).slice(0, 14).join(NL))}<p><span class="ref">docs/protocols/${esc(p.file)}</span></p>`).join("")}
      </div>` : ""}
      ${adrs.length ? `<div class="the"><h2>Quyết định đã chốt</h2>
        <p>Mỗi quyết định một file, <strong>không sửa lại</strong>. Đổi ý thì viết quyết định mới
        thay thế cái cũ, để sáu tháng sau còn đọc được vì sao lúc đó chọn thế.</p>
        <div class="tw"><table><thead><tr><th>Quyết định</th><th>Trạng thái</th><th>Ngày</th></tr></thead><tbody>
        ${adrs.map((a) => `<tr><td>${esc(a.tieuDe)}</td><td>${esc(a.fm.status || "—")}</td><td>${esc(a.fm.date || "—")}</td></tr>`).join("")}
        </tbody></table></div>
      </div>` : ""}`;

  /* DONG DAU TIEN LA LOI TU KHAI, CHO MAY DOC — N-11, Duc bao 06/09: "toi thay co 2 dashboard
     nen bi confuse". Hai file khong gop duoc (ban o goc phai nam yen trong git, ban song phai
     ghi de lien tuc), nen moi ban phai TU NOI no la ban nao. `doiSangBanSong()` thay dung chuoi
     nay khi dung ban song. Dat o DONG DAU chu khong o giua than trang: cho de mot phep kiem tro
     toi, va cho de doc ngay khi mo file bang bat cu thu gi. Mat o luot migrate bo khung. */
  return `<!-- ${KHAI_BAN_CHUP} -->
<title>${esc(ten)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>${CSS}</style>
<div class="wrap">
  <!-- id=cu KHONG phai trang tri: ba cua bang song (bang-trang-thai/loi.mjs) dung dung the
       nay lam MO NEO de chen bang thong bao "ban song". Thuoc nay mat o luot migrate bo
       khung (4da1e9e5) va ke chen khong tim thay cho chen tu hom do. -->
  <div class="cu" id="cu" data-sinh="${esc(ngay)}"></div>
  <header>
    <h1>${esc(ten)}</h1>
    <p class="sub">${esc(dl.khauHieu || "Repo này chưa khai một câu tự giới thiệu (repo.tagline).")}</p>
    <details class="vi-sao"><summary title="Trang này là gì">?</summary>
      <p>Bảng trạng thái <strong>máy sinh</strong>, suy hoàn toàn từ lần commit gần nhất — không
      gõ tay một con số nào. <strong>Bốn nhóm:</strong> Tổng quan là ba câu · <strong>Công
      việc</strong> là thứ hành động được · <strong>Hệ thống</strong> là repo này chạy thế nào ·
      <strong>Lịch sử</strong> là chuyện đã qua. Mỗi khái niệm chỉ vẽ đầy đủ ở một nhóm.</p>
    </details>
    <div class="nhan-hang">
      <span class="chip">v${esc(ban)}</span>
      <span>sinh ${esc(ngay)}</span>
    </div>
  </header>

  <nav class="tabs" role="tablist">
    ${tabs.map(([id, ten2]) => `<button role="tab" data-tab="${id}" aria-selected="false">${esc(ten2)}</button>`).join("")}
  </nav>

  <div class="tim-o">
    <input type="search" id="tim" autocomplete="off" spellcheck="false"
           aria-label="Tim tren ca trang"
           placeholder="Tim ma viec, ten khoa, ten file... (vi du: KHUNG-53)">
  </div>
  <div class="tim-kq" id="tim-kq" hidden></div>

  <section class="tab" id="tab-tong-quan" hidden>
    ${khoiBaCau({ st, canDuc, khoa, so, noMo, tenNguoi })}
  </section>

  <section class="tab" id="tab-cong-viec" hidden>
    ${khoiCanDuc(canDuc, tenNguoi)}
    ${khoiDangLamGi(khoa, ngay, vetKhoa, KHOA_SONG ? new Date() : mocHEADLuc())}
    ${khoiKhoa(khoa)}
    ${khoiSucKhoeNo(so, noMo, noMuc)}
    ${ideas.length ? `<div class="the"><h2>Sổ ý tưởng — phòng chờ của cả repo</h2>
      <p>Đây <strong>không phải</strong> sổ nợ. Sổ nợ ghi thứ đang <em>hỏng</em>; sổ này ghi
      <em>hướng đi</em>. Trộn hai thứ là mọi hướng đi trông như một lỗi cần vá gấp.</p></div>
    ${khoiYTuongDay(ideas)}` : ""}
  </section>

  <!-- TAB MIGRATE — tách riêng 08/09 theo Đức. Ba thứ vốn nằm ba tab khác nhau nay về một chỗ:
       sổ migrate (trước ở Công việc) · quy trình migrate (trước ở Hệ thống) · và bảng đối chiếu
       tính năng, vốn đã nằm trong sổ migrate. Xem ADR-0007. -->
  <section class="tab" id="tab-migrate" hidden>
    <div class="xep">${gapKhoi(`
    ${tabWorkflowMigrate}
    ${hoSo.length ? khoiMigrate(hoSo) : `<div class="the"><h2>Chưa lượt migrate nào</h2>
      <p>Repo này chưa đưa repo nào lên chuẩn. Hồ sơ từng lượt sẽ nằm ở
      <code>docs/migrations/</code>, và tab này đọc từ đó — không gõ tay.</p></div>`}
    `)}</div>
  </section>

  <section class="tab" id="tab-he-thong" hidden>
    ${oLamMoi}
    <div class="xep">${gapKhoi(`
    ${khoiBatDau(dl)}
    ${khoiVanHanh(coChe, batBien, khoa.length)}
    ${khoiVongDoi(st)}
    ${laRepoNha ? `<details class="the gap"><summary>Mô hình vận hành — ba khối, và luồng chạy giữa chúng</summary>${khoiMoHinh({ lenh, protocols, briefs, dichDen, soPhepKiem })}</details>` : ""}
    ${laRepoNha ? `<div class="the">
      <h2>Giao một việc cho AI khác — ba lệnh</h2>
      <p>Đề bài <strong>không viết tay</strong>. Lệnh dưới đo repo đích trước — nhánh · cây làm
      việc · bảng quyền · bản khung đang ghim — rồi mới ghép đề bài quanh những con số đó. Đo
      không được thì nó <strong>không in gì cả</strong>.</p>
      <pre class="code">cd "&lt;REPO ĐÍCH&gt;" &amp;&amp; git fetch
npm run giao-viec -- --viec nang --repo "&lt;REPO ĐÍCH&gt;" --as codex-nang &gt; de-bai.txt
cd "&lt;REPO ĐÍCH&gt;" &amp;&amp; codex exec -s workspace-write - &lt; de-bai.txt</pre>
      <p><strong>Vì sao phải đo trước:</strong> lượt giao đầu tiên (06/09) dùng một đề bài viết
      trước khi ai đo repo đích. Nó dạy <code>git add -A</code> trong khi repo đó đang có ba file
      sửa dở của phiên khác — tức dạy phiên nhận việc cuốn việc của người khác vào commit của
      mình rồi đẩy đi. Lỗi đó không phải của phiên nhận việc.</p>
      <p class="ghi">Ba loại việc giao được: <code>nang</code> · <code>migrate</code> ·
      <code>audit</code> · <code>onboard</code>. Phiên nhận việc trả về <strong>năm dòng</strong>
      — và năm dòng đó vẫn là <strong>lời tự khai</strong>, chưa lệnh nào đo lại.</p>
    </div>` : ""}
    ${khoiCauTruc(vung, fileGoc, banDo)}
    <details class="the gap" id="ban-do-file">
      <summary>Bản đồ file — ${banDo.length} lối, khi cần gì thì mở file nào</summary>
      <p><strong>Chỗ duy nhất</strong> vẽ bản đồ file. Bảng này <strong>đọc lại từ luật
      gốc</strong>, không phải bản chép — nên nó không thể nói khác luật.</p>
      <div class="tw"><table><thead><tr><th>Khi bạn sắp…</th><th>Mở cái gì</th></tr></thead><tbody>
      ${banDo.map((r) => `<tr><td>${md(r[0]).replace(/^<p>|<\/p>$/g, "")}</td><td>${md(r.slice(1).join(" · ")).replace(/^<p>|<\/p>$/g, "")}</td></tr>`).join("")}
      </tbody></table></div>
    </details>
    <div class="the">
      <h2>Bốn tầng, và chúng được đối xử khác nhau</h2>
      ${md(["```mermaid", "flowchart LR", '  L["LUẬT<br/>người viết<br/>đổi vài tháng một lần"] --> S["TRẠNG THÁI<br/>người viết<br/>đổi mỗi phiên"]',
        '  S --> G["MÁY SINH<br/>máy viết<br/>không sửa tay"]', '  E["BẰNG CHỨNG<br/>bất biến<br/>chỉ thêm"]',
        "  L -.- E", "```"].join(NL))}
      <p>Sửa nhầm tầng là kiểu hỏng im lặng: sửa tay một trang máy sinh thì mất trắng ở lần sinh
      sau, và không ai hiểu vì sao chữ mình vừa viết biến mất.</p>
    </div>
    <details class="the gap">
      <summary>Lệnh chạy được — ${lenh.length} lệnh</summary>
      <div class="tw"><table><thead><tr><th>Lệnh</th><th>Chạy gì</th></tr></thead><tbody>
      ${lenh.map(([k, v]) => `<tr><td><code>npm run ${esc(k)}</code></td><td><code>${esc(v)}</code></td></tr>`).join("")}
      </tbody></table></div>
    </details>
    ${tabWorkflowKhac}
    ${huongDan ? `<details class="the gap" id="huong-dan"><summary>Hướng dẫn cho người mới vào — hai phần: cho người, và cho phiên AI</summary>${md(huongDan)}</details>` : ""}
    ${dl.soTay ? `<details class="the gap"><summary>Sổ tay AI Agent — danh sách kiểm cho việc lặp lại</summary>${md(dl.soTay)}</details>` : ""}
    ${dl.baoTri ? `<details class="the gap"><summary>Bảo trì định kỳ — ba nhịp giữ repo đúng, một nhịp giữ repo rẻ</summary>${md(dl.baoTri)}</details>` : ""}
    ${protocols.length ? `<details class="the gap"><summary>Quy trình đầy đủ — ${protocols.length} bản</summary>
      ${protocols.map((p2) => `<details><summary>${esc(p2.tieuDe)}</summary>${md(p2.than.split(NL).filter((l) => !l.startsWith("# ")).join(NL))}</details>`).join("")}
    </details>` : ""}
    ${dl.tinhNang && laRepoNha ? `<details class="the gap"><summary>Bộ khung làm được gì — kể bằng tiếng người</summary>${md(dl.tinhNang)}</details>` : ""}
    ${legend ? `<details class="the gap"><summary>Tra cứu thuật ngữ</summary>${md(legend)}</details>` : ""}
    ${khoiLienQuan(dl.banDo, dl.trangCo)}
    `, { moSan: ["Bắt đầu ở đâu"] })}</div>
  </section>

  <section class="tab" id="tab-lich-su" hidden>
    ${adrs.length ? `<div class="the"><h2>Quyết định đã chốt — ${adrs.length} bản ghi</h2>
      <p>Mỗi quyết định là một file <strong>bất biến</strong>: đã chốt thì không sửa được, chỉ
      thay bằng bản mới. Bản bị thay vẫn giữ nguyên để tra lại được.</p>
      <div class="tw"><table><thead><tr><th>Quyết định</th><th>Trạng thái</th><th>Ngày</th></tr></thead><tbody>
      ${adrs.map((a) => `<tr><td>${esc(a.tieuDe)}</td><td>${esc(a.fm.status || "—")}</td><td>${esc(a.fm.date || "—")}</td></tr>`).join("")}
      </tbody></table></div></div>` : ""}
    ${nhatKy.map((k, idx) => `<details${idx === 0 ? " open" : ""}>
      <summary><strong>v${esc(k.ban)}</strong><span class="ngay">${esc(k.ngay)}</span><span class="tt">${esc(k.tomTat)}</span></summary>
      ${md(k.than)}
    </details>`).join("")}
    ${daXong.length ? `<div class="the">
      <h2>Đã xong 100% — ${daXong.length} việc</h2>
      <p>Việc đã <strong>đóng hẳn</strong> trong sổ nợ, không phải việc đang làm dở. Nguồn là
      <span class="ref">BACKLOG.md</span>: mục nào có mã bị gạch thì nó nằm ở đây.</p>
      <p><strong>Sổ giữ lại mục đã đóng chứ không xoá</strong> — để tra được việc gì đã làm, làm
      lúc nào, và vì sao. Bảng này chỉ chiếu lại phần đó cho dễ nhìn; nó không phải nguồn sự thật
      thứ hai.</p>
      <div class="tw"><table><thead><tr><th>Mã</th><th>Việc</th><th>Ưu tiên lúc mở</th></tr></thead><tbody>
      ${daXong.map((v) => `<tr><td><code>${esc(v.ma)}</code></td><td>${md(v.tieuDe).replace(/^<p>|<\/p>$/g, "")}</td><td>${esc(v.uuTien || "—")}</td></tr>`).join("")}
      </tbody></table></div>
    </div>` : ""}
  </section>

  <footer>
    <span>${esc(ten)} v${esc(ban)}</span>
    <span>sinh ngày ${esc(ngay)} — không gõ tay</span>
    <span>mọi con số đọc từ repo</span>
  </footer>
</div>
<script>${JS}</script>
`;
}

/* ---- chạy ------------------------------------------------------------------ */

/* ASYNC từ bản 1.3.20: nó đo dấu vết khoá, và phép đo đó nạp `repo-structure.mjs` theo kiểu
 * động (`claim.mjs` cố ý không nạp tĩnh file đó — mọi lượt `--take` sẽ phải trả tiền nạp).
 * Ba chỗ gọi đều ở tầng ngoài cùng của module nên `await` ở đó không tốn gì. */
export async function gomDuLieu() {
  /* MỘT mốc cho cả hàm. Gọi `mocHEAD()` ở ba chỗ thì ba chỗ đó về lý thuyết đọc được ba giá
   * trị khác nhau (HEAD đổi giữa chừng), và bảng sẽ tự mâu thuẫn với chính nó. */
  const headDate = mocHEAD();
  const pkg = JSON.parse(doc("package.json") || "{}");
  // Tên NGƯỜI ĐỌC lấy từ `.repo-structure.json`, không lấy `package.json.name`. Cái sau là tên
  // gói npm — chữ thường, gạch nối — và in nó lên đầu một trang cho người xem thì vừa xấu vừa
  // sai đối tượng. Không khai thì lùi về tên gói, còn hơn để trống.
  // FAIL-CLOSED. Bản đầu nuốt lỗi parse rồi lùi về tên gói npm, nên một `.repo-structure.json`
  // hỏng cú pháp vẫn sinh ra một trang trông hoàn toàn bình thường — trong khi cổng kiểm của
  // chính repo đó đang chết. Trang là thứ Đức nhìn; nó không được đẹp hơn sự thật.
  let tenNguoi = null;
  let tenNguoiChot = null;
  let khauHieu = null;
  const cauHinhRaw = doc(".repo-structure.json");
  if (cauHinhRaw !== null) {
    let j;
    try {
      j = JSON.parse(cauHinhRaw);
    } catch (e) {
      throw new Error(`.repo-structure.json hỏng cú pháp (${String(e.message).split(NL)[0]}) — KHÔNG sinh trang. Một trang dựng từ cấu hình hỏng sẽ trông bình thường trong khi repo đang hỏng.`);
    }
    tenNguoi = j?.repo?.name || null;
    khauHieu = typeof j?.repo?.tagline === "string" && j.repo.tagline.trim() ? j.repo.tagline.trim() : null;
    /* TÊN NGƯỜI CHỐT lấy từ cấu hình, không đóng cứng "Đức" vào bộ sinh: bộ khung này chạy ở
     * repo của người khác, và một bảng gọi sai tên chủ dự án là bảng nói về một repo khác. */
    tenNguoiChot = j?.repo?.owner || null;
  }
  const nhatKy = tachNhatKy(doc("CHANGELOG.md"));

  /* REPO NÀY CÓ PHẢI REPO NHÀ CỦA BỘ KHUNG KHÔNG.
   *
   * Từ 1.3.17 trang này đi theo bản trích, nên hai khối chỉ đúng ở repo nhà phải tự biết ẩn đi:
   * khối MÔ HÌNH (nó mô tả bộ khung phát bản ra sao — repo đích là NGƯỜI NHẬN, không phải nơi
   * phát) và khối GIAO VIỆC (lệnh `giao-viec` ở lại repo nhà). Vẽ chúng ở repo đích là bảng dạy
   * người ta gõ một lệnh không tồn tại, và tự nhận một vai không phải của mình.
   *
   * Dấu nhận biết là bộ sinh bản trích: chỉ repo nhà mới có nó. */
  const laRepoNha = doc("scripts/build-template.mjs") !== null;

  /* ---- NĂM NGUỒN MỚI (06/09) — xem `overview-doc.mjs` để biết vì sao có chúng ----------- */

  /* Sổ ý tưởng. Repo chưa có sổ thì tab biến mất ÊM — đó là trạng thái hợp lệ của một repo
   * mới dựng, khác hẳn với "sổ có mà đọc không ra" (readIdeas sẽ NÉM ở ca đó). */
  const rawY = doc("IDEAS.md");
  const ideas = rawY ? readIdeas(rawY) : [];

  /* Việc chờ người chốt. Quét dấu `@Đức:bấm` / `@Đức:chốt` ngay trên dòng của mục.
   * Bảng KHÔNG giữ danh sách này: đóng mục thì dấu mất theo, không ai phải nhớ đi xoá. */
  const canDuc = [];
  for (const f of SO_CON_SONG) {
    const t = doc(f);
    if (t === null) continue;
    for (const d of quetDauDuc(t, f)) {
      const sinh = ngaySinhDong(f, d.soDong);
      canDuc.push({ ...d, ngay: sinh === null ? null : khoangNgay(headDate, sinh), tuoi: noiTuoi(sinh === null ? null : khoangNgay(headDate, sinh)) });
    }
  }
  canDuc.sort((a, b) => (b.ngay ?? -1) - (a.ngay ?? -1));

  /* Bảng chủ sở hữu. NÉM nếu hỏng — xem ghi chú ở `readKhoa`.
   *
   * MẶC ĐỊNH ĐỌC TỪ HEAD, và mặc định đó cấm đổi: bản đang commit ở gốc repo phải tất định từ
   * HEAD, không thì cổng "Sự thật máy sinh còn tươi" đỏ với mọi phiên mỗi lượt ai đó nhận khoá.
   *
   * `--khoa-song` đọc từ ĐĨA thay vì HEAD, và CHỈ dùng cho bản ra nằm ngoài git (`bang-song/`).
   * Vì sao cần: đo 06/09 trên chính lịch sử repo này — bốn khoá một phiên giữ suốt lượt làm việc
   * nằm trong **0/6 commit**, nên bảng suy từ HEAD nói "không có luồng nào chạy" trong khi có
   * bốn. Với bảng sống thì câu duy nhất đáng hỏi là câu về BÂY GIỜ. */
  const rawKhoa = (KHOA_SONG
    ? (() => { try { return fs.readFileSync(path.join(ROOT, ".agents/claims.json"), "utf8"); } catch (_) { return doc(".agents/claims.json") || "{}"; } })()
    : doc(".agents/claims.json")) || "{}";
  const khoa = readKhoa(rawKhoa);

  /* Dấu vết đo LÚC SINH BẢNG, không đọc từ HEAD như mọi con số khác trên trang.
   *
   * Cố ý phá lệ, và lệ đó có lý do thật (một bộ sinh nhìn đồng hồ thì sang ngày mới là mọi phiên
   * bị chặn đẩy). Ở đây không sao: cả khối này đã mang `NHAN_KHOA`, nên phép so trang-với-HEAD
   * bỏ qua từng dòng của nó. Không có ngoại lệ này thì tín hiệu vô nghĩa — "chưa thấy dấu vết"
   * đọc từ HEAD là câu về quá khứ, mà câu duy nhất đáng hỏi là câu về BÂY GIỜ.
   *
   * Hỏng thì trả bản đồ rỗng: mọi khoá về "ĐANG GIỮ", tức về đúng hành vi trước bản 1.3.20. */
  let vetKhoa = new Map();
  try { vetKhoa = await doDauVet(JSON.parse(rawKhoa)?.claims || {}, ROOT); } catch (_) { vetKhoa = new Map(); }

  /* Sổ nợ: mục còn mở. `tachDaXong` phía trên đã lo phần đã đóng, hai bên đọc CÙNG một dấu
   * (gạch mã) nên chúng không thể nói khác nhau về cùng một mục. */
  const noMuc = readNo(doc("BACKLOG.md") || "");
  const noMo = noMuc.filter((n) => !n.dong);

  /* Cây thư mục tầng ngoài cùng, và ai được ghi vào đâu. Số file đếm từ HEAD, không đếm đĩa —
   * cùng lý do với mọi con số khác trên trang này. */
  const vung = [];
  const fileGoc = [];
  {
    let cauHinh = {};
    try { cauHinh = JSON.parse(doc(".repo-structure.json") || "{}"); } catch (_) { cauHinh = {}; }
    const areas = cauHinh.areas && typeof cauHinh.areas === "object" ? cauHinh.areas : {};
    const maySinh = new Set([].concat(cauHinh.generated || [], Object.values(cauHinh.generated_names || {})));
    let tatCa = [];
    try {
      tatCa = gitRa("ls-tree", "-r", "-z", "--name-only", "HEAD").split("\0").filter(Boolean);
    } catch (_) { tatCa = []; }
    const dem = new Map();
    for (const f of tatCa) {
      const i = f.indexOf("/");
      if (i < 0) { fileGoc.push({ ten: f, may: maySinh.has(f) }); continue; }
      const d = f.slice(0, i + 1);
      dem.set(d, (dem.get(d) || 0) + 1);
    }
    for (const [duong, soFile] of [...dem.entries()].sort((a, b) => b[1] - a[1])) {
      const khai = areas[duong];
      vung.push({
        duong,
        chu: khai && typeof khai === "object" ? (khai.steward || null) : (typeof khai === "string" ? khai : null),
        soFile
      });
    }
    /* VÙNG ĐÃ KHAI MÀ CHƯA CÓ FILE NÀO vẫn phải hiện, với số 0.
     *
     * git không theo dõi thư mục rỗng, nên một vùng đã khai trong bảng phân vùng mà chưa có
     * file sẽ biến mất khỏi danh sách nếu chỉ đếm từ cây HEAD — trong khi nó VẪN là một khoá
     * nhận được, vẫn chặn được phiên khác. Bảng giấu nó đi là giấu một chỗ giao việc. */
    for (const duong of Object.keys(areas)) {
      if (!duong.endsWith("/") || dem.has(duong)) continue;
      const khai = areas[duong];
      vung.push({
        duong,
        chu: khai && typeof khai === "object" ? (khai.steward || null) : (typeof khai === "string" ? khai : null),
        soFile: 0
      });
    }
    fileGoc.sort((a, b) => a.ten.localeCompare(b.ten));
  }

  /* Hồ sơ migrate — đọc TỪ HEAD như mọi thứ khác trên trang này.
   *
   * Repo đích không có thư mục này (hồ sơ migrate nằm ở repo nhà của bộ khung), nên `liet()`
   * trả rỗng và tab Migrate biến mất ÊM. Đó là trạng thái hợp lệ, không phải lỗi. */
  const hoSo = readHoSo({
    liet: () => {
      try {
        return gitRa("ls-tree", "-z", "--name-only", `HEAD:${THU_MUC_MIGRATE}`)
          .split(String.fromCharCode(0)).filter((f) => f.endsWith(".md")).sort();
      } catch (_) { return []; }
    },
    doc: (f) => doc(`${THU_MUC_MIGRATE}/${f}`) || ""
  });

  /* Bốn cơ chế + năm bất biến: đọc lại từ luật, không chép. */
  const rawMF = doc("docs/protocols/MULTIFLOW.md") || "";
  const coChe = readCoChe(rawMF);
  const batBien = readBatBien(rawMF);
  /* ĐỌC CẢ SỔ SỐNG LẪN KHO LƯU TRỮ. Nhịp dọn dời mục đã đóng sang `docs/archive/` để sổ nợ khỏi
     phình — mà thẻ "Đã xong" lại đọc thẳng sổ nợ, nên dời xong là thẻ RỖNG. Cùng hình dạng mâu
     thuẫn đã bắt được 08/09: một lệnh bảo dời đi, một phép đo vẫn quét chỗ cũ. Đọc cả hai thì
     dọn được mà không mất gì. Thiếu file kho thì `doc()` trả rỗng và `tachDaXong` trả [] — không
     cần điều kiện riêng, và repo chưa từng dọn vẫn chạy đúng. */
  const daXong = [...tachDaXong(doc("BACKLOG.md")), ...tachDaXong(doc("docs/archive/BACKLOG-da-dong.md"))];
  const workflows = docTaiLieu("docs/workflows");
  const protocols = docTaiLieu("docs/protocols");
  const briefs = docTaiLieu("docs/briefs");
  /* REPO ĐÍCH đọc từ hồ sơ migrate — bằng chứng, không phải trí nhớ. Mỗi lượt migrate một hồ
   * sơ, chỉ thêm; nên danh sách này không thể cũ hơn thực tế mà không ai biết. */
  const dichDen = docTaiLieu("docs/migrations")
    .map((m) => ({ ten: m.fm.repo || m.file, trangThai: m.fm.trang_thai || null, ngay: m.fm.ngay || null }))
    .sort((a, b) => String(b.ngay || "").localeCompare(String(a.ngay || "")));
  const adrs = docTaiLieu("docs/adr");
  const legendRaw = doc("docs/LEGEND.md");
  const st = tachFrontmatter(doc("STATUS.md") || "").fm;
  const tinhNangRaw = doc("docs/TINH-NANG.md");
  const soTayRaw = doc("docs/SO-TAY-AGENT.md");
  const baoTriRaw = doc("docs/BAO-TRI-DINH-KY.md");
  const huongDanRaw = doc("docs/HUONG-DAN.md");
  // Tài liệu quá hạn: mỗi file khai `ttl_days`, so với lần commit gần nhất của chính nó. Không
  // đo được (chưa commit, không có git) thì KHÔNG tính là nợ — thà bỏ sót còn hơn báo động sai.
  const taiLieuQuaHan = [];
  let soTaiLieu = 0;
  // "Hôm nay" ở đây cũng là mốc HEAD, cùng lý do ghi ở `ngay:` bên dưới: lấy `Date.now()` thì
  // con số này tự tăng theo lịch, và sang ngày là bản sinh lại lệch bản đã commit.
  const homNay = Date.parse(`${headDate}T00:00:00Z`);
  for (const thuMuc of ["docs", "docs/workflows", "docs/protocols", "docs/briefs"]) {
    for (const f of liet(thuMuc)) {
      const fm = tachFrontmatter(doc(`${thuMuc}/${f}`) || "").fm;
      soTaiLieu += 1;
      const ttl = Number(fm.ttl_days);
      if (!Number.isFinite(ttl) || ttl <= 0) continue;
      let sua = null;
      try {
        // TÊN FILE ĐI THÀNH THAM SỐ, KHÔNG GHÉP VÀO CHUỖI SHELL.
        //
        // Bản đầu nhét `${thuMuc}/${f}` vào một chuỗi rồi đưa cho shell. Một tên file có dấu
        // nháy là hỏng lệnh; một tên có `$(...)` hoặc dấu chấm phẩy là shell CHẠY thứ nằm trong
        // đó. Repo này còn cấm cả `.innerHTML` vì lý do y hệt — thì không có cớ gì để ghép chuỗi
        // ở đây. Và đây không phải mối lo lý thuyết: bộ khung được thiết kế để chạy trên repo
        // NGƯỜI KHÁC, nơi tên file không do mình đặt. Audit độc lập bắt được 03/09.
        const ra = execFileSync("git", ["log", "-1", "--format=%cI", "--", `${thuMuc}/${f}`],
          { cwd: ROOT, encoding: "utf8" }).trim();
        sua = ra ? new Date(ra) : null;
      } catch (_) { sua = null; }
      if (!sua) continue;
      if ((homNay - sua.getTime()) / 86400000 > ttl) taiLieuQuaHan.push(`${thuMuc}/${f}`);
    }
  }
  // `null` = KHÔNG ĐO ĐƯỢC, và nó khác hẳn 0. Cổng cấu trúc thoát khác 0 là chuyện BÌNH THƯỜNG
  // (có phép kiểm thuộc nhóm CHẶN đang đỏ) và nó vẫn in dòng TỔNG — nên vẫn đọc được. Chỉ khi
  // KHÔNG có dòng TỔNG mới là không đo được: script chết trước khi in, hoặc node/git không chạy.
  let canhBaoVang = null;
  let choDo = null;
  let soPhepCauTruc = null;
  {
    let ra = "";
    try {
      ra = execSync("node scripts/check-bootstrap.mjs", { cwd: ROOT, encoding: "utf8" });
    } catch (e) {
      ra = String(e.stdout || "");
    }
    // ĐỌC CẢ ĐỎ LẪN VÀNG. Bản đầu chỉ bắt "chỗ VÀNG", nên một repo có 10 chỗ ĐỎ và 0 chỗ VÀNG
    // hiện ra "0" và đèn có thể XANH — bảng giấu đúng thứ nặng nhất và giữ lại thứ nhẹ.
    const dong = ra.split(NL).find((l) => l.startsWith("TỔNG:")) || "";
    const mv = dong.match(/([0-9]+)\s*chỗ\s*VÀNG/);
    const mdo = dong.match(/([0-9]+)\s*chỗ\s*ĐỎ/);
    canhBaoVang = mv ? Number(mv[1]) : null;
    choDo = mdo ? Number(mdo[1]) : null;
    const mb = /B1.*?B([0-9]+)/.exec(ra);
    soPhepCauTruc = mb ? Number(mb[1]) : null;
  }

  /* "Việc lớn chưa chứng minh" — ĐỌC TỪ STATUS, ĐỪNG GÕ TAY.
   *
   * Bản đầu đóng cứng số `1`. Nghĩa là đèn sức khoẻ **không bao giờ xanh được**, kể cả khi repo
   * đã sạch hết mọi thứ khác — trong khi ngay dưới nó trang lại viết "Đèn xanh chỉ khi cả ba
   * bằng 0". Trang tự mâu thuẫn với chính nó, và con số đó không bao giờ đổi dù việc có xong.
   *
   * Nguồn thật: `lifecycle` trong `STATUS.md`, đúng trường mà khối Vòng đời phía trên đã dùng.
   * Một nguồn, hai chỗ đọc — thay vì hai con số tự sống. */
  const viecChuaChungMinh = noChuaChungMinh(st?.lifecycle);
  // `null` (không đọc được) KHÔNG được cộng thành 0 — không đo được thì để null, và đèn không xanh.
  const noCauTruc = (choDo === null || canhBaoVang === null) ? null : choDo + canhBaoVang;
  return {
    ten: tenNguoi || pkg.name || "Repo",
    tenNguoiChot,
    khauHieu,
    ban: pkg.version || "0.0.0",
    // NGÀY CỦA HEAD, KHÔNG PHẢI NGÀY TRÊN ĐỒNG HỒ. Trước khi trang được commit, đây là
    // `new Date()` — và cái đó vô hại đúng tới lúc trang vào repo. Từ lúc vào, đồng hồ sang
    // ngày là bản sinh lại lệch bản đã commit **dù không một dữ liệu nào đổi**, cổng đỏ, và
    // MỌI phiên bị chặn đẩy vì một ngày đã trôi qua. Việc BÁO CŨ không mất đi: đoạn JS cuối
    // trang tự tính lúc người ta MỞ trang, từ `data-sinh` — đúng chỗ hơn, vì một trang tĩnh
    // không biết trước bao giờ có người mở nó.
    ngay: headDate,
    lenh: Object.entries(pkg.scripts || {}),
    /* BẢN ĐỒ = chỉ mục mỏng ở `AGENTS.md` mục 6 CỘNG bản ĐẦY ĐỦ đã khai ở `docs.file_map`.
       Tách 09/09 (token nạp 13.800 -> 5.660) đẩy 43 mục sang bản đầy đủ; đọc mỗi hiến pháp thì
       bảng của Đức mất 43 dòng bản đồ và mất luôn khối *Trang liên quan* — `overview-smoke` bắt
       đúng chỗ đó. Bảng cho NGƯỜI ĐỌC thì phải thấy bản đầy đủ; chỉ phần NẠP mới cần mỏng. */
    banDo: [...docBanDo(doc("AGENTS.md")), ...docBanDoChiTiet(doc(banDoKhaiTu(doc(".repo-structure.json"))))],
    trangCo: new Set(lietHTML()),
    workflows, protocols, adrs, nhatKy, daXong, briefs, dichDen,
    ideas, canDuc, khoa, noMo, noMuc, coChe, batBien, vung, fileGoc, hoSo, laRepoNha,
    // Số suite phép kiểm = số lần `node tests/...` trong lệnh `test`. Đếm từ đó chứ không đếm
    // file trong `tests/`: một file không được lệnh `test` gọi thì nó không canh gì cả.
    soPhepKiem: (String((pkg.scripts || {}).test || "").match(/node tests\//g) || []).length || null,
    legend: legendRaw ? tachFrontmatter(legendRaw).than : null,
    st,
    tinhNang: tinhNangRaw ? tachFrontmatter(tinhNangRaw).than : null,
    soTay: soTayRaw ? tachFrontmatter(soTayRaw).than : null,
    baoTri: baoTriRaw ? tachFrontmatter(baoTriRaw).than : null,
    huongDan: huongDanRaw ? tachFrontmatter(huongDanRaw).than : null,
    // BA CON SỐ ĐẾM NỢ, không đếm tài sản. Đếm tài sản ("3 workflow, 9 lệnh") chỉ làm người
    // xem thấy nhiều mà không biết có phải lo không. Đèn xanh chỉ khi cả ba bằng 0.
    //
    // Con số cấu trúc GỘP CẢ ĐỎ LẪN VÀNG. Bản đầu chỉ bắt chữ "chỗ VÀNG", nên một repo có
    // 10 chỗ ĐỎ và 0 chỗ VÀNG hiện ra "0" và đèn có thể XANH — bảng giấu đúng thứ nặng nhất
    // và giữ lại thứ nhẹ. Không đọc được một trong hai thì để `null`, và `null` không phải 0:
    // đèn sẽ không xanh. Audit độc lập bắt được 03/09.
    // MẪU SỐ ĐI KÈM TỪNG SỐ, không tách ra chỗ khác.
    //
    // Một số 0 đứng một mình trông giống hệt nhau ở hai ca ngược nhau: "đã dò hết, sạch" và
    // "chưa dò gì cả". Trước 06/09 bảng chỉ in con số, nên nó không phân biệt được hai ca đó —
    // và ca thứ hai là ca nguy hiểm, vì nó hiện ra màu xanh.
    vetKhoa,
    maMayChu: doc("bang-song/may-chu.mjs"),
    so: [
      { so: taiLieuQuaHan.length, nhan: "tài liệu quá hạn", mau: `đã tính tuổi ${soTaiLieu} tài liệu theo hạn rà mỗi file tự khai` },
      { so: noCauTruc, nhan: "nợ cấu trúc (đỏ + vàng)", mau: noCauTruc === null ? "KHÔNG đọc được cổng cấu trúc — chưa dò được" : `đã chạy trọn ${soPhepCauTruc} phép kiểm cấu trúc` },
      { so: viecChuaChungMinh, nhan: "việc lớn chưa chứng minh", mau: "đọc từ vòng đời khai trong STATUS.md" }
    ]
    /* ĐÚNG BA con số, và một phép kiểm cũ ghim con số ba đó. Tôi đã thử thêm ô thứ tư "vùng
     * đang bận" và phép kiểm ĐỎ — đúng. Ba ô này đếm NỢ, và đèn chỉ xanh khi cả ba bằng 0;
     * một vùng đang bận thì hoàn toàn bình thường, nhét nó vào đây là đèn không bao giờ xanh
     * được nữa và con số mất nghĩa. Số khoá bận đã có chỗ của nó ở tab AI điều phối. */
  };
}

/* TÊN FILE MANG TÊN DỰ ÁN, KHÔNG PHẢI "DASHBOARD.html" trơn.
 *
 * Đức chốt 04/09. Lý do rất đời: mỗi repo sinh ra một bảng, và cả đống bảng cùng rơi vào một
 * thư mục Tải về. Ba file tên `DASHBOARD.html`, `DASHBOARD(1).html`, `DASHBOARD(2).html` thì
 * mở cái nào cũng phải đoán. Tên mang tên dự án là biết ngay, không phải mở ra xem.
 *
 * SUY TỪ CẤU HÌNH, từ bản 1.3.17 — vì từ bản này trang ĐI THEO BẢN TRÍCH, nên tên đóng cứng
 * là mọi repo đích cùng sinh ra một file mang tên repo NHÀ. Đó chính là đống file trùng tên mà
 * Đức muốn tránh, chỉ tệ hơn: chúng còn nói sai tên chủ.
 *
 * Ghi chú cũ ở đây lo rằng suy tự động sẽ mở một đường hỏng — đổi `repo.name` là tên file đổi
 * theo trong khi `generated` vẫn khai tên cũ. Nỗi lo đó có thật, nên có `--check-head`: cổng
 * hỏi đúng câu "tên đang sinh có nằm trong `generated` không" và đỏ kèm tên nguyên nhân. Còn
 * muốn khoá cứng một tên thì khai `generated_names.overview`, không phải sửa mã. */
export function tenTrang(cauHinhRaw) {
  /* PHÉP SUY NẰM Ở `repo-structure.mjs`, không chép lại ở đây. Hai bản chép sẽ lệch, và lúc
   * lệch thì bộ sinh ghi ra một tên mà bộ đếm "code đã đổi" lại coi là file lạ — đúng ca đã
   * làm cổng *"Sự thật máy sinh còn tươi"* đỏ vĩnh viễn ở một repo đã lắp, 07/09. */
  let j = null;
  try { j = JSON.parse(cauHinhRaw || "{}"); } catch (_) { j = null; }
  return tenTrangFrom(j);
}

export const TRANG_FILE = tenTrang(doc(".repo-structure.json"));

/* DÒNG BIẾN ĐỘNG — và vì sao phải có khối này, đo được ngay lượt đầu.
 *
 * Bảng chủ sở hữu đổi **mỗi lần một phiên nhận hoặc trả khoá**, tức nhiều lần một ngày. Từ lúc
 * bảng chiếu nó ra, trang máy sinh đổi theo — mà trang nằm trong khối `generators`, nên cổng
 * so nó với HEAD mỗi phiên. Hệ quả đo được ngay lượt đầu: **trả khoá xong là trang lệch HEAD**,
 * và phiên tiếp theo bị chặn đẩy vì một thứ nó không hề đụng tới.
 *
 * Lối ra KHÔNG phải bỏ khối bảng quyền khỏi trang — đó là khối Đức hỏi tới đầu tiên. Lối ra là
 * đánh dấu những dòng ấy rồi **bỏ qua chúng ở phép SO**, chứ không bỏ qua ở phép GHI.
 *
 * Bộ lọc chỉ nằm ở vế SO, cố ý. Ghi thì ghi vô điều kiện, nên trang luôn hiện trạng thái mới
 * nhất; chỉ có câu hỏi *"trang này có cũ không"* là không tính mấy dòng đó. Lọc cả hai vế thì
 * trang sẽ đứng yên ở một quá khứ nào đó mà cổng vẫn báo xanh — tệ hơn hẳn. */
export const NHAN_KHOA = "<!--khoa-->";

export function soSanhTrang(mongDoi, dangCo) {
  const loc = (t) => String(t).split(/\r\n?/).join("\n").split("\n")
    .filter((d) => !d.trimStart().startsWith(NHAN_KHOA));
  const a = loc(mongDoi);
  const b = loc(dangCo);
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return false;
  return true;
}

const THIS = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS)) {
  const args = process.argv.slice(2);

  if (args.includes("--check-head")) {
    // Cổng đóng phiên gọi đúng nhánh này. Nó hỏi MỘT câu: bản đã commit có còn đúng với HEAD
    // không. Cả hai vế đều dựng từ HEAD, nên việc đang làm dở của bất kỳ ai không lọt vào.
    const dangCo = doc(TRANG_FILE);
    if (dangCo === null) {
      console.error(`THIEU_TRANG: ${TRANG_FILE} chưa có trong HEAD. Sinh rồi commit: node scripts/build-overview.mjs`);
      process.exit(1);
    }
    if (!soSanhTrang(trang(await gomDuLieu()), dangCo)) {
      console.error(`TRANG_CU: ${TRANG_FILE} đã commit không khớp với HEAD. Sinh lại rồi commit: node scripts/build-overview.mjs`);
      process.exit(1);
    }
    console.log(`${TRANG_FILE} khớp với HEAD.`);
    process.exit(0);
  }

  // Không đưa đường dẫn thì ghi vào bản chuẩn của repo. Có đưa thì ghi ra đó — để xem thử mà
  // không chạm file trong repo.
  const ra = args.find((a) => !a.startsWith("--")) || path.join(ROOT, TRANG_FILE);
  const dl = await gomDuLieu();
  fs.mkdirSync(path.dirname(path.resolve(ra)), { recursive: true });
  fs.writeFileSync(path.resolve(ra), trang(dl), "utf8");
  console.log(`Đã sinh ${ra} — v${dl.ban} · ${dl.workflows.length} workflow · ${dl.protocols.length} protocol · ${dl.adrs.length} quyết định · ${dl.lenh.length} lệnh.`);
  console.log(`  mốc HEAD ${dl.ngay} — việc báo cũ do trang tự tính lúc mở`);
}

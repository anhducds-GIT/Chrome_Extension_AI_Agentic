/* BẢNG CỦA CHÍNH BỘ KHUNG — trang người ta xem TRƯỚC khi quyết định lấy nó về.
 *
 *   node scripts/build-template-overview.mjs <file-ra.html>
 *
 * Khác hẳn `build-dashboard.mjs`. Cái kia trả lời *"dự án này đang chạy tới đâu"* — dữ liệu
 * thật, đổi mỗi phiên. Cái này trả lời *"bộ khung gồm những gì, vận hành ra sao"* — và nó
 * **rỗng có chủ đích**, vì nó mô tả một bản mẫu chứ không phải một bản đang chạy. Viết chung
 * một bộ sinh cho cả hai là sẽ phải tách lại sau.
 *
 * SINH, KHÔNG GÕ. Mọi con số dưới đây đọc từ `buildTemplateFiles()` và từ chính bảng phân tầng
 * mà công cụ đo dùng — nên trang này không thể nói khác bộ khung, và không thể cũ đi trong im
 * lặng. Một bảng gõ tay thì chủ dự án không có cách nào kiểm, và bảng nào không kiểm được thì
 * sớm muộn cũng nói sai.
 *
 * BẢN RA KHÔNG COMMIT: nó để publish, và nó tự in ngày sinh.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildTemplateFiles, TEMPLATE_VERSION } from "./build-template.mjs";
import { tangCuaFile, TANG } from "./assess.mjs";

const NL = String.fromCharCode(10);

const esc = (s) => String(s)
  .split("&").join("&amp;")
  .split("<").join("&lt;")
  .split(">").join("&gt;");

/* Nhóm để đọc, không phải để đếm. Người xem trang này hỏi "nó gồm gì" chứ không hỏi "bao nhiêu
   phần trăm là script". */
export function nhomFiles(files) {
  const nhom = new Map([[TANG.MAY, []], [TANG.LUAT, []], [TANG.TRANG, []]]);
  for (const rel of [...files.keys()].sort()) nhom.get(tangCuaFile(rel)).push(rel);
  return nhom;
}

export function doDacTinh(files) {
  const luat = files.get("AGENTS.md") || "";
  const nghe = /selector|dom_probe|innerHTML|Bridge|pilot-/;
  return {
    soFile: files.size,
    soCongCu: [...files.keys()].filter((r) => r.startsWith("scripts/")).length,
    soBanMau: [...files.keys()].filter((r) => r.includes("_TEMPLATE-")).length,
    dongLuat: luat.split(NL).length,
    tuVungNghe: luat.split(NL).filter((d) => nghe.test(d)).length
  };
}

function trang(files) {
  const nhom = nhomFiles(files);
  const d = doDacTinh(files);
  const ngay = new Date().toISOString().slice(0, 10);
  const bang = (tang) => nhom.get(tang).map((r) => `<li><code>${esc(r)}</code></li>`).join("");

  return `<title>Bộ khung repo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
<style>
:root{
  --ground:#F5F3EE; --surface:#FFFFFF; --surface-2:#EDEAE3;
  --ink:#1A1815; --ink-2:#4A453D; --muted:#7A736A;
  --line:#DDD8CE; --accent:#7A4E1E; --accent-soft:#F0E4D4;
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  --disp:"Bricolage Grotesque","IBM Plex Sans",-apple-system,sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#14120F; --surface:#1D1A16; --surface-2:#26221C;
  --ink:#F0EBE3; --ink-2:#C3BBB0; --muted:#8F877C;
  --line:#332E27; --accent:#D9A066; --accent-soft:#2E2419;
}}
:root[data-theme="dark"]{
  --ground:#14120F; --surface:#1D1A16; --surface-2:#26221C;
  --ink:#F0EBE3; --ink-2:#C3BBB0; --muted:#8F877C;
  --line:#332E27; --accent:#D9A066; --accent-soft:#2E2419;
}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:15px;
  line-height:1.62;margin:0;padding:clamp(22px,4vw,60px) clamp(16px,4vw,40px) 80px}
.wrap{max-width:940px;margin:0 auto;display:flex;flex-direction:column;gap:clamp(24px,3.4vw,40px)}
h1,h2,h3{font-family:var(--disp);margin:0;letter-spacing:-.02em;text-wrap:balance}
h1{font-size:clamp(32px,5.4vw,52px);font-weight:800;line-height:1.02}
h2{font-size:clamp(18px,2.3vw,23px);font-weight:600}
h3{font-size:14px;font-weight:600;font-family:var(--mono);text-transform:uppercase;letter-spacing:.1em;color:var(--accent)}
p{margin:0;max-width:66ch}
.lede{font-size:clamp(15px,1.7vw,17.5px);color:var(--ink-2)}
code{font-family:var(--mono);font-size:.87em;background:var(--surface-2);padding:.1em .35em;border-radius:3px}
header{border-bottom:2px solid var(--ink);padding-bottom:22px;display:flex;flex-direction:column;gap:13px}
.tag{font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;background:var(--line);
  border:1px solid var(--line);border-radius:9px;overflow:hidden}
.cell{background:var(--surface);padding:15px 17px;display:flex;flex-direction:column;gap:4px}
.cell b{font-family:var(--disp);font-size:30px;font-weight:800;line-height:1;color:var(--accent);font-variant-numeric:tabular-nums}
.cell span{font-size:12.4px;color:var(--muted);line-height:1.35}
.card{background:var(--surface);border:1px solid var(--line);border-radius:10px;
  padding:clamp(18px,2.6vw,26px);display:flex;flex-direction:column;gap:13px}
.cols{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px}
ul{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:3px}
li{font-size:13.2px;color:var(--ink-2)}
ol{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:7px}
ol li{font-size:14px}
.note{border-left:3px solid var(--accent);padding-left:14px;color:var(--ink-2);font-size:14px}
footer{border-top:1px solid var(--line);padding-top:15px;font-size:12.4px;color:var(--muted);
  display:flex;flex-wrap:wrap;gap:6px 20px;font-family:var(--mono)}
</style>
<div class="wrap">
  <header>
    <div class="tag">bộ khung repo · bản ${esc(TEMPLATE_VERSION)} · sinh ngày ${ngay}</div>
    <h1>Một repo biết tự bảo vệ mình</h1>
    <p class="lede">
      ${d.soFile} file. Thả vào một thư mục trống là có ngay: luật cho AI đọc, hai cổng kiểm chặn
      việc dở dang, một bảng trạng thái tự sinh, và cách nhiều phiên AI làm chung mà không giẫm chân.
    </p>
  </header>

  <div class="grid">
    <div class="cell"><b>${d.soFile}</b><span>file, thả vào là chạy</span></div>
    <div class="cell"><b>${d.soCongCu}</b><span>công cụ vận hành</span></div>
    <div class="cell"><b>${d.dongLuat}</b><span>dòng luật — đọc hết trong một lần</span></div>
    <div class="cell"><b>${d.tuVungNghe}</b><span>dòng luật thuộc riêng một nghề</span></div>
    <div class="cell"><b>${d.soBanMau}</b><span>bản mẫu viết sẵn</span></div>
  </div>

  <div class="card">
    <h2>Ba thứ nó làm được mà một repo trống không làm được</h2>
    <div class="cols">
      <div>
        <h3>Chặn việc dở dang</h3>
        <p>Cổng đóng phiên chạy test, đối chiếu trang máy sinh với lịch sử, và kiểm ai được sửa
        vùng nào. Đỏ thì chưa xong — không có đường vòng.</p>
      </div>
      <div>
        <h3>Nhiều AI, một repo</h3>
        <p>Mỗi vùng một chủ tại một thời điểm. Công cụ đẩy từ chối cuốn theo việc của phiên khác,
        và mỗi commit mang nhãn phiên đã làm ra nó.</p>
      </div>
      <div>
        <h3>Bảng không nói dối</h3>
        <p>Trang trạng thái sinh hoàn toàn từ lịch sử git, không gõ tay. Cổng kiểm đối chiếu lại,
        nên một trang cũ không thể lặng lẽ cũ.</p>
      </div>
    </div>
  </div>

  <div class="card">
    <h2>Luật chia ba tầng, và đó là lý do nó dùng được cho repo khác nghề</h2>
    <p class="lede">Luật chung cho mọi repo · phụ lục bật khi cần · bản đồ của riêng từng repo.</p>
    <p class="note">
      Đo được trên chính bộ luật này: <strong>${d.tuVungNghe}</strong> dòng thuộc riêng một nghề.
      Chín dòng từng nằm lẫn trong luật chung đã chuyển sang một phụ lục tuỳ chọn — repo không
      làm nghề đó thì xoá file, không phải đọc luật của người khác.
    </p>
  </div>

  <div class="card">
    <h2>Bắt đầu</h2>
    <ol>
      <li>Dựng: <code>node scripts/init-repo.mjs &lt;thư-mục&gt; --ten "Tên repo"</code> — chạy từ repo nhà của bộ khung.</li>
      <li>Sửa mục 6 của <code>AGENTS.md</code>: bản đồ file của riêng repo bạn.</li>
      <li>Khai <code>units</code> và <code>areas</code> trong <code>.repo-structure.json</code> cho khớp hình dạng repo.</li>
      <li>Thêm test của bạn vào <code>tests/</code>, rồi chạy <code>npm run gate</code>.</li>
    </ol>
    <p class="note">
      Repo đang có việc rồi thì <strong>đo trước, đừng thả bừa</strong>:
      <code>node scripts/assess.mjs &lt;đường-dẫn&gt;</code> nói repo đó cách chuẩn bao xa, và chia
      chi phí làm ba loại việc thật khác giá.
    </p>
  </div>

  <div class="card">
    <h2>Gồm những gì</h2>
    <div class="cols">
      <div><h3>Máy — phải giữ nguyên</h3><ul>${bang(TANG.MAY)}</ul></div>
      <div><h3>Luật — sửa cho repo bạn</h3><ul>${bang(TANG.LUAT)}</ul></div>
      <div><h3>Trạng thái — bạn tự viết</h3><ul>${bang(TANG.TRANG)}</ul></div>
    </div>
  </div>

  <footer>
    <span>bản ${esc(TEMPLATE_VERSION)} — chưa từng chạy trên một repo khác nghề</span>
    <span>trang này sinh từ chính bộ khung, không gõ tay</span>
  </footer>
</div>
`;
}

const THIS = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(THIS)) {
  const ra = process.argv[2];
  if (!ra) {
    console.error("Dùng: node scripts/build-template-overview.mjs <file-ra.html>");
    process.exit(2);
  }
  const files = buildTemplateFiles();
  fs.mkdirSync(path.dirname(path.resolve(ra)), { recursive: true });
  fs.writeFileSync(path.resolve(ra), trang(files), "utf8");
  const d = doDacTinh(files);
  console.log(`Đã sinh ${ra} — ${d.soFile} file, ${d.soCongCu} công cụ, ${d.dongLuat} dòng luật, ${d.tuVungNghe} dòng thuộc riêng nghề.`);
}

export { trang };

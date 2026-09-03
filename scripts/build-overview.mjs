/* Bộ sinh BẢNG TRẠNG THÁI — trang trực quan cho Đức xem.
 *
 * LUẬT: không một con số nào gõ tay. Mọi thứ lấy từ `collectModel` — cùng nguồn với
 * DASHBOARD.md, llms.txt và repo-map.json, nên các trang không thể nói khác nhau.
 *
 * BẢN RA KHÔNG COMMIT, có chủ đích. Nó sinh ra để publish cho Đức xem. Commit một file HTML
 * lớn thì nó đổi mỗi lần chạy, và phải thêm vào phép kiểm độ tươi thành cái thứ năm. Thay vào
 * đó trang TỰ IN ngày sinh và bật cờ đỏ khi quá 7 ngày — cũ thì nhìn thấy là cũ.
 *
 * Đặc tả Đức chốt 01/09: 2 cột desktop / 1 cột mobile · cờ đỏ khi >7 ngày (ngày sinh luôn
 * hiện) · các hướng dạng hàng · phần đã qua đóng mặc định chỉ hiện hai con số · sức khoẻ
 * 3 đếm + một đèn.
 * CẤM trong trang: SHA · đường dẫn · phần trăm · lời tự khen của máy.
 *
 * Dùng: node scripts/build-overview.mjs <file-ra.html>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { collectModel, createDefaultDeps } from "./build-dashboard.mjs";

const MODULE_FILE = path.resolve(fileURLToPath(import.meta.url));
const ROOT = path.resolve(path.dirname(MODULE_FILE), "..");

/* Bốn bậc người đọc hiểu, gộp từ bảy giá trị lifecycle của hồ sơ trạng thái. */
export const STAGES = ["Ý TƯỞNG", "ĐANG XÂY", "ĐÃ CHỨNG MINH", "NGHỈ / THAY THẾ"];

/* Bậc trong sổ ý tưởng khớp MỘT-MỘT với thanh bậc trên trang. Ai thêm bậc mới vào IDEAS.md
   mà không sửa đây thì bộ sinh NÉM — im lặng đoán còn tệ hơn, vì Đức sẽ tin con số. */
export const IDEA_STAGES = new Map([
  ["ý tưởng", 0], ["đang xây", 1], ["đã chứng minh", 2], ["nghỉ", 3]
]);

export function stageOf(row) {
  const lc = row.lifecycle;
  if (lc === "idea") return 0;
  if (lc === "paused" || lc === "archived" || lc === "superseded") return 3;
  // `active` mà CHƯA khai kiểm chứng thì không được tô là đã chứng minh — đó là lời khen máy
  // tự nói, và đặc tả cấm. Nó vẫn đang xây.
  if (lc === "active") return row.lastVerified ? 2 : 1;
  return 1; // building · experimental
}

/* Rút văn kỹ thuật thành một câu nắm được. Đức nói rõ: không đưa chi tiết quá kỹ thuật lên
   bảng. Đường dẫn bị cắt cả tên file LẪN đường thư mục — bản đầu để lọt một đường dẫn ba
   tầng vào dòng nội dung, và chính bộ kiểm của phép thử bắt được. */
export function shorten(text, max = 96) {
  let s = String(text ?? "").replace(/\s+/g, " ").trim();
  s = s.replace(/`([^`]*)`/g, "$1").replace(/\*\*([^*]*)\*\*/g, "$1");
  s = s.replace(/\[(ĐO|ĐỌC|DÒ)[^\]]*\]/g, "");
  s = s.replace(/\([^)]*\.(js|mjs|md|json)[^)]*\)/g, "");
  // Ba luật, và thứ tự quan trọng. Luật giữa mới thêm sau khi phép thử bắt được lỗ:
  // "scripts/build-dashboard.mjs" chỉ có MỘT gạch chéo nên luật hai-gạch-chéo không thấy nó.
  s = s.replace(/\S*\.(?:js|mjs|md|json|html)\S*/gi, "…"); // bất cứ gì mang đuôi file mã
  s = s.replace(/\S*\/\S*\/\S*/g, "…");                      // đường dẫn ≥2 tầng, không có đuôi
  // Tên thư mục trơ, gạch chéo ở CUỐI ("vào scripts/, nối vào…"). Lọt cả hai luật trên vì
  // chỉ có một gạch chéo và không có đuôi file. Phát hiện khi chính IDEAS.md của tôi làm nó
  // lọt lên bảng — phép kiểm bất biến bắt được. Đòi ký tự chữ ngay trước dấu gạch, và một
  // dấu ngắt ngay sau, nên "và/hoặc" không bị cắt oan.
  s = s.replace(/\S*\w\/(?=[\s,.;:)\]]|$)/g, "…");
  // Một gạch chéo mà không có đuôi file thì là chữ thường ("và/hoặc") — cố ý không cắt.
  s = s.replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const stop = Math.max(cut.lastIndexOf("."), cut.lastIndexOf(";"), cut.lastIndexOf(","), cut.lastIndexOf(" "));
  return (stop > max * 0.5 ? cut.slice(0, stop) : cut).trim() + "…";
}

/* SỔ Ý TƯỞNG — phòng chờ của cả repo. Ý tưởng đã điền `nhà:` thì đã ra khỏi phòng chờ,
   không hiện nữa (nếu hiện thì bảng đếm hai lần một việc). */
export function readIdeas(deps) {
  if (!deps.fileExists("IDEAS.md")) return [];
  const raw = [];
  let cur = null;
  for (const line of deps.readFile("IDEAS.md").split(/\r?\n/)) {
    const head = /^##\s+([A-Z]-\d+)\s*·\s*(.+?)\s*$/.exec(line);
    if (head) {
      if (cur) raw.push(cur);
      cur = { code: head[1], name: head[2], fields: new Map() };
      continue;
    }
    if (!cur) continue;
    const field = /^-\s+\*\*([^:*]+):\*\*\s*(.+)$/.exec(line);
    if (field) cur.fields.set(field[1].trim(), field[2].trim());
  }
  if (cur) raw.push(cur);
  return raw
    .map((idea) => {
      const stageText = (idea.fields.get("bậc") || "").trim();
      if (!IDEA_STAGES.has(stageText)) {
        throw new Error(`SO_Y_TUONG_HONG: ${idea.code} khai bậc "${stageText}" — phải là một trong: ${[...IDEA_STAGES.keys()].join(" · ")}. Sửa IDEAS.md rồi chạy lại.`);
      }
      return {
        code: idea.code,
        name: idea.name,
        stage: IDEA_STAGES.get(stageText),
        next: idea.fields.get("việc kế") || "",
        owner: idea.fields.get("chủ") || "",
        home: idea.fields.get("nhà") || ""
      };
    })
    .filter((idea) => !idea.home)
    .sort((a, b) => a.stage - b.stage || a.code.localeCompare(b.code));
}

/* NỢ KỸ THUẬT: ĐẾM, không liệt kê.
   Bản đầu liệt kê ra và được gần sáu chục dòng mã lỗi kiểu "race condition khi huỷ tới trước
   job" — đúng thứ Đức nói KHÔNG muốn thấy. Một con số cho mỗi gói nói được cùng một điều
   ("gói nào đang nặng") mà không bắt Đức đọc mã lỗi.
   Ba gói dùng BA định dạng sổ nợ khác nhau nên vẫn phải đọc cả ba. */
/* MỘT MỤC ĐÃ ĐÓNG — nhận bằng VỊ TRÍ, không tìm giữa câu.
 *
 * Bản cũ tìm ba cụm chữ `ĐÃ ĐÓNG|ĐÃ XONG|ĐÃ VÁ XONG` ở BẤT KỲ đâu trong tiêu đề. Đo ngày
 * 03/09: ba cụm đó **chưa khớp một lần nào** trong cả ba sổ nợ, trong khi 5 mục đã xong thật
 * của gg-flow-video viết `**XONG 02/09**` thì bị đếm là nợ. Bảng hiện 65, thật 60.
 *
 * Và đừng chữa bằng cách NỚI THÊM CHỮ vào biểu thức. Đã thử: trong 8 dòng có chữ "xong",
 * hai dòng VẪN ĐANG MỞ —
 *   F-05  "Gỡ khoá bootstrap Bridge sau khi F-02+F-04 xong"   ← "xong" trong một ĐIỀU KIỆN
 *   F-19  "XONG một phần 02/09"                                ← xong một nửa không phải xong
 * Nới chữ là đóng oan hai việc đang mở, tức bảng báo THIẾU nợ. Nặng hơn báo thừa.
 *
 * Nên luật là: dấu đóng phải là thứ ĐẦU TIÊN của tiêu đề, và "một phần" thì không tính.
 * Mục nào viết dấu đóng ở giữa câu sẽ bị tính là còn mở — cố ý: lệch về phía BÁO THỪA nợ.
 * Cách khai không nhập nhằng nhất vẫn là `~~gạch ngang~~`; luật này chỉ đỡ cho văn xuôi.
 */
const DAU_DONG = /^(?:\*\*)?\s*(?:ĐÃ\s+)?(?:XONG|ĐÓNG|VÁ\s+XONG)\b/i;
const MOT_PHAN = /một\s+phần/i;
export function isDone(title) {
  const t = String(title ?? "");
  return DAU_DONG.test(t) && !MOT_PHAN.test(t);
}

export function debtByUnit(deps, model) {
  const rows = [];
  for (const relPath of deps.git.trackedPaths().filter((p) => p.endsWith("/BACKLOG.md")).sort()) {
    let text;
    try { text = deps.readFile(relPath); } catch { continue; }
    let open = 0;
    for (const line of text.split(/\r?\n/)) {
      const heading = /^#{2,4}\s+(~~)?\s*([A-Z]{1,3}-\d+)\s*[·:.\-]\s*(.+)$/.exec(line);
      const bullet = /^-\s+\*\*([A-Z]{1,3}-\d+)\*\*\s*[·:.\-]\s*(.+)$/.exec(line);
      if (!heading && !bullet) continue;
      const title = heading ? heading[3] : bullet[2];
      if (Boolean(heading && heading[1]) || /~~/.test(title) || isDone(title)) continue;
      open += 1;
    }
    const key = relPath.replace(/\/BACKLOG\.md$/, "");
    const found = model.rows.find((r) => r.key === key);
    rows.push({ name: found ? found.name : key.split("/").slice(-2, -1)[0], n: open });
  }
  return rows.sort((a, b) => b.n - a.n);
}

/* VIỆC CHỜ TAY ĐỨC — đọc trường `human_action`, KHÔNG đoán từ chữ (luật vàng 1).
   BA trạng thái phải phân biệt. Gộp bất kỳ hai cái là bảng nói dối:
     chuỗi thật  → có việc chờ Đức
     "không"     → đã trả lời, và không có gì chờ
     rỗng        → CHƯA AI TRẢ LỜI câu đó
   Cái tệ nhất là gộp "không" với rỗng: bảng sẽ báo "không có việc nào chờ Đức" trong khi
   thật ra chưa ai được hỏi. Đó đúng là tình trạng trước khi có trường này.
   Đơn vị đã nghỉ hưu không tính — nó ra khỏi cuộc đua rồi. */
export const RETIRED_LIFECYCLES = new Set(["superseded", "archived"]);

export function humanWork(rows) {
  const live = rows.filter((r) => !RETIRED_LIFECYCLES.has(r.lifecycle));
  // CẮT KHOẢNG TRẮNG TRƯỚC khi phân loại. Bản đầu lọc trên chuỗi thô, nên một trường khai
  // toàn dấu cách bị đếm CẢ là việc thật CẢ là chưa khai — cùng một đơn vị nằm ở hai nhóm
  // loại trừ nhau. Lược đồ đã chặn ca này, nhưng hàm hiển thị vẫn phải tự đúng.
  const trimmed = live.map((r) => ({ unit: r.name, what: String(r.humanAction ?? "").trim() }));
  const actions = trimmed.filter((a) => a.what && a.what.toLowerCase() !== "không");
  const undeclared = trimmed.filter((a) => !a.what).length;
  return { actions, undeclared };
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rail = (stage) => STAGES.map((label, i) =>
  `<div class="node${i === stage ? " on" : ""}${i < stage ? " past" : ""}">` +
  `<span class="dot"></span><span class="lbl">${esc(label)}</span></div>`).join("");

const STYLE = `<style>
:root{
  --ground:#F1F4F2; --surface:#FFFFFF; --inset:#F6F8F7;
  --ink:#141C19; --ink-2:#3D4A45; --muted:#67766F;
  --line:#D8DFDB; --line-2:#C2CCC7;
  --accent:#0E6A58; --good:#0E6A58; --good-bg:#DCEBE6;
  --warn:#A9500B; --warn-bg:#F7E7D5;
  --off:#7C2B33; --off-bg:#F7E4E5;
  --shadow:0 1px 2px rgba(20,28,25,.05),0 6px 20px -12px rgba(20,28,25,.16);
  --sans:"IBM Plex Sans",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
  --disp:"Bricolage Grotesque","IBM Plex Sans",-apple-system,"Segoe UI",sans-serif;
  --mono:"IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace;
}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){
  --ground:#0E1312; --surface:#161D1B; --inset:#121917;
  --ink:#E7EEEB; --ink-2:#B7C4BF; --muted:#8B9A94;
  --line:#2A3532; --line-2:#3A4744;
  --accent:#54C4A6; --good:#54C4A6; --good-bg:#123029;
  --warn:#E0954A; --warn-bg:#3A2611;
  --off:#E08A92; --off-bg:#3A1D21;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 20px -12px rgba(0,0,0,.6);
}}
:root[data-theme="dark"]{
  --ground:#0E1312; --surface:#161D1B; --inset:#121917;
  --ink:#E7EEEB; --ink-2:#B7C4BF; --muted:#8B9A94;
  --line:#2A3532; --line-2:#3A4744;
  --accent:#54C4A6; --good:#54C4A6; --good-bg:#123029;
  --warn:#E0954A; --warn-bg:#3A2611;
  --off:#E08A92; --off-bg:#3A1D21;
  --shadow:0 1px 2px rgba(0,0,0,.4),0 6px 20px -12px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
body{background:var(--ground);color:var(--ink);font-family:var(--sans);font-size:15px;
  line-height:1.55;margin:0;padding:clamp(14px,2.5vw,30px);-webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;display:flex;flex-direction:column;gap:14px}
h1{font-family:var(--disp);margin:0;letter-spacing:-.02em;text-wrap:balance;
  font-size:clamp(24px,3.6vw,36px);font-weight:800;line-height:1.05}
p{margin:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:clamp(14px,2vw,20px);box-shadow:var(--shadow)}
.sect{font-family:var(--disp);font-size:13px;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ink);margin-bottom:12px}
.stampbar{display:flex;justify-content:space-between;align-items:center;gap:12px;
  flex-wrap:wrap;font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.04em}
.stalebanner{background:var(--off-bg);border:1px solid var(--off);border-radius:10px;
  padding:12px 16px;color:var(--off);font-weight:600;font-size:14px}
.cols{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.2fr);gap:14px;align-items:start}
@media (max-width:860px){.cols{grid-template-columns:1fr}}
.col{display:flex;flex-direction:column;gap:14px;min-width:0}
.now{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
@media (max-width:640px){.now{grid-template-columns:1fr}}
.nb{border:1px solid var(--line);border-radius:10px;padding:13px 15px;background:var(--inset);
  display:flex;flex-direction:column;gap:5px;min-width:0}
.nb.focus{border-left:3px solid var(--accent)}
.nb.next{border-left:3px solid var(--warn)}
.nb.duc{border-left:3px solid var(--off);background:var(--off-bg)}
.nb .k{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.11em;text-transform:uppercase}
.nb.focus .k{color:var(--accent)}
.nb.next .k{color:var(--warn)}
.nb.duc .k{color:var(--off)}
.nb .t{font-family:var(--disp);font-size:15.5px;font-weight:600;line-height:1.3}
.nb .s{font-size:13px;color:var(--muted);line-height:1.45}
.hgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(92px,1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:9px;overflow:hidden}
.hc{background:var(--surface);padding:11px 12px;display:flex;flex-direction:column;
  gap:4px;text-align:center;align-items:center}
.hc .n{font-family:var(--disp);font-size:26px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.hc .l{font-size:11.5px;color:var(--muted);line-height:1.3}
.hc.zero .n{color:var(--good)}
.hc.bad .n{color:var(--warn)}
.lamp{width:24px;height:24px;border-radius:50%}
.lamp.ok{background:var(--good)}
.lamp.no{background:var(--warn)}
.init{display:flex;flex-direction:column;gap:10px}
.iv{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--inset);
  display:flex;flex-direction:column;gap:10px;min-width:0}
.iv .code{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.08em;color:var(--muted)}
.iv .nm{font-family:var(--disp);font-size:15px;font-weight:600;line-height:1.25}
.iv .ms{font-size:12.8px;color:var(--muted);line-height:1.4;margin-top:2px}
.iv .who{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;background:var(--good-bg);color:var(--good);
  padding:2px 6px;border-radius:3px;display:inline-block;margin-top:6px}
.railrow{display:grid;grid-template-columns:repeat(4,1fr);gap:2px}
.node{display:flex;flex-direction:column;align-items:center;gap:5px;position:relative}
.node::before{content:"";position:absolute;top:5px;left:0;right:50%;height:1px;background:var(--line-2)}
.node::after{content:"";position:absolute;top:5px;left:50%;right:0;height:1px;background:var(--line-2)}
.node:first-child::before,.node:last-child::after{display:none}
.node .dot{width:11px;height:11px;border-radius:50%;background:var(--surface);
  border:2px solid var(--line-2);position:relative;z-index:1}
.node .lbl{font-family:var(--mono);font-size:8.5px;font-weight:600;letter-spacing:.03em;
  color:var(--muted);text-align:center;line-height:1.2}
.node.past .dot{background:var(--line-2);border-color:var(--line-2)}
.node.on .dot{background:var(--accent);border-color:var(--accent);box-shadow:0 0 0 3px var(--good-bg)}
.node.on .lbl{color:var(--accent)}
.bl{display:flex;flex-direction:column}
.bi{display:grid;grid-template-columns:44px 1fr;gap:10px;padding:9px 0;
  border-bottom:1px solid var(--line);align-items:baseline}
.bi:last-child{border-bottom:none}
.bi .c{font-family:var(--disp);font-size:19px;font-weight:800;color:var(--warn);
  font-variant-numeric:tabular-nums;text-align:right}
.bi .d{font-size:13.4px;color:var(--ink-2);line-height:1.4;min-width:0}
.note{font-size:12px;color:var(--muted);line-height:1.45;margin-top:10px}
.gaps{border-style:dashed;border-color:var(--line-2)}
.gap{border-left:2px solid var(--off);padding-left:12px;display:flex;flex-direction:column;gap:4px}
.gap .k{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.11em;
  text-transform:uppercase;color:var(--off)}
.gap p{font-size:13px;color:var(--ink-2);line-height:1.5}
details.hist summary{cursor:pointer;list-style:none;display:flex;justify-content:space-between;
  align-items:center;gap:12px;flex-wrap:wrap}
details.hist summary::-webkit-details-marker{display:none}
details.hist summary .two{font-family:var(--mono);font-size:12px;color:var(--muted);letter-spacing:.04em}
details.hist[open] summary{margin-bottom:10px}
details.hist p{font-size:13.4px;color:var(--muted);line-height:1.5}
summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
footer{text-align:center;font-size:12.5px;color:var(--muted);padding:6px 0 2px}
</style>`;

export function buildOverview(deps, { title = "Trạng thái Duc Auto", today = Date.now() } = {}) {
  const model = collectModel(deps, { tolerant: true });
  const ideas = readIdeas(deps);
  const debt = debtByUnit(deps, model);
  const debtTotal = debt.reduce((sum, d) => sum + d.n, 0);

  const supersededCount = model.rows.filter((r) => r.lifecycle === "superseded").length;
  const decisionCount = deps.git.trackedPaths()
    .filter((p) => /(^|\/)docs\/adr\/\d{4}-.*\.md$/.test(p)).length;

  /* So hai MỐC NGÀY, không so mốc thời điểm. Bản cũ lấy `Date.now()` (có giờ, phút) trừ
     `Date.parse("2026-09-02")` (nửa đêm UTC) rồi làm tròn — sinh bảng sau trưa là ra
     "1 ngày trước" NGAY TRONG NGÀY SINH. Cùng cơ chế đó bật cờ đỏ 7 ngày sớm nửa ngày. */
  const todayStamp = new Date(today).toISOString().slice(0, 10);
  const stamp = model.headDate || todayStamp;
  const ageDays = Math.max(0, Math.round((Date.parse(todayStamp) - Date.parse(stamp)) / 86400000));
  const stale = ageDays > 7;

  const { actions: humanActions, undeclared: humanUndeclared } = humanWork(model.rows);

  const ranked = model.rows.filter((r) => r.nextStep)
    .sort((a, b) => (a.priorityRank ?? Infinity) - (b.priorityRank ?? Infinity) || a.key.localeCompare(b.key));
  const top = ranked[0] || null;
  const second = ranked[1] || null;

  /* SỨC KHOẺ: ba đếm hiện ra, nhưng ĐÈN tính cả bốn. Đặc tả chốt ba con số; món thứ tư là nợ
     thật nên không bị giấu — chỉ hiện khi khác 0, và luôn tính vào đèn. Giấu một món nợ khỏi
     đèn là cách nhanh nhất để cái đèn thành vô nghĩa. */
  const H = model.health;
  const shown = [
    ["Đơn vị chưa khai trạng thái", H.units_without_status],
    ["Liên kết chết", H.dead_links],
    ["Tài liệu quá hạn rà", H.draft_debt]
  ];
  if (H.undeclared_dirs) shown.push(["Thư mục chưa khai chủ", H.undeclared_dirs]);
  const allClean = [H.units_without_status, H.dead_links, H.draft_debt, H.undeclared_dirs]
    .every((n) => n === 0);

  const initiatives = model.rows.slice().sort((a, b) =>
    stageOf(a) - stageOf(b)
    || (a.priorityRank ?? Infinity) - (b.priorityRank ?? Infinity)
    || a.key.localeCompare(b.key));

  const p = [];
  p.push(`<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
${STYLE}

<div class="wrap">`);

  if (stale) {
    p.push(`  <div class="stalebanner">Bảng này sinh cách đây ${ageDays} ngày — có thể đã cũ. Sinh lại trước khi tin con số.</div>`);
  }

  p.push(`  <div class="stampbar">
    <span>Sinh ngày ${esc(stamp)}${stale ? "" : ` · ${ageDays === 0 ? "hôm nay" : ageDays + " ngày trước"}`}</span>
    <span>Nguồn sự thật nằm trong repo</span>
  </div>

  <h1>${esc(title)}</h1>

  <div class="card">
    <div class="sect">Đang làm / Kế tiếp</div>
    <div class="now">
      <div class="nb focus">
        <span class="k">Đang tập trung</span>
        <span class="t">${esc(top ? top.name : "Không có việc nào đang mở")}</span>
        <span class="s">${esc(top ? shorten(top.currentFocus, 135) : "")}</span>
      </div>
      <div class="nb next">
        <span class="k">Kế tiếp</span>
        <span class="t">${esc(top ? shorten(top.nextStep, 56) : "—")}</span>
        <span class="s">${esc(second ? "Sau đó: " + shorten(second.name, 38) + " — " + shorten(second.nextStep, 66) : "")}</span>
      </div>
      <div class="nb duc">
        <span class="k">Đức cần làm</span>
        <span class="t">${humanActions.length === 0 ? "Không có việc nào chờ Đức" : humanActions.length === 1 ? "1 việc đang chờ" : humanActions.length + " việc đang chờ"}</span>
        <span class="s">${esc(humanActions.length ? humanActions[0].what : (humanUndeclared ? "Nhưng còn đơn vị chưa khai trường này — xem danh sách bên dưới." : "Mọi đơn vị đều đã trả lời câu này."))}</span>
      </div>
    </div>
  </div>

  <div class="cols">
    <div class="col">
      <div class="card">
        <div class="sect">Sức khoẻ</div>
        <div class="hgrid">`);

  for (const [label, n] of shown) {
    p.push(`          <div class="hc ${n === 0 ? "zero" : "bad"}"><span class="n">${n}</span><span class="l">${esc(label)}</span></div>`);
  }
  p.push(`          <div class="hc"><span class="lamp ${allClean ? "ok" : "no"}"></span><span class="l">Tổng thể</span></div>
        </div>
      </div>

      <div class="card">
        <div class="sect">Nợ kỹ thuật</div>
        <div class="bl">`);
  for (const d of debt) {
    p.push(`          <div class="bi"><span class="c">${d.n}</span><span class="d">${esc(d.name)}</span></div>`);
  }
  p.push(`        </div>
        <p class="note">Số mục còn mở trong sổ nợ của từng gói — tổng ${debtTotal}. Bảng cố ý KHÔNG liệt kê mã lỗi; chi tiết nằm trong repo.</p>
      </div>

      <div class="card">
        <div class="sect">Đức cần làm</div>
        <div class="bl">`);
  for (const a of humanActions) {
    p.push(`          <div class="bi"><span class="c">›</span><span class="d"><strong>${esc(a.unit)}</strong> — ${esc(a.what)}</span></div>`);
  }
  if (humanActions.length === 0) {
    p.push(`          <div class="bi"><span class="c">✓</span><span class="d">Không có việc nào đang chờ Đức.</span></div>`);
  }
  p.push(`        </div>${humanUndeclared ? `
        <p class="note"><strong>${humanUndeclared} đơn vị chưa khai trường này</strong> — nên danh sách trên có thể còn thiếu. Trường mới, đang ở giai đoạn tuỳ chọn; xem Y-03 trong sổ ý tưởng.</p>` : ""}
      </div>
    </div>

    <div class="col">
      <div class="card">
        <div class="sect">Sổ ý tưởng</div>
        <div class="init">`);
  for (const idea of ideas) {
    p.push(`          <div class="iv">
            <div>
              <div class="code">${esc(idea.code)}</div>
              <div class="nm">${esc(idea.name)}</div>
              <div class="ms">${esc(shorten(idea.next, 88))}</div>${idea.owner ? `
              <span class="who">đang làm · ${esc(idea.owner)}</span>` : ""}
            </div>
            <div class="railrow">${rail(idea.stage)}</div>
          </div>`);
  }
  p.push(`        </div>
        <p class="note">Phòng chờ của cả repo — ${ideas.length} ý tưởng chưa có nhà. Được nhận làm thì rời sổ. Đức cứ viết một câu, AI chuẩn hoá lại.</p>
      </div>

      <div class="card">
        <div class="sect">Các hướng đang chạy</div>
        <div class="init">`);
  for (const row of initiatives) {
    p.push(`          <div class="iv">
            <div>
              <div class="nm">${esc(row.name)}</div>
              <div class="ms">${esc(shorten(row.nextStep || row.currentFocus, 92))}</div>
            </div>
            <div class="railrow">${rail(stageOf(row))}</div>
          </div>`);
  }
  p.push(`        </div>
      </div>
    </div>
  </div>

  <div class="card">
    <details class="hist">
      <summary>
        <span class="sect" style="margin:0">Đã qua</span>
        <span class="two">Đã thay thế: ${supersededCount} &nbsp;·&nbsp; Quyết định đã chốt: ${decisionCount}</span>
      </summary>
      <p>Mỗi quyết định đã chốt là một bản ghi bất biến trong repo — không sửa được, chỉ thay thế bằng bản mới. Bản đã thay thế vẫn giữ nguyên để tra lại được.</p>
    </details>
  </div>

  <footer>Bảng này là bản chiếu sinh tự động. Nguồn sự thật nằm trong repo.</footer>
</div>
`);

  return {
    html: p.join("\n"),
    stats: {
      ideas: ideas.length, initiatives: initiatives.length, debt: debtTotal,
      decisions: decisionCount, superseded: supersededCount, stamp, ageDays, stale
    }
  };
}

function main() {
  const out = process.argv[2];
  if (!out) {
    console.error("Dùng: node scripts/build-overview.mjs <file-ra.html>");
    process.exit(2);
  }
  // Tên bảng = tên repo, lấy từ thư mục gốc. Không viết tên cứng vào đây: bộ sinh này
  // được mang sang repo khác, và một cái tên cứng sẽ theo sang đó mà không ai để ý.
  const { html, stats } = buildOverview(createDefaultDeps(ROOT), { title: path.basename(ROOT) });
  fs.writeFileSync(out, html, "utf8");
  console.log(`Đã sinh ${out}`);
  console.log(`  ý tưởng: ${stats.ideas} · hướng đang chạy: ${stats.initiatives} · nợ kỹ thuật: ${stats.debt} · quyết định: ${stats.decisions} · đã thay thế: ${stats.superseded}`);
  console.log(`  sinh tại mốc ${stats.stamp} (${stats.ageDays} ngày trước)${stats.stale ? " — ĐÃ CŨ, cờ đỏ bật" : ""}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();

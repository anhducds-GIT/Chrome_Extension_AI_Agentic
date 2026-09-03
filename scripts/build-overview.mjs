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
      cur = { code: head[1], name: head[2], fields: new Map(), body: [] };
      continue;
    }
    if (!cur) continue;
    const field = /^-\s+\*\*([^:*]+):\*\*\s*(.+)$/.exec(line);
    if (field) { cur.fields.set(field[1].trim(), field[2].trim()); continue; }
    // Văn xuôi dưới ý tưởng: mô tả, flow, danh sách tính năng. Giữ lại để tab Ý tưởng có
    // nội dung thật thay vì hai dòng trường. Bỏ dòng trống và dòng tiêu đề cấp dưới.
    const prose = line.trim();
    if (prose && !prose.startsWith("#")) cur.body.push(prose);
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
        home: idea.fields.get("nhà") || "",
        scope: idea.fields.get("phạm vi") || "",
        // Trường nào không nằm trong sáu trường trên vẫn phải tới được tay Đức — nếu không
        // thì thêm một trường vào IDEAS.md là ghi vào hư không.
        extra: [...idea.fields.entries()].filter(([k]) =>
          !["bậc", "việc kế", "chủ", "nhà", "phạm vi"].includes(k)),
        body: idea.body
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

/* MÔ TẢ MỘT EXTENSION — đọc từ `README.md` của gói, KHÔNG tự viết.
 *
 * Đức nói mô tả trên bảng "chung chung, lung tung". Gốc bệnh: bảng chỉ có `next_step` và
 * `current_focus` — hai trường viết cho AI đọc, không phải câu giới thiệu. Câu giới thiệu
 * thật đã có sẵn: `README.md` của gói đóng vai design_brief ("project là gì"), và dòng
 * ngay dưới tiêu đề là một câu mô tả.
 *
 * FAIL CLOSED, và đây là phần quan trọng: nếu tiêu đề README KHÔNG chứa tên đơn vị thì
 * KHÔNG hiện chữ đó. Đo ngày 03/09: `workers/duc-auto-gemini/v0.2.0/README.md` mở đầu bằng
 * "# Duc Auto ChatGPT V0.3" và mô tả ChatGPT — README của gói Gemini là bản chép từ gói
 * ChatGPT. Hiện nguyên văn lên là bảng nói sai tên extension cho Đức đọc. Thà để trống và
 * nói rõ "chưa khai", còn hơn khai sai một cách tự tin.
 */
export function readBrief(deps, row) {
  const file = row.key && row.key !== "." ? `${row.key}/README.md` : "README.md";
  if (!deps.fileExists(file)) return { text: "", why: "gói chưa có README" };
  let lines;
  try { lines = deps.readFile(file).split(/\r?\n/); } catch { return { text: "", why: "không đọc được README" }; }

  const h1 = (lines.find((l) => /^#\s+\S/.test(l)) || "").replace(/^#\s+/, "").trim();
  // Tên đơn vị bỏ phần trong ngoặc ("Duc Auto Gemini (Platform)" → "Duc Auto Gemini"):
  // ngoặc là chú thích của bảng, README không buộc phải có.
  const want = String(row.name ?? "").replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
  const norm = (x) => x.toLowerCase().replace(/\s+/g, " ");
  if (!want || !norm(h1).includes(norm(want))) {
    return { text: "", why: `README mở đầu bằng "${h1.slice(0, 46)}" — không khớp tên đơn vị` };
  }

  const start = lines.findIndex((l) => /^#\s+\S/.test(l));
  const para = [];
  for (const line of lines.slice(start + 1)) {
    const t = line.replace(/^>\s?/, "").trim();
    if (/^#{1,6}\s/.test(t)) break;
    if (!t) { if (para.length) break; continue; }
    para.push(t);
  }
  return { text: shorten(para.join(" "), 260), why: "" };
}

/* DANH SÁCH TÍNH NĂNG — lấy từ mục 2 của `FEATURE-PARITY.md`.
 *
 * Mục 2 là mục DUY NHẤT trong file đó viết bằng chữ người đọc được ("Khoá tab lúc Run",
 * "Nhiều ảnh một job", "Poll A/B"). Mục 1 và 3 là tên method và tên module — đúng thứ Đức
 * nói không muốn thấy, nên KHÔNG lấy.
 * Cột bằng chứng cũng bỏ: nó là số dòng code. Chỉ giữ tên tính năng và có/không.
 */
/* Ba hằng dựng bằng MÃ KÝ TỰ, cố ý.
   Bản trước viết biểu thức có gạch chéo ngược và nó bị thu mất một dấu trên đường vào file:
   biểu thức thành ra khớp CHUỖI RỖNG ở mọi vị trí, nên nó chèn ký tự canh vào giữa từng chữ
   cái và mọi ô bảng vỡ hết. Đây là lần thứ hai cùng một cái bẫy trong một ngày. Dựng bằng
   mã ký tự thì không có gì để mất. */
const chr_pipe = String.fromCharCode(124);
const BS_PIPE = String.fromCharCode(92) + chr_pipe;  // hai ký tự: gạch chéo ngược, rồi pipe
const O_TRONG = String.fromCharCode(1);              // ký tự canh, không có trong văn bản thật

export function readFeatures(deps) {
  if (!deps.fileExists("FEATURE-PARITY.md")) return [];
  let text;
  try { text = deps.readFile("FEATURE-PARITY.md"); } catch { return []; }
  const out = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+2\./.test(line)) { inside = true; continue; }
    if (inside && /^##\s/.test(line)) break;
    if (!inside || !line.startsWith(chr_pipe)) continue;
    // `\|` trong bảng markdown là pipe THUỘC NỘI DUNG, không phải vách ô. Không tháo nó
    // trước khi cắt thì ô bị vỡ: dòng "Đọc `tab.url \|\| tab.pendingUrl`" cắt ra làm 5 ô
    // và cột có/không đọc lệch sang ô sai.
    const cells = line.split(BS_PIPE).join(O_TRONG).split(chr_pipe).slice(1, -1)
      .map((c) => c.split(O_TRONG).join(chr_pipe).trim());
    if (cells.length < 3) continue;
    if (/^-+$/.test(cells[0].replace(/[: ]/g, "")) || cells[0] === "Tính năng") continue;
    const mark = (c) => (c.includes("✅") ? true : c.includes("❌") ? false : null);
    // Mã trong ngoặc kiểu "(B-01)" là mã kỹ thuật, Đức không đọc nó.
    const name = shorten(cells[0].replace(/\s*\([A-Z]-\d+[a-z]?\)\s*/g, " "), 72);
    if (name) out.push({ name, gpt: mark(cells[1]), gemini: mark(cells[2]) });
  }
  return out;
}

/* NHẬT KÝ — các quyết định đã chốt.
 *
 * ĐỌC TIÊU ĐỀ TRONG FILE, không suy từ tên file. Tên file là slug không dấu và bị cắt ngắn:
 * `0066-cung-loi-ben-nhanh-chatgpt-ghi-thanh-b-22-doc.md` suy ra thành "cung loi ben nhanh
 * chatgpt ghi thanh b 22 doc" — Đức đọc câu đó không hiểu gì, mà đây là chữ Đức đọc.
 * Mở file thì được đúng câu người viết, có dấu.
 *
 * Sắp theo SỐ, và số KHÔNG phải ngày: hai phạm vi (cả repo · từng gói) đánh số riêng nên
 * số lớn hơn không có nghĩa là mới hơn. Nhãn trên trang phải nói đúng thế.
 */
export function readDecisions(deps, limit = 14) {
  const rows = deps.git.trackedPaths()
    .filter((p) => /(^|\/)docs\/adr\/\d{4}-.+\.md$/.test(p))
    .map((relPath) => {
      const base = relPath.split("/").pop();
      const num = /^(\d{4})-/.exec(base)[1];
      const parts = relPath.split("/");
      const where = parts[0] === "workers" ? parts[1] : "cả repo";
      let title = "";
      let state = "";
      try {
        for (const line of deps.readFile(relPath).split(/\r?\n/)) {
          if (!title) {
            const h1 = /^#\s+(?:ADR[- ]?\d+\s*[—:·-]\s*)?(.+?)\s*$/.exec(line);
            if (h1) { title = h1[1].replace(/^\d{4}\s*[—:·-]\s*/, "").trim(); continue; }
          }
          const st = /^(?:[-*]\s*)?\*{0,2}Trạng thái\*{0,2}\s*[:—]\s*\*{0,2}([^*]+)/i.exec(line);
          if (st) { state = st[1].trim().replace(/[.*]+$/, ""); break; }
        }
      } catch { /* thiếu file thì để trống, đừng ném — nhật ký không phải nguồn sự thật */ }
      return { num, where, state, name: shorten(title || base.replace(/\.md$/, ""), 88) };
    });
  return {
    total: rows.length,
    top: rows.sort((a, b) => b.num.localeCompare(a.num)).slice(0, limit)
  };
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rail = (stage) => STAGES.map((label, i) =>
  `<div class="node${i === stage ? " on" : ""}${i < stage ? " past" : ""}">` +
  `<span class="dot"></span><span class="lbl">${esc(label)}</span></div>`).join("");

const NL = String.fromCharCode(10);

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
  line-height:1.55;margin:0;padding:clamp(12px,2.2vw,26px);-webkit-font-smoothing:antialiased}
.wrap{max-width:1120px;margin:0 auto;display:flex;flex-direction:column;gap:13px}
h1{font-family:var(--disp);margin:0;letter-spacing:-.02em;text-wrap:balance;
  font-size:clamp(22px,3.2vw,32px);font-weight:800;line-height:1.06}
h2{font-family:var(--disp);font-size:17px;font-weight:800;margin:0 0 9px;letter-spacing:-.01em}
p{margin:0}
.card{background:var(--surface);border:1px solid var(--line);border-radius:12px;
  padding:clamp(13px,1.8vw,19px);box-shadow:var(--shadow)}
.sect{font-family:var(--disp);font-size:12.5px;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;color:var(--ink);margin-bottom:11px}
.stampbar{display:flex;justify-content:space-between;align-items:center;gap:12px;
  flex-wrap:wrap;font-family:var(--mono);font-size:11px;color:var(--muted);letter-spacing:.04em}
.stalebanner{background:var(--off-bg);border:1px solid var(--off);border-radius:10px;
  padding:11px 15px;color:var(--off);font-weight:600;font-size:14px}
.cu{display:none;background:var(--off-bg);border:1px solid var(--off);border-radius:10px;
  padding:11px 15px;color:var(--off);font-weight:600;font-size:14px}
.cu[data-hien="1"]{display:block}

/* TAB — Đức nói trang cũ phải cuộn quá nhiều. Bảy tab, và mỗi tab lại dùng toggle bên trong,
   nên mặc định trang chỉ cao bằng một màn hình. */
.tabs{display:flex;gap:5px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.tab{font-family:var(--sans);font-size:13.5px;font-weight:600;color:var(--muted);
  background:none;border:1px solid transparent;border-bottom:none;cursor:pointer;
  padding:9px 14px;border-radius:9px 9px 0 0;margin-bottom:-1px}
.tab:hover{color:var(--ink);background:var(--inset)}
.tab[aria-selected="true"]{color:var(--accent);background:var(--surface);
  border-color:var(--line);border-bottom-color:var(--surface)}
.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[role="tabpanel"]{display:flex;flex-direction:column;gap:13px}

.now{display:grid;grid-template-columns:repeat(auto-fit,minmax(215px,1fr));gap:11px}
@media (max-width:640px){.now{grid-template-columns:1fr}}
.nb{border:1px solid var(--line);border-radius:10px;padding:12px 14px;background:var(--inset);
  display:flex;flex-direction:column;gap:5px;min-width:0}
.nb.focus{border-left:3px solid var(--accent)}
.nb.next{border-left:3px solid var(--warn)}
.nb.duc{border-left:3px solid var(--off);background:var(--off-bg)}
.nb .k{font-family:var(--mono);font-size:10px;font-weight:600;letter-spacing:.11em;text-transform:uppercase}
.nb.focus .k{color:var(--accent)}
.nb.next .k{color:var(--warn)}
.nb.duc .k{color:var(--off)}
.nb .t{font-family:var(--disp);font-size:15px;font-weight:600;line-height:1.3}
.nb .s{font-size:13px;color:var(--muted);line-height:1.45}

/* BẢNG TỔNG — mục 6 của Đức: một danh sách ngắn, có link nhảy sang tab chi tiết. */
.big{display:flex;flex-direction:column}
.br{display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:baseline;
  padding:9px 0;border-bottom:1px solid var(--line)}
.br:last-child{border-bottom:none}
@media (max-width:560px){.br{grid-template-columns:1fr auto}}
.br a{color:var(--ink);font-weight:600;text-decoration:none;border-bottom:1px solid var(--line-2)}
.br a:hover{color:var(--accent);border-bottom-color:var(--accent)}
.chip{font-family:var(--mono);font-size:9.5px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;padding:2px 7px;border-radius:3px;white-space:nowrap}
.chip.s0{background:var(--inset);color:var(--muted)}
.chip.s1{background:var(--warn-bg);color:var(--warn)}
.chip.s2{background:var(--good-bg);color:var(--good)}
.chip.s3{background:var(--off-bg);color:var(--off)}
.meta{font-family:var(--mono);font-size:10.5px;color:var(--muted)}
.br .meta{white-space:nowrap}
@media (max-width:560px){.br .meta{display:none}}

.hgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:1px;
  background:var(--line);border:1px solid var(--line);border-radius:9px;overflow:hidden}
.hc{background:var(--surface);padding:11px 13px;display:flex;flex-direction:column;gap:3px}
.hc .n{font-family:var(--disp);font-size:23px;font-weight:800;line-height:1;font-variant-numeric:tabular-nums}
.hc .l{font-size:12px;color:var(--ink-2);line-height:1.3;font-weight:600}
.hc .w{font-size:11.5px;color:var(--muted);line-height:1.35}
.hc.zero .n{color:var(--good)}
.hc.bad .n{color:var(--warn)}

.bl{display:flex;flex-direction:column}
.bi{display:grid;grid-template-columns:44px 1fr;gap:10px;padding:8px 0;
  border-bottom:1px solid var(--line);align-items:baseline}
.bi:last-child{border-bottom:none}
.bi .c{font-family:var(--disp);font-size:18px;font-weight:800;color:var(--warn);
  font-variant-numeric:tabular-nums;text-align:right}
.bi .d{font-size:13.4px;color:var(--ink-2);line-height:1.4;min-width:0}
.note{font-size:12px;color:var(--muted);line-height:1.45;margin-top:9px}

/* TOGGLE — mục 9 của Đức: đọc lướt được, mở ra mới thấy chi tiết. */
details.the{border:1px solid var(--line);border-radius:10px;background:var(--inset);
  padding:11px 14px}
details.the + details.the{margin-top:9px}
details.the > summary{cursor:pointer;list-style:none;display:grid;
  grid-template-columns:1fr auto;gap:10px;align-items:baseline}
details.the > summary::-webkit-details-marker{display:none}
details.the > summary:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
details.the .nm{font-family:var(--disp);font-size:15px;font-weight:600;line-height:1.3;display:block}
details.the .sub{font-size:12.5px;color:var(--muted);line-height:1.4;margin-top:2px;display:block}
details.the .in{margin-top:11px;padding-top:11px;border-top:1px solid var(--line-2);
  display:flex;flex-direction:column;gap:9px}
.kv{display:grid;grid-template-columns:122px 1fr;gap:8px;font-size:13.2px;line-height:1.45;margin:0}
@media (max-width:560px){.kv{grid-template-columns:1fr;gap:3px}}
.kv dt{font-family:var(--mono);font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);padding-top:3px}
.kv dd{margin:0;color:var(--ink-2)}
.kv dd.warn{color:var(--warn);font-weight:600}
.prose{font-size:13.4px;color:var(--ink-2);line-height:1.55}
.prose p{margin:0 0 6px}
.prose ul{margin:4px 0;padding-left:19px}
.prose li{margin:2px 0}

.feat{display:flex;flex-direction:column;font-size:13px}
.fr{display:grid;grid-template-columns:1fr 46px 46px;gap:6px;padding:5px 0;
  border-bottom:1px solid var(--line);align-items:baseline}
.fr:last-child{border-bottom:none}
.fr .y{color:var(--good);font-weight:700;text-align:center}
.fr .x{color:var(--off);font-weight:700;text-align:center}
.fr .q{color:var(--muted);text-align:center}
.fr.fh{font-family:var(--mono);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;
  color:var(--muted);border-bottom:1px solid var(--line-2)}
.fr.fh span{text-align:center}
.fr.fh span:first-child{text-align:left}

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

pre.cmd{background:var(--inset);border:1px solid var(--line-2);border-radius:8px;
  padding:11px 13px;margin:0;overflow-x:auto;font-family:var(--mono);font-size:12px;
  line-height:1.5;color:var(--ink);white-space:pre-wrap;word-break:break-word}
.hint{background:var(--good-bg);border-left:3px solid var(--good);border-radius:8px;
  padding:11px 14px;font-size:13.2px;color:var(--ink-2);line-height:1.5}
footer{text-align:center;font-size:12.5px;color:var(--muted);padding:6px 0 2px}
</style>`;

const TABS = [
  ["tong-quan", "Tổng quan"],
  ["extension", "Extension"],
  ["y-tuong", "Ý tưởng"],
  ["van-hanh", "Vận hành"],
  ["suc-khoe", "Sức khoẻ & nợ"],
  ["nhat-ky", "Nhật ký"],
  ["tra-cuu", "Tra cứu"]
];

const chip = (stage) => `<span class="chip s${stage}">${esc(STAGES[stage])}</span>`;

const slug = (s) => String(s ?? "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").replace(/-+$/, "") || "x";

/* Một dòng trong bảng tổng: tên có link nhảy sang tab chi tiết và tự mở toggle ở đó. */
const bigRow = (tab, id, name, stage, meta) =>
  `        <div class="br"><a href="#${esc(id)}" data-goto="${esc(tab)}">${esc(name)}</a>` +
  `${chip(stage)}<span class="meta">${esc(meta)}</span></div>`;

const CAU_LAM_MOI = "Làm mới bảng trạng thái: sinh lại rồi đăng lại artifact.";

export function buildOverview(deps, { title = "Trạng thái Duc Auto", today = Date.now() } = {}) {
  const model = collectModel(deps, { tolerant: true });
  const ideas = readIdeas(deps);
  const debt = debtByUnit(deps, model);
  const debtTotal = debt.reduce((sum, d) => sum + d.n, 0);
  const debtOf = new Map(debt.map((d) => [d.name, d.n]));
  const features = readFeatures(deps);
  const decisions = readDecisions(deps);

  const supersededCount = model.rows.filter((r) => r.lifecycle === "superseded").length;
  const decisionCount = decisions.total;

  /* So hai MỐC NGÀY, không so mốc thời điểm. Bản cũ lấy `Date.now()` (có giờ, phút) trừ
     nửa đêm UTC rồi làm tròn — sinh bảng sau trưa là ra "1 ngày trước" NGAY TRONG NGÀY SINH. */
  const todayStamp = new Date(today).toISOString().slice(0, 10);
  const stamp = model.headDate || todayStamp;
  const ageDays = Math.max(0, Math.round((Date.parse(todayStamp) - Date.parse(stamp)) / 86400000));
  const stale = ageDays > 7;

  const { actions: humanActions, undeclared: humanUndeclared } = humanWork(model.rows);

  const ranked = model.rows.filter((r) => r.nextStep)
    .sort((a, b) => (a.priorityRank ?? Infinity) - (b.priorityRank ?? Infinity) || a.key.localeCompare(b.key));
  const top = ranked[0] || null;
  const second = ranked[1] || null;

  /* SỨC KHOẺ — mục 7 của Đức: bốn số 0 cạnh một đèn xanh trông như đồ giả. Chữa bằng cách
     nói RA ĐÃ DÒ BAO NHIÊU: "0 trên 5 đơn vị đã dò" khác hẳn một chữ "0" trơ trọi. Mẫu số
     lấy từ chính model, không gõ tay. */
  const checks = [
    ["Đơn vị chưa khai hồ sơ", model.health.units_without_status,
      `đã dò cả ${model.rows.length} đơn vị có hồ sơ trạng thái`],
    ["Liên kết chết", model.health.dead_links,
      `đã mở thử ${model.gatewayLinks.length} liên kết trong các file cổng vào`],
    ["Thư mục chưa khai chủ", model.health.undeclared_dirs,
      `đã đối chiếu ${model.topLevel.length} thư mục tầng ngoài cùng với bảng phân vùng`],
    ["Tài liệu quá hạn rà", model.health.draft_debt,
      `đã tính tuổi ${model.docs.length} tài liệu theo hạn rà mỗi file tự khai`]
  ];
  const allClean = checks.every((c) => c[1] === 0);

  const p = [];
  p.push(`<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
${STYLE}

<div class="wrap">
  <div class="stampbar">
    <span>Sinh ngày ${esc(stamp)}${stale ? "" : ` · ${ageDays === 0 ? "hôm nay" : ageDays + " ngày trước"}`}</span>
    <span>Nguồn sự thật nằm trong repo</span>
  </div>
  <div class="cu" id="cu" data-sinh="${esc(stamp)}"></div>`);
  if (stale) {
    p.push(`  <div class="stalebanner">Bảng này sinh cách đây ${ageDays} ngày — có thể đã cũ. Sinh lại trước khi tin con số.</div>`);
  }
  p.push(`
  <h1>${esc(title)}</h1>

  <div class="tabs" role="tablist">`);
  for (const tab of TABS) {
    p.push(`    <button class="tab" role="tab" data-tab="${tab[0]}" aria-selected="${tab[0] === "tong-quan" ? "true" : "false"}">${esc(tab[1])}</button>`);
  }
  p.push(`  </div>`);

  /* ===== TAB 1 · TỔNG QUAN ===== */
  p.push(`
  <div role="tabpanel" data-pane="tong-quan">
    <div class="card">
      <div class="sect">Đang làm / Kế tiếp</div>
      <div class="now">
        <div class="nb focus">
          <span class="k">Đang tập trung</span>
          <span class="t">${esc(top ? top.name : "—")}</span>
          <span class="s">${esc(top ? shorten(top.currentFocus || top.nextStep) : "Chưa có đơn vị nào khai việc kế.")}</span>
        </div>
        <div class="nb next">
          <span class="k">Kế tiếp</span>
          <span class="t">${esc(top ? shorten(top.nextStep, 58) : "—")}</span>
          <span class="s">${esc(second ? "Sau đó: " + second.name + " — " + shorten(second.nextStep, 68) : "Không còn việc nào xếp sau.")}</span>
        </div>
        <div class="nb duc">
          <span class="k">Đức cần làm</span>
          <span class="t">${humanActions.length ? humanActions.length + " việc đang chờ" : "Không có việc nào chờ Đức"}</span>
          <span class="s">${esc(humanActions.length ? shorten(humanActions[0].what) : "Mọi đơn vị đã khai là không cần Đức làm gì.")}</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="sect">Toàn bộ việc lớn — bấm tên để xem chi tiết</div>
      <div class="big">`);
  for (const r of model.rows) {
    const n = debtOf.get(r.name);
    p.push(bigRow("extension", `ext-${slug(r.id || r.name)}`, r.name, stageOf(r),
      n === undefined ? "extension" : `${n} việc nợ`));
  }
  for (const idea of ideas) {
    p.push(bigRow("y-tuong", `y-${slug(idea.code)}`, `${idea.code} · ${idea.name}`, idea.stage,
      idea.owner ? "đang có người làm" : "chưa ai nhận"));
  }
  p.push(`      </div>
      <p class="note">${model.rows.length} extension và ${ideas.length} ý tưởng. Chi tiết extension ở tab <strong>Extension</strong>, chi tiết ý tưởng ở tab <strong>Ý tưởng</strong>.</p>
    </div>

    <div class="card">
      <div class="sect">Đức cần làm</div>
      <div class="bl">`);
  if (humanActions.length) {
    for (const a of humanActions) {
      p.push(`        <div class="bi"><span class="c">›</span><span class="d"><strong>${esc(a.unit)}</strong> — ${esc(a.what)}</span></div>`);
    }
  } else {
    p.push(`        <div class="bi"><span class="c">✓</span><span class="d">Không có việc nào đang chờ Đức.</span></div>`);
  }
  p.push(`      </div>${humanUndeclared ? `
      <p class="note"><strong>${humanUndeclared} đơn vị chưa khai trường này</strong> — nên danh sách trên có thể còn thiếu.</p>` : ""}
    </div>

    <div class="card">
      <div class="sect">Làm mới bảng</div>
      <div class="hint">Bảng không tự làm mới. Nó in ngày sinh ở đầu trang và <strong>tự bật dải đỏ khi Đức mở nó vào một ngày khác ngày sinh</strong>. Thấy dải đỏ thì dán câu dưới đây cho tôi.</div>
      <pre class="cmd">${esc(CAU_LAM_MOI)}</pre>
      <p class="note">Cách nó chạy, và lệnh chạy tay, nằm ở tab <strong>Vận hành</strong>.</p>
    </div>
  </div>`);

  /* ===== TAB 2 · EXTENSION ===== */
  p.push(`
  <div role="tabpanel" data-pane="extension" hidden>
    <div class="card">
      <div class="sect">Extension trong repo</div>`);
  for (const r of model.rows) {
    const brief = readBrief(deps, r);
    const n = debtOf.get(r.name);
    const twoBranch = /chatgpt|gemini/i.test(r.id || r.name);
    const duc = String(r.humanAction ?? "").trim();
    p.push(`      <details class="the" id="ext-${slug(r.id || r.name)}">
        <summary>
          <span><span class="nm">${esc(r.name)}</span><span class="sub">${esc(brief.text || "Mô tả chưa khai được — " + brief.why)}</span></span>
          ${chip(stageOf(r))}
        </summary>
        <div class="in">
          <div class="railrow">${rail(stageOf(r))}</div>
          <dl class="kv">
            <dt>Việc kế</dt><dd>${esc(shorten(r.nextStep, 190) || "chưa khai")}</dd>
            <dt>Đức cần làm</dt><dd${duc && duc.toLowerCase() !== "không" ? ` class="warn"` : ""}>${esc(duc || "chưa ai trả lời câu này")}</dd>
            <dt>Kiểm chứng cuối</dt><dd>${esc(r.lastVerified ? r.lastVerified : "chưa từng khai kiểm chứng")}</dd>
            <dt>Việc còn nợ</dt><dd>${n === undefined ? "gói chưa có sổ nợ" : n + " việc"}</dd>
            <dt>Lệnh Bridge</dt><dd>${r.bridgeMethods} lệnh · ${r.testFiles} file kiểm</dd>
          </dl>`);
    if (twoBranch && features.length) {
      p.push(`          <div>
            <h2>Tính năng đã đo</h2>
            <div class="feat">
              <div class="fr fh"><span>Tính năng</span><span>GPT</span><span>Gemini</span></div>`);
      for (const f of features) {
        const cell = (v) => v === true ? `<span class="y">có</span>` : v === false ? `<span class="x">không</span>` : `<span class="q">?</span>`;
        p.push(`              <div class="fr"><span>${esc(f.name)}</span>${cell(f.gpt)}${cell(f.gemini)}</div>`);
      }
      p.push(`            </div>
            <p class="note">Lấy từ bảng đối chiếu hai nhánh trong repo, phần đã đo. Bảng đó chỉ so GPT với Gemini nên extension khác không có cột.</p>
          </div>`);
    } else {
      p.push(`          <p class="note">Chưa có bảng tính năng cho extension này. Bảng đối chiếu trong repo hiện chỉ so hai nhánh GPT và Gemini.</p>`);
    }
    p.push(`        </div>
      </details>`);
  }
  p.push(`      <p class="note">Mô tả lấy từ file giới thiệu của từng gói. Gói nào tiêu đề không khớp tên đơn vị thì bảng <strong>để trống và nói rõ lý do</strong>, không hiện chữ sai.</p>
    </div>
  </div>`);

  /* ===== TAB 3 · Ý TƯỞNG ===== */
  p.push(`
  <div role="tabpanel" data-pane="y-tuong" hidden>
    <div class="card">
      <div class="sect">Sổ ý tưởng — phòng chờ của cả repo</div>`);
  for (const idea of ideas) {
    p.push(`      <details class="the" id="y-${slug(idea.code)}">
        <summary>
          <span><span class="nm">${esc(idea.code)} · ${esc(idea.name)}</span><span class="sub">${esc(shorten(idea.next, 140) || "chưa khai việc kế")}</span></span>
          ${chip(idea.stage)}
        </summary>
        <div class="in">
          <div class="railrow">${rail(idea.stage)}</div>
          <dl class="kv">
            <dt>Việc kế</dt><dd>${esc(shorten(idea.next, 220) || "chưa khai")}</dd>
            <dt>Ai đang làm</dt><dd>${esc(idea.owner || "chưa ai nhận")}</dd>
            <dt>Phạm vi</dt><dd>${esc(shorten(idea.scope, 180) || "chưa khai")}</dd>`);
    for (const kv of idea.extra) {
      p.push(`            <dt>${esc(kv[0])}</dt><dd>${esc(shorten(kv[1], 200))}</dd>`);
    }
    p.push(`          </dl>`);
    if (idea.body.length) {
      const items = idea.body.slice(0, 18).map((line) => {
        const bullet = /^[-*]\s+(.+)$/.exec(line);
        return bullet ? `<li>${esc(shorten(bullet[1], 200))}</li>` : `<p>${esc(shorten(line, 230))}</p>`;
      });
      p.push(`          <div class="prose">${items.join(NL)}</div>`);
    }
    p.push(`        </div>
      </details>`);
  }
  p.push(`      <p class="note">Ý tưởng nào đã có nhà thì rời sổ nên không hiện ở đây nữa. Đức cứ viết một câu, tôi chuẩn hoá lại.</p>
    </div>
  </div>`);

  /* ===== TAB 4 · VẬN HÀNH ===== */
  p.push(`
  <div role="tabpanel" data-pane="van-hanh" hidden>
    <div class="card">
      <div class="sect">Làm mới bảng này</div>
      <div class="hint">Bảng là ảnh chụp, <strong>không tự cập nhật</strong>. Dải đỏ ở đầu trang tự bật khi Đức mở nó vào một ngày khác ngày sinh — nó tính lúc XEM, không lúc sinh, nên không cần sinh lại mới biết là cũ.</div>
      <details class="the">
        <summary><span><span class="nm">Câu để dán cho AI</span><span class="sub">cách nhanh nhất, không cần mở terminal</span></span></summary>
        <div class="in"><pre class="cmd">${esc(CAU_LAM_MOI)}</pre></div>
      </details>
      <p class="note">Bản ra <strong>không commit</strong> vào repo, có chủ đích: nó sinh ra để đăng cho Đức xem, và chạy lại là ra y hệt. Lệnh chạy nằm trong repo — bảng cố ý không in đường dẫn nào, vì phép kiểm bất biến cấm.</p>
    </div>

    <div class="card">
      <div class="sect">Bảng này lấy số ở đâu</div>
      <div class="prose"><p>Không một con số nào gõ tay. Tất cả đọc từ file trong repo, cùng nguồn với ba trang máy sinh khác — nên bốn trang không thể nói khác nhau.</p></div>
      <details class="the" style="margin-top:11px">
        <summary><span><span class="nm">Từng con số đến từ đâu</span><span class="sub">mở ra nếu Đức muốn kiểm chéo</span></span></summary>
        <div class="in"><dl class="kv">
          <dt>Extension</dt><dd>hồ sơ trạng thái đặt cạnh mỗi extension</dd>
          <dt>Mô tả</dt><dd>file giới thiệu của từng gói, và bảng từ chối hiện nếu tiêu đề không khớp tên</dd>
          <dt>Tính năng</dt><dd>bảng đối chiếu hai nhánh, phần đã đo</dd>
          <dt>Ý tưởng</dt><dd>sổ ý tưởng ở gốc repo</dd>
          <dt>Việc còn nợ</dt><dd>sổ nợ của từng gói, đếm mục chưa đóng</dd>
          <dt>Quyết định</dt><dd>mỗi quyết định một file bất biến</dd>
        </dl></div>
      </details>
    </div>

    <div class="card">
      <div class="sect">Đức góp ý ngay trên trang</div>
      <div class="hint">Bôi đen bất kỳ dòng nào rồi <strong>để lại bình luận</strong> — bình luận gắn đúng vào khối đó, nên tôi biết Đức đang nói về mục nào mà không cần Đức mô tả lại. Muốn tôi trả lời thì gửi bình luận cho Claude.</div>
      <p class="note">Đây là cách nhanh nhất để sửa một mô tả viết chưa rõ: Đức bình luận vào đúng chỗ, tôi viết lại vào file trong repo rồi sinh lại bảng.</p>
    </div>
  </div>`);

  /* ===== TAB 5 · SỨC KHOẺ & NỢ ===== */
  p.push(`
  <div role="tabpanel" data-pane="suc-khoe" hidden>
    <div class="card">
      <div class="sect">Sức khoẻ — bốn phép dò, và mỗi phép đã dò bao nhiêu</div>
      <div class="hgrid">`);
  for (const c of checks) {
    p.push(`        <div class="hc ${c[1] === 0 ? "zero" : "bad"}"><span class="n">${c[1]}</span><span class="l">${esc(c[0])}</span><span class="w">${esc(c[2])}</span></div>`);
  }
  p.push(`      </div>
      <p class="note">${allClean
    ? "Cả bốn phép đều sạch. Con số 0 ở đây là 0 <em>trên mẫu đã dò ghi ngay dưới nó</em> — không phải 0 vì chưa dò gì."
    : "Có phép chưa sạch. Số khác 0 là số việc thật đang thiếu, không phải cảnh báo chung."}</p>
    </div>

    <div class="card">
      <div class="sect">Việc còn nợ — ${debtTotal} mục đang mở</div>
      <div class="bl">`);
  for (const d of debt) {
    p.push(`        <div class="bi"><span class="c">${d.n}</span><span class="d">${esc(d.name)}</span></div>`);
  }
  p.push(`      </div>
      <details class="the" style="margin-top:11px">
        <summary><span><span class="nm">Con số này đếm thế nào</span><span class="sub">và vì sao nó thà đếm thừa hơn đếm thiếu</span></span></summary>
        <div class="in"><div class="prose">
          <p>Đếm số mục chưa đóng trong sổ nợ của từng gói. Một mục tính là đã đóng khi nó bị gạch ngang, hoặc khi dòng của nó <strong>mở đầu</strong> bằng chữ xong.</p>
          <p>Dấu đóng phải nằm ở đầu dòng, không tìm giữa câu — vì có mục viết "gỡ khoá sau khi việc kia xong", chữ xong ở đó là một điều kiện chứ không phải trạng thái. Tìm giữa câu là đóng oan một việc đang mở, tức bảng báo <em>thiếu</em> nợ. Mục nào viết dấu đóng ở giữa câu sẽ bị tính là còn mở: cố ý lệch về phía báo thừa.</p>
        </div></div>
      </details>
      <p class="note">Bảng cố ý KHÔNG liệt kê mã lỗi. Chi tiết nằm trong sổ nợ của từng gói.</p>
    </div>
  </div>`);

  /* ===== TAB 6 · NHẬT KÝ ===== */
  p.push(`
  <div role="tabpanel" data-pane="nhat-ky" hidden>
    <div class="card">
      <div class="sect">Quyết định đã chốt — ${decisionCount} bản ghi</div>
      <div class="prose"><p>Mỗi quyết định là một file bất biến: đã chốt thì không sửa được, chỉ thay bằng bản mới. Bản bị thay vẫn giữ nguyên để tra lại được. Hiện có ${supersededCount} đơn vị đã bị bản mới thay thế.</p></div>
      <details class="the" style="margin-top:11px" open>
        <summary><span><span class="nm">${decisions.top.length} quyết định số cao nhất</span><span class="sub">số KHÔNG phải ngày — mỗi phạm vi đánh số riêng</span></span></summary>
        <div class="in"><div class="bl">`);
  for (const d of decisions.top) {
    p.push(`          <div class="bi"><span class="c">${esc(d.num)}</span><span class="d">${esc(d.name)}<br><span class="meta">${esc(d.where)}${d.state ? " · " + esc(d.state) : ""}</span></span></div>`);
  }
  p.push(`        </div></div>
      </details>
    </div>
  </div>`);

  /* ===== TAB 7 · TRA CỨU ===== */
  p.push(`
  <div role="tabpanel" data-pane="tra-cuu" hidden>
    <div class="card">
      <div class="sect">Tra cứu — chữ trên bảng nghĩa là gì</div>
      <dl class="kv">
        <dt>Ý tưởng</dt><dd>đã ghi nhận, chưa ai bắt tay làm.</dd>
        <dt>Đang xây</dt><dd>đang có người làm, nhưng chưa chứng minh chạy được trên trang thật.</dd>
        <dt>Đã chứng minh</dt><dd>đã chạy thật và có bằng chứng lưu trong repo. Bảng không tự phong bậc này — phải có ngày kiểm chứng khai trong hồ sơ.</dd>
        <dt>Nghỉ / thay thế</dt><dd>dừng, hoặc đã có bản mới thay. Không xoá, giữ để tra lại.</dd>
        <dt>Việc còn nợ</dt><dd>việc đã biết là phải làm nhưng chưa làm. Không phải lỗi đang hỏng.</dd>
        <dt>Kiểm chứng cuối</dt><dd>lần gần nhất extension đó chạy thật và có bằng chứng, không phải lần sửa code gần nhất.</dd>
        <dt>Lệnh Bridge</dt><dd>số việc AI có thể nhờ extension làm hộ qua kênh điều khiển.</dd>
        <dt>File kiểm</dt><dd>số file phép thử tự động của gói đó.</dd>
      </dl>
    </div>
  </div>

  <footer>Bảng này là bản chiếu sinh tự động. Nguồn sự thật nằm trong repo.</footer>
</div>

<script>
(function () {
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[role=tab]"));
  var panes = Array.prototype.slice.call(document.querySelectorAll("[role=tabpanel]"));
  function show(id) {
    tabs.forEach(function (t) { t.setAttribute("aria-selected", t.dataset.tab === id ? "true" : "false"); });
    panes.forEach(function (pn) { pn.hidden = pn.dataset.pane !== id; });
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { show(t.dataset.tab); }); });

  Array.prototype.slice.call(document.querySelectorAll("a[data-goto]")).forEach(function (a) {
    a.addEventListener("click", function (ev) {
      ev.preventDefault();
      show(a.dataset.goto);
      var el = document.getElementById(a.getAttribute("href").slice(1));
      if (!el) return;
      if (el.tagName === "DETAILS") el.open = true;
      el.scrollIntoView({ block: "start" });
    });
  });

  // Dải đỏ tính tuổi lúc XEM, không lúc sinh: trang tĩnh đem đăng thì lúc sinh nó luôn mới,
  // mà cái Đức cần biết là "hôm tôi mở, nó còn mới không".
  var b = document.getElementById("cu");
  if (b && b.dataset.sinh) {
    var d = new Date();
    var nay = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (nay > b.dataset.sinh) {
      b.dataset.hien = "1";
      b.textContent = "Bảng sinh ngày " + b.dataset.sinh + ", hôm nay " + nay
        + " — số liệu có thể đã cũ. Nhờ AI: Làm mới bảng trạng thái.";
    }
  }
})();
</script>`);

  return {
    html: p.join(NL),
    stats: {
      ideas: ideas.length, extensions: model.rows.length, debt: debtTotal,
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
  console.log(`  ý tưởng: ${stats.ideas} · extension: ${stats.extensions} · nợ kỹ thuật: ${stats.debt} · quyết định: ${stats.decisions} · đã thay thế: ${stats.superseded}`);
  console.log(`  sinh tại mốc ${stats.stamp} (${stats.ageDays} ngày trước)${stats.stale ? " — ĐÃ CŨ, cờ đỏ bật" : ""}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();

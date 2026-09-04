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

import { collectModel, createDefaultDeps, createHeadDeps } from "./build-dashboard.mjs";

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


/* CẤU TRÚC REPO — Đức yêu cầu 03/09: bản đồ file và thư mục là thông tin quan trọng.
 *
 * ĐỌC HẾT TỪ REPO, không gõ tay một dòng nào: thư mục tầng ngoài cùng và chủ của chúng đọc
 * từ bảng phân vùng; số file đếm từ danh sách git theo dõi; bảng "khi cần gì mở file nào"
 * đọc từ mục 6 của luật gốc — tức nó tự đồng bộ khi luật đổi, thay vì mục lục thứ hai sẽ mục.
 *
 * VÀ ĐÂY LÀ NGOẠI LỆ DUY NHẤT của bất biến "bảng không in đường dẫn". Bất biến đó sinh ra
 * để chặn đường dẫn LỌT VÀO VĂN XUÔI mô tả — Đức không phải đọc chi tiết kỹ thuật trong một
 * câu kể. Ở tab này đường dẫn CHÍNH LÀ nội dung Đức yêu cầu. Nên nó được bọc trong
 * `<div class="map">`, và phép kiểm bất biến vừa bỏ qua khối đó, vừa THÊM một khẳng định:
 * đường dẫn chỉ được xuất hiện TRONG khối đó. Thu hẹp phạm vi, không khoét lỗ. */
export function readAreas(deps) {
  let parsed;
  try { parsed = JSON.parse(deps.readFile(".repo-structure.json")); } catch { return []; }
  const areas = parsed?.areas;
  if (!areas || typeof areas !== "object") return [];
  const paths = deps.git.trackedPaths();
  return Object.entries(areas)
    .filter(([key]) => key.endsWith("/"))
    .map(([dir, value]) => ({
      dir,
      steward: value?.steward ?? null,
      files: paths.filter((f) => f.startsWith(dir)).length
    }))
    .sort((a, b) => b.files - a.files);
}

export function readRootFiles(deps) {
  let sinh = [];
  try { sinh = JSON.parse(deps.readFile(".repo-structure.json"))?.generated ?? []; } catch { /* để trống */ }
  const bo = new Set(sinh);
  return deps.git.trackedPaths()
    .filter((f) => !f.includes("/") && !f.startsWith("."))
    .sort()
    .map((f) => ({ file: f, maySinh: bo.has(f) }));
}

/* Bảng "khi bạn sắp… thì mở file nào" của luật gốc. Đọc lại thay vì chép: chép là tạo một
   mục lục thứ hai, và mục lục thứ hai luôn mục trước mục lục thứ nhất. */
export function readOpenWhen(deps) {
  if (!deps.fileExists("AGENTS.md")) return [];
  let text;
  try { text = deps.readFile("AGENTS.md"); } catch { return []; }
  const out = [];
  let inside = false;
  for (const line of text.split(/\r?\n/)) {
    if (/^##\s+6\./.test(line)) { inside = true; continue; }
    if (inside && /^##\s/.test(line)) break;
    if (!inside || !line.startsWith(chr_pipe)) continue;
    const cells = line.split(chr_pipe).slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[: ]/g, "")) || /^Khi b/.test(cells[0])) continue;
    // Chỉ lấy đích ĐẦU TIÊN trong ô thứ hai. Phần văn xuôi sau nó là giải thích cho AI đọc,
    // dài và đầy mã lỗi — đúng thứ Đức nói không muốn thấy.
    const dich = /`([^`]+)`/.exec(cells[1]);
    if (!dich) continue;
    const target = dich[1].trim();
    out.push({
      when: shorten(cells[0], 84),
      target,
      laLenh: target.startsWith("node ")
    });
  }
  return out;
}
/* ===== TAB "AI ĐIỀU PHỐI" — ba khối, brief DASH-ORCH-01 (Đức chốt 04/09) ==================
 *
 * Ba nguồn, cả ba đọc từ HEAD như phần còn lại của trang. KHÔNG khối nào nhìn giờ đồng hồ.
 *
 * VÌ SAO BẢNG KHOÁ CHỈ NÓI BẬN/MỞ, KHÔNG NÓI AI GIỮ: Đức chốt vậy. Tên chủ đổi liên tục,
 * làm bảng mục, và Đức không cần nó để cân đối việc — cái cần biết là còn bao nhiêu chỗ
 * trống để giao việc song song. Giờ giữ và cờ "quá 6h" cũng KHÔNG chép sang đây: đó là
 * trạng thái sống, `what-next.mjs` đã lo, chép sang là đẻ ra nguồn sự thật thứ hai. */

/* Chỉ lấy đoạn cuối của khoá gói. Bất biến của trang cấm đường dẫn lọt ra ngoài khối bản đồ,
   mà khoá gói thì có dạng `<thư-mục>/<tên-gói>`. Cắt phần thư mục đi là đủ để Đức nhận ra
   khoá, mà không kéo một đường dẫn lên trang. */
export function tenKhoa(key) {
  const s = String(key ?? "");
  const i = s.lastIndexOf("/");
  return i === -1 ? s : s.slice(i + 1);
}

/* FAIL CLOSED, cùng lý lẽ với `readClaims` của bộ sinh kia: một bảng chủ sở hữu thiếu hoặc
   hỏng mà bị nuốt lỗi sẽ thành "không khoá nào bận" — tức Đức nhìn thấy sáu chỗ trống trong
   khi thật ra có người đang làm. Bảng nói dối êm ru tệ hơn bảng không sinh ra được. */
export function readKhoa(deps) {
  if (!deps.fileExists(".agents/claims.json")) {
    throw new Error("CLAIMS_THIEU_FILE: không thấy bảng chủ sở hữu. Không dựng khối khoá từ một bảng không tồn tại.");
  }
  let parsed;
  try { parsed = JSON.parse(deps.readFile(".agents/claims.json")); }
  catch (error) {
    throw new Error(`CLAIMS_HONG: bảng chủ sở hữu không phải JSON đọc được (${error.message}).`);
  }
  const claims = parsed?.claims;
  if (!claims || typeof claims !== "object" || Array.isArray(claims)) {
    throw new Error("CLAIMS_THIEU_KHOI: bảng chủ sở hữu không có khối `claims`.");
  }
  return Object.entries(claims).map(([key, value]) => ({
    ten: tenKhoa(key),
    ban: String(value?.owner ?? "").trim() !== ""
  }));
}

const MOC_FILE = "docs/protocols/ASSISTANT-V0.1.md";
const GACH_DAI = String.fromCharCode(8212);   // — dấu gạch dài, ngăn tên mốc với phần giải thích

const boDam = (s) => String(s ?? "").replaceAll("**", "").trim();

/* Ba mốc của gói Assistant. ĐỌC LẠI từ hồ sơ mốc, không chép — chép là bản thứ hai, và bản
   thứ hai luôn lệch (đã trả giá đúng bằng chuyện đó ở câu làm mới bảng, 03/09).
   Không đọc được thì NÉM: khối rỗng nghĩa là Đức nhìn một tab thiếu mất một phần ba mà không
   ai nói vì sao — đúng loại xanh giả mà trang này sinh ra để chặn. */
export function readMoc(deps) {
  if (!deps.fileExists(MOC_FILE)) {
    throw new Error("THIEU_MOC_ASSISTANT: không thấy hồ sơ mốc của gói Assistant. Khối mốc phải đọc được từ đó, không được gõ cứng ở đây.");
  }
  const text = deps.readFile(MOC_FILE);
  const bat = /^##\s+2\..*$/m.exec(text);
  if (!bat) {
    throw new Error("THIEU_MOC_ASSISTANT: hồ sơ mốc không còn mục \"## 2.\" — khối mốc lấy bảng trong mục đó.");
  }
  // CHẶN Ở MỤC KẾ. Cắt tới cuối file thì khi mục 2 mất bảng, nó lặng lẽ nhặt bảng của MỘT
  // MỤC KHÁC rồi trả về như thật — fail-open đội lốt fail-closed.
  const sau = text.slice(bat.index + bat[0].length);
  const het = /^##\s/m.exec(sau);
  const doan = het ? sau.slice(0, het.index) : sau;

  const rows = [];
  for (const line of doan.split(/\r?\n/)) {
    if (!line.startsWith(chr_pipe)) continue;
    const cells = line.split(chr_pipe).slice(1, -1).map((c) => c.trim());
    if (cells.length < 2) continue;
    if (/^-+$/.test(cells[0].replace(/[: ]/g, ""))) continue;   // dòng gạch ngăn của bảng
    rows.push(cells);
  }
  // Dòng đầu còn lại LUÔN là dòng tiêu đề của bảng markdown (tiêu đề → gạch ngăn → dữ liệu).
  // Bỏ nó theo CẤU TRÚC, không theo chữ trong ô — chữ đổi thì phép lọc theo chữ chết lặng.
  rows.shift();
  if (!rows.length) {
    throw new Error("THIEU_MOC_ASSISTANT: mục \"## 2.\" của hồ sơ mốc không còn dòng mốc nào.");
  }
  return rows.map((cells) => {
    const ten = boDam(cells[0]).split(GACH_DAI)[0].trim();
    // Bỏ ký tự trang trí đứng đầu ô trạng thái (dấu tick, đồng hồ cát, biển cấm) — giữ chữ.
    const trangThai = boDam(cells[1]).replace(/^[^\p{L}\p{N}]+/u, "").trim();
    return { ten, trangThai, bac: bacMoc(trangThai) };
  });
}

/* Màu của mốc suy từ chữ ĐẦU của trạng thái. Chữ lạ thì về màu trung tính — không đoán,
   vì đoán sai màu là một lời khẳng định sai mà Đức không có cách nào kiểm. */
export function bacMoc(trangThai) {
  const s = String(trangThai ?? "").toLowerCase();
  if (s.startsWith("xong")) return 2;
  if (s.startsWith("đang")) return 1;
  if (s.startsWith("khoá") || s.startsWith("khóa")) return 3;
  return 0;
}

const DEFECT_H1 = new RegExp("^#\\s+BRIEF\\s+`([^`]+)`\\s*" + GACH_DAI + "\\s*(.+)$", "m");

/* Defect của chính gói Assistant: mã · một câu triệu chứng · mở hay đóng.
 *
 * Máy đọc được ở HAI chỗ, và cả hai đều là trường có sẵn — không thêm trường mới:
 *   • mã + triệu chứng: dòng tiêu đề dạng "# BRIEF `MÃ` — triệu chứng". Brief phiên (S1…S7)
 *     không có mã trong nháy ngược nên tự rơi ra ngoài, không phải kê tay danh sách nào.
 *   • mở/đóng: trường `status:` ở frontmatter. `active` = còn mở; mọi giá trị khác (kể cả
 *     `parked`) = không còn là việc đang mở. Dò văn xuôi thì brief đã cấm, và đúng: cùng một
 *     brief có thể viết chữ "đóng" trong một câu kể mà `status:` vẫn là `active`. */
export function readDefects(deps) {
  let names;
  try { names = deps.listFiles("docs/briefs"); } catch { return []; }
  const out = [];
  for (const name of names) {
    if (!name.startsWith("BRIEF-") || !name.endsWith(".md")) continue;
    let text;
    try { text = deps.readFile(`docs/briefs/${name}`); } catch { continue; }
    const h1 = DEFECT_H1.exec(text);
    if (!h1) continue;
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
    const st = fm ? /^status:\s*(.+)$/m.exec(fm[1]) : null;
    out.push({
      ma: h1[1].trim(),
      trieuChung: shorten(h1[2].replace(/\*\*/g, "").trim(), 108),
      mo: String(st ? st[1] : "").trim() === "active"
    });
  }
  return out.sort((a, b) => a.ma.localeCompare(b.ma));
}

/* DẤU DÒNG KHOÁ — đây là cách khối 1 không làm tê cả repo.
 *
 * `DASHBOARD.html` nằm trong khối `generators`, nên cổng đóng phiên và `safe-push` so nó với
 * HEAD mỗi lượt. Bảng khoá là trạng thái sống: ĐO trên lịch sử thật, 146 trong 174 commit
 * chạm bảng chủ sở hữu làm ĐỔI vector bận/mở (69 lượt riêng ngày 02/09, 20 lượt ngày 04/09).
 * Bỏ tên chủ đi giảm được ít hơn nhiều so với hy vọng — nhận rồi trả là hai lượt lật.
 * Nên đi đường (b) của brief: lọc đúng những dòng đó khỏi phép so độ tươi, y hệt cách
 * `STAMP_PREFIX` được lọc trong bộ sinh kia. Đổi lại, trang PHẢI nói rõ khối đó là ảnh chụp
 * lúc sinh — và nó có nói. */
export const KHOA_PREFIX = "<!--khoa-->";

export function compareOverview(expected, actual) {
  const loc = (text) => String(text).replace(/\r\n?/g, "\n").split("\n")
    .filter((line) => !line.startsWith(KHOA_PREFIX));
  const a = loc(expected);
  const b = loc(actual);
  if (a.length !== b.length) return { matches: false };
  for (let i = 0; i < a.length; i += 1) if (a[i] !== b[i]) return { matches: false };
  return { matches: true };
}

const esc = (s) => String(s ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rail = (stage) => STAGES.map((label, i) =>
  `<div class="node${i === stage ? " on" : ""}${i < stage ? " past" : ""}">` +
  `<span class="dot"></span><span class="lbl">${esc(label)}</span></div>`).join("");

/* BA bước của một ý tưởng — CỐ Ý không phải bốn.
 *
 * `IDEAS.md` quy định đúng bốn bậc, nhưng bậc thứ tư (`nghỉ`) KHÔNG phải bước cuối của tiến
 * trình — nó là nhánh chết. Vẽ nó thành bước thứ tư thì thanh của một ý tưởng đã bị bác trông
 * y như một ý tưởng gần xong: hai bước đầu tô đầy, bước cuối đang sáng. Đó là bảng nói dối
 * đúng vào chỗ Đức đọc nhanh nhất.
 *
 * Nên: ba bước là đường đi thật (ý tưởng → đang xây → đã chứng minh), còn `nghỉ` được vẽ là
 * thanh RỖNG có gạch ngang, không tô bước nào. Nhãn bậc bằng chữ đi kèm ở cuối hàng — dấu
 * tròn là thứ nhìn thấy trước, chữ là thứ đọc để chắc.
 *
 * Ai thêm bậc thứ năm vào `IDEAS.md` thì `readIdeas` đã NÉM từ trước khi tới được đây. */
export const ROADMAP_STEPS = ["Ý TƯỞNG", "ĐANG XÂY", "ĐÃ CHỨNG MINH"];

export const stepBar = (stage) => {
  const chet = stage >= ROADMAP_STEPS.length;
  return `<div class="rms${chet ? " dead" : ""}">` + ROADMAP_STEPS.map((label, i) => {
    const cls = chet ? "" : (i === stage ? " on" : (i < stage ? " past" : ""));
    return `<div class="node${cls}"><span class="dot"></span></div>`;
  }).join("") + `</div>`;
};

/* Một hàng roadmap: tên có link nhảy sang tab Ý tưởng, thanh ba bước, rồi nhãn bậc bằng chữ. */
const roadmapRow = (idea) =>
  `        <div class="rmr"><a href="#y-${esc(slug(idea.code))}" data-goto="y-tuong">` +
  `${esc(idea.code)} · ${esc(idea.name)}</a>${stepBar(idea.stage)}${chip(idea.stage)}</div>`;

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
${/* DÒNG DƯỚI BẮT BUỘC PHẢI CÓ, và nó phải nằm SAU luật display ở trên.
     display:flex ở trên là luật của TÁC GIẢ, còn [hidden] → display:none là luật mặc định của
     TRÌNH DUYỆT — và luật tác giả thắng luật trình duyệt bất kể độ đặc hiệu. Thiếu dòng dưới
     thì đoạn JS cuối trang vẫn gán pane.hidden = true rất đúng, nhưng CSS bỏ qua, nên cả chín
     khung hiện chồng nhau và bấm tab không thấy gì đổi.

     Đó là bug DASH-TAB-01. Nó sống từ commit đầu tiên dựng 7 tab tới 04/09 mà không ai thấy,
     vì cả suite chỉ kiểm trang CÓ gì, không kiểm trang ẨN gì. Ghim đã thêm, ở khối 10b của
     tests/build-overview-smoke.mjs — một bộ suy cascade tí hon; gỡ dòng dưới là nó ĐỎ.

     Vì sao viết bằng ${/* … *\/ ""} chứ không phải ghi chú CSS: đây là ghi chú cho người sửa
     BỘ SINH, không phải cho Đức. Ghi chú CSS sẽ đi thẳng vào trang Đức mở, kèm cả đường dẫn
     file — mà luật của trang là không lộ đường dẫn. Cách này ship ra đúng một dòng trống. */
  ""}[role="tabpanel"][hidden]{display:none}

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

/* ROADMAP Ý TƯỞNG — mỗi ý tưởng MỘT hàng, mỗi hàng một thanh BA bước. Hình này do Đức chốt
   (DASH-ROADMAP-01): danh sách phẳng không nói được "đang ở bước nào".
   Bậc "nghỉ" KHÔNG vẽ thành bước thứ tư — xem ghi chú ở stepBar() trong file này.
   (Khối này nằm trong một template literal — đừng đặt dấu ngoặc ngược vào đây.) */
.rm{display:flex;flex-direction:column}
.rmr{display:grid;grid-template-columns:minmax(0,1fr) 208px 116px;gap:12px;align-items:center;
  padding:9px 0;border-bottom:1px solid var(--line)}
.rmr:last-child{border-bottom:0}
.rmr>a{color:var(--ink);font-weight:600;font-size:12.5px;text-decoration:none;
  border-bottom:1px solid var(--line-2)}
.rmr>a:hover{color:var(--accent);border-bottom-color:var(--accent)}
.rmh{border-bottom:1px solid var(--line-2);padding-bottom:6px}
.rmh>span{font-family:var(--mono);font-size:9px;font-weight:600;letter-spacing:.06em;
  text-transform:uppercase;color:var(--muted)}
.rms{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;position:relative}
.rml{font-family:var(--mono);font-size:8px;font-weight:600;letter-spacing:.02em;
  color:var(--muted);text-align:center;line-height:1.15}
/* Bậc "nghỉ": ba bước đều RỖNG, đổi sang màu dừng, và một đường gạch ngang cả thanh. Cố ý
   không tô bước nào — tô là làm nó trông "gần xong", đúng cái phải tránh. */
.rms.dead .dot{border-color:var(--off);background:var(--off-bg);border-style:dashed}
.rms.dead::after{content:"";position:absolute;top:5px;left:5%;right:5%;height:1px;
  background:var(--off);z-index:2}
@media (max-width:640px){
  .rmr{grid-template-columns:minmax(0,1fr) auto;gap:7px 10px}
  .rmr>.rms{grid-column:1 / -1}
  .rmh{display:none}
}

/* Khối bản đồ — nơi DUY NHẤT trên bảng được phép in đường dẫn. */
.map{display:flex;flex-direction:column;gap:13px}
.mono{font-family:var(--mono);font-size:12px;color:var(--ink)}
.tree{display:flex;flex-direction:column}
.tr{display:grid;grid-template-columns:1fr auto auto;gap:10px;padding:7px 0;
  border-bottom:1px solid var(--line);align-items:baseline}
.tr:last-child{border-bottom:none}
.tr .d{font-family:var(--mono);font-size:12.5px;font-weight:600;color:var(--ink)}
.tr .o{font-family:var(--mono);font-size:10px;letter-spacing:.05em;text-transform:uppercase;
  color:var(--muted);white-space:nowrap}
.tr .c{font-family:var(--mono);font-size:11px;color:var(--muted);white-space:nowrap;text-align:right}
.fl{display:flex;flex-wrap:wrap;gap:5px}
.fl span{font-family:var(--mono);font-size:11.5px;padding:3px 8px;border-radius:5px;
  background:var(--inset);border:1px solid var(--line);color:var(--ink)}
.fl span.g{background:var(--good-bg);border-color:var(--good);color:var(--good)}
.ow{display:grid;grid-template-columns:1fr auto;gap:10px;padding:6px 0;
  border-bottom:1px solid var(--line);align-items:baseline;font-size:13px}
.ow:last-child{border-bottom:none}
.ow .t{font-family:var(--mono);font-size:11.5px;color:var(--accent);white-space:nowrap}
@media (max-width:640px){.ow{grid-template-columns:1fr}.ow .t{white-space:normal}}
pre.cmd{background:var(--inset);border:1px solid var(--line-2);border-radius:8px;
  padding:11px 13px;margin:0;overflow-x:auto;font-family:var(--mono);font-size:12px;
  line-height:1.5;color:var(--ink);white-space:pre-wrap;word-break:break-word}
.hint{background:var(--good-bg);border-left:3px solid var(--good);border-radius:8px;
  padding:11px 14px;font-size:13.2px;color:var(--ink-2);line-height:1.5}
footer{text-align:center;font-size:12.5px;color:var(--muted);padding:6px 0 2px}

/* Tab AI điều phối — một dòng, một trạng thái. Không cột thứ ba: mọi thứ định thêm vào đây
   đều là trạng thái sống, và trang này không phải chỗ chứa trạng thái sống. */
.kr{display:grid;grid-template-columns:1fr auto;gap:10px;padding:8px 0;
  border-bottom:1px solid var(--line);align-items:baseline}
.kr:last-child{border-bottom:none}
.kr .n{font-family:var(--mono);font-size:12.5px;font-weight:600;color:var(--ink)}
.kr .n em{font-family:var(--sans);font-size:12.5px;font-style:normal;color:var(--muted);font-weight:400}
.badge{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.07em;
  padding:2px 8px;border-radius:3px;white-space:nowrap}
.badge.b0{background:var(--inset);color:var(--muted)}
.badge.b1{background:var(--warn-bg);color:var(--warn)}
.badge.b2{background:var(--good-bg);color:var(--good)}
.badge.b3{background:var(--off-bg);color:var(--off)}
</style>`;

const TABS = [
  ["tong-quan", "Tổng quan"],
  ["ai-dieu-phoi", "AI điều phối"],
  ["extension", "Extension"],
  ["y-tuong", "Ý tưởng"],
  ["van-hanh", "Vận hành"],
  ["suc-khoe", "Sức khoẻ & nợ"],
  ["cau-truc", "Cấu trúc"],
  ["nhat-ky", "Nhật ký"],
  ["tra-cuu", "Tra cứu"]
];

const chip = (stage) => `<span class="chip s${stage}">${esc(STAGES[stage])}</span>`;

const slug = (s) => String(s ?? "").toLowerCase()
  .replace(/[^a-z0-9]+/g, "-").replace(/^-+/, "").replace(/-+$/, "") || "x";

/* MỘT nơi duy nhất dựng id của đơn vị. Link ở bảng tổng và đích ở tab chi tiết PHẢI bằng nhau,
   nên chúng không được tự tính riêng — bản cũ tính ở hai chỗ, và hai chỗ thì sẽ có ngày lệch.

   Khoá là `key`, KHÔNG phải `id`: `id` không duy nhất. Hai bản Gemini (v0.1.0 và v0.2.0) cùng
   khai `id: duc-auto-gemini`, nên `slug(r.id)` sinh ra HAI thẻ cùng `id="ext-duc-auto-gemini"`.
   Đức bấm "Gemini (Platform)" thì trình duyệt nhảy vào thẻ ĐẦU TIÊN — bản v0.1.0 đã nghỉ.
   Đo 04/09: `key` duy nhất 5/5, `id` chỉ 4/5. GPT audit bắt được, phép kiểm cũ của tôi không:
   nó hỏi "id có tồn tại" chứ không hỏi "id có duy nhất". */
const unitId = (r) => `ext-${slug(r.key || r.id || r.name)}`;

/* Một dòng trong bảng tổng: tên có link nhảy sang tab chi tiết và tự mở toggle ở đó. */
const bigRow = (tab, id, name, stage, meta) =>
  `        <div class="br"><a href="#${esc(id)}" data-goto="${esc(tab)}">${esc(name)}</a>` +
  `${chip(stage)}<span class="meta">${esc(meta)}</span></div>`;

/* ĐỌC LẠI câu từ `PROMPTS.md`, không chép nó lần thứ hai.
 *
 * Bản cũ gõ cứng "sinh lại rồi ĐĂNG LẠI ARTIFACT" — đúng vào lúc bảng chỉ sống trên claude.ai.
 * Rồi 03/09 `DASHBOARD.html` vào repo, `PROMPTS.md` được sửa theo, còn chuỗi ở đây thì không.
 * Kết quả: trang bảo AI làm một đằng, sổ prompt bảo một nẻo, và trang là thứ AI đọc trước.
 * GPT audit bắt được 04/09.
 *
 * Chép là tạo bản thứ hai, và bản thứ hai luôn lệch. Nên đọc. Không tìm thấy thì NÉM — không
 * có câu dự phòng, vì một câu dự phòng âm thầm chính là con đường vừa đi vào lỗi này. */
export function readRefreshLine(deps) {
  const text = deps.readFile("PROMPTS.md");
  /* CHẶN Ở MỤC KẾ. Bản trước cắt từ mục 2 tới CUỐI FILE, nên khi mục 2 mất khối ```text nó
     lặng lẽ nhặt khối của MỘT MỤC KHÁC rồi trả về như thật — fail-open đội lốt fail-closed,
     đúng cái nó sinh ra để chặn. GPT audit vòng 2 bắt được 04/09. */
  const bat = /^##\s+2\..*$/m.exec(text);
  let block = null;
  if (bat) {
    const sau = text.slice(bat.index + bat[0].length);
    const het = /^##\s/m.exec(sau);
    block = /^```text\r?\n([^\r\n]+)/m.exec(het ? sau.slice(0, het.index) : sau);
  }
  if (!block) {
    throw new Error("THIEU_CAU_LAM_MOI: PROMPTS.md không còn mục \"## 2.\" kèm khối ```text. "
      + "Câu làm mới bảng phải đọc được từ đó, không được gõ cứng ở đây — gõ cứng là hai bản, "
      + "và hai bản thì sẽ lệch (đã lệch một lần 03/09).");
  }
  return block[1].trim();
}

export function buildOverview(deps, { title = "Trạng thái Duc Auto", today = Date.now() } = {}) {
  const model = collectModel(deps, { tolerant: true });
  const ideas = readIdeas(deps);
  const debt = debtByUnit(deps, model);
  const debtTotal = debt.reduce((sum, d) => sum + d.n, 0);
  const debtOf = new Map(debt.map((d) => [d.name, d.n]));
  const features = readFeatures(deps);
  const decisions = readDecisions(deps);
  const areas = readAreas(deps);
  const rootFiles = readRootFiles(deps);
  const openWhen = readOpenWhen(deps);
  const khoa = readKhoa(deps);
  const moc = readMoc(deps);
  const defects = readDefects(deps);
  const CAU_LAM_MOI = readRefreshLine(deps);

  const supersededCount = model.rows.filter((r) => r.lifecycle === "superseded").length;
  const decisionCount = decisions.total;

  /* So hai MỐC NGÀY, không so mốc thời điểm. Bản cũ lấy `Date.now()` (có giờ, phút) trừ
     nửa đêm UTC rồi làm tròn — sinh bảng sau trưa là ra "1 ngày trước" NGAY TRONG NGÀY SINH. */
  // `today: "head"` = suy mốc từ chính HEAD, để bản commit không nhìn đồng hồ. Xem ghi chú
  // dài ở `sinhTrang`: nội dung phụ thuộc giờ đồng hồ sẽ chặn push của MỌI phiên khi sang ngày.
  /* FAIL-CLOSED, không fail-open. Bản đầu viết `Date.parse(...) || Date.now()`, và cái `||` đó
     là một cửa hậu mở thẳng vào đúng tai nạn mà cả đoạn ghi chú trên vừa cảnh báo: mốc HEAD
     hỏng thì bản commit lặng lẽ quay lại nhìn đồng hồ, sang ngày là lệch HEAD, và `safe-push`
     chặn MỌI phiên dù không dữ liệu nào đổi. Người bị chặn sẽ không hiểu vì sao.

     Ném lỗi thì bộ sinh chết ngay tại chỗ, kèm tên nguyên nhân. Chết sớm và nói rõ tốt hơn
     xanh giả rồi làm tê cả repo vào hôm sau. GPT audit bắt được chỗ này 04/09. */
  let nowMs;
  if (today === "head") {
    nowMs = Date.parse(`${model.headDate}T00:00:00Z`);
    if (!Number.isFinite(nowMs)) {
      throw new Error(`MOC_HEAD_HONG: không đọc được ngày của HEAD (${JSON.stringify(model.headDate)}). `
        + "Bản commit PHẢI suy mốc từ HEAD, không được lùi về giờ đồng hồ — lùi là sang ngày "
        + "mai mọi phiên bị chặn push. Kiểm lại git log của HEAD.");
    }
  } else {
    nowMs = today;
  }
  const todayStamp = new Date(nowMs).toISOString().slice(0, 10);
  const stamp = model.headDate || todayStamp;
  const ageDays = Math.max(0, Math.round((Date.parse(todayStamp) - Date.parse(stamp)) / 86400000));

  /* KHÔNG có cờ "cũ" tính lúc sinh nữa — đã xoá 04/09, và nó là code chết chứ không phải bảo vệ.
     Cả HAI đường trong `main()` (ghi vào repo, và ghi ra file tạm) đều đi qua `sinhTrang`, mà
     hàm đó luôn truyền `today: "head"` → `ageDays` LUÔN bằng 0 → cờ luôn tắt. Dải đỏ ở bộ sinh
     chưa từng hiện ra một lần nào, nhưng có 4 phép kiểm xanh cho nó, nên nó trông như đang bảo
     vệ một thứ. Đó là loại xanh giả tệ nhất: nó làm người sau tin rằng bảng tự báo cũ.
     Việc báo cũ do đoạn JS cuối trang làm, tính lúc Đức MỞ trang — đúng chỗ, vì trang tĩnh
     không biết trước bao giờ có người mở. GPT audit 04/09 chỉ ra chỗ này. */

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
    <span>Sinh ngày ${esc(stamp)} · ${ageDays === 0 ? "hôm nay" : ageDays + " ngày trước"}</span>
    <span>Nguồn sự thật nằm trong repo</span>
  </div>
  <div class="cu" id="cu" data-sinh="${esc(stamp)}"></div>`);
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
      <div class="sect">Extension trong repo — bấm tên để xem chi tiết</div>
      <div class="big">`);
  for (const r of model.rows) {
    const n = debtOf.get(r.name);
    p.push(bigRow("extension", unitId(r), r.name, stageOf(r),
      n === undefined ? "extension" : `${n} việc nợ`));
  }
  p.push(`      </div>
      <p class="note">${model.rows.length} extension. Chi tiết ở tab <strong>Extension</strong>.</p>
    </div>

    <div class="card">
      <div class="sect">Ý tưởng đang ở bước nào — ${ideas.length} ý tưởng</div>
      <div class="rm">
        <div class="rmr rmh"><span>Ý tưởng</span><div class="rms">`);
  for (const label of ROADMAP_STEPS) p.push(`          <span class="rml">${esc(label)}</span>`);
  p.push(`        </div><span>Đang ở bậc</span></div>`);
  if (ideas.length) {
    for (const idea of ideas) p.push(roadmapRow(idea));
  } else {
    /* Sổ trống thì KHÔNG dựng link — link không có đích là lỗi âm thầm: Đức bấm, không có gì
       xảy ra. Phép kiểm link ghim đúng một link cho mỗi ý tưởng, nên hàng này phải trơ. */
    p.push(`        <div class="rmr"><span class="meta">Sổ ý tưởng đang trống.</span></div>`);
  }
  p.push(`      </div>
      <p class="note">Ba bước là đường đi thật của một ý tưởng. <strong>Nghỉ</strong> không phải bước thứ tư — ý tưởng đã nghỉ hiện thanh <strong>rỗng có gạch ngang</strong>, để không ai đọc nhầm là gần xong. Bấm tên để xem chi tiết ở tab <strong>Ý tưởng</strong>.</p>
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

  /* ===== TAB · AI ĐIỀU PHỐI — ba khối, không hơn (brief DASH-ORCH-01) ===== */
  p.push(`
  <div role="tabpanel" data-pane="ai-dieu-phoi" hidden>
    <div class="card">
      <div class="sect">Khoá làm việc — ${khoa.length} khoá</div>
      <div class="kl">`);
  for (const k of khoa) {
    p.push(`${KHOA_PREFIX}        <div class="kr"><span class="n">${esc(k.ten)}</span>` +
      `<span class="badge ${k.ban ? "b1" : "b2"}">${k.ban ? "BẬN" : "MỞ"}</span></div>`);
  }
  p.push(`      </div>
      <div class="hint" style="margin-top:11px">Đây là <strong>ảnh chụp lúc sinh bảng</strong>, không phải trạng thái thời gian thực — nó theo lần ghi gần nhất vào repo. Khoá <strong>MỞ</strong> là chỗ giao được việc mới ngay; khoá <strong>BẬN</strong> thì chỉ đọc, đừng giao thêm.</div>
      <p class="note">Bảng cố ý <strong>không nói ai đang giữ</strong>, cũng không nói giữ bao lâu. Đức cần biết còn mấy chỗ trống để giao việc song song, chứ không cần tên phiên — tên phiên đổi liên tục và làm bảng mục ngay. Muốn biết ai giữ thì hỏi tôi, tôi tra bảng chủ sở hữu. Khoá của một gói hiện theo tên gói, đã bỏ phần thư mục cho gọn.</p>
    </div>

    <div class="card">
      <div class="sect">Gói Assistant đang ở mốc nào</div>
      <div class="kl">`);
  for (const m of moc) {
    p.push(`        <div class="kr"><span class="n">${esc(m.ten)}</span>` +
      `<span class="badge b${m.bac}">${esc(m.trangThai)}</span></div>`);
  }
  p.push(`      </div>
      <p class="note">Ba mốc đọc lại từ hồ sơ mốc của gói, không gõ tay ở đây — nên bảng không thể nói khác hồ sơ.</p>
    </div>

    <div class="card">
      <div class="sect">Sai lệch đã ghi nhận của chính tôi — ${defects.length} mục</div>
      <div class="kl">`);
  if (defects.length) {
    for (const d of defects) {
      p.push(`        <div class="kr"><span class="n">${esc(d.ma)} <em>${esc(d.trieuChung)}</em></span>` +
        `<span class="badge ${d.mo ? "b1" : "b0"}">${d.mo ? "MỞ" : "ĐÓNG"}</span></div>`);
    }
  } else {
    p.push(`        <div class="kr"><span class="n">Chưa ghi nhận sai lệch nào</span><span class="badge b2">SẠCH</span></div>`);
  }
  p.push(`      </div>
      <p class="note">Đây là lỗi của <strong>chính cách tôi làm việc</strong>, không phải lỗi của extension nào. Trạng thái lấy từ trường máy đọc được trong từng đề bài, không dò văn xuôi. <strong>ĐÓNG</strong> gồm cả đề bài đã hoãn.</p>
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
    p.push(`      <details class="the" id="${unitId(r)}">
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
      <p class="note">Bảng <strong>được commit vào repo</strong>, có chủ đích: nhờ vậy bất kỳ AI nào cũng sinh lại rồi commit được, không phải nhờ riêng một AI đăng hộ. Cổng đóng phiên so bảng đã commit với trạng thái repo mỗi phiên, nên bảng <strong>không thể âm thầm cũ</strong>. Nội dung bảng suy hoàn toàn từ lần commit gần nhất, không nhìn giờ đồng hồ — nếu nó nhìn đồng hồ thì sang ngày là mọi phiên bị chặn đẩy việc lên dù không dữ liệu nào đổi.</p>
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

  /* ===== TAB 6 · CẤU TRÚC — khối duy nhất được in đường dẫn ===== */
  p.push(`
  <div role="tabpanel" data-pane="cau-truc" hidden>
    <div class="map">
      <div class="card">
        <div class="sect">Thư mục ở tầng ngoài cùng — ${areas.length} vùng</div>
        <div class="tree">`);
  for (const a of areas) {
    const chu = a.steward === null ? "từng gói tự giữ" : a.steward;
    p.push(`          <div class="tr"><span class="d">${esc(a.dir)}</span>` +
      `<span class="o">${esc(chu)}</span><span class="c">${a.files} file</span></div>`);
  }
  p.push(`        </div>
        <p class="note">Cột giữa là <strong>ai được ghi vào đó</strong>. Một vùng chỉ một AI được ghi tại một thời điểm; vùng của người khác thì chỉ được đọc. <code class="mono">workers/</code> không có chủ chung — từng gói extension tự giữ riêng.</p>
      </div>

      <div class="card">
        <div class="sect">File ở gốc repo — ${rootFiles.length} file</div>
        <div class="fl">`);
  for (const f of rootFiles) {
    p.push(`          <span class="${f.maySinh ? "g" : ""}">${esc(f.file)}</span>`);
  }
  p.push(`        </div>
        <p class="note">Ô <strong>xanh</strong> là file <strong>máy sinh</strong> — đừng sửa tay, sửa là mất ở lần sinh sau. Số còn lại là chữ của người.</p>
      </div>

      <div class="card">
        <div class="sect">Khi cần gì thì mở file nào — ${openWhen.length} lối</div>`);
  for (const r of openWhen) {
    p.push(`        <div class="ow"><span>${esc(r.when)}</span>` +
      `<span class="t">${esc(r.target)}</span></div>`);
  }
  p.push(`        <p class="note">Bảng này <strong>đọc lại từ luật gốc</strong>, không phải bản chép — nên nó không thể nói khác luật. Dòng có lệnh là việc chạy được, không phải file để mở.</p>
      </div>
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
      decisions: decisionCount, superseded: supersededCount, stamp, ageDays
    }
  };
}


export const TRANG_FILE = "DASHBOARD.html";

/* MỐC THỜI GIAN CỦA BẢN COMMIT SUY TỪ HEAD, KHÔNG TỪ ĐỒNG HỒ.
 *
 * Vì sao đây là chỗ dễ làm hỏng cả repo: `DASHBOARD.html` nay nằm trong khối `generators`,
 * nên cổng chạy `--check-head` mỗi phiên và `safe-push` TỪ CHỐI ĐẨY khi nó lệch. Nếu nội
 * dung file phụ thuộc giờ đồng hồ (dòng "hôm nay" / "N ngày trước") thì sang ngày mới là
 * nó lệch HEAD **dù không một dữ liệu nào đổi** — và mọi phiên khác bị chặn push chỉ vì một
 * ngày đã qua. Đó là tự bắn vào chân cả repo.
 *
 * Nên bản commit lấy `today` = chính mốc ngày của HEAD: `ageDays` luôn 0, chữ luôn là
 * "hôm nay", và output suy hoàn toàn từ HEAD. Việc BÁO CŨ không mất đi — nó do đoạn JS
 * trong trang tự tính lúc Đức MỞ trang, từ `data-sinh`. Đúng chỗ hơn: một trang tĩnh không
 * biết trước bao giờ có người mở nó. */
export function sinhTrang(deps) {
  // `today: "head"` chu khong phai mot con so tinh truoc: tinh truoc thi phai goi
  // collectModel MOT LAN NUA chi de lay mot ngay, va do la ca mot luot doc 59 tai lieu.
  // Ban dau lam the va suite chay qua 120 giay.
  return buildOverview(deps, { title: path.basename(ROOT), today: "head" });
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes("--check-head")) {
    // Sinh TỪ HEAD rồi so với chính bản đã commit. Không đọc đĩa: đĩa có thể đang sửa dở,
    // và cổng hỏi một câu về HEAD chứ không về thư mục làm việc.
    const deps = createHeadDeps(ROOT);
    let dangCo;
    try { dangCo = deps.readFile(TRANG_FILE); }
    catch {
      console.error(`THIEU_TRANG: ${TRANG_FILE} chưa có trong HEAD. Sinh lại rồi commit:`);
      console.error(`  node scripts/build-overview.mjs`);
      process.exit(1);
    }
    const { html } = sinhTrang(deps);
    if (!compareOverview(html, dangCo).matches) {
      console.error(`TRANG_CU: ${TRANG_FILE} đã commit không khớp với HEAD. Sinh lại rồi commit:`);
      console.error(`  node scripts/build-overview.mjs`);
      process.exit(1);
    }
    console.log(`${TRANG_FILE} khớp với HEAD.`);
    process.exit(0);
  }

  // Không đưa đường dẫn thì ghi vào bản chuẩn của repo. Có đưa thì ghi ra đó — dùng khi
  // muốn xem thử mà không chạm file trong repo.
  const out = args.find((a) => !a.startsWith("--")) || path.join(ROOT, TRANG_FILE);
  const { html, stats } = sinhTrang(createDefaultDeps(ROOT));
  // GHI VÔ ĐIỀU KIỆN, và đây là chỗ khác với bộ sinh kia — có lý do, không phải bỏ sót.
  // Bộ sinh kia bỏ qua lượt ghi khi chỉ có DẤU SINH TRANG đổi, vì dấu đó là tạp âm.
  // Dòng khoá thì ngược lại: nó là NỘI DUNG Đức đọc. Bỏ qua lượt ghi ở đây nghĩa là bảng
  // cứ hiện bận/mở của hôm kia cho tới khi tình cờ có thứ khác đổi — khối 1 thành một lời
  // nói dối êm ru. Nên phép LỌC chỉ đặt ở phía SO (để cổng không chặn oan ai), không đặt ở
  // phía GHI.
  fs.writeFileSync(out, html, "utf8");
  console.log(`Đã sinh ${out}`);
  console.log(`  ý tưởng: ${stats.ideas} · extension: ${stats.extensions} · nợ kỹ thuật: ${stats.debt} · quyết định: ${stats.decisions} · đã thay thế: ${stats.superseded}`);
  console.log(`  mốc HEAD ${stats.stamp} — báo cũ do trang tự tính lúc mở`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === MODULE_FILE) main();

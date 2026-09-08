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

/* SỔ NỢ Ở GỐC REPO CŨNG LÀ MỘT SỔ NỢ (N-03, vá 06/09).
 *
 * Bộ lọc cũ viết `p.endsWith("/BACKLOG.md")` — dấu `/` ở đầu làm nó chỉ thấy sổ nợ CỦA GÓI.
 * Ngày 06/09 mười bốn mục dời từ `IDEAS.md` sang `BACKLOG.md` ở gốc repo và cả mười bốn biến
 * mất khỏi bảng: 19 ý tưởng trước khi tách, 5 sau, không mục nào được đóng. Bảng làm repo
 * trông NHẸ ĐI 14 việc — loại số sai nguy hiểm nhất, vì Đức đọc bảng để ra quyết định. */
const LA_SO_GOC = (p) => p === "BACKLOG.md";
export const NHAN_SO_GOC = "nợ hạ tầng repo";

/* CỬA RA CỦA SỔ GỐC LÀ MỘT DÒNG THÊM Ở CUỐI, không phải sửa khối cũ.
 * Luật mục 4 của chính sổ đó: đóng một mục = thêm `- **ĐÓNG N-xx** · ...` ở cuối file, để cửa
 * ra rẻ ngang cửa vào (thêm ở cuối thì miễn khoá `_root`, sửa dòng cũ thì không). Bảng không
 * đọc dòng đó thì số nợ chỉ biết tăng, không bao giờ giảm. `\d+` cố ý: bản mẫu viết `N-xx`
 * nằm trong khối mã của sổ và KHÔNG được tính là một lần đóng thật. */
const DONG_DA_DONG = /^-\s+\*\*ĐÓNG\s+([A-Z]{1,3}-\d+)\*\*/;

/* VÀ SỔ GỐC KHÔNG DÙNG DẤU ĐÓNG TRONG TIÊU ĐỀ — cố ý tắt `isDone` cho riêng nó.
 *
 * Sổ của gói viết trạng thái vào chính tiêu đề (`**XONG 02/09**`), nên `isDone` là đúng ở đó.
 * Sổ gốc thì luật mục 4 cấm sửa khối cũ, nên tiêu đề của nó KHÔNG BAO GIỜ mang dấu đóng —
 * dấu đóng duy nhất là dòng `ĐÓNG` thêm ở cuối. Đọc tiêu đề của sổ gốc bằng `isDone` là hỏi
 * sai câu, và nó đã trả lời sai ngay lần đo đầu tiên: `N-02` mang tên *"Đóng một mục là thêm
 * dòng, nhưng chưa có gì gấp sổ lại…"* — một việc ĐANG MỞ, bị đếm là đã đóng chỉ vì tiêu đề
 * mở đầu bằng chữ "Đóng". Bảng in 16 trong khi sổ có 17.
 *
 * Đây đúng cái bẫy mà chú thích của `isDone` đã cảnh báo: đừng đọc trạng thái từ văn xuôi khi
 * có một trường khai thẳng. `~~gạch ngang~~` vẫn tính, vì nó là dấu hình thức, không phải chữ. */
const dungDauDeLamDauDong = (relPath) => !LA_SO_GOC(relPath);

/* HÌNH DẠNG MỘT MỤC TRONG SỔ — MỘT bản, hai chỗ dùng.
 *
 * Hai chỗ đọc cùng một cuốn sổ: bộ đếm nợ ở đây, và bộ tra mã việc của khối "đang làm gì".
 * Trước đây hai chỗ sẽ là hai bản biểu thức, và hai bản của một luật thì sớm muộn trả hai câu
 * khác nhau cho cùng một dòng — đúng cái đã xảy ra với danh sách miễn khoá ngày 02/09.
 *
 * `\d+` cố ý: bản mẫu trong luật của sổ viết `## N-xx`, và nó KHÔNG phải một mục thật. */
export const MUC_TIEU_DE = /^#{2,4}\s+(~~)?\s*([A-Z]{1,3}-\d+)\s*[·:.\-]\s*(.+)$/;
export const MUC_GACH_DAU = /^-\s+\*\*([A-Z]{1,3}-\d+)\*\*\s*[·:.\-]\s*(.+)$/;
/* Trường của một mục: `- **nhóm:** bang`. Cùng dạng với trường của sổ ý tưởng. */
const MUC_TRUONG = /^-\s+\*\*([^:*]+):\*\*\s*(.+)$/;

export function debtByUnit(deps, model) {
  const rows = [];
  for (const relPath of deps.git.trackedPaths().filter((p) => LA_SO_GOC(p) || p.endsWith("/BACKLOG.md")).sort()) {
    let text;
    try { text = deps.readFile(relPath); } catch { continue; }
    const lines = text.split(/\r?\n/);
    const daDong = new Set();
    for (const line of lines) {
      const m = DONG_DA_DONG.exec(line);
      if (m) daDong.add(m[1]);
    }
    let open = 0;
    for (const line of lines) {
      const heading = MUC_TIEU_DE.exec(line);
      const bullet = MUC_GACH_DAU.exec(line);
      if (!heading && !bullet) continue;
      const title = heading ? heading[3] : bullet[2];
      if (Boolean(heading && heading[1]) || /~~/.test(title)) continue;
      if (dungDauDeLamDauDong(relPath) && isDone(title)) continue;
      if (daDong.has(heading ? heading[2] : bullet[1])) continue;
      open += 1;
    }
    if (LA_SO_GOC(relPath)) { rows.push({ name: NHAN_SO_GOC, n: open }); continue; }
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

/* MỘT chỗ duy nhất trả lời "đơn vị này có việc đang chờ Đức không".
   BA chỗ hỏi cùng câu này: ô "Đức cần làm" ở tab Tổng quan, vùng CẦN ĐỨC và huy hiệu ở vùng
   CÔNG VIỆC HIỆN TẠI của tab AI điều phối. Ba bản sao thì sẽ có ngày một vùng đếm 4 việc,
   vùng kia đếm 3, và Đức không có cách nào biết bên nào đúng. */
export const coViecDuc = (row) => {
  const s = String(row?.humanAction ?? "").trim();
  return Boolean(s) && s.toLowerCase() !== "không";
};

/* Đơn vị đã nghỉ hưu KHÔNG chờ Đức nữa, dù trường cũ còn chữ trong đó — nó ra khỏi cuộc đua
   rồi. Tách riêng khỏi `coViecDuc` để tên hàm không nói dối: `coViecDuc` trả lời về TRƯỜNG,
   `choDuc` trả lời về ĐƠN VỊ. */
export const choDuc = (row) => !RETIRED_LIFECYCLES.has(row?.lifecycle) && coViecDuc(row);

export function humanWork(rows) {
  const live = rows.filter((r) => !RETIRED_LIFECYCLES.has(r.lifecycle));
  // CẮT KHOẢNG TRẮNG TRƯỚC khi phân loại. Bản đầu lọc trên chuỗi thô, nên một trường khai
  // toàn dấu cách bị đếm CẢ là việc thật CẢ là chưa khai — cùng một đơn vị nằm ở hai nhóm
  // loại trừ nhau. Lược đồ đã chặn ca này, nhưng hàm hiển thị vẫn phải tự đúng.
  /* `statusPath` đi kèm để khối `needs-duc` biết dòng này đến từ hồ sơ NÀO. Cần đúng một
     việc: hồ sơ nào TỰ NÓ đã mang dấu `@Đức` thì dòng `human_action` của nó là bản chép của
     dòng vừa hiện, và chỉ ca đó mới được bỏ. Không có trường này thì phép bỏ trùng phải đoán
     theo văn xuôi — mà đoán ở đây là làm mất một việc thật của Đức. */
  const actions = live.filter(coViecDuc)
    .map((r) => ({ unit: r.name, what: String(r.humanAction).trim(), statusPath: r.statusPath || "" }));
  const undeclared = live.filter((r) => !String(r.humanAction ?? "").trim()).length;
  return { actions, undeclared };
}

/* Đơn vị đã nghỉ, theo cùng cách `stageOf` tô bậc "NGHỈ / THAY THẾ". Ba giá trị, không hai:
   `paused` cũng là nghỉ, và nếu ở đây chỉ có hai giá trị thì một đơn vị `paused` sẽ mang
   huy hiệu ĐANG CHẠY trong khi thanh bậc ở tab Tổng quan vẽ nó là đã nghỉ. */
export const NGHI_LIFECYCLES = new Set(["superseded", "archived", "paused"]);

/* TRẠNG THÁI MỘT LUỒNG — suy ra, không khai tay. Đúng BA giá trị (brief DASH-ORCH-V2 mục 2).
   `BLOCKED` và `CHỜ EVIDENCE` cố ý CHƯA làm: hôm nay repo không có trường nào phân biệt được
   chúng với ĐANG CHẠY, và dò văn xuôi `next_step` để đoán là đúng cái đã cho kết luận sai
   bốn lần trong một ngày ở bảng đối chiếu hai nhánh.
   `human_action` THẮNG `lifecycle`: một đơn vị đang chạy mà có việc chờ Đức thì thứ Đức cần
   thấy là "chờ tôi", không phải "đang chạy". */
export function trangThaiDonVi(row) {
  if (choDuc(row)) return { chu: "CHỜ ĐỨC", bac: 1 };
  if (NGHI_LIFECYCLES.has(row?.lifecycle)) return { chu: "XONG", bac: 0 };
  return { chu: "ĐANG CHẠY", bac: 2 };
}

/* CHỨNG MINH CŨ — defect 4 của đề bài `CONTENT-TRUTH-01` (Đức chốt 04/09).
 *
 * Chip `ĐÃ CHỨNG MINH` nói đúng một thứ: có một lần kiểm chứng live đã xảy ra. Nó KHÔNG nói bản
 * đang chạy là bản đã được kiểm chứng — và Đức hợp lý mà hiểu theo nghĩa thứ hai. Đo 04/09:
 * hai đơn vị mang chip đó có bằng chứng thuộc bản cũ hơn 23 và 14 commit, và trang Đức đọc không
 * có một chỗ nào nói con số đó. Đức là người chốt việc chạy pilot thật — quyết định ấy dựa
 * trên niềm tin sai về độ tươi của bằng chứng là rủi ro thật.
 *
 * DỮ LIỆU ĐÃ CÓ SẴN, không nối thêm nguồn nào: `changedCount` nằm ngay trên row của cùng mô hình
 * mà bộ sinh đang dùng. Đức nói thẳng: KHÔNG mở thành một hệ xuất xứ mới.
 *
 * Hai điều kiện, phải ĐỦ CẢ HAI. Chưa từng khai kiểm chứng thì không có khoảng cách nào để nói,
 * và chip của nó vốn đã không phải `ĐÃ CHỨNG MINH`; `changedCount = 0` thì bằng chứng đúng là của
 * bản đang chạy. Vẽ cảnh báo cho hai ca đó là bịa — và bịa cảnh báo làm mòn chính cảnh báo. */
export function chungMinhCu(row) {
  const moc = String(row?.lastVerified ?? "").trim();
  const n = Number(row?.changedCount);
  if (!moc || !Number.isFinite(n) || n <= 0) return "";
  return `CHỨNG MINH CŨ · CẦN KIỂM LẠI — bằng chứng thuộc bản cũ hơn ${n} commit`;
}

/* ẢNH HƯỞNG NẾU CHƯA LÀM — trường TUỲ CHỌN `blocked_if_skipped` trong hồ sơ trạng thái.
   Vắng thì trả chuỗi rỗng và vùng CẦN ĐỨC không vẽ gì thêm: không bịa, cũng không để một
   chỗ trống trông như lỗi. Hôm nay trường này vắng ở cả bốn đơn vị — đó là trạng thái BÌNH
   THƯỜNG, không phải thiếu dữ liệu. Thêm trường là việc của chủ gói, không phải của bảng. */
export function truongTuyChon(deps, row, ten) {
  const file = row?.statusPath;
  if (!file) return "";
  let text;
  try { text = deps.readFile(file); } catch { return ""; }
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!fm) return "";
  const hit = new RegExp("^" + ten + ":[ \t]*(.+)$", "m").exec(fm[1]);
  if (!hit) return "";
  return hit[1].trim().replace(/^["']/, "").replace(/["']$/, "").trim();
}

/* Giữ nguyên tên cũ cho chỗ gọi cũ: đổi tên một hàm đang chạy tốt chỉ để cho gọn là một lượt
 * sửa không mang lại gì mà vẫn có thể làm vỡ một phép ghim. */
export function blockedIfSkipped(deps, row) {
  return truongTuyChon(deps, row, "blocked_if_skipped");
}

/* ===================== KHỐI "CẦN ĐỨC" — SUY TỪ DẤU TRONG SỔ =====================
 *
 * Đề bài `BANG-CAN-DUC-01` (Đức chốt 06/09). Bản cũ đọc ĐÚNG MỘT trường `human_action` trong
 * mỗi hồ sơ trạng thái, và bốn chỗ hỏng của nó đều là hỏng thiết kế:
 *   ⑴ số dòng = số hồ sơ (4), nên việc thứ năm không có chỗ chứa;
 *   ⑵ chữ gõ tay thì mục — bảng còn hỏi lại một câu Đức đã chốt sáng cùng ngày;
 *   ⑶ trộn việc BẤM (30 giây) với việc CHỐT (cần nghĩ), xếp chung thì trông như nhau;
 *   ⑷ việc chờ Đức thật thì nằm trong sổ nợ và sổ ý tưởng, không có đường lên bảng.
 *
 * DẤU LÀ HỢP ĐỒNG DỮ LIỆU, không phải bản vá. Người viết sổ đặt nó ngay trên DÒNG CỦA MỤC:
 *
 *     @Đức:bấm          việc bấm tay — nạp lại tiện ích, chạy một lượt nghiệm thu
 *     @Đức:chốt         việc cần Đức nghĩ — đổi luật, thêm quyền, chọn phạm vi
 *     @Đức:chốt(MÃ)     kèm mã đề bài, để bảng nói được "chốt xong thì mở khoá chuỗi nào"
 *
 * Viết không dấu (`@Duc:chot`) cũng nhận — người gõ vội không phải nhớ bỏ dấu ở đâu.
 *
 * BA TÍNH CHẤT, và cả ba là lý do dấu nằm TRÊN DÒNG CỦA MỤC chứ không ở một trường riêng:
 *   · **Không cần đọc tài liệu để đặt.** Nhìn tên khối trên bảng là đoán ra cách viết.
 *   · **Đóng mục thì dấu đi theo.** Gạch ngang mục, hoặc mở đầu bằng `XONG`, hoặc xoá hẳn
 *     dòng — cả ba đều làm mục rời bảng mà không ai phải nhớ đi xoá dấu. Đây là ràng buộc
 *     Đức nêu thẳng, và nó là thứ giết bản cũ: một trường riêng thì phải nhớ dọn.
 *   · **Không có sổ mới.** Ba sổ đã có sẵn (`BACKLOG.md` · `IDEAS.md` · `STATUS.md`) là nguồn
 *     duy nhất. Đẻ thêm một "danh sách chuỗi việc" nuôi bằng tay là tái phát đúng bệnh trên.
 */
export const SO_CAN_DUC = ["BACKLOG.md", "IDEAS.md", "STATUS.md"];

/* Một biểu thức, một dòng. KHÔNG dùng `\b`: ở repo này `\b` không bao giờ khớp cạnh `Đ`/`ế`
   nên biểu thức im lặng khớp rỗng — đã cắn hai lần trong một giờ. Cờ `u` để `Đ` ↔ `đ` khớp
   đúng dưới cờ `i`. */
export const DAU_CAN_DUC = new RegExp(
  "@(?:Đức|Duc)\\s*:\\s*(chốt|chot|bấm|bam)(?:\\s*\\(\\s*([^)]*?)\\s*\\))?", "iu");

/* MỤC ĐÃ ĐÓNG THÌ DẤU HẾT HIỆU LỰC. Dùng lại đúng `isDone` mà sổ nợ đang dùng, cộng dấu gạch
   ngang — hai cách đóng mục duy nhất đang chạy thật trong repo. Có bản sao thứ hai của luật
   "thế nào là đóng" thì sớm muộn hai bản trả hai câu khác nhau cho cùng một dòng. */
export function canDucDaDong(line) {
  const s = String(line ?? "");
  if (s.includes("~~")) return true;
  const t = s.replace(/^\s*#{1,6}\s*/, "").replace(/^\s*[-*+]\s*/, "")
    .replace(/^\*\*([A-Z]{1,3}-\d+)\*\*\s*[·:.\-]\s*/, "")
    .replace(/^([A-Z]{1,3}-\d+)\s*[·:.\-]\s*/, "").trim();
  return isDone(t);
}

/* KHOẢNG NGÀY GIỮA HAI MỐC GIT. Cả hai đầu vào đều là ngày commit, nên hàm này không đọc đồng
   hồ hệ thống — đó là toàn bộ lý do nó tồn tại thay vì một phép trừ `Date.now()`. */
export function khoangNgay(sau, truoc) {
  const ms = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d ?? "").trim());
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : NaN;
  };
  const a = ms(sau); const b = ms(truoc);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((a - b) / 86400000));
}

/* Tên chuỗi việc của một mục KHÔNG khai mã: suy từ chỗ mục nằm, không hỏi ai.
   Sổ ở gốc repo thì chuỗi là việc chung; sổ trong một gói thì chuỗi là gói đó. */
function chuoiTheoCho(relPath, model) {
  const key = relPath.replace(/\/[^/]+$/, "");
  if (!relPath.includes("/")) return "Việc chung của cả repo";
  const found = model?.rows?.find((r) => r.key === key);
  return found ? found.name : key.split("/").slice(-2, -1)[0];
}

/* Quét ba sổ, trả về danh sách mục có dấu. TẤT ĐỊNH: đường dẫn đã sắp, dòng đọc theo thứ tự.
 *
 * KHÔNG NÉM khi mã chuỗi không tra được. Cả ba sổ này lane nào cũng ghi, nên ném ở đây là một
 * lỗi gõ trong sổ nợ của một gói chặn cổng đóng phiên của MỌI lane. Thay vào đó mục vẫn lên
 * bảng, kèm chữ nói rõ mã đó không tra được — hiện ra để sửa, không chặn để phạt. */
export function readCanDuc(deps, model) {
  if (typeof deps?.git?.lineDate !== "function") {
    throw new Error("THIEU_LINE_DATE: bộ đọc không có `git.lineDate`, nên không đo được mục treo"
      + " bao lâu. Không được rơi về đồng hồ hệ thống — đó là cách bảng bắt đầu phụ thuộc giờ chạy.");
  }
  const brief = new Map(readDefects(deps).map((d) => [d.ma.toLowerCase(), d]));
  const mocHead = deps.git.headDate();
  const out = [];
  const files = deps.git.trackedPaths()
    .filter((p) => SO_CAN_DUC.includes(p.split("/").pop()))
    .sort();
  for (const rel of files) {
    let text;
    try { text = deps.readFile(rel); } catch { continue; }
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      const hit = DAU_CAN_DUC.exec(line);
      if (!hit) continue;
      if (canDucDaDong(line)) continue;
      const loai = /^ch/i.test(hit[1]) ? "CHỐT" : "BẤM";
      const ma = String(hit[2] ?? "").trim();
      const d = ma ? brief.get(ma.toLowerCase()) : null;
      const viec = shorten(line.replace(DAU_CAN_DUC, " ")
        .replace(/^\s*#{1,6}\s*/, "").replace(/^\s*[-*+]\s*/, "").trim(), 150);
      out.push({
        loai,
        viec: viec || "mục có dấu nhưng không có chữ mô tả",
        chuoi: d ? d.trieuChung : (ma || chuoiTheoCho(rel, model)),
        khaiChuoi: Boolean(ma),
        chuoiLa: Boolean(ma) && !d,
        chuoiDong: Boolean(d) && !d.mo,
        treo: khoangNgay(mocHead, deps.git.lineDate(rel, i + 1)),
        /* Trường TUỲ CHỌN `blocked_if_skipped` chỉ sống trong hồ sơ trạng thái, nên chỉ mục
           nằm trong hồ sơ đó mới có dòng "Chưa làm thì". Vắng thì để trơ — không bịa, cũng
           không để một chỗ trống trông như lỗi. */
        chan: rel.endsWith("STATUS.md") ? blockedIfSkipped(deps, { statusPath: rel }) : "",
        nguon: rel
      });
    }
  }
  /* Chuỗi xếp theo tên; trong một chuỗi thì BẤM trước CHỐT — cụm bấm gom được thành một buổi,
     nên để nó lên trên là để Đức đóng cả cụm rồi mới ngồi nghĩ. Rồi tới đường dẫn nguồn để
     hai lượt sinh trên cùng HEAD không bao giờ đảo thứ tự. */
  const thuTuLoai = (l) => (l === "BẤM" ? 0 : 1);
  return out.sort((a, b) => a.chuoi.localeCompare(b.chuoi, "vi")
    || thuTuLoai(a.loai) - thuTuLoai(b.loai)
    || a.nguon.localeCompare(b.nguon)
    || a.viec.localeCompare(b.viec, "vi"));
}

/* GATE TIẾP THEO — câu ĐẦU của `next_step`, không phải cả trường.
   Bản đầy đủ đã có ở tab Extension; dòng này chỉ là mồi để bấm sang. Cắt ở dấu chấm hoặc
   dấu gạch dài, tuỳ cái nào tới trước. Chạy qua bộ rút gọn trước để đường dẫn và nhãn kỹ
   thuật bị cắt — trang này cấm in đường dẫn. */
export const GATE_MIN = 28;

export function gateNext(text, max = 110) {
  const s = shorten(text, 100000);
  if (!s) return "";
  const boCham = (x) => x.replace(/[.,;:]+$/, "").trim();
  const catTai = (dau) => {
    let i = -1;
    for (const d of dau) {
      const j = s.indexOf(d);
      if (j > 0 && (i === -1 || j < i)) i = j;
    }
    return i === -1 ? s : s.slice(0, i);
  };
  const nguyen = boCham(s);
  let out = boCham(catTai([". ", `${GACH_DAI} `]));
  /* MỘT NGOẠI LỆ SO VỚI ĐỀ BÀI, khai ra ở đây để Đức bác được nếu không đồng ý.
     Đề bài nói cắt ở dấu chấm HOẶC dấu gạch dài, tuỳ cái nào tới trước. Đo trên hồ sơ thật
     hôm nay: đơn vị hạng 1 khai việc kế mở đầu bằng "F-25 bước ③ — CẦN ĐỨC CHỐT: …", nên
     luật đó cắt ra đúng bốn chữ "F-25 bước ③" — Đức đọc không hiểu gì, và luật vàng 5 nói
     Đức đọc không hiểu là lỗi hệ thống. Nên: cắt theo đề bài trước; ra một mẩu quá ngắn để
     thành câu thì bỏ dấu gạch dài, cắt lại ở dấu chấm. Không đoán, không dò nghĩa văn xuôi —
     chỉ là chọn dấu ngắt khác trên cùng một câu. */
  if (out.length < GATE_MIN) out = boCham(catTai([". "]));
  if (out.length > max) {
    const tho = out.slice(0, max);
    const cho = tho.lastIndexOf(" ");
    out = (cho > max * 0.5 ? tho.slice(0, cho) : tho).trim();
  }
  // Dấu ba chấm chỉ được xuất hiện khi THẬT SỰ cắt bớt chữ. Một dấu chấm cuối câu bị gỡ
  // không phải là cắt — thêm "…" ở đó là bảng nói còn nữa trong khi không còn gì.
  return out === nguyen ? out : `${out}…`;
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
/* NHIỀU VIỆC CHẠY CÙNG LÚC — Đức yêu cầu 04/09: cách nó vận hành cũng là một tính năng,
 * và bảng đang nhắc "song song" 13 chỗ mà không chỗ nào nói nó chạy thế nào.
 *
 * ĐỌC LẠI TỪ FILE, không gõ tay con số nào. Ba nguồn, ba bộ đọc dưới đây.
 *
 * VÀ ĐÂY LÀ LUẬT CỨNG CỦA CẢ BA: KHÔNG đọc trường `owner` của bảng quyền.
 * Chỉ đọc DANH SÁCH KHOÁ. Lý do không phải thẩm mỹ — `owner` đổi mỗi lần ai nhận hoặc trả
 * khoá (ngày 04/09 riêng `_code` đổi chủ BỐN lần), mà bảng này nằm trong khối `generators`
 * nên cổng so nó với HEAD mỗi phiên. Nhúng `owner` vào là bảng lệch HEAD ngay lượt nhận khoá
 * kế tiếp, và `safe-push` chặn ĐẨY VIỆC CỦA MỌI PHIÊN dù không một dữ liệu nào đổi.
 * Đây đúng cái bẫy đã suýt xảy ra với dòng "hôm nay / N ngày trước", vá bằng `today: "head"`.
 * Khoá thì ngược lại: nó là cấu trúc, chỉ đổi khi thêm hoặc bớt một gói. */
export function demLuongSongSong(deps) {
  let claims;
  try { claims = JSON.parse(deps.readFile(".agents/claims.json"))?.claims; } catch { return 0; }
  if (!claims || typeof claims !== "object") return 0;
  return Object.keys(claims).length;
}

/* Bốn cơ chế — đọc lại cột đầu của bảng ở mục 2 `MULTIFLOW.md`. Chép sang đây là đẻ nguồn
   sự thật thứ hai, và bản thứ hai luôn mục trước bản gốc. */
export function readCoChe(deps) {
  if (!deps.fileExists("docs/protocols/MULTIFLOW.md")) return [];
  let t;
  try { t = deps.readFile("docs/protocols/MULTIFLOW.md"); } catch { return []; }
  const bat = /^##\s+2\..*$/m.exec(t);
  if (!bat) return [];
  const sau = t.slice(bat.index + bat[0].length);
  const het = /^##\s/m.exec(sau);
  const than = het ? sau.slice(0, het.index) : sau;
  const out = [];
  for (const line of than.split(/\r?\n/)) {
    if (!line.startsWith(chr_pipe)) continue;
    const o = line.split(chr_pipe).slice(1, -1).map((c) => c.trim());
    if (o.length < 2) continue;
    const m = /^\*\*(.+?)\*\*$/.exec(o[0]);   // bỏ hàng tiêu đề và hàng gạch
    if (!m) continue;
    out.push({ ten: m[1].replace(/`/g, ""), traLoi: o[1].replace(/^\*|\*$/g, "") });
  }
  return out;
}

/* Năm bất biến — đọc lại câu mở đầu mỗi bất biến ở mục 4. Chỉ lấy CÂU ĐẦU, phần giải thích
   phía sau là chữ cho AI đọc: dài, đầy mã lỗi, đúng thứ Đức nói không muốn thấy. */
export function readBatBien(deps) {
  if (!deps.fileExists("docs/protocols/MULTIFLOW.md")) return [];
  let t;
  try { t = deps.readFile("docs/protocols/MULTIFLOW.md"); } catch { return []; }
  const bat = /^##\s+4\..*$/m.exec(t);
  if (!bat) return [];
  const sau = t.slice(bat.index + bat[0].length);
  const het = /^##\s/m.exec(sau);
  const than = het ? sau.slice(0, het.index) : sau;
  return [...than.matchAll(/\*\*([①-⑤])\s*([^*]+?)\*\*/g)]
    .map((m) => ({ so: m[1], cau: m[2].trim() }));
}

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
function docClaims(deps) {
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
  return Object.entries(claims);
}

export function readKhoa(deps) {
  return docClaims(deps).map(([key, value]) => ({
    ten: tenKhoa(key),
    ban: String(value?.owner ?? "").trim() !== ""
  }));
}

/* ===== NHÓM VẤN ĐỀ — danh sách CỐ ĐỊNH, khai ở file cấu hình hình dạng repo =====
 *
 * Vì sao cố định: một phân loại mọc tự do thì sau ba tuần có 19 nhóm cho 19 mục, tức là
 * không phân loại gì cả. Khai ở file cấu hình thì thêm một nhóm là một lượt sửa có người
 * đọc, không phải một lượt gõ chữ tuỳ hứng vào sổ.
 *
 * Mã lạ (không nằm trong danh sách) KHÔNG lặng lẽ thành nhóm mới — nó rơi về "chưa xếp
 * nhóm", y hệt mục không khai gì. Nhận mã lạ là mở đúng cái cửa sau mà luật trên vừa đóng. */
export const NHOM_FILE = ".repo-structure.json";
export const NHOM_CHUA_XEP = "Chưa xếp nhóm";

export function readNhom(deps) {
  if (!deps.fileExists(NHOM_FILE)) return new Map();
  let parsed;
  try { parsed = JSON.parse(deps.readFile(NHOM_FILE)); }
  catch (error) {
    throw new Error(`NHOM_HONG: file cấu hình hình dạng repo không phải JSON đọc được (${error.message}).`);
  }
  const block = parsed?.nhom_van_de;
  if (block === undefined) return new Map();
  if (!block || typeof block !== "object" || Array.isArray(block)) {
    throw new Error("NHOM_HONG: khối `nhom_van_de` phải là object dạng mã → tên tiếng Việt có dấu.");
  }
  return new Map(Object.entries(block)
    .map(([ma, ten]) => [String(ma).trim().toLowerCase(), String(ten).trim()]));
}

/* ===== TRA MÃ VIỆC SANG SỔ =====
 *
 * ĐỀ BÀI `BANG-DANG-LAM-01`, Đức nêu 06/09: khối "đang làm gì" in nguyên chuỗi lane gõ vào
 * `--task`, mà chuỗi đó là tham số dòng lệnh trên PowerShell — chỗ chữ có dấu hay hỏng nhất.
 * Nên nó luôn không dấu và đầy từ kỹ thuật, và Đức đọc xong không biết nó chữa bệnh gì.
 *
 * Cách chữa KHÔNG phải bắt lane gõ đẹp hơn (gõ đẹp trên PowerShell là chuyện không sửa được),
 * mà là: lane khai MÃ VIỆC, bảng tra sang sổ và lấy câu tiếng Việt CÓ DẤU đã viết sẵn ở đó.
 * Không ai phải gõ lần thứ hai, và chuỗi `--task` tụt xuống thành thứ AI đọc.
 *
 * KHÔNG ĐẺ SỔ MỚI: hai cuốn đang có (`BACKLOG.md` · `IDEAS.md`) đã là nguồn duy nhất, cộng
 * hồ sơ đề bài làm chỗ tra dự phòng. */
export const SO_MUC_VIEC = ["BACKLOG.md", "IDEAS.md"];

export function readMucSo(deps) {
  const nhomHopLe = readNhom(deps);
  const out = new Map();
  const files = deps.git.trackedPaths()
    .filter((p) => SO_MUC_VIEC.includes(p.split("/").pop()))
    .sort();
  for (const rel of files) {
    let text;
    try { text = deps.readFile(rel); } catch { continue; }
    let cur = null;
    // Mã trùng giữa hai sổ thì bản ĐẦU thắng, và danh sách file đã sắp — nên hai lượt sinh
    // trên cùng HEAD không bao giờ chọn hai bản khác nhau.
    const nop = () => { if (cur && !out.has(cur.ma)) out.set(cur.ma, cur); };
    for (const line of text.split(/\r?\n/)) {
      const h = MUC_TIEU_DE.exec(line);
      if (h) { nop(); cur = { ma: h[2].toLowerCase(), cau: shorten(h[3], 108), nhom: "" }; continue; }
      if (!cur) continue;
      const f = MUC_TRUONG.exec(line);
      if (!f || f[1].trim().toLowerCase() !== "nhóm") continue;
      cur.nhom = nhomHopLe.get(f[2].replace(/`/g, "").trim().toLowerCase()) || "";
    }
    nop();
  }
  return out;
}

/* MÃ VIỆC LANE KHAI lúc nhận khoá: `--task "N-03"`, `--task "Y-17"`, `--task "BANG-DANG-LAM-01"`.
   Chữ thường hoặc câu văn xuôi thì KHÔNG khớp — và lúc đó bảng nói thẳng là không tra được,
   chứ không im lặng in chuỗi thô. Im lặng thì không ai sửa thói quen đó. */
export const MA_VIEC = /^([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)(?![A-Za-z0-9-])/;

export function traMaViec(task, mucSo, brief) {
  const hit = MA_VIEC.exec(String(task ?? "").trim());
  if (!hit) return { ma: "", cau: "", nhom: "" };
  const ma = hit[1].toLowerCase();
  const m = mucSo.get(ma);
  if (m) return { ma: hit[1], cau: m.cau, nhom: m.nhom };
  const d = brief?.get(ma);
  if (d) return { ma: hit[1], cau: d.trieuChung, nhom: "" };
  return { ma: hit[1], cau: "", nhom: "" };
}

/* TUỔI CỦA ẢNH CHỤP — đo từ MỐC SINH BẢNG, không từ đồng hồ người xem.
 *
 * Trước 06/09 con số này do đoạn JS trong trang tính lúc MỞ trang, nên một ảnh chụp cũ 8
 * tiếng vẫn khoe "8 phút trước" nếu Đức mở lại sau đó — một ảnh chụp cũ đội lốt số liệu thời
 * gian thực. Đó là kiểu sai tệ nhất: nó không trông giống lỗi.
 *
 * Hai đầu vào đều là mốc lấy từ repo (giờ commit của HEAD, và giờ ghi trong bảng chủ sở hữu),
 * nên hàm này không đọc đồng hồ hệ thống — cùng một HEAD luôn cho cùng một con số. */
const MOC_PHUT = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/;

function mocPhutMs(text) {
  const m = MOC_PHUT.exec(String(text ?? "").trim());
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]),
    m[4] ? Number(m[4]) : 0, m[5] ? Number(m[5]) : 0);
}

export function tuoiTuMoc(mocSinh, mocNhan) {
  const a = mocPhutMs(mocSinh);
  const b = mocPhutMs(mocNhan);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return "";
  const phut = Math.floor((a - b) / 60000);
  if (phut < 60) return "dưới một giờ";
  if (phut < 1440) return `${Math.floor(phut / 60)} giờ trước`;
  return `${Math.floor(phut / 1440)} ngày trước`;
}

/* KHỐI "ĐANG LÀM GÌ" — `LIVE-BLOCK-01`, hiện thực của `ADR-0004`.
 *
 * ĐẢO LẠI một quyết định của chính Đức ngày 04/09: tên lane quay lại bảng. Lý do bỏ đi hồi đó
 * (tên đổi liên tục làm bảng mục) đã được xử bằng `KHOA_PREFIX`, nên nay hiện tên được mà cổng
 * xuất bản không đỏ. Ghi ra đây để phiên sau không tưởng nó lọt vào do sơ ý.
 *
 * KHÔNG tạo nguồn dữ liệu mới: bảng chủ sở hữu đã có đủ bốn thứ Đức cần — ai, đang làm gì,
 * vùng nào, từ lúc nào.
 *
 * GỘP THEO LANE + CÂU VIỆC, không một dòng cho mỗi khoá (đổi 06/09, đề bài `BANG-DANG-LAM-01`).
 * Lý do cũ để không gộp là "hai khoá có thể mang hai câu việc khác nhau" — vẫn đúng, và đó
 * chính là lý do khoá gộp là CẶP (lane, câu việc) chứ không phải mình tên lane. Hai khoá mang
 * hai việc khác nhau vẫn ra hai dòng. Cùng một việc trải trên ba vùng thì ra MỘT dòng, vì Đức
 * đọc bảng để biết đang có mấy việc chạy, không phải mấy ô bị giữ. Ngày 06/09 một lane giữ ba
 * khoá worker cho cùng một việc và khối vẽ ba dòng y hệt nhau.
 *
 * TÊN KHOÁ VÀ GIỜ NHẬN CHÍNH XÁC KHÔNG LÊN BẢNG NỮA: đó là chữ dành cho AI. Đức cần ba thứ —
 * vấn đề gì · đang làm gì · bao lâu rồi. Ai giữ ô nào thì khối "Khoá làm việc" đã trả lời.
 *
 * Mốc nhận vẫn đọc, nhưng để TÍNH TUỔI Ở ĐÂY chứ không in nguyên văn: xem `tuoiTuMoc`. */
export function readLuong(deps) {
  if (typeof deps?.git?.headStamp !== "function") {
    throw new Error("THIEU_MOC_SINH: bộ đọc không có `git.headStamp`, nên không đo được ảnh chụp"
      + " này cũ bao lâu. Không được rơi về đồng hồ hệ thống — đó là cách một ảnh chụp cũ đội"
      + " lốt số liệu thời gian thực.");
  }
  const mocSinh = deps.git.headStamp();
  const mucSo = readMucSo(deps);
  const brief = new Map(readDefects(deps).map((d) => [d.ma.toLowerCase(), d]));
  const gom = new Map();
  for (const [, v] of docClaims(deps)) {
    const lane = String(v?.owner ?? "").trim();
    if (!lane) continue;
    const task = String(v?.task ?? "").trim();
    const tu = String(v?.claimed_at ?? "").trim();
    const khoaGom = JSON.stringify([lane, task]);
    const cu = gom.get(khoaGom);
    // Cùng một việc trải trên nhiều vùng thì lấy mốc SỚM NHẤT — việc bắt đầu lúc ô đầu tiên
    // bị giữ, không phải lúc ô cuối cùng. Lấy mốc muộn nhất là làm việc trông trẻ hơn thật.
    if (cu) { if (tu && (!cu.tu || tu < cu.tu)) cu.tu = tu; continue; }
    const tra = traMaViec(task, mucSo, brief);
    gom.set(khoaGom, { lane, ma: tra.ma, viec: tra.cau, nhom: tra.nhom || NHOM_CHUA_XEP, tu });
  }
  // "Chưa xếp nhóm" xuống CUỐI, phần còn lại theo tên nhóm. Nhóm chưa khai mà nằm lẫn giữa
  // các nhóm thật thì Đức đọc nó như một nhóm thật.
  const hang = (r) => (r.nhom === NHOM_CHUA_XEP ? 1 : 0);
  return [...gom.values()]
    // `moc` là MỐC NHẬN nguyên văn từ bảng chủ sở hữu — dữ liệu thuần, không nhảy mốc.
    // Trước 06/09 chỗ này nướng sẵn chuỗi tuổi (`tuoiTuMoc`), và vì tuổi đo từ giờ commit
    // của HEAD nên mỗi commit mới có thể đẩy nó qua một mốc: file lệch tuy không dữ liệu nào
    // đổi, `safe-push` chặn mọi lane, mà lượt sinh lại chính nó lại đẻ ra HEAD mới. Xem N-10.
    .map((r) => ({ ...r, moc: r.tu }))
    .sort((a, b) => hang(a) - hang(b)
      || a.nhom.localeCompare(b.nhom, "vi")
      || a.lane.localeCompare(b.lane)
      || a.viec.localeCompare(b.viec, "vi"));
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

/* MỘT phép đọc frontmatter cho cả hai khối brief bên dưới. Hai bản sao của cùng một luật thì
   sớm muộn trả hai câu khác nhau cho cùng một file — repo này đã trả giá đúng chuyện đó với
   danh sách file miễn khoá, xem AGENTS.md mục 1. */
function briefStatus(text) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const st = fm ? /^status:\s*(.+)$/m.exec(fm[1]) : null;
  return String(st ? st[1] : "").trim();
}

/* VIỆC LỚN ĐÃ ĐÓNG — đề bài `MOC-DA-XONG-01`. Đức: "để tôi có thể nhìn lại xem chúng ta đã
 * làm qua những gì."
 *
 * NGUỒN LÀ ĐỀ BÀI, KHÔNG PHẢI ADR — đề bài chốt cấm điều đó. Thẻ bên cạnh (Quyết định đã
 * chốt) đã đọc ADR rồi; đọc lần thứ hai là hai bản của một danh sách, và hai bản thì sớm muộn
 * đếm ra hai số khác nhau mà không ai biết bên nào đúng. Ở đây: `status: done` = đã đóng.
 *
 * TIÊU ĐỀ CÓ HAI DẠNG HỢP LỆ, và cả hai đều đang tồn tại thật trong repo:
 *   • "# BRIEF `MÃ` — tên"  → việc có mã (DASH-ORCH-V2, PUSH-GATE-01…)
 *   • "# BRIEF — tên"       → đề bài phiên (S1…S7), không khai mã
 * Dạng thứ ba thì NÉM kèm tên file. Đây là chỗ khác `readDefects`: khối kia cố ý để đề bài
 * phiên rơi ra ngoài vì nó đếm defect đang mở, còn khối này phải liệt kê ĐỦ — bỏ qua im lặng
 * một dòng là làm ngắn danh sách lịch sử mà không ai thấy.
 *
 * NGÀY LẤY TỪ GIT, KHÔNG LẤY TỪ ĐỒNG HỒ. Trang này nằm trong khối `generators` nên cổng so nó
 * với HEAD mỗi phiên; bất cứ thứ gì phụ thuộc giờ chạy sẽ chặn push của MỌI luồng khi sang
 * ngày mới. Git đọc từ HEAD nên cùng một HEAD luôn cho cùng một ngày. Không có ngày thì NÉM,
 * tuyệt đối không điền ngày hôm nay thay thế. */
const MOC_XONG_H1 = new RegExp("^#\\s+BRIEF\\s+(?:`([^`]+)`\\s*)?" + GACH_DAI + "\\s*(.+)$", "m");

export function readMocDaXong(deps) {
  let names;
  try { names = deps.listFiles("docs/briefs"); }
  catch {
    throw new Error("THIEU_SO_DE_BAI: không đọc được thư mục đề bài. Khối việc lớn đã đóng phải"
      + " đọc được từ đó — vẽ một thẻ rỗng thì Đức tưởng chúng ta chưa làm được gì.");
  }
  const out = [];
  for (const name of names) {
    if (!name.startsWith("BRIEF-") || !name.endsWith(".md")) continue;
    const rel = `docs/briefs/${name}`;
    let text;
    try { text = deps.readFile(rel); } catch { continue; }
    if (briefStatus(text) !== "done") continue;
    const h1 = MOC_XONG_H1.exec(text);
    if (!h1) {
      throw new Error(`MOC_XONG_TIEU_DE_HONG: ${name} khai status: done nhưng dòng "# BRIEF" không`
        + " đúng dạng, nên không rút được tên việc. Sửa dòng tiêu đề của file đó — bỏ qua im lặng"
        + " là làm ngắn danh sách mà không ai biết.");
    }
    const ngay = String(deps.git.lastCommitDate(rel) ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ngay)) {
      throw new Error(`MOC_XONG_THIEU_NGAY: ${name} chưa có commit nào chạm tới, nên không có ngày`
        + " đóng. Commit file đó trước rồi sinh lại — điền ngày hôm nay thay thế là gõ tay một con"
        + " số mà Đức không có cách nào kiểm.");
    }
    out.push({ ma: String(h1[1] ?? "").trim(), ten: shorten(boDam(h1[2]).trim(), 108), ngay });
  }
  if (!out.length) {
    throw new Error("MOC_XONG_RONG: không có đề bài nào khai status: done. Thẻ rỗng làm Đức tưởng"
      + " chúng ta chưa làm xong việc gì, nên khối này dừng hẳn thay vì vẽ một danh sách trắng.");
  }
  // Ngày mới nhất lên đầu. `sort` của Node ổn định, nên cùng ngày thì giữ nguyên thứ tự tên
  // file mà `listFiles` đã sắp — tất định, không cần thêm khoá phụ nào.
  return out.sort((a, b) => b.ngay.localeCompare(a.ngay));
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
    out.push({
      ma: h1[1].trim(),
      trieuChung: shorten(h1[2].replace(/\*\*/g, "").trim(), 108),
      mo: briefStatus(text) === "active"
    });
  }
  return out.sort((a, b) => a.ma.localeCompare(b.ma));
}

/* BỘ ĐẾM SỰ CỐ CỦA CHÍNH ASSISTANT — Đức chốt định dạng 04/09 (đề bài `DASH-ORCH-V2` mục 8b).
 *
 * Vẫn dùng chính `HANDOFF.md` ở gốc repo, KHÔNG lập sổ mới — hồ sơ gói Assistant mục 5 cấm sổ
 * đếm riêng, và một sổ thứ hai thì sớm muộn lệch với sổ thứ nhất. Mỗi sự cố là ĐÚNG MỘT DÒNG
 * máy đọc được, neo bằng MỘT dòng: repo này CRLF, và neo nhiều dòng đã hỏng bốn lần trong một
 * ngày, lần nào cũng báo "0 lần khớp" — trông y hệt "không có gì để đếm".
 *
 * BỐN token, không hơn. Token lạ thì NÉM kèm tên nguyên nhân, tuyệt đối không bỏ qua im lặng:
 * một token gõ sai mà bị bỏ qua thì đúng cái sự cố đó biến mất khỏi số đếm, và bảng sẽ nói
 * "ít sự cố hơn" trong khi thật ra là "đọc kém hơn".
 *
 * ĐÂY LÀ BỘ ĐẾM LỖI, KHÔNG PHẢI ĐIỂM. Cố ý không có token `ANSWERED` hay `PASS`: Assistant
 * không được có đường nào tự làm đẹp số của mình. Hệ quả là ai ghi `AssistantEvent: PASS` sẽ
 * bị luật token lạ ở trên NÉM ngay — đó là cơ chế chạy đúng, không phải lỗi. */
export const SU_CO_ASSISTANT = [
  ["ROLE-DRIFT", "Trượt vai"],
  ["STATE-DRIFT-CAUGHT-BY-DUC", "Sai lệch Đức phải bắt"],
  ["DASHBOARD-STALE", "Bảng cũ"]
];

const NHAN_SU_CO = "AssistantEvent:";
const SU_CO_LA = "UNKNOWN";

/* Con trỏ sang file lưu trữ. ADR-0008 cắt đuôi `HANDOFF.md` ngày 06/09 và dời phần cũ sang
 * `HANDOFF-ARCHIVE-01.md`; bất biến ⑶ của nó bắt để lại một con trỏ đọc được ngay trong
 * `HANDOFF.md`. Bộ đếm này đi theo đúng con trỏ đó thay vì gõ cứng tên file, nên lần cắt sau
 * (`-02`, `-03`…) không phải sửa lại chỗ này. */
const CON_TRO_LUU_TRU = /HANDOFF-ARCHIVE-\d+\.md/g;

export function readAssistantEvents(deps) {
  const dem = new Map(SU_CO_ASSISTANT.map(([token]) => [token, 0]));
  dem.set(SU_CO_LA, 0);
  let text;
  try { text = deps.readFile("HANDOFF.md"); } catch { text = ""; }
  /* ĐÂY LÀ BỘ ĐẾM CỘNG DỒN, nên nó phải đọc CẢ phần đã dời đi. Không đọc thì cắt đuôi
   * `HANDOFF.md` sẽ ÂM THẦM đưa mọi số đếm về 0 — và "0 sự cố" đọc y hệt "sạch sẽ" trong khi
   * thật ra là "mù". Đúng chuyện đó xảy ra ngày 06/09: commit c2e5a2d dời 4 dòng sự cố sang
   * file lưu trữ, bộ đếm ra 0, và cổng đóng phiên ĐỎ với MỌI lane trên `origin/main`. */
  /* ĐI HẾT CHUỖI, KHÔNG PHẢI MỘT BƯỚC. Bản đầu lấy danh sách con trỏ MỘT LẦN từ `HANDOFF.md`
   * rồi mới vào vòng lặp, nên nó đi được đúng một bước: `HANDOFF.md` → `-01`. Từ ADR-0011 file
   * xoay theo THÁNG, tức chuỗi dài ra mãi (`HANDOFF.md` → `-02` → `-01` → …) và con trỏ sang
   * `-01` nằm TRONG `-02`. Đi một bước thì mọi sự cố cũ hơn một tháng biến mất khỏi số đếm —
   * đúng lại con bug 06/09, chỉ chậm hơn 30 ngày. Nên: hàng đợi, và nạp gì thì soi tiếp cái đó. */
  const daDoc = new Set(["HANDOFF.md"]);
  const hangDoi = String(text).match(CON_TRO_LUU_TRU) ?? [];
  while (hangDoi.length) {
    const ten = hangDoi.shift();
    if (daDoc.has(ten)) continue;
    daDoc.add(ten);
    try {
      const them = deps.readFile(ten);
      text += "\n" + them;
      hangDoi.push(...(String(them).match(CON_TRO_LUU_TRU) ?? []));
    } catch { /* con trỏ trỏ vào chỗ trống — kệ */ }
  }
  for (const line of String(text).split(/\r\n|\r|\n/)) {
    if (!line.startsWith(NHAN_SU_CO)) continue;
    const token = line.slice(NHAN_SU_CO.length).trim();
    if (!dem.has(token)) {
      throw new Error(`NHAN_SU_CO_LA: dòng nhật ký khai token "${token}", không nằm trong bộ từ vựng`
        + ` bốn token Đức đã chốt (${[...dem.keys()].join(" · ")}). Sửa dòng đó, đừng sửa bộ đếm —`
        + " bỏ qua im lặng thì đúng cái sự cố ấy biến mất khỏi số đếm.");
    }
    dem.set(token, dem.get(token) + 1);
  }
  return {
    dong: SU_CO_ASSISTANT.map(([token, ten]) => ({ token, ten, n: dem.get(token) })),
    la: dem.get(SU_CO_LA)
  };
}

/* DẤU DÒNG KHOÁ — đây là cách khối 1 không làm tê cả repo.
 *
 * `DASHBOARD-Chrome-Extension-AI-Agentic.html` nằm trong khối `generators`, nên cổng đóng phiên và `safe-push` so nó với
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

/* Một hàng roadmap: tên có link nhảy tới chi tiết ý tưởng, thanh ba bước, rồi nhãn bậc.
   `data-goto` phải là tên MỘT TẦNG, không phải tên khối: đoạn JS cuối trang gọi `show()` với
   giá trị đó, và `show()` chỉ biết tầng. Từ lượt refactor IA, khối `y-tuong` nằm trong tầng
   `work` — trỏ sang "y-tuong" là bấm vào không có gì xảy ra. */
const roadmapRow = (idea) =>
  `        <div class="rmr"><a href="#y-${esc(slug(idea.code))}" data-goto="work">` +
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

/* TAB — Đức nói trang cũ phải cuộn quá nhiều. Ba tầng, và mỗi tầng lại dùng toggle bên trong,
   nên mặc định trang chỉ cao bằng một màn hình. Số tầng khai ở hằng số TANG của bộ sinh. */
.tabs{display:flex;gap:5px;flex-wrap:wrap;border-bottom:1px solid var(--line)}
.tab{font-family:var(--sans);font-size:13.5px;font-weight:600;color:var(--muted);
  background:none;border:1px solid transparent;border-bottom:none;cursor:pointer;
  padding:9px 14px;border-radius:9px 9px 0 0;margin-bottom:-1px}
.tab:hover{color:var(--ink);background:var(--inset)}
.tab[aria-selected="true"]{color:var(--accent);background:var(--surface);
  border-color:var(--line);border-bottom-color:var(--surface)}
.tab:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
[role="tabpanel"]{display:flex;flex-direction:column;gap:13px}
${/* KHỐI `data-sect` PHẢI LẶP LẠI LUẬT FLEX Ở TRÊN.
     Từ lượt refactor IA, thẻ con trực tiếp của một khung không còn là `.card` mà là khối
     `data-sect` gói nhiều card. Thiếu dòng dưới thì khoảng cách 13px chỉ còn GIỮA các khối,
     còn các card trong cùng một khối dính liền nhau. Đây là dòng CSS duy nhất lượt refactor
     này thêm — cấu trúc mới bắt buộc, không phải làm đẹp thêm. */
  ""}[data-sect]{display:flex;flex-direction:column;gap:13px}
${/* DÒNG DƯỚI BẮT BUỘC PHẢI CÓ, và nó phải nằm SAU luật display ở trên.
     display:flex ở trên là luật của TÁC GIẢ, còn [hidden] → display:none là luật mặc định của
     TRÌNH DUYỆT — và luật tác giả thắng luật trình duyệt bất kể độ đặc hiệu. Thiếu dòng dưới
     thì đoạn JS cuối trang vẫn gán pane.hidden = true rất đúng, nhưng CSS bỏ qua, nên MỌI
     khung hiện chồng nhau và bấm tab không thấy gì đổi.

     Đó là bug DASH-TAB-01. Nó sống từ commit đầu tiên dựng tab tới 04/09 mà không ai thấy,
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
/* CẢNH BÁO ĐỘ TƯƠI BẰNG CHỨNG — cố ý cùng hàng với chip trạng thái, không xuống dòng riêng và
   không vào khối gập: Đức phải thấy nó CÙNG LÚC với chữ "ĐÃ CHỨNG MINH", nếu không thì chữ kia
   một mình vẫn dẫn tới quyết định sai. Cho phép ngắt dòng ở màn hẹp — cắt chữ đi thì mất nghĩa. */
.cw{display:inline-flex;gap:6px;align-items:baseline;flex-wrap:wrap;justify-content:flex-end}
.stale{font-family:var(--mono);font-size:9.5px;font-weight:700;letter-spacing:.04em;
  padding:2px 7px;border-radius:3px;background:var(--warn-bg);color:var(--warn);
  border:1px solid var(--warn)}
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
.note + .sect{margin-top:15px}

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

/* Vùng CẦN ĐỨC và vùng CÔNG VIỆC HIỆN TẠI dùng CHUNG một hàng: dòng đầu là tên (có link) kèm
   huy hiệu, dòng dưới là một câu. Một class cho cả hai vùng, vì hai vùng vẽ cùng một hình. */
.dr{display:flex;flex-direction:column;gap:3px;padding:9px 0;border-bottom:1px solid var(--line)}
.dr:last-child{border-bottom:none}
.dr .h{display:flex;flex-wrap:wrap;gap:9px;align-items:baseline}
.dr a{color:var(--ink);font-weight:600;font-size:13.8px;text-decoration:none;
  border-bottom:1px solid var(--line-2)}
.dr a:hover{color:var(--accent);border-bottom-color:var(--accent)}
.dr .d{font-size:13.2px;color:var(--ink-2);line-height:1.45;min-width:0}
.dr .h .d{flex:1 1 240px}
.dr .w{font-size:12px;color:var(--muted);line-height:1.4}
.dr .mn{font-size:12px;color:var(--muted);line-height:1.4}

${/* Tiêu đề một chuỗi việc trong vùng CẦN ĐỨC. Đức chốt 06/09: gom theo chuỗi, trong mỗi
     chuỗi tách BẤM và CHỐT. Một hàng tiêu đề mảnh là đủ — không dựng thêm khung, vì mỗi
     khung mới trong tab này là một lần nữa đụng vào cơ chế ẩn/hiện (bug DASH-TAB-01). */ ""}
.cg{font-family:var(--mono);font-size:10.5px;font-weight:700;letter-spacing:.07em;
  color:var(--muted);text-transform:uppercase;padding:13px 0 3px;border-top:1px solid var(--line)}
.cg:first-child{border-top:none;padding-top:2px}

${/* Hàng của khối "đang làm gì". CỐ Ý không dùng lại lớp .dr: .dr là hàng có link sang tab
     Extension, còn hàng này không link đi đâu — và phép ghim của vùng CẦN ĐỨC đếm đúng số
     .dr, nên mượn class là làm hai vùng đếm lẫn vào nhau.
     Viết bằng ${/* … *\/ ""} chứ không phải ghi chú CSS, cùng lý do với ghi chú tab ở trên:
     ghi chú CSS sẽ đi thẳng vào trang Đức mở. */ ""}
.lr{display:flex;flex-direction:column;gap:3px;padding:9px 0;border-bottom:1px solid var(--line)}
.lr:last-child{border-bottom:none}
.lr .h{display:flex;flex-wrap:wrap;gap:9px;align-items:baseline}
.lr .ln{font-family:var(--mono);font-size:13px;font-weight:700;color:var(--ink)}
.lr .d{font-size:13.2px;color:var(--ink-2);line-height:1.45;min-width:0}
.lr .mn{font-size:12px;color:var(--muted);line-height:1.4}
</style>`;

/* ===== BA TẦNG — HOME · WORK · SYSTEM. Refactor IA, Đức chuyển 07/09 =====
 *
 * VÌ SAO ĐỔI: bảng đã phình lên **chín** tab, và tab mở sẵn là góc nhìn hệ thống chứ không
 * phải góc nhìn người quyết định. Đức mở bảng ra là gặp bảng khoá, mốc gói, đếm sự cố — trong
 * khi câu Đức cần trả lời chỉ có ba: *đang tập trung vào gì · tôi cần làm gì · cái gì đang
 * chạy*. Chín cửa cho ba câu là bắt người đọc học cấu trúc repo trước khi đọc được trạng thái.
 *
 * BA TẦNG, KHÔNG PHẢI BA TAB ĐƠN THUẦN. Mỗi tầng là một khung nội dung, và trong khung đó là
 * các KHỐI mang `data-sect`. Khối là đơn vị của luật IA dưới đây, tab chỉ là cái vỏ:
 *   HOME   → chỉ ba khối, đúng ba câu trên. Người không biết cấu trúc repo dùng được.
 *   WORK   → extension và ý tưởng: từng việc đang đi tới đâu.
 *   SYSTEM → vận hành, sức khoẻ, khoá, cấu trúc, nhật ký, tra cứu. Chỉ số kỹ thuật ở đây.
 *
 * DANH SÁCH NÀY LÀ HỢP ĐỒNG, KHÔNG PHẢI GỢI Ý. Bộ dựng khối ở cuối `buildOverview` NÉM khi
 * một khối được sinh mà không khai ở đây, khi một khối đã khai mà không được sinh, và khi
 * một chỉ số kỹ thuật lọt vào tầng HOME. Fail-closed, cùng lý lẽ với `MOC_HEAD_HONG`: một
 * tầng HOME lặng lẽ thiếu khối là Đức mở bảng ra, không thấy việc của mình, rồi tin là không
 * có việc nào — sai kiểu đó tệ hơn bộ sinh chết kèm tên nguyên nhân. */
export const TANG = [
  ["home", "Trang chính", ["focus-now", "needs-duc", "in-motion"]],
  ["work", "Việc", ["extension", "y-tuong"]],
  ["system", "Hệ thống", ["van-hanh", "suc-khoe", "suc-khoe-assistant", "ha-tang", "cau-truc", "nhat-ky", "tra-cuu"]]
];

/* CHỈ SỐ KỸ THUẬT — cấm có mặt trong tầng HOME (luật IA của Đức: *"Bridge methods, số file
 * test, khoá, cấu trúc repo — xuống SYSTEM"*).
 *
 * Ghim bằng TIÊU ĐỀ KHỐI, không bằng con số. Con số đổi mỗi phiên; tiêu đề khối là thứ ổn
 * định, và nó là đúng cái Đức nhìn thấy khi một khối kỹ thuật bị đặt sai tầng. Ai chuyển một
 * trong các khối này lên HOME thì bộ sinh chết ngay tại chỗ kèm tên khối — chứ không phải để
 * tới lượt Đức mở bảng mới phát hiện. */
export const CHI_SO_KY_THUAT = [
  "Khoá làm việc",
  "Lệnh Bridge",
  "File kiểm",
  "Sức khoẻ Assistant",
  "Thư mục ở tầng ngoài cùng",
  "File ở gốc repo"
];

/* HAI PHÉP CANH HỢP ĐỒNG `TANG`, TÁCH RA THÀNH HÀM XUẤT RA — cố ý.
 *
 * Chúng nằm trong `buildOverview` thì phép ghim chỉ hỏi được qua hành vi, tức muốn thử ca hỏng
 * phải sửa chính bộ sinh. Là hàm riêng thì suite dựng được ca hỏng bằng một lượt gọi, nên hai
 * chốt này có RĂNG THẬT chứ không chỉ có mặt. Cùng lối với `laFileMayDuocGhi` của bộ sinh bảng
 * đối chiếu: hai đường đo một chốt thì gỡ chốt không còn cách nào xanh. */
export function kiemHopDongTang(khoiTang) {
  const daKhai = new Set(TANG.flatMap(([, , ids]) => ids));
  for (const id of khoiTang.keys()) {
    if (!daKhai.has(id)) {
      throw new Error(`KHOI_KHONG_KHAI: khối "${id}" được sinh ra nhưng không khai ở TANG, nên nó `
        + "KHÔNG hiện trên trang mà cũng không báo lỗi. Khai nó vào đúng tầng, hoặc bỏ nó đi.");
    }
  }
  for (const [tab, , ids] of TANG) {
    for (const id of ids) {
      const dong = khoiTang.get(id);
      if (!dong) {
        throw new Error(`KHOI_THIEU: tầng "${tab}" khai khối "${id}" mà không khối nào được sinh ra. `
          + "Tầng thiếu một phần thì Đức không có cách nào biết — nên bộ sinh dừng ở đây.");
      }
      if (tab === TANG[0][0] && dong.join("").trim() === "") {
        throw new Error(`KHOI_HOME_RONG: khối "${id}" của tầng mở sẵn không có nội dung nào. `
          + "Đức mở bảng ra sẽ thấy một khoảng trống và tin là không có gì — đó là nói dối.");
      }
    }
  }
}

export function kiemChiSoHome(chuHome) {
  for (const nhan of CHI_SO_KY_THUAT) {
    if (String(chuHome ?? "").includes(nhan)) {
      throw new Error(`CHI_SO_KY_THUAT_TREN_HOME: tầng mở sẵn đang chứa "${nhan}". Luật IA của Đức: `
        + "Bridge, số file test, khoá và cấu trúc repo xuống tầng Hệ thống. HOME nói HỆ QUẢ, "
        + "không nói chỉ số.");
    }
  }
}

const TABS = TANG.map(([id, ten]) => [id, ten]);

/* TAB MỞ SẴN — nay là tầng HOME, không còn là góc nhìn hệ thống (Đức chuyển 07/09).
 *
 * MỘT HẰNG SỐ CHO CẢ HAI CHỖ, cố ý. Nút tab được tô sáng và khung nội dung được mở là hai chỗ
 * khác nhau trong HTML, và chúng lệch nhau thì trang mở ra với nút này sáng mà nội dung kia
 * hiện — Đức không có cách nào biết mình đang nhìn nhầm tab. Suy cả hai từ đây thì không lệch
 * được nữa.
 *
 * KHÔNG đụng tới `[role="tabpanel"][hidden]{display:none}`: đó là dòng đang giữ cho tab đổi
 * được (bug `DASH-TAB-01`). Đổi tab mặc định là đổi CHỖ ĐẶT thuộc tính `hidden`, không phải
 * thêm một luật `display` mới. */
export const TAB_MAC_DINH = TANG[0][0];
const anKhung = (id) => (id === TAB_MAC_DINH ? "" : " hidden");

const chip = (stage) => `<span class="chip s${stage}">${esc(STAGES[stage])}</span>`;

/* CHIP TRẠNG THÁI + CẢNH BÁO ĐỘ TƯƠI, dựng ở MỘT chỗ duy nhất.
   Đề bài `CONTENT-TRUTH-01` đòi cảnh báo hiện CÙNG CHỖ với chip trạng thái, không giấu trong
   khối gập. Ghép ở đây thay vì ở từng chỗ gọi, để không có ngày một chỗ có cảnh báo và chỗ kia
   không — hai bản sao của một luật thì sẽ lệch. Bọc cả hai trong MỘT thẻ: bảng tổng là lưới ba
   cột, thả thêm một thẻ con vào đó là làm lệch lưới. */
const chipDonVi = (row) => {
  const canh = chungMinhCu(row);
  return `<span class="cw">${chip(stageOf(row))}`
    + (canh ? `<span class="stale">${esc(canh)}</span>` : "")
    + `</span>`;
};

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
const bigRow = (tab, id, name, chipHtml, meta) =>
  `        <div class="br"><a href="#${esc(id)}" data-goto="${esc(tab)}">${esc(name)}</a>` +
  `${chipHtml}<span class="meta">${esc(meta)}</span></div>`;

/* ĐÃ GỠ (06/09, sổ nợ N-07): `readRefreshLine` — bộ đọc lấy câu "làm mới bảng" từ mục 2 của
 * `PROMPTS.md` để trang không giữ bản chép thứ hai của câu đó.
 *
 * Nó đúng khi trang còn in một câu cho Đức dán cho AI. Nay trang không in câu nào như thế
 * nữa: Đức tự làm mới bảng bằng ba cửa nhấp đúp trong `bang-trang-thai/`, nên chỗ duy nhất
 * dùng tới bộ đọc này đã biến mất. Giữ lại là giữ một phép kiểm không bao giờ nổ, mà vẫn bắt
 * `PROMPTS.md` phải khoá cứng hình dạng mục 2 mãi mãi. */

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
  const soLuong = demLuongSongSong(deps);
  const coChe = readCoChe(deps);
  const batBien = readBatBien(deps);
  const khoa = readKhoa(deps);
  const luongChay = readLuong(deps);
  const moc = readMoc(deps);
  const defects = readDefects(deps);
  const mocDaXong = readMocDaXong(deps);
  const suCo = readAssistantEvents(deps);

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

  /* KHỐI ĐI VÀO SỔ RIÊNG, TẦNG DỰNG SAU. Bộ sinh vẫn viết các khối theo thứ tự nào cũng được;
     thứ tự Đức NHÌN THẤY do `TANG` quyết. Nhờ vậy dời một khối sang tầng khác là sửa một dòng
     ở `TANG`, không phải cắt dán vài trăm dòng HTML — và đó là chỗ mà bản chín-tab đã mục:
     mỗi lần đổi ý là một lượt cắt dán, nên không ai đổi, nên IA phình dần. */
  const khoiTang = new Map();
  let cur = p;
  const batDau = (id) => {
    if (!khoiTang.has(id)) khoiTang.set(id, []);
    cur = khoiTang.get(id);
  };
  p.push(`<!-- ${KHAI_BAN_CHUP} -->
<title>${esc(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap">
${STYLE}

<div class="wrap">
  <div class="stampbar">
    <span>Sinh ngày ${esc(stamp)} · ${ageDays === 0 ? "hôm nay" : ageDays + " ngày trước"}</span>
    <span>${esc(KHAI_BAN_CHUP)}</span>
  </div>
  <div class="cu" id="cu" data-sinh="${esc(stamp)}"></div>`);
  p.push(`
  <h1>${esc(title)}</h1>

  <div class="tabs" role="tablist">`);
  for (const tab of TABS) {
    p.push(`    <button class="tab" role="tab" data-tab="${tab[0]}" aria-selected="${tab[0] === TAB_MAC_DINH ? "true" : "false"}">${esc(tab[1])}</button>`);
  }
  p.push(`  </div>`);

  /* ===== HOME · KHỐI 1 · FOCUS NOW =====
   *
   * MỘT FOCUS **CỘNG MỘT CON SỐ LUỒNG**, không phải một focus trơ. Đề bài Đức viết "đúng 1
   * focus chính"; đúng ở ý, nhưng một focus duy nhất NÓI DỐI vào đúng những ngày đáng đọc
   * nhất — hôm nay repo có nhiều lane chạy song song, và một dòng "đang tập trung: X" đọc ra
   * là "chỉ có X đang chạy". Cắt bớt trong im lặng là biến bảng thành nguồn sai, nên con số
   * luồng đứng cạnh focus.
   *
   * Ô thứ ba KHÔNG còn là "Đức cần làm" — nó đã dời sang khối `needs-duc` ngay dưới, là nơi
   * authoritative duy nhất. Ba bản sao của cùng một danh sách là đúng cái Đức phàn nàn. */
  batDau("focus-now");
  cur.push(`    <div class="card">
      <div class="sect">Đang làm gì trước</div>
      <div class="now">
        <div class="nb focus">
          <span class="k">Đang tập trung</span>
          <span class="t">${esc(top ? top.name : "—")}</span>
          <span class="s">${esc(top ? shorten(top.currentFocus || top.nextStep) : "Chưa có đơn vị nào khai việc kế.")}</span>
        </div>
        <div class="nb next">
          <span class="k">Cổng kế tiếp</span>
          <span class="t">${esc(top ? (gateNext(top.nextStep, 58) || shorten(top.nextStep, 58)) : "—")}</span>
          <span class="s">${esc(second ? "Sau đó: " + second.name + " — " + shorten(second.nextStep, 68) : "Không còn việc nào xếp sau.")}</span>
        </div>
        <div class="nb">`);
  /* Ô NÀY SUY TỪ BẢNG CHỦ SỞ HỮU, NÊN NÓ PHẢI MANG DẤU — kể cả thẻ mở và thẻ đóng.
     Đây là cái bẫy đã làm tê cả repo một lần (mục `N-10`): số luồng đổi mỗi lượt nhận/trả
     khoá, mà bảng bị cổng xuất bản so với HEAD mỗi phiên. Một dòng không dấu suy từ bảng khoá
     nghĩa là MỌI phiên bị chặn đẩy mỗi lần bất kỳ ai nhận một vùng — dù không dữ liệu nào của
     họ đổi. Từng dòng một, dấu ở ĐẦU dòng: `compareOverview` lọc bằng `startsWith`. */
  for (const d of [
    `          <span class="k">Chạy song song</span>`,
    `          <span class="t">${luongChay.length ? esc(luongChay.length + " luồng") : "không có luồng nào"}</span>`,
    `          <span class="s">${luongChay.length
      ? "Việc không chỉ nằm ở một chỗ. Từng luồng liệt kê ở khối Đang chạy ngay dưới."
      : "Không luồng nào đang giữ vùng trong repo này."}</span>`
  ]) cur.push(KHOA_PREFIX + d);
  cur.push(`        </div>
      </div>
      <p class="note">Ô đầu là đơn vị hạng 1 tự khai, không phải bảng chọn hộ. <strong>Cổng kế tiếp</strong> là câu đầu của việc kế — bản đầy đủ ở tầng <strong>Việc</strong>. Con số luồng đứng cạnh focus có lý do: có ngày nhiều việc chạy cùng lúc, và một dòng focus trơ sẽ đọc ra là chỉ có một việc.</p>
    </div>`);

  /* ===== TỪ MỘT TAB "AI ĐIỀU PHỐI" THÀNH BỐN KHỐI Ở BA TẦNG (refactor IA 07/09) =====
   *
   * Bốn vùng của brief `DASH-ORCH-V2` vẫn còn nguyên, nhưng chúng KHÔNG còn ở cùng một chỗ:
   *   CẦN ĐỨC            → HOME, khối `needs-duc`   · tôi cần làm gì?
   *   CÔNG VIỆC HIỆN TẠI → HOME, khối `in-motion`   · cái gì đang chạy, cổng kế là gì?
   *   SỨC KHOẺ ASSISTANT → SYSTEM                   · chỉ số, không phải việc phải làm
   *   HẠ TẦNG (khoá)     → SYSTEM                   · chỗ trống để giao việc song song
   *
   * Vì sao tách: hai vùng đầu là câu Đức hỏi mỗi ngày, hai vùng sau là chỉ số kỹ thuật. Trộn
   * chúng vào một tab thì tab đó phải mở mặc định, và Đức mở bảng ra là gặp bảng khoá trước
   * khi gặp việc của mình. Luật IA của Đức nói thẳng: chỉ số kỹ thuật không lên HOME.
   *
   * Bảng KHÔNG cố trả lời mọi câu hỏi. Bảng = trạng thái cần nhìn thường xuyên; hỏi sâu và
   * kiểm chứng theo yêu cầu là việc của Assistant trong chat. */

  /* ===== NEEDS ĐỨC — MỘT DANH SÁCH, HAI NGUỒN, NÓI THẲNG LÀ HAI =====
   *
   * Đề bài Đức: *"một SSOT duy nhất, dùng cơ chế `@Đức:bấm`/`@Đức:chốt`"*. Đích đúng. Nhưng
   * CẮT `human_action` NGAY HÔM NAY LÀ MẤT DỮ LIỆU, và đây là số đo (mục `N-29` của sổ nợ
   * gốc repo, đo 07/09): 17 dấu trong ba sổ, `human_action` khác rỗng ở 4 trong 5 gói — mà
   * **Scouter không có một dấu nào trong cả gói** trong khi `human_action` của nó là việc
   * thật còn hiệu lực, và ChatGPT thì `human_action` nói việc KHÁC với dấu đang có.
   *
   * NÊN LƯỢT NÀY ĐI ĐƯỜNG (a): giữ CẢ HAI cơ chế nuôi khối, gộp thành MỘT danh sách hiển thị
   * duy nhất, và trang nói thẳng là hai nguồn đang song song. Đạt được "một nơi authoritative"
   * mà không mất một dòng nào. Đường (b) — chỉ đọc dấu, kèm một phép ghim ĐỎ khi một hồ sơ có
   * `human_action` mà gói đó không có dấu — để lượt sau, khi hai cơ chế đã đếm bằng nhau.
   *
   * Một nguồn duy nhất nói THIẾU thì tệ hơn hai nguồn nói LỆCH: hai nguồn lệch thì thấy được,
   * một nguồn thiếu thì không. */
  const ducViec = readCanDuc(deps, model);
  const ducChuoi = [];
  for (const v of ducViec) {
    const cuoi = ducChuoi[ducChuoi.length - 1];
    if (cuoi && cuoi.ten === v.chuoi) cuoi.muc.push(v);
    else ducChuoi.push({ ten: v.chuoi, muc: [v] });
  }
  const ducBam = ducViec.filter((v) => v.loai === "BẤM").length;
  const ducChot = ducViec.length - ducBam;

  /* BỎ TRÙNG CHỈ Ở CA CHỨNG MINH ĐƯỢC LÀ TRÙNG.
     Hồ sơ trạng thái nằm trong danh sách sổ mà `readCanDuc` quét, nên một hồ sơ TỰ NÓ mang
     dấu thì dòng đó đã hiện ở trên — thêm `human_action` của cùng hồ sơ ấy là in hai lần.
     Ngoài ca đó thì KHÔNG bỏ: gói có dấu trong sổ nợ riêng mà `human_action` nói việc khác là
     ca đã đo được thật (ChatGPT, 07/09), và bỏ theo gói sẽ xoá đúng việc đó khỏi bảng. Lệch
     về phía hiện THỪA, không bao giờ về phía hiện THIẾU. */
  const hoSoCoDau = new Set(ducViec.map((v) => v.nguon).filter((n) => n.endsWith("STATUS.md")));
  const ducHoSo = humanActions.filter((a) => !hoSoCoDau.has(a.statusPath));
  const ducTong = ducViec.length + ducHoSo.length;

  /* Xếp theo thứ hạng đơn vị tự khai. Chưa khai hạng thì xuống cuối — KHÔNG coi là hạng 0,
     vì 0 là số nhỏ nhất và một trường bỏ trống sẽ nhảy lên đầu bảng. */
  const luong = [...model.rows].sort((a, b) =>
    (Number.isFinite(a.priorityRank) ? a.priorityRank : Infinity)
    - (Number.isFinite(b.priorityRank) ? b.priorityRank : Infinity)
    || a.key.localeCompare(b.key));

  const mocPilot = moc.find((m) => m.ten.includes("PILOT")) || null;
  const mocDangChay = moc.find((m) => m.bac === 1) || null;
  const deBaiMo = defects.filter((d) => d.mo);

  batDau("in-motion");
  /* THẺ MỞ VÀ THẺ ĐÓNG CỦA CARD NÀY CŨNG MANG DẤU, dù chúng là chữ tĩnh không bao giờ đổi.
     Lý do là phép ghim, không phải phép so: phép ghim ở khối 21 của suite khẳng định "tập dòng
     mang dấu bằng ĐÚNG hai khối đọc từ bảng chủ sở hữu". Để một dòng không dấu lọt vào giữa
     khối thì khẳng định đó phải nới thành "lọc lấy dòng có dấu rồi mới so" — và nới thế là mất
     đúng cái răng của nó: một dòng lane BỊ MẤT DẤU sẽ biến mất khỏi cả hai vế và cho xanh giả.
     Dấu trên hai dòng tĩnh không tốn gì; `compareOverview` chỉ bỏ qua chúng. */
  cur.push(`${KHOA_PREFIX}    <div class="card">`);

  /* ===== KHỐI "ĐANG LÀM GÌ" — `LIVE-BLOCK-01` =====
   *
   * NAY LÀ NỬA ĐẦU CỦA KHỐI `in-motion` trên tầng HOME. Nửa sau là danh sách từng đơn vị kèm
   * cổng kế. Hai nửa cùng trả lời "cái gì đang chạy", nên chúng ở cùng một khối; trước lượt
   * refactor chúng nằm cách nhau hai card trong cùng một tab dài.
   *
   * MỌI DÒNG DƯỚI ĐÂY MANG `KHOA_PREFIX` Ở ĐẦU DÒNG — kể cả dòng tiêu đề, dòng thẻ mở/đóng và
   * dòng ghi chú. Đây là phép ghim quan trọng nhất của khối này, và sai chỗ này KHÔNG AI THẤY
   * cho tới lúc một phiên bất kỳ bị `safe-push` từ chối mà không hiểu vì sao. Đo trên lịch sử
   * thật: 146 trong 174 commit chạm bảng chủ sở hữu làm ĐỔI trạng thái bận/mở. Thụt lề trước
   * dấu cũng là thiếu dấu — `compareOverview` lọc bằng `startsWith`.
   *
   * Nên phải đẩy TỪNG DÒNG MỘT: một `p.push` nhiều dòng thì chỉ dòng đầu có dấu, phần còn lại
   * lọt ra ngoài phép lọc mà trông vẫn y hệt. */
  const dongKhoi = [];
  /* TIÊU ĐỀ NÓI THẲNG ĐÂY LÀ ẢNH CHỤP. Trước 06/09 nó chỉ nói "2 luồng đang chạy" ở thì hiện
     tại, trong khi dữ liệu là ảnh chụp lúc sinh — và Đức đã nhìn thấy hai luồng đã trả khoá
     từ tám tiếng trước. Ảnh chụp cũ phải TRÔNG cũ. */
  dongKhoi.push(`      <div class="sect">Đang chạy — ảnh chụp lúc sinh bảng · ${luongChay.length ? esc(luongChay.length + " luồng") : "không có luồng nào"}</div>`);
  dongKhoi.push(`      <div class="bl">`);
  if (luongChay.length) {
    /* LỒNG THEO NHÓM VẤN ĐỀ, không theo khoá. Đức hỏi "ý tưởng đó đang giải quyết vấn đề gì" —
       tên khoá không trả lời được câu đó, còn nhóm vấn đề thì có. */
    let nhomHienTai = null;
    for (const l of luongChay) {
      if (l.nhom !== nhomHienTai) {
        nhomHienTai = l.nhom;
        dongKhoi.push(`        <div class="cg">Nhóm vấn đề · ${esc(l.nhom)}</div>`);
      }
      /* CÂU VIỆC LẤY TỪ SỔ, không lấy từ chuỗi `--task`. Không tra được thì NÓI THẲNG — im
         lặng in chuỗi thô là không ai sửa thói quen đó. Vẫn qua bộ rút gọn: câu trong sổ là
         chữ của người, nhưng người viết sổ cũng gõ tên file vào câu như thường. */
      const cau = l.viec
        ? shorten(l.viec)
        : (l.ma
          ? `Lane khai mã ${l.ma} nhưng không sổ nào có mục mang mã đó — chưa tra được đang làm gì`
          : "Lane chưa khai mã việc lúc nhận vùng, nên không tra sang sổ được");
      dongKhoi.push(`        <div class="lr"><div class="h">`
        + `<span class="ln">${esc(l.lane)}</span></div>`
        + `<span class="d">${esc(cau)}</span>`
        /* MỐC NHẬN TUYỆT ĐỐI, không phải tuổi đã nướng sẵn. Xem N-10 trong `BACKLOG.md`.

           Chốt cũ vẫn đúng và giữ nguyên: con số này KHÔNG được tính từ đồng hồ người xem,
           vì thế thì một ảnh chụp cũ tám tiếng vẫn khoe "8 phút trước". Chỗ sai nằm ở chỗ
           khác, và tinh hơn: nướng chuỗi tuổi vào file làm file phụ thuộc GIỜ COMMIT CỦA
           HEAD — mà chính việc commit file này lại sinh ra một HEAD mới. Tự tham chiếu.
           Đo 06/09: khoá nhận lúc 15:33, HEAD nhích qua mốc một giờ, chuỗi đổi từ
           "dưới một giờ" sang "1 giờ trước" tuy KHÔNG dữ liệu nào đổi — và `safe-push`
           chặn MỌI lane cho tới khi sinh lại, rồi lượt sinh lại đẻ ra HEAD mới. Ba lượt
           liên tiếp không lượt nào qua.

           Nay file chỉ chứa MỐC, thứ suy thẳng từ bảng chủ sở hữu và không nhảy mốc. Đức
           đọc mốc sinh bảng ở đầu trang rồi tự so — hoặc để đoạn JS cuối trang tính hộ, đúng
           cách trang này vốn làm với `data-sinh`. */
        + `<span class="mn" data-nhan="${esc(l.moc || "")}">Nhận vùng ${esc(l.moc ? "lúc " + l.moc.replace("T", " ") : "từ lúc nào thì bảng không ghi")}</span>`
        + `</div>`);
    }
  } else {
    /* KHỐI TRỐNG LÀ MỘT THÔNG TIN. Ẩn khối đi thì Đức không phân biệt được "không có gì chạy"
       với "khối này hỏng" — và hai cái đó phải phân biệt được bằng mắt. */
    dongKhoi.push(`        <div class="lr"><span class="d">Không có luồng nào đang chạy.</span></div>`);
  }
  dongKhoi.push(`      </div>`);
  /* HAI CHỖ KHỐI NÀY KHÔNG THẤY, nói thẳng trên trang chứ không giấu trong ghi chú kỹ thuật.
     Đức nhìn khối trống rồi tin là không có gì chạy — trong khi có thể đang có hai executor
     chạy ở repo khác — thì sai kiểu đó TỆ HƠN không có khối này. */
  dongKhoi.push(`      <p class="note">Đọc thẳng từ bảng chủ sở hữu trong repo: mỗi dòng là một vùng đang có người giữ. <strong>Khối này không thấy hai thứ.</strong> Một: <strong>luồng đang chạy ở repo khác</strong> — bảng của repo này chỉ thấy repo của nó, nên một luồng đang làm ở repo bộ khung sẽ không hiện ở đây. Hai: <strong>luồng vừa được giao mà chưa kịp nhận vùng</strong> — lúc đó nó chưa để lại dấu vết nào trong repo. Vậy nên dòng <strong>"không có luồng nào đang chạy"</strong> đọc đúng là <strong>"không có luồng nào đang giữ vùng trong repo này"</strong>, chứ không phải "không có gì đang chạy". <strong>Đây là ảnh chụp lúc sinh bảng, không phải số liệu thời gian thực</strong> — "bao lâu rồi" đo từ lúc sinh, nên bảng để lâu không mở thì mọi con số ở đây già đi theo chính nó, chứ không tự làm mới. Câu việc lấy từ sổ nợ và sổ ý tưởng theo mã lane khai lúc nhận vùng; lane không khai mã thì dòng của nó nói thẳng là chưa tra được.</p>`);

  for (const d of dongKhoi) cur.push(KHOA_PREFIX + d);
  cur.push(`${KHOA_PREFIX}    </div>`);

  batDau("needs-duc");
  cur.push(`    <div class="card">
      <div class="sect">Cần Đức — ${ducTong ? esc(`${ducTong} việc đang chờ · ${ducBam} bấm · ${ducChot} chốt · ${ducHoSo.length} từ hồ sơ`) : "Không có việc nào chờ Đức"}</div>
      <div class="bl">`);
  if (ducChuoi.length) {
    for (const c of ducChuoi) {
      cur.push(`        <div class="cg">Chuỗi việc · ${esc(c.ten)}</div>`);
      for (const v of c.muc) {
        /* Câu việc QUA BỘ RÚT GỌN. Khác bản cũ, và đổi có chủ đích: bản cũ in nguyên văn một
           trường được viết riêng cho bảng, còn ở đây chữ đến từ sổ nợ và sổ ý tưởng — nơi
           lane nào cũng gõ tên file và đường dẫn. Ngày 06/09 một câu việc mang tên file mã
           lọt lên bảng và chặn cổng đóng phiên của MỌI lane. */
        cur.push(`        <div class="dr"><div class="h">`
          + `<span class="badge ${v.loai === "CHỐT" ? "b1" : "b0"}">${esc(v.loai)}</span>`
          + `<span class="d">${esc(v.viec)}</span></div>`
          + `<span class="mn">${esc(v.treo === null ? "chưa đo được mục này treo bao lâu"
            : v.treo === 0 ? "vừa nêu ở bản mới nhất" : `treo ${v.treo} ngày`)}`
          + ` · xong thì mở khoá chuỗi ${esc(v.chuoi)}`
          + (v.chuoiLa ? " · mã chuỗi này không tra được trong sổ đề bài" : "")
          + (v.chuoiDong ? " · chuỗi này đã khai đóng" : "")
          + (v.khaiChuoi ? "" : " · mục chưa khai thuộc chuỗi nào, bảng suy theo chỗ nó nằm")
          + `</span>`
          + (v.chan ? `<span class="w">Chưa làm thì: ${esc(v.chan)}</span>` : "")
          + `</div>`);
      }
    }
  }
  /* NGUỒN THỨ HAI, TRONG CÙNG MỘT DANH SÁCH. Không phải một khối riêng: một khối riêng là hai
     nơi authoritative, tức đúng cái luật IA cấm. Huy hiệu `HỒ SƠ` nói rõ dòng này đến từ cơ
     chế nào — Đức thấy được hai cơ chế đang song song mà vẫn chỉ đọc một danh sách. */
  if (ducHoSo.length) {
    cur.push(`        <div class="cg">Chuỗi việc · từ hồ sơ trạng thái, chưa được đánh dấu</div>`);
    for (const a of ducHoSo) {
      cur.push(`        <div class="dr"><div class="h">`
        + `<span class="badge b0">HỒ SƠ</span>`
        + `<span class="d"><strong>${esc(a.unit)}</strong> — ${esc(a.what)}</span></div>`
        + `<span class="mn">mục này chưa có dấu trong sổ nào, nên chưa đo được treo bao lâu`
        + ` · đặt dấu vào dòng của mục thì nó đo được và tự rời bảng khi đóng</span>`
        + `</div>`);
    }
  }
  if (!ducChuoi.length && !ducHoSo.length) {
    /* KHỐI RỖNG PHẢI TỰ KHAI VÌ SAO NÓ RỖNG. Rỗng-vì-chưa-đánh-dấu và rỗng-vì-hết-việc là hai
       chuyện khác hẳn nhau, mà Đức không có cách nào phân biệt nếu bảng im lặng. Đây là điều
       kiện nghiệm thu của đề bài `BANG-CAN-DUC-01`, không phải lời tô điểm.
       Nay khối chỉ rỗng khi CẢ HAI nguồn rỗng, nên câu này nói được điều mạnh hơn bản cũ. */
    cur.push(`        <div class="dr"><span class="d">Không có việc nào chờ Đức: <strong>không mục nào trong sổ được đánh dấu</strong>, và <strong>không hồ sơ nào khai việc chờ tay Đức</strong>. Hai cơ chế cùng rỗng.</span></div>`);
  }
  cur.push(`      </div>
      <p class="note">Chỉ những thứ <strong>Đức phải làm hoặc phải quyết</strong>, và đây là <strong>chỗ duy nhất</strong> trên bảng giữ danh sách đó — nơi khác chỉ trỏ tới. <strong>Hai cơ chế đang cùng nuôi khối này, và trang nói thẳng chứ không để Đức tự đoán.</strong> Một: dấu <strong>@Đức:bấm</strong> / <strong>@Đức:chốt</strong> đặt ngay trên dòng của mục trong sổ nợ, sổ ý tưởng và hồ sơ trạng thái — đóng mục thì dấu mất theo, không phải nhớ đi xoá. Hai: trường <strong>việc chờ tay Đức</strong> trong hồ sơ trạng thái, hiện với huy hiệu <strong>HỒ SƠ</strong> — cơ chế cũ, còn giữ vì có gói chưa được đánh dấu và cắt ngay là mất việc thật. Dòng nào đã có dấu ngay trong hồ sơ của nó thì chỉ hiện một lần. <strong>BẤM</strong> là việc tay vài phút, gom được thành một buổi; <strong>CHỐT</strong> là việc cần Đức nghĩ, mỗi cái một lượt. Số ngày treo <strong>đo bằng lịch sử kho mã</strong>, không đọc đồng hồ. Không có trần số dòng.</p>
    </div>`);
  if (humanUndeclared) {
    cur.push(`    <div class="card">
      <p class="note"><strong>${humanUndeclared} đơn vị chưa trả lời câu "có việc nào chờ Đức không"</strong> — nên danh sách trên có thể còn thiếu. Chưa trả lời khác với trả lời là không: bảng cố ý không gộp hai cái đó.</p>
    </div>`);
  }

  /* ===== NỬA SAU CỦA `in-motion` — từng đơn vị, một dòng, kèm cổng kế ===== */
  batDau("in-motion");
  cur.push(`    <div class="card">
      <div class="sect">Từng việc đang ở đâu — ${luong.length} luồng</div>
      <div class="bl">`);
  for (const r of luong) {
    const tt = trangThaiDonVi(r);
    const gate = gateNext(r.nextStep);
    cur.push(`        <div class="dr"><div class="h">`
      + `<a href="#${esc(unitId(r))}" data-goto="work">${esc(r.name)}</a>`
      + `<span class="badge b${tt.bac}">${esc(tt.chu)}</span></div>`
      + `<span class="d">${esc(gate || "chưa khai việc kế")}</span></div>`);
  }
  cur.push(`      </div>
      <div class="hint" style="margin-top:11px">Đã đóng <strong>${mocDaXong.length} việc lớn</strong>, gần nhất là <strong>${esc(mocDaXong[0].ma || mocDaXong[0].ten)}</strong> (${esc(mocDaXong[0].ngay)}). Danh sách đầy đủ ở khối <strong>Nhật ký &amp; mốc</strong>, tầng <strong>Hệ thống</strong>.</div>
      <p class="note">Mỗi việc <strong>đúng một dòng</strong>: trạng thái, rồi cổng kế tiếp. Xếp theo thứ hạng mỗi đơn vị tự khai, hạng 1 lên đầu; chưa khai hạng thì xuống cuối. Huy hiệu <strong>suy ra từ hồ sơ</strong>, không ai gõ tay: có việc chờ Đức thì thành <strong>CHỜ ĐỨC</strong>, và điều đó thắng mọi trạng thái khác — chi tiết việc đó nằm ở khối <strong>Cần Đức</strong>, không chép lại ở đây. Đang chỉ có ba trạng thái; muốn phân biệt <strong>bị chặn</strong> hay <strong>chờ bằng chứng</strong> thì cần thêm một trường trong hồ sơ, đoán theo văn xuôi thì bảng sẽ nói sai mà không ai biết. Bản đầy đủ của việc kế ở tầng <strong>Việc</strong>.</p>
    </div>`);

  batDau("suc-khoe-assistant");
  cur.push(`    <div class="card">
      <div class="sect">Sức khoẻ Assistant</div>
      <div class="kl">
        <div class="kr"><span class="n">Mốc pilot <em>${esc(mocPilot ? mocPilot.ten : "hồ sơ mốc không còn dòng pilot nào")}</em></span><span class="badge b${mocPilot ? mocPilot.bac : 0}">${esc(mocPilot ? mocPilot.trangThai : "chưa đọc được")}</span></div>
        <div class="kr"><span class="n">Đề bài đang mở của chính tôi</span><span class="badge ${deBaiMo.length ? "b1" : "b2"}">${deBaiMo.length} MỤC</span></div>`);
  /* BA DÒNG ĐẾM SỰ CỐ — Đức chốt định dạng 04/09, làm luôn lượt này.
     HUY HIỆU MÀU: 0 thì để MÀU TRUNG TÍNH, không để màu xanh "tốt". `N = 0` chỉ nghĩa là chưa
     ai ghi nhận sự cố nào — tô xanh cho nó là biến một khoảng trống dữ liệu thành lời tự khen,
     mà lời máy tự khen thì trang này cấm sẵn. Cùng lý do, chữ trên huy hiệu là "ĐÃ GHI NHẬN",
     tuyệt đối không phải "0 lỗi". */
  for (const s of suCo.dong) {
    cur.push(`        <div class="kr"><span class="n">${esc(s.ten)}</span>`
      + `<span class="badge ${s.n ? "b1" : "b0"}">${s.n} ĐÃ GHI NHẬN</span></div>`);
  }
  cur.push(`      </div>
      <p class="note">${deBaiMo.length ? `Đang mở: <strong>${esc(deBaiMo.map((d) => d.ma).join(" · "))}</strong>. ` : ""}Đếm từ trường máy đọc được trong từng đề bài, không dò văn xuôi. Khối này tên là <strong>đề bài đang mở</strong> chứ không phải "sai lệch": cùng một phép đếm gộp cả lỗi thật lẫn đề bài cải tiến, mà gọi một đề bài cải tiến là sai lệch thì sai.</p>
      <div class="hint" style="margin-top:11px">Ba con số trên đếm bằng <strong>nhãn cố định trong nhật ký</strong>, mỗi sự cố đúng một dòng, vẫn nằm trong nhật ký chung chứ không có sổ riêng. Đọc đúng chữ: <strong>đã ghi nhận</strong>. Số <strong>0</strong> nghĩa là <strong>chưa ai ghi nhận sự cố nào</strong> — nó <strong>không</strong> có nghĩa là không có sự cố. Bộ đếm này chỉ đếm lỗi, cố ý <strong>không có mục nào để tôi tự ghi điểm cho mình</strong>; nhãn lạ thì bộ sinh dừng và nói tên nguyên nhân, chứ không lặng lẽ bỏ qua — bỏ qua là đúng cái sự cố ấy biến mất khỏi số đếm.${suCo.la ? ` Ngoài ba dòng trên còn <strong>${suCo.la} sự cố chưa phân loại</strong>, đếm riêng, cố ý không gộp vào.` : ""}</div>
    </div>`);

  batDau("ha-tang");
  cur.push(`    <div class="card">
      <details class="the">
        <summary><span><span class="nm">Hạ tầng</span><span class="sub">khoá làm việc và mốc gói Assistant — mở ra khi cần giao việc song song</span></span></summary>
        <div class="in">
          <div>
            <div class="sect">Khoá làm việc — ${khoa.length} khoá</div>
            <div class="kl">`);
  /* DẤU DÒNG KHOÁ PHẢI Ở ĐẦU DÒNG, kể cả sau khi bảng khoá đã vào trong khối gập.
     `compareOverview` lọc bằng `line.startsWith(KHOA_PREFIX)`. Thụt lề trước dấu là mọi lượt
     đổi bận↔mở lại làm bảng lệch HEAD, và KHÔNG test nào bắt được ở chỗ đó — nó chỉ hiện ra
     lúc một phiên nào đó bị cổng xuất bản từ chối mà không hiểu vì sao. Giữ đúng dạng
     `${KHOA_PREFIX}` rồi mới tới khoảng trắng và thẻ mở. */
  for (const k of khoa) {
    cur.push(`${KHOA_PREFIX}              <div class="kr"><span class="n">${esc(k.ten)}</span>` +
      `<span class="badge ${k.ban ? "b1" : "b2"}">${k.ban ? "BẬN" : "MỞ"}</span></div>`);
  }
  cur.push(`            </div>
            <div class="hint" style="margin-top:11px">Đây là <strong>ảnh chụp lúc sinh bảng</strong>, không phải trạng thái thời gian thực — nó theo lần ghi gần nhất vào repo. Khoá <strong>MỞ</strong> là chỗ giao được việc mới ngay; khoá <strong>BẬN</strong> thì chỉ đọc, đừng giao thêm.</div>
            <p class="note">Bảng này trả lời đúng một câu: <strong>còn mấy chỗ trống để giao việc song song</strong>. Ai đang giữ và đang làm gì thì xem khối <strong>Đang chạy</strong> ở tầng <strong>Trang chính</strong> — chỗ này cố ý để trống tên. Khoá của một gói hiện theo tên gói, đã bỏ phần thư mục cho gọn.</p>
          </div>
          <div>
            <div class="kl">
              <div class="kr"><span class="n">Gói Assistant <em>mốc đang chạy</em></span><span class="badge b${mocDangChay ? mocDangChay.bac : 0}">${esc(mocDangChay ? mocDangChay.ten : "chưa có mốc nào đang chạy")}</span></div>
            </div>
            <p class="note">Ba mốc của gói thu lại thành một chip: tên mốc đang chạy, đọc lại từ hồ sơ mốc chứ không gõ tay ở đây. Mốc đổi vài tuần một lần nên nó không đáng một khối riêng mỗi ngày; cả ba mốc kèm trạng thái vẫn nằm trong hồ sơ.</p>
          </div>
        </div>
      </details>
    </div>`);

  /* ===== WORK · KHỐI `extension` =====
   * Bảng chỉ mục (trước ở tab Tổng quan) và phần chi tiết nay CÙNG MỘT KHỐI. Trước lượt
   * refactor chúng nằm ở hai tab khác nhau, nên bảng chỉ mục là một bản sao thứ hai của danh
   * sách extension đặt trên trang chủ — đúng cái Đức phàn nàn. Nay nó là mục lục của chính
   * khối nó nằm trong. */
  batDau("extension");
  cur.push(`    <div class="card">
      <div class="sect">Extension trong repo — bấm tên để xem chi tiết</div>
      <div class="big">`);
  for (const r of model.rows) {
    const n = debtOf.get(r.name);
    cur.push(bigRow("work", unitId(r), r.name, chipDonVi(r),
      n === undefined ? "extension" : `${n} việc nợ`));
  }
  cur.push(`      </div>
      <p class="note">${model.rows.length} extension. Chi tiết ngay dưới.</p>
    </div>

    <div class="card">
      <div class="sect">Chi tiết từng extension</div>`);
  for (const r of model.rows) {
    const brief = readBrief(deps, r);
    const n = debtOf.get(r.name);
    const twoBranch = /chatgpt|gemini/i.test(r.id || r.name);
    const duc = String(r.humanAction ?? "").trim();
    cur.push(`      <details class="the" id="${unitId(r)}">
        <summary>
          <span><span class="nm">${esc(r.name)}</span><span class="sub">${esc(brief.text || "Mô tả chưa khai được — " + brief.why)}</span></span>
          ${chipDonVi(r)}
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

    /* DANH TÍNH — ba trường TUỲ CHỌN trong hồ sơ trạng thái. Đức đặt 08/09: *"cập nhật vào
     * dashboard danh tính của extension, cả chức năng, khả năng"*.
     *
     * Chỉ vẽ khi CÓ KHAI. Bốn gói cũ hôm nay không khai, và một danh sách nửa là "chưa khai"
     * thì người đọc học cách bỏ qua cả khối — đúng cái bệnh mà lượt refactor IA vừa chữa.
     *
     * "KHÔNG làm được" đứng NGANG HÀNG "Làm được", không phải phần phụ: hai extension này khác
     * nhau chủ yếu ở chỗ chúng KHÔNG làm gì. HNX Fetch không bấm được — đó là tính năng, và nó
     * là lý do gói đó tồn tại riêng. */
    const lamDuoc = truongTuyChon(deps, r, "lam_duoc");
    if (lamDuoc) {
      const khong = truongTuyChon(deps, r, "khong_lam_duoc");
      const dung = truongTuyChon(deps, r, "dung_the_nao");
      cur.push(`          <div>
            <h2>Nó là cái gì</h2>
            <dl class="kv">
              <dt>Làm được</dt><dd>${esc(lamDuoc)}</dd>
              ${khong ? `<dt>KHÔNG làm được</dt><dd>${esc(khong)}</dd>` : ""}
              ${dung ? `<dt>Dùng thế nào</dt><dd>${esc(dung)}</dd>` : ""}
            </dl>
          </div>`);
    }
    if (twoBranch && features.length) {
      cur.push(`          <div>
            <h2>Tính năng đã đo</h2>
            <div class="feat">
              <div class="fr fh"><span>Tính năng</span><span>GPT</span><span>Gemini</span></div>`);
      for (const f of features) {
        const cell = (v) => v === true ? `<span class="y">có</span>` : v === false ? `<span class="x">không</span>` : `<span class="q">?</span>`;
        cur.push(`              <div class="fr"><span>${esc(f.name)}</span>${cell(f.gpt)}${cell(f.gemini)}</div>`);
      }
      cur.push(`            </div>
            <p class="note">Lấy từ bảng đối chiếu hai nhánh trong repo, phần đã đo. Bảng đó chỉ so GPT với Gemini nên extension khác không có cột.</p>
          </div>`);
    } else {
      cur.push(`          <p class="note">Chưa có bảng tính năng cho extension này. Bảng đối chiếu trong repo hiện chỉ so hai nhánh GPT và Gemini.</p>`);
    }
    cur.push(`        </div>
      </details>`);
  }
  cur.push(`      <p class="note">Mô tả lấy từ file giới thiệu của từng gói. Gói nào tiêu đề không khớp tên đơn vị thì bảng <strong>để trống và nói rõ lý do</strong>, không hiện chữ sai.</p>
    </div>`);

  /* ===== WORK · KHỐI `y-tuong` — thanh bậc (trước ở tab Tổng quan) rồi tới chi tiết ===== */
  batDau("y-tuong");
  cur.push(`    <div class="card">
      <div class="sect">Ý tưởng đang ở bước nào — ${ideas.length} ý tưởng</div>
      <div class="rm">
        <div class="rmr rmh"><span>Ý tưởng</span><div class="rms">`);
  for (const label of ROADMAP_STEPS) cur.push(`          <span class="rml">${esc(label)}</span>`);
  cur.push(`        </div><span>Đang ở bậc</span></div>`);
  if (ideas.length) {
    for (const idea of ideas) cur.push(roadmapRow(idea));
  } else {
    /* Sổ trống thì KHÔNG dựng link — link không có đích là lỗi âm thầm: Đức bấm, không có gì
       xảy ra. Phép kiểm link ghim đúng một link cho mỗi ý tưởng, nên hàng này phải trơ. */
    cur.push(`        <div class="rmr"><span class="meta">Sổ ý tưởng đang trống.</span></div>`);
  }
  cur.push(`      </div>
      <p class="note">Ba bước là đường đi thật của một ý tưởng. <strong>Nghỉ</strong> không phải bước thứ tư — ý tưởng đã nghỉ hiện thanh <strong>rỗng có gạch ngang</strong>, để không ai đọc nhầm là gần xong. Bấm tên để nhảy xuống chi tiết ngay dưới.</p>
    </div>

    <div class="card">
      <div class="sect">Sổ ý tưởng — phòng chờ của cả repo</div>`);
  for (const idea of ideas) {
    cur.push(`      <details class="the" id="y-${slug(idea.code)}">
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
      cur.push(`            <dt>${esc(kv[0])}</dt><dd>${esc(shorten(kv[1], 200))}</dd>`);
    }
    cur.push(`          </dl>`);
    if (idea.body.length) {
      const items = idea.body.slice(0, 18).map((line) => {
        const bullet = /^[-*]\s+(.+)$/.exec(line);
        return bullet ? `<li>${esc(shorten(bullet[1], 200))}</li>` : `<p>${esc(shorten(line, 230))}</p>`;
      });
      cur.push(`          <div class="prose">${items.join(NL)}</div>`);
    }
    cur.push(`        </div>
      </details>`);
  }
  cur.push(`      <p class="note">Ý tưởng nào đã có nhà thì rời sổ nên không hiện ở đây nữa. Đức cứ viết một câu, tôi chuẩn hoá lại.</p>
    </div>`);

  /* ===== SYSTEM · KHỐI `van-hanh` ===== */
  batDau("van-hanh");
  cur.push(`    <div class="card">
      <div class="sect">Làm mới bảng này</div>
      <div class="hint">Bảng là ảnh chụp, <strong>không tự cập nhật</strong>. Dải đỏ ở đầu trang tự bật khi Đức mở nó vào một ngày khác ngày sinh — nó tính lúc XEM, không lúc sinh, nên không cần dựng lại mới biết là cũ. <strong>Cả ba cách làm mới đều là nhấp đúp một file trong thư mục bang-trang-thai ở gốc repo</strong> — không cần gõ lệnh, không cần chờ ai.</div>
      <div class="bl">
        <div class="bi"><span class="c">›</span><span class="d"><strong>Xem-bang.cmd</strong> — xem ngay một lần: bảng được dựng lại rồi tự mở bằng trình duyệt.</span></div>
        <div class="bi"><span class="c">›</span><span class="d"><strong>Mo-may-chu.cmd</strong> — mở bảng có sẵn <strong>nút Làm mới ngay</strong> ngay trong trang, bấm bao nhiêu lần cũng được. Tắt bằng cách đóng cửa sổ đen tên "Bang trang thai".</span></div>
        <div class="bi"><span class="c">›</span><span class="d"><strong>Bat-tu-chay.cmd</strong> — bật cho bảng tự dựng lại mỗi lần bật máy; Đức chỉ mở trang rồi bấm F5. Gỡ bằng <strong>Tat-tu-chay.cmd</strong>.</span></div>
      </div>
      <p class="note">Có đúng một lúc bảng <strong>cố ý ngừng dựng lại</strong>: khi một phiên đang sửa dở chính bộ dựng bảng. Lúc đó trang nói thẳng lý do, thay vì lặng lẽ đưa Đức bản cũ trông y như bản mới. Bản nằm trong repo thì mỗi phiên đóng lại đều bị đối chiếu với trạng thái repo, nên nó <strong>không thể âm thầm cũ</strong>. Nội dung bảng suy hoàn toàn từ lần commit gần nhất, không nhìn giờ đồng hồ — nếu nó nhìn đồng hồ thì sang ngày là mọi phiên bị chặn đẩy việc lên dù không dữ liệu nào đổi.</p>
    </div>

    <div class="card">
      <div class="sect">Nhiều việc chạy cùng lúc — cách nó chạy</div>
      <div class="hint">Nhiều AI làm cùng lúc trong repo này mà không phá nhau, vì <strong>mỗi vùng chỉ một AI được ghi tại một thời điểm</strong>. Vùng của người khác thì chỉ được đọc. Hiện có <strong>${soLuong} vùng</strong>, nên tối đa <strong>${soLuong} việc</strong> chạy song song được — không nhiều hơn, vì việc thứ ${soLuong + 1} sẽ phải chờ một vùng nào đó được trả.</div>
      <div class="bl">
        <div class="bi"><span class="c">›</span><span class="d">Hai AI cùng muốn một vùng: <strong>người sau bị từ chối</strong>, không phải ghi đè. Muốn lấy vùng đang có chủ thì <strong>phải hỏi Đức</strong>, và câu chốt của Đức được ghi vào bảng quyền để phiên vừa mất vùng đọc được.</span></div>
        <div class="bi"><span class="c">›</span><span class="d">Mỗi việc xong đều phải qua <strong>cổng đóng phiên</strong>. Cổng đỏ thì chưa xong — không AI nào được tự báo xong.</span></div>
      </div>`);
  if (coChe.length) {
    cur.push(`      <details class="the">
        <summary><span><span class="nm">${coChe.length} cơ chế giữ cho không giẫm chân</span><span class="sub">mỗi cái trả lời đúng một câu</span></span></summary>
        <div class="in"><div class="bl">`);
    for (const c of coChe) {
      cur.push(`          <div class="bi"><span class="c">›</span><span class="d"><strong>${esc(c.ten)}</strong> — ${esc(c.traLoi)}</span></div>`);
    }
    cur.push(`        </div></div>
      </details>`);
  }
  if (batBien.length) {
    cur.push(`      <details class="the">
        <summary><span><span class="nm">${batBien.length} điều không được phá</span><span class="sub">mỗi cái sinh ra từ một lần hỏng thật</span></span></summary>
        <div class="in"><div class="bl">`);
    for (const b of batBien) {
      cur.push(`          <div class="bi"><span class="c">${esc(b.so)}</span><span class="d">${esc(b.cau)}</span></div>`);
    }
    cur.push(`        </div></div>
      </details>`);
  }
  cur.push(`      <p class="note">Số vùng và các mục trên <strong>đọc lại từ luật</strong>, không phải bản chép — nên bảng không thể nói khác luật. Bảng <strong>cố ý không hiện ai đang giữ vùng nào</strong>: chủ vùng đổi liên tục trong ngày, mà bảng được cổng so mỗi phiên, nên nhúng vào là mọi phiên bị chặn đẩy việc dù chẳng có gì đổi. Muốn biết ai đang giữ gì thì hỏi AI — đó là số liệu sống, không thuộc một ảnh chụp.</p>
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
  `);

  /* ===== SYSTEM · KHỐI `suc-khoe` ===== */
  batDau("suc-khoe");
  cur.push(`    <div class="card">
      <div class="sect">Sức khoẻ — bốn phép dò, và mỗi phép đã dò bao nhiêu</div>
      <div class="hgrid">`);
  for (const c of checks) {
    cur.push(`        <div class="hc ${c[1] === 0 ? "zero" : "bad"}"><span class="n">${c[1]}</span><span class="l">${esc(c[0])}</span><span class="w">${esc(c[2])}</span></div>`);
  }
  cur.push(`      </div>
      <p class="note">${allClean
    ? "Cả bốn phép đều sạch. Con số 0 ở đây là 0 <em>trên mẫu đã dò ghi ngay dưới nó</em> — không phải 0 vì chưa dò gì."
    : "Có phép chưa sạch. Số khác 0 là số việc thật đang thiếu, không phải cảnh báo chung."}</p>
    </div>

    <div class="card">
      <div class="sect">Việc còn nợ — ${debtTotal} mục đang mở</div>
      <div class="bl">`);
  for (const d of debt) {
    cur.push(`        <div class="bi"><span class="c">${d.n}</span><span class="d">${esc(d.name)}</span></div>`);
  }
  cur.push(`      </div>
      <details class="the" style="margin-top:11px">
        <summary><span><span class="nm">Con số này đếm thế nào</span><span class="sub">và vì sao nó thà đếm thừa hơn đếm thiếu</span></span></summary>
        <div class="in"><div class="prose">
          <p>Đếm số mục chưa đóng trong sổ nợ của từng gói, <strong>và trong sổ nợ hạ tầng ở gốc repo</strong>. Một mục tính là đã đóng khi nó bị gạch ngang, hoặc khi dòng của nó <strong>mở đầu</strong> bằng chữ xong.</p>
          <p>Sổ ở gốc repo đóng mục theo cách khác: thêm một dòng "đóng" ở cuối sổ, không sửa lại khối cũ. Nên ở riêng sổ đó, tiêu đề không bao giờ là dấu đóng — chỉ dòng thêm ở cuối mới là.</p>
          <p>Dấu đóng phải nằm ở đầu dòng, không tìm giữa câu — vì có mục viết "gỡ khoá sau khi việc kia xong", chữ xong ở đó là một điều kiện chứ không phải trạng thái. Tìm giữa câu là đóng oan một việc đang mở, tức bảng báo <em>thiếu</em> nợ. Mục nào viết dấu đóng ở giữa câu sẽ bị tính là còn mở: cố ý lệch về phía báo thừa.</p>
        </div></div>
      </details>
      <p class="note">Bảng cố ý KHÔNG liệt kê mã lỗi. Chi tiết nằm trong sổ nợ của từng gói.</p>
    </div>
  `);

  /* ===== SYSTEM · KHỐI `cau-truc` — khối duy nhất được in đường dẫn ===== */
  batDau("cau-truc");
  cur.push(`    <div class="map">
      <div class="card">
        <div class="sect">Thư mục ở tầng ngoài cùng — ${areas.length} vùng</div>
        <div class="tree">`);
  for (const a of areas) {
    const chu = a.steward === null ? "từng gói tự giữ" : a.steward;
    cur.push(`          <div class="tr"><span class="d">${esc(a.dir)}</span>` +
      `<span class="o">${esc(chu)}</span><span class="c">${a.files} file</span></div>`);
  }
  cur.push(`        </div>
        <p class="note">Cột giữa là <strong>ai được ghi vào đó</strong>. Một vùng chỉ một AI được ghi tại một thời điểm; vùng của người khác thì chỉ được đọc. <code class="mono">workers/</code> không có chủ chung — từng gói extension tự giữ riêng.</p>
      </div>

      <div class="card">
        <div class="sect">File ở gốc repo — ${rootFiles.length} file</div>
        <div class="fl">`);
  for (const f of rootFiles) {
    cur.push(`          <span class="${f.maySinh ? "g" : ""}">${esc(f.file)}</span>`);
  }
  cur.push(`        </div>
        <p class="note">Ô <strong>xanh</strong> là file <strong>máy sinh</strong> — đừng sửa tay, sửa là mất ở lần sinh sau. Số còn lại là chữ của người.</p>
      </div>

      <div class="card">
        <div class="sect">Khi cần gì thì mở file nào — ${openWhen.length} lối</div>`);
  for (const r of openWhen) {
    cur.push(`        <div class="ow"><span>${esc(r.when)}</span>` +
      `<span class="t">${esc(r.target)}</span></div>`);
  }
  cur.push(`        <p class="note">Bảng này <strong>đọc lại từ luật gốc</strong>, không phải bản chép — nên nó không thể nói khác luật. Dòng có lệnh là việc chạy được, không phải file để mở.</p>
      </div>
    </div>
  `);

  /* ===== SYSTEM · KHỐI `nhat-ky` ===== */
  batDau("nhat-ky");
  cur.push(`    <div class="card">
      ${/* NHÃN "Nhật ký & mốc" GIỮ NGUYÊN, chuyển chỗ chứ không xoá. Đức chốt chính nhãn đó
           cùng lượt thêm thẻ việc-lớn-đã-đóng; refactor IA gỡ thanh tab chín mục nên nhãn phải
           về đúng chỗ khối, không được biến mất — cảnh báo và nhãn thì chuyển tầng, không xoá. */ ""}
      <div class="sect">Nhật ký &amp; mốc · Quyết định đã chốt — ${decisionCount} bản ghi</div>
      <div class="prose"><p>Mỗi quyết định là một file bất biến: đã chốt thì không sửa được, chỉ thay bằng bản mới. Bản bị thay vẫn giữ nguyên để tra lại được. Hiện có ${supersededCount} đơn vị đã bị bản mới thay thế.</p></div>
      <details class="the" style="margin-top:11px" open>
        <summary><span><span class="nm">${decisions.top.length} quyết định số cao nhất</span><span class="sub">số KHÔNG phải ngày — mỗi phạm vi đánh số riêng</span></span></summary>
        <div class="in"><div class="bl">`);
  for (const d of decisions.top) {
    cur.push(`          <div class="bi"><span class="c">${esc(d.num)}</span><span class="d">${esc(d.name)}<br><span class="meta">${esc(d.where)}${d.state ? " · " + esc(d.state) : ""}</span></span></div>`);
  }
  cur.push(`        </div></div>
      </details>
    </div>`);

  /* THẺ THỨ HAI · VIỆC LỚN ĐÃ ĐÓNG — `MOC-DA-XONG-01`.
     Đứng CẠNH thẻ quyết định, không trộn vào: thẻ trên trả lời "Đức đã chốt những gì" (đọc
     ADR), thẻ này trả lời "đã làm xong những gì" (đọc đề bài `status: done`). Hai câu khác
     nhau, hai nguồn khác nhau — nên không có dòng nào lặp ở cả hai chỗ. */
  cur.push(`
    <div class="card">
      <div class="sect">Việc lớn đã đóng — ${mocDaXong.length} việc</div>
      <div class="prose"><p>Những việc lớn đã làm xong, mới nhất lên đầu. Ngày là <strong>lần cuối repo chạm tới đề bài đó</strong>, đọc từ lịch sử git chứ không gõ tay — nên nó không mục đi được.</p></div>
      <div class="bl" style="margin-top:11px">`);
  for (const m of mocDaXong) {
    cur.push(`        <div class="lr"><div class="h">`
      + (m.ma ? `<span class="ln">${esc(m.ma)}</span>` : "")
      + `<span class="mn">${esc(m.ngay)}</span></div>`
      + `<span class="d">${esc(m.ten)}</span></div>`);
  }
  cur.push(`      </div>
      <p class="note">Đếm từ <strong>đề bài đã đóng</strong> trong repo, mỗi đề bài đúng một dòng. Thẻ này <strong>cố ý không đọc quyết định</strong>: thẻ trên đã đọc rồi, và hai bản của một danh sách thì sớm muộn đếm ra hai số khác nhau mà không ai biết bên nào đúng. Đề bài phiên không khai mã thì chỉ hiện tên — bảng để trơ chứ không đặt hộ mã.</p>
    </div>
  `);

  /* ===== SYSTEM · KHỐI `tra-cuu` ===== */
  batDau("tra-cuu");
  cur.push(`    <div class="card">
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
    </div>`);

  /* ===== DỰNG BA TẦNG, VÀ CANH HỢP ĐỒNG `TANG` — fail-closed =====
   *
   * Bốn phép canh, và mỗi phép sinh ra từ một cách bảng NÓI DỐI mà không ai thấy:
   *   ⑴ khối sinh ra mà không khai ở `TANG`  → nó không hiện trên trang, im lặng.
   *   ⑵ khối khai ở `TANG` mà không sinh ra  → tầng thiếu một phần, im lặng.
   *   ⑶ khối HOME rỗng                       → Đức mở bảng, thấy khoảng trống, tin là hết việc.
   *   ⑷ chỉ số kỹ thuật lọt vào HOME         → đúng cái luật IA của Đức cấm.
   *
   * NÉM chứ không cảnh báo. Trang này là thứ Đức đọc để ra quyết định, và ba trong bốn ca trên
   * đều khiến trang trông BÌNH THƯỜNG trong khi nó đã thiếu — cùng lý lẽ với `MOC_HEAD_HONG`:
   * chết sớm kèm tên nguyên nhân tốt hơn xanh giả. */
  kiemHopDongTang(khoiTang);
  for (const [tab, , ids] of TANG) {
    p.push(`
  <div role="tabpanel" data-pane="${tab}"${anKhung(tab)}>`);
    for (const id of ids) {
      p.push(`    <div data-sect="${id}">`);
      for (const dong of khoiTang.get(id)) p.push(dong);
      p.push(`    </div>`);
    }
    p.push(`  </div>`);
  }
  /* Canh ⑷ đo trên CHÍNH CHỮ ĐÃ DỰNG, không đo trên ý định. Một khối bị khai sang tầng khác
     thì hai vòng trên vẫn xanh — chỉ chữ trong tầng HOME mới nói được sự thật đó. */
  kiemChiSoHome(TANG[0][2].flatMap((id) => khoiTang.get(id)).join(NL));

  p.push(`
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

  // ĐÃ GỠ (06/09, theo đề bài BANG-DANG-LAM-01): đoạn JS tính "bao lâu rồi" cho khối đang-làm-gì
  // lúc MỞ trang. Nó lấy đồng hồ của người xem trừ đi một mốc đã đóng băng trong ảnh chụp, nên
  // một khối cũ tám tiếng vẫn hiện ra như số liệu thời gian thực — Đức nhìn thấy hai luồng đã
  // trả khoá từ lâu mà vẫn tin chúng đang chạy. Nay tuổi được tính lúc SINH, từ giờ commit của
  // HEAD, nên nó không đọc đồng hồ ai cả và ảnh chụp cũ trông đúng là cũ.
  // Dải đỏ dưới đây thì NGƯỢC LẠI và cố ý: nó trả lời "hôm tôi mở, trang này còn mới không".

  // Dải đỏ tính tuổi lúc XEM, không lúc sinh: trang tĩnh đem đăng thì lúc sinh nó luôn mới,
  // mà cái Đức cần biết là "hôm tôi mở, nó còn mới không".
  var b = document.getElementById("cu");
  if (b && b.dataset.sinh) {
    var d = new Date();
    var nay = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    if (nay > b.dataset.sinh) {
      b.dataset.hien = "1";
      b.textContent = "Bảng sinh ngày " + b.dataset.sinh + ", hôm nay " + nay
        + " — số liệu có thể đã cũ. Mở thư mục bang-trang-thai ở gốc repo rồi nhấp đúp"
        + " Xem-bang.cmd để có bản mới.";
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


export const TRANG_FILE = "DASHBOARD-Chrome-Extension-AI-Agentic.html";

/* MỐC THỜI GIAN CỦA BẢN COMMIT SUY TỪ HEAD, KHÔNG TỪ ĐỒNG HỒ.
 *
 * Vì sao đây là chỗ dễ làm hỏng cả repo: `DASHBOARD-Chrome-Extension-AI-Agentic.html` nay nằm trong khối `generators`,
 * nên cổng chạy `--check-head` mỗi phiên và `safe-push` TỪ CHỐI ĐẨY khi nó lệch. Nếu nội
 * dung file phụ thuộc giờ đồng hồ (dòng "hôm nay" / "N ngày trước") thì sang ngày mới là
 * nó lệch HEAD **dù không một dữ liệu nào đổi** — và mọi phiên khác bị chặn push chỉ vì một
 * ngày đã qua. Đó là tự bắn vào chân cả repo.
 *
 * Nên bản commit lấy `today` = chính mốc ngày của HEAD: `ageDays` luôn 0, chữ luôn là
 * "hôm nay", và output suy hoàn toàn từ HEAD. Việc BÁO CŨ không mất đi — nó do đoạn JS
 * trong trang tự tính lúc Đức MỞ trang, từ `data-sinh`. Đúng chỗ hơn: một trang tĩnh không
 * biết trước bao giờ có người mở nó. */
/* HAI BẢN CỦA CÙNG MỘT TRANG, VÀ CHÚNG PHẢI TỰ KHAI LÀ BẢN NÀO — N-11.
 *
 * Đức báo thẳng 06/09: *"tôi thấy có 2 dashboard nên bị confuse."* Repo có bản đã commit ở
 * gốc (`DASHBOARD-*.html`) và bản sống `bang-trang-thai/BANG.html`, nội dung gần như giống
 * hệt — mà **gộp làm một thì không được**: bản ở gốc phải NẰM YÊN trong git để GPT audit qua
 * GitHub đọc được, còn bản sống phải được GHI ĐÈ liên tục, và ghi đè vào file đã commit là
 * làm bẩn cây làm việc của mọi lane đang chạy.
 *
 * Nên: không gộp, mà bắt mỗi bản NÓI RA nó là bản nào. Câu khai nằm ở DÒNG ĐẦU của file (chỗ
 * máy kiểm được) và ở dải mốc đầu trang (chỗ Đức nhìn thấy). `bang-trang-thai/loi.mjs` đổi
 * hai chỗ đó sang câu của bản sống — đổi bằng cách thay chuỗi, nên hai câu phải là HẰNG SỐ
 * dùng chung, đừng gõ lại chữ ở hai file.
 *
 * ĐỪNG trông cậy vào việc Đức nhớ bản nào là bản nào: link cũ còn nằm trong lịch sử trình
 * duyệt và trong tin nhắn cũ. */
export const KHAI_BAN_CHUP = "BẢN CHỤP trong git — không tự cập nhật. Bản SỐNG: nhấp đúp bang-trang-thai\\Xem-bang.cmd";
export const KHAI_BAN_SONG = "BẢN SỐNG — dựng lại mỗi lần bạn nhấp. Bản chụp trong git: DASHBOARD-Chrome-Extension-AI-Agentic.html ở gốc repo";
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

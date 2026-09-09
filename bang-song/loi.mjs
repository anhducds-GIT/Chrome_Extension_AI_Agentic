/* LÕI CHUNG CỦA BA CỬA VÀO BẢNG SỐNG.
 *
 * Ba cửa (nhấp đúp · máy chủ tại chỗ · tiến trình nền) chỉ khác nhau ở CÁCH ĐƯỢC GỌI. Phần
 * "sinh lại bảng cho an toàn" viết ĐÚNG MỘT LẦN, ở đây. Ba bản sao của cùng một logic là ba
 * bản sẽ trôi khác nhau — repo này đã trả giá cho đúng chuyện đó nhiều lần.
 *
 * ================== VÌ SAO FILE NÀY TỒN TẠI ==================
 *
 * `DASHBOARD-<tên>.html` ở gốc repo suy HOÀN TOÀN từ HEAD, và mặc định đó đúng: nó là artifact
 * đã commit, cổng đóng phiên đối chiếu nó với HEAD ở MỌI phiên.
 *
 * Nhưng nó trả lời câu hỏi về QUÁ KHỨ. Đo 06/09 trên chính lịch sử repo này: bốn khoá một phiên
 * giữ suốt lượt làm việc nằm trong **0/6 commit** — nên bảng suy từ HEAD nói "không có luồng nào
 * chạy" trong khi có bốn. Người chốt F5 cả buổi cũng chỉ thấy số 0.
 *
 * Bảng SỐNG trả lời câu về BÂY GIỜ. Nó đọc bảng quyền từ ĐĨA (`--khoa-song`), nên nó phải nằm
 * NGOÀI git — xem `.gitignore`. Đo cái giá trước khi làm: bảng sống làm bẩn cây làm việc, và
 * cổng của một lane khác lúc đó rơi vào BỎ. Nhưng cổng ĐÃ ở trạng thái BỎ sẵn vì `.agents/
 * claims.json` cũng đang bẩn — hai cột đo giống hệt nhau, nên bảng sống thêm **0 đồng chi phí**.
 * Với điều kiện nó không được commit. Đó là lý do file ra nằm ngoài git, không phải sở thích.
 *
 * ================== CẤM, KHÔNG PHẢI "CHƯA LÀM" ==================
 *
 * Cửa ③ chạy khi không ai nhìn, nên mọi lỗi ở đây là lỗi im lặng. Bốn chốt dưới đây không cái
 * nào tuỳ chọn. `tests/bang-song.mjs` ghim từng cái, kèm đột biến kiểm.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const THU_MUC = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(THU_MUC, "..");

export const FILE_BANG = path.join(THU_MUC, "BANG.html");
export const FILE_TRANG_THAI = path.join(THU_MUC, "trang-thai.json");
export const FILE_DUNG = path.join(THU_MUC, "DUNG.txt");

/* CHỐT ⑴ — khoá nào mà lane giữ nó thì NGỪNG SINH.
 *
 * Bộ sinh nằm trong `scripts/`. Lane giữ vùng đó có thể đang sửa dở CHÍNH bộ sinh, và một bảng
 * sinh từ mã nửa vời trông y hệt một bảng thật. Lần đó có người phát hiện; một tiến trình nền
 * thì không.
 *
 * `template/` cũng vào đây: bản trích chứa bản sao của bộ sinh, và một lượt sinh bản trích ghi
 * đè hàng chục file cùng lúc.
 *
 * SUY TỪ `.repo-structure.json`, KHÔNG GÕ TÊN KHOÁ VÀO ĐÂY. File này đi theo bản trích, và repo
 * đích đặt tên khoá khác (`code`, `_src`, `core`…) thì một danh sách gõ tay khiến chốt này
 * **im lặng không bao giờ nổ** — đúng loại lỗi mà chính nó sinh ra để chặn, ở đúng chỗ không ai
 * nhìn. Đọc không được hình dạng repo → trả DANH SÁCH RỖNG là sai, nên fail-closed bằng cách
 * khác: `xetChot` coi "không biết vùng nào chặn" là **ngừng sinh**. */
export const THU_MUC_BO_SINH = Object.freeze(["scripts/", "template/"]);

export function khoaChanSinhFrom(rawHinhDang) {
  let areas;
  try { areas = JSON.parse(String(rawHinhDang))?.areas; } catch (_) { return null; }
  if (!areas || typeof areas !== "object") return null;
  const ra = [];
  for (const d of THU_MUC_BO_SINH) {
    const st = areas[d]?.steward;
    if (st && !ra.includes(st)) ra.push(st);
  }
  return ra.length ? Object.freeze(ra) : null;   // null = KHÔNG BIẾT, khác hẳn [] = không có vùng nào
}

export const KHOA_CHAN_SINH = (() => {
  try { return khoaChanSinhFrom(fs.readFileSync(path.join(ROOT, ".repo-structure.json"), "utf8")); } catch (_) { return null; }
})();

/* CHỐT ⑷ — nhịp. 30 giây, và mỗi nhịp chỉ SO DẤU VÂN TAY trước.
 * Một lượt sinh đo được là ~15,5 giây, tức nửa nhịp. Sinh mỗi lần một file đổi là đốt máy vô
 * ích: một lượt lane làm việc đổi hàng chục file trong vài giây. */
export const NHIP_MS = 30_000;

const gitRa = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" }).trim();

/** Dấu vân tay của "repo đang ở trạng thái nào". Đổi thì mới đáng sinh lại.
 *
 *  Ba thành phần, và cả ba đều cần:
 *    · HEAD      — nội dung trang suy từ đây;
 *    · bảng quyền trên ĐĨA — thứ duy nhất bảng sống thêm được so với bản commit;
 *    · danh sách file sửa dở — vì dấu vết khoá ("repo chưa thấy dấu vết") đọc nó.
 *
 *  Git hỏng → trả `null`, và `null` KHÔNG bằng bất cứ dấu vân tay nào, kể cả `null` trước đó
 *  (xem `canSinh`). Fail-closed: không đo được thì đừng nói là "không có gì đổi". */
export function vanTay() {
  try {
    const head = gitRa("rev-parse", "HEAD");
    const ban = gitRa("status", "--porcelain", "-uall");
    let khoa = "";
    try { khoa = fs.readFileSync(path.join(ROOT, ".agents/claims.json"), "utf8"); } catch (_) { khoa = "(khong-doc-duoc)"; }
    /* BĂM, không giữ nguyên văn. `trang-thai.json` được phục vụ qua HTTP, và giữ nguyên văn
     * là nhét cả bảng quyền vào đó — một trường chỉ dùng để SO SÁNH thì không việc gì phải
     * đọc được, và đọc được thì sớm muộn có người đọc nó như dữ liệu thật. */
    return createHash("sha256").update(`${head}${ban}${khoa}`).digest("hex").slice(0, 16);
  } catch (_) {
    return null;
  }
}

/** So dấu vân tay. `null` ở BẤT KỲ vế nào = phải sinh lại.
 *  Cố ý không dùng `===` trần: `null === null` là `true`, và nó sẽ biến "git hỏng hai nhịp
 *  liền" thành "repo không đổi gì" — đúng kiểu fail-open mà repo này cấm. */
export function canSinh(cu, moi) {
  if (cu === null || moi === null || cu === undefined) return true;
  return cu !== moi;
}

/** CHỐT ⑴ — có lane nào đang giữ khoá chặn sinh không?
 *  Trả `{ ngung, ly_do }`. Bảng quyền hỏng → NGỪNG, không đoán. */
export function xetChot(rawKhoa, chanSinh = KHOA_CHAN_SINH) {
  let claims;
  try { claims = JSON.parse(String(rawKhoa))?.claims; } catch (_) { claims = null; }
  if (!claims || typeof claims !== "object") {
    return { ngung: true, ly_do: "không đọc được bảng quyền — ngừng sinh cho chắc, không đoán." };
  }
  if (!chanSinh) {
    return { ngung: true, ly_do: "không đọc được `.repo-structure.json` nên không biết vùng nào chứa bộ sinh — ngừng sinh cho chắc, không đoán." };
  }
  const giu = chanSinh
    .filter((k) => claims[k]?.owner)
    .map((k) => `${k} (${claims[k].owner})`);
  if (giu.length) {
    return {
      ngung: true,
      ly_do: `một luồng đang giữ ${giu.join(", ")}. Bộ sinh nằm trong vùng đó và có thể đang sửa dở, nên bảng này DỪNG cập nhật cho tới khi luồng đó trả khoá.`
    };
  }
  return { ngung: false, ly_do: "" };
}

export function docChot() {
  let raw = "{}";
  try { raw = fs.readFileSync(path.join(ROOT, ".agents/claims.json"), "utf8"); } catch (_) { raw = "(hong)"; }
  return xetChot(raw);
}

export function docTrangThai() {
  try { return JSON.parse(fs.readFileSync(FILE_TRANG_THAI, "utf8")); } catch (_) { return null; }
}

export function ghiTrangThai(tt) {
  fs.mkdirSync(THU_MUC, { recursive: true });
  fs.writeFileSync(FILE_TRANG_THAI, `${JSON.stringify(tt, null, 2)}\n`, "utf8");
}

export function gioVN(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "không rõ";
  return d.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour12: false });
}

/* ================== BĂNG TRÊN ĐẦU TRANG ==================
 *
 * Trang phải TỰ NÓI RA thứ nó không thấy. Bảng im lặng về giới hạn của chính nó là cách làm
 * người đọc tin nhầm: một khối trống đọc y hệt "không có gì chạy" trong khi thật ra là "mù".
 *
 * Hai chỗ bảng này KHÔNG thấy, và cả hai in thẳng lên băng:
 *   · luồng ở REPO KHÁC — bảng chỉ thấy repo của nó;
 *   · việc lane làm NGOÀI repo — repo chỉ thấy thứ đã chạm repo.
 */
export const NHAN_BANG = "<!--bang-song-bang-->";

export function chenBang(html, tt = {}) {
  const sach = String(html).split(NHAN_BANG)[0];   // gỡ băng cũ trước, gọi bao nhiêu lần cũng một băng
  const nhip = tt.nhip ? gioVN(tt.nhip) : "chưa rõ";
  const sinh = tt.sinh_luc ? gioVN(tt.sinh_luc) : "chưa sinh lần nào";
  const nut = tt.quaMayChu
    ? '<a href="/lam-moi" style="color:inherit;border:1px solid currentColor;border-radius:6px;padding:2px 10px;text-decoration:none">Làm mới ngay</a>'
    : "";
  const ngung = tt.ngung
    ? `<div style="background:#7a2d00;color:#fff;padding:6px 14px">⏸ <strong>BẢNG ĐANG DỪNG CẬP NHẬT</strong> — ${esc(tt.ly_do || "")}</div>`
    : "";
  return `${sach}${NHAN_BANG}
<div style="position:sticky;bottom:0;left:0;right:0;z-index:99999;font:13px/1.5 system-ui,sans-serif">
${ngung}<div style="background:#111;color:#ddd;padding:6px 14px;display:flex;gap:14px;flex-wrap:wrap;align-items:center">
<span>Sinh lúc <strong>${esc(sinh)}</strong></span><span>· nhịp <strong>${esc(nhip)}</strong></span>
<span style="opacity:.72">· bảng này KHÔNG thấy luồng ở repo khác, và KHÔNG thấy việc lane làm ngoài repo</span>
${nut}</div></div>
`;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function themCharset(html) {
  return String(html).startsWith("<meta charset") ? String(html) : `<meta charset="utf-8">\n${html}`;
}

/* ================== SINH LẠI ==================
 *
 * CHỐT ⑵ — chỉ ghi đúng hai file, cả hai NGOÀI git: `BANG.html` và `trang-thai.json`.
 * CHỐT ⑶ — không commit, không đẩy, không nhận/trả khoá. Không có một dòng nào ở đây làm thế,
 *          và phép ghim đếm: file này không được chứa `commit` / `push` / `--take` / `--release`.
 *
 * Gọi bộ sinh bằng TIẾN TRÌNH CON, không `import`. Hai lý do: bộ sinh có thể đang sửa dở (một
 * lỗi cú pháp làm chết cả máy chủ nếu nhập thẳng), và tiến trình con thì mọi lỗi gói gọn ở mã
 * thoát. Chết thì im lặng chết — vòng canh KHÔNG được dừng vì một lượt sinh hỏng.
 */
export function sinhLai(them = {}) {
  const chot = docChot();
  const luc = new Date().toISOString();

  if (chot.ngung) {
    // Không sinh, nhưng PHẢI nói ra. Đắp lại băng lên bảng cũ để người mở thấy nó đang dừng.
    const tt = { ...(docTrangThai() ?? {}), ...them, ngung: true, ly_do: chot.ly_do, nhip: luc };
    ghiTrangThai(tt);
    try {
      fs.writeFileSync(FILE_BANG, chenBang(fs.readFileSync(FILE_BANG, "utf8"), tt), "utf8");
    } catch (_) { /* chưa có bảng nào để đắp — lượt sau sinh được thì có */ }
    return tt;
  }

  const r = spawnSync(process.execPath, [path.join(ROOT, "scripts/build-overview.mjs"), "--khoa-song", FILE_BANG], {
    cwd: ROOT, encoding: "utf8", env: { ...process.env, ARK_KHOA_SONG: "1" }
  });
  if (r.status !== 0) {
    const tt = { ...(docTrangThai() ?? {}), ...them, ngung: true, ly_do: `bộ sinh lỗi (mã ${r.status}) — bảng dưới đây là bản CŨ.`, nhip: luc };
    ghiTrangThai(tt);
    return tt;
  }

  const tt = { ...them, ngung: false, ly_do: "", sinh_luc: luc, nhip: luc, van_tay: vanTay() };
  fs.writeFileSync(FILE_BANG, themCharset(chenBang(fs.readFileSync(FILE_BANG, "utf8"), tt)), "utf8");
  ghiTrangThai(tt);
  return tt;
}

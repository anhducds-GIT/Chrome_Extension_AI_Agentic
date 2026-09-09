/* state-check.mjs — CỔNG NHẤT QUÁN TRẠNG THÁI, chạy TRƯỚC KHI BÁO CÁO cho chủ dự án.
 *
 * ĐÂY KHÔNG PHẢI `session-check.mjs`. Lẫn hai thứ này là hỏng cả hai:
 *
 *   | | session-check | state-check (file này) |
 *   |---|---|---|
 *   | ai chạy | phiên đang làm việc | phiên đang điều phối / sắp báo cáo |
 *   | lúc nào | trước khi ĐÓNG PHIÊN | trước khi BÁO CÁO |
 *   | hỏi gì | "việc tôi làm đủ điều kiện push chưa?" | "điều tôi sắp nói có đúng với nguồn thẩm quyền không?" |
 *   | đỏ thì | không được push | không được phát biểu trạng thái chắc chắn |
 *
 * VÌ SAO CÓ FILE NÀY — hai ca thật trong một ngày, cùng một họ bệnh (đo ở repo đã dùng thử
 * gói này trước khi nó vào bộ khung):
 *   1. Một phiên báo "đã trả ba khoá". Trên máy đúng là trống, nhưng lượt trả CHƯA push, nên
 *      trên `origin/main` cả ba vẫn ghi là đang bị giữ — mà remote mới là chỗ AI audit nhìn
 *      vào, và là chỗ phiên khác nhìn vào để biết mình có bị chặn. CHỦ DỰ ÁN là người bắt được,
 *      không phải hệ.
 *   2. `STATUS.md` của một đơn vị nói hai mục nợ còn mở, trong khi Log của chính đơn vị đó nói
 *      đã đóng. Bảng ở gốc repo đọc `STATUS.md` nên hiển thị sai theo.
 *
 * Một họ duy nhất: **trạng thái được BÁO ≠ trạng thái có THẨM QUYỀN.** Trước file này, luật
 * chặn nó là một câu văn xuôi bảo phiên điều phối *nhớ tự đối chiếu*. Luật dựa vào việc AI
 * nhớ làm là luật bị bỏ qua đúng lúc bận nhất.
 *
 * CHỈ ĐỌC, VÀ KHÔNG ĐÒI KHOÁ NÀO. Xem mục "KHÔNG TỰ SỬA" bên dưới.
 *
 *   node scripts/state-check.mjs
 *   node scripts/state-check.mjs --as <tên-phiên>    (chỉ để in đúng tên trong lệnh gợi ý)
 *
 * Mã thoát: 0 = OK · 1 = MISMATCH · 2 = UNKNOWN. Ba mã, cố ý không gộp.
 */

import { existsSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { readClaims } from "./claim.mjs";
import { generatorsFrom, laneFromMessage, readStructureFromDisk } from "./repo-structure.mjs";

// fileURLToPath, không phải url.pathname: đường dẫn thật hay có dấu cách ("C:\WORKING ZONE\…")
// và pathname trả về %20, khiến mọi lệnh git im lặng chạy sai thư mục rồi trả rỗng.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const TRANG_THAI = Object.freeze({ OK: "STATE OK", MISMATCH: "STATE MISMATCH", UNKNOWN: "STATE UNKNOWN" });
export const MA_THOAT = Object.freeze({ [TRANG_THAI.OK]: 0, [TRANG_THAI.MISMATCH]: 1, [TRANG_THAI.UNKNOWN]: 2 });

/* ---- KHÔNG TỰ SỬA — luật quan trọng hơn cả việc phát hiện -------------------
 *
 * Ba cám dỗ, cả ba bị cấm: tự `git push` cho hết lệch · tự đóng dấu lại bảng quyền cho khớp ·
 * tự sinh lại artifact rồi commit. Lý lẽ cho ca thứ hai đã trả giá thật: *đừng đóng dấu lại
 * cho xong việc — làm thế là đóng dấu hợp lệ cho vụ sửa tay và xoá luôn tang chứng.* Một cổng
 * tự dọn bằng chứng của chính thứ nó phải phát hiện là cổng vô dụng, và tệ hơn: nó tạo cảm
 * giác an toàn.
 *
 * NÊN LUẬT ĐƯỢC GHIM VÀO CẤU TRÚC, KHÔNG PHẢI VÀO Ý CHÍ: mọi lệnh git của file này đi qua
 * đúng một cửa — `gitChiDoc()` — và cửa đó TỪ CHỐI mọi lệnh không nằm trong danh sách dưới.
 * Không có `push`, không có `commit`, không có `checkout`. Muốn thêm thì phải sửa danh sách
 * này, và phép ghim trong `tests/assistant-smoke.mjs` sẽ ĐỎ ngay.
 *
 * `fetch` NẰM TRONG danh sách và đó là có chủ đích: nó ghi vào `.git/refs/remotes`, nhưng
 * không đụng cây làm việc, không đụng remote, không đụng lịch sử. Không fetch thì đang so với
 * một `origin/main` cũ, và cổng sẽ nói dối theo hướng trấn an.
 */
export const GIT_CHI_DOC = Object.freeze(["fetch", "rev-parse", "show", "log", "status", "diff"]);

export function gitChiDoc(args, { root = ROOT, chay = execFileSync } = {}) {
  const lenh = String((args || [])[0] || "");
  if (!GIT_CHI_DOC.includes(lenh)) {
    throw new Error(
      "STATE_CHECK_CHI_DOC: lệnh git `" + lenh + "` không nằm trong danh sách chỉ-đọc "
      + "(" + GIT_CHI_DOC.join(" · ") + "). Lệnh này BÁO sai lệch, không bao giờ tự sửa — "
      + "xem mục KHÔNG TỰ SỬA ở đầu file này."
    );
  }
  return chay("git", ["-c", "core.quotepath=false", ...args], {
    cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"],
  });
}

/* ---- TRUNG TÂM: hàm THUẦN, nhận dữ liệu làm tham số -------------------------
 *
 * Thuần vì nếu nó tự chạy git thì không ai dựng được ca "khoá lệch" bằng test, và phép ghim
 * chỉ chứng minh *hôm nay* đang khớp — vô nghĩa ngày mai. Bài học đã trả giá: hàm nào nhận
 * `now` làm tham số thì mới ghim được ca "đã quá bao nhiêu phút"; hàm tự gọi `new Date()`
 * thì không.
 *
 * BA CẶP ĐỐI CHIẾU, ĐỦ, ĐỪNG THÊM CẶP THỨ TƯ:
 *   1. `.agents/claims.json` trên máy ↔ trên `origin/main`   — nguồn thẩm quyền: origin/main
 *   2. artifact máy sinh ↔ HEAD                              — nguồn thẩm quyền: HEAD
 *   3. có commit chưa push không                             — nguồn thẩm quyền: origin/main
 *
 * BA TRẠNG THÁI, và `UNKNOWN` KHÔNG ĐƯỢC GỘP VÀO `OK`. Mất mạng mà báo "mọi thứ khớp" đúng
 * là kiểu hỏng fail-open mà bộ khung này cấm. Có lệch THẬT thì `MISMATCH` thắng `UNKNOWN` —
 * lệch thật là thứ hành động được ngay — nhưng phần không biết VẪN được in ra, không bị nuốt.
 */
export function danhGia({ khoaMay, khoaRemote, artifact, commitChuaPush, loi } = {}) {
  const lech = [];
  const khongBiet = [...(loi || [])];

  // --- Cặp 1: bảng quyền trên máy ↔ trên origin/main ---
  // Bảng đọc ra RỖNG cũng là "không biết", không phải "khớp": một lỗi đọc im lặng sẽ cho hai
  // object rỗng bằng nhau, và cổng sẽ xanh vì không đọc được gì. Đây là đối chứng âm.
  const rong = (o) => !o || typeof o !== "object" || Object.keys(o).length === 0;
  if (rong(khoaMay) || rong(khoaRemote)) {
    khongBiet.push(
      "Cặp 1 (bảng quyền máy ↔ origin/main): không đọc được "
      + (rong(khoaMay) ? "bản TRÊN MÁY" : "bản TRÊN origin/main")
      + (rong(khoaMay) && rong(khoaRemote) ? " (và cả bản kia)" : "") + "."
    );
  } else {
    for (const khoa of [...new Set([...Object.keys(khoaMay), ...Object.keys(khoaRemote)])].sort()) {
      const a = moTaChu(khoaMay, khoa);
      const b = moTaChu(khoaRemote, khoa);
      if (a !== b) {
        lech.push("Cặp 1 · khoá `" + khoa + "`: TRÊN MÁY " + a + " · TRÊN origin/main " + b + ".");
      }
    }
  }

  // --- Cặp 2: artifact máy sinh ↔ HEAD ---
  // Danh sách bộ sinh RỖNG là "không kiểm được", không phải "không có gì lệch". Cùng lý do
  // với đối chứng âm ở trên: im lặng vì không có dữ liệu là fail-open.
  if (!Array.isArray(artifact) || artifact.length === 0) {
    khongBiet.push("Cặp 2 (artifact ↔ HEAD): không có bộ sinh nào để hỏi — chưa kiểm được cặp này.");
  } else {
    for (const m of artifact) {
      if (m.khop === true) continue;
      const ten = "`scripts/" + m.script + "`";
      if (m.khop === false) {
        lech.push("Cặp 2 · artifact do " + ten + " sinh KHÔNG khớp HEAD" + (m.chiTiet ? " → " + m.chiTiet : "") + ".");
      } else {
        khongBiet.push("Cặp 2 · không chạy được phép đo của " + ten + (m.chiTiet ? " → " + m.chiTiet : "") + ".");
      }
    }
  }

  // --- Cặp 3: có commit chưa push không ---
  if (!Array.isArray(commitChuaPush)) {
    khongBiet.push("Cặp 3 (commit chưa push): không hỏi được `origin/main` — không có remote, hoặc git lỗi.");
  } else {
    for (const c of commitChuaPush) {
      lech.push(
        "Cặp 3 · commit CHƯA PUSH: " + c.sha + " " + c.tieuDe
        + " [lane: " + (c.lane ? c.lane : "KHÔNG NHÃN") + "]"
        + " — chưa ai ngoài máy này thấy nó."
      );
    }
  }

  const trangThai = lech.length ? TRANG_THAI.MISMATCH : khongBiet.length ? TRANG_THAI.UNKNOWN : TRANG_THAI.OK;
  return { trangThai, ma: MA_THOAT[trangThai], lech, khongBiet };
}

/* Khoá VẮNG MẶT khác khoá CÓ MÀ TRỐNG CHỦ — nói ra cả hai, đừng ép phẳng thành "trống".
   Bảng hai bên lệch nhau về DANH SÁCH khoá là một ca thật (một repo tách thêm khoá vùng mới,
   phiên khác vẫn đang ở bản cũ), và ép phẳng nó thành "trống ↔ trống" là bỏ qua đúng lúc
   cần thấy. */
function moTaChu(bang, khoa) {
  if (!Object.prototype.hasOwnProperty.call(bang, khoa)) return "KHÔNG CÓ KHOÁ NÀY";
  const chu = bang[khoa] && bang[khoa].owner;
  return chu ? "`" + String(chu) + "`" : "TRỐNG";
}

/* ---- In ra cho người đọc ----------------------------------------------------
 * Luật: LIỆT KÊ TỪNG CHỖ LỆCH, nói rõ bên nào nói gì. KHÔNG tóm tắt thành "có 3 chỗ lệch" —
 * con số không cho ai hành động được. */
export function render({ ketQua, as, boSinh = [], luc = new Date() }) {
  const phien = as || "<tên-phiên>";
  const d = [];
  d.push(ketQua.trangThai);
  d.push("".padEnd(78, "─"));
  d.push("Đối chiếu lúc " + luc.toISOString().slice(0, 16).replace("T", " ") + " · 3 cặp: bảng quyền ↔ origin/main · artifact ↔ HEAD · commit chưa push");

  if (ketQua.trangThai === TRANG_THAI.OK) {
    d.push("");
    d.push("Ba cặp đều khớp. Trạng thái bạn sắp báo cáo khớp với nguồn có thẩm quyền.");
  }

  if (ketQua.lech.length) {
    d.push("");
    d.push("LỆCH — " + ketQua.lech.length + " chỗ, từng chỗ một:");
    for (const l of ketQua.lech) d.push("  ✗ " + l);
  }

  if (ketQua.khongBiet.length) {
    d.push("");
    d.push("KHÔNG ĐỐI CHIẾU ĐƯỢC — " + ketQua.khongBiet.length + " chỗ. KHÔNG BIẾT không phải là KHỚP:");
    for (const k of ketQua.khongBiet) d.push("  ? " + k);
  }

  if (ketQua.trangThai !== TRANG_THAI.OK) {
    d.push("");
    d.push("LỆNH NÀY KHÔNG TỰ SỬA GÌ. Dưới đây là lệnh để BẠN tự quyết có chạy hay không:");
    d.push("  · công bố việc đã commit (kể cả lượt trả khoá):");
    d.push("      node scripts/safe-push.mjs --as " + phien);
    if (boSinh.length) {
      d.push("  · sinh lại artifact rồi commit phần vừa sinh:");
      d.push("      " + boSinh.map((s) => "node scripts/" + s).join(" && "));
    }
    d.push("  · bảng quyền lệch mà bạn KHÔNG hiểu vì sao → ĐỪNG tự sửa bảng cho khớp lại.");
    d.push("      git diff .agents/claims.json     rồi HỎI CHỦ DỰ ÁN (AGENTS.md mục 1).");
    d.push("");
    d.push("Chưa xử xong thì ĐỪNG phát biểu trạng thái chắc chắn với chủ dự án.");
  }
  return d.join("\n");
}

/* ---- Vỏ chạm đĩa/git, mỏng nhất có thể -------------------------------------- */

/* BA HÀM DƯỚI ĐÂY NHẬN `git` LÀM THAM SỐ. Không phải để đẹp: nếu chúng gọi thẳng thì cả lớp
   vỏ này không có phép ghim nào, và ca "fetch hỏng" — ca fail-open mà gói này sinh ra để
   chặn — chỉ được kiểm bằng cách thật sự rút mạng. Tiêm vào thì dựng được bằng ba dòng. */

/** Làm tươi `origin/main`. Hỏng thì GHI VÀO `loi` — không fetch là đang so với bản CŨ, và
    "cũ" luôn nói dối theo hướng trấn an: mọi thứ trông như đã khớp. */
export function fetchMoi(loi, { git = gitChiDoc } = {}) {
  try { git(["fetch", "--quiet", "origin", "main"]); return true; }
  catch (e) {
    loi.push("`git fetch origin main` HỎNG (" + mot(e) + ") — mọi so sánh với origin/main dưới đây dựa trên bản CŨ.");
    return false;
  }
}

/** Bảng quyền trên `origin/main`. null = không hỏi được (chưa fetch, không remote, git lỗi). */
export function khoaTaiRemote(loi, { git = gitChiDoc } = {}) {
  try { return JSON.parse(git(["show", "origin/main:.agents/claims.json"]))?.claims ?? null; }
  catch (e) { loi.push("Không đọc được `.agents/claims.json` trên origin/main: " + mot(e)); return null; }
}

/** Commit có ở HEAD mà chưa có trên origin/main. null = không hỏi được. */
export function commitChuaPush(loi, { git = gitChiDoc } = {}) {
  try {
    if (git(["rev-parse", "--verify", "origin/main"]).trim() === "") return null;
  } catch (e) { loi.push("Không phân giải được `origin/main`: " + mot(e)); return null; }
  try {
    return git(["log", "--format=%H", "origin/main..HEAD"]).split("\n").filter(Boolean).map((sha) => ({
      sha: sha.slice(0, 7),
      tieuDe: git(["log", "-1", "--format=%s", sha]).trim(),
      lane: laneFromMessage(git(["log", "-1", "--format=%B", sha])).lane,
    }));
  } catch (e) { loi.push("Không liệt kê được commit chưa push: " + mot(e)); return null; }
}

/* TÁI DÙNG PHÉP ĐO ĐÃ CÓ, KHÔNG NHÂN BẢN: `--check-head` của chính các bộ sinh, đúng cách
   `session-check.mjs` và `safe-push.mjs` gọi. Danh sách bộ sinh đọc từ `.repo-structure.json`
   qua `generatorsFrom` — đóng cứng tên script ở đây là bản sao thứ ba của cùng một luật, và
   hai bản sao đã trả hai câu khác nhau cho cùng một file một lần rồi. */
export function artifactSoVoiHead(boSinh, root = ROOT) {
  return boSinh.map((script) => {
    const file = path.join(root, "scripts", script);
    if (!existsSync(file)) {
      return { script, khop: null, chiTiet: "đã khai trong .repo-structure.json nhưng KHÔNG có trong repo" };
    }
    try {
      execFileSync(process.execPath, [file, "--check-head"], {
        cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], timeout: 120000,
      });
      return { script, khop: true, chiTiet: "" };
    } catch (error) {
      const chiTiet = String(error.stderr || error.stdout || error.message).trim().split("\n").slice(-2).join(" | ");
      return { script, khop: false, chiTiet };
    }
  });
}

const mot = (e) => String((e && (e.stderr || e.message)) || e).trim().split("\n")[0];

function main() {
  const args = process.argv.slice(2);
  const i = args.indexOf("--as");
  const as = i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : "";

  const loi = [];
  fetchMoi(loi);            // hỏng thì nó tự ghi vào `loi`, và cổng thành UNKNOWN — không im lặng

  let khoaMay = null;
  try { khoaMay = readClaims()?.claims ?? null; }
  catch (e) { loi.push("Không đọc được `.agents/claims.json` trên máy: " + mot(e)); }

  // CẤU HÌNH HỎNG PHẢI RA `UNKNOWN`, KHÔNG ĐƯỢC NÉM.
  //
  // Bản đầu gọi thẳng, không bọc. Ở một repo khai `generators` rỗng (hoặc thiếu
  // `.repo-structure.json`) thì `generatorsFrom` NÉM, cả lệnh chết với vết ngăn xếp và mã
  // thoát 1 — tức nó BÁO LÀ CÓ SAI LỆCH trong khi thật ra nó chưa nhìn được gì. Đó là nói dối
  // đúng cái chiều mà ba trạng thái sinh ra để tránh. Đo thật trên fixture repo hình dạng khác.
  let boSinh = [];
  try { boSinh = generatorsFrom(readStructureFromDisk(ROOT)); }
  catch (e) { loi.push("Không đọc được danh sách bộ sinh từ `.repo-structure.json`: " + mot(e)); }

  const ketQua = danhGia({
    khoaMay,
    khoaRemote: khoaTaiRemote(loi),
    artifact: artifactSoVoiHead(boSinh),
    commitChuaPush: commitChuaPush(loi),
    loi,
  });

  process.stdout.write(render({ ketQua, as, boSinh, luc: new Date() }) + "\n");
  process.exit(ketQua.ma);
}

const laFileChay = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (laFileChay) main();

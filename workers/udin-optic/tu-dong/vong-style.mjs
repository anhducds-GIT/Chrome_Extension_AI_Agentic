/* Udin Optic — `R1`: MỘT LỆNH chạy trọn vòng việc thật của Đức.
 *
 * Đức nói 16/09: *"bạn cứ lấy các ảnh đã được tạo bởi Udin, đưa vào, yêu cầu tạo theo style khác
 * là được"*. Mọi mảnh của vòng ấy đã chạy THẬT từ 13→16/09 nhưng **rời rạc**; file này không mở
 * thêm năng lực nào, nó chỉ nối chúng lại thành một lệnh:
 *
 *   chọn ảnh lượt trước → đính kèm (`scout.upload`) → gõ prompt style mới → gửi → chờ xong
 *   → tải ảnh mới về đĩa → đổi JPG
 *
 * ─── CHỖ DUY NHẤT PHẢI CẨN THẬN ────────────────────────────────────────────
 * *"Đã đính kèm"* kiểm bằng **pill trên trang**, KHÔNG bằng lời báo của `scout.upload`. Lệnh ấy
 * nói được *"đã đổ tệp vào ô nhận"*; nó không nói được *"React đã dựng pill"* — đúng bài học
 * `S-22`/`S1`: `ok` của một lệnh ghi là lời khai về LỆNH, không phải về TRANG. Và chặng ngay sau
 * là chặng **tiêu credit**: đính kèm hụt mà vẫn gửi thì Đức trả tiền cho một lượt không có ảnh
 * tham chiếu, ảnh trả về vẫn trông hợp lý, nên không ai nhìn ra là đã hỏng.
 *
 * ─── MỤC `Image` TÌM THEO NHÃN, KHÔNG THEO SỐ THỨ TỰ ───────────────────────
 * Lượt chạy thật 16/09 thấy nó ở vị trí 2, nhưng gõ cứng `:nth-of-type(2)` là để dành một cú bấm
 * im lặng sang mục khác cho ngày Udin thêm một mục ở đầu bảng. Đọc nhãn từng mục rồi mới bấm —
 * cùng một chốt với `chon-che-do.mjs` (`W5`): bám cái đọc được, đừng bám vị trí.
 *
 * ─── NGUỒN ẢNH ─────────────────────────────────────────────────────────────
 * Mặc định lấy ảnh của lượt chạy GẦN NHẤT trong vùng ghi, và chỉ trong `udin-optic/` — nguồn của
 * vòng này theo định nghĩa là ảnh Udin đã sinh ra. Muốn ảnh khác thì `--anh <đường tương đối với
 * vùng ghi>`; máy chủ Bridge vẫn chặn mọi đường đi ra ngoài vùng ghi, đây không phải lớp bảo vệ.
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/vong-style.mjs "in the style of a woodcut" \
 *            [--du-an xe-dien-2026] [--anh <đường>] [--xoa-pill-cu] [--khong-jpg] [--mo]
 *
 * Lượt chạy TRƯỚC để lại ảnh của nó đang đính kèm trên trang, nên lượt thứ hai trở đi cần
 * `--xoa-pill-cu`. Mặc định vẫn TỪ CHỐI, y hệt `--xoa-o-cu` của `e2e.mjs` và cùng một lý do:
 * thứ đang nằm đó có thể là ảnh Đức tự đưa vào, và gỡ lặng lẽ là đổi thứ Đức sắp trả tiền để vẽ.
 */
import fs from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { quaManCho, URL_UDIN } from "./qua-man-cho.mjs";
import { guiPrompt } from "./gui-prompt.mjs";
import { layAnh } from "./lay-anh.mjs";
import { doiSangJpg } from "./doi-sang-jpg.mjs";
import { THU_MUC_GOC, kiemTenDuAn, duongDayDu } from "./thu-muc-du-an.mjs";

/* Selector lấy từ DOM thật trong lượt `W8` chạy sống 16/09, không đoán. */
export const SEL = Object.freeze({
  nutThem: "button.agent-add-button",
  bang: ".agent-add-dropdown",
  muc: ".agent-add-dropdown button.agent-add-option",
  /* ĐÚNG MỘT nút cho mỗi ảnh đang đính kèm (đo 16/09 tối). Bản đầu đếm `[class*=agent-context-pill]`
   * và đó là **hai** nút cho một ảnh — vì nó bắt cả cái hàng chứa (`agent-context-pills-row`). Một
   * con số đếm cả hộp lẫn thứ trong hộp thì câu báo lỗi đọc ra sai: "2 → 2" trông như đang có hai
   * ảnh, trong khi thật ra là MỘT ảnh và lượt đính kèm hụt. */
  pill: ".agent-context-pill-thumb",
  goPill: ".pill-thumb-clear",
});

export const NHAN_ANH = "Image";
const SO_MUC_TOI_DA = 8;
const DUOI_ANH = [".jpg", ".jpeg", ".png", ".webp"];
/* Nhãn một lượt chạy (`nhanLuotChay`) luôn bắt đầu bằng ngày ISO. Không có `--du-an` thì ngay
 * dưới `udin-optic/` có CẢ thư mục lượt chạy lẫn thư mục project, và đây là chỗ phân biệt. */
const NHAN_LUOT = /^\d{4}-\d{2}-\d{2}T/;

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));
const duoiCua = (ten) => { const i = ten.lastIndexOf("."); return i < 0 ? "" : ten.slice(i).toLowerCase(); };

const docThuMucThat = (duong) =>
  fs.readdirSync(duong, { withFileTypes: true }).map((d) => ({ ten: d.name, laThuMuc: d.isDirectory() }));

/**
 * Ảnh của một lượt chạy TRƯỚC, trả về đường **tương đối với vùng ghi** — đúng hình dạng
 * `scout.upload` nhận. Không tìm thấy thì **ném kèm lối ra**, không bao giờ trả một đường đoán:
 * một đường sai đi tới `DOM.setFileInputFiles` sẽ gắn một tệp RỖNG và báo thành công (đo 16/09).
 */
export function chonAnhCu({ vungGhi, duAn = null, doc = docThuMucThat } = {}) {
  if (!vungGhi) {
    throw new Error(
      "Máy chủ Bridge không khai `write_root`, nên chưa biết ảnh lượt trước nằm ở đâu. " +
      "Đặt vùng ghi (`vung-ghi.txt` cạnh tệp ghép cặp) rồi chạy lại, hoặc chỉ thẳng ảnh bằng `--anh <đường>`.",
    );
  }
  const goc = duAn === null || duAn === undefined ? THU_MUC_GOC : `${THU_MUC_GOC}/${kiemTenDuAn(duAn)}`;
  let con = null;
  try { con = doc(duongDayDu(vungGhi, goc)); } catch { con = null; }
  if (!con) {
    throw new Error(
      `Chưa có thư mục '${goc}' trong vùng ghi — chưa lượt chạy nào sinh ảnh` +
      `${duAn ? ` cho project '${duAn}'` : ""}. Chạy \`e2e.mjs\` một lượt trước, hoặc chỉ thẳng ảnh bằng \`--anh <đường>\`.`,
    );
  }
  /* Mới nhất trước: nhãn lượt chạy là ISO, nên xếp chữ cũng là xếp theo thời gian. */
  const luot = con
    .filter((d) => d.laThuMuc && (duAn ? true : NHAN_LUOT.test(d.ten)))
    .map((d) => d.ten).sort().reverse();
  for (const l of luot) {
    let tep = [];
    try { tep = doc(duongDayDu(vungGhi, `${goc}/${l}`)); } catch { continue; }
    const anh = tep.filter((d) => !d.laThuMuc && DUOI_ANH.includes(duoiCua(d.ten))).map((d) => d.ten).sort();
    /* Đức chốt 15/09 *"tôi muốn JPG"* — nên lượt nào có JPG thì đưa JPG, `.webp` chỉ là đường lui. */
    const jpg = anh.filter((t) => duoiCua(t) === ".jpg" || duoiCua(t) === ".jpeg");
    const chon = (jpg.length ? jpg : anh)[0];
    if (chon) return `${goc}/${l}/${chon}`;
  }
  throw new Error(
    `Thư mục '${goc}' có ${luot.length} lượt chạy nhưng không lượt nào còn ảnh. ` +
    "Chỉ thẳng ảnh bằng `--anh <đường tương đối với vùng ghi>`.",
  );
}

/**
 * Vị trí mục mang đúng nhãn xin trong bảng `+`. Mở bảng nếu đang đóng.
 * Không tìm ra thì **kể ra đã thấy những nhãn nào** — bảng đổi là chuyện sẽ tới, và một câu
 * "không thấy mục Image" không nói được là menu đổi hay là bảng chưa mở.
 */
export async function timMucAnh(tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
  const nhanXin = tuyChon.nhan || NHAN_ANH;
  const dem = async (selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data.matchCount;

  if ((await dem(SEL.bang)) === 0) {
    await goi("scout.click", { target_id: tab, selector: SEL.nutThem, wait_for: SEL.bang, wait_timeout_ms: 5000 }, tuyChon);
    /* Kiểm bằng trang, không bằng lời báo của `scout.click` (`S-22`). */
    if ((await dem(SEL.bang)) === 0) throw new Error("Đã bấm nút '+' mà bảng chọn không mở — trang chưa nhận cú bấm; chưa đính kèm gì.");
  }

  const daThay = [];
  for (let i = 1; i <= SO_MUC_TOI_DA; i++) {
    const sel = `${SEL.muc}:nth-of-type(${i})`;
    /* `scout.text` từ chối mọi selector khớp ≠ 1 (ADR-0006), nên đếm trước rồi mới đọc. */
    if ((await dem(sel)) !== 1) break;
    const chu = String((await goi("scout.text", { target_id: tab, selector: sel }, tuyChon)).data.text).trim();
    if (chu === nhanXin) return { viTri: i, selector: sel, nhan: chu };
    daThay.push(chu);
  }
  throw new Error(
    `Bảng chọn không có mục mang nhãn '${nhanXin}'. Thấy: ${daThay.length ? daThay.map((c) => `'${c}'`).join(", ") : "không mục nào"}. ` +
    "Menu Udin đã đổi — sửa `NHAN_ANH`, đừng quay lại bấm theo số thứ tự.",
  );
}

/**
 * Đính kèm một ảnh, và **kiểm bằng pill trên trang**. Trả về khi và chỉ khi số pill TĂNG.
 * @param {string} duong đường tương đối với vùng ghi
 */
export async function dinhKem(duong, tuyChon = {}) {
  if (typeof duong !== "string" || !duong.trim()) throw new Error("Thiếu đường ảnh để đính kèm.");
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
  const dem = async (selector) => (await goi("scout.query", { target_id: tab, selector, limit: 1 }, tuyChon)).data.matchCount;
  const demPill = () => dem(SEL.pill);

  /* Đếm TRƯỚC khi đụng vào bảng chọn. Mọi đường ra khỏi khối này đều để lại **ĐÚNG 0 ảnh
   * đính kèm đã đếm lại trên trang** — hoặc ném. Nhờ thế phép kiểm sau lúc tải lên là một con số
   * tuyệt đối (`> 0`), không phải một hiệu số — và không còn biến mốc nào để đi sai. */
  let truoc = await demPill();
  const coSan = truoc;
  if (truoc > 0) {
    /* Y HỆT lời từ chối của `guiPrompt` với ô prompt có sẵn chữ, và cùng một lý do: cái đang
     * nằm đó có thể là ảnh ĐỨC tự đính kèm. Lặng lẽ gỡ nó là đổi thứ Đức sắp trả tiền để vẽ.
     * Nên đường gỡ là thứ người gọi phải XIN. */
    if (!tuyChon.xoaPillCu) {
      throw new Error(
        `Trang đang có ${truoc} ảnh đính kèm sẵn — gửi tiếp thì Udin vẽ theo CẢ ảnh cũ, và Đức trả tiền cho một tham chiếu không ai xin. ` +
        "Muốn gỡ rồi đính kèm mới thì thêm `--xoa-pill-cu` (`xoaPillCu: true`) — nó GỠ mọi ảnh đang đính kèm.",
      );
    }
    for (let i = 0; i < 8 && truoc > 0; i++) {
      const nut = await dem(SEL.goPill);
      if (nut === 0) break;
      /* Nhiều nút gỡ cùng lúc thì KHÔNG bấm bừa cái đầu tiên — cùng chốt với `lay-anh`. Chưa đo
       * được ca này trên trang thật (lượt đính kèm thứ hai không bao giờ thành), nên nói thẳng. */
      if (nut !== 1) throw new Error(`Trang có ${nut} nút gỡ đính kèm cùng lúc — chưa biết gỡ cái nào là đúng; gỡ tay rồi chạy lại.`);
      await goi("scout.click", { target_id: tab, selector: SEL.goPill }, tuyChon);
      await nghi(tuyChon.buocMs ?? 400);
      truoc = await demPill();
    }
    if (truoc > 0) throw new Error(`Đã bấm gỡ mà trang vẫn còn ${truoc} ảnh đính kèm — chưa gỡ được; chưa đính kèm gì.`);
  }

  const muc = await timMucAnh(tuyChon);
  const ra = await goi("scout.upload", { target_id: tab, mo_bang: muc.selector, path: duong }, tuyChon);
  const bao = ra?.data?.files ?? null;

  /* Đổ tệp vào ô nhận xong, trang còn phải TẢI nó lên máy chủ Udin rồi mới vẽ pill — nên trần
   * chờ ở đây là trần mạng, không phải trần vẽ. 10 giây cho một tấm ~0,5 MB. */
  let sau = 0;
  for (let i = 0; i < (tuyChon.soNhip ?? 20) && sau === 0; i++) {
    await nghi(tuyChon.buocMs ?? 500);
    sau = await demPill();
  }
  if (sau === 0) {
    throw new Error(
      `\`scout.upload\` báo đã đổ ${bao ?? "?"} tệp, nhưng trên trang VẪN không có ảnh đính kèm nào — ` +
      "trang chưa nhận ảnh; CHƯA gửi prompt. Gửi tiếp là tiêu credit cho một lượt không có ảnh tham chiếu, " +
      "mà ảnh trả về vẫn trông hợp lý nên sẽ không ai nhìn ra là hỏng. " +
      "Đo 16/09 tối: ca này trùng lúc Udin ĐẦY CHỖ — nạp lại trang, nếu hiện màn chắn thì chờ rồi chạy lại.",
    );
  }
  return { path: duong, viTri: muc.viTri, selector: muc.selector, coSan, soAnh: sau, files: bao };
}

export async function vongStyle(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt — mỗi lượt chạy thật phải có chữ MỚI.");
  const goi = tuyChon.goi || goiThat;
  /* Tên project xấu phải đỏ khi chưa tốn gì — y lý do của `e2e.mjs`. */
  if (tuyChon.duAn !== null && tuyChon.duAn !== undefined) kiemTenDuAn(tuyChon.duAn);
  const chang = [];

  chang.push({ chang: "W1", ...(await quaManCho(tuyChon)) });

  /* Vùng ghi dùng cho CẢ lượt chọn ảnh lẫn dòng đường đầy đủ in ra cuối — hỏi đúng một lần.
   * Hỏi hụt KHÔNG làm đỏ ở đây: có `--anh` thì vòng vẫn chạy trọn, và `chonAnhCu` tự nói ra
   * thiếu gì nếu không có. */
  let vungGhi = null;
  try {
    const hc = await goi("host.capabilities", {}, tuyChon);
    vungGhi = hc.write_root || hc.data?.write_root || null;
  } catch { /* tiện nghi, không phải một chặng */ }

  const anhNguon = tuyChon.anh || chonAnhCu({ vungGhi, duAn: tuyChon.duAn ?? null, doc: tuyChon.doc });
  chang.push({ chang: "CHON", anh: anhNguon, tuDong: !tuyChon.anh });

  /* ĐÍNH KÈM đứng TRƯỚC lượt tiêu tiền, và nó có quyền chặn cả vòng. Đó là toàn bộ giá trị của
   * nó: một lượt gửi không có ảnh tham chiếu vẫn ra ảnh, vẫn báo xong, và vẫn mất tiền. */
  chang.push({ chang: "DINH-KEM", ...(await dinhKem(anhNguon, tuyChon)) });

  const gui = await guiPrompt(prompt, tuyChon);
  chang.push({ chang: "W2", ...gui });
  const w3 = await layAnh(gui.src, tuyChon);
  chang.push({ chang: "W3", ...w3 });

  if (tuyChon.boQuaJpg !== true) {
    const jpg = await doiSangJpg(w3.thuMuc, tuyChon);
    chang.push({ chang: "JPG", so: jpg.so, thuMuc: jpg.thuMuc });
  }

  return { prompt, anhNguon, chang, thuMuc: w3.thuMuc, thuMucDayDu: vungGhi ? duongDayDu(vungGhi, w3.thuMuc) : null };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  /* Đọc đối số bằng một vòng, không bằng `indexOf`: prompt là chữ tự do và có thể trùng đúng
   * giá trị của một cờ, lúc ấy `indexOf` chỉ vào chỗ khác và lượt chạy tiêu tiền cho chữ khác. */
  const doi = process.argv.slice(2);
  const CO_GIA_TRI = new Set(["--du-an", "--anh"]);
  const co = Object.create(null);
  const tuDo = [];
  for (let i = 0; i < doi.length; i++) {
    if (CO_GIA_TRI.has(doi[i])) { co[doi[i]] = doi[++i] ?? ""; continue; }
    if (doi[i].startsWith("--")) { co[doi[i]] = true; continue; }
    tuDo.push(doi[i]);
  }
  vongStyle(tuDo[0], {
    duAn: co["--du-an"] ?? null,
    anh: co["--anh"] ?? null,
    /* GỠ mọi ảnh đang đính kèm trước khi đính kèm ảnh của lượt này. Phải XIN, vì cái đang nằm
     * đó có thể là ảnh Đức tự đưa vào. */
    xoaPillCu: co["--xoa-pill-cu"] === true,
    boQuaJpg: co["--khong-jpg"] === true,
  })
    .then((k) => {
      console.log(JSON.stringify(k, null, 2));
      console.log("");
      console.log(`ẢNH NGUỒN: ${k.anhNguon}`);
      if (k.thuMucDayDu) {
        console.log(`ẢNH RA   : ${k.thuMucDayDu}`);
        if (doi.includes("--mo") && process.platform === "win32") {
          spawn("explorer.exe", [k.thuMucDayDu], { detached: true, stdio: "ignore" }).unref();
        }
      }
    })
    .catch((e) => {
      console.error(e.message);
      if (e?.dangChay) {
        console.error("");
        console.error("CREDIT ĐÃ TIÊU — lượt chạy vẫn sống. Nối lại ngay (ảnh hết hạn sau 900s):");
        console.error("  node workers/udin-optic/tu-dong/gui-prompt.mjs --noi-lai");
        console.error("  node workers/udin-optic/tu-dong/lay-anh.mjs <src…>");
      }
      process.exitCode = 1;
    });
}

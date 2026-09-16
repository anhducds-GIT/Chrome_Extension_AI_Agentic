/* Udin Optic — VÒNG THAM CHIẾU: một lệnh chạy trọn việc thật của Đức, có `@1` / `@2`.
 *
 * Đức mô tả hai ca, và file này làm cả hai bằng một đường:
 *   ⒜ *"lấy các ảnh đã được tạo bởi Udin, đưa vào, yêu cầu tạo theo style khác"* (16/09)
 *   ⒝ *"tôi sẽ gửi một ảnh lên và yêu cầu improve từ ảnh đó hoặc thiết kế từ ảnh đó"* (16/09)
 *
 * Khác nhau đúng một chỗ: ảnh của ⒜ **đã nằm sẵn trên canvas** (Udin tự bỏ ảnh nó sinh ra lên
 * đó — đo 16/09: sinh 4 ảnh thì canvas tăng đúng 4), còn ảnh của ⒝ phải **thả vào** trước.
 *
 * ─── VÌ SAO KHÔNG DÙNG `scout.upload` NỮA ──────────────────────────────────
 * Nó bật hộp thoại `Open` của Windows lên màn hình Đức, mỗi lượt một cú Cancel — đo 16/09, Đức
 * gửi ảnh chụp hai lần. Ba giả thuyết sửa đều trượt. `scout.tha` (kéo-thả) **không đi qua hộp
 * thoại nào cả**; chạy thật 17/09: canvas 17 → 18, **0 hộp thoại** ở cả ba lần đếm.
 *
 * ─── CHỖ PHẢI CẨN THẬN, ĐỨC CHỈ RA ─────────────────────────────────────────
 * *"Nếu bạn apply 1 cho 2 mà không xác định được đâu là 1, đâu là 2 thì sẽ không còn chính xác
 * nữa."* Đây là loại sai KHÔNG BÁO LỖI: chọn nhầm thứ tự thì Udin vẫn chạy, vẫn ra ảnh, chỉ là
 * lấy style của B áp lên A. Nên thứ tự được **đọc lại từ huy hiệu trên trang**
 * (`chon-tham-chieu.mjs`), không phải tin vào thứ tự mình bấm.
 *
 *   UDIN_GHE=<id> node workers/udin-optic/tu-dong/vong-tham-chieu.mjs \
 *       "apply the style of @1 to @2" \
 *       --anh udin-optic/vao/mau.png  --anh canvas:1789569609518 \
 *       [--du-an xe-dien-2026] [--bo-chon-cu] [--khong-jpg] [--mo]
 *
 * Mỗi `--anh` là MỘT tham chiếu, theo đúng thứ tự `@1`, `@2`, … và có hai dạng:
 *   · `canvas:<chuỗi>`  — ảnh ĐÃ nằm trên canvas, tìm theo một mẩu `src`
 *   · `<đường tương đối vùng ghi>` — tệp trên đĩa, sẽ được THẢ vào canvas trước
 */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "./goi-bridge.mjs";
import { quaManCho, URL_UDIN } from "./qua-man-cho.mjs";
import { guiPrompt } from "./gui-prompt.mjs";
import { layAnh } from "./lay-anh.mjs";
import { docTraLoi } from "./doc-tra-loi.mjs";
import { doiSangJpg } from "./doi-sang-jpg.mjs";
import { kiemTenDuAn, duongDayDu } from "./thu-muc-du-an.mjs";
import { idTrenCanvas, idTheoSrc, anhTrenCanvas, chonTheoThuTu, kiemPromptThamChieu } from "./chon-tham-chieu.mjs";

/* Bề mặt để thả. Đo 17/09: Udin KHÔNG có lớp canvas riêng nào đọc được — `.canvas-viewport`,
 * `.canvas-container`, `[class*=canvas-area]`, `main` đều khớp 0. `#root` là thứ duy nhất khớp
 * đúng một. Đừng đi tìm một cái tên đẹp hơn; nó không có. */
export const NOI_THA = "#root";

const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Đưa MỘT tệp từ vùng ghi lên canvas, rồi trả về `data-image-id` trang gán cho chỗ đặt mới.
 *
 * Danh tính học bằng **phần chênh của tập `data-image-id` trước/sau**. Hai bản trước đã sai ở
 * đúng chỗ này, và cả hai sai cùng một kiểu — lấy một CÁI TÊN làm danh tính:
 *   · theo TÊN TỆP (16/09) — canvas giữ một bản khác, khớp **0/8**
 *   · theo `src` (17/09 sáng) — Udin mã hoá lại ảnh thả vào thành `data:image/webp;base64,…`,
 *     lõi đọc cắt ở 200 ký tự, và hai ảnh khác hẳn nhau cho ra **hai chuỗi y hệt**. Canvas mọc
 *     18 → 20 mà phép so thấy 0 ảnh mới, rồi lệnh báo *"trang chưa nhận"*.
 * `data-image-id` là mã TRANG tự đặt cho từng chỗ đặt — không phải chuỗi ta cắt ngắn rồi đem so.
 */
export async function thaLenCanvas(duong, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const nghi = tuyChon.ngu || ngu;
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);

  const truoc = await idTrenCanvas(tuyChon);
  const t0 = (tuyChon.dongHo ?? Date.now)();
  const ra = await goi("scout.tha", { target_id: tab, selector: NOI_THA, path: duong }, tuyChon);

  for (let i = 0; i < (tuyChon.soNhip ?? 24); i++) {
    await nghi(tuyChon.buocMs ?? 700);
    const sau = await idTrenCanvas(tuyChon);
    const moi = sau.filter((s) => !truoc.includes(s));
    if (moi.length === 1) return { path: duong, id: moi[0], canvasTruoc: truoc.length, canvasSau: sau.length };
    if (moi.length > 1) {
      throw new Error(
        `Thả một tệp mà canvas mọc thêm ${moi.length} chỗ đặt — không biết chỗ nào là của lượt này, nên không chọn được tham chiếu. Chưa gửi prompt.`,
      );
    }
  }
  /* CÂU NÀY PHẢI CHỞ SỐ GIÂY ĐÃ CHỜ, và đó là một bài học chứ không phải trang trí: đo 17/09,
   * ảnh thả vào hiện sau **3,2–3,6 giây**, tức trần dưới đây dư gấp năm. Nên một lượt đỏ ở đây
   * gần như chắc chắn KHÔNG phải trang chậm — nó là trang bị chạm vào giữa chừng, hoặc thả
   * trượt. Không in số giây thì hai nguyên nhân ấy đọc y hệt nhau, và ta đi sửa nhầm chỗ. */
  const doiMs = (tuyChon.dongHo ?? Date.now)() - t0;
  throw new Error(
    `Đã bắn đủ chuỗi kéo-thả cho '${duong}' (lệnh báo ${ra?.data?.files ?? "?"} tệp) và chờ ${(doiMs / 1000).toFixed(1)}s ` +
    "mà canvas KHÔNG mọc thêm chỗ đặt nào — chưa gửi prompt. Đo 17/09: ảnh thả vào hiện sau 3,2–3,6s, " +
    "nên chờ chừng này mà không thấy thì thường KHÔNG phải trang chậm. Kiểm theo thứ tự: có ai vừa chạm vào " +
    "trang/cửa sổ không · tệp có nằm trong vùng ghi không · trang đã vẽ xong chưa.",
  );
}

/** `canvas:<chuỗi>` → `data-image-id` của chỗ đặt mang mẩu `src` ấy. Khớp ≠ 1 thì TỪ CHỐI. */
export async function timTrenCanvas(manh, tuyChon = {}) {
  return await idTheoSrc(manh, tuyChon);
}

export async function vongThamChieu(prompt, tuyChon = {}) {
  if (typeof prompt !== "string" || !prompt.trim()) throw new Error("Thiếu prompt — mỗi lượt chạy thật phải có chữ MỚI.");
  const dsAnh = Array.isArray(tuyChon.anh) ? tuyChon.anh : [];
  if (dsAnh.length === 0) throw new Error("Thiếu `--anh` — vòng này chạy vì có tham chiếu; không có cái nào thì dùng `e2e.mjs`.");
  if (tuyChon.duAn !== null && tuyChon.duAn !== undefined) kiemTenDuAn(tuyChon.duAn);

  /* Kiểm prompt TRƯỚC khi đụng vào trang: `@3` mà chỉ đưa 2 ảnh là một lỗi đọc được ngay từ
   * chuỗi chữ, không cần hỏi trang một câu nào. */
  kiemPromptThamChieu(prompt, dsAnh.length);

  const goi = tuyChon.goi || goiThat;
  const chang = [];
  chang.push({ chang: "W1", ...(await quaManCho(tuyChon)) });

  /* Đưa từng ảnh lên canvas (hoặc tìm ảnh đã có), GIỮ NGUYÊN thứ tự người gọi đưa. */
  const nguon = [];
  for (const muc of dsAnh) {
    if (typeof muc === "string" && muc.startsWith("canvas:")) {
      nguon.push({ kieu: "canvas", id: await timTrenCanvas(muc.slice(7), tuyChon) });
    } else {
      const k = await thaLenCanvas(muc, tuyChon);
      nguon.push({ kieu: "tha", id: k.id, path: k.path, canvas: `${k.canvasTruoc} → ${k.canvasSau}` });
    }
  }
  chang.push({ chang: "NGUON", anh: nguon.map((n) => ({ kieu: n.kieu, canvas: n.canvas ?? null })) });

  /* Thứ tự `@1`, `@2`, … ĐỌC LẠI TỪ TRANG, không tin thứ tự mình bấm. */
  const chon = await chonTheoThuTu(nguon.map((n) => n.id), tuyChon);
  chang.push({ chang: "CHON", thuTuKiemDuoc: chon.thuTuKiemDuoc, daChon: chon.daChon.map((x) => x.so) });

  /* Câu trả lời ĐANG có trên trang, đọc TRƯỚC khi gửi — `W4` ở cuối từ chối nếu chữ không đổi.
   * *Có chữ* không bao giờ là *có chữ MỚI*, y hệt lý do W2 đếm ảnh theo `src` chứ không theo số
   * lượng. Trang sạch thì chưa có tin nhắn agent nào và `docTraLoi` ném đúng theo thiết kế —
   * đó là `null`, không phải lỗi. */
  const chuTruoc = await docTraLoi(tuyChon).then((k) => k.chu, () => null);

  const gui = await guiPrompt(prompt, tuyChon);
  chang.push({ chang: "W2", ...gui });
  const w3 = await layAnh(gui.src, tuyChon);
  chang.push({ chang: "W3", ...w3 });

  if (tuyChon.boQuaJpg !== true) {
    const jpg = await doiSangJpg(w3.thuMuc, tuyChon);
    chang.push({ chang: "JPG", so: jpg.so, thuMuc: jpg.thuMuc });
  }

  /* `W4` đứng CUỐI, sau lượt ảnh đã về đĩa — nên một chặng `W4` đỏ không bao giờ làm mất ảnh.
   * Vẫn để nó ném: một câu trả lời sai còn tệ hơn không có câu nào. */
  const w4 = await docTraLoi({ ...tuyChon, khacVoi: chuTruoc ?? undefined });
  chang.push({ chang: "W4", ...w4 });

  let vungGhi = null;
  try {
    const hc = await goi("host.capabilities", {}, tuyChon);
    vungGhi = hc.write_root || hc.data?.write_root || null;
  } catch { /* tiện nghi, không phải một chặng */ }

  return {
    prompt, chang, thuMuc: w3.thuMuc, traLoi: w4.chu,
    thuMucDayDu: vungGhi ? duongDayDu(vungGhi, w3.thuMuc) : null,
    thamChieu: chon.daChon.map((x) => ({ so: x.so, id: x.id })),
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const doi = process.argv.slice(2);
  const CO_GIA_TRI = new Set(["--du-an"]);
  const co = Object.create(null);
  const anh = [];
  const tuDo = [];
  for (let i = 0; i < doi.length; i++) {
    if (doi[i] === "--anh") { anh.push(doi[++i] ?? ""); continue; }
    if (CO_GIA_TRI.has(doi[i])) { co[doi[i]] = doi[++i] ?? ""; continue; }
    if (doi[i].startsWith("--")) { co[doi[i]] = true; continue; }
    tuDo.push(doi[i]);
  }
  vongThamChieu(tuDo[0], {
    anh,
    duAn: co["--du-an"] ?? null,
    boChonCu: co["--bo-chon-cu"] === true,
    boQuaJpg: co["--khong-jpg"] === true,
  })
    .then((k) => {
      console.log(JSON.stringify(k, null, 2));
      console.log("");
      for (const t of k.thamChieu) console.log(`@${t.so}  ${t.id}`);
      if (k.traLoi) console.log(`UDIN NÓI: ${k.traLoi}`);
      if (k.thuMucDayDu) {
        console.log(`ẢNH RA: ${k.thuMucDayDu}`);
        if (doi.includes("--mo") && process.platform === "win32") {
          spawn("explorer.exe", [k.thuMucDayDu], { detached: true, stdio: "ignore" }).unref();
        }
      }
    })
    .catch((e) => {
      console.error(e.message);
      if (e?.dangChay) {
        console.error("");
        console.error("Udin VẪN ĐANG CHẠY — nối lại: node workers/udin-optic/tu-dong/gui-prompt.mjs --noi-lai");
      }
      process.exitCode = 1;
    });
}

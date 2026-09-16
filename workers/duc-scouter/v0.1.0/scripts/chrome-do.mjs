/* chrome-do.mjs — MỘT CHROME SẠCH để đo, dùng chung cho các phép đo cần trình duyệt thật.
 *
 * ─── VÌ SAO TÁCH RA, VÀ VÌ SAO ĐÚNG LÚC NÀY ────────────────────────────────
 * `do-doc-lai.mjs` (`S1`/`S-27`) và `do-hinh-hoc.mjs` (`T10`) đều cần y hệt nhau: mở một Chrome
 * hồ sơ trống, nói chuyện với nó qua ống điều khiển, rồi dọn sạch. Bản đầu viết thẳng trong
 * `do-doc-lai.mjs`; bản thứ hai mà chép lại là repo này có **hai** cách mở Chrome để đo, và
 * `G9` đã ghi cái giá của chuyện đó ở một tầng khác: hai bản của một luật thì sớm muộn lệch, và
 * bản vá làm ở một bên không bao giờ tới bên kia.
 *
 * ─── ĐÂY LÀ DỤNG CỤ ĐO, KHÔNG PHẢI ĐƯỜNG CHẠY VIỆC ─────────────────────────
 * File này gọi thẳng `Target.createTarget`, `Target.attachToTarget`, `Page.crash` — những
 * method **KHÔNG** có trong danh sách của extension, và sẽ không bao giờ có. Không mâu thuẫn:
 * danh sách kia bảo vệ **trình duyệt của Đức**, còn Chrome ở đây do chính file này đẻ ra trong
 * một thư mục tạm, hồ sơ trống, không đăng nhập gì, và bị giết khi đo xong. Tiền lệ đã có từ
 * `do-doc-lai.mjs` ngày 16/09.
 *
 * **Đừng import file này từ mã chạy trong extension.** Nó dùng `node:child_process`.
 */
import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

export function timChrome() {
  for (const c of [
    process.env.CHROME_PATH,
    join("C:", "Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join("C:", "Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean)) if (existsSync(c)) return c;
  return null;
}

/** Ống điều khiển CDP qua hai đầu ống của tiến trình Chrome (fd 3 ghi, fd 4 đọc). */
export class OngCdp {
  constructor(con) {
    this.ghi = con.stdio[3];
    this.so = 0;
    this.cho = new Map();
    /* Sự kiện CDP: người gọi đăng ký bằng `khiCo`. Không có chỗ này thì `Page.crash` không
     * quan sát được — nó KHÔNG trả lời, nó chỉ bắn `Inspector.targetCrashed`. */
    this.tay = new Map();
    let dem = Buffer.alloc(0);
    con.stdio[4].on("data", (mieng) => {
      dem = Buffer.concat([dem, mieng]);
      for (let cat = dem.indexOf(0); cat !== -1; cat = dem.indexOf(0)) {
        const tho = dem.subarray(0, cat).toString("utf8");
        dem = dem.subarray(cat + 1);
        let tin;
        try { tin = JSON.parse(tho); } catch { continue; }
        if (tin.method) {
          for (const f of this.tay.get(tin.method) || []) { try { f(tin.params, tin); } catch { /* tay nghe của người gọi */ } }
          continue;
        }
        const o = this.cho.get(tin.id);
        if (!o) continue;
        this.cho.delete(tin.id);
        if (tin.error) o.reject(Object.assign(new Error(JSON.stringify(tin.error)), { cdp: tin.error }));
        else o.resolve(tin.result);
      }
    });
  }

  khiCo(method, tay) {
    if (!this.tay.has(method)) this.tay.set(method, []);
    this.tay.get(method).push(tay);
  }

  /* HẠN CHO TỪNG LỆNH, và nó KHÔNG phải trang trí — `G-72` đã ghi cái giá ở lõi thật: một lệnh
   * CDP không bao giờ trả lời thì cả phép đo đứng im, và người chạy chỉ thấy *"treo"*.
   *
   * Chính file này dính đúng bẫy đó ở lượt chạy đầu tiên, 16/09, và nó hỏng theo kiểu tệ nhất:
   * Node thấy một `await` ở tầng ngoài không bao giờ hoàn tất thì **thoát với mã 0** kèm một
   * dòng cảnh báo — tức phép đo báo ĐẠT mà chưa in một chữ nào. Một màu xanh giả sinh ra từ
   * chính dụng cụ đo.
   *
   * Quá hạn thì NÉM, và ném kèm cờ `hetHan` để chỗ phán phân biệt được *"Chrome trả lời rằng
   * hỏng"* với *"Chrome không trả lời"* — hai chuyện khác nhau, và `S-21` sống đúng ở khe ấy. */
  gui(method, params = {}, sessionId, hanMs = 8000) {
    const id = ++this.so;
    this.ghi.write(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }) + "\0");
    return new Promise((res, rej) => {
      const dongHo = setTimeout(() => {
        this.cho.delete(id);
        rej(Object.assign(new Error(`HET_HAN: '${method}' khong tra loi trong ${hanMs}ms.`), { hetHan: true }));
      }, hanMs);
      const xong = (f) => (v) => { clearTimeout(dongHo); f(v); };
      this.cho.set(id, { resolve: xong(res), reject: xong(rej) });
    });
  }
}

/**
 * Mở một Chrome hồ sơ TRỐNG trong thư mục tạm, phục vụ một trang HTML tự dựng.
 *
 * @param {object} o
 * @param {string} o.html      nội dung trang thử
 * @param {string} [o.ten]     tiền tố thư mục tạm, để log dễ đọc
 * @returns {Promise<{cdp: OngCdp, trangUrl: string, dong: () => void}>}
 */
export async function moChromeSach({ html, ten = "chrome-do" }) {
  const chrome = timChrome();
  if (!chrome) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");
  const goc = mkdtempSync(join(tmpdir(), `${ten}-`));
  writeFileSync(join(goc, "trang.html"), html, "utf8");
  const trangUrl = pathToFileURL(join(goc, "trang.html")).href;

  const con = spawn(chrome, [
    "--remote-debugging-pipe",
    `--user-data-dir=${join(goc, "hoso")}`,
    "--no-first-run", "--no-default-browser-check",
    trangUrl
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  const cdp = new OngCdp(con);
  let ban = null;
  for (let i = 0; i < 80 && !ban; i += 1) {
    try { ban = await cdp.gui("Browser.getVersion"); } catch { await nghi(250); }
  }
  if (!ban) { con.kill(); throw new Error("Chrome không trả lời qua ống điều khiển."); }

  return {
    cdp,
    trangUrl,
    ban,
    dong() {
      con.kill();
      setTimeout(() => { try { rmSync(goc, { recursive: true, force: true }); } catch { /* thư mục tạm */ } }, 800);
    }
  };
}

/** Chờ cho tới khi có một target `page` khớp `hop`, rồi trả `targetId`. Hỏi lại, đừng ngủ đoán. */
export async function choTrang(cdp, hop = (t) => t.url.startsWith("file:"), nhip = 40) {
  for (let i = 0; i < nhip; i += 1) {
    const ds = (await cdp.gui("Target.getTargets")).targetInfos.filter((t) => t.type === "page");
    const thay = ds.find(hop);
    if (thay) return thay.targetId;
    await nghi(250);
  }
  return null;
}

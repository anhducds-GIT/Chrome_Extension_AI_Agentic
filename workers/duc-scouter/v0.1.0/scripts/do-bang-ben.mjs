/* do-bang-ben.mjs — BẢNG BÊN CÓ NẠP ĐƯỢC KHÔNG.
 *
 * ─── LỖ HỔNG FILE NÀY BỊT ──────────────────────────────────────────────────
 * Mọi phép ghim của bảng bên chạy trong `node:vm`: chúng trích một KHỐI mã rồi chạy khối đó.
 * Nghĩa là **`sidepanel.js` đầy đủ chưa bao giờ chạy trong một trình duyệt thật.** Một `import`
 * sai đường, một `id` gõ nhầm, một lỗi cú pháp ở khối không ai trích — cả ba đều lọt qua toàn
 * bộ suite, rồi hiện ra dưới dạng **một bảng bên trắng trơn** trên ghế của Đức.
 *
 * Và nó hỏng IM LẶNG: MV3 không báo gì, trang vẫn tải, chỉ có mã là không chạy. Người ngồi
 * trước nó chỉ thấy "tiện ích hỏng", không có gì để đọc.
 *
 * ─── PHÉP ĐO NÀY LÀM GÌ ────────────────────────────────────────────────────
 * Chrome sạch, hồ sơ trống trong thư mục tạm → nạp CHÍNH thư mục gói (manifest nguyên vẹn) →
 * mở `sidepanel.html` → nghe console → đợi trang dựng xong → hỏi ba câu:
 *   ⑴ có lỗi console nào không (kể cả lỗi nạp module, thứ giết cả file)
 *   ⑵ những `id` mà `sidepanel.js` gọi bằng `$("#…")` có TỒN TẠI trong DOM không
 *   ⑶ mã có thật sự CHẠY không — đo bằng một dấu vết nó để lại trên DOM
 *
 * Câu ⑵ đáng nói: `$("#x").addEventListener` trên một `id` không có sẽ ném `TypeError` và
 * **giết mọi dòng phía sau**. Đó là cách một nút mới làm hỏng ba nút cũ.
 *
 * KHÔNG đụng ghế của Đức, không mạng, không đăng nhập, không tốn credit.
 * Ống CDP mượn nguyên từ `scouter-input-trust-probe.mjs` (xem file đó để biết vì sao dùng ống).
 *
 * Chạy:  node workers/duc-scouter/v0.1.0/scripts/do-bang-ben.mjs                (gói này)
 *        node .../do-bang-ben.mjs workers/udin-optic/v0.1.0                     (gói khác)
 *        thêm `--json` để lấy số thô.
 *
 * Mã thoát: 0 = bảng bên nạp được · 1 = CÓ LỖI · 2 = phép đo KHÔNG CHẠY ĐƯỢC.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const MAC_DINH = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function timChrome() {
  for (const c of [
    process.env.CHROME_PATH,
    join("C:", "Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join("C:", "Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean)) if (existsSync(c)) return c;
  return null;
}

class OngCdp {
  constructor(con) {
    this.ghi = con.stdio[3];
    this.so = 0;
    this.cho = new Map();
    this.nghe = [];
    let dem = Buffer.alloc(0);
    con.stdio[4].on("data", (mieng) => {
      dem = Buffer.concat([dem, mieng]);
      for (let cat = dem.indexOf(0); cat !== -1; cat = dem.indexOf(0)) {
        const tho = dem.subarray(0, cat).toString("utf8");
        dem = dem.subarray(cat + 1);
        let tin;
        try { tin = JSON.parse(tho); } catch { continue; }
        if (tin.method) { for (const f of this.nghe) f(tin); continue; }
        const o = this.cho.get(tin.id);
        if (!o) continue;
        this.cho.delete(tin.id);
        if (tin.error) o.reject(new Error(JSON.stringify(tin.error)));
        else o.resolve(tin.result);
      }
    });
  }
  gui(method, params = {}, sessionId) {
    const id = ++this.so;
    this.ghi.write(JSON.stringify(sessionId ? { id, method, params, sessionId } : { id, method, params }) + "\0");
    return new Promise((res, rej) => this.cho.set(id, { resolve: res, reject: rej }));
  }
  khiCo(fn) { this.nghe.push(fn); }
}

async function choDen(fn, nhan, ms = 30000) {
  const han = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* chưa sẵn sàng */ }
    if (Date.now() > han) throw new Error(`Chờ quá ${ms}ms: ${nhan}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/* ---- Phần THUẦN LOGIC: chấm điểm ---------------------------------------- */

/** Rút mọi `id` mà bảng bên gọi tới, từ CHÍNH nguồn của nó. */
export function idBangBenGoi(nguon) {
  const ra = new Set();
  for (const m of nguon.matchAll(/\$\(\s*["'`]#([A-Za-z0-9_-]+)["'`]\s*\)/g)) ra.add(m[1]);
  for (const m of nguon.matchAll(/getElementById\(\s*["'`]([A-Za-z0-9_-]+)["'`]\s*\)/g)) ra.add(m[1]);
  return [...ra].sort();
}

/** `id` nào có trong HTML. Đọc thô, không cần DOM — chỉ cần biết chuỗi `id="…"` có mặt. */
export function idTrongHtml(html) {
  return new Set([...html.matchAll(/\sid="([A-Za-z0-9_-]+)"/g)].map((m) => m[1]));
}

/** Kết luận, viết bằng chữ người đọc được. Không có nhánh "gần đạt". */
export function ketLuan(tho) {
  const loi = [];
  if (tho.thieuId.length) {
    loi.push(`bảng bên gọi ${tho.thieuId.length} id KHÔNG có trong HTML: ${tho.thieuId.join(", ")}` +
      " — `$(\"#x\").addEventListener` trên id không có sẽ ném và GIẾT mọi dòng phía sau");
  }
  for (const c of tho.console) loi.push(`console ${c.muc}: ${c.chu}`);
  if (!tho.daChay) loi.push("mã của bảng bên KHÔNG chạy — trang tải xong mà không để lại dấu vết nào");
  return { dat: loi.length === 0, loi };
}

/* ---- Phần đụng Chrome ---------------------------------------------------- */

async function do_(thuMucGoi) {
  const chrome = timChrome();
  if (!chrome) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");
  const manifest = JSON.parse(readFileSync(join(thuMucGoi, "manifest.json"), "utf8"));
  const duongPanel = manifest.side_panel?.default_path;
  if (!duongPanel) throw new Error(`${thuMucGoi}/manifest.json không khai \`side_panel.default_path\`.`);

  const html = readFileSync(join(thuMucGoi, duongPanel), "utf8");
  const nguon = readFileSync(join(thuMucGoi, duongPanel.replace(/\.html$/, ".js")), "utf8");
  const co = idTrongHtml(html);
  const thieuId = idBangBenGoi(nguon).filter((id) => !co.has(id));

  const goc = mkdtempSync(join(tmpdir(), "do-bang-ben-"));
  const con = spawn(chrome, [
    "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging",
    `--user-data-dir=${join(goc, "hoso")}`,
    "--no-first-run", "--no-default-browser-check", "--disable-background-timer-throttling",
    "about:blank"
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  try {
    const cdp = new OngCdp(con);
    const ban = await choDen(() => cdp.gui("Browser.getVersion"), "Chrome trả lời qua ống");
    const maGoi = (await cdp.gui("Extensions.loadUnpacked", { path: thuMucGoi })).id;
    const dich = (await cdp.gui("Target.createTarget", { url: `chrome-extension://${maGoi}/${duongPanel}` })).targetId;
    const phien = (await cdp.gui("Target.attachToTarget", { targetId: dich, flatten: true })).sessionId;

    /* Nghe TRƯỚC khi bật Runtime: một lỗi nạp module xảy ra rất sớm, và bắt hụt nó thì phép đo
     * này xanh trong khi bảng bên chết. */
    const nhat = [];
    cdp.khiCo((tin) => {
      if (tin.sessionId !== phien) return;
      if (tin.method === "Runtime.consoleAPICalled" && ["error", "warning"].includes(tin.params.type)) {
        nhat.push({ muc: tin.params.type, chu: (tin.params.args || []).map((a) => a.value ?? a.description ?? a.type).join(" ") });
      }
      if (tin.method === "Runtime.exceptionThrown") {
        const d = tin.params.exceptionDetails;
        nhat.push({ muc: "exception", chu: d.exception?.description || d.text });
      }
      if (tin.method === "Log.entryAdded" && ["error"].includes(tin.params.entry.level)) {
        nhat.push({ muc: "log", chu: tin.params.entry.text });
      }
    });
    await cdp.gui("Runtime.enable", {}, phien);
    await cdp.gui("Log.enable", {}, phien);
    await cdp.gui("Page.enable", {}, phien);
    await cdp.gui("Page.reload", {}, phien);

    const danhGia = async (bieuThuc) => {
      const r = await cdp.gui("Runtime.evaluate", { expression: bieuThuc, returnByValue: true, awaitPromise: true }, phien);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    /* DẤU VẾT: mã bảng bên chạy xong thì `--zoom-chu` đã được ghi lên `documentElement`. Đo một
     * thứ mã PHẢI làm, không đo `document.readyState` — trang vẫn "complete" khi mọi script chết. */
    await choDen(
      async () => await danhGia(`document.documentElement.style.getPropertyValue("--zoom-chu") !== ""`),
      "bảng bên chạy xong và đặt cỡ chữ", 15000
    ).catch(() => null);
    const daChay = await danhGia(`document.documentElement.style.getPropertyValue("--zoom-chu") !== ""`);
    const soNut = await danhGia(`document.querySelectorAll(".zoom-nut").length`);
    const soThe = await danhGia(`document.querySelectorAll(".the").length`);

    return {
      chrome: ban.product, goi: thuMucGoi, ten: manifest.name,
      thieuId, console: nhat, daChay, soNut, soThe
    };
  } finally {
    con.kill();
    setTimeout(() => { try { rmSync(goc, { recursive: true, force: true }); } catch { /* thư mục tạm */ } }, 800);
  }
}

export function inRa(tho) {
  const k = ketLuan(tho);
  const ra = [];
  ra.push(`PHÉP ĐO BẢNG BÊN — ${tho.ten} · Chrome ${tho.chrome}`);
  ra.push(`   id bảng bên gọi mà HTML không có : ${tho.thieuId.length}`);
  ra.push(`   lỗi/cảnh báo console             : ${tho.console.length}`);
  ra.push(`   mã có chạy (đặt được cỡ chữ)     : ${tho.daChay}`);
  ra.push(`   nút phóng to / thẻ dựng được     : ${tho.soNut} / ${tho.soThe}`);
  ra.push("");
  if (k.dat) ra.push("BẢNG BÊN NẠP ĐƯỢC.");
  else { ra.push("BẢNG BÊN CÓ LỖI:"); for (const l of k.loi) ra.push(`   · ${l}`); }
  return ra.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const doi = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  do_(resolve(doi[0] || MAC_DINH))
    .then((tho) => {
      if (process.argv.includes("--json")) console.log(JSON.stringify(tho, null, 2));
      else console.log(inRa(tho));
      process.exit(ketLuan(tho).dat ? 0 : 1);
    })
    .catch((e) => { console.error("PHÉP ĐO KHÔNG CHẠY ĐƯỢC:", e.message); process.exit(2); });
}

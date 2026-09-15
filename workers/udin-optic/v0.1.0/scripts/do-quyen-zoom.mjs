/* do-quyen-zoom.mjs — PHÉP ĐO `U0` của Udin Optic.
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * `chrome.tabs.setZoom` có đòi quyền `"tabs"` trong manifest không?
 *
 * ─── VÌ SAO PHẢI ĐO, KHÔNG ĐƯỢC SUY ─────────────────────────────────────────
 * Ba gói `duc-auto-*` dùng `setZoom` và CHẠY TỐT, nhưng cả ba đều khai `"tabs"` vì
 * việc khác. Nên chúng chứng minh được "có quyền thì chạy", KHÔNG chứng minh được
 * "không quyền thì hỏng" — đúng cái bẫy `G-93`: một tiền lệ chỉ đo được việc mới
 * khi hai việc cùng bề mặt quyền.
 *
 * Và `G-94` đã dạy bằng một lượt chạy hỏng: **thu hẹp quyền là một thay đổi HÀNH
 * VI**, không phải một dòng khai báo. Nên file này nạp CHÍNH thư mục extension
 * thật, manifest nguyên vẹn, rồi gọi `chrome.tabs.*` từ bên trong nó.
 *
 * ─── KHÔNG ĐỤNG GHẾ CỦA ĐỨC ─────────────────────────────────────────────────
 * Chrome riêng, hồ sơ TRỐNG trong thư mục tạm. Trang thử do chính file này dựng
 * trên `127.0.0.1` (nằm sẵn trong `host_permissions` của gói) và một tệp `file://`
 * (nằm NGOÀI mọi quyền). Không mạng, không đăng nhập, không tốn credit.
 *
 * Từ Chrome 137 `--load-extension` bị vô hiệu hoá, nên đường cài duy nhất còn lại
 * là `Extensions.loadUnpacked` qua CDP — chỉ có khi chạy `--remote-debugging-pipe`
 * kèm `--enable-unsafe-extension-debugging`. Hai cờ đó chỉ để CÀI; chúng không
 * đụng gì tới việc `setZoom` có được phép hay không.
 * Ống CDP mượn nguyên từ `duc-scouter/v0.1.0/scripts/scouter-input-trust-probe.mjs`.
 *
 * Chạy:  npm run udin:zoom-probe
 *        CHROME_PATH=... node workers/udin-optic/v0.1.0/scripts/do-quyen-zoom.mjs
 *        thêm `--json` để lấy số thô.
 *
 * Mã thoát: 0 = đo xong · 2 = phép đo KHÔNG CHẠY ĐƯỢC (khác hẳn "không đạt").
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createServer } from "node:http";

const THU_MUC_GOI = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function timChrome() {
  const ung = [
    process.env.CHROME_PATH,
    join("C:", "Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    join("C:", "Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  for (const c of ung) if (existsSync(c)) return c;
  return null;
}

/* CDP qua ỐNG (fd 3 ghi, fd 4 đọc), mỗi thông điệp kết bằng một byte 0. */
class OngCdp {
  constructor(con) {
    this.ghi = con.stdio[3];
    this.so = 0;
    this.cho = new Map();
    let dem = Buffer.alloc(0);
    con.stdio[4].on("data", (mieng) => {
      dem = Buffer.concat([dem, mieng]);
      for (let cat = dem.indexOf(0); cat !== -1; cat = dem.indexOf(0)) {
        const tho = dem.subarray(0, cat).toString("utf8");
        dem = dem.subarray(cat + 1);
        let tin;
        try { tin = JSON.parse(tho); } catch { continue; }
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
}

async function choDen(fn, nhan, ms = 30000) {
  const han = Date.now() + ms;
  for (;;) {
    try { const v = await fn(); if (v) return v; } catch { /* chưa sẵn sàng */ }
    if (Date.now() > han) throw new Error(`Chờ quá ${ms}ms: ${nhan}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/* ---- Phần THUẦN LOGIC: chấm điểm ----------------------------------------
 * Tách hẳn khỏi mọi thứ đụng Chrome, để phép ghim chạy được mà không cần trình duyệt. */

/** Bốn điều phép đo phải trả lời. Mỗi điều đổi một quyết định CỤ THỂ của `U2`. */
export const CAU_HOI = Object.freeze([
  {
    id: "TABS_CO_MAT_KHONG_CAN_QUYEN",
    y: "`chrome.tabs` có tồn tại khi manifest KHÔNG khai `tabs` không",
    doi: "nếu không thì `U2` buộc phải đụng manifest",
    dat: (m) => m.coApiTabs === true
  },
  {
    id: "SETZOOM_CHAY_KHONG_CAN_QUYEN",
    y: "`setZoom`/`getZoom` chạy trên tab NẰM TRONG `host_permissions`",
    doi: "đây là đường chính của `U2`",
    dat: (m) => m.trongQuyen?.dat === true
  },
  {
    id: "URL_CHI_HIEN_TRONG_QUYEN",
    y: "`tab.url` chỉ đọc được ở tab khớp `host_permissions`",
    doi: "`U2` nhận diện tab Udin bằng `url`, nên đây là CÁI KHOÁ thật sự",
    dat: (m) => m.urlTrongQuyen === true && m.urlNgoaiQuyen === false
  },
  {
    id: "SETZOOM_KHONG_BI_QUYEN_CHAN",
    y: "`setZoom` có bị chặn ở tab NGOÀI quyền không",
    doi: "nếu KHÔNG bị chặn thì lớp an toàn của `U2` nằm ở đường ĐỌC, không ở đường GHI",
    dat: (m) => typeof m.ngoaiQuyen?.dat === "boolean"   // ghi nhận, không phải điều kiện đạt
  }
]);

/** Rút số thô thành đúng những gì dùng để chấm. */
export function rutGon(tho) {
  const zoomDat = (z) => z != null && !z.thieuTab
    && z.set12?.ok === true && z.get1?.gia === 1.2
    && z.set08?.ok === true && z.get2?.gia === 0.8;
  const k = tho.ketQua;
  return {
    coApiTabs: tho.coApiTabs === true,
    coKhaiQuyenTabs: tho.coKhaiQuyenTabs === true,
    urlTrongQuyen: k?.trongQuyen?.thieuTab ? null : k?.urlTrongQuyen === true,
    urlNgoaiQuyen: k?.ngoaiQuyen?.thieuTab ? null : k?.urlNgoaiQuyen === true,
    trongQuyen: { dat: zoomDat(k?.trongQuyen), tho: k?.trongQuyen || null },
    ngoaiQuyen: { dat: zoomDat(k?.ngoaiQuyen), tho: k?.ngoaiQuyen || null }
  };
}

/** Kết luận, viết bằng chữ người đọc được. */
export function ketLuan(tho) {
  const m = rutGon(tho);
  const dong = CAU_HOI.map((c) => ({ id: c.id, y: c.y, doi: c.doi, dat: c.dat(m) === true }));
  /* Phép đo này KHÔNG có nhánh "gần đạt": hoặc `U2` chạy được không cần quyền mới,
   * hoặc phải đụng manifest — và đụng manifest là đụng hợp đồng quyền. */
  const canQuyenTabs = !(m.coApiTabs && m.trongQuyen.dat && m.urlTrongQuyen);
  return { canQuyenTabs, dong, m };
}

/* ---- Phần đụng Chrome ---------------------------------------------------- */

async function do_() {
  const chrome = timChrome();
  if (!chrome) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");
  const manifest = JSON.parse(readFileSync(join(THU_MUC_GOI, "manifest.json"), "utf8"));

  /* Trang ① — trên `127.0.0.1`, NẰM TRONG `host_permissions` của gói. */
  const may = createServer((_q, r) => { r.writeHead(200, { "content-type": "text/html" }); r.end("<title>u0-trong-quyen</title>ok"); });
  await new Promise((r) => may.listen(0, "127.0.0.1", r));
  const urlTrong = `http://127.0.0.1:${may.address().port}/u0.html`;

  const goc = mkdtempSync(join(tmpdir(), "udin-u0-"));
  /* Trang ② — `file://`, NGOÀI mọi quyền của gói. */
  const tepNgoai = join(goc, "ngoai-quyen.html");
  writeFileSync(tepNgoai, "<title>u0-ngoai-quyen</title>ok", "utf8");

  const con = spawn(chrome, [
    "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging",
    `--user-data-dir=${join(goc, "hoso")}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    urlTrong
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  try {
    const cdp = new OngCdp(con);
    const ban = await choDen(() => cdp.gui("Browser.getVersion"), "Chrome trả lời qua ống");
    await cdp.gui("Target.createTarget", { url: pathToFileURL(tepNgoai).href });

    const maGoi = (await cdp.gui("Extensions.loadUnpacked", { path: THU_MUC_GOI })).id;
    /* Đo TRONG `sidepanel.html` chứ không trong một trang dựng tạm: đó đúng là ngữ
     * cảnh `U2` sẽ chạy, nên không còn bước suy luận "chắc hai chỗ giống nhau". */
    const dichExt = (await cdp.gui("Target.createTarget", { url: `chrome-extension://${maGoi}/sidepanel.html` })).targetId;
    const phien = (await cdp.gui("Target.attachToTarget", { targetId: dichExt, flatten: true })).sessionId;
    await cdp.gui("Runtime.enable", {}, phien);

    const trongExt = async (than) => {
      const r = await cdp.gui("Runtime.evaluate", {
        expression: `(async () => { ${than} })()`, returnByValue: true, awaitPromise: true
      }, phien);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const coApiTabs = await choDen(
      () => trongExt("return typeof chrome.tabs === \"object\";"),
      "bảng bên nạp xong và thấy chrome.tabs"
    );

    const ketQua = await trongExt(`
      const thu = async (nhan, fn) => {
        try { return { nhan, ok: true, gia: await fn() }; }
        catch (e) { return { nhan, ok: false, loi: String((e && e.message) || e) }; }
      };
      const tabs = await chrome.tabs.query({});
      const tabMinh = await new Promise((r) => chrome.tabs.getCurrent(r));
      const tabTrong = tabs.find((t) => (t.url || "").includes("127.0.0.1"));
      // Tab ngoài quyền KHÔNG có url — chính phép đo này chứng minh điều đó — nên
      // phải tìm bằng LOẠI TRỪ. Bản đầu tìm theo tiền tố "file:" và trượt sạch
      // nhánh này, tức là khai "đo rồi" cho một nhánh chưa hề chạy.
      const tabNgoai = tabs.find((t) => t.id !== (tabTrong && tabTrong.id) && t.id !== (tabMinh && tabMinh.id));
      const doZoom = async (tab) => {
        if (!tab) return { thieuTab: true };
        return {
          tabId: tab.id,
          set12: await thu("setZoom(1.2)", () => chrome.tabs.setZoom(tab.id, 1.2)),
          get1:  await thu("getZoom sau 1.2", () => chrome.tabs.getZoom(tab.id)),
          set08: await thu("setZoom(0.8)", () => chrome.tabs.setZoom(tab.id, 0.8)),
          get2:  await thu("getZoom sau 0.8", () => chrome.tabs.getZoom(tab.id))
        };
      };
      return {
        soTab: tabs.length,
        urlTrongQuyen: !!(tabTrong && typeof tabTrong.url === "string" && tabTrong.url.length > 0),
        urlNgoaiQuyen: !!(tabNgoai && typeof tabNgoai.url === "string" && tabNgoai.url.length > 0),
        // Đúng NGUYÊN câu hỏi của U2: bảng bên hỏi tab đang xem.
        tabDangXem: await thu("query active+currentWindow", async () => {
          const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
          return t ? { id: t.id, coUrl: typeof t.url === "string" && t.url.length > 0 } : null;
        }),
        trongQuyen: await doZoom(tabTrong),
        ngoaiQuyen: await doZoom(tabNgoai)
      };
    `);

    return {
      chrome: ban.product,
      goi: THU_MUC_GOI,
      quyenKhaiBao: manifest.permissions,
      hostKhaiBao: manifest.host_permissions,
      coKhaiQuyenTabs: (manifest.permissions || []).includes("tabs"),
      coApiTabs,
      ketQua
    };
  } finally {
    con.kill();
    may.close();
    setTimeout(() => { try { rmSync(goc, { recursive: true, force: true }); } catch { /* thư mục tạm, kệ */ } }, 1000);
  }
}

/* ---- In ra cho mắt người đọc --------------------------------------------- */

export function inRa(tho) {
  const { canQuyenTabs, dong, m } = ketLuan(tho);
  const ra = [];
  ra.push("PHÉP ĐO U0 — `chrome.tabs.setZoom` có đòi quyền `tabs` không");
  ra.push(`Chrome ${tho.chrome} · manifest khai quyền: ${JSON.stringify(tho.quyenKhaiBao)}`);
  ra.push(`manifest có khai "tabs"? ${tho.coKhaiQuyenTabs ? "CÓ" : "KHÔNG"}` +
    (tho.coKhaiQuyenTabs ? "  ← phép đo MẤT NGHĨA, nó chỉ đo được lúc KHÔNG khai" : ""));
  ra.push("");
  for (const d of dong) ra.push(`   ${d.dat ? "xanh" : "ĐỎ  "}  ${d.id} — ${d.y}`);
  ra.push("");
  ra.push(`   tab TRONG host_permissions   url đọc được=${m.urlTrongQuyen}  ·  zoom đặt+đọc lại đúng=${m.trongQuyen.dat}`);
  ra.push(`   tab NGOÀI mọi quyền          url đọc được=${m.urlNgoaiQuyen}  ·  zoom đặt+đọc lại đúng=${m.ngoaiQuyen.dat}`);
  ra.push("");
  ra.push(canQuyenTabs
    ? "KẾT LUẬN: CẦN thêm `tabs` vào manifest → U2 đụng hợp đồng quyền, phải sửa khối ⑵ của be-mat-hep-smoke."
    : "KẾT LUẬN: KHÔNG cần `tabs`. U2 chạy được với manifest hiện tại, không đụng hợp đồng quyền.");
  if (m.ngoaiQuyen.dat === true) {
    ra.push("");
    ra.push("CẢNH BÁO ĐỌC KỸ: `setZoom` KHÔNG bị `host_permissions` chặn — nó phóng to được cả tab");
    ra.push("ngoài quyền. Thứ chặn `U2` phóng nhầm tab lạ là `tab.url` bị GIẤU, tức lớp an toàn nằm ở");
    ra.push("đường ĐỌC chứ không ở đường GHI. Ai đó 'chữa' bằng cách zoom tab đang xem khi không đọc");
    ra.push("được url thì vừa gỡ mất lớp chặn duy nhất.");
  }
  return ra.join("\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  do_()
    .then((tho) => {
      if (process.argv.includes("--json")) console.log(JSON.stringify(tho, null, 2));
      else console.log(inRa(tho));
    })
    .catch((e) => { console.error("PHÉP ĐO KHÔNG CHẠY ĐƯỢC:", e.message); process.exit(2); });
}

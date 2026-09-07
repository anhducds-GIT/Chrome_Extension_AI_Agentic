/* scouter-action-reality-probe.mjs — PHÉP ĐO ② của Scouter (`S-06`).
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * Ba lệnh ghi của Scouter — `input.click` · `input.type` · `input.key` — có làm đúng việc
 * trên một trang THẬT không?
 *
 * ─── NÓ KHÁC PHÉP ĐO ① CHỖ NÀO, VÀ VÌ SAO KHÁC ĐÓ LÀ CẢ LÝ DO NÓ TỒN TẠI ────
 * Phép đo ① (06/09) hỏi: *đường đi* có dùng được không — cú bấm qua `chrome.debugger` có được
 * trang coi là của người không. Trả lời: có. Nhưng nó tự gõ ba khung chuột bằng tay, và tự lấy
 * toạ độ bằng `getBoundingClientRect`. Nó **không chạy một dòng nào của Scouter**.
 *
 * File này thì nạp **CHÍNH `scripts/scouter-actions-core.mjs`** — bản trên đĩa, chép nguyên, có
 * kiểm mã băm — vào một extension thử rồi gọi `runAction()` thật. Nên nó đo được thứ ① không
 * đo được: **Scouter tự tính toạ độ có ra đúng chỗ không.**
 *
 * ─── CHỖ NGUY NHẤT, VÀ VÌ SAO TRANG GIẢ KHÔNG BAO GIỜ BẮT ĐƯỢC NÓ ──────────
 * Trong phép ghim, hộp của phần tử là con số ta tự đặt, nên "tâm hộp" luôn đúng theo định
 * nghĩa. Trên trang thật, hộp do Chrome trả về và nó phụ thuộc **trang đang cuộn tới đâu**.
 * `DOM.getBoxModel` và `Input.dispatchMouseEvent` không bắt buộc phải cùng một hệ toạ độ, và
 * nếu chúng lệch thì triệu chứng là **bấm trúng phần tử bên cạnh** — một lỗi im lặng, vì lệnh
 * vẫn báo thành công. Nên trang thử ở đây có:
 *
 *   · HAI nút chữ giống hệt nhau, cạnh nhau → bấm nút thứ HAI, hỏi trang nút nào kêu;
 *   · một nút nằm DƯỚI 1800px khoảng trống → phải cuộn xuống mới bấm được;
 *   · rồi bấm ngược lên nút đã trôi lên trên → phải cuộn LÊN.
 *
 * Ba ca đó là ba ca một trang giả không thể có.
 *
 * ─── KHÔNG ĐỤNG TRANG THẬT ──────────────────────────────────────────────────
 * Trang thử do chính file này sinh trong thư mục tạm; Chrome chạy hồ sơ TRỐNG cũng trong thư
 * mục tạm. Không đăng nhập, không tốn credit, không rơi vào `AGENTS.md` mục 2. Không ghi nội
 * dung trang nào xuống đĩa (ADR-0010) — thứ duy nhất ra stdout là tên phần tử và mấy cờ boolean
 * của chính trang thử này.
 *
 * ─── MỘT CHỖ CỐ Ý PHẠM LUẬT CỦA LÕI, VÀ NÓ HỢP LỆ ──────────────────────────
 * Để ĐỌC LẠI xem trang đã xảy ra gì, phép đo dùng `Runtime.evaluate` — lệnh nằm NGOÀI danh
 * sách `WRITE_CDP_METHODS` của lõi. Không mâu thuẫn: **dụng cụ đo được phép dùng thứ mà vật bị
 * đo không được dùng**. Lệnh đó do chính file này gửi, không đi qua `runAction`, và cây gọi của
 * lõi không hề biết nó tồn tại. Nếu để lõi tự đọc lại kết quả của mình thì phép đo hỏng theo
 * đúng cách tệ nhất: nó sẽ tin lời khai của vật bị đo.
 *
 * Chạy:  node scripts/scouter-action-reality-probe.mjs
 *        node scripts/scouter-action-reality-probe.mjs --json
 *        CHROME_PATH=... node scripts/scouter-action-reality-probe.mjs
 *
 * Mã thoát: 0 = ĐẠT · 1 = KHÔNG ĐẠT · 2 = phép đo KHÔNG CHẠY ĐƯỢC (khác hẳn "không đạt").
 */

import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const ACTIONS_CORE = join(HERE, "scouter-actions-core.mjs");

const NL = String.fromCharCode(10);

/* ---- Trang thử ----------------------------------------------------------
 * Nó chỉ ghi lại trang NHÌN THẤY GÌ, không có logic nào khác — một trang thử phức tạp là một
 * trang thử có thể tự nó sai. `window.open` trong tay bấm là CỔNG HOẠT ĐỘNG: trình duyệt chặn
 * popup khi không có transient activation, nên nó đo được thứ `isTrusted` không đo được. */
const TEST_PAGE = [
  '<!doctype html>',
  '<meta charset="utf-8">',
  '<title>scouter-action-reality-probe</title>',
  '<style>body{margin:0;font:14px sans-serif}button{display:block;margin:10px;padding:8px 18px}',
  '#txt{display:block;margin:10px;padding:6px}.khoang-trong{height:1800px}</style>',
  '<body>',
  '<button id="tren1">Gui</button>',
  '<button id="tren2">Gui</button>',
  '<input id="txt">',
  '<button class="doi">a</button>',
  '<button class="doi">b</button>',
  '<div class="khoang-trong"></div>',
  '<button id="duoi">Xa</button>',
  '<script>',
  'window.__bam = [];',
  'window.__phim = [];',
  'window.__cong = null;',
  'document.addEventListener("click", function (e) {',
  '  var ua = navigator.userActivation;',
  '  window.__bam.push({ id: e.target && e.target.id, lop: e.target && String(e.target.className || ""),',
  '    isTrusted: e.isTrusted, uaIsActive: ua ? ua.isActive : null });',
  '}, true);',
  '["keydown","keyup","input"].forEach(function (t) {',
  '  document.addEventListener(t, function (e) {',
  '    window.__phim.push({ type: e.type, key: e.key === undefined ? null : e.key,',
  '      isTrusted: e.isTrusted, target: e.target && e.target.id });',
  '  }, true);',
  '});',
  'document.getElementById("tren2").addEventListener("click", function () {',
  '  var w = null;',
  '  try { w = window.open("about:blank", "_blank", "width=80,height=80"); } catch (err) { w = null; }',
  '  window.__cong = { popupAllowed: !!w };',
  '  if (w) { try { w.close(); } catch (err) {} }',
  '});',
  '</script>',
  '</body>'
].join(NL);

/* Extension thử — bản NHỎ NHẤT chạy được lõi hành động thật. Nó KHÔNG phải Scouter và không
 * được dùng lại làm Scouter: nó sống đúng một lần chạy rồi bị xoá cùng thư mục tạm.
 * Quyền đúng bằng thứ cần để gắn debugger; không xin gì thêm. */
const PROBE_EXT_MANIFEST = {
  manifest_version: 3,
  name: "scouter-action-reality-probe",
  version: "0.0.1",
  permissions: ["debugger", "tabs"],
  host_permissions: ["<all_urls>"],
  background: { service_worker: "sw.js", type: "module" }
};

const CDP_VERSION = "1.3";

/* ---- Phần THUẦN LOGIC: chấm điểm ---------------------------------------
 * Tách hẳn khỏi mọi thứ đụng Chrome, để phép ghim chạy được mà không cần trình duyệt.
 * Mỗi tiêu chí kèm `why` — một tiêu chí không giải thích được vì sao nó ở đây thì nó không
 * nên ở đây. */
export const CRITERIA = Object.freeze([
  {
    id: "CLICK_LANDS_ON_THE_RIGHT_ELEMENT",
    why: "Chốt đắt nhất của gói. Hai nút chữ giống hệt cạnh nhau; bấm nút THỨ HAI thì trang phải báo đúng nút thứ hai kêu. Sai ở đây là bấm nhầm phần tử — lỗi im lặng, vì lệnh vẫn báo thành công.",
    check: (m) => m.click_tren2?.ok === true && m.click_tren2?.hit?.id === "tren2"
  },
  {
    id: "CLICK_IS_TRUSTED_AND_ACTIVATES",
    why: "Lặp lại kết luận của phép đo ① nhưng lần này QUA CHÍNH LÕI CỦA SCOUTER: trang phải thấy isTrusted=true và cổng hoạt động phải mở (popup không bị chặn).",
    check: (m) => m.click_tren2?.hit?.isTrusted === true
      && m.click_tren2?.hit?.uaIsActive === true
      && m.gate?.popupAllowed === true
  },
  {
    id: "CLICK_REACHES_BELOW_THE_FOLD",
    why: "Nút nằm dưới 1800px khoảng trống: lõi phải tự cuộn tới rồi đo lại hộp. Đây là chỗ hệ toạ độ của DOM.getBoxModel và của Input.dispatchMouseEvent có thể lệch nhau, và trang giả không bao giờ bắt được.",
    check: (m) => m.click_duoi?.ok === true && m.click_duoi?.hit?.id === "duoi"
  },
  {
    id: "CLICK_SCROLLS_BACK_UP",
    why: "Chiều ngược lại của tiêu chí trên. Cuộn xuống rồi bấm ngược lên một nút đã trôi khỏi màn hình — một bản chỉ cộng thêm độ cuộn theo một chiều sẽ ĐẠT ca dưới mà ĐỎ ca này.",
    check: (m) => m.click_len?.ok === true && m.click_len?.hit?.id === "tren1"
  },
  {
    id: "TYPE_PUTS_THE_EXACT_TEXT_IN",
    why: "Gõ xong thì ô nhập phải chứa ĐÚNG chuỗi đã gửi, không thiếu không thừa ký tự, và trang phải thấy phím là thật.",
    check: (m) => m.type?.ok === true && m.type?.value === "xin chao"
      && m.type?.trustedKeydowns === "xin chao".length
  },
  {
    id: "KEY_ENTER_ARRIVES_TRUSTED",
    why: "`input.key` phải gửi được một phím có tên tới đúng ô đang focus, và trang phải thấy nó là thật.",
    check: (m) => m.key?.ok === true && m.key?.enter?.isTrusted === true && m.key?.enter?.target === "txt"
  },
  {
    id: "AMBIGUOUS_SELECTOR_REFUSED_ON_A_REAL_DOM",
    why: "Selector khớp hai phần tử phải bị từ chối, và phải từ chối TRƯỚC khi bấm: trang không được ghi nhận thêm cú bấm nào.",
    check: (m) => m.mo_ho?.ok === false && m.mo_ho?.code === "SELECTOR_AMBIGUOUS" && m.mo_ho?.extraClicks === 0
  },
  {
    id: "NO_MATCH_SELECTOR_REFUSED",
    why: "Selector không khớp gì cũng phải từ chối chứ không im lặng bấm vào đâu đó.",
    check: (m) => m.khong_khop?.ok === false && m.khong_khop?.code === "SELECTOR_NO_MATCH" && m.khong_khop?.extraClicks === 0
  },
  {
    id: "CALLER_COORDINATES_REFUSED",
    why: "Toạ độ do người gọi đưa vào phải bị từ chối ngay cả khi selector hoàn toàn hợp lệ. Nhận toạ độ là biến `scout.click` thành bấm-bất-kỳ-đâu.",
    check: (m) => m.toa_do?.ok === false && m.toa_do?.code === "COORDINATE_NOT_ACCEPTED" && m.toa_do?.extraClicks === 0
  },
  {
    id: "CONTROL_CHAR_TEXT_REFUSED",
    why: "Một ký tự xuống dòng lọt vào giữa chuỗi là một lượt gửi biểu mẫu không ai yêu cầu. Enter đi qua `input.key`, không đi lẫn trong `input.type`.",
    check: (m) => m.ky_tu_dieu_khien?.ok === false && m.ky_tu_dieu_khien?.code === "TEXT_HAS_CONTROL_CHAR"
  },
  {
    id: "CORE_STAYED_INSIDE_ITS_CDP_LIST",
    why: "Đo lại trên đường thật cái mà đột biến kiểm canh trên đường giả: mọi lệnh lõi gửi phải nằm trong WRITE_CDP_METHODS. Một lệnh lạ ở đây nghĩa là lõi đã đi vòng qua chính cổng của nó.",
    check: (m) => Array.isArray(m.cdpUsed) && m.cdpUsed.length > 0 && m.cdpOutside?.length === 0
  }
]);

export function verdict(measured) {
  const lines = CRITERIA.map((c) => {
    let pass = false;
    try { pass = c.check(measured) === true; } catch { pass = false; }
    return { id: c.id, why: c.why, pass };
  });
  return { pass: lines.every((l) => l.pass), lines, measured };
}

/* ---- Bộ máy: Chrome qua ống -------------------------------------------
 * Từ Chrome 137 `--load-extension` bị vô hiệu hoá, nên đường duy nhất Chrome hiện hành còn
 * thừa nhận là `Extensions.loadUnpacked` qua CDP, và lệnh đó CHỈ có khi chạy
 * `--remote-debugging-pipe` kèm `--enable-unsafe-extension-debugging`. Hai cờ đó chỉ để CÀI
 * được extension thử; chúng không đụng gì tới ngữ nghĩa của cú bấm. Chi tiết ở phép đo ①. */
function findChrome() {
  if (process.env.CHROME_PATH && existsSync(process.env.CHROME_PATH)) return process.env.CHROME_PATH;
  const candidates = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium"
  ];
  return candidates.find((p) => existsSync(p)) || null;
}

class PipeCdp {
  constructor(child) {
    this.write = child.stdio[3];
    this.id = 0;
    this.pending = new Map();
    let buffer = Buffer.alloc(0);
    child.stdio[4].on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (;;) {
        const cut = buffer.indexOf(0);
        if (cut < 0) break;
        const raw = buffer.subarray(0, cut).toString("utf8");
        buffer = buffer.subarray(cut + 1);
        let msg;
        try { msg = JSON.parse(raw); } catch { continue; }
        const slot = this.pending.get(msg.id);
        if (!slot) continue;
        this.pending.delete(msg.id);
        if (msg.error) slot.reject(new Error(JSON.stringify(msg.error)));
        else slot.resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const msg = sessionId ? { id, method, params, sessionId } : { id, method, params };
    this.write.write(JSON.stringify(msg) + "\0");
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function until(fn, label, ms = 30000) {
  const deadline = Date.now() + ms;
  for (;;) {
    try { const value = await fn(); if (value) return value; } catch { /* chưa sẵn sàng */ }
    if (Date.now() > deadline) throw new Error(`Chờ quá ${ms}ms: ${label}`);
    await new Promise((r) => setTimeout(r, 250));
  }
}

/* Chép lõi hành động THẬT vào extension thử. Chép, không viết lại — và trả về mã băm để bản
 * báo cáo nói được nó vừa đo bản nào. Một phép đo chạy trên bản chép tay của lõi thì nó đo bản
 * chép tay, và đó là cách êm ái nhất để báo ĐẠT về một thứ không tồn tại. */
function buildProbeExtension(dir) {
  const source = readFileSync(ACTIONS_CORE);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(PROBE_EXT_MANIFEST, null, 2) + NL, "utf8");
  writeFileSync(join(dir, "sw.js"), "chrome.runtime.onMessage.addListener(() => {});" + NL, "utf8");
  writeFileSync(join(dir, "scouter-actions-core.mjs"), source);
  /* Script phải nằm ở FILE RIÊNG, không nội tuyến. CSP mặc định của MV3 là `script-src 'self'`,
   * và nó chặn mọi `<script>` có thân ngay trong HTML — kể cả `type="module"`. Trang lên bình
   * thường, không lỗi nào hiện ra ngoài, chỉ là mã không bao giờ chạy. Đã mất một lượt vì chỗ
   * này; phép đo ① không vấp vì trang extension của nó không có script nào. */
  writeFileSync(join(dir, "probe.html"), [
    '<!doctype html>',
    '<meta charset="utf-8">',
    '<title>scouter-action-reality-probe-ext</title>',
    '<script type="module" src="probe.js"></script>',
    '<body>san sang</body>'
  ].join(NL), "utf8");
  writeFileSync(join(dir, "probe.js"), [
    'import { runAction, WRITE_CDP_METHODS } from "./scouter-actions-core.mjs";',
    'globalThis.__WRITE_CDP_METHODS = WRITE_CDP_METHODS;',
    'globalThis.__cdpUsed = [];',
    '/* `sendRaw` là chỗ DUY NHẤT lõi chạm tới trình duyệt, nên ghi lại tại đây là ghi được',
    '   TOÀN BỘ lệnh lõi gửi — kể cả lệnh nó không khai trong danh sách của mình. */',
    'globalThis.__runAction = async function (name, params) {',
    '  return await runAction(name, {',
    '    sendRaw: async function (method, p) {',
    '      globalThis.__cdpUsed.push(method);',
    '      return await chrome.debugger.sendCommand(globalThis.__target, method, p);',
    '    }',
    '  }, params);',
    '};',
    'globalThis.__san_sang = true;'
  ].join(NL), "utf8");
  return createHash("sha256").update(source).digest("hex").slice(0, 16);
}

async function measure() {
  const chromePath = findChrome();
  if (!chromePath) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");

  const root = mkdtempSync(join(tmpdir(), "scouter-action-"));
  const pageFile = join(root, "page.html");
  writeFileSync(pageFile, TEST_PAGE, "utf8");
  const pageUrl = "file:///" + pageFile.replace(/\\/g, "/");
  const extDir = join(root, "ext");
  const coreHash = buildProbeExtension(extDir);

  const child = spawn(chromePath, [
    "--remote-debugging-pipe",
    "--enable-unsafe-extension-debugging",
    `--user-data-dir=${join(root, "prof")}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-background-timer-throttling",
    pageUrl
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  try {
    const cdp = new PipeCdp(child);
    const version = await until(() => cdp.send("Browser.getVersion"), "Chrome trả lời qua ống");
    const pageTarget = await until(async () => {
      const { targetInfos } = await cdp.send("Target.getTargets");
      return targetInfos.find((t) => t.type === "page" && t.url.includes("page.html"));
    }, "trang thử xuất hiện");

    const extId = (await cdp.send("Extensions.loadUnpacked", { path: extDir })).id;
    const extUrl = `chrome-extension://${extId}/probe.html`;
    const extTargetId = (await cdp.send("Target.createTarget", { url: extUrl })).targetId;
    const extSession = (await cdp.send("Target.attachToTarget", { targetId: extTargetId, flatten: true })).sessionId;
    await cdp.send("Page.enable", {}, extSession);
    await cdp.send("Runtime.enable", {}, extSession);
    /* Điều hướng LẠI, dù `Target.createTarget` đã mở đúng URL: lượt mở đầu tiên hay tới trước
     * khi Chrome đăng ký xong extension vừa nạp, và khi đó trang lên rỗng — không lỗi, không
     * báo gì, chỉ là `__san_sang` không bao giờ thành true. Phép đo ① cũng làm bước này. */
    await cdp.send("Page.navigate", { url: extUrl }, extSession);

    const inExtension = async (body) => {
      const r = await cdp.send("Runtime.evaluate", {
        expression: `(async () => { ${body} })()`,
        returnByValue: true,
        awaitPromise: true
      }, extSession);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };

    await until(() => inExtension("return globalThis.__san_sang === true;"),
      "trang extension nạp xong lõi hành động");
    await inExtension(`
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url && t.url.includes("page.html"));
      if (!tab) throw new Error("khong tim thay tab trang thu");
      globalThis.__target = { tabId: tab.id };
      await chrome.debugger.attach(globalThis.__target, ${JSON.stringify(CDP_VERSION)});
      return true;
    `);

    /* Dụng cụ đo đọc lại trang bằng `Runtime.evaluate` — xem khối đầu file: hợp lệ, vì nó
     * KHÔNG đi qua `runAction`. */
    const readPage = async (expression) => {
      const r = await inExtension(
        `return await chrome.debugger.sendCommand(globalThis.__target, "Runtime.evaluate", ` +
        `{ expression: ${JSON.stringify(expression)}, returnByValue: true, awaitPromise: true });`
      );
      if (r?.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r?.result?.value;
    };

    const act = (name, params) => inExtension(
      `return await globalThis.__runAction(${JSON.stringify(name)}, ${JSON.stringify(params)});`
    );
    const clicksSoFar = async () => Number(await readPage("window.__bam.length"));
    const lastClick = async () => JSON.parse(await readPage("JSON.stringify(window.__bam[window.__bam.length-1] || null)"));

    const m = {};

    /* ① bấm nút THỨ HAI trong hai nút chữ giống hệt nhau */
    const r1 = await act("input.click", { selector: "#tren2" });
    m.click_tren2 = { ok: r1.ok, code: r1.code, hit: await lastClick() };
    m.gate = JSON.parse((await readPage("JSON.stringify(window.__cong)")) || "null");

    /* ② gõ chữ vào ô nhập */
    const r2 = await act("input.type", { selector: "#txt", text: "xin chao" });
    m.type = {
      ok: r2.ok, code: r2.code,
      value: await readPage("document.getElementById('txt').value"),
      trustedKeydowns: Number(await readPage(
        "window.__phim.filter(function(e){return e.type==='keydown'&&e.isTrusted&&e.target==='txt'}).length"))
    };

    /* ③ phím có tên */
    await readPage("window.__phim = []; ''");
    const r3 = await act("input.key", { selector: "#txt", key: "Enter" });
    m.key = {
      ok: r3.ok, code: r3.code,
      enter: JSON.parse(await readPage(
        "JSON.stringify(window.__phim.find(function(e){return e.type==='keydown'&&e.key==='Enter'}) || null)"))
    };

    /* ④ nút dưới 1800px khoảng trống — phải cuộn XUỐNG */
    const r4 = await act("input.click", { selector: "#duoi" });
    m.click_duoi = {
      ok: r4.ok, code: r4.code, hit: await lastClick(),
      scrollY: Number(await readPage("window.scrollY"))
    };

    /* ⑤ rồi bấm ngược lên nút đã trôi khỏi màn hình — phải cuộn LÊN */
    const r5 = await act("input.click", { selector: "#tren1" });
    m.click_len = { ok: r5.ok, code: r5.code, hit: await lastClick() };

    /* ⑥…⑨ bốn ca PHẢI bị từ chối. Mỗi ca đếm lại số cú bấm trang ghi nhận: từ chối mà vẫn
     * bấm thì cái cổng chỉ là lời bình luận. */
    const refuse = async (key, name, params) => {
      const before = await clicksSoFar();
      const r = await act(name, params);
      m[key] = { ok: r.ok, code: r.code, extraClicks: (await clicksSoFar()) - before };
    };
    await refuse("mo_ho", "input.click", { selector: ".doi" });
    await refuse("khong_khop", "input.click", { selector: "#khong-ton-tai-dau" });
    await refuse("toa_do", "input.click", { selector: "#tren1", x: 10, y: 10 });
    await refuse("ky_tu_dieu_khien", "input.type", { selector: "#txt", text: "a" + NL + "b" });

    /* ⑩ lõi có đi ra ngoài danh sách lệnh của chính nó không */
    m.cdpUsed = [...new Set(await inExtension("return globalThis.__cdpUsed;"))].sort();
    const allowed = new Set(await inExtension("return globalThis.__WRITE_CDP_METHODS;"));
    m.cdpOutside = m.cdpUsed.filter((method) => !allowed.has(method));

    await inExtension("try { await chrome.debugger.detach(globalThis.__target); } catch (e) {} return true;");

    return { chrome: version.product, protocol: version.protocolVersion, coreHash, measured: m };
  } finally {
    child.kill();
    setTimeout(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* thư mục tạm, kệ */ } }, 1000);
  }
}

/* ---- In ra cho mắt người đọc -------------------------------------------- */

export function report(result) {
  const v = verdict(result.measured);
  const m = result.measured;
  const out = [];
  out.push("PHÉP ĐO ② — ba lệnh ghi của Scouter có làm đúng việc trên một trang THẬT không");
  out.push(`Chrome ${result.chrome} · giao thức ${result.protocol} · lõi đo được sha256:${result.coreHash}`);
  out.push("");
  for (const line of v.lines) out.push(`  ${line.pass ? "xanh" : "ĐỎ  "}  ${line.id}`);
  out.push("");
  out.push(`  bấm nút thứ hai trong hai nút giống nhau  → trang báo nút '${m.click_tren2?.hit?.id}' kêu`);
  out.push(`  trang thấy cú bấm                          isTrusted=${m.click_tren2?.hit?.isTrusted} · cổng hoạt động mở=${m.gate?.popupAllowed}`);
  out.push(`  nút dưới 1800px khoảng trống               → trang báo '${m.click_duoi?.hit?.id}' kêu, đã cuộn ${m.click_duoi?.scrollY}px`);
  out.push(`  bấm ngược lên nút đã trôi khỏi màn hình    → trang báo '${m.click_len?.hit?.id}' kêu`);
  out.push(`  gõ "xin chao"                              → ô nhập chứa "${m.type?.value}" · ${m.type?.trustedKeydowns} phím thật`);
  out.push(`  gõ phím Enter                              → trang thấy Enter, isTrusted=${m.key?.enter?.isTrusted}`);
  out.push(`  bốn ca phải từ chối                        ${["mo_ho", "khong_khop", "toa_do", "ky_tu_dieu_khien"]
    .map((k) => `${k}=${m[k]?.code || "KHÔNG TỪ CHỐI"}`).join(" · ")}`);
  out.push(`  lệnh CDP lõi đã gửi                        ${(m.cdpUsed || []).join(", ")}`);
  out.push(`  trong đó nằm NGOÀI danh sách của lõi       ${(m.cdpOutside || []).length === 0 ? "không có" : m.cdpOutside.join(", ")}`);
  out.push("");
  out.push(v.pass
    ? "KẾT LUẬN: ĐẠT. Ba lệnh ghi làm đúng việc trên trang thật, kể cả khi phải cuộn hai chiều."
    : "KẾT LUẬN: KHÔNG ĐẠT. Đọc dòng ĐỎ ở trên — đừng xây tiếp lên trên một đường ghi chưa đúng.");
  out.push("CHƯA ĐO: trang có khung lồng (iframe) · trang đổi tỉ lệ hiển thị · trang thật của nhà cung cấp.");
  return { pass: v.pass, text: out.join(NL), verdict: v };
}

/* `pathToFileURL`, KHÔNG phải ghép chuỗi: đường dẫn repo này có DẤU CÁCH, mà URL mã hoá dấu
 * cách thành %20 — bản ghép chuỗi so ra "khác nhau" nên file im lặng không chạy gì và thoát 0.
 * Một phép đo im lặng báo ĐẠT là thứ tệ nhất file này có thể làm; phép đo ① đã dính một lần. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await measure();
    const r = report(result);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ chrome: result.chrome, coreHash: result.coreHash, pass: r.pass, measured: result.measured }, null, 2));
    } else {
      console.log(r.text);
    }
    process.exit(r.pass ? 0 : 1);
  } catch (error) {
    console.error(`KHÔNG CHẠY ĐƯỢC PHÉP ĐO: ${error.message}`);
    console.error("Đây KHÔNG phải kết quả 'không đạt' — phép đo chưa chạy. Đừng ghi nó vào sổ.");
    process.exit(2);
  }
}

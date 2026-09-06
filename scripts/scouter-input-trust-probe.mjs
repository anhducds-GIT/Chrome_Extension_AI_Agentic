/* scouter-input-trust-probe.mjs — PHÉP ĐO ① của Scouter.
 *
 * Đề bài: docs/briefs/BRIEF-SCOUTER-SEED-01.md mục 1. Quyết định: ADR-0010.
 * Nghiên cứu đi trước: docs/studies/EXP-14-INPUT-SEMANTICS-BROWSER-INPUT-REACH-STUDY-V0.md
 * — nó dừng đúng câu hỏi này ở mức `MICRO-PROOF REQUIRED`. File này đóng chỗ đó.
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * Cú bấm đi qua đường điều khiển của trình duyệt có được trang nhìn thấy như cú bấm của
 * người thật không?
 *
 * ─── VÌ SAO ĐO HAI ĐƯỜNG, KHÔNG PHẢI MỘT ────────────────────────────────────
 * Đo bằng phiên CDP thẳng là đường DỄ. Nhưng Scouter KHÔNG dùng đường đó — nó dùng
 * `chrome.debugger` từ bên trong một extension. Hai đường tới cùng một chỗ trong Chromium,
 * nhưng "tới cùng một chỗ" là SUY LUẬN — và suy luận đúng chính là thứ EXP-14 đã có sẵn,
 * nên lặp lại nó thì không thêm được gì. Phép đo này chạy CẢ HAI:
 *
 *   route "cdp" — phiên CDP thẳng                      (đối chứng)
 *   route "ext" — chrome.debugger từ trong extension    (ĐƯỜNG THẬT CỦA SCOUTER, tính điểm)
 *
 * ─── VÌ SAO NÓI CHUYỆN QUA ỐNG, KHÔNG QUA CỔNG ──────────────────────────────
 * Từ Chrome 137, `--load-extension` bị VÔ HIỆU HOÁ — đo trên Chrome 152 ngày 06/09 thì
 * trang extension trả về `ERR_BLOCKED_BY_CLIENT`, và `--disable-features=` không mở lại
 * được. Đường còn lại mà Chrome hiện hành thừa nhận là `Extensions.loadUnpacked` qua CDP,
 * và lệnh đó CHỈ có khi chạy `--remote-debugging-pipe` kèm `--enable-unsafe-extension-debugging`.
 * Hai cờ đó chỉ để CÀI được extension thử; chúng không đụng gì tới ngữ nghĩa của cú bấm.
 *
 * ─── KHÔNG ĐỤNG TRANG THẬT ──────────────────────────────────────────────────
 * Trang thử do chính file này sinh ra trong thư mục tạm; Chrome chạy bằng hồ sơ TRỐNG cũng
 * trong thư mục tạm. Không đăng nhập gì, không tốn credit, không rơi vào `AGENTS.md` mục 2.
 * Không ghi nội dung trang nào xuống đĩa (BRIEF mục 4) — thứ duy nhất đi ra là stdout, và nó
 * chỉ chứa TÊN sự kiện cùng mấy cờ boolean.
 *
 * Chạy:  node scripts/scouter-input-trust-probe.mjs
 *        node scripts/scouter-input-trust-probe.mjs --json
 *        CHROME_PATH=... node scripts/scouter-input-trust-probe.mjs
 *
 * Mã thoát: 0 = ĐẠT · 1 = KHÔNG ĐẠT · 2 = phép đo KHÔNG CHẠY ĐƯỢC (khác hẳn "không đạt").
 */

import { spawn } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

/* ---- Trang thử ----------------------------------------------------------
 * Nó chỉ làm một việc: ghi lại trang NHÌN THẤY GÌ. Không logic nào khác, cố ý — một trang
 * thử phức tạp là một trang thử có thể tự nó sai.
 * `window.open` trong tay bấm là CỔNG HOẠT ĐỘNG: trình duyệt chặn popup khi không có
 * transient activation, nên nó đo được thứ mà `isTrusted` KHÔNG đo được (EXP-14 mục 12). */
const TEST_PAGE = `<!doctype html>
<meta charset="utf-8">
<title>scouter-input-trust-probe</title>
<body>
<button id="btn">nut</button>
<input id="txt">
<script>
window.__log = [];
window.__gate = null;
window.__mark = function (m) { window.__log.push({ mark: m }); };
function rec(e) {
  var ua = navigator.userActivation;
  window.__log.push({
    type: e.type,
    isTrusted: e.isTrusted,
    target: e.target && e.target.id,
    activeElement: document.activeElement && document.activeElement.id,
    uaIsActive: ua ? ua.isActive : null,
    uaHasBeenActive: ua ? ua.hasBeenActive : null,
    key: e.key === undefined ? null : e.key,
    inputType: e.inputType === undefined ? null : e.inputType,
    valueLength: e.target && e.target.id === "txt" ? String(e.target.value).length : null
  });
}
["pointerdown","mousedown","mouseup","click","keydown","keyup","input","focus"]
  .forEach(function (t) { document.addEventListener(t, rec, true); });
document.getElementById("btn").addEventListener("click", function () {
  var w = null;
  try { w = window.open("about:blank", "_blank", "width=80,height=80"); } catch (err) { w = null; }
  window.__gate = { popupAllowed: !!w };
  if (w) { try { w.close(); } catch (err) {} }
});
</script>
</body>`;

/* Extension thử — bản NHỎ NHẤT gọi được `chrome.debugger`. Nó KHÔNG phải Scouter, và không
 * được dùng lại làm Scouter: nó sống đúng một lần chạy rồi bị xoá cùng thư mục tạm. */
const PROBE_EXT_MANIFEST = {
  manifest_version: 3,
  name: "scouter-input-trust-probe",
  version: "0.0.1",
  permissions: ["debugger", "tabs"],
  host_permissions: ["<all_urls>"],
  background: { service_worker: "sw.js", type: "module" }
};

const CDP_VERSION = "1.3";

/* ---- Phần THUẦN LOGIC: chấm điểm ---------------------------------------
 * Tách hẳn khỏi mọi thứ đụng Chrome, để phép ghim chạy được mà không cần trình duyệt. */

/** Năm điều phải đúng CÙNG LÚC thì phép đo mới ĐẠT. */
export const CRITERIA = Object.freeze([
  {
    id: "A_JS_DISPATCH_UNTRUSTED",
    why: "Sự kiện giả lập trong trang PHẢI ra isTrusted=false. Ra true thì phép đo hỏng, không phải Chrome đổi luật.",
    check: (m) => m.A?.click?.isTrusted === false
  },
  {
    id: "B_ELEMENT_CLICK_UNTRUSTED",
    why: "HTMLElement.click() cũng PHẢI là false. Đây đúng là cách ba worker đang bấm hôm nay.",
    check: (m) => m.B?.click?.isTrusted === false
  },
  {
    id: "C_CDP_MOUSE_TRUSTED",
    why: "Câu hỏi chính: bấm qua đường trình duyệt phải cho isTrusted=true.",
    check: (m) => m.C?.click?.isTrusted === true
  },
  {
    id: "C_CDP_MOUSE_ACTIVATES",
    why: "isTrusted=true chưa đủ (EXP-14 mục 12): cú bấm còn phải MỞ ĐƯỢC cổng hoạt động của trình duyệt.",
    check: (m) => m.C?.click?.uaIsActive === true && m.gate?.popupAllowed === true
  },
  {
    id: "E_CDP_KEY_TRUSTED_AND_TYPED",
    why: "Gõ phím qua đường trình duyệt phải vừa trusted vừa THẬT SỰ làm ô nhập dài thêm.",
    check: (m) => m.E?.keydown?.isTrusted === true && m.E?.typedChars > 0
  }
]);

/** Cắt nhật ký thô thành từng chặng theo mốc `mark`. */
export function splitByMark(log) {
  const out = {};
  let current = null;
  for (const entry of log || []) {
    if (entry.mark) {
      current = { events: [] };
      out[entry.mark] = current;
      continue;
    }
    if (current) current.events.push(entry);
  }
  return out;
}

/** Rút ra đúng những con số dùng để chấm, không hơn. */
export function summarise(raw) {
  const stages = splitByMark(raw.log);
  const pick = (stage, type) => (stages[stage]?.events || []).find((e) => e.type === type) || null;
  const typedChars = (() => {
    const inputs = (stages.E_cdpKey?.events || []).filter((e) => e.type === "input");
    if (inputs.length === 0) return 0;
    const before = (stages.D_valueAssign?.events || []).filter((e) => e.type === "input").pop();
    return (inputs[inputs.length - 1].valueLength ?? 0) - (before?.valueLength ?? 0);
  })();
  return {
    A: { click: pick("A_dispatchEvent", "click") },
    B: { click: pick("B_elementClick", "click") },
    C: { click: pick("C_cdpMouse", "click"), mousedown: pick("C_cdpMouse", "mousedown") },
    D: { input: pick("D_valueAssign", "input") },
    E: { keydown: pick("E_cdpKey", "keydown"), input: pick("E_cdpKey", "input"), typedChars },
    F: { input: pick("F_insertText", "input"), available: raw.insertTextAvailable },
    gate: raw.gate
  };
}

/** ĐẠT hay không, và vì sao. Cố ý KHÔNG có nhánh "gần đạt". */
export function verdict(raw) {
  const measured = summarise(raw);
  const lines = CRITERIA.map((c) => ({ id: c.id, why: c.why, pass: c.check(measured) === true }));
  return { pass: lines.every((l) => l.pass), lines, measured };
}

/* ---- Phần đụng Chrome --------------------------------------------------- */

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ].filter(Boolean);
  for (const c of candidates) if (existsSync(c)) return c;
  return null;
}

/* CDP qua ỐNG (fd 3 ghi, fd 4 đọc), mỗi thông điệp kết bằng một byte 0. Dùng `flatten`
 * nên mọi phiên con đi chung một ống — không có websocket nào ở đây. */
class PipeCdp {
  constructor(child) {
    this.write = child.stdio[3];
    this.id = 0;
    this.pending = new Map();
    let buffer = Buffer.alloc(0);
    child.stdio[4].on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      for (let cut = buffer.indexOf(0); cut !== -1; cut = buffer.indexOf(0)) {
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

function buildProbeExtension(dir) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "manifest.json"), JSON.stringify(PROBE_EXT_MANIFEST, null, 2) + "\n", "utf8");
  writeFileSync(join(dir, "sw.js"), "chrome.runtime.onMessage.addListener(() => {});\n", "utf8");
  writeFileSync(join(dir, "probe.html"),
    `<!doctype html>\n<meta charset="utf-8">\n<title>scouter-probe-ext</title>\n<body>san sang</body>\n`, "utf8");
}

/* Kịch bản đo. MỘT bản duy nhất dùng chung cho cả hai đường — nên nếu hai đường ra khác
 * nhau thì chênh lệch đó là của ĐƯỜNG, không phải của kịch bản. `call` là chỗ DUY NHẤT
 * hai đường khác nhau. */
async function runScenario(call, evaluate) {
  const centre = async (id) => JSON.parse(await evaluate(
    `(()=>{const r=document.getElementById(${JSON.stringify(id)}).getBoundingClientRect();` +
    `return JSON.stringify({x:r.x+r.width/2,y:r.y+r.height/2})})()`
  ));
  const btn = await centre("btn");
  const txt = await centre("txt");
  const click = async (p) => {
    await call("Input.dispatchMouseEvent", { type: "mouseMoved", x: p.x, y: p.y, button: "none", buttons: 0 });
    await call("Input.dispatchMouseEvent", { type: "mousePressed", x: p.x, y: p.y, button: "left", buttons: 1, clickCount: 1 });
    await call("Input.dispatchMouseEvent", { type: "mouseReleased", x: p.x, y: p.y, button: "left", buttons: 0, clickCount: 1 });
  };

  /* ① sự kiện giả lập trong trang */
  await evaluate(`window.__mark('A_dispatchEvent');document.getElementById('btn').dispatchEvent(new MouseEvent('click',{bubbles:true}));''`);
  /* ② HTMLElement.click() — cách ba worker đang bấm hôm nay */
  await evaluate(`window.__mark('B_elementClick');document.getElementById('btn').click();''`);
  /* ③ chuột thật của trình duyệt */
  await evaluate(`window.__mark('C_cdpMouse');''`);
  await click(btn);
  const gate = JSON.parse((await evaluate(`JSON.stringify(window.__gate)`)) || "null");
  /* ④ gán thẳng .value — cách gõ chữ hôm nay */
  await evaluate(`window.__mark('D_valueAssign');(()=>{const e=document.getElementById('txt');e.value='z';e.dispatchEvent(new Event('input',{bubbles:true}));})();''`);
  /* ⑤ bàn phím thật của trình duyệt */
  await evaluate(`window.__mark('E_cdpKey');''`);
  await click(txt);
  await call("Input.dispatchKeyEvent", { type: "keyDown", key: "a", code: "KeyA", text: "a", unmodifiedText: "a", windowsVirtualKeyCode: 65 });
  await call("Input.dispatchKeyEvent", { type: "keyUp", key: "a", code: "KeyA", windowsVirtualKeyCode: 65 });
  /* ⑥ Input.insertText — CDP đánh dấu THỬ NGHIỆM, nên chỉ ghi nhận, KHÔNG tính điểm */
  await evaluate(`window.__mark('F_insertText');''`);
  let insertTextAvailable = true;
  try { await call("Input.insertText", { text: "QQ" }); } catch { insertTextAvailable = false; }

  return {
    log: JSON.parse(await evaluate(`JSON.stringify(window.__log)`)),
    gate,
    insertTextAvailable
  };
}

async function measure() {
  const chromePath = findChrome();
  if (!chromePath) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");

  const root = mkdtempSync(join(tmpdir(), "scouter-trust-"));
  const pageFile = join(root, "page.html");
  writeFileSync(pageFile, TEST_PAGE, "utf8");
  const pageUrl = "file:///" + pageFile.replace(/\\/g, "/");
  const extDir = join(root, "ext");
  buildProbeExtension(extDir);

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

    const findPage = async () => {
      const { targetInfos } = await cdp.send("Target.getTargets");
      return targetInfos.find((t) => t.type === "page" && t.url.includes("page.html"));
    };
    const pageTarget = await until(findPage, "trang thử xuất hiện");

    /* ── Đường "cdp": phiên CDP thẳng (đối chứng) ── */
    const pageSession = (await cdp.send("Target.attachToTarget", { targetId: pageTarget.targetId, flatten: true })).sessionId;
    await cdp.send("Runtime.enable", {}, pageSession);
    const evaluateDirect = async (expression) => {
      const r = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, pageSession);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    const viaCdp = await runScenario((m, p) => cdp.send(m, p, pageSession), evaluateDirect);
    await evaluateDirect(`window.__log = []; window.__gate = null; document.getElementById('txt').value = ''; ''`);
    /* Phải RỜI trước, vì Chrome chỉ cho MỘT khách gỡ lỗi cắm vào một tab. Không rời thì
     * `chrome.debugger.attach` ở dưới trả "Another debugger is already attached". */
    await cdp.send("Target.detachFromTarget", { sessionId: pageSession });

    /* ── Đường "ext": chrome.debugger từ trong extension — ĐƯỜNG THẬT ── */
    const extId = (await cdp.send("Extensions.loadUnpacked", { path: extDir })).id;
    const extUrl = `chrome-extension://${extId}/probe.html`;
    const extTargetId = (await cdp.send("Target.createTarget", { url: extUrl })).targetId;
    const extSession = (await cdp.send("Target.attachToTarget", { targetId: extTargetId, flatten: true })).sessionId;
    await cdp.send("Page.enable", {}, extSession);
    await cdp.send("Runtime.enable", {}, extSession);
    await cdp.send("Page.navigate", { url: extUrl }, extSession);

    /* Mọi lệnh dưới đây chạy TRONG extension và đi qua `chrome.debugger`. Đây là chỗ phép
     * đo này khác EXP-14: hết suy luận "hai đường chắc giống nhau". */
    const inExtension = async (body) => {
      const r = await cdp.send("Runtime.evaluate", {
        expression: `(async () => { ${body} })()`,
        returnByValue: true,
        awaitPromise: true
      }, extSession);
      if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r.result.value;
    };
    await until(
      async () => await inExtension(`return typeof chrome.debugger === "object" && typeof chrome.tabs === "object";`),
      "trang extension nạp xong và thấy chrome.debugger"
    );
    await inExtension(`
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.url && t.url.includes("page.html"));
      if (!tab) throw new Error("khong tim thay tab trang thu");
      globalThis.__target = { tabId: tab.id };
      await chrome.debugger.attach(globalThis.__target, ${JSON.stringify(CDP_VERSION)});
      return true;
    `);
    const callViaExtension = (method, params) => inExtension(
      `return await chrome.debugger.sendCommand(globalThis.__target, ${JSON.stringify(method)}, ${JSON.stringify(params)});`
    );
    const evaluateViaExtension = async (expression) => {
      const r = await callViaExtension("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
      if (r?.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
      return r?.result?.value;
    };
    const viaExtension = await runScenario(callViaExtension, evaluateViaExtension);
    await inExtension(`try { await chrome.debugger.detach(globalThis.__target); } catch (e) {} return true;`);

    return {
      chrome: version.product,
      protocol: version.protocolVersion,
      routes: { cdp: viaCdp, ext: viaExtension }
    };
  } finally {
    child.kill();
    setTimeout(() => { try { rmSync(root, { recursive: true, force: true }); } catch { /* thư mục tạm, kệ */ } }, 1000);
  }
}

/* ---- In ra cho mắt người đọc -------------------------------------------- */

export function report(result) {
  const routes = {};
  for (const [name, raw] of Object.entries(result.routes)) routes[name] = verdict(raw);
  /* Chỉ đường "ext" tính điểm. Đường "cdp" đạt mà "ext" hỏng thì KẾT QUẢ LÀ HỎNG —
   * Scouter chạy bằng đường "ext", không chạy bằng đường kia. */
  const pass = routes.ext?.pass === true;

  const out = [];
  out.push("PHÉP ĐO ① — cú bấm của Scouter có được trang nhìn như tay người không");
  out.push(`Chrome ${result.chrome} · giao thức ${result.protocol}`);
  out.push("");
  for (const [name, v] of Object.entries(routes)) {
    out.push(`── ${name}: ${name === "ext"
      ? "ĐƯỜNG THẬT — chrome.debugger từ trong extension (TÍNH ĐIỂM)"
      : "đối chứng — phiên CDP thẳng"} → ${v.pass ? "ĐẠT" : "KHÔNG ĐẠT"}`);
    for (const line of v.lines) out.push(`   ${line.pass ? "xanh" : "ĐỎ  "}  ${line.id}`);
    const m = v.measured;
    out.push(`   bấm giả lập trong trang   isTrusted=${m.A.click?.isTrusted}  ·  element.click() isTrusted=${m.B.click?.isTrusted}`);
    out.push(`   bấm qua trình duyệt       isTrusted=${m.C.click?.isTrusted}  ·  userActivation=${m.C.click?.uaIsActive}  ·  popup mở được=${m.gate?.popupAllowed}`);
    out.push(`   gõ qua trình duyệt        isTrusted=${m.E.keydown?.isTrusted}  ·  ô nhập dài thêm ${m.E.typedChars} ký tự`);
    out.push(`   Input.insertText (THỬ NGHIỆM, không tính điểm)  dùng được=${m.F.available}`);
    out.push("");
  }
  out.push(pass
    ? "KẾT LUẬN: ĐẠT. Năng lực số một của bảng kiểm kê là THẬT — xây tiếp theo thứ tự đã chốt."
    : "KẾT LUẬN: KHÔNG ĐẠT. DỪNG XÂY, báo lại. Thứ tự 24 mục còn lại phải xếp lại (ADR-0010).");
  out.push("CHƯA ĐO: cú bấm bằng tay người thật — không tự động hoá được. Ba đường còn lại đo rồi.");
  return { pass, text: out.join("\n"), routes };
}

/* `pathToFileURL`, KHÔNG phải ghép chuỗi: đường dẫn repo này có DẤU CÁCH, mà URL mã hoá dấu
 * cách thành %20 — bản ghép chuỗi so ra "khác nhau" nên file im lặng không chạy gì và thoát 0.
 * Một phép đo im lặng báo ĐẠT là thứ tệ nhất file này có thể làm; đã dính đúng một lần. */
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await measure();
    const r = report(result);
    if (process.argv.includes("--json")) {
      console.log(JSON.stringify({ chrome: result.chrome, pass: r.pass, routes: r.routes }, null, 2));
    } else {
      console.log(r.text);
    }
    process.exit(r.pass ? 0 : 1);
  } catch (error) {
    console.error(`KHÔNG CHẠY ĐƯỢC PHÉP ĐO: ${error.message}`);
    console.error("Đây KHÔNG phải kết quả 'không đạt' — phép đo chưa chạy. Đừng ghi nó vào bảng kiểm kê.");
    process.exit(2);
  }
}

#!/usr/bin/env node
/* do-doc-lai.mjs — PHÉP ĐO của `S1`: gõ xong thì ĐỌC LẠI ĐƯỢC BẰNG ĐƯỜNG NÀO?
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * Sau một lượt `input.type` thật, đường đọc nào nhìn thấy chữ vừa gõ — trên bốn loại ô nhập
 * mà một trang thật có thể có?
 *
 * ─── VÌ SAO KHÔNG THỂ THAY BẰNG MỘT PHÉP GHIM ───────────────────────────────
 * Trong phép ghim, trang là đồ giả — và một trang giả trả về đúng thứ người viết TIN là nó sẽ
 * trả về. Cả `S1` đứng trên một câu hỏi mà chỉ Chrome trả lời được: *`<input>` có nhả chữ vừa
 * gõ qua cây DOM không?* Câu trả lời là **KHÔNG**, và nó ngược hẳn với điều kế hoạch đã viết.
 * Một phép ghim viết theo niềm tin cũ sẽ xanh trọn vẹn trong khi hàng thật im lặng hỏng.
 *
 * ─── KẾT QUẢ ĐO 16/09, Chrome 153 ──────────────────────────────────────────
 *   | ô                          | `dom.text` | giá trị trợ năng |
 *   |----------------------------|------------|------------------|
 *   | `<input type="text">`      | rỗng       | ĐÚNG chữ vừa gõ  |
 *   | `<textarea>`               | rỗng       | ĐÚNG chữ vừa gõ  |
 *   | `<div contenteditable>`    | ĐÚNG       | ĐÚNG             |
 *   | `<input type="password">`  | rỗng       | CHUỖI DẤU CHE    |
 *
 * Hai điều rơi ra từ bảng này, và cả hai đều đã đi thẳng vào mã:
 *   ⑴ chọn đường đọc theo **TÊN THẺ**, không mò — `INPUT`/`TEXTAREA` giữ chữ ở thuộc tính đối
 *      tượng nên cây DOM không có gì để đọc;
 *   ⑵ ô che nội dung là một trạng thái **THỨ BA** — không phải "khớp", cũng không phải "lệch".
 *
 * ─── KHÔNG ĐỤNG TRANG THẬT ──────────────────────────────────────────────────
 * Trang thử do chính file này sinh trong thư mục tạm; Chrome chạy hồ sơ TRỐNG cũng trong thư
 * mục tạm. Không đăng nhập, không tốn credit. Chuỗi gõ là chuỗi vô hại do file này tự đặt.
 *
 * Chạy:  node scripts/do-doc-lai.mjs
 *        CHROME_PATH=... node scripts/do-doc-lai.mjs
 *
 * Mã thoát: 0 = ĐẠT · 1 = KHÔNG ĐẠT · 2 = phép đo KHÔNG CHẠY ĐƯỢC (khác hẳn "không đạt").
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { runAction } from "./scouter-actions-core.mjs";
import { runProbe } from "./scouter-probes.mjs";
import { xetDocLai, xetXoaSach, MA_KHONG_QUAN_SAT, MA_XOA_KHONG_SACH } from "./tu-kiem-ghi.mjs";

const CHU = "xin chao 123";
const THE_GIU_CHU_RIENG = ["INPUT", "TEXTAREA"];

/* Trang thử: bốn ô, mỗi ô là một câu trả lời khác nhau cho cùng một câu hỏi. */
const TRANG = `<!doctype html><meta charset="utf-8"><title>do doc lai</title>
<input id="a" type="text" aria-label="o input">
<textarea id="b" aria-label="o textarea"></textarea>
<div id="c" contenteditable="true" role="textbox" aria-label="o giau" style="border:1px solid"></div>
<input id="d" type="password" aria-label="o mat khau">
<input id="e" type="text" readonly value="khong ai xoa duoc chu nay" aria-label="o chi doc">
`;

/* Điều CHỜ ĐỢI ở từng ô. Khai ở đây, cạnh trang thử, để ai đọc báo cáo biết ngay chỗ nào là
 * "đúng như đã đo" và chỗ nào là bất ngờ. */
const CHO_DOI = [
  { sel: "#a", ten: "<input type=text>", cach: "a11y", daKiem: true, xoaKiem: true },
  { sel: "#b", ten: "<textarea>", cach: "a11y", daKiem: true, xoaKiem: true },
  { sel: "#c", ten: "<div contenteditable>", cach: "dom.text", daKiem: true, xoaKiem: true },
  /* Ô mật khẩu là chỗ HAI phép phán trả lời KHÁC NHAU, và đó là cả lý do nó còn nằm ở đây:
   * `xetDocLai` không đối chiếu được (dấu che) → `da_kiem: false`; `xetXoaSach` thì đối chiếu
   * được, vì sau khi xoá ô ấy đọc ra `""` y như mọi ô khác → `da_kiem: true`. Một dòng bảng
   * khai cả hai kỳ vọng thì không ai chép nhầm kỳ vọng của lệnh này sang lệnh kia. */
  { sel: "#d", ten: "<input type=password>", cach: "a11y", daKiem: false, vi: /che nội dung/, xoaKiem: true },
  /* Ô CHỈ-ĐỌC — hàng DUY NHẤT ở đây chờ một nhánh ĐỎ, và nó có mặt vì ba hàng trên không
   * chứng minh được gì về nhánh ấy. Bốn hàng kia đều là ô ghi được, nên cả hai lệnh đều ĐẠT
   * và một bản `xetXoaSach` **luôn trả `da_kiem: true`** sẽ xanh trọn vẹn qua cả bốn. Trên
   * Chrome thật, `Ctrl+A` rồi `Delete` bắn vào ô `readonly` chạy trọn mà không xoá được gì —
   * tức đúng hình dạng mà `S-27` sinh ra để bắt. Lượt GÕ vào ô này cũng lệch, nên nó là hàng
   * duy nhất chờ `WRITE_NOT_OBSERVED` luôn: một trang thử mà mọi ô đều ngoan thì nó chỉ ghim
   * được một nửa số nhánh. */
  { sel: "#e", ten: "<input readonly>", cach: "a11y", daKiem: null, nemGo: MA_KHONG_QUAN_SAT, xoaKiem: null, chonemXoa: MA_XOA_KHONG_SACH }
];

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
    let dem = Buffer.alloc(0);
    con.stdio[4].on("data", (mieng) => {
      dem = Buffer.concat([dem, mieng]);
      for (let cat = dem.indexOf(0); cat !== -1; cat = dem.indexOf(0)) {
        const tho = dem.subarray(0, cat).toString("utf8");
        dem = dem.subarray(cat + 1);
        let tin;
        try { tin = JSON.parse(tho); } catch { continue; }
        if (tin.method) continue;
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

const nghi = (ms) => new Promise((r) => setTimeout(r, ms));

/* Đúng cặp `nhanDangO` + `docO` của `scouter-seed-core.mjs`, viết lại ở đây vì file kia sống
 * trong extension và cần `ScouterEngine`. Chép LOGIC, không chép mã: chỗ này là dụng cụ đo,
 * và một dụng cụ đo dùng chung mã với vật bị đo thì nó chỉ tin lời khai của vật bị đo. */
async function nhanDang(sendRaw, selector) {
  const kq = await runProbe("dom.query", { sendRaw }, { selector, limit: 1 });
  if (!kq.ok || kq.data.matchCount !== 1) return null;
  const mot = kq.data.items[0];
  return { the: String(mot.nodeName || "").toUpperCase(), nut: mot.backendNodeId ?? null };
}

async function doc(sendRaw, selector, cach, nut) {
  if (nut === null || nut === undefined) return { docDuoc: false, gia: "", cat: false };
  if (cach === "dom.text") {
    const kq = await runProbe("dom.text", { sendRaw }, { selector });
    if (!kq.ok) return { docDuoc: false, gia: "", cat: false };
    return { docDuoc: true, gia: kq.data.text ?? "", cat: kq.data.truncated === true };
  }
  const kq = await runProbe("a11y.tree", { sendRaw }, { limit: 1500 });
  if (!kq.ok) return { docDuoc: false, gia: "", cat: false };
  const n = (kq.data.nodes || []).find((x) => x.backend_node_id === nut);
  if (!n) return { docDuoc: false, gia: "", cat: false };
  return {
    docDuoc: true, gia: n.value ?? "",
    cat: String(n.value ?? "").endsWith("…") || kq.data.truncated === true
  };
}

async function do_() {
  const chrome = timChrome();
  if (!chrome) throw new Error("Không tìm thấy Chrome. Đặt biến môi trường CHROME_PATH rồi chạy lại.");
  const goc = mkdtempSync(join(tmpdir(), "do-doc-lai-"));
  writeFileSync(join(goc, "trang.html"), TRANG, "utf8");
  const con = spawn(chrome, [
    "--remote-debugging-pipe",
    `--user-data-dir=${join(goc, "hoso")}`,
    "--no-first-run", "--no-default-browser-check",
    pathToFileURL(join(goc, "trang.html")).href
  ], { stdio: ["ignore", "ignore", "ignore", "pipe", "pipe"] });

  try {
    const cdp = new OngCdp(con);
    let ban = null;
    for (let i = 0; i < 80 && !ban; i += 1) {
      try { ban = await cdp.gui("Browser.getVersion"); } catch { await nghi(250); }
    }
    if (!ban) throw new Error("Chrome không trả lời qua ống điều khiển.");

    /* Chờ trang thật sự có mặt, đừng đoán bằng một lượt ngủ: `Target.getTargets` là câu hỏi
     * đúng, và hỏi lại vài nhịp rẻ hơn nhiều so với một phép đo thỉnh thoảng hỏng vì máy chậm. */
    let dich = null;
    for (let i = 0; i < 40 && !dich; i += 1) {
      const ds = (await cdp.gui("Target.getTargets")).targetInfos.filter((t) => t.type === "page");
      const trang = ds.find((t) => t.url.startsWith("file:"));
      if (trang) dich = trang.targetId; else await nghi(250);
    }
    if (!dich) throw new Error("Không thấy tab nào mở trang thử.");
    const phien = (await cdp.gui("Target.attachToTarget", { targetId: dich, flatten: true })).sessionId;
    const sendRaw = (m, p) => cdp.gui(m, p, phien);

    const dong = [];
    for (const mong of CHO_DOI) {
      const o = await nhanDang(sendRaw, mong.sel);
      const cach = o && THE_GIU_CHU_RIENG.includes(o.the) ? "a11y" : "dom.text";
      const nut = o ? o.nut : null;
      const truoc = await doc(sendRaw, mong.sel, cach, nut);
      const go = await runAction("input.type", { sendRaw }, { selector: mong.sel, text: CHU });
      const sau = await doc(sendRaw, mong.sel, cach, nut);

      let phan = null;
      let nem = null;
      try { phan = xetDocLai({ daGo: CHU, truoc, sau, cach }); } catch (error) { nem = error; }

      /* ---- LƯỢT XOÁ (`S-27`) ------------------------------------------------
       * Chạy NGAY SAU lượt gõ, trên đúng ô ấy, nên `sau` của lượt gõ chính là bản đọc TRƯỚC của
       * lượt xoá — không có lượt đọc thừa nào, và quan trọng hơn: ô chắc chắn ĐANG CÓ CHỮ, tức
       * lượt này đo được nhánh *"xoá bỏ đi thứ có thật"*, không phải nhánh rỗng-sẵn vô thưởng. */
      const xoa = await runAction("input.clear", { sendRaw }, { selector: mong.sel });
      const sauXoa = await doc(sendRaw, mong.sel, cach, nut);
      let phanXoa = null;
      let nemXoa = null;
      try { phanXoa = xetXoaSach({ truoc: sau, sau: sauXoa, cach }); } catch (error) { nemXoa = error; }

      dong.push({ ...mong, cachDung: mong.cach, the: o?.the ?? null, cach, goOk: go.ok, phan, nem,
        xoaOk: xoa.ok, phanXoa, nemXoa, giaSauXoa: sauXoa.gia });
    }
    return { chrome: ban.product, dong };
  } finally {
    con.kill();
    setTimeout(() => { try { rmSync(goc, { recursive: true, force: true }); } catch { /* thư mục tạm */ } }, 800);
  }
}

/** Chấm điểm — THUẦN LOGIC, tách hẳn khỏi phần đụng Chrome. */
export function ketLuan(tho) {
  const loi = [];
  for (const d of tho.dong) {
    if (!d.goOk) { loi.push(`${d.ten}: lượt gõ không chạy được`); continue; }
    /* Hàng nào KHAI SẴN là phải ném thì lượt ném là ĐẠT, còn KHÔNG ném mới là lỗi. Viết theo
     * chiều này chứ không thêm một ngoại lệ cho `#e`: một bảng kỳ vọng mà có ô "trừ hàng này
     * ra" thì hàng ấy thôi được canh. */
    if (d.nemGo) {
      if (!d.nem) loi.push(`${d.ten}: lượt gõ PHẢI bị phán lệch (${d.nemGo}) mà nó lại báo đạt`);
      else if (d.nem.code !== d.nemGo) loi.push(`${d.ten}: lượt gõ ném ${d.nem.code}, chờ ${d.nemGo}`);
    } else if (d.nem) {
      loi.push(`${d.ten}: bị phán LỆCH (${d.nem.code}) — chữ đã gõ mà đường '${d.cach}' không thấy`);
      continue;
    }
    if (d.cach !== d.cachDung) loi.push(`${d.ten}: chọn đường '${d.cach}', đã đo là phải '${d.cachDung}'`);
    if (d.daKiem !== null && d.phan && d.phan.da_kiem !== d.daKiem) {
      loi.push(`${d.ten}: da_kiem=${d.phan.da_kiem}, chờ ${d.daKiem} — ${d.phan.kiem_noi}`);
    }
    if (d.vi && d.phan && !d.vi.test(d.phan.kiem_noi)) loi.push(`${d.ten}: câu khai không nói đúng lý do — ${d.phan.kiem_noi}`);

    /* ---- chấm lượt XOÁ ---------------------------------------------------- */
    if (!d.xoaOk) { loi.push(`${d.ten}: lượt xoá không chạy được`); continue; }
    if (d.chonemXoa) {
      /* NHÁNH ĐỎ LÀ MỘT KỲ VỌNG, KHÔNG PHẢI MỘT LỖI. Đây là hàng duy nhất chứng minh trên
       * Chrome thật rằng `xetXoaSach` BIẾT NÓI KHÔNG — ba hàng kia chỉ chứng minh nó biết
       * nói có, và một bản luôn-nói-có sẽ xanh qua cả ba. */
      if (!d.nemXoa) loi.push(`${d.ten}: lượt xoá PHẢI ném ${d.chonemXoa} mà nó báo đạt — ô này KHÔNG xoá được`);
      else if (d.nemXoa.code !== d.chonemXoa) loi.push(`${d.ten}: lượt xoá ném ${d.nemXoa.code}, chờ ${d.chonemXoa}`);
      continue;
    }
    if (d.nemXoa) { loi.push(`${d.ten}: xoá rồi mà bị phán CÒN CHỮ (${d.nemXoa.code})`); continue; }
    if (d.xoaKiem !== null && d.phanXoa.da_kiem !== d.xoaKiem) {
      loi.push(`${d.ten}: xoá → da_kiem=${d.phanXoa.da_kiem}, chờ ${d.xoaKiem} — ${d.phanXoa.kiem_noi}`);
    }
    /* Con số THẬT mà cả `xetXoaSach` đứng lên: ô đã xoá đọc ra ĐÚNG chuỗi rỗng, không phải
     * một chuỗi khoảng trắng. Ghim ở đây vì đây là chỗ DUY NHẤT hỏi được Chrome thật. */
    if (d.giaSauXoa !== "") {
      loi.push(`${d.ten}: ô đã xoá đọc ra ${JSON.stringify(d.giaSauXoa)}, đã đo 16/09 là "" — ` +
        "phép so `=== \"\"` trong `xetXoaSach` đứng trên đúng con số này, đo lại trước khi nới nó");
    }
  }
  return { dat: loi.length === 0, loi };
}

export function inRa(tho) {
  const ra = [`PHÉP ĐO ĐỌC LẠI Ô NHẬP (gõ `+"`S1`"+` · xoá `+"`S-27`"+`) — Chrome ${tho.chrome}`, ""];
  for (const d of tho.dong) {
    const noi = d.nem ? `LỆCH (${d.nem.code})` : `da_kiem=${d.phan?.da_kiem} qua '${d.cach}'`;
    const noiXoa = d.nemXoa ? `CÒN CHỮ (${d.nemXoa.code})` : `da_kiem=${d.phanXoa?.da_kiem}`;
    ra.push(`   ${d.ten.padEnd(24)} thẻ ${String(d.the).padEnd(9)} → gõ: ${noi.padEnd(30)} xoá: ${noiXoa}`);
  }
  const k = ketLuan(tho);
  ra.push("");
  ra.push(k.dat ? "ĐẠT — năm loại ô đều cho đúng câu trả lời đã đo, cho CẢ lượt gõ lẫn lượt xoá." : "KHÔNG ĐẠT:");
  for (const l of k.loi) ra.push(`   · ${l}`);
  return ra.join("\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let tho;
  try {
    tho = await do_();
  } catch (error) {
    console.error(`PHÉP ĐO KHÔNG CHẠY ĐƯỢC: ${error?.message || error}`);
    process.exit(2);
  }
  console.log(inRa(tho));
  process.exit(ketLuan(tho).dat ? 0 : 1);
}

export { MA_KHONG_QUAN_SAT, MA_XOA_KHONG_SACH };

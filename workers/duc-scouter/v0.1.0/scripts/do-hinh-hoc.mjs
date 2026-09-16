#!/usr/bin/env node
/* do-hinh-hoc.mjs — PHÉP ĐO của `T10` / `S-21`: khi nào một target THÔI trả lời câu hỏi hình học?
 *
 * ─── CÂU HỎI, ĐÚNG MỘT CÂU ──────────────────────────────────────────────────
 * Ngày 12/09 một target đột nhiên trả `-32000 No node found at given location` cho đúng toạ độ
 * mà vài phút trước nó trả lời bình thường, `page.shot` trả 0 byte, và lượt bấm kế bị
 * `TARGET_ALREADY_ATTACHED`. Không ai biết vì sao. `S-21` ghi ba giả thuyết và cấm đoán:
 *
 *   ⒜ tab không đang được vẽ — **ĐÃ CHẾT** (`G-41`), đừng đo lại nếu không có số mới
 *   ⒝ một lượt gắn debugger hỏng để lại target dở dang
 *   ⒞ renderer bị thay giữa chừng nên bảng nodeId cũ không còn nghĩa
 *
 * ─── VÌ SAO ĐO Ở CHROME RIÊNG, KHÔNG ĐO Ở CHROME CỦA ĐỨC ────────────────────
 * Phép thử phải được phép **làm hỏng** cái nó đo: giết renderer, gắn hai phiên chồng nhau, cắt
 * ngang một lượt điều hướng. Trên Chrome của Đức thì mọi tab đều là việc thật, và một phép đo
 * không được đắt hơn thứ nó đo. Chrome ở đây do chính file này đẻ ra, hồ sơ trống, giết sau khi
 * đo. Cùng khuôn `do-doc-lai.mjs`.
 *
 * **Giới hạn đã biết, khai TRƯỚC kết quả:** triệu chứng thứ ba (`TARGET_ALREADY_ATTACHED`) là
 * của riêng `chrome.debugger` — vòng đời gắn/nhả của EXTENSION. Ống điều khiển không có khái
 * niệm đó, nên phép đo này **không thể** tái hiện triệu chứng ấy. Nó đo hai triệu chứng đầu, và
 * hai triệu chứng đầu mới là thứ làm `scout.click` từ chối.
 *
 * Chạy:  npm run scouter:hinh-hoc
 * Mã thoát: 0 = phép đo chạy xong và KẾT LUẬN ĐƯỢC · 1 = chạy xong mà không tái hiện được gì
 *           · 2 = phép đo KHÔNG CHẠY ĐƯỢC (khác hẳn hai cái trên).
 */
import { pathToFileURL } from "node:url";
import { moChromeSach, choTrang, nghi } from "./chrome-do.mjs";

/* Trang thử: một cái nút to, ở toạ độ biết trước, để hỏi-điểm có thứ chắc chắn phải trúng. */
const TRANG = `<!doctype html><meta charset="utf-8"><title>do hinh hoc</title>
<style>body{margin:0}#nut{position:absolute;left:40px;top:40px;width:220px;height:80px}</style>
<button id="nut">bam vao day</button>
`;

/* Hỏi ba câu mà `S-21` thấy hỏng CÙNG LÚC. Trả về ba kết quả thô, không phán gì —
 * phán là việc của `ketLuan`, và tách ra để phần phán ghim được mà không cần Chrome. */
async function hoiBaCau(sendRaw, nodeId, diem) {
  const ra = { hinhHoc: null, hinhHocLoi: null, anh: null, anhLoi: null, hop: null, hopLoi: null };
  try {
    const n = await sendRaw("DOM.getNodeForLocation", { x: diem.x, y: diem.y });
    ra.hinhHoc = n?.nodeId ?? n?.backendNodeId ?? null;
  } catch (e) { ra.hinhHocLoi = String(e.cdp?.message || e.message).slice(0, 80); }
  try {
    const a = await sendRaw("Page.captureScreenshot", { format: "png" });
    ra.anh = (a?.data || "").length;
  } catch (e) { ra.anhLoi = String(e.cdp?.message || e.message).slice(0, 80); }
  try {
    const h = await sendRaw("DOM.getBoxModel", { nodeId });
    ra.hop = h?.model?.width ?? null;
  } catch (e) { ra.hopLoi = String(e.cdp?.message || e.message).slice(0, 80); }
  return ra;
}

/** Gắn phiên, bật DOM, tìm `#nut`, trả về `{ sendRaw, nodeId, diem }`. */
async function dungPhien(cdp, dich) {
  const phien = (await cdp.gui("Target.attachToTarget", { targetId: dich, flatten: true })).sessionId;
  const sendRaw = (m, p) => cdp.gui(m, p, phien);
  await sendRaw("DOM.enable", {});
  await sendRaw("Page.enable", {});
  const doc = await sendRaw("DOM.getDocument", { depth: 0 });
  const nodeId = (await sendRaw("DOM.querySelectorAll", { nodeId: doc.root.nodeId, selector: "#nut" })).nodeIds[0];
  const hop = await sendRaw("DOM.getBoxModel", { nodeId });
  const [x1, y1, , , x2, y2] = hop.model.content;
  return { phien, sendRaw, nodeId, diem: { x: Math.round((x1 + x2) / 2), y: Math.round((y1 + y2) / 2) } };
}

async function do_() {
  const may = await moChromeSach({ html: TRANG, ten: "do-hinh-hoc" });
  const { cdp } = may;
  const dong = [];
  try {
    const dich = await choTrang(cdp);
    if (!dich) throw new Error("Không thấy tab nào mở trang thử.");

    /* ---- NỀN: mọi thứ lành lặn. Không có dòng này thì mọi dòng sau vô nghĩa. ---------- */
    let p = await dungPhien(cdp, dich);
    dong.push({ ma: "N", ten: "nền — chưa phá gì", ...(await hoiBaCau(p.sendRaw, p.nodeId, p.diem)) });

    /* ---- E1 · ⒞ RENDERER BỊ THAY: giết hẳn renderer bằng `Page.crash` ------------------
     * Đây là bản thuần khiết nhất của giả thuyết ⒞. `Page.crash` KHÔNG trả lời — nó bắn
     * `Inspector.targetCrashed` — nên đừng `await` nó rồi ngồi chờ mãi. */
    let daSap = false;
    cdp.khiCo("Inspector.targetCrashed", () => { daSap = true; });
    p.sendRaw("Page.crash", {}).catch(() => { /* lệnh này không bao giờ trả lời */ });
    for (let i = 0; i < 20 && !daSap; i += 1) await nghi(100);
    dong.push({ ma: "E1", ten: "renderer bị giết (Page.crash) — giả thuyết ⒞",
      daSap, ...(await hoiBaCau(p.sendRaw, p.nodeId, p.diem)) });

    /* Và chốt còn lại của `S-21`: *"sau MỘT lượt navigate thật, cả ba trở lại bình thường"*. */
    try { await p.sendRaw("Page.navigate", { url: may.trangUrl }); } catch { /* phiên có thể đã chết */ }
    await nghi(1200);
    let hoiPhuc = null;
    try {
      const q = await dungPhien(cdp, dich);
      hoiPhuc = await hoiBaCau(q.sendRaw, q.nodeId, q.diem);
      p = q;
    } catch (e) { hoiPhuc = { hinhHocLoi: String(e.message).slice(0, 80) }; }
    dong.push({ ma: "E1b", ten: "sau một lượt navigate — có hồi phục không", ...hoiPhuc });

    /* ---- E2 · ⒞ nhẹ hơn: ĐIỀU HƯỚNG XUYÊN TIẾN TRÌNH, hỏi bằng nodeId CŨ -------------- */
    const cu = { nodeId: p.nodeId, diem: p.diem, sendRaw: p.sendRaw };
    await p.sendRaw("Page.navigate", { url: "about:blank" });
    await nghi(600);
    dong.push({ ma: "E2", ten: "điều hướng xong, hỏi bằng nodeId CŨ", ...(await hoiBaCau(cu.sendRaw, cu.nodeId, cu.diem)) });
    await p.sendRaw("Page.navigate", { url: may.trangUrl });
    await nghi(900);
    p = await dungPhien(cdp, dich);

    /* ---- E3 · hỏi hình học NGAY GIỮA một lượt điều hướng ------------------------------ */
    const chay = p.sendRaw("Page.navigate", { url: may.trangUrl });
    const giua = await hoiBaCau(p.sendRaw, p.nodeId, p.diem);
    await chay.catch(() => {});
    dong.push({ ma: "E3", ten: "hỏi giữa lúc đang điều hướng", ...giua });
    await nghi(800);
    p = await dungPhien(cdp, dich);

    /* ---- E4 · ⒝ HAI PHIÊN chồng nhau, nhả một cái rồi hỏi bằng cái kia ---------------- */
    const p2 = await dungPhien(cdp, dich);
    await cdp.gui("Target.detachFromTarget", { sessionId: p2.phien });
    dong.push({ ma: "E4", ten: "gắn hai phiên rồi nhả một — giả thuyết ⒝",
      ...(await hoiBaCau(p.sendRaw, p.nodeId, p.diem)) });

    return { chrome: may.ban.product, dong };
  } finally {
    may.dong();
  }
}

/** Chấm điểm — THUẦN LOGIC, tách hẳn khỏi phần đụng Chrome nên ghim được không cần trình duyệt. */
export function ketLuan(tho) {
  const nen = tho.dong.find((d) => d.ma === "N");
  const loi = [];
  if (!nen) return { dat: false, taiHien: [], loi: ["thiếu dòng nền — không có gì để so"] };
  if (nen.hinhHocLoi || nen.anhLoi || nen.hopLoi) {
    loi.push("NỀN đã hỏng sẵn: phép đo này không dùng được, đừng đọc các dòng sau");
  }
  /* "Tái hiện được" = ĐÚNG hình dạng `S-21`: hỏi-điểm hỏng VÀ ảnh chụp hỏng, cùng một lượt.
   * Một mình câu nào hỏng thì là chuyện khác, và gọi nó là tái hiện `S-21` là đoán cho tròn. */
  const taiHien = tho.dong.filter((d) => d.ma !== "N" && d.hinhHocLoi && d.anhLoi);
  return { dat: loi.length === 0, taiHien, loi };
}

export function inRa(tho) {
  const ra = [`PHÉP ĐO HÌNH HỌC (\`T10\` / \`S-21\`) — Chrome ${tho.chrome}`, ""];
  for (const d of tho.dong) {
    const h = d.hinhHocLoi ? `HỎNG (${d.hinhHocLoi})` : `ok nodeId=${d.hinhHoc}`;
    const a = d.anhLoi ? `HỎNG (${d.anhLoi})` : `ok ${d.anh} byte`;
    const b = d.hopLoi ? `HỎNG (${d.hopLoi})` : `ok rộng ${d.hop}`;
    ra.push(`   ${d.ma.padEnd(4)} ${d.ten}`);
    ra.push(`        hỏi-điểm: ${h}`);
    ra.push(`        ảnh chụp: ${a}`);
    ra.push(`        hộp     : ${b}`);
  }
  const k = ketLuan(tho);
  ra.push("");
  for (const l of k.loi) ra.push(`   ⚠ ${l}`);
  if (k.taiHien.length) {
    ra.push(`TÁI HIỆN ĐƯỢC ${k.taiHien.length} lần — đúng hình dạng \`S-21\` (hỏi-điểm VÀ ảnh chụp cùng hỏng):`);
    for (const d of k.taiHien) ra.push(`   · ${d.ma} — ${d.ten}`);
  } else {
    ra.push("KHÔNG tái hiện được hình dạng `S-21` bằng bất kỳ phép phá nào ở trên.");
  }
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
  process.exit(ketLuan(tho).taiHien.length ? 0 : 1);
}

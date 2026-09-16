#!/usr/bin/env node
/* do-tai-len.mjs — PHÉP ĐO của `T29`: `input.upload` có thật sự gắn được file vào trang không?
 *
 * ─── VÌ SAO PHÉP ĐO NÀY TỒN TẠI ─────────────────────────────────────────────
 * Mười khối ghim của `T29` đứng trên đồ giả, và đồ giả trả về đúng thứ người viết nó TIN là
 * Chrome sẽ trả về. Câu duy nhất chúng không trả lời được: *sau `DOM.setFileInputFiles`, ô chọn
 * tệp có thật sự CẦM file không* — đúng tên, đúng số byte.
 *
 * Nó càng cần thiết vì đo ngày 16/09 cho thấy **trang Udin KHÔNG có `<input type=file>` nào**,
 * nên `W8` chưa chạy thật được ở đó. Không có phép đo này thì `input.upload` là mã chưa từng
 * chạm một trình duyệt nào.
 *
 * ─── DỤNG CỤ ĐO ĐƯỢC PHÉP DÙNG METHOD MÀ EXTENSION KHÔNG CÓ ────────────────
 * Chỗ đọc lại dùng `Runtime.evaluate` — method mà lõi ghi **cố ý không bao giờ khai**. Không mâu
 * thuẫn: Chrome ở đây do chính file này đẻ ra trong thư mục tạm, hồ sơ trống, giết sau khi đo.
 * Cùng tiền lệ với `Page.crash` ở `do-hinh-hoc.mjs`. Và nó phải là một đường đọc KHÁC với đường
 * ghi: một dụng cụ đo dùng chung mã với vật bị đo thì nó chỉ tin lời khai của vật bị đo.
 *
 * Chạy:  npm run scouter:tai-len
 * Mã thoát: 0 ĐẠT · 1 KHÔNG ĐẠT · 2 KHÔNG CHẠY ĐƯỢC.
 */
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { moChromeSach, choTrang, nghi } from "./chrome-do.mjs";
import { runAction } from "./scouter-actions-core.mjs";

/* Hai ô chọn tệp, và ô ta nhắm tới KHÔNG phải cái đầu — đúng hình dạng mà con đột biến `U5`
 * khai thác. Trang một ô thì "ô đầu tiên" và "ô selector khớp" là cùng một thứ. */
const TRANG = `<!doctype html><meta charset="utf-8"><title>do tai len</title>
<input id="moi" type="file">
<input id="tep" type="file">
<div id="khong-phai-o-tep">chỉ là một cái div</div>
`;

const NOI_DUNG = "day la noi dung gia cua mot tam anh — do-tai-len.mjs";

async function do_() {
  const kho = mkdtempSync(join(tmpdir(), "vung-ghi-"));
  const tenTep = "anh-1.webp";
  writeFileSync(join(kho, tenTep), NOI_DUNG, "utf8");
  const duongTuyetDoi = join(kho, tenTep);

  const may = await moChromeSach({ html: TRANG, ten: "do-tai-len" });
  try {
    const dich = await choTrang(may.cdp);
    if (!dich) throw new Error("Không thấy tab nào mở trang thử.");
    const phien = (await may.cdp.gui("Target.attachToTarget", { targetId: dich, flatten: true })).sessionId;
    const sendRaw = (m, p) => may.cdp.gui(m, p, phien);
    await nghi(200);

    /* Đọc lại bằng một đường KHÁC hẳn đường ghi. `files` là thuộc tính đối tượng, không nằm
     * trong cây DOM — đúng cùng lý do mà `<input type=text>` đọc ra rỗng ở `do-doc-lai.mjs`. */
    const docLai = async (css) => {
      const r = await sendRaw("Runtime.evaluate", {
        expression: `(() => { const o = document.querySelector('${css}');
          return JSON.stringify({ so: o.files.length, ten: o.files[0]?.name ?? null, bytes: o.files[0]?.size ?? null }); })()`,
        returnByValue: true
      });
      return JSON.parse(r.result.value);
    };

    const dong = [];

    /* ① Đường đúng — và ô nhắm tới là ô THỨ HAI. */
    const ra = await runAction("input.upload", { sendRaw },
      { selector: "#tep", path: `x/${tenTep}`, path_tuyet_doi: duongTuyetDoi });
    dong.push({ ma: "①", ten: "gắn file vào ô thứ HAI", ok: ra.ok, code: ra.code, data: ra.data,
      sau: ra.ok ? await docLai("#tep") : null, oKhac: await docLai("#moi") });

    /* ② Phần tử không phải ô chọn tệp → ĐỎ, và KHÔNG gắn gì. */
    const rb = await runAction("input.upload", { sendRaw },
      { selector: "#khong-phai-o-tep", path: `x/${tenTep}`, path_tuyet_doi: duongTuyetDoi });
    dong.push({ ma: "②", ten: "selector trỏ một <div> → phải ĐỎ", ok: rb.ok, code: rb.code });

    /* ③ Thiếu đường máy chủ đặt → ĐỎ. */
    const rc = await runAction("input.upload", { sendRaw }, { selector: "#tep", path: `x/${tenTep}` });
    dong.push({ ma: "③", ten: "thiếu `path_tuyet_doi` → phải ĐỎ", ok: rc.ok, code: rc.code });

    /* ④ Đường dẫn trỏ một file KHÔNG tồn tại — Chrome nói gì? Đo, đừng đoán. */
    const rd = await runAction("input.upload", { sendRaw },
      { selector: "#tep", path: "x/khong-co.webp", path_tuyet_doi: join(kho, "khong-co.webp") });
    dong.push({ ma: "④", ten: "file không tồn tại — Chrome canh hay KHÔNG canh?", ok: rd.ok, code: rd.code, detail: (rd.detail || "").slice(0, 90),
      sau: await docLai("#tep") });

    return { chrome: may.ban.product, tenTep, bytes: Buffer.byteLength(NOI_DUNG), dong };
  } finally {
    may.dong();
    setTimeout(() => { try { rmSync(kho, { recursive: true, force: true }); } catch { /* thư mục tạm */ } }, 900);
  }
}

/** Chấm điểm — THUẦN LOGIC, ghim được không cần trình duyệt. */
export function ketLuan(tho) {
  const loi = [];
  const lay = (ma) => tho.dong.find((d) => d.ma === ma);

  const a = lay("①");
  if (!a?.ok) loi.push(`① lượt gắn không chạy được (${a?.code})`);
  else {
    if (a.sau?.so !== 1) loi.push(`① ô chọn tệp cầm ${a.sau?.so} file, chờ 1`);
    if (a.sau?.ten !== tho.tenTep) loi.push(`① tên file trên trang là ${JSON.stringify(a.sau?.ten)}, chờ ${JSON.stringify(tho.tenTep)}`);
    if (a.sau?.bytes !== tho.bytes) loi.push(`① trang thấy ${a.sau?.bytes} byte, đĩa có ${tho.bytes}`);
    /* Ô KIA phải còn rỗng — nếu không thì nó gắn vào "ô chọn tệp đầu tiên", không phải ô đã khớp. */
    if (a.oKhac?.so !== 0) loi.push("① ô chọn tệp KIA cũng có file — nó gắn theo thứ tự trang, không theo selector");
  }

  for (const [ma, ma_loi] of [["②", "NOT_A_FILE_INPUT"], ["③", "UPLOAD_PATH_MISSING"]]) {
    const d = lay(ma);
    if (d?.ok) loi.push(`${ma} PHẢI đỏ mà nó báo đạt`);
    else if (d?.code !== ma_loi) loi.push(`${ma} ném ${d?.code}, chờ ${ma_loi}`);
  }

  /* ④ GHIM MỘT SỰ THẬT VỀ CHROME, không phải ghim mã của ta.
   *
   * Lượt đo đầu (16/09) trả lời: Chrome **nhận** một đường dẫn không tồn tại, gắn vào ô một tệp
   * **rỗng 0 byte** mang đúng tên ấy, và KHÔNG báo lỗi. Đó chính là lý do `ghepDuongUpload` ở
   * máy chủ Udin phải `statSync` trước khi cho đi tiếp — một chốt không ai nghĩ ra nếu chỉ đọc
   * tài liệu CDP.
   *
   * Nên khối này ĐÒI Chrome vẫn cư xử như thế. Ngày Chrome đổi ý và bắt đầu từ chối, dòng này
   * đỏ — và đó là tin tốt: chốt ở máy chủ thành thừa, và ta biết ngay thay vì đoán. */
  const d4 = lay("④");
  if (!d4?.ok) {
    loi.push(`④ Chrome nay TỪ CHỐI file không tồn tại (${d4?.code}) — 16/09 nó NHẬN. ` +
      "Tin tốt: chốt `statSync` ở máy chủ Udin có thể đã thừa. Đo lại rồi hãy gỡ, đừng gỡ theo dòng này.");
  } else if (d4.sau?.ten !== "khong-co.webp" || d4.sau?.bytes !== 0) {
    loi.push(`④ Chrome nhận file không tồn tại nhưng cư xử khác lượt đo 16/09 ` +
      `(${JSON.stringify(d4.sau?.ten)}, ${d4.sau?.bytes} byte, chờ "khong-co.webp" 0 byte)`);
  }
  return { dat: loi.length === 0, loi };
}

export function inRa(tho) {
  const ra = [`PHÉP ĐO GẮN FILE (\`T29\`/\`W8\`) — Chrome ${tho.chrome}`, ""];
  for (const d of tho.dong) {
    ra.push(`   ${d.ma} ${d.ten}`);
    ra.push(`        kết quả : ${d.ok ? "ĐẠT" : `ĐỎ (${d.code})`}${d.detail ? ` — ${d.detail}` : ""}`);
    if (d.sau) ra.push(`        trang cầm: ${d.sau.so} file · ${JSON.stringify(d.sau.ten)} · ${d.sau.bytes} byte`);
    if (d.oKhac) ra.push(`        ô KIA    : ${d.oKhac.so} file`);
  }
  const k = ketLuan(tho);
  ra.push("");
  if (k.dat) {
    ra.push("ĐẠT — file có thật trên trang, đúng tên và đúng số byte.");
    ra.push("      Và ④ xác nhận vì sao MÁY CHỦ phải canh: Chrome nhận cả đường dẫn không tồn tại.");
  } else {
    ra.push("KHÔNG ĐẠT:");
  }
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

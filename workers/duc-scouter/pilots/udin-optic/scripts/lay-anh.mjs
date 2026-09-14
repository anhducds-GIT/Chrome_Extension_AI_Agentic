/* Udin Optic — W3: lấy ảnh kết quả về đĩa qua `scout.fetch` + `file.write`.
 *
 * Không lệnh Bridge mới: `scout.fetch as:"base64"` lấy byte, `file.write encoding:"base64"` đặt
 * xuống vùng ghi của máy chủ. Ảnh KHÔNG vào repo — repo này PUBLIC, và vùng ghi là chỗ duy nhất
 * của dữ liệu chạy (cùng đường mà `hnx-fetch` đã đi cho D3).
 *
 * Ba chỗ cố ý ĐỎ thay vì đoán:
 *   ⑴ `blob:` / `data:` — `scout.fetch` chỉ nhận http(s) và nó ĐÚNG như thế (lõi cấm `file:`).
 *      Ảnh dạng blob thuộc về tab, máy phục vụ nền không với tới; đường chữa là `scout.shot`
 *      hoặc một method mới — tức là HỎI ĐỨC, không phải nới cửa `scout.fetch`.
 *   ⑵ 200 OK mà `content-type` không phải ảnh — bài học `hnx.vn`: "200 OK" không bao giờ đủ để
 *      kết luận đã có dữ liệu. Một trang đăng nhập trả 200 sẽ nằm trên đĩa dưới tên `.webp`.
 *   ⑶ số byte ghi được ≠ số byte tải về — bắt đúng ca lẫn lộn base64/utf8, loại hỏng im lặng
 *      đã làm mất một file PDF ngày 08/09.
 *
 *   SCOUTER_GHE=<id> node workers/duc-scouter/pilots/udin-optic/scripts/lay-anh.mjs [src…]
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { goi as goiThat, timTab as timTabThat } from "../../trang-thu-cham/scripts/goi-bridge.mjs";
import { URL_UDIN } from "./qua-man-cho.mjs";
import { SEL } from "./gui-prompt.mjs";

export const THU_MUC = "udin-optic";

/* Dấu RIÊNG của module, không phải một tên thuộc tính ai cũng gõ được: một lỗi từ dây mang sẵn
 * trường tên `daGhiChu` sẽ lách qua lượt ghi chú (audit độc lập vòng 3, 14/09). */
const DA_GHI_CHU = Symbol("da-ghi-chu");

/** Tên file an toàn suy từ URL. Có thứ tự đứng trước nên hai ảnh trùng tên không đè nhau. */
export function tenFile(src, thuTu) {
  const duoiCung = (() => {
    try {
      const cuoi = new URL(src, URL_UDIN).pathname.split("/").filter(Boolean).pop() || "";
      /* Giải mã %20 trước khi lọc: không giải thì một dấu cách hoá thành "-20" trong tên file. */
      try { return decodeURIComponent(cuoi); } catch { return cuoi; }
    } catch { return ""; }
  })();
  const sach = duoiCung.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+/, "").slice(-80);
  return `${String(thuTu).padStart(2, "0")}-${sach || "anh"}`;
}

/** Đọc tập `src` ảnh kết quả đang có trên trang. Trang lấy hết, không cắt — `hasMore` nói thật. */
export async function tapAnhTrenTrang(tab, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const tap = [];
  for (let offset = 0; ; offset += 200) {
    const d = (await goi("scout.query", { target_id: tab, selector: SEL.anhKetQua, offset, limit: 200 }, tuyChon)).data;
    for (const it of d.items) {
      const src = it.attributes?.src;
      if (src && !tap.includes(src)) tap.push(src);
    }
    if (!d.hasMore) return tap;
  }
}

/**
 * @param {string[]} [dsSrc]  danh sách src cần lấy; bỏ trống thì lấy mọi ảnh đang có trên trang
 * @returns {Promise<{thuMuc:string, daLay:{src:string,file:string,bytes:number}[]}>}
 */
export async function layAnh(dsSrc = null, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;

  /* KHÔNG TRUYỀN GÌ và TRUYỀN DANH SÁCH RỖNG là hai câu khác nhau, và gộp chúng là một lời nói
   * dối đi thẳng xuống đĩa: lượt chạy không sinh ảnh nào sẽ lặng lẽ tải ảnh CŨ về rồi báo xong.
   * (Audit độc lập 14/09 bắt được đúng ca này.) */
  const tuTrang = dsSrc === null || dsSrc === undefined;
  if (!tuTrang && dsSrc.length === 0) {
    throw new Error("Danh sách ảnh rỗng — lượt này không sinh ảnh nào. Không lấy ảnh cũ thay vào.");
  }
  const tab = tuTrang ? await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon) : null;
  const ds = tuTrang ? await tapAnhTrenTrang(tab, tuyChon) : dsSrc;
  if (ds.length === 0) throw new Error("Không có ảnh kết quả nào trên trang — chưa chạy lượt nào?");

  const dau = (tuyChon.dau || new Date().toISOString()).replace(/[:.]/g, "-");
  const thuMuc = `${THU_MUC}/${dau}`;
  const daLay = [];
  /* Hỏng giữa chừng thì file đã ghi VẪN NẰM TRÊN ĐĨA — lời báo phải nói ra chỗ đó, không chỉ
   * nói ra con số, không thì người dọn phải đi mò. Lỗi NÉM TỪ DÂY (`goi` ném khi máy chủ trả
   * không ok) cũng phải mang theo chỗ đó, nên cả thân vòng lặp nằm trong một lượt bọc —
   * audit độc lập vòng 2, 14/09: "mọi throw đi qua một helper" là sai chừng nào còn lỗi RPC. */
  const nga = (chu, goc) => {
    /* Giữ `cause`: mã lỗi, errno, đường dẫn của lỗi gốc còn nguyên cho lượt chẩn đoán sau. */
    const loi = new Error(`${chu} Đã lấy ${daLay.length} ảnh, để ở '${thuMuc}'.`, goc ? { cause: goc } : undefined);
    loi[DA_GHI_CHU] = true;
    return loi;
  };

  for (const [i, src] of ds.entries()) {
    try {
      let url;
      try { url = new URL(src, URL_UDIN); }
      catch { throw nga(`Ảnh ${i + 1}: src không phải URL đọc được (${src.slice(0, 60)}).`); }
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        throw nga(
          `Ảnh ${i + 1} nằm ở '${url.protocol}' — máy phục vụ nền không với tới được thứ thuộc về tab. ` +
          "Cần đường khác (scout.shot, hoặc một method mới: hỏi Đức).",
        );
      }

      /* `scout.fetch` trả PHẲNG, không bọc trong `.data` như `scout.query` — hai hình dạng khác
       * nhau trên cùng một sợi dây. Đo ngoài đời 14/09: bản đầu đọc `.data` và ngã ngay lượt gọi
       * thật, trong khi 15 khối ghim vẫn xanh vì máy giả chép đúng cái hiểu sai của tôi. */
      const d = await goi("scout.fetch", { url: url.href, as: "base64" }, tuyChon);
      if (!d.ok) throw nga(`Ảnh ${i + 1}: máy chủ trả ${d.status}.`);
      if (!d.content_type || !/^image\//i.test(d.content_type)) {
        throw nga(`Ảnh ${i + 1}: 200 OK nhưng kiểu '${d.content_type || "không khai"}' không phải ảnh — chưa ghi.`);
      }
      if (typeof d.body_base64 !== "string" || d.body_base64 === "") {
        throw nga(`Ảnh ${i + 1}: thân rỗng dù status ${d.status}.`);
      }

      const ten = `${thuMuc}/${tenFile(url.href, i + 1)}`;
      const ghi = await goi("file.write", { path: ten, content: d.body_base64, encoding: "base64" }, tuyChon);
      if (ghi.bytes !== d.bytes) {
        /* File ĐÃ nằm trên đĩa rồi mới phát hiện lệch, nên phải gọi tên nó ra: người dọn cần biết
         * xoá cái nào, không phải biết "có một cái ở đâu đó". */
        throw nga(`Ảnh ${i + 1}: tải về ${d.bytes} byte mà ghi ${ghi.bytes} — byte hỏng trên đường, KHÔNG tin file '${ghi.path}'.`);
      }
      daLay.push({ src: url.href, file: ghi.path, bytes: ghi.bytes });
    } catch (loi) {
      /* Lỗi đã ghi chú rồi thì để nguyên; lỗi thô từ dây thì khoác thêm chỗ để file. */
      throw loi?.[DA_GHI_CHU] ? loi : nga(`Ảnh ${i + 1}: ${loi?.message || loi}.`, loi);
    }
  }

  return { thuMuc, daLay };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  /* Không đối số = "lấy mọi ảnh trên trang" (null), KHÔNG phải "danh sách rỗng" — hai câu đó
   * nay khác nhau, nên chỗ này phải nói đúng câu. */
  const doi = process.argv.slice(2);
  layAnh(doi.length ? doi : null)
    .then((k) => console.log(JSON.stringify(k)))
    .catch((e) => { console.error(e.message); process.exitCode = 1; });
}

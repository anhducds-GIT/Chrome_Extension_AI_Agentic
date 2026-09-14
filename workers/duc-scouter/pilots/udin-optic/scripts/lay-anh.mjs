/* Udin Optic — W3: lấy ảnh kết quả về đĩa qua `scout.grab` + `file.write`.
 *
 * VÌ SAO KHÔNG PHẢI `scout.fetch` (đo ngoài đời 14/09, `S-24`): ảnh Udin nằm trên S3 sau một
 * **URL ký sẵn**, chữ ký nằm trong query — mà lõi đọc **cắt query** khỏi mọi `src` theo chính
 * sách che. Nên mọi `src` đi ra tới đây đều đã mất chữ ký, và `scout.fetch` trả **403**. Đó là
 * một lớp bảo vệ làm đúng việc; đường chữa là `scout.grab`: đưa **selector**, extension tự đọc
 * `src` đầy đủ **bên trong** rồi tải luôn, trả **byte**. URL ký sẵn không bao giờ ra khỏi
 * trình duyệt.
 *
 * CHỖ GỢN CỦA GRAB, và cách xử ở đây: grab nhận một selector khớp **ĐÚNG MỘT** phần tử, còn
 * trang này ra **8 nút DOM cho 4 ảnh** (đo 13/09). Nên adapter **không đoán** `:nth-of-type` —
 * nó dựng vài ứng viên selector từ thuộc tính đọc được, **hỏi lại trang từng cái** bằng
 * `scout.query` (đọc, không tốn trần ghi), và lấy cái đầu tiên khớp đúng một. Không cái nào
 * khớp đúng một thì **ĐỎ và kể ra đã thử gì** — không bấm bừa vào phần tử đầu tiên.
 *
 * TRẦN GHI: mỗi lượt `scout.grab` tiêu **một** đơn vị trong trần 200 của lượt mở khoá. Bốn ảnh
 * là bốn đơn vị. Lượt đếm ảnh vẫn đi bằng `scout.query` (đọc, không tiêu gì).
 *
 * Ba chỗ cố ý ĐỎ thay vì đoán, giữ nguyên từ bản `scout.fetch`:
 *   ⑴ `blob:` / `data:` — thứ thuộc về tab; chặn sớm ở đây cho rẻ, và grab cũng tự chặn lần nữa.
 *   ⑵ 200 OK mà `content-type` không phải ảnh — bài học `hnx.vn`: "200 OK" không bao giờ đủ để
 *      kết luận đã có dữ liệu. Một trang đăng nhập trả 200 sẽ nằm trên đĩa dưới tên `.webp`.
 *   ⑶ số byte ghi được ≠ số byte tải về — bắt đúng ca lẫn lộn base64/utf8, loại hỏng im lặng
 *      đã làm mất một file PDF ngày 08/09.
 *
 * Ảnh KHÔNG vào repo — repo này PUBLIC, và vùng ghi của máy chủ là chỗ duy nhất của dữ liệu chạy.
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
      /* Bỏ dấu `…` mà lõi đọc gắn vào để báo "có phần đã bị cắt" — nó là chú thích cho người
       * đọc, không phải một phần của tên tệp. Để nguyên thì nó hoá thành `-` trong tên file. */
      const cuoi = new URL(String(src).replace(/…+$/, ""), URL_UDIN).pathname.split("/").filter(Boolean).pop() || "";
      /* Giải mã %20 trước khi lọc: không giải thì một dấu cách hoá thành "-20" trong tên file. */
      try { return decodeURIComponent(cuoi); } catch { return cuoi; }
    } catch { return ""; }
  })();
  const sach = duoiCung.replace(/[^A-Za-z0-9._-]/g, "-").replace(/^-+/, "").slice(-80);
  return `${String(thuTu).padStart(2, "0")}-${sach || "anh"}`;
}

/* Giá trị nhét vào một selector thuộc tính phải nằm gọn trong cặp nháy kép. Có `"` hoặc `\`
 * hoặc xuống dòng thì TỪ CHỐI ứng viên đó thay vì đi thoát chuỗi cho khéo: một selector thoát
 * sai không báo lỗi, nó lặng lẽ khớp phần tử khác — và phần tử khác ở đây nghĩa là tải nhầm ảnh. */
const nhetDuoc = (v) => typeof v === "string" && v !== "" && !/["\\\n\r]/.test(v);

/** Đọc phần tử ảnh kết quả đang có trên trang. Trang lấy hết, không cắt — `hasMore` nói thật. */
export async function danhSachAnh(tab, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const ds = [];
  for (let offset = 0; ; offset += 200) {
    const d = (await goi("scout.query", { target_id: tab, selector: SEL.anhKetQua, offset, limit: 200 }, tuyChon)).data;
    for (const it of d.items) {
      const a = it.attributes || {};
      if (a.src) ds.push({ src: a.src, alt: a.alt, id: a.id, testid: a["data-testid"] });
    }
    if (!d.hasMore) return ds;
  }
}

/** Tập `src` (đã che query) của ảnh kết quả, bỏ trùng — dùng để phân biệt ảnh mới với ảnh cũ. */
export async function tapAnhTrenTrang(tab, tuyChon = {}) {
  const tap = [];
  for (const it of await danhSachAnh(tab, tuyChon)) if (!tap.includes(it.src)) tap.push(it.src);
  return tap;
}

/**
 * Tìm một selector khớp ĐÚNG MỘT phần tử cho ảnh này. Ứng viên xếp theo độ bền giảm dần; mỗi
 * ứng viên đều **hỏi lại trang** chứ không tin là nó duy nhất.
 * @returns {Promise<string>} selector duy nhất
 */
export async function selectorDuyNhat(tab, anh, tuyChon = {}) {
  const goi = tuyChon.goi || goiThat;
  const ungVien = [];
  if (nhetDuoc(anh.id)) ungVien.push(`${SEL.anhKetQua}#${CSS_escape(anh.id)}`);
  if (nhetDuoc(anh.testid)) ungVien.push(`${SEL.anhKetQua}[data-testid="${anh.testid}"]`);
  if (nhetDuoc(anh.alt)) ungVien.push(`${SEL.anhKetQua}[alt="${anh.alt}"]`);
  /* `src` trên trang còn nguyên query ký sẵn, còn thứ tới được tay ta đã bị cắt query — nên so
   * bằng TIỀN TỐ (`^=`), không bằng `=`. Đây cũng là ứng viên duy nhất chắc chắn dựng được.
   *
   * PHẢI BỎ DẤU `…` Ở CUỐI TRƯỚC ĐÃ. Lõi đọc gắn nó vào để BÁO rằng có phần đã bị cắt
   * (`stripQuery` cắt query, `cap` cắt chuỗi quá 200 ký tự — cả hai gắn `…`). Nó là chú thích
   * cho người đọc, không phải ký tự có thật trong `src`. Để nguyên thì tiền tố không bao giờ
   * khớp — và lượt chạy thật đầu tiên 14/09 ngã đúng ở đây, trong khi 21 khối ghim vẫn xanh,
   * vì máy giả của tôi trả `src` sạch còn dây thật trả `src` có dấu. */
  const tienTo = typeof anh.src === "string" ? anh.src.replace(/…+$/, "") : anh.src;
  if (nhetDuoc(tienTo)) ungVien.push(`${SEL.anhKetQua}[src^="${tienTo}"]`);

  for (const sel of ungVien) {
    const d = (await goi("scout.query", { target_id: tab, selector: sel, limit: 1 }, tuyChon)).data;
    if (d.matchCount === 1) return sel;
  }
  throw new Error(
    `Không dựng được selector khớp đúng một phần tử cho ảnh '${anh.src}'. Đã thử ${ungVien.length} ứng viên: ` +
    `${ungVien.join(" · ") || "(không có thuộc tính nào dùng được)"}. ` +
    "Trang đổi hình dạng — sửa bảng SEL, đừng bấm bừa vào phần tử đầu tiên.",
  );
}

/* `#id` là chỗ duy nhất trong các ứng viên không nằm trong cặp nháy, nên nó cần thoát riêng.
 * `CSS.escape` không có trong Node, và một `id` lạ mà ghép thẳng là một selector khác hẳn. */
function CSS_escape(giaTri) {
  return giaTri.replace(/[^A-Za-z0-9_-]/g, (c) => `\\${c}`);
}

/**
 * @param {string[]} [dsSrc]  danh sách src (đã che query) cần lấy; bỏ trống thì lấy mọi ảnh trên trang
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

  /* Khác bản `scout.fetch`: nay LÚC NÀO cũng phải sờ tới trang, kể cả khi đã có sẵn danh sách
   * src — vì grab lấy theo PHẦN TỬ, nên phải tìm lại phần tử mang src đó. */
  const tab = await (tuyChon.timTab || timTabThat)(URL_UDIN, tuyChon);
  const tren = await danhSachAnh(tab, tuyChon);
  const ds = tuTrang ? [...new Set(tren.map((a) => a.src))] : dsSrc;
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
      let giaoThuc;
      try { giaoThuc = new URL(src, URL_UDIN).protocol; }
      catch { throw nga(`Ảnh ${i + 1}: src không phải URL đọc được (${String(src).slice(0, 60)}).`); }
      if (giaoThuc !== "http:" && giaoThuc !== "https:") {
        throw nga(
          `Ảnh ${i + 1} nằm ở '${giaoThuc}' — thứ thuộc về tab, tải xuống bằng đường nào cũng không ra byte. ` +
          "Cần đường khác (scout.shot, hoặc một method mới: hỏi Đức).",
        );
      }

      /* Phần tử phải CÒN trên trang lúc này. Ảnh biến mất giữa chừng (lượt mới đẩy lượt cũ đi)
       * là ĐỎ, không phải "bỏ qua cho xong" — bỏ qua thì lượt chạy báo ít ảnh hơn mà không ai biết. */
      const anh = tren.find((a) => a.src === src);
      if (!anh) {
        throw nga(`Ảnh ${i + 1} ('${src}') không còn trên trang lúc lấy — trang đã đổi giữa chừng.`);
      }
      const selector = await selectorDuyNhat(tab, anh, tuyChon);

      /* `scout.grab` trả PHẲNG, không bọc trong `.data` như `scout.query` — hai hình dạng khác
       * nhau trên cùng một sợi dây. Đo ngoài đời 14/09: bản đầu của file này đọc `.data` và ngã
       * ngay lượt gọi thật, trong khi 15 khối ghim vẫn xanh vì máy giả chép đúng cái hiểu sai
       * của tôi. Hình dạng dưới đây đọc thẳng từ `scouter-seed-core.mjs`, không đọc từ trí nhớ. */
      const d = await goi("scout.grab", { target_id: tab, selector, attribute: "src" }, tuyChon);
      if (!d.ok) throw nga(`Ảnh ${i + 1}: máy chủ trả ${d.status}.`);
      if (!d.content_type || !/^image\//i.test(d.content_type)) {
        throw nga(`Ảnh ${i + 1}: 200 OK nhưng kiểu '${d.content_type || "không khai"}' không phải ảnh — chưa ghi.`);
      }
      if (typeof d.body_base64 !== "string" || d.body_base64 === "") {
        throw nga(`Ảnh ${i + 1}: thân rỗng dù status ${d.status}.`);
      }

      /* Đặt tên theo `source.masked` — thứ GRAB nói nó đã tải, không phải thứ ta tưởng nó tải.
       * Hai cái lệch nhau được (trang đổi giữa chừng), và lúc lệch thì tên file phải theo byte. */
      const ten = `${thuMuc}/${tenFile(d.source?.masked || src, i + 1)}`;
      const ghi = await goi("file.write", { path: ten, content: d.body_base64, encoding: "base64" }, tuyChon);
      if (ghi.bytes !== d.bytes) {
        /* File ĐÃ nằm trên đĩa rồi mới phát hiện lệch, nên phải gọi tên nó ra: người dọn cần biết
         * xoá cái nào, không phải biết "có một cái ở đâu đó". */
        throw nga(`Ảnh ${i + 1}: tải về ${d.bytes} byte mà ghi ${ghi.bytes} — byte hỏng trên đường, KHÔNG tin file '${ghi.path}'.`);
      }
      daLay.push({ src: d.source?.masked || src, file: ghi.path, bytes: ghi.bytes, selector });
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

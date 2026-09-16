/* Phép ghim cho lượt chọn ảnh tham chiếu theo thứ tự (`@1` / `@2`).
 *
 * Chốt của cả bộ nằm ở cặp ⓐ + ⓑ: **có huy hiệu KHÔNG phải là đúng số.** Một phép kiểm dừng ở
 * *"đã mọc ra huy hiệu"* sẽ xanh ở cả lượt trang gán `1` lẫn lượt trang gán `2` — tức nó không
 * phân biệt được gì, mà đó đúng là ca Đức chỉ ra: prompt `@1` trỏ sang ảnh khác, Udin vẫn chạy,
 * vẫn ra ảnh, vẫn tính tiền, và không một dòng đỏ nào.
 *
 * ─── TRANG GIẢ ĐỔI HÌNH 17/09 ──────────────────────────────────────────────
 * Canvas nay là danh sách **CHỖ ĐẶT** `{ id, src }`, không phải danh sách `src`. Đó không phải
 * dọn dẹp: `src` bị lõi đọc cắt ở 200 ký tự, và hai ảnh khác hẳn nhau cho ra hai chuỗi y hệt
 * (đo thật trên canvas Udin, 17/09). Từ nay danh tính là `data-image-id` — mã TRANG tự đặt.
 *
 * Hệ quả cho chính bộ ghim này: hai chỗ đặt **cùng `src`** nay là chuyện bình thường và chọn
 * được (khối ⓒ), còn thứ phải TỪ CHỐI là lượt đi TÌM theo `src` khi mẩu ấy khớp nhiều chỗ.
 */
import assert from "node:assert/strict";
import {
  chonTheoThuTu, boChonHet, hopTheoId, hopTheoMauSrc, idTrenCanvas, idTheoSrc,
  sachSrc, kiemPromptThamChieu, SEL,
} from "../chon-tham-chieu.mjs";

const A = { id: "ph-aaa", src: "https://cdn.udin/img/aaa.webp" };
const B = { id: "ph-bbb", src: "https://cdn.udin/img/bbb.webp" };
const C = { id: "ph-ccc", src: "https://cdn.udin/img/ccc.webp" };
/* Cùng TẤM ẢNH với A, khác CHỖ ĐẶT — ca "một ảnh nằm nhiều chỗ" đo thật 16/09 (5 chỗ). */
const A2 = { id: "ph-aaa-2", src: A.src };

/**
 * Trang giả.
 * @param canvas   danh sách chỗ đặt `{id, src}` trên canvas
 * @param chonSan  danh sách MÃ đang được chọn sẵn, theo thứ tự
 * @param soSai    đổi con số trang gán cho ảnh ở vị trí này (1-based) thành `soSai.thanh`
 * @param khongBadge bấm xong KHÔNG mọc huy hiệu
 * @param goKhongAn  Shift+click lên ảnh đang chọn thì KHÔNG bỏ được
 * @param khuat    danh sách MÃ nằm ngoài khung nhìn
 * @param thieuId  một hộp trên canvas không mang `data-image-id`
 */
function lam({
  canvas = [A, B, C], chonSan = [], soSai = null, khongBadge = false, goKhongAn = false,
  bamThem = null, khuat = [], bamKhongAn = false, thieuId = false,
} = {}) {
  const nk = [];
  const trang = { canvas: [...canvas], chon: [...chonSan] };
  const q = (n, items = []) => ({ data: { matchCount: n, items, hasMore: false } });

  /* `.canvas-image-container[data-image-id="X"]…` → X */
  const idCuaSel = (sel) => {
    const m = sel.match(/^\.canvas-image-container\[data-image-id="(.*?)"\]/);
    return m ? m[1] : null;
  };
  /* `.canvas-image-container:has(img[src*="X"])` → X */
  const mauCuaSel = (sel) => {
    const m = sel.match(/^\.canvas-image-container:has\(img\[src\*="(.*?)"\]\)$/);
    return m ? m[1] : null;
  };
  const choTheoId = (id) => trang.canvas.filter((c) => c.id === id);
  /* Số trang GÁN cho một chỗ đặt: thứ tự trong tập chọn, trừ khi phép thử ép nó sai. */
  const soCua = (id) => {
    const i = trang.chon.indexOf(id);
    if (i < 0) return null;
    if (soSai && soSai.viTri === i + 1) return soSai.thanh;
    return String(i + 1);
  };

  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") {
      const sel = p.selector;
      if (sel === SEL.hop) {
        const items = trang.canvas.map((c, i) => ({
          attributes: thieuId && i === 0 ? {} : { "data-image-id": c.id },
        }));
        return { data: { matchCount: items.length, items, hasMore: false } };
      }
      if (sel === SEL.anh) {
        return { data: { matchCount: trang.canvas.length, hasMore: false,
                         items: trang.canvas.map((c) => ({ attributes: { src: c.src + "…" } })) } };
      }
      if (sel === SEL.dangChon) return q(trang.chon.length);
      if (sel === SEL.huyHieu) return q(!khongBadge && trang.chon.length >= 2 ? trang.chon.length : 0);
      { const m = sel.match(/^\.canvas-image-container\.selected:nth-of-type\((\d+)\)$/);
        if (m) return q(Number(m[1]) <= trang.chon.length ? 1 : 0); }
      { const mau = mauCuaSel(sel);
        if (mau !== null) {
          const hop = trang.canvas.filter((c) => c.src.includes(mau));
          return q(hop.length, hop.map((c) => ({ attributes: { "data-image-id": c.id } })));
        } }
      { const id = idCuaSel(sel);
        if (id !== null) {
          const n = choTheoId(id).length;
          if (sel === hopTheoId(id)) return q(n);
          if (sel === `${hopTheoId(id)}.selected`) return q(n === 1 && trang.chon.includes(id) ? 1 : 0);
          /* Huy hiệu: **Udin chỉ vẽ số khi có từ HAI ảnh trở lên** (đo thật 16/09 tối). */
          if (sel.endsWith(SEL.huyHieu)) {
            if (n !== 1 || khongBadge || trang.chon.length < 2) return q(0);
            return q(soCua(id) === null ? 0 : 1);
          }
        } }
    }
    if (method === "scout.wait") {
      /* Canvas kéo được, nên một ảnh có trong DOM vẫn có thể nằm ngoài khung nhìn. */
      const id = idCuaSel(p.selector);
      const oke = id !== null && choTheoId(id).length === 1 && !khuat.includes(id);
      return { data: { satisfied: oke, usableBlockedBy: oke ? null : "no_hit_test" } };
    }
    if (method === "scout.text") {
      const id = idCuaSel(p.selector);
      const so = id === null ? null : soCua(id);
      if (so === null) throw new Error("SELECTOR_AMBIGUOUS " + p.selector);
      return { data: { selector: p.selector, matchCount: 1, text: so, chars: so.length, truncated: false } };
    }
    if (method === "scout.chon") {
      let id = idCuaSel(p.selector);
      if (id === null) {
        const m = p.selector.match(/^\.canvas-image-container\.selected:nth-of-type\((\d+)\)$/);
        if (m) id = trang.chon[Number(m[1]) - 1] ?? null;
        else if (p.selector === SEL.dangChon) id = trang.chon[0] ?? null;
      }
      if (id === null) throw new Error("khong tro duoc: " + p.selector);
      const i = trang.chon.indexOf(id);
      if (i >= 0) { if (!goKhongAn) trang.chon.splice(i, 1); }
      else if (bamKhongAn) { /* cú bấm không tới trang */ }
      else {
        trang.chon.push(id);
        /* Trang tự nhặt thêm một ảnh vào tập chọn — mỗi ảnh vẫn mang đúng số của nó, nên mọi phép
         * kiểm từng ảnh đều xanh; chỉ phép đối chiếu TỔNG cuối cùng nhìn ra. */
        if (bamThem && !trang.chon.includes(bamThem)) trang.chon.push(bamThem);
      }
      return { action: "input.chon", data: { selector: p.selector }, da_kiem: false };
    }
    throw new Error("method lạ " + method + " " + (p.selector || ""));
  };
  return { nk, trang, goi, timTab: async () => "TAB", ngu: async () => {}, buocMs: 0, soNhip: 3 };
}

const soLan = (nk, m) => nk.filter((g) => g.method === m).length;

// ⓐ chọn đúng thứ tự → đọc ra 1 rồi 2, và bấm đúng hai hộp theo đúng thứ tự ấy
{ const t = lam();
  const k = await chonTheoThuTu([A.id, B.id], t);
  assert.deepEqual(k.daChon.map((x) => x.so), [1, 2]);
  const bam = t.nk.filter((g) => g.method === "scout.chon").map((g) => g.p.selector);
  assert.deepEqual(bam, [hopTheoId(A.id), hopTheoId(B.id)], "phải bấm A trước B — thứ tự bấm LÀ thứ tự @N"); }

// ⓑ CÙNG trang ấy, chỉ khác: trang gán cho ảnh thứ nhất số "2" → ĐỎ.
//    Cặp ⓐ+ⓑ là chỗ một phép kiểm dừng ở "đã có huy hiệu" sẽ xanh ở cả hai nhánh.
//    HAI cú bấm đều xảy ra, và đó là bắt buộc chứ không phải sơ sót: **Udin chỉ vẽ số khi
//    có từ HAI ảnh trở lên**, nên không có cách nào đọc thứ tự sớm hơn. Thứ đắt tiền là lượt
//    gửi prompt, và nó vẫn chưa xảy ra.
{ const t = lam({ soSai: { viTri: 1, thanh: "2" } });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], t), /mang số \*\*"2"\*\*, không phải "1"/);
  assert.equal(soLan(t.nk, "scout.chon"), 2, "hai cú bấm — trước đó không đọc được số nào"); }

// ⓒ MỘT TẤM ẢNH NẰM HAI CHỖ — nay CHỌN ĐƯỢC, vì mã trỏ CHỖ ĐẶT chứ không trỏ tấm ảnh.
//    Đường cũ (so `src`) phải từ chối cả ca này; đó là chỗ lượt nới 17/09 mua thêm được.
{ const t = lam({ canvas: [A, A2, B] });
  const k = await chonTheoThuTu([A2.id, A.id], t);
  assert.deepEqual(k.daChon.map((x) => x.so), [1, 2]);
  assert.deepEqual(t.nk.filter((g) => g.method === "scout.chon").map((g) => g.p.selector),
    [hopTheoId(A2.id), hopTheoId(A.id)], "hai chỗ đặt cùng ảnh vẫn phân biệt được"); }

// ⓓ mã không có trên canvas → TỪ CHỐI kèm lối ra, không bấm lần nào
{ const t = lam({ canvas: [B, C] });
  await assert.rejects(() => chonTheoThuTu([A.id], t), /Đọc lại danh sách/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓔ đang có ảnh được chọn sẵn → TỪ CHỐI, không bỏ lén, không bấm
{ const t = lam({ chonSan: [C.id] });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], t), /boChonCu/);
  assert.equal(soLan(t.nk, "scout.chon"), 0, "chưa xin thì không được bỏ chọn của Đức"); }

// ⓕ xin bỏ → bỏ sạch TRƯỚC rồi mới chọn, và kết quả vẫn là 1, 2
{ const t = lam({ chonSan: [C.id] });
  const k = await chonTheoThuTu([A.id, B.id], { ...t, boChonCu: true });
  assert.deepEqual([k.boChon.coSan, k.boChon.daBo], [1, 1]);
  assert.deepEqual(k.daChon.map((x) => x.so), [1, 2]);
  const bam = t.nk.filter((g) => g.method === "scout.chon").map((g) => g.p.selector);
  assert.equal(bam.length, 3, "một lượt bỏ + hai lượt chọn");
  assert.ok(!bam[0].includes(A.id), "lượt bấm ĐẦU phải là lượt bỏ chọn, không phải lượt chọn A"); }

// ⓖ Shift+click lên ảnh đang chọn mà số KHÔNG giảm → ĐỎ, không đi chọn tiếp
{ const t = lam({ chonSan: [C.id], goKhongAn: true });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], { ...t, boChonCu: true }), /KHÔNG giảm/); }

// ⓗ chọn xong mà trang KHÔNG vẽ huy hiệu nào → ĐỎ, và nói rõ là chưa đọc được thứ tự
{ const t = lam({ khongBadge: true });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], t), /chỉ vẽ 0 huy hiệu số/);
  assert.equal(soLan(t.nk, "scout.chon"), 2); }

// ⓘ selector dựng từ mã: `"` và chuỗi rỗng đều TỪ CHỐI, không đi thoát chuỗi cho khéo
{ assert.equal(sachSrc("https://x/a.webp…"), "https://x/a.webp");
  assert.equal(hopTheoId("ph-1"), `${SEL.hop}[data-image-id="ph-1"]`);
  assert.equal(hopTheoMauSrc("aaa"), `${SEL.hop}:has(img[src*="aaa"])`);
  assert.throws(() => hopTheoId('ph"1'), /nhét được vào selector/);
  assert.throws(() => hopTheoMauSrc('a".webp'), /nhét được vào selector/);
  assert.throws(() => hopTheoId(""), /Thiếu `data-image-id`/); }

// ⓙ prompt gọi `@N` ngoài tầm → ĐỎ trước khi tiêu đồng nào
{ assert.deepEqual(kiemPromptThamChieu("APPLY STYLE OF @1 TO @2", 2).goi, [1, 2]);
  assert.throws(() => kiemPromptThamChieu("apply @1 to @3", 2), /@3/);
  assert.throws(() => kiemPromptThamChieu("apply @1 to @2", 1), /@2/);
  /* không nhắc `@` nào thì không chặn — nhiều prompt thật không cần tham chiếu */
  assert.deepEqual(kiemPromptThamChieu("a red car", 0).goi, []); }

// ⓚ bỏ chọn khi đang trống → không bấm gì, và không cần xin phép
{ const t = lam();
  const k = await boChonHet(t);
  assert.deepEqual([k.coSan, k.daBo], [0, 0]);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓛ tập chọn cuối cùng phải ĐÚNG BẰNG số ảnh đã xin — trang nhặt thêm một ảnh thì ĐỎ.
//    Mọi phép kiểm từng ảnh ở trên đều xanh trong ca này (mỗi ảnh vẫn mang đúng số của nó),
//    nên đây là chỗ duy nhất bắt được một `@3` mọc ra ngoài ý muốn.
{ const t = lam({ bamThem: C.id });
  await assert.rejects(() => chonTheoThuTu([A.id], t), /trang đếm ra 2 ảnh đang chọn/); }

// ⓜ ảnh nằm ngoài khung nhìn của canvas → ĐỎ kèm việc Đức phải làm, và KHÔNG bấm bừa.
//    Đo thật 16/09: 6/12 ảnh trên canvas bấm được, số còn lại báo `no_hit_test`.
{ const t = lam({ khuat: [B.id] });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], t), /KHÔNG bấm được \(no_hit_test\)/);
  assert.equal(soLan(t.nk, "scout.chon"), 1, "ảnh đầu vẫn chọn, ảnh khuất thì dừng — không bấm mù"); }

// ⓝ CHỌN ĐÚNG MỘT ẢNH: Udin không vẽ số nào, và hàm phải **khai là không đọc được thứ tự**
//    chứ không bịa ra số 1. Đo thật 16/09 tối: 1 ảnh → selected 1, huy hiệu 0.
{ const t = lam();
  const k = await chonTheoThuTu([A.id], t);
  assert.equal(k.thuTuKiemDuoc, false);
  assert.deepEqual(k.daChon.map((x) => x.so), [null], "một ảnh thì `so` là null — không bịa");
  assert.equal(soLan(t.nk, "scout.chon"), 1); }

// ⓞ hai ảnh thì thứ tự ĐỌC ĐƯỢC, và cờ nói đúng thế
{ const t = lam();
  const k = await chonTheoThuTu([A.id, B.id], t);
  assert.equal(k.thuTuKiemDuoc, true); }

// ⓟ cú bấm KHÔNG tới trang → dừng ngay ở ảnh đầu, không bấm nốt những ảnh còn lại.
//    Phép đối chiếu TỔNG cuối cùng cũng bắt được ca này, nhưng chỉ sau khi đã bấm hết — và
//    câu báo lúc ấy nói "tổng không khớp" chứ không nói ẢNH NÀO hỏng. Đếm số cú bấm là chỗ phân biệt.
{ const t = lam({ bamKhongAn: true });
  await assert.rejects(() => chonTheoThuTu([A.id, B.id], t), /ảnh thứ 1 mà hộp ấy KHÔNG mang dấu/);
  assert.equal(soLan(t.nk, "scout.chon"), 1, "hỏng ở ảnh đầu thì dừng ngay, không bấm nốt"); }

// ⓠ xin CÙNG MỘT chỗ đặt hai lần → ĐỎ trước khi bấm. Không chặn ở đây thì cú bấm thứ hai BỎ
//    chọn chính nó, và câu báo cuối cùng sẽ là "tổng không khớp" — đúng nguyên nhân, sai chỗ chỉ.
{ const t = lam();
  await assert.rejects(() => chonTheoThuTu([A.id, A.id], t), /mã trùng nhau/);
  assert.equal(t.nk.length, 0, "chưa đụng tới trang một lần nào"); }

// ⓡ `idTrenCanvas` — đọc mã của MỌI chỗ đặt, và một hộp thiếu mã thì TỪ CHỐI CẢ LƯỢT.
//    Lặng lẽ bỏ qua hộp thiếu mã là chỗ nguy hiểm thật: phép so trước/sau đếm thiếu, rồi lượt
//    thả thành công bị báo là "canvas không mọc thêm ảnh nào" — đúng câu sai nguyên nhân 17/09.
{ const t = lam({ canvas: [A, A2, B] });
  assert.deepEqual(await idTrenCanvas(t), [A.id, A2.id, B.id]);
  const u = lam({ thieuId: true });
  await assert.rejects(() => idTrenCanvas(u), /nạp lại extension/); }

// ⓢ `idTheoSrc` — tìm hộ Đức theo mẩu `src`, và khớp ≠ 1 thì TỪ CHỐI.
//    Phép tìm phải để CHROME khớp CSS: chuỗi `src` phía Node đã bị cắt ở 200 ký tự.
{ const t = lam({ canvas: [A, A2, B] });
  assert.equal(await idTheoSrc("bbb", t), B.id);
  assert.equal(t.nk.at(-1).p.selector, hopTheoMauSrc("bbb"), "hỏi bằng `img[src*=]`, không so chuỗi trong Node");
  await assert.rejects(() => idTheoSrc("aaa", t), /khớp 2 chỗ/);
  await assert.rejects(() => idTheoSrc("khong-co", t), /Không chỗ nào/); }

// ⓣ HAI chỗ đặt mang CÙNG một `data-image-id` → TỪ CHỐI, không bấm cái đầu.
/* Trang không được phép làm thế, nhưng phép ghim không tin trang: nếu nó xảy ra thì selector
 * khớp 2 và "bấm cái đầu tiên" nghĩa là chọn nhầm tham chiếu mà không ai biết — đúng cái giá
 * Đức nêu. Khối này là chỗ duy nhất phân biệt `khop !== 1` với `khop === 0`. */
{ const t = lam({ canvas: [A, { id: A.id, src: "https://cdn.udin/img/khac.webp" }, B] });
  await assert.rejects(() => chonTheoThuTu([A.id], t), /Hai chỗ đặt mang cùng/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

console.log("chon-tham-chieu-smoke: OK");

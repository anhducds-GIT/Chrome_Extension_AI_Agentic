/* Phép ghim cho lượt chọn ảnh tham chiếu theo thứ tự (`@1` / `@2`).
 *
 * Chốt của cả bộ nằm ở cặp ⓐ + ⓑ: **có huy hiệu KHÔNG phải là đúng số.** Một phép kiểm dừng ở
 * *"đã mọc ra huy hiệu"* sẽ xanh ở cả lượt trang gán `1` lẫn lượt trang gán `2` — tức nó không
 * phân biệt được gì, mà đó đúng là ca Đức chỉ ra: prompt `@1` trỏ sang ảnh khác, Udin vẫn chạy,
 * vẫn ra ảnh, vẫn tính tiền, và không một dòng đỏ nào.
 */
import assert from "node:assert/strict";
import { chonTheoThuTu, boChonHet, hopCuaAnh, sachSrc, kiemPromptThamChieu, SEL } from "../chon-tham-chieu.mjs";

const A = "https://cdn.udin/img/aaa.webp";
const B = "https://cdn.udin/img/bbb.webp";
const C = "https://cdn.udin/img/ccc.webp";

/**
 * Trang giả.
 * @param canvas danh sách `src` của ảnh trên canvas (trùng nhau được — ca "một ảnh nằm nhiều chỗ")
 * @param chonSan danh sách `src` đang được chọn sẵn, theo thứ tự
 * @param soSai  đổi con số trang gán cho ảnh ở vị trí này (1-based) thành `soSai.thanh`
 * @param khongBadge bấm xong KHÔNG mọc huy hiệu
 * @param goKhongAn Shift+click lên ảnh đang chọn thì KHÔNG bỏ được
 */
function lam({ canvas = [A, B, C], chonSan = [], soSai = null, khongBadge = false, goKhongAn = false, bamThem = null, khuat = [], bamKhongAn = false } = {}) {
  const nk = [];
  const trang = { canvas: [...canvas], chon: [...chonSan] };
  const q = (n) => ({ data: { matchCount: n, items: [], hasMore: false } });

  /* `.canvas-image-container:has(img[src^="X"])` → đếm ảnh trên canvas có src bắt đầu bằng X. */
  const tienTo = (sel) => {
    const m = sel.match(/^\.canvas-image-container:has\(img\[src\^="(.*?)"\]\)/);
    return m ? m[1] : null;
  };
  const demTienTo = (p) => trang.canvas.filter((s) => s.startsWith(p)).length;
  /* Số trang GÁN cho một ảnh: thứ tự trong tập chọn, trừ khi phép thử ép nó sai. */
  const soCua = (src) => {
    const i = trang.chon.indexOf(src);
    if (i < 0) return null;
    if (soSai && soSai.viTri === i + 1) return soSai.thanh;
    return String(i + 1);
  };

  const goi = async (method, p) => {
    nk.push({ method, p });
    if (method === "scout.query") {
      const sel = p.selector;
      if (sel === SEL.dangChon) return q(trang.chon.length);
      if (sel === SEL.anh) {
        return { data: { matchCount: trang.canvas.length, hasMore: false,
                         items: trang.canvas.map((src) => ({ attributes: { src: src + "…" } })) } };
      }
      { const m = sel.match(/^\.canvas-image-container\.selected:nth-of-type\((\d+)\)$/);
        if (m) return q(Number(m[1]) <= trang.chon.length ? 1 : 0); }
      if (sel === SEL.huyHieu) return q(!khongBadge && trang.chon.length >= 2 ? trang.chon.length : 0);
      { const m = sel.match(/^(\.canvas-image-container:has\(img\[src\^="(.*?)"\]\))\.selected$/);
        if (m) { const c = demTienTo(m[2]);
          if (c !== 1) return q(0);
          const src = trang.canvas.find((x) => x.startsWith(m[2]));
          return q(trang.chon.includes(src) ? 1 : 0); } }
      const p2 = tienTo(sel);
      if (p2 !== null) {
        const n = demTienTo(p2);
        if (!sel.endsWith(SEL.huyHieu)) return q(n);
        /* Huy hiệu: **Udin chỉ vẽ số khi có từ HAI ảnh trở lên** (đo thật 16/09 tối) — một ảnh
         * thì hộp mang `selected` mà không có số nào. */
        if (n !== 1 || khongBadge || trang.chon.length < 2) return q(0);
        const src = trang.canvas.find((s) => s.startsWith(p2));
        return q(soCua(src) === null ? 0 : 1);
      }
    }
    if (method === "scout.wait") {
      /* Canvas kéo được, nên một ảnh có trong DOM vẫn có thể nằm ngoài khung nhìn. */
      const p2 = tienTo(p.selector);
      const src = p2 === null ? null : trang.canvas.find((x) => x.startsWith(p2));
      const oke = src !== null && !khuat.includes(src);
      return { data: { satisfied: oke, usableBlockedBy: oke ? null : "no_hit_test" } };
    }
    if (method === "scout.text") {
      const p2 = tienTo(p.selector);
      const src = p2 === null ? null : trang.canvas.find((s) => s.startsWith(p2));
      const so = src === null ? null : soCua(src);
      if (so === null) throw new Error("SELECTOR_AMBIGUOUS " + p.selector);
      return { data: { selector: p.selector, matchCount: 1, text: so, chars: so.length, truncated: false } };
    }
    if (method === "scout.chon") {
      let src = null;
      const p2 = tienTo(p.selector);
      if (p2 !== null) src = trang.canvas.find((s) => s.startsWith(p2)) ?? null;
      else {
        const m = p.selector.match(/^\.canvas-image-container\.selected:nth-of-type\((\d+)\)$/);
        if (m) src = trang.chon[Number(m[1]) - 1] ?? null;
        else if (p.selector === SEL.dangChon) src = trang.chon[0] ?? null;
      }
      if (src === null) throw new Error("khong tro duoc: " + p.selector);
      const i = trang.chon.indexOf(src);
      if (i >= 0) { if (!goKhongAn) trang.chon.splice(i, 1); }
      else if (bamKhongAn) { /* cú bấm không tới trang */ }
      else {
        trang.chon.push(src);
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
  const k = await chonTheoThuTu([A, B], t);
  assert.deepEqual(k.daChon.map((x) => x.so), [1, 2]);
  const bam = t.nk.filter((g) => g.method === "scout.chon").map((g) => g.p.selector);
  assert.deepEqual(bam, [hopCuaAnh(A), hopCuaAnh(B)], "phải bấm A trước B — thứ tự bấm LÀ thứ tự @N"); }

// ⓑ CÙNG trang ấy, chỉ khác: trang gán cho ảnh thứ nhất số "2" → ĐỎ.
//    Cặp ⓐ+ⓑ là chỗ một phép kiểm dừng ở "đã có huy hiệu" sẽ xanh ở cả hai nhánh.
//    HAI cú bấm đều xảy ra, và đó là bắt buộc chứ không phải sơ sót: **Udin chỉ vẽ số khi
//    có từ HAI ảnh trở lên**, nên không có cách nào đọc thứ tự sớm hơn. Thứ đắt tiền là lượt
//    gửi prompt, và nó vẫn chưa xảy ra.
{ const t = lam({ soSai: { viTri: 1, thanh: "2" } });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /mang số \*\*"2"\*\*, không phải "1"/);
  assert.equal(soLan(t.nk, "scout.chon"), 2, "hai cú bấm — trước đó không đọc được số nào"); }

// ⓒ một tấm ảnh nằm NHIỀU chỗ trên canvas → TỪ CHỐI, không bấm lần nào
{ const t = lam({ canvas: [A, A, B] });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /nằm nhiều chỗ/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓓ ảnh không có trên canvas → TỪ CHỐI kèm lối ra
{ const t = lam({ canvas: [B, C] });
  await assert.rejects(() => chonTheoThuTu([A], t), /đưa nó lên canvas trước/);
  assert.equal(soLan(t.nk, "scout.chon"), 0); }

// ⓔ đang có ảnh được chọn sẵn → TỪ CHỐI, không bỏ lén, không bấm
{ const t = lam({ chonSan: [C] });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /boChonCu/);
  assert.equal(soLan(t.nk, "scout.chon"), 0, "chưa xin thì không được bỏ chọn của Đức"); }

// ⓕ xin bỏ → bỏ sạch TRƯỚC rồi mới chọn, và kết quả vẫn là 1, 2
{ const t = lam({ chonSan: [C] });
  const k = await chonTheoThuTu([A, B], { ...t, boChonCu: true });
  assert.deepEqual([k.boChon.coSan, k.boChon.daBo], [1, 1]);
  assert.deepEqual(k.daChon.map((x) => x.so), [1, 2]);
  const bam = t.nk.filter((g) => g.method === "scout.chon").map((g) => g.p.selector);
  assert.equal(bam.length, 3, "một lượt bỏ + hai lượt chọn");
  assert.ok(!bam[0].includes("aaa"), "lượt bấm ĐẦU phải là lượt bỏ chọn, không phải lượt chọn A"); }

// ⓖ Shift+click lên ảnh đang chọn mà số KHÔNG giảm → ĐỎ, không đi chọn tiếp
{ const t = lam({ chonSan: [C], goKhongAn: true });
  await assert.rejects(() => chonTheoThuTu([A, B], { ...t, boChonCu: true }), /KHÔNG giảm/); }

// ⓗ chọn xong mà trang KHÔNG vẽ huy hiệu nào → ĐỎ, và nói rõ là chưa đọc được thứ tự
{ const t = lam({ khongBadge: true });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /chỉ vẽ 0 huy hiệu số/);
  assert.equal(soLan(t.nk, "scout.chon"), 2); }

// ⓘ dấu `…` lõi đọc gắn vào KHÔNG được lọt vào selector, và `"` thì từ chối
{ assert.equal(sachSrc("https://x/a.webp…"), "https://x/a.webp");
  assert.equal(hopCuaAnh("https://x/a.webp…"), `${SEL.hop}:has(img[src^="https://x/a.webp"])`);
  assert.throws(() => hopCuaAnh('https://x/a".webp'), /nhét được vào selector/);
  assert.throws(() => hopCuaAnh("…"), /Thiếu `src`/); }

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
{ const t = lam({ bamThem: C });
  await assert.rejects(() => chonTheoThuTu([A], t), /trang đếm ra 2 ảnh đang chọn/); }

// ⓜ ảnh nằm ngoài khung nhìn của canvas → ĐỎ kèm việc Đức phải làm, và KHÔNG bấm bừa.
//    Đo thật 16/09: 6/12 ảnh trên canvas bấm được, số còn lại báo `no_hit_test`.
{ const t = lam({ khuat: [B] });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /KHÔNG bấm được \(no_hit_test\)/);
  assert.equal(soLan(t.nk, "scout.chon"), 1, "ảnh đầu vẫn chọn, ảnh khuất thì dừng — không bấm mù"); }

// ⓝ CHỌN ĐÚNG MỘT ẢNH: Udin không vẽ số nào, và hàm phải **khai là không đọc được thứ tự**
//    chứ không bịa ra số 1. Đo thật 16/09 tối: 1 ảnh → selected 1, huy hiệu 0.
{ const t = lam();
  const k = await chonTheoThuTu([A], t);
  assert.equal(k.thuTuKiemDuoc, false);
  assert.deepEqual(k.daChon.map((x) => x.so), [null], "một ảnh thì `so` là null — không bịa");
  assert.equal(soLan(t.nk, "scout.chon"), 1); }

// ⓞ hai ảnh thì thứ tự ĐỌC ĐƯỢC, và cờ nói đúng thế
{ const t = lam();
  const k = await chonTheoThuTu([A, B], t);
  assert.equal(k.thuTuKiemDuoc, true); }

// ⓟ cú bấm KHÔNG tới trang → dừng ngay ở ảnh đầu, không bấm nốt những ảnh còn lại.
//    Phép đối chiếu TỔNG cuối cùng cũng bắt được ca này, nhưng chỉ sau khi đã bấm hết — và
//    câu báo lúc ấy nói "tổng không khớp" chứ không nói ẢNH NÀO hỏng. Đếm số cú bấm là chỗ phân biệt.
{ const t = lam({ bamKhongAn: true });
  await assert.rejects(() => chonTheoThuTu([A, B], t), /ảnh thứ 1 mà hộp ấy KHÔNG mang dấu/);
  assert.equal(soLan(t.nk, "scout.chon"), 1, "hỏng ở ảnh đầu thì dừng ngay, không bấm nốt"); }

console.log("chon-tham-chieu-smoke: OK");

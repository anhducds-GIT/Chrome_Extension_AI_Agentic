/* tests/scouter-journal-smoke.mjs — ghim SỔ CÔNG VIỆC.
 *
 * Sổ này là nguồn sự thật DUY NHẤT của khối "tiến độ thuần hoá" trên bảng bên. Một cuốn sổ sai
 * tệ hơn không có sổ, vì nó sai một cách có thẩm quyền: Đức sẽ tin con số trên bảng hơn tin
 * mắt mình. Chín khối dưới đây canh đúng chỗ nó có thể nói dối.
 */
import assert from "node:assert/strict";
import {
  JOURNAL_CONSTANTS,
  createJournal,
  nanSo,
  tenMien,
  tinhTienDo
} from "../scripts/scouter-journal-core.mjs";

/* Kho lưu giả: đủ mỏng để không giấu lỗi, và bơm được lỗi vào đúng một lượt. */
function khoGia(banDau = {}) {
  const o = { ...banDau };
  const kho = {
    nemKhiGhi: null,
    soLanGhi: 0,
    storage: {
      local: {
        async get(keys) {
          const ra = {};
          for (const k of [].concat(keys)) if (k in o) ra[k] = o[k];
          return ra;
        },
        async set(cap) {
          kho.soLanGhi += 1;
          if (kho.nemKhiGhi) throw new Error(kho.nemKhiGhi);
          Object.assign(o, JSON.parse(JSON.stringify(cap)));
        }
      }
    },
    tho: () => o[JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY]
  };
  return kho;
}

const KHOA = JOURNAL_CONSTANTS.JOURNAL_STORAGE_KEY;

/* ---- ① BẤT BIẾN ⑴: hỏng thì KHÔNG được tính vào tiến độ -------------------
 * Đây là chốt quan trọng nhất của cả file. Tiến độ là bằng chứng đã làm được, không phải
 * đếm số lần đã thử. Nếu một lệnh ném lỗi mà vẫn tích được mốc thì cái bảng đang khoe một
 * năng lực Scouter KHÔNG có, và Đức sẽ dựa vào nó để quyết định. */
{
  const kho = khoGia();
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => "https://vidu.com/trang", now: () => 1000 });

  await so_tay.ghi("scout.click", "T1", false, "WRITE_BLOCKED");
  let so = await so_tay.doc();
  assert.equal(so.hoatDong.length, 1, "lenh hong VAN phai vao hoat dong — Duc can thay no hong");
  assert.equal(so.hoatDong[0].ok, false);
  assert.equal(so.hoatDong[0].ma, "WRITE_BLOCKED");
  assert.equal(Object.keys(so.trang).length, 0, "lenh HONG ma van cong vao tien do la noi doi");

  await so_tay.ghi("scout.click", "T1", true);
  so = await so_tay.doc();
  assert.equal(tinhTienDo(so, "https://vidu.com").xong, 1, "lenh THANH CONG phai tich moc");
}

/* ---- ② BẤT BIẾN ⑵: tên miền chốt LÚC GHI, không phải lúc đọc --------------
 * `target_id` chỉ sống bằng tuổi cái tab. Nếu tên miền được tra lúc bảng bên vẽ thì đóng tab
 * là mất sạch tiến độ — và đó là khác biệt giữa một cuốn sổ và một cái đèn báo. */
{
  const kho = khoGia();
  let tabConSong = true;
  const so_tay = createJournal({
    chromeApi: kho,
    traUrl: async () => (tabConSong ? "https://hnx.vn/bang-gia" : null),
    now: () => 2000
  });

  await so_tay.ghi("scout.page", "T9", true);
  tabConSong = false;  /* Đức đóng tab. */

  const so = await so_tay.doc();
  assert.equal(tinhTienDo(so, "https://hnx.vn").xong, 1, "dong tab la mat tien do — ten mien da khong duoc chot luc ghi");
}

/* ---- ③ BẤT BIẾN ⑶: sổ hỏng KHÔNG được làm hỏng lượt gọi -------------------
 * Sổ phục vụ con mắt của Đức; đường ghi của AI không được chết vì cuốn sổ đầy. Và phong bì
 * trả về phải là ĐÚNG VẬT dispatch gốc trả — không sao chép, không nắn. */
{
  const kho = khoGia();
  kho.nemKhiGhi = "kho luu day";
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => "https://vidu.com" });

  const phongBiGoc = { protocol: "x", ok: true, result: { a: 1 } };
  const boc = so_tay.boc(async () => phongBiGoc);
  const ra = await boc({ method: "scout.page", params: { target_id: "T1" } });
  assert.equal(ra, phongBiGoc, "phai tra ve DUNG vat dispatch goc tra, khong phai ban sao");

  /* Và `ghi` gọi trực tiếp cũng không được ném. */
  assert.equal(await so_tay.ghi("scout.page", "T1", true), null, "ghi hong phai tra null, khong duoc nem");
}

/* ---- ④ `system.ping` là phép lọc DUY NHẤT --------------------------------
 * Ping đập theo nhịp lưới đỡ mỗi phút. Không lọc thì "hoạt động gần nhất" 100% là ping và 0%
 * là việc thật — tức là mất luôn khối đó. Nhưng lọc quá tay cũng hỏng: một method bị giấu là
 * một việc AI làm mà Đức không thấy. */
{
  const kho = khoGia();
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => null });
  for (const m of ["system.ping", "session.hello", "system.capabilities", "scout.targets", "system.ping"]) {
    await so_tay.ghi(m, null, true);
  }
  const so = await so_tay.doc();
  assert.deepEqual(so.hoatDong.map((d) => d.method), ["scout.targets", "system.capabilities", "session.hello"],
    "chi duoc loc system.ping, va phai loc HET system.ping");
  assert.deepEqual([...JOURNAL_CONSTANTS.KHONG_GHI], ["system.ping"], "danh sach loc phai dung MOT ten");
}

/* ---- ⑤ Số tổng và danh sách ra từ CÙNG một lượt tính ----------------------
 * Bản vẽ v1 ghi `6 / 8` ở đầu khối trong khi danh sách ngay dưới có 4 dấu tích. Khối này là
 * lý do lỗi đó không lặp lại được: `tinhTienDo` trả về cả hai, và chúng đếm cùng một mảng. */
{
  const kho = khoGia();
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => "https://a.com" });
  await so_tay.ghi("scout.page", "T1", true);
  await so_tay.ghi("scout.tree", "T1", true);
  await so_tay.ghi("scout.click", "T1", true);

  const td = tinhTienDo(await so_tay.doc(), "https://a.com");
  assert.equal(td.xong, td.moc.filter((m) => m.xong).length, "so tong va danh sach phai khop — day la loi 6/8 cua ban ve v1");
  assert.equal(td.tong, td.moc.length);
  assert.equal(td.xong, 3);
  assert.equal(td.phanTram, Math.round((3 / td.tong) * 100));

  /* Mỗi mốc buộc vào ĐÚNG một method — điều kiện để bất biến ⑴ đứng được. */
  const dsMethod = JOURNAL_CONSTANTS.MOC_THUAN_HOA.map((m) => m.method);
  assert.equal(new Set(dsMethod).size, dsMethod.length, "hai moc dung chung mot method thi mot trong hai khong bao gio tich rieng duoc");
  for (const m of JOURNAL_CONSTANTS.MOC_THUAN_HOA) {
    assert.ok(m.ten && m.mota && m.ma, "moc nao cung phai co chu cho Duc doc");
  }

  /* Trang chưa từng chạm phải là 0/8, không phải lỗi. */
  const chua = tinhTienDo(await so_tay.doc(), "https://chua-tung.com");
  assert.equal(chua.xong, 0);
  assert.equal(chua.moc.length, td.tong);
}

/* ---- ⑥ Hai lượt ghi cùng lúc KHÔNG được nuốt nhau -------------------------
 * `dispatch` chạy song song được, mà đọc-sửa-ghi trên một khoá chung thì hai lượt cùng đọc bản
 * cũ rồi cùng ghi đè: người ghi sau thắng, người ghi trước biến mất không dấu vết. Đúng loại
 * lỗi đã ăn một quyền sở hữu trong repo này ngày 02/09. */
{
  const kho = khoGia();
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => "https://b.com" });
  await Promise.all([
    so_tay.ghi("scout.page", "T1", true),
    so_tay.ghi("scout.tree", "T1", true),
    so_tay.ghi("scout.query", "T1", true),
    so_tay.ghi("scout.a11y", "T1", true)
  ]);
  const so = await so_tay.doc();
  assert.equal(so.hoatDong.length, 4, "bon luot ghi song song ma so chi con it hon — mat ban ghi");
  assert.equal(tinhTienDo(so, "https://b.com").xong, 4);
}

/* ---- ⑦ Trần: 40 dòng hoạt động, 20 trang ---------------------------------
 * Không có trần thì kho lưu của extension phình vô hạn, và `storage.local` có hạn mức thật. */
{
  const kho = khoGia();
  const so_tay = createJournal({ chromeApi: kho, traUrl: async () => null, now: () => 5 });
  for (let i = 0; i < JOURNAL_CONSTANTS.RING_TOI_DA + 12; i += 1) await so_tay.ghi("scout.targets", null, true);
  /* Đo BẢN GHI THÔ trong kho, không đo qua `doc()`. `doc()` cũng cắt, nên đo qua nó thì không
   * phân biệt được "chặn lúc GHI" với "chặn lúc ĐỌC" — mà chỉ cái thứ nhất mới giữ cho kho lưu
   * khỏi phình. Đo nhầm chỗ này đã để một con đột biến sống sót (J5, 07/09). */
  assert.equal(kho.tho().hoatDong.length, JOURNAL_CONSTANTS.RING_TOI_DA, "tran phai chan NGAY LUC GHI, khong phai luc doc");
  assert.equal((await so_tay.doc()).hoatDong.length, JOURNAL_CONSTANTS.RING_TOI_DA, "va doc ra cung phai dung tran");

  const kho2 = khoGia();
  let n = 0;
  const so2 = createJournal({
    chromeApi: kho2,
    traUrl: async () => `https://trang-${n}.com`,
    now: () => 1000 + n
  });
  for (n = 0; n < JOURNAL_CONSTANTS.TRANG_TOI_DA + 5; n += 1) await so2.ghi("scout.page", "T1", true);
  const so2doc = await so2.doc();
  assert.equal(Object.keys(so2doc.trang).length, JOURNAL_CONSTANTS.TRANG_TOI_DA, "so trang phai chan o tran");
  /* Bỏ trang CŨ nhất, giữ trang mới nhất — bỏ ngược lại là xoá đúng thứ Đức đang nhìn. */
  assert.ok(so2doc.trang["https://trang-24.com"], "phai giu trang moi cham nhat");
  assert.ok(!so2doc.trang["https://trang-0.com"], "phai bo trang cu nhat");
}

/* ---- ⑧ Bản ghi méo KHÔNG được làm trắng bảng ------------------------------
 * Kho lưu sống lâu hơn file sinh ra nó. Một bản ghi của phiên bản cũ mà lọt vào phần vẽ sẽ
 * làm bảng bên trắng, và Đức sẽ thấy "extension hỏng" chứ không thấy "sổ cũ". */
{
  for (const rac of [null, 42, "chuoi", [], { trang: "khong-phai-object" }, { trang: { "khong-phai-url": {} } }]) {
    const so = nanSo(rac);
    assert.deepEqual(so.trang, {}, `rac ${JSON.stringify(rac)} phai nan ve so trang`);
    assert.deepEqual(so.hoatDong, []);
    assert.equal(tinhTienDo(so, "https://a.com").xong, 0);
  }
  /* Method lạ trong sổ cũ bị bỏ, phần còn lại giữ nguyên — nắn, không vứt cả quyển. */
  const lan = nanSo({
    trang: { "https://a.com": { moc: { "scout.page": { lan: 3, cuoi: 9 }, "scout.bay-gio-khong-con": { lan: 1 } }, chamCuoi: 9 } },
    hoatDong: [{ method: "scout.page", ok: true, luc: 9 }, { khong_co_method: true }]
  });
  assert.deepEqual(Object.keys(lan.trang["https://a.com"].moc), ["scout.page"], "method la phai bi bo");
  assert.equal(lan.trang["https://a.com"].moc["scout.page"].lan, 3, "phan con lai phai giu nguyen");
  assert.equal(lan.hoatDong.length, 1, "dong hoat dong khong co method phai bi bo");
}

/* ---- ⑨ Tên miền, không phải cả địa chỉ -----------------------------------
 * `https://chatgpt.com/c/abc` và `https://chatgpt.com/` là CÙNG một trang cần thuần hoá. Tách
 * theo địa chỉ đầy đủ thì mỗi cuộc trò chuyện mới lại là một trang lạ, và tiến độ không bao
 * giờ nhích quá 1/8. */
{
  assert.equal(tenMien("https://chatgpt.com/c/abc-123?x=1#y"), "https://chatgpt.com");
  assert.equal(tenMien("https://chatgpt.com/"), "https://chatgpt.com");
  assert.equal(tenMien("http://127.0.0.1:8080/a"), "http://127.0.0.1:8080", "cong khac la trang khac");
  /* Chỉ http(s). `chrome://`, `file://`, `devtools://` không phải trang cần thuần hoá, và để
   * chúng vào là đổ rác vào ô chọn trang của Đức. */
  for (const xau of ["chrome://extensions", "file:///C:/a.html", "devtools://x", "", null, undefined, "khong-phai-url"]) {
    assert.equal(tenMien(xau), null, `${xau} khong duoc thanh mot trang`);
  }
}

console.log("scouter-journal smoke tests: PASS (9 khoi)");

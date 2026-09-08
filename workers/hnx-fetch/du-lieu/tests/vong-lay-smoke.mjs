/* tests/vong-lay-smoke.mjs — ghim BA ĐIỀU KIỆN ĐÓNG của `S-10`, không tiêu một lượt gọi thật.
 *
 * Điều kiện đóng khai trong `BACKLOG.md` của gói: *"một lượt chạy lấy đủ 5 ngày giao dịch liên
 * tiếp, ghi ra 5 file qua Bridge, chạy lại lượt hai KHÔNG tải lại ngày đã có, và đứt giữa chừng
 * thì chạy tiếp được từ ngày còn thiếu — có phép ghim dựng máy chủ giả cho cả ba tính chất đó."*
 *
 * Chín khối. Ba khối đầu là ba điều kiện đó; sáu khối sau canh những chỗ mà nếu sai thì ba khối
 * đầu vẫn xanh nhưng lượt chạy thật sẽ đốt ngân sách hoặc bỏ sót ngày.
 */
import assert from "node:assert/strict";
import { createVongLay, KET_QUA, LoiNguon } from "../vong-lay.mjs";

const NGAY = ["2026-09-01", "2026-09-02", "2026-09-03", "2026-09-04", "2026-09-07"];

/* Nguồn giả: cùng hình dạng với nguồn thật, không biết trang nào. */
const nguonGia = (tuyChon = {}) => ({
  tenFile: (ngay) => `${ngay}.json`,
  yeuCau: (ngay) => ({ url: "https://vi-du.example.com/d", method: "POST", body: `p_date=${ngay}` }),
  kiemTra: tuyChon.kiemTra || ((phanHoi) => ({ noiDung: phanHoi.body }))
});

/* Máy chủ giả. Ghi lại MỌI lượt gọi — đó là thứ cho phép đếm "đã tiêu mấy lượt ngân sách". */
function mayChuGia(tuyChon = {}) {
  const dia = new Map(tuyChon.dia || []);
  const daGoi = [];
  const goi = async (method, params) => {
    daGoi.push({ method, params });
    if (method === "file.list") {
      if (tuyChon.chuaCoThuMuc) { const e = new Error("khong co"); e.ma = "DIR_NOT_FOUND"; throw e; }
      return { path: params.path, entries: [...dia].map(([name, bytes]) => ({ name, kind: "file", bytes })) };
    }
    if (method === "file.write") {
      const ten = String(params.path).split("/").pop();
      dia.set(ten, Buffer.byteLength(params.content, "utf8"));
      return { path: params.path, bytes: Buffer.byteLength(params.content, "utf8") };
    }
    if (method === "scout.fetch") {
      if (tuyChon.fetch) return tuyChon.fetch(params, daGoi.filter((g) => g.method === "scout.fetch").length);
      return { action: "fetch", status: 200, ok: true, body: `{"ngay":"${params.body}"}` };
    }
    throw new Error(`method la: ${method}`);
  };
  return { goi, dia, daGoi, demFetch: () => daGoi.filter((g) => g.method === "scout.fetch").length };
}

/* ---- ① NĂM NGÀY → NĂM FILE ---------------------------------------------- */
{
  const may = mayChuGia({ chuaCoThuMuc: true });
  const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx" });
  const ra = await vong.chay(NGAY);

  assert.equal(ra.tom_tat.lay_moi, 5, JSON.stringify(ra.tom_tat));
  assert.equal(ra.tom_tat.hong, 0);
  assert.equal(may.dia.size, 5, "phai ghi ra dung 5 file");
  assert.deepEqual([...may.dia.keys()].sort(), NGAY.map((n) => `${n}.json`).sort());
  assert.equal(may.demFetch(), 5, "5 ngay thi dung 5 luot ngan sach, khong hon");
}

/* ---- ② LƯỢT HAI KHÔNG TẢI LẠI ------------------------------------------- */
{
  const may = mayChuGia({ dia: NGAY.map((n) => [`${n}.json`, 231000]) });
  const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx" });
  const ra = await vong.chay(NGAY);

  assert.equal(ra.tom_tat.da_co, 5);
  assert.equal(ra.tom_tat.lay_moi, 0);
  /* Chốt thật nằm ở đây, không nằm ở con số trên: KHÔNG một lượt gọi mạng nào. Đếm ý định thì
   * dễ xanh; đếm lượt gọi mới chứng minh không tốn gì. */
  assert.equal(may.demFetch(), 0, "luot hai ma van goi mang la dang tai lai");
}

/* ---- ③ ĐỨT GIỮA CHỪNG → CHẠY TIẾP TỪ NGÀY CÒN THIẾU --------------------- */
{
  /* Lượt đầu: chết sau ngày thứ ba (giả lập bằng một lỗi không thử lại được ở ngày 4). */
  const may1 = mayChuGia({
    chuaCoThuMuc: true,
    fetch: (params, lanThu) => {
      if (lanThu > 3) { const e = new Error("mat dien"); e.ma = "CHET"; throw e; }
      return { action: "fetch", status: 200, ok: true, body: "{}" };
    }
  });
  const vong1 = createVongLay({ goi: may1.goi, nguon: nguonGia(), thuMuc: "hnx", lanThuToiDa: 1 });
  const ra1 = await vong1.chay(NGAY);
  assert.equal(ra1.tom_tat.lay_moi, 3);
  assert.equal(may1.dia.size, 3, "moi ghi duoc 3 file truoc khi dut");

  /* Lượt hai: dùng CHÍNH cái đĩa đó, mọi thứ lành lại. */
  const may2 = mayChuGia({ dia: may1.dia });
  const vong2 = createVongLay({ goi: may2.goi, nguon: nguonGia(), thuMuc: "hnx" });
  const ra2 = await vong2.chay(NGAY);

  assert.equal(ra2.tom_tat.da_co, 3, "ba ngay da co phai duoc bo qua");
  assert.equal(ra2.tom_tat.lay_moi, 2, "chi lay dung hai ngay con thieu");
  assert.equal(may2.demFetch(), 2, "chay tiep ma goi lai ca 5 la khong chay tiep, la lam lai");
  assert.equal(may2.dia.size, 5);
}

/* ---- ④ FILE 0 BYTE KHÔNG TÍNH LÀ ĐÃ CÓ ---------------------------------
 * Máy chủ chết giữa lượt ghi để lại đúng cái đó. Coi nó là xong nghĩa là bỏ sót một ngày MÃI
 * MÃI, và bỏ sót thì im lặng — không ai thấy một cái lỗ giữa tuần. */
{
  const may = mayChuGia({ dia: [["2026-09-01.json", 231000], ["2026-09-02.json", 0]] });
  const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx" });
  const ra = await vong.chay(NGAY.slice(0, 2));
  assert.equal(ra.tom_tat.da_co, 1);
  assert.equal(ra.tom_tat.lay_moi, 1, "file 0 byte phai duoc lay lai");
  assert.ok(may.dia.get("2026-09-02.json") > 0, "sau khi lay lai thi phai khac 0");
}

/* ---- ④b MỘT NGÀY LẶP TRONG DANH SÁCH CHỈ ĐƯỢC LẤY MỘT LẦN ---------------
 * Danh sách ngày do người gọi đưa, và người gọi lặp là chuyện xảy ra. Vòng lặp phải nhớ thứ nó
 * VỪA ghi trong chính lượt này, không chỉ thứ đã có trên đĩa lúc bắt đầu — nếu không thì mỗi
 * lần lặp là một lượt ngân sách đốt để ghi đè đúng cái file vừa ghi. */
{
  const may = mayChuGia({ chuaCoThuMuc: true });
  const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx" });
  const ra = await vong.chay(["2026-09-01", "2026-09-02", "2026-09-01"]);
  assert.equal(ra.tom_tat.lay_moi, 2);
  assert.equal(ra.tom_tat.da_co, 1, "lan gap thu hai cua cung mot ngay phai la 'da co'");
  assert.equal(may.demFetch(), 2, "ngay lap ma goi lai la dot ngan sach cho mot file da co");
}

/* ---- ⑤ LỖI ĐÁNG THỬ LẠI → THỬ ĐỦ SỐ LẦN --------------------------------- */
{
  let lan = 0;
  const may = mayChuGia({
    chuaCoThuMuc: true,
    fetch: () => { lan += 1; if (lan < 3) throw new Error("mang dut"); return { status: 200, ok: true, body: "{}" }; }
  });
  const daNgu = [];
  const vong = createVongLay({
    goi: may.goi, nguon: nguonGia(), thuMuc: "hnx",
    lanThuToiDa: 3, ngu: async (ms) => { daNgu.push(ms); }
  });
  const ra = await vong.chay(["2026-09-01"]);
  assert.equal(ra.tom_tat.lay_moi, 1, "hai lan dut roi lan ba duoc thi phai tinh la duoc");
  assert.equal(lan, 3);
  assert.deepEqual(daNgu, [1000, 2000], "phai cho lui dan, khong dam lien tiep");
}

/* ---- ⑥ 200 OK NHƯNG SAI HÌNH DẠNG → DỪNG CẢ LƯỢT ------------------------
 * Cái bẫy đã ghi trong `S-10`: đoán sai tên tham số thì trang trả **200 OK kèm một trang HTML
 * khác**, trông y hệt thành công. Yêu cầu sai thì sai với MỌI ngày — chạy tiếp chỉ để đốt sạch
 * ngân sách rồi báo "hỏng hết". Đây là khối đắt tiền nhất của cả file. */
{
  const may = mayChuGia({
    chuaCoThuMuc: true,
    fetch: () => ({ status: 200, ok: true, body: "<!DOCTYPE html><html>trang khac</html>" })
  });
  const vong = createVongLay({
    goi: may.goi, thuMuc: "hnx",
    nguon: nguonGia({
      kiemTra: (phanHoi) => {
        if (!String(phanHoi.body).trim().startsWith("{")) {
          throw new LoiNguon("HINH_DANG_SAI", "200 OK nhung khong phai JSON — nhieu kha nang sai tham so.", { thuLai: false });
        }
        return { noiDung: phanHoi.body };
      }
    })
  });

  await assert.rejects(() => vong.chay(NGAY), (e) => e instanceof LoiNguon && e.ma === "HINH_DANG_SAI");
  assert.equal(may.demFetch(), 1, "phai dung o NGAY DAU, khong duoc dot ngan sach cho 4 ngay con lai");
  assert.equal(may.dia.size, 0, "khong duoc ghi mot file rac nao");
}

/* ---- ⑦ PHANH CHẶN → DỪNG NGAY, KHÔNG THỬ LẠI ---------------------------
 * Thử lại một cái phanh là vô nghĩa: nó chỉ mở khi CON NGƯỜI mở công tắc trong bảng bên. */
{
  for (const ma of ["DEV_MODE_OFF", "WRITE_CAP_REACHED", "GATE_CORRUPT"]) {
    const may = mayChuGia({
      chuaCoThuMuc: true,
      fetch: () => { const e = new Error("bi chan"); e.ma = ma; throw e; }
    });
    const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx", lanThuToiDa: 5 });
    await assert.rejects(() => vong.chay(NGAY), (e) => e.ma === "PHANH_CHAN", `${ma} phai dung ca luot`);
    assert.equal(may.demFetch(), 1, `${ma}: thu lai mot cai phanh la dot ngan sach vo ich`);
  }
}

/* ---- ⑧ NGÀY TRỐNG KHÔNG PHẢI NGÀY HỎNG ---------------------------------
 * Ngày nghỉ lễ thì trang trả lời ĐÚNG mà không có dữ liệu. Ghi ra một file rỗng là bịa; coi là
 * hỏng rồi thử lại mãi là đốt ngân sách cho một ngày không bao giờ có gì. */
{
  const may = mayChuGia({
    chuaCoThuMuc: true,
    fetch: () => ({ status: 200, ok: true, body: '{"rong":true}' })
  });
  const vong = createVongLay({
    goi: may.goi, thuMuc: "hnx", lanThuToiDa: 3,
    nguon: nguonGia({ kiemTra: () => ({ trong: true }) })
  });
  const ra = await vong.chay(["2026-09-02"]);
  assert.equal(ra.tom_tat.trong, 1);
  assert.equal(ra.tom_tat.hong, 0, "ngay nghi khong phai ngay hong");
  assert.equal(may.demFetch(), 1, "ngay trong khong duoc thu lai");
  assert.equal(may.dia.size, 0, "khong duoc ghi file rong");
}

/* ---- ⑨ THƯ MỤC CHƯA CÓ ≠ ĐỌC THƯ MỤC HỎNG ------------------------------
 * Lượt chạy đầu thì thư mục chưa tồn tại — bình thường, `file.write` tự tạo. Nhưng một lỗi
 * ĐỌC khác thì phải ném: không biết mình đã có gì mà vẫn chạy nghĩa là tải lại cả tuần. */
{
  const may = mayChuGia({ chuaCoThuMuc: true });
  const vong = createVongLay({ goi: may.goi, nguon: nguonGia(), thuMuc: "hnx" });
  assert.equal((await vong.daCoGi()).size, 0, "thu muc chua co thi coi nhu chua co gi");

  const hong = { goi: async (m) => { if (m === "file.list") { const e = new Error("o dia hong"); e.ma = "IO_ERROR"; throw e; } } };
  const vong2 = createVongLay({ goi: hong.goi, nguon: nguonGia(), thuMuc: "hnx" });
  await assert.rejects(() => vong2.chay(NGAY), (e) => e.ma === "IO_ERROR",
    "doc thu muc hong ma van chay la se tai lai ca tuan");
}

console.log("vong-lay smoke tests: PASS (10 khoi)");

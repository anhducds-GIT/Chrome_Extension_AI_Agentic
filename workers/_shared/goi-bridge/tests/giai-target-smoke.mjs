/* Phép ghim cho `giai-target.mjs` — bộ giải target theo danh tính (Gap 3).
 *
 * Việc nặng nhất bộ này canh KHÔNG phải "resolver tìm ra target". Nó canh **resolver TỪ CHỐI
 * đúng lúc**. Ba tài khoản Vizcom của Đức dùng cùng origin và cùng hình dạng URL; một bộ giải
 * chỉ lọc URL sẽ trả về một target nào đó và trông y hệt đang chạy đúng. Nên mỗi khối dưới đây
 * phải ĐỎ được dưới bản hỏng — một phép ghim xanh dưới cả bản đúng lẫn bản sai là màu xanh giả.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { taoGiaiTarget, MA } from "../giai-target.mjs";

const day = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "giai-target.mjs");

/* Xưởng dựng một Bridge giả. `ghe` là bản đồ nhãn → danh sách target; `chu` là bản đồ
 * target_id → chuỗi mà `scout.text` đọc ra (thiếu khoá = lệnh ném, tức target đọc không ra). */
function bridgeGia({ ghe = {}, chu = {}, a11y = {} } = {}) {
  const dem = { sessions: 0, targets: 0, text: 0, a11y: 0, gheDaHoi: [] };
  const nhanTheoThuTu = Object.keys(ghe);
  const iidCua = (nhan) => `iid-${nhanTheoThuTu.indexOf(nhan)}`;
  /* Bản đồ ĐỊA CHỈ THẬT: máy chủ Bridge nhận `instance_id`, không nhận nhãn. Bộ giả phải
   * ép đúng điều đó — một bộ giả dễ tính hơn máy chủ thật là một bộ giả nói dối, và nó đã
   * suýt để lọt đúng con bug 18/09 (ghế nhãn RỖNG thì gọi bằng nhãn ra chuỗi rỗng). */
  const theoIid = Object.fromEntries(nhanTheoThuTu.map((n) => [iidCua(n), ghe[n]]));
  const goi = async (method, params = {}, tuyChon = {}) => {
    if (method === "bridge.sessions") {
      dem.sessions += 1;
      return { count: nhanTheoThuTu.length,
        sessions: nhanTheoThuTu.map((nhan) => ({ label: nhan, instance_id: iidCua(nhan), connected_at: "2026-09-18T00:00:00.000Z" })) };
    }
    if (method === "scout.targets") {
      dem.targets += 1; dem.gheDaHoi.push(tuyChon.ghe);
      if (!tuyChon.ghe || !(tuyChon.ghe in theoIid)) {
        throw new Error("TARGET_AMBIGUOUS — More than one extension session is connected; name exactly one target.");
      }
      return { data: { targets: theoIid[tuyChon.ghe] } };
    }
    if (method === "scout.text") {
      dem.text += 1;
      if (!(params.target_id in chu)) throw new Error(`PROBE_FAILED — doc khong ra ${params.target_id}`);
      return { data: { text: chu[params.target_id] } };
    }
    if (method === "scout.a11y") {
      dem.a11y += 1;
      if (!(params.target_id in a11y)) throw new Error(`PROBE_FAILED — doc khong ra ${params.target_id}`);
      return { data: { nodes: a11y[params.target_id].map((name) => ({ role: "StaticText", name })) } };
    }
    throw new Error(`phep ghim khong day method ${method}`);
  };
  return { goi, dem };
}

const trang = (id, url, title = "") => ({ type: "page", targetId: id, url, title });
const VIZ = "https://app.vizcom.com/";
const DT = { selector: "title", chua: "anhducds" };

// ⓐ LÕI KHÔNG ĐƯỢC BIẾT MỘT TRANG NÀO CẢ
{
  const ma = fs.readFileSync(day, "utf8");
  /* Bóc chú thích trước rồi mới soi. Bản đầu của phép ghim này ĐỎ vì regex khớp vào chính câu
   * văn xuôi giải thích *"đừng gõ selector vào đây"* — đúng bài `detectors-match-your-own-prose`,
   * và nó đã cắn tôi một lần thật ngày 17/09. */
  const chiMa = ma.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const cam of ["vizcom", "udinbv", "chatgpt.com", "anhducds", "data-testid", "account-button"]) {
    assert.ok(!chiMa.toLowerCase().includes(cam),
      `lõi resolver đang gõ cứng "${cam}". Hiểu biết về một trang thuộc adapter — gõ vào đây là dựng lại đúng cái ranh giới nghiên cứu đi chứng minh phải giữ.`);
  }
  assert.ok(!/\bchrome\s*\./.test(chiMa) && !chiMa.includes("debugger"),
    "resolver chỉ được tiêu thụ scout.* — không chrome.*, không debugger.");
}

// ⓑ THIẾU `danh_tinh` LÀ ADAPTER VIẾT SAI ⇒ NÉM, không trả mã lỗi cho người ta bắt rồi bỏ qua
{
  const { goi } = bridgeGia({ ghe: { A: [] } });
  const r = taoGiaiTarget({ goi });
  await assert.rejects(() => r.giai({ origin: VIZ }), /danh_tinh/);
  await assert.rejects(() => r.giai({ origin: VIZ, danh_tinh: { selector: "title" } }), /danh_tinh/);
  await assert.rejects(() => r.giai({ danh_tinh: DT }), /origin/);
}

// ⓒ KHÔNG CÓ ỨNG VIÊN ⇒ TARGET_NOT_FOUND, và phải KỂ TÊN GHẾ ĐÃ HỎI.
//    Một câu "không thấy" không nêu người quan sát chính là thứ đã sinh ra G-100.
{
  const { goi } = bridgeGia({ ghe: { A: [trang("t1", "https://khac.example/")], B: [] } });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.TARGET_NOT_FOUND);
  assert.equal(r.da_hoi.length, 2, "phải kể ĐỦ ghế đã hỏi — thiếu một ghế là một câu 'không thấy' vô giá trị");
  assert.deepEqual(r.da_hoi.map((x) => x.ghe_nhan).sort(), ["A", "B"]);
  assert.deepEqual(r.da_hoi.map((x) => x.ghe).sort(), ["iid-0", "iid-1"], "`ghe` trong kết quả phải là ĐỊA CHỈ gọi được — người gọi ném thẳng nó vào lượt sau");
}

// ⓓ ĐÚNG URL, SAI TRANG ⇒ DANH_TINH_LECH, KHÔNG PHẢI UNIQUE.
//    Đây là khối phân biệt bản đúng với bản chỉ-lọc-URL: bản chỉ lọc URL sẽ trả ok:true ở đây.
{
  const { goi } = bridgeGia({ ghe: { A: [trang("t1", VIZ + "files/x")] }, chu: { t1: "Vizcom — tuanvv4" } });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.DANH_TINH_LECH);
  assert.equal(r.lech.length, 1);
  assert.match(r.lech[0].doc_duoc, /tuanvv4/, "phải trả lại chữ ĐỌC ĐƯỢC, để người đọc thấy nó là tài khoản nào");
}

// ⓔ HAI TÀI KHOẢN CÙNG ORIGIN, ĐÚNG MỘT CÁI THOẢ DANH TÍNH ⇒ UNIQUE, và đúng cái đó.
//    Đây là ca thật của Đức: 3 Vizcom, cùng URL shape, chỉ trang tự khai nó là ai.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "files/a"), trang("t2", VIZ + "files/b")] },
    chu: { t1: "Vizcom — tuanvv4", t2: "Vizcom — anhducds" }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, true);
  assert.equal(r.target_id, "t2", "chọn theo DANH TÍNH, không theo thứ tự xuất hiện");
  assert.equal(r.ung_vien, 2, "phải khai là đã xét 2 ứng viên — giấu con số này là giấu mất ca suýt nhầm");
  assert.equal(r.lech.length, 1);
}

// ⓕ HAI ỨNG VIÊN CÙNG THOẢ ⇒ TARGET_AMBIGUOUS. Máy KHÔNG chọn hộ.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "a"), trang("t2", VIZ + "b")] },
    chu: { t1: "Vizcom — anhducds", t2: "Vizcom — anhducds (cua so 2)" }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.TARGET_AMBIGUOUS);
  assert.equal(r.trung.length, 2, "phải kể ĐỦ hai cái trùng để người chọn được");
}

// ⓖ ỨNG VIÊN ĐỌC KHÔNG RA PHẢI ĐƯỢC KỂ, KHÔNG ĐƯỢC GIẤU.
//    Giấu nó là cách một ca ambiguous hoá trang thành một UNIQUE giả.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "a"), trang("tX", VIZ + "b")] },
    chu: { t1: "Vizcom — anhducds" }   // tX cố ý không có ⇒ scout.text ném
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, true, "một ứng viên chết không được chặn một danh tính đã chứng minh dương tính");
  assert.equal(r.khong_doc_duoc.length, 1, "nhưng nó PHẢI xuất hiện trong báo cáo");
  assert.equal(r.khong_doc_duoc[0].target_id, "tX");
}

// ⓗ LƯỢC ĐỒ NỘI BỘ CỦA TRÌNH DUYỆT KHÔNG BAO GIỜ LÀ TARGET CỦA MỘT TRANG WEB
{
  const { goi, dem } = bridgeGia({
    ghe: { A: [trang("p1", "chrome-extension://abc/sidepanel.html"), trang("p2", "chrome://extensions/")] },
    chu: {}
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: "chrome", danh_tinh: DT });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.TARGET_NOT_FOUND);
  assert.equal(dem.text, 0, "không được tốn một lượt đọc nào cho lược đồ nội bộ");
}

// ⓘ KHÔNG FIRST-MATCH: không khai ghế thì phải hỏi HẾT ghế trước khi kết luận
{
  const { goi, dem } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "a")], B: [trang("t2", VIZ + "b")], C: [] },
    chu: { t1: "Vizcom — tuanvv4", t2: "Vizcom — anhducds" }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT });
  assert.equal(r.ok, true);
  assert.equal(r.ghe, "iid-1", "ứng viên đúng nằm ở ghế THỨ HAI — dừng ở ghế đầu là trả nhầm tài khoản");
  assert.equal(dem.targets, 3, "phải quét cả ba ghế; dừng sớm là first-match đội lốt vòng lặp");
  assert.deepEqual(dem.gheDaHoi.sort(), ["iid-0", "iid-1", "iid-2"], "phải gọi bằng instance_id — nhãn là thứ để người đọc, không phải địa chỉ");
}

// ⓙ KHAI MỘT GHẾ KHÔNG NỐI ⇒ GHE_CHUA_KHAI, không lặng lẽ rơi về ghế khác
{
  const { goi, dem } = bridgeGia({ ghe: { A: [trang("t1", VIZ + "a")] }, chu: { t1: "Vizcom — anhducds" } });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: DT, ghe: "Ghe_Khong_Ton_Tai" });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.GHE_CHUA_KHAI);
  assert.equal(dem.targets, 0, "khai sai ghế thì đừng quét ghế nào cả — quét là đã rơi về ghế khác");
}

// ⓚ SỔ GHẾ: khai `tai_khoan` mà sổ không có ghế nào mang tài khoản đó ⇒ TỪ CHỐI, không đoán
{
  const { goi, dem } = bridgeGia({ ghe: { A: [trang("t1", VIZ + "a")] }, chu: { t1: "Vizcom — anhducds" } });
  const soGhe = { "iid-0": { tai_khoan: "nguoi-khac" } };
  const r = await taoGiaiTarget({ goi, soGhe }).giai({ origin: VIZ, danh_tinh: DT, tai_khoan: "anhducds" });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.GHE_CHUA_KHAI);
  assert.equal(dem.targets, 0);
}

// ⓛ DANH TÍNH QUA a11y — ca THẬT của Vizcom: hai tài khoản, cùng origin, cùng hình dạng URL,
//    dấu hiệu duy nhất là một chuỗi email nằm trong `StaticText` mà `scout.page` không với tới.
{
  const { goi, dem } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "files/aaa/recent", "Vizcom")], B: [trang("t2", VIZ + "files/bbb/recent", "Vizcom")] },
    a11y: {
      t1: ["Vizcom", "Vinfast Vinfast Enterprise plan", "tuanvv4"],
      t2: ["Vizcom", "Đ Đức Nguyễn's Workspace Free plan", "anhducds@gmail.com"]
    }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(r.ok, true);
  assert.equal(r.target_id, "t2", "phải chọn theo email trong cây trợ năng, không theo ghế nào trả lời trước");
  assert.equal(r.ghe, "iid-1"); assert.equal(r.ghe_nhan, "B");
  assert.equal(dem.text, 0, "đường a11y thì đừng gọi scout.text — hai đường đọc là hai đường, đừng gọi cả hai");
  assert.match(r.doc_duoc, /anhducds@gmail\.com/, "phải trả lại đúng chuỗi đã khớp làm bằng chứng");
  assert.equal(r.lech.length, 1, "tài khoản kia phải được KỂ là đã xét và bị loại — đó là bằng chứng nó không bị đụng");
  assert.match(r.lech[0].doc_duoc, /không cái nào chứa dấu hiệu/, "ứng viên bị loại phải nói ra vì sao bị loại");
}

// ⓜ DẤU HIỆU KHÔNG CÓ Ở ĐÂU CẢ ⇒ TỪ CHỐI, dù chỉ có MỘT ứng viên.
//    Đây là khối chặn kiểu hỏng nguy hiểm nhất: chỉ còn một cửa sổ Vizcom mở, và nó là
//    tài khoản KHÁC. Một resolver "chỉ có một thì chắc là nó" sẽ thao tác nhầm người.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "files/aaa/recent", "Vizcom")] },
    a11y: { t1: ["Vizcom", "Vinfast Vinfast Enterprise plan", "tuanvv4"] }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(r.ok, false);
  assert.equal(r.ma, MA.DANH_TINH_LECH);
}

// ⓝ GHẾ CHƯA ĐẶT TÊN VẪN PHẢI GỌI TỚI ĐƯỢC.
//    Đo 18/09: Đức cài Scouter lên hai profile mới, cả hai lên dây với nhãn RỖNG, và bản đầu
//    của resolver gọi bằng nhãn → `target` thành chuỗi rỗng → máy chủ trả TARGET_AMBIGUOUS.
//    Tức toàn bộ pilot Vizcom chết ở chặng ②. Khối này là cái lưới cho đúng ca đó.
{
  const { goi, dem } = bridgeGia({
    ghe: { "": [trang("t1", VIZ + "files/aaa/recent", "Vizcom")] },
    a11y: { t1: ["Vizcom", "anhducds@gmail.com"] }
  });
  const r = await taoGiaiTarget({ goi }).giai({ origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(r.ok, true, "một ghế chưa đặt tên KHÔNG được là một ghế không gọi tới được");
  assert.equal(r.target_id, "t1");
  assert.deepEqual(dem.gheDaHoi, ["iid-0"], "phải gọi bằng instance_id, không bằng chuỗi rỗng");
  assert.equal(r.da_hoi[0].ghe_nhan, "(không nhãn)", "báo cáo phải NÓI RA là ghế chưa có tên, đừng in một ô trống");
  assert.equal(r.ghe, "iid-0", "và `ghe` vẫn phải là địa chỉ gọi được, kể cả khi ghế không có tên");
}

console.log("giai-target-smoke: 14 khối ĐẠT");

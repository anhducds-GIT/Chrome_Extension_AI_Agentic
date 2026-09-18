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
import { taoGiaiTarget, taiKhoanTuNhan, MA } from "../giai-target.mjs";

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

// ⓞ DANH TÍNH PHỤ KHÔNG ĐƯỢC QUYẾT ĐỊNH GÌ CẢ.
//    Hai ứng viên khai **cùng một chuỗi phụ** và khác nhau ở chuỗi chính. Bản đúng chọn theo
//    chính ⇒ UNIQUE. Ai đảo hai trường (lấy phụ làm cổng chính) thì hai ứng viên cùng thoả
//    ⇒ TARGET_AMBIGUOUS, và khối này ĐỎ. Đó là toàn bộ lý do nó tồn tại.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "a"), trang("t2", VIZ + "b")] },
    a11y: { t1: ["nguoi-khac@gmail.com"], t2: ["anhducds@gmail.com"] },
    chu: { t1: "Đức Nguyễn's Workspace Free plan", t2: "Đức Nguyễn's Workspace Free plan" }
  });
  const r = await taoGiaiTarget({ goi }).giai({
    origin: VIZ,
    danh_tinh: { a11y_chua: "anhducds@gmail.com" },
    danh_tinh_phu: { selector: "[data-testid=org]", chua: "Đức Nguyễn's Workspace" }
  });
  assert.equal(r.ok, true, "chuỗi phụ trùng nhau KHÔNG được làm nhập nhằng một danh tính chính đã duy nhất");
  assert.equal(r.target_id, "t2");
  assert.equal(r.phu.khop, true, "phụ vẫn phải được ĐỌC và IN — nó là bằng chứng cho người, chỉ không phải phiếu bầu");
}

// ⓞ′ PHỤ LỆCH THÌ IN RA, KHÔNG CHẶN. Đức chốt phụ là supplementary — cho nó quyền chặn là
//     lặng lẽ nâng nó lại thành cổng chính.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "a")] },
    a11y: { t1: ["anhducds@gmail.com"] },
    chu: { t1: "Workspace nao do khac" }
  });
  const r = await taoGiaiTarget({ goi }).giai({
    origin: VIZ,
    danh_tinh: { a11y_chua: "anhducds@gmail.com" },
    danh_tinh_phu: { selector: "[data-testid=org]", chua: "Đức Nguyễn's Workspace" }
  });
  assert.equal(r.ok, true, "phụ lệch KHÔNG được chặn — nó không có quyền đó");
  assert.equal(r.phu.khop, false);
  assert.match(r.phu.doc_duoc, /khac/, "và phải in ra chữ đọc được để người tự thấy chỗ lệch");
}

// ⓟ KHOÁ ĐẠT: target còn, đúng origin, danh tính còn đọc ra ⇒ ok, kèm bằng chứng
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "files/aaa/recent")] },
    a11y: { t1: ["Vizcom", "anhducds@gmail.com"] }
  });
  const R = taoGiaiTarget({ goi });
  const k = await R.khoaDanhTinh({ ghe: "iid-0", target_id: "t1", origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(k.ok, true);
  assert.match(k.bang_chung, /anhducds@gmail\.com/, "một lượt khoá không in bằng chứng thì không kiểm lại được");
  assert.equal(k.url, VIZ + "files/aaa/recent");
}

// ⓠ TARGET BIẾN MẤT ⇒ TARGET_BIEN_MAT, và KHÔNG tốn một lượt đọc danh tính nào.
//    Đọc danh tính trên một id đã chết chỉ sinh ra một thông báo lỗi khó hiểu hơn.
{
  const { goi, dem } = bridgeGia({ ghe: { A: [trang("t1", VIZ + "a")] }, a11y: {} });
  const k = await taoGiaiTarget({ goi }).khoaDanhTinh({ ghe: "iid-0", target_id: "da-dong", origin: VIZ, danh_tinh: { a11y_chua: "x@y.z" } });
  assert.equal(k.ok, false);
  assert.equal(k.ma, MA.TARGET_BIEN_MAT);
  assert.equal(dem.a11y, 0);
}

// ⓡ CÙNG MỘT id, ĐÃ RỜI ORIGIN ⇒ TARGET_BIEN_MAT kèm URL mới.
//    `G-102`: target_id sống qua điều hướng SPA. Một bộ khoá chỉ kiểm "id còn không" sẽ cho qua.
{
  const { goi } = bridgeGia({ ghe: { A: [trang("t1", "https://accounts.google.com/signin")] }, a11y: { t1: ["anhducds@gmail.com"] } });
  const k = await taoGiaiTarget({ goi }).khoaDanhTinh({ ghe: "iid-0", target_id: "t1", origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(k.ok, false);
  assert.equal(k.ma, MA.TARGET_BIEN_MAT);
  assert.match(k.url, /accounts\.google\.com/, "phải nói ra nó đã đi đâu");
}

// ⓢ ĐÚNG id, ĐÚNG origin, NHƯNG ĐÃ SANG TÀI KHOẢN KHÁC ⇒ DANH_TINH_MAT.
//    Đây là ca đắt nhất cả chặng ③: URL vẫn app.vizcom.com, id vẫn thế, người đã khác.
{
  const { goi } = bridgeGia({
    ghe: { A: [trang("t1", VIZ + "files/bbb/recent")] },
    a11y: { t1: ["Vizcom", "Vinfast Enterprise plan", "v.tuanvv4@vinfast.vn"] }
  });
  const k = await taoGiaiTarget({ goi }).khoaDanhTinh({ ghe: "iid-0", target_id: "t1", origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(k.ok, false);
  assert.equal(k.ma, MA.DANH_TINH_MAT);
}

// ⓣ ĐỌC KHÔNG RA CŨNG LÀ TRƯỢT. "Không đọc được" KHÔNG phải "chắc vẫn đúng" — một bộ khoá
//    hiểu nhầm hai câu đó sẽ mở đúng vào lúc trang đang ở trạng thái nó không hiểu.
{
  const { goi } = bridgeGia({ ghe: { A: [trang("t1", VIZ + "a")] }, a11y: {} });
  const k = await taoGiaiTarget({ goi }).khoaDanhTinh({ ghe: "iid-0", target_id: "t1", origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" } });
  assert.equal(k.ok, false);
  assert.equal(k.ma, MA.DANH_TINH_MAT);
  assert.match(k.ly_do, /Không đọc được KHÔNG phải là vẫn đúng/);
}

// ⓤ BẤT BIẾN: KHÔNG PILOT NÀO ĐƯỢC GÕ CỨNG MỘT `target_id`.
//    Đo 18/09, hai lần trong một buổi: máy chủ Bridge tắt rồi bật lại → ghế tự nối lại, nhưng
//    **mọi `target_id` cũ đều chết** (`PROBE_FAILED — No Chrome debug target with id …`). Một
//    id gõ cứng vì thế có hai số phận, và số phận thứ hai mới là cái đáng sợ: hoặc nó chết
//    sạch, hoặc Chrome đã cấp lại đúng chuỗi đó cho một tab KHÁC. Đường đúng chỉ có một:
//    giải lại từ adapter + danh tính tài khoản, mỗi lượt chạy.
//
//    Khối này quét mã THẬT của các pilot, không tin một dòng luật viết trong tài liệu — một
//    bất biến không có máy canh là một bất biến đã hỏng mà chưa ai biết.
{
  const goc = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "duc-scouter", "pilots");
  const quet = (thuMuc) => fs.readdirSync(thuMuc, { withFileTypes: true }).flatMap((d) =>
    d.isDirectory() ? quet(path.join(thuMuc, d.name)) : d.name.endsWith(".mjs") ? [path.join(thuMuc, d.name)] : []);
  const tep = quet(goc);
  /* Bộ quét trả RỖNG thì ĐỎ: "0 tệp, 0 vi phạm" đọc y hệt "đã kiểm, sạch". */
  assert.ok(tep.length >= 3, `chỉ thấy ${tep.length} tệp pilot — bộ quét hỏng, KHÔNG phải pilot sạch`);
  for (const t of tep) {
    /* Bóc chú thích trước: chính các file này CHÉP một `target_id` thật vào văn xuôi làm bằng
     * chứng, và đó là việc nên làm. Luật cấm GÕ NÓ VÀO MÃ, không cấm kể lại nó. */
    const ma = fs.readFileSync(t, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const dinh = ma.match(/["'][0-9A-F]{32}["']/g) || [];
    assert.deepEqual(dinh, [],
      `${path.basename(t)} gõ cứng target_id ${dinh.join(", ")}. Sau một lượt nối lại Bridge, id đó hoặc đã chết hoặc đã thuộc về một tab khác — giải lại qua adapter + danh tính, mỗi lượt chạy.`);
  }
}

// ⓟ TÀI KHOẢN SUY TỪ NHÃN GHẾ — hàm thuần: nhận đúng quy ước, TỪ CHỐI mọi cách sai
{
  const n = (nhan, site) => taiKhoanTuNhan(nhan, site);

  /* Quy ước Đức chốt 18/09: `"<site> <tài-khoản>"`, đúng HAI phần. Bốn ca nhận, đo trên đúng
     những nhãn thật Đức vừa gõ. */
  assert.equal(n("Vizcom Anhducds", "vizcom"), "anhducds");
  assert.equal(n("Vizcom Ducna10", "vizcom"), "ducna10");
  assert.equal(n("vizcom ANHDUCDS", "Vizcom"), "anhducds", "hoa thuong khong duoc tinh");
  assert.equal(n("  Vizcom   Ducna10  ", "vizcom"), "ducna10", "khoang trang thua khong duoc tinh");

  /* BẢY CÁCH SAI, và cả bảy phải trả `null` chứ không đoán. Một nhãn gõ nhầm phải im lặng
     KHÔNG khớp ghế nào rồi để chặng sau kêu — khác hẳn khớp nhầm, thứ dẫn thẳng tới ghi vào
     sai tài khoản. */
  assert.equal(n("Scouter_blank", "vizcom"), null, "site khong khop thi khong phai ghe cua site nay");
  assert.equal(n("", "vizcom"), null, "nhan rong — ghe chua dat ten");
  assert.equal(n("Vizcom", "vizcom"), null, "mot phan: khong co ten tai khoan");
  assert.equal(n("Vizcom Anh Duc", "vizcom"), null,
    "BA phan: doan bua phan nao la ten thi co ngay doan trung mot tai khoan KHAC dang mo canh do");
  assert.equal(n("Udin Anhducds", "vizcom"), null, "nhan cua site khac khong duoc nhan vao day");
  assert.equal(n(null, "vizcom"), null);
  assert.equal(n("Vizcom Anhducds", ""), null, "khong khai site thi khong suy duoc gi");
}

// ⓠ NHÃN THU HẸP ĐƯỢC GHẾ — trước 18/09 trường `tai_khoan` của adapter là một trường CHẾT
{
  const { goi, dem } = bridgeGia({
    ghe: {
      "Vizcom Anhducds": [trang("T1", `${VIZ}files/a/recent`)],
      "Vizcom Ducna10": [trang("T2", `${VIZ}files/b/recent`)]
    },
    a11y: { T1: ["anhducds@gmail.com"], T2: ["ducna10@gmail.com"] }
  });
  const R = taoGiaiTarget({ goi, site: "vizcom" });

  const g = await R.lietKeGhe();
  assert.deepEqual(g.map((x) => x.tai_khoan), ["anhducds", "ducna10"],
    "lietKeGhe phai suy tai khoan tu nhan — khong thi truong `tai_khoan` cua adapter khong chon duoc ghe nao");
  assert.deepEqual(g.map((x) => x.nguon_tai_khoan), ["nhan", "nhan"],
    "va phai NOI RA cai ten do den tu dau: nhan va so ghe KHONG cung do tin");

  const r = await R.giai({ origin: VIZ, danh_tinh: { a11y_chua: "ducna10@gmail.com" }, tai_khoan: "ducna10" });
  assert.equal(r.ok, true, `thu hep theo nhan phai di duoc: ${r.ma ?? ""} ${r.ly_do ?? ""}`);
  assert.equal(r.target_id, "T2");
  assert.equal(r.ung_vien, 1, "chi HOI dung mot ghe — do la toan bo cong dung cua nhan");
  assert.equal(dem.gheDaHoi.length, 1, "va that su chi goi scout.targets MOT lan, khong hoi ca hai roi loc sau");
}

// ⓡ HAI NGUỒN TÀI KHOẢN: sổ ghế THẮNG nhãn, và nguồn được nêu tên
{
  const { goi } = bridgeGia({ ghe: { "Vizcom Ducna10": [] } });
  const R = taoGiaiTarget({ goi, site: "vizcom", soGhe: { "iid-0": { tai_khoan: "anhducds" } } });
  const g = await R.lietKeGhe();
  assert.equal(g[0].tai_khoan, "anhducds",
    "so ghe la thu nguoi ta ngoi xuong dien co chu dich; nhan la thu go nhanh va de de nguyen tu profile truoc");
  assert.equal(g[0].nguon_tai_khoan, "so-ghe");
}

// ⓢ ⚠ VẾ CHỊU LỰC — NHÃN CHỌN GHẾ, TRANG QUYẾT. Nhãn KHÔNG được thay `danh_tinh`.
{
  /* Ca này là hình dạng của một tai nạn thật: Đức đăng xuất rồi đăng nhập tài khoản KIA trong
   * cùng profile, còn nhãn ghế thì ở nguyên. Nhãn nói `Anhducds`, trang khai `ducna10`.
   *
   * Vế này ĐỎ nghĩa là nhãn vừa lặng lẽ ghi đè lên lời khai của trang — và mọi lượt ghi sau đó
   * đi vào SAI TÀI KHOẢN mà không cổng nào còn gì để kêu. Đây là lý do `taiKhoanTuNhan` được
   * phép tồn tại: vì chặng dưới nó vẫn chặn. Gỡ vế này là gỡ điều kiện ấy. */
  const { goi } = bridgeGia({
    ghe: { "Vizcom Anhducds": [trang("T1", `${VIZ}files/a/recent`)] },
    a11y: { T1: ["ducna10@gmail.com"] }
  });
  const R = taoGiaiTarget({ goi, site: "vizcom" });
  const r = await R.giai({ origin: VIZ, danh_tinh: { a11y_chua: "anhducds@gmail.com" }, tai_khoan: "anhducds" });
  assert.equal(r.ok, false, "nhan DUNG ma trang khai KHAC thi PHAI tu choi — nhan khong co quyen quyet");
  assert.equal(r.ma, MA.DANH_TINH_LECH, "va tu choi bang dung ma danh tinh, khong phai mot ma ve ghe");
}

console.log("giai-target-smoke: 25 khối ĐẠT");

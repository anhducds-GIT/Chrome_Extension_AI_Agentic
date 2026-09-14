#!/usr/bin/env node
/* kiem-cai-dat.mjs — **BẢN CÀI CỦA BẠN có chạy không.** Chạy sau khi làm xong mục "Cài và chạy".
 *
 * Khác hẳn `scouter:bridge-live`: file đó dựng một máy chủ Bridge RIÊNG trên cổng trống để đo
 * dây và từ vựng. Nó trả lời *"mã có đúng không"*. File này không dựng gì cả — nó gõ cửa đúng
 * cái Bridge bạn đang chạy, đúng tệp ghép cặp bạn đã chọn, đúng extension bạn đã nạp. Nó trả
 * lời *"bản cài của BẠN có chạy không"*, và đó là câu người mới cần.
 *
 * Sáu bước, dừng ở bước đầu tiên hỏng — vì bước sau không có nghĩa gì khi bước trước đã gãy.
 * Mỗi bước hỏng phải nói được **làm gì tiếp**, không chỉ nói *hỏng*.
 *
 * KHÔNG BAO GIỜ in token. Tệp ghép cặp nằm ngoài repo và repo này PUBLIC.
 *
 *   node workers/duc-scouter/v0.1.0/scripts/kiem-cai-dat.mjs [--khong-thu-ghi]
 *
 * Mã thoát: 0 ĐẠT · 1 CÓ BƯỚC HỎNG · 2 KHÔNG CHẠY ĐƯỢC (khác hẳn "hỏng" — đừng ghi nhầm).
 */
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

/* Trần ghi là 200 lượt mỗi lần mở khoá, nên bước ⑥ tiêu ĐÚNG MỘT lượt và nói ra là nó tiêu. */
const GIA_THU_GHI = 1;

export async function kiem(goi, tuyChon = {}) {
  const buoc = [];
  const them = (ten, dat, noi, lamGi) => { buoc.push({ ten, dat, noi, lamGi }); return dat; };

  /* ① Máy chủ Bridge có trả lời không.
   *
   * Dùng `bridge.sessions`, KHÔNG dùng `system.ping`. Bản đầu dùng ping, và lượt chạy thật đầu
   * tiên trả `TARGET_AMBIGUOUS` ngay ở bước một: `system.ping` **đi tới extension** chứ không
   * kết thúc ở máy chủ, nên nó không tách được *"Bridge chưa chạy"* khỏi *"có hai ghế"* — đúng
   * cái việc mà bước một sinh ra để làm. `bridge.sessions` thì máy chủ tự trả lời. */
  let phien;
  try { phien = await goi("bridge.sessions"); }
  catch (e) {
    them("① Máy chủ Bridge trả lời", false, String(e.message),
      "Bridge chưa chạy, hoặc tệp ghép cặp trỏ sai cổng. Bật máy chủ Bridge rồi chạy lại. " +
      "Tệp ghép cặp ở ngoài repo; đổi đường dẫn bằng biến môi trường SCOUTER_GHEP.");
    return { dat: false, buoc };
  }
  const ghe = (phien.sessions || []).slice().sort((a, b) => String(b.connected_at).localeCompare(String(a.connected_at)));
  them("① Máy chủ Bridge trả lời", true, `${ghe.length} ghế đang nối`, null);

  /* ② Có ghế Scouter nào nối vào không, và ghế ấy có trả lời không. Không có ghế thì mọi lệnh
   *    chạm trang đều vô nghĩa — nên dừng ở đây, đừng chạy tiếp cho có. */
  if (ghe.length === 0) {
    them("② Extension đã nối và trả lời", false, "không ghế nào",
      "Nạp thư mục v0.1.0 vào chrome://extensions (Load unpacked), mở bảng bên, mục Cửa Bridge, " +
      "chọn tệp ghép cặp. Dòng trạng thái phải đổi thành 'Đã nối Bridge.'");
    return { dat: false, buoc };
  }

  /* Ghế NỐI GẦN NHẤT, không phải ghế đầu danh sách: một lượt nạp lại sinh ra ghế mới trong khi
   * ghế cũ còn đập nhịp thêm một lúc, và chọn nhầm thì mọi bước sau đo phải bản cũ. */
  const dich = ghe[0].instance_id;
  const nhieuGhe = ghe.length > 1;

  let ping = null;
  try { ping = await goi("system.ping", {}, { ghe: dich }); }
  catch (e) {
    them("② Extension đã nối và trả lời", false, String(e.message),
      "Ghế có trong danh sách nhưng không đáp. Thường là service worker đã ngủ và chưa tỉnh lại — " +
      "mở bảng bên một lượt rồi chạy lại.");
    return { dat: false, buoc };
  }
  them("② Extension đã nối và trả lời", true,
    `${ghe[0].label || "(chưa đặt tên)"} ${dich.slice(0, 8)} v${ghe[0].extension_version} · seed ${ping.seed || "?"}`, null);

  /* ③ Từ vựng. Con số này là hợp đồng: thêm một method là đổi luật an toàn (luật gói số 4), nên
   *    lệch số nghĩa là bản đã nạp KHÔNG phải bản trong thư mục này. */
  const kn = await goi("system.capabilities", {}, { ghe: dich });
  const ms = kn.methods || [];
  const ghiDuoc = ms.filter((x) => x.read_only === false).length;
  const dungSo = ms.length === (tuyChon.soMethod ?? 24);
  them("③ Từ vựng đủ", dungSo, `${ms.length} method · ${ghiDuoc} ghi · ${ms.length - ghiDuoc} đọc`,
    dungSo ? null : `Chờ ${tuyChon.soMethod ?? 24} method mà thấy ${ms.length} — Chrome đang chạy một bản KHÁC bản trong thư mục này. Vào chrome://extensions bấm nạp lại đúng extension đó.`);

  /* ④ Ghế có thấy tab nào không. Không có tab http(s) thì Scouter chẳng có gì để dò — đây là
   *    ca người mới hay gặp nhất sau khi cài: mọi thứ xanh mà không làm được gì. */
  const tg = (await goi("scout.targets", {}, { ghe: dich })).data.targets || [];
  const web = tg.filter((t) => t.type === "page" && /^https?:/.test(t.url));
  them("④ Nhìn thấy tab", web.length > 0, `${web.length} tab http(s) trong ${tg.length} target`,
    web.length > 0 ? null : "Mở một tab http hoặc https trong CHÍNH cửa sổ Chrome đã nạp extension. Trang `file:` và `chrome://` không dò được, cố ý.");

  /* ⑤ Đọc thật một trang. Ba bước trên mới chứng minh dây thông; bước này chứng minh phép dò
   *    chạy được — tức `chrome.debugger` gắn được và Chrome không từ chối. */
  let docDuoc = false, noiDoc = "chưa thử";
  if (web.length > 0) {
    try {
      const d = (await goi("scout.query", { target_id: web[0].targetId, selector: "body", limit: 1 }, { ghe: dich })).data;
      docDuoc = d.matchCount === 1;
      noiDoc = `body khớp ${d.matchCount}`;
    } catch (e) { noiDoc = String(e.message); }
  }
  them("⑤ Đọc được trang", docDuoc, noiDoc,
    docDuoc ? null : "Phép dò không gắn được vào tab. Thường là đã có một DevTools đang mở trên chính tab đó — đóng nó rồi thử lại.");

  /* ⑥ Công tắc ghi. ĐÓNG KHÔNG PHẢI HỎNG — nó là mặc định, và là một lớp bảo vệ. Nên bước này
   *    luôn ĐẠT; nó chỉ **nói ra** công tắc đang ở đâu, để người mới thôi tưởng mình cài sai. */
  let cong = "chưa thử (--khong-thu-ghi)";
  if (!tuyChon.khongThuGhi && docDuoc) {
    try {
      await goi("scout.hover", { target_id: web[0].targetId, selector: "body" }, { ghe: dich });
      cong = `ĐANG MỞ — lượt thử này vừa tiêu ${GIA_THU_GHI}/200 lượt của lần mở khoá hiện tại`;
    } catch (e) {
      cong = /WRITE_BLOCKED|PHANH|gate/i.test(e.message)
        ? "ĐANG ĐÓNG — đúng mặc định. Muốn Scouter bấm/gõ thì bật công tắc trong bảng bên."
        : `không rõ: ${e.message}`;
    }
  }
  them("⑥ Công tắc ghi", true, cong, null);

  if (nhieuGhe) {
    buoc.push({ ten: "⚠ Nhiều ghế", dat: true, noi: `${ghe.length} ghế đang nối`,
      lamGi: "Mọi bước trên đo ghế NỐI GẦN NHẤT. Ghế khác có thể ở trạng thái khác — dán đích bằng SCOUTER_GHE=<instance_id>." });
  }
  return { dat: buoc.every((b) => b.dat), buoc, ghe: dich };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const { goi } = await import("../../pilots/trang-thu-cham/scripts/goi-bridge.mjs");
  let ket;
  try {
    ket = await kiem(goi, { khongThuGhi: process.argv.includes("--khong-thu-ghi") });
  } catch (e) {
    /* KHÔNG CHẠY ĐƯỢC khác hẳn KHÔNG ĐẠT: gộp hai cái lại là ghi sai vào sổ. */
    console.error(`KHÔNG CHẠY ĐƯỢC: ${e.message}`);
    process.exit(2);
  }
  for (const b of ket.buoc) {
    console.log(`${b.dat ? "[ĐẠT ]" : "[HỎNG]"} ${b.ten}: ${b.noi}`);
    if (b.lamGi) console.log(`        → ${b.lamGi}`);
  }
  console.log(ket.dat ? "\nBẢN CÀI CHẠY ĐƯỢC." : "\nCÓ BƯỚC HỎNG — làm theo dòng mũi tên rồi chạy lại.");
  process.exit(ket.dat ? 0 : 1);
}

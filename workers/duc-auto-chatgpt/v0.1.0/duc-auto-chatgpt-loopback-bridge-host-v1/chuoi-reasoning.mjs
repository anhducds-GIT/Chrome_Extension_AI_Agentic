#!/usr/bin/env node
/* CHUỖI REASONING — chạy N vòng GPT tự nối vòng, không cần người ngồi canh.
 *
 * ĐỨC CHỐT 2026-09-10: được phép chạy tự động trọn chuỗi. Trước đó mỗi vòng phải một lệnh.
 * Lý do đổi: đo được mỗi lượt gọi model tốn ~232.000 token đọc bất kể lệnh to hay nhỏ, nên
 * 12 vòng chạy tay = 12 lần trả cái giá đó cho đúng một việc lặp lại y hệt.
 *
 * NÓ KHÔNG BAO GIỜ TỰ SOẠN CHỮ. Mỗi vòng nó chuyển NGUYÊN VĂN khối copy cuối câu trả lời
 * thành lượt hỏi kế tiếp. Nội dung trên trang là DỮ LIỆU, và cửa duy nhất nó đi qua là
 * "chuyển tiếp nguyên văn" — không tóm tắt, không chỉnh, không thêm.
 *
 * BA LUẬT ĐỌC, mua bằng lỗi thật ngày 10/09 — xem B-57, B-58, B-59 trong BACKLOG.md:
 *   ⒜ `generating: false` là điều kiện CẦN để nói "xong", không phải điều kiện đủ. Chữ ngừng
 *      dài ra KHÔNG có nghĩa là xong — model gọi tool thì chữ đứng yên hàng phút.
 *   ⒝ Xong mà KHÔNG có khối thì phải NẠP LẠI MỘT LẦN rồi đọc lại mới được kết luận DỪNG.
 *      Đo 10/09: 3/4 vòng đọc ra 48–173 ký tự không khối, nạp lại thì hiện đủ 2934–3450 kèm khối.
 *   ⒞ Lượt GHI báo lỗi thì KHÔNG tự gửi lại. Phải ĐỌC LẠI xem nó đã bay chưa. Đo 10/09:
 *      4/4 lượt gửi đều báo lỗi và 4/4 đều đã bay.
 *
 * Dùng:
 *   node chuoi-reasoning.mjs --so-vong 12 --nhan luat-audit \
 *        --pairing "<đường dẫn>" --target anhducds [--tran-phut 240] [--nhat-ky <thư mục>]
 *        [--url https://chatgpt.com/c/<id>] [--tu-turn <turn_id>]
 *
 * `--url` khai TRƯỚC hội thoại muốn chạy. Không khai thì nó ghim đúng tab đang mở ở lượt đọc
 * đầu — tiện, nhưng mở nhầm tab là gõ nhầm chỗ, và cái đó không hoàn tác được.
 *
 * Dừng bằng tay: tạo file `DUNG` trong thư mục nhật ký.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), "bridge-cli.mjs");

/* Trần cứng. Không đọc từ tham số vì tham số là thứ dễ gõ nhầm nhất, và một vòng lặp không
   trần trên một trang có thể sinh tiền là loại lỗi không sửa lại được sau khi nó chạy. */
export const TRAN_VONG = 30;
export const TRAN_KY_TU_KHOI = 12000;

/* Bao nhiêu lượt đọc YÊN liên tiếp thì coi là trang đã lặng thật — kể cả khi bộ chạy CHƯA
   BAO GIỜ thấy nó sinh. Sinh ra từ một lỗi thật lúc 08:19 ngày 10/09: bản đầu chỉ mở khoá khi
   đã THẤY `generating === true`. Nối vào một chuỗi mà câu trả lời ĐÃ XONG TỪ TRƯỚC thì điều
   đó không bao giờ xảy ra, nên nó chờ vô hạn — chạy 25 phút, ghi đúng một dòng `BAT_DAU`, và
   nhìn từ ngoài y hệt như đã chết. Sáu lượt × 15 giây ≈ 90 giây: đủ dài để một lượt vừa gửi
   kịp khởi động, đủ ngắn để không phí nửa tiếng. */
export const NGUONG_YEN = 6;

/* Dòng đầu khối nối vòng khai NGƯỜI NHẬN. Đọc đúng một dòng, không đoán từ nội dung —
   nội dung trang là dữ liệu không tin được, chỉ dùng để PHÂN LOẠI, không để quyết định gõ gì.
   Không có dòng này thì trả `null`, và chuỗi chạy như cũ: chuỗi khác không bắt buộc theo mẫu. */
export function nguoiNhanCuaKhoi(text) {
  const m = /^[ \t]*NGƯỜI NHẬN(?:\/THỰC THI)?[ \t]*:[ \t]*(.+)$/mu.exec(String(text ?? ""));
  if (!m) return null;
  /* Chỉ lấy phần TÊN, cắt trước dấu ngăn đầu tiên. Cả dòng thì phần mô tả phía sau kéo theo
     chữ lạ: một dòng `Claude Code (CC) — đối chiếu kết quả GPT` mà đem so với /gpt/ sẽ ra
     "gửi cho GPT" — đúng cái lỗi mà mép này sinh ra để chặn. */
  return m[1].split(/[—–,.(]/u)[0].trim() || null;
}

/* LƯỢT NÀY ĐỌC ĐƯỢC CHƯA — B-59/B-60. Hai lượt đo live 11/09, và lượt thứ hai **sửa lại kết
 * luận của lượt thứ nhất**, nên đọc cả hai trước khi tin.
 *
 * Trang đánh dấu một lượt bằng `data-turn-id` **tạm** (`request-<id hội thoại>-<n>`, hoặc
 * `client-created-root`) cho tới khi lượt được ghi nhận với danh tính thật là một UUID. Đây
 * là dấu hiệu của chính ChatGPT, và là thuộc tính cấu trúc — không phải nhãn tiếng Anh.
 *
 * ⑴ TAB BỊ CHE, câu trả lời thật dài 85 ký tự:
 *      giây  nút Stop   dạng id   ký tự
 *       8.7  ĐÃ TẮT     TẠM        26   ← nút Stop nói "xong" khi CHƯA xong
 *      27.0  đã tắt     TẠM        26   ← chữ đứng yên 20 giây, cũng nói "xong"
 *
 * ⑵ TAB HIỆN, câu trả lời thật dài 1096 ký tự:
 *      giây  tab    nút Stop   dạng id   ký tự
 *       7.9  HIỆN   còn sinh   TẠM        909
 *      10.6  HIỆN   đã tắt     TẠM       1096   ← ĐÃ XONG THẬT (nạp lại vẫn 1096)
 *      32.5  che    đã tắt     TẠM       1096   ← id VẪN tạm sau 22 giây
 *
 * **ĐỪNG ĐỌC `TẠM` THÀNH "CHƯA XONG".** Lượt ⑵ bác đúng câu đó — tôi đã viết nó sáng 11/09 và
 * nó sai. Ở ⑵ nội dung đã đủ từ giây 10.6 mà id vẫn tạm. Và id **không bao giờ tự** thành
 * UUID: cả hai lượt đo đều giữ TẠM tới lúc dừng đo, chỉ **nạp lại** mới đổi.
 *
 * Nghĩa đúng, hẹp hơn: **`TẠM` = DOM sống không kết luận được, phải nạp lại rồi mới đọc.**
 * Nên chờ thêm là phí — nạp lại là thứ duy nhất gỡ được, và nó đúng bằng luật B-59 ⒝ vốn có.
 *
 * Hai tín hiệu, hai kiểu nói dối, không cái nào dùng một mình được:
 *   nút Stop  → DƯƠNG TÍNH GIẢ: nói "xong" khi chưa xong  (lượt ⑴)
 *   dạng id   → ÂM TÍNH GIẢ:    nói "chưa đọc được" khi đã xong (lượt ⑵)
 * Bộ chạy dùng dạng id cho việc nó làm đúng — **chặn một kết luận từ DOM chưa tin được** —
 * chứ không dùng nó để phán "xong hay chưa".
 *
 * Ghi thêm, vì nó là một luật vận hành: ở lượt ⑵ chữ chạy 13 → 909 → 1096 trong 5 giây khi tab
 * HIỆN, rồi **đứng im ngay khi tab bị che**. Tab nền bị bóp đường stream thật.
 */
export function luotDaChot(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id ?? ""));
}

/* ĐỊNH DANH HỘI THOẠI TỪ MỘT ĐỊA CHỈ. Bản sao có chủ ý của `conversationId` trong
   `provider-adapter.js` — bộ chạy là một tiến trình node, không nạp được mã của tiện ích.
   `tests/chuoi-url-smoke.mjs` đọc regex THẬT trong adapter và bắt hai bên phải trùng, nên
   nó là bản sao CÓ MÁY CANH chứ không phải bản sao thứ hai để trôi. Repo này đã trả giá
   đúng một lần cho bản sao không có máy canh: `sidepanel.js` giữ regex riêng neo ở đầu
   đường dẫn, hội thoại trong Project trả `null`, và một lớp chặn tắt lặng lẽ bảy ngày. */
export function hoiThoaiCua(url) {
  const m = /(?:^|\/)c\/([^/?#]+)/i.exec(String(url ?? "").split("?")[0].split("#")[0]);
  return m ? m[1] : null;
}

/* B-63 — TAB NÀY CÒN LÀ CỦA TÔI KHÔNG. Đo 11:32 ngày 10/09: đúng hội thoại đang chạy chuỗi,
   nhưng ba lượt cuối là của Đức đang hỏi GPT chuyện khác, và `generating: true` là Đức đang
   chờ câu trả lời của mình. `RUN_ACTIVE` với cửa `generating` chỉ đo "trang có bận không",
   không đo "ai đang dùng" — người gõ xong, trang lặng, bộ chạy sẽ chèn prompt vào giữa cuộc
   nói chuyện của người và coi câu trả lời cho người là khối nối vòng của nó.

   Hai phép kiểm, và cả hai đều là SO SÁNH VỚI MỘT MỐC ĐÃ GHIM, không phải đoán từ nội dung:
   ⑴ URL đổi = không còn là hội thoại đã ghim.
   ⑵ Lượt `user` cuối mang một id khác mốc = có ai đó gõ vào. Mốc chỉ nhích khi CHÍNH bộ chạy
      gửi xong, nên mọi thay đổi khác đều là người.
   Dừng, không gửi. Đây là mép duy nhất trong tệp này bảo vệ NGƯỜI chứ không bảo vệ chuỗi. */
export function canhTab({ url, urlGhim, idLuotNguoiCuoi, mocLuotNguoi }) {
  /* SO BẰNG ĐỊNH DANH HỘI THOẠI, KHÔNG SO CẢ ĐỊA CHỈ. So cả địa chỉ là dương tính giả:
     ChatGPT tự gắn thêm/bỏ bớt phần `?...` sau lưng người dùng, và một chuỗi đang chạy
     ngon sẽ dừng với `DOI_HOI_THOAI` mà không có ai đổi gì. Hai bên không rút ra được
     định danh thì mới lùi về so nguyên văn — thà dừng nhầm còn hơn gõ nhầm hội thoại. */
  if (urlGhim && url) {
    const idGhim = hoiThoaiCua(urlGhim);
    const idNay = hoiThoaiCua(url);
    const khac = idGhim && idNay ? idGhim !== idNay : urlGhim !== url;
    if (khac) return { dung: true, vi: `DOI_HOI_THOAI — ghim ${idGhim || urlGhim}, giờ là ${idNay || url}` };
  }
  if (idLuotNguoiCuoi && mocLuotNguoi !== undefined && idLuotNguoiCuoi !== mocLuotNguoi) {
    return { dung: true, vi: `NGUOI_DANG_DUNG — có lượt gõ lạ (${idLuotNguoiCuoi}), không phải lượt tôi gửi` };
  }
  return { dung: false, vi: null };
}

/* Toàn bộ phần "nghĩ" của bộ chạy nằm ở đây, và nó THUẦN — không mạng, không file, không giờ.
   Tách ra để phép ghim lái được nó qua mọi mép mà không cần Bridge. */
export function quyetDinh({ generating, khoi, khoiCu, daNapLai, daThayDangChay, soLanYen = 0, idLuotTraLoiCuoi = null }) {
  if (generating === true) return { viec: "CHO", vi: "trang còn đang sinh" };
  /* HAI đường mở khoá, không một. Đường ⑴ là lượt vừa gửi: đã thấy nó sinh rồi lặng.
     Đường ⑵ là nối vào một chuỗi đã xong từ trước: không bao giờ thấy nó sinh, nên phải
     nhận `yên đủ lâu` làm bằng chứng. Bản đầu chỉ có ⑴ và nó treo vô hạn ở cảnh ⑵. */
  if (!daThayDangChay && soLanYen < NGUONG_YEN) {
    return { viec: "CHO", vi: `chưa thấy trang sinh, mới yên ${soLanYen}/${NGUONG_YEN} lượt — false lúc này có thể là 'chưa khởi động'` };
  }

  /* LƯỢT CHƯA CHỐT THÌ CHƯA ĐỌC ĐƯỢC GÌ CẢ — cửa này đứng TRƯỚC mọi phán quyết về khối.
     Đo 11/09: trên một lượt chưa chốt, `chat.read` trả `found: true` với `chars: 0` và
     `turn_id: "request-<hội thoại>-0"`. Bản trước đi thẳng vào nhánh "có khối" rồi chấm
     `KHOI_RONG` → DỪNG. Sai hai lần trong một bước: dừng bằng LÝ DO SAI (khối không rỗng, nó
     chưa tồn tại), và **đi vòng qua luật B-59** bắt phải nạp lại một lần trước khi kết luận.
     Nhận `id` của lượt trả lời cuối chứ không chỉ của khối, vì có lúc khối chưa hiện mà lượt
     đã có id tạm — đo được ở giây 6.1. */
  const idXet = khoi?.turn_id || idLuotTraLoiCuoi;
  if (idXet && !luotDaChot(idXet)) {
    /* KHÔNG CHỜ THÊM Ở ĐÂY. Tới được dòng này nghĩa là `generating` đã false VÀ trang đã qua
       cửa quan sát ở trên — tức nó đã lặng. Mà đo được cả hai lượt 11/09: id tạm **không bao
       giờ tự** thành UUID (giữ tạm tới 27 và 32,5 giây), chỉ nạp lại mới đổi. Nên mọi giây
       chờ thêm ở đây là giây phí. Bản đầu của tôi chờ hết `NGUONG_YEN` (~90 giây) trước khi
       nạp lại — trên một chuỗi 12 vòng là 18 phút ngồi không, đổi lấy đúng số không. */
    if (!daNapLai) return { viec: "NAP_LAI", vi: `LUOT_CHUA_CHOT — DOM sống mang id tạm "${idXet}", chỉ nạp lại mới đọc được thật` };
    return { viec: "DUNG", vi: `LUOT_CHUA_CHOT — nạp lại rồi mà lượt vẫn mang id tạm "${idXet}"` };
  }

  const coKhoiMoi = Boolean(khoi?.found) && Boolean(khoi.turn_id) && khoi.turn_id !== khoiCu;

  // Khối có thể hiện ra lúc còn đang gõ dở — đo được 80 ký tự giữa chừng ở vòng 1 ngày 10/09.
  // Nên mép này chỉ chạy khi generating đã false, tức đã qua hai cửa trên.
  if (coKhoiMoi) {
    if (khoi.truncated) return { viec: "DUNG", vi: "KHOI_BI_CAT — không gửi đi một prompt cụt" };
    if (!khoi.text?.trim()) return { viec: "DUNG", vi: "KHOI_RONG" };
    if (khoi.text.length > TRAN_KY_TU_KHOI) return { viec: "DUNG", vi: `KHOI_QUA_DAI ${khoi.text.length} > ${TRAN_KY_TU_KHOI}` };
    /* B-62 — KHỐI NÀY GỬI CHO AI. Chuỗi `luat-audit` dừng sau Vòng 6 và bộ chạy chấm là
       `HET_CHUOI`, trong khi sự thật là GPT ĐÃ trả lời: khối nối vòng ghi
       `NGƯỜI NHẬN/THỰC THI: Claude Code (CC)` — một chốt kiểm do người/CC làm — nên GPT từ
       chối tự thực thi. Chuyển khối đó ngược về GPT là hỏi sai người. "Hết lời" và "tới lượt
       CC" phải là hai lý do dừng khác nhau, vì người đọc nhật ký xử lý chúng khác hẳn. */
    const nguoiNhan = nguoiNhanCuaKhoi(khoi.text);
    if (nguoiNhan && !/gpt/i.test(nguoiNhan)) {
      return { viec: "DUNG", vi: `CAN_NGUOI — khối này giao cho "${nguoiNhan}", không phải GPT` };
    }
    return { viec: "GUI", vi: `khối mới ${khoi.chars} ký tự` };
  }

  if (!daNapLai) return { viec: "NAP_LAI", vi: "xong mà chưa có khối mới — B-59 đòi nạp lại một lần trước khi kết luận" };
  return { viec: "DUNG", vi: "HET_CHUOI — đã nạp lại mà vẫn không có khối mới" };
}

/* Kết luận một lượt gửi — cũng THUẦN, cũng ghim được.
   Sinh ra từ lỗi 09:43 ngày 10/09: bản đầu đọc lại sau lần gửi ⑴ nhưng KHÔNG đọc lại sau lần
   ⑵, nên `REQUEST_TIMEOUT` ở lần hai bị chấm thẳng là thất bại. Trang lúc đó đang sinh —
   tin nhắn đã bay. Đúng luật B-58 mà chính file này cài để chặn, chặn được nửa đường.
   Luật đầy đủ: **mỗi lượt gửi báo lỗi đều phải có một lượt đọc lại của riêng nó.** */
export function ketLuanGui({ ok1, daBay1, ok2, daBay2 }) {
  if (ok1) return { xong: true, vi: "gửi thẳng OK" };
  if (daBay1 === true) return { xong: true, vi: "lần ⑴ báo lỗi nhưng đọc lại thấy ĐÃ BAY" };
  /* `null` = ĐỌC KHÔNG ĐƯỢC, khác hẳn `false` = ĐỌC ĐƯỢC VÀ KHÔNG THẤY.
     Gộp hai cái này là lỗi đã xảy ra hai lần ngày 10/09: panel bận nên `chat.read` hết giờ,
     bản đầu chấm luôn thành "chưa bay" rồi gửi lại — trong khi tin nhắn đã vào hội thoại.
     Không đọc được thì KHÔNG được gửi lại: đó đúng là chỗ luật exact-once sinh ra để chặn. */
  if (daBay1 === null) return { xong: false, dung: true, vi: "KHONG_DOC_LAI_DUOC sau lần ⑴ — KHÔNG gửi lại, người phải nhìn" };
  if (ok2) return { xong: true, vi: "gửi lại OK" };
  if (daBay2 === true) return { xong: true, vi: "lần ⑵ báo lỗi nhưng đọc lại thấy ĐÃ BAY" };
  if (daBay2 === null) return { xong: false, dung: true, vi: "KHONG_DOC_LAI_DUOC sau lần ⑵ — KHÔNG gửi lại, người phải nhìn" };
  return { xong: false, vi: "hai lượt gửi, hai lượt đọc lại, đều không thấy trong hội thoại" };
}

/* ------------------------------------------------------------------ phần có tác dụng phụ */

function docCo(argv, ten, mac) {
  const i = argv.indexOf(`--${ten}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : mac;
}

async function chinh() {
  const argv = process.argv.slice(2);
  const soVong = Number(docCo(argv, "so-vong", "0"));
  const nhan = docCo(argv, "nhan", "");
  const pairing = docCo(argv, "pairing", "");
  const target = docCo(argv, "target", "");
  const tranPhut = Number(docCo(argv, "tran-phut", "240"));
  /* MẶC ĐỊNH NẰM NGOÀI REPO. Bản đầu lấy `process.cwd()`, nên một lượt chạy từ gốc repo đẻ ra
     `chuoi-<nhãn>/` ngay trong cây làm việc — xảy ra thật 10/09 với `chuoi-ark-luat/`, và nó
     suýt bị `git add -A` của một lượt commit khác cuốn vào. Nhật ký là trạng thái vận hành,
     không phải mã nguồn; nó không thuộc về bất kỳ repo nào. */
  const thuMuc = docCo(argv, "nhat-ky",
    path.join(os.homedir(), "Documents", "chuoi-gpt", nhan || "khong-ten"));

  if (!Number.isInteger(soVong) || soVong < 1 || soVong > TRAN_VONG) {
    console.error(`--so-vong phải là số nguyên 1..${TRAN_VONG}.`);
    process.exit(2);
  }
  if (!nhan || !pairing) { console.error("Thiếu --nhan hoặc --pairing."); process.exit(2); }

  /* --url — KHAI TRƯỚC HỘI THOẠI MUỐN CHẠY. Không khai thì bộ chạy ghim đúng cái tab đang
     mở ở lượt đọc đầu, và nó KHÔNG có cách nào biết đó có phải hội thoại Đức định chạy hay
     không — mở nhầm tab thì chuỗi gõ vào nhầm chỗ, và cái đó không hoàn tác được. Khai thì
     lệch một cái là dừng ngay ở lượt đọc đầu, chưa gửi gì. */
  const urlMuon = docCo(argv, "url", "");
  if (urlMuon && !hoiThoaiCua(urlMuon)) {
    console.error(`--url không phải một hội thoại: ${urlMuon}`);
    console.error("Địa chỉ phải có dạng chatgpt.com/c/<id>. Một chat MỚI chưa gõ câu nào thì chưa có địa chỉ đó —");
    console.error("gõ một câu vào nó trước, địa chỉ sẽ hiện ra, rồi chạy lại.");
    process.exit(2);
  }

  fs.mkdirSync(thuMuc, { recursive: true });

  /* B-61 — MỘT BẢN CHẠY MỘT LÚC. 10/09 hai tiến trình chạy song song trên cùng một tab: nhật
     ký đan xen thành vô nghĩa, hai lượt gửi cùng một prompt cách nhau 59 giây, và chúng nạp
     lại tab của nhau giữa lúc GPT đang sinh. Không có prompt trùng nào vào hội thoại — chốt
     `RUN_ACTIVE` chặn được — nhưng nó chặn TÌNH CỜ: đọc-lại-thấy-đã-bay chứng minh MỘT lượt
     gửi đã bay, không chứng minh LƯỢT CỦA TÔI đã bay. Một tiến trình thì hai câu đó trùng
     nhau; hai tiến trình thì không. `wx` là phép kiểm-và-tạo nguyên tử của hệ tệp. */
  const soKhoa = path.join(thuMuc, "DANG-CHAY.json");
  try {
    fs.writeFileSync(soKhoa, JSON.stringify({ pid: process.pid, tu: new Date().toISOString(), nhan }, null, 1), { flag: "wx" });
  } catch (e) {
    if (e?.code !== "EEXIST") throw e;
    let cu = "(không đọc được)";
    try { cu = fs.readFileSync(soKhoa, "utf8").replace(/\s+/g, " ").trim(); } catch { /* giữ nguyên */ }
    console.error(`ĐÃ CÓ MỘT BẢN CHẠY GIỮ THƯ MỤC NÀY: ${cu}`);
    console.error(`Nó chết rồi thì xoá tay: ${soKhoa}`);
    process.exit(3);
  }
  const traKhoa = () => { try { fs.unlinkSync(soKhoa); } catch { /* đã mất thì thôi */ } };
  process.on("exit", traKhoa);
  for (const tinHieu of ["SIGINT", "SIGTERM"]) process.on(tinHieu, () => { traKhoa(); process.exit(130); });

  const soNhatKy = path.join(thuMuc, "nhat-ky.jsonl");
  const ghi = (o) => fs.appendFileSync(soNhatKy, JSON.stringify({ luc: new Date().toISOString(), ...o }) + "\n");

  const goi = (args) => {
    let out = "";
    try {
      out = execFileSync("node", [CLI, ...args, "--pairing", pairing, ...(target ? ["--target", target] : [])], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { out = String(e.stdout || ""); }
    try { return JSON.parse(out); } catch { return { ok: false, error: { code: "KHONG_PHAI_JSON" } }; }
  };
  const doc = () => goi(["chat-read", "--limit", "4", "--max-chars", "20000"]);
  const ngu = (ms) => new Promise((r) => setTimeout(r, ms));

  const hanChung = Date.now() + tranPhut * 60000;
  let khoiCu = docCo(argv, "tu-turn", "");
  let daGui = 0;
  let lyDo = "HET_SO_VONG";
  /* Có `--url` thì ghim từ đó — lệch là dừng ở lượt đọc đầu. Không có thì ghim ở LƯỢT ĐỌC
     ĐẦU: bộ chạy nối vào một tab đang mở sẵn và không biết trước tab ấy ở hội thoại nào. */
  let urlGhim = urlMuon || null;
  let mocLuotNguoi;

  console.log(`chuỗi "${nhan}" · trần ${soVong} vòng · trần ${tranPhut} phút · nhật ký ${soNhatKy}`);
  console.log(urlMuon
    ? `hội thoại đã khai: ${hoiThoaiCua(urlMuon)} — lệch là dừng ngay, chưa gửi gì`
    : "hội thoại: ghim theo tab đang mở ở lượt đọc đầu (khai --url nếu muốn chắc)");
  ghi({ su_kien: "BAT_DAU", so_vong: soVong, tran_phut: tranPhut, tu_turn: khoiCu || null, hoi_thoai: hoiThoaiCua(urlMuon) });

  for (let vong = 1; vong <= soVong; vong += 1) {
    let daNapLai = false;
    let daThayDangChay = false;
    let soLanYen = 0;
    let khoi = null;
    let nhip = 0;
    let docHong = 0;

    while (true) {
      if (fs.existsSync(path.join(thuMuc, "DUNG"))) { lyDo = "NGUOI_DUNG"; break; }
      if (Date.now() > hanChung) { lyDo = "QUA_TRAN_PHUT"; break; }

      const d = doc();
      if (!d.ok) {
        /* SAI TRANG KHÔNG PHẢI PANEL BẬN — và chờ thêm không bao giờ chữa được nó.
           Đo 10/09: một chat MỚI (chưa gõ câu nào) nằm ở `chatgpt.com/`, không phải
           `chatgpt.com/c/<id>`, nên `chat.read` từ chối bằng `WRONG_SURFACE`. Bản trước gộp
           mọi lỗi đọc vào một rọ và in "panel đang bận" — một chẩn đoán SAI BỆNH, bảo người
           ta ngồi đợi trong khi việc cần làm là mở đúng hội thoại. `system.ping` là cửa duy
           nhất còn trả lời được ở trạng thái này, nên hỏi nó xem tab đang ở đâu rồi nói thật. */
        if (/WRONG_SURFACE/.test(JSON.stringify(d.error ?? ""))) {
          const p = goi(["ping", "--request-id", `${nhan}-v${vong}-ping`]);
          const dangO = p?.result?.chatgpt?.url || "(ping cũng không trả lời)";
          lyDo = `SAI_TRANG — tab đang ở ${dangO}, đây không phải một hội thoại`;
          console.log(`  vòng ${vong}: ${lyDo}`);
          console.log("  Một chat MỚI chưa gõ câu nào thì chưa có địa chỉ chatgpt.com/c/<id>.");
          console.log("  Gõ một câu vào nó trước, rồi chạy lại.");
          ghi({ su_kien: "SAI_TRANG", vong, url: p?.result?.chatgpt?.url || null });
          break;
        }
        /* ĐƯỜNG IM CUỐI CÙNG, và nó đã che mất một lượt đứng 10 phút: bản trước `continue`
           không in gì, nên khi panel hết giờ liên tục thì bộ chạy quay vòng vô hình — nhịp
           tim ở dưới không bao giờ chạy tới. Mọi nhánh `continue` phải nói ra mình là ai. */
        docHong += 1;
        if (docHong % 10 === 1) console.log(`  vòng ${vong} · đọc hỏng ${docHong} lượt liên tiếp (${d.error?.code}) — panel đang bận`);
        await ngu(4000);
        continue;
      }
      docHong = 0;
      const r = d.result;

      /* B-63 — CANH TAB TRƯỚC MỌI THỨ KHÁC. Đặt ngay sau lượt đọc và trước cả `quyetDinh`:
         mọi nhánh phía dưới đều có thể dẫn tới một lượt gửi, nên phép kiểm này phải chặn
         trước, không phải chặn song song. */
      const luotNguoi = (r.turns || []).filter((t) => t.role === "user");
      const idLuotNguoiCuoi = luotNguoi.length ? luotNguoi[luotNguoi.length - 1].id : null;
      if (urlGhim === null && r.url) { urlGhim = r.url; }
      if (mocLuotNguoi === undefined) { mocLuotNguoi = idLuotNguoiCuoi; }
      const canh = canhTab({ url: r.url, urlGhim, idLuotNguoiCuoi, mocLuotNguoi });
      if (canh.dung) {
        console.log(`  vòng ${vong}: ${canh.vi}`);
        ghi({ su_kien: "CANH_TAB", vong, vi: canh.vi });
        lyDo = canh.vi;
        break;
      }

      if (r.generating === true) { daThayDangChay = true; soLanYen = 0; } else soLanYen += 1;

      const luotTL = [...(r.turns || [])].reverse().find((t) => t.role === "assistant");
      const qd = quyetDinh({ generating: r.generating, khoi: r.last_copy_block, khoiCu, daNapLai, daThayDangChay, soLanYen, idLuotTraLoiCuoi: luotTL?.id ?? null });
      if (qd.viec === "CHO") {
        /* NHỊP TIM. Bản đầu im hoàn toàn trong lúc chờ, nên một lượt treo 25 phút nhìn từ
           ngoài KHÔNG phân biệt được với một tiến trình đã chết — Đức hỏi đúng câu đó. */
        nhip += 1;
        if (nhip % 4 === 1) console.log(`  vòng ${vong} · chờ: ${qd.vi}`);
        await ngu(15000);
        continue;
      }
      if (qd.viec === "NAP_LAI") {
        console.log(`  vòng ${vong}: ${qd.vi}`);
        ghi({ su_kien: "NAP_LAI", vong, vi: qd.vi });
        goi(["chat-reload", "--request-id", `${nhan}-v${vong}-reload`]);
        daNapLai = true;
        /* ĐẶT LẠI CỬA SỔ QUAN SÁT SAU KHI NẠP LẠI. Bản đầu nạp lại rồi kết luận DỪNG ở
           lượt đọc kế tiếp — 60 giây sau. Đo 10:02 ngày 10/09: nó chấm HET_CHUOI trong khi
           câu trả lời vòng 5 đã xong đủ 2245 ký tự và khối 1388 ký tự đang nằm đó.
           Lý do sâu hơn: `generating` đọc nút Stop, mà nút Stop BIẾN MẤT trong lúc model
           chạy tool — nên "false" giữa chuỗi tool không phải "đã xong". Đặt lại hai biến
           này bắt nó quan sát thêm trọn một cửa sổ ~90 giây trước khi được phép kết luận. */
        daThayDangChay = false;
        soLanYen = 0;
        await ngu(15000);
        continue;
      }
      if (qd.viec === "DUNG") { lyDo = qd.vi; break; }
      khoi = r.last_copy_block;
      break;
    }
    if (!khoi) break;

    // Gửi. Lỗi ở đây KHÔNG được tự thử lại mù (B-58) — phải đọc lại xem nó đã bay chưa.
    const fParam = path.join(thuMuc, `vong-${String(vong).padStart(2, "0")}.json`);
    fs.writeFileSync(fParam, JSON.stringify({ text: khoi.text, timeout_sec: 180 }, null, 1));
    // So bằng 60 ký tự ĐẦU của chính khối — không so bằng một từ khoá, vì một từ khoá cũng
    // nằm trong prompt vòng trước và sẽ cho dương tính giả (đã dính đúng bẫy này 10/09).
    /* Trả BA giá trị: true đã bay · false đọc được và không thấy · null KHÔNG ĐỌC ĐƯỢC.
       Phải thử lại nhiều lượt: đúng lúc cần đọc nhất là lúc trang đang sinh, và đó cũng là
       lúc panel hay hết giờ nhất (B-50). Bản đầu đọc MỘT lượt, hết giờ là trả false, và hai
       lần liên tiếp nó chấm nhầm một tin nhắn đã vào hội thoại thành chưa gửi. */
    const daVaoChua = async () => {
      await ngu(45000);
      for (let i = 0; i < 12; i += 1) {
        const lai = doc();
        if (lai.ok) {
          const hoiCuoi = [...lai.result.turns].reverse().find((t) => t.role === "user");
          return Boolean(hoiCuoi && hoiCuoi.text.startsWith(khoi.text.slice(0, 60)));
        }
        await ngu(5000);
      }
      return null;
    };

    const lan1 = goi(["chat-say", "--params-file", fParam, "--request-id", `${nhan}-v${vong}`]);
    let ok1 = Boolean(lan1.ok), daBay1 = false, ok2 = false, daBay2 = false;
    if (!ok1) {
      daBay1 = await daVaoChua();
      ghi({ su_kien: "GUI_LOI_DOC_LAI", vong, lan: 1, ma: lan1.error?.code || null, da_bay: daBay1 });
      // Chỉ gửi lại khi đọc được VÀ không thấy. `null` (không đọc được) đi thẳng xuống
      // `ketLuanGui` để dừng — gửi lại lúc mù là đúng thứ exact-once cấm.
      if (daBay1 === false) {
        const lan2 = goi(["chat-say", "--params-file", fParam, "--request-id", `${nhan}-v${vong}`]);
        ok2 = Boolean(lan2.ok);
        // MỖI lượt gửi báo lỗi phải có lượt đọc lại CỦA RIÊNG NÓ. Bản đầu bỏ lượt này và
        // chấm `REQUEST_TIMEOUT` ở lần hai thành thất bại, trong khi tin nhắn đã bay.
        if (!ok2) {
          daBay2 = await daVaoChua();
          ghi({ su_kien: "GUI_LOI_DOC_LAI", vong, lan: 2, ma: lan2.error?.code || null, da_bay: daBay2 });
        }
      }
    }
    const kl = ketLuanGui({ ok1, daBay1, ok2, daBay2 });
    if (!kl.xong) { lyDo = `GUI_THAT_BAI: ${kl.vi}`; break; }

    daGui += 1;
    khoiCu = khoi.turn_id;
    /* NHÍCH MỐC SANG ĐÚNG LƯỢT VỪA GỬI — và chỉ khi nhận ra nó là lượt của mình. Không được
       nhích mù (xoá mốc đi để nó tự ghim lại): nếu người gõ ngay sau lượt tôi,
       nhích mù sẽ nhận lượt của người làm mốc và mép B-63 mất tác dụng đúng lúc cần nhất.
       So bằng 60 ký tự đầu của khối, giống `daVaoChua` — không so bằng từ khoá. */
    const sauGui = doc();
    if (sauGui.ok) {
      const cuoi = [...(sauGui.result.turns || [])].reverse().find((t) => t.role === "user");
      if (cuoi && cuoi.text.startsWith(khoi.text.slice(0, 60))) {
        mocLuotNguoi = cuoi.id;
      } else if (cuoi) {
        lyDo = `NGUOI_DANG_DUNG — ngay sau lượt gửi, lượt cuối lại không phải của tôi (${cuoi.id})`;
        console.log(`  vòng ${vong}: ${lyDo}`);
        ghi({ su_kien: "CANH_TAB", vong, vi: lyDo });
        break;
      }
    }
    console.log(`  vòng ${vong}/${soVong}: đã gửi ${khoi.chars} ký tự — ${kl.vi}`);
    ghi({ su_kien: "DA_GUI", vong, ky_tu: khoi.chars, turn_id: khoi.turn_id, vi: kl.vi, text: khoi.text });
    await ngu(95000); // nắp chờ 90 giây của Bridge, cộng biên
  }

  ghi({ su_kien: "KET_THUC", da_gui: daGui, ly_do: lyDo });
  console.log(`\nxong: đã gửi ${daGui} vòng · dừng vì ${lyDo}`);
  console.log(`nhật ký: ${soNhatKy}`);
  process.exit(lyDo === "HET_SO_VONG" || lyDo.startsWith("HET_CHUOI") ? 0 : 1);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  chinh().catch((e) => { console.error(String(e?.message || e)); process.exit(2); });
}

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
 *        [--url https://chatgpt.com/c/<id>] [--tu-turn <turn_id>] [--tiep]
 *
 * `--tiep` CHẠY TIẾP, không chạy lại: đọc `nhat-ky.jsonl` trong thư mục nhật ký, nối từ lượt
 * gửi cuối cùng, và TRỪ số vòng đã gửi vào trần vòng. Chạy lại từ số không trên một hội thoại
 * đang dở là cách gửi lại đúng một prompt đã gửi.
 *
 * `--url` khai TRƯỚC hội thoại muốn chạy. Không khai thì nó ghim đúng tab đang mở ở lượt đọc
 * đầu — tiện, nhưng mở nhầm tab là gõ nhầm chỗ, và cái đó không hoàn tác được.
 *
 * Dừng bằng tay: tạo file `DUNG` trong thư mục nhật ký.
 */
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
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

/* ĐỌC NHẬT KÝ ĐỂ CHẠY TIẾP — `--tiep`. Đức nêu 12/09: *"script bị chết thì tôi không phải
 * chạy lại từ đầu rồi điền thông tin từ đầu."*
 *
 * "Chạy lại" và "chạy tiếp" là HAI VIỆC KHÁC NHAU, và nhầm chúng thì tốn một lượt gửi thật.
 * Chạy lại từ số không trên một hội thoại đang dở: bộ chạy đọc trang, thấy khối mới nhất, và
 * khối ấy có thể CHÍNH LÀ khối nó vừa gửi trước khi chết — nó sẽ gửi lần hai. Nhật ký đã ghi
 * `turn_id` của từng lượt gửi, nên chỗ dừng là thứ ĐỌC ĐƯỢC, không phải thứ phải nhớ.
 *
 * Trả về:
 *   khoiCu  — `turn_id` của lượt gửi CUỐI CÙNG, để `quyetDinh` không nhận lại đúng khối đó
 *   daGui   — đã gửi bao nhiêu vòng, để trừ vào trần vòng
 * Trừ vào trần chứ không cộng thêm: `--so-vong` là NGÂN SÁCH Đức đặt cho cả việc, không phải
 * cho một lượt chạy. Muốn cấp thêm vòng thì gõ lại số, đó là một quyết định chứ không phải
 * một hệ quả phụ của việc script chết.
 *
 * THUẦN — không đọc đĩa, nhận sẵn nội dung. Dòng hỏng thì BỎ QUA từng dòng, không bỏ cả tệp:
 * nhật ký là tệp chỉ-thêm ghi giữa lúc chạy, nên một lượt tắt máy có thể để lại dòng cuối cụt. */
export function docNhatKy(text) {
  let khoiCu = "";
  let daGui = 0;
  for (const dong of String(text ?? "").split("\n")) {
    if (!dong.trim()) continue;
    let o;
    try { o = JSON.parse(dong); } catch { continue; }
    if (o?.su_kien !== "DA_GUI") continue;
    daGui += 1;
    if (o.turn_id) khoiCu = String(o.turn_id);
  }
  return { khoiCu, daGui };
}

/* GIÃN NHỊP GIỮA "ĐỌC ĐƯỢC KHỐI" VÀ "DÁN VÀO Ô SOẠN" — Đức chốt 12/09.
 *
 * Bản trước đọc xong khối là gọi `chat-say` ngay ở dòng kế tiếp: đọc và gõ cách nhau vài chục
 * mili-giây, đều tăm tắp mọi vòng. Không người nào gõ như thế.
 *
 * NGẪU NHIÊN CHỨ KHÔNG PHẢI MỘT HẰNG SỐ MỚI: một khoảng nghỉ cố định 4 giây vẫn là một nhịp
 * đều, chỉ chậm hơn. Mỗi lượt phải là một con số khác.
 *
 * THUẦN — `rnd` tiêm vào được nên kiểm được bằng số cố định, không phải chạy trăm lượt rồi
 * đoán phân bố. Trần được CẮT chứ không lỗi: một lời gọi sai chỗ không được quyền treo chuỗi. */
export function treNgauNhien(toiThieuMs = 3000, toiDaMs = 6000, rnd = Math.random) {
  const min = Math.max(0, Math.floor(Number(toiThieuMs) || 0));
  const max = Math.max(min, Math.floor(Number(toiDaMs) || 0));
  return min + Math.floor(rnd() * (max - min + 1));
}

/* KHOÁ IDEMPOTENCY DỰNG TỪ TÊN CHUỖI — B-73, lỗi thật 12/09.
 *
 * Đức đặt tên chuỗi là `HNX audit & fill`. Bản trước ghép thẳng tên ấy vào khoá
 * (`${nhan}-v${vong}`), ra `HNX audit & fill-v1`. Host đòi `/^[\x21-\x7e]{8,128}$/` — **dấu
 * cách (0x20) KHÔNG nằm trong khoảng đó** — nên MỌI lượt gửi trả `INVALID_ENVELOPE` và chuỗi
 * chết ngay vòng 1. Tệ hơn cả việc chết: nhật ký kết lại thành *"hai lượt gửi, hai lượt đọc
 * lại, đều không thấy trong hội thoại"* — đọc y như trang hỏng, trong khi lỗi nằm ở CÁI TÊN.
 * Tên có dấu tiếng Việt cũng vỡ y hệt, và đó là tên Đức hay đặt nhất.
 *
 * Ba điều kiện, và điều thứ ba là điều dễ quên nhất:
 * ⑴ Chỉ ký tự an toàn — mọi thứ khác thành `-`.
 * ⑵ Luôn đủ 8 ký tự, kể cả khi tên rút gọn còn rỗng (tên thuần tiếng Việt có dấu).
 * ⑶ **KHÔNG ĐƯỢC ĐỤNG NHAU.** Khoá này LÀ khoá chống-gửi-hai-lần. `HNX audit & fill` và
 *   `HNX audit / fill` cùng rút thành `HNX-audit-fill`; nếu dừng ở đó thì lượt gửi của chuỗi
 *   này bị host nuốt như bản sao của chuỗi kia. Vân tay 8 ký tự của TÊN GỐC giữ chúng tách ra.
 * Và nó phải TẤT ĐỊNH: lượt gửi lại sau khi hết giờ phải dùng lại đúng khoá cũ, không thì
 * lớp chống ghi-hai-lần của host không có gì để khớp (bài học `~~B-38~~`). */
export function khoaAnToan(nhan, hau = "") {
  const tho = String(nhan ?? "");
  const sach = tho.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
  const vanTay = crypto.createHash("sha256").update(tho, "utf8").digest("hex").slice(0, 8);
  return `${sach ? `${sach}-` : ""}${vanTay}${hau}`;
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
export function canhTab({ url, urlGhim, idLuotNguoiCuoi, mocLuotNguoi, chuLuotNguoiCuoi = "", chuToiVuaGui = "" }) {
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
    /* B-83 — NHẬN RA CHÍNH TIN NHẮN CỦA MÌNH. Đo live 12/09, chuỗi "Prompt engineer 01": bộ
       chạy gửi xong lúc 15:42:10, lượt đọc NGAY SAU ĐÓ hết giờ (tab nền bị bóp), nên mốc không
       được nhích. Vòng kế tiếp đọc ra lượt người mới nhất — CHÍNH LÀ TIN NHẮN NÓ VỪA GỬI — thấy
       khác mốc cũ, và kết tội Đức đang gõ: `NGUOI_DANG_DUNG`, dừng chuỗi, `da_gui: 1`.

       Cùng hình dạng với B-80: một lượt ĐỌC KHÔNG ĐƯỢC bị xử như một lượt đọc ra thứ khác.

       So bằng CHỮ, không bằng id: id của lượt vừa gửi là thứ ta không biết trước, còn chữ thì
       biết chính xác — ta vừa gõ nó. 60 ký tự đầu, cùng phép so `daVaoChua` đang dùng.
       Mép KHÔNG bị nới: một lượt người gõ thật không thể bắt đầu bằng đúng 60 ký tự đầu của
       khối mà bộ chạy vừa dán. */
    const cuaToi = Boolean(chuToiVuaGui) && String(chuLuotNguoiCuoi ?? "").startsWith(chuToiVuaGui);
    if (cuaToi) return { dung: false, vi: null, cuaToi: true };
    return { dung: true, vi: `NGUOI_DANG_DUNG — có lượt gõ lạ (${idLuotNguoiCuoi}), không phải lượt tôi gửi` };
  }
  return { dung: false, vi: null };
}

/* ---- NHỊP THỬ LẠI KHI ĐỌC HỎNG — B-76, mua bằng một lượt live 12/09 ------------
 *
 * Chuỗi "Mo rong Scouter" trên profile `kaito`: `chat.read` hỏng liên tục, bộ chạy in
 * "chưa rõ vì sao" và thử lại ĐỀU 4 giây, không giãn, không trần. `system.ping` cùng lúc trả
 * lời NGAY và nói rõ `state: HARD_STOP` · `failure_type: RECEIVER_LOST` — tiện ích mất kết nối
 * với tab, và `halt_instruction.retry` của chính nó viết: *"No — hard stop, whole batch stops"*,
 * kèm lý do: *"auto-retrying would just fail every remaining job back-to-back without producing
 * anything."* Bộ chạy không đọc trường đó, nên nó đốt trọn 60 phút ngân sách: 60' ÷ 4" ≈ 900
 * lượt gõ cửa một cánh cửa đã khoá.
 *
 * Ba vế, và vế thứ ba là vế dễ bỏ quên nhất:
 *   ⒜ HỎI PING khi đọc hỏng lặp lại, không chỉ khi `WRONG_SURFACE`. Ping là cửa DUY NHẤT còn
 *      trả lời ở trạng thái này — lượt đo 12/09 chứng minh: `chat.read` hết giờ, ping trả lời
 *      trong chưa tới một giây, mang theo nguyên văn bệnh án.
 *   ⒝ GIÃN NHỊP. 4 giây phẳng là một vòng lặp bận đội lốt chờ.
 *   ⒞ TIỆN ÍCH KHAI DỪNG CỨNG thì DỪNG. Không cãi. Nó biết trạng thái tab, bộ chạy thì không.
 */
export const NGUONG_PING_DOC_HONG = 3;
/* Nền 15 giây, trần 2 phút — CHỐT LẠI 12/09 sau khi profile `kaito` ăn CAPTCHA.
   Đức: *"đọc vài trăm lần chỉ trong vài chục giây thì là spam rồi còn gì."* Số cũ (4s → 30s)
   vẫn cho ~120 lượt/giờ; bộ số này cho ~33. Đây KHÔNG phải chỉnh cho đẹp: lượt chạy 05:31
   nện ~900 lượt trong 60 phút, và ChatGPT đòi xác minh con người ngay sau đó. */
export const TRE_DOC_HONG_NEN_MS = 15000;
export const TRE_DOC_HONG_TRAN_MS = 120000;
/* SÀN CỨNG giữa hai lượt đọc bất kỳ, cưỡng chế trong `doc()` — xem khối lý lẽ ở đó. */
export const SAN_GIUA_HAI_LUOT_DOC_MS = 10000;

/** Thuần: lượt đọc hỏng thứ `docHong` thì nghỉ bao lâu, có in ra không, có hỏi ping không. */
export function nhipDocHong(docHong, nen = TRE_DOC_HONG_NEN_MS, tran = TRE_DOC_HONG_TRAN_MS) {
  const n = Math.max(1, Math.floor(Number(docHong) || 1));
  return {
    /* In ở lượt 1, 11, 21… — giữ nguyên nhịp cũ để người quen đọc màn hình không phải học lại. */
    inRa: n % 10 === 1,
    /* Hỏi ping ở lượt 3, 13, 23… — LỆCH khỏi nhịp in một cách cố ý: hỏi ngay lượt đầu thì mọi
       lượt hết giờ lẻ tẻ (rất thường, B-50) đều kéo theo một RPC thừa. Ba lượt liên tiếp mới
       là một triệu chứng. */
    hoiPing: n >= NGUONG_PING_DOC_HONG && (n - NGUONG_PING_DOC_HONG) % 10 === 0,
    /* Giãn dần 1,5× từ 4 giây, trần 30 giây — chạm trần ở lượt 6, tức khoảng 80 giây. Trong
       trần 60 phút: ~120 lượt thay vì 900. */
    treMs: Math.min(tran, Math.round(nen * 1.5 ** (n - 1))),
  };
}

/** Thuần: tiến trình `pid` còn sống không.
 *
 * B-77 — KHOÁ MỒ CÔI. Đo 12/09: bản chạy 05:31 bị giết ngang, `DANG-CHAY.json` ở lại với
 * `pid: 36772` đã chết. Bản sau gõ đúng tên chuỗi ấy thì bị từ chối, và cách thoát dễ nhất là
 * đặt một cái tên khác — thư mục nhật ký của Đức có `HNX`, `HNX ` (thừa dấu cách) và
 * `mo rong scouter 2` đứng cạnh nhau, ba cái tên cho hai việc. Một khoá không tự thu được dạy
 * người ta đi vòng qua nó, và đi vòng qua khoá thì khoá hết tác dụng.
 *
 * KHÔNG BIẾT THÌ COI NHƯ CÒN SỐNG. `kill(pid, 0)` ném `EPERM` khi tiến trình có thật nhưng
 * khác chủ — đó là CÒN SỐNG. Đoán sai theo chiều này chỉ tốn một lần gõ tay; đoán sai theo
 * chiều kia là hai bản chạy cùng gõ vào một tab, đúng lỗi B-61 đã trả giá. */
export function conSong(pid, kill = process.kill) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return true;
  try { kill(n, 0); return true; } catch (e) { return e?.code === "EPERM"; }
}

/** Thuần: tiện ích có tự khai DỪNG CỨNG không. Đọc `system.ping`, không đoán từ mã lỗi. */
export function chanDung(ping) {
  const c = ping?.result?.chatgpt ?? ping?.chatgpt ?? null;
  if (!c || c.state !== "HARD_STOP") return { dung: false, vi: null, khuyen: null };
  const h = c.halt_instruction || {};
  /* Đọc NGUYÊN VĂN `meaning` của tiện ích, không dịch lại, không tóm tắt. Nó biết tab đang ở
     đâu; bộ chạy chỉ biết một mã lỗi đã bị giặt qua hai tầng. */
  return {
    dung: true,
    vi: `DUNG_CUNG — ${c.failure_type || "không rõ loại"}: ${h.meaning || "tiện ích khai dừng cứng"}`,
    khuyen: h.retry || null,
  };
}

/* Toàn bộ phần "nghĩ" của bộ chạy nằm ở đây, và nó THUẦN — không mạng, không file, không giờ.
   Tách ra để phép ghim lái được nó qua mọi mép mà không cần Bridge. */
export function quyetDinh({ generating, khoi, khoiCu, chuKhoiCu = "", daNapLai, daThayDangChay, soLanYen = 0, idLuotTraLoiCuoi = null }) {
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
  /* B-87 — ID TẠM KHÔNG CÒN LÀ ĐẠI DIỆN CHO "CHƯA ĐỌC ĐƯỢC GÌ".
   *
   * Cửa này dựng từ phép đo 11/09, khi id tạm ĐI KÈM `chars: 0`. Nó lấy "id chưa chốt" làm
   * ĐẠI DIỆN cho "chưa có gì để đọc". Đo live 13/09 trên hội thoại Project của Đức phá vỡ
   * đại diện ấy:
   *     [assistant] TẠM request-<hội thoại>-0 · 400 ký tự
   *     last_copy_block: found=true chars=164 · generating=false
   * Câu trả lời XONG HẲN, khối ĐẦY ĐỦ, chỉ mỗi cái id là chưa chốt. Bắt nạp lại ở đây là bắt
   * nạp lại một trang đã đọc được — mỗi vòng một lượt phí, và khi nạp lại không đổi được id
   * (đo được: `-0` giữ nguyên qua nhiều lượt nạp) thì nó DỪNG hẳn chuỗi vì một lý do sai.
   *
   * Nên đo THẲNG cái mình cần: có chữ để đọc hay không. `chars > 0` là phép đo đó.
   * Cửa GIỮ NGUYÊN sức mạnh cho ca gốc 11/09 — id tạm VÀ khối rỗng thì vẫn nạp lại như cũ. */
  const coChuDeDoc = Boolean(khoi?.found) && Number(khoi?.chars) > 0;
  if (idXet && !luotDaChot(idXet) && !coChuDeDoc) {
    /* KHÔNG CHỜ THÊM Ở ĐÂY. Tới được dòng này nghĩa là `generating` đã false VÀ trang đã qua
       cửa quan sát ở trên — tức nó đã lặng. Mà đo được cả hai lượt 11/09: id tạm **không bao
       giờ tự** thành UUID (giữ tạm tới 27 và 32,5 giây), chỉ nạp lại mới đổi. Nên mọi giây
       chờ thêm ở đây là giây phí. Bản đầu của tôi chờ hết `NGUONG_YEN` (~90 giây) trước khi
       nạp lại — trên một chuỗi 12 vòng là 18 phút ngồi không, đổi lấy đúng số không. */
    if (!daNapLai) return { viec: "NAP_LAI", vi: `LUOT_CHUA_CHOT — DOM sống mang id tạm "${idXet}", chỉ nạp lại mới đọc được thật` };
    return { viec: "DUNG", vi: `LUOT_CHUA_CHOT — nạp lại rồi mà lượt vẫn mang id tạm "${idXet}"` };
  }

  /* CHỐNG GỬI TRÙNG: so bằng ID khi id đã chốt, so bằng CHỮ khi chưa.
   *
   * `request-<hội thoại>-0` KHÔNG đổi giữa các lượt — đo được cùng một chuỗi đó qua nhiều vòng
   * và nhiều lượt nạp lại. Nên lấy nó làm mốc chống-trùng là hỏng theo chiều NGUY HIỂM NHẤT:
   * vòng sau `khoi.turn_id !== khoiCu` ra `false`, bộ chạy tưởng "không có khối mới" và dừng
   * một chuỗi còn đang chạy tốt. Ngược lại, nếu mốc cũ rỗng thì nó ra `true` cho MỌI vòng, và
   * một khối đã gửi có thể bay lần hai.
   *
   * Chữ thì phân biệt được thật: hai câu trả lời khác nhau có chữ khác nhau. Và phép so này
   * MẠNH HƠN so bằng id, không yếu hơn — nó so đúng thứ sắp được gửi đi, chứ không so một cái
   * nhãn có thể trùng. 200 ký tự đầu: đủ dài để không đụng nhau, đủ ngắn để không phải giữ cả
   * khối trong bộ nhớ qua nhiều vòng. */
  const vanTayKhoi = String(khoi?.text ?? "").slice(0, 200);
  const coKhoiMoi = Boolean(khoi?.found) && Boolean(khoi.turn_id)
    && (luotDaChot(khoi.turn_id) ? khoi.turn_id !== khoiCu : Boolean(vanTayKhoi) && vanTayKhoi !== chuKhoiCu);

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
  let soVong = Number(docCo(argv, "so-vong", "0"));
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

  /* --tiep — CHẠY TIẾP, không chạy lại. Đọc chỗ dừng từ nhật ký thay vì bắt người nhớ.
     Đặt SAU `mkdirSync` và TRƯỚC khoá một-bản-chạy: nó chỉ đọc, và nếu thư mục chưa có nhật
     ký thì đây là lượt chạy đầu — nói ra rồi chạy bình thường, không coi là lỗi. */
  let tuNhatKy = "";
  if (argv.includes("--tiep")) {
    let cu = "";
    try { cu = fs.readFileSync(path.join(thuMuc, "nhat-ky.jsonl"), "utf8"); } catch { /* lần đầu */ }
    const { khoiCu: dungO, daGui: daXong } = docNhatKy(cu);
    if (!daXong) {
      console.log("--tiep: nhật ký chưa có lượt gửi nào — chạy như một lượt mới.");
    } else {
      tuNhatKy = dungO;
      const conLai = soVong - daXong;
      if (conLai < 1) {
        console.error(`--tiep: thư mục nhật ký này đã ghi ${daXong} lượt gửi, --so-vong là ${soVong} — hết ngân sách vòng.`);
        /* NÓI RA CHỖ DỄ HIỂU NHẦM: nhật ký là tệp CHỈ-THÊM và nó CỘNG DỒN qua mọi lượt chạy
           cùng tên chuỗi, không reset theo lượt. Nên con số trên là "từ trước tới nay", không
           phải "lượt chạy vừa rồi" — người đọc mà tưởng là lượt vừa rồi sẽ thấy nó vô lý. */
        console.error("Con số đó CỘNG DỒN qua mọi lượt chạy cùng tên chuỗi, không phải của riêng lượt vừa rồi.");
        console.error("Muốn chạy thêm: gõ --so-vong lớn hơn, hoặc đặt một TÊN CHUỖI MỚI cho một việc mới.");
        console.error("Đó là một quyết định, không phải hệ quả phụ của việc script chết.");
        process.exit(2);
      }
      console.log(`--tiep: đã gửi ${daXong} vòng, còn ${conLai}. Nối từ lượt "${dungO || "(không rõ)"}".`);
      soVong = conLai;
    }
  }

  /* B-61 — MỘT BẢN CHẠY MỘT LÚC. 10/09 hai tiến trình chạy song song trên cùng một tab: nhật
     ký đan xen thành vô nghĩa, hai lượt gửi cùng một prompt cách nhau 59 giây, và chúng nạp
     lại tab của nhau giữa lúc GPT đang sinh. Không có prompt trùng nào vào hội thoại — chốt
     `RUN_ACTIVE` chặn được — nhưng nó chặn TÌNH CỜ: đọc-lại-thấy-đã-bay chứng minh MỘT lượt
     gửi đã bay, không chứng minh LƯỢT CỦA TÔI đã bay. Một tiến trình thì hai câu đó trùng
     nhau; hai tiến trình thì không. `wx` là phép kiểm-và-tạo nguyên tử của hệ tệp. */
  const soKhoa = path.join(thuMuc, "DANG-CHAY.json");
  const datKhoa = () => fs.writeFileSync(soKhoa,
    JSON.stringify({ pid: process.pid, tu: new Date().toISOString(), nhan }, null, 1), { flag: "wx" });
  try {
    datKhoa();
  } catch (e) {
    if (e?.code !== "EEXIST") throw e;
    let tho = "(không đọc được)";
    let cu = null;
    try { tho = fs.readFileSync(soKhoa, "utf8"); cu = JSON.parse(tho); } catch { /* giữ nguyên */ }
    /* B-77 — THU LẠI KHOÁ MỒ CÔI. Chỉ khi chủ cũ CHẮC CHẮN đã chết. Lần đặt lại vẫn dùng `wx`,
       nên nếu một bản chạy khác vừa chen vào giữa hai câu lệnh này thì nó ném EEXIST lần nữa
       và ta từ chối như cũ — cửa nguyên tử không bị nới ra ở đâu cả. */
    if (cu && !conSong(cu.pid)) {
      console.log(`khoá mồ côi: tiến trình ${cu.pid} (từ ${cu.tu || "?"}) đã chết — thu lại và chạy tiếp.`);
      try { fs.rmSync(soKhoa, { force: true }); datKhoa(); } catch (e2) {
        console.error(`Thu khoá mồ côi không xong (${e2?.code || e2?.message}) — có bản chạy khác vừa chen vào.`);
        process.exit(3);
      }
    } else {
      console.error(`ĐÃ CÓ MỘT BẢN CHẠY GIỮ THƯ MỤC NÀY: ${String(tho).replace(/\s+/g, " ").trim()}`);
      console.error(`Nó chết rồi thì xoá tay: ${soKhoa}`);
      process.exit(3);
    }
  }
  const traKhoa = () => { try { fs.unlinkSync(soKhoa); } catch { /* đã mất thì thôi */ } };
  process.on("exit", traKhoa);
  for (const tinHieu of ["SIGINT", "SIGTERM"]) process.on(tinHieu, () => { traKhoa(); process.exit(130); });

  /* NGHE PHÍM. Chỉ khi đầu vào là một cửa sổ thật: chạy từ một script khác, hoặc đường ống, thì
     `stdin` không phải TTY và `setRawMode` sẽ ném. Không có TTY thì cờ `DUNG` vẫn dùng được. */
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (phim) => {
      const k = String(phim);
      /* RAW MODE NUỐT Ctrl+C — phải tự bắt lại, nếu không cửa sổ này thành thứ không thoát được
         bằng phản xạ quen thuộc nhất, và người ta sẽ đóng cửa sổ (= giết ngang). 0x03 là Ctrl+C. */
      if (k === "\u0003") { batDung("Ctrl+C"); return; }
      if (k === "d" || k === "D" || k === "q" || k === "Q") batDung(`đã bấm "${k}"`);
    });
    console.log('  Bấm "d" để DỪNG chuỗi này (dừng mềm: ghi nốt nhật ký rồi thoát). Ctrl+C cũng vậy.');
  }

  const soNhatKy = path.join(thuMuc, "nhat-ky.jsonl");
  const ghi = (o) => fs.appendFileSync(soNhatKy, JSON.stringify({ luc: new Date().toISOString(), ...o }) + "\n");

  /* ═══ RANH GIỚI CỦA HỆ THỐNG — ĐỪNG GỠ, ĐỪNG HẠ ══════════════════════════════════════
   *
   * SỰ CỐ THẬT 12/09/2026, profile `kaito`. Bộ chạy gặp `RECEIVER_LOST` và thử lại ĐỀU 4 giây
   * không giãn, không trần: ~900 lượt gõ cửa trong 60 phút. Ngay sau đó ChatGPT trả
   * `SECURITY_HARD_STOP` — đòi CAPTCHA, xác minh con người, báo "hoạt động bất thường". Đức
   * phải tự ngồi gõ CAPTCHA mới chạy lại được, và cả buổi chiều mất vào việc gỡ hậu quả.
   *
   * ĐỨC CHỐT 12/09: *"đọc vài trăm lần chỉ trong vài chục giây thì là spam rồi còn gì. Hãy đọc
   * và maintain từ tốn thôi."* Và: mọi lần dính CAPTCHA phải được ghi lại và tô đậm như một
   * RANH GIỚI của hệ thống, để không bao giờ lặp lại.
   *
   * VÌ SAO SÀN NẰM Ở ĐÂY, không nằm ở `doc()`:
   * `goi()` là cửa DUY NHẤT mọi lượt RPC đi qua — đọc, ping, nạp lại, gửi. Đặt sàn ở `doc()`
   * chỉ che được lượt ĐỌC; ping và nạp-lại vẫn bắn tự do, và một vòng lặp lỗi ở đường ping sẽ
   * dựng lại đúng sự cố trên bằng một cửa khác. Sàn ở đây là sàn THẬT, kể cả cho đường gọi
   * chưa ai viết. Cùng hình dạng với `runPrompt()` bên `content.js`: một chỗ hẹp, một luật.
   *
   * BỐN THỨ ĐANG GIỮ RANH GIỚI NÀY — gỡ bất kỳ cái nào là mở lại cửa đã làm hỏng:
   *   ⑴ SÀN dưới đây: không hai lượt RPC nào sát nhau hơn `SAN_GIUA_HAI_LUOT_DOC_MS`.
   *   ⑵ GIÃN DẦN khi hỏng: `nhipDocHong` 15s → 120s, ≤ ~34 lượt/giờ (trước: ~900).
   *   ⑶ NGHE TIỆN ÍCH: `state: HARD_STOP` thì DỪNG, không thử lại — chính tiện ích viết
   *      *"auto-retrying would just fail every remaining job back-to-back."*
   *   ⑷ TRẦN VÒNG `TRAN_VONG` và trần phút: một vòng lặp không trần trên một trang có thể
   *      sinh tiền là loại lỗi không sửa lại được sau khi nó chạy.
   *
   * ĐO TỪ LÚC LƯỢT TRƯỚC XONG, không phải lúc nó bắt đầu: một lượt có thể mất 30 giây rồi mới
   * hết giờ, và đo từ lúc bắt đầu thì sàn đã tiêu hết vào chính thời gian chờ đó.
   * ══════════════════════════════════════════════════════════════════════════════════════ */
  let mocGoiXong = 0;
  const goi = (args) => {
    const con = SAN_GIUA_HAI_LUOT_DOC_MS - (Date.now() - mocGoiXong);
    if (mocGoiXong && con > 0) {
      /* Ngủ ĐỒNG BỘ: `goi` được gọi từ cả chỗ có `await` lẫn chỗ không, và một cửa an toàn chỉ
         chặn được ở nửa số lối vào thì không phải là cửa. `Atomics.wait` chặn thật, không quay
         vòng bận. */
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, con);
    }
    let out = "";
    try {
      out = execFileSync("node", [CLI, ...args, "--pairing", pairing, ...(target ? ["--target", target] : [])], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { out = String(e.stdout || ""); }
    mocGoiXong = Date.now();
    try { return JSON.parse(out); } catch { return { ok: false, error: { code: "KHONG_PHAI_JSON" } }; }
  };
  /* B-79 — DỪNG NGAY TRONG CỬA SỔ ĐANG CHẠY. Đức nêu 12/09: *"dùng script dừng riêng tôi thấy
   * khó dùng vì phải gõ tay tên luồng dẫn đến sai."* Cửa sổ này BIẾT nó là chuỗi nào, nên nó
   * là chỗ đúng để dừng chính nó — không phải gõ lại một cái tên.
   *
   * DỪNG MỀM, y hệt cờ `DUNG`: đặt cờ rồi để vòng lặp tự dừng ở đầu lượt kế tiếp, ghi đủ nhật
   * ký, trả khoá. KHÔNG giết ngang — bộ chạy có thể đang ở giữa một lượt GỬI, và giết ngang thì
   * không ai biết tin nhắn đã bay chưa. Đó đúng là chỗ không được đoán.
   *
   * `execFileSync` khoá vòng lặp sự kiện, nên phím bấm giữa một lượt gửi chỉ được đọc SAU khi
   * lượt ấy xong. Đó là tính năng, không phải hạn chế: không cách nào cắt ngang một lượt gửi. */
  let dungTay = null;
  let danhThuc = null;
  const ngu = (ms) => new Promise((r) => {
    /* Đánh thức được. Nhịp giãn tới 2 phút (B-78), nên nếu chỉ `setTimeout` trần thì bấm dừng
       xong còn ngồi chờ hai phút — và người ta sẽ đóng cửa sổ, tức giết ngang. */
    const t = setTimeout(() => { danhThuc = null; r(); }, ms);
    danhThuc = () => { clearTimeout(t); danhThuc = null; r(); };
  });
  const batDung = (vi) => {
    if (dungTay) return;
    dungTay = vi;
    console.log(`\n  ${vi} — dừng ở đầu lượt kế tiếp, đang ghi nốt nhật ký…`);
    if (danhThuc) danhThuc();
  };

  /* Lượt đọc. Nhịp KHÔNG nằm ở đây — sàn chống-spam nằm ở `goi()`, cửa duy nhất mọi lượt RPC
     đi qua (đọc · ping · nạp lại · gửi). Xem khối "RANH GIỚI CỦA HỆ THỐNG" ở `goi()`: đặt sàn
     riêng cho lượt đọc chỉ che được một trong bốn đường, và ba đường còn lại đủ để dựng lại
     đúng sự cố CAPTCHA ngày 12/09 bằng một cửa khác.

     KHÔNG chạm `--limit 4 --max-chars 20000`: đó là CỠ một lượt đọc, không phải TẦN SUẤT. */
  const doc = async () => goi(["chat-read", "--limit", "4", "--max-chars", "20000"]);

  const hanChung = Date.now() + tranPhut * 60000;
  /* `--tu-turn` gõ tay THẮNG chỗ dừng đọc từ nhật ký: người khai tường minh thì người đúng.
     Không có thì dùng chỗ dừng của `--tiep`; không có nữa thì rỗng (chạy mới). */
  let khoiCu = docCo(argv, "tu-turn", "") || tuNhatKy;
  let daGui = 0;
  /* B-81 — ĐÃ TỪNG THẤY KHỐI CHƯA, tính cho CẢ lượt chạy chứ không riêng một vòng. Đây là thứ
     phân biệt "chuỗi chạy hết" với "hội thoại chưa có giao kèo nối vòng". */
  let daThayKhoi = false;
  /* B-83 — 60 ky tu dau cua khoi VUA GUI, de nhan ra chinh tin nhan cua minh o vong sau khi
     luot doc ngay sau khi gui bi het gio. Xem khoi ly le o `canhTab`. */
  let chuToiVuaGui = "";
  /* B-87 - 200 ky tu dau cua khoi DA GUI o vong truoc, de chong gui trung khi id luot chua
     chot (id tam khong doi giua cac luot). Xem khoi ly le o `quyetDinh`. */
  let chuKhoiCu = "";
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

  /* NHỚ THÔNG SỐ LẦN NÀY, để lần sau không phải gõ lại — Đức nêu 12/09.
     Ghi ở THƯ MỤC GỐC của kho nhật ký, không trong thư mục của chuỗi: cửa sổ đóng mất rồi thì
     người ta không còn nhớ nổi tên chuỗi, mà tên chuỗi lại chính là thứ cần để tìm thư mục.
     Dạng `khoá=giá trị` chứ KHÔNG sinh ra một tệp `.cmd` chạy được: tệp này do một cái tên
     người gõ đẻ ra, và sinh mã chạy được từ chữ người gõ là cửa tiêm lệnh. `.bat` chỉ đọc nó
     bằng `for /f`. Lọc luôn `% ! " <CR> <LF>` — bốn thứ làm vỡ hoặc bẻ hướng một lượt `set`. */
  const sachChoBat = (v) => String(v ?? "").replace(/[%!"\r\n]/g, "");
  try {
    fs.writeFileSync(path.join(path.dirname(thuMuc), "lan-truoc.txt"),
      [`NHAN=${sachChoBat(nhan)}`, `VONG=${soVong}`, `PHUT=${tranPhut}`,
        `DICH=${sachChoBat(target)}`, `DIA_CHI=${sachChoBat(urlMuon)}`, ""].join("\r\n"));
  } catch { /* không ghi được thì thôi — đây là tiện nghi, không phải điều kiện chạy */ }

  for (let vong = 1; vong <= soVong; vong += 1) {
    let daNapLai = false;
    let daThayDangChay = false;
    let soLanYen = 0;
    let khoi = null;
    let nhip = 0;
    let docHong = 0;
    /* B-89 — "LIÊN TIẾP" MỘT MÌNH ĐỌC RA NHƯ ĐANG TREO.
     *
     * Dòng in chỉ có bộ đếm LIÊN TIẾP, mà bộ đếm ấy về 0 ở mỗi lượt đọc được — còn lượt đọc
     * được thì bị bóp nhịp `nhip % 4` nên phần lớn KHÔNG in ra. Kết quả trên màn hình 13/09:
     *     vòng 1 · đọc hỏng 1 lượt liên tiếp
     *     vòng 1 · đọc hỏng 1 lượt liên tiếp
     *     vòng 1 · đọc hỏng 1 lượt liên tiếp
     * Đọc ra như một vòng lặp đang nện cùng một chỗ. Sự thật ngược lại: giữa mỗi cặp có một
     * lượt đọc THÀNH CÔNG, `soLanYen` vẫn đang leo, chuỗi vẫn đang tiến. Tôi đã mất một vòng
     * chẩn đoán để phân biệt hai cảnh đó, và cách duy nhất là đo khoảng cách thời gian giữa
     * hai dòng — thứ mà người đọc nhật ký không làm được.
     *
     * Một con số nữa là đủ: liên tiếp KHÁC tổng thì tức là có lượt đọc được xen vào. */
    let hongTong = 0;

    while (true) {
      /* HAI CỬA DỪNG, cùng một đường ra. Phím bấm (B-79) là cửa thường dùng; cờ `DUNG` giữ lại
         cho lượt chạy không có cửa sổ — chạy từ một script khác thì `stdin` không phải TTY. */
      if (dungTay) { lyDo = `NGUOI_DUNG (${dungTay})`; break; }
      if (fs.existsSync(path.join(thuMuc, "DUNG"))) { lyDo = "NGUOI_DUNG"; break; }
      if (Date.now() > hanChung) { lyDo = "QUA_TRAN_PHUT"; break; }

      const d = await doc();
      if (!d.ok) {
        /* SAI TRANG KHÔNG PHẢI PANEL BẬN — và chờ thêm không bao giờ chữa được nó.
           Đo 10/09: một chat MỚI (chưa gõ câu nào) nằm ở `chatgpt.com/`, không phải
           `chatgpt.com/c/<id>`, nên `chat.read` từ chối bằng `WRONG_SURFACE`. Bản trước gộp
           mọi lỗi đọc vào một rọ và in "panel đang bận" — một chẩn đoán SAI BỆNH, bảo người
           ta ngồi đợi trong khi việc cần làm là mở đúng hội thoại. `system.ping` là cửa duy
           nhất còn trả lời được ở trạng thái này, nên hỏi nó xem tab đang ở đâu rồi nói thật. */
        if (/WRONG_SURFACE/.test(JSON.stringify(d.error ?? ""))) {
          const p = goi(["ping", "--request-id", khoaAnToan(nhan, `-v${vong}-ping`)]);
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
        hongTong += 1;
        /* IN CHẨN ĐOÁN NẾU CÓ. Từ 11/09 host kèm `diagnosis` + `remedy` vào lượt hết giờ của
           CHÍNH nó. Bản trước in cứng "panel đang bận" cho mọi lỗi đọc — một câu đoán, và nó
           che mất câu thật ngay bên dưới. Không có chẩn đoán thì nói "chưa rõ vì sao", đừng
           đoán hộ: `REQUEST_TIMEOUT` do tiện ích tự sinh (hết hạn chờ side panel) hiện VẪN
           chưa mang chẩn đoán — xem `B-50`. */
        const cd = d.error?.details || {};
        const nhipHong = nhipDocHong(docHong);
        if (nhipHong.inRa) {
          console.log(`  vòng ${vong} · đọc hỏng ${docHong} lượt liên tiếp`
            + `${hongTong > docHong ? ` · ${hongTong} lượt hỏng cả vòng, GIỮA CHÚNG có lượt đọc được` : ""}`
            + ` (${d.error?.code})`
            + `${cd.diagnosis ? ` — ${cd.diagnosis}` : " — chưa rõ vì sao"}`);
          if (cd.remedy) console.log(`     ${cd.remedy}`);
          /* IN `debug`. `sidepanel.js:707` CỐ Ý gửi nguyên nhân thật cho agent nội bộ qua
             `details.debug`; bản trước chỉ in `diagnosis`+`remedy` nên nó vứt đúng câu trả lời
             đi rồi in "chưa rõ vì sao" — đo 12/09, Đức nhìn 41 lượt không có một chữ nào dùng
             được. Cắt 300 ký tự: đây là vết ngăn xếp, không phải bài đọc. */
          if (cd.debug) console.log(`     debug: ${String(cd.debug).slice(0, 300)}`);
          /* GHI NHẬT KÝ, cùng nhịp với dòng in — KHÔNG ghi cả 900 lượt. Bản trước không ghi
             gì cả: sau 5 phút hỏng liên tục nhật ký có ĐÚNG MỘT dòng `BAT_DAU`, nên một bản
             chạy đang nện 900 lượt nhìn từ nhật ký KHÔNG phân biệt được với một bản đã treo
             chết. Nhịp tim in ra màn hình không cứu được: đóng cửa sổ là mất. */
          ghi({ su_kien: "DOC_HONG", vong, so_luot: docHong, hong_tong: hongTong, ma: d.error?.code || null,
            diagnosis: cd.diagnosis || null, debug: cd.debug ? String(cd.debug).slice(0, 300) : null });
        }
        if (nhipHong.hoiPing) {
          const p = goi(["ping", "--request-id", khoaAnToan(nhan, `-v${vong}-ping${docHong}`)]);
          const ch = chanDung(p);
          if (ch.dung) {
            lyDo = ch.vi;
            console.log(`  vòng ${vong}: ${ch.vi}`);
            if (ch.khuyen) console.log(`     thử lại? ${ch.khuyen}`);
            console.log("  Nạp lại tab ChatGPT của profile này, chờ ô nhập hiện ra, rồi chạy lại.");
            ghi({ su_kien: "DUNG_CUNG", vong, vi: ch.vi, so_luot: docHong });
            break;
          }
        }
        await ngu(nhipHong.treMs);
        continue;
      }
      docHong = 0;
      const r = d.result;

      /* B-63 — CANH TAB TRƯỚC MỌI THỨ KHÁC. Đặt ngay sau lượt đọc và trước cả `quyetDinh`:
         mọi nhánh phía dưới đều có thể dẫn tới một lượt gửi, nên phép kiểm này phải chặn
         trước, không phải chặn song song. */
      const luotNguoi = (r.turns || []).filter((t) => t.role === "user");
      const idLuotNguoiCuoi = luotNguoi.length ? luotNguoi[luotNguoi.length - 1].id : null;
      const chuLuotNguoiCuoi = luotNguoi.length ? String(luotNguoi[luotNguoi.length - 1].text || "") : "";
      if (urlGhim === null && r.url) { urlGhim = r.url; }
      /* B-80 — KHÔNG GHIM MỐC BẰNG `null`. Bắt tại trận 12/09, chuỗi "Prompt engineer 01":
         lượt đọc đầu hỏng vì `RECEIVER_LOST` (tab đang nạp lại); lượt kế tiếp THÀNH CÔNG nhưng
         trang chưa dựng xong nên `turns` rỗng, `idLuotNguoiCuoi` là `null`. Mốc bị ghim bằng
         `null`, và lượt sau thấy lượt gõ thật thì `null !== "bbb21bd0…"` → báo `NGUOI_DANG_DUNG`
         và giết chuỗi sau 31 giây, trong khi KHÔNG AI gõ gì cả.

         DANH SÁCH RỖNG NGHĨA LÀ "TÔI CHƯA NHÌN THẤY", KHÔNG PHẢI "KHÔNG CÓ LƯỢT NÀO". Và lượt
         đọc ngay sau một lượt `RECEIVER_LOST` là lượt đọc ÍT ĐÁNG TIN NHẤT trong cả lượt chạy —
         đúng lúc bản cũ đem nó ra làm chuẩn cho mọi phép so về sau.

         Mép này KHÔNG bị nới: mốc chưa ghim thì `canhTab` cũng chưa so gì, mà lượt GỬI đầu tiên
         nằm sau đó — nên không có cửa sổ nào để một lượt gõ lạ lọt qua mà chuỗi vẫn gửi đè. */
      if (mocLuotNguoi === undefined && idLuotNguoiCuoi) { mocLuotNguoi = idLuotNguoiCuoi; }
      const canh = canhTab({ url: r.url, urlGhim, idLuotNguoiCuoi, mocLuotNguoi, chuLuotNguoiCuoi, chuToiVuaGui });
      /* Nhan ra tin nhan cua chinh minh thi NHICH MOC ngay — neu khong, moi vong sau deu phai
         hoi lai cung mot cau, va mot luot nguoi go that xen vao giua se bi do cho tin nhan cu. */
      if (canh.cuaToi) { mocLuotNguoi = idLuotNguoiCuoi; }
      if (canh.dung) {
        console.log(`  vòng ${vong}: ${canh.vi}`);
        /* GHI CẢ HAI ĐẦU CỦA PHÉP SO, không chỉ câu kết luận. Lượt 14:31 ngày 12/09 chỉ ghi
           `vi`, nên "có lượt gõ lạ" đọc ra y hệt nhau ở hai ca hoàn toàn khác nhau: người ta
           gõ thật, và mốc bị ghim bằng `null` (B-80). Phải đọc mã nguồn mới phân biệt được —
           và đó là lúc nhật ký thất bại đúng việc nó sinh ra để làm. */
        ghi({ su_kien: "CANH_TAB", vong, vi: canh.vi, moc: mocLuotNguoi ?? null, thay: idLuotNguoiCuoi ?? null, url: r.url ?? null, url_ghim: urlGhim ?? null });
        lyDo = canh.vi;
        break;
      }

      if (r.generating === true) { daThayDangChay = true; soLanYen = 0; } else soLanYen += 1;

      const luotTL = [...(r.turns || [])].reverse().find((t) => t.role === "assistant");
      if (r.last_copy_block?.found) daThayKhoi = true;
      const qd = quyetDinh({ generating: r.generating, khoi: r.last_copy_block, khoiCu, chuKhoiCu, daNapLai, daThayDangChay, soLanYen, idLuotTraLoiCuoi: luotTL?.id ?? null });
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
        goi(["chat-reload", "--request-id", khoaAnToan(nhan, `-v${vong}-reload`)]);
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
      if (qd.viec === "DUNG") {
        lyDo = qd.vi;
        /* B-77 — HỎI PING TRƯỚC KHI DÁM NÓI "XONG". Đo 12/09, chuỗi "mo rong scouter 2":
           bộ chạy đọc được trang, không thấy khối mới, nạp lại một lần, vẫn không thấy, rồi
           chấm `HET_CHUOI` và **thoát 0 — tức THÀNH CÔNG**. Ping cùng lúc trả lời
           `state: HARD_STOP` · `SECURITY_HARD_STOP`: ChatGPT đang đòi CAPTCHA, và một trang
           đang đòi CAPTCHA thì đọc ra "không có khối" là chuyện đương nhiên.

           Hai câu đó khác nhau ở chỗ chí mạng: "chuỗi đã hết" là XONG VIỆC, "trang bị chặn"
           là CHƯA LÀM ĐƯỢC GÌ. Bản trước gộp cả hai vào một mã thoát 0, nên một lượt bị chặn
           nhìn từ ngoài y hệt một lượt chạy trọn. Nhánh HARD_STOP ở đường đọc-hỏng KHÔNG cứu
           được ca này: ở đây lượt đọc THÀNH CÔNG, nên nó không bao giờ chạy tới.

           `lyDo` đổi thì mã thoát tự đổi theo — dòng `process.exit` cuối file chỉ trả 0 cho
           `HET_SO_VONG` và `HET_CHUOI`. */
        const p = goi(["ping", "--request-id", khoaAnToan(nhan, `-v${vong}-ping-dung`)]);
        const ch = chanDung(p);
        if (ch.dung) {
          lyDo = ch.vi;
          console.log(`  vòng ${vong}: ${ch.vi}`);
          if (ch.khuyen) console.log(`     thử lại? ${ch.khuyen}`);
          ghi({ su_kien: "DUNG_CUNG", vong, vi: ch.vi, thay_vi: qd.vi });
        }
        /* B-81 — "CHUỖI ĐÃ HẾT" ≠ "CHUỖI CHƯA BAO GIỜ BẮT ĐẦU". Đức nêu 12/09:
           *"tôi thấy ta chưa bắt được 1 chat đã có text sẵn."*

           Đo cùng lúc trên hội thoại "Prompt engineer 01": 4 lượt, câu trả lời cuối dài 2.719
           ký tự, và `blocks_in_turn: 0` — GPT trả lời bằng văn xuôi thuần, không có khối copy
           nào. Bộ chạy đọc ĐÚNG: không có gì để chuyển tiếp. Nhưng nó báo
           `HET_CHUOI — đã nạp lại mà vẫn không có khối mới` rồi **thoát 0**, đọc y như một
           chuỗi vừa chạy trọn vẹn.

           Hai ca hoàn toàn khác nhau, và phân biệt được bằng đúng hai biến đã có:
             · ĐÃ gửi vòng nào, hoặc ĐÃ từng thấy khối ⇒ chuỗi chạy hết thật. Thoát 0.
             · CHƯA gửi vòng nào VÀ chưa từng thấy khối ⇒ hội thoại này KHÔNG CÓ giao kèo nối
               vòng. Chưa làm được gì cả. Thoát 1, và nói ra phải làm gì.

           Không đoán hộ nội dung trang: chỉ đếm "có khối hay không", không đọc khối nói gì. */
        else if (daGui === 0 && !daThayKhoi) {
          /* NÓI ĐÚNG ĐIỀU ĐO ĐƯỢC: "tôi KHÔNG THẤY khối", chứ không phải "không CÓ khối".
             Sửa 12/09 ngay trong ngày ship, vì bản đầu nói sai ca thật của Đức: màn hình có một
             nút copy rành rành, còn bộ chạy báo "hội thoại chưa có giao kèo, hãy dán vào" — đẩy
             người ta đi dán lại thứ họ đã có. Nguyên nhân thật: câu trả lời đóng gói trong một
             thẻ **canvas**, mà bộ dò khối neo vào `answerBlock: ["pre"]` nên mù với nó (`pre = 0`,
             `nutCopy` có `aria="Copy"` + `aria="Open editor"` — xem B-82).
             Hai khả năng, nêu CẢ HAI và nêu cách phân biệt. Đừng bắt người đoán. */
          lyDo = "KHONG_THAY_KHOI — chưa gửi vòng nào và chưa đọc ra khối nối vòng nào";
          console.log(`  vòng ${vong}: ${lyDo}`);
          console.log("  Chuỗi chỉ chuyển tiếp NGUYÊN VĂN khối copy cuối câu trả lời. Hai khả năng:");
          console.log("   ⑴ hội thoại chưa có giao kèo — dán khối \"GIAO KÈO NỐI VÒNG\" (xem AI-OPERATOR-GUIDE.md) rồi chạy lại;");
          console.log("   ⑵ CÓ khối trên màn hình nhưng bộ đọc không thấy (ví dụ canvas, không phải khối mã).");
          console.log("  Phân biệt: chạy `bridge-cli.mjs dom-probe --target <profile>` và xem `answerScope.pre`.");
          console.log("  `pre: 0` mà màn hình vẫn có nút copy ⇒ là khả năng ⑵, đừng dán lại gì cả.");
          ghi({ su_kien: "CHUA_CO_GIAO_KEO", vong, thay_vi: qd.vi });
        }
        break;
      }
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
    /* B-88 — KIÊN NHẪN PHẢI ĐẶT ĐÚNG CHỖ NÓ CẦN.
     *
     * Bản trước lặp 12 lượt, nhưng `return` ngay ở lượt ĐỌC ĐƯỢC đầu tiên. Tức toàn bộ sự kiên
     * nhẫn ấy dành cho một khả năng duy nhất: lượt đọc HỎNG. Khả năng còn lại — đọc được nhưng
     * trang CHƯA KỊP DỰNG lượt vừa gửi — không được cho một giây nào.
     *
     * Đo live 13/09, hồ sơ `anhducds`, tab chạy nền:
     *     18:24:00  GUI_LOI_DOC_LAI lần 1 · da_bay: false
     *     18:27:00  GUI_LOI_DOC_LAI lần 2 · da_bay: false
     *     KET_THUC  da_gui: 0 · "hai lượt gửi, hai lượt đọc lại, đều không thấy" · thoát 1
     * Đọc lại hội thoại ngay sau đó: `user cb71b545-… · 164 ký tự` — ĐÚNG khối ấy, ĐÚNG một
     * bản, và GPT đang trả lời nó. Tin nhắn đã bay. Bộ chạy báo thất bại toàn phần.
     *
     * Cái giá không phải là một dòng nhật ký sai. `chay-chuoi.bat` sau đó mời `[m] chạy MỚI`,
     * và chạy mới trên một hội thoại vừa gửi thành công sẽ GỬI LẠI đúng khối đó — một lượt
     * gửi trùng, thứ mà luật exact-once dựng ra để chặn. Một chẩn đoán sai ở đây đẻ ra đúng
     * cái lỗi mà cả tầng an toàn này tồn tại để tránh.
     *
     * Nên: thấy thì `true` NGAY; `false` chỉ được trả khi đã nhìn hết kiên nhẫn mà vẫn không
     * thấy. Hướng sửa này chỉ làm bộ chạy gửi lại ÍT hơn, không bao giờ nhiều hơn — nó không
     * nới luật, nó đòi bằng chứng thật trước khi luật được viện tới. Chưa đọc nổi một lượt nào
     * thì vẫn `null` như cũ: mù thì dừng, người nhìn. */
    const daVaoChua = async () => {
      await ngu(45000);
      let docDuoc = false;
      for (let i = 0; i < 12; i += 1) {
        const lai = await doc();
        if (lai.ok) {
          docDuoc = true;
          const hoiCuoi = [...lai.result.turns].reverse().find((t) => t.role === "user");
          if (hoiCuoi && hoiCuoi.text.startsWith(khoi.text.slice(0, 60))) return true;
        }
        /* Cộng thêm vào SÀN của `doc()`, không thay nó: mỗi vòng ở đây cách nhau ~20 giây chứ
           không phải 10. Đừng đọc con số này một mình mà kết luận nhịp — sàn mới là thứ cưỡng chế. */
        await ngu(10000);
      }
      return docDuoc ? false : null;
    };

    /* NGHỈ GIỮA ĐỌC VÀ GÕ. Đặt ở đây — SAU khi đã ghi tệp tham số, TRƯỚC lượt gửi đầu — nên
       nó chỉ giãn lượt gửi thật. Lượt gửi lại ở nhánh lỗi KHÔNG đi qua đây: nó đã chờ 45 giây
       đọc lại, thêm nghỉ vào đó chỉ làm cửa sổ mù dài thêm. */
    const treGui = treNgauNhien();
    console.log(`  vòng ${vong}: nghỉ ${(treGui / 1000).toFixed(1)}s trước khi dán`);
    await ngu(treGui);

    const khoaGui = khoaAnToan(nhan, `-v${vong}`);
    const lan1 = goi(["chat-say", "--params-file", fParam, "--request-id", khoaGui]);
    let ok1 = Boolean(lan1.ok), daBay1 = false, ok2 = false, daBay2 = false;
    if (!ok1) {
      daBay1 = await daVaoChua();
      ghi({ su_kien: "GUI_LOI_DOC_LAI", vong, lan: 1, ma: lan1.error?.code || null, da_bay: daBay1 });
      // Chỉ gửi lại khi đọc được VÀ không thấy. `null` (không đọc được) đi thẳng xuống
      // `ketLuanGui` để dừng — gửi lại lúc mù là đúng thứ exact-once cấm.
      if (daBay1 === false) {
        const lan2 = goi(["chat-say", "--params-file", fParam, "--request-id", khoaGui]);
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
    chuKhoiCu = String(khoi.text ?? "").slice(0, 200);
    /* NHÍCH MỐC SANG ĐÚNG LƯỢT VỪA GỬI — và chỉ khi nhận ra nó là lượt của mình. Không được
       nhích mù (xoá mốc đi để nó tự ghim lại): nếu người gõ ngay sau lượt tôi,
       nhích mù sẽ nhận lượt của người làm mốc và mép B-63 mất tác dụng đúng lúc cần nhất.
       So bằng 60 ký tự đầu của khối, giống `daVaoChua` — không so bằng từ khoá. */
    /* B-83 — NHỚ CHỮ MÌNH VỪA GỬI, TRƯỚC lượt đọc lại. Đặt ở đây chứ không đặt trong nhánh
       `sauGui.ok`: đúng cái ca hỏng là lượt đọc ấy HẾT GIỜ, và khi đó nhánh kia không chạy. */
    chuToiVuaGui = khoi.text.slice(0, 60);
    const sauGui = await doc();
    if (!sauGui.ok) {
      /* Đọc không được thì KHÔNG kết luận gì — mốc để nguyên, và vòng sau `canhTab` sẽ nhận ra
         tin nhắn của chính mình bằng chữ rồi tự nhích mốc. Nói ra để đừng ai đọc nhật ký thành
         "đã kiểm và thấy ổn". */
      console.log(`  vòng ${vong}: đọc lại sau khi gửi không được (${sauGui.error?.code || "?"}) — để vòng sau tự nhận ra tin nhắn của mình`);
      ghi({ su_kien: "SAU_GUI_DOC_HONG", vong, ma: sauGui.error?.code || null });
    }
    if (sauGui.ok) {
      const cuoi = [...(sauGui.result.turns || [])].reverse().find((t) => t.role === "user");
      if (cuoi && cuoi.text.startsWith(khoi.text.slice(0, 60))) {
        mocLuotNguoi = cuoi.id;
      } else if (cuoi) {
        /* B-86 ⓑ — CHƯA THẤY MÌNH ≠ THẤY NGƯỜI KHÁC. Đo live 12/09 lúc 16:51:36, chuỗi
           "Prompt engineer 2": bộ chạy gửi xong, đọc lại 10 giây sau (sàn B-85), trang CHƯA
           KỊP dựng lượt vừa gửi, nên lượt người cuối cùng vẫn là lượt CŨ. Bản trước kết luận
           ngay `NGUOI_DANG_DUNG` và dừng chuỗi với `da_gui: 1` — trong khi không ai gõ gì.

           Đây là lần thứ BA cùng một hình dạng lỗi trong hai ngày (B-80: mốc ghim bằng `null`;
           B-83: lượt đọc sau khi gửi hết giờ). Cả ba đều là: **một thứ CHƯA ĐỌC RA bị xử như
           một thứ ĐỌC RA KHÁC ĐI.**

           Không kết luận ở đây nữa. Mốc để nguyên, và vòng sau `canhTab` tự phân xử bằng CHỮ:
           lượt của tôi thì nó nhận ra và nhích mốc (B-83); người gõ thật thì chữ không khớp và
           nó dừng đúng lúc đó. Mép KHÔNG bị nới — nó chỉ được dời sang chỗ có đủ dữ kiện. */
        console.log(`  vòng ${vong}: đọc lại sau khi gửi chưa thấy lượt của mình (lượt cuối: ${cuoi.id}) — để vòng sau phân xử bằng chữ`);
        ghi({ su_kien: "SAU_GUI_CHUA_THAY", vong, luot_cuoi: cuoi.id, moc: mocLuotNguoi ?? null });
      }
    }
    console.log(`  vòng ${vong}/${soVong}: đã gửi ${khoi.chars} ký tự — ${kl.vi}`);
    ghi({ su_kien: "DA_GUI", vong, ky_tu: khoi.chars, turn_id: khoi.turn_id, tre_ms: treGui, vi: kl.vi, text: khoi.text });
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

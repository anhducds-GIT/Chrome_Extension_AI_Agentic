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

  const goi = (args) => {
    let out = "";
    try {
      out = execFileSync("node", [CLI, ...args, "--pairing", pairing, ...(target ? ["--target", target] : [])], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
    } catch (e) { out = String(e.stdout || ""); }
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

  /* B-78 — SÀN GIỮA HAI LƯỢT ĐỌC. Đức chốt 12/09: *"đọc vài trăm lần trong vài chục giây thì
   * là spam rồi còn gì. Hãy đọc và maintain từ tốn thôi."*
   *
   * VÌ SAO ĐẶT Ở ĐÂY chứ không sửa từng chỗ: có BỐN đường đọc, mỗi đường tự chọn nhịp riêng
   * (đọc hỏng · chờ trả lời · đọc lại sau lượt gửi · soi mốc sau khi gửi). Vá từng nhịp thì
   * đường thứ năm thêm sau này lại tự chọn số của nó, và cái trần chung không ai canh. `doc()`
   * là cửa DUY NHẤT mọi lượt đọc đi qua, nên sàn đặt ở đây là sàn thật — kể cả cho đường chưa
   * viết. Đúng hình dạng của `runPrompt()` bên `content.js`: một chỗ hẹp, một luật.
   *
   * ĐO TỪ LÚC LƯỢT TRƯỚC XONG, không phải lúc nó bắt đầu. Một lượt `chat-read` có thể mất 30
   * giây rồi mới hết giờ; đo từ lúc bắt đầu thì sàn đã "tiêu" hết vào thời gian chờ đó và hai
   * lượt vẫn dính nhau. Đo từ lúc xong thì khoảng nghỉ là khoảng nghỉ thật.
   *
   * KHÔNG chạm `--limit 4 --max-chars 20000`: đó là cỡ một lượt đọc, không phải tần suất. */
  let mocDocXong = 0;
  const doc = async () => {
    const con = SAN_GIUA_HAI_LUOT_DOC_MS - (Date.now() - mocDocXong);
    if (mocDocXong && con > 0) await ngu(con);
    const kq = goi(["chat-read", "--limit", "4", "--max-chars", "20000"]);
    mocDocXong = Date.now();
    return kq;
  };

  const hanChung = Date.now() + tranPhut * 60000;
  /* `--tu-turn` gõ tay THẮNG chỗ dừng đọc từ nhật ký: người khai tường minh thì người đúng.
     Không có thì dùng chỗ dừng của `--tiep`; không có nữa thì rỗng (chạy mới). */
  let khoiCu = docCo(argv, "tu-turn", "") || tuNhatKy;
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
        /* IN CHẨN ĐOÁN NẾU CÓ. Từ 11/09 host kèm `diagnosis` + `remedy` vào lượt hết giờ của
           CHÍNH nó. Bản trước in cứng "panel đang bận" cho mọi lỗi đọc — một câu đoán, và nó
           che mất câu thật ngay bên dưới. Không có chẩn đoán thì nói "chưa rõ vì sao", đừng
           đoán hộ: `REQUEST_TIMEOUT` do tiện ích tự sinh (hết hạn chờ side panel) hiện VẪN
           chưa mang chẩn đoán — xem `B-50`. */
        const cd = d.error?.details || {};
        const nhipHong = nhipDocHong(docHong);
        if (nhipHong.inRa) {
          console.log(`  vòng ${vong} · đọc hỏng ${docHong} lượt liên tiếp (${d.error?.code})`
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
          ghi({ su_kien: "DOC_HONG", vong, so_luot: docHong, ma: d.error?.code || null,
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
    const daVaoChua = async () => {
      await ngu(45000);
      for (let i = 0; i < 12; i += 1) {
        const lai = await doc();
        if (lai.ok) {
          const hoiCuoi = [...lai.result.turns].reverse().find((t) => t.role === "user");
          return Boolean(hoiCuoi && hoiCuoi.text.startsWith(khoi.text.slice(0, 60)));
        }
        /* Cộng thêm vào SÀN của `doc()`, không thay nó: mỗi vòng ở đây cách nhau ~15 giây chứ
           không phải 5. Đừng đọc con số này một mình mà kết luận nhịp — sàn mới là thứ cưỡng chế. */
        await ngu(5000);
      }
      return null;
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
    /* NHÍCH MỐC SANG ĐÚNG LƯỢT VỪA GỬI — và chỉ khi nhận ra nó là lượt của mình. Không được
       nhích mù (xoá mốc đi để nó tự ghim lại): nếu người gõ ngay sau lượt tôi,
       nhích mù sẽ nhận lượt của người làm mốc và mép B-63 mất tác dụng đúng lúc cần nhất.
       So bằng 60 ký tự đầu của khối, giống `daVaoChua` — không so bằng từ khoá. */
    const sauGui = await doc();
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

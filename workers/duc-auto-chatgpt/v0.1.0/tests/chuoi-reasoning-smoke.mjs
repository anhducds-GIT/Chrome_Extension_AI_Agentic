/* `chuoi-reasoning.mjs` — bộ chạy trọn chuỗi reasoning, Đức chốt 2026-09-10.
 *
 * File này lái `quyetDinh()` THẬT (import từ chính file đã ship), không chép lại logic.
 * Toàn bộ phần "nghĩ" của bộ chạy nằm trong hàm đó và nó thuần, nên mọi mép dưới đây chạy
 * được mà không cần Bridge, không cần trang, không cần đồng hồ.
 *
 * Ba mép chịu tải nhất — cả ba đến từ lỗi ĐO ĐƯỢC ngày 10/09, không phải nghĩ ra:
 *   ⓑ `generating: false` ngay sau lượt gửi KHÔNG phải "đã xong" — nó là "chưa khởi động".
 *   ⓒ khối hiện ra lúc còn đang gõ dở (đo được 80 ký tự giữa chừng) không được gửi đi.
 *   ⓔ xong mà không có khối thì phải NẠP LẠI trước, không được kết luận DỪNG ngay (B-59:
 *      3/4 vòng đọc ra 48–173 ký tự không khối, nạp lại thì hiện đủ kèm khối).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { quyetDinh, ketLuanGui, canhTab, chanDung, conSong, nhipDocHong, hoiThoaiCua, luotDaChot, khoaAnToan, docNhatKy, TRAN_VONG, TRAN_KY_TU_KHOI, NGUONG_YEN, NGUONG_PING_DOC_HONG, TRE_DOC_HONG_TRAN_MS, SAN_GIUA_HAI_LUOT_DOC_MS } from "../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs";

const KHOI_CU = "11111111-1111-4111-8111-111111111111";
const khoiTot = (text = "prompt vòng sau", turn = "22222222-2222-4222-8222-222222222222") =>
  ({ found: true, chars: text.length, truncated: false, text, turn_id: turn, blocks_in_turn: 1 });

/* ---- ⓐ đường thẳng: đã chạy, đã xong, có khối mới → GỬI --------------------- */
{
  const qd = quyetDinh({ generating: false, khoi: khoiTot(), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.equal(qd.viec, "GUI");
}

/* ---- ⓑ `false` khi CHƯA THẤY trang chạy = chưa khởi động, không phải đã xong -
   Không có mép này thì ngay sau lượt gửi, bộ chạy đọc `generating:false` (trang chưa kịp bắt
   đầu), thấy khối CŨ vẫn còn đó, và... khối cũ không phải khối mới nên nó sẽ NẠP LẠI ngay
   giữa lúc GPT sắp trả lời. Mép này giữ nó đứng yên. */
{
  const qd = quyetDinh({ generating: false, khoi: khoiTot("cũ", KHOI_CU), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: false });
  assert.equal(qd.viec, "CHO", "chưa thấy trang sinh thì false là 'chưa khởi động'");
}

/* ---- ⓑ2 NHƯNG yên đủ lâu thì phải MỞ KHOÁ — lỗi treo 25 phút, 10/09 08:19 ---
   Bản đầu chỉ mở khoá khi đã THẤY `generating === true`. Nối bộ chạy vào một chuỗi mà câu trả
   lời ĐÃ XONG TỪ TRƯỚC thì điều đó không bao giờ xảy ra: nó chờ vô hạn, ghi đúng một dòng
   `BAT_DAU`, và nhìn từ ngoài y hệt một tiến trình đã chết. Mép ⓑ ở trên PASS suốt — nó ghim
   đúng giả định của tôi, không ghim thế giới. Đây là mép ghim thế giới. */
{
  const chuaDu = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: false, soLanYen: NGUONG_YEN - 1 });
  assert.equal(chuaDu.viec, "CHO", "chưa yên đủ lâu thì vẫn chờ");
  const duYen = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: false, soLanYen: NGUONG_YEN });
  assert.notEqual(duYen.viec, "CHO", "yên đủ lâu là bằng chứng trang đã lặng — KHÔNG được chờ tiếp, đây là chỗ bản đầu treo vô hạn");
  assert.equal(duYen.viec, "NAP_LAI");
  const coKhoi = quyetDinh({ generating: false, khoi: khoiTot(), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: false, soLanYen: NGUONG_YEN });
  assert.equal(coKhoi.viec, "GUI", "nối vào chuỗi đã xong sẵn và đã có khối mới thì gửi luôn");
}

/* ---- ⓒ khối gõ DỞ không được gửi ------------------------------------------
   Vòng 1 của trial 10/09: khối hiện ra ở 80 ký tự trong lúc generating vẫn true. Gửi lúc đó
   là đẩy một prompt cụt sang vòng sau, và chuỗi hỏng từ đấy mà không ai thấy. */
{
  const qd = quyetDinh({ generating: true, khoi: khoiTot("mới gõ được chừng này"), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.equal(qd.viec, "CHO", "còn đang sinh thì khối chưa phải khối xong");
}

/* ---- ⓓ khối tự khai bị cắt → DỪNG, không gửi prompt cụt --------------------- */
{
  const k = { ...khoiTot("a".repeat(200)), truncated: true };
  const qd = quyetDinh({ generating: false, khoi: k, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.equal(qd.viec, "DUNG");
  assert.match(qd.vi, /KHOI_BI_CAT/);
}

/* ---- ⓔ xong mà không khối: NẠP LẠI trước, DỪNG sau (B-59) ------------------- */
{
  const chuaNap = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.equal(chuaNap.viec, "NAP_LAI", "chưa nạp lại thì CHƯA được kết luận là hết chuỗi");
  const daNap = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: true, daThayDangChay: true });
  assert.equal(daNap.viec, "DUNG");
  assert.match(daNap.vi, /HET_CHUOI/);
}

/* ---- ⓔ2 sau khi NẠP LẠI phải quan sát thêm trọn một cửa sổ, không kết luận ngay
   Lỗi thật lúc 10:02 ngày 10/09: bộ chạy nạp lại rồi chấm `HET_CHUOI` ở lượt đọc kế tiếp,
   **60 giây sau** — trong khi câu trả lời vòng 5 đã xong đủ 2245 ký tự và khối 1388 ký tự
   đang nằm đó. Lý do sâu hơn cả B-59: `generating` đọc **nút Stop**, mà nút Stop BIẾN MẤT
   trong lúc model chạy tool. Nên `false` giữa một chuỗi tool KHÔNG phải "đã xong".
   Bản vá đặt lại `daThayDangChay` và `soLanYen` ngay sau lượt nạp lại — mép này ghim đúng
   trạng thái đó: đã nạp lại NHƯNG cửa sổ quan sát vừa mở lại thì chưa được kết luận. */
{
  const vuaNap = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: true, daThayDangChay: false, soLanYen: 1 });
  assert.equal(vuaNap.viec, "CHO", "vừa nạp lại xong thì phải quan sát thêm, không được kết luận HET_CHUOI ngay");

  const nguon = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const sauNapLai = nguon.slice(nguon.indexOf("daNapLai = true;"), nguon.indexOf("daNapLai = true;") + 700);
  assert.match(sauNapLai, /daThayDangChay = false;/, "nạp lại phải ĐẶT LẠI cửa sổ quan sát");
  assert.match(sauNapLai, /soLanYen = 0;/, "nạp lại phải đặt lại bộ đếm yên");
}

/* ---- ⓕ khối CŨ không phải khối mới — chống gửi lại đúng một prompt hai lần --- */
{
  const qd = quyetDinh({ generating: false, khoi: khoiTot("y hệt", KHOI_CU), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.equal(qd.viec, "NAP_LAI", "cùng turn_id nghĩa là chưa có vòng mới");
}

/* ---- ⓖ khối rỗng và khối quá dài đều DỪNG ---------------------------------- */
{
  const rong = quyetDinh({ generating: false, khoi: { ...khoiTot(), text: "   " }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.match(rong.vi, /KHOI_RONG/);
  const dai = quyetDinh({ generating: false, khoi: khoiTot("x".repeat(TRAN_KY_TU_KHOI + 1)), khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true });
  assert.match(dai.vi, /KHOI_QUA_DAI/);
}

/* ---- ⓗ TRẦN VÒNG là hằng trong mã, không phải tham số ----------------------
   Một vòng lặp không trần trên một trang có thể sinh tiền là loại lỗi không sửa lại được sau
   khi nó đã chạy. Trần đọc từ cờ dòng lệnh thì nó chỉ còn là một chỗ để gõ nhầm. */
{
  assert.equal(typeof TRAN_VONG, "number");
  assert.ok(TRAN_VONG > 0 && TRAN_VONG <= 50, "trần vòng phải là một số hữu hạn và nhỏ");
  const nguon = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const khongChuThich = nguon.split("\n").filter((d) => !d.trim().startsWith("*") && !d.trim().startsWith("//") && !d.trim().startsWith("/*")).join("\n");
  assert.match(khongChuThich, /soVong < 1 \|\| soVong > TRAN_VONG/, "trần phải được cưỡng chế ở cửa vào, không chỉ khai ra");
  // Bộ chạy KHÔNG được tự soạn chữ: lượt gửi chỉ chở `khoi.text`, nguyên văn.
  assert.match(khongChuThich, /text: khoi\.text/, "lượt gửi phải chở NGUYÊN VĂN khối, không phải chữ do bộ chạy dựng");
}

/* ---- ⓘ lượt GHI lỗi: đối chiếu bằng CHÍNH ĐẦU KHỐI, không bằng từ khoá ------
   10/09 tôi kiểm "vòng 3 đã gửi chưa" bằng `includes("VÒNG 3")` và nhận DƯƠNG TÍNH GIẢ — chữ
   đó nằm sẵn trong prompt vòng 2 ("kết thúc bằng prompt cho Vòng 3"). Cùng họ với lỗi phép
   ghim khớp vào chú thích. */
{
  const nguon = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  assert.match(nguon, /startsWith\(khoi\.text\.slice\(0, 60\)\)/, "phải so bằng đầu khối, không bằng một từ khoá");
}

/* ---- ⓙ mỗi lượt gửi báo lỗi phải có lượt ĐỌC LẠI của riêng nó (B-58) --------
   Lỗi thật lúc 09:43 ngày 10/09: bản đầu đọc lại sau lần gửi ⑴ nhưng KHÔNG đọc lại sau lần ⑵,
   nên `REQUEST_TIMEOUT` ở lần hai bị chấm thẳng là thất bại và bộ chạy bỏ cuộc — trong khi
   trang đang sinh, tức tin nhắn đã bay. Đo trước đó: 4/4 lượt gửi báo lỗi và 4/4 đều đã bay,
   nên "báo lỗi" gần như KHÔNG mang thông tin gì về việc nó có bay hay không. */
{
  assert.equal(ketLuanGui({ ok1: true }).xong, true);
  assert.equal(ketLuanGui({ ok1: false, daBay1: true }).xong, true, "lần ⑴ lỗi mà đọc lại thấy đã bay thì KHÔNG được gửi lại");
  assert.equal(ketLuanGui({ ok1: false, daBay1: false, ok2: true }).xong, true);
  assert.equal(ketLuanGui({ ok1: false, daBay1: false, ok2: false, daBay2: true }).xong, true,
    "đây là mép mà bản đầu để lọt: lần ⑵ báo lỗi NHƯNG đọc lại thấy đã bay");
  assert.equal(ketLuanGui({ ok1: false, daBay1: false, ok2: false, daBay2: false }).xong, false,
    "chỉ khi HAI lượt gửi và HAI lượt đọc lại đều không thấy thì mới là thất bại");
  // Kiểm ngược: logic BẢN CŨ (bỏ qua daBay2) trả THẤT BẠI ở đúng mép trên.
  const cu = ({ ok1, daBay1, ok2 }) => Boolean(ok1 || daBay1 || ok2);
  assert.equal(cu({ ok1: false, daBay1: false, ok2: false }), false, "bản cũ thật sự để lọt mép này");

  const nguon = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const soLanDocLai = nguon.split("await daVaoChua()").length - 1;
  assert.equal(soLanDocLai, 2, "phải có ĐÚNG hai lượt đọc lại — một cho mỗi lượt gửi có thể lỗi");
}

/* ---- ⓚ "ĐỌC KHÔNG ĐƯỢC" KHÁC "đọc được và không thấy" ----------------------
   Lỗi thật, HAI LẦN liên tiếp ngày 10/09 (09:43 và 09:52). `daVaoChua()` đọc đúng MỘT lượt;
   panel đang bận nên `chat.read` hết giờ; bản đầu chấm luôn thành "chưa bay" rồi gửi lại —
   trong khi tin nhắn ĐÃ vào hội thoại (đo lại: vòng 4 = 1077 ký tự, vòng 5 = 1551 ký tự, cả
   hai đều nằm trong chat). Vắng bằng chứng bị đọc thành bằng chứng vắng mặt.
   Nay ba trạng thái: true · false · null. `null` thì DỪNG, không gửi lại — gửi lại lúc mù
   đúng là thứ exact-once sinh ra để chặn. */
{
  const mu1 = ketLuanGui({ ok1: false, daBay1: null });
  assert.equal(mu1.xong, false);
  assert.equal(mu1.dung, true, "không đọc lại được thì phải DỪNG, không được gửi lại");
  assert.match(mu1.vi, /KHONG_DOC_LAI_DUOC/);

  const mu2 = ketLuanGui({ ok1: false, daBay1: false, ok2: false, daBay2: null });
  assert.equal(mu2.dung, true);

  // Và `false` vẫn phải đi tiếp như cũ — đừng vá quá tay thành "hễ lỗi là dừng".
  assert.equal(ketLuanGui({ ok1: false, daBay1: false, ok2: true }).xong, true);

  // Kiểm ngược: logic bản cũ coi null như false, tức nó GỬI LẠI ở đúng mép trên.
  const cu = (daBay) => (daBay ? "khong-gui-lai" : "GUI_LAI");
  assert.equal(cu(null), "GUI_LAI", "bản cũ thật sự gửi lại khi mù — mép này bắt đúng lỗi đã xảy ra");

  const nguon = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  assert.match(nguon, /if \(daBay1 === false\)/, "chỉ gửi lại khi ĐỌC ĐƯỢC và KHÔNG THẤY — không phải khi !daBay1");
}

console.log("chuoi reasoning smoke tests: PASS");

/* ⓛ B-62 — khối giao cho CC thì KHÔNG được chuyển tiếp về GPT. Chuỗi luat-audit dừng sau
   Vòng 6 với nhãn `HET_CHUOI` trong khi GPT đã trả lời và từ chối đúng vai. */
{
  const khoiCC = { found: true, turn_id: "99999999-9999-4999-8999-999999999999", chars: 1671, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: Claude Code (CC) — MỐC ② trước VÒNG 7/12.\n\nLàm gì đó." };
  const r = quyetDinh({ generating: false, khoi: khoiCC, khoiCu: "88888888-8888-4888-8888-888888888888", daNapLai: false, daThayDangChay: true });
  assert.equal(r.viec, "DUNG", "khối giao cho CC mà vẫn GUI");
  assert.match(r.vi, /CAN_NGUOI/);
  assert.match(r.vi, /Claude Code/); // cắt trước "(" nên tên là "Claude Code", không kèm "(CC)"

  const khoiGPT = { found: true, turn_id: "99999999-9999-4999-8999-999999999999", chars: 1388, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: GPT Web — Repo Rule Audit, VÒNG 6/12.\n\nLàm gì đó." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiGPT, khoiCu: "88888888-8888-4888-8888-888888888888", daNapLai: false, daThayDangChay: true }).viec,
    "GUI", "khối giao cho GPT phải đi tiếp");

  // Không khai người nhận thì chạy như cũ — chuỗi khác không bắt buộc theo mẫu này.
  const khoiTron = { found: true, turn_id: "99999999-9999-4999-8999-999999999999", chars: 40, truncated: false, text: "Vòng tiếp theo: làm X." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiTron, khoiCu: "88888888-8888-4888-8888-888888888888", daNapLai: false, daThayDangChay: true }).viec, "GUI");

  /* Bẫy đã lường: dòng giao cho CC mà có nhắc chữ GPT ở phần mô tả. So cả dòng thì lọt. */
  const khoiBay = { found: true, turn_id: "99999999-9999-4999-8999-999999999999", chars: 60, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: Claude Code (CC) — đối chiếu kết quả GPT\n\nLàm gì đó." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiBay, khoiCu: "88888888-8888-4888-8888-888888888888", daNapLai: false, daThayDangChay: true }).viec,
    "DUNG", "so cả dòng nên tưởng khối này của GPT");

  // CHIỀU NGƯỢC: logic cũ (không hỏi người nhận) phải GUI đúng cái khối CC — tức lỗi tái hiện được.
  assert.equal(quyetDinh({ generating: false, khoi: { ...khoiCC, text: "Làm gì đó." }, khoiCu: "88888888-8888-4888-8888-888888888888", daNapLai: false, daThayDangChay: true }).viec,
    "GUI", "bỏ dòng NGƯỜI NHẬN đi mà vẫn DUNG thì phép ghim này không đo dòng đó");
  console.log("  ok  ⓛ khối giao cho CC dừng bằng CAN_NGUOI, khối của GPT vẫn đi tiếp");
}

/* ⓜ B-61 — hai bản chạy cùng một thư mục: bản thứ hai phải thoát khác 0 và KHÔNG gửi gì. */
{
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  assert.match(src, /flag:\s*"wx"/, "khoá phải tạo bằng cờ wx — kiểm-và-tạo nguyên tử");
  assert.match(src, /EEXIST/, "phải phân biệt khoá đã có với lỗi hệ tệp khác");
  assert.match(src, /process\.exit\(3\)/, "bản thứ hai phải thoát khác 0");
  const iKhoa = src.indexOf('flag: "wx"');
  const iGui = src.indexOf('"chat-say"');
  assert.ok(iKhoa > 0 && iGui > iKhoa, "khoá phải đặt TRƯỚC mọi đường gửi");
  console.log("  ok  ⓜ khoá một-bản-chạy đặt trước mọi đường gửi");
}

/* ⓝ B-63 — tab còn là của tôi không. Mép duy nhất ở đây bảo vệ NGƯỜI, không bảo vệ chuỗi. */
{
  const U = "https://chatgpt.com/c/aaa";
  // Lần đọc đầu: chưa có gì để so, phải cho chạy.
  assert.equal(canhTab({ url: U, urlGhim: U, idLuotNguoiCuoi: "u1", mocLuotNguoi: "u1" }).dung, false);

  // URL đổi = hội thoại khác. Đây là ca "bộ chạy gõ vào chỗ khác".
  const doiUrl = canhTab({ url: "https://chatgpt.com/c/bbb", urlGhim: U, idLuotNguoiCuoi: "u1", mocLuotNguoi: "u1" });
  assert.equal(doiUrl.dung, true);
  assert.match(doiUrl.vi, /DOI_HOI_THOAI/);

  // Lượt gõ lạ = người đang dùng. Đúng cảnh 11:32 ngày 10/09.
  const nguoiGo = canhTab({ url: U, urlGhim: U, idLuotNguoiCuoi: "u9", mocLuotNguoi: "u1" });
  assert.equal(nguoiGo.dung, true);
  assert.match(nguoiGo.vi, /NGUOI_DANG_DUNG/);
  assert.match(nguoiGo.vi, /u9/);

  // Hội thoại rỗng, chưa ghim gì: không được dựng cờ giả.
  assert.equal(canhTab({ url: U, urlGhim: null, idLuotNguoiCuoi: null, mocLuotNguoi: undefined }).dung, false);

  // CHIỀU NGƯỢC: bản cũ không có phép kiểm nào, nên nó "xanh" ở CẢ HAI ca trên.
  const cu = () => ({ dung: false });
  assert.equal(cu().dung, false, "bản cũ phải cho chạy ở ca người đang gõ — đó là lỗi đã xảy ra");
  console.log("  ok  ⓝ đổi hội thoại và lượt gõ lạ đều dừng bộ chạy");
}

/* ⓞ Phép canh phải nằm TRƯỚC quyetDinh trong vòng lặp, và mốc không được nhích mù. */
{
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const iCanh = src.indexOf("const canh = canhTab(");
  const iQuyet = src.indexOf("const qd = quyetDinh(");
  assert.ok(iCanh > 0 && iQuyet > iCanh, "canhTab phải chạy trước quyetDinh");
  /* Bỏ chú thích trước khi dò — lần thứ tư trong ngày phép dò khớp trúng chính câu văn giải
     thích vì sao không được làm thế. Chú thích không chạy; chỉ mã mới tính. */
  const chiMa = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  assert.ok(!/mocLuotNguoi = undefined/.test(chiMa), "không được nhích mốc mù — người gõ ngay sau sẽ thành mốc");
  assert.match(src, /mocLuotNguoi = cuoi\.id/, "mốc chỉ nhích sang lượt đã nhận ra là của mình");
  console.log("  ok  ⓞ canh tab đặt trước quyết định, mốc nhích có điều kiện");
}

/* ⓟ BẮT ĐỊA CHỈ HỘI THOẠI — thêm 10/09 sau khi Đức mở một chat MỚI và bộ chạy mù.
   Hai lỗi thật, cùng một gốc: bộ chạy so NGUYÊN VĂN địa chỉ.
   ⑴ Dương tính giả: ChatGPT tự gắn `?...` sau lưng người dùng, chuỗi đang chạy ngon dừng
      với `DOI_HOI_THOAI` mà không ai đổi gì.
   ⑵ Không khai được hội thoại muốn chạy: bộ chạy ghim đúng tab đang mở, mở nhầm là gõ nhầm. */
{
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  assert.equal(hoiThoaiCua("https://chatgpt.com/c/abc-123"), "abc-123");
  assert.equal(hoiThoaiCua("https://chatgpt.com/c/abc-123?model=gpt-5#x"), "abc-123", "phần ? và # không thuộc định danh");
  assert.equal(hoiThoaiCua("https://chatgpt.com/g/g-p-duan/c/abc-123"), "abc-123", "hội thoại trong Project vẫn là hội thoại");
  assert.equal(hoiThoaiCua("https://chatgpt.com/"), null, "chat MỚI chưa gõ câu nào thì CHƯA có định danh");
  assert.equal(hoiThoaiCua(""), null);
  assert.equal(hoiThoaiCua(null), null);

  /* CHỐNG TRÔI: đây là bản sao của `conversationId` trong provider-adapter.js — bộ chạy là
     tiến trình node, không nạp được mã tiện ích. Đọc regex THẬT của adapter và bắt hai bên
     trùng. Repo đã trả bảy ngày cho đúng một bản sao không có máy canh (sidepanel neo ở đầu
     đường dẫn nên hội thoại trong Project trả null, và một lớp chặn tắt lặng lẽ). */
  const adapter = fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
  const mAdapter = /const CONVERSATION_ID = \/(.+?)\/i;/.exec(adapter);
  assert.ok(mAdapter, "không đọc được regex CONVERSATION_ID trong provider-adapter.js — mỏ neo lệch, sửa phép ghim này");
  /* Không gõ lại khuôn ở đây — gõ lại là đẻ ra bản thứ BA. Đòi mã bộ chạy chứa NGUYÊN VĂN
     khuôn của adapter, rồi chạy cả hai trên cùng vài địa chỉ. */
  assert.ok(src.includes(mAdapter[1]),
    `bộ chạy phải dùng ĐÚNG khuôn của adapter (${mAdapter[1]}); hai khuôn khác nhau là hai câu trả lời cho cùng một câu hỏi`);
  const nhuAdapter = (u) => (new RegExp(mAdapter[1], "i").exec(String(u).split("?")[0].split("#")[0]) || [])[1] || null;
  for (const u of ["https://chatgpt.com/c/abc", "https://chatgpt.com/g/g-p-duan/c/abc",
    "https://chatgpt.com/c/abc?model=gpt-5", "https://chatgpt.com/", "https://chatgpt.com/gpts"]) {
    assert.equal(hoiThoaiCua(u), nhuAdapter(u), `hai bên trả lời khác nhau cho ${u}`);
  }

  /* ⑴ Cùng hội thoại, khác phần `?` — KHÔNG được dừng. Đây là mép bản cũ để lọt. */
  const themThamSo = canhTab({
    url: "https://chatgpt.com/c/abc?model=gpt-5", urlGhim: "https://chatgpt.com/c/abc",
    idLuotNguoiCuoi: "u1", mocLuotNguoi: "u1"
  });
  assert.equal(themThamSo.dung, false, "thêm ?model= không phải đổi hội thoại");
  // CHIỀU NGƯỢC: logic cũ so nguyên văn, nên nó DỪNG ở đúng mép trên.
  const cuSoNguyenVan = (u, g) => u !== g;
  assert.equal(cuSoNguyenVan("https://chatgpt.com/c/abc?model=gpt-5", "https://chatgpt.com/c/abc"), true,
    "bản cũ thật sự dừng nhầm ở đây — mép này bắt đúng lỗi, không phải bắt giả định của tôi");

  /* Đổi hội thoại thật thì vẫn phải dừng, và lý do nêu ĐỊNH DANH chứ không nêu cả địa chỉ. */
  const doiThat = canhTab({
    url: "https://chatgpt.com/c/xyz", urlGhim: "https://chatgpt.com/c/abc",
    idLuotNguoiCuoi: "u1", mocLuotNguoi: "u1"
  });
  assert.equal(doiThat.dung, true);
  assert.match(doiThat.vi, /DOI_HOI_THOAI — ghim abc, giờ là xyz/);

  /* Không rút được định danh ở một trong hai bên thì LÙI VỀ so nguyên văn — thà dừng nhầm
     còn hơn gõ nhầm hội thoại. */
  const mot_ben_khong_ro = canhTab({
    url: "https://chatgpt.com/", urlGhim: "https://chatgpt.com/c/abc",
    idLuotNguoiCuoi: "u1", mocLuotNguoi: "u1"
  });
  assert.equal(mot_ben_khong_ro.dung, true, "rơi về trang phóng là mất hội thoại, phải dừng");

  /* ⑵ `--url` phải bị chặn NGAY Ở CỬA VÀO, trước mọi lượt đọc. Khai một địa chỉ không phải
     hội thoại mà vẫn chạy thì nó sẽ ghim bừa theo tab — đúng cái nó sinh ra để chặn. */
  const chiMa = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  assert.match(chiMa, /if \(urlMuon && !hoiThoaiCua\(urlMuon\)\)/, "--url phải được kiểm ở cửa vào");
  const iKiem = chiMa.indexOf("if (urlMuon && !hoiThoaiCua(urlMuon))");
  const iGui = chiMa.indexOf('"chat-say"');
  assert.ok(iKiem > 0 && iGui > iKiem, "phép kiểm --url phải đứng TRƯỚC mọi đường gửi");
  assert.match(chiMa, /let urlGhim = urlMuon \|\| null;/, "--url phải ghim thẳng, không chờ lượt đọc đầu ghi đè");

  /* ⑶ SAI TRANG không được chấm thành "panel đang bận" — chờ thêm không bao giờ chữa nó. */
  assert.match(chiMa, /WRONG_SURFACE/, "phải nhận ra WRONG_SURFACE riêng, không gộp vào rọ lỗi đọc");
  const iSaiTrang = chiMa.indexOf("WRONG_SURFACE");
  const iPanelBan = chiMa.indexOf("panel đang bận");
  assert.ok(iSaiTrang > 0 && iPanelBan > iSaiTrang,
    "nhánh SAI_TRANG phải đứng TRƯỚC nhánh đếm đọc-hỏng, nếu không nó không bao giờ chạy tới");
  console.log("  ok  ⓟ bắt địa chỉ: so bằng định danh hội thoại, --url kiểm ở cửa, sai trang nói đúng bệnh");
}

/* ⓠ B-59/B-60 — LƯỢT CHƯA CHỐT. Đo live 11/09 trên tab thật, một lượt gửi:
 *
 *     giây  nút Stop   dạng id   ký tự
 *      3.5  còn sinh   TẠM        13
 *      6.1  còn sinh   TẠM        26
 *      8.7  ĐÃ TẮT     TẠM        26
 *     27.0  đã tắt     TẠM        26
 *     (nạp lại)        UUID       85
 *
 * Hai tín hiệu bộ chạy vẫn dùng — nút Stop và "chữ đứng yên" — đều nói "xong" ở giây 8.7,
 * trong khi câu trả lời thật dài 85 ký tự. Dạng id không nói sai lần nào. */
{
  const THAT = "6b3e1715-899f-444c-9c3d-0a1b2c3d4e5f";
  const TAM = "request-6aa2e7ba-b920-83ec-95be-ad310cdfe480-0";

  assert.equal(luotDaChot(THAT), true);
  assert.equal(luotDaChot(TAM), false, "id dạng request-<hội thoại>-<n> là lượt CHƯA chốt");
  assert.equal(luotDaChot("client-created-root"), false, "dạng tạm thứ hai, cũng đo được trên trang");
  assert.equal(luotDaChot(null), false, "không có id thì không được coi là đã chốt");
  assert.equal(luotDaChot(""), false);
  assert.equal(luotDaChot("turn-moi"), false, "DANH SÁCH CHO PHÉP, không phải danh sách cấm: id lạ là chưa chốt");

  /* Payload ĐÚNG NHƯ ĐO ĐƯỢC: found:true nhưng chars:0 và turn_id tạm. */
  const khoiTam = { found: true, chars: 0, truncated: false, text: "", turn_id: TAM, blocks_in_turn: 1 };

  /* KHÔNG CHỜ — nạp lại ngay. Bản đầu của tôi chờ hết `NGUONG_YEN` (~90 giây) rồi mới nạp
     lại, và phép ghim này khi đó đòi `CHO`: tức nó ghim **niềm tin của tôi**, không ghim thế
     giới. Lượt đo thứ hai 11/09 bác: id tạm **không bao giờ tự** thành UUID (giữ tạm suốt 27
     và 32,5 giây ở hai lượt đo), chỉ nạp lại mới đổi. Trên chuỗi 12 vòng, 90 giây mỗi vòng là
     18 phút ngồi không đổi lấy số không. */
  const som = quyetDinh({ generating: false, khoi: khoiTam, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true, soLanYen: 1 });
  assert.equal(som.viec, "NAP_LAI", "id tạm thì nạp lại NGAY — chờ thêm không bao giờ gỡ được nó");
  assert.notEqual(som.viec, "CHO", "đây là mép chống hồi quy: bản đầu chờ 90 giây vô ích");
  assert.match(som.vi, /LUOT_CHUA_CHOT/);

  const napLai = quyetDinh({ generating: false, khoi: khoiTam, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true, soLanYen: NGUONG_YEN });
  assert.equal(napLai.viec, "NAP_LAI", "chờ lâu hay chờ ít đều ra cùng một việc — nạp lại");

  const dung = quyetDinh({ generating: false, khoi: khoiTam, khoiCu: KHOI_CU, daNapLai: true, daThayDangChay: true, soLanYen: NGUONG_YEN });
  assert.equal(dung.viec, "DUNG");
  assert.match(dung.vi, /LUOT_CHUA_CHOT/);

  /* CHIỀU NGƯỢC — logic CŨ (không có cửa này) chấm đúng payload trên là KHOI_RONG rồi DỪTC.
     Sai hai lần trong một bước: lý do sai (khối không rỗng, nó chưa tồn tại), và đi vòng qua
     luật B-59 bắt nạp lại một lần. Mép này chứng minh lỗi có thật, không phải tôi tưởng ra. */
  const cu = (khoi) => {
    const coKhoiMoi = Boolean(khoi?.found) && Boolean(khoi.turn_id) && khoi.turn_id !== KHOI_CU;
    if (!coKhoiMoi) return "NAP_LAI";
    if (!khoi.text?.trim()) return "DUNG:KHOI_RONG";
    return "GUI";
  };
  assert.equal(cu(khoiTam), "DUNG:KHOI_RONG", "bản cũ thật sự dừng bằng lý do sai ở đúng payload này");

  /* ĐừNG VÁ QUÁ TAY: lượt đã chốt vẫn phải đi tiếp như cũ. */
  const khoiThat = { found: true, chars: 20, truncated: false, text: "prompt vòng sau", turn_id: THAT, blocks_in_turn: 1 };
  assert.equal(quyetDinh({ generating: false, khoi: khoiThat, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true }).viec, "GUI");

  /* Khối chưa hiện mà LƯỢT đã mang id tạm — đo được ở giây 6.1: khoiCo=0, dang=TẠM.
     Không nhận `idLuotTraLoiCuoi` thì cảnh này lọt xuống nhánh NAP_LAI ngay, sớm hơn cần. */
  const chuaCoKhoi = quyetDinh({ generating: false, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true, soLanYen: 1, idLuotTraLoiCuoi: TAM });
  assert.equal(chuaCoKhoi.viec, "NAP_LAI", "khối chưa hiện mà LƯỢT mang id tạm thì vẫn phải nạp lại — đo được ở giây 6.1");
  assert.match(chuaCoKhoi.vi, /LUOT_CHUA_CHOT/, "và phải nói đúng lý do, không lẫn với HET_CHUOI");

  /* CÒN ĐANG SINH thì KHÔNG được nạp lại, dù id là tạm — nạp lại giữa lúc GPT đang trả lời
     đúng là cái `chat.reload` sinh ra để từ chối. Đo được ở giây 7.9 lượt ⑵: tab hiện,
     `generating` còn true, id tạm, chữ đang chạy 909 ký tự. */
  const dangSinh = quyetDinh({ generating: true, khoi: { found: false }, khoiCu: KHOI_CU, daNapLai: false, daThayDangChay: true, soLanYen: 0, idLuotTraLoiCuoi: TAM });
  assert.equal(dangSinh.viec, "CHO", "còn đang sinh thì chờ, cửa id tạm KHÔNG được vượt lên trước cửa generating");

  /* Cửa này phải đứng TRƯỚC mọi phán quyết về khối trong mã nguồn. */
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const chiMa = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  const iChot = chiMa.indexOf("!luotDaChot(idXet)");
  const iKhoiMoi = chiMa.indexOf("const coKhoiMoi");
  assert.ok(iChot > 0 && iKhoiMoi > iChot, "cửa LUOT_CHUA_CHOT phải đứng trước coKhoiMoi");
  assert.match(chiMa, /idLuotTraLoiCuoi: luotTL\?\.id/, "vòng chạy phải TRUYỀN id lượt trả lời cuối vào, không thì cửa này mù một nửa");
  console.log("  ok  ⓠ id tạm: nạp lại NGAY (không chờ), dừng nếu nạp rồi vẫn tạm, không chấm nhầm KHOI_RONG");
}

/* ⓡ B-73 — TÊN CHUỖI KHÔNG ĐƯỢC LÀM VỠ KHOÁ IDEMPOTENCY. Lỗi thật 12/09.
 *
 * Đức đặt tên `HNX audit & fill`. Bản trước ghép thẳng vào khoá → `HNX audit & fill-v1`.
 * Luật của host là `/^[\x21-\x7e]{8,128}$/` và **dấu cách (0x20) không nằm trong đó**, nên
 * MỌI lượt gửi trả `INVALID_ENVELOPE`, chuỗi chết ở vòng 1, và nhật ký kết lại thành
 * *"hai lượt gửi, hai lượt đọc lại, đều không thấy trong hội thoại"* — đọc y như trang hỏng.
 * Đây là mép đắt nhất của cả tệp: nó không chặn một lỗi kỹ thuật, nó chặn một CÁCH ĐẶT TÊN. */
{
  const LUAT = /^[\x21-\x7e]{8,128}$/;

  /* Chính hai cái tên Đức đã dùng, giữ nguyên văn — đây là ca đã cắn, không phải ca nghĩ ra. */
  for (const nhan of ["HNX audit & fill", "HRX audit & Fill", "Rà soát luật", "ark-luat", "   ", ""]) {
    for (const hau of ["-v1", "-v10-reload", "-v3-ping", ""]) {
      const k = khoaAnToan(nhan, hau);
      assert.match(k, LUAT, `khoá vỡ với tên ${JSON.stringify(nhan)} + ${JSON.stringify(hau)} → ${JSON.stringify(k)}`);
    }
  }
  assert.ok(khoaAnToan("", "").length >= 8, "tên rỗng vẫn phải ra khoá đủ 8 ký tự");
  assert.ok(khoaAnToan("Rà soát luật").length >= 8, "tên thuần tiếng Việt có dấu rút gọn gần hết — vẫn phải đủ dài");

  /* TẤT ĐỊNH. Khoá này LÀ khoá chống-gửi-hai-lần: lượt gửi lại sau khi hết giờ phải dùng lại
     ĐÚNG khoá cũ, nếu không host không có gì để khớp (bài học `~~B-38~~`). */
  assert.equal(khoaAnToan("HNX audit & fill", "-v1"), khoaAnToan("HNX audit & fill", "-v1"),
    "cùng đầu vào phải ra cùng khoá — sinh ngẫu nhiên là phá lớp chống ghi-hai-lần");

  /* KHÔNG ĐƯỢC ĐỤNG NHAU. Hai tên khác nhau cùng rút thành `HNX-audit-fill`; dừng ở đó thì
     lượt gửi của chuỗi này bị host nuốt như bản sao của chuỗi kia — mất một lượt, im lặng. */
  assert.notEqual(khoaAnToan("HNX audit & fill", "-v1"), khoaAnToan("HNX audit / fill", "-v1"),
    "hai tên rút gọn giống nhau PHẢI ra hai khoá khác — nếu không, một chuỗi nuốt lượt gửi của chuỗi kia");
  assert.notEqual(khoaAnToan("a", "-v1"), khoaAnToan("a", "-v2"), "hai vòng phải hai khoá");

  /* CHIỀU NGƯỢC — cách ghép CŨ thật sự vi phạm luật của host, trên chính tên của Đức.
     Không có mép này thì phần trên chỉ ghim bản vá của tôi, không ghim lỗi đã xảy ra. */
  assert.doesNotMatch("HNX audit & fill-v1", LUAT,
    "bản cũ thật sự sinh ra một khoá host từ chối — đây là lỗi đã làm chuỗi của Đức chết");

  /* Và mã phải THẬT SỰ dùng nó ở MỌI đường gửi, không chỉ khai ra. */
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const chiMa = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  assert.ok(!/["'`]--request-id["'`],\s*`\$\{nhan\}/.test(chiMa),
    "còn chỗ ghép THẲNG tên chuỗi vào --request-id — đó đúng là lỗi vừa vá");
  /* Đếm LƯỢT GỌI, không đếm cả dòng khai hàm — `export function khoaAnToan(nhan, …)` cũng
     khớp nếu dò lỏng, và khi đó con số sẽ đúng vì lý do sai. Mọi lượt gọi đều truyền hậu tố
     bằng chuỗi mẫu, nên dấu backtick là mỏ neo phân biệt.

     ĐẾM HAI TẦNG, không đếm tổng. Bản trước ghim "đúng 3 chỗ" và con số ấy vỡ ngay lượt B-76
     thêm một lượt PING khi đọc hỏng — một lượt CHỈ ĐỌC, không đụng gì tới exact-once. Một phép
     ghim vỡ vì việc hợp lệ là phép ghim sẽ bị người ta sửa cho qua, và lần sửa đó mới là lúc
     mất bảo vệ thật. Nên tầng dưới ghim đúng điều câu comment nói: CHỈ MỘT chỗ dựng khoá GỬI. */
  const goiKhoa = chiMa.match(/khoaAnToan\(nhan, `[^`]*`/g) || [];
  assert.ok(goiKhoa.length >= 3, `phải còn các chỗ dựng khoá từ tên, đang là ${goiKhoa.length}`);
  const khoaGui = goiKhoa.filter((x) => /`-v\$\{vong\}`$/.test(x));
  assert.equal(khoaGui.length, 1,
    "phải có ĐÚNG MỘT chỗ dựng khoá cho lượt GỬI — lượt gửi lại DÙNG LẠI khoá đó, đó là exact-once");
  /* Mọi chỗ còn lại phải là lượt CHỈ ĐỌC và phải tự khai mình là ai trong hậu tố. Một khoá mới
     không tên là một đường gửi mới chưa ai xét. */
  for (const g of goiKhoa.filter((x) => !/`-v\$\{vong\}`$/.test(x))) {
    assert.match(g, /-(ping|reload)/,
      `chỗ dựng khoá không phải lượt gửi thì phải khai rõ là ping hay reload: ${g}`);
  }
  assert.match(chiMa, /const khoaGui = khoaAnToan\(nhan,/, "lượt gửi phải chốt khoá MỘT LẦN rồi dùng lại cho lượt gửi thứ hai");
  console.log("  ok  ⓡ tên chuỗi có dấu cách / tiếng Việt không còn làm vỡ khoá gửi");
}

/* ⓢ CHẠY TIẾP, KHÔNG CHẠY LẠI — Đức nêu 12/09: *"script bị chết thì tôi không phải chạy lại
 * từ đầu rồi điền thông tin từ đầu."*
 *
 * Mép chịu tải không phải sự tiện nghi, mà là: chạy lại từ số không trên một hội thoại đang
 * dở sẽ đọc lại đúng khối bộ chạy VỪA GỬI trước khi chết, và gửi nó lần hai. Nhật ký đã ghi
 * `turn_id` của từng lượt gửi, nên chỗ dừng là thứ ĐỌC ĐƯỢC. */
{
  const dong = (o) => JSON.stringify(o);
  const nk = [
    dong({ su_kien: "BAT_DAU", so_vong: 10 }),
    dong({ su_kien: "NAP_LAI", vong: 1 }),
    dong({ su_kien: "DA_GUI", vong: 1, turn_id: "aaa-1" }),
    dong({ su_kien: "CANH_TAB", vong: 2 }),
    dong({ su_kien: "DA_GUI", vong: 2, turn_id: "bbb-2" }),
    dong({ su_kien: "DA_GUI", vong: 3, turn_id: "ccc-3" }),
  ].join("\n");

  const r = docNhatKy(nk);
  assert.equal(r.daGui, 3, "phải đếm ĐÚNG số lượt GỬI, không đếm mọi sự kiện");
  assert.equal(r.khoiCu, "ccc-3", "phải nối từ lượt gửi CUỐI CÙNG, không phải lượt đầu");

  /* Nhật ký là tệp CHỈ-THÊM ghi giữa lúc chạy: tắt máy giữa chừng để lại dòng cuối cụt.
     Bỏ qua TỪNG DÒNG hỏng, không bỏ cả tệp — bỏ cả tệp là quay về "chạy lại từ số không",
     tức đúng cái nguy hiểm mà tính năng này sinh ra để tránh. */
  const cut = `${nk}\n{"su_kien":"DA_GUI","vong":4,"turn_`;
  const r2 = docNhatKy(cut);
  assert.equal(r2.daGui, 3, "dòng cụt bị bỏ qua, ba lượt trước vẫn được đếm");
  assert.equal(r2.khoiCu, "ccc-3");

  assert.deepEqual(docNhatKy(""), { khoiCu: "", daGui: 0 }, "nhật ký rỗng = lượt chạy đầu, không phải lỗi");
  assert.deepEqual(docNhatKy(null), { khoiCu: "", daGui: 0 });
  assert.equal(docNhatKy(dong({ su_kien: "DA_GUI", vong: 1 })).daGui, 1,
    "lượt gửi thiếu turn_id vẫn phải ĐẾM — nếu không, ngân sách vòng bị trả lại sai");

  /* Và mã phải TRỪ vào trần vòng, không cộng thêm. `--so-vong` là ngân sách cho cả VIỆC,
     không phải cho một lượt chạy; cấp thêm vòng phải là một quyết định của Đức. */
  const src = fs.readFileSync(new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  const chiMa = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  assert.match(chiMa, /const conLai = soVong - daXong;/, "phải TRỪ số vòng đã gửi vào trần");
  assert.match(chiMa, /soVong = conLai;/, "và thật sự áp con số đó, không chỉ in ra");
  assert.match(chiMa, /docCo\(argv, "tu-turn", ""\) \|\| tuNhatKy/,
    "--tu-turn gõ tay phải THẮNG chỗ dừng đọc từ nhật ký");
  /* Tệp nhớ thông số phải là khoá=giá trị, KHÔNG phải một tệp .cmd chạy được: nó do một cái
     tên người gõ đẻ ra, và sinh mã chạy được từ chữ người gõ là cửa tiêm lệnh. */
  assert.match(chiMa, /lan-truoc\.txt/, "phải nhớ thông số lần trước");
  assert.ok(!/lan-truoc\.cmd|lan-truoc\.bat/.test(chiMa), "KHÔNG được sinh ra tệp chạy được từ chữ người gõ");
  assert.match(chiMa, /replace\(\/\[%!"\\r\\n\]\/g, ""\)/, "phải lọc ký tự làm vỡ một lượt `set` của batch");
  console.log("  ok  ⓢ chạy tiếp: đọc chỗ dừng từ nhật ký, trừ vào trần vòng, dòng cụt không làm mất tất");
}

/* ⓣ — GIÃN NHỊP GÕ (Đức chốt 12/09). Hai khoảng nghỉ, không phải một:
     ⑴ đọc được khối → dán vào ô soạn  (ở bộ chạy chuỗi, mép dưới đây)
     ⑵ dán xong → bấm Gửi              (ở `content.js`, mép cuối khối này ghim bằng mã nguồn)

   Mép thật của tính năng này KHÔNG phải "có nghỉ" mà là "MỖI LƯỢT MỘT SỐ KHÁC". Một hằng số
   mới — dù là 4 giây — vẫn là một nhịp máy, chỉ chậm hơn; và đó đúng là thứ một bản sửa cẩu
   thả sẽ sinh ra. Nên phần lớn khối này ghim tính NGẪU NHIÊN, không ghim con số. */
{
  const { treNgauNhien } = await import("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs");

  // Hai mút, kiểm bằng rnd cố định — không chạy trăm lượt rồi đoán phân bố.
  assert.equal(treNgauNhien(3000, 6000, () => 0), 3000, "rnd=0 phải ra đúng mút dưới");
  assert.equal(treNgauNhien(3000, 6000, () => 0.999999), 6000, "rnd≈1 KHÔNG được vượt mút trên");
  assert.equal(treNgauNhien(3000, 6000, () => 0.5), 4500);

  // Mọi lượt phải nằm trong 3–6 giây, và phải THẬT SỰ đổi số giữa các lượt.
  const mau = Array.from({ length: 200 }, () => treNgauNhien());
  for (const ms of mau) {
    assert.ok(Number.isInteger(ms), "phải là số nguyên mili-giây");
    assert.ok(ms >= 3000 && ms <= 6000, `ra ngoài khoảng 3–6 giây: ${ms}`);
  }
  assert.ok(new Set(mau).size > 50,
    "200 lượt mà dưới 50 giá trị khác nhau = một hằng số trá hình, đúng thứ Đức bảo đừng làm");

  // Trần cắt chứ không lỗi: một lời gọi sai chỗ không được quyền treo chuỗi.
  assert.equal(treNgauNhien(6000, 3000, () => 0.5), 6000, "min > max phải bị cắt, không ném lỗi");
  assert.equal(treNgauNhien(0, 0, () => 0.9), 0);

  const chiMa = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8")
    .split("\n").filter((d) => { const t = d.trim(); return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*"); })
    .join("\n");

  const chuoi = chiMa("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs");
  assert.match(chuoi, /const treGui = treNgauNhien\(\);[\s\S]{0,400}?await ngu\(treGui\);[\s\S]{0,400}?goi\(\["chat-say"/,
    "khoảng nghỉ phải nằm NGAY TRƯỚC lượt gửi đầu, không phải ở một chỗ nào đó trong vòng lặp");
  assert.match(chuoi, /tre_ms: treGui/, "nhật ký phải ghi lại số đã nghỉ, nếu không thì không kiểm được là nó có đổi");

  /* `content.js` — ghim bằng mã nguồn vì nó chạy trong trang, không import được vào đây.
     Ba điều, và điều thứ ba là điều dễ mất nhất khi ai đó dọn dẹp sau này. */
  const noiDung = chiMa("../content.js");
  assert.ok(!/setComposerValue\(composer, prompt\);\s*\n\s*await sleep\(150\);/.test(noiDung),
    "khoảng 150ms cứng giữa dán và bấm Gửi phải biến mất");
  assert.match(noiDung, /setComposerValue\(composer, prompt\);\s*\n\s*await sleep\(treNgauNhien\(\)\);/,
    "và thay bằng khoảng ngẫu nhiên");
  /* Cửa huỷ sau khoảng nghỉ do `waitForSendButtonReady` giữ — nó đọc cờ ngay vòng lặp đầu.
     Ghim rằng cửa ấy CÒN ĐÓ: khoảng nghỉ 3–6 giây biến "bấm Dừng giữa chừng" từ chuyện gần
     như không xảy ra được thành một cửa sổ thật. Hành vi kiểm ở ca 7 của
     `content-abort-race-behavior.mjs`; ở đây chỉ chặn ai đó dọn mất dòng ấy. */
  assert.match(noiDung, /while \(Date\.now\(\) < deadline\) \{\s*\n\s*if \(STATE\.abortRequested\) throw/,
    "waitForSendButtonReady phải đọc cờ huỷ TRƯỚC khi trả nút Gửi về — đó là cửa chặn cú click sau khoảng nghỉ");
  assert.match(noiDung, /const han = Date\.now\(\) \+ 25000;/,
    "hạn tìm bằng chứng của chat.say KHÔNG được nới: deadline_ms 30000 cưỡng chế ở bridge-transport-loopback.js");

  console.log("  ok  ⓣ giãn nhịp: 3–6 giây ngẫu nhiên ở CẢ hai khoảng, mỗi lượt một số khác, cờ huỷ đọc lại");
}

/* ⓤ B-76 — ĐỌC HỎNG: nghe tiện ích khai dừng cứng, giãn nhịp, ghi nhật ký.
 *
 * Bắt tại trận 12/09 trên profile `kaito`: `chat.read` hỏng liên tục, bộ chạy in "chưa rõ vì
 * sao" và thử lại đều 4 giây suốt 60 phút; `system.ping` cùng lúc trả lời NGAY với
 * `state: HARD_STOP` · `failure_type: RECEIVER_LOST`, và `halt_instruction.retry` của chính
 * tiện ích viết *"No — hard stop"*. Bộ chạy không đọc trường đó.
 */
{
  // ⒜ Tiện ích khai dừng cứng ⇒ DỪNG, và mang theo NGUYÊN VĂN câu của nó.
  const pingChet = { ok: true, result: { chatgpt: {
    state: "HARD_STOP", failure_type: "RECEIVER_LOST", composer_found: false, url: null,
    halt_instruction: { retry: "No -- hard stop, whole batch stops",
      meaning: "The extension lost its connection to the ChatGPT tab, composer, or content receiver." },
  } } };
  const ch = chanDung(pingChet);
  assert.equal(ch.dung, true, "state HARD_STOP thì phải dừng");
  assert.match(ch.vi, /RECEIVER_LOST/, "lý do dừng phải nêu loại hỏng tiện ích khai");
  assert.match(ch.vi, /lost its connection/, "phải chuyển NGUYÊN VĂN `meaning`, không tóm tắt lại");
  assert.match(ch.khuyen, /hard stop/, "phải chuyển cả lời khuyên thử-lại của tiện ích");

  // ⒝ VÀ VẾ NGƯỢC — thiếu vế này thì một đột biến "luôn luôn dừng" sẽ thoát, và nó biến mọi
  //    lượt panel hết giờ lẻ tẻ (rất thường, B-50) thành một chuỗi chết oan.
  assert.equal(chanDung({ ok: true, result: { chatgpt: { state: "UNKNOWN" } } }).dung, false,
    "state UNKNOWN KHÔNG phải dừng cứng — panel bận là chuyện thường");
  assert.equal(chanDung({ ok: false, error: { code: "REQUEST_TIMEOUT" } }).dung, false,
    "ping hỏng KHÔNG được suy ra dừng cứng: không biết thì không kết luận");
  assert.equal(chanDung(null).dung, false, "không có ping thì không kết luận gì");

  // ⒞ Nhịp: giãn dần, CÓ TRẦN, và trần phải thật sự chạm tới.
  const t1 = nhipDocHong(1).treMs;
  const t3 = nhipDocHong(3).treMs;
  assert.ok(t3 > t1, `phải giãn dần: lượt 3 (${t3}ms) phải lâu hơn lượt 1 (${t1}ms)`);
  assert.equal(nhipDocHong(50).treMs, TRE_DOC_HONG_TRAN_MS, "phải có trần, không giãn vô hạn");
  assert.ok(nhipDocHong(99).treMs <= TRE_DOC_HONG_TRAN_MS, "trần là trần");
  /* Ghim cái GIÁ, không ghim con số: trần 60 phút mà nhịp phẳng 4 giây là ~900 lượt gõ cửa —
     và lượt chạy 05:31 ngày 12/09 làm đúng thế, rồi ChatGPT đòi CAPTCHA. Đếm thật số lượt
     trong 60 phút theo nhịp hiện tại. Đức chốt: *"đọc và maintain từ tốn thôi."* */
  let tong = 0, luot = 0;
  while (tong < 60 * 60 * 1000 && luot < 5000) { tong += nhipDocHong(luot + 1).treMs; luot += 1; }
  assert.ok(luot <= 60, `trong trần 60 phút phải tối đa 60 lượt đọc hỏng (~1 lượt/phút), đang là ${luot}`);
  assert.ok(nhipDocHong(1).treMs >= 10000,
    "ngay lượt hỏng ĐẦU cũng phải nghỉ ≥10 giây — nện dồn từ lượt đầu là thứ đã gây CAPTCHA");

  // ⒟ Hỏi ping: KHÔNG hỏi ngay lượt đầu (hết giờ lẻ tẻ là chuyện thường), nhưng phải hỏi sớm.
  assert.equal(nhipDocHong(1).hoiPing, false, "một lượt hỏng chưa phải triệu chứng");
  assert.equal(nhipDocHong(NGUONG_PING_DOC_HONG).hoiPing, true, "tới ngưỡng thì phải hỏi ping");
  assert.ok(NGUONG_PING_DOC_HONG <= 5, "ngưỡng hỏi ping phải sớm — ping là cửa duy nhất còn trả lời");

  // ⒠ Ghim ĐƯỜNG DÂY, không chỉ hàm thuần: hàm đúng mà không ai gọi thì bộ chạy vẫn nện 900 lượt.
  const boChay = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");
  assert.ok(boChay.includes("chanDung(p)"),
    "vòng lặp đọc hỏng phải THẬT SỰ gọi chanDung với kết quả ping");
  assert.ok(boChay.includes("nhipHong.treMs"),
    "phải nghỉ theo nhịp giãn dần, không phải một hằng số phẳng");
  assert.ok(!boChay.includes("await ngu(4000);"),
    "không còn chỗ nào nghỉ phẳng 4 giây ở đường đọc hỏng");
  assert.ok(boChay.includes('su_kien: "DOC_HONG"'),
    "lượt đọc hỏng phải vào nhật ký — nhìn nhật ký phải phân biệt được 'đang nện' với 'đã chết'");
  assert.ok(boChay.includes("cd.debug"),
    "phải in `details.debug` — sidepanel.js:707 cố ý gửi nguyên nhân thật qua trường đó");

  console.log("  ok  ⓤ đọc hỏng: HARD_STOP thì dừng, giãn nhịp có trần, ghi nhật ký, in debug");
}

/* ⓥ B-77 — "XONG" PHẢI KHÁC "BỊ CHẶN", và khoá mồ côi phải tự thu.
 *
 * Đo 12/09, chuỗi "mo rong scouter 2": đọc được trang, không thấy khối, nạp lại, vẫn không
 * thấy ⇒ chấm `HET_CHUOI` và THOÁT 0. Ping cùng lúc: `SECURITY_HARD_STOP` — ChatGPT đang đòi
 * CAPTCHA. Trang bị chặn đọc ra "không có khối" là đương nhiên, và bản trước gọi đó là xong.
 */
{
  // ⒜ pid đã chết ⇒ khoá mồ côi, thu được.
  const chet = () => { const e = new Error("no such process"); e.code = "ESRCH"; throw e; };
  assert.equal(conSong(36772, chet), false, "pid đã chết thì khoá là mồ côi");

  // ⒝ VẾ NGƯỢC — thiếu vế này thì một đột biến "luôn luôn mồ côi" sẽ thoát, và nó cho phép
  //    hai bản chạy cùng gõ vào một tab: đúng lỗi B-61 đã trả giá.
  assert.equal(conSong(1, () => true), true, "kill(pid,0) êm xuôi nghĩa là CÒN SỐNG");
  const khacChu = () => { const e = new Error("operation not permitted"); e.code = "EPERM"; throw e; };
  assert.equal(conSong(4, khacChu), true, "EPERM = tiến trình CÓ THẬT nhưng khác chủ — vẫn là còn sống");
  assert.equal(conSong(undefined, chet), true, "không đọc được pid thì KHÔNG được coi là chết");
  assert.equal(conSong("bậy", chet), true, "pid rác thì KHÔNG được coi là chết");
  assert.equal(conSong(0, chet), true, "pid 0 không phải một tiến trình — không được thu khoá");

  const boChay2 = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  // ⒞ Đường "DUNG" phải hỏi ping TRƯỚC khi dám nói xong. Nhánh đọc-hỏng không cứu được ca này:
  //    ở đây lượt đọc THÀNH CÔNG nên nó không bao giờ chạy tới.
  const khoiDung = boChay2.slice(boChay2.indexOf('if (qd.viec === "DUNG")'));
  const hetKhoi = khoiDung.slice(0, khoiDung.indexOf("khoi = r.last_copy_block"));
  assert.ok(hetKhoi.includes("chanDung(p)"),
    "trước khi chấm HET_CHUOI phải hỏi ping — trang đang đòi CAPTCHA cũng đọc ra 'không có khối'");
  assert.ok(hetKhoi.includes("lyDo = ch.vi"),
    "ping nói dừng cứng thì lyDo phải ĐỔI — mã thoát bám theo lyDo");
  assert.ok(hetKhoi.includes('su_kien: "DUNG_CUNG"'), "phải ghi vào nhật ký, không chỉ in màn hình");

  // ⒟ Mã thoát: chỉ HET_SO_VONG và HET_CHUOI mới là 0. Đây là chỗ "bị chặn" khác "xong".
  assert.match(boChay2, /process\.exit\(lyDo === "HET_SO_VONG" \|\| lyDo\.startsWith\("HET_CHUOI"\) \? 0 : 1\)/,
    "mã thoát phải bám vào lyDo — DUNG_CUNG không được lọt vào nhóm thoát 0");
  assert.ok(!/DUNG_CUNG/.test(boChay2.slice(boChay2.indexOf("process.exit(lyDo ==="))),
    "không được thêm DUNG_CUNG vào nhóm thoát 0 để cho êm");

  // ⒠ Thu khoá mồ côi phải ĐẶT LẠI BẰNG `wx`, không phải ghi đè — nếu không, hai bản chạy chen
  //    nhau giữa hai câu lệnh sẽ cùng tin mình giữ khoá.
  assert.ok(boChay2.includes("conSong(cu.pid)"), "phải kiểm pid trước khi thu khoá");
  assert.equal((boChay2.match(/flag: "wx"/g) || []).length, 1,
    "chỉ MỘT chỗ đặt khoá, và nó dùng `wx`");
  assert.ok(boChay2.includes("const datKhoa = ()"), "phải có một hàm đặt khoá dùng chung");
  /* CẮT ĐÚNG KHỐI THU KHOÁ rồi mới khẳng định. Bản pin đầu chỉ đếm số chỗ có `wx` trên CẢ FILE
     và hỏi hàm `datKhoa` có tồn tại không — cả hai vẫn đúng khi nhánh thu khoá lặng lẽ đổi sang
     `writeFileSync` trần. Đột biến ⑤ đi lọt đúng khe đó: xanh vì lý do sai. */
  const iThu = boChay2.indexOf("if (cu && !conSong(cu.pid))");
  assert.ok(iThu > 0, "không tìm thấy khối thu khoá mồ côi — pin dưới đây sẽ vô nghĩa");
  const khoiThu = boChay2.slice(iThu, boChay2.indexOf("} else {", iThu));
  assert.ok(khoiThu.includes("datKhoa()"),
    "lượt THU khoá phải gọi lại `datKhoa()` — tức vẫn đi qua `wx`; ghi đè trần thì hai bản chạy chen nhau đều tin mình giữ khoá");
  assert.ok(!/writeFileSync/.test(khoiThu),
    "khối thu khoá không được tự ghi bằng một lượt writeFileSync riêng — đó là đường vòng qua `wx`");

  console.log("  ok  ⓥ bị chặn ≠ xong: hỏi ping trước khi chấm HET_CHUOI · khoá mồ côi tự thu, vẫn qua `wx`");
}

/* ⓦ B-78 — SÀN GIỮA HAI LƯỢT ĐỌC. Đức chốt 12/09 sau khi profile `kaito` ăn CAPTCHA:
 * *"đọc vài trăm lần chỉ trong vài chục giây thì là spam rồi còn gì. Hãy đọc và maintain từ
 * tốn thôi."* Lượt 05:31 nện ~900 lượt/giờ, và ChatGPT đòi xác minh con người ngay sau đó.
 *
 * Ghim ở đây là ghim CHỖ HẸP, không ghim từng con số: có bốn đường đọc, mỗi đường tự chọn
 * nhịp riêng. Vá từng nhịp thì đường thứ năm thêm sau lại tự chọn số của nó.
 */
{
  const src = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  assert.ok(SAN_GIUA_HAI_LUOT_DOC_MS >= 10000,
    `sàn giữa hai lượt đọc phải ≥10 giây, đang là ${SAN_GIUA_HAI_LUOT_DOC_MS}ms`);

  // ⒜ Sàn phải nằm TRONG `doc()` — cửa duy nhất mọi lượt đọc đi qua.
  const iDoc = src.indexOf("const doc = async () =>");
  assert.ok(iDoc > 0, "`doc()` phải là một hàm async — sàn cần chờ được");
  const thanDoc = src.slice(iDoc, src.indexOf("\n  };", iDoc));
  assert.ok(thanDoc.includes("SAN_GIUA_HAI_LUOT_DOC_MS"),
    "sàn phải cưỡng chế NGAY TRONG doc(), không phải ở từng chỗ gọi");
  assert.ok(thanDoc.includes("chat-read"), "cắt nhầm thân hàm — phép ghim dưới sẽ vô nghĩa");
  /* Đo từ lúc lượt trước XONG. Một lượt `chat-read` có thể mất 30 giây rồi mới hết giờ; đo từ
     lúc bắt đầu thì sàn tiêu hết vào thời gian chờ đó và hai lượt vẫn dính nhau. */
  assert.ok(thanDoc.indexOf("mocDocXong = Date.now()") > thanDoc.indexOf("chat-read"),
    "mốc phải đặt SAU lượt gọi — đo từ lúc lượt trước xong, không phải lúc nó bắt đầu");

  /* ⒝ MỌI chỗ gọi phải `await` — một chỗ quên là một đường đọc lọt qua sàn, và nó không đỏ ở
     đâu cả: `doc()` không await trả về một Promise, mà `Promise.ok` là `undefined`, nên nhánh
     "đọc hỏng" chạy mãi mãi trên một lượt đọc chưa bao giờ được chờ.

     LỌC CHÚ THÍCH TRƯỚC KHI ĐẾM. Bản đầu đếm trên cả file và ra 6/3 — ba chỗ thừa là chính lời
     chú thích của tôi nhắc tên `doc()`. Một bộ dò khớp vào văn của chính mình thì con số nó ra
     không nói gì về mã. */
  const chiMaDoc = src.split("\n").filter((d) => {
    const t = d.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  }).join("\n");
  const soGoi = (chiMaDoc.match(/\bdoc\(\)/g) || []).length;
  const soAwait = (chiMaDoc.match(/await doc\(\)/g) || []).length;
  assert.ok(soAwait >= 3, `phải còn đủ các chỗ đọc, đang thấy ${soAwait}`);
  assert.equal(soAwait, soGoi,
    `mọi lượt gọi doc() phải có await: ${soAwait}/${soGoi} — chỗ quên await bỏ qua sàn và trả về Promise`);

  // ⒞ Không đường đọc nào được nghỉ dưới sàn bằng một hằng số riêng.
  for (const m of chiMaDoc.matchAll(/await ngu\((\d+)\)/g)) {
    const ms = Number(m[1]);
    assert.ok(ms >= 5000, `có chỗ nghỉ ${ms}ms — dưới 5 giây là nhịp của máy, không phải của người`);
  }

  console.log("  ok  ⓦ sàn nhịp đọc: cưỡng chế trong doc(), mọi chỗ gọi đều await, ≤60 lượt/giờ khi hỏng");
}

/* ⓧ B-79 — DỪNG NGAY TRONG CỬA SỔ ĐANG CHẠY.
 * Đức 12/09: *"dùng script dừng riêng tôi thấy khó dùng vì phải gõ tay tên luồng dẫn đến sai."*
 */
{
  const src = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  // ⒜ Dừng MỀM — đi chung một đường ra với cờ `DUNG`, không giết ngang.
  assert.ok(src.includes('if (dungTay) { lyDo = `NGUOI_DUNG'),
    "phím bấm phải đặt cờ rồi để vòng lặp tự dừng, không được `process.exit` giữa chừng");
  const iBat = src.indexOf("const batDung = (vi) =>");
  assert.ok(iBat > 0, "không tìm thấy batDung — phép ghim dưới vô nghĩa");
  const thanBat = src.slice(iBat, src.indexOf("\n  };", iBat));
  assert.ok(!/process\.exit|kill/.test(thanBat),
    "batDung KHÔNG được giết tiến trình: bộ chạy có thể đang giữa một lượt GỬI, và lúc đó không ai biết tin nhắn đã bay chưa");

  /* ⒝ CTRL+C. Raw mode NUỐT Ctrl+C — quên bắt lại là cửa sổ này thành thứ không thoát được bằng
     phản xạ quen thuộc nhất, và người ta sẽ đóng cửa sổ, tức đúng cái "giết ngang" vừa cấm. */
  assert.ok(src.includes('k === "\\u0003"'),
    "phải tự bắt Ctrl+C (0x03) khi bật raw mode — nếu không cửa sổ không thoát được");
  assert.ok(!src.includes(String.fromCharCode(3)),
    "Ctrl+C phải viết bằng DÃY THOÁT, không phải byte thô — byte thô làm git coi tệp là nhị phân và diff mù vĩnh viễn");

  // ⒞ Không có TTY thì không được ném. Chạy từ một script khác thì stdin không phải TTY.
  assert.ok(src.includes("if (process.stdin.isTTY)"),
    "setRawMode ném khi stdin không phải TTY — phải hỏi trước");
  assert.ok(src.includes('fs.existsSync(path.join(thuMuc, "DUNG"))'),
    "cờ DUNG phải GIỮ LẠI: lượt chạy không có cửa sổ vẫn cần một cách dừng");

  /* ⒟ Bấm xong phải dừng NGAY. Nhịp giãn tới 2 phút (B-78); `setTimeout` trần thì bấm xong còn
     ngồi chờ hai phút, và người ta sẽ đóng cửa sổ. */
  const iNgu = src.indexOf("const ngu = (ms) =>");
  const thanNgu = src.slice(iNgu, src.indexOf("\n  });", iNgu));
  assert.ok(thanNgu.includes("clearTimeout") || src.includes("danhThuc = () => { clearTimeout"),
    "`ngu()` phải đánh thức được — không thì bấm dừng xong còn chờ hết một nhịp 2 phút");
  assert.ok(thanBat.includes("danhThuc()"), "batDung phải đánh thức lượt nghỉ đang chờ");

  console.log("  ok  ⓧ dừng trong cửa sổ: mềm, bắt lại Ctrl+C, không TTY vẫn chạy, đánh thức ngay");
}

/* ⓨ B-80 — MỐC CANH TAB KHÔNG ĐƯỢC GHIM BẰNG `null`.
 *
 * Bắt tại trận 12/09, chuỗi "Prompt engineer 01" của Đức: lượt đọc đầu hỏng vì `RECEIVER_LOST`
 * (tab đang nạp lại); lượt kế tiếp THÀNH CÔNG nhưng trang chưa dựng xong nên `turns` rỗng.
 * Mốc bị ghim bằng `null`, lượt sau thấy lượt gõ thật, và chuỗi tự giết mình sau 31 giây với
 * `NGUOI_DANG_DUNG` trong khi KHÔNG AI gõ gì cả. `da_gui: 0`.
 */
{
  const src = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  /* ⒜ HÀNH VI, không phải chữ: `null` làm mốc thì MỌI lượt gõ thật đều thành "lượt gõ lạ".
     Đây là cái bẫy — nó chạy đúng theo nghĩa đen của mã cũ, và sai theo nghĩa của việc. */
  assert.equal(canhTab({ idLuotNguoiCuoi: "that", mocLuotNguoi: null }).dung, true,
    "mốc `null` mà so thì báo động — chính vì thế KHÔNG ĐƯỢC để nó lọt vào làm mốc");

  // ⒝ Cửa chặn nằm ở chỗ GHIM MỐC, không ở canhTab.
  assert.ok(src.includes("if (mocLuotNguoi === undefined && idLuotNguoiCuoi)"),
    "chỉ ghim mốc khi ĐỌC RA một lượt thật — danh sách rỗng là 'chưa nhìn thấy', không phải 'không có'");

  /* ⒞ VẾ NGƯỢC — mép vẫn phải bắt được người gõ thật. Thiếu vế này thì một đột biến kiểu
     "không bao giờ so" sẽ thoát, và khi đó chuỗi gõ đè lên hội thoại người khác đang dùng. */
  assert.equal(canhTab({ idLuotNguoiCuoi: "moi", mocLuotNguoi: "cu" }).dung, true,
    "lượt gõ thật khác mốc thì VẪN phải dừng — đây là lý do mép này tồn tại");
  assert.equal(canhTab({ idLuotNguoiCuoi: "y-het", mocLuotNguoi: "y-het" }).dung, false,
    "trùng mốc thì chạy tiếp");
  assert.equal(canhTab({ idLuotNguoiCuoi: null, mocLuotNguoi: "cu" }).dung, false,
    "đọc ra rỗng KHÔNG được coi là người gõ — cùng một lý lẽ, chiều ngược lại");

  // ⒟ Nhật ký phải ghi CẢ HAI ĐẦU của phép so, không chỉ câu kết luận.
  const iGhi = src.indexOf('su_kien: "CANH_TAB"');
  const dongGhi = src.slice(iGhi, src.indexOf("\n", iGhi));
  assert.ok(dongGhi.includes("moc:") && dongGhi.includes("thay:"),
    "CANH_TAB phải ghi cả mốc lẫn cái vừa thấy — nếu không, 'người gõ thật' và 'mốc null' đọc ra y hệt nhau");

  console.log("  ok  ⓨ mốc canh tab: không ghim bằng null, vẫn bắt người gõ thật, nhật ký ghi cả hai đầu");
}

/* ⓩ B-81 — "CHUỖI ĐÃ HẾT" ≠ "CHUỖI CHƯA BAO GIỜ BẮT ĐẦU".
 *
 * Đức 12/09: *"tôi thấy ta chưa bắt được 1 chat đã có text sẵn."* Đo trên hội thoại
 * "Prompt engineer 01": 4 lượt, câu trả lời cuối 2.719 ký tự, `blocks_in_turn: 0` — GPT trả lời
 * văn xuôi thuần. Bộ chạy đọc ĐÚNG, nhưng báo `HET_CHUOI` và **thoát 0**, đọc y như một chuỗi
 * vừa chạy trọn. Cùng một hình dạng lỗi với B-77, ở một mép khác.
 */
{
  const src = fs.readFileSync(
    new URL("../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs", import.meta.url), "utf8");

  // ⒜ Điều kiện phải là CẢ HAI vế. Thiếu `daGui === 0` thì một chuỗi chạy trọn 4 vòng rồi hết
  //    khối cũng bị gọi là "chưa có giao kèo" — sai ngược lại, và làm người ta đi dán thừa.
  assert.ok(src.includes("else if (daGui === 0 && !daThayKhoi)"),
    "chỉ gọi là 'chưa có giao kèo' khi CHƯA gửi vòng nào VÀ chưa từng thấy khối");

  // ⒝ Cờ phải được bật từ lượt đọc, và bật cho CẢ lượt chạy — không reset theo vòng.
  assert.ok(src.includes("if (r.last_copy_block?.found) daThayKhoi = true;"),
    "phải đánh dấu khi đọc ra một khối thật");
  const iVong = src.indexOf("for (let vong = 1;");
  const iCo = src.indexOf("let daThayKhoi = false;");
  assert.ok(iCo > 0 && iCo < iVong,
    "`daThayKhoi` phải khai NGOÀI vòng lặp vòng — khai trong thì mỗi vòng quên sạch");

  /* ⒞ MÃ THOÁT. Đây là vế chịu tải: `HET_CHUOI` thoát 0, và một hội thoại chưa có giao kèo
     KHÔNG được đi chung cửa đó. Tên lý do phải nằm ngoài nhóm thoát 0. */
  const iThoat = src.indexOf("process.exit(lyDo ===");
  assert.ok(iThoat > 0, "không tìm thấy dòng mã thoát");
  const dongThoat = src.slice(iThoat, src.indexOf("\n", iThoat));
  assert.ok(!dongThoat.includes("CHUA_CO_GIAO_KEO"),
    "CHUA_CO_GIAO_KEO không được lọt vào nhóm thoát 0 — chưa làm được gì thì không phải thành công");
  assert.ok(src.includes('lyDo = "CHUA_CO_GIAO_KEO'),
    "phải ĐỔI lyDo, vì mã thoát bám vào lyDo");

  // ⒟ Phải nói người ta làm gì, không chỉ nói nó hỏng.
  const iNhanh = src.indexOf("else if (daGui === 0 && !daThayKhoi)");
  const thanNhanh = src.slice(iNhanh, src.indexOf("break;", iNhanh));
  assert.match(thanNhanh, /GIAO KÈO NỐI VÒNG/,
    "phải chỉ đúng thứ cần dán vào hội thoại, không bắt người đi tra");
  assert.ok(thanNhanh.includes('su_kien: "CHUA_CO_GIAO_KEO"'), "phải vào nhật ký, không chỉ in màn hình");

  console.log("  ok  ⓩ chưa có giao kèo ≠ chạy hết: đòi cả hai vế, thoát 1, và nói phải dán gì");
}

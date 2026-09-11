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
import { quyetDinh, ketLuanGui, canhTab, hoiThoaiCua, luotDaChot, TRAN_VONG, TRAN_KY_TU_KHOI, NGUONG_YEN } from "../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs";

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

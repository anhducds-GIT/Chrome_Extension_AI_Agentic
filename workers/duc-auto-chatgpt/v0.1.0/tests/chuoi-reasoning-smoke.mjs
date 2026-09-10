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
import { quyetDinh, ketLuanGui, TRAN_VONG, TRAN_KY_TU_KHOI, NGUONG_YEN } from "../duc-auto-chatgpt-loopback-bridge-host-v1/chuoi-reasoning.mjs";

const KHOI_CU = "turn-cu";
const khoiTot = (text = "prompt vòng sau", turn = "turn-moi") =>
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
  const khoiCC = { found: true, turn_id: "t9", chars: 1671, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: Claude Code (CC) — MỐC ② trước VÒNG 7/12.\n\nLàm gì đó." };
  const r = quyetDinh({ generating: false, khoi: khoiCC, khoiCu: "t8", daNapLai: false, daThayDangChay: true });
  assert.equal(r.viec, "DUNG", "khối giao cho CC mà vẫn GUI");
  assert.match(r.vi, /CAN_NGUOI/);
  assert.match(r.vi, /Claude Code/); // cắt trước "(" nên tên là "Claude Code", không kèm "(CC)"

  const khoiGPT = { found: true, turn_id: "t9", chars: 1388, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: GPT Web — Repo Rule Audit, VÒNG 6/12.\n\nLàm gì đó." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiGPT, khoiCu: "t8", daNapLai: false, daThayDangChay: true }).viec,
    "GUI", "khối giao cho GPT phải đi tiếp");

  // Không khai người nhận thì chạy như cũ — chuỗi khác không bắt buộc theo mẫu này.
  const khoiTron = { found: true, turn_id: "t9", chars: 40, truncated: false, text: "Vòng tiếp theo: làm X." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiTron, khoiCu: "t8", daNapLai: false, daThayDangChay: true }).viec, "GUI");

  /* Bẫy đã lường: dòng giao cho CC mà có nhắc chữ GPT ở phần mô tả. So cả dòng thì lọt. */
  const khoiBay = { found: true, turn_id: "t9", chars: 60, truncated: false,
    text: "NGƯỜI NHẬN/THỰC THI: Claude Code (CC) — đối chiếu kết quả GPT\n\nLàm gì đó." };
  assert.equal(quyetDinh({ generating: false, khoi: khoiBay, khoiCu: "t8", daNapLai: false, daThayDangChay: true }).viec,
    "DUNG", "so cả dòng nên tưởng khối này của GPT");

  // CHIỀU NGƯỢC: logic cũ (không hỏi người nhận) phải GUI đúng cái khối CC — tức lỗi tái hiện được.
  assert.equal(quyetDinh({ generating: false, khoi: { ...khoiCC, text: "Làm gì đó." }, khoiCu: "t8", daNapLai: false, daThayDangChay: true }).viec,
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

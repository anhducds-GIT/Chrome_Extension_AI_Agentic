/* Phép ghim cho `run-liveness-core.js` — F-25 bước ②.
 *
 * Ca phải dựng được, và là lý do file này tồn tại: chuỗi ĐỨNG YÊN 22 PHÚT trong khi trạng
 * thái vẫn báo `RUNNING`. Đo thật 02/09, lượt F4R8. Dựng được ca đó ở đây vì `danhGia` nhận
 * `now` làm tham số — nếu nó tự đọc `Date.now()` thì phép kiểm này không thể tồn tại, và
 * bản vá sẽ chỉ là văn xuôi.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../run-liveness-core.js", import.meta.url), "utf8"), context);
const L = context.DacRunLiveness;
const sidePanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const panelHtml = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

const T0 = 1_757_000_000_000;
const dangChay = { running: true, paused: false, pauseRequested: false };

/* ---- CA CHÍNH: 22 phút im lặng, trạng thái vẫn RUNNING ------------------- */
{
  const beat = L.nhip("INTER_JOB_DELAY", null, T0);
  const sau22phut = L.danhGia({ ...dangChay, beat, now: T0 + 22 * 60 * 1000 });
  assert.equal(sau22phut.stalled, true, "22 phút không nhịp PHẢI bị kết luận là chết");
  assert.equal(sau22phut.alive, false);
  assert.equal(sau22phut.reason, L.CHUOI_CHET);
  assert.equal(sau22phut.heartbeat_age_ms, 22 * 60 * 1000, "phải nói RÕ đứng yên bao lâu, không chỉ nói có/không");
  assert.equal(sau22phut.stage, "INTER_JOB_DELAY", "phải nói chết ở BƯỚC NÀO — chẩn đoán không chỉ ra bước thì không dẫn ai tới đâu");
  assert.match(L.cauChoNguoiDoc(sau22phut), /ĐỨNG YÊN 22 phút/, "câu cho Đức đọc phải có con số");
}

/* ---- Và chiều ngược lại: đang chờ nhịp KHÔNG được báo động ---------------- */
{
  // Đây là nửa quan trọng thứ hai. Một cảnh báo báo oan sẽ bị người vận hành học cách phớt
  // lờ, và lúc đó nó tệ hơn không có cảnh báo nào.
  const cho = L.danhGia({ ...dangChay, beat: L.nhip("INTER_JOB_DELAY", null, T0), now: T0 + 3000 });
  assert.equal(cho.stalled, false, "3 giây trong nhịp đếm ngược là bình thường");
  assert.equal(cho.reason, L.DANG_CHO_NHIP);

  // Chờ video sinh: trần LÀ timeout của job, nên 4 phút vẫn bình thường nếu job cho 5 phút.
  const choVideo = L.nhip("WAITING_JOB", 5 * 60 * 1000, T0);
  assert.equal(L.danhGia({ ...dangChay, beat: choVideo, now: T0 + 4 * 60 * 1000 }).stalled, false,
    "chờ video sinh trong hạn KHÔNG phải chết");
  assert.equal(L.danhGia({ ...dangChay, beat: choVideo, now: T0 + 6 * 60 * 1000 }).stalled, true,
    "quá hạn job thì mới là chết");
}

/* ---- Mỗi giai đoạn tự khai trần, không dùng một trần chung ---------------- */
{
  // Nếu dùng một trần chung thì nó phải lấy theo giai đoạn chờ lâu nhất (chờ video, hàng
  // phút) — và khi đó mọi giai đoạn ngắn đều mù suốt mấy phút. Đúng chỗ rẻ nhất để phát hiện
  // lại là chỗ phát hiện chậm nhất.
  const ngan = L.nhip("INTER_JOB_DELAY", null, T0);
  const dai = L.nhip("RECONCILE", null, T0);
  assert.ok(ngan.expected_next_ms < dai.expected_next_ms, "hai giai đoạn phải có hai trần khác nhau");
  const now = T0 + 30_000;
  assert.equal(L.danhGia({ ...dangChay, beat: ngan, now }).stalled, true, "30 giây ở bước đếm ngược là chết");
  assert.equal(L.danhGia({ ...dangChay, beat: dai, now }).stalled, false, "30 giây ở bước đối chiếu là bình thường");
}

/* ---- FAIL-CLOSED và ranh giới của nó ------------------------------------- */
{
  // Đang chạy mà KHÔNG có nhịp nào = chết. Vòng lặp đập nhịp ngay khi khởi động, nên ca này
  // là một lỗi thật — và im lặng ở đây là im lặng đúng kiểu đã mất 22 phút.
  for (const beat of [null, undefined, {}, { at: "hom qua" }, { at: NaN }]) {
    const v = L.danhGia({ ...dangChay, beat, now: T0 });
    assert.equal(v.stalled, true, `nhịp không đọc được (${JSON.stringify(beat)}) phải kết luận là chết`);
    assert.equal(v.reason, L.KHONG_CO_NHIP);
  }
  // Nhịp có mốc nhưng trần hỏng: cũng fail-closed, và vẫn nói ra tuổi để người đọc có số.
  const tranHong = L.danhGia({ ...dangChay, beat: { stage: "GATE_CHECK", at: T0, expected_next_ms: 0 }, now: T0 + 5000 });
  assert.equal(tranHong.stalled, true, "trần hỏng thì fail-closed");
  assert.equal(tranHong.heartbeat_age_ms, 5000);

  // NHƯNG người tạm dừng thì KHÔNG phải chết — nó đang chờ NGƯỜI, và người không có trần.
  // Báo động ở đây là báo động oan mỗi lần Đức đi uống nước.
  for (const co of [{ paused: true }, { pauseRequested: true }]) {
    const v = L.danhGia({ running: true, ...co, beat: L.nhip("INTER_JOB_DELAY", null, T0), now: T0 + 60 * 60 * 1000 });
    assert.equal(v.stalled, false, "tạm dừng một tiếng vẫn không phải chết");
    assert.equal(v.reason, L.NGUOI_TAM_DUNG);
  }
  // Không chạy thì không phán gì.
  assert.equal(L.danhGia({ running: false, beat: null, now: T0 }).reason, L.KHONG_CHAY);

  // Đồng hồ chạy lùi (đổi giờ hệ thống, máy ngủ rồi thức) cho tuổi ÂM. Để nguyên thì nó luôn
  // "sống" — fail-OPEN, đúng hướng hỏng nguy hiểm. Phải kẹp về 0.
  const lui = L.danhGia({ ...dangChay, beat: L.nhip("INTER_JOB_DELAY", null, T0), now: T0 - 10 * 60 * 1000 });
  assert.equal(lui.heartbeat_age_ms, 0, "tuổi âm phải kẹp về 0, không được để nó chứng minh là sống");
  assert.equal(lui.stalled, false);
}

/* ---- Giai đoạn phải KHAI trước, và trần bắt buộc phải có ------------------ */
{
  // Gõ sai tên giai đoạn mà im lặng cho qua là cách một bước quan trọng biến thành không được
  // canh — không lỗi, không cảnh báo, chỉ là một chỗ mù mới.
  assert.throws(() => L.nhip("WAITING_FOR_GODOT", null, T0), /NHIP_LA/, "giai đoạn chưa khai phải NÉM");
  // `WAITING_JOB` cố ý không có trần mặc định: trần của nó LÀ timeout thật của job. Chọn hộ
  // một con số ở đây là chọn hộ ranh giới giữa "im 22 phút" và "báo oan".
  assert.throws(() => L.nhip("WAITING_JOB", null, T0), /NHIP_THIEU_TRAN/, "chờ job phải được đưa timeout thật");
  assert.throws(() => L.nhip("WAITING_JOB", 0, T0), /NHIP_THIEU_TRAN/);
  assert.throws(() => L.danhGia({ ...dangChay, beat: null }), /DANH_GIA_THIEU_NOW/, "thiếu `now` phải NÉM, không được tự đọc đồng hồ");
}

/* ---- Đã NỐI vào vòng lặp thật, không chỉ tồn tại như một module ---------- */
{
  // Một module đúng mà không ai gọi thì không vá được gì. Ba khẳng định dưới đây ghim chỗ nối.
  assert.match(panelHtml, /run-liveness-core\.js/, "module phải được nạp trong side panel");
  assert.match(sidePanelSource, /window\.DacRunLiveness/, "sidepanel phải dùng module này");

  // Nhịp phải đập TỪ TRONG vòng lặp chạy job. Đây là điểm dễ làm sai nhất: panel VẪN SỐNG lúc
  // gãy (chính nó trả lời run.status), nên một `setInterval` trong panel sẽ tích tắc vui vẻ
  // và không phát hiện được gì.
  //
  // PHẢI CẮT ĐÚNG THÂN HÀM, không dùng `/async function X[\s\S]*?dapNhip\(/`. Bản đầu viết thế
  // và **ba phép thử phá đều thoát**: `[\s\S]*?` chạy tiếp qua hết hàm để tìm `dapNhip(` ở một
  // hàm KHÁC phía sau, nên xoá nhịp khỏi `countdown` vẫn xanh. Đúng loại phép kiểm xanh một
  // cách vô nghĩa mà repo này đã bắt được ba lần.
  const thanHam = (ten) => {
    const dau = sidePanelSource.indexOf(`async function ${ten}(`);
    assert.notEqual(dau, -1, `không tìm thấy hàm ${ten} trong sidepanel.js`);
    const sau = sidePanelSource.indexOf("\n  async function ", dau + 1);
    return sidePanelSource.slice(dau, sau === -1 ? sidePanelSource.length : sau);
  };
  // Ghim TỪNG nhịp vào ĐÚNG VỊ TRÍ của nó, không chỉ đòi "hàm run có nhịp nào đó". Bản trước
  // đòi thế và hai phép thử phá vẫn thoát: xoá nhịp `QUEUE_ADVANCE` đi thì `WAITING_JOB` và
  // `GATE_CHECK` vẫn còn, nên khẳng định vẫn xanh trong khi một chỗ mù vừa mở ra.
  const than = thanHam("run");
  assert.match(than, /state\.running = true;[\s\S]{0,600}?dapNhip\("QUEUE_ADVANCE"\)/,
    "nhịp ĐẦU TIÊN phải đập ngay cạnh `running = true` — nếu không thì có một khoảnh khắc đang-chạy-mà-chưa-có-nhịp, và fail-closed sẽ báo động oan");
  assert.match(than, /const item = runQueue\[runIndex\];\s*\n\s*dapNhip\("QUEUE_ADVANCE"\)/,
    "mỗi lượt qua hàng đợi phải đập nhịp — đây là nhịp bắt được ca vòng lặp đứng giữa hàng đợi");
  assert.match(than, /dapNhip\("GATE_CHECK"\);\s*\n\s*const gate = await gateNextJob/,
    "cổng readiness phải đập nhịp trước khi chờ");
  assert.match(than, /dapNhip\("WAITING_JOB", item\.settings\.timeout_sec \* 1000 \+ NHIP_BIEN_MS\);[\s\S]{0,400}?await send\(\{ type: "DAC_RUN_IMAGE_JOB"/,
    "bước chờ video phải lấy trần từ timeout THẬT của job, và phải đập ngay trước cú chờ");
  assert.equal((than.match(/dapNhip\(/g) || []).length, 4, "hàm run phải có đúng 4 nhịp — thêm/bớt thì phải sửa cả phép kiểm này một cách có ý thức");
  assert.match(thanHam("countdown"), /dapNhip\("INTER_JOB_DELAY"\)/, "bước đếm ngược phải đập nhịp mỗi giây");
  // `[^)]*` không đủ: `setInterval(() => dapNhip(…))` có dấu `)` ngay trong `() =>`, nên lớp
  // chặn cũ trượt đúng cái ca nó sinh ra để chặn.
  assert.doesNotMatch(sidePanelSource, /setInterval\([\s\S]{0,120}?dapNhip/, "nhịp KHÔNG được do đồng hồ riêng đập — panel còn sống lúc gãy");

  // Và `run.status` phải trả kết quả ra ngoài, nếu không AI điều phối vẫn mù như cũ.
  const thanStatus = (() => {
    const dau = sidePanelSource.indexOf("function bridgeRunStatus(");
    assert.notEqual(dau, -1);
    return sidePanelSource.slice(dau, sidePanelSource.indexOf("\n  }", dau));
  })();
  assert.match(thanStatus, /\bloop: liveness\b/, "run.status phải trả khối `loop`");
  // Bốn cờ phải đọc từ `state` THẬT. Đóng cứng bất kỳ cờ nào là một lời nói dối im lặng: đóng
  // `running: true` thì bảng báo "chuỗi chết" trong khi chẳng có chuỗi nào chạy, và người vận
  // hành sẽ học cách phớt lờ cảnh báo — hỏng đúng theo hướng khó thấy nhất.
  for (const [truong, nguon] of [["running", "state.running"], ["paused", "state.paused"], ["pauseRequested", "state.pauseRequested"], ["beat", "state.loopBeat"]]) {
    assert.match(thanStatus, new RegExp(truong + ":\\s*" + nguon.replace(".", "\\.") + "\\b"),
      `\`${truong}\` phải đọc từ \`${nguon}\`, không được đóng cứng`);
  }
  assert.match(thanStatus, /now: Date\.now\(\)/, "chỗ gọi mới được đọc đồng hồ — hàm thuần thì không");
}

console.log("run liveness core smoke tests: PASS");

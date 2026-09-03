/* run-liveness-core.js — F-25 bước ②: phân biệt "đang chờ nhịp" với "không còn ai chạy".
 *
 * BÀI TOÁN, đo thật ngày 02/09 (lượt F4R8, bằng chứng `evidence/F4R8-KET-QUA.md`):
 * chuỗi 7 job dừng sau Q004 và **đứng yên 22 phút**, trong khi mọi lớp đều báo bình thường —
 * `run.status` trả `state: RUNNING`, `running: 0`, `halt: null`; `system.ping` báo executor
 * còn sống; `run.stop` trả `ok:true` mà trạng thái không đổi. Không lỗi, không halt, không
 * dấu hiệu nào ngoài việc số đếm ngừng nhích.
 *
 * Vì sao `run.status` cũ không thể phát hiện: nó chỉ chụp **trạng thái**, mà một chuỗi đang
 * chờ nhịp 90 giây và một chuỗi đã chết có **cùng một trạng thái**. Thứ phân biệt hai ca đó
 * không phải trạng thái — mà là **thời gian**: chuỗi sống thì có cái gì đó nhích đều.
 *
 * VÌ SAO KHÔNG DÙNG MỘT ĐỒNG HỒ RIÊNG (setInterval): panel VẪN SỐNG lúc gãy — chính nó trả
 * lời `run.status`. Một `setInterval` trong panel sẽ tiếp tục tích tắc vui vẻ và không phát
 * hiện được gì. Nhịp tim phải do **chính vòng lặp chạy job** đập ra, nên nó im đúng lúc vòng
 * lặp im. Đây là điểm dễ làm sai nhất của bản vá này.
 *
 * MỖI NHỊP TỰ KHAI TRẦN CHỜ CỦA MÌNH (`expected_next_ms`) thay vì dùng một trần chung. Trần
 * chung phải lấy theo giai đoạn chờ lâu nhất (chờ video sinh, hàng phút), nên nó sẽ mù suốt
 * những giai đoạn đáng ra chỉ vài giây — tức chậm phát hiện đúng ở chỗ rẻ nhất để phát hiện.
 *
 * File này là HÀM THUẦN: không đọc đồng hồ, không đọc DOM, không chạm `state`. `now` là tham
 * số. Vì sao quan trọng: một phép kiểm về thời gian mà tự đọc `Date.now()` thì không dựng
 * được ca "đã 22 phút" — và ca đó chính là ca phải ghim.
 */
(function () {
  "use strict";

  /* Trần chờ cho từng giai đoạn, tính bằng mili-giây. Khai ở đây, KHÔNG rải trong sidepanel:
     một con số trần nằm lẫn trong code gọi là con số không ai kiểm được.

     Cách chọn: trần = thời gian chờ ĐÚNG của giai đoạn đó, cộng biên. Đặt quá chặt thì báo
     động oan và người vận hành sẽ học cách phớt lờ nó — một cảnh báo bị phớt lờ tệ hơn không
     có cảnh báo. Đặt quá rộng thì lại về đúng bài toán 22 phút. */
  var TRAN = {
    QUEUE_ADVANCE: 15000,      // giữa hai job: chỉ là mấy phép ghi sổ
    GATE_CHECK: 60000,         // cổng readiness: có chờ trang, nhưng có hạn riêng
    INTER_JOB_DELAY: 5000,     // đang đếm ngược — nhịp đập mỗi giây, nên trần rất chặt
    WAITING_JOB: null,         // chờ video sinh: trần LÀ timeout của job, bên gọi phải đưa
    RECONCILE: 120000          // đối chiếu sổ cái + tải file về
  };

  var KHONG_CO_NHIP = "KHONG_CO_NHIP";
  var CHUOI_CHET = "CHUOI_CHET";
  var DANG_CHO_NHIP = "DANG_CHO_NHIP";
  var KHONG_CHAY = "KHONG_CHAY";
  var NGUOI_TAM_DUNG = "NGUOI_TAM_DUNG";

  /* Một nhịp tim. `expectedNextMs` là trần chờ mà giai đoạn này tự khai; thiếu thì lấy theo
     bảng TRAN. Giai đoạn `WAITING_JOB` KHÔNG có trần mặc định — bên gọi phải đưa timeout thật
     của job, và nếu quên thì hàm này NÉM chứ không lặng lẽ chọn hộ một con số. Chọn hộ ở đây
     là chọn hộ ranh giới giữa "im lặng 22 phút" và "báo động oan". */
  function nhip(stage, expectedNextMs, at) {
    var ten = String(stage || "");
    if (!Object.prototype.hasOwnProperty.call(TRAN, ten)) {
      throw new Error("NHIP_LA: giai đoạn \"" + ten + "\" chưa khai trong TRAN của run-liveness-core.");
    }
    var tran = expectedNextMs === undefined || expectedNextMs === null ? TRAN[ten] : Number(expectedNextMs);
    if (!Number.isFinite(tran) || tran <= 0) {
      throw new Error("NHIP_THIEU_TRAN: giai đoạn \"" + ten + "\" cần trần chờ (mili-giây) mà bên gọi không đưa.");
    }
    return { stage: ten, at: Number(at), expected_next_ms: tran };
  }

  /* Phán xét: chuỗi còn sống hay đã chết âm thầm.
   *
   * FAIL-CLOSED có chọn lọc, và ranh giới nằm ở chỗ "ai đang chờ ai":
   *   · đang chạy mà KHÔNG có nhịp nào  → coi là chết. Vòng lặp đập nhịp ngay khi khởi động,
   *     nên không nhịp lúc đang chạy là một lỗi thật, và im lặng ở đây là im lặng đúng kiểu
   *     đã mất 22 phút.
   *   · người tạm dừng                  → KHÔNG phải chết. Nó đang chờ NGƯỜI, và người thì
   *     không có trần thời gian. Báo động ở đây là báo động oan mỗi lần Đức đi uống nước.
   *   · không chạy                      → không phán gì.
   */
  function danhGia(input) {
    var opts = input || {};
    var now = Number(opts.now);
    if (!Number.isFinite(now)) throw new Error("DANH_GIA_THIEU_NOW: `now` phải là mốc thời gian (số).");

    if (!opts.running) return { alive: true, stalled: false, reason: KHONG_CHAY, heartbeat_age_ms: null, expected_next_ms: null, stage: null };
    if (opts.paused || opts.pauseRequested) return { alive: true, stalled: false, reason: NGUOI_TAM_DUNG, heartbeat_age_ms: null, expected_next_ms: null, stage: null };

    var beat = opts.beat;
    if (!beat || !Number.isFinite(Number(beat.at))) {
      return { alive: false, stalled: true, reason: KHONG_CO_NHIP, heartbeat_age_ms: null, expected_next_ms: null, stage: null };
    }

    var age = now - Number(beat.at);
    // Đồng hồ chạy lùi (đổi giờ hệ thống, máy ngủ rồi thức) cho tuổi âm. Kẹp về 0: tuổi âm
    // không chứng minh được điều gì, và để nguyên thì nó luôn "sống" — fail-OPEN.
    if (age < 0) age = 0;
    var tran = Number(beat.expected_next_ms);
    if (!Number.isFinite(tran) || tran <= 0) {
      return { alive: false, stalled: true, reason: KHONG_CO_NHIP, heartbeat_age_ms: age, expected_next_ms: null, stage: beat.stage || null };
    }

    var chet = age > tran;
    return {
      alive: !chet,
      stalled: chet,
      reason: chet ? CHUOI_CHET : DANG_CHO_NHIP,
      heartbeat_age_ms: age,
      expected_next_ms: tran,
      stage: beat.stage || null
    };
  }

  /* Câu cho Đức đọc trên side panel. Chữ operator là tiếng Việt (luật vàng 5); mã lý do giữ
     tiếng Anh/không dấu để máy khớp được. */
  function cauChoNguoiDoc(verdict) {
    var v = verdict || {};
    if (v.reason === KHONG_CHAY) return "Không có chuỗi nào đang chạy.";
    if (v.reason === NGUOI_TAM_DUNG) return "Đang tạm dừng, chờ bạn cho chạy tiếp.";
    if (v.reason === KHONG_CO_NHIP) return "Chuỗi báo là đang chạy nhưng KHÔNG có nhịp nào — coi như đã chết. Kiểm side panel.";
    if (v.stalled) {
      return "Chuỗi ĐỨNG YÊN " + giay(v.heartbeat_age_ms) + " ở bước \"" + (v.stage || "?")
        + "\", quá trần " + giay(v.expected_next_ms) + ". Vòng chạy có thể đã chết âm thầm.";
    }
    return "Chuỗi còn sống — nhịp cuối cách đây " + giay(v.heartbeat_age_ms) + ", đang ở bước \"" + (v.stage || "?") + "\".";
  }

  function giay(ms) {
    var n = Number(ms);
    if (!Number.isFinite(n)) return "?";
    if (n < 1000) return n + " ms";
    var s = Math.round(n / 1000);
    if (s < 60) return s + " giây";
    var phut = Math.floor(s / 60);
    var du = s % 60;
    return du ? phut + " phút " + du + " giây" : phut + " phút";
  }

  var api = {
    TRAN: TRAN,
    KHONG_CO_NHIP: KHONG_CO_NHIP,
    CHUOI_CHET: CHUOI_CHET,
    DANG_CHO_NHIP: DANG_CHO_NHIP,
    KHONG_CHAY: KHONG_CHAY,
    NGUOI_TAM_DUNG: NGUOI_TAM_DUNG,
    nhip: nhip,
    danhGia: danhGia,
    cauChoNguoiDoc: cauChoNguoiDoc
  };

  if (typeof window !== "undefined") window.DacRunLiveness = api;
  if (typeof globalThis !== "undefined") globalThis.DacRunLiveness = api;
})();

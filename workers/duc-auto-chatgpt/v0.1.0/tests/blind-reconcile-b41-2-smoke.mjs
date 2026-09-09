/**
 * GHIM B-41 ⑵ (ADR-0050 ⒞) — ĐỐI SOÁT MỘT BỘ DÒ MÙ, VÀ **KHÔNG BAO GIỜ GỬI LẠI**.
 *
 * ═══ FILE NÀY LÀ MỘT PHÉP GHIM HỒI QUY CHO MỘT LỖI ĐÃ SHIP RỒI ĐÃ GỠ ═══
 *
 * Bản đầu (commit `5cd84c4c`, 09/09) CÓ một cửa gửi lại prompt gốc khi một phép tự kiểm ba vế
 * "khẳng định" được là máy chủ không tạo ra gì. Audit Codex cùng ngày dựng được **hai chuỗi sự
 * kiện cụ thể** trong đó phép đó trả `true` **trong khi kết quả ĐÃ CÓ trên máy chủ**, và tôi
 * dựng lại được cả hai trên chính hàm đã ship:
 *
 *   ⑴ Sau cú F5, lượt đọc đầu tiên thấy một lượt trả lời **cũ** trong khi lượt trả lời của job
 *     này chưa vẽ xong. Đủ ba vế → khẳng định → gửi lại. Vòng dò còn **thoát ngay** ở lượt đọc
 *     đó, vì điều kiện thoát là *"đã thấy MỘT lượt trả lời nào đó"* — thứ mà lịch sử hội thoại
 *     thoả mãn sẵn. Nó đo **bộ đọc còn sống**, không đo **câu trả lời đã xong**. Hai thứ khác nhau.
 *   ⑵ Hai job chung một đoạn mở đầu dài → cùng khoá prompt → neo vào lượt hỏi của **job khác**.
 *
 * **Cái sai không phải một điều kiện thiếu: không thể khẳng định "máy chủ không tạo gì" từ DOM.**
 * "Chưa vẽ", "không có", và "selector mục một phần" trông y hệt nhau từ bên trong. Nên vế
 * *"khẳng định được là không có thì mới gửi lại"* của ADR-0050 ⒞ là một vế **KHÔNG THI HÀNH
 * ĐƯỢC**, và số nguồn khẳng định được điều đó vẫn là **0** như phép đo của ADR-0047.
 *
 * Mọi mép dưới đây tồn tại để **cửa đó không mọc lại**. Mỏ neo được ĐẾM.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = (ten) => fs.readFileSync(path.join(here, "..", ten), "utf8").split("\r\n").join("\n");
const khongChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");

/* ---- ⓐ HAI HÀM ĐÃ BỊ XOÁ PHẢI Ở NGUYÊN TRẠNG BỊ XOÁ ------------------------------ */

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(doc("reconciliation-core.js"), ctx);
const C = ctx.window.DacReconciliationCore;
const rc = { window: {}, URL };
vm.createContext(rc);
vm.runInContext(doc("runner-core.js"), rc);
const R = rc.window.DacRunnerCore || rc.DacRunnerCore;

// ⑴ Mỏ neo: hai module vẫn nạp được, nên "không có hàm" dưới đây là KHÔNG CÓ, chứ không phải
// "module hỏng nên đọc ra undefined" — đúng cái bẫy đã làm một mép xanh vì lý do sai.
assert.equal(typeof C?.answerAfterPrompt, "function", "mỏ neo hỏng: reconciliation-core không nạp được");
assert.equal(typeof R?.canRetry, "function", "mỏ neo hỏng: runner-core không nạp được");

// ⑵ Phép "khẳng định không có kết quả" phải KHÔNG tồn tại. Thêm lại nó là mở lại đúng con bug.
assert.equal(C.blindAbsenceAffirmed, undefined,
  "blindAbsenceAffirmed() đã bị XOÁ 09/09 sau audit: nó trả true trong khi kết quả ĐÃ CÓ. Muốn dựng lại thì phải có một neo KHÔNG PHẢI CHỮ (xem B-45), và phải đọc lại ADR-0047 trước");
assert.equal(R.mayResendAfterBlindReconcile, undefined,
  "cửa gửi lại sau đối soát mù đã bị XOÁ — đừng khai lại nó mà không có bằng chứng mới");
assert.equal(R.MAX_BLIND_RESENDS_PER_JOB, undefined, "và nắp của nó cũng vậy");
assert.equal(R.BLIND_RECONCILABLE_FAILURE_TYPES, undefined);

// ⑶ DETECTION_BLIND vẫn là dừng hẳn, và canRetry() vẫn không nới một chữ.
assert.ok(R.HARD_STOP_FAILURE_TYPES.has("DETECTION_BLIND"));
assert.equal(R.canRetry({ phase: "SUBMITTED", retry_count: 0, settings: { max_retries: 3 } }, "DETECTION_BLIND"), false);
assert.equal(R.mayRepair({ phase: "SUBMITTED" }, "DETECTION_BLIND", 0), false);
assert.equal(R.mayAskProviderRepair({ phase: "SUBMITTED" }, "DETECTION_BLIND", 0), false);

/* ---- ⓑ NEO LƯỢT HỎI: phải DUY NHẤT ---------------------------------------------- */

const MO_DAU = "Phong cach tranh khac go Nhat Ban, net day, tuong phan cao, bang mau tram, khong co chu trong anh, ti le 3:2, do phan giai cao, anh sang chieu tu ben trai, hau canh don gian";
const JOB1 = `${MO_DAU} Chu the: mot con meo tren mai nha.`;
const JOB2 = `${MO_DAU} Chu the: mot con cho trong san.`;

// ⑷ Mỏ neo cho chính phép đo đã sinh ra bản sửa: đoạn mở đầu PHẢI dài hơn nắp so-khớp, nếu
// không thì ca ⑵ của Codex không còn dựng được và các mép dưới thành vô nghĩa.
assert.ok(MO_DAU.length > C.PROMPT_MATCH_CHARS, `mỏ neo hỏng: đoạn mở đầu (${MO_DAU.length}) phải dài hơn nắp (${C.PROMPT_MATCH_CHARS})`);

// ⑸ ĐẦU + ĐUÔI: hai job chung đoạn mở đầu nay có khoá KHÁC nhau. Bản cũ chỉ lấy 160 ký tự đầu
// nên chúng trùng khoá — đó là ca ⑵ của Codex.
assert.notEqual(C.promptKey(JOB1), C.promptKey(JOB2),
  "hai job chung đoạn mở đầu dài phải có khoá KHÁC nhau — khoá chỉ-lấy-đầu bỏ mất đúng phần phân biệt");
// Nhưng KHÔNG chuyển sang so trọn prompt: innerText dựng lại markdown nên so trọn sẽ không
// khớp gì cả, và một lỗi báo-thành-công-giả sẽ thành lỗi không-bao-giờ-đối-soát-được.
assert.ok(C.promptKey(JOB1).length < JOB1.length || JOB1.length <= C.PROMPT_MATCH_CHARS * 2,
  "khoá phải là ĐẦU+ĐUÔI có nắp, không phải trọn prompt");
// Và nó vẫn phải chịu được lệch khoảng trắng do innerText gói dòng.
assert.equal(C.promptKey(JOB1), C.promptKey(JOB1.split(" ").join("\n   ")),
  "gói dòng lại vẫn phải ra cùng khoá");

// ⑹ ═══ MÉP CHỊU TẢI ⒜ ═══ TRÙNG KHOÁ → TỪ CHỐI KẾT LUẬN, không phải "lấy lượt cuối".
// Bản cũ lấy lượt khớp CUỐI, và đó là chỗ Codex chọc: nó neo vào lượt của job khác rồi ghi câu
// trả lời của job khác vào sổ với dấu đã-xác-minh.
{
  const rows = [
    { role: "user", text: JOB1 },
    { role: "assistant", text: "cau tra loi cua JOB1" },
    { role: "user", text: JOB1 }
  ];
  assert.equal(C.soleUserTurnIndex(rows, JOB1), C.MATCH_AMBIGUOUS, "hai lượt hỏi cùng khoá = không kết luận được");
  const hit = C.answerAfterPrompt(rows, JOB1);
  assert.equal(hit.found, false, "trùng khoá thì answerAfterPrompt PHẢI từ chối");
  assert.equal(hit.reason, "AMBIGUOUS_PROMPT_MATCH");
  assert.equal(hit.text, "", "và tuyệt đối không trả về chữ nào — chữ đó có thể của job khác");
}

// ⑺ ĐÁNH ĐỔI ĐÃ NHẬN, ghi ra để không ai đọc mép ⑹ rồi tưởng nó miễn phí: cùng một prompt được
// một NGƯỜI gửi lại bằng tay trong cùng hội thoại nay cũng bị từ chối, nên job đó dừng thay vì
// tự lấy câu trả lời mới nhất. Chọn hướng này vì cái mất là một lượt người xem, còn hướng kia
// làm dữ liệu sai đi thẳng vào sổ mà không ai thấy. Cần chính xác hơn thì phải neo vào
// `data-message-id` (B-45), không phải nới mép này.
{
  const rows = [
    { role: "user", text: "cau hoi lap lai" },
    { role: "assistant", text: "tra loi lan mot" },
    { role: "user", text: "cau hoi lap lai" },
    { role: "assistant", text: "tra loi lan hai" }
  ];
  assert.equal(C.answerAfterPrompt(rows, "cau hoi lap lai").reason, "AMBIGUOUS_PROMPT_MATCH",
    "đánh đổi đã nhận: người gửi lại tay thì máy DỪNG, không đoán");
}

// ⑻ Một lượt bị cắt ở nắp đọc không được coi là khớp: chữ của nó không đầy đủ.
{
  const rows = [{ role: "user", text: JOB1, truncated: true }, { role: "assistant", text: "x" }];
  assert.equal(C.soleUserTurnIndex(rows, JOB1), C.MATCH_NONE, "lượt bị cắt không phải một phép khớp");
}

// ⑼ Đường thông vẫn phải chạy — thiếu mép này thì một bản "từ chối mọi lúc" cũng xanh hết.
{
  const rows = [
    { role: "user", text: "chao" },
    { role: "assistant", text: "chao Duc" },
    { role: "user", text: JOB1 },
    { role: "assistant", text: "day la cau tra loi dung cua JOB1" }
  ];
  const hit = C.answerAfterPrompt(rows, JOB1);
  assert.equal(hit.found, true);
  assert.equal(hit.reason, "OK");
  assert.equal(hit.text, "day la cau tra loi dung cua JOB1");
}

/* ---- ⓒ HAI CA CỦA CODEX: nay KHÔNG cửa nào biến chúng thành lượt gửi lại -------- */

// ⑽ Ca ⑴: sau F5 chỉ đọc được [U0, A0, U1] — lượt trả lời của job này chưa vẽ. Không còn hàm
// nào biến trạng thái đó thành "được gửi lại"; và answerAfterPrompt đọc nó là CHƯA TRẢ LỜI,
// không phải KHÔNG CÓ KẾT QUẢ. Hai chữ đó là toàn bộ khác biệt.
{
  const rows = [{ role: "user", text: "chao" }, { role: "assistant", text: "chao" }, { role: "user", text: JOB1 }];
  const hit = C.answerAfterPrompt(rows, JOB1);
  assert.equal(hit.reason, "NO_ANSWER_YET", "chưa vẽ xong là CHƯA TRẢ LỜI, không phải KHÔNG CÓ KẾT QUẢ");
  assert.equal(hit.found, true, "và nó KHÔNG được đọc thành 'không tìm thấy' — đó là một câu khác nữa");
}

// ⑾ Ca ⑵: [U1, A1, U2] với U2 trùng khoá. Trước bản sửa: khẳng định → gửi lại U1 dù A1 nằm đó.
{
  const rows = [{ role: "user", text: JOB1 }, { role: "assistant", text: "anh cua JOB1" }, { role: "user", text: JOB1 }];
  assert.equal(C.answerAfterPrompt(rows, JOB1).reason, "AMBIGUOUS_PROMPT_MATCH");
}

/* ---- ⓓ HÀNH VI: cắt `reconcileBlindDetector()` đã ship ra CHẠY THẬT ------------- */
{
  const sp = doc("sidepanel.js");
  const dau = sp.indexOf("async function reconcileBlindDetector(");
  assert.ok(dau > 0, "mỏ neo hỏng: không thấy reconcileBlindDetector()");
  const END = "\n  }\n";
  const cuoi = sp.indexOf(END, dau);
  const shipped = sp.slice(dau, cuoi + END.length);
  assert.ok(shipped.includes("DAC_RECONCILE_TEXT_JOB"), "cắt nhầm khối");

  // ⑿ ═══ MÉP CHỊU TẢI ⒝ ═══ KHÔNG có đường nào đưa job về PENDING. `status: "PENDING"` là
  // cách duy nhất vòng chạy hiểu "làm lại từ đầu", tức gửi lại prompt gốc.
  {
    const than = khongChuThich(shipped);
    assert.ok(!/PENDING/.test(than), "cửa này KHÔNG được đưa job về PENDING — đó chính là lượt gửi lại");
    assert.ok(!/completed: false/.test(than), "và không được trả về 'chạy tiếp': mọi lối ra là dừng hẳn");
    assert.ok(!/DAC_RUN_IMAGE_JOB|DAC_RUN_TEXT_JOB|DAC_PROVIDER_REPAIR/.test(than), "và không gọi cửa gửi nào");
    // Không còn điều kiện thoát sớm trong vòng dò — đó là chỗ Codex chọc vào.
    assert.ok(!/break;/.test(than), "vòng dò KHÔNG được thoát sớm: điều kiện thoát cũ được thoả bởi LỊCH SỬ hội thoại");
    assert.ok(than.indexOf("await doc()") < than.indexOf("repairWorkspaceSurface()"), "ĐỌC phải đứng trước F5");
  }

  function sanKhau({ docTruoc = null, docSau = null, f5Nem = false } = {}) {
    const dem = { doc: 0, f5: 0, ngat: 0, pending: 0 };
    const box = {
      console, setTimeout,
      state: { stopRequested: false },
      window: { DacRunnerCore: R },
      RECONCILE_READ_TIMEOUT_MS: 30, RECONCILE_READ_POLL_MS: 5,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      send: async () => { dem.doc += 1; return dem.f5 ? docSau : docTruoc; },
      repairWorkspaceSurface: async () => { dem.f5 += 1; if (f5Nem) throw new Error("F5 vo"); return { ok: true, note: "da F5" }; },
      audit: () => {}, log: () => {}, renderQueue: () => {}, progress: () => {},
      messageOf: (e) => String(e && e.message ? e.message : e),
      markInterrupted: (_i, loai, ly) => { dem.ngat += 1; dem.loai = loai; dem.ly = ly; },
      update: (_i, o) => { if (o && o.status === "PENDING") dem.pending += 1; }
    };
    vm.createContext(box);
    vm.runInContext(`${shipped}\nglobalThis.__f = reconcileBlindDetector;`, box);
    const item = { job: { id: "J001", prompt: JOB1 }, attempt_id: "a1", phase: "SUBMITTED", attempt_count: 1, retry_count: 0, settings: { timeout_sec: 180 } };
    return { chay: () => box.__f(item, {}, "DETECTION_BLIND: no assistant message exists", {}), dem, box };
  }
  const bao = (turns) => {
    const hit = C.answerAfterPrompt(turns, JOB1);
    return { ok: true, reconcile: { ...hit, chars: hit.text.length, turns_read: turns.length } };
  };

  // ⒀ Ca ⑴ của Codex, chạy qua hàm thật: sau F5 chỉ có lượt trả lời CŨ → vẫn dừng hẳn, 0 resend.
  {
    const s = sanKhau({
      docTruoc: bao([{ role: "user", text: "chao" }, { role: "assistant", text: "chao" }, { role: "user", text: JOB1 }]),
      docSau: bao([{ role: "user", text: "chao" }, { role: "assistant", text: "chao" }, { role: "user", text: JOB1 }])
    });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.dem.pending, 0, "ca Codex ⑴ KHÔNG được thành một lượt gửi lại");
    assert.equal(s.dem.loai, "DETECTION_BLIND", "và giữ đúng mã lỗi");
    assert.ok(s.dem.doc > 2, "phải dò nhiều lượt sau F5, không đọc một lượt rồi kết luận");
  }

  // ⒁ Không thấy lượt hỏi của mình → dừng hẳn, và TUYỆT ĐỐI KHÔNG F5.
  {
    const s = sanKhau({ docTruoc: bao([{ role: "user", text: "chuyen khac" }, { role: "assistant", text: "x" }]) });
    const r = await s.chay();
    assert.equal(r.halted, true);
    assert.equal(s.dem.f5, 0, "chưa chứng minh được prompt tới đâu thì KHÔNG F5");
    assert.equal(s.dem.doc, 1);
  }

  // ⒂ TRÙNG KHOÁ trước cả F5 → dừng hẳn, không F5, và câu dừng phải NÓI RA là trùng khoá —
  // người vận hành cần biết mình đang xem cái gì.
  {
    const s = sanKhau({ docTruoc: bao([{ role: "user", text: JOB1 }, { role: "assistant", text: "x" }, { role: "user", text: JOB1 }]) });
    await s.chay();
    assert.equal(s.dem.f5, 0);
    assert.match(String(s.dem.ly), /NHIỀU HƠN MỘT/, "câu dừng phải nói ra vì sao không kết luận được");
  }

  // ⒃ ═══ F5 NÉM ═══ Codex tìm ⑶: trước bản sửa, một lượt F5 ném để item nằm lại RECONCILING
  // mãi. Nay mọi lối ra, kể cả lối NÉM, đều phải đi qua một lượt kết.
  {
    const s = sanKhau({ docTruoc: bao([{ role: "user", text: JOB1 }]), f5Nem: true });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.dem.ngat, 1, "ném ở giữa vẫn phải kết, không để item treo ở RECONCILING");
    assert.equal(s.dem.pending, 0);
  }
}

console.log("B-41 ⑵ đối soát bộ dò mù, KHÔNG BAO GIỜ gửi lại, chạy thật (16 mép): PASS");

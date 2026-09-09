/**
 * GHIM B-41 ⑵ (ADR-0050 ⒞) — `DETECTION_BLIND` thôi là dead-end, nhưng ĐỐI SOÁT TRƯỚC.
 *
 * Đức chốt 08/09: *"chữa xong thì đối soát trước … khẳng định được là không có thì mới gửi lại;
 * vẫn không chắc thì `INTERRUPTED` như hôm nay."*
 *
 * ═══ VẾ CHỊU TẢI CỦA CẢ FILE NÀY ═══
 *
 * `DETECTION_BLIND` nghĩa là "0 lượt trả lời trên trang sau trọn thời gian chờ". HAI nguyên nhân
 * trông y hệt nhau từ bên trong:
 *   ⑴ trang chưa VẼ (tab bị che, Chrome không cấp khung hình) — kết quả ĐÃ CÓ trên máy chủ;
 *   ⑵ máy chủ thật sự không tạo ra gì.
 * Gửi lại ở ca ⑴ là đốt lượt quota thứ hai cho một việc đã xong — đúng cái ADR-0047 sinh ra để
 * chặn. Nên mọi mép ở đây canh đúng một tính chất: **"không thấy gì" KHÔNG BAO GIỜ đủ để gửi
 * lại.** Chỗ dễ hỏng nhất là vế ⒝ của `blindAbsenceAffirmed()` — mép ⑶ giữ nó.
 *
 * VÌ SAO NÓ KHÔNG PHẠM RÀNG BUỘC KIẾN TRÚC B-41: `DETECTION_BLIND` GIỮ NGUYÊN trong
 * `HARD_STOP_FAILURE_TYPES`; `canRetry()` và `submissionMayExist()` không bị sửa một dòng. Cửa
 * mới đứng TRƯỚC chúng, và hết điều kiện là rơi về đúng hành vi cũ — mép ⒁ đo đúng vế đó.
 *
 * Mỏ neo được ĐẾM. Ra 0 là công cụ hỏng, không phải "không có gì phải sửa".
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const doc = (ten) => fs.readFileSync(path.join(here, "..", ten), "utf8").split("\r\n").join("\n");
const khongChuThich = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");

/* ---- ⓐ HÀM THUẦN: chạy chính reconciliation-core.js đã ship ----------------------- */

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(doc("reconciliation-core.js"), ctx);
const C = ctx.window.DacReconciliationCore;

// ⑴ Mỏ neo.
assert.ok(typeof C?.blindAbsenceAffirmed === "function", "mỏ neo hỏng: core không có blindAbsenceAffirmed()");

const HOI = "Vẽ cho tôi một con mèo ngồi trên mái nhà lúc trời mưa";
const truocDo = [
  { role: "user", text: "chào" },
  { role: "assistant", text: "chào Đức" }
];

// ⑵ CA KHẲNG ĐỊNH ĐƯỢC: bộ đọc lượt trợ lý đã chứng minh còn sống (có lượt trả lời cũ), lượt
// hỏi của job nằm trong hội thoại, và sau nó KHÔNG có lượt trả lời nào.
{
  const r = C.blindAbsenceAffirmed([...truocDo, { role: "user", text: HOI }], HOI);
  assert.equal(r.affirmed, true, "đủ ba vế thì phải khẳng định được");
  assert.equal(r.reason, "NO_REPLY_AFTER_PROMPT");
  assert.equal(r.assistant_turns, 1, "và phải kể ra bằng chứng đã đếm được");
}

// ⑶ ═══ MÉP CHỊU TẢI ═══ KHÔNG có lượt trả lời nào trong CẢ hội thoại → KHÔNG được khẳng định.
// Đây là dấu vết của một selector trợ lý BỊ MỤC: nó đọc ra "không có lượt trả lời" ở MỌI hội
// thoại. Thiếu mép này thì phép tự kiểm sẽ khẳng định SAI là máy chủ không tạo gì, rồi gửi lại
// một prompt đã có kết quả — đúng cái ADR-0047 cấm. Vế ⒜ (thấy lượt hỏi của mình) KHÔNG đủ:
// bộ đọc lượt NGƯỜI và bộ đọc lượt TRỢ LÝ là hai selector khác nhau, mục cái nào là chuyện
// riêng của cái đó.
{
  const r = C.blindAbsenceAffirmed([{ role: "user", text: "chào" }, { role: "user", text: HOI }], HOI);
  assert.equal(r.affirmed, false, "0 lượt trả lời trong cả hội thoại = bộ đọc CHƯA chứng minh được nó còn sống");
  assert.equal(r.reason, "ASSISTANT_READER_UNPROVEN");
}

// ⑷ Có lượt trả lời SAU lượt hỏi của mình → không khẳng định. Không quy thuộc được cái ảnh ở đó
// (bằng chứng baseline đã mất sau F5), nhưng "có trả lời" thì tuyệt đối không được gửi lại.
{
  const r = C.blindAbsenceAffirmed([...truocDo, { role: "user", text: HOI }, { role: "assistant", text: "đây" }], HOI);
  assert.equal(r.affirmed, false);
  assert.equal(r.reason, "REPLY_EXISTS");
}

// ⑸ Không thấy lượt hỏi của mình → "chưa chứng minh được prompt tới đâu", không phải "không có
// kết quả". Trang có thể đã trôi sang hội thoại khác.
{
  const r = C.blindAbsenceAffirmed(truocDo, HOI);
  assert.equal(r.affirmed, false);
  assert.equal(r.reason, "PROMPT_NOT_IN_CONVERSATION");
}

// ⑹ Không có prompt để neo → không khẳng định gì. Neo rỗng khớp mọi thứ, nên đây là một cửa,
// không phải một chỗ dư.
assert.equal(C.blindAbsenceAffirmed([...truocDo, { role: "user", text: "" }], "").affirmed, false);
assert.equal(C.blindAbsenceAffirmed([...truocDo, { role: "user", text: HOI }], "   ").reason, "NO_PROMPT");

// ⑺ Đầu vào rác không được ném — cửa này chạy đúng lúc trang đang hỏng.
for (const rac of [null, undefined, "chuỗi", 7, {}]) {
  assert.equal(C.blindAbsenceAffirmed(rac, HOI).affirmed, false, `đầu vào ${typeof rac} phải trả false, không ném`);
}

// ⑻ `innerText` gói lại dòng theo bề rộng khung, nên so nguyên văn là so hai thứ khác nhau.
{
  const goiDong = HOI.split(" ").join("\n  ");
  const r = C.blindAbsenceAffirmed([...truocDo, { role: "user", text: goiDong }], HOI);
  assert.equal(r.affirmed, true, "khoảng trắng bị gói lại vẫn phải khớp — dùng chung promptKey()");
}

// ⑼ Neo vào lượt hỏi CUỐI khớp, giống answerAfterPrompt(): cùng một prompt có thể đã được gửi
// trong một hội thoại dài, và thứ cần đối soát luôn là lần gần nhất.
{
  const r = C.blindAbsenceAffirmed(
    [{ role: "user", text: HOI }, { role: "assistant", text: "ảnh cũ" }, { role: "user", text: HOI }],
    HOI
  );
  assert.equal(r.affirmed, true, "lượt hỏi gần nhất chưa được trả lời thì vẫn khẳng định được");
}

/* ---- ⓑ CỬA QUYẾT ĐỊNH: chạy chính runner-core.js đã ship -------------------------- */

const rc = { window: {}, URL };
vm.createContext(rc);
vm.runInContext(doc("runner-core.js"), rc);
const R = rc.window.DacRunnerCore || rc.DacRunnerCore;
assert.ok(typeof R?.mayResendAfterBlindReconcile === "function", "mỏ neo hỏng: runner-core không có mayResendAfterBlindReconcile()");

const daGui = { phase: "SUBMITTED" };
const chuaGui = { phase: "PRE_SUBMIT" };

// ⑽ Chỉ đúng một loại. Mọi loại khác đi đường cũ, từng chữ.
assert.equal(R.mayResendAfterBlindReconcile(daGui, "DETECTION_BLIND", true, 0), true);
for (const loai of ["POST_SUBMIT_UNCERTAIN", "TIMEOUT_AFTER_SUBMIT", "RECEIVER_LOST", "WRONG_SURFACE", "OTHER", "", null]) {
  assert.equal(R.mayResendAfterBlindReconcile(daGui, loai, true, 0), false, `${loai} không được đi cửa này`);
}

// ⑾ ═══ SO NGHIÊM NGẶT === true ═══ Một trang hỏng trả về `{}` là thứ xảy ra thật, và `if (x)`
// sẽ nhận nó. Cửa này chở toàn bộ ADR-0047, nên một giá trị "hơi đúng" không được mở nổi nó.
for (const gia of [{}, 1, "true", "yes", [], "affirmed", {}, undefined, null, false, 0, ""]) {
  assert.equal(R.mayResendAfterBlindReconcile(daGui, "DETECTION_BLIND", gia, 0), false, `khẳng định giả (${JSON.stringify(gia)}) không được mở cửa`);
}

// ⑿ Đòi ĐÃ gửi — cố ý NGƯỢC với mayRepair(), giống mayAskProviderRepair(). Bằng chứng của cửa
// này là chính lượt hỏi đã bay nằm trong hội thoại; chưa gửi gì thì canRetry() đã đủ.
assert.equal(R.mayResendAfterBlindReconcile(chuaGui, "DETECTION_BLIND", true, 0), false);
assert.equal(R.mayResendAfterBlindReconcile({ phase: "PRE_SUBMIT", submission_uncertain: true }, "DETECTION_BLIND", true, 0), true, "cờ lấp lửng cũng là ĐÃ GỬI");

// ⒀ NẮP 1. Lần gửi lại thứ hai không có thêm bằng chứng nào so với lần đầu: nếu nó lại mù thì
// phép tự kiểm trả về đúng câu trả lời cũ — đó là một VÒNG LẶP, không phải một phép thử mới.
assert.equal(R.MAX_BLIND_RESENDS_PER_JOB, 1, "nắp gửi lại PROMPT GỐC phải chặt hơn nắp câu chữa của B-40 ⒝");
assert.ok(R.MAX_BLIND_RESENDS_PER_JOB < R.MAX_PROVIDER_REPAIRS_PER_JOB, "gửi lại prompt gốc đắt hơn gõ một câu chữa, nên nắp phải nhỏ hơn");
assert.equal(R.mayResendAfterBlindReconcile(daGui, "DETECTION_BLIND", true, 1), false, "hết nắp thì đóng");
assert.equal(R.mayResendAfterBlindReconcile(daGui, "DETECTION_BLIND", true, 99), false);

// ⒁ ═══ ĐƯỜNG CŨ CÒN NGUYÊN ═══ Cửa mới đứng TRƯỚC lớp hard stop, không moi vào trong nó.
assert.ok(R.HARD_STOP_FAILURE_TYPES.has("DETECTION_BLIND"), "DETECTION_BLIND vẫn phải là hard stop — bỏ ra là ĐỔI LUẬT AN TOÀN, phải hỏi Đức");
assert.equal(R.canRetry({ ...daGui, retry_count: 0, settings: { max_retries: 3 } }, "DETECTION_BLIND"), false, "canRetry() không được nới một chữ");
assert.equal(R.mayRepair(daGui, "DETECTION_BLIND", 0), false, "cửa chữa hạ tầng vẫn KHÔNG nhận loại này");
assert.equal(R.mayAskProviderRepair(daGui, "DETECTION_BLIND", 0), false, "cửa câu chữa của B-40 ⒝ cũng KHÔNG nhận loại này");
// Hai ngoại lệ Đức nêu (captcha, hết credit) phải RỜI khỏi tập của cửa mới — bất biến, không
// phải một nhánh `if` (nhánh đó là mã chết, và ghim mã chết là ghim một bản sao của niềm tin).
for (const cung of ["SECURITY_HARD_STOP", "GENERATION_LIMIT_REACHED"]) {
  assert.ok(!R.BLIND_RECONCILABLE_FAILURE_TYPES.has(cung), `${cung} phải dừng hẳn, Đức chốt rõ`);
}

/* ---- ⓒ HÀNH VI: CẮT `reconcileBlindDetector()` đã ship ra CHẠY THẬT ---------------
   Hai con thoát ở B-40 ⒝ (nắp không tăng · `run.stop` bị bỏ qua) lọt vì MỌI mép đều chỉ soi
   CẤU TRÚC. Cấu trúc không với tới hành vi. Nên khối này chạy chính hàm đã ship. */
{
  const sp = doc("sidepanel.js");
  const dau = sp.indexOf("async function reconcileBlindDetector(");
  assert.ok(dau > 0, "mỏ neo hỏng: không thấy reconcileBlindDetector()");
  const END = "\n  }\n";
  const cuoi = sp.indexOf(END, dau);
  assert.ok(cuoi > dau, "không tìm thấy chỗ đóng reconcileBlindDetector()");
  const shipped = sp.slice(dau, cuoi + END.length);
  assert.ok(shipped.includes("DAC_RECONCILE_TEXT_JOB"), "cắt nhầm khối");
  assert.ok(shipped.includes("mayResendAfterBlindReconcile"), "cắt nhầm khối: thiếu cửa quyết định");

  // ⒂ THỨ TỰ LÀ AN TOÀN: lượt ĐỌC đầu phải đứng TRƯỚC cú F5. Đảo lại thì test hành vi vẫn
  // xanh mà luật exact-once mất — F5 lúc lấp lửng là đúng cái `chat.reload` từ chối làm.
  {
    const than = khongChuThich(shipped);
    const viTriDoc = than.indexOf("await doc()");
    const viTriF5 = than.indexOf("repairWorkspaceSurface()");
    assert.ok(viTriDoc > 0 && viTriF5 > 0, "mỏ neo hỏng: không thấy cả hai bước");
    assert.ok(viTriDoc < viTriF5, "ĐỌC phải đứng trước F5");
  }

  function sanKhau({ stop = false, daDung = 0, docTruoc = null, docSau = null } = {}) {
    const dem = { doc: 0, f5: 0, ngat: 0, choPending: 0 };
    const box = {
      console, setTimeout,
      state: { stopRequested: stop, blindResendsUsed: { J001: daDung } },
      window: { DacRunnerCore: R },
      // Nắp nhỏ để vòng dò kết thúc trong test; hằng thật là 60s/3s.
      RECONCILE_READ_TIMEOUT_MS: 40, RECONCILE_READ_POLL_MS: 4,
      sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
      send: async () => { dem.doc += 1; return dem.f5 ? docSau : docTruoc; },
      repairWorkspaceSurface: async () => { dem.f5 += 1; return { ok: true, note: "đã F5" }; },
      audit: () => {}, log: () => {}, renderQueue: () => {}, progress: () => {},
      messageOf: (e) => String(e && e.message ? e.message : e),
      markInterrupted: (_i, loai) => { dem.ngat += 1; dem.loaiNgat = loai; },
      update: (_i, o) => { if (o && o.status === "PENDING") dem.choPending += 1; },
    };
    vm.createContext(box);
    vm.runInContext(shipped + "\nglobalThis.__f = reconcileBlindDetector;", box);
    const item = { job: { id: "J001", prompt: HOI }, attempt_id: "a1", phase: "SUBMITTED", attempt_count: 1, retry_count: 0, settings: { timeout_sec: 180 } };
    return { chay: () => box.__f(item, {}, "DETECTION_BLIND: no assistant message exists", {}), dem, box, item };
  }

  const bao = (turns) => ({ ok: true, reconcile: { found: C.blindAbsenceAffirmed(turns, HOI).reason !== "PROMPT_NOT_IN_CONVERSATION", blind: C.blindAbsenceAffirmed(turns, HOI) } });
  const CHUA_TOI = bao(truocDo);
  const KHANG_DINH = bao([...truocDo, { role: "user", text: HOI }]);
  const MU_TIEP = bao([{ role: "user", text: HOI }]);
  const CO_TRA_LOI = bao([...truocDo, { role: "user", text: HOI }, { role: "assistant", text: "đây" }]);

  // ⒃ KHÔNG thấy lượt hỏi của mình → dừng hẳn, và TUYỆT ĐỐI KHÔNG F5.
  {
    const s = sanKhau({ docTruoc: CHUA_TOI });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.dem.f5, 0, "chưa chứng minh được prompt tới đâu thì KHÔNG F5");
    assert.equal(s.dem.doc, 1, "và chỉ đọc đúng một lượt");
    assert.equal(s.dem.ngat, 1);
    assert.equal(s.dem.loaiNgat, "DETECTION_BLIND", "phải giữ đúng mã lỗi, không đổi nhãn");
    assert.equal(s.box.state.blindResendsUsed.J001, 0, "và KHÔNG tiêu nắp");
  }

  // ⒄ KHẲNG ĐỊNH ĐƯỢC → F5 đã xảy ra, nắp tăng 0 → 1, job về PENDING để gửi lại.
  {
    const s = sanKhau({ docTruoc: KHANG_DINH, docSau: KHANG_DINH });
    const r = await s.chay();
    assert.equal(r.completed, false, "khẳng định được thì vòng chạy tiếp, không dừng"); assert.equal(r.halted, false);
    assert.equal(s.dem.f5, 1, "F5 đúng một lần");
    assert.equal(s.box.state.blindResendsUsed.J001, 1, "gửi lại PHẢI tăng bộ đếm nắp — không tăng thì nắp không bao giờ cắn");
    assert.equal(s.dem.choPending, 1, "và job phải được đưa về PENDING");
    assert.equal(s.dem.ngat, 0);
  }

  // ⒅ Sau F5 VẪN không có lượt trả lời nào trong cả hội thoại → bộ đọc chưa chứng minh được nó
  // còn sống → dừng hẳn, KHÔNG gửi lại. Đây là ca selector mục, và nó không được thành resend.
  {
    const s = sanKhau({ docTruoc: MU_TIEP, docSau: MU_TIEP });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.dem.f5, 1);
    assert.ok(s.dem.doc > 1, "phải dò lại sau F5, không đọc một lượt rồi kết luận");
    assert.equal(s.box.state.blindResendsUsed.J001, 0, "KHÔNG khẳng định được thì KHÔNG tiêu nắp và KHÔNG gửi lại");
  }

  // ⒆ Sau F5 có lượt trả lời SAU lượt hỏi của mình → dừng hẳn. Không quy thuộc được ảnh nữa
  // (baseline mất theo cú F5), nhưng gửi lại lúc này là đốt lượt thứ hai cho việc đã xong.
  {
    const s = sanKhau({ docTruoc: KHANG_DINH, docSau: CO_TRA_LOI });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.box.state.blindResendsUsed.J001, 0, "có lượt trả lời thì tuyệt đối KHÔNG gửi lại");
  }

  // ⒇ NÚT DỪNG THẮNG: Đức bấm Dừng thì không job nào được gửi thêm.
  {
    const s = sanKhau({ stop: true, docTruoc: KHANG_DINH, docSau: KHANG_DINH });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.box.state.blindResendsUsed.J001, 0, "bấm Dừng là để nó dừng");
    assert.equal(s.dem.choPending, 0);
  }

  // (21) HẾT NẮP → rơi về đúng hành vi cũ, dù mọi vế khác đều đạt.
  {
    const s = sanKhau({ daDung: R.MAX_BLIND_RESENDS_PER_JOB, docTruoc: KHANG_DINH, docSau: KHANG_DINH });
    const r = await s.chay();
    assert.equal(r.completed, true); assert.equal(r.halted, true);
    assert.equal(s.box.state.blindResendsUsed.J001, R.MAX_BLIND_RESENDS_PER_JOB, "hết nắp thì cũng đừng tăng thêm");
    assert.equal(s.dem.choPending, 0);
  }
}

/* ---- ⓓ BẤT BIẾN TRÊN MÃ ĐÃ SHIP -------------------------------------------------- */

// (22) Cửa đọc phải CHỞ phép tự kiểm về. Thiếu dòng này thì lớp trên đọc `undefined` và, nhờ
// so `=== true` ở mép ⑾, sẽ dừng hẳn — an toàn, nhưng cả bản vá thành mã chết. Đo, đừng đoán.
{
  const cj = khongChuThich(doc("content.js"));
  assert.match(cj, /blind: window\.DacReconciliationCore\.blindAbsenceAffirmed\(read\.turns, prompt\)/, "payload đối soát phải chở phép tự kiểm");
}

// (23) ĐƯỜNG RẼ: `reconcileSubmittedAttempt()` phải rẽ sang cửa mới TRƯỚC khi chạy lại chính bộ
// dò vừa mù. `DAC_RECONCILE_IMAGE_JOB` dùng đúng `assistantSelector()` vừa đọc ra 0 lượt.
{
  const sp = khongChuThich(doc("sidepanel.js"));
  const dau = sp.indexOf("async function reconcileSubmittedAttempt(");
  assert.ok(dau > 0, "mỏ neo hỏng");
  const khoi = sp.slice(dau, sp.indexOf("DAC_RECONCILE_IMAGE_JOB", dau));
  assert.ok(khoi.includes("reconcileBlindDetector("), "phải rẽ TRƯỚC lượt dò lại");
  assert.ok(khoi.includes('=== "DETECTION_BLIND"'), "và chỉ rẽ đúng loại đó");
}

// (24) Số nguồn mở-cửa-gửi-lại bằng `verifyExistingOutput()` trên đường TỰ ĐỘNG vẫn phải là 0 —
// hàm đó chỉ chạy khi người vận hành bấm nút. Bản vá này KHÔNG nối nó vào vòng chạy.
{
  const sp = khongChuThich(doc("sidepanel.js"));
  assert.equal(sp.split("verifyExistingOutput(").length - 1, 0, "đường tự động không được gọi verifyExistingOutput()");
}

console.log("B-41 ⑵ DETECTION_BLIND đối soát trước, chạy thật (24 mép): PASS");

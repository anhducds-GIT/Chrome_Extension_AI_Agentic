/* Ghim TRẦN TIMEOUT CỦA NGƯỜI VẬN HÀNH = 3600 giây (Đức chốt 14/09).
 *
 * VÌ SAO CÓ FILE NÀY: Đức đo thật — có task GPT suy luận 10-15 phút. Trần cũ
 * 900 giây nằm ĐÚNG TRÊN độ dài của việc thật, và tệ hơn: MỘT con số đó nuôi
 * cả hai chặng, "chờ câu trả lời" lẫn "chờ trang rảnh sau khi đã lưu". Job
 * chạy xong, chữ đã ghi và đã xác minh, rồi vẫn halt vì chặng dọn dẹp hết giờ.
 *
 * HAI TRẦN KHÁC NHAU, ĐỪNG GỘP:
 *   • trần NGƯỜI  = 3600 — run do chính Đức bấm.
 *   • trần MÁY    = LIMITS.trial_timeout_cap_sec = 900 (ADR-0015) — đường
 *     `run.trial`, thứ một con AI tự bấm được. Nới trần người KHÔNG được kéo
 *     theo trần máy. Vế ③ ở dưới là vế canh đúng chỗ đó.
 *
 * Mỗi khẳng định phải PHÂN BIỆT ĐƯỢC hai nhánh: nhận 3600 mà không từ chối
 * 3601 thì bản vá "bỏ trần" cũng xanh, nên luôn ghim cả hai đầu.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const TRAN_NGUOI = 3600;
const TRAN_MAY = 900;

const doc = (ten) => fs.readFileSync(new URL(`../${ten}`, import.meta.url), "utf8");
function nap(ten) {
  const context = { console, TextEncoder, crypto: globalThis.crypto, structuredClone };
  context.window = context;
  context.globalThis = context;
  vm.createContext(context);
  vm.runInContext(doc(ten), context);
  return context;
}

/* ⑴ runner-core: cửa chuẩn hoá mà nút Run của Đức đi qua. */
const runner = nap("runner-core.js").DacRunnerCore;
assert.equal(runner.config({ timeout_sec: TRAN_NGUOI }).timeout_sec, TRAN_NGUOI, "trần người phải THẬT SỰ nhận 3600, không âm thầm cắt về 900");
assert.equal(runner.config({ timeout_sec: 1200 }).timeout_sec, 1200, "một task 15 phút phải đặt được 20 phút mà không phải lách");
assert.throws(() => runner.config({ timeout_sec: TRAN_NGUOI + 1 }), /timeout_sec/, "3601 phải bị từ chối — NỚI trần, không phải BỎ trần");
assert.throws(() => runner.config({ timeout_sec: 14 }), /timeout_sec/, "sàn 15 giây vẫn còn");
assert.equal(runner.config({}).timeout_sec, 180, "mặc định KHÔNG đổi: nới trần không phải là bắt mọi run chờ lâu hơn");

/* ⑵ bridge-core: cùng trần đó trên `jobs.add` và `run_settings.configure`. */
const core = nap("bridge-core.js").DacBridgeCore;
assert.doesNotThrow(() => core.validateParams("run_settings.configure", { timeout_sec: TRAN_NGUOI }));
assert.throws(() => core.validateParams("run_settings.configure", { timeout_sec: TRAN_NGUOI + 1 }), /INVALID_PARAMS|invalid/i);
assert.doesNotThrow(() => core.validateParams("jobs.add", { jobs: [{ prompt: "x", reference_images: [], settings: { timeout_sec: TRAN_NGUOI } }] }));
assert.throws(() => core.validateParams("jobs.add", { jobs: [{ prompt: "x", reference_images: [], settings: { timeout_sec: TRAN_NGUOI + 1 } }] }), /INVALID_PARAMS|invalid/i);

/* ⑶ TRẦN MÁY KHÔNG NHÚC NHÍCH. Đây là vế quan trọng nhất của file: nới phanh
   của người mà kéo theo phanh của máy là đúng cái ADR-0015 sinh ra để chặn. */
assert.equal(core.LIMITS.trial_timeout_cap_sec, TRAN_MAY, "ADR-0015: phanh của đường run.trial vẫn 900");
assert.throws(() => core.validateParams("chat.say", { text: "x", timeout_sec: TRAN_MAY + 1 }), /INVALID_PARAMS|invalid/i, "chat.say vẫn ăn theo trần MÁY, không ăn theo trần người");

/* ⑷ content.js: nắp cuối cùng trong trang. Đếm, không xét thứ tự — thứ tự thì
   có chiều để sai, còn số đếm thì không (bài học ghim B-89). */
const content = doc("content.js");
const nap3600 = (content.match(/Math\.min\(Number\(message\.timeoutMs\) \|\| 180000, 3600000\)/g) || []).length;
const nap900 = (content.match(/, 900000\)\)/g) || []).length;
assert.equal(nap3600, 3, "ĐÚNG ba cửa chở prompt của job được nới: DAC_RUN_PROMPT, DAC_RUN_IMAGE_JOB, DAC_RUN_TEXT_JOB");
assert.ok(/DAC_WAIT_CHAT_READY[\s\S]{0,200}?\|\| 30000, 3600000\)/.test(content), "chặng chờ-trang-rảnh cũng phải được nới — ĐÓ LÀ chặng đã halt job của Đức hôm 13/09");
assert.equal(nap900, 2, "và ĐÚNG hai cửa giữ nguyên 900: DAC_PROVIDER_REPAIR và DAC_CHAT_SAY, hai đường máy tự bấm");
assert.ok(/DAC_CHAT_SAY[\s\S]*?, 900000\)\)/.test(content), "cửa chat.say phải là một trong hai cửa giữ 900");

/* ⑸ Ô nhập trên màn hình phải nói cùng một con số — trần mà UI chặn ở 900 thì
   người dùng không bao giờ gõ được 1200, và cả bản vá này thành trang trí. */
const html = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");
const o = html.match(/<input id="timeoutSecInput"[^>]*>/);
assert.ok(o, "vẫn phải có ô nhập Timeout");
assert.ok(o[0].includes(`max="${TRAN_NGUOI}"`), `ô nhập phải cho tới ${TRAN_NGUOI}`);
assert.ok(o[0].includes('min="15"'), "và vẫn giữ sàn 15");

console.log(`Trần timeout người vận hành ${TRAN_NGUOI}s · trần máy (ADR-0015) vẫn ${TRAN_MAY}s: PASS`);

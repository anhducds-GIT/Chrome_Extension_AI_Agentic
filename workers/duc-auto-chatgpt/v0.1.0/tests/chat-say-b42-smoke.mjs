/**
 * GHIM B-42 — `chat.say`: MỘT lượt nhắn thẳng vào hội thoại, không job, không dòng Excel.
 *
 * Đức chốt 08/09: *"thêm đường chat thẳng là ý kiến hay & chủ động thao tác được xuyên suốt hơn,
 * đặc biệt là cho các case reasoning."* Và 09/09: *"bạn chủ động làm tôi approve và sẽ review sau
 * khi tính năng này tồn tại, vì tôi ko hiểu về code."*
 *
 * ═══ HAI SỐ ĐO ĐÃ LÀM ĐỔI THIẾT KẾ, GHI RA VÌ CẢ HAI NGƯỢC VỚI CHỮ CỦA B-42 ═══
 *
 * ⑴ **KHÔNG phải quyền mới.** `B-42` viết *"đây là quyền mới cho extension"*. Đo: `jobs.add` đã
 *   nhận `prompt` TỰ DO (1..trần envelope) và `run.trial` gửi nó — nên bên gọi từ xa VỐN ĐÃ gửi
 *   được chữ tuỳ ý vào ChatGPT. Cửa này bỏ **sổ sách**, không thêm **quyền**. Mép ⑴ ghim vế đó.
 *
 * ⑵ **Nó KHÔNG chờ câu trả lời, và đó là ràng buộc TRANSPORT.** `deadline_ms` trong bảng method
 *   chỉ là KHAI BÁO — không dòng mã nào trong host đọc nó. Thứ cưỡng chế thật là
 *   `AbortSignal.timeout(40000)` trong `bridge-cli.mjs`. Một cửa chờ 180 giây sẽ bị CLI cắt ở
 *   giây 40 **sau khi tin nhắn đã bay**, và bên gọi đọc thành "thất bại" rồi gửi lại — đúng cái
 *   luật exact-once sinh ra để chặn. Mép ⑵⑶ ghim vế đó ở hai tầng.
 *
 * ═══ VÌ SAO NÓ KHÔNG PHẢI `run.start` ĐỔI TÊN ═══
 *
 * `run.start` là **chạy tiếp không ai nhìn**: một lệnh, N lượt gửi. Cửa này **không có vòng lặp
 * bên trong** — một lệnh, đúng một lượt gửi; lượt thứ hai cần một lệnh RPC thứ hai, và lệnh đó
 * lại đi qua đủ ba phanh. Ba phanh đó là **phanh CŨ, dùng lại nguyên**, và vế "một ngân sách,
 * mọi cửa" được ghim ở `trial-cooldown-adr0050-smoke.mjs` — chỗ đúng của nó, cạnh hằng nắp chờ.
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

/* ---- ⓐ HỢP ĐỒNG: chạy chính bridge-core.js đã ship ------------------------------- */

const ctx = { window: {}, URL, crypto, console, TextEncoder };
vm.createContext(ctx);
vm.runInContext(doc("bridge-core.js"), ctx);
const core = ctx.window.DacBridgeCore;
const entry = core.METHOD_REGISTRY["chat.say"];
assert.ok(entry, "mỏ neo hỏng: chat.say không có trong bảng method");

// ⑴ KHÔNG phải quyền mới — `jobs.add` vốn đã nhận chữ tự do. Ghim vế đó bằng chính validator
// đã ship, không bằng một câu trấn an trong chú thích.
{
  const tuDo = core.METHOD_REGISTRY["jobs.add"].params_validator({ jobs: [{ prompt: "gửi gì cũng được, chữ này do bên gọi tự nghĩ ra" }] });
  assert.equal(tuDo.jobs[0].prompt, "gửi gì cũng được, chữ này do bên gọi tự nghĩ ra",
    "nếu jobs.add THÔI nhận chữ tự do thì chat.say TRỞ THÀNH quyền mới — đọc lại luật của Đức trước khi sửa mép này");
}

// ⑵ KHÔNG chờ câu trả lời: deadline phải nằm dưới cái CLI bỏ ngang, không phải trên.
{
  const cli = doc("duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs");
  const boNgang = Number(cli.match(/AbortSignal\.timeout\((\d+)\)/)?.[1]);
  assert.ok(Number.isFinite(boNgang), "mỏ neo hỏng: không đọc được mốc CLI bỏ ngang");
  assert.ok(entry.deadline_ms < boNgang,
    `deadline của chat.say (${entry.deadline_ms}) phải NHỎ HƠN mốc CLI bỏ ngang (${boNgang}). Lớn hơn nghĩa là câu trả lời bị cắt SAU khi tin nhắn đã bay, và bên gọi sẽ gửi lại`);
}

// ⑶ Nó GÕ, nên không được khai là chỉ-đọc và không được khai là idempotent.
assert.equal(entry.read_only, false, "chat.say gõ thật — khai read_only là nói dối với bên gọi");
assert.equal(entry.idempotent, false, "gọi hai lần là gõ hai tin nhắn; khai idempotent sẽ mời bên gọi thử lại");
assert.equal(entry.context, "executor");

// ⑷ Nắp chữ: có trần, và trần phải hữu hạn.
{
  const v = entry.params_validator;
  const macDinh = v({ text: "chào" });
  assert.equal(macDinh.text, "chào");
  assert.equal(macDinh.timeout_sec, 180, "mặc định có sẵn nên người gọi không phải nghĩ");
  assert.deepEqual(Object.keys(macDinh).sort(), ["text", "timeout_sec"], "và không lặng lẽ chở thêm trường nào");
  assert.equal(v({ text: "chào", timeout_sec: 600 }).timeout_sec, 600);
  for (const xau of [{}, { text: "" }, { text: "   " }, { text: 7 }, { text: null }, { text: "a", them: 1 }]) {
    assert.throws(() => v(xau), /INVALID_PARAMS|invalid/i, `params xấu phải bị chối ở cửa: ${JSON.stringify(xau)}`);
  }
  assert.throws(() => v({ text: "x".repeat(32001) }), /INVALID_PARAMS|invalid/i, "phải có trần chữ hữu hạn");
  assert.throws(() => v({ text: "x", timeout_sec: 5 }), /INVALID_PARAMS|invalid/i);
  assert.throws(() => v({ text: "x", timeout_sec: 100000 }), /INVALID_PARAMS|invalid/i, "trần thời gian phải dùng chung với trần của run.trial");
  assert.equal(v({ text: "x", timeout_sec: core.LIMITS.trial_timeout_cap_sec }).timeout_sec, core.LIMITS.trial_timeout_cap_sec);
}

// ⑸ `run.start` vẫn cấm, và cửa mới KHÔNG được lọt vào danh sách cấm bằng cách khác.
assert.ok(core.POLICY.prohibited_methods.includes("run.start"), "run.start vẫn phải cấm vĩnh viễn");
assert.ok(!core.POLICY.prohibited_methods.includes("chat.say"));
assert.equal(core.POLICY.auto_execute, false, "không có gì tự chạy — cửa này cũng không");

/* ---- ⓑ HÀNH VI: CẮT `bridgeChatSay()` đã ship ra CHẠY THẬT ----------------------
   Hai con thoát ở B-40 ⒝ lọt vì mọi mép chỉ soi CẤU TRÚC. Cấu trúc không với tới hành vi. */
{
  const sp = doc("sidepanel.js");
  const dau = sp.indexOf("async function bridgeChatSay(");
  assert.ok(dau > 0, "mỏ neo hỏng: không thấy bridgeChatSay()");
  const END = "\n  }\n";
  const cuoi = sp.indexOf(END, dau);
  assert.ok(cuoi > dau, "không tìm thấy chỗ đóng bridgeChatSay()");
  const shipped = sp.slice(dau, cuoi + END.length);
  assert.ok(shipped.includes("DAC_CHAT_SAY"), "cắt nhầm khối");

  // Nạp cả hai hàm phụ ĐÃ SHIP, không giả: nắp chờ và sổ là hai vế B-42 phải có.
  const catHam = (ten) => {
    const d = sp.indexOf(`async function ${ten}(`);
    assert.ok(d > 0, `mỏ neo hỏng: không thấy ${ten}()`);
    return sp.slice(d, sp.indexOf(END, d) + END.length);
  };
  const phu = ["assertBridgeSubmitCooldown", "stampBridgeSubmit", "ghiSoChatSay"].map(catHam).join("\n");
  const hang = (sp.match(/^ {2}const (?:BRIDGE_LAST_TRIAL_STORAGE_KEY|BRIDGE_TRIAL_MIN_INTERVAL_MS|CHAT_SAY_LOG_STORAGE_KEY|CHAT_SAY_LOG_MAX) = .*$/gm) || []);
  assert.equal(hang.length, 4, "mỏ neo hỏng: phải lấy được đúng 4 hằng của đường chat.say");

  function sanKhau({ devMode = true, latch = true, lastAt = 0, traVe = { ok: true, submitted: true } } = {}) {
    const dem = { send: 0, stamp: 0, ghiSo: 0, endMutation: 0 };
    const kho = {};
    const box = {
      console, crypto, Date, Math, Number, Boolean, String, Array, Object, Set,
      state: { bridgeDevMode: devMode },
      window: { DacBridgeCore: core },
      queueRunLock: { tryBeginMutation: () => latch, endMutation: () => { dem.endMutation += 1; } },
      resolveWorkspaceTab: async () => ({ id: 7 }),
      send: async () => { dem.send += 1; return traVe; },
      chrome: { tabs: { sendMessage: async () => { dem.send += 1; if (traVe instanceof Error) throw traVe; return traVe; } },
        storage: { local: {
          get: async (k) => (k in kho || Object.hasOwn(kho, k) ? { [k]: kho[k] } : (k === undefined ? {} : { [k]: kho[k] })),
          set: async (o) => { Object.assign(kho, o); for (const key of Object.keys(o)) { if (String(key).includes("last_trial")) dem.stamp += 1; else dem.ghiSo += 1; } }
        } } },
      log: () => {}, controls: () => {},
      messageOf: (e) => String(e && e.message ? e.message : e)
    };
    vm.createContext(box);
    vm.runInContext(`${hang.join("\n")}\n${phu}\n${shipped}\nglobalThis.__f = bridgeChatSay;
globalThis.__khoaMoc = BRIDGE_LAST_TRIAL_STORAGE_KEY;
globalThis.__khoaSo = CHAT_SAY_LOG_STORAGE_KEY;
globalThis.__napSo = CHAT_SAY_LOG_MAX;`, box);
    box.kho = kho;
    assert.ok(typeof box.__khoaMoc === "string" && box.__khoaMoc, "mỏ neo hỏng: không đọc được khoá mốc lượt trước");
    if (lastAt) kho[box.__khoaMoc] = lastAt;
    return { chay: () => box.__f({ text: "suy luận bước một giúp tôi", timeout_sec: 180 }, { client_id: "c1", request_id: "r1" }), dem, box, kho };
  }

  const nem = async (s) => s.chay().then(() => null, (e) => e);

  // ⑹ CÔNG TẮC CHẾ ĐỘ PHÁT TRIỂN: tắt thì KHÔNG gõ một chữ. Đây là phanh của Đức, và nó phải
  // đứng TRƯỚC mọi thứ — kể cả trước latch, để một lượt bị chối không nuốt mất latch.
  {
    const s = sanKhau({ devMode: false });
    const loi = await nem(s);
    assert.match(String(loi?.message || ""), /DEV_MODE_OFF/, "Chế độ phát triển TẮT thì phải chối");
    assert.equal(s.dem.send, 0, "và KHÔNG gõ gì");
    assert.equal(s.dem.stamp, 0, "và KHÔNG tiêu nắp chờ của lượt khác");
    assert.equal(s.dem.endMutation, 0, "chối trước latch thì cũng không được nhả latch mình chưa lấy");
  }

  // ⑺ ĐANG CÓ RUN CHẠY: gõ vào hội thoại lúc một job đang bay sẽ phá phép quy thuộc kết quả
  // của job đó. Phải LẤY latch, không đọc cờ — hàm này await nhiều lần.
  {
    const s = sanKhau({ latch: false });
    const loi = await nem(s);
    assert.match(String(loi?.message || ""), /RUN_ACTIVE/, "đang chạy run thì phải chối");
    assert.equal(s.dem.send, 0);
    assert.equal(s.dem.stamp, 0);
  }

  // ⑻ NẮP CHỜ DÙNG CHUNG: một lượt trial vừa xong thì chat.say cũng phải chờ. Đây là vế làm
  // "tốc độ tiêu credit tối đa không đổi" thành đúng, chứ không chỉ là một câu trong chú thích.
  {
    const s = sanKhau({ lastAt: Date.now() });
    const loi = await nem(s);
    assert.match(String(loi?.message || ""), /TRIAL_COOLDOWN_ACTIVE/, "chat.say phải chờ CHUNG nắp với run.trial");
    assert.equal(s.dem.send, 0, "và chưa gõ gì");
    assert.equal(s.dem.endMutation, 1, "nhưng latch đã lấy thì PHẢI nhả — không nhả là khoá cứng cả panel");
  }

  // ⑼ ĐƯỜNG THÔNG: gõ một lần, đóng dấu nắp một lần, ghi sổ một lần, nhả latch một lần.
  {
    const s = sanKhau({ lastAt: Date.now() - 91 * 1000 });
    const ra = await s.chay();
    assert.equal(ra.submitted, true);
    assert.equal(ra.read_reply_with, "chat.read", "phải chỉ bên gọi sang cửa ĐỌC đã có, đừng dựng bộ đọc thứ hai");
    assert.equal(typeof ra.said_sha256, "string");
    assert.ok(ra.said_sha256.length >= 32, "sổ phải chứng minh được NỘI DUNG nào đã gửi, không chỉ số ký tự");
    assert.equal(s.dem.send, 1, "ĐÚNG MỘT lượt gõ mỗi lệnh — không có vòng lặp nào bên trong");
    assert.equal(s.dem.stamp, 1, "và đúng một lần đóng dấu nắp chờ");
    assert.equal(s.dem.ghiSo, 1, "và đúng một dòng sổ");
    assert.equal(s.dem.endMutation, 1);
    const so = s.kho[s.box.__khoaSo];
    assert.ok(Array.isArray(so) && so.length === 1, "sổ phải có đúng một dòng");
    assert.equal(so[0].submitted, true);
    assert.equal(so[0].client_id, "c1", "sổ phải kể AI nào đã gọi — đó là toàn bộ giá trị của nó khi xem lại");
    assert.ok(!("text" in so[0]) && !("reply" in so[0]),
      "sổ KHÔNG được tích trữ nội dung hội thoại của Đức — băm là đủ để chứng minh, và không phải là hoá đơn riêng tư");
  }

  // ⑽ VÒNG SỔ PHẢI CÓ NẮP. chrome.storage.local có hạn mức: một vòng không nắp thì sau vài
  // nghìn lượt chính lượt GHI bắt đầu thất bại, và sổ chết đúng lúc phiên dài nhất — tức mất
  // dấu vết bằng cách vòng vo thay vì bằng một dòng bị xoá. Thử phá N10 lọt vì thiếu mép này.
  {
    const s = sanKhau({ lastAt: Date.now() - 91 * 1000 });
    const nap = Number(s.box.__napSo);
    assert.ok(Number.isInteger(nap) && nap > 0 && nap <= 1000, `nắp sổ phải là một số hữu hạn hợp lý, đọc được ${nap}`);
    s.kho[s.box.__khoaSo] = Array.from({ length: nap + 5 }, (_, i) => ({ at: "cũ", i }));
    await s.chay();
    const so = s.kho[s.box.__khoaSo];
    assert.equal(so.length, nap, `sổ phải bị cắt về đúng nắp ${nap}, đếm được ${so.length}`);
    assert.equal(so[so.length - 1].submitted, true, "và dòng MỚI phải là dòng còn lại — cắt ĐẦU, không cắt đuôi");
  }
  // ⑽ ═══ MÉP CHỊU TẢI ═══ CHƯA KHẲNG ĐỊNH ĐƯỢC LÀ ĐÃ GỬI thì phải ném, nhưng nắp VẪN tiêu
  // và sổ VẪN ghi. Ba vế, và mỗi vế bịt một cửa khác:
  //   · ném → bên gọi không tưởng là đã xong;
  //   · nắp vẫn tiêu → một vòng lặp hỏng cứ chết giữa đường KHÔNG gõ được không giới hạn;
  //   · sổ vẫn ghi → lượt lấp lửng là lượt cần có trong sổ NHẤT.
  {
    const s = sanKhau({ lastAt: Date.now() - 91 * 1000, traVe: { ok: false, submitted: false, error: "CHAT_SAY_UNCONFIRMED: x" } });
    const loi = await nem(s);
    assert.ok(loi, "không khẳng định được là đã gửi thì PHẢI ném");
    assert.match(String(loi.message || ""), /UNCONFIRMED|chat\.read/, "và câu báo phải chỉ sang chat.read, không mời gửi lại");
    assert.equal(s.dem.stamp, 1, "nắp VẪN phải tiêu — sai hướng này là mất phanh");
    assert.equal(s.dem.ghiSo, 1, "sổ VẪN phải ghi — ném trước khi ghi là mất dấu vết ở ca tệ nhất");
    assert.equal(s.dem.endMutation, 1);
  }

  // ⑾ Transport chết giữa đường: cũng phải tiêu nắp và ghi sổ, không được im lặng bỏ qua.
  {
    const s = sanKhau({ lastAt: Date.now() - 91 * 1000, traVe: new Error("tab đã đóng") });
    const loi = await nem(s);
    assert.ok(loi, "transport chết thì phải ném");
    assert.equal(s.dem.stamp, 1, "và nắp vẫn tiêu: tin nhắn CÓ THỂ đã bay");
    assert.equal(s.dem.endMutation, 1, "latch phải nhả trong finally, kể cả khi ném");
  }

  // ⑿ KHÔNG có bề mặt ảnh / tệp / thư mục trong cả hàm. Cửa này hứa không chạm chúng.
  {
    const than = khongChuThich(shipped);
    assert.ok(!/expectImage|reference_images|referenceImages|saveGeneratedImage|output_folder|DAC_RUN_IMAGE_JOB|DAC_RUN_TEXT_JOB/.test(than),
      "chat.say không đính tệp, không sinh ảnh, không chạm thư mục đích, và không gọi lại đường job");
    assert.ok(!/audit\(/.test(than),
      "KHÔNG được gọi audit() ở đây: dòng đầu của nó là `if (!state.runId) return` — ngoài run thì nó IM LẶNG không ghi gì, và đó là kiểu mất dấu vết tệ nhất vì mã trông như có ghi sổ");
  }
}

/* ---- ⓒ BẤT BIẾN TRÊN MÃ ĐÃ SHIP ------------------------------------------------- */

// ⒀ `expectImage` là false CỨNG ở content script, không phải một tham số bên gọi đặt được.
{
  const cj = doc("content.js");
  const d = cj.indexOf('if (message.type === "DAC_CHAT_SAY")');
  assert.ok(d > 0, "mỏ neo hỏng: không thấy DAC_CHAT_SAY");
  const than = khongChuThich(cj.slice(d, cj.indexOf('\n    if (message.type === "DAC_RECONCILE_IMAGE_JOB")', d)));
  assert.match(than, /runPrompt\(loi, timeoutMs, \[\], false, requestAttempt, 1\)/,
    "expectImage phải là `false` CỨNG và referenceImages là `[]` CỨNG — nhận chúng từ bên gọi là mở lại đúng bề mặt cửa này hứa không có");
  assert.match(than, /surfaceAllowedNow\(\)/, "phải chối WRONG_SURFACE trước khi gõ");
  assert.ok(than.indexOf("surfaceAllowedNow()") < than.indexOf("runPrompt("), "và chối TRƯỚC lượt gõ");
  assert.match(than, /submitted: true/, "phải trả về mốc ĐÃ GỬI, không phải câu trả lời");
}

// ⒁ CLI: chữ dài đi qua --params-file, không qua dòng lệnh. Một prompt reasoning có ngoặc,
// dấu nháy và xuống dòng, và shell sẽ ăn chúng — mất chữ mà không ai thấy.
{
  const cli = doc("duc-auto-chatgpt-loopback-bridge-host-v1/bridge-cli.mjs");
  assert.match(cli, /"chat-say": "chat\.say"/, "CLI phải có lệnh chat-say");
  const d = cli.indexOf("const PARAMS_FILE_COMMANDS");
  const khoi = cli.slice(d, cli.indexOf("]", d));
  assert.match(khoi, /"chat-say"/, "chat-say phải nhận chữ qua --params-file");
  assert.ok(!/"chat\.say"/.test(cli.slice(cli.indexOf("READ_ONLY_METHODS"), cli.indexOf("goiYRequestId"))),
    "chat.say KHÔNG phải chỉ-đọc — khai vào đó là bỏ mất câu chặn mà một lệnh gõ phải có");
}

console.log("B-42 chat.say — một lượt nhắn thẳng, chạy thật (15 mép): PASS");

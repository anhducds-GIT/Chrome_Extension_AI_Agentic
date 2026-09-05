// F-22 — TRẦN CHUỖI TRIAL PHẢI THEO CHIP CẤU HÌNH, KHÔNG KHOÁ CỨNG Ở 7.
//
// Vì sao ghim: con số 7 chỉ đúng ở 360p (50 credit ÷ 7 = 7 video). Ở 720p một
// video tốn 15 → một tài khoản chỉ đủ 3, và job thứ 4 của một chuỗi đầy chạm
// tường credit. Hỏng an toàn (dừng cứng, 0 chi) nhưng mất trọn công lập kế hoạch.
//
// Ba bất biến file này canh, và mỗi cái đã có chỗ trả giá:
//   1. Đơn giá phải ĐỌC ĐƯỢC TỪ BẰNG CHỨNG DOM, không dịch tay, không nội suy.
//      Tổ hợp chưa đo → `null`, không đoán (luật vàng 1).
//   2. Trần suy ra CHỈ ĐƯỢC HẠ, không bao giờ nâng quá `MAX_TRIAL_JOBS`. Nâng
//      một cổng chi tiêu là đổi luật an toàn, phải hỏi Đức.
//   3. Không đọc được chip → lấy cấu hình ĐẮT NHẤT đã đo, không lấy rẻ nhất.
//      Đoán rẻ là lập kế hoạch 7 job rồi chết ở job thứ 4.
import assert from "node:assert/strict";
import fs from "node:fs";

// Nạp vào CÙNG MỘT realm: `trialRefusal` đọc `DacRunnerCore` qua globalThis, nên
// nạp mỗi file vào một sandbox riêng thì cổng sẽ không thấy runner.
for (const name of ["provider-adapter.js", "runner-core.js", "dev-trial-core.js"]) {
  await import(new URL(`../${name}`, import.meta.url).href);
}
const adapter = globalThis.DacProviderAdapter;
const devTrial = globalThis.DacDevTrialCore;
const runner = globalThis.DacRunnerCore;

// --- 1. Nhãn dùng để thử là nhãn CÓ THẬT trong evidence, không phải nhãn tôi bịa ---
//
// Nếu ai đổi cách nhận nhãn mà không có bằng chứng mới, phép kiểm này sập ở đây
// trước khi sập ở chỗ tính tiền — và nó nói rõ file bằng chứng nào đang thiếu.
const evidenceDir = new URL("../evidence/", import.meta.url);
const evidenceText = fs.readdirSync(evidenceDir)
  .filter((name) => name.endsWith(".json") || name.endsWith(".md"))
  .map((name) => fs.readFileSync(new URL(name, evidenceDir), "utf8"))
  .join("\n");

const LABEL_360P_10S = "Video · 360p · 10s crop_16_9 x1";
const LABEL_360P_8S_X3 = "Video · 360p · 8s crop_16_9 x3";
const LABEL_720P_10S = "Video · 720p · 10s crop_16_9 x1";
for (const label of [LABEL_360P_10S, LABEL_360P_8S_X3, LABEL_720P_10S]) {
  assert.ok(evidenceText.includes(label),
    `nhãn "${label}" không có trong evidence/. Đọc độ phân giải từ chip là một selector — ` +
    "nó phải có bằng chứng DOM thật, không được viết ra từ trí nhớ (luật vàng 1).");
}

// --- 2. Đọc đơn giá từ nhãn ---
assert.deepEqual({ ...adapter.videoCreditsFromSummary(LABEL_360P_10S) },
  { resolution: "360p", duration: "10s", credits_per_output: 7, output_count: 1 });
assert.deepEqual({ ...adapter.videoCreditsFromSummary(LABEL_720P_10S) },
  { resolution: "720p", duration: "10s", credits_per_output: 15, output_count: 1 });
assert.deepEqual({ ...adapter.videoCreditsFromSummary(LABEL_360P_8S_X3) },
  { resolution: "360p", duration: "8s", credits_per_output: 6, output_count: 3 },
  "360p 8s = 6 credit — đo thật ở F26R3: chip x3, số dư 8, Flow gỡ nút gửi vì 3 × 6 = 18 > 8");

// --- 3. Chưa đo thì KHÔNG ĐOÁN ---
assert.equal(adapter.videoCreditsFromSummary("Video · 720p · 8s crop_16_9 x1"), null,
  "720p 8s chưa có giá đo được → phải trả null, tuyệt đối không nội suy từ hai ô đã biết");
assert.equal(adapter.videoCreditsFromSummary("Video · 1080p · 10s crop_16_9 x1"), null,
  "độ phân giải chưa từng đo → null");
assert.equal(adapter.videoCreditsFromSummary("\u{1F34C} Nano Banana 2 Lite crop_16_9 x3"), null,
  "nhãn chế độ Image không phải nhãn video — không được rơi vào bảng giá video");
assert.equal(adapter.videoCreditsFromSummary(""), null);
assert.equal(adapter.videoCreditsFromSummary(null), null);
assert.equal(adapter.videoCreditsFromSummary("Video · 360p · 10s crop_16_9"), null,
  "thiếu hậu tố x{n} thì không biết một job tốn bao nhiêu → null");

// Mỗi ô trong bảng giá phải kèm trích nguồn ngay trong file — cùng luật đã áp
// cho CREATE_BUTTON_LABELS ở F-23. Không có nguồn thì con số đó là lời đồn.
const adapterSource = fs.readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
const priceBlock = adapterSource.slice(0, adapterSource.indexOf("const VIDEO_CREDIT_PRICE"));
for (const cite of ["evidence/F26R3-PHAT-HIEN-nut-Create-bien-mat-vi-gia.md", "decisions.md 27/08"]) {
  assert.ok(priceBlock.includes(cite), `bảng giá thiếu trích nguồn: ${cite}`);
}

// --- 4. Trần suy ra ---
assert.deepEqual({ ...devTrial.trialJobCeiling(adapter.videoCreditsFromSummary(LABEL_360P_10S)) },
  { jobs: 7, credits_per_job: 7, measured: true }, "360p 10s x1 → đúng ngân sách một tài khoản");
assert.deepEqual({ ...devTrial.trialJobCeiling(adapter.videoCreditsFromSummary(LABEL_720P_10S)) },
  { jobs: 3, credits_per_job: 15, measured: true }, "720p đắt gấp đôi → trần phải TỰ hạ xuống 3");
assert.deepEqual({ ...devTrial.trialJobCeiling(adapter.videoCreditsFromSummary(LABEL_360P_8S_X3)) },
  { jobs: 2, credits_per_job: 18, measured: true }, "x3 nhân ba đơn giá — số lượng output cũng là tiền");

// --- 5. Không đọc được chip → giả định ĐẮT NHẤT, và nói thẳng là chưa đo ---
for (const mu of [null, undefined, {}, { credits_per_output: 0, output_count: 1 }, { credits_per_output: 7 }, { credits_per_output: 7, output_count: -2 }]) {
  const ceiling = devTrial.trialJobCeiling(mu);
  assert.equal(ceiling.measured, false, `${JSON.stringify(mu)} không phải một phép đo`);
  assert.equal(ceiling.credits_per_job, devTrial.UNKNOWN_CONFIG_CREDITS_PER_OUTPUT);
  assert.equal(ceiling.jobs, 3, "không đo được thì lấy trần của cấu hình đắt nhất đã đo, không lấy 7");
}
assert.equal(devTrial.UNKNOWN_CONFIG_CREDITS_PER_OUTPUT, Math.max(...Object.values(adapter.VIDEO_CREDIT_PRICE)),
  "giá dự phòng phải là giá ĐẮT NHẤT trong bảng đã đo — thêm một cấu hình đắt hơn thì phải nâng nó theo");

// --- 6. Trần suy ra CHỈ ĐƯỢC HẠ. Quét toàn dải, không quét vài ca lẻ ---
for (let perOutput = 1; perOutput <= 100; perOutput += 1) {
  for (let outputs = 1; outputs <= 4; outputs += 1) {
    const { jobs } = devTrial.trialJobCeiling({ credits_per_output: perOutput, output_count: outputs });
    assert.ok(jobs >= 1 && jobs <= devTrial.MAX_TRIAL_JOBS,
      `trần suy ra (${jobs}) ra ngoài khoảng 1..${devTrial.MAX_TRIAL_JOBS} ở ${perOutput}×${outputs}. ` +
      "Một cấu hình RẺ hơn không được phép nới cổng chi tiêu — nới trần là đổi luật an toàn, phải hỏi Đức.");
    assert.ok(jobs * perOutput * outputs <= devTrial.FREE_ACCOUNT_CREDITS || jobs === 1,
      `một chuỗi đầy ở ${perOutput}×${outputs} vượt ngân sách ${devTrial.FREE_ACCOUNT_CREDITS} credit`);
  }
}

// --- 7. Cổng từ chối thật sự dùng trần đó ---
const queue = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ job: { id: `P09-0${n}` }, status: "PENDING", phase: "PRE_SUBMIT", protected_checkpoint: false, skipped: false }));
const nowMs = Date.parse("2026-09-05T10:00:00.000Z");
const base = { dev_mode: true, running: false, paused: false, queue, last_started_at_ms: null, now_ms: nowMs };
const ids = (n) => queue.slice(0, n).map((item) => item.job.id);

const cheap = adapter.videoCreditsFromSummary(LABEL_360P_10S);
const dear = adapter.videoCreditsFromSummary(LABEL_720P_10S);

assert.equal(devTrial.trialRefusal({ ...base, job_ids: ids(7), chip: cheap }), null,
  "ở 360p một chuỗi 7 job vẫn nằm trong ngân sách");
const tooMany720 = devTrial.trialRefusal({ ...base, job_ids: ids(4), chip: dear });
assert.equal(tooMany720.code, "JOB_NOT_RUNNABLE", "ở 720p job thứ 4 vượt ngân sách một tài khoản");
assert.equal(tooMany720.details.max_jobs, 3);
assert.equal(tooMany720.details.credits_per_job, 15);
assert.equal(tooMany720.details.chip_measured, true);
assert.match(tooMany720.message, /720p/, "câu từ chối phải nói cấu hình nào đang bắt hạ trần");
assert.equal(devTrial.trialRefusal({ ...base, job_ids: ids(3), chip: dear }), null, "3 job ở 720p thì vừa đủ");

const noChip = devTrial.trialRefusal({ ...base, job_ids: ids(4), chip: null });
assert.equal(noChip.code, "JOB_NOT_RUNNABLE", "không đọc được chip thì trần là 3, không phải 7");
assert.equal(noChip.details.chip_measured, false);
assert.equal(noChip.details.absolute_max_jobs, devTrial.MAX_TRIAL_JOBS,
  "sổ cái từ chối phải giữ CẢ HAI con số: trần tuyệt đối và trần hiệu lực");

// Câu từ chối đi qua `classifyFailure`, nên nó không được mang từ khoá đổi hành
// vi runtime (LUẬT cũ mang mã F-20). Đây chính là chỗ đã cắn một lần 02/09.
for (const message of [tooMany720.message, noChip.message]) {
  assert.equal(runner.classifyFailure(new Error(message), "PRE_SUBMIT"), "OTHER",
    `câu từ chối "${message}" đang bị phân loại khác OTHER — nó chứa một từ khoá của classifyFailure. ` +
    "Sửa lời văn là sửa hành vi runtime (LUẬT trong BACKLOG.md, mã cũ F-20).");
}

// --- 8. Dây nối: chip phải tới được cổng, và tới từ CÙNG lượt probe ---
const panel = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const trialHandler = panel.slice(panel.indexOf("const runtimeProbe = await bridgeDomProbe();"));
assert.ok(trialHandler.length > 0, "không tìm thấy đường run.trial trong sidepanel.js");
const gateCall = trialHandler.slice(0, trialHandler.indexOf("if (refusal)"));
assert.match(gateCall, /chip: runtimeProbe\?\.generation_mode\?\.credits \|\| null/,
  "cổng trial phải nhận đơn giá từ CHÍNH lượt probe đã chạy ở trên — probe lần hai là một trạng thái khác, " +
  "và giữa hai lượt Đức có thể đã đổi chip.");

const content = fs.readFileSync(new URL("../content.js", import.meta.url), "utf8");
const probeBlock = content.slice(content.indexOf("const probe = {"), content.indexOf("// Payload cap"));
assert.match(probeBlock, /generation_mode:/, "dom_probe phải lộ chip cấu hình, nếu không panel không có gì để đọc");
assert.match(probeBlock, /ADAPTER\.videoCreditsFromSummary\(/, "đơn giá phải do adapter tính, không tính lại trong content.js");

console.log("F-22: trần chuỗi trial suy từ chip cấu hình (360p→7, 720p→3, x3→2, không đọc được→3): PASS");

// F-08 — trần chờ sinh video phải suy từ SỐ ĐO, không phải kế thừa nhánh ảnh.
//
// Vì sao ghim: trần này áp lên giai đoạn GENERATING, tức SAU khi cú bấm Create
// đã tiêu credit. Hết trần sớm không tiết kiệm được gì — nó vứt một video đã
// trả tiền, và `TIMEOUT_AFTER_SUBMIT` nằm trong HARD_STOP nên nó dừng cả mẻ.
// Trần chật ở đây là rủi ro TIỀN, không phải rủi ro thời gian.
//
// Số đo: 9 job live ngày 02/09 (F4R5 · F4R6 · F4R8 · F4R9), đo bằng khoảng
// giữa hai mốc `GENERATING` → `FINALIZING` trong `*-run-status-poll-*.log`:
//   31 · 32 · 38 · 44 · 45 · 144 · 175 · 175 · 175 giây.
// Xấu nhất 175 giây. Chú thích cũ trong adapter khai "~70s" — lạc hậu 2,5 lần,
// và chính con số đó đã đẻ ra trần 300s.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const WORST_CASE_SEC = 175;   // đo được, 02/09
const MIN_MULTIPLE = 3;       // biên tối thiểu so với ca xấu nhất
const FLOOR_SEC = WORST_CASE_SEC * MIN_MULTIPLE;

const adapter = readFileSync(new URL("../provider-adapter.js", import.meta.url), "utf8");
const runner = readFileSync(new URL("../runner-core.js", import.meta.url), "utf8");

const adapterMs = Number(/perJobTimeoutMs:\s*(\d+)/.exec(adapter)?.[1]);
assert.ok(Number.isFinite(adapterMs), "không đọc được perJobTimeoutMs trong provider-adapter.js");
assert.ok(adapterMs / 1000 >= FLOOR_SEC,
  `perJobTimeoutMs = ${adapterMs / 1000}s, dưới sàn ${FLOOR_SEC}s (${MIN_MULTIPLE}x ca xấu nhất ${WORST_CASE_SEC}s đo 02/09)`);

const runnerSec = Number(/timeout_sec:\s*(\d+)/.exec(runner)?.[1]);
assert.ok(Number.isFinite(runnerSec), "không đọc được DEFAULTS.timeout_sec trong runner-core.js");
assert.ok(runnerSec >= FLOOR_SEC,
  `DEFAULTS.timeout_sec = ${runnerSec}s, dưới sàn ${FLOOR_SEC}s (${MIN_MULTIPLE}x ca xấu nhất ${WORST_CASE_SEC}s đo 02/09)`);

// Trần trên của `whole()` là 900s — mặc định vượt nó thì workbook không khai
// lại được, và lỗi chỉ lộ ra lúc chạy thật.
assert.ok(runnerSec <= 900, `DEFAULTS.timeout_sec = ${runnerSec}s vượt trần 900s mà config chấp nhận`);

// Chú thích phải mang số đo, không mang số cũ. Đây là chỗ duy nhất kể vì sao
// con số là con số đó — mất nó thì lượt sau lại đoán.
assert.ok(/F-08/.test(adapter) && new RegExp(String(WORST_CASE_SEC)).test(adapter),
  "chú thích perJobTimeoutMs phải nhắc F-08 và ca xấu nhất 175s");
assert.ok(!/measured ~70s/.test(adapter), "chú thích cũ '~70s' vẫn còn — nó là số đã lạc hậu 2,5 lần");

console.log("flow-video-timeout-budget: OK");

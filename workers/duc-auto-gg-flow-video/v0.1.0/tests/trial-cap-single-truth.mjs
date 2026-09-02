// Trần chuỗi trial nằm ở HAI file, và hai file đó không được lệch nhau.
//
// Vì sao ghim — chuyện đã xảy ra thật ngày 2026-09-02, và chỉ một lượt chạy
// live mới lộ ra: Đức nâng trần 3 → 7, tôi sửa `dev-trial-core.js`, chạy suite
// XANH, rồi bắn `run.trial` với 7 job và **lớp Bridge từ chối** —
// `bridge-core.js` gõ lại con số 3 ở phép kiểm tham số của riêng nó.
//
// Suite cũ không bắt được, và lý do đáng ghi: nó kiểm hai lớp **riêng rẽ**, và
// mỗi lớp đều "đúng" theo con số của chính nó. Không phép kiểm nào hỏi câu duy
// nhất quan trọng — *hai lớp có đang nói cùng một điều không.*
//
// Vì sao không gộp làm một hằng số: `bridge-core.js` có luật thuần khiết cấm
// dùng `window` (ghim ở `bridge-method-registry-smoke.mjs`), và nó được nạp
// trong service worker qua `background.js`, nơi `dev-trial-core.js` không hề có
// mặt — nên đọc chéo sẽ luôn rơi về giá trị dự phòng, tệ hơn là gõ lại. Đánh
// đổi: chấp nhận hai bản sao, nhưng cưỡng chế chúng bằng phép kiểm này.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(name, globalName) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(new URL(`../${name}`, import.meta.url), "utf8"), context);
  return context.window[globalName] || context[globalName];
}

const devTrial = load("dev-trial-core.js", "DacDevTrialCore");
assert.ok(Number.isInteger(devTrial.MAX_TRIAL_JOBS), "dev-trial-core phải khai MAX_TRIAL_JOBS");

// `bridge-core.js` giữ trần trong một hằng số cục bộ không xuất ra, nên đọc
// thẳng từ nguồn. Cố ý dò cả DÒNG KHAI lẫn CÂU TỪ CHỐI: sửa một chỗ mà quên
// chỗ kia thì người vận hành đọc được một con số và gặp một con số khác.
const bridgeSource = fs.readFileSync(new URL("../bridge-core.js", import.meta.url), "utf8");

const declared = bridgeSource.match(/const MAX_TRIAL_JOBS = (\d+);/);
assert.ok(declared, "bridge-core phải khai MAX_TRIAL_JOBS ở một hằng số đọc được");
assert.equal(Number(declared[1]), devTrial.MAX_TRIAL_JOBS,
  `trần ở bridge-core (${declared[1]}) lệch trần ở dev-trial-core (${devTrial.MAX_TRIAL_JOBS}). ` +
  "Hai lớp cùng gác một chi tiêu thì phải nói cùng một con số — nếu không, một lớp sẽ từ chối " +
  "thứ mà lớp kia cho phép, và chỉ lượt chạy thật mới phát hiện.");

// Câu từ chối phải sinh ra TỪ hằng số, không phải gõ tay một lần nữa.
assert.match(bridgeSource, /expected 1-\$\{MAX_TRIAL_JOBS\} video job ids/,
  "câu từ chối phải nội suy từ MAX_TRIAL_JOBS, đừng gõ lại con số vào chữ — đó là bản sao thứ ba");
assert.ok(!/expected 1-\d+ video job ids/.test(bridgeSource),
  "còn một con số gõ cứng trong câu từ chối của bridge-core");

// NHỊP GIỮA HAI JOB cũng có bản sao thứ hai ở `bridge-core.js`, và nó đã lệch
// THẬT trong cùng một ngày, ở cùng một hàm, chỉ vài giờ sau lần lệch của trần
// job: 02/09 tôi nâng nhịp trong `dev-trial-core` lên 45–120s để tránh bị gắn
// cờ "unusual activity", suite XANH, rồi lệnh thật bị chính lớp Bridge từ chối
// vì nó vẫn khoá 20–30. Hai lần, cùng một hàm, cùng một gốc bệnh.
const bridgeDelay = bridgeSource.match(/const TRIAL_DELAY_BOUNDS = Object\.freeze\(\{ min: (\d+), max: (\d+), default: (\d+) \}\);/);
assert.ok(bridgeDelay, "bridge-core phải khai TRIAL_DELAY_BOUNDS ở một hằng số đọc được");
const [, bMin, bMax, bDefault] = bridgeDelay.map(Number);
assert.equal(bMin, devTrial.DELAY_BOUNDS.min, `sàn nhịp ở bridge-core (${bMin}s) lệch dev-trial-core (${devTrial.DELAY_BOUNDS.min}s)`);
assert.equal(bMax, devTrial.DELAY_BOUNDS.max, `trần nhịp ở bridge-core (${bMax}s) lệch dev-trial-core (${devTrial.DELAY_BOUNDS.max}s)`);
assert.equal(bDefault, devTrial.DELAY_BOUNDS.default, `nhịp mặc định ở bridge-core (${bDefault}s) lệch dev-trial-core (${devTrial.DELAY_BOUNDS.default}s)`);

// Và câu quảng cáo ra ngoài phải NỘI SUY, không được gõ lại con số.
// Chi soi RIENG delay_sec. Ban dau toi viet /integer:\d+\.\.\d+\?"/ va no bat
// nham ca timeout_sec: "integer:15..300?" — mot con so go cung HOP LE vi tran
// timeout khong phai thu dang duoc tham so hoa. Mot phep kiem bat nham thi som
// muon cung bi ai do noi long cho xong.
assert.ok(!/delay_sec: "integer:\d+\.\.\d+\?"/.test(bridgeSource), "schema delay_sec còn con số gõ cứng trong bridge-core");
assert.match(bridgeSource, /delay_sec: `integer:\$\{TRIAL_DELAY_BOUNDS\.min\}\.\.\$\{TRIAL_DELAY_BOUNDS\.max\}\?`/, "schema delay_sec phải nội suy từ TRIAL_DELAY_BOUNDS");
assert.ok(!/at most \d+ runnable video jobs/.test(bridgeSource), "mô tả run.trial còn con số gõ cứng trong bridge-core");

// Và trần phải khớp ngân sách một tài khoản free ở 360p — cùng phép tính đã
// ghim ở bridge-run-trial-smoke.mjs. Nhắc lại ở đây có chủ đích: ai đổi trần
// phải gặp phép tính này ở mọi chỗ trần xuất hiện.
const FREE_ACCOUNT_CREDITS = 50;
const CREDITS_PER_VIDEO_360P = 7;
assert.equal(devTrial.MAX_TRIAL_JOBS, Math.floor(FREE_ACCOUNT_CREDITS / CREDITS_PER_VIDEO_360P),
  "trần phải bằng đúng số video một tài khoản free trả nổi ở 360p (Đức chốt 2026-09-02)");

console.log(`trial cap agrees across bridge-core and dev-trial-core (${devTrial.MAX_TRIAL_JOBS}): PASS`);

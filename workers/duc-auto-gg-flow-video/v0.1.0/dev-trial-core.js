(() => {
  "use strict";

  // Owner decision 2026-08-25 (decisions.md): during development the AI may
  // start a small "trial run" through the Bridge via a dedicated method
  // (run.trial), never run.start. Every ceiling here is a hard-coded guard,
  // not a tunable: <=7 videos, timeout 15-300s (default 180s), delay 20-30s between jobs, and at
  // least 5 minutes between trial starts. The panel toggle stays in the
  // owner's hands; production runs remain human-click only.
  const DEV_MODE_STORAGE_KEY = "dac.dev_mode.v1";
  const TRIAL_HISTORY_STORAGE_KEY = "dac.dev_trial_history.v1";
  // Owner decision 2026-08-27: 3 videos x 15 credits (720p) was the free budget.
  //
  // Owner decision 2026-09-02, SUPERSEDES the above: a free account carries 50
  // credits and a 360p video costs 7, so ONE ACCOUNT COVERS 7 VIDEOS (49 of 50).
  // Duc delegated the exact number ("tuy case ma ban muon dong & test, toi ko co
  // gioi han") and said runs must be intermittent with an account switch between
  // chains. So the ceiling is set to exactly ONE ACCOUNT'S BUDGET: a chain ends
  // when that account is spent, and the operator switches Chrome profile before
  // the next chain. MIN_TRIAL_INTERVAL_SEC already enforces the gap between them.
  //
  // THIS NUMBER IS TIED TO 360p. At 720p a video costs 15, so one account covers
  // only 3, and jobs 4-7 of a chain would meet the credit wall. That degrades
  // SAFELY -- the wall raises GENERATION_LIMIT_REACHED, a hard stop with no retry
  // and no spend -- but the operator loses a chain's worth of planning.
  //
  // F-22 (2026-09-05): this stays the ABSOLUTE ceiling -- nothing may ever raise
  // it, because raising a spend guard is a safety-rule change and needs Duc.
  // What F-22 adds is a SECOND, TIGHTER ceiling derived from the configuration
  // chip actually on screen; see trialJobCeiling below. The effective cap is the
  // smaller of the two, so the derived number can only ever LOWER the guard.
  const MAX_TRIAL_JOBS = 7;
  // F-22 -- ngan sach mot tai khoan free, Duc chot 02/09. Chuoi trial dung khi
  // tai khoan can tien; nguoi van hanh doi ho so Chrome truoc chuoi ke tiep.
  const FREE_ACCOUNT_CREDITS = 50;
  // Khong doc duoc chip -> gia dinh CAU HINH DAT NHAT da do (720p 10s = 15).
  // Fail-closed ve phia TIEU IT: doan re la lap ke hoach 7 job roi cham tuong
  // credit o job thu 4. Day la mot mac dinh than trong, KHONG phai mot phep do —
  // gia that phai den tu videoCreditsFromSummary, co trich nguon bang chung.
  const UNKNOWN_CONFIG_CREDITS_PER_OUTPUT = 15;

  // Tran chuoi suy tu chip cau hinh. HAM THUAN: nhan so, tra so.
  // `chip` = { credits_per_output, output_count } doc tu nhan chip, hoac null.
  // Tra { jobs, credits_per_job, measured } — `measured: false` nghia la con so
  // nay dung gia dinh dat nhat chu khong phai gia doc duoc.
  function trialJobCeiling(chip) {
    const perOutput = Number(chip?.credits_per_output);
    const outputs = Number(chip?.output_count);
    const measured = Number.isInteger(perOutput) && perOutput > 0 && Number.isInteger(outputs) && outputs > 0;
    const perJob = measured ? perOutput * outputs : UNKNOWN_CONFIG_CREDITS_PER_OUTPUT;
    // Toi thieu 1: mot cau hinh dat hon ca ngan sach van chay duoc DUNG MOT job,
    // va Flow tu go nut gui neu khong du (F26R3) — tra 0 chi khoa cung mot duong
    // ma trang da tu gac, khong them an toan nao.
    const jobs = Math.max(1, Math.min(MAX_TRIAL_JOBS, Math.floor(FREE_ACCOUNT_CREDITS / perJob)));
    return { jobs, credits_per_job: perJob, measured };
  }
  const MIN_TRIAL_INTERVAL_SEC = 300;
  const TIMEOUT_BOUNDS = Object.freeze({ min: 15, max: 300, default: 180 });
  // Nhip giua hai job — DON BAY LON NHAT cho viec "chay tron mot flow khong bi
  // ngat", lon hon han ba quang nghi trong trang cong lai.
  //
  // Truoc 02/09: 20-30s. Bay ra 7 video trong ~10 phut. Khong nguoi nao tao
  // video voi nhip do, va luot F4R6 bi Google gan co "unusual activity" o job
  // thu hai. Duc chot lai muc tieu la chay tron ven, khong phai chay nhanh.
  //
  // San duoi cung duoc NANG (20 -> 45), khong chi noi tran: de nghi mot nhip
  // qua ngan la thu khong ai nen lam duoc nua, ke ca AI dieu phoi. Tran 120s la
  // muc runner-core cho phep (config() chan delay_* trong 1..120).
  const DELAY_BOUNDS = Object.freeze({ min: 45, max: 120, default: 90 });

  function refusal(code, message, details = {}) {
    return { code, message, details };
  }

  // Pure fail-closed gate. Returns null when the trial may start, otherwise a
  // typed refusal { code, message, details } whose code is a registered
  // bridge error code. Order matters: the owner toggle is checked first so a
  // disabled panel never leaks queue or rate-limit detail.
  function trialRefusal({ dev_mode, running, paused, queue, job_ids, last_started_at_ms, now_ms, chip }) {
    if (dev_mode !== true) {
      return refusal("DEV_MODE_OFF", "Công tắc 'Chế độ phát triển' đang TẮT; run.trial bị từ chối. The owner must enable the development-mode toggle in the BRIDGE screen.", { storage_key: DEV_MODE_STORAGE_KEY });
    }
    if (running || paused) {
      return refusal("RUN_ACTIVE", "A run is already active or paused; run.trial never interrupts or queues behind it.", { lock_reason: paused ? "RUN_PAUSED" : "RUN_ACTIVE" });
    }
    const requested = Array.isArray(job_ids) ? job_ids : [];
    // F-22: tran hieu luc = min(tran tuyet doi, tran suy tu chip cau hinh).
    // Chip dat hon -> tran nho hon. Chip khong doc duoc -> gia dinh dat nhat.
    const ceiling = trialJobCeiling(chip);
    if (!requested.length || requested.length > ceiling.jobs) {
      const doThem = ceiling.measured
        ? `Chip cấu hình đang là ${chip.resolution || "?"} · ${chip.duration || "?"} · x${chip.output_count} → ${ceiling.credits_per_job} credit mỗi job.`
        : `Chưa đọc được chip cấu hình trên trang, nên trần lấy theo cấu hình đắt nhất đã đo (${ceiling.credits_per_job} credit mỗi job).`;
      return refusal(
        "JOB_NOT_RUNNABLE",
        `A development trial runs 1-${ceiling.jobs} jobs. ${doThem} Ngân sách một tài khoản free là ${FREE_ACCOUNT_CREDITS} credit.`,
        { job_ids: requested, max_jobs: ceiling.jobs, absolute_max_jobs: MAX_TRIAL_JOBS, credits_per_job: ceiling.credits_per_job, chip_measured: ceiling.measured, free_account_credits: FREE_ACCOUNT_CREDITS }
      );
    }
    const runner = globalThis.DacRunnerCore || globalThis.window?.DacRunnerCore;
    const runnable = new Set(
      runner.selectQueue(queue || [], "selected", new Set(requested))
        .filter((item) => item.status === "PENDING")
        .map((item) => item.job.id)
    );
    const blocked = requested.filter((id) => !runnable.has(id));
    if (blocked.length) {
      return refusal("JOB_NOT_RUNNABLE", `Not runnable for a trial (missing from the loaded plan, or not PENDING/PRE_SUBMIT/unprotected): ${blocked.join(", ")}.`, { job_ids: blocked });
    }
    const last = Number(last_started_at_ms);
    if (Number.isFinite(last) && last > 0) {
      const elapsedSec = Math.floor((Number(now_ms) - last) / 1000);
      if (elapsedSec < MIN_TRIAL_INTERVAL_SEC) {
        const waitSec = MIN_TRIAL_INTERVAL_SEC - elapsedSec;
        return refusal("TRIAL_RATE_LIMIT", `The previous development trial started ${elapsedSec}s ago; wait ${waitSec}s more before starting another (minimum interval ${MIN_TRIAL_INTERVAL_SEC}s).`, { retry_after_sec: waitSec, min_interval_sec: MIN_TRIAL_INTERVAL_SEC, last_started_at: new Date(last).toISOString() });
      }
    }
    return null;
  }

  // Reads the persisted trial history record; tolerates the earlier
  // timestamp-array shape so an old record never crashes the gate.
  function lastStartedAtMs(raw) {
    if (raw === undefined || raw === null) return null;
    const candidate = Number(
      raw && typeof raw === "object" && !Array.isArray(raw)
        ? raw.last_started_at
        : Array.isArray(raw) ? raw[raw.length - 1] : raw
    );
    return Number.isFinite(candidate) && candidate > 0 ? candidate : null;
  }

  function historyRecord(nowMs) {
    const started = Number(nowMs);
    if (!Number.isFinite(started) || started <= 0) throw new TypeError("historyRecord requires a positive epoch-milliseconds timestamp.");
    return { schema_version: 1, last_started_at: started };
  }

  (typeof window !== "undefined" ? window : globalThis).DacDevTrialCore = {
    DEV_MODE_STORAGE_KEY,
    TRIAL_HISTORY_STORAGE_KEY,
    MAX_TRIAL_JOBS,
    FREE_ACCOUNT_CREDITS,
    UNKNOWN_CONFIG_CREDITS_PER_OUTPUT,
    trialJobCeiling,
    MIN_TRIAL_INTERVAL_SEC,
    TIMEOUT_BOUNDS,
    DELAY_BOUNDS,
    trialRefusal,
    lastStartedAtMs,
    historyRecord
  };
})();

(() => {
  "use strict";

  // Owner decision 2026-08-25 (decisions.md): during development the AI may
  // start a small "trial run" through the Bridge via a dedicated method
  // (run.trial), never run.start. Every ceiling here is a hard-coded guard,
  // not a tunable: <=2 jobs, timeout <=90s, delay 20-30s between jobs, and at
  // least 5 minutes between trial starts. The panel toggle stays in the
  // owner's hands; production runs remain human-click only.
  const DEV_MODE_STORAGE_KEY = "dac.dev_mode.v1";
  const TRIAL_HISTORY_STORAGE_KEY = "dac.dev_trial_history.v1";
  const MAX_TRIAL_JOBS = 2;
  const MIN_TRIAL_INTERVAL_SEC = 300;
  const TIMEOUT_BOUNDS = Object.freeze({ min: 15, max: 90, default: 90 });
  const DELAY_BOUNDS = Object.freeze({ min: 20, max: 30, default: 25 });

  function refusal(code, message, details = {}) {
    return { code, message, details };
  }

  // Pure fail-closed gate. Returns null when the trial may start, otherwise a
  // typed refusal { code, message, details } whose code is a registered
  // bridge error code. Order matters: the owner toggle is checked first so a
  // disabled panel never leaks queue or rate-limit detail.
  function trialRefusal({ dev_mode, running, paused, queue, job_ids, last_started_at_ms, now_ms }) {
    if (dev_mode !== true) {
      return refusal("DEV_MODE_OFF", "Công tắc 'Chế độ phát triển' đang TẮT; run.trial bị từ chối. The owner must enable the development-mode toggle in the BRIDGE screen.", { storage_key: DEV_MODE_STORAGE_KEY });
    }
    if (running || paused) {
      return refusal("RUN_ACTIVE", "A run is already active or paused; run.trial never interrupts or queues behind it.", { lock_reason: paused ? "RUN_PAUSED" : "RUN_ACTIVE" });
    }
    const requested = Array.isArray(job_ids) ? job_ids : [];
    if (!requested.length || requested.length > MAX_TRIAL_JOBS) {
      return refusal("JOB_NOT_RUNNABLE", `A development trial runs 1-${MAX_TRIAL_JOBS} jobs.`, { job_ids: requested });
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
    MIN_TRIAL_INTERVAL_SEC,
    TIMEOUT_BOUNDS,
    DELAY_BOUNDS,
    trialRefusal,
    lastStartedAtMs,
    historyRecord
  };
})();

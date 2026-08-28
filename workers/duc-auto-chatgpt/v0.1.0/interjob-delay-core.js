(() => {
  "use strict";

  // Why this module exists, in one paragraph, because the bug it fixes looked
  // like a hang and cost a live session ten minutes of diagnosis:
  //
  // The inter-job wait used to be `for (12 ticks) await sleep(1000)`. Chrome
  // throttles DOM timers in a document that is not visible, and after five
  // minutes hidden it throttles them HARD -- roughly one wake-up per minute.
  // A side panel is a document, and it is hidden whenever its window is not
  // the foreground window. So a configured 12-second gap became ~11 minutes
  // measured live on 2026-08-28, and a 30-job batch would have turned 20
  // minutes of waiting into five and a half hours.
  //
  // The fix has two halves and needs both:
  //   1. WALL CLOCK IS THE AUTHORITY. Counting ticks measures how often Chrome
  //      chose to wake us, which is not time. A deadline measures time.
  //   2. AN ALARM IS THE WAKE-UP. `chrome.alarms` is delivered by the browser
  //      process, not by the document's throttled timer queue, so it arrives
  //      on schedule even while the panel is hidden.
  //
  // Half 1 alone bounds the damage to one throttled tick (~60s instead of
  // ~11min). Half 2 alone would be unsafe: an alarm that fires early, or a
  // stale alarm from a previous wait, must never be able to cut the gap
  // short, because the gap is a rate-limit protection. Hence: the alarm only
  // *wakes* the loop; the deadline decides whether the wait is over.

  // On the choice of clock: this is deliberately WALL clock (`Date.now`), not a
  // monotonic one. The gap exists so ChatGPT sees requests spread out in real
  // time, so real elapsed time is the thing that matters -- including time the
  // machine spent asleep. A monotonic clock that under-counts a suspend would
  // make the runner resume too soon, which is the failure direction we care
  // about. It also keeps the deadline in the same units `chrome.alarms` wants.
  const ALARM_PREFIX = "dac-interjob-delay";

  // The visible countdown still ticks once a second when the panel is in the
  // foreground. This is a display cadence, never a clock.
  const MAX_TICK_MS = 1000;

  function wholeSeconds(value) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
  }

  // `token` exists so the alarm name is deterministic in tests and unique in
  // production. Two waits must never share an alarm name: a leftover alarm
  // from wait N would wake wait N+1 early.
  function plan(seconds, now, token = "0") {
    const totalSec = wholeSeconds(seconds);
    const startedAtMs = Number(now);
    if (!Number.isFinite(startedAtMs)) throw new Error("INTERJOB_DELAY_INVALID_CLOCK: plan() needs a finite start time.");
    return Object.freeze({
      total_sec: totalSec,
      started_at_ms: startedAtMs,
      deadline_ms: startedAtMs + totalSec * 1000,
      alarm_name: `${ALARM_PREFIX}:${startedAtMs}:${token}`
    });
  }

  function isElapsed(delayPlan, now) {
    return Number(now) >= delayPlan.deadline_ms;
  }

  function remainingSeconds(delayPlan, now) {
    return Math.max(0, Math.ceil((delayPlan.deadline_ms - Number(now)) / 1000));
  }

  function nextTickMs(delayPlan, now) {
    return Math.max(0, Math.min(MAX_TICK_MS, delayPlan.deadline_ms - Number(now)));
  }

  // Arms the throttle-immune wake-up. `alarms` is the chrome.alarms API (or a
  // stand-in in tests). A null/unavailable alarms API is tolerated on purpose:
  // the deadline still decides, so the wait stays CORRECT and merely becomes
  // less punctual. Losing the alarm must never mean losing the gap.
  function armWake(alarms, delayPlan) {
    let settle = null;
    const fired = new Promise((resolve) => { settle = resolve; });
    if (!alarms || typeof alarms.create !== "function" || !alarms.onAlarm) {
      return { fired, cancel() { settle("no-alarm"); }, armed: false };
    }
    const handler = (alarm) => { if (alarm && alarm.name === delayPlan.alarm_name) settle("alarm"); };
    // MV3 chrome.alarms methods return promises. Nothing here depends on the
    // result, but an unswallowed rejection would surface as an unhandled
    // rejection in the panel, so every call is quieted both ways.
    const quiet = (value) => { try { Promise.resolve(value).catch(() => {}); } catch (_) { /* not a promise */ } };
    alarms.onAlarm.addListener(handler);
    quiet(alarms.create(delayPlan.alarm_name, { when: delayPlan.deadline_ms }));
    return {
      fired,
      armed: true,
      cancel() {
        try { alarms.onAlarm.removeListener(handler); } catch (_) { /* listener already gone */ }
        try { quiet(alarms.clear(delayPlan.alarm_name)); } catch (_) { /* alarm already fired */ }
        // Never leave the race pending: a caller that exits by `stop` would
        // otherwise keep a dangling promise alive for the life of the panel.
        settle("cancelled");
      }
    };
  }

  // The whole wait, with every environment dependency injected so the
  // throttled case can be reproduced in a test instead of only on a laptop.
  //
  // Returns { plan, reason, ticks, waited_ms }. `reason` is "elapsed" when the
  // configured gap really passed, "stopped" when the operator stopped first.
  async function waitBetweenJobs(options) {
    const now = options.now || Date.now;
    const sleep = options.sleep;
    if (typeof sleep !== "function") throw new Error("INTERJOB_DELAY_NO_SLEEP: waitBetweenJobs() needs a sleep function.");
    const onTick = options.onTick || (() => {});
    const shouldStop = options.shouldStop || (() => false);
    const delayPlan = options.plan || plan(options.seconds, now(), options.token);
    const wake = armWake(options.alarms, delayPlan);
    // Once the wake-up has fired it stays resolved forever, so racing it again
    // would resolve instantly on every pass. If the alarm ever arrives BEFORE
    // the deadline, that turns the loop into a busy spin inside the panel.
    // After the first wake we fall back to plain ticks, which are slow when
    // throttled but never hot.
    let woken = false;
    wake.fired.then(() => { woken = true; }, () => { woken = true; });
    let ticks = 0;
    try {
      for (;;) {
        if (shouldStop()) return { plan: delayPlan, reason: "stopped", ticks, waited_ms: Number(now()) - delayPlan.started_at_ms };
        const at = Number(now());
        // The deadline decides. A wake-up -- from a timer, from an alarm, from
        // an alarm that fired early -- only gets us here to ask this question.
        if (isElapsed(delayPlan, at)) return { plan: delayPlan, reason: "elapsed", ticks, waited_ms: at - delayPlan.started_at_ms };
        onTick(remainingSeconds(delayPlan, at));
        ticks += 1;
        const tick = sleep(nextTickMs(delayPlan, Number(now())));
        await (woken ? tick : Promise.race([wake.fired, tick]));
      }
    } finally {
      wake.cancel();
    }
  }

  const api = { ALARM_PREFIX, MAX_TICK_MS, plan, isElapsed, remainingSeconds, nextTickMs, armWake, waitBetweenJobs };
  (typeof window !== "undefined" ? window : globalThis).DacInterJobDelay = api;
})();

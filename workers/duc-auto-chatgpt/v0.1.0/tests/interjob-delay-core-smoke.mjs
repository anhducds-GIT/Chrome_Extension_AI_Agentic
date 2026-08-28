import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = {};
vm.runInNewContext(fs.readFileSync(new URL("../interjob-delay-core.js", import.meta.url), "utf8"), context);
const core = context.DacInterJobDelay;

const sidePanelSource = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const sidePanelHtml = fs.readFileSync(new URL("../sidepanel.html", import.meta.url), "utf8");

const T0 = 1_700_000_000_000;
const SECONDS = 12; // delay_min_sec that Duc actually runs with

// ---------------------------------------------------------------------------
// A virtual world. The whole point of this test is to reproduce Chrome's
// hidden-document timer throttling, which cannot be reproduced by waiting.
//
//   throttleMs      every sleep() takes AT LEAST this long, whatever it asked
//                   for. 60000 is what intensive wake-up throttling does.
//   alarmClampMs    Chrome refusing to schedule an alarm sooner than this.
//   alarmEarlyMs    an alarm arriving BEFORE its scheduled time.
//   alarmsAvailable false = no chrome.alarms at all (deadline authority alone).
// ---------------------------------------------------------------------------
function makeWorld({ throttleMs = null, alarmClampMs = 0, alarmEarlyMs = 0, alarmsAvailable = true } = {}) {
  const world = { t: T0, timers: [], scheduled: [], listeners: [], created: [], cleared: [] };

  const now = () => world.t;
  const sleep = (ms) => new Promise((resolve) => {
    const duration = throttleMs == null ? ms : Math.max(ms, throttleMs);
    world.timers.push({ at: world.t + duration, resolve });
  });

  const alarms = alarmsAvailable ? {
    onAlarm: {
      addListener: (fn) => { world.listeners.push(fn); },
      removeListener: (fn) => { world.listeners = world.listeners.filter((l) => l !== fn); }
    },
    create: (name, info) => {
      let when = Number(info.when);
      if (alarmClampMs) when = Math.max(when, world.t + alarmClampMs);
      if (alarmEarlyMs) when -= alarmEarlyMs;
      world.scheduled.push({ name, when });
      world.created.push({ name, when });
    },
    clear: (name) => {
      world.scheduled = world.scheduled.filter((a) => a.name !== name);
      world.cleared.push(name);
    }
  } : null;

  const drain = async () => { for (let i = 0; i < 60; i += 1) await Promise.resolve(); };

  async function settle(promise) {
    let done = false;
    let value;
    let failure;
    promise.then((v) => { done = true; value = v; }, (e) => { done = true; failure = e; });
    for (let guard = 0; guard < 20000; guard += 1) {
      await drain();
      if (done) break;
      const nextTimer = world.timers.length ? Math.min(...world.timers.map((t) => t.at)) : Infinity;
      const nextAlarm = world.scheduled.length ? Math.min(...world.scheduled.map((a) => a.when)) : Infinity;
      const next = Math.min(nextTimer, nextAlarm);
      assert.ok(Number.isFinite(next), "virtual world deadlocked: the wait scheduled nothing to wake it");
      world.t = Math.max(world.t, next);
      const dueAlarms = world.scheduled.filter((a) => a.when <= world.t);
      world.scheduled = world.scheduled.filter((a) => a.when > world.t);
      for (const alarm of dueAlarms) for (const listener of [...world.listeners]) listener({ name: alarm.name });
      const dueTimers = world.timers.filter((t) => t.at <= world.t);
      world.timers = world.timers.filter((t) => t.at > world.t);
      for (const timer of dueTimers) timer.resolve();
    }
    assert.ok(done, "virtual world never settled: the wait spun without finishing (busy loop?)");
    if (failure) throw failure;
    return value;
  }

  return { world, now, sleep, alarms, settle };
}

function runWait(worldOptions, waitOptions = {}) {
  const w = makeWorld(worldOptions);
  const promise = core.waitBetweenJobs({
    seconds: SECONDS, now: w.now, sleep: w.sleep, alarms: w.alarms, token: "test", ...waitOptions
  });
  return w.settle(promise).then((result) => ({ result, world: w.world }));
}

// ---------------------------------------------------------------------------
// 1. Pure helpers: the wall clock, not the tick count, is the measure.
// ---------------------------------------------------------------------------
const p = core.plan(SECONDS, T0, "unit");
assert.equal(p.total_sec, 12);
assert.equal(p.deadline_ms, T0 + 12_000);
assert.equal(p.alarm_name, `${core.ALARM_PREFIX}:${T0}:unit`);
assert.equal(core.isElapsed(p, T0 + 11_999), false, "one millisecond short is not elapsed");
assert.equal(core.isElapsed(p, T0 + 12_000), true, "the deadline itself is elapsed");
assert.equal(core.remainingSeconds(p, T0), 12);
assert.equal(core.remainingSeconds(p, T0 + 11_500), 1, "the visible countdown rounds up, never to a premature zero");
assert.equal(core.remainingSeconds(p, T0 + 99_999), 0, "remaining never goes negative");
assert.equal(core.nextTickMs(p, T0), 1000, "a tick is at most one second so the visible countdown stays smooth");
assert.equal(core.nextTickMs(p, T0 + 11_600), 400, "the last tick never overshoots the deadline");
assert.equal(core.nextTickMs(p, T0 + 50_000), 0, "past the deadline there is nothing left to wait");
assert.equal(core.plan(0, T0).deadline_ms, T0, "a zero delay is already elapsed");
assert.equal(core.plan("nonsense", T0).total_sec, 0, "an unusable delay degrades to zero, it does not throw mid-run");
assert.notEqual(core.plan(12, T0, "a").alarm_name, core.plan(12, T0, "b").alarm_name, "two waits never share an alarm name");

// ---------------------------------------------------------------------------
// 2. Foreground: the panel is visible, timers are honest. Unchanged behaviour.
// ---------------------------------------------------------------------------
{
  const ticks = [];
  const { result } = await runWait({}, { onTick: (remaining) => ticks.push(remaining) });
  assert.equal(result.reason, "elapsed");
  assert.equal(result.waited_ms, 12_000, "a visible panel waits exactly the configured gap");
  assert.deepEqual(ticks, [12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1], "the visible countdown still counts down once a second");
}

// ---------------------------------------------------------------------------
// 3. THE BUG. Panel hidden, Chrome throttling wake-ups to one a minute.
//    Tick-counting turns a 12s gap into 12 minutes; an alarm keeps it at 12s.
// ---------------------------------------------------------------------------
{
  const { result, world } = await runWait({ throttleMs: 60_000 });
  assert.equal(result.reason, "elapsed");
  assert.equal(
    result.waited_ms, 12_000,
    "a hidden, throttled panel must still wait the configured gap and no longer -- this is the 11-minute bug"
  );
  assert.ok(result.ticks <= 2, `a throttled wait wakes on the alarm, not on ${result.ticks} throttled timer ticks`);
  assert.equal(world.created.length, 1, "exactly one alarm is armed per wait");
  assert.equal(world.created[0].when, T0 + 12_000, "the alarm is armed for the deadline");
}

// ---------------------------------------------------------------------------
// 4. Deadline authority ALONE, with no alarm at all. Must not be short, and
//    must not be eleven minutes either.
// ---------------------------------------------------------------------------
{
  const { result } = await runWait({ throttleMs: 60_000, alarmsAvailable: false });
  assert.equal(result.reason, "elapsed");
  assert.ok(result.waited_ms >= 12_000, "losing the alarm must never shorten the gap");
  assert.ok(
    result.waited_ms <= 61_000,
    `without an alarm the damage is bounded to one throttled wake-up, not ${result.waited_ms}ms of counted ticks`
  );
}

// ---------------------------------------------------------------------------
// 5. Chrome clamping the alarm (it may refuse to schedule sooner than 30s).
//    Longer than configured is safe; shorter is not.
// ---------------------------------------------------------------------------
{
  const { result } = await runWait({ throttleMs: 60_000, alarmClampMs: 30_000 });
  assert.ok(result.waited_ms >= 12_000, "a clamped alarm still may not shorten the gap");
  assert.ok(result.waited_ms <= 31_000, "a clamped alarm still bounds the wait to the clamp, far under a throttled tick");
}

// ---------------------------------------------------------------------------
// 6. An alarm that arrives EARLY may not cut the gap short. The gap is a
//    rate-limit protection, so "woken" and "elapsed" are different questions.
//    This also proves the loop does not busy-spin after an early wake -- the
//    virtual world asserts settlement rather than hanging.
// ---------------------------------------------------------------------------
{
  const { result } = await runWait({ alarmEarlyMs: 5_000 });
  assert.equal(result.reason, "elapsed");
  assert.ok(
    result.waited_ms >= 12_000,
    `an alarm firing 5s early must not end the wait at ${result.waited_ms}ms -- the deadline decides, not the wake-up`
  );
}

// ---------------------------------------------------------------------------
// 7. Stop still wins, and every exit path disarms its alarm.
// ---------------------------------------------------------------------------
{
  let calls = 0;
  const { result, world } = await runWait({}, { shouldStop: () => { calls += 1; return calls > 1; } });
  assert.equal(result.reason, "stopped", "an operator stop still ends the wait before the deadline");
  assert.ok(result.waited_ms < 12_000, "a stop does not sit out the rest of the gap");
  assert.deepEqual(world.cleared, [`${core.ALARM_PREFIX}:${T0}:test`], "a stopped wait disarms its alarm");
  assert.equal(world.listeners.length, 0, "a stopped wait removes its alarm listener");
  assert.equal(world.scheduled.length, 0, "no alarm is left behind to wake the next wait early");
}
{
  const { result, world } = await runWait({}, { seconds: 0 });
  assert.equal(result.reason, "elapsed");
  assert.equal(result.ticks, 0, "a zero-second gap does not tick");
  assert.equal(world.scheduled.length, 0, "a zero-second gap leaves no armed alarm behind");
  assert.equal(world.listeners.length, 0, "a zero-second gap leaves no listener behind");
}
{
  const w = makeWorld({});
  await assert.rejects(
    w.settle(core.waitBetweenJobs({
      seconds: SECONDS, now: w.now, sleep: w.sleep, alarms: w.alarms, token: "test",
      onTick: () => { throw new Error("render blew up"); }
    })),
    /render blew up/
  );
  assert.deepEqual(w.world.cleared, [`${core.ALARM_PREFIX}:${T0}:test`], "a wait that throws still disarms its alarm");
  assert.equal(w.world.listeners.length, 0, "a wait that throws still removes its listener");
}

// ---------------------------------------------------------------------------
// 8. Wiring: the side panel must actually USE this, and must no longer be
//    counting ticks. A green core module wired to nothing fixes nothing.
// ---------------------------------------------------------------------------
assert.match(sidePanelHtml, /<script src="interjob-delay-core\.js"><\/script>/, "the side panel loads the inter-job delay module");
assert.ok(
  sidePanelHtml.indexOf('src="interjob-delay-core.js"') < sidePanelHtml.indexOf('src="sidepanel.js"'),
  "the module loads before the side panel that consumes it"
);
const countdownBody = sidePanelSource.slice(
  sidePanelSource.indexOf("async function countdown"),
  sidePanelSource.indexOf("async function waitForChatReady")
);
assert.ok(countdownBody.length > 0, "countdown() still exists");
assert.match(countdownBody, /window\.DacInterJobDelay\.waitBetweenJobs\(/, "the inter-job gap is waited through the throttle-immune module");
assert.match(countdownBody, /alarms: chrome\.alarms/, "the real chrome.alarms API is handed to the wait");
assert.doesNotMatch(
  countdownBody,
  /countdownValues\(/,
  "counting one-second ticks is what made a 12s gap take 11 minutes -- the countdown must not go back to it"
);
assert.doesNotMatch(countdownBody, /await sleep\(1000\)/, "the inter-job gap must not be a chain of throttleable one-second sleeps");
assert.match(sidePanelSource, /interjob-delay-core\.js/, "the module is referenced from the side panel bundle list or code");

console.log("inter-job delay core checks: PASS");

(() => {
  "use strict";
  const GLOSSARY = Object.freeze([
    ["SETUP", "Timeout", "Maximum budget for the active readiness or execution operation; not one global job timer."],
    ["SETUP", "Retries", "Safe automatic retries allowed only before a prompt has been submitted."],
    ["SETUP", "Safety cooldown", "Additional readiness-gate cooldown used by the ChatGPT readiness check; distinct from inter-job delay."],
    ["SETUP", "Inter-job delay", "Configured delay_min_sec to delay_max_sec before the next readiness gate. 3–3 is fixed; 3–5 selects a random integer for that transition."],
    ["RUN", "Waiting for ChatGPT ready", "The extension is verifying idle composer conditions. A timer ending never authorizes a prompt by itself."],
    ["RUN", "Response / output detection", "An attempt boundary is watched for attributable new output; old or reference images are not treated as new output."],
    ["RUN", "Saving", "Output was detected and configured artifacts are being persisted and checked."],
    ["RUN", "Reconciling", "A prompt may already exist. The extension checks that attempt instead of blindly submitting again."],
    ["OUTPUT", "Persistence verified", "The written file was re-opened and verified non-empty. Only then may it be shown as Saved."],
    ["OUTPUT", "Detected not downloaded", "Output was attributable, but image download was disabled; it is not a saved image file."],
    ["STATUS / FAILURE", "Halted", "Run stopped because of a protected/error condition. V1 has no Resume Run."],
    ["STATUS / FAILURE", "Exact-once", "The same attempt is never blindly submitted twice."],
    ["STATUS / FAILURE", "Security hard stop", "CAPTCHA, unusual activity, or human verification. There is no bypass or automatic retry."],
    ["TIMING", "Job elapsed", "Wall-clock time since the current job became active; it is independent from active-operation timers."],
    ["TIMING", "Next action", "An earliest readiness check is not a promised next prompt; readiness must still be confirmed."]
  ].map(([section, term, detail]) => ({ section, term, detail })));
  (typeof window !== "undefined" ? window : globalThis).DacOperatorGlossary = { GLOSSARY };
})();

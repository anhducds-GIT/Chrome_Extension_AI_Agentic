(() => {
  "use strict";

  function stageFor(item = {}) {
    if (item.runtime_stage) return item.runtime_stage;
    if (item.status === "SUCCESS" || item.phase === "SUCCESS") return "SUCCESS";
    if (["FAILED", "INTERRUPTED", "STOPPED"].includes(item.status)) return item.status;
    if (item.phase === "OUTPUT_DETECTED") return "OUTPUT_DETECTED";
    if (item.phase === "OUTPUT_SAVED" || item.phase === "CHAT_READY") return "FINALIZING / WAITING_IDLE";
    if (item.phase === "SUBMITTED") return "GENERATING";
    return item.status === "RECONCILING" ? "WAITING_READY" : "PENDING";
  }

  function nextEligible(queue = [], currentId = null) {
    return queue.find((item) => item.job?.id !== currentId && item.status === "PENDING" && !item.skipped && !item.protected_checkpoint) || null;
  }

  function formatDuration(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const minutes = Math.floor(total / 60);
    return `${String(minutes).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  }

  (typeof window !== "undefined" ? window : globalThis).DacRunState = { stageFor, nextEligible, formatDuration };
})();

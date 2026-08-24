(() => {
  "use strict";
  function blockingFailure(snapshot = {}) { return snapshot.abort || (snapshot.abortRequested ? "ABORTED_BY_OPERATOR" : null) || snapshot.security || snapshot.securityBlocker || snapshot.quota || snapshot.quotaBlocker || null; }
  function attachmentReady(before, expected, snapshot = {}) { return !snapshot.busy && Number(snapshot.after || 0) >= Number(before || 0) + Number(expected || 0); }
  function sendReady(snapshot = {}) { return !blockingFailure(snapshot) && Boolean(snapshot.found && !snapshot.disabled && snapshot.ariaDisabled !== "true"); }
  async function exposeFileInput(ports) {
    let input = ports.queryInput(); if (input) return input;
    const trigger = ports.findTrigger(); if (!trigger) throw new Error("UPLOAD_TRIGGER_MISSING");
    await guardedAction(ports.snapshot?.() || {}, () => ports.click(trigger)); input = await ports.waitInput(); if (input) return input;
    const menuItem = ports.findMenuItem(); if (!menuItem) throw new Error("UPLOAD_MENU_ITEM_MISSING");
    await guardedAction(ports.snapshot?.() || {}, () => ports.click(menuItem)); input = await ports.waitInput(); if (!input) throw new Error("FILE_INPUT_NOT_EXPOSED"); return input;
  }
  async function guardedAction(snapshot, action) { const blocker = blockingFailure(snapshot); if (blocker) throw new Error(blocker); return action(); }
  async function clickSend(ports) { return guardedAction(ports.snapshot?.() || {}, ports.click); }
  globalThis.DagContentDecisionCore = Object.freeze({ blockingFailure, attachmentReady, sendReady, exposeFileInput, guardedAction, clickSend });
})();

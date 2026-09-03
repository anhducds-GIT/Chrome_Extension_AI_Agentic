(() => {
  "use strict";

  /* Workspace = one NAMED work session inside one Chrome profile, bound to one
     ChatGPT tab (MULTI-SESSION-PER-PROFILE-DESIGN-V1, direction A approved by
     Đức 2026-09-03: host unchanged, cap 3, full method surface — tab-scoped
     methods bind to the workspace's tab, the one-run-at-a-time lock stays).

     This module is PURE: it validates the store, derives the per-workspace
     Bridge identity, and knows which URLs count as the provider. All Chrome
     API access lives in the transport; all human interaction in the panel. */

  const STORAGE_KEY = "dac.bridge.workspaces.v1";
  const MAX_WORKSPACES = 3;
  const WORKSPACE_ID_PATTERN = /^[A-Za-z0-9-]{8,64}$/;
  // Same discipline as the profile-label sanitizer (2 audit rounds, 02/09):
  // bound BEFORE scanning (O(cap), not O(input)); strip C0+C1 controls; the
  // caps cut by UTF-16 code unit, so sweep lone surrogates afterwards.
  const NAME_STRIP = new RegExp("[\\u0000-\\u001f\\u007f-\\u009f]", "g");
  const LONE_SURROGATE = /(?:[\uD800-\uDBFF](?![\uDC00-\uDFFF]))|(?:(?<![\uD800-\uDBFF])[\uDC00-\uDFFF])/g;
  const PROVIDER_TAB_PATTERN = /^https:\/\/(chatgpt\.com|chat\.openai\.com)\//i;

  function workspaceError(code, message) {
    const error = new Error(message || code);
    error.code = code;
    return error;
  }

  function sanitizeWorkspaceName(value) {
    const raw = typeof value === "string" ? value.slice(0, 256) : "";
    return raw.replace(NAME_STRIP, "").trim().slice(0, 64).replace(LONE_SURROGATE, "");
  }

  function isProviderTabUrl(url) {
    return PROVIDER_TAB_PATTERN.test(String(url || ""));
  }

  function validTabId(value) {
    return Number.isInteger(value) && value > 0;
  }

  // A hostile or corrupted store must never crash the transport or smuggle a
  // seat past the cap: anything invalid is dropped, duplicates keep the FIRST
  // record (the one that was there before the conflicting write).
  // tab_id may be null: a named workspace whose binding was voided (Chrome
  // restarted, so the stored tab id may name a stranger's tab now) keeps its
  // name and identity but connects to nothing until the owner re-attaches.
  function normalizeStore(raw) {
    const workspaces = [];
    const seenIds = new Set();
    const seenNames = new Set();
    const seenTabs = new Set();
    const candidates = Array.isArray(raw?.workspaces) ? raw.workspaces : [];
    for (const candidate of candidates) {
      if (workspaces.length >= MAX_WORKSPACES) break;
      if (!candidate || typeof candidate !== "object") continue;
      const workspaceId = typeof candidate.workspace_id === "string" ? candidate.workspace_id : "";
      const name = sanitizeWorkspaceName(candidate.name);
      const tabId = candidate.tab_id === null ? null : candidate.tab_id;
      if (!WORKSPACE_ID_PATTERN.test(workspaceId) || !name || (tabId !== null && !validTabId(tabId))) continue;
      const nameKey = name.toLowerCase();
      if (seenIds.has(workspaceId) || seenNames.has(nameKey) || (tabId !== null && seenTabs.has(tabId))) continue;
      seenIds.add(workspaceId);
      seenNames.add(nameKey);
      if (tabId !== null) seenTabs.add(tabId);
      workspaces.push({
        workspace_id: workspaceId,
        name,
        tab_id: tabId,
        created_at: typeof candidate.created_at === "string" ? candidate.created_at : new Date().toISOString()
      });
    }
    return { schema_version: 1, workspaces };
  }

  // Create (no workspace_id) or update (workspace_id present) one workspace.
  // Fail closed with a CODE the panel can show; never silently coerce.
  function upsertWorkspace(store, input, makeId) {
    const base = normalizeStore(store);
    const name = sanitizeWorkspaceName(input?.name);
    if (!name) throw workspaceError("WORKSPACE_NAME_INVALID", "Tên phiên làm việc trống hoặc chỉ chứa ký tự bị lọc.");
    if (!validTabId(input?.tab_id)) throw workspaceError("WORKSPACE_TAB_INVALID", "Phiên làm việc phải gắn vào một tab thật.");
    const workspaceId = typeof input?.workspace_id === "string" && input.workspace_id ? input.workspace_id : null;
    const existingIndex = workspaceId === null ? -1 : base.workspaces.findIndex((entry) => entry.workspace_id === workspaceId);
    if (workspaceId !== null && existingIndex < 0) throw workspaceError("WORKSPACE_NOT_FOUND", "Không tìm thấy phiên làm việc cần sửa.");
    const nameKey = name.toLowerCase();
    for (let index = 0; index < base.workspaces.length; index += 1) {
      if (index === existingIndex) continue;
      const other = base.workspaces[index];
      if (other.name.toLowerCase() === nameKey) throw workspaceError("WORKSPACE_NAME_TAKEN", `Tên '${name}' đã có phiên khác dùng trong hồ sơ này.`);
      if (other.tab_id !== null && other.tab_id === input.tab_id) throw workspaceError("WORKSPACE_TAB_TAKEN", `Tab này đã thuộc phiên '${other.name}'. Một tab chỉ thuộc một phiên.`);
    }
    if (existingIndex < 0 && base.workspaces.length >= MAX_WORKSPACES) {
      throw workspaceError("WORKSPACE_LIMIT", `Tối đa ${MAX_WORKSPACES} phiên làm việc song song trong một hồ sơ (Đức chốt 2026-09-03). Gỡ một phiên trước khi thêm.`);
    }
    const workspace = existingIndex >= 0
      ? { ...base.workspaces[existingIndex], name, tab_id: input.tab_id }
      : {
        workspace_id: (() => {
          const generated = typeof makeId === "function" ? makeId() : null;
          if (typeof generated === "string" && WORKSPACE_ID_PATTERN.test(generated)) return generated;
          throw workspaceError("WORKSPACE_ID_INVALID", "Không sinh được mã phiên hợp lệ.");
        })(),
        name,
        tab_id: input.tab_id,
        created_at: new Date().toISOString()
      };
    const workspaces = existingIndex >= 0
      ? base.workspaces.map((entry, index) => (index === existingIndex ? workspace : entry))
      : [...base.workspaces, workspace];
    return { store: { schema_version: 1, workspaces }, workspace };
  }

  function removeWorkspace(store, workspaceId) {
    const base = normalizeStore(store);
    const removed = base.workspaces.find((entry) => entry.workspace_id === workspaceId) || null;
    if (!removed) throw workspaceError("WORKSPACE_NOT_FOUND", "Không tìm thấy phiên làm việc cần gỡ.");
    return { store: { schema_version: 1, workspaces: base.workspaces.filter((entry) => entry.workspace_id !== workspaceId) }, removed };
  }

  // The Bridge identity a workspace seat announces. Routing metadata only —
  // never authentication (same rule as the profile instance block): the seat
  // still walks the full challenge → proof → auth handshake. The host cannot
  // tell a workspace from a profile, which is the whole point of direction A.
  function deriveInstance(profileInstance, workspace) {
    if (!profileInstance || typeof profileInstance !== "object") return null;
    if (!workspace || !WORKSPACE_ID_PATTERN.test(String(workspace.workspace_id || ""))) return null;
    // A workspace_id equal to the profile's own instance_id (reachable only
    // through a hostile/corrupted store — honest ids are UUIDs minted here)
    // would collide on the host, which keys seats by instance_id: the two
    // sockets would evict each other and targeting would oscillate. No
    // identity, no seat (audit 03/09, HIGH).
    if (String(workspace.workspace_id) === String(profileInstance.instance_id)) return null;
    const label = sanitizeWorkspaceName(workspace.name);
    if (!label) return null;
    return {
      schema_version: 1,
      instance_id: workspace.workspace_id,
      label,
      worker: profileInstance.worker,
      extension_version: profileInstance.extension_version
    };
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgeWorkspaceCore = Object.freeze({
    STORAGE_KEY,
    MAX_WORKSPACES,
    WORKSPACE_ID_PATTERN,
    sanitizeWorkspaceName,
    isProviderTabUrl,
    normalizeStore,
    upsertWorkspace,
    removeWorkspace,
    deriveInstance
  });
})();

(() => {
  "use strict";
  const DB_NAME = "duc-auto-chatgpt-output-profiles-v1";
  const STORE = "profiles";
  const profileId = (value) => {
    const id = String(value || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) throw new Error("Output profile ID must be a lowercase slug such as pilot-04.");
    return id;
  };
  const open = () => new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error("IndexedDB is unavailable in this Side Panel."));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "profile_id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open output-profile storage."));
  });
  async function transaction(mode, operation) {
    const database = await open();
    try { return await new Promise((resolve, reject) => {
      const request = operation(database.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("Output-profile storage failed."));
    }); } finally { database.close(); }
  }
  async function get(id) { return transaction("readonly", (store) => store.get(profileId(id))); }
  async function list() { return transaction("readonly", (store) => store.getAll()); }
  async function bind(id, handle, displayName = "") {
    if (!handle || typeof handle.queryPermission !== "function") throw new Error("The selected folder handle cannot be persisted by this browser.");
    const profile = { profile_id: profileId(id), display_name: String(displayName || id), directory_handle: handle, last_known_handle_name: String(handle.name || "Authorized folder") };
    try { await transaction("readwrite", (store) => store.put(profile)); }
    catch (error) { throw new Error(`OUTPUT_PROFILE_PERSISTENCE_UNSUPPORTED: Folder-handle persistence failed (${error?.message || String(error)}). This browser cannot reuse this profile after reload.`); }
    return profile;
  }
  // The File System Access API never reveals a handle's absolute path, but
  // workbooks carry output_folder_hint (authored full path). Persisting that
  // hint onto the profile lets the UI hand the operator a copyable real path
  // even after a reload, when no workbook is open yet.
  async function setHint(id, hint) {
    const clean = String(hint || "").trim();
    if (!clean) return null;
    const key = profileId(id);
    // Read-modify-write inside ONE readwrite transaction — a get()+put() pair
    // in separate transactions could resurrect a stale handle over a
    // concurrent bind() (Codex cross-audit finding).
    const database = await open();
    try {
      return await new Promise((resolve, reject) => {
        const txn = database.transaction(STORE, "readwrite");
        const store = txn.objectStore(STORE);
        const read = store.get(key);
        let updated = null;
        read.onsuccess = () => {
          const profile = read.result;
          if (!profile) return;
          profile.last_known_folder_hint = clean;
          updated = profile;
          store.put(profile);
        };
        txn.oncomplete = () => resolve(updated);
        txn.onerror = () => reject(txn.error || new Error("Output-profile storage failed."));
        txn.onabort = () => reject(txn.error || new Error("Output-profile storage aborted."));
      });
    } finally { database.close(); }
  }
  async function resolve(id) {
    const profile = await get(id);
    if (!profile?.directory_handle) return { state: "unbound", profile: null };
    try {
      const permission = await profile.directory_handle.queryPermission({ mode: "readwrite" });
      if (permission === "granted") return { state: "authorized", profile, permission };
      if (permission === "prompt") return { state: "permission_required", profile, permission };
      return { state: "unavailable", profile, permission };
    } catch (error) { return { state: "unavailable", profile, permission: "error", error: error?.message || String(error) }; }
  }
  (typeof window !== "undefined" ? window : globalThis).DacOutputProfiles = { DB_NAME, STORE, profileId, get, list, bind, setHint, resolve };
})();

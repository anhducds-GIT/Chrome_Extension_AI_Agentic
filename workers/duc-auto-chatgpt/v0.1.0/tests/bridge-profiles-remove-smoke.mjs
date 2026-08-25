import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const records = new Map();
let storeCreated = false;
const database = {
  createObjectStore() { storeCreated = true; },
  close() {},
  transaction(_name, mode) {
    const txn = { mode, error: null };
    txn.objectStore = () => ({
      get(key) {
        const request = {};
        queueMicrotask(() => {
          request.result = records.get(key);
          request.onsuccess?.();
          queueMicrotask(() => txn.oncomplete?.());
        });
        return request;
      },
      put(value) {
        const request = {};
        queueMicrotask(() => { records.set(value.profile_id, value); request.result = value.profile_id; request.onsuccess?.(); });
        return request;
      },
      delete(key) { queueMicrotask(() => records.delete(key)); return {}; },
      getAll() {
        const request = {};
        queueMicrotask(() => { request.result = [...records.values()]; request.onsuccess?.(); });
        return request;
      }
    });
    return txn;
  }
};
const indexedDB = {
  open() {
    const request = {};
    queueMicrotask(() => {
      request.result = database;
      if (!storeCreated) request.onupgradeneeded?.();
      request.onsuccess?.();
    });
    return request;
  }
};
const context = vm.createContext({ indexedDB, queueMicrotask });
context.globalThis = context;
vm.runInContext(fs.readFileSync(new URL("../output-profile-core.js", import.meta.url), "utf8"), context);
const profiles = context.DacOutputProfiles;
await profiles.bind("stale-profile", { name: "stale", queryPermission: async () => "granted" }, "Stale");
assert.equal((await profiles.list()).length, 1);
assert.equal(await profiles.remove("stale-profile"), true);
assert.equal((await profiles.list()).length, 0);
assert.equal(await profiles.remove("stale-profile"), false);

const source = fs.readFileSync(new URL("../sidepanel.js", import.meta.url), "utf8");
const handler = source.slice(source.indexOf("async function bridgeProfilesRemove"), source.indexOf("function appendBridgeMeta"));
assert.match(handler, /state\.outputSettings\?\.image\?\.profileId/);
assert.match(handler, /state\.outputSettings\?\.result\?\.profileId/);
assert.match(handler, /BridgeProtocolError\("VALIDATION_FAILED"/);
assert.match(handler, /DacOutputProfiles\.remove\(params\.profile_id\)/);
assert.match(handler, /disk_files_deleted: false/);
assert.doesNotMatch(handler, /removeEntry|deleteFile|directory_handle\.(?:remove|delete)/);

console.log("bridge profiles.remove smoke tests: PASS");

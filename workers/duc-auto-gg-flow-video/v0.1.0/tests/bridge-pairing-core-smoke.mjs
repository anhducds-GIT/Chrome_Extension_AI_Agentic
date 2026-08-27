import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-pairing-core.js")));
const pairing = globalThis.DacBridgePairingCore;
const token = Buffer.alloc(32, 7).toString("base64url");
const valid = pairing.validate({ schema_version: 1, host: "127.0.0.1", port: 32147, http_url: "http://127.0.0.1:32147/v1/rpc", websocket_url: "ws://127.0.0.1:32147/v1/extension", token });
assert.equal(valid.port, 32147);
assert.equal(pairing.publicPairing(valid).token, undefined, "public status never contains the token");
assert.throws(() => pairing.validate({ ...valid, host: "localhost" }), /127\.0\.0\.1/);
assert.throws(() => pairing.validate({ ...valid, http_url: "http://127.0.0.1:32148/v1/rpc" }), /endpoint/);
assert.throws(() => pairing.validate({ ...valid, token: "short" }), /token/);
assert.throws(() => pairing.parse("not json"), /JSON/);

console.log("bridge pairing core smoke tests: PASS");

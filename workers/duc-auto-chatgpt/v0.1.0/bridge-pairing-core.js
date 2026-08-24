(() => {
  "use strict";

  const PAIRING_STORAGE_KEY = "dac.bridge.pairing.v1";
  const STATUS_STORAGE_KEY = "dac.bridge.transport.status.v1";
  const DEFAULT_PORT = 32147;

  function decodeToken(value) {
    const token = String(value || "");
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) throw new Error("PAIRING_TOKEN_INVALID: token phải là 32 byte base64url.");
    const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/") + "=");
    if (decoded.length !== 32) throw new Error("PAIRING_TOKEN_INVALID: token phải chứa đúng 32 byte.");
    return token;
  }

  function validate(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("PAIRING_FILE_INVALID: nội dung phải là JSON object.");
    if (input.schema_version !== 1) throw new Error("PAIRING_SCHEMA_UNSUPPORTED: schema_version phải bằng 1.");
    if (input.host !== "127.0.0.1") throw new Error("PAIRING_ENDPOINT_INVALID: host phải là 127.0.0.1.");
    if (!Number.isInteger(input.port) || input.port < 1024 || input.port > 65535) throw new Error("PAIRING_ENDPOINT_INVALID: port phải nằm trong 1024-65535.");
    const httpUrl = `http://127.0.0.1:${input.port}/v1/rpc`;
    const websocketUrl = `ws://127.0.0.1:${input.port}/v1/extension`;
    if (input.http_url !== httpUrl || input.websocket_url !== websocketUrl) throw new Error("PAIRING_ENDPOINT_INVALID: endpoint không khớp đường dẫn cố định Bridge V1.");
    const token = decodeToken(input.token);
    return Object.freeze({ schema_version: 1, host: "127.0.0.1", port: input.port, http_url: httpUrl, websocket_url: websocketUrl, token });
  }

  function parse(text) {
    let value;
    try { value = JSON.parse(String(text)); }
    catch (_) { throw new Error("PAIRING_FILE_INVALID: tệp không phải JSON hợp lệ."); }
    return validate(value);
  }

  function publicPairing(pairing) {
    if (!pairing) return null;
    return { schema_version: pairing.schema_version, host: pairing.host, port: pairing.port, http_url: pairing.http_url, websocket_url: pairing.websocket_url };
  }

  (typeof window !== "undefined" ? window : globalThis).DacBridgePairingCore = Object.freeze({
    PAIRING_STORAGE_KEY, STATUS_STORAGE_KEY, DEFAULT_PORT, validate, parse, publicPairing
  });
})();

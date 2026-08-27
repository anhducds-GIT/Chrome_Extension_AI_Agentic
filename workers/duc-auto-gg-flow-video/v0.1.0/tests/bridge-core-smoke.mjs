import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
await import(pathToFileURL(path.join(here, "..", "bridge-core.js")));
const bridge = globalThis.DacBridgeCore;

const makeRequest = (overrides = {}) => ({
  protocol: bridge.PROTOCOL,
  version: 1,
  kind: "request",
  request_id: "request-0001",
  method: "system.ping",
  sent_at: "2026-08-23T10:00:00.000Z",
  client: { client_id: "duc-codex-local", name: "Codex", version: "1.0.0" },
  params: {},
  ...overrides
});

const parsed = bridge.parseRequest(JSON.stringify(makeRequest({ future_field: { ignored: true } })));
assert.equal(parsed.method, "system.ping");
assert.deepEqual(parsed.future_field, { ignored: true }, "unknown top-level fields survive parsing and do not block forward compatibility");
assert.equal(JSON.parse(bridge.serializeEnvelope(parsed)).request_id, "request-0001");
const parsedSuccess = bridge.parseResponse(bridge.serializeEnvelope({
  protocol: bridge.PROTOCOL,
  version: 1,
  kind: "response",
  request_id: "request-0001",
  ok: true,
  result: { online: true },
  responded_at: "2026-08-23T10:00:00.050Z"
}));
assert.deepEqual(parsedSuccess.result, { online: true });

for (const invalid of [
  null,
  makeRequest({ protocol: "wrong" }),
  makeRequest({ kind: "event" }),
  makeRequest({ request_id: "short" }),
  makeRequest({ sent_at: "not-a-time" }),
  makeRequest({ client: { client_id: "bad id", name: "Codex", version: "1" } }),
  makeRequest({ params: [] })
]) {
  assert.throws(() => bridge.parseRequest(invalid), (error) => error.code === "INVALID_ENVELOPE");
}

assert.equal(bridge.negotiateVersion([3, 1]), 1);
assert.throws(() => bridge.negotiateVersion([2]), (error) => error.code === "UNSUPPORTED_VERSION" && error.details.supported_versions[0] === 1);
assert.throws(() => bridge.parseRequest(makeRequest({ version: 2 })), (error) => error.code === "UNSUPPORTED_VERSION");

const canonicalA = { zebra: [3, { y: true, x: "Đức" }], alpha: 1 };
const canonicalB = { alpha: 1, zebra: [3, { x: "Đức", y: true }] };
assert.equal(bridge.canonicalJson(canonicalA), bridge.canonicalJson(canonicalB));
assert.equal(await bridge.hashCanonical({ b: 2, a: 1 }), "sha256:QyWM_3g_5wNtikMDP4MK38YOwDc4JHNUisdCuIgpJ3c", "canonical SHA-256 matches a fixed cross-runtime vector");
assert.equal(await bridge.hashText("abc"), "sha256:ungWv48Bz-pBQUDeXa4iI7ADYaOWF3qctBD_YfIAFa0", "prompt hashing covers the exact UTF-8 bytes, without JSON quotes");
assert.notEqual(await bridge.hashText("abc"), await bridge.hashCanonical("abc"), "raw prompt hashing is deliberately distinct from canonical payload hashing");
assert.equal(await bridge.hashCanonical(canonicalA), await bridge.hashCanonical(canonicalB), "object insertion order cannot change the payload hash");
assert.notEqual(await bridge.hashCanonical([1, 2]), await bridge.hashCanonical([2, 1]), "array order remains meaningful");
assert.throws(() => bridge.canonicalJson({ bad: undefined }), /JSON values only/);
assert.throws(() => bridge.canonicalJson({ bad: Number.NaN }), /finite numbers/);

const oversized = makeRequest({ params: { text: "a".repeat(bridge.LIMITS.max_envelope_bytes) } });
assert.throws(() => bridge.parseRequest(oversized), (error) => error.code === "INVALID_ENVELOPE" && error.details.max_envelope_bytes === 1048576);
assert.throws(() => bridge.serializeEnvelope(oversized), (error) => error.code === "INVALID_ENVELOPE");

const denied = bridge.createDispatcher({ handlers: {}, now: () => new Date("2026-08-23T10:00:01.000Z") });
const deniedResponse = await denied(makeRequest({ method: "run.start" }));
assert.equal(deniedResponse.ok, false);
assert.equal(deniedResponse.error.code, "METHOD_NOT_FOUND");
assert.equal(deniedResponse.error.retryable, false);

const prototypeNames = [
  "constructor", "toString", "valueOf", "hasOwnProperty", "isPrototypeOf",
  "propertyIsEnumerable", "toLocaleString", "__proto__"
];
for (const method of prototypeNames) {
  assert.throws(
    () => bridge.requireMethod(method),
    (error) => error.code === "METHOD_NOT_FOUND",
    `${method} cannot resolve through Object.prototype`
  );
  const response = await denied(makeRequest({ method }));
  assert.equal(response.ok, false, `${method} produces a response envelope`);
  assert.equal(response.error.code, "INVALID_ENVELOPE", `${method} is rejected by full request-envelope validation`);
  assert.throws(() => new bridge.BridgeProtocolError(method), TypeError, `${method} cannot resolve through the error-definition prototype`);
}

const internalFailure = bridge.createDispatcher({
  handlers: { "system.ping": async () => { throw new Error("private stack detail"); } },
  now: () => new Date("2026-08-23T10:00:01.000Z")
});
const internalResponse = await internalFailure(makeRequest());
assert.equal(internalResponse.ok, false, "unexpected handler failures still receive a response envelope");
assert.equal(internalResponse.error.code, "INTERNAL_ERROR");
assert.equal(internalResponse.error.message, "The bridge could not complete the request.");
assert.deepEqual(internalResponse.error.details, {});
assert.doesNotMatch(JSON.stringify(internalResponse), /private stack detail/, "internal failures leak no implementation detail");

const missingHandlerResponse = await denied(makeRequest());
assert.equal(missingHandlerResponse.ok, false, "a missing injected handler does not strand the caller until its deadline");
assert.equal(missingHandlerResponse.error.code, "INTERNAL_ERROR");

let handlerCalls = 0;
const replayStore = bridge.createMemoryReplayStore();
const dispatch = bridge.createDispatcher({
  replay_store: replayStore,
  now: () => new Date("2026-08-23T10:00:01.000Z"),
  handlers: {
    "queue.propose": async (params, call) => {
      handlerCalls += 1;
      assert.equal(call.method.context, "executor");
      return { proposal_id: "proposal-001", status: "AWAITING_OWNER_APPROVAL", preview: params.jobs };
    }
  }
});

const proposalParams = {
  if_ledger_etag: "sha256:ledger-etag",
  proposal_label: "Character batch",
  jobs: [{
    client_job_id: "agent-001",
    requested_job_id: null,
    prompt: "Create one image.",
    reference_images: ["Duc1.jpg"],
    settings: { timeout_sec: 180, max_retries: 2, safety_cooldown_sec: "6-9", output_folder: "Duc Auto ChatGPT" }
  }]
};
const proposal = makeRequest({ request_id: "proposal-request-0001", method: "queue.propose", params: proposalParams });
const accepted = await dispatch(proposal);
assert.equal(accepted.ok, true);
assert.equal(accepted.result.proposal_id, "proposal-001");
assert.equal(handlerCalls, 1);
assert.equal(replayStore.size(), 1);

const replayed = await dispatch({
  ...proposal,
  sent_at: "2026-08-23T10:00:05.000Z",
  client: { ...proposal.client, name: "Renamed caller", version: "1.0.1" },
  params: JSON.parse(JSON.stringify(proposalParams))
});
assert.deepEqual(replayed, accepted, "same client/request ID and canonical method payload returns the stored original response");
assert.equal(handlerCalls, 1, "replay does not invoke the proposal handler twice");

const reused = await dispatch({ ...proposal, params: { ...proposalParams, proposal_label: "Different payload" } });
assert.equal(reused.ok, false);
assert.equal(reused.error.code, "REQUEST_ID_REUSED");
assert.equal(reused.error.retryable, false);
assert.equal(handlerCalls, 1);

const unavailable = bridge.failureResponse("request-0002", "EXECUTOR_UNAVAILABLE", () => new Date("2026-08-23T10:00:02.000Z"));
assert.deepEqual(unavailable.error, {
  code: "EXECUTOR_UNAVAILABLE",
  details: { failure_type: null, halt_instruction: null },
  message: "Open the Duc Auto GG Flow side panel and retry the same request_id.",
  retryable: true
});
assert.deepEqual(bridge.parseEnvelope(bridge.serializeEnvelope(unavailable)), unavailable);
assert.throws(() => bridge.parseResponse({ ...unavailable, error: { ...unavailable.error, retryable: false } }), (error) => error.code === "INVALID_ENVELOPE");

console.log("bridge core smoke tests: PASS");

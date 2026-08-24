import assert from "node:assert/strict";
import { closePayload, createFrameDecoder, encodeFrame, websocketAcceptKey } from "../duc-auto-chatgpt-loopback-bridge-host-v1/websocket-core.mjs";

assert.equal(websocketAcceptKey("dGhlIHNhbXBsZSBub25jZQ=="), "s3pPLMBiTxaQ9kYGzzhZRbK+xOo=");
assert.throws(() => websocketAcceptKey("bad"), /Invalid/);

const masked = encodeFrame("xin chào", { masked: true, maskKey: Buffer.from([1, 2, 3, 4]) });
const decoder = createFrameDecoder({ requireMasked: true });
assert.deepEqual(decoder.push(masked.subarray(0, 3)), []);
const frames = decoder.push(masked.subarray(3));
assert.equal(frames.length, 1);
assert.equal(frames[0].text, "xin chào");
assert.equal(decoder.bufferedBytes(), 0);

const longText = "x".repeat(70000);
const longFrame = encodeFrame(longText);
assert.equal(createFrameDecoder({ requireMasked: false }).push(longFrame)[0].text.length, 70000);
assert.throws(() => createFrameDecoder({ maxPayloadBytes: 8 }).push(encodeFrame("123456789")), /exceeds/);
assert.throws(() => createFrameDecoder({ requireMasked: true }).push(encodeFrame("plain")), /masked/);
assert.throws(() => encodeFrame("fragment", { fin: false }), /Fragmented/);
assert.equal(closePayload(1000, "done").readUInt16BE(0), 1000);

console.log("bridge websocket core smoke tests: PASS");

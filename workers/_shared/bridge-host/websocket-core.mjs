import crypto from "node:crypto";

export const RFC6455_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
export const DEFAULT_MAX_PAYLOAD_BYTES = 1024 * 1024;

export function websocketAcceptKey(clientKey) {
  const value = String(clientKey || "").trim();
  const decoded = Buffer.from(value, "base64");
  if (!/^[A-Za-z0-9+/]{22}==$/.test(value) || decoded.length !== 16) {
    throw new Error("Invalid Sec-WebSocket-Key.");
  }
  return crypto.createHash("sha1").update(`${value}${RFC6455_GUID}`, "ascii").digest("base64");
}

function payloadBuffer(payload) {
  if (Buffer.isBuffer(payload)) return payload;
  if (payload instanceof Uint8Array) return Buffer.from(payload);
  return Buffer.from(String(payload ?? ""), "utf8");
}

export function encodeFrame(payload, options = {}) {
  const opcode = options.opcode ?? 0x1;
  const fin = options.fin !== false;
  const masked = Boolean(options.masked);
  const body = payloadBuffer(payload);
  if (![0x1, 0x8, 0x9, 0xa].includes(opcode)) throw new Error("Unsupported WebSocket opcode.");
  if (!fin) throw new Error("Fragmented WebSocket messages are not supported.");
  if (opcode >= 0x8 && body.length > 125) throw new Error("Control-frame payload exceeds 125 bytes.");
  let lengthBytes = 0;
  if (body.length >= 126 && body.length <= 0xffff) lengthBytes = 2;
  else if (body.length > 0xffff) lengthBytes = 8;
  const header = Buffer.alloc(2 + lengthBytes + (masked ? 4 : 0));
  header[0] = 0x80 | opcode;
  if (!lengthBytes) header[1] = (masked ? 0x80 : 0) | body.length;
  else if (lengthBytes === 2) {
    header[1] = (masked ? 0x80 : 0) | 126;
    header.writeUInt16BE(body.length, 2);
  } else {
    if (body.length > Number.MAX_SAFE_INTEGER) throw new Error("WebSocket frame is too large.");
    header[1] = (masked ? 0x80 : 0) | 127;
    header.writeBigUInt64BE(BigInt(body.length), 2);
  }
  if (!masked) return Buffer.concat([header, body]);
  const mask = options.maskKey ? payloadBuffer(options.maskKey) : crypto.randomBytes(4);
  if (mask.length !== 4) throw new Error("WebSocket mask key must contain four bytes.");
  mask.copy(header, 2 + lengthBytes);
  const encoded = Buffer.alloc(body.length);
  for (let index = 0; index < body.length; index += 1) encoded[index] = body[index] ^ mask[index % 4];
  return Buffer.concat([header, encoded]);
}

export function closePayload(code = 1000, reason = "") {
  const text = Buffer.from(String(reason), "utf8");
  if (text.length > 123) throw new Error("WebSocket close reason exceeds 123 bytes.");
  const payload = Buffer.alloc(2 + text.length);
  payload.writeUInt16BE(code, 0);
  text.copy(payload, 2);
  return payload;
}

export function createFrameDecoder(options = {}) {
  const maxPayloadBytes = Number(options.maxPayloadBytes || DEFAULT_MAX_PAYLOAD_BYTES);
  const requireMasked = options.requireMasked;
  let buffered = Buffer.alloc(0);

  function push(chunk) {
    buffered = Buffer.concat([buffered, payloadBuffer(chunk)]);
    const frames = [];
    while (buffered.length >= 2) {
      const first = buffered[0];
      const second = buffered[1];
      if (first & 0x70) throw new Error("WebSocket RSV bits are not supported.");
      const fin = Boolean(first & 0x80);
      const opcode = first & 0x0f;
      const masked = Boolean(second & 0x80);
      if (!fin) throw new Error("Fragmented WebSocket messages are not supported.");
      if (![0x1, 0x8, 0x9, 0xa].includes(opcode)) throw new Error("Unsupported WebSocket opcode.");
      if (requireMasked === true && !masked) throw new Error("Client WebSocket frames must be masked.");
      if (requireMasked === false && masked) throw new Error("Server WebSocket frames must not be masked.");
      let offset = 2;
      let length = second & 0x7f;
      if (length === 126) {
        if (buffered.length < offset + 2) break;
        length = buffered.readUInt16BE(offset);
        offset += 2;
      } else if (length === 127) {
        if (buffered.length < offset + 8) break;
        const wide = buffered.readBigUInt64BE(offset);
        if (wide > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("WebSocket frame length is unsafe.");
        length = Number(wide);
        offset += 8;
      }
      if (length > maxPayloadBytes) throw new Error("WebSocket payload exceeds the configured limit.");
      if (opcode >= 0x8 && length > 125) throw new Error("WebSocket control payload exceeds 125 bytes.");
      const maskOffset = offset;
      if (masked) offset += 4;
      if (buffered.length < offset + length) break;
      const payload = Buffer.from(buffered.subarray(offset, offset + length));
      if (masked) {
        const mask = buffered.subarray(maskOffset, maskOffset + 4);
        for (let index = 0; index < payload.length; index += 1) payload[index] ^= mask[index % 4];
      }
      buffered = buffered.subarray(offset + length);
      frames.push({
        fin,
        opcode,
        masked,
        payload,
        text: opcode === 0x1 ? payload.toString("utf8") : null
      });
    }
    return frames;
  }

  return Object.freeze({ push, bufferedBytes: () => buffered.length });
}

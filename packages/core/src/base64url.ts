/** Unpadded Base64 URL (RFC 4648 §5) for Orbit ID big-endian bytes. */

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

const DECODE = /* @__PURE__ */ (() => {
  const table = new Int16Array(128).fill(-1);
  for (let i = 0; i < ALPHABET.length; i++) {
    table[ALPHABET.charCodeAt(i)] = i;
  }
  return table;
})();

export function idToBigEndianBytes(id: bigint, byteLength: number): Uint8Array {
  const out = new Uint8Array(byteLength);
  let value = id;
  for (let i = byteLength - 1; i >= 0; i--) {
    out[i] = Number(value & 0xffn);
    value >>= 8n;
  }
  return out;
}

export function bigEndianBytesToId(bytes: Uint8Array): bigint {
  let value = 0n;
  for (const byte of bytes) {
    value = (value << 8n) | BigInt(byte);
  }
  return value;
}

export function encodeBase64Url(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!;
    const b = i + 1 < bytes.length ? bytes[i + 1]! : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2]! : 0;
    const n = (a << 16) | (b << 8) | c;
    out += ALPHABET[(n >> 18) & 63]!;
    out += ALPHABET[(n >> 12) & 63]!;
    if (i + 1 < bytes.length) {
      out += ALPHABET[(n >> 6) & 63]!;
    }
    if (i + 2 < bytes.length) {
      out += ALPHABET[n & 63]!;
    }
  }
  return out;
}

export function decodeBase64Url(input: string, expectedByteLength: number): Uint8Array {
  const expectedChars = Math.ceil((expectedByteLength * 8) / 6);
  if (input.length !== expectedChars) {
    throw new Error(`base64url length must be ${expectedChars}`);
  }
  if (!/^[A-Za-z0-9_-]+$/.test(input)) {
    throw new Error("invalid base64url alphabet");
  }

  const out = new Uint8Array(expectedByteLength);
  let outIndex = 0;
  for (let i = 0; i < input.length; i += 4) {
    const c0 = DECODE[input.charCodeAt(i)]!;
    const c1 = DECODE[input.charCodeAt(i + 1)]!;
    const c2 = i + 2 < input.length ? DECODE[input.charCodeAt(i + 2)]! : 0;
    const c3 = i + 3 < input.length ? DECODE[input.charCodeAt(i + 3)]! : 0;
    if (c0 < 0 || c1 < 0 || (i + 2 < input.length && c2 < 0) || (i + 3 < input.length && c3 < 0)) {
      throw new Error("invalid base64url alphabet");
    }
    const n = (c0 << 18) | (c1 << 12) | (c2 << 6) | c3;
    if (outIndex < expectedByteLength) {
      out[outIndex++] = (n >> 16) & 0xff;
    }
    if (i + 2 < input.length && outIndex < expectedByteLength) {
      out[outIndex++] = (n >> 8) & 0xff;
    }
    if (i + 3 < input.length && outIndex < expectedByteLength) {
      out[outIndex++] = n & 0xff;
    }
  }
  return out;
}

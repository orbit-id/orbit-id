import { OrbitError } from "../errors.js";
import {
  FORMAT_VERSION_MASK,
  FORMAT_VERSION_SHIFT,
  ISSUED_FORMAT_VERSION,
  MAX_NODE,
  MAX_SEQUENCE,
  MAX_TIMESTAMP,
  MAX_TYPE,
  NODE_MASK,
  NODE_SHIFT,
  ORBIT_EPOCH_UNIX_MS,
  RESERVED_MASK,
  SEQUENCE_MASK,
  SEQUENCE_SHIFT,
  TIMESTAMP_MASK,
  TIMESTAMP_SHIFT,
  TYPE_MASK,
  TYPE_SHIFT,
  U128_MAX,
} from "./constants.js";

export type OrbitFieldsV2 = {
  formatVersion: number;
  timestamp: bigint;
  type: number;
  node: number;
  sequence: number;
  reserved: number;
};

export function encode(fields: OrbitFieldsV2): bigint {
  const { formatVersion, timestamp, type, node, sequence, reserved } = fields;
  if (!Number.isInteger(formatVersion) || formatVersion !== ISSUED_FORMAT_VERSION) {
    throw new OrbitError(
      "INVALID_FORMAT_VERSION",
      `formatVersion must be ${ISSUED_FORMAT_VERSION}: ${formatVersion}`,
    );
  }
  if (timestamp < 0n || timestamp > MAX_TIMESTAMP) {
    throw new OrbitError("INVALID_TIMESTAMP", `timestamp out of range: ${timestamp}`);
  }
  if (!Number.isInteger(type) || type < 0 || type > MAX_TYPE) {
    throw new OrbitError("INVALID_TYPE", `type out of range: ${type}`);
  }
  if (!Number.isInteger(node) || node < 0 || node > MAX_NODE) {
    throw new OrbitError("INVALID_NODE", `node out of range: ${node}`);
  }
  if (!Number.isInteger(sequence) || sequence < 0 || sequence > MAX_SEQUENCE) {
    throw new OrbitError("INVALID_SEQUENCE", `sequence out of range: ${sequence}`);
  }
  if (!Number.isInteger(reserved) || reserved !== 0) {
    throw new OrbitError("INVALID_RESERVED", `reserved must be 0 on encode: ${reserved}`);
  }
  return (
    (BigInt(formatVersion) << FORMAT_VERSION_SHIFT) |
    (timestamp << TIMESTAMP_SHIFT) |
    (BigInt(type) << TYPE_SHIFT) |
    (BigInt(node) << NODE_SHIFT) |
    (BigInt(sequence) << SEQUENCE_SHIFT) |
    BigInt(reserved)
  );
}

export function parse(id: bigint | string): OrbitFieldsV2 {
  const value = typeof id === "bigint" ? id : fromDecimalString(id);
  return decode(value);
}

export function decode(id: bigint): OrbitFieldsV2 {
  if (id < 0n || id > U128_MAX) {
    throw new OrbitError("INVALID_DECIMAL", `id out of unsigned 128-bit range: ${id}`);
  }
  const formatVersion = Number((id >> FORMAT_VERSION_SHIFT) & FORMAT_VERSION_MASK);
  if (formatVersion !== ISSUED_FORMAT_VERSION) {
    throw new OrbitError(
      "INVALID_FORMAT_VERSION",
      `unknown or reserved formatVersion: ${formatVersion}`,
    );
  }
  const reserved = Number(id & RESERVED_MASK);
  if (reserved !== 0) {
    throw new OrbitError("INVALID_RESERVED", `non-zero reserved is rejected in alpha: ${reserved}`);
  }
  return {
    formatVersion,
    timestamp: (id >> TIMESTAMP_SHIFT) & TIMESTAMP_MASK,
    type: Number((id >> TYPE_SHIFT) & TYPE_MASK),
    node: Number((id >> NODE_SHIFT) & NODE_MASK),
    sequence: Number((id >> SEQUENCE_SHIFT) & SEQUENCE_MASK),
    reserved,
  };
}

export function getFormatVersion(id: bigint | string): number {
  return parse(id).formatVersion;
}

export function getTimestamp(id: bigint | string): bigint {
  return parse(id).timestamp;
}

export function getType(id: bigint | string): number {
  return parse(id).type;
}

export function getNode(id: bigint | string): number {
  return parse(id).node;
}

export function getSequence(id: bigint | string): number {
  return parse(id).sequence;
}

export function getReserved(id: bigint | string): number {
  return parse(id).reserved;
}

/** Syntactic validity only — does not mean the ID was issued. */
export function isValid(id: unknown): boolean {
  try {
    if (typeof id === "bigint") {
      decode(id);
      return true;
    }
    if (typeof id === "string") {
      decode(fromDecimalString(id));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function toDecimalString(id: bigint): string {
  if (id < 0n || id > U128_MAX) {
    throw new OrbitError("INVALID_DECIMAL", `id out of unsigned 128-bit range: ${id}`);
  }
  return id.toString(10);
}

export function fromDecimalString(input: string): bigint {
  if (typeof input !== "string") {
    throw new OrbitError("INVALID_DECIMAL", "decimal input must be a string");
  }
  if (input.length === 0) {
    throw new OrbitError("INVALID_DECIMAL", "empty decimal string");
  }
  if (input.startsWith("+") || input.startsWith("-") || input.startsWith(" ") || input.endsWith(" ")) {
    throw new OrbitError("INVALID_DECIMAL", "non-canonical decimal string");
  }
  if (input.includes(".") || input.toLowerCase().includes("x")) {
    throw new OrbitError("INVALID_DECIMAL", "non-canonical decimal string");
  }
  if (!/^[0-9]+$/.test(input)) {
    throw new OrbitError("INVALID_DECIMAL", "non-canonical decimal string");
  }
  if (input.length > 1 && input.startsWith("0")) {
    throw new OrbitError("INVALID_DECIMAL", "leading zeros are not canonical");
  }
  let value: bigint;
  try {
    value = BigInt(input);
  } catch {
    throw new OrbitError("INVALID_DECIMAL", "invalid decimal string");
  }
  if (value < 0n || value > U128_MAX) {
    throw new OrbitError("INVALID_DECIMAL", "decimal value outside unsigned 128-bit range");
  }
  return value;
}

export function toUnixTimeMs(timestamp: bigint): bigint {
  return timestamp + ORBIT_EPOCH_UNIX_MS;
}

export function fromUnixTimeMs(unixMs: bigint): bigint {
  return unixMs - ORBIT_EPOCH_UNIX_MS;
}

export function toHexString(id: bigint): string {
  if (id < 0n || id > U128_MAX) {
    throw new OrbitError("INVALID_DECIMAL", `id out of unsigned 128-bit range: ${id}`);
  }
  return `0x${id.toString(16).padStart(32, "0")}`;
}

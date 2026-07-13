import {
  MAX_NODE,
  MAX_SEQUENCE,
  MAX_TIMESTAMP,
  MAX_TYPE,
  NODE_MASK,
  NODE_SHIFT,
  ORBIT_EPOCH_UNIX_MS,
  SEQUENCE_MASK,
  TIMESTAMP_MASK,
  TIMESTAMP_SHIFT,
  TYPE_MASK,
  TYPE_SHIFT,
} from "./constants.js";
import { OrbitError } from "./errors.js";

export type OrbitFields = {
  timestamp: bigint;
  type: number;
  node: number;
  sequence: number;
};

export function encode(fields: OrbitFields): bigint {
  const { timestamp, type, node, sequence } = fields;
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
  return (
    (timestamp << TIMESTAMP_SHIFT) |
    (BigInt(type) << TYPE_SHIFT) |
    (BigInt(node) << NODE_SHIFT) |
    BigInt(sequence)
  );
}

export function parse(id: bigint | string): OrbitFields {
  const value = typeof id === "bigint" ? id : fromDecimalString(id);
  return decode(value);
}

export function decode(id: bigint): OrbitFields {
  if (id < 0n || id > (1n << 64n) - 1n) {
    throw new OrbitError("INVALID_DECIMAL", `id out of unsigned 64-bit range: ${id}`);
  }
  return {
    timestamp: (id >> TIMESTAMP_SHIFT) & TIMESTAMP_MASK,
    type: Number((id >> TYPE_SHIFT) & TYPE_MASK),
    node: Number((id >> NODE_SHIFT) & NODE_MASK),
    sequence: Number(id & SEQUENCE_MASK),
  };
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

/** Syntactic validity only — does not mean the ID was issued. */
export function isValid(id: unknown): boolean {
  try {
    if (typeof id === "bigint") {
      decode(id);
      return true;
    }
    if (typeof id === "string") {
      fromDecimalString(id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function toDecimalString(id: bigint): string {
  if (id < 0n || id > (1n << 64n) - 1n) {
    throw new OrbitError("INVALID_DECIMAL", `id out of unsigned 64-bit range: ${id}`);
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
  if (value < 0n || value > (1n << 64n) - 1n) {
    throw new OrbitError("INVALID_DECIMAL", "decimal value outside unsigned 64-bit range");
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
  return `0x${id.toString(16).padStart(16, "0")}`;
}

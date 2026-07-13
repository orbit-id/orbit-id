import { describe, expect, it } from "vitest";
import {
  OrbitError,
  ORBIT_EPOCH_UNIX_MS,
  decode,
  encode,
  fromDecimalString,
  fromUnixTimeMs,
  getNode,
  getSequence,
  getTimestamp,
  getType,
  isValid,
  parse,
  toDecimalString,
  toUnixTimeMs,
} from "../src/index.js";

const SAMPLE = {
  timestamp: 16_762_354_567n,
  type: 2,
  node: 7,
  sequence: 42,
} as const;

const SAMPLE_ID = 140612821619842090n;
const SAMPLE_DECIMAL = "140612821619842090";

describe("decode", () => {
  it("extracts all fields from a known id", () => {
    expect(decode(SAMPLE_ID)).toEqual({ ...SAMPLE });
  });

  it("decodes zero id to zero fields", () => {
    expect(decode(0n)).toEqual({
      timestamp: 0n,
      type: 0,
      node: 0,
      sequence: 0,
    });
  });

  it("decodes max u64 into max fields", () => {
    expect(decode((1n << 64n) - 1n)).toEqual({
      timestamp: (1n << 41n) - 1n,
      type: 63,
      node: 127,
      sequence: 1023,
    });
  });

  it("rejects negative bigint", () => {
    expect(() => decode(-1n)).toThrow(OrbitError);
    try {
      decode(-1n);
    } catch (e) {
      expect(e).toBeInstanceOf(OrbitError);
      expect((e as OrbitError).code).toBe("INVALID_DECIMAL");
    }
  });

  it("rejects values above u64 max", () => {
    expect(() => decode(1n << 64n)).toThrow(OrbitError);
  });

  it("is the inverse of encode for field combinations", () => {
    const cases = [
      { timestamp: 0n, type: 0, node: 0, sequence: 0 },
      { timestamp: 1n, type: 1, node: 0, sequence: 0 },
      { timestamp: 1000n, type: 10, node: 127, sequence: 0 },
      { timestamp: 1000n, type: 1, node: 1, sequence: 1023 },
      { ...SAMPLE },
    ];
    for (const fields of cases) {
      expect(decode(encode(fields))).toEqual(fields);
    }
  });
});

describe("parse", () => {
  it("accepts bigint ids", () => {
    expect(parse(SAMPLE_ID)).toEqual({ ...SAMPLE });
  });

  it("accepts canonical decimal strings", () => {
    expect(parse(SAMPLE_DECIMAL)).toEqual({ ...SAMPLE });
  });

  it("rejects non-canonical decimal strings with INVALID_DECIMAL", () => {
    for (const input of ["-1", "+1", " 1", "1 ", "01", "1.0", "0x1", ""]) {
      try {
        parse(input);
        expect.unreachable(`expected throw for ${JSON.stringify(input)}`);
      } catch (e) {
        expect(e).toBeInstanceOf(OrbitError);
        expect((e as OrbitError).code).toBe("INVALID_DECIMAL");
      }
    }
  });
});

describe("getters", () => {
  it("reads each field from bigint", () => {
    expect(getTimestamp(SAMPLE_ID)).toBe(SAMPLE.timestamp);
    expect(getType(SAMPLE_ID)).toBe(SAMPLE.type);
    expect(getNode(SAMPLE_ID)).toBe(SAMPLE.node);
    expect(getSequence(SAMPLE_ID)).toBe(SAMPLE.sequence);
  });

  it("reads each field from decimal string", () => {
    expect(getTimestamp(SAMPLE_DECIMAL)).toBe(SAMPLE.timestamp);
    expect(getType(SAMPLE_DECIMAL)).toBe(SAMPLE.type);
    expect(getNode(SAMPLE_DECIMAL)).toBe(SAMPLE.node);
    expect(getSequence(SAMPLE_DECIMAL)).toBe(SAMPLE.sequence);
  });

  it("converts timestamp to and from unix ms", () => {
    expect(toUnixTimeMs(0n)).toBe(ORBIT_EPOCH_UNIX_MS);
    expect(fromUnixTimeMs(ORBIT_EPOCH_UNIX_MS)).toBe(0n);
    expect(toUnixTimeMs(SAMPLE.timestamp)).toBe(SAMPLE.timestamp + ORBIT_EPOCH_UNIX_MS);
  });
});

describe("isValid", () => {
  it("accepts syntactically valid bigint and decimal forms", () => {
    expect(isValid(0n)).toBe(true);
    expect(isValid(SAMPLE_ID)).toBe(true);
    expect(isValid("0")).toBe(true);
    expect(isValid(SAMPLE_DECIMAL)).toBe(true);
    expect(isValid((1n << 64n) - 1n)).toBe(true);
  });

  it("rejects invalid candidates without throwing", () => {
    expect(isValid(-1n)).toBe(false);
    expect(isValid(1n << 64n)).toBe(false);
    expect(isValid("-1")).toBe(false);
    expect(isValid("01")).toBe(false);
    expect(isValid("0x1")).toBe(false);
    expect(isValid("")).toBe(false);
    expect(isValid(null)).toBe(false);
    expect(isValid(undefined)).toBe(false);
    expect(isValid(123)).toBe(false);
    expect(isValid({})).toBe(false);
  });

  it("does not claim issuance — arbitrary bit patterns can be valid", () => {
    // Any unsigned 64-bit value is syntactically decodable.
    expect(isValid(123456789n)).toBe(true);
    expect(decode(123456789n).timestamp).toBeGreaterThanOrEqual(0n);
  });
});

describe("decimal helpers", () => {
  it("round-trips decimal strings", () => {
    expect(toDecimalString(fromDecimalString(SAMPLE_DECIMAL))).toBe(SAMPLE_DECIMAL);
    expect(toDecimalString(0n)).toBe("0");
    expect(toDecimalString((1n << 64n) - 1n)).toBe("18446744073709551615");
  });

  it("fromDecimalString rejects u64 overflow", () => {
    expect(() => fromDecimalString("18446744073709551616")).toThrow(OrbitError);
  });
});

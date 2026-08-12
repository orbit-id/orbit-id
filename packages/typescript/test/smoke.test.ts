import { describe, expect, it } from "vitest";
import {
  OrbitError,
  OrbitGeneratorV2,
  decode,
  encode,
  fromDecimalString,
  getNode,
  getSequence,
  getTimestamp,
  getType,
  isValid,
  parse,
  toDecimalString,
  v1,
} from "../src/index.js";

describe("@orbit-id/typescript root is v2", () => {
  const fields = {
    formatVersion: 1,
    timestamp: 0n,
    type: 1,
    node: 7,
    sequence: 42,
    region: 0,
    tenant: 0,
    reserved: 0,
  };
  const decimal = "21267647932558653967613957625668960256";

  it("re-exports encode / decode / parse for v2", () => {
    const id = encode(fields);
    expect(toDecimalString(id)).toBe(decimal);
    expect(decode(id)).toEqual(fields);
    expect(parse(id)).toEqual(fields);
    expect(parse(decimal)).toEqual(fields);
    expect(fromDecimalString(decimal)).toBe(id);
  });

  it("re-exports field getters", () => {
    const id = encode(fields);
    expect(getTimestamp(id)).toBe(0n);
    expect(getType(decimal)).toBe(1);
    expect(getNode(id)).toBe(7);
    expect(getSequence(decimal)).toBe(42);
  });

  it("re-exports isValid and OrbitError for reject paths", () => {
    expect(isValid(decimal)).toBe(true);
    expect(isValid("01")).toBe(false);
    try {
      fromDecimalString("01");
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(OrbitError);
      expect((e as OrbitError).code).toBe("INVALID_DECIMAL");
    }
  });

  it("can generate via OrbitGeneratorV2", () => {
    const id = new OrbitGeneratorV2({
      node: 7,
      clock: { currentOrbitTimestampMs: () => 0n },
    }).generate(1);
    expect(getNode(id)).toBe(7);
  });
});

describe("@orbit-id/typescript v1 namespace", () => {
  it("keeps 64-bit encode/decode", () => {
    const fields = { timestamp: 0n, type: 1, node: 7, sequence: 42 };
    const id = v1.encode(fields);
    expect(v1.toDecimalString(id)).toBe("138282");
    expect(v1.decode(id)).toEqual(fields);
  });
});

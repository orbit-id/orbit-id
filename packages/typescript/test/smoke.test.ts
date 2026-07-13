import { describe, expect, it } from "vitest";
import {
  OrbitError,
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
} from "../src/index.js";

describe("@orbit-id/typescript decode surface", () => {
  const fields = { timestamp: 0n, type: 1, node: 7, sequence: 42 };
  const id = encode(fields);
  const decimal = "138282";

  it("re-exports encode / decode / parse", () => {
    expect(toDecimalString(id)).toBe(decimal);
    expect(decode(id)).toEqual(fields);
    expect(parse(id)).toEqual(fields);
    expect(parse(decimal)).toEqual(fields);
    expect(fromDecimalString(decimal)).toBe(id);
  });

  it("re-exports field getters", () => {
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
});

import { describe, expect, it } from "vitest";
import { v2 as v2FromRoot } from "../src/index.js";
import * as v2 from "../src/v2/index.js";

describe("@orbit-id/typescript v2 surface", () => {
  // encode-decode.v2.json → epoch
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

  it("re-exports encode / decode / parse via ./v2", () => {
    const id = v2.encode(fields);
    expect(v2.toDecimalString(id)).toBe(decimal);
    expect(v2.decode(id)).toEqual(fields);
    expect(v2.parse(decimal)).toEqual(fields);
    expect(v2.fromDecimalString(decimal)).toBe(id);
    expect(v2.getFormatVersion(id)).toBe(1);
    expect(v2.getReserved(id)).toBe(0);
    expect(v2.getRegion(id)).toBe(0);
    expect(v2.getTenant(id)).toBe(0);
    expect(v2.isValid(decimal)).toBe(true);
  });

  it("exposes the same namespace from the package root", () => {
    expect(v2FromRoot.encode(fields)).toBe(v2.encode(fields));
    expect(v2FromRoot.OrbitGeneratorV2).toBe(v2.OrbitGeneratorV2);
  });

  it("can generate a v2 ID", () => {
    const id = new v2.OrbitGeneratorV2({
      node: 7,
      clock: { currentOrbitTimestampMs: () => 0n },
    }).generate(1);
    expect(v2.getFormatVersion(id)).toBe(1);
    expect(v2.getNode(id)).toBe(7);
    expect(v2.getType(id)).toBe(1);
    expect(v2.getTimestamp(id)).toBe(0n);
  });
});

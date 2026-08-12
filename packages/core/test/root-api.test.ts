import { describe, expect, it } from "vitest";
import * as root from "../src/index.js";
import * as v1 from "../src/v1/index.js";
import * as v2 from "../src/v2/index.js";

describe("package root is v2 with v1/v2 namespaces", () => {
  it("root MAX_NODE matches v2", () => {
    expect(root.MAX_NODE).toBe(v2.MAX_NODE);
    expect(root.MAX_NODE).toBe(65535);
  });

  it("v1 namespace keeps 64-bit MAX_NODE", () => {
    expect(v1.MAX_NODE).toBe(127);
    expect(root.v1.MAX_NODE).toBe(127);
  });

  it("root v2 namespace matches @orbit-id/core/v2 entry", () => {
    expect(root.v2.MAX_NODE).toBe(v2.MAX_NODE);
    expect(root.OrbitGeneratorV2).toBe(v2.OrbitGeneratorV2);
  });

  it("root encode/parse round-trip a v2 id", () => {
    const id = root.encode({
      formatVersion: 1,
      timestamp: 0n,
      type: 1,
      node: 7,
      sequence: 42,
      region: 0,
      tenant: 0,
      reserved: 0,
    });
    expect(root.parse(id)).toEqual({
      formatVersion: 1,
      timestamp: 0n,
      type: 1,
      node: 7,
      sequence: 42,
      region: 0,
      tenant: 0,
      reserved: 0,
    });
  });
});

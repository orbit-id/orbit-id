import { OrbitGenerator } from "@orbit-id/core";
import { describe, expect, it } from "vitest";
import { MemoryLeaseStore, NodeLeaseClient } from "../src/index.js";

describe("MemoryLeaseStore + NodeLeaseClient", () => {
  it("acquires exclusive node ids", async () => {
    const store = new MemoryLeaseStore(3);
    const a = new NodeLeaseClient({
      store,
      maxNode: 3,
      ttlMs: 5_000,
      quarantineMs: 1_000,
      createOwnerToken: () => "a",
    });
    const b = new NodeLeaseClient({
      store,
      maxNode: 3,
      ttlMs: 5_000,
      quarantineMs: 1_000,
      createOwnerToken: () => "b",
    });
    const ha = await a.acquire();
    const hb = await b.acquire();
    expect(ha.nodeId).not.toBe(hb.nodeId);
    expect(a.confirmOwnership()).toBe(true);
  });

  it("quarantines after release", async () => {
    let now = 1_000;
    const store = new MemoryLeaseStore(0);
    const client = new NodeLeaseClient({
      store,
      maxNode: 0,
      ttlMs: 5_000,
      quarantineMs: 2_000,
      now: () => now,
      createOwnerToken: () => "tok",
    });
    await client.acquire();
    await client.release();
    const again = new NodeLeaseClient({
      store,
      maxNode: 0,
      ttlMs: 5_000,
      quarantineMs: 2_000,
      now: () => now,
      createOwnerToken: () => "tok2",
    });
    await expect(again.acquire()).rejects.toThrow(/UNAVAILABLE/);
    now += 2_001;
    const held = await again.acquire();
    expect(held.nodeId).toBe(0);
  });

  it("wires confirmOwnership into OrbitGenerator fail-closed", async () => {
    const store = new MemoryLeaseStore(1);
    const lease = new NodeLeaseClient({
      store,
      maxNode: 1,
      ttlMs: 5_000,
      createOwnerToken: () => "gen",
    });
    const held = await lease.acquire();
    const generator = new OrbitGenerator({
      node: held.nodeId,
      confirmOwnership: () => lease.confirmOwnership(),
    });
    expect(typeof generator.generate(1)).toBe("bigint");
    await lease.release();
    expect(() => generator.generate(1)).toThrow(/NODE_OWNERSHIP_LOST/);
  });
});

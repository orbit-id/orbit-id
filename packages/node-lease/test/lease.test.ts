import { OrbitGenerator } from "@orbit-id/core/v1";
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

  it("supports the v2 Node range without pre-allocating every slot", async () => {
    const maxNode = 65_535;
    const store = new MemoryLeaseStore(maxNode);
    const a = new NodeLeaseClient({
      store,
      maxNode,
      ttlMs: 5_000,
      quarantineMs: 1_000,
      createOwnerToken: () => "a",
    });
    const b = new NodeLeaseClient({
      store,
      maxNode,
      ttlMs: 5_000,
      quarantineMs: 1_000,
      createOwnerToken: () => "b",
    });
    const ha = await a.acquire();
    const hb = await b.acquire();
    expect(ha.nodeId).toBe(0);
    expect(hb.nodeId).toBe(1);
    expect(ha.nodeId).not.toBe(hb.nodeId);
  });

  it("keeps out-of-range free ids when maxNode shrinks then widens", async () => {
    let now = 1_000;
    const store = new MemoryLeaseStore(5);
    const wide = await store.tryAcquire({
      ownerToken: "a",
      ttlMs: 5_000,
      nowMs: now,
      maxNode: 5,
      quarantineMs: 10,
    });
    expect(wide?.nodeId).toBe(0);
    // Allocate and release a high id so it lands on the free list.
    const high = await store.tryAcquire({
      ownerToken: "b",
      ttlMs: 5_000,
      nowMs: now,
      maxNode: 5,
      quarantineMs: 10,
    });
    expect(high?.nodeId).toBe(1);
    await store.release({
      nodeId: high!.nodeId,
      ownerToken: "b",
      nowMs: now,
      quarantineMs: 10,
    });
    now += 11;
    // Shrink: only node 0 is in range and held; free list still has 1 deferred.
    await expect(
      store.tryAcquire({
        ownerToken: "c",
        ttlMs: 5_000,
        nowMs: now,
        maxNode: 0,
        quarantineMs: 10,
      }),
    ).resolves.toBeNull();
    // Widen again: deferred id 1 must still be reusable.
    const again = await store.tryAcquire({
      ownerToken: "c",
      ttlMs: 5_000,
      nowMs: now,
      maxNode: 5,
      quarantineMs: 10,
    });
    expect(again?.nodeId).toBe(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import { MemoryLeaseStore, NodeLeaseClient, RedisLeaseStore } from "../src/index.js";
import type { RedisLike } from "../src/redis.js";

describe("MemoryLeaseStore renew/get", () => {
  it("renews held leases and rejects wrong owners", async () => {
    const store = new MemoryLeaseStore(1);
    const held = await store.tryAcquire({
      ownerToken: "a",
      ttlMs: 5_000,
      nowMs: 1_000,
      maxNode: 1,
      quarantineMs: 1_000,
    });
    expect(held).not.toBeNull();
    expect(await store.get(held!.nodeId)).toEqual(held);
    expect(
      await store.renew({
        nodeId: held!.nodeId,
        ownerToken: "a",
        ttlMs: 5_000,
        nowMs: 1_500,
      }),
    ).toBe(true);
    expect(
      await store.renew({
        nodeId: held!.nodeId,
        ownerToken: "b",
        ttlMs: 5_000,
        nowMs: 1_600,
      }),
    ).toBe(false);
    expect(await store.get(999)).toBeNull();
  });
});

describe("NodeLeaseClient renew/auto-renew", () => {
  it("reuses held lease, renews, and clears on failed renew", async () => {
    let now = 1_000;
    const store = new MemoryLeaseStore(0);
    const client = new NodeLeaseClient({
      store,
      maxNode: 0,
      ttlMs: 5_000,
      quarantineMs: 1_000,
      now: () => now,
    });
    const first = await client.acquire();
    expect(client.getHeld()).toEqual(first);
    const again = await client.acquire();
    expect(again).toEqual(first);

    expect(await client.renew()).toBe(true);
    expect(client.getHeld()?.expiresAtMs).toBe(now + 5_000);

    client.startAutoRenew();
    client.stopAutoRenew();

    now = first.expiresAtMs + 1;
    expect(await client.renew()).toBe(false);
    expect(client.getHeld()).toBeNull();
    expect(await client.release()).toBe(false);
  });
});

describe("RedisLeaseStore", () => {
  it("covers acquire/renew/release/get through RedisLike mock", async () => {
    const evalMock = vi.fn();
    const hgetallMock = vi.fn();
    const redis: RedisLike = {
      eval: evalMock,
      hgetall: hgetallMock,
    };
    const store = new RedisLeaseStore(redis, "orbit:test:", 1_000);

    evalMock.mockResolvedValueOnce(["3", "tok", "1500"]);
    await expect(
      store.tryAcquire({
        ownerToken: "tok",
        ttlMs: 500,
        nowMs: 1_000,
        maxNode: 3,
        quarantineMs: 1_000,
      }),
    ).resolves.toEqual({ nodeId: 3, ownerToken: "tok", expiresAtMs: 1500 });

    evalMock.mockResolvedValueOnce(null);
    await expect(
      store.tryAcquire({
        ownerToken: "tok",
        ttlMs: 500,
        nowMs: 1_000,
        maxNode: 3,
        quarantineMs: 1_000,
      }),
    ).resolves.toBeNull();

    evalMock.mockResolvedValueOnce(1);
    await expect(
      store.renew({ nodeId: 3, ownerToken: "tok", ttlMs: 500, nowMs: 1_200 }),
    ).resolves.toBe(true);

    evalMock.mockResolvedValueOnce(0);
    await expect(
      store.release({ nodeId: 3, ownerToken: "tok", nowMs: 1_300, quarantineMs: 1_000 }),
    ).resolves.toBe(false);

    hgetallMock.mockResolvedValueOnce({ state: "held", owner: "tok", expires: "2000" });
    await expect(store.get(3)).resolves.toEqual({
      nodeId: 3,
      ownerToken: "tok",
      expiresAtMs: 2000,
    });
    hgetallMock.mockResolvedValueOnce({ state: "quarantine" });
    await expect(store.get(3)).resolves.toBeNull();
  });
});

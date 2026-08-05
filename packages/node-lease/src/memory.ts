import type { LeaseRecord, LeaseStore } from "./types.js";

type Slot =
  | { kind: "held"; record: LeaseRecord }
  | { kind: "quarantine"; untilMs: number };

/**
 * In-process store for tests and single-process demos. Not for multi-host production.
 *
 * Uses a free list + bump allocator so large `maxNode` (e.g. v2 `65535`) does not pre-allocate
 * every slot.
 */
export class MemoryLeaseStore implements LeaseStore {
  private readonly maxCapacity: number;
  private nextUnused = 0;
  private readonly free: number[] = [];
  private readonly slots = new Map<number, Slot>();

  constructor(maxNode = 127) {
    this.maxCapacity = maxNode;
  }

  async tryAcquire(params: {
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
    maxNode: number;
    quarantineMs: number;
  }): Promise<LeaseRecord | null> {
    this.reclaimExpired(params.nowMs, params.quarantineMs);
    const limit = Math.min(params.maxNode, this.maxCapacity);

    let nodeId = this.takeFree(limit);
    if (nodeId === null) {
      if (this.nextUnused <= limit) {
        nodeId = this.nextUnused;
        this.nextUnused += 1;
      } else {
        return null;
      }
    }

    const record: LeaseRecord = {
      nodeId,
      ownerToken: params.ownerToken,
      expiresAtMs: params.nowMs + params.ttlMs,
    };
    this.slots.set(nodeId, { kind: "held", record });
    return record;
  }

  async renew(params: {
    nodeId: number;
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
  }): Promise<boolean> {
    const slot = this.slots.get(params.nodeId);
    if (!slot || slot.kind !== "held") return false;
    if (slot.record.ownerToken !== params.ownerToken) return false;
    if (slot.record.expiresAtMs <= params.nowMs) return false;
    slot.record.expiresAtMs = params.nowMs + params.ttlMs;
    return true;
  }

  async release(params: {
    nodeId: number;
    ownerToken: string;
    nowMs: number;
    quarantineMs: number;
  }): Promise<boolean> {
    const slot = this.slots.get(params.nodeId);
    if (!slot || slot.kind !== "held") return false;
    if (slot.record.ownerToken !== params.ownerToken) return false;
    this.slots.set(params.nodeId, {
      kind: "quarantine",
      untilMs: params.nowMs + params.quarantineMs,
    });
    return true;
  }

  async get(nodeId: number): Promise<LeaseRecord | null> {
    const slot = this.slots.get(nodeId);
    if (!slot || slot.kind !== "held") return null;
    return { ...slot.record };
  }

  private takeFree(limit: number): number | null {
    const deferred: number[] = [];
    while (this.free.length > 0) {
      const nodeId = this.free.pop()!;
      if (nodeId > limit) {
        deferred.push(nodeId);
        continue;
      }
      const slot = this.slots.get(nodeId);
      if (slot) continue;
      this.free.push(...deferred);
      return nodeId;
    }
    this.free.push(...deferred);
    return null;
  }

  private reclaimExpired(nowMs: number, quarantineMs: number): void {
    for (const [nodeId, slot] of this.slots) {
      if (slot.kind === "held" && slot.record.expiresAtMs <= nowMs) {
        this.slots.set(nodeId, {
          kind: "quarantine",
          untilMs: nowMs + quarantineMs,
        });
      } else if (slot.kind === "quarantine" && slot.untilMs <= nowMs) {
        this.slots.delete(nodeId);
        this.free.push(nodeId);
      }
    }
  }
}

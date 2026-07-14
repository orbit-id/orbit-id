import type { LeaseRecord, LeaseStore } from "./types.js";

type Slot =
  | { kind: "free" }
  | { kind: "held"; record: LeaseRecord }
  | { kind: "quarantine"; untilMs: number };

/** In-process store for tests and single-process demos. Not for multi-host production. */
export class MemoryLeaseStore implements LeaseStore {
  private readonly slots: Slot[];

  constructor(maxNode = 127) {
    this.slots = Array.from({ length: maxNode + 1 }, () => ({ kind: "free" as const }));
  }

  async tryAcquire(params: {
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
    maxNode: number;
    quarantineMs: number;
  }): Promise<LeaseRecord | null> {
    this.reclaimExpired(params.nowMs, params.quarantineMs);
    const limit = Math.min(params.maxNode, this.slots.length - 1);
    for (let nodeId = 0; nodeId <= limit; nodeId += 1) {
      const slot = this.slots[nodeId]!;
      if (slot.kind === "quarantine" && slot.untilMs > params.nowMs) continue;
      if (slot.kind === "held") continue;
      const record: LeaseRecord = {
        nodeId,
        ownerToken: params.ownerToken,
        expiresAtMs: params.nowMs + params.ttlMs,
      };
      this.slots[nodeId] = { kind: "held", record };
      return record;
    }
    return null;
  }

  async renew(params: {
    nodeId: number;
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
  }): Promise<boolean> {
    const slot = this.slots[params.nodeId];
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
    const slot = this.slots[params.nodeId];
    if (!slot || slot.kind !== "held") return false;
    if (slot.record.ownerToken !== params.ownerToken) return false;
    this.slots[params.nodeId] = {
      kind: "quarantine",
      untilMs: params.nowMs + params.quarantineMs,
    };
    return true;
  }

  async get(nodeId: number): Promise<LeaseRecord | null> {
    const slot = this.slots[nodeId];
    if (!slot || slot.kind !== "held") return null;
    return { ...slot.record };
  }

  private reclaimExpired(nowMs: number, quarantineMs: number): void {
    for (let i = 0; i < this.slots.length; i += 1) {
      const slot = this.slots[i]!;
      if (slot.kind === "held" && slot.record.expiresAtMs <= nowMs) {
        this.slots[i] = { kind: "quarantine", untilMs: nowMs + quarantineMs };
      } else if (slot.kind === "quarantine" && slot.untilMs <= nowMs) {
        this.slots[i] = { kind: "free" };
      }
    }
  }
}

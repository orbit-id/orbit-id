import { randomUUID } from "node:crypto";
import { MAX_NODE } from "@orbit-id/core";
import type { HeldLease, LeaseStore, NodeLeaseOptions } from "./types.js";

const DEFAULT_TTL_MS = 30_000;
const DEFAULT_QUARANTINE_MS = 120_000;

/**
 * Optional control-plane client for Node ID leases.
 * Must not be called on the Orbit ID generation hot path.
 */
export class NodeLeaseClient {
  private readonly store: LeaseStore;
  private readonly ttlMs: number;
  private readonly quarantineMs: number;
  private readonly maxNode: number;
  private readonly now: () => number;
  private readonly createOwnerToken: () => string;
  private held: HeldLease | null = null;
  private renewTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: NodeLeaseOptions) {
    this.store = options.store;
    this.ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
    this.quarantineMs = options.quarantineMs ?? DEFAULT_QUARANTINE_MS;
    this.maxNode = options.maxNode ?? MAX_NODE;
    this.now = options.now ?? (() => Date.now());
    this.createOwnerToken = options.createOwnerToken ?? (() => randomUUID());
  }

  getHeld(): HeldLease | null {
    return this.held;
  }

  /** True when a lease is held and not past expiry (with a small safety margin). */
  confirmOwnership(safetyMarginMs = 1_000): boolean {
    if (!this.held) return false;
    return this.held.expiresAtMs - safetyMarginMs > this.now();
  }

  async acquire(): Promise<HeldLease> {
    if (this.held && this.confirmOwnership()) {
      return this.held;
    }
    const ownerToken = this.createOwnerToken();
    const record = await this.store.tryAcquire({
      ownerToken,
      ttlMs: this.ttlMs,
      nowMs: this.now(),
      maxNode: this.maxNode,
      quarantineMs: this.quarantineMs,
    });
    if (!record) {
      throw new Error("NODE_LEASE_UNAVAILABLE: no free Node ID");
    }
    this.held = record;
    return record;
  }

  async renew(): Promise<boolean> {
    if (!this.held) return false;
    const ok = await this.store.renew({
      nodeId: this.held.nodeId,
      ownerToken: this.held.ownerToken,
      ttlMs: this.ttlMs,
      nowMs: this.now(),
    });
    if (!ok) {
      this.held = null;
      this.stopAutoRenew();
      return false;
    }
    this.held = {
      ...this.held,
      expiresAtMs: this.now() + this.ttlMs,
    };
    return true;
  }

  async release(): Promise<boolean> {
    if (!this.held) return false;
    const { nodeId, ownerToken } = this.held;
    this.stopAutoRenew();
    const ok = await this.store.release({
      nodeId,
      ownerToken,
      nowMs: this.now(),
      quarantineMs: this.quarantineMs,
    });
    this.held = null;
    return ok;
  }

  /** Renew periodically at ttl/3. Caller should still fail closed on generate if ownership is lost. */
  startAutoRenew(): void {
    this.stopAutoRenew();
    const interval = Math.max(1_000, Math.floor(this.ttlMs / 3));
    this.renewTimer = setInterval(() => {
      void this.renew();
    }, interval);
    if (typeof this.renewTimer.unref === "function") {
      this.renewTimer.unref();
    }
  }

  stopAutoRenew(): void {
    if (this.renewTimer) {
      clearInterval(this.renewTimer);
      this.renewTimer = null;
    }
  }
}

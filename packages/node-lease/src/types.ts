export type LeaseRecord = {
  nodeId: number;
  ownerToken: string;
  expiresAtMs: number;
};

export type LeaseStore = {
  /** Atomically assign a free node in [0, maxNode], or return null if none. */
  tryAcquire(params: {
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
    maxNode: number;
    quarantineMs: number;
  }): Promise<LeaseRecord | null>;

  renew(params: {
    nodeId: number;
    ownerToken: string;
    ttlMs: number;
    nowMs: number;
  }): Promise<boolean>;

  release(params: {
    nodeId: number;
    ownerToken: string;
    nowMs: number;
    quarantineMs: number;
  }): Promise<boolean>;

  get(nodeId: number): Promise<LeaseRecord | null>;
};

export type NodeLeaseOptions = {
  store: LeaseStore;
  /** Lease TTL. Default 30_000 ms. */
  ttlMs?: number;
  /** Quarantine after release. Default 120_000 ms (Node Management). */
  quarantineMs?: number;
  /** Max inclusive Node ID. Default 127. */
  maxNode?: number;
  /** Clock for lease expiry. Default Date.now. */
  now?: () => number;
  /** Owner token factory. Default crypto random UUID. */
  createOwnerToken?: () => string;
};

export type HeldLease = {
  nodeId: number;
  ownerToken: string;
  expiresAtMs: number;
};

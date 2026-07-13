import {
  DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS,
  MAX_NODE,
  MAX_SEQUENCE,
  MAX_TIMESTAMP,
  MAX_TYPE,
  ORBIT_EPOCH_UNIX_MS,
} from "./constants.js";
import { OrbitError } from "./errors.js";
import { encode } from "./id.js";

export type OrbitClock = {
  /** Milliseconds since Orbit Epoch. */
  currentOrbitTimestampMs(): bigint;
};

export function systemOrbitClock(): OrbitClock {
  return {
    currentOrbitTimestampMs(): bigint {
      return BigInt(Date.now()) - ORBIT_EPOCH_UNIX_MS;
    },
  };
}

export type SequenceExhaustedMode = "wait" | "fail";

export type GeneratorOptions = {
  node: number;
  clock?: OrbitClock;
  clockRollbackToleranceMs?: bigint;
  onSequenceExhausted?: SequenceExhaustedMode;
  /** Optional ownership check; return false to fail closed. */
  confirmOwnership?: () => boolean;
};

export type GenerateDecision =
  | { action: "issue"; timestamp: bigint; sequence: number }
  | { action: "wait"; waitUntilTimestamp: bigint }
  | { action: "wait_next_ms"; fromTimestamp: bigint }
  | { action: "error"; error: "CLOCK_ROLLBACK" | "SEQUENCE_EXHAUSTED" | "NODE_OWNERSHIP_LOST" | "INVALID_TYPE" | "INVALID_TIMESTAMP" };

export class OrbitGenerator {
  readonly node: number;
  private readonly clock: OrbitClock;
  private readonly clockRollbackToleranceMs: bigint;
  private readonly onSequenceExhausted: SequenceExhaustedMode;
  private readonly confirmOwnership: (() => boolean) | undefined;
  private lastTimestamp = -1n;
  private sequence = 0;
  private locked = false;

  constructor(options: GeneratorOptions) {
    const { node } = options;
    if (!Number.isInteger(node) || node < 0 || node > MAX_NODE) {
      throw new OrbitError("INVALID_NODE", `node out of range: ${node}`);
    }
    this.node = node;
    this.clock = options.clock ?? systemOrbitClock();
    this.clockRollbackToleranceMs =
      options.clockRollbackToleranceMs ?? DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS;
    this.onSequenceExhausted = options.onSequenceExhausted ?? "wait";
    this.confirmOwnership = options.confirmOwnership;
  }

  getLastTimestamp(): bigint {
    return this.lastTimestamp < 0n ? 0n : this.lastTimestamp;
  }

  getSequence(): number {
    return this.sequence;
  }

  /** Seed prior state (tests / restart). */
  restoreState(lastTimestamp: bigint, sequence: number): void {
    if (lastTimestamp < 0n || lastTimestamp > MAX_TIMESTAMP) {
      throw new OrbitError("INVALID_TIMESTAMP", `timestamp out of range: ${lastTimestamp}`);
    }
    if (!Number.isInteger(sequence) || sequence < 0 || sequence > MAX_SEQUENCE) {
      throw new OrbitError("INVALID_SEQUENCE", `sequence out of range: ${sequence}`);
    }
    this.lastTimestamp = lastTimestamp;
    this.sequence = sequence;
  }

  decide(type: number, nowTimestamp?: bigint): GenerateDecision {
    if (this.confirmOwnership && !this.confirmOwnership()) {
      return { action: "error", error: "NODE_OWNERSHIP_LOST" };
    }
    if (!Number.isInteger(type) || type < 1 || type > MAX_TYPE) {
      return { action: "error", error: "INVALID_TYPE" };
    }

    const now = nowTimestamp ?? this.clock.currentOrbitTimestampMs();
    if (now < 0n || now > MAX_TIMESTAMP) {
      return { action: "error", error: "INVALID_TIMESTAMP" };
    }

    if (this.lastTimestamp < 0n) {
      return { action: "issue", timestamp: now, sequence: 0 };
    }

    if (now < this.lastTimestamp) {
      const delta = this.lastTimestamp - now;
      if (delta <= this.clockRollbackToleranceMs) {
        return { action: "wait", waitUntilTimestamp: this.lastTimestamp };
      }
      return { action: "error", error: "CLOCK_ROLLBACK" };
    }

    if (now === this.lastTimestamp) {
      if (this.sequence >= MAX_SEQUENCE) {
        if (this.onSequenceExhausted === "fail") {
          return { action: "error", error: "SEQUENCE_EXHAUSTED" };
        }
        return { action: "wait_next_ms", fromTimestamp: this.lastTimestamp };
      }
      return { action: "issue", timestamp: now, sequence: this.sequence + 1 };
    }

    return { action: "issue", timestamp: now, sequence: 0 };
  }

  generate(type: number): bigint {
    return this.withLock(() => this.generateUnlocked(type));
  }

  private generateUnlocked(type: number): bigint {
    for (;;) {
      const decision = this.decide(type);
      switch (decision.action) {
        case "issue": {
          const id = encode({
            timestamp: decision.timestamp,
            type,
            node: this.node,
            sequence: decision.sequence,
          });
          this.lastTimestamp = decision.timestamp;
          this.sequence = decision.sequence;
          return id;
        }
        case "wait": {
          this.waitUntil((t) => t >= decision.waitUntilTimestamp);
          continue;
        }
        case "wait_next_ms": {
          this.waitUntil((t) => t > decision.fromTimestamp);
          continue;
        }
        case "error":
          throw new OrbitError(decision.error, `generate failed: ${decision.error}`);
      }
    }
  }

  private waitUntil(predicate: (timestamp: bigint) => boolean): void {
    const wallStart = Date.now();
    while (!predicate(this.clock.currentOrbitTimestampMs())) {
      if (Date.now() - wallStart > 30_000) {
        throw new OrbitError("CLOCK_ROLLBACK", "timed out waiting for clock to advance");
      }
    }
  }

  private withLock<T>(fn: () => T): T {
    if (this.locked) {
      throw new OrbitError("INVALID_NODE", "re-entrant generate is not supported");
    }
    this.locked = true;
    try {
      return fn();
    } finally {
      this.locked = false;
    }
  }
}

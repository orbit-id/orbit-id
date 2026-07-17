import { describe, expect, it } from "vitest";
import {
  OrbitError,
  OrbitGenerator,
  encode,
  fromUnixTimeMs,
  isValid,
  systemOrbitClock,
  toUnixTimeMs,
} from "../src/index.js";

describe("generator coverage", () => {
  it("generate issues ids and exposes state getters", () => {
    let now = 1_000n;
    const generator = new OrbitGenerator({
      node: 7,
      clock: { currentOrbitTimestampMs: () => now },
    });
    expect(generator.getLastTimestamp()).toBe(0n);
    expect(generator.getSequence()).toBe(0);

    const id = generator.generate(1);
    expect(typeof id).toBe("bigint");
    expect(generator.getLastTimestamp()).toBe(1000n);
    expect(generator.getSequence()).toBe(0);

    now = 1000n;
    const next = generator.generate(1);
    expect(next).not.toBe(id);
    expect(generator.getSequence()).toBe(1);
  });

  it("waits for clock advance on sequence exhaustion", () => {
    let ticks = 0;
    const waiting = new OrbitGenerator({
      node: 7,
      onSequenceExhausted: "wait",
      clock: {
        currentOrbitTimestampMs: () => {
          ticks += 1;
          return ticks < 3 ? 1000n : 1001n;
        },
      },
    });
    waiting.restoreState(1000n, 1023);
    const id = waiting.generate(1);
    expect(typeof id).toBe("bigint");
    expect(waiting.getLastTimestamp()).toBe(1001n);
  });

  it("waits for rollback catch-up", () => {
    let ticks = 0;
    const generator = new OrbitGenerator({
      node: 3,
      clockRollbackToleranceMs: 5_000n,
      clock: {
        currentOrbitTimestampMs: () => {
          ticks += 1;
          return ticks < 3 ? 900n : 1000n;
        },
      },
    });
    generator.restoreState(1000n, 0);
    const id = generator.generate(2);
    expect(typeof id).toBe("bigint");
  });

  it("fails closed on ownership loss and invalid options", () => {
    const lost = new OrbitGenerator({
      node: 1,
      confirmOwnership: () => false,
      clock: { currentOrbitTimestampMs: () => 1n },
    });
    expect(() => lost.generate(1)).toThrow(OrbitError);

    expect(() => new OrbitGenerator({ node: 999 })).toThrow(/node out of range/);
    const generator = new OrbitGenerator({
      node: 1,
      clock: { currentOrbitTimestampMs: () => 1n },
    });
    expect(() => generator.restoreState(-1n, 0)).toThrow(/timestamp out of range/);
    expect(() => generator.restoreState(1n, 9999)).toThrow(/sequence out of range/);
  });

  it("uses systemOrbitClock", () => {
    const clock = systemOrbitClock();
    expect(clock.currentOrbitTimestampMs()).toBeGreaterThan(0n);
  });
});

describe("encode validation coverage", () => {
  it("rejects out-of-range fields", () => {
    expect(() =>
      encode({ timestamp: -1n, type: 1, node: 1, sequence: 0 }),
    ).toThrow(/timestamp out of range/);
    expect(() =>
      encode({ timestamp: 1n, type: 99, node: 1, sequence: 0 }),
    ).toThrow(/type out of range/);
    expect(() =>
      encode({ timestamp: 1n, type: 1, node: 999, sequence: 0 }),
    ).toThrow(/node out of range/);
    expect(() =>
      encode({ timestamp: 1n, type: 1, node: 1, sequence: 9999 }),
    ).toThrow(/sequence out of range/);
  });

  it("covers unix time helpers and isValid negatives", () => {
    expect(toUnixTimeMs(0n)).toBeGreaterThan(0n);
    expect(fromUnixTimeMs(toUnixTimeMs(123n))).toBe(123n);
    expect(isValid(true)).toBe(false);
    expect(isValid(1)).toBe(false);
  });
});

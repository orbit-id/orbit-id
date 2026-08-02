import { describe, expect, it } from "vitest";
import { OrbitError } from "../src/errors.js";
import * as v2 from "../src/v2/index.js";

describe("v2 generator coverage", () => {
  it("generate issues IDs and exposes state getters", () => {
    let now = 1_000n;
    const generator = new v2.OrbitGeneratorV2({
      node: 7,
      clock: { currentOrbitTimestampMs: () => now },
    });
    expect(generator.getLastTimestamp()).toBe(0n);
    expect(generator.getSequence()).toBe(0);

    const id = generator.generate(1);
    expect(typeof id).toBe("bigint");
    expect(generator.getLastTimestamp()).toBe(1000n);
    expect(generator.getSequence()).toBe(0);
    expect(v2.getFormatVersion(id)).toBe(1);
    expect(v2.getReserved(id)).toBe(0);

    now = 1000n;
    const next = generator.generate(1);
    expect(next).not.toBe(id);
    expect(generator.getSequence()).toBe(1);
  });

  it("waits for clock advance on sequence exhaustion", () => {
    let ticks = 0;
    const waiting = new v2.OrbitGeneratorV2({
      node: 7,
      onSequenceExhausted: "wait",
      clock: {
        currentOrbitTimestampMs: () => {
          ticks += 1;
          return ticks < 3 ? 1000n : 1001n;
        },
      },
    });
    waiting.restoreState(1000n, 65535);
    const id = waiting.generate(1);
    expect(typeof id).toBe("bigint");
    expect(waiting.getLastTimestamp()).toBe(1001n);
  });

  it("waits for rollback catch-up", () => {
    let ticks = 0;
    const generator = new v2.OrbitGeneratorV2({
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
    const lost = new v2.OrbitGeneratorV2({
      node: 1,
      confirmOwnership: () => false,
      clock: { currentOrbitTimestampMs: () => 1n },
    });
    expect(() => lost.generate(1)).toThrow(OrbitError);

    expect(() => new v2.OrbitGeneratorV2({ node: 99999 })).toThrow(/node out of range/);
    const generator = new v2.OrbitGeneratorV2({
      node: 1,
      clock: { currentOrbitTimestampMs: () => 1n },
    });
    expect(() => generator.restoreState(-1n, 0)).toThrow(/timestamp out of range/);
    expect(() => generator.restoreState(1n, 99999)).toThrow(/sequence out of range/);
    expect(generator.decide(0, 1n)).toEqual({ action: "error", error: "INVALID_TYPE" });
    expect(generator.decide(1, -1n)).toEqual({ action: "error", error: "INVALID_TIMESTAMP" });
  });

  it("uses systemOrbitClock", () => {
    const clock = v2.systemOrbitClock();
    expect(clock.currentOrbitTimestampMs()).toBeGreaterThan(0n);
  });
});

describe("v2 encode/decode coverage", () => {
  it("rejects out-of-range fields and bad format/reserved", () => {
    expect(() =>
      v2.encode({
        formatVersion: 2,
        timestamp: 1n,
        type: 1,
        node: 1,
        sequence: 0,
        reserved: 0,
      }),
    ).toThrow(/formatVersion/);
    expect(() =>
      v2.encode({
        formatVersion: 1,
        timestamp: -1n,
        type: 1,
        node: 1,
        sequence: 0,
        reserved: 0,
      }),
    ).toThrow(/timestamp out of range/);
    expect(() =>
      v2.encode({
        formatVersion: 1,
        timestamp: 1n,
        type: 99_999,
        node: 1,
        sequence: 0,
        reserved: 0,
      }),
    ).toThrow(/type out of range/);
    expect(() =>
      v2.encode({
        formatVersion: 1,
        timestamp: 1n,
        type: 1,
        node: 99_999,
        sequence: 0,
        reserved: 0,
      }),
    ).toThrow(/node out of range/);
    expect(() =>
      v2.encode({
        formatVersion: 1,
        timestamp: 1n,
        type: 1,
        node: 1,
        sequence: 99_999,
        reserved: 0,
      }),
    ).toThrow(/sequence out of range/);
    expect(() =>
      v2.encode({
        formatVersion: 1,
        timestamp: 1n,
        type: 1,
        node: 1,
        sequence: 0,
        reserved: 1,
      }),
    ).toThrow(/reserved must be 0/);
  });

  it("rejects unknown formatVersion and non-zero reserved on decode", () => {
    const withReserved = v2.encode({
      formatVersion: 1,
      timestamp: 0n,
      type: 1,
      node: 0,
      sequence: 0,
      reserved: 0,
    });
    // Force reserved bit without going through encode.
    const badReserved = withReserved | 1n;
    expect(() => v2.decode(badReserved)).toThrow(OrbitError);
    expect(() => v2.decode(0n)).toThrow(/formatVersion/);
    expect(v2.isValid(badReserved)).toBe(false);
  });

  it("covers unix helpers, hex range, and isValid negatives", () => {
    expect(v2.toUnixTimeMs(0n)).toBeGreaterThan(0n);
    expect(v2.fromUnixTimeMs(v2.toUnixTimeMs(123n))).toBe(123n);
    expect(v2.isValid(true)).toBe(false);
    expect(v2.isValid(1)).toBe(false);
    expect(() => v2.decode(-1n)).toThrow(/128-bit/);
    expect(() => v2.decode(v2.U128_MAX + 1n)).toThrow(/128-bit/);
    expect(() => v2.toDecimalString(-1n)).toThrow(/128-bit/);
    expect(() => v2.toDecimalString(v2.U128_MAX + 1n)).toThrow(/128-bit/);
    expect(() => v2.toHexString(-1n)).toThrow(/128-bit/);
    expect(() => v2.toHexString(v2.U128_MAX + 1n)).toThrow(/128-bit/);
    expect(() => v2.fromDecimalString(1 as unknown as string)).toThrow(/must be a string/);
    expect(() => v2.fromDecimalString("1a")).toThrow(/non-canonical/);
    expect(() => v2.fromDecimalString("340282366920938463463374607431768211456")).toThrow(
      /128-bit/,
    );
  });

  it("rejects re-entrant generate", () => {
    let entered = false;
    const reentrant = new v2.OrbitGeneratorV2({
      node: 3,
      clock: {
        currentOrbitTimestampMs: () => {
          if (!entered) {
            entered = true;
            expect(() => reentrant.generate(1)).toThrow(/re-entrant/);
          }
          return 1n;
        },
      },
    });
    expect(typeof reentrant.generate(1)).toBe("bigint");
  });

  it("times out when waiting for clock never advances", () => {
    const realNow = Date.now;
    let calls = 0;
    Date.now = () => {
      calls += 1;
      return calls === 1 ? 0 : 40_000;
    };
    try {
      const generator = new v2.OrbitGeneratorV2({
        node: 1,
        clockRollbackToleranceMs: 5_000n,
        clock: { currentOrbitTimestampMs: () => 0n },
      });
      generator.restoreState(1000n, 0);
      expect(() => generator.generate(1)).toThrow(/timed out/);
    } finally {
      Date.now = realNow;
    }
  });
});

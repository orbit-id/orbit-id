import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { OrbitError } from "../src/errors.js";
import * as v2 from "../src/v2/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const conformanceDir = join(root, "spec/conformance");

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(conformanceDir, name), "utf8")) as T;
}

type EncodeDecodeFixture = {
  cases: Array<{
    id: string;
    formatVersion: number;
    timestamp: string;
    type: number;
    node: number;
    sequence: number;
    reserved: number;
    idDecimal: string;
    idHex: string;
  }>;
};

type RejectFixture = {
  cases: Array<{ id: string; input: string; reason: string }>;
};

type GeneratorFixture = {
  defaults: { clockRollbackToleranceMs: string };
  cases: Array<{
    id: string;
    prior: { lastTimestamp: string; sequence: number };
    nowTimestamp: string;
    type: number;
    node: number;
    expect: {
      action: string;
      timestamp?: string;
      sequence?: number;
      waitUntilTimestamp?: string;
      allowedActions?: string[];
      error?: string;
    };
  }>;
};

describe("v2 conformance encode-decode", () => {
  const fixture = loadJson<EncodeDecodeFixture>("encode-decode.v2.json");

  for (const c of fixture.cases) {
    it(c.id, () => {
      const fields = {
        formatVersion: c.formatVersion,
        timestamp: BigInt(c.timestamp),
        type: c.type,
        node: c.node,
        sequence: c.sequence,
        reserved: c.reserved,
      };
      const id = v2.encode(fields);
      expect(v2.toDecimalString(id)).toBe(c.idDecimal);
      expect(v2.toHexString(id)).toBe(c.idHex.toLowerCase());
      expect(v2.decode(id)).toEqual(fields);
      expect(v2.parse(c.idDecimal)).toEqual(fields);
      expect(v2.parse(id)).toEqual(fields);
      expect(v2.fromDecimalString(c.idDecimal)).toBe(id);
      expect(v2.getFormatVersion(id)).toBe(fields.formatVersion);
      expect(v2.getTimestamp(c.idDecimal)).toBe(fields.timestamp);
      expect(v2.getType(id)).toBe(fields.type);
      expect(v2.getNode(c.idDecimal)).toBe(fields.node);
      expect(v2.getSequence(id)).toBe(fields.sequence);
      expect(v2.getReserved(id)).toBe(fields.reserved);
      expect(v2.isValid(c.idDecimal)).toBe(true);
      expect(v2.isValid(id)).toBe(true);
    });
  }
});

describe("v2 conformance decode-reject", () => {
  const fixture = loadJson<RejectFixture>("decode-reject.v2.json");

  for (const c of fixture.cases) {
    it(c.id, () => {
      expect(() => v2.fromDecimalString(c.input)).toThrow(OrbitError);
      try {
        v2.fromDecimalString(c.input);
      } catch (e) {
        expect(e).toBeInstanceOf(OrbitError);
        expect((e as OrbitError).code).toBe("INVALID_DECIMAL");
      }
      expect(() => v2.parse(c.input)).toThrow(OrbitError);
      expect(v2.isValid(c.input)).toBe(false);
    });
  }

  it("accepts canonical zero as decimal but rejects as v2 id (formatVersion 0)", () => {
    expect(v2.fromDecimalString("0")).toBe(0n);
    expect(v2.isValid("0")).toBe(false);
    expect(() => v2.decode(0n)).toThrow(OrbitError);
  });
});

describe("v2 conformance generator", () => {
  const fixture = loadJson<GeneratorFixture>("generator.v2.json");
  const tolerance = BigInt(fixture.defaults.clockRollbackToleranceMs);

  for (const c of fixture.cases) {
    it(c.id, () => {
      const generator = new v2.OrbitGeneratorV2({
        node: c.node,
        clockRollbackToleranceMs: tolerance,
        onSequenceExhausted: "fail",
        clock: {
          currentOrbitTimestampMs: () => BigInt(c.nowTimestamp),
        },
      });
      generator.restoreState(BigInt(c.prior.lastTimestamp), c.prior.sequence);

      const decision = generator.decide(c.type, BigInt(c.nowTimestamp));
      const expected = c.expect;

      if (expected.action === "issue") {
        expect(decision).toEqual({
          action: "issue",
          timestamp: BigInt(expected.timestamp!),
          sequence: expected.sequence,
        });
        return;
      }

      if (expected.action === "wait") {
        expect(decision).toEqual({
          action: "wait",
          waitUntilTimestamp: BigInt(expected.waitUntilTimestamp!),
        });
        return;
      }

      if (expected.action === "wait_or_fail") {
        const allowed = new Set(expected.allowedActions ?? []);
        if (decision.action === "error") {
          expect(allowed.has("error")).toBe(true);
          expect(decision.error).toBe(expected.error);
        } else if (decision.action === "wait_next_ms") {
          expect(allowed.has("wait_next_ms")).toBe(true);
        } else {
          throw new Error(`unexpected decision: ${JSON.stringify(decision)}`);
        }
        return;
      }

      if (expected.action === "error") {
        expect(decision).toEqual({
          action: "error",
          error: expected.error,
        });
      }
    });
  }

  it("wait_or_fail can choose wait_next_ms", () => {
    const generator = new v2.OrbitGeneratorV2({
      node: 7,
      onSequenceExhausted: "wait",
      clock: { currentOrbitTimestampMs: () => 1000n },
    });
    generator.restoreState(1000n, 65535);
    expect(generator.decide(1, 1000n)).toEqual({
      action: "wait_next_ms",
      fromTimestamp: 1000n,
    });
  });
});

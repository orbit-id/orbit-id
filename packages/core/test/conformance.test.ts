import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OrbitError,
  OrbitGenerator,
  decode,
  encode,
  fromDecimalString,
  getNode,
  getSequence,
  getTimestamp,
  getType,
  isValid,
  parse,
  toDecimalString,
  toHexString,
} from "../src/index.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const conformanceDir = join(root, "spec/conformance");

function loadJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(conformanceDir, name), "utf8")) as T;
}

type EncodeDecodeFixture = {
  cases: Array<{
    id: string;
    timestamp: string;
    type: number;
    node: number;
    sequence: number;
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

describe("conformance encode-decode", () => {
  const fixture = loadJson<EncodeDecodeFixture>("encode-decode.v1.json");

  for (const c of fixture.cases) {
    it(c.id, () => {
      const fields = {
        timestamp: BigInt(c.timestamp),
        type: c.type,
        node: c.node,
        sequence: c.sequence,
      };
      const id = encode(fields);
      expect(toDecimalString(id)).toBe(c.idDecimal);
      expect(toHexString(id)).toBe(c.idHex.toLowerCase());
      expect(decode(id)).toEqual(fields);
      expect(parse(c.idDecimal)).toEqual(fields);
      expect(parse(id)).toEqual(fields);
      expect(fromDecimalString(c.idDecimal)).toBe(id);
      expect(getTimestamp(c.idDecimal)).toBe(fields.timestamp);
      expect(getType(id)).toBe(fields.type);
      expect(getNode(c.idDecimal)).toBe(fields.node);
      expect(getSequence(id)).toBe(fields.sequence);
      expect(isValid(c.idDecimal)).toBe(true);
      expect(isValid(id)).toBe(true);
    });
  }
});

describe("conformance decode-reject", () => {
  const fixture = loadJson<RejectFixture>("decode-reject.v1.json");

  for (const c of fixture.cases) {
    it(c.id, () => {
      expect(() => fromDecimalString(c.input)).toThrow(OrbitError);
      try {
        fromDecimalString(c.input);
      } catch (e) {
        expect(e).toBeInstanceOf(OrbitError);
        expect((e as OrbitError).code).toBe("INVALID_DECIMAL");
      }
      expect(() => parse(c.input)).toThrow(OrbitError);
      expect(isValid(c.input)).toBe(false);
    });
  }

  it("accepts canonical zero", () => {
    expect(fromDecimalString("0")).toBe(0n);
    expect(isValid("0")).toBe(true);
  });
});

describe("conformance generator", () => {
  const fixture = loadJson<GeneratorFixture>("generator.v1.json");
  const tolerance = BigInt(fixture.defaults.clockRollbackToleranceMs);

  for (const c of fixture.cases) {
    it(c.id, () => {
      const generator = new OrbitGenerator({
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
    const generator = new OrbitGenerator({
      node: 7,
      onSequenceExhausted: "wait",
      clock: { currentOrbitTimestampMs: () => 1000n },
    });
    generator.restoreState(1000n, 1023);
    expect(generator.decide(1, 1000n)).toEqual({
      action: "wait_next_ms",
      fromTimestamp: 1000n,
    });
  });
});

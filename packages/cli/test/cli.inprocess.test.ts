import { afterEach, describe, expect, it, vi } from "vitest";
import { run } from "../src/cli.js";

function captureRun(argv: string[], env: Record<string, string | undefined> = {}): {
  code: number | undefined;
  stdout: string;
  stderr: string;
} {
  const stdout: string[] = [];
  const stderr: string[] = [];
  let code: number | undefined;
  const stdoutSpy = vi.spyOn(process.stdout, "write").mockImplementation(((chunk: unknown) => {
    stdout.push(String(chunk));
    return true;
  }) as typeof process.stdout.write);
  const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: unknown) => {
    stderr.push(String(chunk));
    return true;
  }) as typeof process.stderr.write);
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(((status?: number) => {
    code = status ?? 0;
    throw new Error(`exit:${code}`);
  }) as never);

  const previous: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    previous[key] = process.env[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run(argv);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("exit:")) {
      throw error;
    }
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    exitSpy.mockRestore();
  }

  return { code, stdout: stdout.join(""), stderr: stderr.join("") };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("orbit-id cli in-process", () => {
  it("parses a known v1 decimal id", () => {
    const result = captureRun(["parse", "--spec", "v1", "140612821619842090"]);
    expect(result.code).toBeUndefined();
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({
      id: "140612821619842090",
      timestamp: "16762354567",
      type: 2,
      node: 7,
      sequence: 42,
    });
  });

  it("rejects invalid parse input", () => {
    const result = captureRun(["parse", "01"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("INVALID_DECIMAL");
  });

  it("requires parse id", () => {
    const result = captureRun(["parse"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("parse requires");
  });

  it("generates with --type and --node", () => {
    const result = captureRun(["generate", "--type", "1", "--node", "7"]);
    expect(result.code).toBeUndefined();
    expect(result.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("generates with ORBIT_NODE_ID", () => {
    const result = captureRun(["generate", "--type", "2"], { ORBIT_NODE_ID: "3" });
    expect(result.code).toBeUndefined();
    expect(result.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("requires node for generate", () => {
    const result = captureRun(["generate", "--type", "1"], { ORBIT_NODE_ID: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("ORBIT_NODE_ID");
  });

  it("rejects invalid type and node flags", () => {
    expect(captureRun(["generate", "--type", "abc", "--node", "1"]).stderr).toContain("Invalid --type");
    expect(captureRun(["generate", "--spec", "v1", "--type", "99", "--node", "1"]).stderr).toContain("must be an integer");
    expect(captureRun(["generate", "--spec", "v1", "--type", "1", "--node", "999"]).stderr).toContain("0..127");
    expect(captureRun(["generate", "--type", "1", "--node", "99999"]).stderr).toContain("0..65535");
    expect(captureRun(["generate", "--type", "1", "--node", "x"]).stderr).toContain("Invalid node");
  });

  it("prints usage for help and missing command", () => {
    const help = captureRun(["parse", "--help"]);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain("Usage:");

    const missing = captureRun([]);
    expect(missing.code).toBe(1);
    expect(missing.stderr).toContain("Usage:");
  });

  it("rejects unknown commands and boolean flags", () => {
    const unknown = captureRun(["nope"]);
    expect(unknown.code).toBe(1);
    expect(unknown.stderr).toContain("Unknown command");

    const boolFlag = captureRun(["generate", "--type", "1", "--node", "1", "--verbose"]);
    expect(boolFlag.code).toBeUndefined();
  });

  it("parses a known v2 decimal id by default", () => {
    const result = captureRun([
      "parse",
      "21267647932558653967613957625668960256",
    ]);
    expect(result.code).toBeUndefined();
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({
      spec: "v2",
      formatVersion: 1,
      type: 1,
      node: 7,
      sequence: 42,
      region: 0,
      tenant: 0,
      reserved: 0,
    });
  });

  it("generates with wider v2 ranges by default", () => {
    const result = captureRun(["generate", "--type", "100", "--node", "200"]);
    expect(result.code).toBeUndefined();
    expect(result.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{22}$/);
  });

  it("generates v2 with region and tenant flags", () => {
    const result = captureRun([
      "generate",
      "--type",
      "1",
      "--node",
      "7",
      "--region",
      "3",
      "--tenant",
      "1000",
    ]);
    expect(result.code).toBeUndefined();
    const parsed = captureRun(["parse", result.stdout.trim()]);
    expect(parsed.code).toBeUndefined();
    const body = JSON.parse(parsed.stdout);
    expect(body.region).toBe(3);
    expect(body.tenant).toBe(1000);
  });

  it("rejects --region/--tenant with --spec v1", () => {
    const region = captureRun(["generate", "--spec", "v1", "--type", "1", "--node", "1", "--region", "3"]);
    expect(region.code).toBe(1);
    expect(region.stderr).toContain("--region is not supported with --spec v1");
    const tenant = captureRun(["generate", "--spec", "v1", "--type", "1", "--node", "1", "--tenant", "1000"]);
    expect(tenant.code).toBe(1);
    expect(tenant.stderr).toContain("--tenant is not supported with --spec v1");
  });

  it("covers --v2 alias and optional flag validation", () => {
    const alias = captureRun(["generate", "--v2", "--type", "1", "--node", "7"]);
    expect(alias.code).toBeUndefined();
    expect(alias.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{22}$/);

    expect(captureRun(["parse", "--spec"]).stderr).toContain("--spec requires v1 or v2");
    expect(captureRun(["generate", "--type", "--node", "1"]).stderr).toContain("Missing --type");
    expect(captureRun(["generate", "--type", "1", "--node", "1", "--region"]).stderr).toContain(
      "--region requires an integer",
    );
    expect(captureRun(["generate", "--type", "1", "--node", "1", "--region", "abc"]).stderr).toContain(
      "Invalid --region",
    );
    expect(captureRun(["generate", "--type", "1", "--node", "1", "--region", "99"]).stderr).toContain(
      "0..15",
    );
    expect(captureRun(["generate", "--type", "1.", "--node", "1"]).stderr).toContain("Invalid --type");
    expect(captureRun(["generate", "--type", "1", "--node", "1", "--format"]).stderr).toContain(
      "--format requires",
    );
    expect(captureRun(["generate", "--type", "1", "--node", "1", "--format", "uuid"]).stderr).toContain(
      "Invalid --format",
    );
    const asInt = captureRun(["generate", "--type", "1", "--node", "1", "--format", "decimal"]);
    expect(asInt.code).toBeUndefined();
    expect(asInt.stdout.trim()).toMatch(/^\d+$/);
  });

  it("covers OrbitError on generate", async () => {
    const core = await import("@orbit-id/core");
    const orbitErr = vi
      .spyOn(core.OrbitGeneratorV2.prototype, "generate")
      .mockImplementation(() => {
        throw new core.OrbitError("INVALID_TYPE", "type out of range");
      });
    const zero = captureRun(["generate", "--type", "1", "--node", "1"]);
    expect(zero.code).toBe(1);
    expect(zero.stderr).toContain("INVALID_TYPE");
    orbitErr.mockRestore();
  });

  it("rethrows unexpected generate and parse errors", async () => {
    const core = await import("@orbit-id/core");
    const genSpy = vi.spyOn(core.OrbitGeneratorV2.prototype, "generate").mockImplementation(() => {
      throw new Error("boom-generate");
    });
    expect(() => captureRun(["generate", "--type", "1", "--node", "1"])).toThrow("boom-generate");
    genSpy.mockRestore();

    const parseSpy = vi.spyOn(core, "parse").mockImplementation(() => {
      throw new Error("boom-parse");
    });
    expect(() =>
      captureRun(["parse", "21267647932558653967613957625668960256"]),
    ).toThrow("boom-parse");
    parseSpy.mockRestore();
  });

  it("covers output formats including v1 hex/base64url", () => {
    const b64 = captureRun(["generate", "--type", "1", "--node", "1", "--format", "base64url"]);
    expect(b64.code).toBeUndefined();
    expect(b64.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{22}$/);

    const asInt = captureRun(["generate", "--type", "1", "--node", "1", "--format", "int"]);
    expect(asInt.code).toBeUndefined();
    expect(asInt.stdout.trim()).toMatch(/^\d+$/);

    const asHex = captureRun(["generate", "--type", "1", "--node", "1", "--format", "hex"]);
    expect(asHex.code).toBeUndefined();
    expect(asHex.stdout.trim()).toMatch(/^0x[0-9a-f]{32}$/);

    const v1Hex = captureRun([
      "generate",
      "--spec",
      "v1",
      "--type",
      "1",
      "--node",
      "1",
      "--format",
      "hex",
    ]);
    expect(v1Hex.code).toBeUndefined();
    expect(v1Hex.stdout.trim()).toMatch(/^0x[0-9a-f]{16}$/);

    const v1B64 = captureRun([
      "generate",
      "--spec",
      "v1",
      "--type",
      "1",
      "--node",
      "1",
      "--format",
      "base64url",
    ]);
    expect(v1B64.code).toBeUndefined();
    expect(v1B64.stdout.trim()).toMatch(/^[A-Za-z0-9_-]{11}$/);
  });

  it("parses v1 hex and rejects malformed base64url-shaped input", () => {
    const hex = captureRun([
      "parse",
      "--spec",
      "v1",
      "0x0000000000021c2a",
    ]);
    expect(hex.code).toBeUndefined();
    const body = JSON.parse(hex.stdout);
    expect(body.int).toBe("138282");
    expect(body.hex).toBe("0x0000000000021c2a");

    const badWidth = captureRun(["parse", "--spec", "v1", "0xabc"]);
    expect(badWidth.code).toBe(1);
    expect(badWidth.stderr).toContain("hex id must be");

    // Correct length but invalid alphabet → falls through to decimal and fails.
    const junk = captureRun(["parse", "!!!!!!!!!!!!!!!!!!!!!!"]);
    expect(junk.code).toBe(1);
    expect(junk.stderr).toContain("INVALID_DECIMAL");
  });

  it("rejects invalid --spec", () => {
    const result = captureRun(["parse", "--spec", "v3", "1"]);
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("Invalid --spec");
  });
});

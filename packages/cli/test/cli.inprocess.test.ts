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
  it("parses a known decimal id", () => {
    const result = captureRun(["parse", "140612821619842090"]);
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
    expect(result.stdout.trim()).toMatch(/^\d+$/);
  });

  it("generates with ORBIT_NODE_ID", () => {
    const result = captureRun(["generate", "--type", "2"], { ORBIT_NODE_ID: "3" });
    expect(result.code).toBeUndefined();
    expect(result.stdout.trim()).toMatch(/^\d+$/);
  });

  it("requires node for generate", () => {
    const result = captureRun(["generate", "--type", "1"], { ORBIT_NODE_ID: undefined });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain("ORBIT_NODE_ID");
  });

  it("rejects invalid type and node flags", () => {
    expect(captureRun(["generate", "--type", "abc", "--node", "1"]).stderr).toContain("Invalid --type");
    expect(captureRun(["generate", "--type", "99", "--node", "1"]).stderr).toContain("must be an integer");
    expect(captureRun(["generate", "--type", "1", "--node", "999"]).stderr).toContain("0..127");
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
});

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { run } from "../src/cli.js";

const root = dirname(fileURLToPath(import.meta.url));
const bin = join(root, "../bin/orbit-id.js");

function runBin(args: string[], env: NodeJS.ProcessEnv = {}): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(process.execPath, [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
  return {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
  };
}

describe("orbit-id cli", () => {
  it("parses a known decimal id", () => {
    const result = runBin(["parse", "140612821619842090"]);
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({
      id: "140612821619842090",
      timestamp: "16762354567",
      type: 2,
      node: 7,
      sequence: 42,
    });
    expect(body.time).toBe("2026-07-14T00:12:34.567Z");
  });

  it("rejects non-canonical decimal on parse", () => {
    const result = runBin(["parse", "01"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("INVALID_DECIMAL");
  });

  it("generates a decimal id with --type and --node", () => {
    const result = runBin(["generate", "--type", "1", "--node", "7"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^\d+$/);
  });

  it("generates using ORBIT_NODE_ID", () => {
    const result = runBin(["generate", "--type", "2"], { ORBIT_NODE_ID: "3" });
    expect(result.status).toBe(0);
    const id = result.stdout.trim();
    const parsed = runBin(["parse", id]);
    expect(parsed.status).toBe(0);
    expect(JSON.parse(parsed.stdout).node).toBe(3);
    expect(JSON.parse(parsed.stdout).type).toBe(2);
  });

  it("requires node for generate", () => {
    const { ORBIT_NODE_ID: _removed, ...env } = process.env;
    const result = spawnSync(process.execPath, [bin, "generate", "--type", "1"], {
      encoding: "utf8",
      env,
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("ORBIT_NODE_ID");
  });

  it("exports run for in-process use", () => {
    expect(typeof run).toBe("function");
  });
});

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
  it("parses a known v1 decimal id", () => {
    const result = runBin(["parse", "--spec", "v1", "140612821619842090"]);
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

  it("generates a base64url id by default", () => {
    const result = runBin(["generate", "--type", "1", "--node", "7"]);
    expect(result.status).toBe(0);
    expect(result.stdout.trim()).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(result.stdout.trim()).not.toMatch(/^\d+$/);
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

  it("parses a known v2 decimal id by default", () => {
    const result = runBin([
      "parse",
      "21267647932558653967613957625668960256",
    ]);
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body).toMatchObject({
      spec: "v2",
      id: "21267647932558653967613957625668960256",
      formatVersion: 1,
      timestamp: "0",
      type: 1,
      node: 7,
      sequence: 42,
      region: 0,
      tenant: 0,
      reserved: 0,
    });
    expect(body.time).toBe("2026-01-01T00:00:00.000Z");
    expect(body.int).toBe("21267647932558653967613957625668960256");
    expect(body.hex).toBe("0x100000000000000010007002a0000000");
    expect(body.base64url).toBe("EAAAAAAAAAAQAHACoAAAAA");
  });

  it("parses a known v2 base64url id", () => {
    const result = runBin(["parse", "EAAAAAAAAAAQAHACoAAAAA"]);
    expect(result.status).toBe(0);
    const body = JSON.parse(result.stdout);
    expect(body.int).toBe("21267647932558653967613957625668960256");
    expect(body.base64url).toBe("EAAAAAAAAAAQAHACoAAAAA");
  });

  it("generates a v2 base64url id by default", () => {
    const result = runBin(["generate", "--type", "1", "--node", "7"]);
    expect(result.status).toBe(0);
    const id = result.stdout.trim();
    expect(id).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const parsed = runBin(["parse", id]);
    expect(parsed.status).toBe(0);
    const body = JSON.parse(parsed.stdout);
    expect(body.formatVersion).toBe(1);
    expect(body.node).toBe(7);
    expect(body.type).toBe(1);
    expect(body.region).toBe(0);
    expect(body.tenant).toBe(0);
  });

  it("generates int and hex via --format", () => {
    const asInt = runBin(["generate", "--type", "1", "--node", "7", "--format", "int"]);
    expect(asInt.status).toBe(0);
    expect(asInt.stdout.trim()).toMatch(/^\d+$/);

    const asHex = runBin(["generate", "--type", "1", "--node", "7", "--format", "hex"]);
    expect(asHex.status).toBe(0);
    expect(asHex.stdout.trim()).toMatch(/^0x[0-9a-f]{32}$/);
  });

  it("parses hex ids and rejects wrong hex width", () => {
    const ok = runBin([
      "parse",
      "0x100000000000000010007002a0000000",
    ]);
    expect(ok.status).toBe(0);
    expect(JSON.parse(ok.stdout).base64url).toBe("EAAAAAAAAAAQAHACoAAAAA");

    const bad = runBin(["parse", "0xabc"]);
    expect(bad.status).not.toBe(0);
    expect(bad.stderr).toContain("hex id must be");
  });

  it("generates v2 with --region and --tenant", () => {
    const result = runBin([
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
    expect(result.status).toBe(0);
    const parsed = runBin(["parse", result.stdout.trim()]);
    expect(parsed.status).toBe(0);
    const body = JSON.parse(parsed.stdout);
    expect(body.region).toBe(3);
    expect(body.tenant).toBe(1000);
  });

  it("rejects v1 id without --spec v1", () => {
    const result = runBin(["parse", "140612821619842090"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("INVALID_FORMAT_VERSION");
  });
});

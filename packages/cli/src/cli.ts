import { pathToFileURL } from "node:url";
import {
  OrbitError,
  OrbitGenerator,
  parse,
  toDecimalString,
  toUnixTimeMs,
} from "@orbit-id/core";
import * as v2 from "@orbit-id/core/v2";

type SpecVersion = "v1" | "v2";

function printUsage(stream: NodeJS.WritableStream = process.stderr): void {
  stream.write(`Usage:
  orbit-id parse <id> [--spec v1|v2]
  orbit-id generate --type <n> [--node <n>] [--region <n>] [--tenant <n>] [--spec v1|v2]

Options:
  --spec v1|v2   Wire format (default: v1). Alias: --v2 for --spec v2
  --region <n>   v2 only (default: 0, range 0..15)
  --tenant <n>   v2 only (default: 0, range 0..65535)

Environment:
  ORBIT_NODE_ID   Default Node ID when --node is omitted (generate)

Ranges:
  v1  type 1..63, node 0..127
  v2  type 1..65535, node 0..65535, region 0..15, tenant 0..65535  (Draft; FormatVersion=1)

Examples:
  orbit-id parse 140612821619842090
  orbit-id parse --spec v2 21267647932558653967613957625668960256
  ORBIT_NODE_ID=7 orbit-id generate --type 1
  orbit-id generate --spec v2 --type 1 --node 7 --region 3 --tenant 1000
`);
}

function fail(message: string, code = 1): never {
  process.stderr.write(`${message}\n`);
  process.exit(code);
}

function parseArgs(argv: string[]): {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
} {
  const [command = "", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};

  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i]!;
    if (arg === "--help" || arg === "-h") {
      flags.help = true;
      continue;
    }
    if (arg === "--v2") {
      flags.spec = "v2";
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
      continue;
    }
    positional.push(arg);
  }

  return { command, positional, flags };
}

function resolveSpec(flags: Record<string, string | boolean>): SpecVersion {
  const raw = flags.spec;
  if (raw === undefined || raw === false) {
    return "v1";
  }
  if (raw === true) {
    fail("--spec requires v1 or v2");
  }
  if (raw !== "v1" && raw !== "v2") {
    fail(`Invalid --spec: ${raw} (expected v1 or v2)`);
  }
  return raw;
}

function requireIntFlag(
  flags: Record<string, string | boolean>,
  name: string,
  min: number,
  max: number,
): number {
  const raw = flags[name];
  if (typeof raw !== "string") {
    fail(`Missing --${name}`);
  }
  if (!/^-?\d+$/.test(raw)) {
    fail(`Invalid --${name}: ${raw}`);
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`--${name} must be an integer in ${min}..${max}`);
  }
  return value;
}

function optionalIntFlag(
  flags: Record<string, string | boolean>,
  name: string,
  min: number,
  max: number,
  defaultValue: number,
): number {
  const raw = flags[name];
  if (raw === undefined || raw === false) {
    return defaultValue;
  }
  if (typeof raw !== "string") {
    fail(`--${name} requires an integer`);
  }
  if (!/^-?\d+$/.test(raw)) {
    fail(`Invalid --${name}: ${raw}`);
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    fail(`--${name} must be an integer in ${min}..${max}`);
  }
  return value;
}

function resolveNode(
  flags: Record<string, string | boolean>,
  maxNode: number,
): number {
  const nodeRaw =
    typeof flags.node === "string" ? flags.node : process.env.ORBIT_NODE_ID;
  if (nodeRaw === undefined || nodeRaw === "") {
    fail(`generate requires --node <0-${maxNode}> or ORBIT_NODE_ID`);
  }
  if (!/^\d+$/.test(nodeRaw)) {
    fail(`Invalid node: ${nodeRaw}`);
  }
  const node = Number(nodeRaw);
  if (!Number.isInteger(node) || node < 0 || node > maxNode) {
    fail(`node must be an integer in 0..${maxNode}`);
  }
  return node;
}

function cmdParse(idArg: string | undefined, spec: SpecVersion): void {
  if (!idArg) {
    fail("parse requires <id> (unsigned decimal string)");
  }
  try {
    if (spec === "v2") {
      const fields = v2.parse(idArg);
      const unixMs = v2.toUnixTimeMs(fields.timestamp);
      const time = new Date(Number(unixMs)).toISOString();
      process.stdout.write(
        `${JSON.stringify(
          {
            spec: "v2",
            id: idArg,
            formatVersion: fields.formatVersion,
            timestamp: fields.timestamp.toString(10),
            time,
            type: fields.type,
            node: fields.node,
            sequence: fields.sequence,
            region: fields.region,
            tenant: fields.tenant,
            reserved: fields.reserved,
            hex: v2.toHexString(v2.fromDecimalString(idArg)),
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const fields = parse(idArg);
    const unixMs = toUnixTimeMs(fields.timestamp);
    const time = new Date(Number(unixMs)).toISOString();
    process.stdout.write(
      `${JSON.stringify(
        {
          id: idArg,
          timestamp: fields.timestamp.toString(10),
          time,
          type: fields.type,
          node: fields.node,
          sequence: fields.sequence,
        },
        null,
        2,
      )}\n`,
    );
  } catch (e) {
    if (e instanceof OrbitError) {
      fail(`${e.code}: ${e.message}`);
    }
    throw e;
  }
}

function cmdGenerate(flags: Record<string, string | boolean>, spec: SpecVersion): void {
  try {
    if (spec === "v2") {
      const type = requireIntFlag(flags, "type", 1, 65535);
      const node = resolveNode(flags, 65535);
      const region = optionalIntFlag(flags, "region", 0, 15, 0);
      const tenant = optionalIntFlag(flags, "tenant", 0, 65535, 0);
      const generator = new v2.OrbitGeneratorV2({ node, region, tenant });
      const id = generator.generate(type);
      process.stdout.write(`${v2.toDecimalString(id)}\n`);
      return;
    }

    const type = requireIntFlag(flags, "type", 1, 63);
    const node = resolveNode(flags, 127);
    const generator = new OrbitGenerator({ node });
    const id = generator.generate(type);
    process.stdout.write(`${toDecimalString(id)}\n`);
  } catch (e) {
    if (e instanceof OrbitError) {
      fail(`${e.code}: ${e.message}`);
    }
    throw e;
  }
}

export function run(argv: string[]): void {
  const { command, positional, flags } = parseArgs(argv);

  if (!command || flags.help) {
    printUsage(command && flags.help ? process.stdout : process.stderr);
    process.exit(command && flags.help ? 0 : 1);
  }

  const spec = resolveSpec(flags);

  switch (command) {
    case "parse":
      cmdParse(positional[0], spec);
      break;
    case "generate":
      cmdGenerate(flags, spec);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}

function isMainModule(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  try {
    return import.meta.url === pathToFileURL(entry).href;
  } catch {
    return false;
  }
}

if (isMainModule()) {
  run(process.argv.slice(2));
}

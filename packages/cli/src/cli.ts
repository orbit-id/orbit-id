import { pathToFileURL } from "node:url";
import {
  OrbitError,
  OrbitGenerator,
  parse,
  toDecimalString,
  toUnixTimeMs,
} from "@orbit-id/core";

function printUsage(stream: NodeJS.WritableStream = process.stderr): void {
  stream.write(`Usage:
  orbit-id parse <id>
  orbit-id generate --type <1-63> [--node <0-127>]

Environment:
  ORBIT_NODE_ID   Default Node ID when --node is omitted (generate)

Examples:
  orbit-id parse 140612821619842090
  ORBIT_NODE_ID=7 orbit-id generate --type 1
  orbit-id generate --type 2 --node 7
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

function cmdParse(idArg: string | undefined): void {
  if (!idArg) {
    fail("parse requires <id> (unsigned decimal string)");
  }
  try {
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

function cmdGenerate(flags: Record<string, string | boolean>): void {
  const type = requireIntFlag(flags, "type", 1, 63);
  const nodeRaw =
    typeof flags.node === "string" ? flags.node : process.env.ORBIT_NODE_ID;
  if (nodeRaw === undefined || nodeRaw === "") {
    fail("generate requires --node <0-127> or ORBIT_NODE_ID");
  }
  if (!/^\d+$/.test(nodeRaw)) {
    fail(`Invalid node: ${nodeRaw}`);
  }
  const node = Number(nodeRaw);
  if (!Number.isInteger(node) || node < 0 || node > 127) {
    fail("node must be an integer in 0..127");
  }

  try {
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

  switch (command) {
    case "parse":
      cmdParse(positional[0]);
      break;
    case "generate":
      cmdGenerate(flags);
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

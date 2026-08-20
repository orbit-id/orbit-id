import {
  OrbitError,
  OrbitGeneratorV2,
  fromBase64UrlString,
  fromDecimalString,
  parse,
  toBase64Url,
  toDecimalString,
  toHex,
  toUnixTimeMs,
} from "@orbit-id/core";
import * as v1 from "@orbit-id/core/v1";

type SpecVersion = "v1" | "v2";
type OutputFormat = "base64url" | "int" | "hex";

function printUsage(stream: NodeJS.WritableStream = process.stderr): void {
  stream.write(`Usage:
  orbit-id parse <id> [--spec v1|v2]
  orbit-id generate --type <n> [--node <n>] [--region <n>] [--tenant <n>] [--format base64url|int|hex] [--spec v1|v2]

Options:
  --spec v1|v2     Wire format (default: v2). Alias: --v2 for --spec v2
  --format <fmt>   generate output: base64url (default), int (decimal), or hex
  --region <n>     v2 only (default: 0, range 0..15)
  --tenant <n>     v2 only (default: 0, range 0..65535)

Environment:
  ORBIT_NODE_ID   Default Node ID when --node is omitted (generate)

Ranges:
  v2  type 1..65535, node 0..65535, region 0..15, tenant 0..65535  (FormatVersion=1)
  v1  type 1..63, node 0..127

Examples:
  orbit-id parse EAAAAAAAAAAQAHACoAAAAA
  orbit-id parse 21267647932558653967613957625668960256
  orbit-id parse --spec v1 140612821619842090
  ORBIT_NODE_ID=7 orbit-id generate --type 1
  orbit-id generate --type 1 --node 7 --format int
  orbit-id generate --spec v1 --type 1 --node 7
  orbit-id generate --type 1 --node 7 --region 3 --tenant 1000
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
    return "v2";
  }
  if (raw === true) {
    fail("--spec requires v1 or v2");
  }
  if (raw !== "v1" && raw !== "v2") {
    fail(`Invalid --spec: ${raw} (expected v1 or v2)`);
  }
  return raw;
}

function resolveFormat(flags: Record<string, string | boolean>): OutputFormat {
  const raw = flags.format;
  if (raw === undefined || raw === false) {
    return "base64url";
  }
  if (raw === true) {
    fail("--format requires base64url, int, or hex");
  }
  if (raw === "decimal") {
    return "int";
  }
  if (raw !== "base64url" && raw !== "int" && raw !== "hex") {
    fail(`Invalid --format: ${raw} (expected base64url, int, or hex)`);
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

/** `--region` / `--tenant` are v2-only; reject them on v1 instead of ignoring. */
function rejectV2OnlyGenerateFlags(
  flags: Record<string, string | boolean>,
  spec: SpecVersion,
): void {
  if (spec === "v2") {
    return;
  }
  for (const name of ["region", "tenant"] as const) {
    if (flags[name] !== undefined && flags[name] !== false) {
      fail(`--${name} is not supported with --spec v1`);
    }
  }
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

function formatId(id: bigint, format: OutputFormat, spec: SpecVersion): string {
  if (format === "int") {
    return spec === "v1" ? v1.toDecimalString(id) : toDecimalString(id);
  }
  if (format === "hex") {
    return spec === "v1" ? v1.toHex(id) : toHex(id);
  }
  return spec === "v1" ? v1.toBase64Url(id) : toBase64Url(id);
}

function looksLikeBase64Url(input: string, byteLength: 8 | 16): boolean {
  const expectedChars = Math.ceil((byteLength * 8) / 6);
  if (input.length !== expectedChars) {
    return false;
  }
  if (!/^[A-Za-z0-9_-]+$/.test(input)) {
    return false;
  }
  // Prefer decimal for digit-only strings of the same length.
  return /[A-Za-z_-]/.test(input);
}

function looksLikeHex(input: string): boolean {
  return /^0x[0-9a-fA-F]+$/i.test(input);
}

function parseIdInput(idArg: string, spec: SpecVersion): { id: bigint; display: string } {
  if (looksLikeHex(idArg)) {
    const hexBody = idArg.slice(2);
    const expected = spec === "v1" ? 16 : 32;
    if (hexBody.length !== expected) {
      fail(
        `INVALID_DECIMAL: hex id must be 0x + ${expected} hex digits for ${spec}`,
      );
    }
    const id = BigInt(`0x${hexBody}`);
    return { id, display: idArg.toLowerCase() };
  }
  if (looksLikeBase64Url(idArg, spec === "v1" ? 8 : 16)) {
    const id =
      spec === "v1" ? v1.fromBase64UrlString(idArg) : fromBase64UrlString(idArg);
    return { id, display: idArg };
  }
  const id = spec === "v1" ? v1.fromDecimalString(idArg) : fromDecimalString(idArg);
  return { id, display: idArg };
}

function cmdParse(idArg: string | undefined, spec: SpecVersion): void {
  if (!idArg) {
    fail("parse requires <id> (base64url, decimal, or 0x-hex)");
  }
  try {
    if (spec === "v1") {
      const { id, display } = parseIdInput(idArg, "v1");
      const fields = v1.parse(id);
      const unixMs = v1.toUnixTimeMs(fields.timestamp);
      const time = new Date(Number(unixMs)).toISOString();
      process.stdout.write(
        `${JSON.stringify(
          {
            id: display,
            timestamp: fields.timestamp.toString(10),
            time,
            type: fields.type,
            node: fields.node,
            sequence: fields.sequence,
            int: v1.toDecimalString(id),
            hex: v1.toHex(id),
            base64url: v1.toBase64Url(id),
          },
          null,
          2,
        )}\n`,
      );
      return;
    }

    const { id, display } = parseIdInput(idArg, "v2");
    const fields = parse(id);
    const unixMs = toUnixTimeMs(fields.timestamp);
    const time = new Date(Number(unixMs)).toISOString();
    process.stdout.write(
      `${JSON.stringify(
        {
          spec: "v2",
          id: display,
          formatVersion: fields.formatVersion,
          timestamp: fields.timestamp.toString(10),
          time,
          type: fields.type,
          node: fields.node,
          sequence: fields.sequence,
          region: fields.region,
          tenant: fields.tenant,
          reserved: fields.reserved,
          int: toDecimalString(id),
          hex: toHex(id),
          base64url: toBase64Url(id),
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

function cmdGenerate(
  flags: Record<string, string | boolean>,
  spec: SpecVersion,
  format: OutputFormat,
): void {
  try {
    rejectV2OnlyGenerateFlags(flags, spec);
    if (spec === "v1") {
      const type = requireIntFlag(flags, "type", 1, 63);
      const node = resolveNode(flags, 127);
      const generator = new v1.OrbitGenerator({ node });
      const id = generator.generate(type);
      process.stdout.write(`${formatId(id, format, "v1")}\n`);
      return;
    }

    const type = requireIntFlag(flags, "type", 1, 65535);
    const node = resolveNode(flags, 65535);
    const region = optionalIntFlag(flags, "region", 0, 15, 0);
    const tenant = optionalIntFlag(flags, "tenant", 0, 65535, 0);
    const generator = new OrbitGeneratorV2({ node, region, tenant });
    const id = generator.generate(type);
    process.stdout.write(`${formatId(id, format, "v2")}\n`);
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
  const format = resolveFormat(flags);

  switch (command) {
    case "parse":
      cmdParse(positional[0], spec);
      break;
    case "generate":
      cmdGenerate(flags, spec, format);
      break;
    default:
      fail(`Unknown command: ${command}`);
  }
}

# Library API

[日本語](../ja/library-api.md)

Status: Stable — package roots default to Orbit ID **v2** (128-bit); v1 remains under explicit namespaces. See [migration guide](migration-1x-to-2.0.0.md).

This document describes the common API surface for Orbit ID libraries.

## Goals

- Same operations across TypeScript, Java, Go, Rust, PHP, and CLI
- Encode / decode against the [Orbit ID v2 Specification](orbit-id-v2.md) by default; v1 via retained entry points ([Orbit ID v1](orbit-id-v1.md))
- Pass the [Canonical Test Vectors](test-vectors.md) / [`spec/conformance/`](../../spec/conformance/)

## Operations

| Operation | Input | Output | Notes |
| --- | --- | --- | --- |
| `generate(type)` | Type (`0..63`) | Orbit ID | Requires an assigned Node and generator state. Type `0` (`RESERVED`) MUST be rejected |
| `parse(id)` | ID (integer or decimal string) | Fields object | Rejects non-canonical decimal strings per the spec |
| `getTimestamp(id)` | ID | Timestamp / time | Milliseconds since Orbit Epoch, or derived UTC time |
| `getType(id)` | ID | Type | |
| `getNode(id)` | ID | Node | |
| `getSequence(id)` | ID | Sequence | |
| `isValid(id)` | ID candidate | boolean / result | Means **syntactically valid**, not “issued” |

`isValid` MUST NOT claim that an ID was issued by an Orbit generator. See specification §11.

Optional helpers MAY be provided (`encode(fields)`, `toDecimalString(id)`, `fromDecimalString(s)`,
`toHexString(id)` / `toHex(id)`, `toInt(id)`, `toBase64UrlString(id)` / `toBase64Url(id)`,
`fromBase64UrlString(s)`) but MUST NOT diverge from the operations above. Decimal remains the
JSON / HTTP canonical string; hex and Base64 URL are **non-canonical** display / compact-copy
forms (Base64 URL = RFC 4648 §5, unpadded, big-endian bytes). The CLI defaults `generate` output
to Base64 URL (`--format base64url|int|hex`).

## Value representation

| Context | Representation |
| --- | --- |
| In-memory (JS/TS) | `bigint` |
| JSON / HTTP | unsigned decimal string |
| Binary | v1: 8-byte big-endian; v2: **16-byte big-endian** |
| Compact display (optional) | unpadded Base64 URL (v1: 11 chars; v2: 22 chars); CLI `generate` default |

Example JSON:

```json
{
  "id": "140612821619842090"
}
```

## Canonical error codes

Libraries SHOULD expose these stable code strings (or language enums mapping to them):

| Code | When |
| --- | --- |
| `INVALID_TYPE` | Type outside the format range, or `generate(0)` |
| `INVALID_NODE` | Node outside the format range (`0..127` for v1; `0..65535` for v2) at construction / configuration |
| `INVALID_SEQUENCE` | Sequence outside `0..1023` when encoding fields |
| `INVALID_TIMESTAMP` | Timestamp outside the 41-bit range when encoding fields |
| `INVALID_DECIMAL` | Non-canonical or out-of-range decimal string |
| `INVALID_BASE64URL` | Malformed / padded / wrong-length Base64 URL string |
| `INVALID_FORMAT_VERSION` | Unknown / reserved FormatVersion (v2) |
| `INVALID_REGION` | Region outside `0..15` (v2) |
| `INVALID_TENANT` | Tenant outside `0..65535` (v2) |
| `INVALID_RESERVED` | Non-zero remaining Reserved on encode, or rejected on decode (v2) |
| `CLOCK_ROLLBACK` | Wall clock behind `last_timestamp` beyond tolerance |
| `SEQUENCE_EXHAUSTED` | Same-ms capacity exceeded and the implementation chooses to fail instead of waiting |
| `NODE_OWNERSHIP_LOST` | Lease / ownership cannot be confirmed; fail closed |

Exact exception types are language-specific; the code string / enum identity SHOULD match.

## Clock source

Generators MUST obtain “now” through an injectable clock abstraction equivalent to:

```text
currentOrbitTimestampMs() -> unsigned integer
```

returning milliseconds since Orbit Epoch (or Unix ms convertible by subtracting `1767225600000`).

- Production default: system wall clock
- Tests: deterministic / fake clock driven by conformance fixtures
- A monotonic helper MAY be used to avoid issuing while waiting through a tolerated rollback, but the
  encoded Timestamp field remains Orbit-Epoch wall milliseconds as defined by the specification

## Concurrency

Within one generator instance:

- `generate` MUST be serialized (mutex / actor / single-threaded ownership)
- Concurrent calls MUST NOT interleave Sequence updates
- Sharing one Node ID across multiple generator instances in one process is unsupported unless the
  implementation provides an explicitly documented, process-wide singleton

Across processes, exclusivity is provided by Node allocation — not by the library mutex.

## Generator responsibilities

A generator that implements `generate` MUST:

- Hold Node ID, last Timestamp, and Sequence
- Serialize generation within the process as above
- Follow clock-rollback and Sequence exhaustion rules from the specification
- Fail closed when Node ownership cannot be confirmed (if lease-based)

Node allocation (static config or Redis lease) is outside the hot path of `generate`.

## Orbit ID v2 delta

Status: **implemented** in `@orbit-id/core` as an additive namespace (`import * as v2 from
"@orbit-id/core/v2"` or `import { v2 } from "@orbit-id/core"`). Spec (Stable):
[Orbit ID v2 Specification](orbit-id-v2.md). Decisions:
[Design Decisions (v2)](design-decisions-v2.md). Promotion path:
[v2 alpha exit](v2-alpha-exit.md) · [package `2.0.0` plan](v2-package-2.0.0.md).

Operations stay the same (`generate` / `parse` / field getters / `isValid`), but:

| Aspect | v1 | v2 (Stable wire; additive on 1.x) |
| --- | --- | --- |
| Value width | 64-bit | 128-bit |
| In-memory (JS/TS) | `bigint` | `bigint` (full 128-bit) |
| JSON / HTTP | unsigned decimal | unsigned decimal (longer strings) |
| Binary | 8-byte BE | **16-byte BE** |
| Type / Node / Sequence ranges | 6 / 7 / 10 bits | 16 / 16 / 16 bits |
| Extra fields | — | `FormatVersion` (MUST `1`), `Region` (`0..15`), `Tenant` (`0..65535`), remaining `Reserved` (MUST `0` on encode) |
| Package entry | `@orbit-id/core` (v1 in 1.x) | `@orbit-id/core` root → v2 (`/v2` alias) |

Additional error codes used by v2: `INVALID_FORMAT_VERSION`, `INVALID_REGION`, `INVALID_TENANT`,
`INVALID_RESERVED`.

Libraries MUST NOT reinterpret a v1 64-bit ID as v2.

### Per-language entry points (1.x → 2.0.0)

Policy: [Cross-registry versioning](cross-registry-versioning.md) ·
[Migration guide](migration-1x-to-2.0.0.md) · [#150](https://github.com/orbit-id/orbit-id/issues/150).

| Language | 1.x default (v1) | 1.x additive v2 | 2.0.0 default (v2) | 2.0.0 retained v1 |
| --- | --- | --- | --- | --- |
| TypeScript | `@orbit-id/core` root | `v2` / `@orbit-id/core/v2` | root → v2 (`/v2` alias) | `v1` / `@orbit-id/core/v1` |
| Java | `com.github.orbitid` | `com.github.orbitid.v2` (removed after promotion) | `com.github.orbitid` → v2 | `com.github.orbitid.v1` |
| Rust | crate root | `orbit_id::v2` | crate root → v2 (`v2` alias) | `orbit_id::v1` |
| PHP | `OrbitId\` | `OrbitId\V2` | `OrbitId\` → v2 (`V2` class alias) | `OrbitId\V1` |
| Go | module `github.com/orbit-id/go` | (not public in 1.x) | module `github.com/orbit-id/go/v2` | `…/v2/v1` or prior major `@v1.x` |
| CLI | default v1 | `--spec v2` / `--v2` | default v2 | `--spec v1` |

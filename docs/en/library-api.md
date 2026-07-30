# Library API

[日本語](../ja/library-api.md)

Status: Stable (`v1.1.0`) — implemented in `@orbit-id/core` / `@orbit-id/typescript`.

This document describes the common API surface for Orbit ID libraries.

## Goals

- Same operations across TypeScript, Java, Go, Rust, PHP, and CLI
- Encode / decode against the [Orbit ID v1 Specification](orbit-id-v1.md)
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

Optional helpers MAY be provided (`encode(fields)`, `toDecimalString(id)`, `fromDecimalString(s)`)
but MUST NOT diverge from the operations above.

## Value representation

| Context | Representation |
| --- | --- |
| In-memory (JS/TS) | `bigint` |
| JSON / HTTP | unsigned decimal string |
| Binary | 8-byte big-endian |

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
| `INVALID_TYPE` | Type outside `0..63`, or `generate(0)` |
| `INVALID_NODE` | Node outside `0..127` at construction / configuration |
| `INVALID_SEQUENCE` | Sequence outside `0..1023` when encoding fields |
| `INVALID_TIMESTAMP` | Timestamp outside the 41-bit range when encoding fields |
| `INVALID_DECIMAL` | Non-canonical or out-of-range decimal string |
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

## Orbit ID v2 delta (planned)

Status: **not implemented** in packages yet. Spec Draft:
[Orbit ID v2 Specification](orbit-id-v2.md). Decisions:
[Design Decisions (v2)](design-decisions-v2.md).

Operations stay the same (`generate` / `parse` / field getters / `isValid`), but:

| Aspect | v1 | v2 (alpha Draft) |
| --- | --- | --- |
| Value width | 64-bit | 128-bit |
| In-memory (JS/TS) | `bigint` | `bigint` (full 128-bit) |
| JSON / HTTP | unsigned decimal | unsigned decimal (longer strings) |
| Binary | 8-byte BE | **16-byte BE** |
| Type / Node / Sequence ranges | 6 / 7 / 10 bits | 16 / 16 / 16 bits |
| Extra fields | — | `FormatVersion` (MUST `1`), `Reserved` (MUST `0` on encode) |

Libraries MUST NOT reinterpret a v1 64-bit ID as v2. Prefer separate types, package major
versions, or explicit API namespaces when v2 support ships.

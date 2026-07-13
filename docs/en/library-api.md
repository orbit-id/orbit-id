# Library API (Draft)

[日本語](../ja/library-api.md)

Status: Draft — not yet implemented.

This document describes the intended common API surface for Orbit ID libraries. Exact names and
types will follow each language's conventions, but semantic behavior SHOULD match.

## Goals

- Same operations across TypeScript, Java, Go, Rust, PHP, and CLI
- Encode / decode against the [Orbit ID v1 Specification](orbit-id-v1.md)
- Pass the [Canonical Test Vectors](test-vectors.md)

## Operations

| Operation | Input | Output | Notes |
| --- | --- | --- | --- |
| `generate(type)` | Type (`0..63`) | Orbit ID | Requires an assigned Node and generator state |
| `parse(id)` | ID (integer or decimal string) | Fields object | Rejects non-canonical decimal strings per the spec |
| `getTimestamp(id)` | ID | Timestamp / time | Milliseconds since Orbit Epoch, or derived UTC time |
| `getType(id)` | ID | Type | |
| `getNode(id)` | ID | Node | |
| `getSequence(id)` | ID | Sequence | |
| `isValid(id)` | ID candidate | boolean / result | Means **syntactically valid**, not “issued” |

`isValid` MUST NOT claim that an ID was issued by an Orbit generator. See specification §11.

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

## Generator responsibilities

A generator that implements `generate` MUST:

- Hold Node ID, last Timestamp, and Sequence
- Serialize generation within the process
- Follow clock-rollback and Sequence exhaustion rules from the specification
- Fail closed when Node ownership cannot be confirmed (if lease-based)

Node allocation (static config or Redis lease) is outside the hot path of `generate`.

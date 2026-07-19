# Orbit ID

[日本語](README.ja.md)

[![CI](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml/badge.svg)](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml)
[![npm @orbit-id/core](https://img.shields.io/npm/v/@orbit-id/core?label=%40orbit-id%2Fcore)](https://www.npmjs.com/package/@orbit-id/core)
[![npm @orbit-id/typescript](https://img.shields.io/npm/v/@orbit-id/typescript?label=%40orbit-id%2Ftypescript)](https://www.npmjs.com/package/@orbit-id/typescript)
[![npm @orbit-id/cli](https://img.shields.io/npm/v/@orbit-id/cli?label=%40orbit-id%2Fcli)](https://www.npmjs.com/package/@orbit-id/cli)
[![Maven Central](https://img.shields.io/maven-central/v/io.github.orbit-id/orbit-id?label=Maven%20Central)](https://central.sonatype.com/artifact/io.github.orbit-id/orbit-id)
[![crates.io](https://img.shields.io/crates/v/orbit-id)](https://crates.io/crates/orbit-id)
[![Packagist](https://img.shields.io/packagist/v/orbit-id/php?label=Packagist)](https://packagist.org/packages/orbit-id/php)
[![Go Reference](https://pkg.go.dev/badge/github.com/orbit-id/go.svg)](https://pkg.go.dev/github.com/orbit-id/go)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Playground: [orbit-id.github.io/orbit-id](https://orbit-id.github.io/orbit-id/)

Orbit ID is a specification for generating unique 64-bit IDs in distributed environments.
Each ID embeds the issuance timestamp, entity type, issuing node, and a per-millisecond sequence,
so those fields can be decoded without querying a database.

> [!IMPORTANT]
> Orbit ID v1 is stable (`v1.1.0`). Install [`@orbit-id/typescript`](https://www.npmjs.com/package/@orbit-id/typescript)
> or use the [`orbit-id`](https://www.npmjs.com/package/@orbit-id/cli) CLI.

## Features

- Generatable on each node without a central allocator
- Roughly time-ordered at millisecond resolution
- Timestamp / type / node / sequence recoverable from the ID
- Up to 1,024 IDs/ms per node (theoretically 1,024,000 IDs/s)
- Up to 64 types and 128 nodes
- Usable for about 69.7 years from 2026-01-01

## Orbit ID v1

```text
MSB                                                             LSB
63                                                               0
┌──────────────────────────┬──────────┬───────────┬──────────────┐
│ Timestamp                │ Type     │ Node      │ Sequence     │
│ 41 bits                  │ 6 bits   │ 7 bits    │ 10 bits      │
└──────────────────────────┴──────────┴───────────┴──────────────┘
63                        23 22      17 16       10 9             0
```

| Field | Bits | Range | Meaning |
| --- | ---: | ---: | --- |
| Timestamp | 41 | `0..2,199,023,255,551` | Milliseconds since Orbit Epoch |
| Type | 6 | `0..63` | Logical entity type |
| Node | 7 | `0..127` | Issuing node |
| Sequence | 10 | `0..1,023` | Sequence within the same node and millisecond |

Orbit Epoch:

```text
2026-01-01T00:00:00.000Z
```

Encoding:

```text
id = (timestamp << 23) | (type << 17) | (node << 10) | sequence
```

## Handling

The canonical representation of an Orbit ID is an unsigned 64-bit integer. In JavaScript / TypeScript,
use `bigint` rather than `number`. In JSON and HTTP APIs, pass it as a decimal string.

```json
{
  "id": "140612821619842090"
}
```

IDs do not hide issuance time or related fields. They also do not provide guess resistance,
tamper detection, or issuer authenticity. Do not use them where secrecy of embedded information
is required for external exposure, or as authorization tokens.

## Documentation

- [Orbit ID v1 Specification](docs/en/orbit-id-v1.md)
- [Canonical Test Vectors](docs/en/test-vectors.md)
- [Node Management](docs/en/node-management.md)
- [Design Decisions](docs/en/design-decisions.md)
- [Why Orbit ID v2 is 128-bit](docs/en/why-128bit.md)
- [Library API](docs/en/library-api.md)
- [npm Trusted Publishing](docs/en/npm-trusted-publishing.md)
- [Cross-registry versioning](docs/en/cross-registry-versioning.md)
- [Maven Central publishing](docs/en/maven-central.md)
- [Go module publishing](docs/en/go-module.md)
- [crates.io publishing](docs/en/crates-io.md)
- [Packagist publishing](docs/en/packagist.md)
- [Roadmap](docs/en/roadmap.md)
- [Contributing](docs/en/contributing.md)
- [Security Policy](docs/en/security.md)

## Current Scope

Orbit ID v1 is stable on npm:

```bash
npm install @orbit-id/typescript
npm install -g @orbit-id/cli
orbit-id parse 140612821619842090
```

See [`packages/`](packages/), [npm Trusted Publishing](docs/en/npm-trusted-publishing.md), and
[Cross-registry versioning](docs/en/cross-registry-versioning.md) for releases. Redis (when used)
manages Node leases only — ID generation stays local to each Orbit node.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
Copyright 2026 ponstream24.

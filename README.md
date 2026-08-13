# Orbit ID

[日本語](README.ja.md)

[![CI](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml/badge.svg)](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml)
[![npm @orbit-id/core](https://img.shields.io/npm/v/@orbit-id/core?label=%40orbit-id%2Fcore)](https://www.npmjs.com/package/@orbit-id/core)
[![npm @orbit-id/typescript](https://img.shields.io/npm/v/@orbit-id/typescript?label=%40orbit-id%2Ftypescript)](https://www.npmjs.com/package/@orbit-id/typescript)
[![npm @orbit-id/cli](https://img.shields.io/npm/v/@orbit-id/cli?label=%40orbit-id%2Fcli)](https://www.npmjs.com/package/@orbit-id/cli)
[![Maven Central](https://img.shields.io/maven-central/v/io.github.orbit-id/orbit-id?label=Maven%20Central)](https://central.sonatype.com/artifact/io.github.orbit-id/orbit-id)
[![crates.io](https://img.shields.io/crates/v/orbit-id)](https://crates.io/crates/orbit-id)
[![Packagist](https://img.shields.io/packagist/v/orbit-id/php?label=Packagist)](https://packagist.org/packages/orbit-id/php)
[![Go](https://img.shields.io/github/v/tag/orbit-id/go?filter=v*&label=go&logo=go)](https://pkg.go.dev/github.com/orbit-id/go/v2)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Playground: [orbit-id.github.io/orbit-id](https://orbit-id.github.io/orbit-id/)

Orbit ID is a specification for generating unique, time-sortable IDs in distributed environments.
**v2** (128-bit, Stable) is the package-root default toward `2.0.0`; **v1** (64-bit) remains available
for legacy IDs. Each ID embeds issuance time and related fields so they can be decoded without a
database round-trip.

> [!IMPORTANT]
> Package roots default to **Orbit ID v2**. v1 is still supported under explicit namespaces /
> `--spec v1`. See the [1.x → 2.0.0 migration guide](docs/en/migration-1x-to-2.0.0.md). Registry
> `2.0.0` cut is tracked in the [promotion plan](docs/en/v2-package-2.0.0.md).

## Features

- Generatable on each node without a central allocator
- Roughly time-ordered at millisecond resolution
- Timestamp / type / node / sequence (and v2 region / tenant) recoverable from the ID
- v2: up to 65,536 IDs/ms per node; 65,536 types; 65,536 nodes; Region `0..15`; Tenant `0..65535`
- v1 (legacy): up to 1,024 IDs/ms per node; 64 types; 128 nodes
- Shared Orbit Epoch: `2026-01-01T00:00:00.000Z`

## Orbit ID v2 (default)

```text
formatVersion: 4 | timestamp: 48 | type: 16 | node: 16 | sequence: 16
| region: 4 | tenant: 16 | reserved: 8
```

Full layout: [Orbit ID v2 Specification](docs/en/orbit-id-v2.md).

## Orbit ID v1 (legacy)

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

The canonical representation is an unsigned integer as a **decimal string** (v2: 128-bit; v1: 64-bit).
In JavaScript / TypeScript, use `bigint` rather than `number`. Binary form is 16-byte BE (v2) or
8-byte BE (v1).

```json
{
  "id": "21267647932558653967613957625668960256"
}
```

IDs do not hide issuance time or related fields. They also do not provide guess resistance,
tamper detection, or issuer authenticity. Do not use them where secrecy of embedded information
is required for external exposure, or as authorization tokens.

## Documentation

- [Orbit ID v2 Specification](docs/en/orbit-id-v2.md) (Stable, default)
- [Orbit ID v1 Specification](docs/en/orbit-id-v1.md) (legacy)
- [Migrating 1.x → 2.0.0](docs/en/migration-1x-to-2.0.0.md)
- [CHANGELOG](CHANGELOG.md)
- [Canonical Test Vectors](docs/en/test-vectors.md)
- [Node Management](docs/en/node-management.md)
- [Design Decisions](docs/en/design-decisions.md)
- [Design Decisions (v2)](docs/en/design-decisions-v2.md)
- [Why Orbit ID v2 is 128-bit](docs/en/why-128bit.md)
- [v2 alpha exit / 2.0.0 promotion](docs/en/v2-alpha-exit.md)
- [Package `2.0.0` promotion plan](docs/en/v2-package-2.0.0.md)
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

Package roots default to Orbit ID v2. After the coordinated registry cut, install `2.0.0` (until
then, in-tree / current npm majors already expose the v2 root API):

```bash
npm install @orbit-id/typescript
npm install -g @orbit-id/cli
orbit-id parse 21267647932558653967613957625668960256
# legacy v1:
orbit-id parse --spec v1 140612821619842090
```

```go
go get github.com/orbit-id/go/v2@v2.0.0 // after the v2.0.0 registry cut
```

Migration details: [1.x → 2.0.0](docs/en/migration-1x-to-2.0.0.md). See [`packages/`](packages/),
[npm Trusted Publishing](docs/en/npm-trusted-publishing.md), and
[Cross-registry versioning](docs/en/cross-registry-versioning.md). Redis (when used) manages Node
leases only — ID generation stays local to each Orbit node.

## License

Licensed under the [Apache License, Version 2.0](LICENSE).
Copyright 2026 ponstream24.

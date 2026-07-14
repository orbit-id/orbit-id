# Roadmap

[日本語](../ja/roadmap.md)

Orbit aims to be an ID generation **algorithm** with a specification, implementations, and tests —
in the spirit of Snowflake and ULID — not merely a one-off library.

The root [`ROADMAP.md`](../../ROADMAP.md) mirrors this document for a convenient top-level entry
point.

## Near term (specification)

- [x] Draft Orbit ID v1 bit layout and epoch
- [x] Canonical test vectors
- [x] Type registry draft and node-management guidance
- [x] Finalize official Type assignments
- [x] Decide production Node allocation strategy
- [x] Decide Node reuse quarantine
- [x] Decide default clock-rollback tolerance
- [x] Conformance / test suite
- [x] Choose an OSS license (Apache-2.0)

## Library API

Minimum surface across language packages (documented and implemented in TypeScript):

```text
generate(type)
parse(id)
getTimestamp(id)
getType(id)
getNode(id)
getSequence(id)
isValid(id)
```

See [Library API](library-api.md).

## Implementations

- [x] TypeScript (`@orbit-id/core`, `@orbit-id/typescript`)
- Java
- Go
- Rust
- PHP
- [x] CLI (`@orbit-id/cli`)
- Playground
- Benchmarks

## Packaging / publish

- [x] npm (`@orbit-id/core`, `@orbit-id/typescript`, `@orbit-id/cli`)
- Maven, Go modules, crates.io, Packagist, etc.
- Redis-backed Node lease as an optional control-plane component
- Orbit node service (issuance path stays local; Redis is not on the hot path)

## Repository layout (monorepo)

```text
orbit-id/
├── packages/
│   ├── core          ← shipped
│   ├── typescript    ← shipped
│   ├── cli           ← shipped
│   ├── java
│   ├── go
│   ├── rust
│   ├── php
│   └── playground
├── spec/
├── benchmark/
└── docs/
```

`packages/core`, `packages/typescript`, and `packages/cli` ship on npm. Remaining language
packages, playground, and `benchmark/` are phase-3 work.

## Stable release

Criteria for promoting `draft` to `v1.0.0` are documented in
[Stable v1 promotion criteria](stable-release-criteria.md). Stable `v1.0.0` is tagged.

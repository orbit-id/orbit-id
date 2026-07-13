# Roadmap

Canonical English: [docs/en/roadmap.md](docs/en/roadmap.md)  
日本語: [docs/ja/roadmap.md](docs/ja/roadmap.md)

Orbit aims to be an ID generation **algorithm** with a specification, implementations, and tests —
in the spirit of Snowflake and ULID — not merely a one-off library.

## Near term (specification)

- [x] Draft Orbit ID v1 bit layout and epoch
- [x] Canonical test vectors
- [x] Type registry draft and node-management guidance
- [x] Finalize official Type assignments
- [ ] Decide production Node allocation and reuse quarantine
- [x] Decide default clock-rollback tolerance
- [ ] Conformance / test suite
- [x] Choose an OSS license (Apache-2.0)

## Library API (planned)

Minimum surface across language packages:

```text
generate(type)
parse(id)
getTimestamp(id)
getType(id)
getNode(id)
getSequence(id)
isValid(id)
```

See [Library API](docs/en/library-api.md).

## Implementations (planned)

- TypeScript
- Java
- Go
- Rust
- PHP
- CLI
- Playground
- Benchmarks

## Packaging / publish (later)

- npm, Maven, Go modules, crates.io, Packagist, etc.
- Redis-backed Node lease as an optional control-plane component
- Orbit node service (issuance path stays local; Redis is not on the hot path)

## Repository layout (planned monorepo)

```text
orbit/
├── packages/
│   ├── core
│   ├── typescript
│   ├── java
│   ├── go
│   ├── rust
│   ├── php
│   ├── cli
│   └── playground
├── spec/
├── benchmark/
└── docs/
```

Directories under `packages/` and `benchmark/` are placeholders until the specification is stable
enough to implement.

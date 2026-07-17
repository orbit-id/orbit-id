# Roadmap

[日本語](../ja/roadmap.md)

Orbit aims to be an ID generation **algorithm** with a specification, implementations, and tests —
in the spirit of Snowflake and ULID — not merely a one-off library.

The root [`ROADMAP.md`](../../ROADMAP.md) mirrors this document for a convenient top-level entry
point.

## Near term (specification) — phase 0–1

- [x] Draft Orbit ID v1 bit layout and epoch
- [x] Canonical test vectors
- [x] Type field rules in the v1 spec (no separate Type registry doc)
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

## Phase 2 — reference implementation (done)

- [x] Monorepo scaffold + CI
- [x] `@orbit-id/core` (encode / decode / generator + conformance)
- [x] `@orbit-id/typescript`
- [x] `@orbit-id/cli`
- [x] npm Trusted Publishing workflow + public npm releases

## Phase 3 — expand

Tracked on GitHub with label `phase-3`:

| Work | Issue | Status |
| --- | --- | --- |
| Benchmark framework under `benchmark/` | [#18](https://github.com/orbit-id/orbit-id/issues/18) | done in-repo |
| Optional Redis Node lease (+ optional Orbit node service) | [#19](https://github.com/orbit-id/orbit-id/issues/19) | done in-repo (node service optional later) |
| Playground (`packages/playground`) | [#20](https://github.com/orbit-id/orbit-id/issues/20) | done in-repo |
| Java / Go / Rust / PHP packages | [#21](https://github.com/orbit-id/orbit-id/issues/21) | done in-repo |
| Remaining registries (Maven / Go modules / crates.io / Packagist) | [#42](https://github.com/orbit-id/orbit-id/issues/42) |

npm publish for TypeScript packages is complete ([#22](https://github.com/orbit-id/orbit-id/issues/22) closed). #42 covers other ecosystems as language packages land. Shared tagging policy: [Cross-registry versioning](cross-registry-versioning.md).

## Repository layout (monorepo)

```text
orbit-id/
├── packages/
│   ├── core          ← shipped (npm)
│   ├── typescript    ← shipped (npm)
│   ├── cli           ← shipped (npm)
│   ├── node-lease    ← monorepo (#19)
│   ├── java          ← shipped (monorepo)
│   ├── go            ← shipped (monorepo)
│   ├── rust          ← shipped (monorepo)
│   ├── php           ← shipped (monorepo)
│   └── playground    ← shipped (Pages)
├── spec/
├── benchmark/        ← shipped
└── docs/
```

## Stable release

Current stable release is `v1.1.0`. The wire format is frozen in [Orbit ID v1](orbit-id-v1.md).

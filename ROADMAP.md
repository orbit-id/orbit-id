# Roadmap

Canonical English: [docs/en/roadmap.md](docs/en/roadmap.md)  
日本語: [docs/ja/roadmap.md](docs/ja/roadmap.md)

Orbit aims to be an ID generation **algorithm** with a specification, implementations, and tests —
in the spirit of Snowflake and ULID — not merely a one-off library.

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

See [Library API](docs/en/library-api.md).

## Phase 2 — reference implementation (done)

- [x] Monorepo scaffold + CI
- [x] `@orbit-id/core` (encode / decode / generator + conformance)
- [x] `@orbit-id/typescript`
- [x] `@orbit-id/cli`
- [x] npm Trusted Publishing workflow + public npm releases

## Phase 3 — expand (done)

Tracked on GitHub with label `phase-3`:

| Work | Issue | Status |
| --- | --- | --- |
| Benchmark framework under `benchmark/` | [#18](https://github.com/orbit-id/orbit-id/issues/18) | done in-repo |
| Optional Redis Node lease (+ optional Orbit node service) | [#19](https://github.com/orbit-id/orbit-id/issues/19) | done in-repo (node service optional later) |
| Playground (`packages/playground`) | [#20](https://github.com/orbit-id/orbit-id/issues/20) | done in-repo |
| Java / Go / Rust / PHP packages | [#21](https://github.com/orbit-id/orbit-id/issues/21) | done in-repo |
| Remaining registries (Maven / Go modules / crates.io / Packagist) | [#42](https://github.com/orbit-id/orbit-id/issues/42) | done |

npm / Maven / Go modules / crates.io / Packagist publishing is live. Shared tagging policy:
[Cross-registry versioning](docs/en/cross-registry-versioning.md).

## Version tracks

| Track | Meaning |
| --- | --- |
| **v1.x** | 64-bit Orbit ID. Wire format frozen. **Maintenance mode:** bug fixes and documentation only; new features are not added by default. |
| **v2.0.0-alpha.\*** | 128-bit redesign track used while fields and APIs were still moving. Alpha exit criteria are now met ([v2 alpha exit](docs/en/v2-alpha-exit.md)). |
| **v2.0.0-beta.\*** | Optional short freeze before package majors. **Skipped** for the current train ([#199](https://github.com/orbit-id/orbit-id/issues/199)). |
| **v2.0.0** | Stable 128-bit Orbit ID (package majors move v2 to the root API). |

Why 128-bit: [Why Orbit ID v2 is 128-bit](docs/en/why-128bit.md).  
Draft → **Stable** spec: [Orbit ID v2 Specification](docs/en/orbit-id-v2.md)
([#201](https://github.com/orbit-id/orbit-id/issues/201)).  
Locked decisions: [Design Decisions (v2)](docs/en/design-decisions-v2.md).  
Alpha exit / promotion overview: [v2 alpha exit](docs/en/v2-alpha-exit.md).  
**Package `2.0.0` execution plan:** [Package `2.0.0` promotion plan](docs/en/v2-package-2.0.0.md).

Package `2.0.0` promotion slices **A–J are shipped**
([release](https://github.com/orbit-id/orbit-id/releases/tag/v2.0.0), epic [#199](https://github.com/orbit-id/orbit-id/issues/199)).
Next optional work: further Reserved carve-outs (for example Datacenter) via a **new ADR**;
v1.x stays in maintenance mode.

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

## Stable release (v1)

Current stable release is `v1.1.0`. The v1 wire format is frozen in [Orbit ID v1](docs/en/orbit-id-v1.md).
v1.x stays in maintenance mode; active design work for the next major line is v2 (128-bit).

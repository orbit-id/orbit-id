# Package `2.0.0` promotion plan

[日本語](../ja/v2-package-2.0.0.md)

Tracker: [#199](https://github.com/orbit-id/orbit-id/issues/199).  
Related: [v2 alpha exit](v2-alpha-exit.md) · [Library API](library-api.md) ·
[Cross-registry versioning](cross-registry-versioning.md) · [Roadmap](roadmap.md).

This document is the **execution plan** for moving package majors to `2.0.0` (v2 at the public
root). It does **not** cut tags or publish by itself.

## Decision

| Item | Choice |
| --- | --- |
| Optional `v2.0.0-beta.*` freeze | **Skipped** — proceed from alpha-exit-met Draft straight to the `2.0.0` work below |
| Spec status at cut | **Done (slice A)** — [Orbit ID v2](orbit-id-v2.md) is **Stable** ([#201](https://github.com/orbit-id/orbit-id/issues/201)) |
| Registry publish | Only after all code slices merge and a coordinated `v2.0.0` GitHub Release / tag |
| Datacenter / remaining Reserved carve | Still **post-`2.0.0`** (new ADR) |

## Target end state

| Concern | After `2.0.0` |
| --- | --- |
| Package versions | Coordinated **`2.0.0`** across npm / Maven / crates / Go mirror / Packagist |
| Public default API | **v2** (128-bit) at the package root (Go: module path `…/v2`) |
| Legacy v1 | Still shipped under explicit `v1` namespace / module / CLI flag |
| Temporary additive `v2` paths | Prefer re-export / alias of the new root; document deprecation if kept |
| Spec | Stable; wire layout frozen (Region/Tenant included; remaining Reserved MUST `0`) |

Per-language entry points: [Library API § Per-language entry points](library-api.md#per-language-entry-points-1x--200).

## Ordered work packages (separate Issues / PRs)

Prefer small reviewable PRs. Do **not** land the version bump / tag until slices A–H are on `main`.

| Slice | Scope | Notes |
| --- | --- | --- |
| **A. Spec → Stable** | EN/JA `orbit-id-v2`, design-decisions, test-vectors status lines; conformance README | No wire change — status + freeze wording only |
| **B. `@orbit-id/core`** | Root exports become v2; move current root to `v1` / `@orbit-id/core/v1`; keep `@orbit-id/core/v2` as alias of root | Maintain 100% coverage; update package README / exports map |
| **C. `@orbit-id/typescript`** | Mirror core’s root / `v1` / `v2` policy | Thin re-export package |
| **D. Java** | `com.github.orbitid` → v2 types; ship former root under `com.github.orbitid.v1`; keep `.v2` as alias if useful | Update Maven samples / README |
| **E. Rust** | Crate root → v2; `orbit_id::v1` for 64-bit; `orbit_id::v2` alias | Update crate docs |
| **F. PHP** | `OrbitId\` → v2; `OrbitId\V1`; `OrbitId\V2` alias | Composer / Packagist README |
| **G. Go** | Module path **`github.com/orbit-id/go/v2`**; lift `internal/v2` to public; leave `github.com/orbit-id/go` as v1 major line | Update `go.mod`, mirror split docs, [go-module.md](go-module.md) |
| **H. CLI + playground** | Default `--spec` / UI → v2; keep explicit v1 mode | Do not break scripts that pass `--spec v1` |
| **I. Docs polish** | Migration notes (1.x → 2.0.0), CHANGELOG, README install snippets, cross-registry Go `/v2` section | Can land with I or just before J |
| **J. Release cut** | Run [Bump release PR](https://github.com/orbit-id/orbit-id/actions/workflows/bump-release-pr.yml) with `version=2.0.0`, merge that PR, then GitHub Release **`v2.0.0`** (stable tag → Publish) | See [When to run Bump release PR](#when-to-run-bump-release-pr) |

### Suggested Issue titles

Reuse this tracker as the epic; open child Issues when starting each slice, for example:

- `feat(core): make v2 the root API for package 2.0.0`
- `feat(go): publish Orbit ID v2 under module path /v2`
- `chore(release): cut coordinated v2.0.0`

## When to run Bump release PR

Workflow: [Bump release PR](https://github.com/orbit-id/orbit-id/actions/workflows/bump-release-pr.yml)
(`.github/workflows/bump-release-pr.yml`, `workflow_dispatch` on `main`).

It only bumps in-tree version metadata and opens a PR. It does **not** tag or publish. After that
PR merges, create a GitHub Release so Publish runs (see
[Cross-registry versioning](cross-registry-versioning.md)).

| Timing | Run? | Input |
| --- | --- | --- |
| During slices **A–I** (spec / API / docs work) | **No** | — |
| Start of slice **J**, after A–I are on `main` and CI is green | **Yes** | `version` = `2.0.0` (no leading `v`) |
| After the bump PR merges | **No** (next step is Release) | Create GitHub Release / tag `v2.0.0` instead |
| Pre-release / alpha / beta tags | **No** for registry cuts | Pre-release tags do not publish; do not use this workflow to fake a registry beta |

### Slice J sequence

1. Confirm slices A–I merged; `main` CI green.
2. **Actions → Bump release PR → Run workflow** on `main` with `version=2.0.0`.
3. Review and merge the opened `chore/release-v2.0.0` PR (CI green).
4. Create GitHub Release **`v2.0.0`** (not pre-release) so `.github/workflows/publish.yml` runs.
5. Verify registries (npm / Maven / crates / Packagist / `proxy.golang.org` for `…/go/v2@v2.0.0`).

Local equivalent (optional): `npm run release:bump -- 2.0.0` then open the PR by hand — prefer the
Action for a lockstep bump.
## Consumer migration (summary)

| Consumer today (1.x) | After `2.0.0` |
| --- | --- |
| Imports package root as **v1** | Breaks — switch to `v1` namespace / prior Go module, **or** migrate to v2 |
| Imports additive **v2** namespace | Prefer switching to root (or keep alias if we re-export) |
| Go `github.com/orbit-id/go` | Remains **v1**; take `github.com/orbit-id/go/v2` for v2 |
| CLI default v1 | Defaults to v2; pass explicit v1 flag / `--spec v1` |

Libraries MUST still refuse to reinterpret a 64-bit v1 ID as v2.

## Release gate (slice J)

Before tagging `v2.0.0`:

1. Slices A–I merged; CI green on `main`.
2. Run [Bump release PR](https://github.com/orbit-id/orbit-id/actions/workflows/bump-release-pr.yml)
   with `version=2.0.0`; merge the resulting PR so in-tree versions are `2.0.0`.
3. Spot-check: each language can generate/parse a shared v2 fixture ID from the package root (Go from `/v2`).
4. Create GitHub Release `v2.0.0` (not a pre-release) so `.github/workflows/publish.yml` runs.
5. Verify npm / Maven / crates / Packagist / `proxy.golang.org` for `…/go/v2@v2.0.0`.

## Out of scope for this train

- Datacenter (or other) carve from remaining Reserved 8 bits
- Publishing from pre-release tags
- Changing v1 wire format

## Status

Slice **A** (Spec → Stable) tracked by [#201](https://github.com/orbit-id/orbit-id/issues/201).
Remaining slices B–J follow after A merges.

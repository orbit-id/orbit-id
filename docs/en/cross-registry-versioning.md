# Cross-registry versioning and tagging

[日本語](../ja/cross-registry-versioning.md)

Shared release policy for Orbit ID packages across npm, Maven Central, Go modules,
crates.io, and Packagist. Parent tracker: [#42](https://github.com/orbit-id/orbit-id/issues/42).

npm details live in [npm Trusted Publishing](npm-trusted-publishing.md). This document covers
**how Git tags and package metadata versions relate** across ecosystems.

## Goals

- One monorepo release cut is easy to reason about.
- Align with the existing npm workflow (`.github/workflows/publish.yml` on `v*` tags).
- Allow a single ecosystem to ship a packaging-only fix without forcing every registry.

## Monorepo tagging (decision)

Use **repository-wide SemVer tags** of the form `vX.Y.Z` (example: `v1.0.1`).

| Tag | Role |
| --- | --- |
| `vX.Y.Z` | Release cut tag on [`orbit-id/orbit-id`](https://github.com/orbit-id/orbit-id). Triggers npm Publish when it matches `v*`. Marks a known tree for all ecosystems. |
| `packages/go/vX.Y.Z` | **Additional** Go module version tag (required for the subdirectory module path — see Go below). MUST match the intended Go module SemVer. |

Do **not** invent separate per-language root tags like `java-v1.0.0` or `rust-v1.0.0`. Prefer:

1. Bump that package’s in-tree version metadata.
2. Push `vX.Y.Z` when the monorepo cut should include it (or a packaging-only bump that still uses one tag).
3. For Go, also push `packages/go/vX.Y.Z` for the same `X.Y.Z`.

Pre-release / RC tags MAY use SemVer pre-release forms (`v1.1.0-rc.1`). Registry support for
pre-releases varies; prefer stable `vX.Y.Z` for first Central / crates / Packagist publishes.

## Version metadata per package

Each package owns its registry version in its own manifest. For a **coordinated** release, bump
those fields to the **same** `X.Y.Z` before tagging.

| Ecosystem | Path | Version field | Registry |
| --- | --- | --- | --- |
| npm | `packages/{core,typescript,cli}/package.json` | `"version"` | npm (`@orbit-id/*`) |
| Java | `packages/java/pom.xml` (`io.github.orbit-id:orbit-id`) | `<version>` | Maven Central ([docs](maven-central.md)) |
| Go | (Git tag only; no version in `go.mod` for v0/v1) | tag `packages/go/vX.Y.Z` | `proxy.golang.org` |
| Rust | `packages/rust/Cargo.toml` | `version` | crates.io |
| PHP | `packages/php/composer.json` | no fixed version; Packagist uses Git tags | Packagist |

Optional / local-only packages (`node-lease`, `playground`, `benchmark`) are **not** part of the
public multi-registry release cut unless explicitly called out later.

Independent bumps: if only one ecosystem needs a packaging fix, bump **that** manifest’s version,
tag a new `vX.Y.Z` (and Go subdirectory tag if Go changes), and let other workflows skip already
published versions where supported (npm already skips existing `name@version`).

## Mapping Git tags → registries

| Registry | How version is chosen | Notes |
| --- | --- | --- |
| **npm** | `package.json` `"version"` at the tagged commit | Workflow publishes each workspace if that version is not already on npm. Tag `v1.0.1` does **not** have to equal every package version, but coordinated releases SHOULD. |
| **Maven Central** | `pom.xml` `<version>` | Publish job / manual release should use the same `X.Y.Z` as the release cut when shipping together (#54). |
| **Go** | Git tag `packages/go/vX.Y.Z` | Module path: `github.com/orbit-id/orbit-id/packages/go`. Consumers: `go get github.com/orbit-id/orbit-id/packages/go@vX.Y.Z`. Root-only `vX.Y.Z` is **not** enough for this subdirectory module. Details: [Go module publishing](go-module.md). |
| **crates.io** | `Cargo.toml` `version` | `cargo publish` from `packages/rust` ([docs](crates-io.md)). Prefer matching `vX.Y.Z`. |
| **Packagist** | Git tag on mirror [`orbit-id/php`](https://github.com/orbit-id/php) | Prefer root `vX.Y.Z`; CI subtree-splits `packages/php`. Details: [Packagist publishing](packagist.md). |

## Go module path

Canonical module path (must match `packages/go/go.mod`):

```text
github.com/orbit-id/orbit-id/packages/go
```

Tagging checklist for a Go-visible release:

```bash
# after merging version bumps to main
git tag v1.0.1
git tag packages/go/v1.0.1
git push origin v1.0.1 packages/go/v1.0.1
```

Then verify:

```bash
GOPROXY=https://proxy.golang.org,direct go list -m github.com/orbit-id/orbit-id/packages/go@v1.0.1
```

## Security / provenance expectations

| Registry | Expectation |
| --- | --- |
| **npm** | Trusted Publishing (OIDC) + provenance from public GitHub; see [npm Trusted Publishing](npm-trusted-publishing.md). No long-lived `NPM_TOKEN` in secrets for steady-state publishes. |
| **Maven Central** | Signed artifacts (as required by Central). Credentials / signing keys only via GitHub Environments or OIDC where available; document in #54. |
| **Go** | Integrity via Git + module checksum database (`sum.golang.org`). No separate upload credentials. |
| **crates.io** | crate token or Trusted Publishing if used; never commit tokens. Document in #56. |
| **Packagist** | GitHub integration / update hook; no package payload upload secrets beyond repo access. Document in #57. |

All published artifacts MUST include LICENSE (Apache-2.0) and accurate README / repository metadata.
Security reports: repository Security advisories (see [Security](security.md)).

## Maintainer checklist (coordinated release)

1. Confirm Spec / Library API compatibility for the `X.Y.Z` bump (especially major).
2. Bump in-tree versions for packages you intend to publish (npm / Java / Rust; PHP via tag; Go via subdirectory tag).
3. Run CI green on `main` (`npm` test/build/typecheck/bench + language jobs).
4. Tag and push:
   - always: `vX.Y.Z`
   - if Go should update: `packages/go/vX.Y.Z`
5. Confirm:
   - npm Publish workflow (if any npm package version is new)
   - later: Maven / crates / Packagist workflows or manual steps from #54–#57
6. Spot-check install commands for each registry that shipped.

Packaging-only release (one ecosystem): bump that ecosystem only, still use a new `vX.Y.Z`, and
create `packages/go/vX.Y.Z` only if Go changed.

## Related

- [npm Trusted Publishing](npm-trusted-publishing.md)
- Registry publishing tracker [#42](https://github.com/orbit-id/orbit-id/issues/42)
- Child issues: [#54](https://github.com/orbit-id/orbit-id/issues/54) Maven · [#55](https://github.com/orbit-id/orbit-id/issues/55) Go · [#56](https://github.com/orbit-id/orbit-id/issues/56) crates.io · [#57](https://github.com/orbit-id/orbit-id/issues/57) Packagist

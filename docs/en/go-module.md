# Go module publishing

[日本語](../ja/go-module.md)

Orbit’s Go package is published like PHP: source stays in the monorepo
(`packages/go`), and CI mirrors it to [`orbit-id/go`](https://github.com/orbit-id/go)
for [`proxy.golang.org`](https://proxy.golang.org/).

Tracker: [#55](https://github.com/orbit-id/orbit-id/issues/55) / [#124](https://github.com/orbit-id/orbit-id/issues/124).
Policy: [Cross-registry versioning](cross-registry-versioning.md).

## Architecture

```text
orbit-id/orbit-id  (monorepo source of truth — packages/go)
        │  subtree split on v* / workflow_dispatch
        ▼
orbit-id/go        (read-only-ish mirror)
        │  Git tags vX.Y.Z
        ▼
proxy.golang.org / pkg.go.dev
```

Do **not** open feature PRs against `orbit-id/go` — change `packages/go` in the monorepo.

## Module path

```text
github.com/orbit-id/go/v2
```

Declared in [`packages/go/go.mod`](../../packages/go/go.mod). Import with package
name `orbitid` (see [`packages/go/README.md`](../../packages/go/README.md)).
Legacy v1 is available as package `github.com/orbit-id/go/v2/v1`, and existing
`v1.x` tags on the prior major module path `github.com/orbit-id/go` continue to
resolve.

```bash
# After the coordinated v2.0.0 cut:
go get github.com/orbit-id/go/v2@v2.0.0

# Prior major (unchanged historical tags):
go get github.com/orbit-id/go@v1.1.1
```

The former subdirectory path `github.com/orbit-id/orbit-id/packages/go` is retired.

**Note:** After this module path lands on the `orbit-id/go` mirror `main`, do **not**
cut new `v1.*` tags from that `main` tip — Go rejects a `v1` tag whose `go.mod`
declares `/v2`. Patch v1 from a maintenance commit that still declares
`github.com/orbit-id/go` if needed.
## One-time setup

1. Mirror repo exists: [`orbit-id/go`](https://github.com/orbit-id/go).
2. Create a GitHub PAT (or fine-grained token) with **Contents: Read and write** on
   `orbit-id/go`. Do **not** put `GITHUB_TOKEN` here.
3. Add Actions secret `GO_SPLIT_TOKEN` on `orbit-id/orbit-id` (the same PAT as
   `PHP_SPLIT_TOKEN` works if it can write both mirrors).
4. Run **Publish** → `go` job (`workflow_dispatch`) once to populate `main`.

## Workflow

The `go` job in [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml)
(via [`.github/actions/publish-go`](../../.github/actions/publish-go/action.yml)):

- On `v*` tags: subtree-split `packages/go` → force-push `main` + the same tag on `orbit-id/go`
- On `workflow_dispatch`: force-push `main` only (no tag unless the run is a tag event)

## Verify

```bash
# After v2.0.0 is published:
GOPROXY=https://proxy.golang.org,direct \
  go list -m github.com/orbit-id/go/v2@v2.0.0

# Prior major:
GOPROXY=https://proxy.golang.org,direct \
  go list -m github.com/orbit-id/go@v1.1.1
```

First fetch after a new tag can take a few minutes for the proxy to index. Use
`GOPROXY=direct` if you need an immediate check against GitHub.

## Maintainer checklist

1. Merge Go changes to `main`.
2. Ensure `GO_SPLIT_TOKEN` is set.
3. Tag and push monorepo `vX.Y.Z` (Publish `go` job mirrors it).
4. Confirm [`orbit-id/go` tags](https://github.com/orbit-id/go/tags) and
   [pkg.go.dev](https://pkg.go.dev/github.com/orbit-id/go/v2).

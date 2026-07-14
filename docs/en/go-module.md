# Go module publishing

[日本語](../ja/go-module.md)

Orbit’s Go package is a **subdirectory module**. There is no separate upload
registry — consumers use Git tags via [`proxy.golang.org`](https://proxy.golang.org/).

Tracker: [#55](https://github.com/orbit-id/orbit-id/issues/55). Policy:
[Cross-registry versioning](cross-registry-versioning.md).

## Module path

```text
github.com/orbit-id/orbit-id/packages/go
```

Declared in [`packages/go/go.mod`](../../packages/go/go.mod). Import with package
name `orbitid` (see [`packages/go/README.md`](../../packages/go/README.md)).

## Tagging

For each Go-visible SemVer `X.Y.Z`:

```bash
git tag vX.Y.Z                    # monorepo release cut (also used by npm)
git tag packages/go/vX.Y.Z        # required for this module path
git push origin vX.Y.Z packages/go/vX.Y.Z
```

Root `vX.Y.Z` alone is **not** enough for `go get
…/packages/go@vX.Y.Z`.

## Verify

```bash
GOPROXY=https://proxy.golang.org,direct \
  go list -m github.com/orbit-id/orbit-id/packages/go@v1.0.1
```

First fetch after a new tag can take a few minutes for the proxy to index. Use
`GOPROXY=direct` if you need an immediate check against GitHub.

## Maintainer checklist

1. Merge Go changes to `main`.
2. Push `packages/go/vX.Y.Z` (and usually `vX.Y.Z`) per the cross-registry policy.
3. Run `go list -m` / a sample `go get` in a scratch module.
4. Confirm LICENSE + README remain in `packages/go/`.

No GitHub Actions secrets are required for Go module publishing.

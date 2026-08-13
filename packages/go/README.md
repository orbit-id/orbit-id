# Orbit ID for Go

Go implementation of Orbit ID.

- **v2** (default): module `github.com/orbit-id/go/v2` — Stable 128-bit (`*big.Int`)
- **v1**: package `github.com/orbit-id/go/v2/v1` — stable 64-bit (`uint64`); also still
  available via the prior major module `github.com/orbit-id/go@v1.x`

Consumer migration: [1.x → 2.0.0](../../docs/en/migration-1x-to-2.0.0.md). Registry `2.0.0` cut is slice J of the [promotion plan](../../docs/en/v2-package-2.0.0.md).

## Install

```sh
# After the v2.0.0 registry cut:
go get github.com/orbit-id/go/v2@v2.0.0
```

Until then, depend on a commit / pseudo-version of this monorepo path, or use a
local `replace`.

```go
import (
    "math/big"

    orbitid "github.com/orbit-id/go/v2"
    v1 "github.com/orbit-id/go/v2/v1"
)

// v2 (default)
generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 7})
if err != nil {
    panic(err)
}
id, err := generator.Generate(1) // *big.Int
_ = id

// v1
v1Gen, err := v1.NewGenerator(v1.GeneratorOptions{Node: 7})
if err != nil {
    panic(err)
}
v1ID, err := v1Gen.Generate(1) // uint64
_ = v1ID
```

## Version tags

The Go consumer module is published from the [`orbit-id/go`](https://github.com/orbit-id/go)
mirror (subtree of `packages/go`). Tags match the monorepo release tags. See
[Go module publishing](../../docs/en/go-module.md).

## Layout

v2:

```text
formatVersion: 4 | timestamp: 48 | type: 16 | node: 16 | sequence: 16
| region: 4 | tenant: 16 | reserved: 8
```

v1:

```text
timestamp: 41 | type: 6 | node: 7 | sequence: 10
```

Conformance fixtures live in [`../../spec/conformance/`](../../spec/conformance/).

## License

Apache-2.0. See [LICENSE](LICENSE).

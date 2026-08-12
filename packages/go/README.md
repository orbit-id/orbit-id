# Orbit ID for Go

Go implementation of the Orbit ID v1 unsigned 64-bit format.

Source of truth lives in the monorepo under `packages/go`. Published module path is
the [`orbit-id/go`](https://github.com/orbit-id/go) mirror (same pattern as Packagist /
`orbit-id/php`).

## Install

```bash
go get github.com/orbit-id/go@v1.2.0
```

Import as package `orbitid`:

```go
import (
    "fmt"

    orbitid "github.com/orbit-id/go"
)

func main() {
    generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 7})
    if err != nil {
        panic(err)
    }
    id, err := generator.Generate(1)
    if err != nil {
        panic(err)
    }
    fmt.Println(orbitid.ToDecimalString(id))
}
```

## Version tags

On each monorepo `vX.Y.Z` release, CI mirrors `packages/go` to
[`orbit-id/go`](https://github.com/orbit-id/go) and pushes the same tag there.
Consumers use that mirror tag via [`proxy.golang.org`](https://proxy.golang.org/).

See [Cross-registry versioning](../../docs/en/cross-registry-versioning.md) and
[Go module publishing](../../docs/en/go-module.md).

## API notes

Use `Encode` / `Decode` for fields, `Parse` for a `uint64` or canonical decimal
string, and `IsValid` for syntactic validation only. Decimal strings must be
unsigned and canonical (no signs, whitespace, or leading zeroes).

## Orbit ID v2 (alpha)

The Draft 128-bit format ([spec](../../docs/en/orbit-id-v2.md)) is implemented under
`internal/v2` and is **not part of the public API** for the Go 1.x module — see
[Library API](../../docs/en/library-api.md) ("not public, `internal/v2` in alpha"). It is
exercised by this module's own conformance tests against `spec/conformance/*.v2.json` and
will become the default at the `/v2` module path in a later major version.

## Test

```sh
go test ./...
```

# Orbit ID for Go

Go implementation of the Orbit ID v1 unsigned 64-bit format.

Source of truth lives in the monorepo under `packages/go`. Published module path is
the [`orbit-id/go`](https://github.com/orbit-id/go) mirror (same pattern as Packagist /
`orbit-id/php`).

## Install

```bash
go get github.com/orbit-id/go@v1.1.0
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

## Test

```sh
go test ./...
```

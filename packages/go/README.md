# Orbit ID for Go

Go implementation of the Orbit ID v1 unsigned 64-bit format.

## Install

Module path (must match `go.mod`):

```text
github.com/orbit-id/orbit-id/packages/go
```

```bash
go get github.com/orbit-id/orbit-id/packages/go@v1.0.1
```

Import as package `orbitid`:

```go
import (
    "fmt"

    orbitid "github.com/orbit-id/orbit-id/packages/go"
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

This is a **subdirectory module**. Published versions are Git tags of the form
`packages/go/vX.Y.Z` (not only the root `vX.Y.Z` tag).

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

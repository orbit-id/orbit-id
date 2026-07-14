# Orbit ID for Go

Go implementation of the Orbit ID v1 unsigned 64-bit format.

```go
generator, err := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 7})
if err != nil {
    panic(err)
}
id, err := generator.Generate(1)
if err != nil {
    panic(err)
}
fmt.Println(orbitid.ToDecimalString(id))
```

Use `Encode` / `Decode` for fields, `Parse` for a `uint64` or canonical decimal
string, and `IsValid` for syntactic validation only. Decimal strings must be
unsigned and canonical (no signs, whitespace, or leading zeroes).

Run the conformance suite from this directory:

```sh
go test ./...
```

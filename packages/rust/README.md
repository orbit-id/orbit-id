# orbit-id

Rust implementation of Orbit ID v1: unsigned 64-bit, time-sortable IDs shared
with the TypeScript reference implementation.

## Install

```toml
[dependencies]
orbit-id = "1"
```

## API

```rust
use orbit_id::{encode, decode, OrbitFields};

let id = encode(OrbitFields {
    timestamp: 0, // milliseconds since 2026-01-01T00:00:00.000Z
    r#type: 1,   // generators reserve type 0
    node: 7,
    sequence: 42,
}).unwrap();

assert_eq!(decode(id).sequence, 42);
```

Use `from_decimal_string`, `to_decimal_string`, `parse`, `to_hex_string`, and
`is_valid` for canonical decimal string handling.

`OrbitGenerator` is synchronous and internally synchronized with a `Mutex`.
Create it with `OrbitGenerator::new(GeneratorOptions::new(node))`; configure
its clock, rollback tolerance (default: 5000 ms), and sequence exhaustion mode
through `GeneratorOptions`.

## Layout

```text
timestamp: 41 bits | type: 6 bits | node: 7 bits | sequence: 10 bits
```

The crate validates the shared fixtures in
[`../../spec/conformance/`](../../spec/conformance/) with `cargo test`.

## License

Apache-2.0. See [LICENSE](LICENSE).

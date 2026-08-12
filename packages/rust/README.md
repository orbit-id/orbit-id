# orbit-id

Rust implementation of Orbit ID.

- **v1** (crate root): stable unsigned 64-bit, time-sortable IDs
- **v2** (`orbit_id::v2`): Draft 128-bit layout (`v2.0.0-alpha`)

## Install

```toml
[dependencies]
orbit-id = "1"
```

```bash
cargo add orbit-id
```

Publishing: [crates.io publishing](../../docs/en/crates-io.md) ·
[Cross-registry versioning](../../docs/en/cross-registry-versioning.md).

## API

```rust
use orbit_id::{encode, decode, OrbitFields};
use orbit_id::v2;

let v1 = encode(OrbitFields {
    timestamp: 0, // milliseconds since 2026-01-01T00:00:00.000Z
    r#type: 1,   // generators reserve type 0
    node: 7,
    sequence: 42,
}).unwrap();
assert_eq!(decode(v1).sequence, 42);

let v2_id = v2::OrbitGenerator::new(v2::GeneratorOptions::new(7))
    .unwrap()
    .generate(1)
    .unwrap();
assert_eq!(v2::get_format_version(v2_id).unwrap(), 1);
```

Use `from_decimal_string`, `to_decimal_string`, `parse`, `to_hex_string`, and
`is_valid` for canonical decimal string handling (v2 equivalents live under
`orbit_id::v2`).

`OrbitGenerator` is synchronous and internally synchronized with a `Mutex`.

## Layout

v1:

```text
timestamp: 41 bits | type: 6 bits | node: 7 bits | sequence: 10 bits
```

v2 Draft:

```text
formatVersion: 4 | timestamp: 48 | type: 16 | node: 16 | sequence: 16 | reserved: 28
```

The crate validates the shared fixtures in
[`../../spec/conformance/`](../../spec/conformance/) with `cargo test`.

## License

Apache-2.0. See [LICENSE](LICENSE).

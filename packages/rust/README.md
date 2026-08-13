# orbit-id

Rust implementation of Orbit ID.

- **v2** (crate root / `orbit_id::v2`): Stable unsigned 128-bit, time-sortable IDs
- **v1** (`orbit_id::v1`): stable unsigned 64-bit, time-sortable IDs

Consumer migration: [1.x → 2.0.0](../../docs/en/migration-1x-to-2.0.0.md). Registry `2.0.0` cut is slice J of the [promotion plan](../../docs/en/v2-package-2.0.0.md).

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
use orbit_id::{encode, decode, OrbitFields, OrbitGenerator, GeneratorOptions};
use orbit_id::v1;

let v2_id = OrbitGenerator::new(GeneratorOptions::new(7))
    .unwrap()
    .generate(1)
    .unwrap();
assert_eq!(orbit_id::get_format_version(v2_id).unwrap(), 1);

let fields = OrbitFields {
    format_version: orbit_id::ISSUED_FORMAT_VERSION,
    timestamp: 0, // milliseconds since 2026-01-01T00:00:00.000Z
    r#type: 1,   // generators reserve type 0
    node: 7,
    sequence: 42,
    region: 0,
    tenant: 0,
    reserved: 0,
};
let encoded = encode(fields).unwrap();
assert_eq!(decode(encoded).unwrap().sequence, 42);

let v1 = v1::encode(v1::OrbitFields {
    timestamp: 0,
    r#type: 1,
    node: 7,
    sequence: 42,
}).unwrap();
assert_eq!(v1::decode(v1).sequence, 42);
```

Use `from_decimal_string`, `to_decimal_string`, `parse`, `to_hex_string`, and
`is_valid` for canonical decimal string handling (v1 equivalents live under
`orbit_id::v1`).

`OrbitGenerator` is synchronous and internally synchronized with a `Mutex`.

## Layout

v2:

```text
formatVersion: 4 | timestamp: 48 | type: 16 | node: 16 | sequence: 16
| region: 4 | tenant: 16 | reserved: 8
```

v1:

```text
timestamp: 41 bits | type: 6 bits | node: 7 bits | sequence: 10 bits
```

The crate validates the shared fixtures in
[`../../spec/conformance/`](../../spec/conformance/) with `cargo test`.

## License

Apache-2.0. See [LICENSE](LICENSE).

# Migrating from package 1.x to 2.0.0

[日本語](../ja/migration-1x-to-2.0.0.md)

Related: [Library API](library-api.md) · [Package `2.0.0` promotion plan](v2-package-2.0.0.md) ·
[Cross-registry versioning](cross-registry-versioning.md) ·
[CHANGELOG](../../CHANGELOG.md).

This page is the consumer guide for the coordinated package major **`2.0.0`**: the public default
API becomes **Orbit ID v2** (128-bit). Orbit ID **v1** (64-bit) remains available under an explicit
namespace / flag / prior Go major.

Registry versions stay `1.1.x` until slice **J** cuts `v2.0.0`. In-tree sources already expose the
2.0.0 entry points (slices B–H).

## Breaking changes

1. **Root API is v2.** Imports that previously produced 64-bit IDs now produce 128-bit IDs (except
   when you opt into the retained v1 surface).
2. **Do not reinterpret v1 IDs as v2.** A 64-bit decimal string parsed with the v2 API fails closed
   (`INVALID_FORMAT_VERSION`). Migrate storage / dual-write at the application layer.
3. **Wider ranges.** Type / Node / Sequence are 16-bit; Region (`0..15`) and Tenant (`0..65535`) are
   first-class; issued IDs use `FormatVersion = 1` and `Reserved = 0`.
4. **Wire / JSON.** Canonical form remains an unsigned decimal string, but strings are longer.
   Binary form is **16-byte big-endian** (not 8).
5. **Go module path.** Consumers use `github.com/orbit-id/go/v2`. The prior major
   `github.com/orbit-id/go@v1.x` still resolves historical tags.
6. **CLI / playground default.** `orbit-id` and the playground default to v2; pass `--spec v1` (or
   select Format v1) for the 64-bit layout.

## Per-language entry points

| Language | 1.x default (v1) | 2.0.0 default (v2) | Retained v1 |
| --- | --- | --- | --- |
| TypeScript | `@orbit-id/core` / `@orbit-id/typescript` root | same roots → v2; `@orbit-id/core/v2` alias | `v1` namespace / `@orbit-id/core/v1` |
| Java | `com.github.orbitid` | same package → v2 | `com.github.orbitid.v1` |
| Rust | crate root | crate root → v2; `orbit_id::v2` alias | `orbit_id::v1` |
| PHP | `OrbitId\` | same namespace → v2; `OrbitId\V2\` class alias | `OrbitId\V1\` |
| Go | `github.com/orbit-id/go` | `github.com/orbit-id/go/v2` | `github.com/orbit-id/go/v2/v1` or `github.com/orbit-id/go@v1.x` |
| CLI | default v1 | default v2 | `--spec v1` |

### TypeScript

```ts
import { parse, OrbitGeneratorV2 } from "@orbit-id/core"; // v2
import * as v1 from "@orbit-id/core/v1";

const id = new OrbitGeneratorV2({ node: 7 }).generate(1);
parse(id.toString(10)); // v2 fields

v1.parse("140612821619842090"); // v1 only
```

### Java

```java
import com.github.orbitid.OrbitGenerator; // v2 → BigInteger

var v2 = new OrbitGenerator(7).generate(1);
var v1 = new com.github.orbitid.v1.OrbitGenerator(7).generate(1);
```

### Rust

```rust
use orbit_id::{encode, OrbitFields, OrbitGenerator, GeneratorOptions};
use orbit_id::v1;

let id = OrbitGenerator::new(GeneratorOptions::new(7)).unwrap().generate(1).unwrap();
let legacy = v1::encode(v1::OrbitFields { timestamp: 0, r#type: 1, node: 7, sequence: 42 }).unwrap();
```

### PHP

```php
use OrbitId\OrbitGenerator;              // v2
use OrbitId\V1\OrbitGenerator as V1Gen;

$id = (new OrbitGenerator(['node' => 7]))->generate(1);
$v1 = (new V1Gen(['node' => 7]))->generate(1);
```

### Go

```go
import (
    orbitid "github.com/orbit-id/go/v2"
    v1 "github.com/orbit-id/go/v2/v1"
)

g, _ := orbitid.NewGenerator(orbitid.GeneratorOptions{Node: 7})
id, _ := g.Generate(1) // *big.Int

g1, _ := v1.NewGenerator(v1.GeneratorOptions{Node: 7})
id1, _ := g1.Generate(1) // uint64
```

After the registry cut:

```bash
go get github.com/orbit-id/go/v2@v2.0.0
```

### CLI

```bash
# v2 (default)
orbit-id parse 21267647932558653967613957625668960256
orbit-id generate --type 1 --node 7

# v1
orbit-id parse --spec v1 140612821619842090
orbit-id generate --spec v1 --type 1 --node 7
```

## Error codes added for v2

`INVALID_FORMAT_VERSION`, `INVALID_REGION`, `INVALID_TENANT`, `INVALID_RESERVED` (plus the shared
v1 codes). See [Library API](library-api.md).

## Suggested application migration

1. Keep reading existing v1 columns with the **v1** API.
2. Issue new rows with the **v2** API (or dual-write during transition).
3. Stop treating ID width as fixed 8 bytes / `number` in JS — use decimal strings or language-native
   wide integers (`bigint`, `BigInteger`, `u128`, `*big.Int`, decimal strings in PHP).

# パッケージ 1.x → 2.0.0 移行ガイド

[English](../en/migration-1x-to-2.0.0.md)

関連: [Library API](library-api.md) · [パッケージ `2.0.0` 昇格計画](v2-package-2.0.0.md) ·
[横断の version / tagging 方針](cross-registry-versioning.md) ·
[CHANGELOG](../../CHANGELOG.md)。

協調 major **`2.0.0`** 向けの利用者ガイドです。公開既定 API は **Orbit ID v2**（128-bit）になり、
Orbit ID **v1**（64-bit）は明示的な名前空間 / フラグ / 旧 Go major で利用できます。

レジストリ上のバージョンはスライス **J** で `v2.0.0` を切るまで `1.1.x` のままです。in-tree の
エントリポイントはすでに 2.0.0 形です（スライス B–H）。

## 破壊的変更

1. **ルート API が v2。** これまで 64-bit を返していた import は、v1 面を明示しない限り 128-bit を返します。
2. **v1 ID を v2 として再解釈しない。** 64-bit の十進文字列を v2 API で parse すると
   `INVALID_FORMAT_VERSION` で失敗します。移行はアプリ / ストレージ側で行います。
3. **レンジ拡大。** Type / Node / Sequence は 16-bit。Region（`0..15`）と Tenant（`0..65535`）が
   第一級。発行 ID は `FormatVersion = 1`、`Reserved = 0`。
4. **ワイヤ / JSON。** 正規形は符号なし十進文字列のままですが桁が増えます。バイナリは
   **16-byte big-endian**（8-byte ではない）。
5. **Go モジュールパス。** 利用者は `github.com/orbit-id/go/v2`。旧 major
   `github.com/orbit-id/go@v1.x` の既存タグは引き続き解決できます。
6. **CLI / playground の既定。** 既定は v2。`--spec v1`（または Format v1）で 64-bit を使います。

## 言語別エントリポイント

| 言語 | 1.x 既定（v1） | 2.0.0 既定（v2） | 残す v1 |
| --- | --- | --- | --- |
| TypeScript | `@orbit-id/core` / `@orbit-id/typescript` ルート | 同ルート → v2；`@orbit-id/core/v2` エイリアス | `v1` 名前空間 / `@orbit-id/core/v1` |
| Java | `com.github.orbitid` | 同パッケージ → v2 | `com.github.orbitid.v1` |
| Rust | crate root | crate root → v2；`orbit_id::v2` エイリアス | `orbit_id::v1` |
| PHP | `OrbitId\` | 同名前空間 → v2；`OrbitId\V2\` class alias | `OrbitId\V1\` |
| Go | `github.com/orbit-id/go` | `github.com/orbit-id/go/v2` | `github.com/orbit-id/go/v2/v1` または `github.com/orbit-id/go@v1.x` |
| CLI | 既定 v1 | 既定 v2 | `--spec v1` |

### TypeScript

```ts
import { parse, OrbitGeneratorV2 } from "@orbit-id/core"; // v2
import * as v1 from "@orbit-id/core/v1";

const id = new OrbitGeneratorV2({ node: 7 }).generate(1);
parse(id.toString(10)); // v2 フィールド

v1.parse("140612821619842090"); // v1 のみ
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

レジストリ公開後:

```bash
go get github.com/orbit-id/go/v2@v2.0.0
```

### CLI

```bash
# v2（既定）
orbit-id parse 21267647932558653967613957625668960256
orbit-id generate --type 1 --node 7

# v1
orbit-id parse --spec v1 140612821619842090
orbit-id generate --spec v1 --type 1 --node 7
```

## v2 で追加されるエラーコード

`INVALID_FORMAT_VERSION` / `INVALID_REGION` / `INVALID_TENANT` / `INVALID_RESERVED`
（加えて v1 と共有のコード）。詳細は [Library API](library-api.md)。

## 推奨するアプリ側の移行

1. 既存の v1 列は **v1** API で読み続ける。
2. 新規行は **v2** API で発行する（移行中は dual-write も可）。
3. ID 幅を固定 8 バイト / JS の `number` とみなさない — 十進文字列か言語ネイティブの広整数
   （`bigint` / `BigInteger` / `u128` / `*big.Int` / PHP の十進文字列）を使う。

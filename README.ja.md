# Orbit ID

[English](README.md)

[![CI](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml/badge.svg)](https://github.com/orbit-id/orbit-id/actions/workflows/ci.yml)
[![npm @orbit-id/core](https://img.shields.io/npm/v/@orbit-id/core?label=%40orbit-id%2Fcore)](https://www.npmjs.com/package/@orbit-id/core)
[![npm @orbit-id/typescript](https://img.shields.io/npm/v/@orbit-id/typescript?label=%40orbit-id%2Ftypescript)](https://www.npmjs.com/package/@orbit-id/typescript)
[![npm @orbit-id/cli](https://img.shields.io/npm/v/@orbit-id/cli?label=%40orbit-id%2Fcli)](https://www.npmjs.com/package/@orbit-id/cli)
[![Maven Central](https://img.shields.io/maven-central/v/io.github.orbit-id/orbit-id?label=Maven%20Central)](https://central.sonatype.com/artifact/io.github.orbit-id/orbit-id)
[![crates.io](https://img.shields.io/crates/v/orbit-id)](https://crates.io/crates/orbit-id)
[![Packagist](https://img.shields.io/packagist/v/orbit-id/php?label=Packagist)](https://packagist.org/packages/orbit-id/php)
[![Go](https://img.shields.io/github/v/tag/orbit-id/go?filter=v*&label=go&logo=go)](https://pkg.go.dev/github.com/orbit-id/go/v2)
[![License](https://img.shields.io/badge/license-Apache%202.0-blue.svg)](LICENSE)

Playground: [orbit-id.github.io/orbit-id](https://orbit-id.github.io/orbit-id/)

Orbit ID は、分散環境で一意かつおおむね時系列な ID を生成するための仕様です。
**v2**（128-bit, Stable）が `2.0.0` 向けのパッケージルート既定で、**v1**（64-bit）はレガシー用に
残ります。ID には発行時刻などのフィールドが埋め込まれるため、DB 照会なしで解析できます。

> [!IMPORTANT]
> パッケージルートの既定は **Orbit ID v2** です。v1 は明示的な名前空間 / `--spec v1` で利用できます。
> [1.x → 2.0.0 移行ガイド](docs/ja/migration-1x-to-2.0.0.md) を参照。レジストリの `2.0.0` カットは
> [昇格計画](docs/ja/v2-package-2.0.0.md) で追跡します。

## 特徴

- 中央の採番処理を経由せず、各ノードで生成可能
- ミリ秒単位でおおむね時系列に並ぶ
- ID から timestamp / type / node / sequence（v2 では region / tenant も）を復元可能
- v2: 1 ノードあたり最大 65,536 ID/ms、65,536 type、65,536 node、Region `0..15`、Tenant `0..65535`
- v1（レガシー）: 1 ノードあたり最大 1,024 ID/ms、64 type、128 node
- 共通 Orbit Epoch: `2026-01-01T00:00:00.000Z`

## Orbit ID v2（既定）

```text
formatVersion: 4 | timestamp: 48 | type: 16 | node: 16 | sequence: 16
| region: 4 | tenant: 16 | reserved: 8
```

詳細レイアウト: [Orbit ID v2 Specification](docs/ja/orbit-id-v2.md)。

## Orbit ID v1（レガシー）

```text
MSB                                                             LSB
63                                                               0
┌──────────────────────────┬──────────┬───────────┬──────────────┐
│ Timestamp                │ Type     │ Node      │ Sequence     │
│ 41 bits                  │ 6 bits   │ 7 bits    │ 10 bits      │
└──────────────────────────┴──────────┴───────────┴──────────────┘
63                        23 22      17 16       10 9             0
```

| Field | Bits | Range | Meaning |
| --- | ---: | ---: | --- |
| Timestamp | 41 | `0..2,199,023,255,551` | Orbit Epoch からの経過ミリ秒 |
| Type | 6 | `0..63` | 論理エンティティ種別 |
| Node | 7 | `0..127` | 発行ノード |
| Sequence | 10 | `0..1,023` | 同一ノード・同一ミリ秒内の連番 |

Orbit Epoch:

```text
2026-01-01T00:00:00.000Z
```

エンコード式:

```text
id = (timestamp << 23) | (type << 17) | (node << 10) | sequence
```

## 取り扱い

正規の値表現は符号なし整数の **10 進文字列**です（v2: 128-bit、v1: 64-bit）。
JavaScript / TypeScript では `number` ではなく `bigint` を使います。バイナリは v2 が
16-byte BE、v1 が 8-byte BE です。

```json
{
  "id": "21267647932558653967613957625668960256"
}
```

ID は発行時刻などを隠しません。また、推測耐性、改ざん検知、発行元の真正性を提供しません。
外部公開時に情報を秘匿したい用途や認可トークンには使用しないでください。

## ドキュメント

- [Orbit ID v2 Specification](docs/ja/orbit-id-v2.md)（Stable・既定）
- [Orbit ID v1 Specification](docs/ja/orbit-id-v1.md)（レガシー）
- [1.x → 2.0.0 移行ガイド](docs/ja/migration-1x-to-2.0.0.md)
- [CHANGELOG](CHANGELOG.md)
- [Canonical Test Vectors](docs/ja/test-vectors.md)
- [Node Management](docs/ja/node-management.md)
- [Design Decisions](docs/ja/design-decisions.md)
- [Design Decisions（v2）](docs/ja/design-decisions-v2.md)
- [Orbit ID v2 (128-bit) を採用する理由](docs/ja/why-128bit.md)
- [v2 alpha 終了 / 2.0.0 昇格](docs/ja/v2-alpha-exit.md)
- [パッケージ `2.0.0` 昇格計画](docs/ja/v2-package-2.0.0.md)
- [Library API](docs/ja/library-api.md)
- [npm Trusted Publishing](docs/ja/npm-trusted-publishing.md)
- [横断の version / tagging 方針](docs/ja/cross-registry-versioning.md)
- [Maven Central 公開](docs/ja/maven-central.md)
- [Go モジュール公開](docs/ja/go-module.md)
- [crates.io 公開](docs/ja/crates-io.md)
- [Packagist 公開](docs/ja/packagist.md)
- [Roadmap](docs/ja/roadmap.md)
- [Contributing](docs/ja/contributing.md)
- [Security Policy](docs/ja/security.md)

## 現在のスコープ

パッケージルートの既定は Orbit ID v2 です。協調レジストリカット後は `2.0.0` をインストールします
（それまでは in-tree / 現行 npm major でも v2 ルート API です）:

```bash
npm install @orbit-id/typescript
npm install -g @orbit-id/cli
orbit-id parse 21267647932558653967613957625668960256
# レガシー v1:
orbit-id parse --spec v1 140612821619842090
```

```go
go get github.com/orbit-id/go/v2@v2.0.0 // v2.0.0 レジストリカット後
```

移行の詳細: [1.x → 2.0.0](docs/ja/migration-1x-to-2.0.0.md)。パッケージは [`packages/`](packages/)、
公開手順は [npm Trusted Publishing](docs/ja/npm-trusted-publishing.md) と
[横断の version / tagging 方針](docs/ja/cross-registry-versioning.md) を参照してください。
Redis を使う場合も Node lease の管理に限定し、ID 生成は各 Orbit ノード内で完結させます。

## License

[Apache License, Version 2.0](LICENSE) のもとで公開しています。
Copyright 2026 ponstream24.

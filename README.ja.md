# Orbit ID

[English](README.md)

Orbit ID は、分散環境で一意な 64-bit ID を生成するための仕様です。
ID の中に発行時刻、エンティティ種別、発行ノード、同一ミリ秒内の連番を格納し、
データベースへ問い合わせずにそれらを解析できます。

> [!IMPORTANT]
> Orbit ID v1 は stable（`v1.0.0`）です。[`@orbit-id/typescript`](https://www.npmjs.com/package/@orbit-id/typescript)
> または CLI [`@orbit-id/cli`](https://www.npmjs.com/package/@orbit-id/cli) を使えます。

## 特徴

- 中央の採番処理を経由せず、各ノードで生成可能
- ミリ秒単位でおおむね時系列に並ぶ
- ID から timestamp / type / node / sequence を復元可能
- 1 ノードあたり最大 1,024 ID/ms（理論上 1,024,000 ID/s）
- 最大 64 type、128 node
- 2026-01-01 から約 69.7 年間利用可能

## Orbit ID v1

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

Orbit ID の正規の値表現は unsigned 64-bit integer です。JavaScript / TypeScript では
`number` ではなく `bigint` を使用し、JSON や HTTP API では 10 進文字列として渡します。

```json
{
  "id": "140612821619842090"
}
```

ID は発行時刻などを隠しません。また、推測耐性、改ざん検知、発行元の真正性を提供しません。
外部公開時に情報を秘匿したい用途や認可トークンには使用しないでください。

## ドキュメント

- [Orbit ID v1 Specification](docs/ja/orbit-id-v1.md)
- [Canonical Test Vectors](docs/ja/test-vectors.md)
- [Type Registry](docs/ja/type-registry.md)
- [Node Management](docs/ja/node-management.md)
- [Design Decisions](docs/ja/design-decisions.md)
- [Library API](docs/ja/library-api.md)
- [npm Trusted Publishing](docs/ja/npm-trusted-publishing.md)
- [横断の version / tagging 方針](docs/ja/cross-registry-versioning.md)
- [Maven Central 公開](docs/ja/maven-central.md)
- [Go モジュール公開](docs/ja/go-module.md)
- [Stable v1 昇格基準](docs/ja/stable-release-criteria.md)
- [Roadmap](docs/ja/roadmap.md)
- [Contributing](docs/ja/contributing.md)
- [Security Policy](docs/ja/security.md)

## 現在のスコープ

Orbit ID v1 は npm で利用できます。

```bash
npm install @orbit-id/typescript
npm install -g @orbit-id/cli
orbit-id parse 140612821619842090
```

パッケージは [`packages/`](packages/) 、公開手順は
[npm Trusted Publishing](docs/ja/npm-trusted-publishing.md) と
[横断の version / tagging 方針](docs/ja/cross-registry-versioning.md) を参照してください。
Redis を使う場合も Node lease の管理に限定し、ID 生成は各 Orbit ノード内で完結させます。

## License

[Apache License, Version 2.0](LICENSE) のもとで公開しています。
Copyright 2026 ponstream24.

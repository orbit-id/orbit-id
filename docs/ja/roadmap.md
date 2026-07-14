# Roadmap

[English](../en/roadmap.md)

Orbit は、単なる ID 生成ライブラリではなく、Snowflake や ULID のように **仕様・実装・テストを備えた
ID 生成アルゴリズム** として育てることを目指します。

## 短期（仕様）

- [x] Orbit ID v1 の bit layout と epoch の Draft
- [x] Canonical test vectors
- [x] Type registry Draft と Node 管理ガイド
- [x] Type の正式割当
- [x] 本番の Node 割当方式
- [x] Node 再利用の quarantine 期間
- [x] 時計巻き戻りの既定許容時間
- [x] Conformance / test suite
- [x] OSS ライセンスの決定（Apache-2.0）

## ライブラリ API

各言語パッケージで最低限揃える表面（文書化済み・TypeScript で実装済み）:

```text
generate(type)
parse(id)
getTimestamp(id)
getType(id)
getNode(id)
getSequence(id)
isValid(id)
```

詳細は [Library API](library-api.md) を参照。

## 実装

- [x] TypeScript (`@orbit-id/core`, `@orbit-id/typescript`)
- Java
- Go
- Rust
- PHP
- [x] CLI (`@orbit-id/cli`)
- Playground
- Benchmarks

## パッケージ公開

- [x] npm (`@orbit-id/core`, `@orbit-id/typescript`, `@orbit-id/cli`)
- Maven、Go modules、crates.io、Packagist など
- 任意の control plane としての Redis ベース Node lease
- Orbit ノードサービス（発行経路はローカル完結。Redis は hot path に置かない）

## リポジトリ構成（モノレポ）

```text
orbit-id/
├── packages/
│   ├── core          ← 公開済み
│   ├── typescript    ← 公開済み
│   ├── cli           ← 公開済み
│   ├── java
│   ├── go
│   ├── rust
│   ├── php
│   └── playground
├── spec/
├── benchmark/
└── docs/
```

`packages/core` / `typescript` / `cli` は npm 公開済み。残りの言語パッケージ、playground、
`benchmark/` は phase-3 の作業です。

## Stable release

`draft` から `v1.0.0` への昇格基準は [Stable v1 昇格基準](stable-release-criteria.md) を参照。
stable `v1.0.0` はタグ済みです。

# Roadmap

[English](../../ROADMAP.md)

Orbit は、単なる ID 生成ライブラリではなく、Snowflake や ULID のように **仕様・実装・テストを備えた
ID 生成アルゴリズム** として育てることを目指します。

## 短期（仕様）

- [x] Orbit ID v1 の bit layout と epoch の Draft
- [x] Canonical test vectors
- [x] Type registry Draft と Node 管理ガイド
- [x] Type の正式割当
- [ ] 本番の Node 割当方式と再利用待機時間
- [ ] 時計巻き戻りの既定許容時間
- [ ] Conformance / test suite
- [ ] OSS ライセンスの決定（例: MIT）

## ライブラリ API（予定）

各言語パッケージで最低限揃える表面:

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

## 実装（予定）

- TypeScript
- Java
- Go
- Rust
- PHP
- CLI
- Playground
- Benchmarks

## パッケージ公開（後続）

- npm、Maven、Go modules、crates.io、Packagist など
- 任意の control plane としての Redis ベース Node lease
- Orbit ノードサービス（発行経路はローカル完結。Redis は hot path に置かない）

## リポジトリ構成（予定モノレポ）

```text
orbit/
├── packages/
│   ├── core
│   ├── typescript
│   ├── java
│   ├── go
│   ├── rust
│   ├── php
│   ├── cli
│   └── playground
├── spec/
├── benchmark/
└── docs/
```

`packages/` と `benchmark/` 配下は、仕様が実装可能な安定度になるまでのプレースホルダーです。

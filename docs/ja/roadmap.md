# Roadmap

[English](../en/roadmap.md)

Orbit は、単なる ID 生成ライブラリではなく、Snowflake や ULID のように **仕様・実装・テストを備えた
ID 生成アルゴリズム** として育てることを目指します。

## 短期（仕様） — phase 0–1

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

## Phase 2 — 参照実装（完了）

- [x] モノレポ scaffold + CI
- [x] `@orbit-id/core`（encode / decode / generator + conformance）
- [x] `@orbit-id/typescript`
- [x] `@orbit-id/cli`
- [x] npm Trusted Publishing と公開リリース

## Phase 3 — 拡張

GitHub の `phase-3` ラベルで追跡します。

| 作業 | Issue | Status |
| --- | --- | --- |
| `benchmark/` の計測枠組み | [#18](https://github.com/ponstream24/orbit-id/issues/18) | リポジトリ内完了 |
| 任意の Redis Node lease（`@orbit-id/node-lease`） | [#19](https://github.com/ponstream24/orbit-id/issues/19) | リポジトリ内完了（ノードサービスは任意・後続） |
| Playground（`packages/playground`） | [#20](https://github.com/ponstream24/orbit-id/issues/20) | リポジトリ内完了 |
| Java / Go / Rust / PHP パッケージ | [#21](https://github.com/ponstream24/orbit-id/issues/21) | リポジトリ内完了 |
| 残りのレジストリ（Maven / Go modules / crates.io / Packagist） | [#42](https://github.com/ponstream24/orbit-id/issues/42) | open |

TypeScript 系の npm 公開は完了（[#22](https://github.com/ponstream24/orbit-id/issues/22) closed）。他エコシステムは言語実装に合わせて #42 で追います。

## リポジトリ構成（モノレポ）

```text
orbit-id/
├── packages/
│   ├── core          ← 公開済み (npm)
│   ├── typescript    ← 公開済み (npm)
│   ├── cli           ← 公開済み (npm)
│   ├── java          ← phase 3 (#21)
│   ├── go            ← phase 3 (#21)
│   ├── rust          ← phase 3 (#21)
│   ├── php           ← phase 3 (#21)
│   └── playground    ← phase 3 (#20)
├── spec/
├── benchmark/        ← phase 3 (#18)
└── docs/
```

## Stable release

`draft` から `v1.0.0` への昇格基準は [Stable v1 昇格基準](stable-release-criteria.md) を参照。
stable `v1.0.0` はタグ済みです。

# Library API (Draft)

[English](../en/library-api.md)

Status: Draft — 未実装。

Orbit ID ライブラリが共通で揃える API 表面の草案です。名前や型は各言語の慣例に合わせますが、
意味的な振る舞いは揃えるべきです。

## Goals

- TypeScript / Java / Go / Rust / PHP / CLI で同じ操作を提供する
- [Orbit ID v1 Specification](orbit-id-v1.md) に沿って encode / decode する
- [Canonical Test Vectors](test-vectors.md) に合格する

## Operations

| Operation | Input | Output | Notes |
| --- | --- | --- | --- |
| `generate(type)` | Type (`0..63`) | Orbit ID | 割当済み Node と generator 状態が必要 |
| `parse(id)` | ID（整数または 10 進文字列） | Fields object | 仕様どおり非正規な 10 進文字列は拒否 |
| `getTimestamp(id)` | ID | Timestamp / time | Orbit Epoch からのミリ秒、または導出した UTC |
| `getType(id)` | ID | Type | |
| `getNode(id)` | ID | Node | |
| `getSequence(id)` | ID | Sequence | |
| `isValid(id)` | ID 候補 | boolean / result | **構文上妥当**であり、「発行済み」ではない |

`isValid` は Orbit generator が発行したことを主張してはなりません。仕様 §11 を参照。

## Value representation

| Context | Representation |
| --- | --- |
| In-memory (JS/TS) | `bigint` |
| JSON / HTTP | 符号なし 10 進文字列 |
| Binary | 8-byte big-endian |

JSON 例:

```json
{
  "id": "140612821619842090"
}
```

## Generator responsibilities

`generate` を実装する generator は次を満たさなければなりません。

- Node ID、last Timestamp、Sequence を保持する
- プロセス内で生成を直列化する
- 仕様の時計巻き戻し・Sequence 枯渇規則に従う
- lease 方式の場合、Node 所有権を確認できないときは fail closed する

Node 割当（静的設定または Redis lease）は `generate` の hot path の外です。

# Library API

[English](../en/library-api.md)

Status: Stable — パッケージルートの既定は Orbit ID **v2**（128-bit）。v1 は明示名前空間に残る。[移行ガイド](migration-1x-to-2.0.0.md) を参照。

Orbit ID ライブラリが共通で揃える API 表面です。

## Goals

- TypeScript / Java / Go / Rust / PHP / CLI で同じ操作を提供する
- 既定は [Orbit ID v2 Specification](orbit-id-v2.md)。v1 は残した入口で ([Orbit ID v1](orbit-id-v1.md))
- [Canonical Test Vectors](test-vectors.md) / [`spec/conformance/`](../../spec/conformance/) に合格する

## Operations

| Operation | Input | Output | Notes |
| --- | --- | --- | --- |
| `generate(type)` | Type (`0..63`) | Orbit ID | 割当済み Node と generator 状態が必要。Type `0`（`RESERVED`）は拒否しなければならない |
| `parse(id)` | ID（整数または 10 進文字列） | Fields object | 仕様どおり非正規な 10 進文字列は拒否 |
| `getTimestamp(id)` | ID | Timestamp / time | Orbit Epoch からのミリ秒、または導出した UTC |
| `getType(id)` | ID | Type | |
| `getNode(id)` | ID | Node | |
| `getSequence(id)` | ID | Sequence | |
| `isValid(id)` | ID 候補 | boolean / result | **構文上妥当**であり、「発行済み」ではない |

`isValid` は Orbit generator が発行したことを主張してはなりません。仕様 §11 を参照。

`encode(fields)`、`toDecimalString(id)`、`fromDecimalString(s)`、`toHexString(id)`、
`toBase64UrlString(id)`、`fromBase64UrlString(s)` などの補助 API を提供しても構いませんが、
上記 operations と矛盾してはなりません。JSON / HTTP の正規形は 10 進のまま。hex と Base64 URL は
**非正規**の表示・短いコピペ用（Base64 URL = RFC 4648 §5、パディングなし、big-endian バイト）です。

## Value representation

| Context | Representation |
| --- | --- |
| In-memory (JS/TS) | `bigint` |
| JSON / HTTP | 符号なし 10 進文字列 |
| Binary | v1: 8-byte big-endian、v2: **16-byte big-endian** |
| 短い表示（任意） | パディングなし Base64 URL（v1: 11 文字、v2: 22 文字） |

JSON 例:

```json
{
  "id": "140612821619842090"
}
```

## Canonical error codes

ライブラリは、次の安定したコード文字列（またはそれに対応する言語 enum）を公開するべきです。

| Code | When |
| --- | --- |
| `INVALID_TYPE` | Type outside the format range, or `generate(0)` |
| `INVALID_NODE` | 構築・設定時に Node が形式の範囲外（v1 は `0..127`、v2 は `0..65535`） |
| `INVALID_SEQUENCE` | fields の encode 時に Sequence が `0..1023` 外 |
| `INVALID_TIMESTAMP` | fields の encode 時に Timestamp が 41-bit 範囲外 |
| `INVALID_DECIMAL` | 非正規または範囲外の 10 進文字列 |
| `INVALID_BASE64URL` | 不正 / パディング付き / 長さ不正の Base64 URL 文字列 |
| `INVALID_FORMAT_VERSION` | 未知 / 予約の FormatVersion（v2） |
| `INVALID_REGION` | Region が `0..15` 外（v2） |
| `INVALID_TENANT` | Tenant が `0..65535` 外（v2） |
| `INVALID_RESERVED` | encode 時の非 0 残 Reserved、または decode での拒否（v2） |
| `CLOCK_ROLLBACK` | 壁時計が許容を超えて `last_timestamp` より後ろ |
| `SEQUENCE_EXHAUSTED` | 同一 ms の容量超過で、待機ではなく失敗を選んだ場合 |
| `NODE_OWNERSHIP_LOST` | lease / 所有権を確認できず fail closed |

例外型は言語固有で構いません。コード文字列 / enum の同一性は揃えるべきです。

## Clock source

ジェネレーターは「現在時刻」を、次と同等の差し替え可能な時計抽象から取得しなければなりません。

```text
currentOrbitTimestampMs() -> unsigned integer
```

戻り値は Orbit Epoch からの経過ミリ秒（または `1767225600000` を引いて変換できる Unix ms）です。

- 本番既定: システムの壁時計
- テスト: conformance fixture を駆動する決定的 / fake clock
- 許容内の巻き戻り待機中に単調時計を補助利用しても構いませんが、encode される Timestamp field は
  仕様どおり Orbit Epoch 基準の壁時計ミリ秒です

## Concurrency

1 つの generator インスタンス内では:

- `generate` を直列化しなければならない（mutex / actor / 単一スレッド所有）
- 並行呼び出しが Sequence 更新を交差させてはならない
- 同一プロセスで複数 generator インスタンスが同じ Node ID を共有することは、プロセス全体の
  singleton として明示文書化されない限り未サポート

プロセス間の排他はライブラリの mutex ではなく Node 割当が担います。

## Generator responsibilities

`generate` を実装する generator は次を満たさなければなりません。

- Node ID、last Timestamp、Sequence を保持する
- 上記どおりプロセス内で生成を直列化する
- 仕様の時計巻き戻し・Sequence 枯渇規則に従う
- lease 方式の場合、Node 所有権を確認できないときは fail closed する

Node 割当（静的設定または Redis lease）は `generate` の hot path の外です。

## Orbit ID v2 差分

Status: `@orbit-id/core` に加算 namespaceとして **実装済み**（`import * as v2 from
"@orbit-id/core/v2"` または `import { v2 } from "@orbit-id/core"`）。仕様（Stable）:
[Orbit ID v2 Specification](orbit-id-v2.md)。決定ログ:
[Design Decisions（v2）](design-decisions-v2.md)。昇格パス: [v2 alpha 終了](v2-alpha-exit.md) ·
[パッケージ `2.0.0` 計画](v2-package-2.0.0.md)。

操作名は同じ（`generate` / `parse` / フィールド取得 / `isValid`）だが:

| 観点 | v1 | v2（Stable ワイヤ。1.x では加算） |
| --- | --- | --- |
| 値幅 | 64-bit | 128-bit |
| メモリ上（JS/TS） | `bigint` | `bigint`（128-bit 全体） |
| JSON / HTTP | 符号なし 10 進 | 符号なし 10 進（桁が増える） |
| Binary | 8-byte BE | **16-byte BE** |
| Type / Node / Sequence | 6 / 7 / 10 bit | 16 / 16 / 16 bit |
| 追加フィールド | — | `FormatVersion`（MUST `1`）、`Region`（`0..15`）、`Tenant`（`0..65535`）、残 `Reserved`（encode MUST `0`） |
| パッケージ入口 | `@orbit-id/core`（1.x では v1） | `@orbit-id/core` ルート → v2（`/v2` エイリアス） |

v2 で追加するエラーコード: `INVALID_FORMAT_VERSION`、`INVALID_REGION`、`INVALID_TENANT`、
`INVALID_RESERVED`。

v1 の 64-bit ID を v2 として再解釈してはならない。

### 言語ごとの入口（1.x → 2.0.0）

方針: [横断 versioning](cross-registry-versioning.md) ·
[移行ガイド](migration-1x-to-2.0.0.md) · [#150](https://github.com/orbit-id/orbit-id/issues/150)。

| 言語 | 1.x 既定（v1） | 1.x の加算 v2 | 2.0.0 既定（v2） | 2.0.0 で残る v1 |
| --- | --- | --- | --- | --- |
| TypeScript | `@orbit-id/core` ルート | `v2` / `@orbit-id/core/v2` | ルート → v2（`/v2` エイリアス） | `v1` / `@orbit-id/core/v1` |
| Java | `com.github.orbitid` | `com.github.orbitid.v2`（昇格後は削除） | `com.github.orbitid` → v2 | `com.github.orbitid.v1` |
| Rust | crate root | `orbit_id::v2` | crate root → v2（`v2` エイリアス） | `orbit_id::v1` |
| PHP | `OrbitId\` | `OrbitId\V2` | `OrbitId\` → v2（`V2` class alias） | `OrbitId\V1` |
| Go | module `github.com/orbit-id/go` | （1.x では非公開） | module `github.com/orbit-id/go/v2` | `…/v2/v1` または旧 major `@v1.x` |
| CLI | 既定 v1 | `--spec v2` / `--v2` | 既定 v2 | `--spec v1` |

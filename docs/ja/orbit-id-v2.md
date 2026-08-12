# Orbit ID Specification v2

[English](../en/orbit-id-v2.md)

Status: Draft (`v2.0.0-alpha`) — 上位フィールドは frozen。[Design Decisions（v2）](design-decisions-v2.md) 参照  
Epoch: `2026-01-01T00:00:00.000Z`

freeze / 切り出しの判断: [Design Decisions（v2）](design-decisions-v2.md)。  
動機: [Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)。

## 1. Purpose

Orbit ID v2 は、複数ノードが互いの発行状態を逐次共有せずに一意な ID を生成するための
**128-bit** バイナリ形式と生成規則を定義します。Format Version、Region、Tenant、残 Reserved の
余白を持ちます。

本文中の「MUST」「MUST NOT」「SHOULD」「SHOULD NOT」「MAY」は、相互運用に必要な
要件の強さを表します。

## 2. Data model

Orbit ID v2 は unsigned **128-bit** integer です。ビット番号は最下位を 0、最上位を 127 とします。

```text
127          124 123                    76 75         60 59         44 43         28 27    24 23             8 7        0
┌──────────────┬──────────────────────────┬─────────────┬─────────────┬─────────────┬───────┬────────────────┬──────────┐
│ FormatVersion│ Timestamp                │ Type        │ Node        │ Sequence    │Region │ Tenant         │ Reserved │
│ 4 bits       │ 48 bits                  │ 16 bits     │ 16 bits     │ 16 bits     │4 bits │ 16 bits        │ 8 bits   │
└──────────────┴──────────────────────────┴─────────────┴─────────────┴─────────────┴───────┴────────────────┴──────────┘
```

| Field | Bit positions | Width | Valid values |
| --- | --- | ---: | ---: |
| FormatVersion | 127..124 | 4 | `0..15`（発行済み v2 は `1`） |
| Timestamp | 123..76 | 48 | `0..281,474,976,710,655` |
| Type | 75..60 | 16 | `0..65,535` |
| Node | 59..44 | 16 | `0..65,535` |
| Sequence | 43..28 | 16 | `0..65,535` |
| Region | 27..24 | 4 | `0..15` |
| Tenant | 23..8 | 16 | `0..65,535` |
| Reserved | 7..0 | 8 | encode では MUST `0` |

## 3. Fields

### 3.1 FormatVersion

帯域内の形式識別子。発行済み Orbit ID v2 は `FormatVersion = 1` MUST。値 `0` は予約。
未知の version は decode で fail closed MUST。

### 3.2 Timestamp

Timestamp は Orbit Epoch から発行時刻までの経過ミリ秒です。

```text
timestamp = floor(current_unix_time_ms) - 1767225600000
```

`1767225600000` は Orbit Epoch の Unix time（milliseconds）。Timestamp `0` は
`2026-01-01T00:00:00.000Z`。48-bit 最大値は Epoch から約 **8919.4 年**（暦ライブラリが
~9999 年超を拒否する場合は容量上限として扱い、可搬な壁時計表示ではない）。

### 3.3 Type

Type は論理エンティティ種別（`0..65535`）。値 `0` は予約。`generate(0)` は拒否 MUST。
`1..65535` はアプリ割当用。

後から変わり得る属性（テーブル名・権限・ロール・状態）を Type にしてはならない。
デプロイ内で永続データに使った値の意味を変えてはならない。

### 3.4 Node

Node は発行プロセスへ排他割当する ID。同時に発行し得る 2 プロセスが同じ Node を使ってはならない。
[Node Management](node-management.md) 参照。

### 3.5 Sequence

Sequence は同一 Node・同一 Timestamp の 0 始まりカウンタ。状態はノード内の全 Type で共有 MUST。
Type 別に分けてはならない。

Timestamp が進むと Sequence は 0 にリセット。同一ミリ秒では発行ごとに 1 増やす。
65,535 を超える場合は次のミリ秒を待つか容量超過エラー。ラップしてはならない。

### 3.6 Region

Region はアプリ割当ラベル（`0..15`）。`0` は合法な既定 / 未設定。Region は Node 排他の代替ではない。
割当ポリシーは本仕様の外。

### 3.7 Tenant

Tenant はアプリ割当ラベル（`0..65535`）。`0` は合法な既定 / 未設定。Tenant は Node 排他の代替ではない。

### 3.8 Reserved

encode 時 Reserved は MUST `0`。decode は非 0 Reserved を拒否 MUST（`INVALID_RESERVED`）。
後続改訂で残 8 bit から追加フィールド（例: Datacenter）を切り出してよい（総幅 128 は変えない）。

## 4. Encoding

各値が範囲内であることを確認したうえで:

```text
id = (format_version << 124)
   | (timestamp      <<  76)
   | (type           <<  60)
   | (node           <<  44)
   | (sequence       <<  28)
   | (region         <<  24)
   | (tenant         <<   8)
   | reserved
```

ビット列は unsigned。右シフトは論理シフト MUST。

## 5. Decoding

```text
format_version = (id >> 124) & 0xf
timestamp      = (id >>  76) & 0xffffffffffff
type           = (id >>  60) & 0xffff
node           = (id >>  44) & 0xffff
sequence       = (id >>  28) & 0xffff
region         = (id >>  24) & 0xf
tenant         = (id >>   8) & 0xffff
reserved       =  id         & 0xff

unix_time_ms = timestamp + 1767225600000
```

10 進文字列を受け付ける decoder は、先頭 `+`、負値、小数、空白、桁区切り、`2^128 - 1`
（`340282366920938463463374607431768211455`）超を拒否 MUST。正規出力に先頭ゼロを付けてはならない。
未知の `FormatVersion` は decode 失敗 MUST。非 0 `Reserved` は decode 失敗 MUST。

## 6. Generation algorithm

各 generator は少なくとも `node_id`・`last_timestamp`・`sequence` を保持し、固定の
`region` / `tenant`（既定 `0`）を保持 MAY。
同一 generator 内で `generate(type)` は直列化 MUST。

1. Type が `1..65535`（予約 `0` でないこと）、Node / Region / Tenant が範囲内であることを確認。
2. 現在の Timestamp（ミリ秒）を取得。
3. Epoch より前、または 48-bit 最大超なら失敗。
4. 現在値が `last_timestamp` より小さい場合は §7。
5. 等しければ Sequence を増やす。
6. Sequence が 65,535 を超える場合は次のミリ秒を待つか失敗。
7. `last_timestamp` より大きければ Sequence を 0 にリセット。
8. `FormatVersion = 1`、設定された Region / Tenant、`Reserved = 0` で encodeし、状態を保存して返す。

プロセス再起動直後に同じ Node ID を再利用する場合、前回発行の最終時刻を越えるまで時計が進んだことを
保証するか、永続化した last Timestamp と比較 / Node 再割当 / 安全に待機 MUST。

## 7. Clock rollback

v1 と同じ方針:

- 設定した許容内なら壁時計が追いつくまで待つ。
- 単調時計を補助に使ってよい。
- last Timestamp を永続化し再起動時に比較。
- `CLOCK_ROLLBACK` で fail closed。

**既定許容:** `5_000` ミリ秒。

- `last_timestamp - now` が `(0, tolerance]` なら安全になるまで待って続行。
- `tolerance` 超なら既定で fail closed。
- 待ち中に同一 Node の既発行 `(Timestamp, Sequence)` を再利用してはならない。

## 8. Uniqueness and ordering

Node 排他・Sequence 非再利用・巻き戻り安全が成り立つとき、生成 ID は一意。

unsigned 整数比較は FormatVersion、続けて Timestamp（時刻上位）が主。同一ミリ秒では Type・Node が
Sequence より上位。Region・Tenant は Sequence より下位。

## 9. Capacity

| Dimension | Capacity |
| --- | ---: |
| Lifetime | 281,474,976,710,656 ms（≈ 8919.4 年） |
| Format versions | 16（本 Draft は `1`） |
| Types | 65,536（`0` 予約 → 利用 65,535） |
| Nodes | 65,536 |
| Regions | 16 |
| Tenants | 65,536 |
| Per node | 65,536 IDs/ms（全 Type 合算） |
| All nodes, theoretical | 4,294,967,296 IDs/ms |

形式的上限であり、スループット保証ではない。

## 10. Interchange and storage

- JSON / HTTP: 128-bit の符号なし 10 進文字列 MUST。
- JavaScript / TypeScript: 単一の `bigint` を SHOULD。
- バイナリ: **16-byte big-endian** が正規。
- 任意で小文字 hex（32 桁、`0x` なし）を受理 MAY。正規は 10 進。
- フル unsigned 128-bit を保持できる型を選ぶ（例: `numeric`、`BINARY(16)`、順序定義済みの
  64-bit × 2）。署名付き 64-bit 列に v2 ID を入れない。

## 11. Validation

構造検証は、値が unsigned 128-bit 範囲内で `FormatVersion` が既知、`Reserved` が `0`、フィールドが
取り出せること。チェックサムや署名はない。`isValid` は **構文的に妥当**であることのみを意味し、
「発行済み」ではない。

## 12. Security and privacy

Orbit ID は秘密ではない。発行時刻、Type、Node、FormatVersion、Region、Tenant、同一ミリ秒の活動が
露出し得る。認可・真正性・推測耐性は別途 MUST。

## 13. Compatibility

- v1（64-bit）と v2（128-bit）をビット列の再解釈で混ぜてはならない。
- 列・API フィールド・長さ・envelope で分離する。
- 既存の v1 ID を v2 として再解釈してはならない。
- FormatVersion / Timestamp / Type / Node / Sequence の幅と位置は frozen。
  [Design Decisions（v2）](design-decisions-v2.md) 参照。

## 14. Related documents

- [Design Decisions（v2）](design-decisions-v2.md)
- [Node Management](node-management.md)
- [Library API](library-api.md)（v2 delta）
- [Canonical Test Vectors](test-vectors.md)（v2 節）
- [`spec/conformance/`](../../spec/conformance/)（`*.v2.json`）
- [Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)
- [Orbit ID v1 Specification](orbit-id-v1.md)
- [v2 alpha exit](v2-alpha-exit.md)

# Orbit ID Specification v2

[English](../en/orbit-id-v2.md)

Status: Draft (`v2.0.0-alpha.0`)  
Epoch: `2026-01-01T00:00:00.000Z`

alpha 前の必須判断: [Design Decisions（v2）](design-decisions-v2.md)。  
動機: [Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)。

## 1. Purpose

Orbit ID v2 は、複数ノードが互いの発行状態を逐次共有せずに一意な ID を生成するための
**128-bit** バイナリ形式と生成規則を定義します。Format Version と将来フィールド用の余白
（Reserved）を持ちます。

本文中の「MUST」「MUST NOT」「SHOULD」「SHOULD NOT」「MAY」は、相互運用に必要な
要件の強さを表します。

## 2. Data model

Orbit ID v2 は unsigned **128-bit** integer です。ビット番号は最下位を 0、最上位を 127 とします。

```text
127          124 123                    76 75         60 59         44 43         28 27          0
┌──────────────┬──────────────────────────┬─────────────┬─────────────┬─────────────┬────────────┐
│ FormatVersion│ Timestamp                │ Type        │ Node        │ Sequence    │ Reserved   │
│ 4 bits       │ 48 bits                  │ 16 bits     │ 16 bits     │ 16 bits     │ 28 bits    │
└──────────────┴──────────────────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

| Field | Bit positions | Width | Valid values |
| --- | --- | ---: | ---: |
| FormatVersion | 127..124 | 4 | `0..15`（発行済み v2 は `1`） |
| Timestamp | 123..76 | 48 | `0..281,474,976,710,655` |
| Type | 75..60 | 16 | `0..65,535` |
| Node | 59..44 | 16 | `0..65,535` |
| Sequence | 43..28 | 16 | `0..65,535` |
| Reserved | 27..0 | 28 | 本 Draft の encode では MUST `0` |

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
~9999 年超を拒否する場合があるため、上限は容量境界として扱い、可搬な壁時計表示には頼らない）。

### 3.3 Type

論理エンティティ種別（`0..65535`）。値 `0` は予約。`generate(0)` は拒否 MUST。
`1..65535` はアプリケーション割当用。

後から変わり得る属性（テーブル名、権限、ロール、状態）を表してはならない。デプロイの永続
データで一度使った値の意味は変更・再利用してはならない。

### 3.4 Node

発行プロセスへ排他割当する ID。同時発行し得る 2 プロセスが同じ Node を使ってはならない。
[Node Management](node-management.md) を参照。

### 3.5 Sequence

同一 Node・同一 Timestamp の 0 始まり連番。状態は Type ごとに分けず、ノード内の全 Type で
共有 MUST。

Timestamp が進むと Sequence は 0 にリセット。同一ミリ秒では発行ごとに 1 増加。65,535 の次が
必要な場合は次のミリ秒まで待つか容量超過エラー。周回させてはならない。

### 3.6 Reserved

alpha では encode 時 MUST `0`。後続 alpha で Region / Datacenter / Tenant などを総幅 128 を
変えずに切り出し MAY。切り出し仕様が出るまで、strict decoder は非 0 Reserved を拒否 SHOULD。

## 4. Encoding

各値が範囲内であることを確認し:

```text
id = (format_version << 124)
   | (timestamp      <<  76)
   | (type           <<  60)
   | (node           <<  44)
   | (sequence       <<  28)
   | reserved
```

ビット列は unsigned として扱う。右シフトは論理右シフト MUST。

## 5. Decoding

```text
format_version = (id >> 124) & 0xf
timestamp      = (id >>  76) & 0xffffffffffff
type           = (id >>  60) & 0xffff
node           = (id >>  44) & 0xffff
sequence       = (id >>  28) & 0xffff
reserved       =  id         & 0xfffffff

unix_time_ms = timestamp + 1767225600000
```

10 進文字列 decoder は先頭 `+`、負値、小数、空白、桁区切り、および `2^128 - 1`
（`340282366920938463463374607431768211455`）超を拒否 MUST。正規出力に先頭ゼロを付けない。
未知の `FormatVersion` は decode 失敗 MUST。

## 6. Generation algorithm

generator は少なくとも `node_id`、`last_timestamp`、`sequence` を保持する。
`generate(type)` は同一 generator 内で直列化 MUST。

1. Type が `1..65535`（予約 `0` でない）で Node が範囲内であることを確認。
2. 現在の Timestamp（ミリ秒）を取得。
3. Epoch より前、または 48-bit 最大超なら失敗。
4. `last_timestamp` より小さければ §7。
5. 等しければ Sequence を増やす。
6. Sequence が 65,535 を超えたら次ミリ秒待ち、または失敗。
7. 大きければ Sequence を 0 にリセット。
8. `FormatVersion = 1`・`Reserved = 0` で encodeし、状態を保存して返す。

プロセス再起動直後に同じ Node を再利用する場合、前回の最終発行時刻を超えることを保証するか、
永続化した最終 Timestamp と比較 / Node 再割当 / 安全な待機を行う。

## 7. Clock rollback

v1 と同じ方針:

- 設定した許容内で壁時計が追いつくまで待つ。
- 単調時計を補助に使う。
- 最終 Timestamp を永続化し再起動時に比較。
- `CLOCK_ROLLBACK` で fail closed。

**既定許容:** `5_000` ミリ秒。

- `last_timestamp - now` が `(0, tolerance]` なら安全になるまで待って続行。
- `tolerance` 超なら既定で fail closed。
- 待ち中に同一 Node の既発行 `(Timestamp, Sequence)` を再利用してはならない。

## 8. Uniqueness and ordering

Node 排他・Sequence 非再利用・巻き戻り安全が満たされれば一意。

unsigned 整数比較は FormatVersion、続けて Timestamp（時刻上位）が主。同一ミリ秒では Type・Node が
Sequence より上位。

## 9. Capacity

| Dimension | Capacity |
| --- | ---: |
| Lifetime | 281,474,976,710,656 ms（≈ 8919.4 年） |
| Format versions | 16（本 Draft は `1`） |
| Types | 65,536（`0` 予約 → 利用 65,535） |
| Nodes | 65,536 |
| Per node | 65,536 IDs/ms（全 Type 合算） |
| All nodes, theoretical | 4,294,967,296 IDs/ms |

形式的な上限であり、スループット保証ではない。

## 10. Interchange and storage

- JSON / HTTP: 128-bit の符号なし 10 進文字列 MUST。
- JavaScript / TypeScript: 単一の `bigint` SHOULD。
- Binary: **16-byte big-endian** が正規。
- 小文字 hex（32 桁、`0x` なし）を受理 MAY。正規は 10 進。
- フル unsigned 128-bit を保持できる型を選ぶ（例: `numeric`、`BINARY(16)`、順序定義済みの
  64-bit × 2）。署名付き 64-bit 列に v2 ID を入れない。

## 11. Validation

構造検証は、値が unsigned 128-bit 範囲内で `FormatVersion` が既知でありフィールドが取り出せること。
チェックサムや署名はない。`isValid` は **構文的に妥当** の意味であり「発行済み」ではない。

## 12. Security and privacy

Orbit ID は秘密ではない。発行時刻、Type、Node、FormatVersion、同一ミリ秒の活動が露出し得る。
認可・真正性・推測耐性は別途必須。

## 13. Compatibility

- v1（64-bit）と v2（128-bit）をビット列の再解釈で混ぜてはならない。
- 列・API フィールド・長さ・envelope で区別する。
- 既存 v1 ID を v2 として再解釈してはならない。
- alpha ではレイアウト変更があり得る。[Design Decisions（v2）](design-decisions-v2.md) を参照。

## 14. Related documents

- [Design Decisions（v2）](design-decisions-v2.md)
- [Node Management](node-management.md)
- [Library API](library-api.md)（v2 差分節）
- [Canonical Test Vectors](test-vectors.md)（v2 スタブ）
- [`spec/conformance/`](../../spec/conformance/)（v2 fixture は TBD）
- [Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)
- [Orbit ID v1 Specification](orbit-id-v1.md)

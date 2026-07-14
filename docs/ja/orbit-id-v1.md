# Orbit ID Specification v1.0.0

[English](../en/orbit-id-v1.md)

Status: Stable (`v1.0.0`)  
Epoch: `2026-01-01T00:00:00.000Z`

## 1. Purpose

Orbit ID v1 は、複数ノードが互いの発行状態を逐次共有せずに、一意な ID を生成するための
64-bit バイナリ形式と生成規則を定義します。

本文中の「MUST」「MUST NOT」「SHOULD」「SHOULD NOT」「MAY」は、相互運用に必要な
要件の強さを表します。

## 2. Data model

Orbit ID v1 は unsigned 64-bit integer です。ビット番号は最下位ビットを 0、最上位ビットを
63 とします。

```text
MSB                                                             LSB
63                                                               0
┌──────────────────────────┬──────────┬───────────┬──────────────┐
│ Timestamp                │ Type     │ Node      │ Sequence     │
│ 41 bits                  │ 6 bits   │ 7 bits    │ 10 bits      │
└──────────────────────────┴──────────┴───────────┴──────────────┘
63                        23 22      17 16       10 9             0
```

| Field | Bit positions | Width | Valid values |
| --- | --- | ---: | ---: |
| Timestamp | 63..23 | 41 | `0..2,199,023,255,551` |
| Type | 22..17 | 6 | `0..63` |
| Node | 16..10 | 7 | `0..127` |
| Sequence | 9..0 | 10 | `0..1,023` |

この形式には符号ビットや version field はありません。64 bit 全体をデータとして使用します。

## 3. Fields

### 3.1 Timestamp

Timestamp は Orbit Epoch から発行時刻までの経過ミリ秒です。

```text
timestamp = floor(current_unix_time_ms) - 1767225600000
```

`1767225600000` は Orbit Epoch の Unix time（milliseconds）です。Timestamp `0` は
`2026-01-01T00:00:00.000Z` を表します。最大値は
`2095-09-07T15:47:35.551Z` を表します。

### 3.2 Type

Type は、ID が属する論理エンティティ種別です。物理テーブル名、権限、状態など、後から
変わり得る属性を表してはなりません。割当は [Type Registry](type-registry.md) に従います。

### 3.3 Node

Node は発行プロセスへ排他的に割り当てられた ID です。同時に ID を発行し得る 2 つの
プロセスが同じ Node 値を使用してはなりません。割当方法は
[Node Management](node-management.md) を参照してください。

### 3.4 Sequence

Sequence は、同一 Node・同一 Timestamp における 0 始まりの連番です。Sequence の状態は
Type ごとに分けず、1 ノード内の全 Type で共有しなければなりません。

Timestamp が進んだとき、Sequence は 0 にリセットします。同じミリ秒内では、ID を 1 件
発行するたびに 1 増加させます。1,023 の次を要求された場合、実装は次のミリ秒まで待つか、
容量超過エラーを返さなければなりません。Sequence を周回させてはなりません。

## 4. Encoding

各値が範囲内であることを確認し、次の式でエンコードします。

```text
id = (timestamp << 23)
   | (type      << 17)
   | (node      << 10)
   | sequence
```

実装言語が符号付き 64-bit 整数しか持たない場合も、ビット列は unsigned として扱わなければ
なりません。右シフトには論理右シフトを用います。

## 5. Decoding

```text
timestamp = (id >> 23) & 0x1ffffffffff
type      = (id >> 17) & 0x3f
node      = (id >> 10) & 0x7f
sequence  =  id        & 0x3ff

unix_time_ms = timestamp + 1767225600000
```

10 進文字列を受け取るデコーダーは、先頭の `+`、負数、小数、空白、桁区切り、および
`18,446,744,073,709,551,615`（`2^64 - 1`）を超える値を拒否しなければなりません。
先頭のゼロを受理するかは API ごとに定めても構いませんが、正規出力では付与しません。

## 6. Generation algorithm

各ジェネレーターは、少なくとも `node_id`、`last_timestamp`、`sequence` を保持します。
`generate(type)` は、同一ジェネレーター内で直列化されなければなりません。

1. Type が registry 上で発行可能であり、Node が有効範囲であることを確認する。
2. 現在の Timestamp をミリ秒で取得する。
3. Epoch より前、または 41-bit 上限を超える場合は失敗する。
4. 現在値が `last_timestamp` より小さければ、7 節の規則に従う。
5. 現在値が `last_timestamp` と同じなら Sequence を増やす。
6. Sequence が 1,023 を超える場合は、次のミリ秒まで待つか失敗する。
7. 現在値が `last_timestamp` より大きければ Sequence を 0 にする。
8. ID をエンコードし、`last_timestamp` と Sequence を保存して返す。

プロセス再起動後に同じ Node ID を直ちに再利用する場合、時刻が以前のプロセスの最終発行時刻
より進んでいることを保証しなければなりません。保証できない場合は、永続化した最終 Timestamp
との比較、Node の再割当、または安全な待機が必要です。

## 7. Clock rollback

システム時計が `last_timestamp` より前へ戻った状態で ID を生成してはなりません。実装は
以下のいずれか、または組み合わせを採用します。

- 設定した許容時間以内だけ、壁時計が `last_timestamp` に追いつくまで待つ。
- 単調増加時計を補助的に用いて安全な Timestamp を維持する。
- 最終 Timestamp を永続化し、再起動時に比較する。
- 明示的な `CLOCK_ROLLBACK` エラーで fail closed する。

**既定の許容時間:** `5_000` ミリ秒（`5` 秒）。

振る舞い:

- `last_timestamp - now` が `(0, tolerance]` のとき、ジェネレーターは発行前に
  `now >= last_timestamp`（または同等の安全な単調進行）になるまで待たなければなりません。
- `last_timestamp - now` が `tolerance` を超えるとき、ジェネレーターは既定で
  `CLOCK_ROLLBACK` により fail closed しなければなりません。運用者は許容時間を下げても構いません。
  上げる場合はストールリスクが増えるため、運用上の根拠が必要です。
- NTP 同期だけを一意性の保証として扱ってはなりません。
- 待機中であっても、同一 Node で既出の `(Timestamp, Sequence)` 組を再利用してはなりません。

## 8. Uniqueness and ordering

次の条件をすべて満たす限り、生成 ID は一意です。

- 同時稼働するジェネレーターへ Node ID が排他的に割り当てられている。
- 1 Node・1 Timestamp につき Sequence を再利用しない。
- 時計巻き戻り時に、既出の Timestamp と Sequence の組を再利用しない。

Timestamp が異なる ID は、unsigned integer として比較すると時刻順に並びます。同一ミリ秒内は
Type と Node が Sequence より上位にあるため、システム全体の厳密な発行順を表しません。
同一 Type・同一 Node・同一 Timestamp の範囲では Sequence 順です。

## 9. Capacity

| Dimension | Capacity |
| --- | ---: |
| Lifetime | 2,199,023,255,552 ms（約 69.7 年） |
| Types | 64 |
| Nodes | 128 |
| Per node | 1,024 IDs/ms（全 Type 合計） |
| All nodes, theoretical | 131,072 IDs/ms |

値は形式上の上限であり、API、ネットワーク、実装、ストレージの処理性能を保証しません。

相互運用テストでは [Canonical Test Vectors](test-vectors.md) を使用します。

## 10. Interchange and storage

- JSON / HTTP: 符号なし 10 進文字列を使用しなければなりません。
- JavaScript / TypeScript: `bigint` を使用しなければなりません。
- PostgreSQL の `bigint`: 符号付きのため、全期間を 1 列で表現できません。`numeric(20)`、
  10 進文字列、または別の unsigned 相当表現を使用します。
- MySQL の `BIGINT UNSIGNED`: 全 Orbit ID v1 を格納できます。
- バイナリ表現: 8-byte big-endian を正規表現とします。

Timestamp の最上位ビットが立つ約 34.8 年後には、ID は signed 64-bit の最大値を超えます。
実装初期から signed 64-bit へ依存しないでください。

## 11. Validation

構造検証は、入力が unsigned 64-bit の範囲にあり、デコーダーが各 field を抽出できることだけを
保証します。v1 には version、checksum、署名がないため、任意の 64-bit 値が実際に Orbit により
発行されたかを ID 単体で判定することはできません。

`isValid` のような API は「構文上妥当」と「発行済み」を明確に区別しなければなりません。

## 12. Security and privacy

Orbit ID は秘密値ではありません。発行時刻、Type、Node、および同一ミリ秒内の発行状況の一部を
公開します。IDOR 対策、認可、改ざん検知、真正性、推測耐性は別途実装しなければなりません。

## 13. Compatibility

この文書は v1 のビット列を定義しますが、ID 自体に version field はありません。互換性のない
形式を導入する場合は、格納列、API field、prefix、または外部 metadata で形式を識別する必要が
あります。既存 ID を新形式として再解釈してはなりません。

## 14. 規範的な関連文書

公式 Type 割当は [Type Registry](type-registry.md) を参照。割当済みの意味は v1 内で変更しません。

時計巻き戻りの既定許容時間は §7（`5_000` ms）で定義します。

本番の Node 割当と再利用 quarantine の既定は [Node Management](node-management.md) で定義します。

conformance fixture 形式と encode/decode ケースは
[`spec/conformance/`](../../spec/conformance/) にあります。

canonical API error codes は [Library API](library-api.md) で定義します。

外部 versioning 方針: design-decisions §7 と互換性 §13 を参照（帯域内 version なし。将来形式は
64-bit 値の外で識別）。

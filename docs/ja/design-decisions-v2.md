# Design Decisions（Orbit ID v2）

[English](../en/design-decisions-v2.md)

Orbit ID v2（128-bit）の **alpha 前に必須**の判断を記録します。規範的な Draft は
[Orbit ID v2 Specification](orbit-id-v2.md)。128-bit 採用の動機は
[Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)。

Status: `v2.0.0-alpha` Draft 向けに固定。alpha 期間中の破壊的変更は許容。

Tracker: [#131](https://github.com/orbit-id/orbit-id/issues/131)。

## 1. フィールド集合（alpha）

**決定:** alpha のレイアウトは次のみ。

`FormatVersion` · `Timestamp` · `Type` · `Node` · `Sequence` · `Reserved`

**alpha では切り出さない:** Region / Datacenter / Tenant など。容量は `Reserved` に残し、
後続 alpha で総幅を変えずに分割 MAY。

## 2. ビット配分（128 bits）

**決定:** MSB → LSB（bit 127 = MSB、bit 0 = LSB）:

```text
127          124 123                    76 75         60 59         44 43         28 27          0
┌──────────────┬──────────────────────────┬─────────────┬─────────────┬─────────────┬────────────┐
│ FormatVersion│ Timestamp                │ Type        │ Node        │ Sequence    │ Reserved   │
│ 4 bits       │ 48 bits                  │ 16 bits     │ 16 bits     │ 16 bits     │ 28 bits    │
└──────────────┴──────────────────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

| Field | Bits | Width | Valid values | 容量メモ |
| --- | --- | ---: | --- | --- |
| FormatVersion | 127..124 | 4 | `0..15` | v2 ワイヤは **`1`**。`0` は予約。未知 version は decode 失敗 MUST |
| Timestamp | 123..76 | 48 | `0..2^48-1` | Orbit Epoch から約 **8919.4 年**（ミリ秒） |
| Type | 75..60 | 16 | `0..65535` | `0` 予約（`generate(0)` 拒否）。`1..65535` は deployer 用 |
| Node | 59..44 | 16 | `0..65535` | 同時稼働 generator へ排他割当 |
| Sequence | 43..28 | 16 | `0..65535` | 同一 Node・同一ミリ秒。Type 横断で共有 |
| Reserved | 27..0 | 28 | alpha の encode では MUST `0` | decode は任意値を受理 MAY。strict 時は非 0 を拒否 SHOULD |

LSB からの shift: Reserved `0`、Sequence `28`、Node `44`、Type `60`、Timestamp `76`、FormatVersion `124`。

## 3. ビット順序とエンディアン

**決定:** v1 と同様に時刻を上位へ置き、異なるミリ秒の ID は unsigned 比較でおおむね時系列になる。

**バイナリ交換:** 16-byte **big-endian** を正規とする（MSB 先頭）。

## 4. Format Version（帯域内）

**決定:** v1（帯域内 version なし）と異なり、v2 は `FormatVersion` を埋め込む。発行済み v2 ID は
`FormatVersion = 1` MUST。

v1 との識別:

- v1 は **64-bit**、v2 は **128-bit**。64-bit の v1 値を v2 として再解釈してはならない。
- アプリは列 / API / envelope（型・長さ・フィールド名）で区別 MUST。ビットパターン推測のみに頼らない。

未知の `FormatVersion` は decode で fail closed MUST。

## 5. Epoch

**決定:** v1 と同じ Orbit Epoch `2026-01-01T00:00:00.000Z`（Unix ms `1767225600000`）。
寿命の延長は Timestamp 幅で賄い、epoch は増やさない。

## 6. 文字列・交換形式

**決定:**

| 文脈 | 正規形 |
| --- | --- |
| JSON / HTTP | 128-bit 整数の符号なし **10 進文字列**（符号なし、先頭 `+` なし） |
| Binary | 16-byte big-endian |
| 任意 | 小文字 hex（32 桁、`0x` なし）をライブラリが受理 MAY。正規は 10 進 |

ULID 風や UUID 8-4-4-4-12 は alpha の正規形にしない（後で再検討 MAY）。

## 7. 言語上の値型（JS/TS）

**決定:** 128-bit 全体を 1 つの `bigint` で持つ（v1 の 64-bit `bigint` と同じ方針）。
広い整数が無い言語は 16-byte バッファや unsigned 128-bit 型を使う。

## 8. v1 から引き継ぐ生成規則

**決定:** 後続 alpha の ADR で明示しない限り:

- Sequence は **Node × ミリ秒で共有**（Type 別ではない）。
- Type `0` は予約。`generate(0)` は拒否 MUST。
- 時計巻き戻りの既定許容は **`5_000` ms**。
- Node 排他・quarantine の意図は [Node Management](node-management.md) に従う（幅だけ変わる）。

## 9. v1 との共存

**決定:**

- 既存の v1 ID を v2 レイアウトで再デコードしない。
- 移行はアプリ / ストレージ側（新列、二重書き込み、envelope）。
- v1 は保守モードのまま。v2 は `v2.0.0-alpha.*` で進める。

## Related

- [Orbit ID v2 Specification](orbit-id-v2.md)（Draft）
- [Orbit ID v1 Specification](orbit-id-v1.md)
- [Design Decisions（v1）](design-decisions.md)
- [Orbit ID v2 (128-bit) を採用する理由](why-128bit.md)

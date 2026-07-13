# Design Decisions

[English](../en/design-decisions.md)

この文書は Orbit ID v1 の主要な判断とトレードオフを記録します。仕様の規範的な定義は
[Orbit ID v1 Specification](orbit-id-v1.md) を参照してください。

## 1. 64-bit unsigned integer

多くのデータストアで効率よく index 化でき、Snowflake 系の運用知見を活用できるため 64 bit を
採用します。全 bit を使用するため、signed 64-bit の正数範囲には将来的に収まりません。

## 2. Orbit Epoch

Epoch を `2026-01-01T00:00:00.000Z` に固定し、41-bit timestamp で約 69.7 年を確保します。
Unix epoch より新しい独自 epoch により bit を節約します。

## 3. Type is an entity kind

Type はテーブル番号ではなく論理エンティティ種別です。DB の分割・統合やロール変更が ID の意味を
壊すことを避けます。6 bit（64 種類）は registry を慎重に運用すれば十分と判断しています。

## 4. 7-bit Node and 10-bit Sequence

最大 128 Node と、1 Node あたり全 Type 合計 1,024 ID/ms を選びました。中央 ID service を
巨大化させるより、少数の generator node で十分な throughput を確保する設計です。

## 5. Sequence is global per node and millisecond

Type ごとの Sequence は形式上も一意にできますが、状態管理と仕様を単純にするため、1 Node の
全 Type で 1 つの Sequence を共有します。したがって 1,024 ID/ms は Type ごとではなく Node
全体の上限です。

## 6. Redis is not on the generation path

Redis を使う場合は Node lease の control plane に限定します。ID ごとの `INCR` や分散 lock を
避け、ネットワーク遅延・Redis 障害を通常の生成経路へ持ち込みません。

## 7. No embedded version in v1

version bit を追加すると Node、Type、Sequence、または寿命のいずれかを削る必要があります。
v1 は容量を優先し、将来形式は API / storage metadata など外部で識別します。この判断は v2 移行を
複雑にするため、stable v1 前に再評価します。

## 8. Millisecond ordering, not total ordering

Timestamp を最上位に置くため、異なるミリ秒の ID は時刻順になります。同一ミリ秒内では Type と
Node が Sequence より上位にあるため、分散システム全体の厳密な発行順は保証しません。

## 9. IDs are transparent identifiers

デバッグ性と routing / inspection を重視し、timestamp、type、node を復元可能にします。その代わり、
ID は発行時刻や内部構成を隠しません。秘密値や認可 token としては扱いません。

## 10. 時計巻き戻りの既定許容は 5 秒

NTP や VM スケジューリングによる小さな後退はよくあるため、即座に失敗するとジェネレーターが
脆くなります。最大 `5_000` ms の待機で典型的な skew を吸収しつつ、ストール時間を抑えます。
それを超える巻き戻りは fail closed し、壁時計の補正だけに一意性を委ねません。

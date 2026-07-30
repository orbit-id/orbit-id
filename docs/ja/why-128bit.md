# Orbit ID v2 (128-bit) を採用する理由

[English](../en/why-128bit.md)

## 概要

Orbit ID v2 では、ID フォーマットを 64-bit から 128-bit へ拡張する。

目的は「より大きな ID にすること」ではなく、**長期運用・拡張性・分散性を犠牲にしない設計**を
実現するためである。

## 1. Type 数の制約を解消する

64-bit では Timestamp / Node / Sequence / Type を全て 64-bit 内に収める必要がある。
そのため Type へ割り当てられるビット数が少なくなり、将来的に管理できるデータ種別数が不足する
可能性がある。

128-bit では十分なビット数を確保できるため、Users / Sessions / Files / Payments /
Organizations / API Keys / Events など、サービス全体で多数の種類を扱える。

## 2. 将来の拡張に対応できる

64-bit では全てのビットを使い切る設計になりやすい。一方 128-bit では Format Version /
Reserved / Region / Datacenter / Tenant など将来利用する領域を確保できる。仕様変更時にも
後方互換性を維持しやすくなる。

## 3. 分散環境に強くなる

Orbit ID は分散環境での利用を前提としている。必要になる情報は Timestamp / Node /
Sequence である。64-bit ではこれらが互いにビット数を奪い合う。128-bit では、より多くの
Node・より多い発行数・長い Timestamp を同時に実現できる。

## 4. 長期間利用できる

Timestamp に十分なビット数を割り当てられるため、Orbit Epoch から数十年〜数百年以上運用できる
設計が可能となる。

## 5. UUID と同等サイズ

128-bit は特殊なサイズではない。UUID / UUIDv7 / ULID など主流の識別子も 128-bit である。
そのためデータベース・各種ライブラリ・API との親和性も高い。

## 6. Orbit の思想に適している

Orbit ID は Snowflake 互換を目的としているわけではない。目的は、グローバルに一意・分散生成可能・
ID だけで基本情報を判別可能・将来も拡張できる識別子を提供することである。128-bit はこの思想を
実現しやすい。

## デメリット

128-bit にも欠点は存在する。

- インデックスサイズが大きくなる
- メモリ使用量が増える
- 文字列表現が長くなる
- bigint やバイト列で扱う必要がある

ただし現在は UUID を利用するシステムが非常に多く、実運用上は大きな問題になりにくい。

## 結論

Orbit ID v2 では 128-bit を採用する。64-bit では長期運用に必要な Type 数・拡張性・分散性能・
将来互換性を十分確保できないためである。128-bit を採用することで、Orbit ID を今後長期間
利用できる基盤として設計できる。

## Related

- [Design Decisions（v2）](design-decisions-v2.md) — alpha 向けに固定したレイアウトと交換形式
- [Orbit ID v2 Specification](orbit-id-v2.md) — Draft（`v2.0.0-alpha.0`）

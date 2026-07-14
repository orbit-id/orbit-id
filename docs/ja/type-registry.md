# Orbit Type Registry

[English](../en/type-registry.md)

Type は物理テーブルではなく、長期間意味が変わらない論理エンティティを表します。
状態、権限、ロール、テーブル分割などの実装詳細は Type に含めません。

## Registry rules

- 値の範囲は `0..63` です。
- 一度 stable release で割り当てた値の意味は変更・再利用しません。
- stable v1 以降の新規割当は未割当値への追加のみとし、理由と migration impact を記した
  pull request で記録します。
- 廃止した値は `DEPRECATED` として予約し続けます。
- 実験用の割当は stable data に保存しません。使い捨て環境でのみ私的な Type 空間を使い、
  共有本番データへ持ち込まないでください。
- 新しい Type は、既存 Type で表現できない永続的な identity boundary がある場合だけ追加します。
- Type の追加・変更は pull request で理由と migration impact を記録します。

## Assigned values

以下は stable v1 の **公式** Orbit Type 割当です。実装とドキュメントはこれらの値を使うべきです。
意味は v1 内で変更しません（上記の registry 規則を参照）。

| Value | Name | Status | Description |
| ---: | --- | --- | --- |
| 0 | `RESERVED` | Reserved | 発行禁止。未指定値・sentinel 用 |
| 1 | `ACCOUNT` | Assigned | 人またはサービスのアカウント identity |
| 2 | `TALENT` | Assigned | タレント identity |
| 3 | `EVENT` | Assigned | イベント identity |
| 4 | `CONTENT` | Assigned | 公開・配信コンテンツ identity |
| 5 | `MEMBERSHIP` | Assigned | メンバーシップ identity |
| 6 | `TRANSACTION` | Assigned | 金銭・ポイント等の取引 identity |
| 7 | `NOTIFICATION` | Assigned | 通知 identity |
| 8 | `AUDIT` | Assigned | 監査イベント identity |
| 9 | `MEDIA` | Assigned | メディア資産 identity |
| 10 | `ORGANIZATION` | Assigned | 組織 identity |
| 11..63 | — | Unassigned | 将来の割当用 |

## Modeling guidance

たとえば `ACCOUNT` が後からタレント権限を得ても、既存の Account ID の Type は変更しません。
別の Talent entity が必要なら Talent ID を新規発行し、データモデル上で両者を関連付けます。

`USER` / `ADMIN` のような変更可能なロールや、`ACTIVE` / `DELETED` のような状態を Type に
割り当てないでください。

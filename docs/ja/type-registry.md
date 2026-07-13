# Orbit Type Registry

[English](../en/type-registry.md)

Type は物理テーブルではなく、長期間意味が変わらない論理エンティティを表します。
状態、権限、ロール、テーブル分割などの実装詳細は Type に含めません。

## Registry rules

- 値の範囲は `0..63` です。
- 一度 stable release で割り当てた値の意味は変更・再利用しません。
- 廃止した値は `DEPRECATED` として予約し続けます。
- 実験用の割当は stable data に保存しません。
- 新しい Type は、既存 Type で表現できない永続的な identity boundary がある場合だけ追加します。
- Type の追加・変更は pull request で理由と migration impact を記録します。

## Assigned values

現時点では v1 が Draft のため、`RESERVED` 以外は正式割当ではありません。

| Value | Name | Status | Description |
| ---: | --- | --- | --- |
| 0 | `RESERVED` | Reserved | 発行禁止。未指定値・sentinel 用 |
| 1..63 | — | Unassigned | 将来の割当用 |

## Initial proposal

以下は議論開始用の候補です。stable specification へ昇格するまでは使用しません。

| Proposed value | Name | Intended meaning |
| ---: | --- | --- |
| 1 | `ACCOUNT` | 人またはサービスのアカウント identity |
| 2 | `TALENT` | タレント identity |
| 3 | `EVENT` | イベント identity |
| 4 | `CONTENT` | 公開・配信コンテンツ identity |
| 5 | `MEMBERSHIP` | メンバーシップ identity |
| 6 | `TRANSACTION` | 金銭・ポイント等の取引 identity |
| 7 | `NOTIFICATION` | 通知 identity |
| 8 | `AUDIT` | 監査イベント identity |
| 9 | `MEDIA` | メディア資産 identity |
| 10 | `ORGANIZATION` | 組織 identity |

## Modeling guidance

たとえば `ACCOUNT` が後からタレント権限を得ても、既存の Account ID の Type は変更しません。
別の Talent entity が必要なら Talent ID を新規発行し、データモデル上で両者を関連付けます。

`USER` / `ADMIN` のような変更可能なロールや、`ACTIVE` / `DELETED` のような状態を Type に
割り当てないでください。

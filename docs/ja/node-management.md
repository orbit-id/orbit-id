# Node Management

[English](../en/node-management.md)

Orbit ID の一意性は、同時に発行するプロセス間で Node ID（`0..127`）が重複しないことに
依存します。Node ID の割当は control plane の責務であり、ID ごとの生成処理はローカルで
完結させます。

## 本番の既定

次のマトリクスから割当方式を選びます。該当する行のうち、できるだけ上を優先します。

| 環境 | 既定方式 | 注記 |
| --- | --- | --- |
| オーケストレータが安定したインスタンス ordinal を提供する（例: Kubernetes StatefulSet） | **オーケストレータ ordinal** | ordinal → Node ID `0..127` の写像を文書化する。利用可能なら最優先。 |
| replica 数が固定でオートスケールしない | **静的設定** | インスタンスごとに `ORBIT_NODE_ID` を注入。割当台帳をデプロイ設定に残す。 |
| オートスケールまたは短命インスタンス | 強い整合性ストアによる **lease** | Redis 等。lease は control plane のみ。ID 生成 hot path には載せない。 |
| ローカル開発 / 単一プロセス | **静的** 固定値（例: `0`） | 同じ本番 Node ID を複数インスタンスへ複製しない。 |

本番デプロイは、採用した方式とインスタンスへの Node ID 写像を文書化しなければなりません。
同一環境で方式を混在させる場合も、同時稼働ジェネレーター間で Node ID の和集合が排他的で
ある必要があります。

## Recommended order

環境に応じて、次の優先順で採用します。

1. オーケストレーターが保証する固定 ordinal / instance identity
2. デプロイ設定での静的な Node ID 割当
3. 強い整合性を持つストアによる lease 割当

単一ノードの開発環境では固定値を使用できます。本番環境で同じ設定を複製しないでください。

## Static allocation

Node ID を環境変数または設定ファイルで注入します。

```text
ORBIT_NODE_ID=7
```

起動時に範囲を検証し、割当台帳とデプロイ設定を一致させます。静的方式は単純ですが、
オートスケールで replica 数が動的に変わる環境には向きません。

## Lease-based allocation

Redis などを使う場合、ストアは Node ID の割当と生存確認にのみ使用します。ID 発行ごとに
ストアへアクセスしません。

lease 実装は最低限、次を満たす必要があります。

- 1 回の atomic operation で空き Node ID を取得する。
- owner token と有効期限を保存する。
- owner token が一致する場合だけ lease を更新・解放する。
- lease 更新が安全余裕を残して失敗した時点で、新しい ID の発行を停止する（fail closed）。
- 接続復旧時は以前の割当を暗黙に再利用せず、lease の所有権を再確認する。
- graceful shutdown で lease を解放するが、解放だけに安全性を依存しない。

ネットワーク分断中も発行を続ける設計では、期限切れ Node ID が別プロセスへ再割当され、重複が
起こり得ます。可用性より一意性を優先し、所有権を確認できない発行プロセスは停止させます。

## Restart and reuse

同じ Node ID を再利用する新プロセスは、旧プロセスと並行稼働していないことに加え、旧プロセスが
使用した最終 Timestamp / Sequence を再利用しないことを保証する必要があります。

### Quarantine（規範的な既定）

**既定の quarantine 期間:** `120_000` ミリ秒（`2` 分）。

規則:

- Node ID が解放されたあと（lease の期限切れ・解放、または意図的な退役）、quarantine 期間が
  経過するまで別のジェネレーターへ割り当ててはなりません。
- quarantine 期間は、設定された時計巻き戻し許容時間以上でなければなりません
  （既定の許容は `5_000` ms。v1 仕様 §7 を参照）。
- lease 方式では、推奨 quarantine は `max(2 * clock_rollback_tolerance, lease_ttl)` です。
- 旧プロセスの最終 Timestamp を永続化し、起動時比較により新しいプロセスがより前の
  `(Timestamp, Sequence)` を発行できないことが保証できる場合、quarantine を短縮しても構いません。
  ただし同時稼働の排除は運用者の責任です。
- 所有権や最終発行状態を確認できない場合は、quarantine を短縮せず別 Node ID を割り当てます。

推奨策:

- 最終 Timestamp を durable storage に保存し、起動時に比較する。
- lease 解放や Node 再割当のあと、上記の quarantine 規則を適用する。
- 確認できない場合は別 Node ID を割り当てる。

## Operational signals

最低限、以下を metrics / logs として観測可能にします。

- active Node ID と instance identity
- lease acquire / renew / loss
- 発行数と Sequence 枯渇回数
- clock rollback の検出回数と幅
- 最終発行 Timestamp
- generation error の種類

Node ID の衝突を検知した場合は、その Node の全 generator を停止し、影響期間に発行された ID を
監査してください。

## 参照実装

TypeScript の control-plane ヘルパーは [`@orbit-id/node-lease`](../../packages/node-lease/) にあります。

- `MemoryLeaseStore` — 単一プロセス / テスト向け
- `RedisLeaseStore` — Redis + Lua による atomic acquire / renew / release
- `NodeLeaseClient` — acquire / renew / release / `confirmOwnership`

lease 喪失時は `@orbit-id/core` の `OrbitGenerator` に `confirmOwnership` を渡し fail closed
にしてください。`generate` ごとに Redis を呼ばないでください。


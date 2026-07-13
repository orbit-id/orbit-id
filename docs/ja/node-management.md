# Node Management

[English](../en/node-management.md)

Orbit ID の一意性は、同時に発行するプロセス間で Node ID（`0..127`）が重複しないことに
依存します。Node ID の割当は control plane の責務であり、ID ごとの生成処理はローカルで
完結させます。

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

推奨策:

- 最終 Timestamp を durable storage に保存し、起動時に比較する。
- lease 解放後に clock rollback の最大許容幅を上回る quarantine period を設ける。
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

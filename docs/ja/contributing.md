# Contributing to Orbit ID

[English](../../CONTRIBUTING.md)

Orbit ID は現在 specification-first で開発しています。実装より先に、形式、境界条件、test vector の
相互運用性を確定します。

## Proposing a change

1. 変更する要件とユースケースを説明する issue を作成する。
2. bit layout または wire format を変える場合、互換性と migration plan を示す。
3. pull request では specification、関連ドキュメント、test vector を同時に更新する。
4. Type 追加は [Type Registry](type-registry.md) の規則に従う。

## Documentation style

- 時刻は UTC の ISO 8601 形式で記載します。
- bit 数、境界値、shift 量には計算可能な正確な値を併記します。
- 理論性能と benchmark 結果を区別します。
- `unique`、`ordered`、`valid` などの保証範囲を明示します。

## Compatibility

stable v1 公開前は仕様が変更される可能性があります。stable 公開後、同じ major version 内では
既存の 64-bit 値の解釈を変更しません。

## Pull request checklist

- [ ] 変更理由と利用例を記載した
- [ ] 64-bit 合計と field boundary を再確認した
- [ ] encode / decode の両方向を考慮した
- [ ] clock rollback、overflow、concurrency への影響を確認した
- [ ] storage / JSON interoperability への影響を確認した
- [ ] 必要な specification と docs を更新した

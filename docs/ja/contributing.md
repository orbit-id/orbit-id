# Contributing to Orbit ID

[English](../en/contributing.md)

Orbit ID は specification-first です。新しい言語パッケージより先に、形式・境界条件・test vector を
整えます。stable v1 の解釈は凍結済みです（下記 Compatibility を参照）。

## Proposing a change

1. 変更する要件とユースケースを説明する issue を作成する。
2. bit layout または wire format を変える場合、互換性と migration plan を示す。
3. pull request では specification、関連ドキュメント、test vector を同時に更新する。

## Documentation style

- 時刻は UTC の ISO 8601 形式で記載します。
- bit 数、境界値、shift 量には計算可能な正確な値を併記します。
- 理論性能と benchmark 結果を区別します。
- `unique`、`ordered`、`valid` などの保証範囲を明示します。

## Compatibility

現行の v1 stable リリースは `v1.1.0` です。v1 major 内では既存の 64-bit 値の解釈を変更しません。
**v1.x は保守モード**です。バグ修正・ドキュメント整備を優先し、新機能は原則追加しません。
新しい形式 / API の作業は v2（128-bit）トラックで行います — [Roadmap](roadmap.md) と
[Orbit ID v2 (128-bit) を採用する理由](why-128bit.md) を参照。

## Pull request checklist

- [ ] 変更理由と利用例を記載した
- [ ] 64-bit 合計と field boundary を再確認した
- [ ] encode / decode の両方向を考慮した
- [ ] clock rollback、overflow、concurrency への影響を確認した
- [ ] storage / JSON interoperability への影響を確認した
- [ ] 必要な specification と docs を更新した

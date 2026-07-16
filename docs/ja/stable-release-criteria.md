# Orbit ID を stable v1.0.0 へ昇格する基準

[English](../en/stable-release-criteria.md)

この文書は、`v1.0.0-draft.*` を `v1.0.0` に上げてよい条件と、そのコミットメントの意味を定義します。

## 互換コミットメント

最初の **stable** `v1.0.0` タグ以降:

- 既存の Orbit ID v1 64-bit 値の解釈を、v1 major 内で変更してはなりません
- field 幅、shift 量、Orbit Epoch、encode / decode 式を、既発行 ID の意味が変わる形で
  変更してはなりません
- 破壊的な形式変更は、64-bit 値の **外** で識別する新しい major が必要です

それより前の Draft リリースは、まだ変更され得ます。

## stable v1.0.0 前に必須

次をすべて満たす必要があります。

1. **ライセンス** — OSS ライセンスファイルがあり、README に記載されている。
2. **Type field** — Type の規則（`0` 予約、意味は deployer 所有）が v1 仕様で規範的である。
3. **Node 割当** — 本番の割当方式と再利用 quarantine の既定が Node Management で規範的である。
4. **時計巻き戻し** — 既定許容と fail closed が v1 仕様で規範的である。
5. **Conformance suite** — `spec/conformance/` が参照実装に必要な encode/decode・拒否・generator
   振る舞いをカバーしている。
6. **Library API** — 共通 operations、error codes、時計注入、並行性規則が文書化されている。
7. **Versioning 方針** — 帯域内 version bit なし。将来形式の外部識別が文書化されている。
8. **Core パッケージ** — `packages/core` があり、`spec/conformance/` に整合した共有の参照ロジックと
   fixture を提供する（他言語パッケージが追従するモノレポ上の基準）。
9. **参照実装** — 少なくとも 1 言語パッケージ（推奨: TypeScript）が CI で conformance suite に合格する。
10. **Status 表記** — 仕様 / README の Status が Draft から stable `v1.0.0` へ更新される。

## リリース checklist

stable `v1.0.0` を切るとき（本リポジトリでは完了済み）:

- [x] 上記の必須リストを確認した（`packages/core` を含む）
- [x] 仕様 Status を `v1.0.0` にした
- [x] README / ROADMAP の Status 文言を更新した
- [x] リポジトリに `v1.0.0` タグを打った
- [x] v1 major 内で 64-bit 解釈が凍結されることを告知した
  （README の Status と本ドキュメントの互換コミットメントを参照）

## stable 以降

Type フィールドの追加ガイダンス、運用ガイド、ライブラリ機能は、あるデプロイで既発行 ID の意味を
変えなければ minor / patch で出せます。

# Orbit ID v2 alpha 終了と `2.0.0` 昇格

[English](../en/v2-alpha-exit.md)

Tracker: [#138](https://github.com/orbit-id/orbit-id/issues/138)（条件文）·
[#197](https://github.com/orbit-id/orbit-id/issues/197)（ドキュメント揃え）。  
関連: [Roadmap](roadmap.md) · [横断 versioning](cross-registry-versioning.md) ·
[Library API](library-api.md) · [Design Decisions（v2）](design-decisions-v2.md)。

本ドキュメントは **alpha をいつ終えるか**、およびパッケージ major で v2 をルート API にする方法
（`@orbit-id/core@2.0.0` と他エコシステム）を固定します。

## alpha 中（`v2.0.0-alpha.*` / 1.x の加算）

| 規則 | 内容 |
| --- | --- |
| 仕様ステータス | alpha 中は [Orbit ID v2](orbit-id-v2.md) が **Draft**。いまは **Stable**（[#201](https://github.com/orbit-id/orbit-id/issues/201)） |
| パッケージ既定 | **1.x** のルートは **v1** |
| v2 の使い方 | 加算名前空間のみ（`v2` / `@orbit-id/core/v2`、`com.github.orbitid.v2` など） |
| レジストリタグ | 安定版 `vX.Y.Z` のみ公開。pre-release Git タグは公開しない（[#148](https://github.com/orbit-id/orbit-id/issues/148)） |
| Go | パッケージ `2.0.0` でモジュール `/v2` になるまで公開 v2 は `internal/v2` |

## alpha 終了条件（チェックリスト）

次を **すべて**満たしたときだけ alpha を終えてよい（beta / 凍結へ進める）:

1. **レイアウト凍結** — [design-decisions-v2](design-decisions-v2.md) が FormatVersion /
   Timestamp / Type / Node / Sequence / Region / Tenant を frozen（幅とビット位置）と明記。残
   Reserved（8）は encode MUST `0`。それらを alpha で再分割する提案が残っていない。
2. **Reserved の切り出し** — Region（4）+ Tenant（16）を切り出し済み。残 Reserved（8）は encode MUST `0` で
   fixture カバー済み。残 8 bit からの Datacenter 等の切り出しは **パッケージ `2.0.0` 以降へ延期**
   （新しい ADR）。alpha 終了前の必須ではない。
3. **Conformance green** — v2 対応を謳う公開言語パッケージで `spec/conformance/*.v2.json` が通る
   （TypeScript/`@orbit-id/core`、Java、Rust、PHP。Go は `internal/v2` テスト）。
4. **API 面** — [Library API](library-api.md) の v2 差分どおり（`generate` / `parse` / getters /
   `isValid` + FormatVersion / Region / Tenant / Reserved）。CLI・playground は v1 既定を壊さず v2 を扱える。
5. **ドキュメント** — 規範 Draft の文言、node-management / library-api / roadmap が範囲と下記昇格パスで
   一致している。
6. **ブロッカー Issue なし** — 上記に必要な open な `v2-alpha` 実装 Issue がクローズ、または
   `2.0.0` 以降へ明示的に延期されている。

終了は **ドキュメントとプロセスのゲート**であり、自動的に `2.0.0` を公開するものではない。

### 条件の充足状況

[#197](https://github.com/orbit-id/orbit-id/issues/197) 時点で項目 **1–6 は充足**。仕様ステータスは
スライス A で **Stable**（[#201](https://github.com/orbit-id/orbit-id/issues/201)）。
任意の `v2.0.0-beta.*` 凍結は **スキップ**（[#199](https://github.com/orbit-id/orbit-id/issues/199)）。
パッケージ `2.0.0` のルート API 入れ替えとレジストリ公開は
[昇格計画](v2-package-2.0.0.md) で追跡。

## パッケージ `2.0.0` への昇格（ルート → v2）

alpha 終了条件を満たしたあと（任意の `v2.0.0-beta.*` 凍結は **スキップ**）:

| 手順 | 内容 |
| --- | --- |
| 1 | Draft → **Stable** 仕様で v2 ワイヤを凍結 |
| 2 | モノレポのリリースカットでパッケージ major を **`2.0.0`** に揃える |
| 3 | 各言語で **v2 をルート / 既定**の公開 API にする（[Library API](library-api.md) の表） |
| 4 | **v1** は明示的な `v1` 名前空間 / モジュール / フラグで残す |
| 5 | 一時的な加算パス（`@orbit-id/core/v2`）は新ルートの別名にするか、残す場合は非推奨を文書化 |

**実行計画（スライス順）:** [パッケージ `2.0.0` 昇格計画](v2-package-2.0.0.md)
（[#199](https://github.com/orbit-id/orbit-id/issues/199)）。

SemVer: ルートを v2 にするのは、ルートを v1 としていた消費者への **破壊的変更**なので **X = 2**。
仕様トラックのタグ（`v2.0.0-alpha.*` / `v2.0.0-beta.*`）は **形式のライフサイクル**、パッケージ
`2.0.0` はその形式を既定にした **ライブラリ** major。

Go: パッケージ major 2 と同時にモジュールパス `…/v2` で公開する（Go modules の `/v2` 接尾辞要件）。

## `2.0.0` 以降

- 新機能は原則 v2 向け。
- v1 はレガシー 64-bit の読み書き用に残し、ワイヤは凍結のまま。
- 追加の Reserved 切り出し（例: Datacenter）は **新しい ADR** と SemVer（発行済み Reserved=`0` と互換なら
  minor になりやすい）に従う。

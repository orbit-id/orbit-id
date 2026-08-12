# パッケージ `2.0.0` 昇格計画

[English](../en/v2-package-2.0.0.md)

Tracker: [#199](https://github.com/orbit-id/orbit-id/issues/199)。  
関連: [v2 alpha 終了](v2-alpha-exit.md) · [Library API](library-api.md) ·
[横断 versioning](cross-registry-versioning.md) · [Roadmap](roadmap.md)。

本ドキュメントはパッケージ major を `2.0.0` にし、公開ルートを v2 にする **実行計画**です。
タグ切りやレジストリ公開そのものは含みません。

## 決定

| 項目 | 選択 |
| --- | --- |
| 任意の `v2.0.0-beta.*` 凍結 | **スキップ** — alpha 終了条件充足の Draft から下記 `2.0.0` 作業へ進む |
| カット時の仕様ステータス | パッケージ `2.0.0` と同じ列車で [Orbit ID v2](orbit-id-v2.md) を **Draft → Stable** |
| レジストリ公開 | 全コードスライス合流後、協調 `v2.0.0` GitHub Release / タグでのみ |
| Datacenter / 残 Reserved 切り出し | 引き続き **`2.0.0` 以降**（新 ADR） |

## 到達状態

| 観点 | `2.0.0` 後 |
| --- | --- |
| パッケージ版 | npm / Maven / crates / Go mirror / Packagist で協調 **`2.0.0`** |
| 公開既定 API | パッケージルートで **v2**（128-bit）。Go はモジュールパス `…/v2` |
| レガシー v1 | 明示的な `v1` 名前空間 / モジュール / CLI フラグで残す |
| 一時的な加算 `v2` パス | 新ルートの別名を優先。残す場合は非推奨を文書化 |
| 仕様 | Stable。ワイヤ凍結（Region/Tenant 含む。残 Reserved MUST `0`） |

言語ごとの入口: [Library API § 言語ごとの入口](library-api.md)。

## 作業パッケージの順序（Issue / PR を分ける）

レビューしやすい小さな PR にする。バージョン bump / タグはスライス A–H が `main` に入ってから。

| スライス | 範囲 | メモ |
| --- | --- | --- |
| **A. Spec → Stable** | EN/JA `orbit-id-v2`、design-decisions、test-vectors の Status。conformance README | ワイヤ変更なし。文言のみ |
| **B. `@orbit-id/core`** | ルートを v2 に。現行ルートを `v1` / `@orbit-id/core/v1` へ。`@orbit-id/core/v2` はルートの別名 | カバレッジ 100%。exports / README 更新 |
| **C. `@orbit-id/typescript`** | core と同じルート / `v1` / `v2` 方針 | 薄い re-export |
| **D. Java** | `com.github.orbitid` → v2。旧ルートは `com.github.orbitid.v1`。`.v2` は別名可 | Maven サンプル / README |
| **E. Rust** | crate root → v2。`orbit_id::v1`。`orbit_id::v2` 別名 | crate docs |
| **F. PHP** | `OrbitId\` → v2。`OrbitId\V1`。`OrbitId\V2` 別名 | Composer / Packagist README |
| **G. Go** | モジュール **`github.com/orbit-id/go/v2`**。`internal/v2` を公開化。`github.com/orbit-id/go` は v1 のまま | `go.mod`、mirror、[go-module.md](go-module.md) |
| **H. CLI + playground** | 既定 `--spec` / UI → v2。明示的 v1 モードは残す | `--spec v1` を壊さない |
| **I. Docs 仕上げ** | 1.x → 2.0.0 移行メモ、CHANGELOG、README、Go `/v2` 節 | I 単独または J 直前 |
| **J. リリースカット** | マニフェストを `2.0.0` に揃え、合流後 GitHub Release **`v2.0.0`** | [横断 versioning](cross-registry-versioning.md) のチェックリスト |

### Issue タイトル案

本 Issue を epic にし、着手時に子 Issue を切る例:

- `feat(core): make v2 the root API for package 2.0.0`
- `feat(go): publish Orbit ID v2 under module path /v2`
- `chore(release): cut coordinated v2.0.0`

## 消費者移行（要約）

| いま（1.x） | `2.0.0` 後 |
| --- | --- |
| ルートを **v1** として import | 破壊的 — `v1` 名前空間 / 旧 Go モジュールへ、または v2 へ移行 |
| 加算 **v2** を import | ルートへ寄せる（別名を残す場合はそのまま可） |
| Go `github.com/orbit-id/go` | **v1** のまま。v2 は `github.com/orbit-id/go/v2` |
| CLI 既定 v1 | 既定は v2。v1 は明示フラグ / `--spec v1` |

64-bit の v1 ID を v2 として再解釈してはならない、は継続。

## リリースゲート（スライス J）

`v2.0.0` タグ前:

1. スライス A–I 合流、`main` の CI green。
2. ツリー内バージョン = `2.0.0`（Bump release PR / `npm run release:bump -- 2.0.0`）。
3. 各言語で共有 v2 fixture をパッケージルートから generate/parse（Go は `/v2`）。
4. GitHub Release `v2.0.0`（pre-release ではない）を作り Publish を走らせる。
5. npm / Maven / crates / Packagist / `proxy.golang.org` の `…/go/v2@v2.0.0` を確認。

## この列車の範囲外

- 残 Reserved 8 bit からの Datacenter 等
- pre-release タグからのレジストリ公開
- v1 ワイヤ形式の変更

## ステータス

計画のみ（[#199](https://github.com/orbit-id/orbit-id/issues/199)）。実装 Issue/PR は本計画のマージ後。

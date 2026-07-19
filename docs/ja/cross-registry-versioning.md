# 横断の version / tagging 方針

[English](../en/cross-registry-versioning.md)

npm・Maven Central・Go modules・crates.io・Packagist 向けの共通リリース方針です。
親トラッカー: [#42](https://github.com/orbit-id/orbit-id/issues/42)。

npm の詳細は [npm Trusted Publishing](npm-trusted-publishing.md) を参照。本ドキュメントは
**Git タグと各エコシステムのバージョンの対応** を定義します。

## 目的

- モノレポの一度のリリースカットを分かりやすくする。
- 統合 Publish workflow（`v*` タグで `.github/workflows/publish.yml`）に揃える。
- 特定レジストリだけの packaging 修正も可能にする。

## モノレポのタグ方針（決定）

リポジトリ全体の SemVer タグ **`vX.Y.Z`**（例: `v1.0.1`）を使う。

| タグ | 役割 |
| --- | --- |
| `vX.Y.Z` | [`orbit-id/orbit-id`](https://github.com/orbit-id/orbit-id) のリリースカット。Publish（npm / Maven / crates / Packagist / Go ミラー）が走る。全エコシステム向けの既知のツリーを示す。 |

`java-v1.0.0` や `rust-v1.0.0` のような言語別ルートタグは作らない。代わりに:

1. 対象パッケージのツリー内バージョンを上げる。
2. 含めるリリースなら `vX.Y.Z` を push。

プレリリースは `v1.1.0-rc.1` 形式を可とする。初回の Central / crates / Packagist 公開は安定版
`vX.Y.Z` を推奨。

## いつ X.Y.Z を上げるか

パッケージ版は SemVer `X.Y.Z` とし、本リポジトリでは次の慣習とする（あわせて
[v1 ワイヤ形式](orbit-id-v1.md) の互換を守る）:

| 成分 | 意味 | 例 |
| --- | --- | --- |
| **X**（major） | **破壊的**変更 | 公開 API の非互換変更。既存 ID の解釈を変える encode/decode 変更（通常は新 major — 凍結済み v1 ワイヤ形式を参照） |
| **Y**（minor） | **横断**・リポジトリ全体向けの非破壊変更 | 全言語が追う仕様・文書の整備、共有 conformance の更新、モノレポ横断の機能追加や修正 |
| **Z**（patch） | **その言語 / そのエコシステムだけ** | Java だけの packaging 修正、Rust だけのバグ修正、PHP / Packagist ミラーだけの調整、共有変更なしの Go タグ更新 |

補足:

- **X** / **Y** は npm / Java / Rust / Go / PHP で同じ `X.Y.Z` に揃える **同時リリース**を推奨。
- **Z** はそのエコシステムの metadata だけ上げる（publish が必要ならモノレポの `vX.Y.Z` タグは打つ）。他マニフェストはそのままでよい（npm / crates は既存版をスキップする）。
- **Bump release PR** Action（`.github/workflows/bump-release-pr.yml`）は公開カットの一括 bump PR を開く。主に **X** / **Y**（意図的な lockstep の **Z**）向け。本当に言語だけの **Z** は手動 bump（または後で Action に個別トグルを足す）。

## パッケージごとのバージョン metadata

各パッケージのレジストリ版は各マニフェストが持つ。**同時リリース**では、タグ前にそれらを
同じ `X.Y.Z` に揃える。

| エコシステム | パス | バージョンの出处 | レジストリ |
| --- | --- | --- | --- |
| npm | `packages/{core,typescript,cli}/package.json` | `"version"` | npm（`@orbit-id/*`） |
| Java | `packages/java/pom.xml`（`io.github.orbit-id:orbit-id`） | `<version>` | Maven Central（[docs](maven-central.md)） |
| Go | （ミラー上の Git タグ。`go.mod` に版なし） | モノレポ `vX.Y.Z` → [`orbit-id/go`](https://github.com/orbit-id/go) へミラー | `proxy.golang.org` |
| Rust | `packages/rust/Cargo.toml` | `version` | crates.io |
| PHP | `packages/php/composer.json` | 固定版なし。Packagist は Git タグ | Packagist |

`node-lease` / `playground` / `benchmark` は、別途指定しない限り公開マルチレジストリの対象外。

単独修正: そのエコシステムのマニフェストだけ上げ、新しい `vX.Y.Z` を打つ。npm は既存 `name@version` をスキップできる。

## Git タグ → レジストリ対応

| レジストリ | バージョンの決まり方 | メモ |
| --- | --- | --- |
| **npm** | タグ時点の `package.json` `"version"` | 未公開なら publish。`v1.0.1` と各 package 版の一致は必須ではないが、同時リリースでは揃える。 |
| **Maven Central** | `pom.xml` `<version>` | 同時出荷時はカットと同じ `X.Y.Z`（#54）。 |
| **Go** | ミラー [`orbit-id/go`](https://github.com/orbit-id/go) 上の Git タグ | モジュールパス: `github.com/orbit-id/go`。`go get github.com/orbit-id/go@vX.Y.Z`。CI が `packages/go` を subtree-split。詳細: [Go モジュール公開](go-module.md)。 |
| **crates.io** | `Cargo.toml` `version` | `packages/rust` から publish（[docs](crates-io.md)）。`vX.Y.Z` に揃える。 |
| **Packagist** | ミラー [`orbit-id/php`](https://github.com/orbit-id/php) 上の Git タグ | ルート `vX.Y.Z` を基本に。CI が `packages/php` を subtree-split。詳細: [Packagist 公開](packagist.md)。 |

## Go モジュールパス

`packages/go/go.mod` と一致させる正本パス:

```text
github.com/orbit-id/go
```

手順:

```bash
git tag v1.1.0
git push origin v1.1.0
# Publish workflow が packages/go → orbit-id/go（同名タグ）へミラー
```

確認:

```bash
GOPROXY=https://proxy.golang.org,direct go list -m github.com/orbit-id/go@v1.1.0
```

## セキュリティ / provenance

| レジストリ | 期待 |
| --- | --- |
| **npm** | Trusted Publishing（OIDC）+ 公開リポジトリの provenance。[npm Trusted Publishing](npm-trusted-publishing.md)。定常運用で長期 `NPM_TOKEN` は使わない。 |
| **Maven Central** | Central が求める署名。秘密情報は Environment / OIDC 経由（#54）。 |
| **Go** | Git + checksum DB（`sum.golang.org`）。ミラー push は `GO_SPLIT_TOKEN`（Packagist と同様）。 |
| **crates.io** | crate token 等。トークンをコミットしない（#56）。 |
| **Packagist** | GitHub 連携。リポジトリ権限以外のアップロード秘密は最小（#57）。 |

公開物には Apache-2.0 の LICENSE と正確な README / repository metadata を含める。
脆弱性報告はリポジトリの Security advisories（[Security](security.md)）。

## メンテナ checklist（同時リリース）

推奨: **Bump release PR**（`.github/workflows/bump-release-pr.yml`）を
**Actions → Bump release PR → Run workflow** で実行する。ツリー内バージョンを bump して PR を開く。
マージ後は GitHub Release（タグ `vX.Y.Z`）を作成して既存の Publish workflow を動かす。
Go / PHP ミラーも同じ `vX.Y.Z` から Publish workflow が更新する。

前提（org）: **Actions → General → Workflow permissions** で **Read and write** と
**Allow GitHub Actions to create and approve pull requests** を有効にする。
オフだと `GITHUB_TOKEN` が `createPullRequest` できない。

ツリー内 bump（Action / `npm run release:bump`）:

| エコシステム | 対象 |
|--------------|------|
| npm | root + `packages/{core,typescript,cli}/package.json`、lockfile。node-lease / playground の `@orbit-id/core` dep（ある場合） |
| Maven | `packages/java/pom.xml` |
| crates.io | `packages/rust/Cargo.toml` |
| Go | なし（`packages/go` を `v*` でミラー — [go-module.md](go-module.md)） |
| PHP | なし（`v*` を mirror 経由で Packagist） |

入力:

- `version` — `v` なしの SemVer（例: `1.0.2`）

ローカルでの bump（タグなし）:

```bash
npm run release:bump -- 1.0.2 --dry-run
npm run release:bump -- 1.0.2
npm install --package-lock-only
```

Action を使わない場合の手順:

1. `X.Y.Z` の互換性を確認（特に major）。
2. 公開したいパッケージのツリー内バージョンを bump（npm / Java / Rust。PHP / Go はタグ + ミラー）。
3. `main` の CI が緑であること。
4. `vX.Y.Z` を push。
5. 確認: Publish workflow（npm / Maven / crates / Packagist / Go）。
6. 出荷したレジストリの install コマンドをスポットチェック。

既存タグのあとにバージョンだけ書き換えても、publisher はそのタグのコミットを見るため効きません。
## 関連

- [npm Trusted Publishing](npm-trusted-publishing.md)
- [#42](https://github.com/orbit-id/orbit-id/issues/42)
- [#54](https://github.com/orbit-id/orbit-id/issues/54) Maven · [#55](https://github.com/orbit-id/orbit-id/issues/55) Go · [#56](https://github.com/orbit-id/orbit-id/issues/56) crates.io · [#57](https://github.com/orbit-id/orbit-id/issues/57) Packagist

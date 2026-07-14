# 横断の version / tagging 方針

[English](../en/cross-registry-versioning.md)

npm・Maven Central・Go modules・crates.io・Packagist 向けの共通リリース方針です。
親トラッカー: [#42](https://github.com/orbit-id/orbit-id/issues/42)。

npm の詳細は [npm Trusted Publishing](npm-trusted-publishing.md) を参照。本ドキュメントは
**Git タグと各エコシステムのバージョンの対応** を定義します。

## 目的

- モノレポの一度のリリースカットを分かりやすくする。
- 既存の npm workflow（`v*` タグで `.github/workflows/publish.yml`）に揃える。
- 特定レジストリだけの packaging 修正も可能にする。

## モノレポのタグ方針（決定）

リポジトリ全体の SemVer タグ **`vX.Y.Z`**（例: `v1.0.1`）を使う。

| タグ | 役割 |
| --- | --- |
| `vX.Y.Z` | [`orbit-id/orbit-id`](https://github.com/orbit-id/orbit-id) のリリースカット。`v*` に一致すると npm Publish が走る。全エコシステム向けの既知のツリーを示す。 |
| `packages/go/vX.Y.Z` | サブディレクトリモジュール用の **追加** Go タグ。意図する Go モジュール SemVer と一致させること（下記）。 |

`java-v1.0.0` や `rust-v1.0.0` のような言語別ルートタグは作らない。代わりに:

1. 対象パッケージのツリー内バージョンを上げる。
2. 含めるリリースなら `vX.Y.Z` を push。
3. Go が更新されるなら同じ `X.Y.Z` で `packages/go/vX.Y.Z` も push。

プレリリースは `v1.1.0-rc.1` 形式を可とする。初回の Central / crates / Packagist 公開は安定版
`vX.Y.Z` を推奨。

## パッケージごとのバージョン metadata

各パッケージのレジストリ版は各マニフェストが持つ。**同時リリース**では、タグ前にそれらを
同じ `X.Y.Z` に揃える。

| エコシステム | パス | バージョンの出处 | レジストリ |
| --- | --- | --- | --- |
| npm | `packages/{core,typescript,cli}/package.json` | `"version"` | npm（`@orbit-id/*`） |
| Java | `packages/java/pom.xml`（`io.github.orbit-id:orbit-id`） | `<version>` | Maven Central（[docs](maven-central.md)） |
| Go | （`go.mod` に版なし。Git タグ） | `packages/go/vX.Y.Z` | `proxy.golang.org` |
| Rust | `packages/rust/Cargo.toml` | `version` | crates.io |
| PHP | `packages/php/composer.json` | 固定版なし。Packagist は Git タグ | Packagist |

`node-lease` / `playground` / `benchmark` は、別途指定しない限り公開マルチレジストリの対象外。

単独修正: そのエコシステムのマニフェストだけ上げ、新しい `vX.Y.Z` を打ち、Go が変わったときだけ
`packages/go/vX.Y.Z` も打つ。npm は既存 `name@version` をスキップできる。

## Git タグ → レジストリ対応

| レジストリ | バージョンの決まり方 | メモ |
| --- | --- | --- |
| **npm** | タグ時点の `package.json` `"version"` | 未公開なら publish。`v1.0.1` と各 package 版の一致は必須ではないが、同時リリースでは揃える。 |
| **Maven Central** | `pom.xml` `<version>` | 同時出荷時はカットと同じ `X.Y.Z`（#54）。 |
| **Go** | `packages/go/vX.Y.Z` | モジュールパス: `github.com/orbit-id/orbit-id/packages/go`。ルートの `vX.Y.Z` だけでは不十分。詳細: [Go モジュール公開](go-module.md)。 |
| **crates.io** | `Cargo.toml` `version` | `packages/rust` から publish（#56）。`vX.Y.Z` に揃える。 |
| **Packagist** | Packagist が見る Git タグ | ルート `vX.Y.Z` を基本に。サブディレクトリ配線は #57 で確定。 |

## Go モジュールパス

`packages/go/go.mod` と一致させる正本パス:

```text
github.com/orbit-id/orbit-id/packages/go
```

Go 向けリリース手順:

```bash
git tag v1.0.1
git tag packages/go/v1.0.1
git push origin v1.0.1 packages/go/v1.0.1
```

確認:

```bash
GOPROXY=https://proxy.golang.org,direct go list -m github.com/orbit-id/orbit-id/packages/go@v1.0.1
```

## セキュリティ / provenance

| レジストリ | 期待 |
| --- | --- |
| **npm** | Trusted Publishing（OIDC）+ 公開リポジトリの provenance。[npm Trusted Publishing](npm-trusted-publishing.md)。定常運用で長期 `NPM_TOKEN` は使わない。 |
| **Maven Central** | Central が求める署名。秘密情報は Environment / OIDC 経由（#54）。 |
| **Go** | Git + checksum DB（`sum.golang.org`）。アップロード用シークレットは不要。 |
| **crates.io** | crate token 等。トークンをコミットしない（#56）。 |
| **Packagist** | GitHub 連携。リポジトリ権限以外のアップロード秘密は最小（#57）。 |

公開物には Apache-2.0 の LICENSE と正確な README / repository metadata を含める。
脆弱性報告はリポジトリの Security advisories（[Security](security.md)）。

## メンテナ checklist（同時リリース）

1. `X.Y.Z` の互換性を確認（特に major）。
2. 公開したいパッケージのツリー内バージョンを bump（npm / Java / Rust。PHP はタグ。Go はサブディレクトリタグ）。
3. `main` の CI が緑であること。
4. タグを push:
   - 必須: `vX.Y.Z`
   - Go 更新時: `packages/go/vX.Y.Z`
5. 確認: npm Publish、および #54–#57 の手順。
6. 出荷したレジストリの install コマンドをスポットチェック。

## 関連

- [npm Trusted Publishing](npm-trusted-publishing.md)
- [#42](https://github.com/orbit-id/orbit-id/issues/42)
- [#54](https://github.com/orbit-id/orbit-id/issues/54) Maven · [#55](https://github.com/orbit-id/orbit-id/issues/55) Go · [#56](https://github.com/orbit-id/orbit-id/issues/56) crates.io · [#57](https://github.com/orbit-id/orbit-id/issues/57) Packagist

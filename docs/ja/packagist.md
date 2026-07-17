# Packagist 公開

[English](../en/packagist.md)

`packages/php`（`orbit-id/php`）を [Packagist](https://packagist.org/) へ公開します。

公開 Packagist はモノレポのサブディレクトリをそのままパッケージにできません。
そのため各 `v*` タグで `packages/php` を専用リポジトリ
[`orbit-id/php`](https://github.com/orbit-id/php) へミラーします。

トラッカー: [#57](https://github.com/orbit-id/orbit-id/issues/57)。方針:
[横断の version / tagging 方針](cross-registry-versioning.md)。

## 構成

```text
orbit-id/orbit-id  （正本）
        │  v* / workflow_dispatch で subtree split
        ▼
orbit-id/php       （ミラー）
        │  Packagist の GitHub hook / API
        ▼
packagist.org/packages/orbit-id/php
```

`orbit-id/php` へ機能 PR は送らないでください。変更はモノレポの `packages/php` で行います。

## 初回セットアップ

1. ミラー [`orbit-id/php`](https://github.com/orbit-id/php) があること。
2. `orbit-id/php` に **Contents: Read and write** がある PAT を作成。
   `GITHUB_TOKEN` を入れないこと（カレントリポジトリ以外には書けない）。
3. `orbit-id/orbit-id` の Actions シークレットに `PHP_SPLIT_TOKEN` を追加。
4. **Publish** workflow の `packagist` job を一度手動実行して `main` を埋める。
   checkout は `persist-credentials: false` なので、split の push は
   `PHP_SPLIT_TOKEN` を使う（ジョブの `GITHUB_TOKEN` 資格情報で上書きされない）。
5. [packagist.org](https://packagist.org/packages/submit) で `https://github.com/orbit-id/php` を登録。
6. 任意: `PACKAGIST_USERNAME` / `PACKAGIST_TOKEN`（タグ後の update API 用）。

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) の `packagist` job
（[`.github/actions/publish-packagist`](../../.github/actions/publish-packagist/action.yml)）
が `packages/php` を subtree-split し、`orbit-id/php` の `main` と（タグ時は）同名タグへ force-push します。

## メンテナ checklist

1. PHP の変更はモノレポの `packages/php` のみ。
2. `main` マージ後、CI `test-php` を確認。
3. `PHP_SPLIT_TOKEN` が設定済みであること。
4. `vX.Y.Z` を push（ミラー上のタグが Packagist の版になる）。
5. ミラーのタグと Packagist を確認。
6. `composer require orbit-id/php:^1.0` をスポットチェック。

## 利用例

```bash
composer require orbit-id/php
```

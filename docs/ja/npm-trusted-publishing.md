# npm Trusted Publishing

[English](../en/npm-trusted-publishing.md)

Orbit ID パッケージは [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
（GitHub Actions からの OIDC）で公開します。GitHub Secrets に長期の `NPM_TOKEN` は不要です。

## パッケージ

| Package | npm |
| --- | --- |
| `@orbit-id/core` | https://www.npmjs.com/package/@orbit-id/core |
| `@orbit-id/typescript` | https://www.npmjs.com/package/@orbit-id/typescript |
| `@orbit-id/cli` | https://www.npmjs.com/package/@orbit-id/cli |

## npmjs.com での初回設定（各パッケージごと）

パッケージが npm 上に存在する状態で、**それぞれ**について:

1. パッケージページ → **Settings** → **Trusted Publisher**
2. **GitHub Actions** を選択
3. 次を入力:
   - Organization or user: `orbit-id`
   - Repository: `orbit-id`
   - Workflow filename: `publish.yml`（パスではなくファイル名のみ）
   - Environment: GitHub Environment を使わないなら空
4. **npm publish** を許可

`@orbit-id/core` / `@orbit-id/typescript` / `@orbit-id/cli` の 3 つに設定します。

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) は次で動きます。

- `v*` タグの push（例: `v1.0.1`）
- 手動の **workflow_dispatch**

`permissions: id-token: write`、Node 24、新しい npm CLI を使います。

## リリース checklist

1. 必要なら `packages/*/package.json` の version を上げる
2. `main` へマージ
3. タグを push（例: `git tag v1.0.1 && git push origin v1.0.1`）
4. Publish workflow の成功を確認
5. `npm view @orbit-id/core version` などで確認

## 初回公開について

- `@orbit-id/core` と `@orbit-id/typescript` は手動で `1.0.0` を初回公開した
- `@orbit-id/cli` も Trusted Publisher 付与のため手動で初回公開した（`1.0.0` / `1.0.1`）。以降は
  この workflow を使う
- Provenance には **公開** GitHub リポジトリが必要
- CI のみの公開に頼る前に、**パッケージごと** に Trusted Publisher を設定する

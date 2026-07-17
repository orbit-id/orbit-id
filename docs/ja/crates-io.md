# crates.io 公開

[English](../en/crates-io.md)

`packages/rust`（`orbit-id`）を [crates.io](https://crates.io/) へ公開します。

トラッカー: [#56](https://github.com/orbit-id/orbit-id/issues/56)。方針:
[横断の version / tagging 方針](cross-registry-versioning.md)。

## 初回セットアップ

1. GitHub 連携の [crates.io](https://crates.io/) アカウントを作成。
2. **初回公開**（Trusted Publishing の前に crate が必要）:
   - publish 権限の API トークン、または
   - Actions シークレット `CARGO_REGISTRY_TOKEN` を設定して **Publish** workflow（`crates` job）を実行、または
   - ローカル: `cd packages/rust && cargo login && cargo publish`
3. crate ページ → **Settings → Trusted Publishing** に追加:
   - Repository: `orbit-id/orbit-id`
   - Workflow filename: `publish.yml`
   - Environment: 使わないなら空
4. Trusted Publishing が動いたら長期の `CARGO_REGISTRY_TOKEN` は削除してよい。

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) の `crates` job
（[`.github/actions/publish-crates`](../../.github/actions/publish-crates/action.yml)）は次で動きます。

- `v*` タグの push
- 手動の **workflow_dispatch**

既存の `orbit-id@version` はスキップ。OIDC（`crates-io-auth-action`）を優先し、未設定なら
`CARGO_REGISTRY_TOKEN` にフォールバックします。

## メンテナ checklist

1. `packages/rust/Cargo.toml` の `version` を上げる。
2. `main` マージ後、CI `test-rust` を確認。
3. `vX.Y.Z` を push。
4. **Publish** workflow の `crates` job 成功を確認。
5. https://crates.io/crates/orbit-id を確認。

## 利用例

```toml
[dependencies]
orbit-id = "1"
```

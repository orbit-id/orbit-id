# Go モジュール公開

[English](../en/go-module.md)

Orbit の Go パッケージは PHP と同様です。ソースはモノレポの `packages/go` に置き、CI が
[`orbit-id/go`](https://github.com/orbit-id/go) へミラーして
[`proxy.golang.org`](https://proxy.golang.org/) から消費します。

トラッカー: [#55](https://github.com/orbit-id/orbit-id/issues/55) /
[#124](https://github.com/orbit-id/orbit-id/issues/124)。方針:
[横断の version / tagging 方針](cross-registry-versioning.md)。

## 構成

```text
orbit-id/orbit-id  (正本 — packages/go)
        │  v* / workflow_dispatch で subtree-split
        ▼
orbit-id/go        (ミラー)
        │  タグ vX.Y.Z
        ▼
proxy.golang.org / pkg.go.dev
```

`orbit-id/go` へ機能 PR を出さないこと。変更はモノレポの `packages/go` のみ。

## モジュールパス

```text
github.com/orbit-id/go
```

[`packages/go/go.mod`](../../packages/go/go.mod) で宣言。パッケージ名は `orbitid`
（[`packages/go/README.md`](../../packages/go/README.md)）。

```bash
go get github.com/orbit-id/go@v1.1.0
```

旧パス `github.com/orbit-id/orbit-id/packages/go` は廃止。

## 初回セットアップ

1. ミラー [`orbit-id/go`](https://github.com/orbit-id/go) があること。
2. `orbit-id/go` に **Contents: Read and write** がある PAT を作成。
   `GITHUB_TOKEN` を入れないこと。
3. `orbit-id/orbit-id` の Actions シークレットに `GO_SPLIT_TOKEN` を追加
   （両方のミラーに書けるなら `PHP_SPLIT_TOKEN` と同じ PAT で可）。
4. **Publish** の `go` job を一度手動実行して `main` を埋める。

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) の `go` job
（[`.github/actions/publish-go`](../../.github/actions/publish-go/action.yml)）:

- `v*` タグ: `packages/go` を subtree-split → `orbit-id/go` の `main` と同名タグへ force-push
- `workflow_dispatch`: `main` のみ（タグイベントでなければタグなし）

## 確認

```bash
GOPROXY=https://proxy.golang.org,direct \
  go list -m github.com/orbit-id/go@v1.1.0
```

新規タグ直後は proxy の反映に数分かかることがあります。すぐ確認するときは
`GOPROXY=direct` を使えます。

## メンテナ checklist

1. Go の変更を `main` にマージ。
2. `GO_SPLIT_TOKEN` が設定済みであること。
3. モノレポで `vX.Y.Z` を push（Publish の `go` job がミラーする）。
4. [`orbit-id/go` のタグ](https://github.com/orbit-id/go/tags) と
   [pkg.go.dev](https://pkg.go.dev/github.com/orbit-id/go) を確認。

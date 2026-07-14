# Go モジュール公開

[English](../en/go-module.md)

Orbit の Go パッケージは **サブディレクトリモジュール** です。別レジストリへの
アップロードはなく、[`proxy.golang.org`](https://proxy.golang.org/) 経由で Git タグを消費します。

トラッカー: [#55](https://github.com/orbit-id/orbit-id/issues/55)。方針:
[横断の version / tagging 方針](cross-registry-versioning.md)。

## モジュールパス

```text
github.com/orbit-id/orbit-id/packages/go
```

[`packages/go/go.mod`](../../packages/go/go.mod) で宣言。パッケージ名は `orbitid`
（[`packages/go/README.md`](../../packages/go/README.md)）。

## タグ

Go 向け SemVer `X.Y.Z` ごとに:

```bash
git tag vX.Y.Z
git tag packages/go/vX.Y.Z
git push origin vX.Y.Z packages/go/vX.Y.Z
```

ルートの `vX.Y.Z` だけでは `go get …/packages/go@vX.Y.Z` に足りません。

## 確認

```bash
GOPROXY=https://proxy.golang.org,direct \
  go list -m github.com/orbit-id/orbit-id/packages/go@v1.0.1
```

新規タグ直後は proxy の反映に数分かかることがあります。すぐ確認するときは
`GOPROXY=direct` を使えます。

## メンテナ checklist

1. Go の変更を `main` にマージ。
2. `packages/go/vX.Y.Z`（通常は `vX.Y.Z` も）を push。
3. `go list -m` / 試しの `go get` で確認。
4. `packages/go/` に LICENSE と README があること。

Go モジュール公開に GitHub Actions のシークレットは不要です。

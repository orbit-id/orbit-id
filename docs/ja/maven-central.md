# Maven Central 公開

[English](../en/maven-central.md)

`packages/java` を [Maven Central](https://central.sonatype.com/)（
[Sonatype Central Publisher Portal](https://central.sonatype.org/publish/publish-portal-maven/)）へ公開します。

座標:

```text
io.github.orbit-id:orbit-id:<version>
```

ネームスペース `io.github.orbit-id` は GitHub org [`orbit-id`](https://github.com/orbit-id) に対応します。
共通タグ方針: [横断の version / tagging 方針](cross-registry-versioning.md)。トラッカー: [#54](https://github.com/orbit-id/orbit-id/issues/54)。

## 初回セットアップ

1. [central.sonatype.com](https://central.sonatype.com/) でアカウント作成。
2. ネームスペース `io.github.orbit-id` を **Claim**（GitHub org 認証）。
3. **User Token** を発行（Maven `settings.xml` 用の username / password）。
4. 署名用の長期 **GPG** 鍵を作成し、秘密鍵を ASCII armor でエクスポート。
5. GitHub リポジトリの **Settings → Secrets and variables → Actions** に追加:

| Secret | 値 |
| --- | --- |
| `MAVEN_CENTRAL_USERNAME` | Central user-token の username |
| `MAVEN_CENTRAL_PASSWORD` | Central user-token の password |
| `MAVEN_GPG_PRIVATE_KEY` | エクスポートした秘密鍵（ASCII） |
| `MAVEN_GPG_PASSPHRASE` | 鍵のパスフレーズ |

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) の `maven` job
（[`.github/actions/publish-maven`](../../.github/actions/publish-maven/action.yml)）は次で動きます。

- `v*` タグの push（npm と同じリリースカット）
- 手動の **workflow_dispatch**

`packages/java` で `mvn -B -Prelease deploy` を実行し、`central` サーバー・GPG・
`central-publishing-maven-plugin` で公開します。

Central 用シークレットが無い場合はジョブが失敗します（途中公開なし）。

## メンテナ checklist

1. 必要なら `packages/java/pom.xml` の `<version>` を上げる（同時リリースなら `vX.Y.Z` に揃える）。
2. `main` へマージし CI `test-java` を確認。
3. 上記 4 シークレットが設定済みであること。
4. `vX.Y.Z` を push（[横断の version / tagging 方針](cross-registry-versioning.md)）。
5. **Publish** workflow の `maven` job 成功を確認。
6. [Central search](https://central.sonatype.com/) で `io.github.orbit-id:orbit-id` を確認。

## 利用例

```xml
<dependency>
  <groupId>io.github.orbit-id</groupId>
  <artifactId>orbit-id</artifactId>
  <version>1.0.0</version>
</dependency>
```

Java のパッケージ名は `com.github.orbitid` のままです。

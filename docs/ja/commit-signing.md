# コミット署名

[English](../en/commit-signing.md)

`main` は ruleset で **署名必須**です。PR ブランチ上の未署名コミットは（squash でも）マージできません。
回避に `gh pr merge --admin` は使わないでください。

squash 後の `main` 上のコミットは GitHub が署名しますが、ruleset が見るのは **PR ブランチ**です。

## 方針

1. `main` 向け PR の各コミットは GitHub で **Verified** であること。
2. git の署名を切らない（`--no-gpg-sign`、`commit.gpgsign=false`）。
3. `gh pr merge --admin` を使わない。保護条件が揃ってからマージする。
4. Verified でなければ止める。回避しない。

GitHub アカウントに署名鍵を登録する（**SSH signing keys** または GPG）。認証用キーとは別。
コミットの Verified バッジで確認する。

## エージェント

`scripts/github-commit-on-branch.mjs`（GraphQL `createCommitOnBranch`）で GitHub 署名のコミットを
作る。リモートにブランチがある状態で:

```bash
git fetch origin main
git push -u origin HEAD:refs/heads/<branch>
node scripts/github-commit-on-branch.mjs <branch> "<commit headline>"
git fetch origin <branch> && git reset --hard origin/<branch>
```

GitHub が署名できるトークンを使う（Actions の `GITHUB_TOKEN`）。mutation が拒否される、または
コミットが未署名なら止める。

## Bump release PR

`.github/workflows/bump-release-pr.yml` は未署名の `git commit` を使わない。
`chore/release-vX.Y.Z` を `main` 先端に合わせたあと `scripts/github-commit-on-branch.mjs` で
verified な bump コミットを足す。

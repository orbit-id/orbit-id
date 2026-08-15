# コミット署名

[English](../en/commit-signing.md)

`main` は ruleset で **署名必須**です。PR ブランチ上の未署名コミットは（squash でも）マージできません。
回避に `gh pr merge --admin` は使わないでください。

squash 後の `main` 上のコミットは GitHub が署名しますが、ruleset が見るのは **PR ブランチ**です。

## エージェント

1. `--no-gpg-sign` / `commit.gpgsign=false` は使わない。
2. `gh pr merge --admin` は使わない。
3. PR のコミットは `scripts/github-commit-on-branch.mjs`（GraphQL `createCommitOnBranch` →
   GitHub verified）で作る。先にブランチ先端を `main` から push する:

   ```bash
   git fetch origin main
   git push -u origin HEAD:refs/heads/<branch>
   node scripts/github-commit-on-branch.mjs <branch> "<commit headline>"
   git fetch origin <branch> && git reset --hard origin/<branch>
   ```

   GitHub が署名するトークンが必要: Actions の **`GITHUB_TOKEN`**（GitHub App）、または
   Contents: write の **fine-grained PAT**。CLI の OAuth（`gho_` / `gh auth token`）では
   `CreateCommitOnBranch` が FORBIDDEN になり、Contents REST も未署名のまま。

4. 失敗したら止める。回避しない。`commit.gpgsign=false` も `gh pr merge --admin` も使わない。

## メンテナ（ローカル SSH / 1Password）

GitHub API を使わない場合の任意手順:

1. `gpg.format=ssh`、`commit.gpgsign=true`、`user.signingkey` に SSH 公開鍵。
2. `gpg.ssh.program` は 1Password の **実体** `op-ssh-sign`。`WindowsApps` の Store エイリアスは
   WSL から失敗する。
3. 1Password SSH agent が動いていること（`SSH_AUTH_SOCK`）。
4. その公開鍵を GitHub の **SSH signing key** に登録する（Settings → SSH and GPG keys →
   Signing keys）。認証用キーだけでは足りない。
5. `git log -1 --show-signature` と GitHub の Verified バッジで確認。

## Bump release PR

`.github/workflows/bump-release-pr.yml` は未署名の `git commit` を使わない。
`chore/release-vX.Y.Z` を `main` 先端に push したあと `scripts/github-commit-on-branch.mjs` で
verified な bump コミットを足す。

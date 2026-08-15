# Commit signing

[日本語](../ja/commit-signing.md)

`main` is protected by a ruleset with **required signatures**. Unsigned commits on a pull-request
branch cannot merge (including squash). Do not use `gh pr merge --admin` to skip that.

Squash-merge onto `main` is signed by GitHub; the ruleset still checks **the PR branch**.

## Policy

1. Every commit on a PR targeting `main` MUST show **Verified** on GitHub.
2. Never disable git signing (`--no-gpg-sign`, `commit.gpgsign=false`).
3. Never `gh pr merge --admin`. Merge only after protection is satisfied.
4. If a commit is not Verified, stop. Do not work around it.

Register signing keys on the GitHub account (**SSH signing keys** or GPG), distinct from
authentication keys. Confirm the Verified badge on the commit.

## Agents

Prefer `scripts/github-commit-on-branch.mjs` (GraphQL `createCommitOnBranch`) so GitHub signs the
commit. After the branch exists on the remote:

```bash
git fetch origin main
git push -u origin HEAD:refs/heads/<branch>
node scripts/github-commit-on-branch.mjs <branch> "<commit headline>"
git fetch origin <branch> && git reset --hard origin/<branch>
```

Use a token that can create GitHub-signed commits (Actions `GITHUB_TOKEN`). If the mutation is
forbidden or the commit is unsigned, stop.

## Bump release PR

`.github/workflows/bump-release-pr.yml` must not use unsigned `git commit`. It points
`chore/release-vX.Y.Z` at `main`, then `scripts/github-commit-on-branch.mjs` so the bump commit is
verified.

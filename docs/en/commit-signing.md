# Commit signing

[日本語](../ja/commit-signing.md)

`main` is protected by a ruleset with **required signatures**. Unsigned commits on a pull-request
branch cannot merge (including squash). Do not use `gh pr merge --admin` to skip that.

Squash-merge onto `main` is signed by GitHub; the ruleset still checks **the PR branch**.

## Agents

1. Never `--no-gpg-sign` / `commit.gpgsign=false`.
2. Never `gh pr merge --admin`.
3. Create the PR commit with `scripts/github-commit-on-branch.mjs` (GraphQL
   `createCommitOnBranch` → GitHub-verified), after pushing the branch tip from `main`:

   ```bash
   git fetch origin main
   git push -u origin HEAD:refs/heads/<branch>
   node scripts/github-commit-on-branch.mjs <branch> "<commit headline>"
   git fetch origin <branch> && git reset --hard origin/<branch>
   ```

   This needs a token GitHub will sign with: **`GITHUB_TOKEN` in Actions** (GitHub App), or a
   **fine-grained PAT** with Contents: write. The GitHub CLI OAuth token (`gho_`, `gh auth token`)
   is **not** enough (`CreateCommitOnBranch` → FORBIDDEN; Contents REST stays unsigned).

4. If that fails, stop. Do not bypass. Do not `commit.gpgsign=false`. Do not `gh pr merge --admin`.

## Maintainers (local SSH / 1Password)

Optional when the GitHub API path is unused:

1. `gpg.format=ssh`, `commit.gpgsign=true`, `user.signingkey` = the SSH public key.
2. Point `gpg.ssh.program` at the **real** 1Password `op-ssh-sign` binary, not the Microsoft Store
   App Execution Alias under `WindowsApps` (those stubs fail from WSL).
3. 1Password SSH agent must be running (`SSH_AUTH_SOCK` set).
4. Add that public key on GitHub as an **SSH signing key** (Settings → SSH and GPG keys →
   Signing keys), not only as an authentication key.
5. Confirm: `git log -1 --show-signature` and the GitHub commit “Verified” badge.

## Bump release PR

`.github/workflows/bump-release-pr.yml` must not use unsigned `git commit`. It pushes
`chore/release-vX.Y.Z` at `main`, then `scripts/github-commit-on-branch.mjs` so the bump commit is
verified.

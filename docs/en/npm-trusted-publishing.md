# npm Trusted Publishing

[日本語](../ja/npm-trusted-publishing.md)

Orbit ID packages are published with [npm Trusted Publishing](https://docs.npmjs.com/trusted-publishers/)
(OIDC from GitHub Actions). No long-lived `NPM_TOKEN` is required in GitHub Secrets.

## Packages

| Package | npm |
| --- | --- |
| `@orbit-id/core` | https://www.npmjs.com/package/@orbit-id/core |
| `@orbit-id/typescript` | https://www.npmjs.com/package/@orbit-id/typescript |
| `@orbit-id/cli` | https://www.npmjs.com/package/@orbit-id/cli |

## One-time setup on npmjs.com

For **each** package above (after the package exists on npm):

1. Open the package page → **Settings** → **Trusted Publisher**
2. Choose **GitHub Actions**
3. Fill in:
   - Organization or user: `orbit-id`
   - Repository: `orbit-id`
   - Workflow filename: `publish.yml` (filename only, not a path)
   - Environment: leave empty unless you add a GitHub Environment
4. Allow **npm publish**

Do this for `@orbit-id/core`, `@orbit-id/typescript`, and `@orbit-id/cli`.

## Workflow

[`.github/workflows/publish.yml`](../../.github/workflows/publish.yml) runs on:

- tag push matching `v*` (for example `v1.0.1`)
- manual **workflow_dispatch**

It publishes npm, crates.io, Maven Central, and the Packagist mirror in parallel jobs
(composite actions under `.github/actions/publish-*`). npm jobs use
`permissions: id-token: write`, Node 24, and a recent npm CLI.

## Release checklist

1. Bump package versions in `packages/*/package.json` as needed
2. Merge to `main`
3. Tag and push, for example `git tag v1.0.1 && git push origin v1.0.1`
4. Confirm the Publish workflow succeeded
5. `npm view @orbit-id/core version` (and typescript / cli)

For monorepo tags across Maven / Go / crates / Packagist, see
[Cross-registry versioning](cross-registry-versioning.md).

## First publish notes

- `@orbit-id/core` and `@orbit-id/typescript` were first published manually at `1.0.0`
- `@orbit-id/cli` was first published manually (`1.0.0` / `1.0.1`) so Trusted Publisher could be
  attached; subsequent releases use this workflow
- Provenance requires a **public** GitHub repository
- Configure Trusted Publisher on **each** package before relying on CI-only publishes

## Repository location

Canonical GitHub repository: [`orbit-id/orbit-id`](https://github.com/orbit-id/orbit-id).
Update npm Trusted Publisher to GitHub org/user `orbit-id` and repository `orbit-id`.

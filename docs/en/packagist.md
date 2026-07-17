# Packagist publishing

[日本語](../ja/packagist.md)

Publish `packages/php` (`orbit-id/php`) to [Packagist](https://packagist.org/).

Public Packagist does **not** serve Composer packages from a monorepo subdirectory
(GitHub zip archives are whole-repo). Orbit mirrors `packages/php` into a dedicated
repository [`orbit-id/php`](https://github.com/orbit-id/php) on each `v*` tag.

Tracker: [#57](https://github.com/orbit-id/orbit-id/issues/57). Policy:
[Cross-registry versioning](cross-registry-versioning.md).

## Architecture

```text
orbit-id/orbit-id  (monorepo source of truth)
        │  subtree split on v* / workflow_dispatch
        ▼
orbit-id/php       (read-only-ish mirror)
        │  Packagist GitHub hook / API update
        ▼
packagist.org/packages/orbit-id/php
```

Do **not** open feature PRs against `orbit-id/php` — change `packages/php` in the monorepo.

## One-time setup

1. Mirror repo exists: [`orbit-id/php`](https://github.com/orbit-id/php) (created empty for force-sync).
2. Create a GitHub PAT (or fine-grained token) with **Contents: Read and write** on `orbit-id/php`.
   Do **not** put `GITHUB_TOKEN` here — that can only write to the current repo.
3. Add Actions secret `PHP_SPLIT_TOKEN` on `orbit-id/orbit-id`.
4. Run the **Publish** workflow `packagist` job (`workflow_dispatch`) once to populate `main`.
   The workflow sets `persist-credentials: false` on checkout so the split push uses
   `PHP_SPLIT_TOKEN` (not the job’s `GITHUB_TOKEN` credential helper).
5. On [packagist.org](https://packagist.org/packages/submit):
   - Submit `https://github.com/orbit-id/php`
   - Claim vendor namespace `orbit-id` if prompted
6. Optional: add `PACKAGIST_USERNAME` + `PACKAGIST_TOKEN` so the workflow can
   [update the package](https://packagist.org/apidoc) after each tag (GitHub hook alone is usually enough).

## Workflow

The `packagist` job in [`.github/workflows/publish.yml`](../../.github/workflows/publish.yml)
(via [`.github/actions/publish-packagist`](../../.github/actions/publish-packagist/action.yml)):

- On `v*` tags: subtree-split `packages/php` → force-push `main` + the same tag on `orbit-id/php`
- On `workflow_dispatch`: force-push `main` only (no tag unless the run is a tag event)

## Maintainer checklist

1. Change PHP code only under `packages/php` in the monorepo.
2. Merge to `main`; confirm CI `test-php`.
3. Ensure `PHP_SPLIT_TOKEN` is set.
4. Tag and push `vX.Y.Z` (Packagist versions come from these tags on the mirror).
5. Confirm [`orbit-id/php` tags](https://github.com/orbit-id/php/tags) and
   [Packagist](https://packagist.org/packages/orbit-id/php).
6. Spot-check: `composer require orbit-id/php:^1.0`

## Consumer

```bash
composer require orbit-id/php
```

Until Packagist lists the package, consumers can use the mirror as a VCS repository:

```json
{
  "repositories": [
    { "type": "vcs", "url": "https://github.com/orbit-id/php" }
  ],
  "require": {
    "orbit-id/php": "^1.0"
  }
}
```

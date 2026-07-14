# crates.io publishing

[日本語](../ja/crates-io.md)

Publish `packages/rust` (`orbit-id`) to [crates.io](https://crates.io/).

Tracker: [#56](https://github.com/orbit-id/orbit-id/issues/56). Policy:
[Cross-registry versioning](cross-registry-versioning.md).

## One-time setup

1. Create a [crates.io](https://crates.io/) account linked to GitHub.
2. **First publish** (crate must exist before Trusted Publishing can be attached):
   - Create an API token with publish scope, or
   - Set GitHub Actions secret `CARGO_REGISTRY_TOKEN` and run **Publish crates.io**, or
   - Locally: `cd packages/rust && cargo login && cargo publish`
3. On the crate page → **Settings → Trusted Publishing**, add:
   - Repository: `orbit-id/orbit-id`
   - Workflow filename: `publish-crates.yml`
   - Environment: leave empty unless you add one
4. After Trusted Publishing works, you MAY delete the long-lived `CARGO_REGISTRY_TOKEN` secret.

## Workflow

[`.github/workflows/publish-crates.yml`](../../.github/workflows/publish-crates.yml) runs on:

- tag push matching `v*`
- manual **workflow_dispatch**

It:

- skips if `orbit-id@<Cargo.toml version>` already exists on crates.io
- prefers OIDC via [`rust-lang/crates-io-auth-action`](https://github.com/rust-lang/crates-io-auth-action)
- falls back to `CARGO_REGISTRY_TOKEN` when OIDC is not configured yet

## Maintainer checklist

1. Bump `version` in `packages/rust/Cargo.toml` (align with `vX.Y.Z` for coordinated cuts).
2. Merge to `main`; confirm `cargo test` (CI `test-rust`).
3. Tag and push `vX.Y.Z`.
4. Confirm **Publish crates.io** succeeded.
5. Spot-check: https://crates.io/crates/orbit-id

Dry-run (no upload):

```bash
cd packages/rust
cargo publish --dry-run
```

## Consumer

```toml
[dependencies]
orbit-id = "1"
```

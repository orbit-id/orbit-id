# Packages

| Package | Role | Status |
| --- | --- | --- |
| [`@orbit-id/core`](core/) | Reference encode / decode / generator and conformance tests | npm shipped |
| [`@orbit-id/typescript`](typescript/) | TypeScript language package (re-exports core) | npm shipped |
| [`@orbit-id/cli`](cli/) | Minimal CLI (`parse` / `generate`) | npm shipped |
| [`@orbit-id/node-lease`](node-lease/) | Optional Node lease control plane (memory / Redis) | monorepo |
| [`playground`](playground/) | Browser encode / decode UI | local Vite app + GitHub Pages |
| [`java`](java/) | Java reference library | monorepo |
| [`go`](go/) | Go reference library | monorepo |
| [`rust`](rust/) | Rust reference crate | monorepo |
| [`php`](php/) | PHP reference library | monorepo |

Types ship **inside** each TypeScript package (`dist/*.d.ts`). There is no separate `@types/orbit-id`
DefinitelyTyped package.

Language packages SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md).

Publishing: [npm Trusted Publishing](../docs/en/npm-trusted-publishing.md) (TypeScript); other
registries in [#42](https://github.com/orbit-id/orbit-id/issues/42).

See the [Phase 3 roadmap](../docs/en/roadmap.md#phase-3--expand).

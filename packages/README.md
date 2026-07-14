# Packages

| Package | Role | Status |
| --- | --- | --- |
| [`@orbit-id/core`](core/) | Reference encode / decode / generator and conformance tests | npm shipped |
| [`@orbit-id/typescript`](typescript/) | TypeScript language package (re-exports core) | npm shipped |
| [`@orbit-id/cli`](cli/) | Minimal CLI (`parse` / `generate`) | npm shipped |
| [`@orbit-id/node-lease`](node-lease/) | Optional Node lease control plane (memory / Redis) | monorepo |
| [`playground`](playground/) | Browser encode / decode UI | local Vite app |
| [`java`](java/) | Java reference library | monorepo |
| [`go`](go/) | Go reference library | monorepo |
| [`rust`](rust/) | Rust reference crate | monorepo |
| [`php`](php/) | PHP reference library | monorepo |

Types for TypeScript packages ship **inside** each package (`dist/*.d.ts`). There is no separate
`@types/orbit-id` DefinitelyTyped package.

Each language package SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md) and pass [`spec/conformance/`](../spec/conformance/).

Publishing: [npm Trusted Publishing](../docs/en/npm-trusted-publishing.md); other registries in
[#42](https://github.com/ponstream24/orbit-id/issues/42).

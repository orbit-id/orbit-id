# Packages

| Package | Role | Status |
| --- | --- | --- |
| [`@orbit-id/core`](core/) | Reference encode / decode / generator and conformance tests | npm shipped |
| [`@orbit-id/typescript`](typescript/) | TypeScript language package (re-exports core) | npm shipped |
| [`@orbit-id/cli`](cli/) | Minimal CLI (`parse` / `generate`) | npm shipped |
| [`playground`](playground/) | Browser encode / decode UI | local Vite app + GitHub Pages |

Types ship **inside** each package (`dist/*.d.ts`). There is no separate `@types/orbit-id`
DefinitelyTyped package.

## Phase 3 (planned)

```text
packages/
├── java
├── go
├── rust
└── php
```

See the [Phase 3 roadmap](../docs/en/roadmap.md#phase-3--expand) and issues #18–#21 / #42.

Each language package SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md).

Publishing: [npm Trusted Publishing](../docs/en/npm-trusted-publishing.md) (TypeScript); other
registries in [#42](https://github.com/orbit-id/orbit-id/issues/42).

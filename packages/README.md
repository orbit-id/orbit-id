# Packages

| Package | Role |
| --- | --- |
| [`@orbit-id/core`](core/) | Reference encode / decode / generator and conformance tests |
| [`@orbit-id/typescript`](typescript/) | TypeScript language package (re-exports core) |
| [`@orbit-id/cli`](cli/) | Minimal CLI (`parse` / `generate`) |

## Planned (later)

```text
packages/
├── core
├── typescript
├── cli
├── java
├── go
├── rust
├── php
└── playground
```

Each language package SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md).

Publishing uses [npm Trusted Publishing](../docs/en/npm-trusted-publishing.md).

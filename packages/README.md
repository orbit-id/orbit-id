# Packages

| Package | Role |
| --- | --- |
| [`@orbit-id/core`](core/) | Reference encode / decode / generator and conformance tests |
| [`@orbit-id/typescript`](typescript/) | TypeScript language package (re-exports core) |

## Planned (later)

```text
packages/
├── core
├── typescript
├── java
├── go
├── rust
├── php
├── cli
└── playground
```

Each language package SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md).

`packages/core` is required before promoting the specification to stable `v1.0.0`. See
[Stable v1 promotion criteria](../docs/en/stable-release-criteria.md).

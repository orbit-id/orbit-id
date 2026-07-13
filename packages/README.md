# Packages

Language implementations and tools will live here once the Orbit ID v1 specification is stable
enough to implement.

## Planned layout

```text
packages/
├── core          # shared reference logic / fixtures (optional)
├── typescript
├── java
├── go
├── rust
├── php
├── cli
└── playground
```

Each package SHOULD expose the common operations described in
[Library API](../docs/en/library-api.md).

Until then, this directory is intentionally empty of implementations.

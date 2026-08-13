# @orbit-id/cli

Minimal CLI for Orbit ID. Default wire format is **v2**; pass `--spec v1` for the
legacy 64-bit layout. `--v2` remains an alias for `--spec v2`.

Consumer migration: [1.x → 2.0.0](../../docs/en/migration-1x-to-2.0.0.md). Registry `2.0.0` cut is slice J of the [promotion plan](../../docs/en/v2-package-2.0.0.md).

```bash
npm install -g @orbit-id/cli

# v2 (default)
orbit-id parse 21267647932558653967613957625668960256
orbit-id generate --type 1 --node 7
orbit-id generate --type 1 --node 7 --region 3 --tenant 1000
ORBIT_NODE_ID=7 orbit-id generate --type 2

# v1
orbit-id parse --spec v1 140612821619842090
orbit-id generate --spec v1 --type 1 --node 7
```

I/O uses unsigned decimal strings (canonical). v2 `parse` also includes a `hex` field in JSON output.

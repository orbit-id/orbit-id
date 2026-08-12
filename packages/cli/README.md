# @orbit-id/cli

Minimal CLI for Orbit ID. Default wire format is **v1**; pass `--spec v2` (or `--v2`) for the Draft 128-bit layout.

```bash
npm install -g @orbit-id/cli

# v1 (default)
orbit-id parse 140612821619842090
orbit-id generate --type 1 --node 7
ORBIT_NODE_ID=7 orbit-id generate --type 2

# v2 Draft
orbit-id parse --spec v2 21267647932558653967613957625668960256
orbit-id generate --spec v2 --type 1 --node 7
```

I/O uses unsigned decimal strings (canonical). v2 `parse` also includes a `hex` field in JSON output.

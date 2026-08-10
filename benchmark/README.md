# Benchmarks

[Phase-3 #18](https://github.com/orbit-id/orbit-id/issues/18)

Measure **single-Node** generator throughput using `@orbit-id/core`.

Spec and top-level README numbers such as **1,024 IDs/ms per node** (v1) or **65,536 IDs/ms**
(v2 sequence width) are **formal capacity** (bit-field limits). They are not claims about this
harness or any particular machine.

## Run

From the repo root (after `npm ci` and `npm run build`):

```bash
npm run bench
```

CI / smoke (short):

```bash
npm run bench:ci
```

Options:

```bash
node benchmark/run.mjs --duration-ms 3000 --warmup-ms 500 --node 1 --type 1
node benchmark/run.mjs --id-version 2 --duration-ms 3000 --warmup-ms 500 --node 1 --type 1
```

| Flag | Default | Meaning |
| --- | --- | --- |
| `--id-version` | `1` | `1` = Orbit ID v1 (`OrbitGenerator`); `2` = v2 (`OrbitGeneratorV2`) |

Output is JSON with `idVersion`, `measuredIdsPerMs` / `measuredIdsPerSec`, plus the formal capacity reminder.
Other language benches land with those packages’ v2 implementations (#141–#144).

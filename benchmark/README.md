# Benchmarks

[Phase-3 #18](https://github.com/orbit-id/orbit-id/issues/18)

Measure **single-Node** generator throughput using `@orbit-id/core`.

Spec and top-level README numbers such as **1,024 IDs/ms per node** are **formal capacity**
(bit-field limits). They are not claims about this harness or any particular machine.

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
```

Output is JSON with `measuredIdsPerMs` / `measuredIdsPerSec` plus the formal capacity reminder.

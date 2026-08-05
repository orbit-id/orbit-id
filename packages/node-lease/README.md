# @orbit-id/node-lease

Optional Node ID lease control plane (in-memory or Redis).

Keep lease traffic **off** the ID generation hot path. Use `confirmOwnership` on `OrbitGenerator` only as a fail-closed gate.

Default `maxNode` is **127** (Orbit ID v1). For v2 (`0..65535`), pass `maxNode` explicitly.
Redis uses an O(1) free-pool acquire when `maxNode > 127` (sets a durable `mode=free-pool` key on
the prefix). Do not mix linear-scan (`maxNode ≤ 127`) and free-pool acquires on the same prefix.

```ts
import { OrbitGenerator, v2 } from "@orbit-id/core";
import { MemoryLeaseStore, NodeLeaseClient } from "@orbit-id/node-lease";

// v1 (default)
const lease = new NodeLeaseClient({ store: new MemoryLeaseStore() });
const held = await lease.acquire();
const gen = new OrbitGenerator({
  node: held.nodeId,
  confirmOwnership: () => lease.confirmOwnership(),
});

// v2
const leaseV2 = new NodeLeaseClient({
  store: new MemoryLeaseStore(v2.MAX_NODE),
  maxNode: v2.MAX_NODE,
});
```

See [Node Management](../../docs/en/node-management.md) and issue #19 / #149.

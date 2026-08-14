# @orbit-id/node-lease

Optional Node ID lease control plane (in-memory or Redis).

Keep lease traffic **off** the ID generation hot path. Use `confirmOwnership` on generators only as
a fail-closed gate.

Default `maxNode` is **127** (Orbit ID v1 range). For v2 (`0..65535`), pass `maxNode` explicitly.
Redis uses an O(1) free-pool acquire when `maxNode > 127` (sets a durable `mode=free-pool` key on
the prefix). Do not mix linear-scan (`maxNode ≤ 127`) and free-pool acquires on the same prefix.

```ts
import { OrbitGeneratorV2, MAX_NODE as MAX_NODE_V2 } from "@orbit-id/core";
import * as v1 from "@orbit-id/core/v1";
import { MemoryLeaseStore, NodeLeaseClient } from "@orbit-id/node-lease";

// v2 (package-root default)
const leaseV2 = new NodeLeaseClient({
  store: new MemoryLeaseStore(MAX_NODE_V2),
  maxNode: MAX_NODE_V2,
});
const heldV2 = await leaseV2.acquire();
const genV2 = new OrbitGeneratorV2({
  node: heldV2.nodeId,
  confirmOwnership: () => leaseV2.confirmOwnership(),
});

// v1
const leaseV1 = new NodeLeaseClient({ store: new MemoryLeaseStore() });
const heldV1 = await leaseV1.acquire();
const genV1 = new v1.OrbitGenerator({
  node: heldV1.nodeId,
  confirmOwnership: () => leaseV1.confirmOwnership(),
});
```

See [Node Management](../../docs/en/node-management.md) and issue #19 / #149.

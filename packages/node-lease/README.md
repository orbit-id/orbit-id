# @orbit-id/node-lease

Optional Node ID lease control plane (in-memory or Redis).

Keep lease traffic **off** the ID generation hot path. Use `confirmOwnership` on `OrbitGenerator` only as a fail-closed gate.

```ts
import { OrbitGenerator } from "@orbit-id/core";
import { MemoryLeaseStore, NodeLeaseClient } from "@orbit-id/node-lease";

const lease = new NodeLeaseClient({ store: new MemoryLeaseStore() });
const held = await lease.acquire();
const gen = new OrbitGenerator({
  node: held.nodeId,
  confirmOwnership: () => lease.confirmOwnership(),
});
```

See [Node Management](../../docs/en/node-management.md) and issue #19.

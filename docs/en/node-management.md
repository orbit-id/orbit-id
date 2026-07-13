# Node Management

[日本語](../ja/node-management.md)

Orbit ID uniqueness depends on Node IDs (`0..127`) not overlapping across processes that issue IDs
concurrently. Node ID allocation is a control-plane responsibility; per-ID generation remains local.

## Recommended order

Prefer the following approaches, in order, based on the environment.

1. Fixed ordinal / instance identity guaranteed by the orchestrator
2. Static Node ID assignment in deploy configuration
3. Lease allocation via a strongly consistent store

A fixed value is fine for single-node development. Do not replicate the same production configuration
across instances.

## Static allocation

Inject the Node ID via an environment variable or config file.

```text
ORBIT_NODE_ID=7
```

Validate the range at startup and keep the allocation ledger aligned with deploy configuration.
Static allocation is simple, but it does not suit environments where replica counts change
dynamically under autoscaling.

## Lease-based allocation

When using Redis or similar, use the store only for Node ID allocation and liveness checks.
Do not access the store for every ID issuance.

A lease implementation MUST at least:

- Acquire a free Node ID in a single atomic operation.
- Store an owner token and expiry.
- Renew or release a lease only when the owner token matches.
- Stop issuing new IDs (fail closed) as soon as lease renewal fails with insufficient safety margin.
- On reconnect, reconfirm lease ownership instead of implicitly reusing a previous assignment.
- Release the lease on graceful shutdown, without relying on release alone for safety.

Designs that keep issuing through network partitions risk reassigning an expired Node ID to another
process and producing duplicates. Prefer uniqueness over availability: stop generators that cannot
confirm ownership.

## Restart and reuse

A new process reusing the same Node ID MUST ensure it is not running concurrently with the old
process, and MUST NOT reuse the old process's final Timestamp / Sequence pairs.

Recommended practices:

- Persist the last Timestamp to durable storage and compare on startup.
- After lease release, apply a quarantine period longer than the maximum allowed clock-rollback
  window.
- Assign a different Node ID when ownership cannot be confirmed.

## Operational signals

Expose at least the following via metrics / logs:

- active Node ID and instance identity
- lease acquire / renew / loss
- issuance count and Sequence exhaustion count
- clock-rollback detections and magnitude
- last issued Timestamp
- generation error kinds

If a Node ID collision is detected, stop all generators for that Node and audit IDs issued during
the affected window.

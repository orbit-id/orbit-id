# Design Decisions

[日本語](../ja/design-decisions.md)

This document records the main trade-offs behind Orbit ID v1. For normative definitions, see the
[Orbit ID v1 Specification](orbit-id-v1.md).

## 1. 64-bit unsigned integer

64 bits index efficiently in many datastores and reuse operational knowledge from Snowflake-like
systems. Because every bit is used, values will eventually exceed the positive range of signed
64-bit integers.

## 2. Orbit Epoch

The epoch is fixed at `2026-01-01T00:00:00.000Z`, giving about 69.7 years with a 41-bit timestamp.
A custom epoch later than the Unix epoch saves bits.

## 3. Type is an entity kind

Type is a logical entity kind, not a table number. This avoids breaking ID meaning when databases
are split, merged, or roles change. 6 bits (64 kinds) are considered enough with careful registry
governance.

## 4. 7-bit Node and 10-bit Sequence

We chose up to 128 nodes and 1,024 IDs/ms per node across all types. The design favors a small set of
generator nodes with enough throughput over a giant central ID service.

## 5. Sequence is global per node and millisecond

Per-type sequences would also be unique in form, but sharing one Sequence across all Types on a node
keeps state and the specification simpler. Therefore 1,024 IDs/ms is a per-node limit, not per Type.

## 6. Redis is not on the generation path

If Redis is used, it is limited to the Node-lease control plane. Avoid per-ID `INCR` or distributed
locks so network latency and Redis outages stay off the normal generation path.

## 7. No embedded version in v1

Adding a version bit would require shrinking Node, Type, Sequence, or lifetime. v1 prioritizes
capacity and identifies future formats externally via API / storage metadata. This choice
complicates a v2 migration, so it will be re-evaluated before stable v1.

## 8. Millisecond ordering, not total ordering

With Timestamp in the most significant bits, IDs from different milliseconds sort by time. Within
the same millisecond, Type and Node sit above Sequence, so strict issuance order across a
distributed system is not guaranteed.

## 9. IDs are transparent identifiers

Debuggability and routing / inspection take priority: timestamp, type, and node are recoverable.
As a trade-off, IDs do not hide issuance time or internal structure. Do not treat them as secrets or
authorization tokens.

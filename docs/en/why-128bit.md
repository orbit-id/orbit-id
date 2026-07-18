# Why Orbit ID v2 is 128-bit

[日本語](../ja/why-128bit.md)

## Overview

Orbit ID v2 extends the ID format from 64-bit to 128-bit.

The goal is **not** “a larger ID for its own sake.” It is to keep **long-term operation,
extensibility, and distributed generation** without starving any field.

## 1. Relieve Type capacity pressure

In 64-bit, Timestamp, Node, Sequence, and Type must all fit in one word. Type therefore gets
few bits, and the number of manageable entity kinds can become tight over time.

128-bit leaves enough room for many kinds across a product surface — for example Users,
Sessions, Files, Payments, Organizations, API Keys, and Events.

## 2. Leave room for future extension

64-bit layouts tend to use every bit. 128-bit can reserve space for Format Version, Reserved,
Region, Datacenter, Tenant, and similar fields. That makes later evolution easier while
preserving compatibility for issued IDs.

## 3. Stronger fit for distributed issuance

Orbit ID assumes distributed generation. Timestamp, Node, and Sequence are all required. In
64-bit they compete for the same budget. In 128-bit you can provide more nodes, higher
per-tick throughput, and a longer timestamp window **at the same time**.

## 4. Longer calendar lifetime

With enough timestamp bits, an Orbit epoch can support decades to centuries of operation
without redesigning the wire format.

## 5. Same size class as UUID

128-bit is a mainstream identifier width today (UUID, UUIDv7, ULID). Databases, libraries,
and APIs already expect that size class.

## 6. Matches Orbit’s goals

Orbit ID is not aiming for Snowflake bit-for-bit compatibility. It aims for globally unique,
distributable IDs that carry enough embedded context to inspect without a lookup, and that
can evolve. 128-bit makes that combination practical.

## Trade-offs

128-bit is not free:

- Larger indexes and memory footprint
- Longer string encodings
- Need for wide integers or byte arrays in some languages

In practice, systems already store UUIDs widely, so these costs are usually acceptable.

## Conclusion

Orbit ID v2 adopts 128-bit because 64-bit cannot simultaneously satisfy Type capacity,
extensibility, distributed throughput, and long-horizon compatibility. 128-bit is the
foundation for a format intended to last.

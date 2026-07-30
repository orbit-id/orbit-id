# Orbit ID Specification v2

[日本語](../ja/orbit-id-v2.md)

Status: Draft (`v2.0.0-alpha.0`)  
Epoch: `2026-01-01T00:00:00.000Z`

Alpha-blocking decisions: [Design Decisions (v2)](design-decisions-v2.md).  
Motivation: [Why Orbit ID v2 is 128-bit](why-128bit.md).

## 1. Purpose

Orbit ID v2 defines a **128-bit** binary format and generation rules that let multiple nodes produce
unique IDs without continuously sharing issuance state, with headroom for Format Version and future
fields (via Reserved).

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" indicate requirement strength
needed for interoperability.

## 2. Data model

An Orbit ID v2 is an unsigned **128-bit** integer. Bit 0 is the least significant bit; bit 127 is the
most significant bit.

```text
127          124 123                    76 75         60 59         44 43         28 27          0
┌──────────────┬──────────────────────────┬─────────────┬─────────────┬─────────────┬────────────┐
│ FormatVersion│ Timestamp                │ Type        │ Node        │ Sequence    │ Reserved   │
│ 4 bits       │ 48 bits                  │ 16 bits     │ 16 bits     │ 16 bits     │ 28 bits    │
└──────────────┴──────────────────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

| Field | Bit positions | Width | Valid values |
| --- | --- | ---: | ---: |
| FormatVersion | 127..124 | 4 | `0..15` (issued v2 IDs use `1`) |
| Timestamp | 123..76 | 48 | `0..281,474,976,710,655` |
| Type | 75..60 | 16 | `0..65,535` |
| Node | 59..44 | 16 | `0..65,535` |
| Sequence | 43..28 | 16 | `0..65,535` |
| Reserved | 27..0 | 28 | encode MUST use `0` in this Draft |

## 3. Fields

### 3.1 FormatVersion

In-band format identifier. Issued Orbit ID v2 values MUST use `FormatVersion = 1`. Value `0` is
reserved. Decoders MUST fail closed on unknown versions.

### 3.2 Timestamp

Timestamp is the number of milliseconds since Orbit Epoch at issuance time.

```text
timestamp = floor(current_unix_time_ms) - 1767225600000
```

`1767225600000` is Orbit Epoch as Unix time in milliseconds. Timestamp `0` means
`2026-01-01T00:00:00.000Z`. The 48-bit maximum covers approximately **8919.4 years** from the Epoch
(far beyond calendar libraries that reject years beyond ~9999; treat overflow dates as capacity
bounds, not portable wall-clock displays).

### 3.3 Type

Type is the logical entity kind (`0..65535`). Value `0` is reserved; implementations MUST reject
`generate(0)`. Values `1..65535` are available for application assignment.

Type MUST NOT represent attributes that can change later (table name, permissions, roles, state).
Within a deployment, once a value has been used in durable data, its meaning MUST NOT be changed or
reused.

### 3.4 Node

Node is an ID assigned exclusively to an issuing process. Two processes that may issue IDs
concurrently MUST NOT use the same Node value. See [Node Management](node-management.md).

### 3.5 Sequence

Sequence is a zero-based counter for the same Node and Timestamp. Sequence state MUST be shared
across all Types within a node; it MUST NOT be partitioned per Type.

When Timestamp advances, Sequence resets to 0. Within the same millisecond, Sequence increments by 1
for each issued ID. If a value beyond 65,535 is required, the implementation MUST wait for the next
millisecond or return a capacity-exceeded error. Sequence MUST NOT wrap.

### 3.6 Reserved

Alpha MUST encode Reserved as `0`. Later alphas MAY carve Region / Datacenter / Tenant (or similar)
from these bits without changing the total 128-bit width. Strict decoders SHOULD reject non-zero
Reserved until such a carve-out is specified.

## 4. Encoding

After validating each value is in range:

```text
id = (format_version << 124)
   | (timestamp      <<  76)
   | (type           <<  60)
   | (node           <<  44)
   | (sequence       <<  28)
   | reserved
```

Treat the bit pattern as unsigned. Right shifts MUST be logical.

## 5. Decoding

```text
format_version = (id >> 124) & 0xf
timestamp      = (id >>  76) & 0xffffffffffff
type           = (id >>  60) & 0xffff
node           = (id >>  44) & 0xffff
sequence       = (id >>  28) & 0xffff
reserved       =  id         & 0xfffffff

unix_time_ms = timestamp + 1767225600000
```

Decoders that accept decimal strings MUST reject a leading `+`, negative values, fractions,
whitespace, digit separators, and values greater than `2^128 - 1`
(`340282366920938463463374607431768211455`). Canonical output MUST NOT include leading zeros.
Unknown `FormatVersion` MUST fail decode.

## 6. Generation algorithm

Each generator retains at least `node_id`, `last_timestamp`, and `sequence`.
`generate(type)` MUST be serialized within the same generator.

1. Confirm Type is in `1..65535` (not reserved `0`) and Node is in range.
2. Obtain the current Timestamp in milliseconds.
3. Fail if the value is before the Epoch or beyond the 48-bit maximum.
4. If the current value is less than `last_timestamp`, follow section 7.
5. If equal to `last_timestamp`, increment Sequence.
6. If Sequence exceeds 65,535, wait for the next millisecond or fail.
7. If greater than `last_timestamp`, reset Sequence to 0.
8. Encode with `FormatVersion = 1` and `Reserved = 0`, persist state, and return.

When the same Node ID is reused immediately after process restart, the clock MUST be guaranteed to
have advanced past the previous process's last issuance time, or compare against a persisted last
Timestamp / reassign the Node / wait safely.

## 7. Clock rollback

Same policy as v1:

- Wait up to a configured tolerance until wall time catches up.
- Use a monotonic clock as a supplement.
- Persist the last Timestamp and compare on restart.
- Fail closed with `CLOCK_ROLLBACK`.

**Default tolerance:** `5_000` milliseconds.

- If `last_timestamp - now` is in `(0, tolerance]`, wait until safe, then continue.
- If greater than `tolerance`, fail closed by default.
- Waiting MUST NOT reuse a previously issued `(Timestamp, Sequence)` pair for the same Node.

## 8. Uniqueness and ordering

Generated IDs are unique when Node exclusivity, Sequence non-reuse, and rollback safety hold.

Unsigned integer comparison orders IDs primarily by FormatVersion, then Timestamp (time-high layout).
Within the same millisecond, Type and Node sit above Sequence.

## 9. Capacity

| Dimension | Capacity |
| --- | ---: |
| Lifetime | 281,474,976,710,656 ms (≈ 8919.4 years) |
| Format versions | 16 (this Draft uses `1`) |
| Types | 65,536 (`0` reserved → 65,535 usable) |
| Nodes | 65,536 |
| Per node | 65,536 IDs/ms (all Types combined) |
| All nodes, theoretical | 4,294,967,296 IDs/ms |

These are formal upper bounds, not throughput guarantees.

## 10. Interchange and storage

- JSON / HTTP: MUST use an unsigned decimal string of the 128-bit value.
- JavaScript / TypeScript: SHOULD use a single `bigint`.
- Binary form: **16-byte big-endian** is canonical.
- Optional lowercase hex (32 digits, no `0x`) MAY be accepted; decimal remains canonical.
- Prefer storage types that hold full unsigned 128-bit values (e.g. `numeric`, `BINARY(16)`, two
  64-bit halves with defined order). Do not store v2 IDs in signed 64-bit columns.

## 11. Validation

Structural validation means the value is in the unsigned 128-bit range, `FormatVersion` is known,
and fields decode. There is no checksum or signature; `isValid` MUST mean **syntactically valid**,
not “issued”.

## 12. Security and privacy

Orbit IDs are not secrets. They reveal issuance time, Type, Node, FormatVersion, and same-ms
activity. Authorization, authenticity, and guess resistance MUST be separate.

## 13. Compatibility

- v1 (64-bit) and v2 (128-bit) MUST NOT be mixed by reinterpreting bit patterns.
- Separate them via column, API field, length, or envelope.
- Existing v1 IDs MUST NOT be reinterpreted as v2.
- Alpha may still change layout; see [Design Decisions (v2)](design-decisions-v2.md).

## 14. Related documents

- [Design Decisions (v2)](design-decisions-v2.md)
- [Node Management](node-management.md)
- [Library API](library-api.md) (v2 delta section)
- [Canonical Test Vectors](test-vectors.md) (v2 stub)
- [`spec/conformance/`](../../spec/conformance/) (v2 fixtures TBD)
- [Why Orbit ID v2 is 128-bit](why-128bit.md)
- [Orbit ID v1 Specification](orbit-id-v1.md)

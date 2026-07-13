# Orbit ID Specification v1.0.0-draft.1

[日本語](../ja/orbit-id-v1.md)

Status: Draft  
Epoch: `2026-01-01T00:00:00.000Z`

## 1. Purpose

Orbit ID v1 defines a 64-bit binary format and generation rules that let multiple nodes produce
unique IDs without continuously sharing issuance state.

The key words "MUST", "MUST NOT", "SHOULD", "SHOULD NOT", and "MAY" indicate requirement strength
needed for interoperability.

## 2. Data model

An Orbit ID v1 is an unsigned 64-bit integer. Bit 0 is the least significant bit; bit 63 is the most
significant bit.

```text
MSB                                                             LSB
63                                                               0
┌──────────────────────────┬──────────┬───────────┬──────────────┐
│ Timestamp                │ Type     │ Node      │ Sequence     │
│ 41 bits                  │ 6 bits   │ 7 bits    │ 10 bits      │
└──────────────────────────┴──────────┴───────────┴──────────────┘
63                        23 22      17 16       10 9             0
```

| Field | Bit positions | Width | Valid values |
| --- | --- | ---: | ---: |
| Timestamp | 63..23 | 41 | `0..2,199,023,255,551` |
| Type | 22..17 | 6 | `0..63` |
| Node | 16..10 | 7 | `0..127` |
| Sequence | 9..0 | 10 | `0..1,023` |

There is no sign bit or version field. All 64 bits are data.

## 3. Fields

### 3.1 Timestamp

Timestamp is the number of milliseconds since Orbit Epoch at issuance time.

```text
timestamp = floor(current_unix_time_ms) - 1767225600000
```

`1767225600000` is Orbit Epoch as Unix time in milliseconds. Timestamp `0` means
`2026-01-01T00:00:00.000Z`. The maximum value means `2095-09-07T15:47:35.551Z`.

### 3.2 Type

Type is the logical entity kind the ID belongs to. It MUST NOT represent attributes that can change
later, such as physical table name, permissions, or state. Assignments follow the
[Type Registry](type-registry.md).

### 3.3 Node

Node is an ID assigned exclusively to an issuing process. Two processes that may issue IDs
concurrently MUST NOT use the same Node value. See [Node Management](node-management.md) for
allocation guidance.

### 3.4 Sequence

Sequence is a zero-based counter for the same Node and Timestamp. Sequence state MUST be shared
across all Types within a node; it MUST NOT be partitioned per Type.

When Timestamp advances, Sequence resets to 0. Within the same millisecond, Sequence increments by 1
for each issued ID. If a value beyond 1,023 is required, the implementation MUST wait for the next
millisecond or return a capacity-exceeded error. Sequence MUST NOT wrap.

## 4. Encoding

After validating each value is in range, encode as follows.

```text
id = (timestamp << 23)
   | (type      << 17)
   | (node      << 10)
   | sequence
```

Even if the implementation language only has signed 64-bit integers, the bit pattern MUST be treated
as unsigned. Right shifts MUST be logical.

## 5. Decoding

```text
timestamp = (id >> 23) & 0x1ffffffffff
type      = (id >> 17) & 0x3f
node      = (id >> 10) & 0x7f
sequence  =  id        & 0x3ff

unix_time_ms = timestamp + 1767225600000
```

Decoders that accept decimal strings MUST reject a leading `+`, negative values, fractions,
whitespace, digit separators, and values greater than `18,446,744,073,709,551,615` (`2^64 - 1`).
Whether leading zeros are accepted MAY be defined per API, but canonical output MUST NOT include
them.

## 6. Generation algorithm

Each generator retains at least `node_id`, `last_timestamp`, and `sequence`.
`generate(type)` MUST be serialized within the same generator.

1. Confirm Type is issuable in the registry and Node is in range.
2. Obtain the current Timestamp in milliseconds.
3. Fail if the value is before the Epoch or beyond the 41-bit maximum.
4. If the current value is less than `last_timestamp`, follow section 7.
5. If equal to `last_timestamp`, increment Sequence.
6. If Sequence exceeds 1,023, wait for the next millisecond or fail.
7. If greater than `last_timestamp`, reset Sequence to 0.
8. Encode the ID, persist `last_timestamp` and Sequence, and return.

When the same Node ID is reused immediately after process restart, the clock MUST be guaranteed to
have advanced past the previous process's last issuance time. If that cannot be guaranteed, compare
against a persisted last Timestamp, reassign the Node, or wait safely.

## 7. Clock rollback

IDs MUST NOT be generated while the system clock is behind `last_timestamp`. Implementations adopt
one or more of the following:

- Wait up to a configured tolerance until wall time catches up to `last_timestamp`.
- Use a monotonic clock as a supplement to keep a safe Timestamp.
- Persist the last Timestamp and compare on restart.
- Fail closed with an explicit `CLOCK_ROLLBACK` error.

**Default tolerance:** `5_000` milliseconds (`5` seconds).

Behavior:

- If `last_timestamp - now` is in `(0, tolerance]`, the generator MUST wait until `now >=
  last_timestamp` (or an equivalent safe monotonic advancement) before issuing, then continue.
- If `last_timestamp - now` is greater than `tolerance`, the generator MUST fail closed with
  `CLOCK_ROLLBACK` by default. Operators MAY lower the tolerance; raising it increases stall risk
  and MUST be justified operationally.
- NTP synchronization alone MUST NOT be treated as a uniqueness guarantee.
- Waiting MUST NOT reuse a previously issued `(Timestamp, Sequence)` pair for the same Node.

## 8. Uniqueness and ordering

Generated IDs are unique as long as all of the following hold:

- Node IDs are assigned exclusively to concurrently running generators.
- Sequence is not reused for the same Node and Timestamp.
- On clock rollback, previously used Timestamp and Sequence pairs are not reused.

IDs with different Timestamps sort by time when compared as unsigned integers. Within the same
millisecond, Type and Node sit above Sequence, so they do not represent strict global issuance order.
Within the same Type, Node, and Timestamp, order follows Sequence.

## 9. Capacity

| Dimension | Capacity |
| --- | ---: |
| Lifetime | 2,199,023,255,552 ms (about 69.7 years) |
| Types | 64 |
| Nodes | 128 |
| Per node | 1,024 IDs/ms (all Types combined) |
| All nodes, theoretical | 131,072 IDs/ms |

These are formal upper bounds and do not guarantee API, network, implementation, or storage
throughput.

Use the [Canonical Test Vectors](test-vectors.md) for interoperability testing.

## 10. Interchange and storage

- JSON / HTTP: MUST use an unsigned decimal string.
- JavaScript / TypeScript: MUST use `bigint`.
- PostgreSQL `bigint`: signed, so the full lifetime cannot fit in one column. Use `numeric(20)`, a
  decimal string, or another unsigned-equivalent representation.
- MySQL `BIGINT UNSIGNED`: can store all Orbit ID v1 values.
- Binary form: 8-byte big-endian is canonical.

After about 34.8 years, when Timestamp's most significant bit is set, IDs exceed the signed 64-bit
maximum. Do not depend on signed 64-bit from the start.

## 11. Validation

Structural validation only guarantees that the input is in the unsigned 64-bit range and that a
decoder can extract each field. Because v1 has no version, checksum, or signature, an arbitrary
64-bit value cannot be proven from the ID alone to have been issued by Orbit.

APIs such as `isValid` MUST clearly distinguish "syntactically valid" from "issued".

## 12. Security and privacy

Orbit IDs are not secrets. They reveal issuance time, Type, Node, and some same-millisecond issuance
activity. IDOR defenses, authorization, tamper detection, authenticity, and guess resistance MUST be
implemented separately.

## 13. Compatibility

This document defines the v1 bit layout, but the ID itself has no version field. When introducing an
incompatible format, identify it via storage column, API field, prefix, or external metadata.
Existing IDs MUST NOT be reinterpreted as a new format.

## 14. Open items before stable v1

- Conformance test suite
- Canonical API error codes
- External versioning policy for identifying v2

Draft-official Type assignments live in the [Type Registry](type-registry.md). They remain mutable
until stable v1.

Default clock-rollback tolerance is defined in §7 (`5_000` ms).

Production Node allocation and reuse quarantine defaults are defined in
[Node Management](node-management.md).

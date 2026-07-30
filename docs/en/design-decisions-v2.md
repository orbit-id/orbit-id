# Design Decisions (Orbit ID v2)

[日本語](../ja/design-decisions-v2.md)

This document records **alpha-blocking** decisions for Orbit ID v2 (128-bit) before the
normative Draft in [Orbit ID v2 Specification](orbit-id-v2.md). Motivation for 128-bit:
[Why Orbit ID v2 is 128-bit](why-128bit.md).

Status: decisions locked for `v2.0.0-alpha` Draft. Breaking changes remain allowed while alpha.

Tracker: [#131](https://github.com/orbit-id/orbit-id/issues/131).

## 1. Field set (alpha)

**Decision:** Alpha layout fields are:

`FormatVersion` · `Timestamp` · `Type` · `Node` · `Sequence` · `Reserved`

**Not carved out in alpha:** Region, Datacenter, Tenant (and similar). Capacity for those stays
inside `Reserved` and MAY be split in a later alpha without changing the total width.

## 2. Bit layout (128 bits)

**Decision:** MSB → LSB (bit 127 = MSB, bit 0 = LSB):

```text
127          124 123                    76 75         60 59         44 43         28 27          0
┌──────────────┬──────────────────────────┬─────────────┬─────────────┬─────────────┬────────────┐
│ FormatVersion│ Timestamp                │ Type        │ Node        │ Sequence    │ Reserved   │
│ 4 bits       │ 48 bits                  │ 16 bits     │ 16 bits     │ 16 bits     │ 28 bits    │
└──────────────┴──────────────────────────┴─────────────┴─────────────┴─────────────┴────────────┘
```

| Field | Bits | Width | Valid values | Capacity notes |
| --- | --- | ---: | --- | --- |
| FormatVersion | 127..124 | 4 | `0..15` | Orbit ID v2 wire uses **`1`**. `0` is reserved. Unknown versions MUST fail decode. |
| Timestamp | 123..76 | 48 | `0..2^48-1` | ≈ **8919.4 years** of millisecond ticks from Orbit Epoch |
| Type | 75..60 | 16 | `0..65535` | `0` reserved (reject `generate(0)`). `1..65535` for deployers |
| Node | 59..44 | 16 | `0..65535` | Exclusive assignment per concurrent generator |
| Sequence | 43..28 | 16 | `0..65535` | Per node per millisecond, shared across Types |
| Reserved | 27..0 | 28 | MUST be `0` on encode for alpha | Decode MUST accept any value but SHOULD warn/reject non-zero when strict |

Shifts from LSB: Reserved `0`, Sequence `28`, Node `44`, Type `60`, Timestamp `76`, FormatVersion `124`.

## 3. Bit order and endianness

**Decision:** Keep v1’s “time-high” ordering so unsigned integer comparison remains roughly
time-ordered across different milliseconds.

**Binary interchange:** 16-byte **big-endian** is canonical (MSB first).

## 4. Format Version (in-band)

**Decision:** Unlike v1 (no in-band version; see v1 design-decisions §7), v2 embeds
`FormatVersion`. Issued v2 IDs MUST use `FormatVersion = 1`.

Identification vs v1:

- v1 values are **64-bit**; v2 values are **128-bit**. Do not reinterpret a 64-bit v1 ID as v2.
- Applications MUST separate them via column/API/envelope (type, length, or field name)—not by
  guessing from overlapping bit patterns alone.

Unknown `FormatVersion` values MUST fail closed on decode.

## 5. Epoch

**Decision:** Same Orbit Epoch as v1: `2026-01-01T00:00:00.000Z`
(`1767225600000` Unix ms). Lifetime headroom comes from the wider Timestamp field, not a new epoch.

## 6. String and interchange forms

**Decision:**

| Context | Canonical form |
| --- | --- |
| JSON / HTTP | Unsigned **decimal** string of the 128-bit integer (no sign, no leading `+`) |
| Binary | 16-byte big-endian |
| Optional | Lowercase hex (32 hex digits, no `0x`) MAY be accepted by libraries; decimal remains canonical |

ULID-style or UUID 8-4-4-4-12 strings are **not** canonical for Orbit ID v2 alpha (MAY be
revisited later).

## 7. In-memory value type (JS/TS)

**Decision:** Prefer a single `bigint` holding the full unsigned 128-bit value (same spirit as
v1’s `bigint` for 64-bit). Languages without native wide integers use a 16-byte buffer or an
unsigned 128-bit type.

## 8. Generation rules carried from v1

**Decision:** Unless a later alpha ADR says otherwise:

- Sequence is **global per Node per millisecond** (not per Type).
- Type `0` is reserved; generators MUST reject `generate(0)`.
- Default clock-rollback tolerance remains **`5_000` ms**.
- Node exclusivity / quarantine continue to follow [Node Management](node-management.md)
  (widths change; policy intent stays).

## 9. Coexistence with v1

**Decision:**

- Never re-decode an existing v1 ID under the v2 layout.
- Migration is an application/storage concern (new columns, dual-write, envelopes).
- v1 stays in maintenance mode; v2 evolves on the `v2.0.0-alpha.*` track.

## Related

- [Orbit ID v2 Specification](orbit-id-v2.md) (Draft)
- [Orbit ID v1 Specification](orbit-id-v1.md)
- [Design Decisions (v1)](design-decisions.md)
- [Why Orbit ID v2 is 128-bit](why-128bit.md)

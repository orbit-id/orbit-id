# Canonical Test Vectors

[日本語](../ja/test-vectors.md)

Orbit ID v1 implementations MUST encode the following values to the same unsigned 64-bit ID and
decode that ID back to the original fields. Timestamps are UTC. Hex values are big-endian numeric
forms. Type values in these vectors are for bit-layout verification only.

Machine-readable fixtures live in [`spec/conformance/`](../../spec/conformance/). Automated tests
SHOULD load those JSON files; this document is the human-readable companion.

## Vector 1: Epoch

| Field | Value |
| --- | ---: |
| Time | `2026-01-01T00:00:00.000Z` |
| Timestamp | `0` |
| Type | `1` |
| Node | `7` |
| Sequence | `42` |
| Decimal ID | `138282` |
| Hex ID | `0x0000000000021c2a` |

Calculation:

```text
(0 << 23) | (1 << 17) | (7 << 10) | 42 = 138282
```

## Vector 2: Representative timestamp

| Field | Value |
| --- | ---: |
| Time | `2026-07-14T00:12:34.567Z` |
| Timestamp | `16,762,354,567` |
| Type | `2` |
| Node | `7` |
| Sequence | `42` |
| Decimal ID | `140612821619842090` |
| Hex ID | `0x01f38e9dc3841c2a` |

Calculation:

```text
(16762354567 << 23) | (2 << 17) | (7 << 10) | 42
= 140612821619842090
```

## Vector 3: Maximum value

| Field | Value |
| --- | ---: |
| Time | `2095-09-07T15:47:35.551Z` |
| Timestamp | `2,199,023,255,551` |
| Type | `63` |
| Node | `127` |
| Sequence | `1,023` |
| Decimal ID | `18446744073709551615` |
| Hex ID | `0xffffffffffffffff` |

This vector is for bit-layout boundary checks. Type `63` is for layout verification only.

## Vector 4: Minimum non-zero timestamp

| Field | Value |
| --- | ---: |
| Time | `2026-01-01T00:00:00.001Z` |
| Timestamp | `1` |
| Type | `1` |
| Node | `0` |
| Sequence | `0` |
| Decimal ID | `8519680` |
| Hex ID | `0x0000000000820000` |

## Vector 5: Max node, zero sequence

| Field | Value |
| --- | ---: |
| Time | `2026-01-01T00:00:01.000Z` |
| Timestamp | `1,000` |
| Type | `10` |
| Node | `127` |
| Sequence | `0` |
| Decimal ID | `8390048768` |
| Hex ID | `0x00000001f415fc00` |

## Vector 6: Maximum sequence

| Field | Value |
| --- | ---: |
| Time | `2026-01-01T00:00:01.000Z` |
| Timestamp | `1,000` |
| Type | `1` |
| Node | `1` |
| Sequence | `1,023` |
| Decimal ID | `8388741119` |
| Hex ID | `0x00000001f40207ff` |

## Decoder rejection cases

A decimal-string decoder MUST reject at least the following inputs.

| Input | Reason |
| --- | --- |
| `-1` | Negative value |
| `18446744073709551616` | Greater than `2^64 - 1` |
| `1.0` | Not an integer string |
| `+1` | Leading plus sign is not canonical |
| ` 1` | Whitespace is not canonical |
| `1 ` | Whitespace is not canonical |
| empty string | Missing value |
| `01` | Leading zeros are not canonical |
| `0x1` | Hexadecimal prefix is not a decimal string |

`0` is canonical and MUST be accepted.

## Generator behavior cases

Default clock-rollback tolerance used by these cases: `5_000` ms. Full machine-readable cases are
in [`generator.v1.json`](../../spec/conformance/generator.v1.json).

| Case | Prior `(lastTimestamp, sequence)` | `nowTimestamp` | Required outcome |
| --- | --- | ---: | --- |
| Same ms increments sequence | `(1000, 0)` | `1000` | Issue with sequence `1` |
| Timestamp advance resets sequence | `(1000, 42)` | `1001` | Issue with sequence `0` |
| Sequence exhausted | `(1000, 1023)` | `1000` | Wait for next ms **or** `SEQUENCE_EXHAUSTED` |
| Rollback within tolerance | `(1000, 10)` | `995` | Wait until timestamp `1000` |
| Rollback beyond tolerance | `(6000, 10)` | `0` | `CLOCK_ROLLBACK` |

## Orbit ID v2 (Draft stub)

Normative Draft: [Orbit ID v2 Specification](orbit-id-v2.md). Decisions:
[Design Decisions (v2)](design-decisions-v2.md).

Machine-readable v2 fixtures are **not** checked in yet. Planned names under
[`spec/conformance/`](../../spec/conformance/):

- `encode-decode.v2.json`
- `decode-reject.v2.json`
- `generator.v2.json`

Until those land, the following hand vectors verify the alpha bit layout
(`FormatVersion=1`, `Reserved=0`).

### v2 Vector 1: Epoch

| Field | Value |
| --- | ---: |
| FormatVersion | `1` |
| Time | `2026-01-01T00:00:00.000Z` |
| Timestamp | `0` |
| Type | `1` |
| Node | `7` |
| Sequence | `42` |
| Reserved | `0` |
| Decimal ID | `21267647932558653967613957625668960256` |
| Hex ID | `0x100000000000000010007002a0000000` |

```text
(1 << 124) | (0 << 76) | (1 << 60) | (7 << 44) | (42 << 28) | 0
```

### v2 Vector 2: Representative timestamp

| Field | Value |
| --- | ---: |
| FormatVersion | `1` |
| Time | `2026-07-14T00:12:34.567Z` |
| Timestamp | `16,762,354,567` |
| Type | `2` |
| Node | `7` |
| Sequence | `42` |
| Reserved | `0` |
| Decimal ID | `21268914460260752812362294599660601344` |
| Hex ID | `0x10003e71d3b8700020007002a0000000` |

v2 decimal decoders MUST reject values greater than `2^128 - 1` and unknown
`FormatVersion` values. Full rejection tables ship with the JSON fixtures.

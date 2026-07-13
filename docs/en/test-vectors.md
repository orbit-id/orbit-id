# Canonical Test Vectors

[日本語](../ja/test-vectors.md)

Orbit ID v1 implementations MUST encode the following values to the same unsigned 64-bit ID and
decode that ID back to the original fields. Timestamps are UTC. Hex values are big-endian numeric
representations. Type values in these vectors are for bit-layout verification only and do not imply
official registry assignments.

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

This vector is for bit-layout boundary checks. Type `63` is not an official registry assignment.

## Decoder rejection cases

A decimal-string decoder MUST reject at least the following inputs.

| Input | Reason |
| --- | --- |
| `-1` | Negative value |
| `18446744073709551616` | Greater than `2^64 - 1` |
| `1.0` | Not an integer string |
| `+1` | Leading plus sign is not canonical |
| ` 1` | Whitespace is not canonical |
| empty string | Missing value |

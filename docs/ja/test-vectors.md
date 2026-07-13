# Canonical Test Vectors

[English](../en/test-vectors.md)

Orbit ID v1 実装は、以下の値を同じ unsigned 64-bit ID に encode し、その ID から元の field を
decode できなければなりません。日時表記は UTC、16 進表記は big-endian の数値表現です。
Test vector 内の Type 値は bit layout の検証用であり、registry 上の正式割当を意味しません。

機械可読な fixture は [`spec/conformance/`](../../spec/conformance/) にあります。自動テストは
それらの JSON を読むべきです。この文書は人間向けの説明です。

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

この vector は bit layout の境界検証用です。Type `63` は registry 上の正式割当を意味しません。

## Decoder rejection cases

10 進文字列 decoder は少なくとも次を拒否します。

| Input | Reason |
| --- | --- |
| `-1` | Negative value |
| `18446744073709551616` | Greater than `2^64 - 1` |
| `1.0` | Not an integer string |
| `+1` | Leading plus sign is not canonical |
| ` 1` | Whitespace is not canonical |
| empty string | Missing value |

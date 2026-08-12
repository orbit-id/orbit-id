# Orbit ID Conformance Suite

Language-agnostic fixtures for Orbit ID implementations. Human-readable explanations remain in
[Canonical Test Vectors](../../docs/en/test-vectors.md); this directory is the machine-readable source
implementations SHOULD load in automated tests.

## Layout

```text
spec/conformance/
├── README.md                 # this file
├── encode-decode.v1.json     # v1 round-trip encode / decode
├── decode-reject.v1.json     # v1 decimal-string rejection
├── generator.v1.json         # v1 generator behavior (clock / sequence)
├── encode-decode.v2.json     # v2 Draft round-trip encode / decode
├── decode-reject.v2.json     # v2 Draft decimal-string rejection
└── generator.v2.json         # v2 Draft generator behavior
```

Naming pattern: `<category>.v1.json` / `<category>.v2.json`.

| File set | `spec` field | Status |
| --- | --- | --- |
| `*.v1.json` | `"orbit-id/v1"` | Stable — loaded by language packages today |
| `*.v2.json` | `"orbit-id/v2"` | Draft (`v2.0.0-alpha`) — loaded by `@orbit-id/core` v2 tests |

## Common envelope

Every fixture file is a JSON object:

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | string | Fixture **envelope** format. Current: `"orbit-conformance/v1"` |
| `spec` | string | Target wire format (`"orbit-id/v1"` or `"orbit-id/v2"`) |
| `cases` | array | Ordered list of test cases |
| `defaults` | object | Optional defaults for generator fixtures |

IDs and numeric fields that may exceed JavaScript `Number.MAX_SAFE_INTEGER` MUST be JSON strings of
unsigned decimal integers. Bit widths and small counters MAY be JSON numbers.

### v2 encode-decode fields

In addition to v1’s `timestamp` / `type` / `node` / `sequence`, each v2 case includes:

| Field | Meaning |
| --- | --- |
| `formatVersion` | In-band version (issued IDs use `1`) |
| `region` | 4 bits (`0..15`) |
| `tenant` | 16 bits (`0..65535`) |
| `reserved` | Remaining lower 8 bits (encode MUST be `0`) |

Optional on `decode-reject` cases: `code` (e.g. `INVALID_RESERVED`) when rejection is not
`INVALID_DECIMAL` after a successful decimal parse.

Non-zero Region/Tenant round-trip vectors and remaining-Reserved reject cases land after all
language packages understand the carve-out (so a fixtures-only PR stays green on `main`).

`time` MAY be `null` when the Timestamp is beyond portable calendar libraries (see
`timestamp-max`).

## Case categories

### `encode-decode`

Each case provides fields and the expected ID. Implementations MUST:

1. Encode fields to `idDecimal` / `idHex`
2. Decode `idDecimal` back to the same fields

### `decode-reject`

Each case provides a decimal string `input` that MUST be rejected by a canonical decimal decoder.
`reason` is informative only.

- v1 bound: greater than `2^64 - 1`
- v2 bound: greater than `2^128 - 1`

### `generator`

Each case describes generator inputs (clock readings, prior state) and the required outcome
(`issue`, `wait`, `wait_or_fail`, or `error`). Exact wall-clock sleeping is not required in unit
tests; asserting the decided action and resulting state is enough.

Optional top-level `defaults` (for example `clockRollbackToleranceMs`) apply unless a case overrides
them. v2 Sequence exhaustion uses max `65535` (not v1’s `1023`).

## Consumption guidance

- Prefer loading these JSON files directly from each language package’s test suite.
- Load by **explicit filename** (`encode-decode.v1.json`, etc.). Do not glob all `*.json` unless the
  harness understands both `orbit-id/v1` and `orbit-id/v2`.
- Do not fork divergent copies of the vectors inside packages; if docs and fixtures disagree,
  fixtures win for automated conformance and docs MUST be updated in the same change.
- Type values in fixtures verify the bit layout only.

# Orbit ID Conformance Suite

Language-agnostic fixtures for Orbit ID v1 implementations. Human-readable explanations remain in
[Canonical Test Vectors](../docs/en/test-vectors.md); this directory is the machine-readable source
implementations SHOULD load in automated tests.

## Layout

```text
spec/conformance/
├── README.md                 # this file
├── encode-decode.v1.json     # round-trip encode / decode cases
├── decode-reject.v1.json     # decimal-string rejection cases
└── generator.v1.json         # generator behavior cases (clock / sequence)
```

Additional files MAY be added with the same naming pattern: `<category>.v1.json`.

## Common envelope

Every fixture file is a JSON object:

| Field | Type | Meaning |
| --- | --- | --- |
| `version` | string | Fixture format version. Current: `"orbit-conformance/v1"` |
| `spec` | string | Target specification id. Current: `"orbit-id/v1"` |
| `cases` | array | Ordered list of test cases |

IDs and numeric fields that may exceed JavaScript `Number.MAX_SAFE_INTEGER` MUST be JSON strings of
unsigned decimal integers (for example `"18446744073709551615"`). Bit widths and small counters MAY
be JSON numbers.

## Case categories

### `encode-decode`

Each case provides fields and the expected ID. Implementations MUST:

1. Encode `timestamp`, `type`, `node`, `sequence` to `idDecimal` / `idHex`
2. Decode `idDecimal` back to the same fields

### `decode-reject`

Each case provides a decimal string `input` that MUST be rejected by a canonical decimal decoder.
`reason` is informative only.

### `generator`

Each case describes generator inputs (clock readings, prior state) and the required outcome
(`issue`, `wait`, `wait_or_fail`, or `error`). Exact wall-clock sleeping is not required in unit
tests; asserting the decided action and resulting state is enough.

Optional top-level `defaults` (for example `clockRollbackToleranceMs`) apply unless a case overrides
them.

## Consumption guidance

- Prefer loading these JSON files directly from each language package’s test suite.
- Do not fork divergent copies of the vectors inside packages; if docs and fixtures disagree,
  fixtures win for automated conformance and docs MUST be updated in the same change.
- Type values in fixtures verify the bit layout. They do not by themselves grant Type Registry
  meaning unless the registry assigns them.

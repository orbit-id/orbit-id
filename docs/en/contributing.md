# Contributing to Orbit ID

[日本語](../ja/contributing.md)

Orbit ID is specification-first: format, edge cases, and test vectors stay ahead of new language
packages. Stable v1 interpretation is frozen; see the compatibility section below.

The root [`CONTRIBUTING.md`](../../CONTRIBUTING.md) mirrors this document for GitHub’s conventional
entry point.

## Proposing a change

1. Open an issue describing the requirement and use case.
2. If the change affects the bit layout or wire format, include compatibility and a migration plan.
3. In the pull request, update the specification, related docs, and test vectors together.

## Documentation style

- Write timestamps in UTC ISO 8601.
- Include exact, computable values for bit widths, boundaries, and shift amounts.
- Distinguish theoretical capacity from benchmark results.
- State the scope of guarantees such as `unique`, `ordered`, and `valid`.

## Compatibility

Stable `v1.1.0` is the current v1 release. Interpretation of existing 64-bit values MUST NOT change
within the v1 major line. **v1.x is in maintenance mode:** prefer bug fixes and documentation;
do not add features by default. New format / API work belongs on the v2 (128-bit) track — see
[Roadmap](roadmap.md) and [Why Orbit ID v2 is 128-bit](why-128bit.md).

## Pull request checklist

- [ ] Documented the rationale and use cases
- [ ] Rechecked the 64-bit total and field boundaries
- [ ] Considered both encode and decode directions
- [ ] Checked impact on clock rollback, overflow, and concurrency
- [ ] Checked impact on storage / JSON interoperability
- [ ] Updated the required specification and docs

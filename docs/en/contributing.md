# Contributing to Orbit ID

[日本語](../ja/contributing.md)

Orbit ID is currently developed specification-first. Interoperability of the format, edge cases, and
test vectors is finalized before implementations.

The root [`CONTRIBUTING.md`](../../CONTRIBUTING.md) mirrors this document for GitHub’s conventional
entry point.

## Proposing a change

1. Open an issue describing the requirement and use case.
2. If the change affects the bit layout or wire format, include compatibility and a migration plan.
3. In the pull request, update the specification, related docs, and test vectors together.
4. Follow the [Type Registry](type-registry.md) rules when adding a Type.

## Documentation style

- Write timestamps in UTC ISO 8601.
- Include exact, computable values for bit widths, boundaries, and shift amounts.
- Distinguish theoretical capacity from benchmark results.
- State the scope of guarantees such as `unique`, `ordered`, and `valid`.

## Compatibility

The specification may change before stable v1. After a stable release, interpretation of existing
64-bit values MUST NOT change within the same major version.

## Pull request checklist

- [ ] Documented the rationale and use cases
- [ ] Rechecked the 64-bit total and field boundaries
- [ ] Considered both encode and decode directions
- [ ] Checked impact on clock rollback, overflow, and concurrency
- [ ] Checked impact on storage / JSON interoperability
- [ ] Updated the required specification and docs

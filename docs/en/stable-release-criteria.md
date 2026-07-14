# Promoting Orbit ID to stable v1.0.0

[日本語](../ja/stable-release-criteria.md)

This document defines when `v1.0.0-draft.*` may become `v1.0.0`, and what that commitment means.

## Compatibility commitment

Starting at the first **stable** `v1.0.0` tag:

- Interpretation of existing Orbit ID v1 64-bit values MUST NOT change within the v1 major line
- Field widths, shift amounts, Orbit Epoch, and encode / decode formulas MUST NOT change in a way
  that alters previously issued IDs
- Breaking format changes require a new major version identified **outside** the 64-bit value

Draft releases before that tag MAY still change.

## Required before stable v1.0.0

All of the following MUST be true:

1. **License** — An OSS license file is present and documented (see README).
2. **Type registry** — Draft-official Type assignments are recorded; any last changes before freeze
   are merged with migration notes.
3. **Node allocation** — Production allocation strategy and reuse quarantine defaults are normative
   in Node Management.
4. **Clock rollback** — Default tolerance and fail-closed behavior are normative in the v1 spec.
5. **Conformance suite** — `spec/conformance/` fixtures cover encode/decode, rejection, and
   generator behavior needed for a reference implementation.
6. **Library API** — Shared operations, error codes, clock injection, and concurrency rules are
   documented.
7. **Versioning policy** — No in-band version bit; external identification of future formats is
   documented.
8. **Core package** — `packages/core` exists with shared reference logic and fixtures aligned to
   `spec/conformance/` (the monorepo source of truth other language packages can follow).
9. **Reference implementation** — At least one language package (TypeScript preferred) passes the
   conformance suite in CI.
10. **Status labels** — Spec / README Status fields are updated from Draft to stable `v1.0.0`.

## Release checklist

When cutting stable `v1.0.0` (completed for this repository):

- [x] Confirm the required list above (including `packages/core`)
- [x] Set specification status to `v1.0.0`
- [x] Update README / ROADMAP status wording
- [x] Tag the repository `v1.0.0`
- [x] Announce that 64-bit interpretation is frozen for the v1 major line
  (see README Status callout and this document's compatibility commitment)

## After stable

Additional Types, operational guidance, and library features MAY ship in minor / patch releases
without changing the meaning of already-issued IDs.

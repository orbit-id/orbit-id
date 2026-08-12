# Orbit ID v2 alpha exit and `2.0.0` promotion

[日本語](../ja/v2-alpha-exit.md)

Tracker: [#138](https://github.com/orbit-id/orbit-id/issues/138).  
Related: [Roadmap](roadmap.md) · [Cross-registry versioning](cross-registry-versioning.md) ·
[Library API](library-api.md) · [Design Decisions (v2)](design-decisions-v2.md).

This document locks **when alpha ends** and how package majors move v2 to the root API
(`@orbit-id/core@2.0.0` and peer ecosystems).

## While alpha (`v2.0.0-alpha.*` / 1.x additive)

| Rule | Detail |
| --- | --- |
| Spec status | [Orbit ID v2](orbit-id-v2.md) remains **Draft**; FormatVersion / Timestamp / Type / Node / Sequence are **frozen**; remaining Reserved (8) MAY still be carved (e.g. Datacenter) |
| Package default | **1.x** keeps **v1** at the package root |
| How to use v2 | Additive namespace only (`v2` / `@orbit-id/core/v2`, `com.github.orbitid.v2`, …) |
| Registry tags | Stable `vX.Y.Z` only publish; pre-release Git tags do **not** publish ([#148](https://github.com/orbit-id/orbit-id/issues/148)) |
| Go | Public v2 stays under `internal/v2` until module path `/v2` at package `2.0.0` |

## Alpha exit criteria (checklist)

Alpha MAY end (and beta / freeze may start) only when **all** of the following are true:

1. **Layout freeze** — [design-decisions-v2](design-decisions-v2.md) marks FormatVersion /
   Timestamp / Type / Node / Sequence frozen ([#171](https://github.com/orbit-id/orbit-id/issues/171)).
   No open proposal to re-slice those fields for alpha.
2. **Reserved carve-outs** — Region (4) + Tenant (16) are carved; remaining Reserved (8) MUST be `0`
   on encode and is fixture-covered. Further Datacenter-style carve-outs from the remaining 8 bits
   are optional before exit.
3. **Conformance green** — `spec/conformance/*.v2.json` pass in every public language package that
   claims v2 support (TypeScript/`@orbit-id/core`, Java, Rust, PHP; Go via `internal/v2` tests).
4. **API surface** — Library operations match [Library API](library-api.md) v2 delta
   (`generate` / `parse` / getters / `isValid` + FormatVersion / Region / Tenant / Reserved). CLI and
   playground can exercise v2 without breaking v1 defaults.
5. **Docs** — Normative Draft status can move toward beta wording; node-management / library-api /
   roadmap agree on ranges and the promotion path below.
6. **No blocking alpha issues** — Open `v2-alpha` implementation trackers required for the above are
   closed or explicitly deferred to post-`2.0.0`.

Exit is a **docs + process** gate, not an automatic publish of `2.0.0`.

## Promotion to package `2.0.0` (root → v2)

After alpha exit criteria are met (and optionally a short `v2.0.0-beta.*` freeze):

| Step | Action |
| --- | --- |
| 1 | Freeze the v2 wire layout in the Draft → Stable (or beta-frozen) specification |
| 2 | Bump coordinated package majors to **`2.0.0`** via the monorepo release cut |
| 3 | Make **v2 the root / default** public API in each language (see [Library API](library-api.md) table) |
| 4 | Keep **v1** importable under an explicit `v1` namespace / module / flag |
| 5 | Retire or re-export temporary additive paths (`@orbit-id/core/v2`) as aliases of the new root where helpful; document deprecation if they remain |

SemVer note: moving v2 to the root is a **breaking** change for consumers who imported root as v1 —
that is why it is **X = 2**, not a 1.x minor. Spec track tags (`v2.0.0-alpha.*`) name the **format
lifecycle**; package `2.0.0` is the **library** major that adopts that format as default.

Go: publish under module path `…/v2` at the same time as package major 2 (Go modules require the
`/v2` suffix).

## After `2.0.0`

- New features target v2 by default.
- v1 remains available for reading and generating legacy 64-bit IDs; wire format stays frozen.
- Further Reserved carve-outs follow a new ADR and SemVer rules (likely minor if additive and
  backward-compatible for issued IDs with Reserved=0).

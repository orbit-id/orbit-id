# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.0.1] — 2026-08-15

### Added

- Optional **Base64 URL** helpers (`toBase64UrlString` / `fromBase64UrlString`) across language
  packages — unpadded RFC 4648 §5 of big-endian bytes (v2: 22 chars; v1: 11). Decimal remains the
  JSON/HTTP canonical form ([#226](https://github.com/orbit-id/orbit-id/issues/226)).

## [2.0.0] — 2026-08-14

Coordinated registry cut (slice **J** of the [promotion plan](docs/en/v2-package-2.0.0.md)).
In-tree API work for this major landed under package versions `1.1.1` before the bump.

### Breaking

- Public package roots default to **Orbit ID v2** (128-bit). Former v1 roots move under explicit
  `v1` namespaces / `--spec v1` / Go `…/v2/v1` (or prior major `github.com/orbit-id/go@v1.x`).
- Go consumers must import **`github.com/orbit-id/go/v2`** (module path major).
- CLI and playground default wire format is **v2**.

### Added

- Stable [Orbit ID v2 Specification](docs/en/orbit-id-v2.md) (Region / Tenant carve; remaining
  Reserved MUST be `0`) ([#202](https://github.com/orbit-id/orbit-id/pull/202)).
- Root API promotion across languages: core ([#213](https://github.com/orbit-id/orbit-id/pull/213)),
  TypeScript ([#214](https://github.com/orbit-id/orbit-id/pull/214)),
  Java ([#215](https://github.com/orbit-id/orbit-id/pull/215)),
  Rust ([#216](https://github.com/orbit-id/orbit-id/pull/216)),
  PHP ([#217](https://github.com/orbit-id/orbit-id/pull/217)),
  Go ([#218](https://github.com/orbit-id/orbit-id/pull/218)),
  CLI + playground ([#219](https://github.com/orbit-id/orbit-id/pull/219)).

### Documentation

- Add [1.x → 2.0.0 migration guide](docs/en/migration-1x-to-2.0.0.md)
  ([日本語](docs/ja/migration-1x-to-2.0.0.md)) and refresh install / entry-point docs for the
  package `2.0.0` promotion train ([#210](https://github.com/orbit-id/orbit-id/issues/210)).

### Migration

See [Migrating from package 1.x to 2.0.0](docs/en/migration-1x-to-2.0.0.md).

## [1.1.1] — 2026-07

### Fixed / maintenance

- Cross-language conformance and packaging maintenance on the v1 default line (see Git history and
  prior release notes on registries).

[Unreleased]: https://github.com/orbit-id/orbit-id/compare/v2.0.1...HEAD
[2.0.1]: https://github.com/orbit-id/orbit-id/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/orbit-id/orbit-id/compare/v1.1.1...v2.0.0
[1.1.1]: https://github.com/orbit-id/orbit-id/releases/tag/v1.1.1

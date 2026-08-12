# Orbit ID for PHP

Pure-PHP implementation of Orbit ID. It requires PHP 8.1 or later and has no
runtime Composer dependencies: IDs and timestamps are represented as canonical
decimal strings (v2: unsigned 128-bit; v1: unsigned 64-bit), so the full range
works without GMP or BCMath.

- **v2** (`OrbitId\` / `OrbitId\V2\` alias): Stable 128-bit wire format
- **v1** (`OrbitId\V1\`): stable 64-bit wire format

Until package major `2.0.0` is cut on registries, treat this root swap as the
in-tree API for the promotion train
([#207](https://github.com/orbit-id/orbit-id/issues/207)).

## Install

```sh
composer require orbit-id/php
```

Publishing uses a [`orbit-id/php`](https://github.com/orbit-id/php) mirror of this
directory for Packagist — see [Packagist publishing](../../docs/en/packagist.md)
and [Cross-registry versioning](../../docs/en/cross-registry-versioning.md).

## API

```php
use OrbitId\OrbitGenerator;
use OrbitId\V1\OrbitGenerator as OrbitGeneratorV1;
use function OrbitId\parse;

// v2 (default)
$generator = new OrbitGenerator(['node' => 7]);
$id = $generator->generate(1); // canonical unsigned decimal string
$fields = parse($id);

// v1
$v1 = new OrbitGeneratorV1(['node' => 7]);
$v1Id = $v1->generate(1);
$v1Fields = \OrbitId\V1\OrbitId::parse($v1Id);
```

The `OrbitId` namespace exports `encode`, `decode`, `parse`, `getFormatVersion`,
`getTimestamp`, `getType`, `getNode`, `getSequence`, `getRegion`, `getTenant`,
`getReserved`, `isValid`, `toDecimalString`, `fromDecimalString`, `toHexString`,
`toUnixTimeMs`, and `fromUnixTimeMs`. The same helpers are also available as
static methods on `OrbitId\OrbitId`. Class aliases under `OrbitId\V2\` resolve
to the root types (function aliases are not provided).

`OrbitGenerator` accepts `node`, optional `region` / `tenant`, optional `clock`,
optional `clockRollbackToleranceMs`, `onSequenceExhausted` (`wait` or `fail`),
and an optional `confirmOwnership` callback. `generate(0)` is rejected because
type zero is reserved. Issued IDs use `FormatVersion = 1` and `Reserved = 0`.
Errors are `OrbitId\OrbitError`; inspect its public `$orbitCode` for the stable
cross-language error code (including `INVALID_FORMAT_VERSION` /
`INVALID_REGION` / `INVALID_TENANT` / `INVALID_RESERVED`).

`isValid` checks structural validity only. It does not prove that an ID was
issued by an Orbit generator.

## Test

```sh
composer install
composer test
```

The PHPUnit suite consumes the shared fixtures in
[`spec/conformance/`](../../spec/conformance/).

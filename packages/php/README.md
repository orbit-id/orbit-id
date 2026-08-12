# Orbit ID for PHP

Pure-PHP implementation of Orbit ID. It requires PHP 8.1 or later and has no
runtime Composer dependencies: IDs and timestamps are represented as canonical
decimal strings (v1: unsigned 64-bit; v2 Draft: unsigned 128-bit), so the full
range works without GMP or BCMath.

- **v1** (`OrbitId\`): stable default
- **v2** (`OrbitId\V2\`): Draft 128-bit layout (`v2.0.0-alpha`)

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
use OrbitId\V2\OrbitGenerator as OrbitGeneratorV2;
use function OrbitId\parse;

// v1
$generator = new OrbitGenerator(['node' => 7]);
$id = $generator->generate(1); // canonical unsigned decimal string
$fields = parse($id);

// v2 Draft
$v2 = new OrbitGeneratorV2(['node' => 7]);
$v2Id = $v2->generate(1);
$v2Fields = \OrbitId\V2\OrbitId::parse($v2Id);
```

The `OrbitId` namespace exports `encode`, `decode`, `parse`, `getTimestamp`,
`getType`, `getNode`, `getSequence`, `isValid`, `toDecimalString`,
`fromDecimalString`, `toHexString`, `toUnixTimeMs`, and `fromUnixTimeMs`.
The same helpers are also available as static methods on `OrbitId\OrbitId`.

`OrbitId\V2\OrbitId` adds `formatVersion` / `reserved` (issued IDs use
`FormatVersion = 1` and `Reserved = 0`).

`OrbitGenerator` accepts `node`, optional `clock`, optional
`clockRollbackToleranceMs`, `onSequenceExhausted` (`wait` or `fail`), and an
optional `confirmOwnership` callback. `generate(0)` is rejected because type
zero is reserved. Errors are `OrbitId\OrbitError`; inspect its public
`$orbitCode` for the stable cross-language error code (including
`INVALID_FORMAT_VERSION` / `INVALID_RESERVED` for v2).

`isValid` checks structural validity only. It does not prove that an ID was
issued by an Orbit generator.

## Test

```sh
composer install
composer test
```

The PHPUnit suite consumes the shared fixtures in
[`spec/conformance/`](../../spec/conformance/).

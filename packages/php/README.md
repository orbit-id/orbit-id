# Orbit ID for PHP

Pure-PHP implementation of the Orbit ID v1 unsigned 64-bit format. It requires
PHP 8.1 or later and has no runtime Composer dependencies: IDs and timestamps
are represented as canonical decimal strings, so the full `uint64` range works
without GMP or BCMath.

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
use function OrbitId\parse;

$generator = new OrbitGenerator(['node' => 7]);
$id = $generator->generate(1); // canonical unsigned decimal string

$fields = parse($id);
// ['timestamp' => '...', 'type' => 1, 'node' => 7, 'sequence' => 0]
```

The `OrbitId` namespace exports `encode`, `decode`, `parse`, `getTimestamp`,
`getType`, `getNode`, `getSequence`, `isValid`, `toDecimalString`,
`fromDecimalString`, `toHexString`, `toUnixTimeMs`, and `fromUnixTimeMs`.
The same helpers are also available as static methods on `OrbitId\OrbitId`.

`OrbitGenerator` accepts `node`, optional `clock`, optional
`clockRollbackToleranceMs`, `onSequenceExhausted` (`wait` or `fail`), and an
optional `confirmOwnership` callback. `generate(0)` is rejected because type
zero is reserved. Errors are `OrbitId\OrbitError`; inspect its public
`$orbitCode` for the stable cross-language error code.

`isValid` checks structural validity only. It does not prove that an ID was
issued by an Orbit generator.

## Test

```sh
composer install
composer test
```

The PHPUnit suite consumes the shared fixtures in
[`spec/conformance/`](../../spec/conformance/).

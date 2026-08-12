<?php

declare(strict_types=1);

namespace OrbitId\V2;

use OrbitId\Decimal;
use OrbitId\OrbitError;
use OrbitId\OrbitId as OrbitIdV1;

/**
 * Encoder, decoder, and conversion helpers for unsigned Orbit ID v2 values.
 *
 * v2 widens the value to 128 bits. IDs and timestamps stay canonical decimal
 * strings so the full unsigned 128-bit range works on every PHP 8.1 platform
 * without GMP, BCMath, or Composer packages (see `OrbitId\Decimal`). The
 * Sequence + Node + Region + Tenant + Reserved fields (60 bits) fit a native
 * PHP int, but FormatVersion, Timestamp, and Type live above bit 60 and require
 * decimal string arithmetic.
 */
final class OrbitId
{
    /** Same Orbit Epoch as v1. */
    public const ORBIT_EPOCH_UNIX_MS = OrbitIdV1::ORBIT_EPOCH_UNIX_MS;
    public const DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS = OrbitIdV1::DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS;

    public const FORMAT_VERSION_BITS = 4;
    public const TIMESTAMP_BITS = 48;
    public const TYPE_BITS = 16;
    public const NODE_BITS = 16;
    public const SEQUENCE_BITS = 16;
    public const REGION_BITS = 4;
    public const TENANT_BITS = 16;
    public const RESERVED_BITS = 8;

    public const FORMAT_VERSION_SHIFT = 124;
    public const TIMESTAMP_SHIFT = 76;
    public const TYPE_SHIFT = 60;
    public const NODE_SHIFT = 44;
    public const SEQUENCE_SHIFT = 28;
    public const REGION_SHIFT = 24;
    public const TENANT_SHIFT = 8;

    public const MAX_TIMESTAMP = '281474976710655';
    public const MAX_TYPE = 65535;
    public const MAX_NODE = 65535;
    public const MAX_SEQUENCE = 65535;
    public const MAX_REGION = 15;
    public const MAX_TENANT = 65535;
    public const MAX_RESERVED = 255;

    /** Issued Orbit ID v2 values MUST use FormatVersion = 1. */
    public const ISSUED_FORMAT_VERSION = 1;

    /**
     * @param array{formatVersion: int, timestamp: string|int, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int} $fields
     */
    public static function encode(array $fields): string
    {
        foreach (['formatVersion', 'timestamp', 'type', 'node', 'sequence', 'region', 'tenant', 'reserved'] as $field) {
            if (!array_key_exists($field, $fields)) {
                throw new \InvalidArgumentException("missing required field: {$field}");
            }
        }

        if ($fields['formatVersion'] !== self::ISSUED_FORMAT_VERSION) {
            throw new OrbitError(OrbitError::INVALID_FORMAT_VERSION, "formatVersion must be " . self::ISSUED_FORMAT_VERSION . ": {$fields['formatVersion']}");
        }
        $timestamp = self::timestamp($fields['timestamp']);
        self::boundedInt($fields['type'], self::MAX_TYPE, OrbitError::INVALID_TYPE, 'type');
        self::boundedInt($fields['node'], self::MAX_NODE, OrbitError::INVALID_NODE, 'node');
        self::boundedInt($fields['sequence'], self::MAX_SEQUENCE, OrbitError::INVALID_SEQUENCE, 'sequence');
        self::boundedInt($fields['region'], self::MAX_REGION, OrbitError::INVALID_REGION, 'region');
        self::boundedInt($fields['tenant'], self::MAX_TENANT, OrbitError::INVALID_TENANT, 'tenant');
        if ($fields['reserved'] !== 0) {
            throw new OrbitError(OrbitError::INVALID_RESERVED, "reserved must be 0 on encode: {$fields['reserved']}");
        }

        $low60 = ($fields['node'] << self::NODE_SHIFT)
            | ($fields['sequence'] << self::SEQUENCE_SHIFT)
            | ($fields['region'] << self::REGION_SHIFT)
            | ($fields['tenant'] << self::TENANT_SHIFT)
            | $fields['reserved'];

        $high = Decimal::add(
            Decimal::add(
                Decimal::shiftLeft((string) $fields['formatVersion'], self::FORMAT_VERSION_SHIFT),
                Decimal::shiftLeft($timestamp, self::TIMESTAMP_SHIFT),
            ),
            Decimal::shiftLeft((string) $fields['type'], self::TYPE_SHIFT),
        );

        return Decimal::add($high, (string) $low60);
    }

    /**
     * @return array{formatVersion: int, timestamp: string, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int}
     */
    public static function decode(mixed $id): array
    {
        $value = self::id($id);

        // Peel the low, small fields off with plain-int divisors first; once
        // 76 bits (Reserved + Tenant + Region + Sequence + Node + Type) are
        // removed, the remainder is <= 52 bits and safe to hold in a native PHP int.
        [$afterReserved, $reserved] = Decimal::divmodInt($value, 1 << self::RESERVED_BITS);
        [$afterTenant, $tenant] = Decimal::divmodInt($afterReserved, 1 << self::TENANT_BITS);
        [$afterRegion, $region] = Decimal::divmodInt($afterTenant, 1 << self::REGION_BITS);
        [$afterSequence, $sequence] = Decimal::divmodInt($afterRegion, 1 << self::SEQUENCE_BITS);
        [$afterNode, $node] = Decimal::divmodInt($afterSequence, 1 << self::NODE_BITS);
        [$afterType, $type] = Decimal::divmodInt($afterNode, 1 << self::TYPE_BITS);

        $high = (int) $afterType;
        $formatVersion = $high >> self::TIMESTAMP_BITS;
        $timestamp = (string) ($high & ((1 << self::TIMESTAMP_BITS) - 1));

        if ($formatVersion !== self::ISSUED_FORMAT_VERSION) {
            throw new OrbitError(OrbitError::INVALID_FORMAT_VERSION, "unknown or reserved formatVersion: {$formatVersion}");
        }
        if ($reserved !== 0) {
            throw new OrbitError(OrbitError::INVALID_RESERVED, "non-zero reserved is rejected in alpha: {$reserved}");
        }

        return compact('formatVersion', 'timestamp', 'type', 'node', 'sequence', 'region', 'tenant', 'reserved');
    }

    /**
     * @return array{formatVersion: int, timestamp: string, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int}
     */
    public static function parse(mixed $id): array
    {
        return self::decode($id);
    }

    public static function getFormatVersion(mixed $id): int
    {
        return self::decode($id)['formatVersion'];
    }

    public static function getTimestamp(mixed $id): string
    {
        return self::decode($id)['timestamp'];
    }

    public static function getType(mixed $id): int
    {
        return self::decode($id)['type'];
    }

    public static function getNode(mixed $id): int
    {
        return self::decode($id)['node'];
    }

    public static function getSequence(mixed $id): int
    {
        return self::decode($id)['sequence'];
    }

    public static function getRegion(mixed $id): int
    {
        return self::decode($id)['region'];
    }

    public static function getTenant(mixed $id): int
    {
        return self::decode($id)['tenant'];
    }

    public static function getReserved(mixed $id): int
    {
        return self::decode($id)['reserved'];
    }

    /** Syntactic validity only; this does not prove an ID was issued. */
    public static function isValid(mixed $id): bool
    {
        try {
            self::decode($id);
            return true;
        } catch (\Throwable) {
            return false;
        }
    }

    /** @return string Canonical unsigned decimal string. */
    public static function toDecimalString(mixed $id): string
    {
        return self::id($id);
    }

    /** @return string Canonical unsigned decimal string. */
    public static function fromDecimalString(string $input): string
    {
        return self::canonicalDecimal($input);
    }

    public static function toHexString(mixed $id): string
    {
        $value = self::id($id);
        $hex = '';
        do {
            [$value, $remainder] = Decimal::divmodInt($value, 16);
            $hex .= '0123456789abcdef'[$remainder];
        } while ($value !== '0');

        return '0x' . str_pad(strrev($hex), 32, '0', STR_PAD_LEFT);
    }

    /** @param string|int $timestamp */
    public static function toUnixTimeMs(string|int $timestamp): string
    {
        return Decimal::add(self::timestamp($timestamp), self::ORBIT_EPOCH_UNIX_MS);
    }

    /** @param string|int $unixMs */
    public static function fromUnixTimeMs(string|int $unixMs): string
    {
        return Decimal::subtract(self::unsignedDecimal($unixMs, OrbitError::INVALID_TIMESTAMP, 'unix timestamp'), self::ORBIT_EPOCH_UNIX_MS);
    }

    /** @param string|int $value */
    public static function timestamp(string|int $value): string
    {
        $timestamp = self::unsignedDecimal($value, OrbitError::INVALID_TIMESTAMP, 'timestamp');
        if (Decimal::compare($timestamp, self::MAX_TIMESTAMP) > 0) {
            throw new OrbitError(OrbitError::INVALID_TIMESTAMP, "timestamp out of range: {$timestamp}");
        }
        return $timestamp;
    }

    private static function id(mixed $value): string
    {
        if (is_string($value)) {
            return self::canonicalDecimal($value);
        }
        if (is_int($value) && $value >= 0) {
            return (string) $value;
        }

        throw new OrbitError(OrbitError::INVALID_DECIMAL, 'id must be a non-negative integer or canonical decimal string');
    }

    private static function canonicalDecimal(string $input): string
    {
        if ($input === '') {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'empty decimal string');
        }
        if (!preg_match('/^[0-9]+$/D', $input)) {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'non-canonical decimal string');
        }
        if (strlen($input) > 1 && $input[0] === '0') {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'leading zeros are not canonical');
        }
        if (Decimal::compare($input, Decimal::U128_MAX) > 0) {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'decimal value outside unsigned 128-bit range');
        }
        return $input;
    }

    private static function unsignedDecimal(string|int $value, string $errorCode, string $field): string
    {
        if (is_int($value)) {
            if ($value >= 0) {
                return (string) $value;
            }
        } elseif (is_string($value) && preg_match('/^[0-9]+$/D', $value) && !($value !== '0' && $value[0] === '0')) {
            return $value;
        }

        throw new OrbitError($errorCode, "{$field} must be a non-negative canonical decimal string or integer");
    }

    private static function boundedInt(mixed $value, int $maximum, string $errorCode, string $field): void
    {
        if (!is_int($value) || $value < 0 || $value > $maximum) {
            $display = is_scalar($value) ? (string) $value : gettype($value);
            throw new OrbitError($errorCode, "{$field} out of range: {$display}");
        }
    }
}

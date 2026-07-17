<?php

declare(strict_types=1);

namespace OrbitId;

/**
 * Encoder, decoder, and conversion helpers for unsigned Orbit ID v1 values.
 *
 * IDs and timestamps are decimal strings so the full unsigned 64-bit range
 * works on every PHP 8.1 platform without GMP, BCMath, or Composer packages.
 */
final class OrbitId
{
    public const ORBIT_EPOCH_UNIX_MS = '1767225600000';
    public const TIMESTAMP_BITS = 41;
    public const TYPE_BITS = 6;
    public const NODE_BITS = 7;
    public const SEQUENCE_BITS = 10;
    public const TIMESTAMP_SHIFT = 23;
    public const TYPE_SHIFT = 17;
    public const NODE_SHIFT = 10;
    public const MAX_TIMESTAMP = '2199023255551';
    public const MAX_TYPE = 63;
    public const MAX_NODE = 127;
    public const MAX_SEQUENCE = 1023;
    public const DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS = 5000;

    /**
     * @param array{timestamp: string|int, type: int, node: int, sequence: int} $fields
     */
    public static function encode(array $fields): string
    {
        foreach (['timestamp', 'type', 'node', 'sequence'] as $field) {
            if (!array_key_exists($field, $fields)) {
                throw new \InvalidArgumentException("missing required field: {$field}");
            }
        }

        $timestamp = self::timestamp($fields['timestamp']);
        self::boundedInt($fields['type'], self::MAX_TYPE, OrbitError::INVALID_TYPE, 'type');
        self::boundedInt($fields['node'], self::MAX_NODE, OrbitError::INVALID_NODE, 'node');
        self::boundedInt($fields['sequence'], self::MAX_SEQUENCE, OrbitError::INVALID_SEQUENCE, 'sequence');

        return Decimal::add(
            Decimal::add(
                Decimal::add(
                    Decimal::multiplyInt($timestamp, 1 << self::TIMESTAMP_SHIFT),
                    (string) ($fields['type'] << self::TYPE_SHIFT),
                ),
                (string) ($fields['node'] << self::NODE_SHIFT),
            ),
            (string) $fields['sequence'],
        );
    }

    /**
     * @return array{timestamp: string, type: int, node: int, sequence: int}
     */
    public static function decode(mixed $id): array
    {
        $value = self::id($id);
        [$timestamp, $remainder] = Decimal::divmodInt($value, 1 << self::TIMESTAMP_SHIFT);

        // Decode from the lower 23 bits; integer operations are safe here.
        $type = ($remainder >> self::TYPE_SHIFT) & self::MAX_TYPE;
        $node = ($remainder >> self::NODE_SHIFT) & self::MAX_NODE;
        $sequence = $remainder & self::MAX_SEQUENCE;

        return compact('timestamp', 'type', 'node', 'sequence');
    }

    /**
     * @return array{timestamp: string, type: int, node: int, sequence: int}
     */
    public static function parse(mixed $id): array
    {
        return self::decode($id);
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

    /** Syntactic validity only; this does not prove an ID was issued. */
    public static function isValid(mixed $id): bool
    {
        try {
            self::id($id);
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

        return '0x' . str_pad(strrev($hex), 16, '0', STR_PAD_LEFT);
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
        if (Decimal::compare($input, Decimal::U64_MAX) > 0) {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'decimal value outside unsigned 64-bit range');
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

// ci-smoke: php (do not merge)

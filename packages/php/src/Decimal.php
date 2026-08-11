<?php

declare(strict_types=1);

namespace OrbitId;

/**
 * Unsigned decimal arithmetic for Orbit's 64-bit values.
 *
 * All methods operate on canonical, non-negative decimal strings, avoiding
 * platform-dependent integer overflow and external extensions.
 *
 * @internal
 */
final class Decimal
{
    public const U64_MAX = '18446744073709551615';
    public const U128_MAX = '340282366920938463463374607431768211455';

    public static function compare(string $left, string $right): int
    {
        $left = self::trimLeadingZeros($left);
        $right = self::trimLeadingZeros($right);
        if (strlen($left) !== strlen($right)) {
            return strlen($left) <=> strlen($right);
        }

        return $left <=> $right;
    }

    public static function add(string $left, string $right): string
    {
        $carry = 0;
        $result = '';
        $i = strlen($left) - 1;
        $j = strlen($right) - 1;

        while ($i >= 0 || $j >= 0 || $carry !== 0) {
            $digit = $carry;
            if ($i >= 0) {
                $digit += ord($left[$i--]) - 48;
            }
            if ($j >= 0) {
                $digit += ord($right[$j--]) - 48;
            }
            $result .= chr(48 + ($digit % 10));
            $carry = intdiv($digit, 10);
        }

        return strrev($result);
    }

    /** @throws OrbitError when right is greater than left. */
    public static function subtract(string $left, string $right): string
    {
        if (self::compare($left, $right) < 0) {
            throw new OrbitError(OrbitError::INVALID_TIMESTAMP, 'time precedes Orbit epoch');
        }

        $borrow = 0;
        $result = '';
        $i = strlen($left) - 1;
        $j = strlen($right) - 1;
        while ($i >= 0) {
            $digit = ord($left[$i--]) - 48 - $borrow;
            if ($j >= 0) {
                $digit -= ord($right[$j--]) - 48;
            }
            if ($digit < 0) {
                $digit += 10;
                $borrow = 1;
            } else {
                $borrow = 0;
            }
            $result .= chr(48 + $digit);
        }

        return self::trimLeadingZeros(strrev($result));
    }

    public static function multiplyInt(string $value, int $multiplier): string
    {
        if ($multiplier === 0 || $value === '0') {
            return '0';
        }

        $carry = 0;
        $result = '';
        for ($i = strlen($value) - 1; $i >= 0; $i--) {
            $product = (ord($value[$i]) - 48) * $multiplier + $carry;
            $result .= chr(48 + ($product % 10));
            $carry = intdiv($product, 10);
        }
        while ($carry !== 0) {
            $result .= chr(48 + ($carry % 10));
            $carry = intdiv($carry, 10);
        }

        return strrev($result);
    }

    /**
     * Multiplies a decimal string by 2**$bits.
     *
     * Chunked into <=30-bit multiplications so every intermediate
     * `digit * multiplier + carry` step stays well within a 64-bit int.
     */
    public static function shiftLeft(string $value, int $bits): string
    {
        while ($bits > 0) {
            $chunk = min($bits, 30);
            $value = self::multiplyInt($value, 1 << $chunk);
            $bits -= $chunk;
        }

        return $value;
    }

    /** @return array{0: string, 1: int} quotient and remainder */
    public static function divmodInt(string $value, int $divisor): array
    {
        $remainder = 0;
        $quotient = '';
        foreach (str_split($value) as $character) {
            $remainder = $remainder * 10 + ord($character) - 48;
            $quotient .= chr(48 + intdiv($remainder, $divisor));
            $remainder %= $divisor;
        }

        return [self::trimLeadingZeros($quotient), $remainder];
    }

    private static function trimLeadingZeros(string $value): string
    {
        $trimmed = ltrim($value, '0');
        return $trimmed === '' ? '0' : $trimmed;
    }
}

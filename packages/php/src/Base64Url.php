<?php

declare(strict_types=1);

namespace OrbitId;

/**
 * Unpadded Base64 URL (RFC 4648 §5) for Orbit ID big-endian bytes.
 *
 * @internal
 */
final class Base64Url
{
    public static function encode(string $bytes): string
    {
        return rtrim(strtr(base64_encode($bytes), '+/', '-_'), '=');
    }

    public static function decode(string $input, int $expectedByteLength): string
    {
        $expectedChars = (int) ceil(($expectedByteLength * 8) / 6);
        if (strlen($input) !== $expectedChars) {
            throw new OrbitError(OrbitError::INVALID_BASE64URL, "base64url length must be {$expectedChars}");
        }
        if (!preg_match('/^[A-Za-z0-9_-]+$/D', $input)) {
            throw new OrbitError(OrbitError::INVALID_BASE64URL, 'invalid base64url alphabet');
        }
        $padded = strtr($input, '-_', '+/');
        $pad = (4 - (strlen($padded) % 4)) % 4;
        $decoded = base64_decode(str_pad($padded, strlen($padded) + $pad, '=', STR_PAD_RIGHT), true);
        if ($decoded === false || strlen($decoded) !== $expectedByteLength) {
            throw new OrbitError(OrbitError::INVALID_BASE64URL, 'invalid base64url string');
        }
        return $decoded;
    }

    public static function decimalToBigEndian(string $decimal, int $byteLength): string
    {
        $value = $decimal;
        $bytes = '';
        for ($i = 0; $i < $byteLength; $i++) {
            [$value, $remainder] = Decimal::divmodInt($value, 256);
            $bytes .= chr($remainder);
        }
        if ($value !== '0') {
            throw new OrbitError(OrbitError::INVALID_DECIMAL, 'id out of range for byte length');
        }
        return strrev($bytes);
    }

    public static function bigEndianToDecimal(string $bytes): string
    {
        $value = '0';
        $length = strlen($bytes);
        for ($i = 0; $i < $length; $i++) {
            $value = Decimal::add(Decimal::multiplyInt($value, 256), (string) ord($bytes[$i]));
        }
        return $value;
    }
}

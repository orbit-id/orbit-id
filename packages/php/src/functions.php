<?php

declare(strict_types=1);

namespace OrbitId;

/** @param array{formatVersion: int, timestamp: string|int, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int} $fields */
function encode(array $fields): string
{
    return OrbitId::encode($fields);
}

/** @return array{formatVersion: int, timestamp: string, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int} */
function decode(mixed $id): array
{
    return OrbitId::decode($id);
}

/** @return array{formatVersion: int, timestamp: string, type: int, node: int, sequence: int, region: int, tenant: int, reserved: int} */
function parse(mixed $id): array
{
    return OrbitId::parse($id);
}

function getFormatVersion(mixed $id): int
{
    return OrbitId::getFormatVersion($id);
}

function getTimestamp(mixed $id): string
{
    return OrbitId::getTimestamp($id);
}

function getType(mixed $id): int
{
    return OrbitId::getType($id);
}

function getNode(mixed $id): int
{
    return OrbitId::getNode($id);
}

function getSequence(mixed $id): int
{
    return OrbitId::getSequence($id);
}

function getRegion(mixed $id): int
{
    return OrbitId::getRegion($id);
}

function getTenant(mixed $id): int
{
    return OrbitId::getTenant($id);
}

function getReserved(mixed $id): int
{
    return OrbitId::getReserved($id);
}

function isValid(mixed $id): bool
{
    return OrbitId::isValid($id);
}

function toDecimalString(mixed $id): string
{
    return OrbitId::toDecimalString($id);
}

function fromDecimalString(string $input): string
{
    return OrbitId::fromDecimalString($input);
}

function toHexString(mixed $id): string
{
    return OrbitId::toHexString($id);
}

function toBase64UrlString(mixed $id): string
{
    return OrbitId::toBase64UrlString($id);
}

function fromBase64UrlString(string $input): string
{
    return OrbitId::fromBase64UrlString($input);
}

function toUnixTimeMs(string|int $timestamp): string
{
    return OrbitId::toUnixTimeMs($timestamp);
}

function fromUnixTimeMs(string|int $unixMs): string
{
    return OrbitId::fromUnixTimeMs($unixMs);
}

/** @return callable(): int */
function systemOrbitClock(): callable
{
    return OrbitGenerator::systemClock();
}

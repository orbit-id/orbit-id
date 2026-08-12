<?php

declare(strict_types=1);

namespace OrbitId\Tests;

use OrbitId\OrbitError;
use OrbitId\OrbitGenerator;
use OrbitId\OrbitId;
use OrbitId\V1\OrbitId as OrbitIdV1;
use OrbitId\V2\OrbitGenerator as OrbitGeneratorV2Alias;
use OrbitId\V2\OrbitId as OrbitIdV2Alias;
use PHPUnit\Framework\TestCase;

final class RootApiTest extends TestCase
{
    public function testRootIsV2AndV1Remains(): void
    {
        self::assertSame(65535, OrbitId::MAX_NODE);
        self::assertSame('281474976710655', OrbitId::MAX_TIMESTAMP);
        self::assertSame(127, OrbitIdV1::MAX_NODE);
    }

    public function testV2AliasesResolveToRoot(): void
    {
        self::assertTrue(class_exists(OrbitIdV2Alias::class));
        self::assertTrue(class_exists(OrbitGeneratorV2Alias::class));
        self::assertSame(OrbitId::MAX_NODE, OrbitIdV2Alias::MAX_NODE);
        $generator = new OrbitGeneratorV2Alias(['node' => 7]);
        self::assertSame(7, $generator->node);
    }

    public function testRootHelperFunctions(): void
    {
        $sample = '21268914460260752812362294599660601344';
        self::assertSame(1, \OrbitId\getFormatVersion($sample));
        self::assertSame('16762354567', \OrbitId\getTimestamp($sample));
        self::assertSame(2, \OrbitId\getType($sample));
        self::assertSame(7, \OrbitId\getNode($sample));
        self::assertSame(42, \OrbitId\getSequence($sample));
        self::assertSame(0, \OrbitId\getRegion($sample));
        self::assertSame(0, \OrbitId\getTenant($sample));
        self::assertSame(0, \OrbitId\getReserved($sample));
        self::assertTrue(\OrbitId\isValid($sample));
        self::assertSame($sample, \OrbitId\toDecimalString($sample));
        self::assertSame($sample, \OrbitId\fromDecimalString($sample));
        self::assertSame(strtolower(OrbitId::toHexString($sample)), \OrbitId\toHexString($sample));
        self::assertSame(OrbitId::decode($sample), \OrbitId\decode($sample));
        self::assertSame(OrbitId::parse($sample), \OrbitId\parse($sample));
        $fields = OrbitId::decode($sample);
        self::assertSame($sample, \OrbitId\encode($fields));
        $unix = \OrbitId\toUnixTimeMs(0);
        self::assertSame('0', \OrbitId\fromUnixTimeMs($unix));
        self::assertIsCallable(\OrbitId\systemOrbitClock());
    }

    public function testV1IdsAreRejectedByRoot(): void
    {
        self::assertFalse(\OrbitId\isValid('140612821619842090'));
        try {
            OrbitId::parse('140612821619842090');
            self::fail('expected OrbitError');
        } catch (OrbitError $error) {
            self::assertSame(OrbitError::INVALID_FORMAT_VERSION, $error->orbitCode);
        }
    }

    public function testRootGeneratorSmoke(): void
    {
        $generator = new OrbitGenerator([
            'node' => 7,
            'clock' => static fn(): int => 1000,
        ]);
        $id = $generator->generate(1);
        self::assertTrue(OrbitId::isValid($id));
        self::assertSame(1, OrbitId::getFormatVersion($id));
    }
}

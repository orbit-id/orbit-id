<?php

declare(strict_types=1);

namespace OrbitId\Tests;

use OrbitId\OrbitError;
use OrbitId\V2\OrbitGenerator;
use OrbitId\V2\OrbitId;
use PHPUnit\Framework\TestCase;

final class ConformanceV2Test extends TestCase
{
    public function testEncodeDecodeFixtures(): void
    {
        foreach ($this->fixture('encode-decode.v2.json')['cases'] as $case) {
            $fields = [
                'formatVersion' => $case['formatVersion'],
                'timestamp' => $case['timestamp'],
                'type' => $case['type'],
                'node' => $case['node'],
                'sequence' => $case['sequence'],
                'region' => $case['region'],
                'tenant' => $case['tenant'],
                'reserved' => $case['reserved'],
            ];
            $id = OrbitId::encode($fields);

            self::assertSame($case['idDecimal'], $id, $case['id']);
            self::assertSame(strtolower($case['idHex']), OrbitId::toHexString($id), $case['id']);
            self::assertSame($fields, OrbitId::decode($id), $case['id']);
            self::assertSame($fields, OrbitId::parse($case['idDecimal']), $case['id']);
            self::assertSame($case['formatVersion'], OrbitId::getFormatVersion($id), $case['id']);
            self::assertSame($case['timestamp'], OrbitId::getTimestamp($id), $case['id']);
            self::assertSame($case['type'], OrbitId::getType($id), $case['id']);
            self::assertSame($case['node'], OrbitId::getNode($id), $case['id']);
            self::assertSame($case['sequence'], OrbitId::getSequence($id), $case['id']);
            self::assertSame($case['region'], OrbitId::getRegion($id), $case['id']);
            self::assertSame($case['tenant'], OrbitId::getTenant($id), $case['id']);
            self::assertSame($case['reserved'], OrbitId::getReserved($id), $case['id']);
            self::assertTrue(OrbitId::isValid($id), $case['id']);
        }
    }

    public function testRejectFixtures(): void
    {
        foreach ($this->fixture('decode-reject.v2.json')['cases'] as $case) {
            $code = $case['code'] ?? OrbitError::INVALID_DECIMAL;
            if ($code === OrbitError::INVALID_DECIMAL) {
                try {
                    OrbitId::fromDecimalString($case['input']);
                    self::fail("Expected INVALID_DECIMAL for {$case['id']}");
                } catch (OrbitError $error) {
                    self::assertSame(OrbitError::INVALID_DECIMAL, $error->orbitCode, $case['id']);
                }
            } else {
                self::assertSame($case['input'], OrbitId::fromDecimalString($case['input']), $case['id']);
                try {
                    OrbitId::parse($case['input']);
                    self::fail("Expected {$code} for {$case['id']}");
                } catch (OrbitError $error) {
                    self::assertSame($code, $error->orbitCode, $case['id']);
                }
            }
            self::assertFalse(OrbitId::isValid($case['input']), $case['id']);
        }
        self::assertSame('0', OrbitId::fromDecimalString('0'));
    }

    public function testGeneratorFixtures(): void
    {
        $fixture = $this->fixture('generator.v2.json');
        foreach ($fixture['cases'] as $case) {
            $generator = new OrbitGenerator([
                'node' => $case['node'],
                'clockRollbackToleranceMs' => (int) $fixture['defaults']['clockRollbackToleranceMs'],
                'onSequenceExhausted' => 'fail',
                'clock' => static fn(): string => $case['nowTimestamp'],
            ]);
            $generator->restoreState($case['prior']['lastTimestamp'], $case['prior']['sequence']);
            $decision = $generator->decide($case['type'], $case['nowTimestamp']);
            $expected = $case['expect'];

            if ($expected['action'] === 'issue') {
                self::assertSame([
                    'action' => 'issue',
                    'timestamp' => $expected['timestamp'],
                    'sequence' => $expected['sequence'],
                ], $decision, $case['id']);
            } elseif ($expected['action'] === 'wait') {
                self::assertSame([
                    'action' => 'wait',
                    'waitUntilTimestamp' => $expected['waitUntilTimestamp'],
                ], $decision, $case['id']);
            } elseif ($expected['action'] === 'wait_or_fail') {
                self::assertSame('error', $decision['action'], $case['id']);
                self::assertSame($expected['error'], $decision['error'], $case['id']);
            } else {
                self::assertSame([
                    'action' => 'error',
                    'error' => $expected['error'],
                ], $decision, $case['id']);
            }
        }
    }

    public function testGeneratorCanChooseWaitAfterSequenceExhaustion(): void
    {
        $generator = new OrbitGenerator([
            'node' => 7,
            'onSequenceExhausted' => 'wait',
            'clock' => static fn(): int => 1000,
        ]);
        $generator->restoreState(1000, 65535);
        self::assertSame([
            'action' => 'wait_next_ms',
            'fromTimestamp' => '1000',
        ], $generator->decide(1, 1000));
    }

    public function testGenerateHelpers(): void
    {
        $ticks = [1000, 1000, 1001, 1001];
        $index = 0;
        $generator = new OrbitGenerator([
            'node' => 7,
            'region' => 3,
            'tenant' => 1000,
            'onSequenceExhausted' => 'wait',
            'clock' => static function () use (&$ticks, &$index): int {
                $value = $ticks[min($index, count($ticks) - 1)];
                $index++;
                return $value;
            },
        ]);
        self::assertSame(0, $generator->getSequence());
        self::assertSame(3, $generator->region);
        self::assertSame(1000, $generator->tenant);
        $id = $generator->generate(1);
        self::assertNotSame('', $id);
        self::assertGreaterThan('0', $generator->getLastTimestamp());
        self::assertSame(OrbitId::ISSUED_FORMAT_VERSION, OrbitId::getFormatVersion($id));
        self::assertSame(3, OrbitId::getRegion($id));
        self::assertSame(1000, OrbitId::getTenant($id));
        self::assertSame(0, OrbitId::getReserved($id));

        $waitIndex = 0;
        $waitTicks = [1000, 1000, 1001, 1001];
        $waiter = new OrbitGenerator([
            'node' => 7,
            'onSequenceExhausted' => 'wait',
            'clock' => static function () use (&$waitTicks, &$waitIndex): int {
                $value = $waitTicks[min($waitIndex, count($waitTicks) - 1)];
                $waitIndex++;
                return $value;
            },
        ]);
        $waiter->restoreState(1000, 65535);
        self::assertNotSame('', $waiter->generate(1));
        self::assertSame('1001', (string) $waiter->getLastTimestamp());

        $sample = '21268914460260752812362294599660601344';
        self::assertSame('16762354567', OrbitId::getTimestamp($sample));
        self::assertSame(2, OrbitId::getType($sample));
        self::assertSame(7, OrbitId::getNode($sample));
        self::assertSame(42, OrbitId::getSequence($sample));
        self::assertSame(0, OrbitId::getRegion($sample));
        self::assertSame(0, OrbitId::getTenant($sample));
        self::assertTrue(OrbitId::isValid($sample));
        self::assertSame($sample, OrbitId::toDecimalString($sample));
        self::assertSame($sample, OrbitId::fromDecimalString($sample));
        $unix = OrbitId::toUnixTimeMs(0);
        self::assertSame('0', OrbitId::fromUnixTimeMs($unix));
        self::assertIsCallable(OrbitGenerator::systemClock());

        $lost = new OrbitGenerator([
            'node' => 1,
            'clock' => static fn(): int => 5,
            'confirmOwnership' => static fn(): bool => false,
        ]);
        $this->expectException(OrbitError::class);
        $lost->generate(1);
    }

    public function testEncodeRejectsInvalidFields(): void
    {
        $base = [
            'formatVersion' => OrbitId::ISSUED_FORMAT_VERSION,
            'timestamp' => '0',
            'type' => 1,
            'node' => 7,
            'sequence' => 0,
            'region' => 0,
            'tenant' => 0,
            'reserved' => 0,
        ];

        foreach (['formatVersion', 'timestamp', 'type', 'node', 'sequence', 'region', 'tenant', 'reserved'] as $missing) {
            $fields = $base;
            unset($fields[$missing]);
            try {
                OrbitId::encode($fields);
                self::fail("expected missing field error for {$missing}");
            } catch (\InvalidArgumentException $error) {
                self::assertStringContainsString($missing, $error->getMessage());
            }
        }

        $this->assertOrbitError(OrbitError::INVALID_FORMAT_VERSION, fn() => OrbitId::encode(['formatVersion' => 2] + $base));
        $this->assertOrbitError(OrbitError::INVALID_TYPE, fn() => OrbitId::encode(['type' => 65536] + $base));
        $this->assertOrbitError(OrbitError::INVALID_TYPE, fn() => OrbitId::encode(['type' => -1] + $base));
        $this->assertOrbitError(OrbitError::INVALID_NODE, fn() => OrbitId::encode(['node' => 65536] + $base));
        $this->assertOrbitError(OrbitError::INVALID_SEQUENCE, fn() => OrbitId::encode(['sequence' => 65536] + $base));
        $this->assertOrbitError(OrbitError::INVALID_REGION, fn() => OrbitId::encode(['region' => 16] + $base));
        $this->assertOrbitError(OrbitError::INVALID_TENANT, fn() => OrbitId::encode(['tenant' => 65536] + $base));
        $this->assertOrbitError(OrbitError::INVALID_RESERVED, fn() => OrbitId::encode(['reserved' => 1] + $base));
        $this->assertOrbitError(OrbitError::INVALID_TIMESTAMP, fn() => OrbitId::encode(['timestamp' => '281474976710656'] + $base));
        $this->assertOrbitError(OrbitError::INVALID_TIMESTAMP, fn() => OrbitId::encode(['timestamp' => '-1'] + $base));
    }

    public function testDecodeRejectsUnknownFormatVersionAndNonZeroReserved(): void
    {
        // formatVersion = 0 at bit 124, everything else zero.
        $this->assertOrbitError(OrbitError::INVALID_FORMAT_VERSION, fn() => OrbitId::decode('0'));

        $unknownVersion = \OrbitId\Decimal::shiftLeft('2', OrbitId::FORMAT_VERSION_SHIFT);
        $this->assertOrbitError(OrbitError::INVALID_FORMAT_VERSION, fn() => OrbitId::decode($unknownVersion));

        $nonZeroReserved = \OrbitId\Decimal::add(
            \OrbitId\Decimal::shiftLeft((string) OrbitId::ISSUED_FORMAT_VERSION, OrbitId::FORMAT_VERSION_SHIFT),
            '1',
        );
        $this->assertOrbitError(OrbitError::INVALID_RESERVED, fn() => OrbitId::decode($nonZeroReserved));
        self::assertFalse(OrbitId::isValid($nonZeroReserved));
    }

    public function testGeneratorRejectsInvalidRegionTenant(): void
    {
        $this->assertOrbitError(OrbitError::INVALID_REGION, fn() => new OrbitGenerator(['node' => 1, 'region' => 16]));
        $this->assertOrbitError(OrbitError::INVALID_TENANT, fn() => new OrbitGenerator(['node' => 1, 'tenant' => 65536]));
        $ok = new OrbitGenerator(['node' => 1]);
        self::assertSame(0, $ok->region);
        self::assertSame(0, $ok->tenant);
    }

    public function testIdRejectsNonStringNonIntAndNegativeInt(): void
    {
        $this->assertOrbitError(OrbitError::INVALID_DECIMAL, fn() => OrbitId::toDecimalString(-1));
        self::assertSame('7', OrbitId::toDecimalString(7));
    }

    private function assertOrbitError(string $code, callable $fn): void
    {
        try {
            $fn();
            self::fail("expected {$code}");
        } catch (OrbitError $error) {
            self::assertSame($code, $error->orbitCode);
        }
    }

    /** @return array<string, mixed> */
    private function fixture(string $name): array
    {
        $path = dirname(__DIR__, 3) . '/spec/conformance/' . $name;
        $fixture = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($fixture);
        return $fixture;
    }
}

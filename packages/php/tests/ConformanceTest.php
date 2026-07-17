<?php

declare(strict_types=1);

namespace OrbitId\Tests;

use OrbitId\OrbitError;
use OrbitId\OrbitGenerator;
use OrbitId\OrbitId;
use PHPUnit\Framework\TestCase;

final class ConformanceTest extends TestCase
{
    public function testEncodeDecodeFixtures(): void
    {
        foreach ($this->fixture('encode-decode.v1.json')['cases'] as $case) {
            $fields = [
                'timestamp' => $case['timestamp'],
                'type' => $case['type'],
                'node' => $case['node'],
                'sequence' => $case['sequence'],
            ];
            $id = OrbitId::encode($fields);

            self::assertSame($case['idDecimal'], $id, $case['id']);
            self::assertSame(strtolower($case['idHex']), OrbitId::toHexString($id), $case['id']);
            self::assertSame($fields, OrbitId::decode($id), $case['id']);
            self::assertSame($fields, OrbitId::parse($case['idDecimal']), $case['id']);
            self::assertSame($case['timestamp'], OrbitId::getTimestamp($id), $case['id']);
            self::assertSame($case['type'], OrbitId::getType($id), $case['id']);
            self::assertSame($case['node'], OrbitId::getNode($id), $case['id']);
            self::assertSame($case['sequence'], OrbitId::getSequence($id), $case['id']);
            self::assertTrue(OrbitId::isValid($id), $case['id']);
        }
    }

    public function testRejectFixtures(): void
    {
        foreach ($this->fixture('decode-reject.v1.json')['cases'] as $case) {
            try {
                OrbitId::fromDecimalString($case['input']);
                self::fail("Expected INVALID_DECIMAL for {$case['id']}");
            } catch (OrbitError $error) {
                self::assertSame(OrbitError::INVALID_DECIMAL, $error->orbitCode, $case['id']);
            }
            self::assertFalse(OrbitId::isValid($case['input']), $case['id']);
        }
        self::assertSame('0', OrbitId::fromDecimalString('0'));
    }

    public function testGeneratorFixtures(): void
    {
        $fixture = $this->fixture('generator.v1.json');
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
        $generator->restoreState(1000, 1023);
        self::assertSame([
            'action' => 'wait_next_ms',
            'fromTimestamp' => '1000',
        ], $generator->decide(1, 1000));
    }

    public function testGenerateHelpersAndFunctions(): void
    {
        $ticks = [1000, 1000, 1001, 1001];
        $index = 0;
        $generator = new OrbitGenerator([
            'node' => 7,
            'onSequenceExhausted' => 'wait',
            'clock' => static function () use (&$ticks, &$index): int {
                $value = $ticks[min($index, count($ticks) - 1)];
                $index++;
                return $value;
            },
        ]);
        self::assertSame(0, $generator->getSequence());
        $id = $generator->generate(1);
        self::assertNotSame('', $id);
        self::assertGreaterThan('0', $generator->getLastTimestamp());

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
        $waiter->restoreState(1000, 1023);
        self::assertNotSame('', $waiter->generate(1));
        self::assertSame('1001', (string) $waiter->getLastTimestamp());

        $sample = '140612821619842090';
        self::assertSame('16762354567', \OrbitId\getTimestamp($sample));
        self::assertSame(2, \OrbitId\getType($sample));
        self::assertSame(7, \OrbitId\getNode($sample));
        self::assertSame(42, \OrbitId\getSequence($sample));
        self::assertTrue(\OrbitId\isValid($sample));
        self::assertSame($sample, \OrbitId\toDecimalString($sample));
        self::assertSame($sample, \OrbitId\fromDecimalString($sample));
        self::assertSame(strtolower(OrbitId::toHexString($sample)), \OrbitId\toHexString($sample));
        self::assertSame(OrbitId::decode($sample), \OrbitId\decode($sample));
        self::assertSame(OrbitId::parse($sample), \OrbitId\parse($sample));
        self::assertSame(OrbitId::encode([
            'timestamp' => '16762354567',
            'type' => 2,
            'node' => 7,
            'sequence' => 42,
        ]), \OrbitId\encode([
            'timestamp' => '16762354567',
            'type' => 2,
            'node' => 7,
            'sequence' => 42,
        ]));
        $unix = \OrbitId\toUnixTimeMs(0);
        self::assertSame('0', \OrbitId\fromUnixTimeMs($unix));
        self::assertIsCallable(\OrbitId\systemOrbitClock());

        $lost = new OrbitGenerator([
            'node' => 1,
            'clock' => static fn(): int => 5,
            'confirmOwnership' => static fn(): bool => false,
        ]);
        $this->expectException(OrbitError::class);
        $lost->generate(1);
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

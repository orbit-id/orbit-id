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

    /** @return array<string, mixed> */
    private function fixture(string $name): array
    {
        $path = dirname(__DIR__, 3) . '/spec/conformance/' . $name;
        $fixture = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
        self::assertIsArray($fixture);
        return $fixture;
    }
}

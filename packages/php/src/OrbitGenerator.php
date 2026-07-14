<?php

declare(strict_types=1);

namespace OrbitId;

/**
 * Synchronous generator for one exclusively assigned Orbit node.
 *
 * PHP request execution is single-threaded, but a re-entrancy guard protects
 * callback-driven use. Do not share one node between independent processes.
 */
final class OrbitGenerator
{
    public readonly int $node;
    private \Closure $clock;
    private int $clockRollbackToleranceMs;
    private string $onSequenceExhausted;
    private ?\Closure $confirmOwnership;
    private ?string $lastTimestamp = null;
    private int $sequence = 0;
    private bool $generating = false;

    /**
     * @param array{
     *   node: int,
     *   clock?: callable(): string|int,
     *   clockRollbackToleranceMs?: int,
     *   onSequenceExhausted?: 'wait'|'fail',
     *   confirmOwnership?: callable(): bool
     * } $options
     */
    public function __construct(array $options)
    {
        $node = $options['node'] ?? null;
        if (!is_int($node) || $node < 0 || $node > OrbitId::MAX_NODE) {
            throw new OrbitError(OrbitError::INVALID_NODE, 'node out of range');
        }
        $this->node = $node;

        $clock = $options['clock'] ?? self::systemClock();
        if (!is_callable($clock)) {
            throw new \InvalidArgumentException('clock must be callable');
        }
        $this->clock = \Closure::fromCallable($clock);

        $tolerance = $options['clockRollbackToleranceMs'] ?? OrbitId::DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS;
        if (!is_int($tolerance) || $tolerance < 0) {
            throw new OrbitError(OrbitError::INVALID_TIMESTAMP, 'clock rollback tolerance must be non-negative');
        }
        $this->clockRollbackToleranceMs = $tolerance;

        $mode = $options['onSequenceExhausted'] ?? 'wait';
        if ($mode !== 'wait' && $mode !== 'fail') {
            throw new OrbitError(OrbitError::INVALID_SEQUENCE, 'invalid sequence exhaustion mode');
        }
        $this->onSequenceExhausted = $mode;

        $ownership = $options['confirmOwnership'] ?? null;
        if ($ownership !== null && !is_callable($ownership)) {
            throw new \InvalidArgumentException('confirmOwnership must be callable');
        }
        $this->confirmOwnership = $ownership === null ? null : \Closure::fromCallable($ownership);
    }

    /** @return callable(): int */
    public static function systemClock(): callable
    {
        return static fn(): int => (int) floor(microtime(true) * 1000) - (int) OrbitId::ORBIT_EPOCH_UNIX_MS;
    }

    public function getLastTimestamp(): string
    {
        return $this->lastTimestamp ?? '0';
    }

    public function getSequence(): int
    {
        return $this->sequence;
    }

    /** @param string|int $lastTimestamp */
    public function restoreState(string|int $lastTimestamp, int $sequence): void
    {
        $this->lastTimestamp = OrbitId::timestamp($lastTimestamp);
        if ($sequence < 0 || $sequence > OrbitId::MAX_SEQUENCE) {
            throw new OrbitError(OrbitError::INVALID_SEQUENCE, "sequence out of range: {$sequence}");
        }
        $this->sequence = $sequence;
    }

    /**
     * Evaluates the next safe generation step without mutating generator state.
     *
     * @param int $type
     * @param string|int|null $nowTimestamp
     * @return array{action: 'issue', timestamp: string, sequence: int}|array{action: 'wait', waitUntilTimestamp: string}|array{action: 'wait_next_ms', fromTimestamp: string}|array{action: 'error', error: string}
     */
    public function decide(int $type, string|int|null $nowTimestamp = null): array
    {
        if ($this->confirmOwnership !== null && !($this->confirmOwnership)()) {
            return ['action' => 'error', 'error' => OrbitError::NODE_OWNERSHIP_LOST];
        }
        if ($type < 1 || $type > OrbitId::MAX_TYPE) {
            return ['action' => 'error', 'error' => OrbitError::INVALID_TYPE];
        }

        try {
            $now = OrbitId::timestamp($nowTimestamp ?? ($this->clock)());
        } catch (OrbitError) {
            return ['action' => 'error', 'error' => OrbitError::INVALID_TIMESTAMP];
        }

        if ($this->lastTimestamp === null) {
            return ['action' => 'issue', 'timestamp' => $now, 'sequence' => 0];
        }
        $comparison = Decimal::compare($now, $this->lastTimestamp);
        if ($comparison < 0) {
            $delta = Decimal::subtract($this->lastTimestamp, $now);
            if (Decimal::compare($delta, (string) $this->clockRollbackToleranceMs) <= 0) {
                return ['action' => 'wait', 'waitUntilTimestamp' => $this->lastTimestamp];
            }
            return ['action' => 'error', 'error' => OrbitError::CLOCK_ROLLBACK];
        }
        if ($comparison === 0) {
            if ($this->sequence >= OrbitId::MAX_SEQUENCE) {
                if ($this->onSequenceExhausted === 'fail') {
                    return ['action' => 'error', 'error' => OrbitError::SEQUENCE_EXHAUSTED];
                }
                return ['action' => 'wait_next_ms', 'fromTimestamp' => $this->lastTimestamp];
            }
            return ['action' => 'issue', 'timestamp' => $now, 'sequence' => $this->sequence + 1];
        }

        return ['action' => 'issue', 'timestamp' => $now, 'sequence' => 0];
    }

    /** @return string Canonical unsigned decimal Orbit ID. */
    public function generate(int $type): string
    {
        if ($this->generating) {
            throw new OrbitError(OrbitError::INVALID_NODE, 're-entrant generate is not supported');
        }
        $this->generating = true;
        try {
            while (true) {
                $decision = $this->decide($type);
                if ($decision['action'] === 'issue') {
                    $id = OrbitId::encode([
                        'timestamp' => $decision['timestamp'],
                        'type' => $type,
                        'node' => $this->node,
                        'sequence' => $decision['sequence'],
                    ]);
                    $this->lastTimestamp = $decision['timestamp'];
                    $this->sequence = $decision['sequence'];
                    return $id;
                }
                if ($decision['action'] === 'error') {
                    throw new OrbitError($decision['error'], "generate failed: {$decision['error']}");
                }

                $target = $decision['action'] === 'wait'
                    ? $decision['waitUntilTimestamp']
                    : $decision['fromTimestamp'];
                $strictlyGreater = $decision['action'] === 'wait_next_ms';
                $this->waitUntil($target, $strictlyGreater);
            }
        } finally {
            $this->generating = false;
        }
    }

    private function waitUntil(string $target, bool $strictlyGreater): void
    {
        $deadline = microtime(true) + 30;
        do {
            try {
                $now = OrbitId::timestamp(($this->clock)());
            } catch (OrbitError) {
                $now = '0';
            }
            $comparison = Decimal::compare($now, $target);
            if ($comparison > 0 || (!$strictlyGreater && $comparison === 0)) {
                return;
            }
            if (microtime(true) > $deadline) {
                throw new OrbitError(OrbitError::CLOCK_ROLLBACK, 'timed out waiting for clock to advance');
            }
            usleep(1_000);
        } while (true);
    }
}

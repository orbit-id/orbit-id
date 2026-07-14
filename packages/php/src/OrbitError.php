<?php

declare(strict_types=1);

namespace OrbitId;

final class OrbitError extends \RuntimeException
{
    public const INVALID_TYPE = 'INVALID_TYPE';
    public const INVALID_NODE = 'INVALID_NODE';
    public const INVALID_SEQUENCE = 'INVALID_SEQUENCE';
    public const INVALID_TIMESTAMP = 'INVALID_TIMESTAMP';
    public const INVALID_DECIMAL = 'INVALID_DECIMAL';
    public const CLOCK_ROLLBACK = 'CLOCK_ROLLBACK';
    public const SEQUENCE_EXHAUSTED = 'SEQUENCE_EXHAUSTED';
    public const NODE_OWNERSHIP_LOST = 'NODE_OWNERSHIP_LOST';

    public readonly string $orbitCode;

    public function __construct(string $orbitCode, string $message)
    {
        $this->orbitCode = $orbitCode;
        parent::__construct($orbitCode . ': ' . $message);
    }
}

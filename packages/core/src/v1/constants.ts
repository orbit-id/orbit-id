export const ORBIT_EPOCH_UNIX_MS = 1767225600000n;
export const TIMESTAMP_BITS = 41n;
export const TYPE_BITS = 6n;
export const NODE_BITS = 7n;
export const SEQUENCE_BITS = 10n;

export const TIMESTAMP_SHIFT = 23n;
export const TYPE_SHIFT = 17n;
export const NODE_SHIFT = 10n;

export const TIMESTAMP_MASK = (1n << TIMESTAMP_BITS) - 1n;
export const TYPE_MASK = (1n << TYPE_BITS) - 1n;
export const NODE_MASK = (1n << NODE_BITS) - 1n;
export const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n;

export const MAX_TIMESTAMP = TIMESTAMP_MASK;
export const MAX_TYPE = Number(TYPE_MASK);
export const MAX_NODE = Number(NODE_MASK);
export const MAX_SEQUENCE = Number(SEQUENCE_MASK);

export const DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS = 5000n;

export const U64_MAX = (1n << 64n) - 1n;

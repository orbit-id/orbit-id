/** Same Orbit Epoch as v1. */
export { ORBIT_EPOCH_UNIX_MS, DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS } from "../v1/constants.js";

export const FORMAT_VERSION_BITS = 4n;
export const TIMESTAMP_BITS = 48n;
export const TYPE_BITS = 16n;
export const NODE_BITS = 16n;
export const SEQUENCE_BITS = 16n;
export const REGION_BITS = 4n;
export const TENANT_BITS = 16n;
export const RESERVED_BITS = 8n;

export const FORMAT_VERSION_SHIFT = 124n;
export const TIMESTAMP_SHIFT = 76n;
export const TYPE_SHIFT = 60n;
export const NODE_SHIFT = 44n;
export const SEQUENCE_SHIFT = 28n;
export const REGION_SHIFT = 24n;
export const TENANT_SHIFT = 8n;

export const FORMAT_VERSION_MASK = (1n << FORMAT_VERSION_BITS) - 1n;
export const TIMESTAMP_MASK = (1n << TIMESTAMP_BITS) - 1n;
export const TYPE_MASK = (1n << TYPE_BITS) - 1n;
export const NODE_MASK = (1n << NODE_BITS) - 1n;
export const SEQUENCE_MASK = (1n << SEQUENCE_BITS) - 1n;
export const REGION_MASK = (1n << REGION_BITS) - 1n;
export const TENANT_MASK = (1n << TENANT_BITS) - 1n;
export const RESERVED_MASK = (1n << RESERVED_BITS) - 1n;

export const MAX_TIMESTAMP = TIMESTAMP_MASK;
export const MAX_TYPE = Number(TYPE_MASK);
export const MAX_NODE = Number(NODE_MASK);
export const MAX_SEQUENCE = Number(SEQUENCE_MASK);
export const MAX_REGION = Number(REGION_MASK);
export const MAX_TENANT = Number(TENANT_MASK);
export const MAX_RESERVED = Number(RESERVED_MASK);

/** Issued Orbit ID v2 values MUST use FormatVersion = 1. */
export const ISSUED_FORMAT_VERSION = 1;

export const U128_MAX = (1n << 128n) - 1n;

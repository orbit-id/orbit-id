/**
 * Language package surface for TypeScript consumers.
 * Implementation lives in `@orbit-id/core`.
 */
export {
  DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS,
  MAX_NODE,
  MAX_SEQUENCE,
  MAX_TIMESTAMP,
  MAX_TYPE,
  ORBIT_EPOCH_UNIX_MS,
  OrbitError,
  OrbitGenerator,
  decode,
  encode,
  fromDecimalString,
  fromUnixTimeMs,
  getNode,
  getSequence,
  getTimestamp,
  getType,
  isValid,
  parse,
  systemOrbitClock,
  toDecimalString,
  toHexString,
  toUnixTimeMs,
} from "@orbit-id/core";

export type {
  GenerateDecision,
  GeneratorOptions,
  OrbitClock,
  OrbitErrorCode,
  OrbitFields,
  SequenceExhaustedMode,
} from "@orbit-id/core";

/**
 * Language package surface for TypeScript consumers.
 * Implementation lives in `@orbit-id/core`.
 *
 * - Default export: Orbit ID v1 (stable)
 * - `v2` namespace / `@orbit-id/typescript/v2`: Orbit ID v2 Draft
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

export * as v2 from "./v2/index.js";

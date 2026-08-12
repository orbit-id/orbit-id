/**
 * Language package surface for TypeScript consumers.
 * Implementation lives in `@orbit-id/core`.
 *
 * - Default export: Orbit ID v1 (until slice C flips the root with core)
 * - `v2` namespace / `@orbit-id/typescript/v2`: Orbit ID v2
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
} from "@orbit-id/core/v1";

export type {
  GenerateDecision,
  GeneratorOptions,
  OrbitClock,
  OrbitErrorCode,
  OrbitFields,
  SequenceExhaustedMode,
} from "@orbit-id/core/v1";

export * as v2 from "./v2/index.js";

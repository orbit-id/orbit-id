/**
 * Language package surface for TypeScript consumers.
 * Implementation lives in `@orbit-id/core`.
 *
 * - Default export: Orbit ID v2 (Stable 128-bit)
 * - `v1` / `@orbit-id/typescript/v1`: Orbit ID v1 (64-bit)
 * - `v2` / `@orbit-id/typescript/v2`: alias of the root (v2)
 */
export {
  DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS,
  FORMAT_VERSION_BITS,
  ISSUED_FORMAT_VERSION,
  MAX_NODE,
  MAX_REGION,
  MAX_RESERVED,
  MAX_SEQUENCE,
  MAX_TENANT,
  MAX_TIMESTAMP,
  MAX_TYPE,
  ORBIT_EPOCH_UNIX_MS,
  OrbitError,
  OrbitGeneratorV2,
  U128_MAX,
  decode,
  encode,
  fromDecimalString,
  fromUnixTimeMs,
  getFormatVersion,
  getNode,
  getRegion,
  getReserved,
  getSequence,
  getTenant,
  getTimestamp,
  getType,
  isValid,
  parse,
  systemOrbitClock,
  toDecimalString,
  toHexString,
  toBase64UrlString,
  fromBase64UrlString,
  toUnixTimeMs,
} from "@orbit-id/core";

export type {
  GenerateDecisionV2 as GenerateDecision,
  GeneratorOptionsV2 as GeneratorOptions,
  OrbitClock,
  OrbitErrorCode,
  OrbitFieldsV2 as OrbitFields,
  OrbitFieldsV2Encode as OrbitFieldsEncode,
  SequenceExhaustedMode,
} from "@orbit-id/core";

export * as v1 from "./v1/index.js";
export * as v2 from "./v2/index.js";

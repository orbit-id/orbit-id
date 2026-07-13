export type OrbitErrorCode =
  | "INVALID_TYPE"
  | "INVALID_NODE"
  | "INVALID_SEQUENCE"
  | "INVALID_TIMESTAMP"
  | "INVALID_DECIMAL"
  | "CLOCK_ROLLBACK"
  | "SEQUENCE_EXHAUSTED"
  | "NODE_OWNERSHIP_LOST";

export class OrbitError extends Error {
  readonly code: OrbitErrorCode;

  constructor(code: OrbitErrorCode, message: string) {
    super(message);
    this.name = "OrbitError";
    this.code = code;
  }
}

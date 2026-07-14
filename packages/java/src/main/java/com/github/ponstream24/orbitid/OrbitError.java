package com.github.ponstream24.orbitid;

/** Exception raised when an Orbit ID value or generator operation is invalid. */
public final class OrbitError extends RuntimeException {
    public static final String INVALID_TYPE = "INVALID_TYPE";
    public static final String INVALID_NODE = "INVALID_NODE";
    public static final String INVALID_SEQUENCE = "INVALID_SEQUENCE";
    public static final String INVALID_TIMESTAMP = "INVALID_TIMESTAMP";
    public static final String INVALID_DECIMAL = "INVALID_DECIMAL";
    public static final String CLOCK_ROLLBACK = "CLOCK_ROLLBACK";
    public static final String SEQUENCE_EXHAUSTED = "SEQUENCE_EXHAUSTED";
    public static final String NODE_OWNERSHIP_LOST = "NODE_OWNERSHIP_LOST";

    /** Stable machine-readable code matching the TypeScript implementation. */
    public final String code;

    public OrbitError(String code, String message) {
        super(message);
        this.code = code;
    }

    public String getCode() {
        return code;
    }
}

package com.github.ponstream24.orbitid;

/** Behavior when all 1,024 sequence values have been issued in one millisecond. */
public enum SequenceExhaustedMode {
    WAIT,
    FAIL
}

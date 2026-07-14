package com.github.ponstream24.orbitid;

import java.util.Objects;
import java.util.function.BooleanSupplier;

/** Immutable configuration for {@link OrbitGenerator}. */
public final class GeneratorOptions {
    private final int node;
    private final OrbitClock clock;
    private final long clockRollbackToleranceMs;
    private final SequenceExhaustedMode onSequenceExhausted;
    private final BooleanSupplier confirmOwnership;

    private GeneratorOptions(Builder builder) {
        this.node = builder.node;
        this.clock = builder.clock;
        this.clockRollbackToleranceMs = builder.clockRollbackToleranceMs;
        this.onSequenceExhausted = builder.onSequenceExhausted;
        this.confirmOwnership = builder.confirmOwnership;
    }

    public int node() {
        return node;
    }

    public OrbitClock clock() {
        return clock;
    }

    public long clockRollbackToleranceMs() {
        return clockRollbackToleranceMs;
    }

    public SequenceExhaustedMode onSequenceExhausted() {
        return onSequenceExhausted;
    }

    public BooleanSupplier confirmOwnership() {
        return confirmOwnership;
    }

    public static Builder builder(int node) {
        return new Builder(node);
    }

    public static final class Builder {
        private final int node;
        private OrbitClock clock;
        private long clockRollbackToleranceMs = OrbitId.DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS;
        private SequenceExhaustedMode onSequenceExhausted = SequenceExhaustedMode.WAIT;
        private BooleanSupplier confirmOwnership;

        private Builder(int node) {
            this.node = node;
        }

        public Builder clock(OrbitClock clock) {
            this.clock = Objects.requireNonNull(clock, "clock");
            return this;
        }

        public Builder clockRollbackToleranceMs(long toleranceMs) {
            this.clockRollbackToleranceMs = toleranceMs;
            return this;
        }

        public Builder onSequenceExhausted(SequenceExhaustedMode mode) {
            this.onSequenceExhausted = Objects.requireNonNull(mode, "onSequenceExhausted");
            return this;
        }

        public Builder confirmOwnership(BooleanSupplier callback) {
            this.confirmOwnership = Objects.requireNonNull(callback, "confirmOwnership");
            return this;
        }

        public GeneratorOptions build() {
            return new GeneratorOptions(this);
        }
    }
}

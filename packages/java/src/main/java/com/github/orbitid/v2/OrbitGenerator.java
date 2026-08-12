package com.github.orbitid.v2;

import com.github.orbitid.GenerateDecision;
import com.github.orbitid.GeneratorOptions;
import com.github.orbitid.OrbitClock;
import com.github.orbitid.OrbitError;
import com.github.orbitid.SequenceExhaustedMode;

import java.math.BigInteger;
import java.util.Objects;
import java.util.function.BooleanSupplier;
import java.util.function.LongPredicate;

/** Thread-safe Orbit ID v2 generator for one node. */
public final class OrbitGenerator {
    private final int node;
    private final int region;
    private final int tenant;
    private final OrbitClock clock;
    private final long clockRollbackToleranceMs;
    private final SequenceExhaustedMode onSequenceExhausted;
    private final BooleanSupplier confirmOwnership;

    private long lastTimestamp = -1;
    private int sequence;

    public OrbitGenerator(int node) {
        this(GeneratorOptions.builder(node).build());
    }

    public OrbitGenerator(GeneratorOptions options) {
        Objects.requireNonNull(options, "options");
        OrbitId.validateNode(options.node());
        OrbitId.validateRegion(options.region());
        OrbitId.validateTenant(options.tenant());
        this.node = options.node();
        this.region = options.region();
        this.tenant = options.tenant();
        this.clock = options.clock() == null ? systemOrbitClock() : options.clock();
        this.clockRollbackToleranceMs = options.clockRollbackToleranceMs();
        this.onSequenceExhausted = options.onSequenceExhausted();
        this.confirmOwnership = options.confirmOwnership();
    }

    public static OrbitClock systemOrbitClock() {
        return () -> System.currentTimeMillis() - OrbitId.ORBIT_EPOCH_UNIX_MS;
    }

    public int getNode() {
        return node;
    }

    public int getRegion() {
        return region;
    }

    public int getTenant() {
        return tenant;
    }

    public synchronized long getLastTimestamp() {
        return lastTimestamp < 0 ? 0 : lastTimestamp;
    }

    public synchronized int getSequence() {
        return sequence;
    }

    /** Seeds generator state after a restart. */
    public synchronized void restoreState(long lastTimestamp, int sequence) {
        OrbitId.validateTimestamp(lastTimestamp);
        OrbitId.validateSequence(sequence);
        this.lastTimestamp = lastTimestamp;
        this.sequence = sequence;
    }

    /** Returns the next action without changing generator state. */
    public synchronized GenerateDecision decide(int type) {
        return decide(type, clock.currentOrbitTimestampMs());
    }

    /** Returns the next action for a supplied Orbit timestamp without changing state. */
    public synchronized GenerateDecision decide(int type, long nowTimestamp) {
        if (confirmOwnership != null && !confirmOwnership.getAsBoolean()) {
            return new GenerateDecision.Error(OrbitError.NODE_OWNERSHIP_LOST);
        }
        if (type < 1 || type > OrbitId.MAX_TYPE) {
            return new GenerateDecision.Error(OrbitError.INVALID_TYPE);
        }
        if (nowTimestamp < 0 || nowTimestamp > OrbitId.MAX_TIMESTAMP) {
            return new GenerateDecision.Error(OrbitError.INVALID_TIMESTAMP);
        }
        if (lastTimestamp < 0) {
            return new GenerateDecision.Issue(nowTimestamp, 0);
        }
        if (nowTimestamp < lastTimestamp) {
            if (lastTimestamp - nowTimestamp <= clockRollbackToleranceMs) {
                return new GenerateDecision.Wait(lastTimestamp);
            }
            return new GenerateDecision.Error(OrbitError.CLOCK_ROLLBACK);
        }
        if (nowTimestamp == lastTimestamp) {
            if (sequence >= OrbitId.MAX_SEQUENCE) {
                return onSequenceExhausted == SequenceExhaustedMode.FAIL
                        ? new GenerateDecision.Error(OrbitError.SEQUENCE_EXHAUSTED)
                        : new GenerateDecision.WaitNextMs(lastTimestamp);
            }
            return new GenerateDecision.Issue(nowTimestamp, sequence + 1);
        }
        return new GenerateDecision.Issue(nowTimestamp, 0);
    }

    /**
     * Issues an ID. This method is synchronized, so a generator instance never
     * issues duplicate sequence values when shared across threads.
     */
    public synchronized BigInteger generate(int type) {
        for (;;) {
            GenerateDecision decision = decide(type);
            if (decision instanceof GenerateDecision.Issue) {
                GenerateDecision.Issue issue = (GenerateDecision.Issue) decision;
                BigInteger id = OrbitId.encode(
                        OrbitId.ISSUED_FORMAT_VERSION,
                        issue.timestamp(),
                        type,
                        node,
                        issue.sequence(),
                        region,
                        tenant,
                        0);
                lastTimestamp = issue.timestamp();
                sequence = issue.sequence();
                return id;
            }
            if (decision instanceof GenerateDecision.Wait) {
                GenerateDecision.Wait wait = (GenerateDecision.Wait) decision;
                waitUntil(timestamp -> timestamp >= wait.waitUntilTimestamp());
                continue;
            }
            if (decision instanceof GenerateDecision.WaitNextMs) {
                GenerateDecision.WaitNextMs waitNextMs = (GenerateDecision.WaitNextMs) decision;
                waitUntil(timestamp -> timestamp > waitNextMs.fromTimestamp());
                continue;
            }
            GenerateDecision.Error error = (GenerateDecision.Error) decision;
            throw new OrbitError(error.error(), "generate failed: " + error.error());
        }
    }

    private void waitUntil(LongPredicate predicate) {
        long startNanos = System.nanoTime();
        while (!predicate.test(clock.currentOrbitTimestampMs())) {
            if (System.nanoTime() - startNanos > 30_000_000_000L) {
                throw new OrbitError(OrbitError.CLOCK_ROLLBACK, "timed out waiting for clock to advance");
            }
            Thread.onSpinWait();
        }
    }
}

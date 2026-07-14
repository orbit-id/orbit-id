package com.github.ponstream24.orbitid;

/** Supplies milliseconds elapsed since the Orbit epoch. */
@FunctionalInterface
public interface OrbitClock {
    long currentOrbitTimestampMs();
}

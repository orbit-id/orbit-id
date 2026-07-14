package com.github.orbitid;

/**
 * Codec and field accessors for Orbit ID v1.
 *
 * <p>IDs are stored in a Java {@code long} as an unsigned 64-bit bit pattern.
 * Use {@link #toDecimalString(long)} when an unsigned decimal representation is required.</p>
 */
public final class OrbitId {
    public static final long ORBIT_EPOCH_UNIX_MS = 1_767_225_600_000L;
    public static final int TIMESTAMP_BITS = 41;
    public static final int TYPE_BITS = 6;
    public static final int NODE_BITS = 7;
    public static final int SEQUENCE_BITS = 10;
    public static final int TIMESTAMP_SHIFT = 23;
    public static final int TYPE_SHIFT = 17;
    public static final int NODE_SHIFT = 10;
    public static final long MAX_TIMESTAMP = (1L << TIMESTAMP_BITS) - 1;
    public static final int MAX_TYPE = (1 << TYPE_BITS) - 1;
    public static final int MAX_NODE = (1 << NODE_BITS) - 1;
    public static final int MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;
    public static final long DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS = 5_000L;

    private static final long TIMESTAMP_MASK = MAX_TIMESTAMP;
    private static final long TYPE_MASK = MAX_TYPE;
    private static final long NODE_MASK = MAX_NODE;
    private static final long SEQUENCE_MASK = MAX_SEQUENCE;

    private OrbitId() {
    }

    public static long encode(OrbitFields fields) {
        return encode(fields.timestamp(), fields.type(), fields.node(), fields.sequence());
    }

    public static long encode(long timestamp, int type, int node, int sequence) {
        validateTimestamp(timestamp);
        validateType(type);
        validateNode(node);
        validateSequence(sequence);
        return (timestamp << TIMESTAMP_SHIFT)
                | ((long) type << TYPE_SHIFT)
                | ((long) node << NODE_SHIFT)
                | sequence;
    }

    public static OrbitFields decode(long id) {
        return new OrbitFields(
                (id >>> TIMESTAMP_SHIFT) & TIMESTAMP_MASK,
                (int) ((id >>> TYPE_SHIFT) & TYPE_MASK),
                (int) ((id >>> NODE_SHIFT) & NODE_MASK),
                (int) (id & SEQUENCE_MASK)
        );
    }

    public static OrbitFields parse(long id) {
        return decode(id);
    }

    public static OrbitFields parse(String id) {
        return decode(fromDecimalString(id));
    }

    public static long getTimestamp(long id) {
        return decode(id).timestamp();
    }

    public static long getTimestamp(String id) {
        return parse(id).timestamp();
    }

    public static int getType(long id) {
        return decode(id).type();
    }

    public static int getType(String id) {
        return parse(id).type();
    }

    public static int getNode(long id) {
        return decode(id).node();
    }

    public static int getNode(String id) {
        return parse(id).node();
    }

    public static int getSequence(long id) {
        return decode(id).sequence();
    }

    public static int getSequence(String id) {
        return parse(id).sequence();
    }

    public static boolean isValid(long id) {
        return true; // Every long is a valid unsigned 64-bit ID bit pattern.
    }

    public static boolean isValid(String id) {
        try {
            fromDecimalString(id);
            return true;
        } catch (OrbitError exception) {
            return false;
        }
    }

    public static boolean isValid(Object id) {
        if (id instanceof Long) {
            return isValid(((Long) id).longValue());
        }
        return id instanceof String && isValid((String) id);
    }

    public static String toDecimalString(long id) {
        return Long.toUnsignedString(id);
    }

    public static long fromDecimalString(String input) {
        if (input == null) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "decimal input must be a string");
        }
        if (input.isEmpty()) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "empty decimal string");
        }
        if (!input.matches("[0-9]+")) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "non-canonical decimal string");
        }
        if (input.length() > 1 && input.charAt(0) == '0') {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "leading zeros are not canonical");
        }
        try {
            return Long.parseUnsignedLong(input);
        } catch (NumberFormatException exception) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "decimal value outside unsigned 64-bit range");
        }
    }

    public static long toUnixTimeMs(long timestamp) {
        return timestamp + ORBIT_EPOCH_UNIX_MS;
    }

    public static long fromUnixTimeMs(long unixMs) {
        return unixMs - ORBIT_EPOCH_UNIX_MS;
    }

    public static String toHexString(long id) {
        return String.format("0x%016x", id);
    }

    static void validateTimestamp(long timestamp) {
        if (timestamp < 0 || timestamp > MAX_TIMESTAMP) {
            throw new OrbitError(OrbitError.INVALID_TIMESTAMP, "timestamp out of range: " + timestamp);
        }
    }

    static void validateType(int type) {
        if (type < 0 || type > MAX_TYPE) {
            throw new OrbitError(OrbitError.INVALID_TYPE, "type out of range: " + type);
        }
    }

    static void validateNode(int node) {
        if (node < 0 || node > MAX_NODE) {
            throw new OrbitError(OrbitError.INVALID_NODE, "node out of range: " + node);
        }
    }

    static void validateSequence(int sequence) {
        if (sequence < 0 || sequence > MAX_SEQUENCE) {
            throw new OrbitError(OrbitError.INVALID_SEQUENCE, "sequence out of range: " + sequence);
        }
    }
}

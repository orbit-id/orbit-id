package com.github.orbitid.v2;

import com.github.orbitid.OrbitError;

import java.math.BigInteger;

/**
 * Codec and field accessors for Orbit ID v2 (Draft).
 *
 * <p>IDs are stored as unsigned 128-bit values in {@link BigInteger}.
 * Use {@link #toDecimalString(BigInteger)} for the canonical wire form.</p>
 */
public final class OrbitId {
    public static final long ORBIT_EPOCH_UNIX_MS = 1_767_225_600_000L;
    public static final int FORMAT_VERSION_BITS = 4;
    public static final int TIMESTAMP_BITS = 48;
    public static final int TYPE_BITS = 16;
    public static final int NODE_BITS = 16;
    public static final int SEQUENCE_BITS = 16;
    public static final int REGION_BITS = 4;
    public static final int TENANT_BITS = 16;
    public static final int RESERVED_BITS = 8;
    public static final int FORMAT_VERSION_SHIFT = 124;
    public static final int TIMESTAMP_SHIFT = 76;
    public static final int TYPE_SHIFT = 60;
    public static final int NODE_SHIFT = 44;
    public static final int SEQUENCE_SHIFT = 28;
    public static final int REGION_SHIFT = 24;
    public static final int TENANT_SHIFT = 8;
    public static final long MAX_TIMESTAMP = (1L << TIMESTAMP_BITS) - 1;
    public static final int MAX_TYPE = (1 << TYPE_BITS) - 1;
    public static final int MAX_NODE = (1 << NODE_BITS) - 1;
    public static final int MAX_SEQUENCE = (1 << SEQUENCE_BITS) - 1;
    public static final int MAX_REGION = (1 << REGION_BITS) - 1;
    public static final int MAX_TENANT = (1 << TENANT_BITS) - 1;
    public static final int MAX_RESERVED = (1 << RESERVED_BITS) - 1;
    public static final int ISSUED_FORMAT_VERSION = 1;
    public static final long DEFAULT_CLOCK_ROLLBACK_TOLERANCE_MS = 5_000L;
    public static final BigInteger U128_MAX =
            BigInteger.ONE.shiftLeft(128).subtract(BigInteger.ONE);

    private static final BigInteger FORMAT_VERSION_MASK =
            BigInteger.valueOf((1L << FORMAT_VERSION_BITS) - 1);
    private static final BigInteger TIMESTAMP_MASK = BigInteger.valueOf(MAX_TIMESTAMP);
    private static final BigInteger TYPE_MASK = BigInteger.valueOf(MAX_TYPE);
    private static final BigInteger NODE_MASK = BigInteger.valueOf(MAX_NODE);
    private static final BigInteger SEQUENCE_MASK = BigInteger.valueOf(MAX_SEQUENCE);
    private static final BigInteger REGION_MASK = BigInteger.valueOf(MAX_REGION);
    private static final BigInteger TENANT_MASK = BigInteger.valueOf(MAX_TENANT);
    private static final BigInteger RESERVED_MASK = BigInteger.valueOf(MAX_RESERVED);

    private OrbitId() {
    }

    public static BigInteger encode(OrbitFields fields) {
        return encode(
                fields.formatVersion(),
                fields.timestamp(),
                fields.type(),
                fields.node(),
                fields.sequence(),
                fields.region(),
                fields.tenant(),
                fields.reserved());
    }

    public static BigInteger encode(
            int formatVersion,
            long timestamp,
            int type,
            int node,
            int sequence,
            int region,
            int tenant,
            int reserved) {
        if (formatVersion != ISSUED_FORMAT_VERSION) {
            throw new OrbitError(
                    OrbitError.INVALID_FORMAT_VERSION,
                    "formatVersion must be " + ISSUED_FORMAT_VERSION + ": " + formatVersion);
        }
        validateTimestamp(timestamp);
        validateType(type);
        validateNode(node);
        validateSequence(sequence);
        validateRegion(region);
        validateTenant(tenant);
        if (reserved != 0) {
            throw new OrbitError(
                    OrbitError.INVALID_RESERVED, "reserved must be 0 on encode: " + reserved);
        }
        return BigInteger.valueOf(formatVersion).shiftLeft(FORMAT_VERSION_SHIFT)
                .or(BigInteger.valueOf(timestamp).shiftLeft(TIMESTAMP_SHIFT))
                .or(BigInteger.valueOf(type).shiftLeft(TYPE_SHIFT))
                .or(BigInteger.valueOf(node).shiftLeft(NODE_SHIFT))
                .or(BigInteger.valueOf(sequence).shiftLeft(SEQUENCE_SHIFT))
                .or(BigInteger.valueOf(region).shiftLeft(REGION_SHIFT))
                .or(BigInteger.valueOf(tenant).shiftLeft(TENANT_SHIFT));
    }

    public static OrbitFields decode(BigInteger id) {
        if (id == null) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "id out of unsigned 128-bit range: null");
        }
        if (id.signum() < 0 || id.compareTo(U128_MAX) > 0) {
            throw new OrbitError(
                    OrbitError.INVALID_DECIMAL, "id out of unsigned 128-bit range: " + id);
        }
        int formatVersion = id.shiftRight(FORMAT_VERSION_SHIFT).and(FORMAT_VERSION_MASK).intValue();
        if (formatVersion != ISSUED_FORMAT_VERSION) {
            throw new OrbitError(
                    OrbitError.INVALID_FORMAT_VERSION,
                    "unknown or reserved formatVersion: " + formatVersion);
        }
        int reserved = id.and(RESERVED_MASK).intValue();
        if (reserved != 0) {
            throw new OrbitError(
                    OrbitError.INVALID_RESERVED,
                    "non-zero reserved is rejected: " + reserved);
        }
        return new OrbitFields(
                formatVersion,
                id.shiftRight(TIMESTAMP_SHIFT).and(TIMESTAMP_MASK).longValueExact(),
                id.shiftRight(TYPE_SHIFT).and(TYPE_MASK).intValue(),
                id.shiftRight(NODE_SHIFT).and(NODE_MASK).intValue(),
                id.shiftRight(SEQUENCE_SHIFT).and(SEQUENCE_MASK).intValue(),
                id.shiftRight(REGION_SHIFT).and(REGION_MASK).intValue(),
                id.shiftRight(TENANT_SHIFT).and(TENANT_MASK).intValue(),
                reserved);
    }

    public static OrbitFields parse(BigInteger id) {
        return decode(id);
    }

    public static OrbitFields parse(String id) {
        return decode(fromDecimalString(id));
    }

    public static int getFormatVersion(BigInteger id) {
        return decode(id).formatVersion();
    }

    public static int getFormatVersion(String id) {
        return parse(id).formatVersion();
    }

    public static long getTimestamp(BigInteger id) {
        return decode(id).timestamp();
    }

    public static long getTimestamp(String id) {
        return parse(id).timestamp();
    }

    public static int getType(BigInteger id) {
        return decode(id).type();
    }

    public static int getType(String id) {
        return parse(id).type();
    }

    public static int getNode(BigInteger id) {
        return decode(id).node();
    }

    public static int getNode(String id) {
        return parse(id).node();
    }

    public static int getSequence(BigInteger id) {
        return decode(id).sequence();
    }

    public static int getSequence(String id) {
        return parse(id).sequence();
    }

    public static int getRegion(BigInteger id) {
        return decode(id).region();
    }

    public static int getRegion(String id) {
        return parse(id).region();
    }

    public static int getTenant(BigInteger id) {
        return decode(id).tenant();
    }

    public static int getTenant(String id) {
        return parse(id).tenant();
    }

    public static int getReserved(BigInteger id) {
        return decode(id).reserved();
    }

    public static int getReserved(String id) {
        return parse(id).reserved();
    }

    public static boolean isValid(BigInteger id) {
        try {
            decode(id);
            return true;
        } catch (OrbitError exception) {
            return false;
        }
    }

    public static boolean isValid(String id) {
        try {
            decode(fromDecimalString(id));
            return true;
        } catch (OrbitError exception) {
            return false;
        }
    }

    public static boolean isValid(Object id) {
        if (id instanceof BigInteger) {
            return isValid((BigInteger) id);
        }
        return id instanceof String && isValid((String) id);
    }

    public static String toDecimalString(BigInteger id) {
        if (id == null || id.signum() < 0 || id.compareTo(U128_MAX) > 0) {
            throw new OrbitError(
                    OrbitError.INVALID_DECIMAL, "id out of unsigned 128-bit range: " + id);
        }
        return id.toString(10);
    }

    public static BigInteger fromDecimalString(String input) {
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
        BigInteger value;
        try {
            value = new BigInteger(input);
        } catch (NumberFormatException exception) {
            throw new OrbitError(OrbitError.INVALID_DECIMAL, "invalid decimal string");
        }
        if (value.signum() < 0 || value.compareTo(U128_MAX) > 0) {
            throw new OrbitError(
                    OrbitError.INVALID_DECIMAL, "decimal value outside unsigned 128-bit range");
        }
        return value;
    }

    public static long toUnixTimeMs(long timestamp) {
        return timestamp + ORBIT_EPOCH_UNIX_MS;
    }

    public static long fromUnixTimeMs(long unixMs) {
        return unixMs - ORBIT_EPOCH_UNIX_MS;
    }

    public static String toHexString(BigInteger id) {
        if (id == null || id.signum() < 0 || id.compareTo(U128_MAX) > 0) {
            throw new OrbitError(
                    OrbitError.INVALID_DECIMAL, "id out of unsigned 128-bit range: " + id);
        }
        String hex = id.toString(16);
        if (hex.length() < 32) {
            hex = "0".repeat(32 - hex.length()) + hex;
        }
        return "0x" + hex;
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

    static void validateRegion(int region) {
        if (region < 0 || region > MAX_REGION) {
            throw new OrbitError(OrbitError.INVALID_REGION, "region out of range: " + region);
        }
    }

    static void validateTenant(int tenant) {
        if (tenant < 0 || tenant > MAX_TENANT) {
            throw new OrbitError(OrbitError.INVALID_TENANT, "tenant out of range: " + tenant);
        }
    }
}

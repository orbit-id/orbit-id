package com.github.orbitid.v2;

/** Decoded fields of an Orbit ID v2 value. */
public final class OrbitFields {
    private final int formatVersion;
    private final long timestamp;
    private final int type;
    private final int node;
    private final int sequence;
    private final int region;
    private final int tenant;
    private final int reserved;

    public OrbitFields(
            int formatVersion,
            long timestamp,
            int type,
            int node,
            int sequence,
            int region,
            int tenant,
            int reserved) {
        this.formatVersion = formatVersion;
        this.timestamp = timestamp;
        this.type = type;
        this.node = node;
        this.sequence = sequence;
        this.region = region;
        this.tenant = tenant;
        this.reserved = reserved;
    }

    public int formatVersion() {
        return formatVersion;
    }

    public long timestamp() {
        return timestamp;
    }

    public int type() {
        return type;
    }

    public int node() {
        return node;
    }

    public int sequence() {
        return sequence;
    }

    public int region() {
        return region;
    }

    public int tenant() {
        return tenant;
    }

    public int reserved() {
        return reserved;
    }

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (object == null || getClass() != object.getClass()) {
            return false;
        }
        OrbitFields that = (OrbitFields) object;
        return formatVersion == that.formatVersion
                && timestamp == that.timestamp
                && type == that.type
                && node == that.node
                && sequence == that.sequence
                && region == that.region
                && tenant == that.tenant
                && reserved == that.reserved;
    }

    @Override
    public int hashCode() {
        int result = Integer.hashCode(formatVersion);
        result = 31 * result + Long.hashCode(timestamp);
        result = 31 * result + Integer.hashCode(type);
        result = 31 * result + Integer.hashCode(node);
        result = 31 * result + Integer.hashCode(sequence);
        result = 31 * result + Integer.hashCode(region);
        result = 31 * result + Integer.hashCode(tenant);
        result = 31 * result + Integer.hashCode(reserved);
        return result;
    }

    @Override
    public String toString() {
        return "OrbitFields[formatVersion=" + formatVersion
                + ", timestamp=" + timestamp
                + ", type=" + type
                + ", node=" + node
                + ", sequence=" + sequence
                + ", region=" + region
                + ", tenant=" + tenant
                + ", reserved=" + reserved + "]";
    }
}

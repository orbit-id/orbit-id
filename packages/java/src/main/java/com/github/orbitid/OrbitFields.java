package com.github.orbitid;

/** Decoded fields of an Orbit ID v1 value. */
public final class OrbitFields {
    private final long timestamp;
    private final int type;
    private final int node;
    private final int sequence;

    public OrbitFields(long timestamp, int type, int node, int sequence) {
        this.timestamp = timestamp;
        this.type = type;
        this.node = node;
        this.sequence = sequence;
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

    @Override
    public boolean equals(Object object) {
        if (this == object) {
            return true;
        }
        if (object == null || getClass() != object.getClass()) {
            return false;
        }
        OrbitFields that = (OrbitFields) object;
        return timestamp == that.timestamp
                && type == that.type
                && node == that.node
                && sequence == that.sequence;
    }

    @Override
    public int hashCode() {
        int result = Long.hashCode(timestamp);
        result = 31 * result + Integer.hashCode(type);
        result = 31 * result + Integer.hashCode(node);
        result = 31 * result + Integer.hashCode(sequence);
        return result;
    }

    @Override
    public String toString() {
        return "OrbitFields[timestamp=" + timestamp + ", type=" + type
                + ", node=" + node + ", sequence=" + sequence + "]";
    }
}

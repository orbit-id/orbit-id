package com.github.ponstream24.orbitid;

/** The next action an {@link OrbitGenerator} would take. */
public interface GenerateDecision {
    final class Issue implements GenerateDecision {
        private final long timestamp;
        private final int sequence;

        public Issue(long timestamp, int sequence) {
            this.timestamp = timestamp;
            this.sequence = sequence;
        }

        public long timestamp() {
            return timestamp;
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
            Issue issue = (Issue) object;
            return timestamp == issue.timestamp && sequence == issue.sequence;
        }

        @Override
        public int hashCode() {
            return 31 * Long.hashCode(timestamp) + Integer.hashCode(sequence);
        }

        @Override
        public String toString() {
            return "Issue[timestamp=" + timestamp + ", sequence=" + sequence + "]";
        }
    }

    final class Wait implements GenerateDecision {
        private final long waitUntilTimestamp;

        public Wait(long waitUntilTimestamp) {
            this.waitUntilTimestamp = waitUntilTimestamp;
        }

        public long waitUntilTimestamp() {
            return waitUntilTimestamp;
        }

        @Override
        public boolean equals(Object object) {
            return this == object || (object != null && getClass() == object.getClass()
                    && waitUntilTimestamp == ((Wait) object).waitUntilTimestamp);
        }

        @Override
        public int hashCode() {
            return Long.hashCode(waitUntilTimestamp);
        }

        @Override
        public String toString() {
            return "Wait[waitUntilTimestamp=" + waitUntilTimestamp + "]";
        }
    }

    final class WaitNextMs implements GenerateDecision {
        private final long fromTimestamp;

        public WaitNextMs(long fromTimestamp) {
            this.fromTimestamp = fromTimestamp;
        }

        public long fromTimestamp() {
            return fromTimestamp;
        }

        @Override
        public boolean equals(Object object) {
            return this == object || (object != null && getClass() == object.getClass()
                    && fromTimestamp == ((WaitNextMs) object).fromTimestamp);
        }

        @Override
        public int hashCode() {
            return Long.hashCode(fromTimestamp);
        }

        @Override
        public String toString() {
            return "WaitNextMs[fromTimestamp=" + fromTimestamp + "]";
        }
    }

    final class Error implements GenerateDecision {
        private final String error;

        public Error(String error) {
            this.error = error;
        }

        public String error() {
            return error;
        }

        @Override
        public boolean equals(Object object) {
            if (this == object) {
                return true;
            }
            if (object == null || getClass() != object.getClass()) {
                return false;
            }
            Error that = (Error) object;
            return error == null ? that.error == null : error.equals(that.error);
        }

        @Override
        public int hashCode() {
            return error == null ? 0 : error.hashCode();
        }

        @Override
        public String toString() {
            return "Error[error=" + error + "]";
        }
    }
}

package com.github.orbitid;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.math.BigInteger;
import java.nio.file.Path;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConformanceV2Test {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Path FIXTURES = Path.of("..", "..", "spec", "conformance");

    @Test
    void encodeDecodeFixtures() throws IOException {
        for (JsonNode testCase : fixture("encode-decode.v2.json").withArray("cases")) {
            int formatVersion = testCase.get("formatVersion").asInt();
            long timestamp = Long.parseLong(testCase.get("timestamp").asText());
            int type = testCase.get("type").asInt();
            int node = testCase.get("node").asInt();
            int sequence = testCase.get("sequence").asInt();
            int region = testCase.get("region").asInt();
            int tenant = testCase.get("tenant").asInt();
            int reserved = testCase.get("reserved").asInt();
            OrbitFields fields = new OrbitFields(
                    formatVersion, timestamp, type, node, sequence, region, tenant, reserved);
            BigInteger id = OrbitId.encode(fields);

            assertEquals(testCase.get("idDecimal").asText(), OrbitId.toDecimalString(id));
            assertEquals(testCase.get("idHex").asText().toLowerCase(), OrbitId.toHexString(id));
            assertEquals(id, OrbitId.fromBase64UrlString(OrbitId.toBase64UrlString(id)));
            assertEquals(fields, OrbitId.decode(id));
            assertEquals(fields, OrbitId.parse(testCase.get("idDecimal").asText()));
            assertEquals(id, OrbitId.fromDecimalString(testCase.get("idDecimal").asText()));
            assertEquals(formatVersion, OrbitId.getFormatVersion(id));
            assertEquals(timestamp, OrbitId.getTimestamp(testCase.get("idDecimal").asText()));
            assertEquals(type, OrbitId.getType(id));
            assertEquals(node, OrbitId.getNode(testCase.get("idDecimal").asText()));
            assertEquals(sequence, OrbitId.getSequence(id));
            assertEquals(region, OrbitId.getRegion(id));
            assertEquals(tenant, OrbitId.getTenant(id));
            assertEquals(reserved, OrbitId.getReserved(id));
            assertTrue(OrbitId.isValid(id));
            assertTrue(OrbitId.isValid(testCase.get("idDecimal").asText()));
        }
    }

    @Test
    void rejectsNonCanonicalDecimals() throws IOException {
        for (JsonNode testCase : fixture("decode-reject.v2.json").withArray("cases")) {
            String expectedCode = testCase.has("code")
                    ? testCase.get("code").asText()
                    : OrbitError.INVALID_DECIMAL;
            if (OrbitError.INVALID_DECIMAL.equals(expectedCode)) {
                OrbitError error = assertThrows(OrbitError.class,
                        () -> OrbitId.fromDecimalString(testCase.get("input").asText()));
                assertEquals(OrbitError.INVALID_DECIMAL, error.getCode());
            } else {
                BigInteger value = OrbitId.fromDecimalString(testCase.get("input").asText());
                assertTrue(value.signum() >= 0);
                OrbitError error = assertThrows(OrbitError.class,
                        () -> OrbitId.parse(testCase.get("input").asText()));
                assertEquals(expectedCode, error.getCode());
            }
            assertThrows(OrbitError.class, () -> OrbitId.parse(testCase.get("input").asText()));
            assertFalse(OrbitId.isValid(testCase.get("input").asText()));
        }
        assertEquals(BigInteger.ZERO, OrbitId.fromDecimalString("0"));
        // "0" is a valid decimal but not a valid issued v2 ID (FormatVersion 0).
        assertFalse(OrbitId.isValid("0"));
    }

    @Test
    void generatorFixtures() throws IOException {
        for (JsonNode testCase : fixture("generator.v2.json").withArray("cases")) {
            long now = Long.parseLong(testCase.get("nowTimestamp").asText());
            OrbitGenerator generator = new OrbitGenerator(GeneratorOptions.builder(testCase.get("node").asInt())
                    .clock(() -> now)
                    .clockRollbackToleranceMs(5_000)
                    .onSequenceExhausted(SequenceExhaustedMode.FAIL)
                    .build());
            JsonNode prior = testCase.get("prior");
            generator.restoreState(
                    Long.parseLong(prior.get("lastTimestamp").asText()),
                    prior.get("sequence").asInt());
            GenerateDecision decision = generator.decide(testCase.get("type").asInt(), now);
            JsonNode expected = testCase.get("expect");

            switch (expected.get("action").asText()) {
                case "issue":
                    assertEquals(new GenerateDecision.Issue(
                            Long.parseLong(expected.get("timestamp").asText()),
                            expected.get("sequence").asInt()), decision);
                    break;
                case "wait":
                    assertEquals(new GenerateDecision.Wait(
                            Long.parseLong(expected.get("waitUntilTimestamp").asText())), decision);
                    break;
                case "error":
                    assertEquals(new GenerateDecision.Error(expected.get("error").asText()), decision);
                    break;
                case "wait_or_fail":
                    assertTrue(decision instanceof GenerateDecision.WaitNextMs
                            || decision.equals(new GenerateDecision.Error(expected.get("error").asText())));
                    break;
                default:
                    throw new AssertionError("unknown action");
            }
        }
    }

    @Test
    void coversGenerateGettersAndEncodeHelpers() {
        long[] ticks = {1000L, 1000L, 1001L, 1001L};
        int[] index = {0};
        OrbitGenerator generator = new OrbitGenerator(GeneratorOptions.builder(7)
                .clock(() -> ticks[Math.min(index[0]++, ticks.length - 1)])
                .onSequenceExhausted(SequenceExhaustedMode.WAIT)
                .build());
        assertEquals(7, generator.getNode());
        assertEquals(0, generator.getRegion());
        assertEquals(0, generator.getTenant());
        assertEquals(0L, generator.getLastTimestamp());
        assertEquals(0, generator.getSequence());

        BigInteger id = generator.generate(1);
        assertEquals(1, OrbitId.getFormatVersion(id));
        assertEquals(0, OrbitId.getRegion(id));
        assertEquals(0, OrbitId.getTenant(id));
        assertEquals(0, OrbitId.getReserved(id));
        assertTrue(generator.getLastTimestamp() > 0L);

        OrbitGenerator configured = new OrbitGenerator(GeneratorOptions.builder(1)
                .region(3)
                .tenant(1000)
                .clock(() -> 1L)
                .build());
        BigInteger configuredId = configured.generate(1);
        assertEquals(3, OrbitId.getRegion(configuredId));
        assertEquals(1000, OrbitId.getTenant(configuredId));
        assertThrows(OrbitError.class, () -> new OrbitGenerator(GeneratorOptions.builder(1).region(99).build()));
        assertThrows(OrbitError.class, () -> new OrbitGenerator(GeneratorOptions.builder(1).tenant(99_999).build()));

        int[] waitIndex = {0};
        long[] waitTicks = {1000L, 1000L, 1001L, 1001L};
        OrbitGenerator waiter = new OrbitGenerator(GeneratorOptions.builder(7)
                .clock(() -> waitTicks[Math.min(waitIndex[0]++, waitTicks.length - 1)])
                .onSequenceExhausted(SequenceExhaustedMode.WAIT)
                .build());
        waiter.restoreState(1000L, OrbitId.MAX_SEQUENCE);
        BigInteger waited = waiter.generate(1);
        assertEquals(1001L, waiter.getLastTimestamp());
        assertEquals(1, OrbitId.getFormatVersion(waited));

        OrbitFields sampleFields = new OrbitFields(1, 16_762_354_567L, 2, 7, 42, 0, 0, 0);
        BigInteger sample = OrbitId.encode(sampleFields);
        assertEquals(sampleFields, OrbitId.decode(sample));
        assertEquals(sampleFields, OrbitId.parse(sample));
        assertEquals(1, OrbitId.getFormatVersion(OrbitId.toDecimalString(sample)));
        assertEquals(0, OrbitId.getReserved(OrbitId.toDecimalString(sample)));
        assertTrue(OrbitId.isValid((Object) sample));
        assertFalse(OrbitId.isValid((Object) Boolean.TRUE));
        assertEquals(0L, OrbitId.fromUnixTimeMs(OrbitId.toUnixTimeMs(0L)));

        assertThrows(OrbitError.class, () -> OrbitId.encode(1, -1L, 1, 1, 0, 0, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 1L, 70_000, 1, 0, 0, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 1L, 1, 70_000, 0, 0, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 1L, 1, 1, 70_000, 0, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 1L, 1, 1, 0, 99, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 1L, 1, 1, 0, 0, 99_999, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(0, 0L, 1, 1, 0, 0, 0, 0));
        assertThrows(OrbitError.class, () -> OrbitId.encode(1, 0L, 1, 1, 0, 0, 0, 1));

        // FormatVersion 0 / non-zero reserved fail decode.
        BigInteger badVersion = BigInteger.ZERO;
        OrbitError badFv = assertThrows(OrbitError.class, () -> OrbitId.decode(badVersion));
        assertEquals(OrbitError.INVALID_FORMAT_VERSION, badFv.getCode());
        assertFalse(OrbitId.isValid(badVersion));

        BigInteger nonZeroReserved = OrbitId.encode(1, 0L, 1, 7, 0, 0, 0, 0).or(BigInteger.ONE);
        OrbitError badRes = assertThrows(OrbitError.class, () -> OrbitId.decode(nonZeroReserved));
        assertEquals(OrbitError.INVALID_RESERVED, badRes.getCode());

        OrbitError typeZero = assertThrows(OrbitError.class, () -> new OrbitGenerator(7).generate(0));
        assertEquals(OrbitError.INVALID_TYPE, typeZero.getCode());

        OrbitGenerator lost = new OrbitGenerator(GeneratorOptions.builder(1)
                .clock(() -> 5L)
                .confirmOwnership(() -> false)
                .build());
        assertThrows(OrbitError.class, () -> lost.generate(1));
    }

    private static JsonNode fixture(String fileName) throws IOException {
        return JSON.readTree(FIXTURES.resolve(fileName).toFile());
    }
}
